/**
 * Noctis Intelligence Community (IC) Security Engine (ODNI ICD 503 / 502 / 501)
 *
 * Strictly segregated from DoD RMF (DoDI 8510.01):
 *  - IC-ICD503-AUTH-001: ICD 503 (Oct 25, 2024) IC IE Risk Management Assessment
 *  - IC-RECIP-001: IC Reciprocity Validator (DoD ATO / FedRAMP ATO != automatic IC ATO)
 *  - IC-ICD501-SHARE-001: ICD 501 Responsibility-to-Provide vs. Accredited Boundary & SCI Checks
 *
 * Non-negotiable invariant: Noctis never emits an IC ATO decision (`aiCanIssueIcAto: false`).
 */

import { sha256Sync } from "../universal-crypto.ts";
import { DOD_IC_POLICY_REGISTRY } from "./policy-registry.ts";
import { CLASSIFICATION_RANK, type DeploymentBoundary, BOUNDARY_SPECS, type SecurityClassification } from "./classification-gateway.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";

export interface IcRuleResult extends DodIcRuleResult {
  jurisdiction: "IC";
  aiCanIssueIcAto: false;
  automaticReciprocityPermitted?: boolean;
}

export function evaluateIcd503Authorization(input: {
  systemName?: string;
  deploymentBoundary?: DeploymentBoundary;
  icAoAssigned?: boolean | null;
  independentIcScaAssigned?: boolean | null;
  cnssi1253WithIcOverlaysApplied?: boolean | null;
  zeroTrustAligned?: boolean | null;
  icd502ConMonEnrolled?: boolean | null;
  icd501AndPrivacyEvaluated?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): IcRuleResult {
  const ruleId = "IC-ICD503-AUTH-001";
  const ruleVersion = "2024.10.25";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const boundary = input.deploymentBoundary || "IC_C2S_TS_SCI";
  const boundarySpec = BOUNDARY_SPECS[boundary];
  const blockers: string[] = [];

  if (boundarySpec.allowsCommercialLlm || boundary === "COMMERCIAL_UNCLASSIFIED" || boundary === "FEDRAMP_MODERATE" || boundary === "FEDRAMP_HIGH") {
    blockers.push(`Target boundary '${boundary}' is not an accredited IC Information Environment (IC IE) cloud or SCIF enclave for classified/SCI workloads`);
  }
  if (input.icAoAssigned === false) blockers.push("No designated Intelligence Community Authorizing Official (IC AO) identified");
  if (input.independentIcScaAssigned === false) blockers.push("Independent IC Security Control Assessor (SCA) not assigned");
  if (input.cnssi1253WithIcOverlaysApplied === false) blockers.push("CNSSI 1253 categorization & IC/SCI overlays not applied");
  if (input.zeroTrustAligned === false) blockers.push("ICD 503 (Oct 25, 2024) Zero Trust architecture alignment missing");
  if (input.icd502ConMonEnrolled === false) blockers.push("ICD 502 Integrated Defense & continuous monitoring enrollment missing");
  if (input.icd501AndPrivacyEvaluated === false) blockers.push("ICD 501 information-sharing & IC privacy considerations not evaluated");

  const missingInputs =
    input.icAoAssigned == null ||
    input.independentIcScaAssigned == null ||
    input.cnssi1253WithIcOverlaysApplied == null ||
    input.zeroTrustAligned == null;

  const verdict: DodVerdict =
    blockers.length > 0
      ? "FAIL"
      : missingInputs
      ? "INSUFFICIENT_EVIDENCE"
      : input.icd502ConMonEnrolled === true && input.icd501AndPrivacyEvaluated !== false
      ? "PASS"
      : "MANUAL_REVIEW_REQUIRED";

  const observedFacts: Record<string, string | number | boolean | null> = {
    systemName: input.systemName || "IC IE Mission System",
    deploymentBoundary: boundary,
    icAoAssigned: input.icAoAssigned ?? null,
    independentIcScaAssigned: input.independentIcScaAssigned ?? null,
    cnssi1253WithIcOverlaysApplied: input.cnssi1253WithIcOverlaysApplied ?? null,
    zeroTrustAligned: input.zeroTrustAligned ?? null,
    icd502ConMonEnrolled: input.icd502ConMonEnrolled ?? null,
    icd501AndPrivacyEvaluated: input.icd501AndPrivacyEvaluated ?? null,
  };

  const summary =
    verdict === "FAIL"
      ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: IC IE authorization check failed under ODNI ICD 503 (2024-10-25): ${blockers.join("; ")}.`
      : verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE: Missing IC AO/SCA designation, CNSSI 1253 IC/SCI overlay records, Zero Trust architecture evidence, or ICD 502 ConMon enrollment."
      : verdict === "MANUAL_REVIEW_REQUIRED"
      ? "MANUAL_REVIEW_REQUIRED: Verify ICD 502 defense monitoring & ICD 501 privacy/sharing controls with IC AO before authorization."
      : `${isScenario ? "SCENARIO PASS (IC AO Decision Pending)" : "READY FOR IC AO REVIEW"}: All ICD 503 (Oct 25, 2024) RMF, Zero Trust, ICD 502, and ICD 501 prerequisites met.`;

  return {
    ruleId,
    ruleVersion,
    jurisdiction: "IC",
    title: "ODNI ICD 503 (Oct 25, 2024) IC IE Risk Management & Authorization Readiness",
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary,
    observedFacts,
    threshold: "Accredited IC IE enclave, IC AO + independent IC SCA, CNSSI 1253 + IC/SCI overlays, Zero Trust (ICD 503 2024), ICD 502 ConMon, ICD 501 sharing/privacy",
    variance: blockers.length > 0 ? blockers.join(" | ") : verdict === "PASS" ? "0 blocking ICD 503 gaps" : "Requires IC AO/SCA artifact review",
    missingEvidence: [
      "IC RMF Body of Evidence (BoE) in agency IC GRC repository (e.g., Xacta/IC eGRC)",
      "CNSSI 1253 Categorization + IC Intelligence & SCI Security Overlays",
      "ICD 503 Zero Trust & ICD 502 Integrated Defense Continuous Monitoring attestations",
      "Signed IC Authorizing Official decision",
    ],
    authorityCitations: [
      DOD_IC_POLICY_REGISTRY["ICD-503"]!,
      DOD_IC_POLICY_REGISTRY["ICD-502"]!,
      DOD_IC_POLICY_REGISTRY["ICD-501"]!,
      DOD_IC_POLICY_REGISTRY["CNSSI-1253"]!,
    ],
    aiCanIssueAto: false,
    aiCanIssueIcAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, ruleVersion, verdict, observedFacts })),
  };
}

export function evaluateIcReciprocity(input: {
  sourceAuthorizationType: "IC_ICD503_ATO" | "DOD_ATO" | "FEDRAMP_ATO";
  sourceAtoActiveAndUnexpired?: boolean | null;
  icOverlaysAndSciVerified?: boolean | null;
  icd502TelemetryCompatible?: boolean | null;
  receivingIcAoAccepted?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): IcRuleResult {
  const ruleId = "IC-RECIP-001";
  const ruleVersion = "2024.10.25";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const blockers: string[] = [];

  if (input.sourceAuthorizationType === "DOD_ATO" || input.sourceAuthorizationType === "FEDRAMP_ATO") {
    blockers.push(
      `A ${input.sourceAuthorizationType} does NOT automatically satisfy ODNI ICD 503 authorization requirements in the Intelligence Community; independent IC IE overlay assessment, SCI verification, ICD 502 alignment, and receiving IC AO acceptance are mandatory`,
    );
  }
  if (input.sourceAtoActiveAndUnexpired === false) blockers.push("Source ATO package is expired or revoked");
  if (input.icOverlaysAndSciVerified === false) blockers.push("IC-specific overlays and SCI compartment requirements not verified");
  if (input.icd502TelemetryCompatible === false) blockers.push("Source system does not satisfy ICD 502 Integrated Defense monitoring");
  if (input.receivingIcAoAccepted === false) blockers.push("Receiving IC Authorizing Official has not formally accepted reciprocity");

  const automaticReciprocityPermitted = input.sourceAuthorizationType === "IC_ICD503_ATO";
  const hasUnknowns =
    input.sourceAuthorizationType === "IC_ICD503_ATO" &&
    (input.sourceAtoActiveAndUnexpired == null || input.icOverlaysAndSciVerified == null);

  const verdict: DodVerdict =
    blockers.length > 0
      ? "FAIL"
      : hasUnknowns
      ? "INSUFFICIENT_EVIDENCE"
      : input.receivingIcAoAccepted === true && input.icOverlaysAndSciVerified === true
      ? "PASS"
      : "MANUAL_REVIEW_REQUIRED";

  const observedFacts: Record<string, string | number | boolean | null> = {
    sourceAuthorizationType: input.sourceAuthorizationType,
    automaticReciprocityPermitted,
    sourceAtoActiveAndUnexpired: input.sourceAtoActiveAndUnexpired ?? null,
    icOverlaysAndSciVerified: input.icOverlaysAndSciVerified ?? null,
    icd502TelemetryCompatible: input.icd502TelemetryCompatible ?? null,
    receivingIcAoAccepted: input.receivingIcAoAccepted ?? null,
  };

  return {
    ruleId,
    ruleVersion,
    jurisdiction: "IC",
    title: "ODNI ICD 503 Reciprocity & Cross-Community Authorization Boundary",
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    automaticReciprocityPermitted,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: External authorization cannot be treated as automatic IC ICD 503 authorization: ${blockers.join("; ")}.`
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: Provide active ICD 503 ATO package, SCI/IC overlay delta matrix, and ICD 502 ConMon status."
        : verdict === "MANUAL_REVIEW_REQUIRED"
        ? "MANUAL_REVIEW_REQUIRED: Existing ICD 503 evidence may be reused under ICD 503 reciprocity once the receiving IC AO validates environment/overlay deltas and signs acceptance."
        : `${isScenario ? "SCENARIO PASS" : "PASS"}: Valid ICD 503 reciprocal evidence verified and accepted by receiving IC AO.`,
    observedFacts,
    threshold: "Must originate from valid ICD 503 authorization (DoD ATO / FedRAMP ATO not automatically reciprocal) + IC/SCI overlay alignment + receiving IC AO acceptance",
    variance: blockers.length > 0 ? blockers.join(" | ") : "Requires IC AO reciprocity acceptance",
    missingEvidence: [
      "Complete originating SAR, SSP, POA&M, and ConMon artifacts",
      "IC/SCI overlay gap analysis against CNSSI 1253 Intelligence Overlay",
      "Signed receiving IC Authorizing Official reciprocity acceptance",
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["ICD-503"]!, DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!, DOD_IC_POLICY_REGISTRY["CNSSI-1253"]!],
    aiCanIssueAto: false,
    aiCanIssueIcAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, ruleVersion, verdict, observedFacts })),
  };
}

export function evaluateIcd501SharingGovernance(input: {
  dataClassification: SecurityClassification;
  targetBoundary: DeploymentBoundary;
  userClearance: SecurityClassification;
  hasNeedToKnow?: boolean | null;
  requiresOrconApproval?: boolean;
  orconOriginatorApproved?: boolean | null;
  auditTrailEnabled?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): IcRuleResult {
  const ruleId = "IC-ICD501-SHARE-001";
  const ruleVersion = "2009.01.21";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const spec = BOUNDARY_SPECS[input.targetBoundary];
  const blockers: string[] = [];

  if (CLASSIFICATION_RANK[input.dataClassification] > CLASSIFICATION_RANK[spec.maxClassification] || (input.dataClassification !== "UNCLASSIFIED" && spec.allowsCommercialLlm)) {
    blockers.push(`Target boundary '${input.targetBoundary}' (max ${spec.maxClassification}, commercialLlm=${spec.allowsCommercialLlm}) cannot receive '${input.dataClassification}' data regardless of user clearance`);
  }
  if (CLASSIFICATION_RANK[input.userClearance] < CLASSIFICATION_RANK[input.dataClassification]) {
    blockers.push(`User clearance '${input.userClearance}' is insufficient for '${input.dataClassification}'`);
  }
  if (input.hasNeedToKnow === false) blockers.push("Mission need-to-know not established");
  if (input.requiresOrconApproval && input.orconOriginatorApproved !== true) {
    blockers.push("ORCON originator release approval missing");
  }
  if (input.auditTrailEnabled === false) blockers.push("ICD 501 dissemination audit logging disabled");

  const hasUnknowns = input.hasNeedToKnow == null || input.auditTrailEnabled == null;
  const verdict: DodVerdict = blockers.length > 0 ? "FAIL" : hasUnknowns ? "INSUFFICIENT_EVIDENCE" : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    dataClassification: input.dataClassification,
    targetBoundary: input.targetBoundary,
    boundaryMaxClassification: spec.maxClassification,
    userClearance: input.userClearance,
    hasNeedToKnow: input.hasNeedToKnow ?? null,
    requiresOrconApproval: Boolean(input.requiresOrconApproval),
    orconOriginatorApproved: input.orconOriginatorApproved ?? null,
    auditTrailEnabled: input.auditTrailEnabled ?? null,
  };

  return {
    ruleId,
    ruleVersion,
    jurisdiction: "IC",
    title: "ODNI ICD 501 Responsibility-to-Provide vs. Accredited Boundary Governance",
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: ICD 501 dissemination blocked: ${blockers.join("; ")}.`
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: Verify user need-to-know attributes and ICD 501 dissemination audit telemetry."
        : `${isScenario ? "SCENARIO PASS" : "PASS"}: Both user eligibility/need-to-know AND accredited system boundary/ORCON gates satisfied for ICD 501 discovery/dissemination.`,
    observedFacts,
    threshold: "Accredited target boundary >= data classification, clearance >= classification, need-to-know, ORCON release (if marked), audit enabled",
    variance: blockers.length > 0 ? blockers.join(" | ") : "Compliant with ICD 501 dissemination constraints",
    missingEvidence: [
      "Accredited target enclave authorization record (ICD 503 ATO)",
      "Identity attribute assertion (clearance, compartments, need-to-know)",
      "Originator release approval if ORCON-caveated",
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["ICD-501"]!, DOD_IC_POLICY_REGISTRY["ICD-503"]!, DOD_IC_POLICY_REGISTRY["EO-13526-DODM-5200.01"]!],
    aiCanIssueAto: false,
    aiCanIssueIcAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, ruleVersion, verdict, observedFacts })),
  };
}
