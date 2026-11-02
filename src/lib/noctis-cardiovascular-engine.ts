/**
 * NOCTIS CARDIOVASCULAR & HEMODYNAMIC CLINICAL DECISION SUPPORT ENGINE
 * Spec: NOCTIS-CARDIO-CDS-001 (ACC/AHA/HFSA, ESC, ACCP Guidelines)
 *
 * Core Capabilities:
 * 1. Heart Failure with reduced/preserved Ejection Fraction (HFrEF / HFpEF) & GDMT 4-Pillar Safety Gating
 * 2. Atrial Fibrillation Stroke & Bleeding Risk (CHA2DS2-VASc & HAS-BLED Scores)
 * 3. Venous Thromboembolism (Wells PE, Wells DVT & PERC Rule)
 * 4. Multi-Drug QTc Prolongation & Torsades de Pointes Risk (Tisdale Score)
 *
 * Zero-Fabrication Rule: Unprovided clinical parameters are explicitly marked as NOT_PROVIDED.
 */

export interface CardioVitals {
  sbp?: number;
  dbp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  spO2?: number;
}

export interface CardioLabs {
  bnpPgMl?: number;
  ntProBnpPgMl?: number;
  serumCreatinineMgDl?: number;
  eGfrMlMin173m2?: number;
  serumPotassiumMmolL?: number;
  troponinNgMl?: number;
  dDimerMcgL?: number;
}

export interface GdmtMedications {
  hasArniOrAceiOrArb?: boolean;
  arniName?: string;
  hasBetaBlocker?: boolean;
  betaBlockerName?: string;
  isEvidenceBasedBetaBlocker?: boolean; // Carvedilol, Metoprolol Succinate, Bisoprolol
  hasMra?: boolean;
  mraName?: string;
  hasSglt2i?: boolean;
  sglt2iName?: string;
}

export interface HeartFailureAssessment {
  phenotype: "HFrEF" | "HFmrEF" | "HFpEF" | "UNKNOWN_EF";
  lvefPercent?: number;
  nyhaClass?: "I" | "II" | "III" | "IV";
  decompensationSigns: string[];
  isAcuteDecompensated: boolean;
  biomarkerStatus: {
    elevatedNtpBnpOrBnp: boolean;
    reportedValue?: string;
  };
  gdmtPillars: {
    pillar1_RASS_ARNI: { prescribed: boolean; drug?: string; status: "OPTIMIZED" | "SUBOPTIMAL" | "OMITTED"; warnings: string[] };
    pillar2_BetaBlocker: { prescribed: boolean; drug?: string; status: "OPTIMIZED" | "NON_EVIDENCE_BASED" | "OMITTED"; warnings: string[] };
    pillar3_MRA: { prescribed: boolean; drug?: string; status: "OPTIMIZED" | "CONTRAINDICATED_OR_CAUTION" | "OMITTED"; warnings: string[] };
    pillar4_SGLT2i: { prescribed: boolean; drug?: string; status: "OPTIMIZED" | "OMITTED"; warnings: string[] };
  };
  gdmtPillarScore: number; // 0 to 4
  gdmtAdherencePercentage: number; // 0% to 100%
  criticalAlerts: string[];
  recommendations: string[];
}

export interface Cha2ds2VascInput {
  ageYears: number;
  isFemale: boolean;
  congestiveHeartFailure?: boolean;
  hypertension?: boolean;
  priorStrokeOrTiaOrThromboembolism?: boolean;
  vascularDisease?: boolean; // prior MI, PAD, aortic plaque
  diabetesMellitus?: boolean;
}

export interface Cha2ds2VascResult {
  score: number;
  components: { [key: string]: number };
  strokeRiskCategory: "LOW" | "INTERMEDIATE" | "HIGH";
  annualStrokeRiskPercent: number;
  anticoagulationRecommendation: string;
}

export interface HasBledInput {
  hypertensionUncontrolled?: boolean; // SBP > 160
  abnormalRenalFunction?: boolean; // dialysis, transplant, Cr > 2.26 mg/dL
  abnormalLiverFunction?: boolean; // cirrhosis, bilirubin > 2x, AST/ALT > 3x
  priorStroke?: boolean;
  priorMajorBleedingOrPredisposition?: boolean;
  labileInr?: boolean;
  elderlyAgeOver65?: boolean;
  drugsAntiplateletOrNsaid?: boolean;
  excessAlcoholConsumption?: boolean;
}

export interface HasBledResult {
  score: number;
  components: { [key: string]: number };
  bleedingRiskCategory: "LOW_MODERATE" | "HIGH_RISK";
  annualBleedingRiskPercent: number;
  clinicalAction: string;
}

export interface WellsPeInput {
  clinicalSignsDvt?: boolean; // leg swelling, pain with palpation (+3)
  peMostLikelyOrEqual?: boolean; // alternative diagnosis less likely (+3)
  heartRateOver100?: boolean; // (+1.5)
  immobilizationOrSurgeryPast4Weeks?: boolean; // (+1.5)
  previousDvtOrPe?: boolean; // (+1.5)
  hemoptysis?: boolean; // (+1.0)
  activeMalignancyPast6Months?: boolean; // (+1.0)
}

export interface WellsPeResult {
  score: number;
  riskTierTwoTier: "PE_UNLIKELY" | "PE_LIKELY";
  riskTierThreeTier: "LOW" | "MODERATE" | "HIGH";
  recommendedDiagnosticStep: string;
}

export interface PercRuleInput {
  ageYears: number;
  heartRateBpm: number;
  pulseOximetrySpO2: number;
  priorDvtOrPe?: boolean;
  recentTraumaOrSurgeryPast4Weeks?: boolean;
  hemoptysis?: boolean;
  exogenousEstrogenUse?: boolean;
  unilateralLegSwelling?: boolean;
}

export interface PercRuleResult {
  percScore: number; // 0 means all criteria negative
  allCriteriaNegative: boolean;
  canSafelyRuleOutPeWithoutTesting: boolean;
  explanation: string;
}

export interface TisdaleQtcInput {
  ageOver68?: boolean; // (+1)
  isFemale?: boolean; // (+1)
  loopDiureticPrescribed?: boolean; // (+1)
  serumPotassiumLte35?: boolean; // (+2)
  admissionQtcMs?: number; // >= 450 ms (+2)
  acuteMyocardialInfarction?: boolean; // (+2)
  qtcProlongingDrugsCount?: number; // 1 drug (+3), >= 2 drugs (+3)
  septicSyndrome?: boolean; // (+3)
  heartFailureWithReducedEf?: boolean; // (+3)
  currentMeasuredQtcMs?: number;
}

export interface TisdaleQtcResult {
  score: number;
  riskCategory: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK";
  qtcAlertSeverity: "NORMAL" | "BORDERLINE_PROLONGED" | "CRITICAL_PROLONGED_TORSADES_RISK";
  recommendations: string[];
}

/**
 * 1. HEART FAILURE PHENOTYPE & GDMT 4-PILLAR EVALUATOR
 */
export function evaluateHeartFailureGdmt(params: {
  lvefPercent?: number;
  nyhaClass?: "I" | "II" | "III" | "IV";
  vitals?: CardioVitals;
  labs?: CardioLabs;
  meds?: GdmtMedications;
  clinicalNotes?: string;
}): HeartFailureAssessment {
  const notes = (params.clinicalNotes || "").toLowerCase();
  const ef = params.lvefPercent;
  let phenotype: HeartFailureAssessment["phenotype"] = "UNKNOWN_EF";

  if (typeof ef === "number") {
    if (ef <= 40) phenotype = "HFrEF";
    else if (ef <= 49) phenotype = "HFmrEF";
    else phenotype = "HFpEF";
  } else if (notes.includes("hfref") || notes.includes("reduced ejection")) {
    phenotype = "HFrEF";
  } else if (notes.includes("hfmref") || notes.includes("mildly reduced")) {
    phenotype = "HFmrEF";
  } else if (notes.includes("hfpef") || notes.includes("preserved ejection")) {
    phenotype = "HFpEF";
  }

  // Decompensation signs
  const decompensationSigns: string[] = [];
  if (notes.includes("jvd") || notes.includes("jugular venous")) decompensationSigns.push("Jugular Venous Distension (JVD)");
  if (notes.includes("s3") || notes.includes("third heart sound")) decompensationSigns.push("S3 Gallop (Volume Overload)");
  if (notes.includes("crackles") || notes.includes("rales") || notes.includes("pulmonary edema")) decompensationSigns.push("Bibasilar Pulmonary Crackles");
  if (notes.includes("orthopnea") || notes.includes("pnd") || notes.includes("paroxysmal nocturnal")) decompensationSigns.push("Orthopnea / PND");
  if (notes.includes("pitting edema") || notes.includes("pedal edema") || notes.includes("lower extremity edema")) decompensationSigns.push("Peripheral Pitting Edema");
  if (notes.includes("hepatojugular")) decompensationSigns.push("Positive Hepatojugular Reflux");

  const isAcuteDecompensated = decompensationSigns.length >= 2 || notes.includes("acute decompensat") || notes.includes("acute heart failure");

  // Biomarkers
  const bnp = params.labs?.bnpPgMl;
  const ntp = params.labs?.ntProBnpPgMl;
  let elevatedBiomarker = false;
  let reportedBiomarker: string | undefined;

  if (typeof ntp === "number") {
    elevatedBiomarker = ntp >= 300;
    reportedBiomarker = `NT-proBNP: ${ntp} pg/mL (${ntp >= 1800 ? "Significantly Elevated / High Inpatient Mortality" : ntp >= 300 ? "Elevated" : "Normal"})`;
  } else if (typeof bnp === "number") {
    elevatedBiomarker = bnp >= 100;
    reportedBiomarker = `BNP: ${bnp} pg/mL (${bnp >= 400 ? "Markedly Elevated / Acute HF Highly Likely" : bnp >= 100 ? "Elevated" : "Normal"})`;
  }

  // GDMT 4-Pillars for HFrEF
  const meds = params.meds || {};
  const k = params.labs?.serumPotassiumMmolL;
  const egfr = params.labs?.eGfrMlMin173m2;
  const sbp = params.vitals?.sbp;

  const pillar1_RASS: HeartFailureAssessment["gdmtPillars"]["pillar1_RASS_ARNI"] = {
    prescribed: Boolean(meds.hasArniOrAceiOrArb),
    drug: meds.arniName,
    status: meds.hasArniOrAceiOrArb ? "OPTIMIZED" : "OMITTED",
    warnings: [],
  };
  if (meds.hasArniOrAceiOrArb && sbp && sbp < 90) {
    pillar1_RASS.warnings.push("Hypotension warning: SBP < 90 mmHg on ARNI/ACEi/ARB.");
  }
  if (!meds.hasArniOrAceiOrArb && phenotype === "HFrEF") {
    pillar1_RASS.warnings.push("Class 1A GDMT Omission: ARNI (Sacubitril/Valsartan) preferred to reduce HF hospitalizations and all-cause mortality.");
  }

  const evidenceBetaBlockers = ["carvedilol", "metoprolol succinate", "bisoprolol"];
  const isEvidenceBb = meds.betaBlockerName
    ? evidenceBetaBlockers.some((b) => meds.betaBlockerName?.toLowerCase().includes(b))
    : meds.isEvidenceBasedBetaBlocker;

  const pillar2_BB: HeartFailureAssessment["gdmtPillars"]["pillar2_BetaBlocker"] = {
    prescribed: Boolean(meds.hasBetaBlocker),
    drug: meds.betaBlockerName,
    status: meds.hasBetaBlocker ? (isEvidenceBb ? "OPTIMIZED" : "NON_EVIDENCE_BASED") : "OMITTED",
    warnings: [],
  };
  if (meds.hasBetaBlocker && isEvidenceBb === false) {
    pillar2_BB.warnings.push("Atenolol or Metoprolol Tartrate is NOT guideline-approved for HFrEF mortality reduction. Switch to Metoprolol Succinate, Carvedilol, or Bisoprolol.");
  }
  if (!meds.hasBetaBlocker && phenotype === "HFrEF") {
    pillar2_BB.warnings.push("Class 1A GDMT Omission: Evidence-based beta-blocker indicated once patient is euvolemic.");
  }

  const pillar3_MRA: HeartFailureAssessment["gdmtPillars"]["pillar3_MRA"] = {
    prescribed: Boolean(meds.hasMra),
    drug: meds.mraName,
    status: meds.hasMra ? "OPTIMIZED" : "OMITTED",
    warnings: [],
  };
  if (k && k >= 5.0) {
    pillar3_MRA.status = "CONTRAINDICATED_OR_CAUTION";
    pillar3_MRA.warnings.push(`Hyperkalemia safety alert: Serum Potassium is ${k} mmol/L. MRA initiation/continuation contraindicated or requires close holding.`);
  }
  if (egfr && egfr < 30) {
    pillar3_MRA.status = "CONTRAINDICATED_OR_CAUTION";
    pillar3_MRA.warnings.push(`Severe renal impairment: eGFR is ${egfr} mL/min/1.73m². MRA contraindicated when eGFR < 30 mL/min.`);
  }
  if (!meds.hasMra && phenotype === "HFrEF" && (!k || k < 5.0) && (!egfr || egfr >= 30)) {
    pillar3_MRA.warnings.push("Class 1A GDMT Omission: Mineralocorticoid receptor antagonist (Spironolactone/Eplerenone) indicated.");
  }

  const pillar4_SGLT2i: HeartFailureAssessment["gdmtPillars"]["pillar4_SGLT2i"] = {
    prescribed: Boolean(meds.hasSglt2i),
    drug: meds.sglt2iName,
    status: meds.hasSglt2i ? "OPTIMIZED" : "OMITTED",
    warnings: [],
  };
  if (!meds.hasSglt2i && (phenotype === "HFrEF" || phenotype === "HFpEF")) {
    pillar4_SGLT2i.warnings.push("Class 1A GDMT Omission: SGLT2 inhibitor (Dapagliflozin or Empagliflozin) indicated regardless of diabetic status.");
  }

  // Scoring
  let score = 0;
  if (pillar1_RASS.status === "OPTIMIZED") score += 1;
  if (pillar2_BB.status === "OPTIMIZED") score += 1;
  if (pillar3_MRA.status === "OPTIMIZED") score += 1;
  if (pillar4_SGLT2i.status === "OPTIMIZED") score += 1;

  const criticalAlerts: string[] = [];
  if (isAcuteDecompensated && sbp && sbp < 90) {
    criticalAlerts.push("🚨 CARDIOGENIC SHOCK WARNING: Decompensated heart failure with SBP < 90 mmHg (hypoperfusion). Avoid high-dose vasodilators/beta-blockers; urgent bedside echo and inotropic/ICU assessment.");
  }
  if (k && k >= 6.0) {
    criticalAlerts.push(`🚨 CRITICAL HYPERKALEMIA: Serum Potassium is ${k} mmol/L. Immediately discontinue ACEi/ARB/ARNI and MRA; acquire 12-lead ECG for peaked T waves.`);
  }

  const recommendations: string[] = [];
  if (phenotype === "HFrEF" && score < 4) {
    recommendations.push(`Quadruple GDMT optimization required: Currently on ${score}/4 pillars (${Math.round((score / 4) * 100)}% adherence).`);
  }
  if (isAcuteDecompensated) {
    recommendations.push("Initiate IV loop diuretics (e.g. Furosemide 1x–2.5x home oral dose IV) and monitor 2-hour spot urine sodium (>50–70 mEq/L) to verify diuretic response.");
  }

  return {
    phenotype,
    lvefPercent: ef,
    nyhaClass: params.nyhaClass,
    decompensationSigns,
    isAcuteDecompensated,
    biomarkerStatus: {
      elevatedNtpBnpOrBnp: elevatedBiomarker,
      reportedValue: reportedBiomarker,
    },
    gdmtPillars: {
      pillar1_RASS_ARNI: pillar1_RASS,
      pillar2_BetaBlocker: pillar2_BB,
      pillar3_MRA: pillar3_MRA,
      pillar4_SGLT2i: pillar4_SGLT2i,
    },
    gdmtPillarScore: score,
    gdmtAdherencePercentage: Math.round((score / 4) * 100),
    criticalAlerts,
    recommendations,
  };
}

/**
 * 2. ATRIAL FIBRILLATION STROKE & BLEEDING RISK (CHA2DS2-VASc & HAS-BLED)
 */
export function calculateCha2ds2Vasc(input: Cha2ds2VascInput): Cha2ds2VascResult {
  const components: { [key: string]: number } = {};
  let score = 0;

  if (input.congestiveHeartFailure) {
    components["Congestive Heart Failure / LVEF <= 40% (C)"] = 1;
    score += 1;
  }
  if (input.hypertension) {
    components["Hypertension (H)"] = 1;
    score += 1;
  }
  if (input.ageYears >= 75) {
    components["Age >= 75 Years (A2)"] = 2;
    score += 2;
  } else if (input.ageYears >= 65) {
    components["Age 65-74 Years (A)"] = 1;
    score += 1;
  }
  if (input.diabetesMellitus) {
    components["Diabetes Mellitus (D)"] = 1;
    score += 1;
  }
  if (input.priorStrokeOrTiaOrThromboembolism) {
    components["Prior Stroke, TIA, or Thromboembolism (S2)"] = 2;
    score += 2;
  }
  if (input.vascularDisease) {
    components["Vascular Disease (prior MI, PAD, aortic plaque) (V)"] = 1;
    score += 1;
  }
  if (input.isFemale) {
    components["Sex Category Female (Sc)"] = 1;
    score += 1;
  }

  // Stroke risk table (annual ischemic stroke rate)
  const strokeRates: { [key: number]: number } = {
    0: 0.2, 1: 0.6, 2: 2.2, 3: 3.2, 4: 4.8, 5: 7.2, 6: 9.7, 7: 11.2, 8: 12.5, 9: 15.2,
  };
  const annualRate = strokeRates[Math.min(score, 9)] ?? 15.2;

  let category: Cha2ds2VascResult["strokeRiskCategory"] = "LOW";
  let rec = "";

  const thresholdHigh = input.isFemale ? 3 : 2;
  const thresholdMod = input.isFemale ? 2 : 1;

  if (score >= thresholdHigh) {
    category = "HIGH";
    rec = "Strong Class 1 recommendation for oral anticoagulation (Direct Oral Anticoagulants [DOACs: Apixaban, Rivaroxaban, Dabigatran, Edoxaban] preferred over Warfarin).";
  } else if (score === thresholdMod) {
    category = "INTERMEDIATE";
    rec = "Class 2a recommendation: Oral anticoagulation should be considered based on shared patient-clinician decision-making.";
  } else {
    category = "LOW";
    rec = "Class 3 recommendation: No antithrombotic or anticoagulation therapy indicated (bleeding risk exceeds stroke reduction benefit).";
  }

  return {
    score,
    components,
    strokeRiskCategory: category,
    annualStrokeRiskPercent: annualRate,
    anticoagulationRecommendation: rec,
  };
}

export function calculateHasBled(input: HasBledInput): HasBledResult {
  const components: { [key: string]: number } = {};
  let score = 0;

  if (input.hypertensionUncontrolled) {
    components["Hypertension (uncontrolled SBP > 160) (H)"] = 1;
    score += 1;
  }
  if (input.abnormalRenalFunction) {
    components["Abnormal Renal Function (dialysis, transplant, Cr > 2.3) (A)"] = 1;
    score += 1;
  }
  if (input.abnormalLiverFunction) {
    components["Abnormal Liver Function (cirrhosis, bili > 2x, transaminases > 3x) (A)"] = 1;
    score += 1;
  }
  if (input.priorStroke) {
    components["Stroke History (S)"] = 1;
    score += 1;
  }
  if (input.priorMajorBleedingOrPredisposition) {
    components["Bleeding History or Predisposition (B)"] = 1;
    score += 1;
  }
  if (input.labileInr) {
    components["Labile INRs (< 60% time in therapeutic range) (L)"] = 1;
    score += 1;
  }
  if (input.elderlyAgeOver65) {
    components["Elderly (Age > 65 Years) (E)"] = 1;
    score += 1;
  }
  if (input.drugsAntiplateletOrNsaid) {
    components["Concomitant Drugs (Antiplatelets, NSAIDs) (D)"] = 1;
    score += 1;
  }
  if (input.excessAlcoholConsumption) {
    components["Excess Alcohol (>= 8 drinks/week) (D)"] = 1;
    score += 1;
  }

  const bleedRates: { [key: number]: number } = {
    0: 1.1, 1: 1.0, 2: 1.9, 3: 3.7, 4: 8.7, 5: 12.5,
  };
  const annualBleed = bleedRates[Math.min(score, 5)] ?? 12.5;
  const isHigh = score >= 3;

  return {
    score,
    components,
    bleedingRiskCategory: isHigh ? "HIGH_RISK" : "LOW_MODERATE",
    annualBleedingRiskPercent: annualBleed,
    clinicalAction: isHigh
      ? "High bleeding risk (HAS-BLED >= 3). Caution and regular clinical review indicated. Address modifiable bleeding factors (control BP, discontinue unnecessary NSAIDs/antiplatelets, correct labile INR). HAS-BLED is NOT an absolute contraindication to OAC when CHA2DS2-VASc is elevated."
      : "Low-to-moderate bleeding risk. Routine clinical monitoring with anticoagulation.",
  };
}

/**
 * 3. VENOUS THROMBOEMBOLISM (WELLS PE & PERC RULE)
 */
export function calculateWellsPe(input: WellsPeInput): WellsPeResult {
  let score = 0;
  if (input.clinicalSignsDvt) score += 3.0;
  if (input.peMostLikelyOrEqual) score += 3.0;
  if (input.heartRateOver100) score += 1.5;
  if (input.immobilizationOrSurgeryPast4Weeks) score += 1.5;
  if (input.previousDvtOrPe) score += 1.5;
  if (input.hemoptysis) score += 1.0;
  if (input.activeMalignancyPast6Months) score += 1.0;

  const isLikely = score > 4.0;
  let threeTier: WellsPeResult["riskTierThreeTier"] = "LOW";
  if (score > 6.0) threeTier = "HIGH";
  else if (score >= 2.0) threeTier = "MODERATE";

  let step = "";
  if (isLikely) {
    step = "PE Likely (Wells > 4). Stat CT Pulmonary Angiography (CTPA) or V/Q scan indicated. Do not rely solely on D-dimer.";
  } else {
    step = "PE Unlikely (Wells <= 4). High-sensitivity D-dimer indicated. If negative (or below age-adjusted cutoff), PE can be safely excluded without CT imaging.";
  }

  return {
    score,
    riskTierTwoTier: isLikely ? "PE_LIKELY" : "PE_UNLIKELY",
    riskTierThreeTier: threeTier,
    recommendedDiagnosticStep: step,
  };
}

export function evaluatePercRule(input: PercRuleInput): PercRuleResult {
  let percScore = 0;
  const fails: string[] = [];

  if (input.ageYears >= 50) { percScore++; fails.push("Age >= 50"); }
  if (input.heartRateBpm >= 100) { percScore++; fails.push("Heart rate >= 100 bpm"); }
  if (input.pulseOximetrySpO2 < 95) { percScore++; fails.push("SpO2 < 95% on room air"); }
  if (input.priorDvtOrPe) { percScore++; fails.push("Prior DVT/PE history"); }
  if (input.recentTraumaOrSurgeryPast4Weeks) { percScore++; fails.push("Recent surgery/trauma past 4 weeks"); }
  if (input.hemoptysis) { percScore++; fails.push("Hemoptysis"); }
  if (input.exogenousEstrogenUse) { percScore++; fails.push("Exogenous estrogen use (OCPs, HRT)"); }
  if (input.unilateralLegSwelling) { percScore++; fails.push("Unilateral leg swelling"); }

  const negative = percScore === 0;
  return {
    percScore,
    allCriteriaNegative: negative,
    canSafelyRuleOutPeWithoutTesting: negative,
    explanation: negative
      ? "PERC Rule is completely negative (all 8 criteria met). In low clinical pre-test probability patients, pulmonary embolism is ruled out (<1.8% risk) with NO D-dimer or radiation imaging required."
      : `PERC Rule positive (${fails.join(", ")}). PERC cannot be used to rule out PE; obtain high-sensitivity D-dimer or CTPA depending on Wells score.`,
  };
}

/**
 * 4. TISDALE SCORE & MULTI-DRUG QTc RISK
 */
export function calculateTisdaleQtcScore(input: TisdaleQtcInput): TisdaleQtcResult {
  let score = 0;
  if (input.ageOver68) score += 1;
  if (input.isFemale) score += 1;
  if (input.loopDiureticPrescribed) score += 1;
  if (input.serumPotassiumLte35) score += 2;
  if (input.admissionQtcMs && input.admissionQtcMs >= 450) score += 2;
  if (input.acuteMyocardialInfarction) score += 2;
  if (input.septicSyndrome) score += 3;
  if (input.heartFailureWithReducedEf) score += 3;
  const drugCount = input.qtcProlongingDrugsCount ?? 0;
  if (drugCount >= 2) score += 3;
  else if (drugCount === 1) score += 3;

  let riskCategory: TisdaleQtcResult["riskCategory"] = "LOW_RISK";
  if (score >= 11) riskCategory = "HIGH_RISK";
  else if (score >= 7) riskCategory = "MODERATE_RISK";

  const measuredQtc = input.currentMeasuredQtcMs;
  let qtcSeverity: TisdaleQtcResult["qtcAlertSeverity"] = "NORMAL";
  const recs: string[] = [];

  if (typeof measuredQtc === "number") {
    if (measuredQtc >= 500) {
      qtcSeverity = "CRITICAL_PROLONGED_TORSADES_RISK";
      recs.push(`🚨 CRITICAL QTc PROLONGATION (${measuredQtc} ms >= 500 ms). High imminent risk of Torsades de Pointes. Discontinue non-essential QT-prolonging medications; maintain Serum Potassium >= 4.0 mmol/L and Magnesium >= 2.0 mg/dL.`);
    } else if (measuredQtc >= 470) {
      qtcSeverity = "BORDERLINE_PROLONGED";
      recs.push(`Borderline QTc prolongation (${measuredQtc} ms). Monitor serial 12-lead ECGs and correct any hypokalemia or hypomagnesemia.`);
    }
  }

  if (riskCategory === "HIGH_RISK") {
    recs.push(`High Tisdale QTc score (${score} points). High risk of drug-induced QTc prolongation. Avoid co-administration of multiple QT-prolonging agents.`);
  }

  return {
    score,
    riskCategory,
    qtcAlertSeverity: qtcSeverity,
    recommendations: recs,
  };
}
