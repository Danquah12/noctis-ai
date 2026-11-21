import assert from "node:assert";
import { handleNaturalPatientDiagnosticQuery } from "../src/lib/noctis-patient-diagnosis.ts";

const PROMPT_56F = `
[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-INTAKE-MWQSPFNP
Patient: 56-year-old female.
Presentation: Acute fever, tachycardia, altered mental status, tachypnea in setting of suspected infection.
Vitals: BP 92/58 mmHg, HR 124 bpm, RR 26/min, Temp 39.2°C, SpO2 93% on room air.
Labs: Serum Potassium 4.9 mmol/L. Zero history of digoxin use.
Please provide emergency resuscitation plan, calculations, and contraindications.
`.trim();

console.log("Testing Encounter NPDE-INTAKE-MWQSPFNP...");
const res = handleNaturalPatientDiagnosticQuery(PROMPT_56F, "NPDE-INTAKE-MWQSPFNP");
console.log("RESPONSE SNIPPET:");
console.log(res.slice(0, 1500));

// Check zero fabrication
assert.ok(!res.includes("248 mg/dL"), "Must NOT fabricate Glucose 248 mg/dL");
assert.ok(!res.includes("6.4 mmol/L"), "Must NOT fabricate Beta-hydroxybutyrate 6.4 mmol/L");
assert.ok(!res.includes("7.06"), "Must NOT fabricate Arterial pH 7.06");
assert.ok(!res.includes("7.8 mmol/L"), "Must NOT fabricate Lactate 7.8 mmol/L");
assert.ok(!res.includes("4.6 mg/dL"), "Must NOT fabricate Creatinine 4.6 mg/dL");
assert.ok(!res.includes("Anion Gap = 28"), "Must NOT fabricate Anion Gap 28");

// Check physiological accuracy
assert.ok(!res.includes("severe hyperkalemic cardiotoxicity"), "Must NOT claim severe hyperkalemic cardiotoxicity for K+ 4.9");
assert.ok(res.includes("NOT INDICATED FOR HYPERKALEMIA"), "Must declare Calcium Gluconate NOT indicated for normal potassium");
assert.ok(!res.includes("deficit of 4.3 mmHg") && !res.includes("Perfusion Deficit: -4.3"), "Must NOT claim perfusion deficit for MAP 69.3");
assert.ok(res.includes("69.3 mmHg"), "Must correctly derive MAP 69.3 mmHg");
assert.ok(res.includes("reserve") || res.includes("meets the vital organ perfusion target") || res.includes("perfusion pressure currently maintained"), "Must identify MAP 69.3 as meeting perfusion target");

console.log("\nALL ZERO-FABRICATION & PHYSIOLOGICAL TESTS PASSED FOR NPDE-INTAKE-MWQSPFNP!");
