import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NoctisRuntimeLifecycleSupervisor, type NoctisRuntimeObservation } from "./noctis-runtime-lifecycle.ts";
import type { NoctisIsolatedRuntimeProvider, NoctisSandboxAdmissionResult } from "./noctis-isolation-contract.ts";
import type { NoctisAppendOnlyRuntimeAuditSink, NoctisRuntimeAuditEvent } from "./noctis-runtime-audit.ts";

const admission: Extract<NoctisSandboxAdmissionResult, { ok: true }> = {
  ok: true, providerId: "provider-x", runtimeId: "runtime-x", workloadId: "workload-x",
  tenantId: "tenant-x", workloadDigest: `sha256:${"b".repeat(64)}`,
  limits: { executionMs: 5000, cpuMillis: 1000, memoryMb: 128, outputBytes: 4096 },
};
const input = {
  requestId: "request-x", correlationId: "correlation-x", tenantId: "tenant-x",
  actorId: "actor-x", workloadId: "workload-x", workloadDigest: admission.workloadDigest,
  admission, deadlineAt: "2026-11-08T09:00:00.000Z",
  createEventId: (() => { let n = 0; return () => `event-${++n}`; })(),
  now: () => "2026-11-08T08:00:00.000Z",
};
function harness(options: {
  observation?: NoctisRuntimeObservation;
  launchFails?: boolean;
  cleanup?: { processStopped: boolean; resourcesReaped: boolean };
  auditFailsAt?: number;
} = {}) {
  const calls: string[] = [];
  const events: NoctisRuntimeAuditEvent[] = [];
  const provider: NoctisIsolatedRuntimeProvider = {
    async launch() {
      calls.push("launch");
      if (options.launchFails) throw new Error("cloud provider error");
      return { runtimeId: "runtime-x", executionId: "execution-x" };
    },
    async terminateAndReap() {
      calls.push("cleanup");
      return options.cleanup ?? { processStopped: true, resourcesReaped: true };
    },
  };
  const monitor = {
    async waitForCompletion() {
      calls.push("monitor");
      return options.observation ?? { status: "completed" as const };
    },
  };
  let appendCount = 0;
  const sink: NoctisAppendOnlyRuntimeAuditSink = {
    async append(event) {
      appendCount += 1;
      if (appendCount === options.auditFailsAt) throw new Error("audit unavailable");
      events.push(event);
      return { persisted: true, sequence: `seq-${appendCount}` };
    },
  };
  return { supervisor: new NoctisRuntimeLifecycleSupervisor(provider, monitor, sink), calls, events };
}

describe("Noctis runtime lifecycle supervisor", () => {
  it("runs admission, launch, monitor and cleanup in order with persisted audit events", async () => {
    const h = harness();
    const result = await h.supervisor.execute(input);
    assert.equal(result.state, "completed");
    assert.deepEqual(h.calls, ["launch", "monitor", "cleanup"]);
    assert.deepEqual(h.events.map((event) => event.eventType), [
      "admission_accepted", "launch_requested", "launch_succeeded",
      "termination_requested", "termination_completed",
    ]);
  });

  it("blocks provider launch when pre-launch audit persistence fails", async () => {
    const h = harness({ auditFailsAt: 1 });
    const result = await h.supervisor.execute(input);
    assert.equal(result.state, "audit_blocked");
    assert.deepEqual(h.calls, []);
  });

  it("records launch failure and does not monitor or clean up an unconfirmed launch", async () => {
    const h = harness({ launchFails: true });
    const result = await h.supervisor.execute(input);
    assert.equal(result.state, "launch_failed");
    assert.deepEqual(h.calls, ["launch"]);
    assert.equal(h.events.at(-1)?.eventType, "launch_failed");
  });

  it("still attempts cleanup when monitoring fails", async () => {
    const h = harness({ observation: { status: "failed", reasonCode: "guest-error" } });
    const result = await h.supervisor.execute(input);
    assert.equal(result.state, "execution_failed");
    assert.deepEqual(h.calls, ["launch", "monitor", "cleanup"]);
  });

  it("does not claim successful completion when either cleanup control fails", async () => {
    const h = harness({ cleanup: { processStopped: true, resourcesReaped: false } });
    const result = await h.supervisor.execute(input);
    assert.equal(result.state, "cleanup_incomplete");
    assert.deepEqual(result.cleanup, { processStopped: true, resourcesReaped: false });
    assert.equal(h.events.at(-1)?.eventType, "cleanup_incomplete");
  });

  it("still cleans up if post-launch audit persistence fails", async () => {
    const h = harness({ auditFailsAt: 3 });
    const result = await h.supervisor.execute(input);
    assert.equal(result.state, "execution_failed");
    assert.deepEqual(h.calls, ["launch", "cleanup"]);
  });

  it("rejects an admission bound to another tenant before writing or launching", async () => {
    const h = harness();
    const result = await h.supervisor.execute({ ...input, tenantId: "tenant-other" });
    assert.equal(result.state, "audit_blocked");
    assert.deepEqual(h.calls, []);
    assert.equal(h.events.length, 0);
  });
});
