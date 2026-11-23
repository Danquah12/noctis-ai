/**
 * Noctis Defense & Intelligence Community (NDIMP Wave 1 — Step 3)
 * DoD Zero Trust (7-Pillar Strategy + CISA ZTMM v2.0 + NSM-8)
 * & DoD/IC ICAM (DoDI 8520.02 / 8520.03, CAC/PIV/PKI/OCSP/CRL, ALT Tokens, PAM/JIT, ABAC/IC-PE)
 *
 * Implements:
 *  - DOD-ZT-7PILLAR-001: DoD CIO Zero Trust Strategy (Nov 2022) 7-Pillar / Target FY 2027 readiness + CISA ZTMM v2.0 crosswalk
 *  - DOD-ICAM-PKI-001: DoDI 8520.02 (May 18, 2023) & DoDI 8520.03 (May 19, 2023) end-to-end authentication, ALT token & OCSP/CRL fail-closed validation
 *  - DOD-ICAM-PAM-ABAC-001: Zero Trust PAM/JIT, ABAC / IC-PE clearance-attribute access control & east-west NPE mTLS microsegmentation
 *
 * Non-negotiable invariants:
 *  - DoD Zero Trust (`7` Pillars, `45` Capabilities, `91` Target FY 2027 / `61` Advanced / `152` Total Activities) is never conflated with CISA ZTMM v2.0's 5-pillar civilian baseline.
 *  - Disabling OCSP/CRL checks or configuring soft-fail / fail-open revocation violates DoDI 8520.02.
 *  - SMS/OTP, email codes, passwords, and unassisted static SSH keys violate DoDI 8520.03 phishing-resistant hardware MFA.
 *  - Noctis never issues ATOs or accepts residual Zero Trust / ICAM risk (`aiCanIssueAto: false`).
 */

import { evaluateZeroTrustMaturity, type ZeroTrustResult, type ZtPillarScore } from "../rmf-v2/cyber-intelligence.ts";
import { sha256Sync } from "../universal-crypto.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY } from "./policy-registry.ts";
import { listCcisForNistControl } from "./stig-acas-engine.ts";

// ----------------------------------------------------------------------------
// 1. Authoritative DoD 7-Pillar Zero Trust Catalog (Nov 2022 Strategy)
// ----------------------------------------------------------------------------

export interface DodZeroTrustPillarDef {
  id:
    | "USER"
    | "DEVICE"
    | "NETWORK_AND_ENVIRONMENT"
    | "APPLICATIONS_AND_WORKLOADS"
    | "DATA"
    | "VISIBILITY_AND_ANALYTICS"
    | "AUTOMATION_AND_ORCHESTRATION";
  name: string;
  focus: string;
  keyNistControls: string[];
  cisaZtmmCounterpart: string;
}

export const DOD_ZT_7_PILLAR_CATALOG: {
  summary: {
    pillarsCount: 7;
    capabilitiesCount: 45;
    targetActivities: 91;
    advancedActivities: 61;
    totalActivities: 152;
    targetDeadline: "FY 2027";
    advancedTargetDeadline: "FY 2032";
    sourceDocument: string;
    effectiveDate: "2022-11-22";
  };
  pillars: DodZeroTrustPillarDef[];
} = {
  summary: {
    pillarsCount: 7,
    capabilitiesCount: 45,
    targetActivities: 91,
    advancedActivities: 61,
    totalActivities: 152,
    targetDeadline: "FY 2027",
    advancedTargetDeadline: "FY 2032",
    sourceDocument: "DoD Zero Trust Strategy & Capability Execution Roadmap (DoD CIO, Nov 2022)",
    effectiveDate: "2022-11-22",
  },
  pillars: [
    {
      id: "USER",
      name: "User",
      focus: "Continuous person & non-person entity (NPE) authentication, phishing-resistant MFA (CAC/PIV/ALT/FIDO2), PAM/JIT, and ABAC least privilege.",
      keyNistControls: ["IA-2(1)", "IA-2(6)", "IA-5(2)", "AC-2", "AC-6(2)"],
      cisaZtmmCounterpart: "Identity (Pillar)",
    },
    {
      id: "DEVICE",
      name: "Device",
      focus: "Real-time hardware inventory, Comply-to-Connect (C2C) posture assessment, NPE device identity, and Endpoint Detection & Response (EDR).",
      keyNistControls: ["CM-8", "SI-4", "CM-6", "AC-19", "SC-7"],
      cisaZtmmCounterpart: "Devices (Pillar)",
    },
    {
      id: "NETWORK_AND_ENVIRONMENT",
      name: "Network and Environment",
      focus: "Microsegmentation, software-defined perimeters (PDP/PEP), encryption in transit (FIPS 140 mTLS), and macro/micro traffic isolation.",
      keyNistControls: ["SC-7", "SC-7(5)", "SC-8", "AC-4"],
      cisaZtmmCounterpart: "Networks (Pillar)",
    },
    {
      id: "APPLICATIONS_AND_WORKLOADS",
      name: "Applications and Workloads",
      focus: "Secure DevSecOps software lifecycle, immutable containers, API gateway enforcement, and workload-to-workload authentication.",
      keyNistControls: ["SA-11", "AC-3", "IA-5", "SI-2", "CM-7"],
      cisaZtmmCounterpart: "Applications & Workloads (Pillar)",
    },
    {
      id: "DATA",
      name: "Data",
      focus: "Data discovery, classification/labeling (CUI, SECRET, SCI), enterprise DRM/ABAC enforcement, DLP, and encryption at rest.",
      keyNistControls: ["SC-28", "SC-13", "MP-6", "AC-16", "AU-9"],
      cisaZtmmCounterpart: "Data (Pillar)",
    },
    {
      id: "VISIBILITY_AND_ANALYTICS",
      name: "Visibility and Analytics",
      focus: "Enterprise log aggregation across all planes, SIEM telemetry correlation, UEBA anomaly detection, and CSSP/ICD 502 situational awareness.",
      keyNistControls: ["AU-2", "AU-6", "AU-12", "SI-4", "CA-7"],
      cisaZtmmCounterpart: "Visibility & Analytics (Cross-Cutting Capability)",
    },
    {
      id: "AUTOMATION_AND_ORCHESTRATION",
      name: "Automation and Orchestration",
      focus: "Automated Policy Decision Points (PDP), SOAR containment playbooks, continuous authorization enforcement, and XDR orchestration.",
      keyNistControls: ["IR-4", "CA-7", "AC-3", "SI-7"],
      cisaZtmmCounterpart: "Automation & Orchestration (Cross-Cutting Capability)",
    },
  ],
};

export function getDodZeroTrustCatalog() {
  return DOD_ZT_7_PILLAR_CATALOG;
}

// ----------------------------------------------------------------------------
// 2. DoD 7-Pillar Zero Trust Readiness Evaluator (DOD-ZT-7PILLAR-001)
// ----------------------------------------------------------------------------

export interface DodZeroTrustAssessmentInput {
  systemName?: string;
  isNationalSecuritySystem?: boolean;
  userScore?: ZtPillarScore | null;
  deviceScore?: ZtPillarScore | null;
  networkScore?: ZtPillarScore | null;
  applicationsScore?: ZtPillarScore | null;
  dataScore?: ZtPillarScore | null;
  visibilityScore?: ZtPillarScore | null;
  automationScore?: ZtPillarScore | null;
  phishingResistantMfaEnforced?: boolean | null;
  devicePostureAndEdrVerified?: boolean | null;
  microsegmentationAndMtlsEnforced?: boolean | null;
  dataTaggingAndEncryptionEnforced?: boolean | null;
  continuousPdpPepEnforced?: boolean | null;
  centralizedSiemsAndSoarActive?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}

export interface DodZeroTrustAssessmentResult {
  systemName: string;
  framework: "DoD Zero Trust Strategy (7 Pillars / FY 2027 Target) + CISA ZTMM v2.0 Crosswalk";
  isNationalSecuritySystem: boolean;
  pillarRatings: {
    pillar: DodZeroTrustPillarDef["name"];
    score: ZtPillarScore | null;
    stage: "Traditional" | "Initial" | "Advanced" | "Optimal" | "UNASSESSED";
    cisaZtmmCounterpart: string;
  }[];
  averageSuppliedScore: number | null;
  targetReadinessPercent: number | null;
  fy2027Status: "NOT_READY" | "PARTIAL_TARGET" | "TARGET_READY" | "ADVANCED_READY" | "INSUFFICIENT_EVIDENCE";
  cisaZtmmCrosswalk: ZeroTrustResult | null;
  ruleResult: DodIcRuleResult;
  auditHash: string;
}

function ztStageLabel(score: ZtPillarScore | null): "Traditional" | "Initial" | "Advanced" | "Optimal" | "UNASSESSED" {
  if (score === null) return "UNASSESSED";
  if (score >= 4) return "Optimal";
  if (score === 3) return "Advanced";
  if (score === 2) return "Initial";
  return "Traditional";
}

function clampZtScore(val: unknown): ZtPillarScore | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  if (n >= 4) return 4;
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  if (n >= 1) return 1;
  return null;
}

export function evaluateDodZeroTrust7Pillar(input: DodZeroTrustAssessmentInput): DodZeroTrustAssessmentResult {
  const ruleId = "DOD-ZT-7PILLAR-001";
  const ruleVersion = "2022.11.22";
  const systemName = (input.systemName || "DoD Mission Enclave").trim();
  const isNss = Boolean(input.isNationalSecuritySystem);
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;

  const scores: Record<DodZeroTrustPillarDef["id"], ZtPillarScore | null> = {
    USER: clampZtScore(input.userScore),
    DEVICE: clampZtScore(input.deviceScore),
    NETWORK_AND_ENVIRONMENT: clampZtScore(input.networkScore),
    APPLICATIONS_AND_WORKLOADS: clampZtScore(input.applicationsScore),
    DATA: clampZtScore(input.dataScore),
    VISIBILITY_AND_ANALYTICS: clampZtScore(input.visibilityScore),
    AUTOMATION_AND_ORCHESTRATION: clampZtScore(input.automationScore),
  };

  const pillarRatings = DOD_ZT_7_PILLAR_CATALOG.pillars.map((def) => {
    const score = scores[def.id];
    return {
      pillar: def.name,
      score,
      stage: ztStageLabel(score),
      cisaZtmmCounterpart: def.cisaZtmmCounterpart,
    };
  });

  const suppliedScores = Object.values(scores).filter((s): s is ZtPillarScore => s !== null);
  const averageSuppliedScore =
    suppliedScores.length > 0
      ? Number((suppliedScores.reduce((acc, s) => acc + s, 0) / suppliedScores.length).toFixed(2))
      : null;

  const gateChecks: { label: string; value: boolean | null | undefined; controlHint: string }[] = [
    { label: "Phishing-resistant hardware MFA (CAC/PIV/ALT/FIDO2)", value: input.phishingResistantMfaEnforced, controlHint: "User / IA-2(1)" },
    { label: "Device posture / Comply-to-Connect & EDR verified", value: input.devicePostureAndEdrVerified, controlHint: "Device / CM-8 & SI-4" },
    { label: "Network microsegmentation & mTLS (no implicit east-west trust)", value: input.microsegmentationAndMtlsEnforced, controlHint: "Network / SC-7" },
    { label: "Data tagging/labeling & encryption at rest/in transit", value: input.dataTaggingAndEncryptionEnforced, controlHint: "Data / SC-28 & AC-16" },
    { label: "Continuous Policy Decision Point (PDP) / PEP enforcement", value: input.continuousPdpPepEnforced, controlHint: "Automation / AC-3" },
    { label: "Centralized SIEM logging & SOAR visibility across planes", value: input.centralizedSiemsAndSoarActive, controlHint: "Visibility / AU-6 & CA-7" },
  ];

  const blockers: string[] = [];
  for (const g of gateChecks) {
    if (g.value === false) {
      blockers.push(`Missing Target FY 2027 capability: ${g.label} (${g.controlHint})`);
    }
  }
  for (const pr of pillarRatings) {
    if (pr.score !== null && pr.score < 2) {
      blockers.push(`${pr.pillar} pillar is at Traditional stage (${pr.score}/4) — below DoD FY 2027 Target threshold`);
    }
  }
  if (averageSuppliedScore !== null && averageSuppliedScore < 2.5) {
    blockers.push(`Overall DoD ZT pillar average (${averageSuppliedScore}/4) falls short of Target FY 2027 baseline (>= 3.0)`);
  }

  const anyCore5 =
    scores.USER !== null ||
    scores.DEVICE !== null ||
    scores.NETWORK_AND_ENVIRONMENT !== null ||
    scores.APPLICATIONS_AND_WORKLOADS !== null ||
    scores.DATA !== null;
  const cisaZtmmCrosswalk: ZeroTrustResult | null = anyCore5
    ? evaluateZeroTrustMaturity({
        identityScore: scores.USER ?? 1,
        devicesScore: scores.DEVICE ?? 1,
        networksScore: scores.NETWORK_AND_ENVIRONMENT ?? 1,
        applicationsScore: scores.APPLICATIONS_AND_WORKLOADS ?? 1,
        dataScore: scores.DATA ?? 1,
      })
    : null;

  const explicitGates = gateChecks.filter((g) => g.value !== null && g.value !== undefined);
  const passedGates = explicitGates.filter((g) => g.value === true).length;
  const totalSignals = suppliedScores.length + explicitGates.length;

  let targetReadinessPercent: number | null = null;
  if (totalSignals > 0) {
    const scorePct = suppliedScores.length > 0 ? ((averageSuppliedScore! - 1) / 2) * 100 : null;
    const gatePct = explicitGates.length > 0 ? (passedGates / explicitGates.length) * 100 : null;
    const blended =
      scorePct !== null && gatePct !== null ? scorePct * 0.5 + gatePct * 0.5 : scorePct ?? gatePct ?? 0;
    targetReadinessPercent = Math.min(100, Math.max(0, Math.round(blended)));
  }

  const hasAnySignal = totalSignals > 0;
  const hasNullGatesOrPillars = explicitGates.length < gateChecks.length || suppliedScores.length < 7;

  const verdict: DodVerdict = !hasAnySignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? "FAIL"
    : hasNullGatesOrPillars
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";

  const fy2027Status: DodZeroTrustAssessmentResult["fy2027Status"] = !hasAnySignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? (targetReadinessPercent ?? 0) >= 50
      ? "PARTIAL_TARGET"
      : "NOT_READY"
    : averageSuppliedScore !== null && averageSuppliedScore >= 3.6 && blockers.length === 0
    ? "ADVANCED_READY"
    : verdict === "PASS"
    ? "TARGET_READY"
    : "PARTIAL_TARGET";

  const formalDetermination: DodVerdict | "PENDING_EVIDENCE" =
    verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE"
      : input.evidenceVerified === true && !hasNullGatesOrPillars
      ? verdict
      : "PENDING_EVIDENCE";

  const observedFacts: Record<string, string | number | boolean | null> = {
    systemName,
    isNationalSecuritySystem: isNss,
    pillarsEvaluated: suppliedScores.length,
    averageSuppliedScore,
    gatesEvaluated: explicitGates.length,
    gatesPassed: passedGates,
    targetReadinessPercent,
    fy2027Status,
    phishingResistantMfaEnforced: input.phishingResistantMfaEnforced ?? null,
    devicePostureAndEdrVerified: input.devicePostureAndEdrVerified ?? null,
    microsegmentationAndMtlsEnforced: input.microsegmentationAndMtlsEnforced ?? null,
    dataTaggingAndEncryptionEnforced: input.dataTaggingAndEncryptionEnforced ?? null,
    continuousPdpPepEnforced: input.continuousPdpPepEnforced ?? null,
    centralizedSiemsAndSoarActive: input.centralizedSiemsAndSoarActive ?? null,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId,
    ruleVersion,
    jurisdiction: "DOD",
    title: "DoD 7-Pillar Zero Trust FY 2027 Target Readiness & CISA ZTMM Crosswalk",
    verdict,
    assessmentMode: isScenario ? "SCENARIO_ASSUMPTION" : "FORMAL_EVIDENCE_AUDIT",
    formalDetermination,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: ${systemName} does NOT meet DoD Zero Trust Target FY 2027 readiness (${targetReadinessPercent ?? 0}%): ${blockers.join("; ")}.`
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: Supply 7-pillar maturity scores (1-4) or Zero Trust Target architectural gate signals."
        : verdict === "MANUAL_REVIEW_REQUIRED"
        ? `MANUAL_REVIEW_REQUIRED: Supplied Zero Trust controls passed (${targetReadinessPercent}%), but unassessed DoD pillars/gates require verified Component ZT PMO evidence.`
        : `${isScenario ? "SCENARIO PASS" : "PASS"}: All 7 DoD Zero Trust pillars and Target FY 2027 gates satisfied (${targetReadinessPercent}%).`,
    observedFacts,
    threshold: "Achieve all 91 DoD Zero Trust Target Level activities across 7 Pillars & 45 Capabilities by FY 2027 (crosswalked to CISA ZTMM v2.0 & NSM-8).",
    variance: blockers.join(" | ") || `Target Readiness=${targetReadinessPercent ?? "N/A"}% (${fy2027Status})`,
    missingEvidence: [
      "DoD CIO / Component Zero Trust Execution Roadmap artifact tracking all 91 Target FY 2027 activities",
      "Verified PDP/PEP enforcement configuration, microsegmentation topology, and SIEM/SOAR telemetry screenshots",
      ...(isNss ? ["NSM-8 National Manager / CNSS compliance verification for National Security System encryption & MFA"] : []),
    ],
    authorityCitations: [
      DOD_IC_POLICY_REGISTRY["DOD-ZT-STRATEGY-2022"]!,
      DOD_IC_POLICY_REGISTRY["CISA-ZTMM-2.0-OMB-M22-09"]!,
      ...(isNss ? [DOD_IC_POLICY_REGISTRY["NSM-8"]!] : []),
    ],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, observedFacts, verdict })),
  };

  return {
    systemName,
    framework: "DoD Zero Trust Strategy (7 Pillars / FY 2027 Target) + CISA ZTMM v2.0 Crosswalk",
    isNationalSecuritySystem: isNss,
    pillarRatings,
    averageSuppliedScore,
    targetReadinessPercent,
    fy2027Status,
    cisaZtmmCrosswalk,
    ruleResult,
    auditHash: sha256Sync(JSON.stringify({ ruleId, pillarRatings, blockers, verdict })),
  };
}

// ----------------------------------------------------------------------------
// 3. DoD / IC ICAM, PKI, CAC / PIV / ALT Token & OCSP/CRL Validator (DOD-ICAM-PKI-001)
// ----------------------------------------------------------------------------

export type DodCredentialType =
  | "CAC"
  | "PIV"
  | "DOD_PKI_ALT_TOKEN"
  | "FIDO2_HARDWARE"
  | "NPE_CERT"
  | "STATIC_SSH_KEY"
  | "SMS_OTP"
  | "PASSWORD_ONLY";

export interface DodIcamPkiResult {
  credentialType: DodCredentialType | null;
  isPrivilegedAccount: boolean;
  phishingResistant: boolean | null;
  revocationFailClosedEnforced: boolean | null;
  resolvedDisaCcis: { controlId: string; cciId: string; definition: string }[];
  ruleResult: DodIcRuleResult;
}

export function evaluateDodIcamPkiAuthentication(input: {
  credentialType?: DodCredentialType | null;
  isPrivilegedAccount?: boolean;
  separatePrivilegedAccountAndAltToken?: boolean | null;
  ocspOrCrlRevocationChecked?: boolean | null;
  revocationFailClosed?: boolean | null;
  dodRootCaChainVerified?: boolean | null;
  fips140ValidatedCrypto?: boolean | null;
  upstreamBastionEnforcesHardwareMfa?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DodIcamPkiResult {
  const ruleId = "DOD-ICAM-PKI-001";
  const ruleVersion = "2023.05.19";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const isPriv = input.isPrivilegedAccount === true;
  const cred = input.credentialType ?? null;

  const isHardwareCredential =
    cred === "CAC" || cred === "PIV" || cred === "DOD_PKI_ALT_TOKEN" || cred === "FIDO2_HARDWARE" || cred === "NPE_CERT";
  const phishingResistant =
    cred === null
      ? null
      : isHardwareCredential
      ? true
      : cred === "STATIC_SSH_KEY"
      ? input.upstreamBastionEnforcesHardwareMfa === true
      : false;

  const blockers: string[] = [];
  if (cred === "PASSWORD_ONLY" || cred === "SMS_OTP") {
    blockers.push(
      `Credential type ${cred} is NOT phishing-resistant hardware MFA — violates DoDI 8520.03 (2023-05-19), FIPS 201-3, and NSM-8`,
    );
  }
  if (cred === "STATIC_SSH_KEY" && input.upstreamBastionEnforcesHardwareMfa !== true) {
    blockers.push(
      "Static SSH keys without verified upstream hardware-MFA bastion fail DoDI 8520.03 & NIST SP 800-53 IA-2(1)",
    );
  }
  if (isPriv && input.separatePrivilegedAccountAndAltToken === false) {
    blockers.push(
      "Privileged administrator reuses standard daily user CAC without a separate privileged account bound to an ALT token (violates DoDI 8520.03 & AC-6(2))",
    );
  }
  if (input.ocspOrCrlRevocationChecked === false) {
    blockers.push("Real-time PKI OCSP/CRL revocation checking is disabled (violates DoDI 8520.02 & IA-5(2))");
  }
  if (input.revocationFailClosed === false) {
    blockers.push(
      "OCSP/CRL revocation is configured fail-open (soft-fail), permitting revoked/compromised certificates when responders are unreachable (violates DoDI 8520.02)",
    );
  }
  if (input.dodRootCaChainVerified === false) {
    blockers.push("Certificate trust path is not anchored to authorized DoD Root CA / Federal PKI trust anchors (DoDI 8520.02)");
  }
  if (input.fips140ValidatedCrypto === false) {
    blockers.push("Cryptographic authentication modules lack FIPS 140 validation (violates DoDI 8520.02 & SC-13)");
  }

  const hasSignal =
    cred !== null ||
    input.separatePrivilegedAccountAndAltToken != null ||
    input.ocspOrCrlRevocationChecked != null ||
    input.revocationFailClosed != null ||
    input.dodRootCaChainVerified != null ||
    input.fips140ValidatedCrypto != null;

  const hasMissingCritical =
    cred === null ||
    input.ocspOrCrlRevocationChecked == null ||
    input.revocationFailClosed == null ||
    (isPriv && input.separatePrivilegedAccountAndAltToken == null);

  const verdict: DodVerdict = !hasSignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? "FAIL"
    : hasMissingCritical
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";

  const formalDetermination: DodVerdict | "PENDING_EVIDENCE" =
    verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE"
      : input.evidenceVerified === true && !hasMissingCritical
      ? verdict
      : "PENDING_EVIDENCE";

  const resolvedDisaCcis: { controlId: string; cciId: string; definition: string }[] = [];
  for (const ctrlId of ["IA-2(1)", "IA-5(2)", "AC-6(2)"]) {
    const ccis = listCcisForNistControl(ctrlId).slice(0, 2);
    for (const c of ccis) {
      resolvedDisaCcis.push({ controlId: ctrlId, cciId: c.cciId, definition: c.definition });
    }
  }

  const observedFacts: Record<string, string | number | boolean | null> = {
    credentialType: cred,
    isPrivilegedAccount: isPriv,
    phishingResistant,
    separatePrivilegedAccountAndAltToken: input.separatePrivilegedAccountAndAltToken ?? null,
    ocspOrCrlRevocationChecked: input.ocspOrCrlRevocationChecked ?? null,
    revocationFailClosed: input.revocationFailClosed ?? null,
    dodRootCaChainVerified: input.dodRootCaChainVerified ?? null,
    fips140ValidatedCrypto: input.fips140ValidatedCrypto ?? null,
    upstreamBastionEnforcesHardwareMfa: input.upstreamBastionEnforcesHardwareMfa ?? null,
    resolvedCciIds: resolvedDisaCcis.map((c) => c.cciId).join(", "),
  };

  const ruleResult: DodIcRuleResult = {
    ruleId,
    ruleVersion,
    jurisdiction: "DOD",
    title: "DoD PKI & ICAM Authentication, ALT Token & OCSP/CRL Validation (DoDI 8520.02 / 8520.03)",
    verdict,
    assessmentMode: isScenario ? "SCENARIO_ASSUMPTION" : "FORMAL_EVIDENCE_AUDIT",
    formalDetermination,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: ${blockers.join("; ")}.`
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: Provide credential type (CAC/PIV/ALT/FIDO2/SMS/SSH), privileged account separation, and OCSP/CRL fail-closed settings."
        : verdict === "MANUAL_REVIEW_REQUIRED"
        ? "MANUAL_REVIEW_REQUIRED: Partial DoDI 8520.02/8520.03 ICAM parameters provided; verify full OCSP fail-closed config and privileged ALT separation."
        : `${isScenario ? "SCENARIO PASS" : "PASS"}: Hardware phishing-resistant MFA, privileged ALT token separation, and fail-closed DoD PKI OCSP/CRL validation verified.`,
    observedFacts,
    threshold: "Hardware phishing-resistant MFA (CAC/PIV/ALT/FIDO2) per DoDI 8520.03; separate admin ALT tokens; fail-closed OCSP/CRL & DoD Root CA chain per DoDI 8520.02.",
    variance: blockers.join(" | ") || "Compliant DoDI 8520.02 / 8520.03 PKI & ICAM chain",
    missingEvidence: [
      "IdP / reverse-proxy PKI config showing strict DoD Root CA trust store and fail-closed OCSP/CRL settings",
      ...(isPriv ? ["Privileged Identity Management (PIM) roster tying admin accounts strictly to ALT hardware tokens"] : []),
      "DISA STIG / CCI verification artifacts (e.g., CCI-000765 / IA-2(1), IA-5(2))",
    ],
    authorityCitations: [
      DOD_IC_POLICY_REGISTRY["DODI-8520.02"]!,
      DOD_IC_POLICY_REGISTRY["DODI-8520.03"]!,
      DOD_IC_POLICY_REGISTRY["NSM-8"]!,
    ],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, observedFacts, verdict })),
  };

  return {
    credentialType: cred,
    isPrivilegedAccount: isPriv,
    phishingResistant,
    revocationFailClosedEnforced:
      input.ocspOrCrlRevocationChecked === false ? false : input.revocationFailClosed ?? null,
    resolvedDisaCcis,
    ruleResult,
  };
}

// ----------------------------------------------------------------------------
// 4. Privileged Access (PAM/JIT), ABAC / IC-PE & East-West mTLS (DOD-ICAM-PAM-ABAC-001)
// ----------------------------------------------------------------------------

export interface DodPamAbacResult {
  isIcOrClassifiedEnvironment: boolean;
  ruleResult: DodIcRuleResult;
}

export function evaluatePrivilegedAccessAndAbac(input: {
  standingPrivilegedAccessEliminated?: boolean | null;
  jitApprovalAndSessionRecording?: boolean | null;
  abacClassificationAttributesEnforced?: boolean | null;
  rbacOnlyWithoutAttributeChecks?: boolean | null;
  eastWestMicrosegmentationEnforced?: boolean | null;
  workloadMtlsWithNpeCerts?: boolean | null;
  isIcOrClassifiedEnvironment?: boolean;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DodPamAbacResult {
  const ruleId = "DOD-ICAM-PAM-ABAC-001";
  const ruleVersion = "2023.05.19";
  const isIc = input.isIcOrClassifiedEnvironment === true;
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;

  const blockers: string[] = [];
  if (input.standingPrivilegedAccessEliminated === false) {
    blockers.push("Standing/permanent privileged access present — violates DoD ZT User pillar (requires PAM + Just-In-Time elevation)");
  }
  if (input.jitApprovalAndSessionRecording === false) {
    blockers.push("Privileged sessions lack Just-In-Time (JIT) approval workflows and immutable session audit recording (AU-2 / AC-6)");
  }
  if (input.rbacOnlyWithoutAttributeChecks === true || input.abacClassificationAttributesEnforced === false) {
    blockers.push(
      `Static RBAC without Attribute-Based Access Control (ABAC${isIc ? " / IC-PE" : ""}) fails to enforce clearance, NOFORN/citizenship, SCI caveat, and device posture checks`,
    );
  }
  if (input.eastWestMicrosegmentationEnforced === false) {
    blockers.push("Flat internal network without east-west microsegmentation violates DoD Zero Trust Network & Environment pillar (SC-7)");
  }
  if (input.workloadMtlsWithNpeCerts === false) {
    blockers.push("Unauthenticated internal workload/API traffic lacks DoDI 8520.02 Non-Person Entity (NPE) mTLS certificates");
  }

  const hasSignal =
    input.standingPrivilegedAccessEliminated != null ||
    input.jitApprovalAndSessionRecording != null ||
    input.abacClassificationAttributesEnforced != null ||
    input.rbacOnlyWithoutAttributeChecks != null ||
    input.eastWestMicrosegmentationEnforced != null ||
    input.workloadMtlsWithNpeCerts != null;

  const verdict: DodVerdict = !hasSignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? "FAIL"
    : input.standingPrivilegedAccessEliminated == null ||
      input.abacClassificationAttributesEnforced == null ||
      input.eastWestMicrosegmentationEnforced == null
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";

  const formalDetermination: DodVerdict | "PENDING_EVIDENCE" =
    verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE"
      : input.evidenceVerified === true && verdict === "PASS"
      ? "PASS"
      : "PENDING_EVIDENCE";

  const observedFacts: Record<string, string | number | boolean | null> = {
    isIcOrClassifiedEnvironment: isIc,
    standingPrivilegedAccessEliminated: input.standingPrivilegedAccessEliminated ?? null,
    jitApprovalAndSessionRecording: input.jitApprovalAndSessionRecording ?? null,
    abacClassificationAttributesEnforced: input.abacClassificationAttributesEnforced ?? null,
    rbacOnlyWithoutAttributeChecks: input.rbacOnlyWithoutAttributeChecks ?? null,
    eastWestMicrosegmentationEnforced: input.eastWestMicrosegmentationEnforced ?? null,
    workloadMtlsWithNpeCerts: input.workloadMtlsWithNpeCerts ?? null,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId,
    ruleVersion,
    jurisdiction: isIc ? "IC" : "DOD",
    title: "Privileged Access Management (PAM/JIT), ABAC / IC-PE & East-West Microsegmentation",
    verdict,
    assessmentMode: isScenario ? "SCENARIO_ASSUMPTION" : "FORMAL_EVIDENCE_AUDIT",
    formalDetermination,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: ${blockers.join("; ")}.`
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: Supply PAM/JIT elimination of standing privileges, ABAC attribute policy checks, and microsegmentation/NPE mTLS telemetry."
        : verdict === "MANUAL_REVIEW_REQUIRED"
        ? "MANUAL_REVIEW_REQUIRED: Partial PAM/ABAC/microsegmentation posture supplied; verify remaining PDP/PEP enforcement artifacts."
        : `${isScenario ? "SCENARIO PASS" : "PASS"}: Zero Trust PAM/JIT, ABAC clearance/posture attribute enforcement, and east-west NPE mTLS microsegmentation verified.`,
    observedFacts,
    threshold: "Zero standing privileged access (JIT PAM + session recording); ABAC/IC-PE enforcing clearance/NOFORN/device attributes; east-west microsegmentation + NPE mTLS.",
    variance: blockers.join(" | ") || "Compliant Zero Trust PAM, ABAC & Microsegmentation posture",
    missingEvidence: [
      "PAM vault & JIT approval logs showing zero standing domain/cloud admin assignments",
      `Policy Decision Point (${isIc ? "IC-PE / ICD 501" : "DoD PDP"}) ABAC policy bundle validating citizenship/clearance/device posture`,
      "Service mesh / SDN microsegmentation & NPE mTLS enforcement policy export",
    ],
    authorityCitations: [
      DOD_IC_POLICY_REGISTRY["DOD-ZT-STRATEGY-2022"]!,
      DOD_IC_POLICY_REGISTRY["DODI-8520.02"]!,
      ...(isIc ? [DOD_IC_POLICY_REGISTRY["ICD-503"]!, DOD_IC_POLICY_REGISTRY["ICD-501"]!] : [DOD_IC_POLICY_REGISTRY["DODI-8520.03"]!]),
    ],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, observedFacts, verdict })),
  };

  return { isIcOrClassifiedEnvironment: isIc, ruleResult };
}
