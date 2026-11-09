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
} from "./noctis-smart-fhir.ts";

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
});
