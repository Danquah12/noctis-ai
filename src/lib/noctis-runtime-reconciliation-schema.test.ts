import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  new URL("../../migrations/20261108_noctis_runtime_reconciliation.sql", import.meta.url),
  "utf8",
);
const decisionsMigration = readFileSync(
  new URL("../../migrations/20261108_noctis_runtime_reconciliation_decisions.sql", import.meta.url),
  "utf8",
);

describe("Noctis runtime reconciliation persistence schema", () => {
  it("applies idempotently and creates the execution, quarantine, and audit stores", async () => {
    const db = new PGlite();
    try {
      await db.waitReady;
      await db.exec(migration);
      await db.exec(decisionsMigration);
      await db.exec(migration);
      await db.exec(decisionsMigration);
      const tables = await db.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'noctis_runtime_%' ORDER BY table_name",
      );
      assert.deepEqual(tables.rows.map((row) => row.table_name), [
        "noctis_runtime_audit_events",
        "noctis_runtime_executions",
        "noctis_runtime_quarantine",
        "noctis_runtime_reconciliation_decisions",
        "noctis_runtime_reconciliation_runs",
      ]);
    } finally {
      await db.close();
    }
  });

  it("enforces canonical workload identity, unique provider idempotency, and bounded lifecycle states", async () => {
    const db = new PGlite();
    try {
      await db.waitReady;
      await db.exec(migration);
      const base = [
        "runtime-record-1", "provider-a", "noctis:" + "a".repeat(64),
        "intent-1", "tenant-a", "workload-a", "sha256:" + "b".repeat(64),
        "runtime-a", "execution-a", JSON.stringify({ executionMs: 1000, cpuMillis: 500 }),
        "running", "2026-11-08T12:00:00Z", "2026-11-08T10:00:00Z", "2026-11-08T10:00:00Z",
      ];
      await db.query(
        `INSERT INTO noctis_runtime_executions
          (runtime_execution_record_id,provider_id,idempotency_key,execution_intent_id,tenant_id,
           workload_id,workload_digest,runtime_id,execution_id,resource_limits,state,lease_expires_at,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14)`,
        base,
      );
      await assert.rejects(() => db.query(
        `INSERT INTO noctis_runtime_executions
          (runtime_execution_record_id,provider_id,idempotency_key,execution_intent_id,tenant_id,
           workload_id,workload_digest,runtime_id,execution_id,resource_limits,state,lease_expires_at,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14)`,
        [...base.slice(0, 0), "runtime-record-2", ...base.slice(1)],
      ));
      await assert.rejects(() => db.query(
        `INSERT INTO noctis_runtime_executions
          (runtime_execution_record_id,provider_id,idempotency_key,execution_intent_id,tenant_id,
           workload_id,workload_digest,runtime_id,resource_limits,state,lease_expires_at,created_at,updated_at)
         VALUES ('bad','provider-a','not-a-key','intent','tenant','workload','sha256:bad','runtime','{}','unknown',now(),now(),now())`,
      ));
    } finally {
      await db.close();
    }
  });

  it("stores quarantined provider observations without granting cleanup authority", async () => {
    const db = new PGlite();
    try {
      await db.waitReady;
      await db.exec(migration);
      await db.query(
        `INSERT INTO noctis_runtime_quarantine
          (quarantine_id,provider_id,execution_id,reason,observed_record,first_seen_at,last_seen_at)
         VALUES ('q-1','provider-a','exec-unknown','NO_EXPECTED_RECORD','{"tenantId":"untrusted"}'::jsonb,now(),now())`,
      );
      const result = await db.query<{ status: string; observed_record: { tenantId: string } }>(
        "SELECT status, observed_record FROM noctis_runtime_quarantine WHERE quarantine_id='q-1'",
      );
      assert.equal(result.rows[0].status, "open");
      assert.equal(result.rows[0].observed_record.tenantId, "untrusted");
      await assert.rejects(() => db.query(
        `INSERT INTO noctis_runtime_quarantine
          (quarantine_id,provider_id,execution_id,reason,observed_record,first_seen_at,last_seen_at)
         VALUES ('q-2','provider-a','exec-unknown','NO_EXPECTED_RECORD','{}'::jsonb,now(),now())`,
      ));
    } finally {
      await db.close();
    }
  });

  it("enforces append-only audit rows for ordinary update and delete statements", async () => {
    const db = new PGlite();
    try {
      await db.waitReady;
      await db.exec(migration);
      await db.query(
        `INSERT INTO noctis_runtime_audit_events
          (event_id,event_type,occurred_at,request_id,correlation_id,tenant_id,actor_id,
           workload_id,workload_digest,provider_id,outcome,details)
         VALUES ('evt-1','launch_requested',now(),'req','corr','tenant-a','actor-a',
           'workload-a',$1,'provider-a','requested','{"networkDisabled":true}'::jsonb)`,
        ["sha256:" + "c".repeat(64)],
      );
      const sequence = await db.query<{ audit_sequence: string }>(
        "SELECT audit_sequence::text FROM noctis_runtime_audit_events WHERE event_id='evt-1'",
      );
      assert.ok(Number(sequence.rows[0].audit_sequence) > 0);
      await assert.rejects(() => db.query(
        "UPDATE noctis_runtime_audit_events SET outcome='succeeded' WHERE event_id='evt-1'",
      ), /append-only/);
      await assert.rejects(() => db.query(
        "DELETE FROM noctis_runtime_audit_events WHERE event_id='evt-1'",
      ), /append-only/);
      const count = await db.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM noctis_runtime_audit_events",
      );
      assert.equal(count.rows[0].count, "1");
    } finally {
      await db.close();
    }
  });
});
