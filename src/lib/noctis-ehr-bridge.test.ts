import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  ingestFhirR4Bundle,
  buildFhirDocumentReference,
  executeFhirWriteBack,
  type SmartLaunchContext,
} from "./noctis-ehr-bridge.ts";

describe("Noctis Bi-Directional EHR Bridge (Frontier 3)", () => {
  const mockFhirBundle = {
    resourceType: "Bundle",
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: "PAT-EPIC-90210",
          identifier: [{ value: "MRN-883921" }],
          name: [{ given: ["Eleanor"], family: "Vance" }],
          gender: "female",
          birthDate: "1958-04-12",
        },
      },
      {
        resource: {
          resourceType: "Condition",
          code: {
            coding: [{ code: "I63.9", display: "Cerebral infarction, unspecified" }],
          },
        },
      },
      {
        resource: {
          resourceType: "MedicationRequest",
          medicationCodeableConcept: {
            coding: [{ code: "855332", display: "Aspirin 81 MG Oral Tablet" }],
          },
        },
      },
      {
        resource: {
          resourceType: "Observation",
          code: { coding: [{ code: "8867-4" }] },
          valueQuantity: { value: 88, unit: "/min" },
        },
      },
    ],
  };

  test("ingests raw FHIR R4 bundle into structured Noctis patient entities", () => {
    const patient = ingestFhirR4Bundle(mockFhirBundle);
    assert.strictEqual(patient.id, "PAT-EPIC-90210");
    assert.strictEqual(patient.mrn, "MRN-883921");
    assert.strictEqual(patient.name, "Eleanor Vance");
    assert.strictEqual(patient.gender, "female");
    assert.strictEqual(patient.activeConditions.length, 1);
    assert.strictEqual(patient.activeConditions[0].code, "I63.9");
    assert.strictEqual(patient.vitals.heartRate, 88);
    assert.strictEqual(patient.activeMedications.length, 1);
  });

  test("builds compliant HL7 FHIR R4 DocumentReference with LOINC 11488-4", () => {
    const docRef = buildFhirDocumentReference(
      "PAT-EPIC-90210",
      "ENC-88321",
      "# Gold-Standard Consultation Dossier\n\nPatient is 68yo female presenting with acute ischemic stroke."
    );

    assert.strictEqual(docRef.resourceType, "DocumentReference");
    assert.strictEqual(docRef.status, "current");
    assert.strictEqual(docRef.docStatus, "final");
    assert.strictEqual(docRef.type.coding[0].code, "11488-4");
    assert.strictEqual(docRef.subject.reference, "Patient/PAT-EPIC-90210");
    assert.ok(docRef.content[0].attachment.data.length > 20);
  });

  test("executes simulated bi-directional write-back to Epic Systems returning HTTP 201 Created", () => {
    const context: SmartLaunchContext = {
      iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
      launch: "launch_token_77a9b",
      patientId: "PAT-EPIC-90210",
      encounterId: "ENC-88321",
      userRole: "PHYSICIAN",
      ehrVendor: "EPIC_SYSTEMS",
    };

    const result = executeFhirWriteBack(context, "# Clinical Dossier Content");
    assert.strictEqual(result.status, "SUCCESS");
    assert.strictEqual(result.statusCode, 201);
    assert.strictEqual(result.ehrVendor, "EPIC_SYSTEMS");
    assert.ok(result.createdResourceId.startsWith("DOC-EPIC-"));
    assert.strictEqual(result.loincCode, "11488-4");
  });
});
