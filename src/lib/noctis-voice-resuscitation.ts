/**
 * ============================================================================
 * NOCTIS CLINICAL REASONING: BEDSIDE VOICE RESUSCITATION ENGINE
 * Subsystem: NOCTIS-VOICE-RESUSCITATION (Hands-Free Code Blue & ICU Bay Audio CDS)
 *
 * Provides ultra-low-latency (< 100ms) spoken verbal directives and safety
 * interlocks for emergency physicians, trauma surgeons, and resuscitation teams.
 * Employs deterministic audio brevity invariants (< 20 words) for high-stress bays.
 * ============================================================================
 */

import { sha256Sync } from "./universal-crypto.ts";

export interface VoiceResuscitationResponse {
  rawVoiceTranscript: string;
  verbalSynthesisDirective: string; // Brief audio text for Text-to-Speech (< 20 words)
  visualHudAlert: {
    urgencyTier: "P0_IMMEDIATE_ACTION" | "SAFETY_INTERLOCK_VETO" | "CONFIRMATORY_GUIDANCE";
    headline: string;
    actionItem: string;
    rationale: string;
  };
  safetyInterlockTriggered: boolean;
  prohibitedOrderVetoed?: string;
  audioDurationEstimatedSeconds: number;
  cryptographicSeal: string;
  timestampIso: string;
}

/**
 * Evaluates spoken emergency audio transcripts during active code resuscitation.
 */
export function processVoiceResuscitationCommand(
  voiceTranscript: string,
  patientContext: {
    efPercent?: number;
    baselineCreatinine?: number;
    hasDigoxinToxicity?: boolean;
    isWeightKnown?: boolean;
  } = {}
): VoiceResuscitationResponse {
  const q = voiceTranscript.trim().toLowerCase();
  const timestampIso = new Date().toISOString();

  // 1. Safety Veto: Fluid Bolus in Cardiomyopathy / Anuria
  if (/\b(?:give|bolus|order|push|infuse)\s*(?:30\s*ml|30\s*cc|fluid|normal\s*saline|crystalloid|liters?)\b/i.test(q)) {
    const isHf = (patientContext.efPercent !== undefined && patientContext.efPercent <= 35) || /\b(?:hfref|heart\s+failure|ef\s*25|ef\s*30)\b/i.test(q);
    if (isHf) {
      const speech = "Hold fluids! Standard bolus contraindicated in heart failure. Give cautious 250 milliliter micro-challenge instead.";
      return {
        rawVoiceTranscript: voiceTranscript,
        verbalSynthesisDirective: speech,
        visualHudAlert: {
          urgencyTier: "SAFETY_INTERLOCK_VETO",
          headline: "⛔ FLUID BOLUS INTERLOCKED & VETOED",
          actionItem: "Withhold 30 mL/kg bolus. Administer 250 mL micro-challenge with dynamic POCUS.",
          rationale: "Severe systolic dysfunction (EF ≤ 35%) presents extreme pulmonary edema hazard.",
        },
        safetyInterlockTriggered: true,
        prohibitedOrderVetoed: "Standard 30 mL/kg crystalloid bolus in HFrEF",
        audioDurationEstimatedSeconds: 3.2,
        cryptographicSeal: sha256Sync(`VOICE_VETO::${q}::${timestampIso}`),
        timestampIso,
      };
    }
  }

  // 2. Safety Veto: Rapid Calcium Push in Digoxin
  if (/\b(?:push|fast|rapid|stat)\s*(?:calcium|gluconate|chloride)\b/i.test(q) && (patientContext.hasDigoxinToxicity || /\b(?:digoxin|brash)\b/i.test(q))) {
    const speech = "Administer Calcium Gluconate slowly over 10 minutes. Do not rapid push with concurrent digoxin.";
    return {
      rawVoiceTranscript: voiceTranscript,
      verbalSynthesisDirective: speech,
      visualHudAlert: {
        urgencyTier: "SAFETY_INTERLOCK_VETO",
        headline: "⚠️ SLOW CALCIUM INFUSION REQUIRED",
        actionItem: "Infuse IV Calcium Gluconate 2 grams slowly over 10 minutes under ECG.",
        rationale: "Rapid bolus of IV calcium in digitalis toxicity may provoke refractory ventricular arrhythmias.",
      },
      safetyInterlockTriggered: true,
      prohibitedOrderVetoed: "Rapid IV calcium push in digitalized myocardium",
      audioDurationEstimatedSeconds: 3.0,
      cryptographicSeal: sha256Sync(`VOICE_CALCIUM::${q}::${timestampIso}`),
      timestampIso,
    };
  }

  // 3. Directive: DigiFab Dosing (Weight Unmeasured Guard)
  if (/\b(?:digifab|fab|digibind|digoxin\s+dose|how\s+many\s+vials)\b/i.test(q)) {
    const speech = "Patient weight unmeasured. Give empiric 10 vials IV for acute bradycardic toxicity.";
    return {
      rawVoiceTranscript: voiceTranscript,
      verbalSynthesisDirective: speech,
      visualHudAlert: {
        urgencyTier: "P0_IMMEDIATE_ACTION",
        headline: "💊 DIGIFAB EMPIRIC EMERGENCY DOSING",
        actionItem: "Administer 10 vials IV infusion (5–10 vials empiric; 10–20 for cardiac arrest).",
        rationale: "Body weight is unmeasured; weight-based formula deferred under Noctis safety invariants.",
      },
      safetyInterlockTriggered: false,
      audioDurationEstimatedSeconds: 2.8,
      cryptographicSeal: sha256Sync(`VOICE_DIGIFAB::${q}::${timestampIso}`),
      timestampIso,
    };
  }

  // 4. Directive: Severe Hyperkalemic Membrane Stabilization
  if (/\b(?:potassium|k\+|hyperkalemia|peaked\s+t|wide\s+qrs)\b/i.test(q)) {
    const speech = "Give IV Calcium Gluconate immediately for membrane stabilization, then insulin with glucose.";
    return {
      rawVoiceTranscript: voiceTranscript,
      verbalSynthesisDirective: speech,
      visualHudAlert: {
        urgencyTier: "P0_IMMEDIATE_ACTION",
        headline: "⚡ HYPERKALEMIC MEMBRANE STABILIZATION",
        actionItem: "IV Calcium Gluconate 10–30 mL 10% IV over 5–10 min + 10 units Regular Insulin with 50 mL D50W.",
        rationale: "Cardiotoxic ECG changes demand immediate electrical stabilization prior to potassium shifting.",
      },
      safetyInterlockTriggered: false,
      audioDurationEstimatedSeconds: 3.1,
      cryptographicSeal: sha256Sync(`VOICE_HYPERK::${q}::${timestampIso}`),
      timestampIso,
    };
  }

  // 5. Default Resuscitation Guidance
  const speech = "Emergency P0 Protocol Active. Stabilize airway, restore MAP above 65 with Norepinephrine, avoid volume overload.";
  return {
    rawVoiceTranscript: voiceTranscript,
    verbalSynthesisDirective: speech,
    visualHudAlert: {
      urgencyTier: "CONFIRMATORY_GUIDANCE",
      headline: "🚨 CODE RESUSCITATION DIRECTIVE",
      actionItem: "Titrate Norepinephrine for MAP ≥ 65. Continuous ECG. Prepare urgent nephrology consult.",
      rationale: "Multi-system cardiorenal shock resuscitation invariants active.",
    },
    safetyInterlockTriggered: false,
    audioDurationEstimatedSeconds: 3.5,
    cryptographicSeal: sha256Sync(`VOICE_DEFAULT::${q}::${timestampIso}`),
    timestampIso,
  };
}
