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
});
