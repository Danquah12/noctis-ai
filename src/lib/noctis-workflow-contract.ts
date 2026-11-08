/**
 * Noctis workflow contract and deterministic task state machine.
 *
 * This module defines lifecycle rules only. It does not enqueue work, execute
 * engines, authorize actors, verify evidence, or resolve approval references.
 * Trusted server adapters must perform those checks against authoritative
 * identity, evidence, and approval services before dispatch.
 */

export type NoctisWorkflowState =
  | "planned" | "ready" | "running" | "waiting_approval"
  | "blocked" | "cancelling" | "succeeded" | "failed" | "cancelled";

export type NoctisTaskState =
  | "pending" | "ready" | "running" | "waiting_approval"
  | "blocked" | "succeeded" | "failed" | "skipped" | "cancelled";

export type NoctisTaskAttempt = {
  attempt: number;
  startedAt: string;
  finishedAt?: string;
  outcome?: "succeeded" | "failed";
  failureCode?: string;
  failureReason?: string;
};

export type NoctisWorkflowTask = {
  taskId: string;
  engineId: string;
  capability: string;
  state: NoctisTaskState;
  dependsOn: readonly string[];
  evidenceRequired: boolean;
  evidenceRefs: readonly string[];
  approvalRequired: boolean;
  approvalRef?: string;
  maxAttempts: number;
  attempts: readonly NoctisTaskAttempt[];
  createdAt: string;
  updatedAt: string;
  failureCode?: string;
  failureReason?: string;
};

export type NoctisWorkflowRecord = {
  workflowId: string;
  state: NoctisWorkflowState;
  taskIds: readonly string[];
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
};

export type NoctisTaskEvent =
  | { type: "make_ready"; at: string; dependencyStates: Readonly<Record<string, NoctisTaskState>> }
  | { type: "request_approval"; at: string }
  | { type: "approve"; at: string; approvalRef: string }
  | { type: "start"; at: string }
  | { type: "succeed"; at: string }
  | { type: "fail"; at: string; code: string; reason: string }
  | { type: "retry"; at: string; dependencyStates: Readonly<Record<string, NoctisTaskState>> }
  | { type: "block"; at: string; reason: string }
  | { type: "cancel"; at: string };

export type NoctisTransitionResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

const TERMINAL_TASK_STATES: readonly NoctisTaskState[] = [
  "succeeded", "failed", "skipped", "cancelled",
];

function validTimestamp(value: string): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function failure<T>(code: string, message: string): NoctisTransitionResult<T> {
  return { ok: false, code, message };
}

function dependenciesSucceeded(
  dependencies: readonly string[],
  states: Readonly<Record<string, NoctisTaskState>>,
): boolean {
  return dependencies.every((id) => states[id] === "succeeded");
}

/** Creates a new task in the pending state with bounded retry policy. */
export function createNoctisWorkflowTask(input: {
  taskId: string;
  engineId: string;
  capability: string;
  dependsOn?: readonly string[];
  evidenceRequired?: boolean;
  approvalRequired?: boolean;
  maxAttempts?: number;
  at: string;
}): NoctisTransitionResult<NoctisWorkflowTask> {
  if (!input.taskId?.trim() || !input.engineId?.trim() || !input.capability?.trim()) {
    return failure("INVALID_TASK", "Task, engine, and capability identifiers are required.");
  }
  if (!validTimestamp(input.at)) return failure("INVALID_TIMESTAMP", "Timestamp must be a valid UTC ISO-8601 timestamp.");
  const dependencies = [...new Set(input.dependsOn ?? [])];
  if (dependencies.some((id) => !id.trim()) || dependencies.includes(input.taskId)) {
    return failure("INVALID_DEPENDENCIES", "Dependencies must be non-empty and cannot include the task itself.");
  }
  const maxAttempts = input.maxAttempts ?? 1;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    return failure("INVALID_RETRY_LIMIT", "maxAttempts must be an integer from 1 through 5.");
  }
  return {
    ok: true,
    value: {
      taskId: input.taskId,
      engineId: input.engineId,
      capability: input.capability,
      state: "pending",
      dependsOn: dependencies,
      evidenceRequired: input.evidenceRequired ?? false,
      evidenceRefs: [],
      approvalRequired: input.approvalRequired ?? false,
      maxAttempts,
      attempts: [],
      createdAt: input.at,
      updatedAt: input.at,
    },
  };
}

/**
 * Applies one deterministic task transition. Callers supply timestamps and
 * dependency states; no ambient clock, database, or authorization is used.
 */
export function transitionNoctisTask(
  task: NoctisWorkflowTask,
  event: NoctisTaskEvent,
): NoctisTransitionResult<NoctisWorkflowTask> {
  if (!task || !event || !validTimestamp(event.at)) {
    return failure("INVALID_EVENT", "A task and valid UTC event timestamp are required.");
  }
  if (event.at < task.updatedAt) {
    return failure("STALE_EVENT", "Event timestamp cannot precede the task's last update.");
  }
  if (TERMINAL_TASK_STATES.includes(task.state)) {
    return failure("TERMINAL_STATE", "Terminal tasks cannot transition.");
  }

  const next: NoctisWorkflowTask = {
    ...task,
    dependsOn: [...task.dependsOn],
    evidenceRefs: [...task.evidenceRefs],
    attempts: task.attempts.map((attempt) => ({ ...attempt })),
    updatedAt: event.at,
  };

  switch (event.type) {
    case "make_ready":
      if (task.state !== "pending" && task.state !== "blocked") {
        return failure("INVALID_TRANSITION", "Only pending or blocked tasks can become ready.");
      }
      if (!dependenciesSucceeded(task.dependsOn, event.dependencyStates)) {
        return failure("DEPENDENCIES_INCOMPLETE", "Every dependency must be succeeded before this task is ready.");
      }
      next.state = "ready";
      next.failureCode = undefined;
      next.failureReason = undefined;
      break;
    case "request_approval":
      if (task.state !== "ready" || !task.approvalRequired) {
        return failure("APPROVAL_NOT_REQUIRED", "Only ready tasks requiring approval may wait for approval.");
      }
      next.state = "waiting_approval";
      break;
    case "approve":
      if (task.state !== "waiting_approval" || !task.approvalRequired || !event.approvalRef?.trim()) {
        return failure("INVALID_APPROVAL", "A waiting task requires a non-empty approval reference.");
      }
      next.approvalRef = event.approvalRef.trim();
      next.state = "ready";
      break;
    case "start":
      if (task.state !== "ready") return failure("INVALID_TRANSITION", "Only ready tasks can start.");
      if (task.evidenceRequired && task.evidenceRefs.length === 0) {
        return failure("EVIDENCE_REQUIRED", "Evidence references are required before the task can start.");
      }
      if (task.approvalRequired && !task.approvalRef?.trim()) {
        return failure("APPROVAL_REQUIRED", "An approval reference is required before the task can start.");
      }
      if (task.attempts.length >= task.maxAttempts) {
        return failure("RETRY_LIMIT_REACHED", "The configured attempt limit has been reached.");
      }
      next.state = "running";
      next.attempts = [...next.attempts, { attempt: task.attempts.length + 1, startedAt: event.at }];
      break;
    case "succeed": {
      if (task.state !== "running") return failure("INVALID_TRANSITION", "Only running tasks can succeed.");
      next.state = "succeeded";
      const attempts = [...next.attempts];
      const last = attempts[attempts.length - 1];
      attempts[attempts.length - 1] = { ...last, finishedAt: event.at, outcome: "succeeded" };
      next.attempts = attempts;
      break;
    }
    case "fail": {
      if (task.state !== "running" || !event.code?.trim() || !event.reason?.trim()) {
        return failure("INVALID_FAILURE", "A running task requires a failure code and reason.");
      }
      next.state = "failed";
      next.failureCode = event.code.trim().slice(0, 80);
      next.failureReason = event.reason.trim().slice(0, 1000);
      const attempts = [...next.attempts];
      const last = attempts[attempts.length - 1];
      attempts[attempts.length - 1] = {
        ...last, finishedAt: event.at, outcome: "failed",
        failureCode: next.failureCode, failureReason: next.failureReason,
      };
      next.attempts = attempts;
      break;
    }
    case "retry":
      if (task.state !== "failed") return failure("INVALID_TRANSITION", "Only failed tasks can be retried.");
      if (task.attempts.length >= task.maxAttempts) return failure("RETRY_LIMIT_REACHED", "No retry attempts remain.");
      if (!dependenciesSucceeded(task.dependsOn, event.dependencyStates)) {
        return failure("DEPENDENCIES_INCOMPLETE", "Dependencies must still be succeeded before retry.");
      }
      next.state = "ready";
      next.failureCode = undefined;
      next.failureReason = undefined;
      next.approvalRef = undefined;
      break;
    case "block":
      if (task.state !== "pending" && task.state !== "ready") {
        return failure("INVALID_TRANSITION", "Only pending or ready tasks can be blocked.");
      }
      if (!event.reason?.trim()) return failure("INVALID_REASON", "A block reason is required.");
      next.state = "blocked";
      next.failureReason = event.reason.trim().slice(0, 1000);
      break;
    case "cancel":
      if (task.state === "running") return failure("CANCEL_REQUIRES_TERMINATION", "Running work must be stopped by its executor before cancellation is recorded.");
      next.state = "cancelled";
      break;
    default:
      return failure("UNKNOWN_EVENT", "Unsupported task event.");
  }
  return { ok: true, value: next };
}

/** Adds evidence references while a task is pending, ready, or awaiting approval. */
export function attachNoctisTaskEvidence(
  task: NoctisWorkflowTask,
  evidenceRefs: readonly string[],
  at: string,
): NoctisTransitionResult<NoctisWorkflowTask> {
  if (!validTimestamp(at) || at < task.updatedAt) return failure("INVALID_TIMESTAMP", "A non-stale UTC timestamp is required.");
  if (task.state !== "pending" && task.state !== "ready" && task.state !== "waiting_approval") {
    return failure("INVALID_TRANSITION", "Evidence can only be attached before execution.");
  }
  if (!evidenceRefs.length || evidenceRefs.some((ref) => !ref.trim())) {
    return failure("INVALID_EVIDENCE", "At least one non-empty evidence reference is required.");
  }
  return {
    ok: true,
    value: { ...task, evidenceRefs: [...new Set([...task.evidenceRefs, ...evidenceRefs.map((ref) => ref.trim())])], updatedAt: at },
  };
}

/** Derives a workflow's aggregate state from task states without executing work. */
export function deriveNoctisWorkflowState(
  taskStates: readonly NoctisTaskState[],
  cancellationRequested = false,
): NoctisWorkflowState {
  if (taskStates.length === 0) return "planned";
  if (taskStates.every((state) => state === "succeeded" || state === "skipped")) return "succeeded";
  if (taskStates.some((state) => state === "cancelled") && taskStates.every((state) => TERMINAL_TASK_STATES.includes(state))) return "cancelled";
  if (taskStates.some((state) => state === "failed") && taskStates.every((state) => TERMINAL_TASK_STATES.includes(state))) return "failed";
  if (cancellationRequested && taskStates.some((state) => state === "running")) return "cancelling";
  if (taskStates.some((state) => state === "blocked")) return "blocked";
  if (taskStates.some((state) => state === "waiting_approval")) return "waiting_approval";
  if (taskStates.some((state) => state === "running")) return "running";
  if (taskStates.some((state) => state === "ready")) return "ready";
  return "planned";
}
