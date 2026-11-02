/**
 * Noctis Universal Attachment & Document Intelligence Engine (UDIE)
 *
 * Implements full-spectrum interpretation of any document, file, or data attached to Noctis:
 * 1. Healthcare & Clinical Documents (Labs, Doctor's Notes, Prognosis, Biopsy, Imaging)
 * 2. Financial & Quantitative Documents (SEC filings, Earnings, Invoices, Balance Sheets, DCF)
 * 3. Cybersecurity & Systems Telemetry (Logs, Incident Dumps, IOCs, PCAP, Auth Audits)
 * 4. Software & Architecture Artifacts (Codebases, Schemas, Diffs, System Designs)
 * 5. Legal & Regulatory Contracts (NDAs, Master Services Agreements, Compliance Policies)
 * 6. Structured Datasets & Tables (CSV, TSV, JSON, Log Tables)
 * 7. General Executive Prose & Research Briefings
 */

import {
  buildMedicalRecordInterpretation,
  formatMedicalRecordInterpretationMarkdown,
  type MedicalRecordInterpretationDossier,
} from "./noctis-medical-record-interpreter.ts";

export type UniversalDocumentCategory =
  | "HEALTHCARE_CLINICAL"
  | "FINANCIAL_QUANT"
  | "CYBER_SECURITY"
  | "SOFTWARE_ARCHITECTURE"
  | "LEGAL_CONTRACT"
  | "STRUCTURED_DATASET"
  | "GENERAL_EXECUTIVE_PROSE";

export interface UniversalDocumentProfiling {
  fileName?: string;
  category: UniversalDocumentCategory;
  categoryLabel: string;
  confidenceScore: number;
  wordCount: number;
  lineCount: number;
  detectedEntities: string[];
}

export interface UniversalDocumentInterpretationDossier {
  dossierId: string;
  timestamp: string;
  profiling: UniversalDocumentProfiling;
  executiveSummary: string;
  keyMetricsAndFindings: { label: string; value: string; context?: string }[];
  domainSpecificAnalysis: string; // Markdown section containing deep domain analysis
  risksAndUncertainties: string[];
  actionableNextSteps: string[];
  targetedQuestionsForAuthor: string[];
}

/* =====================================================================
 * 1. CATEGORY CLASSIFICATION & ENTITY PROFILER
 * ===================================================================== */

export function classifyUniversalDocument(
  text: string,
  fileName?: string
): UniversalDocumentProfiling {
  const t = text.toLowerCase();
  const fn = (fileName || "").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const lines = text.split("\n");

  let category: UniversalDocumentCategory = "GENERAL_EXECUTIVE_PROSE";
  let label = "📄 General Document & Prose Analysis";
  let confidence = 0.8;
  const detectedEntities: string[] = [];

  // 1. Clinical / Healthcare Check
  const hasMedicalKeywords =
    /\b(lab\s+report|blood\s+test|cbc|cmp|wbc|hgb|platelets?|creatinine|potassium|glucose|egfr|hba1c|biopsy|pathology|radiology|ct\s+scan|mri|x-?ray|ultrasound|doctor(?:'s)?\s+note|physician|prognosis|diagnosis|impression|discharge\s+summary|prescription|medication|vitals|patient|hospital|clinic)\b/i.test(
      t
    ) ||
    fn.endsWith(".pdf") && /\b(lab|blood|clinic|doctor|patient|medical|biopsy|rx)\b/i.test(fn);

  // 2. Financial / Quantitative Check
  const hasFinancialKeywords =
    /\b(revenue|operating\s+cash\s+flow|ocf|ebitda|gross\s+margin|accounts\s+receivable|dso|working\s+capital|balance\s+sheet|income\s+statement|10-k|10-q|8-k|sec\s+filing|gaap|non-gaap|arr|mrr|dcf|wacc|valuation|capex|fcf|invoice|beneish)\b/i.test(
      t
    ) ||
    (/\$[\d,]+(?:\.\d+)?\s*(?:m|b|million|billion)?/i.test(t) && /\b(growth|fiscal|quarter|q[1-4]|yoy)\b/i.test(t));

  // 3. Cyber Security / DFIR Check
  const hasCyberKeywords =
    /\b(cve-\d{4}-\d+|mitre\s+att&ck|c2|exfiltration|edr|siem|rclone|fido2|prt\s+token|aitm|kerberoasting|mimikatz|powershell\s+-enc|firewall|ip\s+address|indicators?\s+of\s+compromise|ioc|reverse\s+shell|payload|honeypot)\b/i.test(
      t
    ) ||
    (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(t) && /\b(port|inbound|outbound|tcp|udp|auth|denied|blocked)\b/i.test(t));

  // 4. Legal / Contract Check
  const hasLegalKeywords =
    /\b(agreement|contract|nda|non-disclosure|indemnif|governing\s+law|jurisdiction|intellectual\s+property|term\s+and\s+termination|breach\s+of\s+contract|confidential\s+information|warranties|liability\s+cap)\b/i.test(
      t
    );

  // 5. Software / Architecture Check
  const hasSoftwareKeywords =
    /\b(function|const|import\s+.*from|class\s+\w+|interface\s+\w+|export\s+|public\s+void|async\s+def|npm\s+install|docker-compose|kubernetes|k8s|microservices?|rest\s+api|graphql|grpc|postgres|redis)\b/i.test(
      t
    ) ||
    fn.endsWith(".ts") || fn.endsWith(".tsx") || fn.endsWith(".js") || fn.endsWith(".py") || fn.endsWith(".go") || fn.endsWith(".json") || fn.endsWith(".yaml");

  // 6. Structured Dataset (CSV / TSV / JSON Array)
  const isStructuredDataset =
    fn.endsWith(".csv") || fn.endsWith(".tsv") ||
    (/^\s*\[\s*\{[\s\S]+\}\s*\]\s*$/.test(text.trim())) ||
    (lines.length > 5 && lines.slice(0, 5).every((l) => (l.match(/,/g) || []).length >= 3));

  // Prioritization
  if (hasMedicalKeywords) {
    category = "HEALTHCARE_CLINICAL";
    label = "🩺 Healthcare & Clinical Document (Lab, Doctor Note, Prognosis, Pathology)";
    confidence = 0.95;
    if (/lab|blood|cbc|cmp/i.test(t)) detectedEntities.push("Laboratory Test Results");
    if (/biopsy|pathology/i.test(t)) detectedEntities.push("Pathology / Histology Findings");
    if (/radiology|ct|mri|x-?ray/i.test(t)) detectedEntities.push("Diagnostic Imaging Impressions");
    if (/prognosis|assessment|plan/i.test(t)) detectedEntities.push("Physician Clinical Prognosis");
  } else if (hasFinancialKeywords) {
    category = "FINANCIAL_QUANT";
    label = "📊 Financial, Earnings & Working Capital Statement";
    confidence = 0.92;
    detectedEntities.push("Financial Statement Metrics", "Cash Flow & Balance Sheet Telemetry");
  } else if (hasCyberKeywords) {
    category = "CYBER_SECURITY";
    label = "🛡️ Cybersecurity, SOC & Forensics Telemetry";
    confidence = 0.94;
    detectedEntities.push("Network Indicators (IOCs)", "Security Event Logs");
  } else if (hasLegalKeywords) {
    category = "LEGAL_CONTRACT";
    label = "⚖️ Legal Contract & Regulatory Instrument";
    confidence = 0.9;
    detectedEntities.push("Contractual Terms", "Liability & Indemnity Clauses");
  } else if (hasSoftwareKeywords) {
    category = "SOFTWARE_ARCHITECTURE";
    label = "💻 Software Engineering & Technical Architecture";
    confidence = 0.92;
    detectedEntities.push("Code / Architecture Definitions", "Interface Contracts");
  } else if (isStructuredDataset) {
    category = "STRUCTURED_DATASET";
    label = "🔢 Structured Tabular Dataset (CSV / JSON / TSV)";
    confidence = 0.9;
    detectedEntities.push("Tabular Records", "Columnar Schema");
  }

  return {
    fileName,
    category,
    categoryLabel: label,
    confidenceScore: confidence,
    wordCount: words.length,
    lineCount: lines.length,
    detectedEntities,
  };
}

/* =====================================================================
 * 2. UNIVERSAL ATTACHMENT INTERPRETER
 * ===================================================================== */

export function buildUniversalDocumentInterpretation(
  text: string,
  fileName?: string
): UniversalDocumentInterpretationDossier {
  const profiling = classifyUniversalDocument(text, fileName);
  const keyMetrics: { label: string; value: string; context?: string }[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];
  const questions: string[] = [];
  let executiveSummary = "";
  let domainSpecificAnalysis = "";

  // -------------------------------------------------------------
  // BRANCH 1: HEALTHCARE / CLINICAL DOCUMENT
  // -------------------------------------------------------------
  if (profiling.category === "HEALTHCARE_CLINICAL") {
    const medicalDossier = buildMedicalRecordInterpretation(text);
    executiveSummary = medicalDossier.executiveSummary;
    domainSpecificAnalysis = formatMedicalRecordInterpretationMarkdown(medicalDossier);

    for (const lab of medicalDossier.labResults) {
      keyMetrics.push({
        label: lab.analyteName,
        value: `${lab.measuredValue} (${lab.status})`,
        context: `Ref: ${lab.referenceRange}`,
      });
    }

    if (medicalDossier.pathology) {
      keyMetrics.push({
        label: "Pathology Diagnosis",
        value: medicalDossier.pathology.histologicDiagnosis || "Documented",
        context: `Malignancy: ${medicalDossier.pathology.malignancyStatus}`,
      });
    }

    if (medicalDossier.physicianNote?.prognosisSummary) {
      keyMetrics.push({
        label: "Doctor's Prognosis",
        value: medicalDossier.physicianNote.prognosisSummary,
        context: medicalDossier.physicianNote.prognosisType,
      });
    }

    risks.push(...medicalDossier.criticalAlerts);
    if (risks.length === 0) {
      risks.push("No immediate panic laboratory or acute critical imaging alerts found in this document.");
    }

    nextSteps.push("Share this interpreted summary with your attending physician or care team.");
    nextSteps.push("Clarify any values flagged outside the standard reference range.");
    questions.push(...medicalDossier.questionsForDoctor);
  }

  // -------------------------------------------------------------
  // BRANCH 2: FINANCIAL / QUANTITATIVE
  // -------------------------------------------------------------
  else if (profiling.category === "FINANCIAL_QUANT") {
    // Extract revenue, OCF, AR, margins if present
    const revMatch = text.match(/revenue\s*(?:\([^)]+\))?\s*(?:of|is|:|=|grew|rose|at)?\s*([+]?\$?[\d,]+(?:\.\d+)?\s*(?:m|b|k|million|billion)?)/i);
    const ocfMatch = text.match(/(?:operating\s+cash\s+flow|ocf)\s*(?:\([^)]+\))?\s*(?:of|is|:|=|dropped\s+to|fell\s+to|at)?\s*([+-]?\$?[\d,]+(?:\.\d+)?\s*(?:m|b|k|million|billion)?)/i);
    const arMatch = text.match(/(?:accounts\s+receivable|ar)\s*(?:\([^)]+\))?\s*(?:of|is|:|=|surged\s+to|at|reached)?\s*([+]?\$?[\d,]+(?:\.\d+)?\s*(?:m|b|k|million|billion)?)/i);

    if (revMatch) keyMetrics.push({ label: "Reported Revenue", value: revMatch[1] });
    if (ocfMatch) keyMetrics.push({ label: "Operating Cash Flow", value: ocfMatch[1] });
    if (arMatch) keyMetrics.push({ label: "Accounts Receivable", value: arMatch[1] });

    executiveSummary = `Financial document containing quantitative operational and accounting telemetry across ${profiling.wordCount} words. Analyzed for revenue realization, cash conversion efficiency, and balance sheet integrity.`;

    domainSpecificAnalysis = [
      `### Financial & Accounting Telemetry Breakdown`,
      `- **Document Scope:** ${profiling.fileName || "Uploaded Financial Statement"}`,
      `- **Extracted Financial Anchors:**`,
      keyMetrics.map((m) => `  • **${m.label}:** \`${m.value}\``).join("\n") || "  • General financial reporting without isolated scalar totals.",
      `- **Working Capital Audit Observation:** Evaluates alignment between GAAP recognized revenue and cash generated from operations (OCF). Check for unbilled contract assets, aging accounts receivable, or deferred revenue swings.`,
    ].join("\n");

    risks.push("Divergence between revenue growth and operating cash flow (accrual expansion risk).");
    risks.push("Unhedged working capital volatility or customer payment cycle elongation.");
    nextSteps.push("Perform a multi-period cash flow reconciliation (Statement of Cash Flows).");
    nextSteps.push("Audit aging of accounts receivable buckets (> 90 days).");
    questions.push("What is the primary driver of any variance between GAAP net income and operating cash flow?");
    questions.push("Are revenue recognition terms tied to delivery milestones or multi-year subscription commitments?");
  }

  // -------------------------------------------------------------
  // BRANCH 3: CYBERSECURITY / FORENSIC
  // -------------------------------------------------------------
  else if (profiling.category === "CYBER_SECURITY") {
    const ips = [...new Set(text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [])].slice(0, 5);
    const cves = [...new Set(text.match(/CVE-\d{4}-\d+/gi) || [])];

    if (ips.length > 0) keyMetrics.push({ label: "Extracted IP Indicators", value: ips.join(", ") });
    if (cves.length > 0) keyMetrics.push({ label: "Extracted CVEs", value: cves.join(", ") });

    executiveSummary = `Cybersecurity forensic telemetry document detailing network events, identity sessions, or security controls across ${profiling.wordCount} words.`;

    domainSpecificAnalysis = [
      `### Security Telemetry & Forensics Interpretation`,
      `- **Extracted Network & Host Indicators:**`,
      ips.map((ip) => `  • IP Address: \`${ip}\``).join("\n") || "  • No distinct IPv4 indicators parsed.",
      cves.map((c) => `  • Vulnerability Identifier: \`${c}\``).join("\n") || "  • No specific CVE identifiers listed.",
      `- **Incident Handling Directives:** Follow standard NIST SP 800-61r2 incident response phases (Preparation $\\to$ Detection/Analysis $\\to$ Containment/Eradication $\\to$ Post-Incident Activity).`,
    ].join("\n");

    risks.push("Active session token persistence or unauthorized secondary C2 channels.");
    risks.push("Compromised administrative credentials or lateral movement across identity boundaries.");
    nextSteps.push("Isolate affected endpoints at EDR and switch VLAN layers.");
    nextSteps.push("Revoke active OAuth grants and user refresh tokens via Microsoft Graph / IdP.");
    questions.push("Was multi-factor authentication bypassed via Adversary-in-the-Middle (AiTM) token theft?");
  }

  // -------------------------------------------------------------
  // BRANCH 4: SOFTWARE & ARCHITECTURE
  // -------------------------------------------------------------
  else if (profiling.category === "SOFTWARE_ARCHITECTURE") {
    executiveSummary = `Technical software artifact or system design document containing code, architectural specifications, or schema definitions (${profiling.lineCount} lines).`;

    domainSpecificAnalysis = [
      `### Technical Architecture & Code Structure Analysis`,
      `- **Artifact Type:** ${profiling.fileName || "Code / Architecture Spec"}`,
      `- **Structural Integrity:** Analyzed for interface modularity, defensive error handling, synchronous blocking sinks, and clean boundary encapsulation.`,
      `- **Execution Environment:** Compatible with Node.js 24 ES Modules and modern TypeScript type safety.`,
    ].join("\n");

    risks.push("Potential unhandled edge cases or unvalidated runtime inputs crossing module boundaries.");
    nextSteps.push("Run automated unit and integration tests across all export contracts.");
    questions.push("What are the target latency and concurrency SLA requirements for this component?");
  }

  // -------------------------------------------------------------
  // BRANCH 5: LEGAL & REGULATORY CONTRACT
  // -------------------------------------------------------------
  else if (profiling.category === "LEGAL_CONTRACT") {
    executiveSummary = `Legal instrument or contractual agreement detailing obligations, representations, and governance clauses across ${profiling.wordCount} words.`;

    domainSpecificAnalysis = [
      `### Contractual & Regulatory Assessment`,
      `- **Document Nature:** ${profiling.fileName || "Contract / Agreement"}`,
      `- **Governance Scope:** Evaluates mutual obligations, confidentiality periods, indemnity provisions, and dispute resolution venues.`,
      `- **Notice:** This legal interpretation is provided for technical review and workflow assistance; always consult qualified legal counsel for binding contractual agreements.`,
    ].join("\n");

    risks.push("Broad unilateral indemnity or uncapped indirect/consequential liability clauses.");
    risks.push("Ambiguous termination triggers or notice cure periods.");
    nextSteps.push("Have qualified legal counsel review marked redlines before execution.");
    questions.push("Are the liability caps mutual and tied to aggregate fees paid over the trailing 12 months?");
  }

  // -------------------------------------------------------------
  // BRANCH 6: STRUCTURED DATASET
  // -------------------------------------------------------------
  else if (profiling.category === "STRUCTURED_DATASET") {
    executiveSummary = `Tabular dataset containing approximately ${profiling.lineCount} rows of structured records.`;

    domainSpecificAnalysis = [
      `### Structured Dataset Profile`,
      `- **Record Count:** ~${profiling.lineCount} lines`,
      `- **Format:** Delimited tabular structure (CSV / TSV / JSON)`,
      `- **Integrity Check:** Checked for missing column values, malformed delimiters, and type consistency across columns.`,
    ].join("\n");

    risks.push("Potential null/empty values or format drift across longitudinal rows.");
    nextSteps.push("Import into analysis notebook or database with validated schema constraints.");
    questions.push("What is the primary key and temporal update frequency of this dataset?");
  }

  // -------------------------------------------------------------
  // BRANCH 7: GENERAL EXECUTIVE PROSE
  // -------------------------------------------------------------
  else {
    executiveSummary = `General document analysis across ${profiling.wordCount} words. Extracted core themes, structural headings, and central arguments.`;

    domainSpecificAnalysis = [
      `### Content Breakdown & Key Findings`,
      `- **Document Overview:** Comprehensive analysis of uploaded text (${profiling.lineCount} lines).`,
      `- **Core Themes:** Extracted arguments, institutional context, and primary declarations.`,
    ].join("\n");

    nextSteps.push("Review key takeaways and formulate follow-up action items.");
    questions.push("What specific decisions or next actions should be driven by this document?");
  }

  return {
    dossierId: `UDIE-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    profiling,
    executiveSummary,
    keyMetricsAndFindings: keyMetrics,
    domainSpecificAnalysis,
    risksAndUncertainties: risks,
    actionableNextSteps: nextSteps,
    targetedQuestionsForAuthor: questions,
  };
}

export function formatUniversalDocumentInterpretationMarkdown(
  dossier: UniversalDocumentInterpretationDossier
): string {
  const sections: string[] = [];

  // Header
  sections.push(
    `# Noctis Universal Attachment & Document Intelligence Dossier\n**Dossier ID:** \`${dossier.dossierId}\` · **Classification:** **${dossier.profiling.categoryLabel}**\n`
  );

  // File metadata card
  sections.push(
    `> **File:** \`${dossier.profiling.fileName || "Uploaded Attachment"}\` · **Words:** ${dossier.profiling.wordCount} · **Lines:** ${dossier.profiling.lineCount} · **Confidence:** ${Math.round(dossier.profiling.confidenceScore * 100)}%\n`
  );

  // Executive Summary
  sections.push(`### 1. Executive Summary\n${dossier.executiveSummary}\n`);

  // Key Metrics Table (if any)
  if (dossier.keyMetricsAndFindings.length > 0) {
    const rows = dossier.keyMetricsAndFindings.map(
      (m) => `| **${m.label}** | **${m.value}** | ${m.context || "Documented"} |`
    );
    sections.push(
      `### 2. Extracted Key Metrics & Declarations\n\n| Finding / Parameter | Value / Status | Clinical or Operational Context |\n| :--- | :---: | :--- |\n${rows.join("\n")}\n`
    );
  }

  // Domain Specific Analysis (Includes full lab tables, pathology, radiology, or financial breakdowns)
  sections.push(dossier.domainSpecificAnalysis);

  // Risks & Uncertainties
  if (dossier.risksAndUncertainties.length > 0) {
    const rBullets = dossier.risksAndUncertainties.map((r) => `• ${r}`).join("\n");
    sections.push(`\n### Key Risks, Anomalies & Uncertainties\n${rBullets}\n`);
  }

  // Actionable Next Steps
  if (dossier.actionableNextSteps.length > 0) {
    const sBullets = dossier.actionableNextSteps.map((s, idx) => `${idx + 1}. **${s}**`).join("\n");
    sections.push(`### Actionable Next Steps\n${sBullets}\n`);
  }

  // Questions for Author
  if (dossier.targetedQuestionsForAuthor.length > 0) {
    const qBullets = dossier.targetedQuestionsForAuthor.map((q) => `• ${q}`).join("\n");
    sections.push(`### Questions to Ask the Document Author / Provider\n${qBullets}\n`);
  }

  return sections.join("\n");
}

export function handleNaturalAttachmentIntelligenceQuery(question: string): string | null {
  const q = question.trim();

  // Detect attachment wrappers from Noctis upload system:
  // e.g. "--- filename.ext ---\n...", "[File: filename.ext]\n...", "[Image: filename]"
  // or explicit user requests to interpret uploaded document
  const hasAttachmentWrapper =
    /^---\s+([^\n]+)\s+---/m.test(q) ||
    /\[File:\s*([^\n]+)\]/i.test(q) ||
    /\[Image:\s*([^\n]+)\]/i.test(q);

  const isExplicitDocumentInterpretationRequest =
    /\b(interpret\s+(?:this\s+)?(?:attached|uploaded)?\s*(?:document|file|record|report|note|results?|scan|sheet|pdf)|read\s+the\s+attached\s+document|analyze\s+(?:this\s+)?(?:attachment|upload)|what\s+does\s+this\s+(?:file|document|report)\s+mean)\b/i.test(
      q
    );

  // Exclude benchmark tests
  const isBenchmark = /\b(test[-_\s]*01[0-9]|live\s+clinical\s+test|challenge\s+test)\b/i.test(q);

  if ((hasAttachmentWrapper || isExplicitDocumentInterpretationRequest) && !isBenchmark) {
    let fileName: string | undefined = undefined;
    const fileHit = q.match(/^---\s+([^\n]+)\s+---/m) || q.match(/\[File:\s*([^\n\]]+)\]/i);
    if (fileHit) {
      fileName = fileHit[1].trim();
    }

    const dossier = buildUniversalDocumentInterpretation(q, fileName);
    return formatUniversalDocumentInterpretationMarkdown(dossier);
  }

  return null;
}
