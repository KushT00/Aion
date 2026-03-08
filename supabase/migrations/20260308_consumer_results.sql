-- ============================================================
-- AION — Migration: Consumer Results (CRM Data Store)
-- Owner: Sanket (Workstream C)
-- Purpose: Store BUSINESS data (leads, proposals, extracted data)
--          separate from technical run logs.
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── 1. Consumer Results Table ─────────────────────────────
-- This is the "gold" that automations dig up for the buyer.
-- Each row = one captured business result (lead, data extract, etc.)
CREATE TABLE IF NOT EXISTS public.consumer_results (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid NOT NULL REFERENCES public.consumer_instances(id) ON DELETE CASCADE,
    run_log_id      uuid REFERENCES public.consumer_run_logs(id) ON DELETE SET NULL,
    result_type     text NOT NULL DEFAULT 'lead'
                    CHECK (result_type IN ('lead','data','task','proposal','custom')),
    title           text,                       -- human-readable title, e.g. "John Doe — Lead"
    data            jsonb NOT NULL DEFAULT '{}', -- the actual business data (flexible schema)
    tags            text[] DEFAULT '{}',         -- user-defined tags for filtering
    status          text NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','processing','processed','archived')),
    metadata        jsonb DEFAULT '{}',          -- source info, confidence scores, etc.
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. RLS Policies ──────────────────────────────────────
ALTER TABLE public.consumer_results ENABLE ROW LEVEL SECURITY;

-- Buyers can view results for their own instances
CREATE POLICY "Buyers can view own results"
    ON public.consumer_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.consumer_instances ci
            WHERE ci.id = instance_id AND ci.buyer_id = auth.uid()
        )
    );

-- Buyers can update result status/tags (for CRM workflow)
CREATE POLICY "Buyers can update own results"
    ON public.consumer_results FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.consumer_instances ci
            WHERE ci.id = instance_id AND ci.buyer_id = auth.uid()
        )
    );

-- Service/system can insert results (from workflow runner)
CREATE POLICY "Service can insert results"
    ON public.consumer_results FOR INSERT
    WITH CHECK (true);

-- Buyers can delete/archive their own results
CREATE POLICY "Buyers can delete own results"
    ON public.consumer_results FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.consumer_instances ci
            WHERE ci.id = instance_id AND ci.buyer_id = auth.uid()
        )
    );

-- ─── 3. Indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consumer_results_instance
    ON public.consumer_results(instance_id);

CREATE INDEX IF NOT EXISTS idx_consumer_results_type
    ON public.consumer_results(result_type);

CREATE INDEX IF NOT EXISTS idx_consumer_results_status
    ON public.consumer_results(status);

CREATE INDEX IF NOT EXISTS idx_consumer_results_created
    ON public.consumer_results(created_at DESC);

-- Composite index for common CRM queries (instance + type + status)
CREATE INDEX IF NOT EXISTS idx_consumer_results_crm_query
    ON public.consumer_results(instance_id, result_type, status);

-- GIN index for JSONB data searches
CREATE INDEX IF NOT EXISTS idx_consumer_results_data_gin
    ON public.consumer_results USING GIN (data);

-- GIN index for tag-based filtering
CREATE INDEX IF NOT EXISTS idx_consumer_results_tags_gin
    ON public.consumer_results USING GIN (tags);
