-- ============================================================
-- AION BILLING PART 3/6 — Sandbox Payment → AION Credits
--
-- CURRENT MODE: dummy gateway (no real provider yet).
-- The user picks customer type + amount, clicks Proceed, sees a bill
-- animation, and the backend credits the wallet. A real provider
-- (Stripe/Razorpay) plugs into lib/payments/gateway.ts later without
-- changing this table or the confirm flow.
--
-- PREREQUISITE: run Part 2 first:
--   supabase/migrations/20260919000000_aion_credits_wallet.sql
-- Then run this file. Idempotent: safe to re-run.
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Paste → Run).
-- ============================================================

-- ─── 1. Payments ────────────────────────────────────────────
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  customer_type       text not null check (customer_type in ('byok', 'managed')),
  amount_usd          numeric(12,2) not null check (amount_usd > 0),
  credits_amount      numeric(12,2) not null check (credits_amount > 0),
  provider            text not null default 'dummy'
                      check (provider in ('dummy', 'stripe', 'razorpay')),
  provider_payment_id text unique,
  status              text not null default 'pending'
                      check (status in (
                        'pending','processing','succeeded',
                        'failed','cancelled','refunded'
                      )),
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_provider_pid on public.payments(provider_payment_id);
create index if not exists idx_payments_created on public.payments(created_at desc);

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ─── 2. RLS — users READ own payments; NO direct writes ────
-- All writes happen server-side via service_role (create/confirm run in the
-- Next.js API, which is the trusted backend — same rule as Part 2 wallets).
alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Intentionally NO INSERT / UPDATE / DELETE policies for `authenticated`.

-- ─── 3. Atomic idempotent confirm (dummy gateway) ──────────
-- Called ONLY from the trusted backend (SECURITY DEFINER + service_role).
-- Row lock (FOR UPDATE) + status gate makes this safe under:
--   - double-clicks / retries
--   - duplicate webhook-style replays (real gateways, Part 3b)
--   - page refresh after payment (client re-reads status, never re-credits)
--
-- Result contract:
--   succeeded + already-credited payment → returns existing state, no new credits
--   pending/processing payment        → credits wallet once, marks succeeded
--   terminal failed/cancelled/refunded → raises, credits nothing
create or replace function public.confirm_payment(p_payment_id uuid)
returns jsonb as $$
declare
  v_pay     public.payments%rowtype;
  v_balance numeric(12,2);
begin
  -- Lock the payment row for the duration of the transaction.
  select * into v_pay from public.payments
  where id = p_payment_id for update;

  if not found then
    raise exception 'payment_not_found: %', p_payment_id using errcode = 'P0002';
  end if;

  -- Idempotency: already succeeded → return current state, credit nothing.
  if v_pay.status = 'succeeded' then
    select credit_balance into v_balance
    from public.wallets where user_id = v_pay.user_id;
    return jsonb_build_object(
      'payment_id', v_pay.id,
      'status', 'succeeded',
      'already_processed', true,
      'credits_amount', v_pay.credits_amount,
      'wallet_balance', coalesce(v_balance, 0)
    );
  end if;

  if v_pay.status not in ('pending', 'processing') then
    raise exception 'payment_not_confirmable: % is %', p_payment_id, v_pay.status
      using errcode = 'P0001';
  end if;

  update public.payments
    set status = 'processing'
    where id = p_payment_id and status = 'pending';

  -- 1 USD = 1 AION Credit. Ledger entry type = payment_credit.
  -- add_credits() locks the wallet row, inserts the ledger row, and returns
  -- the new balance — all inside this same transaction.
  v_balance := public.add_credits(
    v_pay.user_id,
    v_pay.credits_amount,
    'payment_credit',
    v_pay.id::text,
    'Add Credits: $' || v_pay.amount_usd::text
      || ' → ' || v_pay.credits_amount::text
      || ' AION Credits (' || v_pay.customer_type || ')'
  );

  update public.payments
    set status = 'succeeded',
        metadata = coalesce(metadata, '{}'::jsonb)
                   || jsonb_build_object('credited_at', now()::text)
    where id = p_payment_id;

  return jsonb_build_object(
    'payment_id', v_pay.id,
    'status', 'succeeded',
    'already_processed', false,
    'credits_amount', v_pay.credits_amount,
    'wallet_balance', v_balance
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Mark a payment failed/cancelled (terminal, credits nothing). Also locked.
create or replace function public.fail_payment(
  p_payment_id uuid,
  p_status text,
  p_reason text default null
)
returns void as $$
begin
  if p_status not in ('failed', 'cancelled') then
    raise exception 'fail_payment: invalid terminal status %', p_status
      using errcode = '22023';
  end if;
  update public.payments
    set status = p_status,
        metadata = coalesce(metadata, '{}'::jsonb)
                   || jsonb_build_object('failure_reason', coalesce(p_reason, 'unknown'))
    where id = p_payment_id and status in ('pending', 'processing');
end;
$$ language plpgsql security definer set search_path = public;

-- Lock down: only service_role / postgres execute. Frontend goes through API.
revoke all on function public.confirm_payment(uuid) from public, anon, authenticated;
revoke all on function public.fail_payment(uuid, text, text) from public, anon, authenticated;
grant execute on function public.confirm_payment(uuid) to service_role;
grant execute on function public.fail_payment(uuid, text, text) to service_role;
