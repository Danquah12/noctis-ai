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
  normalizeClinicalTextForExtraction,
  validateScratchpadSourceProvenance,
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

    // Winter's formula calculates predicted range from HCO3- (15 -> 28.5-32.5) while noting missing PaCO2
    assert.equal(pad.derivedCalculations.wintersFormula.isComputable, true);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2RangeLowMmHg, 28.5);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2RangeHighMmHg, 32.5);
    assert.equal(pad.derivedCalculations.wintersFormula.measuredPaco2MmHg, null);
    assert.match(pad.derivedCalculations.wintersFormula.calibratedClinicalInterpretation, /PaCO2 was not measured/i);

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

  it("extracts formatted/table/Unicode CRIT-046 labs without loss and enforces all 12 audit invariants", () => {
    const crit046Scenario = `**Encounter ID:** NOCTIS-ICU-CRIT-046
A 69-year-old female on Apixaban presents with confirmed high-risk pulmonary embolism (BP 72/44 mmHg, HR 136 bpm, SpO₂ 86% on 15L NRB), acute intracranial hemorrhage with 6 mm midline shift, and suspected HIT (platelets 41,000/µL after UFH).

| Laboratory Test | Result |
|---|---|
| **Sodium (Na⁺)** | 130 mEq/L |
| **Potassium (K⁺)** | 5.4 mEq/L |
| **Chloride (Cl⁻)** | 99 mEq/L |
| **Serum Bicarbonate (HCO₃⁻)** | 12 mEq/L |
| **Creatinine** | 2.7 mg/dL (baseline 3 months ago: 1.3 mg/dL) |
| **Blood Glucose** | 192 mg/dL |
| **Lactate** | 9.1 mmol/L |

**ABG:** pH 7.18, PaCO₂ 30 mmHg, PaO₂ 68 mmHg, HCO₃⁻ 11 mEq/L`;

    const pad = buildClinicalScratchpad(crit046Scenario, "NOCTIS-ICU-CRIT-046");

    // Req 1-9: Single-source extraction & deterministic calculations
    assert.equal(pad.labs.sodiumMeqL, 130);
    assert.equal(pad.labs.chlorideMeqL, 99);
    assert.equal(pad.labs.potassiumMeqL, 5.4);
    assert.equal(pad.labs.serumBicarbonateMeqL, 12);
    assert.equal(pad.labs.abgBicarbonateMeqL, 11);
    assert.equal(pad.labs.bicarbonateMeqL, 12);
    assert.equal(pad.labs.creatinineMgDl, 2.7);
    assert.equal(pad.labs.baselineCreatinineMgDl, 1.3);
    assert.equal(pad.labs.baselineCreatinineTimeframe, "3 months ago");
    assert.equal(pad.labs.arterialPh, 7.18);
    assert.equal(pad.labs.paco2MmHg, 30);
    assert.equal(pad.labs.lactateMmolL, 9.1);
    assert.equal(pad.labs.glucoseMgDl, 192);

    assert.equal(pad.sentinels.isChlorideMissing, false);
    assert.equal(pad.sentinels.isBaselineCreatinineMissing, false);
    assert.equal(pad.sentinels.isArterialBloodGasMissing, false);

    assert.equal(pad.derivedCalculations.anionGap.isComputable, true);
    assert.equal(pad.derivedCalculations.anionGap.anionGapMeqL, 19);

    assert.equal(pad.derivedCalculations.wintersFormula.isComputable, true);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2RangeLowMmHg, 22.5);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2RangeHighMmHg, 26.5);
    assert.equal(pad.derivedCalculations.wintersFormula.measuredPaco2MmHg, 30);

    assert.equal(pad.derivedCalculations.kdigoAki.crFoldRatio, 2.08);
    assert.equal(pad.derivedCalculations.kdigoAki.establishedStage, 2);
    assert.equal(pad.derivedCalculations.kdigoAki.isStage3ConditionalOnAcuteTimeline, false);

    assert.match(pad.markdownScratchpadSummary, /Na\+ 130/);
    assert.match(pad.markdownScratchpadSummary, /Cl- 99/);
    assert.match(pad.markdownScratchpadSummary, /12 mmol\/L \(serum\) \/ 11 mmol\/L \(ABG\)/);
    assert.match(pad.markdownScratchpadSummary, /Baseline: 1\.3 mg\/dL \(3 months ago\)/);
    assert.match(pad.markdownScratchpadSummary, /Glucose 192 mg\/dL/);
    assert.match(pad.markdownScratchpadSummary, /Lactate 9\.1 mmol\/L/);

    // Req 10-12: Documented-to-UNMEASURED, wrong refusal, & KDIGO Stage 2/3 overstaging force rejection
    const contradictoryDossier = [
      "**Encounter ID:** `NOCTIS-ICU-CRIT-046`",
      "69-year-old female with BP 72/44 mmHg (MAP 53.3 mmHg), HR 136 bpm.",
      "Assessment: Stage 2/3 AKI based on Cr 2.7 mg/dL (baseline 1.3 mg/dL). Lactate is 9.1 mmol/L, Glucose 192 mg/dL.",
      "Anion Gap: Cannot calculate — chloride unavailable.",
      "Winter's formula cannot be computed without measured bicarbonate.",
      "### Neuro-Symbolic Clinical Scratchpad (Deterministic Audit Trail)",
      "- **Labs:** K+ 5.4 mmol/L, Na+ **[UNMEASURED]**, Cl- **[UNMEASURED]**, Cr **[UNMEASURED]**, Lactate **[UNMEASURED]**",
    ].join("\n");

    const auditFail = auditAndEnforceClinicalDossier(contradictoryDossier, crit046Scenario, "NOCTIS-ICU-CRIT-046");
    assert.equal(auditFail.isApproved, false);
    assert.equal(auditFail.mandatoryReleasePassed, false);
    assert.ok(auditFail.violationsCount >= 4);
    assert.ok(auditFail.mandatoryReleaseFailures.some((f) => /Documented-to-UNMEASURED|Narrative-vs-Scratchpad|Stage 3/i.test(f)));
  });

  it("enforces NOCTIS-ICU-CRIT-047 temporal creatinine provenance, ABG vs serum HCO3-, and grounded med gaps across formats and deliberate swap attacks", () => {
    // Format A: Historical baseline placed BEFORE current ED creatinine across multi-line sections + non-regimen anticoagulation/digoxin discussion
    const crit047Scenario = `**Encounter ID:** NOCTIS-ICU-CRIT-047
A 71-year-old male (Weight: 72 kg) presents in shock (BP 68/40 mmHg, HR 128 bpm, SpO2 87%).
Prior labs from 5 days ago: Creatinine 1.4 mg/dL.
Current Medications:
- Metformin 1000 mg BID
- Lisinopril 20 mg daily
(No history of digoxin use.)

Current ED Chemistry (BMP):
- Sodium: 128 mEq/L
- Potassium: 5.9 mEq/L
- Chloride: 94 mEq/L
- Bicarbonate: 8 mEq/L
- Creatinine: 3.6 mg/dL

Arterial Blood Gas (ABG):
- pH: 7.14
- PaCO2: 24 mmHg
- HCO3-: 7 mEq/L

Urine output: 100 mL over 8 hours.
Clinical Question: Should an anticoagulant be started, or avoid anticoagulants pending head CT?`;

    const pad = buildClinicalScratchpad(crit047Scenario, "NOCTIS-ICU-CRIT-047");

    assert.equal(pad.labs.creatinineMgDl, 3.6);
    assert.equal(pad.labs.baselineCreatinineMgDl, 1.4);
    assert.equal(pad.labs.baselineCreatinineTimeframe, "5 days ago");
    assert.equal(pad.derivedCalculations.kdigoAki.crAbsoluteRiseMgDl, 2.2);
    assert.equal(pad.derivedCalculations.kdigoAki.crFoldRatio, 2.57);
    assert.equal(pad.derivedCalculations.kdigoAki.establishedStage, 2);
    assert.match(pad.derivedCalculations.kdigoAki.stageRationale, /5 days ago.*KDIGO 7-day diagnostic window/i);

    assert.equal(pad.derivedCalculations.meanArterialPressureMmHg, 49.3);
    assert.equal(pad.derivedCalculations.kdigoAki.weightNormalizedUoMlKgHr, 0.17);

    // Anion gap uses serum HCO3- (8) -> 128 - (94 + 8) = 26
    assert.equal(pad.derivedCalculations.anionGap.isComputable, true);
    assert.equal(pad.derivedCalculations.anionGap.anionGapMeqL, 26);

    // Winter's formula uses ABG HCO3- (7) -> 1.5(7) + 8 ± 2 = 16.5-20.5 (PaCO2 24 > 20.5 -> inadequate compensation)
    assert.equal(pad.labs.serumBicarbonateMeqL, 8);
    assert.equal(pad.labs.abgBicarbonateMeqL, 7);
    assert.equal(pad.derivedCalculations.wintersFormula.isComputable, true);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2RangeLowMmHg, 16.5);
    assert.equal(pad.derivedCalculations.wintersFormula.expectedPaco2RangeHighMmHg, 20.5);
    assert.equal(pad.derivedCalculations.wintersFormula.measuredPaco2MmHg, 24);
    assert.equal(pad.derivedCalculations.wintersFormula.interpretationCategory, "SUPERIMPOSED_RESPIRATORY_ACIDOSIS");

    // Medication gaps strictly grounded in documentedMedications (NO Digoxin, NO Anticoagulant/DOAC!)
    assert.ok(pad.documentedMedications.includes("Metformin"));
    assert.ok(pad.documentedMedications.includes("Lisinopril"));
    assert.ok(!pad.documentedMedications.includes("Digoxin"));
    const gapText = pad.sentinels.missingDataItems.join("\n");
    assert.match(gapText, /Metformin/);
    assert.match(gapText, /RAASi\/MRA/);
    assert.doesNotMatch(gapText, /Digoxin/i);
    assert.doesNotMatch(gapText, /Anticoagulant\/DOAC/i);

    // Source span provenance verification on all typed observations
    const norm = normalizeClinicalTextForExtraction(crit047Scenario);
    const crCurObs = pad.observations.find((o) => o.analyte === "creatinine" && o.temporalRole === "current");
    const crBaseObs = pad.observations.find((o) => o.analyte === "creatinine" && o.temporalRole === "historical_baseline");
    assert.ok(crCurObs && crCurObs.value === 3.6);
    assert.ok(crBaseObs && crBaseObs.value === 1.4 && crBaseObs.observationTime === "5 days ago");
    assert.equal(norm.slice(crCurObs.sourceSpan.start, crCurObs.sourceSpan.end), crCurObs.sourceSpan.rawText);
    assert.equal(validateScratchpadSourceProvenance(pad).length, 0);

    // Format B: Inline parenthetical without the word "baseline" ("Creatinine 3.6 mg/dL (1.4 mg/dL 5 days ago)")
    const inlineNoBaselineWord = `65yo male BP 70/40. Creatinine 3.6 mg/dL (1.4 mg/dL 5 days ago). Na 128, Cl 94, HCO3 8. ABG pH 7.14, PaCO2 24, HCO3 7.`;
    const padInline = buildClinicalScratchpad(inlineNoBaselineWord, "NOCTIS-ICU-CRIT-047-INLINE");
    assert.equal(padInline.labs.creatinineMgDl, 3.6);
    assert.equal(padInline.labs.baselineCreatinineMgDl, 1.4);
    assert.equal(padInline.labs.baselineCreatinineTimeframe, "5 days ago");

    // Deliberate current/baseline swap attack: corrupted scratchpad (current overwritten by 1.4, baseline nulled) MUST fail closed!
    const corruptedSwapPad: NeuroSymbolicClinicalScratchpad = {
      ...pad,
      labs: { ...pad.labs, creatinineMgDl: 1.4, baselineCreatinineMgDl: null, baselineCreatinineTimeframe: null },
      sentinels: { ...pad.sentinels, isBaselineCreatinineMissing: true },
    };
    const swapAudit = auditAndEnforceClinicalDossier(
      "71-year-old male BP 68/40 (MAP 49.3 mmHg), HR 128 bpm, Cr 3.6 mg/dL (baseline 1.4 mg/dL 5 days ago).",
      crit047Scenario,
      "NOCTIS-ICU-CRIT-047",
      corruptedSwapPad
    );
    assert.equal(swapAudit.isApproved, false);
    assert.equal(swapAudit.mandatoryReleasePassed, false);
    assert.ok(
      swapAudit.mandatoryReleaseFailures.some((f) => /Temporal Creatinine Substitution/i.test(f)),
      "Validator must independently catch corrupted current/baseline swap instead of trusting extracted scratchpad"
    );
  });
});
