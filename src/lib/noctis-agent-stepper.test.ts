import test from "node:test";
import assert from "node:assert";
import { SAMPLE_AUTONOMOUS_REPORT } from "./autonomous-agent-engine.ts";

test("NOCTIS AGENT STEPPER — UI TELEMETRY & TRACE SPEC", async (t) => {
  await t.test("Validates autonomous report structure and invariants", () => {
    assert.strictEqual(SAMPLE_AUTONOMOUS_REPORT.status, "COMPLETED");
    assert.strictEqual(SAMPLE_AUTONOMOUS_REPORT.totalSteps, 5);
    assert.strictEqual(SAMPLE_AUTONOMOUS_REPORT.selfCorrectionsCount, 1);
    assert.strictEqual(SAMPLE_AUTONOMOUS_REPORT.cryptographicSignature.startsWith("SIG_NOCTIS_SOVEREIGN_"), true);
  });

  await t.test("Validates presence of ReAct Self-Correction cycle", () => {
    const errorStep = SAMPLE_AUTONOMOUS_REPORT.steps.find((s) => s.status === "SELF_CORRECTING");
    assert.ok(errorStep, "Expected at least one SELF_CORRECTING step in report");
    assert.strictEqual(errorStep.stepNumber, 2);
    assert.strictEqual(errorStep.observation?.success, false);

    const healingStep = SAMPLE_AUTONOMOUS_REPORT.steps.find((s) => s.stepNumber === 3);
    assert.ok(healingStep, "Expected healing step immediately after error");
    assert.strictEqual(healingStep.action?.toolName, "edit_file");

    const verificationStep = SAMPLE_AUTONOMOUS_REPORT.steps.find((s) => s.stepNumber === 4);
    assert.ok(verificationStep, "Expected verification re-test step");
    assert.strictEqual(verificationStep.observation?.success, true);
  });

  await t.test("Validates cryptographic deliverable attestation", () => {
    assert.strictEqual(SAMPLE_AUTONOMOUS_REPORT.deliverables.length, 2);
    for (const d of SAMPLE_AUTONOMOUS_REPORT.deliverables) {
      assert.ok(d.path.length > 0);
      assert.strictEqual(d.sha256.length, 64);
      assert.ok(d.bytes > 0);
    }
  });
});
