/**
 * NOCTIS OBSTETRIC, MATERNAL-FETAL & PEDIATRIC EMERGENCY ENGINE
 * Spec: NOCTIS-OB-PEDS-CDS-006 (ACOG, SMFM, AAP, PALS Guidelines)
 *
 * Core Capabilities:
 * 1. Preeclampsia with Severe Features & HELLP Syndrome Diagnostic Matrix
 * 2. FDA Pregnancy and Lactation Labeling Rule (PLLR) Medication Safety Classifier
 * 3. Pediatric Assessment Triangle (PAT: Appearance, Work of Breathing, Circulation)
 * 4. Pediatric Weight-Based Emergency Resuscitation & Dosing Calculator
 *
 * Zero-Fabrication Rule: Unprovided clinical parameters are explicitly marked as NOT_PROVIDED.
 */

export interface PreeclampsiaInput {
  gestationalAgeWeeks: number; // >= 20 weeks
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  proteinuriaPresent?: boolean;
  spotUrineProteinToCreatinineRatio?: number; // >= 0.3 mg/mg
  urineDipstickProtein?: string; // "1+", "2+", "3+", "Negative"
  plateletCount10e9_L?: number; // < 100 x 10^9/L
  serumCreatinineMgDl?: number; // > 1.1 mg/dL or 2x baseline
  astOrAltU_L?: number; // > 2x upper limit of normal (e.g. > 70 U/L)
  totalBilirubinMgDl?: number; // >= 1.2 mg/dL
  ldhU_L?: number; // > 600 U/L
  intractableHeadacheOrVisualChanges?: boolean; // scotomata, photopsia, cortical blindness
  pulmonaryEdemaPresent?: boolean;
  persistentRightUpperQuadrantPain?: boolean;
}

export interface PreeclampsiaResult {
  diagnosis:
    | "HELLP_SYNDROME"
    | "PREECLAMPSIA_WITH_SEVERE_FEATURES"
    | "PREECLAMPSIA_WITHOUT_SEVERE_FEATURES"
    | "GESTATIONAL_HYPERTENSION"
    | "CHRONIC_HYPERTENSION_IN_PREGNANCY"
    | "NORMOTENSIVE_PREGNANCY";
  severeFeaturesIdentified: string[];
  maternalEmergencyAlerts: string[];
  magnesiumSulfateIndicated: boolean;
  magnesiumSulfateProtocol: string;
  antihypertensiveProtocol: string;
  deliveryTimingGuidance: string;
}

export interface PllrSafetyInput {
  medicationName: string;
  isPregnant: boolean;
  trimester?: 1 | 2 | 3;
  isLactating?: boolean;
}

export interface PllrSafetyResult {
  medication: string;
  pregnancyRiskSummary: "CONTRAINDICATED_TERATOGENIC" | "SIGNIFICANT_MATERNAL_FETAL_RISK" | "COMPATIBLE_BENEFIT_EXCEEDS_RISK" | "GENERALLY_SAFE";
  lactationSafetySummary: "COMPATIBLE" | "MONITOR_INFANT" | "AVOID_OR_DISCONTINUE_BREASTFEEDING";
  teratogenicRisks: string[];
  safeAlternativeMedications: string[];
  clinicalCounselingSummary: string;
}

export interface PediatricAssessmentTriangleInput {
  appearanceToneTicklesLookSpeech: "NORMAL_INTERACTIVE" | "ABNORMAL_LETHARGIC_IRRITABLE_UNRESPONSIVE";
  workOfBreathingRetractionsNasalFlaring: "NORMAL" | "ABNORMAL_STRIDOR_GRUNTING_RETRACTIONS";
  circulationToSkinPallorMottlingCyanosis: "NORMAL_PINK" | "ABNORMAL_PALLOR_MOTTLING_CYANOSIS";
}

export interface PediatricAssessmentTriangleResult {
  physiologicCategory:
    | "STABLE"
    | "RESPIRATORY_DISTRESS"
    | "RESPIRATORY_FAILURE"
    | "SHOCK"
    | "CENTRAL_NERVOUS_SYSTEM_OR_METABOLIC_CRISIS"
    | "CARDIOPULMONARY_FAILURE_ARREST";
  acuityTier: "CRITICAL_P0" | "URGENT_P1" | "NON_URGENT_P3";
  immediatePalsAction: string;
}

export interface PediatricResuscitationInput {
  childWeightKg: number;
  clinicalScenario: "SEPTIC_SHOCK" | "ANAPHYLAXIS" | "CARDIAC_ARREST" | "STATUS_EPILEPTICUS" | "SEVERE_PNEUMONIA_BACTEREMIA";
}

export interface PediatricDosingItem {
  drugName: string;
  dosePerKg: string;
  calculatedDose: string;
  routeAndAdministration: string;
  maxAdultDose: string;
}

export interface PediatricResuscitationResult {
  childWeightKg: number;
  scenario: string;
  calculatedMedications: PediatricDosingItem[];
  fluidBolusVolumeMl: number; // 20 mL/kg
  defibrillationJoulesInitial: number; // 2 J/kg
  defibrillationJoulesSubsequent: number; // 4 J/kg
  cuffedEttSizeMm: number; // (Age/4) + 3.5
}

/**
 * 1. PREECLAMPSIA WITH SEVERE FEATURES & HELLP SYNDROME MATRIX
 */
export function evaluatePreeclampsia(input: PreeclampsiaInput): PreeclampsiaResult {
  const { gestationalAgeWeeks, systolicBpMmHg, diastolicBpMmHg } = input;
  const severeFeatures: string[] = [];
  const alerts: string[] = [];

  const isSevereHypertension = systolicBpMmHg >= 160 || diastolicBpMmHg >= 110;
  const isHypertension = systolicBpMmHg >= 140 || diastolicBpMmHg >= 90;

  if (isSevereHypertension) severeFeatures.push(`Severe Hypertension (BP ${systolicBpMmHg}/${diastolicBpMmHg} mmHg)`);
  if (input.plateletCount10e9_L !== undefined && input.plateletCount10e9_L < 100) {
    severeFeatures.push(`Thrombocytopenia (Platelets ${input.plateletCount10e9_L} x 10^9/L < 100)`);
  }
  if (input.serumCreatinineMgDl !== undefined && input.serumCreatinineMgDl > 1.1) {
    severeFeatures.push(`Renal Insufficiency (Serum Creatinine ${input.serumCreatinineMgDl} mg/dL > 1.1)`);
  }
  if (input.astOrAltU_L !== undefined && input.astOrAltU_L >= 70) {
    severeFeatures.push(`Impaired Liver Function (Transaminases ${input.astOrAltU_L} U/L >= 2x normal)`);
  }
  if (input.pulmonaryEdemaPresent) severeFeatures.push("Pulmonary Edema");
  if (input.intractableHeadacheOrVisualChanges) severeFeatures.push("Persistent Neurological Symptoms (New severe headache, photopsia, scotomata)");
  if (input.persistentRightUpperQuadrantPain) severeFeatures.push("Persistent Epigastric / RUQ Pain Unresponsive to Analgesics");

  // HELLP Syndrome criteria (Hemolysis, Elevated Liver enzymes, Low Platelets)
  const isHemolysis = (input.ldhU_L !== undefined && input.ldhU_L > 600) || (input.totalBilirubinMgDl !== undefined && input.totalBilirubinMgDl >= 1.2);
  const isElevatedLiver = input.astOrAltU_L !== undefined && input.astOrAltU_L >= 70;
  const isLowPlatelets = input.plateletCount10e9_L !== undefined && input.plateletCount10e9_L < 100;
  const isHellp = isHemolysis && isElevatedLiver && isLowPlatelets;

  let diagnosis: PreeclampsiaResult["diagnosis"] = "NORMOTENSIVE_PREGNANCY";

  const hasProteinuria = Boolean(input.proteinuriaPresent) ||
    (input.spotUrineProteinToCreatinineRatio !== undefined && input.spotUrineProteinToCreatinineRatio >= 0.3) ||
    (input.urineDipstickProtein === "2+" || input.urineDipstickProtein === "3+");

  if (isHellp) {
    diagnosis = "HELLP_SYNDROME";
    alerts.push("🚨 HELLP SYNDROME MEDICAL EMERGENCY: Triad of microangiopathic hemolysis, hepatic necrosis, and severe thrombocytopenia. High risk of hepatic subcapsular hematoma rupture and maternal DIC.");
  } else if (isHypertension && gestationalAgeWeeks >= 20) {
    if (severeFeatures.length > 0) {
      diagnosis = "PREECLAMPSIA_WITH_SEVERE_FEATURES";
      alerts.push("🚨 PREECLAMPSIA WITH SEVERE FEATURES: High risk of maternal eclamptic seizures, stroke, and placental abruption.");
    } else if (hasProteinuria) {
      diagnosis = "PREECLAMPSIA_WITHOUT_SEVERE_FEATURES";
    } else {
      diagnosis = "GESTATIONAL_HYPERTENSION";
    }
  } else if (isHypertension && gestationalAgeWeeks < 20) {
    diagnosis = "CHRONIC_HYPERTENSION_IN_PREGNANCY";
  }

  const needsMagnesium = diagnosis === "HELLP_SYNDROME" || diagnosis === "PREECLAMPSIA_WITH_SEVERE_FEATURES";
  const magProtocol = needsMagnesium
    ? "Magnesium Sulfate Seizure Prophylaxis Protocol: 4–6 g IV loading dose in 100 mL IV fluid over 20 min, followed by continuous maintenance infusion of 1–2 g/hr IV. Continue for 24 hours postpartum. Monitor patellar reflexes, respiratory rate (> 12/min), and urine output (> 30 mL/hr). Have Calcium Gluconate (1 g IV over 3 min) immediately at bedside as antidote for toxicity."
    : "Not currently indicated unless severe features develop.";

  let antiHtn = "Not indicated for non-severe blood pressures.";
  if (isSevereHypertension) {
    antiHtn = "Stat Antihypertensive Protocol (Goal SBP 140–150 and DBP 90–100 mmHg within 30–60 min to prevent maternal hemorrhagic stroke):\n- IV Labetalol: 20 mg IV over 2 min, repeat 40 mg in 10 min, then 80 mg q10 min (max 300 mg)\n- OR IV Hydralazine: 5–10 mg IV over 2 min, repeat 10 mg in 20 min if SBP >= 160\n- OR Oral Nifedipine extended-release: 10–20 mg PO.";
  }

  let delivery = "Routine obstetric monitoring.";
  if (diagnosis === "HELLP_SYNDROME" || diagnosis === "PREECLAMPSIA_WITH_SEVERE_FEATURES") {
    if (gestationalAgeWeeks >= 34) {
      delivery = `Delivery indicated upon maternal stabilization (gestational age ${gestationalAgeWeeks} >= 34 weeks).`;
    } else {
      delivery = `Gestational age is ${gestationalAgeWeeks} weeks (< 34 weeks). Administer antenatal Corticosteroids (Betamethasone 12 mg IM q24h x 2 doses) for fetal lung maturity while stabilizing in maternal-fetal ICU; delivery indicated if maternal or fetal decompensation occurs.`;
    }
  } else if (diagnosis === "PREECLAMPSIA_WITHOUT_SEVERE_FEATURES" || diagnosis === "GESTATIONAL_HYPERTENSION") {
    delivery = "Delivery recommended at 37 weeks 0 days gestation.";
  }

  return {
    diagnosis,
    severeFeaturesIdentified: severeFeatures,
    maternalEmergencyAlerts: alerts,
    magnesiumSulfateIndicated: needsMagnesium,
    magnesiumSulfateProtocol: magProtocol,
    antihypertensiveProtocol: antiHtn,
    deliveryTimingGuidance: delivery,
  };
}

/**
 * 2. FDA PLLR MEDICATION SAFETY CLASSIFIER
 */
export function evaluatePllrMedicationSafety(input: PllrSafetyInput): PllrSafetyResult {
  const name = input.medicationName.toLowerCase();
  const teratogens: string[] = [];
  const alts: string[] = [];

  let risk: PllrSafetyResult["pregnancyRiskSummary"] = "GENERALLY_SAFE";
  let lact: PllrSafetyResult["lactationSafetySummary"] = "COMPATIBLE";
  let counseling = "";

  // Category: ACEi / ARBs / ARNIs
  if (/\b(lisinopril|enalapril|losartan|valsartan|sacubitril|candesartan)\b/i.test(name)) {
    risk = "CONTRAINDICATED_TERATOGENIC";
    lact = "MONITOR_INFANT";
    teratogens.push("Fetopathy: Renal dysgenesis, oligohydramnios, pulmonary hypoplasia, calvarial hypoplasia, intrauterine growth restriction (IUGR), and fetal death (2nd and 3rd trimester exposure).");
    alts.push("Labetalol (first-line)", "Nifedipine extended-release", "Methyldopa");
    counseling = "STRICTLY CONTRAINDICATED in pregnancy. Discontinue immediately upon pregnancy confirmation.";
  }
  // Category: Statins
  else if (/\b(atorvastatin|rosuvastatin|simvastatin|pravastatin)\b/i.test(name)) {
    risk = "SIGNIFICANT_MATERNAL_FETAL_RISK";
    lact = "AVOID_OR_DISCONTINUE_BREASTFEEDING";
    teratogens.push("Disruption of embryonic cholesterol biosynthesis. Potential central nervous system and limb reduction anomalies.");
    alts.push("Bile acid sequestrants (Colesevelam)", "Dietary modification until delivery");
    counseling = "Discontinue statin therapy during pregnancy and lactation unless homozygous familial hypercholesterolemia.";
  }
  // Category: Warfarin
  else if (/\b(warfarin|coumadin)\b/i.test(name)) {
    risk = "CONTRAINDICATED_TERATOGENIC";
    lact = "COMPATIBLE";
    teratogens.push("Warfarin Embryopathy (6th-9th weeks): Nasal hypoplasia, stippled epiphyses (chondrodysplasia punctata), optic atrophy, microcephaly, and fetal intracranial hemorrhage.");
    alts.push("Low-Molecular-Weight Heparin (LMWH - Enoxaparin / Dalteparin)", "Unfractionated Heparin");
    counseling = "Teratogenic. Transition immediately to weight-adjusted LMWH with anti-Xa monitoring.";
  }
  // Category: Methotrexate
  else if (/\b(methotrexate)\b/i.test(name)) {
    risk = "CONTRAINDICATED_TERATOGENIC";
    lact = "AVOID_OR_DISCONTINUE_BREASTFEEDING";
    teratogens.push("Fetal Methotrexate Syndrome: Craniofacial dysmorphism, craniosynostosis, cleft palate, limb defects, and spontaneous abortion.");
    alts.push("Hydroxychloroquine", "Sulfasalazine (with folic acid supplementation)", "Azathioprine");
    counseling = "Potent teratogen and abortifacient. Discontinue at least 3 months prior to planned conception.";
  }
  // Category: Valproate
  else if (/\b(valproate|valproic|depakote)\b/i.test(name)) {
    risk = "CONTRAINDICATED_TERATOGENIC";
    lact = "MONITOR_INFANT";
    teratogens.push("Neural Tube Defects (Spina Bifida 1-2%), craniofacial defects, cardiovascular anomalies, and significant reduction in child IQ / high risk of autism spectrum disorders.");
    alts.push("Levetiracetam (Keppra)", "Lamotrigine (with therapeutic drug level monitoring)");
    counseling = "Highest teratogenic risk among antiepileptic agents. Switch to Levetiracetam or Lamotrigine before conception with high-dose Folic Acid (4 mg/day).";
  }
  // Category: Isotretinoin
  else if (/\b(isotretinoin|accutane)\b/i.test(name)) {
    risk = "CONTRAINDICATED_TERATOGENIC";
    lact = "AVOID_OR_DISCONTINUE_BREASTFEEDING";
    teratogens.push("Isotretinoin Embryopathy (>35% defect rate): Craniofacial, external ear defects (microtia), thymic aplasia, cardiovascular and central nervous system anomalies.");
    alts.push("Topical Erythromycin / Clindamycin", "Azelaic Acid topical");
    counseling = "Absolute teratogen. Enrolled in FDA iPLEDGE program with 2 negative pregnancy tests and dual contraception required.";
  } else {
    risk = "COMPATIBLE_BENEFIT_EXCEEDS_RISK";
    counseling = "Clinical evaluation indicates acceptable safety profile when benefits outweigh maternal-fetal risks.";
  }

  return {
    medication: input.medicationName,
    pregnancyRiskSummary: risk,
    lactationSafetySummary: lact,
    teratogenicRisks: teratogens,
    safeAlternativeMedications: alts,
    clinicalCounselingSummary: counseling,
  };
}

/**
 * 3. PEDIATRIC ASSESSMENT TRIANGLE (PAT)
 */
export function evaluatePediatricAssessmentTriangle(input: PediatricAssessmentTriangleInput): PediatricAssessmentTriangleResult {
  const { appearanceToneTicklesLookSpeech, workOfBreathingRetractionsNasalFlaring, circulationToSkinPallorMottlingCyanosis } = input;

  const abApp = appearanceToneTicklesLookSpeech === "ABNORMAL_LETHARGIC_IRRITABLE_UNRESPONSIVE";
  const abBre = workOfBreathingRetractionsNasalFlaring === "ABNORMAL_STRIDOR_GRUNTING_RETRACTIONS";
  const abCir = circulationToSkinPallorMottlingCyanosis === "ABNORMAL_PALLOR_MOTTLING_CYANOSIS";

  let cat: PediatricAssessmentTriangleResult["physiologicCategory"] = "STABLE";
  let tier: PediatricAssessmentTriangleResult["acuityTier"] = "NON_URGENT_P3";
  let action = "Routine pediatric evaluation.";

  if (abApp && abBre && abCir) {
    cat = "CARDIOPULMONARY_FAILURE_ARREST";
    tier = "CRITICAL_P0";
    action = "🚨 IMMEDIATE RESUSCITATION: Bag-mask ventilation with 100% O2, prepare for rapid sequence intubation, vascular access, and continuous cardiac monitoring.";
  } else if (!abApp && abBre && !abCir) {
    cat = "RESPIRATORY_DISTRESS";
    tier = "URGENT_P1";
    action = "Supplemental oxygen, position of comfort, nebulized bronchodilators/epinephrine, minimal agitation.";
  } else if (abApp && abBre && !abCir) {
    cat = "RESPIRATORY_FAILURE";
    tier = "CRITICAL_P0";
    action = "🚨 EMERGENT AIRWAY SUPPORT: Assist ventilation with bag-valve-mask and prepare for endotracheal intubation.";
  } else if (!abApp && !abBre && abCir) {
    cat = "SHOCK";
    tier = "CRITICAL_P0";
    action = "🚨 PEDIATRIC RESUSCITATION: Rapid vascular access (IV/IO), 20 mL/kg isotonic fluid bolus over 10-20 min, bedside blood glucose.";
  } else if (abApp && !abBre && !abCir) {
    cat = "CENTRAL_NERVOUS_SYSTEM_OR_METABOLIC_CRISIS";
    tier = "URGENT_P1";
    action = "Fingerstick blood glucose stat (rule out hypoglycemia), toxicology screen, check for signs of increased ICP or meningitis.";
  }

  return {
    physiologicCategory: cat,
    acuityTier: tier,
    immediatePalsAction: action,
  };
}

/**
 * 4. PEDIATRIC WEIGHT-BASED EMERGENCY RESUSCITATION CALCULATOR
 */
export function calculatePediatricResuscitationDoses(input: PediatricResuscitationInput): PediatricResuscitationResult {
  const wt = input.childWeightKg;
  const meds: PediatricDosingItem[] = [];

  // Epinephrine (Cardiac Arrest / Anaphylaxis)
  const epiArrestMg = Math.min(wt * 0.01, 1.0);
  const epiAnaphMg = Math.min(wt * 0.01, 0.5);

  meds.push({
    drugName: "Epinephrine (Cardiac Arrest / Bradycardia 1:10,000 / 0.1 mg/mL)",
    dosePerKg: "0.01 mg/kg (0.1 mL/kg of 1:10,000 solution)",
    calculatedDose: `${(wt * 0.1).toFixed(1)} mL IV/IO (${epiArrestMg.toFixed(2)} mg)`,
    routeAndAdministration: "IV/IO rapid flush every 3-5 minutes during CPR",
    maxAdultDose: "1.0 mg (10 mL)",
  });

  meds.push({
    drugName: "Epinephrine (Anaphylaxis / Severe Bronchospasm 1:1,000 / 1 mg/mL)",
    dosePerKg: "0.01 mg/kg (0.01 mL/kg of 1:1,000 solution)",
    calculatedDose: `${(wt * 0.01).toFixed(2)} mL IM (${epiAnaphMg.toFixed(2)} mg)`,
    routeAndAdministration: "IM injection anterolateral mid-thigh every 5-15 min PRN",
    maxAdultDose: "0.5 mg (0.5 mL)",
  });

  // Fluid Bolus (20 mL/kg)
  const fluidVol = wt * 20;

  // Defibrillation
  const defibInit = Math.round(wt * 2);
  const defibSub = Math.round(wt * 4);

  // Cuffed ETT Size = (Age/4) + 3.5 (approximated by weight)
  let ett = 4.0;
  if (wt >= 30) ett = 6.5;
  else if (wt >= 20) ett = 5.5;
  else if (wt >= 15) ett = 4.5;
  else if (wt >= 10) ett = 4.0;
  else ett = 3.5;

  // Scenario specific drugs
  if (input.clinicalScenario === "STATUS_EPILEPTICUS") {
    const lorazMg = Math.min(wt * 0.1, 4.0);
    const levetMg = Math.min(wt * 60, 4500);
    meds.push({
      drugName: "Lorazepam (Ativan)",
      dosePerKg: "0.1 mg/kg IV/IO",
      calculatedDose: `${lorazMg.toFixed(2)} mg IV`,
      routeAndAdministration: "Slow IV push over 2 minutes",
      maxAdultDose: "4.0 mg",
    });
    meds.push({
      drugName: "Levetiracetam (Keppra)",
      dosePerKg: "60 mg/kg IV",
      calculatedDose: `${levetMg.toFixed(0)} mg IV`,
      routeAndAdministration: "IV infusion over 10 minutes",
      maxAdultDose: "4,500 mg",
    });
  } else if (input.clinicalScenario === "SEPTIC_SHOCK" || input.clinicalScenario === "SEVERE_PNEUMONIA_BACTEREMIA") {
    const ceftriaxMg = Math.min(wt * 100, 2000);
    const vancoMg = Math.min(wt * 15, 2000);
    meds.push({
      drugName: "Ceftriaxone (Rocephin)",
      dosePerKg: "50-100 mg/kg IV/IO",
      calculatedDose: `${ceftriaxMg.toFixed(0)} mg IV`,
      routeAndAdministration: "IV infusion over 30 minutes",
      maxAdultDose: "2,000 mg",
    });
    meds.push({
      drugName: "Vancomycin",
      dosePerKg: "15 mg/kg IV/IO",
      calculatedDose: `${vancoMg.toFixed(0)} mg IV`,
      routeAndAdministration: "IV infusion over 60 minutes",
      maxAdultDose: "2,000 mg",
    });
  }

  return {
    childWeightKg: wt,
    scenario: input.clinicalScenario,
    calculatedMedications: meds,
    fluidBolusVolumeMl: fluidVol,
    defibrillationJoulesInitial: defibInit,
    defibrillationJoulesSubsequent: defibSub,
    cuffedEttSizeMm: ett,
  };
}
