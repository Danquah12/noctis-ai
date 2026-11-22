-- Noctis Deterministic RMF Knowledge Database & Compliance Record Schema
-- Option B Milestone: Federal RMF (NIST SP 800-37/53/53A/53B/171, CSF 2.0, FedRAMP, MITRE ATT&CK)
-- Compatible with Neon PostgreSQL and embedded PGLite.

-- 1. Authoritative source registry & versioned cryptographic provenance
create table if not exists rmf_source_documents (
  source_id text primary key,
  title text not null,
  issuer text not null,
  category text not null default 'authoritative_standard',
  official_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists rmf_source_versions (
  version_id text primary key,
  source_id text not null references rmf_source_documents (source_id) on delete cascade,
  version_label text not null,
  release_date date,
  sha256 text not null,
  supersedes_version_id text references rmf_source_versions (version_id),
  ingested_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists rmf_source_versions_source_idx on rmf_source_versions (source_id, ingested_at desc);

-- 2. RMF Lifecycle Steps (0-6) and official tasks
create table if not exists rmf_steps (
  step_number int primary key check (step_number >= 0 and step_number <= 6),
  step_code text not null unique,
  title text not null,
  governing_pub text not null,
  purpose text not null
);

create table if not exists rmf_tasks (
  task_id text primary key,
  step_number int not null references rmf_steps (step_number) on delete cascade,
  title text not null,
  primary_roles text[] not null default '{}',
  expected_outputs text[] not null default '{}',
  description text not null default ''
);

-- 3. Authoritative Controls, Enhancements, Baselines & ODPs
create table if not exists rmf_controls (
  control_id text primary key,
  family_id text not null,
  family_title text not null,
  title text not null,
  statement text not null default '',
  guidance text not null default '',
  withdrawn boolean not null default false,
  withdrawn_into text[] not null default '{}',
  related_controls text[] not null default '{}',
  source_version_id text references rmf_source_versions (version_id),
  updated_at timestamptz not null default now()
);

create index if not exists rmf_controls_family_idx on rmf_controls (family_id, control_id);
create index if not exists rmf_controls_fts_idx on rmf_controls using gin (
  to_tsvector('english', control_id || ' ' || title || ' ' || statement || ' ' || guidance)
);

create table if not exists rmf_control_enhancements (
  enhancement_id text primary key,
  parent_control_id text not null references rmf_controls (control_id) on delete cascade,
  title text not null,
  statement text not null default '',
  guidance text not null default '',
  withdrawn boolean not null default false,
  withdrawn_into text[] not null default '{}',
  source_version_id text references rmf_source_versions (version_id)
);

create index if not exists rmf_enhancements_parent_idx on rmf_control_enhancements (parent_control_id);

create table if not exists rmf_baselines (
  baseline_id text primary key,
  name text not null,
  impact_level text not null check (impact_level in ('LOW', 'MODERATE', 'HIGH', 'PRIVACY', 'CUI')),
  overlay_type text not null default 'federal_baseline',
  governing_source text not null
);

create table if not exists rmf_baseline_controls (
  baseline_id text not null references rmf_baselines (baseline_id) on delete cascade,
  control_id text not null,
  primary key (baseline_id, control_id)
);

create table if not exists rmf_control_parameters (
  param_id text not null,
  control_id text not null,
  baseline_id text not null default 'NIST_800_53B_CORE',
  label text not null default '',
  odp_value text not null default '',
  unit text not null default '',
  primary key (control_id, param_id, baseline_id)
);

-- 4. NIST SP 800-53A Assessment Objectives, Procedures & Crosswalk Graph
create table if not exists rmf_assessment_objectives (
  objective_id text primary key,
  control_id text not null,
  determination_statement text not null
);

create index if not exists rmf_objectives_control_idx on rmf_assessment_objectives (control_id);

create table if not exists rmf_assessment_procedures (
  procedure_id text primary key,
  control_id text not null,
  method text not null check (method in ('EXAMINE', 'INTERVIEW', 'TEST')),
  objects_text text not null default ''
);

create index if not exists rmf_procedures_control_idx on rmf_assessment_procedures (control_id, method);

create table if not exists rmf_crosswalks (
  edge_id text primary key,
  src_framework text not null,
  src_id text not null,
  dst_framework text not null,
  dst_id text not null,
  dst_name text not null default '',
  relation text not null default 'maps_to',
  provenance text not null default ''
);

create index if not exists rmf_crosswalks_src_idx on rmf_crosswalks (src_framework, src_id);
create index if not exists rmf_crosswalks_dst_idx on rmf_crosswalks (dst_framework, dst_id);

-- 5. Deterministic Compliance Rules Engine
create table if not exists rmf_deterministic_rules (
  rule_id text primary key,
  control_id text not null,
  rule_version text not null,
  baseline_id text not null default 'FEDRAMP_HIGH',
  title text not null,
  condition_spec jsonb not null,
  source_citation text not null,
  approved_by_human boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. Production System Compliance & Authorization Records (strictly separate from training examples)
create table if not exists rmf_systems (
  system_id text primary key,
  name text not null,
  boundary_description text not null default '',
  fips199_c text not null check (fips199_c in ('LOW', 'MODERATE', 'HIGH')),
  fips199_i text not null check (fips199_i in ('LOW', 'MODERATE', 'HIGH')),
  fips199_a text not null check (fips199_a in ('LOW', 'MODERATE', 'HIGH')),
  high_water_mark text not null check (high_water_mark in ('LOW', 'MODERATE', 'HIGH')),
  baseline_id text references rmf_baselines (baseline_id),
  created_at timestamptz not null default now()
);

create table if not exists rmf_system_components (
  component_id text primary key,
  system_id text not null references rmf_systems (system_id) on delete cascade,
  name text not null,
  component_type text not null,
  environment text not null default 'production',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists rmf_control_implementations (
  impl_id text primary key,
  system_id text not null references rmf_systems (system_id) on delete cascade,
  control_id text not null,
  implementation_status text not null check (implementation_status in ('implemented', 'partially_implemented', 'planned', 'alternative', 'not_applicable')),
  inheritance_type text not null check (inheritance_type in ('system_specific', 'inherited', 'hybrid')),
  narrative text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists rmf_evidence_records (
  evidence_id text primary key,
  system_id text references rmf_systems (system_id) on delete set null,
  control_id text not null,
  origin text not null,
  collected_at timestamptz not null,
  sha256 text not null,
  payload jsonb not null
);

create table if not exists rmf_assessment_findings (
  finding_id text primary key,
  system_id text references rmf_systems (system_id) on delete set null,
  rule_id text references rmf_deterministic_rules (rule_id),
  control_id text not null,
  objective_id text,
  evidence_id text references rmf_evidence_records (evidence_id),
  verdict text not null check (verdict in ('PASS', 'FAIL', 'INSUFFICIENT_EVIDENCE', 'NOT_APPLICABLE', 'MANUAL_REVIEW_REQUIRED')),
  severity text check (severity in ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
  rationale text not null,
  audit_hash text not null,
  evaluated_at timestamptz not null default now()
);

create table if not exists rmf_poam_items (
  poam_id text primary key,
  finding_id text references rmf_assessment_findings (finding_id) on delete set null,
  control_id text not null,
  weakness_name text not null,
  severity text not null check (severity in ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
  sla_days int not null,
  due_date date,
  remediation_plan text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed_verified', 'risk_accepted'))
);

create table if not exists rmf_authorization_records (
  auth_id text primary key,
  system_id text not null references rmf_systems (system_id) on delete cascade,
  decision text not null check (decision in ('ATO', 'ATO_WITH_CONDITIONS', 'IATT', 'DATO', 'CATO')),
  authorizing_official text not null,
  residual_risk_level text not null check (residual_risk_level in ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  conditions_summary text not null default ''
);

-- 7. Separate SFT Training Examples & Golden Evaluation Telemetry
create table if not exists rmf_training_examples (
  example_id text primary key,
  category text not null,
  source_version_id text references rmf_source_versions (version_id),
  prompt text not null,
  expected_response text not null,
  verifier_passed boolean not null default false,
  human_approved boolean not null default false,
  split text not null default 'train' check (split in ('train', 'val', 'eval_holdout')),
  created_at timestamptz not null default now()
);

create table if not exists rmf_evaluation_results (
  eval_id text primary key,
  model_id text not null,
  split text not null default 'eval_holdout',
  total_cases int not null,
  citation_accuracy numeric(5,2) not null,
  verdict_accuracy numeric(5,2) not null,
  hallucination_rate numeric(5,2) not null,
  details jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz not null default now()
);

-- Seed authoritative NIST SP 800-37 Rev. 2 Steps (0-6)
insert into rmf_steps (step_number, step_code, title, governing_pub, purpose) values
  (0, 'PREPARE', 'Step 0: Prepare', 'NIST SP 800-37 Rev. 2', 'Carry out essential organization- and system-level readiness activities before selecting controls.'),
  (1, 'CATEGORIZE', 'Step 1: Categorize', 'FIPS 199 / NIST SP 800-60', 'Determine potential adverse impact (Low, Moderate, High) on confidentiality, integrity, and availability.'),
  (2, 'SELECT', 'Step 2: Select', 'NIST SP 800-53B', 'Select, tailor, allocate, and document security/privacy controls based on categorization and overlays.'),
  (3, 'IMPLEMENT', 'Step 3: Implement', 'NIST SP 800-53 Rev. 5', 'Implement selected controls cleanly across system, common, and hybrid architectures and document in SSP.'),
  (4, 'ASSESS', 'Step 4: Assess', 'NIST SP 800-53A Rev. 5', 'Independently verify control effectiveness via Examine, Interview, and Test procedures to produce SAR.'),
  (5, 'AUTHORIZE', 'Step 5: Authorize', 'NIST SP 800-37 Rev. 2', 'Authorizing Official reviews SSP/SAR/POA&M package and renders formal risk acceptance decision (ATO/cATO/DATO).'),
  (6, 'MONITOR', 'Step 6: Monitor', 'NIST SP 800-137', 'Continuously track security posture, configuration drift, KEV/RA-5 scans, and POA&M SLA closure.')
on conflict (step_number) do nothing;
