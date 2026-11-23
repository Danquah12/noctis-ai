/**
 * SQL Persistence Layer for Noctis Universal Assistant v1.0 (Migration 0022)
 *
 * Manages:
 * - enterprise.chatgpt_parity_matrix (100 capabilities)
 * - enterprise.custom_assistants (#37 Custom Assistants)
 * - enterprise.workspaces & enterprise.workspace_documents (#38 Collaborative Workspaces & #59 Research Notebooks)
 * - enterprise.scheduled_tasks (#26/#72 Scheduled Monitoring & Reminders)
 * - enterprise.workflow_runs (#27/#78 Autonomous Workflows)
 * - enterprise.answer_passports & enterprise.benchmark_runs (#91, #93, 100-Task Benchmark)
 */

import { sha256Sync } from "../universal-crypto.ts";
import { ensureEnterpriseSchema } from "../enterprise/persistence.server.ts";
import { NOCTIS_100_CAPABILITY_PARITY_MATRIX } from "./parity-matrix.ts";

let assistantSchemaReady: Promise<void> | null = null;

export async function ensureAssistantSchema() {
  const { sql, dbSource } = await ensureEnterpriseSchema();
  if (!assistantSchemaReady) {
    assistantSchemaReady = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.chatgpt_parity_matrix (
          capability_number INTEGER PRIMARY KEY,
          category TEXT NOT NULL,
          capability_name TEXT NOT NULL,
          noctis_requirement TEXT NOT NULL,
          priority TEXT NOT NULL,
          status TEXT NOT NULL,
          source_modules_json JSONB NOT NULL,
          backend_service TEXT NOT NULL,
          api_endpoint TEXT NOT NULL,
          test_suite TEXT NOT NULL,
          demo_note TEXT NOT NULL,
          dev_estimate TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.custom_assistants (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          tagline TEXT NOT NULL,
          specialist_engine TEXT NOT NULL,
          system_instructions TEXT NOT NULL,
          enabled_tools_json JSONB NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          members_json JSONB NOT NULL,
          project_instructions TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.workspace_documents (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          title TEXT NOT NULL,
          doc_format TEXT NOT NULL,
          revision_number INTEGER NOT NULL DEFAULT 1,
          content_markdown TEXT NOT NULL,
          content_sha256 TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE INDEX IF NOT EXISTS idx_enterprise_workspace_docs_ws
          ON enterprise.workspace_documents (workspace_id, revision_number DESC, updated_at DESC)
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.scheduled_tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          task_type TEXT NOT NULL,
          cron_or_iso TEXT NOT NULL,
          payload_json JSONB NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          next_run_at TIMESTAMPTZ,
          last_run_at TIMESTAMPTZ,
          last_output_summary TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.workflow_runs (
          id TEXT PRIMARY KEY,
          workflow_name TEXT NOT NULL,
          objective TEXT NOT NULL,
          status TEXT NOT NULL,
          requires_human_approval BOOLEAN NOT NULL DEFAULT true,
          approved_by TEXT,
          steps_json JSONB NOT NULL,
          audit_sha256 TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.answer_passports (
          passport_id TEXT PRIMARY KEY,
          domain TEXT NOT NULL,
          prompt_text TEXT NOT NULL,
          inputs_json JSONB NOT NULL,
          answer_summary TEXT NOT NULL,
          source_versions_json JSONB NOT NULL,
          calculation_trace_json JSONB NOT NULL,
          epistemic_confidence NUMERIC(4,2) NOT NULL,
          verification_status TEXT NOT NULL,
          replay_sha256 TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.benchmark_runs (
          run_id TEXT PRIMARY KEY,
          total_tasks INTEGER NOT NULL,
          passed_tasks INTEGER NOT NULL,
          partial_tasks INTEGER NOT NULL,
          failed_tasks INTEGER NOT NULL,
          pass_rate_pct NUMERIC(5,2) NOT NULL,
          avg_latency_ms INTEGER NOT NULL,
          category_scores_json JSONB NOT NULL,
          executed_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
    })().catch((err) => {
      assistantSchemaReady = null;
      throw err;
    });
  }
  await assistantSchemaReady;
  return { sql, dbSource };
}

export async function syncParityMatrixToSql(): Promise<number> {
  const { sql } = await ensureAssistantSchema();
  let synced = 0;
  for (const item of NOCTIS_100_CAPABILITY_PARITY_MATRIX) {
    await sql.query(
      `INSERT INTO enterprise.chatgpt_parity_matrix
        (capability_number, category, capability_name, noctis_requirement, priority, status, source_modules_json, backend_service, api_endpoint, test_suite, demo_note, dev_estimate, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, now())
       ON CONFLICT (capability_number) DO UPDATE SET
         category = EXCLUDED.category,
         capability_name = EXCLUDED.capability_name,
         noctis_requirement = EXCLUDED.noctis_requirement,
         priority = EXCLUDED.priority,
         status = EXCLUDED.status,
         source_modules_json = EXCLUDED.source_modules_json,
         backend_service = EXCLUDED.backend_service,
         api_endpoint = EXCLUDED.api_endpoint,
         test_suite = EXCLUDED.test_suite,
         demo_note = EXCLUDED.demo_note,
         dev_estimate = EXCLUDED.dev_estimate,
         updated_at = now()`,
      [
        item.capabilityNumber,
        item.category,
        item.name,
        item.requirement,
        item.priority,
        item.status,
        JSON.stringify(item.sourceModules),
        item.backendService,
        item.apiEndpoint,
        item.testSuite,
        item.demoNote,
        item.devEstimate,
      ],
    );
    synced += 1;
  }
  return synced;
}

export async function upsertCustomAssistant(input: {
  id?: string;
  name: string;
  tagline: string;
  specialistEngine: string;
  systemInstructions: string;
  enabledTools: string[];
  createdBy?: string;
}) {
  const { sql } = await ensureAssistantSchema();
  const id = input.id || `ASST-${sha256Sync(`${input.name}|${input.specialistEngine}`).slice(0, 10).toUpperCase()}`;
  await sql.query(
    `INSERT INTO enterprise.custom_assistants
      (id, name, tagline, specialist_engine, system_instructions, enabled_tools_json, created_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       tagline = EXCLUDED.tagline,
       specialist_engine = EXCLUDED.specialist_engine,
       system_instructions = EXCLUDED.system_instructions,
       enabled_tools_json = EXCLUDED.enabled_tools_json,
       updated_at = now()`,
    [
      id,
      input.name,
      input.tagline,
      input.specialistEngine,
      input.systemInstructions,
      JSON.stringify(input.enabledTools || []),
      input.createdBy || "noctis-user",
    ],
  );
  return { ok: true, id, name: input.name };
}

export async function listCustomAssistants(limit = 30) {
  const { sql } = await ensureAssistantSchema();
  return sql.query<Record<string, unknown>>(
    "SELECT id, name, tagline, specialist_engine, system_instructions, enabled_tools_json, created_by, updated_at FROM enterprise.custom_assistants ORDER BY updated_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function deleteCustomAssistant(id: string) {
  const { sql } = await ensureAssistantSchema();
  await sql.query("DELETE FROM enterprise.custom_assistants WHERE id = $1", [id]);
  return { deleted: true, id };
}

export async function createWorkspace(input: {
  id?: string;
  name: string;
  description: string;
  ownerId?: string;
  members?: string[];
  projectInstructions?: string;
}) {
  const { sql } = await ensureAssistantSchema();
  const id = input.id || `WS-${sha256Sync(`${input.name}|${Date.now()}`).slice(0, 10).toUpperCase()}`;
  await sql.query(
    `INSERT INTO enterprise.workspaces
      (id, name, description, owner_id, members_json, project_instructions, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       members_json = EXCLUDED.members_json,
       project_instructions = EXCLUDED.project_instructions,
       updated_at = now()`,
    [
      id,
      input.name,
      input.description,
      input.ownerId || "noctis-user",
      JSON.stringify(input.members || ["noctis-user"]),
      input.projectInstructions || "Cite verified sources and apply Domain Safety Validators.",
    ],
  );
  return { ok: true, id, name: input.name };
}

export async function listWorkspaces(limit = 25) {
  const { sql } = await ensureAssistantSchema();
  return sql.query<Record<string, unknown>>(
    "SELECT id, name, description, owner_id, members_json, project_instructions, updated_at FROM enterprise.workspaces ORDER BY updated_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function saveWorkspaceDocumentRevision(input: {
  id?: string;
  workspaceId: string;
  title: string;
  docFormat?: string;
  contentMarkdown: string;
  updatedBy?: string;
}) {
  const { sql } = await ensureAssistantSchema();
  const maxRows = await sql.query<{ max_rev: number }>(
    "SELECT COALESCE(MAX(revision_number), 0)::int AS max_rev FROM enterprise.workspace_documents WHERE workspace_id = $1 AND title = $2",
    [input.workspaceId, input.title],
  );
  const revisionNumber = Number(maxRows[0]?.max_rev ?? 0) + 1;
  const contentSha256 = sha256Sync(input.contentMarkdown);
  const id =
    input.id ||
    `DOC-${sha256Sync(`${input.workspaceId}|${input.title}|rev${revisionNumber}`).slice(0, 12).toUpperCase()}`;
  await sql.query(
    `INSERT INTO enterprise.workspace_documents
      (id, workspace_id, title, doc_format, revision_number, content_markdown, content_sha256, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (id) DO UPDATE SET
       content_markdown = EXCLUDED.content_markdown,
       content_sha256 = EXCLUDED.content_sha256,
       updated_at = now()`,
    [
      id,
      input.workspaceId,
      input.title,
      input.docFormat || "markdown",
      revisionNumber,
      input.contentMarkdown,
      contentSha256,
      input.updatedBy || "noctis-user",
    ],
  );
  return { ok: true, id, workspaceId: input.workspaceId, title: input.title, revisionNumber, contentSha256 };
}

export async function listWorkspaceDocuments(workspaceId?: string, limit = 30) {
  const { sql } = await ensureAssistantSchema();
  if (workspaceId) {
    return sql.query<Record<string, unknown>>(
      "SELECT id, workspace_id, title, doc_format, revision_number, content_markdown, content_sha256, updated_by, updated_at FROM enterprise.workspace_documents WHERE workspace_id = $1 ORDER BY updated_at DESC LIMIT $2",
      [workspaceId, Math.max(1, Math.min(100, limit))],
    );
  }
  return sql.query<Record<string, unknown>>(
    "SELECT id, workspace_id, title, doc_format, revision_number, content_markdown, content_sha256, updated_by, updated_at FROM enterprise.workspace_documents ORDER BY updated_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function createScheduledTask(input: {
  id?: string;
  title: string;
  taskType: "RESEARCH_WATCH" | "REMINDER" | "FRESHNESS_AUDIT" | "POLICY_DRIFT" | "CALENDAR_EVENT";
  cronOrIso: string;
  payload?: Record<string, unknown>;
  createdBy?: string;
}) {
  const { sql } = await ensureAssistantSchema();
  const id = input.id || `SCH-${sha256Sync(`${input.title}|${input.cronOrIso}`).slice(0, 10).toUpperCase()}`;
  const nextRun = /^\d{4}-\d{2}-\d{2}/.test(input.cronOrIso)
    ? new Date(input.cronOrIso).toISOString()
    : new Date(Date.now() + 86400_000).toISOString();
  await sql.query(
    `INSERT INTO enterprise.scheduled_tasks
      (id, title, task_type, cron_or_iso, payload_json, status, next_run_at, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'ACTIVE', $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       cron_or_iso = EXCLUDED.cron_or_iso,
       payload_json = EXCLUDED.payload_json`,
    [id, input.title, input.taskType, input.cronOrIso, JSON.stringify(input.payload || {}), nextRun, input.createdBy || "noctis-user"],
  );
  return { ok: true, id, title: input.title, taskType: input.taskType, nextRunAt: nextRun };
}

export async function listScheduledTasks(limit = 30) {
  const { sql } = await ensureAssistantSchema();
  return sql.query<Record<string, unknown>>(
    "SELECT id, title, task_type, cron_or_iso, payload_json, status, next_run_at, last_run_at, last_output_summary, created_by, created_at FROM enterprise.scheduled_tasks ORDER BY created_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function runScheduledTaskNow(id: string, summary: string) {
  const { sql } = await ensureAssistantSchema();
  await sql.query(
    "UPDATE enterprise.scheduled_tasks SET last_run_at = now(), last_output_summary = $2 WHERE id = $1",
    [id, summary],
  );
  return { executed: true, id, summary, executedAt: new Date().toISOString() };
}

export async function saveWorkflowRun(input: {
  id: string;
  workflowName: string;
  objective: string;
  status: "COMPLETED" | "AWAITING_APPROVAL" | "APPROVED_EXECUTED" | "BLOCKED";
  requiresHumanApproval: boolean;
  approvedBy?: string | null;
  steps: Record<string, unknown>[];
  createdBy?: string;
}) {
  const { sql } = await ensureAssistantSchema();
  const auditSha256 = sha256Sync(JSON.stringify({ id: input.id, objective: input.objective, steps: input.steps }));
  await sql.query(
    `INSERT INTO enterprise.workflow_runs
      (id, workflow_name, objective, status, requires_human_approval, approved_by, steps_json, audit_sha256, created_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, now())
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       approved_by = COALESCE(EXCLUDED.approved_by, enterprise.workflow_runs.approved_by),
       steps_json = EXCLUDED.steps_json,
       audit_sha256 = EXCLUDED.audit_sha256,
       updated_at = now()`,
    [
      input.id,
      input.workflowName,
      input.objective,
      input.status,
      input.requiresHumanApproval,
      input.approvedBy ?? null,
      JSON.stringify(input.steps),
      auditSha256,
      input.createdBy || "noctis-user",
    ],
  );
  return { ok: true, id: input.id, status: input.status, auditSha256 };
}

export async function listWorkflowRuns(limit = 20) {
  const { sql } = await ensureAssistantSchema();
  return sql.query<Record<string, unknown>>(
    "SELECT id, workflow_name, objective, status, requires_human_approval, approved_by, steps_json, audit_sha256, created_by, updated_at FROM enterprise.workflow_runs ORDER BY updated_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function approveWorkflowRun(id: string, approver: string) {
  const { sql } = await ensureAssistantSchema();
  if (!approver || /\b(ai|agent|llm|bot|automated|autonomous|system)\b|^$/i.test(approver.trim())) {
    return { approved: false, reason: "AI agents cannot self-approve external actions; human approver required." as const };
  }
  await sql.query(
    "UPDATE enterprise.workflow_runs SET status = 'APPROVED_EXECUTED', approved_by = $2, updated_at = now() WHERE id = $1",
    [id, approver],
  );
  return { approved: true, id, approvedBy: approver };
}

export async function updateUserMemory(id: string, correctedContent: string) {
  const { sql } = await ensureAssistantSchema();
  const sha = sha256Sync(correctedContent);
  await sql.query(
    "UPDATE enterprise.user_memory SET content_redacted = $2, content_sha256 = $3 WHERE id = $1",
    [id, correctedContent, sha],
  );
  return { updated: true, id, contentSha256: sha };
}

export async function saveAnswerPassport(input: {
  passportId: string;
  domain: string;
  promptText: string;
  inputs: Record<string, unknown>;
  answerSummary: string;
  sourceVersions: Record<string, unknown>[];
  calculationTrace: Record<string, unknown>[];
  epistemicConfidence: number;
  verificationStatus: string;
  replaySha256: string;
  createdBy?: string;
}) {
  const { sql } = await ensureAssistantSchema();
  await sql.query(
    `INSERT INTO enterprise.answer_passports
      (passport_id, domain, prompt_text, inputs_json, answer_summary, source_versions_json, calculation_trace_json, epistemic_confidence, verification_status, replay_sha256, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11)
     ON CONFLICT (passport_id) DO UPDATE SET
       verification_status = EXCLUDED.verification_status,
       replay_sha256 = EXCLUDED.replay_sha256`,
    [
      input.passportId,
      input.domain,
      input.promptText,
      JSON.stringify(input.inputs),
      input.answerSummary,
      JSON.stringify(input.sourceVersions),
      JSON.stringify(input.calculationTrace),
      Number(input.epistemicConfidence.toFixed(2)),
      input.verificationStatus,
      input.replaySha256,
      input.createdBy || "noctis-universal-assistant",
    ],
  );
  return input.passportId;
}

export async function getAnswerPassport(passportId: string) {
  const { sql } = await ensureAssistantSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM enterprise.answer_passports WHERE passport_id = $1 LIMIT 1",
    [passportId],
  );
  return rows[0] || null;
}

export async function listAnswerPassports(limit = 20) {
  const { sql } = await ensureAssistantSchema();
  return sql.query<Record<string, unknown>>(
    "SELECT passport_id, domain, prompt_text, epistemic_confidence::float8 AS epistemic_confidence, verification_status, replay_sha256, created_at FROM enterprise.answer_passports ORDER BY created_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
}

export async function saveBenchmarkRun(input: {
  runId: string;
  totalTasks: number;
  passedTasks: number;
  partialTasks: number;
  failedTasks: number;
  passRatePct: number;
  avgLatencyMs: number;
  categoryScores: Record<string, unknown>;
  executedBy?: string;
}) {
  const { sql } = await ensureAssistantSchema();
  await sql.query(
    `INSERT INTO enterprise.benchmark_runs
      (run_id, total_tasks, passed_tasks, partial_tasks, failed_tasks, pass_rate_pct, avg_latency_ms, category_scores_json, executed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
     ON CONFLICT (run_id) DO NOTHING`,
    [
      input.runId,
      input.totalTasks,
      input.passedTasks,
      input.partialTasks,
      input.failedTasks,
      Number(input.passRatePct.toFixed(2)),
      Math.round(input.avgLatencyMs),
      JSON.stringify(input.categoryScores),
      input.executedBy || "noctis-benchmark-100",
    ],
  );
  return input.runId;
}

export async function listBenchmarkRuns(limit = 10) {
  const { sql } = await ensureAssistantSchema();
  return sql.query<Record<string, unknown>>(
    "SELECT run_id, total_tasks, passed_tasks, partial_tasks, failed_tasks, pass_rate_pct::float8 AS pass_rate_pct, avg_latency_ms, category_scores_json, executed_by, created_at FROM enterprise.benchmark_runs ORDER BY created_at DESC LIMIT $1",
    [Math.max(1, Math.min(50, limit))],
  );
}

export async function getAssistantSqlStats() {
  try {
    const { sql } = await ensureAssistantSchema();
    const [p, ca, ws, wd, sch, wf, ap, br] = await Promise.all([
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.chatgpt_parity_matrix"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.custom_assistants"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.workspaces"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.workspace_documents"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.scheduled_tasks"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.workflow_runs"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.answer_passports"),
      sql.query<{ c: number }>("SELECT count(*)::int AS c FROM enterprise.benchmark_runs"),
    ]);
    return {
      parityRows: Number(p[0]?.c ?? 0),
      customAssistants: Number(ca[0]?.c ?? 0),
      workspaces: Number(ws[0]?.c ?? 0),
      workspaceDocuments: Number(wd[0]?.c ?? 0),
      scheduledTasks: Number(sch[0]?.c ?? 0),
      workflowRuns: Number(wf[0]?.c ?? 0),
      answerPassports: Number(ap[0]?.c ?? 0),
      benchmarkRuns: Number(br[0]?.c ?? 0),
    };
  } catch {
    return {
      parityRows: 0,
      customAssistants: 0,
      workspaces: 0,
      workspaceDocuments: 0,
      scheduledTasks: 0,
      workflowRuns: 0,
      answerPassports: 0,
      benchmarkRuns: 0,
    };
  }
}
