import { NextRequest, NextResponse } from 'next/server';
import { pricingError, requireUser } from '@/app/api/billing/quote/route';
import { releaseEarning } from '@/lib/billing/marketplace';

// POST /api/creator/earnings/release { earningId }
// Moves a pending earning into the creator wallet (server-side credit).
// Idempotent: re-release returns alreadyProcessed, credits nothing twice.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const earningId = String(body?.earningId ?? '');
    if (!earningId) {
      return NextResponse.json({ error: 'invalid_request', message: 'earningId is required.' }, { status: 400 });
    }
    const result = await releaseEarning(user.id, earningId);
    return NextResponse.json(result);
  } catch (e) {
    return pricingError(e);
  }
}
