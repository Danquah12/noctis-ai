import { tracePatientContextPipeline } from "./trace-patient-context-pipeline.ts";

const probeCase = `
Encounter: NPDE-STRESS-43M-PANC
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

Provide a comprehensive clinical diagnosis, triage classification, severity scoring, and immediate emergency resuscitation plan.
`;

import { handleNaturalPatientDiagnosticQuery } from "../src/lib/noctis-patient-diagnosis.ts";
const finalOutput = handleNaturalPatientDiagnosticQuery(probeCase, "NPDE-STRESS-43M-PANC") ?? "";
console.log("\n=================== FINAL OUTPUT (FIRST 1500 CHARS) ===================");
console.log(finalOutput.slice(0, 1500));
console.log("\n=================== FINAL OUTPUT (LAST 1500 CHARS) ===================");
console.log(finalOutput.slice(-1500));

const trace = tracePatientContextPipeline(probeCase, "NPDE-STRESS-43M-PANC");
console.log("TRACE SUMMARY:");
console.log("- Encounter:", trace.stage1_rawRequest.encounterId);
console.log("- Demographics:", trace.stage2_parsedClinicalObject.demographics.ageDisplay, trace.stage2_parsedClinicalObject.demographics.sex);
console.log("- BP / MAP:", trace.stage2_parsedClinicalObject.vitals.bpDisplay, "-> MAP:", trace.stage2_parsedClinicalObject.calculations.meanArterialPressureMmHg?.toFixed(1), "mmHg");
console.log("- HR:", trace.stage2_parsedClinicalObject.vitals.heartRateBpm, "bpm");
console.log("- K+:", trace.stage2_parsedClinicalObject.labs.potassiumMeqL, "mmol/L");
console.log("- Creatinine:", trace.stage2_parsedClinicalObject.labs.creatinineMgDl, "mg/dL (baseline:", trace.stage2_parsedClinicalObject.labs.baselineCreatinineMgDl, ")");
console.log("- Anion Gap Computable:", trace.stage2_parsedClinicalObject.calculations.isAnionGapComputable);
console.log("- Primary Engine:", trace.stage3_generationContext.primaryEngine);
console.log("- Preflight Approved:", trace.stage5_validatorEvaluation.isApproved, "| Violations:", trace.stage5_validatorEvaluation.violationsCount);
if (trace.stage5_validatorEvaluation.violations.length > 0) {
  console.log("Violations:", trace.stage5_validatorEvaluation.violations);
}
console.log("\nSample Draft Header & First 400 Chars:\n", trace.stage4_generatedDraft.sampleSnippet);

const draft = trace.stage4_generatedDraft;
import { executeNaturalPatientDiagnosticQuery } from "../src/lib/noctis-patient-diagnosis.ts";
const fullDraft = executeNaturalPatientDiagnosticQuery(probeCase, "NPDE-STRESS-43M-PANC") ?? "";
const lines = fullDraft.split("\n");
console.log("\n--- SEARCHING FOR 7.1 IN FULL DRAFT ---");
for (const line of lines) {
  if (line.includes("7.1")) {
    console.log("FOUND 7.1 LINE:", line);
  }
}
