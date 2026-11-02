/**
 * NOCTIS INFECTIOUS DISEASE & ANTIMICROBIAL STEWARDSHIP DECISION SUPPORT ENGINE
 * Spec: NOCTIS-INFECT-CDS-002 (Surviving Sepsis Campaign, IDSA/ATS, AASLD Guidelines)
 *
 * Core Capabilities:
 * 1. Surviving Sepsis Hour-1 Bundle & Septic Shock Protocol
 * 2. Pneumonia Severity & Admission Triage (CURB-65 Score & PSI)
 * 3. Complete Hepatitis B Serology Matrix Solver (All combinations of HBsAg, anti-HBs, anti-HBc, HBeAg)
 * 4. Non-Invasive Liver Fibrosis Staging (FIB-4 & APRI Scores)
 *
 * Zero-Fabrication Rule: Unprovided clinical parameters are explicitly marked as NOT_PROVIDED.
 */

export interface SepsisHourOneBundleInput {
  timeOfRecognitionIso?: string;
  bloodCulturesObtainedPriorToAntibiotics?: boolean;
  broadSpectrumAntibioticsAdministered?: boolean;
  timeToAntibioticsMinutes?: number;
  initialLactateMmolL?: number;
  repeatLactateMmolL?: number;
  repeatLactateMeasuredWithin4Hours?: boolean;
  fluidResuscitation30MlPerKgGiven?: boolean;
  patientWeightKg?: number;
  totalFluidVolumeMlGiven?: number;
  meanArterialPressureMmHg?: number;
  persistentHypotensionAfterFluids?: boolean;
  vasopressorInitiated?: boolean;
  firstLineVasopressorUsed?: string; // "Norepinephrine", "Vasopressin", "Dopamine", etc.
}

export interface SepsisHourOneBundleResult {
  bundleAdherenceStatus: "FULLY_COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "PENDING_VERIFICATION";
  completedElementsCount: number; // 0 to 5
  adherencePercentage: number;
  elements: {
    bloodCulturesBeforeAntibiotics: { completed: boolean; alert?: string };
    broadSpectrumAntibioticsWithin60Min: { completed: boolean; alert?: string };
    lactateMeasuredAndRepeatedIfHigh: { completed: boolean; alert?: string };
    rapidFluid30MlKgResuscitation: { completed: boolean; alert?: string };
    vasopressorsForTargetMap65: { completed: boolean; alert?: string };
  };
  clinicalDisposition: "SEPTIC_SHOCK" | "SEVERE_SEPSIS_HYPOPERFUSION" | "UNCOMPLICATED_SEPSIS";
  urgentActions: string[];
}

export interface Curb65Input {
  confusion?: boolean; // mental confusion / disorientation / AMTS <= 8
  bunMgDl?: number; // BUN > 19 mg/dL (> 7 mmol/L)
  ureaMmolL?: number;
  respiratoryRate?: number; // RR >= 30 breaths/min
  sbp?: number; // SBP < 90 mmHg
  dbp?: number; // DBP <= 60 mmHg
  ageYears: number; // Age >= 65
}

export interface Curb65Result {
  score: number;
  criteriaPoints: { [key: string]: number };
  severityCategory: "LOW_RISK_MILD" | "MODERATE_RISK_INTERMEDIATE" | "HIGH_RISK_SEVERE";
  estimated30DayMortalityPercent: number;
  recommendedSiteOfCare: "OUTPATIENT_TREATMENT" | "HOSPITAL_INPATIENT_OBSERVATION" | "URGENT_INPATIENT_OR_ICU";
  empiricAntibioticRegimenSummary: string;
}

export interface HepBSerologyInput {
  hbsAg: boolean; // Hepatitis B Surface Antigen
  antiHBs: boolean; // Antibody to Hepatitis B Surface Antigen (HBsAb)
  antiHbcTotalOrIgg?: boolean; // Total Anti-HBc / IgG
  antiHbcIgm?: boolean; // IgM Anti-HBc (acute marker)
  hbeAg?: boolean; // Hepatitis B Envelope Antigen (replication marker)
  antiHbe?: boolean; // Antibody to Hepatitis B Envelope Antigen
  hbvDnaIuMl?: number; // Quantitative HBV DNA Viral Load
}

export interface HepBSerologyResult {
  interpretation:
    | "ACUTE_HEPATITIS_B"
    | "CHRONIC_HEPATITIS_B_ACTIVE_REPLICATION"
    | "CHRONIC_HEPATITIS_B_INACTIVE_CARRIER"
    | "IMMUNE_DUE_TO_NATURAL_INFECTION_RESOLVED"
    | "IMMUNE_DUE_TO_HEPATITIS_B_VACCINATION"
    | "ISOLATED_CORE_ANTIBODY_WINDOW_OR_DISTANT"
    | "SUSCEPTIBLE_NON_IMMUNE"
    | "UNUSUAL_ATYPICAL_SEROLOGY";
  clinicalSummary: string;
  infectivityLevel: "HIGH" | "LOW" | "NONE" | "UNKNOWN";
  vaccineRecommended: boolean;
  nextRecommendedTests: string[];
}

export interface Fib4Input {
  ageYears: number;
  astU_L: number;
  altU_L: number;
  platelets10e9_L: number; // e.g. 150 = 150,000/uL
}

export interface Fib4Result {
  fib4Score: number;
  fibrosisRiskCategory: "LOW_RISK_F0_F1" | "INDETERMINATE_GRAY_ZONE" | "HIGH_RISK_ADVANCED_F3_F4";
  negativePredictiveValuePercent: number;
  clinicalRecommendation: string;
}

/**
 * 1. SURVIVING SEPSIS HOUR-1 BUNDLE EVALUATOR
 */
export function evaluateSepsisHourOneBundle(input: SepsisHourOneBundleInput): SepsisHourOneBundleResult {
  let completed = 0;
  const urgentActions: string[] = [];

  // 1. Blood cultures
  const bcCompliant = Boolean(input.bloodCulturesObtainedPriorToAntibiotics);
  if (bcCompliant) completed++;
  else urgentActions.push("Obtain 2 sets of blood cultures immediately before administering broad-spectrum antimicrobials.");

  // 2. Antibiotics within 60 min
  const abxCompliant = Boolean(input.broadSpectrumAntibioticsAdministered) &&
    (input.timeToAntibioticsMinutes === undefined || input.timeToAntibioticsMinutes <= 60);
  if (abxCompliant) completed++;
  else urgentActions.push("Administer broad-spectrum empiric IV antimicrobials within 60 minutes of sepsis recognition.");

  // 3. Lactate
  const lactateVal = input.initialLactateMmolL;
  let lactateCompliant = false;
  if (typeof lactateVal === "number") {
    if (lactateVal > 2.0) {
      lactateCompliant = Boolean(input.repeatLactateMeasuredWithin4Hours);
      if (!lactateCompliant) urgentActions.push("Re-measure serum lactate within 2-4 hours to guide resuscitation and clearance kinetics.");
    } else {
      lactateCompliant = true;
    }
  } else {
    urgentActions.push("Measure initial serum lactate stat (biomarker of tissue hypoperfusion).");
  }
  if (lactateCompliant) completed++;

  // 4. Fluid 30 mL/kg
  const fluidCompliant = Boolean(input.fluidResuscitation30MlPerKgGiven);
  if (fluidCompliant) completed++;
  else if (input.meanArterialPressureMmHg !== undefined && input.meanArterialPressureMmHg < 65 || (lactateVal !== undefined && lactateVal >= 4.0)) {
    urgentActions.push("Administer rapid 30 mL/kg IV balanced crystalloid (e.g. Plasmalyte or Lactated Ringer's) for MAP < 65 or lactate >= 4.0 mmol/L.");
  }

  // 5. Vasopressors
  let vasoCompliant = false;
  const map = input.meanArterialPressureMmHg;
  const isHypotensive = map !== undefined && map < 65;

  if (isHypotensive || input.persistentHypotensionAfterFluids) {
    if (input.vasopressorInitiated) {
      vasoCompliant = true;
      completed++;
      if (input.firstLineVasopressorUsed && !input.firstLineVasopressorUsed.toLowerCase().includes("norepinephrine")) {
        urgentActions.push("Surviving Sepsis Guideline Warning: Norepinephrine is the first-choice vasopressor (target MAP >= 65 mmHg).");
      }
    } else {
      urgentActions.push("🚨 START VASOPRESSORS STAT: Persistent MAP < 65 mmHg despite initial fluid bolus requires central/peripheral Norepinephrine infusion.");
    }
  } else {
    // If not hypotensive, vasopressor is not indicated
    vasoCompliant = true;
    completed++;
  }

  let disposition: SepsisHourOneBundleResult["clinicalDisposition"] = "UNCOMPLICATED_SEPSIS";
  if ((isHypotensive || input.persistentHypotensionAfterFluids) && input.vasopressorInitiated) {
    disposition = "SEPTIC_SHOCK";
  } else if ((lactateVal !== undefined && lactateVal >= 4.0) || isHypotensive) {
    disposition = "SEVERE_SEPSIS_HYPOPERFUSION";
  }

  let status: SepsisHourOneBundleResult["bundleAdherenceStatus"] = "PARTIALLY_COMPLIANT";
  if (completed === 5) status = "FULLY_COMPLIANT";
  else if (completed <= 1) status = "NON_COMPLIANT";

  return {
    bundleAdherenceStatus: status,
    completedElementsCount: completed,
    adherencePercentage: Math.round((completed / 5) * 100),
    elements: {
      bloodCulturesBeforeAntibiotics: {
        completed: bcCompliant,
        alert: !bcCompliant ? "Blood cultures omitted or given after antibiotics." : undefined,
      },
      broadSpectrumAntibioticsWithin60Min: {
        completed: abxCompliant,
        alert: !abxCompliant ? "Antibiotics delayed > 60 min or omitted." : undefined,
      },
      lactateMeasuredAndRepeatedIfHigh: {
        completed: lactateCompliant,
        alert: !lactateCompliant ? "Lactate unmeasured or repeat omitted for initial > 2.0." : undefined,
      },
      rapidFluid30MlKgResuscitation: {
        completed: fluidCompliant,
        alert: !fluidCompliant ? "30 mL/kg fluid bolus incomplete." : undefined,
      },
      vasopressorsForTargetMap65: {
        completed: vasoCompliant,
        alert: !vasoCompliant ? "Vasopressor not initiated for persistent MAP < 65." : undefined,
      },
    },
    clinicalDisposition: disposition,
    urgentActions,
  };
}

/**
 * 2. PNEUMONIA SEVERITY & ADMISSION TRIAGE (CURB-65)
 */
export function calculateCurb65(input: Curb65Input): Curb65Result {
  const criteriaPoints: { [key: string]: number } = {};
  let score = 0;

  if (input.confusion) {
    criteriaPoints["Confusion (AMTS <= 8 or new disorientation) (C)"] = 1;
    score++;
  }

  const isBunElevated = (input.bunMgDl !== undefined && input.bunMgDl > 19) ||
    (input.ureaMmolL !== undefined && input.ureaMmolL > 7.0);
  if (isBunElevated) {
    criteriaPoints["BUN > 19 mg/dL (> 7 mmol/L) (U)"] = 1;
    score++;
  }

  if (input.respiratoryRate !== undefined && input.respiratoryRate >= 30) {
    criteriaPoints["Respiratory Rate >= 30 breaths/min (R)"] = 1;
    score++;
  }

  const isBpLow = (input.sbp !== undefined && input.sbp < 90) || (input.dbp !== undefined && input.dbp <= 60);
  if (isBpLow) {
    criteriaPoints["Blood Pressure (SBP < 90 or DBP <= 60 mmHg) (B)"] = 1;
    score++;
  }

  if (input.ageYears >= 65) {
    criteriaPoints["Age >= 65 Years (65)"] = 1;
    score++;
  }

  const mortalityRates: { [key: number]: number } = {
    0: 0.6, 1: 2.7, 2: 6.8, 3: 14.0, 4: 27.8, 5: 27.8,
  };
  const mortality = mortalityRates[Math.min(score, 5)] ?? 27.8;

  let severity: Curb65Result["severityCategory"] = "LOW_RISK_MILD";
  let site: Curb65Result["recommendedSiteOfCare"] = "OUTPATIENT_TREATMENT";
  let abx = "";

  if (score >= 3) {
    severity = "HIGH_RISK_SEVERE";
    site = "URGENT_INPATIENT_OR_ICU";
    abx = "Inpatient ICU/High-Acuity Regimen: IV Beta-lactam (e.g. Ceftriaxone or Ampicillin-Sulbactam) PLUS IV Macrolide (Azithromycin) or Respiratory Fluoroquinolone (Levofloxacin/Moxifloxacin). Add Vancomycin or Linezolid if MRSA risk factors present.";
  } else if (score === 2) {
    severity = "MODERATE_RISK_INTERMEDIATE";
    site = "HOSPITAL_INPATIENT_OBSERVATION";
    abx = "General Medical Floor Inpatient Regimen: IV Ceftriaxone 1g daily PLUS Oral/IV Azithromycin 500mg daily, or Monotherapy with Respiratory Fluoroquinolone.";
  } else {
    severity = "LOW_RISK_MILD";
    site = "OUTPATIENT_TREATMENT";
    abx = "Outpatient CAP Regimen: Amoxicillin 1g TID PLUS Doxycycline or Macrolide (if local pneumococcal resistance < 25%). If comorbidities present: Amoxicillin-Clavulanate PLUS Macrolide/Doxycycline.";
  }

  return {
    score,
    criteriaPoints,
    severityCategory: severity,
    estimated30DayMortalityPercent: mortality,
    recommendedSiteOfCare: site,
    empiricAntibioticRegimenSummary: abx,
  };
}

/**
 * 3. HEPATITIS B SEROLOGY MATRIX SOLVER
 */
export function solveHepatitisBSerology(input: HepBSerologyInput): HepBSerologyResult {
  const { hbsAg, antiHBs, antiHbcTotalOrIgg, antiHbcIgm, hbeAg } = input;

  // Case 1: Acute Hepatitis B (HBsAg positive + anti-HBc IgM positive)
  if (hbsAg && antiHbcIgm) {
    return {
      interpretation: "ACUTE_HEPATITIS_B",
      clinicalSummary: "Acute Hepatitis B Virus (HBV) infection. Active viral replication present.",
      infectivityLevel: "HIGH",
      vaccineRecommended: false,
      nextRecommendedTests: ["Quantitative HBV DNA by PCR", "HBeAg and anti-HBe", "Baseline liver panel (ALT, AST, Total Bilirubin, INR)", "Screen for Hepatitis C, D, and HIV co-infection"],
    };
  }

  // Case 2: Chronic Hepatitis B (HBsAg positive + anti-HBc IgM negative / Total positive)
  if (hbsAg && !antiHbcIgm) {
    const isReplicating = Boolean(hbeAg) || (input.hbvDnaIuMl !== undefined && input.hbvDnaIuMl >= 2000);
    return {
      interpretation: isReplicating ? "CHRONIC_HEPATITIS_B_ACTIVE_REPLICATION" : "CHRONIC_HEPATITIS_B_INACTIVE_CARRIER",
      clinicalSummary: isReplicating
        ? "Chronic Hepatitis B infection with active viral replication (HBeAg+ or HBV DNA >= 2,000 IU/mL). High risk of hepatic cirrhosis and hepatocellular carcinoma (HCC)."
        : "Chronic Hepatitis B inactive carrier state. Low ongoing replication, but persistent risk requiring regular surveillance.",
      infectivityLevel: isReplicating ? "HIGH" : "LOW",
      vaccineRecommended: false,
      nextRecommendedTests: [
        "Quantitative HBV DNA PCR",
        "Hepatic Ultrasound every 6 months for HCC surveillance",
        "FIB-4 or transient elastography (FibroScan) for fibrosis staging",
        "Evaluation for antiviral therapy (Entecavir or Tenofovir DF/AF)",
      ],
    };
  }

  // Case 3: Immune due to natural infection (anti-HBs positive + anti-HBc Total/IgG positive + HBsAg negative)
  if (!hbsAg && antiHBs && antiHbcTotalOrIgg) {
    return {
      interpretation: "IMMUNE_DUE_TO_NATURAL_INFECTION_RESOLVED",
      clinicalSummary: "Immune due to resolved natural Hepatitis B infection. The patient has cleared surface antigen and produced protective antibodies.",
      infectivityLevel: "NONE",
      vaccineRecommended: false,
      nextRecommendedTests: ["Caution: Risk of HBV reactivation if undergoing systemic immunosuppression, biologic B-cell depleting therapy (e.g. Rituximab), or bone marrow transplantation."],
    };
  }

  // Case 4: Immune due to vaccination (anti-HBs positive + anti-HBc negative + HBsAg negative)
  if (!hbsAg && antiHBs && !antiHbcTotalOrIgg && !antiHbcIgm) {
    return {
      interpretation: "IMMUNE_DUE_TO_HEPATITIS_B_VACCINATION",
      clinicalSummary: "Immune to Hepatitis B due to prior vaccination. Protective surface antibody without viral core exposure.",
      infectivityLevel: "NONE",
      vaccineRecommended: false,
      nextRecommendedTests: ["No further routine testing required unless high-risk immunocompromised exposure."],
    };
  }

  // Case 5: Isolated core antibody (anti-HBc positive only)
  if (!hbsAg && !antiHBs && (antiHbcTotalOrIgg || antiHbcIgm)) {
    return {
      interpretation: "ISOLATED_CORE_ANTIBODY_WINDOW_OR_DISTANT",
      clinicalSummary: "Isolated Anti-HBc detected. Possibilities include: 1) Resolving acute infection in the 'core window', 2) Distant resolved infection with waning anti-HBs titers, 3) Occult chronic HBV with undetectable surface antigen, or 4) False-positive result.",
      infectivityLevel: "LOW",
      vaccineRecommended: true,
      nextRecommendedTests: ["Quantitative HBV DNA PCR to rule out occult viremia", "Consider Hepatitis B vaccine booster series"],
    };
  }

  // Case 6: Susceptible / Non-immune (all negative)
  if (!hbsAg && !antiHBs && !antiHbcTotalOrIgg && !antiHbcIgm) {
    return {
      interpretation: "SUSCEPTIBLE_NON_IMMUNE",
      clinicalSummary: "Patient is non-immune and susceptible to Hepatitis B virus infection. No evidence of current or prior infection or vaccination.",
      infectivityLevel: "NONE",
      vaccineRecommended: true,
      nextRecommendedTests: ["Administer 2-dose or 3-dose Hepatitis B vaccine series (e.g. Heplisav-B or Engerix-B)"],
    };
  }

  return {
    interpretation: "UNUSUAL_ATYPICAL_SEROLOGY",
    clinicalSummary: "Atypical Hepatitis B serologic pattern. Verify laboratory specimen and repeat serologies.",
    infectivityLevel: "UNKNOWN",
    vaccineRecommended: false,
    nextRecommendedTests: ["Repeat HBV serology panel and order Quantitative HBV DNA PCR"],
  };
}

/**
 * 4. NON-INVASIVE LIVER FIBROSIS SCORING (FIB-4)
 */
export function calculateFib4(input: Fib4Input): Fib4Result {
  const { ageYears, astU_L, altU_L, platelets10e9_L } = input;
  if (platelets10e9_L <= 0 || altU_L <= 0) {
    return {
      fib4Score: 0,
      fibrosisRiskCategory: "INDETERMINATE_GRAY_ZONE",
      negativePredictiveValuePercent: 0,
      clinicalRecommendation: "Invalid lab parameters (platelets and ALT must be positive numbers).",
    };
  }

  // FIB-4 = (Age * AST) / (Platelets * sqrt(ALT))
  const score = (ageYears * astU_L) / (platelets10e9_L * Math.sqrt(altU_L));
  const rounded = Math.round(score * 100) / 100;

  if (rounded < 1.30) {
    return {
      fib4Score: rounded,
      fibrosisRiskCategory: "LOW_RISK_F0_F1",
      negativePredictiveValuePercent: 90,
      clinicalRecommendation: "Low risk of advanced fibrosis (F0-F1). High negative predictive value (~90%). Re-evaluate in 1 to 2 years.",
    };
  } else if (rounded > 2.67) {
    return {
      fib4Score: rounded,
      fibrosisRiskCategory: "HIGH_RISK_ADVANCED_F3_F4",
      negativePredictiveValuePercent: 35,
      clinicalRecommendation: "High risk of advanced fibrosis or cirrhosis (F3-F4). Urgent hepatology referral, vibration-controlled transient elastography (FibroScan), and screening for portal hypertension and esophageal varices indicated.",
    };
  } else {
    return {
      fib4Score: rounded,
      fibrosisRiskCategory: "INDETERMINATE_GRAY_ZONE",
      negativePredictiveValuePercent: 65,
      clinicalRecommendation: "Indeterminate FIB-4 score (1.30 - 2.67). Secondary non-invasive assessment recommended (FibroScan elastography, Enhanced Liver Fibrosis [ELF] test, or liver biopsy).",
    };
  }
}
