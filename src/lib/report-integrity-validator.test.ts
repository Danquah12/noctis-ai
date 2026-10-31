import test from "node:test";
import assert from "node:assert/strict";
import {
  validateReportIntegrity,
  type AuditReport,
  type CanonicalFinding,
  type CanonicalEvidence,
} from "./report-integrity-validator";

const mockEvidence: CanonicalEvidence[] = [
  {
    id: "EV-001",
    type: "poc_reproduction",
    source: "XTRIKE Dynamic Engine",
    verified: true,
    reproducible: true,
    authorized: true,
    location: { file: "src/server/auth.ts", lineStart: 45, lineEnd: 52 },
  },
  {
    id: "EV-002",
    type: "static_ast_trace",
    source: "XTRIKE SAST Rule 214",
    verified: true,
    location: { file: "src/api/payment.ts", lineStart: 120 },
  },
  {
    id: "EV-003",
    type: "misidentification_proof",
    source: "Dependency Tree Review",
    verified: true,
  },
];

const mockValidReport: AuditReport = {
  reportId: "NOCTIS-AUDIT-2026-001",
  title: "Cloud Infrastructure & Application Security Audit",
  timestamp: "2026-10-31T04:30:00Z",
  executiveSummary: "Completed security audit of 24 microservices with verified proof states.",
  claimedTotals: {
    critical: 1,
    high: 1,
    medium: 0,
    low: 0,
    informational: 1,
    total: 3,
  },
  findings: [
    {
      id: "VULN-001",
      title: "Broken Object Level Authorization (BOLA) in User Profile API",
      severity: "critical",
      cvss: 9.3,
      cveId: "CVE-2026-38192",
      cwe: "CWE-285",
      language: "typescript",
      proofState: "confirmed",
      evidenceIds: ["EV-001"],
      remediation: {
        language: "typescript",
        summary: "Enforce ownership assertion middleware before handling tenant ID lookup.",
        codeSnippet: "if (req.user.tenantId !== targetTenantId) throw new ForbiddenException();",
        remediationClass: "auth_rbac",
      },
    },
    {
      id: "VULN-002",
      title: "Unparameterized Raw SQL in Reporting Module",
      severity: "high",
      cvss: 8.1,
      cwe: "CWE-89",
      language: "typescript",
      proofState: "suspected",
      evidenceIds: ["EV-002"],
      remediation: {
        language: "typescript",
        summary: "Use parameterized query binds instead of template literals.",
        codeSnippet: "await db.query('SELECT * FROM audit_logs WHERE user_id = $1', [userId]);",
        remediationClass: "parameterization",
      },
    },
    {
      id: "VULN-003",
      title: "Disproved False Positive on Legacy JWT Parser",
      severity: "informational",
      language: "typescript",
      proofState: "false_positive",
      evidenceIds: ["EV-003"],
    },
  ],
  evidence: mockEvidence,
};

test("Report Integrity Validator - passes 5/5 gates on verified canonical report", () => {
  const result = validateReportIntegrity(mockValidReport);
  assert.equal(result.valid, true);
  assert.equal(result.verdict, "PASSED");
  assert.equal(result.passedGates, 5);
  assert.equal(result.violations.length, 0);
  assert.equal(result.recalculatedTotals.critical, 1);
  assert.equal(result.recalculatedTotals.high, 1);
  assert.equal(result.recalculatedTotals.informational, 1);
  assert.equal(result.recalculatedTotals.total, 3);
  assert.ok(result.sha256AuditSeal.length === 64);
});

test("Report Integrity Validator - Gate 1: detects claimed vs recalculated risk totals divergence", () => {
  const tampered: AuditReport = {
    ...mockValidReport,
    claimedTotals: {
      critical: 0, // Claiming 0 criticals when finding #1 is critical
      high: 1,
      medium: 0,
      low: 0,
      informational: 1,
      total: 2,
    },
  };
  const result = validateReportIntegrity(tampered);
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.gate === "RISK_TOTALS" && v.message.includes("Risk totals divergence")));
});

test("Report Integrity Validator - Gate 2: flags confirmed status without verified PoC", () => {
  const unverified: AuditReport = {
    ...mockValidReport,
    findings: [
      {
        ...mockValidReport.findings[0],
        proofState: "confirmed",
        evidenceIds: ["EV-002"], // EV-002 is static trace, not reproducible PoC
      },
      ...mockValidReport.findings.slice(1),
    ],
  };
  const result = validateReportIntegrity(unverified);
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.gate === "PROOF_STATE" && v.message.includes("marked 'confirmed' without verified reproducible PoC")));
});

test("Report Integrity Validator - Gate 3: flags language mismatch in remediation plan", () => {
  const mismatchedLang: AuditReport = {
    ...mockValidReport,
    findings: [
      {
        ...mockValidReport.findings[0],
        language: "rust",
        remediation: {
          language: "python", // Source is Rust, remediation is Python
          summary: "Check memory bounds",
          remediationClass: "memory_safety",
        },
      },
      ...mockValidReport.findings.slice(1),
    ],
  };
  const result = validateReportIntegrity(mismatchedLang);
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.gate === "REMEDIATION_LANGUAGE" && v.message.includes("language mismatch")));
});

test("Report Integrity Validator - Gate 4: flags dangling or non-existent evidence IDs", () => {
  const danglingEv: AuditReport = {
    ...mockValidReport,
    findings: [
      {
        ...mockValidReport.findings[0],
        evidenceIds: ["EV-NON-EXISTENT-999"],
      },
      ...mockValidReport.findings.slice(1),
    ],
  };
  const result = validateReportIntegrity(danglingEv);
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.gate === "EVIDENCE_REFERENCE" && v.message.includes("dangling evidence ID")));
});

test("Report Integrity Validator - Gate 5: rejects premature closure without re-test evidence", () => {
  const prematureClose: AuditReport = {
    ...mockValidReport,
    findings: [
      {
        ...mockValidReport.findings[0],
        closureAllowed: true,
        retested: false, // Not retested
      },
      ...mockValidReport.findings.slice(1),
    ],
  };
  const result = validateReportIntegrity(prematureClose);
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.gate === "CLOSURE_GATE" && v.message.includes("without independent re-test")));
});
