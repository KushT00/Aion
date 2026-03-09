-- ============================================================
-- AION — Financial Systems (Wallets & Earnings)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── 1. Wallets ──────────────────────────────────────────────
-- Stores creator balances and current currency
CREATE TABLE IF NOT EXISTS public.wallets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance     int NOT NULL DEFAULT 0, -- In CENTS
    currency    text NOT NULL DEFAULT 'USD',
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

-- ─── 2. Ledger / Transactions ────────────────────────────────
-- Audit log of all money movements
CREATE TABLE IF NOT EXISTS public.transactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount          int NOT NULL, -- Positive for credit, negative for debit
    type            text NOT NULL CHECK (type IN ('sale', 'withdrawal', 'referral', 'adjustment')),
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference_id    text, -- e.g. purchase_id or stripe_payout_id
    metadata        jsonb DEFAULT '{}',
    created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.wallets 
        WHERE wallets.id = wallet_id 
        AND wallets.user_id = auth.uid()
    ));

-- ─── Indexing ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);
