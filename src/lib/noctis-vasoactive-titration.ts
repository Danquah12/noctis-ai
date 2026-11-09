// ============================================================================
// NOCTIS VASOACTIVE & INOTROPIC TITRATION ENGINE (VIS / SURVIVING SEPSIS)
// Standards: Surviving Sepsis Campaign 2021/2026, AHA Cardiogenic Shock Scientific Statement,
//            Vasoactive-Inotropic Score (VIS) Formulation
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

export type ShockClassification = "DISTRIBUTIVE_SEPTIC" | "CARDIOGENIC" | "HYPOVOLEMIC" | "OBSTRUCTIVE";

export interface VasoactiveInfusionRates {
  norepinephrineMcgKgMin: number; // 0.01 - 3.0 mcg/kg/min
  vasopressinUnitsMin: number; // 0.03 units/min fixed
  epinephrineMcgKgMin: number; // 0.01 - 1.0 mcg/kg/min
  dobutamineMcgKgMin: number; // 2.5 - 20 mcg/kg/min
  milrinoneMcgKgMin: number; // 0.25 - 0.75 mcg/kg/min
  dopamineMcgKgMin: number; // 2 - 20 mcg/kg/min
  phenylephrineMcgKgMin: number; // 0.1 - 5.0 mcg/kg/min
}

export interface VasoactivePatientProfile {
  encounterId: string;
  patientAge: number;
  patientWeightKg: number;
  shockType: ShockClassification;
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  heartRateBpm: number;
  fluidResuscitationCompletedMl: number; // Surviving Sepsis: 30 mL/kg crystalloid
  accessRoute: "CENTRAL_VENOUS_CATHETER" | "PERIPHERAL_IV_LINE";
  peripheralInfusionDurationHours?: number; // Safe <= 6-12h
  activeInfusions: VasoactiveInfusionRates;
  cardiacIndexLMinM2?: number; // Normal 2.5 - 4.0 L/min/m2
  leftVentricularEjectionFractionPercent?: number;
  proposedInterventions?: string[];
}

export interface VasoactiveAssessmentReport {
  meanArterialPressureMmHg: number;
  shockIndex: number;
  vasoactiveInotropicScore: number;
  primaryAgentRecommendation: {
    firstLineDrug: string;
    targetDoseRange: string;
    rationale: string;
  };
  secondaryAddOnRecommendation: {
    agent: string;
    triggerCriteria: string;
    dosing: string;
  };
  extravasationSafety: {
    lineStatus: string;
    extravasationAntidoteProtocol: string;
    tissueNecrosisRisk: "LOW" | "MODERATE" | "HIGH_EMERGENCY";
  };
  trippedInvariants: string[];
  safetyDirectives: string[];
  spokenGuidance: string;
}

/**
 * Calculates Vasoactive-Inotropic Score (VIS):
 * VIS = Dopamine (mcg/kg/min)
 *     + Dobutamine (mcg/kg/min)
 *     + 100 * Epinephrine (mcg/kg/min)
 *     + 10 * Milrinone (mcg/kg/min)
 *     + 10000 * Vasopressin (units/kg/min) -> Note: 0.03 units/min for 70kg is ~0.00043 units/kg/min * 10000 = ~4.3
 *     + 100 * Norepinephrine (mcg/kg/min)
 */
export function calculateVasoactiveInotropicScore(
  rates: VasoactiveInfusionRates,
  weightKg: number
): number {
  const safeWeight = Math.max(weightKg, 30);
  const vasopressinUnitsKgMin = rates.vasopressinUnitsMin / safeWeight;

  const vis =
    rates.dopamineMcgKgMin +
    rates.dobutamineMcgKgMin +
    100 * rates.epinephrineMcgKgMin +
    10 * rates.milrinoneMcgKgMin +
    10000 * vasopressinUnitsKgMin +
    100 * rates.norepinephrineMcgKgMin;

  return Number(vis.toFixed(1));
}

/**
 * Evaluates Vasoactive & Inotropic Titration Profile
 */
export function evaluateVasoactiveProtocol(profile: VasoactivePatientProfile): VasoactiveAssessmentReport {
  const trippedInvariants: string[] = [];
  const safetyDirectives: string[] = [];

  const map = Number(((profile.systolicBpMmHg + 2 * profile.diastolicBpMmHg) / 3).toFixed(1));
  const shockIndex = Number((profile.heartRateBpm / Math.max(profile.systolicBpMmHg, 40)).toFixed(2));
  const vis = calculateVasoactiveInotropicScore(profile.activeInfusions, profile.patientWeightKg);

  // 1. Primary Agent by Shock Etiology
  let firstLineDrug = "";
  let targetDoseRange = "";
  let rationale = "";
  let addOnAgent = "";
  let addOnTrigger = "";
  let addOnDosing = "";

  switch (profile.shockType) {
    case "DISTRIBUTIVE_SEPTIC":
      firstLineDrug = "Norepinephrine";
      targetDoseRange = "0.05 to 1.5 mcg/kg/min (titrate to MAP >= 65 mmHg)";
      rationale = "Potent alpha-1 vasoconstrictor with modest beta-1 inotropic support. First-line vasopressor per Surviving Sepsis Campaign 2021/2026.";
      addOnAgent = "Vasopressin (AVP)";
      addOnTrigger = "Norepinephrine requirement >= 0.25 mcg/kg/min to restore vascular tone";
      addOnDosing = "0.03 units/min fixed infusion (do not titrate)";
      break;

    case "CARDIOGENIC":
      firstLineDrug = "Dobutamine + Norepinephrine as needed for MAP >= 65 mmHg";
      targetDoseRange = "Dobutamine 2.5 to 20 mcg/kg/min; Norepinephrine 0.02 to 0.5 mcg/kg/min";
      rationale = "Beta-1 adrenergic inotropic stimulation enhances myocardial contractility without excessive vasoconstriction. Norepinephrine counteracts afterload reduction to maintain perfusion.";
      addOnAgent = "Milrinone or Epinephrine";
      addOnTrigger = "Refractory low cardiac index (< 2.0 L/min/m2) or severe pulmonary hypertension";
      addOnDosing = "Milrinone 0.25 to 0.75 mcg/kg/min (omit bolus; renally adjust)";
      break;

    case "HYPOVOLEMIC":
      firstLineDrug = "Volume Resuscitation (Crystalloid / PRBC) Priority";
      targetDoseRange = "Vasopressors reserved strictly as bridge during active fluid replacement";
      rationale = "Primary defect is intravascular volume deficit. Vasoconstriction in empty ventricles causes severe end-organ ischemia and cardiac collapse.";
      addOnAgent = "Norepinephrine bridging";
      addOnTrigger = "Diastolic blood pressure < 30 mmHg or imminent cardiac arrest";
      addOnDosing = "0.02 to 0.2 mcg/kg/min temporary bridge";
      break;

    case "OBSTRUCTIVE":
      firstLineDrug = "Mechanical Decompression Priority + Norepinephrine bridge";
      targetDoseRange = "Norepinephrine 0.05 to 0.5 mcg/kg/min";
      rationale = "Relieve underlying physical obstruction (pericardiocentesis, needle thoracostomy, thrombolysis/embolectomy). Maintain right ventricular perfusion pressure.";
      addOnAgent = "Inhaled Epoprostenol / Milrinone";
      addOnTrigger = "Massive pulmonary embolism with acute right ventricular failure";
      addOnDosing = "Inhaled pulmonary vasodilator";
      break;
  }

  // 2. Extravasation Protocol
  let lineStatus = "Central Venous Catheter in place; low extravasation hazard.";
  let tissueNecrosisRisk: "LOW" | "MODERATE" | "HIGH_EMERGENCY" = "LOW";
  let extravasationAntidoteProtocol = "Phentolamine mesylate 5 to 10 mg diluted in 10 mL 0.9% normal saline ready for subdermal wheal infiltration.";

  if (profile.accessRoute === "PERIPHERAL_IV_LINE") {
    const hours = profile.peripheralInfusionDurationHours ?? 0;
    if (hours > 6) {
      tissueNecrosisRisk = "HIGH_EMERGENCY";
      lineStatus = `Peripheral vasopressor running for ${hours} hours (> 6 hours). Immediate central venous catheterization mandated.`;
    } else {
      tissueNecrosisRisk = "MODERATE";
      lineStatus = `Peripheral vasopressor active (${hours} hours). Dedicated large antecubital vein with frequent Q15min checks required.`;
    }
  }

  // =========================================================================
  // NON-COMPENSATORY SAFETY INVARIANTS (21 U.S.C. § 360j(o)(1)(E))
  // =========================================================================

  // Invariant CF-VASO-001: Peripheral Extravasation Ischemic Necrosis Veto
  if (profile.accessRoute === "PERIPHERAL_IV_LINE" && (profile.peripheralInfusionDurationHours ?? 0) > 12) {
    trippedInvariants.push("CF-VASO-001");
    safetyDirectives.push(
      "SAFETY VETO [CF-VASO-001]: Extended Peripheral Vasopressor Infusion Hazard (" +
        profile.peripheralInfusionDurationHours +
        " hours > 12 hours). Sustained peripheral alpha-adrenergic vasopressor delivery carries catastrophic risk of limb compartment syndrome, extravasation ischemic necrosis, and digital gangrene. Immediately secure central line and prepare Phentolamine antidote."
    );
  }

  // Invariant CF-VASO-002: Unresuscitated Hypovolemic Pressor Veto
  // Surviving Sepsis 30 mL/kg: For a 70kg patient, 30 mL/kg = 2100 mL
  const target30MlKg = profile.patientWeightKg * 30;
  if (
    profile.shockType === "DISTRIBUTIVE_SEPTIC" &&
    profile.fluidResuscitationCompletedMl < 1000 &&
    profile.activeInfusions.norepinephrineMcgKgMin > 0.3 &&
    profile.diastolicBpMmHg >= 35
  ) {
    trippedInvariants.push("CF-VASO-002");
    safetyDirectives.push(
      "SAFETY VETO [CF-VASO-002]: Inadequate Fluid Resuscitation Lockout. Patient has received only " +
        profile.fluidResuscitationCompletedMl +
        " mL crystalloid (< 1000 mL against 30 mL/kg target of " +
        target30MlKg +
        " mL). High-dose vasopressor without volume resuscitation causes mesenteric and renal microvascular infarction. Rapid fluid loading mandated."
    );
  }

  // Invariant CF-VASO-003: Milrinone Bolus Induced Fatal Hypotension Veto
  if (
    profile.shockType === "CARDIOGENIC" &&
    map < 65 &&
    profile.proposedOrders?.includes("MILRINONE_IV_BOLUS_50MCG_KG")
  ) {
    trippedInvariants.push("CF-VASO-003");
    safetyDirectives.push(
      "SAFETY VETO [CF-VASO-003]: Milrinone IV Bolus Absolute Contraindication in Hypotensive Shock (MAP " +
        map +
        " mmHg < 65 mmHg). Standard 50 mcg/kg loading bolus triggers profound systemic vasodilation, precipitous cardiovascular collapse, and pulseless electrical activity. Omit loading bolus; start low-dose maintenance infusion only after establishing perfusion pressure."
    );
  }

  // Invariant CF-VASO-004: Pure Alpha-Agonist Phenylephrine in Cardiogenic Shock Veto
  if (
    profile.shockType === "CARDIOGENIC" &&
    profile.activeInfusions.phenylephrineMcgKgMin > 0.2
  ) {
    trippedInvariants.push("CF-VASO-004");
    safetyDirectives.push(
      "SAFETY VETO [CF-VASO-004]: Phenylephrine Vasoconstriction in Pump Failure. Pure alpha-1 agonist phenylephrine dramatically increases left ventricular afterload without inotropic support, precipitating acute pulmonary edema and cardiogenic arrest. Discontinue phenylephrine; switch to Norepinephrine plus inotrope."
    );
  }

  // Spoken Guidance
  const spokenParts = [
    `Hemodynamic Stability and Vasoactive Assessment for encounter ${profile.encounterId}.`,
    `Shock category: ${profile.shockType.replace(/_/g, " ")}.`,
    `Blood pressure is ${profile.systolicBpMmHg} over ${profile.diastolicBpMmHg} mmHg with heart rate ${profile.heartRateBpm} bpm, calculating to a Mean Arterial Pressure of ${map} mmHg and Shock Index of ${shockIndex}.`,
    `Calculated Vasoactive-Inotropic Score is ${vis}.`,
    `Primary agent: ${firstLineDrug}. Dosing target: ${targetDoseRange}.`,
    `Access route: ${lineStatus}`,
  ];

  if (trippedInvariants.length > 0) {
    spokenParts.push(
      `Warning: ${trippedInvariants.length} critical safety invariant alerts tripped: ${trippedInvariants.join(", ")}.`
    );
    spokenParts.push(safetyDirectives.join(" "));
  }

  return {
    meanArterialPressureMmHg: map,
    shockIndex,
    vasoactiveInotropicScore: vis,
    primaryAgentRecommendation: {
      firstLineDrug,
      targetDoseRange,
      rationale,
    },
    secondaryAddOnRecommendation: {
      agent: addOnAgent,
      triggerCriteria: addOnTrigger,
      dosing: addOnDosing,
    },
    extravasationSafety: {
      lineStatus,
      extravasationAntidoteProtocol,
      tissueNecrosisRisk,
    },
    trippedInvariants,
    safetyDirectives,
    spokenGuidance: spokenParts.join(" "),
  };
}
