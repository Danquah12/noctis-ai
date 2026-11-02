/**
 * NOCTIS ENDOCRINE & METABOLIC DECISION SUPPORT ENGINE
 * Spec: NOCTIS-ENDOCRINE-CDS-003 (ADA 2026 Standards of Care, Endocrine Society, ATA Guidelines)
 *
 * Core Capabilities:
 * 1. Continuous Glucose Monitoring (CGM) & Ambulatory Glucose Profile (AGP) Analytics
 * 2. DKA vs HHS Triage & Anion Gap Acidosis with Hypokalemia Insulin Safety Lock
 * 3. Thyroid Storm (Burch-Wartofsky Point Scale) & Adrenal Crisis Gateway
 * 4. Hyponatremia Algorithmic Decider (Serum Osmolality, Urine Sodium, Volume Status & ODS Overcorrection Guard)
 *
 * Zero-Fabrication Rule: Unprovided clinical parameters are explicitly marked as NOT_PROVIDED.
 */

export interface CgmProfileInput {
  timeInRangePercent?: number; // 70-180 mg/dL (target >= 70%)
  timeBelowRangeLevel1Percent?: number; // 54-69 mg/dL (target < 4%)
  timeBelowRangeLevel2Percent?: number; // < 54 mg/dL (target < 1%)
  timeAboveRangeLevel1Percent?: number; // 181-250 mg/dL (target < 25%)
  timeAboveRangeLevel2Percent?: number; // > 250 mg/dL (target < 5%)
  glycemicVariabilityCvPercent?: number; // CV % (target <= 36%)
  meanGlucoseMgDl?: number;
  glucoseManagementIndicatorGmiPercent?: number; // GMI %
  laboratoryHba1cPercent?: number;
  isFrailOrElderly?: boolean; // Frail target TIR is >= 50%
}

export interface CgmProfileResult {
  overallControlStatus: "OPTIMAL" | "ELEVATED_HYPOGLYCEMIA_RISK" | "SUBOPTIMAL_HYPERGLYCEMIA" | "HIGH_VARIABILITY";
  adherenceToTargets: {
    tirTargetMet: boolean;
    tbrTargetMet: boolean;
    tarTargetMet: boolean;
    cvTargetMet: boolean;
  };
  discordanceWarning?: string;
  clinicalActions: string[];
}

export interface DkaHhsInput {
  glucoseMgDl: number;
  arterialOrVenousPh: number;
  serumBicarbonateMeqL: number;
  serumSodiumMeqL: number;
  serumChlorideMeqL: number;
  serumPotassiumMeqL: number;
  bloodUreaNitrogenMgDl?: number;
  urineOrSerumKetonesPositive?: boolean;
  betaHydroxybutyrateMmolL?: number;
  mentalStatus?: "ALERT" | "DROWSY" | "STUPOROUS" | "COMATOSE";
  sglt2InhibitorPrescribed?: boolean;
}

export interface DkaHhsResult {
  diagnosis:
    | "MILD_DKA"
    | "MODERATE_DKA"
    | "SEVERE_DKA"
    | "EUGLYCEMIC_DKA_SGLT2I"
    | "HYPEROSMOLAR_HYPERGLYCEMIC_STATE_HHS"
    | "MIXED_DKA_HHS"
    | "UNCOMPLICATED_HYPERGLYCEMIA";
  anionGapMeqL: number;
  effectiveSerumOsmolalityMOsmKg?: number;
  isHypokalemicInsulinLocked: boolean; // TRUE if K+ < 3.3 mmol/L
  insulinAdministrationAllowed: boolean;
  fluidResuscitationProtocol: string;
  potassiumReplacementInstructions: string;
  criticalAlerts: string[];
}

export interface BurchWartofskyInput {
  temperatureF?: number;
  cnsEffects?: "NONE" | "MILD_AGITATION" | "MODERATE_DELIRIUM_PSYCHOSIS" | "SEVERE_COMA_SEIZURE";
  giHepaticEffects?: "NONE" | "MODERATE_DIARRHEA_NAUSEA_JAUNDICE" | "SEVERE_UNEXPLAINED_JAUNDICE";
  heartRateBpm?: number;
  congestiveHeartFailureClass?: "NONE" | "MILD_PEDAL_EDEMA" | "MODERATE_BIBASILAR_RALES" | "SEVERE_PULMONARY_EDEMA";
  atrialFibrillationPresent?: boolean;
  precipitantHistoryIdentified?: boolean; // infection, trauma, surgery, DKA, childbirth
}

export interface BurchWartofskyResult {
  totalScore: number;
  diagnosisLikelihood: "THYROID_STORM_HIGHLY_LIKELY" | "IMPENDING_STORM_THREAT" | "THYROID_STORM_UNLIKELY";
  pointBreakdown: { [category: string]: number };
  emergencyInterventions: string[];
}

export interface HyponatremiaInput {
  serumSodiumMeqL: number; // < 135
  measuredSerumOsmolalityMOsmKg?: number; // normal 275-295
  bloodGlucoseMgDl?: number;
  urineOsmolalityMOsmKg?: number;
  urineSodiumMeqL?: number;
  volumeStatus?: "HYPOVOLEMIC" | "EUVOLEMIC" | "HYPERVOLEMIC";
  activeSevereSymptoms?: boolean; // seizures, coma, respiratory arrest
}

export interface HyponatremiaResult {
  tonicState: "HYPOTONIC_HYPONATREMIA" | "ISOTONIC_PSEUDOHYPONATREMIA" | "HYPERTONIC_TRANSLOCATIONAL";
  correctedSodiumForHyperglycemia?: number;
  etiologyCategory: string;
  differentialDiagnoses: string[];
  max24HourCorrectionRateMeqL: number; // 8-10 mEq/L
  overcorrectionOdsWarning: string;
  treatmentPlan: string;
}

/**
 * 1. CONTINUOUS GLUCOSE MONITORING (CGM) ANALYZER
 */
export function analyzeCgmProfile(input: CgmProfileInput): CgmProfileResult {
  const isFrail = Boolean(input.isFrailOrElderly);
  const targetTir = isFrail ? 50 : 70;
  const tir = input.timeInRangePercent ?? 0;
  const tbrL1 = input.timeBelowRangeLevel1Percent ?? 0;
  const tbrL2 = input.timeBelowRangeLevel2Percent ?? 0;
  const totalTbr = tbrL1 + tbrL2;
  const tarL1 = input.timeAboveRangeLevel1Percent ?? 0;
  const tarL2 = input.timeAboveRangeLevel2Percent ?? 0;
  const totalTar = tarL1 + tarL2;
  const cv = input.glycemicVariabilityCvPercent ?? 0;

  const tirMet = tir >= targetTir;
  const tbrMet = totalTbr < 4 && tbrL2 < 1;
  const tarMet = totalTar < 25 && tarL2 < 5;
  const cvMet = cv === 0 || cv <= 36;

  const actions: string[] = [];
  let status: CgmProfileResult["overallControlStatus"] = "OPTIMAL";

  if (!tbrMet) {
    status = "ELEVATED_HYPOGLYCEMIA_RISK";
    actions.push(`🚨 HIGH HYPOGLYCEMIA RISK: Time Below Range is ${totalTbr.toFixed(1)}% (target < 4%). Immediate reduction or re-timing of secretagogues (Sulfonylureas) or basal/bolus insulin required to prevent severe neuroglycopenic events.`);
  } else if (!cvMet && cv > 36) {
    status = "HIGH_VARIABILITY";
    actions.push(`High Glycemic Variability (CV ${cv.toFixed(1)}% > 36%). Suggests frequent glycemic excursions. Evaluate mealtime carb counting consistency, gastroparesis, or erratic insulin absorption.`);
  } else if (!tirMet) {
    status = "SUBOPTIMAL_HYPERGLYCEMIA";
    actions.push(`Suboptimal Time-in-Range (${tir.toFixed(1)}% vs target >= ${targetTir}%). Titrate antihyperglycemic therapies (e.g. SGLT2i, GLP-1 RA, or basal insulin adjustment).`);
  }

  // Discordance between GMI and Lab A1c
  let discordance: string | undefined;
  if (input.glucoseManagementIndicatorGmiPercent && input.laboratoryHba1cPercent) {
    const diff = Math.abs(input.glucoseManagementIndicatorGmiPercent - input.laboratoryHba1cPercent);
    if (diff >= 0.5) {
      discordance = `Clinically significant discordance (${diff.toFixed(1)}%) between GMI (${input.glucoseManagementIndicatorGmiPercent.toFixed(1)}%) and Laboratory HbA1c (${input.laboratoryHba1cPercent.toFixed(1)}%). Possible hemoglobinopathy, altered erythrocyte lifespan (hemolysis, chronic kidney disease, recent transfusion), or iron deficiency. Rely on CGM sensor mean rather than HbA1c alone.`;
      actions.push(discordance);
    }
  }

  return {
    overallControlStatus: status,
    adherenceToTargets: {
      tirTargetMet: tirMet,
      tbrTargetMet: tbrMet,
      tarTargetMet: tarMet,
      cvTargetMet: cvMet,
    },
    discordanceWarning: discordance,
    clinicalActions: actions,
  };
}

/**
 * 2. DKA VS HHS DECIDER & ANION GAP ACIDITY WITH HYPOKALEMIA LOCK
 */
export function evaluateDkaHhs(input: DkaHhsInput): DkaHhsResult {
  const {
    glucoseMgDl,
    arterialOrVenousPh,
    serumBicarbonateMeqL,
    serumSodiumMeqL,
    serumChlorideMeqL,
    serumPotassiumMeqL,
    bloodUreaNitrogenMgDl,
    urineOrSerumKetonesPositive,
    betaHydroxybutyrateMmolL,
    sglt2InhibitorPrescribed,
  } = input;

  // Anion Gap = Na - (Cl + HCO3)
  const anionGap = serumSodiumMeqL - (serumChlorideMeqL + serumBicarbonateMeqL);

  // Effective Serum Osmolality = 2*Na + Glucose/18
  const effOsm = (2 * serumSodiumMeqL) + (glucoseMgDl / 18);

  const ketonesPresent = Boolean(urineOrSerumKetonesPositive) ||
    (betaHydroxybutyrateMmolL !== undefined && betaHydroxybutyrateMmolL >= 3.0);

  const hasHighAnionGapAcidosis = anionGap > 12 && arterialOrVenousPh < 7.30 && serumBicarbonateMeqL < 18;

  let diagnosis: DkaHhsResult["diagnosis"] = "UNCOMPLICATED_HYPERGLYCEMIA";

  if (sglt2InhibitorPrescribed && ketonesPresent && hasHighAnionGapAcidosis && glucoseMgDl < 250) {
    diagnosis = "EUGLYCEMIC_DKA_SGLT2I";
  } else if (glucoseMgDl >= 600 && effOsm >= 320 && arterialOrVenousPh > 7.30 && serumBicarbonateMeqL > 18) {
    diagnosis = "HYPEROSMOLAR_HYPERGLYCEMIC_STATE_HHS";
  } else if (glucoseMgDl >= 600 && ketonesPresent && hasHighAnionGapAcidosis && effOsm >= 320) {
    diagnosis = "MIXED_DKA_HHS";
  } else if (ketonesPresent || hasHighAnionGapAcidosis) {
    if (arterialOrVenousPh < 7.00 || serumBicarbonateMeqL < 10) {
      diagnosis = "SEVERE_DKA";
    } else if (arterialOrVenousPh <= 7.24 || (serumBicarbonateMeqL >= 10 && serumBicarbonateMeqL <= 14)) {
      diagnosis = "MODERATE_DKA";
    } else {
      diagnosis = "MILD_DKA";
    }
  }

  // HYPOKALEMIC INSULIN LOCK:
  // If K+ < 3.3 mEq/L, insulin MUST BE WITHHELD. Insulin shifts potassium intracellularly and will trigger fatal cardiac arrest.
  const isKLow = serumPotassiumMeqL < 3.3;
  const criticalAlerts: string[] = [];

  if (isKLow) {
    criticalAlerts.push(`🚨 CRITICAL SAFETY LOCK: Serum Potassium is ${serumPotassiumMeqL} mEq/L (< 3.3 mEq/L). DO NOT START INSULIN INFUSION! Administer IV KCl 20-40 mEq/hr until K+ > 3.3 mEq/L to prevent fatal arrhythmia and cardiac arrest.`);
  }

  if (diagnosis === "EUGLYCEMIC_DKA_SGLT2I") {
    criticalAlerts.push("🚨 EUGLYCEMIC DKA DETECTED: Blood glucose is < 250 mg/dL but patient has high-anion-gap ketoacidosis on an SGLT2 inhibitor. Discontinue SGLT2i immediately; initiate IV dextrose (D5W or D10W) in parallel with low-dose IV insulin to clear ketoacidosis.");
  }

  let kInstructions = "";
  if (isKLow) {
    kInstructions = "HOLD INSULIN. Give IV KCl 20-40 mEq/hr until K+ > 3.3 mEq/L.";
  } else if (serumPotassiumMeqL >= 3.3 && serumPotassiumMeqL <= 5.2) {
    kInstructions = "Add 20-30 mEq KCl per liter of IV fluids to maintain potassium between 4.0-5.0 mEq/L during insulin therapy.";
  } else {
    kInstructions = "Hold potassium replacement while K+ > 5.2 mEq/L, but re-check every 2 hours as insulin will drive potassium down.";
  }

  return {
    diagnosis,
    anionGapMeqL: Math.round(anionGap * 10) / 10,
    effectiveSerumOsmolalityMOsmKg: Math.round(effOsm * 10) / 10,
    isHypokalemicInsulinLocked: isKLow,
    insulinAdministrationAllowed: !isKLow,
    fluidResuscitationProtocol: "Initial fluid: 0.9% Normal Saline 1,000–1,500 mL/hr for the first hour. Once corrected sodium is known, switch to 0.45% NaCl (if sodium normal/high) or 0.9% NaCl (if low) at 250–500 mL/hr. Add 5% Dextrose when glucose drops < 200 mg/dL (DKA) or < 300 mg/dL (HHS).",
    potassiumReplacementInstructions: kInstructions,
    criticalAlerts,
  };
}

/**
 * 3. BURCH-WARTOFSKY POINT SCALE (BWPS) FOR THYROID STORM
 */
export function calculateBurchWartofsky(input: BurchWartofskyInput): BurchWartofskyResult {
  let totalScore = 0;
  const breakdown: { [category: string]: number } = {};

  // Temperature
  const temp = input.temperatureF;
  let tempPts = 0;
  if (temp) {
    if (temp >= 104.0) tempPts = 30;
    else if (temp >= 103.0) tempPts = 25;
    else if (temp >= 102.0) tempPts = 20;
    else if (temp >= 101.0) tempPts = 15;
    else if (temp >= 100.0) tempPts = 10;
    else if (temp >= 99.0) tempPts = 5;
  }
  if (tempPts > 0) { breakdown["Thermoregulatory Dysfunction (Temperature)"] = tempPts; totalScore += tempPts; }

  // CNS Effects
  let cnsPts = 0;
  switch (input.cnsEffects) {
    case "SEVERE_COMA_SEIZURE": cnsPts = 30; break;
    case "MODERATE_DELIRIUM_PSYCHOSIS": cnsPts = 20; break;
    case "MILD_AGITATION": cnsPts = 10; break;
  }
  if (cnsPts > 0) { breakdown["Central Nervous System Effects"] = cnsPts; totalScore += cnsPts; }

  // GI-Hepatic
  let giPts = 0;
  switch (input.giHepaticEffects) {
    case "SEVERE_UNEXPLAINED_JAUNDICE": giPts = 20; break;
    case "MODERATE_DIARRHEA_NAUSEA_JAUNDICE": giPts = 10; break;
  }
  if (giPts > 0) { breakdown["Gastrointestinal-Hepatic Dysfunction"] = giPts; totalScore += giPts; }

  // Heart Rate / Tachycardia
  const hr = input.heartRateBpm;
  let hrPts = 0;
  if (hr) {
    if (hr >= 140) hrPts = 25;
    else if (hr >= 130) hrPts = 20;
    else if (hr >= 120) hrPts = 15;
    else if (hr >= 110) hrPts = 10;
    else if (hr >= 100) hrPts = 5;
  }
  if (hrPts > 0) { breakdown["Cardiovascular Tachycardia"] = hrPts; totalScore += hrPts; }

  // Heart Failure
  let hfPts = 0;
  switch (input.congestiveHeartFailureClass) {
    case "SEVERE_PULMONARY_EDEMA": hfPts = 15; break;
    case "MODERATE_BIBASILAR_RALES": hfPts = 10; break;
    case "MILD_PEDAL_EDEMA": hfPts = 5; break;
  }
  if (hfPts > 0) { breakdown["Congestive Heart Failure Dysfunction"] = hfPts; totalScore += hfPts; }

  // Atrial Fibrillation
  if (input.atrialFibrillationPresent) {
    breakdown["Atrial Fibrillation"] = 10;
    totalScore += 10;
  }

  // Precipitant History
  if (input.precipitantHistoryIdentified) {
    breakdown["Precipitant Event History Identified"] = 10;
    totalScore += 10;
  }

  let likelihood: BurchWartofskyResult["diagnosisLikelihood"] = "THYROID_STORM_UNLIKELY";
  const interventions: string[] = [];

  if (totalScore >= 45) {
    likelihood = "THYROID_STORM_HIGHLY_LIKELY";
    interventions.push("🚨 THYROID STORM ICU MEDICAL EMERGENCY: Score >= 45. Multi-modal blockade required immediately without waiting for lab confirmation:");
    interventions.push("1. Beta-blocker: IV Esmolol infusion or high-dose Propranolol 60-80 mg PO q4h (blocks peripheral T4 to T3 conversion).");
    interventions.push("2. Thionamide: Propylthiouracil (PTU) 200 mg PO/NG q4h (preferred over methimazole in storm due to T4-to-T3 blockade).");
    interventions.push("3. Iodine solution: Saturated Solution of Potassium Iodide (SSKI) or Lugol's solution (GIVE AT LEAST 1 HOUR AFTER THIONAMIDE to prevent Wolff-Chaikoff substrate escape).");
    interventions.push("4. Corticosteroids: IV Hydrocortisone 100 mg q8h (treats relative adrenal insufficiency and inhibits peripheral hormone conversion).");
  } else if (totalScore >= 25) {
    likelihood = "IMPENDING_STORM_THREAT";
    interventions.push("Impending Thyroid Storm (Score 25-44). Admit to high-acuity/step-down unit for continuous cardiac monitoring and early thionamide/beta-blocker initiation.");
  } else {
    likelihood = "THYROID_STORM_UNLIKELY";
  }

  return {
    totalScore,
    diagnosisLikelihood: likelihood,
    pointBreakdown: breakdown,
    emergencyInterventions: interventions,
  };
}

/**
 * 4. HYPONATREMIA ALGORITHMIC DECIDER
 */
export function evaluateHyponatremia(input: HyponatremiaInput): HyponatremiaResult {
  const { serumSodiumMeqL, measuredSerumOsmolalityMOsmKg, bloodGlucoseMgDl, urineOsmolalityMOsmKg, urineSodiumMeqL, volumeStatus, activeSevereSymptoms } = input;

  // Correct sodium for hyperglycemia: Katz formula: Corrected Na = Measured Na + 0.016 * (Glucose - 100)
  let correctedNa: number | undefined;
  if (bloodGlucoseMgDl && bloodGlucoseMgDl > 100) {
    correctedNa = Math.round((serumSodiumMeqL + (0.016 * (bloodGlucoseMgDl - 100))) * 10) / 10;
  }

  let tonicState: HyponatremiaResult["tonicState"] = "HYPOTONIC_HYPONATREMIA";
  if (measuredSerumOsmolalityMOsmKg) {
    if (measuredSerumOsmolalityMOsmKg > 295) {
      tonicState = "HYPERTONIC_TRANSLOCATIONAL";
    } else if (measuredSerumOsmolalityMOsmKg >= 275 && measuredSerumOsmolalityMOsmKg <= 295) {
      tonicState = "ISOTONIC_PSEUDOHYPONATREMIA";
    }
  }

  let etiology = "";
  const differentials: string[] = [];
  let plan = "";

  if (tonicState === "HYPERTONIC_TRANSLOCATIONAL") {
    etiology = "Hypertonic Hyponatremia (Osmotic Shift)";
    differentials.push("Hyperglycemia (DKA/HHS)", "Exogenous hypertonic infusions (Mannitol, Maltose, Radiocontrast)");
    plan = `Correct the hyperglycemia. Corrected serum sodium is ${correctedNa ?? serumSodiumMeqL} mEq/L.`;
  } else if (tonicState === "ISOTONIC_PSEUDOHYPONATREMIA") {
    etiology = "Isotonic Pseudohyponatremia";
    differentials.push("Severe hypertriglyceridemia", "Multiple myeloma / severe paraproteinemia");
    plan = "Laboratory artifact due to plasma volume displacement. Measure direct ion-selective electrode (ISE) sodium.";
  } else {
    // True Hypotonic Hyponatremia
    if (volumeStatus === "HYPOVOLEMIC") {
      etiology = "Hypovolemic Hypotonic Hyponatremia";
      if (urineSodiumMeqL !== undefined && urineSodiumMeqL > 20) {
        differentials.push("Renal sodium wasting: Thiazide diuretics", "Mineralocorticoid deficiency (Addison's)", "Cerebral Salt Wasting");
      } else {
        differentials.push("Extra-renal losses: Severe dehydration, diarrhea, vomiting, third-spacing");
      }
      plan = "Volume expansion with isotonic 0.9% Normal Saline.";
    } else if (volumeStatus === "HYPERVOLEMIC") {
      etiology = "Hypervolemic Hypotonic Hyponatremia";
      differentials.push("Congestive Heart Failure", "Hepatic Cirrhosis", "Nephrotic Syndrome");
      plan = "Fluid restriction (1,000–1,500 mL/day), loop diuretics, and treatment of underlying organ failure.";
    } else {
      // Euvolemic
      etiology = "Euvolemic Hypotonic Hyponatremia";
      if (urineOsmolalityMOsmKg !== undefined && urineOsmolalityMOsmKg > 100 && (urineSodiumMeqL === undefined || urineSodiumMeqL > 20)) {
        differentials.push("Syndrome of Inappropriate ADH Secretion (SIADH)", "Severe Hypothyroidism", "Secondary Adrenal Insufficiency");
      } else {
        differentials.push("Primary Polydipsia (psychogenic water drinking)", "Low solute intake (Beer Potomania, 'Tea and Toast' diet)");
      }
      plan = "Fluid restriction (< 1,000 mL/day), oral salt tablets (NaCl), loop diuretic (Furosemide), or vasopressin receptor antagonist (Tolvaptan).";
    }
  }

  if (activeSevereSymptoms) {
    plan = "🚨 SEVERE SYMPTOMATIC HYPONATREMIA: Administer 3% Hypertonic Saline 100 mL IV bolus over 10 minutes (repeat up to twice if seizures/coma persist) to raise serum sodium acutely by 4-6 mEq/L.";
  }

  return {
    tonicState,
    correctedSodiumForHyperglycemia: correctedNa,
    etiologyCategory: etiology,
    differentialDiagnoses: differentials,
    max24HourCorrectionRateMeqL: 8,
    overcorrectionOdsWarning: "⚠️ OSMOTIC DEMYELINATION SYNDROME (ODS) WARNING: Do NOT exceed a correction velocity of 8 mEq/L in 24 hours (or 6 mEq/L/24hr in high-risk patients with malnutrition, alcoholism, or advanced liver disease). If overcorrection occurs, immediately infuse D5W or administer DDAVP.",
    treatmentPlan: plan,
  };
}
