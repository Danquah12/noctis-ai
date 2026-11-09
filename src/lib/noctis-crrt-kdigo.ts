// ============================================================================
// NOCTIS CRRT & ACUTE KIDNEY INJURY (KDIGO / FST / RCA) PROTOCOL ENGINE
// Standards: KDIGO AKI Guidelines (2012/2026), Furosemide Stress Test (Chawla 2013),
//            Regional Citrate Anticoagulation (RCA) Post-Filter iCa Protocol
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

export type KdigoStage = 0 | 1 | 2 | 3;

export interface CrrtPatientProfile {
  encounterId: string;
  patientAge: number;
  baselineCreatinineMgDl: number;
  currentCreatinineMgDl: number;
  urineOutputMlLast6Hours: number;
  patientWeightKg: number;
  bloodPh: number; // Normal 7.35 - 7.45
  serumPotassiumMeqL: number; // Normal 3.5 - 5.0
  serumBicarbonateMeqL: number; // Normal 22 - 28
  bloodUreaNitrogenMgDl: number; // BUN mg/dL
  pulmonaryEdemaRefractory: boolean;
  toxicIngestion?: "ETHYLENE_GLYCOL" | "METHANOL" | "LITHIUM" | "SALICYLATE" | "METFORMIN" | "NONE";
  uremicSymptoms?: ("ENCEPHALOPATHY" | "PERICARDITIS" | "BLEEDING" | "ASTERIXIS")[];
  fstUrineOutput2HoursMl?: number; // Furosemide Stress Test: < 200 mL in 2h is non-responsive
  // Regional Citrate Anticoagulation (RCA) parameters
  rcaActive?: boolean;
  circuitPostFilterIonizedCalciumMmolL?: number; // Target 0.25 - 0.35 mmol/L
  systemicIonizedCalciumMmolL?: number; // Target 1.10 - 1.30 mmol/L
  totalSerumCalciumMgDl?: number; // Total Ca in mg/dL
  proposedOrders?: string[];
}

export interface AeiouDialysisTriggers {
  acidosis: boolean;
  electrolytes: boolean;
  ingestion: boolean;
  overload: boolean;
  uremia: boolean;
  urgentIndicationPresent: boolean;
  criteriaDescriptions: string[];
}

export interface CrrtAssessmentReport {
  kdigoStaging: {
    stage: KdigoStage;
    stageDescription: string;
    creatinineCriteriaMet: boolean;
    oliguriaCriteriaMet: boolean;
    urineRateMlKgHr: number;
  };
  fstAssessment: {
    administered: boolean;
    responsive?: boolean;
    predictiveValue: string;
  };
  aeiouTriggers: AeiouDialysisTriggers;
  rcaStatus: {
    active: boolean;
    circuitPostFilterIcaStatus: string;
    systemicIcaStatus: string;
    totalToIonizedRatio?: number;
    citrateToxicityDetected: boolean;
    citrateDirective: string;
  };
  recommendedModality: "OBSERVATION" | "INTERMITTENT_HEMODIALYSIS" | "CONTINUOUS_RENAL_REPLACEMENT_THERAPY";
  trippedInvariants: string[];
  safetyDirectives: string[];
  spokenGuidance: string;
}

/**
 * Calculates KDIGO Acute Kidney Injury Staging
 * Stage 1: Cr 1.5-1.9x baseline OR >= 0.3 mg/dL increase; UO < 0.5 mL/kg/h for 6-12h
 * Stage 2: Cr 2.0-2.9x baseline; UO < 0.5 mL/kg/h for >= 12h
 * Stage 3: Cr >= 3.0x baseline OR Cr >= 4.0 mg/dL OR initiation of RRT; UO < 0.3 mL/kg/h for >= 24h OR Anuria >= 12h
 */
export function calculateKdigoStage(
  baselineCr: number,
  currentCr: number,
  urineOutputMl6h: number,
  weightKg: number
): {
  stage: KdigoStage;
  stageDescription: string;
  creatinineCriteriaMet: boolean;
  oliguriaCriteriaMet: boolean;
  urineRateMlKgHr: number;
} {
  const urineRateMlKgHr = Number((urineOutputMl6h / (6 * Math.max(weightKg, 30))).toFixed(2));
  const crRatio = currentCr / Math.max(baselineCr, 0.1);
  const crDelta = currentCr - baselineCr;

  let crStage: KdigoStage = 0;
  if (currentCr >= 4.0 || crRatio >= 3.0) crStage = 3;
  else if (crRatio >= 2.0) crStage = 2;
  else if (crRatio >= 1.5 || crDelta >= 0.3) crStage = 1;

  let uoStage: KdigoStage = 0;
  if (urineRateMlKgHr < 0.3) uoStage = 3;
  else if (urineRateMlKgHr < 0.5) uoStage = 1;

  const finalStage = Math.max(crStage, uoStage) as KdigoStage;
  const descriptions: Record<KdigoStage, string> = {
    0: "No AKI Criteria Met",
    1: "KDIGO Stage 1 AKI (Mild)",
    2: "KDIGO Stage 2 AKI (Moderate)",
    3: "KDIGO Stage 3 AKI (Severe / Impending RRT Requirement)",
  };

  return {
    stage: finalStage,
    stageDescription: descriptions[finalStage],
    creatinineCriteriaMet: crStage > 0,
    oliguriaCriteriaMet: uoStage > 0,
    urineRateMlKgHr,
  };
}

/**
 * Assesses emergent renal replacement therapy (AEIOU) triggers
 */
export function evaluateAeiouTriggers(profile: CrrtPatientProfile): AeiouDialysisTriggers {
  const descriptions: string[] = [];

  // A: Acidosis
  const acidosis = profile.bloodPh < 7.15 && profile.serumBicarbonateMeqL < 12;
  if (acidosis) {
    descriptions.push(`Refractory Acidosis: pH ${profile.bloodPh.toFixed(2)} (< 7.15) with HCO3 ${profile.serumBicarbonateMeqL} mEq/L`);
  }

  // E: Electrolytes
  const electrolytes = profile.serumPotassiumMeqL >= 6.5;
  if (electrolytes) {
    descriptions.push(`Severe Hyperkalemia: Potassium ${profile.serumPotassiumMeqL.toFixed(1)} mEq/L (>= 6.5 mEq/L with cardiotoxicity risk)`);
  }

  // I: Ingestion
  const toxicIngestionPresent = Boolean(profile.toxicIngestion && profile.toxicIngestion !== "NONE");
  if (toxicIngestionPresent) {
    descriptions.push(`Dialyzable Toxic Ingestion: ${profile.toxicIngestion}`);
  }

  // O: Overload
  const overload = profile.pulmonaryEdemaRefractory;
  if (overload) {
    descriptions.push("Refractory Volume Overload: Pulmonary edema with acute hypoxemic failure resistant to diuretics");
  }

  // U: Uremia
  const uremia = Boolean(profile.uremicSymptoms && profile.uremicSymptoms.length > 0) || profile.bloodUreaNitrogenMgDl >= 100;
  if (uremia) {
    const syms = profile.uremicSymptoms?.join(", ") || "Elevated BUN";
    descriptions.push(`Uremic Complications: BUN ${profile.bloodUreaNitrogenMgDl} mg/dL with ${syms}`);
  }

  const urgentIndicationPresent = acidosis || electrolytes || toxicIngestionPresent || overload || uremia;

  return {
    acidosis,
    electrolytes,
    ingestion: toxicIngestionPresent,
    overload,
    uremia,
    urgentIndicationPresent,
    criteriaDescriptions: descriptions,
  };
}

/**
 * Evaluates Comprehensive CRRT / KDIGO Management
 */
export function evaluateCrrtKdigoProtocol(profile: CrrtPatientProfile): CrrtAssessmentReport {
  const trippedInvariants: string[] = [];
  const safetyDirectives: string[] = [];

  const kdigo = calculateKdigoStage(
    profile.baselineCreatinineMgDl,
    profile.currentCreatinineMgDl,
    profile.urineOutputMlLast6Hours,
    profile.patientWeightKg
  );

  const aeiou = evaluateAeiouTriggers(profile);

  // Furosemide Stress Test (FST)
  let fstResponsive: boolean | undefined = undefined;
  let fstPredictiveValue = "FST not performed.";
  if (profile.fstUrineOutput2HoursMl !== undefined) {
    fstResponsive = profile.fstUrineOutput2HoursMl >= 200;
    fstPredictiveValue = fstResponsive
      ? `FST Responsive: ${profile.fstUrineOutput2HoursMl} mL in 2h (>= 200 mL). Low likelihood of progression to CRRT.`
      : `FST Non-Responsive: ${profile.fstUrineOutput2HoursMl} mL in 2h (< 200 mL). High specificity (87%) for progression to Stage 3 AKI and renal replacement.`;
  }

  // Regional Citrate Anticoagulation (RCA)
  let circuitIcaStatus = "RCA Inactive";
  let systemicIcaStatus = "Normal";
  let totalToIonizedRatio: number | undefined = undefined;
  let citrateToxicity = false;
  let citrateDirective = "Standard monitoring.";

  if (profile.rcaActive) {
    const postFilter = profile.circuitPostFilterIonizedCalciumMmolL ?? 0.3;
    const systemic = profile.systemicIonizedCalciumMmolL ?? 1.15;
    const totalCa = profile.totalSerumCalciumMgDl ?? 8.8;

    // Total Ca (mg/dL) / Systemic iCa (mmol/L) -> conversion ratio
    // Citrate accumulation ratio = Total Ca (mg/dL) / (Systemic iCa (mmol/L) * 4.0) or Total Ca (mmol/L) / iCa (mmol/L) > 2.5
    // Using Total Ca (mg/dL) / (Systemic iCa (mmol/L) * 4.004) where 1 mmol/L Ca = 4.0 mg/dL:
    const systemicIcaMgDl = systemic * 4.0;
    totalToIonizedRatio = Number((totalCa / Math.max(systemicIcaMgDl, 0.5)).toFixed(2));

    if (postFilter < 0.25) {
      circuitIcaStatus = `Circuit iCa ${postFilter.toFixed(2)} mmol/L is overly suppressed (< 0.25 mmol/L). Reduce citrate infusion rate by 10-15%.`;
    } else if (postFilter > 0.35) {
      circuitIcaStatus = `Circuit iCa ${postFilter.toFixed(2)} mmol/L is sub-therapeutic (> 0.35 mmol/L). Increase citrate infusion rate by 10-15% to prevent filter clotting.`;
    } else {
      circuitIcaStatus = `Circuit iCa ${postFilter.toFixed(2)} mmol/L is in optimal target range (0.25 - 0.35 mmol/L).`;
    }

    if (systemic < 1.1) {
      systemicIcaStatus = `Systemic iCa ${systemic.toFixed(2)} mmol/L is low (< 1.10 mmol/L). Titrate systemic calcium infusion upward.`;
    } else if (systemic > 1.3) {
      systemicIcaStatus = `Systemic iCa ${systemic.toFixed(2)} mmol/L is elevated (> 1.30 mmol/L). Reduce systemic calcium infusion.`;
    } else {
      systemicIcaStatus = `Systemic iCa ${systemic.toFixed(2)} mmol/L is in normal range (1.10 - 1.30 mmol/L).`;
    }

    if (totalToIonizedRatio > 2.5 || (profile.totalSerumCalciumMgDl && profile.totalSerumCalciumMgDl / (systemic * 4) > 2.5)) {
      citrateToxicity = true;
      citrateDirective = "CRITICAL ALERT: Citrate accumulation ('Citrate Lock') detected. Immediately stop citrate infusion, flush circuit, and switch to heparin anticoagulation or no-anticoagulation saline flushes.";
    }
  }

  // Recommended Modality
  let modality: "OBSERVATION" | "INTERMITTENT_HEMODIALYSIS" | "CONTINUOUS_RENAL_REPLACEMENT_THERAPY" = "OBSERVATION";
  if (aeiou.urgentIndicationPresent || kdigo.stage === 3) {
    modality = profile.bloodPh < 7.2 || profile.pulmonaryEdemaRefractory
      ? "CONTINUOUS_RENAL_REPLACEMENT_THERAPY"
      : "INTERMITTENT_HEMODIALYSIS";
  }

  // =========================================================================
  // NON-COMPENSATORY SAFETY INVARIANTS (21 U.S.C. § 360j(o)(1)(E))
  // =========================================================================

  // Invariant CF-CRRT-001: Dialysis Dysequilibrium Syndrome (DDS) Cerebral Edema Veto
  // Severe chronic azotemia (BUN >= 100 mg/dL) must NOT undergo aggressive ultra-high blood flow clearance on initial run
  if (profile.bloodUreaNitrogenMgDl >= 100 && profile.proposedOrders?.includes("MAX_CLEARANCE_ACUTE_HD")) {
    trippedInvariants.push("CF-CRRT-001");
    safetyDirectives.push(
      "SAFETY VETO [CF-CRRT-001]: Dialysis Dysequilibrium Syndrome Hazard. Severe chronic azotemia (BUN " +
        profile.bloodUreaNitrogenMgDl +
        " mg/dL >= 100 mg/dL) requires gentle clearance (Blood Flow 150-200 mL/min, 2-hour initial run, or CRRT). Rapid urea gradient reduction causes osmotic cerebral edema, brain herniation, and coma."
    );
  }

  // Invariant CF-CRRT-002: Citrate Toxicity & Metabolic Acidosis Lockout
  if (citrateToxicity && profile.rcaActive) {
    trippedInvariants.push("CF-CRRT-002");
    safetyDirectives.push(
      "SAFETY VETO [CF-CRRT-002]: Citrate Accumulation Toxicity ('Citrate Lock'). Total-to-ionized calcium ratio exceeds 2.5 (" +
        (totalToIonizedRatio?.toFixed(2) || "> 2.5") +
        ") with widening anion gap. Immediately discontinue regional citrate anticoagulation to avoid profound systemic hypocalcemia, myocardial depression, and fatal refractory shock."
    );
  }

  // Invariant CF-CRRT-003: Severe Hyperkalemia Delayed Nephrology Veto
  if (profile.serumPotassiumMeqL >= 6.5 && !profile.proposedOrders?.includes("EMERGENT_NEPHROLOGY_DIALYSIS")) {
    trippedInvariants.push("CF-CRRT-003");
    safetyDirectives.push(
      "SAFETY VETO [CF-CRRT-003]: Severe Cardiotoxic Hyperkalemia (K+ " +
        profile.serumPotassiumMeqL.toFixed(1) +
        " mEq/L >= 6.5 mEq/L). Emergent dialysis / CRRT mobilization is mandatory. Administer IV Calcium Gluconate immediately for myocardial stabilization while preparing circuit."
    );
  }

  // Invariant CF-CRRT-004: Metformin-Associated Lactic Acidosis (MALA) Washout Veto
  if (profile.toxicIngestion === "METFORMIN" && profile.bloodPh < 7.15 && !aeiou.urgentIndicationPresent) {
    trippedInvariants.push("CF-CRRT-004");
    safetyDirectives.push(
      "SAFETY VETO [CF-CRRT-004]: Metformin-Associated Lactic Acidosis (MALA). Profound acidemia (pH " +
        profile.bloodPh.toFixed(2) +
        ") in metformin toxicity requires urgent high-flux hemodialysis or CVVHDF for extracorporeal toxin elimination and acid-base correction."
    );
  }

  // Zero-Truncation Spoken Guidance
  const spokenParts = [
    `KDIGO Acute Kidney Injury Assessment for encounter ${profile.encounterId}.`,
    `Patient is staged at ${kdigo.stageDescription}. Baseline creatinine ${profile.baselineCreatinineMgDl.toFixed(2)} milligrams per deciliter, current creatinine ${profile.currentCreatinineMgDl.toFixed(2)} milligrams per deciliter.`,
    `Urine output is ${profile.urineOutputMlLast6Hours} milliliters over the last 6 hours, calculating to ${kdigo.urineRateMlKgHr} milliliters per kilogram per hour.`,
  ];

  if (fstPredictiveValue !== "FST not performed.") {
    spokenParts.push(fstPredictiveValue);
  }

  if (aeiou.urgentIndicationPresent) {
    spokenParts.push(
      `Emergent renal replacement therapy indicated under AEIOU criteria: ${aeiou.criteriaDescriptions.join("; ")}.`
    );
  } else {
    spokenParts.push("No immediate life-threatening AEIOU emergent dialysis criteria identified.");
  }

  spokenParts.push(`Recommended modality: ${modality.replace(/_/g, " ")}.`);

  if (profile.rcaActive) {
    spokenParts.push(
      `Regional Citrate Anticoagulation active. ${rcaStatusVoice(circuitIcaStatus, systemicIcaStatus, totalToIonizedRatio)}`
    );
  }

  if (trippedInvariants.length > 0) {
    spokenParts.push(
      `Warning: ${trippedInvariants.length} critical safety invariant alerts tripped: ${trippedInvariants.join(", ")}.`
    );
    spokenParts.push(safetyDirectives.join(" "));
  }

  return {
    kdigoStaging: kdigo,
    fstAssessment: {
      administered: profile.fstUrineOutput2HoursMl !== undefined,
      responsive: fstResponsive,
      predictiveValue: fstPredictiveValue,
    },
    aeiouTriggers: aeiou,
    rcaStatus: {
      active: Boolean(profile.rcaActive),
      circuitPostFilterIcaStatus: circuitIcaStatus,
      systemicIcaStatus,
      totalToIonizedRatio,
      citrateToxicityDetected: citrateToxicity,
      citrateDirective,
    },
    recommendedModality: modality,
    trippedInvariants,
    safetyDirectives,
    spokenGuidance: spokenParts.join(" "),
  };
}

function rcaStatusVoice(circuit: string, systemic: string, ratio?: number): string {
  let s = circuit + " " + systemic;
  if (ratio !== undefined) {
    s += ` Total-to-ionized calcium ratio is ${ratio}.`;
  }
  return s;
}
