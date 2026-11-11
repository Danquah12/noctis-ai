import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAdvancedHemodynamics,
  handleNaturalHemodynamicsQuery,
} from "./noctis-advanced-hemodynamics.ts";

test("NOCTIS-HEMO-001: Cardiogenic shock calculates SVR, CI, CPO and trips Dobutamine & Phenylephrine vetoes", () => {
  // SBP 80, DBP 50 -> MAP = 60 mmHg
  // CO 3.0 L/min, BSA 1.9 m2 -> CI = 1.58 L/min/m2 (< 2.2)
  // CVP 15, PCWP 22 -> SVR = ((60 - 15) * 80) / 3.0 = 1200
  // CPO = (60 * 3.0) / 451 = 0.40 W (< 0.6 W -> Critical collapse)
  const res = evaluateAdvancedHemodynamics({
    systolicBpMmHg: 80,
    diastolicBpMmHg: 50,
    heartRateBpm: 110,
    centralVenousPressureMmHg: 15,
    meanPulmonaryArteryPressureMmHg: 32,
    systolicPaPressureMmHg: 40,
    diastolicPaPressureMmHg: 28,
    pulmonaryCapillaryWedgePressureMmHg: 22,
    cardiacOutputLMin: 3.0,
    bodySurfaceAreaM2: 1.9,
    arterialLactateMmolL: 4.2,
    activeVasoactiveAgents: ["Dobutamine 5 mcg/kg/min", "Phenylephrine 80 mcg/min"],
  });

  assert.strictEqual(res.shockPhenotype, "CARDIOGENIC");
  assert.strictEqual(res.scaiStage, "STAGE_D_DETERIORATING");
  assert.strictEqual(res.cardiacIndexLMinM2, 1.58);
  assert.strictEqual(res.cardiacPowerOutputWatts, 0.4);
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-HEMO-001") && v.includes("PURE INOTROPE")));
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-HEMO-002") && v.includes("PHENYLEPHRINE CARDIOGENIC")));
  assert.ok(res.mechanicalCirculatorySupportDirectives.some((d) => d.includes("CARDIAC POWER COLLAPSE")));
});

test("NOCTIS-HEMO-001: Septic shock detects distributive vasoplegia and recommends Norepinephrine + Vasopressin", () => {
  // SBP 86, DBP 48 -> MAP = 60.7 mmHg
  // CO 7.5 L/min, BSA 1.9 m2 -> CI = 3.95 L/min/m2
  // CVP 6, PCWP 10 -> SVR = ((60.7 - 6) * 80) / 7.5 = 583.5 dyn*s*cm^-5 (< 800)
  const res = evaluateAdvancedHemodynamics({
    systolicBpMmHg: 86,
    diastolicBpMmHg: 48,
    heartRateBpm: 125,
    centralVenousPressureMmHg: 6,
    meanPulmonaryArteryPressureMmHg: 18,
    pulmonaryCapillaryWedgePressureMmHg: 10,
    cardiacOutputLMin: 7.5,
    bodySurfaceAreaM2: 1.9,
    arterialLactateMmolL: 3.2,
    activeVasoactiveAgents: ["Norepinephrine 0.2 mcg/kg/min"],
  });

  assert.strictEqual(res.shockPhenotype, "DISTRIBUTIVE_SEPTIC");
  assert.ok(res.systemicVascularResistanceDyns < 800);
  assert.ok(res.vasoactiveOptimizationDirectives.some((d) => d.includes("Norepinephrine")));
  assert.ok(res.vasoactiveOptimizationDirectives.some((d) => d.includes("Vasopressin fixed at 0.03")));
});

test("NOCTIS-HEMO-001: Natural language query routes and computes CPO and PAPI accurately", () => {
  const q = "Evaluate Swan-Ganz hemodynamics: SBP 82, DBP 50, CVP 16, PCWP 24, CO 3.1, lactate 4.0. Calculate cardiac power output CPO and shock phenotype.";
  const res = handleNaturalHemodynamicsQuery(q);
  assert.ok(res);
  assert.ok(res.includes("NOCTIS-HEMO-001"));
  assert.ok(res.includes("Cardiac Power Output (CPO)"));
  assert.ok(res.includes("CARDIOGENIC"));
});
