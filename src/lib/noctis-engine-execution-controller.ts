/**
 * Bounded, analysis-only multi-engine execution controller.
 *
 * This controller invokes only explicitly injected adapters after validating
 * each engine request against the descriptive registry. Trusted identity,
 * scopes, evidence references and classification must be supplied by a
 * server-side caller derived from authenticated policy services. It does not
 * provide authentication, authoritative evidence/approval resolution,
 * persistence, sandboxing or production worker dispatch.
 */

import {
  validateNoctisEngineRequest,
  type NoctisEngineRequest,
} from "./noctis-engine-registry.ts";
import {
  reconcileNoctisSpecialistResults,
  type NoctisSpecialistResult,
  type NoctisReconciliationReport,
} from "./noctis-result-reconciliation.ts";

export type NoctisExecutionTask = {
  taskId: string;
  engineId: string;
  capability: string;
  dependsOn: readonly string[];
  input: unknown;
  evidenceIds?: readonly string[];
  approvalId?: string;
};

export type NoctisEngineExecutionAdapter = {
  engineId: string;
  execute(request: NoctisEngineRequest): Promise<NoctisSpecialistResult>;
};

export type NoctisExecutionContext = {
  requestId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  at: string;
  scopes: readonly string[];
  dataClassification: "public" | "internal" | "confidential" | "restricted";
  executionMode?: "analysis";
  maxTasks?: number;
};

export type NoctisExecutionTaskOutcome = {
  taskId: string;
  engineId: string;
  status: "succeeded" | "partial" | "failed" | "blocked" | "not_run";
  result?: NoctisSpecialistResult;
  errorCode?: string;
  message?: string;
};

export type NoctisExecutionReport = {
  requestId: string;
  status: "completed" | "partial" | "failed" | "rejected";
  executionMode: "analysis";
  outcomes: NoctisExecutionTaskOutcome[];
  reconciliation?: NoctisReconciliationReport;
  reconciliationError?: string;
  executedCount: number;
  blockedCount: number;
  limitations: string[];
};

export type NoctisExecutionErrorCode =
  | "INVALID_CONTEXT" | "INVALID_GRAPH" | "TASK_LIMIT_EXCEEDED"
  | "DUPLICATE_ADAPTER" | "ADAPTER_NOT_FOUND" | "ADAPTER_ENGINE_MISMATCH"
  | "REQUEST_REJECTED" | "ADAPTER_ERROR" | "RESULT_MISMATCH";

export type NoctisExecutionResult =
  | { ok: true; report: NoctisExecutionReport }
  | { ok: false; code: NoctisExecutionErrorCode; message: string };

function fail(code: NoctisExecutionErrorCode, message: string): NoctisExecutionResult {
  return { ok: false, code, message };
}

function validGraph(tasks: readonly NoctisExecutionTask[]): string | null {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (!task || !task.taskId?.trim() || !task.engineId?.trim() ||
        !task.capability?.trim() || !Array.isArray(task.dependsOn)) return "Every task needs an ID, engine, capability and dependency list.";
    if (ids.has(task.taskId)) return `Duplicate task ID: ${task.taskId}.`;
    ids.add(task.taskId);
  }
  for (const task of tasks) {
    const dependencies = new Set<string>();
    for (const dependency of task.dependsOn) {
      if (!dependency?.trim() || !ids.has(dependency) || dependency === task.taskId || dependencies.has(dependency)) {
        return `Task ${task.taskId} has an invalid dependency reference.`;
      }
      dependencies.add(dependency);
    }
  }
  const resolved = new Set<string>();
  while (resolved.size < tasks.length) {
    const ready = tasks.filter((task) =>
      !resolved.has(task.taskId) && task.dependsOn.every((id) => resolved.has(id))
    );
    if (!ready.length) return "Execution graph contains a dependency cycle.";
    for (const task of ready) resolved.add(task.taskId);
  }
  return null;
}

/**
 * Executes an explicit task DAG sequentially in stable topological order.
 * Failed/partial prerequisites block descendants; independent branches continue.
 * Adapter exceptions are isolated and recorded, not retried automatically.
 */
export async function executeNoctisAnalysisGraph(input: {
  context: NoctisExecutionContext;
  tasks: readonly NoctisExecutionTask[];
  adapters: readonly NoctisEngineExecutionAdapter[];
}): Promise<NoctisExecutionResult> {
  if (!input || typeof input !== "object") return fail("INVALID_CONTEXT", "Execution input is required.");
  const context = input.context;
  if (!context || !context.requestId?.trim() || !context.tenantId?.trim() ||
      !context.actorId?.trim() || !context.correlationId?.trim() ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(context.at) || !Number.isFinite(Date.parse(context.at)) ||
      !Array.isArray(context.scopes) || !context.scopes.length ||
      !["public", "internal", "confidential", "restricted"].includes(context.dataClassification) ||
      (context.executionMode !== undefined && context.executionMode !== "analysis")) {
    return fail("INVALID_CONTEXT", "A trusted identity, scopes, correlation ID, classification and analysis-only mode are required.");
  }
  if (!Array.isArray(input.tasks) || !input.tasks.length || !Array.isArray(input.adapters)) {
    return fail("INVALID_GRAPH", "Tasks and adapters must be arrays.");
  }
  const maxTasks = context.maxTasks ?? 20;
  if (!Number.isInteger(maxTasks) || maxTasks < 1 || maxTasks > 100) {
    return fail("INVALID_CONTEXT", "maxTasks must be an integer from 1 through 100.");
  }
  if (input.tasks.length > maxTasks) return fail("TASK_LIMIT_EXCEEDED", "Execution graph exceeds the configured task limit.");
  const graphError = validGraph(input.tasks);
  if (graphError) return fail("INVALID_GRAPH", graphError);

  const adapters = new Map<string, NoctisEngineExecutionAdapter>();
  for (const adapter of input.adapters) {
    if (!adapter?.engineId?.trim() || typeof adapter.execute !== "function") {
      return fail("ADAPTER_NOT_FOUND", "Every adapter must declare an engine ID and execute function.");
    }
    if (adapters.has(adapter.engineId)) return fail("DUPLICATE_ADAPTER", `Multiple adapters registered for ${adapter.engineId}.`);
    adapters.set(adapter.engineId, adapter);
  }

  const pending = new Map<string, NoctisExecutionTask>(input.tasks.map((task): [string, NoctisExecutionTask] => [task.taskId, task]));
  const outcomes = new Map<string, NoctisExecutionTaskOutcome>();
  let executedCount = 0;
  while (pending.size) {
    const ready = [...pending.values()]
      .filter((task) => task.dependsOn.every((id) => outcomes.has(id)))
      .sort((a, b) => a.taskId.localeCompare(b.taskId));
    if (!ready.length) return fail("INVALID_GRAPH", "Execution graph could not be topologically ordered.");
    for (const task of ready) {
      pending.delete(task.taskId);
      const dependencyOutcomes = task.dependsOn.map((id) => outcomes.get(id)!);
      if (dependencyOutcomes.some((outcome) => outcome.status !== "succeeded")) {
        outcomes.set(task.taskId, {
          taskId: task.taskId, engineId: task.engineId, status: "blocked",
          errorCode: "DEPENDENCY_NOT_SUCCESSFUL",
          message: "One or more prerequisite engines did not complete successfully.",
        });
        continue;
      }

      const adapter = adapters.get(task.engineId);
      if (!adapter) {
        outcomes.set(task.taskId, {
          taskId: task.taskId, engineId: task.engineId, status: "failed",
          errorCode: "ADAPTER_NOT_FOUND", message: "No runtime adapter is registered for this engine.",
        });
        continue;
      }
      const request: NoctisEngineRequest = {
        requestId: `${context.requestId}:${task.taskId}`,
        tenantId: context.tenantId,
        actorId: context.actorId,
        engineId: task.engineId,
        capability: task.capability,
        input: task.input,
        context: { correlationId: context.correlationId, evidenceIds: task.evidenceIds },
        authorization: {
          scopes: context.scopes,
          executionMode: "analysis",
          approvalId: task.approvalId,
        },
        constraints: { dataClassification: context.dataClassification },
      };
      const validation = validateNoctisEngineRequest(request);
      if (!validation.ok) {
        outcomes.set(task.taskId, {
          taskId: task.taskId, engineId: task.engineId, status: "failed",
          errorCode: validation.code, message: validation.message,
        });
        continue;
      }
      if (validation.manifest.executionModes.includes("analysis") === false) {
        outcomes.set(task.taskId, {
          taskId: task.taskId, engineId: task.engineId, status: "failed",
          errorCode: "REQUEST_REJECTED", message: "Registry does not permit analysis execution for this engine.",
        });
        continue;
      }

      executedCount += 1;
      try {
        const result = await adapter.execute(request);
        if (!result || result.engineId !== task.engineId ||
            !result.resultId?.trim() ||
            !["complete", "partial", "failed"].includes(result.status) ||
            !Array.isArray(result.claims) || !Array.isArray(result.evidence) ||
            !Array.isArray(result.limitations)) {
          outcomes.set(task.taskId, {
            taskId: task.taskId, engineId: task.engineId, status: "failed",
            errorCode: "RESULT_MISMATCH", message: "Adapter returned a malformed result or a result for another engine.",
          });
          continue;
        }
        outcomes.set(task.taskId, {
          taskId: task.taskId, engineId: task.engineId,
          status: result.status === "complete" ? "succeeded" : result.status,
          result,
          ...(result.status !== "complete" ? {
            errorCode: result.status === "partial" ? "PARTIAL_RESULT" : "ENGINE_FAILED",
            message: "Specialist result is not complete; dependent tasks will not run.",
          } : {}),
        });
      } catch {
        outcomes.set(task.taskId, {
          taskId: task.taskId, engineId: task.engineId, status: "failed",
          errorCode: "ADAPTER_ERROR", message: "Specialist adapter failed; details are intentionally not exposed.",
        });
      }
    }
  }

  const orderedOutcomes = input.tasks.map((task) => outcomes.get(task.taskId)!);
  const specialistResults = orderedOutcomes.flatMap((outcome) => outcome.result ? [outcome.result] : []);
  const reconciliation = specialistResults.length
    ? reconcileNoctisSpecialistResults({ requestId: context.requestId, at: context.at, results: specialistResults })
    : null;
  const failedCount = orderedOutcomes.filter((outcome) => outcome.status === "failed").length;
  const partialCount = orderedOutcomes.filter((outcome) => outcome.status === "partial").length;
  const blockedCount = orderedOutcomes.filter((outcome) => outcome.status === "blocked").length;
  const succeededCount = orderedOutcomes.filter((outcome) => outcome.status === "succeeded").length;
  const reconciliationNeedsReview = reconciliation !== null &&
    (!reconciliation.ok || reconciliation.report.status !== "consistent");
  const status = failedCount === 0 && partialCount === 0 && blockedCount === 0 && !reconciliationNeedsReview
    ? "completed"
    : succeededCount === 0 ? "failed" : "partial";

  return {
    ok: true,
    report: {
      requestId: context.requestId,
      status,
      executionMode: "analysis",
      outcomes: orderedOutcomes,
      ...(reconciliation?.ok ? { reconciliation: reconciliation.report } : {}),
      ...(reconciliation && !reconciliation.ok ? { reconciliationError: reconciliation.message } : {}),
      executedCount,
      blockedCount,
      limitations: [
        "Only analysis-mode adapters were invoked; this controller cannot authorize consequential or write actions.",
        "Identity and scopes must be derived by the authenticated server; registry validation is not an authorization provider.",
        "Evidence IDs are references only; authoritative evidence freshness, access and approval checks must occur in trusted adapters.",
        "Adapters are injected by the caller. No production engine adapters, sandbox, persistence, worker dispatch or automatic retry are connected here.",
        "Specialist results must be reconciled and independently evidence-validated before being treated as a unified conclusion.",
      ],
    },
  };
}
