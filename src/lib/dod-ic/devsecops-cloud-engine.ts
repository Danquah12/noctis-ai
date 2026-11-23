/**
 * Noctis Secure Defense Software, DevSecOps (cATO/SSDF), Container/K8s STIG & CC SRG Cloud Inheritance Engine (NDIMP Wave 2 — Step 3)
 *
 * Implements:
 *  - DOD-DEVSECOPS-CATO-001: NIST SP 800-218 v1.1 SSDF & DoD Enterprise DevSecOps cATO / CtF Readiness
 *  - DOD-K8S-STIG-001: NSA/CISA Kubernetes Hardening & DISA Container Platform STIG
 *  - DOD-CCSRG-INHERIT-001: DoD CC SRG (IL2-IL6) Cloud Inheritance (CSP PA != Mission Owner Workload ATO)
 */

import { sha256Sync } from "../universal-crypto.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY, type DodIcPolicyRecord } from "./policy-registry.ts";

function buildSoftwareCloudRule(params: {
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
        : `${verdict} [${params.ruleId}]: Continuous DevSecOps / cloud inheritance verification incomplete.`,
    observedFacts: params.observedFacts,
    threshold: params.threshold,
    variance: params.blockers.length > 0 ? params.blockers.join("; ") : verdict === "PASS" ? "DevSecOps / CC SRG compliant" : "Evidence pending",
    missingEvidence: params.missingEvidence,
    authorityCitations: params.authorityCitations,
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: params.ruleId, verdict, observedFacts: params.observedFacts, blockers: params.blockers })),
  };
}

export interface DevSecOpsCatoResult {
  ruleResult: DodIcRuleResult;
  catoEligible: boolean;
}

/** Evaluates NIST SP 800-218 v1.1 SSDF and DoD Continuous ATO (cATO / CtF) pipeline & runtime gates. */
export function evaluateDevSecOpsCatoAndSsdf(input: {
  sastPassed?: boolean | null;
  dastPassed?: boolean | null;
  sbomGeneratedAndScanned?: boolean | null;
  containerImagesSignedAndHardened?: boolean | null;
  slsaProvenanceVerified?: boolean | null;
  criticalOrKevVulnsOpenCount?: number | null;
  continuousRuntimeMonitoringActive?: boolean | null;
  activeSecOpsTeamAssigned?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DevSecOpsCatoResult {
  const blockers: string[] = [];
  if (input.sastPassed === false) blockers.push("CI/CD SAST gate failed or bypassed");
  if (input.dastPassed === false) blockers.push("CI/CD DAST dynamic gate failed or bypassed");
  if (input.sbomGeneratedAndScanned === false) blockers.push("Signed CycloneDX/SPDX SBOM missing or unscanned (violates SP 800-218 PS/PW)");
  if (input.containerImagesSignedAndHardened === false) blockers.push("Container images are unsigned or unhardened");
  if (input.slsaProvenanceVerified === false) blockers.push("SLSA build provenance attestation missing");
  if (typeof input.criticalOrKevVulnsOpenCount === "number" && input.criticalOrKevVulnsOpenCount > 0) {
    blockers.push(`${input.criticalOrKevVulnsOpenCount} open critical / CISA KEV vulnerabilities block CtF/cATO promotion`);
  }
  if (input.continuousRuntimeMonitoringActive === false) {
    blockers.push("Continuous runtime monitoring absent — a one-time pipeline scan NEVER qualifies for DoD cATO");
  }
  if (input.activeSecOpsTeamAssigned === false) blockers.push("No active DevSecOps security team assigned for ongoing cATO maintenance");

  const hasAnySignal =
    input.sastPassed != null ||
    input.dastPassed != null ||
    input.sbomGeneratedAndScanned != null ||
    input.containerImagesSignedAndHardened != null ||
    input.criticalOrKevVulnsOpenCount != null ||
    input.continuousRuntimeMonitoringActive != null;

  const eligible =
    blockers.length === 0 &&
    input.sastPassed === true &&
    input.sbomGeneratedAndScanned === true &&
    input.continuousRuntimeMonitoringActive === true;

  const ruleResult = buildSoftwareCloudRule({
    ruleId: "DOD-DEVSECOPS-CATO-001",
    ruleVersion: "2022.02.01",
    title: "DoD Enterprise DevSecOps (cATO/CtF) & NIST SP 800-218 v1.1 SSDF Readiness",
    blockers,
    hasAnySignal,
    hasMissingRequired: input.continuousRuntimeMonitoringActive == null || input.sbomGeneratedAndScanned == null,
    summaryPass: "PASS [DOD-DEVSECOPS-CATO-001]: SSDF CI/CD gates, signed SBOM, SLSA provenance, zero open KEVs, and continuous monitoring satisfy DoD cATO preconditions.",
    threshold: "SAST/DAST, signed SBOM + SLSA, 0 critical/KEV vulns, continuous runtime monitoring & active SecOps team (no one-time cATO)",
    observedFacts: {
      sastPassed: input.sastPassed ?? null,
      sbomGeneratedAndScanned: input.sbomGeneratedAndScanned ?? null,
      slsaProvenanceVerified: input.slsaProvenanceVerified ?? null,
      criticalOrKevVulnsOpenCount: input.criticalOrKevVulnsOpenCount ?? null,
      continuousRuntimeMonitoringActive: input.continuousRuntimeMonitoringActive ?? null,
      catoEligible: eligible,
    },
    missingEvidence: ["CI/CD pipeline attestation bundle, signed SBOM, SLSA provenance & continuous runtime telemetry proof"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["NIST-SP-800-218-SSDF"]!, DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, catoEligible: eligible };
}

export interface K8sHardeningResult {
  ruleResult: DodIcRuleResult;
  hardenedCompliant: boolean;
}

/** Evaluates NSA/CISA Kubernetes Hardening Guide & DISA Container/K8s STIG controls. */
export function evaluateKubernetesAndContainerHardening(input: {
  privilegedContainersPresent?: boolean | null;
  runningAsRootUid0?: boolean | null;
  hostNetworkOrPidShared?: boolean | null;
  etcdEncryptedAtRest?: boolean | null;
  networkPoliciesEnforced?: boolean | null;
  rbacLeastPrivilegeEnforced?: boolean | null;
  unsignedContainerImagesBlocked?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): K8sHardeningResult {
  const blockers: string[] = [];
  if (input.privilegedContainersPresent === true) blockers.push("Privileged containers permitted in cluster (CAT I NSA/CISA K8s & Container STIG failure)");
  if (input.runningAsRootUid0 === true) blockers.push("Workloads running as UID 0 root inside containers violate least privilege");
  if (input.hostNetworkOrPidShared === true) blockers.push("hostNetwork/hostPID namespace sharing breaks container isolation");
  if (input.etcdEncryptedAtRest === false) blockers.push("Kubernetes etcd secrets are not encrypted at rest with FIPS-validated crypto");
  if (input.networkPoliciesEnforced === false) blockers.push("Namespace NetworkPolicies missing (unrestricted pod-to-pod east-west traffic)");
  if (input.rbacLeastPrivilegeEnforced === false) blockers.push("Overbroad Kubernetes cluster-admin/wildcard RBAC bindings detected");
  if (input.unsignedContainerImagesBlocked === false) blockers.push("Admission controller allows unsigned container images");

  const hasAnySignal =
    input.privilegedContainersPresent != null ||
    input.runningAsRootUid0 != null ||
    input.hostNetworkOrPidShared != null ||
    input.etcdEncryptedAtRest != null ||
    input.networkPoliciesEnforced != null ||
    input.unsignedContainerImagesBlocked != null;

  const compliant = blockers.length === 0 && input.privilegedContainersPresent === false && input.runningAsRootUid0 === false;

  const ruleResult = buildSoftwareCloudRule({
    ruleId: "DOD-K8S-STIG-001",
    ruleVersion: "2025.01",
    title: "NSA/CISA Kubernetes Hardening & DISA Container STIG Compliance",
    blockers,
    hasAnySignal,
    hasMissingRequired: input.privilegedContainersPresent == null || input.runningAsRootUid0 == null,
    summaryPass: "PASS [DOD-K8S-STIG-001]: Non-privileged, non-root pods, etcd encryption, NetworkPolicies, and signed image admission conform to K8s STIG.",
    threshold: "Zero privileged containers, zero UID 0 pods, no hostNetwork/PID sharing, encrypted etcd, signed image admission",
    observedFacts: {
      privilegedContainersPresent: input.privilegedContainersPresent ?? null,
      runningAsRootUid0: input.runningAsRootUid0 ?? null,
      hostNetworkOrPidShared: input.hostNetworkOrPidShared ?? null,
      etcdEncryptedAtRest: input.etcdEncryptedAtRest ?? null,
      networkPoliciesEnforced: input.networkPoliciesEnforced ?? null,
      hardenedCompliant: compliant,
    },
    missingEvidence: ["Pod Security Admission configuration, Kyverno/OPA policies & etcd encryption KMS audit"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["NIST-SP-800-218-SSDF"]!, DOD_IC_POLICY_REGISTRY["DISA-STIG-CCI"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, hardenedCompliant: compliant };
}

export interface CloudSrgInheritanceResult {
  ruleResult: DodIcRuleResult;
  cspPaEqualsMissionAto: false;
}

/** Evaluates DoD CC SRG (IL2-IL6) Cloud Inheritance — enforcing that CSP PA != DoD Mission Owner ATO. */
export function evaluateDodCloudSrgInheritance(input: {
  impactLevel?: "IL2" | "IL4" | "IL5" | "IL6" | null;
  cspProvisionalAuthActive?: boolean | null;
  missionOwnerWorkloadAtoIssued?: boolean | null;
  sccaComponentsEnforced?: boolean | null;
  usPersonsAndConusVerified?: boolean | null;
  fedrampHighClaimedSufficientForIl5OrIl6?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): CloudSrgInheritanceResult {
  const blockers: string[] = [];
  const il = input.impactLevel ?? null;

  if (input.cspProvisionalAuthActive === false) blockers.push("Cloud Service Offering lacks an active DISA Provisional Authorization (PA) at target Impact Level");
  if (input.missionOwnerWorkloadAtoIssued === false) {
    blockers.push("CSP Provisional Authorization (PA) certifies infrastructure only — DoD Mission Owner ATO is still mandatory for hosted workload");
  }
  if ((il === "IL4" || il === "IL5") && input.sccaComponentsEnforced === false) {
    blockers.push(`DoD CC SRG ${il} requires SCCA boundary components (BCAP/VDSS/VDMS/TCCM)`);
  }
  if ((il === "IL5" || il === "IL6") && input.usPersonsAndConusVerified === false) {
    blockers.push(`DoD CC SRG ${il} mandates US Persons / CONUS physical & administrative isolation`);
  }
  if (input.fedrampHighClaimedSufficientForIl5OrIl6 === true) {
    blockers.push("FedRAMP High authorization NEVER automatically satisfies DoD CC SRG IL5 NSS or IL6 SECRET requirements");
  }

  const hasAnySignal =
    il !== null ||
    input.cspProvisionalAuthActive != null ||
    input.missionOwnerWorkloadAtoIssued != null ||
    input.sccaComponentsEnforced != null ||
    input.fedrampHighClaimedSufficientForIl5OrIl6 != null;

  const ruleResult = buildSoftwareCloudRule({
    ruleId: "DOD-CCSRG-INHERIT-001",
    ruleVersion: "2022.07.19",
    title: "DoD CC SRG (IL2–IL6) Cloud Inheritance & SCCA Boundary Governance",
    blockers,
    hasAnySignal,
    hasMissingRequired: input.cspProvisionalAuthActive == null || input.missionOwnerWorkloadAtoIssued == null,
    summaryPass: "PASS [DOD-CCSRG-INHERIT-001]: Active DISA PA, distinct Mission Owner workload ATO, SCCA boundary, and IL5/IL6 residency rules satisfied.",
    threshold: "DISA PA + independent Mission Owner ATO + SCCA (IL4/IL5) + US Persons/CONUS (IL5/IL6); FedRAMP High != IL5/IL6",
    observedFacts: {
      impactLevel: il,
      cspProvisionalAuthActive: input.cspProvisionalAuthActive ?? null,
      missionOwnerWorkloadAtoIssued: input.missionOwnerWorkloadAtoIssued ?? null,
      sccaComponentsEnforced: input.sccaComponentsEnforced ?? null,
      usPersonsAndConusVerified: input.usPersonsAndConusVerified ?? null,
      cspPaEqualsMissionAto: false,
    },
    missingEvidence: ["DISA PA CRM Inheritance Matrix, SCCA interconnection approval & Mission Owner AO ATO Letter"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DOD-CC-SRG"]!, DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, cspPaEqualsMissionAto: false };
}
