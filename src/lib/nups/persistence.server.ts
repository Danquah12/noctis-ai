/**
 * NUPS SQL Persistence Layer (Neon PostgreSQL / PGLite)
 *
 * Persists multi-domain orchestration runs (`enterprise.nups_runs`) and the
 * 41-entry Master Capability Matrix (`enterprise.nups_capability_catalog`).
 */

import { ensureEnterpriseSchema } from "../enterprise/persistence.server.ts";
import { NOCTIS_MASTER_CAPABILITY_MATRIX } from "./master-capability-matrix.ts";
import type { NupsSolveResult } from "./types.ts";

let nupsSchemaReadyPromise: Promise<void> | null = null;

export async function ensureNupsSchema() {
  const { sql, dbSource } = await ensureEnterpriseSchema();
  if (!nupsSchemaReadyPromise) {
    nupsSchemaReadyPromise = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.nups_runs (
          id TEXT PRIMARY KEY,
          query_text TEXT NOT NULL,
          classified_engines_json JSONB NOT NULL,
          domains_count INTEGER NOT NULL,
          validation_status TEXT NOT NULL,
          conflicts_count INTEGER NOT NULL DEFAULT 0,
          audit_sha256 TEXT NOT NULL,
          latency_ms INTEGER NOT NULL DEFAULT 0,
          actor_id TEXT NOT NULL DEFAULT 'system',
          tenant_id TEXT NOT NULL DEFAULT 'tenant:public-sandbox',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE INDEX IF NOT EXISTS idx_enterprise_nups_runs_created_at
          ON enterprise.nups_runs (created_at DESC)
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.nups_capability_catalog (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          phase TEXT NOT NULL,
          status TEXT NOT NULL,
          ndkrs_domain TEXT NOT NULL,
          modules_json JSONB NOT NULL,
          sources_json JSONB NOT NULL,
          rules_json JSONB NOT NULL,
          apis_json JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
    })().catch((err) => {
      nupsSchemaReadyPromise = null;
      throw err;
    });
  }
  await nupsSchemaReadyPromise;
  return { sql, dbSource };
}

export async function syncNupsCatalogToSql(): Promise<number> {
  const { sql } = await ensureNupsSchema();
  let count = 0;
  for (const e of NOCTIS_MASTER_CAPABILITY_MATRIX) {
    await sql.query(
      `INSERT INTO enterprise.nups_capability_catalog
        (id, name, category, phase, status, ndkrs_domain, modules_json, sources_json, rules_json, apis_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         phase = EXCLUDED.phase,
         status = EXCLUDED.status,
         ndkrs_domain = EXCLUDED.ndkrs_domain,
         modules_json = EXCLUDED.modules_json,
         sources_json = EXCLUDED.sources_json,
         rules_json = EXCLUDED.rules_json,
         apis_json = EXCLUDED.apis_json,
         updated_at = now()`,
      [
        e.id,
        e.name,
        e.category,
        e.phase,
        e.status,
        e.ndkrsDomain,
        JSON.stringify(e.existingModules),
        JSON.stringify(e.authoritativeSources),
        JSON.stringify(e.deterministicRules),
        JSON.stringify(e.apis),
      ],
    );
    count += 1;
  }
  return count;
}

export async function recordNupsRun(
  res: NupsSolveResult,
  actorId = "system",
  tenantId = "tenant:public-sandbox",
): Promise<boolean> {
  try {
    const { sql } = await ensureNupsSchema();
    await sql.query(
      `INSERT INTO enterprise.nups_runs
        (id, query_text, classified_engines_json, domains_count, validation_status, conflicts_count, audit_sha256, latency_ms, actor_id, tenant_id)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        res.runId,
        res.query.slice(0, 2000),
        JSON.stringify(res.classification.matchedEngines.map((e) => ({ id: e.id, name: e.name, category: e.category, score: e.score }))),
        res.classification.distinctDomains.length,
        res.safetyValidation.status,
        res.crossDomainConflicts.length,
        res.auditSha256,
        Math.max(1, Math.round(res.latencyMs)),
        actorId,
        tenantId,
      ],
    );
    return true;
  } catch {
    return false;
  }
}

export async function listNupsRuns(limit = 20): Promise<Record<string, unknown>[]> {
  try {
    const { sql } = await ensureNupsSchema();
    return await sql.query<Record<string, unknown>>(
      `SELECT id, query_text, classified_engines_json, domains_count, validation_status, conflicts_count, audit_sha256, latency_ms, actor_id, created_at
       FROM enterprise.nups_runs
       ORDER BY created_at DESC
       LIMIT $1`,
      [Math.max(1, Math.min(100, limit))],
    );
  } catch {
    return [];
  }
}

export async function getNupsTelemetryStats(): Promise<{
  runsTotal: number;
  catalogedEngines: number;
}> {
  try {
    const { sql } = await ensureNupsSchema();
    const [r, c] = await Promise.all([
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.nups_runs"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.nups_capability_catalog"),
    ]);
    return {
      runsTotal: Number(r[0]?.c ?? 0),
      catalogedEngines: Number(c[0]?.c ?? 0),
    };
  } catch {
    return { runsTotal: 0, catalogedEngines: 0 };
  }
}
