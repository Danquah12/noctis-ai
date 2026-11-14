-- Noctis governed, versioned training datasets and reproducible training runs.
-- Existing knowledge pairs remain intact. New dataset snapshots are immutable and
-- contain only independently approved examples backed by approved, licensed sources.

ALTER TABLE vibe_training_pair
  ADD COLUMN IF NOT EXISTS tenant_id text;

CREATE INDEX IF NOT EXISTS vibe_training_pair_tenant_approval_idx
  ON vibe_training_pair (tenant_id, approval_status, domain, updated_at DESC);

CREATE TABLE IF NOT EXISTS noctis_training_dataset (
  dataset_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  name text NOT NULL,
  domain text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','deprecated','archived')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS noctis_training_dataset_version (
  dataset_version_id text PRIMARY KEY,
  dataset_id text NOT NULL REFERENCES noctis_training_dataset(dataset_id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  content_digest text NOT NULL CHECK (content_digest ~ '^sha256:[a-f0-9]{64}$'),
  item_count integer NOT NULL CHECK (item_count >= 0),
  train_count integer NOT NULL CHECK (train_count >= 0),
  validation_count integer NOT NULL CHECK (validation_count >= 0),
  test_count integer NOT NULL CHECK (test_count >= 0),
  split_seed text NOT NULL,
  approval_status text NOT NULL DEFAULT 'quarantined'
    CHECK (approval_status IN ('quarantined','approved','rejected','deprecated')),
  created_by text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  approval_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, version_number),
  CHECK (item_count = train_count + validation_count + test_count),
  CHECK (
    (approval_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR approval_status <> 'approved'
  )
);

CREATE TABLE IF NOT EXISTS noctis_training_dataset_member (
  dataset_version_id text NOT NULL REFERENCES noctis_training_dataset_version(dataset_version_id) ON DELETE RESTRICT,
  training_pair_id text NOT NULL REFERENCES vibe_training_pair(id) ON DELETE RESTRICT,
  source_id text NOT NULL REFERENCES noctis_learning_source(id) ON DELETE RESTRICT,
  split text NOT NULL CHECK (split IN ('train','validation','test')),
  pair_digest text NOT NULL CHECK (pair_digest ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dataset_version_id, training_pair_id)
);

CREATE INDEX IF NOT EXISTS noctis_training_dataset_member_split_idx
  ON noctis_training_dataset_member (dataset_version_id, split);

CREATE TABLE IF NOT EXISTS noctis_training_run (
  training_run_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  dataset_version_id text NOT NULL REFERENCES noctis_training_dataset_version(dataset_version_id) ON DELETE RESTRICT,
  method text NOT NULL CHECK (method IN ('sft','dpo','evaluation')),
  provider text NOT NULL,
  model_name text NOT NULL,
  model_revision text,
  code_commit text NOT NULL,
  config_digest text NOT NULL CHECK (config_digest ~ '^sha256:[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','succeeded','failed','cancelled','rejected')),
  requested_by text NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  result_digest text CHECK (result_digest IS NULL OR result_digest ~ '^sha256:[a-f0-9]{64}$'),
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (completed_at IS NULL OR started_at IS NOT NULL),
  CHECK (status <> 'succeeded' OR (completed_at IS NOT NULL AND result_digest IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS noctis_training_run_tenant_status_idx
  ON noctis_training_run (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS noctis_training_run_artifact (
  artifact_id text PRIMARY KEY,
  training_run_id text NOT NULL REFERENCES noctis_training_run(training_run_id) ON DELETE RESTRICT,
  artifact_type text NOT NULL CHECK (artifact_type IN ('checkpoint','adapter','metrics','logs','model_card','evaluation_report')),
  uri text NOT NULL,
  content_digest text NOT NULL CHECK (content_digest ~ '^sha256:[a-f0-9]{64}$'),
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (training_run_id, artifact_type, content_digest)
);

-- Dataset snapshots and their membership are append-only. Approval is recorded
-- on the version row; edits require creating a new version, not rewriting history.
CREATE OR REPLACE FUNCTION noctis_reject_training_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Noctis training dataset snapshots are immutable; create a new version';
  END IF;
  -- Permit only a one-time review decision. Dataset identity, content digest,
  -- split counts, seed, creator, and creation time are immutable.
  IF OLD.approval_status <> 'quarantined'
     OR NEW.approval_status NOT IN ('approved','rejected')
     OR NEW.dataset_version_id IS DISTINCT FROM OLD.dataset_version_id
     OR NEW.dataset_id IS DISTINCT FROM OLD.dataset_id
     OR NEW.version_number IS DISTINCT FROM OLD.version_number
     OR NEW.content_digest IS DISTINCT FROM OLD.content_digest
     OR NEW.item_count IS DISTINCT FROM OLD.item_count
     OR NEW.train_count IS DISTINCT FROM OLD.train_count
     OR NEW.validation_count IS DISTINCT FROM OLD.validation_count
     OR NEW.test_count IS DISTINCT FROM OLD.test_count
     OR NEW.split_seed IS DISTINCT FROM OLD.split_seed
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.approved_by IS NULL
     OR NEW.approved_at IS NULL
     OR NEW.approval_reason IS NULL THEN
    RAISE EXCEPTION 'Noctis dataset snapshot content is immutable; only a one-time review decision is allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS noctis_training_dataset_version_immutable ON noctis_training_dataset_version;
CREATE TRIGGER noctis_training_dataset_version_immutable
BEFORE UPDATE OR DELETE ON noctis_training_dataset_version
FOR EACH ROW EXECUTE FUNCTION noctis_reject_training_snapshot_mutation();

CREATE OR REPLACE FUNCTION noctis_reject_training_member_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Noctis training dataset membership is immutable; create a new version';
END;
$$;

DROP TRIGGER IF EXISTS noctis_training_dataset_member_immutable ON noctis_training_dataset_member;
CREATE TRIGGER noctis_training_dataset_member_immutable
BEFORE UPDATE OR DELETE ON noctis_training_dataset_member
FOR EACH ROW EXECUTE FUNCTION noctis_reject_training_member_mutation();

-- Learning audit history is append-only for ordinary application roles.
CREATE OR REPLACE FUNCTION noctis_reject_learning_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Noctis learning audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS noctis_learning_audit_immutable ON noctis_learning_audit;
CREATE TRIGGER noctis_learning_audit_immutable
BEFORE UPDATE OR DELETE ON noctis_learning_audit
FOR EACH ROW EXECUTE FUNCTION noctis_reject_learning_audit_mutation();
