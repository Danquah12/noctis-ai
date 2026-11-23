-- 0018_enterprise_governance.sql
-- Noctis Enterprise Intelligence Platform — Governance, Custody, Custody Chain, Eval Lab & Command Center Persistence
-- Compatible with BOTH Managed Neon PostgreSQL and embedded PGLite WASM.

CREATE SCHEMA IF NOT EXISTS enterprise;

-- 1. Independent Verification Engine telemetry (Passed, Repaired, Blocked, Failed outputs)
CREATE TABLE IF NOT EXISTS enterprise.verification_events (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'REPAIRED', 'FAIL_CLOSED_BLOCK', 'FAIL')),
  rules_checked INT NOT NULL DEFAULT 0,
  violations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_sha256 TEXT NOT NULL,
  latency_ms INT NOT NULL DEFAULT 0,
  actor_id TEXT NOT NULL DEFAULT 'system',
  tenant_id TEXT NOT NULL DEFAULT 'tenant:public-sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ent_verif_domain_status_created
  ON enterprise.verification_events (domain, status, created_at DESC);

-- 2. Controlled Autonomous Agent Proposals (Human-in-the-Loop Authorization Queue)
CREATE TABLE IF NOT EXISTS enterprise.agent_proposals (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  risk_tier TEXT NOT NULL DEFAULT 'HIGH',
  classification_level TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  rationale TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING_HUMAN_AUTH', 'APPROVED', 'DENIED', 'BLOCKED_POLICY')),
  requested_by TEXT NOT NULL,
  reviewed_by TEXT,
  reviewer_role TEXT,
  review_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ent_proposals_status_created
  ON enterprise.agent_proposals (status, created_at DESC);

-- 3. Hash-Chained Autonomous Agent Tool & Action Activity Ledger
CREATE TABLE IF NOT EXISTS enterprise.agent_activity (
  seq BIGSERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'tenant:public-sandbox',
  decision TEXT NOT NULL,
  policy_reason TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ent_activity_agent_seq
  ON enterprise.agent_activity (agent_id, seq DESC);

-- 4. Digital Evidence Chain of Custody (NIST SP 800-86 / FRE 901/902 Hash-Chained Artifacts)
CREATE TABLE IF NOT EXISTS enterprise.custody_events (
  seq BIGSERIAL PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  custody_state TEXT NOT NULL,
  custodian_id TEXT NOT NULL,
  custodian_role TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'tenant:public-sandbox',
  artifact_sha256 TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ent_custody_artifact_seq
  ON enterprise.custody_events (artifact_id, seq ASC);

-- 5. Noctis AI Evaluation Laboratory Regression Runs
CREATE TABLE IF NOT EXISTS enterprise.eval_runs (
  id TEXT PRIMARY KEY,
  suite_name TEXT NOT NULL,
  total_cases INT NOT NULL DEFAULT 0,
  passed_cases INT NOT NULL DEFAULT 0,
  failed_cases INT NOT NULL DEFAULT 0,
  accuracy_pct NUMERIC NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  results_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  run_sha256 TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ent_eval_runs_created
  ON enterprise.eval_runs (created_at DESC);

-- 6. Policy-as-Code Compiled Rule Bundles
CREATE TABLE IF NOT EXISTS enterprise.policy_bundles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  authority_source TEXT NOT NULL,
  rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  bundle_sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
