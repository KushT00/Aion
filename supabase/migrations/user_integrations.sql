-- ============================================================
-- AION — User Integrations Table (OAuth Token Store)
-- Run this in the Supabase SQL Editor after schema.sql
-- ============================================================

-- Stores OAuth tokens for connected third-party accounts
create table if not exists public.user_integrations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  provider        text not null, -- 'google', 'discord', 'notion', 'slack', 'airtable'
  scopes          text[] default '{}',
  access_token    text,
  refresh_token   text,
  token_expires_at timestamptz,
  account_email   text,         -- e.g. user@gmail.com
  account_name    text,         -- display name from provider
  metadata        jsonb default '{}',
  is_valid        boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, provider)     -- one Google account per user (can relax later)
);

alter table public.user_integrations enable row level security;

create policy "Users can view own integrations"
  on public.user_integrations for select using (auth.uid() = user_id);

create policy "Users can insert own integrations"
  on public.user_integrations for insert with check (auth.uid() = user_id);

create policy "Users can update own integrations"
  on public.user_integrations for update using (auth.uid() = user_id);

create policy "Users can delete own integrations"
  on public.user_integrations for delete using (auth.uid() = user_id);

create index idx_user_integrations_user on public.user_integrations(user_id);
create index idx_user_integrations_provider on public.user_integrations(provider);

-- Trigger to update updated_at
create trigger user_integrations_updated_at before update on public.user_integrations
  for each row execute function public.set_updated_at();

-- Service role can read/write all (for token refresh from webhook runner)
create policy "Service role full access"
  on public.user_integrations for all
  using (true)
  with check (true);
