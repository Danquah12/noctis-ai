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

  it('enforces P0 Emergency Gate and C-BIG-K resuscitation protocol for severe hyperkalemia in CKD Stage 4', () => {
    const scenario =
      "68-year-old male with CKD stage 4 (eGFR 22 mL/min/1.73m2), potassium 7.1 mmol/L, ECG QRS widening, generalized muscle weakness, on Lisinopril, Spironolactone, and potassium chloride.";

    // 1. Verify intake parser does not chop on decimal point 1.73m2
    const data = parsePatientNaturalLanguageIntake(scenario);
    assert.equal(data.ageYears, 68);
    assert.equal(data.biologicalSex, "male");
    assert.ok(data.chiefComplaint.length > 30);
    assert.doesNotMatch(data.chiefComplaint, /eGFR 22 mL\/min\/1$/); // Must not truncate at decimal point
    assert.ok(data.pastMedicalHistory.some((p) => /Chronic Kidney Disease/i.test(p)));
    assert.ok(data.currentMedications.some((m) => /Lisinopril/i.test(m)));
    assert.ok(data.currentMedications.some((m) => /Spironolactone/i.test(m)));
    assert.ok(data.currentMedications.some((m) => /Potassium Chloride/i.test(m)));

    // 2. Verify deterministic triage is strictly P0 IMMEDIATE EMERGENCY (never P3 Routine)
    const triage = evaluateEmergencyTriage(data);
    assert.equal(triage.isEmergency, true);
    assert.equal(triage.triageCategory, "P0_IMMEDIATE_EMERGENCY");
    assert.notEqual(triage.triageCategory, "P3_PRIMARY_CARE_ROUTINE");
    assert.ok(triage.triggeredRedFlags.some((f) => /Hyperkalemia/i.test(f)));
    assert.ok(triage.actionableInstructions.some((i) => /Calcium Gluconate/i.test(i)));
    assert.ok(triage.actionableInstructions.some((i) => /Insulin/i.test(i)));

    // 3. Verify handleNaturalPatientDiagnosticQuery generates dedicated hyperkalemia dossier
    const res = handleNaturalPatientDiagnosticQuery(scenario);
    assert.ok(res !== null);
    assert.match(res, /P0 IMMEDIATE EMERGENCY/);
    assert.doesNotMatch(res, /P3 ROUTINE CLINICAL/);
    assert.match(res, /Calcium Gluconate/i);
    assert.match(res, /Regular Insulin/i);
    assert.match(res, /D50W/i);
    assert.match(res, /Dialysis/i);
    assert.match(res, /STAT WITHHOLD/i);
    assert.match(res, /Lisinopril/i);
    assert.match(res, /Spironolactone/i);
    assert.match(res, /post-stabilization reassessment/i);
    assert.match(res, /Adverse Drug Reaction/i);
    assert.doesNotMatch(res, /place electronic allergy alert/i);
    assert.doesNotMatch(res, /Patient denies chest pain/i);
    assert.doesNotMatch(res, /deep tendon reflexes preserved/i);
    assert.doesNotMatch(res, /Likelihood:\s*> 95%/i);
    assert.match(res, /21 U\.S\.C\. § 360j\(o\)\(1\)\(E\)/);
  });

  it('enforces P0 Emergency Gate and 3% hypertonic saline emergency protocol for severe hyponatremia with seizures', () => {
    const scenario =
      "64-year-old female presents with witnessed generalized seizures, severe encephalopathy, serum sodium 112 mmol/L, serum osmolality 238 mOsm/kg, and glucose 105 mg/dL, on HCTZ and sertraline.";

    const data = parsePatientNaturalLanguageIntake(scenario);
    assert.equal(data.ageYears, 64);
    assert.equal(data.biologicalSex, "female");

    const triage = evaluateEmergencyTriage(data);
    assert.equal(triage.isEmergency, true);
    assert.equal(triage.triageCategory, "P0_IMMEDIATE_EMERGENCY");
    assert.ok(triage.triggeredRedFlags.some((f) => /Hyponatremia/i.test(f)));
    assert.ok(triage.actionableInstructions.some((i) => /Hypertonic Saline/i.test(i)));

    const res = handleNaturalPatientDiagnosticQuery(scenario);
    assert.ok(res !== null);
    assert.match(res, /P0 IMMEDIATE EMERGENCY/);
    assert.match(res, /3%\s*Hypertonic Saline/i);
    assert.match(res, /4\s*(?:to|–|-)\s*6\s*mmol\/L/i); // Initial target
    assert.match(res, /8\s*(?:to|–|-)\s*10\s*mmol\/L/i); // 24-hour limit
    assert.match(res, /18\s*mmol\/L/i); // 48-hour limit
    assert.match(res, /every\s+1\s*(?:to|–|-)\s*2\s*hours/i); // Monitoring frequency
    assert.match(res, /Desmopressin|DDAVP/i); // Overcorrection readiness
    assert.match(res, /water diuresis|aquaresis/i);
    assert.match(res, /NOT indicated/i); // No routine long-term AEDs
    assert.doesNotMatch(res, /seizures stop within five minutes/i); // Zero fabrication
  });

  it('manages the severe hyponatremia overcorrection complication and ODS rescue with DDAVP and D5W', () => {
    const scenario =
      "A 64-year-old female with presumed chronic hyponatremia presents with seizures and sodium 112 mmol/L. Following emergency 3% saline treatment and discontinuation of hydrochlorothiazide, her sodium increases to 121 mmol/L within six hours. Urine output abruptly increases to 450 mL/hour. She is no longer seizing but remains confused.";

    const res = handleNaturalPatientDiagnosticQuery(scenario);
    assert.ok(res !== null);
    assert.match(res, /P0 IMMEDIATE EMERGENCY/);
    assert.match(res, /\+9\s*mmol\/L/); // Absolute sodium change
    assert.match(res, /1\.5(?:0)?\s*mmol\/L\/hour/i); // Hourly rate
    assert.match(res, /CRITICAL OVERCORRECTION/i);
    assert.match(res, /Osmotic Demyelination Syndrome|ODS/i);
    assert.match(res, /Central Pontine Myelinolysis/i);
    assert.match(res, /Desmopressin|DDAVP/i); // DDAVP to halt aquaresis
    assert.match(res, /D5W/i); // Free water replacement
    assert.match(res, /450\s*mL\/hour/i); // Matching urinary losses
    assert.match(res, /118\s*(?:to|–|-)\s*120\s*mmol\/L/i); // Safe 24-hour target Na
    assert.match(res, /every\s+1\s*hour/i); // Serial sodium checks
  });
});
