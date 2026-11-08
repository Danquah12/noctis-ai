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
  | { ok: false; code: "INVALID_INPUT" | "NOT_CLAIMED" | "LEASE_LOST" | "NOT_RUNNING" };

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
    const claimed = await tx.query<ClaimRow>(
      `WITH candidate AS (
         SELECT t.task_record_id
         FROM noctis_workflow_tasks t
         JOIN noctis_workflows w ON w.workflow_id = t.workflow_id
         WHERE w.tenant_id = $1
           AND t.state = 'ready'
           AND t.available_at <= $2::timestamptz
           AND t.attempt_count < t.max_attempts
           AND t.lease_token IS NULL
           AND jsonb_typeof(t.dependencies) = 'array'
           AND NOT EXISTS (
             SELECT 1
             FROM jsonb_array_elements_text(t.dependencies) dep(task_id)
             WHERE NOT EXISTS (
               SELECT 1 FROM noctis_workflow_tasks d
               WHERE d.workflow_id = t.workflow_id
                 AND d.task_id = dep.task_id
                 AND d.state = 'succeeded'
             )
           )
           AND (NOT t.evidence_required OR
                (jsonb_typeof(t.evidence_refs) = 'array' AND jsonb_array_length(t.evidence_refs) > 0))
           AND (NOT t.approval_required OR NULLIF(BTRIM(t.approval_ref), '') IS NOT NULL)
         ORDER BY t.priority DESC, t.available_at ASC, t.created_at ASC
         LIMIT 1
         FOR UPDATE OF t SKIP LOCKED
       )
       UPDATE noctis_workflow_tasks t
       SET state = 'running',
           lease_owner = $3,
           lease_token = $4,
           lease_expires_at = $5::timestamptz,
           attempt_count = t.attempt_count + 1,
           updated_at = $2::timestamptz
       FROM candidate c
       WHERE t.task_record_id = c.task_record_id
       RETURNING t.task_record_id, t.workflow_id, t.task_id, t.engine_id,
                 t.capability, t.attempt_count`,
      [input.tenantId, input.at, input.workerId, input.leaseToken, input.leaseExpiresAt],
    );
    const row = claimed.rows[0];
    if (!row) return { ok: true, value: null };

    await tx.query(
      `INSERT INTO noctis_workflow_attempts
         (attempt_id, workflow_id, task_record_id, attempt_number, worker_id, started_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
      [input.attemptId, row.workflow_id, row.task_record_id, row.attempt_count, input.workerId, input.at],
    );
    await tx.query(
      `INSERT INTO noctis_workflow_events
         (event_id, workflow_id, task_record_id, event_type, actor_type, actor_id,
          correlation_id, idempotency_key, occurred_at, event_data)
       VALUES ($1, $2, $3, 'task.claimed', 'worker', $4, $5, $6, $7::timestamptz, $8::jsonb)`,
      [input.eventId, row.workflow_id, row.task_record_id, input.workerId,
       input.correlationId, `claim:${row.task_record_id}:${row.attempt_count}`, input.at,
       JSON.stringify({ attemptNumber: row.attempt_count, leaseExpiresAt: input.leaseExpiresAt })],
    );

    return {
      ok: true,
      value: {
        taskRecordId: row.task_record_id,
        workflowId: row.workflow_id,
        taskId: row.task_id,
        engineId: row.engine_id,
        capability: row.capability,
        attemptNumber: row.attempt_count,
        leaseOwner: input.workerId,
        leaseToken: input.leaseToken,
        leaseExpiresAt: input.leaseExpiresAt,
      },
    };
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

    return { ok: true, value: { taskRecordId: row.task_record_id, state: nextState, attemptNumber: row.attempt_count } };
  });
}
