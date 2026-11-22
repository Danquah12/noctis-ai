-- 0016_rmf_v2_runtime_records.sql
-- Additive tenant-scoped runtime artifact store and hash-chained audit ledger
-- for Noctis RMF Intelligence Platform v2.0 (works identically on Neon Postgres and PGLite).

CREATE SCHEMA IF NOT EXISTS rmf;

CREATE TABLE IF NOT EXISTS rmf.v2_artifacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  system_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  payload JSONB NOT NULL,
  payload_sha256 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rmf_v2_artifacts_tenant_type_created
  ON rmf.v2_artifacts (tenant_id, artifact_type, created_at DESC);

CREATE TABLE IF NOT EXISTS rmf.v2_audit_ledger (
  seq BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  artifact_id TEXT,
  prev_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  detail JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rmf_v2_audit_ledger_tenant_seq
  ON rmf.v2_audit_ledger (tenant_id, seq DESC);
