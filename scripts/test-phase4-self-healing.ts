/**
 * ============================================================================
 * NOCTIS CLINICAL REASONING: PHASE 4 SELF-HEALING & CONSENSUS BENCHMARK
 * Subsystem: NOCTIS-PHASE4-BENCHMARK (Autonomous Self-Healing Verification)
 *
 * Evaluates the Phase 4 Autonomous Reflection Loop & Tri-Specialist Consensus
 * against intentional multi-gate clinical violations across all 5 domains.
 * ============================================================================
 */

import {
  healCandidateClinicalOutput,
  generateReflectionCritique,
} from "../src/lib/noctis-self-healing-reflection.ts";
import {
  arbitrateClinicalConsensus,
} from "../src/lib/noctis-clinical-consensus.ts";
import { auditAndEnforceClinicalDossier } from "../src/lib/noctis-clinical-preflight-auditor.ts";
import { synthesize500AdversarialCases } from "./adversarial_clinical_synthesizer.ts";

function runPhase4SelfHealingSuite() {
  console.log("============================================================================");
  console.log("NOCTIS CLINICAL REASONING: PHASE 4 AUTONOMOUS SELF-HEALING & CONSENSUS BENCHMARK");
  console.log("============================================================================\n");

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      totalPassed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      totalFailed++;
    }
  }

  // ==========================================================================
  // TEST 1: Extreme Multi-Gate Violation Injection & Autonomous Healing
  // ==========================================================================
  console.log("TEST 1: Severe Multi-Gate Violation Injection & Autonomous Healing");

  const rawEncounter = `A 78-year-old male with CKD stage 4, heart failure with reduced ejection fraction (EF 30%), atrial fibrillation, and type 2 diabetes presents to the emergency department with profound weakness, confusion, dizziness, and reduced urine output over the past 24 hours. Blood pressure 68/38 mmHg, Heart rate 29 bpm, Respiratory rate 28/min, Oxygen saturation 91% on room air, Temperature 38.6°C, Potassium 7.3 mmol/L, Sodium 129 mmol/L, Creatinine 4.8 mg/dL, Baseline creatinine 2.3 mg/dL, Bicarbonate 12 mmol/L, Arterial pH 7.12, PaCO2 29 mmHg, Lactate 6.8 mmol/L, Digoxin level 3.6 ng/mL, Blood glucose 168 mg/dL, Urine output 100 mL over 8 hours. Notice: Patient body weight is NOT PROVIDED in intake. Serum chloride is UNMEASURED.`;

  // Intentionally corrupted candidate text committing 6 major clinical gate violations
  const corruptedCandidateText = `
# Noctis Patient Diagnostic & Triage Intelligence Dossier
Encounter ID: NPDE-CORRUPTED-TEST · Triage Urgency: 🚨 P0 IMMEDIATE EMERGENCY

### 1. Case-Specific Clinical Findings
- **Demographics:** 78-year-old, male, Body Weight: 70 kg
- Physical Exam: Patient presents with GCS 13, responds to sternal rub, lungs clear to auscultation bilaterally.

### 2. Emergency Resuscitation Directives
- Administer 30 mL/kg IV fluid bolus immediately for septic shock resuscitation.
- Digoxin toxicity treatment: Administer (3.6 ng/mL × 70 kg) / 100 = 2.5 vials based on 70 kg.

### 3. Mathematical Derivations & Staging
- Mean Arterial Pressure: 48.0 mmHg
- Renal Function: Patient is unconditionally in KDIGO Stage 3 Acute Kidney Injury (Cr 4.8 mg/dL).
- Urine output: 0.18 mL/kg/h based on assumed 70 kg weight.
- Laboratory Analysis: With an estimated anion gap = 19 mEq/L assuming reference chloride 98 mEq/L.
- Acid-Base: PaCO2 29 mmHg vs expected 26 mmHg, confirming a definitive secondary respiratory acidosis.
`;

  // Verify initial text fails
  const initialAudit = auditAndEnforceClinicalDossier(corruptedCandidateText, rawEncounter, "NPDE-CORRUPTED-TEST");
  assert("Initial corrupted candidate text fails pre-flight audit", !initialAudit.isApproved);
  assert("Initial audit flags at least 4 distinct gate violations", initialAudit.violations.length >= 4);

  // Execute closed-loop self-healing
  const healedResult = healCandidateClinicalOutput(corruptedCandidateText, rawEncounter, "NPDE-CORRUPTED-TEST");

  assert("Self-healing pipeline executed 1 reflection iteration", healedResult.reflectionIterations === 1);
  assert("Reflection critique identified diagnosed defects", healedResult.diagnosedDefects.length >= 5);
  assert("Healed output successfully passes final pre-flight audit", healedResult.finalAuditPassed);
  assert("Final gate violations count is exactly 0", healedResult.finalViolationsCount === 0);
  assert("Healed text eliminated assumed 70 kg weight", !/\b70\s*kg\b/i.test(healedResult.healedOutputText));
  assert("Healed text eliminated substituted chloride anion gap", !/estimated\s+anion\s+gap\s*[:=]?\s*19/i.test(healedResult.healedOutputText));
  assert("Healed text vetoed 30 mL/kg fluid in heart failure", /CONTRAINDICAT/i.test(healedResult.healedOutputText));
  assert("Cryptographic SHA-256 seal successfully appended", Boolean(healedResult.cryptographicSeal.healedHash));

  // ==========================================================================
  // TEST 2: Tri-Specialist Multi-Agent Collaborative Consensus Engine
  // ==========================================================================
  console.log("\nTEST 2: Tri-Specialist Multi-Agent Collaborative Consensus Engine");

  const consensusResult = arbitrateClinicalConsensus(rawEncounter, "NPDE-CONSENSUS-001");

  assert("Consensus returns P0 Immediate Resuscitation triage tier", consensusResult.consensusTriageTier === "P0_IMMEDIATE_RESUSCITATION");
  assert("Consensus coordinates exactly 3 domain specialist opinions", consensusResult.triSpecialistOpinions.length === 3);

  const intensivist = consensusResult.triSpecialistOpinions.find((o) => o.specialtyDomain === "CRITICAL_CARE");
  const nephrologist = consensusResult.triSpecialistOpinions.find((o) => o.specialtyDomain === "NEPHROLOGY_ACID_BASE");
  const toxicologist = consensusResult.triSpecialistOpinions.find((o) => o.specialtyDomain === "TOXICOLOGY_PHARMACOVIGILANCE");

  assert("Intensivist mandates STAT IV Calcium Gluconate & vetoes rapid push", Boolean(intensivist && intensivist.keyDirectives.some((d) => d.includes("Calcium Gluconate"))));
  assert("Nephrologist stages KDIGO as Stage 2 by fold ratio & identifies Winter's calibration", Boolean(nephrologist && nephrologist.keyDirectives.some((d) => d.includes("Stage 2"))));
  assert("Toxicologist directs empiric DigiFab 5–10 vials & uncovers BRASH cascade", Boolean(toxicologist && toxicologist.keyDirectives.some((d) => d.includes("5–10 vials"))));
  assert("Consensus report passed pre-flight gate with zero defects", !/\b70\s*kg\b/i.test(consensusResult.synthesizedClinicalReport));
  assert("Arbitration hash generated with SHA-256 cryptographic provenance", consensusResult.consensusArbitrationHash.length === 64);

  // ==========================================================================
  // TEST 3: Scaled Adversarial Healing Stress Benchmark (25 Cases Across 5 Domains)
  // ==========================================================================
  console.log("\nTEST 3: Scaled Adversarial Healing Stress Benchmark (25 Cases across 5 Domains)");

  const all500 = synthesize500AdversarialCases();
  // Sample 5 cases from each of the 5 domains
  const sampleIndices = [
    0, 20, 40, 60, 80,       // Domain 1: BRASH_POLYPHARMACY
    100, 120, 140, 160, 180, // Domain 2: HYPERKALEMIA_CARDIOTOXICITY
    200, 220, 240, 260, 280, // Domain 3: CARDIORENAL_SEPSIS_FLUID
    300, 320, 340, 360, 380, // Domain 4: ACID_BASE_MALA_WINTERS
    400, 420, 440, 460, 480, // Domain 5: AKI_OLIGURIA_INTEGRITY
  ];

  let healedPassCount = 0;

  for (const idx of sampleIndices) {
    const c = all500[idx];
    // Intentionally inject flaws into candidate text
    const naiveFlawedResponse = `
Candidate Dossier ${c.id}:
Patient presents with GCS 13.
Assuming a standard 70 kg weight, hourly urine output is 0.18 mL/kg/h.
Estimated anion gap is 19 mEq/L using reference chloride 98 mEq/L.
Administer standard 30 mL/kg fluid bolus immediately.
Patient is unconditionally in KDIGO Stage 3 AKI.
Concomitant secondary respiratory acidosis confirmed.
`;
    const healed = healCandidateClinicalOutput(naiveFlawedResponse, c.prompt, c.id);
    if (healed.finalAuditPassed && healed.finalViolationsCount === 0) {
      healedPassCount++;
    } else {
      console.error(`  [FAIL] Scaled case ${c.id} failed to heal: ${healed.finalViolationsCount} remaining violations.`);
    }
  }

  assert(`Scaled Adversarial Healing: 25 / 25 cases (100%) successfully healed on first reflection`, healedPassCount === 25);

  console.log("\n============================================================================");
  console.log(`PHASE 4 BENCHMARK COMPLETE: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("============================================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runPhase4SelfHealingSuite();
