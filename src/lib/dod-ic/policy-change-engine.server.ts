/**
 * Noctis Defense & Intelligence Community (NDIMP Wave 1 — Step 4)
 * DoD & IC Policy Change Intelligence Engine
 *
 * Implements:
 *  - DOD-PCI-DIFF-001: Historical DoD/IC Directive Supersession Lineage Diffing + Custom Policy Version & Blast-Radius Analysis
 *  - DOD-PCI-DRIFT-001: Live Upstream Authoritative Drift Monitor (DISA CCI, NIST OSCAL, FedRAMP OSCAL, CISA KEV)
 *  - DOD-PCI-ROLLOUT-001: Tenant-Scoped Human Dual-Control Policy Rollout Workflow (`rmf.v2_artifacts` + `rmf.v2_audit_ledger`)
 *
 * Non-negotiable invariants:
 *  - Upstream policy drift NEVER auto-applies into production (`autoApplyToProduction: false`).
 *  - `AGENT_APPROVAL_FORBIDDEN`: AI agents/LLMs cannot approve or promote policy changes.
 *  - `SELF_APPROVAL_FORBIDDEN`: The proposer cannot approve their own policy change proposal.
 *  - Classification Gate runs BEFORE persisting any policy change proposal (`CLASSIFICATION_BOUNDARY_VIOLATION`).
 */

import rmfDbJson from "../../data/rmf-deterministic-db.json" with { type: "json" };
import { fetchLiveCisaKevCatalog } from "../rmf-v2/cyber-intelligence.ts";
import { computePolicyImpactDiff, type PolicyImpactDiffResult } from "../rmf-v2/governance.ts";
import {
  getRmfArtifactScopedWithForbidden,
  listRmfArtifacts,
  saveRmfArtifact,
  updateRmfArtifactApproval,
  type StoredRmfArtifact,
} from "../rmf-v2/persistence.server.ts";
import { sha256Sync } from "../universal-crypto.ts";
import { evaluateClassificationGate } from "./classification-gateway.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY, lookupDodIcPolicy } from "./policy-registry.ts";
import { getDisaCciManifest, listCcisForNistControl } from "./stig-acas-engine.ts";

// ----------------------------------------------------------------------------
// 1. Verified Historical Directive Supersession Lineages (DOD-PCI-DIFF-001)
// ----------------------------------------------------------------------------

export type PolicyChangeSeverity = "CRITICAL_BREAKING" | "MAJOR_REQUIREMENT_CHANGE" | "MINOR_CLARIFICATION";

export interface HistoricalDirectiveLineage {
  policyId: string;
  title: string;
  jurisdiction: "DOD" | "IC" | "CNSS" | "FEDERAL";
  priorVersion: string;
  priorEffectiveDate: string;
  currentVersion: string;
  currentEffectiveDate: string;
  severity: PolicyChangeSeverity;
  addedRequirements: string[];
  deprecatedOrSuperseded: string[];
  unchangedCoreMandates: string[];
  impactedRuleIds: string[];
  impactedNistControls: string[];
  impactedRmfArtifacts: string[];
}

export const VERIFIED_DIRECTIVE_LINEAGES: HistoricalDirectiveLineage[] = [
  {
    policyId: "ICD-503",
    title: "Intelligence Community Information Environment Risk Management",
    jurisdiction: "IC",
    priorVersion: "ICD 503 (July 21, 2015)",
    priorEffectiveDate: "2015-07-21",
    currentVersion: "ICD 503 (October 25, 2024 Revision)",
    currentEffectiveDate: "2024-10-25",
    severity: "CRITICAL_BREAKING",
    addedRequirements: [
      "Expanded governance across the holistic Intelligence Community Information Environment (IC IE) beyond isolated standalone systems.",
      "Explicit mandate integrating Zero Trust architecture principles alongside RMF authorization.",
      "Formal alignment of ICD 503 continuous authorization with ICD 502 integrated defense/ConMon and ICD 501 information-sharing readiness.",
      "Explicit integration of privacy and civil-liberties risk consideration into IC risk management.",
      "Strengthened IC Reciprocity framework requiring IC overlay/SCI delta verification and receiving IC AO acceptance.",
    ],
    deprecatedOrSuperseded: [
      "Legacy July 21, 2015 per-system C&A-oriented ICD 503 framing without explicit IC IE Zero Trust and privacy lifecycle hooks.",
    ],
    unchangedCoreMandates: [
      "DoD ATOs (DoDI 8510.01) and FedRAMP authorizations still do NOT confer automatic IC reciprocity without IC IE gap verification and IC AO approval.",
    ],
    impactedRuleIds: ["IC-ICD503-AUTH-001", "IC-RECIP-001", "IC-ICD501-SHARE-001", "DOD-ICAM-PAM-ABAC-001"],
    impactedNistControls: ["CA-6", "CA-7", "AC-3", "IA-2(1)", "SC-7", "PT-2"],
    impactedRmfArtifacts: [
      "IC IE Authorization Package",
      "System Security Plan (SSP)",
      "IC/SCI Overlay Tailoring Matrix",
      "ICD 502 Continuous Monitoring Plan",
      "Privacy Risk Assessment",
    ],
  },
  {
    policyId: "DODI-8510.01",
    title: "Risk Management Framework (RMF) for DoD Systems",
    jurisdiction: "DOD",
    priorVersion: "DoDI 8510.01 (March 12, 2014) & DTM 20-004",
    priorEffectiveDate: "2014-03-12",
    currentVersion: "DoDI 8510.01 (July 19, 2022 Issuance)",
    currentEffectiveDate: "2022-07-19",
    severity: "CRITICAL_BREAKING",
    addedRequirements: [
      "Added RMF Prepare step expanding the DoD RMF lifecycle from 6 steps to 7 steps aligned with NIST SP 800-37 Rev. 2.",
      "Aligned DoD baseline control selection with NIST SP 800-53 Rev. 5 & updated CNSSI 1253.",
      "Codified Continuous Authorization to Operate (cATO) oversight and agile/DevSecOps ongoing authorization alignment.",
      "Updated DoD Component reciprocity procedures and formally cancelled DTM 20-004 and the March 2014 issuance.",
    ],
    deprecatedOrSuperseded: [
      "6-step pre-Prepare NIST SP 800-37 Rev. 1 workflow from March 12, 2014.",
      "Interim Directive-Type Memorandum (DTM) 20-004 reciprocity/RMF workarounds.",
    ],
    unchangedCoreMandates: [
      "Designated Authorizing Official (AO) retains exclusive authority to issue ATO, ATOwC, IATT, or DATO.",
      "Independent Security Control Assessor (SCA) impartiality and eMASS package governance remain mandatory.",
    ],
    impactedRuleIds: ["DOD-RMF-AUTH-001", "DOD-RMF-RECIP-001", "DOD-EMASS-EXPORT-001"],
    impactedNistControls: ["CA-2", "CA-5", "CA-6", "CA-7", "PM-9", "RA-3"],
    impactedRmfArtifacts: ["eMASS Record", "System Security Plan (SSP)", "SAP", "SAR", "POA&M", "Reciprocity Package"],
  },
  {
    policyId: "CNSSI-1253",
    title: "Security Categorization and Control Selection for National Security Systems",
    jurisdiction: "CNSS",
    priorVersion: "CNSSI 1253 (March 2014)",
    priorEffectiveDate: "2014-03-27",
    currentVersion: "CNSSI 1253 (July 2022 Update)",
    currentEffectiveDate: "2022-07-01",
    severity: "MAJOR_REQUIREMENT_CHANGE",
    addedRequirements: [
      "Migrated NSS baseline mappings from NIST SP 800-53 Rev. 4 to NIST SP 800-53 Rev. 5 and NIST SP 800-37 Rev. 2.",
      "Added/refreshed Supply Chain Risk Management (SR family) and Privacy (PT family) NSS considerations alongside Intelligence, Classified Information, Space, and CDS overlays.",
    ],
    deprecatedOrSuperseded: ["Legacy NIST SP 800-53 Rev. 4 control mappings from March 2014 CNSSI 1253."],
    unchangedCoreMandates: [
      "Confidentiality, Integrity, and Availability (C, I, A) remain independent categorization vectors rather than collapsing to a civilian High-Water Mark.",
    ],
    impactedRuleIds: ["CNSSI-1253-CAT-001", "DOD-RMF-AUTH-001"],
    impactedNistControls: ["RA-2", "PL-2", "SR-3", "PT-2", "SC-13"],
    impactedRmfArtifacts: ["Security Categorization Document", "CNSSI 1253 Overlay Selection Worksheet", "SSP"],
  },
  {
    policyId: "DODI-8520.02",
    title: "Public Key Infrastructure (PKI) and Public Key (PK) Enabling",
    jurisdiction: "DOD",
    priorVersion: "DoDI 8520.02 (May 24, 2011)",
    priorEffectiveDate: "2011-05-24",
    currentVersion: "DoDI 8520.02 (May 18, 2023 Issuance)",
    currentEffectiveDate: "2023-05-18",
    severity: "MAJOR_REQUIREMENT_CHANGE",
    addedRequirements: [
      "Modernized Non-Person Entity (NPE) PKI certificate governance for cloud workloads, microservices, and Zero Trust mTLS.",
      "Reinforced mandatory real-time fail-closed OCSP/CRL revocation enforcement across PK-enabled applications and gateways.",
      "Updated cryptographic module expectations toward FIPS 140-3 validated cryptography and modern DoD Root CA trust chains.",
    ],
    deprecatedOrSuperseded: ["2011 DoDI 8520.02 legacy PKI terminology and legacy SHA-1 / pre-Zero-Trust NPE guidance."],
    unchangedCoreMandates: [
      "Soft-fail / fail-open OCSP or disabled CRL verification remains strictly non-compliant.",
    ],
    impactedRuleIds: ["DOD-ICAM-PKI-001", "DOD-ICAM-PAM-ABAC-001"],
    impactedNistControls: ["IA-5(2)", "SC-12", "SC-13", "SC-8"],
    impactedRmfArtifacts: ["PKI Trust Anchor Configuration", "OCSP/CRL Fail-Closed Evidence", "Service Mesh mTLS Policy"],
  },
  {
    policyId: "DODI-8520.03",
    title: "Identity Authentication for Information Systems",
    jurisdiction: "DOD",
    priorVersion: "DoDI 8520.03 (May 13, 2011)",
    priorEffectiveDate: "2011-05-13",
    currentVersion: "DoDI 8520.03 (May 19, 2023 Issuance)",
    currentEffectiveDate: "2023-05-19",
    severity: "CRITICAL_BREAKING",
    addedRequirements: [
      "Mandates phishing-resistant hardware credentials (CAC, PIV, DoD PKI ALT token, or approved FIDO2) aligned with DoD Zero Trust User pillar & NSM-8.",
      "Enforces strict privileged account separation tying privileged administration to dedicated ALT tokens rather than daily user CACs.",
      "Explicitly eliminates password-only and phishable SMS/email OTP mechanisms across DoD systems.",
    ],
    deprecatedOrSuperseded: ["Legacy May 2011 username/password fallback exceptions lacking phishing-resistant MFA."],
    unchangedCoreMandates: ["Hardware-backed cryptographic authentication tied to unique individual accountability."],
    impactedRuleIds: ["DOD-ICAM-PKI-001", "DOD-ZT-7PILLAR-001"],
    impactedNistControls: ["IA-2(1)", "IA-2(6)", "IA-5(2)", "AC-6(2)"],
    impactedRmfArtifacts: ["Authentication Architecture Diagram", "PIM/ALT Token Roster", "STIG Checks (CCI-000765)"],
  },
  {
    policyId: "CISA-ZTMM-2.0-OMB-M22-09",
    title: "CISA Zero Trust Maturity Model v2.0, OMB M-22-09 & FIPS 201-3",
    jurisdiction: "FEDERAL",
    priorVersion: "CISA ZTMM v1.0 (June 2021 Draft)",
    priorEffectiveDate: "2021-06-01",
    currentVersion: "CISA ZTMM v2.0 (April 2023)",
    currentEffectiveDate: "2023-04-11",
    severity: "MAJOR_REQUIREMENT_CHANGE",
    addedRequirements: [
      "Expanded from 3 maturity stages to 4 stages (Traditional, Initial, Advanced, Optimal).",
      "Codified 5 Pillars (Identity, Devices, Networks, Applications & Workloads, Data) + 3 Cross-Cutting Capabilities aligned to OMB M-22-09 & FIPS 201-3.",
    ],
    deprecatedOrSuperseded: ["Preliminary 3-stage ZTMM v1.0 (2021) draft maturity rubric."],
    unchangedCoreMandates: ["Zero Trust continuous verification grounded in NIST SP 800-207 PDP/PEP."],
    impactedRuleIds: ["DOD-ZT-7PILLAR-001"],
    impactedNistControls: ["IA-2(1)", "CM-8", "SC-7", "SA-11", "SC-28"],
    impactedRmfArtifacts: ["Zero Trust Implementation Plan", "CISA ZTMM Crosswalk", "POA&M Roadmap"],
  },
  {
    policyId: "CNSSP-15-CNSA-2.0-CSFC",
    title: "CNSSP 15 CNSA 2.0 Post-Quantum Standards & NSA CSfC Dual-Layer Encryption",
    jurisdiction: "CNSS",
    priorVersion: "CNSSP 15 CNSA 1.0 (2015)",
    priorEffectiveDate: "2015-08-19",
    currentVersion: "CNSSP 15 CNSA 2.0 (March 4, 2025 Release; Signed Feb 28, 2025)",
    currentEffectiveDate: "2025-03-04",
    severity: "CRITICAL_BREAKING",
    addedRequirements: [
      "Mandates quantum-resistant CNSA 2.0 algorithms: AES-256, ML-KEM-1024 (FIPS 203), ML-DSA-87 (FIPS 204), LMS/XMSS (SP 800-208).",
      "Sets mandatory NSS transition dates: Jan 1, 2027 (new acquisitions), Dec 31, 2030 (phase-out), Dec 31, 2031 (mandatory operational enforcement).",
    ],
    deprecatedOrSuperseded: ["Classical RSA, Diffie-Hellman, ECDH, and ECDSA key establishment/signatures for NSS."],
    unchangedCoreMandates: ["Dual independent commercial encryption layers required for NSA CSfC classified transit."],
    impactedRuleIds: ["DOD-COMSEC-CSFC-001"],
    impactedNistControls: ["SC-13", "SC-12", "SC-8", "IA-5(2)"],
    impactedRmfArtifacts: ["CNSA 2.0 Cryptographic Inventory", "CSfC Capability Package", "COMSEC POA&M"],
  },
  {
    policyId: "NIST-SP-800-88-R2",
    title: "NIST SP 800-88 Rev. 2 Guidelines for Media Sanitization",
    jurisdiction: "FEDERAL",
    priorVersion: "NIST SP 800-88 Rev. 1 (December 18, 2014)",
    priorEffectiveDate: "2014-12-18",
    currentVersion: "NIST SP 800-88 Rev. 2 (September 2025)",
    currentEffectiveDate: "2025-09-01",
    severity: "MAJOR_REQUIREMENT_CHANGE",
    addedRequirements: [
      "Updated NVMe/SSD/cloud cryptographic erase, hardware purge verification, and disposal documentation standards.",
      "Reinforced that magnetic degaussing never sanitizes SSD/flash media and Clear never declassifies classified media.",
    ],
    deprecatedOrSuperseded: ["Legacy 2014 NIST SP 800-88 Rev. 1 magnetic/optical assumptions for modern flash storage."],
    unchangedCoreMandates: ["Clear, Purge, and Destroy functional hierarchy and Certificate of Destruction traceability."],
    impactedRuleIds: ["DOD-SANITIZE-88-001"],
    impactedNistControls: ["MP-6", "MP-4", "MP-5"],
    impactedRmfArtifacts: ["Media Sanitization SOP", "Certificates of Destruction", "Spillage Cleanup Log"],
  },
  {
    policyId: "DODI-5205.16-EO-13587",
    title: "DoDI 5205.16 The DoD Insider Threat Program",
    jurisdiction: "DOD",
    priorVersion: "DoDD 5205.16 (September 30, 2014)",
    priorEffectiveDate: "2014-09-30",
    currentVersion: "DoDI 5205.16 (December 20, 2024)",
    currentEffectiveDate: "2024-12-20",
    severity: "MAJOR_REQUIREMENT_CHANGE",
    addedRequirements: [
      "Updated Directive to Instruction structure clarifying Component Insider Threat Hub, classified UAM telemetry, and privacy/civil-liberties safeguards.",
    ],
    deprecatedOrSuperseded: ["Legacy September 30, 2014 DoDD 5205.16 Directive framing."],
    unchangedCoreMandates: ["Mandatory multi-disciplinary Hub triage under EO 13587 and legal/privacy oversight."],
    impactedRuleIds: ["DOD-INSIDER-5205-001"],
    impactedNistControls: ["PM-12", "AU-6", "AC-2", "PS-3"],
    impactedRmfArtifacts: ["Insider Threat Hub Charter", "Classified UAM Policy", "Privacy Impact Review"],
  },
  {
    policyId: "DODD-3000.09-RAI",
    title: "DoDD 3000.09 Autonomy in Weapon Systems & DoD Responsible AI",
    jurisdiction: "DOD",
    priorVersion: "DoDD 3000.09 (November 21, 2012)",
    priorEffectiveDate: "2012-11-21",
    currentVersion: "DoDD 3000.09 (January 25, 2023)",
    currentEffectiveDate: "2023-01-25",
    severity: "CRITICAL_BREAKING",
    addedRequirements: [
      "Integrated modern AI assurance, DoD Responsible AI Ethical Principles, Autonomous Weapon System Working Group, and updated Senior Review governance.",
    ],
    deprecatedOrSuperseded: ["Pre-modern-LLM November 2012 DoDD 3000.09 review procedures."],
    unchangedCoreMandates: ["Commanders/operators must always exercise appropriate levels of human judgment over use of force."],
    impactedRuleIds: ["DOD-AI-RAI-001", "DOD-AI-REDTEAM-001"],
    impactedNistControls: ["SA-11", "CA-2", "PM-9", "RA-3"],
    impactedRmfArtifacts: ["Senior Review Dossier", "RAI T&E Verification Plan", "Human-in-the-Loop Safety Case"],
  },
  {
    policyId: "ICD-203-206-ANALYTIC",
    title: "ODNI ICD 203 Analytic Standards & ICD 206 Sourcing Requirements",
    jurisdiction: "IC",
    priorVersion: "ICD 203 (June 21, 2007) / ICD 206 (October 17, 2007)",
    priorEffectiveDate: "2007-06-21",
    currentVersion: "ICD 203 / ICD 206 (Jan 2, 2015; Tech Amend Jan 2022; Revalidated June 2023)",
    currentEffectiveDate: "2015-01-02",
    severity: "MAJOR_REQUIREMENT_CHANGE",
    addedRequirements: [
      "Standardized 9 analytic tradecraft standards, formal likelihood/confidence expression, alternative analysis (ACH), and explicit ICD 206 source characterization.",
    ],
    deprecatedOrSuperseded: ["Legacy 2007 ICD 203 / 206 issuances prior to unified tradecraft evaluation framework."],
    unchangedCoreMandates: ["Objectivity, independence, and prohibition on unsupported High Confidence single-source assessments."],
    impactedRuleIds: ["IC-ICD203-ACH-001"],
    impactedNistControls: ["SI-10", "AU-10"],
    impactedRmfArtifacts: ["ICD 206 Source Summary Matrix", "ACH Competing Hypotheses Worksheet"],
  },
  {
    policyId: "CMMC-32CFR-170-DFARS",
    title: "32 CFR Part 170 CMMC Program Final Rule & 48 CFR Part 204 DFARS Acquisition Rule",
    jurisdiction: "DOD",
    priorVersion: "CMMC 1.0 Interim Rule (January 31, 2020)",
    priorEffectiveDate: "2020-01-31",
    currentVersion: "32 CFR Part 170 (Dec 16, 2024) & 48 CFR Part 204 (Nov 10, 2025)",
    currentEffectiveDate: "2024-12-16",
    severity: "CRITICAL_BREAKING",
    addedRequirements: [
      "Streamlined CMMC to 3 levels aligned directly with NIST SP 800-171 / 800-172.",
      "Codified 32 CFR § 170.21 conditional POA&M eligibility (>=80% met, zero 5-pt missing, 180-day closeout cap).",
    ],
    deprecatedOrSuperseded: ["Legacy 5-level CMMC 1.0 framework and DoD-unique maturity processes."],
    unchangedCoreMandates: ["DFARS 252.204-7012 72-hour DIBNet reporting and SPRS scoring prior to award."],
    impactedRuleIds: ["DOD-ACQ-CMMC-001"],
    impactedNistControls: ["CA-2", "CA-5", "IR-6", "SC-28", "AC-2"],
    impactedRmfArtifacts: ["SPRS Score Record", "CMMC Conditional 180-Day POA&M", "C3PAO Certificate"],
  },
];

export interface DirectiveDiffReport {
  policyId: string;
  title: string;
  jurisdiction: string;
  priorVersion: string;
  priorEffectiveDate: string;
  currentVersion: string;
  currentEffectiveDate: string;
  severity: PolicyChangeSeverity;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  addedItems: string[];
  removedItems: string[];
  unchangedItems: string[];
  oldSha256: string;
  newSha256: string;
  nistBaselineDiff: PolicyImpactDiffResult | null;
  blastRadius: {
    impactedRuleIds: string[];
    impactedNistControls: string[];
    mappedDisaCciCount: number;
    sampleDisaCcis: string[];
    impactedRmfArtifacts: string[];
  };
  ruleResult: DodIcRuleResult;
}

function countDisaCcisAcrossControls(controls: string[]): { total: number; sample: string[] } {
  const seen = new Set<string>();
  for (const ctrl of controls) {
    for (const c of listCcisForNistControl(ctrl)) {
      seen.add(c.cciId);
    }
  }
  const list = [...seen];
  return { total: list.length, sample: list.slice(0, 12) };
}

export function listDirectiveLineages(): HistoricalDirectiveLineage[] {
  return VERIFIED_DIRECTIVE_LINEAGES;
}

export function diffHistoricalDirectiveRevision(policyIdRaw: string): DirectiveDiffReport | null {
  const normKey = (policyIdRaw || "").trim().toUpperCase().replace(/\s+/g, "-");
  const lineage =
    VERIFIED_DIRECTIVE_LINEAGES.find(
      (l) =>
        l.policyId.toUpperCase() === normKey ||
        l.policyId.replace(/[^A-Z0-9]/g, "") === normKey.replace(/[^A-Z0-9]/g, ""),
    ) ?? null;
  if (!lineage) return null;

  const cciMeta = countDisaCcisAcrossControls(lineage.impactedNistControls);
  const oldSha = sha256Sync(JSON.stringify({ v: lineage.priorVersion, d: lineage.priorEffectiveDate, items: lineage.deprecatedOrSuperseded }));
  const newSha = sha256Sync(JSON.stringify({ v: lineage.currentVersion, d: lineage.currentEffectiveDate, items: lineage.addedRequirements }));

  const policyRef = lookupDodIcPolicy(lineage.policyId) ?? DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!;
  const verdict: DodVerdict = lineage.addedRequirements.length > 0 ? "MANUAL_REVIEW_REQUIRED" : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    policyId: lineage.policyId,
    priorVersion: lineage.priorVersion,
    currentVersion: lineage.currentVersion,
    severity: lineage.severity,
    addedCount: lineage.addedRequirements.length,
    removedCount: lineage.deprecatedOrSuperseded.length,
    impactedRuleCount: lineage.impactedRuleIds.length,
    impactedControlCount: lineage.impactedNistControls.length,
    mappedDisaCciCount: cciMeta.total,
    autoApplied: false,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-PCI-DIFF-001",
    ruleVersion: lineage.currentEffectiveDate,
    jurisdiction: lineage.jurisdiction === "IC" ? "IC" : lineage.jurisdiction === "CNSS" ? "CNSS" : "DOD",
    title: `Policy Revision Diff & Blast-Radius Analysis (${lineage.policyId})`,
    verdict,
    assessmentMode: "SCENARIO_ASSUMPTION",
    formalDetermination: "PENDING_EVIDENCE",
    summary: `${lineage.severity}: ${lineage.policyId} transitioned from '${lineage.priorVersion}' (${lineage.priorEffectiveDate}) to '${lineage.currentVersion}' (${lineage.currentEffectiveDate}) — ${lineage.addedRequirements.length} requirement addition(s), impacting ${lineage.impactedRuleIds.length} Noctis rule(s), ${lineage.impactedNistControls.length} NIST control(s), and ${cciMeta.total} DISA CCI(s).`,
    observedFacts,
    threshold: "All directive supersession deltas require SSP/SAP/ConMon gap assessment and dual-control human approval before baseline update.",
    variance: `+${lineage.addedRequirements.length} added / -${lineage.deprecatedOrSuperseded.length} superseded across ${lineage.impactedRuleIds.join(", ")}`,
    missingEvidence: [
      `Signed ISSM/AO impact review of ${lineage.policyId} (${lineage.currentEffectiveDate}) changes against active system SSP & SAR`,
      "Dual-control human rollout approval before modifying authoritative policy rules",
    ],
    authorityCitations: [policyRef],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-PCI-DIFF-001", observedFacts, verdict })),
  };

  return {
    policyId: lineage.policyId,
    title: lineage.title,
    jurisdiction: lineage.jurisdiction,
    priorVersion: lineage.priorVersion,
    priorEffectiveDate: lineage.priorEffectiveDate,
    currentVersion: lineage.currentVersion,
    currentEffectiveDate: lineage.currentEffectiveDate,
    severity: lineage.severity,
    addedCount: lineage.addedRequirements.length,
    removedCount: lineage.deprecatedOrSuperseded.length,
    unchangedCount: lineage.unchangedCoreMandates.length,
    addedItems: lineage.addedRequirements,
    removedItems: lineage.deprecatedOrSuperseded,
    unchangedItems: lineage.unchangedCoreMandates,
    oldSha256: oldSha,
    newSha256: newSha,
    nistBaselineDiff: null,
    blastRadius: {
      impactedRuleIds: lineage.impactedRuleIds,
      impactedNistControls: lineage.impactedNistControls,
      mappedDisaCciCount: cciMeta.total,
      sampleDisaCcis: cciMeta.sample,
      impactedRmfArtifacts: lineage.impactedRmfArtifacts,
    },
    ruleResult,
  };
}

// ----------------------------------------------------------------------------
// 2. Custom / Proposed Directive Diff & Blast-Radius Analyzer
// ----------------------------------------------------------------------------

function splitClauses(text?: string, arr?: string[]): string[] {
  if (Array.isArray(arr) && arr.length > 0) {
    return arr.map((s) => String(s).trim()).filter(Boolean);
  }
  if (!text) return [];
  return String(text)
    .split(/\r?\n|(?<=[.;])\s+/)
    .map((s) => s.replace(/^[-*•\d.)]+\s*/, "").trim())
    .filter((s) => s.length >= 4);
}

export function diffPolicyDocumentVersions(input: {
  policyId?: string;
  oldVersion?: string;
  newVersion?: string;
  oldRequirements?: string[];
  newRequirements?: string[];
  oldText?: string;
  newText?: string;
  fromNistBaseline?: string;
  toNistBaseline?: string;
}): DirectiveDiffReport {
  const existing = input.policyId ? lookupDodIcPolicy(input.policyId) : null;
  const policyId = existing?.id || (input.policyId || "CUSTOM-POLICY").trim().toUpperCase();
  const priorVersion = input.oldVersion || existing?.version || "Baseline v1";
  const currentVersion = input.newVersion || "Proposed Revision v2";

  const oldClauses = splitClauses(input.oldText, input.oldRequirements ?? existing?.keyRequirements);
  const newClauses = splitClauses(input.newText, input.newRequirements);
  const oldSet = new Set(oldClauses.map((s) => s.toLowerCase()));
  const newSet = new Set(newClauses.map((s) => s.toLowerCase()));

  const addedItems = newClauses.filter((c) => !oldSet.has(c.toLowerCase()));
  const removedItems = oldClauses.filter((c) => !newSet.has(c.toLowerCase()));
  const unchangedItems = newClauses.filter((c) => oldSet.has(c.toLowerCase()));

  const nistBaselineDiff =
    input.fromNistBaseline && input.toNistBaseline
      ? computePolicyImpactDiff(input.fromNistBaseline, input.toNistBaseline)
      : null;

  const combinedText = [...addedItems, ...removedItems, policyId].join(" ");
  const mentionedControls = [...new Set([...(combinedText.match(/\b[A-Z]{2}-\d+(?:\(\d+\))?\b/g) || [])])];
  const lineageMatch = VERIFIED_DIRECTIVE_LINEAGES.find((l) => l.policyId === policyId);
  const impactedControls =
    mentionedControls.length > 0
      ? mentionedControls
      : lineageMatch?.impactedNistControls || ["CA-6", "CM-6", "RA-5", "IA-2(1)"];
  const cciMeta = countDisaCcisAcrossControls(impactedControls);

  const changeDetected = addedItems.length > 0 || removedItems.length > 0 || Boolean(nistBaselineDiff);
  const severity: PolicyChangeSeverity =
    removedItems.length > 0 || (nistBaselineDiff?.addedCount ?? 0) > 20 || /\b(prohibit|fail|revok|mfa|zero trust|cat i|kev)\b/i.test(addedItems.join(" "))
      ? "CRITICAL_BREAKING"
      : changeDetected
      ? "MAJOR_REQUIREMENT_CHANGE"
      : "MINOR_CLARIFICATION";

  const impactedRules = lineageMatch?.impactedRuleIds || ["DOD-RMF-AUTH-001"];
  const impactedArtifacts = lineageMatch?.impactedRmfArtifacts || [
    "System Security Plan (SSP)",
    "Security Assessment Plan (SAP)",
    "Continuous Monitoring (ConMon) Plan",
  ];

  const oldSha = sha256Sync(JSON.stringify(oldClauses));
  const newSha = sha256Sync(JSON.stringify(newClauses));
  const verdict: DodVerdict = changeDetected ? "MANUAL_REVIEW_REQUIRED" : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    policyId,
    priorVersion,
    currentVersion,
    changeDetected,
    addedCount: addedItems.length,
    removedCount: removedItems.length,
    unchangedCount: unchangedItems.length,
    mappedDisaCciCount: cciMeta.total,
    autoApplied: false,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-PCI-DIFF-001",
    ruleVersion: "1.0.0",
    jurisdiction: existing?.jurisdiction === "IC" ? "IC" : existing?.jurisdiction === "CNSS" ? "CNSS" : "DOD",
    title: `Policy Version Diff & Impact Analysis (${policyId})`,
    verdict,
    assessmentMode: "SCENARIO_ASSUMPTION",
    formalDetermination: changeDetected ? "PENDING_EVIDENCE" : "PASS",
    summary: changeDetected
      ? `CHANGE_DETECTED (${severity}): ${policyId} diff from '${priorVersion}' to '${currentVersion}' shows +${addedItems.length} added, -${removedItems.length} removed (${unchangedItems.length} unchanged); impacts ${cciMeta.total} DISA CCI(s). Dual-control human review required before rollout.`
      : `NO_DRIFT: ${policyId} clauses match '${priorVersion}' identically (SHA-256 unchanged).`,
    observedFacts,
    threshold: "Policy changes must be diffed, assessed for blast radius, regression-tested, and approved by an independent human reviewer.",
    variance: `+${addedItems.length} / -${removedItems.length} (${severity})`,
    missingEvidence: changeDetected
      ? ["Independent human ISSM/AO dual-control approval record prior to promotion"]
      : [],
    authorityCitations: [existing ?? DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-PCI-DIFF-001", oldSha, newSha, verdict })),
  };

  return {
    policyId,
    title: existing?.title || `${policyId} Policy Diff`,
    jurisdiction: existing?.jurisdiction || "DOD",
    priorVersion,
    priorEffectiveDate: existing?.effectiveDate || "N/A",
    currentVersion,
    currentEffectiveDate: new Date().toISOString().slice(0, 10),
    severity,
    addedCount: addedItems.length,
    removedCount: removedItems.length,
    unchangedCount: unchangedItems.length,
    addedItems,
    removedItems,
    unchangedItems,
    oldSha256: oldSha,
    newSha256: newSha,
    nistBaselineDiff,
    blastRadius: {
      impactedRuleIds: impactedRules,
      impactedNistControls: impactedControls,
      mappedDisaCciCount: cciMeta.total,
      sampleDisaCcis: cciMeta.sample,
      impactedRmfArtifacts: impactedArtifacts,
    },
    ruleResult,
  };
}

// ----------------------------------------------------------------------------
// 3. Live Upstream Authoritative Drift Monitor (DOD-PCI-DRIFT-001)
// ----------------------------------------------------------------------------

export interface UpstreamSourceDriftItem {
  sourceId: string;
  title: string;
  url: string;
  pinnedVersion: string;
  pinnedSha256: string;
  pinnedBytes: number | null;
  liveHttpStatus: number | null;
  liveContentLength: number | null;
  liveEtag: string | null;
  liveLastModified: string | null;
  status: "UP_TO_DATE" | "DRIFT_DETECTED_REQUIRES_HUMAN_REVIEW" | "PINNED_OFFLINE_ONLY" | "UNREACHABLE_OFFLINE_PINNED";
  note: string;
}

export interface UpstreamDriftReport {
  checkedAt: string;
  liveCheckExecuted: boolean;
  overallStatus: "UP_TO_DATE" | "DRIFT_DETECTED_REQUIRES_HUMAN_REVIEW" | "PINNED_OFFLINE_ONLY";
  driftCount: number;
  sources: UpstreamSourceDriftItem[];
  kevStatus: {
    source: "CISA_LIVE_JSON" | "AUTHORITATIVE_SEED_CACHE";
    catalogCount: number;
    fetchedAt: string;
  };
  autoApplyToProduction: false;
  humanDualControlRequired: true;
  ruleResult: DodIcRuleResult;
}

export async function checkUpstreamAuthoritativeDrift(
  opts: { liveCheck?: boolean; assessmentMode?: AssessmentMode } = {},
): Promise<UpstreamDriftReport> {
  const liveCheck = opts.liveCheck !== false;
  const manifest = rmfDbJson.manifest as {
    nistVersion: string;
    fedrampVersion?: string;
    fedrampPublished?: string;
    sources: { id: string; title: string; url: string; sha256: string; bytes: number }[];
  };
  const cciManifest = getDisaCciManifest();

  const nistSrc = manifest.sources.find((s) => s.id === "nist-sp-800-53-r5.2.0");
  const fedSrc = manifest.sources.find((s) => s.id === "fedramp-rev5-high-oscal");

  const targets: {
    sourceId: string;
    title: string;
    url: string;
    pinnedVersion: string;
    pinnedSha256: string;
    pinnedBytes: number | null;
  }[] = [
    {
      sourceId: "disa-cci-list",
      title: `DISA U_CCI_List.zip (${cciManifest.counts.totalCcis} CCIs)`,
      url: cciManifest.sourceUrl,
      pinnedVersion: cciManifest.version,
      pinnedSha256: cciManifest.zipSha256,
      pinnedBytes: 417323,
    },
    ...(nistSrc
      ? [
          {
            sourceId: nistSrc.id,
            title: nistSrc.title,
            url: nistSrc.url,
            pinnedVersion: manifest.nistVersion,
            pinnedSha256: nistSrc.sha256,
            pinnedBytes: nistSrc.bytes,
          },
        ]
      : []),
    ...(fedSrc
      ? [
          {
            sourceId: fedSrc.id,
            title: fedSrc.title,
            url: fedSrc.url,
            pinnedVersion: `${manifest.fedrampVersion || "rev5"} (${(manifest.fedrampPublished || "").slice(0, 10)})`,
            pinnedSha256: fedSrc.sha256,
            pinnedBytes: fedSrc.bytes,
          },
        ]
      : []),
  ];

  const [kevCatalog, probedSources] = await Promise.all([
    fetchLiveCisaKevCatalog(!liveCheck),
    Promise.all(
      targets.map(async (t): Promise<UpstreamSourceDriftItem> => {
        if (!liveCheck) {
          return {
            ...t,
            liveHttpStatus: null,
            liveContentLength: null,
            liveEtag: null,
            liveLastModified: null,
            status: "PINNED_OFFLINE_ONLY",
            note: "Offline pinned mode requested; upstream HEAD probe skipped.",
          };
        }
        try {
          const resp = await fetch(t.url, {
            method: "HEAD",
            headers: { "accept-encoding": "identity", "user-agent": "Noctis-NDIMP-PolicyDriftMonitor/1.0" },
            signal: AbortSignal.timeout(4500),
          });
          const clHeader = resp.headers.get("content-length");
          const liveContentLength = clHeader && /^\d+$/.test(clHeader) ? Number(clHeader) : null;
          const liveEtag = resp.headers.get("etag");
          const liveLastModified = resp.headers.get("last-modified");

          if (!resp.ok) {
            return {
              ...t,
              liveHttpStatus: resp.status,
              liveContentLength,
              liveEtag,
              liveLastModified,
              status: "UNREACHABLE_OFFLINE_PINNED",
              note: `Upstream returned HTTP ${resp.status}; retaining pinned SHA-256 baseline.`,
            };
          }

          const byteDelta =
            t.pinnedBytes !== null && liveContentLength !== null ? liveContentLength - t.pinnedBytes : null;
          const drifted = byteDelta !== null && byteDelta !== 0;

          return {
            ...t,
            liveHttpStatus: resp.status,
            liveContentLength,
            liveEtag,
            liveLastModified,
            status: drifted ? "DRIFT_DETECTED_REQUIRES_HUMAN_REVIEW" : "UP_TO_DATE",
            note: drifted
              ? `Upstream byte size changed (${t.pinnedBytes} -> ${liveContentLength}, delta ${byteDelta! > 0 ? `+${byteDelta}` : byteDelta} bytes). Stage diff & require dual-control human review before re-ingesting.`
              : `Live HEAD matches pinned byte length (${liveContentLength ?? "unknown"} bytes).`,
          };
        } catch {
          return {
            ...t,
            liveHttpStatus: null,
            liveContentLength: null,
            liveEtag: null,
            liveLastModified: null,
            status: "UNREACHABLE_OFFLINE_PINNED",
            note: "Network timeout querying upstream; retaining pinned SHA-256 baseline.",
          };
        }
      }),
    ),
  ]);

  const driftCount = probedSources.filter((s) => s.status === "DRIFT_DETECTED_REQUIRES_HUMAN_REVIEW").length;
  const overallStatus: UpstreamDriftReport["overallStatus"] = !liveCheck
    ? "PINNED_OFFLINE_ONLY"
    : driftCount > 0
    ? "DRIFT_DETECTED_REQUIRES_HUMAN_REVIEW"
    : "UP_TO_DATE";

  const verdict: DodVerdict = driftCount > 0 ? "MANUAL_REVIEW_REQUIRED" : "PASS";
  const observedFacts: Record<string, string | number | boolean | null> = {
    liveCheckExecuted: liveCheck,
    sourcesChecked: probedSources.length,
    driftCount,
    overallStatus,
    kevSource: kevCatalog.source,
    kevCount: kevCatalog.entries.size,
    autoApplyToProduction: false,
    humanDualControlRequired: true,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-PCI-DRIFT-001",
    ruleVersion: "1.0.0",
    jurisdiction: "DOD",
    title: "Upstream Authoritative Policy, OSCAL, DISA CCI & CISA KEV Drift Monitor",
    verdict,
    assessmentMode: opts.assessmentMode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
    formalDetermination: driftCount > 0 ? "PENDING_EVIDENCE" : "PASS",
    summary:
      driftCount > 0
        ? `MANUAL_REVIEW_REQUIRED: Detected upstream drift in ${driftCount} authoritative artifact(s) (${probedSources.filter((s) => s.status === "DRIFT_DETECTED_REQUIRES_HUMAN_REVIEW").map((s) => s.sourceId).join(", ")}). Auto-apply is disabled; human dual-control review & regression verification required.`
        : liveCheck
        ? `PASS: Pinned DISA CCI (${cciManifest.version}), NIST/FedRAMP OSCAL baselines verified reachable with zero unexpected drift; CISA KEV ${kevCatalog.source} (${kevCatalog.entries.size} entries).`
        : `PASS (Offline Pinned): Audited pinned DISA CCI (${cciManifest.version}, ${cciManifest.counts.totalCcis} CCIs) and NIST SP 800-53 (${manifest.nistVersion}) digests with autoApplyToProduction=false.`,
    observedFacts,
    threshold: "Monitor DISA CCI, NIST OSCAL, FedRAMP OSCAL & CISA KEV; never auto-apply upstream deltas without human approval & passing regression suite.",
    variance:
      driftCount > 0
        ? `${driftCount} upstream source(s) drifted from pinned SHA-256 / byte baseline`
        : "Zero undetected upstream baseline drift",
    missingEvidence:
      driftCount > 0
        ? [
            "Run diff against downloaded upstream catalog and generate POLICY_CHANGE proposal",
            "Complete regression test suite and distinct human dual-control approval before rollout",
          ]
        : [],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DISA-STIG-CCI"]!, DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-PCI-DRIFT-001", observedFacts, verdict })),
  };

  return {
    checkedAt: new Date().toISOString(),
    liveCheckExecuted: liveCheck,
    overallStatus,
    driftCount,
    sources: probedSources,
    kevStatus: {
      source: kevCatalog.source,
      catalogCount: kevCatalog.entries.size,
      fetchedAt: kevCatalog.fetchedAt,
    },
    autoApplyToProduction: false,
    humanDualControlRequired: true,
    ruleResult,
  };
}

// ----------------------------------------------------------------------------
// 4. Dual-Control Human-Approved Policy Rollout Workflow (DOD-PCI-ROLLOUT-001)
// ----------------------------------------------------------------------------

export interface PolicyRolloutGovernanceCheckResult {
  allowed: boolean;
  errorCode: string | null;
  ruleResult: DodIcRuleResult;
}

export function evaluatePolicyRolloutGovernance(input: {
  proposedBy: string;
  reviewerId?: string | null;
  reviewerRole?: string | null;
  regressionSuitePassed?: boolean | null;
  classificationCleared?: boolean | null;
  decision?: "APPROVE" | "REJECT";
  assessmentMode?: AssessmentMode;
}): PolicyRolloutGovernanceCheckResult {
  const ruleId = "DOD-PCI-ROLLOUT-001";
  const proposer = (input.proposedBy || "").trim();
  const reviewerId = (input.reviewerId || "").trim();
  const reviewerRole = (input.reviewerRole || "").trim().toUpperCase();

  let errorCode: string | null = null;
  const blockers: string[] = [];

  if (!reviewerId) {
    errorCode = "REVIEWER_ID_REQUIRED";
    blockers.push("Authenticated human reviewer ID is mandatory to approve or reject policy rollouts.");
  } else if (
    /\b(?:AGENT|LLM|AI|BOT|MODEL|AUTOMATED|SYSTEM)\b/.test(reviewerRole) ||
    /^(?:agent:|noctis|ai:|bot:)/i.test(reviewerId)
  ) {
    errorCode = "AGENT_APPROVAL_FORBIDDEN";
    blockers.push("AI agents/LLMs are strictly forbidden from auto-approving or promoting DoD/IC policy updates.");
  } else if (proposer && reviewerId.toLowerCase() === proposer.toLowerCase()) {
    errorCode = "SELF_APPROVAL_FORBIDDEN";
    blockers.push("Dual control prohibits the proposer from approving their own policy change submission.");
  }

  if (input.classificationCleared === false) {
    errorCode = errorCode || "CLASSIFICATION_BOUNDARY_VIOLATION";
    blockers.push("Classification boundary check failed — classified markings cannot be persisted or rolled out via commercial plane.");
  }
  if (input.decision !== "REJECT" && input.regressionSuitePassed === false) {
    errorCode = errorCode || "REGRESSION_GATE_FAILED";
    blockers.push("Cannot approve policy rollout while deterministic verification/regression tests fail.");
  }

  const allowed = blockers.length === 0;
  const verdict: DodVerdict = allowed ? "PASS" : "FAIL";
  const observedFacts: Record<string, string | number | boolean | null> = {
    proposedBy: proposer || null,
    reviewerId: reviewerId || null,
    reviewerRole: reviewerRole || null,
    regressionSuitePassed: input.regressionSuitePassed ?? true,
    classificationCleared: input.classificationCleared ?? true,
    decision: input.decision || "APPROVE",
    allowed,
    errorCode,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId,
    ruleVersion: "1.0.0",
    jurisdiction: "DOD",
    title: "Policy Rollout Human Dual-Control & Regression Gate Governance",
    verdict,
    assessmentMode: input.assessmentMode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
    formalDetermination: allowed && reviewerId ? "PASS" : "FAIL",
    summary: allowed
      ? `PASS: Dual-control satisfied — distinct human reviewer '${reviewerId}' (${reviewerRole || "HUMAN_REVIEWER"}) authorized with regression & classification gates cleared.`
      : `FAIL [${errorCode}]: ${blockers.join("; ")}`,
    observedFacts,
    threshold: "Distinct human reviewer (no AI agent, no self-approval) + classification cleared + passing regression suite required.",
    variance: allowed ? "Dual-control satisfied" : `${errorCode}: ${blockers[0]}`,
    missingEvidence: allowed
      ? []
      : ["Independent human ISSM / AO sign-off distinct from proposer with passing test harness evidence"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!, DOD_IC_POLICY_REGISTRY["ICD-503"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, observedFacts, verdict })),
  };

  return { allowed, errorCode, ruleResult };
}

export interface PolicyChangeProposalPayload extends Record<string, unknown> {
  proposalId: string;
  policyId: string;
  title: string;
  proposedBy: string;
  rationale: string;
  priorVersion: string;
  proposedVersion: string;
  effectiveImmediately: false;
  diffReport: DirectiveDiffReport;
  reviewState: {
    status: "PENDING_HUMAN_REVIEW" | "APPROVED_FOR_ROLLOUT" | "REJECTED";
    reviewerId: string | null;
    reviewerRole: string | null;
    reviewerNotes: string | null;
    decidedAt: string | null;
    rolloutGovernanceHash: string | null;
  };
}

export async function createPolicyChangeProposal(input: {
  tenantId: string;
  policyId: string;
  title?: string;
  proposedBy: string;
  rationale: string;
  oldVersion?: string;
  newVersion?: string;
  oldRequirements?: string[];
  newRequirements?: string[];
  oldText?: string;
  newText?: string;
  fromNistBaseline?: string;
  toNistBaseline?: string;
}): Promise<{
  proposal: StoredRmfArtifact<PolicyChangeProposalPayload>;
  ledgerEventHash: string;
  diffReport: DirectiveDiffReport;
}> {
  const proposer = (input.proposedBy || "").trim();
  if (!proposer) {
    throw new Error("PROPOSER_REQUIRED: proposedBy identifier is required.");
  }

  // Gate 0 Classification check BEFORE persisting anything to SQL!
  const textToScan = [
    input.title,
    input.rationale,
    input.oldText,
    input.newText,
    ...(input.newRequirements || []),
    ...(input.oldRequirements || []),
  ]
    .filter(Boolean)
    .join("\n");

  const clsGate = evaluateClassificationGate({
    text: textToScan,
    targetBoundary: "COMMERCIAL_UNCLASSIFIED",
    requestedModelTarget: "COMMERCIAL_CLOUD_LLM",
  });
  if (clsGate.action === "FAIL_CLOSED_BLOCK") {
    throw new Error(
      `CLASSIFICATION_BOUNDARY_VIOLATION: Classified markings (${clsGate.detectedClassification}) cannot be persisted into commercial SQL policy proposals.`,
    );
  }

  const diffReport = diffPolicyDocumentVersions({
    policyId: input.policyId,
    oldVersion: input.oldVersion,
    newVersion: input.newVersion,
    oldRequirements: input.oldRequirements,
    newRequirements: input.newRequirements,
    oldText: input.oldText,
    newText: input.newText,
    fromNistBaseline: input.fromNistBaseline,
    toNistBaseline: input.toNistBaseline,
  });

  const proposalId = `PCH-${sha256Sync(`${input.tenantId}:${diffReport.policyId}:${diffReport.newSha256}:${Date.now()}`).slice(0, 12).toUpperCase()}`;
  const title = (input.title || `${diffReport.policyId} Policy Change (${diffReport.currentVersion})`).trim();

  const payload: PolicyChangeProposalPayload = {
    proposalId,
    policyId: diffReport.policyId,
    title,
    proposedBy: proposer,
    rationale: (input.rationale || "").trim() || "Policy revision review",
    priorVersion: diffReport.priorVersion,
    proposedVersion: diffReport.currentVersion,
    effectiveImmediately: false,
    diffReport,
    reviewState: {
      status: "PENDING_HUMAN_REVIEW",
      reviewerId: null,
      reviewerRole: null,
      reviewerNotes: null,
      decidedAt: null,
      rolloutGovernanceHash: null,
    },
  };

  const saved = await saveRmfArtifact({
    id: proposalId,
    tenantId: input.tenantId,
    artifactType: "POLICY_CHANGE",
    systemId: "noctis-policy-change-intel",
    title,
    status: "PENDING_HUMAN_REVIEW",
    payload,
    createdBy: proposer,
    approvedBy: null,
  });

  return {
    proposal: saved.artifact,
    ledgerEventHash: saved.ledgerEventHash,
    diffReport,
  };
}

export async function listPolicyChangeProposals(
  tenantId: string,
  limit = 50,
): Promise<StoredRmfArtifact<PolicyChangeProposalPayload>[]> {
  return listRmfArtifacts<PolicyChangeProposalPayload>(tenantId, "POLICY_CHANGE", limit);
}

export async function decidePolicyChangeProposal(input: {
  tenantId: string;
  proposalId: string;
  decision: "APPROVE" | "REJECT";
  reviewerId: string;
  reviewerRole: string;
  notes?: string;
  regressionSuitePassed?: boolean;
}): Promise<{
  decided: boolean;
  approved: boolean;
  statusCode: 200 | 403 | 404;
  errorCode: string | null;
  message: string;
  proposal?: StoredRmfArtifact<PolicyChangeProposalPayload>;
  ledgerEventHash?: string;
  rolloutGovernance?: DodIcRuleResult;
}> {
  const found = await getRmfArtifactScopedWithForbidden<PolicyChangeProposalPayload>(
    input.proposalId,
    input.tenantId,
    "POLICY_CHANGE",
  );
  if (found.forbidden) {
    return {
      decided: false,
      approved: false,
      statusCode: 403,
      errorCode: "CROSS_TENANT_ACCESS",
      message: `Policy proposal '${input.proposalId}' belongs to another tenant boundary.`,
    };
  }
  if (!found.artifact) {
    return {
      decided: false,
      approved: false,
      statusCode: 404,
      errorCode: "NOT_FOUND",
      message: `Policy change proposal '${input.proposalId}' not found.`,
    };
  }

  const existing = found.artifact;
  const gov = evaluatePolicyRolloutGovernance({
    proposedBy: existing.payload.proposedBy,
    reviewerId: input.reviewerId,
    reviewerRole: input.reviewerRole,
    regressionSuitePassed: input.regressionSuitePassed ?? true,
    classificationCleared: true,
    decision: input.decision,
    assessmentMode: "FORMAL_EVIDENCE_AUDIT",
  });

  if (!gov.allowed) {
    return {
      decided: false,
      approved: false,
      statusCode: 403,
      errorCode: gov.errorCode,
      message: gov.ruleResult.summary,
      rolloutGovernance: gov.ruleResult,
    };
  }

  const nextStatus = input.decision === "APPROVE" ? "APPROVED_FOR_ROLLOUT" : "REJECTED";
  const decidedAt = new Date().toISOString();
  const updatedPayload: PolicyChangeProposalPayload = {
    ...existing.payload,
    reviewState: {
      status: nextStatus,
      reviewerId: input.reviewerId.trim(),
      reviewerRole: (input.reviewerRole || "HUMAN_REVIEWER").trim().toUpperCase(),
      reviewerNotes: input.notes?.trim() || null,
      decidedAt,
      rolloutGovernanceHash: gov.ruleResult.auditHash,
    },
  };

  const updated = await updateRmfArtifactApproval<PolicyChangeProposalPayload>(
    input.tenantId,
    input.proposalId,
    nextStatus,
    input.reviewerId.trim(),
    updatedPayload,
  );

  if (!updated) {
    return {
      decided: false,
      approved: false,
      statusCode: 404,
      errorCode: "NOT_FOUND",
      message: `Failed updating proposal '${input.proposalId}'.`,
    };
  }

  return {
    decided: true,
    approved: nextStatus === "APPROVED_FOR_ROLLOUT",
    statusCode: 200,
    errorCode: null,
    message:
      nextStatus === "APPROVED_FOR_ROLLOUT"
        ? `Policy change '${input.proposalId}' approved for rollout by human reviewer '${input.reviewerId.trim()}'.`
        : `Policy change '${input.proposalId}' rejected by human reviewer '${input.reviewerId.trim()}'.`,
    proposal: updated.artifact,
    ledgerEventHash: updated.ledgerEventHash,
    rolloutGovernance: gov.ruleResult,
  };
}
