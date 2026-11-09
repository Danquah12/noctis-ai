import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateDkaMetrics,
  evaluateDkaHhsProtocol,
  formatDkaSpokenSummary,
  DKA_PRESET_HYPOKALEMIA,
  DKA_PRESET_DEXTROSE_OMISSION,
  DKA_PRESET_BICARB_ABUSE,
  type DkaPatientProfile,
} from "./noctis-dka-hhs-protocol.ts";

describe("Noctis Diabetic Ketoacidosis (DKA) & HHS Protocol Engine (Track 26)", () => {
  test("calculates anion gap, corrected sodium, and effective osmolality accurately", () => {
    // Samantha Hayes: Na 132, Cl 96, HCO3 8, Glucose 520
    // Anion Gap = 132 - (96 + 8) = 28 mEq/L
    // Corrected Na = 132 + 1.6 * (420 / 100) = 132 + 6.72 = 138.7 mEq/L
    // Effective Osm = 2 * 132 + 520 / 18 = 264 + 28.89 = 292.9 mOsm/kg
    const metrics = calculateDkaMetrics(DKA_PRESET_HYPOKALEMIA);

    assert.strictEqual(metrics.anionGapMeqPerL, 28);
    assert.strictEqual(metrics.correctedSodiumMeqPerL, 138.7);
    assert.strictEqual(metrics.effectiveOsmolalityMOsmPerKg, 292.9);
    assert.strictEqual(metrics.crisisClassification, "SEVERE_DKA");
    assert.strictEqual(metrics.recommendedInsulinRateUnitsPerHour, 6.0); // 0.1 * 60kg
  });

  test("trips CF-DKA-001 (Hypokalemic Insulin Infusion Veto) when potassium is < 3.3 mEq/L", () => {
    const report = evaluateDkaHhsProtocol(DKA_PRESET_HYPOKALEMIA);

    assert.ok(report.trippedInvariants.includes("CF-DKA-001"));
    assert.strictEqual(report.potassiumCheckpointStatus, "HOLD_INSULIN_AGGRESSIVE_REPLETION");
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("HYPOKALEMIC INSULIN INFUSION FATAL ARRHYTHMIA VETO") && a.includes("HOLD INSULIN")
      )
    );
  });

  test("trips CF-DKA-002 (Dextrose Omission Veto) when glucose drops < 200 mg/dL with open anion gap", () => {
    const report = evaluateDkaHhsProtocol(DKA_PRESET_DEXTROSE_OMISSION);

    assert.ok(report.trippedInvariants.includes("CF-DKA-002"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("DEXTROSE OMISSION & CEREBRAL EDEMA VETO") && a.includes("ADD 5% OR 10% DEXTROSE")
      )
    );
  });

  test("trips CF-DKA-003 (Premature IV Insulin Discontinuation Veto) when IV infusion is stopped without overlap", () => {
    const stoppingProfile: DkaPatientProfile = {
      ...DKA_PRESET_DEXTROSE_OMISSION,
      insulinInfusionActive: false, // Stopped abruptly!
      subcutaneousBasalGivenHoursAgo: undefined,
    };

    const report = evaluateDkaHhsProtocol(stoppingProfile);
    assert.ok(report.trippedInvariants.includes("CF-DKA-003"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("PREMATURE IV INSULIN DISCONTINUATION REBOUND VETO") && a.includes("2-hour overlap")
      )
    );
  });

  test("trips CF-DKA-004 (Inappropriate Sodium Bicarbonate Veto) when pH >= 6.90", () => {
    const report = evaluateDkaHhsProtocol(DKA_PRESET_BICARB_ABUSE);

    assert.ok(report.trippedInvariants.includes("CF-DKA-004"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("INAPPROPRIATE SODIUM BICARBONATE VETO") && a.includes("CANCEL SODIUM BICARBONATE")
      )
    );
  });

  test("formats zero-truncation spoken audio summary with clinical precision", () => {
    const report = evaluateDkaHhsProtocol(DKA_PRESET_HYPOKALEMIA);
    const spoken = formatDkaSpokenSummary(report);

    assert.ok(spoken.includes("Samantha Hayes"));
    assert.ok(spoken.includes("severe dka"));
    assert.ok(spoken.includes("anion gap is 28"));
    assert.ok(spoken.includes("CF-DKA-001"));
  });
});
