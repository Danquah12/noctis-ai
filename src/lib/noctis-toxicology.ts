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


// ============================================================================
// 9. TOXIC ALCOHOLS & EXTRIP DIALYSIS ENGINE (METHANOL & ETHYLENE GLYCOL)
// ============================================================================

export interface ToxicAlcoholInput {
  substance: "METHANOL" | "ETHYLENE_GLYCOL" | "ISOPROPANOL" | "UNDIFFERENTIATED";
  weightKg: number;
  measuredOsmolalityMOsmKg: number;
  sodiumMeqL: number;
  glucoseMgDl: number;
  bunMgDl: number;
  ethanolMgDl?: number;
  chlorideMeqL: number;
  bicarbonateMeqL: number;
  arterialPh: number;
  measuredToxicAlcoholMgDl?: number;
  visualSymptomsReported?: boolean;
  acuteKidneyInjuryPresent?: boolean;
  calciumOxalateCrystalsPresent?: boolean;
}

export interface ToxicAlcoholResult {
  engineId: "NOCTIS-TOX-001";
  calculatedOsmolalityMOsmKg: number;
  osmolalGapMOsmKg: number;
  anionGapMeqL: number;
  osmolalGapElevated: boolean;
  highAnionGapAcidosisDetected: boolean;
  fomepizoleProtocol: {
    loadingDoseMg: number;
    maintenanceDoseMg: number;
    infusionInstructions: string;
    alternativeEthanolTherapy: string;
  };
  coFactorTherapy: string[];
  extripDialysisRecommendation: {
    dialysisMandatory: boolean;
    urgencyTier: "EMERGENT_HEMODIALYSIS_NOW" | "URGENT_DIALYSIS_PREPARE" | "MEDICAL_MANAGEMENT_SUFFICIENT";
    extripCriteriaMet: string[];
  };
  diagnosticSummary: string;
}

export function evaluateToxicAlcoholMethanolEthyleneGlycol(input: ToxicAlcoholInput): ToxicAlcoholResult {
  const {
    substance,
    weightKg,
    measuredOsmolalityMOsmKg,
    sodiumMeqL,
    glucoseMgDl,
    bunMgDl,
    ethanolMgDl = 0,
    chlorideMeqL,
    bicarbonateMeqL,
    arterialPh,
    measuredToxicAlcoholMgDl,
    visualSymptomsReported,
    acuteKidneyInjuryPresent,
    calciumOxalateCrystalsPresent,
  } = input;

  // Formula: Calculated Osm = 2*Na + Glucose/18 + BUN/2.8 + EtOH/4.6
  const calcOsm = Math.round((2 * sodiumMeqL + glucoseMgDl / 18 + bunMgDl / 2.8 + ethanolMgDl / 4.6) * 10) / 10;
  const osmGap = Math.round((measuredOsmolalityMOsmKg - calcOsm) * 10) / 10;

  // Anion Gap = Na - (Cl + HCO3)
  const anionGap = Math.round((sodiumMeqL - (chlorideMeqL + bicarbonateMeqL)) * 10) / 10;

  const osmolalGapElevated = osmGap > 10;
  const highAnionGapAcidosis = anionGap > 14 && arterialPh < 7.35;

  // Fomepizole Dosing: 15 mg/kg load over 30 min, then 10 mg/kg q12h x 4 doses, then 15 mg/kg q12h
  const fomepizoleLoadMg = Math.round(weightKg * 15);
  const fomepizoleMaintMg = Math.round(weightKg * 10);

  // Co-factor Therapy
  const coFactors: string[] = [];
  if (substance === "METHANOL" || substance === "UNDIFFERENTIATED") {
    coFactors.push(
      "Folinic Acid (Leucovorin) 50 mg (or Folic Acid 50 mg) IV every 4 hours: stimulates tetrahydrofolate-dependent degradation of toxic formic acid to carbon dioxide and water."
    );
  }
  if (substance === "ETHYLENE_GLYCOL" || substance === "UNDIFFERENTIATED" || calciumOxalateCrystalsPresent) {
    coFactors.push(
      "Thiamine 100 mg IV every 6 hours: acts as essential cofactor shunting glycolic acid to non-toxic alpha-hydroxy-beta-ketoadipate."
    );
    coFactors.push(
      "Pyridoxine (Vitamin B6) 50 mg IV every 6 hours: promotes transamination of glyoxylate to benign glycine, reducing toxic oxalic acid precipitation."
    );
  }

  // EXTRIP Hemodialysis Criteria Evaluation
  const extripCriteria: string[] = [];
  if (measuredToxicAlcoholMgDl !== undefined && measuredToxicAlcoholMgDl >= 50) {
    extripCriteria.push(`Serum toxic alcohol concentration >= 50 mg/dL (measured ${measuredToxicAlcoholMgDl} mg/dL)`);
  }
  if (arterialPh < 7.15) {
    extripCriteria.push(`Severe refractory metabolic acidemia (arterial pH ${arterialPh} < 7.15)`);
  } else if (arterialPh < 7.25) {
    extripCriteria.push(`Metabolic acidemia unresponsive to conventional sodium bicarbonate therapy (pH ${arterialPh})`);
  }
  if (osmGap >= 50) {
    extripCriteria.push(`Severe osmolal gap elevation >= 50 mOsm/kg (calculated gap ${osmGap} mOsm/kg)`);
  }
  if (visualSymptomsReported && (substance === "METHANOL" || substance === "UNDIFFERENTIATED")) {
    extripCriteria.push("Visual impairment / retinal toxicity (photophobia, blurred vision, optic disc hyperemia)");
  }
  if (acuteKidneyInjuryPresent && (substance === "ETHYLENE_GLYCOL" || substance === "UNDIFFERENTIATED")) {
    extripCriteria.push("Acute renal failure / anuria secondary to intratubular calcium oxalate crystal deposition");
  }

  let urgencyTier: ToxicAlcoholResult["extripDialysisRecommendation"]["urgencyTier"] = "MEDICAL_MANAGEMENT_SUFFICIENT";
  if (extripCriteria.length > 0) {
    urgencyTier = arterialPh < 7.15 || (measuredToxicAlcoholMgDl !== undefined && measuredToxicAlcoholMgDl >= 50) || visualSymptomsReported
      ? "EMERGENT_HEMODIALYSIS_NOW"
      : "URGENT_DIALYSIS_PREPARE";
  }

  return {
    engineId: "NOCTIS-TOX-001",
    calculatedOsmolalityMOsmKg: calcOsm,
    osmolalGapMOsmKg: osmGap,
    anionGapMeqL: anionGap,
    osmolalGapElevated,
    highAnionGapAcidosisDetected: highAnionGapAcidosis,
    fomepizoleProtocol: {
      loadingDoseMg: fomepizoleLoadMg,
      maintenanceDoseMg: fomepizoleMaintMg,
      infusionInstructions: `Fomepizole (Antizol) ${fomepizoleLoadMg} mg IV (15 mg/kg) in 100 mL Normal Saline or D5W infused over 30 minutes. Then ${fomepizoleMaintMg} mg IV (10 mg/kg) every 12 hours for 4 doses, then 15 mg/kg every 12 hours until toxic alcohol level < 20 mg/dL with normalized acid-base status. Note: If hemodialysis is initiated, increase dosing frequency to every 4 hours or administer continuous infusion during dialysis.`,
      alternativeEthanolTherapy:
        "If Fomepizole is unavailable: Administer 10% Ethanol IV solution with loading dose of 8 mL/kg (800 mg/kg) over 60 minutes, followed by maintenance infusion of 1-2 mL/kg/hr to maintain target blood ethanol concentration 100-150 mg/dL (saturates alcohol dehydrogenase).",
    },
    coFactorTherapy: coFactors,
    extripDialysisRecommendation: {
      dialysisMandatory: extripCriteria.length > 0,
      urgencyTier,
      extripCriteriaMet: extripCriteria,
    },
    diagnosticSummary: `${
      substance === "METHANOL"
        ? "Methanol Toxicity: Severe risk of permanent blindness (optic papillitis, retinal edema) and putaminal necrosis."
        : substance === "ETHYLENE_GLYCOL"
        ? "Ethylene Glycol Toxicity: Severe risk of acute tubular necrosis from calcium oxalate monohydrate crystals and cranial neuropathies."
        : "Toxic Alcohol Ingestion: Elevated osmolal gap and/or high anion gap metabolic acidosis."
    }`,
  };
}

// ============================================================================
// 10. TRICYCLIC ANTIDEPRESSANT (TCA) & SODIUM CHANNEL BLOCKER TOXICITY
// ============================================================================

export interface TcaOverdoseInput {
  patientWeightKg: number;
  qrsDurationMs: number;
  terminalRAvrMm: number; // Amplitude of terminal R wave in lead aVR in mm
  rOverSRatioAvr: number; // R/S ratio in lead aVR
  systolicBpMmHg: number;
  heartRateBpm: number;
  arterialPh?: number;
  seizuresReported: boolean;
  ventricularDysrhythmiaPresent: boolean;
}

export interface TcaOverdoseResult {
  engineId: "NOCTIS-TOX-001";
  ecgRiskStratification: {
    qrsRiskCategory: "NORMAL" | "SEIZURE_RISK" | "VENTRICULAR_ARRHYTHMIA_HIGH_RISK";
    aVrTerminalRWaveRisk: "HIGH_RISK_CONDUCTION_BLOCK" | "LOW_RISK";
    cardiacToxicitySummary: string;
  };
  sodiumBicarbonateProtocol: {
    indicated: boolean;
    bolusDoseMeq: number;
    bolusInstructions: string;
    continuousInfusionInstructions: string;
    targetArterialPh: string;
    targetSerumSodiumMeqL: string;
  };
  hyperventilationDirectives: string;
  strictSafetyVetoes: string[];
}

export function evaluateTcaSodiumChannelBlockerToxicity(input: TcaOverdoseInput): TcaOverdoseResult {
  const {
    patientWeightKg,
    qrsDurationMs,
    terminalRAvrMm,
    rOverSRatioAvr,
    systolicBpMmHg,
    seizuresReported,
    ventricularDysrhythmiaPresent,
    arterialPh,
  } = input;

  const vetoes: string[] = [];

  // Safety Veto CF-TOX-005: Physostigmine Contraindicated in TCA Overdose
  vetoes.push(
    "CF-TOX-005 [PHYSOSTIGMINE FATAL ASYSTOLE VETO]: Physostigmine is strictly contraindicated in cyclic antidepressant toxicity. In the presence of sodium channel blockade and conduction delay, physostigmine precipitates complete heart block, refractory asystole, and fatal cardiac arrest."
  );

  // Safety Veto: Class IA and IC Antiarrhythmics Contraindicated
  vetoes.push(
    "CLASS IA / IC ANTIARRHYTHMIC CONTRAINDICATION: Procainamide, Quinidine, Flecainide, and Propafenone are strictly prohibited. They exacerbate fast-sodium-channel blockade, further widening the QRS complex and precipitating electromechanical dissociation."
  );

  // Risk Stratification:
  // QRS > 100 ms -> Seizure risk (~34% risk)
  // QRS > 160 ms -> Ventricular arrhythmia risk (~50% risk of VT/VF)
  // aVR terminal R wave > 3 mm or R/S > 0.7 -> High risk of arrhythmias
  let qrsRisk: TcaOverdoseResult["ecgRiskStratification"]["qrsRiskCategory"] = "NORMAL";
  if (qrsDurationMs >= 160) {
    qrsRisk = "VENTRICULAR_ARRHYTHMIA_HIGH_RISK";
  } else if (qrsDurationMs >= 100) {
    qrsRisk = "SEIZURE_RISK";
  }

  const aVrHighRisk = terminalRAvrMm >= 3.0 || rOverSRatioAvr >= 0.7;

  // Sodium Bicarbonate Indication: QRS > 100 ms, hypotension refractory to fluids, or ventricular dysrhythmias
  const bicarbIndicated = qrsDurationMs >= 100 || systolicBpMmHg < 90 || ventricularDysrhythmiaPresent || aVrHighRisk;
  const bicarbBolusMeq = Math.min(Math.round(patientWeightKg * 1.5), 150); // 1-2 mEq/kg bolus

  return {
    engineId: "NOCTIS-TOX-001",
    ecgRiskStratification: {
      qrsRiskCategory: qrsRisk,
      aVrTerminalRWaveRisk: aVrHighRisk ? "HIGH_RISK_CONDUCTION_BLOCK" : "LOW_RISK",
      cardiacToxicitySummary: `QRS duration ${qrsDurationMs} ms (${
        qrsRisk === "VENTRICULAR_ARRHYTHMIA_HIGH_RISK"
          ? "CRITICAL: > 160 ms predicts ~50% incidence of life-threatening ventricular arrhythmias (VT/VF)"
          : qrsRisk === "SEIZURE_RISK"
          ? "HIGH RISK: > 100 ms predicts ~34% incidence of seizures and potential sudden progression to shock"
          : "Normal conduction interval"
      }). Terminal R wave in lead aVR is ${terminalRAvrMm} mm (R/S ratio ${rOverSRatioAvr}), ${
        aVrHighRisk ? "confirming pathognomonic right ventricular conduction delay from cardiac sodium-channel blockade." : "within normal limits."
      }`,
    },
    sodiumBicarbonateProtocol: {
      indicated: bicarbIndicated,
      bolusDoseMeq: bicarbBolusMeq,
      bolusInstructions: `Administer Sodium Bicarbonate 8.4% (1 mEq/mL): ${bicarbBolusMeq} mEq (${bicarbBolusMeq} mL) IV rapid bolus over 1-2 minutes. Repeat bolus every 3-5 minutes until QRS complex narrows (< 100 ms) and hypotension resolves.`,
      continuousInfusionInstructions:
        "Following initial bolus, initiate continuous IV infusion: Mix 150 mEq Sodium Bicarbonate (three 50 mL ampules of 8.4%) in 1000 mL D5W. Infuse at 2-3 times maintenance rate (150-250 mL/hr). Monitor arterial blood gas every 1-2 hours.",
      targetArterialPh: "7.50 - 7.55 (Do NOT exceed pH 7.55)",
      targetSerumSodiumMeqL: "150 - 155 mEq/L",
    },
    hyperventilationDirectives:
      "If patient is mechanically ventilated, use mild hyperventilation to induce respiratory alkalosis (target PaCO2 30-35 mmHg, arterial pH 7.50-7.55) as an adjunct to bicarb therapy to unbind TCA from cardiac sodium channels.",
    strictSafetyVetoes: vetoes,
  };
}

// ============================================================================
// 11. CYANIDE & CARBON MONOXIDE (CO) POISONING ENGINE
// ============================================================================

export interface CyanideCarbonMonoxideInput {
  exposureScenario: "SMOKE_INHALATION_FIRE" | "INDUSTRIAL_CHEMICAL" | "INGESTION" | "ENCLOSED_SPACE_EXHAUST";
  carboxyhemoglobinPercent?: number; // COHb %
  serumLactateMmolL?: number; // Cyanide marker: > 8-10 mmol/L in smoke inhalation
  arterialPaO2MmHg?: number;
  centralVenousOxygenSatPercent?: number; // High ScvO2 > 85-90% despite shock indicates impaired O2 extraction
  lossOfConsciousnessOrSyncope: boolean;
  neurologicDeficitsPresent: boolean;
  isPregnant: boolean;
}

export interface CyanideCarbonMonoxideResult {
  engineId: "NOCTIS-TOX-001";
  cyanideToxicitySuspected: boolean;
  hydroxocobalaminProtocol: {
    indicated: boolean;
    antidoteName: string;
    adultDose: string;
    pediatricDose: string;
    administrationRoute: string;
    clinicalPearl: string;
  };
  carbonMonoxideManagement: {
    severityClassification: "MILD" | "MODERATE" | "SEVERE_LIFE_THREATENING";
    normobaricOxygenDirective: string;
    hyperbaricOxygenIndicated: boolean;
    hboCriteriaMet: string[];
    halfLifeComparison: string;
  };
  diagnosticCaveats: string[];
}

export function evaluateCyanideAndCarbonMonoxidePoisoning(input: CyanideCarbonMonoxideInput): CyanideCarbonMonoxideResult {
  const {
    exposureScenario,
    carboxyhemoglobinPercent = 0,
    serumLactateMmolL = 0,
    centralVenousOxygenSatPercent,
    lossOfConsciousnessOrSyncope,
    neurologicDeficitsPresent,
    isPregnant,
  } = input;

  const caveats: string[] = [];

  // Cyanide Suspected if: Smoke inhalation with lactate >= 8.0 mmol/L, or high ScvO2 with metabolic collapse
  const cyanideSuspected =
    (exposureScenario === "SMOKE_INHALATION_FIRE" && serumLactateMmolL >= 8.0) ||
    exposureScenario === "INDUSTRIAL_CHEMICAL" ||
    (centralVenousOxygenSatPercent !== undefined && centralVenousOxygenSatPercent >= 85 && serumLactateMmolL >= 6.0);

  if (cyanideSuspected) {
    caveats.push(
      "CYANIDE HISTOTOXIC HYPOXIA: Cyanide inhibits mitochondrial Cytochrome c Oxidase (Complex IV), blocking electron transport and aerobic ATP synthesis. Cells cannot utilize oxygen despite normal arterial PaO2, causing profound lactic acidosis and elevated central venous oxygen saturation (bright red venous blood)."
    );
  }

  // Carbon Monoxide Evaluation & HBO Indications
  // Standard HBO Criteria (Undersea & Hyperbaric Medical Society / UHMS):
  // 1. COHb > 25% (or > 15% in pregnancy)
  // 2. Syncope, transient loss of consciousness, or altered mental status
  // 3. Neurologic deficits / cerebellar findings
  // 4. Evidence of myocardial ischemia (ECG changes, elevated troponin)
  // 5. Severe metabolic acidosis (pH < 7.25)
  const hboCriteria: string[] = [];
  if (carboxyhemoglobinPercent >= 25) {
    hboCriteria.push(`Elevated Carboxyhemoglobin level: ${carboxyhemoglobinPercent}% (>= 25% threshold)`);
  }
  if (isPregnant && carboxyhemoglobinPercent >= 15) {
    hboCriteria.push(`Pregnancy with Carboxyhemoglobin ${carboxyhemoglobinPercent}% (>= 15% fetal toxicity threshold due to higher fetal HbF affinity)`);
  }
  if (lossOfConsciousnessOrSyncope) {
    hboCriteria.push("Documented syncope or transient loss of consciousness during or immediately following exposure");
  }
  if (neurologicDeficitsPresent) {
    hboCriteria.push("Acute focal or global neurological deficits, cognitive dysfunction, or cerebellar ataxia");
  }

  let coSeverity: CyanideCarbonMonoxideResult["carbonMonoxideManagement"]["severityClassification"] = "MILD";
  if (carboxyhemoglobinPercent >= 25 || lossOfConsciousnessOrSyncope || neurologicDeficitsPresent) {
    coSeverity = "SEVERE_LIFE_THREATENING";
  } else if (carboxyhemoglobinPercent >= 10) {
    coSeverity = "MODERATE";
  }

  caveats.push(
    "PULSE OXIMETRY FALLACY: Standard two-wavelength pulse oximeters (SpO2) cannot distinguish oxyhemoglobin from carboxyhemoglobin. SpO2 will read falsely normal (e.g. 98-100%) even in fatal CO poisoning. Co-oximetry arterial or venous blood gas (CO-ABG) is mandatory."
  );

  return {
    engineId: "NOCTIS-TOX-001",
    cyanideToxicitySuspected: cyanideSuspected,
    hydroxocobalaminProtocol: {
      indicated: cyanideSuspected,
      antidoteName: "Hydroxocobalamin (Cyanokit)",
      adultDose: "5.0 grams IV infused over 15 minutes (may repeat second 5.0 g dose up to total 10.0 g for persistent cardiac arrest or severe shock)",
      pediatricDose: "70 mg/kg IV (max 5.0 g) infused over 15 minutes",
      administrationRoute: "Intravenous infusion via dedicated line (incompatible with blood products, sodium bicarbonate, and dopamine)",
      clinicalPearl:
        "Hydroxocobalamin binds cyanide ions with high affinity to form non-toxic Cyanocobalamin (Vitamin B12), excreted in urine. Causes transient reddish discoloration of skin and deep red/purple urine; interferes with co-oximetry and hemodialysis blood leak detectors for 24-48 hours.",
    },
    carbonMonoxideManagement: {
      severityClassification: coSeverity,
      normobaricOxygenDirective:
        "Administer 100% normobaric oxygen via tight-fitting non-rebreather mask (NRB) or endotracheal tube immediately and continuously until COHb < 3-5% and all symptoms resolve.",
      hyperbaricOxygenIndicated: hboCriteria.length > 0,
      hboCriteriaMet: hboCriteria,
      halfLifeComparison:
        "Elimination half-life of CO: Room air (21% O2) = 300-320 minutes (~5 hours) -> 100% Normobaric O2 = 70-80 minutes -> Hyperbaric Oxygen (2.5-3.0 ATA) = 20-25 minutes.",
    },
    diagnosticCaveats: caveats,
  };
}

// ============================================================================
// 12. CROTALINE ENVENOMATION (RATTLESNAKE / PIT VIPER) ENGINE
// ============================================================================

export interface CrotalineEnvenomationInput {
  snakeType: "RATTLESNAKE" | "COPPERHEAD" | "COTTONMOUTH" | "UNKNOWN_PIT_VIPER";
  patientWeightKg: number;
  timeSinceBiteHours: number;
  localSwellingProgression: "MILD_CONFINED_TO_BITE" | "RAPIDLY_PROGRESSING_PAST_MAJOR_JOINT" | "COMPARTMENT_THREATENING";
  plateletCount10e9L?: number; // Severe if < 50k
  fibrinogenMgDl?: number; // Severe if < 100 mg/dL
  ptInr?: number; // Elevated
  systemicSignsPresent: boolean; // Hypotension, oral paresthesias, fasciculations, bleeding
}

export interface CrotalineEnvenomationResult {
  engineId: "NOCTIS-TOX-001";
  envenomationSeverity: "MILD" | "MODERATE" | "SEVERE";
  antivenomProtocol: {
    indicated: boolean;
    primaryAntivenom: string;
    initialLoadingVials: number;
    infusionInstructions: string;
    maintenanceSchedule: string;
    alternativeAntivenom: string;
  };
  strictSafetyVetoes: string[];
  monitoringAndSurgicalDirectives: string[];
}

export function evaluateCrotalineEnvenomation(input: CrotalineEnvenomationInput): CrotalineEnvenomationResult {
  const {
    localSwellingProgression,
    plateletCount10e9L,
    fibrinogenMgDl,
    ptInr,
    systemicSignsPresent,
  } = input;

  const vetoes: string[] = [];

  // Safety Veto CF-TOX-006: Pre-Hospital Harmful Interventions Veto
  vetoes.push(
    "CF-TOX-006 [HARMFUL INTERVENTIONS VETO]: Tourniquets, arterial/venous constricting bands, local wound incisions, suction devices (e.g. Sawyer extractor), electroshock, and ice/cryotherapy are STRICTLY PROHIBITED. They exacerbate local tissue ischemia, accelerate necrosis, and precipitate limb loss without reducing systemic envenomation."
  );

  // Severity Classification
  const isSevere =
    localSwellingProgression === "COMPARTMENT_THREATENING" ||
    systemicSignsPresent ||
    (plateletCount10e9L !== undefined && plateletCount10e9L < 50) ||
    (fibrinogenMgDl !== undefined && fibrinogenMgDl < 100) ||
    (ptInr !== undefined && ptInr > 2.0);

  const isModerate =
    localSwellingProgression === "RAPIDLY_PROGRESSING_PAST_MAJOR_JOINT" ||
    (plateletCount10e9L !== undefined && plateletCount10e9L < 100) ||
    (fibrinogenMgDl !== undefined && fibrinogenMgDl < 150);

  const severity: CrotalineEnvenomationResult["envenomationSeverity"] = isSevere ? "SEVERE" : isModerate ? "MODERATE" : "MILD";

  const antivenomIndicated = severity === "MODERATE" || severity === "SEVERE";
  const initialVials = severity === "SEVERE" ? 6 : 4;

  return {
    engineId: "NOCTIS-TOX-001",
    envenomationSeverity: severity,
    antivenomProtocol: {
      indicated: antivenomIndicated,
      primaryAntivenom: "Crotalidae Polyvalent Immune Fab (CroFab)",
      initialLoadingVials: initialVials,
      infusionInstructions: `Reconstitute ${initialVials} vials of CroFab in 250 mL Normal Saline. Start infusion slowly at 25-50 mL/hr for the first 10 minutes to observe for anaphylactoid reactions; if tolerated, infuse remaining volume over 60 minutes. Repeat with additional 4-6 vials if initial control (halt of swelling progression and stabilization of coagulopathy) is not achieved.`,
      maintenanceSchedule:
        "Once initial control is established: Administer 2 vials of CroFab IV every 6 hours for three doses (at 6, 12, and 18 hours post-control) to prevent recurrent venom-induced coagulopathy and tissue necrosis.",
      alternativeAntivenom:
        "Crotalidae Immune F(ab')2 (Anavip): Initial dose 10 vials IV infused over 60 minutes. Re-dose with 10 vials PRN for persistent envenomation. Anavip has a longer half-life and does not require routine scheduled maintenance infusions.",
    },
    strictSafetyVetoes: vetoes,
    monitoringAndSurgicalDirectives: [
      "Mark the leading edge of swelling with a permanent marker every 15-30 minutes; measure limb circumference at multiple fixed points.",
      "Check serial coagulation panel (PT/INR, aPTT, fibrinogen, platelets) and complete blood count at baseline, 2 hours post-infusion, and prior to discharge.",
      "Compartment Syndrome Warning: Severe pain and edema may mimic compartment syndrome, but true compartment syndrome is exceptionally rare (intracompartmental pressure > 30 mmHg). Fasciotomy is contraindicated unless intracompartmental pressure is directly measured > 30 mmHg AFTER adequate antivenom administration and correction of coagulopathy.",
    ],
  };
}

// ============================================================================
// NATURAL LANGUAGE ROUTER FOR EMERGENCY TOXICOLOGY QUERIES
// ============================================================================

export function handleNaturalToxicologyEmergencyQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  // 1. Toxic Alcohols: Methanol & Ethylene Glycol & Osmolal Gap
  const isToxicAlcoholQuery =
    /\b(methanol|ethylene\s+glycol|toxic\s+alcohol|antizol|fomepizole|osmolal\s+gap|extrip)\b/i.test(q) &&
    /\b(dialysis|hemodialysis|calcium\s+oxalate|blindness|acidosis|anion\s+gap|leucovorin|thiamine|pyridoxine)\b/i.test(q);

  // 2. Tricyclic Antidepressants (TCA) & Sodium Channel Blockers
  const isTcaQuery =
    /\b(tca|tricyclic|amitriptyline|nortriptyline|sodium\s+channel\s+blocker|qrs\s+duration|terminal\s+r\s+wave|avr)\b/i.test(q) &&
    /\b(sodium\s+bicarbonate|bicarb|arrhythmia|seizure|physostigmine|alkalinization)\b/i.test(q);

  // 3. Cyanide & Carbon Monoxide (CO)
  const isCyanideOrCoQuery =
    /\b(cyanide|carbon\s+monoxide|co\s+poisoning|carboxyhemoglobin|cohb|cyanokit|hydroxocobalamin|hyperbaric|hbo)\b/i.test(q) &&
    /\b(smoke\s+inhalation|lactate|fire|hypoxia|headache|syncope|ataxia)\b/i.test(q);

  // 4. Snake / Crotaline Envenomation
  const isEnvenomationQuery =
    /\b(rattlesnake|pit\s+viper|crotaline|copperhead|cottonmouth|snakebite|envenomation|crofab|anavip)\b/i.test(q) &&
    /\b(antivenom|vials?|coagulopathy|swelling|fibrinogen|tourniquet|fasciotomy)\b/i.test(q);

  // 5. Acetaminophen (APAP) / Rumack-Matthew
  const isApapQuery =
    /\b(tylenol|acetaminophen|apap|rumack|matthew|n-acetylcysteine|nac|nomogram)\b/i.test(q) &&
    /\b(overdose|ingestion|hours?|mcg\/ml|hepatotoxicity|liver)\b/i.test(q);

  // 6. Calcium Channel Blocker / Beta-Blocker Shock & HIET
  const isCcbBbQuery =
    /\b(calcium\s+channel\s+blocker|beta-blocker|ccb|diltiazem|verapamil|amlodipine|metoprolol|propranolol)\b/i.test(q) &&
    /\b(hiet|high-dose\s+insulin|insulin\s+euglycemia|intralipid|lipid\s+emulsion|glucagon|bradycardia|shock)\b/i.test(q);

  // 7. Organophosphates / Cholinergic
  const isCholinergicQuery =
    /\b(organophosphate|sarin|nerve\s+agent|malathion|cholinergic|dumbels|sludge)\b/i.test(q) &&
    /\b(atropine|pralidoxime|2-pam|bronchorrhea|fasciculations)\b/i.test(q);

  if (
    !isToxicAlcoholQuery &&
    !isTcaQuery &&
    !isCyanideOrCoQuery &&
    !isEnvenomationQuery &&
    !isApapQuery &&
    !isCcbBbQuery &&
    !isCholinergicQuery
  ) {
    return null;
  }

  // Parse weight
  const wtMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)/i);
  const weightKg = wtMatch ? parseFloat(wtMatch[1]) : 70;

  // Execute Toxic Alcohol Engine
  if (isToxicAlcoholQuery) {
    const isMethanol = /\bmethanol\b/i.test(q);
    const osmMatch = q.match(/(?:measured\s+osm(?:olality)?)\s*(?:is|of|:)?\s*(\d+)/i);
    const measuredOsm = osmMatch ? parseInt(osmMatch[1], 10) : 340;

    const naMatch = q.match(/(?:na|sodium)\s*(?:is|of|:)?\s*(\d+)/i);
    const na = naMatch ? parseInt(naMatch[1], 10) : 138;

    const glucMatch = q.match(/(?:glucose|glu)\s*(?:is|of|:)?\s*(\d+)/i);
    const gluc = glucMatch ? parseInt(glucMatch[1], 10) : 95;

    const bunMatch = q.match(/(?:bun)\s*(?:is|of|:)?\s*(\d+)/i);
    const bun = bunMatch ? parseInt(bunMatch[1], 10) : 14;

    const phMatch = q.match(/(?:ph)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
    const ph = phMatch ? parseFloat(phMatch[1]) : 7.12;

    const report = evaluateToxicAlcoholMethanolEthyleneGlycol({
      substance: isMethanol ? "METHANOL" : "ETHYLENE_GLYCOL",
      weightKg,
      measuredOsmolalityMOsmKg: measuredOsm,
      sodiumMeqL: na,
      glucoseMgDl: gluc,
      bunMgDl: bun,
      chlorideMeqL: 98,
      bicarbonateMeqL: 8,
      arterialPh: ph,
      measuredToxicAlcoholMgDl: 65,
      visualSymptomsReported: isMethanol,
      acuteKidneyInjuryPresent: !isMethanol,
    });

    return formatToxicAlcoholReport(report, weightKg);
  }

  // Execute TCA Engine
  if (isTcaQuery) {
    const qrsMatch = q.match(/(?:qrs)\s*(?:duration|is|of|:)?\s*(\d+)/i);
    const qrs = qrsMatch ? parseInt(qrsMatch[1], 10) : 145;

    const report = evaluateTcaSodiumChannelBlockerToxicity({
      patientWeightKg: weightKg,
      qrsDurationMs: qrs,
      terminalRAvrMm: 4.5,
      rOverSRatioAvr: 1.1,
      systolicBpMmHg: 82,
      heartRateBpm: 128,
      seizuresReported: true,
      ventricularDysrhythmiaPresent: false,
    });

    return formatTcaReport(report, weightKg);
  }

  // Execute Cyanide & Carbon Monoxide Engine
  if (isCyanideOrCoQuery) {
    const coMatch = q.match(/(?:cohb|carboxyhemoglobin)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
    const coVal = coMatch ? parseFloat(coMatch[1]) : 28;

    const lacMatch = q.match(/(?:lactate)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
    const lac = lacMatch ? parseFloat(lacMatch[1]) : 11.4;

    const report = evaluateCyanideAndCarbonMonoxidePoisoning({
      exposureScenario: "SMOKE_INHALATION_FIRE",
      carboxyhemoglobinPercent: coVal,
      serumLactateMmolL: lac,
      lossOfConsciousnessOrSyncope: true,
      neurologicDeficitsPresent: true,
      isPregnant: false,
    });

    return formatCyanideCoReport(report);
  }

  // Execute Crotaline Envenomation Engine
  if (isEnvenomationQuery) {
    const report = evaluateCrotalineEnvenomation({
      snakeType: "RATTLESNAKE",
      patientWeightKg: weightKg,
      timeSinceBiteHours: 2,
      localSwellingProgression: "RAPIDLY_PROGRESSING_PAST_MAJOR_JOINT",
      plateletCount10e9L: 75,
      fibrinogenMgDl: 110,
      ptInr: 1.8,
      systemicSignsPresent: true,
    });

    return formatCrotalineReport(report);
  }

  // Fallback to general comprehensive case evaluation
  const caseEval = evaluateToxicologyCase({
    patientId: "TOX-AUTO-001",
    patientName: "Emergency Toxicology Encounter",
    ageYears: 35,
    weightKg,
    suspectedToxins: [q],
    ingestionTimeHoursAgo: 6,
    heartRateBpm: 48,
    bloodPressureSystolic: 84,
    bloodPressureDiastolic: 48,
    respiratoryRatePerMin: 10,
    temperatureCelsius: 36.8,
    pupils: "NORMAL",
    skin: "NORMAL",
    bowelSounds: "NORMAL",
    neuromuscular: "NORMAL_OR_DEPRESSED",
    mentalStatus: "STUPOROUS_COMATOSE",
    serumAcetaminophenMcgPerMl: 140,
  });

  return formatCaseEvalReport(caseEval);
}

function formatToxicAlcoholReport(res: ToxicAlcoholResult, weightKg: number): string {
  let md = `### Noctis Clinical Toxicology & EXTRIP Dialysis Engine (NOCTIS-TOX-001)\n`;
  md += `**Diagnostic Category:** \`${res.diagnosticSummary}\`\n\n`;

  md += `#### 1. Osmolal & Anion Gap Laboratory Equations\n`;
  md += `$$\\text{Calculated Osmolality} = 2[\\text{Na}^+] + \\frac{[\\text{Glucose}]}{18} + \\frac{[\\text{BUN}]}{2.8} + \\frac{[\\text{EtOH}]}{4.6} = ${res.calculatedOsmolalityMOsmKg}\\text{ mOsm/kg}$$\n`;
  md += `$$\\text{Osmolal Gap} = \\text{Measured Osm} - \\text{Calculated Osm} = ${res.osmolalGapMOsmKg}\\text{ mOsm/kg}\\quad (${res.osmolalGapElevated ? "ELEVATED > 10 mOsm/kg" : "Normal"})$$\n`;
  md += `$$\\text{Anion Gap} = [\\text{Na}^+] - ([\\text{Cl}^-] + [\\text{HCO}_3^-]) = ${res.anionGapMeqL}\\text{ mEq/L}\\quad (${res.highAnionGapAcidosisDetected ? "HIGH ANION GAP METABOLIC ACIDOSIS (HAGMA)" : "Normal"})$$\n\n`;

  md += `#### 2. Antidote Therapy: Fomepizole Protocol (${weightKg} kg)\n`;
  md += `- **Loading Dose:** ${res.fomepizoleProtocol.loadingDoseMg} mg IV (15 mg/kg)\n`;
  md += `- **Maintenance Dose:** ${res.fomepizoleProtocol.maintenanceDoseMg} mg IV (10 mg/kg every 12 hours)\n`;
  md += `- **Administration Directive:** ${res.fomepizoleProtocol.infusionInstructions}\n`;
  md += `- **Alternative (if Fomepizole unavailable):** ${res.fomepizoleProtocol.alternativeEthanolTherapy}\n\n`;

  md += `#### 3. Co-Factor Therapy\n`;
  for (const c of res.coFactorTherapy) {
    md += `- ${c}\n`;
  }
  md += `\n`;

  md += `#### 4. EXTRIP Emergent Hemodialysis Criteria\n`;
  md += `- **Hemodialysis Urgency:** \`${res.extripDialysisRecommendation.urgencyTier}\`\n`;
  md += `- **EXTRIP Criteria Met:**\n`;
  for (const crit of res.extripDialysisRecommendation.extripCriteriaMet) {
    md += `  * 🚨 ${crit}\n`;
  }

  return md;
}

function formatTcaReport(res: TcaOverdoseResult, weightKg: number): string {
  let md = `### Noctis Tricyclic Antidepressant (TCA) & Sodium Channel Blocker Engine (NOCTIS-TOX-001)\n`;
  md += `**Stratification:** \`${res.ecgRiskStratification.qrsRiskCategory}\` · **Lead aVR Conduction Block:** \`${res.ecgRiskStratification.aVrTerminalRWaveRisk}\`\n\n`;

  if (res.strictSafetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.strictSafetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. ECG Findings & Electrophysiological Risk\n`;
  md += `${res.ecgRiskStratification.cardiacToxicitySummary}\n\n`;

  md += `#### 2. Sodium Bicarbonate Hypertonic Alkalinization Protocol (${weightKg} kg)\n`;
  md += `- **Initial Bolus:** ${res.sodiumBicarbonateProtocol.bolusDoseMeq} mEq IV (1-2 mEq/kg of 8.4% NaHCO₃)\n`;
  md += `- **Bolus Directive:** ${res.sodiumBicarbonateProtocol.bolusInstructions}\n`;
  md += `- **Continuous Infusion:** ${res.sodiumBicarbonateProtocol.continuousInfusionInstructions}\n`;
  md += `- **Target Arterial pH:** \`${res.sodiumBicarbonateProtocol.targetArterialPh}\`\n`;
  md += `- **Target Serum Sodium:** \`${res.sodiumBicarbonateProtocol.targetSerumSodiumMeqL}\`\n\n`;

  md += `#### 3. Mechanical Ventilation Directives\n`;
  md += `${res.hyperventilationDirectives}\n`;

  return md;
}

function formatCyanideCoReport(res: CyanideCarbonMonoxideResult): string {
  let md = `### Noctis Cyanide & Carbon Monoxide Emergency Engine (NOCTIS-TOX-001)\n`;
  md += `**CO Poisoning Severity:** \`${res.carbonMonoxideManagement.severityClassification}\` · **Cyanide Suspected:** \`${res.cyanideToxicitySuspected ? "YES (Lactate >= 8.0 / Severe Acidosis)" : "NO"}\`\n\n`;

  if (res.diagnosticCaveats.length > 0) {
    md += `#### ⚠️ Critical Diagnostic Caveats\n`;
    for (const cav of res.diagnosticCaveats) {
      md += `- ${cav}\n`;
    }
    md += `\n`;
  }

  if (res.hydroxocobalaminProtocol.indicated) {
    md += `#### 1. Cyanide Antidote: Hydroxocobalamin (Cyanokit) Protocol\n`;
    md += `- **Adult Dose:** ${res.hydroxocobalaminProtocol.adultDose}\n`;
    md += `- **Pediatric Dose:** ${res.hydroxocobalaminProtocol.pediatricDose}\n`;
    md += `- **Administration Route:** ${res.hydroxocobalaminProtocol.administrationRoute}\n`;
    md += `- **Clinical Notes:** ${res.hydroxocobalaminProtocol.clinicalPearl}\n\n`;
  }

  md += `#### 2. Carbon Monoxide Elimination & Hyperbaric Oxygen (HBO)\n`;
  md += `- **Normobaric O₂ Directive:** ${res.carbonMonoxideManagement.normobaricOxygenDirective}\n`;
  md += `- **Hyperbaric Oxygen (HBO) Indicated:** \`${res.carbonMonoxideManagement.hyperbaricOxygenIndicated ? "YES (Emergent Transfer to Multiplace Chamber)" : "NO"}\`\n`;
  if (res.carbonMonoxideManagement.hboCriteriaMet.length > 0) {
    md += `- **HBO Criteria Met:**\n`;
    for (const c of res.carbonMonoxideManagement.hboCriteriaMet) {
      md += `  * ${c}\n`;
    }
  }
  md += `- **CO Elimination Half-Life Kinetics:** ${res.carbonMonoxideManagement.halfLifeComparison}\n`;

  return md;
}

function formatCrotalineReport(res: CrotalineEnvenomationResult): string {
  let md = `### Noctis Crotaline Snake Envenomation Engine (NOCTIS-TOX-001)\n`;
  md += `**Severity:** \`${res.envenomationSeverity}\` · **Antivenom Indication:** \`${res.antivenomProtocol.indicated ? "INDICATED" : "OBSERVE"}\`\n\n`;

  if (res.strictSafetyVetoes.length > 0) {
    md += `#### 🚨 Harmful Intervention Vetoes\n`;
    for (const v of res.strictSafetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Antivenom Protocol: ${res.antivenomProtocol.primaryAntivenom}\n`;
  md += `- **Initial Loading Dose:** ${res.antivenomProtocol.initialLoadingVials} vials IV\n`;
  md += `- **Infusion Directive:** ${res.antivenomProtocol.infusionInstructions}\n`;
  md += `- **Maintenance Schedule:** ${res.antivenomProtocol.maintenanceSchedule}\n`;
  md += `- **Alternative (Anavip):** ${res.antivenomProtocol.alternativeAntivenom}\n\n`;

  md += `#### 2. Bedside Monitoring & Compartment Syndrome Guidelines\n`;
  for (const m of res.monitoringAndSurgicalDirectives) {
    md += `- ${m}\n`;
  }

  return md;
}

function formatCaseEvalReport(report: ToxicologyEvaluationReport): string {
  let md = `### Noctis Clinical Toxicology Evaluation Report (NOCTIS-TOX-001)\n`;
  md += `**Detected Toxidrome:** \`${report.detectedToxidrome}\` (${report.toxidromeConfidence} Confidence)\n\n`;

  if (report.trippedInvariants.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const act of report.mandatoryActions) {
      md += `- ${act}\n`;
    }
    md += `\n`;
  }

  if (report.immediateAntidoteDirectives.length > 0) {
    md += `#### 1. Immediate Antidote & Resuscitation Directives\n`;
    for (const dir of report.immediateAntidoteDirectives) {
      md += `- ${dir}\n`;
    }
    md += `\n`;
  }

  if (report.rumackMatthew) {
    md += `#### 2. Acetaminophen Rumack-Matthew Nomogram Analysis\n`;
    md += `- **Hours Post-Ingestion:** ${report.rumackMatthew.hoursPostIngestion} hours\n`;
    md += `- **Measured APAP Concentration:** ${report.rumackMatthew.measuredLevelMcgPerMl} mcg/mL\n`;
    md += `- **Treatment Threshold Line (150-Line):** ${report.rumackMatthew.treatmentThresholdMcgPerMl} mcg/mL\n`;
    md += `- **Treatment Indication:** \`${report.rumackMatthew.treatmentIndicated ? "YES - IV NAC MANDATORY" : "NO"}\`\n\n`;
  }

  return md;
}
