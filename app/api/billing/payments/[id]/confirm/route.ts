import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { confirmPayment, PaymentError } from '@/lib/payments/service';

// POST /api/billing/payments/[id]/confirm — server-verified credit.
// The frontend's "success" screen is only shown after THIS returns
// succeeded. Duplicate calls are idempotent (alreadyProcessed, no double credit).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in to confirm payments.' }, { status: 401 });
    }
    const { id } = await params;
    const result = await confirmPayment(id, user.id);
    return NextResponse.json({
      payment: result.payment,
      alreadyProcessed: result.alreadyProcessed,
      creditsAmount: result.creditsAmount,
      walletBalance: result.walletBalance,
    });
  } catch (e) {
    if (e instanceof PaymentError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    console.error('[payments] confirm failed');
    return NextResponse.json({ error: 'payment_failed', message: 'Could not credit the wallet. Try again.' }, { status: 500 });
  }
}
