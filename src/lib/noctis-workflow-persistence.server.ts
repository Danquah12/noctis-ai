import { createHash } from "node:crypto";

/**
 * Tenant-scoped PostgreSQL workflow persistence adapter.
 *
 * This adapter is intentionally not wired to an application route or worker.
 * Its caller MUST derive tenantId and workerId from authenticated server-side
 * identity. Never pass client-supplied authorization claims as trusted context.
 *
 * The database role should be restricted to the workflow tables. Engine
 * execution remains outside this module and disabled until separate approval,
 * sandbox, evidence-resolution and authorization services are integrated.
 */

export type NoctisSqlResult<Row> = { rows: Row[]; rowCount?: number | null };

export interface NoctisWorkflowSqlExecutor {
  query<Row = Record<string, unknown>>(
    sql: string,
    parameters?: readonly unknown[],
  ): Promise<NoctisSqlResult<Row>>;
}

export interface NoctisWorkflowSqlDatabase extends NoctisWorkflowSqlExecutor {
  transaction<T>(operation: (tx: NoctisWorkflowSqlExecutor) => Promise<T>): Promise<T>;
}

export type NoctisTrustedWorkflowContext = {
  /** Must be derived from the authenticated server session, never request JSON. */
  tenantId: string;
  /** Stable worker/service identity derived by the trusted server. */
  workerId: string;
};

export type NoctisEvidenceResolution = {
  status: "approved" | "rejected" | "missing" | "unavailable";
  tenantId: string;
  evidenceId: string;
  sourceId: string;
  chunkId: string;
  sourceStatus: "approved" | "revoked" | "quarantined" | "unknown";
  accessAllowed: boolean;
  validUntil: string | null;
  revokedAt: string | null;
};

export type NoctisApprovalResolution = {
  status: "approved" | "rejected" | "missing" | "expired" | "revoked" | "unavailable";
  tenantId: string;
  approvalId: string;
  workflowId: string;
  taskId: string;
  engineId: string;
  capability: string;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  approvalType: "task_execution";
  approverAuthorized: boolean;
};

export type NoctisWorkflowGateContext = {
  tenantId: string;
  workflowId: string;
  taskId: string;
  engineId: string;
  capability: string;
  at: string;
};

export interface NoctisWorkflowGateResolvers {
  /** Must query authoritative tenant-scoped evidence, access, revocation and freshness records. */
  resolveEvidence(tx: NoctisWorkflowSqlExecutor, context: NoctisWorkflowGateContext & {
    evidenceRefs: readonly string[];
  }): Promise<readonly NoctisEvidenceResolution[]>;
  /** Must query the authoritative approval ledger, verify approver authority, and bind the grant to this exact task capability. */
  resolveApproval(tx: NoctisWorkflowSqlExecutor, context: NoctisWorkflowGateContext & {
    approvalRef: string;
  }): Promise<NoctisApprovalResolution>;
}

export type NoctisClaimInput = NoctisTrustedWorkflowContext & {
  at: string;
  leaseExpiresAt: string;
  leaseToken: string;
  attemptId: string;
  eventId: string;
  correlationId: string;
};

export type NoctisClaimedTask = {
  taskRecordId: string;
  workflowId: string;
  taskId: string;
  engineId: string;
  capability: string;
  attemptNumber: number;
  leaseOwner: string;
  leaseToken: string;
  leaseExpiresAt: string;
};

export type NoctisTaskFinishInput = NoctisTrustedWorkflowContext & {
  taskRecordId: string;
  leaseToken: string;
  at: string;
  eventId: string;
  correlationId: string;
  outcome: "succeeded" | "failed";
  result?: unknown;
  failureCode?: string;
  failureReason?: string;
};

export type NoctisPersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "INVALID_INPUT" | "NOT_CLAIMED" | "LEASE_LOST" | "NOT_RUNNING" | "IDEMPOTENCY_CONFLICT" };

type ClaimRow = {
  task_record_id: string;
  workflow_id: string;
  task_id: string;
  engine_id: string;
  capability: string;
  attempt_count: number;
};

function validUtc(value: string): boolean {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function nonEmpty(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function canonicalizeJson(value: unknown, seen = new WeakSet<object>()): unknown | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    if (seen.has(value)) return undefined;
    seen.add(value);
    const items = value.map((item) => canonicalizeJson(item, seen));
    seen.delete(value);
    return items.some((item) => item === undefined) ? undefined : items;
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (seen.has(object) || (Object.getPrototypeOf(object) !== Object.prototype && Object.getPrototypeOf(object) !== null)) {
      return undefined;
    }
    seen.add(object);
    const normalized: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(object).sort()) {
      const item = canonicalizeJson(object[key], seen);
      if (item === undefined) {
        seen.delete(object);
        return undefined;
      }
      normalized[key] = item;
    }
    seen.delete(object);
    return normalized;
  }
  return undefined;
}

function fingerprintJson(value: unknown): string | null {
  const normalized = canonicalizeJson(value);
  if (normalized === undefined) return null;
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export type NoctisWorkflowCreateTaskInput = {
  taskRecordId: string;
  taskId: string;
  engineId: string;
  capability: string;
  dependsOn?: readonly string[];
  evidenceRequired?: boolean;
  evidenceRefs?: readonly string[];
  approvalRequired?: boolean;
  approvalRef?: string;
  maxAttempts?: number;
  priority?: number;
};

export type NoctisWorkflowCreateInput = {
  /** Tenant and actor must come from authenticated server context. */
  tenantId: string;
  actorId: string;
  workflowId: string;
  idempotencyKey: string;
  planVersion: string;
  requestSummary?: string;
  policy?: Record<string, unknown>;
  at: string;
  eventId: string;
  correlationId: string;
  tasks: readonly NoctisWorkflowCreateTaskInput[];
};

/**
 * Creates a workflow and all task rows atomically. Replays with the same
 * tenant/key and identical canonical request return the existing workflow.
 * Reusing a key for a different request is rejected. No tasks are dispatched.
 */
export async function createNoctisWorkflowIdempotently(
  db: NoctisWorkflowSqlDatabase,
  input: NoctisWorkflowCreateInput,
): Promise<NoctisPersistenceResult<{ workflowId: string; created: boolean }>> {
  if (!nonEmpty(input.tenantId) || !nonEmpty(input.actorId) ||
      !nonEmpty(input.workflowId) || !nonEmpty(input.idempotencyKey) ||
      !nonEmpty(input.planVersion) || !nonEmpty(input.eventId) ||
      !nonEmpty(input.correlationId) || !validUtc(input.at) ||
      input.idempotencyKey.length > 200 || input.idempotencyKey !== input.idempotencyKey.trim() ||
      (input.requestSummary !== undefined && input.requestSummary.length > 2000) ||
      !Array.isArray(input.tasks) || input.tasks.length < 1 || input.tasks.length > 200) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const taskIds = new Set<string>();
  const taskRecordIds = new Set<string>();
  for (const task of input.tasks) {
    if (!nonEmpty(task.taskRecordId) || !nonEmpty(task.taskId) ||
        !nonEmpty(task.engineId) || !nonEmpty(task.capability) ||
        taskIds.has(task.taskId) || taskRecordIds.has(task.taskRecordId) ||
        !Number.isInteger(task.maxAttempts ?? 1) || (task.maxAttempts ?? 1) < 1 ||
        (task.maxAttempts ?? 1) > 5 ||
        !Number.isInteger(task.priority ?? 0) ||
        (task.priority ?? 0) < -100 || (task.priority ?? 0) > 100 ||
        (task.dependsOn ?? []).some((id) => !nonEmpty(id)) ||
        (task.evidenceRefs ?? []).some((id) => !nonEmpty(id)) ||
        (task.approvalRef !== undefined && !nonEmpty(task.approvalRef))) {
      return { ok: false, code: "INVALID_INPUT" };
    }
    taskIds.add(task.taskId);
    taskRecordIds.add(task.taskRecordId);
  }
  for (const task of input.tasks) {
    const dependencies = task.dependsOn ?? [];
    if (new Set(dependencies).size !== dependencies.length ||
        dependencies.some((dependency) => dependency === task.taskId || !taskIds.has(dependency))) {
      return { ok: false, code: "INVALID_INPUT" };
    }
  }
  const resolved = new Set<string>();
  while (resolved.size < taskIds.size) {
    const next = input.tasks
      .filter((task) => !resolved.has(task.taskId))
      .filter((task) => (task.dependsOn ?? []).every((dependency) => resolved.has(dependency)));
    if (next.length === 0) return { ok: false, code: "INVALID_INPUT" };
    for (const task of next) resolved.add(task.taskId);
  }

  const policy = input.policy ?? {};
  const semanticRequest = {
    tenantId: input.tenantId,
    actorId: input.actorId,
    planVersion: input.planVersion,
    requestSummary: input.requestSummary ?? "",
    policy,
    tasks: input.tasks.map((task) => ({
      taskId: task.taskId,
      engineId: task.engineId,
      capability: task.capability,
      dependsOn: [...(task.dependsOn ?? [])],
      evidenceRequired: task.evidenceRequired ?? false,
      evidenceRefs: [...(task.evidenceRefs ?? [])],
      approvalRequired: task.approvalRequired ?? false,
      approvalRef: task.approvalRef ?? null,
      maxAttempts: task.maxAttempts ?? 1,
      priority: task.priority ?? 0,
    })),
  };
  const requestFingerprint = fingerprintJson(semanticRequest);
  const policyJson = fingerprintJson(policy);
  if (!requestFingerprint || !policyJson) return { ok: false, code: "INVALID_INPUT" };

  return db.transaction(async (tx) => {
    const inserted = await tx.query<{ workflow_id: string }>(
      `INSERT INTO noctis_workflows
         (workflow_id, tenant_id, created_by, idempotency_key, request_fingerprint,
          plan_version, state, request_summary, policy, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'planned',$7,$8::jsonb,$9::timestamptz,$9::timestamptz)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
       RETURNING workflow_id`,
      [input.workflowId, input.tenantId, input.actorId, input.idempotencyKey,
       requestFingerprint, input.planVersion, input.requestSummary ?? "",
       JSON.stringify(policy), input.at],
    );
    if (inserted.rows.length === 0) {
      const existing = await tx.query<{ workflow_id: string; request_fingerprint: string }>(
        `SELECT workflow_id, request_fingerprint
         FROM noctis_workflows
         WHERE tenant_id = $1 AND idempotency_key = $2
         FOR UPDATE`,
        [input.tenantId, input.idempotencyKey],
      );
      const row = existing.rows[0];
      if (!row) return { ok: false, code: "INVALID_INPUT" as const };
      if (row.request_fingerprint !== requestFingerprint) {
        return { ok: false, code: "IDEMPOTENCY_CONFLICT" as const };
      }
      return { ok: true, value: { workflowId: row.workflow_id, created: false } };
    }

    for (const task of input.tasks) {
      await tx.query(
        `INSERT INTO noctis_workflow_tasks
           (task_record_id, workflow_id, task_id, engine_id, capability, state,
            dependencies, evidence_required, evidence_refs, approval_required,
            approval_ref, max_attempts, priority, available_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'pending',$6::jsonb,$7,$8::jsonb,$9,$10,$11,$12,
                 $13::timestamptz,$13::timestamptz,$13::timestamptz)`,
        [task.taskRecordId, input.workflowId, task.taskId, task.engineId, task.capability,
         JSON.stringify(task.dependsOn ?? []), task.evidenceRequired ?? false,
         JSON.stringify(task.evidenceRefs ?? []), task.approvalRequired ?? false,
         task.approvalRef ?? null, task.maxAttempts ?? 1, task.priority ?? 0, input.at],
      );
    }
    await tx.query(
      `INSERT INTO noctis_workflow_events
         (event_id, workflow_id, event_type, actor_type, actor_id,
          correlation_id, idempotency_key, occurred_at, event_data)
       VALUES ($1,$2,'workflow.created','user',$3,$4,$5,$6::timestamptz,$7::jsonb)`,
      [input.eventId, input.workflowId, input.actorId, input.correlationId,
       `workflow.created:${input.idempotencyKey}`, input.at,
       JSON.stringify({ taskCount: input.tasks.length, planVersion: input.planVersion })],
    );
    return { ok: true, value: { workflowId: input.workflowId, created: true } };
  });
}

/**
 * Recomputes the parent workflow state from persisted task states.
 * This is a database projection only; it does not dispatch or authorize work.
 */
async function refreshNoctisWorkflowState(
  tx: NoctisWorkflowSqlExecutor,
  workflowId: string,
  at: string,
): Promise<void> {
  await tx.query(
    `UPDATE noctis_workflows w
     SET state = summary.state,
         updated_at = $2::timestamptz,
         completed_at = CASE
           WHEN summary.state IN ('succeeded', 'failed', 'cancelled') THEN $2::timestamptz
           ELSE NULL
         END
     FROM (
       SELECT
         CASE
           WHEN COUNT(*) = 0 THEN 'planned'
           WHEN COUNT(*) FILTER (WHERE state NOT IN ('succeeded', 'skipped')) = 0 THEN 'succeeded'
           WHEN COUNT(*) FILTER (WHERE state NOT IN ('succeeded', 'failed', 'skipped', 'cancelled')) = 0
             AND COUNT(*) FILTER (WHERE state = 'cancelled') > 0 THEN 'cancelled'
           WHEN COUNT(*) FILTER (WHERE state NOT IN ('succeeded', 'failed', 'skipped', 'cancelled')) = 0
             AND COUNT(*) FILTER (WHERE state = 'failed') > 0 THEN 'failed'
           WHEN COUNT(*) FILTER (WHERE state = 'blocked') > 0 THEN 'blocked'
           WHEN COUNT(*) FILTER (WHERE state = 'waiting_approval') > 0 THEN 'waiting_approval'
           WHEN COUNT(*) FILTER (WHERE state = 'running') > 0 THEN 'running'
           WHEN COUNT(*) FILTER (WHERE state = 'ready') > 0 THEN 'ready'
           ELSE 'planned'
         END AS state
       FROM noctis_workflow_tasks
       WHERE workflow_id = $1
     ) summary
     WHERE w.workflow_id = $1`,
    [workflowId, at],
  );
}

/**
 * Claims at most one ready task for the authenticated tenant.
 *
 * Row selection uses FOR UPDATE SKIP LOCKED; task state, lease, attempt record,
 * and audit event are committed in one transaction. Dependencies are resolved
 * within the same workflow and tenant. A missing evidence/approval reference
 * blocks claim but does not imply that the referenced item is authentic.
 */
export async function claimNoctisWorkflowTask(
  db: NoctisWorkflowSqlDatabase,
  input: NoctisClaimInput,
  gates: NoctisWorkflowGateResolvers,
): Promise<NoctisPersistenceResult<NoctisClaimedTask | null>> {
  if (!nonEmpty(input.tenantId) || !nonEmpty(input.workerId) ||
      !nonEmpty(input.leaseToken) || !nonEmpty(input.at) ||
      !nonEmpty(input.leaseExpiresAt) || !nonEmpty(input.attemptId) ||
      !nonEmpty(input.eventId) || !nonEmpty(input.correlationId) ||
      !validUtc(input.at) || !validUtc(input.leaseExpiresAt) ||
      Date.parse(input.leaseExpiresAt) <= Date.parse(input.at)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  return db.transaction(async (tx) => {
    const candidates = await tx.query<{
      task_record_id: string; workflow_id: string; task_id: string;
      engine_id: string; capability: string; attempt_count: number;
      evidence_required: boolean; evidence_refs: string[];
      approval_required: boolean; approval_ref: string | null;
    }>(
      `SELECT t.task_record_id, t.workflow_id, t.task_id, t.engine_id,
              t.capability, t.attempt_count, t.evidence_required,
              t.evidence_refs, t.approval_required, t.approval_ref
       FROM noctis_workflow_tasks t
       JOIN noctis_workflows w ON w.workflow_id = t.workflow_id
       WHERE w.tenant_id = $1 AND t.state = 'ready'
         AND t.available_at <= $2::timestamptz
         AND t.attempt_count < t.max_attempts AND t.lease_token IS NULL
         AND (NOT t.evidence_required OR
              (jsonb_typeof(t.evidence_refs) = 'array' AND jsonb_array_length(t.evidence_refs) > 0))
         AND (NOT t.approval_required OR NULLIF(BTRIM(t.approval_ref), '') IS NOT NULL)
         AND jsonb_typeof(t.dependencies) = 'array'
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(t.dependencies) dep(task_id)
           WHERE NOT EXISTS (
             SELECT 1 FROM noctis_workflow_tasks d
             WHERE d.workflow_id = t.workflow_id
               AND d.task_id = dep.task_id AND d.state = 'succeeded'
           )
         )
       ORDER BY t.priority DESC, t.available_at ASC, t.created_at ASC
       LIMIT 20 FOR UPDATE OF t SKIP LOCKED`,
      [input.tenantId, input.at],
    );
    if (candidates.rows.length === 0) return { ok: true, value: null };
    for (const row of candidates.rows) {
    const gateContext: NoctisWorkflowGateContext = {
      tenantId: input.tenantId, workflowId: row.workflow_id,
      taskId: row.task_id, engineId: row.engine_id,
      capability: row.capability, at: input.at,
    };

    if (row.evidence_required) {
      if (!Array.isArray(row.evidence_refs) || row.evidence_refs.length === 0 ||
          row.evidence_refs.some((id) => !nonEmpty(id)) ||
          new Set(row.evidence_refs).size !== row.evidence_refs.length) {
        continue;
      }
      let resolved: readonly NoctisEvidenceResolution[];
      try {
        resolved = await gates.resolveEvidence(tx, { ...gateContext, evidenceRefs: row.evidence_refs });
      } catch {
        continue;
      }
      const valid = Array.isArray(resolved) && resolved.length === row.evidence_refs.length &&
        resolved.every((item) => item !== null && typeof item === "object") &&
        row.evidence_refs.every((id) => resolved.filter((item) =>
          item.evidenceId === id && item.tenantId === input.tenantId &&
          item.status === "approved" && item.sourceStatus === "approved" &&
          item.accessAllowed && item.revokedAt === null &&
          (item.validUntil === null || (validUtc(item.validUntil) && Date.parse(item.validUntil) > Date.parse(input.at))) &&
          nonEmpty(item.sourceId) && nonEmpty(item.chunkId),
        ).length === 1);
      if (!valid) continue;
    }

    if (row.approval_required) {
      if (!nonEmpty(row.approval_ref ?? "")) continue;
      let approval: NoctisApprovalResolution;
      try {
        approval = await gates.resolveApproval(tx, { ...gateContext, approvalRef: row.approval_ref! });
      } catch {
        continue;
      }
      if (!approval || typeof approval !== "object" ||
          approval.status !== "approved" || approval.tenantId !== input.tenantId ||
          approval.approvalType !== "task_execution" || approval.approverAuthorized !== true ||
          approval.approvalId !== row.approval_ref ||
          approval.workflowId !== row.workflow_id || approval.taskId !== row.task_id ||
          approval.engineId !== row.engine_id || approval.capability !== row.capability ||
          !nonEmpty(approval.approvedBy) || !validUtc(approval.approvedAt) ||
          Date.parse(approval.approvedAt) > Date.parse(input.at) ||
          approval.revokedAt !== null ||
          (approval.expiresAt !== null &&
            (!validUtc(approval.expiresAt) || Date.parse(approval.expiresAt) <= Date.parse(input.at)))) {
        continue;
      }
    }

    const updated = await tx.query<{ attempt_count: number }>(
      `UPDATE noctis_workflow_tasks
       SET state = 'running', lease_owner = $1, lease_token = $2,
           lease_expires_at = $3::timestamptz, attempt_count = attempt_count + 1,
           updated_at = $4::timestamptz
       WHERE task_record_id = $5 AND state = 'ready' AND lease_token IS NULL
       RETURNING attempt_count`,
      [input.workerId, input.leaseToken, input.leaseExpiresAt, input.at, row.task_record_id],
    );
    if ((updated.rowCount ?? 0) !== 1) continue;
    const attemptNumber = updated.rows[0].attempt_count;

    await refreshNoctisWorkflowState(tx, row.workflow_id, input.at);
    await tx.query(
      `INSERT INTO noctis_workflow_attempts
         (attempt_id, workflow_id, task_record_id, attempt_number, worker_id, started_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
      [input.attemptId, row.workflow_id, row.task_record_id, attemptNumber, input.workerId, input.at],
    );
    await tx.query(
      `INSERT INTO noctis_workflow_events
         (event_id, workflow_id, task_record_id, event_type, actor_type, actor_id,
          correlation_id, idempotency_key, occurred_at, event_data)
       VALUES ($1, $2, $3, 'task.claimed', 'worker', $4, $5, $6, $7::timestamptz, $8::jsonb)`,
      [input.eventId, row.workflow_id, row.task_record_id, input.workerId,
       input.correlationId, `claim:${row.task_record_id}:${attemptNumber}`, input.at,
       JSON.stringify({ attemptNumber, leaseExpiresAt: input.leaseExpiresAt,
         evidenceResolved: row.evidence_required, approvalResolved: row.approval_required })],
    );

    return { ok: true, value: {
      taskRecordId: row.task_record_id, workflowId: row.workflow_id,
      taskId: row.task_id, engineId: row.engine_id, capability: row.capability,
      attemptNumber, leaseOwner: input.workerId, leaseToken: input.leaseToken,
      leaseExpiresAt: input.leaseExpiresAt,
    } };
    }
    return { ok: true, value: null };
  });
}

/**
 * Completes a running task only when tenant, worker, lease token and unexpired
 * lease all match. Attempt closure, task update and audit event are atomic.
 */
export async function finishNoctisWorkflowTask(
  db: NoctisWorkflowSqlDatabase,
  input: NoctisTaskFinishInput,
): Promise<NoctisPersistenceResult<{ taskRecordId: string; outcome: "succeeded" | "failed" }>> {
  if (!nonEmpty(input.tenantId) || !nonEmpty(input.workerId) ||
      !nonEmpty(input.taskRecordId) || !nonEmpty(input.leaseToken) ||
      !nonEmpty(input.eventId) || !nonEmpty(input.correlationId) ||
      !validUtc(input.at) ||
      (input.outcome === "failed" && (!nonEmpty(input.failureCode ?? "") || !nonEmpty(input.failureReason ?? "")))) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  return db.transaction(async (tx) => {
    const locked = await tx.query<{ workflow_id: string; task_record_id: string }>(
      `SELECT t.workflow_id, t.task_record_id
       FROM noctis_workflow_tasks t
       JOIN noctis_workflows w ON w.workflow_id = t.workflow_id
       WHERE t.task_record_id = $1 AND w.tenant_id = $2
         AND t.state = 'running'
         AND t.lease_owner = $3
         AND t.lease_token = $4
         AND t.lease_expires_at > $5::timestamptz
       FOR UPDATE OF t`,
      [input.taskRecordId, input.tenantId, input.workerId, input.leaseToken, input.at],
    );
    const row = locked.rows[0];
    if (!row) return { ok: false, code: "LEASE_LOST" };

    const updated = await tx.query(
      `UPDATE noctis_workflow_tasks
       SET state = $1,
           result = CASE WHEN $1 = 'succeeded' THEN $2::jsonb ELSE NULL END,
           failure_code = CASE WHEN $1 = 'failed' THEN LEFT($3, 80) ELSE NULL END,
           failure_reason = CASE WHEN $1 = 'failed' THEN LEFT($4, 1000) ELSE NULL END,
           lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
           updated_at = $5::timestamptz
       WHERE task_record_id = $6 AND state = 'running'
         AND lease_owner = $7 AND lease_token = $8`,
      [input.outcome, JSON.stringify(input.result ?? null),
       input.failureCode ?? null, input.failureReason ?? null, input.at,
       input.taskRecordId, input.workerId, input.leaseToken],
    );
    if ((updated.rowCount ?? 0) !== 1) return { ok: false, code: "LEASE_LOST" };

    await tx.query(
      `UPDATE noctis_workflow_attempts
       SET finished_at = $1::timestamptz, outcome = $2,
           failure_code = CASE WHEN $2 = 'failed' THEN LEFT($3, 80) ELSE NULL END,
           failure_reason = CASE WHEN $2 = 'failed' THEN LEFT($4, 1000) ELSE NULL END
       WHERE task_record_id = $5 AND worker_id = $6 AND finished_at IS NULL`,
      [input.at, input.outcome, input.failureCode ?? null,
       input.failureReason ?? null, input.taskRecordId, input.workerId],
    );
    await tx.query(
      `INSERT INTO noctis_workflow_events
         (event_id, workflow_id, task_record_id, event_type, actor_type, actor_id,
          correlation_id, idempotency_key, occurred_at, event_data)
       VALUES ($1, $2, $3, $4, 'worker', $5, $6, $7, $8::timestamptz, $9::jsonb)`,
      [input.eventId, row.workflow_id, row.task_record_id,
       `task.${input.outcome}`, input.workerId, input.correlationId,
       `finish:${row.task_record_id}:${input.leaseToken}`, input.at,
       JSON.stringify({ failureCode: input.failureCode ?? null })],
    );

    await refreshNoctisWorkflowState(tx, row.workflow_id, input.at);

    return { ok: true, value: { taskRecordId: row.task_record_id, outcome: input.outcome } };
  });
}


export type NoctisExpiredLeaseRecoveryInput = {
  tenantId: string;
  at: string;
  retryAvailableAt: string;
  eventId: string;
  correlationId: string;
};

/**
 * Recovers one expired lease for a tenant. The previous attempt is closed as
 * timed_out. Tasks with remaining attempts return to ready after the supplied
 * retry delay; exhausted tasks become failed. The task, attempt and event are
 * updated atomically. This function never starts a replacement worker.
 */
export async function recoverNoctisExpiredWorkflowLease(
  db: NoctisWorkflowSqlDatabase,
  input: NoctisExpiredLeaseRecoveryInput,
): Promise<NoctisPersistenceResult<{ taskRecordId: string; state: "ready" | "failed"; attemptNumber: number } | null>> {
  if (!nonEmpty(input.tenantId) || !nonEmpty(input.eventId) ||
      !nonEmpty(input.correlationId) || !validUtc(input.at) ||
      !validUtc(input.retryAvailableAt) ||
      Date.parse(input.retryAvailableAt) < Date.parse(input.at)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  return db.transaction(async (tx) => {
    const expired = await tx.query<{
      task_record_id: string;
      workflow_id: string;
      task_id: string;
      lease_owner: string;
      attempt_count: number;
      max_attempts: number;
    }>(
      `SELECT t.task_record_id, t.workflow_id, t.task_id, t.lease_owner,
              t.attempt_count, t.max_attempts
       FROM noctis_workflow_tasks t
       JOIN noctis_workflows w ON w.workflow_id = t.workflow_id
       WHERE w.tenant_id = $1
         AND t.state = 'running'
         AND t.lease_expires_at <= $2::timestamptz
       ORDER BY t.lease_expires_at ASC
       LIMIT 1
       FOR UPDATE OF t SKIP LOCKED`,
      [input.tenantId, input.at],
    );
    const row = expired.rows[0];
    if (!row) return { ok: true, value: null };

    const nextState = row.attempt_count < row.max_attempts ? "ready" : "failed";
    await tx.query(
      `UPDATE noctis_workflow_attempts
       SET finished_at = $1::timestamptz, outcome = 'timed_out',
           failure_code = 'LEASE_EXPIRED',
           failure_reason = 'Worker lease expired before task completion.'
       WHERE task_record_id = $2 AND attempt_number = $3 AND finished_at IS NULL`,
      [input.at, row.task_record_id, row.attempt_count],
    );
    await tx.query(
      `UPDATE noctis_workflow_tasks
       SET state = $1,
           available_at = CASE WHEN $1 = 'ready' THEN $2::timestamptz ELSE available_at END,
           failure_code = CASE WHEN $1 = 'failed' THEN 'MAX_ATTEMPTS_EXHAUSTED' ELSE NULL END,
           failure_reason = CASE WHEN $1 = 'failed' THEN 'Maximum task attempts exhausted after lease expiry.' ELSE NULL END,
           lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
           updated_at = $3::timestamptz
       WHERE task_record_id = $4 AND state = 'running'`,
      [nextState, input.retryAvailableAt, input.at, row.task_record_id],
    );
    await tx.query(
      `INSERT INTO noctis_workflow_events
         (event_id, workflow_id, task_record_id, event_type, actor_type, actor_id,
          correlation_id, idempotency_key, occurred_at, event_data)
       VALUES ($1, $2, $3, 'task.lease_expired', 'system', NULL, $4, $5, $6::timestamptz, $7::jsonb)`,
      [input.eventId, row.workflow_id, row.task_record_id, input.correlationId,
       `lease-expired:${row.task_record_id}:${row.attempt_count}`, input.at,
       JSON.stringify({ previousWorker: row.lease_owner, attemptNumber: row.attempt_count, nextState })],
    );

    await refreshNoctisWorkflowState(tx, row.workflow_id, input.at);

    return { ok: true, value: { taskRecordId: row.task_record_id, state: nextState, attemptNumber: row.attempt_count } };
  });
}
