/**
 * Noctis RMF Intelligence Platform v2.0 — REST API Dispatcher (/api/v2/rmf/*)
 *
 * Exposes all 25 capabilities (RMF-001..AI-025), 20-family deterministic rules,
 * DoD IL2–IL6 & CMMC SPRS calculators, live CISA KEV vulnerability intelligence,
 * attack-path & STIG/SBOM/ZTMM engines, SQL artifact persistence + hash-chained
 * ledger, and human-approved SFT/DPO feedback training export.
 */

import { RMF_V2_CAPABILITIES, getRmfV2FeatureFlags } from "./registry.ts";
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
import {
  analyzeVulnerabilityIntelligence,
  analyzeAttackPaths,
  evaluateConfigurationCompliance,
  collectConnectorEvidence,
  forecastCyberRisk,
  evaluateSupplyChainSbom,
  evaluateZeroTrustMaturity,
  createEnterpriseRiskRegisterRecord,
  type RawScannerFinding,
  type AttackNodeInput,
  type AttackEdgeInput,
  type ConfigCheckInput,
  type SupportedConnectorId,
  type ZtPillarScore,
} from "./cyber-intelligence.ts";
import {
  generateOscalSap,
  generateOscalSar,
  evaluateContinuousAtoStatus,
  resolveFrameworkCrosswalk,
  runDeterministicRmfSimulation,
  createExpertFeedbackRecord,
  approveExpertFeedbackRecord,
  exportApprovedFeedbackJsonl,
  type SarObservationInput,
  type ExpertFeedbackCandidate,
} from "./assessment-and-learning.ts";
import {
  getRmfStorageStatus,
  saveRmfArtifact,
  listRmfArtifacts,
  getRmfArtifactById,
  getRmfExplanationArtifactById,
  updateRmfArtifactApproval,
  type RmfArtifactType,
} from "./persistence.server.ts";
import {
  ALL_COVERED_RULE_CONTROLS,
  EXTENDED_RULE_CATALOG,
  STARTER_10_CONTROLS,
  extractAndEvaluateRmfRulesFromText,
  evaluateDodImpactLevelOverlay,
  evaluateCmmcSprsScore,
  type CmmcFailedControlInput,
} from "../noctis-rmf-rules.ts";
import { getRmfDbManifest, lookupRmfControl } from "../noctis-rmf-db.ts";
import { sha256Sync } from "../universal-crypto.ts";

const CORS_HEADERS: Record<string, string> = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, Idempotency-Key, X-Correlation-ID, X-Tenant-ID",
};

const IDEMPOTENCY_STORE = new Map<string, { status: number; body: unknown }>();
const EXPLANATION_STORE = new Map<string, ExplanationBundle>();

const STARTER_RULE_CATALOG = [
  { ruleId: "RMF-AC2-TERM-001", controlId: "AC-2", family: "AC", controlTitle: "Account Management", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Disable terminated accounts <= 24h; inactive <= 35d (High)", severityOnFail: "HIGH" },
  { ruleId: "RMF-AC3-RBAC-001", controlId: "AC-3", family: "AC", controlTitle: "Access Enforcement", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Default-deny RBAC/ABAC enforced; zero console bypasses", severityOnFail: "CRITICAL" },
  { ruleId: "RMF-AU2-LOG-001", controlId: "AU-2", family: "AU", controlTitle: "Event Logging", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Auth, privilege escalation, and admin changes 100% logged", severityOnFail: "HIGH" },
  { ruleId: "RMF-AU6-REV-001", controlId: "AU-6", family: "AU", controlTitle: "Audit Record Review, Analysis, and Reporting", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "SIEM/audit log review cadence <= 7 days (FedRAMP High ODP)", severityOnFail: "MODERATE" },
  { ruleId: "RMF-CA7-MON-001", controlId: "CA-7", family: "CA", controlTitle: "Continuous Monitoring", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "ConMon telemetry delivered <= 30 days monthly cadence", severityOnFail: "HIGH" },
  { ruleId: "RMF-CM2-BASE-001", controlId: "CM-2", family: "CM", controlTitle: "Baseline Configuration", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Baseline reviewed/approved <= 365 days & VCS-tracked", severityOnFail: "MODERATE" },
  { ruleId: "RMF-CM6-CONF-001", controlId: "CM-6", family: "CM", controlTitle: "Configuration Settings", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "STIG/CIS >= 90% compliant; zero unapproved drift", severityOnFail: "HIGH" },
  { ruleId: "RMF-IA2-MFA-001", controlId: "IA-2", family: "IA", controlTitle: "Identification and Authentication", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "100% phishing-resistant MFA; zero static unmanaged SSH keys", severityOnFail: "CRITICAL" },
  { ruleId: "RMF-RA5-SCAN-001", controlId: "RA-5", family: "RA", controlTitle: "Vulnerability Monitoring and Scanning", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "Monthly <= 30d OS/DB/container scans & Crit 15d/High 30d SLAs", severityOnFail: "HIGH" },
  { ruleId: "RMF-SI2-FLAW-001", controlId: "SI-2", family: "SI", controlTitle: "Flaw Remediation", defaultBaseline: "FedRAMP Rev. 5 High", thresholdSummary: "CISA KEV/Crit <= 15d, High <= 30d, Mod <= 90d, Low <= 180d", severityOnFail: "CRITICAL" },
];

async function deriveCallerContext(request: Request): Promise<{ actorId: string; tenantId: string }> {
  const authHeader = (request.headers.get("authorization") || "").trim();
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

  try {
    const mod = await import("../auth/verify.server.ts");
    const user = await mod.getSessionUser(bearer || undefined);
    if (user?.id) {
      return { actorId: user.id, tenantId: `tenant:${user.id}` };
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

function jsonResponse(body: unknown, status: number, correlationId: string): Response {
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

async function safePersist(fn: () => Promise<{ artifact: { id: string }; ledgerEventHash: string; dbSource: string }>) {
  try {
    const res = await fn();
    return { persisted: true, artifactId: res.artifact.id, ledgerEventHash: res.ledgerEventHash, dbSource: res.dbSource };
  } catch {
    return { persisted: false };
  }
}

function buildBaselineTrainingLines(format: "sft" | "dpo"): string[] {
  const lines: string[] = [];
  for (const cid of ALL_COVERED_RULE_CONTROLS) {
    const ctrl = lookupRmfControl(cid);
    if (!ctrl || ctrl.withdrawn) continue;
    const exam = ctrl.methods.examine || "policies and configuration exports";
    const intv = ctrl.methods.interview || "ISSO and engineering owners";
    const test = ctrl.methods.test || "automated control enforcement verification";
    const assistantAnswer = [
      `Control **${ctrl.id} (${ctrl.title})** belongs to the ${ctrl.familyTitle} family.`,
      `- **Baselines:** ${ctrl.baselines.join(", ") || "Tailored"}`,
      ctrl.fedrampOdp ? `- **FedRAMP High ODP:** ${ctrl.fedrampOdp.high} (SLA: ${ctrl.fedrampOdp.sla})` : "",
      `- **SP 800-53A Methods:** **Examine** (${exam}); **Interview** (${intv}); **Test** (${test}).`,
      "- **Governance:** Final ATO risk acceptance rests strictly with the designated Authorizing Official (AO).",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `Summarize NIST SP 800-53 Rev. 5 control ${ctrl.id} (${ctrl.title}), including SP 800-53A Examine/Interview/Test procedures and AO authority.`;
    if (format === "dpo") {
      lines.push(
        JSON.stringify({
          prompt,
          chosen: assistantAnswer,
          rejected: `${ctrl.id} is automatically satisfied once a vendor policy PDF is uploaded and Noctis issues an ATO.`,
          control_id: ctrl.id,
          source: "authoritative-nist-5.2.0",
        }),
      );
    } else {
      lines.push(
        JSON.stringify({
          messages: [
            { role: "system", content: "You are Noctis RMF Intelligence grounded strictly in NIST SP 800-53 Rev. 5.2.0 and deterministic compliance rules." },
            { role: "user", content: prompt },
            { role: "assistant", content: assistantAnswer },
          ],
          control_id: ctrl.id,
          source: "authoritative-nist-5.2.0",
        }),
      );
    }
  }
  return lines;
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
    if (cached) return jsonResponse(cached.body, cached.status, correlationId);
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
        implementedCount: RMF_V2_CAPABILITIES.filter((c) => c.status === "implemented").length,
        coveredRuleControlsCount: ALL_COVERED_RULE_CONTROLS.length,
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

  // GET /api/v2/rmf/storage/status
  if (method === "GET" && subPath === "storage/status") {
    const status = await getRmfStorageStatus(caller.tenantId);
    return jsonResponse({ tenant_id: caller.tenantId, ...status }, 200, correlationId);
  }

  // GET /api/v2/rmf/artifacts?type=...
  if (method === "GET" && subPath === "artifacts") {
    const typeParam = (url.searchParams.get("type") || "").toUpperCase().trim() as RmfArtifactType | "";
    const artifacts = await listRmfArtifacts(caller.tenantId, typeParam || undefined, 50);
    return jsonResponse({ tenant_id: caller.tenantId, count: artifacts.length, artifacts }, 200, correlationId);
  }

  // GET /api/v2/rmf/rules/catalog
  if (method === "GET" && subPath === "rules/catalog") {
    const allRules = [...STARTER_RULE_CATALOG, ...EXTENDED_RULE_CATALOG];
    const familiesCovered = [...new Set(allRules.map((r) => r.family))];
    return jsonResponse(
      {
        totalRules: allRules.length,
        familiesCoveredCount: familiesCovered.length,
        familiesCovered,
        overlaysSupported: ["FedRAMP Rev. 5 Low/Mod/High", "DoD IL2–IL6", "CNSSI 1253", "SCCA", "CMMC Level 2 / SPRS"],
        rules: allRules,
      },
      200,
      correlationId,
    );
  }

  // GET /api/v2/rmf/training/status
  if (method === "GET" && subPath === "training/status") {
    const feedbackArtifacts = await listRmfArtifacts<ExpertFeedbackCandidate>(caller.tenantId, "FEEDBACK", 100);
    const records = feedbackArtifacts.map((a) => a.payload);
    const approvedCount = records.filter((r) => r.status === "APPROVED").length;
    const pendingCount = records.filter((r) => r.status === "PENDING_REVIEW").length;
    const baseSftCount = buildBaselineTrainingLines("sft").length;
    const baseDpoCount = buildBaselineTrainingLines("dpo").length;
    return jsonResponse(
      {
        tenant_id: caller.tenantId,
        baseCorpusSftExamples: 684,
        baseCorpusDpoPairs: 411,
        liveExportableSftCount: baseSftCount + approvedCount,
        liveExportableDpoCount: baseDpoCount + records.filter((r) => r.status === "APPROVED" && r.rejectedResponse).length,
        feedbackTotal: records.length,
        feedbackApproved: approvedCount,
        feedbackPending: pendingCount,
        trainingScript: "scripts/train_rmf_lora.py",
        records: records.slice(0, 25),
      },
      200,
      correlationId,
    );
  }

  // GET /api/v2/rmf/training/export?format=sft|dpo
  if (method === "GET" && subPath === "training/export") {
    const format = url.searchParams.get("format") === "dpo" ? "dpo" : "sft";
    const feedbackArtifacts = await listRmfArtifacts<ExpertFeedbackCandidate>(caller.tenantId, "FEEDBACK", 200);
    const approvedExport = exportApprovedFeedbackJsonl(
      feedbackArtifacts.map((a) => a.payload),
      format,
    );
    const baselineLines = buildBaselineTrainingLines(format);
    const combinedJsonl = [
      ...baselineLines,
      ...(approvedExport.jsonl ? approvedExport.jsonl.split("\n") : []),
    ].join("\n");

    return new Response(combinedJsonl, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "content-type": "application/jsonl; charset=utf-8",
        "content-disposition": `attachment; filename="noctis-rmf-${format}-training.jsonl"`,
        "x-correlation-id": correlationId,
        "x-excluded-unapproved": String(approvedExport.excludedUnapprovedCount),
      },
    });
  }

  // GET /api/v2/rmf/explanations/:id
  if (method === "GET" && subPath.startsWith("explanations/")) {
    const bundleId = decodeURIComponent(subPath.slice("explanations/".length)).trim();
    const cached = EXPLANATION_STORE.get(bundleId);
    if (cached) {
      if (cached.tenantId !== caller.tenantId && cached.tenantId !== "chat-session") {
        return jsonResponse({ error: "CROSS_TENANT_ACCESS", message: "Explanation bundle belongs to another tenant." }, 403, correlationId);
      }
      return jsonResponse({ bundle: cached, replayVerification: replayExplanationBundle(cached), persistedInSql: false }, 200, correlationId);
    }

    const stored = await getRmfExplanationArtifactById<ExplanationBundle>(bundleId, caller.tenantId);
    if (stored.forbidden) {
      return jsonResponse({ error: "CROSS_TENANT_ACCESS", message: "Explanation bundle belongs to another tenant." }, 403, correlationId);
    }
    if (!stored.artifact) {
      return jsonResponse({ error: "NOT_FOUND", message: `Explanation bundle '${bundleId}' was not found.` }, 404, correlationId);
    }
    return jsonResponse(
      {
        bundle: stored.artifact.payload,
        replayVerification: replayExplanationBundle(stored.artifact.payload),
        persistedInSql: true,
        payloadSha256: stored.artifact.payloadSha256,
        storedAt: stored.artifact.createdAt,
      },
      200,
      correlationId,
    );
  }

  if (method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED", message: `Unsupported route ${method} /api/v2/rmf/${subPath}` }, 405, correlationId);
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

  // POST /api/v2/rmf/rules/evaluate (20-family NL rules, DoD IL overlay, or CMMC SPRS)
  if (subPath === "rules/evaluate") {
    const mode = String(body.mode || "text").toLowerCase();
    if (mode === "cmmc_sprs") {
      const failedControls = Array.isArray(body.failed_controls)
        ? (body.failed_controls as CmmcFailedControlInput[])
        : [];
      const sprs = evaluateCmmcSprsScore({ failedControls });
      return finishPost(200, { tenant_id: caller.tenantId, mode: "cmmc_sprs", sprs });
    }
    if (mode === "dod_il") {
      const ilResult = evaluateDodImpactLevelOverlay({
        impactLevel: (String(body.impact_level || "IL5").toUpperCase() as "IL2" | "IL4" | "IL5" | "IL6"),
        hostingEnvironment: typeof body.hosting_environment === "string" ? body.hosting_environment : "GovCloud_Dedicated",
        sccaCompliant: typeof body.scca_compliant === "boolean" ? body.scca_compliant : true,
        usCitizenAdminsOnly: typeof body.us_citizen_admins_only === "boolean" ? body.us_citizen_admins_only : true,
        cnssi1253Overlay: typeof body.cnssi_1253 === "boolean" ? body.cnssi_1253 : true,
        fips140Level: typeof body.fips_140_level === "number" ? body.fips_140_level : 3,
      });
      return finishPost(200, { tenant_id: caller.tenantId, mode: "dod_il", dodOverlay: ilResult });
    }
    const scenarioText = String(body.scenario || body.question || "").trim();
    const evaluations = extractAndEvaluateRmfRulesFromText(scenarioText);
    return finishPost(200, { tenant_id: caller.tenantId, mode: "text", count: evaluations.length, evaluations });
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
      action: String(body.action || "SET_ODP") as TailoringAction,
      rationale: String(body.rationale || ""),
      sourceCitation: typeof body.source_citation === "string" ? body.source_citation : undefined,
      status: String(body.status || "DRAFT") as WorkflowState,
      approvedBy: typeof body.approved_by === "string" ? body.approved_by : null,
    });
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        id: res.proposalId,
        tenantId: caller.tenantId,
        artifactType: "TAILORING",
        systemId: String(body.system_id || "sys-001"),
        title: `Tailoring ${res.controlId} (${res.action})`,
        status: res.applied ? "APPROVED" : res.status,
        payload: res as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
        approvedBy: res.approvedBy,
      }),
    );
    return finishPost(res.applied ? 200 : 403, { tenant_id: caller.tenantId, ...res, storageReceipt: receipt });
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
      ? evaluateControlFromObjectives(verification.controlId, body.objective_results as ObjectiveEvaluationEntry[])
      : null;

    const receipt = await safePersist(() =>
      saveRmfArtifact({
        id: verification.evidenceId,
        tenantId: caller.tenantId,
        artifactType: "EVIDENCE",
        systemId: String(body.system_id || "sys-001"),
        title: `${verification.controlId} Evidence (${verification.status})`,
        status: verification.status,
        payload: verification as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );

    return finishPost(verification.verified ? 200 : 422, {
      verification,
      ...(objectives ? { controlEffectiveness: objectives } : {}),
      storageReceipt: receipt,
    });
  }

  // POST /api/v2/rmf/ato/readiness
  if (subPath === "ato/readiness") {
    const res = evaluateAtoReadiness({
      system_id: String(body.system_id || "11111111-1111-4111-8111-111111111111"),
      package_id: String(body.package_id || "22222222-2222-4222-8222-222222222222"),
      assessment_snapshot_id: typeof body.assessment_snapshot_id === "string" ? body.assessment_snapshot_id : undefined,
      as_of: typeof body.as_of === "string" ? body.as_of : undefined,
      missingEvidenceItems: Array.isArray(body.missing_evidence)
        ? (body.missing_evidence as { controlId: string; objectiveId?: string; action?: string }[])
        : undefined,
      openFindings: Array.isArray(body.open_findings)
        ? (body.open_findings as { findingId: string; controlId?: string; action?: string }[])
        : undefined,
      missingPackageArtifacts: Array.isArray(body.missing_artifacts) ? (body.missing_artifacts as string[]) : undefined,
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...res });
  }

  // POST /api/v2/rmf/ssp/generate
  if (subPath === "ssp/generate") {
    const sysId = String(body.system_id || "sys-001");
    const sysName = String(body.system_name || "Federal Cloud System");
    const draft = generateOscalSspDraft({
      systemId: sysId,
      systemName: sysName,
      tenantId: caller.tenantId,
      baseline: typeof body.baseline === "string" ? body.baseline : "HIGH",
      implementations: Array.isArray(body.implementations) ? (body.implementations as SspControlImplementationInput[]) : [],
    });
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        tenantId: caller.tenantId,
        artifactType: "SSP",
        systemId: sysId,
        title: `${sysName} OSCAL SSP Draft`,
        status: "DRAFT",
        payload: draft as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
    return finishPost(200, { tenant_id: caller.tenantId, ...draft, storageReceipt: receipt });
  }

  // POST /api/v2/rmf/sap/generate
  if (subPath === "sap/generate") {
    const sysId = String(body.system_id || "sys-001");
    const sysName = String(body.system_name || "Federal Cloud System");
    const sap = generateOscalSap({
      systemId: sysId,
      systemName: sysName,
      tenantId: caller.tenantId,
      assessorOrg: typeof body.assessor_org === "string" ? body.assessor_org : undefined,
      controlIds: Array.isArray(body.control_ids) ? (body.control_ids as string[]) : ["AC-2", "AU-6", "CM-6", "IA-2", "RA-5"],
    });
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        tenantId: caller.tenantId,
        artifactType: "SAP",
        systemId: sysId,
        title: `${sysName} Security Assessment Plan (SAP)`,
        status: "DRAFT",
        payload: sap as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
    return finishPost(200, { tenant_id: caller.tenantId, ...sap, storageReceipt: receipt });
  }

  // POST /api/v2/rmf/sar/generate
  if (subPath === "sar/generate") {
    const sysId = String(body.system_id || "sys-001");
    const sysName = String(body.system_name || "Federal Cloud System");
    const sar = generateOscalSar({
      systemId: sysId,
      systemName: sysName,
      tenantId: caller.tenantId,
      assessorName: typeof body.assessor_name === "string" ? body.assessor_name : undefined,
      observations: Array.isArray(body.observations) ? (body.observations as SarObservationInput[]) : [],
    });
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        tenantId: caller.tenantId,
        artifactType: "SAR",
        systemId: sysId,
        title: `${sysName} Security Assessment Report (SAR)`,
        status: "UNDER_REVIEW",
        payload: sar as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
    return finishPost(200, { tenant_id: caller.tenantId, ...sar, storageReceipt: receipt });
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
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        id: closure.poamId,
        tenantId: caller.tenantId,
        artifactType: "POAM",
        systemId: String(body.system_id || "sys-001"),
        title: `${closure.controlId} POA&M (${closure.status})`,
        status: closure.status,
        payload: closure as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
    return finishPost(closure.closed ? 200 : 422, { tenant_id: caller.tenantId, ...closure, storageReceipt: receipt });
  }

  // POST /api/v2/rmf/cato/evaluate
  if (subPath === "cato/evaluate") {
    const sysId = String(body.system_id || "sys-001");
    const cato = evaluateContinuousAtoStatus({
      systemId: sysId,
      vulnScanAgeDays: Number(body.vuln_scan_age_days ?? 12),
      overdueKevCount: Number(body.overdue_kev_count ?? 0),
      overdueHighPoamCount: Number(body.overdue_high_poam_count ?? 0),
      stigCompliancePercent: Number(body.stig_compliance_percent ?? 94),
      siemTelemetryActive: body.siem_telemetry_active !== false,
      significantBoundaryChangePending: body.significant_boundary_change === true,
    });
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        tenantId: caller.tenantId,
        artifactType: "CATO",
        systemId: sysId,
        title: `cATO Status (${cato.status})`,
        status: cato.status,
        payload: cato as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
    return finishPost(200, { tenant_id: caller.tenantId, ...cato, storageReceipt: receipt });
  }

  // POST /api/v2/rmf/risks/register
  if (subPath === "risks/register") {
    const entry = createEnterpriseRiskRegisterRecord({
      riskId: typeof body.risk_id === "string" ? body.risk_id : undefined,
      tenantId: caller.tenantId,
      systemId: String(body.system_id || "sys-001"),
      title: String(body.title || "Unmitigated security risk"),
      tier: (String(body.tier || "SYSTEM").toUpperCase() as "SYSTEM" | "MISSION" | "ORGANIZATIONAL"),
      linkedControlIds: Array.isArray(body.linked_controls) ? (body.linked_controls as string[]) : undefined,
      linkedPoamIds: Array.isArray(body.linked_poams) ? (body.linked_poams as string[]) : undefined,
      inherentLikelihood: Math.max(1, Math.min(5, Number(body.inherent_likelihood ?? 4))) as 1 | 2 | 3 | 4 | 5,
      inherentImpact: Math.max(1, Math.min(5, Number(body.inherent_impact ?? 4))) as 1 | 2 | 3 | 4 | 5,
      residualLikelihood: body.residual_likelihood ? (Math.max(1, Math.min(5, Number(body.residual_likelihood))) as 1 | 2 | 3 | 4 | 5) : undefined,
      residualImpact: body.residual_impact ? (Math.max(1, Math.min(5, Number(body.residual_impact))) as 1 | 2 | 3 | 4 | 5) : undefined,
      treatmentStrategy: (String(body.treatment_strategy || "MITIGATE").toUpperCase() as "MITIGATE" | "TRANSFER" | "AVOID" | "PROPOSE_ACCEPTANCE"),
    });
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        id: entry.riskId,
        tenantId: caller.tenantId,
        artifactType: "RISK",
        systemId: entry.systemId,
        title: entry.title,
        status: entry.approvalState,
        payload: entry as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
    return finishPost(200, { ...entry, storageReceipt: receipt });
  }

  // POST /api/v2/rmf/crosswalk
  if (subPath === "crosswalk") {
    const controlId = String(body.control_id || "AC-2");
    return finishPost(200, { tenant_id: caller.tenantId, ...resolveFrameworkCrosswalk(controlId) });
  }

  // POST /api/v2/rmf/cyber/vulnerabilities (Live CISA KEV)
  if (subPath === "cyber/vulnerabilities") {
    const intel = await analyzeVulnerabilityIntelligence({
      findings: Array.isArray(body.findings) ? (body.findings as RawScannerFinding[]) : [],
      forceOfflineKev: body.force_offline_kev === true,
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...intel });
  }

  // POST /api/v2/rmf/cyber/attack-paths
  if (subPath === "cyber/attack-paths") {
    const paths = analyzeAttackPaths({
      nodes: Array.isArray(body.nodes) ? (body.nodes as AttackNodeInput[]) : [],
      edges: Array.isArray(body.edges) ? (body.edges as AttackEdgeInput[]) : [],
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...paths });
  }

  // POST /api/v2/rmf/cyber/config-compliance
  if (subPath === "cyber/config-compliance") {
    const compliance = evaluateConfigurationCompliance({
      benchmarkName: typeof body.benchmark_name === "string" ? body.benchmark_name : undefined,
      checks: Array.isArray(body.checks) ? (body.checks as ConfigCheckInput[]) : [],
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...compliance });
  }

  // POST /api/v2/rmf/connectors/collect
  if (subPath === "connectors/collect") {
    const collected = collectConnectorEvidence({
      connectorId: String(body.connector_id || "aws-securityhub") as SupportedConnectorId,
      tenantId: caller.tenantId,
      controlId: String(body.control_id || "AC-2"),
      scopeBoundary: String(body.scope_boundary || "prod-govcloud-boundary"),
      claimedSha256: typeof body.claimed_sha256 === "string" ? body.claimed_sha256 : undefined,
      samplePayload: body.sample_payload,
    });
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        id: collected.verification.evidenceId,
        tenantId: caller.tenantId,
        artifactType: "EVIDENCE",
        systemId: String(body.system_id || "sys-001"),
        title: `Connector ${collected.connectorId} (${collected.verification.controlId})`,
        status: collected.verification.status,
        payload: collected as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
    return finishPost(collected.verification.verified ? 200 : 422, { ...collected, storageReceipt: receipt });
  }

  // POST /api/v2/rmf/cyber/forecast
  if (subPath === "cyber/forecast") {
    const forecast = forecastCyberRisk({
      openKevCount: Number(body.open_kev_count ?? 2),
      openHighCount: Number(body.open_high_count ?? 12),
      kevPatchRatePerMonth: typeof body.kev_patch_rate === "number" ? body.kev_patch_rate : undefined,
      highPatchRatePerMonth: typeof body.high_patch_rate === "number" ? body.high_patch_rate : undefined,
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...forecast });
  }

  // POST /api/v2/rmf/cyber/sbom
  if (subPath === "cyber/sbom") {
    const sbomObj = (body.sbom && typeof body.sbom === "object" ? body.sbom : body) as Record<string, unknown>;
    return finishPost(200, { tenant_id: caller.tenantId, ...evaluateSupplyChainSbom({ sbom: sbomObj }) });
  }

  // POST /api/v2/rmf/cyber/zero-trust
  if (subPath === "cyber/zero-trust") {
    const clampZ = (v: unknown, def: number): ZtPillarScore => Math.max(1, Math.min(4, Number(v ?? def))) as ZtPillarScore;
    const zt = evaluateZeroTrustMaturity({
      identityScore: clampZ(body.identity, 3),
      devicesScore: clampZ(body.devices, 3),
      networksScore: clampZ(body.networks, 2),
      applicationsScore: clampZ(body.applications, 3),
      dataScore: clampZ(body.data, 2),
    });
    return finishPost(200, { tenant_id: caller.tenantId, ...zt });
  }

  // POST /api/v2/rmf/simulator/run
  if (subPath === "simulator/run") {
    return finishPost(200, { tenant_id: caller.tenantId, ...runDeterministicRmfSimulation() });
  }

  // POST /api/v2/rmf/training/feedback
  if (subPath === "training/feedback") {
    const rec = createExpertFeedbackRecord({
      tenantId: caller.tenantId,
      controlId: String(body.control_id || "AC-2"),
      prompt: String(body.prompt || ""),
      preferredResponse: String(body.preferred_response || ""),
      rejectedResponse: typeof body.rejected_response === "string" ? body.rejected_response : undefined,
      rationale: String(body.rationale || "Assessor expert correction"),
      submittedBy: caller.actorId,
    });
    const receipt = await safePersist(() =>
      saveRmfArtifact({
        id: rec.feedbackId,
        tenantId: caller.tenantId,
        artifactType: "FEEDBACK",
        systemId: "training-corpus",
        title: `${rec.controlId} Feedback (${rec.status})`,
        status: rec.status,
        payload: rec as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
    return finishPost(200, { feedback: rec, storageReceipt: receipt });
  }

  // POST /api/v2/rmf/training/feedback/approve
  if (subPath === "training/feedback/approve") {
    const feedbackId = String(body.feedback_id || "").trim();
    const reviewerId = String(body.approved_by || caller.actorId).trim();
    const decision = body.decision === "REJECTED" ? "REJECTED" : "APPROVED";
    if (!feedbackId || !reviewerId) {
      return jsonResponse({ error: "BAD_REQUEST", message: "feedback_id and human approved_by reviewer are required." }, 400, correlationId);
    }
    const existing = await getRmfArtifactById<ExpertFeedbackCandidate>(caller.tenantId, feedbackId);
    if (!existing) {
      return jsonResponse({ error: "NOT_FOUND", message: `Feedback '${feedbackId}' not found for tenant '${caller.tenantId}'.` }, 404, correlationId);
    }
    const updatedRec = approveExpertFeedbackRecord(existing.payload, reviewerId, decision);
    const saved = await updateRmfArtifactApproval(caller.tenantId, feedbackId, updatedRec.status, reviewerId, updatedRec as unknown as Record<string, unknown>);
    return finishPost(200, { feedback: updatedRec, ledgerEventHash: saved?.ledgerEventHash || null });
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
      controls: Array.isArray(body.controls) ? (body.controls as string[]) : ["AC-2", "AU-6", "IA-2", "SC-7", "SI-4"],
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
    const agentId = String(body.agent_id || "ASSESSMENT_AGENT") as RmfAgentId;
    const requestedAction = String(body.action || "CREATE_DRAFT") as GuardedAgentAction;
    const guard = executeAgentActionGuard(agentId, requestedAction, false);
    if (!guard.allowed) return finishPost(403, guard);

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
    const diff = computePolicyImpactDiff(String(body.from_baseline || "LOW"), String(body.to_baseline || "HIGH"));
    return finishPost(200, { tenant_id: caller.tenantId, ...diff });
  }

  // POST /api/v2/rmf/investigate
  if (subPath === "investigate") {
    const q = String(body.question || "").trim();
    if (!q) return jsonResponse({ error: "BAD_REQUEST", message: "question is required." }, 400, correlationId);
    const { buildRmfGroundingPacket } = await import("../noctis-rmf-db.ts");
    const { executeUniversalRmfReasoning } = await import("../noctis-rmf-reasoning.server.ts");
    const packet = buildRmfGroundingPacket(q);
    const answer = await executeUniversalRmfReasoning(q, { tenantId: caller.tenantId, persistTrace: false });

    const ruleItems = packet.ruleEvaluations.map((r) => ({
      ruleId: r.ruleId,
      ruleVersion: r.ruleVersion,
      controlId: r.controlId,
      assessmentMode: r.assessmentMode || "FORMAL_EVIDENCE_AUDIT",
      verdict: r.verdict,
      formalDetermination: String(r.formalDetermination || r.verdict),
      variance: r.variance,
      auditHash: r.auditHash,
      observedFacts: r.observedFacts,
      authorityDocs: (r.authorityCitations || []).map(
        (a) => `${a.document} (${a.version}) ${a.section}${a.parameterId ? ` [${a.parameterId}]` : ""}`,
      ),
    }));
    const combinedEvidenceSha =
      packet.ruleEvaluations.length === 0
        ? packet.manifest.dbSha256
        : packet.ruleEvaluations.length === 1
        ? packet.ruleEvaluations[0]!.auditHash
        : sha256Sync(packet.ruleEvaluations.map((r) => `${r.ruleId}:${r.auditHash}`).join("|"));

    const bundle = createExplanationBundle({
      tenantId: caller.tenantId,
      evaluationRef:
        packet.ruleEvaluations.length > 0
          ? packet.ruleEvaluations.map((r) => r.controlId).join("+")
          : `INV-${Date.now().toString(36)}`,
      nistVersion: packet.manifest.nistVersion,
      dbSha256: packet.manifest.dbSha256,
      ruleId:
        packet.ruleEvaluations.length > 0
          ? packet.ruleEvaluations.map((r) => r.ruleId).join("+")
          : "RMF-INVESTIGATE-001",
      ruleVersion:
        packet.ruleEvaluations.length > 0
          ? packet.ruleEvaluations.map((r) => r.ruleVersion).join("+")
          : "2.0.0",
      evidenceSha256: combinedEvidenceSha,
      observedFacts:
        packet.ruleEvaluations.length === 1
          ? packet.ruleEvaluations[0]!.observedFacts
          : packet.ruleEvaluations.length > 1
          ? {
              ruleCount: packet.ruleEvaluations.length,
              controls: packet.ruleEvaluations.map((r) => r.controlId).join(", "),
              verdicts: packet.ruleEvaluations.map((r) => `${r.controlId}:${r.verdict}`).join(", "),
            }
          : { queryControlsCount: packet.controls.length },
      deterministicClassifications: packet.ruleEvaluations.map(
        (r) => `${r.controlId} (${r.ruleId}): ${r.verdict} — ${r.variance}`,
      ),
      analyticalEstimates: [],
      verdict:
        packet.ruleEvaluations.length === 0
          ? "ADVISORY_GROUNDED"
          : packet.ruleEvaluations.length === 1
          ? packet.ruleEvaluations[0]!.verdict
          : packet.ruleEvaluations.map((r) => `${r.controlId}:${r.verdict}`).join("|"),
      ...(ruleItems.length > 0 ? { ruleEvaluations: ruleItems } : {}),
    });
    if (EXPLANATION_STORE.size > 200) EXPLANATION_STORE.clear();
    EXPLANATION_STORE.set(bundle.bundleId, bundle);

    const storageReceipt = await safePersist(() =>
      saveRmfArtifact({
        id: bundle.bundleId,
        tenantId: caller.tenantId,
        artifactType: "EXPLANATION",
        systemId: String(body.system_id || "noctis-investigate"),
        title: `Investigation Trace ${bundle.evaluationRef} (${bundle.verdict})`,
        status: "RECORDED",
        payload: bundle as unknown as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );

    return finishPost(200, {
      tenant_id: caller.tenantId,
      explanationBundleId: bundle.bundleId,
      canonicalTraceHash: bundle.canonicalTraceHash,
      storageReceipt,
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
