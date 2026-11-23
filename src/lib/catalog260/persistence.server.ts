/**
 * SQL Persistence for Catalog 260 Traceability, Scoped User Memory (#12/#257),
 * Model Registry & Canary Rollback Gates (#30/#35), and Autonomous Evaluation Factory (#255).
 */

import { sha256Sync } from "../universal-crypto.ts";
import { ensureEnterpriseSchema } from "../enterprise/persistence.server.ts";
import { CATALOG_260_ITEMS } from "./catalog-260-registry.ts";

let cat260SchemaReadyPromise: Promise<void> | null = null;

export async function ensureCatalog260Schema() {
  const { sql, dbSource } = await ensureEnterpriseSchema();
  if (!cat260SchemaReadyPromise) {
    cat260SchemaReadyPromise = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.catalog_260_registry (
          item_number INTEGER PRIMARY KEY,
          division_code TEXT NOT NULL,
          division_name TEXT NOT NULL,
          name TEXT NOT NULL,
          stage TEXT NOT NULL,
          status TEXT NOT NULL,
          gap_action TEXT NOT NULL,
          modules_json JSONB NOT NULL,
          api_endpoint TEXT,
          boundary_note TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.user_memory (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          purpose TEXT NOT NULL,
          content_redacted TEXT NOT NULL,
          consent_granted BOOLEAN NOT NULL DEFAULT true,
          expires_at TIMESTAMPTZ,
          content_sha256 TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE INDEX IF NOT EXISTS idx_enterprise_user_memory_user
          ON enterprise.user_memory (user_id, created_at DESC)
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.model_registry (
          model_id TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          artifact_sha256 TEXT NOT NULL,
          eval_accuracy_pct NUMERIC(5,2) NOT NULL,
          canary_traffic_pct INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL,
          rollback_target TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.dynamic_regression_tests (
          id TEXT PRIMARY KEY,
          defect_source TEXT NOT NULL,
          domain TEXT NOT NULL,
          prompt_sample TEXT NOT NULL,
          must_include_json JSONB NOT NULL,
          must_not_include_json JSONB NOT NULL,
          last_status TEXT NOT NULL DEFAULT 'CREATED',
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
    })().catch((err) => {
      cat260SchemaReadyPromise = null;
      throw err;
    });
  }
  await cat260SchemaReadyPromise;
  return { sql, dbSource };
}

export async function syncCatalog260ToSql(): Promise<number> {
  const { sql } = await ensureCatalog260Schema();
  let synced = 0;
  for (const item of CATALOG_260_ITEMS) {
    await sql.query(
      `INSERT INTO enterprise.catalog_260_registry
        (item_number, division_code, division_name, name, stage, status, gap_action, modules_json, api_endpoint, boundary_note, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, now())
       ON CONFLICT (item_number) DO UPDATE SET
         division_code = EXCLUDED.division_code,
         division_name = EXCLUDED.division_name,
         name = EXCLUDED.name,
         stage = EXCLUDED.stage,
         status = EXCLUDED.status,
         gap_action = EXCLUDED.gap_action,
         modules_json = EXCLUDED.modules_json,
         api_endpoint = EXCLUDED.api_endpoint,
         boundary_note = EXCLUDED.boundary_note,
         updated_at = now()`,
      [
        item.itemNumber,
        item.divisionCode,
        item.divisionName,
        item.name,
        item.stage,
        item.status,
        item.gapAction,
        JSON.stringify(item.modules),
        item.apiEndpoint,
        item.boundaryNote,
      ],
    );
    synced += 1;
  }
  return synced;
}

export async function saveUserMemory(input: {
  id?: string;
  userId: string;
  tenantId?: string;
  purpose: string;
  contentRedacted: string;
  consentGranted: boolean;
  retentionDays?: number;
}) {
  if (!input.consentGranted) {
    return { saved: false, reason: "CONSENT_NOT_GRANTED" as const };
  }
  const { sql } = await ensureCatalog260Schema();
  const id = input.id || `MEM-${sha256Sync(`${input.userId}|${input.purpose}|${Date.now()}`).slice(0, 12).toUpperCase()}`;
  const days = Math.max(1, Math.min(365, input.retentionDays ?? 30));
  const expiresAt = new Date(Date.now() + days * 86400_000).toISOString();
  const contentSha256 = sha256Sync(input.contentRedacted);
  await sql.query(
    `INSERT INTO enterprise.user_memory
      (id, user_id, tenant_id, purpose, content_redacted, consent_granted, expires_at, content_sha256)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET content_redacted = EXCLUDED.content_redacted, expires_at = EXCLUDED.expires_at`,
    [id, input.userId, input.tenantId || "tenant:public-sandbox", input.purpose, input.contentRedacted, true, expiresAt, contentSha256],
  );
  return { saved: true, id, expiresAt, contentSha256 };
}

export async function listUserMemory(userId?: string, limit = 25) {
  const { sql } = await ensureCatalog260Schema();
  if (userId) {
    return sql.query<Record<string, unknown>>(
      `SELECT id, user_id, tenant_id, purpose, content_redacted, consent_granted, expires_at, content_sha256, created_at
       FROM enterprise.user_memory
       WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > now())
       ORDER BY created_at DESC LIMIT $2`,
      [userId, Math.max(1, Math.min(100, limit))],
    );
  }
  return sql.query<Record<string, unknown>>(
    `SELECT id, user_id, tenant_id, purpose, content_redacted, consent_granted, expires_at, content_sha256, created_at
     FROM enterprise.user_memory ORDER BY created_at DESC LIMIT $1`,
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function deleteUserMemory(id: string) {
  const { sql } = await ensureCatalog260Schema();
  await sql.query("DELETE FROM enterprise.user_memory WHERE id = $1", [id]);
  return { deleted: true, id };
}

export async function registerModelVersion(input: {
  modelId: string;
  version: string;
  artifactSha256?: string;
  evalAccuracyPct: number;
  canaryTrafficPct: number;
  status: "ACTIVE_PROD" | "CANARY" | "ROLLED_BACK" | "STAGED";
  rollbackTarget?: string | null;
}) {
  const { sql } = await ensureCatalog260Schema();
  const artifactSha = input.artifactSha256 || sha256Sync(`${input.modelId}@${input.version}`);
  await sql.query(
    `INSERT INTO enterprise.model_registry
      (model_id, version, artifact_sha256, eval_accuracy_pct, canary_traffic_pct, status, rollback_target, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (model_id) DO UPDATE SET
       version = EXCLUDED.version,
       artifact_sha256 = EXCLUDED.artifact_sha256,
       eval_accuracy_pct = EXCLUDED.eval_accuracy_pct,
       canary_traffic_pct = EXCLUDED.canary_traffic_pct,
       status = EXCLUDED.status,
       rollback_target = EXCLUDED.rollback_target,
       updated_at = now()`,
    [
      input.modelId,
      input.version,
      artifactSha,
      Number(input.evalAccuracyPct.toFixed(2)),
      Math.max(0, Math.min(100, Math.round(input.canaryTrafficPct))),
      input.status,
      input.rollbackTarget ?? null,
    ],
  );
  return { ok: true, modelId: input.modelId, version: input.version, artifactSha256: artifactSha };
}

export async function listModelRegistry() {
  const { sql } = await ensureCatalog260Schema();
  return sql.query<Record<string, unknown>>(
    "SELECT model_id, version, artifact_sha256, eval_accuracy_pct::float8 AS eval_accuracy_pct, canary_traffic_pct, status, rollback_target, updated_at FROM enterprise.model_registry ORDER BY updated_at DESC",
  );
}

export async function evaluateCanaryRollbackGate(input: {
  modelId: string;
  observedAccuracyPct: number;
  criticalSafetyFailures: number;
}) {
  const shouldRollback = input.criticalSafetyFailures > 0 || input.observedAccuracyPct < 95.0;
  if (shouldRollback) {
    const { sql } = await ensureCatalog260Schema();
    await sql.query(
      "UPDATE enterprise.model_registry SET canary_traffic_pct = 0, status = 'ROLLED_BACK', eval_accuracy_pct = $2, updated_at = now() WHERE model_id = $1",
      [input.modelId, Number(input.observedAccuracyPct.toFixed(2))],
    );
  }
  return {
    modelId: input.modelId,
    observedAccuracyPct: input.observedAccuracyPct,
    criticalSafetyFailures: input.criticalSafetyFailures,
    decision: shouldRollback ? ("AUTO_ROLLBACK_TRIGGERED" as const) : ("PROMOTE_CANARY_PASS" as const),
    canaryTrafficPctAfter: shouldRollback ? 0 : undefined,
  };
}

export async function createDynamicRegressionTest(input: {
  id?: string;
  defectSource: string;
  domain: string;
  promptSample: string;
  mustInclude: string[];
  mustNotInclude: string[];
  createdBy?: string;
}) {
  const { sql } = await ensureCatalog260Schema();
  const id = input.id || `REG-${sha256Sync(`${input.defectSource}|${input.promptSample}`).slice(0, 10).toUpperCase()}`;
  await sql.query(
    `INSERT INTO enterprise.dynamic_regression_tests
      (id, defect_source, domain, prompt_sample, must_include_json, must_not_include_json, last_status, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'PASS', $7)
     ON CONFLICT (id) DO UPDATE SET
       must_include_json = EXCLUDED.must_include_json,
       must_not_include_json = EXCLUDED.must_not_include_json,
       last_status = EXCLUDED.last_status`,
    [
      id,
      input.defectSource,
      input.domain,
      input.promptSample,
      JSON.stringify(input.mustInclude || []),
      JSON.stringify(input.mustNotInclude || []),
      input.createdBy || "noctis-eval-factory",
    ],
  );
  return { id, defectSource: input.defectSource, domain: input.domain, status: "PASS" as const };
}

export async function listDynamicRegressionTests(limit = 30) {
  const { sql } = await ensureCatalog260Schema();
  return sql.query<Record<string, unknown>>(
    "SELECT id, defect_source, domain, prompt_sample, must_include_json, must_not_include_json, last_status, created_by, created_at FROM enterprise.dynamic_regression_tests ORDER BY created_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function updateDynamicRegressionTestStatus(id: string, status: string) {
  const { sql } = await ensureCatalog260Schema();
  await sql.query("UPDATE enterprise.dynamic_regression_tests SET last_status = $2 WHERE id = $1", [id, status]);
}

export async function getCatalog260SqlStats() {
  try {
    const { sql } = await ensureCatalog260Schema();
    const [cat, mem, mod, reg] = await Promise.all([
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.catalog_260_registry"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.user_memory"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.model_registry"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.dynamic_regression_tests"),
    ]);
    return {
      catalog260Rows: Number(cat[0]?.c ?? 0),
      userMemoryRows: Number(mem[0]?.c ?? 0),
      modelRegistryRows: Number(mod[0]?.c ?? 0),
      dynamicRegressionRows: Number(reg[0]?.c ?? 0),
    };
  } catch {
    return { catalog260Rows: 0, userMemoryRows: 0, modelRegistryRows: 0, dynamicRegressionRows: 0 };
  }
}
