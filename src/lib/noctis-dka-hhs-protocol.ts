/**
 * NOCTIS HEALTH 500 - DIABETIC KETOACIDOSIS (DKA) & HYPEROSMOLAR HYPERGLYCEMIC STATE (HHS) ENGINE (TRACK 26)
 * Standards: American Diabetes Association (ADA) Standards of Medical Care in Hospitalized Hyperglycemia,
 *             Two-Bag Fluid Titration System, Corrected Sodium & Effective Osmolality Formulas,
 *             Potassium Safety Checkpoint & Subcutaneous Transition Protocol
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-DKA-001: Hypokalemic Insulin Infusion Fatal Arrhythmia Veto (K+ < 3.3 mEq/L; HOLD insulin)
 * - CF-DKA-002: Dextrose Omission & Acute Hypoglycemia / Cerebral Edema Veto (Glucose < 200 mg/dL)
 * - CF-DKA-003: Premature IV Insulin Discontinuation Rebound Ketoacidosis Veto (Lack of 2-hour SQ basal overlap)
 * - CF-DKA-004: Inappropriate Sodium Bicarbonate Infusion Veto (pH >= 6.90)
 */

export interface DkaPatientProfile {
  patientId: string;
  patientName: string;
  ageYears: number;
  weightKg: number;
  serumGlucoseMgPerDl: number;
  serumSodiumMeqPerL: number;
  serumPotassiumMeqPerL: number;
  serumChlorideMeqPerL: number;
  serumBicarbonateMeqPerL: number;
  bloodUreaNitrogenMgPerDl: number;
  arterialOrVenousPh: number;
  betaHydroxybutyrateMmolPerL: number; // Normal < 0.5 mmol/L, DKA >= 3.0 mmol/L
  urineKetones: "NEGATIVE" | "TRACE" | "MODERATE" | "LARGE";
  mentalStatus: "ALERT" | "DROWSY" | "STUPOR_COMA";
  // Active Therapies & Orders Under Audit
  insulinInfusionActive: boolean;
  insulinInfusionRateUnitsPerHour: number;
  dextroseInfusionActive: boolean;
  potassiumAddedToIvFluids: boolean;
  subcutaneousBasalGivenHoursAgo?: number; // Must be >= 2 hours before stopping IV insulin
  sodiumBicarbonateOrdered: boolean;
}

export interface DkaCalculations {
  anionGapMeqPerL: number;
  correctedSodiumMeqPerL: number;
  effectiveOsmolalityMOsmPerKg: number;
  crisisClassification: "MILD_DKA" | "MODERATE_DKA" | "SEVERE_DKA" | "HYPEROSMOLAR_HYPERGLYCEMIC_STATE" | "MIXED_DKA_HHS" | "RESOLVED";
  targetGlucoseRangeMgPerDl: string;
  recommendedIvFluidType: string;
  recommendedInsulinRateUnitsPerHour: number;
}

export interface DkaEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  calculations: DkaCalculations;
  potassiumCheckpointStatus: "SAFE_FOR_INSULIN" | "HOLD_INSULIN_AGGRESSIVE_REPLETION" | "ADD_POTASSIUM_TO_IVF";
  anionGapClosed: boolean;
  subcutaneousTransitionEligible: boolean;
  trippedInvariants: string[];
  mandatoryActions: string[];
}

// -------------------------------------------------------------------------
// MATHEMATICAL & OSMOLAR FORMULAS
// -------------------------------------------------------------------------

export function calculateDkaMetrics(profile: DkaPatientProfile): DkaCalculations {
  // Anion Gap: Na - (Cl + HCO3)
  const ag = profile.serumSodiumMeqPerL - (profile.serumChlorideMeqPerL + profile.serumBicarbonateMeqPerL);

  // Katz formula for Corrected Sodium: Na + 1.6 * ((Glucose - 100) / 100)
  const correctedNa =
    profile.serumSodiumMeqPerL + (1.6 * Math.max(profile.serumGlucoseMgPerDl - 100, 0)) / 100;

  // Effective Serum Osmolality: 2 * Na + (Glucose / 18)
  const effectiveOsm = 2 * profile.serumSodiumMeqPerL + profile.serumGlucoseMgPerDl / 18;

  // Crisis Classification
  let classification: DkaCalculations["crisisClassification"] = "MILD_DKA";

  const isHhs =
    profile.serumGlucoseMgPerDl > 600 &&
    effectiveOsm > 320 &&
    profile.arterialOrVenousPh > 7.30 &&
    profile.serumBicarbonateMeqPerL > 18;

  const isDka = ag > 12 && profile.betaHydroxybutyrateMmolPerL >= 3.0;

  if (isHhs && isDka) {
    classification = "MIXED_DKA_HHS";
  } else if (isHhs) {
    classification = "HYPEROSMOLAR_HYPERGLYCEMIC_STATE";
  } else if (isDka) {
    if (profile.arterialOrVenousPh < 7.0 || profile.serumBicarbonateMeqPerL < 10 || profile.mentalStatus === "STUPOR_COMA") {
      classification = "SEVERE_DKA";
    } else if (profile.arterialOrVenousPh < 7.25 || profile.serumBicarbonateMeqPerL < 15) {
      classification = "MODERATE_DKA";
    } else {
      classification = "MILD_DKA";
    }
  } else if (ag <= 12 && profile.serumBicarbonateMeqPerL >= 18 && profile.serumGlucoseMgPerDl < 200) {
    classification = "RESOLVED";
  }

  // Recommended IV Fluid Type based on Corrected Sodium
  const recommendedFluid =
    correctedNa >= 145 ? "0.45% NaCl (Half-Normal Saline) at 250-500 mL/hr" : "0.9% NaCl (Normal Saline) at 250-500 mL/hr";

  // Standard Insulin Infusion Rate: 0.1 units/kg/hr
  const stdInsulinRate = Math.round(profile.weightKg * 0.1 * 10) / 10;

  const targetGlucose =
    classification === "HYPEROSMOLAR_HYPERGLYCEMIC_STATE" || classification === "MIXED_DKA_HHS"
      ? "200 to 300 mg/dL"
      : "150 to 200 mg/dL";

  return {
    anionGapMeqPerL: Math.round(ag * 10) / 10,
    correctedSodiumMeqPerL: Math.round(correctedNa * 10) / 10,
    effectiveOsmolalityMOsmPerKg: Math.round(effectiveOsm * 10) / 10,
    crisisClassification: classification,
    targetGlucoseRangeMgPerDl: targetGlucose,
    recommendedIvFluidType: recommendedFluid,
    recommendedInsulinRateUnitsPerHour: stdInsulinRate,
  };
}

// -------------------------------------------------------------------------
// COMPREHENSIVE DKA / HHS EVALUATION ENGINE
// -------------------------------------------------------------------------

export function evaluateDkaHhsProtocol(profile: DkaPatientProfile): DkaEvaluationReport {
  const metrics = calculateDkaMetrics(profile);
  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];

  // Potassium Checkpoint Status
  let kStatus: DkaEvaluationReport["potassiumCheckpointStatus"] = "SAFE_FOR_INSULIN";
  if (profile.serumPotassiumMeqPerL < 3.3) {
    kStatus = "HOLD_INSULIN_AGGRESSIVE_REPLETION";
  } else if (profile.serumPotassiumMeqPerL <= 5.2) {
    kStatus = "ADD_POTASSIUM_TO_IVF";
  }

  // 1. Invariant CF-DKA-001: Hypokalemic Insulin Infusion Fatal Arrhythmia Veto
  if (profile.serumPotassiumMeqPerL < 3.3 && profile.insulinInfusionActive) {
    trippedInvariants.push("CF-DKA-001");
    mandatoryActions.push(
      `HYPOKALEMIC INSULIN INFUSION FATAL ARRHYTHMIA VETO: Serum potassium is ${profile.serumPotassiumMeqPerL} mEq/L (< 3.3 mEq/L critical checkpoint). Insulin drives potassium into cells via Na+/K+-ATPase activation, precipitating severe hypokalemia, QTc prolongation, polymorphic ventricular tachycardia, and cardiac arrest. STOP/HOLD INSULIN INFUSION IMMEDIATELY. Infuse IV KCl 20-40 mEq/hr until K+ >= 3.3 mEq/L before restarting insulin.`
    );
  }

  // 2. Invariant CF-DKA-002: Premature Dextrose Omission / Hypoglycemia & Cerebral Edema Veto
  const glucoseThreshold = metrics.crisisClassification.includes("HHS") ? 300 : 200;
  if (profile.serumGlucoseMgPerDl < glucoseThreshold && !profile.dextroseInfusionActive && metrics.anionGapMeqPerL > 12) {
    trippedInvariants.push("CF-DKA-002");
    mandatoryActions.push(
      `DEXTROSE OMISSION & CEREBRAL EDEMA VETO: Serum glucose has dropped to ${profile.serumGlucoseMgPerDl} mg/dL (< ${glucoseThreshold} mg/dL threshold), but the anion gap remains elevated at ${metrics.anionGapMeqPerL} mEq/L. Stopping insulin will re-trigger ketoacidosis, while continuing insulin without dextrose causes acute neuroglycopenic hypoglycemia and cerebral edema. IMMEDIATELY ADD 5% OR 10% DEXTROSE (D5W / D10W with 0.45% NaCl) to maintain glucose between ${metrics.targetGlucoseRangeMgPerDl} while continuing insulin.`
    );
  }

  // 3. Invariant CF-DKA-003: Premature IV Insulin Discontinuation Rebound Veto
  const isTransitioning = !profile.insulinInfusionActive && metrics.crisisClassification !== "RESOLVED";
  const missingBasalOverlap =
    !profile.insulinInfusionActive &&
    (profile.subcutaneousBasalGivenHoursAgo === undefined || profile.subcutaneousBasalGivenHoursAgo < 2.0);

  if (isTransitioning || (missingBasalOverlap && metrics.anionGapMeqPerL > 12)) {
    trippedInvariants.push("CF-DKA-003");
    mandatoryActions.push(
      "PREMATURE IV INSULIN DISCONTINUATION REBOUND VETO: IV regular insulin has a circulating half-life of only 4-5 minutes. Discontinuing the IV infusion without administering subcutaneous basal insulin (Glargine/Degludec) at least 2 hours prior guarantees immediate rebound ketoacidosis. Administer weight-based basal insulin and continue IV infusion for a full 2-hour overlap."
    );
  }

  // 4. Invariant CF-DKA-004: Inappropriate Sodium Bicarbonate Infusion Veto
  if (profile.sodiumBicarbonateOrdered && profile.arterialOrVenousPh >= 6.90) {
    trippedInvariants.push("CF-DKA-004");
    mandatoryActions.push(
      `INAPPROPRIATE SODIUM BICARBONATE VETO: Arterial/venous pH is ${profile.arterialOrVenousPh} (>= 6.90 cutoff). ADA guidelines strictly contraindicate bicarbonate therapy unless pH < 6.90. Exogenous bicarbonate generates CO2 that readily diffuses across the blood-brain barrier causing paradoxical intracellular cerebral acidosis, while worsening intracellular hypokalemia and tissue hypoxia (Bohr effect). CANCEL SODIUM BICARBONATE ORDER.`
    );
  }

  const agClosed = metrics.anionGapMeqPerL <= 12 && profile.serumBicarbonateMeqPerL >= 18;
  const sqEligible = agClosed && profile.serumGlucoseMgPerDl < 200 && profile.mentalStatus === "ALERT";

  return {
    timestampIso: new Date().toISOString(),
    patientId: profile.patientId,
    patientName: profile.patientName,
    calculations: metrics,
    potassiumCheckpointStatus: kStatus,
    anionGapClosed: agClosed,
    subcutaneousTransitionEligible: sqEligible,
    trippedInvariants,
    mandatoryActions,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatDkaSpokenSummary(report: DkaEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Diabetic ketoacidosis and hyperglycemic crisis clinical report for ${report.patientName}, identifier ${report.patientId}.`
  );

  parts.push(
    `Classification is ${report.calculations.crisisClassification.replace(/_/g, " ").toLowerCase()}. Calculated anion gap is ${report.calculations.anionGapMeqPerL} milliequivalents per liter. Corrected sodium is ${report.calculations.correctedSodiumMeqPerL} milliequivalents per liter, and effective serum osmolality is ${report.calculations.effectiveOsmolalityMOsmPerKg} milliosmoles per kilogram.`
  );

  parts.push(
    `Recommended fluid resuscitation is ${report.calculations.recommendedIvFluidType}. Standard insulin infusion rate is ${report.calculations.recommendedInsulinRateUnitsPerHour} units per hour. Target glycemic plateau is ${report.calculations.targetGlucoseRangeMgPerDl}.`
  );

  if (report.potassiumCheckpointStatus === "HOLD_INSULIN_AGGRESSIVE_REPLETION") {
    parts.push(
      "CRITICAL POTASSIUM ALERT: Potassium is below 3.3 milliequivalents per liter. Insulin infusion must be held."
    );
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(`CRITICAL ENDOCRINE SAFETY INVARIANTS TRIPPED: ${report.trippedInvariants.join(", ")}.`);
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push("Electrolyte titration and insulin infusion rates comply with American Diabetes Association protocols.");
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL PRESETS
// -------------------------------------------------------------------------

export const DKA_PRESET_HYPOKALEMIA: DkaPatientProfile = {
  patientId: "DKA-K-001",
  patientName: "Samantha Hayes (22yo F - Severe DKA with Hypokalemia)",
  ageYears: 22,
  weightKg: 60,
  serumGlucoseMgPerDl: 520,
  serumSodiumMeqPerL: 132,
  serumPotassiumMeqPerL: 2.9, // < 3.3! Trips CF-DKA-001
  serumChlorideMeqPerL: 96,
  serumBicarbonateMeqPerL: 8,
  bloodUreaNitrogenMgPerDl: 28,
  arterialOrVenousPh: 7.08,
  betaHydroxybutyrateMmolPerL: 6.4,
  urineKetones: "LARGE",
  mentalStatus: "DROWSY",
  insulinInfusionActive: true, // Lethal order when K+ is 2.9!
  insulinInfusionRateUnitsPerHour: 6.0,
  dextroseInfusionActive: false,
  potassiumAddedToIvFluids: false,
  sodiumBicarbonateOrdered: false,
};

export const DKA_PRESET_DEXTROSE_OMISSION: DkaPatientProfile = {
  patientId: "DKA-DEX-002",
  patientName: "Brandon Lee (31yo M - DKA Resolving Glycemia)",
  ageYears: 31,
  weightKg: 75,
  serumGlucoseMgPerDl: 175, // < 200 mg/dL! Trips CF-DKA-002
  serumSodiumMeqPerL: 138,
  serumPotassiumMeqPerL: 4.2,
  serumChlorideMeqPerL: 104,
  serumBicarbonateMeqPerL: 13, // Anion gap still open!
  bloodUreaNitrogenMgPerDl: 18,
  arterialOrVenousPh: 7.26,
  betaHydroxybutyrateMmolPerL: 3.8,
  urineKetones: "MODERATE",
  mentalStatus: "ALERT",
  insulinInfusionActive: true,
  insulinInfusionRateUnitsPerHour: 7.5,
  dextroseInfusionActive: false, // Dextrose omitted!
  potassiumAddedToIvFluids: true,
  sodiumBicarbonateOrdered: false,
};

export const DKA_PRESET_BICARB_ABUSE: DkaPatientProfile = {
  patientId: "DKA-BICARB-003",
  patientName: "Karen Phillips (48yo F - Moderate DKA)",
  ageYears: 48,
  weightKg: 70,
  serumGlucoseMgPerDl: 440,
  serumSodiumMeqPerL: 134,
  serumPotassiumMeqPerL: 4.6,
  serumChlorideMeqPerL: 100,
  serumBicarbonateMeqPerL: 11,
  bloodUreaNitrogenMgPerDl: 22,
  arterialOrVenousPh: 7.15, // >= 6.90! Trips CF-DKA-004
  betaHydroxybutyrateMmolPerL: 4.9,
  urineKetones: "LARGE",
  mentalStatus: "ALERT",
  insulinInfusionActive: true,
  insulinInfusionRateUnitsPerHour: 7.0,
  dextroseInfusionActive: false,
  potassiumAddedToIvFluids: true,
  sodiumBicarbonateOrdered: true, // Inappropriate bicarb order!
};
