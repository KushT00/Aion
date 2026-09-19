import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPayment, PaymentError } from '@/lib/payments/service';

// GET /api/billing/payments/[id] — server-verified status.
// Page refresh after payment re-reads THIS, never localStorage flags.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in to view payments.' }, { status: 401 });
    }
    const { id } = await params;
    const payment = await getPayment(id, user.id);
    return NextResponse.json({ payment });
  } catch (e) {
    if (e instanceof PaymentError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: 'payment_failed', message: 'Could not load the payment.' }, { status: 500 });
  }
}
