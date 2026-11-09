// ============================================================================
// NOCTIS BI-DIRECTIONAL EHR BRIDGE (SMART-ON-FHIR / EPIC & CERNER)
// Standards: HL7 FHIR R4 (v4.0.1), US Core Implementation Guide v9.0.0,
//            SMART App Launch Framework v2.0.0
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

export interface SmartLaunchContext {
  iss: string; // EHR FHIR base URL (e.g. https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4)
  launch: string; // Launch token from EHR
  patientId: string;
  encounterId: string;
  userRole: "PHYSICIAN" | "NURSE" | "CLINICAL_SPECIALIST";
  ehrVendor: "EPIC_SYSTEMS" | "ORACLE_CERNER" | "ALLSCRIPTS" | "ATHENAHEALTH";
}

export interface FhirIngestedPatient {
  id: string;
  mrn: string;
  name: string;
  gender: "male" | "female" | "other" | "unknown";
  birthDate: string;
  ageYears: number;
  activeConditions: Array<{ code: string; display: string }>;
  vitals: {
    bloodPressure?: string;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    spo2?: number;
    bloodGlucose?: number;
  };
  activeMedications: Array<{ code: string; name: string }>;
}

export interface FhirWriteBackResult {
  status: "SUCCESS" | "REJECTED_AUTHENTICATION" | "REJECTED_VALIDATION";
  statusCode: number;
  ehrVendor: string;
  targetEndpoint: string;
  createdResourceId: string;
  loincCode: string;
  documentType: string;
  transmissionHash: string;
  timestamp: string;
}

/**
 * Parses an incoming FHIR R4 Bundle from Epic or Cerner into Noctis Patient entities
 */
export function ingestFhirR4Bundle(bundle: any): FhirIngestedPatient {
  const entries = bundle?.entry || [];
  let patient: any = null;
  const conditions: Array<{ code: string; display: string }> = [];
  const medications: Array<{ code: string; name: string }> = [];
  const vitals: any = {};

  for (const item of entries) {
    const res = item.resource;
    if (!res) continue;

    if (res.resourceType === "Patient") {
      patient = res;
    } else if (res.resourceType === "Condition") {
      const code = res.code?.coding?.[0]?.code || "UNKNOWN";
      const display = res.code?.coding?.[0]?.display || res.code?.text || "Documented condition";
      conditions.push({ code, display });
    } else if (res.resourceType === "MedicationRequest") {
      const code = res.medicationCodeableConcept?.coding?.[0]?.code || "RxCUI-UNKNOWN";
      const name = res.medicationCodeableConcept?.coding?.[0]?.display || res.medicationCodeableConcept?.text || "Prescribed medication";
      medications.push({ code, name });
    } else if (res.resourceType === "Observation") {
      const code = res.code?.coding?.[0]?.code;
      const val = res.valueQuantity?.value;
      if (code === "8867-4") vitals.heartRate = val; // Heart rate
      else if (code === "9279-1") vitals.respiratoryRate = val; // Resp rate
      else if (code === "8310-5") vitals.temperature = val; // Temp
      else if (code === "2708-6" || code === "59408-5") vitals.spo2 = val; // SpO2
      else if (code === "2339-0") vitals.bloodGlucose = val; // Blood glucose
    }
  }

  const birthDate = patient?.birthDate || "1960-01-01";
  const birthYear = parseInt(birthDate.slice(0, 4), 10) || 1960;
  const currentYear = new Date().getFullYear();
  const age = Math.max(1, currentYear - birthYear);

  return {
    id: patient?.id || "PAT-UNKNOWN",
    mrn: patient?.identifier?.[0]?.value || "MRN-000000",
    name: `${patient?.name?.[0]?.given?.join(" ") || ""} ${patient?.name?.[0]?.family || "Patient"}`.trim(),
    gender: patient?.gender || "unknown",
    birthDate,
    ageYears: age,
    activeConditions: conditions,
    vitals,
    activeMedications: medications,
  };
}

/**
 * Builds a valid HL7 FHIR R4 DocumentReference resource containing the signed CDS Consultation Dossier
 */
export function buildFhirDocumentReference(
  patientId: string,
  encounterId: string,
  dossierMarkdown: string,
  consultantName: string = "Noctis Sovereign CDS Assistant",
  authorSpecialty: string = "Specialist Consultation"
): any {
  const base64Content = Buffer.from(dossierMarkdown).toString("base64");
  const now = new Date().toISOString();

  return {
    resourceType: "DocumentReference",
    status: "current",
    docStatus: "final",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11488-4",
          display: "Consultation note",
        },
      ],
      text: `${authorSpecialty} Gold-Standard Clinical Consultation Dossier`,
    },
    category: [
      {
        coding: [
          {
            system: "http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category",
            code: "clinical-note",
            display: "Clinical Note",
          },
        ],
      },
    ],
    subject: {
      reference: `Patient/${patientId}`,
    },
    date: now,
    author: [
      {
        display: consultantName,
      },
    ],
    context: {
      encounter: [
        {
          reference: `Encounter/${encounterId}`,
        },
      ],
    },
    content: [
      {
        attachment: {
          contentType: "text/markdown; charset=utf-8",
          language: "en-US",
          data: base64Content,
          title: "Gold-Standard Consultation Dossier (21 U.S.C. § 360j(o)(1)(E))",
          creation: now,
        },
      },
    ],
  };
}

/**
 * Simulates Bi-Directional REST Write-Back to Epic or Cerner FHIR Server
 */
export function executeFhirWriteBack(
  context: SmartLaunchContext,
  dossierMarkdown: string
): FhirWriteBackResult {
  const docRef = buildFhirDocumentReference(context.patientId, context.encounterId, dossierMarkdown);
  const resourceString = JSON.stringify(docRef);
  const transmissionHash = Buffer.from(resourceString).toString("hex").slice(0, 32);

  return {
    status: "SUCCESS",
    statusCode: 201,
    ehrVendor: context.ehrVendor,
    targetEndpoint: `${context.iss}/DocumentReference`,
    createdResourceId: `DOC-${context.ehrVendor.slice(0, 4)}-${Math.floor(100000 + Math.random() * 900000)}`,
    loincCode: "11488-4",
    documentType: "Consultation note",
    transmissionHash,
    timestamp: new Date().toISOString(),
  };
}
