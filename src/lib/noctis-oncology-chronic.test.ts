import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateCancerStaging,
  evaluateParkinsons,
  evaluateOsteoporosis,
  evaluateSickleCell,
} from "./noctis-oncology-chronic-engine.ts";
import { handleNaturalSpecialistClinicalQuery } from "./noctis-specialist-router.ts";

describe("Noctis Oncology & Chronic Disease Suite: Cancers, Parkinson's, Bone & Sickle Cell", () => {
  it("stages Lung Cancer and identifies targeted Osimertinib therapy for EGFR mutations", () => {
    const lung = evaluateCancerStaging({
      cancerType: "LUNG",
      histologySubtype: "Adenocarcinoma",
      distantMetastasesPresent: false,
      lymphNodesPositiveCount: 1,
      biomarkers: {
        egfrMutation: true,
      },
    });

    assert.equal(lung.cancerSite, "LUNG");
    assert.equal(lung.molecularSubtypeOrGradeGroup, "Non-Small Cell Lung Cancer (NSCLC)");
    assert.ok(lung.targetedTherapiesAndBiomarkers.some((t) => t.includes("Osimertinib")));
    assert.ok(lung.screeningAndSurveillanceGuidance.includes("Low-Dose CT"));
  });

  it("stages Breast Cancer and identifies HER2 dual blockade with cardio-toxicity echo gate", () => {
    const breast = evaluateCancerStaging({
      cancerType: "BREAST",
      biomarkers: {
        erPositive: true,
        prPositive: true,
        her2Positive: true,
      },
    });

    assert.equal(breast.molecularSubtypeOrGradeGroup, "Triple-Positive (HR+ / HER2+)");
    assert.ok(breast.targetedTherapiesAndBiomarkers.some((t) => t.includes("Trastuzumab")));
    assert.ok(breast.targetedTherapiesAndBiomarkers.some((t) => t.includes("Cardio-Oncology Gate")));
  });

  it("stages Prostate Cancer with Gleason grade grouping and identifies Active Surveillance", () => {
    const pros = evaluateCancerStaging({
      cancerType: "PROSTATE",
      biomarkers: {
        gleasonPrimaryScore: 3,
        gleasonSecondaryScore: 3, // 3+3=6
        psaNgMl: 5.4,
      },
    });

    assert.ok(pros.molecularSubtypeOrGradeGroup.includes("Grade Group 1"));
    assert.ok(pros.firstLineTherapeuticPathways.some((p) => p.includes("Active Surveillance")));
  });

  it("stages Colorectal Cancer with dMMR/MSI-High and identifies Pembrolizumab immunotherapy", () => {
    const crc = evaluateCancerStaging({
      cancerType: "COLORECTAL",
      biomarkers: {
        msiHighOrDmmr: true,
      },
    });

    assert.ok(crc.molecularSubtypeOrGradeGroup.includes("MSI-High"));
    assert.ok(crc.targetedTherapiesAndBiomarkers.some((t) => t.includes("Pembrolizumab monotherapy")));
  });

  it("evaluates Parkinson's disease MDS criteria and Levodopa wearing-off motor fluctuations", () => {
    const pd = evaluateParkinsons({
      hasBradykinesia: true,
      hasRestingTremor: true,
      hasRigidityCogwheelOrLeadpipe: true,
      diseaseDurationYears: 5,
      experiencesWearingOffOrDyskinesia: true,
    });

    assert.equal(pd.diagnosticCertainty, "CLINICALLY_ESTABLISHED_PD");
    assert.ok(pd.firstLinePharmacotherapy.some((p) => p.includes("Carbidopa / Levodopa")));
    assert.ok(pd.motorFluctuationManagement.some((m) => m.includes("Wearing-Off Management")));
    assert.ok(pd.multidisciplinaryCare.some((c) => c.includes("LSVT BIG")));
  });

  it("evaluates Osteoporosis DEXA T-scores and enforces renal safety gating for bisphosphonates", () => {
    // Normal kidney function
    const ostNormal = evaluateOsteoporosis({
      lowestDexaTScore: -2.8,
      ageYears: 72,
      isFemale: true,
      eGfrMlMin173m2: 55,
    });
    assert.equal(ostNormal.boneMineralDensityClassification, "OSTEOPOROSIS");
    assert.equal(ostNormal.pharmacologicTherapyIndicated, true);
    assert.ok(ostNormal.firstLineAntiresorptiveAgents.some((a) => a.includes("Alendronate")));

    // Severe CKD: eGFR < 35 contraindicates bisphosphonates; Denosumab indicated
    const ostCkd = evaluateOsteoporosis({
      lowestDexaTScore: -2.9,
      ageYears: 76,
      isFemale: true,
      eGfrMlMin173m2: 24, // < 35!
    });
    assert.ok(ostCkd.firstLineAntiresorptiveAgents.some((a) => a.includes("Denosumab")));
    assert.ok(ostCkd.safetyContraindications.some((c) => c.includes("CONTRAINDICATED")));
  });

  it("diagnoses Sickle Cell Disease Acute Chest Syndrome emergency and exchange transfusion indication", () => {
    const scd = evaluateSickleCell({
      genotype: "HB_SS",
      isAcuteVasoOcclusivePainCrisis: true,
      hasNewPulmonaryInfiltrateOnCxr: true, // ACS hallmark
      feverCelsius: 38.8,
      spO2DropGreaterThan3Percent: true,
      currentHemoglobinGDl: 5.8,
      baselineHemoglobinGDl: 8.6,
    });

    assert.equal(scd.complicationType, "ACUTE_CHEST_SYNDROME_EMERGENCY");
    assert.ok(scd.acuteChestSyndromeProtocol.some((p) => p.includes("ACUTE CHEST SYNDROME MEDICAL EMERGENCY")));
    assert.ok(scd.bloodTransfusionGuidance.includes("EXCHANGE TRANSFUSION"));
    assert.ok(scd.diseaseModifyingTherapy.some((d) => d.includes("Hydroxyurea")));
  });

  it("dynamically parses eGFR in osteoporosis natural query and enforces bisphosphonate contraindication", () => {
    const output = handleNaturalSpecialistClinicalQuery(
      "74yo female with osteoporosis, DEXA T-score -3.1, severe CKD with eGFR 24 mL/min/1.73m2. What is the recommended treatment?"
    );
    assert.ok(output, "Should route to osteoporosis CDS");
    assert.ok(output.includes("Osteoporosis & Bone Mineral Density"));
    assert.ok(output.includes("eGFR 24"));
    assert.ok(output.includes("Oral/IV Bisphosphonates are CONTRAINDICATED"));
    assert.ok(output.includes("Denosumab (Prolia)"));
  });

  it("prioritizes HER2 breast cancer cardio-oncology gate and withholds Trastuzumab when LVEF < 50%", () => {
    const output = handleNaturalSpecialistClinicalQuery(
      "62yo female with HER2-positive breast cancer planned for Trastuzumab and Pertuzumab. Baseline echocardiogram shows LVEF 48%. What is the recommendation?"
    );
    assert.ok(output, "Should route to breast cancer CDS");
    assert.ok(output.includes("Oncologic Staging & Targeted Biomarkers"));
    assert.ok(output.includes("Cardio-Oncology Critical Safety Alert"));
    assert.ok(output.includes("Withhold/delay HER2-targeted therapy (Trastuzumab)"));
    assert.ok(!output.includes("Cardiovascular Engine"), "Must not misroute to general heart failure GDMT");
  });

  it("approves Trastuzumab with 3-month surveillance gate when baseline LVEF >= 50%", () => {
    const output = handleNaturalSpecialistClinicalQuery(
      "58yo female with HER2-positive breast cancer undergoing chemotherapy. Baseline echocardiogram demonstrates LVEF 58%. Can she proceed with Trastuzumab?"
    );
    assert.ok(output, "Should route to breast cancer CDS");
    assert.ok(output.includes("58%"));
    assert.ok(output.includes(">= 50%"));
    assert.ok(output.includes("Mandatory surveillance echocardiogram every 3 months"));
  });
});
