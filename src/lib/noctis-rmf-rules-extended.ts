/**
 * Noctis Extended Deterministic RMF Rule Evaluators & Defense Overlays
 *
 * Expands deterministic evaluation coverage from the 10 starter controls
 * to ALL 20 NIST SP 800-53 Rev. 5 families (28 total control evaluators),
 * plus DoD Cloud Computing SRG Impact Levels (IL2–IL6 / CNSSI 1253 / SCCA)
 * and CMMC Level 2 / DoD Assessment Methodology v1.2.1 SPRS scoring.
 */

import { sha256Sync } from "./universal-crypto.ts";
import type {
  RmfPoamSeverity,
  RmfRuleEvaluationResult,
  RmfVerdict,
} from "./noctis-rmf-rules.ts";

export const EXTENDED_18_CONTROLS = [
  "AC-6",
  "AT-2",
  "CP-9",
  "IA-5",
  "IR-4",
  "MA-4",
  "MP-6",
  "PE-3",
  "PL-2",
  "PM-9",
  "PS-3",
  "PT-2",
  "SA-11",
  "SC-7",
  "SC-13",
  "SC-28",
  "SI-4",
  "SR-3",
] as const;

export const ALL_COVERED_RULE_CONTROLS = [
  "AC-2",
  "AC-3",
  "AU-2",
  "AU-6",
  "CA-7",
  "CM-2",
  "CM-6",
  "IA-2",
  "RA-5",
  "SI-2",
  ...EXTENDED_18_CONTROLS,
] as const;

export interface ExtendedRuleCatalogEntry {
  ruleId: string;
  controlId: string;
  family: string;
  controlTitle: string;
  defaultBaseline: string;
  thresholdSummary: string;
  severityOnFail: RmfPoamSeverity;
}

export const EXTENDED_RULE_CATALOG: ExtendedRuleCatalogEntry[] = [
  { ruleId: "RMF-AC6-PRIV-001", controlId: "AC-6", family: "AC", controlTitle: "Least Privilege", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "No standing global admin; JIT PAM enforced & least-privilege audit <= 90d", severityOnFail: "HIGH" },
  { ruleId: "RMF-AT2-TRAIN-001", controlId: "AT-2", family: "AT", controlTitle: "Literacy Training and Awareness", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: ">= 95% annual security awareness completion within 365 days", severityOnFail: "MODERATE" },
  { ruleId: "RMF-CP9-BACKUP-001", controlId: "CP-9", family: "CP", controlTitle: "System Backup", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Automated backup <= 24h RPO & restore-test verified <= 365 days", severityOnFail: "HIGH" },
  { ruleId: "RMF-IA5-CRED-001", controlId: "IA-5", family: "IA", controlTitle: "Authenticator Management", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Service keys/secrets rotated <= 90 days; zero hardcoded secrets", severityOnFail: "HIGH" },
  { ruleId: "RMF-IR4-INC-001", controlId: "IR-4", family: "IR", controlTitle: "Incident Handling", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "US-CERT/CISA incident escalation <= 1 hour (high/critical) & tabletop <= 365d", severityOnFail: "CRITICAL" },
  { ruleId: "RMF-MA4-MAINT-001", controlId: "MA-4", family: "MA", controlTitle: "Nonlocal Maintenance", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "100% encrypted nonlocal maintenance sessions with MFA & session termination", severityOnFail: "HIGH" },
  { ruleId: "RMF-MP6-SANIT-001", controlId: "MP-6", family: "MP", controlTitle: "Media Sanitization", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "NIST SP 800-88 Rev. 1 cryptographic erasure/destruction & chain-of-custody logs", severityOnFail: "HIGH" },
  { ruleId: "RMF-PE3-PHYS-001", controlId: "PE-3", family: "PE", controlTitle: "Physical Access Control", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Badge access logs retained & visitor escort verified (CSP inherited or facility)", severityOnFail: "MODERATE" },
  { ruleId: "RMF-PL2-SSP-001", controlId: "PL-2", family: "PL", controlTitle: "System Security and Privacy Plans", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "SSP reviewed/updated <= 365 days with zero TBD placeholders", severityOnFail: "HIGH" },
  { ruleId: "RMF-PM9-RMS-001", controlId: "PM-9", family: "PM", controlTitle: "Risk Management Strategy", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Enterprise Risk Management Strategy approved & reviewed <= 365 days", severityOnFail: "MODERATE" },
  { ruleId: "RMF-PS3-SCREEN-001", controlId: "PS-3", family: "PS", controlTitle: "Personnel Screening", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "100% personnel background screening completed prior to privileged access", severityOnFail: "HIGH" },
  { ruleId: "RMF-PT2-PII-001", controlId: "PT-2", family: "PT", controlTitle: "Authority to Process Personally Identifiable Information", defaultBaseline: "NIST SP 800-53 Privacy", thresholdSummary: "Active PTA/PIA determination and documented statutory PII authority", severityOnFail: "HIGH" },
  { ruleId: "RMF-SA11-DEVSEC-001", controlId: "SA-11", family: "SA", controlTitle: "Developer Testing and Evaluation", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "SAST/DAST/SCA gates executed before production deploy with 0 critical bypasses", severityOnFail: "HIGH" },
  { ruleId: "RMF-SC7-BOUND-001", controlId: "SC-7", family: "SC", controlTitle: "Boundary Protection", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Default-deny public ingress/egress enforced via managed gateway/DMZ", severityOnFail: "CRITICAL" },
  { ruleId: "RMF-SC13-FIPS-001", controlId: "SC-13", family: "SC", controlTitle: "Cryptographic Protection", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "100% FIPS 140-2/140-3 CMVP validated cryptographic modules in use", severityOnFail: "CRITICAL" },
  { ruleId: "RMF-SC28-REST-001", controlId: "SC-28", family: "SC", controlTitle: "Protection of Information at Rest", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "100% AES-256 / FIPS-validated encryption at rest for datastores & backups", severityOnFail: "HIGH" },
  { ruleId: "RMF-SI4-MON-001", controlId: "SI-4", family: "SI", controlTitle: "System Monitoring", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: ">= 98% asset telemetry coverage in SIEM/EDR with active anomaly alerting", severityOnFail: "HIGH" },
  { ruleId: "RMF-SR3-SCRM-001", controlId: "SR-3", family: "SR", controlTitle: "Supply Chain Controls and Processes", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Verified SBOM coverage & vetted vendor SCRM assessments <= 365 days", severityOnFail: "HIGH" },
];

interface SimpleRuleSpec {
  ruleId: string;
  controlId: string;
  controlTitle: string;
  baseline: string;
  threshold: string;
  severity: RmfPoamSeverity;
  objectiveId: string;
  poamPrefix: string;
  remediationPlan: string;
  requiredProof: string;
  missingEvidence: string[];
  notApplicableReason?: string | null;
  observedFacts: Record<string, string | number | boolean | null>;
  evaluate: () => { verdict: RmfVerdict; summary: string; variance: string } | null;
}

function slaDaysFor(sev: RmfPoamSeverity): number {
  if (sev === "CRITICAL") return 15;
  if (sev === "HIGH") return 30;
  if (sev === "MODERATE") return 90;
  return 180;
}

function runUniformEvaluator(spec: SimpleRuleSpec): RmfRuleEvaluationResult {
  const ruleVersion = "2.0.0";
  const evaluatedAt = new Date().toISOString();

  if (spec.notApplicableReason) {
    const facts = { ...spec.observedFacts, notApplicableReason: spec.notApplicableReason };
    return {
      ruleId: spec.ruleId,
      ruleVersion,
      controlId: spec.controlId,
      controlTitle: spec.controlTitle,
      baseline: spec.baseline,
      verdict: "NOT_APPLICABLE",
      summary: `${spec.controlId} scoped out: ${spec.notApplicableReason}`,
      observedFacts: facts,
      threshold: spec.threshold,
      variance: "N/A",
      missingEvidence: [],
      evaluatedAt,
      auditHash: sha256Sync(JSON.stringify({ ruleId: spec.ruleId, ruleVersion, verdict: "NOT_APPLICABLE", facts })),
    };
  }

  const outcome = spec.evaluate();
  if (!outcome) {
    return {
      ruleId: spec.ruleId,
      ruleVersion,
      controlId: spec.controlId,
      controlTitle: spec.controlTitle,
      baseline: spec.baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: `INSUFFICIENT_EVIDENCE: Required telemetry or signed verification artifact missing for ${spec.controlId} (${spec.controlTitle}).`,
      observedFacts: spec.observedFacts,
      threshold: spec.threshold,
      variance: "Undetermined (missing evidence)",
      missingEvidence: spec.missingEvidence,
      evaluatedAt,
      auditHash: sha256Sync(JSON.stringify({ ruleId: spec.ruleId, ruleVersion, verdict: "INSUFFICIENT_EVIDENCE", facts: spec.observedFacts })),
    };
  }

  const slaDays = slaDaysFor(spec.severity);
  return {
    ruleId: spec.ruleId,
    ruleVersion,
    controlId: spec.controlId,
    controlTitle: spec.controlTitle,
    baseline: spec.baseline,
    verdict: outcome.verdict,
    summary: outcome.summary,
    observedFacts: spec.observedFacts,
    threshold: spec.threshold,
    variance: outcome.variance,
    missingEvidence: [],
    ...(outcome.verdict === "FAIL"
      ? {
          draftFinding: {
            title: `${spec.controlId} (${spec.controlTitle}) compliance violation`,
            controlId: spec.controlId,
            objectiveId: spec.objectiveId,
            severity: spec.severity,
            rootCause: outcome.summary,
            impactSummary: `${spec.controlId} control requirement violated under ${spec.baseline}.`,
          },
          draftPoam: {
            poamId: `${spec.poamPrefix}-001`,
            controlId: spec.controlId,
            weaknessName: `${spec.controlId} ${spec.controlTitle} non-compliance`,
            severity: spec.severity,
            slaDays,
            remediationPlan: spec.remediationPlan,
            requiredTechnicalProof: spec.requiredProof,
          },
        }
      : {}),
    evaluatedAt,
    auditHash: sha256Sync(JSON.stringify({ ruleId: spec.ruleId, ruleVersion, verdict: outcome.verdict, facts: spec.observedFacts })),
  };
}

// ----------------------------------------------------------------------------
// Individual Evaluators Across All Remaining SP 800-53 Families
// ----------------------------------------------------------------------------
export function evaluateAc6LeastPrivilegeRule(input: {
  baseline?: string;
  standingGlobalAdmins?: number | null;
  jitPamEnforced?: boolean | null;
  notApplicableReason?: string | null;
}): RmfRuleEvaluationResult {
  return runUniformEvaluator({
    ruleId: "RMF-AC6-PRIV-001",
    controlId: "AC-6",
    controlTitle: "Least Privilege",
    baseline: input.baseline || "FedRAMP Rev. 5 High",
    threshold: "standingGlobalAdmins = 0 and jitPamEnforced = true",
    severity: "HIGH",
    objectiveId: "AC-06[01]",
    poamPrefix: "POAM-AC6-PRIV",
    remediationPlan: "Remove standing administrative privileges, migrate to Just-In-Time (JIT) PAM elevation with MFA approval, and re-audit IAM roles.",
    requiredProof: "IAM role export showing 0 standing global admins + JIT PAM session approval log.",
    missingEvidence: ["IAM standing administrator count", "JIT Privileged Access Management policy config"],
    notApplicableReason: input.notApplicableReason,
    observedFacts: { standingGlobalAdmins: input.standingGlobalAdmins ?? null, jitPamEnforced: input.jitPamEnforced ?? null },
    evaluate: () => {
      if (input.standingGlobalAdmins == null && input.jitPamEnforced == null) return null;
      const fail = (input.standingGlobalAdmins ?? 0) > 0 || input.jitPamEnforced === false;
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? `FAIL: Least privilege violated (standingGlobalAdmins=${input.standingGlobalAdmins ?? "unknown"}, jitPamEnforced=${input.jitPamEnforced ?? "unknown"}).`
          : "PASS: Least privilege and JIT PAM elevation enforced with zero standing global admins.",
        variance: fail ? `${input.standingGlobalAdmins ?? 1} excess privileged violation(s)` : "0 violations",
      };
    },
  });
}

export function evaluateAt2TrainingRule(input: {
  baseline?: string;
  completionPercent?: number | null;
  notApplicableReason?: string | null;
}): RmfRuleEvaluationResult {
  const target = 95;
  return runUniformEvaluator({
    ruleId: "RMF-AT2-TRAIN-001",
    controlId: "AT-2",
    controlTitle: "Literacy Training and Awareness",
    baseline: input.baseline || "FedRAMP Rev. 5 High",
    threshold: `>= ${target}% annual workforce completion`,
    severity: "MODERATE",
    objectiveId: "AT-02[01]",
    poamPrefix: "POAM-AT2-TRAIN",
    remediationPlan: "Enforce overdue training notifications and suspend system access for users non-compliant past 30 days.",
    requiredProof: "LMS completion roster CSV with >= 95% signed attestations.",
    missingEvidence: ["Annual security awareness LMS completion rate"],
    notApplicableReason: input.notApplicableReason,
    observedFacts: { completionPercent: input.completionPercent ?? null },
    evaluate: () => {
      if (input.completionPercent == null) return null;
      const diff = Number((input.completionPercent - target).toFixed(2));
      const fail = input.completionPercent < target;
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? `FAIL: Security awareness completion is ${input.completionPercent}%, below ${target}% threshold.`
          : `PASS: Security awareness completion is ${input.completionPercent}% (>= ${target}%).`,
        variance: `${diff >= 0 ? "+" : ""}${diff}% vs ${target}%`,
      };
    },
  });
}

export function evaluateCp9BackupRule(input: {
  baseline?: string;
  backupFrequencyHours?: number | null;
  lastRestoreTestDays?: number | null;
  notApplicableReason?: string | null;
}): RmfRuleEvaluationResult {
  return runUniformEvaluator({
    ruleId: "RMF-CP9-BACKUP-001",
    controlId: "CP-9",
    controlTitle: "System Backup",
    baseline: input.baseline || "FedRAMP Rev. 5 High",
    threshold: "Backup <= 24h RPO and restore test <= 365 days",
    severity: "HIGH",
    objectiveId: "CP-09[01]",
    poamPrefix: "POAM-CP9-BACKUP",
    remediationPlan: "Configure daily immutable encrypted backups and execute documented restoration test into isolated staging.",
    requiredProof: "Backup job ledger (<= 24h) + signed restore-verification test log (<= 365d).",
    missingEvidence: ["Backup schedule cadence", "Restore test evidence timestamp"],
    notApplicableReason: input.notApplicableReason,
    observedFacts: {
      backupFrequencyHours: input.backupFrequencyHours ?? null,
      lastRestoreTestDays: input.lastRestoreTestDays ?? null,
    },
    evaluate: () => {
      if (input.backupFrequencyHours == null && input.lastRestoreTestDays == null) return null;
      const failFreq = input.backupFrequencyHours != null && input.backupFrequencyHours > 24;
      const failRestore = input.lastRestoreTestDays != null && input.lastRestoreTestDays > 365;
      const fail = failFreq || failRestore;
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? `FAIL: Contingency backup gap detected (RPO=${input.backupFrequencyHours ?? "?"}h, lastRestoreTest=${input.lastRestoreTestDays ?? "?"}d).`
          : `PASS: Backups meet <= 24h RPO (${input.backupFrequencyHours ?? "verified"}h) and annual restore test.`,
        variance: failRestore
          ? `+${(input.lastRestoreTestDays ?? 0) - 365}d overdue restore test`
          : failFreq
          ? `+${(input.backupFrequencyHours ?? 0) - 24}h over RPO`
          : "Within backup SLA",
      };
    },
  });
}

export function evaluateIa5AuthenticatorRule(input: {
  baseline?: string;
  maxSecretAgeDays?: number | null;
  hardcodedSecretsFound?: boolean | null;
}): RmfRuleEvaluationResult {
  return runUniformEvaluator({
    ruleId: "RMF-IA5-CRED-001",
    controlId: "IA-5",
    controlTitle: "Authenticator Management",
    baseline: input.baseline || "FedRAMP Rev. 5 High",
    threshold: "Service secrets <= 90 days old; 0 hardcoded secrets",
    severity: "HIGH",
    objectiveId: "IA-05[01]",
    poamPrefix: "POAM-IA5-CRED",
    remediationPlan: "Rotate aged secrets immediately via KMS/Vault automated rotation and purge hardcoded credentials.",
    requiredProof: "Secrets-manager rotation report + secret-scan zero-finding receipt.",
    missingEvidence: ["Secret age inventory", "Repository secret scanner output"],
    observedFacts: { maxSecretAgeDays: input.maxSecretAgeDays ?? null, hardcodedSecretsFound: input.hardcodedSecretsFound ?? null },
    evaluate: () => {
      if (input.maxSecretAgeDays == null && input.hardcodedSecretsFound == null) return null;
      const fail = (input.maxSecretAgeDays ?? 0) > 90 || input.hardcodedSecretsFound === true;
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? `FAIL: Authenticator hygiene failure (maxAge=${input.maxSecretAgeDays ?? "?"}d, hardcoded=${input.hardcodedSecretsFound ?? false}).`
          : `PASS: Secrets rotated within 90 days and zero hardcoded secrets detected.`,
        variance: input.maxSecretAgeDays != null ? `${input.maxSecretAgeDays - 90 > 0 ? "+" : ""}${input.maxSecretAgeDays - 90}d vs 90d` : fail ? "Hardcoded secret present" : "Compliant",
      };
    },
  });
}

export function evaluateIr4IncidentRule(input: {
  baseline?: string;
  reportingHours?: number | null;
  tabletopAgeDays?: number | null;
}): RmfRuleEvaluationResult {
  return runUniformEvaluator({
    ruleId: "RMF-IR4-INC-001",
    controlId: "IR-4",
    controlTitle: "Incident Handling",
    baseline: input.baseline || "FedRAMP Rev. 5 High",
    threshold: "CISA/US-CERT report <= 1h for major incidents; IR test <= 365d",
    severity: "CRITICAL",
    objectiveId: "IR-04[01]",
    poamPrefix: "POAM-IR4-INC",
    remediationPlan: "Automate US-CERT/CISA incident escalation runbook (<= 1h) and complete annual IR tabletop.",
    requiredProof: "Signed IR escalation ticket timestamps and annual tabletop AAR.",
    missingEvidence: ["Incident reporting time-to-notify", "Annual IR test record"],
    observedFacts: { reportingHours: input.reportingHours ?? null, tabletopAgeDays: input.tabletopAgeDays ?? null },
    evaluate: () => {
      if (input.reportingHours == null && input.tabletopAgeDays == null) return null;
      const fail = (input.reportingHours ?? 0) > 1 || (input.tabletopAgeDays ?? 0) > 365;
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? `FAIL: Incident response SLA exceeded (report=${input.reportingHours ?? "?"}h vs 1h, tabletop=${input.tabletopAgeDays ?? "?"}d vs 365d).`
          : "PASS: Incident notification and annual IR testing satisfy FedRAMP High SLAs.",
        variance: input.reportingHours != null && input.reportingHours > 1 ? `+${input.reportingHours - 1}h over 1h SLA` : fail ? "Tabletop > 365d" : "Within SLA",
      };
    },
  });
}

export function evaluateSc7BoundaryRule(input: {
  baseline?: string;
  defaultDenyEgress?: boolean | null;
  unrestrictedPublicPorts?: number | null;
}): RmfRuleEvaluationResult {
  return runUniformEvaluator({
    ruleId: "RMF-SC7-BOUND-001",
    controlId: "SC-7",
    controlTitle: "Boundary Protection",
    baseline: input.baseline || "FedRAMP Rev. 5 High",
    threshold: "defaultDenyEgress = true and unrestrictedPublicPorts = 0",
    severity: "CRITICAL",
    objectiveId: "SC-07[01]",
    poamPrefix: "POAM-SC7-BOUND",
    remediationPlan: "Close unrestricted 0.0.0.0/0 administrative ingress/egress rules and route through hardened DMZ/WAF.",
    requiredProof: "IaC security group / firewall ruleset diff + Nmap external boundary scan.",
    missingEvidence: ["Firewall/SG default-deny rule state", "Open public management port count"],
    observedFacts: { defaultDenyEgress: input.defaultDenyEgress ?? null, unrestrictedPublicPorts: input.unrestrictedPublicPorts ?? null },
    evaluate: () => {
      if (input.defaultDenyEgress == null && input.unrestrictedPublicPorts == null) return null;
      const fail = input.defaultDenyEgress === false || (input.unrestrictedPublicPorts ?? 0) > 0;
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? `FAIL: Boundary protection gap (defaultDenyEgress=${input.defaultDenyEgress ?? "?"}, openPublicPorts=${input.unrestrictedPublicPorts ?? "?"}).`
          : "PASS: Default-deny boundary protection enforced with zero unrestricted public ports.",
        variance: fail ? `${input.unrestrictedPublicPorts ?? 1} boundary exposure(s)` : "0 exposures",
      };
    },
  });
}

export function evaluateSc13CryptoRule(input: {
  baseline?: string;
  fips140Validated?: boolean | null;
  nonFipsModulesCount?: number | null;
}): RmfRuleEvaluationResult {
  return runUniformEvaluator({
    ruleId: "RMF-SC13-FIPS-001",
    controlId: "SC-13",
    controlTitle: "Cryptographic Protection",
    baseline: input.baseline || "FedRAMP Rev. 5 High",
    threshold: "fips140Validated = true and nonFipsModulesCount = 0",
    severity: "CRITICAL",
    objectiveId: "SC-13[01]",
    poamPrefix: "POAM-SC13-FIPS",
    remediationPlan: "Enable FIPS 140-2/140-3 CMVP-validated cryptographic modules across OS, TLS termination, and KMS.",
    requiredProof: "OpenSSL/BoringCrypto FIPS self-test output & NIST CMVP certificate numbers.",
    missingEvidence: ["FIPS 140-2/3 CMVP module state"],
    observedFacts: { fips140Validated: input.fips140Validated ?? null, nonFipsModulesCount: input.nonFipsModulesCount ?? null },
    evaluate: () => {
      if (input.fips140Validated == null && input.nonFipsModulesCount == null) return null;
      const fail = input.fips140Validated === false || (input.nonFipsModulesCount ?? 0) > 0;
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? "FAIL: Non-FIPS-validated cryptography detected; violates FedRAMP High SC-13 mandate."
          : "PASS: All cryptographic operations use FIPS 140-2/140-3 CMVP-validated modules.",
        variance: fail ? `${input.nonFipsModulesCount ?? 1} unvalidated crypto module(s)` : "100% FIPS validated",
      };
    },
  });
}

export function evaluateSi4MonitoringRule(input: {
  baseline?: string;
  telemetryCoveragePercent?: number | null;
}): RmfRuleEvaluationResult {
  const target = 98;
  return runUniformEvaluator({
    ruleId: "RMF-SI4-MON-001",
    controlId: "SI-4",
    controlTitle: "System Monitoring",
    baseline: input.baseline || "FedRAMP Rev. 5 High",
    threshold: `>= ${target}% asset coverage in SIEM/EDR`,
    severity: "HIGH",
    objectiveId: "SI-04[01]",
    poamPrefix: "POAM-SI4-MON",
    remediationPlan: "Enroll unmonitored compute nodes/containers into EDR and SIEM continuous log collection.",
    requiredProof: "SIEM/EDR enrollment dashboard vs asset inventory reconciliation (>= 98%).",
    missingEvidence: ["SIEM/EDR endpoint telemetry coverage %"],
    observedFacts: { telemetryCoveragePercent: input.telemetryCoveragePercent ?? null },
    evaluate: () => {
      if (input.telemetryCoveragePercent == null) return null;
      const diff = Number((input.telemetryCoveragePercent - target).toFixed(2));
      const fail = input.telemetryCoveragePercent < target;
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? `FAIL: SIEM/EDR monitoring coverage is ${input.telemetryCoveragePercent}%, below ${target}% requirement.`
          : `PASS: SIEM/EDR continuous monitoring covers ${input.telemetryCoveragePercent}% of assets.`,
        variance: `${diff >= 0 ? "+" : ""}${diff}% vs ${target}%`,
      };
    },
  });
}

function makeBooleanOrAgeEvaluator(
  catalogId: (typeof EXTENDED_18_CONTROLS)[number],
  compliant: boolean | null | undefined,
  ageDays?: number | null,
  maxAgeDays = 365,
  baseline = "FedRAMP Rev. 5 High",
): RmfRuleEvaluationResult {
  const meta = EXTENDED_RULE_CATALOG.find((c) => c.controlId === catalogId)!;
  return runUniformEvaluator({
    ruleId: meta.ruleId,
    controlId: meta.controlId,
    controlTitle: meta.controlTitle,
    baseline,
    threshold: meta.thresholdSummary,
    severity: meta.severityOnFail,
    objectiveId: `${meta.controlId.replace("-", "-0")}[01]`,
    poamPrefix: `POAM-${meta.controlId.replace("-", "")}`,
    remediationPlan: `Remediate ${meta.controlId} (${meta.controlTitle}) to satisfy: ${meta.thresholdSummary}.`,
    requiredProof: `Signed technical configuration & audit log artifact verifying ${meta.controlId}.`,
    missingEvidence: [`Verified compliance evidence for ${meta.controlId}`],
    observedFacts: { compliant: compliant ?? null, ageDays: ageDays ?? null, maxAgeDays },
    evaluate: () => {
      if (compliant == null && ageDays == null) return null;
      const fail = compliant === false || (ageDays != null && ageDays > maxAgeDays);
      return {
        verdict: fail ? "FAIL" : "PASS",
        summary: fail
          ? `FAIL: ${meta.controlId} (${meta.controlTitle}) failed verification (${ageDays != null ? `age ${ageDays}d vs ${maxAgeDays}d` : "non-compliant control state"}).`
          : `PASS: ${meta.controlId} (${meta.controlTitle}) satisfies threshold (${meta.thresholdSummary}).`,
        variance: ageDays != null ? `${ageDays - maxAgeDays > 0 ? "+" : ""}${ageDays - maxAgeDays}d vs ${maxAgeDays}d` : fail ? "Non-compliant" : "Compliant",
      };
    },
  });
}

export const evaluateMa4Rule = (compliant: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("MA-4", compliant, null, 365, baseline);
export const evaluateMp6Rule = (compliant: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("MP-6", compliant, null, 365, baseline);
export const evaluatePe3Rule = (compliant: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("PE-3", compliant, null, 365, baseline);
export const evaluatePl2Rule = (ageDays: number | null, compliant?: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("PL-2", compliant, ageDays, 365, baseline);
export const evaluatePm9Rule = (ageDays: number | null, compliant?: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("PM-9", compliant, ageDays, 365, baseline);
export const evaluatePs3Rule = (compliant: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("PS-3", compliant, null, 365, baseline);
export const evaluatePt2Rule = (compliant: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("PT-2", compliant, null, 365, baseline || "NIST SP 800-53 Privacy");
export const evaluateSa11Rule = (compliant: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("SA-11", compliant, null, 365, baseline);
export const evaluateSc28Rule = (compliant: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("SC-28", compliant, null, 365, baseline);
export const evaluateSr3Rule = (ageDays: number | null, compliant?: boolean | null, baseline?: string) =>
  makeBooleanOrAgeEvaluator("SR-3", compliant, ageDays, 365, baseline);

// ----------------------------------------------------------------------------
// DoD Cloud Computing SRG (IL2–IL6 / CNSSI 1253 / SCCA) Overlay Evaluator
// ----------------------------------------------------------------------------
export interface DodImpactLevelInput {
  impactLevel: "IL2" | "IL4" | "IL5" | "IL6";
  hostingEnvironment?: "Commercial" | "GovCloud_Dedicated" | "SIPRNet_Classified" | string;
  sccaCompliant?: boolean;
  usCitizenAdminsOnly?: boolean;
  cnssi1253Overlay?: boolean;
  fips140Level?: number;
}

export interface DodImpactLevelResult {
  impactLevel: "IL2" | "IL4" | "IL5" | "IL6";
  verdict: RmfVerdict;
  requirements: string[];
  violations: string[];
  requiredOverlays: string[];
  auditHash: string;
}

export function evaluateDodImpactLevelOverlay(input: DodImpactLevelInput): DodImpactLevelResult {
  const il = input.impactLevel;
  const violations: string[] = [];
  const requiredOverlays: string[] = ["DoD Cloud Computing SRG"];
  const requirements: string[] = [];

  if (il === "IL2") {
    requirements.push("Public / Non-CUI data; FedRAMP Moderate equivalent.");
  } else if (il === "IL4") {
    requiredOverlays.push("CUI / SP 800-171 / FedRAMP Moderate+ & DoD IL4 Parameters");
    requirements.push("Dedicated US/CONUS hosting for CUI; SCCA boundary recommended for NIPRNet interconnection; US Persons administration.");
    if (input.usCitizenAdminsOnly === false) violations.push("IL4 requires US Persons / appropriately vetted administrators.");
    if (input.hostingEnvironment === "Commercial") violations.push("IL4 workloads require DoD-authorized US-sovereign cloud regions, not standard multi-tenant commercial.");
  } else if (il === "IL5") {
    requiredOverlays.push("CNSSI 1253", "SCCA (BCAP/VDSS/VDMS/TCCM)", "FedRAMP High + DoD IL5 Parameters");
    requirements.push("Dedicated single-tenant hardware isolation in US GovCloud/Defense Cloud, SCCA boundary, US Citizens only, FIPS 140-2/3 Level 3 HSM.");
    if (input.hostingEnvironment === "Commercial") violations.push("IL5 prohibits standard commercial multi-tenant hosting; requires dedicated hardware isolation.");
    if (input.sccaCompliant === false) violations.push("IL5 SIPR/NIPR-connected workloads require Secure Cloud Computing Architecture (SCCA: BCAP, VDSS, VDMS, TCCM).");
    if (input.usCitizenAdminsOnly === false) violations.push("IL5 strictly requires US Citizens only for CSP & mission administration.");
    if (input.cnssi1253Overlay === false) violations.push("IL5 / NSS workloads require CNSSI 1253 security control overlay.");
  } else if (il === "IL6") {
    requiredOverlays.push("CNSSI 1253 Classified Overlay", "DoDI 8510.01", "SIPRNet SECRET Enclave");
    requirements.push("Air-gapped / SIPRNet-connected SECRET enclave; hardware crypto (NSA Type-1 / Suite B); US Citizens with active SECRET clearance.");
    if (input.hostingEnvironment !== "SIPRNet_Classified") violations.push("IL6 requires certified SECRET/SIPRNet air-gapped cloud enclave.");
    if (input.usCitizenAdminsOnly === false) violations.push("IL6 strictly requires cleared US Citizens.");
    if ((input.fips140Level ?? 3) < 2) violations.push("IL6 requires NSA-approved Type-1 / FIPS validated cryptography.");
  }

  const verdict: RmfVerdict = violations.length > 0 ? "FAIL" : "PASS";
  return {
    impactLevel: il,
    verdict,
    requirements,
    violations,
    requiredOverlays,
    auditHash: sha256Sync(JSON.stringify({ input, verdict, violations })),
  };
}

// ----------------------------------------------------------------------------
// CMMC Level 2 / DoD Assessment Methodology v1.2.1 SPRS Score Calculator
// ----------------------------------------------------------------------------
export interface CmmcFailedControlInput {
  controlId: string;
  weight: 1 | 3 | 5;
  onPoam?: boolean;
}

export interface CmmcSprsResult {
  totalRequirements: number;
  maxScore: 110;
  minScore: -203;
  sprsScore: number;
  metCount: number;
  failedCount: number;
  percentImplemented: number;
  conditionalCertificationEligible: boolean;
  ineligibilityReasons: string[];
  poamAllowedCount: number;
  poamCloseoutDeadlineDays: 180;
  auditHash: string;
}

export function evaluateCmmcSprsScore(input: {
  failedControls: CmmcFailedControlInput[];
}): CmmcSprsResult {
  const failed = Array.isArray(input.failedControls) ? input.failedControls : [];
  const penalty = failed.reduce((sum, item) => sum + (item.weight === 5 ? 5 : item.weight === 3 ? 3 : 1), 0);
  const rawScore = Math.max(-203, 110 - penalty);
  const failedCount = Math.min(110, failed.length);
  const metCount = Math.max(0, 110 - failedCount);
  const percentImplemented = Number(((metCount / 110) * 100).toFixed(1));

  const reasons: string[] = [];
  if (metCount < 88) {
    reasons.push(`32 CFR § 170.21 requires >= 80% (>= 88/110) requirements MET for Conditional CMMC Level 2 status (currently ${metCount}/110, ${percentImplemented}%).`);
  }
  const fivePtFailures = failed.filter((f) => f.weight === 5);
  if (fivePtFailures.length > 0) {
    reasons.push(
      `Zero 5-point weighted SP 800-171 controls are eligible for a POA&M (${fivePtFailures.map((f) => f.controlId).join(", ")}).`,
    );
  }
  if (rawScore < 88 && reasons.length === 0) {
    reasons.push(`SPRS score ${rawScore} leaves multi-point controls open that must close before final CMMC Level 2 certification.`);
  }

  const conditionalCertificationEligible = metCount >= 88 && fivePtFailures.length === 0;
  return {
    totalRequirements: 110,
    maxScore: 110,
    minScore: -203,
    sprsScore: rawScore,
    metCount,
    failedCount,
    percentImplemented,
    conditionalCertificationEligible,
    ineligibilityReasons: reasons,
    poamAllowedCount: failed.filter((f) => f.onPoam && f.weight !== 5).length,
    poamCloseoutDeadlineDays: 180,
    auditHash: sha256Sync(JSON.stringify({ sprsScore: rawScore, metCount, failed })),
  };
}

// ----------------------------------------------------------------------------
// Extended Natural-Language Extraction Across All 20 Families
// ----------------------------------------------------------------------------
export function extractAndEvaluateExtendedRmfRulesFromText(question: string): RmfRuleEvaluationResult[] {
  const q = (question || "").trim();
  if (!q) return [];
  const results: RmfRuleEvaluationResult[] = [];
  const baseline = /\bfedramp\s+moderate\b/i.test(q)
    ? "FedRAMP Rev. 5 Moderate"
    : /\bfedramp\s+low\b/i.test(q)
    ? "FedRAMP Rev. 5 Low"
    : "FedRAMP Rev. 5 High";
  const hasEvalIntent = /\b(evaluat\w*|assess\w*|check|verif\w*|compliant|compliance|verdict|audit|pass|fail|gap|poa&m|poam)\b/i.test(q);

  if (/\bAC-6\b/i.test(q) && (hasEvalIntent || /\b(standing|global\s+admin|jit|pam)\b/i.test(q))) {
    const adminMatch = q.match(/(\d+)\s+standing\s+(?:global\s+)?admin/i);
    const noJit = /\bno\s+jit\b|\bwithout\s+jit\b/i.test(q);
    results.push(
      evaluateAc6LeastPrivilegeRule({
        baseline,
        standingGlobalAdmins: adminMatch ? Number(adminMatch[1]) : noJit ? 1 : null,
        jitPamEnforced: noJit ? false : /\bjit\b/i.test(q) ? true : null,
      }),
    );
  }

  if (/\bAT-2\b/i.test(q) && (hasEvalIntent || /\b(\d+%|\btraining\b)\b/i.test(q))) {
    const pct = q.match(/(\d+(?:\.\d+)?)\s*%/);
    results.push(evaluateAt2TrainingRule({ baseline, completionPercent: pct ? Number(pct[1]) : null }));
  }

  if (/\bCP-9\b/i.test(q) && (hasEvalIntent || /\b(backup|restore|rpo)\b/i.test(q))) {
    const rpo = q.match(/(?:backup(?:s)?|rpo)[^\d]{0,16}(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?/i);
    const restore = q.match(/restore[^\d]{0,20}(\d+(?:\.\d+)?)\s*days?/i);
    results.push(
      evaluateCp9BackupRule({
        baseline,
        backupFrequencyHours: rpo ? Number(rpo[1]) : null,
        lastRestoreTestDays: restore ? Number(restore[1]) : null,
      }),
    );
  }

  if (/\bIA-5\b/i.test(q) && (hasEvalIntent || /\b(secret|key|rotat|hardcoded)\b/i.test(q))) {
    const age = q.match(/(\d+)\s*days?/i);
    const hardcoded = /\bhardcoded\b/i.test(q) ? true : null;
    results.push(
      evaluateIa5AuthenticatorRule({
        baseline,
        maxSecretAgeDays: age ? Number(age[1]) : null,
        hardcodedSecretsFound: hardcoded,
      }),
    );
  }

  if (/\bIR-4\b/i.test(q) && (hasEvalIntent || /\b(incident|cisa|us-cert|tabletop)\b/i.test(q))) {
    const hrs = q.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)/i);
    const days = q.match(/tabletop[^\d]{0,16}(\d+)\s*days?/i);
    results.push(
      evaluateIr4IncidentRule({
        baseline,
        reportingHours: hrs ? Number(hrs[1]) : null,
        tabletopAgeDays: days ? Number(days[1]) : null,
      }),
    );
  }

  if (/\bSC-7\b/i.test(q) && (hasEvalIntent || /\b(0\.0\.0\.0\/0|public\s+port|egress|dmz)\b/i.test(q))) {
    const openZero = /\b0\.0\.0\.0\/0\b|\bunrestricted\b/i.test(q);
    results.push(
      evaluateSc7BoundaryRule({
        baseline,
        defaultDenyEgress: openZero ? false : null,
        unrestrictedPublicPorts: openZero ? 1 : null,
      }),
    );
  }

  if (/\bSC-13\b/i.test(q) && (hasEvalIntent || /\b(non-fips|fips\s*140)\b/i.test(q))) {
    const nonFips = /\bnon-fips\b|\bnot\s+fips\b/i.test(q);
    results.push(
      evaluateSc13CryptoRule({
        baseline,
        fips140Validated: nonFips ? false : /\bfips\s*140(?:-[23])?\s+validated\b/i.test(q) ? true : null,
        nonFipsModulesCount: nonFips ? 1 : null,
      }),
    );
  }

  if (/\bSI-4\b/i.test(q) && (hasEvalIntent || /\b(siem|edr|coverage|\d+%)\b/i.test(q))) {
    const pct = q.match(/(\d+(?:\.\d+)?)\s*%/);
    results.push(evaluateSi4MonitoringRule({ baseline, telemetryCoveragePercent: pct ? Number(pct[1]) : null }));
  }

  const remainingIds = ["MA-4", "MP-6", "PE-3", "PL-2", "PM-9", "PS-3", "PT-2", "SA-11", "SC-28", "SR-3"] as const;
  for (const cid of remainingIds) {
    if (new RegExp(`\\b${cid}\\b`, "i").test(q) && hasEvalIntent) {
      const ageMatch = q.match(/(\d+)\s*days?/i);
      const failFlag = /\b(fail|missing\s+log|unencrypted|expired|overdue|unscreened|no\s+sbom|bypass)\b/i.test(q);
      const passFlag = /\b(verified|encrypted|compliant|completed|approved)\b/i.test(q);
      results.push(
        makeBooleanOrAgeEvaluator(
          cid,
          failFlag ? false : passFlag ? true : null,
          ageMatch ? Number(ageMatch[1]) : null,
          365,
          baseline,
        ),
      );
    }
  }

  return results;
}
