/**
 * Noctis Enterprise Intelligence Platform — SQL Persistence & Hash-Chained Ledgers
 *
 * Supports Managed Neon PostgreSQL (when `DATABASE_URL` is configured or Vite `import.meta.glob`
 * is active) and embedded PGLite WASM seamlessly in local dev and raw Node/tsx test runners.
 */

import { sha256Sync } from "../universal-crypto.ts";
import type {
  AgentActivityRecord,
  AgentProposalRecord,
  ClassificationTier,
  CustodyEventRecord,
  EvalLabCaseResult,
  EvalLabRunRecord,
  VerificationStatus,
} from "./types.ts";

export interface EnterpriseSql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

let resolvedBackendPromise: Promise<{ sql: EnterpriseSql; dbSource: "neon" | "pglite" }> | null = null;
let ensureReadyPromise: Promise<void> | null = null;

async function resolveSqlBackend(): Promise<{ sql: EnterpriseSql; dbSource: "neon" | "pglite" }> {
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
      const sql: EnterpriseSql = {
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

export async function ensureEnterpriseSchema(): Promise<{ sql: EnterpriseSql; dbSource: "neon" | "pglite" }> {
  const backend = await resolveSqlBackend();
  const { sql } = backend;
  if (!ensureReadyPromise) {
    ensureReadyPromise = (async () => {
      await sql.query("CREATE SCHEMA IF NOT EXISTS enterprise");
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.verification_events (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL,
          request_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('PASS', 'REPAIRED', 'FAIL_CLOSED_BLOCK', 'FAIL')),
          rules_checked INT NOT NULL DEFAULT 0,
          violations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          output_sha256 TEXT NOT NULL,
          latency_ms INT NOT NULL DEFAULT 0,
          actor_id TEXT NOT NULL DEFAULT 'system',
          tenant_id TEXT NOT NULL DEFAULT 'tenant:public-sandbox',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.agent_proposals (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          target_resource TEXT NOT NULL,
          risk_tier TEXT NOT NULL DEFAULT 'HIGH',
          classification_level TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
          rationale TEXT NOT NULL,
          payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          payload_sha256 TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('PENDING_HUMAN_AUTH', 'APPROVED', 'DENIED', 'BLOCKED_POLICY')),
          requested_by TEXT NOT NULL,
          reviewed_by TEXT,
          reviewer_role TEXT,
          review_notes TEXT,
          decided_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.agent_activity (
          seq BIGSERIAL PRIMARY KEY,
          agent_id TEXT NOT NULL,
          tool_name TEXT NOT NULL,
          action_type TEXT NOT NULL,
          tenant_id TEXT NOT NULL DEFAULT 'tenant:public-sandbox',
          decision TEXT NOT NULL,
          policy_reason TEXT NOT NULL,
          prev_hash TEXT NOT NULL,
          event_hash TEXT NOT NULL,
          detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.custody_events (
          seq BIGSERIAL PRIMARY KEY,
          artifact_id TEXT NOT NULL,
          artifact_type TEXT NOT NULL,
          custody_state TEXT NOT NULL,
          custodian_id TEXT NOT NULL,
          custodian_role TEXT NOT NULL,
          tenant_id TEXT NOT NULL DEFAULT 'tenant:public-sandbox',
          artifact_sha256 TEXT NOT NULL,
          prev_hash TEXT NOT NULL,
          entry_hash TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.eval_runs (
          id TEXT PRIMARY KEY,
          suite_name TEXT NOT NULL,
          total_cases INT NOT NULL DEFAULT 0,
          passed_cases INT NOT NULL DEFAULT 0,
          failed_cases INT NOT NULL DEFAULT 0,
          accuracy_pct NUMERIC NOT NULL DEFAULT 0,
          duration_ms INT NOT NULL DEFAULT 0,
          results_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          run_sha256 TEXT NOT NULL,
          triggered_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.policy_bundles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          authority_source TEXT NOT NULL,
          rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          bundle_sha256 TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
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
        )
      `);
    })().catch((err) => {
      ensureReadyPromise = null;
      throw err;
    });
  }
  await ensureReadyPromise;
  return backend;
}

export async function recordVerificationEvent(input: {
  id: string;
  domain: string;
  requestId: string;
  status: VerificationStatus;
  rulesChecked: number;
  violations: unknown[];
  outputSha256: string;
  latencyMs: number;
  actorId?: string;
  tenantId?: string;
}): Promise<boolean> {
  try {
    const { sql } = await ensureEnterpriseSchema();
    await sql.query(
      `INSERT INTO enterprise.verification_events
        (id, domain, request_id, status, rules_checked, violations_json, output_sha256, latency_ms, actor_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        input.id,
        input.domain,
        input.requestId,
        input.status,
        input.rulesChecked,
        JSON.stringify(input.violations || []),
        input.outputSha256,
        Math.max(0, Math.round(input.latencyMs)),
        input.actorId || "system",
        input.tenantId || "tenant:public-sandbox",
      ],
    );
    return true;
  } catch {
    return false;
  }
}

export async function listVerificationStats(): Promise<{
  totalChecked: number;
  passedCount: number;
  repairedCount: number;
  blockedCount: number;
  failedCount: number;
  recentEvents: {
    id: string;
    domain: string;
    status: VerificationStatus;
    rulesChecked: number;
    createdAt: string;
  }[];
}> {
  const { sql } = await ensureEnterpriseSchema();
  const [agg, recent] = await Promise.all([
    sql.query<{ status: VerificationStatus; c: number }>(
      "SELECT status, count(*)::int AS c FROM enterprise.verification_events GROUP BY status",
    ),
    sql.query<{
      id: string;
      domain: string;
      status: VerificationStatus;
      rules_checked: number;
      created_at: unknown;
    }>(
      "SELECT id, domain, status, rules_checked, created_at FROM enterprise.verification_events ORDER BY created_at DESC LIMIT 12",
    ),
  ]);
  const counts: Record<string, number> = { PASS: 0, REPAIRED: 0, FAIL_CLOSED_BLOCK: 0, FAIL: 0 };
  for (const row of agg) {
    counts[row.status] = Number(row.c || 0);
  }
  const totalChecked = counts.PASS + counts.REPAIRED + counts.FAIL_CLOSED_BLOCK + counts.FAIL;
  return {
    totalChecked,
    passedCount: counts.PASS,
    repairedCount: counts.REPAIRED,
    blockedCount: counts.FAIL_CLOSED_BLOCK,
    failedCount: counts.FAIL,
    recentEvents: recent.map((r) => ({
      id: r.id,
      domain: r.domain,
      status: r.status,
      rulesChecked: Number(r.rules_checked || 0),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ""),
    })),
  };
}

export async function saveAgentProposal(proposal: Omit<AgentProposalRecord, "createdAt">): Promise<AgentProposalRecord> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO enterprise.agent_proposals
      (id, agent_id, action_type, target_resource, risk_tier, classification_level, rationale, payload_json, payload_sha256, status, requested_by, reviewed_by, reviewer_role, review_notes, decided_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       reviewed_by = EXCLUDED.reviewed_by,
       reviewer_role = EXCLUDED.reviewer_role,
       review_notes = EXCLUDED.review_notes,
       decided_at = EXCLUDED.decided_at
     RETURNING *`,
    [
      proposal.id,
      proposal.agentId,
      proposal.actionType,
      proposal.targetResource,
      proposal.riskTier,
      proposal.classificationLevel,
      proposal.rationale,
      JSON.stringify(proposal.payload || {}),
      proposal.payloadSha256,
      proposal.status,
      proposal.requestedBy,
      proposal.reviewedBy,
      proposal.reviewerRole,
      proposal.reviewNotes,
      proposal.decidedAt,
    ],
  );
  return mapAgentProposalRow(rows[0]!);
}

function mapAgentProposalRow(r: Record<string, unknown>): AgentProposalRecord {
  const payload =
    typeof r.payload_json === "string"
      ? (JSON.parse(r.payload_json) as Record<string, unknown>)
      : ((r.payload_json as Record<string, unknown>) || {});
  return {
    id: String(r.id),
    agentId: String(r.agent_id),
    actionType: String(r.action_type),
    targetResource: String(r.target_resource),
    riskTier: String(r.risk_tier),
    classificationLevel: String(r.classification_level || "UNCLASSIFIED") as ClassificationTier,
    rationale: String(r.rationale),
    payload,
    payloadSha256: String(r.payload_sha256),
    status: String(r.status) as AgentProposalRecord["status"],
    requestedBy: String(r.requested_by),
    reviewedBy: r.reviewed_by ? String(r.reviewed_by) : null,
    reviewerRole: r.reviewer_role ? String(r.reviewer_role) : null,
    reviewNotes: r.review_notes ? String(r.review_notes) : null,
    decidedAt: r.decided_at ? (r.decided_at instanceof Date ? r.decided_at.toISOString() : String(r.decided_at)) : null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ""),
  };
}

export async function listAgentProposals(limit = 25): Promise<AgentProposalRecord[]> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM enterprise.agent_proposals ORDER BY created_at DESC LIMIT $1",
    [Math.max(1, Math.min(100, limit))],
  );
  return rows.map(mapAgentProposalRow);
}

export async function getAgentProposalById(proposalId: string): Promise<AgentProposalRecord | null> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM enterprise.agent_proposals WHERE id = $1 LIMIT 1",
    [proposalId],
  );
  return rows[0] ? mapAgentProposalRow(rows[0]) : null;
}

export async function appendAgentActivity(input: {
  agentId: string;
  toolName: string;
  actionType: string;
  tenantId: string;
  decision: string;
  policyReason: string;
  detail: Record<string, unknown>;
}): Promise<AgentActivityRecord> {
  const { sql } = await ensureEnterpriseSchema();
  const prevRows = await sql.query<{ event_hash: string }>(
    "SELECT event_hash FROM enterprise.agent_activity ORDER BY seq DESC LIMIT 1",
  );
  const prevHash = prevRows[0]?.event_hash || "GENESIS_AGENT_LEDGER";
  const eventHash = sha256Sync(
    JSON.stringify({
      prevHash,
      agentId: input.agentId,
      toolName: input.toolName,
      actionType: input.actionType,
      tenantId: input.tenantId,
      decision: input.decision,
      policyReason: input.policyReason,
      detail: input.detail,
    }),
  );
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO enterprise.agent_activity
      (agent_id, tool_name, action_type, tenant_id, decision, policy_reason, prev_hash, event_hash, detail_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING *`,
    [
      input.agentId,
      input.toolName,
      input.actionType,
      input.tenantId,
      input.decision,
      input.policyReason,
      prevHash,
      eventHash,
      JSON.stringify(input.detail || {}),
    ],
  );
  return mapActivityRow(rows[0]!);
}

function mapActivityRow(r: Record<string, unknown>): AgentActivityRecord {
  const detail =
    typeof r.detail_json === "string"
      ? (JSON.parse(r.detail_json) as Record<string, unknown>)
      : ((r.detail_json as Record<string, unknown>) || {});
  return {
    seq: Number(r.seq),
    agentId: String(r.agent_id),
    toolName: String(r.tool_name),
    actionType: String(r.action_type),
    tenantId: String(r.tenant_id),
    decision: String(r.decision),
    policyReason: String(r.policy_reason),
    prevHash: String(r.prev_hash),
    eventHash: String(r.event_hash),
    detail,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ""),
  };
}

export async function listAgentActivity(limit = 30): Promise<AgentActivityRecord[]> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM enterprise.agent_activity ORDER BY seq DESC LIMIT $1",
    [Math.max(1, Math.min(200, limit))],
  );
  return rows.map(mapActivityRow);
}

export async function verifyAgentActivityHashChain(): Promise<{
  totalEvents: number;
  chainIntact: boolean;
}> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM enterprise.agent_activity ORDER BY seq ASC",
  );
  let expectedPrev = "GENESIS_AGENT_LEDGER";
  for (const r of rows) {
    const rec = mapActivityRow(r);
    if (rec.prevHash !== expectedPrev) {
      return { totalEvents: rows.length, chainIntact: false };
    }
    const recomputed = sha256Sync(
      JSON.stringify({
        prevHash: rec.prevHash,
        agentId: rec.agentId,
        toolName: rec.toolName,
        actionType: rec.actionType,
        tenantId: rec.tenantId,
        decision: rec.decision,
        policyReason: rec.policyReason,
        detail: rec.detail,
      }),
    );
    if (recomputed !== rec.eventHash) {
      return { totalEvents: rows.length, chainIntact: false };
    }
    expectedPrev = rec.eventHash;
  }
  return { totalEvents: rows.length, chainIntact: true };
}

export async function appendCustodyEvent(input: {
  artifactId: string;
  artifactType: string;
  custodyState: string;
  custodianId: string;
  custodianRole: string;
  tenantId: string;
  artifactSha256: string;
  notes: string;
}): Promise<CustodyEventRecord> {
  const { sql } = await ensureEnterpriseSchema();
  const prevRows = await sql.query<{ entry_hash: string }>(
    "SELECT entry_hash FROM enterprise.custody_events WHERE artifact_id = $1 ORDER BY seq DESC LIMIT 1",
    [input.artifactId],
  );
  const prevHash = prevRows[0]?.entry_hash || "GENESIS_CUSTODY";
  const entryHash = sha256Sync(
    JSON.stringify({
      prevHash,
      artifactId: input.artifactId,
      artifactType: input.artifactType,
      custodyState: input.custodyState,
      custodianId: input.custodianId,
      custodianRole: input.custodianRole,
      tenantId: input.tenantId,
      artifactSha256: input.artifactSha256,
      notes: input.notes,
    }),
  );
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO enterprise.custody_events
      (artifact_id, artifact_type, custody_state, custodian_id, custodian_role, tenant_id, artifact_sha256, prev_hash, entry_hash, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.artifactId,
      input.artifactType,
      input.custodyState,
      input.custodianId,
      input.custodianRole,
      input.tenantId,
      input.artifactSha256,
      prevHash,
      entryHash,
      input.notes,
    ],
  );
  return mapCustodyRow(rows[0]!);
}

function mapCustodyRow(r: Record<string, unknown>): CustodyEventRecord {
  return {
    seq: Number(r.seq),
    artifactId: String(r.artifact_id),
    artifactType: String(r.artifact_type),
    custodyState: String(r.custody_state),
    custodianId: String(r.custodian_id),
    custodianRole: String(r.custodian_role),
    tenantId: String(r.tenant_id),
    artifactSha256: String(r.artifact_sha256),
    prevHash: String(r.prev_hash),
    entryHash: String(r.entry_hash),
    notes: String(r.notes || ""),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ""),
  };
}

export async function listCustodyEvents(artifactId?: string, limit = 50): Promise<CustodyEventRecord[]> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = artifactId
    ? await sql.query<Record<string, unknown>>(
        "SELECT * FROM enterprise.custody_events WHERE artifact_id = $1 ORDER BY seq ASC LIMIT $2",
        [artifactId, Math.max(1, Math.min(200, limit))],
      )
    : await sql.query<Record<string, unknown>>(
        "SELECT * FROM enterprise.custody_events ORDER BY seq DESC LIMIT $1",
        [Math.max(1, Math.min(200, limit))],
      );
  return rows.map(mapCustodyRow);
}

export async function getCustodySummaryCounts(): Promise<{ distinctArtifacts: number; totalEvents: number }> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = await sql.query<{ artifacts: number; events: number }>(
    "SELECT count(DISTINCT artifact_id)::int AS artifacts, count(*)::int AS events FROM enterprise.custody_events",
  );
  return {
    distinctArtifacts: Number(rows[0]?.artifacts ?? 0),
    totalEvents: Number(rows[0]?.events ?? 0),
  };
}

export async function recordEvalRun(run: Omit<EvalLabRunRecord, "createdAt">): Promise<EvalLabRunRecord> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO enterprise.eval_runs
      (id, suite_name, total_cases, passed_cases, failed_cases, accuracy_pct, duration_ms, results_json, run_sha256, triggered_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [
      run.id,
      run.suiteName,
      run.totalCases,
      run.passedCases,
      run.failedCases,
      run.accuracyPct,
      Math.max(0, Math.round(run.durationMs)),
      JSON.stringify(run.results || []),
      run.runSha256,
      run.triggeredBy,
    ],
  );
  return rows[0] ? mapEvalRunRow(rows[0]) : { ...run, createdAt: new Date().toISOString() };
}

function mapEvalRunRow(r: Record<string, unknown>): EvalLabRunRecord {
  const results =
    typeof r.results_json === "string"
      ? (JSON.parse(r.results_json) as EvalLabCaseResult[])
      : ((r.results_json as EvalLabCaseResult[]) || []);
  return {
    id: String(r.id),
    suiteName: String(r.suite_name),
    totalCases: Number(r.total_cases),
    passedCases: Number(r.passed_cases),
    failedCases: Number(r.failed_cases),
    accuracyPct: Number(r.accuracy_pct),
    durationMs: Number(r.duration_ms),
    results,
    runSha256: String(r.run_sha256),
    triggeredBy: String(r.triggered_by),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ""),
  };
}

export async function listEvalRuns(limit = 10): Promise<EvalLabRunRecord[]> {
  const { sql } = await ensureEnterpriseSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM enterprise.eval_runs ORDER BY created_at DESC LIMIT $1",
    [Math.max(1, Math.min(50, limit))],
  );
  return rows.map(mapEvalRunRow);
}

export async function savePolicyBundle(bundle: {
  id: string;
  name: string;
  version: string;
  authoritySource: string;
  rules: unknown[];
  bundleSha256: string;
  createdBy: string;
}): Promise<void> {
  try {
    const { sql } = await ensureEnterpriseSchema();
    await sql.query(
      `INSERT INTO enterprise.policy_bundles
        (id, name, version, authority_source, rules_json, bundle_sha256, status, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'ACTIVE', $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         version = EXCLUDED.version,
         authority_source = EXCLUDED.authority_source,
         rules_json = EXCLUDED.rules_json,
         bundle_sha256 = EXCLUDED.bundle_sha256`,
      [
        bundle.id,
        bundle.name,
        bundle.version,
        bundle.authoritySource,
        JSON.stringify(bundle.rules || []),
        bundle.bundleSha256,
        bundle.createdBy,
      ],
    );
  } catch {
    /* non-fatal */
  }
}

export async function persistTelemetryEvents(
  ingestId: string,
  events: Array<{
    eventId: string;
    detectedProtocol: string;
    targetSovereignSuite: string;
    sqdecPillar: string;
    severity: string;
    summary: string;
    auditSha256: string;
    normalizedEntities?: Record<string, unknown>;
  }>,
): Promise<number> {
  if (!Array.isArray(events) || events.length === 0) return 0;
  try {
    const { sql } = await ensureEnterpriseSchema();
    let inserted = 0;
    for (const ev of events) {
      const hostname =
        typeof ev.normalizedEntities?.hostname === "string"
          ? ev.normalizedEntities.hostname
          : typeof ev.normalizedEntities?.host === "string"
          ? ev.normalizedEntities.host
          : "noctis-edge-node";
      await sql.query(
        `INSERT INTO enterprise.telemetry_events
          (id, ingest_id, protocol, suite, pillar, severity, hostname, summary, payload_sha256, payload_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [
          ev.eventId,
          ingestId,
          ev.detectedProtocol,
          ev.targetSovereignSuite,
          ev.sqdecPillar,
          ev.severity,
          hostname,
          ev.summary,
          ev.auditSha256,
          JSON.stringify(ev),
        ],
      );
      inserted += 1;
    }
    return inserted;
  } catch {
    return 0;
  }
}

export async function getPersistedTelemetryStats(): Promise<{
  totalPersisted: number;
  criticalCount: number;
  latestIngestedAt: string | null;
}> {
  try {
    const { sql } = await ensureEnterpriseSchema();
    const rows = await sql.query<{ c: number; crit: number; latest: unknown }>(
      `SELECT count(*)::int AS c,
              count(*) FILTER (WHERE severity = 'CRITICAL')::int AS crit,
              max(created_at) AS latest
       FROM enterprise.telemetry_events`,
    );
    const r = rows[0];
    return {
      totalPersisted: Number(r?.c ?? 0),
      criticalCount: Number(r?.crit ?? 0),
      latestIngestedAt: r?.latest instanceof Date ? r.latest.toISOString() : r?.latest ? String(r.latest) : null,
    };
  } catch {
    return { totalPersisted: 0, criticalCount: 0, latestIngestedAt: null };
  }
}

export async function listPersistedTelemetryEvents(limit = 20): Promise<Record<string, unknown>[]> {
  try {
    const { sql } = await ensureEnterpriseSchema();
    return await sql.query<Record<string, unknown>>(
      "SELECT id, ingest_id, protocol, suite, pillar, severity, hostname, summary, payload_sha256, created_at FROM enterprise.telemetry_events ORDER BY created_at DESC LIMIT $1",
      [Math.max(1, Math.min(100, limit))],
    );
  } catch {
    return [];
  }
}

const TARGET_ENTERPRISE_SCHEMAS = [
  "enterprise",
  "ndkrs",
  "rmf",
  "governance",
  "assessment",
  "monitoring",
  "cyber",
  "graph",
  "agents",
  "intelligence",
  "training",
  "security",
];

export async function getSchemaTableCounts(): Promise<{
  dbSource: "neon" | "pglite";
  schemas: Record<string, { tables: { table: string; rows: number }[]; totalRows: number; nonEmptyTables: number }>;
  totalTablesTracked: number;
  nonEmptyTablesCount: number;
}> {
  const { sql, dbSource } = await ensureEnterpriseSchema();
  const rows = await sql.query<{ table_schema: string; table_name: string }>(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_type = 'BASE TABLE'
       AND table_schema = ANY($1::text[])
     ORDER BY table_schema, table_name`,
    [TARGET_ENTERPRISE_SCHEMAS],
  );

  const schemas: Record<string, { tables: { table: string; rows: number }[]; totalRows: number; nonEmptyTables: number }> = {};
  let nonEmptyTablesCount = 0;

  for (const r of rows) {
    const sName = String(r.table_schema);
    const tName = String(r.table_name);
    if (!schemas[sName]) {
      schemas[sName] = { tables: [], totalRows: 0, nonEmptyTables: 0 };
    }
    let count = 0;
    try {
      const res = await sql.query<{ c: number }>(`SELECT count(*)::int AS c FROM "${sName}"."${tName}"`);
      count = Number(res[0]?.c ?? 0);
    } catch {
      count = 0;
    }
    schemas[sName]!.tables.push({ table: tName, rows: count });
    schemas[sName]!.totalRows += count;
    if (count > 0) {
      schemas[sName]!.nonEmptyTables += 1;
      nonEmptyTablesCount += 1;
    }
  }

  let totalTablesTracked = rows.length;
  if (dbSource === "pglite" && !schemas["ndkrs"]) {
    try {
      const { ensureNdkrsSchema } = await import("../ndkrs/persistence.server.ts");
      const ndkrsSql = await ensureNdkrsSchema();
      const ndkrsRows = await ndkrsSql.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_type = 'BASE TABLE' AND table_schema = 'ndkrs'
         ORDER BY table_name`,
      );
      schemas["ndkrs"] = { tables: [], totalRows: 0, nonEmptyTables: 0 };
      totalTablesTracked += ndkrsRows.length;
      for (const nr of ndkrsRows) {
        const tName = String(nr.table_name);
        const res = await ndkrsSql.query<{ c: number }>(`SELECT count(*)::int AS c FROM "ndkrs"."${tName}"`);
        const count = Number(res[0]?.c ?? 0);
        schemas["ndkrs"]!.tables.push({ table: tName, rows: count });
        schemas["ndkrs"]!.totalRows += count;
        if (count > 0) {
          schemas["ndkrs"]!.nonEmptyTables += 1;
          nonEmptyTablesCount += 1;
        }
      }
    } catch {
      /* ignore when NDKRS not initialized */
    }
  }

  return {
    dbSource,
    schemas,
    totalTablesTracked,
    nonEmptyTablesCount,
  };
}
