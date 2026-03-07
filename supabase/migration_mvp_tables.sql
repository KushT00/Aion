-- ============================================================
-- AION — MVP Migration: Create Missing Tables
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- ============================================================
-- This creates the tables needed for Marketplace + Creator Dashboard
-- Skip any that already exist (the IF NOT EXISTS handles it safely)

-- ─── 1. Marketplace Listings ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid not null references public.workflows(id) on delete cascade,
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text not null,
  price         int not null default 0,        -- price in CENTS (e.g. 2900 = $29)
  currency      text not null default 'USD',
  category      text not null default 'Utility',
  tags          text[] default '{}',
  usage_count   int not null default 0,
  rating_avg    float not null default 0,
  rating_count  int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── 2. Ratings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ratings (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.marketplace_listings(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  score       int not null check (score >= 1 and score <= 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique(listing_id, user_id)
);

-- ─── 3. Purchases ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.marketplace_listings(id) on delete cascade,
  buyer_id    uuid not null references public.profiles(id) on delete cascade,
  price_paid  int not null,                    -- in CENTS
  currency    text not null default 'USD',
  created_at  timestamptz not null default now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- ─── Marketplace Listings RLS ───────────────────────────────
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings (needed for marketplace browse)
CREATE POLICY "Anyone can view active listings"
  ON public.marketplace_listings FOR SELECT
  USING (is_active = true);

-- Sellers can manage their own listings (insert/update/delete)
CREATE POLICY "Sellers can manage own listings"
  ON public.marketplace_listings FOR ALL
  USING (auth.uid() = seller_id);

-- ─── Ratings RLS ────────────────────────────────────────────
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT USING (true);

CREATE POLICY "Users can insert own ratings"
  ON public.ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.ratings FOR UPDATE USING (auth.uid() = user_id);

-- ─── Purchases RLS ─────────────────────────────────────────
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Users can insert own purchases"
  ON public.purchases FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- IMPORTANT: Sellers also need to see purchases of their listings (for dashboard stats)
CREATE POLICY "Sellers can view purchases of their listings"
  ON public.purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings ml
      WHERE ml.id = listing_id AND ml.seller_id = auth.uid()
    )
  );


-- ============================================================
-- INDEXES (for query performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_active ON public.marketplace_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_workflow ON public.marketplace_listings(workflow_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_created ON public.marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON public.purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_listing ON public.purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_ratings_listing ON public.ratings(listing_id);


-- ============================================================
-- AUTO-UPDATE TRIGGER (updated_at)
-- ============================================================

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Trigger for marketplace_listings
DROP TRIGGER IF EXISTS marketplace_listings_updated_at ON public.marketplace_listings;
CREATE TRIGGER marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- ADDITIONAL RLS: Let the publish API read workflows it needs
-- ============================================================
-- The publish API needs to read any workflow (to verify ownership)
-- This is safe because the API already checks user_id === auth.uid()

-- Allow reading published workflows for marketplace detail pages
CREATE POLICY "Anyone can view published workflows"
  ON public.workflows FOR SELECT
  USING (status = 'published');

-- Allow reading nodes of published workflows (for required integrations detection)
CREATE POLICY "Anyone can view nodes of published workflows"
  ON public.workflow_nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = workflow_id AND w.status = 'published'
    )
  );
