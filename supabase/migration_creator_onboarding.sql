-- ============================================================
-- AION — Creator Onboarding Fields
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add creator-specific columns to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_creator boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS creator_onboarded_at timestamptz,
    ADD COLUMN IF NOT EXISTS creator_profile jsonb DEFAULT '{}';

-- Index for listing creators efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_is_creator ON public.profiles(is_creator)
    WHERE is_creator = true;

-- ── Creator Onboarding Form Submissions (Optional audit log) ──
-- Stores the raw onboarding form data before profile update
CREATE TABLE IF NOT EXISTS public.creator_applications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status          text NOT NULL DEFAULT 'approved'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    expertise       text NOT NULL,
    skills          text[] NOT NULL DEFAULT '{}',
    experience_years int NOT NULL DEFAULT 0,
    bio             text NOT NULL,
    work_style      text,
    specializations text[] DEFAULT '{}',
    portfolio_links text[] DEFAULT '{}',
    automation_categories text[] DEFAULT '{}',
    submitted_at    timestamptz NOT NULL DEFAULT now(),
    reviewed_at     timestamptz
);

ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own application"
    ON public.creator_applications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can submit own application"
    ON public.creator_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_creator_apps_user ON public.creator_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_apps_status ON public.creator_applications(status);
