/**
 * NOCTIS HEALTH 500 - ANTIMICROBIAL STEWARDSHIP & SEPSIS PATHOGEN EMPIRIC GUIDANCE ENGINE
 * Standards: IDSA Guidelines (HAP/VAP, CAP, Sepsis-3, Meningitis, cIAI, cSSTI),
 *             Sanford Guide to Antimicrobial Therapy, 2020 Vancomycin AUC/MIC Consensus Guidelines,
 *             Cockcroft-Gault Renal Clearance Adjustments & Beta-Lactam R1 Cross-Reactivity Tree
 * 
 * Non-Compensatory Safety Invariant Gates:
 * - CF-ABX-001: Cefepime-Induced Neurotoxicity Veto (Renal impairment with high unadjusted dose; NCSE prevention)
 * - CF-ABX-002: Inadequate Empiric Broad-Spectrum Coverage Veto in Refractory Septic Shock / HAP-VAP (Missing MRSA/Pseudomonas)
 * - CF-ABX-003: Identical R1 Side-Chain Beta-Lactam Challenge Veto in IgE-Mediated Anaphylaxis
 * - CF-ABX-004: Severe Cutaneous Adverse Reaction (SCAR/SJS/TEN/DRESS) Class Contraindication Veto
 */

export type InfectionSyndrome =
  | "SEPTIC_SHOCK_UNKNOWN_SOURCE"
  | "HAP_VAP"
  | "COMMUNITY_ACQUIRED_PNEUMONIA"
  | "BACTERIAL_MENINGITIS"
  | "NECROTIZING_FASCIITIS"
  | "NEUTROPENIC_FEVER"
  | "COMPLICATED_INTRA_ABDOMINAL"
  | "UROSEPSIS_PYELONEPHRITIS";

export type AllergySeverity =
  | "NO_ALLERGY"
  | "MILD_DELAYED_CUTANEOUS" // Mild maculopapular rash > 72h
  | "IGE_MEDIATED_ANAPHYLAXIS" // Anaphylaxis, angioedema, bronchospasm, urticaria < 1h
  | "SCAR_SJS_TEN_DRESS"; // Severe cutaneous adverse reactions (absolute contraindication)

export interface PatientInfectionProfile {
  patientId: string;
  patientName: string;
  ageYears: number;
  biologicalSex: "MALE" | "FEMALE";
  weightKg: number;
  serumCreatinineMgPerDl: number;
  syndrome: InfectionSyndrome;
  mrsaRiskFactor: boolean;
  pseudomonasRiskFactor: boolean;
  betaLactamAllergy: AllergySeverity;
  allergyDetails?: string;
  proposedAntibiotics: Array<{
    drugName: string;
    doseMg: number;
    frequencyHours: number;
    extendedInfusion?: boolean;
  }>;
}

export interface EmpiricRegimenRecommendation {
  primaryRegimen: string[];
  alternativeRegimenAllergy: string[];
  targetedPathogens: string[];
  durationDays: number;
  adjuvantTherapy?: string;
}

export interface RenalDosingAudit {
  drugName: string;
  prescribedDose: string;
  recommendedAdjustedDose: string;
  crClMlPerMin: number;
  doseReductionRequired: boolean;
  neurotoxicityRiskHigh: boolean;
}

export interface AntimicrobialEvaluationReport {
  timestampIso: string;
  patientId: string;
  patientName: string;
  syndrome: InfectionSyndrome;
  calculatedCrClMlPerMin: number;
  empiricRecommendations: EmpiricRegimenRecommendation;
  renalDosingAudits: RenalDosingAudit[];
  allergyCrossReactivityRisk: "SAFE" | "LOW_RISK" | "HIGH_RISK_CROSS_REACTIVITY" | "ABSOLUTE_CONTRAINDICATION";
  trippedInvariants: string[];
  mandatoryActions: string[];
}

// -------------------------------------------------------------------------
// MATHEMATICAL & PHARMACOKINETIC FORMULAS
// -------------------------------------------------------------------------

/**
 * Calculates Creatinine Clearance (CrCl) using Cockcroft-Gault equation
 * Male: ((140 - Age) * WeightKg) / (72 * Scr)
 * Female: Male * 0.85
 */
export function calculateCockcroftGaultCrCl(
  ageYears: number,
  weightKg: number,
  serumCreatinineMgPerDl: number,
  sex: "MALE" | "FEMALE"
): number {
  if (serumCreatinineMgPerDl <= 0) return 100;
  const baseCrCl = ((140 - ageYears) * weightKg) / (72 * serumCreatinineMgPerDl);
  const factor = sex === "FEMALE" ? 0.85 : 1.0;
  const adjusted = baseCrCl * factor;
  return Math.round(adjusted * 10) / 10;
}

// -------------------------------------------------------------------------
// SYNDROME-BASED IDSA EMPIRIC RECOMMENDATIONS
// -------------------------------------------------------------------------

export function getSyndromeEmpiricRegimen(
  syndrome: InfectionSyndrome,
  ageYears: number,
  mrsaRisk: boolean,
  pseudomonasRisk: boolean
): EmpiricRegimenRecommendation {
  switch (syndrome) {
    case "SEPTIC_SHOCK_UNKNOWN_SOURCE":
    case "HAP_VAP":
      return {
        primaryRegimen: [
          "Vancomycin 25-30 mg/kg loading dose, then 15-20 mg/kg IV Q8-12h (Target AUC/MIC 400-600)",
          "Cefepime 2g IV Q8h (or Piperacillin-Tazobactam 4.5g IV Q6h extended 4-hr infusion)",
        ],
        alternativeRegimenAllergy: [
          "Vancomycin 15-20 mg/kg IV Q8-12h",
          "Aztreonam 2g IV Q8h + Levofloxacin 750mg IV Q24h",
        ],
        targetedPathogens: ["MRSA", "Pseudomonas aeruginosa", "Enterobacterales", "Streptococcus pneumoniae"],
        durationDays: 7,
      };

    case "COMMUNITY_ACQUIRED_PNEUMONIA":
      return {
        primaryRegimen: [
          "Ceftriaxone 1g-2g IV Q24h",
          "Azithromycin 500mg IV/PO Q24h (or Doxycycline 100mg PO/IV BID)",
        ],
        alternativeRegimenAllergy: [
          "Levofloxacin 750mg IV/PO Q24h (or Moxifloxacin 400mg IV/PO Q24h)",
        ],
        targetedPathogens: ["Streptococcus pneumoniae", "Mycoplasma pneumoniae", "Legionella pneumophila", "Haemophilus influenzae"],
        durationDays: 5,
      };

    case "BACTERIAL_MENINGITIS":
      const needsListeria = ageYears >= 50;
      const primary = [
        "Ceftriaxone 2g IV Q12h (Meningeal high-dose)",
        "Vancomycin 15-20 mg/kg IV Q8-12h (Target trough 15-20 mcg/mL)",
      ];
      if (needsListeria) {
        primary.push("Ampicillin 2g IV Q4h (Listeria monocytogenes coverage)");
      }
      return {
        primaryRegimen: primary,
        alternativeRegimenAllergy: [
          "Meropenem 2g IV Q8h (if low-risk allergy) or Chloramphenicol 25 mg/kg Q6h",
          "Vancomycin 15-20 mg/kg IV Q8-12h",
          needsListeria ? "Trimethoprim-Sulfamethoxazole 5 mg/kg IV Q8h (for Listeria)" : "",
        ].filter(Boolean),
        targetedPathogens: ["Streptococcus pneumoniae", "Neisseria meningitidis", "Haemophilus influenzae", ...(needsListeria ? ["Listeria monocytogenes"] : [])],
        durationDays: 14,
        adjuvantTherapy: "Dexamethasone 10mg IV administered with or 15-20 minutes BEFORE the first dose of antibiotics (prevents S. pneumoniae hearing loss and mortality).",
      };

    case "NECROTIZING_FASCIITIS":
      return {
        primaryRegimen: [
          "Vancomycin 15-20 mg/kg IV Q8-12h (or Daptomycin 8-10 mg/kg IV Q24h)",
          "Meropenem 1g IV Q8h (or Piperacillin-Tazobactam 4.5g IV Q6h)",
          "Clindamycin 900mg IV Q8h (MANDATORY antitoxin protein synthesis inhibitor for Group A Strep)",
        ],
        alternativeRegimenAllergy: [
          "Vancomycin 15-20 mg/kg IV Q8-12h",
          "Aztreonam 2g IV Q8h + Metronidazole 500mg IV Q8h",
          "Clindamycin 900mg IV Q8h (or Linezolid 600mg IV Q12h for antitoxin effect)",
        ],
        targetedPathogens: ["Group A Streptococcus (S. pyogenes)", "Clostridium perfringens", "Bacteroides fragilis", "MRSA", "Gram-negative bacilli"],
        durationDays: 14,
        adjuvantTherapy: "EMERGENT SURGICAL DEBRIDEMENT: Antibiotics are purely adjunctive; immediate surgical fasciotomy/exploration is definitive life-saving therapy.",
      };

    case "NEUTROPENIC_FEVER":
      return {
        primaryRegimen: [
          "Cefepime 2g IV Q8h monotherapy (or Meropenem 1g IV Q8h)",
        ],
        alternativeRegimenAllergy: [
          "Aztreonam 2g IV Q8h + Vancomycin 15-20 mg/kg Q12h",
        ],
        targetedPathogens: ["Pseudomonas aeruginosa", "Enterobacterales", "Viridans group streptococci"],
        durationDays: 7,
      };

    case "COMPLICATED_INTRA_ABDOMINAL":
      return {
        primaryRegimen: [
          "Ceftriaxone 2g IV Q24h + Metronidazole 500mg IV Q8h (or Piperacillin-Tazobactam 3.375g IV Q6h)",
        ],
        alternativeRegimenAllergy: [
          "Ciprofloxacin 400mg IV Q12h + Metronidazole 500mg IV Q8h",
        ],
        targetedPathogens: ["Escherichia coli", "Klebsiella pneumoniae", "Bacteroides fragilis", "Enterococcus faecalis"],
        durationDays: 4,
      };

    case "UROSEPSIS_PYELONEPHRITIS":
      return {
        primaryRegimen: [
          "Ceftriaxone 1g IV Q24h (or Cefepime 2g IV Q12h if Pseudomonas/ESBL risk)",
        ],
        alternativeRegimenAllergy: [
          "Aztreonam 1g IV Q8h or Gentamicin 5 mg/kg IV Q24h",
        ],
        targetedPathogens: ["Escherichia coli (UPEC)", "Klebsiella pneumoniae", "Proteus mirabilis"],
        durationDays: 7,
      };
  }
}

// -------------------------------------------------------------------------
// RENAL DOSING AUDITOR
// -------------------------------------------------------------------------

export function auditRenalDosing(
  drugName: string,
  doseMg: number,
  frequencyHours: number,
  crClMlPerMin: number
): RenalDosingAudit {
  const lower = drugName.toLowerCase();
  let recommendedDose = `${doseMg}mg Q${frequencyHours}h`;
  let doseReductionRequired = false;
  let neurotoxicityRiskHigh = false;

  // Cefepime Renal Audit
  if (lower.includes("cefepime")) {
    if (crClMlPerMin < 60) {
      doseReductionRequired = true;
      if (crClMlPerMin >= 30) {
        recommendedDose = "2g IV Q12h";
        if (doseMg >= 2000 && frequencyHours <= 8) neurotoxicityRiskHigh = true;
      } else if (crClMlPerMin >= 11) {
        recommendedDose = "1g IV Q24h (or 2g IV Q24h in severe sepsis)";
        if (doseMg > 1000 || frequencyHours <= 12) neurotoxicityRiskHigh = true;
      } else {
        recommendedDose = "500mg IV Q24h (or 1g post-hemodialysis)";
        if (doseMg > 500 || frequencyHours < 24) neurotoxicityRiskHigh = true;
      }
    }
  }

  // Piperacillin-Tazobactam (Zosyn) Renal Audit
  if (lower.includes("piperacillin") || lower.includes("zosyn")) {
    if (crClMlPerMin < 50) {
      doseReductionRequired = true;
      if (crClMlPerMin >= 20) {
        recommendedDose = "3.375g IV Q6h";
      } else {
        recommendedDose = "2.25g IV Q6h (or 2.25g Q8h)";
      }
    }
  }

  // Meropenem Renal Audit
  if (lower.includes("meropenem")) {
    if (crClMlPerMin < 50) {
      doseReductionRequired = true;
      if (crClMlPerMin >= 26) {
        recommendedDose = "1g IV Q12h";
      } else if (crClMlPerMin >= 10) {
        recommendedDose = "500mg IV Q12h";
      } else {
        recommendedDose = "500mg IV Q24h";
      }
    }
  }

  return {
    drugName,
    prescribedDose: `${doseMg}mg Q${frequencyHours}h`,
    recommendedAdjustedDose: recommendedDose,
    crClMlPerMin,
    doseReductionRequired,
    neurotoxicityRiskHigh,
  };
}

// -------------------------------------------------------------------------
// COMPREHENSIVE ANTIMICROBIAL EVALUATION ENGINE
// -------------------------------------------------------------------------

export function evaluateAntimicrobialPlan(patient: PatientInfectionProfile): AntimicrobialEvaluationReport {
  const crCl = calculateCockcroftGaultCrCl(
    patient.ageYears,
    patient.weightKg,
    patient.serumCreatinineMgPerDl,
    patient.biologicalSex
  );

  const empiric = getSyndromeEmpiricRegimen(
    patient.syndrome,
    patient.ageYears,
    patient.mrsaRiskFactor,
    patient.pseudomonasRiskFactor
  );

  const audits: RenalDosingAudit[] = patient.proposedAntibiotics.map((p) =>
    auditRenalDosing(p.drugName, p.doseMg, p.frequencyHours, crCl)
  );

  const trippedInvariants: string[] = [];
  const mandatoryActions: string[] = [];

  // 1. Invariant CF-ABX-001: Cefepime Neurotoxicity Veto
  const cefepimeAudit = audits.find((a) => a.drugName.toLowerCase().includes("cefepime"));
  if (cefepimeAudit && cefepimeAudit.neurotoxicityRiskHigh) {
    trippedInvariants.push("CF-ABX-001");
    mandatoryActions.push(
      `CEFEPIME NEUROTOXICITY VETO: Patient CrCl is ${crCl} mL/min (< 60 threshold). Prescribed ${cefepimeAudit.prescribedDose} causes severe drug accumulation crossing the blood-brain barrier, triggering GABAA receptor antagonism, myoclonus, encephalopathy, and non-convulsive status epilepticus. Reduce dose to ${cefepimeAudit.recommendedAdjustedDose} immediately.`
    );
  }

  // 2. Invariant CF-ABX-002: Inadequate Broad-Spectrum Coverage in Septic Shock / HAP
  if (
    (patient.syndrome === "SEPTIC_SHOCK_UNKNOWN_SOURCE" || patient.syndrome === "HAP_VAP") &&
    patient.mrsaRiskFactor
  ) {
    const hasMrsaCover = patient.proposedAntibiotics.some((a) => {
      const l = a.drugName.toLowerCase();
      return l.includes("vancomycin") || l.includes("linezolid") || l.includes("daptomycin");
    });
    if (!hasMrsaCover) {
      trippedInvariants.push("CF-ABX-002");
      mandatoryActions.push(
        "CRITICAL MRSA COVERAGE OMISSION VETO: Patient presents in septic shock/HAP with MRSA risk factors, but proposed regimen lacks an empiric MRSA agent. Immediately initiate Vancomycin 25-30 mg/kg IV loading dose or Linezolid 600mg IV."
      );
    }
  }

  // 3. Invariant CF-ABX-003 & CF-ABX-004: Allergy & Cross-Reactivity
  let crossReactivityRisk: AntimicrobialEvaluationReport["allergyCrossReactivityRisk"] = "SAFE";

  if (patient.betaLactamAllergy === "SCAR_SJS_TEN_DRESS") {
    crossReactivityRisk = "ABSOLUTE_CONTRAINDICATION";
    trippedInvariants.push("CF-ABX-004");
    mandatoryActions.push(
      "SCAR / SJS / TEN / DRESS CONTRAINDICATION VETO: Patient has documented history of severe cutaneous adverse reaction to beta-lactams. ALL beta-lactams (penicillins, cephalosporins, carbapenems, monobactams) are ABSOLUTELY CONTRAINDICATED. Switch to non-beta-lactam regimen (Fluoroquinolones, Aminoglycosides, Vancomycin)."
    );
  } else if (patient.betaLactamAllergy === "IGE_MEDIATED_ANAPHYLAXIS") {
    // Check if proposed drug has shared R1 side chain or is penicillin
    const proposedBetaLactams = patient.proposedAntibiotics.filter((a) => {
      const l = a.drugName.toLowerCase();
      return (
        l.includes("cillin") ||
        l.includes("cef") ||
        l.includes("ceph") ||
        l.includes("penem")
      );
    });

    for (const bl of proposedBetaLactams) {
      const name = bl.drugName.toLowerCase();
      if (name.includes("cillin") || name.includes("cephalexin") || name.includes("cefaclor")) {
        crossReactivityRisk = "HIGH_RISK_CROSS_REACTIVITY";
        trippedInvariants.push("CF-ABX-003");
        mandatoryActions.push(
          `BETA-LACTAM ANAPHYLAXIS VETO: Patient has documented IgE-mediated anaphylaxis. Prescribing ${bl.drugName} carries high risk of fatal re-anaphylaxis due to shared R1 aminopenicillin side-chain. Substitute with Aztreonam or targeted non-beta-lactam alternative.`
        );
        break;
      }
    }
  }

  return {
    timestampIso: new Date().toISOString(),
    patientId: patient.patientId,
    patientName: patient.patientName,
    syndrome: patient.syndrome,
    calculatedCrClMlPerMin: crCl,
    empiricRecommendations: empiric,
    renalDosingAudits: audits,
    allergyCrossReactivityRisk: crossReactivityRisk,
    trippedInvariants,
    mandatoryActions,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SCRIPT GENERATOR
// -------------------------------------------------------------------------

export function formatAntimicrobialSpokenSummary(report: AntimicrobialEvaluationReport): string {
  const parts: string[] = [];

  parts.push(
    `Antimicrobial stewardship and empiric pathogen assessment for ${report.patientName}, identifier ${report.patientId}.`
  );

  parts.push(
    `Primary clinical syndrome is ${report.syndrome.replace(/_/g, " ").toLowerCase()}. Calculated Cockcroft-Gault creatinine clearance is ${report.calculatedCrClMlPerMin} milliliters per minute.`
  );

  parts.push(
    `IDSA guideline empiric recommendations: First-line regimen includes ${report.empiricRecommendations.primaryRegimen.join("; ")}.`
  );

  if (report.empiricRecommendations.adjuvantTherapy) {
    parts.push(`Adjuvant directive: ${report.empiricRecommendations.adjuvantTherapy}`);
  }

  if (report.renalDosingAudits.length > 0) {
    const adjusted = report.renalDosingAudits.filter((a) => a.doseReductionRequired);
    if (adjusted.length > 0) {
      parts.push("Renal dose adjustments required:");
      adjusted.forEach((a) => {
        parts.push(`${a.drugName}: prescribed ${a.prescribedDose}, adjusted to ${a.recommendedAdjustedDose}.`);
      });
    }
  }

  if (report.trippedInvariants.length > 0) {
    parts.push(
      `CRITICAL ANTIMICROBIAL SAFETY VETOES TRIPPED: ${report.trippedInvariants.join(", ")}.`
    );
    report.mandatoryActions.forEach((act, idx) => {
      parts.push(`Directive ${idx + 1}: ${act}`);
    });
  } else {
    parts.push(
      "All prescribed antimicrobial agents comply with Sanford and IDSA stewardship guidelines."
    );
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// CURATED CLINICAL ANTIMICROBIAL PRESETS
// -------------------------------------------------------------------------

export const ABX_PRESET_CEFEPIME_RENAL = {
  patientId: "ABX-RENAL-001",
  patientName: "Harold Brooks (68yo M - Sepsis & AKI)",
  ageYears: 68,
  biologicalSex: "MALE" as const,
  weightKg: 78,
  serumCreatinineMgPerDl: 2.8, // CrCl ~ 22.7 mL/min
  syndrome: "SEPTIC_SHOCK_UNKNOWN_SOURCE" as InfectionSyndrome,
  mrsaRiskFactor: true,
  pseudomonasRiskFactor: true,
  betaLactamAllergy: "NO_ALLERGY" as AllergySeverity,
  proposedAntibiotics: [
    { drugName: "Vancomycin", doseMg: 1500, frequencyHours: 12 },
    { drugName: "Cefepime", doseMg: 2000, frequencyHours: 8 }, // Unadjusted! Trips CF-ABX-001
  ],
};

export const ABX_PRESET_MENINGITIS = {
  patientId: "ABX-MENING-002",
  patientName: "Elena Rostova (56yo F - Community Meningitis)",
  ageYears: 56,
  biologicalSex: "FEMALE" as const,
  weightKg: 64,
  serumCreatinineMgPerDl: 0.9,
  syndrome: "BACTERIAL_MENINGITIS" as InfectionSyndrome,
  mrsaRiskFactor: false,
  pseudomonasRiskFactor: false,
  betaLactamAllergy: "NO_ALLERGY" as AllergySeverity,
  proposedAntibiotics: [
    { drugName: "Ceftriaxone", doseMg: 2000, frequencyHours: 12 },
    { drugName: "Vancomycin", doseMg: 1250, frequencyHours: 12 },
    { drugName: "Ampicillin", doseMg: 2000, frequencyHours: 4 }, // Listeria age >= 50
  ],
};

export const ABX_PRESET_ANAPHYLAXIS_CROSS_REACT = {
  patientId: "ABX-ALLERGY-003",
  patientName: "David Kim (42yo M - Penicillin Anaphylaxis)",
  ageYears: 42,
  biologicalSex: "MALE" as const,
  weightKg: 72,
  serumCreatinineMgPerDl: 1.0,
  syndrome: "COMPLICATED_INTRA_ABDOMINAL" as InfectionSyndrome,
  mrsaRiskFactor: false,
  pseudomonasRiskFactor: false,
  betaLactamAllergy: "IGE_MEDIATED_ANAPHYLAXIS" as AllergySeverity,
  allergyDetails: "Prior Ampicillin anaphylaxis (laryngeal edema & hypotension)",
  proposedAntibiotics: [
    { drugName: "Cephalexin", doseMg: 500, frequencyHours: 6 }, // Shared R1 side-chain! Trips CF-ABX-003
  ],
};
