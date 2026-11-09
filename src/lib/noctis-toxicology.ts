/**
 * NOCTIS HEALTH 500 - CLINICAL TOXICOLOGY & EMERGENCY TOXIDROME RESUSCITATION ENGINE
 * Standards: American College of Medical Toxicology (ACMT), Rumack-Matthew Nomogram,
 *             Hunter Serotonin Toxicity Criteria, Extracorporeal Treatments in Poisoning (EXTRIP)
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-TOX-001: Flumazenil Administration Veto in mixed cyclic antidepressant or chronic benzodiazepine use (Status Epilepticus Veto)
 * - CF-TOX-002: Delayed NAC Administration Veto (> 8h post-ingestion when APAP > treatment line; liver failure risk)
 * - CF-TOX-003: Serotonin Syndrome vs NMS Misclassification Veto (Hunter criteria clonus vs lead-pipe rigidity)
 * - CF-TOX-004: Emergent Hemodialysis Veto in severe refractory Salicylate toxicity (level > 100 mg/dL or severe acidosis)
 */

export type ToxidromeType =
  | "ANTICHOLINERGIC"
  | "CHOLINERGIC"
  | "SYMPATHOMIMETIC"
  | "OPIOID"
  | "SEDATIVE_HYPNOTIC"
  | "SEROTONIN_SYNDROME"
  | "NEUROLEPTIC_MALIGNANT_SYNDROME"
  | "NON_SPECIFIC";

export type PupilExam = "MIOSIS" | "MYDRIASIS" | "NORMAL";
export type SkinExam = "DIAPHORETIC" | "DRY_FLUSHED" | "NORMAL";
export type BowelSoundsExam = "HYPERACTIVE" | "HYPOACTIVE_ABSENT" | "NORMAL";
export type NeuromuscularExam = "CLONUS_HYPERREFLEXIA" | "LEAD_PIPE_RIGIDITY" | "TREMOR_FASCICULATIONS" | "NORMAL_OR_DEPRESSED";

export interface PatientToxProfile {
  patientId: string;
  patientName: string;
  ageYears: number;
  weightKg: number;
  suspectedToxins: string[];
  ingestionTimeHoursAgo: number;
  
  // Vitals
  heartRateBpm: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  respiratoryRatePerMin: number;
  temperatureCelsius: number;

  // Physical Exam
  pupils: PupilExam;
  skin: SkinExam;
  bowelSounds: BowelSoundsExam;
  neuromuscular: NeuromuscularExam;
  mentalStatus: "ALERT" | "AGITATED_DELIRIOUS" | "STUPOROUS_COMATOSE";

  // Laboratory Measurements
  serumAcetaminophenMcgPerMl?: number;
  serumSalicylateMgPerDl?: number;
  serumDigoxinNgPerMl?: number;
  arterialPh?: number;
  anionGapMeqPerL?: number;
  serumOsmolalGapMOsmPerKg?: number;
  chronicBenzodiazepineUser?: boolean;
  cyclicAntidepressantSuspected?: boolean;
}

export interface RumackMatthewResult {
  hoursPostIngestion: number;
  measuredLevelMcgPerMl: number;
  treatmentThresholdMcgPerMl: number;
  treatmentIndicated: boolean;
  highRiskToxicity: boolean;
  nacRegimen: {
    loadingBag: string;
    secondBag: string;
    thirdBag: string;
    totalDoseMg: number;
  };
}

export interface ToxicologyEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  detectedToxidrome: ToxidromeType;
  toxidromeConfidence: "HIGH" | "MODERATE" | "LOW";
  clinicalFindings: string[];
  rumackMatthew?: RumackMatthewResult;
  digiFabVialsIndicated?: number;
  salicylateIntervention?: {
    hemodialysisMandatory: boolean;
    urineAlkalinizationTargetPh: string;
    rationale: string;
  };
  highDoseInsulinIndicated: boolean;
  trippedInvariants: string[];
  mandatoryActions: string[];
  immediateAntidoteDirectives: string[];
}

// -------------------------------------------------------------------------
// RUMACK-MATTHEW NOMOGRAM & IV NAC CALCULATION
// -------------------------------------------------------------------------

/**
 * Calculates Rumack-Matthew treatment threshold at a given post-ingestion hour (4 - 24 hours)
 * Standard 150-line: Concentration at 4h = 150 mcg/mL, t1/2 = 4 hours
 * C(t) = 150 * (0.5)^((t - 4) / 4)
 */
export function calculateRumackMatthewThreshold(hoursPostIngestion: number): number {
  if (hoursPostIngestion < 4) return 150;
  if (hoursPostIngestion > 24) return 4.7; // extrapolates to 24h
  const exponent = (hoursPostIngestion - 4) / 4;
  const threshold = 150 * Math.pow(0.5, exponent);
  return Math.round(threshold * 10) / 10;
}

/**
 * Calculates 3-bag weight-based IV N-Acetylcysteine (NAC) dosing
 * Standard regimen: 150 mg/kg over 1h, then 50 mg/kg over 4h, then 100 mg/kg over 16h (Total: 300 mg/kg)
 * Cap weight at 100 kg for dosing to avoid fluid overload
 */
export function calculateNac3BagRegimen(weightKg: number) {
  const cappedWeight = Math.min(100, Math.max(10, weightKg));
  const loadMg = cappedWeight * 150;
  const bag2Mg = cappedWeight * 50;
  const bag3Mg = cappedWeight * 100;
  const totalMg = loadMg + bag2Mg + bag3Mg;

  return {
    loadingBag: `Bag 1 (Loading): ${loadMg.toLocaleString()} mg in 200 mL D5W over 60 minutes`,
    secondBag: `Bag 2 (Maintenance): ${bag2Mg.toLocaleString()} mg in 500 mL D5W over 4 hours (${(bag2Mg / 4).toFixed(0)} mg/hr)`,
    thirdBag: `Bag 3 (Maintenance): ${bag3Mg.toLocaleString()} mg in 1000 mL D5W over 16 hours (${(bag3Mg / 16).toFixed(0)} mg/hr)`,
    totalDoseMg: totalMg,
  };
}

/**
 * Calculates Digoxin-Specific Fab (DigiFab) vials
 * Formula for acute ingestion: Vials = Ingested Dose (mg) / 0.5 mg
 * Formula for steady-state serum level: Vials = (Serum Digoxin in ng/mL * Weight in kg) / 100
 */
export function calculateDigiFabVials(params: {
  serumDigoxinNgPerMl?: number;
  weightKg?: number;
  ingestedDoseMg?: number;
}): number {
  if (params.ingestedDoseMg && params.ingestedDoseMg > 0) {
    return Math.ceil(params.ingestedDoseMg / 0.5);
  }
  if (params.serumDigoxinNgPerMl && params.weightKg) {
    const raw = (params.serumDigoxinNgPerMl * params.weightKg) / 100;
    return Math.max(1, Math.ceil(raw));
  }
  return 10; // Empiric adult acute cardiac arrest / life-threatening toxicity dose
}

// -------------------------------------------------------------------------
// TOXIDROME CLASSIFICATION ENGINE
// -------------------------------------------------------------------------

export function classifyToxidrome(patient: PatientToxProfile): {
  toxidrome: ToxidromeType;
  confidence: "HIGH" | "MODERATE" | "LOW";
  clinicalFindings: string[];
} {
  const findings: string[] = [];

  // 1. Serotonin Syndrome (Hunter Criteria):
  // Must have serotonergic agent AND one of:
  // - Spontaneous clonus
  // - Inducible clonus + agitation or diaphoresis
  // - Ocular clonus + agitation or diaphoresis
  // - Tremor + hyperreflexia
  // - Hypertonia + temp > 38C + ocular or inducible clonus
  const isHunterPositive =
    patient.neuromuscular === "CLONUS_HYPERREFLEXIA" ||
    (patient.neuromuscular === "TREMOR_FASCICULATIONS" && patient.skin === "DIAPHORETIC" && patient.temperatureCelsius >= 38.0);

  if (isHunterPositive) {
    findings.push("Hunter Serotonin Toxicity Criteria POSITIVE (Clonus / Hyperreflexia + Diaphoresis / Hyperthermia)");
    return { toxidrome: "SEROTONIN_SYNDROME", confidence: "HIGH", clinicalFindings: findings };
  }

  // 2. Neuroleptic Malignant Syndrome (NMS):
  // Lead-pipe rigidity, hyperthermia, autonomic instability, altered mental status, hyporeflexia
  if (patient.neuromuscular === "LEAD_PIPE_RIGIDITY" && patient.temperatureCelsius >= 38.5) {
    findings.push("Severe generalized lead-pipe rigidity with extreme hyperthermia diagnostic for NMS");
    return { toxidrome: "NEUROLEPTIC_MALIGNANT_SYNDROME", confidence: "HIGH", clinicalFindings: findings };
  }

  // 3. Anticholinergic:
  // "Blind as a bat (mydriasis), mad as a hatter (delirium), red as a beet (flushed), hot as a hare (fever), dry as a bone (anhidrosis), bowel sounds absent"
  if (
    patient.pupils === "MYDRIASIS" &&
    patient.skin === "DRY_FLUSHED" &&
    patient.bowelSounds === "HYPOACTIVE_ABSENT" &&
    patient.heartRateBpm > 100
  ) {
    findings.push("Classic Anticholinergic Tetrad: Mydriasis, dry flushed skin, absent bowel sounds, tachycardia");
    return { toxidrome: "ANTICHOLINERGIC", confidence: "HIGH", clinicalFindings: findings };
  }

  // 4. Cholinergic (Muscarinic & Nicotinic - DUMBELS / SLUDGE):
  // Diaphoresis, miosis, hyperactive bowels / diarrhea, bradycardia/bronchorrhea, fasciculations
  if (
    patient.skin === "DIAPHORETIC" &&
    patient.pupils === "MIOSIS" &&
    patient.bowelSounds === "HYPERACTIVE"
  ) {
    findings.push("Cholinergic toxidrome (SLUDGE/DUMBELS): Profuse diaphoresis, pinpoint miosis, hyperactive bowel sounds");
    return { toxidrome: "CHOLINERGIC", confidence: "HIGH", clinicalFindings: findings };
  }

  // 5. Opioid Toxidrome:
  // Pinpoint miosis, respiratory depression (RR < 12), stupor/coma, bradycardia/hypotension
  if (
    patient.pupils === "MIOSIS" &&
    patient.respiratoryRatePerMin < 12 &&
    (patient.mentalStatus === "STUPOROUS_COMATOSE" || patient.bowelSounds === "HYPOACTIVE_ABSENT")
  ) {
    findings.push("Classic Opioid Triad: Pinpoint miosis, severe respiratory depression, central nervous system depression");
    return { toxidrome: "OPIOID", confidence: "HIGH", clinicalFindings: findings };
  }

  // 6. Sympathomimetic:
  // Tachycardia, hypertension, mydriasis, diaphoretic skin (distinguishes from anticholinergic dry skin!)
  if (
    patient.pupils === "MYDRIASIS" &&
    patient.skin === "DIAPHORETIC" &&
    patient.heartRateBpm > 100 &&
    patient.bloodPressureSystolic > 140
  ) {
    findings.push("Sympathomimetic hyperadrenergic state: Tachycardia, hypertension, mydriasis with active diaphoresis");
    return { toxidrome: "SYMPATHOMIMETIC", confidence: "HIGH", clinicalFindings: findings };
  }

  // 7. Sedative-Hypnotic:
  // Depressed mental status, normal or slightly small pupils, normal or dry skin, hypoventilation
  if (patient.mentalStatus === "STUPOROUS_COMATOSE" && patient.respiratoryRatePerMin <= 14) {
    findings.push("Sedative-hypnotic central nervous system depression");
    return { toxidrome: "SEDATIVE_HYPNOTIC", confidence: "MODERATE", clinicalFindings: findings };
  }

  return { toxidrome: "NON_SPECIFIC", confidence: "LOW", clinicalFindings: ["Undifferentiated toxic exposure or mixed ingestion"] };
}

// -------------------------------------------------------------------------
// COMPREHENSIVE CLINICAL TOXICOLOGY EVALUATION ENGINE
// -------------------------------------------------------------------------

export function evaluateToxicologyCase(patient: PatientToxProfile): ToxicologyEvaluationReport {
  const { toxidrome, confidence, clinicalFindings } = classifyToxidrome(patient);
  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];
  const immediateAntidoteDirectives: string[] = [];

  // 1. Acetaminophen (APAP) Evaluation & Rumack-Matthew Nomogram
  let rumackResult: RumackMatthewResult | undefined;
  if (patient.serumAcetaminophenMcgPerMl !== undefined && patient.ingestionTimeHoursAgo >= 4) {
    const threshold = calculateRumackMatthewThreshold(patient.ingestionTimeHoursAgo);
    const treatmentIndicated = patient.serumAcetaminophenMcgPerMl >= threshold;
    const highRisk = patient.serumAcetaminophenMcgPerMl >= threshold * 1.5;
    const nacRegimen = calculateNac3BagRegimen(patient.weightKg);

    rumackResult = {
      hoursPostIngestion: patient.ingestionTimeHoursAgo,
      measuredLevelMcgPerMl: patient.serumAcetaminophenMcgPerMl,
      treatmentThresholdMcgPerMl: threshold,
      treatmentIndicated,
      highRiskToxicity: highRisk,
      nacRegimen,
    };

    if (treatmentIndicated) {
      immediateAntidoteDirectives.push(
        `N-ACETYLCYSTEINE (NAC) 3-BAG IV PROTOCOL: ${nacRegimen.loadingBag}. Total: ${nacRegimen.totalDoseMg.toLocaleString()} mg.`
      );

      // Check Invariant CF-TOX-002: Delayed NAC Veto
      if (patient.ingestionTimeHoursAgo > 8) {
        trippedInvariants.push("CF-TOX-002");
        mandatoryActions.push(
          `DELAYED NAC HEPATOTOXICITY VETO: Presentation is ${patient.ingestionTimeHoursAgo}h post-ingestion (> 8h critical window). Immediately initiate IV NAC Bag 1 stat. Check AST/ALT, INR/PT, creatinine, and venous blood gas. Order continuous hepatology consultation for potential liver failure.`
        );
      }
    }
  }

  // 2. Flumazenil Safety Invariant Veto (CF-TOX-001)
  if (patient.chronicBenzodiazepineUser || patient.cyclicAntidepressantSuspected) {
    trippedInvariants.push("CF-TOX-001");
    mandatoryActions.push(
      "FLUMAZENIL CONTRAINDICATION VETO: Flumazenil is strictly contraindicated due to chronic benzodiazepine dependence or suspected cyclic antidepressant co-ingestion. Administration carries an unacceptable risk of refractory status epilepticus and fatal arrhythmia. Support airway and ventilation conservatively."
    );
  }

  // 3. Serotonin Syndrome vs NMS Differentiation (CF-TOX-003)
  if (toxidrome === "SEROTONIN_SYNDROME") {
    immediateAntidoteDirectives.push(
      "CYPROHEPTADINE PROTOCOL: Administer Cyproheptadine 12 mg PO/NG loading dose, followed by 2 mg every 2 hours if symptoms persist. Aggressive IV benzodiazepines (Lorazepam 2-4 mg IV) for neuromuscular agitation."
    );
  } else if (toxidrome === "NEUROLEPTIC_MALIGNANT_SYNDROME") {
    immediateAntidoteDirectives.push(
      "DANTROLENE & BROMOCRIPTINE PROTOCOL: Initiate Dantrolene 1-2.5 mg/kg IV bolus (max 10 mg/kg/day) and Bromocriptine 2.5-5 mg PO/NG TID. Active surface cooling for severe hyperthermia."
    );
  }

  // 4. Salicylate Toxicity & EXTRIP Hemodialysis Check (CF-TOX-004)
  let salicylateIntervention: ToxicologyEvaluationReport["salicylateIntervention"];
  if (patient.serumSalicylateMgPerDl !== undefined) {
    const level = patient.serumSalicylateMgPerDl;
    const isSevereAcidosis = patient.arterialPh !== undefined && patient.arterialPh < 7.20;
    const isExtripDialysis = level >= 100 || (level >= 90 && patient.arterialPh !== undefined && patient.arterialPh <= 7.30);

    let rationale = "Salicylate level below hemodialysis threshold. Titrate sodium bicarbonate.";
    if (isExtripDialysis || isSevereAcidosis) {
      rationale = `EXTRIP Criteria Met: Salicylate level ${level} mg/dL with arterial pH ${patient.arterialPh || "N/A"}. Emergent nephrology consultation for intermittent hemodialysis.`;
      trippedInvariants.push("CF-TOX-004");
      mandatoryActions.push(
        `EMERGENT HEMODIALYSIS VETO: Salicylate level is ${level} mg/dL (>= 100 threshold or refractory acidemia). Immediate bedside nephrology consultation and vascular access for emergent hemodialysis.`
      );
    }

    salicylateIntervention = {
      hemodialysisMandatory: isExtripDialysis || isSevereAcidosis,
      urineAlkalinizationTargetPh: "7.5 - 8.0 (IV Sodium Bicarbonate 150 mEq in 1000 mL D5W at 200 mL/hr, maintain potassium > 4.0 mEq/L)",
      rationale,
    };
    immediateAntidoteDirectives.push(
      `URINE ALKALINIZATION: ${salicylateIntervention.urineAlkalinizationTargetPh}.`
    );
  }

  // 5. Digoxin Toxicity & DigiFab
  let digiFabVials: number | undefined;
  if (patient.serumDigoxinNgPerMl !== undefined && patient.serumDigoxinNgPerMl > 2.0) {
    digiFabVials = calculateDigiFabVials({
      serumDigoxinNgPerMl: patient.serumDigoxinNgPerMl,
      weightKg: patient.weightKg,
    });
    immediateAntidoteDirectives.push(
      `DIGIFAB (DIGOXIN IMMUNE FAB): Administer ${digiFabVials} vials IV over 30 minutes. Strict avoidance of calcium salts.`
    );
  }

  // 6. Calcium Channel Blocker / Beta-Blocker Toxicity (HIET & Intralipid)
  const isShock = patient.bloodPressureSystolic < 90 && patient.heartRateBpm < 50;
  const isCcbOrBb = patient.suspectedToxins.some((t) => {
    const l = t.toLowerCase();
    return l.includes("diltiazem") || l.includes("verapamil") || l.includes("metoprolol") || l.includes("propranolol") || l.includes("amlodipine") || l.includes("atenolol");
  });
  const highDoseInsulinIndicated = isShock && isCcbOrBb;

  if (highDoseInsulinIndicated) {
    immediateAntidoteDirectives.push(
      "HIGH-DOSE INSULIN EUGLYCEMIA THERAPY (HIET): Regular Insulin 1 unit/kg IV bolus + 1 unit/kg/hr infusion. Titrate D10W/D50W to maintain euglycemia (100-200 mg/dL). Calcium Chloride 1g IV over 5 min."
    );
    immediateAntidoteDirectives.push(
      "INTRALIPID 20% RESCUE: 1.5 mL/kg IV bolus over 2-3 minutes, followed by 0.25 mL/kg/min continuous infusion (max 10-12 mL/kg over 24h)."
    );
  }

  // 7. Opioid Reversal
  if (toxidrome === "OPIOID") {
    immediateAntidoteDirectives.push(
      "NALOXONE PROTOCOL: Naloxone 0.04 - 0.4 mg IV initial titration (target respiratory rate >= 12, avoid precipitated acute withdrawal). Escalate to 2 mg IV if severe apnea or cardiac arrest."
    );
  }

  // 8. Cholinergic Reversal
  if (toxidrome === "CHOLINERGIC") {
    immediateAntidoteDirectives.push(
      "ATROPINE & PRALIDOXIME (2-PAM): Atropine 2-4 mg IV every 5 minutes until pulmonary secretions cleared ('drying of the lung fields'). Pralidoxime 1-2 g IV over 30 minutes for organophosphates."
    );
  }

  return {
    timestampIso: new Date().toISOString(),
    patientId: patient.patientId,
    patientName: patient.patientName,
    detectedToxidrome: toxidrome,
    toxidromeConfidence: confidence,
    clinicalFindings,
    rumackMatthew: rumackResult,
    digiFabVialsIndicated: digiFabVials,
    salicylateIntervention,
    highDoseInsulinIndicated,
    trippedInvariants,
    mandatoryActions,
    immediateAntidoteDirectives,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatToxicologySpokenSummary(report: ToxicologyEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Clinical toxicology emergency assessment for patient ${report.patientName}, identifier ${report.patientId}.`
  );

  parts.push(
    `Primary identified toxidrome is ${report.detectedToxidrome.replace(/_/g, " ").toLowerCase()}, evaluated with ${report.toxidromeConfidence.toLowerCase()} diagnostic confidence.`
  );

  if (report.clinicalFindings.length > 0) {
    parts.push(`Hallmark clinical findings: ${report.clinicalFindings.join("; ")}.`);
  }

  if (report.rumackMatthew) {
    parts.push(
      `Acetaminophen serum concentration is ${report.rumackMatthew.measuredLevelMcgPerMl} micrograms per milliliter at ${report.rumackMatthew.hoursPostIngestion} hours post-ingestion. Rumack-Matthew treatment threshold is ${report.rumackMatthew.treatmentThresholdMcgPerMl} micrograms per milliliter. Acetaminophen antidote therapy is ${report.rumackMatthew.treatmentIndicated ? "mandatory and indicated" : "not indicated at this time"}.`
    );
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(
      `CRITICAL TOXICOLOGY ALERT: ${report.trippedInvariants.length} non-compensatory patient safety invariants have tripped, including ${report.trippedInvariants.join(", ")}.`
    );
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push(
      "No absolute contraindication vetoes tripped. Proceed with standard targeted antidote resuscitation."
    );
  }

  if (report.immediateAntidoteDirectives.length > 0) {
    parts.push("Immediate antidote orders:");
    report.immediateAntidoteDirectives.forEach((dir, i) => {
      parts.push(`Order ${i + 1}: ${dir}`);
    });
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL TOXICOLOGY PRESETS
// -------------------------------------------------------------------------

export const TOX_PRESET_APAP_DELAYED: PatientToxProfile = {
  patientId: "TOX-APAP-001",
  patientName: "Chloe Martin (22yo F - Acute APAP Overdose)",
  ageYears: 22,
  weightKg: 60,
  suspectedToxins: ["Acetaminophen 500mg (Extra Strength Tylenol)"],
  ingestionTimeHoursAgo: 10, // > 8h delay trips CF-TOX-002
  heartRateBpm: 92,
  bloodPressureSystolic: 118,
  bloodPressureDiastolic: 74,
  respiratoryRatePerMin: 16,
  temperatureCelsius: 36.9,
  pupils: "NORMAL",
  skin: "NORMAL",
  bowelSounds: "NORMAL",
  neuromuscular: "NORMAL_OR_DEPRESSED",
  mentalStatus: "ALERT",
  serumAcetaminophenMcgPerMl: 140, // At 10h, threshold is ~53 mcg/mL!
};

export const TOX_PRESET_CCB_SHOCK: PatientToxProfile = {
  patientId: "TOX-SHOCK-002",
  patientName: "Harold Vance (61yo M - Diltiazem Overdose)",
  ageYears: 61,
  weightKg: 85,
  suspectedToxins: ["Diltiazem CD 240mg"],
  ingestionTimeHoursAgo: 3,
  heartRateBpm: 38, // Severe bradycardia
  bloodPressureSystolic: 72, // Cardiogenic shock
  bloodPressureDiastolic: 44,
  respiratoryRatePerMin: 18,
  temperatureCelsius: 35.8,
  pupils: "NORMAL",
  skin: "DIAPHORETIC",
  bowelSounds: "HYPOACTIVE_ABSENT",
  neuromuscular: "NORMAL_OR_DEPRESSED",
  mentalStatus: "STUPOROUS_COMATOSE",
};

export const TOX_PRESET_SEROTONIN_SYNDROME: PatientToxProfile = {
  patientId: "TOX-SER-003",
  patientName: "Liam O'Connor (29yo M - Sertraline + Dextromethorphan)",
  ageYears: 29,
  weightKg: 75,
  suspectedToxins: ["Sertraline 100mg", "Dextromethorphan cough syrup"],
  ingestionTimeHoursAgo: 4,
  heartRateBpm: 132,
  bloodPressureSystolic: 168,
  bloodPressureDiastolic: 102,
  respiratoryRatePerMin: 24,
  temperatureCelsius: 39.2, // Hyperthermia
  pupils: "MYDRIASIS",
  skin: "DIAPHORETIC",
  bowelSounds: "HYPERACTIVE",
  neuromuscular: "CLONUS_HYPERREFLEXIA", // Hunter criteria positive!
  mentalStatus: "AGITATED_DELIRIOUS",
};

export const TOX_PRESET_BENZO_CHRONIC: PatientToxProfile = {
  patientId: "TOX-BENZO-004",
  patientName: "Patricia Davis (54yo F - Alprazolam Overdose)",
  ageYears: 54,
  weightKg: 68,
  suspectedToxins: ["Alprazolam 2mg"],
  ingestionTimeHoursAgo: 2,
  heartRateBpm: 68,
  bloodPressureSystolic: 104,
  bloodPressureDiastolic: 66,
  respiratoryRatePerMin: 10,
  temperatureCelsius: 36.4,
  pupils: "NORMAL",
  skin: "NORMAL",
  bowelSounds: "HYPOACTIVE_ABSENT",
  neuromuscular: "NORMAL_OR_DEPRESSED",
  mentalStatus: "STUPOROUS_COMATOSE",
  chronicBenzodiazepineUser: true, // Trips CF-TOX-001
};
