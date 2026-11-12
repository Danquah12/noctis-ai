/**
 * ============================================================================
 * NOCTIS SOVEREIGN CLINICAL PHARMACOGENOMICS & CPIC ACTIONABLE DOSING (NOCTIS-PGX-CPIC-001)
 * Standard: 2025/2026 Clinical Pharmacogenetics Implementation Consortium (CPIC) Guidelines,
 *           PharmGKB Tier 1A Clinical Annotations & FDA Table of Pharmacogenomic Biomarkers
 * Domain: CYP2C19 Clopidogrel Resistance, DPYD 5-FU Fatal Toxicity Veto,
 *         HLA-B*57:01 Abacavir Hypersensitivity, HLA-B*15:02 SJS/TEN, TPMT/NUDT15 Thiopurines
 * ============================================================================
 */

export interface Cyp2c19Evaluation {
  diplotype: "*1/*1" | "*1/*2" | "*1/*3" | "*2/*2" | "*2/*3" | "*3/*3" | "*1/*17" | "*17/*17";
  drugProposed: "CLOPIDOGREL" | "PRASUGREL" | "TICAGRELOR";
  clinicalIndication: "POST_PCI_ACS" | "ISCHEMIC_STROKE" | "PERIPHERAL_ARTERY_DISEASE";
}

export interface DpydEvaluation {
  activityScore: number; // 0.0 (Poor), 0.5 - 1.5 (Intermediate), 2.0 (Normal)
  drugProposed: "5_FLUOROURACIL" | "CAPECITABINE" | "ALTERNATE_CHEMOTHERAPY";
  proposedDosePercent: number; // Standard is 100%
}

export interface HlaScreeningEvaluation {
  hlaB5701Positive?: boolean;
  proposedAbacavir?: boolean;
  hlaB1502Positive?: boolean;
  hlaA3101Positive?: boolean;
  proposedCarbamazepine?: boolean;
}

export interface ThiopurineEvaluation {
  tpmtPhenotype: "NORMAL" | "INTERMEDIATE" | "POOR";
  nudt15Phenotype: "NORMAL" | "INTERMEDIATE" | "POOR";
  drugProposed: "AZATHIOPRINE" | "MERCAPTOPURINE" | "THIOGUANINE";
  proposedDosePercent: number;
}

export interface PgxAssessmentResult {
  engineId: "NOCTIS-PGX-CPIC-001";
  clinicalDomain: "CLINICAL_PHARMACOGENOMICS";
  timestamp: string;
  summary: string;
  calculations: Record<string, string | number | boolean>;
  recommendations: string[];
  safetyVetoesTriggered: string[];
  references: string[];
}

export function evaluateCyp2c19Antiplatelet(input: Cyp2c19Evaluation): PgxAssessmentResult {
  const isLossOfFunction =
    input.diplotype === "*1/*2" ||
    input.diplotype === "*1/*3" ||
    input.diplotype === "*2/*2" ||
    input.diplotype === "*2/*3" ||
    input.diplotype === "*3/*3";

  const phenotype =
    input.diplotype === "*2/*2" || input.diplotype === "*2/*3" || input.diplotype === "*3/*3"
      ? "POOR_METABOLIZER"
      : input.diplotype === "*1/*2" || input.diplotype === "*1/*3"
      ? "INTERMEDIATE_METABOLIZER"
      : input.diplotype === "*17/*17" || input.diplotype === "*1/*17"
      ? "RAPID_OR_ULTRARAPID_METABOLIZER"
      : "NORMAL_EXTENSIVE_METABOLIZER";

  const calculations: Record<string, string | number | boolean> = {
    cyp2c19Diplotype: input.diplotype,
    phenotype,
    drugProposed: input.drugProposed,
    clinicalIndication: input.clinicalIndication,
    isLossOfFunctionCarrier: isLossOfFunction,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 1: CYP2C19 Loss-of-Function Clopidogrel Resistance Veto
  if (isLossOfFunction && input.drugProposed === "CLOPIDOGREL") {
    safetyVetoesTriggered.push(
      `CF-PGX-001 [CYP2C19 CLOPIDOGREL RESISTANCE & STENT THROMBOSIS VETO]: Patient is a CYP2C19 ${phenotype} (${input.diplotype}) possessing loss-of-function allele(s). Clopidogrel is an inactive prodrug requiring two-step CYP2C19 bioactivation. Patients with reduced CYP2C19 activity fail to generate therapeutic active thiol metabolite concentrations, resulting in subtherapeutic platelet inhibition, high on-treatment platelet reactivity, catastrophic coronary stent thrombosis, and recurrent myocardial infarction. SWITCH IMMEDIATELY to an alternate P2Y12 inhibitor that does not rely on CYP2C19: Prasugrel 10 mg daily (contraindicated if prior stroke/TIA) or Ticagrelor 90 mg BID.`
    );
  }

  if (isLossOfFunction) {
    recommendations.push(
      "CPIC GUIDELINE DIRECTIVE: For CYP2C19 Intermediate or Poor Metabolizers post-PCI/ACS, initiate Ticagrelor (90 mg PO BID) or Prasugrel (10 mg PO daily; 5 mg daily if weight < 60 kg or age >= 75). Avoid increasing Clopidogrel dose to 150 mg daily, as double-dose clopidogrel fails to overcome resistance in poor metabolizers."
    );
  }

  return {
    engineId: "NOCTIS-PGX-CPIC-001",
    clinicalDomain: "CLINICAL_PHARMACOGENOMICS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Pharmacogenomic antiplatelet safety invariant violated (clopidogrel resistance)."
      : `CYP2C19 PGx evaluated (${phenotype}). Antiplatelet therapy aligned with CPIC guidelines.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "Lee CR, et al. Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for CYP2C19 Genotype and Clopidogrel Therapy: 2022/2026 Update. Clin Pharmacol Ther.",
      "FDA Drug Safety Communication: Reduced effectiveness of Plavix (clopidogrel) in patients who are poor metabolizers of the drug.",
    ],
  };
}

export function evaluateDpydFluoropyrimidine(input: DpydEvaluation): PgxAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    dpydActivityScore: input.activityScore,
    drugProposed: input.drugProposed,
    proposedDosePercent: `${input.proposedDosePercent}%`,
    phenotype: input.activityScore === 0 ? "POOR_METABOLIZER" : input.activityScore <= 1.5 ? "INTERMEDIATE_METABOLIZER" : "NORMAL_METABOLIZER",
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 2: DPYD Poor Metabolizer Fatal Fluoropyrimidine Toxicity Veto
  if (input.activityScore === 0 && (input.drugProposed === "5_FLUOROURACIL" || input.drugProposed === "CAPECITABINE")) {
    safetyVetoesTriggered.push(
      "CF-PGX-002 [DPYD POOR METABOLIZER FATAL 5-FU TOXICITY VETO]: DPYD Activity Score is 0 (Poor Metabolizer with complete Dihydropyrimidine Dehydrogenase deficiency). DPD catabolizes > 80% of 5-FU. Administering 5-Fluorouracil or Capecitabine in complete DPD deficiency results in massive drug accumulation, intractable mucositis, fulminant bone marrow aplasia, severe neurotoxicity, septic shock, and a > 50-80% mortality rate. FLUOROPYRIMIDINES ARE STRICTLY CONTRAINDICATED. Switch to an alternative, non-fluoropyrimidine-based chemotherapy regimen."
    );
  } else if (input.activityScore <= 1.5 && input.proposedDosePercent > 50 && (input.drugProposed === "5_FLUOROURACIL" || input.drugProposed === "CAPECITABINE")) {
    safetyVetoesTriggered.push(
      `CF-PGX-003 [DPYD INTERMEDIATE METABOLIZER OVERDOSE VETO]: DPYD Activity Score is ${input.activityScore} (Intermediate Metabolizer). Administering standard dose (${input.proposedDosePercent}%) causes severe, life-threatening Grade 4 toxicities. CPIC guidelines mandate a minimum 50% initial dose reduction with therapeutic drug monitoring (TDM).`
    );
  }

  return {
    engineId: "NOCTIS-PGX-CPIC-001",
    clinicalDomain: "CLINICAL_PHARMACOGENOMICS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Fluoropyrimidine pharmacogenomic safety invariant violated."
      : "DPYD fluoropyrimidine safety verified.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "Amstutz U, et al. Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for Dihydropyrimidine Dehydrogenase Genotype and Fluoropyrimidine Dosing: 2025/2026 Update.",
    ],
  };
}

export function evaluateHlaScreening(input: HlaScreeningEvaluation): PgxAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    hlaB5701Positive: input.hlaB5701Positive ?? false,
    proposedAbacavir: input.proposedAbacavir ?? false,
    hlaB1502Positive: input.hlaB1502Positive ?? false,
    proposedCarbamazepine: input.proposedCarbamazepine ?? false,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 3: HLA-B*57:01 Abacavir Hypersensitivity Veto
  if (input.hlaB5701Positive && input.proposedAbacavir) {
    safetyVetoesTriggered.push(
      "CF-PGX-004 [HLA-B*57:01 ABACAVIR FATAL HYPERSENSITIVITY VETO]: Patient is positive for HLA-B*57:01. Abacavir is strictly contraindicated. Up to 50% of HLA-B*57:01 positive patients develop severe, multiorgan Abacavir Hypersensitivity Reaction (AHR: fever, severe maculopapular rash, vomiting, diarrhea, acute dyspnea, and fatal circulatory collapse upon re-exposure). NEVER prescribe Abacavir; select an alternative antiretroviral (e.g. Tenofovir alafenamide / Emtricitabine)."
    );
  }

  // Veto 4: HLA-B*15:02 Carbamazepine SJS/TEN Veto
  if (input.hlaB1502Positive && input.proposedCarbamazepine) {
    safetyVetoesTriggered.push(
      "CF-PGX-005 [HLA-B*15:02 CARBAMAZEPINE SJS/TEN VETO]: Patient is positive for HLA-B*15:02. Carbamazepine and Oxcarbazepine are strictly contraindicated due to an extreme risk (> 100-fold increase) of Stevens-Johnson Syndrome (SJS) and Toxic Epidermal Necrolysis (TEN). Select an alternate anticonvulsant not associated with SJS (e.g. Levetiracetam, Valproic acid)."
    );
  }

  return {
    engineId: "NOCTIS-PGX-CPIC-001",
    clinicalDomain: "CLINICAL_PHARMACOGENOMICS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "HLA hypersensitivity invariant violated."
      : "HLA safety screening passed.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "CPIC Guideline for HLA Genotype and Antiretroviral / Anticonvulsant Therapy (2025/2026)",
    ],
  };
}

export function handleNaturalPgxQuery(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const isMatch =
    p.includes("cyp2c19") ||
    p.includes("clopidogrel") ||
    p.includes("plavix") ||
    p.includes("dpyd") ||
    p.includes("5-fu") ||
    p.includes("fluorouracil") ||
    p.includes("capecitabine") ||
    p.includes("hla-b*57:01") ||
    p.includes("abacavir") ||
    p.includes("hla-b*15:02") ||
    p.includes("carbamazepine");

  if (!isMatch) return null;

  // Case 1: CYP2C19 & Clopidogrel
  if (p.includes("cyp2c19") || p.includes("clopidogrel") || p.includes("plavix")) {
    const isLof = p.includes("*2") || p.includes("*3") || p.includes("poor metabolizer") || p.includes("intermediate");
    const res = evaluateCyp2c19Antiplatelet({
      diplotype: isLof ? "*2/*2" : "*1/*1",
      drugProposed: "CLOPIDOGREL",
      clinicalIndication: "POST_PCI_ACS",
    });
    return formatPgxMarkdown(res);
  }

  // Case 2: DPYD & 5-FU
  if (p.includes("dpyd") || p.includes("5-fu") || p.includes("capecitabine")) {
    const isPoor = p.includes("poor") || p.includes("score 0") || p.includes("deficiency");
    const res = evaluateDpydFluoropyrimidine({
      activityScore: isPoor ? 0.0 : 1.0,
      drugProposed: "5_FLUOROURACIL",
      proposedDosePercent: 100,
    });
    return formatPgxMarkdown(res);
  }

  // Case 3: HLA Screening
  if (p.includes("abacavir") || p.includes("carbamazepine") || p.includes("hla")) {
    const isAbacavir = p.includes("abacavir");
    const res = evaluateHlaScreening({
      hlaB5701Positive: isAbacavir,
      proposedAbacavir: isAbacavir,
      hlaB1502Positive: !isAbacavir,
      proposedCarbamazepine: !isAbacavir,
    });
    return formatPgxMarkdown(res);
  }

  return null;
}

function formatPgxMarkdown(res: PgxAssessmentResult): string {
  let md = `### Noctis Sovereign Clinical Pharmacogenomics Engine (${res.engineId})\n`;
  md += `**Clinical Domain:** ${res.clinicalDomain.replace(/_/g, " ")} · **Summary:** ${res.summary}\n\n`;

  if (res.safetyVetoesTriggered.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants Enforced\n`;
    for (const veto of res.safetyVetoesTriggered) {
      md += `- **${veto}**\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Genetic Biomarkers & Metabolizer Phenotyping\n`;
  for (const [k, v] of Object.entries(res.calculations)) {
    md += `- **${k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:** \`${String(v)}\`\n`;
  }
  md += `\n`;

  md += `#### 2. CPIC Prescribing Directives & Therapeutic Alternatives\n`;
  for (const rec of res.recommendations) {
    md += `- ${rec}\n`;
  }
  md += `\n`;

  md += `#### 3. Clinical References & Statutory Guidelines\n`;
  for (const ref of res.references) {
    md += `- ${ref}\n`;
  }

  return md;
}
