-- Noctis Universal Problem Solver (NUPS) & 40-Engine Master Capability Matrix
-- Additive migration extending `enterprise` schema.

CREATE TABLE IF NOT EXISTS enterprise.nups_runs (
  id TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  classified_engines_json JSONB NOT NULL,
  domains_count INTEGER NOT NULL,
  validation_status TEXT NOT NULL,
  conflicts_count INTEGER NOT NULL DEFAULT 0,
  audit_sha256 TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  actor_id TEXT NOT NULL DEFAULT 'system',
  tenant_id TEXT NOT NULL DEFAULT 'tenant:public-sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_nups_runs_created_at
  ON enterprise.nups_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise.nups_capability_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  ndkrs_domain TEXT NOT NULL,
  modules_json JSONB NOT NULL,
  sources_json JSONB NOT NULL,
  rules_json JSONB NOT NULL,
  apis_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
