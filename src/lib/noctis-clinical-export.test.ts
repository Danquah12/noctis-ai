/**
 * NOCTIS HEALTH 500 CLINICAL EXPORT TEST SUITE
 * Spec: NH500-EHR-EXPORT-002
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  exportReferenceTableCsv,
  exportFhirR4DocumentBundle,
  generatePrintableDossierHtml,
} from "./noctis-clinical-export.ts";
import { FLAGSHIP_BENCHMARK_CASES } from "./noctis-health-500-chat.ts";

describe("Noctis Health 500 Clinical Export Engine", () => {
  const dkaCase = FLAGSHIP_BENCHMARK_CASES["ENDOCRINOLOGY"];
  const strokeCase = FLAGSHIP_BENCHMARK_CASES["NEUROLOGY"];

  it("generates a compliant 3-column reference table CSV matching Image 1 specifications", () => {
    const csv = exportReferenceTableCsv(dkaCase);
    assert.ok(csv.includes('"Patient Parameter","Documented Clinical Value","Physiological Significance & Localization"'));
    assert.ok(csv.includes('"Patient Profile"'));
    assert.ok(csv.includes("24-year-old female"));
    assert.ok(csv.includes('"Chief Complaint"'));
    assert.ok(csv.includes("Vomiting, diffuse abdominal pain, and rapid deep breathing"));
    assert.ok(csv.includes('"Bedside Vitals"'));
    assert.ok(csv.includes("540 mg/dL"));
    assert.ok(csv.includes('"Associated Symptoms"'));
    assert.ok(csv.includes("Kussmaul breathing"));
    assert.ok(csv.includes('"Mandatory Safety Contraindications"'));
    assert.ok(csv.includes("3.3 mEq/L"));
  });

  it("generates a compliant HL7 FHIR R4 Document Bundle with Composition, Patient, Observations, and CarePlan", () => {
    const bundle = exportFhirR4DocumentBundle(strokeCase);

    assert.equal(bundle.resourceType, "Bundle");
    assert.equal(bundle.type, "document");
    assert.ok(bundle.meta?.profile?.includes("http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentbundle"));
    assert.ok(bundle.entry.length >= 5);

    // Composition check
    const comp = bundle.entry[0].resource;
    assert.equal(comp.resourceType, "Composition");
    assert.equal(comp.status, "final");
    assert.ok(comp.title.includes("Noctis Health 500 Dossier: NEUROLOGY"));

    // Patient check
    const patient = bundle.entry.find((e: any) => e.resource.resourceType === "Patient");
    assert.ok(patient);
    assert.equal(patient.resource.gender, "female");

    // Observation check (Vitals)
    const observations = bundle.entry.filter((e: any) => e.resource.resourceType === "Observation");
    assert.ok(observations.length >= 3);
    const hrObs = observations.find((o: any) => o.resource.code?.coding?.[0]?.code === "8867-4");
    assert.ok(hrObs);
    assert.equal(hrObs.resource.valueQuantity.value, 88);

    // Condition check (Primary ICD-10)
    const condition = bundle.entry.find((e: any) => e.resource.resourceType === "Condition");
    assert.ok(condition);
    assert.equal(condition.resource.code?.coding?.[0]?.code, "I63.9");

    // CarePlan check
    const carePlan = bundle.entry.find((e: any) => e.resource.resourceType === "CarePlan");
    assert.ok(carePlan);
    assert.ok(carePlan.resource.activity.length >= 2);
  });

  it("generates a publication-grade printable HTML dossier with statutory classification and warning boxes", () => {
    const html = generatePrintableDossierHtml(dkaCase);

    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("NOCTIS HEALTH 500 CLINICAL DECISION SUPPORT"));
    assert.ok(html.includes("NH-EM-003"));
    assert.ok(html.includes("21 U.S.C. § 360j(o)(1)(E)"));
    assert.ok(html.includes("MANDATORY PATIENT SAFETY INVARIANTS"));
    assert.ok(html.includes("3.3 mEq/L"));
    assert.ok(html.includes("Kussmaul breathing"));
    assert.ok(html.includes("SHA-256 Provenance Sealed"));
  });
});
