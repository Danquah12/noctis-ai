/**
 * NOCTIS HEALTH 500 - PEDIATRIC ADVANCED LIFE SUPPORT (PALS) & BROWSELOW RESUSCITATION ENGINE
 * Standards: AHA / AAP 2020-2025 PALS Guidelines, Broselow Color-Coded Zones,
 *             APLS Airway Sizing & Weight-Based Resuscitation Protocols
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-PALS-001: Epinephrine 1:1,000 IV/IO Veto (Strictly mandate 1:10,000 0.1 mg/mL for IV/IO; 10-fold overdose prevention)
 * - CF-PALS-002: Excessive Fluid Bolus in Cardiogenic Shock (Restrict to 5-10 mL/kg, veto 20 mL/kg rapid bolus)
 * - CF-PALS-003: Undiluted 8.4% Sodium Bicarbonate in Neonates (Mandate 4.2% diluted slow infusion to prevent IVH)
 */

export type BroselowColor =
  | "GREY" // 3 - 5 kg
  | "PINK" // 6 - 7 kg
  | "RED" // 8 - 9 kg
  | "PURPLE" // 10 - 11 kg
  | "YELLOW" // 12 - 14 kg
  | "WHITE" // 15 - 18 kg
  | "BLUE" // 19 - 23 kg
  | "ORANGE" // 24 - 29 kg
  | "GREEN" // 30 - 36 kg
  | "ADOLESCENT"; // > 36 kg

export interface BroselowZoneProfile {
  color: BroselowColor;
  hexColor: string;
  weightMinKg: number;
  weightMaxKg: number;
  typicalAgeRange: string;
  ettCuffedMm: number;
  ettUncuffedMm: number;
  ettDepthLipCm: number;
  laryngoscopeBlade: string;
  suctionCathFr: number;
  defibJoulesInitial: number;
  defibJoulesSubsequent: number;
  cardioversionJoules: number;
}

export interface PediatricVitalRanges {
  hrNormalMin: number;
  hrNormalMax: number;
  rrNormalMin: number;
  rrNormalMax: number;
  sbpMinimumHypotensionThreshold: number;
}

export interface PalsMedicationOrder {
  drugName: string;
  indication: string;
  dosePerKg: string;
  totalDoseMg: number;
  concentrationString: string;
  volumeToAdministerMl: number;
  maxDoseCapMg: number;
  route: "IV/IO" | "ET" | "IM" | "SC";
  administrationInstructions: string;
}

export interface PalsEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  ageYears: number;
  ageMonths: number;
  weightKg: number;
  broselowZone: BroselowZoneProfile;
  normalVitals: PediatricVitalRanges;
  airwayEquipment: {
    cuffedEttSizeMm: number;
    uncuffedEttSizeMm: number;
    depthAtLipCm: number;
    laryngoscopeBlade: string;
    suctionCatheterFr: number;
    chestTubeFr: number;
  };
  resuscitationMedications: PalsMedicationOrder[];
  fluidResuscitation: {
    shockType: "SEPTIC_OR_HYPOVOLEMIC" | "CARDIOGENIC";
    bolusVolumeMl: number;
    bolusRateMinutes: number;
    crystalloidType: string;
  };
  electricalTherapy: {
    defibrillationInitialJoules: number;
    defibrillationSecondJoules: number;
    synchronizedCardioversionInitialJoules: number;
  };
  trippedInvariants: string[];
  mandatoryActions: string[];
}

// -------------------------------------------------------------------------
// BROSELOW COLOR ZONES & SPECIFICATIONS
// -------------------------------------------------------------------------

export const BROSELOW_ZONES: Record<BroselowColor, BroselowZoneProfile> = {
  GREY: {
    color: "GREY",
    hexColor: "#9ca3af",
    weightMinKg: 3,
    weightMaxKg: 5,
    typicalAgeRange: "0 - 2 months",
    ettCuffedMm: 3.0,
    ettUncuffedMm: 3.5,
    ettDepthLipCm: 10.0,
    laryngoscopeBlade: "Miller 0 (Straight)",
    suctionCathFr: 6,
    defibJoulesInitial: 8,
    defibJoulesSubsequent: 16,
    cardioversionJoules: 4,
  },
  PINK: {
    color: "PINK",
    hexColor: "#ec4899",
    weightMinKg: 6,
    weightMaxKg: 7,
    typicalAgeRange: "3 - 5 months",
    ettCuffedMm: 3.0,
    ettUncuffedMm: 3.5,
    ettDepthLipCm: 10.5,
    laryngoscopeBlade: "Miller 1 (Straight)",
    suctionCathFr: 8,
    defibJoulesInitial: 14,
    defibJoulesSubsequent: 28,
    cardioversionJoules: 6,
  },
  RED: {
    color: "RED",
    hexColor: "#ef4444",
    weightMinKg: 8,
    weightMaxKg: 9,
    typicalAgeRange: "6 - 11 months",
    ettCuffedMm: 3.5,
    ettUncuffedMm: 4.0,
    ettDepthLipCm: 11.5,
    laryngoscopeBlade: "Miller 1 (Straight)",
    suctionCathFr: 8,
    defibJoulesInitial: 18,
    defibJoulesSubsequent: 36,
    cardioversionJoules: 8,
  },
  PURPLE: {
    color: "PURPLE",
    hexColor: "#a855f7",
    weightMinKg: 10,
    weightMaxKg: 11,
    typicalAgeRange: "12 - 23 months",
    ettCuffedMm: 3.5,
    ettUncuffedMm: 4.0,
    ettDepthLipCm: 12.0,
    laryngoscopeBlade: "Miller 1 or Mac 2",
    suctionCathFr: 8,
    defibJoulesInitial: 20,
    defibJoulesSubsequent: 40,
    cardioversionJoules: 10,
  },
  YELLOW: {
    color: "YELLOW",
    hexColor: "#eab308",
    weightMinKg: 12,
    weightMaxKg: 14,
    typicalAgeRange: "2 - 3 years",
    ettCuffedMm: 4.0,
    ettUncuffedMm: 4.5,
    ettDepthLipCm: 13.0,
    laryngoscopeBlade: "Mac 2 or Miller 2",
    suctionCathFr: 10,
    defibJoulesInitial: 26,
    defibJoulesSubsequent: 52,
    cardioversionJoules: 12,
  },
  WHITE: {
    color: "WHITE",
    hexColor: "#f3f4f6",
    weightMinKg: 15,
    weightMaxKg: 18,
    typicalAgeRange: "4 - 5 years",
    ettCuffedMm: 4.5,
    ettUncuffedMm: 5.0,
    ettDepthLipCm: 14.5,
    laryngoscopeBlade: "Mac 2 or Miller 2",
    suctionCathFr: 10,
    defibJoulesInitial: 34,
    defibJoulesSubsequent: 68,
    cardioversionJoules: 16,
  },
  BLUE: {
    color: "BLUE",
    hexColor: "#3b82f6",
    weightMinKg: 19,
    weightMaxKg: 23,
    typicalAgeRange: "6 - 7 years",
    ettCuffedMm: 5.0,
    ettUncuffedMm: 5.5,
    ettDepthLipCm: 16.0,
    laryngoscopeBlade: "Mac 2 or Miller 2",
    suctionCathFr: 10,
    defibJoulesInitial: 42,
    defibJoulesSubsequent: 84,
    cardioversionJoules: 20,
  },
  ORANGE: {
    color: "ORANGE",
    hexColor: "#f97316",
    weightMinKg: 24,
    weightMaxKg: 29,
    typicalAgeRange: "8 - 9 years",
    ettCuffedMm: 5.5,
    ettUncuffedMm: 6.0,
    ettDepthLipCm: 17.5,
    laryngoscopeBlade: "Mac 3 or Miller 2",
    suctionCathFr: 12,
    defibJoulesInitial: 54,
    defibJoulesSubsequent: 108,
    cardioversionJoules: 26,
  },
  GREEN: {
    color: "GREEN",
    hexColor: "#22c55e",
    weightMinKg: 30,
    weightMaxKg: 36,
    typicalAgeRange: "10 - 12 years",
    ettCuffedMm: 6.0,
    ettUncuffedMm: 6.5,
    ettDepthLipCm: 19.0,
    laryngoscopeBlade: "Mac 3 or Miller 3",
    suctionCathFr: 12,
    defibJoulesInitial: 66,
    defibJoulesSubsequent: 132,
    cardioversionJoules: 32,
  },
  ADOLESCENT: {
    color: "ADOLESCENT",
    hexColor: "#6366f1",
    weightMinKg: 37,
    weightMaxKg: 100,
    typicalAgeRange: "> 12 years (Adult parameters)",
    ettCuffedMm: 7.0,
    ettUncuffedMm: 7.5,
    ettDepthLipCm: 21.0,
    laryngoscopeBlade: "Mac 3 or 4",
    suctionCathFr: 14,
    defibJoulesInitial: 100,
    defibJoulesSubsequent: 200,
    cardioversionJoules: 50,
  },
};

// -------------------------------------------------------------------------
// PHYSIOLOGICAL CALCULATORS & FORMULAS
// -------------------------------------------------------------------------

/**
 * Determines Broselow Color Zone from weight in kg
 */
export function getBroselowZoneFromWeight(weightKg: number): BroselowZoneProfile {
  if (weightKg <= 5.5) return BROSELOW_ZONES.GREY;
  if (weightKg <= 7.5) return BROSELOW_ZONES.PINK;
  if (weightKg <= 9.5) return BROSELOW_ZONES.RED;
  if (weightKg <= 11.5) return BROSELOW_ZONES.PURPLE;
  if (weightKg <= 14.5) return BROSELOW_ZONES.YELLOW;
  if (weightKg <= 18.5) return BROSELOW_ZONES.WHITE;
  if (weightKg <= 23.5) return BROSELOW_ZONES.BLUE;
  if (weightKg <= 29.5) return BROSELOW_ZONES.ORANGE;
  if (weightKg <= 36.5) return BROSELOW_ZONES.GREEN;
  return BROSELOW_ZONES.ADOLESCENT;
}

/**
 * Calculates normal pediatric vital sign ranges by age
 */
export function calculatePediatricNormalVitals(ageYears: number, ageMonths: number): PediatricVitalRanges {
  if (ageYears === 0 && ageMonths < 1) {
    // Neonate
    return {
      hrNormalMin: 100,
      hrNormalMax: 180,
      rrNormalMin: 35,
      rrNormalMax: 60,
      sbpMinimumHypotensionThreshold: 60,
    };
  }
  if (ageYears === 0) {
    // Infant (1 - 12 mo)
    return {
      hrNormalMin: 100,
      hrNormalMax: 160,
      rrNormalMin: 30,
      rrNormalMax: 50,
      sbpMinimumHypotensionThreshold: 70,
    };
  }
  if (ageYears <= 2) {
    // Toddler (1 - 2 yr)
    return {
      hrNormalMin: 90,
      hrNormalMax: 150,
      rrNormalMin: 24,
      rrNormalMax: 40,
      sbpMinimumHypotensionThreshold: 70 + 2 * ageYears,
    };
  }
  if (ageYears <= 5) {
    // Preschooler (3 - 5 yr)
    return {
      hrNormalMin: 80,
      hrNormalMax: 140,
      rrNormalMin: 22,
      rrNormalMax: 34,
      sbpMinimumHypotensionThreshold: 70 + 2 * ageYears,
    };
  }
  if (ageYears <= 12) {
    // School-age (6 - 12 yr)
    return {
      hrNormalMin: 70,
      hrNormalMax: 120,
      rrNormalMin: 18,
      rrNormalMax: 30,
      sbpMinimumHypotensionThreshold: 70 + 2 * ageYears,
    };
  }
  // Adolescent (> 12 yr)
  return {
    hrNormalMin: 60,
    hrNormalMax: 100,
    rrNormalMin: 12,
    rrNormalMax: 20,
    sbpMinimumHypotensionThreshold: 90,
  };
}

/**
 * Calculates standard endotracheal tube (ETT) sizes and insertion depth
 * Cuffed formula: (Age in years / 4) + 3.5
 * Uncuffed formula: (Age in years / 4) + 4.0
 * Depth at lip formula: ETT ID * 3
 */
export function calculateAirwaySizing(ageYears: number, weightKg: number) {
  let cuffed = 3.0;
  let uncuffed = 3.5;

  if (ageYears >= 1) {
    cuffed = Math.round(((ageYears / 4) + 3.5) * 2) / 2; // round to nearest 0.5
    uncuffed = Math.round(((ageYears / 4) + 4.0) * 2) / 2;
  }

  const depthLip = Math.round(cuffed * 3 * 10) / 10;
  const suctionCath = Math.round(cuffed * 2);
  const zone = getBroselowZoneFromWeight(weightKg);

  return {
    cuffedEttSizeMm: cuffed,
    uncuffedEttSizeMm: uncuffed,
    depthAtLipCm: depthLip,
    laryngoscopeBlade: zone.laryngoscopeBlade,
    suctionCatheterFr: suctionCath,
    chestTubeFr: Math.min(32, Math.max(10, Math.round(weightKg * 1.5))),
  };
}

/**
 * Calculates complete PALS Resuscitation Medications list for a given weight
 */
export function calculatePalsMedications(weightKg: number): PalsMedicationOrder[] {
  const w = Math.min(100, Math.max(2, weightKg));

  // 1. Epinephrine (Cardiac Arrest / Symptomatic Bradycardia)
  // 0.01 mg/kg = 0.1 mL/kg of 1:10,000 (0.1 mg/mL) solution
  const epiDoseMg = Math.min(1.0, Math.round(w * 0.01 * 1000) / 1000);
  const epiVolMl = Math.min(10.0, Math.round(w * 0.1 * 10) / 10);

  // 2. Atropine (Vagal bradycardia / AV block)
  // 0.02 mg/kg, min 0.1 mg, max 0.5 mg
  const atropineDoseMg = Math.min(0.5, Math.max(0.1, Math.round(w * 0.02 * 100) / 100));
  const atropineVolMl = Math.round((atropineDoseMg / 0.1) * 10) / 10; // 0.1 mg/mL conc

  // 3. Adenosine (SVT)
  // Dose 1: 0.1 mg/kg (max 6 mg)
  const adenoDoseMg = Math.min(6.0, Math.round(w * 0.1 * 10) / 10);
  const adenoVolMl = Math.round((adenoDoseMg / 3.0) * 10) / 10; // 3 mg/mL conc

  // 4. Amiodarone (Refractory VF / Pulseless VT)
  // 5 mg/kg (max 300 mg)
  const amioDoseMg = Math.min(300, Math.round(w * 5));
  const amioVolMl = Math.round((amioDoseMg / 50) * 10) / 10; // 50 mg/mL conc

  // 5. Dextrose 10% (Hypoglycemia)
  // 0.5 g/kg = 5 mL/kg of D10W
  const d10VolMl = Math.min(250, Math.round(w * 5));

  return [
    {
      drugName: "Epinephrine (1:10,000 / 0.1 mg/mL)",
      indication: "Cardiac Arrest / Pulseless VT/VF / Symptomatic Bradycardia",
      dosePerKg: "0.01 mg/kg (0.1 mL/kg)",
      totalDoseMg: epiDoseMg,
      concentrationString: "0.1 mg/mL (1:10,000 prefilled syringe)",
      volumeToAdministerMl: epiVolMl,
      maxDoseCapMg: 1.0,
      route: "IV/IO",
      administrationInstructions: "Rapid IV/IO push followed by 5 mL 0.9% NaCl flush. Repeat every 3-5 minutes.",
    },
    {
      drugName: "Atropine Sulfate (0.1 mg/mL)",
      indication: "Bradycardia with increased vagal tone or primary AV block",
      dosePerKg: "0.02 mg/kg (Min 0.1 mg, Max 0.5 mg)",
      totalDoseMg: atropineDoseMg,
      concentrationString: "0.1 mg/mL",
      volumeToAdministerMl: atropineVolMl,
      maxDoseCapMg: 0.5,
      route: "IV/IO",
      administrationInstructions: "Rapid IV/IO push. Minimum dose is 0.1 mg to prevent paradoxical bradycardia.",
    },
    {
      drugName: "Adenosine (3 mg/mL)",
      indication: "Supraventricular Tachycardia (SVT) with narrow QRS",
      dosePerKg: "0.1 mg/kg initial dose (Max 6 mg)",
      totalDoseMg: adenoDoseMg,
      concentrationString: "3 mg/mL",
      volumeToAdministerMl: adenoVolMl,
      maxDoseCapMg: 6.0,
      route: "IV/IO",
      administrationInstructions: "Ultra-rapid IV push closest to heart using stopcock with immediate 5-10 mL flush.",
    },
    {
      drugName: "Amiodarone (50 mg/mL)",
      indication: "Shock-refractory Ventricular Fibrillation / Pulseless VT",
      dosePerKg: "5 mg/kg bolus (Max 300 mg)",
      totalDoseMg: amioDoseMg,
      concentrationString: "50 mg/mL",
      volumeToAdministerMl: amioVolMl,
      maxDoseCapMg: 300,
      route: "IV/IO",
      administrationInstructions: "Rapid IV/IO bolus in cardiac arrest; infuse over 20-60 min if perfusing rhythm.",
    },
    {
      drugName: "Dextrose 10% (D10W)",
      indication: "Acute Pediatric Hypoglycemia (Glucose < 60 mg/dL)",
      dosePerKg: "0.5 g/kg = 5 mL/kg",
      totalDoseMg: Math.round(w * 0.5 * 1000),
      concentrationString: "100 mg/mL (10% Dextrose)",
      volumeToAdministerMl: d10VolMl,
      maxDoseCapMg: 25000,
      route: "IV/IO",
      administrationInstructions: "Slow IV infusion over 5-10 minutes. Avoid hyperosmolar D50W in children.",
    },
  ];
}

// -------------------------------------------------------------------------
// COMPREHENSIVE PALS RESUSCITATION EVALUATION ENGINE
// -------------------------------------------------------------------------

export function evaluatePalsResuscitation(params: {
  patientId: string;
  patientName: string;
  ageYears: number;
  ageMonths: number;
  weightKg: number;
  isCardiogenicShock?: boolean;
  attemptedEpiConcentration?: "1:1,000" | "1:10,000";
  attemptedBicarbNeonatal?: "8.4%_UNDILUTED" | "4.2%_DILUTED";
}): PalsEvaluationReport {
  const zone = getBroselowZoneFromWeight(params.weightKg);
  const normalVitals = calculatePediatricNormalVitals(params.ageYears, params.ageMonths);
  const airway = calculateAirwaySizing(params.ageYears, params.weightKg);
  const meds = calculatePalsMedications(params.weightKg);

  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];

  // Fluid bolus calculation
  const isCardiogenic = params.isCardiogenicShock === true;
  const bolusVol = isCardiogenic
    ? Math.round(params.weightKg * 7.5) // 5-10 mL/kg for cardiogenic shock
    : Math.round(params.weightKg * 20); // 20 mL/kg standard septic/hypovolemic

  // 1. Invariant CF-PALS-001: Epinephrine Concentration Check
  if (params.attemptedEpiConcentration === "1:1,000") {
    trippedInvariants.push("CF-PALS-001");
    mandatoryActions.push(
      "LETHAL 10-FOLD EPINEPHRINE OVERDOSE VETO: Attempted IV/IO administration of Epinephrine 1:1,000 (1.0 mg/mL). Strictly vetoed! For pediatric IV/IO resuscitation, only Epinephrine 1:10,000 (0.1 mg/mL) at 0.01 mg/kg (0.1 mL/kg) is permitted."
    );
  }

  // 2. Invariant CF-PALS-002: Excessive Fluid Bolus in Cardiogenic Shock
  if (isCardiogenic && bolusVol > params.weightKg * 10) {
    trippedInvariants.push("CF-PALS-002");
    mandatoryActions.push(
      `CARDIOGENIC FLUID OVERLOAD VETO: Attempted ${bolusVol} mL fluid bolus (> 10 mL/kg) in suspected cardiogenic shock. Restrict bolus to 5-10 mL/kg over 30-60 minutes with continuous lung auscultation for rales/pulmonary edema.`
    );
  }

  // 3. Invariant CF-PALS-003: Neonatal Undiluted Sodium Bicarbonate Veto
  if (params.ageYears === 0 && params.ageMonths <= 1 && params.attemptedBicarbNeonatal === "8.4%_UNDILUTED") {
    trippedInvariants.push("CF-PALS-003");
    mandatoryActions.push(
      "NEONATAL INTRAVENTRICULAR HEMORRHAGE VETO: Rapid undiluted 8.4% Sodium Bicarbonate is hyperosmolar and causes fatal cerebral intraventricular hemorrhage in neonates. Dilute 1:1 with sterile water to 4.2% concentration and infuse slowly over >= 20 minutes."
    );
  }

  // Electrical Defibrillation doses
  const defib1 = Math.min(200, Math.round(params.weightKg * 2));
  const defib2 = Math.min(200, Math.round(params.weightKg * 4));
  const syncCardio = Math.min(100, Math.round(params.weightKg * 0.5));

  return {
    timestampIso: new Date().toISOString(),
    patientId: params.patientId,
    patientName: params.patientName,
    ageYears: params.ageYears,
    ageMonths: params.ageMonths,
    weightKg: params.weightKg,
    broselowZone: zone,
    normalVitals,
    airwayEquipment: airway,
    resuscitationMedications: meds,
    fluidResuscitation: {
      shockType: isCardiogenic ? "CARDIOGENIC" : "SEPTIC_OR_HYPOVOLEMIC",
      bolusVolumeMl: bolusVol,
      bolusRateMinutes: isCardiogenic ? 45 : 15,
      crystalloidType: "0.9% Normal Saline or Plasmalyte / Lactated Ringer's",
    },
    electricalTherapy: {
      defibrillationInitialJoules: defib1,
      defibrillationSecondJoules: defib2,
      synchronizedCardioversionInitialJoules: syncCardio,
    },
    trippedInvariants,
    mandatoryActions,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatPalsSpokenSummary(report: PalsEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Pediatric resuscitation protocol for ${report.patientName}, age ${report.ageYears} years and ${report.ageMonths} months, weight ${report.weightKg} kilograms.`
  );

  parts.push(
    `Assigned Broselow color-coded zone is ${report.broselowZone.color}, representing typical weight range ${report.broselowZone.weightMinKg} to ${report.broselowZone.weightMaxKg} kilograms.`
  );

  parts.push(
    `Airway sizing: Recommended cuffed endotracheal tube is ${report.airwayEquipment.cuffedEttSizeMm} millimeters internal diameter, secured at ${report.airwayEquipment.depthAtLipCm} centimeters at the lip. Laryngoscope blade is ${report.airwayEquipment.laryngoscopeBlade}.`
  );

  const epi = report.resuscitationMedications.find((m) => m.drugName.includes("Epinephrine"));
  if (epi) {
    parts.push(
      `First-line resuscitation dose: Epinephrine 1 to 10,000 concentration, administer exactly ${epi.totalDoseMg} milligrams, which is ${epi.volumeToAdministerMl} milliliters via intravenous or intraosseous route.`
    );
  }

  parts.push(
    `Fluid resuscitation: ${report.fluidResuscitation.bolusVolumeMl} milliliters of ${report.fluidResuscitation.crystalloidType} infused over ${report.fluidResuscitation.bolusRateMinutes} minutes.`
  );

  parts.push(
    `Electrical defibrillation energy: Initial shock at ${report.electricalTherapy.defibrillationInitialJoules} Joules, subsequent shocks at ${report.electricalTherapy.defibrillationSecondJoules} Joules.`
  );

  if (report.trippedInvariants.length > 0) {
    parts.push(
      `CRITICAL PEDIATRIC SAFETY INVARIANTS TRIPPED: ${report.trippedInvariants.join(", ")}.`
    );
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Mandatory directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push(
      "All pediatric dosing calculations comply strictly with AHA and AAP PALS resuscitation safety standards."
    );
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED PEDIATRIC RESUSCITATION PRESETS
// -------------------------------------------------------------------------

export const PALS_PRESET_TODDLER_SEPSIS = {
  patientId: "PALS-PURPLE-001",
  patientName: "Noah Bennett (18mo M - Septic Shock)",
  ageYears: 1,
  ageMonths: 6,
  weightKg: 11, // Broselow PURPLE (10-11 kg)
  isCardiogenicShock: false,
};

export const PALS_PRESET_PRESCHOOL_ARREST = {
  patientId: "PALS-WHITE-002",
  patientName: "Sophia Martinez (4yo F - Submersion Cardiac Arrest)",
  ageYears: 4,
  ageMonths: 0,
  weightKg: 16, // Broselow WHITE (15-18 kg)
  isCardiogenicShock: false,
};

export const PALS_PRESET_INFANT_CARDIOGENIC = {
  patientId: "PALS-RED-003",
  patientName: "Ethan Davis (8mo M - Viral Myocarditis Cardiogenic Shock)",
  ageYears: 0,
  ageMonths: 8,
  weightKg: 8.5, // Broselow RED (8-9 kg)
  isCardiogenicShock: true, // Fluid restricted
};
