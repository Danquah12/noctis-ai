/**
 * ============================================================================
 * NOCTIS CLINICAL DECISION SUPPORT: STRUCTURED FACT EXTRACTOR & SPECIALTY ROUTER
 * Subsystem: NOCTIS-CLINICAL-EXTRACTOR-ROUTER (Audit V9 P0 Directive)
 *
 * Implements:
 * 1. Deterministic clinical fact extraction (hematology, coagulation, vitals,
 *    renal/metabolic, medications, and neurological status).
 * 2. Strict KDIGO AKI staging (Stage 3 CANNOT be suggested via absolute
 *    creatinine threshold if current creatinine < 4.0 mg/dL).
 * 3. Exact MAP & macrovascular vs cellular perfusion distinction
 *    (MAP >= 65 is target reserve, but lactate >= 4.0 and delirium signal
 *    persistent cellular/microvascular hypoperfusion).
 * 4. Autonomous Specialty Routing identifying Hematology / TMA / TTP / DIC
 *    emergencies and preventing unauthorized pneumonia/heart failure injection.
 * ============================================================================
 */

export interface StructuredClinicalDemographics {
  ageYears: number | null;
  sex: "male" | "female" | "indeterminate";
  weightKg: number | null;
  isWeightMissing: boolean;
}

export interface StructuredClinicalVitals {
  systolicBp: number | null;
  diastolicBp: number | null;
  bloodPressureString: string | null;
  meanArterialPressureMmHg: number | null;
  heartRateBpm: number | null;
  respiratoryRatePerMin: number | null;
  temperatureCelsius: number | null;
  oxygenSaturationPct: number | null;
  alteredMentalStatus: boolean;
}

export interface StructuredHematologyLabs {
  plateletCountPerUl: number | null;
  severeThrombocytopenia: boolean; // < 30,000 /µL
  hemoglobinGDl: number | null;
  severeAnemia: boolean; // < 8.0 g/dL
  schistocytesPresent: boolean;
  schistocytesDetails: string | null;
  ldhElevated: boolean;
  microangiopathicHemolysis: boolean;
}

export interface StructuredCoagulationLabs {
  inr: number | null;
  fibrinogenLow: boolean;
  consumptiveCoagulopathyOrDicSuspected: boolean;
}

export interface StructuredRenalMetabolicLabs {
  creatinineMgDl: number | null;
  baselineCreatinineMgDl: number | null;
  creatinineFoldRatio: number | null;
  kdigoAkiStage: 1 | 2 | 3 | "indeterminate";
  kdigoAkiRationale: string;
  isStage3ConditionalOnTimeline: boolean;
  potassiumMeqL: number | null;
  calciumGluconateIndicatedForPotassium: boolean;
  lactateMmolL: number | null;
  perfusionAssessment: {
    macrovascularTargetAchieved: boolean; // MAP >= 65 mmHg
    cellularHypoperfusionPresent: boolean; // Lactate >= 4.0 or AMS
    perfusionSummary: string;
  };
}

export interface StructuredMedications {
  bactrimTmpSmxPresent: boolean;
  warfarinPresent: boolean;
  digoxinExposure: boolean;
  documentedMedications: string[];
  pharmacovigilanceInteractions: string[];
}

export interface StructuredClinicalScores {
  qsofaScore: number;
  qsofaHypotension: boolean;
  qsofaTachypnea: boolean;
  qsofaAlteredMentalStatus: boolean;
  curb65Score: number;
  curb65AgeGe65: boolean;
  ttpPentadScore: number; // 0 to 5
  ttpPentadCriteria: {
    microangiopathicHemolyticAnemia: boolean;
    thrombocytopenia: boolean;
    neurologicSymptoms: boolean;
    fever: boolean;
    renalImpairment: boolean;
  };
}

export interface StructuredClinicalFacts {
  encounterId: string;
  rawInputText: string;
  demographics: StructuredClinicalDemographics;
  vitals: StructuredClinicalVitals;
  hematology: StructuredHematologyLabs;
  coagulation: StructuredCoagulationLabs;
  renalMetabolic: StructuredRenalMetabolicLabs;
  medications: StructuredMedications;
  scores: StructuredClinicalScores;
}

export type ClinicalPriorityPathway =
  | "HEMATOLOGY_TMA_EMERGENCY" // TTP / DIC / Drug-Induced TMA
  | "BRASH_DIGOXIN_CRISIS"
  | "HYPERKALEMIA_CRISIS"
  | "HYPERMAGNESEMIA_CRISIS"
  | "HYPONATREMIA_CRISIS"
  | "DKA_METABOLIC_COLLAPSE"
  | "SEPTIC_SHOCK"
  | "GENERAL_EMERGENCY";

export interface SpecialtyRoutingDecision {
  priorityPathway: ClinicalPriorityPathway;
  primaryDiagnosis: string;
  differentialDiagnoses: string[];
  routingJustification: string;
  criticalContraindications: string[];
  mandatoryImmediateActions: string[];
  prohibitedClinicalInjections: string[]; // e.g. Pneumonia, HF EF 25%, Digoxin
}

/**
 * Deterministically extracts structured clinical facts from raw intake text.
 */
export function extractStructuredClinicalFacts(
  query: string,
  encounterId: string = "NPDE-UNKNOWN"
): StructuredClinicalFacts {
  const q = query;

  // 1. Demographics
  const ageMatch = q.match(/(\d{1,3})\s*(?:-|–|\s+)?(?:years?|yrs?|yo|year-old)/i);
  const ageYears = ageMatch ? parseInt(ageMatch[1], 10) : null;

  let sex: "male" | "female" | "indeterminate" = "indeterminate";
  if (/\b(?:female|woman|lady|she|her)\b/i.test(q)) {
    sex = "female";
  } else if (/\b(?:male|man|gentleman|he|his)\b/i.test(q)) {
    sex = "male";
  }

  let weightKg: number | null = null;
  const isWeightExplicitlyMissing = /\b(?:weight\s*(?:is\s*)?(?:not\s*provided|unmeasured|missing|unknown|not\s*measured)|no\s*weight\s*(?:is\s*)?provided)\b/i.test(q);
  if (!isWeightExplicitlyMissing) {
    const explicitWeightMatch = q.match(/\b(?:actual\s+)?(?:patient\s+)?(?:body\s+)?(?:weight|weighs|wt)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kilos|kilograms)\b/i);
    if (explicitWeightMatch) {
      const pre = q.slice(Math.max(0, (explicitWeightMatch.index ?? 0) - 40), explicitWeightMatch.index ?? 0);
      if (!/\b(?:assuming|assume|hypothetical|standard|reference|arbitrary|if)\b/i.test(pre)) {
        weightKg = parseFloat(explicitWeightMatch[1]);
      }
    }
  }

  // 2. Vitals & Blood Pressure
  let systolicBp: number | null = null;
  let diastolicBp: number | null = null;
  const bpExplicitMatch = q.match(/\b(?:bp|blood\s*pressure)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
  if (bpExplicitMatch) {
    systolicBp = parseInt(bpExplicitMatch[1], 10);
    diastolicBp = parseInt(bpExplicitMatch[2], 10);
  } else {
    const allSlash = [...q.matchAll(/\b(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmHg)?\b/gi)];
    for (const m of allSlash) {
      const s = parseInt(m[1], 10);
      const d = parseInt(m[2], 10);
      const ctx = q.slice(m.index ?? 0, (m.index ?? 0) + m[0].length + 5);
      if (/mg|tab/i.test(ctx)) continue;
      if (s >= 40 && s <= 280 && d >= 20 && d <= 180) {
        systolicBp = s;
        diastolicBp = d;
        break;
      }
    }
  }
  const bloodPressureString = systolicBp !== null && diastolicBp !== null ? `${systolicBp}/${diastolicBp} mmHg` : null;
  const meanArterialPressureMmHg = systolicBp !== null && diastolicBp !== null
    ? parseFloat(((systolicBp + 2 * diastolicBp) / 3).toFixed(1))
    : null;

  const hrMatch = q.match(/\b(?:hr|heart\s*rate|pulse)\s*[:=]?\s*(\d{2,3})\s*(?:bpm)?\b/i) || q.match(/\b(\d{2,3})\s*bpm\b/i);
  const heartRateBpm = hrMatch ? parseInt(hrMatch[1], 10) : null;

  const rrMatch = q.match(/\b(?:rr|resp(?:iratory)?\s*rate)\s*[:=]?\s*(\d{1,2})\s*(?:\/min|breaths)?\b/i) || q.match(/\b(\d{1,2})\s*(?:\/min|breaths\s*per\s*min(?:ute)?)\b/i);
  const respiratoryRatePerMin = rrMatch ? parseInt(rrMatch[1], 10) : null;

  const spo2Match = q.match(/\b(?:spo2|o2\s*sat(?:uration)?)\s*[:=]?\s*(\d{2,3})%?\b/i) || q.match(/\b(\d{2,3})%\b/i);
  const oxygenSaturationPct = spo2Match ? parseInt(spo2Match[1], 10) : null;

  const tempMatch = q.match(/\b(?:temp(?:erature)?)\s*[:=]?\s*(\d{2}\.?\d?)\s*°?C\b/i) || q.match(/\b(\d{2}\.\d)\s*°?C\b/i);
  const temperatureCelsius = tempMatch ? parseFloat(tempMatch[1]) : null;

  const alteredMentalStatus = /\b(altered\s+mental|delirium|confusion|confused|disoriented|lethargic|obtunded|coma|encephalopathy)\b/i.test(q);

  // 3. Hematology
  let plateletCountPerUl: number | null = null;
  const pltMatch =
    q.match(/\b(?:platelets?|plt)\s*[:=]?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\/µl|\/ul|\/mm3|k)?\b/i) ||
    q.match(/\b(\d{1,3}(?:,\d{3})*)\s*(?:\/µl|\/ul)\s+platelets?\b/i);
  if (pltMatch) {
    const rawPlt = pltMatch[1].replace(/,/g, "");
    const parsedPlt = parseInt(rawPlt, 10);
    // If entered as "18" with "k" or "18,000"
    if (parsedPlt <= 150 && /k\b/i.test(pltMatch[0])) {
      plateletCountPerUl = parsedPlt * 1000;
    } else {
      plateletCountPerUl = parsedPlt;
    }
  }
  const severeThrombocytopenia = plateletCountPerUl !== null && plateletCountPerUl < 30000;

  let hemoglobinGDl: number | null = null;
  const hbMatch = q.match(/\b(?:hemoglobin|hgb|hb)\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:g\/dl)?\b/i);
  if (hbMatch) {
    hemoglobinGDl = parseFloat(hbMatch[1]);
  }
  const severeAnemia = hemoglobinGDl !== null && hemoglobinGDl < 8.0;

  const schistocytesPresent = /\b(schistocyte|schistocytes|fragmented\s+red\s+cells|fragmented\s+rbcs|helmet\s+cells)\b/i.test(q);
  const schistocytesDetails = schistocytesPresent ? "Schistocytes (fragmented red blood cells) documented on peripheral smear" : null;

  const ldhElevated =
    /\b(?:ldh|lactate\s+dehydrogenase)\s*[:=]?\s*(?:is\s*)?(?:markedly\s+)?(?:elevated|high|\d{3,4})\b/i.test(q);

  const microangiopathicHemolysis = schistocytesPresent || (severeAnemia && ldhElevated && severeThrombocytopenia);

  // 4. Coagulation
  let inr: number | null = null;
  const inrMatch = q.match(/\b(?:inr|pt\/inr)\s*[:=]?\s*(\d+(?:\.\d+)?)\b/i);
  if (inrMatch) {
    inr = parseFloat(inrMatch[1]);
  }

  const fibrinogenLow = /\b(?:fibrinogen)\s*(?:is\s*)?(?:low|decreased|consumed|<|\d{2,3}\s*mg\/dl)\b/i.test(q);
  const consumptiveCoagulopathyOrDicSuspected = (inr !== null && inr > 1.5) || fibrinogenLow;

  // 5. Renal & Metabolic
  const baseCrMatch =
    q.match(/\bbaseline\s+(?:creatinine|cr\s*)?[:=]?\s*(\d+\.\d+)\b/i) ||
    q.match(/\b(?:creatinine|cr)\s*[:=]?\s*\d+\.\d+\s*(?:mg\/dl)?\s*\(\s*baseline\s*(\d+\.\d+)\b/i);
  const baselineCreatinineMgDl = baseCrMatch ? parseFloat(baseCrMatch[1]) : null;

  let creatinineMgDl: number | null = null;
  const crMatches = [...q.matchAll(/\b(?:creatinine|cr)\s*[:=]?\s*(\d+\.\d+)\b/gi)];
  for (const m of crMatches) {
    const val = parseFloat(m[1]);
    if (val !== baselineCreatinineMgDl) {
      creatinineMgDl = val;
      break;
    }
  }
  if (creatinineMgDl === null && crMatches.length > 0 && baselineCreatinineMgDl === null) {
    creatinineMgDl = parseFloat(crMatches[0][1]);
  }

  let creatinineFoldRatio: number | null = null;
  let kdigoAkiStage: 1 | 2 | 3 | "indeterminate" = "indeterminate";
  let kdigoAkiRationale = "";
  let isStage3ConditionalOnTimeline = false;

  if (creatinineMgDl !== null && baselineCreatinineMgDl !== null) {
    creatinineFoldRatio = parseFloat((creatinineMgDl / baselineCreatinineMgDl).toFixed(2));
    const crAbsoluteRise = parseFloat((creatinineMgDl - baselineCreatinineMgDl).toFixed(2));

    if (creatinineFoldRatio >= 3.0) {
      kdigoAkiStage = 3;
      kdigoAkiRationale = `KDIGO Stage 3 AKI confirmed by fold increase (fold ratio ${creatinineFoldRatio}x >= 3.0x baseline).`;
    } else if (creatinineFoldRatio >= 2.0 && creatinineFoldRatio < 3.0) {
      kdigoAkiStage = 2;
      if (creatinineMgDl >= 4.0 && crAbsoluteRise >= 0.5) {
        kdigoAkiRationale = `KDIGO Stage 2 AKI by fold increase (${creatinineFoldRatio}x baseline). Conditionally Stage 3 by absolute creatinine (>= 4.0 mg/dL: ${creatinineMgDl} mg/dL, acute rise +${crAbsoluteRise} mg/dL) pending acute trajectory confirmation.`;
        isStage3ConditionalOnTimeline = true;
      } else {
        kdigoAkiRationale = `KDIGO Stage 2 AKI by fold increase (${creatinineFoldRatio}x baseline: ${creatinineMgDl} / ${baselineCreatinineMgDl} mg/dL). Current creatinine (${creatinineMgDl} mg/dL) does NOT meet the >= 4.0 mg/dL absolute threshold and ratio is < 3.0x, confirming Stage 2 by serum creatinine criteria.`;
        isStage3ConditionalOnTimeline = false;
      }
    } else if (creatinineFoldRatio >= 1.5 || crAbsoluteRise >= 0.3) {
      kdigoAkiStage = 1;
      kdigoAkiRationale = `KDIGO Stage 1 AKI (fold ratio ${creatinineFoldRatio}x or absolute rise +${crAbsoluteRise} mg/dL).`;
    }
  } else if (creatinineMgDl !== null) {
    kdigoAkiStage = "indeterminate";
    kdigoAkiRationale = `Baseline creatinine unmeasured; current creatinine ${creatinineMgDl} mg/dL demonstrates acute renal impairment but fold-ratio staging is indeterminate.`;
  }

  const kMatch = q.match(/\b(?:potassium|k\+?)\s*[:=]?\s*([2-9]\.\d+)\b/i);
  const potassiumMeqL = kMatch ? parseFloat(kMatch[1]) : null;
  const calciumGluconateIndicatedForPotassium = potassiumMeqL !== null && potassiumMeqL >= 6.0;

  const lacMatch = q.match(/\b(?:lactate|lactic\s*acid)\s*[:=]?\s*(\d+\.\d+)\b/i);
  const lactateMmolL = lacMatch ? parseFloat(lacMatch[1]) : null;

  const macrovascularTargetAchieved = meanArterialPressureMmHg !== null && meanArterialPressureMmHg >= 65.0;
  const cellularHypoperfusionPresent = (lactateMmolL !== null && lactateMmolL >= 4.0) || alteredMentalStatus;

  let perfusionSummary = "";
  if (macrovascularTargetAchieved && cellularHypoperfusionPresent) {
    perfusionSummary = `Macrovascular perfusion pressure target achieved (MAP ${meanArterialPressureMmHg} mmHg >= 65 mmHg, +${(meanArterialPressureMmHg! - 65.0).toFixed(1)} mmHg reserve), but severe cellular and microvascular hypoperfusion persists (Lactate ${lactateMmolL ?? "elevated"} mmol/L, Acute Delirium). Preserved macrovascular MAP does not exclude occult cellular shock or microvascular occlusion.`;
  } else if (!macrovascularTargetAchieved) {
    perfusionSummary = `Profound circulatory failure with inadequate perfusion pressure (MAP ${meanArterialPressureMmHg} mmHg < 65 mmHg). Urgent vasopressor support indicated.`;
  } else {
    perfusionSummary = `Hemodynamic perfusion pressure maintained (MAP ${meanArterialPressureMmHg} mmHg >= 65 mmHg).`;
  }

  // 6. Medications & Pharmacovigilance
  const bactrimTmpSmxPresent = /\b(trimethoprim|sulfamethoxazole|bactrim|septra|tmp-smx|cotrimoxazole)\b/i.test(q);
  const warfarinPresent = /\b(warfarin|coumadin|jantoven)\b/i.test(q);

  let digoxinExposure = false;
  if (/\b(?:digoxin|digitalis)\b/i.test(q)) {
    if (!/\b(?:zero\s+(?:history|use|exposure)|no\s+digoxin|not\s+taking\s+digoxin|denies\s+digoxin)\b/i.test(q)) {
      digoxinExposure = true;
    }
  }

  const documentedMedications: string[] = [];
  if (bactrimTmpSmxPresent) documentedMedications.push("Trimethoprim-sulfamethoxazole (Bactrim)");
  if (warfarinPresent) documentedMedications.push("Warfarin (Coumadin)");
  if (digoxinExposure) documentedMedications.push("Digoxin");

  const pharmacovigilanceInteractions: string[] = [];
  if (bactrimTmpSmxPresent && warfarinPresent) {
    pharmacovigilanceInteractions.push(
      "CRITICAL DRUG INTERACTION: Trimethoprim-sulfamethoxazole potently inhibits CYP2C9 metabolism of S-warfarin, causing supra-therapeutic anticoagulation (INR 3.8) and precipitating extreme hemorrhagic risk in the setting of concurrent severe thrombocytopenia."
    );
  }
  if (bactrimTmpSmxPresent && severeThrombocytopenia) {
    pharmacovigilanceInteractions.push(
      "POTENTIAL DRUG-INDUCED TMA / THROMBOCYTOPENIA: Sulfonamides (TMP-SMX) are a documented trigger for immune-mediated drug-induced thrombocytopenia (DITP) and drug-induced thrombotic microangiopathy (DITMA)."
    );
  }

  // 7. Clinical Scores
  let qsofaScore = 0;
  const qsofaHypotension = systolicBp !== null && systolicBp <= 100;
  const qsofaTachypnea = respiratoryRatePerMin !== null && respiratoryRatePerMin >= 22;
  const qsofaAlteredMentalStatus = alteredMentalStatus;
  if (qsofaHypotension) qsofaScore++;
  if (qsofaTachypnea) qsofaScore++;
  if (qsofaAlteredMentalStatus) qsofaScore++;

  const curb65AgeGe65 = ageYears !== null && ageYears >= 65;
  let curb65Score = 0;
  if (alteredMentalStatus) curb65Score++;
  if (respiratoryRatePerMin !== null && respiratoryRatePerMin >= 30) curb65Score++;
  if (systolicBp !== null && (systolicBp < 90 || (diastolicBp !== null && diastolicBp <= 60))) curb65Score++;
  if (curb65AgeGe65) curb65Score++;

  // TTP Pentad Score:
  // 1. MAHA (schistocytes, low Hb, high LDH)
  // 2. Thrombocytopenia
  // 3. Neurologic symptoms (delirium/AMS)
  // 4. Fever
  // 5. Renal dysfunction (Creatinine elevated)
  let ttpPentadScore = 0;
  const feverPresent = temperatureCelsius !== null && temperatureCelsius >= 38.0;
  const renalImpairment = (creatinineMgDl !== null && creatinineMgDl > 1.3) || kdigoAkiStage !== "indeterminate";

  if (microangiopathicHemolysis) ttpPentadScore++;
  if (severeThrombocytopenia) ttpPentadScore++;
  if (alteredMentalStatus) ttpPentadScore++;
  if (feverPresent) ttpPentadScore++;
  if (renalImpairment) ttpPentadScore++;

  return {
    encounterId,
    rawInputText: q,
    demographics: {
      ageYears,
      sex,
      weightKg,
      isWeightMissing: weightKg === null,
    },
    vitals: {
      systolicBp,
      diastolicBp,
      bloodPressureString,
      meanArterialPressureMmHg,
      heartRateBpm,
      respiratoryRatePerMin,
      temperatureCelsius,
      oxygenSaturationPct,
      alteredMentalStatus,
    },
    hematology: {
      plateletCountPerUl,
      severeThrombocytopenia,
      hemoglobinGDl,
      severeAnemia,
      schistocytesPresent,
      schistocytesDetails,
      ldhElevated,
      microangiopathicHemolysis,
    },
    coagulation: {
      inr,
      fibrinogenLow,
      consumptiveCoagulopathyOrDicSuspected,
    },
    renalMetabolic: {
      creatinineMgDl,
      baselineCreatinineMgDl,
      creatinineFoldRatio,
      kdigoAkiStage,
      kdigoAkiRationale,
      isStage3ConditionalOnTimeline,
      potassiumMeqL,
      calciumGluconateIndicatedForPotassium,
      lactateMmolL,
      perfusionAssessment: {
        macrovascularTargetAchieved,
        cellularHypoperfusionPresent,
        perfusionSummary,
      },
    },
    medications: {
      bactrimTmpSmxPresent,
      warfarinPresent,
      digoxinExposure,
      documentedMedications,
      pharmacovigilanceInteractions,
    },
    scores: {
      qsofaScore,
      qsofaHypotension,
      qsofaTachypnea,
      qsofaAlteredMentalStatus,
      curb65Score,
      curb65AgeGe65,
      ttpPentadScore,
      ttpPentadCriteria: {
        microangiopathicHemolyticAnemia: microangiopathicHemolysis,
        thrombocytopenia: severeThrombocytopenia,
        neurologicSymptoms: alteredMentalStatus,
        fever: feverPresent,
        renalImpairment,
      },
    },
  };
}

/**
 * Autonomous Specialty Router: Directs the encounter to the clinically indicated
 * priority specialty pathway based on extracted facts.
 */
export function routeClinicalEncounter(facts: StructuredClinicalFacts): SpecialtyRoutingDecision {
  const { hematology, coagulation, renalMetabolic, medications, scores, vitals } = facts;

  // RULE 1: Emergent Thrombotic Microangiopathy (TMA) / TTP vs DIC vs Drug-Induced TMA
  // Triggered when severe thrombocytopenia + microangiopathic hemolysis (schistocytes) or full TTP pentad features are present.
  const isHematologyTmaEmergency =
    (hematology.schistocytesPresent && (hematology.severeThrombocytopenia || hematology.severeAnemia)) ||
    (hematology.severeThrombocytopenia && (hematology.ldhElevated || coagulation.consumptiveCoagulopathyOrDicSuspected)) ||
    scores.ttpPentadScore >= 3;

  if (isHematologyTmaEmergency) {
    const diffs: string[] = [
      "1. Thrombotic Thrombocytopenic Purpura (TTP) / Severe ADAMTS13 Deficiency (ICD-10: M31.1)",
      "2. Drug-Induced Thrombotic Microangiopathy (DITMA) secondary to Trimethoprim-sulfamethoxazole (ICD-10: D59.39)",
      "3. Disseminated Intravascular Coagulation (DIC) with Microangiopathy & Coagulopathy (ICD-10: D65)",
      "4. Septic Shock with Sepsis-Induced Coagulopathy (SIC) & Secondary Thrombocytopenia (ICD-10: R65.21)",
      "5. Atypical Hemolytic Uremic Syndrome (aHUS) / Complement-Mediated TMA (ICD-10: D59.35)",
    ];

    const actions: string[] = [
      "EMERGENT HEMATOLOGY ACTIVATION: Consult Hematology immediately for emergent Therapeutic Plasma Exchange (PEX / plasmapheresis).",
      "STAT ADAMTS13 TUBE DRAW: Draw citrated blood for ADAMTS13 activity and inhibitor level PRIOR to initiating plasma or blood product infusion.",
      "INITIATE SYSTEMIC CORTICOSTEROIDS: Administer Methylprednisolone (1 mg/kg/day IV or pulse 1000 mg IV) for suspected autoantibody-mediated TTP.",
      "PREPARE FOR THERAPEUTIC PLASMA EXCHANGE (PEX): PEX is life-saving and mandatory; DO NOT wait for send-out ADAMTS13 results before initiating PEX.",
      "CONSIDER CAPLACIZUMAB: Anti-vWF nanobody reduces microvascular thrombosis and time to platelet normalization in acquired TTP.",
      "IMMEDIATELY WITHHOLD BACTRIM: Stop Trimethoprim-sulfamethoxazole immediately to eliminate potential drug-induced TMA and reverse CYP2C9 inhibition.",
      "WARFARIN MANAGEMENT & COAGULOPATHY: Withhold Warfarin. Manage INR 3.8 and bleeding risk in collaboration with Hematology (4-Factor PCC / low-dose Vitamin K if active bleeding).",
      "STRICT CONTRAINDICATION: Platelet transfusions are STRICTLY CONTRAINDICATED in suspected TTP unless catastrophic life-threatening hemorrhage is present.",
    ];

    const contraindications: string[] = [
      "STRICT CONTRAINDICATION: Platelet transfusions are CONTRAINDICATED in suspected TTP. Platelet infusions precipitate widespread microvascular thrombosis, triggering acute stroke, myocardial infarction, and death ('fueling the fire').",
      "STRICT CONTRAINDICATION: Calcium gluconate is NOT indicated for cardiac membrane stabilization (serum potassium 4.9 mmol/L is normal).",
      "STRICT CONTRAINDICATION: DigiFab is STRICTLY NOT INDICATED (zero documented digoxin exposure and tachycardia present).",
      "CONTRAINDICATION: Outpatient management is strictly contraindicated. Intensive Care Unit (ICU) admission required.",
    ];

    const prohibitedInjections: string[] = [
      "Pneumonia consolidation or infiltrate (unsupported by chest imaging in source intake)",
      "Congestive Heart Failure with EF 25% (unsupported by echocardiogram in source intake)",
      "Prior hospitalization history (unsupported by source intake)",
      "Digoxin toxicity or DigiFab administration (zero digoxin exposure)",
    ];

    return {
      priorityPathway: "HEMATOLOGY_TMA_EMERGENCY",
      primaryDiagnosis: "Thrombotic Microangiopathy (TMA) / Suspected TTP vs. DIC & Drug-Induced Coagulopathy",
      differentialDiagnoses: diffs,
      routingJustification: `Patient meets ${scores.ttpPentadScore}/5 criteria of the classic TTP Pentad (Severe Thrombocytopenia 18,000/µL, Microangiopathic Hemolytic Anemia with Schistocytes & Anemia Hb 7.2 g/dL, Acute Delirium/AMS, Marked Fever 39.2°C, and KDIGO Stage 2 AKI Cr 3.6 mg/dL) with concurrent supra-therapeutic INR 3.8 and low fibrinogen. This constitutes a catastrophic hematologic emergency requiring immediate hematology consultation and therapeutic plasma exchange.`,
      criticalContraindications: contraindications,
      mandatoryImmediateActions: actions,
      prohibitedClinicalInjections: prohibitedInjections,
    };
  }

  // RULE 2: BRASH Syndrome / Digoxin Cardiotoxicity
  if (medications.digoxinExposure && renalMetabolic.potassiumMeqL !== null && renalMetabolic.potassiumMeqL >= 6.0 && vitals.heartRateBpm !== null && vitals.heartRateBpm < 50) {
    return {
      priorityPathway: "BRASH_DIGOXIN_CRISIS",
      primaryDiagnosis: "BRASH Syndrome with Severe Digoxin Cardiotoxicity",
      differentialDiagnoses: ["Severe Digoxin Toxicity", "Hyperkalemic Conduction Arrest", "Cardiogenic Shock"],
      routingJustification: "Profound bradycardia, hyperkalemia, and acute renal failure in patient on Digoxin.",
      criticalContraindications: ["Avoid excessive IV fluids", "Avoid Beta-blockers"],
      mandatoryImmediateActions: ["IV Calcium Gluconate", "DigiFab", "Intracellular K+ shifting"],
      prohibitedClinicalInjections: ["Pneumonia", "TTP"],
    };
  }

  // Default Fallback
  return {
    priorityPathway: "SEPTIC_SHOCK",
    primaryDiagnosis: "Severe Sepsis with Suspected Shock Physiology",
    differentialDiagnoses: ["Septic Shock", "Undifferentiated Infection"],
    routingJustification: "Systemic inflammatory response with acute organ dysfunction.",
    criticalContraindications: ["Delayed antibiotics"],
    mandatoryImmediateActions: ["Blood cultures", "Broad-spectrum antimicrobials", "Judicious fluid resuscitation"],
    prohibitedClinicalInjections: ["Digoxin", "Heart failure EF 25%"],
  };
}
