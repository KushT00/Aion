import { NextResponse } from 'next/server';
import { pricingError, requireUser } from '@/app/api/billing/quote/route';
import { listCycles } from '@/lib/billing/pricing';

// GET /api/billing/cycles — own managed billing history.
export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const cycles = await listCycles(user.id, 20);
    return NextResponse.json({ cycles });
  } catch (e) {
    return pricingError(e);
  }
}
