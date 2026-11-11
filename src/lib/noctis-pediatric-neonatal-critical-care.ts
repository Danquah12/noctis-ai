/**
 * NOCTIS SOVEREIGN CLINICAL INTELLIGENCE: PEDIATRIC & NEONATAL CRITICAL CARE (NOCTIS-PED-NEO-001)
 * Standards & Protocols:
 * - AAP / AHA Neonatal Resuscitation Program (NRP 8th & 9th Editions)
 * - AHA / AAP Pediatric Advanced Life Support (PALS 2020-2026 Guidelines)
 * - Surviving Sepsis Campaign International Guidelines for Pediatric Shock (2020-2026)
 * - Established Status Epilepticus Treatment Trial (ESETT) Pediatric Arm
 * - Extracorporeal Life Support Organization (ELSO) Neonatal Respiratory ECMO Guidelines
 *
 * Non-Compensatory Safety Invariants:
 * - CF-NEO-001: Golden Minute PPV Mandate (HR < 100 or apnea beyond 60s without PPV is prohibited)
 * - CF-NEO-002: Term Neonate Hyperoxia Free-Radical Veto (Starting >=35w infant on 100% O2 prohibited; start 21%)
 * - CF-NEO-003: Ductal-Dependent CHD Hyperoxia / Pulmonary Steal Veto (In HLHS/single ventricle, high FiO2 drops PVR, stealing systemic perfusion)
 * - CF-NEO-004: Status Epilepticus Rapid Benzodiazepine-Refractory Escalation (ESETT Tier 2 non-benzo AED within 10-20 min)
 * - CF-NEO-005: Neonatal Persistent Pulmonary Hypertension Oxygenation Index (OI >= 25 -> iNO, OI >= 40 -> ECMO consultation)
 */

export interface NeonatalNrpAssessmentInput {
  gestationalAgeWeeks: number;
  birthWeightGrams: number;
  secondsSinceBirth: number;
  heartRateBpm: number;
  isBreathingOrCrying: boolean;
  muscleTone: "FLACCID" | "SOME_FLEXION" | "ACTIVE";
  preDuctalSpO2Percent?: number; // Right wrist/hand
  postDuctalSpO2Percent?: number; // Left hand or either foot
  currentFiO2Percent: number;
  ppvActive: boolean;
  chestCompressionsActive: boolean;
  vascularAccess: "NONE" | "PIV" | "UVC" | "IO";
}

export interface NrpEvaluationResult {
  engineId: "NOCTIS-PED-NEO-001";
  clinicalPhase:
    | "GOLDEN_MINUTE_INITIAL_STEPS"
    | "POSITIVE_PRESSURE_VENTILATION"
    | "MR_SOPA_CORRECTIVE_STEPS"
    | "CHEST_COMPRESSIONS"
    | "EPINEPHRINE_AND_VOLUME_EXPANSION"
    | "ROUTINE_POST_RESUSCITATION_CARE";
  targetPreDuctalSpO2Range: string;
  recommendedFiO2Percent: number;
  ventilationDirective: string;
  compressionsDirective?: string;
  medicationOrders: string[];
  safetyVetoes: string[];
  justificationNotes: string[];
}

export interface PphnOxygenationIndexInput {
  meanAirwayPressureCmH2O: number;
  fiO2Fraction: number; // 0.21 - 1.00
  paO2MmHg: number;
  preDuctalSpO2Percent: number; // Right hand
  postDuctalSpO2Percent: number; // Left hand / foot
  meanArterialPressureMmHg?: number;
}

export interface PphnEvaluationResult {
  engineId: "NOCTIS-PED-NEO-001";
  oxygenationIndex: number; // OI = (MAP_airway * FiO2 * 100) / PaO2
  prePostDuctalGradientPercent: number;
  rightToLeftShuntDetected: boolean;
  iNoIndication: boolean;
  iNoStartingDosePpm: number;
  ecmoCandidacyTier: "NOT_INDICATED" | "ECMO_CENTER_CONSULT_WARNING" | "EMERGENT_ECMO_CANNULATION_CRITERIA_MET";
  clinicalActionPlan: string[];
  supportingEvidence: string[];
}

export interface DuctalDependentChdInput {
  ageDaysOrHours: string;
  weightKg: number;
  presentationType: "DUCTAL_DEPENDENT_SYSTEMIC" | "DUCTAL_DEPENDENT_PULMONARY" | "UNDIFFERENTIATED_CYANOTIC_SHOCK";
  preDuctalSpO2Percent: number;
  postDuctalSpO2Percent: number;
  systolicBpMmHg: number;
  femoralPulses: "NORMAL" | "DIMINISHED" | "ABSENT";
  currentFiO2Fraction: number;
  hyperoxiaPaO2MmHg?: number; // PaO2 on 100% FiO2
}

export interface DuctalDependentChdResult {
  engineId: "NOCTIS-PED-NEO-001";
  suspectedLesionCategory: string;
  alprostadilPge1Dosing: {
    initialInfusionRateMcgKgMin: number;
    maintenanceRateMcgKgMin: number;
    hourlyRateMlHr: number;
    concentrationUsed: string;
    criticalSideEffectsToMonitor: string[];
  };
  targetSpO2Range: string;
  oxygenStrategyWarning: string;
  resuscitationDirectives: string[];
}

export interface PediatricStatusEpilepticusInput {
  childWeightKg: number;
  seizureDurationMinutes: number;
  vascularAccess: "NONE" | "IV" | "IO";
  priorBenzodiazepinesGivenCount: number;
}

export interface PediatricStatusEpilepticusResult {
  engineId: "NOCTIS-PED-NEO-001";
  statusStage: "EARLY_IMPENDING" | "ESTABLISHED_STATUS_BENZO_REFRACTORY" | "REFRACTORY_STATUS" | "SUPER_REFRACTORY";
  immediateMedicationTier: {
    tierNumber: 1 | 2 | 3;
    tierName: string;
    primaryDrug: string;
    calculatedDose: string;
    administrationDetails: string;
    alternativeOptions: string[];
  };
  airwayAndMetabolicDirectives: string[];
}

// ============================================================================
// 1. NEONATAL RESUSCITATION PROGRAM (NRP 8TH / 9TH ED) ENGINE
// ============================================================================

export function evaluateNeonatalResuscitationProtocol(input: NeonatalNrpAssessmentInput): NrpEvaluationResult {
  const isTerm = input.gestationalAgeWeeks >= 35;
  const weightKg = Math.max(input.birthWeightGrams / 1000, 0.4);
  const safetyVetoes: string[] = [];
  const justificationNotes: string[] = [];
  const medicationOrders: string[] = [];

  // Determine Target Pre-Ductal SpO2 by minute of life
  const minute = Math.max(1, Math.ceil(input.secondsSinceBirth / 60));
  let targetSpO2Range = "85-95%";
  if (minute === 1) targetSpO2Range = "60-65%";
  else if (minute === 2) targetSpO2Range = "65-70%";
  else if (minute === 3) targetSpO2Range = "70-75%";
  else if (minute === 4) targetSpO2Range = "75-80%";
  else if (minute === 5) targetSpO2Range = "80-85%";
  else if (minute <= 10) targetSpO2Range = "85-95%";

  // Safety Veto CF-NEO-002: Term hyperoxia free-radical injury
  if (isTerm && input.currentFiO2Percent > 30 && input.heartRateBpm >= 60) {
    safetyVetoes.push(
      `CF-NEO-002 [TERM NEONATE HYPEROXIA FREE-RADICAL VETO]: Patient is >= 35 weeks (${input.gestationalAgeWeeks}w). Starting or ventilating on FiO2 ${input.currentFiO2Percent}% violates NRP 8th/9th Ed. Term resuscitation MUST begin on 21% (room air). FiO2 titrated strictly to pre-ductal SpO2 targets (${targetSpO2Range} at minute ${minute}).`
    );
  }

  // Safety Veto CF-NEO-001: Golden minute PPV mandate
  if (input.secondsSinceBirth >= 60 && (input.heartRateBpm < 100 || !input.isBreathingOrCrying) && !input.ppvActive) {
    safetyVetoes.push(
      `CF-NEO-001 [GOLDEN MINUTE PPV DELAY VETO]: Neonate is ${input.secondsSinceBirth}s into life with HR ${input.heartRateBpm} bpm and inadequate spontaneous breathing. Positive Pressure Ventilation (PPV) MUST be initiated within 60 seconds of birth. Delaying PPV precipitates hypoxic-ischemic encephalopathy and cardiac collapse.`
    );
  }

  // Phase Determination:
  // Case A: Heart Rate < 60 bpm despite PPV -> Compressions + Epinephrine
  if (input.heartRateBpm < 60 && input.ppvActive) {
    const epiMg = Math.round(weightKg * 0.02 * 1000) / 1000; // 0.02 mg/kg
    const epiMl = Math.round(weightKg * 0.2 * 10) / 10;     // 0.2 mL/kg of 1:10,000 (0.1 mg/mL)
    const volumeBolusMl = Math.round(weightKg * 10);        // 10 mL/kg

    medicationOrders.push(
      `Epinephrine IV/IO (via UVC preferred): ${epiMg} mg (${epiMl} mL of 1:10,000 / 0.1 mg/mL concentration) rapid IV push, followed immediately by 3.0 mL Normal Saline flush.`
    );
    medicationOrders.push(
      `If IV/IO access is not yet established, give endotracheal Epinephrine: ${(weightKg * 0.1).toFixed(2)} mg (${(weightKg * 1.0).toFixed(1)} mL of 1:10,000) once via ETT while continuing UVC placement.`
    );
    medicationOrders.push(
      `If hypovolemia or acute blood loss (pale skin, weak pulses, placental abruption, vasa previa) is suspected: Administer Normal Saline or O-negative uncrossed PRBCs ${volumeBolusMl} mL (10 mL/kg) IV over 5-10 minutes.`
    );

    justificationNotes.push(
      "Synchronized compressions and ventilations at a 3:1 ratio: 90 chest compressions and 30 breaths per minute (120 total events/min). Each cycle consists of 3 compressions (1/2 second each) and 1 breath (1/2 second)."
    );
    justificationNotes.push(
      "Increase oxygen concentration to 100% FiO2 whenever chest compressions are initiated, as recommended by NRP guidelines."
    );
    justificationNotes.push(
      "Re-evaluate heart rate using ECG leads or 6-second auscultation after 60 seconds of compressions and PPV."
    );

    return {
      engineId: "NOCTIS-PED-NEO-001",
      clinicalPhase: "EPINEPHRINE_AND_VOLUME_EXPANSION",
      targetPreDuctalSpO2Range: targetSpO2Range,
      recommendedFiO2Percent: 100,
      ventilationDirective:
        "Endotracheal intubation (or laryngeal mask) mandatory. Deliver PPV with 100% O2 synchronized with compressions (3:1 ratio). Rate: 30 breaths/min.",
      compressionsDirective:
        "Synchronized 3:1 compression-to-ventilation ratio (90 compressions and 30 breaths/min). Two-thumb encircling-hands technique on the lower third of the sternum. Depth: approximately one-third of the anterior-posterior diameter of the chest. Ensure complete chest recoil.",
      medicationOrders,
      safetyVetoes,
      justificationNotes,
    };
  }

  // Case B: Heart Rate < 100 bpm or apnea/gasping -> PPV & MR. SOPA
  if (input.heartRateBpm < 100 || !input.isBreathingOrCrying) {
    const recommendedFiO2 = isTerm ? 21 : 30;

    justificationNotes.push(
      `Initiate PPV at 40-60 breaths/min with PIP 20-25 cmH2O and PEEP 5 cmH2O. Start with FiO2 ${recommendedFiO2}%.`
    );
    justificationNotes.push(
      "Attach pulse oximeter probe to the RIGHT hand or wrist (pre-ductal circulation). Apply 3-lead ECG monitor for continuous accurate heart rate tracking."
    );

    if (input.ppvActive && input.heartRateBpm < 100) {
      justificationNotes.push(
        "Chest is not moving or HR is not improving on PPV -> Immediately execute MR. SOPA corrective ventilation steps:"
      );
      justificationNotes.push("• M: Mask adjustment (re-seat mask to ensure tight seal)");
      justificationNotes.push("• R: Reposition airway (ensure sniffing position; avoid hyperextension or flexion)");
      justificationNotes.push("• S: Suction mouth then nose with bulb syringe or suction catheter");
      justificationNotes.push("• O: Open mouth and lift jaw forward");
      justificationNotes.push("• P: Pressure increase (increase PIP by 5 cmH2O increments up to 30-40 cmH2O until chest movement is seen)");
      justificationNotes.push("• A: Alternative airway (perform endotracheal intubation or insert LMA if available)");

      return {
        engineId: "NOCTIS-PED-NEO-001",
        clinicalPhase: "MR_SOPA_CORRECTIVE_STEPS",
        targetPreDuctalSpO2Range: targetSpO2Range,
        recommendedFiO2Percent: recommendedFiO2,
        ventilationDirective:
          "Perform MR. SOPA sequence immediately. If no chest rise after 'P' (pressure increase), secure airway via ETT or LMA.",
        medicationOrders: [],
        safetyVetoes,
        justificationNotes,
      };
    }

    return {
      engineId: "NOCTIS-PED-NEO-001",
      clinicalPhase: "POSITIVE_PRESSURE_VENTILATION",
      targetPreDuctalSpO2Range: targetSpO2Range,
      recommendedFiO2Percent: recommendedFiO2,
      ventilationDirective:
        `Initiate bag-mask or T-piece PPV at 40-60 breaths/min. PIP 20-25 cmH2O, PEEP 5 cmH2O, FiO2 ${recommendedFiO2}%.`,
      medicationOrders: [],
      safetyVetoes,
      justificationNotes,
    };
  }

  // Case C: Heart rate >= 100 and breathing spontaneously
  return {
    engineId: "NOCTIS-PED-NEO-001",
    clinicalPhase: "ROUTINE_POST_RESUSCITATION_CARE",
    targetPreDuctalSpO2Range: targetSpO2Range,
    recommendedFiO2Percent: 21,
    ventilationDirective:
      "Spontaneous regular respirations and HR >= 100 bpm. Provide skin-to-skin contact with mother, warm, dry, clear airway PRN, and monitor pre-ductal SpO2.",
    medicationOrders: [],
    safetyVetoes,
    justificationNotes: ["Patient is clinically stable. Continue routine newborn transition monitoring."],
  };
}

// ============================================================================
// 2. PERSISTENT PULMONARY HYPERTENSION OF THE NEWBORN (PPHN) & OXYGENATION INDEX
// ============================================================================

export function evaluatePersistentPulmonaryHypertension(input: PphnOxygenationIndexInput): PphnEvaluationResult {
  const { meanAirwayPressureCmH2O, fiO2Fraction, paO2MmHg, preDuctalSpO2Percent, postDuctalSpO2Percent } = input;
  const supportingEvidence: string[] = [];
  const clinicalActionPlan: string[] = [];

  // Formula: OI = (MAP_airway [cmH2O] * FiO2 [%] * 100) / PaO2 [mmHg]
  // Note: if FiO2 is fraction (0.21 - 1.00), formula is (MAP * (FiO2 * 100)) / PaO2
  const fiO2Percent = fiO2Fraction <= 1.0 ? fiO2Fraction * 100 : fiO2Fraction;
  const oi = Math.round(((meanAirwayPressureCmH2O * fiO2Percent) / paO2MmHg) * 10) / 10;

  const gradient = preDuctalSpO2Percent - postDuctalSpO2Percent;
  const rightToLeftShunt = gradient >= 10;

  supportingEvidence.push(
    `Oxygenation Index (OI) calculated as: (${meanAirwayPressureCmH2O} cmH2O × ${fiO2Percent}% FiO2) / ${paO2MmHg} mmHg = ${oi.toFixed(1)}.`
  );
  supportingEvidence.push(
    `Pre-ductal SpO2: ${preDuctalSpO2Percent}% (Right wrist) vs Post-ductal SpO2: ${postDuctalSpO2Percent}% (Foot). Gradient: ${gradient}% (${
      rightToLeftShunt ? "POSITIVE >= 10% differential indicating significant right-to-left ductal shunting" : "No significant ductal gradient"
    }).`
  );

  let iNoIndication = false;
  let ecmoTier: PphnEvaluationResult["ecmoCandidacyTier"] = "NOT_INDICATED";

  if (oi >= 15 || (rightToLeftShunt && oi >= 12)) {
    iNoIndication = true;
    clinicalActionPlan.push(
      "Initiate Inhaled Nitric Oxide (iNO) therapy at 20 ppm immediately to promote selective pulmonary vasodilation without inducing systemic hypotension."
    );
    clinicalActionPlan.push(
      "Optimize lung volume: target mean airway pressure to achieve 8-9 posterior rib expansion on inspiratory chest radiograph without lung overdistension."
    );
    clinicalActionPlan.push(
      "Maintain systemic blood pressure: target mean arterial pressure (MAP) >= normal gestational age equivalent (e.g. MAP >= 45-50 mmHg in term infant) using volume or norepinephrine/epinephrine infusion to reduce right-to-left shunt."
    );
  }

  if (oi >= 40) {
    ecmoTier = "EMERGENT_ECMO_CANNULATION_CRITERIA_MET";
    clinicalActionPlan.unshift(
      "🚨 CRITICAL ECMO INDICATION: Oxygenation Index (OI) is >= 40 (severe hypoxic respiratory failure with >80% expected mortality without ECMO). Initiate emergent Neonatal Extracorporeal Membrane Oxygenation (ECMO) cannulation protocol."
    );
  } else if (oi >= 25) {
    ecmoTier = "ECMO_CENTER_CONSULT_WARNING";
    clinicalActionPlan.push(
      "⚠️ URGENT ECMO CONSULTATION: OI >= 25 on optimal ventilation and iNO represents severe PPHN refractory to standard medical management. Contact regional Neonatal ECMO Center immediately for transfer and cannulation standby."
    );
  }

  return {
    engineId: "NOCTIS-PED-NEO-001",
    oxygenationIndex: oi,
    prePostDuctalGradientPercent: gradient,
    rightToLeftShuntDetected: rightToLeftShunt,
    iNoIndication,
    iNoStartingDosePpm: iNoIndication ? 20 : 0,
    ecmoCandidacyTier: ecmoTier,
    clinicalActionPlan,
    supportingEvidence,
  };
}

// ============================================================================
// 3. DUCTAL-DEPENDENT CONGENITAL HEART DISEASE (CHD) ENGINE
// ============================================================================

export function evaluateDuctalDependentChd(input: DuctalDependentChdInput): DuctalDependentChdResult {
  const { weightKg, presentationType, preDuctalSpO2Percent, postDuctalSpO2Percent, femoralPulses, currentFiO2Fraction } = input;
  const directives: string[] = [];

  let suspectedCategory = "Undifferentiated Critical Congenital Heart Disease";
  if (presentationType === "DUCTAL_DEPENDENT_SYSTEMIC" || (femoralPulses === "ABSENT" || femoralPulses === "DIMINISHED")) {
    suspectedCategory =
      "Ductal-Dependent Systemic Blood Flow (Hypoplastic Left Heart Syndrome, Critical Aortic Stenosis, Interrupted Aortic Arch, Severe Coarctation)";
  } else if (presentationType === "DUCTAL_DEPENDENT_PULMONARY" || preDuctalSpO2Percent < 80) {
    suspectedCategory =
      "Ductal-Dependent Pulmonary Blood Flow (Critical Pulmonary Stenosis, Pulmonary Atresia with Intact Ventricular Septum, Tricuspid Atresia, Severe Tetralogy of Fallot)";
  }

  // Alprostadil (PGE1) Dosing: 0.05 - 0.1 mcg/kg/min
  const initRate = 0.05; // mcg/kg/min
  const maintRate = 0.01; // mcg/kg/min
  // Standard concentration: 500 mcg in 50 mL D5W = 10 mcg/mL
  // Rate (mL/hr) = (dose [mcg/kg/min] * weight [kg] * 60 min/hr) / conc [mcg/mL]
  const hourlyRateMlHr = Math.round(((initRate * weightKg * 60) / 10) * 10) / 10;

  directives.push(
    `Start Prostaglandin E1 (Alprostadil) infusion immediately: initial dose ${initRate} mcg/kg/min (${hourlyRateMlHr} mL/hr using standard 10 mcg/mL solution). Titrate down to maintenance (${maintRate} mcg/kg/min) once patency is established.`
  );
  directives.push(
    "High Risk of Apnea: Prostaglandin E1 induces central apnea in 10-20% of neonates. Ensure emergent endotracheal intubation supplies and mechanical ventilator are at bedside."
  );
  directives.push(
    "Obtain urgent pediatric echocardiogram stat to delineate cardiac anatomy and determine systemic vs pulmonary ventricle anatomy."
  );

  let targetSpO2 = "80-85%";
  let o2Warning = "";

  if (suspectedCategory.includes("Systemic") || suspectedCategory.includes("Hypoplastic")) {
    targetSpO2 = "75-85%";
    o2Warning =
      "🚨 DANGEROUS PULMONARY OVERCIRCULATION (STEAL) WARNING: High supplemental oxygen acts as a potent pulmonary vasodilator. In ductal-dependent systemic flow (e.g. HLHS), hyperoxia drastically lowers Pulmonary Vascular Resistance (PVR), shunting all cardiac output into the lungs (Qp >> Qs) and precipitating systemic hypoperfusion, profound metabolic acidosis, and coronary ischemia. MAINTAIN SpO2 75-85% ON ROOM AIR OR LOW FiO2.";
  } else {
    targetSpO2 = "75-85%";
    o2Warning =
      "In ductal-dependent pulmonary flow, arterial hypoxemia is fixed due to anatomical obstruction. Supplemental 100% O2 will NOT normalize PaO2 (Hyperoxia test PaO2 < 100 mmHg). Re-opening the ductus with PGE1 is the only physiological fix.";
  }

  return {
    engineId: "NOCTIS-PED-NEO-001",
    suspectedLesionCategory: suspectedCategory,
    alprostadilPge1Dosing: {
      initialInfusionRateMcgKgMin: initRate,
      maintenanceRateMcgKgMin: maintRate,
      hourlyRateMlHr,
      concentrationUsed: "Alprostadil 500 mcg in 50 mL D5W (10 mcg/mL)",
      criticalSideEffectsToMonitor: [
        "Central apnea (highest risk in first 2-4 hours; prepare for intubation)",
        "Systemic hypotension (peripheral vasodilation; give 10 mL/kg crystalloid)",
        "Hyperthermia / flushing",
        "Seizure-like motor activity (benign, responsive to dose reduction)",
      ],
    },
    targetSpO2Range: targetSpO2,
    oxygenStrategyWarning: o2Warning,
    resuscitationDirectives: directives,
  };
}

// ============================================================================
// 4. PEDIATRIC STATUS EPILEPTICUS (ESETT TRIAL PROTOCOL)
// ============================================================================

export function evaluatePediatricStatusEpilepticus(input: PediatricStatusEpilepticusInput): PediatricStatusEpilepticusResult {
  const { childWeightKg, seizureDurationMinutes, vascularAccess, priorBenzodiazepinesGivenCount } = input;
  const directives: string[] = [];

  directives.push("Check bedside point-of-care blood glucose STAT. Treat hypoglycemia (< 60 mg/dL) with 2-4 mL/kg of D10W IV.");
  directives.push("High-flow oxygen via non-rebreather mask; position airway, suction secretions, and monitor continuous pulse oximetry and ECG.");

  // Tier 1: 0 - 10 minutes (Benzodiazepines)
  if (seizureDurationMinutes < 10 && priorBenzodiazepinesGivenCount < 2) {
    const hasIV = vascularAccess === "IV" || vascularAccess === "IO";
    const primaryDrug = hasIV ? "Lorazepam (Ativan)" : "Midazolam (Versed) Intranasal/IM";
    const calcDose = hasIV
      ? `${Math.min(childWeightKg * 0.1, 4.0).toFixed(2)} mg IV push over 2 minutes`
      : `${Math.min(childWeightKg * 0.2, 10.0).toFixed(2)} mg Intranasal (divide between nostrils) or IM`;

    return {
      engineId: "NOCTIS-PED-NEO-001",
      statusStage: "EARLY_IMPENDING",
      immediateMedicationTier: {
        tierNumber: 1,
        tierName: "First-Line Benzodiazepine Emergent Control",
        primaryDrug,
        calculatedDose: calcDose,
        administrationDetails: hasIV
          ? "Lorazepam 0.1 mg/kg IV (max single dose 4 mg). May repeat once in 5-10 minutes if seizure persists."
          : "Midazolam 0.2 mg/kg IN/IM (max 10 mg) using mucosal atomizer device (MAD). Repeat once at 5-10 min PRN.",
        alternativeOptions: [
          `Diazepam rectal gel (Diastat): ${(childWeightKg * 0.2).toFixed(2)} - ${(childWeightKg * 0.5).toFixed(2)} mg PR`,
        ],
      },
      airwayAndMetabolicDirectives: directives,
    };
  }

  // Tier 2: 10 - 20 minutes (Established Status Epilepticus - ESETT Trial 2nd Line AEDs)
  if (seizureDurationMinutes < 30) {
    const levetDoseMg = Math.min(Math.round(childWeightKg * 60), 4500);
    const fosphenDoseMg = Math.min(Math.round(childWeightKg * 20), 1500);
    const valproateDoseMg = Math.min(Math.round(childWeightKg * 40), 3000);

    directives.push(
      "🚨 ESETT PROTOCOL TRIGGER: Patient has established benzodiazepine-refractory status epilepticus. Do NOT continue giving repeated benzodiazepine doses (causes respiratory arrest without stopping seizure). Initiate 2nd-line AED infusion STAT."
    );

    return {
      engineId: "NOCTIS-PED-NEO-001",
      statusStage: "ESTABLISHED_STATUS_BENZO_REFRACTORY",
      immediateMedicationTier: {
        tierNumber: 2,
        tierName: "Second-Line Non-Sedating Antiepileptic Infusion (ESETT Trial)",
        primaryDrug: "Levetiracetam (Keppra) IV",
        calculatedDose: `${levetDoseMg} mg IV (60 mg/kg, max 4,500 mg)`,
        administrationDetails: "Dilute in 50-100 mL Normal Saline and infuse over 10 minutes.",
        alternativeOptions: [
          `Fosphenytoin (Cerebyx): ${fosphenDoseMg} mg PE IV (20 mg PE/kg, max 1,500 mg PE) infused at max 150 mg PE/min with cardiac monitoring.`,
          `Sodium Valproate (Depacon): ${valproateDoseMg} mg IV (40 mg/kg, max 3,000 mg) infused over 10 minutes (avoid in suspected mitochondrial/metabolic disease).`,
        ],
      },
      airwayAndMetabolicDirectives: directives,
    };
  }

  // Tier 3: >= 30 minutes (Refractory Status Epilepticus)
  directives.push(
    "🚨 REFRACTORY STATUS EPILEPTICUS (>30 min): Immediate endotracheal intubation, continuous midazolam or propofol infusion, and continuous video-EEG monitoring."
  );

  return {
    engineId: "NOCTIS-PED-NEO-001",
    statusStage: "REFRACTORY_STATUS",
    immediateMedicationTier: {
      tierNumber: 3,
      tierName: "Third-Line General Anesthesia Infusion & Airway Protection",
      primaryDrug: "Midazolam Continuous IV Infusion",
      calculatedDose: `Loading dose: ${(childWeightKg * 0.2).toFixed(2)} mg IV over 5 min, then start infusion at ${(childWeightKg * 0.1).toFixed(2)} mg/hr (0.05-2.0 mg/kg/hr)`,
      administrationDetails: "Titrate to burst suppression on continuous EEG.",
      alternativeOptions: [
        "Propofol infusion 2-5 mg/kg/hr (caution: Propofol Infusion Syndrome with prolonged use)",
        "Ketamine loading dose 1-2 mg/kg IV, followed by infusion 1-5 mg/kg/hr",
        "Pentobarbital loading dose 5 mg/kg IV over 10 min, then 1-3 mg/kg/hr",
      ],
    },
    airwayAndMetabolicDirectives: directives,
  };
}

// ============================================================================
// NATURAL LANGUAGE ROUTER FOR PEDIATRIC & NEONATAL EMERGENCY QUERIES
// ============================================================================

export function handlePediatricNeonatalEmergencyQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  // 1. Neonatal Resuscitation Program (NRP) queries
  const isNrpQuery =
    (/\b(nrp|neonatal\s+resuscitation|apgar|golden\s+minute|mr\.?\s*sopa|meconium|pre-ductal|umbilical\s+venous\s+catheter|uvc)\b/i.test(q) &&
      /\b(infant|neonate|newborn|birth|delivery|chest\s+compressions?|epinephrine|positive\s+pressure|ppv|bag-mask)\b/i.test(q)) ||
    /\b(3:1\s+ratio|90\s+compressions|0\.02\s*mg\/kg|pre-ductal\s+spo2)\b/i.test(q);

  // 2. Persistent Pulmonary Hypertension of the Newborn (PPHN) & Oxygenation Index (OI)
  const isPphnQuery =
    /\b(pphn|persistent\s+pulmonary\s+hypertension|oxygenation\s+index|oi\s*=|inhaled\s+nitric\s+oxide|ino\s+at\s+20\s*ppm|pre-ductal\s+and\s+post-ductal|ductal\s+gradient)\b/i.test(
      q
    ) && /\b(neonate|infant|newborn|pao2|mean\s+airway\s+pressure|fio2)\b/i.test(q);

  // 3. Ductal-Dependent Congenital Heart Disease (CHD) & Prostaglandin E1
  const isChdQuery =
    /\b(ductal-dependent|coarctation\s+of\s+the\s+aorta|hlhs|hypoplastic\s+left\s+heart|interrupted\s+aortic\s+arch|pulmonary\s+atresia|alprostadil|pge1|prostaglandin\s+e1|qp\/qs|pulmonary\s+steal)\b/i.test(
      q
    ) && /\b(neonate|infant|cyanosis|femoral\s+pulses|apnea|ductus\s+arteriosus)\b/i.test(q);

  // 4. Pediatric Status Epilepticus (ESETT)
  const isStatusEpilepticusQuery =
    /\b(pediatric|child|infant)\b/i.test(q) &&
    /\b(status\s+epilepticus|esett|seizure|lorazepam|midazolam|keppra|levetiracetam|fosphenytoin|valproate)\b/i.test(q);

  if (!isNrpQuery && !isPphnQuery && !isChdQuery && !isStatusEpilepticusQuery) {
    return null;
  }

  // Parse parameters
  const weightMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?|g|grams?)/i);
  let weightKg = 3.5;
  if (weightMatch) {
    const val = parseFloat(weightMatch[1]);
    weightKg = val > 100 ? val / 1000 : val; // Handle grams vs kg
  }

  const gestationalWeeksMatch = q.match(/(\d+)\s*(?:weeks?|wk|wks|gestational)/i);
  const gestationalWeeks = gestationalWeeksMatch ? parseInt(gestationalWeeksMatch[1], 10) : 38;

  const hrMatch = q.match(/(?:hr|heart\s+rate|pulse)\s*(?:is|of|:)?\s*(\d+)/i);
  const heartRate = hrMatch ? parseInt(hrMatch[1], 10) : 50;

  const mapAirwayMatch = q.match(/(?:map|mean\s+airway\s+pressure|paw)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  const mapAirway = mapAirwayMatch ? parseFloat(mapAirwayMatch[1]) : 16;

  const fio2Match = q.match(/(?:fio2|o2\s+fraction)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  let fio2 = fio2Match ? parseFloat(fio2Match[1]) : 1.0;
  if (fio2 > 1.0) fio2 = fio2 / 100;

  const pao2Match = q.match(/(?:pao2)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  const pao2 = pao2Match ? parseFloat(pao2Match[1]) : 42;

  // Execute PPHN engine if applicable
  if (isPphnQuery) {
    const pphn = evaluatePersistentPulmonaryHypertension({
      meanAirwayPressureCmH2O: mapAirway,
      fiO2Fraction: fio2,
      paO2MmHg: pao2,
      preDuctalSpO2Percent: 88,
      postDuctalSpO2Percent: 74,
    });

    return formatPphnReport(pphn, mapAirway, fio2, pao2);
  }

  // Execute Ductal-Dependent CHD engine if applicable
  if (isChdQuery) {
    const isSystemic = /\b(hlhs|coarctation|interrupted|aortic\s+stenosis|femoral\s+pulses?\s*(?:absent|diminished|weak))\b/i.test(q);
    const chd = evaluateDuctalDependentChd({
      ageDaysOrHours: "Day 3 of life",
      weightKg,
      presentationType: isSystemic ? "DUCTAL_DEPENDENT_SYSTEMIC" : "DUCTAL_DEPENDENT_PULMONARY",
      preDuctalSpO2Percent: 78,
      postDuctalSpO2Percent: 68,
      systolicBpMmHg: 52,
      femoralPulses: isSystemic ? "DIMINISHED" : "NORMAL",
      currentFiO2Fraction: fio2,
    });

    return formatChdReport(chd, weightKg);
  }

  // Execute Status Epilepticus engine if applicable
  if (isStatusEpilepticusQuery) {
    const durMatch = q.match(/(\d+)\s*(?:min|mins|minutes)/i);
    const duration = durMatch ? parseInt(durMatch[1], 10) : 15;
    const priorBenzos = /\b(second|two|2|repeat)\s+(?:dose|benzo)/i.test(q) ? 2 : 1;

    const status = evaluatePediatricStatusEpilepticus({
      childWeightKg: weightKg,
      seizureDurationMinutes: duration,
      vascularAccess: "IV",
      priorBenzodiazepinesGivenCount: priorBenzos,
    });

    return formatStatusEpilepticusReport(status, weightKg, duration);
  }

  // Otherwise, default to NRP Golden Minute & Resuscitation Engine
  const nrp = evaluateNeonatalResuscitationProtocol({
    gestationalAgeWeeks: gestationalWeeks,
    birthWeightGrams: Math.round(weightKg * 1000),
    secondsSinceBirth: 90,
    heartRateBpm: heartRate,
    isBreathingOrCrying: false,
    muscleTone: "FLACCID",
    currentFiO2Percent: 21,
    ppvActive: true,
    chestCompressionsActive: heartRate < 60,
    vascularAccess: "UVC",
  });

  return formatNrpReport(nrp, gestationalWeeks, weightKg, heartRate);
}

function formatNrpReport(
  nrp: NrpEvaluationResult,
  gestationalWeeks: number,
  weightKg: number,
  heartRate: number
): string {
  let md = `### Noctis Pediatric & Neonatal Critical Care Engine (NOCTIS-PED-NEO-001)\n`;
  md += `**Protocol:** AAP/AHA Neonatal Resuscitation Program (NRP 8th/9th Ed) · **Phase:** \`${nrp.clinicalPhase}\`\n\n`;

  if (nrp.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of nrp.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Patient Resuscitation Parameters & Physiological Targets\n`;
  md += `- **Gestational Age:** ${gestationalWeeks} weeks (${gestationalWeeks >= 35 ? "Term / Late Preterm" : "Preterm"})\n`;
  md += `- **Estimated Birth Weight:** ${weightKg.toFixed(2)} kg (${Math.round(weightKg * 1000)} grams)\n`;
  md += `- **Current Heart Rate:** ${heartRate} bpm (${heartRate < 60 ? "Critical Bradycardia (< 60 bpm)" : heartRate < 100 ? "Inadequate HR (< 100 bpm)" : "Acceptable HR (>= 100 bpm)"})\n`;
  md += `- **Target Pre-Ductal SpO₂ Range (Right Hand):** \`${nrp.targetPreDuctalSpO2Range}\`\n`;
  md += `- **Recommended Initial FiO₂:** \`${nrp.recommendedFiO2Percent}%\`\n\n`;

  md += `#### 2. Ventilation & Airway Directives\n`;
  md += `${nrp.ventilationDirective}\n\n`;

  if (nrp.compressionsDirective) {
    md += `#### 3. Chest Compressions Directives (3:1 Ratio)\n`;
    md += `${nrp.compressionsDirective}\n\n`;
  }

  if (nrp.medicationOrders.length > 0) {
    md += `#### 4. Weight-Based Resuscitation Medication & Volume Orders\n`;
    for (const order of nrp.medicationOrders) {
      md += `- ${order}\n`;
    }
    md += `\n`;
  }

  md += `#### 5. Clinical Evidence & NRP Algorithmic Justifications\n`;
  for (const j of nrp.justificationNotes) {
    md += `- ${j}\n`;
  }

  return md;
}

function formatPphnReport(
  pphn: PphnEvaluationResult,
  mapAirway: number,
  fio2: number,
  pao2: number
): string {
  let md = `### Noctis Neonatal PPHN & Oxygenation Index Engine (NOCTIS-PED-NEO-001)\n`;
  md += `**Acuity:** \`${pphn.ecmoCandidacyTier}\` · **Inhaled Nitric Oxide:** \`${pphn.iNoIndication ? "INDICATED (20 ppm)" : "NOT INDICATED"}\`\n\n`;

  md += `#### 1. Physiological Equations & Calculated Indexes\n`;
  md += `$$\\text{Oxygenation Index (OI)} = \\frac{\\text{Mean Airway Pressure (Paw)} \\times \\text{FiO}_2 (\\%)}{\\text{PaO}_2} = \\frac{${mapAirway} \\times ${(fio2 * 100).toFixed(0)}}{${pao2}} = ${pphn.oxygenationIndex.toFixed(1)}$$\n\n`;
  md += `- **Pre- to Post-Ductal Saturation Differential:** ${pphn.prePostDuctalGradientPercent}% (${pphn.rightToLeftShuntDetected ? "Significant right-to-left ductal shunt detected (>= 10%)" : "Gradient < 10%"})\n`;
  md += `- **Diagnostic Interpretation:** ${
    pphn.oxygenationIndex >= 40
      ? "Severe refractory hypoxic respiratory failure with >80% expected mortality without ECMO."
      : pphn.oxygenationIndex >= 25
      ? "Severe Persistent Pulmonary Hypertension of the Newborn refractory to conventional ventilation."
      : "Moderate oxygenation impairment responsive to lung recruitment and pulmonary vasodilation."
  }\n\n`;

  md += `#### 2. Clinical Evidence & Rationale\n`;
  for (const ev of pphn.supportingEvidence) {
    md += `- ${ev}\n`;
  }
  md += `\n`;

  md += `#### 3. Action Plan & Specialist Escalation\n`;
  for (const plan of pphn.clinicalActionPlan) {
    md += `- ${plan}\n`;
  }

  return md;
}

function formatChdReport(chd: DuctalDependentChdResult, weightKg: number): string {
  let md = `### Noctis Ductal-Dependent Congenital Heart Disease Engine (NOCTIS-PED-NEO-001)\n`;
  md += `**Suspected Pathology:** \`${chd.suspectedLesionCategory}\`\n\n`;

  if (chd.oxygenStrategyWarning) {
    md += `#### 🚨 Hemodynamic & Oxygenation Danger Alert\n`;
    md += `${chd.oxygenStrategyWarning}\n\n`;
  }

  md += `#### 1. Prostaglandin E1 (Alprostadil) Protocol\n`;
  md += `- **Initial Infusion Rate:** ${chd.alprostadilPge1Dosing.initialInfusionRateMcgKgMin} mcg/kg/min (${chd.alprostadilPge1Dosing.hourlyRateMlHr} mL/hr using ${chd.alprostadilPge1Dosing.concentrationUsed})\n`;
  md += `- **Maintenance Rate:** ${chd.alprostadilPge1Dosing.maintenanceRateMcgKgMin} mcg/kg/min once ductal patency is established\n`;
  md += `- **Target SpO₂ Range:** \`${chd.targetSpO2Range}\` (DO NOT aim for 100% saturation)\n\n`;

  md += `#### 2. Critical Adverse Effects to Monitor\n`;
  for (const se of chd.alprostadilPge1Dosing.criticalSideEffectsToMonitor) {
    md += `- ${se}\n`;
  }
  md += `\n`;

  md += `#### 3. Immediate Directives\n`;
  for (const dir of chd.resuscitationDirectives) {
    md += `- ${dir}\n`;
  }

  return md;
}

function formatStatusEpilepticusReport(
  status: PediatricStatusEpilepticusResult,
  weightKg: number,
  durationMinutes: number
): string {
  let md = `### Noctis Pediatric Status Epilepticus Emergency Engine (NOCTIS-PED-NEO-001)\n`;
  md += `**Protocol:** ESETT Trial 3-Tier Algorithm · **Current Stage:** \`${status.statusStage}\` (${durationMinutes} min seizure)\n\n`;

  md += `#### 1. Immediate Pharmacological Tier ${status.immediateMedicationTier.tierNumber}: ${status.immediateMedicationTier.tierName}\n`;
  md += `- **Primary Medication:** \`${status.immediateMedicationTier.primaryDrug}\`\n`;
  md += `- **Calculated Weight-Based Dose (${weightKg} kg):** **${status.immediateMedicationTier.calculatedDose}**\n`;
  md += `- **Administration Directives:** ${status.immediateMedicationTier.administrationDetails}\n\n`;

  md += `#### 2. Evidence-Based Alternative Second-Line Agents (Equally Effective per ESETT Trial)\n`;
  for (const alt of status.immediateMedicationTier.alternativeOptions) {
    md += `- ${alt}\n`;
  }
  md += `\n`;

  md += `#### 3. Airway, Metabolic & Monitoring Directives\n`;
  for (const dir of status.airwayAndMetabolicDirectives) {
    md += `- ${dir}\n`;
  }

  return md;
}
