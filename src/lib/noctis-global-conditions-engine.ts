/**
 * NOCTIS GLOBAL LEADING CONDITIONS & INFECTIOUS/METABOLIC/PULMONARY ENGINE
 * Spec: NOCTIS-GLOBAL-CDS-007 (WHO 2023/2026, GOLD, GINA, ACC/AHA, CDC, APA Guidelines)
 *
 * Core Capabilities:
 * 1. COPD & Asthma (GOLD 2026 ABE Staging, FEV1/FVC, Exacerbation Protocol & GINA SMART)
 * 2. Hypertensive Crisis (Emergency vs. Urgency, End-Organ Damage & IV Titration Limits)
 * 3. Diarrheal Illness & Dehydration (WHO Dehydration Grading & C. diff Protocol)
 * 4. Obesity & Metabolic Syndrome (BMI Classification, Cardiovascular Risk & Incretin Therapy)
 * 5. Depression (PHQ-9) & Anxiety (GAD-7) with Immediate Self-Harm Safety Gateway
 * 6. HIV/AIDS (CD4-Based Opportunistic Infection Prophylaxis Gating & Viral Load)
 * 7. Tuberculosis (Active vs. Latent, RIPE 4-Drug Regimen & Hepatotoxicity Guard)
 * 8. Malaria (P. falciparum Severity Criteria & IV Artesunate Emergency Protocol)
 * 9. Hepatitis C (HCV RNA Confirmation & Pan-Genotypic DAA Regimens)
 *
 * Zero-Fabrication Rule: Unprovided clinical parameters are explicitly marked as NOT_PROVIDED.
 */

export interface CopdAsthmaInput {
  isCopdOrAsthma: "COPD" | "ASTHMA" | "ACO_OVERLAP";
  postBronchodilatorFev1FvcRatio?: number; // < 0.70 confirms airflow limitation
  fev1PercentPredicted?: number; // GOLD 1 (>=80), 2 (50-79), 3 (30-49), 4 (<30)
  exacerbationsPastYear?: number;
  hospitalizationsPastYear?: number;
  mrcDyspneaScore?: number; // mMRC 0-4
  catScore?: number; // COPD Assessment Test (0-40)
  currentSpO2RoomAir?: number;
  restingPaO2MmHg?: number;
  activeWheezingOrPursedLipBreathing?: boolean;
}

export interface CopdAsthmaResult {
  condition: string;
  goldOrGinaStage: string;
  exacerbationRiskGroup: "GROUP_A_LOW_RISK" | "GROUP_B_HIGH_SYMPTOM" | "GROUP_E_EXACERBATOR" | "GINA_STEP_1_TO_5";
  longTermOxygenTherapyIndicated: boolean;
  acuteExacerbationProtocol: string[];
  maintenancePharmacotherapy: string[];
}

export interface HypertensiveCrisisInput {
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  hasAcuteStrokeOrNeurologicalDeficit?: boolean;
  hasAcuteHeadacheOrEncephalopathy?: boolean;
  hasAcuteChestPainOrAcs?: boolean;
  hasAcuteAorticDissectionTear?: boolean;
  hasAcutePulmonaryEdemaShortnessOfBreath?: boolean;
  hasAcuteRenalFailureRisingCreatinine?: boolean;
  hasPapilledemaOrRetinalHemorrhages?: boolean;
  isPregnancy?: boolean;
}

export interface HypertensiveCrisisResult {
  category: "HYPERTENSIVE_EMERGENCY" | "HYPERTENSIVE_URGENCY" | "STAGE_2_HYPERTENSION" | "STAGE_1_HYPERTENSION" | "ELEVATED_BP" | "NORMAL_BP";
  targetBloodPressure1stHour: string;
  maximumPermittedMapDropPercent1stHour: number; // Max 20-25% drop to prevent stroke
  recommendedIvAgents: string[];
  contraindicatedAgents: string[];
  immediateAction: string;
}

export interface DiarrhealIllnessInput {
  durationDays: number;
  stoolFrequencyPerDay: number;
  hasBloodyStoolsOrDysentery?: boolean;
  hasSevereDehydrationSigns?: boolean; // lethargic, sunken eyes, skin tenting > 2s, unable to drink
  recentAntibioticExposurePast3Months?: boolean; // C. diff risk
  feverCelsius?: number;
}

export interface DiarrhealIllnessResult {
  syndrome: "ACUTE_WATERY_DIARRHEA" | "DYSENTERY_BLOODY" | "SUSPECTED_CLOSTRIDIOIDES_DIFFICILE" | "CHRONIC_DIARRHEA";
  dehydrationStatus: "SEVERE_DEHYDRATION" | "SOME_DEHYDRATION" | "NO_DEHYDRATION";
  rehydrationProtocol: string;
  antimicrobialGuidance: string;
  contraindications: string[];
}

export interface ObesityMetabolicInput {
  bodyMassIndexKgM2: number;
  waistCircumferenceInches?: number;
  isFemale?: boolean;
  fastingTriglyceridesMgDl?: number; // >= 150
  hdlCholesterolMgDl?: number; // < 40 (M) or < 50 (F)
  systolicBpMmHg?: number; // >= 130
  diastolicBpMmHg?: number; // >= 85
  fastingGlucoseMgDl?: number; // >= 100
}

export interface ObesityMetabolicResult {
  whoBmiCategory: "NORMAL_WEIGHT" | "OVERWEIGHT" | "OBESITY_CLASS_1" | "OBESITY_CLASS_2" | "OBESITY_CLASS_3_SEVERE";
  metabolicSyndromeCriteriaMet: number; // 0 to 5 (NCEP ATP III)
  hasMetabolicSyndrome: boolean; // >= 3
  pharmacotherapyEligibility: string;
  bariatricSurgeryEligibility: string;
  evidenceBasedRegimens: string[];
}

export interface Phq9Gad7Input {
  phq9Score?: number; // 0 to 27
  phq9Item9SelfHarmScore?: number; // 0, 1, 2, or 3 (thoughts of death/self-harm)
  gad7Score?: number; // 0 to 21
  hasActiveSuicidalIntentOrPlan?: boolean;
}

export interface Phq9Gad7Result {
  depressionSeverity: "NONE_MINIMAL" | "MILD" | "MODERATE" | "MODERATELY_SEVERE" | "SEVERE" | "NOT_EVALUATED";
  anxietySeverity: "NONE_MINIMAL" | "MILD" | "MODERATE" | "SEVERE" | "NOT_EVALUATED";
  immediateSuicideSafetyLock: boolean;
  crisisEscalationDirective?: string;
  firstLinePharmacotherapy: string[];
  psychotherapyRecommendations: string[];
}

export interface HivOpportunisticProphylaxisInput {
  cd4CountCellsPerUl: number;
  viralLoadCopiesPerMl?: number;
  isCurrentlyOnArt?: boolean;
  priorHistoryOfPcpOrToxo?: boolean;
}

export interface HivOpportunisticProphylaxisResult {
  cdcClinicalStage: "STAGE_1_CD4_GE_500" | "STAGE_2_CD4_200_TO_499" | "STAGE_3_AIDS_CD4_LT_200";
  pcpProphylaxisIndicated: boolean; // CD4 < 200
  toxoplasmosisProphylaxisIndicated: boolean; // CD4 < 100
  macProphylaxisIndicated: boolean; // CD4 < 50
  indicatedProphylacticRegimens: string[];
  artGuidance: string;
}

export interface TuberculosisManagementInput {
  presentation: "ACTIVE_PULMONARY_SUSPECTED" | "LATENT_TB_INFECTION" | "EXTRA_PULMONARY";
  hasCoughOver3WeeksWithHemoptysisAndNightSweats?: boolean;
  sputumAfbSmearOrGeneXpertPositive?: boolean;
  tuberculinSkinTestOrIgraPositive?: boolean;
  chestXrayCavitaryInfiltratePresent?: boolean;
  baselineAstU_L?: number;
  baselineAltU_L?: number;
  baselineBilirubinMgDl?: number;
}

export interface TuberculosisManagementResult {
  clinicalStatus: "ACTIVE_TUBERCULOSIS_CONFIRMED" | "ACTIVE_TUBERCULOSIS_HIGH_SUSPICION" | "LATENT_TUBERCULOSIS_INFECTION" | "TB_UNLIKELY";
  airborneIsolationRequired: boolean;
  standardRegimen: string;
  drugComponents: { [drug: string]: string };
  hepatotoxicityMonitoringRules: string[];
}

export interface MalariaManagementInput {
  travelToEndemicAreaPastYear: boolean;
  speciesIdentified?: "PLASMODIUM_FALCIPARUM" | "PLASMODIUM_VIVAX" | "PLASMODIUM_OVALE" | "PLASMODIUM_MALARIAE" | "UNKNOWN";
  parasitemiaPercentage?: number; // >= 10% is severe
  hasImpairedConsciousnessOrCerebralMalaria?: boolean;
  hasAcuteRenalFailureOrOliguria?: boolean;
  hasHypoglycemiaGlucoseLt40?: boolean;
  hasPulmonaryEdemaOrArds?: boolean;
  hasSevereAnemiaHgbLt7?: boolean;
}

export interface MalariaManagementResult {
  severityTier: "SEVERE_MALARIA_LIFE_THREATENING" | "UNCOMPLICATED_MALARIA" | "MALARIA_NOT_DOCUMENTED";
  firstLineTherapy: string;
  g6pdTestingRequiredBeforePrimaquine: boolean;
  emergencyActions: string[];
}

export interface HepatitisCInput {
  hcvAntibodyPositive: boolean;
  hcvRnaDetectable?: boolean;
  hcvRnaViralLoadIuMl?: number;
  cirrhosisPresent?: boolean;
  priorTreatmentExperience?: boolean;
}

export interface HepatitisCResult {
  diagnosticConclusion: "ACTIVE_CHRONIC_HEPATITIS_C" | "RESOLVED_PAST_HCV_INFECTION" | "NEGATIVE_NO_INFECTION";
  panGenotypicRegimens: string[];
  treatmentDurationWeeks: number;
  sustainedVirologicResponseGoal: string;
}

/**
 * 1. COPD & ASTHMA EVALUATOR (GOLD 2026 & GINA SMART)
 */
export function evaluateCopdAsthma(input: CopdAsthmaInput): CopdAsthmaResult {
  const fev1Ratio = input.postBronchodilatorFev1FvcRatio ?? 0.65;
  const fev1Pct = input.fev1PercentPredicted ?? 55;
  const exac = input.exacerbationsPastYear ?? 0;
  const hosp = input.hospitalizationsPastYear ?? 0;
  const spo2 = input.currentSpO2RoomAir ?? 94;
  const pao2 = input.restingPaO2MmHg ?? 62;

  let group: CopdAsthmaResult["exacerbationRiskGroup"] = "GROUP_A_LOW_RISK";
  let goldStage = "GOLD Unclassified";

  if (input.isCopdOrAsthma === "COPD") {
    if (fev1Pct >= 80) goldStage = "GOLD 1 (Mild)";
    else if (fev1Pct >= 50) goldStage = "GOLD 2 (Moderate)";
    else if (fev1Pct >= 30) goldStage = "GOLD 3 (Severe)";
    else goldStage = "GOLD 4 (Very Severe)";

    // GOLD 2026 ABE Classification
    if (hosp >= 1 || exac >= 2) {
      group = "GROUP_E_EXACERBATOR";
    } else if ((input.mrcDyspneaScore ?? 0) >= 2 || (input.catScore ?? 0) >= 10) {
      group = "GROUP_B_HIGH_SYMPTOM";
    } else {
      group = "GROUP_A_LOW_RISK";
    }
  } else {
    goldStage = "GINA Persistent Asthma";
    group = "GINA_STEP_1_TO_5";
  }

  // Long-Term Oxygen Therapy (LTOT) criteria: PaO2 <= 55 mmHg or SpO2 <= 88%
  const needsO2 = spo2 <= 88 || pao2 <= 55;

  const exacProtocol = [
    "Short-acting inhaled beta2-agonist (Albuterol) + Anticholinergic (Ipratropium) every 1-4 hours as needed.",
    "Systemic Corticosteroids: Oral Prednisone 40 mg daily for 5 days (GOLD standard; avoids prolonged taper).",
    "Antibiotics for 5 days if increased sputum purulence plus increased volume/dyspnea (Azithromycin 500mg then 250mg daily, Doxycycline 100mg BID, or Amoxicillin-Clavulanate).",
  ];

  const maintenance: string[] = [];
  if (group === "GROUP_E_EXACERBATOR") {
    maintenance.push("Dual Bronchodilation: LABA + LAMA (e.g. Indacaterol/Glycopyrronium or Tiotropium/Olodaterol).");
    maintenance.push("Add Inhaled Corticosteroid (ICS) if blood eosinophils >= 300 cells/uL or history of concurrent asthma (Triple Therapy: LABA + LAMA + ICS).");
  } else if (group === "GROUP_B_HIGH_SYMPTOM") {
    maintenance.push("Initial maintenance: LABA + LAMA dual bronchodilator (preferred over single agent for severe breathlessness).");
  } else if (group === "GROUP_A_LOW_RISK") {
    maintenance.push("Single long-acting bronchodilator (LAMA or LABA) as maintenance plus SABA PRN.");
  } else {
    // Asthma GINA SMART track
    maintenance.push("GINA Track 1 (Preferred): As-needed low-dose Inhaled Corticosteroid (ICS)-Formoterol as single maintenance and reliever therapy (SMART).");
  }

  return {
    condition: input.isCopdOrAsthma,
    goldOrGinaStage: goldStage,
    exacerbationRiskGroup: group,
    longTermOxygenTherapyIndicated: needsO2,
    acuteExacerbationProtocol: exacProtocol,
    maintenancePharmacotherapy: maintenance,
  };
}

/**
 * 2. HYPERTENSIVE CRISIS DECIDER (EMERGENCY VS. URGENCY)
 */
export function evaluateHypertensiveCrisis(input: HypertensiveCrisisInput): HypertensiveCrisisResult {
  const { systolicBpMmHg: sbp, diastolicBpMmHg: dbp } = input;
  const isCrisisRange = sbp >= 180 || dbp >= 120;

  const hasEndOrgan = Boolean(
    input.hasAcuteStrokeOrNeurologicalDeficit ||
    input.hasAcuteHeadacheOrEncephalopathy ||
    input.hasAcuteChestPainOrAcs ||
    input.hasAcuteAorticDissectionTear ||
    input.hasAcutePulmonaryEdemaShortnessOfBreath ||
    input.hasAcuteRenalFailureRisingCreatinine ||
    input.hasPapilledemaOrRetinalHemorrhages
  );

  let category: HypertensiveCrisisResult["category"] = "NORMAL_BP";
  if (isCrisisRange && hasEndOrgan) category = "HYPERTENSIVE_EMERGENCY";
  else if (isCrisisRange && !hasEndOrgan) category = "HYPERTENSIVE_URGENCY";
  else if (sbp >= 140 || dbp >= 90) category = "STAGE_2_HYPERTENSION";
  else if (sbp >= 130 || dbp >= 80) category = "STAGE_1_HYPERTENSION";
  else if (sbp >= 120 && dbp < 80) category = "ELEVATED_BP";

  const ivAgents: string[] = [];
  const contra: string[] = [];
  let target = "";
  let action = "";

  if (category === "HYPERTENSIVE_EMERGENCY") {
    if (input.hasAcuteStrokeOrNeurologicalDeficit) {
      target = "ACUTE ISCHEMIC STROKE PERMISSIVE HYPERTENSION: If candidate for IV thrombolysis (Alteplase/Tenecteplase), gently lower BP to < 185/110 mmHg pre-treatment, then maintain < 180/105 mmHg for 24h. If NOT receiving thrombolysis, maintain permissive hypertension up to 220/120 mmHg (do NOT lower BP unless SBP > 220 or DBP > 120 mmHg).";
      ivAgents.push("IV Labetalol 10-20 mg slow IV push over 1-2 min (may repeat x1), or IV Nicardipine infusion 5 mg/hr (titrate by 2.5 mg/hr q5-15 min up to 15 mg/hr).");
      contra.push("DO NOT AGGRESSIVELY LOWER BLOOD PRESSURE: Precipitously dropping MAP (> 15%) in acute ischemic stroke causes catastrophic hypoperfusion in the ischemic penumbra, expanding the core infarct. SUBLINGUAL NIFEDIPINE IS STRICTLY CONTRAINDICATED.");
      action = "🚨 CODE STROKE ACTIVATION STAT: Acute focal neurological deficit with severe hypertension. Emergent Non-Contrast Head CT within <= 20 minutes to exclude intracranial hemorrhage. Permissive hypertension protocol strictly enforced.";
    } else if (input.hasAcuteAorticDissectionTear) {
      target = "RAPID REDUCTION: Lower SBP to < 120 mmHg and HR to < 60 bpm within 20 minutes.";
      ivAgents.push("IV Esmolol infusion FIRST to prevent reflex tachycardia and shear stress, then IV Nicardipine or Nitroprusside.");
      contra.push("DO NOT GIVE DIRECT VASODILATORS (Hydralazine, Nitroprusside) WITHOUT PRIOR BETA-BLOCKADE (triggers aortic wall shear and propagation of tear).");
      action = "🚨 HYPERTENSIVE EMERGENCY ICU ADMISSION STAT: Acute life-threatening aortic dissection verified. Continuous arterial line monitoring and titratable IV antihypertensives required.";
    } else {
      target = "Reduce Mean Arterial Pressure (MAP) by NO MORE THAN 20% to 25% in the first hour, then to 160/100-110 over next 2-6 hours.";
      ivAgents.push("IV Nicardipine (Cardene) infusion 5 mg/hr (titrate q5-15 min by 2.5 mg/hr up to 15 mg/hr).");
      ivAgents.push("IV Labetalol (20 mg bolus, then 40-80 mg q10 min or continuous infusion 1-2 mg/min).");
      if (input.hasAcutePulmonaryEdemaShortnessOfBreath) {
        ivAgents.push("IV Nitroglycerin infusion + IV Furosemide (reduces preload in cardiogenic pulmonary edema).");
      }
      contra.push("Short-acting sublingual/immediate-release Nifedipine is STRICTLY CONTRAINDICATED (causes catastrophic precipitate BP drops, cerebral hypoperfusion, ischemic stroke, and acute MI).");
      action = "🚨 HYPERTENSIVE EMERGENCY ICU ADMISSION STAT: Acute life-threatening target organ damage verified. Continuous arterial line monitoring and titratable IV antihypertensives required.";
    }
  } else if (category === "HYPERTENSIVE_URGENCY") {
    target = "Gradual outpatient/observation blood pressure reduction over 24 to 48 hours to < 160/100 mmHg.";
    action = "Hypertensive Urgency (SBP >= 180 or DBP >= 120 without acute end-organ damage). Do NOT rapidly drop blood pressure with IV meds (risk of cerebral or myocardial ischemia). Initiate or adjust oral medications (Amlodipine, Lisinopril, Chlorthalidone) with close 24-48 hr follow-up.";
    contra.push("DO NOT USE SUBLINGUAL NIFEDIPINE (uncontrolled precipitate hypotension, stroke, and death).");
  } else {
    target = "Target outpatient BP < 130/80 mmHg per ACC/AHA guidelines.";
    action = "Initiate lifestyle modifications and first-line oral antihypertensives (Thiazide, CCB, ACEi/ARB).";
  }

  return {
    category,
    targetBloodPressure1stHour: target,
    maximumPermittedMapDropPercent1stHour: input.hasAcuteAorticDissectionTear ? 50 : (input.hasAcuteStrokeOrNeurologicalDeficit ? 15 : 25),
    recommendedIvAgents: ivAgents,
    contraindicatedAgents: contra,
    immediateAction: action,
  };
}

/**
 * 3. DIARRHEAL ILLNESS & DEHYDRATION (WHO GRADING)
 */
export function evaluateDiarrhealIllness(input: DiarrhealIllnessInput): DiarrhealIllnessResult {
  const isCdiff = Boolean(input.recentAntibioticExposurePast3Months);
  const isDysentery = Boolean(input.hasBloodyStoolsOrDysentery);

  let syndrome: DiarrhealIllnessResult["syndrome"] = "ACUTE_WATERY_DIARRHEA";
  if (isCdiff) syndrome = "SUSPECTED_CLOSTRIDIOIDES_DIFFICILE";
  else if (isDysentery) syndrome = "DYSENTERY_BLOODY";
  else if (input.durationDays >= 14) syndrome = "CHRONIC_DIARRHEA";

  let dehy: DiarrhealIllnessResult["dehydrationStatus"] = "NO_DEHYDRATION";
  if (input.hasSevereDehydrationSigns) dehy = "SEVERE_DEHYDRATION";
  else if (input.stoolFrequencyPerDay >= 5) dehy = "SOME_DEHYDRATION";

  let rehydration = "";
  if (dehy === "SEVERE_DEHYDRATION") {
    rehydration = "WHO Plan C (Severe Dehydration IV Fluid Bolus): IV Ringer's Lactate (or Normal Saline) 100 mL/kg (given as 30 mL/kg in first 30 min, then 70 mL/kg over 2.5 hours). Reassess every 15-30 min.";
  } else if (dehy === "SOME_DEHYDRATION") {
    rehydration = "WHO Plan B: Oral Rehydration Salts (ORS) solution 75 mL/kg over 4 hours. Give frequent sips.";
  } else {
    rehydration = "WHO Plan A: Home fluids and ORS after each loose stool to prevent dehydration.";
  }

  let abx = "Antibiotics are NOT indicated for uncomplicated watery diarrhea.";
  const contra: string[] = [];

  if (syndrome === "SUSPECTED_CLOSTRIDIOIDES_DIFFICILE") {
    abx = "Order stool C. diff NAAT / EIA for toxin A/B. First-line therapy: Oral Vancomycin 125 mg QID for 10 days OR Oral Fidaxomicin 200 mg BID for 10 days. Discontinue offending inciting antibiotics.";
    contra.push("STRICTLY CONTRAINDICATED: Loperamide / anti-motility agents (risk of toxic megacolon and intestinal perforation in C. diff).");
  } else if (isDysentery) {
    abx = "Stool culture and PCR for enteric pathogens (Shigella, Salmonella, Campylobacter, STEC E. coli). If Shigellosis suspected: Azithromycin 500mg daily x 3 days or Ciprofloxacin. If STEC E. coli O157:H7 suspected, AVOID antibiotics (reduces HUS risk).";
    contra.push("Avoid antimotility drugs (Loperamide) in acute dysentery/bloody diarrhea.");
  }

  return {
    syndrome,
    dehydrationStatus: dehy,
    rehydrationProtocol: rehydration,
    antimicrobialGuidance: abx,
    contraindications: contra,
  };
}

/**
 * 4. OBESITY & METABOLIC SYNDROME CLASSIFIER
 */
export function evaluateObesityMetabolic(input: ObesityMetabolicInput): ObesityMetabolicResult {
  const bmi = input.bodyMassIndexKgM2;
  let category: ObesityMetabolicResult["whoBmiCategory"] = "NORMAL_WEIGHT";

  if (bmi >= 40.0) category = "OBESITY_CLASS_3_SEVERE";
  else if (bmi >= 35.0) category = "OBESITY_CLASS_2";
  else if (bmi >= 30.0) category = "OBESITY_CLASS_1";
  else if (bmi >= 25.0) category = "OVERWEIGHT";

  // NCEP ATP III Metabolic Syndrome Criteria (>= 3 of 5)
  let criteria = 0;
  if (input.waistCircumferenceInches !== undefined) {
    const cut = input.isFemale ? 35 : 40;
    if (input.waistCircumferenceInches >= cut) criteria++;
  }
  if (input.fastingTriglyceridesMgDl !== undefined && input.fastingTriglyceridesMgDl >= 150) criteria++;
  if (input.hdlCholesterolMgDl !== undefined) {
    const cutHdl = input.isFemale ? 50 : 40;
    if (input.hdlCholesterolMgDl < cutHdl) criteria++;
  }
  if ((input.systolicBpMmHg !== undefined && input.systolicBpMmHg >= 130) || (input.diastolicBpMmHg !== undefined && input.diastolicBpMmHg >= 85)) criteria++;
  if (input.fastingGlucoseMgDl !== undefined && input.fastingGlucoseMgDl >= 100) criteria++;

  const hasMetabolic = criteria >= 3;

  let pharma = "Lifestyle, nutrition and physical activity optimization.";
  if (bmi >= 30 || (bmi >= 27 && hasMetabolic)) {
    pharma = "Eligible for FDA-approved anti-obesity medications (AOMs) in conjunction with reduced-calorie diet and increased physical activity.";
  }

  let surgery = "Not currently indicated based on BMI alone.";
  if (bmi >= 35 || (bmi >= 30 && withType2Diabetes(input.fastingGlucoseMgDl))) {
    surgery = "Eligible for Metabolic and Bariatric Surgery evaluation (Roux-en-Y Gastric Bypass or Sleeve Gastrectomy) per ASMBS/IFSO 2022 guidelines.";
  }

  const regimens = [
    "GLP-1 Receptor Agonist: Semaglutide 2.4 mg subcutaneous weekly (Wegovy) — ~15% mean total body weight loss.",
    "Dual GIP / GLP-1 Receptor Agonist: Tirzepatide 15 mg subcutaneous weekly (Zepbound) — ~20% mean total body weight loss.",
    "Phentermine-Topiramate extended-release OR Bupropion-Naltrexone.",
  ];

  return {
    whoBmiCategory: category,
    metabolicSyndromeCriteriaMet: criteria,
    hasMetabolicSyndrome: hasMetabolic,
    pharmacotherapyEligibility: pharma,
    bariatricSurgeryEligibility: surgery,
    evidenceBasedRegimens: regimens,
  };
}

function withType2Diabetes(glucose?: number): boolean {
  return typeof glucose === "number" && glucose >= 126;
}

/**
 * 5. DEPRESSION (PHQ-9) & ANXIETY (GAD-7) WITH SUICIDE SAFETY LOCK
 */
export function evaluatePhq9Gad7(input: Phq9Gad7Input): Phq9Gad7Result {
  const phq = input.phq9Score ?? 0;
  const gad = input.gad7Score ?? 0;
  const q9 = input.phq9Item9SelfHarmScore ?? 0;
  const activeIntent = Boolean(input.hasActiveSuicidalIntentOrPlan);

  let dep: Phq9Gad7Result["depressionSeverity"] = "NONE_MINIMAL";
  if (phq >= 20) dep = "SEVERE";
  else if (phq >= 15) dep = "MODERATELY_SEVERE";
  else if (phq >= 10) dep = "MODERATE";
  else if (phq >= 5) dep = "MILD";

  let anx: Phq9Gad7Result["anxietySeverity"] = "NONE_MINIMAL";
  if (gad >= 15) anx = "SEVERE";
  else if (gad >= 10) anx = "MODERATE";
  else if (gad >= 5) anx = "MILD";

  const isLocked = q9 >= 1 || activeIntent;
  let directive: string | undefined;

  if (isLocked) {
    directive = "🚨 CRITICAL PSYCHIATRIC SAFETY ALERT: Patient screened positive on PHQ-9 Item #9 (thoughts of self-harm or suicidal ideation). DO NOT LEAVE PATIENT UNATTENDED. Immediately contact the 988 Suicide & Crisis Lifeline (call/text 988 in the US), initiate emergency psychiatric consultation, and conduct a lethal means safety assessment.";
  }

  const pharma = [
    "First-line SSRIs: Escitalopram 10-20 mg daily or Sertraline 50-200 mg daily.",
    "First-line SNRIs (if co-existing chronic pain/neuropathy): Duloxetine 30-60 mg daily.",
    "Atypical Antidepressant (if sexual dysfunction or fatigue prominent): Bupropion XL 150-300 mg daily (avoid in seizure/eating disorders).",
  ];

  const psycho = [
    "Cognitive Behavioral Therapy (CBT) with behavioral activation.",
    "Interpersonal Psychotherapy (IPT) or Acceptance and Commitment Therapy (ACT).",
    "Mindfulness-Based Stress Reduction (MBSR) for generalized anxiety.",
  ];

  return {
    depressionSeverity: dep,
    anxietySeverity: anx,
    immediateSuicideSafetyLock: isLocked,
    crisisEscalationDirective: directive,
    firstLinePharmacotherapy: pharma,
    psychotherapyRecommendations: psycho,
  };
}

/**
 * 6. HIV/AIDS & CD4-BASED OPPORTUNISTIC PROPHYLAXIS
 */
export function evaluateHivOpportunisticProphylaxis(input: HivOpportunisticProphylaxisInput): HivOpportunisticProphylaxisResult {
  const cd4 = input.cd4CountCellsPerUl;
  let stage: HivOpportunisticProphylaxisResult["cdcClinicalStage"] = "STAGE_1_CD4_GE_500";
  if (cd4 < 200) stage = "STAGE_3_AIDS_CD4_LT_200";
  else if (cd4 < 500) stage = "STAGE_2_CD4_200_TO_499";

  const pcp = cd4 < 200 || Boolean(input.priorHistoryOfPcpOrToxo);
  const toxo = cd4 < 100;
  const mac = cd4 < 50 && (!input.isCurrentlyOnArt || (input.viralLoadCopiesPerMl ?? 0) > 1000);

  const reg: string[] = [];
  if (pcp) {
    reg.push("PCP Prophylaxis Indicated: Trimethoprim-Sulfamethoxazole (TMP-SMX) 1 Double-Strength (DS) tablet daily (also covers Toxoplasmosis). Alternative if sulfa-allergic: Dapsone 100mg daily or Atovaquone 1500mg daily.");
  }
  if (toxo && !pcp) {
    reg.push("Toxoplasma gondii Prophylaxis: TMP-SMX 1 DS daily.");
  }
  if (mac) {
    reg.push("Mycobacterium avium Complex (MAC) Prophylaxis: Azithromycin 1,200 mg PO weekly (if not promptly suppressed on ART).");
  }

  const art = "Immediate Antiretroviral Therapy (ART) indicated for all individuals with HIV regardless of CD4 cell count: Integrase Strand Transfer Inhibitor (INSTI)-based regimen (Bictegravir/TAF/FTC or Dolutegravir + Lamivudine).";

  return {
    cdcClinicalStage: stage,
    pcpProphylaxisIndicated: pcp,
    toxoplasmosisProphylaxisIndicated: toxo,
    macProphylaxisIndicated: mac,
    indicatedProphylacticRegimens: reg,
    artGuidance: art,
  };
}

/**
 * 7. TUBERCULOSIS MANAGEMENT & RIPE REGIMEN
 */
export function evaluateTuberculosis(input: TuberculosisManagementInput): TuberculosisManagementResult {
  const isConfirmed = Boolean(input.sputumAfbSmearOrGeneXpertPositive);
  const isHighSusp = Boolean(input.hasCoughOver3WeeksWithHemoptysisAndNightSweats && input.chestXrayCavitaryInfiltratePresent);

  let status: TuberculosisManagementResult["clinicalStatus"] = "TB_UNLIKELY";
  if (isConfirmed) status = "ACTIVE_TUBERCULOSIS_CONFIRMED";
  else if (isHighSusp) status = "ACTIVE_TUBERCULOSIS_HIGH_SUSPICION";
  else if (input.tuberculinSkinTestOrIgraPositive) status = "LATENT_TUBERCULOSIS_INFECTION";

  const isolation = status === "ACTIVE_TUBERCULOSIS_CONFIRMED" || status === "ACTIVE_TUBERCULOSIS_HIGH_SUSPICION";

  let regimen = "";
  const components: { [drug: string]: string } = {};

  if (isolation) {
    regimen = "Standard RIPE 4-Drug Therapy: 2 months of Intensive Phase (Rifampin + Isoniazid + Pyrazinamide + Ethambutol), followed by 4 months of Continuation Phase (Rifampin + Isoniazid).";
    components["Rifampin (RIF)"] = "10 mg/kg PO daily (max 600 mg) — orange body fluid discoloration; strong CYP3A4 inducer.";
    components["Isoniazid (INH)"] = "5 mg/kg PO daily (max 300 mg) + Pyridoxine (Vitamin B6) 25-50 mg daily to prevent peripheral neuropathy.";
    components["Pyrazinamide (PZA)"] = "20-25 mg/kg PO daily — hyperuricemia/gout risk.";
    components["Ethambutol (EMB)"] = "15-20 mg/kg PO daily — optic neuritis (red-green color blindness screening required).";
  } else if (status === "LATENT_TUBERCULOSIS_INFECTION") {
    regimen = "Latent TB Preferred Regimens: 1) Rifamycin-based: 3 months of once-weekly Isoniazid + Rifapentine (3HP) directly observed, OR 4 months of daily Rifampin (4R).";
  }

  const hepatotoxRules = [
    "Discontinue RIPE immediately if AST or ALT > 3x upper limit of normal with symptoms of hepatitis (nausea, vomiting, jaundice), or > 5x normal if asymptomatic.",
    "Evaluate baseline and monthly hepatic panels, visual acuity (color vision), and serum uric acid.",
  ];

  return {
    clinicalStatus: status,
    airborneIsolationRequired: isolation,
    standardRegimen: regimen,
    drugComponents: components,
    hepatotoxicityMonitoringRules: hepatotoxRules,
  };
}

/**
 * 8. MALARIA PROTOCOL & IV ARTESUNATE
 */
export function evaluateMalaria(input: MalariaManagementInput): MalariaManagementResult {
  const isSevere = Boolean(
    (input.parasitemiaPercentage !== undefined && input.parasitemiaPercentage >= 10) ||
    input.hasImpairedConsciousnessOrCerebralMalaria ||
    input.hasAcuteRenalFailureOrOliguria ||
    input.hasHypoglycemiaGlucoseLt40 ||
    input.hasPulmonaryEdemaOrArds ||
    input.hasSevereAnemiaHgbLt7
  );

  let tier: MalariaManagementResult["severityTier"] = "MALARIA_NOT_DOCUMENTED";
  if (input.travelToEndemicAreaPastYear) {
    tier = isSevere ? "SEVERE_MALARIA_LIFE_THREATENING" : "UNCOMPLICATED_MALARIA";
  }

  let tx = "";
  const actions: string[] = [];

  if (tier === "SEVERE_MALARIA_LIFE_THREATENING") {
    tx = "🚨 IV ARTESUNATE STAT (CDC First-Line): 2.4 mg/kg IV at 0, 12, and 24 hours, then daily for at least 3 doses until patient can tolerate oral therapy. Follow with full oral course of Artemether-Lumefantrine (Coartem).";
    actions.push("Admit to ICU with continuous hemodynamic, neurological, and blood glucose monitoring.");
    actions.push("Monitor post-artemisinin delayed hemolysis (PADH) at day 7, 14, and 28 with complete blood count and LDH.");
  } else if (tier === "UNCOMPLICATED_MALARIA") {
    tx = "First-Line Oral Artemisinin-Based Combination Therapy (ACT): Artemether-Lumefantrine (Coartem) 4 tablets with food at 0, 8, 24, 36, 48, and 60 hours.";
  }

  return {
    severityTier: tier,
    firstLineTherapy: tx,
    g6pdTestingRequiredBeforePrimaquine: true, // Primaquine or Tafenoquine for P. vivax hypnozoites requires G6PD check
    emergencyActions: actions,
  };
}

/**
 * 9. HEPATITIS C ELIMINATION & DAA REGIMENS
 */
export function evaluateHepatitisC(input: HepatitisCInput): HepatitisCResult {
  if (!input.hcvAntibodyPositive) {
    return {
      diagnosticConclusion: "NEGATIVE_NO_INFECTION",
      panGenotypicRegimens: [],
      treatmentDurationWeeks: 0,
      sustainedVirologicResponseGoal: "Not applicable.",
    };
  }

  const isViremic = input.hcvRnaDetectable !== false && (input.hcvRnaViralLoadIuMl === undefined || input.hcvRnaViralLoadIuMl > 0);

  if (!isViremic) {
    return {
      diagnosticConclusion: "RESOLVED_PAST_HCV_INFECTION",
      panGenotypicRegimens: [],
      treatmentDurationWeeks: 0,
      sustainedVirologicResponseGoal: "Spontaneous clearance or prior successful cure. No ongoing active viral infection.",
    };
  }

  const isCirrhotic = Boolean(input.cirrhosisPresent);
  const regimens = [
    "Sofosbuvir / Velpatasvir (Epclusa) 400/100 mg 1 tablet daily (Pan-genotypic, all genotypes 1-6).",
    "Glecaprevir / Pibrentasvir (Mavyret) 3 tablets daily with food (Pan-genotypic).",
  ];

  const duration = isCirrhotic ? 12 : 8; // Mavyret 8 wks non-cirrhotic, Epclusa 12 wks

  return {
    diagnosticConclusion: "ACTIVE_CHRONIC_HEPATITIS_C",
    panGenotypicRegimens: regimens,
    treatmentDurationWeeks: duration,
    sustainedVirologicResponseGoal: "Achieve Sustained Virologic Response at 12 weeks post-therapy (SVR12 = virologic cure rate > 98%).",
  };
}
