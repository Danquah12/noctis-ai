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
import type { ZtPillarScore } from "../rmf-v2/cyber-intelligence.ts";

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
      version: "1.2.0",
      engines: [
        "DOD-RMF-DODI-8510.01",
        "CNSSI-1253-CATEGORIZATION",
        "IC-SECURITY-ICD-503-502-501",
        "CLASSIFICATION-AWARE-GATEWAY",
        "CROSS-DOMAIN-DODI-8540.01",
        "DISA-STIG-CCI-CROSSWALK",
        "ACAS-NESSUS-PARSER-DODI-8531.01",
        "SCAP-XCCDF-CKL-ENGINE",
        "CYBER-INCIDENT-DODI-8530.03",
        "DOD-ZERO-TRUST-7-PILLAR-FY2027",
        "CISA-ZTMM-V2-CROSSWALK",
        "DOD-ICAM-PKI-DODI-8520.02-03",
        "DOD-PAM-ABAC-MICROSEGMENTATION",
      ],
      policiesCount: Object.keys(DOD_IC_POLICY_REGISTRY).length,
      disaCci: getDisaCciManifest(),
      zeroTrustCatalog: getDodZeroTrustCatalog().summary,
      invariants: {
        dodAtoAutomaticallySatisfiesIcIcd503: false,
        clearanceAuthorizesCommercialCloudClassified: false,
        scannerOutputEqualsValidatedRemediation: false,
        ocspFailOpenCompliantWithDodi8520: false,
        smsOtpSatisfiesPhishingResistantMfa: false,
        aiCanIssueAto: false,
      },
    });
  }

  if (method === "GET" && subPath === "zero-trust/pillars") {
    return jsonRes(getDodZeroTrustCatalog());
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
