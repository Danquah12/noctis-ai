import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateKdigoAki,
  extractLongitudinalAnalytes,
  buildLongitudinalDossier,
  formatLongitudinalReportMarkdown,
} from "./noctis-longitudinal-trends.ts";

import {
  evaluatePharmacogenomics,
  formatPharmacogenomicsMarkdown,
} from "./noctis-pharmacogenomics.ts";

import {
  generateFhirR4Bundle,
  generatePrintableDoctorVisitBriefHtml,
} from "./noctis-patient-export.ts";

import {
  sanitizeOcrMedicalText,
  parseOcrMedicalIntake,
} from "./noctis-ocr-intake.ts";

import { buildPatientDiagnosticReport } from "./noctis-patient-diagnosis.ts";

describe("Noctis Recommendation 2: Longitudinal Lab Tracking & Delta Velocity Engine", () => {
  it("evaluates KDIGO AKI Stage 1 for absolute rise >= 0.3 mg/dL within 48 hours", () => {
    const aki = evaluateKdigoAki(1.0, 1.35, 1);
    assert.equal(aki.isAkiPresent, true);
    assert.equal(aki.akiStage, "STAGE_1");
    assert.equal(aki.absoluteDeltaMgDl, 0.35);
  });

  it("evaluates KDIGO AKI Stage 2 for creatinine 2.0x to 2.9x baseline", () => {
    const aki = evaluateKdigoAki(1.0, 2.2, 5);
    assert.equal(aki.isAkiPresent, true);
    assert.equal(aki.akiStage, "STAGE_2");
    assert.equal(aki.ratioToBaseline, 2.2);
  });

  it("evaluates KDIGO AKI Stage 3 for creatinine >= 3.0x baseline or >= 4.0 mg/dL with acute rise", () => {
    const aki = evaluateKdigoAki(1.1, 4.2, 3);
    assert.equal(aki.isAkiPresent, true);
    assert.equal(aki.akiStage, "STAGE_3");
  });

  it("extracts multi-point longitudinal trajectories from free clinical text", () => {
    const reportText = `
PATIENT PROGRESSION NOTES:
Creatinine: baseline 1.1 mg/dL -> current 2.4 mg/dL
Hemoglobin: baseline 13.5 g/dL -> current 9.8 g/dL
Potassium: baseline 4.2 mmol/L -> current 6.4 mmol/L
Platelets: baseline 240 x10^3/uL -> current 85 x10^3/uL
    `;
    const dossier = buildLongitudinalDossier(reportText);
    assert.equal(dossier.hasLongitudinalData, true);
    assert.ok(dossier.analytesEvaluated.length >= 4);

    const scr = dossier.analytesEvaluated.find((a) => a.analyte === "Serum Creatinine");
    assert.ok(scr);
    assert.equal(scr.baselineValue, 1.1);
    assert.equal(scr.currentValue, 2.4);
    assert.equal(dossier.kdigoAki?.akiStage, "STAGE_2");

    const hgb = dossier.analytesEvaluated.find((a) => a.analyte === "Hemoglobin");
    assert.ok(hgb);
    assert.equal(hgb.clinicalSignificance, "CRITICAL_HAZARD"); // acute drop > 2.0 g/dL

    const md = formatLongitudinalReportMarkdown(dossier);
    assert.match(md, /KDIGO ACUTE KIDNEY INJURY/i);
    assert.match(md, /Multi-Point Analyte Trajectory Ledger/i);
  });
});

describe("Noctis Recommendation 4: Oncology & Cardio Pharmacogenomic Safety Layer", () => {
  it("flags DPYD enzyme deficiency warnings for 5-FU and FOLFOX regimens", () => {
    const res = evaluatePharmacogenomics("Patient with colon cancer scheduled to start adjuvant FOLFOX regimen");
    assert.ok(res.totalRisks >= 1);
    const dpyd = res.detectedRisks.find((r) => r.ruleId === "PGX-DPYD-001");
    assert.ok(dpyd);
    assert.match(dpyd.cpicGuidelineRecommendation, /CPIC Guidelines recommend pre-treatment DPYD/i);
  });

  it("flags CYP2D6 inhibitor interaction for Tamoxifen co-prescribed with Paroxetine", () => {
    const res = evaluatePharmacogenomics("Prescribed Tamoxifen for ER+ breast cancer along with Paroxetine for hot flashes");
    assert.ok(res.totalRisks >= 1);
    const cyp = res.detectedRisks.find((r) => r.ruleId === "PGX-CYP2D6-TAM-002");
    assert.ok(cyp);
    assert.match(cyp.mechanismSummary, /endoxifen/i);
    assert.ok(cyp.alternativeOptions.some((alt) => alt.includes("Venlafaxine")));
  });

  it("flags Cardio-Oncology baseline LVEF requirement for HER2-targeted Trastuzumab", () => {
    const res = evaluatePharmacogenomics("Starting Trastuzumab (Herceptin) for HER2 positive breast cancer");
    const her2 = res.detectedRisks.find((r) => r.ruleId === "PGX-CARDIO-HER2-003");
    assert.ok(her2);
    assert.equal(her2.preTreatmentTestingRequired, true);
    assert.match(her2.cpicGuidelineRecommendation, /baseline echocardiogram/i);

    const md = formatPharmacogenomicsMarkdown(res);
    assert.match(md, /Pharmacogenomic & Regimen Safety Screening/i);
  });
});

describe("Noctis Recommendation 3: HL7 FHIR R4 & Printable Doctor Visit Brief", () => {
  const dummyDossier = buildPatientDiagnosticReport({
    chiefComplaint: "Crushing chest pain radiating to left jaw",
    ageYears: 58,
    biologicalSex: "male",
    painQuality: "crushing",
    painSeverity: 9,
    painRadiation: "left jaw",
    onsetTiming: "30 minutes ago",
    associatedSymptoms: ["diaphoresis (profuse sweating)"],
    pastMedicalHistory: ["Hypertension (High Blood Pressure)"],
    vitals: { systolicBp: 154, diastolicBp: 96, heartRate: 98, spo2: 96, temperatureC: 37.0 },
    explicitMissingFields: [],
  });

  it("generates a valid HL7 FHIR R4 Bundle with Patient, Observation, and Condition resources", () => {
    const bundle = generateFhirR4Bundle({
      dossier: dummyDossier,
      patientName: "John Doe",
      patientAge: 58,
      patientSex: "male",
    });

    assert.equal(bundle.resourceType, "Bundle");
    assert.equal(bundle.type, "collection");
    assert.ok(bundle.entry.length >= 4);

    const patientRes = bundle.entry.find((e: any) => e.resource.resourceType === "Patient");
    assert.ok(patientRes);
    assert.equal(patientRes.resource.gender, "male");

    const bpObs = bundle.entry.find((e: any) => e.resource.code?.coding?.[0]?.code === "85354-9");
    assert.ok(bpObs);
    assert.equal(bpObs.resource.component[0].valueQuantity.value, 154);

    const condition = bundle.entry.find((e: any) => e.resource.resourceType === "Condition");
    assert.ok(condition);
    assert.equal(condition.resource.verificationStatus.coding[0].code, "provisional");
  });

  it("generates a complete printable HTML Doctor Visit Brief with print CSS styles", () => {
    const html = generatePrintableDoctorVisitBriefHtml({
      dossier: dummyDossier,
      patientName: "John Doe",
      patientAge: 58,
      patientSex: "male",
    });

    assert.match(html, /NOCTIS HEALTH — DOCTOR VISIT BRIEF/i);
    assert.match(html, /Crushing chest pain/i);
    assert.match(html, /154\/96 mmHg/i);
    assert.match(html, /@media print/i);
    assert.match(html, /Targeted Questions for the Doctor/i);
  });
});

describe("Noctis Recommendation 5: Optical & Multi-Modal Document Intake Engine", () => {
  it("sanitizes common OCR artifacts in printed laboratory text", () => {
    const rawOcr = "WBC: 14.O x1O^3/uL, Creatinine: O.7 mg/dI, K+: 4.2 mmol/l, BP: 140/90";
    const clean = sanitizeOcrMedicalText(rawOcr);
    assert.match(clean, /14\.0/);
    assert.match(clean, /0\.7 mg\/dL/);
    assert.match(clean, /Potassium/);
    assert.match(clean, /140\/90 mmHg/);
  });

  it("extracts structured vitals, labs, and document classification from scanned slip text", () => {
    const slipText = `
METROPOLITAN HOSPITAL DISCHARGE & LAB SLIP
BP: 138/88 mmHg  HR: 88 bpm  Temp: 99.2 F  SpO2: 97%
METABOLIC PANEL:
Creatinine: 1.8 mg/dL
Potassium: 5.6 mmol/L
Fasting Glucose: 142 mg/dL
MEDICATIONS:
Lisinopril 20mg daily, Metformin 500mg BID
CHIEF COMPLAINT:
Follow-up for worsening shortness of breath and pedal edema
    `;
    const parsed = parseOcrMedicalIntake(slipText);
    assert.equal(parsed.documentType, "LAB_SLIP");
    assert.equal(parsed.detectedVitals.bloodPressure, "138/88");
    assert.equal(parsed.detectedVitals.heartRate, 88);
    assert.ok(parsed.detectedVitals.temperatureCelsius);
    assert.equal(parsed.detectedLabs.length, 3);
    assert.ok(parsed.detectedMedications.includes("Lisinopril"));
    assert.ok(parsed.detectedMedications.includes("Metformin"));
    assert.ok(parsed.confidenceScore >= 80);
  });
});
