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
import { hmacSha256Sync } from "./universal-crypto.ts";

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

  it("enforces NOCTIS-ICU-CRIT-048 & CRIT-048-R1 RV-isolation, dual-pathway KDIGO, DigiFab clarity, data gaps, and completeness gates", () => {
    const crit048Prompt = [
      "**Encounter ID:** NOCTIS-ICU-CRIT-048",
      "73-year-old male (Weight: 79 kg) with historical LVEF 28% and severe LV systolic dysfunction (current bedside echo: LVEF ~25%, mild RV dilation only; no acute cor pulmonale or massive pulmonary embolism).",
      "Do not introduce severe RV dilation, acute cor pulmonale, massive pulmonary embolism, or any findings from previous encounters.",
      "Current Medications: Digoxin 0.125 mg daily, Apixaban 5 mg BID, Carvedilol 12.5 mg BID, Furosemide 40 mg daily.",
      "Presentation: Acute gastrointestinal hemorrhage (melena), profound hypotension (BP 66/36 mmHg), HR 34 bpm, suspected infection (Temp 38.4°C), oliguria (urine output 110 mL over 8 hours).",
      "Labs: Na 130 mEq/L, K 6.8 mmol/L, Cl 101 mEq/L, Serum Bicarbonate 9 mEq/L, Creatinine 5.1 mg/dL (historical baseline 1.8 mg/dL measured six days earlier), Digoxin level 3.8 ng/mL.",
      "ABG: pH 7.10, PaCO2 22 mmHg, HCO3- 9 mEq/L.",
      "Unavailable / Pending Clinical Information:",
      "- Exact time of the last digoxin dose is unavailable.",
      "- Exact time of the last apixaban dose is unavailable.",
      "- Blood and urine culture results are pending.",
      "- Chest radiograph findings are unavailable.",
      "- Endoscopic identification of the GI bleeding source is pending.",
      "- Response to calcium, insulin, DigiFab, vasopressors, transfusion, or dialysis is unobserved.",
      "Required Clinical Analyses:",
      "1. Immediate resuscitation priorities and P0 emergency disposition.",
      "2. Hemodynamic MAP calculation and individualized vasopressor/fluid strategy in severe LV systolic dysfunction.",
      "3. Hyperkalemia stabilization and rapid-push calcium precautions during digitalis toxicity.",
      "4. Digoxin-specific Fab formula-based estimate versus empiric emergency dosing and timing interpretation.",
      "5. Dual-pathway KDIGO AKI staging (fold-change ratio vs. absolute-creatinine >= 4.0 mg/dL within 6 days) and separate urine-output staging.",
      "6. Anion gap and Winter's formula acid-base compensation assessment.",
      "7. Competing therapeutic conflict between life-threatening GI hemorrhage and Apixaban exposure plus complete SOAP note and fact-reconciliation matrix.",
    ].join("\n");

    const pad = buildClinicalScratchpad(crit048Prompt, "NOCTIS-ICU-CRIT-048");

    // 1. Temporal creatinine + word numeral timeframe ("six days earlier")
    assert.equal(pad.labs.creatinineMgDl, 5.1);
    assert.equal(pad.labs.baselineCreatinineMgDl, 1.8);
    assert.match(pad.labs.baselineCreatinineTimeframe ?? "", /six days earlier/i);

    // 2. Dual-pathway KDIGO (2.83x fold ratio + >= 4.0 mg/dL within 6 days = Stage 3 absolute criterion + separate 0.174 mL/kg/h UO analysis)
    assert.equal(pad.derivedCalculations.kdigoAki.crFoldRatio, 2.83);
    assert.equal(pad.derivedCalculations.kdigoAki.crAbsoluteRiseMgDl, 3.3);
    assert.equal(pad.derivedCalculations.kdigoAki.establishedStage, 3);
    assert.match(pad.derivedCalculations.kdigoAki.stageRationale, /2\.83×.*Stage 2 range/i);
    assert.match(pad.derivedCalculations.kdigoAki.stageRationale, /Stage 3.*absolute-creatinine criterion/i);
    assert.match(pad.derivedCalculations.kdigoAki.uoStagingCaveat, /0\.174 mL\/kg\/h/);
    assert.match(pad.derivedCalculations.kdigoAki.uoStagingCaveat, /Independent KDIGO UO evaluation/i);

    // 3. DigiFab clarity: 3.8 * 79 / 100 = 3.002 -> 4 vials vs empiric emergency & chronic accumulation
    assert.equal(pad.derivedCalculations.digiFabDosing.weightBasedVials, 4);
    assert.match(pad.derivedCalculations.digiFabDosing.rationale, /3\.002/);
    assert.match(pad.derivedCalculations.digiFabDosing.rationale, /empiric emergency dosing of 5–10 vials/i);
    assert.match(pad.derivedCalculations.digiFabDosing.rationale, /chronic digoxin accumulation/i);

    // 4. Zero Acute RV Failure / Cor Pulmonale contamination on "mild RV dilation" & prohibitive clauses
    const fluidConds = pad.derivedCalculations.fluidSafety.highRiskConditionsIdentified.join("; ");
    assert.match(fluidConds, /Severe LV Systolic Dysfunction|HFrEF/i);
    assert.doesNotMatch(fluidConds, /Acute RV Failure|Severe RV Dilation|Cor Pulmonale/i);
    assert.doesNotMatch(pad.markdownScratchpadSummary, /Acute RV Failure|Severe RV Dilation|Cor Pulmonale/i);

    // 5. Missing clinical data gaps captured & NEVER "None detected; full dataset provided."
    assert.equal(pad.sentinels.isLastDoseTimingMissing, true);
    const allGapsText = pad.sentinels.missingDataItems.join("\n");
    assert.match(allGapsText, /digoxin/i);
    assert.match(allGapsText, /apixaban/i);
    assert.match(allGapsText, /culture/i);
    assert.match(allGapsText, /radiograph/i);
    assert.match(allGapsText, /bleeding source|endoscop/i);
    assert.match(allGapsText, /unobserved|vasopressors|dialysis/i);
    assert.doesNotMatch(allGapsText, /Unavailable \/ Pending Clinical Information:/i);
    assert.doesNotMatch(allGapsText, /Distinguish suspected infection/i);
    assert.doesNotMatch(pad.markdownScratchpadSummary, /None detected;\s*full dataset provided/i);

    const validCompleteBody = [
      "**Encounter ID:** `NOCTIS-ICU-CRIT-048`",
      "73-year-old male (79 kg) with severe LV systolic dysfunction (historical LVEF 28%, current LVEF ~25%, mild RV dilation only).",
      "1. P0 Immediate Emergency Resuscitation: GI hemorrhage + bradycardic shock (BP 66/36 mmHg, MAP 46.0 mmHg, HR 34 bpm, Temp 38.4°C).",
      "2. Individualized Hemodynamics: Norepinephrine early to target MAP >= 65 mmHg; cautious fluids given HFrEF/LVEF 25%.",
      "3. Hyperkalemia Stabilization (K+ 6.8 mmol/L): Slow calcium gluconate infusion over 10–15 minutes with telemetry + IV insulin/dextrose.",
      "4. DigiFab: Formula estimate (3.8 × 79 / 100 = 3.002 -> 4 vials) vs empiric emergency 5–10 vials vs chronic 3–6 vials; timing unknown.",
      "5. KDIGO AKI Staging: Cr 5.1 vs baseline 1.8 (six days earlier) = 2.83× fold ratio (Stage 2) and >= 4.0 mg/dL acute rise +3.3 (Stage 3 absolute criterion); UO 110 mL/8h = 0.174 mL/kg/h evaluated separately.",
      "6. Acid-Base: Na 130, Cl 101, HCO3 9 (serum & ABG), Anion Gap 20.0 mEq/L, pH 7.10, PaCO2 22 mmHg, Winter's expected 19.5–23.5 mmHg.",
      "7. GI Hemorrhage vs Apixaban Conflict: Hold Apixaban, consider 4F-PCC/Andexanet reversal alongside urgent GI endoscopy and pRBC transfusion.",
      "Documented Missing Clinical Data: Exact time of last digoxin and apixaban doses unavailable; cultures and endoscopy pending; CXR unavailable; treatment responses unobserved.",
      "### SOAP Note",
      "Subjective — 73-year-old male with melena and shock.",
      "Objective — BP 66/36 mmHg (MAP 46 mmHg), HR 34 bpm, Temp 38.4°C, Na 130, K 6.8, Cl 101, HCO3 9, Cr 5.1 (baseline 1.8), pH 7.10, PaCO2 22, Digoxin 3.8, UO 110 mL/8h (0.174 mL/kg/h), LVEF ~25% with mild RV dilation.",
      "Assessment — P0 mixed cardiogenic/hemorrhagic/distributive shock, digoxin toxicity, severe hyperkalemia, GI hemorrhage on Apixaban, KDIGO Stage 3 AKI by absolute creatinine, HAGMA.",
      "Plan — Norepinephrine target MAP >= 65 mmHg, DigiFab, slow IV calcium, insulin/dextrose, urgent endoscopy and Apixaban reversal evaluation, pending cultures.",
      "### Independent Fact-Reconciliation Matrix",
      "| Parameter | Verified Source Input | Status |",
      "|---|---|---|",
      "| Creatinine | 5.1 mg/dL (baseline 1.8 six days earlier) | Preserved |",
    ].join("\n\n");

    const cleanAudit = auditAndEnforceClinicalDossier(
      `${validCompleteBody}\n\n${pad.markdownScratchpadSummary}`,
      crit048Prompt,
      "NOCTIS-ICU-CRIT-048"
    );
    assert.equal(cleanAudit.isApproved, true, `Unexpected violations: ${cleanAudit.violations.map((v) => v.description).join(" | ")}`);
    assert.equal(cleanAudit.mandatoryReleasePassed, true);

    // 6. Validator MUST reject:
    // (a) Injected Acute RV Failure / Cor Pulmonale
    const rvFail = auditAndEnforceClinicalDossier(
      `${validCompleteBody}\nAcute RV Failure / Cor Pulmonale (Severe RV Dilation — Avoid Large Fluid Boluses).\n\n${pad.markdownScratchpadSummary}`,
      crit048Prompt,
      "NOCTIS-ICU-CRIT-048"
    );
    assert.equal(rvFail.isApproved, false);
    assert.equal(rvFail.mandatoryReleasePassed, false);

    // (b) False "None detected; full dataset provided" claim
    const datasetFail = auditAndEnforceClinicalDossier(
      `${validCompleteBody}\nActionable Clinical Data Gaps: None detected; full dataset provided.`,
      crit048Prompt,
      "NOCTIS-ICU-CRIT-048"
    );
    assert.equal(datasetFail.isApproved, false);
    assert.equal(datasetFail.mandatoryReleasePassed, false);

    // (c) Missing SOAP Note
    const noSoapBody = validCompleteBody.replace(/### SOAP Note[\s\S]*?(?=### Independent Fact-Reconciliation Matrix)/i, "");
    const soapFail = auditAndEnforceClinicalDossier(`${noSoapBody}\n\n${pad.markdownScratchpadSummary}`, crit048Prompt, "NOCTIS-ICU-CRIT-048");
    assert.equal(soapFail.isApproved, false);
    assert.equal(soapFail.mandatoryReleasePassed, false);

    // (d) Missing Fact-Reconciliation Matrix
    const noMatrixBody = validCompleteBody.replace(/### Independent Fact-Reconciliation Matrix[\s\S]*$/i, "");
    const matrixFail = auditAndEnforceClinicalDossier(`${noMatrixBody}\n\n${pad.markdownScratchpadSummary}`, crit048Prompt, "NOCTIS-ICU-CRIT-048");
    assert.equal(matrixFail.isApproved, false);
    assert.equal(matrixFail.mandatoryReleasePassed, false);

    // (e) Incomplete numbered items / truncation
    const truncatedBody = validCompleteBody.replace(/3\. Hyperkalemia[\s\S]*?(?=Documented Missing)/i, "");
    const incompleteFail = auditAndEnforceClinicalDossier(`${truncatedBody}\n\n${pad.markdownScratchpadSummary}`, crit048Prompt, "NOCTIS-ICU-CRIT-048");
    assert.equal(incompleteFail.isApproved, false);
    assert.equal(incompleteFail.mandatoryReleasePassed, false);
  });

  it("blocks NDKRS Phase 0 Check 6/Check 22 narrative swaps, preserves resolving Cr rationale, and verifies RFC 4231 HMAC-SHA256", () => {
    // 1. RFC 4231 Test Vector 1 for HMAC-SHA256
    assert.equal(
      hmacSha256Sync("Jefe", "what do ya want for nothing?"),
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );

    // 2. Deliberate narrative swap (5.1 <-> 1.8) + wrong fold ratio (0.35x) + KDIGO understaging MUST be rejected
    const prompt =
      "A patient has a current creatinine of 5.1 mg/dL. Their historical baseline creatinine was 1.8 mg/dL, measured six days earlier. What is the creatinine ratio, and how should KDIGO AKI staging be evaluated?";
    const swappedCandidate =
      "Current serum creatinine is 1.8 mg/dL compared to a historical baseline creatinine of 5.1 mg/dL six days ago (ratio 0.35x). Therefore no acute kidney injury is present.";
    const swapAudit = auditAndEnforceClinicalDossier(swappedCandidate, prompt, "PHASE0-SWAP-TEST");
    assert.equal(swapAudit.isApproved, false);
    assert.equal(swapAudit.mandatoryReleasePassed, false);
    assert.ok(swapAudit.violations.some((v) => /Temporal Creatinine Substitution/i.test(v.description)));
    assert.ok(swapAudit.violations.some((v) => /Creatinine Fold-Ratio Mismatch/i.test(v.description)));
    assert.ok(swapAudit.violations.some((v) => /KDIGO Stage 3 Understaging/i.test(v.description)));

    // 3. Reversed patient input (current 1.8, baseline 5.1) produces clear resolving-trend rationale
    const reversedInput =
      "A patient has a current creatinine of 1.8 mg/dL. Their historical baseline creatinine was 5.1 mg/dL, measured six days earlier.";
    const revPad = buildClinicalScratchpad(reversedInput, "PHASE0-REV-INPUT");
    assert.equal(revPad.labs.creatinineMgDl, 1.8);
    assert.equal(revPad.labs.baselineCreatinineMgDl, 5.1);
    assert.equal(revPad.derivedCalculations.kdigoAki.crFoldRatio, 0.35);
    assert.equal(revPad.derivedCalculations.kdigoAki.establishedStage, "indeterminate");
    assert.match(revPad.derivedCalculations.kdigoAki.stageRationale, /resolving\/decreasing trend/i);
  });

  it("extracts height in cm, computes Devine PBW & ARDSNet 6 mL/kg TV, and triggers ARDS conservative fluid guard", () => {
    const ardsScenario =
      "A 68-year-old male (175 cm tall, actual body weight 118 kg) with severe ARDS (PaO2/FiO2 88) and septic shock has K+ 7.1 mEq/L, HR 32 bpm, BP 74/42 mmHg, and peaked T waves on ECG. The resident wants to set tidal volume to 708 mL (6 mL/kg actual weight), give IV regular insulin without calcium first, and start a continuous cisatracurium infusion before confirming deep sedation.";
    const pad = buildClinicalScratchpad(ardsScenario, "NPDE-ARDS-TEST-01");

    assert.equal(pad.demographics.patientHeightCm, 175);
    assert.equal(pad.demographics.patientWeightKg, 118);
    assert.equal(pad.derivedCalculations.ardsNetVentilation.isComputable, true);
    assert.equal(pad.derivedCalculations.ardsNetVentilation.predictedBodyWeightKg, 70.6);
    assert.equal(pad.derivedCalculations.ardsNetVentilation.tidalVolume6MlKgMl, 424);
    assert.equal(pad.derivedCalculations.ardsNetVentilation.tidalVolume4MlKgMl, 282);
    assert.equal(pad.derivedCalculations.ardsNetVentilation.ardsSeverity, "SEVERE");
    assert.equal(pad.derivedCalculations.fluidSafety.highRiskFluidOverload, true);
    assert.ok(pad.derivedCalculations.fluidSafety.highRiskConditionsIdentified.some((c) => /ARDS.*88/i.test(c)));
    assert.match(pad.markdownScratchpadSummary, /70\.6 kg/);
    assert.match(pad.markdownScratchpadSummary, /424 mL/);
    assert.ok(!pad.markdownScratchpadSummary.includes("Standard crystalloid resuscitation permissible"));
  });
});
