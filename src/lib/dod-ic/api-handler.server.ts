/**
 * Noctis Defense & Intelligence Community (NDIMP) REST API Dispatcher (/api/v2/dod-ic/*)
 */

import { replayExplanationBundle, type ExplanationBundle } from "../rmf-v2/graph-and-trace.ts";
import { getRmfExplanationArtifactById, saveRmfArtifact } from "../rmf-v2/persistence.server.ts";
import { exportEmassXlsxWorkbook, generateComplianceBinderMarkdown, type EmassControlExportRow, type EmassPoamExportRow } from "./emass-export-engine.ts";
import { resolveDodIcCallerContext } from "./rbac.server.ts";
import { buildAttackNavigatorLayer, parseSigmaYamlRule, parseYaraRule, type NavigatorTechniqueInput } from "./sigma-attack-engine.ts";
import { listStigBenchmarks, lookupStigRuleById, searchStigLibrary, type StigBenchmarkId } from "./stig-library.ts";
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
import {
  evaluateDodi8530IncidentReporting,
  evaluateDodi8531VulnerabilityCompliance,
  getDisaCciManifest,
  listCcisForNistControl,
  lookupDisaCci,
  parseAndEvaluateAcasNessus,
  parseAndEvaluateStigXccdfOrCkl,
  type AcasJsonFindingInput,
  type StigJsonCheckInput,
} from "./stig-acas-engine.ts";
import {
  evaluateDodIcamPkiAuthentication,
  evaluateDodZeroTrust7Pillar,
  evaluatePrivilegedAccessAndAbac,
  getDodZeroTrustCatalog,
  type DodCredentialType,
} from "./zero-trust-icam-engine.ts";
import {
  checkUpstreamAuthoritativeDrift,
  createPolicyChangeProposal,
  decidePolicyChangeProposal,
  diffHistoricalDirectiveRevision,
  diffPolicyDocumentVersions,
  listDirectiveLineages,
  listPolicyChangeProposals,
} from "./policy-change-engine.server.ts";
import {
  evaluateClassifiedMediaSanitizationAndSpillage,
  evaluateComsecAndCsfcArchitecture,
  evaluateScifIcd705Compliance,
  evaluateTempestRedBlackCompliance,
} from "./classified-systems-engine.ts";
import {
  evaluateDcoSocDetectionCoverage,
  evaluateDigitalForensicsChainOfCustody,
  evaluateInsiderThreatProgram,
} from "./dco-forensics-engine.ts";
import {
  evaluateDevSecOpsCatoAndSsdf,
  evaluateDodCloudSrgInheritance,
  evaluateKubernetesAndContainerHardening,
} from "./devsecops-cloud-engine.ts";
import {
  evaluateAiAdversarialRedTeam,
  evaluateDefenseAiGovernanceAndRai,
} from "./defense-ai-governance-engine.ts";
import {
  evaluateIcd203AndAchAnalysis,
  evaluateMultiIntSyntheticFusion,
  type AchRating,
  type AnalyticConfidence,
} from "./intel-tradecraft-fusion-engine.ts";
import {
  evaluateAcquisitionCmmcAndFoci,
  evaluateDigitalEngineeringSpaceSpectrum,
  evaluateMissionAssuranceDag,
} from "./mission-acquisition-space-engine.ts";
import type { ZtPillarScore } from "../rmf-v2/cyber-intelligence.ts";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Tenant-ID, X-Noctis-Key, X-Noctis-Role",
};

function jsonRes(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

export async function handleDodIcV2Request(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/v2\/dod-ic\/?/, "").replace(/\/+$/, "");
  const method = request.method.toUpperCase();
  const caller = await resolveDodIcCallerContext(request);
  const tenantId = caller.tenantId;

  if (method === "GET" && subPath === "auth/me") {
    return jsonRes(caller);
  }

  if (method === "GET" && (subPath === "" || subPath === "status")) {
    const stigBenchmarks = listStigBenchmarks();
    return jsonRes({
      platform: "Noctis Defense & Intelligence Community Security Architecture (NDIMP Waves 1–4 Complete)",
      version: "4.0.0",
      wave1Complete: true,
      wave2Complete: true,
      wave3Complete: true,
      wave4Complete: true,
      engines: [
        "DOD-RMF-DODI-8510.01",
        "CNSSI-1253-CATEGORIZATION",
        "IC-SECURITY-ICD-503-502-501",
        "CLASSIFICATION-AWARE-GATEWAY",
        "CROSS-DOMAIN-DODI-8540.01",
        "DISA-STIG-CCI-CROSSWALK",
        "DISA-STIG-BENCHMARK-LIBRARY",
        "ACAS-NESSUS-PARSER-DODI-8531.01",
        "SCAP-XCCDF-CKL-ENGINE",
        "CYBER-INCIDENT-DODI-8530.03",
        "DOD-ZERO-TRUST-7-PILLAR-FY2027",
        "CISA-ZTMM-V2-CROSSWALK",
        "DOD-ICAM-PKI-DODI-8520.02-03",
        "DOD-PAM-ABAC-MICROSEGMENTATION",
        "POLICY-CHANGE-INTELLIGENCE-DIFF",
        "UPSTREAM-OSCAL-CCI-DRIFT-MONITOR",
        "DUAL-CONTROL-POLICY-ROLLOUT",
        "CLASSIFIED-SCIF-ICD-705",
        "COMSEC-DODI-8523.01-CNSA2-CSFC",
        "TEMPEST-RED-BLACK-CTTA",
        "MEDIA-SANITIZATION-SP-800-88-R2",
        "DCO-SOC-TELEMETRY-FORENSICS-SP-800-86",
        "SIGMA-YARA-ATTACK-NAVIGATOR-EXPORTER",
        "INSIDER-THREAT-DODI-5205.16",
        "DEVSECOPS-CATO-SSDF-K8S-STIG",
        "CLOUD-CC-SRG-INHERITANCE",
        "DEFENSE-AI-RAI-DODD-3000.09-REDTEAM",
        "IC-ANALYTIC-TRADECRAFT-ICD-203-ACH-6X6",
        "SYNTHETIC-MULTI-INT-FUSION",
        "MISSION-ASSURANCE-DAG-DODI-3020.45",
        "ACQUISITION-CMMC-32CFR-170-DFARS-FOCI",
        "SPACE-SPD-5-SPECTRUM-4650-MBSE-5000.97",
        "EMASS-XACTA-XLSX-BINDER-EXPORT",
      ],
      policiesCount: Object.keys(DOD_IC_POLICY_REGISTRY).length,
      policyLineagesCount: listDirectiveLineages().length,
      stigLibraryBenchmarks: stigBenchmarks.length,
      stigLibraryRulesCount: stigBenchmarks.reduce((a, b) => a + b.ruleCount, 0),
      rbacEnabled: true,
      emassXlsxExportEnabled: true,
      sigmaAttackNavigatorEnabled: true,
      scheduledDriftCronPath: "/api/v2/dod-ic/cron/drift-check",
      disaCci: getDisaCciManifest(),
      zeroTrustCatalog: getDodZeroTrustCatalog().summary,
      invariants: {
        dodAtoAutomaticallySatisfiesIcIcd503: false,
        clearanceAuthorizesCommercialCloudClassified: false,
        scannerOutputEqualsValidatedRemediation: false,
        ocspFailOpenCompliantWithDodi8520: false,
        smsOtpSatisfiesPhishingResistantMfa: false,
        aiCanIssueAto: false,
        aiCanAutoApprovePolicyRollout: false,
        selfApprovalPermittedOnPolicyRollout: false,
        singleLayerCommercialSatisfiesCsfc: false,
        degaussingSanitizesSsdFlash: false,
        clearSanitizesTsSciForUnclassifiedRelease: false,
        cspPaAutomaticallyGrantsMissionOwnerAto: false,
        autonomousLethalExemptFromHumanJudgment: false,
        singleSourceF6SatisfiesHighConfidence: false,
        missingTelemetryProvesNoIntrusion: false,
      },
    });
  }

  if (method === "GET" && subPath === "stig/library") {
    const idParam = (url.searchParams.get("id") || "").trim();
    if (idParam) {
      const rule = lookupStigRuleById(idParam);
      if (!rule) return jsonRes({ error: "NOT_FOUND", message: `STIG rule '${idParam}' not found in indexed library.` }, 404);
      return jsonRes({ found: true, rule });
    }
    const benchmarkId = (url.searchParams.get("benchmark") || "").trim().toUpperCase() as StigBenchmarkId | "";
    const severity = (url.searchParams.get("severity") || "").trim().toUpperCase() as "CAT_I" | "CAT_II" | "CAT_III" | "";
    const query = (url.searchParams.get("q") || "").trim();
    const benchmarks = listStigBenchmarks();
    const rules = searchStigLibrary({
      query: query || undefined,
      benchmarkId: benchmarkId || undefined,
      severity: severity || undefined,
      limit: 50,
    });
    return jsonRes({ benchmarks, count: rules.length, rules });
  }

  if (method === "GET" && subPath === "cron/drift-check") {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const isLocalTest = url.hostname === "local.test" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (cronSecret && !isLocalTest) {
      const authHdr = request.headers.get("authorization") || "";
      if (authHdr !== `Bearer ${cronSecret}`) {
        return jsonRes({ error: "UNAUTHORIZED_CRON" }, 401);
      }
    }
    const live = url.searchParams.get("live") !== "false";
    const drift = await checkUpstreamAuthoritativeDrift({ liveCheck: live });
    const snapshotId = `DRIFT-${new Date().toISOString().slice(0, 10)}-${drift.ruleResult.auditHash.slice(0, 8).toUpperCase()}`;
    try {
      await saveRmfArtifact({
        id: snapshotId,
        tenantId: "tenant:cron-governance",
        artifactType: "POLICY_CHANGE",
        systemId: "ndimp-drift-monitor",
        title: `Scheduled Upstream Policy Drift Check (${drift.overallStatus})`,
        status: drift.driftCount > 0 ? "PENDING_HUMAN_REVIEW" : "VERIFIED_NO_DRIFT",
        payload: drift as unknown as Record<string, unknown>,
        createdBy: "cron:dod-ic-drift",
      });
    } catch {
      /* Non-fatal if DB unavailable */
    }
    return jsonRes({
      ok: true,
      snapshotId,
      autoApplyToProduction: drift.autoApplyToProduction,
      humanDualControlRequired: drift.humanDualControlRequired,
      overallStatus: drift.overallStatus,
      driftCount: drift.driftCount,
      checkedAt: drift.checkedAt,
    });
  }

  if (method === "GET" && subPath === "zero-trust/pillars") {
    return jsonRes(getDodZeroTrustCatalog());
  }

  if (method === "GET" && subPath === "policy-change/lineage") {
    const pid = (url.searchParams.get("policy") || "").trim();
    if (pid) {
      const rep = diffHistoricalDirectiveRevision(pid);
      if (!rep) return jsonRes({ error: "NOT_FOUND", message: `No revision lineage found for '${pid}'.` }, 404);
      return jsonRes(rep);
    }
    const lineages = listDirectiveLineages();
    return jsonRes({ count: lineages.length, lineages });
  }

  if (method === "GET" && subPath === "policy-change/drift") {
    const live = url.searchParams.get("live") !== "false";
    const drift = await checkUpstreamAuthoritativeDrift({ liveCheck: live });
    return jsonRes(drift);
  }

  if (method === "GET" && subPath === "policy-change/proposals") {
    const proposals = await listPolicyChangeProposals(tenantId);
    return jsonRes({ tenant_id: tenantId, count: proposals.length, proposals });
  }

  if (method === "GET" && subPath === "cci") {
    const idParam = (url.searchParams.get("id") || "").trim();
    const ctrlParam = (url.searchParams.get("control") || "").trim();
    if (idParam) {
      const cci = lookupDisaCci(idParam);
      if (!cci) return jsonRes({ error: "NOT_FOUND", message: `DISA CCI '${idParam}' not found.` }, 404);
      return jsonRes({ found: true, cci });
    }
    if (ctrlParam) {
      const ccis = listCcisForNistControl(ctrlParam);
      return jsonRes({ controlId: ctrlParam.toUpperCase(), count: ccis.length, ccis });
    }
    return jsonRes({ manifest: getDisaCciManifest() });
  }

  if (method === "GET" && subPath.startsWith("cci/by-control/")) {
    const ctrlId = decodeURIComponent(subPath.slice("cci/by-control/".length)).trim();
    if (!ctrlId) return jsonRes({ error: "BAD_REQUEST", message: "controlId is required." }, 400);
    const ccis = listCcisForNistControl(ctrlId);
    return jsonRes({ controlId: ctrlId.toUpperCase(), count: ccis.length, ccis });
  }

  if (method === "GET" && subPath.startsWith("cci/")) {
    const cciId = decodeURIComponent(subPath.slice("cci/".length)).trim();
    const cci = lookupDisaCci(cciId);
    if (!cci) return jsonRes({ error: "NOT_FOUND", message: `DISA CCI '${cciId}' not found.` }, 404);
    return jsonRes({ found: true, cci });
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

  if (subPath === "acas/analyze") {
    const analysis = await parseAndEvaluateAcasNessus({
      nessusXml: typeof body.nessus_xml === "string" ? body.nessus_xml : typeof body.xml === "string" ? body.xml : undefined,
      findings: Array.isArray(body.findings) ? (body.findings as AcasJsonFindingInput[]) : undefined,
      forceOfflineKev: body.force_offline_kev === true,
      assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      evidenceVerified: body.evidence_verified === true,
    });
    return jsonRes(analysis);
  }

  if (subPath === "stig/evaluate") {
    const res = parseAndEvaluateStigXccdfOrCkl({
      cklXml: typeof body.ckl_xml === "string" ? body.ckl_xml : undefined,
      xccdfXml: typeof body.xccdf_xml === "string" ? body.xccdf_xml : undefined,
      checks: Array.isArray(body.checks) ? (body.checks as StigJsonCheckInput[]) : undefined,
      benchmarkTitle: typeof body.benchmark_title === "string" ? body.benchmark_title : undefined,
      assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
      evidenceVerified: body.evidence_verified === true,
    });
    return jsonRes(res);
  }

  if (subPath === "vuln/dodi8531") {
    return jsonRes(
      evaluateDodi8531VulnerabilityCompliance({
        cveId: typeof body.cve_id === "string" ? body.cve_id : null,
        severityCategory: body.severity as
          | "CRITICAL"
          | "HIGH"
          | "MODERATE"
          | "MEDIUM"
          | "LOW"
          | "CAT_I"
          | "CAT_II"
          | "CAT_III"
          | undefined,
        isCisaKev: typeof body.is_cisa_kev === "boolean" ? body.is_cisa_kev : null,
        hasActiveIava: typeof body.has_active_iava === "boolean" ? body.has_active_iava : null,
        iavaDueDays: typeof body.iava_due_days === "number" ? body.iava_due_days : null,
        daysOpen: typeof body.days_open === "number" ? body.days_open : null,
        credentialedScanPassed: typeof body.credentialed_scan_passed === "boolean" ? body.credentialed_scan_passed : null,
        poamTracked: typeof body.poam_tracked === "boolean" ? body.poam_tracked : null,
        aoRiskAccepted: typeof body.ao_risk_accepted === "boolean" ? body.ao_risk_accepted : null,
        remediationRescanVerified:
          typeof body.remediation_rescan_verified === "boolean" ? body.remediation_rescan_verified : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "incident/dodi8530") {
    return jsonRes(
      evaluateDodi8530IncidentReporting({
        incidentCategory: body.incident_category as
          | "ROOT_COMPROMISE"
          | "CLASSIFIED_SPILLAGE"
          | "USER_COMPROMISE"
          | "MALICIOUS_LOGIC"
          | "DOS"
          | "SUSPICIOUS_ACTIVITY"
          | undefined,
        hoursSinceDiscovery: typeof body.hours_since_discovery === "number" ? body.hours_since_discovery : null,
        csspNotified: typeof body.cssp_notified === "boolean" ? body.cssp_notified : null,
        uscybercomJfhqNotified: typeof body.jfhq_notified === "boolean" ? body.jfhq_notified : null,
        containmentInitiated: typeof body.containment_initiated === "boolean" ? body.containment_initiated : null,
        forensicEvidencePreserved: typeof body.forensic_preserved === "boolean" ? body.forensic_preserved : null,
        affectsClassifiedOrNss: typeof body.classified_or_nss === "boolean" ? body.classified_or_nss : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "zero-trust/evaluate") {
    const parseOptZtScore = (v: unknown): ZtPillarScore | null => {
      if (typeof v !== "number") return null;
      return v >= 4 ? 4 : v >= 3 ? 3 : v >= 2 ? 2 : 1;
    };
    return jsonRes(
      evaluateDodZeroTrust7Pillar({
        systemName: typeof body.system_name === "string" ? body.system_name : undefined,
        isNationalSecuritySystem: body.is_nss === true,
        userScore: parseOptZtScore(body.user_score),
        deviceScore: parseOptZtScore(body.device_score),
        networkScore: parseOptZtScore(body.network_score),
        applicationsScore: parseOptZtScore(body.applications_score),
        dataScore: parseOptZtScore(body.data_score),
        visibilityScore: parseOptZtScore(body.visibility_score),
        automationScore: parseOptZtScore(body.automation_score),
        phishingResistantMfaEnforced:
          typeof body.phishing_resistant_mfa === "boolean" ? body.phishing_resistant_mfa : null,
        devicePostureAndEdrVerified:
          typeof body.device_posture_edr === "boolean" ? body.device_posture_edr : null,
        microsegmentationAndMtlsEnforced:
          typeof body.microsegmentation_mtls === "boolean" ? body.microsegmentation_mtls : null,
        dataTaggingAndEncryptionEnforced:
          typeof body.data_tagging_encryption === "boolean" ? body.data_tagging_encryption : null,
        continuousPdpPepEnforced:
          typeof body.continuous_pdp_pep === "boolean" ? body.continuous_pdp_pep : null,
        centralizedSiemsAndSoarActive:
          typeof body.centralized_siem_soar === "boolean" ? body.centralized_siem_soar : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "icam/evaluate") {
    return jsonRes(
      evaluateDodIcamPkiAuthentication({
        credentialType: typeof body.credential_type === "string" ? (body.credential_type.toUpperCase() as DodCredentialType) : null,
        isPrivilegedAccount: body.is_privileged === true,
        separatePrivilegedAccountAndAltToken:
          typeof body.separate_alt_token === "boolean" ? body.separate_alt_token : null,
        ocspOrCrlRevocationChecked:
          typeof body.ocsp_crl_checked === "boolean" ? body.ocsp_crl_checked : null,
        revocationFailClosed:
          typeof body.revocation_fail_closed === "boolean" ? body.revocation_fail_closed : null,
        dodRootCaChainVerified:
          typeof body.dod_root_ca_verified === "boolean" ? body.dod_root_ca_verified : null,
        fips140ValidatedCrypto:
          typeof body.fips_140_crypto === "boolean" ? body.fips_140_crypto : null,
        upstreamBastionEnforcesHardwareMfa:
          typeof body.upstream_bastion_hardware_mfa === "boolean" ? body.upstream_bastion_hardware_mfa : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "icam/pam-abac") {
    return jsonRes(
      evaluatePrivilegedAccessAndAbac({
        standingPrivilegedAccessEliminated:
          typeof body.standing_privilege_eliminated === "boolean" ? body.standing_privilege_eliminated : null,
        jitApprovalAndSessionRecording:
          typeof body.jit_session_recording === "boolean" ? body.jit_session_recording : null,
        abacClassificationAttributesEnforced:
          typeof body.abac_enforced === "boolean" ? body.abac_enforced : null,
        rbacOnlyWithoutAttributeChecks:
          typeof body.rbac_only === "boolean" ? body.rbac_only : null,
        eastWestMicrosegmentationEnforced:
          typeof body.east_west_microsegmentation === "boolean" ? body.east_west_microsegmentation : null,
        workloadMtlsWithNpeCerts:
          typeof body.workload_mtls_npe === "boolean" ? body.workload_mtls_npe : null,
        isIcOrClassifiedEnvironment: body.is_ic_or_classified === true,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "policy-change/diff") {
    if (body.mode === "lineage" && typeof body.policy_id === "string") {
      const rep = diffHistoricalDirectiveRevision(body.policy_id);
      if (!rep) return jsonRes({ error: "NOT_FOUND", message: `No lineage found for '${body.policy_id}'.` }, 404);
      return jsonRes(rep);
    }
    return jsonRes(
      diffPolicyDocumentVersions({
        policyId: typeof body.policy_id === "string" ? body.policy_id : undefined,
        oldVersion: typeof body.old_version === "string" ? body.old_version : undefined,
        newVersion: typeof body.new_version === "string" ? body.new_version : undefined,
        oldRequirements: Array.isArray(body.old_requirements) ? (body.old_requirements as string[]) : undefined,
        newRequirements: Array.isArray(body.new_requirements) ? (body.new_requirements as string[]) : undefined,
        oldText: typeof body.old_text === "string" ? body.old_text : undefined,
        newText: typeof body.new_text === "string" ? body.new_text : undefined,
        fromNistBaseline: typeof body.from_nist_baseline === "string" ? body.from_nist_baseline : undefined,
        toNistBaseline: typeof body.to_nist_baseline === "string" ? body.to_nist_baseline : undefined,
      }),
    );
  }

  if (subPath === "policy-change/propose") {
    try {
      const proposer =
        caller.authMethod === "BETTER_AUTH_SESSION" ? caller.actorId : String(body.proposed_by || caller.actorId || "issm-proposer@dod.mil");
      const created = await createPolicyChangeProposal({
        tenantId,
        policyId: String(body.policy_id || "CUSTOM-POLICY"),
        title: typeof body.title === "string" ? body.title : undefined,
        proposedBy: proposer,
        rationale: String(body.rationale || ""),
        oldVersion: typeof body.old_version === "string" ? body.old_version : undefined,
        newVersion: typeof body.new_version === "string" ? body.new_version : undefined,
        oldRequirements: Array.isArray(body.old_requirements) ? (body.old_requirements as string[]) : undefined,
        newRequirements: Array.isArray(body.new_requirements) ? (body.new_requirements as string[]) : undefined,
        oldText: typeof body.old_text === "string" ? body.old_text : undefined,
        newText: typeof body.new_text === "string" ? body.new_text : undefined,
        fromNistBaseline: typeof body.from_nist_baseline === "string" ? body.from_nist_baseline : undefined,
        toNistBaseline: typeof body.to_nist_baseline === "string" ? body.to_nist_baseline : undefined,
      });
      return jsonRes(created, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCls = msg.startsWith("CLASSIFICATION_BOUNDARY_VIOLATION");
      return jsonRes(
        {
          error: isCls ? "CLASSIFICATION_BOUNDARY_VIOLATION" : "BAD_REQUEST",
          message: msg,
        },
        isCls ? 403 : 400,
      );
    }
  }

  if (subPath === "policy-change/review") {
    const decision = String(body.decision || "").toUpperCase() === "REJECT" ? "REJECT" : "APPROVE";
    const requestedRole = String(body.reviewer_role || "");
    const effectiveReviewerId =
      caller.authMethod === "BETTER_AUTH_SESSION" && requestedRole.toUpperCase() !== "AGENT"
        ? caller.actorId
        : String(body.reviewer_id || caller.actorId || "");
    const effectiveRole =
      caller.authMethod === "BETTER_AUTH_SESSION" && requestedRole.toUpperCase() !== "AGENT"
        ? caller.rbacRole
        : requestedRole || caller.rbacRole;

    const res = await decidePolicyChangeProposal({
      tenantId,
      proposalId: String(body.proposal_id || ""),
      decision,
      reviewerId: effectiveReviewerId,
      reviewerRole: effectiveRole,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      regressionSuitePassed: typeof body.regression_suite_passed === "boolean" ? body.regression_suite_passed : true,
    });
    return jsonRes(res, res.statusCode);
  }

  // Wave 2 — Step 1: Classified Systems Security (SCIF, COMSEC/CSfC/CNSA 2.0, TEMPEST, SP 800-88 R2)
  if (subPath === "classified/scif") {
    return jsonRes(
      evaluateScifIcd705Compliance({
        aoAccreditationActive: typeof body.ao_accreditation_active === "boolean" ? body.ao_accreditation_active : null,
        fixedFacilityChecklistCurrent: typeof body.ffc_current === "boolean" ? body.ffc_current : null,
        idsUl2050Monitored: typeof body.ids_ul2050_monitored === "boolean" ? body.ids_ul2050_monitored : null,
        accessControlAndVisitorEscortEnforced: typeof body.access_control_enforced === "boolean" ? body.access_control_enforced : null,
        pedProhibitionEnforced: typeof body.ped_prohibition_enforced === "boolean" ? body.ped_prohibition_enforced : null,
        acousticAndRfInspectionComplete: typeof body.acoustic_rf_verified === "boolean" ? body.acoustic_rf_verified : null,
        coUtilizationAgreementIfShared: typeof body.co_utilization_agreement === "boolean" ? body.co_utilization_agreement : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "classified/comsec-csfc") {
    return jsonRes(
      evaluateComsecAndCsfcArchitecture({
        architectureMode: (body.architecture_mode as "TYPE_1" | "CSFC_DUAL_LAYER" | "SINGLE_LAYER_COMMERCIAL") || null,
        twoIndependentEncryptionLayers: typeof body.two_independent_layers === "boolean" ? body.two_independent_layers : null,
        distinctVendorsAcrossLayers: typeof body.distinct_vendors === "boolean" ? body.distinct_vendors : null,
        csfcCapabilityPackageRegistered: typeof body.capability_package_registered === "boolean" ? body.capability_package_registered : null,
        symmetricAlgorithm: typeof body.symmetric_algorithm === "string" ? body.symmetric_algorithm : null,
        asymmetricKeyExchange: typeof body.asymmetric_key_exchange === "string" ? body.asymmetric_key_exchange : null,
        signatureAlgorithm: typeof body.signature_algorithm === "string" ? body.signature_algorithm : null,
        targetAcquisitionYear: typeof body.target_acquisition_year === "number" ? body.target_acquisition_year : null,
        twoPersonIntegrityEnforced: typeof body.tpi_enforced === "boolean" ? body.tpi_enforced : null,
        comsecCustodianAppointed: typeof body.custodian_appointed === "boolean" ? body.custodian_appointed : null,
        zeroizationCapabilityVerified: typeof body.zeroization_verified === "boolean" ? body.zeroization_verified : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "classified/tempest") {
    return jsonRes(
      evaluateTempestRedBlackCompliance({
        redBlackCablingSeparated: typeof body.red_black_separated === "boolean" ? body.red_black_separated : null,
        cttaAssessmentCompleted: typeof body.ctta_completed === "boolean" ? body.ctta_completed : null,
        protectedDistributionSystemIfOutsideScif: typeof body.pds_verified === "boolean" ? body.pds_verified : null,
        unshieldedRfTransmitterNearRedEquipment: typeof body.rf_near_red === "boolean" ? body.rf_near_red : null,
        powerLineFilteringVerified: typeof body.power_filtering_verified === "boolean" ? body.power_filtering_verified : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "classified/sanitize") {
    return jsonRes(
      evaluateClassifiedMediaSanitizationAndSpillage({
        mediaType: (body.media_type as "SSD_FLASH" | "HDD_MAGNETIC" | "VOLATILE_RAM" | "OPTICAL" | "PAPER" | "MULTI_FUNCTION_PRINTER") || null,
        highestClassification: (body.highest_classification as SecurityClassification) || null,
        proposedMethod: (body.proposed_method as "CLEAR_FORMAT" | "PURGE_CRYPTO_ERASE" | "DEGAUSS_NSA_EPL" | "DESTROY_NSA_EPL_SHRED_DISINTEGRATE") || null,
        destinationBoundary: (body.destination_boundary as "SAME_ACCREDITED_ENCLAVE" | "LOWER_OR_UNCLASSIFIED_RELEASE" | "EXCESS_DISPOSAL") || null,
        spillageEvent: typeof body.spillage_event === "boolean" ? body.spillage_event : null,
        spillageContainedAndIsolated: typeof body.spillage_contained === "boolean" ? body.spillage_contained : null,
        securityOfficerNotified: typeof body.security_officer_notified === "boolean" ? body.security_officer_notified : null,
        deviceWipedWithoutForensicApproval: typeof body.wiped_without_forensic_approval === "boolean" ? body.wiped_without_forensic_approval : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  // Wave 2 — Step 2: DCO Detection, Forensics & Insider Threat
  if (subPath === "dco/detection") {
    return jsonRes(
      evaluateDcoSocDetectionCoverage({
        edrTelemetryPresent: typeof body.edr_present === "boolean" ? body.edr_present : null,
        dnsLogsPresent: typeof body.dns_logs_present === "boolean" ? body.dns_logs_present : null,
        netflowOrFirewallLogsPresent: typeof body.netflow_present === "boolean" ? body.netflow_present : null,
        identityAuthLogsPresent: typeof body.auth_logs_present === "boolean" ? body.auth_logs_present : null,
        siemCorrelationActive: typeof body.siem_active === "boolean" ? body.siem_active : null,
        sigmaOrYaraRulesValidated: typeof body.sigma_yara_validated === "boolean" ? body.sigma_yara_validated : null,
        mappedAttackTechniques: Array.isArray(body.attack_techniques) ? (body.attack_techniques as string[]) : [],
        claimsNoIntrusionOccurred: typeof body.claims_no_intrusion === "boolean" ? body.claims_no_intrusion : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "dco/forensics") {
    return jsonRes(
      evaluateDigitalForensicsChainOfCustody({
        volatileMemoryCapturedBeforeReboot: typeof body.volatile_ram_captured === "boolean" ? body.volatile_ram_captured : null,
        hardwareWriteBlockerUsed: typeof body.write_blocker_used === "boolean" ? body.write_blocker_used : null,
        cryptographicHashVerified: typeof body.sha256_verified === "boolean" ? body.sha256_verified : null,
        chainOfCustodyDocumented: typeof body.chain_of_custody === "boolean" ? body.chain_of_custody : null,
        ntpUtcTimelineSynchronized: typeof body.ntp_utc_synced === "boolean" ? body.ntp_utc_synced : null,
        hostWipedOrReimagedBeforeAcquisition: typeof body.wiped_before_acquisition === "boolean" ? body.wiped_before_acquisition : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "dco/insider-threat") {
    return jsonRes(
      evaluateInsiderThreatProgram({
        insiderThreatHubActive: typeof body.hub_active === "boolean" ? body.hub_active : null,
        classifiedNetworkUamEnabled: typeof body.uam_enabled === "boolean" ? body.uam_enabled : null,
        anomalousExfiltrationIndicators: Array.isArray(body.indicators) ? (body.indicators as string[]) : [],
        legalAndPrivacyOversightActive: typeof body.legal_privacy_oversight === "boolean" ? body.legal_privacy_oversight : null,
        humanAdjudicationRequired: typeof body.human_adjudication_required === "boolean" ? body.human_adjudication_required : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  // Wave 2 — Step 3: DevSecOps (cATO/SSDF), K8s STIG & DoD CC SRG Cloud Inheritance
  if (subPath === "devsecops/cato-ssdf") {
    return jsonRes(
      evaluateDevSecOpsCatoAndSsdf({
        sastPassed: typeof body.sast_passed === "boolean" ? body.sast_passed : null,
        dastPassed: typeof body.dast_passed === "boolean" ? body.dast_passed : null,
        sbomGeneratedAndScanned: typeof body.sbom_scanned === "boolean" ? body.sbom_scanned : null,
        containerImagesSignedAndHardened: typeof body.images_signed === "boolean" ? body.images_signed : null,
        slsaProvenanceVerified: typeof body.slsa_verified === "boolean" ? body.slsa_verified : null,
        criticalOrKevVulnsOpenCount: typeof body.critical_kev_open === "number" ? body.critical_kev_open : null,
        continuousRuntimeMonitoringActive: typeof body.continuous_monitoring === "boolean" ? body.continuous_monitoring : null,
        activeSecOpsTeamAssigned: typeof body.active_secops_team === "boolean" ? body.active_secops_team : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "devsecops/k8s-hardening") {
    return jsonRes(
      evaluateKubernetesAndContainerHardening({
        privilegedContainersPresent: typeof body.privileged_containers === "boolean" ? body.privileged_containers : null,
        runningAsRootUid0: typeof body.root_uid0 === "boolean" ? body.root_uid0 : null,
        hostNetworkOrPidShared: typeof body.host_network_pid === "boolean" ? body.host_network_pid : null,
        etcdEncryptedAtRest: typeof body.etcd_encrypted === "boolean" ? body.etcd_encrypted : null,
        networkPoliciesEnforced: typeof body.network_policies === "boolean" ? body.network_policies : null,
        rbacLeastPrivilegeEnforced: typeof body.rbac_least_privilege === "boolean" ? body.rbac_least_privilege : null,
        unsignedContainerImagesBlocked: typeof body.unsigned_blocked === "boolean" ? body.unsigned_blocked : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "cloud/cc-srg-inheritance") {
    return jsonRes(
      evaluateDodCloudSrgInheritance({
        impactLevel: (body.impact_level as "IL2" | "IL4" | "IL5" | "IL6") || null,
        cspProvisionalAuthActive: typeof body.csp_pa_active === "boolean" ? body.csp_pa_active : null,
        missionOwnerWorkloadAtoIssued: typeof body.mission_owner_ato === "boolean" ? body.mission_owner_ato : null,
        sccaComponentsEnforced: typeof body.scca_enforced === "boolean" ? body.scca_enforced : null,
        usPersonsAndConusVerified: typeof body.us_persons_conus === "boolean" ? body.us_persons_conus : null,
        fedrampHighClaimedSufficientForIl5OrIl6: typeof body.fedramp_claimed_sufficient === "boolean" ? body.fedramp_claimed_sufficient : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  // Wave 2 — Step 4: Defense AI Governance & Adversarial Red Team
  if (subPath === "ai/rai-governance") {
    const sc = (v: unknown): 1 | 2 | 3 | 4 | null => (typeof v === "number" ? (v >= 4 ? 4 : v >= 3 ? 3 : v >= 2 ? 2 : 1) : null);
    return jsonRes(
      evaluateDefenseAiGovernanceAndRai({
        governScore: sc(body.govern_score),
        mapScore: sc(body.map_score),
        measureScore: sc(body.measure_score),
        manageScore: sc(body.manage_score),
        isLethalOrWeaponSystem: typeof body.is_lethal_weapon === "boolean" ? body.is_lethal_weapon : null,
        appropriateHumanJudgmentEnforced: typeof body.human_judgment_enforced === "boolean" ? body.human_judgment_enforced : null,
        seniorReviewCompleted: typeof body.senior_review_completed === "boolean" ? body.senior_review_completed : null,
        traceableAuditLoggingActive: typeof body.audit_logging === "boolean" ? body.audit_logging : null,
        biasAndReliabilityEvaluated: typeof body.bias_reliability_evaluated === "boolean" ? body.bias_reliability_evaluated : null,
        killSwitchAndDeactivationVerified: typeof body.kill_switch_verified === "boolean" ? body.kill_switch_verified : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "ai/red-team") {
    return jsonRes(
      evaluateAiAdversarialRedTeam({
        promptInjectionDefensesTested: typeof body.prompt_injection_tested === "boolean" ? body.prompt_injection_tested : null,
        indirectToolInjectionBlocked: typeof body.indirect_tool_blocked === "boolean" ? body.indirect_tool_blocked : null,
        classificationBoundaryLeakageBlocked: typeof body.boundary_leak_blocked === "boolean" ? body.boundary_leak_blocked : null,
        modelSupplyChainAndWeightsSigned: typeof body.weights_signed === "boolean" ? body.weights_signed : null,
        agentAutonomousApprovalBlocked: typeof body.agent_approval_blocked === "boolean" ? body.agent_approval_blocked : null,
        hallucinationGroundingVerifierActive: typeof body.grounding_verifier === "boolean" ? body.grounding_verifier : null,
        adversarialRedTeamPassRatePercent: typeof body.pass_rate_percent === "number" ? body.pass_rate_percent : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  // Wave 3: Analytic Tradecraft (ICD 203 / 206 / ACH / NATO 6x6) & Synthetic Multi-INT Fusion
  if (subPath === "intel/icd203-ach") {
    return jsonRes(
      evaluateIcd203AndAchAnalysis({
        hypotheses: Array.isArray(body.hypotheses) ? (body.hypotheses as { id: string; label: string }[]) : undefined,
        evidence: Array.isArray(body.evidence)
          ? (body.evidence as { id: string; description: string; admiraltyCode: string; ratingsByHypothesis: Record<string, AchRating> }[])
          : undefined,
        admiraltyCodes: Array.isArray(body.admiralty_codes) ? (body.admiralty_codes as string[]) : undefined,
        sourceCount: typeof body.source_count === "number" ? body.source_count : null,
        claimedConfidence: (body.claimed_confidence as AnalyticConfidence) || null,
        alternativesConsidered: typeof body.alternatives_considered === "boolean" ? body.alternatives_considered : null,
        keyAssumptionsExplicit: typeof body.key_assumptions_explicit === "boolean" ? body.key_assumptions_explicit : null,
        sourcesDocumentedPerIcd206: typeof body.sources_documented === "boolean" ? body.sources_documented : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "intel/multi-int-fusion") {
    return jsonRes(
      evaluateMultiIntSyntheticFusion({
        summaryText: typeof body.summary_text === "string" ? body.summary_text : null,
        disciplinesPresent: Array.isArray(body.disciplines)
          ? (body.disciplines as ("OSINT" | "GEOINT" | "SIGINT" | "MASINT" | "CI")[])
          : undefined,
        osintProvenanceVerified: typeof body.osint_provenance_verified === "boolean" ? body.osint_provenance_verified : null,
        geointCoordinatesA: (body.coords_a as { lat: number; lon: number }) || null,
        geointCoordinatesB: (body.coords_b as { lat: number; lon: number }) || null,
        geospatialToleranceKm: typeof body.tolerance_km === "number" ? body.tolerance_km : undefined,
        sigintFrequencyMhz: typeof body.sigint_freq_mhz === "number" ? body.sigint_freq_mhz : null,
        ciDeceptionIndicatorsPresent: typeof body.ci_deception === "boolean" ? body.ci_deception : null,
        claimsMultiIntVerifiedGroundTruth: typeof body.claims_ground_truth === "boolean" ? body.claims_ground_truth : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  // Wave 4: Mission Assurance DAG, CMMC/DFARS/FOCI & Space/Spectrum/MBSE
  if (subPath === "mission/assurance-dag") {
    return jsonRes(
      evaluateMissionAssuranceDag({
        mefs: Array.isArray(body.mefs) ? (body.mefs as { id: string; name: string; critical: boolean }[]) : undefined,
        assets: Array.isArray(body.assets)
          ? (body.assets as { id: string; name: string; redundant: boolean; backupAssetId?: string | null; operationalStatus?: "UP" | "DEGRADED" | "DOWN" }[])
          : undefined,
        dependencies: Array.isArray(body.dependencies) ? (body.dependencies as { fromId: string; toId: string }[]) : undefined,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "acquisition/cmmc-foci") {
    return jsonRes(
      evaluateAcquisitionCmmcAndFoci({
        cmmcLevel: (body.cmmc_level as "LEVEL_1" | "LEVEL_2_SELF" | "LEVEL_2_C3PAO" | "LEVEL_3_DIBCAC") || null,
        nist800171PercentMet: typeof body.nist_800_171_percent === "number" ? body.nist_800_171_percent : null,
        poamCloseoutDays: typeof body.poam_closeout_days === "number" ? body.poam_closeout_days : null,
        fivePointControlsMissing: typeof body.five_point_missing === "boolean" ? body.five_point_missing : null,
        dfars7012CloudFedrampModEquiv: typeof body.dfars_cloud_fedramp_mod === "boolean" ? body.dfars_cloud_fedramp_mod : null,
        dfars7012IncidentReportedHours: typeof body.dfars_incident_hours === "number" ? body.dfars_incident_hours : null,
        sprsSubmitted: typeof body.sprs_submitted === "boolean" ? body.sprs_submitted : null,
        hasForeignOwnershipOrControl: typeof body.has_foci === "boolean" ? body.has_foci : null,
        fociMitigationInstrument:
          (body.foci_instrument as "NONE" | "BOARD_RESOLUTION" | "SCA" | "SSA" | "PROXY_AGREEMENT" | "VOTING_TRUST") || null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "space/mbse-spectrum") {
    return jsonRes(
      evaluateDigitalEngineeringSpaceSpectrum({
        ttcCommandLinkEncryptedAndAuthenticated: typeof body.ttc_encrypted === "boolean" ? body.ttc_encrypted : null,
        antiJamAndAntiSpoofVerified: typeof body.anti_jam_verified === "boolean" ? body.anti_jam_verified : null,
        groundSegmentSegmented: typeof body.ground_segmented === "boolean" ? body.ground_segmented : null,
        flightSoftwareCryptographicallySigned: typeof body.flight_sw_signed === "boolean" ? body.flight_sw_signed : null,
        spectrumCertificationObtained: typeof body.spectrum_cert === "boolean" ? body.spectrum_cert : null,
        mbseAuthoritativeSourceOfTruthActive: typeof body.mbse_asot === "boolean" ? body.mbse_asot : null,
        mtbfHours: typeof body.mtbf_hours === "number" ? body.mtbf_hours : null,
        mttrHours: typeof body.mttr_hours === "number" ? body.mttr_hours : null,
        targetAo: typeof body.target_ao === "number" ? body.target_ao : null,
        assessmentMode: body.assessment_mode === "FORMAL_EVIDENCE_AUDIT" ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION",
        evidenceVerified: body.evidence_verified === true,
      }),
    );
  }

  if (subPath === "export/emass-xlsx") {
    const exp = exportEmassXlsxWorkbook({
      systemName: typeof body.system_name === "string" ? body.system_name : undefined,
      emassSystemId: typeof body.emass_system_id === "string" ? body.emass_system_id : undefined,
      impactLevel: body.impact_level as "IL2" | "IL4" | "IL5" | "IL6" | undefined,
      jurisdiction: body.jurisdiction === "IC" ? "IC" : "DOD",
      controls: Array.isArray(body.controls) ? (body.controls as EmassControlExportRow[]) : undefined,
      poams: Array.isArray(body.poams) ? (body.poams as EmassPoamExportRow[]) : undefined,
    });
    if (url.searchParams.get("format") === "json" || body.format === "json") {
      return jsonRes({
        filename: exp.filename,
        mimeType: exp.mimeType,
        base64: exp.base64,
        sha256: exp.sha256,
        sheetNames: exp.sheetNames,
        rowCounts: exp.rowCounts,
        aiCanIssueAto: exp.aiCanIssueAto,
      });
    }
    return new Response(new Uint8Array(exp.buffer), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "content-type": exp.mimeType,
        "content-disposition": `attachment; filename="${exp.filename}"`,
        "x-noctis-sha256": exp.sha256,
      },
    });
  }

  if (subPath === "export/binder") {
    const binder = generateComplianceBinderMarkdown({
      systemName: typeof body.system_name === "string" ? body.system_name : undefined,
      emassSystemId: typeof body.emass_system_id === "string" ? body.emass_system_id : undefined,
      impactLevel: body.impact_level as "IL2" | "IL4" | "IL5" | "IL6" | undefined,
      jurisdiction: body.jurisdiction === "IC" ? "IC" : "DOD",
      controls: Array.isArray(body.controls) ? (body.controls as EmassControlExportRow[]) : undefined,
      poams: Array.isArray(body.poams) ? (body.poams as EmassPoamExportRow[]) : undefined,
    });
    return jsonRes(binder);
  }

  if (subPath === "dco/sigma-navigator") {
    const sigma = typeof body.sigma_yaml === "string" && body.sigma_yaml.trim() ? parseSigmaYamlRule(body.sigma_yaml) : null;
    const yara = typeof body.yara_rule === "string" && body.yara_rule.trim() ? parseYaraRule(body.yara_rule) : null;
    const explicitTechs = Array.isArray(body.techniques) ? (body.techniques as NavigatorTechniqueInput[]) : [];
    const mergedTechs: NavigatorTechniqueInput[] = [...explicitTechs];
    for (const tid of [...(sigma?.attackTechniques ?? []), ...(yara?.attackTechniques ?? [])]) {
      if (!mergedTechs.some((t) => t.techniqueId.toUpperCase() === tid.toUpperCase())) {
        mergedTechs.push({
          techniqueId: tid,
          coverageStatus: sigma?.valid || yara?.valid ? "DETECTED" : "PARTIAL",
          comment: `Parsed from ${sigma?.title || yara?.ruleName || "DCO rule"}`,
        });
      }
    }
    const navigator = buildAttackNavigatorLayer({
      name: typeof body.layer_name === "string" ? body.layer_name : undefined,
      techniques: mergedTechs,
    });
    return jsonRes({ sigma, yara, navigator });
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
