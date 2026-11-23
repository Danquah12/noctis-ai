/**
 * Noctis Defense & Intelligence Community (NDIMP) REST API Dispatcher (/api/v2/dod-ic/*)
 */

import { replayExplanationBundle, type ExplanationBundle } from "../rmf-v2/graph-and-trace.ts";
import { getRmfExplanationArtifactById } from "../rmf-v2/persistence.server.ts";
import { sha256Sync } from "../universal-crypto.ts";
import {
  evaluateClassificationGate,
  evaluateCrossDomainTransfer,
  type DeploymentBoundary,
  type SecurityClassification,
} from "./classification-gateway.ts";
import {
  buildEmassPackageSummary,
  evaluateCnssi1253Categorization,
  evaluateDod8510Authorization,
  evaluateDodReciprocity,
  type ImpactLevel,
} from "./dod-rmf-engine.ts";
import { executeDodIcReasoning } from "./dod-ic-reasoning.server.ts";
import { evaluateIcd501SharingGovernance, evaluateIcd503Authorization, evaluateIcReciprocity } from "./ic-security-engine.ts";
import { DOD_IC_POLICY_REGISTRY, listDodIcPolicies, type PolicyJurisdiction } from "./policy-registry.ts";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Tenant-ID",
};

function jsonRes(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function resolveTenant(request: Request): string {
  const hdr = (request.headers.get("x-tenant-id") || "").trim();
  if (hdr) return hdr;
  const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (auth) return `tenant:${sha256Sync(auth).slice(0, 16)}`;
  return "tenant:public-sandbox";
}

export async function handleDodIcV2Request(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/v2\/dod-ic\/?/, "").replace(/\/+$/, "");
  const method = request.method.toUpperCase();
  const tenantId = resolveTenant(request);

  if (method === "GET" && (subPath === "" || subPath === "status")) {
    return jsonRes({
      platform: "Noctis Defense & Intelligence Community Security Architecture (NDIMP Wave 1)",
      version: "1.0.0",
      engines: [
        "DOD-RMF-DODI-8510.01",
        "CNSSI-1253-CATEGORIZATION",
        "IC-SECURITY-ICD-503-502-501",
        "CLASSIFICATION-AWARE-GATEWAY",
        "CROSS-DOMAIN-DODI-8540.01",
      ],
      policiesCount: Object.keys(DOD_IC_POLICY_REGISTRY).length,
      invariants: {
        dodAtoAutomaticallySatisfiesIcIcd503: false,
        clearanceAuthorizesCommercialCloudClassified: false,
        aiCanIssueAto: false,
      },
    });
  }

  if (method === "GET" && subPath === "policies") {
    const jur = (url.searchParams.get("jurisdiction") || "").toUpperCase() as PolicyJurisdiction | "";
    const list = listDodIcPolicies(jur || undefined);
    return jsonRes({ count: list.length, policies: list });
  }

  if (method === "GET" && subPath.startsWith("explanations/")) {
    const bundleId = decodeURIComponent(subPath.slice("explanations/".length)).trim();
    const stored = await getRmfExplanationArtifactById<ExplanationBundle>(bundleId, tenantId);
    if (stored.forbidden) {
      return jsonRes({ error: "CROSS_TENANT_ACCESS", message: "Trace belongs to another tenant." }, 403);
    }
    if (!stored.artifact) {
      return jsonRes({ error: "NOT_FOUND", message: `Explanation trace '${bundleId}' not found.` }, 404);
    }
    return jsonRes({
      bundle: stored.artifact.payload,
      replayVerification: replayExplanationBundle(stored.artifact.payload),
      persistedInSql: true,
      payloadSha256: stored.artifact.payloadSha256,
      storedAt: stored.artifact.createdAt,
    });
  }

  if (method !== "POST") {
    return jsonRes({ error: "METHOD_NOT_ALLOWED", message: `Unsupported route ${method} /api/v2/dod-ic/${subPath}` }, 405);
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  if (subPath === "classification/check") {
    const res = evaluateClassificationGate({
      text: String(body.text || ""),
      targetBoundary: body.target_boundary as DeploymentBoundary | undefined,
      claimedPayloadClassification: body.claimed_payload_classification as SecurityClassification | undefined,
      claimedUserClearance: body.claimed_user_clearance as SecurityClassification | undefined,
      requestedModelTarget: body.requested_model_target as
        | "COMMERCIAL_CLOUD_LLM"
        | "ACCREDITED_GOVCLOUD_ENCLAVE"
        | "AIRGAPPED_SCIF_MODEL"
        | undefined,
    });
    return jsonRes(res, res.allowed ? 200 : 403);
  }

  if (subPath === "cross-domain/evaluate") {
    return jsonRes(
      evaluateCrossDomainTransfer({
        sourceClassification: (String(body.source_classification || "SECRET").toUpperCase() as SecurityClassification),
        targetClassification: (String(body.target_classification || "UNCLASSIFIED").toUpperCase() as SecurityClassification),
        accreditedCdsPresent: typeof body.accredited_cds_present === "boolean" ? body.accredited_cds_present : null,
        ncdsmoRaiseTheBarCompliant: typeof body.ncdsmo_compliant === "boolean" ? body.ncdsmo_compliant : null,
        securityLabelingVerified: typeof body.labeling_verified === "boolean" ? body.labeling_verified : null,
        releaseAuthorityApproved: typeof body.release_approved === "boolean" ? body.release_approved : null,
        immutableAuditLogging: typeof body.audit_logging === "boolean" ? body.audit_logging : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      }),
    );
  }

  if (subPath === "dod-rmf/authorize") {
    return jsonRes(
      evaluateDod8510Authorization({
        systemName: typeof body.system_name === "string" ? body.system_name : undefined,
        impactLevel: body.impact_level as "IL2" | "IL4" | "IL5" | "IL6" | undefined,
        emassRegistered: typeof body.emass_registered === "boolean" ? body.emass_registered : null,
        boundaryAndIsaDocumented: typeof body.boundary_and_isa === "boolean" ? body.boundary_and_isa : null,
        independentScaAssigned: typeof body.independent_sca === "boolean" ? body.independent_sca : null,
        cat1UnmitigatedCount: typeof body.cat1_count === "number" ? body.cat1_count : null,
        poamCompleteForOpenFindings: typeof body.poam_complete === "boolean" ? body.poam_complete : null,
        conmonAndCsspEnrolled: typeof body.conmon_cssp === "boolean" ? body.conmon_cssp : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      }),
    );
  }

  if (subPath === "dod-rmf/reciprocity") {
    return jsonRes(
      evaluateDodReciprocity({
        sourceComponent: typeof body.source_component === "string" ? body.source_component : undefined,
        sourceAtoActiveAndUnexpired: typeof body.source_ato_active === "boolean" ? body.source_ato_active : null,
        sourceImpactLevel: body.source_il as "IL2" | "IL4" | "IL5" | "IL6" | undefined,
        targetEnvironmentImpactLevel: body.target_il as "IL2" | "IL4" | "IL5" | "IL6" | undefined,
        cat1OpenWithoutAoAcceptance: typeof body.cat1_open === "boolean" ? body.cat1_open : null,
        receivingAoGapReviewCompleted: typeof body.receiving_ao_reviewed === "boolean" ? body.receiving_ao_reviewed : null,
        targetJurisdiction: body.target_jurisdiction === "IC" ? "IC" : "DOD",
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      }),
    );
  }

  if (subPath === "dod-rmf/emass-package") {
    return jsonRes(
      buildEmassPackageSummary({
        emassSystemId: typeof body.emass_system_id === "string" ? body.emass_system_id : undefined,
        systemName: String(body.system_name || "DoD System"),
        impactLevel: (body.impact_level as "IL2" | "IL4" | "IL5" | "IL6") || "IL5",
        controlCount: typeof body.control_count === "number" ? body.control_count : undefined,
        openPoamCount: typeof body.open_poam_count === "number" ? body.open_poam_count : undefined,
        artifactsPresent: Array.isArray(body.artifacts_present) ? (body.artifacts_present as string[]) : [],
      }),
    );
  }

  if (subPath === "cnssi1253/categorize") {
    return jsonRes(
      evaluateCnssi1253Categorization({
        systemName: typeof body.system_name === "string" ? body.system_name : undefined,
        confidentiality: (String(body.confidentiality || "MODERATE").toUpperCase() as ImpactLevel),
        integrity: (String(body.integrity || "MODERATE").toUpperCase() as ImpactLevel),
        availability: (String(body.availability || "LOW").toUpperCase() as ImpactLevel),
        classification: body.classification as SecurityClassification | undefined,
        isIntelligenceSystem: body.is_intelligence_system === true,
        isSpaceSystem: body.is_space_system === true,
        hasCrossDomainSolution: body.has_cds === true,
        processesPiiPrivacy: body.has_pii === true,
        isCloudSystem: body.is_cloud === true,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      }),
    );
  }

  if (subPath === "ic/icd503") {
    return jsonRes(
      evaluateIcd503Authorization({
        systemName: typeof body.system_name === "string" ? body.system_name : undefined,
        deploymentBoundary: body.deployment_boundary as DeploymentBoundary | undefined,
        icAoAssigned: typeof body.ic_ao_assigned === "boolean" ? body.ic_ao_assigned : null,
        independentIcScaAssigned: typeof body.ic_sca_assigned === "boolean" ? body.ic_sca_assigned : null,
        cnssi1253WithIcOverlaysApplied: typeof body.cnssi1253_ic_overlays === "boolean" ? body.cnssi1253_ic_overlays : null,
        zeroTrustAligned: typeof body.zero_trust_aligned === "boolean" ? body.zero_trust_aligned : null,
        icd502ConMonEnrolled: typeof body.icd502_conmon === "boolean" ? body.icd502_conmon : null,
        icd501AndPrivacyEvaluated: typeof body.icd501_privacy === "boolean" ? body.icd501_privacy : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      }),
    );
  }

  if (subPath === "ic/reciprocity") {
    return jsonRes(
      evaluateIcReciprocity({
        sourceAuthorizationType:
          (body.source_authorization_type as "IC_ICD503_ATO" | "DOD_ATO" | "FEDRAMP_ATO") || "DOD_ATO",
        sourceAtoActiveAndUnexpired: typeof body.source_ato_active === "boolean" ? body.source_ato_active : null,
        icOverlaysAndSciVerified: typeof body.ic_overlays_verified === "boolean" ? body.ic_overlays_verified : null,
        icd502TelemetryCompatible: typeof body.icd502_compatible === "boolean" ? body.icd502_compatible : null,
        receivingIcAoAccepted: typeof body.receiving_ic_ao_accepted === "boolean" ? body.receiving_ic_ao_accepted : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      }),
    );
  }

  if (subPath === "ic/icd501") {
    return jsonRes(
      evaluateIcd501SharingGovernance({
        dataClassification: (String(body.data_classification || "SECRET").toUpperCase() as SecurityClassification),
        targetBoundary: (body.target_boundary as DeploymentBoundary) || "COMMERCIAL_UNCLASSIFIED",
        userClearance: (String(body.user_clearance || "TS_SCI").toUpperCase() as SecurityClassification),
        hasNeedToKnow: typeof body.has_need_to_know === "boolean" ? body.has_need_to_know : null,
        requiresOrconApproval: body.requires_orcon === true,
        orconOriginatorApproved: typeof body.orcon_approved === "boolean" ? body.orcon_approved : null,
        auditTrailEnabled: typeof body.audit_enabled === "boolean" ? body.audit_enabled : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      }),
    );
  }

  if (subPath === "investigate") {
    const q = String(body.question || "").trim();
    if (!q) return jsonRes({ error: "BAD_REQUEST", message: "question is required." }, 400);
    const answer = await executeDodIcReasoning(q, {
      tenantId,
      shouldThink: body.think !== false,
      deploymentBoundary: body.deployment_boundary as DeploymentBoundary | undefined,
      claimedUserClearance: body.claimed_user_clearance as SecurityClassification | undefined,
    });
    const traceMatch = answer.match(/(?:Trace|Audit Trace):\s*`(EXPL-[A-Z0-9]+)`/);
    return jsonRes({
      tenant_id: tenantId,
      traceId: traceMatch?.[1] || null,
      answer,
    });
  }

  return jsonRes({ error: "NOT_FOUND", message: `Unknown NDIMP DoD/IC endpoint: ${method} /api/v2/dod-ic/${subPath}` }, 404);
}
