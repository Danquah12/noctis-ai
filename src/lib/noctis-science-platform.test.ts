import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SCIENTIFIC_DIVISIONS,
  SPECIALIST_SCIENTIFIC_ENGINES,
  classifyScientificEvidence,
  executeSevenGateVerification,
  DISCOVERY_HYPOTHESIS_CATALOG,
  executePythonScientificSimulation,
  runFull100PlatformAcceptanceTests,
} from "./noctis-science-platform.ts";

describe("NOCTIS SCIENCE PLATFORM — 16 Divisions, 20 Engines & 100 Acceptance Tests (NSC-CORE-2026)", () => {
  test("registers exactly 16 major scientific divisions", () => {
    const keys = Object.keys(SCIENTIFIC_DIVISIONS);
    assert.strictEqual(keys.length, 16, "Must define exactly 16 scientific divisions");
    assert.ok(SCIENTIFIC_DIVISIONS["math-comp"]);
    assert.ok(SCIENTIFIC_DIVISIONS["physics-astro"]);
    assert.ok(SCIENTIFIC_DIVISIONS["chemistry"]);
    assert.ok(SCIENTIFIC_DIVISIONS["biology"]);
    assert.ok(SCIENTIFIC_DIVISIONS["biomedical"]);
    assert.ok(SCIENTIFIC_DIVISIONS["earth-env"]);
    assert.ok(SCIENTIFIC_DIVISIONS["energy"]);
    assert.ok(SCIENTIFIC_DIVISIONS["materials"]);
    assert.ok(SCIENTIFIC_DIVISIONS["electrical"]);
    assert.ok(SCIENTIFIC_DIVISIONS["mechanical-aero"]);
    assert.ok(SCIENTIFIC_DIVISIONS["civil-structural"]);
    assert.ok(SCIENTIFIC_DIVISIONS["computer-science"]);
    assert.ok(SCIENTIFIC_DIVISIONS["agriculture-food"]);
    assert.ok(SCIENTIFIC_DIVISIONS["space-planetary"]);
    assert.ok(SCIENTIFIC_DIVISIONS["neuroscience"]);
    assert.ok(SCIENTIFIC_DIVISIONS["interdisciplinary"]);
  });

  test("deploys exactly 20 specialist AI scientific engines", () => {
    assert.strictEqual(SPECIALIST_SCIENTIFIC_ENGINES.length, 20, "Must define exactly 20 specialist engines");
    const engineIds = new Set(SPECIALIST_SCIENTIFIC_ENGINES.map((e) => e.engineId));
    assert.strictEqual(engineIds.size, 20, "All 20 engines must have unique identifiers");
    for (const e of SPECIALIST_SCIENTIFIC_ENGINES) {
      assert.strictEqual(e.status, "ACTIVE");
      assert.ok(e.verificationMethod.length > 5);
    }
  });

  test("executes the 7-Gate Independent Calculation Verification Pipeline", () => {
    const audit = executeSevenGateVerification(
      "Schwarzschild radius of 10 solar mass black hole",
      29.54,
      "km",
      "r_s = 2GM / c^2"
    );
    assert.strictEqual(audit.symbolicVerification.status, "PASSED");
    assert.strictEqual(audit.numericalCalculation.status, "PASSED");
    assert.strictEqual(audit.dimensionalAnalysis.status, "PASSED");
    assert.strictEqual(audit.boundaryConditions.status, "PASSED");
    assert.strictEqual(audit.assumptionAudit.status, "PASSED");
    assert.strictEqual(audit.literatureProvenance.status, "PASSED");
    assert.strictEqual(audit.immutableLedgerRecord.status, "PASSED");
    assert.ok(audit.overallAssuranceScore > 0.99);
    assert.strictEqual(audit.cryptographicProofHash.length, 64);
  });

  test("classifies scientific evidence across all 7 rigorous tiers", () => {
    const k1 = classifyScientificEvidence("ESTABLISHED_KNOWLEDGE");
    assert.ok(k1.peerReviewConfidence > 0.99);
    const k2 = classifyScientificEvidence("CONTRADICTED_DISPUTED");
    assert.ok(k2.peerReviewConfidence < 0.50);
    const k3 = classifyScientificEvidence("HYPOTHESIS");
    assert.strictEqual(k3.label, "Testable Scientific Hypothesis");
  });

  test("runs Python computational simulations with valid numerical physics and chemistry outputs", () => {
    const phys = executePythonScientificSimulation("PHYSICS");
    assert.strictEqual(phys.executionStatus, "SUCCESS");
    assert.ok(phys.stdout.includes("State 0 (E0): 0.2071 eV"));

    const chem = executePythonScientificSimulation("CHEMISTRY");
    assert.strictEqual(chem.executionStatus, "SUCCESS");
    assert.ok(chem.stdout.includes("Mass Conservation Invariant"));

    const clim = executePythonScientificSimulation("CLIMATE");
    assert.strictEqual(clim.executionStatus, "SUCCESS");
    assert.ok(clim.stdout.includes("Equilibrium Climate Sensitivity (ECS): 2.97 K"));
  });

  test("executes all 100/100 formal platform acceptance tests with zero failures", () => {
    const tests = runFull100PlatformAcceptanceTests();
    assert.strictEqual(tests.length, 100, "Must execute exactly 100 acceptance tests");

    const failures = tests.filter((t) => t.status === "FAIL");
    assert.strictEqual(failures.length, 0, `Expected 0 failures, got: ${failures.length}`);

    const categories = new Set(tests.map((t) => t.category));
    assert.strictEqual(categories.size, 10, "Must cover all 10 categories");
  });
});
