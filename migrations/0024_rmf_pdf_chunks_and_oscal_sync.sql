-- Full Verbatim NIST SP / FIPS PDF Chunk Vector+FTS Index & Official OSCAL Digest Sync Log
-- Safe on both Neon Postgres (pgvector 0.8.x) and embedded PGLite WASM.

CREATE TABLE IF NOT EXISTS rmf_pdf_chunks (
  chunk_id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES rmf_source_documents (source_id) ON DELETE CASCADE,
  doc_number text NOT NULL,
  page_start int NOT NULL,
  page_end int NOT NULL,
  section_heading text NOT NULL DEFAULT '',
  content text NOT NULL,
  content_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rmf_pdf_chunks_source_idx
  ON rmf_pdf_chunks (source_id, page_start);

CREATE INDEX IF NOT EXISTS rmf_pdf_chunks_fts_idx
  ON rmf_pdf_chunks USING gin (
    to_tsvector('english', doc_number || ' ' || section_heading || ' ' || content)
  );

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
  ALTER TABLE rmf_pdf_chunks ADD COLUMN IF NOT EXISTS embedding vector(256);
  CREATE INDEX IF NOT EXISTS rmf_pdf_chunks_embedding_hnsw_idx
    ON rmf_pdf_chunks USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS rmf_oscal_sync_log (
  sync_id text PRIMARY KEY,
  checked_at timestamptz NOT NULL DEFAULT now(),
  source_id text NOT NULL,
  local_sha256 text NOT NULL,
  upstream_sha256 text,
  status text NOT NULL CHECK (status IN ('UP_TO_DATE', 'UPDATE_AVAILABLE', 'SYNCED', 'CHECK_FAILED')),
  upstream_url text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS rmf_oscal_sync_log_checked_idx
  ON rmf_oscal_sync_log (checked_at DESC);
