/**
 * NDKRS Core Data Plane & SQL Persistence (Server-Side)
 *
 * Dual-backend: Managed Neon PostgreSQL (+ optional `pgvector` HNSW) when `DATABASE_URL`
 * or Vite SSR is active, and isolated embedded PGLite WASM for raw Node test runners.
 * Never imports `pg` statically in client bundles (`*.server.ts`).
 */

import { sha256Sync } from "../universal-crypto.ts";
import type {
  DeterministicRuleRecord,
  KnowledgeChunk,
  KnowledgeGapRecord,
  KnowledgeRecord,
  KnowledgeSourceRecord,
  NdkrsDomain,
  ReviewQueueItem,
  TrustTier,
  ValidationCertificateRecord,
  VerificationStatus,
} from "./types.ts";

export interface NdkrsSql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

function toIsoTimestamp(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  return new Date(String(val)).toISOString();
}

function toNullableIsoTimestamp(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;
  return toIsoTimestamp(val);
}

let resolvedBackendPromise: Promise<{ sql: NdkrsSql; dbSource: "neon" | "pglite" }> | null = null;
let schemaReadyPromise: Promise<void> | null = null;
let pgvectorChecked: boolean | null = null;

export async function resolveNdkrsBackend(): Promise<{ sql: NdkrsSql; dbSource: "neon" | "pglite" }> {
  if (!resolvedBackendPromise) {
    resolvedBackendPromise = (async () => {
      const hasDatabaseUrl = Boolean(typeof process !== "undefined" && process.env.DATABASE_URL?.trim());
      const hasViteGlob = typeof (import.meta as unknown as { glob?: unknown }).glob === "function";

      if (hasDatabaseUrl || hasViteGlob) {
        const mod = await import("../db.ts");
        const sql = await mod.getSql();
        return { sql, dbSource: mod.dbSource };
      }

      const { PGlite } = await import("@electric-sql/pglite");
      const pg = new PGlite({
        parsers: {
          20: Number,
          1082: (v: string) => v,
          1186: (v: string) => v,
        },
      });
      await pg.waitReady;
      const sql: NdkrsSql = {
        async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
          const res = await pg.query<T>(text, params);
          return res.rows;
        },
      };
      return { sql, dbSource: "pglite" as const };
    })().catch((err) => {
      resolvedBackendPromise = null;
      throw err;
    });
  }
  return resolvedBackendPromise;
}

export async function ensureNdkrsSchema(sqlOverride?: NdkrsSql): Promise<NdkrsSql> {
  const backend = sqlOverride ? { sql: sqlOverride, dbSource: "pglite" as const } : await resolveNdkrsBackend();
  const { sql } = backend;
  if (sqlOverride) {
    await runCreateStatements(sql);
    return sql;
  }
  if (!schemaReadyPromise) {
    schemaReadyPromise = runCreateStatements(sql).catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  await schemaReadyPromise;
  return sql;
}

async function runCreateStatements(sql: NdkrsSql): Promise<void> {
  await sql.query("CREATE SCHEMA IF NOT EXISTS ndkrs");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS ndkrs.knowledge_sources (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      title TEXT NOT NULL,
      source_uri TEXT NOT NULL,
      trust_tier TEXT NOT NULL,
      version TEXT NOT NULL,
      effective_date TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      content_sha256 TEXT NOT NULL,
      storage_ref TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      ingested_by TEXT NOT NULL,
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
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
      verification_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      record_sha256 TEXT NOT NULL,
      created_by TEXT NOT NULL,
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
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
    )
  `);
  await sql.query(`
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
      status TEXT NOT NULL DEFAULT 'VERIFIED',
      approved_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
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
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      reviewer_id TEXT,
      reviewer_role TEXT,
      reviewer_notes TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS ndkrs.validation_certificates (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      request_id TEXT NOT NULL,
      validator_version TEXT NOT NULL,
      source_input_hash TEXT NOT NULL,
      output_hash TEXT NOT NULL,
      verdict TEXT NOT NULL,
      gates_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      violations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      hmac_signature TEXT NOT NULL,
      key_mode TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS ndkrs.knowledge_gaps (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      query_hash TEXT NOT NULL UNIQUE,
      sanitized_topic TEXT NOT NULL,
      failure_reason TEXT NOT NULL,
      validator_rule_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      occurrences INT NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'OPEN',
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
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
    )
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS ndkrs.rate_limit_buckets (
      bucket_key TEXT PRIMARY KEY,
      window_start BIGINT NOT NULL,
      hit_count INT NOT NULL DEFAULT 1,
      expires_at BIGINT NOT NULL
    )
  `);
  await sql.query(`
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
    )
  `);
  await sql.query(
    "CREATE INDEX IF NOT EXISTS idx_ndkrs_records_domain_status ON ndkrs.knowledge_records (domain, verification_status)",
  );
  await sql.query(
    "CREATE INDEX IF NOT EXISTS idx_ndkrs_records_canonical ON ndkrs.knowledge_records (domain, canonical_key)",
  );
  await sql.query(
    "CREATE INDEX IF NOT EXISTS idx_ndkrs_chunks_fts ON ndkrs.knowledge_chunks USING gin (to_tsvector('english', coalesce(heading, '') || ' ' || content))",
  );
  await sql.query(
    "CREATE INDEX IF NOT EXISTS idx_ndkrs_records_fts ON ndkrs.knowledge_records USING gin (to_tsvector('english', canonical_key || ' ' || title || ' ' || summary))",
  );
}

export async function isPgvectorActive(): Promise<boolean> {
  if (pgvectorChecked !== null) return pgvectorChecked;
  try {
    const sql = await ensureNdkrsSchema();
    const rows = await sql.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'ndkrs' AND table_name = 'knowledge_chunks' AND column_name = 'embedding_vec'`,
    );
    pgvectorChecked = rows.length > 0;
    return pgvectorChecked;
  } catch {
    pgvectorChecked = false;
    return false;
  }
}

export function resetNdkrsBackendCacheForTest(): void {
  resolvedBackendPromise = null;
  schemaReadyPromise = null;
  pgvectorChecked = null;
}

export async function upsertKnowledgeSource(input: {
  id: string;
  domain: NdkrsDomain;
  title: string;
  sourceUri: string;
  trustTier: TrustTier;
  version: string;
  effectiveDate?: string | null;
  expiresAt?: string | null;
  contentSha256: string;
  storageRef?: string | null;
  status: VerificationStatus;
  ingestedBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}): Promise<KnowledgeSourceRecord> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO ndkrs.knowledge_sources (
       id, domain, title, source_uri, trust_tier, version, effective_date, expires_at,
       content_sha256, storage_ref, status, ingested_by, approved_by, approved_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       source_uri = EXCLUDED.source_uri,
       trust_tier = EXCLUDED.trust_tier,
       version = EXCLUDED.version,
       effective_date = EXCLUDED.effective_date,
       expires_at = EXCLUDED.expires_at,
       content_sha256 = EXCLUDED.content_sha256,
       storage_ref = EXCLUDED.storage_ref,
       status = EXCLUDED.status,
       approved_by = EXCLUDED.approved_by,
       approved_at = EXCLUDED.approved_at,
       updated_at = now()
     RETURNING *`,
    [
      input.id,
      input.domain,
      input.title,
      input.sourceUri,
      input.trustTier,
      input.version,
      input.effectiveDate ?? null,
      input.expiresAt ?? null,
      input.contentSha256,
      input.storageRef ?? null,
      input.status,
      input.ingestedBy,
      input.approvedBy ?? null,
      input.approvedAt ?? null,
    ],
  );
  const r = rows[0];
  return {
    id: String(r.id),
    domain: String(r.domain) as NdkrsDomain,
    title: String(r.title),
    sourceUri: String(r.source_uri),
    trustTier: String(r.trust_tier) as TrustTier,
    version: String(r.version),
    effectiveDate: toNullableIsoTimestamp(r.effective_date),
    expiresAt: toNullableIsoTimestamp(r.expires_at),
    contentSha256: String(r.content_sha256),
    storageRef: r.storage_ref ? String(r.storage_ref) : null,
    status: String(r.status) as VerificationStatus,
    ingestedBy: String(r.ingested_by),
    approvedBy: r.approved_by ? String(r.approved_by) : null,
    approvedAt: toNullableIsoTimestamp(r.approved_at),
    createdAt: toIsoTimestamp(r.created_at),
    updatedAt: toIsoTimestamp(r.updated_at),
  };
}

export async function upsertKnowledgeRecord(input: {
  id: string;
  sourceId: string;
  domain: NdkrsDomain;
  canonicalKey: string;
  title: string;
  summary: string;
  structuredJson?: Record<string, unknown>;
  citationLabel: string;
  version: string;
  effectiveDate?: string | null;
  expiresAt?: string | null;
  verificationStatus: VerificationStatus;
  recordSha256: string;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}): Promise<KnowledgeRecord> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO ndkrs.knowledge_records (
       id, source_id, domain, canonical_key, title, summary, structured_json, citation_label,
       version, effective_date, expires_at, verification_status, record_sha256, created_by,
       approved_by, approved_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       structured_json = EXCLUDED.structured_json,
       citation_label = EXCLUDED.citation_label,
       version = EXCLUDED.version,
       effective_date = EXCLUDED.effective_date,
       expires_at = EXCLUDED.expires_at,
       verification_status = EXCLUDED.verification_status,
       record_sha256 = EXCLUDED.record_sha256,
       approved_by = EXCLUDED.approved_by,
       approved_at = EXCLUDED.approved_at,
       updated_at = now()
     RETURNING *`,
    [
      input.id,
      input.sourceId,
      input.domain,
      input.canonicalKey,
      input.title,
      input.summary,
      JSON.stringify(input.structuredJson ?? {}),
      input.citationLabel,
      input.version,
      input.effectiveDate ?? null,
      input.expiresAt ?? null,
      input.verificationStatus,
      input.recordSha256,
      input.createdBy,
      input.approvedBy ?? null,
      input.approvedAt ?? null,
    ],
  );
  const r = rows[0];
  return mapKnowledgeRecord(r);
}

function mapKnowledgeRecord(r: Record<string, unknown>): KnowledgeRecord {
  return {
    id: String(r.id),
    sourceId: String(r.source_id),
    domain: String(r.domain) as NdkrsDomain,
    canonicalKey: String(r.canonical_key),
    title: String(r.title),
    summary: String(r.summary),
    structuredJson: (typeof r.structured_json === "object" && r.structured_json !== null
      ? r.structured_json
      : {}) as Record<string, unknown>,
    citationLabel: String(r.citation_label),
    version: String(r.version),
    effectiveDate: toNullableIsoTimestamp(r.effective_date),
    expiresAt: toNullableIsoTimestamp(r.expires_at),
    verificationStatus: String(r.verification_status) as VerificationStatus,
    recordSha256: String(r.record_sha256),
    createdBy: String(r.created_by),
    approvedBy: r.approved_by ? String(r.approved_by) : null,
    approvedAt: toNullableIsoTimestamp(r.approved_at),
    createdAt: toIsoTimestamp(r.created_at),
    updatedAt: toIsoTimestamp(r.updated_at),
  };
}

export async function insertKnowledgeChunk(chunk: Omit<KnowledgeChunk, "createdAt">): Promise<void> {
  const sql = await ensureNdkrsSchema();
  const hasVec = await isPgvectorActive();
  if (hasVec && chunk.embeddingJson.length === 384) {
    const literal = `[${chunk.embeddingJson.map((n) => Number(n) || 0).join(",")}]`;
    await sql.query(
      `INSERT INTO ndkrs.knowledge_chunks (
         id, source_id, record_id, domain, chunk_index, heading, content, token_count,
         embedding_model, embedding_dims, embedding_json, embedding_vec, content_sha256
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::vector,$13)
       ON CONFLICT (id) DO UPDATE SET
         heading = EXCLUDED.heading,
         content = EXCLUDED.content,
         embedding_model = EXCLUDED.embedding_model,
         embedding_json = EXCLUDED.embedding_json,
         embedding_vec = EXCLUDED.embedding_vec,
         content_sha256 = EXCLUDED.content_sha256`,
      [
        chunk.id,
        chunk.sourceId,
        chunk.recordId,
        chunk.domain,
        chunk.chunkIndex,
        chunk.heading,
        chunk.content,
        chunk.tokenCount,
        chunk.embeddingModel,
        chunk.embeddingDims,
        JSON.stringify(chunk.embeddingJson),
        literal,
        chunk.contentSha256,
      ],
    );
    return;
  }

  await sql.query(
    `INSERT INTO ndkrs.knowledge_chunks (
       id, source_id, record_id, domain, chunk_index, heading, content, token_count,
       embedding_model, embedding_dims, embedding_json, content_sha256
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
     ON CONFLICT (id) DO UPDATE SET
       heading = EXCLUDED.heading,
       content = EXCLUDED.content,
       embedding_model = EXCLUDED.embedding_model,
       embedding_json = EXCLUDED.embedding_json,
       content_sha256 = EXCLUDED.content_sha256`,
    [
      chunk.id,
      chunk.sourceId,
      chunk.recordId,
      chunk.domain,
      chunk.chunkIndex,
      chunk.heading,
      chunk.content,
      chunk.tokenCount,
      chunk.embeddingModel,
      chunk.embeddingDims,
      JSON.stringify(chunk.embeddingJson),
      chunk.contentSha256,
    ],
  );
}

export async function upsertDeterministicRule(rule: Omit<DeterministicRuleRecord, "createdAt" | "updatedAt">): Promise<void> {
  const sql = await ensureNdkrsSchema();
  await sql.query(
    `INSERT INTO ndkrs.deterministic_rules (
       rule_id, domain, name, version, description, authority_citation,
       input_schema, rule_spec, executor_ref, status, approved_by, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,now())
     ON CONFLICT (rule_id) DO UPDATE SET
       name = EXCLUDED.name,
       version = EXCLUDED.version,
       description = EXCLUDED.description,
       authority_citation = EXCLUDED.authority_citation,
       input_schema = EXCLUDED.input_schema,
       rule_spec = EXCLUDED.rule_spec,
       executor_ref = EXCLUDED.executor_ref,
       status = EXCLUDED.status,
       approved_by = EXCLUDED.approved_by,
       updated_at = now()`,
    [
      rule.ruleId,
      rule.domain,
      rule.name,
      rule.version,
      rule.description,
      rule.authorityCitation,
      JSON.stringify(rule.inputSchema ?? {}),
      JSON.stringify(rule.ruleSpec ?? {}),
      rule.executorRef,
      rule.status,
      rule.approvedBy,
    ],
  );
}

export async function listDeterministicRules(domain?: NdkrsDomain): Promise<DeterministicRuleRecord[]> {
  const sql = await ensureNdkrsSchema();
  const rows = domain
    ? await sql.query<Record<string, unknown>>(
        "SELECT * FROM ndkrs.deterministic_rules WHERE domain = $1 ORDER BY rule_id ASC",
        [domain],
      )
    : await sql.query<Record<string, unknown>>(
        "SELECT * FROM ndkrs.deterministic_rules ORDER BY domain ASC, rule_id ASC",
      );
  return rows.map((r) => ({
    ruleId: String(r.rule_id),
    domain: String(r.domain) as NdkrsDomain,
    name: String(r.name),
    version: String(r.version),
    description: String(r.description),
    authorityCitation: String(r.authority_citation),
    inputSchema: (r.input_schema ?? {}) as Record<string, unknown>,
    ruleSpec: (r.rule_spec ?? {}) as Record<string, unknown>,
    executorRef: String(r.executor_ref),
    status: String(r.status) as "PENDING_REVIEW" | "VERIFIED" | "DEPRECATED",
    approvedBy: r.approved_by ? String(r.approved_by) : null,
    createdAt: toIsoTimestamp(r.created_at),
    updatedAt: toIsoTimestamp(r.updated_at),
  }));
}

export async function insertReviewQueueItem(item: {
  id: string;
  targetType: string;
  targetId: string;
  domain: NdkrsDomain;
  title: string;
  proposedPayload: Record<string, unknown>;
  proposedBy: string;
  proposedByType: "HUMAN" | "AGENT" | "INGESTION_WORKER" | "API";
  sourceUri: string | null;
  allowlistVerified: boolean;
  contradictionFlags: string[];
}): Promise<ReviewQueueItem> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO ndkrs.review_queue (
       id, target_type, target_id, domain, title, proposed_payload, proposed_by,
       proposed_by_type, source_uri, allowlist_verified, contradiction_flags, status
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11::jsonb,'PENDING_REVIEW')
     ON CONFLICT (id) DO UPDATE SET
       proposed_payload = EXCLUDED.proposed_payload,
       contradiction_flags = EXCLUDED.contradiction_flags
     RETURNING *`,
    [
      item.id,
      item.targetType,
      item.targetId,
      item.domain,
      item.title,
      JSON.stringify(item.proposedPayload),
      item.proposedBy,
      item.proposedByType,
      item.sourceUri,
      item.allowlistVerified,
      JSON.stringify(item.contradictionFlags),
    ],
  );
  return mapReviewQueueItem(rows[0]);
}

export function mapReviewQueueItem(r: Record<string, unknown>): ReviewQueueItem {
  return {
    id: String(r.id),
    targetType: String(r.target_type),
    targetId: String(r.target_id),
    domain: String(r.domain) as NdkrsDomain,
    title: String(r.title),
    proposedPayload: (r.proposed_payload ?? {}) as Record<string, unknown>,
    proposedBy: String(r.proposed_by),
    proposedByType: String(r.proposed_by_type) as ReviewQueueItem["proposedByType"],
    sourceUri: r.source_uri ? String(r.source_uri) : null,
    allowlistVerified: Boolean(r.allowlist_verified),
    contradictionFlags: Array.isArray(r.contradiction_flags)
      ? r.contradiction_flags.map(String)
      : [],
    status: String(r.status) as ReviewQueueItem["status"],
    reviewerId: r.reviewer_id ? String(r.reviewer_id) : null,
    reviewerRole: r.reviewer_role ? String(r.reviewer_role) : null,
    reviewerNotes: r.reviewer_notes ? String(r.reviewer_notes) : null,
    decidedAt: toNullableIsoTimestamp(r.decided_at),
    createdAt: toIsoTimestamp(r.created_at),
  };
}

export async function persistValidationCertificate(
  cert: ValidationCertificateRecord,
): Promise<ValidationCertificateRecord> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO ndkrs.validation_certificates (
       id, domain, request_id, validator_version, source_input_hash, output_hash,
       verdict, gates_json, violations_json, hmac_signature, key_mode, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [
      cert.id,
      cert.domain,
      cert.requestId,
      cert.validatorVersion,
      cert.sourceInputHash,
      cert.outputHash,
      cert.verdict,
      JSON.stringify(cert.gatesJson),
      JSON.stringify(cert.violationsJson),
      cert.hmacSignature,
      cert.keyMode,
      cert.createdAt,
    ],
  );
  if (rows.length === 0) return cert;
  return cert;
}

export async function listValidationCertificates(limit = 25): Promise<ValidationCertificateRecord[]> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM ndkrs.validation_certificates ORDER BY created_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
  return rows.map((r) => ({
    id: String(r.id),
    domain: String(r.domain) as NdkrsDomain,
    requestId: String(r.request_id),
    validatorVersion: String(r.validator_version),
    sourceInputHash: String(r.source_input_hash),
    outputHash: String(r.output_hash),
    verdict: String(r.verdict) as "APPROVED" | "FAIL_CLOSED",
    gatesJson: Array.isArray(r.gates_json)
      ? (r.gates_json as ValidationCertificateRecord["gatesJson"])
      : [],
    violationsJson: Array.isArray(r.violations_json)
      ? (r.violations_json as ValidationCertificateRecord["violationsJson"])
      : [],
    hmacSignature: String(r.hmac_signature),
    keyMode: String(r.key_mode),
    createdAt: toIsoTimestamp(r.created_at),
  }));
}

export async function logKnowledgeGap(input: {
  domain: NdkrsDomain;
  sanitizedTopic: string;
  failureReason: string;
  validatorRuleIds?: string[];
}): Promise<KnowledgeGapRecord> {
  const sql = await ensureNdkrsSchema();
  const topicClean = input.sanitizedTopic.replace(/\s+/g, " ").trim().slice(0, 220);
  const queryHash = sha256Sync(`${input.domain}::${topicClean.toLowerCase()}`);
  const id = `GAP-${queryHash.slice(0, 12).toUpperCase()}`;
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO ndkrs.knowledge_gaps (
       id, domain, query_hash, sanitized_topic, failure_reason, validator_rule_ids, occurrences, status, last_seen_at
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,1,'OPEN',now())
     ON CONFLICT (query_hash) DO UPDATE SET
       failure_reason = EXCLUDED.failure_reason,
       validator_rule_ids = EXCLUDED.validator_rule_ids,
       occurrences = ndkrs.knowledge_gaps.occurrences + 1,
       last_seen_at = now()
     RETURNING *`,
    [
      id,
      input.domain,
      queryHash,
      topicClean,
      input.failureReason.slice(0, 500),
      JSON.stringify(input.validatorRuleIds ?? []),
    ],
  );
  const r = rows[0];
  return {
    id: String(r.id),
    domain: String(r.domain) as NdkrsDomain,
    queryHash: String(r.query_hash),
    sanitizedTopic: String(r.sanitized_topic),
    failureReason: String(r.failure_reason),
    validatorRuleIds: Array.isArray(r.validator_rule_ids) ? r.validator_rule_ids.map(String) : [],
    occurrences: Number(r.occurrences || 1),
    status: String(r.status) as KnowledgeGapRecord["status"],
    lastSeenAt: toIsoTimestamp(r.last_seen_at),
    createdAt: toIsoTimestamp(r.created_at),
  };
}

export async function listKnowledgeGaps(limit = 25): Promise<KnowledgeGapRecord[]> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM ndkrs.knowledge_gaps ORDER BY last_seen_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
  return rows.map((r) => ({
    id: String(r.id),
    domain: String(r.domain) as NdkrsDomain,
    queryHash: String(r.query_hash),
    sanitizedTopic: String(r.sanitized_topic),
    failureReason: String(r.failure_reason),
    validatorRuleIds: Array.isArray(r.validator_rule_ids) ? r.validator_rule_ids.map(String) : [],
    occurrences: Number(r.occurrences || 1),
    status: String(r.status) as KnowledgeGapRecord["status"],
    lastSeenAt: toIsoTimestamp(r.last_seen_at),
    createdAt: toIsoTimestamp(r.created_at),
  }));
}

export async function storeObjectBlob(input: {
  filename: string;
  mimeType: string;
  contentText: string;
  uploadedBy: string;
}): Promise<{ blobId: string; storageProvider: string; sha256: string; externalUrl: string | null }> {
  const sql = await ensureNdkrsSchema();
  const contentSha = sha256Sync(input.contentText);
  const blobId = `BLOB-${contentSha.slice(0, 14).toUpperCase()}`;
  const bytes = Buffer.from(input.contentText, "utf8");
  const blobToken = typeof process !== "undefined" ? process.env.BLOB_READ_WRITE_TOKEN?.trim() : "";

  let storageProvider = "postgres_blob";
  let externalUrl: string | null = null;
  let contentBase64: string | null = bytes.toString("base64").slice(0, 260_000);

  if (blobToken) {
    try {
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
      const res = await fetch(`https://blob.vercel-storage.com/ndkrs/${blobId}-${safeName}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${blobToken}`,
          "content-type": input.mimeType,
          "x-api-version": "7",
        },
        signal: AbortSignal.timeout(5000),
        body: bytes,
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          storageProvider = "vercel_blob";
          externalUrl = data.url;
          contentBase64 = null;
        }
      }
    } catch {
      // Keep Postgres fallback cleanly
    }
  }

  await sql.query(
    `INSERT INTO ndkrs.object_blobs (
       blob_id, storage_provider, filename, mime_type, byte_size, sha256, external_url, content_base64, uploaded_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (blob_id) DO NOTHING`,
    [
      blobId,
      storageProvider,
      input.filename,
      input.mimeType,
      bytes.length,
      contentSha,
      externalUrl,
      contentBase64,
      input.uploadedBy,
    ],
  );
  return { blobId, storageProvider, sha256: contentSha, externalUrl };
}

export async function checkDistributedRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; count: number; backend: "upstash_redis" | "postgres_bucket" }> {
  const redisUrl = typeof process !== "undefined" ? process.env.UPSTASH_REDIS_REST_URL?.trim() : "";
  const redisToken = typeof process !== "undefined" ? process.env.UPSTASH_REDIS_REST_TOKEN?.trim() : "";
  if (redisUrl && redisToken) {
    try {
      const pipelineRes = await fetch(`${redisUrl.replace(/\/+$/, "")}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(2500),
        body: JSON.stringify([
          ["INCR", `ndkrs:rl:${bucketKey}`],
          ["PEXPIRE", `ndkrs:rl:${bucketKey}`, String(windowMs), "NX"],
        ]),
      });
      if (pipelineRes.ok) {
        const out = (await pipelineRes.json()) as Array<{ result?: number }>;
        const count = Number(out?.[0]?.result ?? 1);
        return { allowed: count <= limit, count, backend: "upstash_redis" };
      }
    } catch {
      // Fall back to atomic Postgres rate-limit table
    }
  }

  const sql = await ensureNdkrsSchema();
  const now = Date.now();
  const nextExpiry = now + windowMs;
  const rows = await sql.query<{ hit_count: number }>(
    `INSERT INTO ndkrs.rate_limit_buckets (bucket_key, window_start, hit_count, expires_at)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (bucket_key) DO UPDATE SET
       window_start = CASE WHEN ndkrs.rate_limit_buckets.expires_at <= $2 THEN $2 ELSE ndkrs.rate_limit_buckets.window_start END,
       hit_count = CASE WHEN ndkrs.rate_limit_buckets.expires_at <= $2 THEN 1 ELSE ndkrs.rate_limit_buckets.hit_count + 1 END,
       expires_at = CASE WHEN ndkrs.rate_limit_buckets.expires_at <= $2 THEN $3 ELSE ndkrs.rate_limit_buckets.expires_at END
     RETURNING hit_count`,
    [bucketKey, now, nextExpiry],
  );
  const count = Number(rows[0]?.hit_count ?? 1);
  return { allowed: count <= limit, count, backend: "postgres_bucket" };
}

export async function getDominantChunkEmbeddingModel(): Promise<string> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<{ embedding_model: string; c: number }>(
    `SELECT embedding_model, count(*)::int AS c
     FROM ndkrs.knowledge_chunks
     GROUP BY embedding_model
     ORDER BY c DESC
     LIMIT 1`,
  );
  return rows[0]?.embedding_model || "noctis-det-embed-384-v1";
}

export async function getNdkrsStatusSummary() {
  const { sql, dbSource } = await resolveNdkrsBackend();
  await ensureNdkrsSchema(sql);
  const pgvectorEnabled = await isPgvectorActive();
  const dominantEmbeddingModel = await getDominantChunkEmbeddingModel();

  const [sources, verifiedRecords, pendingRecords, chunks, rules, queuePending, certs, gaps, enclaveCount] =
    await Promise.all([
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.knowledge_sources"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.knowledge_records WHERE verification_status = 'VERIFIED'"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.knowledge_records WHERE verification_status = 'PENDING_REVIEW'"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.knowledge_chunks"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.deterministic_rules"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.review_queue WHERE status = 'PENDING_REVIEW'"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.validation_certificates"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.knowledge_gaps WHERE status = 'OPEN'"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM ndkrs.clinical_enclave_records"),
    ]);

  return {
    platform: "Noctis Deterministic Knowledge & Reasoning System (NDKRS)",
    version: "1.0.0",
    dbSource,
    pgvectorEnabled,
    dominantEmbeddingModel,
    counts: {
      sources: sources[0]?.c ?? 0,
      verifiedRecords: verifiedRecords[0]?.c ?? 0,
      pendingRecords: pendingRecords[0]?.c ?? 0,
      chunks: chunks[0]?.c ?? 0,
      deterministicRules: rules[0]?.c ?? 0,
      pendingReviewQueue: queuePending[0]?.c ?? 0,
      validationCertificates: certs[0]?.c ?? 0,
      openKnowledgeGaps: gaps[0]?.c ?? 0,
      encryptedClinicalEnclaveRecords: enclaveCount[0]?.c ?? 0,
    },
  };
}

export async function findVerifiedRecordsByCanonicalKey(
  domain: NdkrsDomain,
  canonicalKey: string,
): Promise<KnowledgeRecord[]> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM ndkrs.knowledge_records
     WHERE domain = $1 AND lower(canonical_key) = lower($2) AND verification_status = 'VERIFIED'`,
    [domain, canonicalKey],
  );
  return rows.map(mapKnowledgeRecord);
}
