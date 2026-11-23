/**
 * Noctis Enterprise Intelligence Platform — Unified REST API Handler (`/api/v2/enterprise/*`)
 *
 * Exposes all 10 Enterprise Capabilities, 3 Immediate Priorities, 6-Panel Command Center telemetry,
 * 9 Government-Readiness Controls, CycloneDX SBOM summary, Repository Gap Analysis, and
 * Master Development Plan with Better-Auth / RBAC caller resolution.
 */

import { resolveDodIcCallerContext } from "../dod-ic/rbac.server.ts";
import { DOD_IC_POLICY_REGISTRY } from "../dod-ic/policy-registry.ts";
import { getDisaCciManifest } from "../dod-ic/stig-acas-engine.ts";
import { searchStigLibrary } from "../dod-ic/stig-library.ts";
import { STARTER_10_CONTROLS } from "../noctis-rmf-rules.ts";
import { getNdkrsStatusSummary } from "../ndkrs/persistence.server.ts";
import { getIngestStatistics } from "../noctis-universal-ingestor.ts";
import { listPolicyAsCodePacks, compilePolicyRulePack, evaluatePolicyPack } from "./policy-as-code-engine.ts";
import { getDefaultAuthorizationTwin, evaluateAuthorizationTwin, simulateInheritanceChange } from "./authorization-digital-twin.ts";
import { analyzeEvidencePortfolio, runContinuousControlValidation } from "./evidence-and-ccv-engine.ts";
import { queryComplianceKnowledgeGraph, findOrphanControls, assessMissionRiskIntelligence } from "./graph-and-mission-risk.ts";
import { listGovernedAgents, evaluateAgentActionPolicy, proposeAutonomousAction, authorizeAgentProposal } from "./ai-agent-governance.ts";
import { routeSecureModelRequest } from "./secure-model-gateway.ts";
import { sealCustodyArtifact, transferCustodyArtifact, verifyArtifactCustodyChain } from "./evidence-chain-of-custody.ts";
import { verifySubstantiveOutput } from "./independent-verification-engine.ts";
import { runAiEvaluationLabSuite, investigateEvaluationCase } from "./ai-evaluation-lab.ts";
import { getGovernmentReadinessAssessment } from "./government-readiness.ts";
import { getMasterDevelopmentPlan } from "./master-plan-audit.ts";
import {
  ensureEnterpriseSchema,
  getCustodySummaryCounts,
  listAgentActivity,
  listAgentProposals,
  listCustodyEvents,
  listEvalRuns,
  listVerificationStats,
  savePolicyBundle,
  verifyAgentActivityHashChain,
} from "./persistence.server.ts";
import type {
  AuthorizationBoundaryTwin,
  ClassificationTier,
  ContinuousTelemetrySample,
  EnterpriseCommandCenterSnapshot,
  EvidencePortfolioItem,
  ModelDeploymentTier,
  PolicyAsCodeRule,
} from "./types.ts";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key, X-Tenant-Id, X-Noctis-Role",
};

function jsonRes(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

export async function buildEnterpriseCommandCenterSnapshot(caller?: {
  actorId: string;
  tenantId: string;
  rbacRole: string;
  authMethod: string;
}): Promise<EnterpriseCommandCenterSnapshot> {
  const { sql, dbSource } = await ensureEnterpriseSchema();

  let ndkrsSummary: Awaited<ReturnType<typeof getNdkrsStatusSummary>> | null = null;
  let recordsByDomain: Record<string, number> = {
    clinical: 0,
    rmf: 0,
    cybersecurity: 0,
    legal: 0,
    science: 0,
    engineering: 0,
    general: 0,
  };
  try {
    ndkrsSummary = await getNdkrsStatusSummary();
    const domRows = await sql.query<{ domain: string; c: number }>(
      "SELECT domain, count(*)::int AS c FROM ndkrs.knowledge_records WHERE verification_status = 'VERIFIED' GROUP BY domain",
    );
    for (const r of domRows) {
      recordsByDomain[String(r.domain)] = Number(r.c || 0);
    }
  } catch {
    /* keep baseline 0s when NDKRS not seeded yet in isolated test */
  }

  let ingestTotal = 0;
  try {
    ingestTotal = getIngestStatistics().totalIngested;
  } catch {
    ingestTotal = 0;
  }

  let evalRuns = await listEvalRuns(5);
  if (evalRuns.length === 0) {
    const firstRun = await runAiEvaluationLabSuite("command-center-bootstrap");
    evalRuns = [firstRun];
  }
  const latestRun = evalRuns[0]!;
  const avgLatencyMs =
    latestRun.results.length > 0
      ? Math.round(latestRun.results.reduce((s, c) => s + c.durationMs, 0) / latestRun.results.length)
      : latestRun.durationMs;
  const crit046 = latestRun.results.find((r) => r.caseId === "CRIT-046");
  const crit047 = latestRun.results.find((r) => r.caseId === "CRIT-047");

  const [verifStats, proposals, activity, activityChain, custodyCounts] = await Promise.all([
    listVerificationStats(),
    listAgentProposals(12),
    listAgentActivity(15),
    verifyAgentActivityHashChain(),
    getCustodySummaryCounts(),
  ]);

  const govReadiness = getGovernmentReadinessAssessment();
  const cciManifest = getDisaCciManifest();
  const stigRules = searchStigLibrary({ limit: 100 });

  return {
    generatedAt: new Date().toISOString(),
    rbacCaller: caller || {
      actorId: "system",
      tenantId: "tenant:public-sandbox",
      rbacRole: "PUBLIC_SANDBOX",
      authMethod: "SANDBOX_PUBLIC",
    },
    databaseHealth: {
      dbSource: ndkrsSummary?.dbSource || dbSource,
      ndkrsSchemaReady: Boolean(ndkrsSummary),
      enterpriseSchemaReady: true,
      verifiedSourcesCount: ndkrsSummary?.counts.sources ?? 0,
      verifiedRecordsCount: ndkrsSummary?.counts.verifiedRecords ?? 0,
      vectorChunksCount: ndkrsSummary?.counts.chunks ?? 0,
      ingestTotalEvents: ingestTotal,
      embeddingModel: ndkrsSummary?.dominantEmbeddingModel || "noctis-det-embed-384-v1",
    },
    aiModelPerformance: {
      latestRunId: latestRun.id,
      suiteName: latestRun.suiteName,
      totalCases: latestRun.totalCases,
      passedCases: latestRun.passedCases,
      failedCases: latestRun.failedCases,
      accuracyPct: latestRun.accuracyPct,
      avgLatencyMs,
      lastEvaluatedAt: latestRun.createdAt || null,
      crit046Status: crit046?.status === "PASS" ? "PASS" : "FAIL",
      crit047Status: crit047?.status === "PASS" ? "PASS" : "FAIL",
    },
    safetyValidation: verifStats,
    knowledgeCoverage: {
      ndkrsDomainsCovered: Object.values(recordsByDomain).filter((n) => n > 0).length || 7,
      recordsByDomain,
      openKnowledgeGaps: ndkrsSummary?.counts.openKnowledgeGaps ?? 0,
      dodIcPoliciesCount: Object.keys(DOD_IC_POLICY_REGISTRY).length,
      disaCciCount: cciManifest.counts.totalCcis,
      indexedStigRulesCount: stigRules.length,
      rmfControlEvaluators: STARTER_10_CONTROLS.length,
    },
    agentActivity: {
      governedAgentsCount: listGovernedAgents().length,
      pendingProposalsCount: proposals.filter((p) => p.status === "PENDING_HUMAN_AUTH").length,
      totalActivityEvents: activityChain.totalEvents,
      activityChainIntact: activityChain.chainIntact,
      recentProposals: proposals,
      recentActivity: activity,
    },
    securityOperations: {
      gate0FailClosedActive: true,
      custodyArtifactsTracked: custodyCounts.distinctArtifacts,
      custodyEventsCount: custodyCounts.totalEvents,
      govReadinessControlsImplemented: govReadiness.implementedCount,
      govReadinessTotalControls: govReadiness.totalControls,
      designAlignedNotAccredited: true,
      accreditationNotice: govReadiness.accreditationNotice,
    },
  };
}

export async function handleEnterpriseV2Request(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/v2\/enterprise\/?/, "").replace(/\/+$/, "");
  const caller = await resolveDodIcCallerContext(request);
  const callerSummary = {
    actorId: caller.actorId,
    tenantId: caller.tenantId,
    rbacRole: caller.rbacRole,
    authMethod: caller.authMethod,
  };

  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    body = ((await request.json().catch(() => ({}))) as Record<string, unknown>) || {};
  }

  if (!subPath || subPath === "status") {
    return jsonRes({
      platform: "Noctis Enterprise Intelligence Platform",
      version: "1.0.0",
      capabilitiesCount: 10,
      immediatePrioritiesCount: 3,
      commandCenterPanels: 6,
      governmentReadinessControls: 9,
      rbacCaller: callerSummary,
      endpoints: [
        "/api/v2/enterprise/command-center",
        "/api/v2/enterprise/policy-as-code/packs",
        "/api/v2/enterprise/policy-as-code/evaluate",
        "/api/v2/enterprise/digital-twin/evaluate",
        "/api/v2/enterprise/digital-twin/simulate-inheritance",
        "/api/v2/enterprise/evidence/analyze",
        "/api/v2/enterprise/ccv/validate",
        "/api/v2/enterprise/knowledge-graph/query",
        "/api/v2/enterprise/agents/manifest",
        "/api/v2/enterprise/agents/propose",
        "/api/v2/enterprise/agents/authorize",
        "/api/v2/enterprise/model-gateway/route",
        "/api/v2/enterprise/mission-risk/assess",
        "/api/v2/enterprise/custody/seal",
        "/api/v2/enterprise/custody/transfer",
        "/api/v2/enterprise/custody/verify",
        "/api/v2/enterprise/verify",
        "/api/v2/enterprise/eval-lab/run",
        "/api/v2/enterprise/eval-lab/investigate/:caseId",
        "/api/v2/enterprise/government-readiness",
        "/api/v2/enterprise/master-plan",
      ],
    });
  }

  if (subPath === "command-center") {
    const snap = await buildEnterpriseCommandCenterSnapshot(callerSummary);
    return jsonRes(snap);
  }

  if (subPath === "master-plan") {
    return jsonRes(getMasterDevelopmentPlan());
  }

  if (subPath === "government-readiness") {
    return jsonRes(getGovernmentReadinessAssessment());
  }

  if (subPath === "policy-as-code/packs") {
    return jsonRes({ packs: listPolicyAsCodePacks() });
  }

  if (subPath === "policy-as-code/evaluate") {
    const customRules = Array.isArray(body.rules) ? (body.rules as PolicyAsCodeRule[]) : null;
    const facts = (body.facts && typeof body.facts === "object" ? body.facts : body) as Record<string, unknown>;
    if (customRules && customRules.length > 0) {
      const compiled = compilePolicyRulePack({
        packId: typeof body.pack_id === "string" ? body.pack_id : "CUSTOM-PAC",
        name: typeof body.name === "string" ? body.name : "Custom Compiled Policy Bundle",
        authoritySource: typeof body.authority_source === "string" ? body.authority_source : "Organization Policy",
        rules: customRules,
      });
      await savePolicyBundle({
        id: compiled.packId,
        name: compiled.name,
        version: compiled.version,
        authoritySource: compiled.authoritySource,
        rules: compiled.rules,
        bundleSha256: compiled.bundleSha256,
        createdBy: caller.actorId,
      });
      return jsonRes(evaluatePolicyPack(compiled, facts));
    }
    const packId = typeof body.pack_id === "string" ? body.pack_id : url.searchParams.get("pack") || "DOD-IL5-CORE";
    return jsonRes(evaluatePolicyPack(packId, facts));
  }

  if (subPath === "digital-twin/evaluate") {
    const twin =
      body.twin && typeof body.twin === "object" ? (body.twin as AuthorizationBoundaryTwin) : getDefaultAuthorizationTwin();
    return jsonRes({ twin, evaluation: evaluateAuthorizationTwin(twin) });
  }

  if (subPath === "digital-twin/simulate-inheritance") {
    const baseTwin =
      body.twin && typeof body.twin === "object" ? (body.twin as AuthorizationBoundaryTwin) : getDefaultAuthorizationTwin();
    const providerId = typeof body.provider_id === "string" ? body.provider_id : "PROV-CSP-IL5";
    const rawStatus = typeof body.new_pa_status === "string" ? body.new_pa_status.toUpperCase() : "REVOKED";
    const newPaStatus = (["ACTIVE", "DEGRADED", "REVOKED", "EXPIRED"].includes(rawStatus) ? rawStatus : "REVOKED") as
      | "ACTIVE"
      | "DEGRADED"
      | "REVOKED"
      | "EXPIRED";
    const impactedControls = Array.isArray(body.impacted_controls) ? (body.impacted_controls as string[]) : undefined;
    return jsonRes(simulateInheritanceChange(baseTwin, { providerId, newPaStatus, impactedControls }));
  }

  if (subPath === "evidence/analyze") {
    const items = Array.isArray(body.items) ? (body.items as EvidencePortfolioItem[]) : [];
    const reqCtrls = Array.isArray(body.required_controls) ? (body.required_controls as string[]) : undefined;
    return jsonRes(analyzeEvidencePortfolio(items, reqCtrls));
  }

  if (subPath === "ccv/validate") {
    const telemetry = (
      body.telemetry && typeof body.telemetry === "object" ? body.telemetry : body
    ) as ContinuousTelemetrySample;
    const sspClaims =
      body.ssp_claims && typeof body.ssp_claims === "object"
        ? (body.ssp_claims as Record<string, "Implemented" | "Planned" | "Partial">)
        : {};
    return jsonRes(runContinuousControlValidation(telemetry, sspClaims));
  }

  if (subPath === "knowledge-graph/query") {
    const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : caller.tenantId;
    const requesterTenantId =
      typeof body.requester_tenant_id === "string" ? body.requester_tenant_id : caller.tenantId;
    const maxClassification = (
      typeof body.max_classification === "string" ? body.max_classification : url.searchParams.get("classification") || "CUI"
    ) as ClassificationTier;
    const focusNodeId = typeof body.focus === "string" ? body.focus : url.searchParams.get("focus") || undefined;
    const res = queryComplianceKnowledgeGraph({ tenantId, requesterTenantId, maxClassification, focusNodeId });
    const orphans = findOrphanControls();
    return jsonRes({ ...res, orphans }, res.allowed ? 200 : 403);
  }

  if (subPath === "mission-risk/assess") {
    return jsonRes(
      assessMissionRiskIntelligence({
        kevExposedCriticalAssets: typeof body.kev_exposed_assets === "number" ? body.kev_exposed_assets : 0,
        openCatIStigFindings: typeof body.open_cat1_stigs === "number" ? body.open_cat1_stigs : 0,
        failedCriticalControls: Array.isArray(body.failed_controls) ? (body.failed_controls as string[]) : [],
        cdsDegraded: body.cds_degraded === true,
      }),
    );
  }

  if (subPath === "agents/manifest") {
    return jsonRes({ agents: listGovernedAgents() });
  }

  if (subPath === "agents/activity") {
    const [activity, chain, proposals] = await Promise.all([
      listAgentActivity(30),
      verifyAgentActivityHashChain(),
      listAgentProposals(25),
    ]);
    return jsonRes({ ...chain, activity, proposals });
  }

  if (subPath === "agents/evaluate-action") {
    const res = await evaluateAgentActionPolicy({
      agentId: typeof body.agent_id === "string" ? body.agent_id : "RESEARCH_AGENT",
      actionType: typeof body.action_type === "string" ? body.action_type : "READ_EVIDENCE",
      toolName: typeof body.tool_name === "string" ? body.tool_name : "hybrid_search_ndkrs",
      targetClassification: (typeof body.target_classification === "string"
        ? body.target_classification
        : "UNCLASSIFIED") as ClassificationTier,
      tenantId: caller.tenantId,
    });
    return jsonRes(res, res.decision === "DENY" ? 403 : 200);
  }

  if (subPath === "agents/propose") {
    const prop = await proposeAutonomousAction({
      agentId: typeof body.agent_id === "string" ? body.agent_id : "POLICY_DRAFTING_AGENT",
      actionType: typeof body.action_type === "string" ? body.action_type : "PROPOSE_CHANGE",
      targetResource: typeof body.target_resource === "string" ? body.target_resource : "DOD-IL5-CORE",
      riskTier: typeof body.risk_tier === "string" ? body.risk_tier : "HIGH",
      classificationLevel: (typeof body.classification === "string" ? body.classification : "UNCLASSIFIED") as ClassificationTier,
      rationale: typeof body.rationale === "string" ? body.rationale : "Autonomous policy refinement proposal.",
      payload: body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : {},
      requestedBy: typeof body.requested_by === "string" ? body.requested_by : undefined,
      tenantId: caller.tenantId,
    });
    return jsonRes({ proposal: prop }, prop.status === "BLOCKED_POLICY" ? 403 : 200);
  }

  if (subPath === "agents/authorize") {
    const out = await authorizeAgentProposal({
      proposalId: typeof body.proposal_id === "string" ? body.proposal_id : "",
      decision: body.decision === "DENY" ? "DENY" : "APPROVE",
      reviewerId: typeof body.reviewer_id === "string" ? body.reviewer_id : caller.actorId,
      reviewerRole: typeof body.reviewer_role === "string" ? body.reviewer_role : caller.rbacRole,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      tenantId: caller.tenantId,
    });
    return jsonRes(out, out.httpStatus);
  }

  if (subPath === "model-gateway/route") {
    const res = routeSecureModelRequest({
      prompt: typeof body.prompt === "string" ? body.prompt : "",
      requestedTier: (typeof body.requested_tier === "string" ? body.requested_tier : "COMMERCIAL_CLOUD") as ModelDeploymentTier,
      claimedUserClearance: (typeof body.claimed_clearance === "string"
        ? body.claimed_clearance
        : null) as ClassificationTier | null,
    });
    return jsonRes(res);
  }

  if (subPath === "custody/chain") {
    const artifactId = url.searchParams.get("artifact_id") || undefined;
    const events = await listCustodyEvents(artifactId, 50);
    return jsonRes({ events });
  }

  if (subPath === "custody/seal") {
    const ev = await sealCustodyArtifact({
      artifactId: typeof body.artifact_id === "string" ? body.artifact_id : undefined,
      artifactType: typeof body.artifact_type === "string" ? body.artifact_type : "FORENSIC_EVIDENCE",
      payload: body.payload ?? {},
      custodianId: typeof body.custodian_id === "string" ? body.custodian_id : caller.actorId,
      custodianRole: typeof body.custodian_role === "string" ? body.custodian_role : caller.rbacRole,
      tenantId: caller.tenantId,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return jsonRes({ sealedEvent: ev });
  }

  if (subPath === "custody/transfer") {
    const ev = await transferCustodyArtifact({
      artifactId: typeof body.artifact_id === "string" ? body.artifact_id : "",
      artifactType: typeof body.artifact_type === "string" ? body.artifact_type : "FORENSIC_EVIDENCE",
      custodyState: (typeof body.custody_state === "string" ? body.custody_state : "IN_REVIEW") as
        | "IN_REVIEW"
        | "VERIFIED_BY_SCA"
        | "ARCHIVED"
        | "QUARANTINED",
      custodianId: typeof body.custodian_id === "string" ? body.custodian_id : caller.actorId,
      custodianRole: typeof body.custodian_role === "string" ? body.custodian_role : caller.rbacRole,
      tenantId: caller.tenantId,
      artifactSha256: typeof body.artifact_sha256 === "string" ? body.artifact_sha256 : "",
      notes: typeof body.notes === "string" ? body.notes : "Custodial transfer logged.",
    });
    return jsonRes({ transferEvent: ev });
  }

  if (subPath === "custody/verify") {
    const artifactId = typeof body.artifact_id === "string" ? body.artifact_id : url.searchParams.get("artifact_id") || "";
    const out = await verifyArtifactCustodyChain(artifactId, body.payload);
    return jsonRes(out);
  }

  if (subPath === "verify") {
    const res = await verifySubstantiveOutput({
      domain: (typeof body.domain === "string" ? body.domain : "enterprise") as "enterprise",
      rawPrompt: typeof body.prompt === "string" ? body.prompt : "",
      candidateOutput: typeof body.candidate_output === "string" ? body.candidate_output : "",
      actorId: caller.actorId,
      tenantId: caller.tenantId,
    });
    return jsonRes(res, res.failClosedTriggered ? 422 : 200);
  }

  if (subPath === "eval-lab/runs") {
    const runs = await listEvalRuns(10);
    return jsonRes({ runs });
  }

  if (subPath === "eval-lab/run") {
    const run = await runAiEvaluationLabSuite(caller.actorId);
    return jsonRes({ run });
  }

  if (subPath.startsWith("eval-lab/investigate/")) {
    const caseId = decodeURIComponent(subPath.replace("eval-lab/investigate/", ""));
    const inv = await investigateEvaluationCase(caseId);
    return jsonRes(inv, inv.found ? 200 : 404);
  }

  return jsonRes({ error: "Unknown /api/v2/enterprise route", subPath }, 404);
}
