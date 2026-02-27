create table public.workflow_memory (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for faster session lookups
create index idx_workflow_memory_session_id on public.workflow_memory(session_id);
