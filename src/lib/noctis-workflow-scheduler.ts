/**
 * Deterministic, side-effect-free workflow scheduler.
 *
 * Produces dispatch candidates only. It does not claim or lease tasks, persist
 * queue state, authorize actors, resolve evidence/approvals, or invoke engines.
 * A production dispatcher must atomically claim work in persistent storage.
 */

import type { NoctisWorkflowTask } from "./noctis-workflow-contract.ts";

export type NoctisScheduleDeferral = {
  taskId: string;
  reason: "DEPENDENCIES_INCOMPLETE" | "DEPENDENCY_FAILED" | "EVIDENCE_REQUIRED" |
    "APPROVAL_REQUIRED" | "WORKFLOW_CAPACITY" | "ENGINE_CAPACITY" | "TASK_NOT_PENDING";
};

export type NoctisScheduleResult = {
  dispatchCandidates: string[];
  approvalCandidates: string[];
  deferred: NoctisScheduleDeferral[];
  capacity: {
    maxConcurrent: number;
    currentlyRunning: number;
    availableSlots: number;
  };
};

export type NoctisSchedulerPolicy = {
  maxConcurrent: number;
  maxPerEngine?: number;
  maxPerEngineOverrides?: Readonly<Record<string, number>>;
  maxDispatch?: number;
};

/** Returns stable dispatch candidates without mutating task state. */
export function scheduleNoctisReadyTasks(
  tasks: readonly NoctisWorkflowTask[],
  policy: NoctisSchedulerPolicy,
): NoctisScheduleResult {
  if (!Number.isInteger(policy.maxConcurrent) || policy.maxConcurrent < 1 || policy.maxConcurrent > 100) {
    throw new Error("maxConcurrent must be an integer from 1 through 100.");
  }
  const maxPerEngine = policy.maxPerEngine ?? policy.maxConcurrent;
  if (!Number.isInteger(maxPerEngine) || maxPerEngine < 1 || maxPerEngine > 100) {
    throw new Error("maxPerEngine must be an integer from 1 through 100.");
  }
  const maxDispatch = policy.maxDispatch ?? policy.maxConcurrent;
  if (!Number.isInteger(maxDispatch) || maxDispatch < 1 || maxDispatch > 100) {
    throw new Error("maxDispatch must be an integer from 1 through 100.");
  }

  const ids = new Set<string>();
  for (const task of tasks) {
    if (!task.taskId?.trim() || ids.has(task.taskId)) {
      throw new Error("Task IDs must be non-empty and unique within a workflow.");
    }
    ids.add(task.taskId);
  }
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  for (const task of tasks) {
    for (const dependency of task.dependsOn) {
      if (!byId.has(dependency)) throw new Error(`Task ${task.taskId} references unknown dependency ${dependency}.`);
      if (dependency === task.taskId) throw new Error(`Task ${task.taskId} cannot depend on itself.`);
    }
  }

  const running = tasks.filter((task) => task.state === "running");
  const engineRunning = new Map<string, number>();
  for (const task of running) engineRunning.set(task.engineId, (engineRunning.get(task.engineId) ?? 0) + 1);

  const availableSlots = Math.max(0, policy.maxConcurrent - running.length);
  const dispatchLimit = Math.min(availableSlots, maxDispatch);
  const deferred: NoctisScheduleDeferral[] = [];
  const approvalCandidates: string[] = [];
  const eligible: NoctisWorkflowTask[] = [];

  const ordered = [...tasks].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt) || a.taskId.localeCompare(b.taskId)
  );

  for (const task of ordered) {
    if (task.state !== "pending" && task.state !== "ready") {
      deferred.push({ taskId: task.taskId, reason: "TASK_NOT_PENDING" });
      continue;
    }

    const dependencyStates = task.dependsOn.map((id) => byId.get(id)!.state);
    if (dependencyStates.some((state) => state === "failed" || state === "cancelled" || state === "skipped" || state === "blocked")) {
      deferred.push({ taskId: task.taskId, reason: "DEPENDENCY_FAILED" });
      continue;
    }
    if (dependencyStates.some((state) => state !== "succeeded")) {
      deferred.push({ taskId: task.taskId, reason: "DEPENDENCIES_INCOMPLETE" });
      continue;
    }
    if (task.evidenceRequired && task.evidenceRefs.length === 0) {
      deferred.push({ taskId: task.taskId, reason: "EVIDENCE_REQUIRED" });
      continue;
    }
    if (task.approvalRequired && !task.approvalRef?.trim()) {
      approvalCandidates.push(task.taskId);
      deferred.push({ taskId: task.taskId, reason: "APPROVAL_REQUIRED" });
      continue;
    }
    eligible.push(task);
  }

  const dispatchCandidates: string[] = [];
  for (const task of eligible) {
    if (dispatchCandidates.length >= dispatchLimit) {
      deferred.push({ taskId: task.taskId, reason: "WORKFLOW_CAPACITY" });
      continue;
    }
    const engineLimit = policy.maxPerEngineOverrides?.[task.engineId] ?? maxPerEngine;
    if (!Number.isInteger(engineLimit) || engineLimit < 1 || engineLimit > 100) {
      throw new Error(`Invalid per-engine concurrency limit for ${task.engineId}.`);
    }
    const activeForEngine = (engineRunning.get(task.engineId) ?? 0) +
      dispatchCandidates.filter((id) => byId.get(id)!.engineId === task.engineId).length;
    if (activeForEngine >= engineLimit) {
      deferred.push({ taskId: task.taskId, reason: "ENGINE_CAPACITY" });
      continue;
    }
    dispatchCandidates.push(task.taskId);
  }

  return {
    dispatchCandidates,
    approvalCandidates,
    deferred,
    capacity: {
      maxConcurrent: policy.maxConcurrent,
      currentlyRunning: running.length,
      availableSlots,
    },
  };
}
