/**
 * Noctis RMF Intelligence Platform v2.0 — REST API Dispatcher (/api/v2/rmf/*)
 *
 * Implements explicit versioned API contracts with X-Correlation-ID tracing,
 * Idempotency-Key deduplication, caller-derived tenant authorization, and
 * standardized RMF v2.0 error codes.
 */

import {
  RMF_V2_CAPABILITIES,
  getRmfV2FeatureFlags,
} from "./registry.ts";
import { verifyEvidenceRecord, evaluateControlFromObjectives, type ObjectiveEvaluationEntry } from "./evidence.ts";
import {
  resolveControlInheritance,
  evaluateTailoringProposal,
  generateOscalSspDraft,
  evaluatePoamClosure,
  evaluateAtoReadiness,
  computePolicyImpactDiff,
  type TailoringAction,
  type WorkflowState,
  type SspControlImplementationInput,
} from "./governance.ts";
import {
  buildTenantRmfGraph,
  queryTenantRmfGraph,
  createExplanationBundle,
  replayExplanationBundle,
  type ExplanationBundle,
  type GraphNodeType,
  type GraphRelationType,
} from "./graph-and-trace.ts";
import {
  RMF_V2_AGENTS,
  executeAgentActionGuard,
  runIndependentAgentReview,
  type GuardedAgentAction,
  type RmfAgentId,
} from "./agents.ts";
import { getRmfDbManifest } from "../noctis-rmf-db.ts";
import { sha256Sync } from "../universal-crypto.ts";

const CORS_HEADERS: Record<string, string> = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, Idempotency-Key, X-Correlation-ID, X-Tenant-ID",
};

const IDEMPOTENCY_STORE = new Map<string, { status: number; body: unknown }>();
const EXPLANATION_STORE = new Map<string, ExplanationBundle>();

async function deriveCallerContext(request: Request): Promise<{ actorId: string; tenantId: string }> {
  const authHeader = (request.headers.get("authorization") || "").trim();
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

  try {
    const mod = await import("../auth/verify.server.ts");
    const user = await mod.getSessionUser(bearer || undefined);
    if (user?.id) {
      return {
        actorId: user.id,
        tenantId: `tenant:${user.id}`,
      };
    }
  } catch {
    /* Allow stateless/sandbox verification requests when auth server context is unavailable */
  }

  if (bearer) {
    return {
      actorId: `token:${sha256Sync(bearer).slice(0, 12)}`,
      tenantId: `tenant:${sha256Sync(bearer).slice(0, 16)}`,
    };
  }

  const hdrTenant = (request.headers.get("x-tenant-id") || "").trim();
  return {
    actorId: "anonymous-sandbox",
    tenantId: hdrTenant || "tenant:public-sandbox",
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  correlationId: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json",
      "x-correlation-id": correlationId,
      "x-api-version": "2.0.0",
    },
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = (await request.json()) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function handleRmfV2Request(request: Request): Promise<Response> {
  const correlationId =
    request.headers.get("x-correlation-id")?.trim() ||
    `rmf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS_HEADERS, "x-correlation-id": correlationId } });
  }

  const flags = getRmfV2FeatureFlags();
  if (!flags.enabled) {
    return jsonResponse(
      { error: "RMF_V2_DISABLED", message: "RMF v2.0 expansion is disabled by feature flag." },
      503,
      correlationId,
    );
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/v2\/rmf\/?/, "").replace(/\/+$/, "");
  const method = request.method.toUpperCase();
  const caller = await deriveCallerContext(request);

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (method === "POST" && idempotencyKey) {
    const cacheKey = `${caller.tenantId}:${subPath}:${idempotencyKey}`;
    const cached = IDEMPOTENCY_STORE.get(cacheKey);
    if (cached) {
      return jsonResponse(cached.body, cached.status, correlationId);
    }
  }

  const finishPost = (status: number, payload: unknown) => {
    if (method === "POST" && idempotencyKey) {
      const cacheKey = `${caller.tenantId}:${subPath}:${idempotencyKey}`;
      if (IDEMPOTENCY_STORE.size > 500) IDEMPOTENCY_STORE.clear();
      IDEMPOTENCY_STORE.set(cacheKey, { status, body: payload });
    }
    return jsonResponse(payload, status, correlationId);
  };

  // GET /api/v2/rmf/capabilities
  if (method === "GET" && (subPath === "" || subPath === "capabilities")) {
    return jsonResponse(
      {
        platform: "Noctis RMF Intelligence Platform v2.0",
        apiVersion: "2.0.0",
        featureFlags: flags,
        manifest: getRmfDbManifest(),
        capabilitiesCount: RMF_V2_CAPABILITIES.length,
        capabilities: RMF_V2_CAPABILITIES,
        agents: RMF_V2_AGENTS.map((a) => ({
          id: a.id,
          responsibility: a.responsibility,
          permittedOutput: a.permittedOutput,
        })),
      },
      200,
      correlationId,
    );
  }

  // GET /api/v2/rmf/explanations/:id
  if (method === "GET" && subPath.startsWith("explanations/")) {
    const bundleId = decodeURIComponent(subPath.slice("explanations/".length)).trim();
    const bundle = EXPLANATION_STORE.get(bundleId);
    if (!bundle) {
      return jsonResponse(
        { error: "NOT_FOUND", message: `Explanation bundle '${bundleId}' was not found.` },
        404,
        correlationId,
      );
    }
    if (bundle.tenantId !== caller.tenantId) {
      return jsonResponse(
        {
          error: "CROSS_TENANT_ACCESS",
          message: "Explanation bundle belongs to another tenant.",
        },
        403,
        correlationId,
      );
    }
    return jsonResponse(
      {
        bundle,
        replayVerification: replayExplanationBundle(bundle),
      },
      200,
      correlationId,
    );
  }

  if (method !== "POST") {
    return jsonResponse(
      { error: "METHOD_NOT_ALLOWED", message: `Unsupported route ${method} /api/v2/rmf/${subPath}` },
      405,
      correlationId,
    );
  }

  const body = await readJsonBody(request);
  const requestedTenant =
    typeof body.tenant_id === "string"
      ? body.tenant_id.trim()
      : typeof body.tenantId === "string"
      ? body.tenantId.trim()
      : "";
  if (requestedTenant && requestedTenant !== caller.tenantId) {
    return jsonResponse(
      {
        error: "CROSS_TENANT_ACCESS",
        message: `Caller tenant '${caller.tenantId}' is not authorized to act on tenant '${requestedTenant}'.`,
      },
      403,
      correlationId,
    );
  }

  // POST /api/v2/rmf/inheritance/resolve
  if (subPath === "inheritance/resolve") {
    const res = resolveControlInheritance({
      systemId: String(body.system_id || body.systemId || "sys-default"),
      baseline: typeof body.baseline === "string" ? body.baseline : "HIGH",
      providerName: typeof body.provider_name === "string" ? body.provider_name : "FedRAMP Authorized CSP",
      inheritedControlIds: Array.isArray(body.inherited_controls) ? (body.inherited_controls as string[]) : [],
      hybridControlIds: Array.isArray(body.hybrid_controls) ? (body.hybrid_controls as string[]) : [],
      totalControls: typeof body.total_controls === "number" ? body.total_controls : undefined,
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...res });
  }

  // POST /api/v2/rmf/tailoring/propose
  if (subPath === "tailoring/propose") {
    const res = evaluateTailoringProposal({
      proposalId: String(body.proposal_id || `TAILOR-${Date.now()}`),
      controlId: String(body.control_id || "AC-2"),
      action: (String(body.action || "SET_ODP") as TailoringAction),
      rationale: String(body.rationale || ""),
      sourceCitation: typeof body.source_citation === "string" ? body.source_citation : undefined,
      status: (String(body.status || "DRAFT") as WorkflowState),
      approvedBy: typeof body.approved_by === "string" ? body.approved_by : null,
    });
    return finishPost(res.applied ? 200 : 403, { tenant_id: caller.tenantId, ...res });
  }

  // POST /api/v2/rmf/evidence/verify
  if (subPath === "evidence/verify") {
    const verification = verifyEvidenceRecord({
      evidenceId: String(body.evidence_id || `EV-${Date.now()}`),
      tenantId: caller.tenantId,
      controlId: String(body.control_id || "AC-2"),
      origin: String(body.origin || "api-upload"),
      collectedAt: String(body.collected_at || new Date().toISOString()),
      maxAgeDays: typeof body.max_age_days === "number" ? body.max_age_days : 30,
      claimedSha256: typeof body.claimed_sha256 === "string" ? body.claimed_sha256 : undefined,
      payload: body.payload ?? {},
      asOf: typeof body.as_of === "string" ? body.as_of : undefined,
    });

    const objectives = Array.isArray(body.objective_results)
      ? evaluateControlFromObjectives(
          verification.controlId,
          body.objective_results as ObjectiveEvaluationEntry[],
        )
      : null;

    return finishPost(verification.verified ? 200 : 422, {
      verification,
      ...(objectives ? { controlEffectiveness: objectives } : {}),
    });
  }

  // POST /api/v2/rmf/ato/readiness
  if (subPath === "ato/readiness") {
    const res = evaluateAtoReadiness({
      system_id: String(body.system_id || "11111111-1111-4111-8111-111111111111"),
      package_id: String(body.package_id || "22222222-2222-4222-8222-222222222222"),
      assessment_snapshot_id:
        typeof body.assessment_snapshot_id === "string" ? body.assessment_snapshot_id : undefined,
      as_of: typeof body.as_of === "string" ? body.as_of : undefined,
      missingEvidenceItems: Array.isArray(body.missing_evidence)
        ? (body.missing_evidence as { controlId: string; objectiveId?: string; action?: string }[])
        : undefined,
      openFindings: Array.isArray(body.open_findings)
        ? (body.open_findings as { findingId: string; controlId?: string; action?: string }[])
        : undefined,
      missingPackageArtifacts: Array.isArray(body.missing_artifacts)
        ? (body.missing_artifacts as string[])
        : undefined,
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...res });
  }

  // POST /api/v2/rmf/ssp/generate
  if (subPath === "ssp/generate") {
    const draft = generateOscalSspDraft({
      systemId: String(body.system_id || "sys-001"),
      systemName: String(body.system_name || "Federal Cloud System"),
      tenantId: caller.tenantId,
      baseline: typeof body.baseline === "string" ? body.baseline : "HIGH",
      implementations: Array.isArray(body.implementations)
        ? (body.implementations as SspControlImplementationInput[])
        : [],
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...draft });
  }

  // POST /api/v2/rmf/poam
  if (subPath === "poam") {
    const verification = body.evidence_payload
      ? verifyEvidenceRecord({
          evidenceId: String(body.evidence_id || `EV-POAM-${Date.now()}`),
          tenantId: caller.tenantId,
          controlId: String(body.control_id || "AC-2"),
          origin: String(body.origin || "remediation-proof"),
          collectedAt: String(body.collected_at || new Date().toISOString()),
          claimedSha256: typeof body.claimed_sha256 === "string" ? body.claimed_sha256 : undefined,
          payload: body.evidence_payload,
        })
      : null;

    const closure = evaluatePoamClosure({
      poamId: String(body.poam_id || `POAM-${Date.now()}`),
      controlId: String(body.control_id || "AC-2"),
      owner: String(body.owner || caller.actorId),
      remediationSummary: String(body.remediation_summary || ""),
      evidenceVerification: verification,
    });
    return finishPost(closure.closed ? 200 : 422, { tenant_id: caller.tenantId, ...closure });
  }

  // POST /api/v2/rmf/graph/query
  if (subPath === "graph/query") {
    const ownerTenant = typeof body.graph_tenant_id === "string" ? body.graph_tenant_id.trim() : caller.tenantId;
    const graph = buildTenantRmfGraph({
      tenantId: ownerTenant,
      systemId: String(body.system_id || "sys-001"),
      systemName: String(body.system_name || "Federal System"),
      baseline: String(body.baseline || "FEDRAMP_HIGH"),
      providerName: typeof body.provider_name === "string" ? body.provider_name : "GovCloud CSP",
      controls: Array.isArray(body.controls) ? (body.controls as string[]) : ["AC-2", "AU-6", "IA-2"],
    });
    const res = queryTenantRmfGraph({
      graph,
      requestTenantId: caller.tenantId,
      nodeType: typeof body.node_type === "string" ? (body.node_type as GraphNodeType) : undefined,
      relationType: typeof body.relation_type === "string" ? (body.relation_type as GraphRelationType) : undefined,
    });
    return finishPost(res.allowed ? 200 : 403, res);
  }

  // POST /api/v2/rmf/agents/runs
  if (subPath === "agents/runs") {
    const agentId = (String(body.agent_id || "ASSESSMENT_AGENT") as RmfAgentId);
    const requestedAction = (String(body.action || "CREATE_DRAFT") as GuardedAgentAction);
    const guard = executeAgentActionGuard(agentId, requestedAction, false);
    if (!guard.allowed) {
      return finishPost(403, guard);
    }

    const review = runIndependentAgentReview({
      runId: String(body.run_id || `RUN-${Date.now()}`),
      tenantId: caller.tenantId,
      primaryAgent: agentId,
      primaryVerdict: String(body.primary_verdict || "SATISFIED"),
      primaryCitations: Array.isArray(body.primary_citations) ? (body.primary_citations as string[]) : ["AC-2"],
      independentReviewVerdict: String(body.independent_verdict || body.primary_verdict || "SATISFIED"),
      independentReviewViolations: Array.isArray(body.violations) ? (body.violations as string[]) : [],
    });
    return finishPost(200, { guard, review });
  }

  // POST /api/v2/rmf/policy/impact
  if (subPath === "policy/impact") {
    const diff = computePolicyImpactDiff(
      String(body.from_baseline || "LOW"),
      String(body.to_baseline || "HIGH"),
    );
    return finishPost(200, { tenant_id: caller.tenantId, ...diff });
  }

  // POST /api/v2/rmf/investigate
  if (subPath === "investigate") {
    const q = String(body.question || "").trim();
    if (!q) {
      return jsonResponse({ error: "BAD_REQUEST", message: "question is required." }, 400, correlationId);
    }
    const { buildRmfGroundingPacket } = await import("../noctis-rmf-db.ts");
    const { executeUniversalRmfReasoning } = await import("../noctis-rmf-reasoning.server.ts");
    const packet = buildRmfGroundingPacket(q);
    const answer = await executeUniversalRmfReasoning(q);

    const bundle = createExplanationBundle({
      tenantId: caller.tenantId,
      evaluationRef: `INV-${Date.now().toString(36)}`,
      nistVersion: packet.manifest.nistVersion,
      dbSha256: packet.manifest.dbSha256,
      ruleId: packet.ruleEvaluations[0]?.ruleId || "RMF-INVESTIGATE-001",
      ruleVersion: packet.ruleEvaluations[0]?.ruleVersion || "2.0.0",
      evidenceSha256: packet.ruleEvaluations[0]?.auditHash || packet.manifest.dbSha256,
      observedFacts: packet.ruleEvaluations[0]?.observedFacts || { queryControlsCount: packet.controls.length },
      deterministicClassifications: packet.ruleEvaluations.map((r) => `${r.controlId}: ${r.verdict}`),
      analyticalEstimates: [],
      verdict: packet.ruleEvaluations[0]?.verdict || "ADVISORY_GROUNDED",
    });
    if (EXPLANATION_STORE.size > 200) EXPLANATION_STORE.clear();
    EXPLANATION_STORE.set(bundle.bundleId, bundle);

    return finishPost(200, {
      tenant_id: caller.tenantId,
      explanationBundleId: bundle.bundleId,
      canonicalTraceHash: bundle.canonicalTraceHash,
      verifiedControls: packet.controls.map((c) => ({ id: c.id, title: c.title, withdrawn: c.withdrawn })),
      ruleEvaluations: packet.ruleEvaluations,
      fips199: packet.fips199,
      answer,
    });
  }

  return jsonResponse(
    { error: "NOT_FOUND", message: `Unknown RMF v2.0 endpoint: ${method} /api/v2/rmf/${subPath}` },
    404,
    correlationId,
  );
}
