/**
 * NOCTIS HEALTH 500 - OBSTETRIC & NEONATAL RESUSCITATION ENGINE (TRACK 21)
 * Standards: ACOG / NICHD 3-Tier Fetal Heart Rate (FHR) Classification,
 *             AAP / AHA Neonatal Resuscitation Program (NRP) 8th Edition,
 *             ACOG Magnesium Sulfate Severe Preeclampsia / Eclampsia Protocol
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-OB-001: Category III Fetal Distress Immediate Intrauterine Resuscitation & Emergent Delivery Veto
 * - CF-OB-002: Neonatal Hyperoxic Free-Radical Brain Injury Veto (Initiating >=35w infant on 100% O2)
 * - CF-OB-003: Golden Minute PPV Delay Veto (HR < 100 or apnea beyond 60s without PPV)
 * - CF-OB-004: Maternal Magnesium Sulfate Hypermagnesemia Toxicity Veto (Calcium Gluconate Antidote)
 */

export type FhrCategory = "CATEGORY_I" | "CATEGORY_II" | "CATEGORY_III";

export type FhrBaselineVariability = "ABSENT" | "MINIMAL" | "MODERATE" | "MARKED";

export type FhrDecelerationType = "NONE" | "EARLY" | "VARIABLE" | "LATE" | "PROLONGED" | "SINUSOIDAL";

export interface FetalHeartMonitoringProfile {
  patientId: string;
  patientName: string;
  gestationalWeeks: number;
  fhrBaselineBpm: number;
  variability: FhrBaselineVariability;
  decelerations: FhrDecelerationType;
  accelerationsPresent: boolean;
  uterineTachysystole: boolean; // >5 contractions in 10 mins
  oxytocinInfusionActive: boolean;
}

export interface ApgarParameters {
  appearanceSkinColor: 0 | 1 | 2; // 0=blue/pale, 1=acrocyanosis, 2=completely pink
  pulseHeartRate: 0 | 1 | 2;      // 0=absent, 1=<100 bpm, 2=>=100 bpm
  grimaceReflex: 0 | 1 | 2;       // 0=no response, 1=grimace/weak cry, 2=vigorous cry/cough
  activityMuscleTone: 0 | 1 | 2;  // 0=limp/flaccid, 1=some flexion, 2=active motion
  respirationEffort: 0 | 1 | 2;   // 0=absent, 1=slow/irregular, 2=vigorous cry
}

export interface NeonatalResuscitationProfile {
  neonatalId: string;
  gestationalAgeWeeks: number;
  birthWeightGrams: number;
  secondsSinceBirth: number;
  heartRateBpm: number;
  isBreathingOrCrying: boolean;
  muscleTone: "FLACCID" | "SOME_FLEXION" | "ACTIVE";
  attemptedInitialFiO2Percent: number;
  ppvInitiated: boolean;
  chestCompressionsActive: boolean;
  apgar1Min?: ApgarParameters;
  apgar5Min?: ApgarParameters;
}

export interface MaternalMagnesiumProfile {
  maternalId: string;
  magnesiumInfusionGramsPerHour: number;
  deepTendonReflexes: "ABSENT" | "HYPOREFLEXIC" | "NORMAL" | "BRISK";
  respiratoryRatePerMin: number;
  urineOutputMlPerHour: number;
  serumMagnesiumMgPerDl?: number;
}

export interface ObstetricEvaluationReport {
  timestampIso: string;
  fhrCategory: FhrCategory;
  fhrInterpretation: string;
  intrauterineResuscitationRequired: boolean;
  neonatalNrpStep: "ROUTINE_CARE" | "INITIAL_STEPS" | "PPV_OXYGENATION" | "MR_SOPA_CORRECTIVE" | "CHEST_COMPRESSIONS" | "EPINEPHRINE_VOLUME";
  targetOxygenFiO2Range: string;
  calculatedApgar1Min?: number;
  calculatedApgar5Min?: number;
  magnesiumToxicityDetected: boolean;
  trippedInvariants: string[];
  mandatoryActions: string[];
}

// -------------------------------------------------------------------------
// NICHD FETAL HEART RATE (FHR) CLASSIFICATION
// -------------------------------------------------------------------------

export function classifyFetalHeartRate(profile: FetalHeartMonitoringProfile): {
  category: FhrCategory;
  rationale: string;
} {
  // Category III: Sinusoidal OR Absent variability with recurrent late/variable decelerations or bradycardia
  if (profile.decelerations === "SINUSOIDAL") {
    return {
      category: "CATEGORY_III",
      rationale: "Sinusoidal pattern detected (indicative of severe fetal anemia or acute severe hypoxia/acidemia). Immediate intrauterine resuscitation and emergent delivery indicated.",
    };
  }

  if (
    profile.variability === "ABSENT" &&
    (profile.decelerations === "LATE" ||
      profile.decelerations === "VARIABLE" ||
      profile.fhrBaselineBpm < 110)
  ) {
    return {
      category: "CATEGORY_III",
      rationale: "Absent baseline variability with recurrent late/variable decelerations or bradycardia. Predictive of abnormal fetal acid-base status at observation.",
    };
  }

  // Category I: Baseline 110-160, moderate variability, no late/variable decels, early decels may be present
  if (
    profile.fhrBaselineBpm >= 110 &&
    profile.fhrBaselineBpm <= 160 &&
    profile.variability === "MODERATE" &&
    (profile.decelerations === "NONE" || profile.decelerations === "EARLY")
  ) {
    return {
      category: "CATEGORY_I",
      rationale: "Category I (Normal): Strongly predictive of normal fetal acid-base status. Routine labor monitoring.",
    };
  }

  // Category II: Indeterminate
  return {
    category: "CATEGORY_II",
    rationale: "Category II (Indeterminate): Not predictive of abnormal acid-base status, but requires continued surveillance, evaluation, and possible re-evaluation or intrauterine resuscitation.",
  };
}

// -------------------------------------------------------------------------
// APGAR SCORE ENGINE (0 to 10)
// -------------------------------------------------------------------------

export function calculateApgarScore(params: ApgarParameters): number {
  return (
    params.appearanceSkinColor +
    params.pulseHeartRate +
    params.grimaceReflex +
    params.activityMuscleTone +
    params.respirationEffort
  );
}

// -------------------------------------------------------------------------
// AAP / AHA NEONATAL RESUSCITATION PROGRAM (NRP 8TH ED) ENGINE
// -------------------------------------------------------------------------

export function evaluateNeonatalResuscitation(neonatal: NeonatalResuscitationProfile): {
  nrpStep: ObstetricEvaluationReport["neonatalNrpStep"];
  recommendedFiO2: string;
  medicationOrders: string[];
} {
  const isTerm = neonatal.gestationalAgeWeeks >= 35;
  const initialFiO2 = isTerm ? "21% (Room Air)" : "21% to 30%";
  const orders: string[] = [];

  // Heart rate < 60 bpm despite ventilation -> Compressions + Epinephrine
  if (neonatal.heartRateBpm < 60 && neonatal.secondsSinceBirth >= 60) {
    const weightKg = neonatal.birthWeightGrams / 1000;
    const epiMg = Math.round(weightKg * 0.02 * 1000) / 1000; // 0.02 mg/kg
    const epiMl = Math.round(weightKg * 0.2 * 10) / 10;     // 0.2 mL/kg of 1:10,000

    orders.push(
      `Synchronized chest compressions with 3:1 compression-to-ventilation ratio (90 compressions and 30 breaths per minute) using 100% oxygen.`
    );
    orders.push(
      `Epinephrine IV/IO: ${epiMg} mg (${epiMl} mL of 1:10,000 concentration). Flush with 3 mL normal saline.`
    );
    if (neonatal.birthWeightGrams < 4000) {
      const bolusMl = Math.round(weightKg * 10);
      orders.push(
        `If hypovolemia or acute blood loss suspected: Normal Saline or O-negative blood ${bolusMl} mL (10 mL/kg) IV over 5-10 minutes.`
      );
    }
    return {
      nrpStep: "EPINEPHRINE_VOLUME",
      recommendedFiO2: "100%",
      medicationOrders: orders,
    };
  }

  // Heart rate < 100 bpm or apneic/gasping -> PPV
  if (neonatal.heartRateBpm < 100 || !neonatal.isBreathingOrCrying) {
    orders.push(
      `Positive Pressure Ventilation (PPV) via T-piece resuscitator or flow-inflating bag at 40-60 breaths/min. PIP 20-25 cmH2O, PEEP 5 cmH2O.`
    );
    orders.push(
      `Apply pulse oximeter probe to RIGHT wrist/hand (pre-ductal). If HR does not improve, execute MR. SOPA corrective ventilation steps.`
    );
    return {
      nrpStep: "PPV_OXYGENATION",
      recommendedFiO2: initialFiO2,
      medicationOrders: orders,
    };
  }

  // Vigorous infant
  if (neonatal.isBreathingOrCrying && neonatal.heartRateBpm >= 100 && neonatal.muscleTone === "ACTIVE") {
    orders.push("Skin-to-skin contact with mother, warm, clear secretions as needed, continuous evaluation.");
    return {
      nrpStep: "ROUTINE_CARE",
      recommendedFiO2: "Room Air (21%)",
      medicationOrders: orders,
    };
  }

  return {
    nrpStep: "INITIAL_STEPS",
    recommendedFiO2: initialFiO2,
    medicationOrders: ["Provide warmth, position head/neck, clear secretions if needed, dry, and stimulate."],
  };
}

// -------------------------------------------------------------------------
// COMPREHENSIVE OBSTETRIC & NEONATAL EVALUATION SUITE
// -------------------------------------------------------------------------

export function evaluateObstetricNeonatalCare(input: {
  fhrProfile?: FetalHeartMonitoringProfile;
  neonatalProfile?: NeonatalResuscitationProfile;
  maternalMagnesium?: MaternalMagnesiumProfile;
}): ObstetricEvaluationReport {
  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];

  let fhrCategory: FhrCategory = "CATEGORY_I";
  let fhrRationale = "No active intrapartum monitoring reported.";
  let intrauterineResuscitation = false;

  // 1. Fetal Heart Rate Assessment
  if (input.fhrProfile) {
    const classification = classifyFetalHeartRate(input.fhrProfile);
    fhrCategory = classification.category;
    fhrRationale = classification.rationale;

    if (fhrCategory === "CATEGORY_III") {
      trippedInvariants.push("CF-OB-001");
      intrauterineResuscitation = true;
      mandatoryActions.push(
        "EMERGENT CATEGORY III FETAL DISTRESS VETO: Immediate intrauterine resuscitation required. 1) Discontinue Oxytocin/Pitocin immediately. 2) Lateral uterine displacement (left tilt). 3) 10 L/min non-rebreather oxygen. 4) 500-1000 mL IV crystalloid bolus. 5) Notify OB attending, anesthesia, and NICU for immediate operative or emergent cesarean delivery."
      );
    }
  }

  // 2. Neonatal Resuscitation Assessment
  let nrpStep: ObstetricEvaluationReport["neonatalNrpStep"] = "ROUTINE_CARE";
  let targetFiO2 = "21% (Room Air)";
  let apgar1: number | undefined;
  let apgar5: number | undefined;

  if (input.neonatalProfile) {
    const neo = input.neonatalProfile;
    const nrp = evaluateNeonatalResuscitation(neo);
    nrpStep = nrp.nrpStep;
    targetFiO2 = nrp.recommendedFiO2;

    if (neo.apgar1Min) apgar1 = calculateApgarScore(neo.apgar1Min);
    if (neo.apgar5Min) apgar5 = calculateApgarScore(neo.apgar5Min);

    // Invariant CF-OB-002: Neonatal Hyperoxic Brain Injury Veto
    // Initiating >=35 week infant on 100% FiO2 causes oxygen free radical retinal & cerebral injury
    if (neo.gestationalAgeWeeks >= 35 && neo.attemptedInitialFiO2Percent > 30) {
      trippedInvariants.push("CF-OB-002");
      mandatoryActions.push(
        `NEONATAL HYPEROXIC BRAIN INJURY VETO: Infant is >=35 weeks (${neo.gestationalAgeWeeks}w). Attempted initial FiO2 of ${neo.attemptedInitialFiO2Percent}% violates NRP 8th Edition guidelines. Resuscitation of term/late-preterm neonates MUST begin at 21% (room air) to prevent oxygen-free-radical myocardial, cerebral, and pulmonary reperfusion toxicity. Titrate FiO2 to target pre-ductal SpO2 table.`
      );
    }

    // Invariant CF-OB-003: Golden Minute PPV Delay Veto
    if (neo.secondsSinceBirth > 60 && (neo.heartRateBpm < 100 || !neo.isBreathingOrCrying) && !neo.ppvInitiated) {
      trippedInvariants.push("CF-OB-003");
      mandatoryActions.push(
        `GOLDEN MINUTE PPV DELAY VETO: Neonate is at ${neo.secondsSinceBirth} seconds of life with HR ${neo.heartRateBpm} bpm and inadequate respiration. Positive Pressure Ventilation (PPV) MUST be initiated within the first 60 seconds of life. Immediately initiate PPV via T-piece or bag-mask at 40-60 breaths/min.`
      );
    }
  }

  // 3. Maternal Magnesium Sulfate Toxicity Assessment
  let magnesiumToxicity = false;
  if (input.maternalMagnesium) {
    const mag = input.maternalMagnesium;
    if (
      mag.deepTendonReflexes === "ABSENT" ||
      mag.respiratoryRatePerMin < 12 ||
      mag.urineOutputMlPerHour < 30 ||
      (mag.serumMagnesiumMgPerDl !== undefined && mag.serumMagnesiumMgPerDl >= 9.0)
    ) {
      magnesiumToxicity = true;
      trippedInvariants.push("CF-OB-004");
      mandatoryActions.push(
        `MATERNAL MAGNESIUM TOXICITY VETO: Signs of severe hypermagnesemia detected (Reflexes: ${mag.deepTendonReflexes}, RR: ${mag.respiratoryRatePerMin}/min, UOP: ${mag.urineOutputMlPerHour} mL/h). 1) STOP Magnesium Sulfate infusion immediately. 2) Administer 1g Calcium Gluconate 10% IV (10 mL) over 3-5 minutes as competitive antidote. 3) Provide supplemental O2 and prepare for emergent endotracheal intubation if respiratory arrest occurs.`
      );
    }
  }

  return {
    timestampIso: new Date().toISOString(),
    fhrCategory,
    fhrInterpretation: fhrRationale,
    intrauterineResuscitationRequired: intrauterineResuscitation,
    neonatalNrpStep: nrpStep,
    targetOxygenFiO2Range: targetFiO2,
    calculatedApgar1Min: apgar1,
    calculatedApgar5Min: apgar5,
    magnesiumToxicityDetected: magnesiumToxicity,
    trippedInvariants,
    mandatoryActions,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatObstetricSpokenSummary(report: ObstetricEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Obstetric and neonatal resuscitation clinical decision report. Intrapartum fetal heart rate monitoring classification is ${report.fhrCategory.replace("_", " ")}.`
  );

  parts.push(`Fetal interpretation: ${report.fhrInterpretation}`);

  if (report.intrauterineResuscitationRequired) {
    parts.push(
      "Intrauterine resuscitation protocol actively required: discontinue oxytocin, apply lateral uterine tilt, administer high-flow oxygen, and provide maternal IV fluid bolus."
    );
  }

  parts.push(
    `Neonatal Resuscitation Program phase is ${report.neonatalNrpStep.replace(/_/g, " ")}. Target oxygenation is ${report.targetOxygenFiO2Range}.`
  );

  if (report.calculatedApgar1Min !== undefined) {
    parts.push(`Calculated 1-minute APGAR score is ${report.calculatedApgar1Min} out of 10.`);
  }
  if (report.calculatedApgar5Min !== undefined) {
    parts.push(`Calculated 5-minute APGAR score is ${report.calculatedApgar5Min} out of 10.`);
  }

  if (report.magnesiumToxicityDetected) {
    parts.push(
      "WARNING: Maternal magnesium sulfate toxicity detected. Calcium gluconate 1 gram IV antidote mandatory."
    );
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(`CRITICAL OBSTETRIC SAFETY VETOES TRIPPED: ${report.trippedInvariants.join(", ")}.`);
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push("All intrapartum and neonatal resuscitation parameters within accepted clinical practice guidelines.");
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL PRESETS
// -------------------------------------------------------------------------

export const OB_PRESET_CATEGORY_III_DISTRESS: FetalHeartMonitoringProfile = {
  patientId: "OB-CAT3-001",
  patientName: "Rachel Vance (G2P1, 39w2d - Late Decelerations)",
  gestationalWeeks: 39,
  fhrBaselineBpm: 105,
  variability: "ABSENT",
  decelerations: "LATE",
  accelerationsPresent: false,
  uterineTachysystole: true,
  oxytocinInfusionActive: true, // Incompatible with Category III!
};

export const NRP_PRESET_TERM_DEPRESSION: NeonatalResuscitationProfile = {
  neonatalId: "NEO-TERM-002",
  gestationalAgeWeeks: 39,
  birthWeightGrams: 3400,
  secondsSinceBirth: 75,
  heartRateBpm: 72,
  isBreathingOrCrying: false,
  muscleTone: "FLACCID",
  attemptedInitialFiO2Percent: 100, // Trips CF-OB-002!
  ppvInitiated: false,              // Trips CF-OB-003!
  chestCompressionsActive: false,
  apgar1Min: {
    appearanceSkinColor: 0,
    pulseHeartRate: 1,
    grimaceReflex: 0,
    activityMuscleTone: 0,
    respirationEffort: 0,
  },
};

export const OB_PRESET_MAGNESIUM_TOXICITY: MaternalMagnesiumProfile = {
  maternalId: "OB-MAG-003",
  magnesiumInfusionGramsPerHour: 2.0,
  deepTendonReflexes: "ABSENT", // Loss of DTRs!
  respiratoryRatePerMin: 9,     // Hypoventilation!
  urineOutputMlPerHour: 18,     // Oliguria!
  serumMagnesiumMgPerDl: 9.8,
};
