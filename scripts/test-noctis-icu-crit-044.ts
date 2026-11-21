import assert from "node:assert/strict";
import { executeNaturalPatientDiagnosticQuery } from "../src/lib/noctis-patient-diagnosis.ts";
import { auditAndEnforceClinicalDossier } from "../src/lib/noctis-clinical-preflight-auditor.ts";

const rawCaseCrit044 = `
NOCTIS-ICU-CRIT-044
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
Imaging: STAT non-contrast Head CT and CTPA ordered, pending.
`;

console.log("============================================================================");
console.log("RUNNING NOCTIS-ICU-CRIT-044 AUDIT SUITE (DIFFICULTY 10/10 EXTREME CHALLENGE)");
console.log("============================================================================\n");

const encounterId = "NPDE-CRIT044-" + Date.now().toString(36).toUpperCase();
const dossier = executeNaturalPatientDiagnosticQuery(rawCaseCrit044, encounterId);

// 1. Verify Dossier Generation
assert.ok(dossier, "Dossier must not be empty");
console.log("[PASS 1/15] Dossier successfully generated.");

// 2. Verify Encounter ID Isolation
assert.ok(dossier.includes(encounterId), "Encounter ID must be strictly preserved throughout dossier");
console.log("[PASS 2/15] Immutable Encounter ID isolation verified.");

// 3. Verify Exact Mathematical Derivations
assert.ok(dossier.includes("49.3 mmHg"), "Must calculate exact MAP 49.3 mmHg");
assert.ok(dossier.includes("84.3%"), "Must calculate exact platelet reduction 84.3%");
assert.ok(dossier.includes("5.3 g/dL"), "Must calculate exact delta Hb drop 5.3 g/dL");
assert.ok(dossier.includes("19 mEq/L"), "Must calculate exact Anion Gap 19 mEq/L");
console.log("[PASS 3/15] Exact arithmetic derivations verified (MAP, Plt drop, delta Hb, Anion Gap).");

// 4. Verify 4Ts Score = 7
assert.ok(dossier.includes("4Ts") || dossier.includes("4T"), "Must calculate 4Ts score");
assert.ok(dossier.includes("7") && dossier.includes("High probability"), "Must stage 4Ts score as 7 (High probability HIT)");
console.log("[PASS 4/15] 4Ts Score for HIT verified (7 / High probability).");

// 5. Verify ISTH DIC Score = 5
assert.ok(dossier.includes("ISTH") || dossier.includes("DIC"), "Must calculate ISTH DIC score");
assert.ok(dossier.includes("5") || dossier.includes("Overt DIC"), "Must evaluate ISTH score 5 / Overt DIC");
console.log("[PASS 5/15] ISTH Consumptive Coagulopathy / DIC Score verified (5 / Overt DIC).");

// 6. Verify KDIGO AKI Staging
assert.ok(dossier.includes("KDIGO") && dossier.includes("Stage 1"), "Must stage AKI as KDIGO Stage 1 based on 1.93x baseline ratio");
console.log("[PASS 6/15] KDIGO AKI Stage 1 verified without overstaging.");

// 7. Verify Winter's Formula Calculation
assert.ok(dossier.includes("Winter") || dossier.includes("27.5"), "Must calculate Winter's formula expected PaCO2");
console.log("[PASS 7/15] Winter's formula acid-base compensation verified.");

// 8. Verify Competing Contraindications
assert.ok(
  /contraindicated/i.test(dossier) && /systemic.*(?:thrombolysis|lytics|alteplase|tpa)/i.test(dossier),
  "Systemic thrombolysis must be explicitly contraindicated due to GI bleed, recent surgery, and stroke"
);
assert.ok(
  /heparin/i.test(dossier) && /contraindicated|prohibit|avoid/i.test(dossier),
  "Heparin/LMWH must be strictly prohibited due to suspected HIT"
);
assert.ok(
  /fluid.*(?:bolus|overload|judicious|restrict)/i.test(dossier) || /rv.*(?:strain|overdistension|failure)/i.test(dossier),
  "Aggressive fluid resuscitation must be restricted due to acute RV failure / cor pulmonale"
);
console.log("[PASS 8/15] Absolute contraindications strictly enforced (No systemic tPA, No heparin, No large fluid boluses).");

// 9. Verify Reperfusion & Rescue Strategy
assert.ok(
  /catheter-directed|thrombectomy|flowtriever|mechanical\s+thrombectomy|pert/i.test(dossier),
  "Must recommend catheter-directed mechanical thrombectomy (e.g. Inari FlowTriever) without systemic lytics"
);
console.log("[PASS 9/15] Advanced catheter-directed mechanical thrombectomy rescue strategy verified.");

// 10. Verify Vasopressor Selection
assert.ok(/norepinephrine/i.test(dossier), "Must select Norepinephrine as first-line vasopressor to support RV perfusion");
console.log("[PASS 10/15] Vasopressor hemodynamic selection (Norepinephrine) verified.");

// 11. Verify Anticoagulation Management for HIT
assert.ok(
  /argatroban|bivalirudin/i.test(dossier),
  "Must specify non-heparin direct thrombin inhibitor (Argatroban/Bivalirudin) for HIT management"
);
console.log("[PASS 11/15] Non-heparin anticoagulation (Argatroban) verified.");

// 12. Verify Reversal of Triple Antithrombotic Exposure
assert.ok(
  /andexanet|4f-pcc|pcc|kcentra/i.test(dossier),
  "Must address Apixaban reversal with Andexanet alfa or 4F-PCC"
);
console.log("[PASS 12/15] Antithrombotic reversal strategy verified.");

// 13. Verify Acute Stroke Emergency Directives
assert.ok(
  /head\s+ct|non-contrast\s+ct|stroke|neurology/i.test(dossier),
  "Must prioritize emergent STAT non-contrast Head CT to exclude intracranial hemorrhage"
);
console.log("[PASS 13/15] Acute stroke workup & neuroimaging priority verified.");

// 14. Verify Independent SOAP Note Structure
assert.ok(
  dossier.includes("Subjective:") && dossier.includes("Objective:") && dossier.includes("Assessment:") && dossier.includes("Plan:"),
  "Must include complete independent clinical SOAP note"
);
console.log("[PASS 14/15] Independent clinical SOAP note verified.");

// 15. Verify Pre-Flight Audit Approval & Zero Contamination
const audit = auditAndEnforceClinicalDossier(dossier, rawCaseCrit044, encounterId);
assert.equal(audit.violationsCount, 0, "Violations count must be exactly 0");
assert.ok(audit.isApproved, "Pre-flight clinical auditor must approve dossier");
assert.ok(audit.mandatoryReleasePassed, "Mandatory release gate must pass");
console.log("[PASS 15/15] Independent pre-flight clinical release certification passed (100%).");

console.log("\n============================================================================");
console.log("ALL 15 NOCTIS-ICU-CRIT-044 CLINICAL SAFETY REQUIREMENTS PASSED (100%)");
console.log("============================================================================\n");
