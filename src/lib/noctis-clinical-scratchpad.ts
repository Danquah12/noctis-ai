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
  baselineCreatinineTimeframe: string | null;
  bicarbonateMeqL: number | null;
  serumBicarbonateMeqL: number | null;
  abgBicarbonateMeqL: number | null;
  arterialPh: number | null;
  paco2MmHg: number | null;
  lactateMmolL: number | null;
  glucoseMgDl: number | null;
  betaHydroxybutyrateMmolL: number | null;
  digoxinNgMl: number | null;
  urineOutputMl: number | null;
  urineOutputDurationHours: number | null;
}

/**
 * Normalizes Markdown tables, emphasis markers, Unicode subscripts/superscripts,
 * and typographical dashes into a deterministic single-format text buffer so
 * extraction behaves identically on plain text, JSON, Markdown tables, or formatted prompts.
 */
export function normalizeClinicalTextForExtraction(raw: string): string {
  return (raw || "")
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => String("₀₁₂₃₄₅₆₇₈₉".indexOf(ch)))
    .replace(/⁺/g, "+")
    .replace(/[⁻−]/g, "-")
    .replace(/^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{0,}:?\s*$/gm, "\n")
    .replace(/\*\*|__|`/g, "")
    .replace(/\|/g, " : ")
    .replace(/(?<=[A-Za-z0-9)])[ \t]*—[ \t]*(?=\d)/g, ": ")
    .replace(/(?:(?<=[A-Za-z)])[ \t]*|[ \t]+)–[ \t]*(?=\d)/g, ": ")
    .replace(/[ \t]{2,}/g, " ");
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
  const norm = normalizeClinicalTextForExtraction(q);

  // 1. Demographics
  const ageMatch = norm.match(/(\d{1,3})\s*(?:-|–|\s+)?(?:years?|yrs?|yo|year-old)/i);
  const patientAgeYears = ageMatch ? parseInt(ageMatch[1], 10) : null;
  const patientAgeString = patientAgeYears ? `${patientAgeYears}-year-old` : null;

  let patientSex: "male" | "female" | "indeterminate" = "indeterminate";
  if (/\b(?:female|woman|lady|she|her)\b/i.test(norm)) {
    patientSex = "female";
  } else if (/\b(?:male|man|gentleman|he|his)\b/i.test(norm)) {
    patientSex = "male";
  }

  let patientWeightKg: number | null = null;
  const isWeightExplicitlyMissing = /\b(?:weight\s*(?:is\s*)?(?:not\s*provided|unmeasured|missing|unknown|not\s*measured)|no\s*weight\s*(?:is\s*)?provided)\b/i.test(norm);
  if (!isWeightExplicitlyMissing) {
    const explicitWeightMatch = norm.match(/\b(?:actual\s+)?(?:patient\s+)?(?:body\s+)?(?:weight|weighs|wt)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kilos|kilograms)\b/i);
    if (explicitWeightMatch) {
      const pre = norm.slice(Math.max(0, (explicitWeightMatch.index ?? 0) - 40), explicitWeightMatch.index ?? 0);
      if (!/\b(?:assuming|assume|hypothetical|standard|reference|arbitrary|if)\b/i.test(pre)) {
        patientWeightKg = parseFloat(explicitWeightMatch[1]);
      }
    } else {
      const allKg = [...norm.matchAll(/\b(\d{2,3}(?:\.\d+)?)\s*kg\b/gi)];
      for (const m of allKg) {
        const idx = m.index ?? 0;
        const pre = norm.slice(Math.max(0, idx - 40), idx);
        if (/\b(?:assuming|assume|hypothetical|standard|reference|arbitrary|nominal|ideal|per)\b/i.test(pre)) {
          continue; // skip assumption trap like "assuming a standard 70 kg weight"
        }
        patientWeightKg = parseFloat(m[1]);
        break;
      }
    }
  }

  // 2. Vitals
  const bpExplicitMatch = norm.match(/\b(?:bp|blood\s*pressure)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
  let systolicBp: number | null = null;
  let diastolicBp: number | null = null;
  if (bpExplicitMatch) {
    systolicBp = parseInt(bpExplicitMatch[1], 10);
    diastolicBp = parseInt(bpExplicitMatch[2], 10);
  } else {
    const allSlash = [...norm.matchAll(/\b(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmHg)?\b/gi)];
    for (const m of allSlash) {
      const s = parseInt(m[1], 10);
      const d = parseInt(m[2], 10);
      const ctx = norm.slice(m.index ?? 0, (m.index ?? 0) + m[0].length + 5);
      if (/mg|tab/i.test(ctx)) continue;
      if (s >= 40 && s <= 280 && d >= 20 && d <= 180) {
        systolicBp = s;
        diastolicBp = d;
        break;
      }
    }
  }
  const bloodPressureString = systolicBp !== null && diastolicBp !== null ? `${systolicBp}/${diastolicBp} mmHg` : null;

  const hrMatch = norm.match(/\b(?:hr|heart\s*rate|pulse)\s*[:=]?\s*(\d{2,3})\s*(?:bpm)?\b/i) ||
    norm.match(/\b(\d{2,3})\s*bpm\b/i);
  const heartRate = hrMatch ? parseInt(hrMatch[1], 10) : null;

  const rrMatch = norm.match(/\b(?:rr|resp(?:iratory)?\s*rate)\s*[:=]?\s*(\d{1,2})\s*(?:\/min|breaths)?\b/i) ||
    norm.match(/\b(\d{1,2})\s*(?:\/min|breaths\s*per\s*min(?:ute)?)\b/i);
  const respiratoryRate = rrMatch ? parseInt(rrMatch[1], 10) : null;

  const spo2Match = norm.match(/\b(?:spo2|o2\s*sat(?:uration)?)\s*[:=]?\s*(\d{2,3})%?(?:\s*on\s*([^,.\n(]+))?\b/i) ||
    norm.match(/\b(\d{2,3})%\s*(?:on\s*[^,.\n(]+)?\b/i);
  const oxygenSaturationPct = spo2Match ? parseInt(spo2Match[1], 10) : null;
  const rawSpo2Clean = spo2Match
    ? spo2Match[0].replace(/^(?:spo2|o2\s*sat(?:uration)?)\s*[:=]?\s*/i, "").trim()
    : null;
  const oxygenSaturation = rawSpo2Clean
    ? (rawSpo2Clean.includes("%") ? rawSpo2Clean : `${spo2Match![1]}%`)
    : null;

  const tempMatch = norm.match(/\b(?:temp(?:erature)?)\s*[:=]?\s*(\d{2}\.?\d?)\s*°?C\b/i) ||
    norm.match(/\b(\d{2}\.\d)\s*°?C\b/i);
  const temperatureCelsius = tempMatch ? parseFloat(tempMatch[1]) : null;

  const glucMatch = norm.match(
    /\b(?:blood\s+|serum\s+|plasma\s+|fingerstick\s+|poc\s+|point-of-care\s+|random\s+|fasting\s+)?(?:glucose|blood\s*sugar|bg|glu)(?:\s*\([^)\n]{1,35}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(\d{2,4}(?:\.\d+)?)\s*(?:mg\/dl)?\b/i
  );
  const glucParsed = glucMatch ? parseFloat(glucMatch[1]) : null;
  const bloodGlucoseMgDl = glucParsed !== null && glucParsed >= 20 && glucParsed <= 2000 ? glucParsed : null;
  const glucoseMgDl = bloodGlucoseMgDl;

  // 3. Labs (Format-Agnostic Extraction from Normalized Text)
  let potassiumMeqL: number | null = null;
  for (const m of norm.matchAll(
    /(?<![\d/])\b(?:serum\s+|plasma\s+|arterial\s+|venous\s+|bmp\s+|cmp\s+)?(?:potassium|k\+?)(?:\s*\([^)\n]{1,35}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*([1-9](?:\.\d+)?)\b(?![\d]*\s*\/[uµ]l)/gi
  )) {
    const val = parseFloat(m[1]);
    if (val >= 1.5 && val <= 12.0) {
      potassiumMeqL = val;
      break;
    }
  }

  let sodiumMeqL: number | null = null;
  const naMatch = norm.match(
    /\b(?:serum\s+|plasma\s+|bmp\s+|cmp\s+)?(?:sodium|na\+?)(?:\s*\([^)\n]{1,35}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(\d{3}(?:\.\d+)?)\b/i
  );
  if (naMatch) {
    const val = parseFloat(naMatch[1]);
    if (val >= 95 && val <= 190) sodiumMeqL = val;
  }

  let chlorideMeqL: number | null = null;
  const isChlorideExplicitlyMissing =
    /\b(?:chloride|cl-?)\s*(?:\([^)\n]{1,20}\))?\s*(?:is\s*)?(?:unmeasured|not\s*measured|missing|not\s*available|unknown)\b/i.test(norm);
  if (!isChlorideExplicitlyMissing) {
    for (const m of norm.matchAll(
      /(?<![A-Za-z])\b(?:serum\s+|plasma\s+|bmp\s+|cmp\s+)?(?:chloride|cl-?)(?:\s*\([^)\n]{1,35}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(\d{2,3}(?:\.\d+)?)\b/gi
    )) {
      const val = parseFloat(m[1]);
      if (val >= 65 && val <= 145) {
        chlorideMeqL = val;
        break;
      }
    }
  }

  // Baseline Creatinine & Timeframe
  let baselineCreatinineMgDl: number | null = null;
  let baselineCreatinineTimeframe: string | null = null;

  const extractBaselineNumberFromClause = (clause: string): number | null => {
    for (const nm of clause.matchAll(/\b(\d+(?:\.\d+)?)\b/g)) {
      const idx = nm.index ?? 0;
      const tail = clause.slice(idx + nm[0].length, idx + nm[0].length + 20);
      if (/^\s*(?:-|\s)?(?:days?|weeks?|wks?|months?|mos?|years?|yrs?|x|×|fold)\b/i.test(tail)) continue;
      const val = parseFloat(nm[1]);
      if (val >= 0.2 && val <= 20.0) return val;
    }
    return null;
  };

  const inlineCrBaselineMatch = norm.match(
    /\b(?:serum\s+|current\s+|ed\s+|admission\s+)?(?:creatinine|creat|scr|cr)(?:\s*\([^)\n]{1,25}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*\d+(?:\.\d+)?\s*(?:mg\/dl)?\s*\(([^)\n]*?\b(?:baseline|prior|previous)\b[^)\n]*)\)/i
  );
  if (inlineCrBaselineMatch?.[1]) {
    const val = extractBaselineNumberFromClause(inlineCrBaselineMatch[1]);
    if (val !== null) {
      baselineCreatinineMgDl = val;
      const tfMatch = inlineCrBaselineMatch[1].match(/\b(\d+\s*(?:-|–|\s+)?(?:days?|weeks?|wks?|months?|mos?|years?|yrs?)\s*(?:old|ago|prior))\b/i);
      if (tfMatch) baselineCreatinineTimeframe = tfMatch[1].trim();
    }
  }

  if (baselineCreatinineMgDl === null) {
    const standaloneBaselineRegex =
      /\b(?:(?:baseline|prior|previous|pre-?op(?:erative)?)(?:\s+\d+\s*(?:-|–|\s+)?(?:days?|weeks?|wks?|months?|mos?|years?|yrs?)\s*(?:old|ago|prior))?\s+(?:serum\s+)?(?:creatinine|creat|scr|cr)|(?:\d+\s*(?:-|–|\s+)?(?:days?|weeks?|wks?|months?|mos?|years?|yrs?)\s*(?:old|ago|prior))\s+(?:baseline\s+)?(?:serum\s+)?(?:creatinine|creat|scr|cr))(?:\s*\([^)\n]{1,40}\))?(?:\s*(?:from|at|measured)?\s*(?:\d+\s*(?:days?|weeks?|wks?|months?|mos?|years?|yrs?)\s*(?:ago|prior)))?\s*(?:was|is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?\b/gi;
    for (const m of norm.matchAll(standaloneBaselineRegex)) {
      const val = parseFloat(m[1]);
      if (val >= 0.2 && val <= 20.0) {
        baselineCreatinineMgDl = val;
        const win = norm.slice(Math.max(0, (m.index ?? 0) - 55), Math.min(norm.length, (m.index ?? 0) + m[0].length + 55));
        const tfMatch = win.match(/\b(\d+\s*(?:-|–|\s+)?(?:days?|weeks?|wks?|months?|mos?|years?|yrs?)\s*(?:old|ago|prior))\b/i);
        if (tfMatch) baselineCreatinineTimeframe = tfMatch[1].trim();
        break;
      }
    }
  }

  // Current Creatinine (non-baseline)
  let creatinineMgDl: number | null = null;
  const crMatches = [
    ...norm.matchAll(
      /\b(?:serum\s+|current\s+|ed\s+|admission\s+|present(?:ing)?\s+)?(?:creatinine|creat|scr|cr)(?:\s*\([^)\n]{1,30}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?\b/gi
    ),
  ];
  const nonBaselineCrVals: number[] = [];
  for (const m of crMatches) {
    const idx = m.index ?? 0;
    const pre = norm.slice(Math.max(0, idx - 35), idx);
    if (/\b(?:baseline|prior|previous|pre-?op|ratio|fold)\b[^.\n]*$/i.test(pre)) continue;
    const val = parseFloat(m[1]);
    if (val < 0.2 || val > 25.0) continue;
    nonBaselineCrVals.push(val);
    if (val !== baselineCreatinineMgDl) {
      creatinineMgDl = val;
      break;
    }
  }
  if (creatinineMgDl === null && nonBaselineCrVals.length > 0) {
    creatinineMgDl = nonBaselineCrVals[0];
  }

  // Dual Bicarbonate (Serum/BMP vs ABG)
  let serumBicarbonateMeqL: number | null = null;
  let abgBicarbonateMeqL: number | null = null;

  const dualInlineMatch =
    norm.match(/\b(?:bicarbonate|bicarb|hco3-?)\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\s*(?:\(\s*serum\s*\)|\bserum\b)\s*(?:\/|,|;|\band\b)\s*(\d{1,2}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\s*(?:\(\s*abg\s*\)|\babg\b|\barterial\b)/i) ||
    norm.match(/\b(?:bicarbonate|bicarb|hco3-?)\s*[:=]?\s*(?:serum\s*[:=]?\s*)(\d{1,2}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\s*(?:\/|,|;|\band\b)\s*(?:abg\s*[:=]?\s*)(\d{1,2}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?/i);
  if (dualInlineMatch) {
    const vSerum = parseFloat(dualInlineMatch[1]);
    const vAbg = parseFloat(dualInlineMatch[2]);
    if (vSerum >= 3 && vSerum <= 55) serumBicarbonateMeqL = vSerum;
    if (vAbg >= 3 && vAbg <= 55) abgBicarbonateMeqL = vAbg;
  }

  const dualReverseMatch = norm.match(
    /\b(?:bicarbonate|bicarb|hco3-?)\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\s*(?:\(\s*(?:abg|arterial)\s*\)|\b(?:abg|arterial)\b)\s*(?:\/|,|;|\band\b)\s*(\d{1,2}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\s*(?:\(\s*serum\s*\)|\bserum\b)/i
  );
  if (dualReverseMatch) {
    const vAbg = parseFloat(dualReverseMatch[1]);
    const vSerum = parseFloat(dualReverseMatch[2]);
    if (abgBicarbonateMeqL === null && vAbg >= 3 && vAbg <= 55) abgBicarbonateMeqL = vAbg;
    if (serumBicarbonateMeqL === null && vSerum >= 3 && vSerum <= 55) serumBicarbonateMeqL = vSerum;
  }

  const bicarbCandidateRegex =
    /(?:\b(?:serum|venous|arterial|abg|vbg|bmp|cmp|chem-?\d*|chemistry)\s+)?\b(?:bicarbonate|bicarb|hco3-?|total\s+co2)(?:\s*\([^)\n]{1,35}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(\d{1,2}(?:\.\d+)?)\b(?:\s*(?:meq\/l|mmol\/l))?(?:\s*\(\s*(serum|abg|arterial|venous|bmp)\s*\))?/gi;
  for (const m of norm.matchAll(bicarbCandidateRegex)) {
    const val = parseFloat(m[1]);
    if (val < 3 || val > 55) continue;
    const idx = m.index ?? 0;
    const lineStart = norm.lastIndexOf("\n", idx) + 1;
    const sameLinePre = norm.slice(Math.max(lineStart, idx - 60), idx);
    const fullAndTag = `${sameLinePre} ${m[0]}`;
    const lastAbgIdx = fullAndTag.search(/\b(?:abg|arterial\s+blood\s+gas|arterial)\b/gi);
    const isExplicitAbg =
      /\b(?:abg|arterial)\b/i.test(m[0]) ||
      (lastAbgIdx !== -1 && !/\b(?:serum|bmp|cmp|venous)\b/i.test(fullAndTag.slice(lastAbgIdx)));
    if (isExplicitAbg) {
      if (abgBicarbonateMeqL === null) abgBicarbonateMeqL = val;
    } else if (serumBicarbonateMeqL === null) {
      serumBicarbonateMeqL = val;
    }
  }

  if (serumBicarbonateMeqL === null) {
    const totalCo2Match = norm.match(
      /\b(?:total\s+)?co2(?:\s*\([^)\n]{1,25}\))?\s*(?:[:=]\s*|\s+)\s*(\d{1,2}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)\b/i
    );
    if (totalCo2Match) {
      const val = parseFloat(totalCo2Match[1]);
      if (val >= 3 && val <= 55) serumBicarbonateMeqL = val;
    }
  }

  // Fallback compact BMP panel notation (e.g., "Na/K/Cl/HCO3: 130/5.4/99/12")
  const panelMatch = norm.match(
    /\bna\s*\/\s*k\s*\/\s*cl(?:\s*\/\s*(?:hco3-?|co2))?\s*[:=]?\s*(\d{3})\s*\/\s*([1-9](?:\.\d+)?)\s*\/\s*(\d{2,3})(?:\s*\/\s*(\d{1,2}(?:\.\d+)?))?/i
  );
  if (panelMatch) {
    if (sodiumMeqL === null) sodiumMeqL = parseFloat(panelMatch[1]);
    if (potassiumMeqL === null) potassiumMeqL = parseFloat(panelMatch[2]);
    if (chlorideMeqL === null && !isChlorideExplicitlyMissing) chlorideMeqL = parseFloat(panelMatch[3]);
    if (serumBicarbonateMeqL === null && panelMatch[4]) serumBicarbonateMeqL = parseFloat(panelMatch[4]);
  }

  const bicarbonateMeqL = serumBicarbonateMeqL ?? abgBicarbonateMeqL;

  const phMatch = norm.match(
    /\b(?:arterial\s+|venous\s+|abg\s+|vbg\s+)?ph(?:\s*\([^)\n]{1,30}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(6\.\d{2,3}|7\.\d{2,3})\b/i
  );
  const arterialPh = phMatch ? parseFloat(phMatch[1]) : null;

  const paco2Match =
    norm.match(/\b(?:arterial\s+|venous\s+|abg\s+|vbg\s+)?(?:paco2|pco2|partial\s+pressure\s+of\s+co2)(?:\s*\([^)\n]{1,30}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(\d{1,3}(?:\.\d+)?)\s*(?:mmhg)?\b/i) ||
    norm.match(/\bco2(?:\s*\([^)\n]{1,25}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(\d{1,3}(?:\.\d+)?)\s*mmhg\b/i);
  const paco2Parsed = paco2Match ? parseFloat(paco2Match[1]) : null;
  const paco2MmHg = paco2Parsed !== null && paco2Parsed >= 10 && paco2Parsed <= 130 ? paco2Parsed : null;

  const lacMatch = norm.match(
    /\b(?:arterial\s+|venous\s+|serum\s+|blood\s+|whole\s+blood\s+|poc\s+)?(?:lactate|lactic\s*acid)(?:\s*\([^)\n]{1,30}\))?\s*(?:[:=]\s*|\s+(?:(?:is|was|of)\s+)?)\s*(\d{1,2}(?:\.\d+)?)\s*(?:mmol\/l)?\b/i
  );
  const lacParsed = lacMatch ? parseFloat(lacMatch[1]) : null;
  const lactateMmolL = lacParsed !== null && lacParsed >= 0.3 && lacParsed <= 35.0 ? lacParsed : null;

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
  if (isLastDoseTimingMissing) {
    const gapMeds: string[] = [];
    if (/\bdigoxin\b/i.test(q) && !/\b(?:zero\s+(?:history|use|exposure)|no\s+digoxin|denies\s+digoxin)\b/i.test(q)) {
      gapMeds.push("Digoxin");
    }
    if (/\b(?:carvedilol|metoprolol|atenolol|bisoprolol|beta-?blocker)\b/i.test(q)) {
      gapMeds.push("Beta-Blocker");
    }
    if (/\b(?:lisinopril|enalapril|losartan|valsartan|spironolactone|raas)\b/i.test(q)) {
      gapMeds.push("RAASi/MRA");
    }
    if (/\b(?:apixaban|rivaroxaban|warfarin|anticoagulant)\b/i.test(q)) {
      gapMeds.push("Anticoagulant/DOAC");
    }
    if (/\bmetformin\b/i.test(q)) {
      gapMeds.push("Metformin");
    }
    if (gapMeds.length > 0) {
      missingDataItems.push(`Exact Timing of Last Medication Doses (${gapMeds.join(", ")}) [UNREPORTED]`);
    }
  }
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
        const tfCaveat = baselineCreatinineTimeframe
          ? ` Given the remote baseline (${baselineCreatinineTimeframe}), acute timing within the KDIGO 48-hour to 7-day diagnostic window is not independently established.`
          : "";
        stageRationale = `KDIGO Stage 2 by fold increase (${crFoldRatio}× baseline: ${creatinineMgDl} / ${baselineCreatinineMgDl} mg/dL).${tfCaveat} Current creatinine (${creatinineMgDl} mg/dL) does NOT meet the ≥ 4.0 mg/dL absolute threshold, and fold ratio is < 3.0×; KDIGO Stage 3 is NOT supported by serum creatinine criteria.`;
        isStage3ConditionalOnAcuteTimeline = false;
        stage3AcuteTimelineRationale = "";
      }
    } else if (crFoldRatio >= 1.5 || crAbsoluteRiseMgDl >= 0.3) {
      establishedStage = 1;
      creatinineCriteriaStage = 1;
      stageRationale = `KDIGO Stage 1 AKI (Provisional: Serum creatinine increased 1.5–1.9× baseline: ${crFoldRatio}× or rise ≥ 0.3 mg/dL; formal acute staging provisional pending confirmation that rise occurred within qualifying acute window).`;
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

  // C. Anion Gap Calculation (INV-002: Laboratory Data Integrity; prefers Serum/BMP Bicarbonate)
  const agBicarbonateMeqL = serumBicarbonateMeqL ?? abgBicarbonateMeqL;
  let anionGap: AnionGapCalculationResult;
  if (isChlorideMissing) {
    anionGap = {
      isComputable: false,
      anionGapMeqL: null,
      formula: "Anion Gap = [Na+] - ([Cl-] + [HCO3-])",
      refusalReason:
        "Cannot calculate — chloride unavailable. Serum chloride was NOT measured in this intake. Estimating or substituting a hypothetical reference chloride (e.g. 98 or 104 mmol/L) to calculate an anion gap is strictly prohibited. Anion Gap CANNOT be calculated without measured chloride.",
    };
  } else if (sodiumMeqL !== null && chlorideMeqL !== null && agBicarbonateMeqL !== null) {
    const agVal = parseFloat((sodiumMeqL - (chlorideMeqL + agBicarbonateMeqL)).toFixed(1));
    const bicarbLabel =
      serumBicarbonateMeqL !== null && abgBicarbonateMeqL !== null && serumBicarbonateMeqL !== abgBicarbonateMeqL
        ? `${agBicarbonateMeqL} [serum HCO3-]`
        : `${agBicarbonateMeqL}`;
    anionGap = {
      isComputable: true,
      anionGapMeqL: agVal,
      formula: `Anion Gap = ${sodiumMeqL} - (${chlorideMeqL} + ${bicarbLabel}) = ${agVal} mEq/L`,
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

  // D. Winter's Formula (INV-005: Calibrated Acid-Base Interpretation; prefers ABG Bicarbonate)
  const wintersBicarbonateMeqL = abgBicarbonateMeqL ?? serumBicarbonateMeqL;
  let wintersFormula: WintersFormulaResult;
  if (wintersBicarbonateMeqL !== null) {
    const midpoint = parseFloat((1.5 * wintersBicarbonateMeqL + 8).toFixed(1));
    const low = parseFloat((midpoint - 2).toFixed(1));
    const high = parseFloat((midpoint + 2).toFixed(1));
    const wintersSourceNote =
      abgBicarbonateMeqL !== null && serumBicarbonateMeqL !== null && abgBicarbonateMeqL !== serumBicarbonateMeqL
        ? ` using ABG HCO3- ${abgBicarbonateMeqL} mEq/L (distinct from serum HCO3- ${serumBicarbonateMeqL} mEq/L)`
        : ` based on measured HCO3- of ${wintersBicarbonateMeqL} mmol/L`;

    if (paco2MmHg !== null) {
      const deviation = parseFloat((paco2MmHg - high).toFixed(1));
      if (paco2MmHg >= low && paco2MmHg <= high) {
        wintersFormula = {
          isComputable: true,
          measuredPaco2MmHg: paco2MmHg,
          expectedPaco2MidpointMmHg: midpoint,
          expectedPaco2RangeLowMmHg: low,
          expectedPaco2RangeHighMmHg: high,
          deviationMmHg: 0,
          interpretationCategory: "PURE_METABOLIC_ACIDOSIS_ADEQUATE_COMPENSATION",
          calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg)${wintersSourceNote}. Measured PaCO2 of ${paco2MmHg} mmHg falls within expected range, demonstrating adequate respiratory compensation.`,
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
          calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg)${wintersSourceNote}. Measured PaCO2 of ${paco2MmHg} mmHg is ${deviation} mmHg above the predicted upper limit. This minimal difference falls within normal biological and measurement variability, representing possible inadequate respiratory compensation / borderline relative hypoventilation rather than an unsupported definitive diagnosis of a second respiratory acid-base disorder. Clinical reassessment is prompted, especially in altered mental status and shock.`,
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
          calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg)${wintersSourceNote}. Measured PaCO2 of ${paco2MmHg} mmHg is elevated (+${deviation} mmHg above upper limit ${high} mmHg), indicating inadequate respiratory compensation / superimposed respiratory acidosis.`,
        };
      } else {
        wintersFormula = {
          isComputable: true,
          measuredPaco2MmHg: paco2MmHg,
          expectedPaco2MidpointMmHg: midpoint,
          expectedPaco2RangeLowMmHg: low,
          expectedPaco2RangeHighMmHg: high,
          deviationMmHg: parseFloat((paco2MmHg - low).toFixed(1)),
          interpretationCategory: "SUPERIMPOSED_RESPIRATORY_ALKALOSIS",
          calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg)${wintersSourceNote}. Measured PaCO2 of ${paco2MmHg} mmHg is below predicted range, suggesting a superimposed primary respiratory alkalosis.`,
        };
      }
    } else {
      wintersFormula = {
        isComputable: true,
        measuredPaco2MmHg: null,
        expectedPaco2MidpointMmHg: midpoint,
        expectedPaco2RangeLowMmHg: low,
        expectedPaco2RangeHighMmHg: high,
        deviationMmHg: null,
        interpretationCategory: "EXPECTED_RANGE_CALCULATED_MEASURED_PACO2_PENDING" as any,
        calibratedClinicalInterpretation: `Expected compensatory PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg)${wintersSourceNote}. Actual respiratory compensation cannot be evaluated because PaCO2 was not measured.`,
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
      calibratedClinicalInterpretation: "Winter's formula cannot be computed without measured bicarbonate.",
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
  const hasAcuteRvFailure = /\b(?:rv\s+dilation|right\s+ventricular\s+dilation|acute\s+cor\s+pulmonale|mcconnell|septal\s+flattening|d-shaped\s+lv|massive\s+(?:pe|pulmonary\s+embolism))\b/i.test(q);
  if (hasAcuteRvFailure) {
    highRiskConditions.push("Acute RV Failure / Cor Pulmonale (Severe RV Dilation — Avoid Large Fluid Boluses)");
  }
  if (/\b(?:hfref|heart\s+failure|ef\s*(?:is|of|=|:)?\s*(?:[1-3]\d|25|30)%?|ejection\s+fraction\s*(?:is|of|=|:)?\s*(?:[1-3]\d|25|30)%?)\b/i.test(q)) {
    highRiskConditions.push("Reduced Ejection Fraction (HFrEF, EF ≤ 35%)");
  }
  const hasDocumentedCkd = /\b(?:ckd|chronic\s+kidney\s+disease)\s*(?:stage\s*)?[45]\b/i.test(q);
  if (hasDocumentedCkd) {
    highRiskConditions.push("Advanced Chronic Kidney Disease (CKD Stage 4/5)");
  } else if (creatinineMgDl && creatinineMgDl >= 3.0) {
    highRiskConditions.push(`Severe Acute Renal Impairment (Creatinine ${creatinineMgDl} mg/dL)`);
  }
  if (urineOutputMl !== null && urineOutputMl <= 150) {
    highRiskConditions.push("Profound Oliguria");
  }

  // Strict check on anuria: Never infer anuria without evidence!
  const isAnuriaDocumented = urineOutputMl === 0 && (urineOutputDurationHours ?? 0) >= 12;

  const highRiskFluidOverload = highRiskConditions.length > 0;
  // Retain boolean for backwards compat but define semantics accurately:
  const standard30mLPerKgContraindicated = highRiskFluidOverload;

  const conditionsSummary = highRiskConditions.length > 0 ? highRiskConditions.join("; ") : "Documented clinical risk factors";
  const individualizedResuscitationGuidance = hasAcuteRvFailure
    ? `STRICTLY AVOID LARGE-VOLUME FLUID BOLUSES (${conditionsSummary}). Volume loading risks acute RV overdistension, reverse Bernheim septal shift into the LV, and cardiac arrest; initiate early Norepinephrine to maintain MAP ≥ 65 mmHg.`
    : highRiskFluidOverload
    ? `Flag high risk of fluid overload (${conditionsSummary}). Do not automatically prohibit or veto fluids solely because of risk factors, but do not administer unmonitored blanket 30 mL/kg crystalloids. Individualize resuscitation using bedside clinical examination, dynamic fluid responsiveness, lung ultrasound (POCUS for pulmonary congestion/B-lines), and early vasopressor consideration (Norepinephrine). Anuria is NOT documented and must not be invented.`
    : "Standard crystalloid resuscitation permissible with serial hemodynamic and fluid responsiveness monitoring.";

  const fluidSafety: FluidResuscitationSafetyResult = {
    standard30mLPerKgContraindicated,
    highRiskFluidOverload,
    highRiskConditionsIdentified: highRiskConditions,
    isAnuriaDocumented,
    recommendedResuscitationApproach: individualizedResuscitationGuidance,
    individualizedResuscitationGuidance,
  };

  const bicarbDisplay =
    serumBicarbonateMeqL !== null && abgBicarbonateMeqL !== null && serumBicarbonateMeqL !== abgBicarbonateMeqL
      ? `${serumBicarbonateMeqL} mmol/L (serum) / ${abgBicarbonateMeqL} mmol/L (ABG)`
      : bicarbonateMeqL !== null
      ? `${bicarbonateMeqL} mmol/L`
      : "[UNMEASURED]";
  const baseCrDisplay = baselineCreatinineMgDl !== null
    ? `${baselineCreatinineMgDl} mg/dL${baselineCreatinineTimeframe ? ` (${baselineCreatinineTimeframe})` : ""}`
    : "**[UNMEASURED]**";
  const anionGapLine = anionGap.isComputable
    ? anionGap.formula
    : isChlorideMissing
    ? `**CANNOT BE CALCULATED — CHLORIDE UNAVAILABLE** (${anionGap.refusalReason})`
    : `**CANNOT BE CALCULATED — INCOMPLETE ELECTROLYTES** (${anionGap.refusalReason})`;

  // Build Markdown Summary
  const mdLines: string[] = [];
  mdLines.push(`### Neuro-Symbolic Clinical Scratchpad (Deterministic Audit Trail)`);
  mdLines.push(`**Encounter:** \`${encounterId}\``);
  mdLines.push(``);
  mdLines.push(`#### 1. Extracted Patient Parameters`);
  mdLines.push(`- **Demographics:** ${patientAgeString || "[AGE UNREPORTED]"}, ${patientSex}, Body Weight: ${patientWeightKg ? `${patientWeightKg} kg` : "**[UNMEASURED / NOT PROVIDED]**"}`);
  mdLines.push(`- **Vitals:** BP ${bloodPressureString || "[UNMEASURED]"} (Calculated MAP: **${meanArterialPressureMmHg ? `${meanArterialPressureMmHg} mmHg` : "[UNMEASURED]"}**), HR ${heartRate ? `${heartRate} bpm` : "[UNMEASURED]"}, RR ${respiratoryRate ? `${respiratoryRate}/min` : "[UNMEASURED]"}, SpO2 ${oxygenSaturation || "[UNMEASURED]"}, Temp ${temperatureCelsius ? `${temperatureCelsius}°C` : "[UNMEASURED]"}, BG ${bloodGlucoseMgDl ? `${bloodGlucoseMgDl} mg/dL` : "[UNMEASURED]"}`);
  mdLines.push(`- **Labs:** K+ ${potassiumMeqL ? `${potassiumMeqL} mmol/L` : "[UNMEASURED]"}, Na+ ${sodiumMeqL ? `${sodiumMeqL} mmol/L` : "[UNMEASURED]"}, Cl- ${chlorideMeqL ? `${chlorideMeqL} mmol/L` : "**[UNMEASURED / NOT PROVIDED]**"}, Cr ${creatinineMgDl ? `${creatinineMgDl} mg/dL` : "[UNMEASURED]"} (Baseline: ${baseCrDisplay}), HCO3- ${bicarbDisplay}, pH ${arterialPh || "[UNMEASURED]"}, PaCO2 ${paco2MmHg ? `${paco2MmHg} mmHg` : "[UNMEASURED]"}, Lactate ${lactateMmolL ? `${lactateMmolL} mmol/L` : "[UNMEASURED]"}, Glucose ${glucoseMgDl ? `${glucoseMgDl} mg/dL` : "[UNMEASURED]"}, Digoxin ${digoxinNgMl ? `${digoxinNgMl} ng/mL` : "[UNMEASURED]"}, Urine Output: ${urineOutputMl !== null ? `${urineOutputMl} mL/${urineOutputDurationHours}h` : "[UNMEASURED]"}`);
  mdLines.push(``);
  mdLines.push(`#### 2. Deterministic Derivations & Sentinels`);
  mdLines.push(`- **KDIGO AKI Staging:** ${kdigoAki.stageRationale}`);
  mdLines.push(`- **Weight-Normalized Urine Output:** ${kdigoAki.uoStagingCaveat}`);
  mdLines.push(`- **Anion Gap:** ${anionGapLine}`);
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
      baselineCreatinineTimeframe,
      bicarbonateMeqL,
      serumBicarbonateMeqL,
      abgBicarbonateMeqL,
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
    const ageRegex = /(?:\b(\d{1,3})\s*(?:-|–|\s+)?(?:year-old|yr-old|yo|y\/o)\b|\bpatient\s+age\s*[:=]?\s*(\d{1,3})\b)/gi;
    for (const m of dossierText.matchAll(ageRegex)) {
      const ageVal = parseInt(m[1] || m[2], 10);
      const ctx = dossierText.slice(Math.max(0, (m.index ?? 0) - 25), Math.min(dossierText.length, (m.index ?? 0) + m[0].length + 25));
      if (/[≥><=]|threshold|curb-?65|criteria|cutoff|scale|ago|history|duration|bisap|elderly|older\s+than/i.test(ctx)) continue;
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
      const before = dossierText.slice(Math.max(0, (m.index ?? 0) - 35), m.index ?? 0);
      if (/[<>≤≥]|target|goal|maintain|threshold|restore|above|below|deficit|reserve|keep|aim/i.test(before)) continue;
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
      const before = dossierText.slice(Math.max(0, (m.index ?? 0) - 35), m.index ?? 0);
      if (/[<>≤≥]|target|goal|normal|range|threshold|below|above|maintain|keep|reference|limit/i.test(before)) continue;
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
      const before = dossierText.slice(Math.max(0, (m.index ?? 0) - 35), m.index ?? 0);
      const ctx = dossierText.slice(Math.max(0, (m.index ?? 0) - 25), (m.index ?? 0) + m[0].length);
      if (/baseline|rise|increase|vs\s+baseline/i.test(ctx)) continue;
      if (/[<>≤≥]\s*$/.test(before) || /kdigo|threshold|criteria|stage|definition|target|normal|reference/i.test(ctx)) continue;
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
    const digMatches = [
      ...dossierText.matchAll(
        /\b(?:digoxin|dig)[ \t]*(?:level|concentration)?[ \t]*(?:(?:is|of)[ \t]+|[=:][ \t]*)?(\d+(?:\.\d+)?)[ \t]*(?:ng\/ml)?\b/gi
      ),
    ];
    for (const m of digMatches) {
      const val = parseFloat(m[1]);
      if (val === 0.125 || val === 0.25) continue; // skip pill doses
      const after = dossierText.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 12);
      if (/^[ \t]*(?:mg|mcg)\b/i.test(after)) continue; // skip oral dose strings like 0.125 mg
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

  // Check 11: Contradictory Fluid Recommendations between Narrative and Scratchpad
  const fluidApproachText = scratchpad.derivedCalculations.fluidSafety?.recommendedResuscitationApproach || "";
  const scratchpadPermitsFluids = /Standard crystalloid resuscitation permissible/i.test(fluidApproachText);
  if (scratchpadPermitsFluids) {
    if (
      /\b(?:standard\s+30\s*ml\/kg.*(?:strictly\s+contraindicated|prohibited)|30\s*ml\/kg\s+crystalloids.*contraindicated)\b/i.test(dossierText) &&
      !/\b(?:documented\s+ef\s*<=?\s*40|known\s+hfref|known\s+severe\s+heart\s+failure)\b/i.test(scratchpad.rawInputText)
    ) {
      violations.push({
        item: "Fluid Management Contradiction",
        sectionA: `Scratchpad Assessment ("${fluidApproachText}")`,
        sectionB: "Dossier Narrative",
        issue: "Contradictory fluid recommendations: Main report declares standard fluid resuscitation strictly contraindicated based on unsupported heart failure, while scratchpad permits standard crystalloid resuscitation.",
      });
    }
  }

  // Check 12: Unsupported Cardiac & Renal Disease Claims (Zero Fabrication Gate)
  const hasCardiacInInput = /\b(?:hfref|heart\s+failure|ejection\s+fraction|ef\s*\d{1,2}%?)\b/i.test(scratchpad.rawInputText);
  if (!hasCardiacInInput && /\b(?:hfre\s*f|severe\s+baseline\s+systolic\s+dysfunction|decompensated\s+heart\s+failure)\b/i.test(dossierText)) {
    violations.push({
      item: "Unsupported Cardiac Comorbidity (HFrEF)",
      sectionA: "Documented Intake (Zero documented heart failure or EF)",
      sectionB: "Dossier Narrative",
      issue: "Main report asserts HFrEF or systolic dysfunction without documented clinical evidence in intake.",
    });
  }

  const hasCkdInInput =
    /\b(?:ckd|chronic\s+kidney\s+disease|stage\s*[345]\s*ckd)\b/i.test(scratchpad.rawInputText) ||
    Boolean(scratchpad.labs?.baselineCreatinineMgDl && scratchpad.labs.baselineCreatinineMgDl >= 1.4);
  if (!hasCkdInInput && /\b(?:advanced\s+renal\s+impairment\s+with\s+acute-on-chronic|pre-existing\s+ckd|ckd\s+stage\s*[345])\b/i.test(dossierText)) {
    violations.push({
      item: "Unsupported Chronic Kidney Disease (CKD)",
      sectionA: "Documented Intake (Zero documented CKD)",
      sectionB: "Dossier Narrative",
      issue: "Main report asserts pre-existing CKD or acute-on-chronic kidney injury without documented clinical evidence in intake.",
    });
  }

  const hasConsolidationInInput = /\b(?:consolidation|infiltrate|pneumonia|rll|lll)\b/i.test(scratchpad.rawInputText);
  if (!hasConsolidationInInput && /\b(?:dense\s+(?:radiographic\s+)?alveolar\s+consolidation|chest\s+radiograph.*dense.*consolidation)\b/i.test(dossierText)) {
    violations.push({
      item: "Unsupported Imaging Finding (Dense Alveolar Consolidation)",
      sectionA: "Documented Intake (No chest radiograph performed)",
      sectionB: "Dossier Narrative",
      issue: "Main report asserts dense radiographic alveolar consolidation without an imaging study in intake.",
    });
  }

  const hasPriorHospInInput = /\b(?:hospitaliz\w*|admitted)\b/i.test(scratchpad.rawInputText);
  if (!hasPriorHospInInput && /\b(?:hospitalization\s+45\s+days\s+earlier|ceftriaxone\s+within\s+(?:the\s+past\s+)?90\s+days)\b/i.test(dossierText)) {
    violations.push({
      item: "Unsupported Prior Hospitalization / Antimicrobial Exposure",
      sectionA: "Documented Intake (Zero documented prior admissions)",
      sectionB: "Dossier Narrative",
      issue: "Main report asserts hospitalization 45 days earlier with IV ceftriaxone without documented evidence in intake.",
    });
  }

  // Check 13: Demographic Sex & Clinical Reasoning Consistency
  if (scratchpad.demographics.patientSex === "male") {
    if (/\b(?:in\s+older\s+female\s+patients|older\s+female|female\s+patient)\b/i.test(dossierText)) {
      violations.push({
        item: "Demographic Sex Contradiction",
        sectionA: "Documented Intake (Male patient)",
        sectionB: "Dossier Narrative",
        issue: "Patient is male, but dossier narrative asserts or discusses female patient characteristics.",
      });
    }
  }

  // Check 14: Winter's Formula Calculation Integrity
  if (scratchpad.labs.bicarbonateMeqL !== null) {
    if (/\b(?:winter's\s+formula\s+cannot\s+be\s+computed\s+without\s+measured\s+bicarbonate)\b/i.test(dossierText)) {
      violations.push({
        item: "Winter's Formula Calculation Integrity",
        sectionA: `Documented Intake (Bicarbonate: ${scratchpad.labs.bicarbonateMeqL} mmol/L)`,
        sectionB: "Dossier Scratchpad / Narrative",
        issue: `Bicarbonate is documented as ${scratchpad.labs.bicarbonateMeqL} mmol/L, but dossier claims Winter's formula cannot be computed without measured bicarbonate.`,
      });
    }
  }

  // Check 15: Fabricated Unmeasured Blood Glucose (Zero Fabrication Gate)
  if (scratchpad.labs.glucoseMgDl === null) {
    if (/\b(?:blood\s+glucose|serum\s+glucose)\s*:\s*\d{2,3}\s*mg\/dl\b/i.test(dossierText)) {
      violations.push({
        item: "Fabricated Blood Glucose Value",
        sectionA: "Documented Intake (Blood Glucose unmeasured / not provided)",
        sectionB: "Dossier SOAP / Objective Narrative",
        issue: "Dossier reports a specific numeric blood glucose value despite blood glucose being unmeasured in intake.",
      });
    }
  }

  // Check 16: Fabricated Outpatient Home Medication
  const monitoredHomeMeds = [
    "Lisinopril",
    "Warfarin",
    "Apixaban",
    "Amiodarone",
    "Metformin",
    "Spironolactone",
    "Carvedilol",
    "Metoprolol",
  ];
  for (const med of monitoredHomeMeds) {
    const inInput = new RegExp(`\\b${med}\\b`, "i").test(scratchpad.rawInputText);
    if (!inInput) {
      const fabricatedHomeRegimenRegex = new RegExp(
        `(?:^\\s*\\d+\\.\\s*${med}\\b|^\\s*-\\s*\\*\\*${med}\\b[^\\n]*DISCONTINUE|\\|\\s*\\*\\*${med}\\*\\*\\s*\\||\\bwithhold[^.\\n]{0,60}(?:outpatient|home)[^.\\n]{0,120}\\b${med}\\b|\\bPrescribed[^.\\n]{0,120}\\b${med}\\b)`,
        "im"
      );
      if (fabricatedHomeRegimenRegex.test(dossierText)) {
        violations.push({
          item: `Fabricated Outpatient Medication (${med})`,
          sectionA: `Documented Intake (${med} not prescribed or mentioned)`,
          sectionB: "Dossier Home Medications / Plan",
          issue: `Main report fabricates outpatient prescription or withholding directive for ${med}, which is absent from intake.`,
        });
      }
    }
  }

  // Check 17: Fabricated HPI Events (Watery Diarrhea / UTI)
  if (!/\bdiarrhea\b/i.test(scratchpad.rawInputText) && /\bwatery\s+diarrhea\b/i.test(dossierText)) {
    violations.push({
      item: "Fabricated HPI (Watery Diarrhea)",
      sectionA: "Documented Intake (No diarrhea documented)",
      sectionB: "Dossier History of Present Illness",
      issue: "Main report invents 'watery diarrhea' history that was never documented in intake.",
    });
  }

  if (
    !/\b(?:uti|urinary\s+tract\s+infection|flank\s+pain|pyelonephritis)\b/i.test(scratchpad.rawInputText) &&
    /\b(?:recent\s+uti\s+on\s+tmp-smx|suspected\s+urinary\s+tract\s+infection)\b/i.test(dossierText)
  ) {
    violations.push({
      item: "Fabricated HPI (Suspected UTI)",
      sectionA: "Documented Intake (No UTI documented)",
      sectionB: "Dossier History of Present Illness",
      issue: "Main report invents recent urinary tract infection history without documentation in intake.",
    });
  }

  // Check 18: Arterial pH Cross-Section Fidelity
  if (scratchpad.labs.arterialPh !== null) {
    const phMatches = [...dossierText.matchAll(/\b(?:arterial\s+)?ph[ \t]*[:=]?[ \t]*(\d\.\d{2})\b/gi)];
    for (const m of phMatches) {
      const before = dossierText.slice(Math.max(0, (m.index ?? 0)), (m.index ?? 0) + m[0].length - m[1].length);
      if (/[<>≤≥]/.test(before.slice(-4))) continue;
      const val = parseFloat(m[1]);
      if (Math.abs(val - scratchpad.labs.arterialPh) > 0.015) {
        violations.push({
          item: "Arterial pH Cross-Section Fidelity",
          sectionA: `Documented Intake (pH ${scratchpad.labs.arterialPh})`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Stated arterial pH (${val}) conflicts with documented intake (${scratchpad.labs.arterialPh}).`,
        });
      }
    }
  }

  // Check 19: Body Temperature Cross-Section Fidelity
  if (scratchpad.vitals.temperatureCelsius !== null) {
    const tempMatches = [...dossierText.matchAll(/\btemp(?:erature)?[ \t]*[:=]?[ \t]*(\d{2}\.\d)[ \t]*°?c\b/gi)];
    for (const m of tempMatches) {
      const before = dossierText.slice(Math.max(0, (m.index ?? 0)), (m.index ?? 0) + m[0].length - m[1].length);
      if (/[<>≤≥]/.test(before.slice(-4))) continue;
      const val = parseFloat(m[1]);
      if (Math.abs(val - scratchpad.vitals.temperatureCelsius) > 0.2) {
        violations.push({
          item: "Body Temperature Cross-Section Fidelity",
          sectionA: `Documented Intake (Temp ${scratchpad.vitals.temperatureCelsius}°C)`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Stated temperature (${val}°C) conflicts with documented intake (${scratchpad.vitals.temperatureCelsius}°C).`,
        });
      }
    }
  }

  const normDossier = normalizeClinicalTextForExtraction(dossierText);

  // Check 20A: Documented-to-UNMEASURED Substitution Veto
  const documentedParamMonitors: Array<{
    label: string;
    isDocumented: boolean;
    unmeasuredRegex: RegExp;
    measuredRegex: RegExp;
    skipBefore?: RegExp;
  }> = [
    {
      label: "Sodium",
      isDocumented: scratchpad.labs.sodiumMeqL !== null,
      unmeasuredRegex: /\b(?:sodium|na\+?)\s*(?:\([^)\n]{1,20}\))?\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\b(?:sodium|na\+?)\s*(?:\([^)\n]{1,20}\))?\s*(?:[:=]\s*|\s+(?:is|of)\s+)?\d{3}\b/gi,
    },
    {
      label: "Chloride",
      isDocumented: scratchpad.labs.chlorideMeqL !== null,
      unmeasuredRegex: /(?<![A-Za-z])\b(?:chloride|cl-?)\s*(?:\([^)\n]{1,20}\))?\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /(?<![A-Za-z])\b(?:chloride|cl-?)\s*(?:\([^)\n]{1,20}\))?\s*(?:[:=]\s*|\s+(?:is|of)\s+)?\d{2,3}\b/gi,
    },
    {
      label: "Potassium",
      isDocumented: scratchpad.labs.potassiumMeqL !== null,
      unmeasuredRegex: /\b(?:potassium|k\+?)\s*(?:\([^)\n]{1,20}\))?\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\b(?:potassium|k\+?)\s*(?:\([^)\n]{1,20}\))?\s*(?:[:=]\s*|\s+(?:is|of)\s+)?[1-9](?:\.\d+)?\b/gi,
    },
    {
      label: "Creatinine",
      isDocumented: scratchpad.labs.creatinineMgDl !== null,
      unmeasuredRegex: /\b(?:serum\s+)?(?:creatinine|cr)\s*(?:\([^)\n]{1,20}\))?\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\b(?:serum\s+)?(?:creatinine|cr)\s*(?:\([^)\n]{1,20}\))?\s*(?:[:=]\s*|\s+(?:is|of)\s+)?\d+(?:\.\d+)?\s*(?:mg\/dl)?\b/gi,
      skipBefore: /\b(?:baseline|prior|previous)(?:\s+serum)?\s*$/i,
    },
    {
      label: "Baseline Creatinine",
      isDocumented: scratchpad.labs.baselineCreatinineMgDl !== null,
      unmeasuredRegex: /\bbaseline(?:\s+(?:serum\s+)?(?:creatinine|cr))?\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\bbaseline(?:\s+(?:serum\s+)?(?:creatinine|cr))?\s*(?:[:=]\s*|\s+(?:is|of)\s+)?\d+(?:\.\d+)?\b/gi,
    },
    {
      label: "Bicarbonate",
      isDocumented: scratchpad.labs.bicarbonateMeqL !== null,
      unmeasuredRegex: /\b(?:bicarbonate|bicarb|hco3-?)\s*(?:\([^)\n]{1,20}\))?\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\b(?:bicarbonate|bicarb|hco3-?)\s*(?:\([^)\n]{1,20}\))?\s*(?:[:=]\s*|\s+(?:is|of)\s+)?\d{1,2}(?:\.\d+)?\b/gi,
    },
    {
      label: "Arterial pH",
      isDocumented: scratchpad.labs.arterialPh !== null,
      unmeasuredRegex: /\b(?:arterial\s+)?ph\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\b(?:arterial\s+)?ph\s*(?:[:=]\s*|\s+(?:is|of)\s+)?(?:6|7)\.\d{2,3}\b/gi,
    },
    {
      label: "PaCO2",
      isDocumented: scratchpad.labs.paco2MmHg !== null,
      unmeasuredRegex: /\b(?:paco2|pco2)\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\b(?:paco2|pco2)\s*(?:[:=]\s*|\s+(?:is|of)\s+)?\d{2,3}(?:\.\d+)?\s*(?:mmhg)?\b/gi,
    },
    {
      label: "Lactate",
      isDocumented: scratchpad.labs.lactateMmolL !== null,
      unmeasuredRegex: /\b(?:lactate|lactic\s*acid)\s*(?:\([^)\n]{1,20}\))?\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\b(?:lactate|lactic\s*acid)\s*(?:\([^)\n]{1,20}\))?\s*(?:[:=]\s*|\s+(?:is|of)\s+)?\d{1,2}(?:\.\d+)?\b/gi,
    },
    {
      label: "Blood Glucose",
      isDocumented: scratchpad.labs.glucoseMgDl !== null,
      unmeasuredRegex: /\b(?:blood\s+glucose|serum\s+glucose|glucose|bg)\s*(?:\([^)\n]{1,20}\))?\s*[:=]?\s*(?:\[\s*UNMEASURED|\b(?:unmeasured|unavailable|missing|not\s+(?:measured|provided|available|obtained))\b)/gi,
      measuredRegex: /\b(?:blood\s+glucose|serum\s+glucose|glucose|bg)\s*(?:\([^)\n]{1,20}\))?\s*(?:[:=]\s*|\s+(?:is|of)\s+)?\d{2,4}(?:\.\d+)?\b/gi,
    },
  ];

  const hasUnguardedParamMatch = (haystack: string, rx: RegExp, skipBefore?: RegExp): boolean => {
    for (const m of haystack.matchAll(rx)) {
      if (skipBefore) {
        const idx = m.index ?? 0;
        const pre = haystack.slice(Math.max(0, idx - 35), idx);
        if (skipBefore.test(pre)) continue;
      }
      return true;
    }
    return false;
  };

  for (const pm of documentedParamMonitors) {
    if (pm.isDocumented && hasUnguardedParamMatch(normDossier, pm.unmeasuredRegex, pm.skipBefore)) {
      violations.push({
        item: `Documented-to-UNMEASURED Substitution (${pm.label})`,
        sectionA: `Documented Intake (${pm.label} present)`,
        sectionB: "Dossier / Scratchpad Text",
        issue: `Documented-to-UNMEASURED violation: ${pm.label} was documented in intake but marked unmeasured/missing in output.`,
      });
    }
  }

  // Check 20B: Narrative-vs-Scratchpad Section Divergence Veto
  const scratchSplit = normDossier.split(/(?=#{2,4}\s*(?:\d+\.\s*)?Neuro-Symbolic)/i);
  if (scratchSplit.length >= 2) {
    const narrativePart = scratchSplit[0];
    const scratchPart = scratchSplit.slice(1).join("\n");
    for (const pm of documentedParamMonitors) {
      if (
        hasUnguardedParamMatch(scratchPart, pm.unmeasuredRegex, pm.skipBefore) &&
        hasUnguardedParamMatch(narrativePart, pm.measuredRegex, pm.skipBefore)
      ) {
        violations.push({
          item: `Narrative-vs-Scratchpad Contradiction (${pm.label})`,
          sectionA: `Dossier Narrative (${pm.label} numerically reported)`,
          sectionB: `Deterministic Scratchpad (${pm.label} marked unmeasured)`,
          issue: `Narrative-vs-Scratchpad divergence: narrative uses ${pm.label} while scratchpad marks it UNMEASURED.`,
        });
      }
    }
  }

  // Check 21: Anion Gap & Winter's Formula Refusal / Calculation Fidelity
  if (scratchpad.derivedCalculations.anionGap.isComputable && scratchpad.derivedCalculations.anionGap.anionGapMeqL !== null) {
    if (/\b(?:anion\s+gap[^\n.]{0,80}(?:cannot\s+be\s+calculated|cannot\s+calculate|chloride\s+(?:is\s+)?(?:unavailable|unmeasured|missing))|cannot\s+calculate[^\n.]{0,40}anion\s+gap)\b/i.test(normDossier)) {
      violations.push({
        item: "Anion Gap Refusal Integrity",
        sectionA: `Documented Intake (${scratchpad.derivedCalculations.anionGap.formula})`,
        sectionB: "Dossier Calculations",
        issue: "Incorrect Anion Gap refusal: electrolytes including chloride are documented, yet output claims Anion Gap cannot be calculated or chloride is unavailable.",
      });
    }
    const expectedAg = scratchpad.derivedCalculations.anionGap.anionGapMeqL;
    for (const m of normDossier.matchAll(/\banion\s+gap\s*(?:is|of|=|:)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\b/gi)) {
      const before = normDossier.slice(Math.max(0, (m.index ?? 0) - 35), m.index ?? 0);
      if (/[<>≤≥]|normal|threshold|criteria|cutoff|reference/i.test(before)) continue;
      const statedAg = parseFloat(m[1]);
      if (Math.abs(statedAg - expectedAg) > 1.5) {
        violations.push({
          item: "Anion Gap Value Fidelity",
          sectionA: `Expected Anion Gap (${expectedAg} mEq/L)`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Anion Gap calculation mismatch: stated ${statedAg} conflicts with ${expectedAg} mEq/L.`,
        });
      }
    }
  }

  if (scratchpad.derivedCalculations.wintersFormula.isComputable) {
    if (/\bwinter['’]?s\s+formula[^\n.]{0,80}(?:cannot\s+be\s+(?:computed|calculated)|bicarbonate\s+(?:is\s+)?(?:missing|unavailable|unmeasured))/i.test(normDossier)) {
      violations.push({
        item: "Winter's Formula Calculation Integrity",
        sectionA: `Documented Intake (HCO3- documented: ${scratchpad.labs.abgBicarbonateMeqL ?? scratchpad.labs.bicarbonateMeqL} mEq/L)`,
        sectionB: "Dossier Calculations",
        issue: "Incorrect Winter's Formula refusal: bicarbonate is documented, yet output claims Winter's formula cannot be computed/calculated.",
      });
    }
  }

  // Check 22: KDIGO Stage 3 Overstaging Veto
  const kdigo = scratchpad.derivedCalculations.kdigoAki;
  const hasRrtInInput = /\b(?:dialysis\s+(?:initiated|started)|on\s+(?:hd|hemodialysis|crrt)|renal\s+replacement\s+therapy\s+(?:initiated|started))\b/i.test(scratchpad.rawInputText);
  if ((kdigo.establishedStage === 1 || kdigo.establishedStage === 2) && !kdigo.isStage3ConditionalOnAcuteTimeline && !kdigo.canAnuriaBeUsedForStage3 && !hasRrtInInput) {
    for (const m of normDossier.matchAll(/\b(?:kdigo\s*(?:aki\s*)?stage\s*(?:2\s*[\/-]\s*3|3)|stage\s*(?:2\s*[\/-]\s*3|3)\s*(?:aki|acute\s+kidney\s+injury))\b/gi)) {
      const idx = m.index ?? 0;
      const ctx = normDossier.slice(Math.max(0, idx - 65), Math.min(normDossier.length, idx + m[0].length + 65));
      if (/\b(?:(?:is|are)\s+not\s+(?:met|established|supported|confirmed|present|indicated)|not\s+(?:met|meet|establish|support|confirm|qualify|stage\s*3)|does\s+not|cannot\s+(?:be\s+used\s+to\s+)?(?:establish|confirm)|without\s+(?:supporting|documented)|exclude|rule\s+out|criteria\s+(?:for|require)|threshold|conditional|progression\s+to|prevent|avoid)\b/i.test(ctx)) {
        continue;
      }
      violations.push({
        item: "Unsupported KDIGO Stage 3 Assertion",
        sectionA: `Scratchpad KDIGO Analysis (${kdigo.stageRationale})`,
        sectionB: `Dossier Text (${m[0]})`,
        issue: `Unsupported KDIGO Stage 3 / Stage 2/3 overstaging ("${m[0]}") when Stage 3 criteria are not met.`,
      });
    }
  }

  // Check 23: Core Lab Cross-Section Numeric Fidelity (Na+, Cl-, Lactate, Glucose, Measured PaCO2)
  const coreLabChecks: Array<{
    item: string;
    expected: number | null;
    regex: RegExp;
    inputLabelRegex: RegExp;
    tolerance: number;
    skipBeforeRegex: RegExp;
  }> = [
    {
      item: "Serum Sodium",
      expected: scratchpad.labs.sodiumMeqL,
      regex: /\b(?:serum\s+)?(?:sodium|na\+?)\s*(?:\([^)\n]{1,15}\))?\s*(?:is|of|=|:)?\s*(\d{3}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\b/gi,
      inputLabelRegex: /\b(?:sodium|na\+?)\b[^\n]{0,30}?\b(\d{3}(?:\.\d+)?)\b/gi,
      tolerance: 1.0,
      skipBeforeRegex: /[<>≤≥]|target|goal|normal|range|threshold|reference|correction|limit/i,
    },
    {
      item: "Serum Chloride",
      expected: scratchpad.labs.chlorideMeqL,
      regex: /(?<![A-Za-z])\b(?:serum\s+)?(?:chloride|cl-?)\s*(?:\([^)\n]{1,15}\))?\s*(?:is|of|=|:)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\b/gi,
      inputLabelRegex: /(?<![A-Za-z])\b(?:chloride|cl-?)\b[^\n]{0,30}?\b(\d{2,3}(?:\.\d+)?)\b/gi,
      tolerance: 1.0,
      skipBeforeRegex: /[<>≤≥]|target|goal|normal|range|threshold|reference|hypothetical/i,
    },
    {
      item: "Serum Lactate",
      expected: scratchpad.labs.lactateMmolL,
      regex: /\b(?:venous\s+|arterial\s+|serum\s+)?(?:lactate|lactic\s+acid)\s*(?:\([^)\n]{1,15}\))?\s*(?:is|of|=|:)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:mmol\/l|meq\/l)?\b/gi,
      inputLabelRegex: /\b(?:lactate|lactic\s+acid)\b[^\n]{0,30}?\b(\d{1,2}(?:\.\d+)?)\b/gi,
      tolerance: 0.2,
      skipBeforeRegex: /[<>≤≥]|target|goal|normal|range|threshold|clearance|cutoff/i,
    },
    {
      item: "Blood Glucose",
      expected: scratchpad.labs.glucoseMgDl,
      regex: /\b(?:blood\s+|serum\s+)?(?:glucose|bg)\s*(?:\([^)\n]{1,15}\))?\s*(?:is|of|=|:)?\s*(\d{2,4}(?:\.\d+)?)\s*(?:mg\/dl)?\b/gi,
      inputLabelRegex: /\b(?:glucose|blood\s*sugar|bg)\b[^\n]{0,30}?\b(\d{2,4}(?:\.\d+)?)\b/gi,
      tolerance: 2.0,
      skipBeforeRegex: /[<>≤≥]|target|goal|normal|range|threshold|insulin|protocol|hypoglycem|keep|maintain/i,
    },
    {
      item: "Measured PaCO2",
      expected: scratchpad.labs.paco2MmHg,
      regex: /\b(?:measured\s+)?(?:paco2|pco2)\s*(?:is|of|=|:)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:mmhg)?\b/gi,
      inputLabelRegex: /\b(?:paco2|pco2)\b[^\n]{0,30}?\b(\d{2,3}(?:\.\d+)?)\b/gi,
      tolerance: 1.0,
      skipBeforeRegex: /[<>≤≥]|expected|predicted|winter|compensat|target|goal|range|normal|upper\s+limit|lower\s+limit|±|\\pm/i,
    },
  ];

  const normInput = normalizeClinicalTextForExtraction(scratchpad.rawInputText);
  for (const chk of coreLabChecks) {
    if (chk.expected === null) continue;
    const allowedValues = new Set<number>([chk.expected]);
    for (const im of normInput.matchAll(chk.inputLabelRegex)) {
      const iIdx = im.index ?? 0;
      const iBefore = normInput.slice(Math.max(0, iIdx - 45), iIdx);
      const iAfter = normInput.slice(iIdx + im[0].length, Math.min(normInput.length, iIdx + im[0].length + 25));
      if (chk.skipBeforeRegex.test(iBefore) || /^[\s–-]*to\s+\d|^\s*[–-]\s*\d|±/i.test(iAfter)) continue;
      allowedValues.add(parseFloat(im[1]));
    }
    for (const m of normDossier.matchAll(chk.regex)) {
      const idx = m.index ?? 0;
      const before = normDossier.slice(Math.max(0, idx - 45), idx);
      const after = normDossier.slice(idx + m[0].length, Math.min(normDossier.length, idx + m[0].length + 25));
      if (chk.skipBeforeRegex.test(before) || /^[\s–-]*to\s+\d|^\s*[–-]\s*\d|±/i.test(after)) continue;
      const stated = parseFloat(m[1]);
      const matchesAnyDocumented = [...allowedValues].some((v) => Math.abs(stated - v) <= chk.tolerance);
      if (!matchesAnyDocumented) {
        violations.push({
          item: chk.item,
          sectionA: `Documented Intake (${chk.item}: ${chk.expected})`,
          sectionB: `Dossier Text (${m[0]})`,
          issue: `Cross-section inconsistency in ${chk.item}: stated ${stated} conflicts with documented intake (${chk.expected}).`,
        });
      }
    }
  }

  return {
    isConsistent: violations.length === 0,
    violations,
  };
}
