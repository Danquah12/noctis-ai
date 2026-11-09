import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateKdigoStage,
  evaluateAeiouTriggers,
  evaluateCrrtKdigoProtocol,
  type CrrtPatientProfile,
} from "./noctis-crrt-kdigo.ts";

describe("Noctis CRRT & KDIGO Engine (Track 28)", () => {
  const baseProfile: CrrtPatientProfile = {
    encounterId: "ENC-CRRT-001",
    patientAge: 64,
    baselineCreatinineMgDl: 1.0,
    currentCreatinineMgDl: 3.2,
    urineOutputMlLast6Hours: 80,
    patientWeightKg: 70,
    bloodPh: 7.32,
    serumPotassiumMeqL: 4.8,
    serumBicarbonateMeqL: 18,
    bloodUreaNitrogenMgDl: 52,
    pulmonaryEdemaRefractory: false,
    toxicIngestion: "NONE",
  };

  test("calculates KDIGO Stage 3 AKI accurately based on creatinine 3x and severe oliguria", () => {
    const kdigo = calculateKdigoStage(1.0, 3.2, 80, 70);
    assert.strictEqual(kdigo.stage, 3);
    assert.strictEqual(kdigo.creatinineCriteriaMet, true);
    assert.strictEqual(kdigo.oliguriaCriteriaMet, true);
    assert.ok(kdigo.urineRateMlKgHr < 0.3);
  });

  test("evaluates Furosemide Stress Test (FST) responsive vs non-responsive", () => {
    // Failing FST (< 200 mL in 2h)
    const reportFail = evaluateCrrtKdigoProtocol({
      ...baseProfile,
      fstUrineOutput2HoursMl: 65,
    });
    assert.strictEqual(reportFail.fstAssessment.responsive, false);
    assert.ok(reportFail.fstAssessment.predictiveValue.includes("High specificity"));

    // Responsive FST (>= 200 mL in 2h)
    const reportPass = evaluateCrrtKdigoProtocol({
      ...baseProfile,
      fstUrineOutput2HoursMl: 380,
    });
    assert.strictEqual(reportPass.fstAssessment.responsive, true);
    assert.ok(reportPass.fstAssessment.predictiveValue.includes("Low likelihood"));
  });

  test("detects AEIOU emergent triggers (Acidosis, Electrolytes, Volume Overload)", () => {
    const aeiou = evaluateAeiouTriggers({
      ...baseProfile,
      bloodPh: 7.08,
      serumBicarbonateMeqL: 8,
      serumPotassiumMeqL: 6.8,
      pulmonaryEdemaRefractory: true,
    });
    assert.strictEqual(aeiou.acidosis, true);
    assert.strictEqual(aeiou.electrolytes, true);
    assert.strictEqual(aeiou.overload, true);
    assert.strictEqual(aeiou.urgentIndicationPresent, true);
  });

  test("trips CF-CRRT-001 (Dialysis Dysequilibrium Syndrome Veto) in severe azotemia", () => {
    const ddsProfile: CrrtPatientProfile = {
      ...baseProfile,
      bloodUreaNitrogenMgDl: 135,
      proposedOrders: ["MAX_CLEARANCE_ACUTE_HD"],
    };
    const report = evaluateCrrtKdigoProtocol(ddsProfile);
    assert.ok(report.trippedInvariants.includes("CF-CRRT-001"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Dialysis Dysequilibrium Syndrome")));
  });

  test("trips CF-CRRT-002 (Citrate Toxicity / Citrate Lock Veto) when Total-to-iCa ratio > 2.5", () => {
    const citrateProfile: CrrtPatientProfile = {
      ...baseProfile,
      rcaActive: true,
      circuitPostFilterIonizedCalciumMmolL: 0.28,
      systemicIonizedCalciumMmolL: 0.85, // severely suppressed systemic iCa
      totalSerumCalciumMgDl: 11.2, // total Ca high relative to iCa -> ratio > 2.5
    };
    const report = evaluateCrrtKdigoProtocol(citrateProfile);
    assert.strictEqual(report.rcaStatus.citrateToxicityDetected, true);
    assert.ok(report.trippedInvariants.includes("CF-CRRT-002"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Citrate Accumulation Toxicity")));
  });

  test("trips CF-CRRT-003 (Severe Hyperkalemia Delayed Nephrology Veto) when K >= 6.5 mEq/L", () => {
    const hyperkProfile: CrrtPatientProfile = {
      ...baseProfile,
      serumPotassiumMeqL: 6.9,
    };
    const report = evaluateCrrtKdigoProtocol(hyperkProfile);
    assert.ok(report.trippedInvariants.includes("CF-CRRT-003"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Severe Cardiotoxic Hyperkalemia")));
  });
});
