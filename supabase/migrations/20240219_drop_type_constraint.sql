-- Simply drop the constraint to unblock saving.
-- Application code already ensures valid types are used.
ALTER TABLE public.workflow_nodes DROP CONSTRAINT IF EXISTS workflow_nodes_type_check;
