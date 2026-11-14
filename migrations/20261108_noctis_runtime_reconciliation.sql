-- Noctis M3 runtime execution ledger, quarantine, and append-only audit storage.
-- Additive storage only: this does not connect a cloud provider, launch workloads,
-- grant cleanup authority, or establish production database access controls.

CREATE TABLE IF NOT EXISTS noctis_runtime_executions (
  runtime_execution_record_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL CHECK (length(trim(provider_id)) > 0),
  idempotency_key TEXT NOT NULL CHECK (idempotency_key ~ '^noctis:[0-9a-f]{64}$'),
  execution_intent_id TEXT NOT NULL CHECK (length(trim(execution_intent_id)) > 0),
  tenant_id TEXT NOT NULL CHECK (length(trim(tenant_id)) > 0),
  workload_id TEXT NOT NULL CHECK (length(trim(workload_id)) > 0),
  workload_digest TEXT NOT NULL CHECK (workload_digest ~ '^sha256:[0-9a-f]{64}$'),
  runtime_id TEXT NOT NULL CHECK (length(trim(runtime_id)) > 0),
  execution_id TEXT,
  resource_limits JSONB NOT NULL CHECK (jsonb_typeof(resource_limits) = 'object'),
  state TEXT NOT NULL CHECK (state IN (
    'intent_recorded', 'launch_requested', 'launch_unknown',
    'running', 'termination_requested', 'cleanup_incomplete',
    'stopped', 'reaped', 'failed'
  )),
  lease_expires_at TIMESTAMPTZ NOT NULL,
  last_reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (provider_id, idempotency_key),
  UNIQUE (provider_id, execution_id)
);

CREATE INDEX IF NOT EXISTS noctis_runtime_executions_reconcile_idx
  ON noctis_runtime_executions (provider_id, state, lease_expires_at);
CREATE INDEX IF NOT EXISTS noctis_runtime_executions_tenant_idx
  ON noctis_runtime_executions (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS noctis_runtime_quarantine (
  quarantine_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL CHECK (length(trim(provider_id)) > 0),
  execution_id TEXT NOT NULL CHECK (length(trim(execution_id)) > 0),
  idempotency_key TEXT,
  observed_tenant_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN (
    'NO_EXPECTED_RECORD', 'IDENTITY_MISMATCH', 'DUPLICATE_IDEMPOTENCY_KEY',
    'INVALID_OBSERVATION', 'PROVIDER_CONFLICT'
  )),
  observed_record JSONB NOT NULL CHECK (jsonb_typeof(observed_record) = 'object'),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'cleanup_approved')),
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  resolution_ref TEXT,
  resolved_at TIMESTAMPTZ,
  UNIQUE (provider_id, execution_id),
  CHECK ((status IN ('resolved', 'cleanup_approved')) OR resolved_at IS NULL)
);

CREATE INDEX IF NOT EXISTS noctis_runtime_quarantine_open_idx
  ON noctis_runtime_quarantine (provider_id, first_seen_at)
  WHERE status IN ('open', 'investigating');

CREATE TABLE IF NOT EXISTS noctis_runtime_audit_events (
  audit_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'admission_accepted', 'launch_requested', 'launch_succeeded',
    'launch_failed', 'termination_requested', 'termination_completed',
    'cleanup_incomplete', 'inventory_reconciled', 'resource_quarantined',
    'cleanup_candidate_created', 'cleanup_authorized'
  )),
  occurred_at TIMESTAMPTZ NOT NULL,
  request_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  workload_id TEXT NOT NULL,
  workload_digest TEXT NOT NULL CHECK (workload_digest ~ '^sha256:[0-9a-f]{64}$'),
  provider_id TEXT NOT NULL,
  runtime_id TEXT,
  execution_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'requested', 'succeeded', 'failed', 'incomplete', 'observed')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX IF NOT EXISTS noctis_runtime_audit_tenant_time_idx
  ON noctis_runtime_audit_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS noctis_runtime_audit_execution_idx
  ON noctis_runtime_audit_events (provider_id, execution_id, audit_sequence);

-- Guard against accidental mutation through ordinary application SQL.
-- A database owner/superuser can still alter the trigger or table; production
-- tamper evidence requires separate roles, external anchoring, and controls.
CREATE OR REPLACE FUNCTION noctis_reject_runtime_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Noctis runtime audit events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS noctis_runtime_audit_no_update ON noctis_runtime_audit_events;
CREATE TRIGGER noctis_runtime_audit_no_update
  BEFORE UPDATE OR DELETE ON noctis_runtime_audit_events
  FOR EACH ROW EXECUTE FUNCTION noctis_reject_runtime_audit_mutation();
