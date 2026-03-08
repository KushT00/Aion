-- Migration: 20260308_creator_custom_leads.sql
-- Description: Creates the leads table for the Creator CRM where consumers request custom automations.

CREATE TABLE IF NOT EXISTS creator_custom_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consumer_name TEXT NOT NULL,
    consumer_email TEXT NOT NULL,
    project_description TEXT NOT NULL,
    ai_summary TEXT,
    urgency_score INTEGER CHECK (urgency_score >= 1 AND urgency_score <= 10),
    urgency_tag TEXT CHECK (urgency_tag IN ('Hot', 'Slow', 'Slowest')),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'rejected', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE creator_custom_leads ENABLE ROW LEVEL SECURITY;

-- Creators can see their own leads
CREATE POLICY "Creators can view their own leads"
    ON creator_custom_leads FOR SELECT
    USING (auth.uid() = creator_id);

-- Creators can update their own leads (status, etc)
CREATE POLICY "Creators can update their own leads"
    ON creator_custom_leads FOR UPDATE
    USING (auth.uid() = creator_id);

-- Consumers (or anyone authenticated if we want general requests) can insert
CREATE POLICY "Authenticated users can request custom automations"
    ON creator_custom_leads FOR INSERT
    WITH CHECK (auth.uid() = consumer_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_creator_custom_leads_updated_at ON creator_custom_leads;
CREATE TRIGGER trg_creator_custom_leads_updated_at
BEFORE UPDATE ON creator_custom_leads
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Add Indexes
CREATE INDEX IF NOT EXISTS idx_leads_creator_id ON creator_custom_leads(creator_id);
CREATE INDEX IF NOT EXISTS idx_leads_consumer_id ON creator_custom_leads(consumer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON creator_custom_leads(status);
