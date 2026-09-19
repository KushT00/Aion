-- ============================================================
-- AION BILLING PART 2/6 — Credits Wallet + Transaction Ledger
-- 1 USD = 1 AION Credit
--
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Paste → Run).
-- Idempotent: safe to run multiple times.
-- ============================================================

-- ─── 0. Pre-reqs ────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── 1. Wallets (one per user) ──────────────────────────────
-- Canonical spec:
--   id, user_id UNIQUE, credit_balance, created_at, updated_at
create table if not exists public.wallets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  credit_balance  numeric(12,2) not null default 0 check (credit_balance >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id)
);

-- Back-compat: if a legacy migration created wallets(balance int, currency)
-- migrate it to the canonical shape instead of failing.
do $$
begin
  -- legacy `balance` (cents, int) → merge into credit_balance (dollars/credits)
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='wallets' and column_name='balance'
  ) then
    -- balance was INT cents; convert to credits (1 credit = $1 = 100 cents)
    update public.wallets
      set credit_balance = coalesce(credit_balance, 0) + coalesce(balance, 0)::numeric / 100.0
      where balance is not null and balance <> 0;
    alter table public.wallets drop column if exists balance;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='wallets' and column_name='currency'
  ) then
    alter table public.wallets drop column if exists currency;
  end if;
exception when others then
  raise notice 'wallet back-compat migration skipped: %', sqlerrm;
end $$;

alter table public.wallets
  alter column credit_balance set default 0,
  alter column credit_balance set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'wallets_credit_balance_nonneg'
  ) then
    alter table public.wallets
      add constraint wallets_credit_balance_nonneg check (credit_balance >= 0);
  end if;
exception when duplicate_object then null;
end $$;

create unique index if not exists uq_wallets_user_id on public.wallets(user_id);
create index if not exists idx_wallets_user on public.wallets(user_id);

-- updated_at auto-touch
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists wallets_updated_at on public.wallets;
create trigger wallets_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();

-- ─── 2. Credit ledger ───────────────────────────────────────
create table if not exists public.credit_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  amount           numeric(12,2) not null check (amount <> 0),
  transaction_type text not null check (transaction_type in (
    'payment_credit','automation_purchase','automation_usage',
    'managed_resource_charge','creator_earning','refund','adjustment'
  )),
  reference_id     text,
  description      text,
  balance_before   numeric(12,2) not null,
  balance_after    numeric(12,2) not null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_credit_tx_user on public.credit_transactions(user_id);
create index if not exists idx_credit_tx_created on public.credit_transactions(created_at desc);
create index if not exists idx_credit_tx_type on public.credit_transactions(transaction_type);
create index if not exists idx_credit_tx_reference on public.credit_transactions(reference_id);

-- ─── 3. RLS — users READ own wallet; NO direct writes ──────
alter table public.wallets enable row level security;
alter table public.credit_transactions enable row level security;

-- Drop legacy permissive policies if a previous attempt created them, then
-- create the exact locked-down set. (SELECT-only for authenticated users;
-- all financial writes go through SECURITY DEFINER RPCs via service_role.)
drop policy if exists "Users can view own wallet" on public.wallets;
drop policy if exists "Users can view own transactions" on public.credit_transactions;
drop policy if exists "Users can view own credit transactions" on public.credit_transactions;

create policy "Users can view own wallet"
  on public.wallets for select
  using (auth.uid() = user_id);

create policy "Users can view own credit transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- NOTE: intentionally NO INSERT / UPDATE / DELETE policies for `authenticated`.
-- PostgREST therefore rejects any direct client write with 42501, while
-- service_role (bypasses RLS) + SECURITY DEFINER functions can still write.

-- ─── 4. Auto-provision wallet for new + existing users ─────
create or replace function public.ensure_wallet_for_user(p_user_id uuid)
returns uuid as $$
declare v_wallet_id uuid;
begin
  insert into public.wallets (user_id, credit_balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing
  returning id into v_wallet_id;

  if v_wallet_id is null then
    select id into v_wallet_id from public.wallets where user_id = p_user_id;
  end if;
  return v_wallet_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger on profile creation (signup). handle_new_user() from schema.sql
-- only inserts the profile; this trigger provisions the wallet right after.
create or replace function public.handle_new_profile_wallet()
returns trigger as $$
begin
  insert into public.wallets (user_id, credit_balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_profile_created_ensure_wallet on public.profiles;
create trigger on_profile_created_ensure_wallet
  after insert on public.profiles
  for each row execute function public.handle_new_profile_wallet();

-- Backfill wallets for users created before this migration.
insert into public.wallets (user_id, credit_balance)
select p.id, 0 from public.profiles p
on conflict (user_id) do nothing;

-- ─── 5. Atomic credit operations (race-safe) ────────────────
-- Row-level lock (SELECT ... FOR UPDATE) serialises concurrent deductions
-- on the same wallet row inside a single transaction, so:
--   balance=100, A=70 and B=50 racing → one commits, the other fails
--   with insufficient_credits instead of driving balance negative.

create or replace function public.add_credits(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_type text default 'payment_credit',
  p_reference_id text default null,
  p_description text default null
)
returns numeric as $$
declare
  v_before numeric(12,2);
  v_after  numeric(12,2);
  v_amt    numeric(12,2) := round(p_amount::numeric, 2);
begin
  if v_amt is null or v_amt <= 0 then
    raise exception 'add_credits: amount must be positive (got %)', p_amount
      using errcode = '22003';
  end if;
  if p_transaction_type not in (
    'payment_credit','automation_purchase','automation_usage',
    'managed_resource_charge','creator_earning','refund','adjustment'
  ) then
    raise exception 'add_credits: invalid transaction_type %', p_transaction_type
      using errcode = '22023';
  end if;

  perform public.ensure_wallet_for_user(p_user_id);

  -- Lock this user's wallet row for the duration of the transaction.
  select credit_balance into v_before
  from public.wallets where user_id = p_user_id for update;

  v_after := round(v_before + v_amt, 2);

  update public.wallets
    set credit_balance = v_after
    where user_id = p_user_id;

  insert into public.credit_transactions
    (user_id, amount, transaction_type, reference_id, description, balance_before, balance_after)
  values
    (p_user_id, v_amt, p_transaction_type, p_reference_id, p_description, v_before, v_after);

  return v_after;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_type text default 'automation_purchase',
  p_reference_id text default null,
  p_description text default null
)
returns numeric as $$
declare
  v_before numeric(12,2);
  v_after  numeric(12,2);
  v_amt    numeric(12,2) := round(p_amount::numeric, 2);
begin
  if v_amt is null or v_amt <= 0 then
    raise exception 'deduct_credits: amount must be positive (got %)', p_amount
      using errcode = '22003';
  end if;
  if p_transaction_type not in (
    'payment_credit','automation_purchase','automation_usage',
    'managed_resource_charge','creator_earning','refund','adjustment'
  ) then
    raise exception 'deduct_credits: invalid transaction_type %', p_transaction_type
      using errcode = '22023';
  end if;

  perform public.ensure_wallet_for_user(p_user_id);

  -- Lock this user's wallet row: concurrent deducts queue here, so the
  -- balance check + update is atomic per wallet.
  select credit_balance into v_before
  from public.wallets where user_id = p_user_id for update;

  if v_before < v_amt then
    raise exception 'insufficient_credits: balance % < required %', v_before, v_amt
      using errcode = 'P0001';
  end if;

  v_after := round(v_before - v_amt, 2);

  update public.wallets
    set credit_balance = v_after
    where user_id = p_user_id;

  insert into public.credit_transactions
    (user_id, amount, transaction_type, reference_id, description, balance_before, balance_after)
  values
    (p_user_id, -v_amt, p_transaction_type, p_reference_id, p_description, v_before, v_after);

  return v_after;
end;
$$ language plpgsql security definer set search_path = public;

-- Read helper used by server API (bypasses RLS safely; auth enforced in API).
create or replace function public.get_wallet_balance(p_user_id uuid)
returns numeric as $$
declare v_bal numeric(12,2);
begin
  perform public.ensure_wallet_for_user(p_user_id);
  select credit_balance into v_bal from public.wallets where user_id = p_user_id;
  return coalesce(v_bal, 0);
end;
$$ language plpgsql security definer set search_path = public;

-- Tighten function ownership: only service_role / postgres can call directly.
-- Authenticated clients go through the Next.js API (service_role) — never RPC.
revoke all on function public.add_credits(uuid, numeric, text, text, text) from public, anon, authenticated;
revoke all on function public.deduct_credits(uuid, numeric, text, text, text) from public, anon, authenticated;
revoke all on function public.get_wallet_balance(uuid) from public, anon, authenticated;
revoke all on function public.ensure_wallet_for_user(uuid) from public, anon, authenticated;
grant execute on function public.add_credits(uuid, numeric, text, text, text) to service_role;
grant execute on function public.deduct_credits(uuid, numeric, text, text, text) to service_role;
grant execute on function public.get_wallet_balance(uuid) to service_role;
grant execute on function public.ensure_wallet_for_user(uuid) to service_role;
