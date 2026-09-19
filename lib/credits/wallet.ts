// ============================================================
// AION Billing Part 2 — Trusted server-side wallet operations.
// ALL financial writes go through here (service_role + atomic RPCs).
// Never expose add/deduct to the client; the API route below is read-only.
// 1 USD = 1 AION Credit.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import type { CreditTransaction, CreditTransactionType, Wallet } from '@/types';

const VALID_TYPES: CreditTransactionType[] = [
  'payment_credit',
  'automation_purchase',
  'automation_usage',
  'managed_resource_charge',
  'creator_earning',
  'refund',
  'adjustment',
];

function assertAmount(amount: number, fn: string) {
  const v = Number(amount);
  if (!Number.isFinite(v) || Math.round(v * 100) / 100 <= 0) {
    throw new Error(`${fn}: amount must be a positive number (got ${amount})`);
  }
}

function assertType(t: string, fn: string): asserts t is CreditTransactionType {
  if (!VALID_TYPES.includes(t as CreditTransactionType)) {
    throw new Error(`${fn}: invalid transaction_type ${t}`);
  }
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  const admin = createAdminClient();
  // Ensure row exists (idempotent), then read.
  await admin.rpc('ensure_wallet_for_user', { p_user_id: userId });
  const { data, error } = await admin
    .from('wallets')
    .select('id, user_id, credit_balance, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Wallet | null) ?? null;
}

export async function getBalance(userId: string): Promise<number> {
  const w = await getWallet(userId);
  return Number(w?.credit_balance ?? 0);
}

export async function getRecentTransactions(
  userId: string,
  limit = 20,
): Promise<CreditTransaction[]> {
  const admin = createAdminClient();
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const { data, error } = await admin
    .from('credit_transactions')
    .select('id, user_id, amount, transaction_type, reference_id, description, balance_before, balance_after, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return (data ?? []) as CreditTransaction[];
}

export interface WalletSummary {
  balance: number;
  /** Credits spent since the 1st of the current month (UTC). */
  used_this_month: number;
  /** Absolute spent totals by bucket (server-computed from the ledger). */
  breakdown: {
    automation_purchases: number;
    managed_resources: number;
    usage_charges: number;
    other_spent: number;
  };
}

/** Server-computed dashboard stats. Grouping is display-only; the ledger is truth. */
export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const admin = createAdminClient();
  await admin.rpc('ensure_wallet_for_user', { p_user_id: userId });
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data: wallet } = await admin
    .from('wallets')
    .select('credit_balance')
    .eq('user_id', userId)
    .maybeSingle();
  const { data: rows, error } = await admin
    .from('credit_transactions')
    .select('amount, transaction_type, created_at')
    .eq('user_id', userId)
    .gte('created_at', monthStart)
    .lt('amount', 0)
    .limit(1000);
  if (error) throw error;
  let automation = 0, managed = 0, usage = 0, other = 0;
  for (const r of (rows ?? []) as Array<{ amount: number; transaction_type: string }>) {
    const v = Math.abs(Number(r.amount));
    if (r.transaction_type === 'automation_purchase') automation += v;
    else if (r.transaction_type === 'managed_resource_charge') managed += v;
    else if (r.transaction_type === 'automation_usage') usage += v;
    else other += v;
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    balance: Number(wallet?.credit_balance ?? 0),
    used_this_month: round2(automation + managed + usage + other),
    breakdown: {
      automation_purchases: round2(automation),
      managed_resources: round2(managed),
      usage_charges: round2(usage),
      other_spent: round2(other),
    },
  };
}

/** Atomic credit add. Runs inside a single Postgres transaction with row lock. */
export async function addCredits(
  userId: string,
  amount: number,
  opts: { type?: CreditTransactionType; referenceId?: string; description?: string } = {},
): Promise<number> {
  assertAmount(amount, 'addCredits');
  const type = opts.type ?? 'payment_credit';
  assertType(type, 'addCredits');
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('add_credits', {
    p_user_id: userId,
    p_amount: Math.round(Number(amount) * 100) / 100,
    p_transaction_type: type,
    p_reference_id: opts.referenceId ?? null,
    p_description: opts.description ?? null,
  });
  if (error) throw new Error(`addCredits failed: ${error.message}`);
  return Number(data);
}

/**
 * Atomic credit deduct. Fails with `insufficient_credits` when balance is low.
 * Concurrent deducts on the same wallet serialise via SELECT ... FOR UPDATE,
 * so balance can never go negative from a race.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  opts: { type?: CreditTransactionType; referenceId?: string; description?: string } = {},
): Promise<number> {
  assertAmount(amount, 'deductCredits');
  const type = opts.type ?? 'automation_purchase';
  assertType(type, 'deductCredits');
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: Math.round(Number(amount) * 100) / 100,
    p_transaction_type: type,
    p_reference_id: opts.referenceId ?? null,
    p_description: opts.description ?? null,
  });
  if (error) {
    if (/insufficient_credits/i.test(error.message)) {
      const e = new Error('insufficient_credits') as Error & { code: string };
      e.code = 'INSUFFICIENT_CREDITS';
      throw e;
    }
    throw new Error(`deductCredits failed: ${error.message}`);
  }
  return Number(data);
}
