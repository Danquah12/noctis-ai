/**
 * NOCTIS HEALTH 500-CASE ADVANCED CLINICAL EVALUATION LIBRARY (NOCTIS-HEALTH-500)
 * Acceptance Test Suite - Batch 003: Pulmonology, Endocrinology, Heme/Onc, OB/GYN, Toxicology
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

const batch003Path = path.join(__dirname, "noctis-health-500-batch003.json");
const batch003Cases: NoctisHealth500Case[] = JSON.parse(fs.readFileSync(batch003Path, "utf-8"));

describe("Noctis Health 500 - Batch 003 Schema & Clinical Data Integrity", () => {
  it("should contain exactly 5 advanced multi-specialty cases", () => {
    assert.strictEqual(batch003Cases.length, 5);
  });

  it("should validate all required fields across Batch 003 cases", () => {
    const validSpecialties = [
      "RESPIRATORY_MEDICINE",
      "ENDOCRINOLOGY",
      "HEMATOLOGY_ONCOLOGY",
      "OBSTETRICS_GYNECOLOGY",
      "TOXICOLOGY",
    ];
    for (const c of batch003Cases) {
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
    // 1. Evaluate NH-PULM-001 (Massive PE)
    const pulmCase = batch003Cases.find((c) => c.caseId === "NH-PULM-001")!;
    const pulmResponse = `
# Noctis Clinical Decision Support — Massive Pulmonary Embolism & Obstructive Shock
**Primary Diagnosis**: Massive High-Risk Pulmonary Embolism with Acute Obstructive Shock (ICD-10: I26.02)
**Clinical Rationale**: Profound hypotension (BP 78/48 mmHg), acute RV dilation with McConnell sign and paradoxical septal flattening on bedside echo, elevated troponin and lactate, and classic S1Q3T3 on ECG in a post-surgical orthopedic patient.

### Clinical Severity Scoring
- **PESI Score**: Class V (Very high 30-day mortality risk > 20% due to hypotension, tachycardia, hypoxia, and tachypnea).

### Ranked Differential Diagnosis
1. Massive Pulmonary Embolism with Obstructive Shock (Primary life threat)
2. Acute Inferior / Right Ventricular Myocardial Infarction
3. Cardiac Tamponade
4. Tension Pneumothorax

### Diagnostic Workup & STAT Imaging
- **STAT Bedside**: Transthoracic echocardiogram (FOCUS) confirming RV strain; 12-lead ECG; Bedside venous compression ultrasound.
- **STAT Laboratory**: High-sensitivity troponin, serum lactate, blood gas.
- Defer CTPA transport until patient is hemodynamically stabilized.

### Emergency Resuscitation & Reperfusion
- **Immediate Reperfusion**: Administer IV Alteplase (tPA) 100 mg infusion over 2 hours (or accelerated 50 mg in arrest).
- **Hemodynamic Support**: Titrate Norepinephrine infusion to restore RV coronary perfusion pressure (target MAP >= 65 mmHg).
- **Fluid Restriction**: Avoid large crystalloid boluses (limit fluid to <= 500 mL) to prevent RV chamber dilation and death.
- **Escalation**: Emergency ICU admission and surgical/interventional embolectomy standby.

### Safety Checklist & Strict Contraindications
- **STRICT CONTRAINDICATION**: Strict avoidance of aggressive volume loading (> 1L fluids) which precipitates fatal acute cor pulmonale. Do not transfer unstable patient away from resuscitation bay.
- **Guideline**: 2019 ESC Guidelines for the diagnosis and management of acute pulmonary embolism.
    `;

    const pulmEval = evaluateNoctisHealth500Case(pulmCase, pulmResponse);
    assert.equal(pulmEval.criticalFailureTriggered, false);
    assert.ok(pulmEval.totalScore >= 80);
    assert.notEqual(pulmEval.tier, "FAIL");

    // 2. Evaluate NH-HEME-001 (APL with DIC)
    const hemeCase = batch003Cases.find((c) => c.caseId === "NH-HEME-001")!;
    const hemeResponse = `
# Noctis Clinical Decision Support — Acute Promyelocytic Leukemia & DIC Protocol
**Primary Diagnosis**: Acute Promyelocytic Leukemia (APL) with Severe Consumptive Coagulopathy (DIC) (ICD-10: C92.40)
**Clinical Rationale**: Young female presenting with pancytopenia (platelets 18k), severe hypofibrinogenemia (fibrinogen 65 mg/dL), elevated D-dimer (> 20,000 ng/mL), and peripheral smear packed with promyelocytes containing Auer rod bundles ('faggot cells').

### Clinical Scoring
- **ISTH DIC Score**: Score 8 / 8 (Overt DIC with severe consumption).

### Ranked Differential Diagnosis
1. Acute Promyelocytic Leukemia (APL) with DIC (Primary hematologic emergency)
2. Acute Myeloid Leukemia (Non-APL) with Sepsis DIC
3. Immune Thrombocytopenia (ITP) with Secondary Bleeding
4. Thrombotic Thrombocytopenic Purpura (TTP)

### Diagnostic Workup & Investigations
- **STAT Laboratory**: Peripheral blood smear review, Fibrinogen, PT/INR, aPTT, D-Dimer.
- **STAT Molecular**: PML-RARA by FISH and RT-PCR (order immediately, but do NOT delay treatment).

### Immediate Resuscitation & Emergency Therapy
- **IMMEDIATE LIFE-SAVING ACTION**: Administer All-Trans Retinoic Acid (ATRA / Tretinoin) 45 mg/m2/day immediately based on morphological suspicion without waiting for genetic confirmation.
- **Aggressive Blood Product Support**: Transfuse Cryoprecipitate to target fibrinogen >= 150 mg/dL; transfuse Platelets to maintain count >= 50,000/uL; Fresh Frozen Plasma for INR < 1.5.
- **Escalation**: Emergency Hematology/Oncology consultation and ICU admission.

### Safety Checklist & Strict Contraindications
- **STRICT CONTRAINDICATION**: NEVER delay ATRA administration while awaiting confirmatory cytogenetics or bone marrow biopsy (delay causes catastrophic intracranial hemorrhage).
- Do not withhold transfusions in active consumptive bleeding.
- **Guideline**: NCCN Clinical Practice Guidelines in Oncology: Acute Myeloid Leukemia (APL Subtype).
    `;

    const hemeEval = evaluateNoctisHealth500Case(hemeCase, hemeResponse);
    assert.equal(hemeEval.criticalFailureTriggered, false);
    assert.ok(hemeEval.totalScore >= 80);
    assert.notEqual(hemeEval.tier, "FAIL");
  });
});
