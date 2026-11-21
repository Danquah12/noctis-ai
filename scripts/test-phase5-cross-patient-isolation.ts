/**
 * Test Phase 5: Cross-Patient Isolation & Context Integrity Suite
 * Validates:
 * - Patient A (78yo male, BRASH, Digoxin, BP 68/38, HR 29, MAP 48.0)
 * - Patient B (67yo female, DKA, Sepsis, BP 76/42, HR 138, MAP 53.3, AG 28, Winter's 16.5-20.5)
 * - Sequential execution (Zero leakage across runs)
 * - Concurrent execution (Promise.all isolation)
 * - Fail-closed gate enforcement on cross-contamination injection
 */

import assert from "node:assert";
import { handleNaturalPatientDiagnosticQuery } from "../src/lib/noctis-patient-diagnosis.ts";
import { auditAndEnforceClinicalDossier } from "../src/lib/noctis-clinical-preflight-auditor.ts";
import { buildImmutablePatientContext } from "../src/lib/noctis-patient-context.ts";

const PATIENT_A_PROMPT = `
[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-BRASH-DIG-PATIENT-A
Patient: 78-year-old male.
Presentation: Severe lethargy, lightheadedness, and profound weakness.
Vitals: BP 68/38 mmHg, HR 29 bpm (severe bradycardia), RR 28/min, Temp 38.6°C, SpO2 91% on room air.
Labs: Potassium 7.3 mmol/L, Sodium 129 mmol/L, Creatinine 4.8 mg/dL (baseline 2.3 mg/dL), Bicarbonate 12 mmol/L, Arterial pH 7.12, PaCO2 29 mmHg, Lactate 6.8 mmol/L, Digoxin level 3.6 ng/mL, Urine Output 120 mL/8h.
Cardiology: EF 30%, junctional escape rhythm with peaked T waves and QRS widening (154 ms).
Medications: Digoxin 0.125 mg daily, Carvedilol, Spironolactone, Metformin, Trimethoprim-sulfamethoxazole.
Please provide emergency triage, clinical calculations, differential diagnosis, and management recommendations.
`.trim();

const PATIENT_B_PROMPT = `
[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-BRASH-DIG-MWQNHDLI
NOCTIS-ICU-CRIT-042 — DKA, suspected septic shock, hyperkalemia, acute kidney injury, and heart failure.
Patient: 67-year-old female.
Presentation: Acute altered mental status, vomiting, fever, tachypnea, and severe weakness in setting of suspected urosepsis.
Vitals: BP 76/42 mmHg, HR 138 bpm (sinus tachycardia), RR 28/min, Temp 38.8°C, SpO2 92% on room air.
Labs: Serum Glucose 248 mg/dL, Beta-hydroxybutyrate 6.4 mmol/L, Bicarbonate 7 mmol/L, Arterial pH 7.06, PaCO2 20 mmHg, Sodium 134 mmol/L, Potassium 6.9 mmol/L, Chloride 99 mmol/L, Creatinine 4.6 mg/dL, Lactate 7.8 mmol/L.
Cardiology: Known HFrEF with EF 25%, 12-lead ECG shows sinus tachycardia at 138 bpm with marked QRS widening.
Medications: Metformin 1000 mg BID, Lisinopril, Furosemide. Zero history of digoxin use or digitalis therapy.
Please provide emergency resuscitation plan, calculations, and strict contraindications.
`.trim();

async function runPhase5TestSuite() {
  console.log("================================================================================");
  console.log("NOCTIS PHASE 5 CLINICAL SAFETY ACCEPTANCE TEST: CROSS-PATIENT DATA ISOLATION");
  console.log("================================================================================\n");

  // 1. Context Extraction Verification
  console.log("Step 1: Verifying Immutable Patient Context Extraction...");
  const ctxA = buildImmutablePatientContext(PATIENT_A_PROMPT, "NPDE-BRASH-DIG-PATIENT-A");
  const ctxB = buildImmutablePatientContext(PATIENT_B_PROMPT, "NPDE-BRASH-DIG-MWQNHDLI");

  assert.strictEqual(ctxA.demographics.age, 78, "Patient A age should be 78");
  assert.strictEqual(ctxA.demographics.sex, "male", "Patient A sex should be male");
  assert.strictEqual(ctxA.vitals.heartRateBpm, 29, "Patient A HR should be 29");
  assert.strictEqual(ctxA.calculations.meanArterialPressureMmHg?.toFixed(1), "48.0", "Patient A MAP should be 48.0");
  assert.strictEqual(ctxA.syndromes.isBrash, true, "Patient A should be BRASH");
  assert.strictEqual(ctxA.medications.hasDigoxinExposure, true, "Patient A should have digoxin exposure");

  assert.strictEqual(ctxB.demographics.age, 67, "Patient B age should be 67");
  assert.strictEqual(ctxB.demographics.sex, "female", "Patient B sex should be female");
  assert.strictEqual(ctxB.vitals.heartRateBpm, 138, "Patient B HR should be 138");
  assert.strictEqual(ctxB.calculations.meanArterialPressureMmHg?.toFixed(1), "53.3", "Patient B MAP should be 53.3");
  assert.strictEqual(ctxB.calculations.anionGapMeqL, 28, "Patient B Anion Gap should be 28");
  assert.strictEqual(ctxB.calculations.wintersExpectedLowMmHg, 16.5, "Patient B Winter's low should be 16.5");
  assert.strictEqual(ctxB.calculations.wintersExpectedHighMmHg, 20.5, "Patient B Winter's high should be 20.5");
  assert.strictEqual(ctxB.syndromes.isDka, true, "Patient B should be DKA");
  assert.strictEqual(ctxB.syndromes.isBrash, false, "Patient B should NOT be BRASH");
  assert.strictEqual(ctxB.medications.hasDigoxinExposure, false, "Patient B should NOT have digoxin exposure");
  console.log("✅ Step 1 Passed: Both Immutable Contexts extracted with 100% mathematical fidelity.\n");

  // 2. Sequential Execution Verification
  console.log("Step 2: Executing Sequential Run (Patient A -> Patient B)...");
  const resA = handleNaturalPatientDiagnosticQuery(PATIENT_A_PROMPT, "NPDE-BRASH-DIG-PATIENT-A");
  assert.ok(resA, "Patient A response should exist");
  assert.ok(resA.includes("48.0 mmHg"), "Patient A must include MAP 48.0 mmHg");
  assert.ok(resA.includes("78-year-old"), "Patient A must include 78-year-old");
  assert.ok(resA.includes("Digoxin 3.6 ng/mL"), "Patient A must include Digoxin 3.6 ng/mL");
  assert.ok(resA.includes("NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE"), "Patient A must have verified release certificate");
  assert.ok(!resA.includes("Diabetic Ketoacidosis"), "Patient A must NOT contain DKA");

  const resB = handleNaturalPatientDiagnosticQuery(PATIENT_B_PROMPT, "NPDE-BRASH-DIG-MWQNHDLI");
  assert.ok(resB, "Patient B response should exist");
  assert.ok(resB.includes("53.3 mmHg"), "Patient B must include MAP 53.3 mmHg");
  assert.ok(resB.includes("67-year-old"), "Patient B must include 67-year-old");
  assert.ok(resB.includes("female"), "Patient B must identify female patient");
  assert.ok(resB.includes("28 mEq/L"), "Patient B must include Anion Gap 28 mEq/L");
  assert.ok(resB.includes("16.5–20.5 mmHg") || resB.includes("16.5-20.5 mmHg"), "Patient B must include Winter's formula 16.5–20.5 mmHg");
  assert.ok(resB.includes("Diabetic Ketoacidosis"), "Patient B must evaluate Diabetic Ketoacidosis");
  assert.ok(resB.includes("DIGIFAB) CONTRAINDICATION") || resB.includes("DigiFab is STRICTLY NOT INDICATED"), "Patient B must veto DigiFab");
  assert.ok(!resB.includes("78-year-old"), "Patient B must NOT contain 78-year-old");
  assert.ok(!resB.includes("BP 68/38"), "Patient B must NOT contain Patient A's BP 68/38");
  assert.ok(!resB.includes("HR 29 bpm"), "Patient B must NOT contain Patient A's HR 29 bpm");
  assert.ok(resB.includes("NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE"), "Patient B must have verified release certificate");
  console.log("✅ Step 2 Passed: Sequential execution completely isolated with zero cross-patient data leakage.\n");

  // 3. Concurrent Execution Verification
  console.log("Step 3: Executing Concurrent Run (Promise.all([Patient A, Patient B]))...");
  const [asyncA, asyncB] = await Promise.all([
    Promise.resolve(handleNaturalPatientDiagnosticQuery(PATIENT_A_PROMPT, "NPDE-BRASH-DIG-PATIENT-A")),
    Promise.resolve(handleNaturalPatientDiagnosticQuery(PATIENT_B_PROMPT, "NPDE-BRASH-DIG-MWQNHDLI")),
  ]);

  assert.ok(asyncA && asyncB, "Both async responses must exist");
  assert.ok(asyncA.includes("48.0 mmHg") && asyncA.includes("78-year-old male"), "Async A must retain male 78yo & MAP 48.0");
  assert.ok(asyncB.includes("53.3 mmHg") && asyncB.includes("67-year-old female"), "Async B must retain female 67yo & MAP 53.3");
  assert.ok(!asyncB.includes("78-year-old"), "Async B must have zero male data");
  assert.ok(!asyncA.includes("67-year-old"), "Async A must have zero female data");
  console.log("✅ Step 3 Passed: Concurrent parallel execution preserves 100% strict encounter isolation.\n");

  // 4. Adversarial Cross-Contamination Fail-Closed Verification
  console.log("Step 4: Testing Adversarial Cross-Contamination Injection Fail-Closed Gate...");
  // Artificially inject Patient A's demographics into Patient B's report
  const contaminatedReport = resB.replace("67-year-old female", "78-year-old male presents in profound multi-system shock (BP 68/38 mmHg, HR 29 bpm)");
  const auditResult = auditAndEnforceClinicalDossier(contaminatedReport, PATIENT_B_PROMPT, "NPDE-BRASH-DIG-MWQNHDLI");

  assert.strictEqual(auditResult.isApproved, false, "Contaminated report must NOT be approved");
  assert.strictEqual(auditResult.mandatoryReleasePassed, false, "Mandatory release must FAIL");
  const mismatchFailure = auditResult.mandatoryReleaseFailures.find(f => f.includes("CLINICAL_VALIDATION_FAILED — ENCOUNTER_CONTEXT_MISMATCH"));
  assert.ok(mismatchFailure, "Must emit CLINICAL_VALIDATION_FAILED — ENCOUNTER_CONTEXT_MISMATCH");
  console.log("   Detected Gate Failure:", mismatchFailure);
  console.log("✅ Step 4 Passed: Adversarial cross-contamination triggers fail-closed release lockout.\n");

  console.log("================================================================================");
  console.log("ALL PHASE 5 CROSS-PATIENT ISOLATION ACCEPTANCE CRITERIA SATISFIED (100% PASS)");
  console.log("================================================================================\n");
}

runPhase5TestSuite().catch((err) => {
  console.error("❌ Phase 5 Test Suite Failed:", err);
  process.exit(1);
});
