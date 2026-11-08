import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNoctisOrchestrationPlan } from "./noctis-universal-orchestrator.ts";

describe("Noctis universal orchestration planner", () => {
  it("plans a cross-domain cyber and RMF workflow with shared evidence", () => {
    const plan = buildNoctisOrchestrationPlan({
      requestId: "req-cross-1",
      question: "Assess this SAST vulnerability and map it to NIST 800-53 controls for RMF.",
    });
    assert.deepEqual(plan.selectedDomains, ["cybersecurity", "risk"]);
    assert.equal(plan.status, "plan_only");
    assert.equal(plan.executionBlocked, true);
    assert.equal(plan.evidenceRequired, true);
    assert.ok(plan.steps.some((step) => step.engineId === "noctis.cyber.vulnerability"));
    assert.ok(plan.steps.some((step) => step.engineId === "noctis.risk.rmf"));
    const evidence = plan.steps.find((step) => step.engineId === "noctis.evidence.retrieval");
    assert.ok(evidence);
    assert.ok(plan.steps.filter((step) => step.requiresEvidence).every((step) => step.dependsOn.includes(evidence!.stepId)));
  });

  it("plans clinical review and flags human approval", () => {
    const plan = buildNoctisOrchestrationPlan({
      requestId: "req-health-1",
      question: "Review this patient's pathology and laboratory results.",
    });
    assert.deepEqual(plan.selectedDomains, ["health"]);
    assert.equal(plan.approvalRequired, true);
    assert.ok(plan.steps.some((step) => step.engineId === "noctis.health.clinical" && step.requiresHumanReview));
  });

  it("supports a multi-specialist science and engineering request", () => {
    const plan = buildNoctisOrchestrationPlan({
      requestId: "req-multi-1",
      question: "Research the scientific basis and engineer a solar battery microgrid.",
    });
    assert.deepEqual(plan.selectedDomains, ["science", "engineering"]);
    assert.equal(plan.steps.filter((step) => step.engineId.startsWith("noctis.")).length >= 4, true);
  });

  it("does not invent a specialist route for a general question", () => {
    const plan = buildNoctisOrchestrationPlan({
      requestId: "req-general-1",
      question: "What are three ways to improve my writing?",
    });
    assert.deepEqual(plan.selectedDomains, []);
    assert.equal(plan.approvalRequired, false);
    assert.ok(plan.limitations.some((item) => item.includes("No specialist domain matched")));
  });

  it("rejects missing request identity and empty questions", () => {
    assert.throws(() => buildNoctisOrchestrationPlan({ requestId: "", question: "Explain RMF." }));
    assert.throws(() => buildNoctisOrchestrationPlan({ requestId: "req-1", question: "  " }));
  });

  it("keeps execution disabled and explains registry limitations", () => {
    const plan = buildNoctisOrchestrationPlan({
      requestId: "req-cyber-2",
      question: "Perform a defensive cyber vulnerability assessment.",
    });
    assert.equal(plan.executionBlocked, true);
    assert.ok(plan.limitations.some((item) => item.includes("no specialist engine")));
    assert.equal(plan.steps.every((step) => step.executionMode === "analysis"), true);
  });
});
