/**
 * Noctis RMF v2.0 — Tenant-Scoped SQL Persistence & Hash-Chained Audit Ledger
 *
 * Uses shared `../db.ts` (`getSql()` / `dbSource`) inside Vite Dev & Vercel Production
 * SSR (supporting both Managed Neon PostgreSQL via `DATABASE_URL` and embedded PGLite),
 * and cleanly initializes an embedded PGLite runner when invoked directly under raw Node
 * test runners where Vite's `import.meta.glob` macro is not transformed.
 */

import { sha256Sync } from "../universal-crypto.ts";

export interface RuntimeSql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export type RmfArtifactType =
  | "SSP"
  | "SAP"
  | "SAR"
  | "POAM"
  | "EVIDENCE"
  | "RISK"
  | "TAILORING"
  | "FEEDBACK"
  | "CATO"
  | "EXPLANATION";

export interface StoredRmfArtifact<T = Record<string, unknown>> {
  id: string;
  tenantId: string;
  artifactType: RmfArtifactType;
  systemId: string;
  title: string;
  status: string;
  payload: T;
  payloadSha256: string;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

let resolvedBackendPromise: Promise<{ sql: RuntimeSql; dbSource: "neon" | "pglite" }> | null = null;
let ensureReadyPromise: Promise<void> | null = null;

async function resolveSqlBackend(): Promise<{ sql: RuntimeSql; dbSource: "neon" | "pglite" }> {
  if (!resolvedBackendPromise) {
    resolvedBackendPromise = (async () => {
      const hasDatabaseUrl = Boolean(typeof process !== "undefined" && process.env.DATABASE_URL?.trim());
      const hasViteGlob = typeof (import.meta as unknown as { glob?: unknown }).glob === "function";

      if (hasDatabaseUrl || hasViteGlob) {
        const mod = await import("../db.ts");
        const sql = await mod.getSql();
        return { sql, dbSource: mod.dbSource };
      }

      // Raw Node test runner fallback (no Vite `import.meta.glob`): real embedded PGLite
      const { PGlite } = await import("@electric-sql/pglite");
      const pg = new PGlite({
        parsers: {
          20: Number,
          1082: (v: string) => v,
          1186: (v: string) => v,
        },
      });
      await pg.waitReady;
      const sql: RuntimeSql = {
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

async function ensureRmfRuntimeSchema(sql: RuntimeSql): Promise<void> {
  if (!ensureReadyPromise) {
    ensureReadyPromise = (async () => {
      await sql.query("CREATE SCHEMA IF NOT EXISTS rmf");
      await sql.query(`
        CREATE TABLE IF NOT EXISTS rmf.v2_artifacts (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          artifact_type TEXT NOT NULL,
          system_id TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'DRAFT',
          payload JSONB NOT NULL,
          payload_sha256 TEXT NOT NULL,
          created_by TEXT NOT NULL,
          approved_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS rmf.v2_audit_ledger (
          seq BIGSERIAL PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          artifact_id TEXT,
          prev_hash TEXT NOT NULL,
          event_hash TEXT NOT NULL,
          detail JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
    })().catch((err) => {
      ensureReadyPromise = null;
      throw err;
    });
  }
  await ensureReadyPromise;
}

async function appendAuditLedger(
  sql: RuntimeSql,
  input: {
    tenantId: string;
    eventType: string;
    actorId: string;
    artifactId: string | null;
    detail: Record<string, unknown>;
  },
): Promise<{ prevHash: string; eventHash: string }> {
  const prevRows = await sql.query<{ event_hash: string }>(
    "SELECT event_hash FROM rmf.v2_audit_ledger WHERE tenant_id = $1 ORDER BY seq DESC LIMIT 1",
    [input.tenantId],
  );
  const prevHash = prevRows[0]?.event_hash || "GENESIS";
  const eventHash = sha256Sync(
    JSON.stringify({
      prevHash,
      tenantId: input.tenantId,
      eventType: input.eventType,
      actorId: input.actorId,
      artifactId: input.artifactId,
      detail: input.detail,
    }),
  );
  await sql.query(
    "INSERT INTO rmf.v2_audit_ledger (tenant_id, event_type, actor_id, artifact_id, prev_hash, event_hash, detail) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)",
    [
      input.tenantId,
      input.eventType,
      input.actorId,
      input.artifactId,
      prevHash,
      eventHash,
      JSON.stringify(input.detail),
    ],
  );
  return { prevHash, eventHash };
}

export async function saveRmfArtifact<T extends Record<string, unknown>>(input: {
  id?: string;
  tenantId: string;
  artifactType: RmfArtifactType;
  systemId: string;
  title: string;
  status?: string;
  payload: T;
  createdBy: string;
  approvedBy?: string | null;
}): Promise<{ artifact: StoredRmfArtifact<T>; ledgerEventHash: string; dbSource: "neon" | "pglite" }> {
  const { sql, dbSource } = await resolveSqlBackend();
  await ensureRmfRuntimeSchema(sql);

  const id =
    input.id?.trim() ||
    `${input.artifactType}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const serialized = JSON.stringify(input.payload);
  const payloadSha256 = sha256Sync(serialized);
  const status = input.status || "DRAFT";
  const approvedBy = input.approvedBy ?? null;

  const rows = await sql.query<{
    id: string;
    tenant_id: string;
    artifact_type: RmfArtifactType;
    system_id: string;
    title: string;
    status: string;
    payload: unknown;
    payload_sha256: string;
    created_by: string;
    approved_by: string | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>(
    `
    INSERT INTO rmf.v2_artifacts (id, tenant_id, artifact_type, system_id, title, status, payload, payload_sha256, created_by, approved_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      status = EXCLUDED.status,
      payload = EXCLUDED.payload,
      payload_sha256 = EXCLUDED.payload_sha256,
      approved_by = EXCLUDED.approved_by,
      updated_at = now()
    WHERE rmf.v2_artifacts.tenant_id = EXCLUDED.tenant_id
    RETURNING *
    `,
    [
      id,
      input.tenantId,
      input.artifactType,
      input.systemId,
      input.title,
      status,
      serialized,
      payloadSha256,
      input.createdBy,
      approvedBy,
    ],
  );

  const row = rows[0];
  if (!row) {
    throw new Error(`Artifact ID '${id}' already exists under another tenant boundary.`);
  }

  const ledger = await appendAuditLedger(sql, {
    tenantId: input.tenantId,
    eventType: `ARTIFACT_SAVED_${input.artifactType}`,
    actorId: input.createdBy,
    artifactId: row.id,
    detail: { artifactType: input.artifactType, status, payloadSha256 },
  });

  const parsedPayload = (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as T;
  return {
    artifact: {
      id: row.id,
      tenantId: row.tenant_id,
      artifactType: row.artifact_type,
      systemId: row.system_id,
      title: row.title,
      status: row.status,
      payload: parsedPayload,
      payloadSha256: row.payload_sha256,
      createdBy: row.created_by,
      approvedBy: row.approved_by,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    },
    ledgerEventHash: ledger.eventHash,
    dbSource,
  };
}

export async function listRmfArtifacts<T = Record<string, unknown>>(
  tenantId: string,
  artifactType?: RmfArtifactType,
  limit = 50,
): Promise<StoredRmfArtifact<T>[]> {
  const { sql } = await resolveSqlBackend();
  await ensureRmfRuntimeSchema(sql);
  const safeLimit = Math.max(1, Math.min(200, limit));

  const rows = artifactType
    ? await sql.query<{
        id: string;
        tenant_id: string;
        artifact_type: RmfArtifactType;
        system_id: string;
        title: string;
        status: string;
        payload: unknown;
        payload_sha256: string;
        created_by: string;
        approved_by: string | null;
        created_at: string | Date;
        updated_at: string | Date;
      }>(
        "SELECT * FROM rmf.v2_artifacts WHERE tenant_id = $1 AND artifact_type = $2 ORDER BY updated_at DESC LIMIT $3",
        [tenantId, artifactType, safeLimit],
      )
    : await sql.query<{
        id: string;
        tenant_id: string;
        artifact_type: RmfArtifactType;
        system_id: string;
        title: string;
        status: string;
        payload: unknown;
        payload_sha256: string;
        created_by: string;
        approved_by: string | null;
        created_at: string | Date;
        updated_at: string | Date;
      }>(
        "SELECT * FROM rmf.v2_artifacts WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT $2",
        [tenantId, safeLimit],
      );

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    artifactType: row.artifact_type,
    systemId: row.system_id,
    title: row.title,
    status: row.status,
    payload: (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as T,
    payloadSha256: row.payload_sha256,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function getRmfArtifactById<T = Record<string, unknown>>(
  tenantId: string,
  artifactId: string,
): Promise<StoredRmfArtifact<T> | null> {
  const { sql } = await resolveSqlBackend();
  await ensureRmfRuntimeSchema(sql);
  const rows = await sql.query<{
    id: string;
    tenant_id: string;
    artifact_type: RmfArtifactType;
    system_id: string;
    title: string;
    status: string;
    payload: unknown;
    payload_sha256: string;
    created_by: string;
    approved_by: string | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>("SELECT * FROM rmf.v2_artifacts WHERE id = $1 AND tenant_id = $2 LIMIT 1", [artifactId, tenantId]);

  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    artifactType: row.artifact_type,
    systemId: row.system_id,
    title: row.title,
    status: row.status,
    payload: (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as T,
    payloadSha256: row.payload_sha256,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getRmfExplanationArtifactById<T = Record<string, unknown>>(
  bundleId: string,
  callerTenantId: string,
): Promise<{ artifact: StoredRmfArtifact<T> | null; forbidden: boolean }> {
  const { sql } = await resolveSqlBackend();
  await ensureRmfRuntimeSchema(sql);
  const rows = await sql.query<{
    id: string;
    tenant_id: string;
    artifact_type: RmfArtifactType;
    system_id: string;
    title: string;
    status: string;
    payload: unknown;
    payload_sha256: string;
    created_by: string;
    approved_by: string | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>("SELECT * FROM rmf.v2_artifacts WHERE id = $1 AND artifact_type = 'EXPLANATION' LIMIT 1", [bundleId]);

  const row = rows[0];
  if (!row) return { artifact: null, forbidden: false };
  if (row.tenant_id !== callerTenantId && row.tenant_id !== "chat-session") {
    return { artifact: null, forbidden: true };
  }

  return {
    artifact: {
      id: row.id,
      tenantId: row.tenant_id,
      artifactType: row.artifact_type,
      systemId: row.system_id,
      title: row.title,
      status: row.status,
      payload: (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as T,
      payloadSha256: row.payload_sha256,
      createdBy: row.created_by,
      approvedBy: row.approved_by,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    },
    forbidden: false,
  };
}

export async function updateRmfArtifactApproval<T extends Record<string, unknown>>(
  tenantId: string,
  artifactId: string,
  nextStatus: string,
  approvedBy: string,
  updatedPayload?: T,
): Promise<{ artifact: StoredRmfArtifact<T>; ledgerEventHash: string } | null> {
  const { sql } = await resolveSqlBackend();
  await ensureRmfRuntimeSchema(sql);

  const existing = await getRmfArtifactById<T>(tenantId, artifactId);
  if (!existing) return null;

  const finalPayload = updatedPayload ?? existing.payload;
  const serialized = JSON.stringify(finalPayload);
  const payloadSha256 = sha256Sync(serialized);

  const rows = await sql.query<{
    id: string;
    tenant_id: string;
    artifact_type: RmfArtifactType;
    system_id: string;
    title: string;
    status: string;
    payload: unknown;
    payload_sha256: string;
    created_by: string;
    approved_by: string | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>(
    `
    UPDATE rmf.v2_artifacts
    SET status = $1, approved_by = $2, payload = $3::jsonb, payload_sha256 = $4, updated_at = now()
    WHERE id = $5 AND tenant_id = $6
    RETURNING *
    `,
    [nextStatus, approvedBy, serialized, payloadSha256, artifactId, tenantId],
  );

  const row = rows[0];
  if (!row) return null;

  const ledger = await appendAuditLedger(sql, {
    tenantId,
    eventType: `ARTIFACT_DECISION_${nextStatus}`,
    actorId: approvedBy,
    artifactId: row.id,
    detail: { artifactType: row.artifact_type, nextStatus, approvedBy, payloadSha256 },
  });

  return {
    artifact: {
      id: row.id,
      tenantId: row.tenant_id,
      artifactType: row.artifact_type,
      systemId: row.system_id,
      title: row.title,
      status: row.status,
      payload: (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as T,
      payloadSha256: row.payload_sha256,
      createdBy: row.created_by,
      approvedBy: row.approved_by,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    },
    ledgerEventHash: ledger.eventHash,
  };
}

export async function getRmfStorageStatus(tenantId: string): Promise<{
  dbSource: "neon" | "pglite";
  runtimeReady: boolean;
  countsByType: Record<string, number>;
  totalArtifacts: number;
  auditLedgerCount: number;
  latestLedgerHash: string;
  latestEvents: { seq: number; eventType: string; actorId: string; artifactId: string | null; eventHash: string; createdAt: string }[];
}> {
  const { sql, dbSource } = await resolveSqlBackend();
  await ensureRmfRuntimeSchema(sql);

  const countRows = await sql.query<{ artifact_type: string; cnt: number }>(
    "SELECT artifact_type, COUNT(*)::int AS cnt FROM rmf.v2_artifacts WHERE tenant_id = $1 GROUP BY artifact_type",
    [tenantId],
  );
  const countsByType: Record<string, number> = {};
  let totalArtifacts = 0;
  for (const r of countRows) {
    countsByType[r.artifact_type] = Number(r.cnt);
    totalArtifacts += Number(r.cnt);
  }

  const ledgerCountRows = await sql.query<{ cnt: number }>(
    "SELECT COUNT(*)::int AS cnt FROM rmf.v2_audit_ledger WHERE tenant_id = $1",
    [tenantId],
  );
  const latestRows = await sql.query<{
    seq: number;
    event_type: string;
    actor_id: string;
    artifact_id: string | null;
    event_hash: string;
    created_at: string | Date;
  }>(
    "SELECT seq, event_type, actor_id, artifact_id, event_hash, created_at FROM rmf.v2_audit_ledger WHERE tenant_id = $1 ORDER BY seq DESC LIMIT 8",
    [tenantId],
  );

  return {
    dbSource,
    runtimeReady: true,
    countsByType,
    totalArtifacts,
    auditLedgerCount: Number(ledgerCountRows[0]?.cnt ?? 0),
    latestLedgerHash: latestRows[0]?.event_hash || "GENESIS",
    latestEvents: latestRows.map((e) => ({
      seq: Number(e.seq),
      eventType: e.event_type,
      actorId: e.actor_id,
      artifactId: e.artifact_id,
      eventHash: e.event_hash,
      createdAt: new Date(e.created_at).toISOString(),
    })),
  };
}
