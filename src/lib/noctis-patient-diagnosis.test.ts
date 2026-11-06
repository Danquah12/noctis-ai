import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parsePatientNaturalLanguageIntake,
  evaluateEmergencyTriage,
  computeDifferentialDiagnosis,
  generateAdaptiveQuestions,
  generateClinicianSoapNote,
  buildPatientDiagnosticReport,
  formatPatientDiagnosticDossierMarkdown,
  handleNaturalPatientDiagnosticQuery,
} from "./noctis-patient-diagnosis.ts";

describe("Noctis Patient Diagnostic & Triage Intelligence Engine (NPDE)", () => {
  it("extracts patient clinical entities, OPQRST parameters, and explicitly tracks missing fields without fabricating data", () => {
    const prompt =
      "54-year-old male presenting with severe crushing chest pain (8/10) radiating to my left arm that started 30 minutes ago while walking uphill. I am sweating profusely and feeling short of breath. History of high blood pressure and smoking.";

    const data = parsePatientNaturalLanguageIntake(prompt);

    assert.equal(data.ageYears, 54);
    assert.equal(data.biologicalSex, "male");
    assert.equal(data.painQuality, "crushing");
    assert.equal(data.painSeverity, 8);
    assert.match(data.painRadiation || "", /left arm/i);
    assert.match(data.onsetTiming || "", /30 minutes/i);

    // Check associated symptoms
    assert.ok(data.associatedSymptoms.some((s) => s.includes("diaphoresis")));
    assert.ok(data.associatedSymptoms.some((s) => s.includes("shortness of breath")));

    // Check PMH
    assert.ok(data.pastMedicalHistory.some((p) => p.includes("Hypertension")));
    assert.ok(data.pastMedicalHistory.some((p) => p.includes("Smoking")));

    // Explicit missing fields tracking: vitals were not measured/provided
    assert.ok(data.explicitMissingFields.includes("blood_pressure"));
    assert.ok(data.explicitMissingFields.includes("heart_rate"));
    assert.ok(data.explicitMissingFields.includes("oxygen_saturation_spo2"));
    assert.equal(data.vitals.systolicBp, undefined);
  });

  it("enforces P0 Emergency Gate and 911 dispatch lock for acute cardiovascular chest pain", () => {
    const data = parsePatientNaturalLanguageIntake(
      "62-year-old woman with severe crushing retrosternal pressure radiating to jaw, diaphoresis, BP 158/96, HR 102 bpm"
    );

    const triage = evaluateEmergencyTriage(data);

    assert.equal(triage.isEmergency, true);
    assert.equal(triage.triageCategory, "P0_IMMEDIATE_EMERGENCY");
    assert.match(triage.escalationBanner || "", /Call 911 now/i);
    assert.ok(triage.triggeredRedFlags.some((f) => /Acute Coronary Syndrome/i.test(f)));
    assert.ok(triage.actionableInstructions.some((i) => /Dial 911/i.test(i)));
  });

  it("enforces P0 Emergency Gate for acute FAST stroke signs (facial droop, arm weakness, slurred speech)", () => {
    const data = parsePatientNaturalLanguageIntake(
      "Patient is a 70yo male with sudden onset of right-sided facial droop, arm weakness, and slurred speech starting 40 minutes ago"
    );

    const triage = evaluateEmergencyTriage(data);

    assert.equal(triage.isEmergency, true);
    assert.equal(triage.triageCategory, "P0_IMMEDIATE_EMERGENCY");
    assert.ok(triage.triggeredRedFlags.some((f) => /FAST Stroke Criteria/i.test(f)));
    assert.ok(triage.actionableInstructions.some((i) => /thrombolytic window/i.test(i)));
  });

  it("enforces P0 Emergency Gate for thunderclap headache / suspected SAH", () => {
    const data = parsePatientNaturalLanguageIntake(
      "38-year-old female complaining of worst headache of my life that reached peak intensity in 10 seconds, with severe stiff neck and photophobia"
    );

    const triage = evaluateEmergencyTriage(data);

    assert.equal(triage.isEmergency, true);
    assert.equal(triage.triageCategory, "P0_IMMEDIATE_EMERGENCY");
    assert.ok(triage.triggeredRedFlags.some((f) => /thunderclap|SAH/i.test(f)));
  });

  it("enforces P0 Emergency Gate for severe hemodynamic hypotension (shock physiology)", () => {
    const data = parsePatientNaturalLanguageIntake(
      "Adult patient feeling dizzy, BP 82/48 mmHg, HR 122 bpm"
    );

    const triage = evaluateEmergencyTriage(data);

    assert.equal(triage.isEmergency, true);
    assert.equal(triage.triageCategory, "P0_IMMEDIATE_EMERGENCY");
    assert.ok(triage.triggeredRedFlags.some((f) => /Hypotension/i.test(f)));
  });

  it("ranks Acute Coronary Syndrome as primary differential for exertional crushing chest discomfort", () => {
    const data = parsePatientNaturalLanguageIntake(
      "58-year-old male with crushing chest pressure radiating to left arm, sweating profusely, history of CAD and smoking"
    );

    const { differentials, mustNotMissEmergencies } = computeDifferentialDiagnosis(data);

    assert.ok(differentials.length > 0);
    assert.equal(differentials[0].diseaseName, "Acute Coronary Syndrome (NSTEMI / STEMI / Unstable Angina)");
    assert.equal(differentials[0].category, "PRIMARY_HYPOTHESIS");
    assert.ok(differentials[0].probabilityPct >= 30);
    assert.ok(differentials[0].goldStandardDiagnosticTests.some((t) => t.includes("Electrocardiogram (ECG)")));
    assert.ok(differentials[0].goldStandardDiagnosticTests.some((t) => t.includes("Troponin")));

    // Must-not-miss emergencies included
    assert.ok(mustNotMissEmergencies.some((m) => m.diseaseName.includes("Pulmonary Embolism")));
  });

  it("ranks Acute Appendicitis as top differential for periumbilical migration to RLQ pain", () => {
    const data = parsePatientNaturalLanguageIntake(
      "22-year-old male with belly pain that started around my belly button and migrated to the right lower quadrant, nausea, vomiting, fever"
    );

    const { differentials } = computeDifferentialDiagnosis(data);

    assert.ok(differentials.length > 0);
    assert.equal(differentials[0].diseaseName, "Acute Appendicitis");
    assert.ok(differentials[0].goldStandardDiagnosticTests.some((t) => t.includes("Abdominal/Pelvic CT")));
  });

  it("ranks GERD for postprandial burning epigastric discomfort and sets non-emergent triage tier", () => {
    const data = parsePatientNaturalLanguageIntake(
      "34-year-old female with burning sensation in epigastrium and throat after eating spicy pizza, improves with antacid, no sweating, no arm pain, severity 4/10"
    );

    const triage = evaluateEmergencyTriage(data);
    const { differentials } = computeDifferentialDiagnosis(data);

    assert.equal(triage.isEmergency, false);
    assert.notEqual(triage.triageCategory, "P0_IMMEDIATE_EMERGENCY");
    assert.equal(differentials[0].diseaseName, "Gastroesophageal Reflux Disease (GERD) & Esophageal Spasm");
  });

  it("generates discriminative adaptive follow-up questions targeting high-information-gain clinical features", () => {
    const data = parsePatientNaturalLanguageIntake(
      "Patient reports acute shortness of breath and sharp chest discomfort"
    );

    const { differentials } = computeDifferentialDiagnosis(data);
    const adaptiveQuestions = generateAdaptiveQuestions(data, differentials);

    assert.ok(adaptiveQuestions.length > 0);
    assert.ok(adaptiveQuestions.every((q) => Boolean(q.promptText && q.clinicalObjective && q.potentialImpact)));
  });

  it("produces a structured clinician SOAP note with explicit missing data labels", () => {
    const data = parsePatientNaturalLanguageIntake(
      "46yo male with sudden sharp chest pain, pain 7/10, no vitals taken"
    );

    const triage = evaluateEmergencyTriage(data);
    const { differentials } = computeDifferentialDiagnosis(data);
    const soap = generateClinicianSoapNote(data, triage, differentials);

    assert.match(soap.subjective, /46-year-old male/i);
    assert.match(soap.objective, /\[UNPROVIDED — NOT MEASURED\]/);
    assert.match(soap.assessment, /PRIMARY WORKING HYPOTHESIS/);
    assert.match(soap.plan, /RECOMMENDED CLINICAL ACTION PLAN/);
  });

  it("builds a complete diagnostic dossier and markdown format adhering to FDA CDS Jan 2026 guidelines", () => {
    const dossier = buildPatientDiagnosticReport(
      "65-year-old woman with sudden difficulty speaking and right-sided arm drift"
    );

    assert.ok(dossier.encounterId.startsWith("NPDE-"));
    assert.equal(dossier.triage.isEmergency, true);
    assert.ok(dossier.differentials.length > 0);

    const markdown = formatPatientDiagnosticDossierMarkdown(dossier);
    assert.match(markdown, /Noctis Patient Diagnostic & Triage Intelligence Dossier/);
    assert.match(markdown, /P0 IMMEDIATE EMERGENCY/);
    assert.match(markdown, /Evidence-Weighted Differential Diagnosis/);
    assert.match(markdown, /Structured Clinician SOAP Note/);
    assert.match(markdown, /FDA Jan 2026 Clinical Decision Support/);
  });

  it("routes natural conversational patient diagnostic queries through handleNaturalPatientDiagnosticQuery", () => {
    const res = handleNaturalPatientDiagnosticQuery(
      "provide diagnosis based on the information provided by the patients: 52yo male with burning chest pain after meals"
    );

    assert.ok(res !== null);
    assert.match(res, /Noctis Patient Diagnostic & Triage Intelligence Dossier/);
    assert.match(res, /Gastroesophageal Reflux/);
  });

  it('enforces P0 Emergency Gate and Potassium Safety Gate for severe DKA presentation without ACS leakage', () => {
    const res = handleNaturalPatientDiagnosticQuery(
      '24-year-old female with Type 1 Diabetes presents with severe nausea, vomiting, Kussmaul breathing, and blood glucose of 540 mg/dL'
    );

    assert.ok(res !== null);
    assert.match(res, /P0 IMMEDIATE EMERGENCY/);
    assert.match(res, /21 U\.S\.C\. § 360j\(o\)\(1\)\(E\)/);
    assert.match(res, /Diabetic Ketoacidosis/);
    assert.match(res, /Kussmaul/);
    assert.match(res, /3\.3\s*mEq\/L/);
    assert.doesNotMatch(res, /Central Chest Discomfort/);
    assert.doesNotMatch(res, /154\/96\s*mmHg/);
  });
});
