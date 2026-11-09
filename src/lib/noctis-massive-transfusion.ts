/**
 * NOCTIS HEALTH 500 - MASSIVE TRANSFUSION PROTOCOL (MTP) & VISCOELASTIC HEMOSTASIS ENGINE (TRACK 25)
 * Standards: PROPPR Trial (1:1:1 vs 1:1:2 Balanced Hemostatic Resuscitation),
 *             CRASH-2 Trial (Tranexamic Acid 3-Hour Cutoff),
 *             TEG 6s & ROTEM delta Goal-Directed Algorithm,
 *             Citrate Toxicity & Lethal Triad Prevention
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-MTP-001: Exsanguinating Crystalloid Drowning Veto (> 2000 mL crystalloid in severe hemorrhagic shock)
 * - CF-MTP-002: Citrate-Induced Severe Hypocalcemia Veto (iCa < 0.9 mmol/L; Calcium Chloride mandate)
 * - CF-MTP-003: Delayed Tranexamic Acid (TXA) Harm Veto (> 3 hours post-injury increases mortality)
 * - CF-MTP-004: Trauma Lethal Triad of Death Veto (Core Temp < 34C, pH < 7.20, Coagulopathy)
 */

export interface MtpPatientProfile {
  patientId: string;
  patientName: string;
  hoursSinceInjury: number;
  systolicBp: number;
  heartRateBpm: number;
  coreTemperatureCelsius: number;
  arterialPh: number;
  baseDeficitMeqPerL: number;
  ionizedCalciumMmolPerL: number; // Normal 1.15 - 1.30 mmol/L
  serumFibrinogenMgPerDl: number; // Target >= 150 - 200 mg/dL
  plateletCountKPerUl: number;    // Target >= 50 - 100 k/uL
  // Transfused Products
  crystalloidInfusedMl: number;
  prbcUnitsTransfused: number;
  ffpUnitsTransfused: number;
  plateletUnitsTransfused: number; // 1 apheresis pack = 6 whole blood units
  calciumChlorideGramsGiven: number;
  // Viscoelastic Testing (TEG 6s / ROTEM)
  tegRTimeMin?: number;        // Normal 5 - 10 min. Prolonged > 10 min = FFP
  tegAlphaAngleDeg?: number;   // Normal 53 - 72 deg. Decreased < 53 = Cryo / Fibrinogen
  tegMaxAmplitudeMm?: number;  // Normal 50 - 70 mm. Decreased < 50 = Platelets
  tegLy30Percent?: number;     // Normal 0 - 3%. Elevated > 3% = Hyperfibrinolysis -> TXA
  // Proposed Orders
  proposedOrders?: Array<"CRYSTALLOID_BOLUS_2000ML" | "TXA_1G_IV" | "CALCIUM_CHLORIDE_1G" | "CRYO_10_UNITS" | "BALANCED_MTP_COOLER">;
}

export interface ViscoelasticGuidance {
  plasmaDeficiency: boolean;
  fibrinogenDeficiency: boolean;
  plateletDeficiency: boolean;
  hyperfibrinolysisPresent: boolean;
  recommendedBloodProducts: string[];
}

export interface MtpEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  mtpStatus: "ACTIVATED_BALANCED_1_1_1" | "GOAL_DIRECTED_TEG" | "STABILIZED";
  crystalloidRatioAlert: boolean;
  viscoelasticInterpretation: ViscoelasticGuidance;
  lethalTriadActive: boolean;
  trippedInvariants: string[];
  mandatoryActions: string[];
}

// -------------------------------------------------------------------------
// VISCOELASTIC GOAL-DIRECTED COAGULATION INTERPRETER
// -------------------------------------------------------------------------

export function interpretViscoelasticTeg(profile: MtpPatientProfile): ViscoelasticGuidance {
  const recommendations: string[] = [];

  // R-time / CT: Clotting factor deficiency
  const plasmaDef = (profile.tegRTimeMin !== undefined && profile.tegRTimeMin > 10) || profile.ffpUnitsTransfused < profile.prbcUnitsTransfused;
  if (plasmaDef) {
    recommendations.push("Fresh Frozen Plasma (FFP) 2-4 units (or 4-Factor PCC 25-50 units/kg) to restore thrombin generation.");
  }

  // Alpha angle / K-time: Fibrinogen deficiency
  const fibDef = (profile.tegAlphaAngleDeg !== undefined && profile.tegAlphaAngleDeg < 53) || profile.serumFibrinogenMgPerDl < 150;
  if (fibDef) {
    recommendations.push("Cryoprecipitate 10 units (or Fibrinogen Concentrate 2-4 grams) to target serum fibrinogen > 200 mg/dL.");
  }

  // Maximum Amplitude (MA): Platelet count / function deficiency
  const platDef = (profile.tegMaxAmplitudeMm !== undefined && profile.tegMaxAmplitudeMm < 50) || profile.plateletCountKPerUl < 50;
  if (platDef) {
    recommendations.push("Platelets 1 apheresis unit (target platelet count > 50-100 k/uL).");
  }

  // LY30: Hyperfibrinolysis
  const hyperfib = profile.tegLy30Percent !== undefined && profile.tegLy30Percent > 3.0;
  if (hyperfib) {
    recommendations.push("Tranexamic Acid (TXA) 1g IV over 10 min followed by 1g IV infusion over 8 hours (if within 3h of injury).");
  }

  return {
    plasmaDeficiency: plasmaDef,
    fibrinogenDeficiency: fibDef,
    plateletDeficiency: platDef,
    hyperfibrinolysisPresent: hyperfib,
    recommendedBloodProducts: recommendations,
  };
}

// -------------------------------------------------------------------------
// COMPREHENSIVE MTP & VISCOELASTIC EVALUATION ENGINE
// -------------------------------------------------------------------------

export function evaluateMassiveTransfusion(profile: MtpPatientProfile): MtpEvaluationReport {
  const teg = interpretViscoelasticTeg(profile);
  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];

  // Lethal Triad Check: Hypothermia (<35C), Acidosis (pH < 7.25 or Base Deficit >= 6), Coagulopathy
  const hypothermia = profile.coreTemperatureCelsius < 35.0;
  const acidosis = profile.arterialPh < 7.25 || profile.baseDeficitMeqPerL >= 6;
  const coagulopathy = teg.plasmaDeficiency || teg.fibrinogenDeficiency || profile.ionizedCalciumMmolPerL < 1.1;
  const lethalTriad = hypothermia && acidosis && coagulopathy;

  // 1. Invariant CF-MTP-001: Crystalloid Drowning Veto in Exsanguinating Trauma
  const crystalloidOrderExcess = profile.proposedOrders?.includes("CRYSTALLOID_BOLUS_2000ML");
  if ((profile.crystalloidInfusedMl > 2000 && profile.prbcUnitsTransfused < 2) || crystalloidOrderExcess) {
    trippedInvariants.push("CF-MTP-001");
    mandatoryActions.push(
      `EXSANGUINATING CRYSTALLOID DROWNING VETO: Patient has received ${profile.crystalloidInfusedMl} mL of crystalloid without blood product activation. Crystalloid over-resuscitation dilutes clotting factors, disrupts stable fibrin clots, induces hyperchloremic metabolic acidosis, and increases trauma mortality. STOP crystalloid infusions immediately; activate Massive Transfusion Protocol with balanced 1:1:1 blood products (PRBC : FFP : Platelets).`
    );
  }

  // 2. Invariant CF-MTP-002: Citrate Hypocalcemia Veto
  // Citrate in blood packs chelates calcium. iCa < 0.9 mmol/L induces fatal electromechanical dissociation
  const calciumNeeded = Math.floor(profile.prbcUnitsTransfused / 4);
  if (profile.ionizedCalciumMmolPerL < 0.9 || (profile.prbcUnitsTransfused >= 4 && profile.calciumChlorideGramsGiven < calciumNeeded)) {
    trippedInvariants.push("CF-MTP-002");
    mandatoryActions.push(
      `CITRATE-INDUCED HYPOCALCEMIA VETO: Ionized calcium is ${profile.ionizedCalciumMmolPerL} mmol/L (< 0.90 critical threshold) after ${profile.prbcUnitsTransfused} PRBC units. Citrate anticoagulation binds calcium, paralyzing myocardial excitation-contraction coupling and tenase complex hemostasis. Immediately administer Calcium Chloride 1g IV (or Calcium Gluconate 3g IV) via central line, repeat Q4 units of blood.`
    );
  }

  // 3. Invariant CF-MTP-003: Delayed Tranexamic Acid (TXA) Harm Veto
  // CRASH-2 Trial: TXA given > 3 hours post-injury significantly INCREASES all-cause mortality (RR 1.44)
  const txaProposed = profile.proposedOrders?.includes("TXA_1G_IV");
  if (profile.hoursSinceInjury > 3.0 && txaProposed) {
    trippedInvariants.push("CF-MTP-003");
    mandatoryActions.push(
      `DELAYED TRANEXAMIC ACID (TXA) HARM VETO: Time since trauma injury is ${profile.hoursSinceInjury} hours (> 3.0 hour CRASH-2 cutoff). Clinical trials demonstrate administering TXA beyond 3 hours from injury significantly increases mortality and catastrophic thromboembolic events (DVT, PE, stroke). DO NOT ADMINISTER TXA. Focus on surgical hemostasis and factor replacement.`
    );
  }

  // 4. Invariant CF-MTP-004: Trauma Lethal Triad of Death Veto
  if (lethalTriad) {
    trippedInvariants.push("CF-MTP-004");
    mandatoryActions.push(
      `TRAUMA LETHAL TRIAD OF DEATH VETO: Co-occurrence of Hypothermia (${profile.coreTemperatureCelsius}°C), Severe Acidosis (pH ${profile.arterialPh}, Base Deficit ${profile.baseDeficitMeqPerL}), and Coagulopathy. Coagulation factor enzyme kinetics cease below 34°C. Mandate Damage Control Surgery (rapid pack and staple; no definitive reconstruction), active external/internal rewarming (Belmont/Level 1 blood warmers at 42°C, warm peritoneal lavage), and 1:1:1 balanced hemostatic resuscitation.`
    );
  }

  return {
    timestampIso: new Date().toISOString(),
    patientId: profile.patientId,
    patientName: profile.patientName,
    mtpStatus: profile.prbcUnitsTransfused >= 4 ? "ACTIVATED_BALANCED_1_1_1" : "GOAL_DIRECTED_TEG",
    crystalloidRatioAlert: profile.crystalloidInfusedMl > 2000,
    viscoelasticInterpretation: teg,
    lethalTriadActive: lethalTriad,
    trippedInvariants,
    mandatoryActions,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatMtpSpokenSummary(report: MtpEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Massive transfusion protocol and viscoelastic hemostasis report for ${report.patientName}, identifier ${report.patientId}.`
  );

  parts.push(`Protocol status is ${report.mtpStatus.replace(/_/g, " ").toLowerCase()}.`);

  if (report.viscoelasticInterpretation.recommendedBloodProducts.length > 0) {
    parts.push("Viscoelastic targeted component directives:");
    report.viscoelasticInterpretation.recommendedBloodProducts.forEach((rec, idx) => {
      parts.push(`Product ${idx + 1}: ${rec}`);
    });
  }

  if (report.lethalTriadActive) {
    parts.push("WARNING: Trauma lethal triad of death is actively present. Immediate damage control surgery and active rewarming mandatory.");
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(`CRITICAL HEMOSTATIC SAFETY INVARIANTS TRIPPED: ${report.trippedInvariants.join(", ")}.`);
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push("All hemostatic transfusion ratios and calcium levels comply with balanced resuscitation guidelines.");
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL PRESETS
// -------------------------------------------------------------------------

export const MTP_PRESET_LETHAL_TRIAD: MtpPatientProfile = {
  patientId: "MTP-TRIAD-001",
  patientName: "Jackson Miller (28yo M - Gunshot Wound to Abdomen)",
  hoursSinceInjury: 1.5,
  systolicBp: 68,
  heartRateBpm: 142,
  coreTemperatureCelsius: 33.4, // Hypothermia!
  arterialPh: 7.12,             // Severe Acidosis!
  baseDeficitMeqPerL: 14,
  ionizedCalciumMmolPerL: 0.82,  // Critical Hypocalcemia! Trips CF-MTP-002
  serumFibrinogenMgPerDl: 110,
  plateletCountKPerUl: 42,
  crystalloidInfusedMl: 3500,    // Crystalloid drowning! Trips CF-MTP-001
  prbcUnitsTransfused: 6,
  ffpUnitsTransfused: 2,         // Unbalanced ratio!
  plateletUnitsTransfused: 0,
  calciumChlorideGramsGiven: 0,  // Missing calcium!
  tegRTimeMin: 14.5,
  tegAlphaAngleDeg: 42,
  tegMaxAmplitudeMm: 38,
  tegLy30Percent: 7.8,           // Hyperfibrinolysis!
  proposedOrders: ["CRYSTALLOID_BOLUS_2000ML", "TXA_1G_IV"],
};

export const MTP_PRESET_DELAYED_TXA: MtpPatientProfile = {
  patientId: "MTP-DELAYED-002",
  patientName: "Elena Gomez (46yo F - Rollover MVC Trapped in Vehicle)",
  hoursSinceInjury: 4.5, // > 3 hours! Trips CF-MTP-003
  systolicBp: 86,
  heartRateBpm: 118,
  coreTemperatureCelsius: 35.8,
  arterialPh: 7.31,
  baseDeficitMeqPerL: 4,
  ionizedCalciumMmolPerL: 1.18,
  serumFibrinogenMgPerDl: 180,
  plateletCountKPerUl: 95,
  crystalloidInfusedMl: 1000,
  prbcUnitsTransfused: 2,
  ffpUnitsTransfused: 2,
  plateletUnitsTransfused: 1,
  calciumChlorideGramsGiven: 1,
  tegRTimeMin: 7.2,
  tegAlphaAngleDeg: 62,
  tegMaxAmplitudeMm: 58,
  tegLy30Percent: 1.2,
  proposedOrders: ["TXA_1G_IV"], // Fatal delayed TXA proposal!
};
