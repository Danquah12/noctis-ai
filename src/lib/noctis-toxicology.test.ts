import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRumackMatthewThreshold,
  calculateNac3BagRegimen,
  calculateDigiFabVials,
  classifyToxidrome,
  evaluateToxicologyCase,
  formatToxicologySpokenSummary,
  evaluateToxicAlcoholMethanolEthyleneGlycol,
  evaluateTcaSodiumChannelBlockerToxicity,
  evaluateCyanideAndCarbonMonoxidePoisoning,
  evaluateCrotalineEnvenomation,
  handleNaturalToxicologyEmergencyQuery,
  TOX_PRESET_APAP_DELAYED,
  TOX_PRESET_CCB_SHOCK,
  TOX_PRESET_SEROTONIN_SYNDROME,
  TOX_PRESET_BENZO_CHRONIC,
} from "./noctis-toxicology.ts";

describe("Noctis Clinical Toxicology & Emergency Toxidrome Engine", () => {
  it("calculates Rumack-Matthew nomogram 150-treatment line correctly across hours", () => {
    // 4 hours: exactly 150 mcg/mL
    assert.strictEqual(calculateRumackMatthewThreshold(4), 150.0);

    // 8 hours (1 half-life = 4h): 75.0 mcg/mL
    assert.strictEqual(calculateRumackMatthewThreshold(8), 75.0);

    // 12 hours (2 half-lives = 8h): 37.5 mcg/mL
    assert.strictEqual(calculateRumackMatthewThreshold(12), 37.5);

    // 16 hours (3 half-lives): 18.8 mcg/mL
    assert.strictEqual(calculateRumackMatthewThreshold(16), 18.8);
  });

  it("calculates weight-based 3-bag IV NAC infusion protocol accurately", () => {
    // 70 kg patient
    const nac = calculateNac3BagRegimen(70);
    assert.strictEqual(nac.totalDoseMg, 21000); // 300 mg/kg * 70 = 21,000 mg
    assert.ok(nac.loadingBag.includes("10,500 mg")); // 150 mg/kg * 70 = 10,500 mg
    assert.ok(nac.secondBag.includes("3,500 mg")); // 50 mg/kg * 70 = 3,500 mg
    assert.ok(nac.thirdBag.includes("7,000 mg")); // 100 mg/kg * 70 = 7,000 mg

    // Capping at 100 kg for fluid safety
    const nac120 = calculateNac3BagRegimen(120);
    assert.strictEqual(nac120.totalDoseMg, 30000); // Capped at 100kg -> 30,000 mg
  });

  it("calculates DigiFab vials for acute ingestion and steady-state serum levels", () => {
    // Acute ingestion of 10 mg Digoxin: 10 / 0.5 = 20 vials
    const vialsAcute = calculateDigiFabVials({ ingestedDoseMg: 10 });
    assert.strictEqual(vialsAcute, 20);

    // Steady-state serum level 5.2 ng/mL in 70 kg patient: (5.2 * 70) / 100 = 3.64 -> 4 vials
    const vialsSerum = calculateDigiFabVials({ serumDigoxinNgPerMl: 5.2, weightKg: 70 });
    assert.strictEqual(vialsSerum, 4);
  });

  it("classifies Hunter criteria positive Serotonin Syndrome and differentiates from NMS", () => {
    const reportSS = evaluateToxicologyCase(TOX_PRESET_SEROTONIN_SYNDROME);
    assert.strictEqual(reportSS.detectedToxidrome, "SEROTONIN_SYNDROME");
    assert.ok(reportSS.clinicalFindings[0].includes("Hunter"));
    assert.ok(reportSS.immediateAntidoteDirectives.some((d) => d.includes("CYPROHEPTADINE")));

    // Lead pipe rigidity and extreme temp gives NMS
    const nmsPatient = {
      ...TOX_PRESET_SEROTONIN_SYNDROME,
      neuromuscular: "LEAD_PIPE_RIGIDITY" as const,
      temperatureCelsius: 40.1,
    };
    const reportNMS = evaluateToxicologyCase(nmsPatient);
    assert.strictEqual(reportNMS.detectedToxidrome, "NEUROLEPTIC_MALIGNANT_SYNDROME");
    assert.ok(reportNMS.immediateAntidoteDirectives.some((d) => d.includes("DANTROLENE")));
  });

  it("trips CF-TOX-001 (Flumazenil Contraindication Veto) in chronic benzodiazepine user", () => {
    const report = evaluateToxicologyCase(TOX_PRESET_BENZO_CHRONIC);
    assert.ok(report.trippedInvariants.includes("CF-TOX-001"), "Must trip CF-TOX-001");
    assert.ok(report.mandatoryActions[0].includes("FLUMAZENIL CONTRAINDICATION VETO"));
    assert.ok(report.mandatoryActions[0].includes("status epilepticus"));
  });

  it("evaluates delayed APAP overdose, recommends NAC and trips CF-TOX-002", () => {
    const report = evaluateToxicologyCase(TOX_PRESET_APAP_DELAYED);
    assert.ok(report.rumackMatthew?.treatmentIndicated, "Treatment must be indicated for 140 mcg/mL at 10h");
    assert.ok(report.trippedInvariants.includes("CF-TOX-002"), "Must trip CF-TOX-002 for presentation > 8h");
    assert.ok(report.mandatoryActions.some((a) => a.includes("DELAYED NAC HEPATOTOXICITY VETO")));
  });

  it("triggers High-Dose Insulin Euglycemia Therapy (HIET) and Intralipid in CCB shock", () => {
    const report = evaluateToxicologyCase(TOX_PRESET_CCB_SHOCK);
    assert.strictEqual(report.highDoseInsulinIndicated, true);
    assert.ok(report.immediateAntidoteDirectives.some((d) => d.includes("HIGH-DOSE INSULIN")));
    assert.ok(report.immediateAntidoteDirectives.some((d) => d.includes("INTRALIPID 20%")));
  });

  it("formats zero-truncation spoken audio summary with clinical precision", () => {
    const report = evaluateToxicologyCase(TOX_PRESET_APAP_DELAYED);
    const spoken = formatToxicologySpokenSummary(report);
    assert.ok(spoken.includes("Rumack-Matthew treatment threshold is"));
    assert.ok(spoken.includes("CF-TOX-002"));
    assert.ok(spoken.includes("N-ACETYLCYSTEINE"));
  });

  it("evaluates toxic alcohol (methanol) with exact Osmolal Gap, Fomepizole, and EXTRIP criteria", () => {
    // 70 kg patient with methanol ingestion:
    // Na 140, Glu 90, BUN 14, EtOH 0, Measured Osm 340, Cl 100, HCO3 8, pH 7.10
    // Calc Osm = 2(140) + 90/18 + 14/2.8 + 0 = 280 + 5 + 5 = 290 mOsm/kg
    // Osm Gap = 340 - 290 = 50 mOsm/kg (Elevated > 10, and >= 50 EXTRIP trigger)
    // Anion Gap = 140 - (100 + 8) = 32 mEq/L
    const res = evaluateToxicAlcoholMethanolEthyleneGlycol({
      substance: "METHANOL",
      weightKg: 70,
      measuredOsmolalityMOsmKg: 340,
      sodiumMeqL: 140,
      glucoseMgDl: 90,
      bunMgDl: 14,
      ethanolMgDl: 0,
      chlorideMeqL: 100,
      bicarbonateMeqL: 8,
      arterialPh: 7.10,
      measuredToxicAlcoholMgDl: 65,
      visualSymptomsReported: true,
    });

    assert.strictEqual(res.calculatedOsmolalityMOsmKg, 290);
    assert.strictEqual(res.osmolalGapMOsmKg, 50);
    assert.strictEqual(res.anionGapMeqL, 32);
    assert.strictEqual(res.osmolalGapElevated, true);
    assert.strictEqual(res.highAnionGapAcidosisDetected, true);
    assert.strictEqual(res.fomepizoleProtocol.loadingDoseMg, 1050); // 70 * 15 = 1050 mg
    assert.strictEqual(res.fomepizoleProtocol.maintenanceDoseMg, 700); // 70 * 10 = 700 mg
    assert.ok(res.coFactorTherapy.some((c) => c.includes("Folinic Acid")));
    assert.strictEqual(res.extripDialysisRecommendation.dialysisMandatory, true);
    assert.strictEqual(res.extripDialysisRecommendation.urgencyTier, "EMERGENT_HEMODIALYSIS_NOW");
  });

  it("evaluates TCA overdose, stratifies QRS and aVR risk, orders NaHCO3, and vetoes Physostigmine", () => {
    const res = evaluateTcaSodiumChannelBlockerToxicity({
      patientWeightKg: 70,
      qrsDurationMs: 165, // > 160 ms -> Ventricular arrhythmia high risk
      terminalRAvrMm: 4.0, // >= 3.0 mm -> Conduction block
      rOverSRatioAvr: 0.9,
      systolicBpMmHg: 80,
      heartRateBpm: 130,
      seizuresReported: true,
      ventricularDysrhythmiaPresent: false,
    });

    assert.strictEqual(res.ecgRiskStratification.qrsRiskCategory, "VENTRICULAR_ARRHYTHMIA_HIGH_RISK");
    assert.strictEqual(res.ecgRiskStratification.aVrTerminalRWaveRisk, "HIGH_RISK_CONDUCTION_BLOCK");
    assert.strictEqual(res.sodiumBicarbonateProtocol.indicated, true);
    assert.strictEqual(res.sodiumBicarbonateProtocol.bolusDoseMeq, 105); // 70 * 1.5 = 105 mEq
    assert.ok(res.strictSafetyVetoes.some((v) => v.includes("CF-TOX-005") && v.includes("Physostigmine")));
    assert.ok(res.strictSafetyVetoes.some((v) => v.includes("CLASS IA / IC")));
  });

  it("evaluates Cyanide & Carbon Monoxide poisoning with Hydroxocobalamin and Hyperbaric Oxygen indications", () => {
    const res = evaluateCyanideAndCarbonMonoxidePoisoning({
      exposureScenario: "SMOKE_INHALATION_FIRE",
      carboxyhemoglobinPercent: 28, // >= 25% -> HBO indicated
      serumLactateMmolL: 11.2, // >= 8.0 -> Cyanide suspected
      lossOfConsciousnessOrSyncope: true,
      neurologicDeficitsPresent: true,
      isPregnant: false,
    });

    assert.strictEqual(res.cyanideToxicitySuspected, true);
    assert.strictEqual(res.hydroxocobalaminProtocol.indicated, true);
    assert.ok(res.hydroxocobalaminProtocol.adultDose.includes("5.0 grams IV"));
    assert.strictEqual(res.carbonMonoxideManagement.hyperbaricOxygenIndicated, true);
    assert.ok(res.carbonMonoxideManagement.hboCriteriaMet.length >= 2);
  });

  it("evaluates Crotaline snake envenomation, doses CroFab, and vetoes tourniquets/incisions", () => {
    const res = evaluateCrotalineEnvenomation({
      snakeType: "RATTLESNAKE",
      patientWeightKg: 80,
      timeSinceBiteHours: 3,
      localSwellingProgression: "RAPIDLY_PROGRESSING_PAST_MAJOR_JOINT",
      plateletCount10e9L: 65,
      fibrinogenMgDl: 90, // < 100 -> Severe coagulopathy
      ptInr: 2.1,
      systemicSignsPresent: true,
    });

    assert.strictEqual(res.envenomationSeverity, "SEVERE");
    assert.strictEqual(res.antivenomProtocol.indicated, true);
    assert.strictEqual(res.antivenomProtocol.initialLoadingVials, 6);
    assert.ok(res.strictSafetyVetoes.some((v) => v.includes("CF-TOX-006") && v.includes("Tourniquets")));
  });

  it("routes natural language emergency toxicology queries accurately", () => {
    const methQuery = "A 70 kg patient ingested windshield wiper fluid. Measured osmolality 340, Na 140, Glu 90, BUN 14, pH 7.10, with visual blurring. Calculate osmolal gap and evaluate Fomepizole and dialysis.";
    const methRes = handleNaturalToxicologyEmergencyQuery(methQuery);
    assert.ok(methRes);
    assert.ok(methRes.includes("NOCTIS-TOX-001"));
    assert.ok(methRes.includes("Fomepizole"));
    assert.ok(methRes.includes("EXTRIP"));

    const tcaQuery = "Patient with amitriptyline TCA overdose has QRS duration 165 ms, terminal R wave in aVR 4mm, and BP 80/50. What is the sodium bicarbonate protocol?";
    const tcaRes = handleNaturalToxicologyEmergencyQuery(tcaQuery);
    assert.ok(tcaRes);
    assert.ok(tcaRes.includes("Sodium Bicarbonate"));
    assert.ok(tcaRes.includes("Physostigmine"));

    const snakeQuery = "Patient with rattlesnake pit viper bite has rapidly progressing swelling past the elbow and low fibrinogen. How many vials of CroFab antivenom should be given and can a tourniquet be used?";
    const snakeRes = handleNaturalToxicologyEmergencyQuery(snakeQuery);
    assert.ok(snakeRes);
    assert.ok(snakeRes.includes("CroFab"));
    assert.ok(snakeRes.includes("HARMFUL INTERVENTIONS VETO"));

    const cholQuery = "A patient presents with miosis, salivation, lacrimation, urination, defecation, and wheezing after pesticide exposure. What toxidrome is present and what antidote is administered?";
    const cholRes = handleNaturalToxicologyEmergencyQuery(cholQuery);
    assert.ok(cholRes);
    assert.ok(cholRes.includes("NOCTIS-TOX-001"));
    assert.ok(cholRes.includes("CHOLINERGIC CRISIS"));
    assert.ok(cholRes.includes("Atropine"));
    assert.ok(cholRes.includes("Pralidoxime"));
    assert.ok(cholRes.includes("SUCCINYLCHOLINE CONTRAINDICATION VETO"));
  });
});
