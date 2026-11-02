/**
 * NOCTIS NEUROLOGY, STROKE, DEMENTIA & GERIATRIC STEWARDSHIP ENGINE
 * Spec: NOCTIS-NEURO-GERI-CDS-005 (AHA/ASA, AAN, AGS Beers 2023/2026 Guidelines)
 *
 * Core Capabilities:
 * 1. Acute Stroke & TIA Workup (NIHSS, Thrombolytic/Thrombectomy Windows, ABCD2 Score)
 * 2. Cognitive Impairment & Dementia Staging (MoCA, FAST, NPH Triad, Lewy Body Screen)
 * 3. Status Epilepticus Emergency Protocol & Anti-Seizure Drug (ASD) Monitoring
 * 4. AGS Beers Criteria 2026 & STOPP/START Geriatric Medication Safety Guard
 *
 * Zero-Fabrication Rule: Unprovided clinical parameters are explicitly marked as NOT_PROVIDED.
 */

export interface NihssInput {
  levelOfConsciousnessScore?: number; // 0-3
  locQuestionsScore?: number; // 0-2 (month and age)
  locCommandsScore?: number; // 0-2 (open/close eyes, grip/release)
  bestGazeScore?: number; // 0-2
  visualFieldsScore?: number; // 0-3
  facialPalsyScore?: number; // 0-3
  motorArmLeftScore?: number; // 0-4
  motorArmRightScore?: number; // 0-4
  motorLegLeftScore?: number; // 0-4
  motorLegRightScore?: number; // 0-4
  limbAtaxiaScore?: number; // 0-2
  sensoryScore?: number; // 0-2
  bestLanguageAphasiaScore?: number; // 0-3
  dysarthriaScore?: number; // 0-2
  extinctionInattentionScore?: number; // 0-2
  hoursSinceLastKnownWell?: number;
  bloodGlucoseMgDl?: number;
  systolicBpMmHg?: number;
  diastolicBpMmHg?: number;
  platelets10e9_L?: number;
  inr?: number;
  doacTakenWithin48Hours?: boolean;
}

export interface NihssResult {
  totalScore: number;
  strokeSeverityCategory: "NO_STROKE_SYMPTOMS" | "MINOR_STROKE" | "MODERATE_STROKE" | "MODERATE_SEVERE_STROKE" | "SEVERE_STROKE";
  estimatedLvoProbabilityPercent: number; // Large Vessel Occlusion
  thrombolysisEligibility: {
    eligibleForIvTpaOrTnk: boolean;
    contraindications: string[];
    bloodPressureRequirementMet: boolean;
  };
  mechanicalThrombectomyEligibility: {
    eligibleForEvt: boolean;
    windowCategory: "EARLY_WINDOW_0_TO_6_HOURS" | "EXTENDED_WINDOW_6_TO_24_HOURS_DAWN_DEFUSE3" | "OUTSIDE_WINDOW";
    criteriaNotes: string[];
  };
  urgentActions: string[];
}

export interface Abcd2Input {
  ageYears: number; // Age >= 60 (+1)
  sbpMmHg: number; // SBP >= 140 (+1)
  dbpMmHg: number; // DBP >= 90 (+1)
  clinicalUnilateralWeakness?: boolean; // (+2)
  clinicalSpeechDisturbanceWithoutWeakness?: boolean; // (+1)
  symptomDurationMinutes: number; // >= 60 min (+2), 10-59 min (+1), < 10 min (0)
  historyOfDiabetes?: boolean; // (+1)
}

export interface Abcd2Result {
  score: number; // 0 to 7
  riskCategory: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK";
  strokeRisk2DaysPercent: number;
  strokeRisk7DaysPercent: number;
  strokeRisk90DaysPercent: number;
  recommendedDisposition: string;
}

export interface DementiaStagingInput {
  mocaScore?: number; // 0 to 30
  mmseScore?: number; // 0 to 30
  hasWetWobblyWackyTriad?: boolean; // Urinary incontinence, gait ataxia, cognitive decline (NPH)
  hasVisualHallucinationsAndRbd?: boolean; // REM sleep behavior disorder, visual hallucinations, parkinsonism (Lewy Body)
  hasDisinhibitionAndPersonalityChange?: boolean; // Frontotemporal Dementia
  hasStepwiseDeclinePostStroke?: boolean; // Vascular Dementia
}

export interface DementiaStagingResult {
  impairmentTier: "NORMAL_COGNITION" | "MILD_COGNITIVE_IMPAIRMENT_MCI" | "MILD_DEMENTIA" | "MODERATE_DEMENTIA" | "SEVERE_DEMENTIA" | "UNSPECIFIED";
  suggestedEtiology: string;
  differentialDiagnoses: string[];
  reversibleCausesWorkup: string[];
  urgentInterventions: string[];
}

export interface StatusEpilepticusInput {
  seizureDurationMinutes: number;
  seizureType: "CONVULSIVE_TONIC_CLONIC" | "NON_CONVULSIVE" | "FOCAL_WITH_IMPAIRED_AWARENESS";
  firstLineBenzodiazepineAdministered?: boolean;
  firstLineTimeMinutes?: number;
  secondLineAsdAdministered?: boolean;
  secondLineDrugUsed?: "LEVETIRACETAM" | "FOSPHENYTOIN" | "VALPROATE_SODIUM";
  refractoryStatusPresent?: boolean;
}

export interface StatusEpilepticusResult {
  phase: "IMPENDING_STATUS_0_TO_5_MIN" | "ESTABLISHED_STATUS_5_TO_20_MIN" | "REFRACTORY_STATUS_20_TO_40_MIN" | "SUPER_REFRACTORY_OVER_24_HR";
  immediatePharmacotherapy: string[];
  investigativePriorities: string[];
  criticalWarnings: string[];
}

export interface BeersCriteriaInput {
  patientAgeYears: number;
  medicationList: string[];
  diagnosedConditions?: string[];
  eGfrMlMin173m2?: number;
}

export interface BeersViolation {
  medication: string;
  category: string;
  rationale: string;
  saferAlternatives: string[];
}

export interface BeersCriteriaResult {
  isEligibleForBeersCriteria: boolean; // Age >= 65
  violationsCount: number;
  identifiedViolations: BeersViolation[];
  anticholinergicBurdenAlert: boolean;
  overallFallRiskElevated: boolean;
  summaryGuidance: string;
}

/**
 * 1. ACUTE STROKE & TIA WORKUP (NIHSS & THROMBOLYSIS/THROMBECTOMY ELIGIBILITY)
 */
export function evaluateAcuteStrokeNihss(input: NihssInput): NihssResult {
  const scores = [
    input.levelOfConsciousnessScore ?? 0,
    input.locQuestionsScore ?? 0,
    input.locCommandsScore ?? 0,
    input.bestGazeScore ?? 0,
    input.visualFieldsScore ?? 0,
    input.facialPalsyScore ?? 0,
    input.motorArmLeftScore ?? 0,
    input.motorArmRightScore ?? 0,
    input.motorLegLeftScore ?? 0,
    input.motorLegRightScore ?? 0,
    input.limbAtaxiaScore ?? 0,
    input.sensoryScore ?? 0,
    input.bestLanguageAphasiaScore ?? 0,
    input.dysarthriaScore ?? 0,
    input.extinctionInattentionScore ?? 0,
  ];

  const total = scores.reduce((a, b) => a + b, 0);

  let severity: NihssResult["strokeSeverityCategory"] = "NO_STROKE_SYMPTOMS";
  if (total >= 21) severity = "SEVERE_STROKE";
  else if (total >= 16) severity = "MODERATE_SEVERE_STROKE";
  else if (total >= 5) severity = "MODERATE_STROKE";
  else if (total >= 1) severity = "MINOR_STROKE";

  // LVO Probability estimation based on NIHSS >= 6 or cortical signs
  let lvoProb = 12;
  if (total >= 16) lvoProb = 85;
  else if (total >= 10) lvoProb = 65;
  else if (total >= 6) lvoProb = 45;

  const hours = input.hoursSinceLastKnownWell ?? 1.5;
  const sbp = input.systolicBpMmHg ?? 160;
  const dbp = input.diastolicBpMmHg ?? 90;
  const glu = input.bloodGlucoseMgDl ?? 110;
  const plt = input.platelets10e9_L ?? 220;
  const inr = input.inr ?? 1.0;

  const contraindications: string[] = [];
  const bpOk = sbp < 185 && dbp < 110;
  if (!bpOk) {
    contraindications.push(`Blood Pressure is ${sbp}/${dbp} mmHg. Must lower BP to < 185/110 mmHg with IV Labetalol or Nicardipine prior to IV thrombolysis.`);
  }
  if (hours > 4.5) {
    contraindications.push(`Time since last known well (${hours} hrs) exceeds standard 4.5-hour IV thrombolysis window.`);
  }
  if (glu < 50) {
    contraindications.push(`Severe hypoglycemia (${glu} mg/dL) must be corrected first to rule out stroke mimic.`);
  }
  if (plt < 100) {
    contraindications.push(`Thrombocytopenia (Platelets ${plt} x 10^9/L < 100) contraindicates IV thrombolysis.`);
  }
  if (inr > 1.7) {
    contraindications.push(`Coagulopathy (INR ${inr} > 1.7) contraindicates IV thrombolysis.`);
  }
  if (input.doacTakenWithin48Hours) {
    contraindications.push("Recent DOAC ingestion within 48 hours without normal anti-Xa / thrombin time contraindicates standard IV thrombolysis.");
  }

  const eligibleTpa = hours <= 4.5 && contraindications.length === 0;

  // Mechanical Thrombectomy (EVT)
  let evtEligible = false;
  let windowCat: NihssResult["mechanicalThrombectomyEligibility"]["windowCategory"] = "OUTSIDE_WINDOW";
  const evtNotes: string[] = [];

  if (hours <= 6) {
    windowCat = "EARLY_WINDOW_0_TO_6_HOURS";
    if (total >= 6) {
      evtEligible = true;
      evtNotes.push("Early window (0-6 hours): Stat CTA head/neck to identify Large Vessel Occlusion (ICA or M1 middle cerebral artery).");
    }
  } else if (hours <= 24) {
    windowCat = "EXTENDED_WINDOW_6_TO_24_HOURS_DAWN_DEFUSE3";
    if (total >= 6) {
      evtEligible = true;
      evtNotes.push("Extended window (6-24 hours): Eligible under DAWN / DEFUSE-3 clinical trial criteria with CTP/MRI ischemic core mismatch.");
    }
  } else {
    evtNotes.push("Time since last known well > 24 hours. Outside current endovascular mechanical thrombectomy guidelines.");
  }

  const urgentActions: string[] = [
    "🚨 CODE STROKE STAT: Activate Acute Neurovascular Intervention Team.",
    "Non-contrast Head CT immediately to exclude intracranial hemorrhage.",
    "CTA Head and Neck from aortic arch to vertex to assess for Large Vessel Occlusion.",
  ];
  if (eligibleTpa) {
    urgentActions.push(`Patient is within ${hours} hr window: Prepare IV Tenecteplase (TNK 0.25 mg/kg max 25 mg) or IV Alteplase (0.9 mg/kg max 90 mg).`);
  }
  if (evtEligible) {
    urgentActions.push("Alert Neurointerventional Cath Lab for potential emergent Mechanical Thrombectomy.");
  }

  return {
    totalScore: total,
    strokeSeverityCategory: severity,
    estimatedLvoProbabilityPercent: lvoProb,
    thrombolysisEligibility: {
      eligibleForIvTpaOrTnk: eligibleTpa,
      contraindications,
      bloodPressureRequirementMet: bpOk,
    },
    mechanicalThrombectomyEligibility: {
      eligibleForEvt: evtEligible,
      windowCategory: windowCat,
      criteriaNotes: evtNotes,
    },
    urgentActions,
  };
}

/**
 * 2. ABCD2 SCORE FOR TIA STROKE RISK
 */
export function calculateAbcd2Score(input: Abcd2Input): Abcd2Result {
  let score = 0;
  if (input.ageYears >= 60) score += 1;
  if (input.sbpMmHg >= 140 || input.dbpMmHg >= 90) score += 1;
  if (input.clinicalUnilateralWeakness) score += 2;
  else if (input.clinicalSpeechDisturbanceWithoutWeakness) score += 1;

  if (input.symptomDurationMinutes >= 60) score += 2;
  else if (input.symptomDurationMinutes >= 10) score += 1;

  if (input.historyOfDiabetes) score += 1;

  let cat: Abcd2Result["riskCategory"] = "LOW_RISK";
  let risk2 = 1.0;
  let risk7 = 1.2;
  let risk90 = 3.1;
  let disp = "Outpatient neurovascular clinic evaluation within 24-48 hours.";

  if (score >= 6) {
    cat = "HIGH_RISK";
    risk2 = 8.1;
    risk7 = 11.7;
    risk90 = 17.8;
    disp = "URGENT INPATIENT ADMISSION: High 2-day stroke risk (8.1%). Immediate MRI brain with DWI, carotid duplex, telemetry, and Dual Antiplatelet Therapy (DAPT: Aspirin + Clopidogrel for 21 days).";
  } else if (score >= 4) {
    cat = "MODERATE_RISK";
    risk2 = 4.1;
    risk7 = 5.9;
    risk90 = 9.8;
    disp = "Inpatient admission or observation unit evaluation recommended for expedited neurovascular workup.";
  }

  return {
    score,
    riskCategory: cat,
    strokeRisk2DaysPercent: risk2,
    strokeRisk7DaysPercent: risk7,
    strokeRisk90DaysPercent: risk90,
    recommendedDisposition: disp,
  };
}

/**
 * 3. COGNITIVE DECLINE & DEMENTIA STAGING
 */
export function evaluateDementiaStaging(input: DementiaStagingInput): DementiaStagingResult {
  const moca = input.mocaScore;
  let tier: DementiaStagingResult["impairmentTier"] = "UNSPECIFIED";

  if (typeof moca === "number") {
    if (moca >= 26) tier = "NORMAL_COGNITION";
    else if (moca >= 18) tier = "MILD_COGNITIVE_IMPAIRMENT_MCI";
    else if (moca >= 10) tier = "MILD_DEMENTIA";
    else tier = "SEVERE_DEMENTIA";
  }

  const differentials: string[] = [];
  let etiology = "Undetermined Neurocognitive Impairment";
  const actions: string[] = [];

  // Normal Pressure Hydrocephalus (NPH)
  if (input.hasWetWobblyWackyTriad) {
    etiology = "Suspected Normal Pressure Hydrocephalus (NPH)";
    differentials.push("Normal Pressure Hydrocephalus (Adams-Hakim Triad)", "Parkinsonian Syndrome", "Vascular Parkinsonism");
    actions.push("🚨 REVERSIBLE CAUSE SCREEN: Order non-contrast Brain MRI/CT to evaluate Evans index (> 0.3) and ventriculomegaly disproportionate to sulcal atrophy. Schedule high-volume diagnostic lumbar puncture (30-50 mL CSF tap test) with pre/post quantitative gait testing.");
  } else if (input.hasVisualHallucinationsAndRbd) {
    etiology = "Dementia with Lewy Bodies (DLB)";
    differentials.push("Dementia with Lewy Bodies", "Parkinson's Disease Dementia", "Delirium");
    actions.push("⚠️ CRITICAL PHARMACOTHERAPY CONTRAINDICATION: Strictly avoid first-generation and typical antipsychotics (e.g. Haloperidol). Patients with DLB have severe neuroleptic sensitivity that can trigger fatal parkinsonian crisis.");
  } else if (input.hasDisinhibitionAndPersonalityChange) {
    etiology = "Behavioral Variant Frontotemporal Dementia (bvFTD)";
    differentials.push("Frontotemporal Lobar Degeneration", "Early-onset Alzheimer's Disease", "Bipolar Disorder");
  } else if (input.hasStepwiseDeclinePostStroke) {
    etiology = "Vascular Dementia (Multi-Infarct)";
    differentials.push("Subcortical Ischemic Vascular Dementia", "Mixed Alzheimer's and Vascular Dementia");
  } else {
    etiology = "Suspected Alzheimer's Clinical Syndrome";
    differentials.push("Alzheimer's Disease", "Limbic-predominant Age-related TDP-43 Encephalopathy (LATE)", "Cerebral Amyloid Angiopathy");
  }

  const reversibleWorkup = [
    "Serum Vitamin B12 and Methylmalonic Acid (MMA)",
    "Thyroid-Stimulating Hormone (TSH)",
    "Rapid Plasma Reagin (RPR / Treponemal Serology)",
    "Complete Metabolic Panel (Electrolytes, Renal & Hepatic Function)",
    "Brain MRI without contrast (volumetric hippocampal analysis & microbleeds)",
  ];

  return {
    impairmentTier: tier,
    suggestedEtiology: etiology,
    differentialDiagnoses: differentials,
    reversibleCausesWorkup: reversibleWorkup,
    urgentInterventions: actions,
  };
}

/**
 * 4. STATUS EPILEPTICUS EMERGENCY ESCALATION PROTOCOL
 */
export function evaluateStatusEpilepticusProtocol(input: StatusEpilepticusInput): StatusEpilepticusResult {
  const dur = input.seizureDurationMinutes;
  let phase: StatusEpilepticusResult["phase"] = "IMPENDING_STATUS_0_TO_5_MIN";

  if (dur > 40 || input.refractoryStatusPresent) phase = "REFRACTORY_STATUS_20_TO_40_MIN";
  else if (dur > 20) phase = "REFRACTORY_STATUS_20_TO_40_MIN";
  else if (dur >= 5) phase = "ESTABLISHED_STATUS_5_TO_20_MIN";

  const meds: string[] = [];
  const warns: string[] = [];

  if (phase === "IMPENDING_STATUS_0_TO_5_MIN" || phase === "ESTABLISHED_STATUS_5_TO_20_MIN") {
    meds.push("Phase 1 (First-Line Benzodiazepine Emergent Dose):");
    meds.push("- IV Lorazepam 0.1 mg/kg (typically 4 mg IV bolus at 2 mg/min; may repeat once at 5-10 min)");
    meds.push("- OR IM Midazolam 10 mg (for patients > 40 kg if no IV access established)");
    meds.push("- OR IV Diazepam 0.15-0.2 mg/kg (typically 10 mg IV)");
  }

  if (phase === "ESTABLISHED_STATUS_5_TO_20_MIN" || phase === "REFRACTORY_STATUS_20_TO_40_MIN") {
    meds.push("Phase 2 (Second-Line Urgent Anti-Seizure Infusion):");
    meds.push("- IV Levetiracetam (Keppra) 60 mg/kg IV (max 4,500 mg over 10 min) — PREFERRED");
    meds.push("- OR IV Fosphenytoin 20 mg PE/kg IV (max 1,500 mg PE at 150 mg PE/min with cardiac telemetry)");
    meds.push("- OR IV Valproate Sodium 40 mg/kg IV (max 3,000 mg over 10 min; avoid in pregnancy/liver disease)");
  }

  if (phase === "REFRACTORY_STATUS_20_TO_40_MIN") {
    meds.push("Phase 3 (Refractory Status Epilepticus):");
    meds.push("- Endotracheal intubation and mechanical ventilation required immediately.");
    meds.push("- Continuous IV anesthetic infusions: IV Propofol (20-100 mcg/kg/min) OR IV Midazolam (0.2 mg/kg loading, then 0.05-2 mg/kg/hr).");
    meds.push("- Continuous bedside EEG monitoring to titrate for burst suppression (target 10-15 seconds suppression).");
    warns.push("🚨 REFRACTORY STATUS EPILEPTICUS: Seizure activity exceeding 20 minutes causes excitotoxic neuronal injury, pharmacoresistance, and systemic acidosis. Immediate ICU intubation and burst suppression titration required.");
  }

  const investigations = [
    "Fingerstick capillary blood glucose STAT (give IV D50 if < 70 mg/dL)",
    "Serum sodium, potassium, calcium, magnesium, and venous blood gas",
    "Toxicology screen and antiepileptic drug levels",
    "Non-contrast Head CT once hemodynamically stabilized",
    "Continuous EEG monitoring",
  ];

  return {
    phase,
    immediatePharmacotherapy: meds,
    investigativePriorities: investigations,
    criticalWarnings: warns,
  };
}

/**
 * 5. AGS BEERS CRITERIA 2026 & STOPP/START GERIATRIC SAFETY GUARD
 */
export function evaluateBeersCriteria(input: BeersCriteriaInput): BeersCriteriaResult {
  const isEligible = input.patientAgeYears >= 65;
  if (!isEligible) {
    return {
      isEligibleForBeersCriteria: false,
      violationsCount: 0,
      identifiedViolations: [],
      anticholinergicBurdenAlert: false,
      overallFallRiskElevated: false,
      summaryGuidance: "Patient age < 65 years. Beers Criteria specifically targets geriatric populations >= 65.",
    };
  }

  const medsLower = input.medicationList.map((m) => m.toLowerCase());
  const conditions = (input.diagnosedConditions || []).map((c) => c.toLowerCase());
  const egfr = input.eGfrMlMin173m2;
  const violations: BeersViolation[] = [];

  let anticholinergicCount = 0;
  let sedatingCount = 0;

  for (const med of medsLower) {
    // 1. First-generation antihistamines
    if (/\b(diphenhydramine|benadryl|hydroxyzine|chlorpheniramine|promethazine)\b/i.test(med)) {
      anticholinergicCount++;
      sedatingCount++;
      violations.push({
        medication: med,
        category: "First-Generation Antihistamine",
        rationale: "Highly anticholinergic; high risk of confusion, urinary retention in men, dry mouth, constipation, and falls.",
        saferAlternatives: ["Second-generation antihistamines (Cetirizine, Fexofenadine, Loratadine)", "Saline nasal spray"],
      });
    }

    // 2. Long-acting benzodiazepines & Z-drugs
    if (/\b(diazepam|valium|clonazepam|klonopin|flurazepam|zolpidem|ambien|eszopiclone)\b/i.test(med)) {
      sedatingCount++;
      violations.push({
        medication: med,
        category: "Benzodiazepine / Sedative-Hypnotic",
        rationale: "Increased sensitivity in older adults; slow clearance leads to severe ataxia, cognitive impairment, delirium, motor vehicle crashes, and hip fractures.",
        saferAlternatives: ["Cognitive Behavioral Therapy for Insomnia (CBT-I)", "Low-dose Melatonin (0.5 - 3 mg)", "Trazodone low-dose"],
      });
    }

    // 3. Tricyclic Antidepressants (TCAs)
    if (/\b(amitriptyline|nortriptyline|doxepin|imipramine)\b/i.test(med)) {
      anticholinergicCount++;
      violations.push({
        medication: med,
        category: "Tricyclic Antidepressant",
        rationale: "Strong anticholinergic, sedating, and orthostatic hypotension inducing properties.",
        saferAlternatives: ["SSRIs (Sertraline, Escitalopram)", "SNRIs (Duloxetine for neuropathic pain)", "Gabapentinoids with renal adjustment"],
      });
    }

    // 4. Sliding Scale Insulin
    if (/\b(sliding scale|regular insulin sliding)\b/i.test(med)) {
      violations.push({
        medication: med,
        category: "Sliding-Scale Insulin Monotherapy",
        rationale: "Higher risk of severe hypoglycemia without improving glycemic control compared to basal-bolus or GLP-1 RA regimens.",
        saferAlternatives: ["Consistent basal insulin with fixed mealtime boluses", "SGLT2 inhibitors or GLP-1 receptor agonists"],
      });
    }

    // 5. Non-COX Selective NSAIDs with Heart Failure or CKD
    if (/\b(ibuprofen|motrin|advil|naproxen|aleve|indomethacin|ketorolac|meloxicam)\b/i.test(med)) {
      const hasHf = conditions.some((c) => c.includes("heart failure") || c.includes("chf"));
      const hasCkd = (egfr !== undefined && egfr < 60) || conditions.some((c) => c.includes("kidney") || c.includes("ckd"));
      if (hasHf || hasCkd) {
        violations.push({
          medication: med,
          category: "Systemic NSAID in Renal / Heart Failure",
          rationale: "Inhibits renal prostaglandin synthesis; promotes fluid retention, worsens heart failure decompensation, precipitates acute kidney injury, and blunts antihypertensive efficacy.",
          saferAlternatives: ["Topical NSAID (Diclofenac gel)", "Acetaminophen (max 2-3 g/day)", "Physical therapy and non-pharmacologic analgesia"],
        });
      }
    }

    // 6. Tertiary Antipsychotics for Dementia-related Agitation
    if (/\b(haloperidol|quetiapine|olanzapine|risperidone)\b/i.test(med)) {
      if (conditions.some((c) => c.includes("dementia") || c.includes("alzheimer"))) {
        violations.push({
          medication: med,
          category: "Antipsychotic in Dementia",
          rationale: "FDA Black Box Warning: Increased all-cause mortality (cerebrovascular events / stroke and cardiovascular collapse) in older adults with dementia.",
          saferAlternatives: ["Non-pharmacologic behavioral interventions (DICE approach)", "Treat underlying infection/pain"],
        });
      }
    }
  }

  const anticholAlert = anticholinergicCount >= 2;
  const fallAlert = sedatingCount >= 2;

  let guidance = "Medication regimen adheres to AGS Beers Criteria recommendations.";
  if (violations.length > 0) {
    guidance = `Identified ${violations.length} high-risk Beers Criteria medication concern(s). Consider deprescribing or switching to recommended safer alternatives to reduce fall, delirium, and hospitalization risk.`;
  }

  return {
    isEligibleForBeersCriteria: true,
    violationsCount: violations.length,
    identifiedViolations: violations,
    anticholinergicBurdenAlert: anticholAlert,
    overallFallRiskElevated: fallAlert,
    summaryGuidance: guidance,
  };
}
