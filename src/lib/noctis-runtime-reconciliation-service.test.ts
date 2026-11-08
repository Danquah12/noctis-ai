import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  runNoctisRuntimeReconciliation,
  type NoctisRuntimeReconciliationRepository,
} from "./noctis-runtime-reconciliation-service.ts";
import type { NoctisRuntimeInventoryProvider } from "./noctis-runtime-inventory-provider.ts";

const now = "2026-11-08T12:00:00.000Z";
const key = "noctis:" + "a".repeat(64);
const digest = "sha256:" + "b".repeat(64);
const expected = [{
  idempotencyKey: key, tenantId: "tenant-a", workloadId: "workload-a",
  workloadDigest: digest, runtimeId: "runtime-a", executionId: "exec-a",
  leaseExpiresAt: "2026-11-08T13:00:00.000Z",
}];
const observed = [{
  providerId: "provider-a", idempotencyKey: key, tenantId: "tenant-a",
  workloadId: "workload-a", workloadDigest: digest, runtimeId: "runtime-a",
  executionId: "exec-a", state: "running" as const, createdAt: "2026-11-08T11:00:00.000Z",
}];

function makeProvider(pages = [{
  snapshotId: "snapshot-1", executions: observed, nextCursor: null, complete: true,
}]): NoctisRuntimeInventoryProvider {
  let index = 0;
  return {
    providerId: "provider-a",
    async listExecutions() {
      const page = pages[index++];
      if (!page) throw new Error("unexpected page request");
      return page;
    },
  };
}
function makeRepository(overrides: Partial<NoctisRuntimeReconciliationRepository> = {}) {
  const calls = { ledger: 0, commit: 0 };
  const committed: unknown[] = [];
  const repository: NoctisRuntimeReconciliationRepository = {
    async loadExpectedExecutions() { calls.ledger += 1; return expected; },
    async commitSnapshot(input) {
      calls.commit += 1; committed.push(input);
      return { committed: true, replayed: false };
    },
    ...overrides,
  };
  return { repository, calls, committed };
}

describe("Noctis runtime reconciliation orchestration", () => {
  it("loads the ledger only after a complete snapshot and commits classified decisions", async () => {
    const { repository, calls, committed } = makeRepository();
    const result = await runNoctisRuntimeReconciliation(makeProvider(), repository, { now });
    assert.equal(result.ok, true);
    assert.deepEqual(calls, { ledger: 1, commit: 1 });
    assert.equal(committed.length, 1);
    const saved = committed[0] as { snapshotId: string; decisions: { kind: string }[] };
    assert.equal(saved.snapshotId, "snapshot-1");
    assert.deepEqual(saved.decisions.map((decision) => decision.kind), ["tracked"]);
  });

  it("does not read the ledger or persist a partial provider inventory", async () => {
    const { repository, calls } = makeRepository();
    const result = await runNoctisRuntimeReconciliation(makeProvider([{
      snapshotId: "snapshot-1", executions: observed, nextCursor: "next", complete: false,
    }]), repository, { now, maxPages: 1 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.stage, "inventory");
    assert.deepEqual(calls, { ledger: 0, commit: 0 });
  });

  it("returns a ledger failure without persisting decisions", async () => {
    const { repository, calls } = makeRepository({
      async loadExpectedExecutions() { calls.ledger += 1; throw new Error("ledger unavailable"); },
    });
    const result = await runNoctisRuntimeReconciliation(makeProvider(), repository, { now });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.stage, "ledger");
    assert.deepEqual(calls, { ledger: 1, commit: 0 });
  });

  it("reports persistence failure and never claims a successful reconciliation", async () => {
    const { repository, calls } = makeRepository({
      async commitSnapshot() { calls.commit += 1; throw new Error("database unavailable"); },
    });
    const result = await runNoctisRuntimeReconciliation(makeProvider(), repository, { now });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.stage, "persistence");
    assert.deepEqual(calls, { ledger: 1, commit: 1 });
  });

  it("preserves repository idempotent replay acknowledgement", async () => {
    const { repository } = makeRepository({
      async commitSnapshot() { return { committed: true, replayed: true }; },
    });
    const result = await runNoctisRuntimeReconciliation(makeProvider(), repository, { now });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.replayed, true);
  });

  it("keeps unknown provider resources as quarantine decisions, never cleanup actions", async () => {
    const orphan = { ...observed[0], executionId: "orphan-1", idempotencyKey: "noctis:" + "c".repeat(64) };
    const { repository } = makeRepository();
    const result = await runNoctisRuntimeReconciliation(makeProvider([{
      snapshotId: "snapshot-2", executions: [orphan], nextCursor: null, complete: true,
    }]), repository, { now });
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.decisions, [{
      kind: "quarantine_unknown", executionId: "orphan-1", reason: "NO_EXPECTED_RECORD",
    }]);
  });
});
