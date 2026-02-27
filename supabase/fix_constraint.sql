-- Run this in your Supabase SQL Editor to update the constraint matches the application code
ALTER TABLE public.workflow_nodes DROP CONSTRAINT IF EXISTS workflow_nodes_type_check;

ALTER TABLE public.workflow_nodes ADD CONSTRAINT workflow_nodes_type_check 
CHECK (type IN (
  'input', 
  'trigger', 
  'ai_action', 
  'api_action', 
  'social_action', 
  'logic_gate', 
  'data_tool', 
  'output'
));
