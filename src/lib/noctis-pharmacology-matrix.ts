/**
 * NOCTIS HEALTH 500 - CLINICAL PHARMACOLOGY DRUG-DRUG INTERACTION MATRIX & QTC ENGINE (TRACK 23)
 * Standards: Tisdale QTc Prolongation Risk Score for Hospitalized Patients,
 *             CredibleMeds Known / Possible / Conditional Risk Categories,
 *             FDA Clinical Drug Interaction Guidance (CYP3A4, CYP2D6, CYP2C9, P-gp),
 *             Hunter Serotonin Toxicity Criteria
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-PHARM-001: Extreme QTc Prolongation & Torsades de Pointes (TdP) Fatal Arrhythmia Veto (QTc >= 500ms)
 * - CF-PHARM-002: Lethal Serotonin Syndrome Combination Veto (MAOI / Linezolid + SSRI / SNRI / Tramadol)
 * - CF-PHARM-003: Catastrophic CYP3A4 Induction Graft Rejection / Stroke Veto (Rifampin + Tacrolimus/DOAC)
 * - CF-PHARM-004: Inappropriate Triple Antithrombotic Hemorrhage Veto (Dual antiplatelet + Full anticoagulation)
 */

export interface PatientPharmacologyProfile {
  patientId: string;
  patientName: string;
  ageYears: number;
  biologicalSex: "MALE" | "FEMALE";
  baselineQtcMs: number;
  serumPotassiumMeqPerL: number;
  hasAcuteMi: boolean;
  hasHeartFailure: boolean;
  hasSepsis: boolean;
  takingLoopDiuretic: boolean;
  activeMedications: Array<{
    drugName: string;
    doseMg: number;
    credibleMedsRisk?: "KNOWN_RISK" | "POSSIBLE_RISK" | "CONDITIONAL_RISK" | "NONE";
    cypRole?: "CYP3A4_INDUCER" | "CYP3A4_INHIBITOR" | "CYP3A4_SUBSTRATE" | "CYP2D6_INHIBITOR" | "MAOI" | "SEROTONERGIC" | "ANTICOAGULANT" | "ANTIPLATELET";
  }>;
}

export interface TisdaleScoreBreakdown {
  totalScore: number;
  riskTier: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK";
  pointDetails: string[];
}

export interface PharmacologyEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  tisdaleReport: TisdaleScoreBreakdown;
  activeQTCProLongingDrugs: string[];
  detectedInteractions: Array<{
    drug1: string;
    drug2: string;
    mechanism: string;
    clinicalEffect: string;
    severity: "CRITICAL_CONTRAINDICATED" | "MAJOR_AVOID" | "MODERATE_MONITOR";
  }>;
  trippedInvariants: string[];
  mandatoryActions: string[];
}

// -------------------------------------------------------------------------
// TISDALE QTC RISK SCORE CALCULATOR
// -------------------------------------------------------------------------

export function calculateTisdaleScore(patient: PatientPharmacologyProfile): TisdaleScoreBreakdown {
  let score = 0;
  const details: string[] = [];

  // Age >= 68 (1 pt)
  if (patient.ageYears >= 68) {
    score += 1;
    details.push("Age >= 68 years (+1 pt)");
  }

  // Female Sex (1 pt)
  if (patient.biologicalSex === "FEMALE") {
    score += 1;
    details.push("Female biological sex (+1 pt)");
  }

  // Loop Diuretic (1 pt)
  if (patient.takingLoopDiuretic) {
    score += 1;
    details.push("Loop diuretic therapy (+1 pt)");
  }

  // Serum Potassium <= 3.5 mEq/L (2 pts)
  if (patient.serumPotassiumMeqPerL <= 3.5) {
    score += 2;
    details.push(`Hypokalemia K+ <= 3.5 mEq/L (${patient.serumPotassiumMeqPerL} mEq/L) (+2 pts)`);
  }

  // Admission QTc >= 450 ms (2 pts)
  if (patient.baselineQtcMs >= 450) {
    score += 2;
    details.push(`Baseline prolonged QTc >= 450 ms (${patient.baselineQtcMs} ms) (+2 pts)`);
  }

  // Acute Myocardial Infarction (2 pts)
  if (patient.hasAcuteMi) {
    score += 2;
    details.push("Acute Myocardial Infarction (+2 pts)");
  }

  // >= 2 QTc-prolonging drugs (3 pts)
  const qtcDrugs = patient.activeMedications.filter(
    (m) => m.credibleMedsRisk === "KNOWN_RISK" || m.credibleMedsRisk === "POSSIBLE_RISK"
  );
  if (qtcDrugs.length >= 2) {
    score += 3;
    details.push(`>= 2 QTc-prolonging drugs active (${qtcDrugs.map((d) => d.drugName).join(", ")}) (+3 pts)`);
  }

  // Sepsis (1 pt)
  if (patient.hasSepsis) {
    score += 1;
    details.push("Systemic Sepsis (+1 pt)");
  }

  // Heart Failure (1 pt)
  if (patient.hasHeartFailure) {
    score += 1;
    details.push("Heart Failure (+1 pt)");
  }

  let riskTier: TisdaleScoreBreakdown["riskTier"] = "LOW_RISK";
  if (score >= 11) {
    riskTier = "HIGH_RISK";
  } else if (score >= 7) {
    riskTier = "MODERATE_RISK";
  }

  return {
    totalScore: score,
    riskTier,
    pointDetails: details,
  };
}

// -------------------------------------------------------------------------
// COMPREHENSIVE PHARMACOLOGY & INTERACTION EVALUATION
// -------------------------------------------------------------------------

export function evaluatePharmacologyMatrix(patient: PatientPharmacologyProfile): PharmacologyEvaluationReport {
  const tisdale = calculateTisdaleScore(patient);
  const qtcDrugs = patient.activeMedications
    .filter((m) => m.credibleMedsRisk === "KNOWN_RISK")
    .map((m) => m.drugName);

  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];
  const detectedInteractions: PharmacologyEvaluationReport["detectedInteractions"] = [];

  // 1. Invariant CF-PHARM-001: Extreme QTc Prolongation & TdP Veto
  if (patient.baselineQtcMs >= 500 && qtcDrugs.length >= 2) {
    trippedInvariants.push("CF-PHARM-001");
    mandatoryActions.push(
      `EXTREME QTC PROLONGATION & TORSADES DE POINTES (TdP) VETO: Baseline QTc is ${patient.baselineQtcMs} ms (>= 500 ms threshold) with concurrent administration of ${qtcDrugs.join(" + ")}. Co-administration markedly amplifies delayed rectifier potassium current (IKr) blockade, precipitating early afterdepolarizations, polymorphic ventricular tachycardia, and sudden cardiac death. Immediately hold second QTc agent, replete K+ > 4.0 mEq/L and Mg2+ > 2.0 mg/dL, and connect continuous telemetry.`
    );
  }

  // 2. Invariant CF-PHARM-002: Lethal Serotonin Syndrome Drug Combination
  const hasMaoi = patient.activeMedications.some(
    (m) => m.cypRole === "MAOI" || m.drugName.toLowerCase().includes("linezolid")
  );
  const serotonergics = patient.activeMedications.filter(
    (m) =>
      m.cypRole === "SEROTONERGIC" ||
      m.drugName.toLowerCase().includes("sertraline") ||
      m.drugName.toLowerCase().includes("fluoxetine") ||
      m.drugName.toLowerCase().includes("citalopram") ||
      m.drugName.toLowerCase().includes("tramadol") ||
      m.drugName.toLowerCase().includes("venlafaxine")
  );

  if (hasMaoi && serotonergics.length > 0) {
    const maoiDrug = patient.activeMedications.find(
      (m) => m.cypRole === "MAOI" || m.drugName.toLowerCase().includes("linezolid")
    );
    trippedInvariants.push("CF-PHARM-002");
    detectedInteractions.push({
      drug1: maoiDrug?.drugName || "MAOI",
      drug2: serotonergics.map((s) => s.drugName).join(", "),
      mechanism: "Irreversible or reversible MAO-A inhibition combined with serotonin reuptake inhibition",
      clinicalEffect: "Fulminant Serotonin Toxicity (Hyperthermia > 41C, Clonus, Autonomic Instability, Death)",
      severity: "CRITICAL_CONTRAINDICATED",
    });
    mandatoryActions.push(
      `LETHAL SEROTONIN SYNDROME CONTRAINDICATION VETO: Combination of ${maoiDrug?.drugName} (MAO inhibitor) with ${serotonergics.map((s) => s.drugName).join(", ")} is ABSOLUTELY CONTRAINDICATED. Produces hyperpyrexia, hyperreflexia, ocular/inducible clonus, and cardiovascular collapse. Discontinue serotonergic agent immediately; require 14-day washout before MAOI initiation.`
    );
  }

  // 3. Invariant CF-PHARM-003: Catastrophic CYP3A4 Subtherapeutic Induction Veto
  const hasStrongInducer = patient.activeMedications.some(
    (m) =>
      m.cypRole === "CYP3A4_INDUCER" ||
      m.drugName.toLowerCase().includes("rifampin") ||
      m.drugName.toLowerCase().includes("carbamazepine")
  );
  const criticalSubstrates = patient.activeMedications.filter(
    (m) =>
      m.drugName.toLowerCase().includes("tacrolimus") ||
      m.drugName.toLowerCase().includes("cyclosporine") ||
      m.drugName.toLowerCase().includes("apixaban") ||
      m.drugName.toLowerCase().includes("rivaroxaban")
  );

  if (hasStrongInducer && criticalSubstrates.length > 0) {
    trippedInvariants.push("CF-PHARM-003");
    detectedInteractions.push({
      drug1: "Rifampin / Strong CYP3A4/P-gp Inducer",
      drug2: criticalSubstrates.map((s) => s.drugName).join(", "),
      mechanism: "PXR nuclear receptor activation causing 80-90% reduction in substrate AUC",
      clinicalEffect: "Acute Solid-Organ Allograft Rejection or Fatal Thromboembolism / Stroke",
      severity: "CRITICAL_CONTRAINDICATED",
    });
    mandatoryActions.push(
      `CATASTROPHIC CYP3A4/P-GP INDUCTION VETO: Co-prescribing Rifampin with ${criticalSubstrates.map((s) => s.drugName).join(", ")} results in profound 80% to 90% reduction in circulating drug concentrations via hepatic CYP3A4 and intestinal P-gp hyperinduction. Triggers hyperacute organ transplant rejection or recurrent fatal thromboembolism. Select non-inducing alternative or initiate intensive therapeutic drug monitoring.`
    );
  }

  // 4. Invariant CF-PHARM-004: Triple Antithrombotic Hemorrhage Veto
  const antiplatelets = patient.activeMedications.filter(
    (m) =>
      m.cypRole === "ANTIPLATELET" ||
      m.drugName.toLowerCase().includes("aspirin") ||
      m.drugName.toLowerCase().includes("clopidogrel") ||
      m.drugName.toLowerCase().includes("ticagrelor")
  );
  const anticoagulants = patient.activeMedications.filter(
    (m) =>
      m.cypRole === "ANTICOAGULANT" ||
      m.drugName.toLowerCase().includes("warfarin") ||
      m.drugName.toLowerCase().includes("apixaban") ||
      m.drugName.toLowerCase().includes("rivaroxaban") ||
      m.drugName.toLowerCase().includes("heparin")
  );

  if (antiplatelets.length >= 2 && anticoagulants.length >= 1) {
    trippedInvariants.push("CF-PHARM-004");
    detectedInteractions.push({
      drug1: antiplatelets.map((a) => a.drugName).join(" + "),
      drug2: anticoagulants.map((a) => a.drugName).join(", "),
      mechanism: "Concurrent platelet cyclooxygenase/P2Y12 inhibition with coagulation factor suppression",
      clinicalEffect: "Major Fatal Gastrointestinal / Intracranial Hemorrhage",
      severity: "MAJOR_AVOID",
    });
    mandatoryActions.push(
      "TRIPLE ANTITHROMBOTIC BLEEDING HAZARD VETO: Patient is prescribed dual antiplatelet therapy (DAPT) PLUS full systemic anticoagulation (Triple Therapy). In the absence of an immediate high-risk coronary stenting indication within the past 1-4 weeks, triple therapy carries a 3- to 4-fold increase in major and fatal bleeding. Drop Aspirin and transition to single antiplatelet (Clopidogrel) plus DOAC."
    );
  }

  return {
    timestampIso: new Date().toISOString(),
    patientId: patient.patientId,
    patientName: patient.patientName,
    tisdaleReport: tisdale,
    activeQTCProLongingDrugs: qtcDrugs,
    detectedInteractions,
    trippedInvariants,
    mandatoryActions,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatPharmacologySpokenSummary(report: PharmacologyEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Clinical pharmacology and drug interaction assessment for ${report.patientName}, identifier ${report.patientId}.`
  );

  parts.push(
    `Tisdale QTc risk score is ${report.tisdaleReport.totalScore} points, stratified as ${report.tisdaleReport.riskTier.replace("_", " ").toLowerCase()}.`
  );

  if (report.activeQTCProLongingDrugs.length > 0) {
    parts.push(
      `Active CredibleMeds known QTc-prolonging drugs detected: ${report.activeQTCProLongingDrugs.join(", ")}.`
    );
  }

  if (report.detectedInteractions.length > 0) {
    parts.push(`Identified ${report.detectedInteractions.length} major pharmacodynamic or pharmacokinetic drug-drug interactions.`);
    report.detectedInteractions.forEach((d, idx) => {
      parts.push(`Interaction ${idx + 1}: ${d.drug1} and ${d.drug2}, clinical risk: ${d.clinicalEffect}.`);
    });
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(`CRITICAL PHARMACOLOGY SAFETY VETOES TRIPPED: ${report.trippedInvariants.join(", ")}.`);
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push("No contraindications or extreme QTc prolongation invariants tripped in current drug matrix.");
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL PRESETS
// -------------------------------------------------------------------------

export const PHARM_PRESET_TORSADES: PatientPharmacologyProfile = {
  patientId: "PHARM-TDP-001",
  patientName: "Walter White (72yo M - Severe Sepsis & Afib)",
  ageYears: 72,
  biologicalSex: "MALE",
  baselineQtcMs: 515, // > 500 ms!
  serumPotassiumMeqPerL: 3.2, // Hypokalemia!
  hasAcuteMi: false,
  hasHeartFailure: true,
  hasSepsis: true,
  takingLoopDiuretic: true, // Furosemide
  activeMedications: [
    { drugName: "Amiodarone", doseMg: 400, credibleMedsRisk: "KNOWN_RISK" },
    { drugName: "Haloperidol", doseMg: 5, credibleMedsRisk: "KNOWN_RISK" }, // Fatal QTc stack!
    { drugName: "Furosemide", doseMg: 40 },
  ],
};

export const PHARM_PRESET_SEROTONIN: PatientPharmacologyProfile = {
  patientId: "PHARM-SEROTONIN-002",
  patientName: "Chloe Martin (38yo F - MRSA Pneumonia & Depression)",
  ageYears: 38,
  biologicalSex: "FEMALE",
  baselineQtcMs: 420,
  serumPotassiumMeqPerL: 4.1,
  hasAcuteMi: false,
  hasHeartFailure: false,
  hasSepsis: false,
  takingLoopDiuretic: false,
  activeMedications: [
    { drugName: "Linezolid", doseMg: 600, cypRole: "MAOI" }, // Reversible MAOI!
    { drugName: "Sertraline", doseMg: 100, cypRole: "SEROTONERGIC" }, // Fatal Serotonin Syndrome!
    { drugName: "Tramadol", doseMg: 50, cypRole: "SEROTONERGIC" },
  ],
};

export const PHARM_PRESET_TRANSPLANT_INDUCTION: PatientPharmacologyProfile = {
  patientId: "PHARM-TRANSPLANT-003",
  patientName: "Eduardo Silva (54yo M - Renal Transplant & TB)",
  ageYears: 54,
  biologicalSex: "MALE",
  baselineQtcMs: 430,
  serumPotassiumMeqPerL: 4.4,
  hasAcuteMi: false,
  hasHeartFailure: false,
  hasSepsis: false,
  takingLoopDiuretic: false,
  activeMedications: [
    { drugName: "Rifampin", doseMg: 600, cypRole: "CYP3A4_INDUCER" }, // Catastrophic inducer!
    { drugName: "Tacrolimus", doseMg: 2, cypRole: "CYP3A4_SUBSTRATE" }, // Graft rejection!
    { drugName: "Apixaban", doseMg: 5, cypRole: "ANTICOAGULANT" }, // Stroke risk!
  ],
};
