-- 0017_ndkrs_core.sql
-- Noctis Deterministic Knowledge and Reasoning System (NDKRS) — Phase 1 Additive Data Plane
-- Compatible with BOTH Managed Neon PostgreSQL and embedded PGLite WASM.
-- NOTE: Neon-specific `pgvector` HNSW extension/column is enabled safely by `scripts/enable-pgvector-neon.mjs`.

CREATE SCHEMA IF NOT EXISTS ndkrs;

-- 1. Authoritative Knowledge Sources (with trust tier, SHA-256 integrity, and expiry)
CREATE TABLE IF NOT EXISTS ndkrs.knowledge_sources (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  source_uri TEXT NOT NULL,
  trust_tier TEXT NOT NULL CHECK (trust_tier IN ('AUTHORITATIVE_GOV', 'CLINICAL_GUIDELINE', 'PEER_REVIEWED', 'INTERNAL_SPEC', 'USER_SUBMITTED')),
  version TEXT NOT NULL,
  effective_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  content_sha256 TEXT NOT NULL,
  storage_ref TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  ingested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ndkrs_sources_domain_status
  ON ndkrs.knowledge_sources (domain, status);

-- 2. Verified Knowledge Records (strictly separate from LLM generation and unverified chat cache)
CREATE TABLE IF NOT EXISTS ndkrs.knowledge_records (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES ndkrs.knowledge_sources(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  structured_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  citation_label TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (verification_status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  record_sha256 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ndkrs_records_domain_status
  ON ndkrs.knowledge_records (domain, verification_status);

CREATE INDEX IF NOT EXISTS idx_ndkrs_records_canonical
  ON ndkrs.knowledge_records (domain, canonical_key);

CREATE INDEX IF NOT EXISTS idx_ndkrs_records_fts
  ON ndkrs.knowledge_records USING gin (
    to_tsvector('english', canonical_key || ' ' || title || ' ' || summary)
  );

-- 3. Heading-Aware Document Chunks + Normalized 384-Dim Embeddings (pgvector HNSW added on Neon)
CREATE TABLE IF NOT EXISTS ndkrs.knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES ndkrs.knowledge_sources(id) ON DELETE CASCADE,
  record_id TEXT REFERENCES ndkrs.knowledge_records(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  chunk_index INT NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  token_count INT NOT NULL DEFAULT 0,
  embedding_model TEXT NOT NULL,
  embedding_dims INT NOT NULL DEFAULT 384,
  embedding_json JSONB NOT NULL,
  content_sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ndkrs_chunks_domain
  ON ndkrs.knowledge_chunks (domain, record_id);

CREATE INDEX IF NOT EXISTS idx_ndkrs_chunks_fts
  ON ndkrs.knowledge_chunks USING gin (
    to_tsvector('english', coalesce(heading, '') || ' ' || content)
  );

-- 4. Executable Deterministic Rules Registry
CREATE TABLE IF NOT EXISTS ndkrs.deterministic_rules (
  rule_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT NOT NULL,
  authority_citation TEXT NOT NULL,
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  executor_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (status IN ('PENDING_REVIEW', 'VERIFIED', 'DEPRECATED')),
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Anti-Poisoning Dual-Control Human Review Queue
CREATE TABLE IF NOT EXISTS ndkrs.review_queue (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  proposed_payload JSONB NOT NULL,
  proposed_by TEXT NOT NULL,
  proposed_by_type TEXT NOT NULL,
  source_uri TEXT,
  allowlist_verified BOOLEAN NOT NULL DEFAULT false,
  contradiction_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  reviewer_id TEXT,
  reviewer_role TEXT,
  reviewer_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ndkrs_review_queue_status
  ON ndkrs.review_queue (status, created_at DESC);

-- 6. Cryptographically HMAC-Signed Independent Validation Certificates
CREATE TABLE IF NOT EXISTS ndkrs.validation_certificates (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  request_id TEXT NOT NULL,
  validator_version TEXT NOT NULL,
  source_input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('APPROVED', 'FAIL_CLOSED')),
  gates_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  violations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  hmac_signature TEXT NOT NULL,
  key_mode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ndkrs_certs_domain_created
  ON ndkrs.validation_certificates (domain, created_at DESC);

-- 7. Sanitized Knowledge Gap & Failure Registry (Zero PHI)
CREATE TABLE IF NOT EXISTS ndkrs.knowledge_gaps (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  query_hash TEXT NOT NULL UNIQUE,
  sanitized_topic TEXT NOT NULL,
  failure_reason TEXT NOT NULL,
  validator_rule_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  occurrences INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ndkrs_gaps_status
  ON ndkrs.knowledge_gaps (status, last_seen_at DESC);

-- 8. Raw Object Blob Reference Store (supports external Vercel Blob / S3 URLs or SQL fallback)
CREATE TABLE IF NOT EXISTS ndkrs.object_blobs (
  blob_id TEXT PRIMARY KEY,
  storage_provider TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INT NOT NULL,
  sha256 TEXT NOT NULL,
  external_url TEXT,
  content_base64 TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Distributed Postgres Rate-Limit Buckets (when Upstash Redis is not configured)
CREATE TABLE IF NOT EXISTS ndkrs.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_start BIGINT NOT NULL,
  hit_count INT NOT NULL DEFAULT 1,
  expires_at BIGINT NOT NULL
);

-- 10. Isolated AES-256-GCM Encrypted Clinical Enclave Records
CREATE TABLE IF NOT EXISTS ndkrs.clinical_enclave_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  encrypted_payload_b64 TEXT NOT NULL,
  iv_b64 TEXT NOT NULL,
  auth_tag_b64 TEXT NOT NULL,
  key_version TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ndkrs_enclave_tenant_encounter
  ON ndkrs.clinical_enclave_records (tenant_id, encounter_id);

-- Additive Feature Flags (preserving all existing flags)
INSERT INTO feature_flag (key, label, state, pct) VALUES
  ('ndkrs_enabled', 'NDKRS Core', 'on', 100),
  ('ndkrs_hybrid_rag', 'NDKRS Hybrid RAG', 'on', 100),
  ('ndkrs_fact_lock', 'NDKRS Fact-Lock Validator', 'on', 100),
  ('ndkrs_governance_ui', 'NDKRS Governance Console', 'on', 100),
  ('ndkrs_clinical_enclave', 'NDKRS AES-GCM Clinical Enclave', 'on', 100)
ON CONFLICT (key) DO NOTHING;
