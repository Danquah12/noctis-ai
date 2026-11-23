-- 0019_telemetry_persistence.sql
-- Persistent Universal Ingestion Telemetry & Relational DB Closure Support
-- Compatible with Managed Neon PostgreSQL and embedded PGLite WASM.

CREATE SCHEMA IF NOT EXISTS enterprise;

CREATE TABLE IF NOT EXISTS enterprise.telemetry_events (
  id TEXT PRIMARY KEY,
  ingest_id TEXT NOT NULL,
  protocol TEXT NOT NULL,
  suite TEXT NOT NULL,
  pillar TEXT NOT NULL,
  severity TEXT NOT NULL,
  hostname TEXT NOT NULL DEFAULT 'unknown',
  summary TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ent_telemetry_created
  ON enterprise.telemetry_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ent_telemetry_sev_pillar
  ON enterprise.telemetry_events (severity, pillar);
