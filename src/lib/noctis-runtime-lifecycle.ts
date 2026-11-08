/**
 * Provider-neutral Noctis microVM lifecycle supervisor.
 *
 * Coordinates admission-bound launch, injected execution monitoring, cleanup,
 * and audit writes. The monitor and provider are infrastructure adapters:
 * this module does not execute guest code, poll a real cloud service, or
 * terminate a process itself. Audit failures before launch block launch;
 * cleanup is still attempted after any post-launch failure.
 */
import type {
  NoctisIsolatedRuntimeProvider,
  NoctisSandboxAdmissionResult,
} from "./noctis-isolation-contract.ts";
import {
  appendNoctisRuntimeAuditEvent,
  type NoctisAppendOnlyRuntimeAuditSink,
  type NoctisRuntimeAuditEvent,
  type NoctisRuntimeAuditEventType,
} from "./noctis-runtime-audit.ts";

export type NoctisRuntimeObservation =
  | { status: "completed"; resultDigest?: string }
  | { status: "failed"; reasonCode: string }
  | { status: "timed_out"; reasonCode: string }
  | { status: "cancelled"; reasonCode: string };

export interface NoctisRuntimeMonitor {
  waitForCompletion(input: {
    executionId: string;
    runtimeId: string;
    signal?: AbortSignal;
    deadlineAt: string;
  }): Promise<NoctisRuntimeObservation>;
}

export type NoctisRuntimeLifecycleInput = {
  requestId: string;
  correlationId: string;
  tenantId: string;
  actorId: string;
  workloadId: string;
  workloadDigest: string;
  admission: Extract<NoctisSandboxAdmissionResult, { ok: true }>;
  signal?: AbortSignal;
  deadlineAt: string;
  createEventId: () => string;
  now: () => string;
};

export type NoctisRuntimeLifecycleResult =
  | {
      state: "completed";
      runtimeId: string;
      executionId: string;
      observation: Extract<NoctisRuntimeObservation, { status: "completed" }>;
      cleanup: { processStopped: true; resourcesReaped: true };
      auditSequences: string[];
    }
  | {
      state: "execution_failed" | "timed_out" | "cancelled";
      runtimeId: string;
      executionId: string;
      observation: Exclude<NoctisRuntimeObservation, { status: "completed" }>;
      cleanup: { processStopped: boolean; resourcesReaped: boolean };
      auditSequences: string[];
    }
  | {
      state: "cleanup_incomplete";
      auditIncomplete?: true;
      runtimeId: string;
      executionId: string;
      observation: NoctisRuntimeObservation | { status: "monitor_failed"; reasonCode: string };
      cleanup: { processStopped: boolean; resourcesReaped: boolean };
      auditSequences: string[];
    }
  | {
      state: "launch_failed" | "audit_blocked";
      reasonCode: string;
      auditSequences: string[];
    }
  | {
      state: "launch_cleanup_incomplete";
      reasonCode: string;
      executionId: string;
      cleanup: { processStopped: boolean; resourcesReaped: boolean };
      auditSequences: string[];
    };

export class NoctisRuntimeLifecycleSupervisor {
  private readonly provider: NoctisIsolatedRuntimeProvider;
  private readonly monitor: NoctisRuntimeMonitor;
  private readonly auditSink: NoctisAppendOnlyRuntimeAuditSink;

  constructor(
    provider: NoctisIsolatedRuntimeProvider,
    monitor: NoctisRuntimeMonitor,
    auditSink: NoctisAppendOnlyRuntimeAuditSink,
  ) {
    this.provider = provider;
    this.monitor = monitor;
    this.auditSink = auditSink;
    if (!provider || typeof provider.launch !== "function" ||
        typeof provider.terminateAndReap !== "function") {
      throw new Error("A complete isolated runtime provider is required.");
    }
    if (!monitor || typeof monitor.waitForCompletion !== "function") {
      throw new Error("A runtime monitor is required.");
    }
    if (!auditSink || typeof auditSink.append !== "function") {
      throw new Error("A durable runtime audit sink is required.");
    }
  }

  async execute(input: NoctisRuntimeLifecycleInput): Promise<NoctisRuntimeLifecycleResult> {
    const identityMatches =
      input.admission?.ok === true &&
      input.admission.providerId.trim().length > 0 &&
      input.admission.workloadId === input.workloadId &&
      input.admission.tenantId === input.tenantId &&
      input.admission.workloadDigest === input.workloadDigest &&
      /^sha256:[a-f0-9]{64}$/.test(input.workloadDigest) &&
      input.requestId.trim().length > 0 &&
      input.correlationId.trim().length > 0 &&
      input.tenantId.trim().length > 0 &&
      input.actorId.trim().length > 0 &&
      input.workloadId.trim().length > 0 &&
      Number.isFinite(Date.parse(input.deadlineAt)) &&
      /^\d{4}-\d{2}-\d{2}T.*Z$/.test(input.deadlineAt);
    if (!identityMatches) return { state: "audit_blocked", reasonCode: "INVALID_OR_MISMATCHED_LIFECYCLE_CONTEXT", auditSequences: [] };

    const auditSequences: string[] = [];
    const emit = async (
      eventType: NoctisRuntimeAuditEventType,
      outcome: NoctisRuntimeAuditEvent["outcome"],
      details: NoctisRuntimeAuditEvent["details"],
      runtimeId?: string,
      executionId?: string,
    ) => {
      const event: NoctisRuntimeAuditEvent = {
        schemaVersion: 1,
        eventId: input.createEventId(),
        eventType,
        occurredAt: input.now(),
        requestId: input.requestId,
        correlationId: input.correlationId,
        tenantId: input.tenantId,
        actorId: input.actorId,
        workloadId: input.workloadId,
        workloadDigest: input.workloadDigest,
        providerId: input.admission.providerId,
        ...(runtimeId ? { runtimeId } : {}),
        ...(executionId ? { executionId } : {}),
        outcome,
        details,
      };
      const persisted = await appendNoctisRuntimeAuditEvent(this.auditSink, event);
      auditSequences.push(persisted.sequence);
    };

    try {
      await emit("admission_accepted", "accepted", { admissionBound: true });
      await emit("launch_requested", "requested", {
        networkDisabled: true, ephemeralFilesystem: true, privileged: false,
      });
    } catch {
      return { state: "audit_blocked", reasonCode: "PRE_LAUNCH_AUDIT_PERSISTENCE_FAILED", auditSequences };
    }

    let launched: { runtimeId: string; executionId: string };
    try {
      launched = await this.provider.launch({
        workloadId: input.workloadId,
        tenantId: input.tenantId,
        workloadDigest: input.workloadDigest,
        limits: { ...input.admission.limits },
        admission: input.admission,
        networkAccess: "disabled",
        filesystem: "ephemeral-only",
        privileged: false,
      });
    } catch {
      try {
        await emit("launch_failed", "failed", { reasonCode: "PROVIDER_LAUNCH_FAILED" });
      } catch { /* original launch failure remains primary; orphan reconciliation is still required */ }
      return { state: "launch_failed", reasonCode: "PROVIDER_LAUNCH_FAILED", auditSequences };
    }

    if (!launched.runtimeId?.trim() || !launched.executionId?.trim() ||
        launched.runtimeId !== input.admission.runtimeId) {
      const executionId = launched.executionId?.trim() ? launched.executionId : undefined;
      let cleanup = { processStopped: false, resourcesReaped: false };
      if (executionId) {
        try { cleanup = await this.provider.terminateAndReap(executionId); } catch { /* unresolved cleanup is an incident */ }
      }
      try {
        await emit("launch_failed", "failed", {
          reasonCode: "PROVIDER_RUNTIME_IDENTITY_MISMATCH",
          cleanupAttempted: !!executionId,
          processStopped: cleanup.processStopped,
          resourcesReaped: cleanup.resourcesReaped,
        }, launched.runtimeId?.trim() || undefined, executionId);
      } catch { /* audit alerting remains an operations requirement */ }
      if (executionId && (!cleanup.processStopped || !cleanup.resourcesReaped)) {
        return {
          state: "launch_cleanup_incomplete",
          reasonCode: "PROVIDER_RUNTIME_IDENTITY_MISMATCH",
          executionId,
          cleanup,
          auditSequences,
        };
      }
      return { state: "launch_failed", reasonCode: "PROVIDER_RUNTIME_IDENTITY_MISMATCH", auditSequences };
    }

    let observation: NoctisRuntimeObservation | { status: "monitor_failed"; reasonCode: string };
    try {
      await emit("launch_succeeded", "succeeded", {}, launched.runtimeId, launched.executionId);
      observation = await this.monitor.waitForCompletion({
        executionId: launched.executionId,
        runtimeId: launched.runtimeId,
        signal: input.signal,
        deadlineAt: input.deadlineAt,
      });
      if (!observation || !["completed", "failed", "timed_out", "cancelled"].includes(observation.status)) {
        observation = { status: "monitor_failed", reasonCode: "INVALID_MONITOR_RESULT" };
      }
    } catch {
      observation = { status: "monitor_failed", reasonCode: "MONITOR_OR_POST_LAUNCH_AUDIT_FAILED" };
    }

    // Always attempt cleanup after a successful launch, including monitor/audit failure.
    try {
      await emit("termination_requested", "requested", { reason: observation.status }, launched.runtimeId, launched.executionId);
    } catch { /* cleanup must not be skipped because the audit sink is unavailable */ }

    let cleanup = { processStopped: false, resourcesReaped: false };
    try {
      cleanup = await this.provider.terminateAndReap(launched.executionId);
    } catch {
      cleanup = { processStopped: false, resourcesReaped: false };
    }

    if (cleanup.processStopped && cleanup.resourcesReaped) {
      try {
        await emit("termination_completed", "succeeded", {
          processStopped: true, resourcesReaped: true,
        }, launched.runtimeId, launched.executionId);
      } catch {
        return {
          state: "cleanup_incomplete", runtimeId: launched.runtimeId, executionId: launched.executionId,
          observation, cleanup, auditIncomplete: true, auditSequences,
        };
      }
      if (observation.status === "completed") {
        return {
          state: "completed", runtimeId: launched.runtimeId, executionId: launched.executionId,
          observation, cleanup: { processStopped: true, resourcesReaped: true }, auditSequences,
        };
      }
      if (observation.status === "monitor_failed") {
        return {
          state: "execution_failed", runtimeId: launched.runtimeId, executionId: launched.executionId,
          observation: { status: "failed", reasonCode: observation.reasonCode },
          cleanup, auditSequences,
        };
      }
      return {
        state: observation.status === "failed" ? "execution_failed" : observation.status,
        runtimeId: launched.runtimeId, executionId: launched.executionId,
        observation, cleanup, auditSequences,
      };
    }

    try {
      await emit("cleanup_incomplete", "incomplete", {
        processStopped: cleanup.processStopped,
        resourcesReaped: cleanup.resourcesReaped,
      }, launched.runtimeId, launched.executionId);
    } catch { /* unresolved cleanup remains an operational incident */ }
    return {
      state: "cleanup_incomplete", runtimeId: launched.runtimeId, executionId: launched.executionId,
      observation, cleanup, auditSequences,
    };
  }
}
