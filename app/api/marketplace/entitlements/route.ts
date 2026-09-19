import { NextRequest, NextResponse } from 'next/server';
import { pricingError, requireUser } from '@/app/api/billing/quote/route';
import { getActiveEntitlement, listEntitlements } from '@/lib/billing/marketplace';

// GET /api/marketplace/entitlements[?listingId=]
// Own entitlements; with listingId returns the active one (or null) so the
// UI can gate Deploy vs Owned/Expired without trusting local state.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const listingId = req.nextUrl.searchParams.get('listingId');
    if (listingId) {
      const entitlement = await getActiveEntitlement(user.id, listingId);
      return NextResponse.json({ entitlement });
    }
    const entitlements = await listEntitlements(user.id);
    return NextResponse.json({ entitlements });
  } catch (e) {
    return pricingError(e);
  }
}
