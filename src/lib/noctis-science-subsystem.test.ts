import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCrisprGuideRna,
  simulateMolecularDocking,
  computeQuantumMaterial,
  modelEpidemiologicalSurveillance,
  calculateHohmannTransfer,
  runNoctisScienceAcceptanceTests,
  generateScienceIntelligenceBriefing,
} from "./noctis-science-subsystem.ts";

describe("NOCTIS SCIENCE — Multi-Disciplinary Scientific Computing & Biomolecular Simulation Engine (NSC-BIO-001)", () => {
  test("executes all 25/25 formal production acceptance tests with zero failures", () => {
    const results = runNoctisScienceAcceptanceTests();
    assert.strictEqual(results.length, 25, "Must execute exactly 25 acceptance tests");

    const failures = results.filter((t) => t.status === "FAIL");
    assert.strictEqual(
      failures.length,
      0,
      `Expected 0 failures, but got: ${failures.map((f) => `${f.testId} (${f.name})`).join(", ")}`
    );

    const domains = new Set(results.map((t) => t.domain));
    assert.ok(domains.has("GENOMICS"), "Missing GENOMICS tests");
    assert.ok(domains.has("MOLECULAR_DOCKING"), "Missing MOLECULAR_DOCKING tests");
    assert.ok(domains.has("QUANTUM_MATERIALS"), "Missing QUANTUM_MATERIALS tests");
    assert.ok(domains.has("EPIDEMIOLOGY"), "Missing EPIDEMIOLOGY tests");
    assert.ok(domains.has("ASTROPHYSICS"), "Missing ASTROPHYSICS tests");
    assert.ok(domains.has("SQDEC_VERIFICATION"), "Missing SQDEC_VERIFICATION tests");
  });

  test("validates CRISPR guide RNA and flags invalid PAM sequences", () => {
    const valid = evaluateCrisprGuideRna("ACGTGATCGATCGATCGATC", "CCR5", "SpCas9", "CGG");
    assert.strictEqual(valid.pamValid, true);
    assert.strictEqual(valid.recommendation, "APPROVED_FOR_SYNTHESIS");

    const invalid = evaluateCrisprGuideRna("ACGTGATCGATCGATCGATC", "CCR5", "SpCas9", "CCA");
    assert.strictEqual(invalid.pamValid, false);
    assert.strictEqual(invalid.recommendation, "REVISE_PAM_OR_GC");
  });

  test("computes molecular docking thermodynamics and inhibition constants correctly", () => {
    const res = simulateMolecularDocking({ bindingAffinityKcalMol: -9.4 });
    assert.ok(res.bindingAffinityKcalMol < 0);
    assert.ok(res.inhibitionConstantNm > 0);
    assert.strictEqual(res.stabilityCategory, "HIGH_AFFINITY_STABLE");
    assert.ok(res.keyResiduesInteracting.length >= 3);
  });

  test("computes quantum materials electronic bandgap and space group symmetry", () => {
    const matSi = computeQuantumMaterial("Silicon");
    assert.strictEqual(matSi.bandgapEv, 1.12);
    assert.strictEqual(matSi.spaceGroupNumber, 227);
    assert.strictEqual(matSi.electronicNature, "SEMICONDUCTOR_INDIRECT");

    const matG = computeQuantumMaterial("Graphene");
    assert.strictEqual(matG.bandgapEv, 0.0);
    assert.strictEqual(matG.electronicNature, "METAL");
  });

  test("calculates celestial Hohmann transfer delta-v budget with vis-viva equations", () => {
    const orbit = calculateHohmannTransfer(6778.0, 42164.0);
    assert.ok(orbit.totalDeltaVKmS > 3.8 && orbit.totalDeltaVKmS < 4.1);
    assert.ok(orbit.timeOfFlightHours > 5.0 && orbit.timeOfFlightHours < 5.5);
    assert.strictEqual(orbit.trajectoryFeasibility, "OPTIMAL");
  });

  test("generates complete multi-disciplinary science intelligence briefing", () => {
    const g = evaluateCrisprGuideRna("ACGTGATCGATCGATCGATC", "CCR5", "SpCas9", "CGG");
    const d = simulateMolecularDocking({ bindingAffinityKcalMol: -9.5 });
    const m = computeQuantumMaterial("Li10GeP2S12 (LGPS)");
    const e = modelEpidemiologicalSurveillance({ r0: 2.2, susceptibleFraction: 0.85 });
    const o = calculateHohmannTransfer(6778.0, 42164.0);

    const briefing = generateScienceIntelligenceBriefing(g, d, m, e, o);
    assert.ok(briefing.includes("NSC-BIO-001"));
    assert.ok(briefing.includes("Genomics & CRISPR Precision Assessment"));
    assert.ok(briefing.includes("Molecular Docking & Binding Thermodynamics"));
    assert.ok(briefing.includes("Quantum Materials & Solid-State Chemistry"));
    assert.ok(briefing.includes("Epidemiological Surveillance"));
    assert.ok(briefing.includes("Celestial Mechanics & Orbital Trajectory"));
  });
});
