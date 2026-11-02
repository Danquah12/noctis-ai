import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateCopdAsthma,
  evaluateHypertensiveCrisis,
  evaluateDiarrhealIllness,
  evaluateObesityMetabolic,
  evaluatePhq9Gad7,
  evaluateHivOpportunisticProphylaxis,
  evaluateTuberculosis,
  evaluateMalaria,
  evaluateHepatitisC,
} from "./noctis-global-conditions-engine.ts";

describe("Noctis Global Conditions Suite 1: Pulmonary, Cardiovascular & Gastrointestinal", () => {
  it("evaluates COPD GOLD 2026 Group E exacerbator and home oxygen criteria", () => {
    const copd = evaluateCopdAsthma({
      isCopdOrAsthma: "COPD",
      postBronchodilatorFev1FvcRatio: 0.58,
      fev1PercentPredicted: 42, // GOLD 3
      hospitalizationsPastYear: 1, // Group E
      currentSpO2RoomAir: 87, // Oxygen indicated!
      restingPaO2MmHg: 53,
    });

    assert.equal(copd.goldOrGinaStage, "GOLD 3 (Severe)");
    assert.equal(copd.exacerbationRiskGroup, "GROUP_E_EXACERBATOR");
    assert.equal(copd.longTermOxygenTherapyIndicated, true);
    assert.ok(copd.maintenancePharmacotherapy.some((m) => m.includes("Dual Bronchodilation")));
    assert.ok(copd.acuteExacerbationProtocol.some((p) => p.includes("Prednisone 40 mg")));
  });

  it("evaluates Hypertensive Emergency with acute end-organ damage and enforces MAP reduction limits", () => {
    const emg = evaluateHypertensiveCrisis({
      systolicBpMmHg: 210,
      diastolicBpMmHg: 125,
      hasAcutePulmonaryEdemaShortnessOfBreath: true,
    });

    assert.equal(emg.category, "HYPERTENSIVE_EMERGENCY");
    assert.equal(emg.maximumPermittedMapDropPercent1stHour, 25);
    assert.ok(emg.recommendedIvAgents.some((a) => a.includes("Nicardipine")));
    assert.ok(emg.immediateAction.includes("ICU ADMISSION STAT"));

    // Hypertensive Urgency without end organ damage
    const urg = evaluateHypertensiveCrisis({
      systolicBpMmHg: 195,
      diastolicBpMmHg: 115,
    });
    assert.equal(urg.category, "HYPERTENSIVE_URGENCY");
    assert.ok(urg.immediateAction.includes("Do NOT rapidly drop blood pressure with IV meds"));
    assert.ok(urg.contraindicatedAgents.some((c) => c.includes("SUBLINGUAL NIFEDIPINE")));
  });

  it("evaluates Diarrheal illness with C. difficile suspicion and flags antimotility contraindication", () => {
    const cdiff = evaluateDiarrhealIllness({
      durationDays: 4,
      stoolFrequencyPerDay: 7,
      recentAntibioticExposurePast3Months: true,
      hasSevereDehydrationSigns: true,
    });

    assert.equal(cdiff.syndrome, "SUSPECTED_CLOSTRIDIOIDES_DIFFICILE");
    assert.equal(cdiff.dehydrationStatus, "SEVERE_DEHYDRATION");
    assert.ok(cdiff.antimicrobialGuidance.includes("Vancomycin 125 mg QID"));
    assert.ok(cdiff.contraindications.some((c) => c.includes("Loperamide")));
  });
});

describe("Noctis Global Conditions Suite 2: Metabolic, Psychiatric & Infectious", () => {
  it("evaluates Obesity and Metabolic Syndrome criteria for GLP-1 RA incretin eligibility", () => {
    const ob = evaluateObesityMetabolic({
      bodyMassIndexKgM2: 36.5,
      waistCircumferenceInches: 42,
      isFemale: false,
      fastingTriglyceridesMgDl: 185,
      hdlCholesterolMgDl: 34,
      systolicBpMmHg: 138,
      fastingGlucoseMgDl: 112,
    });

    assert.equal(ob.whoBmiCategory, "OBESITY_CLASS_2");
    assert.equal(ob.hasMetabolicSyndrome, true);
    assert.ok(ob.metabolicSyndromeCriteriaMet >= 3);
    assert.ok(ob.evidenceBasedRegimens.some((r) => r.includes("Semaglutide 2.4 mg")));
  });

  it("scores PHQ-9 & GAD-7 and engages immediate crisis safety lock on suicidal ideation item #9", () => {
    const locked = evaluatePhq9Gad7({
      phq9Score: 18, // Moderately severe
      phq9Item9SelfHarmScore: 2, // Positive suicidal ideation!
      gad7Score: 14, // Moderate anxiety
    });

    assert.equal(locked.depressionSeverity, "MODERATELY_SEVERE");
    assert.equal(locked.anxietySeverity, "MODERATE");
    assert.equal(locked.immediateSuicideSafetyLock, true);
    assert.ok(locked.crisisEscalationDirective?.includes("988 Suicide & Crisis Lifeline"));
  });

  it("evaluates HIV opportunistic infection prophylaxis thresholds across CD4 counts", () => {
    const aids = evaluateHivOpportunisticProphylaxis({
      cd4CountCellsPerUl: 85, // CD4 < 100
      viralLoadCopiesPerMl: 45000,
      isCurrentlyOnArt: false,
    });

    assert.equal(aids.cdcClinicalStage, "STAGE_3_AIDS_CD4_LT_200");
    assert.equal(aids.pcpProphylaxisIndicated, true);
    assert.equal(aids.toxoplasmosisProphylaxisIndicated, true);
    assert.ok(aids.indicatedProphylacticRegimens.some((r) => r.includes("TMP-SMX")));
  });

  it("evaluates Tuberculosis presentation and RIPE 4-drug therapy with hepatotoxicity rules", () => {
    const tb = evaluateTuberculosis({
      presentation: "ACTIVE_PULMONARY_SUSPECTED",
      sputumAfbSmearOrGeneXpertPositive: true,
      hasCoughOver3WeeksWithHemoptysisAndNightSweats: true,
      chestXrayCavitaryInfiltratePresent: true,
    });

    assert.equal(tb.clinicalStatus, "ACTIVE_TUBERCULOSIS_CONFIRMED");
    assert.equal(tb.airborneIsolationRequired, true);
    assert.ok(tb.standardRegimen.includes("RIPE 4-Drug Therapy"));
    assert.ok(tb.hepatotoxicityMonitoringRules.some((r) => r.includes("AST or ALT > 3x")));
  });

  it("evaluates Malaria severity and mandates IV Artesunate for life-threatening P. falciparum", () => {
    const mal = evaluateMalaria({
      travelToEndemicAreaPastYear: true,
      speciesIdentified: "PLASMODIUM_FALCIPARUM",
      parasitemiaPercentage: 14, // >= 10% severe!
      hasImpairedConsciousnessOrCerebralMalaria: true,
    });

    assert.equal(mal.severityTier, "SEVERE_MALARIA_LIFE_THREATENING");
    assert.ok(mal.firstLineTherapy.includes("IV ARTESUNATE STAT"));
    assert.equal(mal.g6pdTestingRequiredBeforePrimaquine, true);
  });

  it("evaluates Hepatitis C active infection and pan-genotypic DAA regimens", () => {
    const hcv = evaluateHepatitisC({
      hcvAntibodyPositive: true,
      hcvRnaDetectable: true,
      hcvRnaViralLoadIuMl: 1200000,
      cirrhosisPresent: false,
    });

    assert.equal(hcv.diagnosticConclusion, "ACTIVE_CHRONIC_HEPATITIS_C");
    assert.equal(hcv.treatmentDurationWeeks, 8);
    assert.ok(hcv.panGenotypicRegimens.some((r) => r.includes("Epclusa") || r.includes("Mavyret")));
  });
});
