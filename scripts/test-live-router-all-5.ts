/**
 * Live End-to-End Router Acceptance Suite for All 5 Audit Tests (6 Exact Prompts)
 * Verifies runFollowUpIntelligence (same production path as /api/noctis and NoctisDesk):
 * - Zero non-clinical hijacking (e.g., NOCTIS-LEGAL-001 on wall motion abnormalities)
 * - Zero normonatremic hyponatremia misrouting
 * - Zero fabricated labs/medications/HPI in BRASH or Sepsis dossiers
 * - Strict multi-turn encounter isolation (Test 2B immediately after Test 2A in turns)
 * - 100% Independent Clinical Release Certificate approval across all 6 prompts
 */

import assert from "node:assert/strict";
import { runFollowUpIntelligence } from "../src/lib/noctis-response-intelligence.ts";

const TEST_1_PANCREATITIS = `Encounter: NPDE-STRESS-43M-PANC
A 43-year-old male with a history of alcohol use disorder presents to the emergency department with 18 hours of excruciating, constant epigastric pain radiating to his mid-back, accompanied by intractable vomiting and abdominal distension.
Vitals: Blood pressure 84/48 mmHg, Heart rate 106 bpm, Respiratory rate 24/min, Oxygen saturation 94% on ambient air, Temperature 38.3°C.
Medications: Amlodipine 5 mg daily. Patient takes no other prescription or over-the-counter medications.
Physical Exam: Patient in severe distress, diaphoretic, abdomen rigidly tender in epigastrium with voluntary guarding, bowel sounds hypoactive. No flank ecchymosis (Grey Turner absent), no periumbilical ecchymosis (Cullen absent).
Labs:
Serum Lipase: 3,420 U/L (markedly elevated)
Serum Amylase: 1,180 U/L
Serum Sodium: 136 mEq/L
Serum Potassium: 3.8 mmol/L
Serum Bicarbonate: 18 mEq/L
Serum Creatinine: 1.9 mg/dL (documented baseline creatinine 1.0 mg/dL 4 months ago)
Serum BUN: 34 mg/dL
Blood Glucose: 194 mg/dL
White Blood Cell Count: 17.4 x 10^3/µL (84% neutrophils)
Hemoglobin: 16.8 g/dL (hemoconcentration)
Platelets: 310,000/µL
Ionized Calcium: 0.72 mmol/L (critically low)
Serum Lactate: 3.1 mmol/L
Notice: Serum chloride was NOT ORDERED. Patient body weight is UNMEASURED. No arterial blood gas performed.

Provide a comprehensive clinical diagnosis, triage classification, severity scoring, and immediate emergency resuscitation plan.`;

const TEST_2A_BRASH = `[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-BRASH-DIG-PATIENT-A
Patient: 78-year-old male.
Presentation: Severe lethargy, lightheadedness, and profound weakness.
Vitals: BP 68/38 mmHg, HR 29 bpm (severe bradycardia), RR 28/min, Temp 38.6°C, SpO2 91% on room air.
Labs: Potassium 7.3 mmol/L, Sodium 129 mmol/L, Creatinine 4.8 mg/dL (baseline 2.3 mg/dL), Bicarbonate 12 mmol/L, Arterial pH 7.12, PaCO2 29 mmHg, Lactate 6.8 mmol/L, Digoxin level 3.6 ng/mL, Urine Output 120 mL/8h.
Cardiology: EF 30%, junctional escape rhythm with peaked T waves and QRS widening (154 ms).
Medications: Digoxin 0.125 mg daily, Carvedilol, Spironolactone, Metformin, Trimethoprim-sulfamethoxazole.
Please provide emergency triage, clinical calculations, differential diagnosis, and management recommendations.`;

const TEST_2B_TMA = `[Patient Diagnostic Intake Encounter]
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
Please provide emergency resuscitation plan, calculations, and contraindications.`;

const TEST_3_POISONED_PREFIX_DKA = `[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-BRASH-DIG-MWQNHDLI
NOCTIS-ICU-CRIT-042 — DKA, suspected septic shock, hyperkalemia, acute kidney injury, and heart failure.
Patient: 67-year-old female.
Presentation: Acute altered mental status, vomiting, fever, tachypnea, and severe weakness in setting of suspected urosepsis.
Vitals: BP 76/42 mmHg, HR 138 bpm (sinus tachycardia), RR 28/min, Temp 38.8°C, SpO2 92% on room air.
Labs: Serum Glucose 248 mg/dL, Beta-hydroxybutyrate 6.4 mmol/L, Bicarbonate 7 mmol/L, Arterial pH 7.06, PaCO2 20 mmHg, Sodium 134 mmol/L, Potassium 6.9 mmol/L, Chloride 99 mmol/L, Creatinine 4.6 mg/dL, Lactate 7.8 mmol/L.
Cardiology: Known HFrEF with EF 25%, 12-lead ECG shows sinus tachycardia at 138 bpm with marked QRS widening.
Medications: Metformin 1000 mg BID, Lisinopril, Furosemide. Zero history of digoxin use or digitalis therapy.
Please provide emergency resuscitation plan, calculations, and strict contraindications.`;

const TEST_4_CRIT_044 = `NOCTIS-ICU-CRIT-044
A 64-year-old female presents to the Emergency Department in profound shock.
Post-Op Day 9 following elective Total Hip Arthroplasty (THA). Received unfractionated heparin (UFH) subcutaneously in hospital.
Current medications: Apixaban 2.5 mg BID, Aspirin 81 mg daily, Clopidogrel 75 mg daily, Metformin 1000 mg BID, Lisinopril 20 mg daily, Atorvastatin 40 mg daily.
Vitals: BP 68/40 mmHg, HR 142 bpm (sinus tachycardia), RR 36/min, SpO2 82% on room air (refractory to 15L NRB, up to 88%), Temp 36.4°C. Weight: 82 kg.
Exam: Cold, clammy extremities, marked diaphoresis, mottled skin (Knee mottling score 3), jugular venous distention to angle of jaw, loud P2, tricuspid regurgitation murmur.
Stool: Copious frank melena on rectal exam.
Neurology: Acute onset expressive aphasia / speech difficulty 45 minutes prior to presentation. NIHSS ~8.
Bedside Echo: Severe right ventricular dilation (RV:LV ratio > 1.3), McConnell's sign present, flattened interventricular septum bowing into left ventricle during diastole/systole ("D-shaped" LV), TAPSE 10 mm, estimated PASP 58 mmHg. Normal left ventricular systolic ejection fraction without regional wall motion abnormalities.
Lower Extremity Duplex: Extensive non-compressible thrombus in left common femoral and popliteal veins.
ECG: Sinus tachycardia at 142 bpm, right axis deviation, S1Q3T3 pattern, new complete right bundle branch block (RBBB), T-wave inversions V1-V4.
Labs:
Hemoglobin: 6.8 g/dL (baseline 12.1 g/dL on discharge)
Platelets: 38,000/µL (baseline 242,000/µL pre-op)
WBC: 14.8 x 10^3/µL
Sodium: 132 mEq/L, Potassium: 5.8 mEq/L, Chloride: 100 mEq/L, Bicarbonate: 13 mEq/L, BUN: 48 mg/dL, Creatinine: 2.9 mg/dL (baseline 1.5 mg/dL)
Glucose: 168 mg/dL
Venous Lactate: 8.4 mmol/L
ABG (on NRB): pH 7.22, PaCO2 31 mmHg, PaO2 54 mmHg, HCO3- 12.5 mEq/L, Base Deficit -14 mEq/L
Coagulation: INR 1.8, aPTT 43 seconds, Fibrinogen 145 mg/dL, D-dimer 12,500 ng/mL FEU
Troponin I: 1.42 ng/mL (elevated), BNP: 1,850 pg/mL
Imaging: STAT non-contrast Head CT and CTPA ordered, pending.`;

const TEST_5_BLIND_SEPSIS = `[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-BLIND-34M-SEPSIS
Patient: 34-year-old previously healthy male presenting from home with 24 hours of high fever, rigors, flank pain, and acute confusion.
Vitals: BP 82/46 mmHg, HR 118 bpm, RR 26/min, Temp 39.4°C, SpO2 94% on room air.
Medications: None. No prior hospitalizations, no recent antibiotics, no known cardiac or kidney disease.
Labs:
- Serum Creatinine: 1.8 mg/dL (baseline 0.9 mg/dL)
- Serum Potassium: 4.1 mmol/L
- Serum Sodium: 137 mmol/L
- Serum Bicarbonate: 16 mmol/L
- Serum Lactate: 4.2 mmol/L
- Notice: Serum Chloride NOT ORDERED, BUN NOT ORDERED, ABG NOT PERFORMED, Chest X-Ray NOT PERFORMED, Echocardiogram NOT PERFORMED, Weight UNMEASURED.

Provide emergency triage, exact calculations, and resuscitation protocol.`;

console.log("================================================================================");
console.log("NOCTIS LIVE ROUTER ACCEPTANCE SUITE — ALL 5 TESTS (6 PROMPTS)");
console.log("================================================================================\n");

// Test 1: NPDE-STRESS-43M-PANC
const out1 = runFollowUpIntelligence([], TEST_1_PANCREATITIS) ?? "";
assert.ok(out1.includes("NPDE-STRESS-43M-PANC"), "T1: Encounter ID");
assert.ok(out1.includes("APPROVED FOR CLINICAL DECISION SUPPORT"), "T1: Release Cert");
assert.ok(out1.includes("Predicted Severe Acute Pancreatitis"), "T1: Predicted severe timing nuance");
assert.ok(out1.includes("1.5 mL/kg/hr") && !out1.includes("1.5–3.0 mL/kg/hr"), "T1: WATERFALL 1.5 mL/kg/hr moderate rate");
assert.ok(out1.includes("HOLD Amlodipine 5 mg"), "T1: Explicit Amlodipine hold");
assert.ok(out1.includes("BUN 34 mg/dL") && out1.includes("1.0 mg/dL"), "T1: BUN + Baseline 1.0 mg/dL");
assert.ok(out1.includes("33–37 mmHg"), "T1: Winter's derived");
assert.ok(out1.includes("60.0 mmHg"), "T1: MAP 60.0 mmHg");
console.log("[PASS 1/6] Test 1 (NPDE-STRESS-43M-PANC) passed + 4 attending refinements verified.");

// Test 2A: NPDE-BRASH-DIG-PATIENT-A
const out2a = runFollowUpIntelligence([], TEST_2A_BRASH) ?? "";
assert.ok(out2a.includes("NPDE-BRASH-DIG-PATIENT-A"), "T2A: Encounter ID");
assert.ok(out2a.includes("APPROVED FOR CLINICAL DECISION SUPPORT"), "T2A: Release Cert");
assert.ok(!/\bLisinopril\b/i.test(out2a), "T2A: Must NOT fabricate Lisinopril");
assert.ok(!/\b168\s*mg\/dL\b/i.test(out2a), "T2A: Must NOT fabricate Blood Glucose 168 mg/dL");
assert.ok(!/\bWatery diarrhea\b/i.test(out2a), "T2A: Must NOT fabricate Watery diarrhea");
assert.ok(!/\burinary tract infection\b/i.test(out2a) && !/\bRecent UTI on TMP-SMX\b/i.test(out2a), "T2A: Must NOT fabricate UTI");
assert.ok(!/\bchronic atrial fibrillation\b/i.test(out2a) && !/\bType 2 Diabetes\b/i.test(out2a), "T2A: Must NOT fabricate AFib or T2DM");
assert.ok(!out2a.includes("SpO2 SpO2"), "T2A: Must NOT duplicate SpO2 label");
assert.ok(!out2a.includes("\\\\ge") && !out2a.includes("-17.0\\text"), "T2A: Must NOT leak escaped TeX in tables/prose");
assert.ok(out2a.includes("all 5 documented outpatient medications"), "T2A: Exact med count 5");
assert.ok(out2a.includes("48.0 mmHg"), "T2A: MAP 48.0 mmHg");
console.log("[PASS 2/6] Test 2A (NPDE-BRASH-DIG-PATIENT-A) passed with ZERO fabricated meds/labs/HPI.");

// Test 2B IMMEDIATELY after Test 2A in the same conversation turns
const out2b = runFollowUpIntelligence(
  [
    { role: "user", content: TEST_2A_BRASH },
    { role: "assistant", content: out2a },
  ],
  TEST_2B_TMA
) ?? "";
assert.ok(out2b.includes("NPDE-INTAKE-MWQTY5OT"), "T2B: Encounter ID");
assert.ok(out2b.includes("56-year-old female"), "T2B: Demographics isolated");
assert.ok(out2b.includes("APPROVED FOR CLINICAL DECISION SUPPORT"), "T2B: Release Cert");
assert.ok(!out2b.includes("78-year-old"), "T2B: Zero bleed of 78-year-old from T2A turn");
assert.ok(!out2b.includes("3.6 ng/mL"), "T2B: Zero bleed of Digoxin 3.6 from T2A turn");
assert.ok(!out2b.includes("7.3 mmol/L"), "T2B: Zero bleed of K+ 7.3 from T2A turn");
assert.ok(!out2b.includes("EF 30%"), "T2B: Zero bleed of EF 30% from T2A turn");
assert.ok(out2b.includes("69.3 mmHg") && out2b.includes("KDIGO Stage 2"), "T2B: Math verified");
console.log("[PASS 3/6] Test 2B (NPDE-INTAKE-MWQTY5OT after T2A in turns) passed with 100% isolation.");

// Test 3: NPDE-BRASH-DIG-MWQNHDLI (Poisoned prefix DKA)
const out3 = runFollowUpIntelligence([], TEST_3_POISONED_PREFIX_DKA) ?? "";
assert.ok(out3.includes("NPDE-BRASH-DIG-MWQNHDLI"), "T3: Encounter ID");
assert.ok(out3.includes("APPROVED FOR CLINICAL DECISION SUPPORT"), "T3: Release Cert");
assert.ok(out3.includes("67-year-old female"), "T3: Demographics");
assert.ok(out3.includes("53.3 mmHg") && out3.includes("28 mEq/L"), "T3: Math verified");
assert.ok(out3.includes("DigiFab is STRICTLY NOT INDICATED") || out3.includes("DIGIFAB) CONTRAINDICATION"), "T3: Rejects false digoxin toxicity");
console.log("[PASS 4/6] Test 3 (NPDE-BRASH-DIG-MWQNHDLI poisoned prefix) passed.");

// Test 4: NOCTIS-ICU-CRIT-044 (Must NOT route to Legal!)
const out4 = runFollowUpIntelligence([], TEST_4_CRIT_044) ?? "";
assert.ok(!out4.includes("NOCTIS-LEGAL-001"), "T4: MUST NOT route to NOCTIS-LEGAL-001");
assert.ok(out4.includes("64-year-old female"), "T4: Patient preserved");
assert.ok(out4.includes("APPROVED FOR CLINICAL DECISION SUPPORT"), "T4: Release Cert");
assert.ok(out4.includes("49.3 mmHg") && out4.includes("84.3%") && out4.includes("5.3 g/dL") && out4.includes("19 mEq/L"), "T4: Math verified");
assert.ok(out4.includes("4Ts") && out4.includes("ISTH"), "T4: Scores verified");
assert.ok(out4.includes("pH 7.22") && !out4.includes("7.19"), "T4: Exact arterial pH 7.22 preserved (no 7.19)");
assert.ok(out4.includes("36.4°C") && !out4.includes("37.1°C"), "T4: Exact Temp 36.4C preserved (no 37.1C)");
assert.ok(out4.includes("PaO2 54 mmHg") && !out4.includes("PaO2 49"), "T4: Exact PaO2 54 preserved (no 49)");
assert.ok(out4.includes("145") && !out4.includes("175 mg/dL") && !out4.includes("Fibrinogen 175"), "T4: Exact Fibrinogen 145 preserved (no 175)");
assert.ok(out4.includes("1.42 ng/mL") && out4.includes("1,850 pg/mL"), "T4: Exact Troponin I & BNP preserved");
assert.ok(out4.includes("Atorvastatin") && !/metoprolol/i.test(out4), "T4: Documented Atorvastatin included; unprovided Metoprolol absent");
assert.ok(!/GCS\s*11/i.test(out4), "T4: Fabricated GCS 11 absent");
assert.ok(out4.includes("Baseline: 1.5 mg/dL") && /KDIGO\s+(?:AKI\s+)?Stage\s*1/i.test(out4), "T4: Scratchpad baseline Cr 1.5 & KDIGO Stage 1 aligned");
assert.ok(/AVOID\s+LARGE-VOLUME\s+FLUID\s+BOLUSES|Acute\s+RV\s+Failure\s*\/\s*Cor\s+Pulmonale/i.test(out4), "T4: RV fluid restriction aligned");
assert.ok(!out4.includes("(Digoxin, Beta-Blocker, RAASi)"), "T4: No irrelevant BRASH med list in CRIT-044 scratchpad");
console.log("[PASS 5/6] Test 4 (NOCTIS-ICU-CRIT-044) routed cleanly to Clinical Critical Care (no Legal hijack).");

// Test 5: NPDE-BLIND-34M-SEPSIS (Must NOT route to Hyponatremia!)
const out5 = runFollowUpIntelligence([], TEST_5_BLIND_SEPSIS) ?? "";
assert.ok(!out5.includes("Hyponatremia") && !out5.includes("112 mmol/L"), "T5: MUST NOT misroute to Hyponatremia");
assert.ok(out5.includes("NPDE-BLIND-34M-SEPSIS"), "T5: Exact full Encounter ID preserved");
assert.ok(out5.includes("APPROVED FOR CLINICAL DECISION SUPPORT"), "T5: Release Cert");
assert.ok(out5.includes("34-year-old male"), "T5: Demographics verified");
assert.ok(out5.includes("58.0 mmHg"), "T5: Exact MAP 58.0 mmHg");
assert.ok(out5.includes("30–34 mmHg"), "T5: Exact Winter's 30–34 mmHg");
assert.ok(out5.includes("4 of 5 Criteria Evaluated"), "T5: CURB-65 4 of 5");
assert.ok(!/\bHFrEF\b/i.test(out5), "T5: Zero HFrEF fabrication");
assert.ok(!/\bCKD Stage [345]\b/i.test(out5), "T5: Zero CKD fabrication");
assert.ok(!out5.includes("45 days"), "T5: Zero prior hospitalization fabrication");
assert.ok(!/\bdense (?:radiographic )?alveolar consolidation\b/i.test(out5), "T5: Zero CXR consolidation fabrication");
assert.ok(!/\bnursing home resident\b/i.test(out5), "T5: Zero nursing home fabrication");
console.log("[PASS 6/6] Test 5 (NPDE-BLIND-34M-SEPSIS) routed to Community Sepsis with zero fabrications.");

console.log("\n================================================================================");
console.log("ALL 6 LIVE ROUTER PROMPTS PASSED 100%");
console.log("================================================================================");
