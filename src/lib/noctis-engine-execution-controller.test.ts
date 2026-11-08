import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  executeNoctisAnalysisGraph,
  type NoctisEngineExecutionAdapter,
  type NoctisExecutionTask,
} from "./noctis-engine-execution-controller.ts";
import type { NoctisSpecialistResult } from "./noctis-result-reconciliation.ts";

const context = {
  requestId: "multi-req-1",
  tenantId: "tenant-1",
  actorId: "actor-1",
  correlationId: "corr-1",
  scopes: ["cyber:read", "risk:read"],
  dataClassification: "confidential" as const,
  maxTasks: 10,
};

function result(engineId: string, resultId: string): NoctisSpecialistResult {
  return { resultId, engineId, status: "complete", claims: [], evidence: [], limitations: [] };
}

const tasks: NoctisExecutionTask[] = [
  {
    taskId: "cyber",
    engineId: "noctis.cyber.sast",
    capability: "cyber.sast.analyze",
    dependsOn: [],
    input: { finding: "SQL injection candidate" },
    evidenceIds: ["evidence-1"],
  },
  {
    taskId: "risk",
    engineId: "noctis.risk.rmf",
    capability: "risk.rmf.assess",
    dependsOn: ["cyber"],
    input: { controlFamily: "AC" },
    evidenceIds: ["evidence-1"],
  },
];

describe("Noctis analysis execution controller", () => {
  it("executes a dependency graph in topological order and passes trusted context", async () => {
    const order: string[] = [];
    const adapters: NoctisEngineExecutionAdapter[] = [
      {
        engineId: "noctis.risk.rmf",
        execute: async (request) => {
          order.push("risk");
          assert.equal(request.tenantId, "tenant-1");
          assert.equal(request.authorization.executionMode, "analysis");
          return result(request.engineId, "risk-result");
        },
      },
      {
        engineId: "noctis.cyber.sast",
        execute: async (request) => {
          order.push("cyber");
          assert.deepEqual(request.context.evidenceIds, ["evidence-1"]);
          return result(request.engineId, "cyber-result");
        },
      },
    ];
    const output = await executeNoctisAnalysisGraph({ context, tasks, adapters });
    assert.equal(output.ok, true);
    if (output.ok) {
      assert.deepEqual(order, ["cyber", "risk"]);
      assert.equal(output.report.status, "completed");
      assert.equal(output.report.executedCount, 2);
      assert.deepEqual(output.report.outcomes.map((item) => item.status), ["succeeded", "succeeded"]);
    }
  });

  it("blocks descendants after a failed prerequisite but continues independent branches", async () => {
    const independent = {
      taskId: "independent",
      engineId: "noctis.cyber.sast",
      capability: "cyber.sast.analyze",
      dependsOn: [] as string[],
      input: {},
      evidenceIds: ["evidence-1"],
    };
    const graph = [...tasks, independent];
    const adapters: NoctisEngineExecutionAdapter[] = [
      { engineId: "noctis.cyber.sast", execute: async (request) => {
        if (request.requestId.endsWith(":cyber")) throw new Error("internal adapter detail");
        return result(request.engineId, "independent-result");
      } },
      { engineId: "noctis.risk.rmf", execute: async (request) => result(request.engineId, "risk-result") },
    ];
    const output = await executeNoctisAnalysisGraph({ context, tasks: graph, adapters });
    assert.equal(output.ok, true);
    if (output.ok) {
      assert.deepEqual(output.report.outcomes.map((item) => item.status), ["failed", "blocked", "succeeded"]);
      assert.equal(output.report.status, "partial");
      assert.equal(output.report.blockedCount, 1);
      assert.ok(!output.report.outcomes[0].message?.includes("internal adapter detail"));
    }
  });

  it("rejects missing scopes before calling an adapter", async () => {
    let called = false;
    const output = await executeNoctisAnalysisGraph({
      context: { ...context, scopes: ["risk:read"] },
      tasks: [tasks[0]],
      adapters: [{ engineId: "noctis.cyber.sast", execute: async (request) => {
        called = true;
        return result(request.engineId, "never");
      } }],
    });
    assert.equal(output.ok, true);
    if (output.ok) assert.equal(output.report.outcomes[0].errorCode, "SCOPE_REQUIRED");
    assert.equal(called, false);
  });

  it("rejects malformed graphs, duplicate adapters and mismatched adapter results", async () => {
    const cycle = [
      { ...tasks[0], taskId: "a", dependsOn: ["b"] },
      { ...tasks[0], taskId: "b", dependsOn: ["a"] },
    ];
    const cyclic = await executeNoctisAnalysisGraph({ context, tasks: cycle, adapters: [] });
    assert.deepEqual(cyclic, {
      ok: false, code: "INVALID_GRAPH", message: "Execution graph contains a dependency cycle.",
    });

    const duplicate = await executeNoctisAnalysisGraph({
      context, tasks: [tasks[0]],
      adapters: [
        { engineId: "noctis.cyber.sast", execute: async (request) => result(request.engineId, "one") },
        { engineId: "noctis.cyber.sast", execute: async (request) => result(request.engineId, "two") },
      ],
    });
    assert.equal(duplicate.ok, false);
    if (!duplicate.ok) assert.equal(duplicate.code, "DUPLICATE_ADAPTER");

    const mismatch = await executeNoctisAnalysisGraph({
      context, tasks: [tasks[0]],
      adapters: [{ engineId: "noctis.cyber.sast", execute: async () => result("noctis.risk.rmf", "wrong-engine") }],
    });
    assert.equal(mismatch.ok, true);
    if (mismatch.ok) assert.equal(mismatch.report.outcomes[0].errorCode, "RESULT_MISMATCH");
  });

  it("enforces task limits and refuses non-analysis execution modes", async () => {
    const tooMany = await executeNoctisAnalysisGraph({
      context: { ...context, maxTasks: 1 }, tasks, adapters: [],
    });
    assert.equal(tooMany.ok, false);
    if (!tooMany.ok) assert.equal(tooMany.code, "TASK_LIMIT_EXCEEDED");

    const nonAnalysis = await executeNoctisAnalysisGraph({
      context: { ...context, executionMode: "supervised" as "analysis" },
      tasks: [], adapters: [],
    });
    assert.equal(nonAnalysis.ok, false);
    if (!nonAnalysis.ok) assert.equal(nonAnalysis.code, "INVALID_CONTEXT");
  });
});
