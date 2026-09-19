import { NextRequest, NextResponse } from 'next/server';
import { pricingError, requireUser } from '@/app/api/billing/quote/route';
import { refundPurchase } from '@/lib/billing/marketplace';

// POST /api/billing/refund { purchaseId }
// Buyer or seller of the sale. Creates +refund adjustment rows for buyer
// (and seller clawback when already released); history is never deleted.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const purchaseId = String(body?.purchaseId ?? '');
    if (!purchaseId) {
      return NextResponse.json({ error: 'invalid_request', message: 'purchaseId is required.' }, { status: 400 });
    }
    const result = await refundPurchase(user.id, purchaseId);
    return NextResponse.json({ refund: result });
  } catch (e) {
    return pricingError(e);
  }
}
