import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyMedicalDocumentType,
  extractLaboratoryValues,
  interpretPathologyRecord,
  interpretRadiologyRecord,
  interpretPhysicianNote,
  buildMedicalRecordInterpretation,
  formatMedicalRecordInterpretationMarkdown,
  handleNaturalMedicalRecordInterpretationQuery,
} from "./noctis-medical-record-interpreter.ts";
import {
  classifyUniversalDocument,
  buildUniversalDocumentInterpretation,
  formatUniversalDocumentInterpretationMarkdown,
  handleNaturalAttachmentIntelligenceQuery,
} from "./noctis-document-intelligence.ts";

describe("Noctis Medical Record, Lab & Doctor Results Interpreter (NMRI)", () => {
  it("classifies laboratory reports and extracts analytes with reference ranges and panic alerts", () => {
    const rawReport = `
LABORATORY REPORT - METABOLIC & HEMATOLOGY PANEL
Patient: 54yo Male · Collection: 10/24/2026
WBC: 14.5 x10^3/uL
Hemoglobin: 9.8 g/dL
Platelets: 95 x10^3/uL
Sodium: 138 mmol/L
Potassium: 6.4 mmol/L
Creatinine: 2.1 mg/dL
Fasting Glucose: 145 mg/dL
    `;

    assert.equal(classifyMedicalDocumentType(rawReport), "LABORATORY_REPORT");

    const labs = extractLaboratoryValues(rawReport);
    assert.ok(labs.length >= 6);

    const wbc = labs.find((l) => l.analyteName.includes("White Blood Cell"));
    assert.ok(wbc);
    assert.equal(wbc.status, "HIGH");

    const hgb = labs.find((l) => l.analyteName.includes("Hemoglobin"));
    assert.ok(hgb);
    assert.equal(hgb.status, "LOW");

    const k = labs.find((l) => l.analyteName.includes("Potassium"));
    assert.ok(k);
    assert.equal(k.status, "CRITICAL_HIGH");
    assert.equal(k.isPanicValue, true);

    const scr = labs.find((l) => l.analyteName.includes("Creatinine"));
    assert.ok(scr);
    assert.equal(scr.status, "HIGH");

    const dossier = buildMedicalRecordInterpretation(rawReport);
    assert.ok(dossier.criticalAlerts.some((a) => a.includes("Potassium")));
    assert.ok(dossier.questionsForDoctor.length > 0);
  });

  it("interprets surgical pathology reports with tumor grade, margins, and receptor biomarkers", () => {
    const pathologyReport = `
SURGICAL PATHOLOGY REPORT
Specimen: Right breast core needle biopsy
Clinical History: 2.3 cm palpable mass
FINAL DIAGNOSIS:
Invasive ductal carcinoma, Nottingham histologic grade 2.
Margins: Clear, negative for tumor cells.
Immunohistochemistry:
ER: positive (90%)
PR: positive (80%)
HER2: negative (score 1+)
Ki-67: 18%
    `;

    assert.equal(classifyMedicalDocumentType(pathologyReport), "PATHOLOGY_BIOPSY_REPORT");

    const path = interpretPathologyRecord(pathologyReport);
    assert.equal(path.malignancyStatus, "MALIGNANT");
    assert.equal(path.marginStatus, "CLEAN_NEGATIVE");
    assert.equal(path.tumorGrade, "2");
    assert.ok(path.biomarkersAndIhc.some((b) => b.marker.includes("ER") && b.result === "positive"));
    assert.ok(path.biomarkersAndIhc.some((b) => b.marker.includes("HER2") && b.result === "negative"));
    assert.match(path.plainLanguageSummary, /malignant/i);
  });

  it("interprets radiology reports and translates technical impressions into plain language", () => {
    const ctReport = `
COMPUTED TOMOGRAPHY (CT) OF THE CHEST WITH IV CONTRAST
Indication: Persistent cough and shortness of breath.
Findings: Heart size is normal. No pericardial effusion. Lungs demonstrate a 4 mm solid nodule in the right middle lobe. No consolidation or pneumothorax. No acute pulmonary embolism.
IMPRESSION:
1. Subcentimeter 4 mm non-calcified pulmonary nodule in the right middle lobe. Fleischner society criteria recommends follow-up low-dose CT in 12 months.
2. No acute cardiopulmonary process or consolidation.
    `;

    assert.equal(classifyMedicalDocumentType(ctReport), "RADIOLOGY_IMAGING_REPORT");

    const rad = interpretRadiologyRecord(ctReport);
    assert.match(rad.imagingModality, /CT|Computed Tomography/i);
    assert.equal(rad.anatomicalRegion, "CHEST");
    assert.ok(rad.keyFindings.length > 0);
    assert.match(rad.plainLanguageImpression, /radiologist/i);
  });

  it("decodes physician clinical progress notes and explains prognosis terms in plain English", () => {
    const docNote = `
PHYSICIAN CLINIC PROGRESS NOTE
Chief Complaint: Follow-up of congestive heart failure and chronic kidney disease
Assessment:
1. Acute decompensated heart failure with reduced ejection fraction (HFrEF 25%), volume overloaded.
2. Chronic kidney disease stage 3b.
Prognosis: Prognosis is guarded given repeat hospitalizations and low ejection fraction.
Plan:
1. Increase oral furosemide to 80 mg daily.
2. Recheck BMP and electrolytes in 1 week.
3. Cardiology referral for CRT-D evaluation.
    `;

    const note = interpretPhysicianNote(docNote);
    assert.equal(note.prognosisType, "GUARDED");
    assert.match(note.plainLanguagePrognosis, /guarded.*uncertain/i);
    assert.ok(note.documentedAssessment.length >= 2);
    assert.ok(note.treatmentPlanItems.length >= 2);

    const dossier = buildMedicalRecordInterpretation(docNote);
    const md = formatMedicalRecordInterpretationMarkdown(dossier);
    assert.match(md, /Physician Assessment & Prognosis Decoded/);
    assert.match(md, /Guarded \/ Uncertain/);
    assert.match(md, /Questions to Ask Your Doctor/);
  });
});

describe("Noctis Universal Attachment & Document Intelligence Engine (UDIE)", () => {
  it("classifies and interprets uploaded financial statements with revenue and working capital anchors", () => {
    const fileContent = `--- q3_financial_results.pdf ---
Q3 SaaS Financial Statement:
Revenue of $85M (+42% YoY growth).
Operating Cash Flow (OCF) dropped to -$14M.
Accounts Receivable surged to $48M.
Deferred revenue was $32M.
    `;

    const prof = classifyUniversalDocument(fileContent, "q3_financial_results.pdf");
    assert.equal(prof.category, "FINANCIAL_QUANT");

    const dossier = buildUniversalDocumentInterpretation(fileContent, "q3_financial_results.pdf");
    assert.ok(dossier.keyMetricsAndFindings.some((m) => m.label.includes("Revenue")));
    assert.ok(dossier.keyMetricsAndFindings.some((m) => m.label.includes("Operating Cash Flow")));
    assert.ok(dossier.risksAndUncertainties.length > 0);
  });

  it("classifies and interprets uploaded cybersecurity telemetry and extracts IOCs", () => {
    const logDump = `--- fireeye_incident_dump.log ---
10:14 UTC: User auth from IP 198.51.100.24.
10:26 UTC: Session cookie used from IP 203.0.113.88 without MFA.
OAuth app SystemHealthMonitor granted offline_access.
Exploitation of CVE-2023-38606 observed.
    `;

    const prof = classifyUniversalDocument(logDump, "fireeye_incident_dump.log");
    assert.equal(prof.category, "CYBER_SECURITY");

    const dossier = buildUniversalDocumentInterpretation(logDump, "fireeye_incident_dump.log");
    assert.ok(dossier.keyMetricsAndFindings.some((m) => m.label.includes("IP Indicators")));
    assert.ok(dossier.domainSpecificAnalysis.includes("CVE-2023-38606"));
  });

  it("routes attachment wrappers cleanly through handleNaturalAttachmentIntelligenceQuery", () => {
    const query = `--- blood_work_oct2026.pdf ---
CBC Panel:
WBC: 12.8 x10^3/uL
Hemoglobin: 13.5 g/dL
Platelets: 210 x10^3/uL
Creatinine: 1.0 mg/dL
    `;

    const response = handleNaturalAttachmentIntelligenceQuery(query);
    assert.ok(response !== null);
    assert.match(response, /Noctis Universal Attachment & Document Intelligence Dossier/);
    assert.match(response, /White Blood Cell/);
  });
});
