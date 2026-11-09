import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeSimulation,
  executeSimulationStep,
  runFullSimulationSync,
  formatE2ESpokenExecutiveBriefing,
} from "./noctis-e2e-demo.ts";

test("Noctis Autonomous End-to-End Clinical Demonstration Pipeline", async (t) => {
  await t.test("initializes pipeline with 10 sequential sovereign pillars", () => {
    const sim = initializeSimulation("cardiac_stemi");

    assert.equal(sim.patientName, "Eleanor Thompson");
    assert.equal(sim.steps.length, 10);
    assert.equal(sim.overallStatus, "idle");
    assert.equal(sim.currentStepIndex, 0);
    assert.equal(sim.steps[0].stepId, "ambient");
    assert.equal(sim.steps[9].stepId, "estar");
  });

  await t.test("executes step-by-step through pipeline and updates metrics and invariants", () => {
    let sim = initializeSimulation("cardiac_stemi");

    // Execute step 0 (Ambient)
    sim = executeSimulationStep(sim, 0);
    assert.equal(sim.currentStepIndex, 1);
    assert.ok(sim.steps[0].status === "completed" || sim.steps[0].status === "warning");
    assert.ok(sim.steps[0].metrics["Heart Rate"]);

    // Execute step 5 (PGx) directly
    sim = executeSimulationStep(sim, 5);
    assert.equal(sim.steps[5].status, "veto_asserted", "Must assert binding veto on Clopidogrel");
    assert.ok(sim.steps[5].invariantsTripped.includes("CF-PGX-001"), "Must record CF-PGX-001 invariant");
  });

  await t.test("runs synchronous full simulation of all 10 pillars without errors", () => {
    const fullSim = runFullSimulationSync("cardiac_stemi");

    assert.equal(fullSim.overallStatus, "completed");
    assert.equal(fullSim.currentStepIndex, 10);

    // Verify all 10 steps ran
    fullSim.steps.forEach((step, idx) => {
      assert.notEqual(step.status, "pending", `Step ${idx} (${step.title}) must not be pending`);
      assert.ok(step.summary.length > 10, `Step ${idx} must have substantial summary`);
      assert.ok(Object.keys(step.metrics).length > 0, `Step ${idx} must have metrics`);
    });

    // Check invariant aggregation
    assert.ok(fullSim.allInvariantsTripped.length >= 2, "Must aggregate tripped invariants across steps");
    assert.ok(fullSim.allInvariantsTripped.includes("CF-PGX-001"), "Must include PGx veto");

    // Check full audit dossier text
    assert.ok(fullSim.fullAuditDossier.includes("NOCTIS AUTONOMOUS CLINICAL ENCOUNTER AUDIT DOSSIER"));
    assert.ok(fullSim.fullAuditDossier.includes("Eleanor Thompson"));
  });

  await t.test("formats zero-truncation executive spoken audio summary", () => {
    const fullSim = runFullSimulationSync("cardiac_stemi");
    const spoken = formatE2ESpokenExecutiveBriefing(fullSim);

    assert.ok(spoken.includes("Eleanor Thompson"), "Spoken briefing must include patient name");
    assert.ok(spoken.toLowerCase().includes("ten intelligence pillars"), "Spoken briefing must mention pillars");
    assert.ok(spoken.includes("CYP2C19"), "Spoken briefing must articulate pharmacogenomic details");
    assert.ok(spoken.includes("21 U.S.C. section 360j(o)(1)(E)"), "Spoken briefing must include statutory citation");
  });
});
