import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateEvtEligibility,
  evaluateStrokeReperfusion,
  type StrokePatientProfile,
} from "./noctis-stroke-reperfusion.ts";

describe("Noctis Comprehensive Stroke Code & Reperfusion Engine (Track 30)", () => {
  const baseProfile: StrokePatientProfile = {
    encounterId: "ENC-STROKE-001",
    patientAge: 68,
    nihssScore: 16,
    symptomOnsetHours: 2.0,
    aspectsScore: 9,
    lvoSite: "MCA_M1",
    systolicBpMmHg: 168,
    diastolicBpMmHg: 94,
    bloodGlucoseMgDl: 124,
    plateletsPerUl: 240000,
    inrValue: 1.1,
    recentAnticoagulantUse: false,
  };

  test("evaluates standard window (< 4.5h) intravenous thrombolysis & EVT eligibility", () => {
    const report = evaluateStrokeReperfusion(baseProfile);
    assert.strictEqual(report.thrombolysisEligibility.eligible, true);
    assert.strictEqual(report.evtEligibility.eligibleForEvt, true);
    assert.strictEqual(report.evtEligibility.windowClassification, "STANDARD_0_TO_6H");
    assert.strictEqual(report.trippedInvariants.length, 0);
  });

  test("evaluates extended window (6-24h) EVT via DAWN & DEFUSE 3 criteria", () => {
    const extendedProfile: StrokePatientProfile = {
      ...baseProfile,
      symptomOnsetHours: 9.5,
      ischemicCoreVolumeMl: 18,
      hypoperfusedVolumeMl: 85,
    };
    const evt = evaluateEvtEligibility(extendedProfile);
    assert.strictEqual(evt.eligibleForEvt, true);
    assert.strictEqual(evt.windowClassification, "EXTENDED_6_TO_24H");
    assert.ok(evt.criteriaMet.some((c) => c.includes("DEFUSE 3")));
  });

  test("trips CF-STROKE-001 (Post-Thrombolytic Anticoagulation Lockout) when heparin/DAPT ordered < 24h", () => {
    const heparinProfile: StrokePatientProfile = {
      ...baseProfile,
      proposedOrders: ["THERAPEUTIC_ANTICOAGULATION_HEPARIN"],
    };
    const report = evaluateStrokeReperfusion(heparinProfile);
    assert.ok(report.trippedInvariants.includes("CF-STROKE-001"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Post-Thrombolytic Anticoagulant")));
  });

  test("trips CF-STROKE-002 (SBP Permissive Hypertension Overshoot Veto) when BP >= 185/110 mmHg", () => {
    const highBpProfile: StrokePatientProfile = {
      ...baseProfile,
      systolicBpMmHg: 194,
      diastolicBpMmHg: 112,
    };
    const report = evaluateStrokeReperfusion(highBpProfile);
    assert.strictEqual(report.thrombolysisEligibility.eligible, false);
    assert.ok(report.trippedInvariants.includes("CF-STROKE-002"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Blood Pressure Threshold Exceeded")));
  });

  test("trips CF-STROKE-003 (Extended Window EVT Without CTP Perfusion Mismatch Veto)", () => {
    const noMismatchProfile: StrokePatientProfile = {
      ...baseProfile,
      symptomOnsetHours: 12.0,
      ischemicCoreVolumeMl: 80, // Large core > 70 mL
      hypoperfusedVolumeMl: 90,
      proposedOrders: ["PROCEED_TO_CATH_LAB_GROIN_PUNCTURE"],
    };
    const report = evaluateStrokeReperfusion(noMismatchProfile);
    assert.ok(report.trippedInvariants.includes("CF-STROKE-003"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Extended Window Groin Puncture Without Verified Penumbra")));
  });

  test("trips CF-STROKE-004 (Symptomatic ICH Acute Reversal Directive) on post-tPA deterioration", () => {
    const sIchProfile: StrokePatientProfile = {
      ...baseProfile,
      proposedOrders: ["ACUTE_NEUROLOGIC_DETERIORATION_POST_TPA"],
    };
    const report = evaluateStrokeReperfusion(sIchProfile);
    assert.ok(report.trippedInvariants.includes("CF-STROKE-004"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Cryoprecipitate") && d.includes("Tranexamic Acid")));
  });
});
