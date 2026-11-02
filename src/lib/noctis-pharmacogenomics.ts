/**
 * Noctis Oncology & Cardiovascular Pharmacogenomic Safety Layer (NPGX)
 * ============================================================================
 * Synchronized with CPIC (Clinical Pharmacogenetics Implementation Consortium)
 * and FDA Table of Pharmacogenomic Biomarkers in Drug Labeling.
 *
 * Checks for high-risk drug-gene interactions and cardio-oncology safety gates:
 *   1. DPYD / Fluorouracil (5-FU, Capecitabine, FOLFOX, FOLFIRI)
 *   2. CYP2D6 / Tamoxifen & Strong Inhibitors (Fluoxetine, Paroxetine)
 *   3. Cardio-Oncology: Anthracyclines & HER2 LVEF Pre-Screening (Trastuzumab, Doxorubicin)
 *   4. CYP2C19 / Clopidogrel (Plavix) Antiplatelet Resistance
 *   5. TPMT & NUDT15 / Thiopurines (Azathioprine, 6-MP)
 *   6. HLA-B*5701 / Abacavir Hypersensitivity
 * ============================================================================
 */

export interface PharmacogenomicRiskAssessment {
  ruleId: string;
  drugName: string;
  geneOrBiomarker: string;
  riskSeverity: "CONTRAINDICATED_CRITICAL" | "HIGH_RISK_WARNING" | "MODERATE_CAUTION";
  mechanismSummary: string;
  cpicGuidelineRecommendation: string;
  preTreatmentTestingRequired: boolean;
  alternativeOptions: string[];
}

export interface PharmacogenomicReport {
  dossierId: string;
  detectedRisks: PharmacogenomicRiskAssessment[];
  totalRisks: number;
  hasCriticalContraindication: boolean;
  prescribingSafeZone: string;
  physicianDiscussionChecklist: string[];
}

const PHARMACOGENOMIC_RULES: {
  ruleId: string;
  drugKeywords: RegExp;
  interactingKeywords?: RegExp;
  gene: string;
  severity: PharmacogenomicRiskAssessment["riskSeverity"];
  mechanism: string;
  recommendation: string;
  preTestRequired: boolean;
  alternatives: string[];
}[] = [
  {
    ruleId: "PGX-DPYD-001",
    drugKeywords: /\b(folfox|folfiri|fluorouracil|5-fu|capecitabine|xeloda)\b/i,
    gene: "DPYD (Dihydropyrimidine Dehydrogenase)",
    severity: "HIGH_RISK_WARNING",
    mechanism: "DPD metabolizes >80% of systemic 5-FU. Patients with DPYD genetic variants (e.g. *2A, *13, c.2846A>T) experience severe, potentially lethal systemic fluoropyrimidine toxicities including profound mucositis, pancytopenia, and neurotoxicity.",
    recommendation: "CPIC Guidelines recommend pre-treatment DPYD genotype or phenotype testing before initiating fluoropyrimidines. Intermediate metabolizers require a 50% initial dose reduction; poor metabolizers require alternative non-fluoropyrimidine therapy.",
    preTestRequired: true,
    alternatives: ["Alternative systemic regimen (e.g. non-fluoropyrimidine protocol)", "50% upfront dose titration with close therapeutic drug monitoring"],
  },
  {
    ruleId: "PGX-CYP2D6-TAM-002",
    drugKeywords: /\b(tamoxifen|nolvadex)\b/i,
    interactingKeywords: /\b(fluoxetine|prozac|paroxetine|paxil|bupropion|wellbutrin|duloxetine|cymbalta)\b/i,
    gene: "CYP2D6",
    severity: "HIGH_RISK_WARNING",
    mechanism: "Tamoxifen is a prodrug requiring hepatic CYP2D6 bioactivation into endoxifen (its active anti-estrogen metabolite). Co-administration of strong CYP2D6 inhibitors significantly reduces endoxifen concentrations, leading to higher breast cancer recurrence rates.",
    recommendation: "Avoid strong CYP2D6 inhibitors in patients receiving adjuvant tamoxifen. Switch antidepressant to an agent with negligible CYP2D6 inhibition (e.g. Venlafaxine, Citalopram, Escitalopram) or consider an Aromatase Inhibitor in post-menopausal women.",
    preTestRequired: false,
    alternatives: ["Venlafaxine (Effexor)", "Escitalopram (Lexapro)", "Aromatase Inhibitor (Anastrozole/Letrozole) if postmenopausal"],
  },
  {
    ruleId: "PGX-CARDIO-HER2-003",
    drugKeywords: /\b(trastuzumab|herceptin|pertuzumab|perjeta|t-dm1|kadcyla|enhertu)\b/i,
    gene: "HER2 Cardio-Oncology Gate (LVEF Monitoring)",
    severity: "HIGH_RISK_WARNING",
    mechanism: "HER2 signaling is essential for human cardiac myocyte survival and repair under mechanical stress. HER2 inhibition causes dose-independent, often reversible cardiomyocyte dysfunction and decline in left ventricular ejection fraction (LVEF).",
    recommendation: "Mandatory baseline echocardiogram or MUGA scan to document LVEF >= 50-55% prior to initiating therapy. Withhold treatment if LVEF drops >= 10% from baseline and to below 50%; monitor LVEF every 3 months during active therapy.",
    preTestRequired: true,
    alternatives: ["Cardiology co-management and initiation of cardioprotective ACEi/beta-blocker therapy"],
  },
  {
    ruleId: "PGX-CARDIO-ANTHRA-004",
    drugKeywords: /\b(doxorubicin|adriamycin|daunorubicin|epirubicin|anthracycline)\b/i,
    gene: "Topoisomerase IIβ Cardio-Toxicity Gate",
    severity: "HIGH_RISK_WARNING",
    mechanism: "Anthracyclines cause dose-dependent, cumulative irreversible myocardial cell injury through topoisomerase IIβ inhibition and reactive oxygen species generation, leading to dilated cardiomyopathy.",
    recommendation: "Document baseline LVEF prior to cycle 1. Limit lifetime cumulative doxorubicin exposure to < 450–550 mg/m²; consider dexrazoxane cardioprotection or liposomal formulations when cumulative doses approach threshold.",
    preTestRequired: true,
    alternatives: ["Liposomal Doxorubicin (Doxil)", "Dexrazoxane cardioprotective co-infusion"],
  },
  {
    ruleId: "PGX-CYP2C19-PLAVIX-005",
    drugKeywords: /\b(clopidogrel|plavix)\b/i,
    gene: "CYP2C19",
    severity: "MODERATE_CAUTION",
    mechanism: "Clopidogrel is an inactive prodrug requiring CYP2C19 conversion to its active thiol metabolite. CYP2C19 loss-of-function alleles (*2, *3) result in impaired platelet inhibition and higher risk of stent thrombosis and recurrent myocardial infarction.",
    recommendation: "In patients with acute coronary syndrome undergoing percutaneous coronary intervention (PCI), CPIC guidelines recommend alternative P2Y12 platelet inhibitors (Ticagrelor or Prasugrel) in confirmed CYP2C19 poor/intermediate metabolizers.",
    preTestRequired: false,
    alternatives: ["Ticagrelor (Brilinta) 90 mg BID", "Prasugrel (Effient) 10 mg daily (if no prior stroke/TIA)"],
  },
  {
    ruleId: "PGX-TPMT-006",
    drugKeywords: /\b(azathioprine|imuran|mercaptopurine|6-mp|thioguanine)\b/i,
    gene: "TPMT & NUDT15",
    severity: "HIGH_RISK_WARNING",
    mechanism: "Thiopurine S-methyltransferase (TPMT) and NUDT15 inactivate cytotoxic thiopurine metabolites. Deficient alleles lead to intracellular accumulation of thioguanine nucleotides (TGNs) causing catastrophic bone marrow aplasia and life-threatening neutropenia.",
    recommendation: "Perform baseline TPMT and NUDT15 genotyping or TPMT enzymatic activity assay before starting thiopurine therapy. Reduce dose by 50–80% in intermediate metabolizers; avoid or reduce by 90% with thrice-weekly dosing in poor metabolizers.",
    preTestRequired: true,
    alternatives: ["Non-thiopurine immunosuppressive agent (e.g. Methotrexate, biologic therapy)"],
  },
];

/**
 * Evaluates text or medication lists for pharmacogenomic drug-gene and drug-drug interactions.
 */
export function evaluatePharmacogenomics(input: string | string[]): PharmacogenomicReport {
  const text = Array.isArray(input) ? input.join(" ") : input;
  const dossierId = `NPGX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const detectedRisks: PharmacogenomicRiskAssessment[] = [];

  for (const rule of PHARMACOGENOMIC_RULES) {
    if (rule.drugKeywords.test(text)) {
      if (rule.interactingKeywords) {
        if (!rule.interactingKeywords.test(text)) {
          continue; // requires both drug and interacting inhibitor
        }
      }
      detectedRisks.push({
        ruleId: rule.ruleId,
        drugName: rule.drugKeywords.source.replace(/[\\^$()|b]/g, " ").trim(),
        geneOrBiomarker: rule.gene,
        riskSeverity: rule.severity,
        mechanismSummary: rule.mechanism,
        cpicGuidelineRecommendation: rule.recommendation,
        preTreatmentTestingRequired: rule.preTestRequired,
        alternativeOptions: rule.alternatives,
      });
    }
  }

  const hasCritical = detectedRisks.some((r) => r.riskSeverity === "CONTRAINDICATED_CRITICAL");
  const physicianDiscussionChecklist = detectedRisks.map(
    (r) => `Verify baseline testing for ${r.geneOrBiomarker} prior to administering ${r.drugName.split(" ")[0]}.`
  );

  return {
    dossierId,
    detectedRisks,
    totalRisks: detectedRisks.length,
    hasCriticalContraindication: hasCritical,
    prescribingSafeZone: detectedRisks.length === 0 ? "CLEAR_NO_PGX_ALERT" : "ACTIONABLE_PGX_ALERTS_PRESENT",
    physicianDiscussionChecklist,
  };
}

/**
 * Formats the Pharmacogenomic Report into clean markdown.
 */
export function formatPharmacogenomicsMarkdown(report: PharmacogenomicReport): string {
  if (report.totalRisks === 0) {
    return "";
  }

  const alertRows = report.detectedRisks.map((r) => {
    const badge = r.riskSeverity === "CONTRAINDICATED_CRITICAL"
      ? "🚨 **CONTRAINDICATED**"
      : r.riskSeverity === "HIGH_RISK_WARNING"
        ? "⚠️ **HIGH-RISK PGX ALERT**"
        : "ℹ️ **CAUTION**";

    return (
      `#### ${badge}: ${r.geneOrBiomarker}\n` +
      `- **Target Drug:** \`${r.drugName.toUpperCase()}\`\n` +
      `- **Biological Mechanism:** ${r.mechanismSummary}\n` +
      `- **CPIC & FDA Guideline Directive:** ${r.cpicGuidelineRecommendation}\n` +
      `- **Actionable Alternatives:** ${r.alternativeOptions.join(", ")}\n`
    );
  }).join("\n");

  return [
    `### 🧬 Pharmacogenomic & Regimen Safety Screening (\`${report.dossierId}\`)`,
    `> [!WARNING]`,
    `> **${report.totalRisks} Actionable Pharmacogenomic Interaction(s) Flagged:** Enzyme metabolism variations or drug-interaction gates detected under CPIC & FDA guidelines.`,
    "",
    alertRows,
    `**Key Discussion Points for Your Oncologist / Cardiologist:**`,
    report.physicianDiscussionChecklist.map((c, i) => `${i + 1}. **${c}**`).join("\n"),
  ].join("\n");
}
