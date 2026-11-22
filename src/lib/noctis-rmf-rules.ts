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
import { extractAndEvaluateExtendedRmfRulesFromText } from "./noctis-rmf-rules-extended.ts";
export {
  EXTENDED_18_CONTROLS,
  ALL_COVERED_RULE_CONTROLS,
  EXTENDED_RULE_CATALOG,
  evaluateAc6LeastPrivilegeRule,
  evaluateAt2TrainingRule,
  evaluateCp9BackupRule,
  evaluateIa5AuthenticatorRule,
  evaluateIr4IncidentRule,
  evaluateSc7BoundaryRule,
  evaluateSc13CryptoRule,
  evaluateSi4MonitoringRule,
  evaluateMa4Rule,
  evaluateMp6Rule,
  evaluatePe3Rule,
  evaluatePl2Rule,
  evaluatePm9Rule,
  evaluatePs3Rule,
  evaluatePt2Rule,
  evaluateSa11Rule,
  evaluateSc28Rule,
  evaluateSr3Rule,
  evaluateDodImpactLevelOverlay,
  evaluateCmmcSprsScore,
  extractAndEvaluateExtendedRmfRulesFromText,
  type ExtendedRuleCatalogEntry,
  type DodImpactLevelInput,
  type DodImpactLevelResult,
  type CmmcFailedControlInput,
  type CmmcSprsResult,
} from "./noctis-rmf-rules-extended.ts";

export type RmfVerdict =
  | "PASS"
  | "FAIL"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_APPLICABLE"
  | "MANUAL_REVIEW_REQUIRED";

export type RmfAssessmentMode = "SCENARIO_ASSUMPTION" | "FORMAL_EVIDENCE_AUDIT";

export type RmfPoamSeverity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export interface RmfAuthorityCitation {
  document: string;
  version: string;
  section: string;
  parameterId?: string;
  parameterValue?: string;
  url: string;
  effectiveDate: string;
  authorityType: "BASELINE_ODP" | "PROGRAM_GUIDANCE" | "DIRECTIVE_SCOPED";
  scope: string;
  exceptions: string;
}

export interface Ia2AuthPathAssessment {
  evaluatedPath: string;
  upstreamMfaConsidered: boolean;
  sameDomainGuidanceApplies: boolean;
  directBypassRisk: boolean;
  architecturalVerificationRequired: string[];
}

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
  assessmentMode?: RmfAssessmentMode;
  formalEvidenceStatus?: "VERIFIED_ARTIFACTS_PROVIDED" | "PENDING_VERIFIED_EVIDENCE";
  formalDetermination?: RmfVerdict | "PENDING_EVIDENCE";
  summary: string;
  observedFacts: Record<string, string | number | boolean | null>;
  threshold: string;
  variance: string;
  missingEvidence: string[];
  authorityCitations?: RmfAuthorityCitation[];
  poamAuthorityNote?: string;
  authPathAssessment?: Ia2AuthPathAssessment;
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

const FEDRAMP_OSCAL_VERSION = "fedramp2.1.0-oscal1.0.4";
const FEDRAMP_OSCAL_EFFECTIVE_DATE = "2024-09-24";

function getPoamProgramAuthorityNote(): string {
  return (
    "Authority scope: 30-day High / 90-day Moderate / 180-day Low POA&M timelines reflect FedRAMP Continuous Monitoring program guidance " +
    `(${FEDRAMP_OSCAL_VERSION} RA-5(d) ODP ra-05_odp.03 for vulnerability scan findings; FedRAMP ConMon Strategy & POA&M Guide for control weaknesses), ` +
    "NOT a universal statutory mandate—subject to Agency/JAB AO tailoring and approved Deviation Requests. CISA BOD 22-01 applies strictly to KEV-listed vulnerabilities, not automatically to AC-2 or IA-2 deficiencies."
  );
}

function getAc2AuthorityCitations(baseline: string): RmfAuthorityCitation[] {
  const isMod = /moderate/i.test(baseline);
  const baseDoc = isMod ? "FedRAMP Rev 5 Moderate Baseline" : /low/i.test(baseline) ? "FedRAMP Rev 5 Low Baseline" : "FedRAMP Rev 5 High Baseline";
  const baseUrl = `https://www.fedramp.gov/baselines/`;
  const list: RmfAuthorityCitation[] = [
    {
      document: baseDoc,
      version: FEDRAMP_OSCAL_VERSION,
      section: "AC-2(3)(b) Disable Accounts",
      parameterId: "ac-02.03_odp.01",
      parameterValue: "24 hours for user accounts",
      url: baseUrl,
      effectiveDate: FEDRAMP_OSCAL_EFFECTIVE_DATE,
      authorityType: "BASELINE_ODP",
      scope: "Disabling separated/terminated/expired user accounts under FedRAMP Rev. 5 Moderate and High baselines.",
      exceptions: "Non-user/device account timeframes are CSP-defined and require JAB/AO approval; Low baseline defers to agency-defined SSP parameter.",
    },
    {
      document: baseDoc,
      version: FEDRAMP_OSCAL_VERSION,
      section: "AC-2(h)(2) Termination/Transfer Notification",
      parameterId: "ac-02_odp.07",
      parameterValue: isMod ? "twelve (12) hours" : /low/i.test(baseline) ? "twenty-four (24) hours" : "eight (8) hours",
      url: baseUrl,
      effectiveDate: FEDRAMP_OSCAL_EFFECTIVE_DATE,
      authorityType: "BASELINE_ODP",
      scope: "Notification to account managers and designated roles upon user termination or transfer.",
      exceptions: "Tailored SSP ODPs or compensating HR-IAM automation accepted by AO.",
    },
    {
      document: baseDoc,
      version: FEDRAMP_OSCAL_VERSION,
      section: "AC-2(j) Account Review & AC-2(3)(d) Inactivity",
      parameterId: isMod ? "ac-02_odp.10 / ac-02.03_odp.02" : "ac-02_odp.10 / ac-02.03_odp.02",
      parameterValue: `Review ${/low/i.test(baseline) ? "at least annually" : "monthly for privileged access, every 6 months for non-privileged"}; inactivity disablement ${isMod ? "90 days (or 35 days if tailored)" : "35 days (ac-02.03_odp.02)"}`,
      url: baseUrl,
      effectiveDate: FEDRAMP_OSCAL_EFFECTIVE_DATE,
      authorityType: "BASELINE_ODP",
      scope: "Periodic account compliance review and automated inactivity disablement.",
      exceptions: "CSP defines non-user device identifier inactivity approved by JAB/AO; DoD cloud systems follow additional DoD CC SRG overlays.",
    },
  ];
  return list;
}

function getIa2AuthorityCitations(baseline: string): RmfAuthorityCitation[] {
  const baseDoc = /moderate/i.test(baseline) ? "FedRAMP Rev 5 Moderate Baseline" : /low/i.test(baseline) ? "FedRAMP Rev 5 Low Baseline" : "FedRAMP Rev 5 High Baseline";
  const baseUrl = "https://www.fedramp.gov/baselines/";
  return [
    {
      document: baseDoc,
      version: FEDRAMP_OSCAL_VERSION,
      section: "IA-2 & IA-2(1) Privileged MFA / Additional FedRAMP Requirements",
      parameterId: "ia-2.1_fr_smt.1-2 / ia-2.1_fr_gdn.1",
      parameterValue: "Adhere to NIST SP 800-63-3 (63A/63B/63C); MFA must be phishing-resistant",
      url: baseUrl,
      effectiveDate: FEDRAMP_OSCAL_EFFECTIVE_DATE,
      authorityType: "BASELINE_ODP",
      scope: "Organizational privileged account authentication across FedRAMP systems.",
      exceptions: "FedRAMP Guidance ia-2.1_fr_gdn.1: MFA to subsequent components in the same user domain is not required once phishing-resistant MFA is enforced at domain entry; end-to-end bastion/IdP path must be verified against direct bypass.",
    },
    {
      document: baseDoc,
      version: FEDRAMP_OSCAL_VERSION,
      section: "IA-2(6) Access to Accounts — Separate Device",
      parameterId: "ia-02.06_odp.01-03",
      parameterValue: "local, network and remote access to privileged and non-privileged accounts using FIPS-validated or NSA-approved cryptography",
      url: baseUrl,
      effectiveDate: FEDRAMP_OSCAL_EFFECTIVE_DATE,
      authorityType: "BASELINE_ODP",
      scope: "Hardware-backed / separate-device cryptographic MFA (e.g., PIV, CAC, FIDO2/WebAuthn).",
      exceptions: "See SC-13 for FIPS 140-2/140-3 or NSA-approved cryptography; system-specific architecture and overlays (e.g., DoD CC SRG) apply if tailored.",
    },
  ];
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
  assessmentMode?: RmfAssessmentMode;
  evidenceVerified?: boolean;
}

export function evaluateAc2AccountManagementRule(input: Ac2TerminationInput): RmfRuleEvaluationResult {
  const ruleId = "RMF-AC2-TERM-001";
  const ruleVersion = "1.3.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const thresholdHours = input.policyThresholdHours ?? 24;
  const evaluatedAt = new Date().toISOString();
  const authorityCitations = getAc2AuthorityCitations(baseline);
  const poamAuthorityNote = getPoamProgramAuthorityNote();
  const isScenarioMode = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;

  if (input.notApplicableReason) {
    const observedFacts = { notApplicableReason: input.notApplicableReason };
    return {
      ruleId,
      ruleVersion,
      controlId: "AC-2",
      controlTitle: "Account Management",
      baseline,
      verdict: "NOT_APPLICABLE",
      assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
      formalEvidenceStatus: input.evidenceVerified ? "VERIFIED_ARTIFACTS_PROVIDED" : "PENDING_VERIFIED_EVIDENCE",
      formalDetermination: "NOT_APPLICABLE",
      summary: `Control check scoped out: ${input.notApplicableReason}`,
      observedFacts,
      threshold: `Disable separated accounts within ${thresholdHours} hours`,
      variance: "N/A",
      missingEvidence: [],
      authorityCitations,
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "NOT_APPLICABLE", observedFacts),
    };
  }

  // Sub-check for AC-2(3) inactive account threshold if elapsedHours not supplied
  if (input.elapsedHours == null && input.inactiveAccountDays != null) {
    const limitDays = input.inactivityLimitDays ?? (/high|moderate/i.test(baseline) ? 35 : 90);
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
      assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
      formalEvidenceStatus: input.evidenceVerified ? "VERIFIED_ARTIFACTS_PROVIDED" : "PENDING_VERIFIED_EVIDENCE",
      formalDetermination: isScenarioMode ? "PENDING_EVIDENCE" : verdict,
      summary: failed
        ? `${isScenarioMode ? "SCENARIO FAIL" : "FAIL"}: Inactive account remained enabled for ${input.inactiveAccountDays} days, exceeding the ${limitDays}-day FedRAMP AC-2(3) ODP (ac-02.03_odp.02) by ${diffDays} days.${isScenarioMode ? " Formal compliance finding requires verified IdP inactivity logs and approved SSP ODP confirmation." : ""}`
        : `${isScenarioMode ? "SCENARIO PASS" : "PASS"}: Inactive accounts disabled within ${input.inactiveAccountDays} days (within ${limitDays}-day limit).`,
      observedFacts,
      threshold: `Disable inactive accounts within <= ${limitDays} days (AC-2(3) ac-02.03_odp.02, ${baseline})`,
      variance: failed ? `+${diffDays} days over limit` : `${Math.abs(diffDays)} days within limit`,
      missingEvidence: isScenarioMode
        ? ["IdP last-login & automated disablement audit log", "Approved SSP parameter record confirming AC-2(3) ODP"]
        : [],
      authorityCitations,
      poamAuthorityNote,
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
      assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
      formalEvidenceStatus: "PENDING_VERIFIED_EVIDENCE",
      formalDetermination: "INSUFFICIENT_EVIDENCE",
      summary:
        "INSUFFICIENT_EVIDENCE: Missing verifiable HR termination timestamp and/or IdP account disablement timestamp to compute elapsed deprovisioning duration.",
      observedFacts,
      threshold: `Approved policy / FedRAMP AC-2(3) ac-02.03_odp.01 deadline <= ${thresholdHours} hours (AC-2(h)(2) notification <= 8 hours in High)`,
      variance: "Cannot compute without timestamps",
      missingEvidence: [
        "Timestamped HR termination notice / offboarding ticket",
        "Immutable IAM/IdP audit event confirming account disablement timestamp",
        "Approved SSP parameter confirmation for AC-2(h)(2) & AC-2(3)",
      ],
      authorityCitations,
      poamAuthorityNote,
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const elapsed = Number(input.elapsedHours.toFixed(2));
  const varianceHrs = Number((elapsed - thresholdHours).toFixed(2));
  const failed = elapsed > thresholdHours;
  const verdict: RmfVerdict = failed ? "FAIL" : "PASS";
  const observedFacts: Record<string, string | number | boolean | null> = {
    policyThresholdHours: thresholdHours,
    elapsedHours: elapsed,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    evidenceVerified: Boolean(input.evidenceVerified),
    terminationTimestampLabel: input.terminationTimestampLabel ?? "stipulated termination event",
    disablementTimestampLabel: input.disablementTimestampLabel ?? "stipulated disablement / active window",
  };

  return {
    ruleId,
    ruleVersion,
    controlId: "AC-2",
    controlTitle: "Account Management",
    baseline,
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalEvidenceStatus: input.evidenceVerified ? "VERIFIED_ARTIFACTS_PROVIDED" : "PENDING_VERIFIED_EVIDENCE",
    formalDetermination: isScenarioMode ? "PENDING_EVIDENCE" : verdict,
    summary: failed
      ? `${isScenarioMode ? "SCENARIO FAIL (Formal Assessment: PENDING_VERIFIED_EVIDENCE)" : "FAIL"}: Stipulated account active window of ${elapsed} hours exceeds the ${thresholdHours}-hour FedRAMP AC-2(3) (ac-02.03_odp.01) user-account disablement threshold by ${varianceHrs} hours.${isScenarioMode ? " Formal assessor determination requires verified HRIS termination timestamps, immutable IdP revocation logs, and SSP ODP verification." : ""}`
      : `${isScenarioMode ? "SCENARIO PASS (Formal Assessment: PENDING_VERIFIED_EVIDENCE)" : "PASS"}: Account disabled in ${elapsed} hours, within the ${thresholdHours}-hour threshold (${Math.abs(varianceHrs)} hours margin).`,
    observedFacts,
    threshold: `<= ${thresholdHours} hours for user account disablement (FedRAMP Rev. 5 AC-2(3) ac-02.03_odp.01; AC-2(h)(2) notification ac-02_odp.07 <= 8h High / 12h Mod)`,
    variance: failed ? `+${varianceHrs} hours over deadline` : `${Math.abs(varianceHrs)} hours within deadline`,
    missingEvidence: isScenarioMode
      ? [
          "Timestamped HRIS termination notice / offboarding ticket confirming exact separation time",
          "Immutable IdP / IAM / Active Directory / SSH session audit log confirming account disablement & token revocation timestamps",
          "Approved SSP ODP entry confirming applicable agency/CSP AC-2(3) & AC-2(h)(2) thresholds",
        ]
      : [],
    authorityCitations,
    poamAuthorityNote,
    ...(failed
      ? {
          draftFinding: {
            title: "Delayed termination account removal exceeding AC-2 / AC-2(3) deprovisioning SLA",
            controlId: "AC-2",
            objectiveId: "AC-02(03)[01]",
            severity: "HIGH",
            rootCause: "Manual HR-to-IAM offboarding handoff failed to revoke active credentials within 24-hour user-account disablement threshold.",
            impactSummary: `Former personnel retained active account access for ${elapsed} hours (${varianceHrs} hours past the ${thresholdHours}-hour limit).`,
          },
          draftPoam: {
            poamId: "POAM-AC2-TERM-001",
            controlId: "AC-2",
            weaknessName: `Terminated account removal exceeded ${thresholdHours}h threshold (${elapsed}h active; +${varianceHrs}h variance)`,
            severity: "HIGH",
            slaDays: defaultSlaForSeverity("HIGH"),
            remediationPlan:
              `1) Immediately verify all sessions, tokens, and API keys for the terminated identity are revoked and audit access logs during the ${varianceHrs}-hour excess window; 2) Integrate HRIS webhook (Workday/Okta SCIM) to trigger automated account suspension upon termination; 3) Alert ISSO/account managers within <= 8 hours (AC-2(h)(2) FedRAMP High ODP ac-02_odp.07).`,
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
// 8. RMF-IA2-MFA-001: End-to-End Privileged Authentication Path & MFA
// ----------------------------------------------------------------------------
export interface Ia2AuthPathInput {
  baseline?: string;
  mfaEnforcedPrivileged?: boolean | null;
  phishingResistant?: boolean | null;
  staticSshKeysInUse?: boolean | null;
  upstreamBastionMfaEnforced?: boolean | null;
  idpFederationPhishingResistant?: boolean | null;
  ephemeralSshCertificates?: boolean | null;
  directSshBypassBlocked?: boolean | null;
  assessmentMode?: RmfAssessmentMode;
  evidenceVerified?: boolean;
}

export function evaluateIa2AuthRule(input: Ia2AuthPathInput): RmfRuleEvaluationResult {
  const ruleId = "RMF-IA2-MFA-001";
  const ruleVersion = "2.0.0";
  const baseline = input.baseline || "FedRAMP Rev. 5 High";
  const evaluatedAt = new Date().toISOString();
  const authorityCitations = getIa2AuthorityCitations(baseline);
  const poamAuthorityNote = getPoamProgramAuthorityNote();
  const isScenarioMode = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;

  const hasAnySignal =
    input.mfaEnforcedPrivileged != null ||
    input.phishingResistant != null ||
    input.staticSshKeysInUse != null ||
    input.upstreamBastionMfaEnforced != null ||
    input.idpFederationPhishingResistant != null ||
    input.ephemeralSshCertificates != null ||
    input.directSshBypassBlocked != null;

  if (!hasAnySignal) {
    const observedFacts = {
      mfaEnforcedPrivileged: null,
      phishingResistant: null,
      staticSshKeysInUse: null,
      upstreamBastionMfaEnforced: null,
      idpFederationPhishingResistant: null,
      ephemeralSshCertificates: null,
      directSshBypassBlocked: null,
    };
    return {
      ruleId,
      ruleVersion,
      controlId: "IA-2",
      controlTitle: "Identification and Authentication (Organizational Users)",
      baseline,
      verdict: "INSUFFICIENT_EVIDENCE",
      assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
      formalEvidenceStatus: "PENDING_VERIFIED_EVIDENCE",
      formalDetermination: "INSUFFICIENT_EVIDENCE",
      summary:
        "INSUFFICIENT_EVIDENCE: Missing IdP MFA policy export, upstream bastion/jump-host configuration, and sshd_config evidence to evaluate end-to-end privileged authentication.",
      observedFacts,
      threshold: "Phishing-resistant MFA adhering to NIST SP 800-63B (IA-2 / IA-2(1)) and separate FIPS-validated/NSA-approved cryptographic device (IA-2(6))",
      variance: "Missing authentication path telemetry",
      missingEvidence: [
        "End-to-end authentication architecture diagram (client -> IdP/bastion -> target host)",
        "IdP authentication policy enforcing FIDO2/PIV phishing-resistant MFA (IA-2 / IA-2(1) / IA-2(6))",
        "sshd_config, AuthorizedKeysCommand / SSH CA config, and security-group rules proving zero direct SSH bypass",
      ],
      authorityCitations,
      poamAuthorityNote,
      authPathAssessment: {
        evaluatedPath: "Unverified (missing bastion, IdP, and target host authentication telemetry)",
        upstreamMfaConsidered: true,
        sameDomainGuidanceApplies: false,
        directBypassRisk: true,
        architecturalVerificationRequired: [
          "Verify whether an upstream bastion, SSM, or Identity-Aware Proxy enforces phishing-resistant MFA prior to SSH session establishment",
          "Verify direct port-22 SSH access bypassing bastion/IdP is blocked at firewall/SG level",
        ],
      },
      evaluatedAt,
      auditHash: buildAuditHash(ruleId, ruleVersion, "INSUFFICIENT_EVIDENCE", observedFacts),
    };
  }

  const upstreamProtected =
    input.upstreamBastionMfaEnforced === true || input.idpFederationPhishingResistant === true;
  const controlledSameDomainKeys =
    input.staticSshKeysInUse === true &&
    upstreamProtected &&
    input.directSshBypassBlocked === true &&
    input.phishingResistant !== false;
  const nonCompliantMfa =
    (input.mfaEnforcedPrivileged === false || input.phishingResistant === false) && !upstreamProtected;
  const unprotectedStaticKeys = input.staticSshKeysInUse === true && !upstreamProtected;
  const failed = nonCompliantMfa || unprotectedStaticKeys;

  const verdict: RmfVerdict = failed
    ? "FAIL"
    : controlledSameDomainKeys || (upstreamProtected && input.directSshBypassBlocked == null)
    ? "MANUAL_REVIEW_REQUIRED"
    : input.ephemeralSshCertificates === true &&
      input.staticSshKeysInUse !== true &&
      (input.phishingResistant === true || upstreamProtected)
    ? "PASS"
    : "MANUAL_REVIEW_REQUIRED";

  // Never fabricate `true` for omitted boolean fields: preserve explicit `null` when unknown.
  const observedFacts: Record<string, string | number | boolean | null> = {
    mfaEnforcedPrivileged: input.mfaEnforcedPrivileged ?? null,
    phishingResistant: input.phishingResistant ?? null,
    staticSshKeysInUse: input.staticSshKeysInUse ?? null,
    upstreamBastionMfaEnforced: input.upstreamBastionMfaEnforced ?? null,
    idpFederationPhishingResistant: input.idpFederationPhishingResistant ?? null,
    ephemeralSshCertificates: input.ephemeralSshCertificates ?? null,
    directSshBypassBlocked: input.directSshBypassBlocked ?? null,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    evidenceVerified: Boolean(input.evidenceVerified),
  };

  const authPathAssessment: Ia2AuthPathAssessment = {
    evaluatedPath: upstreamProtected
      ? "Client -> Phishing-Resistant IdP / Bastion -> Target Host (same-domain component hop)"
      : "Direct / Unverified Privileged SSH Path (no verified upstream bastion or IdP phishing-resistant MFA)",
    upstreamMfaConsidered: true,
    sameDomainGuidanceApplies: upstreamProtected,
    directBypassRisk: input.directSshBypassBlocked !== true,
    architecturalVerificationRequired: [
      "Confirm whether phishing-resistant MFA (PIV/CAC/FIDO2 per SP 800-63B & IA-2(1)/(6)) is enforced at an upstream bastion, Teleport/Boundary proxy, SSM, or federated IdP",
      "Per FedRAMP IA-2(1) guidance (ia-2.1_fr_gdn.1), re-prompting MFA on subsequent hosts in the same user domain is unnecessary ONLY if direct host SSH bypassing domain entry is blocked and key/certificate lifecycle is governed (IA-5)",
      "Verify cryptographic module compliance under IA-2(6) (ia-02.06_odp.03: FIPS-validated or NSA-approved cryptography)",
    ],
  };

  const scenarioPrefix = isScenarioMode ? "SCENARIO " : "";
  const formalSuffix = isScenarioMode
    ? " Formal assessor determination remains PENDING_VERIFIED_EVIDENCE until full authentication-path architecture, IdP policy, bastion configs, and sshd_config are examined and tested."
    : "";

  let summary = "";
  if (verdict === "FAIL") {
    summary =
      `${scenarioPrefix}FAIL: Under the stipulated facts, privileged administrators rely on static SSH keys ` +
      `${input.phishingResistant === false || input.mfaEnforcedPrivileged === false ? "without phishing-resistant hardware MFA" : "without verified upstream bastion/IdP MFA"}. ` +
      `A static SSH key is NOT automatically equivalent to compliant FedRAMP High MFA (IA-2(1) requires phishing-resistant MFA per SP 800-63B; IA-2(6) ia-02.06_odp.03 requires a separate FIPS-validated/NSA-approved cryptographic device), unless an upstream bastion/IdP enforces phishing-resistant MFA before session entry (ia-2.1_fr_gdn.1) and blocks direct SSH bypass.${formalSuffix}`;
  } else if (verdict === "MANUAL_REVIEW_REQUIRED") {
    summary =
      `MANUAL_REVIEW_REQUIRED: Static SSH keys are paired with an upstream bastion/IdP MFA path (FedRAMP IA-2(1) guidance ia-2.1_fr_gdn.1 exempts re-prompting MFA on subsequent same-domain components). ` +
      `Full path inspection is still required to verify zero direct SSH bypass, SP 800-63B phishing-resistance, and IA-2(6) FIPS/NSA-approved device cryptography / IA-5 key rotation.${formalSuffix}`;
  } else {
    summary = `${scenarioPrefix}PASS: Phishing-resistant hardware MFA and short-lived ephemeral SSH certificates are enforced end-to-end without static SSH bypasses.${formalSuffix}`;
  }

  const missingEvidence =
    isScenarioMode || verdict !== "PASS"
      ? [
          "End-to-end authentication architecture diagram tracing client -> IdP/bastion -> target host",
          "IdP authentication policy export proving SP 800-63B phishing-resistant MFA (PIV/FIDO2)",
          "Target host sshd_config & network ACL/SG rules proving direct static-key SSH bypass is blocked",
        ]
      : [];

  return {
    ruleId,
    ruleVersion,
    controlId: "IA-2",
    controlTitle: "Identification and Authentication (Organizational Users)",
    baseline,
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalEvidenceStatus: input.evidenceVerified ? "VERIFIED_ARTIFACTS_PROVIDED" : "PENDING_VERIFIED_EVIDENCE",
    formalDetermination: isScenarioMode ? "PENDING_EVIDENCE" : verdict,
    summary,
    observedFacts,
    threshold: "End-to-end privileged access requires SP 800-63B phishing-resistant MFA (IA-2 / IA-2(1)) and separate FIPS-validated/NSA-approved cryptographic device (IA-2(6)), considering upstream bastion/IdP enforcement per ia-2.1_fr_gdn.1",
    variance:
      verdict === "FAIL"
        ? "Direct static SSH key access without hardware/phishing-resistant MFA or verified upstream bastion/IdP gate"
        : verdict === "MANUAL_REVIEW_REQUIRED"
        ? "Requires architectural verification of same-domain hop & zero direct bypass"
        : "0 violations",
    missingEvidence,
    authorityCitations,
    poamAuthorityNote,
    authPathAssessment,
    manualReviewReason: verdict === "MANUAL_REVIEW_REQUIRED" ? authPathAssessment.architecturalVerificationRequired.join("; ") : undefined,
    ...(verdict === "FAIL"
      ? {
          draftFinding: {
            title: "Privileged SSH access lacks verified end-to-end phishing-resistant MFA (IA-2 / IA-2(1) / IA-2(6))",
            controlId: "IA-2",
            objectiveId: "IA-02(01)[01]",
            severity: "HIGH",
            rootCause: "Static SSH keys permitted without hardware phishing-resistant MFA or verified upstream bastion/IdP phishing-resistant gate blocking direct SSH.",
            impactSummary: "Static key compromise allows single-factor privileged access if upstream phishing-resistant MFA and direct-bypass blocking are absent.",
          },
          draftPoam: {
            poamId: "POAM-IA2-MFA-001",
            controlId: "IA-2",
            weaknessName: "Enforce end-to-end phishing-resistant MFA across privileged SSH authentication path",
            severity: "HIGH",
            slaDays: defaultSlaForSeverity("HIGH"),
            remediationPlan:
              "1) Inspect end-to-end SSH auth path (IdP -> bastion/PAM -> target hosts); 2) Enforce FIDO2/PIV phishing-resistant MFA at IdP/bastion entry issuing short-lived SSH certificates or session tokens and block direct port-22 SSH using static keys; 3) Confirm FIPS-validated / NSA-approved cryptography per IA-2(6).",
            requiredTechnicalProof: "End-to-end auth architecture diagram, IdP FIDO2/PIV policy export, sshd_config / bastion config, and negative test rejecting direct static SSH.",
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
            rootCause: "Scanner cadence slipped beyond 30 days or open POA&M remediation exceeded FedRAMP RA-5(d) ODP / ConMon remediation window.",
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

export function extractAc2ElapsedHours(q: string): number | null {
  const patterns: RegExp[] = [
    /(?:remained\s+(?:active|enabled|open|provisioned)|stayed\s+(?:active|enabled|open)|(?:kept|left)\s+(?:active|enabled|open)|not\s+(?:disabled|removed|deprovisioned|revoked))\s*(?:for|over|after)?\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|days?|d\b)/i,
    /(?:elapsed(?:\s+time)?|deprovision(?:ed|ing)\s+took|disabled\s+after|removed\s+after|revoked\s+after|delayed(?:\s+by)?|lag(?:ged)?(?:\s+by)?|took)\s*(?:time\s*[:=]?\s*)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|days?|d\b)/i,
    /(?:account|access)\s+(?:was\s+)?(?:still\s+)?(?:active|enabled|open)\s+for\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|days?|d\b)/i,
  ];
  for (const re of patterns) {
    const m = q.match(re);
    if (m) {
      const val = Number(m[1]);
      return /^d/i.test(m[2]) ? val * 24 : val;
    }
  }
  return null;
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

  const evidenceVerified = /\b(?:verified\s+(?:audit\s+)?evidence|attached\s+(?:audit\s+)?artifacts?|immutable\s+(?:hr|idp|audit)\s+logs?\s+(?:attached|verified)|sha-?256\s*[:=])/i.test(q);
  const assessmentMode: RmfAssessmentMode = evidenceVerified ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION";

  const hasEvalIntent =
    /\b(evaluat\w*|assess\w*|check|verif\w*|compliant|compliance|verdict|audit|pass|fail|gap|poa&m|poam|disabled|terminated|termination|missing\s+evidence|no\s+evidence|remained\s+active|without\s+(?:hardware|phishing-resistant)?\s*mfa)\b/i.test(
      q,
    );

  // AC-2 / Termination or inactivity timestamps
  if (/\bAC-2(?:\(\d+\))?\b|\bterminat\w*(?:\s+\w+){0,2}\s+account|\bdisabled\s+(?:within|at|after)|\binactive\s+accounts?\b/i.test(q)) {
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
      elapsedHours = extractAc2ElapsedHours(q);
    }

    const inactiveDaysMatch = q.match(/inactive\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*days?/i);
    if (
      elapsedHours != null ||
      inactiveDaysMatch ||
      /\bterminat\w*/i.test(q) ||
      (/\bAC-2(?:\(\d+\))?\b/i.test(q) && hasEvalIntent)
    ) {
      results.push(
        evaluateAc2AccountManagementRule({
          baseline,
          policyThresholdHours,
          elapsedHours,
          terminationTimestampLabel: startTime?.label ?? null,
          disablementTimestampLabel: endTime?.label ?? null,
          inactiveAccountDays: inactiveDaysMatch ? Number(inactiveDaysMatch[1]) : null,
          assessmentMode,
          evidenceVerified,
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

  // IA-2 (End-to-end privileged MFA, phishing resistance, SSH bastion / IdP path)
  if (
    /\bIA-2(?:\(\d+\))?\b/i.test(q) &&
    (hasEvalIntent ||
      /\b(?:static\s+(?:[\w-]+\s+){0,2}(?:ssh\s+)?keys?|(?:without|no|lacks?|missing)\s+(?:[\w-]+\s+){0,3}mfa|bastion|ephemeral\s+(?:ssh\s+)?cert|phishing[- ]resistant)\b/i.test(
        q,
      ))
  ) {
    const staticKey = /\bstatic\s+(?:[\w-]+\s+){0,2}(?:ssh\s+)?keys?\b/i.test(q)
      ? true
      : /\b(?:zero|no)\s+static\s+(?:[\w-]+\s+){0,2}(?:ssh\s+)?keys?\b/i.test(q)
      ? false
      : null;

    const mfaNegated = /\b(?:without|no|lacks?|missing|not\s+enforcing|not\s+using|bypass(?:ing|es)?)\s+(?:[\w-]+\s+){0,3}(?:mfa|multi[- ]factor|2fa)\b/i.test(
      q,
    );
    const phishingResistantNegated = /\b(?:without|no|lacks?|missing|not\s+(?:using|enforcing))\s+(?:[\w-]+\s+){0,2}(?:hardware[- ]?(?:backed|token)?|phishing[- ]resistant|fido2|piv|webauthn)\b/i.test(
      q,
    );

    const noMfa = mfaNegated
      ? false
      : /\b(?:enforces?|requires?|using)\s+(?:[\w-]+\s+){0,2}(?:phishing[- ]resistant|hardware|fido2|piv)\s+(?:mfa|multi[- ]factor)\b/i.test(q)
      ? true
      : null;

    const phishingResistant =
      mfaNegated || phishingResistantNegated
        ? false
        : /\b(?:phishing[- ]resistant|fido2|webauthn|piv|cac|hardware[- ]backed\s+mfa|hardware[- ]token\s+mfa)\b/i.test(q)
        ? true
        : null;

    const upstreamBastionMfaEnforced = /\bbastion\b[^.\n]{0,70}\b(?:enforces?|requires?|with)\s+(?:[\w-]+\s+){0,2}(?:phishing[- ]resistant|hardware|fido2|piv)?\s*mfa\b|\bmfa\s+(?:enforced|required)\s+(?:at|on)\s+(?:the\s+)?bastion\b/i.test(
      q,
    )
      ? true
      : /\bbastion\b[^.\n]{0,40}\b(?:without|no)\s+mfa\b/i.test(q)
      ? false
      : null;

    const idpFederationPhishingResistant = /\b(?:idp|identity\s+provider|sso|okta|entra)\b[^.\n]{0,70}\b(?:enforces?|requires?|with)\s+(?:[\w-]+\s+){0,2}(?:phishing[- ]resistant|hardware|fido2|piv)\b/i.test(
      q,
    )
      ? true
      : null;

    const ephemeralSshCertificates = /\b(?:ephemeral|short[- ]lived)\s+(?:ssh\s+)?cert(?:ificate)?s?\b|\bssh\s+ca\b/i.test(q)
      ? true
      : null;

    const directSshBypassBlocked = /\bdirect\s+ssh\s+(?:is\s+)?(?:blocked|disabled|prohibited|denied)\b|\bno\s+direct\s+ssh\b/i.test(q)
      ? true
      : /\bdirect\s+ssh\s+(?:is\s+)?(?:allowed|permitted|enabled|exposed)\b/i.test(q)
      ? false
      : null;

    if (
      staticKey != null ||
      noMfa != null ||
      phishingResistant != null ||
      upstreamBastionMfaEnforced != null ||
      idpFederationPhishingResistant != null ||
      ephemeralSshCertificates != null ||
      hasEvalIntent
    ) {
      results.push(
        evaluateIa2AuthRule({
          baseline,
          mfaEnforcedPrivileged: noMfa,
          phishingResistant,
          staticSshKeysInUse: staticKey,
          upstreamBastionMfaEnforced,
          idpFederationPhishingResistant,
          ephemeralSshCertificates,
          directSshBypassBlocked,
          assessmentMode,
          evidenceVerified,
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

  const seenRules = new Set(results.map((r) => r.ruleId));
  for (const ext of extractAndEvaluateExtendedRmfRulesFromText(q)) {
    if (!seenRules.has(ext.ruleId)) {
      seenRules.add(ext.ruleId);
      results.push(ext);
    }
  }

  return results;
}
