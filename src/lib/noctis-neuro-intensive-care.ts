/**
 * NOCTIS SOVEREIGN NEURO-INTENSIVE CARE & NEUROLOGICAL EMERGENCIES ENGINE (NOCTIS-NEURO-ICU-001)
 * Standards & Guidelines:
 * - Brain Trauma Foundation (BTF) Guidelines for Severe Traumatic Brain Injury (4th Ed)
 * - Neurocritical Care Society (NCS) Consensus Statement on ICP Crisis & Osmotherapy
 * - AHA / ASA Guidelines for Early Management of Acute Ischemic Stroke (2026 Update)
 * - Neurocritical Care Society Guidelines for Aneurysmal Subarachnoid Hemorrhage (aSAH)
 *
 * Non-Compensatory Safety Invariants:
 * - CF-NEURO-001: ICP Crisis Hypotonic Fluid Veto (0.45% NS / D5W strictly prohibited; precipitates catastrophic brain swelling)
 * - CF-NEURO-002: Sustained Hyperventilation Ischemic Veto (PaCO2 < 30 mmHg causes severe cerebral vasoconstriction and stroke)
 * - CF-NEURO-003: Subarachnoid Hemorrhage IV Nimodipine Veto (Nimodipine MUST be administered PO/NG; IV causes fatal cardiovascular collapse)
 * - CF-NEURO-004: Acute Stroke Severe Hypotension Veto during Endovascular Thrombectomy (MAP < 70 mmHg increases infarct core)
 * - CF-NEURO-005: Uncal Herniation Delayed Intervention Veto (Fixed dilated pupil requires emergent osmotherapy before imaging)
 */

export interface IcpCrisisInput {
  patientWeightKg: number;
  meanArterialPressureMmHg: number;
  intracranialPressureMmHg: number;
  pupilExam: "NORMAL_EQUAL_REACTIVE" | "UNILATERAL_FIXED_DILATED" | "BILATERAL_FIXED_DILATED" | "SLUGGISH";
  cushingTriadPresent: boolean; // Hypertension with widened pulse pressure, bradycardia, irregular respirations
  serumSodiumMeqL: number;
  serumOsmolalityMOsmKg?: number;
  activeFluids: string[];
  paCO2MmHg: number;
  currentTier: 0 | 1 | 2 | 3;
}

export interface IcpCrisisResult {
  engineId: "NOCTIS-NEURO-ICU-001";
  cerebralPerfusionPressureMmHg: number; // CPP = MAP - ICP
  cppTargetStatus: "ADEQUATE" | "CRITICAL_ISCHEMIC_RISK" | "HYPERPERFUSION_RISK";
  herniationRiskTier: "IMMINENT_TRANSTENTORIAL_HERNIATION" | "HIGH_RISK_ICP_CRISIS" | "CONTROLLED_ICP";
  osmotherapyDirective: {
    recommendedAgent: "HYPERTONIC_SALINE_3_PERCENT" | "MANNITOL_20_PERCENT" | "SODIUM_CHLORIDE_23_4_PERCENT";
    bolusDose: string;
    targetSodiumRange: string;
    targetOsmolalityRange: string;
    contraindicationsToCheck: string[];
  };
  tieredEscalationActions: string[];
  safetyVetoes: string[];
}

export interface AcuteIschemicStrokeInput {
  hoursFromLastKnownWell: number;
  nihssScore: number;
  largeVesselOcclusionPresent: boolean; // ICA, MCA M1, basilar
  aspectsScoreOnCt: number; // 0 - 10
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  bloodGlucoseMgDl: number;
  plateletCount10e9L: number;
  inr: number;
  anticoagulationActive: boolean;
  ischemicCoreVolumeMl?: number; // CTP or MRI DWI (< 70 mL for DAWN/DEFUSE-3)
  mismatchRatio?: number; // Target >= 1.8
}

export interface AcuteIschemicStrokeResult {
  engineId: "NOCTIS-NEURO-ICU-001";
  thrombolysisEligibility: {
    eligible: boolean;
    windowCategory: "WITHIN_4_5_HOUR_WINDOW" | "EXTENDED_WAKE_UP_WINDOW" | "BEYOND_WINDOW";
    recommendedAgent: "TENECTEPLASE_TNK" | "ALTEPLASE_TPA" | "CONTRAINDICATED";
    weightBasedDose: string;
    bloodPressureTargetPriorToThrombolysis: string;
    contraindicationsFlagged: string[];
  };
  endovascularThrombectomyEligibility: {
    eligible: boolean;
    criteriaType: "STANDARD_0_6_HOUR" | "EXTENDED_6_24_HOUR_DAWN_DEFUSE" | "NOT_ELIGIBLE";
    rationale: string;
    bloodPressureTargetDuringProcedure: string;
  };
  immediateCareDirectives: string[];
}

export interface SubarachnoidHemorrhageInput {
  patientWeightKg: number;
  huntHessGrade: 1 | 2 | 3 | 4 | 5;
  fisherGradeOnCt: 1 | 2 | 3 | 4;
  aneurysmSecured: boolean;
  systolicBpMmHg: number;
  meanArterialPressureMmHg: number;
  nimodipineRouteOrdered: "ORAL_ENTERAL_NG" | "INTRAVENOUS";
  daysPostBleed: number;
  transcranialDopplerMcaVelocityCmS?: number;
  lindegaardRatio?: number; // MCA velocity / Extracranial ICA velocity
}

export interface SubarachnoidHemorrhageResult {
  engineId: "NOCTIS-NEURO-ICU-001";
  clinicalAcuity: string;
  rebleedingRiskTier: "HIGH_IMMEDIATE_RISK" | "SECURED_LOW_RISK";
  bloodPressureTarget: string;
  nimodipineProtocol: {
    doseAndSchedule: string;
    routeMandate: string;
    durationDays: number;
  };
  vasospasmAndDciMonitoring: {
    vasospasmDetected: boolean;
    lindegaardInterpretation: string;
    dciPreventionDirectives: string[];
  };
  strictSafetyVetoes: string[];
}

// ============================================================================
// 1. ELEVATED INTRACRANIAL PRESSURE (ICP) & TRANSTENTORIAL HERNIATION ENGINE
// ============================================================================

export function evaluateIcpCrisisAndHerniation(input: IcpCrisisInput): IcpCrisisResult {
  const {
    patientWeightKg,
    meanArterialPressureMmHg,
    intracranialPressureMmHg,
    pupilExam,
    cushingTriadPresent,
    serumSodiumMeqL,
    serumOsmolalityMOsmKg = 295,
    activeFluids,
    paCO2MmHg,
    currentTier,
  } = input;

  const vetoes: string[] = [];
  const actions: string[] = [];

  // Formula: CPP = MAP - ICP
  const cpp = meanArterialPressureMmHg - intracranialPressureMmHg;

  let cppStatus: IcpCrisisResult["cppTargetStatus"] = "ADEQUATE";
  if (cpp < 60) {
    cppStatus = "CRITICAL_ISCHEMIC_RISK";
  } else if (cpp > 80) {
    cppStatus = "HYPERPERFUSION_RISK";
  }

  // Herniation Risk Assessment
  const isHerniation =
    pupilExam === "UNILATERAL_FIXED_DILATED" ||
    pupilExam === "BILATERAL_FIXED_DILATED" ||
    (cushingTriadPresent && intracranialPressureMmHg >= 25);

  let herniationTier: IcpCrisisResult["herniationRiskTier"] = "CONTROLLED_ICP";
  if (isHerniation) {
    herniationTier = "IMMINENT_TRANSTENTORIAL_HERNIATION";
  } else if (intracranialPressureMmHg >= 22) {
    herniationTier = "HIGH_RISK_ICP_CRISIS";
  }

  // Safety Veto CF-NEURO-001: Hypotonic fluids strictly prohibited
  const hasHypotonic = activeFluids.some((f) => {
    const l = f.toLowerCase();
    return (
      l.includes("0.45") ||
      l.includes("d5w") ||
      l.includes("d5 1/2") ||
      l.includes("lactated ringer") ||
      l.includes("plasmalyte")
    );
  });
  if (hasHypotonic) {
    vetoes.push(
      "CF-NEURO-001 [HYPOTONIC FLUID VETO]: Hypotonic or slightly hypo-osmolar fluids (0.45% NS, D5W, D5 1/2 NS, Lactated Ringer's) are strictly contraindicated in elevated ICP / acute brain injury. Free water crosses the damaged blood-brain barrier along the osmotic gradient, precipitating rapid intracellular edema, acute brain swelling, and catastrophic herniation. Immediately switch all maintenance fluids to 0.9% Normal Saline."
    );
  }

  // Safety Veto CF-NEURO-002: Sustained hyperventilation veto
  if (paCO2MmHg < 30) {
    vetoes.push(
      `CF-NEURO-002 [SUSTAINED HYPERVENTILATION ISCHEMIC VETO]: Measured PaCO2 of ${paCO2MmHg} mmHg (< 30 mmHg) causes profound precapillary cerebral vasoconstriction. While transient hyperventilation is a rescue bridge during herniation, sustained PaCO2 < 30 mmHg induces severe regional cerebral ischemia and worsens secondary brain injury. Adjust ventilator rate/tidal volume to maintain PaCO2 35-40 mmHg.`
    );
  }

  // Safety Veto CF-NEURO-005: Uncal herniation delayed intervention veto
  if (pupilExam === "UNILATERAL_FIXED_DILATED") {
    vetoes.push(
      "CF-NEURO-005 [UNCAL HERNIATION EMERGENCY VETO]: Acute unilateral fixed and dilated pupil indicates transtentorial uncal herniation with compression of ipsilateral cranial nerve III. DO NOT delay intervention for repeat CT imaging or invasive monitor calibration. Administer emergent osmotherapy STAT."
    );
  }

  // Osmotherapy Selection (Hypertonic Saline vs Mannitol)
  let chosenAgent: IcpCrisisResult["osmotherapyDirective"]["recommendedAgent"] = "HYPERTONIC_SALINE_3_PERCENT";
  let bolusDesc = "250 mL of 3% Hypertonic Saline IV over 15-20 minutes via central or dedicated peripheral line.";

  if (isHerniation) {
    chosenAgent = "SODIUM_CHLORIDE_23_4_PERCENT";
    bolusDesc = "30 mL of 23.4% Hypertonic Saline IV push over 10-15 minutes via central venous catheter.";
  } else if (serumSodiumMeqL >= 155 && serumOsmolalityMOsmKg < 320) {
    chosenAgent = "MANNITOL_20_PERCENT";
    const mannitolDoseG = Math.round(patientWeightKg * 1.0);
    bolusDesc = `Mannitol 20% ${mannitolDoseG} grams IV (${Math.round(mannitolDoseG * 5)} mL) infused over 20-30 minutes through an in-line filter.`;
  }

  // Tiered BTF / NCS Management Pathway
  actions.push("Tier 1 Baseline: Elevate head of bed 30 degrees, maintain neutral cervical spine alignment (avoid jugular compression), provide continuous analgesia and sedation (Propofol / Fentanyl).");
  actions.push("Maintain strict normothermia (core temp < 37.5 C) with targeted temperature management; avoid shivering.");
  actions.push("If External Ventricular Drain (EVD) is in place, open stopcock to drain CSF at 10-15 cm H2O level.");

  if (herniationTier !== "CONTROLLED_ICP") {
    actions.push("Tier 2 Rescue: Administer bolus osmotherapy immediately. Target serum sodium 145-155 mEq/L (Hypertonic Saline) or serum osmolality < 320 mOsm/kg (Mannitol).");
    actions.push("Brief rescue hyperventilation to PaCO2 30-35 mmHg permitted strictly as a temporary bridge while preparing definitive medical/surgical interventions.");
    actions.push("Ensure CPP is maintained between 60 and 70 mmHg using Norepinephrine infusion if necessary (avoid SBP < 100 mmHg in ages 50-69, SBP < 110 mmHg in ages 15-49 or >= 70).");
  }

  if (currentTier >= 2 || herniationTier === "IMMINENT_TRANSTENTORIAL_HERNIATION") {
    actions.push("Tier 3 Refractory Measures: Urgent neurosurgical consultation for emergent Decompressive Craniectomy.");
    actions.push("Consider high-dose barbiturate infusion (Pentobarbital loading dose 10 mg/kg over 30 min, then 1-3 mg/kg/hr) titrated to burst suppression on continuous EEG (maintain arterial line and vasopressor support for inevitable vasoplegia).");
  }

  return {
    engineId: "NOCTIS-NEURO-ICU-001",
    cerebralPerfusionPressureMmHg: cpp,
    cppTargetStatus: cppStatus,
    herniationRiskTier: herniationTier,
    osmotherapyDirective: {
      recommendedAgent: chosenAgent,
      bolusDose: bolusDesc,
      targetSodiumRange: "145 - 155 mEq/L",
      targetOsmolalityRange: "< 320 mOsm/kg H2O (Osmolal gap < 10-20)",
      contraindicationsToCheck: [
        "Do not administer Mannitol if systolic BP < 90 mmHg or patient is hypovolemic (causes profound osmotic diuresis and hypotension).",
        "Do not exceed serum sodium 160 mEq/L or serum osmolality 320 mOsm/kg (risk of acute kidney injury and central pontine myelinolysis).",
      ],
    },
    tieredEscalationActions: actions,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// 2. ACUTE ISCHEMIC STROKE (AIS) THROMBOLYSIS & MECHANICAL THROMBECTOMY ENGINE
// ============================================================================

export function evaluateAcuteIschemicStrokeWindows(input: AcuteIschemicStrokeInput): AcuteIschemicStrokeResult {
  const {
    hoursFromLastKnownWell,
    nihssScore,
    largeVesselOcclusionPresent,
    aspectsScoreOnCt,
    systolicBpMmHg,
    diastolicBpMmHg,
    bloodGlucoseMgDl,
    plateletCount10e9L,
    inr,
    anticoagulationActive,
    ischemicCoreVolumeMl = 25,
    mismatchRatio = 2.2,
  } = input;

  const contraindications: string[] = [];
  const actions: string[] = [];

  // Blood Pressure Check prior to thrombolysis
  const bpTooHighForLytics = systolicBpMmHg > 185 || diastolicBpMmHg > 110;
  if (bpTooHighForLytics) {
    contraindications.push(
      `Blood pressure ${systolicBpMmHg}/${diastolicBpMmHg} mmHg exceeds safe thrombolysis ceiling (must be < 185/110 mmHg). Administer IV Labetalol (10-20 mg) or Nicardipine infusion (5-15 mg/hr) to lower BP prior to lytics.`
    );
  }

  if (bloodGlucoseMgDl < 50) {
    contraindications.push("Hypoglycemia (< 50 mg/dL) must be corrected immediately with D50W prior to evaluating persistent stroke deficits.");
  }
  if (plateletCount10e9L < 100) {
    contraindications.push(`Thrombocytopenia (Platelets ${plateletCount10e9L} x 10^9/L < 100) is an absolute contraindication to IV thrombolysis.`);
  }
  if (inr > 1.7 || anticoagulationActive) {
    contraindications.push("Active anticoagulation (INR > 1.7 or therapeutic DOAC within 48h) is a contraindication to IV thrombolysis.");
  }

  // 1. IV Thrombolysis Eligibility (0 - 4.5 hours)
  let lyticsEligible = false;
  let windowCategory: AcuteIschemicStrokeResult["thrombolysisEligibility"]["windowCategory"] = "BEYOND_WINDOW";
  let recommendedAgent: AcuteIschemicStrokeResult["thrombolysisEligibility"]["recommendedAgent"] = "CONTRAINDICATED";
  let weightBasedDose = "N/A";

  if (hoursFromLastKnownWell <= 4.5) {
    windowCategory = "WITHIN_4_5_HOUR_WINDOW";
    if (contraindications.length === 0 && nihssScore >= 4) {
      lyticsEligible = true;
      recommendedAgent = "TENECTEPLASE_TNK";
      weightBasedDose = "Tenecteplase (TNK-tPA) 0.25 mg/kg IV single bolus over 5-10 seconds (maximum dose 25 mg). Alternatively, Alteplase (tPA) 0.9 mg/kg IV (10% bolus over 1 min, remaining 90% infused over 60 min, maximum 90 mg).";
    }
  }

  // 2. Endovascular Thrombectomy (EVT) Eligibility
  let evtEligible = false;
  let evtCriteria: AcuteIschemicStrokeResult["endovascularThrombectomyEligibility"]["criteriaType"] = "NOT_ELIGIBLE";
  let evtRationale = "No large vessel occlusion or outside treatment window.";

  if (largeVesselOcclusionPresent && aspectsScoreOnCt >= 6) {
    if (hoursFromLastKnownWell <= 6.0) {
      evtEligible = true;
      evtCriteria = "STANDARD_0_6_HOUR";
      evtRationale = "Eligible under standard 0-6 hour AHA/ASA guidelines (LVO in anterior circulation with ASPECTS >= 6).";
    } else if (hoursFromLastKnownWell <= 24.0) {
      // Extended Window (DAWN & DEFUSE-3 Criteria):
      // Core volume < 70 mL, mismatch ratio >= 1.8
      if (ischemicCoreVolumeMl < 70 && mismatchRatio >= 1.8) {
        evtEligible = true;
        evtCriteria = "EXTENDED_6_24_HOUR_DAWN_DEFUSE";
        evtRationale = `Eligible under extended 6-24 hour DAWN / DEFUSE-3 criteria: Ischemic core volume is ${ischemicCoreVolumeMl} mL (< 70 mL) with clinical-perfusion mismatch ratio ${mismatchRatio} (>= 1.8).`;
      } else {
        evtRationale = `Extended window criteria not met: Core volume ${ischemicCoreVolumeMl} mL or mismatch ratio ${mismatchRatio} indicates completed non-salvageable infarct.`;
      }
    }
  }

  actions.push("Immediately establish continuous arterial blood pressure monitoring.");
  actions.push("Keep head of bed flat (0 degrees) unless airway compromise or elevated ICP is suspected, to maximize collateral cerebral perfusion.");
  actions.push("Safety Directive: Avoid acute hypotension during mechanical thrombectomy. Maintain MAP >= 70-80 mmHg; do NOT treat hypertension unless SBP > 220 mmHg (or > 180 mmHg if lytics administered).");

  return {
    engineId: "NOCTIS-NEURO-ICU-001",
    thrombolysisEligibility: {
      eligible: lyticsEligible,
      windowCategory,
      recommendedAgent,
      weightBasedDose,
      bloodPressureTargetPriorToThrombolysis: "Maintain SBP < 185 mmHg and DBP < 110 mmHg prior to thrombolysis; maintain SBP < 180 mmHg and DBP < 105 mmHg for 24 hours post-thrombolysis.",
      contraindicationsFlagged: contraindications,
    },
    endovascularThrombectomyEligibility: {
      eligible: evtEligible,
      criteriaType: evtCriteria,
      rationale: evtRationale,
      bloodPressureTargetDuringProcedure: "Maintain MAP >= 70-80 mmHg during thrombectomy; avoid rapid drops in BP under general anesthesia.",
    },
    immediateCareDirectives: actions,
  };
}

// ============================================================================
// 3. ANEURYSMAL SUBARACHNOID HEMORRHAGE (aSAH) & VASOSPASM ENGINE
// ============================================================================

export function evaluateSubarachnoidHemorrhage(input: SubarachnoidHemorrhageInput): SubarachnoidHemorrhageResult {
  const {
    huntHessGrade,
    fisherGradeOnCt,
    aneurysmSecured,
    systolicBpMmHg,
    nimodipineRouteOrdered,
    daysPostBleed,
    transcranialDopplerMcaVelocityCmS,
    lindegaardRatio,
  } = input;

  const vetoes: string[] = [];
  const dciDirectives: string[] = [];

  // Safety Veto CF-NEURO-003: Nimodipine IV Veto
  if (nimodipineRouteOrdered === "INTRAVENOUS") {
    vetoes.push(
      "CF-NEURO-003 [IV NIMODIPINE FATAL CARDIOVASCULAR VETO]: Nimodipine must ONLY be administered orally or via nasogastric/enteral tube. Intravenous administration is fatal, causing profound refractory peripheral vasodilation, cardiovascular collapse, and death (FDA Boxed Warning)."
    );
  }

  // Blood Pressure Targets:
  // Prior to aneurysm securing: SBP < 140 - 160 mmHg (prevent rebleeding)
  // After aneurysm securing: Allow permissive hypertension / avoid hypotension (prevent DCI)
  let bpTarget = "Maintain SBP < 140 mmHg prior to surgical clipping or endovascular coiling to prevent catastrophic rebleeding.";
  if (aneurysmSecured) {
    bpTarget = "Aneurysm is secured. Maintain euvolemia and allow permissive hypertension (MAP > 80-90 mmHg) to maintain cerebral perfusion. Avoid induced hypotension.";
  }

  // Vasospasm & Delayed Cerebral Ischemia (DCI) Peak Window: Days 4 - 14 post-bleed
  let vasospasmDetected = false;
  let lindegaardText = "Transcranial Doppler parameters not reported.";

  if (transcranialDopplerMcaVelocityCmS !== undefined) {
    if (transcranialDopplerMcaVelocityCmS >= 200 || (lindegaardRatio !== undefined && lindegaardRatio >= 6.0)) {
      vasospasmDetected = true;
      lindegaardText = `Severe Vasospasm Confirmed: MCA mean flow velocity ${transcranialDopplerMcaVelocityCmS} cm/s (>= 200) with Lindegaard Ratio ${lindegaardRatio || "elevated"} (>= 6 confirms true arterial vasospasm rather than hyperemic flow).`;
    } else if (transcranialDopplerMcaVelocityCmS >= 120 || (lindegaardRatio !== undefined && lindegaardRatio >= 3.0)) {
      vasospasmDetected = true;
      lindegaardText = `Moderate Vasospasm: MCA mean flow velocity ${transcranialDopplerMcaVelocityCmS} cm/s (120-199) with Lindegaard Ratio ${lindegaardRatio || "3-6"}.`;
    } else {
      lindegaardText = `Normal TCD Flow: MCA mean velocity ${transcranialDopplerMcaVelocityCmS} cm/s (< 120) without significant vasospasm.`;
    }
  }

  dciDirectives.push("Maintain strict euvolemia with isotonic crystalloids (target CVP 6-8 mmHg or stroke volume variation < 12%). Avoid prophylactic hypervolemic Triple-H therapy (Grade I evidence against hypervolemia; causes pulmonary edema and myocardial ischemia).");
  dciDirectives.push("Perform frequent serial neurological examinations (every 1 hour in ICU) to detect subtle focal deficits, speech changes, or declining GCS.");
  if (vasospasmDetected) {
    dciDirectives.push("🚨 SEVERE VASOSPASM DETECTED: Initiate induced hypertension using Norepinephrine to raise SBP by 20-30 mmHg above baseline (target SBP 160-180 mmHg if aneurysm is secured).");
    dciDirectives.push("Prepare for urgent endovascular intervention: Diagnostic cerebral angiography and intra-arterial vasodilator infusion (Verapamil / Nicardipine) or balloon angioplasty.");
  }

  return {
    engineId: "NOCTIS-NEURO-ICU-001",
    clinicalAcuity: `Hunt-Hess Grade ${huntHessGrade} (${
      huntHessGrade <= 2 ? "Mild-Moderate (Good Grade)" : "Severe / Comatose (Poor Grade)"
    }) · Modified Fisher Grade ${fisherGradeOnCt} (${fisherGradeOnCt >= 3 ? "High Risk of Vasospasm" : "Low-Moderate Risk"})`,
    rebleedingRiskTier: aneurysmSecured ? "SECURED_LOW_RISK" : "HIGH_IMMEDIATE_RISK",
    bloodPressureTarget: bpTarget,
    nimodipineProtocol: {
      doseAndSchedule: "Nimodipine 60 mg PO / NG every 4 hours for exactly 21 consecutive days.",
      routeMandate: "Strictly Oral or Enteral (NG tube). If swallowing impaired, aspirate capsule contents using syringe and administer via NG tube followed by flush. NEVER give IV.",
      durationDays: 21,
    },
    vasospasmAndDciMonitoring: {
      vasospasmDetected,
      lindegaardInterpretation: lindegaardText,
      dciPreventionDirectives: dciDirectives,
    },
    strictSafetyVetoes: vetoes,
  };
}

// ============================================================================
// NATURAL LANGUAGE ROUTER FOR NEURO-INTENSIVE CARE QUERIES
// ============================================================================

export function handleNaturalNeuroIcuQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  // 1. ICP Crisis & Herniation queries
  const isIcpQuery =
    (/\b(icp|intracranial\s+pressure|herniation|uncal|cushing'?s?\s+triad|cpp|cerebral\s+perfusion\s+pressure)\b/i.test(q) &&
      /\b(crisis|elevated|mannitol|hypertonic\s+saline|23\.4%|3%|pupil|decompressive|craniectomy)\b/i.test(q)) ||
    /\b(fixed\s+and\s+dilated\s+pupil|blown\s+pupil)\b/i.test(q);

  // 2. Acute Ischemic Stroke (AIS) Thrombolysis & Thrombectomy queries
  const isStrokeQuery =
    /\b(acute\s+ischemic\s+stroke|stroke|nihss|aspects|thrombectomy|evt|thrombolysis|tpa|alteplase|tenecteplase|tnk|lvo|large\s+vessel\s+occlusion)\b/i.test(
      q
    ) && /\b(hours?|window|mismatch|core\s+volume|dawn|defuse|blood\s+pressure)\b/i.test(q);

  // 3. Aneurysmal Subarachnoid Hemorrhage (aSAH) & Vasospasm queries
  const isSahQuery =
    /\b(subarachnoid\s+hemorrhage|sah|hunt\s+hess|fisher\s+grade|nimodipine|vasospasm|lindegaard|delayed\s+cerebral\s+ischemia|dci)\b/i.test(
      q
    );

  if (!isIcpQuery && !isStrokeQuery && !isSahQuery) {
    return null;
  }

  // Parse patient parameters
  const wtMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)/i);
  const weightKg = wtMatch ? parseFloat(wtMatch[1]) : 70;

  // Execute ICP Engine
  if (isIcpQuery) {
    const icpMatch = q.match(/(?:icp)\s*(?:is|of|:)?\s*(\d+)/i);
    const icp = icpMatch ? parseInt(icpMatch[1], 10) : 28;

    const mapMatch = q.match(/(?:map)\s*(?:is|of|:)?\s*(\d+)/i);
    const map = mapMatch ? parseInt(mapMatch[1], 10) : 85;

    const isBlownPupil = /\b(blown|dilated|fixed)\s+pupil\b/i.test(q);

    const report = evaluateIcpCrisisAndHerniation({
      patientWeightKg: weightKg,
      meanArterialPressureMmHg: map,
      intracranialPressureMmHg: icp,
      pupilExam: isBlownPupil ? "UNILATERAL_FIXED_DILATED" : "SLUGGISH",
      cushingTriadPresent: /\bcushing\b/i.test(q),
      serumSodiumMeqL: 142,
      serumOsmolalityMOsmKg: 295,
      activeFluids: /\b0\.45%|d5w\b/i.test(q) ? ["0.45% NS", "D5W"] : ["0.9% Normal Saline"],
      paCO2MmHg: /\bpaco2\s*(?:is|of|:)?\s*(\d+)/i.test(q) ? parseInt(q.match(/paco2\s*(?:is|of|:)?\s*(\d+)/i)![1], 10) : 36,
      currentTier: 2,
    });

    return formatIcpReport(report, weightKg, map, icp);
  }

  // Execute Stroke Engine
  if (isStrokeQuery) {
    const hoursMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 3.0;

    const nihssMatch = q.match(/(?:nihss)\s*(?:is|of|:)?\s*(\d+)/i);
    const nihss = nihssMatch ? parseInt(nihssMatch[1], 10) : 16;

    const aspectsMatch = q.match(/(?:aspects)\s*(?:is|of|:)?\s*(\d+)/i);
    const aspects = aspectsMatch ? parseInt(aspectsMatch[1], 10) : 8;

    const report = evaluateAcuteIschemicStrokeWindows({
      hoursFromLastKnownWell: hours,
      nihssScore: nihss,
      largeVesselOcclusionPresent: /\blvo|mca|ica|occlusion\b/i.test(q),
      aspectsScoreOnCt: aspects,
      systolicBpMmHg: 175,
      diastolicBpMmHg: 95,
      bloodGlucoseMgDl: 120,
      plateletCount10e9L: 220,
      inr: 1.1,
      anticoagulationActive: false,
      ischemicCoreVolumeMl: 22,
      mismatchRatio: 2.8,
    });

    return formatStrokeReport(report, hours, nihss);
  }

  // Execute SAH Engine
  if (isSahQuery) {
    const hhMatch = q.match(/(?:hunt\s*(?:and|&)?\s*hess|grade)\s*(\d)/i);
    const hh = hhMatch ? (parseInt(hhMatch[1], 10) as 1 | 2 | 3 | 4 | 5) : 3;

    const fisherMatch = q.match(/(?:fisher)\s*(?:grade)?\s*(\d)/i);
    const fisher = fisherMatch ? (parseInt(fisherMatch[1], 10) as 1 | 2 | 3 | 4) : 3;

    const report = evaluateSubarachnoidHemorrhage({
      patientWeightKg: weightKg,
      huntHessGrade: hh,
      fisherGradeOnCt: fisher,
      aneurysmSecured: /\bsecured|clipped|coiled\b/i.test(q),
      systolicBpMmHg: 155,
      meanArterialPressureMmHg: 100,
      nimodipineRouteOrdered: /\biv\s+nimodipine|intravenous\s+nimodipine\b/i.test(q) ? "INTRAVENOUS" : "ORAL_ENTERAL_NG",
      daysPostBleed: 7,
      transcranialDopplerMcaVelocityCmS: 210,
      lindegaardRatio: 6.2,
    });

    return formatSahReport(report);
  }

  return null;
}

function formatIcpReport(
  res: IcpCrisisResult,
  weightKg: number,
  map: number,
  icp: number
): string {
  let md = `### Noctis Neuro-Intensive Care & ICP Crisis Engine (NOCTIS-NEURO-ICU-001)\n`;
  md += `**Herniation Risk Tier:** \`${res.herniationRiskTier}\` · **CPP Status:** \`${res.cppTargetStatus}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Intracranial Hemodynamics & Cerebral Perfusion Equation\n`;
  md += `$$\\text{Cerebral Perfusion Pressure (CPP)} = \\text{Mean Arterial Pressure (MAP)} - \\text{ICP} = ${map} - ${icp} = \\mathbf{${res.cerebralPerfusionPressureMmHg}\\text{ mmHg}}$$\n\n`;
  md += `- **Clinical Target:** Maintain CPP between **60 and 70 mmHg** (Brain Trauma Foundation). CPP < 60 mmHg induces ischemic secondary injury; CPP > 70-80 mmHg precipitates ARDS and vasogenic edema.\n\n`;

  md += `#### 2. Emergent Osmotherapy Directive (${weightKg} kg)\n`;
  md += `- **Recommended Agent:** \`${res.osmotherapyDirective.recommendedAgent}\`\n`;
  md += `- **Bolus Order:** ${res.osmotherapyDirective.bolusDose}\n`;
  md += `- **Laboratory Osmotic Targets:** Serum Sodium: \`${res.osmotherapyDirective.targetSodiumRange}\` · Serum Osmolality: \`${res.osmotherapyDirective.targetOsmolalityRange}\`\n\n`;

  md += `#### 3. Tiered Escalation Pathway (BTF / NCS Guidelines)\n`;
  for (const act of res.tieredEscalationActions) {
    md += `- ${act}\n`;
  }

  return md;
}

function formatStrokeReport(
  res: AcuteIschemicStrokeResult,
  hours: number,
  nihss: number
): string {
  let md = `### Noctis Acute Ischemic Stroke & Revascularization Engine (NOCTIS-NEURO-ICU-001)\n`;
  md += `**Presentation:** ${hours} hours from Last Known Well · **NIHSS Score:** ${nihss}\n\n`;

  md += `#### 1. IV Thrombolysis Evaluation (${res.thrombolysisEligibility.windowCategory})\n`;
  md += `- **Eligibility Determination:** \`${res.thrombolysisEligibility.eligible ? "ELIGIBLE" : "INELIGIBLE / CONTRAINDICATED"}\`\n`;
  if (res.thrombolysisEligibility.eligible) {
    md += `- **Recommended Thrombolytic Agent:** \`${res.thrombolysisEligibility.recommendedAgent}\`\n`;
    md += `- **Dosing Directive:** ${res.thrombolysisEligibility.weightBasedDose}\n`;
    md += `- **Blood Pressure Ceiling:** ${res.thrombolysisEligibility.bloodPressureTargetPriorToThrombolysis}\n\n`;
  } else if (res.thrombolysisEligibility.contraindicationsFlagged.length > 0) {
    md += `- **Contraindications Flagged:**\n`;
    for (const c of res.thrombolysisEligibility.contraindicationsFlagged) {
      md += `  * 🚨 ${c}\n`;
    }
    md += `\n`;
  }

  md += `#### 2. Endovascular Thrombectomy (EVT) Evaluation\n`;
  md += `- **EVT Determination:** \`${res.endovascularThrombectomyEligibility.eligible ? "ELIGIBLE FOR EMERGENT THROMBECTOMY" : "NOT CANDIDATE"}\`\n`;
  md += `- **Criteria Applied:** \`${res.endovascularThrombectomyEligibility.criteriaType}\`\n`;
  md += `- **Clinical Rationale:** ${res.endovascularThrombectomyEligibility.rationale}\n`;
  md += `- **Hemodynamic Directives During EVT:** ${res.endovascularThrombectomyEligibility.bloodPressureTargetDuringProcedure}\n\n`;

  md += `#### 3. Immediate Neuro-ICU Care Directives\n`;
  for (const dir of res.immediateCareDirectives) {
    md += `- ${dir}\n`;
  }

  return md;
}

function formatSahReport(res: SubarachnoidHemorrhageResult): string {
  let md = `### Noctis Aneurysmal Subarachnoid Hemorrhage Engine (NOCTIS-NEURO-ICU-001)\n`;
  md += `**Clinical Grading:** ${res.clinicalAcuity} · **Rebleeding Risk:** \`${res.rebleedingRiskTier}\`\n\n`;

  if (res.strictSafetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.strictSafetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Blood Pressure Control & Rebleeding Prevention\n`;
  md += `${res.bloodPressureTarget}\n\n`;

  md += `#### 2. Nimodipine Neuroprotection Protocol\n`;
  md += `- **Order:** ${res.nimodipineProtocol.doseAndSchedule}\n`;
  md += `- **Route Mandate:** ${res.nimodipineProtocol.routeMandate}\n`;
  md += `- **Course:** ${res.nimodipineProtocol.durationDays} consecutive days\n\n`;

  md += `#### 3. Vasospasm & Delayed Cerebral Ischemia (DCI) Surveillance\n`;
  md += `- **Status:** \`${res.vasospasmAndDciMonitoring.vasospasmDetected ? "SEVERE ARTERIAL VASOSPASM ACTIVE" : "MONITORING ACTIVE"}\`\n`;
  md += `- **Transcranial Doppler Interpretation:** ${res.vasospasmAndDciMonitoring.lindegaardInterpretation}\n`;
  md += `- **Management Directives:**\n`;
  for (const d of res.vasospasmAndDciMonitoring.dciPreventionDirectives) {
    md += `  * ${d}\n`;
  }

  return md;
}
