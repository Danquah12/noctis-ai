import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  new URL("../../migrations/20261107_noctis_workflow_control_plane.sql", import.meta.url),
  "utf8",
);

describe("Noctis workflow persistence schema", () => {
  it("applies idempotently and enforces core workflow, task, attempt, and event constraints", async () => {
    const db = new PGlite();
    try {
      await db.waitReady;
      await db.exec(migration);
      await db.exec(migration);

      const tables = await db.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'noctis_workflow%' ORDER BY table_name",
      );
      assert.deepEqual(tables.rows.map((row) => row.table_name), [
        "noctis_workflow_attempts",
        "noctis_workflow_events",
        "noctis_workflow_tasks",
        "noctis_workflows",
      ]);

      await db.query(
        `INSERT INTO noctis_workflows
          (workflow_id, tenant_id, created_by, idempotency_key, plan_version, state, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,now(),now())`,
        ["wf-1", "tenant-1", "actor-1", "request-1", "1.0", "planned"],
      );
      await assert.rejects(() => db.query(
        `INSERT INTO noctis_workflows
          (workflow_id, tenant_id, created_by, idempotency_key, plan_version, state, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,now(),now())`,
        ["wf-2", "tenant-1", "actor-1", "request-1", "1.0", "planned"],
      ));

      await db.query(
        `INSERT INTO noctis_workflow_tasks
          (task_record_id, workflow_id, task_id, engine_id, capability, state, created_at, updated_at, available_at)
         VALUES ($1,$2,$3,$4,$5,$6,now(),now(),now())`,
        ["task-record-1", "wf-1", "task-1", "engine-1", "engine.run", "ready"],
      );
      await assert.rejects(() => db.query(
        `INSERT INTO noctis_workflow_tasks
          (task_record_id, workflow_id, task_id, engine_id, capability, state, created_at, updated_at, available_at, lease_owner)
         VALUES ($1,$2,$3,$4,$5,$6,now(),now(),now(),$7)`,
        ["task-record-2", "wf-1", "task-2", "engine-1", "engine.run", "ready", "worker-1"],
      ));
      await assert.rejects(() => db.query(
        `INSERT INTO noctis_workflow_tasks
          (task_record_id, workflow_id, task_id, engine_id, capability, state, created_at, updated_at, available_at)
         VALUES ($1,$2,$3,$4,$5,$6,now(),now(),now())`,
        ["task-record-3", "wf-1", "task-3", "engine-1", "engine.run", "not-a-state"],
      ));

      await db.query(
        `INSERT INTO noctis_workflow_attempts
          (attempt_id, workflow_id, task_record_id, attempt_number, started_at)
         VALUES ($1,$2,$3,$4,now())`,
        ["attempt-1", "wf-1", "task-record-1", 1],
      );
      await db.query(
        `INSERT INTO noctis_workflow_events
          (event_id, workflow_id, task_record_id, event_type, actor_type, correlation_id, occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6,now())`,
        ["event-1", "wf-1", "task-record-1", "task.created", "system", "corr-1"],
      );

      const counts = await db.query<{ table_name: string; count: string }>(
        `SELECT 'workflows' AS table_name, count(*)::text AS count FROM noctis_workflows
         UNION ALL SELECT 'tasks', count(*)::text FROM noctis_workflow_tasks
         UNION ALL SELECT 'attempts', count(*)::text FROM noctis_workflow_attempts
         UNION ALL SELECT 'events', count(*)::text FROM noctis_workflow_events`,
      );
      assert.deepEqual(Object.fromEntries(counts.rows.map((row) => [row.table_name, row.count])), {
        workflows: "1", tasks: "1", attempts: "1", events: "1",
      });
    } finally {
      await db.close();
    }
  });
});
