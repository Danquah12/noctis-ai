import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  FUNDAMENTAL_CONSTANTS,
  PERIODIC_TABLE,
  calculateSchwarzschildRadius,
  calculateDeBroglieWavelength,
  calculateRelativisticDynamics,
  calculateHendersonHasselbalch,
  calculateArrheniusKinetics,
  calculateDnaMeltingTemperature,
  calculateHubbleRecession,
  solveScienceQuestion,
  runUniversalScienceAcceptanceTests,
} from "./noctis-universal-science-engine.ts";

describe("NOCTIS UNIVERSAL SCIENCE ENGINE (NSC-UNIV-002)", () => {
  test("executes all 25/25 formal universal acceptance tests with zero failures", () => {
    const results = runUniversalScienceAcceptanceTests();
    assert.strictEqual(results.length, 25, "Must execute exactly 25 tests");

    const failures = results.filter((r) => r.status === "FAIL");
    assert.strictEqual(
      failures.length,
      0,
      `Expected 0 failures, got: ${failures.map((f) => `${f.testId} (${f.name})`).join(", ")}`
    );
  });

  test("calculates accurate physical and chemical solutions via solveScienceQuestion", () => {
    // 1. Schwarzschild
    const bh = solveScienceQuestion("What is the event horizon radius of a 10 solar mass black hole?");
    assert.strictEqual(bh.domain, "ASTROPHYSICS");
    assert.ok(bh.numericalValue! > 29 && bh.numericalValue! < 31);
    assert.ok(bh.stepByStepDerivation.length >= 3);

    // 2. de Broglie
    const qm = solveScienceQuestion("What is the de Broglie wavelength of an electron at 2.2e6 m/s?");
    assert.strictEqual(qm.domain, "PHYSICS");
    assert.ok(qm.numericalValue! > 3.0 && qm.numericalValue! < 3.5);

    // 3. Buffer pH
    const chem = solveScienceQuestion("Calculate the pH of an acetic acid buffer with pKa 4.76, base 0.1M, acid 0.1M");
    assert.strictEqual(chem.domain, "CHEMISTRY");
    assert.strictEqual(chem.numericalValue, 4.76);

    // 4. DNA Primer Tm
    const bio = solveScienceQuestion("Find the melting temp of DNA primer ACGTGATCGATCGATC");
    assert.strictEqual(bio.domain, "BIOLOGY");
    assert.ok(bio.numericalValue! > 40 && bio.numericalValue! < 65);
  });

  test("verifies fundamental physical constants CODATA integrity", () => {
    assert.strictEqual(FUNDAMENTAL_CONSTANTS.c.value, 299792458);
    assert.strictEqual(FUNDAMENTAL_CONSTANTS.h.value, 6.62607015e-34);
    assert.strictEqual(FUNDAMENTAL_CONSTANTS.kB.value, 1.380649e-23);
    assert.strictEqual(FUNDAMENTAL_CONSTANTS.NA.value, 6.02214076e23);
  });

  test("verifies periodic table elements data", () => {
    assert.strictEqual(PERIODIC_TABLE.H.atomicNumber, 1);
    assert.strictEqual(PERIODIC_TABLE.C.atomicNumber, 6);
    assert.strictEqual(PERIODIC_TABLE.O.atomicNumber, 8);
    assert.strictEqual(PERIODIC_TABLE.F.electronegativityPauling, 3.98);
  });
});
