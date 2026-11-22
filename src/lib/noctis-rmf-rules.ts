/**
 * Noctis Deterministic RMF Rules & Evidence Evaluation Engine (Option B)
 *
 * Evaluates explicit compliance conditions across the 10 core Federal RMF /
 * FedRAMP starter controls: AC-2, AC-3, AU-2, AU-6, CA-7, CM-2, CM-6, IA-2,
 * RA-5, and SI-2.
 *
 * Returns a strict 5-state compliance verdict rather than LLM guesswork:
 *   PASS | FAIL | INSUFFICIENT_EVIDENCE | NOT_APPLICABLE | MANUAL_REVIEW_REQUIRED
 */

import { sha256Sync } from "./universal-crypto.ts";

export type RmfVerdict =
  | "PASS"
  | "FAIL"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_APPLICABLE"
  | "MANUAL_REVIEW_REQUIRED";

export type RmfPoamSeverity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export interface RmfRuleDraftFinding {
  title: string;
  controlId: string;
  objectiveId: string;
  severity: RmfPoamSeverity;
  rootCause: string;
  impactSummary: string;
}

export interface RmfRuleDraftPoam {
  poamId: string;
  controlId: string;
  weaknessName: string;
  severity: RmfPoamSeverity;
  slaDays: number;
  remediationPlan: string;
  requiredTechnicalProof: string;
}

export interface RmfRuleEvaluationResult {
  ruleId: string;
  ruleVersion: string;
  controlId: string;
  controlTitle: string;
  baseline: string;
  verdict: RmfVerdict;
  summary: string;
  observedFacts: Record<string, string | number | boolean | null>;
  threshold: string;
  variance: string;
  missingEvidence: string[];
  draftFinding?: RmfRuleDraftFinding;
  draftPoam?: RmfRuleDraftPoam;
  manualReviewReason?: string;
  evaluatedAt: string;
  auditHash: string;
}

export const STARTER_10_CONTROLS = [
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
] as const;

function buildAuditHash(
  ruleId: string,
  ruleVersion: string,
  verdict: RmfVerdict,
  observedFacts: Record<string, string | number | boolean | null>,
): string {
  return sha256Sync(JSON.stringify({ ruleId, ruleVersion, verdict, observedFacts }));
}

function defaultSlaForSeverity(sev: RmfPoamSeverity): number {
  if (sev === "CRITICAL") return 15;
  if (sev === "HIGH") return 30;
  if (sev === "MODERATE") return 90;
  return 180;
}

// ----------------------------------------------------------------------------
// 1. RMF-AC2-TERM-001 & AC-2(3): Account Termination & Inactivity Disablement
// ----------------------------------------------------------------------------
export interface Ac2TerminationInput {
  baseline?: string;
  policyThresholdHours?: number | null;
  elapsedHours?: number | null;
  terminationTimestampLabel?: string | null;
  disablementTimestampLabel?: string | null;
  inactiveAccountDays?: number | null;
  inactivityLimitDays?: number | null;
  notApplicableReason?: string | null;
}

export function evaluateAc2AccountManagementRule(input: Ac2TerminationInput): RmfRuleEvaluationResult {
  const ruleId = "RMF-AC2-TERM-001";
  const ruleVersion = "1.2.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const thresholdHours = input.policyThresholdHours ?? 24;
  const evaluatedAt = new Date().toISOString();

  if (input.notApplicableReason) {
    const observedFacts = { notApplicableReason: input.notApplicableReason };
    return {
      ruleId,
      ruleVersion,
      controlId: "AC-2",
      controlTitle: "Account Management",
      baseline,
      verdict: "NOT_APPLICABLE",
      summary: `Control check scoped out: ${input.notApplicableReason}`,
      observedFacts,
      threshold: `Disable separated accounts within ${thresholdHours} hours`,
      variance: "N/A",
      missingEvidence: [],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "NOT_APPLICABLE", observedFacts),
    };
  }

  // Sub-check for AC-2(3) inactive account threshold if elapsedHours not supplied
  if (input.elapsedHours == null && input.inactiveAccountDays != null) {
    const limitDays = input.inactivityLimitDays ?? (/high/i.test(baseline) ? 35 : 90);
    const diffDays = Number((input.inactiveAccountDays - limitDays).toFixed(2));
    const failed = input.inactiveAccountDays > limitDays;
    const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
    const observedFacts = {
      inactiveAccountDays: input.inactiveAccountDays,
      inactivityLimitDays: limitDays,
    };
    return {
      ruleId: "RMF-AC2-INACTIVE-002",
      ruleVersion,
      controlId: "AC-2(3)",
      controlTitle: "Account Management | Disable Accounts",
      baseline,
      verdict,
      summary: failed
        ? `FAIL: Inactive account remained enabled for ${input.inactiveAccountDays} days, exceeding the ${limitDays}-day FedRAMP threshold by ${diffDays} days.`
        : `PASS: Inactive accounts disabled within ${input.inactiveAccountDays} days (within ${limitDays}-day limit).`,
      observedFacts,
      threshold: `Disable inactive accounts within <= ${limitDays} days (${baseline})`,
      variance: failed ? `+${diffDays} days over limit` : `${Math.abs(diffDays)} days within limit`,
      missingEvidence: [],
      ...(failed
        ? {
            draftFinding: {
              title: "Failure to automatically disable inactive user accounts within threshold",
              controlId: "AC-2(3)",
              objectiveId: "AC-02(03)[01]",
              severity: "MODERATE",
              rootCause: "Automated IdP/directory lifecycle sweep missing or misconfigured.",
              impactSummary: `Stale accounts persisted for ${input.inactiveAccountDays} days (${diffDays} days past ${limitDays}-day limit).`,
            },
            draftPoam: {
              poamId: "POAM-AC2(3)-001",
              controlId: "AC-2(3)",
              weaknessName: "Inactive accounts not disabled within baseline ODP",
              severity: "MODERATE",
              slaDays: 90,
              remediationPlan: `Enforce automated directory suspension job for accounts with > ${limitDays} days since last interactive login and alert ISSO.`,
              requiredTechnicalProof: "IdP lifecycle policy export + scheduled sweep execution log + zero enabled accounts > threshold.",
            },
          }
        : {}),
      evaluatedAt,
      auditHash: buildAuditHash("RMF-AC2-INACTIVE-002", ruleVersion, verdict, observedFacts),
    };
  }

  if (input.elapsedHours == null) {
    const observedFacts = {
      policyThresholdHours: thresholdHours,
      terminationTimestampLabel: input.terminationTimestampLabel ?? null,
      disablementTimestampLabel: input.disablementTimestampLabel ?? null,
    };
    return {
      ruleId,
      ruleVersion,
      controlId: "AC-2",
      controlTitle: "Account Management",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary:
        "INSUFFICIENT_EVIDENCE: Missing verifiable HR termination timestamp and/or IdP account disablement timestamp to compute elapsed deprovisioning duration.",
      observedFacts,
      threshold: `Approved policy deadline <= ${thresholdHours} hours`,
      variance: "Cannot compute without timestamps",
      missingEvidence: [
        "Timestamped HR termination notice / offboarding ticket",
        "Immutable IAM/IdP audit event confirming account disablement timestamp",
      ],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const elapsed = Number(input.elapsedHours.toFixed(2));
  const varianceHrs = Number((elapsed - thresholdHours).toFixed(2));
  const failed = elapsed > thresholdHours;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = {
    policyThresholdHours: thresholdHours,
    elapsedHours: elapsed,
    terminationTimestampLabel: input.terminationTimestampLabel ?? "documented termination event",
    disablementTimestampLabel: input.disablementTimestampLabel ?? "documented disablement event",
  };

  return {
    ruleId,
    ruleVersion,
    controlId: "AC-2",
    controlTitle: "Account Management",
    baseline,
    verdict,
    summary: failed
      ? `FAIL: Account was disabled after ${elapsed} hours (${input.terminationTimestampLabel ?? "termination"} to ${input.disablementTimestampLabel ?? "disablement"}), exceeding the approved ${thresholdHours}-hour deadline by ${varianceHrs} hours.`
      : `PASS: Account was disabled in ${elapsed} hours, within the approved ${thresholdHours}-hour deadline (${Math.abs(varianceHrs)} hours margin).`,
    observedFacts,
    threshold: `<= ${thresholdHours} hours from qualifying termination event (Org Policy / AC-2j, AC-2k)`,
    variance: failed ? `+${varianceHrs} hours over deadline` : `${Math.abs(varianceHrs)} hours within deadline`,
    missingEvidence: [],
    ...(failed
      ? {
          draftFinding: {
            title: "Delayed termination account removal exceeding organization-defined AC-2 SLA",
            controlId: "AC-2",
            objectiveId: "AC-02j.[01]",
            severity: "HIGH",
            rootCause: "Manual HR-to-IAM offboarding handoff failed to revoke active credentials within 24-hour policy deadline.",
            impactSummary: `Former personnel retained active account access for ${elapsed} hours (${varianceHrs} hours past ${thresholdHours}-hour limit).`,
          },
          draftPoam: {
            poamId: "POAM-AC2-TERM-001",
            controlId: "AC-2",
            weaknessName: `Terminated account removal exceeded ${thresholdHours}h SLA (${elapsed}h elapsed)`,
            severity: "HIGH",
            slaDays: defaultSlaForSeverity("HIGH"),
            remediationPlan:
              "1) Immediately verify all sessions, tokens, and API keys for the terminated identity are revoked and audit access logs during the 7-hour excess window; 2) Integrate HRIS webhook (Workday/Okta SCIM) to trigger automated account suspension upon termination; 3) Alert ISSO if disablement lags > 4 hours.",
            requiredTechnicalProof:
              "HRIS-to-IdP webhook configuration, SCIM deprovisioning test log showing < 15 minute disablement, and retroactive CloudTrail/IdP session review.",
          },
        }
      : {}),
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 2. RMF-AC3-RBAC-001: Access Enforcement & Console Bypass Prevention
// ----------------------------------------------------------------------------
export function evaluateAc3AccessEnforcementRule(input: {
  baseline?: string;
  rbacDefaultDenyEnforced?: boolean | null;
  unapprovedConsoleBypassObserved?: boolean | null;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-AC3-RBAC-001";
  const ruleVersion = "1.1.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const evaluatedAt = new Date().toISOString();

  if (input.rbacDefaultDenyEnforced == null && input.unapprovedConsoleBypassObserved == null) {
    const observedFacts = { rbacDefaultDenyEnforced: null, unapprovedConsoleBypassObserved: null };
    return {
      ruleId,
      ruleVersion,
      controlId: "AC-3",
      controlTitle: "Access Enforcement",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: Missing IAM/SCP policy documents and negative access-denial test logs.",
      observedFacts,
      threshold: "Default-deny access enforcement with zero unapproved privilege/console bypasses",
      variance: "Missing enforcement telemetry",
      missingEvidence: [
        "Effective IAM / RBAC policy configuration and SCP permission boundaries",
        "Negative test log confirming unauthorized actions return AccessDenied",
      ],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const failed = input.unapprovedConsoleBypassObserved === true || input.rbacDefaultDenyEnforced === false;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = {
    rbacDefaultDenyEnforced: input.rbacDefaultDenyEnforced ?? true,
    unapprovedConsoleBypassObserved: input.unapprovedConsoleBypassObserved ?? false,
  };

  return {
    ruleId,
    ruleVersion,
    controlId: "AC-3",
    controlTitle: "Access Enforcement",
    baseline,
    verdict,
    summary: failed
      ? "FAIL: Access enforcement control violated — direct console/unapproved privilege bypass or missing default-deny RBAC observed."
      : "PASS: Default-deny access enforcement verified with no unapproved bypasses.",
    observedFacts,
    threshold: "100% default-deny authorization with SCP/RBAC console-bypass guardrails",
    variance: failed ? "Unauthorized bypass / non-default-deny path active" : "0 bypasses",
    missingEvidence: [],
    ...(failed
      ? {
          draftFinding: {
            title: "Bypass of access enforcement guardrails (AC-3)",
            controlId: "AC-3",
            objectiveId: "AC-03[01]",
            severity: "HIGH",
            rootCause: "Over-permissive IAM roles permit direct production mutations outside controlled pipelines.",
            impactSummary: "Enables unauthorized privilege/resource modifications bypassing change and access controls.",
          },
          draftPoam: {
            poamId: "POAM-AC3-001",
            controlId: "AC-3",
            weaknessName: "Missing SCP/IAM permission boundary preventing direct production console bypass",
            severity: "HIGH",
            slaDays: 30,
            remediationPlan: "Apply explicit-deny IAM/SCP guardrails blocking non-pipeline writes and re-run 800-53A negative tests.",
            requiredTechnicalProof: "IAM/SCP JSON diff + AccessDenied simulation trace from non-pipeline principal.",
          },
        }
      : {}),
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 3. RMF-AU2-EVENTS-001: Event Logging Coverage
// ----------------------------------------------------------------------------
export function evaluateAu2EventLoggingRule(input: {
  baseline?: string;
  authLogged?: boolean | null;
  privEscLogged?: boolean | null;
  adminChangesLogged?: boolean | null;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-AU2-EVENTS-001";
  const ruleVersion = "1.1.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const evaluatedAt = new Date().toISOString();

  if (input.authLogged == null && input.privEscLogged == null && input.adminChangesLogged == null) {
    const observedFacts = { authLogged: null, privEscLogged: null, adminChangesLogged: null };
    return {
      ruleId,
      ruleVersion,
      controlId: "AU-2",
      controlTitle: "Event Logging",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: SIEM/audit pipeline configuration missing to verify AU-2 event categories.",
      observedFacts,
      threshold: "Capture auth, privilege escalation, and admin/config modification events",
      variance: "Missing SIEM event schema",
      missingEvidence: ["Audit configuration / auditd / CloudTrail / kube-apiserver event policy"],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const missingCategories: string[] = [];
  if (input.authLogged === false) missingCategories.push("authentication events");
  if (input.privEscLogged === false) missingCategories.push("privilege escalation events");
  if (input.adminChangesLogged === false) missingCategories.push("admin/policy change events");
  const failed = missingCategories.length > 0;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = {
    authLogged: input.authLogged ?? true,
    privEscLogged: input.privEscLogged ?? true,
    adminChangesLogged: input.adminChangesLogged ?? true,
  };

  return {
    ruleId,
    ruleVersion,
    controlId: "AU-2",
    controlTitle: "Event Logging",
    baseline,
    verdict,
    summary: failed
      ? `FAIL: Required auditable event coverage incomplete (missing: ${missingCategories.join(", ")}).`
      : "PASS: Authentication, privilege use, and administrative change logging verified.",
    observedFacts,
    threshold: "All mandatory AU-2(a) event categories enabled",
    variance: failed ? `Missing ${missingCategories.length} category(s)` : "0 gaps",
    missingEvidence: [],
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 4. RMF-AU6-REVIEW-001: Weekly Audit Log Review Cadence
// ----------------------------------------------------------------------------
export function evaluateAu6AuditReviewRule(input: {
  baseline?: string;
  reviewIntervalDays?: number | null;
  thresholdDays?: number | null;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-AU6-REVIEW-001";
  const ruleVersion = "1.1.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const limitDays = input.thresholdDays ?? 7;
  const evaluatedAt = new Date().toISOString();

  if (input.reviewIntervalDays == null) {
    const observedFacts = { reviewIntervalDays: null, thresholdDays: limitDays };
    return {
      ruleId,
      ruleVersion,
      controlId: "AU-6",
      controlTitle: "Audit Record Review, Analysis, and Reporting",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: Missing documented SIEM log review timestamps/tickets to verify <= 7-day cadence.",
      observedFacts,
      threshold: `<= ${limitDays} days (FedRAMP weekly audit review requirement)`,
      variance: "Unknown cadence",
      missingEvidence: ["Weekly SIEM review sign-off logs or SOC correlation run records"],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const diff = Number((input.reviewIntervalDays - limitDays).toFixed(2));
  const failed = input.reviewIntervalDays > limitDays;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = { reviewIntervalDays: input.reviewIntervalDays, thresholdDays: limitDays };

  return {
    ruleId,
    ruleVersion,
    controlId: "AU-6",
    controlTitle: "Audit Record Review, Analysis, and Reporting",
    baseline,
    verdict,
    summary: failed
      ? `FAIL: Audit record review cadence is every ${input.reviewIntervalDays} days, exceeding FedRAMP's ${limitDays}-day weekly mandate by ${diff} days.`
      : `PASS: Audit logs reviewed every ${input.reviewIntervalDays} days (within <= ${limitDays}-day weekly mandate).`,
    observedFacts,
    threshold: `<= ${limitDays} days`,
    variance: failed ? `+${diff} days over weekly SLA` : `${Math.abs(diff)} days within SLA`,
    missingEvidence: [],
    ...(failed
      ? {
          draftFinding: {
            title: "Audit log review cadence exceeds FedRAMP weekly (7-day) ODP",
            controlId: "AU-6",
            objectiveId: "AU-06a.[01]",
            severity: "MODERATE",
            rootCause: "Manual review schedule or unmonitored SIEM queue caused review lag.",
            impactSummary: "Delayed detection of anomalous privileged activity and policy violations.",
          },
          draftPoam: {
            poamId: "POAM-AU6-001",
            controlId: "AU-6",
            weaknessName: `Audit review interval (${input.reviewIntervalDays}d) exceeds 7-day SLA`,
            severity: "MODERATE",
            slaDays: 90,
            remediationPlan: "Automate SIEM alert correlation rules and enforce mandatory weekly ISSO sign-off tickets.",
            requiredTechnicalProof: "Four consecutive weekly SIEM analysis review reports + automated alert routing rules.",
          },
        }
      : {}),
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 5. RMF-CA7-CONMON-001: Continuous Monitoring Monthly Deliverable
// ----------------------------------------------------------------------------
export function evaluateCa7ConMonRule(input: {
  baseline?: string;
  conmonIntervalDays?: number | null;
  thresholdDays?: number | null;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-CA7-CONMON-001";
  const ruleVersion = "1.1.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const limitDays = input.thresholdDays ?? 30;
  const evaluatedAt = new Date().toISOString();

  if (input.conmonIntervalDays == null) {
    const observedFacts = { conmonIntervalDays: null, thresholdDays: limitDays };
    return {
      ruleId,
      ruleVersion,
      controlId: "CA-7",
      controlTitle: "Continuous Monitoring",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: Missing monthly ConMon scan/POA&M delivery dates to validate <= 30-day cadence.",
      observedFacts,
      threshold: `<= ${limitDays} days (FedRAMP Monthly ConMon requirement)`,
      variance: "Unknown",
      missingEvidence: ["ConMon package submission logs (vulnerability scan + POA&M + inventory)"],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const diff = Number((input.conmonIntervalDays - limitDays).toFixed(2));
  const failed = input.conmonIntervalDays > limitDays;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = { conmonIntervalDays: input.conmonIntervalDays, thresholdDays: limitDays };

  return {
    ruleId,
    ruleVersion,
    controlId: "CA-7",
    controlTitle: "Continuous Monitoring",
    baseline,
    verdict,
    summary: failed
      ? `FAIL: Continuous Monitoring reporting interval (${input.conmonIntervalDays} days) exceeded the ${limitDays}-day FedRAMP monthly requirement by ${diff} days.`
      : `PASS: Continuous Monitoring deliverables executed at ${input.conmonIntervalDays}-day interval (within ${limitDays} days).`,
    observedFacts,
    threshold: `<= ${limitDays} days`,
    variance: failed ? `+${diff} days over SLA` : `${Math.abs(diff)} days within SLA`,
    missingEvidence: [],
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 6. RMF-CM2-BASE-001: Baseline Configuration Review Window
// ----------------------------------------------------------------------------
export function evaluateCm2BaselineRule(input: {
  baseline?: string;
  daysSinceLastBaselineReview?: number | null;
  maxDays?: number | null;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-CM2-BASE-001";
  const ruleVersion = "1.1.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const limitDays = input.maxDays ?? 365;
  const evaluatedAt = new Date().toISOString();

  if (input.daysSinceLastBaselineReview == null) {
    const observedFacts = { daysSinceLastBaselineReview: null, maxDays: limitDays };
    return {
      ruleId,
      ruleVersion,
      controlId: "CM-2",
      controlTitle: "Baseline Configuration",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: Missing signed baseline configuration date or version-controlled IaC golden image tag.",
      observedFacts,
      threshold: `Reviewed <= ${limitDays} days and on every significant change`,
      variance: "Unknown",
      missingEvidence: ["Version-controlled baseline repository + annual review signature"],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const diff = Number((input.daysSinceLastBaselineReview - limitDays).toFixed(2));
  const failed = input.daysSinceLastBaselineReview > limitDays;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = { daysSinceLastBaselineReview: input.daysSinceLastBaselineReview, maxDays: limitDays };

  return {
    ruleId,
    ruleVersion,
    controlId: "CM-2",
    controlTitle: "Baseline Configuration",
    baseline,
    verdict,
    summary: failed
      ? `FAIL: Baseline configuration last reviewed ${input.daysSinceLastBaselineReview} days ago, exceeding ${limitDays}-day annual threshold by ${diff} days.`
      : `PASS: Baseline configuration reviewed ${input.daysSinceLastBaselineReview} days ago (within ${limitDays}-day annual threshold).`,
    observedFacts,
    threshold: `<= ${limitDays} days`,
    variance: failed ? `+${diff} days overdue` : `${Math.abs(diff)} days within window`,
    missingEvidence: [],
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 7. RMF-CM6-CONFIG-001: Hardening & Configuration Settings (CIS / STIG)
// ----------------------------------------------------------------------------
export function evaluateCm6ConfigSettingsRule(input: {
  baseline?: string;
  compliancePercent?: number | null;
  thresholdPercent?: number | null;
  unapprovedDriftObserved?: boolean | null;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-CM6-CONFIG-001";
  const ruleVersion = "1.1.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const minPct = input.thresholdPercent ?? (/high/i.test(baseline) ? 95 : 90);
  const evaluatedAt = new Date().toISOString();

  if (input.compliancePercent == null && input.unapprovedDriftObserved == null) {
    const observedFacts = { compliancePercent: null, minPercent: minPct, unapprovedDriftObserved: null };
    return {
      ruleId,
      ruleVersion,
      controlId: "CM-6",
      controlTitle: "Configuration Settings",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: Missing CIS/DISA STIG benchmark scan percentage and drift telemetry.",
      observedFacts,
      threshold: `>= ${minPct}% hardened baseline compliance with zero unapproved drift`,
      variance: "Unknown",
      missingEvidence: ["SCAP/InSpec/CIS benchmark scan output", "Cloud config drift telemetry (AWS Config/Azure Policy)"],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const pct = input.compliancePercent ?? 100;
  const failed = pct < minPct || input.unapprovedDriftObserved === true;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const diffPct = Number((minPct - pct).toFixed(2));
  const observedFacts = {
    compliancePercent: input.compliancePercent ?? null,
    minPercent: minPct,
    unapprovedDriftObserved: input.unapprovedDriftObserved ?? false,
  };

  return {
    ruleId,
    ruleVersion,
    controlId: "CM-6",
    controlTitle: "Configuration Settings",
    baseline,
    verdict,
    summary: failed
      ? `FAIL: Configuration hardening compliance (${pct}%) is below ${minPct}% or unapproved baseline drift was observed.`
      : `PASS: Configuration settings comply at ${pct}% (>= ${minPct}% threshold) with zero unapproved drift.`,
    observedFacts,
    threshold: `>= ${minPct}% hardening compliance & zero unapproved drift`,
    variance: pct < minPct ? `-${diffPct}% below target` : "Meets hardening threshold",
    missingEvidence: [],
    ...(failed
      ? {
          draftFinding: {
            title: "Configuration settings deviate from hardened CIS/DISA STIG baseline (CM-6)",
            controlId: "CM-6",
            objectiveId: "CM-06b.[01]",
            severity: "HIGH",
            rootCause: "Manual configuration mutations or unapplied hardening roles caused drift.",
            impactSummary: "Exposes production hosts/cloud resources with insecure default settings.",
          },
          draftPoam: {
            poamId: "POAM-CM6-001",
            controlId: "CM-6",
            weaknessName: "Hardened baseline compliance / drift remediation",
            severity: "HIGH",
            slaDays: 30,
            remediationPlan: "Re-apply IaC/Ansible STIG hardening, reconcile deviations in SSP, and enable automated drift blocks.",
            requiredTechnicalProof: "Fresh SCAP/CIS compliance report >= threshold + IaC state plan showing zero drift.",
          },
        }
      : {}),
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 8. RMF-IA2-MFA-001: Privileged & Non-Privileged Phishing-Resistant MFA
// ----------------------------------------------------------------------------
export function evaluateIa2AuthRule(input: {
  baseline?: string;
  mfaEnforcedPrivileged?: boolean | null;
  phishingResistant?: boolean | null;
  staticSshKeysInUse?: boolean | null;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-IA2-MFA-001";
  const ruleVersion = "1.1.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const evaluatedAt = new Date().toISOString();

  if (input.mfaEnforcedPrivileged == null && input.staticSshKeysInUse == null) {
    const observedFacts = { mfaEnforcedPrivileged: null, phishingResistant: null, staticSshKeysInUse: null };
    return {
      ruleId,
      ruleVersion,
      controlId: "IA-2",
      controlTitle: "Identification and Authentication (Organizational Users)",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: Missing IdP MFA policy export and privileged SSH/bastion configuration evidence.",
      observedFacts,
      threshold: "Phishing-resistant hardware MFA (IA-2(1)/(6)) with zero static unmanaged keys",
      variance: "Missing authentication telemetry",
      missingEvidence: ["IdP authentication policy enforcing FIDO2/PIV", "sshd_config / bastion config proving no static bypass"],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const failed = input.mfaEnforcedPrivileged === false || input.staticSshKeysInUse === true || input.phishingResistant === false;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = {
    mfaEnforcedPrivileged: input.mfaEnforcedPrivileged ?? true,
    phishingResistant: input.phishingResistant ?? true,
    staticSshKeysInUse: input.staticSshKeysInUse ?? false,
  };

  return {
    ruleId,
    ruleVersion,
    controlId: "IA-2",
    controlTitle: "Identification and Authentication (Organizational Users)",
    baseline,
    verdict,
    summary: failed
      ? "FAIL: Privileged access permits non-MFA or static unmanaged keys without phishing-resistant hardware MFA (IA-2(1)/(6) deficiency)."
      : "PASS: Phishing-resistant hardware MFA enforced for privileged access with zero static SSH keys.",
    observedFacts,
    threshold: "100% phishing-resistant MFA on privileged access; zero static keys",
    variance: failed ? "Privileged MFA bypass / static key exposure active" : "0 violations",
    missingEvidence: [],
    ...(failed
      ? {
          draftFinding: {
            title: "Absence of phishing-resistant MFA on privileged administrative access (IA-2 / IA-2(1)/(6))",
            controlId: "IA-2",
            objectiveId: "IA-02(01)[01]",
            severity: "HIGH",
            rootCause: "Static SSH keys or legacy password/SMS auth allowed without FIDO2/PIV hardware challenge.",
            impactSummary: "High-severity credential theft and lateral movement risk across production boundary.",
          },
          draftPoam: {
            poamId: "POAM-IA2-MFA-001",
            controlId: "IA-2",
            weaknessName: "Eliminate static privileged keys and enforce phishing-resistant MFA",
            severity: "HIGH",
            slaDays: 30,
            remediationPlan: "Replace static SSH keys with short-lived FIDO2/OIDC certificates (e.g., Teleport / SSM WebAuthn) and enforce IdP MFA policy.",
            requiredTechnicalProof: "sshd_config / proxy config + negative test log rejecting static unauthenticated key.",
          },
        }
      : {}),
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 9. RMF-RA5-VULN-001: Vulnerability Scan Age & Open POA&M SLA Check
// ----------------------------------------------------------------------------
export function evaluateRa5VulnScanningRule(input: {
  baseline?: string;
  daysSinceLastScan?: number | null;
  findingSeverity?: RmfPoamSeverity | null;
  findingDaysOpen?: number | null;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-RA5-VULN-001";
  const ruleVersion = "1.2.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const evaluatedAt = new Date().toISOString();

  if (input.daysSinceLastScan == null && (input.findingSeverity == null || input.findingDaysOpen == null)) {
    const observedFacts = { daysSinceLastScan: null, findingSeverity: null, findingDaysOpen: null };
    return {
      ruleId,
      ruleVersion,
      controlId: "RA-5",
      controlTitle: "Vulnerability Monitoring and Scanning",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: Missing authenticated vulnerability scan timestamps or finding aging data.",
      observedFacts,
      threshold: "Monthly scans <= 30 days; POA&M SLAs Crit 15d, High 30d, Mod 90d, Low 180d",
      variance: "Missing scan/aging inputs",
      missingEvidence: ["Authenticated OS/DB/Web scan timestamp & open CVE severity/age report"],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const scanLate = input.daysSinceLastScan != null && input.daysSinceLastScan > 30;
  const sev = input.findingSeverity || "HIGH";
  const slaDays = defaultSlaForSeverity(sev);
  const findingLate = input.findingDaysOpen != null && input.findingDaysOpen > slaDays;
  const failed = scanLate || findingLate;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = {
    daysSinceLastScan: input.daysSinceLastScan ?? null,
    findingSeverity: input.findingSeverity ?? null,
    findingDaysOpen: input.findingDaysOpen ?? null,
    slaDays,
  };

  const parts: string[] = [];
  if (input.daysSinceLastScan != null) {
    parts.push(
      scanLate
        ? `scan age ${input.daysSinceLastScan}d exceeds 30d (+${input.daysSinceLastScan - 30}d)`
        : `scan age ${input.daysSinceLastScan}d <= 30d`,
    );
  }
  if (input.findingDaysOpen != null) {
    parts.push(
      findingLate
        ? `${sev} finding open ${input.findingDaysOpen}d exceeds ${slaDays}d FedRAMP SLA (+${input.findingDaysOpen - slaDays}d)`
        : `${sev} finding open ${input.findingDaysOpen}d <= ${slaDays}d SLA`,
    );
  }

  return {
    ruleId,
    ruleVersion,
    controlId: "RA-5",
    controlTitle: "Vulnerability Monitoring and Scanning",
    baseline,
    verdict,
    summary: `${verdict}: ${parts.join("; ")}.`,
    observedFacts,
    threshold: "Scan interval <= 30d; Remediation SLA Crit 15d / High 30d / Mod 90d / Low 180d",
    variance: findingLate
      ? `+${input.findingDaysOpen! - slaDays} days over ${sev} SLA`
      : scanLate
      ? `+${input.daysSinceLastScan! - 30} days over 30d scan window`
      : "Within SLA",
    missingEvidence: [],
    ...(failed
      ? {
          draftFinding: {
            title: "RA-5 vulnerability scanning or remediation SLA breach",
            controlId: "RA-5",
            objectiveId: "RA-05d.[01]",
            severity: sev,
            rootCause: "Scanner cadence slipped beyond 30 days or open POA&M remediation exceeded FedRAMP statutory window.",
            impactSummary: `System carries overdue ${sev} vulnerability exposure exceeding ${slaDays}-day risk window.`,
          },
          draftPoam: {
            poamId: "POAM-RA5-SLA-001",
            controlId: "RA-5",
            weaknessName: `RA-5 compliance breach (${parts.join("; ")})`,
            severity: sev,
            slaDays,
            remediationPlan: "Execute authenticated rescan, patch overdue CVEs immediately, and attach verified rescan evidence for POA&M closure.",
            requiredTechnicalProof: "Authenticated rescan XML/OSCAL report showing CVE resolved or vendor-verified fix deployed.",
          },
        }
      : {}),
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// 10. RMF-SI2-FLAW-001: Flaw Remediation & KEV Timeline Compliance
// ----------------------------------------------------------------------------
export function evaluateSi2FlawRemediationRule(input: {
  baseline?: string;
  severity?: RmfPoamSeverity;
  remediationDays?: number | null;
  isCisaKev?: boolean;
}): RmfRuleEvaluationResult {
  const ruleId = "RMF-SI2-FLAW-001";
  const ruleVersion = "1.1.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const sev = input.severity || "HIGH";
  const limitDays = input.isCisaKev ? 15 : defaultSlaForSeverity(sev);
  const evaluatedAt = new Date().toISOString();

  if (input.remediationDays == null) {
    const observedFacts = { severity: sev, remediationDays: null, limitDays, isCisaKev: Boolean(input.isCisaKev) };
    return {
      ruleId,
      ruleVersion,
      controlId: "SI-2",
      controlTitle: "Flaw Remediation",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      summary: "INSUFFICIENT_EVIDENCE: Missing patch deployment timestamp / remediation duration since CVE disclosure.",
      observedFacts,
      threshold: `Patch ${input.isCisaKev ? "CISA KEV/Crit <= 15d" : `${sev} <= ${limitDays}d`}`,
      variance: "Unknown",
      missingEvidence: ["Patch ticket closure log and post-patch verification scan"],
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const diff = Number((input.remediationDays - limitDays).toFixed(2));
  const failed = input.remediationDays > limitDays;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts = {
    severity: sev,
    remediationDays: input.remediationDays,
    limitDays,
    isCisaKev: Boolean(input.isCisaKev),
  };

  return {
    ruleId,
    ruleVersion,
    controlId: "SI-2",
    controlTitle: "Flaw Remediation",
    baseline,
    verdict,
    summary: failed
      ? `FAIL: Flaw remediation took ${input.remediationDays} days, violating the ${limitDays}-day ${input.isCisaKev ? "CISA KEV" : sev} SLA by ${diff} days.`
      : `PASS: Flaw remediated in ${input.remediationDays} days (within ${limitDays}-day SLA).`,
    observedFacts,
    threshold: `<= ${limitDays} days`,
    variance: failed ? `+${diff} days over SLA` : `${Math.abs(diff)} days within SLA`,
    missingEvidence: [],
    evaluatedAt,
    auditHash: buildAuditHash(ruleId, ruleVersion, verdict, observedFacts),
  };
}

// ----------------------------------------------------------------------------
// Deterministic Natural-Language Parser for Starter Control Evidence
// ----------------------------------------------------------------------------
const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseDayTimeHours(text: string, markerRegex: RegExp): { hourOffset: number; label: string } | null {
  const m = text.match(markerRegex);
  if (!m) return null;
  const slice = m[0];
  // Match either "08:00 Monday" / "8:00 AM Monday" or "Monday at 08:00"
  const timeFirst = slice.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  const dayFirst = slice.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const hit = timeFirst || dayFirst;
  if (!hit) return null;

  let hour: number;
  let minute: number;
  let ampm: string | undefined;
  let dayName: string;

  if (timeFirst) {
    hour = Number(timeFirst[1]);
    minute = Number(timeFirst[2] || "0");
    ampm = timeFirst[3];
    dayName = timeFirst[4].toLowerCase();
  } else {
    dayName = dayFirst![1].toLowerCase();
    hour = Number(dayFirst![2]);
    minute = Number(dayFirst![3] || "0");
    ampm = dayFirst![4];
  }

  if (ampm) {
    const low = ampm.toLowerCase();
    if (low === "pm" && hour < 12) hour += 12;
    if (low === "am" && hour === 12) hour = 0;
  }

  const dayIdx = DAY_INDEX[dayName] ?? 0;
  return {
    hourOffset: dayIdx * 24 + hour + minute / 60,
    label: hit[0].trim(),
  };
}

export function extractAndEvaluateRmfRulesFromText(question: string): RmfRuleEvaluationResult[] {
  const q = (question || "").trim();
  if (!q) return [];
  const results: RmfRuleEvaluationResult[] = [];
  const baseline = /\bfedramp\s+moderate\b/i.test(q)
    ? "FedRAMP Rev. 5 Moderate"
    : /\bfedramp\s+low\b/i.test(q)
    ? "FedRAMP Rev. 5 Low"
    : "FedRAMP Rev. 5 High";

  const hasEvalIntent =
    /\b(evaluat\w*|assess\w*|check|verif\w*|compliant|compliance|verdict|audit|pass|fail|gap|poa&m|poam|disabled|terminated|termination|missing\s+evidence|no\s+evidence)\b/i.test(
      q,
    );

  // AC-2 / Termination or inactivity timestamps
  if (/\bAC-2\b|\bterminat\w*\s+account|\bdisabled\s+(?:within|at|after)|\binactive\s+accounts?\b/i.test(q)) {
    const thresholdMatch = q.match(/(?:within|threshold|deadline|limit|requirement|sla)[^\d]{0,18}(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b|days?|d\b)/i);
    let policyThresholdHours: number | null = null;
    if (thresholdMatch) {
      const val = Number(thresholdMatch[1]);
      policyThresholdHours = /^d/i.test(thresholdMatch[2]) ? val * 24 : val;
    }

    const startTime = parseDayTimeHours(
      q,
      /(?:terminat(?:ed|ion)|revoked|offboarded|separated)[^.\n]{0,45}?\b(?:(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:on\s+)?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday))|(?:(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?))/i,
    );
    const endTime = parseDayTimeHours(
      q,
      /(?:disabled|removed|deprovisioned)[^.\n]{0,45}?\b(?:(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:on\s+)?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday))|(?:(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?))/i,
    );

    let elapsedHours: number | null = null;
    if (startTime && endTime) {
      let diff = endTime.hourOffset - startTime.hourOffset;
      if (diff < 0) diff += 7 * 24;
      elapsedHours = Number(diff.toFixed(2));
    } else {
      const explicitElapsed = q.match(/(?:elapsed|took|after)\s*(?:time\s*[:=]?\s*)?(\d+(?:\.\d+)?)\s*(hours?|hrs?)/i);
      if (explicitElapsed) elapsedHours = Number(explicitElapsed[1]);
    }

    const inactiveDaysMatch = q.match(/inactive\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*days?/i);
    if (
      elapsedHours != null ||
      inactiveDaysMatch ||
      /\bterminat\w*/i.test(q) ||
      (/\bAC-2\b/i.test(q) && hasEvalIntent)
    ) {
      results.push(
        evaluateAc2AccountManagementRule({
          baseline,
          policyThresholdHours,
          elapsedHours,
          terminationTimestampLabel: startTime?.label ?? null,
          disablementTimestampLabel: endTime?.label ?? null,
          inactiveAccountDays: inactiveDaysMatch ? Number(inactiveDaysMatch[1]) : null,
        }),
      );
    }
  }

  // AC-3
  if (/\bAC-3\b/i.test(q) && hasEvalIntent) {
    const bypass = /\b(?:bypass|direct\s+console|without\s+change|no\s+scp)\b/i.test(q) ? true : null;
    const missing = /\b(?:no\s+evidence|missing\s+(?:logs|evidence|policy))\b/i.test(q);
    results.push(
      evaluateAc3AccessEnforcementRule({
        baseline,
        rbacDefaultDenyEnforced: missing ? null : bypass ? false : null,
        unapprovedConsoleBypassObserved: missing ? null : bypass,
      }),
    );
  }

  // AU-6
  if (/\bAU-6\b/i.test(q) && (hasEvalIntent || /\b(?:every|interval|cadence|days?)\b/i.test(q))) {
    const revDays = q.match(/(?:review(?:ed)?(?:\s+every)?|cadence|interval)[^\d]{0,16}(\d+(?:\.\d+)?)\s*days?/i);
    if (revDays || hasEvalIntent) {
      results.push(
        evaluateAu6AuditReviewRule({
          baseline,
          reviewIntervalDays: revDays ? Number(revDays[1]) : null,
        }),
      );
    }
  }

  // CM-6
  if (/\bCM-6\b/i.test(q) && (hasEvalIntent || /\b(?:stig|cis|compliance|drift|\d+%)\b/i.test(q))) {
    const pctMatch = q.match(/(?:stig|cis|compliance|hardening)[^\d]{0,20}(\d+(?:\.\d+)?)\s*%/i);
    const drift = /\b(?:unauthorized\s+drift|manual\s+console\s+mutation|console\s+drift)\b/i.test(q) ? true : null;
    if (pctMatch || drift != null || hasEvalIntent) {
      results.push(
        evaluateCm6ConfigSettingsRule({
          baseline,
          compliancePercent: pctMatch ? Number(pctMatch[1]) : null,
          unapprovedDriftObserved: drift,
        }),
      );
    }
  }

  // IA-2
  if (/\bIA-2\b/i.test(q) && (hasEvalIntent || /\b(?:static\s+ssh|without\s+(?:hardware|phishing-resistant)?\s*mfa|no\s+mfa)\b/i.test(q))) {
    const staticKey = /\bstatic\s+(?:rsa|ssh|unmanaged)\s*keys?\b/i.test(q) ? true : null;
    const noMfa = /\bwithout\s+(?:hardware[- ]token\s+|phishing[- ]resistant\s+)?mfa\b|\bno\s+mfa\b/i.test(q) ? false : null;
    if (staticKey != null || noMfa != null || hasEvalIntent) {
      results.push(
        evaluateIa2AuthRule({
          baseline,
          mfaEnforcedPrivileged: noMfa,
          staticSshKeysInUse: staticKey,
        }),
      );
    }
  }

  // RA-5 / SI-2
  if (/\bRA-5\b|\bPOA&M\b|\bPOAM\b/i.test(q) && (hasEvalIntent || /\b(?:open|scan|overdue|days?)\b/i.test(q))) {
    const scanDays = q.match(/(?:last\s+scan|scan(?:ned)?(?:\s+every)?|scan\s+age)[^\d]{0,16}(\d+(?:\.\d+)?)\s*days?/i);
    const openDays = q.match(/(?:open\s+(?:for\s+)?|overdue\s+(?:by\s+)?|aged\s+)(\d+(?:\.\d+)?)\s*days?/i);
    const sevMatch = q.match(/\b(CRITICAL|HIGH|MODERATE|LOW)\b(?:\s+(?:severity|poa&m|poam|finding|cve|vulnerability))?/i);
    if (scanDays || openDays) {
      results.push(
        evaluateRa5VulnScanningRule({
          baseline,
          daysSinceLastScan: scanDays ? Number(scanDays[1]) : null,
          findingSeverity: (sevMatch?.[1]?.toUpperCase() as RmfPoamSeverity) || "HIGH",
          findingDaysOpen: openDays ? Number(openDays[1]) : null,
        }),
      );
    }
  }

  if (/\bSI-2\b/i.test(q) && (hasEvalIntent || /\b(?:patch(?:ed)?|remediat\w*|days?|kev)\b/i.test(q))) {
    const remDays = q.match(/(?:patch(?:ed)?|remediat\w*|took)[^\d]{0,16}(\d+(?:\.\d+)?)\s*days?/i);
    const sevMatch = q.match(/\b(CRITICAL|HIGH|MODERATE|LOW)\b/i);
    if (remDays || hasEvalIntent) {
      results.push(
        evaluateSi2FlawRemediationRule({
          baseline,
          severity: (sevMatch?.[1]?.toUpperCase() as RmfPoamSeverity) || "HIGH",
          remediationDays: remDays ? Number(remDays[1]) : null,
          isCisaKev: /\bkev\b|\bcisa\s+known\s+exploited\b/i.test(q),
        }),
      );
    }
  }

  return results;
}
