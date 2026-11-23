/**
 * Noctis DoD RMF (DoDI 8510.01) & CNSSI 1253 Deterministic Security Engine
 *
 * Implements:
 *  - DOD-RMF-AUTH-001: DoDI 8510.01 (July 19, 2022) 7-Step Authorization Readiness
 *  - DOD-RMF-RECIP-001: DoD Component RMF Reciprocity Evaluation
 *  - CNSSI-1253-CAT-001: CNSSI 1253 (July 2022) Independent C/I/A & NSS Overlay Engine
 *  - DOD-EMASS-EXPORT-001: DoD eMASS-Compatible Package Schema & Integrity Export
 *
 * Non-negotiable invariants:
 *  - Only a designated DoD Authorizing Official (AO) may issue ATO/ATOwC/IATT/DATO (`aiCanIssueAto: false`).
 *  - DoD RMF authorization decisions NEVER automatically satisfy IC ICD 503 authorization.
 *  - Unverified scenario facts are distinguished from formally verified SCA/ISSM artifacts.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { DOD_IC_POLICY_REGISTRY, type DodIcPolicyRecord } from "./policy-registry.ts";
import type { SecurityClassification } from "./classification-gateway.ts";

export type DodVerdict = "PASS" | "FAIL" | "INSUFFICIENT_EVIDENCE" | "MANUAL_REVIEW_REQUIRED";
export type AssessmentMode = "SCENARIO_ASSUMPTION" | "FORMAL_EVIDENCE_AUDIT";
export type ImpactLevel = "LOW" | "MODERATE" | "HIGH";

export interface DodIcRuleResult {
  ruleId: string;
  ruleVersion: string;
  jurisdiction: "DOD" | "CNSS" | "IC" | "CROSS_DOMAIN";
  title: string;
  verdict: DodVerdict;
  assessmentMode: AssessmentMode;
  formalDetermination: DodVerdict | "PENDING_EVIDENCE";
  summary: string;
  observedFacts: Record<string, string | number | boolean | null>;
  threshold: string;
  variance: string;
  missingEvidence: string[];
  authorityCitations: DodIcPolicyRecord[];
  aiCanIssueAto: false;
  auditHash: string;
}

export function evaluateDod8510Authorization(input: {
  systemName?: string;
  impactLevel?: "IL2" | "IL4" | "IL5" | "IL6";
  emassRegistered?: boolean | null;
  boundaryAndIsaDocumented?: boolean | null;
  independentScaAssigned?: boolean | null;
  cat1UnmitigatedCount?: number | null;
  poamCompleteForOpenFindings?: boolean | null;
  conmonAndCsspEnrolled?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DodIcRuleResult {
  const ruleId = "DOD-RMF-AUTH-001";
  const ruleVersion = "2022.07.19";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const blockers: string[] = [];

  if (input.emassRegistered === false) blockers.push("System is not registered in DoD eMASS or approved GRC system");
  if (input.boundaryAndIsaDocumented === false) blockers.push("Authorization boundary diagram or ISAs missing");
  if (input.independentScaAssigned === false) blockers.push("DoDI 8510.01 independence violated: no independent SCA assigned");
  if (typeof input.cat1UnmitigatedCount === "number" && input.cat1UnmitigatedCount > 0) {
    blockers.push(`${input.cat1UnmitigatedCount} unmitigated CAT I finding(s) present (CAT I blocks standard ATO unless AO accepts risk)`);
  }
  if (input.poamCompleteForOpenFindings === false) blockers.push("Open SAR weaknesses lack active POA&M mitigation tracking");
  if (input.conmonAndCsspEnrolled === false) blockers.push("Continuous monitoring / CSSP alignment missing");

  const hasAnySignal =
    input.emassRegistered != null ||
    input.boundaryAndIsaDocumented != null ||
    input.independentScaAssigned != null ||
    input.cat1UnmitigatedCount != null ||
    input.poamCompleteForOpenFindings != null ||
    input.conmonAndCsspEnrolled != null;

  const hasNulls =
    input.emassRegistered == null ||
    input.independentScaAssigned == null ||
    input.cat1UnmitigatedCount == null;

  const verdict: DodVerdict =
    !hasAnySignal
      ? "INSUFFICIENT_EVIDENCE"
      : blockers.length > 0
      ? "FAIL"
      : hasNulls
      ? "MANUAL_REVIEW_REQUIRED"
      : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    systemName: input.systemName || "DoD Mission System",
    impactLevel: input.impactLevel || "IL5",
    emassRegistered: input.emassRegistered ?? null,
    boundaryAndIsaDocumented: input.boundaryAndIsaDocumented ?? null,
    independentScaAssigned: input.independentScaAssigned ?? null,
    cat1UnmitigatedCount: input.cat1UnmitigatedCount ?? null,
    poamCompleteForOpenFindings: input.poamCompleteForOpenFindings ?? null,
    conmonAndCsspEnrolled: input.conmonAndCsspEnrolled ?? null,
  };

  const missingEvidence = [
    "Signed DoDI 8510.01 SSP, SAR, and POA&M package inside DoD eMASS",
    "Independent SCA impartiality attestation & Security Assessment Plan (SAP) test results",
    "Authorization Boundary Diagram, signed ISAs/MOUs, and active CSSP SLA",
    "Designated DoD Authorizing Official decision letter (ATO / ATOwC / IATT / DATO)",
  ];

  const summary =
    verdict === "FAIL"
      ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: System fails DoDI 8510.01 (${ruleVersion}) RMF authorization readiness: ${blockers.join("; ")}. Formal authorization rests strictly with the DoD Authorizing Official.`
      : verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE: Missing eMASS registration, independent SCA assignment, and CAT I / SAR package artifacts under DoDI 8510.01."
      : verdict === "MANUAL_REVIEW_REQUIRED"
      ? "MANUAL_REVIEW_REQUIRED: Partial DoDI 8510.01 readiness inputs; AO & SCA must verify remaining eMASS package artifacts before authorization."
      : `${isScenario ? "SCENARIO PASS (AO Decision Pending)" : "READY FOR DO_D AO REVIEW"}: Technical DoDI 8510.01 package gates satisfied; AO renders formal ATO/ATOwC decision.`;

  return {
    ruleId,
    ruleVersion,
    jurisdiction: "DOD",
    title: "DoDI 8510.01 DoD RMF Authorization Readiness",
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary,
    observedFacts,
    threshold: "eMASS registration, independent SCA, zero unaccepted CAT I blockers, signed SAP/SAR/POA&M, ConMon/CSSP, AO decision",
    variance: blockers.length > 0 ? blockers.join(" | ") : verdict === "PASS" ? "0 blocking DoDI 8510.01 gaps" : "Requires AO/SCA package verification",
    missingEvidence,
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!, DOD_IC_POLICY_REGISTRY["DOD-CC-SRG"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, ruleVersion, verdict, observedFacts })),
  };
}

export function evaluateDodReciprocity(input: {
  sourceComponent?: string;
  sourceAtoActiveAndUnexpired?: boolean | null;
  targetEnvironmentImpactLevel?: "IL2" | "IL4" | "IL5" | "IL6";
  sourceImpactLevel?: "IL2" | "IL4" | "IL5" | "IL6";
  cat1OpenWithoutAoAcceptance?: boolean | null;
  receivingAoGapReviewCompleted?: boolean | null;
  targetJurisdiction?: "DOD" | "IC";
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DodIcRuleResult {
  const ruleId = "DOD-RMF-RECIP-001";
  const ruleVersion = "2022.07.19";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const rank = { IL2: 1, IL4: 2, IL5: 3, IL6: 4 };
  const blockers: string[] = [];

  if (input.targetJurisdiction === "IC") {
    blockers.push("Target jurisdiction is Intelligence Community (ICD 503): DoDI 8510.01 reciprocity does NOT automatically confer an IC ICD 503 authorization");
  }
  if (input.sourceAtoActiveAndUnexpired === false) blockers.push("Source DoD ATO or DISA PA is expired or revoked");
  if (
    input.sourceImpactLevel &&
    input.targetEnvironmentImpactLevel &&
    rank[input.sourceImpactLevel] < rank[input.targetEnvironmentImpactLevel]
  ) {
    blockers.push(`Source ${input.sourceImpactLevel} is lower than target ${input.targetEnvironmentImpactLevel}`);
  }
  if (input.cat1OpenWithoutAoAcceptance === true) blockers.push("Unaccepted open CAT I findings prevent DoD reciprocity acceptance");
  if (input.receivingAoGapReviewCompleted === false) blockers.push("Receiving DoD AO environmental delta / overlay review not completed");

  const missingData =
    input.sourceAtoActiveAndUnexpired == null || input.cat1OpenWithoutAoAcceptance == null;

  const verdict: DodVerdict =
    blockers.length > 0
      ? "FAIL"
      : missingData
      ? "INSUFFICIENT_EVIDENCE"
      : input.receivingAoGapReviewCompleted === true
      ? "PASS"
      : "MANUAL_REVIEW_REQUIRED";

  const observedFacts: Record<string, string | number | boolean | null> = {
    sourceComponent: input.sourceComponent || "Originating DoD Component",
    sourceAtoActiveAndUnexpired: input.sourceAtoActiveAndUnexpired ?? null,
    sourceImpactLevel: input.sourceImpactLevel ?? null,
    targetEnvironmentImpactLevel: input.targetEnvironmentImpactLevel ?? null,
    cat1OpenWithoutAoAcceptance: input.cat1OpenWithoutAoAcceptance ?? null,
    receivingAoGapReviewCompleted: input.receivingAoGapReviewCompleted ?? null,
    targetJurisdiction: input.targetJurisdiction || "DOD",
  };

  return {
    ruleId,
    ruleVersion,
    jurisdiction: "DOD",
    title: "DoDI 8510.01 DoD Component Reciprocity Assessment",
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: DoD RMF reciprocity denied: ${blockers.join("; ")}.`
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: Supply source eMASS ATO dates, IL categorization match, and CAT I POA&M posture to evaluate DoDI 8510.01 reciprocity."
        : verdict === "MANUAL_REVIEW_REQUIRED"
        ? "MANUAL_REVIEW_REQUIRED: Source ATO artifacts appear reusable, pending receiving DoD AO delta acceptance of local operating environment and CSSP boundaries."
        : `${isScenario ? "SCENARIO PASS" : "PASS"}: DoD Component reciprocity prerequisites met under DoDI 8510.01; receiving AO issues acceptance letter.`,
    observedFacts,
    threshold: "Within DoD only: active unexpired ATO/PA, source IL >= target IL, zero unaccepted CAT I, receiving AO delta review",
    variance: blockers.length > 0 ? blockers.join(" | ") : verdict === "PASS" ? "Eligible for DoD reciprocity acceptance" : "Awaiting AO delta review / source artifacts",
    missingEvidence: [
      "Existing eMASS authorization package (ATO letter, SAR, POA&M, ConMon status)",
      "CNSSI 1253 / DoD CC SRG Impact Level comparison & local SCCA/CSSP delta matrix",
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!, DOD_IC_POLICY_REGISTRY["ICD-503"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, ruleVersion, verdict, observedFacts })),
  };
}

export interface Cnssi1253Result extends DodIcRuleResult {
  categorizationVector: { confidentiality: ImpactLevel; integrity: ImpactLevel; availability: ImpactLevel };
  categorizationExpression: string;
  requiredOverlays: string[];
  independentVectorsPreserved: true;
}

export function evaluateCnssi1253Categorization(input: {
  systemName?: string;
  confidentiality: ImpactLevel;
  integrity: ImpactLevel;
  availability: ImpactLevel;
  classification?: SecurityClassification;
  isIntelligenceSystem?: boolean;
  isSpaceSystem?: boolean;
  hasCrossDomainSolution?: boolean;
  processesPiiPrivacy?: boolean;
  isCloudSystem?: boolean;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): Cnssi1253Result {
  const ruleId = "CNSSI-1253-CAT-001";
  const ruleVersion = "2022.07";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const cls: SecurityClassification = input.classification || (input.isIntelligenceSystem ? "TS_SCI" : "UNCLASSIFIED");

  let adjC: ImpactLevel = input.confidentiality;
  const floorReasons: string[] = [];

  if ((cls === "SECRET" || cls === "TOP_SECRET" || cls === "TS_SCI") && adjC !== "HIGH") {
    adjC = "HIGH";
    floorReasons.push(`CNSSI 1253 Confidentiality raised to HIGH (required floor for ${cls} National Security Systems)`);
  } else if (cls === "CUI" && adjC === "LOW") {
    adjC = "MODERATE";
    floorReasons.push("Confidentiality raised to >= MODERATE (32 CFR Part 2002 / CUI safeguard floor)");
  }

  const overlays = new Set<string>(["CNSSI 1253 Baseline (C/I/A Vector Selection)"]);
  if (cls === "SECRET" || cls === "TOP_SECRET" || cls === "TS_SCI") {
    overlays.add("CNSSI 1253 Classified Information Overlay");
  }
  if (input.isIntelligenceSystem || cls === "TS_SCI") {
    overlays.add("CNSSI 1253 Intelligence / SCI Overlay");
  }
  if (input.hasCrossDomainSolution) {
    overlays.add("CNSSI 1253 Cross-Domain Solution (CDS) Overlay");
  }
  if (input.isSpaceSystem) {
    overlays.add("CNSSI 1253 Space Platform Overlay");
  }
  if (input.processesPiiPrivacy) {
    overlays.add("CNSSI 1253 Privacy Overlay");
  }
  if (input.isCloudSystem) {
    overlays.add(cls === "TS_SCI" ? "IC Cloud Security Overlay (ICD 503)" : "DoD Cloud Computing SRG Overlay");
  }

  const expr = `CNSSI-1253 = {(C: ${adjC}), (I: ${input.integrity}), (A: ${input.availability})} [Classification: ${cls}]`;
  const overlayList = [...overlays];
  const adjusted = floorReasons.length > 0;
  const verdict: DodVerdict = adjusted ? "MANUAL_REVIEW_REQUIRED" : "PASS";
  const observedFacts: Record<string, string | number | boolean | null> = {
    confidentiality: adjC,
    integrity: input.integrity,
    availability: input.availability,
    classification: cls,
    isIntelligenceSystem: Boolean(input.isIntelligenceSystem),
    hasCrossDomainSolution: Boolean(input.hasCrossDomainSolution),
    overlaysCount: overlayList.length,
  };

  return {
    ruleId,
    ruleVersion,
    jurisdiction: "CNSS",
    title: "CNSSI 1253 Independent C/I/A NSS Security Categorization & Overlays",
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    categorizationVector: { confidentiality: adjC, integrity: input.integrity, availability: input.availability },
    categorizationExpression: expr,
    requiredOverlays: overlayList,
    independentVectorsPreserved: true,
    summary:
      `${isScenario ? "SCENARIO " : ""}${verdict}: ${expr}. Unlike civilian FIPS 199 High-Water Mark collapsing, CNSSI 1253 (July 2022) keeps Confidentiality (${adjC}), Integrity (${input.integrity}), and Availability (${input.availability}) control selections independent and applies overlays: ${overlayList.join(", ")}.` +
      (floorReasons.length > 0 ? ` Floor Adjustments: ${floorReasons.join("; ")}.` : ""),
    observedFacts,
    threshold: "Independent (C, I, A) vector selection + NSS Overlays per CNSSI 1253 (July 2022); C=HIGH floor for Classified NSS",
    variance: floorReasons.length > 0 ? floorReasons.join(" | ") : "Independent C/I/A vector compliant with CNSSI 1253",
    missingEvidence: [
      "CNSSI 1253 Information Type & Mission Impact Rationale signed by System Owner and AO",
      "Tailored Control Overlay Workbook in eMASS / Xacta",
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["CNSSI-1253"]!, DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, ruleVersion, expr, overlayList })),
  };
}

export function buildEmassPackageSummary(input: {
  emassSystemId?: string;
  systemName: string;
  impactLevel: "IL2" | "IL4" | "IL5" | "IL6";
  controlCount?: number;
  openPoamCount?: number;
  artifactsPresent?: string[];
}) {
  const required = [
    "SSP_OSCAL",
    "SAP",
    "SAR",
    "POAM",
    "BOUNDARY_DIAGRAM",
    "HW_SW_INVENTORY",
    "ISA_MOU",
    "CSSP_ALIGNMENT",
  ];
  const presentSet = new Set((input.artifactsPresent || []).map((a) => a.toUpperCase()));
  const missing = required.filter((r) => !presentSet.has(r));

  const pkg = {
    schema: "dod-emass-compatible-package-summary/v1",
    authority: "DoDI 8510.01 (July 19, 2022)",
    liveEmassApiConnected: false,
    note: "Structured DoD eMASS-compatible schema manifest for package validation and export; requires authorized NIPR/SIPR PKI transport to submit into live DoD eMASS.",
    emassSystemId: input.emassSystemId || "EMASS-DRAFT-001",
    systemName: input.systemName,
    impactLevel: input.impactLevel,
    controlsTracked: input.controlCount ?? 370,
    openPoamCount: input.openPoamCount ?? 0,
    artifactsPresent: [...presentSet],
    artifactsMissing: missing,
    packageComplete: missing.length === 0,
    aiCanIssueAto: false as const,
  };
  return {
    ...pkg,
    packageSha256: sha256Sync(JSON.stringify(pkg)),
  };
}
