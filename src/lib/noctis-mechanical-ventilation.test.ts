import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePredictedBodyWeight,
  calculatePfRatio,
  classifyArdsSeverity,
  evaluateMechanicalVentilation,
  formatVentilatorSpokenSummary,
  VENT_PRESET_SEVERE_ARDS_COVID,
  VENT_PRESET_COPD_AUTOPEEP,
  VENT_PRESET_POST_OP_LUNG_PROTECTIVE,
} from "./noctis-mechanical-ventilation.ts";

describe("Noctis Critical Care Mechanical Ventilation & ARDSNet Titration Engine", () => {
  it("calculates Predicted Body Weight (PBW) using Devine formula for males and females", () => {
    // 5'10" male (70 in) -> 50 + 2.3 * 10 = 73.0 kg
    const malePbw = calculatePredictedBodyWeight("MALE", 70);
    assert.strictEqual(malePbw, 73.0);

    // 5'4" female (64 in) -> 45.5 + 2.3 * 4 = 54.7 kg
    const femalePbw = calculatePredictedBodyWeight("FEMALE", 64);
    assert.strictEqual(femalePbw, 54.7);

    // 5'0" female (60 in) -> 45.5 kg
    const baseFemale = calculatePredictedBodyWeight("FEMALE", 60);
    assert.strictEqual(baseFemale, 45.5);
  });

  it("calculates PaO2 / FiO2 ratio and classifies Berlin ARDS severity correctly", () => {
    // Severe ARDS: P/F <= 100 on PEEP >= 5
    const pf1 = calculatePfRatio(64, 80); // 64 / 0.8 = 80
    assert.strictEqual(pf1, 80);
    assert.strictEqual(classifyArdsSeverity(pf1, 14), "SEVERE");

    // Moderate ARDS: 100 < P/F <= 200 on PEEP >= 5
    const pf2 = calculatePfRatio(75, 50); // 75 / 0.5 = 150
    assert.strictEqual(pf2, 150);
    assert.strictEqual(classifyArdsSeverity(pf2, 8), "MODERATE");

    // Mild ARDS: 200 < P/F <= 300 on PEEP >= 5
    const pf3 = calculatePfRatio(120, 50); // 120 / 0.5 = 240
    assert.strictEqual(pf3, 240);
    assert.strictEqual(classifyArdsSeverity(pf3, 5), "MILD");

    // Non-ARDS or PEEP < 5
    assert.strictEqual(classifyArdsSeverity(240, 4), "NONE");
    assert.strictEqual(classifyArdsSeverity(350, 5), "NONE");
  });

  it("evaluates severe ARDS case and trips CF-VENT-001 (Barotrauma) and CF-VENT-002 (Prone)", () => {
    const report = evaluateMechanicalVentilation(VENT_PRESET_SEVERE_ARDS_COVID);

    assert.strictEqual(report.predictedBodyWeightKg, 73.0);
    assert.strictEqual(report.ardsSeverity, "SEVERE");
    assert.ok(report.drivingPressureCmH2O >= 15 || report.trippedInvariants.includes("CF-VENT-001"));
    assert.ok(report.trippedInvariants.includes("CF-VENT-001"), "Must trip CF-VENT-001 for Pplat 32 > 30");
    assert.ok(report.trippedInvariants.includes("CF-VENT-002"), "Must trip CF-VENT-002 for Severe ARDS with PEEP >= 10");

    // Verify mandatory action contains PROSEVA trial prone positioning directive
    const hasProne = report.mandatoryActions.some((act) => act.includes("prone positioning for >= 16"));
    assert.ok(hasProne, "Must mandate early prone positioning");
  });

  it("evaluates obstructive COPD case with dynamic hyperinflation and trips CF-VENT-003", () => {
    const report = evaluateMechanicalVentilation(VENT_PRESET_COPD_AUTOPEEP);

    assert.ok(report.trippedInvariants.includes("CF-VENT-003"), "Must trip CF-VENT-003 for Auto-PEEP >= 8 cmH2O");
    const hasAutoPeepAction = report.mandatoryActions.some((act) => act.includes("DYNAMIC HYPERINFLATION"));
    assert.ok(hasAutoPeepAction, "Must alert to dynamic hyperinflation and breath-stacking risk");
  });

  it("evaluates standard post-op protective ventilation with zero tripped invariants", () => {
    const report = evaluateMechanicalVentilation(VENT_PRESET_POST_OP_LUNG_PROTECTIVE);

    assert.strictEqual(report.trippedInvariants.length, 0);
    assert.strictEqual(report.ardsSeverity, "NONE");
    assert.ok(report.drivingPressureCmH2O < 15);
  });

  it("generates zero-truncation spoken audio summary with full clinical precision", () => {
    const report = evaluateMechanicalVentilation(VENT_PRESET_SEVERE_ARDS_COVID);
    const spoken = formatVentilatorSpokenSummary(report);

    assert.ok(spoken.includes("Predicted body weight is 73 kilograms"));
    assert.ok(spoken.includes("CF-VENT-001"));
    assert.ok(spoken.includes("prone positioning"));
    assert.ok(spoken.includes("Recommended ventilator titration adjustment"));
  });
});
