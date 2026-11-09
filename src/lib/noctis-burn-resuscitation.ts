/**
 * NOCTIS HEALTH 500 - ACUTE BURN RESUSCITATION & INHALATION INJURY ENGINE (TRACK 24)
 * Standards: American Burn Association (ABA) Practice Guidelines,
 *             Parkland & Modified Brooke Resuscitation Formulas,
 *             Lund-Browder & Rule of Nines TBSA Estimation,
 *             Cyanide & Carbon Monoxide Smoke Inhalation Resuscitation Protocols
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-BURN-001: Inhalation Injury Immediate Prophylactic Airway Veto (Stridor / Deep facial burn)
 * - CF-BURN-002: Fluid Creep & Abdominal Compartment Syndrome Veto (> 250 mL/kg/24h or IAP > 20 mmHg)
 * - CF-BURN-003: Smoke Inhalation Cyanide Poisoning Hydroxocobalamin Antidote Veto (Lactate >= 8 mmol/L)
 * - CF-BURN-004: Circumferential Full-Thickness Burn Immediate Escharotomy Veto
 */

export interface BurnPatientProfile {
  patientId: string;
  patientName: string;
  ageYears: number;
  weightKg: number;
  hoursPostBurn: number; // Hours elapsed since injury
  percentTbsaSecondAndThirdDegree: number; // >= 20% requires IV fluid resuscitation
  isElectricalHighVoltage: boolean;
  // Inhalation Injury Indicators
  closedSpaceFire: boolean;
  singedFacialHairOrSootInPharynx: boolean;
  stridorOrHoarseness: boolean;
  carboxyhemoglobinPercent: number; // > 10% = toxic, > 25% = severe
  serumLactateMmolPerL: number;     // >= 8 mmol/L in smoke = cyanide
  // Circumferential Eschar
  circumferentialExtremityBurn: boolean;
  distalPulseLost: boolean;
  circumferentialTorsoBurn: boolean;
  peakInspiratoryPressureHigh: boolean;
  // Fluid Resuscitation Monitoring
  currentFluidInfusionMlPerHour: number;
  totalFluidReceivedMl: number;
  urineOutputMlPerHour: number;
  intraAbdominalPressureMmHg?: number;
}

export interface BurnFluidCalculation {
  parklandTotal24hMl: number;
  modifiedBrookeTotal24hMl: number;
  first8HoursHourlyRateMl: number;
  next16HoursHourlyRateMl: number;
  targetUrineOutputMlPerHourMin: number;
  targetUrineOutputMlPerHourMax: number;
  fluidAdjustmentAdvice: "MAINTAIN" | "INCREASE_RATE_20_PERCENT" | "DECREASE_RATE_20_PERCENT" | "HIGH_RISK_FLUID_CREEP";
}

export interface BurnEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  fluidCalculations: BurnFluidCalculation;
  inhalationInjurySeverity: "NONE" | "SUSPECTED_MILD" | "SEVERE_AIRWAY_THREAT" | "LETHAL_CYANIDE_TOXICITY";
  escharotomyRequired: boolean;
  trippedInvariants: string[];
  mandatoryActions: string[];
}

// -------------------------------------------------------------------------
// BURN FLUID RESUSCITATION CALCULATOR (PARKLAND & BROOKE)
// -------------------------------------------------------------------------

export function calculateBurnFluidResuscitation(profile: BurnPatientProfile): BurnFluidCalculation {
  const tbsa = Math.min(Math.max(profile.percentTbsaSecondAndThirdDegree, 0), 100);
  const weight = profile.weightKg;

  // Parkland: 4 mL * kg * %TBSA (Lactated Ringer's)
  const parklandTotal = 4 * weight * tbsa;

  // Modified Brooke: 2 mL * kg * %TBSA (ABA Adult consensus)
  const brookeTotal = 2 * weight * tbsa;

  // Fluid allocation: Half of total given in first 8 hours post-injury, half in next 16 hours
  const first8HoursRate = Math.round(parklandTotal / 2 / 8);
  const next16HoursRate = Math.round(parklandTotal / 2 / 16);

  // Target Urine Output: 0.5 mL/kg/h in adults, 1.0-1.5 mL/kg/h in pediatrics / electrical burns
  const targetUopMin = profile.isElectricalHighVoltage
    ? Math.round(weight * 1.0)
    : profile.ageYears < 14
    ? Math.round(weight * 1.0)
    : Math.round(weight * 0.5);

  const targetUopMax = profile.isElectricalHighVoltage
    ? Math.round(weight * 1.5)
    : profile.ageYears < 14
    ? Math.round(weight * 1.5)
    : Math.round(weight * 1.0);

  // Hourly Titration Guidance based on UOP
  let adjustment: BurnFluidCalculation["fluidAdjustmentAdvice"] = "MAINTAIN";

  if (profile.urineOutputMlPerHour < targetUopMin) {
    adjustment = "INCREASE_RATE_20_PERCENT";
  } else if (profile.urineOutputMlPerHour > targetUopMax && profile.totalFluidReceivedMl > weight * 150) {
    adjustment = "DECREASE_RATE_20_PERCENT";
  }

  // Fluid Creep check (>250 mL/kg/24h)
  if (profile.totalFluidReceivedMl >= weight * 250) {
    adjustment = "HIGH_RISK_FLUID_CREEP";
  }

  return {
    parklandTotal24hMl: parklandTotal,
    modifiedBrookeTotal24hMl: brookeTotal,
    first8HoursHourlyRateMl: first8HoursRate,
    next16HoursHourlyRateMl: next16HoursRate,
    targetUrineOutputMlPerHourMin: targetUopMin,
    targetUrineOutputMlPerHourMax: targetUopMax,
    fluidAdjustmentAdvice: adjustment,
  };
}

// -------------------------------------------------------------------------
// COMPREHENSIVE BURN EVALUATION ENGINE
// -------------------------------------------------------------------------

export function evaluateBurnResuscitation(profile: BurnPatientProfile): BurnEvaluationReport {
  const fluid = calculateBurnFluidResuscitation(profile);
  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];

  let inhalationSeverity: BurnEvaluationReport["inhalationInjurySeverity"] = "NONE";
  let escharotomyRequired = false;

  // 1. Invariant CF-BURN-001: Inhalation Injury Airway Veto
  if (profile.stridorOrHoarseness || (profile.closedSpaceFire && profile.singedFacialHairOrSootInPharynx)) {
    inhalationSeverity = "SEVERE_AIRWAY_THREAT";
    trippedInvariants.push("CF-BURN-001");
    mandatoryActions.push(
      "INHALATION INJURY IMMEDIATE INTUBATION VETO: Patient exhibits stridor/hoarseness or deep facial burn with soot in pharynx after closed-space fire. Progressive supraglottic edema will rapidly obliterate the glottic aperture. Immediately perform endotracheal intubation with video laryngoscopy and a size 7.5-8.0 mm ETT before anatomical landmarks are lost."
    );
  } else if (profile.closedSpaceFire) {
    inhalationSeverity = "SUSPECTED_MILD";
  }

  // 2. Invariant CF-BURN-002: Fluid Creep & Abdominal Compartment Syndrome Veto
  const fluidCreepThreshold = profile.weightKg * 250;
  if (
    profile.totalFluidReceivedMl > fluidCreepThreshold ||
    (profile.intraAbdominalPressureMmHg !== undefined && profile.intraAbdominalPressureMmHg >= 20)
  ) {
    trippedInvariants.push("CF-BURN-002");
    mandatoryActions.push(
      `FLUID CREEP & ABDOMINAL COMPARTMENT SYNDROME VETO: Patient has received ${profile.totalFluidReceivedMl} mL (> ${fluidCreepThreshold} mL / 250 mL/kg threshold) or intra-abdominal pressure is ${profile.intraAbdominalPressureMmHg} mmHg. Excessive crystalloid induces visceral edema, intra-abdominal hypertension, and multiple organ failure. Titrate fluids strictly to urine output (0.5 mL/kg/h), introduce 5% albumin rescue infusion, and monitor bladder pressures Q4h.`
    );
  }

  // 3. Invariant CF-BURN-003: Smoke Inhalation Cyanide Poisoning Veto
  if (profile.closedSpaceFire && profile.serumLactateMmolPerL >= 8.0) {
    inhalationSeverity = "LETHAL_CYANIDE_TOXICITY";
    trippedInvariants.push("CF-BURN-003");
    mandatoryActions.push(
      `CYANIDE SMOKE INHALATION ANTIDOTE VETO: Closed-space fire victim with profound lactic acidosis (Lactate ${profile.serumLactateMmolPerL} mmol/L >= 8.0). Highly predictive of lethal cyanide poisoning uncoupling mitochondrial oxidative phosphorylation. Immediately administer Hydroxocobalamin 5g IV infusion over 15 minutes (binds cyanide to form non-toxic cyanocobalamin). Provide 100% normobaric oxygen.`
    );
  }

  // 4. Invariant CF-BURN-004: Circumferential Burn Escharotomy Veto
  if (
    (profile.circumferentialExtremityBurn && profile.distalPulseLost) ||
    (profile.circumferentialTorsoBurn && profile.peakInspiratoryPressureHigh)
  ) {
    escharotomyRequired = true;
    trippedInvariants.push("CF-BURN-004");
    mandatoryActions.push(
      "CIRCUMFERENTIAL BURN IMMEDIATE ESCHAROTOMY VETO: Loss of distal extremity arterial pulse (Doppler) or severely restricted thoracic compliance with elevated peak airway pressures. Unyielding full-thickness burn eschar causes compartment syndrome and ventilatory arrest. Perform immediate bedside mid-axial escharotomy through the dermis to subcutaneous fat to restore perfusion and chest wall excursion."
    );
  }

  return {
    timestampIso: new Date().toISOString(),
    patientId: profile.patientId,
    patientName: profile.patientName,
    fluidCalculations: fluid,
    inhalationInjurySeverity: inhalationSeverity,
    escharotomyRequired,
    trippedInvariants,
    mandatoryActions,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatBurnSpokenSummary(report: BurnEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Burn resuscitation and inhalation trauma clinical decision report for ${report.patientName}, identifier ${report.patientId}.`
  );

  parts.push(
    `Parkland 24-hour total fluid estimate is ${report.fluidCalculations.parklandTotal24hMl} milliliters. Initial 8-hour resuscitation rate is ${report.fluidCalculations.first8HoursHourlyRateMl} milliliters per hour, followed by ${report.fluidCalculations.next16HoursHourlyRateMl} milliliters per hour for the remaining 16 hours.`
  );

  parts.push(
    `Target urine output is ${report.fluidCalculations.targetUrineOutputMlPerHourMin} to ${report.fluidCalculations.targetUrineOutputMlPerHourMax} milliliters per hour. Fluid adjustment advice is ${report.fluidCalculations.fluidAdjustmentAdvice.replace(/_/g, " ").toLowerCase()}.`
  );

  if (report.inhalationInjurySeverity !== "NONE") {
    parts.push(
      `Inhalation injury status: ${report.inhalationInjurySeverity.replace(/_/g, " ").toLowerCase()}.`
    );
  }

  if (report.escharotomyRequired) {
    parts.push("URGENT: Emergent bedside escharotomy is required to relieve compartment syndrome.");
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(`CRITICAL BURN SAFETY INVARIANTS TRIPPED: ${report.trippedInvariants.join(", ")}.`);
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push("Resuscitation fluid titration and airway parameters are within accepted burn guidelines.");
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL PRESETS
// -------------------------------------------------------------------------

export const BURN_PRESET_INHALATION_AIRWAY: BurnPatientProfile = {
  patientId: "BURN-INHAL-001",
  patientName: "Dominic Torres (45yo M - House Fire & 35% TBSA)",
  ageYears: 45,
  weightKg: 80,
  hoursPostBurn: 2,
  percentTbsaSecondAndThirdDegree: 35,
  isElectricalHighVoltage: false,
  closedSpaceFire: true,
  singedFacialHairOrSootInPharynx: true,
  stridorOrHoarseness: true, // Trips CF-BURN-001!
  carboxyhemoglobinPercent: 18,
  serumLactateMmolPerL: 4.2,
  circumferentialExtremityBurn: false,
  distalPulseLost: false,
  circumferentialTorsoBurn: false,
  peakInspiratoryPressureHigh: false,
  currentFluidInfusionMlPerHour: 700,
  totalFluidReceivedMl: 1400,
  urineOutputMlPerHour: 45,
};

export const BURN_PRESET_CYANIDE_POISONING: BurnPatientProfile = {
  patientId: "BURN-CYANIDE-002",
  patientName: "Evelyn Reed (62yo F - Enclosed Industrial Fire)",
  ageYears: 62,
  weightKg: 65,
  hoursPostBurn: 1,
  percentTbsaSecondAndThirdDegree: 25,
  isElectricalHighVoltage: false,
  closedSpaceFire: true,
  singedFacialHairOrSootInPharynx: true,
  stridorOrHoarseness: false,
  carboxyhemoglobinPercent: 24,
  serumLactateMmolPerL: 11.5, // > 8.0 Trips CF-BURN-003!
  circumferentialExtremityBurn: false,
  distalPulseLost: false,
  circumferentialTorsoBurn: false,
  peakInspiratoryPressureHigh: false,
  currentFluidInfusionMlPerHour: 400,
  totalFluidReceivedMl: 400,
  urineOutputMlPerHour: 30,
};

export const BURN_PRESET_FLUID_CREEP: BurnPatientProfile = {
  patientId: "BURN-CREEP-003",
  patientName: "Mason Clark (34yo M - 60% TBSA Flame Burn)",
  ageYears: 34,
  weightKg: 75,
  hoursPostBurn: 18,
  percentTbsaSecondAndThirdDegree: 60,
  isElectricalHighVoltage: false,
  closedSpaceFire: false,
  singedFacialHairOrSootInPharynx: false,
  stridorOrHoarseness: false,
  carboxyhemoglobinPercent: 3,
  serumLactateMmolPerL: 3.5,
  circumferentialExtremityBurn: false,
  distalPulseLost: false,
  circumferentialTorsoBurn: false,
  peakInspiratoryPressureHigh: false,
  currentFluidInfusionMlPerHour: 1200,
  totalFluidReceivedMl: 21500, // 286 mL/kg! Trips CF-BURN-002
  urineOutputMlPerHour: 110,
  intraAbdominalPressureMmHg: 24, // ACS!
};
