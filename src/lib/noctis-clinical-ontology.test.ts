import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  searchClinicalCrosswalk,
  auditMedicalDecisionMaking,
  formatOntologySpokenSummary,
  CURATED_CROSSWALK_CATALOG,
} from "./noctis-clinical-ontology.ts";

describe("Noctis Clinical Code & Medical Ontology Reasoning Engine", () => {
  it("searches crosswalk catalog across SNOMED-CT, ICD-10, LOINC, and RxNorm", () => {
    // Search by ICD-10 code
    const icdResults = searchClinicalCrosswalk("I21.09");
    assert.strictEqual(icdResults.length, 1);
    assert.strictEqual(icdResults[0].clinicalTerm, "Acute ST-Elevation Myocardial Infarction of Anterior Wall");

    // Search by RxNorm name
    const rxResults = searchClinicalCrosswalk("Tenecteplase");
    assert.strictEqual(rxResults.length, 1);
    assert.strictEqual(rxResults[0].rxnorm?.rxcui, "1157833");

    // Search by LOINC component
    const loincResults = searchClinicalCrosswalk("Lactate");
    assert.strictEqual(loincResults.length, 1);
    assert.strictEqual(loincResults[0].snomed.conceptId, "76571007"); // Septic shock
  });

  it("calculates 2-of-3 rule correctly for 2023 AMA E/M MDM level of service", () => {
    // High MDM: 2 Highs (Problems: High, Risk: High, Data: Moderate)
    const mdmHigh = auditMedicalDecisionMaking({
      problemsComplexity: "HIGH",
      problemsRationale: "Acute life-threatening STEMI",
      dataComplexity: "MODERATE",
      dataRationale: "ECG and high-sens troponin reviewed",
      riskOfComplications: "HIGH",
      riskRationale: "Emergent cardiac catheterization / PCI",
      claimedCptCode: "99285",
      medicationsOrdered: [{ name: "Aspirin", rxcui: "1191", doseUnit: "325 mg" }],
    });
    assert.strictEqual(mdmHigh.overallMdmLevel, "HIGH");
    assert.strictEqual(mdmHigh.supportedEmCode, "99285");
    assert.strictEqual(mdmHigh.upcodingDetected, false);
    assert.strictEqual(mdmHigh.trippedInvariants.length, 0);

    // Moderate MDM: 2 Moderates (Problems: Moderate, Data: Moderate, Risk: Low)
    const mdmMod = auditMedicalDecisionMaking({
      problemsComplexity: "MODERATE",
      problemsRationale: "Uncomplicated pyelonephritis",
      dataComplexity: "MODERATE",
      dataRationale: "Urinalysis and CBC reviewed",
      riskOfComplications: "LOW",
      riskRationale: "Oral prescription drug management",
      claimedCptCode: "99284",
      medicationsOrdered: [{ name: "Ciprofloxacin", rxcui: "2551", doseUnit: "500 mg" }],
    });
    assert.strictEqual(mdmMod.overallMdmLevel, "MODERATE");
    assert.strictEqual(mdmMod.supportedEmCode, "99284");
    assert.strictEqual(mdmMod.upcodingDetected, false);
  });

  it("trips CF-ONTO-003 when claimed CPT exceeds documented MDM complexity (Upcoding)", () => {
    // Claimed 99285 (Level 5) for straightforward problem with low risk
    const audit = auditMedicalDecisionMaking({
      problemsComplexity: "LOW",
      problemsRationale: "Minor abrasion",
      dataComplexity: "STRAIGHTFORWARD",
      dataRationale: "No tests ordered",
      riskOfComplications: "LOW",
      riskRationale: "Simple bandage",
      claimedCptCode: "99285", // Upcoded!
      medicationsOrdered: [],
    });

    assert.strictEqual(audit.upcodingDetected, true);
    assert.ok(audit.trippedInvariants.includes("CF-ONTO-003"), "Must trip CF-ONTO-003 for upcoding");
    assert.ok(audit.mandatoryActions[0].includes("UPCODING AUDIT VETO"));
  });

  it("trips CF-ONTO-001 when high-alert medication lacks RxCUI or dose units", () => {
    const audit = auditMedicalDecisionMaking({
      problemsComplexity: "HIGH",
      problemsRationale: "DKA with K+ 6.4",
      dataComplexity: "HIGH",
      dataRationale: "ABG, BMP, lactate",
      riskOfComplications: "HIGH",
      riskRationale: "IV insulin infusion",
      claimedCptCode: "99285",
      medicationsOrdered: [
        { name: "Insulin Regular IV", rxcui: undefined, doseUnit: undefined }, // Missing RxCUI!
      ],
    });

    assert.ok(audit.trippedInvariants.includes("CF-ONTO-001"), "Must trip CF-ONTO-001 for ambiguous high-alert medication");
    assert.ok(audit.mandatoryActions[0].includes("HIGH-ALERT MEDICATION ONTOLOGY VETO"));
  });

  it("formats zero-truncation spoken audio summary with all semantic mappings and MDM levels", () => {
    const record = CURATED_CROSSWALK_CATALOG["acute-stemi"];
    const mdm = auditMedicalDecisionMaking({
      problemsComplexity: "HIGH",
      problemsRationale: "Acute STEMI",
      dataComplexity: "HIGH",
      dataRationale: "ECG and Labs",
      riskOfComplications: "HIGH",
      riskRationale: "Cath lab PCI",
      claimedCptCode: "99285",
      medicationsOrdered: [{ name: "Aspirin", rxcui: "1191", doseUnit: "325 mg" }],
    });

    const spoken = formatOntologySpokenSummary(record, mdm);
    assert.ok(spoken.includes("SNOMED-CT concept identifier is 54329005"));
    assert.ok(spoken.includes("ICD-10-CM diagnostic classification is I21.09"));
    assert.ok(spoken.includes("RxNorm clinical drug mapping is RxCUI 1191"));
    assert.ok(spoken.includes("supporting CPT Evaluation and Management code 99285"));
  });
});
