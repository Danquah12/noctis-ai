-- Noctis workflow persistence foundation.
-- This migration creates storage only. It does not enable task dispatch,
-- engine execution, or authorization. Application services must enforce
-- tenant isolation and use atomic claims before any worker is introduced.

CREATE TABLE IF NOT EXISTS noctis_workflows (
  workflow_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  plan_version TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'planned', 'ready', 'running', 'waiting_approval',
    'blocked', 'succeeded', 'failed', 'cancelled'
  )),
  request_summary TEXT NOT NULL DEFAULT '',
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS noctis_workflows_tenant_state_updated_idx
  ON noctis_workflows (tenant_id, state, updated_at DESC);

CREATE TABLE IF NOT EXISTS noctis_workflow_tasks (
  task_record_id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES noctis_workflows(workflow_id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  engine_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'pending', 'ready', 'running', 'waiting_approval',
    'blocked', 'succeeded', 'failed', 'skipped', 'cancelled'
  )),
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  approval_ref TEXT,
  max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 5),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  priority INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL,
  lease_owner TEXT,
  lease_token TEXT,
  lease_expires_at TIMESTAMPTZ,
  result JSONB,
  failure_code TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (workflow_id, task_id),
  CHECK (
    (lease_owner IS NULL AND lease_token IS NULL AND lease_expires_at IS NULL)
    OR
    (lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS noctis_workflow_tasks_ready_queue_idx
  ON noctis_workflow_tasks (state, priority DESC, available_at ASC, created_at ASC)
  WHERE state = 'ready';

CREATE INDEX IF NOT EXISTS noctis_workflow_tasks_workflow_state_idx
  ON noctis_workflow_tasks (workflow_id, state);

CREATE INDEX IF NOT EXISTS noctis_workflow_tasks_lease_expiry_idx
  ON noctis_workflow_tasks (lease_expires_at)
  WHERE lease_expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS noctis_workflow_attempts (
  attempt_id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES noctis_workflows(workflow_id) ON DELETE CASCADE,
  task_record_id TEXT NOT NULL REFERENCES noctis_workflow_tasks(task_record_id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 5),
  worker_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('succeeded', 'failed', 'timed_out', 'cancelled')),
  failure_code TEXT,
  failure_reason TEXT,
  output_summary TEXT,
  UNIQUE (task_record_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS noctis_workflow_attempts_workflow_started_idx
  ON noctis_workflow_attempts (workflow_id, started_at DESC);

CREATE TABLE IF NOT EXISTS noctis_workflow_events (
  event_id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES noctis_workflows(workflow_id) ON DELETE CASCADE,
  task_record_id TEXT REFERENCES noctis_workflow_tasks(task_record_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'worker', 'reviewer')),
  actor_id TEXT,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (workflow_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS noctis_workflow_events_workflow_time_idx
  ON noctis_workflow_events (workflow_id, occurred_at ASC);

CREATE INDEX IF NOT EXISTS noctis_workflow_events_task_time_idx
  ON noctis_workflow_events (task_record_id, occurred_at ASC);
