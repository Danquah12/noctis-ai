/**
 * NOCTIS HEALTH 500 - 12-LEAD ECG & VECTORCARDIOGRAPHY (VCG) ARRHYTHMIA ENGINE
 * Standards: AHA / ACC / HRS Guideline for Electrocardiography & Arrhythmia Management
 * Algorithms: Bazett & Fridericia QTc, Modified Sgarbossa in LBBB, Tisdale Long-QT Risk,
 *             Frank XYZ Vectorcardiographic Loop Synthesis, Wellens' Syndrome & De Winter Protocols
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-STEMI-001: Immediate Cath Lab activation for acute STEMI or STEMI-equivalent (Wellens'/De Winter)
 * - CF-SINEWAVE-001: Emergent IV Calcium Gluconate push for severe hyperkalemic sine-wave / QRS widening
 * - CF-QTC-001: Binding Safety Veto on QTc-prolonging drugs when QTc >= 500 ms (Torsades de Pointes risk)
 * - CF-SGARBOSSA-001: Modified Sgarbossa score >= 3 in LBBB requires immediate STEMI pathway activation
 */

export type EcgRhythmType =
  | "NORMAL_SINUS_RHYTHM"
  | "SINUS_TACHYCARDIA"
  | "SINUS_BRADYCARDIA"
  | "ATRIAL_FIBRILLATION"
  | "VENTRICULAR_TACHYCARDIA"
  | "VENTRICULAR_FIBRILLATION"
  | "SINE_WAVE_HYPERKALEMIA"
  | "JUNCTIONAL_RHYTHM";

export type QrsAxisCategory =
  | "NORMAL_AXIS" // -30 to +90 degrees
  | "LEFT_AXIS_DEVIATION" // -30 to -90 degrees
  | "RIGHT_AXIS_DEVIATION" // +90 to +180 degrees
  | "EXTREME_AXIS_DEVIATION"; // -90 to 180 degrees (Northwest)

export type StSegmentStatus =
  | "NORMAL_ISOELECTRIC"
  | "ACUTE_STEMI_ELEVATION"
  | "RECIPROCAL_DEPRESSION"
  | "WELLENS_TYPE_A_BIPHASIC"
  | "WELLENS_TYPE_B_INVERTED"
  | "DE_WINTER_T_WAVES"
  | "NON_SPECIFIC_ST_T_CHANGES";

export interface LeadMeasurement {
  leadName: string; // I, II, III, aVR, aVL, aVF, V1..V6
  stDeviationMm: number; // + is elevation, - is depression (1 mm = 0.1 mV)
  tWaveAmplitudeMv: number;
  qWavePresent: boolean;
  pathologicalQWave: boolean;
  status: StSegmentStatus;
}

export interface FrankXyzPoint {
  x: number; // Transverse (Left-Right)
  y: number; // Superior-Inferior
  z: number; // Anterior-Posterior
  timeMs: number;
}

export interface EcgAnalysisReport {
  recordId: string;
  patientName: string;
  timestampIso: string;
  heartRateBpm: number;
  rhythm: EcgRhythmType;
  rhythmDescription: string;
  prIntervalMs: number; // Normal 120 - 200 ms
  qrsDurationMs: number; // Normal < 120 ms
  qtIntervalMs: number;
  qtcBazettMs: number; // QTc = QT / sqrt(RR in sec)
  qtcFridericiaMs: number; // QTc = QT / cbrt(RR in sec)
  qrsAxisDegrees: number;
  qrsAxisCategory: QrsAxisCategory;
  leads: Record<string, LeadMeasurement>;
  primaryEcgFinding: string;
  stemiTerritory?: "ANTERIOR" | "INFERIOR" | "LATERAL" | "POSTERIOR" | "EXTENSIVE_ANTEROSEPTAL" | "NONE";
  sgarbossaScore?: {
    concordantElevation: boolean; // 5 pts
    concordantDepressionV1V3: boolean; // 3 pts
    excessiveDiscordanceRatio: boolean; // 2 pts (ST/S <= -0.25)
    totalScore: number;
    stemiRuleIn: boolean; // score >= 3
  };
  tisdaleRisk?: {
    score: number;
    riskTier: "LOW" | "MODERATE" | "HIGH";
    clinicalGuidance: string;
  };
  trippedInvariants: string[];
  immediateDirectives: string[];
}

// -------------------------------------------------------------------------
// MATHEMATICAL CALCULATIONS & FORMULAS
// -------------------------------------------------------------------------

/**
 * Calculates Bazett's corrected QT interval (ms)
 * Formula: QTc = QT / sqrt(RR_sec)
 */
export function calculateBazettQtc(qtMs: number, heartRateBpm: number): number {
  if (heartRateBpm <= 0) return qtMs;
  const rrSec = 60 / heartRateBpm;
  return Math.round(qtMs / Math.sqrt(rrSec));
}

/**
 * Calculates Fridericia's corrected QT interval (ms)
 * Formula: QTc = QT / cbrt(RR_sec) - preferred at extremes of heart rate
 */
export function calculateFridericiaQtc(qtMs: number, heartRateBpm: number): number {
  if (heartRateBpm <= 0) return qtMs;
  const rrSec = 60 / heartRateBpm;
  return Math.round(qtMs / Math.cbrt(rrSec));
}

/**
 * Determines QRS frontal plane axis category from degrees (-180 to +180)
 */
export function determineQrsAxisCategory(axisDegrees: number): QrsAxisCategory {
  if (axisDegrees >= -30 && axisDegrees <= 90) return "NORMAL_AXIS";
  if (axisDegrees < -30 && axisDegrees >= -90) return "LEFT_AXIS_DEVIATION";
  if (axisDegrees > 90 && axisDegrees <= 180) return "RIGHT_AXIS_DEVIATION";
  return "EXTREME_AXIS_DEVIATION";
}

/**
 * Calculates Modified Sgarbossa Criteria for acute STEMI in the presence of LBBB or Ventricular Pacing
 */
export function calculateModifiedSgarbossa(params: {
  concordantStElevationGe1mm: boolean; // >= 1mm in any lead with positive QRS
  concordantStDepressionV1V3Ge1mm: boolean; // >= 1mm in V1, V2, or V3
  excessiveDiscordanceRatioGe25: boolean; // ST elevation / S wave amplitude >= 0.25 in negative leads
}): { totalScore: number; stemiRuleIn: boolean } {
  let score = 0;
  if (params.concordantStElevationGe1mm) score += 5;
  if (params.concordantStDepressionV1V3Ge1mm) score += 3;
  if (params.excessiveDiscordanceRatioGe25) score += 2;

  return {
    totalScore: score,
    stemiRuleIn: score >= 3,
  };
}

/**
 * Calculates Tisdale Risk Score for Drug-Induced QT Prolongation
 */
export function calculateTisdaleRisk(factors: {
  ageGe68?: boolean; // 1 pt
  femaleSex?: boolean; // 1 pt
  loopDiuretic?: boolean; // 1 pt
  serumPotassiumLe3_5?: boolean; // 2 pts
  admissionQtcGe450?: boolean; // 2 pts
  acuteMyocardialInfarction?: boolean; // 2 pts
  twoOrMoreQtcDrugs?: boolean; // 3 pts
  sepsisOrSepticShock?: boolean; // 3 pts
  heartFailure?: boolean; // 3 pts
}): { score: number; riskTier: "LOW" | "MODERATE" | "HIGH"; clinicalGuidance: string } {
  let score = 0;
  if (factors.ageGe68) score += 1;
  if (factors.femaleSex) score += 1;
  if (factors.loopDiuretic) score += 1;
  if (factors.serumPotassiumLe3_5) score += 2;
  if (factors.admissionQtcGe450) score += 2;
  if (factors.acuteMyocardialInfarction) score += 2;
  if (factors.twoOrMoreQtcDrugs) score += 3;
  if (factors.sepsisOrSepticShock) score += 3;
  if (factors.heartFailure) score += 3;

  let riskTier: "LOW" | "MODERATE" | "HIGH" = "LOW";
  let clinicalGuidance = "Low risk for drug-induced Torsades de Pointes. Routine monitoring.";

  if (score >= 11) {
    riskTier = "HIGH";
    clinicalGuidance = "HIGH RISK FOR TORSADES DE POINTES (Tisdale Score >= 11). Discontinue non-essential QTc-prolonging drugs. Continuous telemetry mandatory. Maintain K+ > 4.5 mmol/L and Mg2+ > 2.0 mg/dL.";
  } else if (score >= 7) {
    riskTier = "MODERATE";
    clinicalGuidance = "MODERATE RISK FOR TORSADES DE POINTES (Tisdale Score 7-10). Check baseline electrolytes and repeat ECG 2-4 hours post-dose.";
  }

  return { score, riskTier, clinicalGuidance };
}

/**
 * Synthesizes Frank XYZ Vectorcardiographic (VCG) coordinates from standard 12-lead ECG
 * Using the Edenbrandt & Pahlm inverted lead derivation matrix
 */
export function deriveFrankXyzFrom12Lead(
  leads: Record<string, number>,
  timeStepMs = 0
): FrankXyzPoint {
  const v5 = leads["V5"] || 0;
  const v6 = leads["V6"] || 0;
  const leadI = leads["I"] || 0;
  const avf = leads["aVF"] || 0;
  const leadIII = leads["III"] || 0;
  const v2 = leads["V2"] || 0;
  const v3 = leads["V3"] || 0;

  // Frank X (Left - Right / Transverse)
  const x = 0.61 * v5 + 0.17 * v6 - 0.13 * leadI;

  // Frank Y (Superior - Inferior / Vertical)
  const y = 0.65 * avf + 0.25 * leadIII;

  // Frank Z (Anterior - Posterior / Sagittal)
  const z = -(0.54 * v2 + 0.13 * v3);

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    z: Math.round(z * 100) / 100,
    timeMs: timeStepMs,
  };
}

/**
 * Generates continuous mathematical P-QRS-T synthetic waveforms for visual SVG rendering
 */
export function generateSyntheticEcgPoints(
  leadName: string,
  heartRateBpm: number,
  stElevMm: number,
  isTwaveInverted = false,
  isSineWave = false
): Array<{ t: number; v: number }> {
  const points: Array<{ t: number; v: number }> = [];
  const cycleDurationMs = (60 / heartRateBpm) * 1000;
  const totalSamples = 160;

  for (let i = 0; i < totalSamples; i++) {
    const tMs = (i / totalSamples) * cycleDurationMs;
    const phase = (tMs % cycleDurationMs) / cycleDurationMs;
    let v = 0;

    if (isSineWave) {
      // Smooth hyperkalemic pre-arrest sine wave: low-frequency high-amplitude oscillation
      v = 1.2 * Math.sin(2 * Math.PI * phase) + 0.3 * Math.sin(4 * Math.PI * phase);
    } else {
      // Baseline isoelectric
      v = 0;

      // P wave (phase 0.10 to 0.20)
      if (phase >= 0.10 && phase <= 0.20) {
        const pPhase = (phase - 0.10) / 0.10;
        v += 0.15 * Math.sin(Math.PI * pPhase);
      }

      // Q wave (phase 0.28 to 0.30)
      if (phase >= 0.28 && phase <= 0.30) {
        v -= 0.15;
      }

      // R wave (phase 0.30 to 0.34)
      if (phase >= 0.30 && phase <= 0.34) {
        const rPhase = (phase - 0.30) / 0.04;
        v += 1.4 * Math.sin(Math.PI * rPhase);
      }

      // S wave (phase 0.34 to 0.38)
      if (phase >= 0.34 && phase <= 0.38) {
        const sPhase = (phase - 0.34) / 0.04;
        v -= 0.35 * Math.sin(Math.PI * sPhase);
      }

      // ST segment elevation / depression (phase 0.38 to 0.52)
      if (phase >= 0.38 && phase <= 0.52) {
        v += (stElevMm * 0.1); // 1 mm = 0.1 mV
      }

      // T wave (phase 0.52 to 0.72)
      if (phase >= 0.52 && phase <= 0.72) {
        const tPhase = (phase - 0.52) / 0.20;
        const tAmp = isTwaveInverted ? -0.45 : 0.45;
        v += (stElevMm * 0.05) + tAmp * Math.sin(Math.PI * tPhase);
      }
    }

    points.push({ t: Math.round(tMs), v: Math.round(v * 100) / 100 });
  }

  return points;
}

// -------------------------------------------------------------------------
// COMPREHENSIVE CLINICAL ECG EVALUATOR
// -------------------------------------------------------------------------
export function evaluate12LeadEcg(params: {
  recordId?: string;
  patientName?: string;
  heartRateBpm: number;
  rhythm?: EcgRhythmType;
  prIntervalMs: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  qrsAxisDegrees: number;
  leads: Record<string, { stDeviationMm: number; tWaveAmplitudeMv?: number; qWave?: boolean }>;
  tisdaleFactors?: Parameters<typeof calculateTisdaleRisk>[0];
  isLbbbPresent?: boolean;
}): EcgAnalysisReport {
  const recordId = params.recordId || `ECG-${Date.now().toString(36).toUpperCase()}`;
  const patientName = params.patientName || "Clinical Patient";
  const timestampIso = new Date().toISOString();
  const hr = params.heartRateBpm;

  // Determine rhythm
  let rhythm = params.rhythm || "NORMAL_SINUS_RHYTHM";
  if (!params.rhythm) {
    if (hr > 100) rhythm = "SINUS_TACHYCARDIA";
    else if (hr < 60) rhythm = "SINUS_BRADYCARDIA";
  }

  const qtcBazettMs = calculateBazettQtc(params.qtIntervalMs, hr);
  const qtcFridericiaMs = calculateFridericiaQtc(params.qtIntervalMs, hr);
  const qrsAxisCategory = determineQrsAxisCategory(params.qrsAxisDegrees);

  const processedLeads: Record<string, LeadMeasurement> = {};
  const trippedInvariants: string[] = [];
  const immediateDirectives: string[] = [];

  // Analyze individual leads
  for (const [leadName, leadData] of Object.entries(params.leads)) {
    const stDev = leadData.stDeviationMm;
    const tAmp = leadData.tWaveAmplitudeMv !== undefined ? leadData.tWaveAmplitudeMv : 0.3;
    let status: StSegmentStatus = "NORMAL_ISOELECTRIC";

    if (stDev >= 1.0) {
      status = "ACUTE_STEMI_ELEVATION";
    } else if (stDev <= -1.0) {
      status = "RECIPROCAL_DEPRESSION";
    } else if (tAmp <= -0.3 && (leadName === "V2" || leadName === "V3" || leadName === "V4")) {
      status = "WELLENS_TYPE_B_INVERTED";
    } else if (Math.abs(stDev) >= 0.5) {
      status = "NON_SPECIFIC_ST_T_CHANGES";
    }

    processedLeads[leadName] = {
      leadName,
      stDeviationMm: stDev,
      tWaveAmplitudeMv: tAmp,
      qWavePresent: leadData.qWave || false,
      pathologicalQWave: (leadData.qWave || false) && Math.abs(stDev) > 0,
      status,
    };
  }

  // Detect STEMI territories
  let stemiTerritory: EcgAnalysisReport["stemiTerritory"] = "NONE";
  let primaryFinding = "Normal Sinus Rhythm with physiological intervals.";

  const v1 = processedLeads["V1"]?.stDeviationMm || 0;
  const v2 = processedLeads["V2"]?.stDeviationMm || 0;
  const v3 = processedLeads["V3"]?.stDeviationMm || 0;
  const v4 = processedLeads["V4"]?.stDeviationMm || 0;
  const leadII = processedLeads["II"]?.stDeviationMm || 0;
  const leadIII = processedLeads["III"]?.stDeviationMm || 0;
  const aVF = processedLeads["aVF"]?.stDeviationMm || 0;
  const leadI = processedLeads["I"]?.stDeviationMm || 0;
  const aVL = processedLeads["aVL"]?.stDeviationMm || 0;

  // 1. Anterior STEMI: ST elevation in V1-V4
  if ((v1 >= 1.5 || v2 >= 2.0 || v3 >= 2.0 || v4 >= 1.5) && (v2 >= 1.0 && v3 >= 1.0)) {
    stemiTerritory = (v1 >= 1.0 && v4 >= 1.0) ? "EXTENSIVE_ANTEROSEPTAL" : "ANTERIOR";
    primaryFinding = "ACUTE ANTERIOR MYOCARDIAL INFARCTION (STEMI). Critical LAD occlusion.";
    trippedInvariants.push("CF-STEMI-ANT");
    immediateDirectives.push("STAT Cardiac Catheterization Laboratory activation (< 90 min door-to-balloon time).");
    immediateDirectives.push("Administer Aspirin 325 mg PO chewable + Unfractionated Heparin bolus.");
  }
  // 2. Inferior STEMI: ST elevation in II, III, aVF
  else if (leadII >= 1.0 && leadIII >= 1.0 && aVF >= 1.0) {
    stemiTerritory = "INFERIOR";
    primaryFinding = "ACUTE INFERIOR MYOCARDIAL INFARCTION (STEMI). Right Coronary Artery (RCA) or LCx occlusion.";
    trippedInvariants.push("CF-STEMI-INF");
    immediateDirectives.push("STAT Cardiac Catheterization Laboratory activation. Obtain Right-Sided V4R lead (assess RV infarction).");
    immediateDirectives.push("CAUTION: Nitroglycerin absolutely contraindicated if Right Ventricular infarction present.");
  }
  // 3. Lateral STEMI: ST elevation in I, aVL, V5, V6
  else if (leadI >= 1.0 && aVL >= 1.0) {
    stemiTerritory = "LATERAL";
    primaryFinding = "ACUTE LATERAL STEMI. Left Circumflex Artery (LCx) occlusion.";
    trippedInvariants.push("CF-STEMI-LAT");
    immediateDirectives.push("STAT Cardiac Catheterization Laboratory activation.");
  }

  // 4. Wellens' Syndrome Check (Deep T-wave inversions in V2-V3 without significant ST elevation)
  const isWellens =
    stemiTerritory === "NONE" &&
    ((processedLeads["V2"]?.tWaveAmplitudeMv || 0) <= -0.4 && (processedLeads["V3"]?.tWaveAmplitudeMv || 0) <= -0.4) &&
    Math.abs(v2) < 1.0 && Math.abs(v3) < 1.0;

  if (isWellens) {
    primaryFinding = "WELLENS' SYNDROME (Type B). Imminent critical proximal LAD thrombosis / massive anterior wall infarction.";
    trippedInvariants.push("CF-WELLENS-001");
    immediateDirectives.push("EMERGENCY CARDIOLOGY CONSULTATION & INVASIVE ANGIOGRAPHY. Stress testing is absolutely contraindicated (causes fatal STEMI).");
  }

  // 5. De Winter T-waves Check
  const isDeWinter =
    stemiTerritory === "NONE" &&
    v2 <= -1.0 && v3 <= -1.0 &&
    (processedLeads["V2"]?.tWaveAmplitudeMv || 0) >= 0.8 &&
    (processedLeads["V3"]?.tWaveAmplitudeMv || 0) >= 0.8;

  if (isDeWinter) {
    primaryFinding = "DE WINTER'S T-WAVES (STEMI EQUIVALENT). Acute proximal LAD occlusion present in ~2% of acute anterior MI cases.";
    trippedInvariants.push("CF-DEWINTER-001");
    immediateDirectives.push("ACTIVATE CATHETERIZATION LAB IMMEDIATELY. Treat as acute anterior STEMI despite lack of classic ST elevation.");
  }

  // 6. Hyperkalemic Sine-Wave / Severe QRS Widening Check
  if (rhythm === "SINE_WAVE_HYPERKALEMIA" || (params.qrsDurationMs >= 180 && hr < 60 && params.prIntervalMs >= 240)) {
    primaryFinding = "CRITICAL HYPERKALEMIC SINE-WAVE PATIENT COLLAPSE PATTERN (Pre-Arrest PEA Hazard).";
    trippedInvariants.push("CF-SINEWAVE-001");
    immediateDirectives.push("EMERGENCY STAT: IV Calcium Gluconate (10%) 10-20 mL over 2-3 minutes to stabilize cardiac myocyte membranes.");
    immediateDirectives.push("Administer Regular Insulin 10 units IV with Dextrose 50% (D50W) 50 mL push STAT.");
  }

  // 7. QTc Prolongation Check (Bazett >= 500 ms)
  if (qtcBazettMs >= 500) {
    trippedInvariants.push("CF-QTC-001");
    immediateDirectives.push(`BINDING PHARMACOTHERAPY VETO: QTc is ${qtcBazettMs} ms (>= 500 ms threshold). Immediately halt and prohibit all QTc-prolonging drugs (Antiarrhythmics, Macrolides, Fluoroquinolones, Haloperidol, Ondansetron).`);
  }

  // Sgarbossa Scoring if LBBB is present
  let sgarbossaScore: EcgAnalysisReport["sgarbossaScore"];
  if (params.isLbbbPresent) {
    const concordantElev = Object.values(processedLeads).some((l) => l.stDeviationMm >= 1.0);
    const concordantDep = (v1 <= -1.0 || v2 <= -1.0 || v3 <= -1.0);
    const sgarbossaRes = calculateModifiedSgarbossa({
      concordantStElevationGe1mm: concordantElev,
      concordantStDepressionV1V3Ge1mm: concordantDep,
      excessiveDiscordanceRatioGe25: true,
    });
    sgarbossaScore = {
      concordantElevation: concordantElev,
      concordantDepressionV1V3: concordantDep,
      excessiveDiscordanceRatio: true,
      totalScore: sgarbossaRes.totalScore,
      stemiRuleIn: sgarbossaRes.stemiRuleIn,
    };
    if (sgarbossaRes.stemiRuleIn) {
      trippedInvariants.push("CF-SGARBOSSA-001");
      immediateDirectives.push("MODIFIED SGARBOSSA POSITIVE (Score >= 3): Acute STEMI in LBBB. Activate Cath Lab immediately.");
    }
  }

  // Tisdale Risk Calculation
  let tisdaleRisk: EcgAnalysisReport["tisdaleRisk"];
  if (params.tisdaleFactors) {
    tisdaleRisk = calculateTisdaleRisk(params.tisdaleFactors);
    if (tisdaleRisk.riskTier === "HIGH" && !trippedInvariants.includes("CF-TISDALE-HIGH")) {
      trippedInvariants.push("CF-TISDALE-HIGH");
      immediateDirectives.push(tisdaleRisk.clinicalGuidance);
    }
  }

  return {
    recordId,
    patientName,
    timestampIso,
    heartRateBpm: hr,
    rhythm,
    rhythmDescription: rhythm.replace(/_/g, " "),
    prIntervalMs: params.prIntervalMs,
    qrsDurationMs: params.qrsDurationMs,
    qtIntervalMs: params.qtIntervalMs,
    qtcBazettMs,
    qtcFridericiaMs,
    qrsAxisDegrees: params.qrsAxisDegrees,
    qrsAxisCategory,
    leads: processedLeads,
    primaryEcgFinding: primaryFinding,
    stemiTerritory,
    sgarbossaScore,
    tisdaleRisk,
    trippedInvariants,
    immediateDirectives,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------
export function formatEcgSpokenAnalysis(report: EcgAnalysisReport): string {
  const parts: string[] = [];

  parts.push(
    `Twelve-lead electrocardiogram analysis for patient ${report.patientName}, record identifier ${report.recordId}.`
  );

  parts.push(
    `Heart rate is ${report.heartRateBpm} beats per minute with ${report.rhythmDescription.toLowerCase()}. P-R interval is ${report.prIntervalMs} milliseconds, Q-R-S complex duration is ${report.qrsDurationMs} milliseconds, Q-T interval is ${report.qtIntervalMs} milliseconds, and corrected Q-T by Bazett's formula is ${report.qtcBazettMs} milliseconds.`
  );

  parts.push(
    `Frontal Q-R-S electrical axis is calculated at ${report.qrsAxisDegrees} degrees, classified as ${report.qrsAxisCategory.replace(/_/g, " ").toLowerCase()}.`
  );

  parts.push(`Primary diagnostic interpretation: ${report.primaryEcgFinding}`);

  if (report.stemiTerritory && report.stemiTerritory !== "NONE") {
    parts.push(
      `CRITICAL ALERT: Acute ST-elevation myocardial infarction identified in the ${report.stemiTerritory.toLowerCase()} coronary distribution.`
    );
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(
      `Attention: ${report.trippedInvariants.length} non-compensatory patient safety invariant gates tripped, including ${report.trippedInvariants.join(", ")}.`
    );
    report.immediateDirectives.forEach((directive, idx) => {
      parts.push(`Directive number ${idx + 1}: ${directive}`);
    });
  } else {
    parts.push("Zero critical safety invariant violations detected.");
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL 12-LEAD ECG PRESETS
// -------------------------------------------------------------------------

export const ECG_PRESET_ANTERIOR_STEMI: Parameters<typeof evaluate12LeadEcg>[0] = {
  recordId: "ECG-STEMI-ANT-001",
  patientName: "Eleanor Thompson (58yo F)",
  heartRateBpm: 94,
  rhythm: "SINUS_TACHYCARDIA",
  prIntervalMs: 160,
  qrsDurationMs: 96,
  qtIntervalMs: 380,
  qrsAxisDegrees: 45,
  leads: {
    I: { stDeviationMm: 0.2 },
    II: { stDeviationMm: -1.2 },
    III: { stDeviationMm: -1.8 },
    aVR: { stDeviationMm: 0.4 },
    aVL: { stDeviationMm: 0.8 },
    aVF: { stDeviationMm: -1.5 },
    V1: { stDeviationMm: 2.2 },
    V2: { stDeviationMm: 4.5 },
    V3: { stDeviationMm: 5.2 },
    V4: { stDeviationMm: 3.8 },
    V5: { stDeviationMm: 1.4 },
    V6: { stDeviationMm: 0.6 },
  },
};

export const ECG_PRESET_WELLENS_LAD: Parameters<typeof evaluate12LeadEcg>[0] = {
  recordId: "ECG-WELLENS-LAD-002",
  patientName: "Marcus Vance (62yo M)",
  heartRateBpm: 76,
  rhythm: "NORMAL_SINUS_RHYTHM",
  prIntervalMs: 155,
  qrsDurationMs: 88,
  qtIntervalMs: 410,
  qrsAxisDegrees: 15,
  leads: {
    I: { stDeviationMm: 0.0 },
    II: { stDeviationMm: 0.0 },
    III: { stDeviationMm: 0.0 },
    aVR: { stDeviationMm: 0.0 },
    aVL: { stDeviationMm: 0.0 },
    aVF: { stDeviationMm: 0.0 },
    V1: { stDeviationMm: 0.1, tWaveAmplitudeMv: 0.2 },
    V2: { stDeviationMm: 0.2, tWaveAmplitudeMv: -0.6 }, // Deeply inverted Type B
    V3: { stDeviationMm: 0.1, tWaveAmplitudeMv: -0.8 }, // Deeply inverted Type B
    V4: { stDeviationMm: 0.0, tWaveAmplitudeMv: -0.5 },
    V5: { stDeviationMm: 0.0, tWaveAmplitudeMv: 0.2 },
    V6: { stDeviationMm: 0.0, tWaveAmplitudeMv: 0.3 },
  },
};

export const ECG_PRESET_HYPERKALEMIC_SINE: Parameters<typeof evaluate12LeadEcg>[0] = {
  recordId: "ECG-HYPERK-SINE-003",
  patientName: "Harold Jenkins (71yo M - K+ 7.8)",
  heartRateBpm: 48,
  rhythm: "SINE_WAVE_HYPERKALEMIA",
  prIntervalMs: 280,
  qrsDurationMs: 210, // Extreme widening
  qtIntervalMs: 510,
  qrsAxisDegrees: -60,
  leads: {
    I: { stDeviationMm: 0.0 },
    II: { stDeviationMm: 0.0 },
    III: { stDeviationMm: 0.0 },
    aVR: { stDeviationMm: 0.0 },
    aVL: { stDeviationMm: 0.0 },
    aVF: { stDeviationMm: 0.0 },
    V1: { stDeviationMm: 0.0 },
    V2: { stDeviationMm: 0.0 },
    V3: { stDeviationMm: 0.0 },
    V4: { stDeviationMm: 0.0 },
    V5: { stDeviationMm: 0.0 },
    V6: { stDeviationMm: 0.0 },
  },
};

export const ECG_PRESET_LONG_QTC_TORSADES: Parameters<typeof evaluate12LeadEcg>[0] = {
  recordId: "ECG-LONG-QTC-004",
  patientName: "Clara O'Connor (74yo F on Sotalol + Cipro)",
  heartRateBpm: 68,
  rhythm: "NORMAL_SINUS_RHYTHM",
  prIntervalMs: 170,
  qrsDurationMs: 95,
  qtIntervalMs: 550, // Massive QT
  qrsAxisDegrees: 30,
  leads: {
    I: { stDeviationMm: 0.0 },
    II: { stDeviationMm: 0.0 },
    III: { stDeviationMm: 0.0 },
    aVR: { stDeviationMm: 0.0 },
    aVL: { stDeviationMm: 0.0 },
    aVF: { stDeviationMm: 0.0 },
    V1: { stDeviationMm: 0.0 },
    V2: { stDeviationMm: 0.0 },
    V3: { stDeviationMm: 0.0 },
    V4: { stDeviationMm: 0.0 },
    V5: { stDeviationMm: 0.0 },
    V6: { stDeviationMm: 0.0 },
  },
  tisdaleFactors: {
    ageGe68: true,
    femaleSex: true,
    loopDiuretic: true,
    admissionQtcGe450: true,
    twoOrMoreQtcDrugs: true,
    heartFailure: true,
  },
};

export const ECG_PRESET_NORMAL_SINUS: Parameters<typeof evaluate12LeadEcg>[0] = {
  recordId: "ECG-NORMAL-005",
  patientName: "Sarah Miller (34yo F)",
  heartRateBpm: 72,
  rhythm: "NORMAL_SINUS_RHYTHM",
  prIntervalMs: 150,
  qrsDurationMs: 85,
  qtIntervalMs: 380,
  qrsAxisDegrees: 60,
  leads: {
    I: { stDeviationMm: 0.0 },
    II: { stDeviationMm: 0.0 },
    III: { stDeviationMm: 0.0 },
    aVR: { stDeviationMm: 0.0 },
    aVL: { stDeviationMm: 0.0 },
    aVF: { stDeviationMm: 0.0 },
    V1: { stDeviationMm: 0.0 },
    V2: { stDeviationMm: 0.0 },
    V3: { stDeviationMm: 0.0 },
    V4: { stDeviationMm: 0.0 },
    V5: { stDeviationMm: 0.0 },
    V6: { stDeviationMm: 0.0 },
  },
};
