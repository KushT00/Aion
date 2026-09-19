import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPayment, listPayments, PaymentError } from '@/lib/payments/service';

function toPublicError(e: unknown) {
  if (e instanceof PaymentError) {
    return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
  }
  const msg = e instanceof Error ? e.message : 'payment_failed';
  const missing =
    /relation .* does not exist|could not find the table|function .* does not exist/i.test(msg);
  if (missing) {
    return NextResponse.json(
      {
        error: 'payments_not_provisioned',
        message:
          'Run supabase/migrations/20260919000000_aion_credits_wallet.sql then 20260919000001_aion_payments.sql in the Supabase SQL Editor.',
      },
      { status: 503 },
    );
  }
  // Never expose provider/database internals.
  console.error('[payments] create failed:', msg);
  return NextResponse.json({ error: 'payment_failed', message: 'Could not start the payment. Try again.' }, { status: 500 });
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// POST /api/billing/payments — start a payment (creates pending row, credits nothing)
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in to add credits.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const payment = await createPayment(user.id, body?.customerType, body?.amountUsd);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (e) {
    return toPublicError(e);
  }
}

// GET /api/billing/payments — own payment history (for refresh-safe UI)
export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in to view payments.' }, { status: 401 });
    const payments = await listPayments(user.id, 10);
    return NextResponse.json({ payments });
  } catch (e) {
    return toPublicError(e);
  }
}
