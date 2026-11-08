import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NoctisCloudMicrovmProviderAdapter,
  type NoctisCloudMicrovmControlPlane,
} from "./noctis-cloud-microvm-provider.ts";
import type { NoctisSandboxAdmissionResult, NoctisSandboxLimits } from "./noctis-isolation-contract.ts";

const limits: NoctisSandboxLimits = {
  executionMs: 10_000, cpuMillis: 5_000, memoryMb: 256, outputBytes: 100_000,
};

const admission: Extract<NoctisSandboxAdmissionResult, { ok: true }> = {
  ok: true,
  providerId: "cloud-microvm",
  runtimeId: "runtime-approved-01",
  workloadId: "workload-01",
  tenantId: "tenant-01",
  limits,
  workloadDigest: `sha256:${"a".repeat(64)}`,
};

function input(overrides: Record<string, unknown> = {}) {
  return {
    workloadId: "workload-01",
    tenantId: "tenant-01",
    workloadDigest: admission.workloadDigest,
    limits,
    admission,
    networkAccess: "disabled" as const,
    filesystem: "ephemeral-only" as const,
    privileged: false as const,
    ...overrides,
  };
}

function fakeControlPlane(overrides: Partial<NoctisCloudMicrovmControlPlane> = {}) {
  const calls: Array<{ name: string; value?: unknown }> = [];
  const client: NoctisCloudMicrovmControlPlane = {
    async launchExecution(request) {
      calls.push({ name: "launch", value: request });
      return { runtimeId: "runtime-approved-01", executionId: "execution-01" };
    },
    async terminateExecution(executionId) {
      calls.push({ name: "terminate", value: executionId });
      return { processStopped: true };
    },
    async reapExecution(executionId) {
      calls.push({ name: "reap", value: executionId });
      return { resourcesReaped: true };
    },
    ...overrides,
  };
  return { client, calls };
}

describe("Noctis cloud microVM provider adapter", () => {
  it("launches only after a matching successful admission", async () => {
    const { client, calls } = fakeControlPlane();
    const adapter = new NoctisCloudMicrovmProviderAdapter({ providerId: "cloud-microvm" }, client);
    const result = await adapter.launch(input());
    assert.deepEqual(result, { runtimeId: "runtime-approved-01", executionId: "execution-01" });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].value, {
      runtimeId: "runtime-approved-01",
      workloadId: "workload-01",
      tenantId: "tenant-01",
      workloadDigest: admission.workloadDigest,
      limits,
      networkAccess: "disabled",
      filesystem: "ephemeral-only",
      privileged: false,
    });
  });

  it("rejects missing, mismatched or widened admission before provider invocation", async () => {
    const { client, calls } = fakeControlPlane();
    const adapter = new NoctisCloudMicrovmProviderAdapter({ providerId: "cloud-microvm" }, client);
    await assert.rejects(() => adapter.launch(input({ admission: undefined })), /successful admission/);
    await assert.rejects(() => adapter.launch(input({ tenantId: "tenant-other" })), /successful admission/);
    await assert.rejects(() => adapter.launch(input({
      limits: { ...limits, memoryMb: 512 },
    })), /successful admission/);
    assert.equal(calls.length, 0);
  });

  it("rejects a provider runtime identity mismatch and attempts cleanup", async () => {
    const { calls, client } = fakeControlPlane({
      async launchExecution() {
        calls.push({ name: "launch" });
        return { runtimeId: "runtime-unapproved", executionId: "execution-bad" };
      },
    });
    const adapter = new NoctisCloudMicrovmProviderAdapter({ providerId: "cloud-microvm" }, client);
    await assert.rejects(() => adapter.launch(input()), /unexpected runtime identity/);
    assert.deepEqual(calls.map((call) => call.name), ["launch", "terminate", "reap"]);
  });

  it("attempts resource reaping even when process termination fails", async () => {
    const { calls, client } = fakeControlPlane({
      async terminateExecution(id) {
        calls.push({ name: "terminate", value: id });
        throw new Error("provider unavailable");
      },
    });
    const adapter = new NoctisCloudMicrovmProviderAdapter({ providerId: "cloud-microvm" }, client);
    const result = await adapter.terminateAndReap("execution-01");
    assert.deepEqual(result, { processStopped: false, resourcesReaped: true });
    assert.deepEqual(calls.map((call) => call.name), ["terminate", "reap"]);
  });

  it("reports incomplete termination and cleanup without claiming success", async () => {
    const { client } = fakeControlPlane({
      async terminateExecution() { return { processStopped: false }; },
      async reapExecution() { return { resourcesReaped: false }; },
    });
    const adapter = new NoctisCloudMicrovmProviderAdapter({ providerId: "cloud-microvm" }, client);
    assert.deepEqual(await adapter.terminateAndReap("execution-01"), {
      processStopped: false, resourcesReaped: false,
    });
  });

  it("requires a configured provider identity and complete control-plane client", () => {
    assert.throws(() => new NoctisCloudMicrovmProviderAdapter({ providerId: " " }, fakeControlPlane().client));
    assert.throws(() => new NoctisCloudMicrovmProviderAdapter(
      { providerId: "cloud-microvm" },
      {} as NoctisCloudMicrovmControlPlane,
    ));
  });

  it("rejects an empty execution ID before calling the provider", async () => {
    const { client, calls } = fakeControlPlane();
    const adapter = new NoctisCloudMicrovmProviderAdapter({ providerId: "cloud-microvm" }, client);
    await assert.rejects(() => adapter.terminateAndReap(" "), /execution ID/);
    assert.equal(calls.length, 0);
  });
});
