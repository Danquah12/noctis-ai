import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Neurology & Geriatrics
import {
  evaluateAcuteStrokeNihss,
  calculateAbcd2Score,
  evaluateDementiaStaging,
  evaluateStatusEpilepticusProtocol,
  evaluateBeersCriteria,
} from "./noctis-neurology-geriatrics-engine.ts";

// Obstetrics & Pediatrics
import {
  evaluatePreeclampsia,
  evaluatePllrMedicationSafety,
  evaluatePediatricAssessmentTriangle,
  calculatePediatricResuscitationDoses,
} from "./noctis-obstetrics-pediatrics-engine.ts";

describe("Noctis Clinical Specialist Engine 5: Neurology & Acute Stroke Workup", () => {
  it("evaluates Acute Stroke NIHSS score and thrombolysis & mechanical thrombectomy windows", () => {
    const res = evaluateAcuteStrokeNihss({
      facialPalsyScore: 2,
      motorArmRightScore: 3,
      motorLegRightScore: 2,
      bestLanguageAphasiaScore: 2,
      dysarthriaScore: 1,
      hoursSinceLastKnownWell: 2.0, // Within 4.5h window
      systolicBpMmHg: 165,
      diastolicBpMmHg: 95,
      bloodGlucoseMgDl: 124,
      platelets10e9_L: 210,
      inr: 1.1,
    });

    // Total score = 2 + 3 + 2 + 2 + 1 = 10 (Moderate stroke)
    assert.equal(res.totalScore, 10);
    assert.equal(res.strokeSeverityCategory, "MODERATE_STROKE");
    assert.equal(res.thrombolysisEligibility.eligibleForIvTpaOrTnk, true);
    assert.equal(res.mechanicalThrombectomyEligibility.eligibleForEvt, true);
    assert.equal(res.mechanicalThrombectomyEligibility.windowCategory, "EARLY_WINDOW_0_TO_6_HOURS");
    assert.ok(res.urgentActions.some((a) => a.includes("Tenecteplase")));
  });

  it("calculates ABCD2 score for TIA and stratifies 2-day stroke risk", () => {
    const tia = calculateAbcd2Score({
      ageYears: 68, // +1
      sbpMmHg: 152, // +1
      dbpMmHg: 94,
      clinicalUnilateralWeakness: true, // +2
      symptomDurationMinutes: 75, // +2
      historyOfDiabetes: true, // +1
    });

    // Total score = 1 + 1 + 2 + 2 + 1 = 7 (High risk)
    assert.equal(tia.score, 7);
    assert.equal(tia.riskCategory, "HIGH_RISK");
    assert.equal(tia.strokeRisk2DaysPercent, 8.1);
    assert.ok(tia.recommendedDisposition.includes("URGENT INPATIENT ADMISSION"));
  });

  it("evaluates dementia staging and detects Normal Pressure Hydrocephalus reversible triad", () => {
    const nph = evaluateDementiaStaging({
      mocaScore: 19,
      hasWetWobblyWackyTriad: true,
    });
    assert.equal(nph.impairmentTier, "MILD_COGNITIVE_IMPAIRMENT_MCI");
    assert.equal(nph.suggestedEtiology, "Suspected Normal Pressure Hydrocephalus (NPH)");
    assert.ok(nph.urgentInterventions.some((i) => i.includes("CSF tap test")));
  });

  it("evaluates Status Epilepticus emergency escalation protocol through refractory stage", () => {
    const se = evaluateStatusEpilepticusProtocol({
      seizureDurationMinutes: 28,
      seizureType: "CONVULSIVE_TONIC_CLONIC",
      refractoryStatusPresent: true,
    });
    assert.equal(se.phase, "REFRACTORY_STATUS_20_TO_40_MIN");
    assert.ok(se.immediatePharmacotherapy.some((p) => p.includes("Levetiracetam")));
    assert.ok(se.immediatePharmacotherapy.some((p) => p.includes("Propofol")));
    assert.ok(se.criticalWarnings.some((w) => w.includes("REFRACTORY STATUS EPILEPTICUS")));
  });
});

describe("Noctis Clinical Specialist Engine 6: Geriatric Polypharmacy & AGS Beers Criteria", () => {
  it("audits geriatric medication regimens and catches high-risk Beers criteria violations", () => {
    const res = evaluateBeersCriteria({
      patientAgeYears: 78,
      medicationList: [
        "Diphenhydramine 50mg nightly", // Antihistamine
        "Diazepam 5mg PRN anxiety", // Long-acting BZD
        "Amitriptyline 25mg at bedtime", // TCA
        "Ibuprofen 600mg TID", // NSAID in CKD
      ],
      diagnosedConditions: ["Chronic Kidney Disease Stage 3", "Hypertension"],
      eGfrMlMin173m2: 44,
    });

    assert.equal(res.isEligibleForBeersCriteria, true);
    assert.equal(res.violationsCount, 4);
    assert.equal(res.anticholinergicBurdenAlert, true);
    assert.equal(res.overallFallRiskElevated, true);
    assert.ok(res.identifiedViolations.some((v) => v.category === "First-Generation Antihistamine"));
    assert.ok(res.identifiedViolations.some((v) => v.category === "Systemic NSAID in Renal / Heart Failure"));
  });
});

describe("Noctis Clinical Specialist Engine 7: Obstetrics, Maternal-Fetal & Pediatrics", () => {
  it("diagnoses Preeclampsia with severe features and HELLP syndrome with Magnesium Sulfate protocol", () => {
    // Preeclampsia with severe features
    const preecl = evaluatePreeclampsia({
      gestationalAgeWeeks: 35,
      systolicBpMmHg: 168, // Severe
      diastolicBpMmHg: 112,
      proteinuriaPresent: true,
      intractableHeadacheOrVisualChanges: true,
      plateletCount10e9_L: 82, // Low
    });

    assert.equal(preecl.diagnosis, "PREECLAMPSIA_WITH_SEVERE_FEATURES");
    assert.equal(preecl.magnesiumSulfateIndicated, true);
    assert.ok(preecl.magnesiumSulfateProtocol.includes("4–6 g IV loading dose"));
    assert.ok(preecl.antihypertensiveProtocol.includes("IV Labetalol"));

    // HELLP Syndrome
    const hellp = evaluatePreeclampsia({
      gestationalAgeWeeks: 33,
      systolicBpMmHg: 162,
      diastolicBpMmHg: 104,
      ldhU_L: 780, // Hemolysis
      astOrAltU_L: 145, // Elevated liver
      plateletCount10e9_L: 64, // Low platelets
    });
    assert.equal(hellp.diagnosis, "HELLP_SYNDROME");
    assert.ok(hellp.maternalEmergencyAlerts.some((a) => a.includes("HELLP SYNDROME MEDICAL EMERGENCY")));
  });

  it("classifies FDA PLLR medication safety in pregnancy and identifies contraindicated teratogens", () => {
    const lisinopril = evaluatePllrMedicationSafety({
      medicationName: "Lisinopril",
      isPregnant: true,
      trimester: 2,
    });
    assert.equal(lisinopril.pregnancyRiskSummary, "CONTRAINDICATED_TERATOGENIC");
    assert.ok(lisinopril.teratogenicRisks.some((t) => t.includes("Renal dysgenesis")));
    assert.ok(lisinopril.safeAlternativeMedications.some((a) => a.includes("Labetalol")));

    const valproate = evaluatePllrMedicationSafety({
      medicationName: "Valproic Acid",
      isPregnant: true,
      trimester: 1,
    });
    assert.equal(valproate.pregnancyRiskSummary, "CONTRAINDICATED_TERATOGENIC");
    assert.ok(valproate.teratogenicRisks.some((t) => t.includes("Neural Tube Defects")));
  });

  it("evaluates Pediatric Assessment Triangle (PAT) and computes weight-based resuscitation dosing", () => {
    // PAT Respiratory Failure
    const pat = evaluatePediatricAssessmentTriangle({
      appearanceToneTicklesLookSpeech: "ABNORMAL_LETHARGIC_IRRITABLE_UNRESPONSIVE",
      workOfBreathingRetractionsNasalFlaring: "ABNORMAL_STRIDOR_GRUNTING_RETRACTIONS",
      circulationToSkinPallorMottlingCyanosis: "NORMAL_PINK",
    });
    assert.equal(pat.physiologicCategory, "RESPIRATORY_FAILURE");
    assert.equal(pat.acuityTier, "CRITICAL_P0");

    // Resuscitation dosing for 15 kg child
    const doses = calculatePediatricResuscitationDoses({
      childWeightKg: 15,
      clinicalScenario: "STATUS_EPILEPTICUS",
    });
    assert.equal(doses.childWeightKg, 15);
    assert.equal(doses.fluidBolusVolumeMl, 300); // 15 * 20 = 300 mL
    assert.equal(doses.defibrillationJoulesInitial, 30); // 15 * 2 = 30 J
    assert.ok(doses.calculatedMedications.some((m) => m.drugName.includes("Lorazepam") && m.calculatedDose === "1.50 mg IV"));
  });
});
