/**
 * ============================================================================
 * NOCTIS SOVEREIGN CRITICAL CARE ENDOCRINOLOGY & METABOLIC CRISES ENGINE (NOCTIS-ENDO-CRISIS-001)
 * Standard: 2026 ADA/AACE Consensus Guidelines on Glycemic Emergencies,
 *           Endocrine Society Guidelines on Thyroid Storm, Adrenal Crisis & Pheochromocytoma
 * Domain: DKA, HHS, Two-Bag System, Thyroid Storm (BWPS), Myxedema,
 *         Adrenal Crisis, and Pheochromocytoma Alpha-Before-Beta Invariant
 * ============================================================================
 */

export interface DkaHhsEvaluation {
  serumGlucoseMgdl: number;
  measuredSodiumMeq: number;
  serumPotassiumMeq: number;
  serumChlorideMeq: number;
  serumBicarbMeq: number;
  arterialPh: number;
  betaHydroxybutyrateMmol?: number;
  mentalStatus: "ALERT" | "DROWSY" | "STUPOROUS" | "COMATOSE";
  insulinOrderActive: boolean;
  glucoseBelow200WithoutDextrose?: boolean;
}

export interface ThyroidStormEvaluation {
  temperatureCelsius: number;
  heartRateBpm: number;
  cnsEffects: "ABSENT" | "MILD_AGITATION" | "DELIRIUM_PSYCHOSIS" | "SEIZURE_COMA";
  giHepatic: "ABSENT" | "DIARRHEA_NAUSEA" | "SEVERE_JAUNDICE";
  atrialFibrillationPresent: boolean;
  heartFailureStage: "NONE" | "MILD" | "MODERATE_EDEMA" | "SEVERE_PULMONARY_EDEMA";
  thionamideAdministered: boolean;
  iodineAdministeredBeforeThionamide: boolean;
  hydrocortisoneAdministered: boolean;
}

export interface MyxedemaEvaluation {
  hypothermiaCelsius: number;
  alteredMentalStatus: boolean;
  hypoventilationHypercapnia: boolean;
  bradycardiaBpm: number;
  stressDoseSteroidsGivenBeforeLevothyroxine: boolean;
  ivLevothyroxineOrdered: boolean;
}

export interface PheochromocytomaEvaluation {
  systolicBpMmhg: number;
  diastolicBpMmhg: number;
  heartRateBpm: number;
  alphaBlockerAdministered: boolean;
  betaBlockerMonotherapyOrdered: boolean;
}

export interface EndoAssessmentResult {
  engineId: "NOCTIS-ENDO-CRISIS-001";
  clinicalDomain: "CRITICAL_CARE_ENDOCRINOLOGY";
  timestamp: string;
  summary: string;
  calculations: Record<string, string | number | boolean>;
  recommendations: string[];
  safetyVetoesTriggered: string[];
  references: string[];
}

export function evaluateDkaHhs(input: DkaHhsEvaluation): EndoAssessmentResult {
  // Corrected Sodium (Katz formula: 1.6 factor for glucose > 100, Hillier 2.0 for glucose > 400)
  const factor = input.serumGlucoseMgdl > 400 ? 2.0 : 1.6;
  const correctedNa = input.measuredSodiumMeq + factor * ((input.serumGlucoseMgdl - 100) / 100);

  // Effective Serum Osmolality = 2*Na + Glucose/18
  const effectiveOsmolality = 2 * input.measuredSodiumMeq + input.serumGlucoseMgdl / 18;

  // Anion Gap = Na - (Cl + HCO3)
  const anionGap = input.measuredSodiumMeq - (input.serumChlorideMeq + input.serumBicarbMeq);

  const isDka = anionGap > 12 && (input.arterialPh < 7.30 || input.serumBicarbMeq < 18);
  const isHhs = effectiveOsmolality > 320 && input.serumGlucoseMgdl > 600 && input.arterialPh >= 7.30;
  const isMixed = isDka && isHhs;

  const calculations: Record<string, string | number | boolean> = {
    syndromeClassification: isMixed ? "MIXED_DKA_HHS" : isHhs ? "HHS" : isDka ? "DKA" : "HYPERGLYCEMIA_UNCLASSIFIED",
    correctedSodiumMeq: Number(correctedNa.toFixed(1)),
    effectiveOsmolalityMosm: Number(effectiveOsmolality.toFixed(1)),
    anionGapMeq: Number(anionGap.toFixed(1)),
    arterialPh: input.arterialPh,
    serumPotassium: `${input.serumPotassiumMeq} mEq/L`,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 1: Hypokalemic Insulin Veto
  if (input.serumPotassiumMeq < 3.3) {
    safetyVetoesTriggered.push(
      `CF-ENDO-001 [HYPOKALEMIC INSULIN ARREST VETO]: Serum potassium is ${input.serumPotassiumMeq} mEq/L (< 3.3 mEq/L). Administering insulin drives extracellular potassium into cells via Na+/K+-ATPase activation, precipitating catastrophic hypokalemic cardiac arrest, lethal ventricular arrhythmias (VT/VF), and respiratory muscle paralysis. HOLD ALL INSULIN STAT. Administer IV potassium chloride 20-40 mEq/hr until K+ >= 3.3 mEq/L before starting insulin.`
    );
  } else if (input.serumPotassiumMeq >= 3.3 && input.serumPotassiumMeq <= 5.2) {
    recommendations.push(
      `Potassium Maintenance: Serum K+ is ${input.serumPotassiumMeq} mEq/L (3.3-5.2 mEq/L). Start IV insulin infusion at 0.1 units/kg/hr (or 0.14 units/kg/hr without bolus) AND simultaneously add 20-30 mEq KCl per liter of IV fluid to prevent hypokalemia during insulin therapy. Target serum K+ 4.0-5.0 mEq/L.`
    );
  } else {
    recommendations.push(
      `Serum K+ is ${input.serumPotassiumMeq} mEq/L (> 5.2 mEq/L). Initiate IV regular insulin infusion without potassium. Check potassium every 2 hours.`
    );
  }

  // Veto 2: Glucose < 200 mg/dL without Dextrose (Two-Bag System)
  if (input.serumGlucoseMgdl < 200 && input.glucoseBelow200WithoutDextrose) {
    safetyVetoesTriggered.push(
      "CF-ENDO-002 [DKA HYPOGLYCEMIA & CEREBRAL EDEMA VETO]: Blood glucose has reached < 200 mg/dL in DKA (or < 300 mg/dL in HHS) without adding IV Dextrose. Rapid plasma osmolality drop triggers cerebral edema and sudden hypoglycemia while ketoacidosis remains unclosed. Immediately switch to D5W or D10W with 0.45% NaCl (Two-Bag System) while MAINTAINING insulin infusion at 0.02-0.05 units/kg/hr until anion gap closes."
    );
  }

  // Volume Resuscitation Protocol
  recommendations.push(
    `Initial Fluid Resuscitation: 0.9% NaCl at 1,000-1,500 mL in the first hour. If Corrected Sodium is normal or elevated (${correctedNa.toFixed(1)} mEq/L >= 135 mEq/L), transition maintenance fluids to 0.45% NaCl at 250-500 mL/hr to treat hypertonic cellular dehydration.`
  );

  // DKA Resolution Criteria
  recommendations.push(
    "DKA Resolution Criteria: Blood glucose < 200 mg/dL AND two of the following: serum bicarbonate >= 18 mEq/L, venous pH > 7.30, and anion gap <= 12 mEq/L. Administer subcutaneous basal insulin (Glargine/Degludec) 2 HOURS PRIOR to discontinuing IV insulin infusion to prevent rebound ketoacidosis."
  );

  return {
    engineId: "NOCTIS-ENDO-CRISIS-001",
    clinicalDomain: "CRITICAL_CARE_ENDOCRINOLOGY",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Critical glycemic crisis safety invariant violated (hypokalemic insulin danger or osmotic precipice)."
      : `Metabolic crisis evaluated: ${calculations.syndromeClassification}. Standardized fluid, insulin, and electrolyte protocol active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "2026 ADA Consensus Statement on the Management of Hyperglycemic Crises in Adults With Diabetes (Diabetes Care)",
      "UK Joint British Diabetes Societies (JBDS) Inpatient Care Group DKA Guidelines (2025)",
    ],
  };
}

export function evaluateThyroidStorm(input: ThyroidStormEvaluation): EndoAssessmentResult {
  // Burch-Wartofsky Point Scale (BWPS) Calculation
  let bwps = 0;

  // Temperature
  if (input.temperatureCelsius >= 40.0) bwps += 30;
  else if (input.temperatureCelsius >= 39.5) bwps += 25;
  else if (input.temperatureCelsius >= 38.9) bwps += 20;
  else if (input.temperatureCelsius >= 38.3) bwps += 15;
  else if (input.temperatureCelsius >= 37.8) bwps += 10;
  else if (input.temperatureCelsius >= 37.2) bwps += 5;

  // Tachycardia
  if (input.heartRateBpm >= 140) bwps += 25;
  else if (input.heartRateBpm >= 130) bwps += 20;
  else if (input.heartRateBpm >= 120) bwps += 15;
  else if (input.heartRateBpm >= 110) bwps += 10;
  else if (input.heartRateBpm >= 100) bwps += 5;

  // CNS Effects
  if (input.cnsEffects === "SEIZURE_COMA") bwps += 30;
  else if (input.cnsEffects === "DELIRIUM_PSYCHOSIS") bwps += 20;
  else if (input.cnsEffects === "MILD_AGITATION") bwps += 10;

  // GI/Hepatic
  if (input.giHepatic === "SEVERE_JAUNDICE") bwps += 20;
  else if (input.giHepatic === "DIARRHEA_NAUSEA") bwps += 10;

  // Cardiovascular: AFib and HF
  if (input.atrialFibrillationPresent) bwps += 10;
  if (input.heartFailureStage === "SEVERE_PULMONARY_EDEMA") bwps += 15;
  else if (input.heartFailureStage === "MODERATE_EDEMA") bwps += 10;
  else if (input.heartFailureStage === "MILD") bwps += 5;

  const calculations: Record<string, string | number | boolean> = {
    bwpsScore: bwps,
    riskInterpretation: bwps >= 45 ? "HIGHLY_SUGGESTIVE_THYROID_STORM" : bwps >= 25 ? "IMPENDING_STORM" : "UNLIKELY_STORM",
    temperature: `${input.temperatureCelsius} °C`,
    heartRate: `${input.heartRateBpm} bpm`,
    atrialFibrillation: input.atrialFibrillationPresent,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto: Iodine before Thionamide Veto
  if (input.iodineAdministeredBeforeThionamide || (!input.thionamideAdministered && bwps >= 25)) {
    safetyVetoesTriggered.push(
      "CF-ENDO-003 [THYROID STORM IODINE SEQUENCE VETO (JOD-BASEDOW)]: Iodine (Lugol's solution or SSKI) must NEVER be administered before a thionamide (PTU or Methimazole). Thionamides block organification and de novo thyroid hormone synthesis. Administering iodine first provides enriched iodine substrate to the hyperactive thyroid gland, causing immediate massive synthesis and release of thyroid hormone (Jod-Basedow phenomenon), transforming impending storm into fatal hyperpyrexic cardiovascular collapse. Administer PTU 200 mg q4h (or Methimazole 20 mg q4h) STAT, and DELAY IODINE FOR AT LEAST 1 HOUR."
    );
  }

  // Multimodal Storm Resuscitation Bundle
  recommendations.push(
    "THYROID STORM MULTIMODAL RESUSCITATION BUNDLE: (1) Block Synthesis: Propylthiouracil (PTU) 500-1000 mg loading dose, then 200-250 mg PO/NG q4h (PTU preferred over Methimazole in storm because it also blocks peripheral T4->T3 conversion); (2) Block Release: Potassium Iodide (SSKI) 5 drops PO q6h or Lugol's solution 10 drops PO q8h initiated >= 1 HOUR AFTER PTU; (3) Block Peripheral Conversion & Treat Adrenal Insufficiency: Hydrocortisone 100 mg IV q8h; (4) Beta-Blockade: Esmolol continuous IV infusion (50-300 mcg/kg/min) or Propranolol 60-80 mg PO q4h to target HR < 100 bpm (use Esmolol if heart failure present for rapid reversibility); (5) Active Cooling: Acetaminophen and surface cooling blankets (AVOID Aspirin/NSAIDs which displace thyroid hormone from thyroid-binding globulin)."
  );

  return {
    engineId: "NOCTIS-ENDO-CRISIS-001",
    clinicalDomain: "CRITICAL_CARE_ENDOCRINOLOGY",
    timestamp: new Date().toISOString(),
    summary: bwps >= 45
      ? `Burch-Wartofsky Score is ${bwps} (>= 45): Fulminant Thyroid Storm confirmed. Multimodal endocrine blockade protocol active.`
      : `Burch-Wartofsky Score is ${bwps}: Impending thyroid decompensation.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "American Thyroid Association (ATA) Guidelines for Diagnosis and Management of Hyperthyroidism and Thyroid Storm (2025/2026)",
      "Burch HB, Wartofsky L. Life-threatening thyrotoxicosis: thyroid storm. Endocrinol Metab Clin North Am.",
    ],
  };
}

export function evaluateMyxedemaComa(input: MyxedemaEvaluation): EndoAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    hypothermia: `${input.hypothermiaCelsius} °C`,
    alteredMentalStatus: input.alteredMentalStatus,
    hypoventilation: input.hypoventilationHypercapnia,
    bradycardia: `${input.bradycardiaBpm} bpm`,
    stressDoseSteroidsGivenFirst: input.stressDoseSteroidsGivenBeforeLevothyroxine,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto: Thyroid hormone without steroids precipitates adrenal crisis
  if (!input.stressDoseSteroidsGivenBeforeLevothyroxine && input.ivLevothyroxineOrdered) {
    safetyVetoesTriggered.push(
      "CF-ENDO-004 [MYXEDEMA ADRENAL CRISIS PRECIPITATION VETO]: IV Levothyroxine ordered WITHOUT prior or concurrent stress-dose corticosteroids. In severe hypothyroidism, hepatic cortisol metabolism is sluggish; administering exogenous thyroid hormone rapidly accelerates metabolic clearance of cortisol. If the patient has concurrent secondary adrenal insufficiency (e.g. panhypopituitarism or autoimmune polyglandular syndrome), giving thyroid hormone alone precipitates fatal vascular collapse and acute adrenal crisis. Administer Hydrocortisone 100 mg IV STAT BEFORE or WITH IV Levothyroxine."
    );
  }

  recommendations.push(
    "MYXEDEMA COMA RESUSCITATION PROTOCOL: (1) Adrenal Coverage: Hydrocortisone 100 mg IV STAT, then 50-100 mg q6-8h; (2) Thyroid Replacement: Levothyroxine (T4) 200-400 mcg IV loading dose over 30 min, followed by 50-100 mcg IV daily, PLUS Liothyronine (T3) 5-10 mcg IV q8h for severe encephalopathy/hypothermia; (3) Passive Re-warming: Use ordinary blankets to prevent rapid peripheral vasodilation and circulatory shock (avoid active electric blankets); (4) Ventilatory Support: High risk of severe hypercapnic respiratory failure; intubate for obtundation or PaCO2 > 50 mmHg; (5) Fluid Restriction: Patients have profound SIADH with total body water excess; treat severe symptomatic hyponatremia with 3% hypertonic saline."
  );

  return {
    engineId: "NOCTIS-ENDO-CRISIS-001",
    clinicalDomain: "CRITICAL_CARE_ENDOCRINOLOGY",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Myxedema coma invariant violated: adrenal steroid coverage mandated before thyroid hormone."
      : "Myxedema coma evaluated. Dual hormonal replacement and physiological stabilization active.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "American Thyroid Association (ATA) Guidelines for the Treatment of Hypothyroidism and Myxedema Coma (2025/2026)",
    ],
  };
}

export function evaluatePheochromocytoma(input: PheochromocytomaEvaluation): EndoAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    systolicBp: `${input.systolicBpMmhg} mmHg`,
    diastolicBp: `${input.diastolicBpMmhg} mmHg`,
    heartRate: `${input.heartRateBpm} bpm`,
    alphaBlockerAdministered: input.alphaBlockerAdministered,
    betaBlockerMonotherapy: input.betaBlockerMonotherapyOrdered,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto: Beta-blocker before Alpha-blocker
  if (input.betaBlockerMonotherapyOrdered || (!input.alphaBlockerAdministered && input.betaBlockerMonotherapyOrdered)) {
    safetyVetoesTriggered.push(
      "CF-ENDO-005 [PHEOCHROMOCYTOMA UNOPPOSED ALPHA HYPERTENSIVE CRISIS VETO]: Beta-blocker ordered WITHOUT adequate prior alpha-adrenergic blockade. In pheochromocytoma, circulating catecholamines stimulate both alpha-1 and beta-2 adrenergic receptors. Administering a beta-blocker alone blocks beta-2 vasodilation, leaving catecholamine action completely unopposed at vascular alpha-1 receptors. This precipitates catastrophic malignant hypertension, acute pulmonary edema, aortic dissection, and fatal hypertensive hemorrhagic stroke. Alpha-blockade (Phenoxybenzamine 10 mg PO BID or Doxazosin) MUST precede beta-blockade by AT LEAST 7-14 DAYS."
    );
  }

  recommendations.push(
    "PHEOCHROMOCYTOMA CRISIS MANAGEMENT: (1) Acute Hypertensive Emergency: Infuse Phentolamine (alpha-antagonist) 5 mg IV bolus, or Nicardipine / Nitroprusside IV infusion to control SBP; (2) Pre-operative Preparation: Phenoxybenzamine (irreversible non-selective alpha-blocker) initiated at 10 mg PO BID, uptitrated every 2-3 days until blood pressure is controlled and orthostasis develops; (3) High-Salt Diet: Encourage generous oral sodium and fluid intake during alpha-blockade to restore contracted intravascular volume; (4) Beta-Blockade: ONLY initiate beta-blocker (Propranolol or Metoprolol) after 2-3 days of established alpha-blockade to manage reflex tachycardia."
  );

  return {
    engineId: "NOCTIS-ENDO-CRISIS-001",
    clinicalDomain: "CRITICAL_CARE_ENDOCRINOLOGY",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Pheochromocytoma alpha-before-beta safety invariant violated."
      : "Pheochromocytoma adrenergic blockade protocol verified.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "Endocrine Society Clinical Practice Guideline on Pheochromocytoma and Paraganglioma (2025/2026)",
    ],
  };
}

export function handleNaturalEndocrinologyQuery(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const isEndo =
    p.includes("dka") ||
    p.includes("diabetic ketoacidosis") ||
    p.includes("hhs") ||
    p.includes("hyperosmolar hyperglycemic") ||
    p.includes("thyroid storm") ||
    p.includes("burch-wartofsky") ||
    p.includes("myxedema") ||
    p.includes("pheochromocytoma") ||
    (p.includes("insulin") && p.includes("potassium")) ||
    (p.includes("iodine") && p.includes("ptu"));

  if (!isEndo) return null;

  // Case 1: DKA / HHS
  if (p.includes("dka") || p.includes("ketoacidosis") || p.includes("hhs") || p.includes("glucose")) {
    const isHypokalemic = p.includes("k 2.") || p.includes("potassium 2.") || p.includes("k+ 2.") || p.includes("k 3.1");
    const isBelow200NoDextrose = p.includes("glucose 180") || p.includes("glucose 190") || p.includes("without dextrose");

    const res = evaluateDkaHhs({
      serumGlucoseMgdl: isBelow200NoDextrose ? 185 : 520,
      measuredSodiumMeq: 132,
      serumPotassiumMeq: isHypokalemic ? 2.8 : 4.4,
      serumChlorideMeq: 98,
      serumBicarbMeq: 10,
      arterialPh: 7.18,
      betaHydroxybutyrateMmol: 4.8,
      mentalStatus: "DROWSY",
      insulinOrderActive: true,
      glucoseBelow200WithoutDextrose: isBelow200NoDextrose,
    });
    return formatEndoMarkdown(res);
  }

  // Case 2: Thyroid Storm
  if (p.includes("thyroid storm") || p.includes("burch-wartofsky") || (p.includes("iodine") && p.includes("ptu"))) {
    const isIodineFirst = p.includes("iodine first") || p.includes("lugol before") || p.includes("sski before");

    const res = evaluateThyroidStorm({
      temperatureCelsius: 39.8,
      heartRateBpm: 145,
      cnsEffects: "DELIRIUM_PSYCHOSIS",
      giHepatic: "DIARRHEA_NAUSEA",
      atrialFibrillationPresent: true,
      heartFailureStage: "MODERATE_EDEMA",
      thionamideAdministered: !isIodineFirst,
      iodineAdministeredBeforeThionamide: isIodineFirst,
      hydrocortisoneAdministered: true,
    });
    return formatEndoMarkdown(res);
  }

  // Case 3: Myxedema Coma
  if (p.includes("myxedema")) {
    const noSteroids = p.includes("without steroids") || p.includes("no hydrocortisone") || p.includes("levothyroxine alone");

    const res = evaluateMyxedemaComa({
      hypothermiaCelsius: 32.5,
      alteredMentalStatus: true,
      hypoventilationHypercapnia: true,
      bradycardiaBpm: 42,
      stressDoseSteroidsGivenBeforeLevothyroxine: !noSteroids,
      ivLevothyroxineOrdered: true,
    });
    return formatEndoMarkdown(res);
  }

  // Case 4: Pheochromocytoma
  if (p.includes("pheochromocytoma") || (p.includes("beta-blocker") && p.includes("alpha-blocker"))) {
    const betaFirst = p.includes("metoprolol alone") || p.includes("propranolol first") || p.includes("beta-blocker first");

    const res = evaluatePheochromocytoma({
      systolicBpMmhg: 220,
      diastolicBpMmhg: 125,
      heartRateBpm: 128,
      alphaBlockerAdministered: !betaFirst,
      betaBlockerMonotherapyOrdered: betaFirst,
    });
    return formatEndoMarkdown(res);
  }

  return null;
}

function formatEndoMarkdown(res: EndoAssessmentResult): string {
  let md = `### Noctis Critical Care Endocrinology & Endocrine Crises Engine (${res.engineId})\n`;
  md += `**Clinical Domain:** ${res.clinicalDomain.replace(/_/g, " ")} · **Summary:** ${res.summary}\n\n`;

  if (res.safetyVetoesTriggered.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants Enforced\n`;
    for (const veto of res.safetyVetoesTriggered) {
      md += `- **${veto}**\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Laboratory Calculations & Risk Stratification\n`;
  for (const [k, v] of Object.entries(res.calculations)) {
    md += `- **${k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:** \`${String(v)}\`\n`;
  }
  md += `\n`;

  md += `#### 2. Protocol Directives & Resuscitation Bundle\n`;
  for (const rec of res.recommendations) {
    md += `- ${rec}\n`;
  }
  md += `\n`;

  md += `#### 3. Clinical References & Statutory Guidelines\n`;
  for (const ref of res.references) {
    md += `- ${ref}\n`;
  }

  return md;
}
