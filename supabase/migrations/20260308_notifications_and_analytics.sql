-- ============================================================
-- AION — Migration: Notifications + Consumer Analytics Tables
-- Owner: Sanket (Workstream C)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── 1. Notifications ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type        text NOT NULL,
    title       text NOT NULL,
    message     text,
    read        boolean NOT NULL DEFAULT false,
    metadata    jsonb DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- System/service role can insert notifications for any user
CREATE POLICY "Service can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);


-- ─── 2. Consumer Analytics ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consumer_analytics (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid NOT NULL REFERENCES public.consumer_instances(id) ON DELETE CASCADE,
    metric_type     text NOT NULL
                    CHECK (metric_type IN ('lead','revenue','task','custom')),
    metric_value    float NOT NULL,
    metric_label    text,
    metadata        jsonb DEFAULT '{}',
    recorded_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consumer_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view analytics for their own instances
CREATE POLICY "Users can view own instance analytics"
    ON public.consumer_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.consumer_instances ci
            WHERE ci.id = instance_id AND ci.buyer_id = auth.uid()
        )
    );

-- Service can insert analytics records
CREATE POLICY "Service can insert analytics"
    ON public.consumer_analytics FOR INSERT
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_consumer_analytics_instance ON public.consumer_analytics(instance_id);
CREATE INDEX IF NOT EXISTS idx_consumer_analytics_type ON public.consumer_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_consumer_analytics_recorded ON public.consumer_analytics(recorded_at DESC);
