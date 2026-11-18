-- Durable, provider-scoped runtime reconciliation snapshots and decisions.
-- These are operational records, not cleanup authorization or tenant authority.

CREATE TABLE IF NOT EXISTS noctis_runtime_reconciliation_runs (
  reconciliation_run_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL CHECK (length(trim(provider_id)) > 0),
  snapshot_id TEXT NOT NULL CHECK (length(trim(snapshot_id)) > 0),
  snapshot_digest TEXT NOT NULL CHECK (snapshot_digest ~ '^sha256:[0-9a-f]{64}$'),
  observed_count INTEGER NOT NULL CHECK (observed_count >= 0),
  page_count INTEGER NOT NULL CHECK (page_count > 0),
  decision_count INTEGER NOT NULL CHECK (decision_count >= 0),
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, snapshot_id)
);

CREATE INDEX IF NOT EXISTS noctis_runtime_reconciliation_runs_recent_idx
  ON noctis_runtime_reconciliation_runs (provider_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS noctis_runtime_reconciliation_decisions (
  reconciliation_decision_id TEXT PRIMARY KEY,
  reconciliation_run_id TEXT NOT NULL REFERENCES noctis_runtime_reconciliation_runs(reconciliation_run_id),
  provider_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  decision_index INTEGER NOT NULL CHECK (decision_index >= 0),
  decision_kind TEXT NOT NULL CHECK (decision_kind IN (
    'tracked', 'missing_expected', 'stale_expected', 'quarantine_unknown', 'quarantine_mismatch'
  )),
  execution_id TEXT,
  idempotency_key TEXT,
  tenant_id TEXT,
  workload_id TEXT,
  reason TEXT,
  decision_payload JSONB NOT NULL CHECK (jsonb_typeof(decision_payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reconciliation_run_id, decision_index),
  UNIQUE (provider_id, snapshot_id, reconciliation_decision_id)
);

CREATE INDEX IF NOT EXISTS noctis_runtime_reconciliation_decisions_kind_idx
  ON noctis_runtime_reconciliation_decisions (provider_id, decision_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS noctis_runtime_reconciliation_decisions_execution_idx
  ON noctis_runtime_reconciliation_decisions (provider_id, execution_id)
  WHERE execution_id IS NOT NULL;
