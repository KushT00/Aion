import { NextResponse } from 'next/server';
import { pricingError, requireUser } from '@/app/api/billing/quote/route';
import { creatorEarningsSummary, listCreatorEarnings } from '@/lib/billing/marketplace';

// GET /api/creator/earnings — Total / Pending / Available + traceable rows.
// Every earning links back to its marketplace transaction.
export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const [summary, earnings] = await Promise.all([
      creatorEarningsSummary(user.id),
      listCreatorEarnings(user.id, 20),
    ]);
    return NextResponse.json({ summary, earnings });
  } catch (e) {
    return pricingError(e);
  }
}
