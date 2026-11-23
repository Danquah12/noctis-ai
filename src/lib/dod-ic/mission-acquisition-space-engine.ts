/**
 * Noctis Mission Assurance, Acquisition/CMMC/FOCI & Space/Spectrum/MBSE Engine (NDIMP Wave 4)
 *
 * Implements:
 *  - DOD-MA-3020-001: DoDI 3020.45 / DoDD 3020.40 Mission Assurance MEF/PMEF Dependency DAG & SPOF Analysis
 *  - DOD-ACQ-CMMC-001: 32 CFR Part 170 CMMC Final Rule, DFARS 252.204-7012/7019/7020/7021, FAR 52.204-21 & 32 CFR Part 117 FOCI
 *  - DOD-SPACE-MBSE-001: Space Policy Directive-5 (SPD-5), DoDI 4650.01 Spectrum, DoDI 5000.97 MBSE & Ao = MTBF/(MTBF+MTTR)
 */

import { sha256Sync } from "../universal-crypto.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY } from "./policy-registry.ts";

export interface MissionAssuranceSpof {
  assetId: string;
  assetName: string;
  impactedMefs: string[];
  blastRadiusPercent: number;
}

export interface MissionAssuranceDagResult {
  ruleResult: DodIcRuleResult;
  hasCycle: boolean;
  spofs: MissionAssuranceSpof[];
  missionReadinessScore: number;
}

/** Analyzes MEF/PMEF-to-asset dependency DAG for cycles, Single Points of Failure (SPOFs), and blast radius. */
export function evaluateMissionAssuranceDag(input: {
  mefs?: { id: string; name: string; critical: boolean }[];
  assets?: {
    id: string;
    name: string;
    redundant: boolean;
    backupAssetId?: string | null;
    operationalStatus?: "UP" | "DEGRADED" | "DOWN";
  }[];
  dependencies?: { fromId: string; toId: string }[];
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): MissionAssuranceDagResult {
  const mode: AssessmentMode = input.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const mefs = input.mefs ?? [];
  const assets = input.assets ?? [];
  const deps = input.dependencies ?? [];

  const adj = new Map<string, string[]>();
  for (const d of deps) {
    const list = adj.get(d.fromId) ?? [];
    list.push(d.toId);
    adj.set(d.fromId, list);
  }

  // DFS cycle detection
  const state = new Map<string, 0 | 1 | 2>();
  let hasCycle = false;
  const dfsCycle = (node: string) => {
    state.set(node, 1);
    for (const next of adj.get(node) ?? []) {
      const s = state.get(next) ?? 0;
      if (s === 1) hasCycle = true;
      else if (s === 0) dfsCycle(next);
    }
    state.set(node, 2);
  };
  for (const k of adj.keys()) {
    if ((state.get(k) ?? 0) === 0) dfsCycle(k);
  }

  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const assetImpactedMefs = new Map<string, Set<string>>();
  for (const a of assets) assetImpactedMefs.set(a.id, new Set());

  for (const mef of mefs) {
    const visited = new Set<string>();
    const stack = [...(adj.get(mef.id) ?? [])];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      if (assetImpactedMefs.has(cur)) assetImpactedMefs.get(cur)!.add(mef.id);
      for (const nxt of adj.get(cur) ?? []) stack.push(nxt);
    }
  }

  const spofs: MissionAssuranceSpof[] = [];
  const blockers: string[] = [];
  if (hasCycle) blockers.push("Dependency graph contains a circular dependency cycle");

  for (const asset of assets) {
    const impacted = [...(assetImpactedMefs.get(asset.id) ?? [])];
    const impactedCritical = impacted.filter((mId) => mefs.find((m) => m.id === mId)?.critical);
    const hasBackup = asset.redundant || Boolean(asset.backupAssetId && assetMap.has(asset.backupAssetId));
    if (impactedCritical.length > 0 && !hasBackup) {
      const blastPct = mefs.length > 0 ? Math.round((impacted.length / mefs.length) * 100) : 100;
      spofs.push({ assetId: asset.id, assetName: asset.name, impactedMefs: impacted, blastRadiusPercent: blastPct });
      blockers.push(`SPOF ${asset.id} ("${asset.name}") lacks redundancy and impacts ${blastPct}% of MEFs [${impacted.join(", ")}]`);
    }
    if (impactedCritical.length > 0 && asset.operationalStatus === "DOWN") {
      blockers.push(`Critical dependency ${asset.id} is DOWN`);
    }
  }

  const hasAnySignal = mefs.length > 0 || assets.length > 0;
  const penalty = spofs.length * 30 + (hasCycle ? 40 : 0);
  const readinessScore = hasAnySignal ? Math.max(0, 100 - penalty) : 0;
  const verdict: DodVerdict = !hasAnySignal ? "INSUFFICIENT_EVIDENCE" : blockers.length > 0 ? "FAIL" : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    mefCount: mefs.length,
    assetCount: assets.length,
    spofCount: spofs.length,
    hasCycle,
    missionReadinessScore: readinessScore,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-MA-3020-001",
    ruleVersion: "2022.05.02",
    jurisdiction: "DOD",
    title: "Mission Assurance MEF/PMEF Dependency DAG & SPOF Analysis (DoDI 3020.45 / DoDD 3020.40)",
    verdict,
    assessmentMode: mode,
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      blockers.length > 0
        ? `FAIL [DOD-MA-3020-001]: ${blockers.join("; ")}.`
        : `PASS [DOD-MA-3020-001]: DAG acyclic across ${mefs.length} MEF(s) and ${assets.length} asset(s) with 0 critical SPOFs (Readiness ${readinessScore}/100).`,
    observedFacts,
    threshold: "Acyclic MEF dependency graph, zero unmitigated critical SPOFs, all critical assets UP or backed by active failover",
    variance: blockers.length > 0 ? blockers.join("; ") : "Zero Mission Assurance SPOFs detected",
    missingEvidence: ["DoDI 3020.45 Mission Decomposition Table, DCA/TCA Inventory & COOP Failover Test Record"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-3020.45-DODD-3020.40"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-MA-3020-001", verdict, observedFacts, spofs })),
  };

  return { ruleResult, hasCycle, spofs, missionReadinessScore: readinessScore };
}

export interface AcquisitionCmmcResult {
  ruleResult: DodIcRuleResult;
  cmmcConditionalPoamEligible: boolean;
}

/** Evaluates 32 CFR Part 170 CMMC, DFARS 252.204-7012/7019/7020/7021, FAR 52.204-21 & 32 CFR Part 117 NISPOM FOCI. */
export function evaluateAcquisitionCmmcAndFoci(input: {
  cmmcLevel?: "LEVEL_1" | "LEVEL_2_SELF" | "LEVEL_2_C3PAO" | "LEVEL_3_DIBCAC" | null;
  nist800171PercentMet?: number | null;
  poamCloseoutDays?: number | null;
  fivePointControlsMissing?: boolean | null;
  dfars7012CloudFedrampModEquiv?: boolean | null;
  dfars7012IncidentReportedHours?: number | null;
  sprsSubmitted?: boolean | null;
  hasForeignOwnershipOrControl?: boolean | null;
  fociMitigationInstrument?: "NONE" | "BOARD_RESOLUTION" | "SCA" | "SSA" | "PROXY_AGREEMENT" | "VOTING_TRUST" | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): AcquisitionCmmcResult {
  const mode: AssessmentMode = input.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const blockers: string[] = [];

  if (typeof input.nist800171PercentMet === "number" && input.nist800171PercentMet < 80) {
    blockers.push(`CMMC 32 CFR § 170.21 requires >=80% (>=88/110) NIST SP 800-171 compliance for Conditional status (reported ${input.nist800171PercentMet}%)`);
  }
  if (typeof input.poamCloseoutDays === "number" && input.poamCloseoutDays > 180) {
    blockers.push(`CMMC Conditional POA&M closeout window ${input.poamCloseoutDays} days exceeds 180-day 32 CFR § 170.21 limit`);
  }
  if (input.fivePointControlsMissing === true) {
    blockers.push("Critical 5-point NIST SP 800-171 controls are NOT POA&M-eligible under 32 CFR § 170.21");
  }
  if (input.dfars7012CloudFedrampModEquiv === false) {
    blockers.push("DFARS 252.204-7012 requires FedRAMP Moderate (or equivalent) for external cloud CUI storage");
  }
  if (typeof input.dfars7012IncidentReportedHours === "number" && input.dfars7012IncidentReportedHours > 72) {
    blockers.push(`DFARS 252.204-7012 cyber incident reporting delayed (${input.dfars7012IncidentReportedHours}h > 72h DIBNet limit)`);
  }
  if (input.sprsSubmitted === false) {
    blockers.push("DFARS 252.204-7019/7020 requires active SPRS assessment score prior to award");
  }
  if (input.hasForeignOwnershipOrControl === true && (!input.fociMitigationInstrument || input.fociMitigationInstrument === "NONE")) {
    blockers.push("32 CFR Part 117 NISPOM Violation: Foreign Ownership, Control, or Influence (FOCI) without DCSA mitigation instrument blocks Facility Clearance (FCL)");
  }

  const hasAnySignal =
    input.cmmcLevel != null ||
    input.nist800171PercentMet != null ||
    input.poamCloseoutDays != null ||
    input.fivePointControlsMissing != null ||
    input.dfars7012IncidentReportedHours != null ||
    input.hasForeignOwnershipOrControl != null;

  const eligible =
    blockers.length === 0 &&
    (input.nist800171PercentMet == null || input.nist800171PercentMet >= 80) &&
    (input.poamCloseoutDays == null || input.poamCloseoutDays <= 180) &&
    input.fivePointControlsMissing !== true;

  const verdict: DodVerdict = !hasAnySignal ? "INSUFFICIENT_EVIDENCE" : blockers.length > 0 ? "FAIL" : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    cmmcLevel: input.cmmcLevel ?? null,
    nist800171PercentMet: input.nist800171PercentMet ?? null,
    poamCloseoutDays: input.poamCloseoutDays ?? null,
    dfars7012IncidentReportedHours: input.dfars7012IncidentReportedHours ?? null,
    hasForeignOwnershipOrControl: input.hasForeignOwnershipOrControl ?? null,
    fociMitigationInstrument: input.fociMitigationInstrument ?? null,
    cmmcConditionalPoamEligible: eligible,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-ACQ-CMMC-001",
    ruleVersion: "2024.12.16",
    jurisdiction: "DOD",
    title: "Defense Acquisition, CMMC (32 CFR 170), DFARS 7012 & NISPOM FOCI Compliance",
    verdict,
    assessmentMode: mode,
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      blockers.length > 0
        ? `FAIL [DOD-ACQ-CMMC-001]: ${blockers.join("; ")}.`
        : "PASS [DOD-ACQ-CMMC-001]: CMMC 32 CFR Part 170, DFARS 252.204-7012 72h reporting, and NISPOM FOCI mitigation controls satisfied.",
    observedFacts,
    threshold: ">=80% SP 800-171 + <=180d POA&M (32 CFR § 170.21); <=72h DIBNet reporting (DFARS 7012); DCSA FOCI mitigation (32 CFR 117)",
    variance: blockers.length > 0 ? blockers.join("; ") : "Acquisition, CMMC, DFARS & FOCI requirements satisfied",
    missingEvidence: ["SPRS Score Attestation, C3PAO/DIBCAC CMMC Certificate, DCSA FOCI Mitigation Agreement"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["CMMC-32CFR-170-DFARS"]!, DOD_IC_POLICY_REGISTRY["NISPOM-32CFR-117-FOCI"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-ACQ-CMMC-001", verdict, observedFacts, blockers })),
  };

  return { ruleResult, cmmcConditionalPoamEligible: eligible };
}

export interface SpaceMbseSpectrumResult {
  ruleResult: DodIcRuleResult;
  operationalAvailabilityAo: number | null;
}

/** Evaluates SPD-5 Space TT&C, DoDI 4650.01 Spectrum Certification, DoDI 5000.97 MBSE & Logistics Ao = MTBF/(MTBF+MTTR). */
export function evaluateDigitalEngineeringSpaceSpectrum(input: {
  ttcCommandLinkEncryptedAndAuthenticated?: boolean | null;
  antiJamAndAntiSpoofVerified?: boolean | null;
  groundSegmentSegmented?: boolean | null;
  flightSoftwareCryptographicallySigned?: boolean | null;
  spectrumCertificationObtained?: boolean | null;
  mbseAuthoritativeSourceOfTruthActive?: boolean | null;
  mtbfHours?: number | null;
  mttrHours?: number | null;
  targetAo?: number | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): SpaceMbseSpectrumResult {
  const mode: AssessmentMode = input.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const blockers: string[] = [];

  if (input.ttcCommandLinkEncryptedAndAuthenticated === false) {
    blockers.push("Space Policy Directive-5 (Sept 4, 2020) Violation: Unencrypted/unauthenticated spacecraft TT&C command link permits unauthorized hijacking");
  }
  if (input.antiJamAndAntiSpoofVerified === false) blockers.push("Anti-jam / anti-spoof RF resilience unverified");
  if (input.groundSegmentSegmented === false) blockers.push("Space ground segment lacks enclave segmentation");
  if (input.flightSoftwareCryptographicallySigned === false) blockers.push("Spacecraft flight software / firmware lacks CNSA/cryptographic signature");
  if (input.spectrumCertificationObtained === false) blockers.push("DoDI 4650.01 Spectrum Certification & host-nation coordination missing");
  if (input.mbseAuthoritativeSourceOfTruthActive === false) blockers.push("DoDI 5000.97 Digital Engineering Authoritative Source of Truth (ASoT) absent");

  let ao: number | null = null;
  if (typeof input.mtbfHours === "number" && typeof input.mttrHours === "number" && input.mtbfHours > 0 && input.mttrHours >= 0) {
    ao = Number((input.mtbfHours / (input.mtbfHours + input.mttrHours)).toFixed(4));
    const minAo = input.targetAo ?? 0.95;
    if (ao < minAo) {
      blockers.push(`Operational Availability Ao=${ao} (${(ao * 100).toFixed(2)}%) below target threshold ${minAo}`);
    }
  }

  const hasAnySignal =
    input.ttcCommandLinkEncryptedAndAuthenticated != null ||
    input.spectrumCertificationObtained != null ||
    input.mbseAuthoritativeSourceOfTruthActive != null ||
    ao !== null;

  const verdict: DodVerdict = !hasAnySignal ? "INSUFFICIENT_EVIDENCE" : blockers.length > 0 ? "FAIL" : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    ttcCommandLinkEncryptedAndAuthenticated: input.ttcCommandLinkEncryptedAndAuthenticated ?? null,
    spectrumCertificationObtained: input.spectrumCertificationObtained ?? null,
    mbseAuthoritativeSourceOfTruthActive: input.mbseAuthoritativeSourceOfTruthActive ?? null,
    mtbfHours: input.mtbfHours ?? null,
    mttrHours: input.mttrHours ?? null,
    operationalAvailabilityAo: ao,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-SPACE-MBSE-001",
    ruleVersion: "2023.12.21",
    jurisdiction: "DOD",
    title: "Space Security (SPD-5), Spectrum (DoDI 4650.01), Digital Engineering (DoDI 5000.97) & Logistics Ao",
    verdict,
    assessmentMode: mode,
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      blockers.length > 0
        ? `FAIL [DOD-SPACE-MBSE-001]: ${blockers.join("; ")}.`
        : `PASS [DOD-SPACE-MBSE-001]: Space TT&C crypto, DoDI 4650.01 spectrum, DoDI 5000.97 MBSE${ao !== null ? `, and Ao=${ao} (${(ao * 100).toFixed(2)}%)` : ""} verified.`,
    observedFacts,
    threshold: "Encrypted/authenticated TT&C (SPD-5); Spectrum Cert (DoDI 4650.01); ASoT MBSE (DoDI 5000.97); Ao >= target (default 0.95)",
    variance: blockers.length > 0 ? blockers.join("; ") : "Space, Spectrum, MBSE & Logistics Readiness compliant",
    missingEvidence: ["CNSSI 1253 Space Overlay Tailoring, DD Form 1494 Spectrum Cert & SysML ASoT Traceability Log"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["SPD-5-DODI-4650.01-5000.97"]!, DOD_IC_POLICY_REGISTRY["CNSSI-1253"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-SPACE-MBSE-001", verdict, observedFacts, blockers })),
  };

  return { ruleResult, operationalAvailabilityAo: ao };
}
