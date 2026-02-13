-- ============================================================
-- AION — Seed Data
-- Run this AFTER schema.sql in the Supabase SQL Editor
-- ============================================================
-- NOTE: This seed data uses placeholder UUIDs. In production,
-- real user UUIDs from auth.users would be used.
-- You can run this after signing up your first user to populate
-- the marketplace with sample data.

-- To use: replace 'YOUR_USER_ID' with your actual user UUID
-- from the Supabase Auth dashboard after signing up.

-- Example (uncomment and replace YOUR_USER_ID):
/*
insert into public.workflows (id, user_id, name, description, status, tags) values
  ('11111111-1111-1111-1111-111111111111', 'YOUR_USER_ID', 'Email Automation Flow', 'Automate your email responses with AI-powered classification and drafting.', 'published', '{email,ai,automation}'),
  ('22222222-2222-2222-2222-222222222222', 'YOUR_USER_ID', 'Data Scraping Pipeline', 'Extract and transform web data into structured datasets automatically.', 'draft', '{scraping,data,etl}'),
  ('33333333-3333-3333-3333-333333333333', 'YOUR_USER_ID', 'Social Media Bot', 'Scheduled posting across multiple platforms with AI-generated content.', 'published', '{social,ai,scheduling}'),
  ('44444444-4444-4444-4444-444444444444', 'YOUR_USER_ID', 'Report Generator', 'Generate weekly reports from multiple data sources with charts and insights.', 'archived', '{reporting,analytics}'),
  ('55555555-5555-5555-5555-555555555555', 'YOUR_USER_ID', 'Customer Support Agent', 'Intelligent chatbot that handles Tier-1 support tickets with escalation.', 'published', '{chatbot,support,nlp}');

insert into public.marketplace_listings (workflow_id, seller_id, title, description, price, category, tags, usage_count, rating_avg, rating_count) values
  ('11111111-1111-1111-1111-111111111111', 'YOUR_USER_ID', 'Email Automation Pro', 'AI-powered email triage, classification, and smart response drafting with GPT-4 integration.', 4900, 'Automation', '{email,ai,gpt-4}', 1242, 4.8, 124),
  ('33333333-3333-3333-3333-333333333333', 'YOUR_USER_ID', 'Social Media Manager', 'Schedule, generate, and publish content across Twitter, LinkedIn, and Instagram automatically.', 2900, 'Social', '{social,content,scheduling}', 856, 4.6, 89),
  ('55555555-5555-5555-5555-555555555555', 'YOUR_USER_ID', 'Customer Support Agent', 'Intelligent chatbot that handles Tier-1 support tickets with escalation to humans when needed.', 5900, 'AI Agents', '{chatbot,support,nlp}', 1567, 4.7, 156);
*/
