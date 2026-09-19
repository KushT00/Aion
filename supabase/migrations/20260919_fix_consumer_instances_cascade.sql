-- Fix: Add ON DELETE CASCADE to consumer_instances FKs that block user deletion.
-- These two FKs defaulted to NO ACTION, which prevents the cascade chain from
-- completing when deleteUser is called: auth.users -> profiles -> workflows/listings.

ALTER TABLE public.consumer_instances
  DROP CONSTRAINT IF EXISTS consumer_instances_workflow_id_fkey,
  ADD CONSTRAINT consumer_instances_workflow_id_fkey
    FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;

ALTER TABLE public.consumer_instances
  DROP CONSTRAINT IF EXISTS consumer_instances_listing_id_fkey,
  ADD CONSTRAINT consumer_instances_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE CASCADE;
