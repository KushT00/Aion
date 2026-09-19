// ============================================================
// AION Billing Part 3 — Trusted server-side payment service.
// Runs with service_role. The browser NEVER credits wallets and NEVER
// decides payment outcome; it only triggers these functions and re-reads
// server-verified status.
// Rule: $1 = 1 AION Credit.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { getProvider } from '@/lib/payments/gateway';
import type { CustomerType, Payment, PaymentStatus } from '@/types';

export const PRESET_AMOUNTS = [10, 25, 50, 100, 200] as const;
export const MIN_AMOUNT_USD = 1;
export const MAX_AMOUNT_USD = 10000;

export class PaymentError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function validateCustomerType(v: unknown): asserts v is CustomerType {
  if (v !== 'byok' && v !== 'managed') {
    throw new PaymentError('invalid_customer_type', 'Choose BYOK or AION Managed.', 400);
  }
}

/** Amount in USD. Accepts integers/decimals, rounds to cents, enforces bounds. */
export function validateAmount(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new PaymentError('invalid_amount', 'Enter a valid amount.', 400);
  }
  const rounded = Math.round(n * 100) / 100;
  if (rounded < MIN_AMOUNT_USD || rounded > MAX_AMOUNT_USD) {
    throw new PaymentError(
      'invalid_amount',
      `Amount must be between $${MIN_AMOUNT_USD} and $${MAX_AMOUNT_USD}.`,
      400,
    );
  }
  return rounded;
}

/** Create a pending payment row + provider intent. Credits nothing. */
export async function createPayment(
  userId: string,
  customerType: CustomerType,
  amountUsd: number,
): Promise<Payment> {
  validateCustomerType(customerType);
  const amount = validateAmount(amountUsd);
  const credits = amount; // $1 = 1 credit

  const admin = createAdminClient();
  const provider = getProvider();

  const { data: row, error: insertErr } = await admin
    .from('payments')
    .insert({
      user_id: userId,
      customer_type: customerType,
      amount_usd: amount,
      credits_amount: credits,
      provider: provider.name,
      status: 'pending',
      metadata: { customer_type: customerType },
    })
    .select('*')
    .single();
  if (insertErr || !row) {
    throw new PaymentError('payment_create_failed', 'Could not start the payment. Try again.', 500);
  }

  try {
    const intent = await provider.createIntent({
      paymentId: row.id,
      userId,
      amountUsd: amount,
      customerType,
    });
    const { data: updated, error: updateErr } = await admin
      .from('payments')
      .update({
        provider_payment_id: intent.providerPaymentId,
        metadata: { ...(row.metadata ?? {}), ...intent.metadata },
      })
      .eq('id', row.id)
      .select('*')
      .single();
    if (updateErr || !updated) {
      throw new PaymentError('payment_create_failed', 'Could not start the payment. Try again.', 500);
    }
    return updated as Payment;
  } catch (e) {
    // Fail closed: leave a failed row (audit trail), credit nothing.
    await admin
      .from('payments')
      .update({ status: 'failed', metadata: { ...(row.metadata ?? {}), error: 'intent_failed' } })
      .eq('id', row.id);
    if (e instanceof PaymentError) throw e;
    throw new PaymentError(
      'payment_provider_unavailable',
      'Payments are not available right now. Try again later.',
      503,
    );
  }
}

export interface ConfirmResult {
  payment: Payment;
  alreadyProcessed: boolean;
  creditsAmount: number;
  walletBalance: number;
}

/**
 * Server-verified confirm. Steps (spec §6–8):
 * 1. Load payment, enforce ownership (auth failure otherwise).
 * 2. Provider verifyAndConfirm() — real gateways check the charge here.
 * 3. Atomic confirm_payment() RPC — idempotent, row-locked, credits once.
 * Duplicate calls / refreshes return alreadyProcessed:true and credit nothing.
 */
export async function confirmPayment(paymentId: string, userId: string): Promise<ConfirmResult> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();
  if (error) throw new PaymentError('payment_lookup_failed', 'Could not verify the payment.', 500);
  if (!row) throw new PaymentError('payment_not_found', 'Payment not found.', 404);
  if (row.user_id !== userId) {
    throw new PaymentError('payment_forbidden', 'You cannot confirm this payment.', 403);
  }
  const payment = row as Payment;

  if (payment.status === 'succeeded') {
    // Idempotent replay: re-read authoritative state, credit nothing.
    const { data: wallet } = await admin
      .from('wallets')
      .select('credit_balance')
      .eq('user_id', userId)
      .maybeSingle();
    return {
      payment,
      alreadyProcessed: true,
      creditsAmount: Number(payment.credits_amount),
      walletBalance: Number(wallet?.credit_balance ?? 0),
    };
  }
  if (payment.status === 'failed' || payment.status === 'cancelled' || payment.status === 'refunded') {
    throw new PaymentError(
      'payment_not_confirmable',
      `This payment ${payment.status}. Start a new one to try again.`,
      409,
    );
  }

  // Provider verification BEFORE touching the wallet.
  const provider = getProvider();
  const check = await provider.verifyAndConfirm({
    paymentId: payment.id,
    providerPaymentId: payment.provider_payment_id ?? '',
    amountUsd: Number(payment.amount_usd),
  });
  if (!check.ok) {
    await admin.rpc('fail_payment', {
      p_payment_id: payment.id,
      p_status: 'failed',
      p_reason: check.reason ?? 'verification_failed',
    });
    throw new PaymentError('payment_verification_failed', 'Payment could not be verified.', 502);
  }

  const { data, error: rpcErr } = await admin.rpc('confirm_payment', {
    p_payment_id: payment.id,
  });
  if (rpcErr) {
    throw new PaymentError('payment_confirm_failed', 'Could not credit the wallet. Try again.', 500);
  }

  const { data: fresh } = await admin.from('payments').select('*').eq('id', payment.id).single();
  return {
    payment: (fresh ?? payment) as Payment,
    alreadyProcessed: Boolean((data as { already_processed?: boolean })?.already_processed),
    creditsAmount: Number(payment.credits_amount),
    walletBalance: Number((data as { wallet_balance?: number })?.wallet_balance ?? 0),
  };
}

/** Server-verified status read (page refresh after payment uses this). */
export async function getPayment(paymentId: string, userId: string): Promise<Payment> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();
  if (error) throw new PaymentError('payment_lookup_failed', 'Could not load the payment.', 500);
  if (!data) throw new PaymentError('payment_not_found', 'Payment not found.', 404);
  if ((data as Payment).user_id !== userId) {
    throw new PaymentError('payment_forbidden', 'You cannot view this payment.', 403);
  }
  return data as Payment;
}

export async function listPayments(userId: string, limit = 10): Promise<Payment[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new PaymentError('payment_lookup_failed', 'Could not load payments.', 500);
  return (data ?? []) as Payment[];
}

export type { PaymentStatus };
