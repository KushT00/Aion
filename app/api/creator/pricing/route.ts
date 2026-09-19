import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pricingError, requireUser } from '@/app/api/billing/quote/route';
import { PricingError } from '@/lib/billing/pricing';

const UPDATABLE = [
  'billing_model',
  'byok_prices',
  'managed_base_internal',
  'resource_rates',
  'margin_type',
  'margin_value',
  'supported_durations',
  'is_active',
] as const;

function sanitizePatch(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const key of UPDATABLE) {
    if (body?.[key] !== undefined) patch[key] = body[key];
  }
  if (patch.billing_model && !['flat', 'duration', 'usage'].includes(String(patch.billing_model))) {
    throw new PricingError('invalid_pricing', 'billing_model must be flat, duration or usage.', 400);
  }
  if (patch.margin_type && !['percent', 'fixed'].includes(String(patch.margin_type))) {
    throw new PricingError('invalid_pricing', 'margin_type must be percent or fixed.', 400);
  }
  if (patch.margin_value !== undefined) {
    const v = Number(patch.margin_value);
    if (!Number.isFinite(v) || v < 0 || v > 10000) {
      throw new PricingError('invalid_pricing', 'margin_value must be a non-negative number.', 400);
    }
    patch.margin_value = Math.round(v * 100) / 100;
  }
  for (const k of ['byok_prices', 'managed_base_internal', 'resource_rates'] as const) {
    if (patch[k] !== undefined) {
      const obj = patch[k] as Record<string, unknown>;
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        throw new PricingError('invalid_pricing', `${k} must be an object of numbers.`, 400);
      }
      for (const [dk, dv] of Object.entries(obj)) {
        const n = Number(dv);
        if (!Number.isFinite(n) || n < 0) {
          throw new PricingError('invalid_pricing', `${k}.${dk} must be a non-negative number.`, 400);
        }
      }
    }
  }
  if (patch.supported_durations !== undefined) {
    const arr = patch.supported_durations as unknown[];
    if (!Array.isArray(arr) || arr.length === 0 || arr.some((d) => !Number.isInteger(Number(d)) || Number(d) <= 0)) {
      throw new PricingError('invalid_pricing', 'supported_durations must be a non-empty array of positive integers.', 400);
    }
    patch.supported_durations = arr.map(Number);
  }
  if (Object.keys(patch).length === 0) {
    throw new PricingError('invalid_pricing', 'Nothing to update.', 400);
  }
  return patch;
}

async function ownListing(admin: ReturnType<typeof createAdminClient>, userId: string, listingId: string) {
  const { data } = await admin
    .from('marketplace_listings')
    .select('id')
    .eq('id', listingId)
    .eq('seller_id', userId)
    .maybeSingle();
  return Boolean(data);
}

// GET /api/creator/pricing?listingId — seller reads own pricing row.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const listingId = String(req.nextUrl.searchParams.get('listingId') ?? '');
    const admin = createAdminClient();
    if (!(await ownListing(admin, user.id, listingId))) {
      return NextResponse.json({ error: 'forbidden', message: 'Not your listing.' }, { status: 403 });
    }
    const { data } = await admin.from('automation_pricing').select('*').eq('listing_id', listingId).maybeSingle();
    return NextResponse.json({ pricing: data ?? null });
  } catch (e) {
    return pricingError(e);
  }
}

// PUT /api/creator/pricing { listingId, patch } — seller updates pricing.
// Ownership enforced server-side; values validated (never free-form).
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const listingId = String(body?.listingId ?? '');
    const admin = createAdminClient();
    if (!(await ownListing(admin, user.id, listingId))) {
      return NextResponse.json({ error: 'forbidden', message: 'Not your listing.' }, { status: 403 });
    }
    const patch = sanitizePatch(body?.patch ?? {});
    const { data, error } = await admin
      .from('automation_pricing')
      .update(patch)
      .eq('listing_id', listingId)
      .select('*')
      .single();
    if (error || !data) {
      throw new PricingError('pricing_update_failed', 'Could not update pricing.', 500);
    }
    return NextResponse.json({ pricing: data });
  } catch (e) {
    return pricingError(e);
  }
}
