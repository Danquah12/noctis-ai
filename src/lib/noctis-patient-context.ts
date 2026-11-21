/**
 * Noctis Sovereign Systems — Immutable Patient Context Architecture
 * Standardized single authoritative patient object per encounter.
 * Eliminates cross-patient contamination, stale context reuse, and mutable state leakage.
 */

import { sha256Sync } from "./universal-crypto.ts";

export interface ImmutablePatientDemographics {
  age: number | null;
  ageDisplay: string;
  sex: "female" | "male" | "unspecified";
}

export interface ImmutablePatientVitals {
  systolicBp: number | null;
  diastolicBp: number | null;
  bpDisplay: string;
  heartRateBpm: number | null;
  respiratoryRatePerMin: number | null;
  temperatureCelsius: number | null;
  spo2Percent: number | null;
  spo2Display: string;
}

export interface ImmutablePatientLabs {
  potassiumMeqL: number | null;
  sodiumMeqL: number | null;
  chlorideMeqL: number | null;
  bicarbonateMeqL: number | null;
  arterialPh: number | null;
  paco2MmHg: number | null;
  lactateMmolL: number | null;
  creatinineMgDl: number | null;
  baselineCreatinineMgDl: number | null;
  glucoseMgDl: number | null;
  betaHydroxybutyrateMmolL: number | null;
  digoxinNgMl: number | null;
  urineOutputMl: number | null;
  urineOutputDurationHours: number | null;
}

export interface ImmutablePatientCardiac {
  ejectionFractionPercent: number | null;
  ecgFindings: string[];
  hasBradycardia: boolean;
  hasTachycardia: boolean;
}

export interface ImmutablePatientMedications {
  documentedMedications: string[];
  hasDigoxinExposure: boolean;
  hasMetformin: boolean;
  hasAceiOrArb: boolean;
  hasBetaBlocker: boolean;
  hasBactrim: boolean;
  hasSpironolactone: boolean;
}

export type PrimaryClinicalSyndrome =
  | "DKA_SEPSIS_MULTISYSTEM"
  | "BRASH_DIGOXIN_CRISIS"
  | "ISOLATED_HYPERKALEMIA"
  | "ISOLATED_HYPONATREMIA"
  | "ISOLATED_HYPERMAGNESEMIA"
  | "SEPTIC_SHOCK"
  | "GENERAL_DIAGNOSTIC";

export interface ImmutableClinicalSyndromes {
  primarySyndrome: PrimaryClinicalSyndrome;
  isDka: boolean;
  isSepsis: boolean;
  isBrash: boolean;
  isDigoxinToxicity: boolean;
  isHyperkalemicCrisis: boolean;
  isLacticAcidosis: boolean;
  isAki: boolean;
  isHeartFailure: boolean;
}

export interface ImmutablePatientCalculations {
  meanArterialPressureMmHg: number | null;
  organPerfusionDeficitMmHg: number | null;
  anionGapMeqL: number | null;
  isAnionGapComputable: boolean;
  anionGapFormula: string;
  wintersExpectedMidpointMmHg: number | null;
  wintersExpectedLowMmHg: number | null;
  wintersExpectedHighMmHg: number | null;
  wintersMeasuredPaco2MmHg: number | null;
  isWintersComputable: boolean;
  wintersInterpretation: string;
  crFoldIncrease: number | null;
  crAbsoluteRise: number | null;
  kdigoAkiStage: number | null;
}

export interface ImmutableEncounterProvenance {
  encounterId: string;
  patientContextId: string;
  requestId: string;
  inputHash: string;
  patientFactsHash: string;
  contextVersion: string;
  modelVersion: string;
  clinicalRulesVersion: string;
  generationId: string;
}

export interface ImmutablePatientContext {
  encounterId: string;
  sourceInputHash: string;
  rawInput: string;
  timestampIso: string;
  provenance: ImmutableEncounterProvenance;
  demographics: ImmutablePatientDemographics;
  vitals: ImmutablePatientVitals;
  labs: ImmutablePatientLabs;
  cardiac: ImmutablePatientCardiac;
  medications: ImmutablePatientMedications;
  syndromes: ImmutableClinicalSyndromes;
  calculations: ImmutablePatientCalculations;
}

export function assertEncounterProvenance(
  stageProvenance: {
    stage: "extraction" | "reasoning" | "narrative" | "validation";
    encounterId: string;
    inputHash: string;
  },
  requestProvenance: ImmutableEncounterProvenance
): void {
  if (stageProvenance.encounterId !== requestProvenance.encounterId) {
    throw new Error(
      `CLINICAL_VALIDATION_FAILED — ENCOUNTER_ISOLATION_VIOLATION: Stage "${stageProvenance.stage}" encounter_id "${stageProvenance.encounterId}" does not match request encounter_id "${requestProvenance.encounterId}".`
    );
  }
  if (stageProvenance.inputHash !== requestProvenance.inputHash) {
    throw new Error(
      `CLINICAL_VALIDATION_FAILED — INPUT_HASH_MISMATCH: Stage "${stageProvenance.stage}" input_hash "${stageProvenance.inputHash}" does not match request input_hash "${requestProvenance.inputHash}".`
    );
  }
}

/**
 * Builds an immutable, strongly-typed patient context from raw intake text.
 * This is the SINGLE AUTHORITATIVE SOURCE of clinical facts for the encounter.
 */
export function buildImmutablePatientContext(
  rawInput: string,
  explicitEncounterId?: string
): ImmutablePatientContext {
  const q = rawInput.trim();
  const encMatch = q.match(/\b(NPDE-[A-Z0-9-]+)\b/i);
  const encounterId = explicitEncounterId || (encMatch ? encMatch[1] : `NPDE-INTAKE-${Date.now().toString(36).toUpperCase()}`);
  const sourceInputHash = sha256Sync(q);

  // 1. Demographics
  const ageMatch = q.match(/(\d{1,3})\s*(?:-|–|\s+)?(?:years?|yrs?|yo|year-old)/i);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : null;
  const ageDisplay = age !== null ? `${age}-year-old` : "Adult";
  const sex: "female" | "male" | "unspecified" = /\bfemale\b/i.test(q)
    ? "female"
    : /\bmale\b/i.test(q)
    ? "male"
    : "unspecified";

  // 2. Vitals
  const bpExplicitMatch = q.match(/\b(?:bp|blood\s*pressure)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
  let systolicBp: number | null = null;
  let diastolicBp: number | null = null;
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
  const bpDisplay = systolicBp !== null && diastolicBp !== null ? `${systolicBp}/${diastolicBp} mmHg` : "[UNMEASURED]";

  const hrMatch =
    q.match(/\b(?:hr|heart\s*rate)\s*[:=]?\s*(\d{2,3})\s*(?:bpm)?\b/i) ||
    q.match(/\b(\d{2,3})\s*bpm\b/i);
  const heartRateBpm = hrMatch ? parseInt(hrMatch[1], 10) : null;

  const rrMatch = q.match(/\b(?:rr|resp(?:iratory)?\s*rate)\s*[:=]?\s*(\d{2,3})\s*(?:\/min|breaths)?\b/i);
  const respiratoryRatePerMin = rrMatch ? parseInt(rrMatch[1], 10) : null;

  const tempMatch =
    q.match(/\b(?:temp(?:erature)?)\s*[:=]?\s*(\d{2}\.?\d?)\s*°?C\b/i) ||
    q.match(/\b(\d{2}\.\d)\s*°?C\b/i);
  const temperatureCelsius = tempMatch ? parseFloat(tempMatch[1]) : null;

  const spo2Match = q.match(/\b(?:spo2|o2\s*sat)\s*[:=]?\s*(\d{2,3})%?\b/i);
  const spo2Percent = spo2Match ? parseInt(spo2Match[1], 10) : null;
  const spo2Display = spo2Percent !== null ? `${spo2Percent}% on room air` : "[UNMEASURED]";

  // 3. Labs
  const kMatch =
    q.match(/\b(?:potassium|k\+?)\s*[:=]?\s*([2-9]\.\d+)\b/i) ||
    q.match(/\b([2-9]\.\d+)\s*(?:mmol|meq)\/l?\b/i);
  const potassiumMeqL = kMatch ? parseFloat(kMatch[1]) : null;

  const naMatch = q.match(/\b(?:sodium|na\+?)\s*[:=]?\s*(\d{3})\b/i);
  const sodiumMeqL = naMatch ? parseFloat(naMatch[1]) : null;

  let chlorideMeqL: number | null = null;
  if (!/\b(?:chloride|cl-?)\s*(?:is\s*)?(?:unavailable|missing|not\s*measured|not\s*provided|unmeasured)\b/i.test(q)) {
    const clMatch = q.match(/\b(?:chloride|cl\s*[-=:]?)\s*[:=]?\s*(\d{2,3})\b/i);
    chlorideMeqL = clMatch ? parseFloat(clMatch[1]) : null;
  }

  const hco3Match =
    q.match(/\b(?:bicarbonate|bicarb|hco3-?)\s*(?:\([^)]*\)\s*)?[:=]?\s*(\d{1,2}(?:\.\d+)?)\b/i) ||
    q.match(/\b(?:venous|serum)\s+bicarbonate\s*[:=]?\s*(\d{1,2})\b/i);
  const bicarbonateMeqL = hco3Match ? parseFloat(hco3Match[1]) : null;

  const phMatch = q.match(/\b(?:arterial\s+|venous\s+)?ph\s*[:=]?\s*(\d\.\d{2,3})\b/i);
  const arterialPh = phMatch ? parseFloat(phMatch[1]) : null;

  const paco2Match =
    q.match(/\b(?:arterial\s+|venous\s+)?(?:paco2|pco2|co2)\s*(?:is|of|=|:)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:mmhg)?\b/i);
  const paco2MmHg = paco2Match ? parseFloat(paco2Match[1]) : null;

  const lacMatch = q.match(/\b(?:lactate|lactic\s*acid)\s*[:=]?\s*(\d+\.\d+)\b/i);
  const lactateMmolL = lacMatch ? parseFloat(lacMatch[1]) : null;

  const glucMatch = q.match(/\b(?:glucose|blood\s*sugar)\s*[:=]?\s*(\d{2,4})\b/i);
  const glucoseMgDl = glucMatch ? parseFloat(glucMatch[1]) : null;

  const bhbMatch =
    q.match(/\b(?:beta-?hydroxybutyrate|b-?ohb)\s*(?:\([^)]*\)\s*)?[:=]?\s*(\d+(?:\.\d+)?)\b/i) ||
    q.match(/\b(?:blood|serum)\s+ketones?\s*[:=]?\s*(\d+(?:\.\d+)?)\b/i);
  const betaHydroxybutyrateMmolL = bhbMatch ? parseFloat(bhbMatch[1]) : null;

  const baseCrMatch = q.match(/\bbaseline\s+(?:creatinine|cr)\s*[:=]?\s*(\d+\.\d+)\b/i);
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

  // Digoxin level: capture serum levels (ng/mL), ignoring pill strengths (e.g. 0.125 mg) and clearance %
  let digoxinNgMl: number | null = null;
  const digMatches = [...q.matchAll(/\b(?:digoxin|dig)\s*(?:level|concentration|serum)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:ng\/ml|mcg\/l)?\b/gi)];
  for (const m of digMatches) {
    const val = parseFloat(m[1]);
    if (val === 0.125 || val === 0.25) continue; // pill dose
    const ctx = q.slice(Math.max(0, (m.index ?? 0) - 10), Math.min(q.length, (m.index ?? 0) + m[0].length + 20));
    if (ctx.includes("%") || /cleared|clearance|renally|elimination/i.test(ctx)) continue;
    digoxinNgMl = val;
    break;
  }

  // Urine output
  let urineOutputMl: number | null = null;
  let urineOutputDurationHours: number | null = null;
  const uoMatch = q.match(/\b(?:urine\s*output|uo)\s*[:=]?\s*(\d+)\s*ml(?:\s*\/\s*(\d+)\s*h(?:ours?)?)?\b/i);
  if (uoMatch) {
    urineOutputMl = parseInt(uoMatch[1], 10);
    urineOutputDurationHours = uoMatch[2] ? parseInt(uoMatch[2], 10) : 8;
  }

  // 4. Cardiac
  const efMatch = q.match(/\b(?:ef|ejection\s*fraction)\s*[:=]?\s*(\d{1,2})%\b/i);
  const ejectionFractionPercent = efMatch ? parseInt(efMatch[1], 10) : null;

  const ecgFindings: string[] = [];
  if (/\b(?:junctional\s*escape|junctional\s*rhythm)\b/i.test(q)) ecgFindings.push("Junctional escape rhythm");
  if (/\b(?:peaked\s*t|tall\s*t\s*waves?)\b/i.test(q)) ecgFindings.push("Peaked T waves");
  if (/\b(?:qrs\s*(?:widening|prolongation|widened|\d{3}\s*ms))\b/i.test(q)) ecgFindings.push("QRS widening");
  if (/\b(?:sine\s*wave)\b/i.test(q)) ecgFindings.push("Sine-wave conduction pattern");
  if (/\b(?:av\s*block|atrioventricular\s*block|complete\s*heart\s*block)\b/i.test(q)) ecgFindings.push("AV block");

  const hasBradycardia = heartRateBpm !== null ? heartRateBpm < 50 : false;
  const hasTachycardia = heartRateBpm !== null ? heartRateBpm > 100 : false;

  // 5. Medications
  const documentedMedications: string[] = [];
  if (/\b(?:digoxin|digitalis|lanoxin)\b/i.test(q)) documentedMedications.push("Digoxin");
  if (/\b(?:carvedilol|coreg|metoprolol|atenolol|bisoprolol)\b/i.test(q)) documentedMedications.push("Beta-blocker");
  if (/\b(?:spironolactone|aldactone|eplerenone)\b/i.test(q)) documentedMedications.push("Spironolactone");
  if (/\b(?:trimethoprim|bactrim|septra|tmp-smx)\b/i.test(q)) documentedMedications.push("Trimethoprim-sulfamethoxazole");
  if (/\b(?:metformin|glucophage)\b/i.test(q)) documentedMedications.push("Metformin");
  if (/\b(?:lisinopril|enalapril|losartan|valsartan)\b/i.test(q)) documentedMedications.push("ACEI/ARB");

  const hasDigoxinExposure =
    (digoxinNgMl !== null && digoxinNgMl > 0.4) ||
    (/\b(?:taking\s+digoxin|prescribed\s+digoxin|on\s+digoxin|digoxin\s*(?:toxicity|poisoning|overdose))\b/i.test(q) &&
      !/\b(?:no\s+digoxin|denies\s+digoxin|never\s+taken\s+digoxin|not\s+on\s+digoxin)\b/i.test(q));

  const hasMetformin = documentedMedications.includes("Metformin") || /\bmetformin\b/i.test(q);
  const hasAceiOrArb = documentedMedications.includes("ACEI/ARB");
  const hasBetaBlocker = documentedMedications.includes("Beta-blocker");
  const hasBactrim = documentedMedications.includes("Trimethoprim-sulfamethoxazole");
  const hasSpironolactone = documentedMedications.includes("Spironolactone");

  // 6. Calculations
  let meanArterialPressureMmHg: number | null = null;
  let organPerfusionDeficitMmHg: number | null = null;
  if (systolicBp !== null && diastolicBp !== null) {
    meanArterialPressureMmHg = (systolicBp + 2 * diastolicBp) / 3;
    organPerfusionDeficitMmHg = meanArterialPressureMmHg - 65;
  }

  // Anion Gap
  let anionGapMeqL: number | null = null;
  let isAnionGapComputable = false;
  let anionGapFormula = "";
  if (sodiumMeqL !== null && chlorideMeqL !== null && bicarbonateMeqL !== null) {
    anionGapMeqL = sodiumMeqL - (chlorideMeqL + bicarbonateMeqL);
    isAnionGapComputable = true;
    anionGapFormula = `Anion Gap = ${sodiumMeqL} - (${chlorideMeqL} + ${bicarbonateMeqL}) = ${anionGapMeqL} mEq/L`;
  } else {
    isAnionGapComputable = false;
    anionGapFormula = "Cannot calculate — incomplete electrolyte profile (missing chloride or bicarbonate)";
  }

  // Winter's Formula: Expected PaCO2 = 1.5 * [HCO3-] + 8 +/- 2
  let wintersExpectedMidpointMmHg: number | null = null;
  let wintersExpectedLowMmHg: number | null = null;
  let wintersExpectedHighMmHg: number | null = null;
  let isWintersComputable = false;
  let wintersInterpretation = "";
  if (bicarbonateMeqL !== null && paco2MmHg !== null) {
    isWintersComputable = true;
    wintersExpectedMidpointMmHg = 1.5 * bicarbonateMeqL + 8;
    wintersExpectedLowMmHg = wintersExpectedMidpointMmHg - 2;
    wintersExpectedHighMmHg = wintersExpectedMidpointMmHg + 2;

    if (paco2MmHg >= wintersExpectedLowMmHg && paco2MmHg <= wintersExpectedHighMmHg) {
      wintersInterpretation = `Expected PaCO2 is ${wintersExpectedLowMmHg}–${wintersExpectedHighMmHg} mmHg (${wintersExpectedMidpointMmHg} ± 2 mmHg). Measured PaCO2 of ${paco2MmHg} mmHg demonstrates adequate respiratory compensation.`;
    } else if (paco2MmHg > wintersExpectedHighMmHg) {
      const dev = (paco2MmHg - wintersExpectedHighMmHg).toFixed(1);
      wintersInterpretation = `Expected PaCO2 is ${wintersExpectedLowMmHg}–${wintersExpectedHighMmHg} mmHg. Measured PaCO2 of ${paco2MmHg} mmHg is ${dev} mmHg above upper limit (relative hypoventilation / secondary respiratory acidosis).`;
    } else {
      const dev = (wintersExpectedLowMmHg - paco2MmHg).toFixed(1);
      wintersInterpretation = `Expected PaCO2 is ${wintersExpectedLowMmHg}–${wintersExpectedHighMmHg} mmHg. Measured PaCO2 of ${paco2MmHg} mmHg is ${dev} mmHg below expected range (superimposed respiratory alkalosis).`;
    }
  } else {
    isWintersComputable = false;
    wintersInterpretation = "Winter's formula cannot be computed without measured bicarbonate and PaCO2.";
  }

  // AKI Ratios
  let crFoldIncrease: number | null = null;
  let crAbsoluteRise: number | null = null;
  let kdigoAkiStage: number | null = null;
  if (creatinineMgDl !== null && baselineCreatinineMgDl !== null && baselineCreatinineMgDl > 0) {
    crFoldIncrease = creatinineMgDl / baselineCreatinineMgDl;
    crAbsoluteRise = creatinineMgDl - baselineCreatinineMgDl;
    if (crFoldIncrease >= 3.0 || creatinineMgDl >= 4.0) {
      kdigoAkiStage = 3;
    } else if (crFoldIncrease >= 2.0) {
      kdigoAkiStage = 2;
    } else if (crFoldIncrease >= 1.5 || crAbsoluteRise >= 0.3) {
      kdigoAkiStage = 1;
    }
  }

  // 7. Syndromic Classification
  const isDka =
    ((glucoseMgDl !== null && glucoseMgDl >= 200) || /\bdka\b/i.test(q) || /\bdiabetic\s+ketoacidosis\b/i.test(q)) &&
    ((betaHydroxybutyrateMmolL !== null && betaHydroxybutyrateMmolL >= 3.0) ||
      (bicarbonateMeqL !== null && bicarbonateMeqL <= 15) ||
      (arterialPh !== null && arterialPh <= 7.25) ||
      /\b(?:dka|ketones?|ketoacidosis)\b/i.test(q));

  const isSepsis =
    /\b(?:sepsis|septic\s+shock|urosepsis|bacteremia|infection)\b/i.test(q) ||
    ((temperatureCelsius !== null && (temperatureCelsius >= 38.0 || temperatureCelsius <= 36.0)) &&
      (heartRateBpm !== null && heartRateBpm > 90));

  const isBrash =
    hasBradycardia &&
    (potassiumMeqL !== null && potassiumMeqL >= 5.5) &&
    (meanArterialPressureMmHg !== null && meanArterialPressureMmHg < 65) &&
    hasDigoxinExposure;

  const isDigoxinToxicity = hasDigoxinExposure && (digoxinNgMl !== null ? digoxinNgMl >= 2.0 : true);
  const isHyperkalemicCrisis = potassiumMeqL !== null && potassiumMeqL >= 6.0;
  const isLacticAcidosis = lactateMmolL !== null && lactateMmolL >= 4.0;
  const isAki = creatinineMgDl !== null && (creatinineMgDl >= 2.5 || (kdigoAkiStage !== null && kdigoAkiStage >= 2));
  const isHeartFailure = ejectionFractionPercent !== null && ejectionFractionPercent <= 40;

  let primarySyndrome: PrimaryClinicalSyndrome = "GENERAL_DIAGNOSTIC";
  if (isDka) {
    primarySyndrome = "DKA_SEPSIS_MULTISYSTEM";
  } else if (isBrash || isDigoxinToxicity) {
    primarySyndrome = "BRASH_DIGOXIN_CRISIS";
  } else if (isHyperkalemicCrisis && !hasBradycardia) {
    primarySyndrome = "ISOLATED_HYPERKALEMIA";
  } else if (isSepsis) {
    primarySyndrome = "SEPTIC_SHOCK";
  }

  const syndromes: ImmutableClinicalSyndromes = {
    primarySyndrome,
    isDka,
    isSepsis,
    isBrash,
    isDigoxinToxicity,
    isHyperkalemicCrisis,
    isLacticAcidosis,
    isAki,
    isHeartFailure,
  };

  const vitals: ImmutablePatientVitals = {
    systolicBp,
    diastolicBp,
    bpDisplay,
    heartRateBpm,
    respiratoryRatePerMin,
    temperatureCelsius,
    spo2Percent,
    spo2Display,
  };

  const demographics: ImmutablePatientDemographics = {
    age,
    ageDisplay,
    sex,
  };

  const labs: ImmutablePatientLabs = {
    potassiumMeqL,
    sodiumMeqL,
    chlorideMeqL,
    bicarbonateMeqL,
    arterialPh,
    paco2MmHg,
    lactateMmolL,
    creatinineMgDl,
    baselineCreatinineMgDl,
    glucoseMgDl,
    betaHydroxybutyrateMmolL,
    digoxinNgMl,
    urineOutputMl,
    urineOutputDurationHours,
  };

  const cardiac: ImmutablePatientCardiac = {
    ejectionFractionPercent,
    ecgFindings,
    hasBradycardia,
    hasTachycardia,
  };

  const medications: ImmutablePatientMedications = {
    documentedMedications,
    hasDigoxinExposure,
    hasMetformin,
    hasAceiOrArb,
    hasBetaBlocker,
    hasBactrim,
    hasSpironolactone,
  };

  const calculations: ImmutablePatientCalculations = {
    meanArterialPressureMmHg,
    organPerfusionDeficitMmHg,
    anionGapMeqL,
    isAnionGapComputable,
    anionGapFormula,
    wintersExpectedMidpointMmHg,
    wintersExpectedLowMmHg,
    wintersExpectedHighMmHg,
    wintersMeasuredPaco2MmHg: paco2MmHg,
    isWintersComputable,
    wintersInterpretation,
    crFoldIncrease,
    crAbsoluteRise,
    kdigoAkiStage,
  };

  const patientFactsHash = sha256Sync(
    JSON.stringify({ demographics, vitals, labs, cardiac, medications })
  );

  const provenance: ImmutableEncounterProvenance = {
    encounterId,
    patientContextId: `CTX-${encounterId}`,
    requestId: `REQ-${sha256Sync(q + encounterId).slice(0, 12)}`,
    inputHash: sourceInputHash,
    patientFactsHash,
    contextVersion: "v1.4-CLINICAL",
    modelVersion: "NOCTIS-SOVEREIGN-v2.6",
    clinicalRulesVersion: "KDIGO-2024/ADA-2026/SSC-2024",
    generationId: `GEN-${Date.now().toString(36).toUpperCase()}`,
  };

  return {
    encounterId,
    sourceInputHash,
    rawInput: q,
    timestampIso: new Date().toISOString(),
    provenance,
    demographics,
    vitals,
    labs,
    cardiac,
    medications,
    syndromes,
    calculations,
  };
}
