-- ============================================================
-- AION BILLING PART 4/6 — BYOK + Managed Resource Billing Engine
--
-- PREREQUISITES (run in order):
--   20260919000000_aion_credits_wallet.sql  (wallets, deduct_credits)
--   20260919000001_aion_payments.sql        (payments)
-- Then run this file. Idempotent: safe to re-run.
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Paste → Run).
--
-- MODEL
--   BYOK    → automation charge only (internal_cost = 0, margin = 0).
--             NEVER a managed_resource_charge (enforced in RPCs + service).
--   Managed → internal resource cost + configured margin = customer price.
-- All prices live here. The frontend NEVER calculates prices.
-- ============================================================

-- ─── 1. Automation pricing (one row per listing) ────────────
create table if not exists public.automation_pricing (
  id                    uuid primary key default gen_random_uuid(),
  listing_id            uuid not null unique references public.marketplace_listings(id) on delete cascade,
  billing_model         text not null default 'duration'
                        check (billing_model in ('flat', 'duration', 'usage')),
  -- Customer-facing BYOK price per duration, in CREDITS. {"1":2,"7":8,"30":25,"90":60,"default":25}
  byok_prices           jsonb not null default '{"1": 2, "7": 8, "30": 25, "90": 60, "default": 25}',
  -- AION internal base cost per duration, in USD. Margin is added on top.
  managed_base_internal jsonb not null default '{"1": 1, "7": 4, "30": 12, "90": 30, "default": 12}',
  -- Per-unit internal resource rates, in USD.
  resource_rates        jsonb not null default '{
    "execution": 0.01,
    "runtime_second": 0.0001,
    "input_token_1k": 0.002,
    "output_token_1k": 0.006,
    "api_request": 0.002,
    "storage_gb_mo": 0.10,
    "compute_second": 0.0002
  }',
  margin_type           text not null default 'percent' check (margin_type in ('percent', 'fixed')),
  margin_value          numeric(12,2) not null default 20 check (margin_value >= 0),
  supported_durations   int[] not null default '{1,7,30,90}',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_automation_pricing_listing on public.automation_pricing(listing_id);

drop trigger if exists automation_pricing_updated_at on public.automation_pricing;
create trigger automation_pricing_updated_at before update on public.automation_pricing
  for each row execute function public.set_updated_at();

-- Seed a pricing row for every listing (incl. future ones).
-- If the listing has a price (>0 cents), the 30-day/default BYOK price
-- becomes price/100 credits ($1 = 1 credit); otherwise DB defaults stand.
create or replace function public.seed_automation_pricing()
returns trigger as $$
declare v_byok numeric(12,2);
begin
  v_byok := round(coalesce(new.price, 0)::numeric / 100.0, 2);
  insert into public.automation_pricing (listing_id, byok_prices)
  values (
    new.id,
    case when v_byok > 0
      then jsonb_build_object('1', 2, '7', 8, '30', v_byok, '90', v_byok * 2.4, 'default', v_byok)
      else '{"1": 2, "7": 8, "30": 25, "90": 60, "default": 25}'::jsonb
    end
  )
  on conflict (listing_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_listing_created_seed_pricing on public.marketplace_listings;
create trigger on_listing_created_seed_pricing
  after insert on public.marketplace_listings
  for each row execute function public.seed_automation_pricing();

insert into public.automation_pricing (listing_id)
select ml.id from public.marketplace_listings ml
on conflict (listing_id) do nothing;

-- ─── 2. Resource usage log ──────────────────────────────────
-- One row per measured consumption. cost_usd is snapshotted at record time
-- from the listing's resource_rates (BYOK rows snapshot 0 — AION spends
-- nothing when the customer brings their own keys).
create table if not exists public.resource_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  instance_id   uuid references public.consumer_instances(id) on delete cascade,
  listing_id    uuid references public.marketplace_listings(id) on delete set null,
  metric        text not null check (metric in (
                  'execution', 'runtime_second', 'input_token_1k',
                  'output_token_1k', 'api_request', 'storage_gb_mo',
                  'compute_second'
                )),
  quantity      numeric(14,4) not null check (quantity > 0),
  unit_cost_usd numeric(12,6) not null default 0,
  cost_usd      numeric(12,4) not null default 0,
  cycle_id      uuid,
  metadata      jsonb not null default '{}',
  recorded_at   timestamptz not null default now()
);

create index if not exists idx_resource_usage_user on public.resource_usage(user_id);
create index if not exists idx_resource_usage_instance on public.resource_usage(instance_id);
create index if not exists idx_resource_usage_cycle on public.resource_usage(cycle_id);
create index if not exists idx_resource_usage_recorded on public.resource_usage(recorded_at desc);

-- ─── 3. Managed billing cycles ──────────────────────────────
create table if not exists public.managed_billing_cycles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  instance_id     uuid references public.consumer_instances(id) on delete set null,
  period_start    timestamptz not null,
  period_end      timestamptz not null,
  usage           jsonb not null default '{}',
  internal_cost   numeric(12,2) not null default 0,
  margin          numeric(12,2) not null default 0,
  customer_charge numeric(12,2) not null default 0,
  credits_charged numeric(12,2) not null default 0,
  status          text not null default 'pending'
                  check (status in ('pending', 'processing', 'succeeded', 'failed')),
  created_at      timestamptz not null default now(),
  check (period_end > period_start)
);

create index if not exists idx_billing_cycles_user on public.managed_billing_cycles(user_id);
create index if not exists idx_billing_cycles_instance on public.managed_billing_cycles(instance_id);
create index if not exists idx_billing_cycles_status on public.managed_billing_cycles(status);

-- ─── 4. RLS ─────────────────────────────────────────────────
alter table public.automation_pricing enable row level security;
alter table public.resource_usage enable row level security;
alter table public.managed_billing_cycles enable row level security;

-- Catalog prices are public (needed for marketplace display).
drop policy if exists "Anyone can view active pricing" on public.automation_pricing;
create policy "Anyone can view active pricing"
  on public.automation_pricing for select using (is_active = true);

drop policy if exists "Users can view own usage" on public.resource_usage;
create policy "Users can view own usage"
  on public.resource_usage for select using (auth.uid() = user_id);

drop policy if exists "Users can view own billing cycles" on public.managed_billing_cycles;
create policy "Users can view own billing cycles"
  on public.managed_billing_cycles for select using (auth.uid() = user_id);

-- NO write policies: pricing edits go through the seller-checked API,
-- usage/cycle writes through service_role. Client prices are never trusted.

-- ─── 5. Helpers (server-side recompute; single source of truth) ──
-- Resolve a per-duration value from a JSONB map, falling back to "default".
create or replace function public.pricing_for_duration(prices jsonb, p_days int)
returns numeric as $$
declare v numeric;
begin
  v := coalesce(
    nullif(prices ->> p_days::text, '')::numeric,
    nullif(prices ->> 'default', '')::numeric,
    0
  );
  return round(v, 2);
exception when others then
  return 0;
end;
$$ language plpgsql immutable;

create or replace function public.calc_margin(
  p_internal numeric, p_type text, p_value numeric
)
returns numeric as $$
begin
  if p_type = 'fixed' then
    return round(greatest(p_value, 0), 2);
  end if;
  return round(p_internal * greatest(p_value, 0) / 100.0, 2);
end;
$$ language plpgsql immutable;

-- Server-side purchase quote. Returns {internal, margin, customer}.
-- BYOK: internal = 0, margin = 0 (customer's own keys cost AION nothing).
create or replace function public.quote_purchase(
  p_listing_id uuid, p_customer_type text, p_duration_days int
)
returns jsonb as $$
declare
  v_pr      public.automation_pricing%rowtype;
  v_int     numeric(12,2) := 0;
  v_margin  numeric(12,2) := 0;
  v_cust    numeric(12,2) := 0;
begin
  if p_customer_type not in ('byok', 'managed') then
    raise exception 'invalid_customer_type: %', p_customer_type using errcode = '22023';
  end if;

  select * into v_pr from public.automation_pricing
  where listing_id = p_listing_id and is_active = true;
  if not found then
    raise exception 'pricing_not_found: %', p_listing_id using errcode = 'P0002';
  end if;
  if not (p_duration_days = any (v_pr.supported_durations)) then
    raise exception 'unsupported_duration: %', p_duration_days using errcode = '22023';
  end if;

  if p_customer_type = 'byok' then
    v_cust := public.pricing_for_duration(v_pr.byok_prices, p_duration_days);
  else
    v_int := public.pricing_for_duration(v_pr.managed_base_internal, p_duration_days);
    v_margin := public.calc_margin(v_int, v_pr.margin_type, v_pr.margin_value);
    v_cust := round(v_int + v_margin, 2);
  end if;

  return jsonb_build_object(
    'internal_cost', v_int,
    'margin', v_margin,
    'customer_price', v_cust
  );
end;
$$ language plpgsql stable set search_path = public;

-- Atomic credit purchase at SERVER prices.
-- p_max_price: the client's quoted expectation — if the server price is
-- higher (stale quote), abort instead of overcharging. The client can never
-- underpay: the deducted amount always comes from this recompute.
create or replace function public.purchase_with_credits(
  p_user_id uuid,
  p_listing_id uuid,
  p_customer_type text,
  p_duration_days int,
  p_max_price numeric
)
returns jsonb as $$
declare
  v_q       jsonb;
  v_cust    numeric(12,2);
  v_balance numeric(12,2);
begin
  v_q := public.quote_purchase(p_listing_id, p_customer_type, p_duration_days);
  v_cust := (v_q ->> 'customer_price')::numeric;

  if v_cust > round(p_max_price::numeric, 2) then
    raise exception 'price_changed: server % > quoted %', v_cust, p_max_price
      using errcode = 'P0001';
  end if;

  if v_cust <= 0 then
    select credit_balance into v_balance from public.wallets where user_id = p_user_id;
    return jsonb_build_object(
      'charged', 0, 'balance', coalesce(v_balance, 0),
      'customer_type', p_customer_type, 'duration_days', p_duration_days
    );
  end if;

  -- Upfront automation charge (BOTH tiers). Monthly resource consumption is
  -- billed separately as managed_resource_charge — never for BYOK.
  v_balance := public.deduct_credits(
    p_user_id,
    v_cust,
    'automation_purchase',
    p_listing_id::text,
    'Automation purchase (' || p_customer_type || ', ' || p_duration_days || 'd)'
  );

  return jsonb_build_object(
    'charged', v_cust, 'balance', v_balance,
    'customer_type', p_customer_type, 'duration_days', p_duration_days
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Monthly managed billing for one instance + period.
-- REFUSES non-managed instances (BYOK never gets resource charges).
-- Insufficient credits → cycle marked failed, balance untouched.
create or replace function public.run_managed_cycle(
  p_user_id uuid,
  p_instance_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns jsonb as $$
declare
  v_inst    record;
  v_pr      public.automation_pricing%rowtype;
  v_usage   jsonb;
  v_int     numeric(12,2);
  v_margin  numeric(12,2);
  v_cust    numeric(12,2);
  v_cycle   uuid;
  v_balance numeric(12,2);
begin
  select ci.id, ci.buyer_id, ci.listing_id, ci.pricing_tier
    into v_inst from public.consumer_instances ci
    where ci.id = p_instance_id for update;

  if not found then
    raise exception 'instance_not_found: %', p_instance_id using errcode = 'P0002';
  end if;
  if v_inst.buyer_id <> p_user_id then
    raise exception 'instance_forbidden' using errcode = '42501';
  end if;
  if v_inst.pricing_tier <> 'managed' then
    raise exception 'not_managed: BYOK instances never receive resource charges'
      using errcode = 'P0001';
  end if;

  select * into v_pr from public.automation_pricing
  where listing_id = v_inst.listing_id;

  -- Aggregate UNBILLED usage in the window (costs snapshotted at record time).
  select coalesce(jsonb_object_agg(metric, total), '{}'::jsonb),
         coalesce(sum(total), 0)
    into v_usage, v_int
  from (
    select metric, sum(cost_usd) as total
    from public.resource_usage
    where instance_id = p_instance_id
      and cycle_id is null
      and recorded_at >= p_period_start
      and recorded_at < p_period_end
    group by metric
  ) s;

  v_int := round(v_int, 2);
  v_margin := public.calc_margin(v_int, v_pr.margin_type, v_pr.margin_value);
  v_cust := round(v_int + v_margin, 2);

  insert into public.managed_billing_cycles
    (user_id, instance_id, period_start, period_end, usage,
     internal_cost, margin, customer_charge, status)
  values
    (p_user_id, p_instance_id, p_period_start, p_period_end, v_usage,
     v_int, v_margin, v_cust, 'processing')
  returning id into v_cycle;

  if v_cust <= 0 then
    update public.managed_billing_cycles
      set status = 'succeeded', credits_charged = 0 where id = v_cycle;
    update public.resource_usage set cycle_id = v_cycle
      where instance_id = p_instance_id and cycle_id is null
        and recorded_at >= p_period_start and recorded_at < p_period_end;
    select credit_balance into v_balance from public.wallets where user_id = p_user_id;
    return jsonb_build_object('cycle_id', v_cycle, 'status', 'succeeded',
      'customer_charge', 0, 'balance', coalesce(v_balance, 0));
  end if;

  begin
    v_balance := public.deduct_credits(
      p_user_id, v_cust, 'managed_resource_charge', v_cycle::text,
      'Managed resources ' || to_char(p_period_start, 'YYYY-MM-DD')
        || ' → ' || to_char(p_period_end, 'YYYY-MM-DD')
    );
  exception when others then
    -- Insufficient (or any deduct failure): mark failed, NEVER go negative.
    update public.managed_billing_cycles
      set status = 'failed' where id = v_cycle;
    return jsonb_build_object('cycle_id', v_cycle, 'status', 'failed',
      'reason', 'insufficient_credits',
      'customer_charge', v_cust,
      'message', 'Insufficient AION Credits. Add Credits to continue.');
  end;

  update public.managed_billing_cycles
    set status = 'succeeded', credits_charged = v_cust where id = v_cycle;
  update public.resource_usage set cycle_id = v_cycle
    where instance_id = p_instance_id and cycle_id is null
      and recorded_at >= p_period_start and recorded_at < p_period_end;

  return jsonb_build_object('cycle_id', v_cycle, 'status', 'succeeded',
    'customer_charge', v_cust, 'balance', v_balance);
end;
$$ language plpgsql security definer set search_path = public;

-- Lock down: trusted backend (service_role) only.
revoke all on function public.quote_purchase(uuid, text, int) from public, anon, authenticated;
revoke all on function public.purchase_with_credits(uuid, uuid, text, int, numeric) from public, anon, authenticated;
revoke all on function public.run_managed_cycle(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.quote_purchase(uuid, text, int) to service_role;
grant execute on function public.purchase_with_credits(uuid, uuid, text, int, numeric) to service_role;
grant execute on function public.run_managed_cycle(uuid, uuid, timestamptz, timestamptz) to service_role;
