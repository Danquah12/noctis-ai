import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  claimNoctisWorkflowTask,
  finishNoctisWorkflowTask,
  type NoctisWorkflowSqlDatabase,
  type NoctisWorkflowSqlExecutor,
} from "./noctis-workflow-persistence.server.ts";

const migration = readFileSync(
  new URL("../../migrations/20261107_noctis_workflow_control_plane.sql", import.meta.url),
  "utf8",
);
const at = "2026-11-07T16:00:00Z";

async function setup() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(migration);
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
  return { pg, db };
}

describe("Noctis tenant-scoped workflow persistence", () => {
  it("claims only the trusted tenant's task and atomically closes its attempt", async () => {
    const { pg, db } = await setup();
    try {
      const claim = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-a",
        attemptId: "attempt-a", eventId: "claim-event-a", correlationId: "corr-a",
      });
      assert.equal(claim.ok, true);
      if (!claim.ok) return;
      assert.equal(claim.value?.taskRecordId, "task-a");
      assert.equal(claim.value?.attemptNumber, 1);

      const otherTenant = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-c", workerId: "worker-c", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-c",
        attemptId: "attempt-c", eventId: "claim-event-c", correlationId: "corr-c",
      });
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
      });
      assert.deepEqual(blocked, { ok: true, value: null });

      await pg.query(
        "UPDATE noctis_workflow_tasks SET evidence_refs='[\"evidence-1\"]'::jsonb WHERE task_record_id='task-a'",
      );
      const claimed = await claimNoctisWorkflowTask(db, {
        tenantId: "tenant-a", workerId: "worker-a", at,
        leaseExpiresAt: "2026-11-07T16:05:00Z", leaseToken: "lease-a",
        attemptId: "attempt-a", eventId: "claim-event-a", correlationId: "corr-a",
      });
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
});
