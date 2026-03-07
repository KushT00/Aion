-- ============================================================
-- AION — Consumer Instance Isolation Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── 1. Consumer Instances ──────────────────────────────────
-- Each purchase creates one isolated instance for the buyer
CREATE TABLE IF NOT EXISTS public.consumer_instances (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id     uuid REFERENCES public.purchases(id) ON DELETE CASCADE,
    buyer_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workflow_id     uuid NOT NULL REFERENCES public.workflows(id),
    listing_id      uuid NOT NULL REFERENCES public.marketplace_listings(id),
    pricing_tier    text NOT NULL DEFAULT 'byok'
                    CHECK (pricing_tier IN ('byok', 'managed')),
    status          text NOT NULL DEFAULT 'setup_required'
                    CHECK (status IN ('setup_required', 'active', 'paused', 'error')),
    config_overrides jsonb DEFAULT '{}',
    schedule        text DEFAULT NULL,        -- cron expression, e.g. '*/30 * * * *'
    webhook_secret  text DEFAULT gen_random_uuid()::text,
    last_run_at     timestamptz,
    total_runs      int DEFAULT 0,
    total_successes int DEFAULT 0,
    total_failures  int DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Consumer Credentials ────────────────────────────────
-- Stores API keys and OAuth tokens per instance per integration
CREATE TABLE IF NOT EXISTS public.consumer_credentials (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid NOT NULL REFERENCES public.consumer_instances(id) ON DELETE CASCADE,
    integration_key text NOT NULL,            -- e.g. 'google_gemini', 'telegram', 'google_oauth'
    credential_data jsonb NOT NULL DEFAULT '{}',  -- { apiKey: '...', accessToken: '...', etc }
    is_valid        boolean DEFAULT false,
    validated_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(instance_id, integration_key)
);

-- ─── 3. Consumer Run Logs ───────────────────────────────────
-- Execution history per consumer instance
CREATE TABLE IF NOT EXISTS public.consumer_run_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid NOT NULL REFERENCES public.consumer_instances(id) ON DELETE CASCADE,
    status          text NOT NULL CHECK (status IN ('success', 'failed')),
    duration_ms     int,
    node_count      int DEFAULT 0,
    input_summary   text,
    output_summary  text,
    error           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.consumer_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view own instances" ON public.consumer_instances FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers can update own instances" ON public.consumer_instances FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "System can insert instances" ON public.consumer_instances FOR INSERT WITH CHECK (auth.uid() = buyer_id);

ALTER TABLE public.consumer_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can manage own credentials" ON public.consumer_credentials FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.consumer_instances ci 
        WHERE ci.id = instance_id AND ci.buyer_id = auth.uid()
    ));

ALTER TABLE public.consumer_run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view own logs" ON public.consumer_run_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.consumer_instances ci 
        WHERE ci.id = instance_id AND ci.buyer_id = auth.uid()
    ));

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_instances_buyer ON public.consumer_instances(buyer_id);
CREATE INDEX IF NOT EXISTS idx_instances_status ON public.consumer_instances(status);
CREATE INDEX IF NOT EXISTS idx_credentials_instance ON public.consumer_credentials(instance_id);
CREATE INDEX IF NOT EXISTS idx_run_logs_instance ON public.consumer_run_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_run_logs_created ON public.consumer_run_logs(created_at DESC);

-- ─── TRIGGER for updated_at ─────────────────────────────────
CREATE TRIGGER consumer_instances_updated_at BEFORE UPDATE ON public.consumer_instances
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER consumer_credentials_updated_at BEFORE UPDATE ON public.consumer_credentials
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Add pricing_tier to purchases if missing ───────────────
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS pricing_tier text DEFAULT 'byok';
