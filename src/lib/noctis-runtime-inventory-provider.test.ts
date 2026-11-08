import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectNoctisRuntimeInventory,
  type NoctisRuntimeInventoryPage,
  type NoctisRuntimeInventoryProvider,
} from "./noctis-runtime-inventory-provider.ts";

const item = {
  providerId: "provider-a",
  idempotencyKey: "noctis:" + "a".repeat(64),
  tenantId: "tenant-a",
  workloadId: "workload-a",
  workloadDigest: "sha256:" + "b".repeat(64),
  runtimeId: "runtime-a",
  executionId: "exec-a",
  state: "running" as const,
  createdAt: "2026-11-08T10:00:00.000Z",
};
function provider(pages: NoctisRuntimeInventoryPage[]): NoctisRuntimeInventoryProvider {
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

describe("Noctis provider inventory pagination", () => {
  it("returns observations only after a stable terminal complete snapshot", async () => {
    const result = await collectNoctisRuntimeInventory(provider([
      { snapshotId: "snap-1", executions: [item], nextCursor: "cursor-2", complete: false },
      { snapshotId: "snap-1", executions: [{ ...item, executionId: "exec-b" }], nextCursor: null, complete: true },
    ]));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.complete, true);
      assert.equal(result.pageCount, 2);
      assert.equal(result.executions.length, 2);
      assert.equal(result.snapshotId, "snap-1");
    }
  });

  it("does not expose partial results when the provider fails mid-pagination", async () => {
    let calls = 0;
    const source: NoctisRuntimeInventoryProvider = {
      providerId: "provider-a",
      async listExecutions() {
        calls += 1;
        if (calls === 1) return { snapshotId: "snap-1", executions: [item], nextCursor: "next", complete: false };
        throw new Error("provider unavailable");
      },
    };
    const result = await collectNoctisRuntimeInventory(source);
    assert.deepEqual(result, { ok: false, providerId: "provider-a", reason: "PROVIDER_ERROR", pageCount: 1 });
  });

  it("rejects a snapshot token change between pages", async () => {
    const result = await collectNoctisRuntimeInventory(provider([
      { snapshotId: "snap-1", executions: [], nextCursor: "next", complete: false },
      { snapshotId: "snap-2", executions: [], nextCursor: null, complete: true },
    ]));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "SNAPSHOT_CHANGED");
  });

  it("rejects a terminal page that does not certify completeness", async () => {
    const result = await collectNoctisRuntimeInventory(provider([
      { snapshotId: "snap-1", executions: [item], nextCursor: null, complete: false },
    ]));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "INCOMPLETE_SNAPSHOT");
  });

  it("rejects cursor loops and duplicate execution IDs across pages", async () => {
    const loop = await collectNoctisRuntimeInventory(provider([
      { snapshotId: "snap-1", executions: [], nextCursor: "again", complete: false },
      { snapshotId: "snap-1", executions: [], nextCursor: "again", complete: false },
    ]));
    assert.equal(loop.ok, false);
    if (!loop.ok) assert.equal(loop.reason, "CURSOR_CYCLE");

    const duplicate = await collectNoctisRuntimeInventory(provider([
      { snapshotId: "snap-1", executions: [item], nextCursor: "next", complete: false },
      { snapshotId: "snap-1", executions: [item], nextCursor: null, complete: true },
    ]));
    assert.equal(duplicate.ok, false);
    if (!duplicate.ok) assert.equal(duplicate.reason, "DUPLICATE_EXECUTION_ID");
  });

  it("enforces page and resource bounds", async () => {
    assert.throws(() => collectNoctisRuntimeInventory(provider([]), { pageSize: 501 }));
    const result = await collectNoctisRuntimeInventory(provider([
      { snapshotId: "snap-1", executions: [], nextCursor: "next", complete: false },
    ]), { maxPages: 1 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "PAGE_LIMIT");
  });

  it("rejects malformed page envelopes", async () => {
    const malformed = {
      providerId: "provider-a",
      async listExecutions() { return { snapshotId: "", executions: [], nextCursor: null, complete: true }; },
    } as unknown as NoctisRuntimeInventoryProvider;
    const result = await collectNoctisRuntimeInventory(malformed);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "INVALID_PAGE");
  });
});
