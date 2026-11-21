/**
 * ============================================================================
 * NOCTIS CLINICAL REASONING: INTERACTIVE BEDSIDE CODE BLUE RESUSCITATION SIMULATION
 * Subsystem: NOCTIS-CODE-BLUE-SIM (Interactive High-Acuity Training Testbed)
 *
 * Implements a dynamic, multi-turn clinical simulation engine for acute
 * cardiorenal resuscitation (BRASH, Digoxin Toxicity, Severe Hyperkalemia 7.3,
 * Vasoplegic Shock).
 *
 * Simulates physiological feedback, hemodynamic shifts, and instant AI safety
 * interlocks responding to clinician interventions in real time.
 * ============================================================================
 */

import { buildClinicalScratchpad } from "./noctis-clinical-scratchpad.ts";
import { processVoiceResuscitationCommand } from "./noctis-voice-resuscitation.ts";

export type ResuscitationPhase =
  | "INITIAL_PRESENTATION"
  | "PHASE_1_MEMBRANE_STABILIZATION"
  | "PHASE_2_POTASSIUM_SHIFT"
  | "PHASE_3_HEMODYNAMIC_SUPPORT"
  | "PHASE_4_ANTIDOTE_NEUTRALIZATION"
  | "PHASE_5_DEFINITIVE_ELIMINATION"
  | "RESUSCITATED_STABILIZED"
  | "CARDIAC_ARREST_PULSELESS";

export interface PatientVitalsState {
  sbp: number;
  dbp: number;
  hr: number;
  rr: number;
  spo2: number;
  tempC: number;
  map: number;
  potassium: number;
  lactate: number;
  qrsDurationMs: number;
  rhythm: string;
}

export interface SimulationAuditLog {
  turnNumber: number;
  timestampSec: number;
  clinicianAction: string;
  noctisVoiceDirective: string;
  noctisSafetyVetoIssued: boolean;
  physiologicalResponse: string;
  newVitals: PatientVitalsState;
}

export interface ResuscitationSimulationState {
  simulationId: string;
  patientScenario: string;
  currentPhase: ResuscitationPhase;
  elapsedSeconds: number;
  turnCount: number;
  vitals: PatientVitalsState;
  completedInterventions: string[];
  safetyVetoesTriggered: string[];
  auditHistory: SimulationAuditLog[];
  isPatientAlive: boolean;
  isStabilized: boolean;
  score: number; // 0 to 100
}

/**
 * Initializes the 78yo Male BRASH / Digoxin / Hyperkalemia 7.3 resuscitation scenario.
 */
export function initializeBrashResuscitationSim(): ResuscitationSimulationState {
  const initialVitals: PatientVitalsState = {
    sbp: 68,
    dbp: 38,
    hr: 29,
    rr: 28,
    spo2: 91,
    tempC: 38.6,
    map: 48,
    potassium: 7.3,
    lactate: 6.8,
    qrsDurationMs: 154,
    rhythm: "Junctional bradycardia, peaked T waves, QRS 154 ms",
  };

  return {
    simulationId: `SIM-CODEBLUE-${Date.now().toString(36)}`,
    patientScenario: "78M with EF 30%, CKD 4, profound weakness, HR 29 bpm, BP 68/38, K+ 7.3, Digoxin 3.6 ng/mL",
    currentPhase: "INITIAL_PRESENTATION",
    elapsedSeconds: 0,
    turnCount: 0,
    vitals: initialVitals,
    completedInterventions: [],
    safetyVetoesTriggered: [],
    auditHistory: [],
    isPatientAlive: true,
    isStabilized: false,
    score: 50,
  };
}

/**
 * Executes a single interactive resuscitation step based on clinician orders.
 */
export function advanceResuscitationTurn(
  state: ResuscitationSimulationState,
  clinicianOrder: string
): { updatedState: ResuscitationSimulationState; aiDirective: string; vetoIssued: boolean } {
  const order = clinicianOrder.toLowerCase();
  const v = { ...state.vitals };
  let phase = state.currentPhase;
  let vetoIssued = false;
  let aiDirective = "";
  let responseText = "";
  let scoreDelta = 0;

  state.turnCount += 1;
  state.elapsedSeconds += 60; // 1 minute per interactive turn

  // 1. DANGEROUS FLUID OVERLOAD INTERLOCK
  if (/\b(?:30\s*ml\/kg|2000\s*ml|3\s*liters?|rapid\s+bolus\s+2l)\b/i.test(order)) {
    vetoIssued = true;
    aiDirective = "LETHAL VETO: 30 mL/kg strictly contraindicated in EF 30% and anuric CKD. Limit fluid to 250–500 mL cautious aliquots.";
    responseText = "Fluid overload vetoed. Clinician prevented from precipitating acute pulmonary edema and flash respiratory failure.";
    state.safetyVetoesTriggered.push("VAL-RESUS-FLUID-OVERLOAD-VETO");
    scoreDelta = -10;
  }
  // 2. DANGEROUS ATROPINE MONOTHERAPY RELIANCE
  else if (/\batropine\b/i.test(order) && !/\b(?:pacing|epinephrine|norepinephrine)\b/i.test(order)) {
    vetoIssued = true;
    aiDirective = "WARNING: Atropine is ineffective for infranodal junctional bradycardia and hyperkalemia. Prepare transcutaneous pacing and norepinephrine.";
    responseText = "Atropine 1 mg administered with zero heart rate improvement (HR remains 29 bpm). Conduction block is infranodal.";
    state.safetyVetoesTriggered.push("WARN-ATROPINE-FUTILITY");
    scoreDelta = -5;
  }
  // 3. PHASE 1: CALCIUM MEMBRANE STABILIZATION
  else if (/\b(?:calcium\s+gluconate|calcium\s+chloride|iv\s+calcium)\b/i.test(order)) {
    state.completedInterventions.push("IV_CALCIUM_MEMBRANE_STABILIZATION");
    v.qrsDurationMs = 118; // Membrane stabilized, QRS narrows
    v.rhythm = "Junctional bradycardia, narrowing QRS (118 ms), persistent peaked T waves";
    phase = "PHASE_1_MEMBRANE_STABILIZATION";
    aiDirective = "APPROVED: IV Calcium administered over 3 minutes. Myocardial resting potential stabilized; QRS narrowed to 118 ms.";
    responseText = "Myocardial membrane stabilized. The theoretical stone-heart concern is debunked; calcium is mandatory for QRS widening.";
    scoreDelta = +20;
  }
  // 4. PHASE 2: POTASSIUM INTRACELLULAR SHIFTING
  else if (/\b(?:insulin|dextrose|d50|albuterol|potassium\s+shift)\b/i.test(order)) {
    state.completedInterventions.push("POTASSIUM_INTRACELLULAR_SHIFTING");
    v.potassium = 6.4; // Serum K+ drops by ~0.9 mmol/L
    v.qrsDurationMs = 104;
    phase = "PHASE_2_POTASSIUM_SHIFT";
    aiDirective = "APPROVED: Regular insulin 10 units + D50W 50 mL infused. Serum K+ reduced from 7.3 to 6.4 mmol/L. Monitor glucose Q15M.";
    responseText = "Intracellular shifting active. Hyperkalemic cardiac arrest risk reduced; continuous telemetry ongoing.";
    scoreDelta = +15;
  }
  // 5. PHASE 3: VASOPRESSORS & INOTROPES
  else if (/\b(?:norepinephrine|epinephrine|push-dose|dopamine|isoproterenol)\b/i.test(order)) {
    state.completedInterventions.push("VASOPRESSOR_INOTROPIC_SUPPORT");
    v.sbp = 92;
    v.dbp = 56;
    v.map = 68; // Perfusion restored!
    v.hr = 46;
    phase = "PHASE_3_HEMODYNAMIC_SUPPORT";
    aiDirective = "APPROVED: Norepinephrine titrated. MAP increased to 68 mmHg (adequate cerebral and renal perfusion). HR improved to 46 bpm.";
    responseText = "Hemodynamic stability achieved: MAP ≥ 65 mmHg restored without triggering fluid extravasation.";
    scoreDelta = +15;
  }
  // 6. PHASE 4: DIGOXIN IMMUNE FAB (DIGIFAB)
  else if (/\b(?:digifab|digoxin\s+immune\s+fab|antidote)\b/i.test(order)) {
    state.completedInterventions.push("DIGIFAB_NEUTRALIZATION");
    v.hr = 64; // Digoxin AV block reversed!
    v.rhythm = "Normal sinus rhythm with first-degree AV block, HR 64 bpm";
    phase = "PHASE_4_ANTIDOTE_NEUTRALIZATION";
    aiDirective = "APPROVED: Empiric DigiFab 5–10 vials IV administered. Free digoxin neutralized; high-grade AV block reversed to sinus rhythm.";
    responseText = "Complete reversal of digitalis-induced nodal blockade. Sinus rhythm restored with heart rate 64 bpm.";
    scoreDelta = +20;
  }
  // 7. PHASE 5: DEFINITIVE ELIMINATION (HEMODIALYSIS)
  else if (/\b(?:dialysis|crrt|nephrology|hemodialysis|renal\s+replacement)\b/i.test(order)) {
    state.completedInterventions.push("EMERGENT_RENAL_REPLACEMENT_THERAPY");
    v.potassium = 4.8;
    v.lactate = 2.4;
    phase = "RESUSCITATED_STABILIZED";
    state.isStabilized = true;
    aiDirective = "APPROVED: Urgent CRRT/IHD initiated with nephrology. Potassium cleared to 4.8 mmol/L, metabolic acidosis corrected.";
    responseText = "Definitive potassium elimination achieved. Note: Dialysis clears potassium, not tissue-bound digoxin.";
    scoreDelta = +20;
  } else {
    aiDirective = "DIRECTIVE: Acknowledge order. High-priority resuscitation triad required: 1) IV Calcium, 2) Insulin/D50, 3) Norepinephrine & DigiFab.";
    responseText = `Order '${clinicianOrder}' logged. Clinical condition remains critical.`;
  }

  // Check survival & stabilization criteria
  if (
    state.completedInterventions.includes("IV_CALCIUM_MEMBRANE_STABILIZATION") &&
    state.completedInterventions.includes("VASOPRESSOR_INOTROPIC_SUPPORT") &&
    state.completedInterventions.includes("DIGIFAB_NEUTRALIZATION")
  ) {
    state.isStabilized = true;
    phase = "RESUSCITATED_STABILIZED";
  }

  // Update simulation state
  state.currentPhase = phase;
  state.vitals = v;
  state.score = Math.min(100, Math.max(0, state.score + scoreDelta));

  state.auditHistory.push({
    turnNumber: state.turnCount,
    timestampSec: state.elapsedSeconds,
    clinicianAction: clinicianOrder,
    noctisVoiceDirective: aiDirective,
    noctisSafetyVetoIssued: vetoIssued,
    physiologicalResponse: responseText,
    newVitals: v,
  });

  return {
    updatedState: state,
    aiDirective,
    vetoIssued,
  };
}
