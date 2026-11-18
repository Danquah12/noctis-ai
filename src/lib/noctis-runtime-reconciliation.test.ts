import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileNoctisRuntimeInventory } from "./noctis-runtime-reconciliation.ts";

const digest = `sha256:${"c".repeat(64)}`;
const now = "2026-11-08T10:00:00.000Z";
const expected = {
  idempotencyKey: "noctis:" + "e".repeat(64),
  tenantId: "tenant-a",
  workloadId: "workload-a",
  workloadDigest: digest,
  runtimeId: "runtime-a",
  executionId: "execution-a",
  leaseExpiresAt: "2026-11-08T11:00:00.000Z",
};
const observed = {
  providerId: "provider-a",
  idempotencyKey: expected.idempotencyKey,
  tenantId: expected.tenantId,
  workloadId: expected.workloadId,
  workloadDigest: digest,
  runtimeId: expected.runtimeId,
  executionId: expected.executionId,
  state: "running" as const,
  createdAt: "2026-11-08T09:00:00.000Z",
};

describe("Noctis runtime inventory reconciliation", () => {
  it("tracks an exact provider execution binding", () => {
    assert.deepEqual(reconcileNoctisRuntimeInventory({
      providerId: "provider-a", expected: [expected], observed: [observed], now,
    }), [{ kind: "tracked", executionId: "execution-a", idempotencyKey: expected.idempotencyKey }]);
  });

  it("quarantines provider executions with no authoritative expected record", () => {
    const result = reconcileNoctisRuntimeInventory({
      providerId: "provider-a", expected: [], observed: [observed], now,
    });
    assert.deepEqual(result, [{
      kind: "quarantine_unknown", executionId: "execution-a", reason: "NO_EXPECTED_RECORD",
    }]);
  });

  it("quarantines tenant, workload, digest, runtime, or execution mismatches", () => {
    for (const patch of [
      { tenantId: "tenant-b" }, { workloadId: "workload-b" },
      { workloadDigest: `sha256:${"d".repeat(64)}` }, { runtimeId: "runtime-b" },
      { executionId: "execution-b" },
    ]) {
      const result = reconcileNoctisRuntimeInventory({
        providerId: "provider-a", expected: [expected], observed: [{ ...observed, ...patch }], now,
      });
      assert.equal(result[0].kind, "quarantine_mismatch");
      if (result[0].kind === "quarantine_mismatch") assert.equal(result[0].reason, "IDENTITY_MISMATCH");
    }
  });

  it("quarantines duplicate provider executions sharing one idempotency key", () => {
    const result = reconcileNoctisRuntimeInventory({
      providerId: "provider-a", expected: [expected],
      observed: [observed, { ...observed, executionId: "execution-duplicate" }], now,
    });
    assert.equal(result.length, 2);
    assert.ok(result.every((item) => item.kind === "quarantine_mismatch" &&
      item.reason === "DUPLICATE_IDEMPOTENCY_KEY"));
  });

  it("reports missing active expectations without inventing provider resources", () => {
    const result = reconcileNoctisRuntimeInventory({
      providerId: "provider-a", expected: [expected], observed: [], now,
    });
    assert.deepEqual(result, [{
      kind: "missing_expected", idempotencyKey: expected.idempotencyKey,
      tenantId: "tenant-a", workloadId: "workload-a",
    }]);
  });

  it("marks an expired expectation stale but never authorizes deletion", () => {
    const result = reconcileNoctisRuntimeInventory({
      providerId: "provider-a",
      expected: [{ ...expected, leaseExpiresAt: "2026-11-08T09:00:00.000Z" }],
      observed: [], now,
    });
    assert.deepEqual(result, [{
      kind: "stale_expected", idempotencyKey: expected.idempotencyKey, executionId: "execution-a",
    }]);
  });

  it("quarantines invalid or foreign-provider observations", () => {
    const result = reconcileNoctisRuntimeInventory({
      providerId: "provider-a", expected: [expected],
      observed: [{ ...observed, providerId: "provider-b" }], now,
    });
    assert.deepEqual(result, [
      { kind: "quarantine_mismatch", executionId: "execution-a", reason: "INVALID_OBSERVATION" },
      { kind: "missing_expected", idempotencyKey: expected.idempotencyKey, tenantId: "tenant-a", workloadId: "workload-a" },
    ]);
  });

  it("rejects malformed ledger entries and duplicate expected keys", () => {
    assert.throws(() => reconcileNoctisRuntimeInventory({
      providerId: "provider-a", expected: [{ ...expected, workloadDigest: "bad" }],
      observed: [], now,
    }));
    assert.throws(() => reconcileNoctisRuntimeInventory({
      providerId: "provider-a", expected: [expected, expected], observed: [], now,
    }));
    assert.throws(() => reconcileNoctisRuntimeInventory({
      providerId: "provider-a",
      expected: [{ ...expected, idempotencyKey: "not-a-canonical-key" }],
      observed: [], now,
    }));
  });
});
