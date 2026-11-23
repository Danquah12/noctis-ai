-- Noctis Ultimate Master Capability Catalog v1.0 (260 Capabilities)
-- Adds registry traceability, consent/purpose-scoped user memory (#12/#257),
-- model registry & canary rollback gates (#30/#35), and dynamic defect-to-regression factory (#255).

CREATE TABLE IF NOT EXISTS enterprise.catalog_260_registry (
  item_number INTEGER PRIMARY KEY,
  division_code TEXT NOT NULL,
  division_name TEXT NOT NULL,
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  gap_action TEXT NOT NULL,
  modules_json JSONB NOT NULL,
  api_endpoint TEXT,
  boundary_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.user_memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  content_redacted TEXT NOT NULL,
  consent_granted BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  content_sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_user_memory_user
  ON enterprise.user_memory (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise.model_registry (
  model_id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  eval_accuracy_pct NUMERIC(5,2) NOT NULL,
  canary_traffic_pct INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  rollback_target TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.dynamic_regression_tests (
  id TEXT PRIMARY KEY,
  defect_source TEXT NOT NULL,
  domain TEXT NOT NULL,
  prompt_sample TEXT NOT NULL,
  must_include_json JSONB NOT NULL,
  must_not_include_json JSONB NOT NULL,
  last_status TEXT NOT NULL DEFAULT 'CREATED',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
