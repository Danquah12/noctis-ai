import assert from "node:assert";
import { handleNaturalPatientDiagnosticQuery } from "../src/lib/noctis-patient-diagnosis.ts";

const PROMPT_BACTRIM_56F = `
[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-INTAKE-MWQTAAX7
Patient: 56-year-old female.
Presentation: Acute fever, tachycardia, altered mental status, tachypnea in setting of suspected infection.
Vitals: BP 92/58 mmHg, HR 124 bpm, RR 26/min, Temp 39.2°C, SpO2 93% on room air.
Medications: Trimethoprim-sulfamethoxazole 160/800 mg PO daily.
Labs: Serum Potassium 4.9 mmol/L, Creatinine 3.6 mg/dL, Lactate 4.9 mmol/L. Zero history of digoxin use.
Please provide emergency resuscitation plan, calculations, and contraindications.
`.trim();

console.log("Testing Encounter NPDE-INTAKE-MWQTAAX7 with Bactrim 160/800 mg...");
const res = handleNaturalPatientDiagnosticQuery(PROMPT_BACTRIM_56F, "NPDE-INTAKE-MWQTAAX7");
console.log("TAIL OF OUTPUT:");
console.log(res.slice(-1500));

// 1. Encounter ID Isolation
assert.ok(res.includes("NPDE-INTAKE-MWQTAAX7"), "Must use authoritative Encounter ID NPDE-INTAKE-MWQTAAX7");
assert.ok(!res.includes("NPDE-SEPSIS-"), "Must NOT generate foreign NPDE-SEPSIS ID");

// 2. Blood Pressure & MAP Integrity
assert.ok(!res.includes("160/800"), "Must NOT parse 160/800 mg as blood pressure");
assert.ok(!res.includes("586.7"), "Must NOT calculate MAP 586.7 mmHg");
assert.ok(res.includes("92/58 mmHg"), "Must parse true blood pressure 92/58 mmHg");
assert.ok(res.includes("69.3 mmHg"), "Must calculate exact MAP 69.3 mmHg");

// 3. qSOFA & CURB-65 Arithmetic Integrity
assert.ok(!res.includes("Present (160 mmHg)"), "Must NOT claim 160 mmHg satisfies hypotension <= 100");
assert.ok(!res.includes("Present (56 years)"), "Must NOT claim 56 years satisfies age >= 65");
assert.ok(res.includes("Absent (Documented age is 56 years"), "Must correctly state age 56 does not meet >= 65 threshold");

// 4. Release Gate: Must NOT fail-close with encounter ID or age mismatch!
assert.ok(!res.includes("REJECTED & FAILED-CLOSED"), "Must NOT be rejected due to self-inflicted ID or age mismatches");
assert.ok(res.includes("NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE"), "Must successfully issue release certificate");

console.log("\nALL BACTRIM & SEPSIS ARITHMETIC INTEGRITY TESTS PASSED!");
