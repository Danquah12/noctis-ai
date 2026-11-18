import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createNoctisWorkflowFromPlan } from "./noctis-plan-workflow-adapter.ts";
import type { NoctisOrchestrationPlan } from "./noctis-universal-orchestrator.ts";

const AT = "2026-11-07T13:00:00Z";

function plan(overrides: Partial<NoctisOrchestrationPlan> = {}): NoctisOrchestrationPlan {
  return {
    planVersion: "1.0",
    planId: "noctis-plan:req-1",
    status: "plan_only",
    requestSummary: "Assess a security finding.",
    selectedDomains: ["cybersecurity"],
    steps: [
      {
        stepId: "core-checks", engineId: "noctis.core.checks", capability: "checks.evaluate",
        purpose: "Validate inputs.", dependsOn: [], executionMode: "analysis",
        requiresEvidence: false, requiresHumanReview: false,
      },
      {
        stepId: "evidence", engineId: "noctis.evidence.retrieval", capability: "evidence.retrieve",
        purpose: "Retrieve evidence.", dependsOn: ["core-checks"], executionMode: "analysis",
        requiresEvidence: false, requiresHumanReview: false,
      },
      {
        stepId: "specialist", engineId: "noctis.cyber.vulnerability", capability: "cyber.vulnerability.assess",
        purpose: "Assess finding.", dependsOn: ["core-checks", "evidence"], executionMode: "analysis",
        requiresEvidence: true, requiresHumanReview: true,
      },
    ],
    approvalRequired: true,
    evidenceRequired: true,
    executionBlocked: true,
    limitations: ["Plan only."],
    ...overrides,
  };
}

describe("Noctis plan-to-workflow adapter", () => {
  it("converts a valid plan into pending workflow tasks without execution", () => {
    const result = createNoctisWorkflowFromPlan(plan(), AT);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.workflow.state, "planned");
    assert.deepEqual(result.workflow.taskIds, ["core-checks", "evidence", "specialist"]);
    assert.ok(result.tasks.every((task) => task.state === "pending"));
    assert.equal(result.tasks[2].evidenceRequired, true);
    assert.equal(result.tasks[2].approvalRequired, true);
    assert.equal(result.tasks[2].dependsOn.length, 2);
  });

  it("preserves an explicitly bounded retry policy", () => {
    const result = createNoctisWorkflowFromPlan(plan(), AT, 3);
    assert.equal(result.ok, true);
    if (result.ok) assert.ok(result.tasks.every((task) => task.maxAttempts === 3));
  });

  it("rejects plans that do not explicitly block execution", () => {
    const result = createNoctisWorkflowFromPlan(plan({ executionBlocked: false as unknown as true }), AT);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_PLAN");
  });

  it("rejects invalid timestamps", () => {
    const result = createNoctisWorkflowFromPlan(plan(), "tomorrow");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_TIMESTAMP");
  });

  it("rejects duplicate step identifiers", () => {
    const source = plan();
    const result = createNoctisWorkflowFromPlan({
      ...source,
      steps: [source.steps[0], { ...source.steps[1], stepId: source.steps[0].stepId }],
    }, AT);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "DUPLICATE_OR_INVALID_STEP");
  });

  it("rejects unresolved dependency references", () => {
    const source = plan();
    const result = createNoctisWorkflowFromPlan({
      ...source,
      steps: [{ ...source.steps[0], dependsOn: ["missing-step"] }],
    }, AT);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "UNKNOWN_DEPENDENCY");
  });

  it("rejects dependency cycles", () => {
    const source = plan();
    const result = createNoctisWorkflowFromPlan({
      ...source,
      steps: [
        { ...source.steps[0], dependsOn: ["specialist"] },
        source.steps[1],
        source.steps[2],
      ],
    }, AT);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "DEPENDENCY_CYCLE");
  });

  it("does not create partial output when task contract validation fails", () => {
    const source = plan();
    const result = createNoctisWorkflowFromPlan({
      ...source,
      steps: [{ ...source.steps[0], capability: " " }],
    }, AT);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_TASK");
  });
});
