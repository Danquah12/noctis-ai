/**
 * Provider-neutral cloud microVM adapter.
 *
 * This is an adapter boundary, not a cloud-vendor implementation. A deployment
 * must inject a control-plane client authenticated with workload identity and
 * backed by a real microVM service. No shell, Docker socket, ambient credentials,
 * or arbitrary endpoint is used by this module.
 */
import { createHash } from "node:crypto";
import type {
  NoctisIsolatedRuntimeProvider,
  NoctisSandboxAdmissionResult,
  NoctisSandboxLimits,
} from "./noctis-isolation-contract.ts";

export type NoctisCloudMicrovmLaunchRequest = {
  /** Stable across retries; provider must deduplicate this key atomically. */
  idempotencyKey: string;
  executionIntentId: string;
  runtimeId: string;
  workloadId: string;
  tenantId: string;
  workloadDigest: string;
  limits: NoctisSandboxLimits;
  networkAccess: "disabled";
  filesystem: "ephemeral-only";
  privileged: false;
};

export interface NoctisCloudMicrovmControlPlane {
  /** Same key + same request returns the original execution; same key + different request must conflict. */
  launchExecution(
    request: NoctisCloudMicrovmLaunchRequest,
  ): Promise<{ runtimeId: string; executionId: string }>;
  terminateExecution(executionId: string): Promise<{ processStopped: boolean }>;
  reapExecution(executionId: string): Promise<{ resourcesReaped: boolean }>;
}

export function createNoctisLaunchIdempotencyKey(input: {
  executionIntentId: string;
  tenantId: string;
  workloadId: string;
  workloadDigest: string;
  limits: NoctisSandboxLimits;
}): string {
  if (!input.executionIntentId?.trim() || !input.tenantId?.trim() || !input.workloadId?.trim() ||
      !/^sha256:[a-f0-9]{64}$/.test(input.workloadDigest) ||
      !Number.isSafeInteger(input.limits?.executionMs) || input.limits.executionMs <= 0 ||
      !Number.isSafeInteger(input.limits?.cpuMillis) || input.limits.cpuMillis <= 0 ||
      !Number.isSafeInteger(input.limits?.memoryMb) || input.limits.memoryMb <= 0 ||
      !Number.isSafeInteger(input.limits?.outputBytes) || input.limits.outputBytes <= 0) {
    throw new Error("Valid tenant, workload, digest and resource limits are required for idempotency.");
  }
  const canonical = JSON.stringify({
    executionIntentId: input.executionIntentId,
    tenantId: input.tenantId, workloadId: input.workloadId,
    workloadDigest: input.workloadDigest,
    limits: {
      executionMs: input.limits.executionMs, cpuMillis: input.limits.cpuMillis,
      memoryMb: input.limits.memoryMb, outputBytes: input.limits.outputBytes,
    },
  });
  return "noctis:" + createHash("sha256").update(canonical, "utf8").digest("hex");
}

export type NoctisCloudMicrovmProviderConfig = {
  providerId: string;
};

export class NoctisCloudMicrovmProviderAdapter implements NoctisIsolatedRuntimeProvider {
  private readonly config: NoctisCloudMicrovmProviderConfig;
  private readonly controlPlane: NoctisCloudMicrovmControlPlane;

  constructor(
    config: NoctisCloudMicrovmProviderConfig,
    controlPlane: NoctisCloudMicrovmControlPlane,
  ) {
    this.config = config;
    this.controlPlane = controlPlane;
    if (!config.providerId?.trim()) throw new Error("A trusted cloud microVM provider ID is required.");
    if (!controlPlane ||
        typeof controlPlane.launchExecution !== "function" ||
        typeof controlPlane.terminateExecution !== "function" ||
        typeof controlPlane.reapExecution !== "function") {
      throw new Error("A complete cloud microVM control-plane client is required.");
    }
  }

  async launch(input: {
    workloadId: string;
    executionIntentId: string;
    tenantId: string;
    workloadDigest: string;
    limits: NoctisSandboxLimits;
    admission: Extract<NoctisSandboxAdmissionResult, { ok: true }>;
    networkAccess: "disabled";
    filesystem: "ephemeral-only";
    privileged: false;
  }): Promise<{ runtimeId: string; executionId: string }> {
    const { admission } = input;
    if (!admission ||
        admission.providerId !== this.config.providerId ||
        admission.workloadId !== input.workloadId ||
        admission.tenantId !== input.tenantId ||
        admission.workloadDigest !== input.workloadDigest ||
        admission.runtimeId.trim().length === 0 ||
        !sameLimits(admission.limits, input.limits)) {
      throw new Error("Sandbox launch rejected: successful admission does not match this exact workload.");
    }

    const idempotencyKey = createNoctisLaunchIdempotencyKey({
      executionIntentId: input.executionIntentId,
      tenantId: input.tenantId, workloadId: input.workloadId,
      workloadDigest: input.workloadDigest, limits: admission.limits,
    });
    const launched = await this.controlPlane.launchExecution({
      idempotencyKey,
      executionIntentId: input.executionIntentId,
      runtimeId: admission.runtimeId,
      workloadId: input.workloadId,
      tenantId: input.tenantId,
      workloadDigest: input.workloadDigest,
      limits: { ...admission.limits },
      networkAccess: "disabled",
      filesystem: "ephemeral-only",
      privileged: false,
    });

    if (!launched.runtimeId?.trim() || !launched.executionId?.trim() ||
        launched.runtimeId !== admission.runtimeId) {
      if (launched.executionId?.trim()) {
        try { await this.controlPlane.terminateExecution(launched.executionId); } catch { /* fail closed */ }
        try { await this.controlPlane.reapExecution(launched.executionId); } catch { /* fail closed */ }
      }
      throw new Error("Cloud provider returned an invalid or unexpected runtime identity.");
    }
    return { runtimeId: launched.runtimeId, executionId: launched.executionId };
  }

  async terminateAndReap(executionId: string): Promise<{
    processStopped: boolean;
    resourcesReaped: boolean;
  }> {
    if (!executionId?.trim()) throw new Error("A valid execution ID is required for termination.");
    let processStopped = false;
    let resourcesReaped = false;

    // Attempt both operations independently so a stop error does not suppress cleanup.
    try {
      processStopped = (await this.controlPlane.terminateExecution(executionId)).processStopped === true;
    } catch {
      processStopped = false;
    }
    try {
      resourcesReaped = (await this.controlPlane.reapExecution(executionId)).resourcesReaped === true;
    } catch {
      resourcesReaped = false;
    }
    return { processStopped, resourcesReaped };
  }
}

function sameLimits(left: NoctisSandboxLimits, right: NoctisSandboxLimits): boolean {
  return left.executionMs === right.executionMs &&
    left.cpuMillis === right.cpuMillis &&
    left.memoryMb === right.memoryMb &&
    left.outputBytes === right.outputBytes;
}
