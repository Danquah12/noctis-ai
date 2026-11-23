-- Noctis Universal Assistant v1.0 & ChatGPT-to-Noctis Parity Schema (Migration 0022)
-- Adds 6 enterprise tables bringing tracked schemas to 61 tables:
--   enterprise.chatgpt_parity_matrix
--   enterprise.custom_assistants
--   enterprise.workspaces
--   enterprise.workspace_documents
--   enterprise.scheduled_tasks
--   enterprise.workflow_runs
--   enterprise.answer_passports
--   enterprise.benchmark_runs
--   enterprise.forge_projects
--   enterprise.forge_revisions

CREATE TABLE IF NOT EXISTS enterprise.chatgpt_parity_matrix (
  capability_number INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  capability_name TEXT NOT NULL,
  noctis_requirement TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  source_modules_json JSONB NOT NULL,
  backend_service TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  test_suite TEXT NOT NULL,
  demo_note TEXT NOT NULL,
  dev_estimate TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.custom_assistants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  specialist_engine TEXT NOT NULL,
  system_instructions TEXT NOT NULL,
  enabled_tools_json JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  members_json JSONB NOT NULL,
  project_instructions TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.workspace_documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  doc_format TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  content_markdown TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_workspace_docs_ws
  ON enterprise.workspace_documents (workspace_id, revision_number DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS enterprise.scheduled_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  cron_or_iso TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_output_summary TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL,
  requires_human_approval BOOLEAN NOT NULL DEFAULT true,
  approved_by TEXT,
  steps_json JSONB NOT NULL,
  audit_sha256 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.answer_passports (
  passport_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  inputs_json JSONB NOT NULL,
  answer_summary TEXT NOT NULL,
  source_versions_json JSONB NOT NULL,
  calculation_trace_json JSONB NOT NULL,
  epistemic_confidence NUMERIC(4,2) NOT NULL,
  verification_status TEXT NOT NULL,
  replay_sha256 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.benchmark_runs (
  run_id TEXT PRIMARY KEY,
  total_tasks INTEGER NOT NULL,
  passed_tasks INTEGER NOT NULL,
  partial_tasks INTEGER NOT NULL,
  failed_tasks INTEGER NOT NULL,
  pass_rate_pct NUMERIC(5,2) NOT NULL,
  avg_latency_ms INTEGER NOT NULL,
  category_scores_json JSONB NOT NULL,
  executed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.forge_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stack TEXT NOT NULL,
  prompt TEXT NOT NULL,
  regulated_domain TEXT NOT NULL DEFAULT 'NONE',
  status TEXT NOT NULL DEFAULT 'GENERATED',
  current_revision INTEGER NOT NULL DEFAULT 1,
  spec_json JSONB NOT NULL,
  files_json JSONB NOT NULL,
  qa_security_json JSONB NOT NULL,
  deploy_state_json JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise.forge_revisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  change_summary TEXT NOT NULL,
  files_json JSONB NOT NULL,
  spec_sha256 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_forge_revisions_proj
  ON enterprise.forge_revisions (project_id, revision_number DESC);
