import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  claimNoctisWorkflowTask,
  createNoctisWorkflowIdempotently,
  finishNoctisWorkflowTask,
  getNoctisTaskCancellationRequest,
  requestNoctisWorkflowCancellation,
  recoverNoctisExpiredWorkflowLease,
  type NoctisWorkflowSqlDatabase,
  type NoctisWorkflowSqlExecutor,
} from "./noctis-workflow-persistence.server.ts";

const migration = readFileSync(
  new URL("../../migrations/20261107_noctis_workflow_control_plane.sql", import.meta.url),
  "utf8",
);
const idempotencyMigration = readFileSync(
  new URL("../../migrations/20261107_noctis_workflow_idempotency.sql", import.meta.url),
  "utf8",
);
const rlsMigration = readFileSync(
  new URL("../../migrations/20261107_noctis_workflow_rls.sql", import.meta.url),
  "utf8",
);
const cancellationMigration = readFileSync(
  new URL("../../migrations/20261107_noctis_workflow_z_cancellation.sql", import.meta.url),
  "utf8",
);
const at = "2026-11-07T16:00:00Z";
const testGates = {
  resolveEvidence: async (_tx: NoctisWorkflowSqlExecutor, context: {
    tenantId: string; evidenceRefs: readonly string[];
  }) => context.evidenceRefs.map((evidenceId) => ({
    status: "approved" as const, tenantId: context.tenantId, evidenceId,
    sourceId: "source-1", chunkId: `chunk-${evidenceId}`,
    sourceStatus: "approved" as const, accessAllowed: true,
    validUntil: null, revokedAt: null,
  })),
  resolveApproval: async (_tx: NoctisWorkflowSqlExecutor, context: {
    tenantId: string; workflowId: string; taskId: string; approvalRef: string; engineId: string; capability: string;
  }) => ({
    status: "approved" as const, tenantId: context.tenantId,
    approvalId: context.approvalRef, workflowId: context.workflowId, taskId: context.taskId,
    engineId: context.engineId,
    capability: context.capability, approvedBy: "reviewer-1",
    approvedAt: "2026-11-07T15:00:00Z", expiresAt: null, revokedAt: null,
    approvalType: "task_execution" as const, approverAuthorized: true,
  }),
};

async function setup() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(migration);
  await pg.exec(idempotencyMigration);
  await pg.exec(cancellationMigration);
  const wrap = (client: { query: (sql: string, params?: unknown[]) => Promise<any> }): NoctisWorkflowSqlExecutor => ({
    query: (sql, params) => client.query(sql, params ? [...params] : undefined),
  });
  const db: NoctisWorkflowSqlDatabase = {
    ...wrap(pg),
    transaction: (operation) => pg.transaction((tx) => operation(wrap(tx))),
  };
  await pg.query(
    `INSERT INTO noctis_workflows
      (workflow_id, tenant_id, created_by, idempotency_key, plan_version, state, created_at, updated_at)
     VALUES ('wf-a','tenant-a','actor-a','key-a','1','ready',$1,$1),
            ('wf-b','tenant-b','actor-b','key-b','1','ready',$1,$1)`,
    [at],
  );
  await pg.query(
    `INSERT INTO noctis_workflow_tasks
      (task_record_id,workflow_id,task_id,engine_id,capability,state,created_at,updated_at,available_at)
     VALUES ('task-a','wf-a','a','engine.a','run','ready',$1,$1,$1),
            ('task-b','wf-b','b','engine.b','run','ready',$1,$1,$1)`,
    [at],
  );
  await pg.exec(rlsMigration);
  return { pg, db };
}

describe("Noctis tenant-scoped workflow persistence", () => {

  it("continues scanning when a higher-priority task fails authoritative gates", async () => {
    const { pg, db } = await setup();
    try {
      await pg.query(
        `UPDATE noctis_workflow_tasks
         SET evidence_required=true, evidence_refs='["bad-evidence"]'::jsonb, priority=10
         WHERE task_record_id='task-a'`,
      );
      await pg.query(
        `INSERT INTO noctis_workflow_tasks
          (task_record_id,workflow_id,task_id,engine_id,capability,state,
           dependencies,evidence_required,evidence_refs,approval_required,
           max_attempts,attempt_count,priority,created_at,updated_at,available_at)
         VALUES ('task-c','wf-a','c','engine.c','run','ready',
                 '[]'::jsonb,false,'[]'::jsonb,false,1,0,1,$1,$1,$1)`,
        [at],
      );
      const invalidEvidence = {
        ...testGates,
        resolveEvidence: async (_tx: NoctisWorkflowSqlExecutor, context: { tenantId: string; evidenceRefs: readonly string[] }) =>
          context.evidenceRefs.map((evidenceId) => ({
            status: "approved" as const, tenantId: "other-tenant", evidenceId,
            sourceId: "source-1", chunkId: "chunk-1",
            sourceStatus: "approved" as const, accessAllowed: true,
            validUntil: null, revokedAt: null,
          })),
      };
      const claim = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-c",
        attemptId: "attempt-c", eventId: "claim-event-c", correlationId: "corr-c",
      }, invalidEvidence);
      assert.equal(claim.ok, true);
      if (claim.ok) assert.equal(claim.value?.taskRecordId, "task-c");
      const rejected = await pg.query<{ state: string }>(
        "SELECT state FROM noctis_workflow_tasks WHERE task_record_id='task-a'",
      );
      assert.equal(rejected.rows[0].state, "ready");
    } finally {
      await pg.close();
    }
  });


  it("fails closed on unapproved evidence and task-mismatched approvals", async () => {
    const { pg, db } = await setup();
    try {
      await pg.query(
        `UPDATE noctis_workflow_tasks
         SET evidence_required=true, evidence_refs='["evidence-1"]'::jsonb,
             approval_required=true, approval_ref='approval-1'
         WHERE task_record_id='task-a'`,
      );
      const rejectedEvidence = {
        ...testGates,
        resolveEvidence: async (_tx: NoctisWorkflowSqlExecutor, context: { tenantId: string; evidenceRefs: readonly string[] }) =>
          context.evidenceRefs.map((evidenceId) => ({
            status: "approved" as const, tenantId: "different-tenant", evidenceId,
            sourceId: "source-1", chunkId: "chunk-1",
            sourceStatus: "approved" as const, accessAllowed: true,
            validUntil: null, revokedAt: null,
          })),
      };
      const evidenceBlocked = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-a",
        attemptId: "attempt-a", eventId: "claim-event-a", correlationId: "corr-a",
      }, rejectedEvidence);
      assert.deepEqual(evidenceBlocked, { ok: true, value: null });

      const mismatchedApproval = {
        ...testGates,
        resolveApproval: async (_tx: NoctisWorkflowSqlExecutor, context: {
          tenantId: string; workflowId: string; taskId: string; approvalRef: string; engineId: string; capability: string;
        }) => ({
          status: "approved" as const, tenantId: context.tenantId,
          approvalId: context.approvalRef, workflowId: context.workflowId, taskId: context.taskId,
          engineId: "different-engine",
          capability: context.capability, approvedBy: "reviewer-1",
          approvedAt: "2026-11-07T15:00:00Z", expiresAt: null, revokedAt: null,
          approvalType: "task_execution" as const, approverAuthorized: true,
        }),
      };
      const approvalBlocked = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-a",
        attemptId: "attempt-a", eventId: "claim-event-b", correlationId: "corr-a",
      }, mismatchedApproval);
      assert.deepEqual(approvalBlocked, { ok: true, value: null });

      const allowed = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-a",
        attemptId: "attempt-a", eventId: "claim-event-c", correlationId: "corr-a",
      }, testGates);
      assert.equal(allowed.ok, true);
      if (allowed.ok) assert.equal(allowed.value?.taskRecordId, "task-a");
    } finally {
      await pg.close();
    }
  });


  it("creates workflows atomically and returns the original for an identical idempotent replay", async () => {
    const { pg, db } = await setup();
    try {
      const request = {
        tenantId: "tenant-a", actorId: "actor-a", workflowId: "wf-idem",
        idempotencyKey: "request-idem-1", planVersion: "plan-v1",
        requestSummary: "Run a bounded analysis", policy: { review: true, limit: 3 },
        at, eventId: "event-idem-1", correlationId: "corr-idem",
        tasks: [{
          taskRecordId: "task-record-idem", taskId: "step-1",
          engineId: "noctis.science.universal", capability: "science.research.analyze",
          dependsOn: [], evidenceRequired: true, evidenceRefs: ["evidence-1"],
          approvalRequired: false, maxAttempts: 2,
        }],
      } as const;
      const created = await createNoctisWorkflowIdempotently(db, request);
      assert.deepEqual(created, { ok: true, value: { workflowId: "wf-idem", created: true } });

      const replay = await createNoctisWorkflowIdempotently(db, {
        ...request,
        workflowId: "different-generated-id",
        eventId: "different-event",
      });
      assert.deepEqual(replay, { ok: true, value: { workflowId: "wf-idem", created: false } });

      const counts = await pg.query<{ workflows: string; tasks: string; events: string }>(
        `SELECT
           (SELECT count(*)::text FROM noctis_workflows WHERE workflow_id='wf-idem') AS workflows,
           (SELECT count(*)::text FROM noctis_workflow_tasks WHERE workflow_id='wf-idem') AS tasks,
           (SELECT count(*)::text FROM noctis_workflow_events WHERE workflow_id='wf-idem') AS events`,
      );
      assert.deepEqual(counts.rows[0], { workflows: "1", tasks: "1", events: "1" });
    } finally {
      await pg.close();
    }
  });

  it("rejects reuse of an idempotency key for a different request without leaking across tenants", async () => {
    const { pg, db } = await setup();
    try {
      const base = {
        tenantId: "tenant-a", actorId: "actor-a", workflowId: "wf-idem",
        idempotencyKey: "same-key", planVersion: "plan-v1",
        at, eventId: "event-idem", correlationId: "corr-idem",
        tasks: [{
          taskRecordId: "task-record-idem", taskId: "step-1",
          engineId: "engine.a", capability: "run",
        }],
      } as const;
      const created = await createNoctisWorkflowIdempotently(db, base);
      assert.equal(created.ok, true);

      const conflict = await createNoctisWorkflowIdempotently(db, {
        ...base,
        workflowId: "wf-conflict",
        requestSummary: "Different payload",
        eventId: "event-conflict",
      });
      assert.deepEqual(conflict, { ok: false, code: "IDEMPOTENCY_CONFLICT" });

      const otherActor = await createNoctisWorkflowIdempotently(db, {
        ...base,
        actorId: "actor-b",
        workflowId: "wf-other-actor",
        eventId: "event-other-actor",
      });
      assert.deepEqual(otherActor, { ok: false, code: "IDEMPOTENCY_CONFLICT" });

      const otherTenant = await createNoctisWorkflowIdempotently(db, {
        ...base,
        tenantId: "tenant-b", actorId: "actor-b", workflowId: "wf-tenant-b",
        eventId: "event-tenant-b",
        tasks: [{ ...base.tasks[0], taskRecordId: "task-record-tenant-b" }],
      });
      assert.deepEqual(otherTenant, { ok: true, value: { workflowId: "wf-tenant-b", created: true } });

      const rows = await pg.query<{ tenant_id: string; workflow_id: string }>(
        "SELECT tenant_id, workflow_id FROM noctis_workflows WHERE idempotency_key='same-key' ORDER BY tenant_id",
      );
      assert.deepEqual(rows.rows, [
        { tenant_id: "tenant-a", workflow_id: "wf-idem" },
        { tenant_id: "tenant-b", workflow_id: "wf-tenant-b" },
      ]);
    } finally {
      await pg.close();
    }
  });

  it("rejects invalid dependency graphs before writing workflow records", async () => {
    const { pg, db } = await setup();
    try {
      const invalid = await createNoctisWorkflowIdempotently(db, {
        tenantId: "tenant-a", actorId: "actor-a", workflowId: "wf-invalid",
        idempotencyKey: "invalid-key", planVersion: "plan-v1",
        at, eventId: "event-invalid", correlationId: "corr-invalid",
        tasks: [{
          taskRecordId: "task-invalid", taskId: "step-1",
          engineId: "engine.a", capability: "run", dependsOn: ["missing-step"],
        }],
      });
      assert.deepEqual(invalid, { ok: false, code: "INVALID_INPUT" });
      const row = await pg.query("SELECT workflow_id FROM noctis_workflows WHERE workflow_id='wf-invalid'");
      assert.equal(row.rows.length, 0);

      const cycle = await createNoctisWorkflowIdempotently(db, {
        tenantId: "tenant-a", actorId: "actor-a", workflowId: "wf-cycle",
        idempotencyKey: "cycle-key", planVersion: "plan-v1",
        at, eventId: "event-cycle", correlationId: "corr-cycle",
        tasks: [
          { taskRecordId: "task-cycle-1", taskId: "step-1", engineId: "engine.a", capability: "run", dependsOn: ["step-2"] },
          { taskRecordId: "task-cycle-2", taskId: "step-2", engineId: "engine.b", capability: "run", dependsOn: ["step-1"] },
        ],
      });
      assert.deepEqual(cycle, { ok: false, code: "INVALID_INPUT" });
      const cycleRow = await pg.query("SELECT workflow_id FROM noctis_workflows WHERE workflow_id='wf-cycle'");
      assert.equal(cycleRow.rows.length, 0);
    } finally {
      await pg.close();
    }
  });
  it("claims only the trusted tenant's task and atomically closes its attempt", async () => {
    const { pg, db } = await setup();
    try {
      const claim = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-a",
        attemptId: "attempt-a", eventId: "claim-event-a", correlationId: "corr-a",
      }, testGates);
      assert.equal(claim.ok, true);
      if (!claim.ok) return;
      assert.equal(claim.value?.taskRecordId, "task-a");
      assert.equal(claim.value?.attemptNumber, 1);

      const runningWorkflow = await pg.query<{ state: string }>(
        "SELECT state FROM noctis_workflows WHERE workflow_id='wf-a'",
      );
      assert.equal(runningWorkflow.rows[0].state, "running");

      const otherTenant = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-c", workerId: "worker-c", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-c",
        attemptId: "attempt-c", eventId: "claim-event-c", correlationId: "corr-c",
      }, testGates);
      assert.deepEqual(otherTenant, { ok: true, value: null });

      const finished = await finishNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", taskRecordId: "task-a",
        leaseToken: "lease-a", at: "2026-11-07T16:01:00Z", eventId: "finish-event-a",
        correlationId: "corr-a", outcome: "succeeded", result: { summary: "completed" },
      });
      assert.equal(finished.ok, true);

      const state = await pg.query<{ state: string; lease_token: string | null }>(
        "SELECT state, lease_token FROM noctis_workflow_tasks WHERE task_record_id='task-a'",
      );
      assert.deepEqual(state.rows[0], { state: "succeeded", lease_token: null });

      const completedWorkflow = await pg.query<{ state: string; completed_at: string | null }>(
        "SELECT state, completed_at FROM noctis_workflows WHERE workflow_id='wf-a'",
      );
      assert.equal(completedWorkflow.rows[0].state, "succeeded");
      assert.ok(completedWorkflow.rows[0].completed_at);
      const attempt = await pg.query<{ outcome: string; finished_at: string | null }>(
        "SELECT outcome, finished_at FROM noctis_workflow_attempts WHERE attempt_id='attempt-a'",
      );
      assert.equal(attempt.rows[0].outcome, "succeeded");
      assert.ok(attempt.rows[0].finished_at);
    } finally {
      await pg.close();
    }
  });

  it("rejects a mismatched worker or lease token and blocks tasks without required evidence", async () => {
    const { pg, db } = await setup();
    try {
      await pg.query(
        "UPDATE noctis_workflow_tasks SET evidence_required=true WHERE task_record_id='task-a'",
      );
      const blocked = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-a",
        attemptId: "attempt-a", eventId: "claim-event-a", correlationId: "corr-a",
      }, testGates);
      assert.deepEqual(blocked, { ok: true, value: null });

      await pg.query(
        "UPDATE noctis_workflow_tasks SET evidence_refs='[\"evidence-1\"]'::jsonb WHERE task_record_id='task-a'",
      );
      const claimed = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-a",
        attemptId: "attempt-a", eventId: "claim-event-a", correlationId: "corr-a",
      }, testGates);
      assert.equal(claimed.ok, true);
      const lost = await finishNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "other-worker", taskRecordId: "task-a",
        leaseToken: "lease-a", at: "2026-11-07T16:01:00Z", eventId: "bad-finish",
        correlationId: "corr-a", outcome: "succeeded",
      });
      assert.deepEqual(lost, { ok: false, code: "LEASE_LOST" });
    } finally {
      await pg.close();
    }
  });

  it("recovers expired leases with bounded retries and times out each attempt", async () => {
    const { pg, db } = await setup();
    try {
      await pg.query(
        "UPDATE noctis_workflow_tasks SET max_attempts=2 WHERE task_record_id='task-a'",
      );
      const first = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:01:00Z", leaseToken: "lease-1",
        attemptId: "attempt-1", eventId: "claim-1", correlationId: "corr-a",
      }, testGates);
      assert.equal(first.ok, true);

      const recovered = await recoverNoctisExpiredWorkflowLease(db, {
        tenantId: "tenant-a", at: "2026-11-07T16:02:00Z",
        retryAvailableAt: "2026-11-07T16:03:00Z",
        eventId: "recover-1", correlationId: "corr-a",
      });
      assert.deepEqual(recovered, {
        ok: true,
        value: { taskRecordId: "task-a", state: "ready", attemptNumber: 1 },
      });

      const retryWorkflow = await pg.query<{ state: string; completed_at: string | null }>(
        "SELECT state, completed_at FROM noctis_workflows WHERE workflow_id='wf-a'",
      );
      assert.equal(retryWorkflow.rows[0].state, "ready");
      assert.equal(retryWorkflow.rows[0].completed_at, null);

      const second = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-b", at: "2026-11-07T16:03:00Z",
        leaseExpiresAt: "2026-11-07T16:04:00Z", leaseToken: "lease-2",
        attemptId: "attempt-2", eventId: "claim-2", correlationId: "corr-a",
      }, testGates);
      assert.equal(second.ok, true);
      if (second.ok) assert.equal(second.value?.attemptNumber, 2);

      const exhausted = await recoverNoctisExpiredWorkflowLease(db, {
        tenantId: "tenant-a", at: "2026-11-07T16:05:00Z",
        retryAvailableAt: "2026-11-07T16:05:00Z",
        eventId: "recover-2", correlationId: "corr-a",
      });
      assert.deepEqual(exhausted, {
        ok: true,
        value: { taskRecordId: "task-a", state: "failed", attemptNumber: 2 },
      });

      const failedWorkflow = await pg.query<{ state: string; completed_at: string | null }>(
        "SELECT state, completed_at FROM noctis_workflows WHERE workflow_id='wf-a'",
      );
      assert.equal(failedWorkflow.rows[0].state, "failed");
      assert.ok(failedWorkflow.rows[0].completed_at);

      const attempts = await pg.query<{ outcome: string }>(
        "SELECT outcome FROM noctis_workflow_attempts WHERE task_record_id='task-a' ORDER BY attempt_number",
      );
      assert.deepEqual(attempts.rows.map((row) => row.outcome), ["timed_out", "timed_out"]);
    } finally {
      await pg.close();
    }
  });

  it("rejects non-UTC and malformed timestamp inputs before querying", async () => {
    const { pg, db } = await setup();
    try {
      const invalid = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at: "not-a-date",
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease",
        attemptId: "attempt", eventId: "event", correlationId: "corr",
      }, testGates);
      assert.deepEqual(invalid, { ok: false, code: "INVALID_INPUT" });
    } finally {
      await pg.close();
    }
  });


  it("cancels queued work and waits for a running worker to acknowledge stop", async () => {
    const { pg, db } = await setup();
    try {
      await pg.query(
        `INSERT INTO noctis_workflow_tasks
          (task_record_id,workflow_id,task_id,engine_id,capability,state,created_at,updated_at,available_at)
         VALUES ('task-pending','wf-a','pending','engine.p','run','pending',$1,$1,$1)`,
        [at],
      );
      const claim = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-cancel",
        attemptId: "attempt-cancel", eventId: "claim-cancel", correlationId: "corr-cancel",
      }, testGates);
      assert.equal(claim.ok, true);

      const requested = await requestNoctisWorkflowCancellation(db, {
        tenantId: "tenant-a", actorId: "actor-a", workflowId: "wf-a",
        at: "2026-11-07T16:01:00Z", reason: "User requested cancellation.",
        eventId: "cancel-event", correlationId: "corr-cancel",
      });
      assert.deepEqual(requested, {
        ok: true,
        value: { workflowId: "wf-a", state: "cancelling", cancelledTasks: 1, runningTasksAwaitingStop: 1, unconfirmedTasks: 0 },
      });
      const poll = await getNoctisTaskCancellationRequest(db, {
        tenantId: "tenant-a", workerId: "worker-a", taskRecordId: "task-a",
        leaseToken: "lease-cancel", at: "2026-11-07T16:01:30Z",
      });
      assert.deepEqual(poll, { ok: true, value: { requested: true, reason: "User requested cancellation." } });
      const repeated = await requestNoctisWorkflowCancellation(db, {
        tenantId: "tenant-a", actorId: "actor-a", workflowId: "wf-a",
        at: "2026-11-07T16:01:45Z", reason: "A later duplicate request.",
        eventId: "cancel-event-repeat", correlationId: "corr-cancel",
      });
      assert.deepEqual(repeated, {
        ok: true,
        value: { workflowId: "wf-a", state: "cancelling", cancelledTasks: 0, runningTasksAwaitingStop: 1, unconfirmedTasks: 0 },
      });
      const cancelEvents = await pg.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM noctis_workflow_events WHERE workflow_id='wf-a' AND event_type='workflow.cancellation_requested'",
      );
      assert.equal(cancelEvents.rows[0].count, "1");

      const rejectedSuccess = await finishNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", taskRecordId: "task-a",
        leaseToken: "lease-cancel", at: "2026-11-07T16:02:00Z", eventId: "finish-success",
        correlationId: "corr-cancel", outcome: "succeeded",
      });
      assert.deepEqual(rejectedSuccess, { ok: false, code: "CANCELLATION_REQUESTED" });

      const acknowledged = await finishNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", taskRecordId: "task-a",
        leaseToken: "lease-cancel", at: "2026-11-07T16:02:00Z", eventId: "finish-cancel",
        correlationId: "corr-cancel", outcome: "cancelled",
      });
      assert.deepEqual(acknowledged, { ok: true, value: { taskRecordId: "task-a", outcome: "cancelled" } });
      const workflow = await pg.query<{ state: string }>("SELECT state FROM noctis_workflows WHERE workflow_id='wf-a'");
      assert.equal(workflow.rows[0].state, "cancelled");
      const attempts = await pg.query<{ outcome: string }>("SELECT outcome FROM noctis_workflow_attempts WHERE attempt_id='attempt-cancel'");
      assert.equal(attempts.rows[0].outcome, "cancelled");
    } finally {
      await pg.close();
    }
  });

  it("blocks and does not retry a cancellation whose worker never confirms stop", async () => {
    const { pg, db } = await setup();
    try {
      await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:01:00Z", leaseToken: "lease-unconfirmed",
        attemptId: "attempt-unconfirmed", eventId: "claim-unconfirmed", correlationId: "corr-unconfirmed",
      }, testGates);
      await requestNoctisWorkflowCancellation(db, {
        tenantId: "tenant-a", actorId: "actor-a", workflowId: "wf-a",
        at: "2026-11-07T16:00:30Z", reason: "Stop requested.",
        eventId: "cancel-unconfirmed", correlationId: "corr-unconfirmed",
      });
      const recovered = await recoverNoctisExpiredWorkflowLease(db, {
        tenantId: "tenant-a", at: "2026-11-07T16:02:00Z",
        retryAvailableAt: "2026-11-07T16:03:00Z",
        eventId: "recover-unconfirmed", correlationId: "corr-unconfirmed",
      });
      assert.deepEqual(recovered, {
        ok: true,
        value: { taskRecordId: "task-a", state: "blocked", attemptNumber: 1 },
      });
      const task = await pg.query<{ state: string; failure_code: string }>(
        "SELECT state, failure_code FROM noctis_workflow_tasks WHERE task_record_id='task-a'",
      );
      assert.deepEqual(task.rows[0], { state: "blocked", failure_code: "CANCELLATION_UNCONFIRMED" });
      const workflow = await pg.query<{ state: string }>("SELECT state FROM noctis_workflows WHERE workflow_id='wf-a'");
      assert.equal(workflow.rows[0].state, "blocked");
      const repeated = await requestNoctisWorkflowCancellation(db, {
        tenantId: "tenant-a", actorId: "actor-a", workflowId: "wf-a",
        at: "2026-11-07T16:04:00Z", reason: "Stop requested.",
        eventId: "cancel-unconfirmed-again", correlationId: "corr-unconfirmed",
      });
      assert.deepEqual(repeated, {
        ok: true,
        value: { workflowId: "wf-a", state: "blocked", cancelledTasks: 0, runningTasksAwaitingStop: 0, unconfirmedTasks: 1 },
      });
    } finally {
      await pg.close();
    }
  });


});
