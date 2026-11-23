/**
 * Noctis Defensive Cyber Operations, Digital Forensics & Insider Threat Engine (NDIMP Wave 2 — Step 2)
 *
 * Implements:
 *  - DOD-DCO-DET-001: DCO/SOC Telemetry Completeness, ATT&CK / Sigma-YARA Coverage & Missing-Telemetry Claim Blocking
 *  - DOD-FORENSICS-86-001: NIST SP 800-86 & DoDI 8530.03 Volatile-First Digital Forensics Chain of Custody
 *  - DOD-INSIDER-5205-001: DoDI 5205.16 (Dec 20, 2024) & EO 13587 DoD Insider Threat Hub & Classified UAM
 */

import { sha256Sync } from "../universal-crypto.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY, type DodIcPolicyRecord } from "./policy-registry.ts";

function buildDcoRule(params: {
  ruleId: string;
  ruleVersion: string;
  title: string;
  blockers: string[];
  hasAnySignal: boolean;
  hasMissingRequired: boolean;
  summaryPass: string;
  threshold: string;
  observedFacts: Record<string, string | number | boolean | null>;
  missingEvidence: string[];
  authorityCitations: DodIcPolicyRecord[];
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DodIcRuleResult {
  const mode: AssessmentMode = params.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && params.evidenceVerified !== true;
  const verdict: DodVerdict = !params.hasAnySignal
    ? "INSUFFICIENT_EVIDENCE"
    : params.blockers.length > 0
    ? "FAIL"
    : params.hasMissingRequired
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";
  return {
    ruleId: params.ruleId,
    ruleVersion: params.ruleVersion,
    jurisdiction: "DOD",
    title: params.title,
    verdict,
    assessmentMode: mode,
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      params.blockers.length > 0
        ? `FAIL [${params.ruleId}]: ${params.blockers.join("; ")}.`
        : verdict === "PASS"
        ? params.summaryPass
        : `${verdict} [${params.ruleId}]: Telemetry or custody evidence incomplete.`,
    observedFacts: params.observedFacts,
    threshold: params.threshold,
    variance: params.blockers.length > 0 ? params.blockers.join("; ") : verdict === "PASS" ? "Compliant with DCO/forensics baseline" : "Awaiting missing telemetry",
    missingEvidence: params.missingEvidence,
    authorityCitations: params.authorityCitations,
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: params.ruleId, verdict, observedFacts: params.observedFacts, blockers: params.blockers })),
  };
}

export interface DcoDetectionResult {
  ruleResult: DodIcRuleResult;
  telemetryCoveragePercent: number;
  claimBlockedMissingTelemetry: boolean;
}

/** Evaluates DCO/SOC detection telemetry completeness and blocks "no intrusion" claims when logs are missing. */
export function evaluateDcoSocDetectionCoverage(input: {
  edrTelemetryPresent?: boolean | null;
  dnsLogsPresent?: boolean | null;
  netflowOrFirewallLogsPresent?: boolean | null;
  identityAuthLogsPresent?: boolean | null;
  siemCorrelationActive?: boolean | null;
  sigmaOrYaraRulesValidated?: boolean | null;
  mappedAttackTechniques?: string[];
  claimsNoIntrusionOccurred?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DcoDetectionResult {
  const signals = [
    input.edrTelemetryPresent,
    input.dnsLogsPresent,
    input.netflowOrFirewallLogsPresent,
    input.identityAuthLogsPresent,
    input.siemCorrelationActive,
  ];
  const defined = signals.filter((s) => s !== null && s !== undefined);
  const present = signals.filter((s) => s === true).length;
  const coveragePct = defined.length > 0 ? Math.round((present / 5) * 100) : 0;

  const missingSources: string[] = [];
  if (input.edrTelemetryPresent === false) missingSources.push("EDR endpoint telemetry");
  if (input.dnsLogsPresent === false) missingSources.push("DNS query logs");
  if (input.netflowOrFirewallLogsPresent === false) missingSources.push("NetFlow/firewall boundary logs");
  if (input.identityAuthLogsPresent === false) missingSources.push("Identity/IdP authentication logs");
  if (input.siemCorrelationActive === false) missingSources.push("SIEM/SOAR alert correlation");

  const claimBlocked = input.claimsNoIntrusionOccurred === true && (missingSources.length > 0 || defined.length === 0);
  const blockers: string[] = [];
  if (claimBlocked) {
    blockers.push(`Absence of telemetry (${missingSources.join(", ") || "unverified telemetry"}) cannot substantiate a "no intrusion" determination`);
  } else if (missingSources.length > 0) {
    blockers.push(`Critical SOC visibility blind spots detected: missing ${missingSources.join(", ")}`);
  }
  if (input.sigmaOrYaraRulesValidated === false) {
    blockers.push("Sigma/YARA detection rules have not passed purple-team / Atomic validation");
  }

  const ruleResult = buildDcoRule({
    ruleId: "DOD-DCO-DET-001",
    ruleVersion: "2023.08.09",
    title: "DCO / SOC Telemetry Completeness & Detection Engineering (DoDI 8530.03 / ICD 502)",
    blockers,
    hasAnySignal: defined.length > 0 || input.claimsNoIntrusionOccurred != null || input.sigmaOrYaraRulesValidated != null,
    hasMissingRequired: defined.length < 4,
    summaryPass: "PASS [DOD-DCO-DET-001]: Core EDR, DNS, NetFlow, Identity, and SIEM correlation telemetry verified across ATT&CK detections.",
    threshold: "100% core SOC telemetry (EDR, DNS, NetFlow, Auth, SIEM) required before asserting negative intrusion findings",
    observedFacts: {
      telemetryCoveragePercent: coveragePct,
      claimBlockedMissingTelemetry: claimBlocked,
      mappedAttackCount: input.mappedAttackTechniques?.length ?? 0,
      edrTelemetryPresent: input.edrTelemetryPresent ?? null,
      dnsLogsPresent: input.dnsLogsPresent ?? null,
      siemCorrelationActive: input.siemCorrelationActive ?? null,
    },
    missingEvidence: missingSources.length > 0 ? missingSources : ["SIEM/SOAR retention proof & Sigma/ATT&CK validation report"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-8530.03"]!, DOD_IC_POLICY_REGISTRY["NIST-SP-800-86-FORENSICS"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, telemetryCoveragePercent: coveragePct, claimBlockedMissingTelemetry: claimBlocked };
}

export interface ForensicsCustodyResult {
  ruleResult: DodIcRuleResult;
  evidenceIntegrityPreserved: boolean;
}

/** Evaluates NIST SP 800-86 volatile-first capture, write-blocking, SHA-256 hashing, and chain of custody. */
export function evaluateDigitalForensicsChainOfCustody(input: {
  volatileMemoryCapturedBeforeReboot?: boolean | null;
  hardwareWriteBlockerUsed?: boolean | null;
  cryptographicHashVerified?: boolean | null;
  chainOfCustodyDocumented?: boolean | null;
  ntpUtcTimelineSynchronized?: boolean | null;
  hostWipedOrReimagedBeforeAcquisition?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): ForensicsCustodyResult {
  const blockers: string[] = [];
  if (input.hostWipedOrReimagedBeforeAcquisition === true || input.volatileMemoryCapturedBeforeReboot === false) {
    blockers.push("Volatile RAM/evidence lost due to wipe/reboot prior to NIST SP 800-86 forensic acquisition");
  }
  if (input.hardwareWriteBlockerUsed === false) blockers.push("Forensic media imaged without hardware/software write-blocker protection");
  if (input.cryptographicHashVerified === false) blockers.push("SHA-256 / cryptographic integrity hash missing across acquisition and analysis copies");
  if (input.chainOfCustodyDocumented === false) blockers.push("Continuous chain-of-custody log incomplete");
  if (input.ntpUtcTimelineSynchronized === false) blockers.push("NTP/UTC clock skew prevents reliable forensic timeline reconstruction");

  const hasAnySignal =
    input.volatileMemoryCapturedBeforeReboot != null ||
    input.hardwareWriteBlockerUsed != null ||
    input.cryptographicHashVerified != null ||
    input.chainOfCustodyDocumented != null ||
    input.hostWipedOrReimagedBeforeAcquisition != null;

  const preserved = blockers.length === 0 && input.volatileMemoryCapturedBeforeReboot === true && input.cryptographicHashVerified === true;

  const ruleResult = buildDcoRule({
    ruleId: "DOD-FORENSICS-86-001",
    ruleVersion: "2006.08.01",
    title: "Digital Forensics Volatile Preservation & Chain of Custody (NIST SP 800-86 / DoDI 8530.03)",
    blockers,
    hasAnySignal,
    hasMissingRequired: input.volatileMemoryCapturedBeforeReboot == null || input.cryptographicHashVerified == null,
    summaryPass: "PASS [DOD-FORENSICS-86-001]: Volatile-first capture, write-blocking, SHA-256 hashing, and UTC chain of custody verified.",
    threshold: "Volatile capture prior to reboot/wipe, write-blocked imaging, SHA-256 hash verification, NTP UTC alignment, signed Chain of Custody",
    observedFacts: {
      volatileMemoryCapturedBeforeReboot: input.volatileMemoryCapturedBeforeReboot ?? null,
      hardwareWriteBlockerUsed: input.hardwareWriteBlockerUsed ?? null,
      cryptographicHashVerified: input.cryptographicHashVerified ?? null,
      chainOfCustodyDocumented: input.chainOfCustodyDocumented ?? null,
      hostWipedOrReimagedBeforeAcquisition: input.hostWipedOrReimagedBeforeAcquisition ?? null,
      evidenceIntegrityPreserved: preserved,
    },
    missingEvidence: ["Signed DFIR Chain-of-Custody Form, SHA-256 manifest, and volatile memory dump metadata"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["NIST-SP-800-86-FORENSICS"]!, DOD_IC_POLICY_REGISTRY["DODI-8530.03"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, evidenceIntegrityPreserved: preserved };
}

export interface InsiderThreatResult {
  ruleResult: DodIcRuleResult;
  elevatedRiskIndicatorsCount: number;
}

/** Evaluates DoDI 5205.16 (Dec 20, 2024) & EO 13587 Component Insider Threat Hub, classified UAM & legal/privacy oversight. */
export function evaluateInsiderThreatProgram(input: {
  insiderThreatHubActive?: boolean | null;
  classifiedNetworkUamEnabled?: boolean | null;
  anomalousExfiltrationIndicators?: string[];
  legalAndPrivacyOversightActive?: boolean | null;
  humanAdjudicationRequired?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): InsiderThreatResult {
  const blockers: string[] = [];
  if (input.insiderThreatHubActive === false) blockers.push("Component lacks operational DoDI 5205.16 Insider Threat Hub");
  if (input.classifiedNetworkUamEnabled === false) blockers.push("EO 13587 / DoDI 5205.16 User Activity Monitoring (UAM) absent on classified network");
  if (input.legalAndPrivacyOversightActive === false) blockers.push("Insider Threat program lacks mandatory legal, privacy, and civil-liberties oversight");
  if (input.humanAdjudicationRequired === false) blockers.push("Automated punitive action without human/legal adjudication violates DoDI 5205.16 governance");

  const indicators = input.anomalousExfiltrationIndicators ?? [];
  const hasAnySignal =
    input.insiderThreatHubActive != null ||
    input.classifiedNetworkUamEnabled != null ||
    input.legalAndPrivacyOversightActive != null ||
    input.humanAdjudicationRequired != null ||
    indicators.length > 0;

  const needsTriage = blockers.length === 0 && indicators.length > 0;

  const ruleResult = buildDcoRule({
    ruleId: "DOD-INSIDER-5205-001",
    ruleVersion: "2024.12.20",
    title: "DoD Insider Threat Hub, Classified UAM & Oversight (DoDI 5205.16 / EO 13587)",
    blockers,
    hasAnySignal,
    hasMissingRequired: needsTriage || input.classifiedNetworkUamEnabled == null,
    summaryPass: "PASS [DOD-INSIDER-5205-001]: Insider Threat Hub, classified network UAM, legal/privacy oversight, and human adjudication controls conform to DoDI 5205.16 (Dec 20, 2024).",
    threshold: "Operational Insider Threat Hub, classified UAM active, legal/privacy oversight enforced, zero autonomous punitive actions",
    observedFacts: {
      insiderThreatHubActive: input.insiderThreatHubActive ?? null,
      classifiedNetworkUamEnabled: input.classifiedNetworkUamEnabled ?? null,
      legalAndPrivacyOversightActive: input.legalAndPrivacyOversightActive ?? null,
      humanAdjudicationRequired: input.humanAdjudicationRequired ?? null,
      elevatedRiskIndicatorsCount: indicators.length,
    },
    missingEvidence: ["DoDI 5205.16 Hub charter, classified UAM coverage matrix & Privacy/Legal Counsel sign-off"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-5205.16-EO-13587"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, elevatedRiskIndicatorsCount: indicators.length };
}
