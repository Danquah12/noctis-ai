/**
 * Noctis Patient Export & Interoperability Engine (NPEI)
 * ============================================================================
 * Generates:
 *   1. Clean, single-page printable "Doctor Visit Brief" (HTML / Print-Optimized)
 *   2. Standards-compliant HL7 FHIR R4 (v4.0.1) Interoperability Bundle (.json)
 *      with LOINC, SNOMED CT, and ICD-10-CM clinical coding.
 * ============================================================================
 */

import { type PatientDiagnosticDossier } from "./noctis-patient-diagnosis.ts";

export interface DoctorVisitBriefExportOptions {
  dossier: PatientDiagnosticDossier;
  patientName?: string;
  patientAge?: number;
  patientSex?: string;
  encounterDate?: string;
}

/**
 * Builds an HL7 FHIR R4 Document/Collection Bundle from the clinical dossier.
 */
export function generateFhirR4Bundle(options: DoctorVisitBriefExportOptions) {
  const { dossier, patientName = "Anonymous Patient", patientAge = 58, patientSex = "unknown", encounterDate = new Date().toISOString() } = options;
  const encounterId = dossier.encounterId || "ENC-001";
  const bundleId = `bundle-${encounterId.toLowerCase()}`;
  const patientId = `patient-${Math.random().toString(36).substring(2, 8)}`;

  const entries: any[] = [
    // 1. Patient Resource
    {
      fullUrl: `urn:uuid:${patientId}`,
      resource: {
        resourceType: "Patient",
        id: patientId,
        active: true,
        name: [{ use: "official", text: patientName }],
        gender: patientSex.toLowerCase().includes("f") ? "female" : patientSex.toLowerCase().includes("m") ? "male" : "unknown",
      },
    },
  ];

  // 2. Vitals Observations
  const vitals = dossier.patientData?.vitals || {};
  if (vitals.systolicBp && vitals.diastolicBp) {
    entries.push({
      fullUrl: `urn:uuid:bp-${encounterId}`,
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: {
          coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel with all children optional" }],
          text: "Blood Pressure",
        },
        subject: { reference: `urn:uuid:${patientId}` },
        effectiveDateTime: encounterDate,
        component: [
          {
            code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
            valueQuantity: { value: vitals.systolicBp, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
          },
          {
            code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }] },
            valueQuantity: { value: vitals.diastolicBp, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
          },
        ],
      },
    });
  }

  if (vitals.heartRate) {
    entries.push({
      fullUrl: `urn:uuid:hr-${encounterId}`,
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
        subject: { reference: `urn:uuid:${patientId}` },
        effectiveDateTime: encounterDate,
        valueQuantity: { value: vitals.heartRate, unit: "beats/minute", system: "http://unitsofmeasure.org", code: "/min" },
      },
    });
  }

  if (vitals.temperatureC) {
    entries.push({
      fullUrl: `urn:uuid:temp-${encounterId}`,
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
        subject: { reference: `urn:uuid:${patientId}` },
        effectiveDateTime: encounterDate,
        valueQuantity: { value: vitals.temperatureC, unit: "Cel", system: "http://unitsofmeasure.org", code: "Cel" },
      },
    });
  }

  if (vitals.spo2) {
    entries.push({
      fullUrl: `urn:uuid:spo2-${encounterId}`,
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "2708-6", display: "Oxygen saturation in Arterial blood by Pulse oximetry" }] },
        subject: { reference: `urn:uuid:${patientId}` },
        effectiveDateTime: encounterDate,
        valueQuantity: { value: vitals.spo2, unit: "%", system: "http://unitsofmeasure.org", code: "%" },
      },
    });
  }

  // 3. Differential Conditions (FHIR Condition provisional)
  (dossier.differentials || []).forEach((diff, idx) => {
    const condId = `cond-${encounterId}-${idx}`;
    const name = diff.diseaseName || (diff as any).conditionName || "Suspected Condition";
    const icd = diff.icd10 || (diff as any).icd10Code || "R69";
    const snomed = diff.snomedCt || (diff as any).snomedCode || "404684003";
    const prob = diff.probabilityPct ?? (diff as any).probabilityScore ?? 50;
    const cat = diff.category || (diff as any).tier || "PRIMARY_HYPOTHESIS";

    entries.push({
      fullUrl: `urn:uuid:${condId}`,
      resource: {
        resourceType: "Condition",
        id: condId,
        clinicalStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }],
        },
        verificationStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "provisional", display: "Provisional" }],
        },
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis" }] }],
        code: {
          coding: [
            { system: "http://hl7.org/fhir/sid/icd-10-cm", code: icd, display: name },
            { system: "http://snomed.info/sct", code: snomed, display: name },
          ],
          text: name,
        },
        subject: { reference: `urn:uuid:${patientId}` },
        note: [{ text: `Noctis Bayesian Probability: ${prob}% (${cat}). Rationale: ${diff.clinicalRationale}` }],
      },
    });
  });

  return {
    resourceType: "Bundle",
    id: bundleId,
    type: "collection",
    timestamp: encounterDate,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-bundle"],
      source: "Noctis Health CDS Engine (FDA Jan 2026 Compliant)",
    },
    total: entries.length,
    entry: entries,
  };
}

/**
 * Builds a clean, single-page, print-styled HTML "Doctor Visit Brief".
 */
export function generatePrintableDoctorVisitBriefHtml(options: DoctorVisitBriefExportOptions): string {
  const { dossier, patientName = "Patient", patientAge = 58, patientSex = "Unspecified", encounterDate = new Date().toLocaleDateString() } = options;
  const encounterId = dossier.encounterId || "ENC-001";
  const vitals = dossier.patientData?.vitals || {};
  const bp = vitals.systolicBp ? `${vitals.systolicBp}/${vitals.diastolicBp} mmHg` : "Not measured";
  const hr = vitals.heartRate ? `${vitals.heartRate} bpm` : "Not measured";
  const temp = vitals.temperatureC ? `${vitals.temperatureC}°C` : "Not measured";
  const spo2 = vitals.spo2 ? `${vitals.spo2}%` : "Not measured";
  const rr = "Not measured";

  const diffList = (dossier.differentials || []).slice(0, 4).map((d) => {
    const name = d.diseaseName || (d as any).conditionName || "Suspected Condition";
    const icd = d.icd10 || (d as any).icd10Code || "R69";
    const prob = d.probabilityPct ?? (d as any).probabilityScore ?? 50;
    const cat = d.category || (d as any).tier || "PRIMARY_HYPOTHESIS";
    const tests = d.goldStandardDiagnosticTests?.join(", ") || (d as any).goldStandardTesting || "Standard diagnostic workup";
    const isPrimary = cat === "PRIMARY_HYPOTHESIS" || cat === "MUST_NOT_MISS_RULEOUT";
    return `
    <div style="margin-bottom: 8px; padding: 8px 12px; background: #f8fafc; border-left: 4px solid ${isPrimary ? "#ef4444" : "#3b82f6"}; border-radius: 4px;">
      <div style="display: flex; justify-content: space-between; font-weight: 600; color: #0f172a;">
        <span>${name} <span style="font-size: 11px; color: #64748b;">(ICD-10: ${icd})</span></span>
        <span style="color: ${isPrimary ? "#dc2626" : "#2563eb"};">${prob}% Match</span>
      </div>
      <div style="font-size: 12px; color: #475569; margin-top: 4px;"><strong>Recommended Test:</strong> ${tests}</div>
    </div>
  `;
  }).join("");

  const topQuestions = dossier.differentials?.[0]?.questionsForPhysician || [];
  const questionsList = topQuestions.slice(0, 5).map((q, idx) => `
    <li style="margin-bottom: 6px; color: #1e293b; font-size: 13px;"><strong>${idx + 1}.</strong> ${q}</li>
  `).join("");

  const medsList = (dossier.patientData?.currentMedications || []).length > 0
    ? dossier.patientData.currentMedications.map((m) => `<span style="display: inline-block; background: #e2e8f0; color: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 6px; margin-bottom: 4px;">${m}</span>`).join("")
    : '<span style="color: #64748b; font-size: 13px;">No regular medications reported</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Noctis Doctor Visit Brief — ${encounterId}</title>
  <style>
    @page { size: letter; margin: 0.6in; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; line-height: 1.45; background: #fff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #09090b; }
    .meta { font-size: 12px; color: #64748b; text-align: right; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-top: 14px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
    .vital-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px; text-align: center; }
    .vital-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .vital-value { font-size: 14px; font-weight: 700; color: #0f172a; }
    .alert-banner { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 8px 12px; border-radius: 4px; font-size: 12px; margin-bottom: 14px; }
    .disclaimer { font-size: 10px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">NOCTIS HEALTH — DOCTOR VISIT BRIEF</div>
      <div style="font-size: 13px; color: #334155; margin-top: 2px;">Patient Clinical Summary & Shared Decision Aid</div>
    </div>
    <div class="meta">
      <div><strong>Record ID:</strong> ${encounterId}</div>
      <div><strong>Date:</strong> ${encounterDate}</div>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px; background: #f1f5f9; padding: 8px 12px; border-radius: 4px;">
    <div><strong>Patient:</strong> ${patientName}</div>
    <div><strong>Age / Sex:</strong> ${patientAge}yo / ${patientSex}</div>
    <div><strong>Acuity Tier:</strong> <span style="font-weight: 700; color: ${dossier.triage?.isEmergency ? "#dc2626" : "#2563eb"};">${dossier.triage?.urgencyLabel || "ROUTINE"}</span></div>
  </div>

  ${dossier.triage?.isEmergency ? `
  <div class="alert-banner">
    <strong>EMERGENCY ESCALATION FLAGGED:</strong> ${dossier.triage.escalationBanner}
  </div>` : ""}

  <div class="section-title">Reported Symptoms & Clinical Chronology (OPQRST)</div>
  <div style="font-size: 13px; color: #1e293b; margin-bottom: 10px;">
    <strong>Chief Complaint:</strong> ${dossier.patientData?.chiefComplaint || "Unspecified"}<br>
    <strong>Onset & Quality:</strong> ${dossier.patientData?.onsetTiming || "Not specified"} · ${dossier.patientData?.painQuality || "Not specified"} (Severity: ${dossier.patientData?.painSeverity || "unrated"}/10)<br>
    <strong>Radiation & Associations:</strong> ${dossier.patientData?.painRadiation ? `Radiates to ${dossier.patientData.painRadiation}` : "No radiation"} · Associated: ${(dossier.patientData?.associatedSymptoms || []).join(", ") || "None reported"}
  </div>

  <div class="section-title">Patient Vitals at Encounter</div>
  <div class="grid">
    <div class="vital-box"><div class="vital-label">Blood Pressure</div><div class="vital-value">${bp}</div></div>
    <div class="vital-box"><div class="vital-label">Heart Rate</div><div class="vital-value">${hr}</div></div>
    <div class="vital-box"><div class="vital-label">Respiratory Rate</div><div class="vital-value">${rr}</div></div>
    <div class="vital-box"><div class="vital-label">Temperature</div><div class="vital-value">${temp}</div></div>
    <div class="vital-box"><div class="vital-label">SpO2</div><div class="vital-value">${spo2}</div></div>
  </div>

  <div class="section-title">Current Medications & Allergies</div>
  <div style="margin-bottom: 10px;">${medsList}</div>

  <div class="section-title">Suspected Diagnostic Considerations (Bayesian Differential)</div>
  ${diffList}

  <div class="section-title">Targeted Questions for the Doctor</div>
  <ol style="margin-top: 4px; padding-left: 20px; margin-bottom: 12px;">
    ${questionsList}
  </ol>

  <div class="no-print" style="text-align: center; margin-top: 15px; margin-bottom: 15px;">
    <button onclick="window.print()" style="background: #0f172a; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">🖨️ Print or Save as PDF</button>
  </div>

  <div class="disclaimer">
    FDA Jan 2026 Clinical Decision Support Notice: Prepared as a patient-physician communication aid. This document does not constitute a legal or definitive medical diagnosis. Official medical management requires evaluation by a licensed clinician.
  </div>
</body>
</html>`;
}
