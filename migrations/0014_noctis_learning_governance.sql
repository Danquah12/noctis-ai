-- Noctis governed learning: additive, reversible metadata and review records.
-- Existing built-in seed pairs remain usable; user/model-taught legacy pairs are quarantined.

alter table vibe_training_pair
  add column if not exists approval_status text not null default 'quarantined',
  add column if not exists source_id text,
  add column if not exists source_locator text,
  add column if not exists source_hash text,
  add column if not exists license text,
  add column if not exists submitted_by text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approval_reason text;

alter table vibe_training_pair
  drop constraint if exists vibe_training_pair_approval_status_check;

alter table vibe_training_pair
  add constraint vibe_training_pair_approval_status_check
  check (approval_status in ('quarantined', 'approved', 'rejected', 'deprecated', 'legacy_review_required'));

-- Only repository-authored seed corpus entries are grandfathered as approved.
update vibe_training_pair
set approval_status = 'approved'
where model = 'vibe-seed'
  and approval_status = 'quarantined';

-- Previously user-taught / generated pairs were marked verified by legacy code.
-- Explicitly revoke that trust and quarantine them pending independent review.
update vibe_training_pair
set approval_status = 'quarantined',
    verified = false,
    approval_reason = 'Legacy user/model-taught record requires independent source review'
where model in ('user-taught', 'vibe-trained', 'api-trained');

create index if not exists vibe_training_pair_approval_domain_idx
  on vibe_training_pair (approval_status, domain, updated_at desc);

create table if not exists noctis_learning_source (
  id text primary key,
  canonical_uri text,
  title text not null,
  publisher text,
  domain text not null,
  jurisdiction text,
  source_version text,
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  content_hash text not null,
  license text,
  classification text not null default 'public',
  status text not null default 'quarantined'
    check (status in ('quarantined', 'approved', 'rejected', 'deprecated')),
  submitted_by text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists noctis_learning_source_hash_domain_idx
  on noctis_learning_source (content_hash, domain);

create table if not exists noctis_learning_claim (
  id text primary key,
  source_id text not null references noctis_learning_source(id) on delete restrict,
  source_locator text not null,
  extracted_text text not null,
  normalized_claim text,
  domain text not null,
  jurisdiction text,
  extraction_model text,
  extraction_version text,
  confidence numeric,
  status text not null default 'quarantined'
    check (status in ('quarantined', 'approved', 'rejected', 'deprecated')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now()
);

create index if not exists noctis_learning_claim_source_idx
  on noctis_learning_claim (source_id, status);

create table if not exists noctis_learning_audit (
  id text primary key,
  actor_id text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text,
  before_hash text,
  after_hash text,
  created_at timestamptz not null default now()
);

create index if not exists noctis_learning_audit_target_idx
  on noctis_learning_audit (target_type, target_id, created_at desc);
