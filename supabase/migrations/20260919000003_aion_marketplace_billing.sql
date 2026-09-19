-- ============================================================
-- AION BILLING PART 5/6 — Purchase + Entitlements + Creator Earnings
--
-- PREREQUISITES (run in order):
--   20260919000000_aion_credits_wallet.sql  (wallets, deduct/add_credits)
--   20260919000001_aion_payments.sql        (payments)
--   20260919000002_aion_billing_engine.sql  (pricing, quote_purchase)
-- Then run this file. Idempotent: safe to re-run.
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Paste → Run).
--
-- MONEY FLOW (single Postgres transaction in purchase_automation_txn):
--   buyer wallet --gross--> marketplace_transaction
--        gross = platform_fee (configurable %) + creator_amount
--   creator share → creator_earnings (pending → released to creator wallet)
-- Refunds NEVER delete history: +refund ledger rows reverse economics.
-- ============================================================

-- ─── 0. Back-compat: purchases.pricing_tier ────────────────
-- Added by migration_consumer_instances.sql in most envs; ensure it here
-- so the atomic purchase insert never fails on older databases.
alter table public.purchases
  add column if not exists pricing_tier text not null default 'byok'
  check (pricing_tier in ('byok', 'managed'));

-- ─── 1. Platform config (fee % configurable, no code changes) ──
create table if not exists public.platform_config (
  key         text primary key,
  value       numeric(12,4) not null,
  description text,
  updated_at  timestamptz not null default now()
);

insert into public.platform_config (key, value, description)
values ('platform_fee_percent', 20, 'AION platform share of each marketplace sale (remainder goes to creator).')
on conflict (key) do nothing;

-- ─── 2. Entitlements (time-boxed access from a purchase) ──────
-- expires_at is ALWAYS computed server-side (started_at + duration).
create table if not exists public.automation_entitlements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  automation_id uuid not null references public.marketplace_listings(id) on delete cascade,
  purchase_id   uuid not null unique references public.purchases(id) on delete cascade,
  customer_type text not null check (customer_type in ('byok', 'managed')),
  duration_days int not null check (duration_days > 0),
  started_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  status        text not null default 'active'
                check (status in ('active', 'expired', 'cancelled', 'suspended')),
  credits_paid  numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  check (expires_at > started_at)
);

-- One ACTIVE entitlement per (user, automation): duplicate purchases while
-- active collide here → second concurrent txn rolls back entirely.
create unique index if not exists uq_entitlement_active
  on public.automation_entitlements(user_id, automation_id)
  where status = 'active';
create index if not exists idx_entitlements_user on public.automation_entitlements(user_id);
create index if not exists idx_entitlements_expiry on public.automation_entitlements(expires_at)
  where status = 'active';

-- ─── 3. Marketplace transactions (gross split audit) ──────────
create table if not exists public.marketplace_transactions (
  id            uuid primary key default gen_random_uuid(),
  buyer_id      uuid not null references public.profiles(id) on delete cascade,
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  automation_id uuid not null references public.marketplace_listings(id) on delete cascade,
  purchase_id   uuid not null unique references public.purchases(id) on delete cascade,
  gross_amount  numeric(12,2) not null check (gross_amount >= 0),
  platform_fee  numeric(12,2) not null default 0 check (platform_fee >= 0),
  creator_amount numeric(12,2) not null default 0 check (creator_amount >= 0),
  status        text not null default 'completed'
                check (status in ('pending', 'completed', 'refunded', 'failed')),
  created_at    timestamptz not null default now(),
  check (platform_fee + creator_amount = gross_amount)
);

create index if not exists idx_mkt_tx_buyer on public.marketplace_transactions(buyer_id);
create index if not exists idx_mkt_tx_seller on public.marketplace_transactions(seller_id);

-- ─── 4. Creator earnings (traceable per-sale rows) ────────────
create table if not exists public.creator_earnings (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid not null unique references public.marketplace_transactions(id) on delete cascade,
  amount         numeric(12,2) not null check (amount >= 0),
  status         text not null default 'pending'
                 check (status in ('pending', 'available', 'reversed')),
  available_at   timestamptz not null default now(),
  released_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_creator_earnings_seller on public.creator_earnings(seller_id);
create index if not exists idx_creator_earnings_status on public.creator_earnings(status);

-- ─── 5. RLS (read-own / read-role, no client writes) ──────────
alter table public.platform_config enable row level security;
alter table public.automation_entitlements enable row level security;
alter table public.marketplace_transactions enable row level security;
alter table public.creator_earnings enable row level security;

drop policy if exists "Anyone can view platform config" on public.platform_config;
create policy "Anyone can view platform config"
  on public.platform_config for select using (true);

drop policy if exists "Users can view own entitlements" on public.automation_entitlements;
create policy "Users can view own entitlements"
  on public.automation_entitlements for select using (auth.uid() = user_id);

drop policy if exists "Buyers can view own market transactions" on public.marketplace_transactions;
create policy "Buyers can view own market transactions"
  on public.marketplace_transactions for select using (auth.uid() = buyer_id);

drop policy if exists "Sellers can view own market transactions" on public.marketplace_transactions;
create policy "Sellers can view own market transactions"
  on public.marketplace_transactions for select using (auth.uid() = seller_id);

drop policy if exists "Sellers can view own earnings" on public.creator_earnings;
create policy "Sellers can view own earnings"
  on public.creator_earnings for select using (auth.uid() = seller_id);

-- ─── 6. Atomic marketplace purchase ───────────────────────────
-- BEGIN (single transaction) → verify → price → deduct → purchase →
-- entitlement → split → earning → COMMIT. Any failure ROLLBACKs all,
-- including the wallet deduct (same-transaction guarantee).
create or replace function public.purchase_automation_txn(
  p_user_id uuid,
  p_listing_id uuid,
  p_customer_type text,
  p_duration_days int,
  p_max_price numeric
)
returns jsonb as $$
declare
  v_listing   record;
  v_q         jsonb;
  v_fee_pct   numeric(12,4);
  v_gross     numeric(12,2);
  v_fee       numeric(12,2);
  v_creator   numeric(12,2);
  v_balance   numeric(12,2);
  v_purchase  uuid;
  v_ent       uuid;
  v_mkt       uuid;
begin
  if p_customer_type not in ('byok', 'managed') then
    raise exception 'invalid_customer_type: %', p_customer_type using errcode = '22023';
  end if;

  -- Verify automation (locked: price/owner can't change mid-purchase).
  select id, seller_id, is_active into v_listing
  from public.marketplace_listings where id = p_listing_id for update;
  if not found or not v_listing.is_active then
    raise exception 'automation_not_available' using errcode = 'P0002';
  end if;
  if v_listing.seller_id = p_user_id then
    raise exception 'self_purchase' using errcode = 'P0001';
  end if;

  -- Duplicate guard: active entitlement already exists.
  if exists (
    select 1 from public.automation_entitlements
    where user_id = p_user_id and automation_id = p_listing_id and status = 'active'
  ) then
    raise exception 'duplicate_purchase: active entitlement exists' using errcode = 'P0001';
  end if;

  -- Backend price (never from the browser).
  v_q := public.quote_purchase(p_listing_id, p_customer_type, p_duration_days);
  v_gross := (v_q ->> 'customer_price')::numeric;
  if v_gross > round(p_max_price::numeric, 2) then
    raise exception 'price_changed: server % > quoted %', v_gross, p_max_price using errcode = 'P0001';
  end if;

  -- Fee split from DB config (e.g. 20% → creator 80%).
  select value into v_fee_pct from public.platform_config where key = 'platform_fee_percent';
  v_fee_pct := coalesce(v_fee_pct, 20);
  v_fee := round(v_gross * v_fee_pct / 100.0, 2);
  v_creator := round(v_gross - v_fee, 2);

  -- Purchase row first (price_paid in cents; 1 credit = $1), so the
  -- ledger deduction below can reference it. Rolls back with everything
  -- else if any later step fails.
  insert into public.purchases (listing_id, buyer_id, price_paid, currency, pricing_tier)
  values (p_listing_id, p_user_id, round(v_gross * 100)::int, 'USD', p_customer_type)
  returning id into v_purchase;

  -- Check + deduct credits (raises insufficient_credits; rolls back on fail).
  -- Ledger: type automation_purchase, reference = purchase_id (spec §6).
  if v_gross > 0 then
    v_balance := public.deduct_credits(
      p_user_id, v_gross, 'automation_purchase', v_purchase::text,
      'Automation purchase (' || p_customer_type || ', ' || p_duration_days || 'd)'
    );
  else
    select credit_balance into v_balance from public.wallets where user_id = p_user_id;
    v_balance := coalesce(v_balance, 0);
  end if;

  -- Entitlement: expiry computed HERE (client dates never trusted).
  insert into public.automation_entitlements
    (user_id, automation_id, purchase_id, customer_type, duration_days,
     started_at, expires_at, status, credits_paid)
  values
    (p_user_id, p_listing_id, v_purchase, p_customer_type, p_duration_days,
     now(), now() + (p_duration_days || ' days')::interval, 'active', v_gross)
  returning id into v_ent;

  -- Marketplace split + traceable creator earning (pending → released later).
  insert into public.marketplace_transactions
    (buyer_id, seller_id, automation_id, purchase_id,
     gross_amount, platform_fee, creator_amount, status)
  values
    (p_user_id, v_listing.seller_id, p_listing_id, v_purchase,
     v_gross, v_fee, v_creator, 'completed')
  returning id into v_mkt;

  if v_creator > 0 then
    insert into public.creator_earnings (seller_id, transaction_id, amount, status)
    values (v_listing.seller_id, v_mkt, v_creator, 'pending');
  end if;

  return jsonb_build_object(
    'purchase_id', v_purchase,
    'entitlement_id', v_ent,
    'transaction_id', v_mkt,
    'charged', v_gross,
    'balance', v_balance,
    'expires_at', (select expires_at from public.automation_entitlements where id = v_ent),
    'platform_fee', v_fee,
    'creator_amount', v_creator,
    'customer_type', p_customer_type,
    'duration_days', p_duration_days
  );
exception
  -- Unique-violation on the active-entitlement index = lost a purchase race.
  when unique_violation then
    raise exception 'duplicate_purchase: concurrent request already completed' using errcode = 'P0001';
end;
$$ language plpgsql security definer set search_path = public;

-- ─── 7. Release creator earning → creator wallet ──────────────
create or replace function public.release_creator_earning(p_earning_id uuid)
returns jsonb as $$
declare
  v_e   public.creator_earnings%rowtype;
  v_bal numeric(12,2);
begin
  select * into v_e from public.creator_earnings where id = p_earning_id for update;
  if not found then
    raise exception 'earning_not_found' using errcode = 'P0002';
  end if;
  if v_e.status = 'available' then
    select credit_balance into v_bal from public.wallets where user_id = v_e.seller_id;
    return jsonb_build_object('earning_id', v_e.id, 'status', 'available',
      'already_processed', true, 'balance', coalesce(v_bal, 0));
  end if;
  if v_e.status <> 'pending' then
    raise exception 'earning_not_releasable: %', v_e.status using errcode = 'P0001';
  end if;

  v_bal := public.add_credits(
    v_e.seller_id, v_e.amount, 'creator_earning', v_e.transaction_id::text,
    'Creator earning from marketplace sale'
  );
  update public.creator_earnings
    set status = 'available', released_at = now() where id = v_e.id;

  return jsonb_build_object('earning_id', v_e.id, 'status', 'available',
    'already_processed', false, 'amount', v_e.amount, 'balance', v_bal);
end;
$$ language plpgsql security definer set search_path = public;

-- ─── 8. Refund (adjustment rows; history is never deleted) ────
-- Buyer gets +gross (type refund). Released creator share is clawed back
-- from the seller wallet (type refund, negative); pending (unreleased)
-- earnings are simply reversed. Insufficient seller balance aborts all.
create or replace function public.refund_purchase(p_purchase_id uuid)
returns jsonb as $$
declare
  v_pur  public.purchases%rowtype;
  v_mkt  public.marketplace_transactions%rowtype;
  v_earn public.creator_earnings%rowtype;
  v_bal  numeric(12,2);
begin
  select * into v_pur from public.purchases where id = p_purchase_id for update;
  if not found then
    raise exception 'purchase_not_found' using errcode = 'P0002';
  end if;

  select * into v_mkt from public.marketplace_transactions
  where purchase_id = p_purchase_id for update;
  if not found or v_mkt.status <> 'completed' then
    raise exception 'purchase_not_refundable' using errcode = 'P0001';
  end if;

  select * into v_earn from public.creator_earnings
  where transaction_id = v_mkt.id for update;

  -- Buyer refund (+gross, type refund → history shows -X purchase, +X refund).
  v_bal := public.add_credits(
    v_mkt.buyer_id, v_mkt.gross_amount, 'refund', v_pur.id::text,
    'Refund for automation purchase'
  );

  -- Creator side.
  if found then
    if v_earn.status = 'available' then
      perform public.deduct_credits(
        v_mkt.seller_id, v_earn.amount, 'refund', v_pur.id::text,
        'Clawback for refunded sale'
      );
    end if;
    update public.creator_earnings set status = 'reversed' where id = v_earn.id;
  end if;

  update public.marketplace_transactions set status = 'refunded' where id = v_mkt.id;
  update public.automation_entitlements set status = 'cancelled'
  where purchase_id = p_purchase_id and status in ('active', 'suspended');

  return jsonb_build_object('purchase_id', v_pur.id, 'status', 'refunded',
    'refunded_amount', v_mkt.gross_amount, 'buyer_balance', v_bal);
end;
$$ language plpgsql security definer set search_path = public;

-- ─── 9. Expiry sweep (cron calls this) ────────────────────────
create or replace function public.expire_entitlements()
returns int as $$
declare v_n int;
begin
  update public.automation_entitlements
    set status = 'expired'
    where status = 'active' and expires_at < now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$ language plpgsql security definer set search_path = public;

-- Lock down: trusted backend only.
revoke all on function public.purchase_automation_txn(uuid, uuid, text, int, numeric) from public, anon, authenticated;
revoke all on function public.release_creator_earning(uuid) from public, anon, authenticated;
revoke all on function public.refund_purchase(uuid) from public, anon, authenticated;
revoke all on function public.expire_entitlements() from public, anon, authenticated;
grant execute on function public.purchase_automation_txn(uuid, uuid, text, int, numeric) to service_role;
grant execute on function public.release_creator_earning(uuid) to service_role;
grant execute on function public.refund_purchase(uuid) to service_role;
grant execute on function public.expire_entitlements() to service_role;
