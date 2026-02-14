-- ============================================================
-- AION — Extended Database Schema for Digital Worker Economy
-- ============================================================

-- 1. Integration Credentials (Encrypted storage for API keys)
CREATE TABLE public.credentials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL, -- e.g. "My Gemini Key"
  provider    TEXT NOT NULL, -- e.g. "gemini"
  encrypted_key TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Workflow Analytics (Aggregated data for creators)
CREATE TABLE public.workflow_analytics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  total_runs    INT DEFAULT 0,
  successful_runs INT DEFAULT 0,
  failed_runs   INT DEFAULT 0,
  total_revenue INT DEFAULT 0, -- in cents
  avg_duration_ms INT DEFAULT 0,
  UNIQUE(workflow_id, date)
);

-- 3. Wallets (For Creator Earnings and User Credits)
CREATE TABLE public.wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance     INT NOT NULL DEFAULT 0, -- in cents
  currency    TEXT NOT NULL DEFAULT 'USD',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Transactions (Ledger for all financial moves)
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount          INT NOT NULL, -- positive for credit, negative for debit
  type            TEXT NOT NULL CHECK (type IN ('purchase', 'payout', 'refund', 'earnings')),
  reference_id    UUID, -- e.g. purchase_id or run_id
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies for new tables
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own credentials" ON public.credentials ALL USING (auth.uid() = user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets SELECT USING (auth.uid() = user_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions SELECT USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);
