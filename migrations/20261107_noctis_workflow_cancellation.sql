-- Add cooperative workflow cancellation. Running work remains leased until its
-- executor acknowledges that it has stopped; an expired cancellation lease is
-- blocked for reconciliation and is never automatically retried.
ALTER TABLE noctis_workflows
  DROP CONSTRAINT IF EXISTS noctis_workflows_state_check;
ALTER TABLE noctis_workflows
  ADD CONSTRAINT noctis_workflows_state_check
  CHECK (state IN (
    'planned', 'ready', 'running', 'waiting_approval', 'blocked',
    'cancelling', 'succeeded', 'failed', 'cancelled'
  ));

ALTER TABLE noctis_workflows
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_requested_by TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE noctis_workflow_tasks
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS noctis_workflow_tasks_cancellation_idx
  ON noctis_workflow_tasks (workflow_id, cancellation_requested_at)
  WHERE cancellation_requested_at IS NOT NULL;
