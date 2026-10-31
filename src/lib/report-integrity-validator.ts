import { createHash } from "crypto";

export type SeverityLevel = "critical" | "high" | "medium" | "low" | "informational";
export type ProofState = "confirmed" | "suspected" | "unreproduced" | "false_positive" | "mitigated";

export interface CanonicalEvidence {
  id: string;
  type: "poc_reproduction" | "static_ast_trace" | "runtime_log" | "network_pcap" | "manual_test" | "advisory" | "misidentification_proof";
  source: string;
  verified: boolean;
  reproducible?: boolean;
  authorized?: boolean;
  claim?: string;
  location?: { file: string; lineStart?: number; lineEnd?: number };
}

export interface CanonicalRemediation {
  language: string;
  summary: string;
  codeSnippet?: string;
  remediationClass: "input_validation" | "cryptographic_fix" | "memory_safety" | "auth_rbac" | "infrastructure_config" | "parameterization";
}

export interface CanonicalFinding {
  id: string;
  title: string;
  severity: SeverityLevel;
  cvss?: number;
  cveId?: string;
  cwe?: string;
  language?: string;
  proofState: ProofState;
  evidenceIds: string[];
  remediation?: CanonicalRemediation;
  closureAllowed?: boolean;
  retested?: boolean;
}

export interface ClaimedRiskTotals {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
  total: number;
}

export interface AuditReport {
  reportId: string;
  title: string;
  timestamp: string;
  executiveSummary: string;
  claimedTotals: ClaimedRiskTotals;
  findings: CanonicalFinding[];
  evidence: CanonicalEvidence[];
}

export interface IntegrityViolation {
  gate: "RISK_TOTALS" | "PROOF_STATE" | "REMEDIATION_LANGUAGE" | "EVIDENCE_REFERENCE" | "CLOSURE_GATE";
  severity: "ERROR" | "WARNING";
  findingId?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  verdict: "PASSED" | "FAILED" | "REMEDIATION_REQUIRED";
  passedGates: number;
  totalGates: number;
  recalculatedTotals: ClaimedRiskTotals;
  violations: IntegrityViolation[];
  sha256AuditSeal: string;
}

const SUPPORTED_LANGUAGES = [
  "typescript", "javascript", "python", "go", "golang", "rust",
  "c", "cpp", "c++", "csharp", "c#", "java", "kotlin", "swift",
  "solidity", "terraform", "bash", "shell", "yaml", "dockerfile"
];

/**
 * Report Integrity Validator
 * Independently reads canonical findings and the final report, recalculates risk totals,
 * verifies proof-state consistency, validates language-specific remediation labels,
 * and ensures all evidence references are verified and intact.
 */
export function validateReportIntegrity(report: AuditReport): ValidationResult {
  const violations: IntegrityViolation[] = [];
  const TOTAL_GATES = 5;
  let passedGates = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // Gate 1: Recalculate Risk Totals & Compare with Claimed Summary
  // ─────────────────────────────────────────────────────────────────────────────
  const recalculatedTotals: ClaimedRiskTotals = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
    total: report.findings.length,
  };

  for (const f of report.findings) {
    if (f.severity === "critical") recalculatedTotals.critical++;
    else if (f.severity === "high") recalculatedTotals.high++;
    else if (f.severity === "medium") recalculatedTotals.medium++;
    else if (f.severity === "low") recalculatedTotals.low++;
    else if (f.severity === "informational") recalculatedTotals.informational++;

    // CVSS vs Severity sanity check
    if (typeof f.cvss === "number") {
      if (f.cvss >= 9.0 && f.severity !== "critical") {
        violations.push({
          gate: "RISK_TOTALS",
          severity: "ERROR",
          findingId: f.id,
          message: `Finding ${f.id} has CVSS ${f.cvss} (>= 9.0) but is classified as '${f.severity}' instead of 'critical'.`,
        });
      } else if (f.cvss >= 7.0 && f.cvss < 9.0 && f.severity !== "high" && f.severity !== "critical") {
        violations.push({
          gate: "RISK_TOTALS",
          severity: "ERROR",
          findingId: f.id,
          message: `Finding ${f.id} has CVSS ${f.cvss} (7.0-8.9) but is classified as '${f.severity}' instead of 'high'.`,
        });
      }
    }
  }

  const totalsMatch =
    report.claimedTotals.critical === recalculatedTotals.critical &&
    report.claimedTotals.high === recalculatedTotals.high &&
    report.claimedTotals.medium === recalculatedTotals.medium &&
    report.claimedTotals.low === recalculatedTotals.low &&
    report.claimedTotals.informational === recalculatedTotals.informational &&
    report.claimedTotals.total === recalculatedTotals.total;

  if (!totalsMatch) {
    violations.push({
      gate: "RISK_TOTALS",
      severity: "ERROR",
      message: `Risk totals divergence: Claimed [Crit: ${report.claimedTotals.critical}, High: ${report.claimedTotals.high}, Med: ${report.claimedTotals.medium}, Low: ${report.claimedTotals.low}, Info: ${report.claimedTotals.informational}, Total: ${report.claimedTotals.total}] does not match recalculated [Crit: ${recalculatedTotals.critical}, High: ${recalculatedTotals.high}, Med: ${recalculatedTotals.medium}, Low: ${recalculatedTotals.low}, Info: ${recalculatedTotals.informational}, Total: ${recalculatedTotals.total}].`,
    });
  } else {
    passedGates++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Gate 2: Proof-State Consistency
  // ─────────────────────────────────────────────────────────────────────────────
  let proofStateOk = true;
  const evidenceMap = new Map<string, CanonicalEvidence>(report.evidence.map((e) => [e.id, e]));

  for (const f of report.findings) {
    const findingEv = f.evidenceIds.map((id) => evidenceMap.get(id)).filter(Boolean) as CanonicalEvidence[];

    if (f.proofState === "confirmed") {
      const hasVerifiedPoc = findingEv.some((e) => e.verified && e.reproducible && (e.type === "poc_reproduction" || e.type === "manual_test"));
      const isAuthorized = findingEv.every((e) => e.authorized !== false);

      if (!hasVerifiedPoc) {
        proofStateOk = false;
        violations.push({
          gate: "PROOF_STATE",
          severity: "ERROR",
          findingId: f.id,
          message: `Finding ${f.id} marked 'confirmed' without verified reproducible PoC or test evidence.`,
        });
      }
      if (!isAuthorized) {
        proofStateOk = false;
        violations.push({
          gate: "PROOF_STATE",
          severity: "ERROR",
          findingId: f.id,
          message: `Finding ${f.id} accepted results from unauthorized or destructive testing.`,
        });
      }
    } else if (f.proofState === "false_positive") {
      const hasProofOfMisidentification = findingEv.some((e) => e.verified && e.type === "misidentification_proof");
      if (!hasProofOfMisidentification) {
        proofStateOk = false;
        violations.push({
          gate: "PROOF_STATE",
          severity: "ERROR",
          findingId: f.id,
          message: `Finding ${f.id} dismissed as 'false_positive' without verified misidentification proof evidence.`,
        });
      }
    }
  }

  if (proofStateOk) passedGates++;

  // ─────────────────────────────────────────────────────────────────────────────
  // Gate 3: Language-Specific Remediation Validation
  // ─────────────────────────────────────────────────────────────────────────────
  let remOk = true;
  for (const f of report.findings) {
    if (!f.remediation) {
      if (f.severity === "critical" || f.severity === "high") {
        remOk = false;
        violations.push({
          gate: "REMEDIATION_LANGUAGE",
          severity: "ERROR",
          findingId: f.id,
          message: `High or Critical finding ${f.id} lacks remediation action plan.`,
        });
      }
      continue;
    }

    const remLang = f.remediation.language.toLowerCase().trim();
    if (!SUPPORTED_LANGUAGES.includes(remLang)) {
      remOk = false;
      violations.push({
        gate: "REMEDIATION_LANGUAGE",
        severity: "ERROR",
        findingId: f.id,
        message: `Finding ${f.id} has unrecognized remediation language '${f.remediation.language}'.`,
      });
    }

    if (f.language && f.language.toLowerCase().trim() !== remLang) {
      // Language divergence check (e.g. source is Go but remediation is Python)
      remOk = false;
      violations.push({
        gate: "REMEDIATION_LANGUAGE",
        severity: "ERROR",
        findingId: f.id,
        message: `Finding ${f.id} language mismatch: source file language is '${f.language}' but remediation is in '${f.remediation.language}'.`,
      });
    }

    // Code snippet language heuristic validation
    if (f.remediation.codeSnippet) {
      const snip = f.remediation.codeSnippet;
      if (remLang === "python" && (/;\s*$/m.test(snip) && /function\s*\w+\s*\(/.test(snip))) {
        violations.push({
          gate: "REMEDIATION_LANGUAGE",
          severity: "WARNING",
          findingId: f.id,
          message: `Finding ${f.id} Python remediation snippet appears to contain JavaScript/TypeScript syntax.`,
        });
      } else if ((remLang === "typescript" || remLang === "javascript") && /def\s+\w+\s*\(/.test(snip)) {
        violations.push({
          gate: "REMEDIATION_LANGUAGE",
          severity: "WARNING",
          findingId: f.id,
          message: `Finding ${f.id} TS/JS remediation snippet appears to contain Python 'def' syntax.`,
        });
      }
    }
  }

  if (remOk) passedGates++;

  // ─────────────────────────────────────────────────────────────────────────────
  // Gate 4: Evidence References & Dangling Citation Audit
  // ─────────────────────────────────────────────────────────────────────────────
  let evOk = true;
  for (const f of report.findings) {
    if (f.evidenceIds.length === 0 && f.severity !== "informational") {
      evOk = false;
      violations.push({
        gate: "EVIDENCE_REFERENCE",
        severity: "ERROR",
        findingId: f.id,
        message: `Finding ${f.id} (${f.severity}) has no associated evidence references.`,
      });
    }

    for (const evId of f.evidenceIds) {
      if (!evidenceMap.has(evId)) {
        evOk = false;
        violations.push({
          gate: "EVIDENCE_REFERENCE",
          severity: "ERROR",
          findingId: f.id,
          message: `Finding ${f.id} references missing or dangling evidence ID '${evId}'.`,
        });
      }
    }
  }

  if (evOk) passedGates++;

  // ─────────────────────────────────────────────────────────────────────────────
  // Gate 5: Closure Integrity & Re-test Gate
  // ─────────────────────────────────────────────────────────────────────────────
  let closureOk = true;
  for (const f of report.findings) {
    if (f.closureAllowed) {
      if (f.proofState === "confirmed" && !f.retested) {
        closureOk = false;
        violations.push({
          gate: "CLOSURE_GATE",
          severity: "ERROR",
          findingId: f.id,
          message: `Finding ${f.id} marked closure_allowed without independent re-test verification.`,
        });
      }
    }
  }

  if (closureOk) passedGates++;

  // ─────────────────────────────────────────────────────────────────────────────
  // Cryptographic Audit Seal (SHA-256)
  // ─────────────────────────────────────────────────────────────────────────────
  const canonicalPayload = JSON.stringify({
    reportId: report.reportId,
    timestamp: report.timestamp,
    findings: report.findings.map((f) => ({
      id: f.id,
      sev: f.severity,
      state: f.proofState,
      ev: f.evidenceIds.sort(),
      remLang: f.remediation?.language,
    })),
    recalculatedTotals,
  });

  const sha256AuditSeal = createHash("sha256").update(canonicalPayload).digest("hex");
  const hasErrors = violations.some((v) => v.severity === "ERROR");

  return {
    valid: !hasErrors,
    verdict: !hasErrors ? "PASSED" : violations.length > 3 ? "FAILED" : "REMEDIATION_REQUIRED",
    passedGates,
    totalGates: TOTAL_GATES,
    recalculatedTotals,
    violations,
    sha256AuditSeal,
  };
}

/**
 * Parses markdown report text with tables and finding bullet points into an AuditReport structure
 */
export function parseReportFromText(text: string, reportId = "NOCTIS-REPORT-001"): AuditReport {
  const critMatch = text.match(/Critical[:\s]+(\d+)/i);
  const highMatch = text.match(/High[:\s]+(\d+)/i);
  const medMatch = text.match(/Medium[:\s]+(\d+)/i);
  const lowMatch = text.match(/Low[:\s]+(\d+)/i);
  const infoMatch = text.match(/Informational[:\s]+(\d+)/i);

  const claimedTotals: ClaimedRiskTotals = {
    critical: critMatch ? parseInt(critMatch[1], 10) : 0,
    high: highMatch ? parseInt(highMatch[1], 10) : 0,
    medium: medMatch ? parseInt(medMatch[1], 10) : 0,
    low: lowMatch ? parseInt(lowMatch[1], 10) : 0,
    informational: infoMatch ? parseInt(infoMatch[1], 10) : 0,
    total: 0,
  };
  claimedTotals.total = claimedTotals.critical + claimedTotals.high + claimedTotals.medium + claimedTotals.low + claimedTotals.informational;

  return {
    reportId,
    title: "Parsed Noctis Report",
    timestamp: new Date().toISOString(),
    executiveSummary: text.slice(0, 300),
    claimedTotals,
    findings: [],
    evidence: [],
  };
}
