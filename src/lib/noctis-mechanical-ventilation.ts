/**
 * NOCTIS HEALTH 500 - CRITICAL CARE MECHANICAL VENTILATION & ARDSNET PROTOCOL ENGINE
 * Standards: ARDSNet ARMA Trial (6 mL/kg PBW), Berlin Definition of ARDS,
 *             PROSEVA Prone Trial, Driving Pressure Optimization (Amato et al.)
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-VENT-001: Plateau Pressure (Pplat) > 30 cmH2O or Driving Pressure (ΔP) >= 15 cmH2O (Barotrauma/Volutrauma Veto)
 * - CF-VENT-002: Refractory Hypoxemia with PaO2/FiO2 <= 100 on PEEP >= 10 cmH2O (Mandate Prone Positioning >= 16h/day)
 * - CF-VENT-003: Severe Auto-PEEP / Dynamic Hyperinflation in Obstructive Airway Disease (Breath-Stacking Veto)
 */

export type BiologicalSex = "MALE" | "FEMALE";

export type VentilationMode =
  | "VOLUME_CONTROL_AC"
  | "PRESSURE_CONTROL_AC"
  | "PRESSURE_REGULATED_VOLUME_CONTROL"
  | "SIMV_PRESSURE_SUPPORT"
  | "PRESSURE_SUPPORT_CPAP";

export type ArdsSeverity =
  | "NONE"
  | "MILD" // 200 < PaO2/FiO2 <= 300 on PEEP >= 5
  | "MODERATE" // 100 < PaO2/FiO2 <= 200 on PEEP >= 5
  | "SEVERE"; // PaO2/FiO2 <= 100 on PEEP >= 5

export interface PatientVentilatorProfile {
  patientId: string;
  patientName: string;
  biologicalSex: BiologicalSex;
  heightInches: number;
  actualWeightKg: number;
  predictedBodyWeightKg: number; // PBW (Devine formula)
  mode: VentilationMode;
  setTidalVolumeMl: number;
  tidalVolumeMlPerKgPbw: number;
  respiratoryRateSetPerMin: number;
  respiratoryRateTotalPerMin: number;
  fiO2Percent: number; // 21 - 100%
  peepCmH2O: number; // 5 - 24 cmH2O
  peakInspiratoryPressureCmH2O: number; // PIP
  plateauPressureCmH2O: number; // Pplat (inspiratory hold)
  drivingPressureCmH2O: number; // Pplat - PEEP
  staticComplianceMlPerCmH2O: number; // Vt / (Pplat - PEEP)
  airwayResistanceCmH2OPerLPerSec?: number;
  autoPeepCmH2O?: number; // Expiratory hold
  abg?: {
    pH: number;
    paCO2MmHg: number;
    paO2MmHg: number;
    hco3MmolPerL: number;
    spO2Percent: number;
  };
}

export interface ArdsNetTitrationStep {
  peepCmH2O: number;
  fiO2Percent: number;
  strategy: "LOWER_PEEP_HIGHER_FIO2" | "HIGHER_PEEP_LOWER_FIO2";
}

export interface VentilatorEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  predictedBodyWeightKg: number;
  targetTidalVolumeRangeMl: {
    fourMlPerKg: number;
    sixMlPerKg: number; // Gold standard target
    eightMlPerKg: number;
  };
  currentVtPerKgPbw: number;
  drivingPressureCmH2O: number;
  staticCompliance: number;
  pao2Fio2Ratio?: number;
  ardsSeverity: ArdsSeverity;
  oxygenationAdequacy: "ADEQUATE" | "HYPOXEMIC" | "HYPEROXIC";
  acidBaseStatus: "NORMAL" | "ACIDEMIA" | "ALKALEMIA" | "PERMISSIVE_HYPERCAPNIA";
  trippedInvariants: string[];
  mandatoryActions: string[];
  recommendedVentilatorAdjustments: {
    suggestedTidalVolumeMl: number;
    suggestedPeepCmH2O: number;
    suggestedFiO2Percent: number;
    suggestedRatePerMin: number;
    rationale: string;
  };
}

// -------------------------------------------------------------------------
// MATHEMATICAL FORMULAS & ARDSNET PROTOCOLS
// -------------------------------------------------------------------------

/**
 * Calculates Predicted Body Weight (PBW) using the NIH ARDSNet / Devine formula
 * Male: 50.0 + 2.3 * (heightInches - 60)
 * Female: 45.5 + 2.3 * (heightInches - 60)
 */
export function calculatePredictedBodyWeight(
  sex: BiologicalSex,
  heightInches: number
): number {
  const inchesOver60 = Math.max(0, heightInches - 60);
  const baseWeight = sex === "MALE" ? 50.0 : 45.5;
  const pbw = baseWeight + 2.3 * inchesOver60;
  return Math.round(pbw * 10) / 10;
}

/**
 * Calculates PaO2 / FiO2 ratio (P/F ratio)
 * PaO2 in mmHg, FiO2 in fraction (0.21 - 1.0)
 */
export function calculatePfRatio(paO2MmHg: number, fiO2Percent: number): number {
  const fiO2Fraction = fiO2Percent > 1 ? fiO2Percent / 100 : fiO2Percent;
  if (fiO2Fraction <= 0) return 0;
  return Math.round(paO2MmHg / fiO2Fraction);
}

/**
 * Classifies ARDS severity according to Berlin Definition
 * Requires PEEP >= 5 cmH2O
 */
export function classifyArdsSeverity(pfRatio: number, peepCmH2O: number): ArdsSeverity {
  if (peepCmH2O < 5) return "NONE";
  if (pfRatio > 300) return "NONE";
  if (pfRatio > 200 && pfRatio <= 300) return "MILD";
  if (pfRatio > 100 && pfRatio <= 200) return "MODERATE";
  return "SEVERE"; // pfRatio <= 100
}

/**
 * Standard ARDSNet Lower PEEP / Higher FiO2 titration ladder
 */
export const ARDSNET_LOWER_PEEP_LADDER: ArdsNetTitrationStep[] = [
  { fiO2Percent: 30, peepCmH2O: 5, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 40, peepCmH2O: 5, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 40, peepCmH2O: 8, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 50, peepCmH2O: 8, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 50, peepCmH2O: 10, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 60, peepCmH2O: 10, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 70, peepCmH2O: 10, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 70, peepCmH2O: 12, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 80, peepCmH2O: 14, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 90, peepCmH2O: 14, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 90, peepCmH2O: 16, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 90, peepCmH2O: 18, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 100, peepCmH2O: 18, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 100, peepCmH2O: 20, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 100, peepCmH2O: 22, strategy: "LOWER_PEEP_HIGHER_FIO2" },
  { fiO2Percent: 100, peepCmH2O: 24, strategy: "LOWER_PEEP_HIGHER_FIO2" },
];

// -------------------------------------------------------------------------
// COMPREHENSIVE VENTILATOR EVALUATION ENGINE
// -------------------------------------------------------------------------
export function evaluateMechanicalVentilation(
  params: Omit<PatientVentilatorProfile, "predictedBodyWeightKg" | "tidalVolumeMlPerKgPbw" | "drivingPressureCmH2O" | "staticComplianceMlPerCmH2O">
): VentilatorEvaluationReport {
  const pbw = calculatePredictedBodyWeight(params.biologicalSex, params.heightInches);
  const currentVtPerKg = Math.round((params.setTidalVolumeMl / pbw) * 10) / 10;
  const drivingPressure = Math.max(0, params.plateauPressureCmH2O - params.peepCmH2O);
  
  const complianceDenominator = Math.max(1, params.plateauPressureCmH2O - params.peepCmH2O);
  const staticCompliance = Math.round((params.setTidalVolumeMl / complianceDenominator) * 10) / 10;

  const target4Ml = Math.round(pbw * 4);
  const target6Ml = Math.round(pbw * 6);
  const target8Ml = Math.round(pbw * 8);

  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];

  let pfRatio: number | undefined;
  let ardsSeverity: ArdsSeverity = "NONE";
  let oxygenationAdequacy: VentilatorEvaluationReport["oxygenationAdequacy"] = "ADEQUATE";
  let acidBaseStatus: VentilatorEvaluationReport["acidBaseStatus"] = "NORMAL";

  // ABG Evaluation
  if (params.abg) {
    pfRatio = calculatePfRatio(params.abg.paO2MmHg, params.fiO2Percent);
    ardsSeverity = classifyArdsSeverity(pfRatio, params.peepCmH2O);

    if (params.abg.spO2Percent < 88 || params.abg.paO2MmHg < 55) {
      oxygenationAdequacy = "HYPOXEMIC";
    } else if (params.abg.spO2Percent > 96 && params.fiO2Percent > 50) {
      oxygenationAdequacy = "HYPEROXIC";
    }

    if (params.abg.pH < 7.20) {
      acidBaseStatus = "ACIDEMIA";
    } else if (params.abg.pH > 7.45) {
      acidBaseStatus = "ALKALEMIA";
    } else if (params.abg.pH >= 7.25 && params.abg.pH <= 7.35 && params.abg.paCO2MmHg > 50) {
      acidBaseStatus = "PERMISSIVE_HYPERCAPNIA";
    }
  }

  // 1. Barotrauma / Volutrauma Safety Gate (Pplat > 30 or Delta P >= 15)
  if (params.plateauPressureCmH2O > 30 || drivingPressure >= 15) {
    trippedInvariants.push("CF-VENT-001");
    mandatoryActions.push(
      `BAROTRAUMA / VOLUTRAUMA INVARIANT VETO: Plateau pressure is ${params.plateauPressureCmH2O} cmH2O (> 30 threshold) and driving pressure is ${drivingPressure} cmH2O (>= 15 threshold). Step-down tidal volume by 1 mL/kg PBW (target 4-5 mL/kg, current is ${currentVtPerKg} mL/kg).`
    );
  }

  // 2. Severe ARDS & Refractory Hypoxemia (P/F <= 100 on PEEP >= 10)
  if (ardsSeverity === "SEVERE" && params.peepCmH2O >= 10) {
    trippedInvariants.push("CF-VENT-002");
    mandatoryActions.push(
      `SEVERE ARDS REFRACTORY HYPOXEMIA (P/F Ratio: ${pfRatio}): Mandate early prone positioning for >= 16 consecutive hours/day (PROSEVA trial: absolute 16% 28-day mortality reduction). Consider neuromuscular blockade infusion for 48 hours.`
    );
  }

  // 3. Auto-PEEP / Air Trapping Check
  if (params.autoPeepCmH2O !== undefined && params.autoPeepCmH2O >= 8.0) {
    trippedInvariants.push("CF-VENT-003");
    mandatoryActions.push(
      `CRITICAL DYNAMIC HYPERINFLATION: Auto-PEEP is ${params.autoPeepCmH2O} cmH2O. High risk of tension pneumothorax and hemodynamic collapse. Immediately decrease respiratory rate, increase inspiratory flow rate to 70-80 L/min to prolong expiratory time (E-time), and titrate extrinsic PEEP to 80% of intrinsic PEEP.`
    );
  }

  // Determine suggested ventilator adjustments
  let suggestedVt = target6Ml;
  if (params.plateauPressureCmH2O > 30) {
    suggestedVt = Math.max(target4Ml, params.setTidalVolumeMl - Math.round(pbw * 1));
  }

  let suggestedPeep = params.peepCmH2O;
  let suggestedFiO2 = params.fiO2Percent;
  let rationale = "Maintain current lung-protective ventilation settings.";

  if (oxygenationAdequacy === "HYPOXEMIC") {
    // Step up PEEP/FiO2 ladder
    suggestedPeep = Math.min(24, params.peepCmH2O + 2);
    suggestedFiO2 = Math.min(100, params.fiO2Percent + 10);
    rationale = `Step up ARDSNet titration ladder due to hypoxemia (SpO2 ${params.abg?.spO2Percent}%, PaO2 ${params.abg?.paO2MmHg} mmHg).`;
  } else if (oxygenationAdequacy === "HYPEROXIC") {
    // Wean FiO2 first to prevent absorption atelectasis and oxygen toxicity
    suggestedFiO2 = Math.max(21, params.fiO2Percent - 10);
    rationale = `Wean FiO2 from ${params.fiO2Percent}% to prevent reactive oxygen species toxicity (current SpO2 ${params.abg?.spO2Percent}%).`;
  }

  return {
    timestampIso: new Date().toISOString(),
    patientId: params.patientId,
    patientName: params.patientName,
    predictedBodyWeightKg: pbw,
    targetTidalVolumeRangeMl: {
      fourMlPerKg: target4Ml,
      sixMlPerKg: target6Ml,
      eightMlPerKg: target8Ml,
    },
    currentVtPerKgPbw: currentVtPerKg,
    drivingPressureCmH2O: drivingPressure,
    staticCompliance,
    pao2Fio2Ratio: pfRatio,
    ardsSeverity,
    oxygenationAdequacy,
    acidBaseStatus,
    trippedInvariants,
    mandatoryActions,
    recommendedVentilatorAdjustments: {
      suggestedTidalVolumeMl: suggestedVt,
      suggestedPeepCmH2O: suggestedPeep,
      suggestedFiO2Percent: suggestedFiO2,
      suggestedRatePerMin: params.respiratoryRateSetPerMin,
      rationale,
    },
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------
export function formatVentilatorSpokenSummary(report: VentilatorEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Mechanical ventilation assessment for patient ${report.patientName}, identifier ${report.patientId}.`
  );

  parts.push(
    `Predicted body weight is ${report.predictedBodyWeightKg} kilograms. Target six milliliter per kilogram tidal volume is ${report.targetTidalVolumeRangeMl.sixMlPerKg} milliliters. Currently delivered tidal volume is ${report.currentVtPerKgPbw} milliliters per kilogram of predicted body weight.`
  );

  parts.push(
    `Driving pressure is ${report.drivingPressureCmH2O} centimeters of water, and respiratory static compliance is ${report.staticCompliance} milliliters per centimeter of water.`
  );

  if (report.pao2Fio2Ratio !== undefined) {
    parts.push(
      `Arterial PaO2 to FiO2 ratio is ${report.pao2Fio2Ratio}, diagnostic for ${report.ardsSeverity.toLowerCase()} acute respiratory distress syndrome under the Berlin definition.`
    );
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(
      `CRITICAL ATTENTION REQUIRED: ${report.trippedInvariants.length} non-compensatory ventilator safety invariants have tripped, including ${report.trippedInvariants.join(", ")}.`
    );
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Action directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push(
      "All airway pressures and tidal volumes comply with NIH ARDSNet lung-protective guidelines."
    );
  }

  parts.push(
    `Recommended ventilator titration adjustment: ${report.recommendedVentilatorAdjustments.rationale} Set tidal volume to ${report.recommendedVentilatorAdjustments.suggestedTidalVolumeMl} milliliters, PEEP to ${report.recommendedVentilatorAdjustments.suggestedPeepCmH2O} centimeters of water, and FiO2 to ${report.recommendedVentilatorAdjustments.suggestedFiO2Percent} percent.`
  );

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL MECHANICAL VENTILATION PRESETS
// -------------------------------------------------------------------------

export const VENT_PRESET_SEVERE_ARDS_COVID = {
  patientId: "VENT-ARDS-001",
  patientName: "Robert Chen (58yo M - Severe ARDS)",
  biologicalSex: "MALE" as BiologicalSex,
  heightInches: 70, // 5'10" -> PBW = 50 + 2.3*10 = 73 kg
  actualWeightKg: 94,
  mode: "VOLUME_CONTROL_AC" as VentilationMode,
  setTidalVolumeMl: 440, // 6.0 mL/kg PBW
  respiratoryRateSetPerMin: 26,
  respiratoryRateTotalPerMin: 28,
  fiO2Percent: 80,
  peepCmH2O: 14,
  peakInspiratoryPressureCmH2O: 38,
  plateauPressureCmH2O: 32, // Exceeds 30 cmH2O!
  abg: {
    pH: 7.28,
    paCO2MmHg: 52,
    paO2MmHg: 64, // P/F = 64 / 0.8 = 80 (Severe ARDS <= 100)
    hco3MmolPerL: 24,
    spO2Percent: 90,
  },
};

export const VENT_PRESET_COPD_AUTOPEEP = {
  patientId: "VENT-COPD-002",
  patientName: "Arthur Henderson (66yo M - Severe COPD)",
  biologicalSex: "MALE" as BiologicalSex,
  heightInches: 68, // PBW = 50 + 2.3*8 = 68.4 kg
  actualWeightKg: 78,
  mode: "VOLUME_CONTROL_AC" as VentilationMode,
  setTidalVolumeMl: 450,
  respiratoryRateSetPerMin: 22,
  respiratoryRateTotalPerMin: 22,
  fiO2Percent: 40,
  peepCmH2O: 5,
  peakInspiratoryPressureCmH2O: 42,
  plateauPressureCmH2O: 24,
  autoPeepCmH2O: 9.5, // Critical auto-peep!
  abg: {
    pH: 7.31,
    paCO2MmHg: 62,
    paO2MmHg: 78, // P/F = 78 / 0.4 = 195
    hco3MmolPerL: 30,
    spO2Percent: 94,
  },
};

export const VENT_PRESET_POST_OP_LUNG_PROTECTIVE = {
  patientId: "VENT-NORM-003",
  patientName: "Emily Watson (45yo F - Post-Op Laparotomy)",
  biologicalSex: "FEMALE" as BiologicalSex,
  heightInches: 64, // 5'4" -> PBW = 45.5 + 2.3*4 = 54.7 kg
  actualWeightKg: 62,
  mode: "VOLUME_CONTROL_AC" as VentilationMode,
  setTidalVolumeMl: 330, // 6.0 mL/kg PBW
  respiratoryRateSetPerMin: 14,
  respiratoryRateTotalPerMin: 14,
  fiO2Percent: 35,
  peepCmH2O: 5,
  peakInspiratoryPressureCmH2O: 21,
  plateauPressureCmH2O: 18, // Pplat well below 30 cmH2O
  abg: {
    pH: 7.41,
    paCO2MmHg: 39,
    paO2MmHg: 140, // P/F = 140 / 0.35 = 400 (Normal / No ARDS)
    hco3MmolPerL: 24,
    spO2Percent: 99,
  },
};
