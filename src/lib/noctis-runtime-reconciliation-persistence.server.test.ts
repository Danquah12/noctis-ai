import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  PostgresNoctisRuntimeReconciliationRepository,
} from "./noctis-runtime-reconciliation-persistence.server.ts";
import type {
  NoctisRuntimeSqlDatabase,
  NoctisRuntimeSqlExecutor,
} from "./noctis-runtime-persistence.server.ts";

const baseMigration = readFileSync(
  new URL("../../migrations/20261108_noctis_runtime_reconciliation.sql", import.meta.url), "utf8",
);
const decisionsMigration = readFileSync(
  new URL("../../migrations/20261108_noctis_runtime_reconciliation_decisions.sql", import.meta.url), "utf8",
);
const at = "2026-11-08T12:00:00.000Z";
const key = "noctis:" + "a".repeat(64);
const digest = "sha256:" + "b".repeat(64);
const expectedRow = [
  "record-a","provider-a",key,"intent-a","tenant-authoritative","workload-a",digest,
  "runtime-a","exec-a",JSON.stringify({executionMs:30000,cpuMillis:1000,memoryMb:512,outputBytes:65536}),
  "running","2026-11-08T13:00:00Z",at,at,
];

async function setup() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(baseMigration);
  await pg.exec(decisionsMigration);
  const wrap = (client: { query: (sql: string, params?: unknown[]) => Promise<any> }): NoctisRuntimeSqlExecutor => ({
    query: (sql, params) => client.query(sql, params ? [...params] : undefined),
  });
  const db: NoctisRuntimeSqlDatabase = {
    ...wrap(pg),
    transaction: (operation) => pg.transaction((tx) => operation(wrap(tx))),
  };
  return { pg, db, repository: new PostgresNoctisRuntimeReconciliationRepository(db, {
    systemTenantId: "system-runtime", serviceActorId: "noctis-reconciliation-service",
  }) };
}

const tracked = { kind: "tracked" as const, executionId: "exec-a", idempotencyKey: key };
const orphan = { kind: "quarantine_unknown" as const, executionId: "orphan-a", reason: "NO_EXPECTED_RECORD" as const };
const missing = {
  kind: "missing_expected" as const, idempotencyKey: "noctis:" + "c".repeat(64),
  tenantId: "tenant-from-ledger", workloadId: "workload-from-ledger",
};

describe("Noctis transactional reconciliation repository", () => {
  it("loads expected executions from the authoritative ledger under the service identity", async () => {
    const { pg, db, repository } = await setup();
    try {
      await pg.query(
        `INSERT INTO noctis_runtime_executions
         (runtime_execution_record_id,provider_id,idempotency_key,execution_intent_id,tenant_id,
          workload_id,workload_digest,runtime_id,execution_id,resource_limits,state,lease_expires_at,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::timestamptz,$13::timestamptz,$14::timestamptz)`,
        expectedRow,
      );
      const rows = await repository.loadExpectedExecutions("provider-a");
      assert.deepEqual(rows, [{
        idempotencyKey: key, tenantId: "tenant-authoritative", workloadId: "workload-a",
        workloadDigest: digest, runtimeId: "runtime-a", executionId: "exec-a",
        leaseExpiresAt: "2026-11-08T13:00:00.000Z",
      }]);
      const setting = await pg.query<{ value: string }>("SELECT current_setting('app.tenant_id', true) AS value");
      assert.equal(setting.rows[0].value, null);
    } finally { await pg.close(); }
  });

  it("commits run, decisions, and service audit atomically and exact replay is idempotent", async () => {
    const { pg, repository } = await setup();
    try {
      const input = {
        providerId: "provider-a", snapshotId: "snapshot-a", observedCount: 2,
        pageCount: 3, completedAt: at, decisions: [tracked, orphan, missing],
      };
      assert.deepEqual(await repository.commitSnapshot(input), { committed: true, replayed: false });
      assert.deepEqual(await repository.commitSnapshot({ ...input, completedAt: "2026-11-08T12:05:00.000Z" }),
        { committed: true, replayed: true });
      const counts = await pg.query<{ runs: string; decisions: string; audits: string }>(
        `SELECT
          (SELECT count(*)::text FROM noctis_runtime_reconciliation_runs) runs,
          (SELECT count(*)::text FROM noctis_runtime_reconciliation_decisions) decisions,
          (SELECT count(*)::text FROM noctis_runtime_audit_events WHERE event_type='inventory_reconciled') audits`,
      );
      assert.deepEqual(counts.rows[0], { runs: "1", decisions: "3", audits: "1" });
      const rows = await pg.query<{ decision_kind: string; tenant_id: string | null; execution_id: string | null }>(
        "SELECT decision_kind,tenant_id,execution_id FROM noctis_runtime_reconciliation_decisions ORDER BY decision_index",
      );
      assert.deepEqual(rows.rows, [
        { decision_kind: "tracked", tenant_id: null, execution_id: "exec-a" },
        { decision_kind: "quarantine_unknown", tenant_id: null, execution_id: "orphan-a" },
        { decision_kind: "missing_expected", tenant_id: "tenant-from-ledger", execution_id: null },
      ]);
    } finally { await pg.close(); }
  });

  it("rejects reuse of a provider snapshot ID with a changed decision payload", async () => {
    const { pg, repository } = await setup();
    try {
      const input = { providerId: "provider-a", snapshotId: "snapshot-conflict", observedCount: 1,
        pageCount: 1, completedAt: at, decisions: [tracked] };
      await repository.commitSnapshot(input);
      await assert.rejects(() => repository.commitSnapshot({ ...input, decisions: [orphan] }),
        /RECONCILIATION_SNAPSHOT_CONFLICT/);
      const count = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM noctis_runtime_reconciliation_decisions");
      assert.equal(count.rows[0].count, "1");
    } finally { await pg.close(); }
  });

  it("serializes concurrent identical snapshot submissions to one durable run", async () => {
    const { pg, repository } = await setup();
    try {
      const input = { providerId: "provider-a", snapshotId: "snapshot-race", observedCount: 1,
        pageCount: 1, completedAt: at, decisions: [tracked] };
      const results = await Promise.all([
        repository.commitSnapshot(input), repository.commitSnapshot(input),
      ]);
      assert.equal(results.filter((result) => !result.replayed).length, 1);
      assert.equal(results.filter((result) => result.replayed).length, 1);
      const counts = await pg.query<{ runs: string; audits: string }>(
        `SELECT (SELECT count(*)::text FROM noctis_runtime_reconciliation_runs) runs,
          (SELECT count(*)::text FROM noctis_runtime_audit_events WHERE event_type='inventory_reconciled') audits`,
      );
      assert.deepEqual(counts.rows[0], { runs: "1", audits: "1" });
    } finally { await pg.close(); }
  });

  it("rolls back the entire snapshot when an audit event ID collision occurs", async () => {
    const { pg, repository } = await setup();
    try {
      await pg.query(
        `INSERT INTO noctis_runtime_audit_events
         (event_id,event_type,occurred_at,request_id,correlation_id,tenant_id,actor_id,
          workload_id,workload_digest,provider_id,outcome,details)
         VALUES ('runtime-reconciliation:' || encode(digest('provider-a' || chr(0) || 'snapshot-rollback','sha256'),'hex'),
          'inventory_reconciled',$1::timestamptz,'r','c','system-runtime','service',
          'runtime-reconciliation',$2,'provider-a','succeeded','{}'::jsonb)`,
        [at,digest],
      );
      await assert.rejects(() => repository.commitSnapshot({
        providerId: "provider-a", snapshotId: "snapshot-rollback", observedCount: 1,
        pageCount: 1, completedAt: at, decisions: [tracked],
      }));
      const count = await pg.query<{ runs: string; decisions: string }>(
        `SELECT (SELECT count(*)::text FROM noctis_runtime_reconciliation_runs) runs,
          (SELECT count(*)::text FROM noctis_runtime_reconciliation_decisions) decisions`,
      );
      assert.deepEqual(count.rows[0], { runs: "0", decisions: "0" });
    } finally { await pg.close(); }
  });
});
