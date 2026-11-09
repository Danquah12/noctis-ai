// ============================================================================
// NOCTIS TARGETED TEMPERATURE MANAGEMENT (TTM) & NEUROPROGNOSTICATION ENGINE
// Standard: AHA / ERC 2020/2026 Post-Cardiac Arrest Care & TTM2 Guidelines
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

export type TtmTargetProtocol = "HYPOTHERMIA_32_34C" | "HYPOTHERMIA_36C" | "STRICT_NORMOTHERMIA_37_5C";
export type ShiveringSeverity = 0 | 1 | 2 | 3; // Bedside Shivering Assessment Scale (BSAS)

export interface TtmPatientProfile {
  encounterId: string;
  patientAge: number;
  arrestRhythm: "VF_VT" | "PEA_ASYSTOLE" | "UNKNOWN";
  timeToRoscMinutes: number;
  currentCoreTempC: number;
  hoursPostRosc: number;
  bsasScore: ShiveringSeverity;
  rewarmingRateDegreesPerHour?: number; // Target 0.25 - 0.5 °C/hr
  selectedProtocol: TtmTargetProtocol;
  neuromuscularBlockadeActive: boolean;
  pupillometryNpi?: number; // Neurological Pupil index (< 3 is abnormal)
  ssepN20Present?: boolean; // Somatosensory Evoked Potential N20 bilaterally absent = poor outcome
  serumNseMcgPerL?: number; // Neuron-Specific Enolase (> 60 mcg/L at 48-72h = severe hypoxic-ischemic injury)
  eegPattern?: "MALIGNANT_BURST_SUPPRESSION" | "STATUS_EPILEPTICUS" | "CONTINUOUS_REACTIVE" | "DIFFUSE_SLOWING";
  proposedInterventions?: string[];
}

export interface TtmAssessmentReport {
  protocolGuidance: {
    targetRange: string;
    durationHours: number;
    recommendedDevice: string;
    clinicalRationale: string;
  };
  shiveringControl: {
    bsasGrade: string;
    steppedTherapyPlan: string[];
    metabolicRiskWarning: string;
  };
  rewarmingProtocol: {
    targetRateCPerHour: number;
    safeRewarmingDurationHours: number;
    hyperkalemiaRiskNotice: string;
  };
  neuroprognostication: {
    timingStatus: "PREMATURE_LOCKOUT" | "ELIGIBLE_FOR_ASSESSMENT";
    poorOutcomeSignsCount: number;
    multimodalFindings: string[];
    conclusivePrognosisAvailable: boolean;
    advisory: string;
  };
  trippedInvariants: string[];
  safetyDirectives: string[];
  spokenGuidance: string;
}

/**
 * Bedside Shivering Assessment Scale (BSAS) Stepped Protocol:
 * 0: None
 * 1: Mild (neck/thorax only) -> Surface counterwarming + IV Acetaminophen + Buspirone/Magnesium
 * 2: Moderate (upper extremities involved) -> Dexmedetomidine / Fentanyl infusion
 * 3: Severe (whole body shivering) -> Neuromuscular blockade (Cisatracurium/Rocuronium) with continuous EEG
 */
export function evaluateShiveringProtocol(score: ShiveringSeverity): {
  bsasGrade: string;
  steppedTherapyPlan: string[];
  metabolicRiskWarning: string;
} {
  switch (score) {
    case 0:
      return {
        bsasGrade: "BSAS 0: No Shivering Detected",
        steppedTherapyPlan: ["Maintain core temperature monitoring; no active shivering pharmacotherapy needed."],
        metabolicRiskWarning: "Minimal cerebral oxygen consumption impact.",
      };
    case 1:
      return {
        bsasGrade: "BSAS 1: Mild Shivering (Thorax / Neck Musculature)",
        steppedTherapyPlan: [
          "Apply peripheral counterwarming (forced air warming blanket set to 40-43°C on upper/lower limbs).",
          "Administer Acetaminophen 1000 mg IV every 6 hours (reduces hypothalamic set point).",
          "Administer Magnesium Sulfate 2.0 g IV bolus over 15 minutes, maintain serum Mg between 3.0-4.0 mg/dL.",
          "Add Buspirone 30 mg via nasogastric tube every 8 hours (synergistic shivering threshold depression).",
        ],
        metabolicRiskWarning: "Metabolic rate and cerebral oxygen demand increased by 20% to 40%.",
      };
    case 2:
      return {
        bsasGrade: "BSAS 2: Moderate Shivering (Prominent Limb & Pectoral Muscle Tremor)",
        steppedTherapyPlan: [
          "Continue step 1 measures (counterwarming + IV magnesium + acetaminophen).",
          "Initiate Dexmedetomidine infusion at 0.2 to 0.7 mcg/kg/hr IV (alpha-2 agonism suppresses shivering without respiratory depression).",
          "Consider IV Fentanyl boluses 25 to 50 mcg IV or continuous infusion 25 to 100 mcg/hr.",
        ],
        metabolicRiskWarning: "Metabolic rate and oxygen consumption increased by 50% to 100%; risk of acute hyperthermic breakthrough.",
      };
    case 3:
      return {
        bsasGrade: "BSAS 3: Severe Shivering (Full Body Rigidity & Vigorous Tremors)",
        steppedTherapyPlan: [
          "Mandate full endotracheal sedation with Propofol (20 to 50 mcg/kg/min) or Midazolam (0.05 to 0.2 mg/kg/hr) plus high-dose opiate.",
          "Administer Neuromuscular Blockade: Cisatracurium 0.15 mg/kg IV bolus followed by 1 to 3 mcg/kg/min infusion, or Rocuronium bolus.",
          "Initiate mandatory continuous EEG monitoring (blocks motor manifestations while status epilepticus may persist).",
          "Monitor Train-of-Four (TOF) peripheral nerve stimulation targeting 1-2 twitches out of 4.",
        ],
        metabolicRiskWarning: "Catastrophic shivering thermogenesis: oxygen consumption spikes > 200%, severe intracranial pressure elevation.",
      };
  }
}

/**
 * Evaluates Post-Cardiac Arrest Targeted Temperature Management & Multimodal Neuroprognostication
 */
export function evaluateTtmResuscitation(profile: TtmPatientProfile): TtmAssessmentReport {
  const trippedInvariants: string[] = [];
  const safetyDirectives: string[] = [];

  // 1. Protocol Parameters
  let targetRange = "";
  let durationHours = 24;
  let clinicalRationale = "";

  if (profile.selectedProtocol === "HYPOTHERMIA_32_34C") {
    targetRange = "32.0°C to 34.0°C Core";
    durationHours = 24;
    clinicalRationale = "Therapeutic hypothermia target for comatose post-ROSC patients (AHA 2020 / ERC 2021). Suppresses free radical generation, blood-brain barrier permeability, and apoptotic ischemic pathways.";
  } else if (profile.selectedProtocol === "HYPOTHERMIA_36C") {
    targetRange = "36.0°C Core";
    durationHours = 24;
    clinicalRationale = "Moderate hypothermia protocol (Nielsen et al., 2013). Minimizes vasodilation, bleeding risk, and shivering while protecting penumbral brain tissue.";
  } else {
    targetRange = "Strict Normothermia <= 37.5°C Core";
    durationHours = 72;
    clinicalRationale = "Strict normothermia with active fever prevention (TTM2 Trial, Dankiewicz et al., 2021). Avoids hyperthermia (> 37.7°C) for at least 72 hours post-ROSC.";
  }

  // 2. Shivering Assessment
  const shivering = evaluateShiveringProtocol(profile.bsasScore);

  // 3. Rewarming Protocol
  const safeRewarmingRate = 0.25; // °C/hr
  const deltaT = Math.max(0, 37.0 - profile.currentCoreTempC);
  const calculatedRewarmingHours = deltaT > 0 ? Number((deltaT / safeRewarmingRate).toFixed(1)) : 0;

  // 4. Neuroprognostication Multimodal Assessment
  // Rule: Must be >= 72 hours post-ROSC and FREE of residual sedation/paralytics before definitive poor outcome determination
  const isEligibleForNeuroprognostication = profile.hoursPostRosc >= 72 && !profile.neuromuscularBlockadeActive;
  const multimodalFindings: string[] = [];
  let poorOutcomeCount = 0;

  if (profile.pupillometryNpi !== undefined) {
    if (profile.pupillometryNpi < 3.0) {
      multimodalFindings.push(`Automated Pupillometry: Abnormal NPi = ${profile.pupillometryNpi} (< 3.0 indicates absent/attenuated light reflex)`);
      poorOutcomeCount++;
    } else {
      multimodalFindings.push(`Automated Pupillometry: Normal NPi = ${profile.pupillometryNpi} (>= 3.0 preserves midbrain pathway)`);
    }
  }

  if (profile.ssepN20Present !== undefined) {
    if (!profile.ssepN20Present) {
      multimodalFindings.push("Somatosensory Evoked Potentials (SSEP): Bilaterally absent N20 cortical response (strong predictor of irreversible cortical necrosis)");
      poorOutcomeCount++;
    } else {
      multimodalFindings.push("Somatosensory Evoked Potentials (SSEP): N20 cortical response present");
    }
  }

  if (profile.serumNseMcgPerL !== undefined) {
    if (profile.serumNseMcgPerL > 60) {
      multimodalFindings.push(`Biomarker: Serum Neuron-Specific Enolase (NSE) = ${profile.serumNseMcgPerL} mcg/L (> 60 mcg/L at 48-72h predicts severe brain injury)`);
      poorOutcomeCount++;
    } else {
      multimodalFindings.push(`Biomarker: Serum NSE = ${profile.serumNseMcgPerL} mcg/L`);
    }
  }

  if (profile.eegPattern) {
    if (profile.eegPattern === "MALIGNANT_BURST_SUPPRESSION" || profile.eegPattern === "STATUS_EPILEPTICUS") {
      multimodalFindings.push(`Electroencephalogram (EEG): Highly malignant pattern (${profile.eegPattern.replace("_", " ")})`);
      poorOutcomeCount++;
    } else {
      multimodalFindings.push(`Electroencephalogram (EEG): ${profile.eegPattern.replace("_", " ")}`);
    }
  }

  // =========================================================================
  // NON-COMPENSATORY SAFETY INVARIANTS (21 U.S.C. § 360j(o)(1)(E))
  // =========================================================================

  // Invariant CF-TTM-001: Rebound Hyperthermia Veto
  // Fever (> 37.8°C) in the first 72 hours post-cardiac arrest accelerates ischemic neuronal destruction
  if (profile.hoursPostRosc <= 72 && profile.currentCoreTempC > 37.7) {
    trippedInvariants.push("CF-TTM-001");
    safetyDirectives.push(
      "SAFETY VETO [CF-TTM-001]: Rebound Hyperthermia Triggered. Core temperature is " +
        profile.currentCoreTempC.toFixed(1) +
        "°C (> 37.7°C) within the 72-hour vulnerability window. Mandate immediate active surface or intravascular cooling clamp targeting <= 37.0°C to halt secondary ischemic neuronal necrosis."
    );
  }

  // Invariant CF-TTM-002: Rapid Rewarming Fatal Hyperkalemia Veto
  // Rewarming > 0.5°C/hr causes rapid shift of intracellular potassium into the extracellular space -> fatal asystole/VF
  if (profile.rewarmingRateDegreesPerHour !== undefined && profile.rewarmingRateDegreesPerHour > 0.5) {
    trippedInvariants.push("CF-TTM-002");
    safetyDirectives.push(
      "SAFETY VETO [CF-TTM-002]: Rapid Rewarming Rate Veto (" +
        profile.rewarmingRateDegreesPerHour.toFixed(2) +
        "°C/hr). Rewarming must not exceed 0.25°C to 0.50°C per hour. Rapid rewarming triggers massive intracellular-to-extracellular potassium shifts, severe vasodilation shock, and fatal ventricular arrhythmias. Clamp rewarming rate to <= 0.25°C/hr."
    );
  }

  // Invariant CF-TTM-003: Premature Paralytic Neuroprognostication Lockout
  // Clinical neuroprognostication attempted while paralytic or sedative is active, or < 72h post-ROSC
  if (
    (profile.hoursPostRosc < 72 || profile.neuromuscularBlockadeActive) &&
    profile.proposedInterventions?.includes("WITHDRAWAL_LIFE_SUSTAINING_THERAPY")
  ) {
    trippedInvariants.push("CF-TTM-003");
    safetyDirectives.push(
      "SAFETY VETO [CF-TTM-003]: Premature Neuroprognostication & Withdrawal Lockout. Withdrawal of life-sustaining therapy based on neurological prognosis is strictly prohibited prior to 72 hours post-ROSC and while neuromuscular blockade or high-dose sedation remains active. Confounding pharmacological paralysis must be fully washed out."
    );
  }

  // Invariant CF-TTM-004: Uncontrolled BSAS 3 Shivering Thermogenesis Veto
  if (profile.bsasScore === 3 && !profile.neuromuscularBlockadeActive && !profile.proposedInterventions?.includes("PARALYTIC_SEDATION_LOCK")) {
    trippedInvariants.push("CF-TTM-004");
    safetyDirectives.push(
      "SAFETY VETO [CF-TTM-004]: Uncontrolled Shivering Thermogenesis. BSAS Grade 3 shivering doubles cerebral oxygen demand and causes acute intracranial hypertension. Mandate deep sedation and neuromuscular blockade (Cisatracurium/Rocuronium) with continuous electroencephalography."
    );
  }

  // Spoken Zero-Truncation Narrative
  const spokenParts = [
    `Targeted Temperature Management Assessment for patient ${profile.encounterId}.`,
    `Selected protocol: ${profile.selectedProtocol.replace(/_/g, " ")}. Core target: ${targetRange}.`,
    `Current core temperature is ${profile.currentCoreTempC.toFixed(1)} degrees Celsius at ${profile.hoursPostRosc} hours post-ROSC.`,
    shivering.bsasGrade + ".",
    `Rewarming rate target is ${safeRewarmingRate} degrees Celsius per hour over an estimated ${calculatedRewarmingHours} hours.`,
  ];

  if (!isEligibleForNeuroprognostication) {
    spokenParts.push(
      `Formal neuroprognostication is locked. Patient is at ${profile.hoursPostRosc} hours post-ROSC with ${
        profile.neuromuscularBlockadeActive ? "active neuromuscular blockade" : "observation ongoing"
      }. Minimum multimodal timeline requires 72 hours off sedatives.`
    );
  } else {
    spokenParts.push(
      `Patient is eligible for 72-hour multimodal neuroprognostication. Identified ${poorOutcomeCount} high-specificity poor outcome predictors.`
    );
  }

  if (trippedInvariants.length > 0) {
    spokenParts.push(
      `Warning: ${trippedInvariants.length} critical safety invariant alerts tripped: ${trippedInvariants.join(", ")}.`
    );
    spokenParts.push(safetyDirectives.join(" "));
  }

  return {
    protocolGuidance: {
      targetRange,
      durationHours,
      recommendedDevice: "Closed-loop feedback intravascular catheter or automated gel surface cooling system with esophageal/bladder temperature probe.",
      clinicalRationale,
    },
    shiveringControl: shivering,
    rewarmingProtocol: {
      targetRateCPerHour: safeRewarmingRate,
      safeRewarmingDurationHours: calculatedRewarmingHours,
      hyperkalemiaRiskNotice: "Stop potassium supplementation at least 6 hours prior to initiating active rewarming to prevent catastrophic hyperkalemic rebound.",
    },
    neuroprognostication: {
      timingStatus: isEligibleForNeuroprognostication ? "ELIGIBLE_FOR_ASSESSMENT" : "PREMATURE_LOCKOUT",
      poorOutcomeSignsCount: poorOutcomeCount,
      multimodalFindings,
      conclusivePrognosisAvailable: isEligibleForNeuroprognostication && poorOutcomeCount >= 2,
      advisory: isEligibleForNeuroprognostication
        ? poorOutcomeCount >= 2
          ? "High probability of poor neurological outcome confirmed by >= 2 independent concordant multimodal criteria (AAN/ERC 2021)."
          : "Inconclusive; continue observation and serial electrophysiology."
        : "Do not prognosticate poor outcome prior to 72 hours post-ROSC or in the presence of sedatives/hypothermia.",
    },
    trippedInvariants,
    safetyDirectives,
    spokenGuidance: spokenParts.join(" "),
  };
}
