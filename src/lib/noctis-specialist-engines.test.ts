import { describe, it } from "node:test";
import assert from "node:assert/strict";

// 1. Cardiovascular
import {
  evaluateHeartFailureGdmt,
  calculateCha2ds2Vasc,
  calculateHasBled,
  calculateWellsPe,
  evaluatePercRule,
  calculateTisdaleQtcScore,
} from "./noctis-cardiovascular-engine.ts";

// 2. Infectious Disease
import {
  evaluateSepsisHourOneBundle,
  calculateCurb65,
  solveHepatitisBSerology,
  calculateFib4,
} from "./noctis-infectious-disease-engine.ts";

// 3. Endocrine & Metabolic
import {
  analyzeCgmProfile,
  evaluateDkaHhs,
  calculateBurchWartofsky,
  evaluateHyponatremia,
} from "./noctis-endocrine-metabolic-engine.ts";

// 4. Hematology & Autoimmune
import {
  calculatePlasmicScore,
  evaluateAnemiaCascade,
  solveAutoantibodies,
} from "./noctis-hematology-autoimmune-engine.ts";

describe("Noctis Clinical Specialist Engine 1: Cardiovascular & Hemodynamics", () => {
  it("evaluates HFrEF with GDMT 4-pillar adherence and catches non-evidence beta-blocker & hyperkalemia contraindications", () => {
    const res = evaluateHeartFailureGdmt({
      lvefPercent: 32,
      nyhaClass: "III",
      vitals: { sbp: 118, dbp: 74, heartRate: 78 },
      labs: { ntProBnpPgMl: 2450, serumPotassiumMmolL: 5.4, eGfrMlMin173m2: 52 },
      meds: {
        hasArniOrAceiOrArb: true,
        arniName: "Sacubitril/Valsartan 49/51mg BID",
        hasBetaBlocker: true,
        betaBlockerName: "Atenolol 50mg daily", // Non-evidence based for HFrEF!
        isEvidenceBasedBetaBlocker: false,
        hasMra: true, // Should be flagged due to K+ 5.4!
        mraName: "Spironolactone 25mg daily",
        hasSglt2i: false,
      },
      clinicalNotes: "Patient has bilateral crackles, JVD, and 2+ pitting edema.",
    });

    assert.equal(res.phenotype, "HFrEF");
    assert.equal(res.isAcuteDecompensated, true);
    assert.equal(res.biomarkerStatus.elevatedNtpBnpOrBnp, true);
    assert.equal(res.gdmtPillars.pillar1_RASS_ARNI.status, "OPTIMIZED");
    assert.equal(res.gdmtPillars.pillar2_BetaBlocker.status, "NON_EVIDENCE_BASED");
    assert.equal(res.gdmtPillars.pillar3_MRA.status, "CONTRAINDICATED_OR_CAUTION");
    assert.equal(res.gdmtPillars.pillar4_SGLT2i.status, "OMITTED");
    assert.equal(res.gdmtPillarScore, 1); // Only ARNI is optimized
    assert.ok(res.recommendations.some((r) => r.includes("Quadruple GDMT")));
  });

  it("calculates CHA2DS2-VASc and HAS-BLED for Atrial Fibrillation stroke & bleeding risk", () => {
    const chads = calculateCha2ds2Vasc({
      ageYears: 76, // +2
      isFemale: true, // +1
      hypertension: true, // +1
      diabetesMellitus: true, // +1
      priorStrokeOrTiaOrThromboembolism: false,
      vascularDisease: true, // +1
      congestiveHeartFailure: false,
    });
    // Total = 2 + 1 + 1 + 1 + 1 = 6
    assert.equal(chads.score, 6);
    assert.equal(chads.strokeRiskCategory, "HIGH");
    assert.ok(chads.anticoagulationRecommendation.includes("DOACs"));

    const hasBled = calculateHasBled({
      hypertensionUncontrolled: true, // +1
      abnormalRenalFunction: true, // +1
      elderlyAgeOver65: true, // +1
      drugsAntiplateletOrNsaid: true, // +1
    });
    assert.equal(hasBled.score, 4);
    assert.equal(hasBled.bleedingRiskCategory, "HIGH_RISK");
    assert.ok(hasBled.clinicalAction.includes("Address modifiable bleeding factors"));
  });

  it("evaluates Wells PE criteria and PERC rule", () => {
    const wells = calculateWellsPe({
      heartRateOver100: true, // +1.5
      clinicalSignsDvt: true, // +3.0
      peMostLikelyOrEqual: true, // +3.0
    });
    assert.equal(wells.score, 7.5);
    assert.equal(wells.riskTierTwoTier, "PE_LIKELY");
    assert.ok(wells.recommendedDiagnosticStep.includes("CT Pulmonary Angiography"));

    const percNeg = evaluatePercRule({
      ageYears: 32,
      heartRateBpm: 74,
      pulseOximetrySpO2: 99,
      priorDvtOrPe: false,
      recentTraumaOrSurgeryPast4Weeks: false,
      hemoptysis: false,
      exogenousEstrogenUse: false,
      unilateralLegSwelling: false,
    });
    assert.equal(percNeg.canSafelyRuleOutPeWithoutTesting, true);
    assert.equal(percNeg.percScore, 0);

    const percPos = evaluatePercRule({
      ageYears: 56, // >= 50 fails
      heartRateBpm: 80,
      pulseOximetrySpO2: 98,
    });
    assert.equal(percPos.canSafelyRuleOutPeWithoutTesting, false);
  });

  it("computes Tisdale QTc prolongation score and flags critical Torsades de Pointes alert", () => {
    const res = calculateTisdaleQtcScore({
      ageOver68: true, // +1
      isFemale: true, // +1
      loopDiureticPrescribed: true, // +1
      serumPotassiumLte35: true, // +2
      heartFailureWithReducedEf: true, // +3
      qtcProlongingDrugsCount: 2, // +3
      currentMeasuredQtcMs: 520,
    });
    assert.equal(res.score, 11);
    assert.equal(res.riskCategory, "HIGH_RISK");
    assert.equal(res.qtcAlertSeverity, "CRITICAL_PROLONGED_TORSADES_RISK");
    assert.ok(res.recommendations.some((r) => r.includes("Torsades de Pointes")));
  });
});

describe("Noctis Clinical Specialist Engine 2: Infectious Disease & Sepsis", () => {
  it("evaluates Surviving Sepsis Hour-1 bundle adherence and flags septic shock with vasopressors", () => {
    const res = evaluateSepsisHourOneBundle({
      bloodCulturesObtainedPriorToAntibiotics: true,
      broadSpectrumAntibioticsAdministered: true,
      timeToAntibioticsMinutes: 35,
      initialLactateMmolL: 4.8,
      repeatLactateMeasuredWithin4Hours: true,
      fluidResuscitation30MlPerKgGiven: true,
      meanArterialPressureMmHg: 58,
      persistentHypotensionAfterFluids: true,
      vasopressorInitiated: true,
      firstLineVasopressorUsed: "Norepinephrine",
    });

    assert.equal(res.completedElementsCount, 5);
    assert.equal(res.bundleAdherenceStatus, "FULLY_COMPLIANT");
    assert.equal(res.clinicalDisposition, "SEPTIC_SHOCK");
  });

  it("calculates CURB-65 pneumonia severity score and determines inpatient vs outpatient care", () => {
    const res = calculateCurb65({
      confusion: true, // +1
      bunMgDl: 28, // +1
      respiratoryRate: 32, // +1
      sbp: 86, // +1
      ageYears: 72, // +1
    });
    assert.equal(res.score, 5);
    assert.equal(res.severityCategory, "HIGH_RISK_SEVERE");
    assert.equal(res.recommendedSiteOfCare, "URGENT_INPATIENT_OR_ICU");
    assert.ok(res.empiricAntibioticRegimenSummary.includes("Inpatient ICU"));
  });

  it("solves complex Hepatitis B serology panels across vaccine, natural infection, and acute infection", () => {
    // Acute Hepatitis B
    const acute = solveHepatitisBSerology({ hbsAg: true, antiHBs: false, antiHbcIgm: true });
    assert.equal(acute.interpretation, "ACUTE_HEPATITIS_B");
    assert.equal(acute.infectivityLevel, "HIGH");

    // Immune via Vaccination
    const vaccinated = solveHepatitisBSerology({ hbsAg: false, antiHBs: true, antiHbcTotalOrIgg: false });
    assert.equal(vaccinated.interpretation, "IMMUNE_DUE_TO_HEPATITIS_B_VACCINATION");
    assert.equal(vaccinated.vaccineRecommended, false);

    // Immune via Past Resolved Natural Infection
    const resolved = solveHepatitisBSerology({ hbsAg: false, antiHBs: true, antiHbcTotalOrIgg: true });
    assert.equal(resolved.interpretation, "IMMUNE_DUE_TO_NATURAL_INFECTION_RESOLVED");

    // Susceptible Non-Immune
    const susceptible = solveHepatitisBSerology({ hbsAg: false, antiHBs: false, antiHbcTotalOrIgg: false });
    assert.equal(susceptible.interpretation, "SUSCEPTIBLE_NON_IMMUNE");
    assert.equal(susceptible.vaccineRecommended, true);
  });

  it("calculates FIB-4 non-invasive liver fibrosis score", () => {
    const low = calculateFib4({ ageYears: 42, astU_L: 28, altU_L: 32, platelets10e9_L: 240 });
    assert.equal(low.fibrosisRiskCategory, "LOW_RISK_F0_F1");
    assert.ok(low.fib4Score < 1.30);

    const high = calculateFib4({ ageYears: 65, astU_L: 120, altU_L: 65, platelets10e9_L: 90 });
    assert.equal(high.fibrosisRiskCategory, "HIGH_RISK_ADVANCED_F3_F4");
    assert.ok(high.fib4Score > 2.67);
  });
});

describe("Noctis Clinical Specialist Engine 3: Endocrine & Metabolic", () => {
  it("analyzes CGM Time-In-Range profile and flags severe hypoglycemia and GMI-A1c discordance", () => {
    const cgm = analyzeCgmProfile({
      timeInRangePercent: 55,
      timeBelowRangeLevel1Percent: 6, // > 4% fails
      timeBelowRangeLevel2Percent: 2, // > 1% fails
      glycemicVariabilityCvPercent: 42, // > 36% fails
      glucoseManagementIndicatorGmiPercent: 7.2,
      laboratoryHba1cPercent: 8.8, // 1.6% discordance!
    });
    assert.equal(cgm.overallControlStatus, "ELEVATED_HYPOGLYCEMIA_RISK");
    assert.equal(cgm.adherenceToTargets.tbrTargetMet, false);
    assert.ok(cgm.discordanceWarning !== undefined);
  });

  it("evaluates DKA and strictly enforces the hypokalemia insulin safety lock when K+ < 3.3", () => {
    const dka = evaluateDkaHhs({
      glucoseMgDl: 480,
      arterialOrVenousPh: 7.12,
      serumBicarbonateMeqL: 8,
      serumSodiumMeqL: 136,
      serumChlorideMeqL: 98,
      serumPotassiumMeqL: 3.0, // Hypokalemic!
      urineOrSerumKetonesPositive: true,
    });
    // Anion gap = 136 - (98 + 8) = 30
    assert.equal(dka.anionGapMeqL, 30);
    assert.equal(dka.diagnosis, "SEVERE_DKA");
    assert.equal(dka.isHypokalemicInsulinLocked, true);
    assert.equal(dka.insulinAdministrationAllowed, false);
    assert.ok(dka.criticalAlerts.some((a) => a.includes("DO NOT START INSULIN")));
  });

  it("evaluates Euglycemic DKA on an SGLT2 inhibitor", () => {
    const edka = evaluateDkaHhs({
      glucoseMgDl: 185, // Normal/mildly elevated glucose!
      arterialOrVenousPh: 7.22,
      serumBicarbonateMeqL: 12,
      serumSodiumMeqL: 138,
      serumChlorideMeqL: 102,
      serumPotassiumMeqL: 4.4,
      urineOrSerumKetonesPositive: true,
      sglt2InhibitorPrescribed: true,
    });
    assert.equal(edka.diagnosis, "EUGLYCEMIC_DKA_SGLT2I");
    assert.equal(edka.insulinAdministrationAllowed, true);
    assert.ok(edka.criticalAlerts.some((a) => a.includes("EUGLYCEMIC DKA DETECTED")));
  });

  it("calculates Burch-Wartofsky score for Thyroid Storm and mandates multi-modal blockade", () => {
    const bwps = calculateBurchWartofsky({
      temperatureF: 103.5, // 25 pts
      cnsEffects: "MODERATE_DELIRIUM_PSYCHOSIS", // 20 pts
      giHepaticEffects: "MODERATE_DIARRHEA_NAUSEA_JAUNDICE", // 10 pts
      heartRateBpm: 144, // 25 pts
      atrialFibrillationPresent: true, // 10 pts
      precipitantHistoryIdentified: true, // 10 pts
    });
    assert.ok(bwps.totalScore >= 45);
    assert.equal(bwps.diagnosisLikelihood, "THYROID_STORM_HIGHLY_LIKELY");
    assert.ok(bwps.emergencyInterventions.some((i) => i.includes("Propylthiouracil")));
  });

  it("evaluates Hyponatremia and enforces Osmotic Demyelination Syndrome (ODS) max velocity", () => {
    const hypo = evaluateHyponatremia({
      serumSodiumMeqL: 118,
      measuredSerumOsmolalityMOsmKg: 242,
      volumeStatus: "EUVOLEMIC",
      urineOsmolalityMOsmKg: 450,
      urineSodiumMeqL: 55,
      activeSevereSymptoms: false,
    });
    assert.equal(hypo.tonicState, "HYPOTONIC_HYPONATREMIA");
    assert.ok(hypo.differentialDiagnoses.some((d) => d.includes("SIADH")));
    assert.equal(hypo.max24HourCorrectionRateMeqL, 8);
    assert.ok(hypo.overcorrectionOdsWarning.includes("OSMOTIC DEMYELINATION SYNDROME"));
  });
});

describe("Noctis Clinical Specialist Engine 4: Hematology & Autoimmune", () => {
  it("calculates PLASMIC score for TTP and flags platelet transfusion contraindication", () => {
    const ttp = calculatePlasmicScore({
      plateletCount10e9_L: 18, // < 30 (+1)
      hemolysisDocumented: true, // (+1)
      noActiveCancerPastYear: true, // (+1)
      noSolidOrganOrStemCellTransplant: true, // (+1)
      mcvFL: 86, // < 90 (+1)
      inrLessThan1_5: true, // (+1)
      creatinineMgDl: 1.1, // < 2.0 (+1)
    });
    assert.equal(ttp.score, 7);
    assert.equal(ttp.riskTier, "HIGH_RISK");
    assert.ok(ttp.urgentIntervention.includes("Therapeutic Plasma Exchange"));
    assert.ok(ttp.contraindications.some((c) => c.includes("STRICTLY CONTRAINDICATED")));
  });

  it("evaluates anemia cascade with Mentzer index differentiating Thalassemia trait from Iron Deficiency", () => {
    // Thalassemia trait: Mentzer < 13
    const thal = evaluateAnemiaCascade({
      hemoglobinGDl: 10.2,
      mcvFL: 64,
      rbcCount10e12_L: 5.8, // 64 / 5.8 = 11.0 (< 13)
      ferritinNgMl: 140, // Normal/high ferritin
    });
    assert.equal(thal.morphologicalClassification, "MICROCYTIC_ANEMIA");
    assert.equal(thal.mentzerInterpretation, "THALASSEMIA_TRAIT_SUGGESTED");
    assert.ok(thal.primaryEtiology.includes("Thalassemia Trait"));

    // Iron deficiency: Mentzer > 13 with low ferritin
    const ida = evaluateAnemiaCascade({
      hemoglobinGDl: 8.8,
      mcvFL: 70,
      rbcCount10e12_L: 3.4, // 70 / 3.4 = 20.6 (> 13)
      ferritinNgMl: 8,
    });
    assert.equal(ida.morphologicalClassification, "MICROCYTIC_ANEMIA");
    assert.equal(ida.mentzerInterpretation, "IRON_DEFICIENCY_SUGGESTED");
    assert.ok(ida.primaryEtiology.includes("Iron Deficiency Anemia"));
  });

  it("solves autoantibodies and flags Giant Cell Arteritis visual loss emergency & active Lupus Nephritis", () => {
    // GCA / Temporal Arteritis
    const gca = solveAutoantibodies({
      ageYears: 72,
      headacheOrJawClaudicationPresent: true,
      esrMmHr: 88,
      crpMgL: 42,
    });
    assert.ok(gca.identifiedSyndromes.includes("Giant Cell Arteritis (Temporal Arteritis)"));
    assert.ok(gca.organThreatAlerts.some((a) => a.includes("OPHTHALMIC EMERGENCY")));
    assert.ok(gca.immediateManagementActions.some((m) => m.includes("Corticosteroids")));

    // SLE with Lupus Nephritis threat
    const sle = solveAutoantibodies({
      anaTiterOrIu: "1:640",
      antiDsDnaPositive: true,
      complementC3Low: true,
      complementC4Low: true,
    });
    assert.ok(sle.identifiedSyndromes.includes("Systemic Lupus Erythematosus (SLE)"));
    assert.ok(sle.organThreatAlerts.some((a) => a.includes("Active Lupus Nephritis Threat")));
  });
});
