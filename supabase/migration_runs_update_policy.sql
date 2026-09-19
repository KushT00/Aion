-- Migration: Allow users to update their own workflow run records
-- This is needed so the builder can update a run from "running" → "success"/"failed"
-- after execution completes, including writing duration_ms and logs.

CREATE POLICY "Users can update own runs"
  ON public.workflow_runs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
