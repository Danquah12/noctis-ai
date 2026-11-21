import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFhirR4HospitalBundle,
  validateFhirR4ClinicalBundle,
} from "./noctis-fhir-exporter.ts";
import { arbitrateClinicalConsensus } from "./noctis-clinical-consensus.ts";

test("Noctis FHIR R4 Exporter generates US Core v9.0.0 compliant bundle without data fabrication", () => {
  const encounterInput = `A 78-year-old male with CKD stage 4, heart failure with reduced ejection fraction (EF 30%), atrial fibrillation, and type 2 diabetes presents to the emergency department with profound weakness, confusion, dizziness, and reduced urine output over the past 24 hours. Blood pressure 68/38 mmHg, Heart rate 29 bpm, Respiratory rate 28/min, Potassium 7.3 mmol/L, Creatinine 4.8 mg/dL, Baseline creatinine 2.3 mg/dL, Bicarbonate 12 mmol/L, Arterial pH 7.12, PaCO2 29 mmHg, Lactate 6.8 mmol/L, Digoxin level 3.6 ng/mL, Urine output 100 mL over 8 hours. Notice: Patient body weight is NOT PROVIDED in intake. Serum chloride is UNMEASURED.`;

  const dossier = arbitrateClinicalConsensus(encounterInput, "ENC-FHIR-TEST-001");
  const bundle = buildFhirR4HospitalBundle(dossier, encounterInput, {
    patientName: "John Doe",
    mrn: "MRN-998877",
  });

  const validation = validateFhirR4ClinicalBundle(bundle);

  assert.equal(validation.isValid, true, `FHIR Validation failed: ${validation.errors.join(", ")}`);
  assert.equal(bundle.resourceType, "Bundle");
  assert.equal(bundle.entry.length > 5, true);
  assert.equal(validation.resourceCounts.Patient, 1);
  assert.equal(validation.resourceCounts.Encounter, 1);
  assert.equal(validation.resourceCounts.DiagnosticReport, 1);
  assert.equal(validation.resourceCounts.CarePlan, 1);
  assert.equal(validation.resourceCounts.RiskAssessment, 1);
  assert.equal(validation.resourceCounts.ServiceRequest, 1);

  // Verify Zero Fabrication in Observations: No weight or chloride observations
  const obsTypes = bundle.entry
    .filter((e) => e.resource.resourceType === "Observation")
    .map((e) => e.resource.code.coding[0].display);

  assert.equal(obsTypes.some((d: string) => /weight/i.test(d)), false, "Fabricated weight observation detected!");
  assert.equal(obsTypes.some((d: string) => /chloride/i.test(d)), false, "Fabricated chloride observation detected!");

  // Verify SHA-256 seal present in meta
  assert.equal(bundle.meta.securitySealSha256.length, 64);
});
