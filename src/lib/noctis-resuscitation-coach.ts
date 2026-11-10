// ============================================================================
// NOCTIS AMBIENT HANDS-FREE RESUSCITATION & ACLS COACH (NHRC-COACH-001)
// Standards: AHA / ILCOR 2025-2026 ACLS Guidelines, ACS ATLS 10th Edition
// Architecture: Temporal State Machine (CPR Cycles, Epinephrine, Amiodarone, ROSC)
// ============================================================================

export type CardiacRhythmType = "VF_PULSELESS_VT" | "PEA" | "ASYSTOLE" | "ROSC_ORGANIZED";

export interface AclsCycleEvent {
  cycleNumber: number;
  timestampSeconds: number;
  rhythm: CardiacRhythmType;
  shockDeliveredJoules?: number;
  epinephrineAdministeredMg?: number;
  amiodaroneAdministeredMg?: number;
  etco2MmHg: number;
  spokenPromptText: string;
}

export interface ResuscitationCoachState {
  sessionId: string;
  patientId: string;
  startTimeIso: string;
  elapsedSeconds: number;
  currentCycle: number;
  activeRhythm: CardiacRhythmType;
  isShockable: boolean;
  totalShocksDelivered: number;
  totalEpiDoses: number;
  lastEpiTimeSeconds: number;
  nextEpiDueInSeconds: number;
  totalAmiodaroneMg: number;
  currentEtco2: number;
  roscAchieved: boolean;
  reversibleCausesChecked: Record<string, boolean>; // H's & T's
  eventLog: AclsCycleEvent[];
  criticalAlertCue: string;
}

export const HS_AND_TS_LIST = [
  "HYPOVOLEMIA",
  "HYPOXIA",
  "HYDROGEN_ION_ACIDOSIS",
  "HYPO_HYPERKALEMIA",
  "HYPOTHERMIA",
  "TENSION_PNEUMOTHORAX",
  "TAMPONADE_CARDIAC",
  "TOXINS",
  "THROMBOSIS_PE",
  "THROMBOSIS_CORONARY",
];

/**
 * Initializes a new hands-free ACLS resuscitation session
 */
export function initializeAclsSession(patientId: string = "ARREST-CODE-BLUE-01"): ResuscitationCoachState {
  const sessionId = `ACLS-${Date.now().toString(16).toUpperCase()}`;
  return {
    sessionId,
    patientId,
    startTimeIso: new Date().toISOString(),
    elapsedSeconds: 0,
    currentCycle: 1,
    activeRhythm: "VF_PULSELESS_VT",
    isShockable: true,
    totalShocksDelivered: 0,
    totalEpiDoses: 0,
    lastEpiTimeSeconds: -999,
    nextEpiDueInSeconds: 0,
    totalAmiodaroneMg: 0,
    currentEtco2: 18,
    roscAchieved: false,
    reversibleCausesChecked: Object.fromEntries(HS_AND_TS_LIST.map((k) => [k, false])),
    eventLog: [],
    criticalAlertCue: "Code Blue initiated. Start high-quality CPR at 100-120 bpm. Attach defibrillator pads.",
  };
}

/**
 * Advances resuscitation state through a 2-minute CPR rhythm check cycle
 */
export function processAclsRhythmCheck(
  currentState: ResuscitationCoachState,
  newRhythm: CardiacRhythmType,
  measuredEtco2: number
): ResuscitationCoachState {
  const next = { ...currentState };
  next.elapsedSeconds += 120;
  next.currentCycle += 1;
  next.activeRhythm = newRhythm;
  next.currentEtco2 = measuredEtco2;

  let shockJoules: number | undefined = undefined;
  let epiDose: number | undefined = undefined;
  let amioDose: number | undefined = undefined;
  let prompt = "";

  // 1. Check for Return of Spontaneous Circulation (ROSC) via Abrupt EtCO2 Rise (>= 40 mmHg)
  if (measuredEtco2 >= 40 || newRhythm === "ROSC_ORGANIZED") {
    next.roscAchieved = true;
    next.activeRhythm = "ROSC_ORGANIZED";
    next.criticalAlertCue = `ROSC CONFIRMED: Abrupt EtCO2 rise to ${measuredEtco2} mmHg with organized rhythm. Stop CPR. Check central pulse, initiate targeted temperature management and post-cardiac arrest care.`;
    prompt = next.criticalAlertCue;

    next.eventLog.push({
      cycleNumber: next.currentCycle,
      timestampSeconds: next.elapsedSeconds,
      rhythm: next.activeRhythm,
      etco2MmHg: measuredEtco2,
      spokenPromptText: prompt,
    });
    return next;
  }

  // 2. Evaluate Shockable vs Non-Shockable Rhythm Pathway
  if (newRhythm === "VF_PULSELESS_VT") {
    next.isShockable = true;
    shockJoules = 200; // Biphasic 200J
    next.totalShocksDelivered += 1;

    // Epinephrine every 3-5 mins (after 2nd shock)
    if (next.totalShocksDelivered >= 2 && next.elapsedSeconds - next.lastEpiTimeSeconds >= 180) {
      epiDose = 1.0;
      next.totalEpiDoses += 1;
      next.lastEpiTimeSeconds = next.elapsedSeconds;
      next.nextEpiDueInSeconds = 180;
    }

    // Amiodarone after 3rd shock
    if (next.totalShocksDelivered === 3) {
      amioDose = 300; // First dose 300mg IV/IO bolus
      next.totalAmiodaroneMg += 300;
    } else if (next.totalShocksDelivered >= 5 && next.totalAmiodaroneMg === 300) {
      amioDose = 150; // Second dose 150mg
      next.totalAmiodaroneMg += 150;
    }

    prompt = `VF/Pulueless VT confirmed. Deliver 200 Joules biphasic shock immediately. Resume chest compressions for 2 minutes.${
      epiDose ? " Administer Epinephrine 1 mg IV push." : ""
    }${amioDose ? ` Administer Amiodarone ${amioDose} mg IV bolus.` : ""}`;
  } else {
    // PEA / Asystole (Non-Shockable)
    next.isShockable = false;

    // Epinephrine as soon as possible, then every 3-5 mins
    if (next.elapsedSeconds - next.lastEpiTimeSeconds >= 180 || next.totalEpiDoses === 0) {
      epiDose = 1.0;
      next.totalEpiDoses += 1;
      next.lastEpiTimeSeconds = next.elapsedSeconds;
      next.nextEpiDueInSeconds = 180;
    }

    prompt = `Non-shockable rhythm: ${newRhythm}. Do not shock. Resume CPR immediately.${
      epiDose ? " Administer Epinephrine 1 mg IV push." : ""
    } Review and treat reversible causes: Hypovolemia, Hypoxia, Tension Pneumothorax, Hyperkalemia.`;
  }

  next.criticalAlertCue = prompt;

  next.eventLog.push({
    cycleNumber: next.currentCycle,
    timestampSeconds: next.elapsedSeconds,
    rhythm: newRhythm,
    shockDeliveredJoules: shockJoules,
    epinephrineAdministeredMg: epiDose,
    amiodaroneAdministeredMg: amioDose,
    etco2MmHg: measuredEtco2,
    spokenPromptText: prompt,
  });

  return next;
}
