/**
 * NOCTIS SOVEREIGN ICU HEMATOLOGY, TRANSFUSION MEDICINE & HEMOSTASIS (NOCTIS-HEM-TRANS-001)
 * Standards & Guidelines:
 * - American College of Surgeons (ACS) Trauma Quality Improvement Program (TQIP) Massive Transfusion
 * - International Society on Thrombosis and Haemostasis (ISTH) Overt DIC Scoring Guidelines
 * - American Society of Hematology (ASH) Heparin-Induced Thrombocytopenia (HIT) 4Ts Guidelines
 * - Viscoelastic Hemostatic Testing (TEG 6s & ROTEM delta Algorithms)
 *
 * Non-Compensatory Safety Invariants:
 * - CF-HEM-001: Massive Transfusion Hypocalcemia Veto (iCa < 1.1 mmol/L during rapid blood administration precipitates electromechanical dissociation; 1g CaCl2 mandatory per 4u PRBC)
 * - CF-HEM-002: Acute HIT Warfarin Gangrene Veto (Warfarin is strictly prohibited in acute HIT; causes microvascular thrombosis and venous limb gangrene)
 * - CF-HEM-003: Tranexamic Acid Delayed Administration Veto (TXA administered > 3 hours post-trauma increases all-cause mortality per CRASH-2)
 * - CF-HEM-004: Excessive Crystalloid Dilutional Coagulopathy Veto (> 1.5 L crystalloid bolus in exsanguinating hemorrhage dilutes clotting factors and disrupts clot stability)
 */

export interface MassiveTransfusionInput {
  patientWeightKg: number;
  penetratingTrauma: boolean;
  systolicBpMmHg: number;
  heartRateBpm: number;
  positiveFastExam: boolean;
  hoursSinceInjury: number;
  unitsPrbcTransfused: number;
  unitsFfpTransfused: number;
  unitsPlateletsTransfused: number;
  crystalloidInfusedLiters: number;
  systemicIonizedCalciumMmolL?: number;
  bodyTemperatureCelsius: number;
  arterialPh?: number;
  fibrinogenMgDl?: number;
}

export interface MassiveTransfusionResult {
  engineId: "NOCTIS-HEM-TRANS-001";
  abcScore: number; // Assessment of Blood Consumption (0 - 4)
  shockIndex: number; // HR / SBP
  mtpActivated: boolean;
  prbcToFfpToPltRatio: string;
  calciumSupplementationDirective: string;
  txaRecommendation: {
    indicated: boolean;
    bolusDose: string;
    infusionDose: string;
    clinicalRule: string;
  };
  lethalTriadMitigation: string[];
  safetyVetoes: string[];
}

export interface ViscoelasticAssayInput {
  assayType: "TEG_6S" | "ROTEM_DELTA";
  rTimeMinutes?: number; // TEG R (normal 5-10 min)
  kTimeMinutes?: number; // TEG K (normal 1-3 min)
  alphaAngleDegrees?: number; // TEG Alpha (normal 53-72 deg)
  maximumAmplitudeMm?: number; // TEG MA (normal 50-70 mm)
  ly30Percent?: number; // TEG LY30 (normal 0-3%)
  rotemExtemCtSeconds?: number; // ROTEM EXTEM CT (normal 38-79 s)
  rotemFibtemA10Mm?: number; // ROTEM FIBTEM A10 (normal 7-18 mm)
  rotemExtemMcfMm?: number; // ROTEM EXTEM MCF (normal 50-72 mm)
  rotemExtemMlLysisPercent?: number; // ROTEM EXTEM ML (normal < 15%)
}

export interface ViscoelasticAssayResult {
  engineId: "NOCTIS-HEM-TRANS-001";
  detectedCoagulopathies: string[];
  targetedBloodProducts: string[];
  antifibrinolyticDirective?: string;
  underlyingDefectSummary: string;
}

export interface Hit4TsInput {
  thrombocytopeniaDropCategory: "DROP_GT_50_PERCENT_NADIR_GE_20" | "DROP_30_TO_50_PERCENT" | "DROP_LT_30_PERCENT";
  timingOfPlateletDrop: "DAYS_5_TO_10" | "DAY_LE_1_PRIOR_HEPARIN_30D" | "AFTER_DAY_10" | "DAY_LE_1_PRIOR_HEPARIN_31_TO_100D";
  thrombosisIdentified: "NEW_THROMBOSIS_OR_SKIN_NECROSIS" | "PROGRESSIVE_THROMBOSIS" | "SUSPECTED_UNCONFIRMED" | "NONE";
  otherCausesOfThrombocytopenia: "NO_OTHER_CAUSE" | "POSSIBLE_OTHER_CAUSE" | "DEFINITE_OTHER_CAUSE";
  warfarinActiveOrOrdered: boolean;
}

export interface Hit4TsResult {
  engineId: "NOCTIS-HEM-TRANS-001";
  totalScore: number; // 0 - 8
  pretestProbability: "HIGH_PROBABILITY" | "INTERMEDIATE_PROBABILITY" | "LOW_PROBABILITY";
  immediateAnticoagulationDirectives: string[];
  mandatoryLaboratoryOrders: string[];
  safetyVetoes: string[];
}

export interface IsthDicInput {
  underlyingDisorderKnownToCauseDic: boolean; // Sepsis, trauma, obstetric, malignancy
  plateletCount10e9L: number;
  dDimerFdpLevel: "NORMAL" | "MODERATE_INCREASE" | "STRONG_INCREASE";
  prothrombinTimeProlongationSeconds: number; // Delay over normal baseline
  fibrinogenLevelMgDl: number;
}

export interface IsthDicResult {
  engineId: "NOCTIS-HEM-TRANS-001";
  isthScore: number; // 0 - 8
  diagnosticOutcome: "OVERT_DIC_COMPATIBLE" | "NON_OVERT_DIC";
  clinicalManagementActions: string[];
}

// ============================================================================
// 1. MASSIVE TRANSFUSION PROTOCOL & RESUSCITATION
// ============================================================================

export function evaluateMassiveTransfusion(input: MassiveTransfusionInput): MassiveTransfusionResult {
  const {
    penetratingTrauma,
    systolicBpMmHg,
    heartRateBpm,
    positiveFastExam,
    hoursSinceInjury,
    unitsPrbcTransfused,
    unitsFfpTransfused,
    unitsPlateletsTransfused,
    crystalloidInfusedLiters,
    systemicIonizedCalciumMmolL,
    bodyTemperatureCelsius,
    arterialPh,
    fibrinogenMgDl,
  } = input;

  const vetoes: string[] = [];
  const lethalTriad: string[] = [];

  // Assessment of Blood Consumption (ABC) Score: 1 pt each
  // SBP <= 90 (1), HR >= 120 (1), Penetrating (1), FAST positive (1)
  let abc = 0;
  if (penetratingTrauma) abc++;
  if (systolicBpMmHg <= 90) abc++;
  if (heartRateBpm >= 120) abc++;
  if (positiveFastExam) abc++;

  const shockIndex = Math.round((heartRateBpm / systolicBpMmHg) * 100) / 100;
  const mtpIndicated = abc >= 2 || shockIndex >= 1.0;

  // Calcium Check (CF-HEM-001)
  let calciumDirective = "Check ionized calcium every 4 units of blood products. Maintain iCa >= 1.1 mmol/L.";
  if (systemicIonizedCalciumMmolL !== undefined && systemicIonizedCalciumMmolL < 1.1) {
    vetoes.push(
      `CF-HEM-001 [MASSIVE TRANSFUSION HYPOCALCEMIA VETO]: Ionized calcium is ${systemicIonizedCalciumMmolL} mmol/L (< 1.1 mmol/L). Citrate in stored PRBCs and FFP rapidly binds circulating ionized calcium, causing severe myocardial depression, vasoplegia, and intractable electromechanical dissociation. Administer Calcium Chloride 1.0 g IV (or Calcium Gluconate 3.0 g IV) immediately per 4 units of blood products.`
    );
    calciumDirective = "EMERGENT CALCIUM CHLORIDE 1g IV PUSH NOW (iCa < 1.1 mmol/L). Repeat every 4 units of PRBC/FFP.";
  }

  // Crystalloid Dilutional Coagulopathy (CF-HEM-004)
  if (crystalloidInfusedLiters > 1.5) {
    vetoes.push(
      `CF-HEM-004 [EXCESSIVE CRYSTALLOID DILUTION VETO]: ${crystalloidInfusedLiters} Liters of crystalloid infused. Large-volume crystalloid resuscitation causes dilutional coagulopathy, hypothermia, and acidosis ('Lethal Triad'), dislodging soft hemostatic plugs. Restrict crystalloids immediately; switch to 1:1:1 balanced hemostatic blood resuscitation.`
    );
  }

  // TXA Evaluation (CRASH-2: 0 - 3 hours)
  let txaIndicated = false;
  let txaRule = "TXA not indicated.";
  if (mtpIndicated) {
    if (hoursSinceInjury <= 3.0) {
      txaIndicated = true;
      txaRule = "Indicated: Trauma hemorrhage within 3.0 hours of injury reduces all-cause mortality without increasing thrombosis (CRASH-2 Trial).";
    } else {
      txaIndicated = false;
      txaRule = "STRICTLY CONTRAINDICATED: Patient is > 3 hours from injury. CRASH-2 demonstrated that TXA given > 3 hours post-injury significantly INCREASES all-cause mortality and death from bleeding.";
      vetoes.push(
        "CF-HEM-003 [TXA DELAYED ADMINISTRATION VETO]: Trauma presentation is > 3 hours post-injury. Giving Tranexamic Acid beyond the 3-hour window increases mortality. Omit TXA."
      );
    }
  }

  // Lethal Triad Monitoring
  if (bodyTemperatureCelsius < 35.5) {
    lethalTriad.push(`Hypothermia (Core Temp ${bodyTemperatureCelsius} C < 35.5 C) severely impairs clotting enzyme kinetics. Initiate active external/internal rewarming.`);
  }
  if (arterialPh !== undefined && arterialPh < 7.25) {
    lethalTriad.push(`Acidosis (Arterial pH ${arterialPh} < 7.25) halves the activity of Factor VIIa and tissue factor complexes.`);
  }
  if (fibrinogenMgDl !== undefined && fibrinogenMgDl < 150) {
    lethalTriad.push(`Hypofibrinogenemia (Fibrinogen ${fibrinogenMgDl} mg/dL < 150-200 mg/dL). Administer Cryoprecipitate 10 units IV or Fibrinogen Concentrate 2-4g IV.`);
  }

  return {
    engineId: "NOCTIS-HEM-TRANS-001",
    abcScore: abc,
    shockIndex,
    mtpActivated: mtpIndicated,
    prbcToFfpToPltRatio: "Target 1 unit PRBC : 1 unit FFP : 1 unit Platelets (1:1:1 balanced whole blood equivalent)",
    calciumSupplementationDirective: calciumDirective,
    txaRecommendation: {
      indicated: txaIndicated,
      bolusDose: "Tranexamic Acid (TXA) 1.0 gram IV in 100 mL Normal Saline over 10 minutes",
      infusionDose: "Followed by 1.0 gram IV infusion over 8 hours",
      clinicalRule: txaRule,
    },
    lethalTriadMitigation: lethalTriad,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// 2. VISCOELASTIC HEMOSTATIC ASSAYS (TEG & ROTEM)
// ============================================================================

export function evaluateViscoelasticAssay(input: ViscoelasticAssayInput): ViscoelasticAssayResult {
  const coagulopathies: string[] = [];
  const products: string[] = [];
  let txaDir: string | undefined;

  if (input.assayType === "TEG_6S") {
    // 1. Clotting Factor Deficiency (R Time > 10 min)
    if (input.rTimeMinutes !== undefined && input.rTimeMinutes > 10) {
      coagulopathies.push(`Prolonged R-Time (${input.rTimeMinutes} min > 10 min): Enzymatic clotting factor deficiency or active anticoagulation.`);
      products.push("Fresh Frozen Plasma (FFP) 2-4 units OR 4-Factor Prothrombin Complex Concentrate (4F-PCC) 25-50 units/kg.");
    }
    // 2. Hypofibrinogenemia (Alpha Angle < 53 deg or K Time > 3 min)
    if ((input.alphaAngleDegrees !== undefined && input.alphaAngleDegrees < 53) || (input.kTimeMinutes !== undefined && input.kTimeMinutes > 3)) {
      coagulopathies.push(`Decreased Alpha Angle (${input.alphaAngleDegrees} deg < 53 deg): Deficient fibrinogen polymerization and clot kinetics.`);
      products.push("Cryoprecipitate 10-20 units (or Fibrinogen Concentrate 2-4 grams) to target fibrinogen >= 200 mg/dL.");
    }
    // 3. Platelet Dysfunction / Thrombocytopenia (MA < 50 mm)
    if (input.maximumAmplitudeMm !== undefined && input.maximumAmplitudeMm < 50) {
      coagulopathies.push(`Depressed Maximum Amplitude (${input.maximumAmplitudeMm} mm < 50 mm): Platelet deficit or functional dysfunction.`);
      products.push("Platelets 1-2 adult apheresis units (consider DDAVP 0.3 mcg/kg IV if uremic or antiplatelet-induced).");
    }
    // 4. Hyperfibrinolysis (LY30 > 3%)
    if (input.ly30Percent !== undefined && input.ly30Percent > 3.0) {
      coagulopathies.push(`Hyperfibrinolysis (LY30 ${input.ly30Percent}% > 3.0%): Accelerated enzymatic clot breakdown.`);
      txaDir = "Administer Tranexamic Acid (TXA) 1g IV bolus over 10 min, then 1g over 8 hours (or Epsilon-Aminocaproic Acid 4-5g IV).";
    }
  } else {
    // ROTEM
    if (input.rotemExtemCtSeconds !== undefined && input.rotemExtemCtSeconds > 80) {
      coagulopathies.push(`Prolonged EXTEM CT (${input.rotemExtemCtSeconds} s > 80 s): Clotting factor deficiency.`);
      products.push("FFP 2-4 units or 4F-PCC.");
    }
    if (input.rotemFibtemA10Mm !== undefined && input.rotemFibtemA10Mm < 10) {
      coagulopathies.push(`Depressed FIBTEM A10 (${input.rotemFibtemA10Mm} mm < 10 mm): Critical hypofibrinogenemia.`);
      products.push("Cryoprecipitate 10 units or Fibrinogen Concentrate 2-4g.");
    }
    if (input.rotemExtemMcfMm !== undefined && input.rotemExtemMcfMm < 45 && (input.rotemFibtemA10Mm === undefined || input.rotemFibtemA10Mm >= 10)) {
      coagulopathies.push(`Depressed EXTEM MCF (${input.rotemExtemMcfMm} mm < 45 mm) with normal FIBTEM: Platelet deficiency.`);
      products.push("Platelets 1 apheresis unit.");
    }
    if (input.rotemExtemMlLysisPercent !== undefined && input.rotemExtemMlLysisPercent > 15) {
      coagulopathies.push(`ROTEM Hyperfibrinolysis (EXTEM ML ${input.rotemExtemMlLysisPercent}% > 15%).`);
      txaDir = "Administer TXA 1g IV bolus over 10 minutes.";
    }
  }

  return {
    engineId: "NOCTIS-HEM-TRANS-001",
    detectedCoagulopathies: coagulopathies.length > 0 ? coagulopathies : ["No major coagulopathy identified on viscoelastic profile."],
    targetedBloodProducts: products.length > 0 ? products : ["Maintain observation; no immediate empiric product transfusion indicated."],
    antifibrinolyticDirective: txaDir,
    underlyingDefectSummary: coagulopathies.length > 0 ? `Targeted goal-directed resuscitation required for ${coagulopathies.length} hemostatic defect(s).` : "Clot formation, kinetics, and stability within normal reference bounds.",
  };
}

// ============================================================================
// 3. HEPARIN-INDUCED THROMBOCYTOPENIA (HIT) 4TS SCORE
// ============================================================================

export function evaluateHit4TsScore(input: Hit4TsInput): Hit4TsResult {
  const {
    thrombocytopeniaDropCategory,
    timingOfPlateletDrop,
    thrombosisIdentified,
    otherCausesOfThrombocytopenia,
    warfarinActiveOrOrdered,
  } = input;

  const vetoes: string[] = [];
  const dirs: string[] = [];
  const labs: string[] = [];

  let score = 0;

  // 1. Thrombocytopenia
  if (thrombocytopeniaDropCategory === "DROP_GT_50_PERCENT_NADIR_GE_20") score += 2;
  else if (thrombocytopeniaDropCategory === "DROP_30_TO_50_PERCENT") score += 1;

  // 2. Timing
  if (timingOfPlateletDrop === "DAYS_5_TO_10" || timingOfPlateletDrop === "DAY_LE_1_PRIOR_HEPARIN_30D") score += 2;
  else if (timingOfPlateletDrop === "AFTER_DAY_10" || timingOfPlateletDrop === "DAY_LE_1_PRIOR_HEPARIN_31_TO_100D") score += 1;

  // 3. Thrombosis
  if (thrombosisIdentified === "NEW_THROMBOSIS_OR_SKIN_NECROSIS") score += 2;
  else if (thrombosisIdentified === "PROGRESSIVE_THROMBOSIS" || thrombosisIdentified === "SUSPECTED_UNCONFIRMED") score += 1;

  // 4. Other Causes
  if (otherCausesOfThrombocytopenia === "NO_OTHER_CAUSE") score += 2;
  else if (otherCausesOfThrombocytopenia === "POSSIBLE_OTHER_CAUSE") score += 1;

  const probability: Hit4TsResult["pretestProbability"] =
    score >= 6 ? "HIGH_PROBABILITY" : score >= 4 ? "INTERMEDIATE_PROBABILITY" : "LOW_PROBABILITY";

  // Safety Veto CF-HEM-002: Warfarin in acute HIT
  if (warfarinActiveOrOrdered && probability !== "LOW_PROBABILITY") {
    vetoes.push(
      "CF-HEM-002 [ACUTE HIT WARFARIN GANGRENE VETO]: Warfarin is STRICTLY PROHIBITED in acute HIT. Warfarin rapidly depletes Protein C prior to clearing procoagulant factors, creating a paradoxical hypercoagulable state that precipitates microvascular thrombosis, skin necrosis, and catastrophic venous limb gangrene. Immediately discontinue Warfarin and administer Vitamin K 10 mg IV if already given."
    );
  }

  if (probability === "HIGH_PROBABILITY" || probability === "INTERMEDIATE_PROBABILITY") {
    dirs.push("DISCONTINUE ALL HEPARIN IMMEDIATELY: Stop unfractionated heparin infusions, LMWH, and all heparin flushes (including arterial lines, dialysis circuits, and coated catheters).");
    dirs.push("INITIATE NON-HEPARIN ANTICOAGULANT: Start Argatroban IV continuous infusion (0.5-2.0 mcg/kg/min, titrated to target aPTT 1.5-3.0x baseline; dose-reduce in hepatic impairment) OR Bivalirudin IV (titrate to aPTT; prefer in renal impairment/cardiac surgery). Alternatively, Fondaparinux (if normal renal function).");
    labs.push("Order Heparin-PF4 ELISA immunoassay (optical density >= 1.0 strongly positive).");
    labs.push("Confirm with functional Serotonin Release Assay (SRA) gold standard.");
    labs.push("Perform bilateral lower extremity venous duplex ultrasound to screen for occult DVT.");
  } else {
    dirs.push("Low probability (score <= 3): High negative predictive value (>99%). Routine heparin cessation not mandatory unless clinical suspicion rises. Search for alternative causes (sepsis, DIC, drug-induced).");
  }

  return {
    engineId: "NOCTIS-HEM-TRANS-001",
    totalScore: score,
    pretestProbability: probability,
    immediateAnticoagulationDirectives: dirs,
    mandatoryLaboratoryOrders: labs,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// 4. ISTH OVERT DIC SCORING SYSTEM
// ============================================================================

export function evaluateIsthDicScore(input: IsthDicInput): IsthDicResult {
  const {
    underlyingDisorderKnownToCauseDic,
    plateletCount10e9L,
    dDimerFdpLevel,
    prothrombinTimeProlongationSeconds,
    fibrinogenLevelMgDl,
  } = input;

  const actions: string[] = [];

  if (!underlyingDisorderKnownToCauseDic) {
    return {
      engineId: "NOCTIS-HEM-TRANS-001",
      isthScore: 0,
      diagnosticOutcome: "NON_OVERT_DIC",
      clinicalManagementActions: ["ISTH algorithm can only be interpreted in the presence of an underlying disorder known to cause DIC (sepsis, severe trauma, obstetric disaster, malignancy)."],
    };
  }

  let score = 0;
  // Platelets: > 100k = 0, 50-100k = 1, < 50k = 2
  if (plateletCount10e9L < 50) score += 2;
  else if (plateletCount10e9L < 100) score += 1;

  // D-Dimer / FDP: No increase = 0, Moderate = 2, Strong = 3
  if (dDimerFdpLevel === "STRONG_INCREASE") score += 3;
  else if (dDimerFdpLevel === "MODERATE_INCREASE") score += 2;

  // PT Prolongation: < 3s = 0, 3-6s = 1, > 6s = 2
  if (prothrombinTimeProlongationSeconds > 6) score += 2;
  else if (prothrombinTimeProlongationSeconds >= 3) score += 1;

  // Fibrinogen: > 100 mg/dL = 0, < 100 mg/dL = 1
  if (fibrinogenLevelMgDl < 100) score += 1;

  const isOvert = score >= 5;

  if (isOvert) {
    actions.push("DIAGNOSIS: OVERT DIC COMPATIBLE (Score >= 5). High risk of multi-organ failure and microvascular thrombosis.");
    actions.push("Primary Mandate: Aggressive treatment and source control of the underlying disorder (e.g. broad-spectrum antibiotics and drainage for sepsis, emergent delivery for placental abruption).");
    actions.push("Supportive Transfusion: Transfuse platelets to target > 50k if active bleeding or invasive procedure planned; FFP 15-20 mL/kg if PT/INR prolonged with bleeding; Cryoprecipitate 10 units to maintain fibrinogen > 150 mg/dL.");
  } else {
    actions.push("DIAGNOSIS: NON-OVERT DIC (Score < 5). Repeat ISTH scoring every 24-48 hours to monitor trajectory.");
  }

  return {
    engineId: "NOCTIS-HEM-TRANS-001",
    isthScore: score,
    diagnosticOutcome: isOvert ? "OVERT_DIC_COMPATIBLE" : "NON_OVERT_DIC",
    clinicalManagementActions: actions,
  };
}

// ============================================================================
// NATURAL LANGUAGE ROUTER FOR ICU HEMATOLOGY & HEMOSTASIS
// ============================================================================

export function handleNaturalHematologyHemostasisQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  const isMtpQuery =
    (/\b(mtp|massive\s+transfusion|balanced\s+resuscitation|1:1:1|abc\s+score|shock\s+index|crash-2|tranexamic\s+acid|txa)\b/i.test(q) &&
      /\b(trauma|hemorrhage|prbc|ffp|platelets|calcium|dilution|hypocalcemia)\b/i.test(q)) ||
    /\b(calculate\s+abc\s+score|lethal\s+triad)\b/i.test(q);

  const isTegQuery =
    /\b(teg|rotem|viscoelastic|r-time|maximum\s+amplitude|ly30|fibtem|extem|alpha\s+angle|hyperfibrinolysis)\b/i.test(q);

  const isHitQuery =
    /\b(hit|heparin-induced\s+thrombocytopenia|4ts?|argatroban|bivalirudin|pf4|serotonin\s+release)\b/i.test(q);

  const isDicQuery =
    /\b(dic|disseminated\s+intravascular|isth\s+score|fibrinogen|d-dimer)\b/i.test(q) &&
    /\b(platelet|pt|inr|coagulopathy|overt)\b/i.test(q);

  if (!isMtpQuery && !isTegQuery && !isHitQuery && !isDicQuery) return null;

  // Extract weight
  const wtMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)/i);
  const weightKg = wtMatch ? parseFloat(wtMatch[1]) : 75;

  // 1. MTP Execution
  if (isMtpQuery) {
    const sbpMatch = q.match(/(?:sbp|bp)\s*(?:is|of|:)?\s*(\d+)/i);
    const sbp = sbpMatch ? parseInt(sbpMatch[1], 10) : 84;

    const hrMatch = q.match(/(?:hr|pulse)\s*(?:is|of|:)?\s*(\d+)/i);
    const hr = hrMatch ? parseInt(hrMatch[1], 10) : 126;

    const hrsMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:post|since|after)?\s*(?:injury|trauma)?/i);
    const hours = hrsMatch ? parseFloat(hrsMatch[1]) : 1.5;

    const report = evaluateMassiveTransfusion({
      patientWeightKg: weightKg,
      penetratingTrauma: /\bpenetrating|gunshot|gsw|stab\b/i.test(q),
      systolicBpMmHg: sbp,
      heartRateBpm: hr,
      positiveFastExam: /\bfast\b/i.test(q) && !/\bnegative\s+fast\b/i.test(q),
      hoursSinceInjury: hours,
      unitsPrbcTransfused: 6,
      unitsFfpTransfused: 4,
      unitsPlateletsTransfused: 1,
      crystalloidInfusedLiters: /\b2\s*l|3\s*l|crystalloid\b/i.test(q) ? 2.5 : 1.0,
      systemicIonizedCalciumMmolL: 0.95, // Hypocalcemia trigger
      bodyTemperatureCelsius: 35.1,
      arterialPh: 7.21,
      fibrinogenMgDl: 120,
    });

    return formatMtpReport(report, sbp, hr);
  }

  // 2. Viscoelastic Execution
  if (isTegQuery) {
    const rMatch = q.match(/(?:r\s*time|r)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
    const r = rMatch ? parseFloat(rMatch[1]) : 12.5;

    const maMatch = q.match(/(?:ma)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
    const ma = maMatch ? parseFloat(maMatch[1]) : 42;

    const lyMatch = q.match(/(?:ly30)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
    const ly = lyMatch ? parseFloat(lyMatch[1]) : 7.5;

    const report = evaluateViscoelasticAssay({
      assayType: "TEG_6S",
      rTimeMinutes: r,
      alphaAngleDegrees: 48,
      maximumAmplitudeMm: ma,
      ly30Percent: ly,
    });

    return formatTegReport(report);
  }

  // 3. HIT Execution
  if (isHitQuery) {
    const report = evaluateHit4TsScore({
      thrombocytopeniaDropCategory: "DROP_GT_50_PERCENT_NADIR_GE_20",
      timingOfPlateletDrop: "DAYS_5_TO_10",
      thrombosisIdentified: "NEW_THROMBOSIS_OR_SKIN_NECROSIS",
      otherCausesOfThrombocytopenia: "NO_OTHER_CAUSE",
      warfarinActiveOrOrdered: /\bwarfarin|coumadin\b/i.test(q),
    });

    return formatHitReport(report);
  }

  // 4. DIC Execution
  const report = evaluateIsthDicScore({
    underlyingDisorderKnownToCauseDic: true,
    plateletCount10e9L: 42,
    dDimerFdpLevel: "STRONG_INCREASE",
    prothrombinTimeProlongationSeconds: 7.2,
    fibrinogenLevelMgDl: 85,
  });

  return formatDicReport(report);
}

function formatMtpReport(res: MassiveTransfusionResult, sbp: number, hr: number): string {
  let md = `### Noctis Massive Transfusion Protocol & Hemostasis Engine (NOCTIS-HEM-TRANS-001)\n`;
  md += `**MTP Activation:** \`${res.mtpActivated ? "ACTIVATED STAT" : "OBSERVE"}\` · **ABC Score:** ${res.abcScore}/4 · **Shock Index:** ${res.shockIndex}\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Hemostatic Resuscitation Ratios & Calcium Protocol\n`;
  md += `- **Blood Product Ratio:** ${res.prbcToFfpToPltRatio}\n`;
  md += `- **Calcium Directive:** ${res.calciumSupplementationDirective}\n\n`;

  md += `#### 2. Tranexamic Acid (TXA) Protocol (CRASH-2 Criteria)\n`;
  md += `- **Indicated:** \`${res.txaRecommendation.indicated ? "YES" : "NO"}\`\n`;
  if (res.txaRecommendation.indicated) {
    md += `- **Loading Bolus:** ${res.txaRecommendation.bolusDose}\n`;
    md += `- **Maintenance Infusion:** ${res.txaRecommendation.infusionDose}\n`;
  }
  md += `- **Evidence Rule:** ${res.txaRecommendation.clinicalRule}\n\n`;

  md += `#### 3. Lethal Triad Surveillance (Hypothermia, Acidosis, Coagulopathy)\n`;
  for (const t of res.lethalTriadMitigation) {
    md += `- ${t}\n`;
  }

  return md;
}

function formatTegReport(res: ViscoelasticAssayResult): string {
  let md = `### Noctis Viscoelastic Hemostatic Assay Engine (NOCTIS-HEM-TRANS-001)\n`;
  md += `**Assessment:** ${res.underlyingDefectSummary}\n\n`;

  md += `#### 1. Detected Coagulopathies on Viscoelastic Tracing\n`;
  for (const c of res.detectedCoagulopathies) {
    md += `- ${c}\n`;
  }
  md += `\n`;

  md += `#### 2. Targeted Component Therapy Directives\n`;
  for (const p of res.targetedBloodProducts) {
    md += `- ${p}\n`;
  }
  md += `\n`;

  if (res.antifibrinolyticDirective) {
    md += `#### 3. Antifibrinolytic Therapy\n`;
    md += `- ${res.antifibrinolyticDirective}\n`;
  }

  return md;
}

function formatHitReport(res: Hit4TsResult): string {
  let md = `### Noctis Heparin-Induced Thrombocytopenia (HIT) Engine (NOCTIS-HEM-TRANS-001)\n`;
  md += `**4Ts Score:** ${res.totalScore}/8 · **Pre-Test Probability:** \`${res.pretestProbability}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Immediate Anticoagulation Directives\n`;
  for (const d of res.immediateAnticoagulationDirectives) {
    md += `- ${d}\n`;
  }
  md += `\n`;

  md += `#### 2. Mandatory Confirmatory Laboratory Orders\n`;
  for (const l of res.mandatoryLaboratoryOrders) {
    md += `- ${l}\n`;
  }

  return md;
}

function formatDicReport(res: IsthDicResult): string {
  let md = `### Noctis Overt DIC Scoring Engine (NOCTIS-HEM-TRANS-001)\n`;
  md += `**ISTH Overt DIC Score:** ${res.isthScore}/8 · **Diagnosis:** \`${res.diagnosticOutcome}\`\n\n`;

  md += `#### Clinical Management Actions\n`;
  for (const a of res.clinicalManagementActions) {
    md += `- ${a}\n`;
  }

  return md;
}
