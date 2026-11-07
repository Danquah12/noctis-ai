import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMedicalRecordInterpretation,
  formatMedicalRecordInterpretationMarkdown,
} from "./noctis-medical-record-interpreter.ts";

const SEVERE_SEPSIS_CLINICAL_SCENARIO = `
Noctis Medical Record & Clinical Interpretation Dossier
Patient: 67-year-old female
Presentation: Acute onset confusion, severe lethargy, reduced urine output. History of treated UTI 2 weeks ago.
Vital signs: Blood pressure: 86/54 mmHg, Heart rate: 128 bpm, Temperature: 39.2 C, Respiratory rate: 24 bpm, SpO2: 94%.
Laboratory Findings:
- White Blood Cell Count (WBC): 19 x10^3/uL
- Hemoglobin (Hgb): 11.2 g/dL
- Platelet Count: 92 x10^3/uL
- Potassium: 5.8 mmol/L
- Serum Creatinine: 2.8 mg/dL (Baseline creatinine: 1.4 mg/dL)
- Fasting Blood Glucose: 246 mg/dL
- Serum Lactate: 4.6 mmol/L
- Urinalysis: Positive leukocyte esterase, positive nitrites, WBC > 50/hpf

Direct Scenario Questions:
1. What is the most likely diagnosis?
2. Which additional investigations would you order, and what findings would you expect?
3. Transfer the patient to ICU?
4. Initiate vasopressors?
5. Consider renal replacement therapy?
6. Investigate for urinary obstruction or an abscess?
7. Identify the major prognostic indicators and explain how you would monitor treatment response over the first 24 hours?
`;

describe("NOCTIS MEDICAL — 15 Formal Clinical Acceptance Tests (MED-001 through MED-015)", () => {
  const dossier = buildMedicalRecordInterpretation(SEVERE_SEPSIS_CLINICAL_SCENARIO);
  const markdown = formatMedicalRecordInterpretationMarkdown(dossier);

  it("MED-001: Detects sepsis indicators (SIRS criteria + organ dysfunction)", () => {
    assert.ok(dossier.criticalAlerts.some((a) => /sepsis/i.test(a)));
    assert.ok(/sepsis/i.test(markdown));
  });

  it("MED-002: Identifies suspected shock physiology (hypotension + elevated lactate)", () => {
    assert.ok(dossier.criticalAlerts.some((a) => /septic\s+shock|shock/i.test(a)));
    assert.ok(/shock/i.test(markdown));
  });

  it("MED-003: Recognizes acute kidney injury (creatinine doubling 1.4 to 2.8)", () => {
    assert.ok(dossier.criticalAlerts.some((a) => /acute\s+kidney\s+injury|kdigo/i.test(a)));
  });

  it("MED-004: Flags clinically significant hyperkalemia (K 5.8)", () => {
    const kLab = dossier.labResults.find((l) => /potassium/i.test(l.analyteName));
    assert.ok(kLab);
    assert.equal(kLab?.status, "HIGH");
    assert.ok(/cardiac/i.test(kLab?.clinicalSignificance || ""));
  });

  it("MED-005: Identifies thrombocytopenia (platelets 92k)", () => {
    const plt = dossier.labResults.find((l) => /platelet/i.test(l.analyteName));
    assert.ok(plt);
    assert.equal(plt?.status, "LOW");
    assert.ok(/thrombocytopenia/i.test(plt?.clinicalSignificance || ""));
  });

  it("MED-006: Recognizes possible DIC and requests coagulation panel", () => {
    const qa = dossier.directScenarioQA?.find((q) => /additional\s+investigations/i.test(q.question));
    assert.ok(qa);
    assert.ok(/coagulation|dic|fibrinogen|d-dimer/i.test(qa?.answer || ""));
  });

  it("MED-007: Identifies possible urinary obstruction and requests source control", () => {
    const qa = dossier.directScenarioQA?.find((q) => /urinary\s+obstruction|abscess/i.test(q.question));
    assert.ok(qa);
    assert.ok(/ultrasound|ct|decompression|nephrostomy|source\s+control/i.test(qa?.answer || ""));
  });

  it("MED-008: Recognizes elevated lactate (4.6 mmol/L)", () => {
    const lac = dossier.labResults.find((l) => /lactate/i.test(l.analyteName));
    assert.ok(lac);
    assert.equal(lac?.status, "CRITICAL_HIGH");
  });

  it("MED-009: Avoids false stable prognosis (assigns Guarded/Critical)", () => {
    assert.notEqual(dossier.physicianNote?.prognosisType, "STABLE");
    assert.equal(dossier.physicianNote?.prognosisType, "GUARDED");
    assert.ok(!markdown.includes("⚪ **Stable**"));
  });

  it("MED-010: Preserves all clinically relevant source findings", () => {
    assert.ok(dossier.labResults.length >= 6);
    assert.ok(dossier.criticalAlerts.length >= 2);
  });

  it("MED-011: Distinguishes physician notes from examination questions", () => {
    assert.ok(
      !dossier.physicianNote?.prognosisSummary?.includes("Identify the major prognostic indicators")
    );
  });

  it("MED-012: Generates clinically relevant answers to every scenario question", () => {
    assert.ok(dossier.directScenarioQA && dossier.directScenarioQA.length >= 6);
    const diag = dossier.directScenarioQA?.find((q) => /diagnosis/i.test(q.question));
    assert.ok(/sepsis|urosepsis/i.test(diag?.answer || ""));
  });

  it("MED-013: Recommends blood cultures prior to antibiotic infusion", () => {
    const qa = dossier.directScenarioQA?.find((q) => /additional\s+investigations/i.test(q.question));
    assert.ok(/blood\s+cultures/i.test(qa?.answer || ""));
  });

  it("MED-014: Provides evidence-supported recommendations (Sepsis-3 / SSC / KDIGO)", () => {
    assert.ok(dossier.directScenarioQA?.some((q) => /sepsis|kdigo|sccm/i.test(q.clinicalGuidelineRef)));
  });

  it("MED-015: Never suppresses an emergency alert because a document lacks a panic-value designation", () => {
    assert.ok(dossier.criticalAlerts.length > 0);
    assert.ok(!dossier.executiveSummary.includes("No acute panic values were detected"));
  });
});
