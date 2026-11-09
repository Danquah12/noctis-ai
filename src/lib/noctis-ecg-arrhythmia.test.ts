import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBazettQtc,
  calculateFridericiaQtc,
  determineQrsAxisCategory,
  calculateModifiedSgarbossa,
  calculateTisdaleRisk,
  deriveFrankXyzFrom12Lead,
  evaluate12LeadEcg,
  formatEcgSpokenAnalysis,
  ECG_PRESET_ANTERIOR_STEMI,
  ECG_PRESET_WELLENS_LAD,
  ECG_PRESET_HYPERKALEMIC_SINE,
  ECG_PRESET_LONG_QTC_TORSADES,
  ECG_PRESET_NORMAL_SINUS,
} from "./noctis-ecg-arrhythmia.ts";

test("Noctis 12-Lead ECG & Vectorcardiography (VCG) Engine", async (t) => {
  await t.test("calculates accurate Bazett and Fridericia QTc intervals across heart rates", () => {
    // Normal HR 60 bpm (RR = 1.0s) -> Bazett and Fridericia equal raw QT
    assert.equal(calculateBazettQtc(400, 60), 400);
    assert.equal(calculateFridericiaQtc(400, 60), 400);

    // Tachycardia HR 100 bpm (RR = 0.6s) -> QT 360ms
    // Bazett: 360 / sqrt(0.6) = 360 / 0.774596 = 464.75 -> 465
    // Fridericia: 360 / cbrt(0.6) = 360 / 0.84343 = 426.8 -> 427
    assert.equal(calculateBazettQtc(360, 100), 465);
    assert.equal(calculateFridericiaQtc(360, 100), 427);
  });

  await t.test("determines frontal plane QRS axis categories correctly", () => {
    assert.equal(determineQrsAxisCategory(45), "NORMAL_AXIS");
    assert.equal(determineQrsAxisCategory(-45), "LEFT_AXIS_DEVIATION");
    assert.equal(determineQrsAxisCategory(120), "RIGHT_AXIS_DEVIATION");
    assert.equal(determineQrsAxisCategory(-120), "EXTREME_AXIS_DEVIATION");
  });

  await t.test("evaluates Modified Sgarbossa score for STEMI in LBBB", () => {
    // Case 1: Concordant ST elevation >= 1mm (5 points) -> STEMI rule-in
    const res1 = calculateModifiedSgarbossa({
      concordantStElevationGe1mm: true,
      concordantStDepressionV1V3Ge1mm: false,
      excessiveDiscordanceRatioGe25: false,
    });
    assert.equal(res1.totalScore, 5);
    assert.equal(res1.stemiRuleIn, true);

    // Case 2: Only excessive discordance (2 points) -> not rule-in (< 3)
    const res2 = calculateModifiedSgarbossa({
      concordantStElevationGe1mm: false,
      concordantStDepressionV1V3Ge1mm: false,
      excessiveDiscordanceRatioGe25: true,
    });
    assert.equal(res2.totalScore, 2);
    assert.equal(res2.stemiRuleIn, false);
  });

  await t.test("calculates Tisdale Risk Score for drug-induced QT prolongation", () => {
    // High risk: Age >= 68 (1) + Female (1) + Loop Diuretic (1) + Admission QTc >= 450 (2) + >=2 drugs (3) + HF (3) = 11 pts
    const tisdale = calculateTisdaleRisk({
      ageGe68: true,
      femaleSex: true,
      loopDiuretic: true,
      admissionQtcGe450: true,
      twoOrMoreQtcDrugs: true,
      heartFailure: true,
    });
    assert.equal(tisdale.score, 11);
    assert.equal(tisdale.riskTier, "HIGH");
    assert.ok(tisdale.clinicalGuidance.includes("HIGH RISK FOR TORSADES DE POINTES"));
  });

  await t.test("derives Frank XYZ vectorcardiographic loop points from 12-lead measurements", () => {
    const leads = { V5: 1.5, V6: 1.0, I: 0.8, aVF: 1.2, III: 0.4, V2: -0.5, V3: 0.2 };
    const frank = deriveFrankXyzFrom12Lead(leads, 120);

    // X: 0.61*1.5 + 0.17*1.0 - 0.13*0.8 = 0.915 + 0.17 - 0.104 = 0.981 -> 0.98
    // Y: 0.65*1.2 + 0.25*0.4 = 0.78 + 0.10 = 0.88
    // Z: -(0.54*-0.5 + 0.13*0.2) = -(-0.27 + 0.026) = 0.244 -> 0.24
    assert.equal(frank.x, 0.98);
    assert.equal(frank.y, 0.88);
    assert.equal(frank.z, 0.24);
    assert.equal(frank.timeMs, 120);
  });

  await t.test("identifies acute anterior STEMI and trips CF-STEMI-ANT with Cath Lab directive", () => {
    const report = evaluate12LeadEcg(ECG_PRESET_ANTERIOR_STEMI);

    assert.equal(report.stemiTerritory, "EXTENSIVE_ANTEROSEPTAL");
    assert.ok(report.trippedInvariants.includes("CF-STEMI-ANT"));
    assert.ok(report.immediateDirectives.some((d) => d.includes("Cardiac Catheterization Laboratory")));
  });

  await t.test("identifies Wellens' Syndrome Type B and trips CF-WELLENS-001 with stress test veto", () => {
    const report = evaluate12LeadEcg(ECG_PRESET_WELLENS_LAD);

    assert.ok(report.primaryEcgFinding.includes("WELLENS' SYNDROME"));
    assert.ok(report.trippedInvariants.includes("CF-WELLENS-001"));
    assert.ok(report.immediateDirectives.some((d) => d.includes("Stress testing is absolutely contraindicated")));
  });

  await t.test("identifies hyperkalemic sine-wave pattern and trips CF-SINEWAVE-001 with Calcium push", () => {
    const report = evaluate12LeadEcg(ECG_PRESET_HYPERKALEMIC_SINE);

    assert.ok(report.primaryEcgFinding.includes("CRITICAL HYPERKALEMIC SINE-WAVE"));
    assert.ok(report.trippedInvariants.includes("CF-SINEWAVE-001"));
    assert.ok(report.immediateDirectives.some((d) => d.includes("IV Calcium Gluconate")));
  });

  await t.test("identifies QTc prolongation >= 500ms and trips CF-QTC-001 binding drug veto", () => {
    const report = evaluate12LeadEcg(ECG_PRESET_LONG_QTC_TORSADES);

    assert.ok(report.qtcBazettMs >= 500);
    assert.ok(report.trippedInvariants.includes("CF-QTC-001"));
    assert.ok(report.immediateDirectives.some((d) => d.includes("BINDING PHARMACOTHERAPY VETO")));
  });

  await t.test("evaluates normal sinus rhythm with zero tripped invariants", () => {
    const report = evaluate12LeadEcg(ECG_PRESET_NORMAL_SINUS);

    assert.equal(report.rhythm, "NORMAL_SINUS_RHYTHM");
    assert.equal(report.trippedInvariants.length, 0);
  });

  await t.test("generates zero-truncation spoken audio analysis containing all parameters and invariants", () => {
    const report = evaluate12LeadEcg(ECG_PRESET_ANTERIOR_STEMI);
    const spoken = formatEcgSpokenAnalysis(report);

    assert.ok(spoken.includes("Eleanor Thompson"));
    assert.ok(spoken.includes("Heart rate is 94 beats per minute"));
    assert.ok(spoken.includes("Q-R-S complex duration is 96 milliseconds"));
    assert.ok(spoken.includes("CF-STEMI-ANT"));
    assert.ok(spoken.includes("Cardiac Catheterization Laboratory"));
  });
});
