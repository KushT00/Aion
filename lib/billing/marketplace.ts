// ============================================================
// AION Billing Part 5 — Marketplace billing service (server-only).
// Atomic purchase txn, entitlements, creator earnings, refunds, expiry.
// Frontend sends ids only; every credit figure comes from Postgres.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { PricingError } from '@/lib/billing/pricing';
import type {
  AutomationEntitlement,
  CreatorEarning,
  CreatorEarningsSummary,
  MarketplaceTransaction,
} from '@/types';

export interface AtomicPurchaseResult {
  purchaseId: string;
  entitlementId: string;
  transactionId: string;
  charged: number;
  balance: number;
  expiresAt: string;
  platformFee: number;
  creatorAmount: number;
  customerType: 'byok' | 'managed';
  durationDays: number;
}

/**
 * Full marketplace purchase in ONE Postgres transaction:
 * verify → price → credits → purchase → entitlement → split → earning.
 * Maps: insufficient → 402, duplicate → 409, price drift → 409.
 */
export async function purchaseAutomationTxn(
  userId: string,
  listingId: string,
  customerType: 'byok' | 'managed',
  durationDays: number,
  maxPrice: number,
): Promise<AtomicPurchaseResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('purchase_automation_txn', {
    p_user_id: userId,
    p_listing_id: listingId,
    p_customer_type: customerType,
    p_duration_days: durationDays,
    p_max_price: Math.round(Number(maxPrice) * 100) / 100,
  });
  if (error) {
    if (/insufficient_credits/i.test(error.message)) {
      throw new PricingError('insufficient_credits', 'Insufficient AION Credits. Add Credits to continue.', 402);
    }
    if (/duplicate_purchase/i.test(error.message)) {
      throw new PricingError('duplicate_purchase', 'You already own this automation.', 409);
    }
    if (/price_changed/i.test(error.message)) {
      throw new PricingError('price_changed', 'The price changed. Please review the new quote.', 409);
    }
    if (/automation_not_available/i.test(error.message)) {
      throw new PricingError('automation_not_available', 'This automation is no longer available.', 404);
    }
    if (/self_purchase/i.test(error.message)) {
      throw new PricingError('self_purchase', 'Cannot purchase your own listing.', 400);
    }
    throw new PricingError('purchase_failed', 'Could not complete the purchase.', 500);
  }
  const r = data as {
    purchase_id: string;
    entitlement_id: string;
    transaction_id: string;
    charged: number;
    balance: number;
    expires_at: string;
    platform_fee: number;
    creator_amount: number;
    customer_type: 'byok' | 'managed';
    duration_days: number;
  };
  return {
    purchaseId: r.purchase_id,
    entitlementId: r.entitlement_id,
    transactionId: r.transaction_id,
    charged: Number(r.charged),
    balance: Number(r.balance),
    expiresAt: r.expires_at,
    platformFee: Number(r.platform_fee),
    creatorAmount: Number(r.creator_amount),
    customerType: r.customer_type,
    durationDays: Number(r.duration_days),
  };
}

/** Own entitlements (active first), optionally filtered to one listing. */
export async function listEntitlements(userId: string, listingId?: string): Promise<AutomationEntitlement[]> {
  const admin = createAdminClient();
  let q = admin
    .from('automation_entitlements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (listingId) q = q.eq('automation_id', listingId);
  const { data, error } = await q;
  if (error) throw new PricingError('entitlement_lookup_failed', 'Could not load entitlements.', 500);
  return (data ?? []) as AutomationEntitlement[];
}

/** Active entitlement for (user, listing), or null. */
export async function getActiveEntitlement(userId: string, listingId: string): Promise<AutomationEntitlement | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('automation_entitlements')
    .select('*')
    .eq('user_id', userId)
    .eq('automation_id', listingId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw new PricingError('entitlement_lookup_failed', 'Could not load entitlements.', 500);
  return (data as AutomationEntitlement | null) ?? null;
}

/** Seller earnings summary: total / pending / available (from traceable rows). */
export async function creatorEarningsSummary(sellerId: string): Promise<CreatorEarningsSummary> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('creator_earnings')
    .select('amount, status')
    .eq('seller_id', sellerId);
  if (error) throw new PricingError('earnings_lookup_failed', 'Could not load earnings.', 500);
  const rows = (data ?? []) as Array<{ amount: number; status: string }>;
  const sum = (s: string) => rows.filter((r) => r.status === s).reduce((a, r) => a + Number(r.amount), 0);
  const total = rows.filter((r) => r.status !== 'reversed').reduce((a, r) => a + Number(r.amount), 0);
  return {
    total_earnings: Math.round(total * 100) / 100,
    pending_earnings: Math.round(sum('pending') * 100) / 100,
    available_earnings: Math.round(sum('available') * 100) / 100,
    sales_count: rows.filter((r) => r.status !== 'reversed').length,
  };
}

export async function listCreatorEarnings(sellerId: string, limit = 20): Promise<CreatorEarning[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('creator_earnings')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new PricingError('earnings_lookup_failed', 'Could not load earnings.', 500);
  return (data ?? []) as CreatorEarning[];
}

/** Release a pending earning into the creator wallet (seller-own enforced). */
export async function releaseEarning(sellerId: string, earningId: string) {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('creator_earnings')
    .select('id')
    .eq('id', earningId)
    .eq('seller_id', sellerId)
    .maybeSingle();
  if (error) throw new PricingError('earnings_lookup_failed', 'Could not load earnings.', 500);
  if (!row) throw new PricingError('forbidden', 'Earning not found.', 404);
  const { data, error: rpcErr } = await admin.rpc('release_creator_earning', { p_earning_id: earningId });
  if (rpcErr) throw new PricingError('release_failed', 'Could not release earnings.', 500);
  const r = data as { status: string; already_processed: boolean; amount?: number; balance?: number };
  return {
    status: r.status,
    alreadyProcessed: Boolean(r.already_processed),
    amount: r.amount !== undefined ? Number(r.amount) : 0,
    balance: r.balance !== undefined ? Number(r.balance) : 0,
  };
}

export interface RefundResult {
  purchaseId: string;
  refundedAmount: number;
  buyerBalance: number;
}

/** Refund a purchase. Caller must be buyer or seller. History preserved. */
export async function refundPurchase(callerId: string, purchaseId: string): Promise<RefundResult> {
  const admin = createAdminClient();
  const { data: pur, error } = await admin
    .from('purchases')
    .select('id, buyer_id, listing_id')
    .eq('id', purchaseId)
    .maybeSingle();
  if (error) throw new PricingError('refund_lookup_failed', 'Could not load the purchase.', 500);
  if (!pur) throw new PricingError('purchase_not_found', 'Purchase not found.', 404);
  const { data: listing } = await admin
    .from('marketplace_listings')
    .select('seller_id')
    .eq('id', pur.listing_id)
    .maybeSingle();
  if (pur.buyer_id !== callerId && listing?.seller_id !== callerId) {
    throw new PricingError('forbidden', 'You cannot refund this purchase.', 403);
  }
  const { data, error: rpcErr } = await admin.rpc('refund_purchase', { p_purchase_id: purchaseId });
  if (rpcErr) {
    if (/purchase_not_refundable/i.test(rpcErr.message)) {
      throw new PricingError('purchase_not_refundable', 'This purchase cannot be refunded.', 409);
    }
    if (/insufficient_credits/i.test(rpcErr.message)) {
      throw new PricingError('refund_failed', 'Seller balance too low to claw back. Contact support.', 409);
    }
    throw new PricingError('refund_failed', 'Could not process the refund.', 500);
  }
  const r = data as { purchase_id: string; refunded_amount: number; buyer_balance: number };
  return {
    purchaseId: r.purchase_id,
    refundedAmount: Number(r.refunded_amount),
    buyerBalance: Number(r.buyer_balance),
  };
}

/** Expire past-due entitlements. Returns count. */
export async function expireEntitlements(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('expire_entitlements');
  if (error) throw new PricingError('expiry_failed', 'Could not expire entitlements.', 500);
  return Number(data ?? 0);
}

export async function getMarketplaceTransaction(purchaseId: string): Promise<MarketplaceTransaction | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('marketplace_transactions')
    .select('*')
    .eq('purchase_id', purchaseId)
    .maybeSingle();
  if (error) throw new PricingError('transaction_lookup_failed', 'Could not load the transaction.', 500);
  return (data as MarketplaceTransaction | null) ?? null;
}
