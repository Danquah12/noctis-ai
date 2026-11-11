/**
 * NOCTIS AUTONOMOUS CROSS-DOMAIN CONSENSUS SWARM (PHASE 4)
 * =========================================================
 * Multi-Agent Swarm Deliberation Engine across the 16 Sovereign Suites.
 *
 * Reconciles complex multi-vector incidents spanning:
 * - Cybersecurity (SHIELD / Cyber P1)
 * - Clinical Healthcare (CDSTRIAGE / Health P3)
 * - Regulatory & Legal (LEX / Legal)
 * - Financial Markets & Capital (InvestP4 / Finance)
 * - Infrastructure & SCADA (INFRA / Engineering)
 * - Defense & National Security (DEFENSE / Government)
 *
 * Operates a 3-Round Autonomous Consensus Protocol:
 * Round 1: Independent Domain Analysis & Risk Assessment.
 * Round 2: Cross-Domain Collision & Conflict Detection.
 * Round 3: SQDEC Governance Reconciliation (Safety > Quality > Delivery > Economics > Control).
 *
 * Emits an Audited Cryptographic Attestation with SHA-256 Integrity Seal.
 */

import { sha256Sync } from "./universal-crypto.ts";
import {
  NOCTIS_16_SOVEREIGN_SUITES,
  type SovereignSuiteMetadata,
} from "./noctis-sovereign-grounding.ts";
import {
  detectEnterpriseProtocol,
  parseEnterprisePayload,
  type ParsedEnterpriseEvent,
} from "./noctis-enterprise-protocol-engine.ts";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type SQDECPillar = "Safety" | "Quality" | "Delivery" | "Economics" | "Control";

export interface CrossDomainIncidentInput {
  incidentId?: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  triggerSuiteId?: string;
  domainsInvolved?: string[];
  telemetryPayload?: Record<string, unknown>;
  detectedProtocols?: string[];
}

export interface DomainAgentAssessment {
  suiteId: string;
  suiteName: string;
  badge: string;
  agentName: string;
  sqdecPillar: SQDECPillar;
  primaryFinding: string;
  riskScore: number; // 0 to 100
  recommendedActions: string[];
  invariantVeto: {
    triggered: boolean;
    invariantId?: string;
    reason?: string;
  };
  voteStatus: "ASSENT" | "DISSENT" | "CONDITIONAL";
}

export interface DomainConflict {
  conflictId: string;
  suites: [string, string];
  conflictTopic: string;
  suiteAProposal: string;
  suiteBProposal: string;
  sqdecPillarA: SQDECPillar;
  sqdecPillarB: SQDECPillar;
  arbitratedWinner: string;
  reconciliationRationale: string;
}

export interface CrossDomainConsensusResult {
  incidentId: string;
  title: string;
  severity: SeverityLevel;
  timestamp: string;
  governingSqdecPillar: SQDECPillar;
  participatingSuites: Array<{
    id: string;
    name: string;
    badge: string;
    sqdecPillar: SQDECPillar;
  }>;
  round1Assessments: DomainAgentAssessment[];
  conflictsDetected: DomainConflict[];
  vetoesExercised: Array<{
    suiteId: string;
    invariantId: string;
    reason: string;
    enforcedResolution: string;
  }>;
  unifiedActionDirectives: string[];
  consensusStatus: "CONSENSUS_REACHED" | "ARBITRATED_OVERRIDE" | "CIRCUIT_BREAKER_HALT";
  consensusAttestationSha256: string;
  auditSignature: string;
}

const SQDEC_PRIORITY_ORDER: Record<SQDECPillar, number> = {
  Safety: 1,
  Quality: 2,
  Delivery: 3,
  Economics: 4,
  Control: 5,
};

function getSuite(idOrSlug: string): SovereignSuiteMetadata {
  const match = NOCTIS_16_SOVEREIGN_SUITES.find(
    (s) => s.id === idOrSlug || s.slug === idOrSlug || s.badge.toLowerCase() === idOrSlug.toLowerCase()
  );
  if (match) return match;
  return {
    id: idOrSlug,
    name: idOrSlug,
    slug: idOrSlug,
    badge: idOrSlug.toUpperCase(),
    priorityRank: 99,
    category: "Operations",
    purpose: "General sovereign operations",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Autonomous Coordination"],
    keyAgents: ["Sovereign Coordinator"],
    sqdecPillar: "Delivery",
  };
}

/**
 * Pre-defined enterprise incident scenarios representing real-world multi-domain collisions.
 */
export const PREDEFINED_CROSS_DOMAIN_SCENARIOS: Record<string, CrossDomainIncidentInput> = {
  hospital_ransomware_infusion: {
    incidentId: "INC-HEALTH-CYBER-001",
    title: "BlackCat/ALPHV Ransomware Infiltration of Clinical Telemetry VLAN",
    description: "Ransomware detected on hospital segment hosting PACS server and smart syringe pumps during active open-heart and neurosurgery cases.",
    severity: "CRITICAL",
    triggerSuiteId: "noctis-cyber",
    domainsInvolved: ["noctis-cyber", "noctis-health", "noctis-legal", "noctis-infrastructure"],
    telemetryPayload: {
      alertSource: "CrowdStrike Falcon",
      event_simpleName: "ProcessRollup2",
      CommandLine: "vssadmin.exe delete shadows /all /quiet && bcdedit /set {default} recoveryenabled No",
      targetVlan: "VLAN-104-ICU-INFUSION",
      activePatientsAtRisk: 14,
      pacsServerStatus: "encrypting_shares",
    },
    detectedProtocols: ["crowdstrike_fdr", "epic_fhir", "dicom_pacs"],
  },
  flash_crash_market_manipulation: {
    incidentId: "INC-FIN-CYBER-002",
    title: "Distributed Algorithmic Spoofing & Clearing House Token Hijack",
    description: "Coordinated high-frequency synthetic quote spoofing across Bloomberg B-PIPE and anomalous ISO 20022 wire settlements.",
    severity: "CRITICAL",
    triggerSuiteId: "noctis-finance",
    domainsInvolved: ["noctis-finance", "noctis-cyber", "noctis-legal", "noctis-rmf"],
    telemetryPayload: {
      protocol: "bloomberg_bpipe",
      anomalousOrderCount: 450000,
      quoteCancellationRatio: 0.998,
      clearingHouseWireVolumeUsd: 142000000,
      affectedTickers: ["ES_F", "NQ_F", "US10Y"],
    },
    detectedProtocols: ["bloomberg_bpipe", "iso_20022", "crowdstrike_fdr"],
  },
  defense_firmware_supply_chain: {
    incidentId: "INC-DEF-ENG-003",
    title: "Unsigned Avionics Telemetry Firmware Tampering in SCIF Pipeline",
    description: "Continuous integration runner received unverified firmware artifact with modified flight control PID loop parameters.",
    severity: "CRITICAL",
    triggerSuiteId: "noctis-defense",
    domainsInvolved: ["noctis-defense", "noctis-cyber", "noctis-engineering", "noctis-government"],
    telemetryPayload: {
      repo: "defense-avionics/flight-core",
      commitSha: "e9f7831bbd7a049c2d1b",
      tamperedHeader: "PID_PITCH_GAIN_OVERRIDE",
      clearanceLevel: "TOP_SECRET_SCI",
      complianceStandard: "ITAR_CMMC_LEVEL_3",
    },
    detectedProtocols: ["github_actions", "kubernetes", "cisa_kev"],
  },
  cross_border_cloud_exfiltration: {
    incidentId: "INC-LEGAL-CLOUD-004",
    title: "Large-Scale Public Bucket Data Leakage with Cross-Border PII/PHI",
    description: "Unauthorized API session reading 250,000 sensitive records spanning US and EU patients from unencrypted data lake mirror.",
    severity: "HIGH",
    triggerSuiteId: "noctis-cyber",
    domainsInvolved: ["noctis-cyber", "noctis-legal", "noctis-rmf", "noctis-osint"],
    telemetryPayload: {
      protocol: "aws_guardduty",
      findingType: "Exfiltration:S3/AnomalousBehavior",
      recordsAccessedCount: 250000,
      jurisdictions: ["US_HIPAA", "EU_GDPR", "UK_DPA"],
      destinationIp: "185.220.101.44 (Tor Exit Node)",
    },
    detectedProtocols: ["aws_guardduty", "splunk_hec", "epic_fhir"],
  },
};

/**
 * Execute the 3-round Cross-Domain Consensus Swarm deliberation.
 */
export function runCrossDomainConsensus(
  input: CrossDomainIncidentInput
): CrossDomainConsensusResult {
  const incidentId = input.incidentId || `INC-CONSENSUS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  // Resolve involved suites
  const involvedSuiteIds = input.domainsInvolved && input.domainsInvolved.length > 0
    ? input.domainsInvolved
    : [input.triggerSuiteId || "noctis-cyber", "noctis-legal", "noctis-rmf"];

  // Ensure unique suites
  const uniqueSuiteIds = Array.from(new Set(involvedSuiteIds));
  const participatingSuites = uniqueSuiteIds.map(getSuite);

  // ROUND 1: Independent Domain Assessments
  const round1Assessments: DomainAgentAssessment[] = participatingSuites.map((suite) => {
    let finding = "";
    let risk = 50;
    const actions: string[] = [];
    let veto = { triggered: false, invariantId: undefined as string | undefined, reason: undefined as string | undefined };
    let status: "ASSENT" | "DISSENT" | "CONDITIONAL" = "ASSENT";

    switch (suite.id) {
      case "noctis-cyber":
        finding = `Cyber Threat detected: MITRE ATT&CK kill chain stage identified. Potential lateral movement or ransomware spread.`;
        risk = input.severity === "CRITICAL" ? 95 : 75;
        actions.push("Enforce Zero Trust boundary micro-segmentation.");
        actions.push("Revoke active bearer tokens and quarantine suspect host IP addresses.");
        actions.push("Generate SHA-256 cryptographic snapshot of compromised artifacts.");
        break;

      case "noctis-health":
        finding = `Clinical Care Invariant: Active inpatient monitoring and medication delivery must remain uninterrupted.`;
        risk = 98; // Patient life safety
        actions.push("Maintain uninterrupted power and local telemetry to all bedside infusion pumps.");
        actions.push("Isolate PACS WAN egress while maintaining local LAN imaging cache for active surgical theaters.");
        actions.push("Verify drug dosage tables against offline FDA pharmacopeia ground truth.");
        if (input.description.toLowerCase().includes("infusion") || input.description.toLowerCase().includes("pacs")) {
          veto = {
            triggered: true,
            invariantId: "INV-PATIENT-SAFETY-001",
            reason: "Absolute prohibition on total subnet power-down or abrupt network severing during active surgeries.",
          };
          status = "CONDITIONAL";
        }
        break;

      case "noctis-legal":
        finding = `Statutory & Regulatory Breach Mandate: Review disclosure requirements under HIPAA (45 CFR § 164.404), GDPR Art 33, and SEC Form 8-K.`;
        risk = 70;
        actions.push("Preserve immutable chain-of-custody audit logs for regulatory review.");
        actions.push("Initiate statutory 72-hour breach disclosure preparation window.");
        actions.push("Engage outside counsel under statutory attorney-client work product privilege.");
        break;

      case "noctis-finance":
        finding = `Capital & Liquidity Solvency Assessment: Trading book exposure, counterparty risk, and settlement circuit breakers.`;
        risk = 85;
        actions.push("Trigger FINRA / SEC Rule 15c3-5 automated market access circuit breaker.");
        actions.push("Halt execution on aberrant algorithmic trading strategies.");
        actions.push("Reconcile clearing house margin accounts against dual-entry ledger.");
        break;

      case "noctis-infrastructure":
        finding = `SCADA / OT Grid Integrity: Monitor PLC operational status and network perimeter isolation.`;
        risk = 88;
        actions.push("Switch SCADA PLCs to manual/islanding operation mode.");
        actions.push("Sever internet-facing management gateways while preserving local Modbus loop.");
        break;

      case "noctis-defense":
        finding = `Defense Air-Gap Enforcement: ITAR / CMMC Level 3 integrity verification and unauthorized binary quarantine.`;
        risk = 96;
        actions.push("Enforce SCIF air-gap isolation on compromised code repository.");
        actions.push("Roll back firmware to cryptographically verified golden image.");
        actions.push("Audit hardware root-of-trust TPM 2.0 signatures.");
        veto = {
          triggered: true,
          invariantId: "INV-ITAR-INTEGRITY-001",
          reason: "Strict prohibition on running unverified or unapproved firmware in flight-critical avionics.",
        };
        break;

      default:
        finding = `Sovereign Domain Review: Evaluating systemic risk against ${suite.sqdecPillar} SLA constraints.`;
        risk = 60;
        actions.push(`Execute sovereign runbook for ${suite.name}.`);
        actions.push("Record structured audit telemetry to Noctis ledger.");
        break;
    }

    return {
      suiteId: suite.id,
      suiteName: suite.name,
      badge: suite.badge,
      agentName: suite.keyAgents[0] || `${suite.name} Chief Agent`,
      sqdecPillar: suite.sqdecPillar,
      primaryFinding: finding,
      riskScore: risk,
      recommendedActions: actions,
      invariantVeto: veto,
      voteStatus: status,
    };
  });

  // ROUND 2: Conflict & Collision Detection
  const conflictsDetected: DomainConflict[] = [];

  // Scenario 1 Conflict: Cyber wants total network disconnect vs Health wants continuous patient life support
  const hasCyber = round1Assessments.some((a) => a.suiteId === "noctis-cyber");
  const hasHealth = round1Assessments.some((a) => a.suiteId === "noctis-health");
  if (hasCyber && hasHealth) {
    conflictsDetected.push({
      conflictId: "CONF-001-CYBER-VS-HEALTH",
      suites: ["noctis-cyber", "noctis-health"],
      conflictTopic: "Network Disconnection vs. Patient Resuscitation Telemetry",
      suiteAProposal: "Hard-sever all switch ports on VLAN to contain ransomware replication.",
      suiteBProposal: "Maintain uninterrupted bedside connectivity for ICU infusion pumps and OR PACS display.",
      sqdecPillarA: "Control",
      sqdecPillarB: "Safety",
      arbitratedWinner: "noctis-health",
      reconciliationRationale: "Under SQDEC Axiom 1, Patient Physical Life Safety (Safety) strictly supersedes Digital Infrastructure Isolation (Control). The network must be micro-segmented with an air-gapped local proxy, rather than severed completely.",
    });
  }

  // Scenario 2 Conflict: Finance wants to keep trading vs Legal/Cyber wants market halt
  const hasFinance = round1Assessments.some((a) => a.suiteId === "noctis-finance");
  const hasLegal = round1Assessments.some((a) => a.suiteId === "noctis-legal");
  if (hasFinance && hasLegal) {
    conflictsDetected.push({
      conflictId: "CONF-002-FIN-VS-LEGAL",
      suites: ["noctis-finance", "noctis-legal"],
      conflictTopic: "Market Liquidity vs. Regulatory Disclosure Halt",
      suiteAProposal: "Continue algorithmic execution with widened spread to absorb volatility.",
      suiteBProposal: "STAT halt under SEC Rule 15c3-5 to prevent criminal market manipulation liability.",
      sqdecPillarA: "Economics",
      sqdecPillarB: "Quality",
      arbitratedWinner: "noctis-legal",
      reconciliationRationale: "Under SQDEC, Regulatory Integrity & Verification (Quality) supersedes Immediate Trading Revenue (Economics). Trading is paused on affected tickers while cryptographic reconciliation occurs.",
    });
  }

  // Scenario 3 Conflict: Engineering hot-patch vs Defense/Gov golden rollback
  const hasDefense = round1Assessments.some((a) => a.suiteId === "noctis-defense");
  const hasEngineering = round1Assessments.some((a) => a.suiteId === "noctis-engineering" || a.suiteId === "noctis-software");
  if (hasDefense && hasEngineering) {
    conflictsDetected.push({
      conflictId: "CONF-003-DEF-VS-ENG",
      suites: ["noctis-defense", "noctis-engineering"],
      conflictTopic: "Live Hot-Patching vs. Formal Rollback to Attested Golden Image",
      suiteAProposal: "Zero-tolerance rollback to last cryptographically signed golden image in SCIF enclave.",
      suiteBProposal: "Apply dynamic in-memory patch to retain test telemetry and avoid reboot downtime.",
      sqdecPillarA: "Safety",
      sqdecPillarB: "Delivery",
      arbitratedWinner: "noctis-defense",
      reconciliationRationale: "National security avionics integrity (Safety) strictly dominates developer turnaround latency (Delivery). Unverified binaries are prohibited from executing in flight systems.",
    });
  }

  // ROUND 3: SQDEC Reconciliation & Unified Directives
  const vetoesExercised = round1Assessments
    .filter((a) => a.invariantVeto.triggered)
    .map((a) => ({
      suiteId: a.suiteId,
      invariantId: a.invariantVeto.invariantId || "INV-GENERIC",
      reason: a.invariantVeto.reason || "Safety invariant triggered.",
      enforcedResolution: `Enforce priority override under ${a.sqdecPillar} pillar mandate.`,
    }));

  // Reconciled Action Directives
  const unifiedActionDirectives: string[] = [];
  // 1. Safety first
  unifiedActionDirectives.push("[SAFETY-MANDATE] Isolate external internet uplink while guaranteeing uninterrupted local life-safety and operational runtimes.");
  // 2. Quality second
  unifiedActionDirectives.push("[QUALITY-VERIFY] Generate cryptographic SHA-256 forensics image of all affected memory spaces and data stores.");
  // 3. Delivery third
  unifiedActionDirectives.push("[DELIVERY-RESILIENCE] Redirect mission-critical telemetry to sovereign air-gapped failover instance.");
  // 4. Economics fourth
  unifiedActionDirectives.push("[ECONOMIC-MITIGATION] Restrict high-risk capital disbursements, automated transactions, and third-party API quotas.");
  // 5. Control fifth
  unifiedActionDirectives.push("[CONTROL-AUDIT] Seal incident ledger with immutable Ed25519/SHA-256 signature for board and regulatory submission.");

  // Governing pillar calculation: lowest rank number = highest priority
  let governingSqdecPillar: SQDECPillar = "Control";
  let minRank = 999;
  for (const suite of participatingSuites) {
    const rank = SQDEC_PRIORITY_ORDER[suite.sqdecPillar];
    if (rank < minRank) {
      minRank = rank;
      governingSqdecPillar = suite.sqdecPillar;
    }
  }

  const consensusStatus = vetoesExercised.length > 0 ? "ARBITRATED_OVERRIDE" : "CONSENSUS_REACHED";

  // Build cryptographic attestation
  const deliberationPayload = JSON.stringify({
    incidentId,
    title: input.title,
    timestamp,
    governingSqdecPillar,
    participatingSuites: participatingSuites.map((s) => s.id),
    conflictsDetectedCount: conflictsDetected.length,
    vetoesExercisedCount: vetoesExercised.length,
    unifiedActionDirectives,
  });

  const consensusAttestationSha256 = sha256Sync(deliberationPayload);
  const auditSignature = `SIG-NOCTIS-SWARM-${consensusAttestationSha256.substring(0, 16).toUpperCase()}`;

  return {
    incidentId,
    title: input.title,
    severity: input.severity,
    timestamp,
    governingSqdecPillar,
    participatingSuites: participatingSuites.map((s) => ({
      id: s.id,
      name: s.name,
      badge: s.badge,
      sqdecPillar: s.sqdecPillar,
    })),
    round1Assessments,
    conflictsDetected,
    vetoesExercised,
    unifiedActionDirectives,
    consensusStatus,
    consensusAttestationSha256,
    auditSignature,
  };
}

/**
 * Execute simulation of pre-defined enterprise scenarios.
 */
export function simulateCrossDomainScenario(scenarioKey: string): CrossDomainConsensusResult {
  const scenario = PREDEFINED_CROSS_DOMAIN_SCENARIOS[scenarioKey];
  if (!scenario) {
    throw new Error(`Scenario '${scenarioKey}' not found. Available: ${Object.keys(PREDEFINED_CROSS_DOMAIN_SCENARIOS).join(", ")}`);
  }
  return runCrossDomainConsensus(scenario);
}
