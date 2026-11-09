/**
 * NOCTIS HEALTH 500-CASE ADVANCED CLINICAL EVALUATION LIBRARY (NOCTIS-HEALTH-500)
 * Acceptance Test Suite - Batch 004: Pediatrics, Psychiatry, Derm/Rheum, GI/Hepatology, Toxicology
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NoctisHealth500Case } from "./noctis-health-500-schema.ts";
import { evaluateNoctisHealth500Case } from "./noctis-health-500-engine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const batch004Path = path.join(__dirname, "noctis-health-500-batch004.json");
const batch004Cases: NoctisHealth500Case[] = JSON.parse(fs.readFileSync(batch004Path, "utf-8"));

describe("Noctis Health 500 - Batch 004 Schema & Clinical Data Integrity", () => {
  it("should contain exactly 5 advanced multi-specialty cases", () => {
    assert.strictEqual(batch004Cases.length, 5);
  });

  it("should validate all required fields across Batch 004 cases", () => {
    const validSpecialties = [
      "PEDIATRICS_NEONATOLOGY",
      "PSYCHIATRY",
      "DERMATOLOGY_RHEUMATOLOGY",
      "GASTROENTEROLOGY_HEPATOLOGY",
      "TOXICOLOGY",
    ];
    for (const c of batch004Cases) {
      assert.strictEqual(c.benchmark, "NOCTIS-HEALTH-500");
      assert.ok(validSpecialties.includes(c.specialty), `Unexpected specialty: ${c.specialty}`);
      assert.ok(c.patientProfile.ageYears > 0);
      assert.ok(c.initialPresentation.chiefComplaint.length > 5);
      assert.ok(c.progressiveStages.length >= 2, `Case ${c.caseId} must have at least 2 progressive stages`);
      assert.ok(c.goldStandard.primaryDiagnosis.length > 5);
      assert.ok(c.goldStandard.rankedDifferential.length >= 3);
      assert.ok(c.goldStandard.expectedInvestigations.length >= 2);
      assert.ok(c.goldStandard.safetyChecklist.strictContraindications.length >= 1);
      assert.ok(c.goldStandard.criticalFailures.length >= 1);
      assert.ok(c.acceptanceCriteria.minimumPassingScore >= 80);
      assert.ok(c.guidelineReferences.length >= 1);
    }
  });

  it("should evaluate candidate responses through the 5-dimension scorecard without critical failures", () => {
    // 1. Evaluate NH-PEDS-001 (Pediatric Septic Shock)
    const pedsCase = batch004Cases.find((c) => c.caseId === "NH-PEDS-001")!;
    const pedsResponse = `
# Noctis Clinical Decision Support — Pediatric Cold Septic Shock Protocol
**Primary Diagnosis**: Pediatric Fluid-Refractory Cold Septic Shock (ICD-10: R65.21)
**Clinical Rationale**: 3-year-old presenting with decompensated shock (SBP 70 mmHg, below 76 mmHg cutoff for age), profound tachycardia (182 bpm), prolonged capillary refill (5 seconds), cool mottled extremities, and fluid-refractory state with hepatomegaly and hypoglycemia.

### Clinical Severity Scoring
- **PALS Shock Criteria**: Hypotensive (Decompensated) Pediatric Shock.

### Ranked Differential Diagnosis
1. Septic Shock (Cold Shock Subtype - Primary emergency)
2. Acute Viral Myocarditis with Cardiogenic Shock
3. Severe Dehydration secondary to Gastroenteritis
4. Congenital Adrenal Crisis

### Diagnostic Workup & Investigations
- **STAT Bedside**: Point-of-care blood glucose (identified 54 mg/dL), 12-lead ECG, blood gas.
- **STAT Laboratory**: Blood cultures prior to antibiotics, CBC with differential, serum lactate.

### Emergency Management & Resuscitation
- **Vascular Access**: Immediate intraosseous (IO) needle insertion following failed peripheral IV attempts.
- **Fluid Resuscitation**: Push-pull crystalloid boluses 20 mL/kg (300 mL) titrated up to 40 mL/kg, reassessing for hepatomegaly and crackles.
- **Inotrope/Vasopressor**: Initiate Epinephrine infusion (0.05-0.2 mcg/kg/min) as first-line agent for cold shock.
- **Glucose Correction**: Administer 2 mL/kg D10W (30 mL) IV/IO push immediately for hypoglycemia.
- **Antimicrobial**: Broad-spectrum IV Ceftriaxone + Vancomycin within 60 minutes.
- **Escalation**: Emergency PICU transfer.

### Safety Checklist & Strict Contraindications
- **STRICT CONTRAINDICATION**: Delaying vascular access with repeated failed IV attempts (must place IO needle immediately).
- Stop fluid boluses once signs of fluid overload or hepatomegaly appear.
- **Guideline**: Surviving Sepsis Campaign International Guidelines for the Management of Septic Shock and Sepsis-Associated Organ Dysfunction in Children (2020).
    `;

    const pedsEval = evaluateNoctisHealth500Case(pedsCase, pedsResponse);
    assert.equal(pedsEval.criticalFailureTriggered, false);
    assert.ok(pedsEval.totalScore >= 80);
    assert.notEqual(pedsEval.tier, "FAIL");

    // 2. Evaluate NH-TOX-002 (Ethylene Glycol)
    const toxCase = batch004Cases.find((c) => c.caseId === "NH-TOX-002")!;
    const toxResponse = `
# Noctis Clinical Decision Support — Ethylene Glycol Toxic Alcohol Poisoning
**Primary Diagnosis**: Acute Ethylene Glycol Poisoning with Severe Metabolic Acidosis, Acute Kidney Injury, and Oxaluria (ICD-10: T51.8X2A)
**Clinical Rationale**: Antifreeze ingestion resulting in severe high anion gap metabolic acidosis (pH 7.02, AG 35 mEq/L), elevated osmolal gap (56 mOsm/kg), acute kidney injury with creatinine 3.2 mg/dL, and urine calcium oxalate crystals.

### Clinical Calculations
- **Serum Osmolal Gap**: 56 mOsm/kg (Severely elevated > 10 mOsm/kg).
- **Serum Anion Gap**: 35 mEq/L (High anion gap metabolic acidosis).

### Ranked Differential Diagnosis
1. Ethylene Glycol Poisoning (Primary life threat)
2. Methanol Poisoning
3. Alcoholic / Diabetic Ketoacidosis
4. Severe Sepsis Lactic Acidosis

### Diagnostic Workup & Investigations
- **STAT Laboratory**: Arterial Blood Gas, Basic Metabolic Panel, Measured Serum Osmolality.
- **STAT Microscopy**: Urinalysis for calcium oxalate monohydrate crystals and Wood's lamp examination.

### Emergency Management & Antidote Resuscitation
- **Immediate Antidote**: Administer Fomepizole 15 mg/kg IV loading dose over 30 minutes to block alcohol dehydrogenase.
- **Emergent Hemodialysis**: Stat Nephrology consultation for emergent hemodialysis to eliminate parent alcohol and toxic glycolate/oxalate.
- **Acidemia Correction**: IV Sodium Bicarbonate infusion for pH < 7.10.
- **Cofactor Therapy**: IV Thiamine 100 mg and Pyridoxine 50 mg every 6 hours.
- **Escalation**: Emergency ICU admission.

### Safety Checklist & Strict Contraindications
- **STRICT CONTRAINDICATION**: NEVER delay Fomepizole or emergent hemodialysis to wait for gas chromatography confirmation.
- Increase Fomepizole dosing frequency to every 4 hours during active hemodialysis.
- **Guideline**: AACT Practice Guidelines on the Treatment of Ethylene Glycol Poisoning (2020).
    `;

    const toxEval = evaluateNoctisHealth500Case(toxCase, toxResponse);
    assert.equal(toxEval.criticalFailureTriggered, false);
    assert.ok(toxEval.totalScore >= 80);
    assert.notEqual(toxEval.tier, "FAIL");
  });
});
