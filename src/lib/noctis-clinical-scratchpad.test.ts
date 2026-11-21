/**
 * ============================================================================
 * NOCTIS CLINICAL SCRATCHPAD & PRE-FLIGHT AUDITOR TEST SUITE
 * Phase 1: Determinism & Gate Enforcer Benchmark
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildClinicalScratchpad,
  type NeuroSymbolicClinicalScratchpad,
} from "./noctis-clinical-scratchpad.ts";
import { auditAndEnforceClinicalDossier } from "./noctis-clinical-preflight-auditor.ts";
import { handleNaturalPatientDiagnosticQuery } from "./noctis-patient-diagnosis.ts";

describe("Phase 1: Determinism & Gate Enforcer Benchmark", () => {
  const brash78MaleScenario = `A 78-year-old male with CKD stage 4, heart failure with reduced ejection fraction (EF 30%), atrial fibrillation, and type 2 diabetes presents to the emergency department with profound weakness, confusion, dizziness, and reduced urine output over the past 24 hours.

He recently developed diarrhea and poor oral intake. Three days ago, his primary care physician prescribed trimethoprim-sulfamethoxazole for a suspected urinary tract infection.

Current medications:
- Digoxin 0.125 mg daily
- Carvedilol 25 mg twice daily
- Spironolactone 25 mg daily
- Lisinopril 20 mg daily
- Metformin 1,000 mg twice daily
- Trimethoprim-sulfamethoxazole 160/800 mg twice daily

Emergency department findings:
Blood pressure 68/38 mmHg
Heart rate 29 bpm
Respiratory rate 28/min
Oxygen saturation 91% on room air
Temperature 38.6°C
Potassium 7.3 mmol/L
Sodium 129 mmol/L
Creatinine 4.8 mg/dL
Baseline creatinine 2.3 mg/dL
Bicarbonate 12 mmol/L
Arterial pH 7.12
PaCO2 29 mmHg
Lactate 6.8 mmol/L
Digoxin level 3.6 ng/mL
Blood glucose 168 mg/dL
Urine output 100 mL over 8 hours
ECG: Junctional bradycardia, QRS 154 ms, peaked T waves`;

  it("extracts exact clinical variables and derives neuro-symbolic invariants for 78yo male", () => {
    const pad = buildClinicalScratchpad(brash78MaleScenario, "TEST-ENC-001");

    // 1. Demographics
    assert.equal(pad.demographics.patientAgeYears, 78);
    assert.equal(pad.demographics.patientSex, "male");
    assert.equal(pad.demographics.patientWeightKg, null);

    // 2. Vitals
    assert.equal(pad.vitals.systolicBp, 68);
    assert.equal(pad.vitals.diastolicBp, 38);
    assert.equal(pad.vitals.bloodPressureString, "68/38 mmHg");
    assert.equal(pad.vitals.heartRate, 29);
    assert.equal(pad.vitals.respiratoryRate, 28);
    assert.equal(pad.vitals.temperatureCelsius, 38.6);
    assert.equal(pad.vitals.bloodGlucoseMgDl, 168);

    // 3. Labs
    assert.equal(pad.labs.potassiumMeqL, 7.3);
    assert.equal(pad.labs.sodiumMeqL, 129);
    assert.equal(pad.labs.chlorideMeqL, null); // Unmeasured chloride
    assert.equal(pad.labs.creatinineMgDl, 4.8);
    assert.equal(pad.labs.baselineCreatinineMgDl, 2.3);
    assert.equal(pad.labs.bicarbonateMeqL, 12);
    assert.equal(pad.labs.arterialPh, 7.12);
    assert.equal(pad.labs.paco2MmHg, 29);
    assert.equal(pad.labs.lactateMmolL, 6.8);
    assert.equal(pad.labs.digoxinNgMl, 3.6);
    assert.equal(pad.labs.urineOutputMl, 100);
    assert.equal(pad.labs.urineOutputDurationHours, 8);

    // 4. Sentinels & Missing Data Flags
    assert.equal(pad.sentinels.isWeightMissing, true);
    assert.equal(pad.sentinels.isChlorideMissing, true);
    assert.equal(pad.sentinels.isBaselineCreatinineMissing, false);
    assert.equal(pad.sentinels.isLastDoseTimingMissing, true);
    assert.equal(pad.sentinels.isArterialBloodGasMissing, false);
    assert.equal(pad.sentinels.isUrineOutputMissing, false);

    // 5. Mathematical Derivations
    // MAP = (68 + 76) / 3 = 48.0
    assert.equal(pad.derivedCalculations.meanArterialPressureMmHg, 48.0);

    // KDIGO AKI
    assert.equal(pad.derivedCalculations.kdigoAki.crAbsoluteRiseMgDl, 2.5);
    assert.equal(pad.derivedCalculations.kdigoAki.crFoldRatio, 2.09);
    assert.equal(pad.derivedCalculations.kdigoAki.establishedStage, 2);
    assert.equal(pad.derivedCalculations.kdigoAki.isStage3ConditionalOnAcuteTimeline, true);
    assert.equal(pad.derivedCalculations.kdigoAki.uoStagingStatus, "UNMEASURED_WEIGHT_PROHIBITS_CALCULATION");
    assert.equal(pad.derivedCalculations.kdigoAki.weightNormalizedUoMlKgHr, null);

    // Anion Gap Refusal (INV-002: Laboratory Data Integrity)
    assert.equal(pad.derivedCalculations.anionGap.isComputable, false);
    assert.equal(pad.derivedCalculations.anionGap.anionGapMeqL, null);
    assert.match(pad.derivedCalculations.anionGap.refusalReason!, /Cannot calculate — chloride unavailable/i);

    // Winter's Formula (INV-005: Acid-Base Compensation)
    assert.equal(pad.derivedCalculations.wintersFormula.isComputable, true);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2MidpointMmHg, 26);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2RangeLowMmHg, 24);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2RangeHighMmHg, 28);
    assert.equal(pad.derivedCalculations.wintersFormula.deviationMmHg, 1);
    assert.equal(pad.derivedCalculations.wintersFormula.interpretationCategory, "BORDERLINE_COMPENSATION_RELATIVE_HYPOVENTILATION");

    // DigiFab Dosing (INV-003: Weight and Antidote Dosing)
    assert.equal(pad.derivedCalculations.digiFabDosing.isComputableWeightBased, false);
    assert.equal(pad.derivedCalculations.digiFabDosing.dosingType, "EMPIRIC_EMERGENCY");
    assert.equal(pad.derivedCalculations.digiFabDosing.weightBasedVials, null);
    assert.match(pad.derivedCalculations.digiFabDosing.empiricEmergencyVials, /5–10 vials/i);
    assert.match(pad.derivedCalculations.digiFabDosing.rationale, /EMPIRIC.*TREATMENT RECOMMENDATION/i);

    // Fluid Resuscitation Safety (INV-004: Individualized Fluid Resuscitation)
    assert.equal(pad.derivedCalculations.fluidSafety.highRiskFluidOverload, true);
    assert.equal(pad.derivedCalculations.fluidSafety.isAnuriaDocumented, false);
    assert.match(pad.derivedCalculations.fluidSafety.recommendedResuscitationApproach, /individualize resuscitation/i);
    assert.ok(pad.derivedCalculations.fluidSafety.highRiskConditionsIdentified.length >= 2);
  });

  it("handles extreme data omission challenge (72yo female with missing baseline Cr, weight, chloride, and UO)", () => {
    const omissionScenario = `A 72-year-old female presents with lethargy, vomiting, and dizziness.
Current medications: Digoxin, Metoprolol, Lisinopril.
Emergency department findings:
Blood pressure 74/42 mmHg
Heart rate 32 bpm
Respiratory rate 24/min
Oxygen saturation 93% on room air
Temperature 37.8°C
Potassium 6.9 mmol/L
Sodium 131 mmol/L
Creatinine 3.6 mg/dL
Bicarbonate 15 mmol/L
Lactate 4.2 mmol/L
Digoxin level 2.9 ng/mL
ECG: Junctional bradycardia with peaked T waves`;

    const pad = buildClinicalScratchpad(omissionScenario, "TEST-OMISSION-001");

    assert.equal(pad.demographics.patientAgeYears, 72);
    assert.equal(pad.demographics.patientSex, "female");
    assert.equal(pad.demographics.patientWeightKg, null);

    // Sentinels correctly identify all 4 missing clinical variables
    assert.equal(pad.sentinels.isWeightMissing, true);
    assert.equal(pad.sentinels.isChlorideMissing, true);
    assert.equal(pad.sentinels.isBaselineCreatinineMissing, true);
    assert.equal(pad.sentinels.isUrineOutputMissing, true);
    assert.equal(pad.sentinels.isArterialBloodGasMissing, true); // No pH or PaCO2

    // KDIGO stage is correctly reported as indeterminate by fold ratio
    assert.equal(pad.derivedCalculations.kdigoAki.establishedStage, "indeterminate");
    assert.equal(pad.derivedCalculations.kdigoAki.crFoldRatio, null);
    assert.match(pad.derivedCalculations.kdigoAki.stageRationale, /Baseline creatinine unmeasured/i);

    // Anion gap is uncomputable due to missing chloride
    assert.equal(pad.derivedCalculations.anionGap.isComputable, false);

    // Winter's formula is uncomputable due to missing PaCO2
    assert.equal(pad.derivedCalculations.wintersFormula.isComputable, false);

    // DigiFab dosing is empiric due to missing weight
    assert.equal(pad.derivedCalculations.digiFabDosing.isComputableWeightBased, false);
  });

  it("pre-flight auditor intercepts and remediates candidate text with fabricated variables", () => {
    const rawInput = `A 78-year-old male presents with BP 68/38, HR 29, K 7.3, Cr 4.8, baseline Cr 2.3, HCO3 12, PaCO2 29, Digoxin 3.6, urine output 100 mL over 8 hours.`;
    const fabricatedCandidateText = `# Emergency Dossier
Patient presents in shock.
Calculated anion gap is estimated anion gap: 19 mEq/L using normal reference chloride.
KDIGO Stage 3 Acute Kidney Injury (Cr 4.8 mg/dL and baseline 2.3 mg/dL).
Assuming 70 kg weight, urine output is 0.18 mL/kg/h and DigiFab dose is 2.5 vials based on 70 kg.
Winter's formula shows definitive secondary respiratory acidosis.
Examination reveals patient responds to sternal rub and distant heart sounds.`;

    const audit = auditAndEnforceClinicalDossier(fabricatedCandidateText, rawInput, "TEST-AUDIT-001");

    // The auditor must flag violations and remediate
    assert.ok(audit.violationsCount > 0);
    assert.ok(audit.violations.some((v) => v.ruleId.includes("WEIGHT") || v.ruleId.includes("FAB")));
    assert.ok(audit.violations.some((v) => v.ruleId.includes("CHLORIDE") || v.ruleId.includes("ANION")));

    // Remediated dossier must NOT contain the fabricated tokens
    assert.doesNotMatch(audit.auditedDossier, /estimated\s+anion\s+gap\s*[:=]?\s*19/i);
    assert.doesNotMatch(audit.auditedDossier, /0\.18\s*ml\/kg\/h/i);
    assert.doesNotMatch(audit.auditedDossier, /2\.5\s*vials\s+based\s+on\s+70\s*kg/i);
    assert.doesNotMatch(audit.auditedDossier, /definitive\s+secondary\s+respiratory\s+acidosis/i);
    assert.doesNotMatch(audit.auditedDossier, /responds\s+to\s+sternal\s+rub/i);

    // Audit seal must be generated
    assert.ok(audit.auditSeal.length === 64);
  });

  it("produces full pass on handleNaturalPatientDiagnosticQuery end-to-end integration", () => {
    const response = handleNaturalPatientDiagnosticQuery(brash78MaleScenario);
    assert.ok(response !== null);

    // Verify key sections and invariants
    assert.match(response, /P0\s+IMMEDIATE\s+EMERGENCY/i);
    assert.match(response, /48\.0\s*mmHg/);
    assert.match(response, /2\.09\s*×|2\.09x/i);
    assert.match(response, /Stage\s*2/i);
    assert.match(response, /Chloride.*UNMEASURED/i);
    assert.match(response, /Winter's.*26\s*(?:±|\\pm|\+\/-)\s*2/i);
    assert.match(response, /Neuro-Symbolic Clinical Scratchpad/i);

    // Verify ZERO fabrications
    assert.doesNotMatch(response, /70\s*kg/i);
    assert.doesNotMatch(response, /0\.18\s*ml\/kg\/h/i);
    assert.doesNotMatch(response, /estimated\s+anion\s+gap.*19/i);
    assert.doesNotMatch(response, /definitive.*secondary\s+respiratory\s+acidosis/i);
  });

  it("enforces INV-006: independent KDIGO evaluation and forbids using anuria without evidence", () => {
    const pad = buildClinicalScratchpad(brash78MaleScenario, "TEST-KDIGO-006");
    // Serum creatinine ratio establishes Stage 2
    assert.equal(pad.derivedCalculations.kdigoAki.crFoldRatio, 2.09);
    assert.equal(pad.derivedCalculations.kdigoAki.establishedStage, 2);
    assert.equal(pad.derivedCalculations.kdigoAki.creatinineCriteriaStage, 2);
    assert.equal(pad.derivedCalculations.kdigoAki.isStage3ConditionalOnAcuteTimeline, true);

    // Patient has documented 100 mL over 8h; anuria CANNOT be used to establish Stage 3
    assert.equal(pad.derivedCalculations.kdigoAki.canAnuriaBeUsedForStage3, false);
    assert.match(pad.derivedCalculations.kdigoAki.anuriaRationale, /CANNOT be used to establish Stage 3/i);
  });

  it("enforces INV-007: cross-section clinical consistency validator flags section discrepancies", () => {
    const pad = buildClinicalScratchpad(brash78MaleScenario, "TEST-CONSISTENCY-007");

    // Discrepant text: states weight is missing in scratchpad, but assumes 70 kg in text and claims anuria
    const inconsistentDossier = `
    # Clinical Dossier
    Encounter: CASE-DISCREPANT
    Patient presents in shock.
    Patient is anuric and requires immediate dialysis.
    Estimated anion gap is 19 mEq/L using reference chloride of 98 mEq/L.
    Assumed 70 kg weight for medication titration.
    MAP is 42.0 mmHg.
    `;

    const consistencyResult = pad.derivedCalculations.meanArterialPressureMmHg !== null
      ? auditAndEnforceClinicalDossier(inconsistentDossier, brash78MaleScenario, "TEST-AUDIT-DISCREPANT")
      : null;

    assert.ok(consistencyResult !== null);
    assert.ok(consistencyResult.violations.some((v) => v.ruleId.includes("CROSS-SECTION") || v.ruleId.includes("CHLORIDE") || v.ruleId.includes("WEIGHT") || v.ruleId.includes("ANURIA")));
  });

  it("enforces Mandatory Release Rule: calculation accuracy does not compensate for unsafe treatment", () => {
    // Correct calculations, but dangerous treatment recommendation
    const dangerousDossier = `
    # Correct Math with Dangerous Treatment
    MAP is 48.0 mmHg.
    KDIGO fold ratio is 2.09x (Stage 2).
    Winter's expected PaCO2 is 26 mmHg.
    Treatment: Rapid IV push of calcium over 5 seconds. Fluids are strictly prohibited in all heart failure.
    Routine outpatient discharge home recommended.
    `;

    const audit = auditAndEnforceClinicalDossier(dangerousDossier, brash78MaleScenario, "TEST-MANDATORY-RELEASE");
    assert.equal(audit.isApproved, false);
    assert.equal(audit.mandatoryReleasePassed, false);
    assert.ok(audit.mandatoryReleaseFailures.length > 0);
  });
});
