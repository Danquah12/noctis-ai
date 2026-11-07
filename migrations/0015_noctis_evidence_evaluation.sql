-- Noctis evidence, retrieval-trace, and live-evaluation records.
-- Additive only. This migration does not fetch, ingest, or activate any source.

create table if not exists noctis_source_chunk (
  id text primary key,
  source_id text not null references noctis_learning_source(id) on delete restrict,
  ordinal integer not null check (ordinal >= 0),
  locator text not null,
  content_text text not null,
  content_hash text not null,
  token_estimate integer,
  created_at timestamptz not null default now(),
  unique (source_id, ordinal)
);

create index if not exists noctis_source_chunk_source_idx
  on noctis_source_chunk (source_id, ordinal);

create table if not exists noctis_retrieval_trace (
  id text primary key,
  request_id text not null,
  user_id text,
  domain text not null,
  query_hash text not null,
  source_id text references noctis_learning_source(id) on delete restrict,
  chunk_id text references noctis_source_chunk(id) on delete restrict,
  rank integer not null check (rank > 0),
  relevance_score numeric,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists noctis_retrieval_trace_request_idx
  on noctis_retrieval_trace (request_id, rank);

create table if not exists noctis_model_response_trace (
  id text primary key,
  request_id text not null,
  user_id text,
  provider text not null,
  model text not null,
  model_version text,
  prompt_hash text not null,
  response_hash text not null,
  retrieval_trace_ids text[] not null default '{}',
  fallback_used boolean not null default false,
  latency_ms integer,
  token_input integer,
  token_output integer,
  status text not null check (status in ('success', 'provider_error', 'timeout', 'fallback', 'abstained')),
  created_at timestamptz not null default now()
);

create index if not exists noctis_model_response_request_idx
  on noctis_model_response_trace (request_id, created_at desc);

create table if not exists noctis_evaluation_run (
  id text primary key,
  suite_version text not null,
  dataset_version text not null,
  evaluator_version text not null,
  model_provider text not null,
  model_name text not null,
  started_by text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_cases integer not null default 0,
  passed_cases integer not null default 0,
  failed_cases integer not null default 0,
  abstained_cases integer not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists noctis_evaluation_case_result (
  id text primary key,
  run_id text not null references noctis_evaluation_run(id) on delete cascade,
  case_id text not null,
  domain text not null,
  prompt_hash text not null,
  response_hash text,
  expected_decision text not null,
  actual_decision text,
  score numeric,
  passed boolean not null,
  failure_reason text,
  evidence jsonb not null default '[]'::jsonb,
  latency_ms integer,
  created_at timestamptz not null default now(),
  unique (run_id, case_id)
);

create index if not exists noctis_evaluation_case_domain_idx
  on noctis_evaluation_case_result (run_id, domain, passed);
