import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRecentTransactions, getWallet, getWalletSummary } from '@/lib/credits/wallet';

// GET /api/wallet[?limit=20] — read-only. Returns own balance, server-
// computed month/breakdown summary, and recent ledger entries.
// Supabase/PostgREST remains the source of truth; the client must refresh
// from here after any transaction instead of trusting local state.
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read through trusted server helpers (service_role ensures the row
    // exists even for users created before the Part-2 migration).
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 20, 1), 100);
    const [wallet, transactions, summary] = await Promise.all([
      getWallet(user.id),
      getRecentTransactions(user.id, limit),
      getWalletSummary(user.id),
    ]);

    return NextResponse.json({
      balance: Number(wallet?.credit_balance ?? 0),
      wallet,
      summary,
      transactions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'wallet_read_failed';
    // Missing migration → helpful 503 instead of a cryptic 500.
    const status = /relation .* does not exist|could not find the table/i.test(msg) ? 503 : 500;
    return NextResponse.json(
      {
        error: status === 503 ? 'wallet_not_provisioned' : 'wallet_read_failed',
        message:
          status === 503
            ? 'Run supabase/migrations/20260919000000_aion_credits_wallet.sql in the Supabase SQL Editor, then retry.'
            : msg,
      },
      { status },
    );
  }
}
