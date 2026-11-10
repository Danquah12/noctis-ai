import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  KNOWN_SMART_SANDBOXES,
  PRESET_SMART_PATIENTS,
  normalizeLiveFhirBundle,
  getSyntheticPresetDossier,
  fetchLivePatientDossier,
} from "./noctis-fhir-live-client.ts";

describe("Noctis Live SMART-on-FHIR Client Suite", () => {
  it("verifies known sandbox configurations including Epic, Cerner, and SMART Health IT", () => {
    assert.ok(KNOWN_SMART_SANDBOXES.length >= 3);
    const epic = KNOWN_SMART_SANDBOXES.find(s => s.vendor === "EPIC_SYSTEMS");
    assert.ok(epic);
    assert.match(epic.baseUrl, /epic\.com/);

    const smart = KNOWN_SMART_SANDBOXES.find(s => s.vendor === "SMART_HEALTH_IT");
    assert.ok(smart);
    assert.equal(smart.baseUrl, "https://r4.smarthealthit.org");
  });

  it("normalizes a raw FHIR R4 Bundle with LOINC vitals and flags tachycardia and severe hyperglycemia", () => {
    const rawPatient = {
      id: "test-pt-100",
      identifier: [{ value: "MRN-10099" }],
      name: [{ given: ["Marcus"], family: "Vance" }],
      gender: "male",
      birthDate: "1975-08-15",
    };

    const rawConditions = {
      entry: [
        {
          resource: {
            resourceType: "Condition",
            code: { coding: [{ code: "E11.9", display: "Type 2 Diabetes Mellitus" }] },
          },
        },
      ],
    };

    const rawObservations = {
      entry: [
        {
          resource: {
            resourceType: "Observation",
            code: { coding: [{ code: "8867-4" }] }, // Heart rate
            valueQuantity: { value: 125 },
          },
        },
        {
          resource: {
            resourceType: "Observation",
            code: { coding: [{ code: "8480-6" }] }, // Systolic BP
            valueQuantity: { value: 85 },
          },
        },
        {
          resource: {
            resourceType: "Observation",
            code: { coding: [{ code: "2339-0" }] }, // Blood glucose
            valueQuantity: { value: 380 },
          },
        },
      ],
    };

    const rawMeds = {
      entry: [
        {
          resource: {
            resourceType: "MedicationRequest",
            medicationCodeableConcept: { coding: [{ code: "RxCUI-1364430", display: "Apixaban 5 mg Oral Tablet" }] },
          },
        },
      ],
    };

    const dossier = normalizeLiveFhirBundle(rawPatient, rawConditions, rawObservations, rawMeds, "https://test.fhir.org");

    assert.equal(dossier.patientId, "test-pt-100");
    assert.equal(dossier.fullName, "Marcus Vance");
    assert.equal(dossier.vitals.heartRateBpm, 125);
    assert.equal(dossier.vitals.systolicBpMmHg, 85);
    assert.equal(dossier.vitals.bloodGlucoseMgDl, 380);

    // Verify safety alerts triggered
    assert.ok(dossier.safetyFlags.some(f => f.includes("Tachycardia Alert")));
    assert.ok(dossier.safetyFlags.some(f => f.includes("Hypotension Warning")));
    assert.ok(dossier.safetyFlags.some(f => f.includes("Severe Hyperglycemia")));
    assert.ok(dossier.safetyFlags.some(f => f.includes("Active Anticoagulant Therapy")));
  });

  it("handles pediatric patient safely by enforcing Broselow weight-based protocol flag", () => {
    const pedDossier = getSyntheticPresetDossier("smart-8888801");
    assert.equal(pedDossier.ageYears, 6);
    assert.ok(pedDossier.safetyFlags.some(f => f.includes("Pediatric Patient Safety Protocol")));
    assert.ok(pedDossier.recommendedSpecialties.includes("Pediatric Advanced Life Support"));
  });

  it("fetches synthetic preset dossier with determinism and valid LOINC observation mappings", async () => {
    const dossier = await fetchLivePatientDossier("https://r4.smarthealthit.org", "smart-1032702");
    assert.equal(dossier.patientId, "smart-1032702");
    assert.equal(dossier.fullName, "Amy Shaw");
    assert.equal(dossier.vitals.bloodGlucoseMgDl, 420);
    assert.ok(dossier.conditions.some(c => c.display.includes("Type 2 diabetes")));
    assert.ok(dossier.medications.some(m => m.name.includes("Metformin")));
  });
});
