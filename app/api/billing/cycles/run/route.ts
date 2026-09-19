import { NextRequest, NextResponse } from 'next/server';
import { pricingError, requireUser } from '@/app/api/billing/quote/route';
import { PricingError, runBillingCycle } from '@/lib/billing/pricing';

// POST /api/billing/cycles/run { instanceId, periodStart?, periodEnd? }
// Owner-triggered managed billing for one period (defaults: last 30 days).
// Monthly usage → resource cost → margin → charge → deduct credits.
// Insufficient → cycle `failed` + "Insufficient AION Credits…" (HTTP 200 with
// status failed — the billing outcome, not a server error).
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const instanceId = String(body?.instanceId ?? '');
    if (!instanceId) {
      throw new PricingError('invalid_period', 'instanceId is required.', 400);
    }
    const end = body?.periodEnd ? new Date(body.periodEnd) : new Date();
    const start = body?.periodStart ? new Date(body.periodStart) : new Date(end.getTime() - 30 * 86400000);
    const result = await runBillingCycle(user.id, instanceId, start.toISOString(), end.toISOString());
    return NextResponse.json({ cycle: result });
  } catch (e) {
    return pricingError(e);
  }
}
