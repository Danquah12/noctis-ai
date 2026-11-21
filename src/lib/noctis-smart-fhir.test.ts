/**
 * NOCTIS HEALTH 500 SMART ON FHIR EHR CONNECTOR TESTS
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  SMART_ENDPOINTS,
  CURATED_SANDBOX_PATIENTS,
  buildSmartAuthorizeUrl,
  mapFhirPatientToClinicalCase,
  generateFhirDocumentReferencePayload,
  transformFhirResourcesToNoctisPatient,
  convertEhrPatientRecordToPrompt,
} from "./noctis-smart-fhir.ts";
import { buildClinicalScratchpad } from "./noctis-clinical-scratchpad.ts";

describe("Noctis SMART on FHIR EHR Connector", () => {
  it("provides configured endpoints for Epic, Cerner, and Custom FHIR servers", () => {
    assert.ok(SMART_ENDPOINTS.epic);
    assert.strictEqual(SMART_ENDPOINTS.epic.vendor, "Epic Systems");
    assert.ok(SMART_ENDPOINTS.epic.fhirBaseUrl.includes("epic.com"));

    assert.ok(SMART_ENDPOINTS.cerner);
    assert.strictEqual(SMART_ENDPOINTS.cerner.vendor, "Oracle Cerner");
    assert.ok(SMART_ENDPOINTS.cerner.fhirBaseUrl.includes("cerner.com"));
  });

  it("builds a compliant SMART v2.0 OAuth 2.0 PKCE authorization URL", () => {
    const authUrl = buildSmartAuthorizeUrl({
      endpoint: SMART_ENDPOINTS.epic,
      redirectUri: "https://www.dstrike.app/noctis/callback",
      state: "xyz987state",
      codeChallenge: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
      launchContextId: "epic-launch-token-1234",
    });

    assert.ok(authUrl.startsWith("https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize"));
    assert.ok(authUrl.includes("response_type=code"));
    assert.ok(authUrl.includes("code_challenge_method=S256"));
    assert.ok(authUrl.includes("code_challenge=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"));
    assert.ok(authUrl.includes("launch=epic-launch-token-1234"));
  });

  it("maps FHIR sandbox patients into complete Noctis clinical cases with vitals", () => {
    const strokePatient = CURATED_SANDBOX_PATIENTS[0];
    const caseSummary = mapFhirPatientToClinicalCase(strokePatient);

    assert.strictEqual(caseSummary.specialty, "NEUROLOGY");
    assert.strictEqual(caseSummary.ageYears, 68);
    assert.strictEqual(caseSummary.biologicalSex, "FEMALE");
    assert.strictEqual(caseSummary.vitals.bloodPressure, "182/104");
    assert.strictEqual(caseSummary.vitals.heartRateBpm, 88);
    assert.strictEqual(caseSummary.vitals.bloodGlucoseMgDl, 118);
    assert.ok(caseSummary.caseId.includes(strokePatient.mrn));
  });

  it("generates an HL7 FHIR R4 DocumentReference resource for bi-directional EHR write-back", () => {
    const dkaPatient = CURATED_SANDBOX_PATIENTS[1];
    const dummyNote = "# Noctis Clinical Consultation Note\nPatient presents with severe DKA.";
    const docRef = generateFhirDocumentReferencePayload({
      patient: dkaPatient,
      consultationNoteMarkdown: dummyNote,
      practitionerName: "Dr. Kwesi Asiedu, MD",
    });

    assert.strictEqual(docRef.resourceType, "DocumentReference");
    assert.strictEqual(docRef.status, "current");
    assert.strictEqual(docRef.docStatus, "final");
    assert.strictEqual(docRef.type.coding[0].code, "11488-4"); // LOINC Consultation Note
    assert.strictEqual(docRef.subject.reference, `Patient/${dkaPatient.id}`);
    assert.strictEqual(docRef.author[0].display, "Dr. Kwesi Asiedu, MD");
    assert.strictEqual(docRef.content[0].attachment.contentType, "text/markdown; charset=utf-8");
    assert.ok(docRef.content[0].attachment.data.length > 10); // Base64 encoded note
  });

  it("ingests acute ICU LOINC observations, maps to prompt, and preserves invariants in scratchpad", () => {
    const patientResource = {
      resourceType: "Patient",
      id: "pat-epic-78m",
      name: [{ given: ["Arthur"], family: "Pendelton" }],
      gender: "male",
      birthDate: "1948-03-15",
    };

    const observations = [
      {
        resourceType: "Observation",
        code: { coding: [{ code: "85354-9", display: "Blood pressure panel" }] },
        component: [
          { code: { coding: [{ code: "8480-6", display: "Systolic blood pressure" }] }, valueQuantity: { value: 68 } },
          { code: { coding: [{ code: "8462-4", display: "Diastolic blood pressure" }] }, valueQuantity: { value: 38 } },
        ],
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "8867-4", display: "Heart rate" }] },
        valueQuantity: { value: 29 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "9279-1", display: "Respiratory rate" }] },
        valueQuantity: { value: 28 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "8310-5", display: "Body temperature" }] },
        valueQuantity: { value: 38.6, unit: "Cel" },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2708-6", display: "Oxygen saturation" }] },
        valueQuantity: { value: 91 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2823-3", display: "Potassium in Serum" }] },
        valueQuantity: { value: 7.3 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2951-2", display: "Sodium in Serum" }] },
        valueQuantity: { value: 129 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2160-0", display: "Creatinine in Serum" }] },
        valueQuantity: { value: 4.8 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2160-0", display: "Creatinine in Serum" }] },
        note: [{ text: "baseline creatinine documented" }],
        valueQuantity: { value: 2.3 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "1963-8", display: "Bicarbonate in Serum" }] },
        valueQuantity: { value: 12 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2744-1", display: "pH of Arterial blood" }] },
        valueQuantity: { value: 7.12 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2019-8", display: "Carbon dioxide in Arterial blood" }] },
        valueQuantity: { value: 29 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2524-7", display: "Lactate in Blood" }] },
        valueQuantity: { value: 6.8 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "3564-2", display: "Digoxin in Serum" }] },
        valueQuantity: { value: 3.6 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "2345-7", display: "Glucose in Serum" }] },
        valueQuantity: { value: 168 },
      },
      {
        resourceType: "Observation",
        code: { coding: [{ code: "9187-6", display: "Urine output volume" }] },
        valueQuantity: { value: 100 },
      },
    ];

    const conditions = [
      { code: { text: "CKD stage 4" } },
      { code: { text: "heart failure with reduced ejection fraction (EF 30%)" } },
      { code: { text: "atrial fibrillation" } },
      { code: { text: "type 2 diabetes" } },
    ];

    const medications = [
      { medicationCodeableConcept: { text: "Digoxin 0.125 mg daily" } },
      { medicationCodeableConcept: { text: "Carvedilol 25 mg twice daily" } },
      { medicationCodeableConcept: { text: "Spironolactone 25 mg daily" } },
      { medicationCodeableConcept: { text: "Lisinopril 20 mg daily" } },
      { medicationCodeableConcept: { text: "Metformin 1,000 mg twice daily" } },
      { medicationCodeableConcept: { text: "Trimethoprim-sulfamethoxazole 160/800 mg twice daily" } },
    ];

    const ingested = transformFhirResourcesToNoctisPatient(
      patientResource,
      observations,
      conditions,
      medications
    );

    assert.strictEqual(ingested.name, "Arthur Pendelton");
    assert.strictEqual(ingested.gender, "male");
    assert.strictEqual(ingested.vitals.sbp, 68);
    assert.strictEqual(ingested.vitals.dbp, 38);
    assert.strictEqual(ingested.vitals.hr, 29);
    assert.strictEqual(ingested.labs.potassium, 7.3);
    assert.strictEqual(ingested.labs.creatinine, 4.8);
    assert.strictEqual(ingested.baselineCreatinine, 2.3);
    assert.strictEqual(ingested.labs.lactate, 6.8);
    assert.strictEqual(ingested.labs.digoxin, 3.6);
    assert.strictEqual(ingested.activeConditions.length, 4);
    assert.strictEqual(ingested.medications.length, 6);

    const prompt = convertEhrPatientRecordToPrompt(ingested);
    assert.match(prompt, /Blood pressure\t68\/38 mmHg/);
    assert.match(prompt, /Heart rate\t29 bpm/);
    assert.match(prompt, /Potassium\t7\.3 mmol\/L/);

    const scratchpad = buildClinicalScratchpad(prompt);
    assert.strictEqual(scratchpad.derivedCalculations.meanArterialPressureMmHg, 48);
    assert.strictEqual(scratchpad.derivedCalculations.kdigoAki.crFoldRatio, 2.09);
    assert.strictEqual(scratchpad.derivedCalculations.kdigoAki.establishedStage, 2);
    assert.strictEqual(scratchpad.sentinels.isChlorideMissing, true);
    assert.strictEqual(scratchpad.sentinels.isWeightMissing, true);
  });
});
