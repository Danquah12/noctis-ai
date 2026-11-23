/**
 * Capability #5 — Noctis Compliance Knowledge Graph
 * Capability #8 — Noctis Mission Risk Intelligence
 *
 * 1. Builds a tenant- and classification-isolated property graph linking Policies,
 *    NIST Controls, DISA CCIs, CVEs/STIG Vulnerabilities, Enclave Assets, Findings/POA&Ms,
 *    Mission Essential Functions (MEFs), and Operational Mission Risks.
 * 2. Translates technical vulnerabilities & control failures into deterministic Mission
 *    Operational Readiness Scores (0-100), FMC/PMC/NMC posture, and Remediation ROI.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { CLASSIFICATION_RANK, type SecurityClassification } from "../dod-ic/classification-gateway.ts";
import { DOD_IC_POLICY_REGISTRY } from "../dod-ic/policy-registry.ts";
import { searchStigLibrary } from "../dod-ic/stig-library.ts";
import type {
  ClassificationTier,
  EnterpriseGraphEdge,
  EnterpriseGraphNode,
  MissionRiskAssessmentResult,
} from "./types.ts";

interface MissionAssetBinding {
  assetId: string;
  assetName: string;
  criticality: "MISSION_CRITICAL" | "ESSENTIAL" | "SUPPORT";
  classification: ClassificationTier;
  controls: string[];
  mefId: string;
  mefName: string;
}

const DEFAULT_ASSETS: MissionAssetBinding[] = [
  {
    assetId: "AST-IDP-01",
    assetName: "DoD PKI / CAC Identity Broker",
    criticality: "MISSION_CRITICAL",
    classification: "CUI",
    controls: ["IA-2(1)", "IA-2(5)", "IA-5(2)", "AC-2(3)"],
    mefId: "MEF-C2-AUTH",
    mefName: "Command & Control Identity Federation (JADC2)",
  },
  {
    assetId: "AST-K8S-CORE",
    assetName: "IL5 Sovereign Kubernetes Compute Plane",
    criticality: "MISSION_CRITICAL",
    classification: "CUI",
    controls: ["SC-13", "SC-7", "AC-6", "CM-6"],
    mefId: "MEF-C2-COMPUTE",
    mefName: "Real-Time Operational Reasoning & Telemetry Pipeline",
  },
  {
    assetId: "AST-CDS-GUARD",
    assetName: "Approved Cross-Domain Solution (CDS) Guard",
    criticality: "MISSION_CRITICAL",
    classification: "SECRET",
    controls: ["AC-4", "SC-7", "AU-9"],
    mefId: "MEF-CDS-XFER",
    mefName: "Authorized High-to-Low Intelligence Dissemination",
  },
  {
    assetId: "AST-SCIF-WORK",
    assetName: "SCIF Analytic Fusion Node (JWICS)",
    criticality: "MISSION_CRITICAL",
    classification: "TS_SCI",
    controls: ["PE-3", "MP-6", "SC-13"],
    mefId: "MEF-SCI-FUSION",
    mefName: "Multi-INT TS/SCI All-Source Assessment",
  },
];

export function queryComplianceKnowledgeGraph(input: {
  tenantId: string;
  requesterTenantId?: string;
  maxClassification?: ClassificationTier;
  focusNodeId?: string;
}): {
  allowed: boolean;
  errorCode?: "CROSS_TENANT_GRAPH_BLOCK";
  tenantId: string;
  maxClassification: ClassificationTier;
  filteredHigherClassCount: number;
  nodes: EnterpriseGraphNode[];
  edges: EnterpriseGraphEdge[];
  graphSha256: string;
} {
  const effectiveRequester = (input.requesterTenantId || input.tenantId).trim();
  if (effectiveRequester !== input.tenantId.trim()) {
    return {
      allowed: false,
      errorCode: "CROSS_TENANT_GRAPH_BLOCK",
      tenantId: input.tenantId,
      maxClassification: input.maxClassification || "CUI",
      filteredHigherClassCount: 0,
      nodes: [],
      edges: [],
      graphSha256: sha256Sync(`BLOCK:${input.tenantId}:${effectiveRequester}`),
    };
  }

  const maxClass: SecurityClassification = input.maxClassification || "CUI";
  const maxRank = CLASSIFICATION_RANK[maxClass];

  const allNodes: EnterpriseGraphNode[] = [];
  const allEdges: EnterpriseGraphEdge[] = [];
  const seenNode = new Set<string>();

  const addNode = (n: EnterpriseGraphNode) => {
    if (seenNode.has(n.id)) return;
    seenNode.add(n.id);
    allNodes.push(n);
  };
  const addEdge = (sourceId: string, targetId: string, relation: string) => {
    allEdges.push({ sourceId, targetId, relation });
  };

  // Seed core Policy -> Control links from verified DoD/IC Registry
  for (const pol of Object.values(DOD_IC_POLICY_REGISTRY).slice(0, 8)) {
    const pid = `pol:${pol.id}`;
    addNode({
      id: pid,
      nodeType: "Policy",
      label: `${pol.id}: ${pol.title}`,
      classification: "UNCLASSIFIED",
      tenantId: input.tenantId,
      attributes: { jurisdiction: pol.jurisdiction, effectiveDate: pol.effectiveDate },
    });
  }

  // Seed STIG -> CCI -> Control links from public STIG library
  const stigs = searchStigLibrary({ limit: 12 });
  for (const r of stigs) {
    const sid = `vuln:${r.groupId}`;
    addNode({
      id: sid,
      nodeType: "Vulnerability",
      label: `${r.groupId} (${r.severity}): ${r.title.slice(0, 72)}`,
      classification: "UNCLASSIFIED",
      tenantId: input.tenantId,
      attributes: { benchmark: r.benchmarkId, severity: r.severity },
    });
    for (const cciId of r.cciIds.slice(0, 1)) {
      const cid = `cci:${cciId}`;
      addNode({
        id: cid,
        nodeType: "DISA_CCI",
        label: cciId,
        classification: "UNCLASSIFIED",
        tenantId: input.tenantId,
        attributes: {},
      });
      addEdge(sid, cid, "MAPS_TO_CCI");
    }
    for (const ctrl of r.nistRev5Controls.slice(0, 2)) {
      const ctrlId = `ctrl:${ctrl}`;
      addNode({
        id: ctrlId,
        nodeType: "Control",
        label: ctrl,
        classification: "UNCLASSIFIED",
        tenantId: input.tenantId,
        attributes: {},
      });
      addEdge(sid, ctrlId, "TESTS_CONTROL");
      addEdge("pol:DODI-8510.01", ctrlId, "GOVERNS");
    }
  }

  // Seed Assets -> Controls -> Mission Essential Functions -> Mission Risks
  for (const asset of DEFAULT_ASSETS) {
    const aid = `asset:${asset.assetId}`;
    const mid = `mef:${asset.mefId}`;
    const rid = `risk:${asset.mefId}`;
    addNode({
      id: aid,
      nodeType: "Asset",
      label: asset.assetName,
      classification: asset.classification,
      tenantId: input.tenantId,
      attributes: { criticality: asset.criticality },
    });
    addNode({
      id: mid,
      nodeType: "MissionFunction",
      label: asset.mefName,
      classification: asset.classification,
      tenantId: input.tenantId,
      attributes: { mefId: asset.mefId },
    });
    addNode({
      id: rid,
      nodeType: "MissionRisk",
      label: `Operational Degradation Risk: ${asset.mefName}`,
      classification: asset.classification,
      tenantId: input.tenantId,
      attributes: {},
    });
    addEdge(aid, mid, "SUPPORTS_MISSION");
    addEdge(mid, rid, "EXPOSED_TO_RISK");
    for (const c of asset.controls) {
      const ctrlId = `ctrl:${c}`;
      addNode({
        id: ctrlId,
        nodeType: "Control",
        label: c,
        classification: "UNCLASSIFIED",
        tenantId: input.tenantId,
        attributes: {},
      });
      addEdge(aid, ctrlId, "IMPLEMENTS_CONTROL");
    }
  }

  // Filter strictly by classification boundary
  const allowedNodes = allNodes.filter((n) => CLASSIFICATION_RANK[n.classification] <= maxRank);
  const filteredHigherClassCount = allNodes.length - allowedNodes.length;
  const allowedIds = new Set(allowedNodes.map((n) => n.id));
  const allowedEdges = allEdges.filter((e) => allowedIds.has(e.sourceId) && allowedIds.has(e.targetId));

  let focusNodes = allowedNodes;
  let focusEdges = allowedEdges;
  if (input.focusNodeId?.trim()) {
    const needle = input.focusNodeId.trim().toLowerCase();
    const matchedIds = new Set(
      allowedNodes
        .filter((n) => n.id.toLowerCase().includes(needle) || n.label.toLowerCase().includes(needle))
        .map((n) => n.id),
    );
    const neighborIds = new Set(matchedIds);
    for (const e of allowedEdges) {
      if (matchedIds.has(e.sourceId)) neighborIds.add(e.targetId);
      if (matchedIds.has(e.targetId)) neighborIds.add(e.sourceId);
    }
    focusNodes = allowedNodes.filter((n) => neighborIds.has(n.id));
    focusEdges = allowedEdges.filter((e) => neighborIds.has(e.sourceId) && neighborIds.has(e.targetId));
  }

  return {
    allowed: true,
    tenantId: input.tenantId,
    maxClassification: maxClass,
    filteredHigherClassCount,
    nodes: focusNodes,
    edges: focusEdges,
    graphSha256: sha256Sync(JSON.stringify({ nodes: focusNodes.map((n) => n.id), edges: focusEdges.length, maxClass })),
  };
}

export function findOrphanControls(requiredControls: string[] = ["IA-2(1)", "SC-13", "AC-2(3)", "AU-9", "CM-6", "PE-3"]): {
  requiredCount: number;
  unmappedControls: string[];
} {
  const stigs = searchStigLibrary({ limit: 100 });
  const mapped = new Set<string>();
  for (const s of stigs) {
    for (const c of s.nistRev5Controls) mapped.add(c.toUpperCase());
  }
  const unmapped = requiredControls.filter((c) => !mapped.has(c.toUpperCase()));
  return {
    requiredCount: requiredControls.length,
    unmappedControls: unmapped,
  };
}

export function assessMissionRiskIntelligence(input: {
  kevExposedCriticalAssets?: number;
  openCatIStigFindings?: number;
  failedCriticalControls?: string[];
  cdsDegraded?: boolean;
}): MissionRiskAssessmentResult {
  const kevCount = Math.max(0, Number(input.kevExposedCriticalAssets ?? 0));
  const cat1Count = Math.max(0, Number(input.openCatIStigFindings ?? 0));
  const failedCtrls = Array.isArray(input.failedCriticalControls) ? input.failedCriticalControls : [];
  const cdsDegraded = Boolean(input.cdsDegraded);

  const penalty = Math.min(95, kevCount * 22 + cat1Count * 15 + failedCtrls.length * 10 + (cdsDegraded ? 30 : 0));
  const score = Math.max(5, 100 - penalty);

  const readinessPosture: MissionRiskAssessmentResult["readinessPosture"] =
    score >= 85 ? "FMC" : score >= 60 ? "PMC" : "NMC";

  const operationalRiskTier: MissionRiskAssessmentResult["operationalRiskTier"] =
    score < 45
      ? "CRITICAL_MISSION_STOP"
      : score < 65
      ? "HIGH_OPERATIONAL_DEGRADATION"
      : score < 85
      ? "MODERATE"
      : "LOW";

  const failedUpper = new Set(failedCtrls.map((c) => c.toUpperCase()));

  const impactedMissionFunctions = DEFAULT_ASSETS.map((a) => {
    const overlap = a.controls.filter((c) => failedUpper.has(c.toUpperCase()));
    let status: "MISSION_CAPABLE" | "DEGRADED" | "MISSION_STOP" = "MISSION_CAPABLE";
    const reasons: string[] = [];
    if (a.assetId === "AST-CDS-GUARD" && cdsDegraded) {
      status = "MISSION_STOP";
      reasons.push("Approved Cross-Domain Solution (CDS) degraded — automated transfer halted");
    }
    if (overlap.length > 0) {
      status = overlap.length >= 2 || kevCount > 0 ? "MISSION_STOP" : "DEGRADED";
      reasons.push(`Failed controls impacting asset: ${overlap.join(", ")}`);
    }
    if (kevCount > 0 && a.assetId === "AST-K8S-CORE") {
      status = "MISSION_STOP";
      reasons.push(`${kevCount} CISA KEV vulnerability exposed on mission compute plane`);
    }
    if (cat1Count > 0 && status === "MISSION_CAPABLE") {
      status = "DEGRADED";
      reasons.push(`${cat1Count} open CAT I STIG finding(s) constrain AO enclave trust`);
    }
    return {
      mefId: a.mefId,
      name: a.mefName,
      status,
      blastRadiusReason: reasons.length ? reasons.join("; ") : "All mapped controls & enclave boundaries nominal.",
    };
  });

  const remediationRoi: MissionRiskAssessmentResult["remediationRoi"] = [];
  if (cdsDegraded) {
    remediationRoi.push({
      priorityRank: 1,
      action: "Restore accredited Cross-Domain Solution guard health & verify ISA/MOU before resuming transfers",
      riskReductionPoints: 30,
      addressesItems: ["CDS-GUARD", "AC-4", "DoDI 8540.01"],
    });
  }
  if (kevCount > 0) {
    remediationRoi.push({
      priorityRank: remediationRoi.length + 1,
      action: `Patch ${kevCount} CISA KEV critical vulnerability(ies) and run credentialed ACAS rescan`,
      riskReductionPoints: kevCount * 22,
      addressesItems: ["CISA KEV / DoDI 8531.01", "RA-5", "SI-2"],
    });
  }
  if (cat1Count > 0) {
    remediationRoi.push({
      priorityRank: remediationRoi.length + 1,
      action: `Remediate ${cat1Count} CAT I STIG baseline violation(s) & validate with SCAP/STIG Viewer`,
      riskReductionPoints: cat1Count * 15,
      addressesItems: ["DISA STIG CAT I", "CM-6"],
    });
  }
  if (failedCtrls.length > 0) {
    remediationRoi.push({
      priorityRank: remediationRoi.length + 1,
      action: `Remediate failed controls (${failedCtrls.join(", ")}) and re-run Continuous Control Validation`,
      riskReductionPoints: failedCtrls.length * 10,
      addressesItems: failedCtrls,
    });
  }
  if (remediationRoi.length === 0) {
    remediationRoi.push({
      priorityRank: 1,
      action: "Maintain automated Continuous Control Validation (CCV) & scheduled upstream policy drift monitoring",
      riskReductionPoints: 0,
      addressesItems: ["CONMON / ICD 502"],
    });
  }

  return {
    operationalReadinessScore: score,
    readinessPosture,
    operationalRiskTier,
    impactedMissionFunctions,
    remediationRoi,
    assessmentSha256: sha256Sync(JSON.stringify({ input, score, readinessPosture, operationalRiskTier })),
    aiCanIssueAto: false,
  };
}
