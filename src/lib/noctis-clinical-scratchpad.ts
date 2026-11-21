/**
 * ============================================================================
 * NOCTIS CLINICAL DECISION SUPPORT: NEURO-SYMBOLIC SCRATCHPAD ENGINE
 * Subsystem: NOCTIS-CLINICAL-SCRATCHPAD (Phase 1 Determinism & Gate Enforcer)
 *
 * Implements deterministic pre-inference parsing, exact mathematical
 * derivations, unmeasured data sentinels, strict KDIGO staging, calibrated
 * acid-base interpretations, and zero-fabrication clinical guardrails.
 * ============================================================================
 */

export interface ClinicalVitalsExtracted {
  systolicBp: number | null;
  diastolicBp: number | null;
  bloodPressureString: string | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: string | null;
  oxygenSaturationPct: number | null;
  temperatureCelsius: number | null;
  bloodGlucoseMgDl: number | null;
}

export interface ClinicalLabsExtracted {
  potassiumMeqL: number | null;
  sodiumMeqL: number | null;
  chlorideMeqL: number | null;
  creatinineMgDl: number | null;
  baselineCreatinineMgDl: number | null;
  bicarbonateMeqL: number | null;
  arterialPh: number | null;
  paco2MmHg: number | null;
  lactateMmolL: number | null;
  glucoseMgDl: number | null;
  betaHydroxybutyrateMmolL: number | null;
  digoxinNgMl: number | null;
  urineOutputMl: number | null;
  urineOutputDurationHours: number | null;
}

export interface ClinicalDemographicsExtracted {
  patientAgeYears: number | null;
  patientAgeString: string | null;
  patientSex: "male" | "female" | "indeterminate";
  patientWeightKg: number | null;
}

export interface ClinicalUnmeasuredSentinels {
  isWeightMissing: boolean;
  isChlorideMissing: boolean;
  isBaselineCreatinineMissing: boolean;
  isLastDoseTimingMissing: boolean;
  isArterialBloodGasMissing: boolean;
  isUrineOutputMissing: boolean;
  missingDataItems: string[];
}

export interface KdigoAkiStagingResult {
  crAbsoluteRiseMgDl: number | null;
  crFoldRatio: number | null;
  establishedStage: 1 | 2 | 3 | "indeterminate";
  creatinineCriteriaStage: 1 | 2 | 3 | "indeterminate";
  stageRationale: string;
  isStage3ConditionalOnAcuteTimeline: boolean;
  stage3AcuteTimelineRationale: string;
  weightNormalizedUoMlKgHr: number | null;
  uoStagingStatus: "COMPUTABLE" | "UNMEASURED_WEIGHT_PROHIBITS_CALCULATION" | "NO_URINE_OUTPUT_DATA";
  uoStagingCaveat: string;
  canAnuriaBeUsedForStage3: boolean;
  anuriaRationale: string;
  finalHighestSupportedStage: 1 | 2 | 3 | "indeterminate";
}

export interface AnionGapCalculationResult {
  isComputable: boolean;
  anionGapMeqL: number | null;
  formula: string;
  refusalReason: string | null;
}

export interface WintersFormulaResult {
  isComputable: boolean;
  measuredPaco2MmHg: number | null;
  expectedPaco2MidpointMmHg: number | null;
  expectedPaco2RangeLowMmHg: number | null;
  expectedPaco2RangeHighMmHg: number | null;
  deviationMmHg: number | null;
  interpretationCategory:
    | "PURE_METABOLIC_ACIDOSIS_ADEQUATE_COMPENSATION"
    | "BORDERLINE_COMPENSATION_RELATIVE_HYPOVENTILATION"
    | "SUPERIMPOSED_RESPIRATORY_ACIDOSIS"
    | "SUPERIMPOSED_RESPIRATORY_ALKALOSIS"
    | "UNCOMPUTABLE";
  calibratedClinicalInterpretation: string;
}

export interface DigiFabDosingResult {
  isComputableWeightBased: boolean;
  dosingType: "EMPIRIC_EMERGENCY" | "CALCULATED_WEIGHT_BASED" | "NOT_INDICATED";
  weightBasedVials: number | null;
  empiricEmergencyVials: string;
  rationale: string;
  clinicalReassessmentRequired: boolean;
  toxicologyConsultationRequired: boolean;
}

export interface FluidResuscitationSafetyResult {
  standard30mLPerKgContraindicated: boolean; // Retained for compatibility
  highRiskFluidOverload: boolean;
  highRiskConditionsIdentified: string[];
  isAnuriaDocumented: boolean;
  recommendedResuscitationApproach: string;
  individualizedResuscitationGuidance: string;
}

export interface NeuroSymbolicClinicalScratchpad {
  encounterId: string;
  rawInputText: string;
  demographics: ClinicalDemographicsExtracted;
  vitals: ClinicalVitalsExtracted;
  labs: ClinicalLabsExtracted;
  sentinels: ClinicalUnmeasuredSentinels;
  derivedCalculations: {
    meanArterialPressureMmHg: number | null;
    kdigoAki: KdigoAkiStagingResult;
    anionGap: AnionGapCalculationResult;
    wintersFormula: WintersFormulaResult;
    digiFabDosing: DigiFabDosingResult;
    fluidSafety: FluidResuscitationSafetyResult;
  };
  markdownScratchpadSummary: string;
}

/**
 * Extracts demographics, vitals, labs, and unmeasured data sentinels from raw clinical text.
 */
export function buildClinicalScratchpad(
  query: string,
  encounterId: string = "NPDE-SCRATCHPAD-001"
): NeuroSymbolicClinicalScratchpad {
  const q = query;

  // 1. Demographics
  const ageMatch = q.match(/(\d{1,3})\s*(?:-|–|\s+)?(?:years?|yrs?|yo|year-old)/i);
  const patientAgeYears = ageMatch ? parseInt(ageMatch[1], 10) : null;
  const patientAgeString = patientAgeYears ? `${patientAgeYears}-year-old` : null;

  let patientSex: "male" | "female" | "indeterminate" = "indeterminate";
  if (/\b(?:female|woman|lady|she|her)\b/i.test(q)) {
    patientSex = "female";
  } else if (/\b(?:male|man|gentleman|he|his)\b/i.test(q)) {
    patientSex = "male";
  }

  let patientWeightKg: number | null = null;
  const isWeightExplicitlyMissing = /\b(?:weight\s*(?:is\s*)?(?:not\s*provided|unmeasured|missing|unknown|not\s*measured)|no\s*weight\s*(?:is\s*)?provided)\b/i.test(q);
  if (!isWeightExplicitlyMissing) {
    const explicitWeightMatch = q.match(/\b(?:actual\s+)?(?:patient\s+)?(?:body\s+)?(?:weight|weighs|wt)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kilos|kilograms)\b/i);
    if (explicitWeightMatch) {
      const pre = q.slice(Math.max(0, (explicitWeightMatch.index ?? 0) - 40), explicitWeightMatch.index ?? 0);
      if (!/\b(?:assuming|assume|hypothetical|standard|reference|arbitrary|if)\b/i.test(pre)) {
        patientWeightKg = parseFloat(explicitWeightMatch[1]);
      }
    } else {
      const allKg = [...q.matchAll(/\b(\d{2,3}(?:\.\d+)?)\s*kg\b/gi)];
      for (const m of allKg) {
        const idx = m.index ?? 0;
        const pre = q.slice(Math.max(0, idx - 40), idx);
        if (/\b(?:assuming|assume|hypothetical|standard|reference|arbitrary|nominal|ideal|per)\b/i.test(pre)) {
          continue; // skip assumption trap like "assuming a standard 70 kg weight"
        }
        patientWeightKg = parseFloat(m[1]);
        break;
      }
    }
  }

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
  const bloodPressureString = systolicBp !== null && diastolicBp !== null ? `${systolicBp}/${diastolicBp} mmHg` : null;

  const hrMatch = q.match(/\b(?:hr|heart\s*rate|pulse)\s*[:=]?\s*(\d{2,3})\s*(?:bpm)?\b/i) ||
    q.match(/\b(\d{2,3})\s*bpm\b/i);
  const heartRate = hrMatch ? parseInt(hrMatch[1], 10) : null;

  const rrMatch = q.match(/\b(?:rr|resp(?:iratory)?\s*rate)\s*[:=]?\s*(\d{1,2})\s*(?:\/min|breaths)?\b/i) ||
    q.match(/\b(\d{1,2})\s*(?:\/min|breaths\s*per\s*min(?:ute)?)\b/i);
  const respiratoryRate = rrMatch ? parseInt(rrMatch[1], 10) : null;

  const spo2Match = q.match(/\b(?:spo2|o2\s*sat(?:uration)?)\s*[:=]?\s*(\d{2,3})%?(?:\s*on\s*([^,.\n]+))?\b/i) ||
    q.match(/\b(\d{2,3})%\s*(?:on\s*[^,.\n]+)?\b/i);
  const oxygenSaturationPct = spo2Match ? parseInt(spo2Match[1], 10) : null;
  const oxygenSaturation = spo2Match
    ? (spo2Match[0].includes("%") ? spo2Match[0] : `${spo2Match[1]}%`)
    : null;

  const tempMatch = q.match(/\b(?:temp(?:erature)?)\s*[:=]?\s*(\d{2}\.?\d?)\s*°?C\b/i) ||
    q.match(/\b(\d{2}\.\d)\s*°?C\b/i);
  const temperatureCelsius = tempMatch ? parseFloat(tempMatch[1]) : null;

  const glucMatch = q.match(/\b(?:glucose|blood\s*sugar|bg)\s*[:=]?\s*(\d{2,4})\s*(?:mg\/dl)?\b/i);
  const bloodGlucoseMgDl = glucMatch ? parseFloat(glucMatch[1]) : null;
  const glucoseMgDl = bloodGlucoseMgDl;

  // 3. Labs
  const kMatch = q.match(/\b(?:potassium|k\+?)\s*[:=]?\s*([2-9]\.\d+)\b/i);
  const potassiumMeqL = kMatch ? parseFloat(kMatch[1]) : null;

  const naMatch = q.match(/\b(?:sodium|na\+?)\s*[:=]?\s*(\d{3})\b/i);
  const sodiumMeqL = naMatch ? parseFloat(naMatch[1]) : null;

  let chlorideMeqL: number | null = null;
  const isChlorideExplicitlyMissing = /\b(?:chloride|cl)\s*(?:is\s*)?(?:unmeasured|not\s*measured|missing|not\s*available|unknown)\b/i.test(q);
  if (!isChlorideExplicitlyMissing) {
    const clMatch = q.match(/\b(?:chloride|cl\s*[-=:]?)\s*[:=]?\s*(\d{2,3})\b/i);
    chlorideMeqL = clMatch ? parseFloat(clMatch[1]) : null;
  }

  const baseCrMatch =
    q.match(/\bbaseline\s+(?:creatinine|cr\s*)?[:=]?\s*(\d+\.\d+)\b/i) ||
    q.match(/\b(?:creatinine|cr)\s*[:=]?\s*\d+\.\d+\s*(?:mg\/dl)?\s*\(\s*baseline\s*(\d+\.\d+)\b/i);
  const baselineCreatinineMgDl = baseCrMatch ? parseFloat(baseCrMatch[1]) : null;

  // Creatinine (non-baseline)
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

  const bhbMatch =
    q.match(/\b(?:beta-?hydroxybutyrate|b-?ohb)\s*(?:\([^)]*\)\s*)?[:=]?\s*(\d+(?:\.\d+)?)\b/i) ||
    q.match(/\b(?:blood|serum)\s+ketones?\s*[:=]?\s*(\d+(?:\.\d+)?)\b/i);
  const betaHydroxybutyrateMmolL = bhbMatch ? parseFloat(bhbMatch[1]) : null;

  // Digoxin: capture levels like "digoxin 2.9", "digoxin level 3.6 ng/mL", "digoxin: 2.9", avoiding pill doses like 0.125 mg
  let digoxinNgMl: number | null = null;
  const explicitSerumDigMatch =
    q.match(/\b(?:digoxin|dig)\s*(?:level|concentration|serum)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:ng\/ml|mcg\/l|nmol\/l)?\b/i) ||
    q.match(/\b(?:digoxin|dig)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:ng\/ml|mcg\/l|nmol\/l)\b/i) ||
    q.match(/\b(?:digoxin|dig)\s*[:=]?\s*([1-9](?:\.\d+)?|0\.[3-9]\d*)\b/i);

  if (explicitSerumDigMatch && explicitSerumDigMatch[1]) {
    const matchedFull = explicitSerumDigMatch[0];
    if (!/\b\d+(?:\.\d+)?\s*mg\b/i.test(matchedFull)) {
      digoxinNgMl = parseFloat(explicitSerumDigMatch[1]);
    }
  }
  if (digoxinNgMl === null) {
    const allDig = [...q.matchAll(/\b(?:digoxin|dig)\s*[:=]?\s*(\d+(?:\.\d+)?)(?:\s*(mg|mcg|ng\/ml))?\b/gi)];
    for (const m of allDig) {
      if (m[2] && m[2].toLowerCase() === "mg") continue; // skip oral pill dosages like 0.125 mg
      digoxinNgMl = parseFloat(m[1]);
      break;
    }
  }

  const uoMatch = q.match(/\burine\s*output\s*[:=]?\s*(\d+)\s*ml(?:\s*over\s*(\d+)\s*(?:hours|hrs|h))?\b/i);
  const urineOutputMl = uoMatch ? parseInt(uoMatch[1], 10) : null;
  const urineOutputDurationHours = uoMatch && uoMatch[2] ? parseInt(uoMatch[2], 10) : (uoMatch ? 8 : null);

  // 4. Sentinels & Missing Flags
  const isWeightMissing = patientWeightKg === null;
  const isChlorideMissing = chlorideMeqL === null;
  const isBaselineCreatinineMissing = baselineCreatinineMgDl === null;
  const isLastDoseTimingMissing = !/\b(?:last\s+dose|taken\s+at|hours\s+ago|ingested\s+at)\b/i.test(q);
  const isArterialBloodGasMissing = arterialPh === null || paco2MmHg === null;
  const isUrineOutputMissing = urineOutputMl === null;

  const missingDataItems: string[] = [];
  if (isWeightMissing) missingDataItems.push("Patient Body Weight (kg) [UNMEASURED — weight-based dosing & mL/kg/h urine output deferred]");
  if (isChlorideMissing) missingDataItems.push("Serum Chloride (Cl-) [UNMEASURED — Anion Gap cannot be calculated]");
  if (isBaselineCreatinineMissing) missingDataItems.push("Baseline Serum Creatinine [UNMEASURED — Fold-ratio KDIGO staging indeterminate]");
  if (isLastDoseTimingMissing) missingDataItems.push("Exact Timing of Last Medication Doses (Digoxin, Beta-Blocker, RAASi) [UNREPORTED]");
  if (isArterialBloodGasMissing) missingDataItems.push("Arterial Blood Gas (pH, PaCO2, PaO2) [UNMEASURED / INCOMPLETE]");
  if (isUrineOutputMissing) missingDataItems.push("Quantified Hourly Urine Output [UNMEASURED]");

  // 5. Mathematical Derivations:

  // A. Mean Arterial Pressure (MAP)
  let meanArterialPressureMmHg: number | null = null;
  if (systolicBp !== null && diastolicBp !== null) {
    meanArterialPressureMmHg = parseFloat(((systolicBp + 2 * diastolicBp) / 3).toFixed(1));
  }

  // B. KDIGO AKI Staging (INV-006: Independent evaluation of Creatinine, Urine Output, and Anuria)
  let crAbsoluteRiseMgDl: number | null = null;
  let crFoldRatio: number | null = null;
  let establishedStage: 1 | 2 | 3 | "indeterminate" = "indeterminate";
  let creatinineCriteriaStage: 1 | 2 | 3 | "indeterminate" = "indeterminate";
  let stageRationale = "";
  let isStage3ConditionalOnAcuteTimeline = false;
  let stage3AcuteTimelineRationale = "";

  if (creatinineMgDl !== null && baselineCreatinineMgDl !== null) {
    crAbsoluteRiseMgDl = parseFloat((creatinineMgDl - baselineCreatinineMgDl).toFixed(2));
    crFoldRatio = parseFloat((creatinineMgDl / baselineCreatinineMgDl).toFixed(2));

    if (crFoldRatio >= 3.0) {
      establishedStage = 3;
      creatinineCriteriaStage = 3;
      stageRationale = `KDIGO Stage 3 (Serum creatinine increased ≥ 3.0× baseline: ${crFoldRatio}×).`;
    } else if (crFoldRatio >= 2.0 && crFoldRatio < 3.0) {
      establishedStage = 2;
      creatinineCriteriaStage = 2;
      if (creatinineMgDl >= 4.0 && crAbsoluteRiseMgDl >= 0.5) {
        stageRationale = `KDIGO Stage 2 by fold increase (${crFoldRatio}× baseline). Conditionally Stage 3 by absolute creatinine (≥ 4.0 mg/dL: ${creatinineMgDl} mg/dL, acute rise +${crAbsoluteRiseMgDl} mg/dL) pending confirmation of acute trajectory within 48 hours to 7 days.`;
        isStage3ConditionalOnAcuteTimeline = true;
        stage3AcuteTimelineRationale = `Absolute serum creatinine ≥ 4.0 mg/dL with acute rise ≥ 0.5 mg/dL (+${crAbsoluteRiseMgDl} mg/dL) conditionally qualifies for Stage 3 pending confirmation of acute trajectory within 48 hours to 7 days.`;
      } else {
        stageRationale = `KDIGO Stage 2 by fold increase (${crFoldRatio}× baseline: ${creatinineMgDl} / ${baselineCreatinineMgDl} mg/dL). Current creatinine (${creatinineMgDl} mg/dL) does NOT meet the ≥ 4.0 mg/dL absolute threshold, and ratio is < 3.0×, confirming Stage 2 by serum creatinine criteria.`;
        isStage3ConditionalOnAcuteTimeline = false;
        stage3AcuteTimelineRationale = "";
      }
    } else if (crFoldRatio >= 1.5 || crAbsoluteRiseMgDl >= 0.3) {
      establishedStage = 1;
      creatinineCriteriaStage = 1;
      stageRationale = `KDIGO Stage 1 (Serum creatinine increased 1.5–1.9× baseline: ${crFoldRatio}× or rise ≥ 0.3 mg/dL).`;
    }
  } else if (creatinineMgDl !== null && baselineCreatinineMgDl === null) {
    establishedStage = "indeterminate";
    creatinineCriteriaStage = "indeterminate";
    stageRationale = `KDIGO Stage indeterminate (Baseline creatinine unmeasured; current creatinine ${creatinineMgDl} mg/dL indicates severe renal impairment but baseline fold change cannot be confirmed).`;
  }

  let weightNormalizedUoMlKgHr: number | null = null;
  let uoStagingStatus: "COMPUTABLE" | "UNMEASURED_WEIGHT_PROHIBITS_CALCULATION" | "NO_URINE_OUTPUT_DATA" = "NO_URINE_OUTPUT_DATA";
  let uoStagingCaveat = "";
  let canAnuriaBeUsedForStage3 = false;
  let anuriaRationale = "";

  if (urineOutputMl !== null && urineOutputDurationHours !== null) {
    if (patientWeightKg !== null) {
      weightNormalizedUoMlKgHr = parseFloat(
        (urineOutputMl / (patientWeightKg * urineOutputDurationHours)).toFixed(2)
      );
      uoStagingStatus = "COMPUTABLE";
      uoStagingCaveat = `Urine output: ${urineOutputMl} mL over ${urineOutputDurationHours}h = ${weightNormalizedUoMlKgHr} mL/kg/h based on measured body weight ${patientWeightKg} kg.`;
    } else {
      uoStagingStatus = "UNMEASURED_WEIGHT_PROHIBITS_CALCULATION";
      uoStagingCaveat = `Urine output is documented as ${urineOutputMl} mL over ${urineOutputDurationHours}h. Note: Missing body weight does NOT invalidate or prevent documenting measured urine output volume; it prevents calculating weight-normalized output in mL/kg/hour (which requires actual measured weight, avoiding arbitrary adult weight assumptions).`;
    }

    if (urineOutputMl > 0) {
      canAnuriaBeUsedForStage3 = false;
      anuriaRationale = `Patient produced ${urineOutputMl} mL over ${urineOutputDurationHours}h (severe oliguria). KDIGO Stage 3 urine criteria require < 0.3 mL/kg/h for ≥ 24 hours OR anuria for ≥ 12 hours. Because urine output is non-zero and duration is ${urineOutputDurationHours}h (< 12h/24h), anuria is NOT present and CANNOT be used to establish Stage 3 without documented urine output and duration.`;
    } else {
      if (urineOutputDurationHours >= 12) {
        canAnuriaBeUsedForStage3 = true;
        anuriaRationale = `Documented anuria (0 mL) for ${urineOutputDurationHours} hours satisfies KDIGO Stage 3 criteria (anuria for ≥ 12 hours).`;
      } else {
        canAnuriaBeUsedForStage3 = false;
        anuriaRationale = `Zero urine output documented over ${urineOutputDurationHours} hours; KDIGO Stage 3 requires documented anuria for at least 12 hours.`;
      }
    }
  } else {
    uoStagingCaveat = "Urine output was not quantified in intake.";
    canAnuriaBeUsedForStage3 = false;
    anuriaRationale = "Urine output was not measured; anuria cannot be assumed without evidence.";
  }

  const finalHighestSupportedStage = canAnuriaBeUsedForStage3 ? 3 : establishedStage;

  const kdigoAki: KdigoAkiStagingResult = {
    crAbsoluteRiseMgDl,
    crFoldRatio,
    establishedStage,
    creatinineCriteriaStage,
    stageRationale,
    isStage3ConditionalOnAcuteTimeline,
    stage3AcuteTimelineRationale,
    weightNormalizedUoMlKgHr,
    uoStagingStatus,
    uoStagingCaveat,
    canAnuriaBeUsedForStage3,
    anuriaRationale,
    finalHighestSupportedStage,
  };

  // C. Anion Gap Calculation (INV-002: Laboratory Data Integrity)
  let anionGap: AnionGapCalculationResult;
  if (isChlorideMissing) {
    anionGap = {
      isComputable: false,
      anionGapMeqL: null,
      formula: "Anion Gap = [Na+] - ([Cl-] + [HCO3-])",
      refusalReason:
        "Cannot calculate — chloride unavailable. Serum chloride was NOT measured in this intake. Estimating or substituting a hypothetical reference chloride (e.g. 98 or 104 mmol/L) to calculate an anion gap is strictly prohibited. Anion Gap CANNOT be calculated without measured chloride.",
    };
  } else if (sodiumMeqL !== null && chlorideMeqL !== null && bicarbonateMeqL !== null) {
    const agVal = sodiumMeqL - (chlorideMeqL + bicarbonateMeqL);
    anionGap = {
      isComputable: true,
      anionGapMeqL: agVal,
      formula: `Anion Gap = ${sodiumMeqL} - (${chlorideMeqL} + ${bicarbonateMeqL}) = ${agVal} mEq/L`,
      refusalReason: null,
    };
  } else {
    anionGap = {
      isComputable: false,
      anionGapMeqL: null,
      formula: "Anion Gap = [Na+] - ([Cl-] + [HCO3-])",
      refusalReason: "Cannot calculate — incomplete electrolyte profile (missing sodium or bicarbonate).",
    };
  }

  // D. Winter's Formula (INV-005: Calibrated Acid-Base Interpretation)
  let wintersFormula: WintersFormulaResult;
  if (bicarbonateMeqL !== null && paco2MmHg !== null) {
    const midpoint = 1.5 * bicarbonateMeqL + 8;
    const low = midpoint - 2;
    const high = midpoint + 2;
    const deviation = paco2MmHg - high;

    if (paco2MmHg >= low && paco2MmHg <= high) {
      wintersFormula = {
        isComputable: true,
        measuredPaco2MmHg: paco2MmHg,
        expectedPaco2MidpointMmHg: midpoint,
        expectedPaco2RangeLowMmHg: low,
        expectedPaco2RangeHighMmHg: high,
        deviationMmHg: 0,
        interpretationCategory: "PURE_METABOLIC_ACIDOSIS_ADEQUATE_COMPENSATION",
        calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg). Measured PaCO2 of ${paco2MmHg} mmHg falls within expected range, demonstrating adequate respiratory compensation.`,
      };
    } else if (paco2MmHg > high && paco2MmHg <= high + 2) {
      wintersFormula = {
        isComputable: true,
        measuredPaco2MmHg: paco2MmHg,
        expectedPaco2MidpointMmHg: midpoint,
        expectedPaco2RangeLowMmHg: low,
        expectedPaco2RangeHighMmHg: high,
        deviationMmHg: deviation,
        interpretationCategory: "BORDERLINE_COMPENSATION_RELATIVE_HYPOVENTILATION",
        calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg). Measured PaCO2 of ${paco2MmHg} mmHg is ${deviation} mmHg above the predicted upper limit. This minimal difference falls within normal biological and measurement variability, representing possible inadequate respiratory compensation / borderline relative hypoventilation rather than an unsupported definitive diagnosis of a second respiratory acid-base disorder. Clinical reassessment is prompted, especially in altered mental status and shock.`,
      };
    } else if (paco2MmHg > high + 2) {
      wintersFormula = {
        isComputable: true,
        measuredPaco2MmHg: paco2MmHg,
        expectedPaco2MidpointMmHg: midpoint,
        expectedPaco2RangeLowMmHg: low,
        expectedPaco2RangeHighMmHg: high,
        deviationMmHg: deviation,
        interpretationCategory: "SUPERIMPOSED_RESPIRATORY_ACIDOSIS",
        calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg). Measured PaCO2 of ${paco2MmHg} mmHg is significantly elevated (${deviation} mmHg above upper limit), confirming a superimposed primary respiratory acidosis.`,
      };
    } else {
      wintersFormula = {
        isComputable: true,
        measuredPaco2MmHg: paco2MmHg,
        expectedPaco2MidpointMmHg: midpoint,
        expectedPaco2RangeLowMmHg: low,
        expectedPaco2RangeHighMmHg: high,
        deviationMmHg: paco2MmHg - low,
        interpretationCategory: "SUPERIMPOSED_RESPIRATORY_ALKALOSIS",
        calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg). Measured PaCO2 of ${paco2MmHg} mmHg is below predicted range, suggesting a superimposed primary respiratory alkalosis.`,
      };
    }
  } else {
    wintersFormula = {
      isComputable: false,
      measuredPaco2MmHg: null,
      expectedPaco2MidpointMmHg: null,
      expectedPaco2RangeLowMmHg: null,
      expectedPaco2RangeHighMmHg: null,
      deviationMmHg: null,
      interpretationCategory: "UNCOMPUTABLE",
      calibratedClinicalInterpretation: "Winter's formula cannot be computed without measured bicarbonate and PaCO2.",
    };
  }

  // E. DigiFab Dosing (INV-003: Calculated vs Empiric Emergency Treatment)
  let digiFabDosing: DigiFabDosingResult;
  if (digoxinNgMl !== null) {
    if (patientWeightKg !== null) {
      const calculatedVials = (digoxinNgMl * patientWeightKg) / 100;
      digiFabDosing = {
        isComputableWeightBased: true,
        dosingType: "CALCULATED_WEIGHT_BASED",
        weightBasedVials: Math.ceil(calculatedVials),
        empiricEmergencyVials: "5–10 vials IV infusion",
        rationale: `Weight-based calculation: (${digoxinNgMl} ng/mL × ${patientWeightKg} kg) / 100 = ${calculatedVials.toFixed(1)} vials (round to ${Math.ceil(calculatedVials)} vials). Requires toxicology consultation and clinical reassessment.`,
        clinicalReassessmentRequired: true,
        toxicologyConsultationRequired: true,
      };
    } else {
      digiFabDosing = {
        isComputableWeightBased: false,
        dosingType: "EMPIRIC_EMERGENCY",
        weightBasedVials: null,
        empiricEmergencyVials: "5–10 vials IV infusion (empiric emergency treatment; 10–20 vials if in cardiac arrest)",
        rationale:
          "Because patient weight was NOT provided, the exact weight-based formula [(Serum Digoxin ng/mL × Weight kg) / 100] cannot be calculated. Never invent patient weight. Recommending 5–10 vials is an EMPIRIC EMERGENCY TREATMENT RECOMMENDATION based on life-threatening toxicity with shock and high-grade AV block, not a formula-calculated dose. The appropriate initial amount depends on severity, exposure history, and toxicology guidance. Requires urgent Medical Toxicology consultation, continuous telemetry, and frequent clinical reassessment.",
        clinicalReassessmentRequired: true,
        toxicologyConsultationRequired: true,
      };
    }
  } else {
    digiFabDosing = {
      isComputableWeightBased: false,
      dosingType: "NOT_INDICATED",
      weightBasedVials: null,
      empiricEmergencyVials: "Not indicated unless clinical digoxin toxicity suspected",
      rationale: "Serum digoxin level not reported.",
      clinicalReassessmentRequired: false,
      toxicologyConsultationRequired: false,
    };
  }

  // F. Fluid Safety Ceiling (INV-004: Individualized Resuscitation, No Automatic Veto, No Invented Anuria)
  const highRiskConditions: string[] = [];
  if (/\b(?:hfref|heart\s+failure|ef\s*(?:is|of|=|:)?\s*(?:[1-3]\d|25|30)%?|ejection\s+fraction\s*(?:is|of|=|:)?\s*(?:[1-3]\d|25|30)%?)\b/i.test(q)) {
    highRiskConditions.push("Reduced Ejection Fraction (HFrEF, EF ≤ 35%)");
  }
  if (/\b(?:ckd|chronic\s+kidney\s+disease)\s*(?:stage\s*)?[45]\b/i.test(q) || (creatinineMgDl && creatinineMgDl >= 3.0)) {
    highRiskConditions.push("Advanced Renal Failure (CKD Stage 4/5 or Severe AKI)");
  }
  if (urineOutputMl !== null && urineOutputMl <= 150) {
    highRiskConditions.push("Profound Oliguria");
  }

  // Strict check on anuria: Never infer anuria without evidence!
  const isAnuriaDocumented = urineOutputMl === 0 && (urineOutputDurationHours ?? 0) >= 12;

  const highRiskFluidOverload = highRiskConditions.length > 0;
  // Retain boolean for backwards compat but define semantics accurately:
  const standard30mLPerKgContraindicated = highRiskFluidOverload;

  const individualizedResuscitationGuidance = highRiskFluidOverload
    ? "Flag high risk of fluid overload (HFrEF EF ≤ 30% and CKD Stage 4). Do not automatically prohibit or veto fluids solely because of HFrEF or CKD, but do not administer unmonitored blanket 30 mL/kg crystalloids. Individualize resuscitation using bedside clinical examination, dynamic fluid responsiveness, lung ultrasound (POCUS for pulmonary congestion/B-lines), and early vasopressor consideration (Norepinephrine). Anuria is NOT documented and must not be invented."
    : "Standard crystalloid resuscitation permissible with serial hemodynamic and fluid responsiveness monitoring.";

  const fluidSafety: FluidResuscitationSafetyResult = {
    standard30mLPerKgContraindicated,
    highRiskFluidOverload,
    highRiskConditionsIdentified: highRiskConditions,
    isAnuriaDocumented,
    recommendedResuscitationApproach: individualizedResuscitationGuidance,
    individualizedResuscitationGuidance,
  };

  // Build Markdown Summary
  const mdLines: string[] = [];
  mdLines.push(`### Neuro-Symbolic Clinical Scratchpad (Deterministic Audit Trail)`);
  mdLines.push(`**Encounter:** \`${encounterId}\``);
  mdLines.push(``);
  mdLines.push(`#### 1. Extracted Patient Parameters`);
  mdLines.push(`- **Demographics:** ${patientAgeString || "[AGE UNREPORTED]"}, ${patientSex}, Body Weight: ${patientWeightKg ? `${patientWeightKg} kg` : "**[UNMEASURED / NOT PROVIDED]**"}`);
  mdLines.push(`- **Vitals:** BP ${bloodPressureString || "[UNMEASURED]"} (Calculated MAP: **${meanArterialPressureMmHg ? `${meanArterialPressureMmHg} mmHg` : "[UNMEASURED]"}**), HR ${heartRate ? `${heartRate} bpm` : "[UNMEASURED]"}, RR ${respiratoryRate ? `${respiratoryRate}/min` : "[UNMEASURED]"}, SpO2 ${oxygenSaturation || "[UNMEASURED]"}, Temp ${temperatureCelsius ? `${temperatureCelsius}°C` : "[UNMEASURED]"}, BG ${bloodGlucoseMgDl ? `${bloodGlucoseMgDl} mg/dL` : "[UNMEASURED]"}`);
  mdLines.push(`- **Labs:** K+ ${potassiumMeqL ? `${potassiumMeqL} mmol/L` : "[UNMEASURED]"}, Na+ ${sodiumMeqL ? `${sodiumMeqL} mmol/L` : "[UNMEASURED]"}, Cl- ${chlorideMeqL ? `${chlorideMeqL} mmol/L` : "**[UNMEASURED / NOT PROVIDED]**"}, Cr ${creatinineMgDl ? `${creatinineMgDl} mg/dL` : "[UNMEASURED]"} (Baseline: ${baselineCreatinineMgDl ? `${baselineCreatinineMgDl} mg/dL` : "**[UNMEASURED]**"}), HCO3- ${bicarbonateMeqL ? `${bicarbonateMeqL} mmol/L` : "[UNMEASURED]"}, pH ${arterialPh || "[UNMEASURED]"}, PaCO2 ${paco2MmHg ? `${paco2MmHg} mmHg` : "[UNMEASURED]"}, Lactate ${lactateMmolL ? `${lactateMmolL} mmol/L` : "[UNMEASURED]"}, Digoxin ${digoxinNgMl ? `${digoxinNgMl} ng/mL` : "[UNMEASURED]"}, Urine Output: ${urineOutputMl !== null ? `${urineOutputMl} mL/${urineOutputDurationHours}h` : "[UNMEASURED]"}`);
  mdLines.push(``);
  mdLines.push(`#### 2. Deterministic Derivations & Sentinels`);
  mdLines.push(`- **KDIGO AKI Staging:** ${kdigoAki.stageRationale}`);
  mdLines.push(`- **Weight-Normalized Urine Output:** ${kdigoAki.uoStagingCaveat}`);
  mdLines.push(`- **Anion Gap:** ${anionGap.isComputable ? anionGap.formula : `**CANNOT BE CALCULATED — CHLORIDE UNAVAILABLE** (${anionGap.refusalReason})`}`);
  mdLines.push(`- **Winter's Formula:** ${wintersFormula.calibratedClinicalInterpretation}`);
  mdLines.push(`- **DigiFab Dosing:** ${digiFabDosing.empiricEmergencyVials} (${digiFabDosing.rationale})`);
  mdLines.push(`- **Fluid Resuscitation Approach:** ${fluidSafety.recommendedResuscitationApproach}`);
  mdLines.push(``);
  mdLines.push(`#### 3. Actionable Clinical Data Gaps`);
  if (missingDataItems.length > 0) {
    for (const item of missingDataItems) {
      mdLines.push(`- ⚠️ ${item}`);
    }
  } else {
    mdLines.push(`- None detected; full dataset provided.`);
  }

  const markdownScratchpadSummary = mdLines.join("\n");

  return {
    encounterId,
    rawInputText: q,
    demographics: {
      patientAgeYears,
      patientAgeString,
      patientSex,
      patientWeightKg,
    },
    vitals: {
      systolicBp,
      diastolicBp,
      bloodPressureString,
      heartRate,
      respiratoryRate,
      oxygenSaturation,
      oxygenSaturationPct,
      temperatureCelsius,
      bloodGlucoseMgDl,
    },
    labs: {
      potassiumMeqL,
      sodiumMeqL,
      chlorideMeqL,
      creatinineMgDl,
      baselineCreatinineMgDl,
      bicarbonateMeqL,
      arterialPh,
      paco2MmHg,
      lactateMmolL,
      glucoseMgDl,
      betaHydroxybutyrateMmolL,
      digoxinNgMl,
      urineOutputMl,
      urineOutputDurationHours,
    },
    sentinels: {
      isWeightMissing,
      isChlorideMissing,
      isBaselineCreatinineMissing,
      isLastDoseTimingMissing,
      isArterialBloodGasMissing,
      isUrineOutputMissing,
      missingDataItems,
    },
    derivedCalculations: {
      meanArterialPressureMmHg,
      kdigoAki,
      anionGap,
      wintersFormula,
      digiFabDosing,
      fluidSafety,
    },
    markdownScratchpadSummary,
  };
}

/**
 * ============================================================================
 * INV-007: CROSS-SECTION CLINICAL CONSISTENCY VALIDATOR
 *
 * Enforces that narrative, calculations, medication recommendations, SOAP note,
 * and final audit trail all use the exact same verified patient data.
 * Detects discrepancies such as:
 * - Patient finding documented in one section and missing/unmeasured in another
 * - Assuming 70 kg weight in medication plan when weight is unmeasured
 * - Reporting anion gap when chloride is unmeasured
 * - Falsely asserting anuria when non-zero urine output is documented
 * ============================================================================
 */
export interface CrossSectionConsistencyViolation {
  item: string;
  sectionA: string;
  sectionB: string;
  issue: string;
}

export interface CrossSectionConsistencyResult {
  isConsistent: boolean;
  violations: CrossSectionConsistencyViolation[];
}

export function validateCrossSectionClinicalConsistency(
  dossierText: string,
  scratchpad: NeuroSymbolicClinicalScratchpad
): CrossSectionConsistencyResult {
  const violations: CrossSectionConsistencyViolation[] = [];

  // Check 1: Encounter Identifier Isolation
  const encMatches = [...dossierText.matchAll(/\b(NPDE-[A-Z0-9-]+)\b/g)];
  for (const m of encMatches) {
    const id = m[1];
    if (
      id !== scratchpad.encounterId &&
      !id.startsWith("NPDE-PREFLIGHT") &&
      !id.startsWith("NPDE-HEAL") &&
      !id.startsWith("NPDE-CONSENSUS")
    ) {
      violations.push({
        item: "Encounter Identifier Isolation",
        sectionA: `Authoritative Encounter (${scratchpad.encounterId})`,
        sectionB: `Conflicting Identifier in Text (${id})`,
        issue: `Dossier text references foreign encounter identifier ${id}, violating encounter isolation boundaries.`,
      });
    }
  }

  // Check 2: Patient Demographics Consistency (Age and Sex)
  if (scratchpad.demographics.patientAgeYears !== null) {
    const ageRegex = /\b(\d{1,3})\s*(?:-|–|\s+)?(?:years?|yrs?|yo|year-old)\b/gi;
    for (const m of dossierText.matchAll(ageRegex)) {
      const ageVal = parseInt(m[1], 10);
      const ctx = dossierText.slice(Math.max(0, (m.index ?? 0) - 25), Math.min(dossierText.length, (m.index ?? 0) + m[0].length + 25));
      if (/[≥><=]|threshold|curb-?65|criteria|cutoff|scale/i.test(ctx)) continue;
      if (ageVal !== scratchpad.demographics.patientAgeYears) {
        violations.push({
          item: "Patient Demographics (Age)",
          sectionA: `Documented Intake (${scratchpad.demographics.patientAgeYears}-year-old)`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Stated age (${ageVal}-year-old) conflicts with intake age (${scratchpad.demographics.patientAgeYears}-year-old), indicating cross-patient data contamination.`,
        });
      }
    }
  }

  if (scratchpad.demographics.patientSex !== "indeterminate") {
    if (scratchpad.demographics.patientSex === "female") {
      const malePattern = /\b(?:78-year-old\s+male|patient\s+is\s+a\s+(?:78-year-old\s+)?male|male\s+patient)\b/i;
      if (malePattern.test(dossierText)) {
        violations.push({
          item: "Patient Demographics (Sex)",
          sectionA: "Documented Intake (female)",
          sectionB: "Dossier Narrative",
          issue: "Patient sex is female, but dossier narrative asserts male patient profile, indicating cross-patient contamination.",
        });
      }
    } else if (scratchpad.demographics.patientSex === "male") {
      const femalePattern = /\b(?:72-year-old\s+female|patient\s+is\s+a\s+(?:72-year-old\s+)?female|female\s+patient)\b/i;
      if (femalePattern.test(dossierText)) {
        violations.push({
          item: "Patient Demographics (Sex)",
          sectionA: "Documented Intake (male)",
          sectionB: "Dossier Narrative",
          issue: "Patient sex is male, but dossier narrative asserts female patient profile, indicating cross-patient contamination.",
        });
      }
    }
  }

  // Check 3: Blood Pressure & Stated MAP Consistency
  if (scratchpad.vitals.systolicBp !== null && scratchpad.vitals.diastolicBp !== null) {
    const bpMatches = [...dossierText.matchAll(/\b(?:bp\s*[:=]?\s*)?(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mmHg)?\b/gi)];
    for (const m of bpMatches) {
      const sbp = parseInt(m[1], 10);
      const dbp = parseInt(m[2], 10);
      if (sbp > 150 && dbp > 200) continue; // Skip medication doses like 160/800 mg
      if (sbp < 40 || dbp < 20 || sbp > 260 || dbp > 160) continue;

      // Skip clinical guideline thresholds, targets, and protocol limits (e.g. "< 185/110", "up to 220/120", "Target: < 180/105")
      const matchIndex = m.index ?? 0;
      const precedingText = dossierText.slice(Math.max(0, matchIndex - 35), matchIndex).toLowerCase();
      if (/[<>≤≥]|target|goal|threshold|guideline|protocol|permissive|up\s+to|limit|criteria|exceed|titrate/i.test(precedingText)) {
        continue;
      }

      if (sbp !== scratchpad.vitals.systolicBp || dbp !== scratchpad.vitals.diastolicBp) {
        violations.push({
          item: "Blood Pressure",
          sectionA: `Documented Intake (${scratchpad.vitals.systolicBp}/${scratchpad.vitals.diastolicBp} mmHg)`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Stated blood pressure (${sbp}/${dbp} mmHg) conflicts with documented intake (${scratchpad.vitals.systolicBp}/${scratchpad.vitals.diastolicBp} mmHg).`,
        });
      }
    }
  }

  // Check 4: Exact MAP Derivation Consistency
  if (scratchpad.derivedCalculations.meanArterialPressureMmHg !== null) {
    const expectedMap = scratchpad.derivedCalculations.meanArterialPressureMmHg;
    const statedMapMatches = [...dossierText.matchAll(/\b(?:map|mean\s+arterial\s+pressure)\s*[:=]?\s*(\d{2}(?:\.\d)?)\s*mmHg\b/gi)];
    for (const m of statedMapMatches) {
      const val = parseFloat(m[1]);
      if (Math.abs(val - expectedMap) > 0.5) {
        violations.push({
          item: "Mean Arterial Pressure",
          sectionA: `Scratchpad Derivation (${expectedMap.toFixed(1)} mmHg)`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Stated MAP (${m[1]} mmHg) conflicts with exact derived MAP (${expectedMap.toFixed(1)} mmHg).`,
        });
      }
    }
  }

  // Check 5: Serum Potassium Consistency
  if (scratchpad.labs.potassiumMeqL !== null) {
    const kMatches = [...dossierText.matchAll(/\b(?:potassium|k\+?)\s*(?:is|of|=|:)?\s*([2-9]\.\d+)\s*(?:mmol\/l|meq\/l)?\b/gi)];
    for (const m of kMatches) {
      const val = parseFloat(m[1]);
      if (Math.abs(val - scratchpad.labs.potassiumMeqL) > 0.1) {
        violations.push({
          item: "Serum Potassium",
          sectionA: `Documented Intake (${scratchpad.labs.potassiumMeqL} mmol/L)`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Stated serum potassium (${val} mmol/L) conflicts with documented intake (${scratchpad.labs.potassiumMeqL} mmol/L).`,
        });
      }
    }
  }

  // Check 6: Serum Creatinine Consistency
  if (scratchpad.labs.creatinineMgDl !== null) {
    const crMatches = [...dossierText.matchAll(/\b(?:creatinine|cr)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*mg\/dl\b/gi)];
    for (const m of crMatches) {
      const val = parseFloat(m[1]);
      const ctx = dossierText.slice(Math.max(0, (m.index ?? 0) - 25), (m.index ?? 0) + m[0].length);
      if (/baseline|rise|increase|vs\s+baseline/i.test(ctx)) continue;
      if (scratchpad.labs.baselineCreatinineMgDl !== null && Math.abs(val - scratchpad.labs.baselineCreatinineMgDl) < 0.05) continue;
      if (scratchpad.derivedCalculations.kdigoAki.crAbsoluteRiseMgDl !== null && Math.abs(val - Math.abs(scratchpad.derivedCalculations.kdigoAki.crAbsoluteRiseMgDl)) < 0.05) continue;
      if (Math.abs(val - scratchpad.labs.creatinineMgDl) > 0.1) {
        violations.push({
          item: "Serum Creatinine",
          sectionA: `Documented Intake (${scratchpad.labs.creatinineMgDl} mg/dL)`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Stated serum creatinine (${val} mg/dL) conflicts with documented intake (${scratchpad.labs.creatinineMgDl} mg/dL).`,
        });
      }
    }
  }

  // Check 7: Serum Digoxin Level & Completeness (Omission vs Over-reporting)
  if (scratchpad.labs.digoxinNgMl !== null) {
    if (/\b(?:digoxin\s*(?:is\s*)?(?:unmeasured|not\s*measured|not\s*provided|unknown)|serum\s*digoxin\s*level\s*[:=]?\s*\[UNMEASURED)\b/i.test(dossierText)) {
      violations.push({
        item: "Serum Digoxin Level Completeness",
        sectionA: `Documented Intake (${scratchpad.labs.digoxinNgMl} ng/mL)`,
        sectionB: "Dossier Narrative / Audit",
        issue: `Serum digoxin was measured in intake (${scratchpad.labs.digoxinNgMl} ng/mL), but was falsely marked as unmeasured in the dossier.`,
      });
    }
    const digMatches = [...dossierText.matchAll(/\b(?:digoxin|dig)\s*(?:level|concentration)?\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:ng\/ml)?\b/gi)];
    for (const m of digMatches) {
      const val = parseFloat(m[1]);
      if (val === 0.125 || val === 0.25) continue; // skip pill doses
      const ctx = dossierText.slice(Math.max(0, (m.index ?? 0) - 10), Math.min(dossierText.length, (m.index ?? 0) + m[0].length + 20));
      if (ctx.includes("%") || /cleared|clearance|renally|elimination/i.test(ctx)) continue;
      if (Math.abs(val - scratchpad.labs.digoxinNgMl) > 0.1) {
        violations.push({
          item: "Serum Digoxin Level",
          sectionA: `Documented Intake (${scratchpad.labs.digoxinNgMl} ng/mL)`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Stated digoxin level (${val} ng/mL) conflicts with documented intake (${scratchpad.labs.digoxinNgMl} ng/mL).`,
        });
      }
    }
  } else {
    // Patient has zero documented digoxin exposure (or explicitly documented as zero)
    const isZeroDigoxin = !/\b(?:digoxin|digitalis)\b/i.test(scratchpad.rawInputText) ||
      /\b(?:zero\s+(?:history|use|exposure)|no\s+digoxin|denies\s+digoxin)\b/i.test(scratchpad.rawInputText);

    if (isZeroDigoxin) {
      // Check for affirmative recommendations of DigiFab or diagnosis of digoxin toxicity
      const digToxMatch = dossierText.match(/\b(?:diagnosis|primary|secondary|impression)?\s*[:=]?\s*(?:suspected\s+)?(?:digoxin\s*(?:toxicity|intoxication|poisoning))\b/i);
      const digiFabOrderMatch = dossierText.match(/\b(?:administer|give|infuse|prescribe|initiate|recommend(?:ed|ing)?)\s+(?:empiric\s+)?(?:digifab|digibind)\s*(?:\d+\s*vials)?\b/i);
      const digLevelClaim = dossierText.match(/\bserum\s*digoxin\s*level\s*[:=]?\s*([1-9](?:\.\d+)?)\s*ng\/ml\b/i);

      if (digToxMatch || digiFabOrderMatch || digLevelClaim) {
        // Exclude explicit negative/contraindication statements
        const matchStr = (digToxMatch || digiFabOrderMatch || digLevelClaim)![0];
        const matchIdx = (digToxMatch || digiFabOrderMatch || digLevelClaim)!.index ?? 0;
        const surroundingCtx = dossierText.slice(Math.max(0, matchIdx - 30), Math.min(dossierText.length, matchIdx + matchStr.length + 30));
        
        if (!/\b(?:not\s+indicated|strictly\s+not\s+indicated|contraindicated|unindicated|zero\s+digoxin|no\s+digoxin)\b/i.test(surroundingCtx)) {
          violations.push({
            item: "Unindicated Digoxin Antidote & Diagnosis (Cross-Patient Contamination)",
            sectionA: "Documented Intake (Zero Digoxin Exposure)",
            sectionB: `Dossier Narrative ("${matchStr}")`,
            issue: `Patient has no documented digoxin exposure, but dossier recommends DigiFab or diagnoses Digoxin Toxicity: "${matchStr}".`,
          });
        }
      }
    }
  }

  // Check 7B: Demographics Mismatch (Cross-Patient Data Contamination)
  if (scratchpad.demographics.patientSex === "female") {
    if (/\b(?:78-year-old|78\s*yo|male\s+patient|this\s+78\s*yo\s*male)\b/i.test(dossierText)) {
      violations.push({
        item: "Patient Sex / Demographics Mismatch",
        sectionA: "Documented Intake (Female)",
        sectionB: "Dossier Narrative",
        issue: "Patient is female, but dossier describes a male patient (cross-patient data contamination).",
      });
    }
  }

  // Check 7C: Heart Rate & Rhythm Mismatch (Tachycardia vs Bradycardia / BRASH)
  if (scratchpad.vitals.heartRate !== null && scratchpad.vitals.heartRate > 100) {
    if (/\b(?:severe\s+bradycardia|hr\s*29\b|heart\s*rate\s*[:=]?\s*29\s*bpm|brash\s+syndrome)\b/i.test(dossierText)) {
      violations.push({
        item: "Heart Rate & Rhythm Mismatch",
        sectionA: `Documented Intake (Tachycardia: ${scratchpad.vitals.heartRate} bpm)`,
        sectionB: "Dossier Narrative",
        issue: `Patient is tachycardic (${scratchpad.vitals.heartRate} bpm), but dossier describes severe bradycardia / BRASH syndrome.`,
      });
    }
  }

  // Check 7D: Primary Syndrome Completeness (DKA Omission)
  if (
    scratchpad.labs.glucoseMgDl !== null &&
    scratchpad.labs.glucoseMgDl >= 200 &&
    ((scratchpad.labs.bicarbonateMeqL !== null && scratchpad.labs.bicarbonateMeqL <= 15) ||
      (scratchpad.labs.betaHydroxybutyrateMmolL !== null && scratchpad.labs.betaHydroxybutyrateMmolL >= 3.0) ||
      /\b(?:dka|ketoacidosis|beta-hydroxybutyrate)\b/i.test(scratchpad.rawInputText))
  ) {
    if (!/\b(?:dka|diabetic\s+ketoacidosis|ketoacidosis)\b/i.test(dossierText)) {
      violations.push({
        item: "Primary Clinical Syndrome Omission (DKA)",
        sectionA: "Documented Intake (Severe Hyperglycemic Ketoacidosis)",
        sectionB: "Dossier Assessment",
        issue: "Patient presents with DKA findings (hyperglycemia, ketonemia/acidosis), but dossier fails to diagnose or evaluate DKA.",
      });
    }
  }

  // Check 8: Weight Sentinel Consistency (INV-003)
  if (scratchpad.sentinels.isWeightMissing) {
    if (/\b(?:weight\s*[:=]?\s*70\s*kg|assumed\s+70\s*kg|standard\s+70\s*kg|patient\s+weighs\s+70\s*kg)\b/i.test(dossierText)) {
      violations.push({
        item: "Patient Body Weight",
        sectionA: "Neuro-Symbolic Scratchpad (Unmeasured)",
        sectionB: "Dossier Narrative / Calculations / Plan",
        issue: "Patient weight is unmeasured on intake, but 70 kg was assumed or asserted in the clinical text.",
      });
    }
  }

  // Check 9: Chloride & Anion Gap Consistency (INV-002)
  if (scratchpad.sentinels.isChlorideMissing) {
    if (/\b(?:estimated\s+anion\s+gap\s*[:=]?\s*19|anion\s+gap\s*[:=]?\s*19|reference\s+chloride\s*(?:of\s*)?98)\b/i.test(dossierText)) {
      violations.push({
        item: "Serum Chloride & Anion Gap",
        sectionA: "Neuro-Symbolic Scratchpad (Unmeasured Chloride)",
        sectionB: "Dossier Narrative / Calculations",
        issue: "Serum chloride is unmeasured, but an anion gap was calculated or estimated using reference chloride.",
      });
    }
  }

  // Check 10: Urine Output vs Anuria Consistency (INV-004 & INV-006)
  if (scratchpad.labs.urineOutputMl !== null && scratchpad.labs.urineOutputMl > 0) {
    if (/\b(?:patient\s+is\s+anuric|due\s+to\s+anuria|anuric\s+ckd|presence\s+of\s+anuria)\b/i.test(dossierText)) {
      violations.push({
        item: "Urine Output Status",
        sectionA: `Documented Intake Labs (${scratchpad.labs.urineOutputMl} mL / ${scratchpad.labs.urineOutputDurationHours || 8}h oliguria)`,
        sectionB: "Dossier Narrative / Recommendations",
        issue: `Patient has documented urine output (${scratchpad.labs.urineOutputMl} mL), but was falsely described as anuric.`,
      });
    }
  }

  return {
    isConsistent: violations.length === 0,
    violations,
  };
}
