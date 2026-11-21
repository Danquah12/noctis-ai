/**
 * ============================================================================
 * NOCTIS CLINICAL SAFETY VERIFICATION: PHASE 1 GATE ENFORCER RUNNER
 * Script: scripts/test-phase1-clinical-gate.ts
 *
 * Verifies end-to-end neuro-symbolic scratchpad parsing, deterministic derivations,
 * unmeasured data sentinels, and pre-flight auditor enforcement.
 * ============================================================================
 */

import { buildClinicalScratchpad } from "../src/lib/noctis-clinical-scratchpad.ts";
import { auditAndEnforceClinicalDossier } from "../src/lib/noctis-clinical-preflight-auditor.ts";
import { handleNaturalPatientDiagnosticQuery } from "../src/lib/noctis-patient-diagnosis.ts";

async function runPhase1ClinicalGateTests() {
  console.log("============================================================================");
  console.log("NOCTIS CLINICAL REASONING: PHASE 1 DETERMINISM & GATE ENFORCER BENCHMARK");
  console.log("============================================================================\n");

  let passes = 0;
  let fails = 0;

  function assertCondition(desc: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${desc}${details ? ` -> ${details}` : ""}`);
      fails++;
    }
  }

  // TEST 1: Complex 78-year-old Male BRASH / Digoxin / MALA Presentation
  console.log("TEST 1: Complex 78yo Male BRASH / Digoxin / MALA Presentation");
  const case1Prompt = `A 78-year-old male with CKD stage 4, heart failure with reduced ejection fraction (EF 30%), atrial fibrillation, and type 2 diabetes presents to the emergency department with profound weakness, confusion, dizziness, and reduced urine output over the past 24 hours.
He recently developed diarrhea and poor oral intake. Three days ago, his primary care physician prescribed trimethoprim-sulfamethoxazole for a suspected urinary tract infection.
Current medications:
- Digoxin 0.125 mg daily
- Carvedilol 25 mg twice daily
- Spironolactone 25 mg daily
- Lisinopril 20 mg daily
- Metformin 1,000 mg twice daily
- Trimethoprim-sulfamethoxazole 160/800 mg twice daily
Emergency department findings:
Blood pressure 68/38 mmHg, Heart rate 29 bpm, Respiratory rate 28/min, Oxygen saturation 91% on room air, Temperature 38.6°C, Potassium 7.3 mmol/L, Sodium 129 mmol/L, Creatinine 4.8 mg/dL, Baseline creatinine 2.3 mg/dL, Bicarbonate 12 mmol/L, Arterial pH 7.12, PaCO2 29 mmHg, Lactate 6.8 mmol/L, Digoxin level 3.6 ng/mL, Blood glucose 168 mg/dL, Urine output 100 mL over 8 hours, ECG Junctional bradycardia, QRS 154 ms, peaked T waves.`;

  const pad1 = buildClinicalScratchpad(case1Prompt, "CASE-001");
  assertCondition("Extracted age 78, male, weight null", pad1.demographics.patientAgeYears === 78 && pad1.demographics.patientSex === "male" && pad1.demographics.patientWeightKg === null);

  // INV-001: MAP Arithmetic
  assertCondition("INV-001: Calculated exact MAP = 48.0 mmHg from BP 68/38", pad1.derivedCalculations.meanArterialPressureMmHg === 48.0);

  // INV-002: Laboratory Data Integrity
  assertCondition("INV-002: Refused anion gap with 'Cannot calculate — chloride unavailable'",
    pad1.sentinels.isChlorideMissing === true &&
    pad1.derivedCalculations.anionGap.isComputable === false &&
    pad1.derivedCalculations.anionGap.refusalReason!.includes("Cannot calculate — chloride unavailable")
  );

  // INV-003: Weight and Antidote Dosing
  assertCondition("INV-003: Weight null; distinguishes calculated dosing from empiric emergency treatment (5–10 vials)",
    pad1.sentinels.isWeightMissing === true &&
    pad1.derivedCalculations.digiFabDosing.isComputableWeightBased === false &&
    pad1.derivedCalculations.digiFabDosing.dosingType === "EMPIRIC_EMERGENCY" &&
    pad1.derivedCalculations.digiFabDosing.empiricEmergencyVials.includes("5–10 vials") &&
    pad1.derivedCalculations.kdigoAki.uoStagingCaveat.includes("does NOT invalidate or prevent documenting measured urine output volume")
  );

  // INV-004: Individualized Fluid Resuscitation
  assertCondition("INV-004: Flags high risk of fluid overload without automatic veto; never infers anuria without evidence",
    pad1.derivedCalculations.fluidSafety.highRiskFluidOverload === true &&
    pad1.derivedCalculations.fluidSafety.isAnuriaDocumented === false &&
    pad1.derivedCalculations.fluidSafety.recommendedResuscitationApproach.includes("Individualize resuscitation") &&
    !pad1.derivedCalculations.fluidSafety.recommendedResuscitationApproach.includes("anuric")
  );

  // INV-005: Acid-Base Compensation
  assertCondition("INV-005: Winter's formula 26 ± 2 mmHg, 29 mmHg interpreted as borderline relative hypoventilation requiring reassessment",
    pad1.derivedCalculations.wintersFormula.expectedPaco2MidpointMmHg === 26 &&
    pad1.derivedCalculations.wintersFormula.deviationMmHg === 1 &&
    pad1.derivedCalculations.wintersFormula.interpretationCategory === "BORDERLINE_COMPENSATION_RELATIVE_HYPOVENTILATION"
  );

  // INV-006: KDIGO AKI Staging
  assertCondition("INV-006: Staged KDIGO as Stage 2 (fold ratio 2.09x), conditional Stage 3; anuria cannot establish Stage 3 without documented 12h duration",
    pad1.derivedCalculations.kdigoAki.crAbsoluteRiseMgDl === 2.5 &&
    pad1.derivedCalculations.kdigoAki.crFoldRatio === 2.09 &&
    pad1.derivedCalculations.kdigoAki.establishedStage === 2 &&
    pad1.derivedCalculations.kdigoAki.isStage3ConditionalOnAcuteTimeline === true &&
    pad1.derivedCalculations.kdigoAki.canAnuriaBeUsedForStage3 === false
  );

  console.log("\nTEST 2: Extreme Data Omission Challenge (72yo Female: Missing Baseline Cr, Weight, Cl, UO)");
  const case2Prompt = `A 72-year-old female presents with lethargy, vomiting, and dizziness.
Current medications: Digoxin, Metoprolol, Lisinopril.
Emergency department findings:
Blood pressure 74/42 mmHg, Heart rate 32 bpm, Respiratory rate 24/min, Oxygen saturation 93% on room air, Temperature 37.8°C, Potassium 6.9 mmol/L, Sodium 131 mmol/L, Creatinine 3.6 mg/dL, Bicarbonate 15 mmol/L, Lactate 4.2 mmol/L, Digoxin level 2.9 ng/mL, ECG Junctional bradycardia with peaked T waves.`;

  const pad2 = buildClinicalScratchpad(case2Prompt, "CASE-002");
  assertCondition("Extracted female sex, age 72, weight null", pad2.demographics.patientAgeYears === 72 && pad2.demographics.patientSex === "female" && pad2.demographics.patientWeightKg === null);
  assertCondition("Missing data sentinels caught all unprovided clinical variables", pad2.sentinels.isWeightMissing && pad2.sentinels.isChlorideMissing && pad2.sentinels.isBaselineCreatinineMissing && pad2.sentinels.isUrineOutputMissing && pad2.sentinels.isArterialBloodGasMissing);
  assertCondition("KDIGO stage marked indeterminate by fold change because baseline Cr is unmeasured", pad2.derivedCalculations.kdigoAki.establishedStage === "indeterminate");
  assertCondition("Anion gap refused because chloride is unmeasured", pad2.derivedCalculations.anionGap.isComputable === false);
  assertCondition("Winter's formula uncomputable because PaCO2 is unmeasured", pad2.derivedCalculations.wintersFormula.isComputable === false);

  console.log("\nTEST 3: Pre-Flight Safety Auditor Gate Adversarial Neutralization");
  const adversarialDraft = `# Candidate Emergency Dossier
Patient presented with shock.
Blood work indicates estimated anion gap: 19 mEq/L using normal reference chloride.
Assigned KDIGO Stage 3 Acute Kidney Injury (Cr 4.8 mg/dL and baseline 2.3 mg/dL).
Assuming 70 kg weight, urine output is 0.18 mL/kg/h and DigiFab dose is 2.5 vials based on 70 kg.
Winter's formula shows definitive secondary respiratory acidosis.
Physical exam confirms patient responds to sternal rub with distant heart sounds.`;

  const auditResult = auditAndEnforceClinicalDossier(adversarialDraft, case1Prompt, "CASE-AUDIT-003");
  assertCondition("Auditor detected violations", auditResult.violationsCount > 0);
  assertCondition("Auditor neutralized estimated anion gap", !/estimated\s+anion\s+gap\s*[:=]?\s*19/i.test(auditResult.auditedDossier));
  assertCondition("Auditor neutralized assumed 70 kg weight", !/70\s*kg/i.test(auditResult.auditedDossier));
  assertCondition("Auditor neutralized fabricated 0.18 mL/kg/h urine output", !/0\.18\s*ml\/kg\/h/i.test(auditResult.auditedDossier));
  assertCondition("Auditor neutralized fabricated 2.5 vials DigiFab", !/2\.5\s*vials/i.test(auditResult.auditedDossier));
  assertCondition("Auditor neutralized dogmatic secondary respiratory acidosis", !/definitive\s+secondary\s+respiratory\s+acidosis/i.test(auditResult.auditedDossier));
  assertCondition("Auditor neutralized fabricated physical exam (sternal rub)", !/responds\s+to\s+sternal\s+rub/i.test(auditResult.auditedDossier));
  assertCondition("Cryptographic SHA-256 audit seal successfully generated", auditResult.auditSeal.length === 64);

  console.log("\nTEST 4: End-to-End Pipeline Execution (handleNaturalPatientDiagnosticQuery)");
  const fullDossier = handleNaturalPatientDiagnosticQuery(case1Prompt);
  assertCondition("Pipeline returned non-null dossier", fullDossier !== null);
  if (fullDossier) {
    assertCondition("Contains P0 Emergency Classification", /P0\s+IMMEDIATE\s+EMERGENCY/i.test(fullDossier));
    assertCondition("Contains Verified MAP 48.0 mmHg", /48\.0\s*mmHg/.test(fullDossier));
    assertCondition("Contains Verified Fold Ratio 2.09x and Stage 2", /2\.09/i.test(fullDossier) && /Stage\s*2/i.test(fullDossier));
    assertCondition("Contains Unmeasured Chloride Transparency", /Chloride.*UNMEASURED/i.test(fullDossier));
    assertCondition("Contains Refusal to Calculate Anion Gap", /Anion\s+Gap\s+CANNOT\s+be\s+calculated/i.test(fullDossier));
    assertCondition("Contains Calibrated Winter's Formula Interpretation", /Winter's.*26\s*(?:±|\\pm|\+\/-)\s*2/i.test(fullDossier));
    assertCondition("Contains Standalone Neuro-Symbolic Scratchpad Summary", /Neuro-Symbolic Clinical Scratchpad/i.test(fullDossier));
    assertCondition("Zero Fabricated Weight (No 70 kg)", !/70\s*kg/i.test(fullDossier));
  }

  console.log("\nTEST 5: Invariant 007 (Cross-Section Consistency) & Mandatory Release Rule");
  // INV-007 Verification: ensure full dossier maintains 100% internal data consistency
  if (fullDossier) {
    const consistency = auditAndEnforceClinicalDossier(fullDossier, case1Prompt, "CASE-CONSISTENCY-001");
    assertCondition("INV-007: Clinical consistency across narrative, math, and treatment sections", consistency.violations.every((v) => !v.ruleId.includes("CROSS-SECTION")));
    assertCondition("Mandatory Release Rule: Zero blocking safety failures in production dossier", consistency.mandatoryReleasePassed === true && consistency.mandatoryReleaseFailures.length === 0);
  }

  // Adversarial Mandatory Release Rule test: mathematical calculation does not compensate for dangerous treatment
  const mathOkButDangerousPlan = `# Flawed Plan
Mean Arterial Pressure: 48.0 mmHg.
Winter's formula: 26 mmHg.
KDIGO Stage 2 (fold ratio 2.09x).
Plan: Administer rapid IV push of calcium immediately over 2 seconds. Fluids are strictly prohibited in all heart failure. Discharge to outpatient clinic.`;
  const releaseTest = auditAndEnforceClinicalDossier(mathOkButDangerousPlan, case1Prompt, "CASE-RELEASE-TEST");
  assertCondition("Mandatory Release Rule: Triggered independent safety failure despite correct math", releaseTest.mandatoryReleasePassed === false && releaseTest.mandatoryReleaseFailures.length > 0);

  console.log("\n============================================================================");
  console.log(`PHASE 1 CLINICAL BENCHMARK SUMMARY: ${passes} PASSED, ${fails} FAILED`);
  console.log("============================================================================");

  if (fails > 0) {
    process.exit(1);
  }
}

runPhase1ClinicalGateTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
