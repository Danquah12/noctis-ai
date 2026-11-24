/**
 * Noctis Forge v1.0 SQL Persistence Layer (`enterprise.forge_projects`, `enterprise.forge_revisions`)
 */

import { sha256Sync } from "../universal-crypto.ts";
import { ensureAssistantSchema } from "../assistant/persistence.server.ts";

let forgeSchemaReady: Promise<void> | null = null;

export async function ensureForgeSchema() {
  const { sql, dbSource } = await ensureAssistantSchema();
  if (!forgeSchemaReady) {
    forgeSchemaReady = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.forge_projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          stack TEXT NOT NULL,
          prompt TEXT NOT NULL,
          regulated_domain TEXT NOT NULL DEFAULT 'NONE',
          status TEXT NOT NULL DEFAULT 'GENERATED',
          current_revision INTEGER NOT NULL DEFAULT 1,
          spec_json JSONB NOT NULL,
          files_json JSONB NOT NULL,
          qa_security_json JSONB NOT NULL,
          deploy_state_json JSONB NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.forge_revisions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          revision_number INTEGER NOT NULL,
          change_summary TEXT NOT NULL,
          files_json JSONB NOT NULL,
          spec_sha256 TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE INDEX IF NOT EXISTS idx_enterprise_forge_revisions_proj
          ON enterprise.forge_revisions (project_id, revision_number DESC)
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.forge_submissions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          submission_type TEXT NOT NULL DEFAULT 'INQUIRY',
          customer_name TEXT,
          customer_email TEXT,
          payload_json JSONB NOT NULL,
          amount_cents INTEGER NOT NULL DEFAULT 0,
          payment_status TEXT NOT NULL DEFAULT 'RECORDED',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE INDEX IF NOT EXISTS idx_enterprise_forge_submissions_proj
          ON enterprise.forge_submissions (project_id, created_at DESC)
      `);
    })().catch((err) => {
      forgeSchemaReady = null;
      throw err;
    });
  }
  await forgeSchemaReady;
  return { sql, dbSource };
}

export async function saveForgeProjectRecord(input: {
  id: string;
  name: string;
  category: string;
  stack: string;
  prompt: string;
  regulatedDomain: string;
  status: string;
  currentRevision: number;
  spec: Record<string, unknown>;
  files: Record<string, string>;
  qaSecurity: Record<string, unknown>;
  deployState: Record<string, unknown>;
  changeSummary?: string;
  createdBy: string;
}) {
  const { sql } = await ensureForgeSchema();
  const specSha = sha256Sync(JSON.stringify({ spec: input.spec, files: input.files }));
  const changeSummary = (input.changeSummary || `Revision #${input.currentRevision}`).trim();

  await sql.query(
    `INSERT INTO enterprise.forge_projects
      (id, name, category, stack, prompt, regulated_domain, status, current_revision, spec_json, files_json, qa_security_json, deploy_state_json, created_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13, now())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       category = EXCLUDED.category,
       stack = EXCLUDED.stack,
       status = EXCLUDED.status,
       current_revision = EXCLUDED.current_revision,
       spec_json = EXCLUDED.spec_json,
       files_json = EXCLUDED.files_json,
       qa_security_json = EXCLUDED.qa_security_json,
       deploy_state_json = EXCLUDED.deploy_state_json,
       updated_at = now()`,
    [
      input.id,
      input.name,
      input.category,
      input.stack,
      input.prompt,
      input.regulatedDomain,
      input.status,
      input.currentRevision,
      JSON.stringify(input.spec),
      JSON.stringify(input.files),
      JSON.stringify(input.qaSecurity),
      JSON.stringify(input.deployState),
      input.createdBy,
    ],
  );

  const revId = `FREV-${sha256Sync(`${input.id}|rev${input.currentRevision}`).slice(0, 10).toUpperCase()}`;
  await sql.query(
    `INSERT INTO enterprise.forge_revisions
      (id, project_id, revision_number, change_summary, files_json, spec_sha256, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       change_summary = EXCLUDED.change_summary,
       files_json = EXCLUDED.files_json,
       spec_sha256 = EXCLUDED.spec_sha256`,
    [revId, input.id, input.currentRevision, changeSummary, JSON.stringify(input.files), specSha, input.createdBy],
  );

  return { id: input.id, revId, specSha256: specSha };
}

export async function getForgeProjectRecord(projectId: string) {
  const { sql } = await ensureForgeSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM enterprise.forge_projects WHERE id = $1 LIMIT 1",
    [projectId],
  );
  return rows[0] || null;
}

export async function listForgeProjectRecords(limit = 20) {
  const { sql } = await ensureForgeSchema();
  return sql.query<Record<string, unknown>>(
    "SELECT id, name, category, stack, regulated_domain, status, current_revision, qa_security_json, deploy_state_json, updated_at FROM enterprise.forge_projects ORDER BY updated_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function listForgeProjectRevisions(projectId: string, limit = 20) {
  const { sql } = await ensureForgeSchema();
  return sql.query<Record<string, unknown>>(
    "SELECT id, project_id, revision_number, change_summary, files_json, spec_sha256, created_by, created_at FROM enterprise.forge_revisions WHERE project_id = $1 ORDER BY revision_number DESC LIMIT $2",
    [projectId, Math.max(1, Math.min(50, limit))],
  );
}

export async function getForgeSqlStats() {
  try {
    const { sql } = await ensureForgeSchema();
    const [p, r, s] = await Promise.all([
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.forge_projects"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.forge_revisions"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.forge_submissions"),
    ]);
    return {
      forgeProjects: Number(p[0]?.c ?? 0),
      forgeRevisions: Number(r[0]?.c ?? 0),
      forgeSubmissions: Number(s[0]?.c ?? 0),
    };
  } catch {
    return { forgeProjects: 0, forgeRevisions: 0, forgeSubmissions: 0 };
  }
}

export async function saveForgeSubmission(input: {
  projectId: string;
  submissionType: string;
  customerName?: string;
  customerEmail?: string;
  payload: Record<string, unknown>;
  amountCents?: number;
  paymentStatus?: string;
}) {
  const { sql } = await ensureForgeSchema();
  const id = `FSUB-${sha256Sync(`${input.projectId}|${input.customerEmail || ""}|${Date.now()}|${Math.random()}`).slice(0, 10).toUpperCase()}`;
  const amountCents = Math.max(0, Math.round(Number(input.amountCents || 0)));
  const submissionType = (input.submissionType || "INQUIRY").trim().slice(0, 32);
  const paymentStatus = (input.paymentStatus || "RECORDED").trim().slice(0, 32);

  await sql.query(
    `INSERT INTO enterprise.forge_submissions
      (id, project_id, submission_type, customer_name, customer_email, payload_json, amount_cents, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
    [
      id,
      input.projectId,
      submissionType,
      (input.customerName || "Guest").trim().slice(0, 120),
      (input.customerEmail || "").trim().slice(0, 160),
      JSON.stringify(input.payload || {}),
      amountCents,
      paymentStatus,
    ],
  );

  return {
    id,
    projectId: input.projectId,
    submissionType,
    customerName: (input.customerName || "Guest").trim().slice(0, 120),
    customerEmail: (input.customerEmail || "").trim().slice(0, 160),
    amountCents,
    paymentStatus,
    createdAt: new Date().toISOString(),
  };
}

export async function listForgeSubmissions(projectId: string, limit = 50) {
  const { sql } = await ensureForgeSchema();
  return sql.query<Record<string, unknown>>(
    `SELECT id, project_id, submission_type, customer_name, customer_email, payload_json, amount_cents, payment_status, created_at
     FROM enterprise.forge_submissions
     WHERE project_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [projectId, Math.max(1, Math.min(100, limit))],
  );
}
