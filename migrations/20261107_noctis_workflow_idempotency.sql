-- Add request fingerprints for tenant-scoped idempotent workflow creation.
-- Existing workflows receive an empty fingerprint and are conservatively treated
-- as non-replayable until explicitly migrated; no existing records are rewritten.
ALTER TABLE noctis_workflows
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT NOT NULL DEFAULT '';

ALTER TABLE noctis_workflows
  DROP CONSTRAINT IF EXISTS noctis_workflows_request_fingerprint_check;

ALTER TABLE noctis_workflows
  ADD CONSTRAINT noctis_workflows_request_fingerprint_check
  CHECK (request_fingerprint = '' OR request_fingerprint ~ '^[0-9a-f]{64}$');
