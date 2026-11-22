/**
 * Noctis RMF v2.0 — Tenant-Scoped Knowledge Graph (AI-019) & Explainable Decision Trace (AI-025)
 *
 * Enforces strict tenant isolation (no cross-tenant query or inference leakage)
 * and produces cryptographically reproducible decision-trace bundles separating
 * observed facts, deterministic classifications, and analytical estimates.
 */

import { sha256Sync } from "../universal-crypto.ts";
import type { RmfV2ErrorCode } from "./registry.ts";

export type GraphNodeType =
  | "System"
  | "Baseline"
  | "Control"
  | "AssessmentObjective"
  | "Component"
  | "Provider"
  | "Evidence"
  | "Rule"
  | "Finding"
  | "POAM"
  | "Asset"
  | "Vulnerability"
  | "Risk"
  | "MissionFunction"
  | "Authorization"
  | "MonitoringObligation";

export type GraphRelationType =
  | "CONTAINS"
  | "SUBJECT_TO"
  | "INCLUDES"
  | "HAS_OBJECTIVE"
  | "IMPLEMENTED_BY"
  | "INHERITED_FROM"
  | "SUPPORTS"
  | "EVALUATES"
  | "AFFECTS"
  | "ASSOCIATED_WITH"
  | "REMEDIATED_BY"
  | "OBSERVED_ON"
  | "DEPENDS_ON"
  | "IMPACTS"
  | "HAS_CONDITION";

export interface TenantGraphNode {
  id: string;
  tenantId: string;
  nodeType: GraphNodeType;
  label: string;
  attributes: Record<string, unknown>;
}

export interface TenantGraphEdge {
  id: string;
  tenantId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: GraphRelationType;
  provenance: string;
  validFrom: string;
  validTo: string | null;
}

export interface TenantRmfGraph {
  tenantId: string;
  nodes: TenantGraphNode[];
  edges: TenantGraphEdge[];
}

export function buildTenantRmfGraph(input: {
  tenantId: string;
  systemId: string;
  systemName: string;
  baseline: string;
  providerName?: string;
  controls?: string[];
  evidenceIds?: { evidenceId: string; controlId: string; sha256: string }[];
  findingIds?: { findingId: string; controlId: string; poamId?: string }[];
}): TenantRmfGraph {
  const validFrom = new Date().toISOString();
  const nodes: TenantGraphNode[] = [];
  const edges: TenantGraphEdge[] = [];
  const seenNodes = new Set<string>();

  const addNode = (id: string, nodeType: GraphNodeType, label: string, attributes: Record<string, unknown> = {}) => {
    if (seenNodes.has(id)) return;
    seenNodes.add(id);
    nodes.push({ id, tenantId: input.tenantId, nodeType, label, attributes });
  };

  const addEdge = (
    sourceNodeId: string,
    targetNodeId: string,
    relationType: GraphRelationType,
    provenance: string,
  ) => {
    edges.push({
      id: `${sourceNodeId}->${relationType}->${targetNodeId}`,
      tenantId: input.tenantId,
      sourceNodeId,
      targetNodeId,
      relationType,
      provenance,
      validFrom,
      validTo: null,
    });
  };

  const sysNodeId = `sys:${input.systemId}`;
  const baseNodeId = `base:${input.baseline}`;
  addNode(sysNodeId, "System", input.systemName, { systemId: input.systemId });
  addNode(baseNodeId, "Baseline", input.baseline, {});
  addEdge(sysNodeId, baseNodeId, "SUBJECT_TO", "FIPS-199/SP-800-53B");

  if (input.providerName) {
    const provId = `prov:${input.providerName}`;
    addNode(provId, "Provider", input.providerName, {});
  }

  for (const cid of input.controls || []) {
    const ctrlId = `ctrl:${cid}`;
    addNode(ctrlId, "Control", cid, { controlId: cid });
    addEdge(baseNodeId, ctrlId, "INCLUDES", "NIST-SP-800-53B");
    if (input.providerName && /^PE-|^MA-/.test(cid)) {
      addEdge(ctrlId, `prov:${input.providerName}`, "INHERITED_FROM", "CRM");
    }
  }

  for (const ev of input.evidenceIds || []) {
    const evNodeId = `ev:${ev.evidenceId}`;
    const objNodeId = `obj:${ev.controlId}`;
    addNode(evNodeId, "Evidence", ev.evidenceId, { sha256: ev.sha256 });
    addNode(objNodeId, "AssessmentObjective", `${ev.controlId} Objectives`, { controlId: ev.controlId });
    addEdge(`ctrl:${ev.controlId}`, objNodeId, "HAS_OBJECTIVE", "NIST-SP-800-53A");
    addEdge(evNodeId, objNodeId, "SUPPORTS", `sha256:${ev.sha256.slice(0, 12)}`);
  }

  for (const f of input.findingIds || []) {
    const fNodeId = `find:${f.findingId}`;
    addNode(fNodeId, "Finding", f.findingId, { controlId: f.controlId });
    addEdge(fNodeId, `ctrl:${f.controlId}`, "ASSOCIATED_WITH", "AssessmentFinding");
    if (f.poamId) {
      const pNodeId = `poam:${f.poamId}`;
      addNode(pNodeId, "POAM", f.poamId, {});
      addEdge(fNodeId, pNodeId, "REMEDIATED_BY", "POA&M");
    }
  }

  return { tenantId: input.tenantId, nodes, edges };
}

export function queryTenantRmfGraph(input: {
  graph: TenantRmfGraph;
  requestTenantId: string;
  nodeType?: GraphNodeType;
  relationType?: GraphRelationType;
}): {
  allowed: boolean;
  errorCode?: RmfV2ErrorCode;
  nodes: TenantGraphNode[];
  edges: TenantGraphEdge[];
  reason?: string;
} {
  if (!input.requestTenantId || input.requestTenantId !== input.graph.tenantId) {
    return {
      allowed: false,
      errorCode: "CROSS_TENANT_ACCESS",
      nodes: [],
      edges: [],
      reason: `Tenant isolation violation: caller tenant '${input.requestTenantId || "MISSING"}' cannot query graph owned by tenant '${input.graph.tenantId}'.`,
    };
  }

  const nodes = input.nodeType
    ? input.graph.nodes.filter((n) => n.nodeType === input.nodeType && n.tenantId === input.requestTenantId)
    : input.graph.nodes.filter((n) => n.tenantId === input.requestTenantId);

  const edges = input.relationType
    ? input.graph.edges.filter((e) => e.relationType === input.relationType && e.tenantId === input.requestTenantId)
    : input.graph.edges.filter((e) => e.tenantId === input.requestTenantId);

  return { allowed: true, nodes, edges };
}

// ----------------------------------------------------------------------------
// AI-025: Reproducible Explainable Decision Trace Bundle
// ----------------------------------------------------------------------------
export interface ExplanationRuleTraceItem {
  ruleId: string;
  ruleVersion: string;
  controlId: string;
  assessmentMode: string;
  verdict: string;
  formalDetermination: string;
  variance: string;
  auditHash: string;
  observedFacts: Record<string, string | number | boolean | null>;
  authorityDocs: string[];
}

export interface ExplanationBundle {
  bundleId: string;
  tenantId: string;
  evaluationRef: string;
  nistVersion: string;
  dbSha256: string;
  ruleId: string;
  ruleVersion: string;
  evidenceSha256: string;
  observedFacts: Record<string, string | number | boolean | null>;
  deterministicClassifications: string[];
  analyticalEstimates: { estimate: string; assumptions: string[]; uncertainty: string }[];
  verdict: string;
  ruleEvaluations?: ExplanationRuleTraceItem[];
  canonicalTraceHash: string;
  createdAt: string;
}

function canonicalSortValue(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(canonicalSortValue);
  if (val && typeof val === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>).sort()) {
      const v = (val as Record<string, unknown>)[key];
      if (v !== undefined) sorted[key] = canonicalSortValue(v);
    }
    return sorted;
  }
  return val;
}

function canonicalTracePayload(bundle: Omit<ExplanationBundle, "bundleId" | "canonicalTraceHash" | "createdAt">): string {
  const payload: Record<string, unknown> = {
    tenantId: bundle.tenantId,
    evaluationRef: bundle.evaluationRef,
    nistVersion: bundle.nistVersion,
    dbSha256: bundle.dbSha256,
    ruleId: bundle.ruleId,
    ruleVersion: bundle.ruleVersion,
    evidenceSha256: bundle.evidenceSha256,
    observedFacts: bundle.observedFacts,
    deterministicClassifications: bundle.deterministicClassifications,
    analyticalEstimates: bundle.analyticalEstimates,
    verdict: bundle.verdict,
  };
  if (bundle.ruleEvaluations !== undefined) {
    payload.ruleEvaluations = bundle.ruleEvaluations;
    // Use canonical deep key-sorted JSON so PostgreSQL JSONB key-reordering never breaks hash replay
    return JSON.stringify(canonicalSortValue(payload));
  }
  return JSON.stringify(payload);
}

export function createExplanationBundle(
  input: Omit<ExplanationBundle, "bundleId" | "canonicalTraceHash" | "createdAt">,
): ExplanationBundle {
  const canonicalTraceHash = sha256Sync(canonicalTracePayload(input));
  return {
    bundleId: `EXPL-${canonicalTraceHash.slice(0, 12).toUpperCase()}`,
    ...input,
    canonicalTraceHash,
    createdAt: new Date().toISOString(),
  };
}

export function replayExplanationBundle(bundle: ExplanationBundle): {
  reproducible: boolean;
  canonicalTraceHash: string;
  recomputedHash: string;
  verdict: string;
} {
  const recomputedHash = sha256Sync(
    canonicalTracePayload({
      tenantId: bundle.tenantId,
      evaluationRef: bundle.evaluationRef,
      nistVersion: bundle.nistVersion,
      dbSha256: bundle.dbSha256,
      ruleId: bundle.ruleId,
      ruleVersion: bundle.ruleVersion,
      evidenceSha256: bundle.evidenceSha256,
      observedFacts: bundle.observedFacts,
      deterministicClassifications: bundle.deterministicClassifications,
      analyticalEstimates: bundle.analyticalEstimates,
      verdict: bundle.verdict,
      ...(bundle.ruleEvaluations !== undefined ? { ruleEvaluations: bundle.ruleEvaluations } : {}),
    }),
  );
  return {
    reproducible: recomputedHash === bundle.canonicalTraceHash,
    canonicalTraceHash: bundle.canonicalTraceHash,
    recomputedHash,
    verdict: bundle.verdict,
  };
}
