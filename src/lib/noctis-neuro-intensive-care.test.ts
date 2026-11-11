import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateIcpCrisisAndHerniation,
  evaluateAcuteIschemicStrokeWindows,
  evaluateSubarachnoidHemorrhage,
  handleNaturalNeuroIcuQuery,
} from "./noctis-neuro-intensive-care.ts";

test("NOCTIS-NEURO-ICU-001: ICP Crisis calculates CPP and trips hypotonic fluid and uncal herniation vetoes", () => {
  // MAP 80, ICP 30 -> CPP = 50 mmHg (< 60 -> Critical ischemic risk)
  // Unilateral blown pupil -> trips CF-NEURO-005
  // Active D5W fluid -> trips CF-NEURO-001
  const res = evaluateIcpCrisisAndHerniation({
    patientWeightKg: 70,
    meanArterialPressureMmHg: 80,
    intracranialPressureMmHg: 30,
    pupilExam: "UNILATERAL_FIXED_DILATED",
    cushingTriadPresent: true,
    serumSodiumMeqL: 140,
    serumOsmolalityMOsmKg: 290,
    activeFluids: ["D5W at 100 mL/hr", "0.45% Normal Saline"],
    paCO2MmHg: 26, // < 30 -> trips CF-NEURO-002
    currentTier: 2,
  });

  assert.strictEqual(res.cerebralPerfusionPressureMmHg, 50);
  assert.strictEqual(res.cppTargetStatus, "CRITICAL_ISCHEMIC_RISK");
  assert.strictEqual(res.herniationRiskTier, "IMMINENT_TRANSTENTORIAL_HERNIATION");
  assert.strictEqual(res.osmotherapyDirective.recommendedAgent, "SODIUM_CHLORIDE_23_4_PERCENT");
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-NEURO-001") && v.includes("HYPOTONIC")));
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-NEURO-002") && v.includes("HYPERVENTILATION")));
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-NEURO-005") && v.includes("UNCAL HERNIATION")));
});

test("NOCTIS-NEURO-ICU-001: Stroke engine evaluates 3.0h Tenecteplase and 12h DAWN/DEFUSE-3 thrombectomy", () => {
  // Case A: 3 hours, NIHSS 14, BP 170/95 -> Eligible for Tenecteplase
  const resEarly = evaluateAcuteIschemicStrokeWindows({
    hoursFromLastKnownWell: 3.0,
    nihssScore: 14,
    largeVesselOcclusionPresent: true,
    aspectsScoreOnCt: 8,
    systolicBpMmHg: 170,
    diastolicBpMmHg: 95,
    bloodGlucoseMgDl: 110,
    plateletCount10e9L: 240,
    inr: 1.0,
    anticoagulationActive: false,
  });

  assert.strictEqual(resEarly.thrombolysisEligibility.eligible, true);
  assert.strictEqual(resEarly.thrombolysisEligibility.recommendedAgent, "TENECTEPLASE_TNK");
  assert.ok(resEarly.thrombolysisEligibility.weightBasedDose.includes("0.25 mg/kg"));
  assert.strictEqual(resEarly.endovascularThrombectomyEligibility.eligible, true);
  assert.strictEqual(resEarly.endovascularThrombectomyEligibility.criteriaType, "STANDARD_0_6_HOUR");

  // Case B: 12 hours from LKW, large vessel occlusion with mismatch -> DAWN / DEFUSE-3 extended window
  const resExtended = evaluateAcuteIschemicStrokeWindows({
    hoursFromLastKnownWell: 12.0,
    nihssScore: 18,
    largeVesselOcclusionPresent: true,
    aspectsScoreOnCt: 7,
    systolicBpMmHg: 165,
    diastolicBpMmHg: 90,
    bloodGlucoseMgDl: 135,
    plateletCount10e9L: 190,
    inr: 1.1,
    anticoagulationActive: false,
    ischemicCoreVolumeMl: 28, // < 70 mL
    mismatchRatio: 2.6, // >= 1.8
  });

  assert.strictEqual(resExtended.thrombolysisEligibility.eligible, false); // Beyond 4.5h window
  assert.strictEqual(resExtended.endovascularThrombectomyEligibility.eligible, true);
  assert.strictEqual(resExtended.endovascularThrombectomyEligibility.criteriaType, "EXTENDED_6_24_HOUR_DAWN_DEFUSE");
});

test("NOCTIS-NEURO-ICU-001: Subarachnoid hemorrhage detects severe vasospasm and vetoes IV Nimodipine", () => {
  const res = evaluateSubarachnoidHemorrhage({
    patientWeightKg: 65,
    huntHessGrade: 3,
    fisherGradeOnCt: 3,
    aneurysmSecured: false,
    systolicBpMmHg: 158,
    meanArterialPressureMmHg: 98,
    nimodipineRouteOrdered: "INTRAVENOUS", // Trips CF-NEURO-003
    daysPostBleed: 8,
    transcranialDopplerMcaVelocityCmS: 220, // >= 200 -> Severe vasospasm
    lindegaardRatio: 6.5, // >= 6.0
  });

  assert.strictEqual(res.rebleedingRiskTier, "HIGH_IMMEDIATE_RISK");
  assert.ok(res.strictSafetyVetoes.some((v) => v.includes("CF-NEURO-003") && v.includes("IV NIMODIPINE")));
  assert.strictEqual(res.vasospasmAndDciMonitoring.vasospasmDetected, true);
  assert.ok(res.vasospasmAndDciMonitoring.lindegaardInterpretation.includes("Severe Vasospasm Confirmed"));
});

test("NOCTIS-NEURO-ICU-001: Natural language routing resolves ICP, Stroke, and SAH queries", () => {
  const icpQuery = "Trauma patient with elevated ICP of 28, MAP 85, and unilateral blown pupil. What is the emergency osmotherapy order?";
  const icpRes = handleNaturalNeuroIcuQuery(icpQuery);
  assert.ok(icpRes);
  assert.ok(icpRes.includes("NOCTIS-NEURO-ICU-001"));
  assert.ok(icpRes.includes("Cerebral Perfusion Pressure (CPP)"));
  assert.ok(icpRes.includes("23.4%"));

  const strokeQuery = "Patient with acute ischemic stroke presents at 3 hours from last known well with NIHSS 16, LVO in MCA, ASPECTS 8. What are the thrombolysis and thrombectomy criteria?";
  const strokeRes = handleNaturalNeuroIcuQuery(strokeQuery);
  assert.ok(strokeRes);
  assert.ok(strokeRes.includes("Tenecteplase"));
  assert.ok(strokeRes.includes("STANDARD_0_6_HOUR"));

  const sahQuery = "Patient day 7 post subarachnoid hemorrhage Hunt-Hess 3 Fisher 3 has MCA velocity 210 and Lindegaard ratio 6.2. Evaluate vasospasm and route for nimodipine.";
  const sahRes = handleNaturalNeuroIcuQuery(sahQuery);
  assert.ok(sahRes);
  assert.ok(sahRes.includes("Severe Vasospasm Confirmed"));
  assert.ok(sahRes.includes("Nimodipine 60 mg PO / NG"));
});
