/**
 * NOCTIS CLINICAL REASONING, PATIENT-CONTEXT & DECISION SUPPORT ENGINE
 * Module ID: NOCTIS-CLIN-ENG-001
 * Standard: Non-Device CDS Reference Architecture (21 U.S.C. § 360aaa)
 * 
 * Core Invariants:
 * 1. Patient Context & Anatomy: Strict sex-specific anatomical gating.
 * 2. Anatomical Localization Gate: Undifferentiated abdominal pain when location is unprovided.
 * 3. Diagnostic Criteria Enforcement: Atlanta 2-of-3 criteria for acute pancreatitis.
 * 4. Rigorous Scoring Engines: Alvarado, qSOFA, NEWS2 with strict missing-data handling.
 * 5. Condition-Specific Imaging: Evidence-based imaging pathways (US vs CT).
 * 6. Treatment Safety: Allergy, renal function, and surgical examination safety gates.
 * 7. Contradiction Detection: Surfacing conflicting inputs prior to report synthesis.
 */

export type BiologicalSex = "male" | "female" | "other";

export interface PatientClinicalEncounter {
  encounterId: string;
  ageYears?: number;
  biologicalSex?: BiologicalSex;
  chiefComplaint: string;
  painLocation?: string;
  painQuadrant?: "RLQ" | "RUQ" | "LLQ" | "LUQ" | "Epigastric" | "Periumbilical" | "Suprapubic" | "Flank" | "Diffuse" | "Undifferentiated";
  painOnset?: string;
  painDurationMinutes?: number;
  painQuality?: string;
  painSeverity?: number; // 1-10
  painRadiation?: string;
  associatedSymptoms: string[];
  vitals: {
    systolicBp?: number;
    diastolicBp?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperatureC?: number;
    spo2?: number;
    gcs?: number;
    roomAir?: boolean;
  };
  labs?: {
    wbc?: number;
    neutrophilPct?: number;
    lipaseU_L?: number;
    lipaseUln?: number;
    creatinineMg_dL?: number;
    bilirubinMg_dL?: number;
    astU_L?: number;
    altU_L?: number;
    alkPhosU_L?: number;
    crpMg_L?: number;
  };
  allergies?: string[];
  pastMedicalHistory?: string[];
}

/* =====================================================================
 * 1. CONTRADICTION DETECTION ENGINE
 * ===================================================================== */

export interface ClinicalContradiction {
  field: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  description: string;
  conflictingValues: string[];
}

export function detectClinicalContradictions(rawText: string, encounter: PatientClinicalEncounter): ClinicalContradiction[] {
  const contradictions: ClinicalContradiction[] = [];
  const t = rawText.toLowerCase();

  // 1. Biological sex vs Gynecological/Obstetric terms
  if (encounter.biologicalSex === "male") {
    if (/\b(pregnant|pregnancy|lmp|last\s+menstrual|ovarian|cervix|cervical|uterine|uterus|vagina|vaginal)\b/i.test(t)) {
      contradictions.push({
        field: "biological_sex",
        severity: "CRITICAL",
        description: "Contradiction detected: Patient is identified as male, but text contains female reproductive/obstetric terminology.",
        conflictingValues: ["biologicalSex: male", "Detected female-specific terms in narrative"],
      });
    }
  } else if (encounter.biologicalSex === "female") {
    if (/\b(testicular|testis|testicle|scrotum|scrotal|prostate|prostatic|epididym)\b/i.test(t)) {
      contradictions.push({
        field: "biological_sex",
        severity: "CRITICAL",
        description: "Contradiction detected: Patient is identified as female, but text contains male urogenital terminology.",
        conflictingValues: ["biologicalSex: female", "Detected male-specific terms in narrative"],
      });
    }
  }

  // 2. Temperature contradiction (afebrile vs documented fever)
  if (encounter.vitals.temperatureC && encounter.vitals.temperatureC >= 38.0) {
    if (/\b(afebrile|no\s+fever|without\s+fever)\b/i.test(t)) {
      contradictions.push({
        field: "temperature",
        severity: "HIGH",
        description: "Contradiction detected: Narrative states 'afebrile' or 'no fever', but measured temperature is pyrexic (≥ 38.0°C).",
        conflictingValues: [`Measured temp: ${encounter.vitals.temperatureC}°C`, "Narrative states afebrile"],
      });
    }
  }

  // 3. Blood pressure contradiction (hypotension claim with hypertensive vitals)
  if (encounter.vitals.systolicBp && encounter.vitals.systolicBp >= 140) {
    if (/\b(hypotens|low\s+blood\s+pressure|shock\s+bp)\b/i.test(t)) {
      contradictions.push({
        field: "blood_pressure",
        severity: "HIGH",
        description: "Contradiction detected: Narrative mentions hypotension, but measured systolic blood pressure is elevated.",
        conflictingValues: [`Measured BP: ${encounter.vitals.systolicBp} mmHg`, "Narrative mentions hypotension"],
      });
    }
  }

  return contradictions;
}

/* =====================================================================
 * 2. CLINICAL SCORING ENGINE (Alvarado, qSOFA, NEWS2)
 * ===================================================================== */

export interface AlvaradoScoreResult {
  scoreName: "Alvarado Score for Acute Appendicitis";
  documentedPoints: number;
  maxPoints: 10;
  isComplete: boolean;
  documentedCriteria: Array<{ name: string; points: number }>;
  missingCriteria: string[];
  riskStratification: "LOW" | "INTERMEDIATE" | "HIGH" | "INSUFFICIENT_DATA_DO_NOT_STRATIFY";
  clinicalInterpretation: string;
}

export function calculateAlvaradoScore(encounter: PatientClinicalEncounter): AlvaradoScoreResult {
  let documentedPoints = 0;
  const documentedCriteria: Array<{ name: string; points: number }> = [];
  const missingCriteria: string[] = [];

  // M: Migration of pain to RLQ (1 pt)
  if (encounter.painQuadrant === "RLQ" && /migrat|periumbil/i.test(encounter.painOnset || encounter.chiefComplaint)) {
    documentedPoints += 1;
    documentedCriteria.push({ name: "Migration of pain to RLQ", points: 1 });
  } else if (/migrat/i.test(encounter.chiefComplaint)) {
    documentedPoints += 1;
    documentedCriteria.push({ name: "Migration of pain to RLQ", points: 1 });
  } else {
    missingCriteria.push("Pain migration to RLQ");
  }

  // A: Anorexia (1 pt)
  if (encounter.associatedSymptoms.some(s => /anorexia|loss\s+of\s+appetite|refused\s+food/i.test(s))) {
    documentedPoints += 1;
    documentedCriteria.push({ name: "Anorexia / acetone in urine", points: 1 });
  } else {
    missingCriteria.push("Anorexia");
  }

  // N: Nausea or Vomiting (1 pt)
  if (encounter.associatedSymptoms.some(s => /nausea|vomit/i.test(s))) {
    documentedPoints += 1;
    documentedCriteria.push({ name: "Nausea or vomiting", points: 1 });
  } else {
    missingCriteria.push("Nausea or vomiting");
  }

  // T: Tenderness in RLQ (2 pts)
  if (encounter.painQuadrant === "RLQ" || /rlq|mcburney|right\s+lower/i.test(encounter.chiefComplaint)) {
    documentedPoints += 2;
    documentedCriteria.push({ name: "Right lower quadrant tenderness", points: 2 });
  } else {
    missingCriteria.push("Right lower quadrant tenderness (2 pts)");
  }

  // R: Rebound tenderness in RLQ (1 pt)
  if (encounter.associatedSymptoms.some(s => /rebound|periton/i.test(s))) {
    documentedPoints += 1;
    documentedCriteria.push({ name: "Rebound tenderness in RLQ", points: 1 });
  } else {
    missingCriteria.push("Rebound tenderness (Blumberg sign)");
  }

  // E: Elevated temperature ≥ 37.3°C / 99.1°F (1 pt)
  if (encounter.vitals.temperatureC !== undefined) {
    if (encounter.vitals.temperatureC >= 37.3) {
      documentedPoints += 1;
      documentedCriteria.push({ name: `Elevated temperature (${encounter.vitals.temperatureC}°C ≥ 37.3°C)`, points: 1 });
    }
  } else {
    missingCriteria.push("Temperature measurement");
  }

  // L: Leukocytosis WBC > 10,000 /uL (2 pts)
  if (encounter.labs?.wbc !== undefined) {
    if (encounter.labs.wbc > 10000) {
      documentedPoints += 2;
      documentedCriteria.push({ name: `Leukocytosis (WBC ${encounter.labs.wbc} > 10,000)`, points: 2 });
    }
  } else {
    missingCriteria.push("Leukocytosis (WBC count) (2 pts)");
  }

  // S: Shift of neutrophils to the left > 75% (1 pt)
  if (encounter.labs?.neutrophilPct !== undefined) {
    if (encounter.labs.neutrophilPct > 75) {
      documentedPoints += 1;
      documentedCriteria.push({ name: `Neutrophil left shift (${encounter.labs.neutrophilPct}% > 75%)`, points: 1 });
    }
  } else {
    missingCriteria.push("Neutrophilic left-shift percentage");
  }

  const isComplete = missingCriteria.length === 0;
  let riskStratification: AlvaradoScoreResult["riskStratification"] = "INSUFFICIENT_DATA_DO_NOT_STRATIFY";
  let clinicalInterpretation = "";

  if (isComplete) {
    if (documentedPoints <= 4) {
      riskStratification = "LOW";
      clinicalInterpretation = "Low likelihood of acute appendicitis; consider outpatient evaluation and reassessment.";
    } else if (documentedPoints <= 6) {
      riskStratification = "INTERMEDIATE";
      clinicalInterpretation = "Equivocal for acute appendicitis; cross-sectional imaging (CT or US) and surgical consultation indicated.";
    } else {
      riskStratification = "HIGH";
      clinicalInterpretation = "High probability of acute appendicitis; urgent surgical consultation for appendectomy recommended.";
    }
  } else {
    riskStratification = "INSUFFICIENT_DATA_DO_NOT_STRATIFY";
    clinicalInterpretation = `Score is INCOMPLETE (${documentedPoints}/10 documented points). ${missingCriteria.length} clinical/laboratory criteria are unmeasured or undocumented. Do NOT classify into clinical risk tiers without complete data.`;
  }

  return {
    scoreName: "Alvarado Score for Acute Appendicitis",
    documentedPoints,
    maxPoints: 10,
    isComplete,
    documentedCriteria,
    missingCriteria,
    riskStratification,
    clinicalInterpretation,
  };
}

export interface QSOFAResult {
  scoreName: "quick Sequential Organ Failure Assessment (qSOFA)";
  documentedPoints: number;
  maxPoints: 3;
  isComplete: boolean;
  missingInputs: string[];
  isHighRiskForPoorOutcomes: boolean | null;
  clinicalInterpretation: string;
  safetyCaveat: string;
}

export function calculateQSOFA(encounter: PatientClinicalEncounter): QSOFAResult {
  let points = 0;
  const missingInputs: string[] = [];

  // 1. Respiratory Rate ≥ 22 /min
  if (encounter.vitals.respiratoryRate !== undefined) {
    if (encounter.vitals.respiratoryRate >= 22) points += 1;
  } else {
    missingInputs.push("Respiratory Rate (RR)");
  }

  // 2. Mentation (GCS < 15 or altered mental status)
  if (encounter.vitals.gcs !== undefined) {
    if (encounter.vitals.gcs < 15) points += 1;
  } else {
    missingInputs.push("Mental Status / Glasgow Coma Scale (GCS)");
  }

  // 3. Systolic Blood Pressure ≤ 100 mmHg
  if (encounter.vitals.systolicBp !== undefined) {
    if (encounter.vitals.systolicBp <= 100) points += 1;
  } else {
    missingInputs.push("Systolic Blood Pressure (SBP)");
  }

  const isComplete = missingInputs.length === 0;
  const isHighRisk = isComplete ? points >= 2 : null;

  return {
    scoreName: "quick Sequential Organ Failure Assessment (qSOFA)",
    documentedPoints: points,
    maxPoints: 3,
    isComplete,
    missingInputs,
    isHighRiskForPoorOutcomes: isHighRisk,
    clinicalInterpretation: isComplete
      ? points >= 2
        ? "qSOFA ≥ 2: High risk for poor clinical outcomes / in-hospital mortality. Prompt evaluation for organ dysfunction (full SOFA score) and ICU-level care."
        : "qSOFA < 2: Low bedside risk score. Does NOT rule out sepsis or early systemic infection."
      : `qSOFA is INCOMPLETE (${points}/3 documented). Missing inputs: ${missingInputs.join(", ")}. Cannot calculate definitive score.`,
    safetyCaveat: "CLINICAL SAFETY MANDATE: qSOFA is a bedside risk stratification tool for poor outcomes in suspected infection; it is NOT a screening or diagnostic test to rule sepsis out.",
  };
}

/* =====================================================================
 * 3. DIAGNOSTIC CRITERIA ENGINE (Revised Atlanta Criteria for Pancreatitis)
 * ===================================================================== */

export interface AtlantaPancreatitisEvaluation {
  criteriaMetCount: number;
  requiredCriteriaCount: 2;
  criterion1_characteristicPain: boolean;
  criterion2_lipaseOrAmylase3xUln: boolean;
  criterion3_characteristicImaging: boolean;
  isConfirmed: boolean;
  diagnosticRationale: string;
}

export function evaluateAtlantaPancreatitisCriteria(
  hasCharacteristicUpperPain: boolean,
  lipaseU_L?: number,
  lipaseUln?: number,
  hasCharacteristicImaging?: boolean
): AtlantaPancreatitisEvaluation {
  const uln = lipaseUln || 60; // Standard reference ULN ~60 U/L
  const criterion2 = lipaseU_L !== undefined ? lipaseU_L >= 3 * uln : false;
  const criterion1 = Boolean(hasCharacteristicUpperPain);
  const criterion3 = Boolean(hasCharacteristicImaging);

  let criteriaMet = 0;
  if (criterion1) criteriaMet++;
  if (criterion2) criteriaMet++;
  if (criterion3) criteriaMet++;

  const isConfirmed = criteriaMet >= 2;

  let rationale = "";
  if (isConfirmed) {
    rationale = `Meets Revised Atlanta Criteria for Acute Pancreatitis (${criteriaMet}/3 criteria satisfied: ${[
      criterion1 ? "Characteristic epigastric/upper abdominal pain" : null,
      criterion2 ? `Lipase ${lipaseU_L} U/L ≥ 3x ULN (${3 * uln} U/L)` : null,
      criterion3 ? "Characteristic imaging findings" : null,
    ].filter(Boolean).join("; ")}).`;
  } else if (criterion2 && !criterion1 && !criterion3) {
    rationale = `INSUFFICIENT CRITERIA: Serum lipase is elevated (≥ 3x ULN), but Revised Atlanta Criteria strictly requires AT LEAST 2 OF 3 criteria. In the absence of characteristic pain or imaging, isolated hyperlipasemia does NOT confirm acute pancreatitis (must consider renal impairment, bowel ischemia, macroamylasemia, or delayed presentation).`;
  } else {
    rationale = `Revised Atlanta Criteria NOT met (${criteriaMet}/3 criteria satisfied). Requires at least 2 of 3 criteria for confirmation.`;
  }

  return {
    criteriaMetCount: criteriaMet,
    requiredCriteriaCount: 2,
    criterion1_characteristicPain: criterion1,
    criterion2_lipaseOrAmylase3xUln: criterion2,
    criterion3_characteristicImaging: criterion3,
    isConfirmed,
    diagnosticRationale: rationale,
  };
}

/* =====================================================================
 * 4. ANATOMICAL LOCALIZATION & PATIENT-CONTEXT ENGINE
 * ===================================================================== */

export interface ClinicalDifferentialItem {
  rank: number;
  diseaseName: string;
  category: "PRIMARY_HYPOTHESIS" | "MUST_NOT_MISS_RULEOUT" | "SECONDARY_ALTERNATIVE";
  quadrant?: string;
  rationale: string;
  goldStandardImaging: string;
  firstLineTesting: string;
  surgicalConsultIndicated: boolean;
}

export interface AbdominalTriageAssessment {
  syndromeClassification: string;
  isUndifferentiated: boolean;
  missingLocalization: boolean;
  differentials: ClinicalDifferentialItem[];
  suppressedConditions: string[];
  mandatoryImmediateActions: string[];
}

export function assessAcuteAbdominalPain(encounter: PatientClinicalEncounter): AbdominalTriageAssessment {
  const suppressed: string[] = [];
  const mandatoryActions: string[] = [];

  // 1. Patient-context anatomical suppression
  if (encounter.biologicalSex === "male") {
    suppressed.push("Ectopic Pregnancy", "Ovarian Torsion", "Ruptured Ovarian Cyst", "Pelvic Inflammatory Disease (PID)");
  } else if (encounter.biologicalSex === "female") {
    suppressed.push("Testicular Torsion", "Epididymo-orchitis", "Prostatitis");
  }

  // 2. Anatomical localization gate
  const hasDocumentedQuadrant = Boolean(
    encounter.painQuadrant && encounter.painQuadrant !== "Undifferentiated" && encounter.painQuadrant !== "Diffuse"
  );

  // If no quadrant is documented
  if (!hasDocumentedQuadrant) {
    mandatoryActions.push("Mandatory Physical Examination: Palpate abdomen to establish exact anatomical quadrant, guarding, and peritoneal signs.");
    mandatoryActions.push("Do NOT rank single anatomical diagnoses as 'Priority 1' until pain location and chronology are verified.");

    const undiffDifferentials: ClinicalDifferentialItem[] = [
      {
        rank: 1,
        diseaseName: "Acute Appendicitis (if RLQ/periumbilical localization)",
        category: "MUST_NOT_MISS_RULEOUT",
        quadrant: "RLQ",
        rationale: "Most common surgical emergency; pain classically begins periumbilically before migrating to RLQ.",
        goldStandardImaging: "Contrast-Enhanced CT Abdomen/Pelvis (adults) or Graded Compression Ultrasound (children/pregnancy)",
        firstLineTesting: "CBC with differential, CRP, urinalysis",
        surgicalConsultIndicated: true,
      },
      {
        rank: 2,
        diseaseName: "Acute Cholecystitis / Ascending Cholangitis (if RUQ localization)",
        category: "MUST_NOT_MISS_RULEOUT",
        quadrant: "RUQ",
        rationale: "Biliary colic or cystic duct obstruction; look for fever, RUQ tenderness, and Murphy sign.",
        goldStandardImaging: "Transabdominal Right Upper Quadrant Ultrasound (RUQ US) — First line",
        firstLineTesting: "Hepatic function panel (LFTs), Lipase, CBC",
        surgicalConsultIndicated: true,
      },
      {
        rank: 3,
        diseaseName: "Acute Pancreatitis (if Epigastric localization)",
        category: "MUST_NOT_MISS_RULEOUT",
        quadrant: "Epigastric",
        rationale: "Requires 2 of 3 Atlanta criteria: upper pain radiating to back, lipase ≥ 3x ULN, or imaging.",
        goldStandardImaging: "Abdominal CT with IV contrast (reserved for diagnostic uncertainty or failure to improve after 48-72h)",
        firstLineTesting: "Serum Lipase, CMP, Triglycerides",
        surgicalConsultIndicated: false,
      },
    ];

    // Male-specific time-critical urogenital emergency check
    if (encounter.biologicalSex === "male") {
      undiffDifferentials.push({
        rank: 4,
        diseaseName: "Testicular Torsion (if lower quadrant / groin / scrotal symptoms)",
        category: "MUST_NOT_MISS_RULEOUT",
        quadrant: "Scrotal / Lower Quadrant",
        rationale: "Time-critical surgical emergency (6-hour testicular salvage window); acute severe unilateral pain.",
        goldStandardImaging: "Emergent Scrotal Color Doppler Ultrasound — Do NOT delay surgical consult for imaging",
        firstLineTesting: "Immediate Urological Consultation",
        surgicalConsultIndicated: true,
      });
    }

    return {
      syndromeClassification: "Undifferentiated Acute Abdominal Pain with Pyrexia",
      isUndifferentiated: true,
      missingLocalization: true,
      differentials: undiffDifferentials,
      suppressedConditions: suppressed,
      mandatoryImmediateActions: mandatoryActions,
    };
  }

  // If RLQ pain is specifically documented
  if (encounter.painQuadrant === "RLQ") {
    const rlqDiffs: ClinicalDifferentialItem[] = [
      {
        rank: 1,
        diseaseName: "Acute Appendicitis",
        category: "PRIMARY_HYPOTHESIS",
        quadrant: "RLQ",
        rationale: "Documented RLQ tenderness with pyrexia; high clinical concern for appendiceal inflammation.",
        goldStandardImaging: "Contrast-Enhanced CT Abdomen/Pelvis (adults) or Graded Compression Ultrasound (children/pregnancy)",
        firstLineTesting: "CBC, CRP, Urinalysis, Alvarado score calculation",
        surgicalConsultIndicated: true,
      },
      {
        rank: 2,
        diseaseName: "Cecal Diverticulitis / Right-Sided Diverticulitis",
        category: "SECONDARY_ALTERNATIVE",
        quadrant: "RLQ",
        rationale: "Less common in young adults, but produces similar focal RLQ inflammation.",
        goldStandardImaging: "Contrast CT Abdomen/Pelvis",
        firstLineTesting: "CBC, CMP",
        surgicalConsultIndicated: false,
      },
      {
        rank: 3,
        diseaseName: "Mesenteric Adenitis / Terminal Ileitis (e.g. Crohn disease / Yersinia)",
        category: "SECONDARY_ALTERNATIVE",
        quadrant: "RLQ",
        rationale: "Common mimic in young patients following viral illness; enlarged mesenteric lymph nodes.",
        goldStandardImaging: "Abdominal Ultrasound or CT",
        firstLineTesting: "Stool cultures if diarrhea present",
        surgicalConsultIndicated: false,
      },
    ];

    if (encounter.biologicalSex === "male") {
      rlqDiffs.push({
        rank: 4,
        diseaseName: "Testicular Torsion / Epididymo-Orchitis",
        category: "MUST_NOT_MISS_RULEOUT",
        quadrant: "Inguinal / Scrotal",
        rationale: "Time-critical surgical emergency (6-hour testicular salvage window); referred lower quadrant pain from ipsilateral scrotal pathology; examine testes.",
        goldStandardImaging: "Scrotal Doppler Ultrasound",
        firstLineTesting: "Genital examination, Urinalysis",
        surgicalConsultIndicated: true,
      });
    }

    return {
      syndromeClassification: "Acute Right Lower Quadrant (RLQ) Abdominal Pain",
      isUndifferentiated: false,
      missingLocalization: false,
      differentials: rlqDiffs,
      suppressedConditions: suppressed,
      mandatoryImmediateActions: ["Obtain surgical consultation if peritoneal signs or imaging confirms appendicitis."],
    };
  }

  // RUQ pain documented
  if (encounter.painQuadrant === "RUQ") {
    return {
      syndromeClassification: "Acute Right Upper Quadrant (RUQ) Biliary / Hepatic Syndrome",
      isUndifferentiated: false,
      missingLocalization: false,
      differentials: [
        {
          rank: 1,
          diseaseName: "Acute Cholecystitis",
          category: "PRIMARY_HYPOTHESIS",
          quadrant: "RUQ",
          rationale: "Focal RUQ tenderness, fever, Murphy sign; cystic duct obstruction.",
          goldStandardImaging: "Transabdominal RUQ Ultrasound (First Line)",
          firstLineTesting: "LFTs, Lipase, CBC, Blood Cultures",
          surgicalConsultIndicated: true,
        },
        {
          rank: 2,
          diseaseName: "Acute Ascending Cholangitis (if jaundice present - Charcot Triad)",
          category: "MUST_NOT_MISS_RULEOUT",
          quadrant: "RUQ",
          rationale: "Life-threatening biliary tree infection; requires emergent decompression (ERCP).",
          goldStandardImaging: "RUQ Ultrasound followed by MRCP or ERCP",
          firstLineTesting: "Total Bilirubin, Blood Cultures, Lactate",
          surgicalConsultIndicated: true,
        },
      ],
      suppressedConditions: suppressed,
      mandatoryImmediateActions: ["Evaluate for Charcot triad (RUQ pain, fever, jaundice) and Reynolds pentad (shock, altered mental status)."],
    };
  }

  return {
    syndromeClassification: "Localized Abdominal Pain",
    isUndifferentiated: false,
    missingLocalization: false,
    differentials: [],
    suppressedConditions: suppressed,
    mandatoryImmediateActions: [],
  };
}

/* =====================================================================
 * 5. TREATMENT SAFETY & ALLERGY GOVERNANCE ENGINE
 * ===================================================================== */

export interface TreatmentSafetyCheck {
  allergyStatusDocumented: boolean;
  knownAllergies: string[];
  renalFunctionKnown: boolean;
  eGFR?: number;
  creatinineMg_dL?: number;
  safetyAlerts: string[];
  clinicianApprovalRequired: true;
}

export function evaluateTreatmentSafety(encounter: PatientClinicalEncounter): TreatmentSafetyCheck {
  const alerts: string[] = [];
  const allergyStatusDocumented = Boolean(encounter.allergies && encounter.allergies.length > 0);
  const knownAllergies = encounter.allergies || [];

  if (!allergyStatusDocumented) {
    alerts.push("CRITICAL ALLERGY ALERT: Patient allergy status is UNKNOWN. Confirm drug allergies prior to prescribing or administering antibiotics or analgesia.");
  }

  const renalFunctionKnown = Boolean(encounter.labs?.creatinineMg_dL !== undefined);
  if (!renalFunctionKnown) {
    alerts.push("RENAL SAFETY WARNING: Baseline renal function (serum creatinine / eGFR) is undocumented. Assess renal function prior to administering nephrotoxic agents or IV contrast CT.");
  }

  alerts.push("SURGICAL GOVERNANCE: Avoid blind narcotic or empiric antibiotic administration that could mask peritoneal signs prior to attending surgical physical examination.");

  return {
    allergyStatusDocumented,
    knownAllergies,
    renalFunctionKnown,
    eGFR: undefined,
    creatinineMg_dL: encounter.labs?.creatinineMg_dL,
    safetyAlerts: alerts,
    clinicianApprovalRequired: true,
  };
}
