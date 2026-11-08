/**
 * Converts a planning-only Noctis orchestration plan into persisted-shape
 * workflow/task contracts. It never dispatches or executes those tasks.
 */

import type { NoctisOrchestrationPlan } from "./noctis-universal-orchestrator.ts";
import {
  createNoctisWorkflowTask,
  type NoctisWorkflowRecord,
  type NoctisWorkflowTask,
} from "./noctis-workflow-contract.ts";

export type NoctisPlanWorkflowResult =
  | { ok: true; workflow: NoctisWorkflowRecord; tasks: NoctisWorkflowTask[] }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): NoctisPlanWorkflowResult {
  return { ok: false, code, message };
}

function isValidUtcTimestamp(value: string): boolean {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

/**
 * Builds workflow records from a plan after checking identity, dependency
 * references, and acyclic ordering. A successful result remains unexecutable.
 */
export function createNoctisWorkflowFromPlan(
  plan: NoctisOrchestrationPlan,
  at: string,
  maxAttempts = 1,
): NoctisPlanWorkflowResult {
  if (!plan || plan.status !== "plan_only" || plan.executionBlocked !== true ||
      !plan.planId?.trim() || !Array.isArray(plan.steps)) {
    return fail("INVALID_PLAN", "A valid execution-blocked Noctis planning result is required.");
  }
  if (!isValidUtcTimestamp(at)) return fail("INVALID_TIMESTAMP", "A valid UTC ISO-8601 timestamp is required.");

  const stepIds = plan.steps.map((step) => step.stepId);
  if (stepIds.some((id) => !id?.trim()) || new Set(stepIds).size !== stepIds.length) {
    return fail("DUPLICATE_OR_INVALID_STEP", "Plan step identifiers must be non-empty and unique.");
  }
  const known = new Set(stepIds);
  for (const step of plan.steps) {
    for (const dependency of step.dependsOn) {
      if (!known.has(dependency)) return fail("UNKNOWN_DEPENDENCY", `Step ${step.stepId} references unknown dependency ${dependency}.`);
    }
  }

  // Kahn's algorithm: reject cycles before creating any workflow objects.
  const remaining = new Map(plan.steps.map((step) => [step.stepId, new Set(step.dependsOn)]));
  const resolved = new Set<string>();
  while (resolved.size < plan.steps.length) {
    const ready = [...remaining.entries()]
      .filter(([id, dependencies]) => !resolved.has(id) && [...dependencies].every((dependency) => resolved.has(dependency)))
      .map(([id]) => id);
    if (ready.length === 0) return fail("DEPENDENCY_CYCLE", "Plan dependencies contain a cycle.");
    for (const id of ready) resolved.add(id);
  }

  const tasks: NoctisWorkflowTask[] = [];
  for (const step of plan.steps) {
    const created = createNoctisWorkflowTask({
      taskId: step.stepId,
      engineId: step.engineId,
      capability: step.capability,
      dependsOn: step.dependsOn,
      evidenceRequired: step.requiresEvidence,
      approvalRequired: step.requiresHumanReview,
      maxAttempts,
      at,
    });
    if (!created.ok) return fail(created.code, created.message);
    tasks.push(created.value);
  }

  return {
    ok: true,
    workflow: {
      workflowId: plan.planId,
      state: "planned",
      taskIds: tasks.map((task) => task.taskId),
      createdAt: at,
      updatedAt: at,
    },
    tasks,
  };
}
