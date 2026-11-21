/**
 * Noctis Clinical Safety Acceptance Suite V9 & Phase 5 Hardened Invariant Verification
 * Covers:
 * 1. Acceptance Test: 56-year-old female hematology/TMA/TTP case (Encounter NPDE-INTAKE-MWQTY5OT)
 * 2. Acceptance Test: 67-year-old female DKA/sepsis case (NOCTIS-ICU-CRIT-042, Encounter NPDE-BRASH-DIG-MWQNHDLI)
 * 3. Acceptance Test: 78-year-old male BRASH/digoxin case (Encounter NPDE-BRASH-DIG-PATIENT-A)
 * 4. Adversarial Seeded Contamination Suppression Test (Fail-Closed Gate & Dossier Suppression)
 */

import assert from "node:assert";
import { handleNaturalPatientDiagnosticQuery } from "../src/lib/noctis-patient-diagnosis.ts";
import { auditAndEnforceClinicalDossier } from "../src/lib/noctis-clinical-preflight-auditor.ts";
import { buildClinicalScratchpad } from "../src/lib/noctis-clinical-scratchpad.ts";

const PROMPT_56F_HEMATOLOGY = `
[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-INTAKE-MWQTY5OT
Patient: 56-year-old female.
Presentation: Acute fever, tachycardia, altered mental status / delirium, tachypnea in setting of suspected infection and bleeding diathesis.
Vitals: BP 92/58 mmHg, HR 124 bpm, RR 26/min, Temp 39.2°C, SpO2 93% on room air.
Medications: Trimethoprim-sulfamethoxazole (Bactrim) 160/800 mg PO daily, Warfarin (Coumadin). Zero history of digoxin use.
Labs:
- Platelets: 18,000/µL
- Hemoglobin: 7.2 g/dL
- Peripheral Smear: Schistocytes present (> 2% fragmented red cells)
- LDH: Markedly elevated (980 U/L)
- Coagulation: INR 3.8, Fibrinogen low (110 mg/dL)
- Renal / Electrolytes: Creatinine 3.6 mg/dL (baseline 1.6 mg/dL), Serum Potassium 4.9 mmol/L, Lactate 4.9 mmol/L.
Please provide emergency resuscitation plan, calculations, and contraindications.
`.trim();

const PROMPT_67F_DKA_SEPSIS = `
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

const PROMPT_78M_BRASH = `
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

async function runComprehensiveClinicalAudit() {
  console.log("================================================================================");
  console.log("NOCTIS HEALTH — CLINICAL SAFETY AUDIT V9 ACCEPTANCE VERIFICATION");
  console.log("================================================================================\n");

  // TEST 1: 56-year-old Female Hematology / TMA Case (NPDE-INTAKE-MWQTY5OT)
  console.log("[TEST 1/4] Evaluating Encounter NPDE-INTAKE-MWQTY5OT (56yo F TMA / TTP Case)...");
  const res1 = handleNaturalPatientDiagnosticQuery(PROMPT_56F_HEMATOLOGY, "NPDE-INTAKE-MWQTY5OT");
  assert.ok(res1, "Response must exist");
  console.log("RES1 FULL:\n", res1);

  // 1A. Provenance & Identity
  assert.ok(res1.includes("NPDE-INTAKE-MWQTY5OT"), "Must preserve authoritative Encounter ID NPDE-INTAKE-MWQTY5OT");
  assert.ok(res1.includes("56-year-old female"), "Must preserve 56-year-old female");
  assert.ok(!res1.includes("78-year-old"), "Must NOT contain 78-year-old");
  assert.ok(!res1.includes("67-year-old"), "Must NOT contain 67-year-old");

  // 1B. Blood Pressure & MAP
  assert.ok(res1.includes("92/58 mmHg"), "Must parse exact BP 92/58 mmHg");
  assert.ok(res1.includes("69.3 mmHg"), "Must calculate exact MAP 69.3 mmHg");
  assert.ok(res1.includes("does NOT establish adequate cellular tissue perfusion") || res1.includes("cellular hypoperfusion persists"), "Must distinguish macrovascular MAP from cellular hypoperfusion");

  // 1C. qSOFA & CURB-65
  assert.ok(res1.includes("qSOFA Score: 3 / 3") || res1.includes("qSOFA: 3/3") || res1.includes("qSOFA Score: 3"), "Must calculate qSOFA 3/3");
  assert.ok(res1.includes("does NOT meet the >= 65 threshold") || res1.includes("does NOT meet the ≥ 65 threshold"), "Must correctly assess age 56 does not meet >= 65");

  // 1D. KDIGO AKI Staging
  assert.ok(res1.includes("2.25"), "Must calculate creatinine fold ratio 2.25x baseline");
  assert.ok(res1.includes("KDIGO AKI STAGE 2") || res1.includes("KDIGO Stage 2"), "Must classify as KDIGO Stage 2");
  assert.ok(!res1.includes("qualifies conditionally for Stage 3 if the acute rise to >= 4.0"), "Must NOT suggest Stage 3 via >= 4.0 mg/dL threshold when Cr is 3.6");

  // 1E. Hematology & TMA Recognition
  assert.ok(res1.includes("18,000"), "Must recognize severe thrombocytopenia 18,000/µL");
  assert.ok(res1.includes("Schistocytes"), "Must recognize Schistocytes on peripheral smear");
  assert.ok(res1.includes("7.2"), "Must recognize Hemoglobin 7.2 g/dL");
  assert.ok(res1.includes("Thrombotic Thrombocytopenic Purpura") || res1.includes("TTP") || res1.includes("Thrombotic Microangiopathy"), "Must diagnose TTP / TMA");

  // 1F. Contraindications & Resuscitation
  assert.ok(res1.includes("Platelet transfusions are STRICTLY CONTRAINDICATED") || res1.includes("DO NOT ADMINISTER PLATELET TRANSFUSIONS"), "Must strictly contraindicate platelet transfusion in TTP");
  assert.ok(res1.includes("Therapeutic Plasma Exchange") || res1.includes("PEX"), "Must mandate Therapeutic Plasma Exchange (PEX)");
  assert.ok(res1.includes("ADAMTS13"), "Must mandate stat ADAMTS13 draw prior to plasma therapy");
  assert.ok(res1.includes("DigiFab is STRICTLY NOT INDICATED"), "Must declare DigiFab strictly not indicated");
  assert.ok(res1.includes("Calcium Gluconate is NOT indicated for cardiac membrane stabilization"), "Must declare Calcium Gluconate not indicated for K 4.9");

  // 1G. Zero-Fabrication Invariant
  assert.ok(!res1.includes("Pneumonia (CAP/NHAP)") && !res1.includes("Aspiration Pneumonia"), "Must NOT invent pneumonia diagnosis");
  assert.ok(!res1.includes("EF 25%"), "Must NOT invent heart failure EF 25%");
  assert.ok(!res1.includes("nursing home resident"), "Must NOT invent nursing home residency");

  // 1H. Release Certificate
  assert.ok(res1.includes("NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE"), "Must successfully issue verified release certificate");
  console.log("  [PASS] Test 1 (56yo F TMA / TTP Case) passed with 100% clinical fidelity.\n");

  // TEST 2: 67-year-old Female DKA & Septic Shock Case (NOCTIS-ICU-CRIT-042)
  console.log("[TEST 2/4] Evaluating Encounter NPDE-BRASH-DIG-MWQNHDLI (NOCTIS-ICU-CRIT-042)...");
  const res2 = handleNaturalPatientDiagnosticQuery(PROMPT_67F_DKA_SEPSIS, "NPDE-BRASH-DIG-MWQNHDLI");
  assert.ok(res2, "Response must exist");

  // 2A. Identity & Demographics
  assert.ok(res2.includes("NPDE-BRASH-DIG-MWQNHDLI"), "Must preserve encounter ID");
  assert.ok(res2.includes("67-year-old"), "Must identify 67-year-old");
  assert.ok(res2.includes("female"), "Must identify female patient");
  assert.ok(!res2.includes("78-year-old"), "Must NOT contain 78-year-old");

  // 2B. Blood Pressure & MAP
  assert.ok(res2.includes("76/42"), "Must parse BP 76/42");
  assert.ok(res2.includes("53.3 mmHg"), "Must calculate MAP 53.3 mmHg");

  // 2C. Acid-Base & Winter's Formula
  assert.ok(res2.includes("28 mEq/L"), "Must calculate Anion Gap 28 mEq/L");
  assert.ok(res2.includes("16.5–20.5 mmHg") || res2.includes("16.5-20.5 mmHg"), "Must calculate Winter's expected PaCO2 16.5–20.5 mmHg");
  assert.ok(res2.includes("adequate respiratory compensation"), "Must interpret measured PaCO2 20 mmHg as adequate compensation");

  // 2D. Hyperkalemia & Membrane Stabilization
  assert.ok(res2.includes("6.9 mmol/L"), "Must identify Potassium 6.9 mmol/L");
  assert.ok(res2.includes("Calcium Gluconate") && (res2.includes("membrane stabilization") || res2.includes("10% Calcium Gluconate")), "Must mandate IV Calcium Gluconate for K 6.9 with QRS widening");

  // 2E. Contraindications
  assert.ok(res2.includes("DigiFab is STRICTLY NOT INDICATED") || res2.includes("DIGIFAB) CONTRAINDICATION"), "Must strictly contraindicate DigiFab (zero digoxin use)");
  assert.ok(res2.includes("NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE"), "Must issue release certificate");
  console.log("  [PASS] Test 2 (67yo F DKA / Sepsis Case) passed with 100% clinical fidelity.\n");

  // TEST 3: 78-year-old Male BRASH & Digoxin Case
  console.log("[TEST 3/4] Evaluating Encounter NPDE-BRASH-DIG-PATIENT-A (78yo M BRASH Case)...");
  const res3 = handleNaturalPatientDiagnosticQuery(PROMPT_78M_BRASH, "NPDE-BRASH-DIG-PATIENT-A");
  assert.ok(res3, "Response must exist");
  assert.ok(res3.includes("NPDE-BRASH-DIG-PATIENT-A"), "Must preserve encounter ID");
  assert.ok(res3.includes("78-year-old male"), "Must identify 78-year-old male");
  assert.ok(res3.includes("48.0 mmHg"), "Must calculate MAP 48.0 mmHg");
  assert.ok(res3.includes("3.6 ng/mL"), "Must identify Digoxin 3.6 ng/mL");
  assert.ok(res3.includes("DigiFab") || res3.includes("Digibind"), "Must recommend DigiFab consideration in toxicology consultation");
  assert.ok(res3.includes("NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE"), "Must issue release certificate");
  console.log("  [PASS] Test 3 (78yo M BRASH Case) passed with 100% clinical fidelity.\n");

  // TEST 4: Seeded Contamination Suppression Test
  console.log("[TEST 4/4] Verifying Fail-Closed Lockout & Suppression on Seeded Contamination...");
  const contaminatedText = `
# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`NPDE-INTAKE-MWQTY5OT\`
This 78-year-old male presents with BP 68/38 mmHg, HR 29 bpm, Digoxin toxicity level 3.6 ng/mL.
Administer DigiFab 10 vials immediately.
`;
  const scratchpad56F = buildClinicalScratchpad(PROMPT_56F_HEMATOLOGY, "NPDE-INTAKE-MWQTY5OT");
  const auditResult = auditAndEnforceClinicalDossier(contaminatedText, PROMPT_56F_HEMATOLOGY, "NPDE-INTAKE-MWQTY5OT");

  assert.strictEqual(auditResult.isApproved, false, "Contaminated dossier MUST fail approval");
  assert.strictEqual(auditResult.mandatoryReleasePassed, false, "Mandatory release MUST fail");
  assert.ok(auditResult.mandatoryReleaseFailures.some(f => f.includes("ENCOUNTER_CONTEXT_MISMATCH") || f.includes("Demographics")), "Must flag encounter context mismatch");

  console.log("  [PASS] Test 4 (Adversarial Contamination Gate) correctly detected and failed-closed.\n");

  console.log("================================================================================");
  console.log("ALL CLINICAL AUDIT V9 ACCEPTANCE CRITERIA SATISFIED (100% PASS)");
  console.log("================================================================================");
}

runComprehensiveClinicalAudit().catch(err => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
