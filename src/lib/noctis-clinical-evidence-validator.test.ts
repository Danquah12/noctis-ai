import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateClinicalEvidenceIntegrity } from "./noctis-clinical-evidence-validator.ts";

describe("Noctis Clinical Evidence Integrity and Medication Safety Validator", () => {
  it("VAL-NO-FAB: intercepts invented negative symptoms when not provided in raw intake", () => {
    const rawInput = "68yo male with CKD 4 and potassium 7.1 mmol/L";
    const dossierWithFabrication = `
[S - SUBJECTIVE]
Patient denies chest pain or syncope but reports weakness.
[O - OBJECTIVE]
deep tendon reflexes preserved to mildly depressed.
    `;

    const result = validateClinicalEvidenceIntegrity(dossierWithFabrication, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-NO-FAB-001"));
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-NO-FAB-002"));
    assert.match(result.sanitizedDossier, /UNDOCUMENTED ON INTAKE — REQUIRES IMMEDIATE BEDSIDE RULE-OUT/);
    assert.match(result.sanitizedDossier, /UNMEASURED \/ NOT PROVIDED/);
  });

  it("VAL-MED-DISCONT: rejects permanent medication contraindications for ACEi/MRAs", () => {
    const rawInput = "68yo male with hyperkalemia on Lisinopril and Spironolactone";
    const dossier = "Immediate and permanent cessation of Lisinopril and Spironolactone.";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-MED-DISCONT"));
    assert.match(result.sanitizedDossier, /post-stabilization reassessment/i);
    assert.doesNotMatch(result.sanitizedDossier, /permanent cessation of lisinopril/i);
  });

  it("VAL-ALLERGY-ADR: forbids filing allergy alerts for adverse pharmacological effects", () => {
    const rawInput = "Patient on Lisinopril with hyperkalemia";
    const dossier = "Place electronic allergy alert for potassium-sparing agents.";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-ALLERGY-ADR"));
    assert.match(result.sanitizedDossier, /Adverse Drug Reaction \(ADR\) \/ Contraindication Flag/);
    assert.match(result.sanitizedDossier, /do NOT file as an immune-mediated allergy/);
  });

  it("VAL-PROB-CALIB: strips uncalibrated numerical pseudo-probabilities", () => {
    const rawInput = "Patient with hyperkalemia";
    const dossier = "Severe Hyperkalemia (Likelihood: > 95%)";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-PROB-CALIB"));
    assert.match(result.sanitizedDossier, /Status: CONFIRMED CLINICAL EMERGENCY/);
    assert.doesNotMatch(result.sanitizedDossier, /Likelihood: > 95%/);
  });

  it("VAL-FDA-DUAL-TIER: enforces function-by-function regulatory evaluation rather than blanket non-device claim", () => {
    const rawInput = "Emergency resuscitation case";
    const dossier = "Header: NON-DEVICE CDS ARCHITECTURE (21 U.S.C. § 360j(o)(1)(E))";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-FDA-DUAL-TIER"));
    assert.match(result.sanitizedDossier, /Dual-Tier Function Classification/);
  });

  it("VAL-MALE-OB-EXCLUSION: vetos obstetric diagnoses and engines for male patients", () => {
    const rawInput = "76-year-old male with CKD stage 5 and hypermagnesemia";
    const dossier = "Diagnosis: Preeclampsia with severe features and HELLP syndrome. Gestational age: 34 weeks. Engine: NOCTIS-OB-CRIT-001";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-MALE-OB-EXCLUSION"));
    assert.match(result.sanitizedDossier, /Male Patient: Obstetric Conditions Strictly Excluded/);
    assert.match(result.sanitizedDossier, /NOT APPLICABLE — MALE PATIENT/);
    assert.doesNotMatch(result.sanitizedDossier, /NOCTIS-OB-CRIT-001/);
  });

  it("VAL-HYPERMAG-VETO: intercepts and vetos magnesium sulfate administration in hypermagnesemia", () => {
    const rawInput = "76yo male with CKD 5 and serum magnesium 8.5 mg/dL";
    const dossier = "Plan: Administer IV Magnesium Sulfate 4g loading dose immediately.";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-HYPERMAG-VETO"));
    assert.match(result.sanitizedDossier, /Contraindicated: Avoid additional magnesium products or magnesium sulfate/i);
    assert.match(result.sanitizedDossier, /STAT IV Calcium Gluconate/i);
    assert.doesNotMatch(result.sanitizedDossier, /Administer IV Magnesium Sulfate 4g/);
  });

  it("VAL-CKD-ANURIA: rejects asserting anuria solely from CKD 5 without urine measurement", () => {
    const rawInput = "76yo male with CKD stage 5";
    const dossier = "Diuretics are prohibited due to CKD 5 anuria.";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-CKD-ANURIA"));
    assert.match(result.sanitizedDossier, /CKD Stage 5 does not automatically equate to anuria/i);
  });

  it("VAL-COMPLETED-ORDERS: rejects documenting recommended orders as already completed", () => {
    const rawInput = "Patient with acute hypermagnesemic shock";
    const dossier = "OBJECTIVE: Stat serum calcium, potassium, and repeat BMP drawn. Pacing pads placed on patient.";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-COMPLETED-ORDERS"));
    assert.match(result.sanitizedDossier, /PROPOSED ORDER AWAITING CLINICIAN VERIFICATION — NOT COMPLETED/);
  });

  it("VAL-CALCIUM-VARIABILITY: ensures calcium gluconate is framed with variable and transient response", () => {
    const rawInput = "Emergency hypermagnesemia treatment";
    const dossier = "Calcium gluconate immediately restores cardiac rhythmicity, reverses bradycardia, elevates vascular resistance, and restores neuromuscular transmission.";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-CALCIUM-VARIABILITY"));
    assert.match(result.sanitizedDossier, /temporary, competitive membrane antagonism/i);
    assert.match(result.sanitizedDossier, /variable and transient/i);
  });

  it("VAL-NO-FAB-SOAP: strips fabricated caregiver, sternal rub, and denial of trauma when not in intake", () => {
    const rawInput = "76yo male with CKD 5, magnesium 8.5 mg/dL, HR 38, BP 82/46";
    const dossier = "SUBJECTIVE: Patient's caregiver reports weakness. Denies fever or trauma. OBJECTIVE: Difficult to arouse but responds to sternal rub. Distant heart sounds, peripheral pulses weak.";

    const result = validateClinicalEvidenceIntegrity(dossier, rawInput);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-NO-FAB-SOAP-001"));
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-NO-FAB-SOAP-002"));
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-NO-FAB-SOAP-003"));
    assert.ok(result.violations.some((v) => v.ruleId === "VAL-NO-FAB-SOAP-004"));
  });
});
