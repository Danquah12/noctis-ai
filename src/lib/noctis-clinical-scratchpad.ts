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
  stageRationale: string;
  isStage3ConditionalOnAcuteTimeline: boolean;
  weightNormalizedUoMlKgHr: number | null;
  uoStagingStatus: "COMPUTABLE" | "UNMEASURED_WEIGHT_PROHIBITS_CALCULATION" | "NO_URINE_OUTPUT_DATA";
  uoStagingCaveat: string;
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
  weightBasedVials: number | null;
  empiricEmergencyVials: string;
  rationale: string;
}

export interface FluidResuscitationSafetyResult {
  standard30mLPerKgContraindicated: boolean;
  highRiskConditionsIdentified: string[];
  recommendedResuscitationApproach: string;
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

  const weightMatch = q.match(/\b(?:weight|weighs|wt)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kilos|kilograms)\b/i) ||
    q.match(/\b(\d{2,3}(?:\.\d+)?)\s*kg\b/i);
  const patientWeightKg = weightMatch ? parseFloat(weightMatch[1]) : null;

  // 2. Vitals
  const bpMatch = q.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\s*mmHg\b/i) ||
    q.match(/\bbp\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
  const systolicBp = bpMatch ? parseInt(bpMatch[1], 10) : null;
  const diastolicBp = bpMatch ? parseInt(bpMatch[2], 10) : null;
  const bloodPressureString = bpMatch ? `${systolicBp}/${diastolicBp} mmHg` : null;

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

  const glucMatch = q.match(/\b(?:glucose|blood\s*sugar|bg)\s*[:=]?\s*(\d{2,3})\s*(?:mg\/dl)?\b/i);
  const bloodGlucoseMgDl = glucMatch ? parseFloat(glucMatch[1]) : null;

  // 3. Labs
  const kMatch = q.match(/\b(?:potassium|k\+)\s*[:=]?\s*([2-9]\.\d)\b/i);
  const potassiumMeqL = kMatch ? parseFloat(kMatch[1]) : null;

  const naMatch = q.match(/\b(?:sodium|na\+?)\s*[:=]?\s*(\d{3})\b/i);
  const sodiumMeqL = naMatch ? parseFloat(naMatch[1]) : null;

  const clMatch = q.match(/\b(?:chloride|cl\s*[-=:]?)\s*[:=]?\s*(\d{2,3})\b/i);
  const chlorideMeqL = clMatch ? parseFloat(clMatch[1]) : null;

  const baseCrMatch = q.match(/\bbaseline\s+(?:creatinine|cr)\s*[:=]?\s*(\d+\.\d+)\b/i);
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

  const hco3Match = q.match(/\b(?:bicarbonate|hco3-?)\s*[:=]?\s*(\d{1,2})\b/i);
  const bicarbonateMeqL = hco3Match ? parseFloat(hco3Match[1]) : null;

  const phMatch = q.match(/\b(?:arterial\s+)?ph\s*[:=]?\s*(\d\.\d{2})\b/i);
  const arterialPh = phMatch ? parseFloat(phMatch[1]) : null;

  const paco2Match = q.match(/\bpaco2\s*[:=]?\s*(\d{2})\b/i);
  const paco2MmHg = paco2Match ? parseFloat(paco2Match[1]) : null;

  const lacMatch = q.match(/\blactate\s*[:=]?\s*(\d+\.\d+)\b/i);
  const lactateMmolL = lacMatch ? parseFloat(lacMatch[1]) : null;

  const digLevelMatch = q.match(/\b(?:digoxin|dig)\s*(?:level|concentration|serum)?\s*[:=]?\s*(\d+\.\d+)\s*(?:ng\/ml|mcg\/l|nmol\/l)\b/i) ||
    q.match(/\b(?:digoxin|dig)\s*(?:level|concentration|serum)\s*[:=]?\s*(\d+\.\d+)\b/i);
  let digoxinNgMl: number | null = digLevelMatch ? parseFloat(digLevelMatch[1]) : null;
  if (digoxinNgMl === null) {
    const allDig = [...q.matchAll(/\b(?:digoxin|dig)\s*[:=]?\s*(\d+\.\d+)(?:\s*(mg|mcg|ng\/ml))?\b/gi)];
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

  // B. KDIGO AKI Staging
  let crAbsoluteRiseMgDl: number | null = null;
  let crFoldRatio: number | null = null;
  let establishedStage: 1 | 2 | 3 | "indeterminate" = "indeterminate";
  let stageRationale = "";
  let isStage3ConditionalOnAcuteTimeline = false;

  if (creatinineMgDl !== null && baselineCreatinineMgDl !== null) {
    crAbsoluteRiseMgDl = parseFloat((creatinineMgDl - baselineCreatinineMgDl).toFixed(2));
    crFoldRatio = parseFloat((creatinineMgDl / baselineCreatinineMgDl).toFixed(2));

    if (crFoldRatio >= 3.0) {
      establishedStage = 3;
      stageRationale = `KDIGO Stage 3 (Serum creatinine increased ≥ 3.0× baseline: ${crFoldRatio}×).`;
    } else if (crFoldRatio >= 2.0 && crFoldRatio < 3.0) {
      establishedStage = 2;
      stageRationale = `KDIGO Stage 2 (Serum creatinine increased 2.0–2.9× baseline: ${crFoldRatio}×). Note: An absolute serum creatinine ≥ 4.0 mg/dL (${creatinineMgDl} mg/dL) with an acute rise ≥ 0.5 mg/dL (+${crAbsoluteRiseMgDl} mg/dL) conditionally meets Stage 3 criteria if verified to have occurred acutely within 48 hours to 7 days.`;
      isStage3ConditionalOnAcuteTimeline = true;
    } else if (crFoldRatio >= 1.5 || crAbsoluteRiseMgDl >= 0.3) {
      establishedStage = 1;
      stageRationale = `KDIGO Stage 1 (Serum creatinine increased 1.5–1.9× baseline: ${crFoldRatio}× or rise ≥ 0.3 mg/dL).`;
    }
  } else if (creatinineMgDl !== null && baselineCreatinineMgDl === null) {
    establishedStage = "indeterminate";
    stageRationale = `KDIGO Stage indeterminate (Baseline creatinine unmeasured; current creatinine ${creatinineMgDl} mg/dL indicates severe renal impairment but baseline fold change cannot be confirmed).`;
  }

  let weightNormalizedUoMlKgHr: number | null = null;
  let uoStagingStatus: "COMPUTABLE" | "UNMEASURED_WEIGHT_PROHIBITS_CALCULATION" | "NO_URINE_OUTPUT_DATA" = "NO_URINE_OUTPUT_DATA";
  let uoStagingCaveat = "";

  if (urineOutputMl !== null && urineOutputDurationHours !== null) {
    if (patientWeightKg !== null) {
      weightNormalizedUoMlKgHr = parseFloat(
        (urineOutputMl / (patientWeightKg * urineOutputDurationHours)).toFixed(2)
      );
      uoStagingStatus = "COMPUTABLE";
      uoStagingCaveat = `Urine output: ${urineOutputMl} mL over ${urineOutputDurationHours}h = ${weightNormalizedUoMlKgHr} mL/kg/h based on measured body weight ${patientWeightKg} kg.`;
    } else {
      uoStagingStatus = "UNMEASURED_WEIGHT_PROHIBITS_CALCULATION";
      uoStagingCaveat = `Urine output is ${urineOutputMl} mL over ${urineOutputDurationHours}h. Because patient body weight was NOT provided, calculating weight-normalized output in mL/kg/h (e.g. by assuming an arbitrary adult weight) is clinically contraindicated.`;
    }
  } else {
    uoStagingCaveat = "Urine output was not quantified in intake.";
  }

  const kdigoAki: KdigoAkiStagingResult = {
    crAbsoluteRiseMgDl,
    crFoldRatio,
    establishedStage,
    stageRationale,
    isStage3ConditionalOnAcuteTimeline,
    weightNormalizedUoMlKgHr,
    uoStagingStatus,
    uoStagingCaveat,
  };

  // C. Anion Gap Calculation
  let anionGap: AnionGapCalculationResult;
  if (isChlorideMissing) {
    anionGap = {
      isComputable: false,
      anionGapMeqL: null,
      formula: "Anion Gap = [Na+] - ([Cl-] + [HCO3-])",
      refusalReason:
        "Serum chloride was NOT measured in this intake. Estimating or substituting a hypothetical reference chloride (e.g. 98 or 104 mmol/L) to calculate an anion gap is strictly prohibited. Anion Gap CANNOT be calculated without measured chloride.",
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
      refusalReason: "Incomplete electrolyte profile (missing sodium or bicarbonate).",
    };
  }

  // D. Winter's Formula
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
        calibratedClinicalInterpretation: `Expected PaCO2 is ${low}–${high} mmHg (${midpoint} ± 2 mmHg). Measured PaCO2 of ${paco2MmHg} mmHg is ${deviation} mmHg above the predicted upper limit. This minimal difference falls within normal biological and measurement variability, representing possible inadequate respiratory compensation / borderline relative hypoventilation rather than a definitive secondary respiratory acidosis.`,
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

  // E. DigiFab Dosing
  let digiFabDosing: DigiFabDosingResult;
  if (digoxinNgMl !== null) {
    if (patientWeightKg !== null) {
      const calculatedVials = (digoxinNgMl * patientWeightKg) / 100;
      digiFabDosing = {
        isComputableWeightBased: true,
        weightBasedVials: Math.ceil(calculatedVials),
        empiricEmergencyVials: "5–10 vials IV infusion",
        rationale: `Weight-based calculation: (${digoxinNgMl} ng/mL × ${patientWeightKg} kg) / 100 = ${calculatedVials.toFixed(1)} vials (round to ${Math.ceil(calculatedVials)} vials).`,
      };
    } else {
      digiFabDosing = {
        isComputableWeightBased: false,
        weightBasedVials: null,
        empiricEmergencyVials: "5–10 vials IV infusion (empiric emergency dose; 10–20 vials if in cardiac arrest)",
        rationale:
          "Because patient weight was NOT provided, the weight-based formula [(Serum Digoxin ng/mL × Weight kg) / 100] cannot be calculated. Never assume an arbitrary weight. Administer empiric emergency dosing of 5–10 vials IV infusion (or 10–20 vials for cardiac arrest) in consultation with Medical Toxicology.",
      };
    }
  } else {
    digiFabDosing = {
      isComputableWeightBased: false,
      weightBasedVials: null,
      empiricEmergencyVials: "Not indicated unless clinical digoxin toxicity suspected",
      rationale: "Serum digoxin level not reported.",
    };
  }

  // F. Fluid Safety Ceiling
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

  const standard30mLPerKgContraindicated = highRiskConditions.length > 0;
  const fluidSafety: FluidResuscitationSafetyResult = {
    standard30mLPerKgContraindicated,
    highRiskConditionsIdentified: highRiskConditions,
    recommendedResuscitationApproach: standard30mLPerKgContraindicated
      ? "Standard 30 mL/kg sepsis crystalloid bolus is STRICTLY CONTRAINDICATED due to high pulmonary edema risk. Administer conservative titrated fluid challenges (250–500 mL balanced crystalloids) with serial dynamic POCUS/VExUS assessments and early vasopressor initiation (Norepinephrine)."
      : "Standard crystalloid resuscitation permissible with dynamic fluid responsiveness monitoring.",
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
  mdLines.push(`- **Anion Gap:** ${anionGap.isComputable ? anionGap.formula : `**CANNOT BE CALCULATED** (${anionGap.refusalReason})`}`);
  mdLines.push(`- **Winter's Formula:** ${wintersFormula.calibratedClinicalInterpretation}`);
  mdLines.push(`- **DigiFab Dosing:** ${digiFabDosing.empiricEmergencyVials} (${digiFabDosing.rationale})`);
  mdLines.push(`- **Fluid Challenge Ceiling:** ${fluidSafety.recommendedResuscitationApproach}`);
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
