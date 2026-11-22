-- Noctis RMF Intelligence Platform — Enterprise Expansion v2.0 (Additive Migration)
-- Strictly additive across dedicated schemas; preserves all existing public & rmf_* tables.
-- Compatible with Neon PostgreSQL and embedded PGLite.

create schema if not exists rmf;
create schema if not exists governance;
create schema if not exists assessment;
create schema if not exists monitoring;
create schema if not exists cyber;
create schema if not exists graph;
create schema if not exists agents;
create schema if not exists intelligence;
create schema if not exists training;
create schema if not exists security;

-- Additive tenant-aware anchors for v2 foreign-key integrity
create table if not exists rmf.baselines (
  id uuid primary key default gen_random_uuid(),
  baseline_key text not null unique,
  name text not null,
  impact_level text not null check (impact_level in ('LOW', 'MODERATE', 'HIGH', 'PRIVACY')),
  source_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists rmf.systems (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  system_key text not null,
  name text not null,
  boundary_description text not null default '',
  classification text not null default 'UNCLASSIFIED_FEDRAMP',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, system_key)
);

create table if not exists rmf.evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  system_id uuid not null,
  control_id text not null,
  origin text not null,
  sha256 char(64) not null,
  lifecycle_state text not null check (
    lifecycle_state in (
      'COLLECTED', 'QUARANTINED', 'VALIDATED', 'VERIFIED',
      'AVAILABLE_FOR_ASSESSMENT', 'RETAINED', 'EXPIRED'
    )
  ),
  collected_at timestamptz not null,
  expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  foreign key (tenant_id, system_id) references rmf.systems (tenant_id, id),
  unique (tenant_id, id)
);

-- 1. Governance & Authorization Package Workflow
create table if not exists governance.packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  system_id uuid not null,
  package_type text not null check (package_type in ('INITIAL', 'REAUTHORIZATION', 'ONGOING')),
  version integer not null default 1,
  status text not null default 'DRAFT' check (
    status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'EFFECTIVE', 'SUPERSEDED', 'CLOSED')
  ),
  baseline_id uuid not null references rmf.baselines (id),
  boundary_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, system_id) references rmf.systems (tenant_id, id),
  unique (tenant_id, id),
  unique (tenant_id, system_id, version)
);

create table if not exists governance.artifacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  package_id uuid not null,
  artifact_type text not null check (
    artifact_type in ('SSP', 'SAP', 'SAR', 'POAM', 'RISK_MEMO', 'AUTHORIZATION_LETTER', 'OTHER')
  ),
  version integer not null,
  object_key text not null,
  sha256 char(64) not null,
  oscal_model text,
  validation_status text not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, package_id) references governance.packages (tenant_id, id),
  unique (tenant_id, package_id, artifact_type, version)
);

create table if not exists governance.approval_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  package_id uuid not null,
  decision text not null check (decision in ('APPROVE', 'REJECT', 'REQUEST_CHANGES')),
  approver_subject text not null,
  approver_role text not null,
  reason text not null,
  decided_at timestamptz not null default now(),
  foreign key (tenant_id, package_id) references governance.packages (tenant_id, id)
);

create table if not exists governance.control_inheritance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  package_id uuid not null,
  provider text not null,
  consumer text not null,
  control_id text not null,
  responsibility text not null check (responsibility in ('INHERITED', 'SHARED', 'HYBRID', 'SYSTEM_SPECIFIC')),
  approval_status text not null default 'DRAFT',
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  foreign key (tenant_id, package_id) references governance.packages (tenant_id, id),
  unique (tenant_id, id)
);

create table if not exists governance.tailoring_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  baseline_id uuid not null references rmf.baselines (id),
  control_id text not null,
  action text not null check (action in ('ADD', 'EXCLUDE_SCOPING', 'OVERLAY', 'SET_ODP', 'COMPENSATING_CONTROL')),
  rationale text not null,
  source_citation text not null default '',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'EFFECTIVE', 'SUPERSEDED', 'CLOSED')),
  approver text,
  decided_at timestamptz,
  unique (tenant_id, id)
);

create table if not exists governance.authorization_conditions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  package_id uuid not null,
  condition_text text not null,
  owner text not null,
  due_date date,
  verification_status text not null default 'OPEN' check (verification_status in ('OPEN', 'VERIFIED', 'VIOLATED', 'WAIVED')),
  foreign key (tenant_id, package_id) references governance.packages (tenant_id, id),
  unique (tenant_id, id)
);

-- 2. Assessment & POA&M Operations
create table if not exists assessment.objective_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  package_id uuid not null,
  control_id text not null,
  objective_id text not null,
  assessor_subject text not null,
  evidence_id uuid,
  method text not null check (method in ('EXAMINE', 'INTERVIEW', 'TEST')),
  determination text not null check (determination in ('SATISFIED', 'OTHER_THAN_SATISFIED', 'NOT_APPLICABLE', 'INSUFFICIENT_EVIDENCE', 'NOT_TESTED')),
  evaluated_at timestamptz not null default now(),
  foreign key (tenant_id, package_id) references governance.packages (tenant_id, id),
  foreign key (tenant_id, evidence_id) references rmf.evidence (tenant_id, id),
  unique (tenant_id, id)
);

create table if not exists assessment.findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  objective_result_id uuid,
  control_id text not null,
  severity text not null check (severity in ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
  cause text not null,
  impact text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'REMEDIATED', 'RISK_ACCEPTED', 'FALSE_POSITIVE')),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, objective_result_id) references assessment.objective_results (tenant_id, id),
  unique (tenant_id, id)
);

create table if not exists assessment.poam_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  finding_id uuid not null,
  owner text not null,
  milestones jsonb not null default '[]'::jsonb,
  deadline date not null,
  closure_evidence_id uuid,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'CLOSED_VERIFIED', 'RISK_ACCEPTED')),
  foreign key (tenant_id, finding_id) references assessment.findings (tenant_id, id),
  foreign key (tenant_id, closure_evidence_id) references rmf.evidence (tenant_id, id),
  unique (tenant_id, id)
);

-- 3. Continuous Monitoring & Drift
create table if not exists monitoring.policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  metric text not null,
  scope text not null,
  cadence_hours integer not null,
  rule_version text not null,
  escalation_target text not null,
  unique (tenant_id, id)
);

create table if not exists monitoring.runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  policy_id uuid not null,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('SCHEDULED', 'RUNNING', 'SUCCEEDED', 'FAILED')),
  source_snapshot_hash char(64),
  foreign key (tenant_id, policy_id) references monitoring.policies (tenant_id, id),
  unique (tenant_id, id)
);

create table if not exists monitoring.drift_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  run_id uuid,
  expected_state jsonb not null,
  observed_state jsonb not null,
  affected_assets jsonb not null default '[]'::jsonb,
  detected_at timestamptz not null default now(),
  foreign key (tenant_id, run_id) references monitoring.runs (tenant_id, id),
  unique (tenant_id, id)
);

-- 4. Cyber Risk Intelligence
create table if not exists cyber.assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  system_id uuid not null,
  asset_key text not null,
  asset_type text not null,
  criticality text check (criticality in ('LOW', 'MODERATE', 'HIGH')),
  attributes jsonb not null default '{}'::jsonb,
  foreign key (tenant_id, system_id) references rmf.systems (tenant_id, id),
  unique (tenant_id, id),
  unique (tenant_id, system_id, asset_key)
);

create table if not exists cyber.vulnerabilities (
  id uuid primary key default gen_random_uuid(),
  vulnerability_key text not null unique,
  title text not null,
  published_at timestamptz,
  is_kev boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists cyber.asset_findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  asset_id uuid not null,
  vulnerability_id uuid not null references cyber.vulnerabilities (id),
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  status text not null check (status in ('OPEN', 'MITIGATED', 'FALSE_POSITIVE', 'ACCEPTED', 'CLOSED')),
  evidence_id uuid,
  foreign key (tenant_id, asset_id) references cyber.assets (tenant_id, id),
  foreign key (tenant_id, evidence_id) references rmf.evidence (tenant_id, id),
  unique (tenant_id, id)
);

create table if not exists cyber.attack_paths (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  path_nodes jsonb not null,
  graph_version text not null,
  exposure_facts jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table if not exists cyber.risk_scenarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  threat_description text not null,
  likelihood_model text not null,
  impact_model text not null,
  uncertainty_notes text not null,
  model_version text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table if not exists cyber.sbom_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  asset_id uuid not null,
  package_name text not null,
  version text not null,
  supplier text not null default '',
  sha256 char(64),
  license text not null default '',
  foreign key (tenant_id, asset_id) references cyber.assets (tenant_id, id),
  unique (tenant_id, id)
);

-- 5. Tenant-Scoped RMF Knowledge Graph
create table if not exists graph.nodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  node_type text not null,
  entity_id uuid not null,
  label text not null,
  attributes jsonb not null default '{}'::jsonb,
  unique (tenant_id, id),
  unique (tenant_id, node_type, entity_id)
);

create table if not exists graph.edges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source_node_id uuid not null,
  target_node_id uuid not null,
  relation_type text not null,
  provenance jsonb not null,
  valid_from timestamptz not null,
  valid_to timestamptz,
  foreign key (tenant_id, source_node_id) references graph.nodes (tenant_id, id),
  foreign key (tenant_id, target_node_id) references graph.nodes (tenant_id, id),
  check (valid_to is null or valid_to > valid_from)
);

create index if not exists graph_edges_source_idx on graph.edges (tenant_id, source_node_id);
create index if not exists graph_edges_target_idx on graph.edges (tenant_id, target_node_id);
create index if not exists graph_edges_relation_idx on graph.edges (tenant_id, relation_type);

-- 6. Bounded Agentic Workforce
create table if not exists agents.runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  agent_name text not null,
  task_name text not null,
  model_id text not null,
  tools_used jsonb not null default '[]'::jsonb,
  inputs jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  status text not null check (status in ('RUNNING', 'DRAFT_READY', 'ESCALATED_FOR_HUMAN_REVIEW', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table if not exists agents.review_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  run_id uuid not null,
  reviewer_subject text not null,
  outcome text not null check (outcome in ('APPROVED', 'REJECTED', 'REQUEST_CHANGES')),
  reason text not null,
  decided_at timestamptz not null default now(),
  foreign key (tenant_id, run_id) references agents.runs (tenant_id, id),
  unique (tenant_id, id)
);

-- 7. Policy Intelligence & Reproducible Explanations
create table if not exists intelligence.policy_diffs (
  id uuid primary key default gen_random_uuid(),
  old_version text not null,
  new_version text not null,
  changes jsonb not null,
  impact_summary jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now()
);

create table if not exists intelligence.explanation_bundles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  evaluation_ref text not null,
  source_hashes jsonb not null,
  rule_trace jsonb not null,
  canonical_sha256 char(64) not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

-- 8. Training Feedback & Security Audit Ledger
create table if not exists training.feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  original_output text not null,
  correction text not null,
  reviewer_subject text not null,
  human_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table if not exists training.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  manifest jsonb not null,
  split text not null check (split in ('train', 'val', 'eval_holdout')),
  hashes jsonb not null,
  approved_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists security.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  actor_subject text not null,
  action text not null,
  target_ref text not null,
  before_hash char(64),
  after_hash char(64) not null,
  recorded_at timestamptz not null default now()
);
