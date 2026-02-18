-- ============================================================
-- AION — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── Profiles ───────────────────────────────────────────────
-- Extends the built-in auth.users table
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'user' check (role in ('creator', 'user', 'admin')),
  bio         text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Workflows ──────────────────────────────────────────────
create table public.workflows (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  description   text,
  status        text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  thumbnail_url text,
  tags          text[] default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.workflows enable row level security;

create policy "Users can view own workflows"
  on public.workflows for select using (auth.uid() = user_id);

create policy "Users can insert own workflows"
  on public.workflows for insert with check (auth.uid() = user_id);

create policy "Users can update own workflows"
  on public.workflows for update using (auth.uid() = user_id);

create policy "Users can delete own workflows"
  on public.workflows for delete using (auth.uid() = user_id);

create index idx_workflows_user_id on public.workflows(user_id);
create index idx_workflows_status on public.workflows(status);

-- ─── Workflow Nodes ─────────────────────────────────────────
create table public.workflow_nodes (
  id          uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  type        text not null check (type in ('input', 'trigger', 'ai_action', 'api_action', 'social_action', 'logic_gate', 'data_tool', 'output')),
  label       text not null,
  position_x  float not null default 0,
  position_y  float not null default 0,
  config      jsonb default '{}',
  created_at  timestamptz not null default now()
);

alter table public.workflow_nodes enable row level security;

create policy "Users can manage own workflow nodes"
  on public.workflow_nodes for all
  using (
    exists (
      select 1 from public.workflows w
      where w.id = workflow_id and w.user_id = auth.uid()
    )
  );

create index idx_workflow_nodes_workflow on public.workflow_nodes(workflow_id);

-- ─── Workflow Edges ─────────────────────────────────────────
create table public.workflow_edges (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references public.workflows(id) on delete cascade,
  source_node_id  uuid not null references public.workflow_nodes(id) on delete cascade,
  target_node_id  uuid not null references public.workflow_nodes(id) on delete cascade,
  label           text,
  created_at      timestamptz not null default now()
);

alter table public.workflow_edges enable row level security;

create policy "Users can manage own workflow edges"
  on public.workflow_edges for all
  using (
    exists (
      select 1 from public.workflows w
      where w.id = workflow_id and w.user_id = auth.uid()
    )
  );

create index idx_workflow_edges_workflow on public.workflow_edges(workflow_id);

-- ─── Workflow Runs ──────────────────────────────────────────
create table public.workflow_runs (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid not null references public.workflows(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'queued' check (status in ('queued', 'running', 'success', 'failed', 'cancelled')),
  started_at    timestamptz,
  completed_at  timestamptz,
  duration_ms   int,
  logs          text,
  output        jsonb,
  error         text,
  created_at    timestamptz not null default now()
);

alter table public.workflow_runs enable row level security;

create policy "Users can view own runs"
  on public.workflow_runs for select using (auth.uid() = user_id);

create policy "Users can insert own runs"
  on public.workflow_runs for insert with check (auth.uid() = user_id);

create index idx_workflow_runs_user on public.workflow_runs(user_id);
create index idx_workflow_runs_workflow on public.workflow_runs(workflow_id);
create index idx_workflow_runs_status on public.workflow_runs(status);

-- ─── Marketplace Listings ───────────────────────────────────
create table public.marketplace_listings (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid not null references public.workflows(id) on delete cascade,
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text not null,
  price         int not null default 0,
  currency      text not null default 'USD',
  category      text not null default 'Other',
  tags          text[] default '{}',
  usage_count   int not null default 0,
  rating_avg    float not null default 0,
  rating_count  int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.marketplace_listings enable row level security;

-- Public read for active listings
create policy "Anyone can view active listings"
  on public.marketplace_listings for select
  using (is_active = true);

-- Sellers manage own listings
create policy "Sellers can manage own listings"
  on public.marketplace_listings for all
  using (auth.uid() = seller_id);

create index idx_marketplace_category on public.marketplace_listings(category);
create index idx_marketplace_active on public.marketplace_listings(is_active);

-- ─── Ratings ────────────────────────────────────────────────
create table public.ratings (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.marketplace_listings(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  score       int not null check (score >= 1 and score <= 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique(listing_id, user_id)
);

alter table public.ratings enable row level security;

create policy "Anyone can view ratings"
  on public.ratings for select using (true);

create policy "Users can insert own ratings"
  on public.ratings for insert with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on public.ratings for update using (auth.uid() = user_id);

-- ─── Purchases ──────────────────────────────────────────────
create table public.purchases (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.marketplace_listings(id) on delete cascade,
  buyer_id    uuid not null references public.profiles(id) on delete cascade,
  price_paid  int not null,
  currency    text not null default 'USD',
  created_at  timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "Users can view own purchases"
  on public.purchases for select using (auth.uid() = buyer_id);

create policy "Users can insert own purchases"
  on public.purchases for insert with check (auth.uid() = buyer_id);

create index idx_purchases_buyer on public.purchases(buyer_id);

-- ─── Updated‑at Trigger ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workflows_updated_at before update on public.workflows
  for each row execute function public.set_updated_at();

create trigger marketplace_listings_updated_at before update on public.marketplace_listings
  for each row execute function public.set_updated_at();
