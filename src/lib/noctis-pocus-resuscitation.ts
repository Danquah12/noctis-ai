/**
 * NOCTIS HEALTH 500 - POINT-OF-CARE ULTRASOUND (POCUS) & RESUSCITATION PROTOCOLS (TRACK 22)
 * Standards: ACEP Emergency Ultrasound Guidelines,
 *             E-FAST (Extended Focused Assessment with Sonography for Trauma),
 *             BLUE Protocol for Acute Dyspnea (Lichtenstein),
 *             RUSH Protocol for Shock (Weingart - Pump, Tank, Pipes)
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-POCUS-001: Tension Pneumothorax Immediate Needle/Finger Thoracostomy Veto (Never delay decompression for CT)
 * - CF-POCUS-002: Cardiac Tamponade Diastolic RV Collapse & Pericardiocentesis Veto
 * - CF-POCUS-003: Ruptured Abdominal Aortic Aneurysm (AAA) Emergent OR / Hybrid Suite Veto (Skip CT in shock)
 * - CF-POCUS-004: Fluid Overload Harm in Cardiogenic Shock Veto (Confluent B-lines + Plethoric IVC)
 */

export type EFastZone =
  | "RUQ_MORISONS_POUCH"
  | "LUQ_SPLENORENAL"
  | "PELVIC_SUPRAPUBIC"
  | "SUBXIPHOID_PERICARDIUM"
  | "RIGHT_ANTERIOR_THORAX"
  | "LEFT_ANTERIOR_THORAX"
  | "RIGHT_PLAPS_HEMOTHORAX"
  | "LEFT_PLAPS_HEMOTHORAX";

export type BlueLungProfile =
  | "A_PROFILE_NORMAL_COPD_ASTHMA_PE"
  | "B_PROFILE_CARDIOGENIC_PULMONARY_EDEMA"
  | "A_B_PROFILE_PNEUMONIA_CONSOLIDATION"
  | "C_PROFILE_ALVEOLAR_CONSOLIDATION"
  | "PNEUMOTHORAX_NO_SLIDING_WITH_LUNG_POINT";

export interface PocusExaminationProfile {
  patientId: string;
  patientName: string;
  clinicalPresentation: "TRAUMA_SHOCK" | "ACUTE_DYSPNEA" | "UNDIFFERENTIATED_HYPOTENSION";
  systolicBp: number;
  heartRateBpm: number;
  // E-FAST Findings
  morisonsPouchFreeFluid: boolean;
  splenorenalFreeFluid: boolean;
  suprapubicFreeFluid: boolean;
  pericardialEffusion: boolean;
  rightLungSlidingPresent: boolean;
  leftLungSlidingPresent: boolean;
  lungPointIdentified: boolean;
  hemothoraxIdentified: boolean;
  // Cardiac / RUSH Findings
  lvContractility: "HYPERDYNAMIC" | "NORMAL" | "MODERATELY_DEPRESSED" | "SEVERELY_DEPRESSED";
  rvDiastolicCollapse: boolean; // Tamponade hallmark
  ivcDiameterCm: number;
  ivcCollapsibilityPercent: number; // >50% = collapsible, <50% = plethoric
  // Vascular Pipes
  aortaMaxDiameterCm: number;
  dvtCompressionPositive: boolean; // Non-compressible vein = DVT
  // Proposed interventions to test invariants
  proposedIntervention?: "FLUID_BOLUS_1000ML" | "SEND_TO_CT_SCAN" | "EMERGENT_DECOMPRESSION" | "PERICARDIOCENTESIS" | "INOTROPES_DOBUTAMINE";
}

export interface PocusEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  shockEtiologyLikelihood: "OBSTRUCTIVE_TENSION_PTX" | "OBSTRUCTIVE_TAMPONADE" | "HEMORRHAGIC_HYPOVOLEMIC" | "CARDIOGENIC" | "DISTRIBUTIVE_SEPTIC" | "PULMONARY_EMBOLISM_MASSIVE";
  eFastSummary: {
    freeFluidAbdomen: boolean;
    pneumothoraxDetected: boolean;
    hemothoraxDetected: boolean;
    pericardialTamponadeSigns: boolean;
  };
  blueProfileClassification: BlueLungProfile;
  ivcVolumeStatus: "COLLAPSIBLE_HYPOVOLEMIC" | "NORMAL_EUVOLEMIC" | "PLETHORIC_OVERLOAD_OR_OBSTRUCTIVE";
  trippedInvariants: string[];
  mandatoryActions: string[];
}

// -------------------------------------------------------------------------
// POCUS EVALUATION ENGINE
// -------------------------------------------------------------------------

export function evaluatePocusResuscitation(exam: PocusExaminationProfile): PocusEvaluationReport {
  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];

  const freeFluidAbdomen = exam.morisonsPouchFreeFluid || exam.splenorenalFreeFluid || exam.suprapubicFreeFluid;
  const ptxDetected = !exam.rightLungSlidingPresent || !exam.leftLungSlidingPresent;
  const tamponadeSigns = exam.pericardialEffusion && exam.rvDiastolicCollapse;

  // Determine IVC status
  let ivcStatus: PocusEvaluationReport["ivcVolumeStatus"] = "NORMAL_EUVOLEMIC";
  if (exam.ivcDiameterCm < 1.5 && exam.ivcCollapsibilityPercent > 50) {
    ivcStatus = "COLLAPSIBLE_HYPOVOLEMIC";
  } else if (exam.ivcDiameterCm >= 2.1 && exam.ivcCollapsibilityPercent < 50) {
    ivcStatus = "PLETHORIC_OVERLOAD_OR_OBSTRUCTIVE";
  }

  // Determine BLUE lung profile
  let blueProfile: BlueLungProfile = "A_PROFILE_NORMAL_COPD_ASTHMA_PE";
  if (ptxDetected) {
    blueProfile = "PNEUMOTHORAX_NO_SLIDING_WITH_LUNG_POINT";
  } else if (exam.lvContractility === "SEVERELY_DEPRESSED" && ivcStatus === "PLETHORIC_OVERLOAD_OR_OBSTRUCTIVE") {
    blueProfile = "B_PROFILE_CARDIOGENIC_PULMONARY_EDEMA";
  } else if (exam.dvtCompressionPositive) {
    blueProfile = "A_PROFILE_NORMAL_COPD_ASTHMA_PE"; // A-profile with DVT = Pulmonary Embolism (Lichtenstein)
  }

  // Determine Primary Shock Etiology
  let shockEtiology: PocusEvaluationReport["shockEtiologyLikelihood"] = "DISTRIBUTIVE_SEPTIC";

  if (ptxDetected && exam.systolicBp < 90) {
    shockEtiology = "OBSTRUCTIVE_TENSION_PTX";
  } else if (tamponadeSigns && exam.systolicBp < 90) {
    shockEtiology = "OBSTRUCTIVE_TAMPONADE";
  } else if (freeFluidAbdomen || exam.hemothoraxIdentified || (exam.aortaMaxDiameterCm >= 5.0 && exam.systolicBp < 90)) {
    shockEtiology = "HEMORRHAGIC_HYPOVOLEMIC";
  } else if (exam.lvContractility === "SEVERELY_DEPRESSED") {
    shockEtiology = "CARDIOGENIC";
  } else if (exam.dvtCompressionPositive && exam.rvDiastolicCollapse === false && ivcStatus === "PLETHORIC_OVERLOAD_OR_OBSTRUCTIVE") {
    shockEtiology = "PULMONARY_EMBOLISM_MASSIVE";
  }

  // 1. Invariant CF-POCUS-001: Tension Pneumothorax Veto
  if (ptxDetected && exam.systolicBp < 90) {
    trippedInvariants.push("CF-POCUS-001");
    mandatoryActions.push(
      "TENSION PNEUMOTHORAX IMMEDIATE DECOMPRESSION VETO: Absent lung sliding with hemodynamic collapse (BP < 90 mmHg). DO NOT SEND TO RADIOLOGY / CT SCAN. Immediately perform needle thoracostomy in 2nd intercostal space midclavicular line or 4th/5th intercostal space midaxillary line, followed by rapid finger thoracostomy and tube thoracostomy."
    );
  }

  // 2. Invariant CF-POCUS-002: Cardiac Tamponade Veto
  if (tamponadeSigns && exam.systolicBp < 90) {
    trippedInvariants.push("CF-POCUS-002");
    mandatoryActions.push(
      "CARDIAC TAMPONADE IMMEDIATE PERICARDIOCENTESIS VETO: Pericardial effusion with early RV diastolic collapse, plethoric non-collapsing IVC, and obstructive hypotension. Immediately prepare for ultrasound-guided subxiphoid pericardiocentesis or emergent emergency department thoracotomy/pericardiotomy."
    );
  }

  // 3. Invariant CF-POCUS-003: Ruptured AAA Veto
  if (exam.aortaMaxDiameterCm >= 5.0 && exam.systolicBp < 90) {
    trippedInvariants.push("CF-POCUS-003");
    mandatoryActions.push(
      `RUPTURED ABDOMINAL AORTIC ANEURYSM (AAA) VETO: Maximum aortic diameter is ${exam.aortaMaxDiameterCm} cm (&gt;= 5.0 cm threshold) with refractory hypotension. Sending patient for CT angiography is FATAL. Transport directly to the Operating Room or hybrid endovascular suite immediately with emergent massive transfusion protocol (MTP 1:1:1).`
    );
  }

  // 4. Invariant CF-POCUS-004: Fluid Bolus Harm in Cardiogenic Shock Veto
  if (
    exam.lvContractility === "SEVERELY_DEPRESSED" &&
    ivcStatus === "PLETHORIC_OVERLOAD_OR_OBSTRUCTIVE" &&
    exam.proposedIntervention === "FLUID_BOLUS_1000ML"
  ) {
    trippedInvariants.push("CF-POCUS-004");
    mandatoryActions.push(
      "CARDIOGENIC FLUID OVERLOAD HARM VETO: POCUS demonstrates severe LV systolic dysfunction with a plethoric, non-collapsible IVC (>2.1 cm) and pulmonary interstitial congestion (B-lines). Administering crystalloid fluid boluses precipitates acute flash pulmonary edema, worsening hypoxia and cardiogenic arrest. Initiate Norepinephrine / Dobutamine and urgent mechanical circulatory support consult."
    );
  }

  return {
    timestampIso: new Date().toISOString(),
    patientId: exam.patientId,
    patientName: exam.patientName,
    shockEtiologyLikelihood: shockEtiology,
    eFastSummary: {
      freeFluidAbdomen,
      pneumothoraxDetected: ptxDetected,
      hemothoraxDetected: exam.hemothoraxIdentified,
      pericardialTamponadeSigns: tamponadeSigns,
    },
    blueProfileClassification: blueProfile,
    ivcVolumeStatus: ivcStatus,
    trippedInvariants,
    mandatoryActions,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatPocusSpokenSummary(report: PocusEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Point of care ultrasound and resuscitation assessment for ${report.patientName}, identifier ${report.patientId}.`
  );

  parts.push(
    `Primary ultrasound shock etiology is ${report.shockEtiologyLikelihood.replace(/_/g, " ").toLowerCase()}. BLUE protocol lung profile is classified as ${report.blueProfileClassification.replace(/_/g, " ").toLowerCase()}.`
  );

  parts.push(
    `Inferior vena cava hemodynamic status is ${report.ivcVolumeStatus.replace(/_/g, " ").toLowerCase()}.`
  );

  if (report.eFastSummary.freeFluidAbdomen) {
    parts.push("Abdominal free fluid is positive in the dependent peritoneal recesses.");
  }
  if (report.eFastSummary.pneumothoraxDetected) {
    parts.push("Pneumothorax detected with absent lung sliding on thoracic interrogation.");
  }
  if (report.eFastSummary.pericardialTamponadeSigns) {
    parts.push("Pericardial effusion with right ventricular diastolic collapse detected.");
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(`CRITICAL POCUS RESUSCITATION VETOES TRIPPED: ${report.trippedInvariants.join(", ")}.`);
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push("Focused bedside ultrasound findings do not trip acute surgical or decompression vetoes.");
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL PRESETS
// -------------------------------------------------------------------------

export const POCUS_PRESET_TENSION_PTX: PocusExaminationProfile = {
  patientId: "POCUS-TRAUMA-001",
  patientName: "Marcus Brody (24yo M - Motorcycle Collision)",
  clinicalPresentation: "TRAUMA_SHOCK",
  systolicBp: 74,
  heartRateBpm: 138,
  morisonsPouchFreeFluid: false,
  splenorenalFreeFluid: false,
  suprapubicFreeFluid: false,
  pericardialEffusion: false,
  rightLungSlidingPresent: false, // Tension PTX right side!
  leftLungSlidingPresent: true,
  lungPointIdentified: true,
  hemothoraxIdentified: false,
  lvContractility: "HYPERDYNAMIC",
  rvDiastolicCollapse: false,
  ivcDiameterCm: 2.3,
  ivcCollapsibilityPercent: 10,
  aortaMaxDiameterCm: 1.8,
  dvtCompressionPositive: false,
  proposedIntervention: "SEND_TO_CT_SCAN", // Fatal delay!
};

export const POCUS_PRESET_TAMPONADE: PocusExaminationProfile = {
  patientId: "POCUS-TAMP-002",
  patientName: "Angela Morris (58yo F - Malignant Pericardial Effusion)",
  clinicalPresentation: "UNDIFFERENTIATED_HYPOTENSION",
  systolicBp: 82,
  heartRateBpm: 122,
  morisonsPouchFreeFluid: false,
  splenorenalFreeFluid: false,
  suprapubicFreeFluid: false,
  pericardialEffusion: true,
  rightLungSlidingPresent: true,
  leftLungSlidingPresent: true,
  lungPointIdentified: false,
  hemothoraxIdentified: false,
  lvContractility: "HYPERDYNAMIC",
  rvDiastolicCollapse: true, // Tamponade!
  ivcDiameterCm: 2.5,
  ivcCollapsibilityPercent: 5,
  aortaMaxDiameterCm: 2.0,
  dvtCompressionPositive: false,
  proposedIntervention: "PERICARDIOCENTESIS",
};

export const POCUS_PRESET_RUPTURED_AAA: PocusExaminationProfile = {
  patientId: "POCUS-AAA-003",
  patientName: "Gerald Thomas (71yo M - Syncope & Flank Pain)",
  clinicalPresentation: "UNDIFFERENTIATED_HYPOTENSION",
  systolicBp: 78,
  heartRateBpm: 114,
  morisonsPouchFreeFluid: true,
  splenorenalFreeFluid: true,
  suprapubicFreeFluid: false,
  pericardialEffusion: false,
  rightLungSlidingPresent: true,
  leftLungSlidingPresent: true,
  lungPointIdentified: false,
  hemothoraxIdentified: false,
  lvContractility: "HYPERDYNAMIC",
  rvDiastolicCollapse: false,
  ivcDiameterCm: 1.2,
  ivcCollapsibilityPercent: 80,
  aortaMaxDiameterCm: 6.8, // Massive Ruptured AAA!
  dvtCompressionPositive: false,
  proposedIntervention: "SEND_TO_CT_SCAN", // Fatal delay!
};

export const POCUS_PRESET_CARDIOGENIC_OVERLOAD: PocusExaminationProfile = {
  patientId: "POCUS-CARD-004",
  patientName: "Arthur King (66yo M - Post-STEMI Cardiogenic Shock)",
  clinicalPresentation: "ACUTE_DYSPNEA",
  systolicBp: 84,
  heartRateBpm: 108,
  morisonsPouchFreeFluid: false,
  splenorenalFreeFluid: false,
  suprapubicFreeFluid: false,
  pericardialEffusion: false,
  rightLungSlidingPresent: true,
  leftLungSlidingPresent: true,
  lungPointIdentified: false,
  hemothoraxIdentified: false,
  lvContractility: "SEVERELY_DEPRESSED", // EF < 15%
  rvDiastolicCollapse: false,
  ivcDiameterCm: 2.6,
  ivcCollapsibilityPercent: 12, // Plethoric
  aortaMaxDiameterCm: 2.1,
  dvtCompressionPositive: false,
  proposedIntervention: "FLUID_BOLUS_1000ML", // Harmful! Trips CF-POCUS-004
};
