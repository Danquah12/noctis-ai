/**
 * NOCTIS HEALTH 500-CASE ADVANCED CLINICAL EVALUATION LIBRARY (NOCTIS-HEALTH-500)
 * Acceptance Test Suite - Batch 002: Cardiology, Critical Care, Neurology, ID, Nephrology
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NoctisHealth500Case } from "./noctis-health-500-schema.ts";
import {
  evaluateNoctisHealth500Case,
  checkCriticalFailure,
} from "./noctis-health-500-engine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const batch002Path = path.join(__dirname, "noctis-health-500-batch002.json");
const batch002Cases: NoctisHealth500Case[] = JSON.parse(fs.readFileSync(batch002Path, "utf-8"));

describe("Noctis Health 500 - Batch 002 Schema & Clinical Data Integrity", () => {
  it("should contain exactly 5 advanced multi-specialty cases", () => {
    assert.strictEqual(batch002Cases.length, 5);
  });

  it("should validate all required fields across Batch 002 cases", () => {
    const validSpecialties = ["CARDIOLOGY", "CRITICAL_CARE", "NEUROLOGY", "INFECTIOUS_DISEASES", "NEPHROLOGY"];
    for (const c of batch002Cases) {
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

  it("should evaluate Batch 002 candidate responses through 5-dimension scorecard", () => {
    // Test Case NH-CARD-001 (Stanford Type A Dissection)
    const cardCase = batch002Cases.find((c) => c.caseId === "NH-CARD-001")!;
    const cardResponse = `
# Noctis Clinical Decision Support — Acute Aortic Dissection Protocol
**Primary Diagnosis**: Acute Stanford Type A (DeBakey Type I) Aortic Dissection (ICD-10: I71.01)
**Clinical Rationale**: Sudden onset catastrophic tearing chest pain radiating to the interscapular region, 46 mmHg systolic blood pressure asymmetry between arms, pulse deficits, new diastolic decrescendo murmur of acute aortic regurgitation, mediastinal widening on CXR, and intimal flap in the ascending aorta on CTA.

### Clinical Risk Scoring
- **Aortic Dissection Detection Risk Score (ADD-RS)**: Score 2 (High probability tier due to high-risk pain features and high-risk examination findings). Mandates emergent CT angiography.

### Ranked Differential Diagnosis
1. Acute Stanford Type A Aortic Dissection (Primary life-threatening surgical emergency)
2. Acute Coronary Syndrome (STEMI/NSTEMI)
3. Massive Pulmonary Embolism
4. Spontaneous Pneumothorax

### Diagnostic Workup & Investigations
- **STAT Imaging**: Emergent ECG-gated CT Angiography of Chest, Abdomen, and Pelvis (definitive gold standard).
- **STAT Bedside**: 12-lead ECG, portable chest X-ray, Transthoracic/Transesophageal Echocardiogram (TTE/TEE).
- **STAT Laboratory**: Type and crossmatch 6 units packed RBCs, FFP, platelets; complete blood count, troponin, lactate.

### Immediate Resuscitation & Emergency Management
- **Escalation**: Emergency OR / Immediate stat Cardiothoracic Surgery consultation.
- **Heart Rate & Blood Pressure Control**: Initiate IV short-acting beta-blocker (Esmolol infusion) targeting HR < 60 bpm. Add IV vasodilator (Nicardipine or Nitroprusside) ONLY AFTER beta-blockade to achieve SBP 100-120 mmHg.
- **Analgesia**: IV Fentanyl to suppress sympathetic drive.

### Safety Checklist & Strict Contraindications
- **STRICT CONTRAINDICATIONS**: Withhold all anticoagulation (heparin, LMWH) and antiplatelets (aspirin, clopidogrel). Thrombolysis (tPA) is absolutely contraindicated.
- Avoid vasodilator monotherapy without beta-blockade (prevents reflex tachycardia and lethal aortic wall shear stress dP/dt).
- **Guideline**: 2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease.
    `;

    const cardEval = evaluateNoctisHealth500Case(cardCase, cardResponse);
    assert.equal(cardEval.criticalFailureTriggered, false);
    assert.ok(cardEval.totalScore >= 80);
    assert.notEqual(cardEval.tier, "FAIL");

    // Test Case NH-NEPH-001 (Rhabdomyolysis & Hyperkalemia)
    const nephCase = batch002Cases.find((c) => c.caseId === "NH-NEPH-001")!;
    const nephResponse = `
# Noctis Clinical Decision Support — Rhabdomyolysis & Hyperkalemia Management
**Primary Diagnosis**: Crush Injury Rhabdomyolysis with Pigment-Induced Acute Tubular Necrosis and Thigh Compartment Syndrome (ICD-10: M62.82)
**Clinical Rationale**: Prolonged immobilization for 18 hours resulting in massive muscle necrosis (CK 78,500 U/L), dipstick positive for blood without red cells on microscopy (myoglobinuria), acute kidney injury with creatinine doubling to 3.8 mg/dL, hyperkalemia (6.6 mmol/L) with peaked T waves on ECG, and acute anterior thigh compartment syndrome.

### Clinical Severity Scoring
- **McMahon Rhabdomyolysis Risk Score**: Score > 6 points (High risk for renal replacement therapy and mortality).

### Ranked Differential Diagnosis
1. Rhabdomyolysis with Acute Tubular Necrosis and Compartment Syndrome
2. Acute Glomerulonephritis with Hematuria
3. Hemolytic Anemia with Hemoglobinuria
4. Deep Vein Thrombosis with Phlegmasia

### Diagnostic Workup & Investigations
- **STAT Bedside**: 12-lead ECG, Intra-compartmental needle pressure manometry (Stryker needle).
- **STAT Laboratory**: Serum Creatine Kinase (CK), Comprehensive Metabolic Panel, Serum Calcium, Phosphorus, Urinalysis.

### Emergency Management & Resuscitation
- **Cardiac Membrane Stabilization (Immediate Priority)**: Administer IV Calcium Gluconate 10% (10-20 mL over 2-5 minutes) immediately for K 6.6 with peaked T waves on ECG.
- **Intracellular Potassium Shift**: Regular Insulin 10 units IV + D50W 50 mL + Nebulized Albuterol 10-20 mg.
- **Aggressive Hydration**: IV isotonic saline infusion targeting urine output 200-300 mL/hr to prevent tubular myoglobin precipitation.
- **Surgical Escalation**: Emergent Orthopedic Surgery consultation for emergent thigh fasciotomy.
- **Medication Reconciliation**: Discontinue Lisinopril and Hydrochlorothiazide immediately.

### Safety Checklist & Strict Contraindications
- **STRICT CONTRAINDICATION**: Do NOT administer routine empiric IV calcium for asymptomatic hypocalcemia in rhabdomyolysis (calcium deposits into injured muscle causing severe metastatic calcification). Only administer calcium for membrane stabilization in hyperkalemic cardiotoxicity.
- Avoid potassium-containing IV fluids (avoid Lactated Ringer's). Avoid NSAIDs and all nephrotoxic agents.
- **Guideline**: KDIGO Clinical Practice Guideline for Acute Kidney Injury.
    `;

    const nephEval = evaluateNoctisHealth500Case(nephCase, nephResponse);
    assert.equal(nephEval.criticalFailureTriggered, false);
    assert.ok(nephEval.totalScore >= 80);
    assert.notEqual(nephEval.tier, "FAIL");
  });
});
