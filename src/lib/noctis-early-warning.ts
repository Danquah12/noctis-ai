/**
 * NOCTIS HEALTH CLINICAL DETERIORATION & EARLY WARNING SCORING ENGINE
 * Spec: NH500-EARLY-WARNING-012
 *
 * Implements:
 * 1. National Early Warning Score 2 (NEWS2) — Royal College of Physicians standard
 *    (Scales 1 & 2 for standard vs hypercapnic respiratory failure / COPD)
 * 2. quick Sequential Organ Failure Assessment (qSOFA) — Sepsis-3 Consensus criteria
 * 3. Modified Early Warning Score (MEWS) — Bedside physiological triage
 *
 * Real-time IoMT Integration:
 * - Continuous evaluation of bedside telemetry
 * - Rapid Response Team (RRT) & Sepsis-3 resuscitation protocol triggers
 * - Zero-truncation voice enunciation for time-critical clinical escalation
 *
 * Statutory Classification: FDA Jan 2026 Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E))
 */

export type AcvpuConsciousness = "ALERT" | "CONFUSION" | "VOICE" | "PAIN" | "UNRESPONSIVE";

export interface PatientVitalsForEws {
  respiratoryRatePerMin: number;
  spo2Percent: number;
  isHypercapnicRespiratoryFailureScale2?: boolean; // For COPD target 88-92%
  onSupplementalOxygen: boolean;
  systolicMmHg: number;
  diastolicMmHg: number;
  heartRateBpm: number;
  temperatureCelsius: number;
  consciousness: AcvpuConsciousness;
  urineOutputMlPerHour?: number;
}

export interface News2ScoreBreakdown {
  totalScore: number;
  respiratoryRateScore: number;
  spo2Score: number;
  supplementalOxygenScore: number;
  systolicBpScore: number;
  heartRateScore: number;
  consciousnessScore: number;
  temperatureScore: number;
  hasRedScoreTrigger: boolean; // Single parameter score of 3
  clinicalRiskTier: "LOW" | "LOW_MEDIUM_RED_TRIGGER" | "MEDIUM" | "HIGH_EMERGENCY";
  recommendedResponse: string;
  monitoringFrequency: string;
  trippedSafetyInvariant?: string;
}

export interface QsofaScoreBreakdown {
  score: number; // 0 to 3
  respiratoryRateTrigger: boolean; // >= 22 /min
  alteredMentationTrigger: boolean; // ACVPU != ALERT
  hypotensionTrigger: boolean; // SBP <= 100 mmHg
  isHighRiskSepsis: boolean; // score >= 2
  sepsis3ClinicalGuidance: string;
  trippedSafetyInvariant?: string;
}

export interface MewsScoreBreakdown {
  score: number;
  systolicBpScore: number;
  heartRateScore: number;
  respiratoryRateScore: number;
  temperatureScore: number;
  avpuScore: number;
  isCriticalAlert: boolean; // score >= 5
}

export interface ComprehensiveDeteriorationReport {
  timestampIso: string;
  news2: News2ScoreBreakdown;
  qsofa: QsofaScoreBreakdown;
  mews: MewsScoreBreakdown;
  rapidResponseTeamIndicated: boolean;
  sepsisBundleStatTrigger: boolean;
  clinicalNarrative: string;
}

/**
 * 1. Calculates National Early Warning Score 2 (NEWS2)
 */
export function calculateNews2(v: PatientVitalsForEws): News2ScoreBreakdown {
  // 1. Respiratory Rate
  let rrScore = 0;
  if (v.respiratoryRatePerMin <= 8) rrScore = 3;
  else if (v.respiratoryRatePerMin >= 9 && v.respiratoryRatePerMin <= 11) rrScore = 1;
  else if (v.respiratoryRatePerMin >= 12 && v.respiratoryRatePerMin <= 20) rrScore = 0;
  else if (v.respiratoryRatePerMin >= 21 && v.respiratoryRatePerMin <= 24) rrScore = 2;
  else if (v.respiratoryRatePerMin >= 25) rrScore = 3;

  // 2. Oxygen Saturation (Scale 1 vs Scale 2)
  let spo2Score = 0;
  if (v.isHypercapnicRespiratoryFailureScale2) {
    // Scale 2 (Target 88-92%)
    if (v.spo2Percent <= 83) spo2Score = 3;
    else if (v.spo2Percent >= 84 && v.spo2Percent <= 85) spo2Score = 2;
    else if (v.spo2Percent >= 86 && v.spo2Percent <= 87) spo2Score = 1;
    else if (v.spo2Percent >= 88 && v.spo2Percent <= 92) spo2Score = 0;
    else if (v.spo2Percent >= 93 && v.spo2Percent <= 94) spo2Score = v.onSupplementalOxygen ? 1 : 0;
    else if (v.spo2Percent >= 95 && v.spo2Percent <= 96) spo2Score = v.onSupplementalOxygen ? 2 : 0;
    else if (v.spo2Percent >= 97) spo2Score = v.onSupplementalOxygen ? 3 : 0;
  } else {
    // Scale 1 (Standard)
    if (v.spo2Percent <= 91) spo2Score = 3;
    else if (v.spo2Percent >= 92 && v.spo2Percent <= 93) spo2Score = 2;
    else if (v.spo2Percent >= 94 && v.spo2Percent <= 95) spo2Score = 1;
    else spo2Score = 0; // >= 96%
  }

  // 3. Supplemental Oxygen
  const o2Score = v.onSupplementalOxygen ? 2 : 0;

  // 4. Systolic Blood Pressure
  let sbpScore = 0;
  if (v.systolicMmHg <= 90) sbpScore = 3;
  else if (v.systolicMmHg >= 91 && v.systolicMmHg <= 100) sbpScore = 2;
  else if (v.systolicMmHg >= 101 && v.systolicMmHg <= 110) sbpScore = 1;
  else if (v.systolicMmHg >= 111 && v.systolicMmHg <= 219) sbpScore = 0;
  else if (v.systolicMmHg >= 220) sbpScore = 3;

  // 5. Heart Rate
  let hrScore = 0;
  if (v.heartRateBpm <= 40) hrScore = 3;
  else if (v.heartRateBpm >= 41 && v.heartRateBpm <= 50) hrScore = 1;
  else if (v.heartRateBpm >= 51 && v.heartRateBpm <= 90) hrScore = 0;
  else if (v.heartRateBpm >= 91 && v.heartRateBpm <= 110) hrScore = 1;
  else if (v.heartRateBpm >= 111 && v.heartRateBpm <= 130) hrScore = 2;
  else if (v.heartRateBpm >= 131) hrScore = 3;

  // 6. Consciousness (ACVPU)
  const consScore = v.consciousness === "ALERT" ? 0 : 3;

  // 7. Temperature
  let tempScore = 0;
  if (v.temperatureCelsius <= 35.0) tempScore = 3;
  else if (v.temperatureCelsius >= 35.1 && v.temperatureCelsius <= 36.0) tempScore = 1;
  else if (v.temperatureCelsius >= 36.1 && v.temperatureCelsius <= 38.0) tempScore = 0;
  else if (v.temperatureCelsius >= 38.1 && v.temperatureCelsius <= 39.0) tempScore = 1;
  else if (v.temperatureCelsius >= 39.1) tempScore = 2;

  const totalScore = rrScore + spo2Score + o2Score + sbpScore + hrScore + consScore + tempScore;
  const hasRedScoreTrigger =
    rrScore === 3 || spo2Score === 3 || sbpScore === 3 || hrScore === 3 || consScore === 3 || tempScore === 3;

  let clinicalRiskTier: News2ScoreBreakdown["clinicalRiskTier"] = "LOW";
  let recommendedResponse = "Ward-based care. Minimum 12-hourly monitoring.";
  let monitoringFrequency = "Every 12 hours";
  let trippedSafetyInvariant: string | undefined = undefined;

  if (totalScore >= 7) {
    clinicalRiskTier = "HIGH_EMERGENCY";
    recommendedResponse =
      "EMERGENCY CLINICAL ESCALATION: Immediate review by Medical Emergency Team (MET) / Intensive Care Specialist with critical care competencies. Continuous monitoring of vital signs. Consider immediate ICU / HDU transfer.";
    monitoringFrequency = "Continuous telemetry & hourly documentation";
    trippedSafetyInvariant = "CF-NEWS-001 (High Critical Deterioration)";
  } else if (totalScore >= 5 && totalScore <= 6) {
    clinicalRiskTier = "MEDIUM";
    recommendedResponse =
      "URGENT CLINICAL REVIEW: Urgent assessment by acute care team or ward doctor. Minimum hourly vital sign monitoring. Prepare for potential higher-level care escalation.";
    monitoringFrequency = "At least hourly";
    trippedSafetyInvariant = "CF-NEWS-002 (Medium Deterioration Risk)";
  } else if (hasRedScoreTrigger) {
    clinicalRiskTier = "LOW_MEDIUM_RED_TRIGGER";
    recommendedResponse =
      "RED SCORE ALERT: Single parameter score of 3 indicates acute extreme derangement. Urgent assessment by registered nurse and attending physician. Escalate monitoring to at least hourly.";
    monitoringFrequency = "At least hourly";
  }

  return {
    totalScore,
    respiratoryRateScore: rrScore,
    spo2Score,
    supplementalOxygenScore: o2Score,
    systolicBpScore: sbpScore,
    heartRateScore: hrScore,
    consciousnessScore: consScore,
    temperatureScore: tempScore,
    hasRedScoreTrigger,
    clinicalRiskTier,
    recommendedResponse,
    monitoringFrequency,
    trippedSafetyInvariant,
  };
}

/**
 * 2. Calculates quick Sequential Organ Failure Assessment (qSOFA)
 */
export function calculateQsofa(v: PatientVitalsForEws): QsofaScoreBreakdown {
  const rrTrigger = v.respiratoryRatePerMin >= 22;
  const mentationTrigger = v.consciousness !== "ALERT";
  const hypotensionTrigger = v.systolicMmHg <= 100;

  const score = (rrTrigger ? 1 : 0) + (mentationTrigger ? 1 : 0) + (hypotensionTrigger ? 1 : 0);
  const isHighRiskSepsis = score >= 2;

  let sepsis3Guidance =
    "qSOFA score < 2: Sepsis-3 risk screen negative. Continue clinical monitoring for infection.";
  let trippedInvariant: string | undefined = undefined;

  if (isHighRiskSepsis) {
    sepsis3Guidance =
      "POSITIVE qSOFA (Score >= 2): HIGH RISK OF SEPSIS-3 IN-HOSPITAL MORTALITY. Execute 1-Hour Sepsis Bundle STAT: 1) Measure blood lactate STAT; 2) Obtain blood cultures prior to antibiotics; 3) Administer broad-spectrum IV antimicrobials; 4) Rapid fluid resuscitation 30 mL/kg crystalloids for SBP <= 100 or lactate >= 4 mmol/L; 5) Apply vasopressors (Norepinephrine) if refractory.";
    trippedInvariant = "CF-SEP-001 (Sepsis-3 High Mortality Risk)";
  }

  return {
    score,
    respiratoryRateTrigger: rrTrigger,
    alteredMentationTrigger: mentationTrigger,
    hypotensionTrigger,
    isHighRiskSepsis,
    sepsis3ClinicalGuidance: sepsis3Guidance,
    trippedSafetyInvariant: trippedInvariant,
  };
}

/**
 * 3. Calculates Modified Early Warning Score (MEWS)
 */
export function calculateMews(v: PatientVitalsForEws): MewsScoreBreakdown {
  // SBP
  let sbpScore = 0;
  if (v.systolicMmHg <= 70) sbpScore = 3;
  else if (v.systolicMmHg >= 71 && v.systolicMmHg <= 80) sbpScore = 2;
  else if (v.systolicMmHg >= 81 && v.systolicMmHg <= 100) sbpScore = 1;
  else if (v.systolicMmHg >= 101 && v.systolicMmHg <= 199) sbpScore = 0;
  else sbpScore = 2; // >= 200

  // Heart Rate
  let hrScore = 0;
  if (v.heartRateBpm <= 40) hrScore = 2;
  else if (v.heartRateBpm >= 41 && v.heartRateBpm <= 50) hrScore = 1;
  else if (v.heartRateBpm >= 51 && v.heartRateBpm <= 100) hrScore = 0;
  else if (v.heartRateBpm >= 101 && v.heartRateBpm <= 110) hrScore = 1;
  else if (v.heartRateBpm >= 111 && v.heartRateBpm <= 129) hrScore = 2;
  else hrScore = 3; // >= 130

  // RR
  let rrScore = 0;
  if (v.respiratoryRatePerMin <= 8) rrScore = 2;
  else if (v.respiratoryRatePerMin >= 9 && v.respiratoryRatePerMin <= 14) rrScore = 0;
  else if (v.respiratoryRatePerMin >= 15 && v.respiratoryRatePerMin <= 20) rrScore = 1;
  else if (v.respiratoryRatePerMin >= 21 && v.respiratoryRatePerMin <= 29) rrScore = 2;
  else rrScore = 3; // >= 30

  // Temp
  let tempScore = 0;
  if (v.temperatureCelsius < 35.0) tempScore = 2;
  else if (v.temperatureCelsius >= 35.0 && v.temperatureCelsius <= 38.4) tempScore = 0;
  else tempScore = 2; // >= 38.5

  // AVPU
  let avpuScore = 0;
  if (v.consciousness === "ALERT") avpuScore = 0;
  else if (v.consciousness === "VOICE" || v.consciousness === "CONFUSION") avpuScore = 1;
  else if (v.consciousness === "PAIN") avpuScore = 2;
  else avpuScore = 3; // UNRESPONSIVE

  const score = sbpScore + hrScore + rrScore + tempScore + avpuScore;

  return {
    score,
    systolicBpScore: sbpScore,
    heartRateScore: hrScore,
    respiratoryRateScore: rrScore,
    temperatureScore: tempScore,
    avpuScore,
    isCriticalAlert: score >= 5,
  };
}

/**
 * 4. Synthesizes a Comprehensive Deterioration Report
 */
export function generateComprehensiveDeteriorationReport(v: PatientVitalsForEws): ComprehensiveDeteriorationReport {
  const news2 = calculateNews2(v);
  const qsofa = calculateQsofa(v);
  const mews = calculateMews(v);

  const rapidResponseTeamIndicated = news2.totalScore >= 7 || news2.hasRedScoreTrigger || mews.score >= 5;
  const sepsisBundleStatTrigger = qsofa.isHighRiskSepsis;

  const narrative = `Patient physiological assessment: NEWS2 composite score is ${news2.totalScore} (Risk Tier: ${news2.clinicalRiskTier.replace(/_/g, " ")}). qSOFA sepsis screening score is ${qsofa.score}/3 (${qsofa.isHighRiskSepsis ? "POSITIVE Sepsis-3" : "Screen Negative"}). MEWS score is ${mews.score}. ${news2.recommendedResponse}`;

  return {
    timestampIso: new Date().toISOString(),
    news2,
    qsofa,
    mews,
    rapidResponseTeamIndicated,
    sepsisBundleStatTrigger,
    clinicalNarrative: narrative,
  };
}

/**
 * Zero-truncation spoken audio formatter for Deterioration Early Warning Alerts
 */
export function formatDeteriorationSpokenAlert(report: ComprehensiveDeteriorationReport): string {
  const n = report.news2;
  const q = report.qsofa;

  const parts: string[] = [
    `Clinical Deterioration and Early Warning Surveillance Alert.`,
    `National Early Warning Score 2 composite is ${n.totalScore} points, classifying as ${n.clinicalRiskTier.replace(/_/g, " ").toLowerCase()}.`,
  ];

  if (n.hasRedScoreTrigger) {
    parts.push(`Red Score Trigger detected: single physiological parameter breached extreme tier 3 threshold.`);
  }

  parts.push(
    `quick Sequential Organ Failure Assessment score is ${q.score} out of 3.`
  );

  if (q.isHighRiskSepsis) {
    parts.push(
      `Warning: Sepsis 3 High Mortality Risk Triggered. Activate 1-Hour Sepsis Bundle STAT: obtain blood cultures, measure serum lactate, initiate 30 milliliters per kilogram balanced crystalloids, and administer broad-spectrum intravenous antimicrobials.`
    );
  }

  if (report.rapidResponseTeamIndicated) {
    parts.push(
      `Urgent Medical Emergency Team or Intensive Care Specialist consultation is indicated STAT. Monitoring frequency: ${n.monitoringFrequency}.`
    );
  } else {
    parts.push(`Physiological parameters remain stable under current ward-based monitoring protocol.`);
  }

  return parts.join(" ");
}
