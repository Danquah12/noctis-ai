import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAkiAndRenalBiomarkers,
  evaluateCrrtPrescription,
  handleNaturalNephrologyCrrtQuery,
} from "./noctis-nephrology-crrt.ts";

test("NOCTIS-NEPHRO-CRRT-001: KDIGO AKI stages correctly and trips loop diuretic FeNa veto", () => {
  // Baseline Cr 1.0, Current Cr 2.5 (2.5x -> Stage 2)
  // UOP 20 mL/h for 12h in 70kg patient = 0.28 mL/kg/h (< 0.5 for >= 12h -> Stage 2)
  // Active furosemide -> trips CF-NEPHRO-004
  const res = evaluateAkiAndRenalBiomarkers({
    patientWeightKg: 70,
    baselineSerumCreatinineMgDl: 1.0,
    currentSerumCreatinineMgDl: 2.5,
    urineOutputMlPerHour: 20,
    urineOutputHoursMeasured: 12,
    serumSodiumMeqL: 140,
    urineSodiumMeqL: 45,
    serumBunMgDl: 50,
    urineUreaMgDl: 400,
    urineCreatinineMgDl: 60,
    loopDiureticsActive: true,
  });

  assert.strictEqual(res.kdigoStage, "STAGE_2");
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-NEPHRO-004") && v.includes("LOOP DIURETIC")));
  assert.ok(res.prerenalVsAtnDifferentiation.feNaInterpretation.includes("INVALIDATED"));
  assert.ok(res.prerenalVsAtnDifferentiation.calculatedFeUreaPercent !== undefined);
});

test("NOCTIS-NEPHRO-CRRT-001: CRRT calculates effluent dose and detects Citrate Lock toxicity", () => {
  // 70 kg patient on CVVHDF: Dialysate 1000 + Replacement 600 + Net UF 150 = 1750 mL/hr
  // Effluent dose = 1750 / 70 = 25.0 mL/kg/h (Optimal)
  // Total Ca 11.2 mg/dL -> 2.8 mmol/L; Systemic iCa 0.9 mmol/L -> Ratio = 3.11 (>= 2.5 -> Citrate lock!)
  const res = evaluateCrrtPrescription({
    patientWeightKg: 70,
    modality: "CVVHDF",
    dialysateRateMlHr: 1000,
    replacementRateMlHr: 600,
    netUltrafiltrationRateMlHr: 150,
    preFilterReplacementFraction: 0.5,
    anticoagulationType: "REGIONAL_CITRATE",
    circuitIonizedCalciumMmolL: 0.32,
    systemicIonizedCalciumMmolL: 0.9,
    totalSerumCalciumMgDl: 11.2,
    arterialPh: 7.22,
  });

  assert.strictEqual(res.deliveredEffluentDoseMlKgHr, 25.0);
  assert.strictEqual(res.doseTargetAdequacy, "OPTIMAL_EVIDENCE_BASED");
  assert.strictEqual(res.citrateToxicityStatus.citrateLockDetected, true);
  assert.strictEqual(res.citrateToxicityStatus.totalToIonizedCalciumRatio, 3.11);
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-NEPHRO-001") && v.includes("CITRATE LOCK")));
});

test("NOCTIS-NEPHRO-CRRT-001: Excessive CRRT dose > 35 mL/kg/h trips CF-NEPHRO-002", () => {
  // 60 kg patient with 2500 mL/hr effluent = 41.7 mL/kg/h (> 35)
  const res = evaluateCrrtPrescription({
    patientWeightKg: 60,
    modality: "CVVHDF",
    dialysateRateMlHr: 1500,
    replacementRateMlHr: 800,
    netUltrafiltrationRateMlHr: 200,
    preFilterReplacementFraction: 0.5,
    anticoagulationType: "SYSTEMIC_HEPARIN",
  });

  assert.strictEqual(res.deliveredEffluentDoseMlKgHr, 41.7);
  assert.strictEqual(res.doseTargetAdequacy, "EXCESSIVE_HIGH_DOSE");
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-NEPHRO-002") && v.includes("EXCESSIVE CRRT DOSE")));
});

test("NOCTIS-NEPHRO-CRRT-001: Natural language routing resolves AKI and CRRT queries", () => {
  const akiQuery = "Patient with baseline creatinine 1.0 has current creatinine 2.6 and urine output 20 mL/h on furosemide. Calculate KDIGO stage and FeUrea vs FeNa.";
  const akiRes = handleNaturalNephrologyCrrtQuery(akiQuery);
  assert.ok(akiRes);
  assert.ok(akiRes.includes("NOCTIS-NEPHRO-CRRT-001"));
  assert.ok(akiRes.includes("STAGE_2"));
  assert.ok(akiRes.includes("LOOP DIURETIC"));

  const crrtQuery = "Evaluate 70 kg patient on CVVHDF with dialysate 1000, replacement 600, net UF 150, and citrate lock ratio.";
  const crrtRes = handleNaturalNephrologyCrrtQuery(crrtQuery);
  assert.ok(crrtRes);
  assert.ok(crrtRes.includes("25 mL/kg/h"));
  assert.ok(crrtRes.includes("CITRATE LOCK"));
});
