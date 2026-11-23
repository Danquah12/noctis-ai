/**
 * Capability #1 — Noctis Policy-as-Code Engine
 *
 * Converts verified DoD, IC, NIST SP 800-53/171, Zero Trust, and Clinical Safety
 * requirements into executable, versioned, SHA-256-sealed compliance rules.
 */

import { sha256Sync } from "../universal-crypto.ts";
import type {
  PolicyAsCodePack,
  PolicyAsCodeRule,
  PolicyPackEvalResult,
  PolicyRuleEvalOutcome,
} from "./types.ts";

const RAW_POLICY_PACKS: Omit<PolicyAsCodePack, "bundleSha256">[] = [
  {
    packId: "DOD-IL5-CORE",
    name: "DoD RMF & CC SRG Impact Level 5 Core Guardrails",
    version: "2026.11-v1",
    authoritySource: "DoDI 8510.01 (2022-07-19) / DoD CC SRG v1R4 / CNSSI 1253 / DoDI 8531.01",
    domain: "dod-ic",
    rules: [
      {
        ruleId: "PAC-IL5-001",
        controlId: "IA-2(1) / DoDI 8520.03",
        title: "Phishing-Resistant Hardware MFA & Separate ALT Token for Privileged Access",
        authorityCitation: "DoDI 8520.03 / NIST SP 800-53 Rev. 5 IA-2(1)",
        field: "phishing_resistant_mfa",
        operator: "REQUIRED_TRUE",
        expectedValue: true,
        severity: "CRITICAL",
        remediation: "Enforce DoD PKI CAC / ALT token or FIDO2 hardware authenticator across all paths.",
      },
      {
        ruleId: "PAC-IL5-002",
        controlId: "SC-13 / FIPS 140",
        title: "FIPS 140 Validated Cryptography Active in Kernel Mode",
        authorityCitation: "CNSSP 15 / RHEL 9 STIG V-257777 / SC-13",
        field: "fips_140_enabled",
        operator: "REQUIRED_TRUE",
        expectedValue: true,
        severity: "CRITICAL",
        remediation: "Enable FIPS 140 kernel/crypto modules across compute and storage tiers.",
      },
      {
        ruleId: "PAC-IL5-003",
        controlId: "CA-6 / DoDI 8510.01",
        title: "No Active CAT I / Unmitigated CISA KEV Overdue Vulnerabilities",
        authorityCitation: "DoDI 8531.01 / CISA BOD 22-01 / DoDI 8510.01",
        field: "open_cat1_or_overdue_kev",
        operator: "THRESHOLD_LE",
        expectedValue: 0,
        severity: "CRITICAL",
        remediation: "Patch overdue CISA KEV / CAT I vulnerabilities and verify via credentialed ACAS rescan.",
      },
      {
        ruleId: "PAC-IL5-004",
        controlId: "SC-7 / SCCA",
        title: "SCCA BCAP/VDSS & Default-Deny Microsegmentation Active",
        authorityCitation: "DoD CC SRG IL5 / DoD Zero Trust Network Pillar",
        field: "scca_isolation_enforced",
        operator: "REQUIRED_TRUE",
        expectedValue: true,
        severity: "HIGH",
        remediation: "Route enclave workloads exclusively through accredited SCCA BCAP/VDSS boundaries.",
      },
      {
        ruleId: "PAC-IL5-005",
        controlId: "CA-6(AO)",
        title: "Authorizing Official Exclusively Retains ATO Decision Authority",
        authorityCitation: "DoDI 8510.01 Section 3 / RMF Step 5",
        field: "ai_issued_ato_claimed",
        operator: "NOT_EQUALS",
        expectedValue: true,
        severity: "CRITICAL",
        remediation: "Block automated ATO issuance; route package solely to designated human AO.",
      },
    ],
  },
  {
    packId: "IC-ICD503-CORE",
    name: "Intelligence Community ICD 503 & Reciprocity Policy Pack",
    version: "2024.10-v2",
    authoritySource: "ODNI ICD 503 (2024-10-25) / ICD 501 / ICD 502 / ICD 705",
    domain: "dod-ic",
    rules: [
      {
        ruleId: "PAC-IC-001",
        controlId: "ICD-503-RECIP",
        title: "DoD ATO Does Not Automatically Satisfy IC ICD 503 Authorization",
        authorityCitation: "ODNI ICD 503 (2024-10-25) Reciprocity & Agency Overlay Governance",
        field: "assumed_dod_ato_auto_reciprocity",
        operator: "NOT_EQUALS",
        expectedValue: true,
        severity: "CRITICAL",
        remediation: "Require explicit IC AO reciprocity acceptance and applicable IC agency overlays.",
      },
      {
        ruleId: "PAC-IC-002",
        controlId: "CNSSP-15 / CNSA-2.0",
        title: "CSfC Dual Independent Encryption Layers & CNSA 2.0 Roadmap Compliant",
        authorityCitation: "CNSSP 15 / NSA CNSA 2.0 / CSfC Campus/MA",
        field: "csfc_independent_layers",
        operator: "THRESHOLD_GE",
        expectedValue: 2,
        severity: "CRITICAL",
        remediation: "Implement 2 independent CSfC encryption layers from distinct vendors.",
      },
      {
        ruleId: "PAC-IC-003",
        controlId: "ICD-705 / TEMPEST",
        title: "No Commercial Cloud LLM Processing of SECRET or TS/SCI Payloads",
        authorityCitation: "Gate 0 Classification Boundary / DoDI 8540.01",
        field: "commercial_llm_receives_classified",
        operator: "NOT_EQUALS",
        expectedValue: true,
        severity: "CRITICAL",
        remediation: "Halt egress immediately; deploy only inside accredited air-gapped SCIF / C2S boundary.",
      },
    ],
  },
  {
    packId: "FEDRAMP-HIGH-CORE",
    name: "FedRAMP Rev. 5 High Baseline Continuous Monitoring Rules",
    version: "fedramp2.1.0-oscal1.0.4",
    authoritySource: "FedRAMP Rev. 5 High Baseline OSCAL (2024-09-24)",
    domain: "rmf",
    rules: [
      {
        ruleId: "PAC-FRH-001",
        controlId: "AC-2(3)",
        title: "Terminated User Account Disablement <= 24 Hours",
        authorityCitation: "FedRAMP High AC-2(3) ODP ac-02.03_odp.01",
        field: "termination_disablement_hours",
        operator: "THRESHOLD_LE",
        expectedValue: 24,
        severity: "HIGH",
        remediation: "Automate HRIS-to-IdP SCIM revocation within 24 hours of separation.",
      },
      {
        ruleId: "PAC-FRH-002",
        controlId: "IA-2(6)",
        title: "Reject SMS OTP / Static Passwords as Privileged MFA",
        authorityCitation: "FedRAMP High IA-2(1)/IA-2(6) / SP 800-63B AAL3",
        field: "credential_type",
        operator: "FORBIDDEN_VALUES",
        expectedValue: ["SMS_OTP", "VOICE_OTP", "EMAIL_OTP", "PASSWORD_ONLY"],
        severity: "CRITICAL",
        remediation: "Mandate FIPS-validated FIDO2/WebAuthn or PIV hardware authenticators.",
      },
      {
        ruleId: "PAC-FRH-003",
        controlId: "RA-5(d)",
        title: "Monthly Credentialed Vulnerability Scan Age <= 30 Days",
        authorityCitation: "FedRAMP High RA-5 ODP ra-05_odp.03",
        field: "scan_age_days",
        operator: "THRESHOLD_LE",
        expectedValue: 30,
        severity: "HIGH",
        remediation: "Execute authenticated vulnerability scans every <= 30 days across all inventory.",
      },
    ],
  },
  {
    packId: "ZERO-TRUST-FY27",
    name: "DoD Zero Trust Strategy (FY 2027 Target) Minimum Gates",
    version: "2.0.0",
    authoritySource: "DoD ZT Strategy / CISA ZTMM v2.0",
    domain: "zero-trust",
    rules: [
      {
        ruleId: "PAC-ZT-001",
        controlId: "ZT-PILLAR-ALL",
        title: "Target Readiness Score >= 85% Across All 7 Pillars",
        authorityCitation: "DoD CIO Zero Trust Target Activities (FY 2027)",
        field: "zt_readiness_percent",
        operator: "THRESHOLD_GE",
        expectedValue: 85,
        severity: "HIGH",
        remediation: "Advance lagging pillars (Device/Network/Automation) to Stage 3 (Target) minimum.",
      },
      {
        ruleId: "PAC-ZT-002",
        controlId: "ZT-IDENTITY-OCSP",
        title: "Certificate Revocation (OCSP/CRL) Must Fail Closed",
        authorityCitation: "DoDI 8520.02 / ASD STIG V-222577",
        field: "ocsp_fail_closed",
        operator: "REQUIRED_TRUE",
        expectedValue: true,
        severity: "CRITICAL",
        remediation: "Disable OCSP soft-fail and reject sessions when responder status is unreachable.",
      },
    ],
  },
  {
    packId: "CLINICAL-SAFETY-CORE",
    name: "Noctis Clinical CDS & Data-Integrity Mandatory Safety Rules",
    version: "2026.11-v4",
    authoritySource: "KDIGO AKI / Sepsis-3 / FDA 21 U.S.C. 360j(o)(1)(E)",
    domain: "clinical",
    rules: [
      {
        ruleId: "PAC-CLIN-001",
        controlId: "CDS-ISOLATION",
        title: "Zero Cross-Patient Encounter Contamination Permitted",
        authorityCitation: "Noctis NH-AI-001 / HIPAA Patient Boundary Invariant",
        field: "encounter_contamination_detected",
        operator: "NOT_EQUALS",
        expectedValue: true,
        severity: "CRITICAL",
        remediation: "Halt unified diagnosis and request explicit clinician patient disambiguation.",
      },
      {
        ruleId: "PAC-CLIN-002",
        controlId: "CDS-CREATININE-PROVENANCE",
        title: "Preserve Current vs Historical Baseline Creatinine Without Swap",
        authorityCitation: "CRIT-046 / CRIT-047 / KDIGO 7-Day Window Standard",
        field: "creatinine_temporal_swap",
        operator: "NOT_EQUALS",
        expectedValue: true,
        severity: "CRITICAL",
        remediation: "Extract distinct typed current vs historical_baseline observations with source spans.",
      },
    ],
  },
];

const POLICY_PACKS: PolicyAsCodePack[] = RAW_POLICY_PACKS.map((p) => ({
  ...p,
  bundleSha256: sha256Sync(JSON.stringify(p)),
}));

export function listPolicyAsCodePacks(): PolicyAsCodePack[] {
  return POLICY_PACKS;
}

export function compilePolicyRulePack(spec: {
  packId: string;
  name: string;
  version?: string;
  authoritySource: string;
  domain?: PolicyAsCodePack["domain"];
  rules: PolicyAsCodeRule[];
}): PolicyAsCodePack {
  const clean: Omit<PolicyAsCodePack, "bundleSha256"> = {
    packId: (spec.packId || "CUSTOM-PAC").trim().toUpperCase(),
    name: (spec.name || "Custom Policy-as-Code Bundle").trim(),
    version: (spec.version || "1.0.0").trim(),
    authoritySource: (spec.authoritySource || "Organization-Defined Authority").trim(),
    domain: spec.domain || "enterprise",
    rules: Array.isArray(spec.rules) ? spec.rules : [],
  };
  return {
    ...clean,
    bundleSha256: sha256Sync(JSON.stringify(clean)),
  };
}

function evaluateSingleRule(rule: PolicyAsCodeRule, facts: Record<string, unknown>): PolicyRuleEvalOutcome {
  const hasField = Object.prototype.hasOwnProperty.call(facts, rule.field) && facts[rule.field] !== undefined;
  const observed = hasField ? facts[rule.field] : undefined;

  if (!hasField) {
    return {
      ruleId: rule.ruleId,
      controlId: rule.controlId,
      title: rule.title,
      authorityCitation: rule.authorityCitation,
      verdict: "INSUFFICIENT_EVIDENCE",
      observedValue: null,
      expectedValue: rule.expectedValue,
      severity: rule.severity,
      rationale: `Missing required evidence field "${rule.field}" — cannot auto-mark compliant.`,
      remediation: rule.remediation,
    };
  }

  let passed = false;
  switch (rule.operator) {
    case "REQUIRED_TRUE":
      passed = observed === true;
      break;
    case "EQUALS":
      passed = observed === rule.expectedValue;
      break;
    case "NOT_EQUALS":
      passed = observed !== rule.expectedValue;
      break;
    case "THRESHOLD_LE":
      passed = typeof observed === "number" && typeof rule.expectedValue === "number" && observed <= rule.expectedValue;
      break;
    case "THRESHOLD_GE":
      passed = typeof observed === "number" && typeof rule.expectedValue === "number" && observed >= rule.expectedValue;
      break;
    case "IN_SET":
      passed = Array.isArray(rule.expectedValue) && rule.expectedValue.includes(observed);
      break;
    case "FORBIDDEN_VALUES":
      passed =
        Array.isArray(rule.expectedValue) &&
        !rule.expectedValue.map((v) => String(v).toUpperCase()).includes(String(observed).toUpperCase());
      break;
    case "NOT_CONTAINS":
      passed = !String(observed ?? "").toLowerCase().includes(String(rule.expectedValue ?? "").toLowerCase());
      break;
  }

  return {
    ruleId: rule.ruleId,
    controlId: rule.controlId,
    title: rule.title,
    authorityCitation: rule.authorityCitation,
    verdict: passed ? "PASS" : "FAIL",
    observedValue: observed,
    expectedValue: rule.expectedValue,
    severity: rule.severity,
    rationale: passed
      ? `Observed "${rule.field}" = ${JSON.stringify(observed)} satisfies ${rule.operator} ${JSON.stringify(rule.expectedValue)}.`
      : `VIOLATION: "${rule.field}" = ${JSON.stringify(observed)} violates ${rule.operator} ${JSON.stringify(rule.expectedValue)}.`,
    remediation: rule.remediation,
  };
}

export function evaluatePolicyPack(
  packIdOrPack: string | PolicyAsCodePack,
  facts: Record<string, unknown>,
): PolicyPackEvalResult {
  const pack =
    typeof packIdOrPack === "string"
      ? POLICY_PACKS.find((p) => p.packId.toUpperCase() === packIdOrPack.trim().toUpperCase()) || POLICY_PACKS[0]!
      : packIdOrPack;

  const outcomes = pack.rules.map((r) => evaluateSingleRule(r, facts || {}));
  const passedCount = outcomes.filter((o) => o.verdict === "PASS").length;
  const failedCount = outcomes.filter((o) => o.verdict === "FAIL").length;
  const insufficientCount = outcomes.filter((o) => o.verdict === "INSUFFICIENT_EVIDENCE").length;
  const compliancePercent = outcomes.length > 0 ? Math.round((passedCount / outcomes.length) * 100) : 0;
  const overallVerdict: PolicyPackEvalResult["overallVerdict"] =
    failedCount > 0 ? "FAIL" : insufficientCount > 0 ? "PARTIAL" : "PASS";

  return {
    packId: pack.packId,
    packName: pack.name,
    version: pack.version,
    authoritySource: pack.authoritySource,
    overallVerdict,
    passedCount,
    failedCount,
    insufficientCount,
    compliancePercent,
    rules: outcomes,
    evalSha256: sha256Sync(JSON.stringify({ packId: pack.packId, facts, outcomes })),
    aiCanIssueAto: false,
  };
}
