import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendNoctisRuntimeAuditEvent,
  validateNoctisRuntimeAuditEvent,
  type NoctisRuntimeAuditEvent,
} from "./noctis-runtime-audit.ts";

const event: NoctisRuntimeAuditEvent = {
  schemaVersion: 1,
  eventId: "evt-001",
  eventType: "launch_requested",
  occurredAt: "2026-11-08T08:00:00.000Z",
  requestId: "req-01",
  correlationId: "corr-01",
  tenantId: "tenant-01",
  actorId: "actor-01",
  workloadId: "workload-01",
  workloadDigest: `sha256:${"a".repeat(64)}`,
  providerId: "cloud-microvm",
  runtimeId: "runtime-01",
  outcome: "requested",
  details: { networkDisabled: true, outputLimit: 100000, note: null },
};

describe("Noctis runtime audit contract", () => {
  it("accepts a complete structured UTC event", () => {
    assert.deepEqual(validateNoctisRuntimeAuditEvent(event), { ok: true });
  });

  it("rejects missing identity, malformed digest and invalid timestamps", () => {
    assert.equal(validateNoctisRuntimeAuditEvent({ ...event, tenantId: " " }).ok, false);
    assert.equal(validateNoctisRuntimeAuditEvent({ ...event, workloadDigest: "sha256:bad" }).ok, false);
    assert.equal(validateNoctisRuntimeAuditEvent({ ...event, occurredAt: "yesterday" }).ok, false);
  });

  it("rejects non-scalar or non-finite detail values", () => {
    assert.equal(validateNoctisRuntimeAuditEvent({
      ...event, details: { nested: { secret: "value" } } as unknown as NoctisRuntimeAuditEvent["details"],
    }).ok, false);
    assert.equal(validateNoctisRuntimeAuditEvent({ ...event, details: { value: Number.NaN } }).ok, false);
  });

  it("appends a frozen event and requires durable persistence confirmation", async () => {
    let received: NoctisRuntimeAuditEvent | undefined;
    const result = await appendNoctisRuntimeAuditEvent({
      async append(value) {
        received = value;
        return { persisted: true, sequence: "audit-seq-42" };
      },
    }, event);
    assert.deepEqual(result, { persisted: true, sequence: "audit-seq-42" });
    assert.equal(Object.isFrozen(received), true);
    assert.equal(Object.isFrozen(received?.details), true);
  });

  it("fails closed when the sink is unavailable or cannot confirm persistence", async () => {
    await assert.rejects(() => appendNoctisRuntimeAuditEvent({} as never, event), /sink is required/);
    await assert.rejects(() => appendNoctisRuntimeAuditEvent({
      async append() { return { persisted: false } as never; },
    }, event), /did not confirm durable persistence/);
  });
});
