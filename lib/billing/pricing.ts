// ============================================================
// AION Billing Part 4 — Centralized server-side pricing engine.
// The ONLY authoritative pricer. Frontend sends ids + duration + usage;
// every credit amount comes back from here (DB RPCs recompute server-side).
// Client-supplied prices are never accepted (see purchase_with_credits'
// p_max_price guard: it can only LOWER what the client pays vs. stale
// quotes — never what the server charges).
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AutomationPricing,
  BillingCycle,
  CustomerType,
  PurchaseQuote,
  UsageMetric,
} from '@/types';

export const SUPPORTED_DURATIONS = [1, 7, 30, 90] as const;

export const SUPPORTED_METRICS: UsageMetric[] = [
  'execution',
  'runtime_second',
  'input_token_1k',
  'output_token_1k',
  'api_request',
  'storage_gb_mo',
  'compute_second',
];

export class PricingError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function assertCustomerType(v: unknown): asserts v is CustomerType {
  if (v !== 'byok' && v !== 'managed') {
    throw new PricingError('invalid_customer_type', 'Choose BYOK or AION Managed.', 400);
  }
}

export function assertDuration(v: unknown): asserts v is number {
  const n = Number(v);
  if (!Number.isInteger(n) || !(SUPPORTED_DURATIONS as readonly number[]).includes(n)) {
    throw new PricingError(
      'unsupported_duration',
      `Duration must be one of ${(SUPPORTED_DURATIONS as readonly number[]).join(', ')} days.`,
      400,
    );
  }
}

function assertMetric(v: unknown): asserts v is UsageMetric {
  if (!SUPPORTED_METRICS.includes(v as UsageMetric)) {
    throw new PricingError('invalid_metric', `Unknown usage metric: ${String(v)}.`, 400);
  }
}

/** Raw pricing row for a listing (null when migration/seed pending). */
export async function getPricing(listingId: string): Promise<AutomationPricing | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('automation_pricing')
    .select('*')
    .eq('listing_id', listingId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new PricingError('pricing_lookup_failed', 'Could not load pricing.', 500);
  return (data as AutomationPricing | null) ?? null;
}

/**
 * Server-authoritative purchase quote.
 * Output: { internal_cost, margin, customer_price, credits_required }.
 * BYOK → internal 0, margin 0. Managed → internal + margin = customer.
 */
export async function quotePurchase(
  listingId: string,
  customerType: CustomerType,
  durationDays: number,
): Promise<PurchaseQuote> {
  assertCustomerType(customerType);
  assertDuration(durationDays);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('quote_purchase', {
    p_listing_id: listingId,
    p_customer_type: customerType,
    p_duration_days: durationDays,
  });
  if (error) {
    if (/pricing_not_found/i.test(error.message)) {
      throw new PricingError('pricing_not_found', 'Pricing is not configured for this automation.', 503);
    }
    if (/unsupported_duration|invalid_customer_type/i.test(error.message)) {
      throw new PricingError('invalid_quote_input', 'Invalid pricing request.', 400);
    }
    throw new PricingError('quote_failed', 'Could not calculate the price.', 500);
  }
  const q = data as { internal_cost: number; margin: number; customer_price: number };
  const customerPrice = Number(q.customer_price);
  return {
    listing_id: listingId,
    customer_type: customerType,
    duration_days: durationDays,
    internal_cost: Number(q.internal_cost),
    margin: Number(q.margin),
    customer_price: customerPrice,
    credits_required: customerPrice,
  };
}

/** Estimate internal cost of a usage bundle at current rates (no charge). */
export async function estimateUsageCost(
  listingId: string,
  usage: Array<{ metric: UsageMetric; quantity: number }>,
): Promise<{ internal_cost: number; breakdown: Record<string, number> }> {
  const pricing = await getPricing(listingId);
  if (!pricing) throw new PricingError('pricing_not_found', 'Pricing is not configured.', 503);
  const rates = (pricing.resource_rates ?? {}) as Record<string, number>;
  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const u of usage) {
    assertMetric(u.metric);
    const qty = Number(u.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new PricingError('invalid_metric', 'Usage quantity must be positive.', 400);
    }
    const rate = Number(rates[u.metric] ?? 0);
    const cost = Math.round(qty * rate * 10000) / 10000;
    breakdown[u.metric] = cost;
    total += cost;
  }
  return { internal_cost: Math.round(total * 100) / 100, breakdown };
}

export interface PurchaseResult {
  charged: number;
  balance: number;
  customerType: CustomerType;
  durationDays: number;
}

/**
 * Charge credits for an automation at SERVER prices.
 * Throws INSUFFICIENT_CREDITS (→ HTTP 402) when balance is low.
 */
export async function purchaseWithCredits(
  userId: string,
  listingId: string,
  customerType: CustomerType,
  durationDays: number,
  maxPrice: number,
): Promise<PurchaseResult> {
  assertCustomerType(customerType);
  assertDuration(durationDays);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('purchase_with_credits', {
    p_user_id: userId,
    p_listing_id: listingId,
    p_customer_type: customerType,
    p_duration_days: durationDays,
    p_max_price: Math.round(Number(maxPrice) * 100) / 100,
  });
  if (error) {
    if (/insufficient_credits/i.test(error.message)) {
      const e = new PricingError(
        'insufficient_credits',
        'Insufficient AION Credits. Add Credits to continue.',
        402,
      );
      throw e;
    }
    if (/price_changed/i.test(error.message)) {
      throw new PricingError('price_changed', 'The price changed. Please review the new quote.', 409);
    }
    if (/pricing_not_found/i.test(error.message)) {
      throw new PricingError('pricing_not_found', 'Pricing is not configured for this automation.', 503);
    }
    throw new PricingError('purchase_failed', 'Could not complete the purchase.', 500);
  }
  const r = data as { charged: number; balance: number; customer_type: CustomerType; duration_days: number };
  return {
    charged: Number(r.charged),
    balance: Number(r.balance),
    customerType: r.customer_type,
    durationDays: Number(r.duration_days),
  };
}

/**
 * Record resource consumption. Costs snapshot from current rates.
 * BYOK instances snapshot cost 0 — AION spends nothing on customer keys,
 * so BYOK can never accumulate a managed bill (spec §10).
 */
export async function recordUsage(input: {
  userId: string;
  instanceId?: string | null;
  listingId?: string | null;
  metric: UsageMetric;
  quantity: number;
}): Promise<{ cost_usd: number; unit_cost_usd: number }> {
  assertMetric(input.metric);
  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new PricingError('invalid_metric', 'Usage quantity must be positive.', 400);
  }
  const admin = createAdminClient();

  let tier: string | null = null;
  let listingId = input.listingId ?? null;
  if (input.instanceId) {
    const { data: inst, error } = await admin
      .from('consumer_instances')
      .select('id, buyer_id, listing_id, pricing_tier')
      .eq('id', input.instanceId)
      .maybeSingle();
    if (error || !inst) throw new PricingError('instance_not_found', 'Instance not found.', 404);
    if (inst.buyer_id !== input.userId) throw new PricingError('forbidden', 'Not your instance.', 403);
    tier = inst.pricing_tier;
    listingId = listingId ?? inst.listing_id;
  }
  if (!listingId) throw new PricingError('invalid_metric', 'listingId or instanceId is required.', 400);

  let unit = 0;
  if (tier !== 'byok') {
    const pricing = await getPricing(listingId);
    unit = Number((pricing?.resource_rates as Record<string, number> | undefined)?.[input.metric] ?? 0);
  }
  const cost = Math.round(qty * unit * 10000) / 10000;

  const { error: insErr } = await admin.from('resource_usage').insert({
    user_id: input.userId,
    instance_id: input.instanceId ?? null,
    listing_id: listingId,
    metric: input.metric,
    quantity: qty,
    unit_cost_usd: unit,
    cost_usd: cost,
    metadata: { pricing_tier: tier ?? 'direct' },
  });
  if (insErr) throw new PricingError('usage_record_failed', 'Could not record usage.', 500);
  return { cost_usd: cost, unit_cost_usd: unit };
}

export interface CycleResult {
  cycleId: string;
  status: 'succeeded' | 'failed';
  customerCharge: number;
  balance?: number;
  message?: string;
}

/** Run managed monthly billing. BYOK instances are refused (spec §10). */
export async function runBillingCycle(
  userId: string,
  instanceId: string,
  periodStart: string,
  periodEnd: string,
): Promise<CycleResult> {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new PricingError('invalid_period', 'Invalid billing period.', 400);
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('run_managed_cycle', {
    p_user_id: userId,
    p_instance_id: instanceId,
    p_period_start: start.toISOString(),
    p_period_end: end.toISOString(),
  });
  if (error) {
    if (/not_managed/i.test(error.message)) {
      throw new PricingError(
        'not_managed',
        'BYOK instances never receive managed resource charges.',
        422,
      );
    }
    if (/instance_forbidden|instance_not_found/i.test(error.message)) {
      throw new PricingError('instance_not_found', 'Instance not found.', 404);
    }
    throw new PricingError('cycle_failed', 'Could not run billing for this period.', 500);
  }
  const r = data as {
    cycle_id: string;
    status: 'succeeded' | 'failed';
    customer_charge: number;
    balance?: number;
    message?: string;
  };
  return {
    cycleId: r.cycle_id,
    status: r.status,
    customerCharge: Number(r.customer_charge),
    balance: r.balance !== undefined ? Number(r.balance) : undefined,
    message: r.message,
  };
}

export async function listCycles(userId: string, limit = 20): Promise<BillingCycle[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('managed_billing_cycles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new PricingError('cycle_lookup_failed', 'Could not load billing cycles.', 500);
  return (data ?? []) as BillingCycle[];
}
