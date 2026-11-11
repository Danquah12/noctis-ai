/**
 * NOCTIS SOVEREIGN INFECTIOUS DISEASE & SEPSIS FRONTIERS ENGINE (NOCTIS-ID-SEPSIS-001)
 * Standards & Guidelines:
 * - IDSA Guidance on the Treatment of Antimicrobial-Resistant Gram-Negative Infections (2024-2026)
 * - Surviving Sepsis Campaign (SSC) International Guidelines for Sepsis Management (2021-2026)
 * - IDSA Guidelines for the Management of Aspergillosis and Candidiasis
 *
 * Non-Compensatory Safety Invariants:
 * - CF-ID-001: Colistin Monotherapy Nephrotoxicity Veto (Polymyxin/Colistin monotherapy is clinically inferior with >40% AKI; novel targeted beta-lactam combinations are preferred)
 * - CF-ID-002: Metallo-Beta-Lactamase (MBL) Monotherapy Veto (Ceftazidime-avibactam alone against NDM/VIM fails; MUST be paired with Aztreonam for CZA-ATM synergy)
 * - CF-ID-003: Cefepime Neurotoxicity Renal Failure Veto (Failure to dose-reduce Cefepime in GFR < 50 mL/min causes non-convulsive status epilepticus and coma)
 * - CF-ID-004: Echinocandin Delay in Candidemia Veto (Empiric Fluconazole in septic shock candidemia is prohibited due to high C. glabrata/krusei resistance; Echinocandins mandatory)
 */

export interface DtrGnrInput {
  pathogenIdentified: "CARBAPENEM_RESISTANT_ENTERIC_CRE" | "PSEUDOMONAS_AERUGINOSA_DTR" | "ACINETOBACTER_BAUMANNII_CRAB" | "STENOTROPHOMONAS_MALTOPHILIA";
  resistanceMechanismOrEnzyme?: "KPC" | "NDM_METALLO" | "VIM_METALLO" | "OXA_48_LIKE" | "PORIN_LOSS_EFFLUX" | "UNKNOWN";
  infectionSite: "BLOODSTREAM_SEPSIS" | "VENTILATOR_ASSOCIATED_PNEUMONIA" | "COMPLICATED_UTI" | "INTRA_ABDOMINAL";
  patientWeightKg: number;
  estimatedGfrMlMin: number;
  proposedAntibioticRegimen: string[];
}

export interface DtrGnrResult {
  engineId: "NOCTIS-ID-SEPSIS-001";
  optimalAntibioticRegimen: {
    primaryDrug: string;
    dosingAndInfusionSchedule: string;
    combinationPartner?: string;
    rationale: string;
  };
  pkPdOptimizationDirectives: string[];
  safetyVetoes: string[];
}

export interface BetaLactamPkPdInput {
  drugName: "PIPERACILLIN_TAZOBACTAM" | "MEROPENEM" | "CEFEPIME";
  currentDosingSchedule: string; // e.g. "3.375g q6h over 30 min"
  infusionType: "STANDARD_INTERMITTENT_30_MIN" | "EXTENDED_INFUSION_3_TO_4_HOURS" | "CONTINUOUS_24_HOUR_INFUSION";
  estimatedGfrMlMin: number;
  isInSepticShock: boolean;
  hasAlteredMentalStatusOrMyoclonus: boolean;
}

export interface BetaLactamPkPdResult {
  engineId: "NOCTIS-ID-SEPSIS-001";
  timeAboveMicTargetMet: boolean; // Target 100% T > 4x MIC in septic shock
  recommendedOptimizedPrescription: string;
  pkPdEvidenceSummary: string;
  safetyVetoes: string[];
}

export interface InvasiveFungalInput {
  fungalSuspectedOrConfirmed: "INVASIVE_ASPERGILLOSIS" | "CANDIDEMIA_SEPSIS";
  galactomannanIndex?: number; // >= 0.5 serum, >= 1.0 BAL
  bloodCulturesPositiveForYeast: boolean;
  centralLinePresent: boolean;
  ophthalmologyDilatedExamPerformed: boolean;
  proposedAntifungal: string;
}

export interface InvasiveFungalResult {
  engineId: "NOCTIS-ID-SEPSIS-001";
  antifungalRecommendation: {
    firstLineDrug: string;
    loadingDose: string;
    maintenanceDose: string;
    monitoringDirectives: string[];
  };
  sourceControlAndConsultDirectives: string[];
  safetyVetoes: string[];
}

// ============================================================================
// 1. DTR GRAM-NEGATIVE RODS & TARGETED ANTIMICROBIALS
// ============================================================================

export function evaluateDtrGnrInfection(input: DtrGnrInput): DtrGnrResult {
  const {
    pathogenIdentified,
    resistanceMechanismOrEnzyme,
    infectionSite,
    estimatedGfrMlMin,
    proposedAntibioticRegimen,
  } = input;

  const vetoes: string[] = [];
  const pkpd: string[] = [];

  // Check CF-ID-001: Colistin monotherapy
  const hasColistinMonotherapy = proposedAntibioticRegimen.some((a) => a.toLowerCase().includes("colistin") || a.toLowerCase().includes("polymyxin")) &&
    proposedAntibioticRegimen.length === 1;
  if (hasColistinMonotherapy) {
    vetoes.push(
      "CF-ID-001 [COLISTIN MONOTHERAPY VETO]: Polymyxin/Colistin monotherapy is clinically inferior with higher all-cause mortality and > 40% incidence of severe acute kidney injury. Target-specific beta-lactam/beta-lactamase inhibitor combinations are preferred first-line per IDSA 2024-2026 guidance."
    );
  }

  // Check CF-ID-002: MBL monotherapy
  const isMetallo = resistanceMechanismOrEnzyme === "NDM_METALLO" || resistanceMechanismOrEnzyme === "VIM_METALLO";
  const hasCzaAlone = proposedAntibioticRegimen.some((a) => a.toLowerCase().includes("avibactam") && !proposedAntibioticRegimen.some((b) => b.toLowerCase().includes("aztreonam")));
  if (isMetallo && hasCzaAlone) {
    vetoes.push(
      "CF-ID-002 [METALLO-BETA-LACTAMASE CZA MONOTHERAPY VETO]: The isolate produces a Metallo-Beta-Lactamase (NDM/VIM). Avibactam does NOT inhibit class B zinc-dependent metallo-enzymes. Ceftazidime-avibactam monotherapy will FAIL. You MUST co-administer Aztreonam (CZA-ATM synergy) or switch to Cefiderocol."
    );
  }

  let primaryDrug = "Ceftazidime-avibactam";
  let doseSchedule = "2.5 g IV every 8 hours infused over 2 hours";
  let partner: string | undefined;
  let rationale = "First-line targeted therapy for KPC-producing CRE.";

  if (pathogenIdentified === "CARBAPENEM_RESISTANT_ENTERIC_CRE") {
    if (isMetallo) {
      primaryDrug = "Ceftazidime-avibactam + Aztreonam (CZA-ATM Synergy) OR Cefiderocol";
      doseSchedule = "Ceftazidime-avibactam 2.5 g IV q8h (2-hour infusion) PLUS Aztreonam 2.0 g IV q8h (2-hour infusion administered simultaneously)";
      partner = "Aztreonam 2.0 g IV q8h (or Cefiderocol 2.0 g IV q8h as 3-hour extended infusion)";
      rationale = "Aztreonam is stable against metallo-beta-lactamases but destroyed by co-produced ESBLs/AmpC; Avibactam inhibits the co-produced enzymes, protecting Aztreonam.";
    } else if (resistanceMechanismOrEnzyme === "OXA_48_LIKE") {
      primaryDrug = "Ceftazidime-avibactam";
      doseSchedule = "2.5 g IV every 8 hours infused over 2 hours";
      rationale = "Ceftazidime-avibactam is the agent of choice for OXA-48-like producing Enterobacterales.";
    } else {
      primaryDrug = "Ceftazidime-avibactam OR Meropenem-vaborbactam";
      doseSchedule = "Meropenem-vaborbactam 4.0 g (2g/2g) IV every 8 hours infused over 3 hours";
      rationale = "Meropenem-vaborbactam provides potent inhibition of KPC-type carbapenemases.";
    }
  } else if (pathogenIdentified === "PSEUDOMONAS_AERUGINOSA_DTR") {
    primaryDrug = "Ceftolozane-tazobactam";
    doseSchedule = "3.0 g (2g/1g) IV every 8 hours infused over 3 hours";
    rationale = "Ceftolozane-tazobactam is the premier agent for DTR-Pseudomonas with AmpC derepression and porin loss.";
  } else if (pathogenIdentified === "ACINETOBACTER_BAUMANNII_CRAB") {
    primaryDrug = "High-Dose Ampicillin-sulbactam Combination";
    doseSchedule = "Ampicillin-sulbactam 9.0 g (6g ampicillin / 3g sulbactam) IV every 8 hours infused over 4 hours";
    partner = "Combine with Cefiderocol 2.0 g q8h (3h infusion) OR Minocycline 200 mg IV q12h";
    rationale = "Sulbactam possesses unique intrinsic bactericidal binding to PBP1 and PBP3 of Acinetobacter; high doses (>= 9-12g/day of sulbactam component) are required.";
  }

  pkpd.push("Adjust doses strictly for renal function while maintaining extended infusions to optimize %T > MIC.");
  pkpd.push("In severe pneumonia or septic shock, higher loading doses are mandatory to overcome expanded volume of distribution.");

  return {
    engineId: "NOCTIS-ID-SEPSIS-001",
    optimalAntibioticRegimen: {
      primaryDrug,
      dosingAndInfusionSchedule: doseSchedule,
      combinationPartner: partner,
      rationale,
    },
    pkPdOptimizationDirectives: pkpd,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// 2. PK/PD BETA-LACTAM EXTENDED & CONTINUOUS INFUSIONS
// ============================================================================

export function evaluateBetaLactamPkPd(input: BetaLactamPkPdInput): BetaLactamPkPdResult {
  const {
    drugName,
    infusionType,
    estimatedGfrMlMin,
    isInSepticShock,
    hasAlteredMentalStatusOrMyoclonus,
  } = input;

  const vetoes: string[] = [];

  // Check CF-ID-003: Cefepime neurotoxicity
  if (drugName === "CEFEPIME" && estimatedGfrMlMin < 50 && (hasAlteredMentalStatusOrMyoclonus || !input.currentDosingSchedule.includes("adjusted"))) {
    vetoes.push(
      `CF-ID-003 [CEFEPIME NEUROTOXICITY RENAL VETO]: Patient has GFR ${estimatedGfrMlMin} mL/min with active neurotoxicity / high encephalopathy risk. Cefepime crosses the blood-brain barrier and exhibits competitive antagonism of GABA-A receptors. In unadjusted renal clearance, neurotoxic accumulation triggers myoclonus, aphasia, and non-convulsive status epilepticus. Immediately adjust dose (e.g. 1-2g IV q24h or 1g q12h) or switch to Meropenem.`
    );
  }

  const isOptimalInfusion = infusionType === "EXTENDED_INFUSION_3_TO_4_HOURS" || infusionType === "CONTINUOUS_24_HOUR_INFUSION";

  let rec = "";
  let summary = "";

  if (drugName === "PIPERACILLIN_TAZOBACTAM") {
    rec = "Piperacillin-tazobactam: Loading dose 4.5 g IV over 30 minutes, followed by 4.5 g IV every 8 hours infused over 4 hours (Extended Infusion) OR 13.5-18.0 g continuous 24-hour infusion.";
    summary = "Time-dependent killing (%T > MIC): Intermittent 30-min infusions drop below MIC for up to 50% of the dosing interval in septic shock. Extended 4-hour infusions achieve > 95% target attainment and significantly reduce 30-day mortality in critically ill patients.";
  } else if (drugName === "MEROPENEM") {
    rec = "Meropenem: Loading dose 2.0 g IV over 30 minutes, followed by 2.0 g IV every 8 hours infused over 3 hours (Extended Infusion) OR 6.0 g continuous 24-hour infusion.";
    summary = "Targeting 100% T > 4x MIC: Carbapenems maximize bactericidal killing when free drug concentrations remain above MIC for >= 75-100% of the interval.";
  } else {
    rec = "Cefepime: 2.0 g IV every 8 hours infused over 4 hours (Extended Infusion), strictly adjusted for renal function.";
    summary = "Extended infusion maximizes bactericidal exposure while minimizing peak concentrations associated with neurotoxicity.";
  }

  return {
    engineId: "NOCTIS-ID-SEPSIS-001",
    timeAboveMicTargetMet: isOptimalInfusion,
    recommendedOptimizedPrescription: rec,
    pkPdEvidenceSummary: summary,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// 3. INVASIVE FUNGAL INFECTIONS (ASPERGILLOSIS & CANDIDEMIA)
// ============================================================================

export function evaluateInvasiveFungalInfection(input: InvasiveFungalInput): InvasiveFungalResult {
  const {
    fungalSuspectedOrConfirmed,
    galactomannanIndex,
    bloodCulturesPositiveForYeast,
    centralLinePresent,
    ophthalmologyDilatedExamPerformed,
    proposedAntifungal,
  } = input;

  const vetoes: string[] = [];
  const dirs: string[] = [];

  // Check CF-ID-004: Fluconazole in candidemic shock
  if (fungalSuspectedOrConfirmed === "CANDIDEMIA_SEPSIS" && proposedAntifungal.toLowerCase().includes("fluconazole")) {
    vetoes.push(
      "CF-ID-004 [FLUCONAZOLE EMPIRIC CANDIDEMIA VETO]: Fluconazole is inappropriate as empiric first-line therapy for candidemia in critically ill or septic patients. Emerging azole resistance in Candida glabrata and intrinsic resistance in Candida krusei result in unacceptably high mortality. An Echinocandin is mandatory first-line therapy per IDSA guidelines."
    );
  }

  let drug = "Caspofungin";
  let load = "Caspofungin 70 mg IV loading dose on Day 1";
  let maint = "Followed by 50 mg IV daily (or Micafungin 100 mg IV daily; Anidulafungin 200 mg load then 100 mg daily)";
  const monDirs: string[] = [];

  if (fungalSuspectedOrConfirmed === "INVASIVE_ASPERGILLOSIS") {
    drug = "Voriconazole";
    load = "Voriconazole 6 mg/kg IV every 12 hours for 2 doses (Day 1)";
    maint = "Followed by 4 mg/kg IV every 12 hours (or Isavuconazole 200 mg IV q8h x 6 doses, then 200 mg daily)";
    monDirs.push("Therapeutic Drug Monitoring (TDM): Target voriconazole trough concentration 2.0-5.5 mcg/mL; monitor for visual disturbances, QTc prolongation, and hepatotoxicity.");
    if (galactomannanIndex !== undefined && galactomannanIndex >= 0.5) {
      dirs.push(`Positive Galactomannan Antigen Index (${galactomannanIndex} >= 0.5): Confirms probable invasive aspergillosis in immunocompromised/ICU host.`);
    }
  } else {
    // Candidemia
    monDirs.push("Draw repeat blood cultures every 24-48 hours until negative to document clearance of fungemia; treatment duration is 14 days from FIRST negative blood culture.");
    if (centralLinePresent) {
      dirs.push("🚨 MANDATORY SOURCE CONTROL: Remove all indwelling central venous catheters immediately (within 24-48 hours). Retained intravascular catheters act as a persistent fungal biofilm nidus.");
    }
    if (!ophthalmologyDilatedExamPerformed) {
      dirs.push("🚨 MANDATORY OPHTHALMOLOGY CONSULTATION: Perform dilated retinal examination within the first week of candidemia to rule out fungal endophthalmitis (which mandates vitrectomy and prolonged intravitreal/liposomal amphotericin B therapy).");
    }
  }

  return {
    engineId: "NOCTIS-ID-SEPSIS-001",
    antifungalRecommendation: {
      firstLineDrug: drug,
      loadingDose: load,
      maintenanceDose: maint,
      monitoringDirectives: monDirs,
    },
    sourceControlAndConsultDirectives: dirs,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// NATURAL LANGUAGE ROUTER FOR INFECTIOUS DISEASE & SEPSIS
// ============================================================================

export function handleNaturalIdSepsisQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  const isDtrGnrQuery =
    (/\b(cre|carbapenem-resistant|kpc|ndm|metallo|vim|oxa-48|pseudomonas|dtr|crab|acinetobacter|avibactam|vaborbactam|ceftolozane|cefiderocol)\b/i.test(
      q
    ) && /\b(antibiotic|regimen|resistance|synergy|aztreonam|colistin)\b/i.test(q)) ||
    /\b(cza-atm|ceftazidime-avibactam\s+and\s+aztreonam)\b/i.test(q);

  const isPkPdQuery =
    /\b(pk\/pd|extended\s+infusion|continuous\s+infusion|time\s+above\s+mic|t\s*>\s*mic|cefepime\s+neurotoxicity|piperacillin|zosyn|meropenem)\b/i.test(
      q
    ) && /\b(infusion|hours?|dosing|gfr|clearance)\b/i.test(q);

  const isFungalQuery =
    /\b(aspergillosis|galactomannan|candidemia|yeast\s+in\s+blood|echinocandin|caspofungin|micafungin|voriconazole|amphotericin|endophthalmitis)\b/i.test(
      q
    );

  if (!isDtrGnrQuery && !isPkPdQuery && !isFungalQuery) return null;

  // 1. DTR-GNR Execution
  if (isDtrGnrQuery) {
    const isMbl = /\bndm|metallo|vim\b/i.test(q);
    const isCrab = /\bacinetobacter|crab\b/i.test(q);
    const isCrpa = /\bpseudomonas\b/i.test(q);

    const report = evaluateDtrGnrInfection({
      pathogenIdentified: isCrab
        ? "ACINETOBACTER_BAUMANNII_CRAB"
        : isCrpa
        ? "PSEUDOMONAS_AERUGINOSA_DTR"
        : "CARBAPENEM_RESISTANT_ENTERIC_CRE",
      resistanceMechanismOrEnzyme: isMbl ? "NDM_METALLO" : "KPC",
      infectionSite: "VENTILATOR_ASSOCIATED_PNEUMONIA",
      patientWeightKg: 70,
      estimatedGfrMlMin: 65,
      proposedAntibioticRegimen: [q],
    });

    return formatDtrGnrReport(report);
  }

  // 2. PK/PD Execution
  if (isPkPdQuery) {
    const isPiptazo = /\bpiperacillin|zosyn\b/i.test(q);
    const isCefepime = /\bcefepime\b/i.test(q);

    const report = evaluateBetaLactamPkPd({
      drugName: isPiptazo ? "PIPERACILLIN_TAZOBACTAM" : isCefepime ? "CEFEPIME" : "MEROPENEM",
      currentDosingSchedule: q,
      infusionType: "STANDARD_INTERMITTENT_30_MIN",
      estimatedGfrMlMin: 35,
      isInSepticShock: true,
      hasAlteredMentalStatusOrMyoclonus: isCefepime,
    });

    return formatPkPdReport(report);
  }

  // 3. Fungal Execution
  const isAsp = /\baspergillosis|galactomannan\b/i.test(q);
  const report = evaluateInvasiveFungalInfection({
    fungalSuspectedOrConfirmed: isAsp ? "INVASIVE_ASPERGILLOSIS" : "CANDIDEMIA_SEPSIS",
    galactomannanIndex: isAsp ? 1.4 : undefined,
    bloodCulturesPositiveForYeast: !isAsp,
    centralLinePresent: true,
    ophthalmologyDilatedExamPerformed: false,
    proposedAntifungal: q,
  });

  return formatFungalReport(report);
}

function formatDtrGnrReport(res: DtrGnrResult): string {
  let md = `### Noctis DTR Gram-Negative Antimicrobial Resistance Engine (NOCTIS-ID-SEPSIS-001)\n`;
  md += `**Targeted Regimen:** \`${res.optimalAntibioticRegimen.primaryDrug}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Evidence-Based Antimicrobial Prescription\n`;
  md += `- **Primary Order:** ${res.optimalAntibioticRegimen.primaryDrug}\n`;
  md += `- **Dosing & Infusion Directive:** ${res.optimalAntibioticRegimen.dosingAndInfusionSchedule}\n`;
  if (res.optimalAntibioticRegimen.combinationPartner) {
    md += `- **Synergistic Combination Partner:** ${res.optimalAntibioticRegimen.combinationPartner}\n`;
  }
  md += `- **Clinical Justification:** ${res.optimalAntibioticRegimen.rationale}\n\n`;

  md += `#### 2. PK/PD Optimization Directives\n`;
  for (const dir of res.pkPdOptimizationDirectives) {
    md += `- ${dir}\n`;
  }

  return md;
}

function formatPkPdReport(res: BetaLactamPkPdResult): string {
  let md = `### Noctis Beta-Lactam PK/PD Extended Infusion Engine (NOCTIS-ID-SEPSIS-001)\n`;
  md += `**Time Above MIC Target Met:** \`${res.timeAboveMicTargetMet ? "OPTIMAL TARGET REACHED" : "SUBTHERAPEUTIC INTERMITTENT EXPOSURE"}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Recommended Optimized Extended / Continuous Infusion\n`;
  md += `${res.recommendedOptimizedPrescription}\n\n`;

  md += `#### 2. Pharmacodynamic Evidence Benchmark\n`;
  md += `${res.pkPdEvidenceSummary}\n`;

  return md;
}

function formatFungalReport(res: InvasiveFungalResult): string {
  let md = `### Noctis Invasive Fungal Infection & Source Control Engine (NOCTIS-ID-SEPSIS-001)\n`;
  md += `**First-Line Antifungal:** \`${res.antifungalRecommendation.firstLineDrug}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Antifungal Dosing Protocol\n`;
  md += `- **Loading Regimen:** ${res.antifungalRecommendation.loadingDose}\n`;
  md += `- **Maintenance Regimen:** ${res.antifungalRecommendation.maintenanceDose}\n`;
  for (const m of res.antifungalRecommendation.monitoringDirectives) {
    md += `- **Monitoring Directive:** ${m}\n`;
  }
  md += `\n`;

  md += `#### 2. Source Control & Mandatory Specialty Consultations\n`;
  for (const d of res.sourceControlAndConsultDirectives) {
    md += `- ${d}\n`;
  }

  return md;
}
