import { NextRequest, NextResponse } from 'next/server';
import { pricingError, requireUser } from '@/app/api/billing/quote/route';
import { recordUsage } from '@/lib/billing/pricing';

// POST /api/billing/usage { instanceId?, listingId?, metric, quantity }
// Server snapshots the unit rate (BYOK → 0). Called by the execution
// engine / trusted backend flows, never priced by the browser.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const result = await recordUsage({
      userId: user.id,
      instanceId: body?.instanceId ?? null,
      listingId: body?.listingId ?? null,
      metric: body?.metric,
      quantity: body?.quantity,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return pricingError(e);
  }
}
