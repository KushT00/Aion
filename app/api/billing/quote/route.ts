import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PricingError, quotePurchase } from '@/lib/billing/pricing';

export function pricingError(e: unknown) {
  if (e instanceof PricingError) {
    return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
  }
  const msg = e instanceof Error ? e.message : 'pricing_failed';
  if (/relation .* does not exist|could not find the table|function .* does not exist/i.test(msg)) {
    return NextResponse.json(
      {
        error: 'billing_not_provisioned',
        message:
          'Run the Part 2, Part 3 and Part 4 SQL migrations in the Supabase SQL Editor, in order.',
      },
      { status: 503 },
    );
  }
  console.error('[billing]', msg);
  return NextResponse.json({ error: 'pricing_failed', message: 'Billing is unavailable. Try again.' }, { status: 500 });
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

// GET /api/billing/quote?listingId&customerType&durationDays
// Server-authoritative quote. The marketplace UI displays this verbatim.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const q = req.nextUrl.searchParams;
    const quote = await quotePurchase(
      String(q.get('listingId') ?? ''),
      (q.get('customerType') ?? 'byok') as 'byok' | 'managed',
      Number(q.get('durationDays') ?? 30),
    );
    return NextResponse.json({ quote });
  } catch (e) {
    return pricingError(e);
  }
}
