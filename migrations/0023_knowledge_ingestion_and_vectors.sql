-- Continuous Open-Knowledge Ingestion Ledger, Per-Source Cursors, Supersession Tracking, and pgvector Hybrid Embeddings
-- Designed to execute cleanly on BOTH Neon Postgres (pgvector 0.8.x) and local embedded PGLite.

ALTER TABLE vibe_training_pair ADD COLUMN IF NOT EXISTS stale boolean NOT NULL DEFAULT false;
ALTER TABLE vibe_training_pair ADD COLUMN IF NOT EXISTS superseded_by text;

CREATE TABLE IF NOT EXISTS knowledge_ingestion_run (
  run_id text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now(),
  duration_ms int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  offset_seed int NOT NULL DEFAULT 0,
  total_fetched int NOT NULL DEFAULT 0,
  total_deduplicated int NOT NULL DEFAULT 0,
  postgres_upserted int NOT NULL DEFAULT 0,
  db_total_after int,
  sources_json jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS knowledge_ingestion_run_started_idx
  ON knowledge_ingestion_run (started_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_source_cursor (
  source_id text PRIMARY KEY,
  next_offset int NOT NULL DEFAULT 0,
  total_ingested int NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vibe_training_pair_active_idx
  ON vibe_training_pair (verified, stale, hits DESC, updated_at DESC);

-- Enable pgvector extension + 256-dim HNSW cosine index where supported (Neon Postgres),
-- while skipping safely in PGLite WASM environments without vector extension support.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
  ALTER TABLE vibe_training_pair ADD COLUMN IF NOT EXISTS embedding vector(256);
  CREATE INDEX IF NOT EXISTS vibe_training_pair_embedding_hnsw_idx
    ON vibe_training_pair USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
