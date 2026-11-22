/**
 * Noctis RMF v2.0 — Assessment Artifacts, cATO, Crosswalk, Golden Simulator & Feedback Learning
 *
 * Implements:
 *   RMF-005 OSCAL SAP / SAR Generation (SP 800-53A Examine / Interview / Test)
 *   RMF-008 Continuous ATO (cATO) Condition Monitoring & Drift Triggers
 *   RMF-010 Multi-Framework Crosswalk (800-53 -> FedRAMP, 800-171/CMMC, CSF 2.0, ATT&CK, ISO 27001, CIS v8)
 *   AI-021  10-Case Deterministic RMF Golden Simulator
 *   AI-022  Human-Approved Assessor Feedback -> Curated SFT / DPO Training Candidate Exporter
 */

import rmfDbJson from "../../data/rmf-deterministic-db.json" with { type: "json" };
import { sha256Sync } from "../universal-crypto.ts";
import {
  evaluateAc2AccountManagementRule,
  evaluateAu6AuditReviewRule,
  evaluateDodImpactLevelOverlay,
  evaluateCmmcSprsScore,
} from "../noctis-rmf-rules.ts";
import { verifyEvidenceRecord } from "./evidence.ts";
import { evaluateConfigurationCompliance, evaluateZeroTrustMaturity } from "./cyber-intelligence.ts";

interface MinimalDbControl {
  id: string;
  family: string;
  familyTitle: string;
  title: string;
  withdrawn: boolean;
  withdrawnInto: string[];
  baselines: string[];
  objectives: string[];
  methods: { examine: string; interview: string; test: string };
  fedrampOdp?: { low: string; moderate: string; high: string; sla: string };
}

interface MinimalDbShape {
  manifest: { nistVersion: string; dbSha256: string };
  controls: Record<string, MinimalDbControl>;
  cui800171: Record<string, { id: string; shortId: string; title: string }>;
  csf2: Record<string, { id: string; level: string; title: string }>;
  attackByControl: Record<string, { id: string; name: string }[]>;
}

const DB = rmfDbJson as unknown as MinimalDbShape;

function normalizeControl(raw: string): string {
  const s = (raw || "").trim().replace(/\s+/g, "");
  const m = s.match(/^([a-z]{2})-?0*(\d{1,2})(?:\(0*(\d{1,2})\))?$/i);
  if (!m) return s.toUpperCase();
  return `${m[1]!.toUpperCase()}-${Number(m[2])}${m[3] ? `(${Number(m[3])})` : ""}`;
}

// ----------------------------------------------------------------------------
// RMF-005: OSCAL Security Assessment Plan (SAP) & Report (SAR)
// ----------------------------------------------------------------------------
export function generateOscalSap(input: {
  systemId: string;
  systemName: string;
  tenantId: string;
  assessorOrg?: string;
  controlIds: string[];
}) {
  const controlIds = (input.controlIds.length ? input.controlIds : ["AC-2", "AU-6", "CM-6", "IA-2", "RA-5"]).map(normalizeControl);
  const generatedAt = new Date().toISOString();

  const activities = controlIds.map((cid) => {
    const rec = DB.controls[cid];
    return {
      controlId: cid,
      title: rec?.title || cid,
      withdrawn: rec?.withdrawn ?? false,
      objectivesCount: rec?.objectives?.length ?? 0,
      objectives: rec?.objectives?.slice(0, 6) || [`${cid}[01] verify implementation and evidence`],
      assessmentMethods: {
        examine: rec?.methods?.examine || "System security plan, policies, and exported config baselines",
        interview: rec?.methods?.interview || "ISSO, system owners, and security operations personnel",
        test: rec?.methods?.test || "Automated verification against production telemetry and negative controls",
      },
      fedrampOdp: rec?.fedrampOdp?.high || null,
    };
  });

  const oscalAssessmentPlan = {
    "assessment-plan": {
      uuid: `sap-${sha256Sync(`${input.tenantId}:${input.systemId}:${generatedAt}`).slice(0, 12)}`,
      metadata: {
        title: `${input.systemName} Security Assessment Plan (SAP)`,
        "last-modified": generatedAt,
        version: "2.0.0",
        "oscal-version": "1.1.2",
        props: [
          { name: "nist-version", value: DB.manifest.nistVersion },
          { name: "source-db-sha256", value: DB.manifest.dbSha256 },
          { name: "tenant-id", value: input.tenantId },
        ],
      },
      "assessment-subject": {
        systemId: input.systemId,
        assessorOrg: input.assessorOrg || "Independent 3PAO / SCA Assessment Team",
      },
      "reviewed-controls": activities,
    },
  };

  return {
    artifactType: "SAP" as const,
    systemId: input.systemId,
    controlsPlanned: activities.length,
    oscalAssessmentPlan,
    artifactSha256: sha256Sync(JSON.stringify(oscalAssessmentPlan)),
  };
}

export interface SarObservationInput {
  controlId: string;
  objectiveId: string;
  verdict: "SATISFIED" | "OTHER_THAN_SATISFIED";
  severity?: "CAT_I" | "CAT_II" | "CAT_III";
  observation: string;
  evidenceSha256?: string;
}

export function generateOscalSar(input: {
  systemId: string;
  systemName: string;
  tenantId: string;
  assessorName?: string;
  observations: SarObservationInput[];
}) {
  const generatedAt = new Date().toISOString();
  const obs = Array.isArray(input.observations) ? input.observations : [];
  const findings = obs.filter((o) => o.verdict === "OTHER_THAN_SATISFIED");
  const cat1Count = findings.filter((f) => f.severity === "CAT_I").length;
  const cat2Count = findings.filter((f) => f.severity === "CAT_II").length;
  const cat3Count = findings.filter((f) => f.severity === "CAT_III").length;
  const satisfiedCount = obs.filter((o) => o.verdict === "SATISFIED").length;
  const hasMissingHashes = obs.some((o) => !o.evidenceSha256);

  const oscalAssessmentResults = {
    "assessment-results": {
      uuid: `sar-${sha256Sync(`${input.tenantId}:${input.systemId}:${generatedAt}`).slice(0, 12)}`,
      metadata: {
        title: `${input.systemName} Security Assessment Report (SAR)`,
        "last-modified": generatedAt,
        version: "2.0.0",
        "oscal-version": "1.1.2",
        props: [
          { name: "nist-version", value: DB.manifest.nistVersion },
          { name: "source-db-sha256", value: DB.manifest.dbSha256 },
          { name: "assessor-name", value: input.assessorName || "Independent Assessor" },
        ],
      },
      summary: {
        totalObjectivesAssessed: obs.length,
        satisfiedObjectives: satisfiedCount,
        openFindings: findings.length,
        cat1Count,
        cat2Count,
        cat3Count,
        unhashedObservationsWarning: hasMissingHashes,
        aoRecommendation: cat1Count > 0 ? "DENY_OR_REQUIRE_CAT_I_REMEDIATION" : findings.length > 0 ? "CONDITIONAL_PENDING_POAM" : "READY_FOR_AO_REVIEW",
        authorizationDecision: "PENDING_AO_SIGNATURE",
        aiCanGrantAto: false,
      },
      observations: obs,
      findings,
    },
  };

  return {
    artifactType: "SAR" as const,
    systemId: input.systemId,
    summary: oscalAssessmentResults["assessment-results"].summary,
    oscalAssessmentResults,
    artifactSha256: sha256Sync(JSON.stringify(oscalAssessmentResults)),
  };
}

// ----------------------------------------------------------------------------
// RMF-008: Continuous ATO (cATO) Condition Monitor
// ----------------------------------------------------------------------------
export function evaluateContinuousAtoStatus(input: {
  systemId: string;
  vulnScanAgeDays: number;
  overdueKevCount: number;
  overdueHighPoamCount: number;
  stigCompliancePercent: number;
  siemTelemetryActive: boolean;
  significantBoundaryChangePending: boolean;
}) {
  const triggers: string[] = [];
  if (input.vulnScanAgeDays > 30) triggers.push(`Continuous vulnerability scan stale (${input.vulnScanAgeDays}d > 30d FedRAMP/cATO limit).`);
  if (input.overdueKevCount > 0) triggers.push(`${input.overdueKevCount} CISA KEV finding(s) overdue beyond BOD 22-01 SLA.`);
  if (input.overdueHighPoamCount > 0) triggers.push(`${input.overdueHighPoamCount} High POA&M item(s) past 30-day statutory SLA.`);
  if (input.stigCompliancePercent < 90) triggers.push(`Configuration baseline compliance ${input.stigCompliancePercent}% dropped below 90% cATO floor.`);
  if (!input.siemTelemetryActive) triggers.push("CSSP / SIEM continuous telemetry stream inactive.");
  if (input.significantBoundaryChangePending) triggers.push("Significant system/architecture boundary change requires AO review & delta assessment.");

  const criticalTrigger = input.overdueKevCount > 0 || !input.siemTelemetryActive || input.significantBoundaryChangePending || input.stigCompliancePercent < 85;
  const status: "IN_COMPLIANCE" | "DRIFT_WARNING" | "REASSESSMENT_REQUIRED" =
    triggers.length === 0 ? "IN_COMPLIANCE" : criticalTrigger ? "REASSESSMENT_REQUIRED" : "DRIFT_WARNING";

  const out = {
    systemId: input.systemId,
    status,
    triggers,
    pillarsChecked: ["DevSecOps Pipeline", "Active Continuous Monitoring", "CSSP / SLA Adherence"],
    aoActionRequired: status !== "IN_COMPLIANCE",
    aiCanGrantOrRevokeAto: false,
    evaluatedAt: new Date().toISOString(),
  };
  return { ...out, auditHash: sha256Sync(JSON.stringify(out)) };
}

// ----------------------------------------------------------------------------
// RMF-010: Versioned Multi-Framework Crosswalk
// ----------------------------------------------------------------------------
const FAMILY_ISO_CIS_MAP: Record<string, { iso27001: string[]; cisV8: string[]; csfFunctions: string[] }> = {
  AC: { iso27001: ["A.5.15", "A.5.16", "A.5.18", "A.8.2"], cisV8: ["CIS 5", "CIS 6"], csfFunctions: ["PR.AA", "PR.PS"] },
  AT: { iso27001: ["A.6.3"], cisV8: ["CIS 14"], csfFunctions: ["PR.AT"] },
  AU: { iso27001: ["A.8.15", "A.8.17"], cisV8: ["CIS 8"], csfFunctions: ["DE.CM", "DE.AE", "RS.AN"] },
  CA: { iso27001: ["A.5.35", "A.5.36"], cisV8: ["CIS 18"], csfFunctions: ["GV.OV", "ID.IM"] },
  CM: { iso27001: ["A.8.9", "A.8.19"], cisV8: ["CIS 1", "CIS 2", "CIS 4"], csfFunctions: ["ID.AM", "PR.PS"] },
  CP: { iso27001: ["A.5.29", "A.5.30", "A.8.13"], cisV8: ["CIS 11"], csfFunctions: ["PR.IR", "RC.RP"] },
  IA: { iso27001: ["A.5.17", "A.8.5"], cisV8: ["CIS 5", "CIS 6"], csfFunctions: ["PR.AA"] },
  IR: { iso27001: ["A.5.24", "A.5.26", "A.5.28"], cisV8: ["CIS 17"], csfFunctions: ["RS.MA", "RS.AN", "RS.MI"] },
  MA: { iso27001: ["A.7.13", "A.8.32"], cisV8: ["CIS 4"], csfFunctions: ["PR.PS"] },
  MP: { iso27001: ["A.7.10", "A.7.14"], cisV8: ["CIS 3"], csfFunctions: ["PR.DS"] },
  PE: { iso27001: ["A.7.1", "A.7.2", "A.7.4"], cisV8: ["CIS 1"], csfFunctions: ["PR.AA"] },
  PL: { iso27001: ["A.5.1", "A.5.8"], cisV8: ["CIS 1", "CIS 17"], csfFunctions: ["GV.RM", "GV.OC"] },
  PM: { iso27001: ["A.5.1", "A.5.3", "A.5.5"], cisV8: ["CIS 1", "CIS 18"], csfFunctions: ["GV.OC", "GV.RM", "GV.RR"] },
  PS: { iso27001: ["A.6.1", "A.6.5"], cisV8: ["CIS 5", "CIS 14"], csfFunctions: ["GV.RR", "PR.AA"] },
  PT: { iso27001: ["A.5.34"], cisV8: ["CIS 3"], csfFunctions: ["GV.OC", "PR.DS"] },
  RA: { iso27001: ["A.5.7", "A.8.8"], cisV8: ["CIS 7", "CIS 18"], csfFunctions: ["ID.RA", "DE.CM"] },
  SA: { iso27001: ["A.5.8", "A.8.25", "A.8.29"], cisV8: ["CIS 16"], csfFunctions: ["GV.SC", "ID.RA"] },
  SC: { iso27001: ["A.8.20", "A.8.22", "A.8.24"], cisV8: ["CIS 12", "CIS 13"], csfFunctions: ["PR.DS", "PR.IR"] },
  SI: { iso27001: ["A.8.7", "A.8.8", "A.8.16"], cisV8: ["CIS 7", "CIS 10", "CIS 13"], csfFunctions: ["DE.CM", "RS.MI"] },
  SR: { iso27001: ["A.5.19", "A.5.21", "A.5.22"], cisV8: ["CIS 15", "CIS 16"], csfFunctions: ["GV.SC"] },
};

export function resolveFrameworkCrosswalk(controlIdInput: string) {
  const cid = normalizeControl(controlIdInput);
  const ctrl = DB.controls[cid];
  const fam = ctrl?.family || cid.slice(0, 2);
  const familyCross = FAMILY_ISO_CIS_MAP[fam] || FAMILY_ISO_CIS_MAP.AC!;
  const attackTechniques = DB.attackByControl[cid] || [];

  const titleWords = (ctrl?.title || cid).toLowerCase().split(/\W+/).filter((w) => w.length >= 5);
  const matched171 = Object.values(DB.cui800171)
    .filter((r) => titleWords.some((w) => r.title.toLowerCase().includes(w)))
    .slice(0, 6)
    .map((r) => ({ id: r.id, shortId: r.shortId, title: r.title }));

  const matchedCsf = Object.values(DB.csf2)
    .filter((c) => familyCross.csfFunctions.some((prefix) => c.id.startsWith(prefix)))
    .slice(0, 8)
    .map((c) => ({ id: c.id, title: c.title }));

  return {
    controlId: cid,
    title: ctrl?.title || "Unknown Control",
    withdrawn: ctrl?.withdrawn ?? false,
    withdrawnInto: ctrl?.withdrawnInto ?? [],
    nist80053Version: DB.manifest.nistVersion,
    fedrampBaselines: ctrl?.baselines ?? [],
    fedrampHighOdp: ctrl?.fedrampOdp?.high ?? null,
    nist800171Rev3Matches: matched171,
    nistCsf2Aligned: matchedCsf,
    mitreAttackV16_1: attackTechniques.slice(0, 12),
    iso27001_2022: familyCross.iso27001,
    cisControlsV8: familyCross.cisV8,
    crosswalkSha256: sha256Sync(`${cid}:${DB.manifest.dbSha256}`),
  };
}

// ----------------------------------------------------------------------------
// AI-021: 10-Case Deterministic RMF Golden Simulator
// ----------------------------------------------------------------------------
export function runDeterministicRmfSimulation() {
  const cases: { id: string; name: string; expected: string; actual: string; passed: boolean }[] = [];

  const c1 = evaluateAc2AccountManagementRule({ policyThresholdHours: 24, elapsedHours: 31 });
  cases.push({ id: "SIM-01", name: "AC-2 31h termination vs 24h FedRAMP limit", expected: "FAIL", actual: c1.verdict, passed: c1.verdict === "FAIL" });

  const c2 = evaluateAc2AccountManagementRule({ policyThresholdHours: 24, elapsedHours: 4 });
  cases.push({ id: "SIM-02", name: "AC-2 4h termination vs 24h FedRAMP limit", expected: "PASS", actual: c2.verdict, passed: c2.verdict === "PASS" });

  const c3 = evaluateAu6AuditReviewRule({ reviewIntervalDays: 14 });
  cases.push({ id: "SIM-03", name: "AU-6 14-day review vs 7-day FedRAMP High ODP", expected: "FAIL", actual: c3.verdict, passed: c3.verdict === "FAIL" });

  const c4 = evaluateAu6AuditReviewRule({});
  cases.push({ id: "SIM-04", name: "AU-6 missing evidence interval triggers INSUFFICIENT_EVIDENCE", expected: "INSUFFICIENT_EVIDENCE", actual: c4.verdict, passed: c4.verdict === "INSUFFICIENT_EVIDENCE" });

  const evBad = verifyEvidenceRecord({
    evidenceId: "EV-SIM",
    tenantId: "sim",
    controlId: "CM-6",
    origin: "sim",
    collectedAt: new Date().toISOString(),
    claimedSha256: "0".repeat(64),
    payload: { real: true },
  });
  cases.push({ id: "SIM-05", name: "CYB-014 SHA-256 tamper triggers QUARANTINED", expected: "QUARANTINED", actual: evBad.status, passed: evBad.status === "QUARANTINED" });

  const stig = evaluateConfigurationCompliance({
    checks: [
      { ruleId: "V-1", title: "Root SSH off", benchmark: "DISA_STIG", severityCategory: "CAT_I", status: "FAIL" },
      { ruleId: "V-2", title: "Banner", benchmark: "DISA_STIG", severityCategory: "CAT_III", status: "PASS" },
    ],
  });
  cases.push({ id: "SIM-06", name: "CYB-013 DISA STIG CAT I open triggers ATO veto", expected: "atoVetoTriggered=true", actual: `atoVetoTriggered=${stig.atoVetoTriggered}`, passed: stig.atoVetoTriggered });

  const ac13 = DB.controls["AC-13"];
  const ac13Ok = Boolean(ac13?.withdrawn && ac13.withdrawnInto.includes("AC-2") && ac13.withdrawnInto.includes("AU-6"));
  cases.push({ id: "SIM-07", name: "Withdrawn AC-13 maps cleanly to AC-2 & AU-6", expected: "AC-2, AU-6", actual: ac13?.withdrawnInto.join(", ") || "missing", passed: ac13Ok });

  const il5 = evaluateDodImpactLevelOverlay({ impactLevel: "IL5", hostingEnvironment: "Commercial", sccaCompliant: false, usCitizenAdminsOnly: true });
  cases.push({ id: "SIM-08", name: "DoD IL5 blocks commercial non-SCCA hosting", expected: "FAIL", actual: il5.verdict, passed: il5.verdict === "FAIL" && il5.violations.length >= 2 });

  const sprs = evaluateCmmcSprsScore({ failedControls: [{ controlId: "3.5.3", weight: 5, onPoam: true }] });
  cases.push({ id: "SIM-09", name: "CMMC SPRS rejects 5-pt MFA control on POA&M (score 105)", expected: "eligible=false,score=105", actual: `eligible=${sprs.conditionalCertificationEligible},score=${sprs.sprsScore}`, passed: !sprs.conditionalCertificationEligible && sprs.sprsScore === 105 });

  const zt = evaluateZeroTrustMaturity({ identityScore: 4, devicesScore: 3, networksScore: 2, applicationsScore: 3, dataScore: 3 });
  cases.push({ id: "SIM-10", name: "CYB-018 Zero Trust flags Networks as weakest pillar", expected: "Networks", actual: zt.weakestPillar, passed: zt.weakestPillar === "Networks" });

  const passedCount = cases.filter((c) => c.passed).length;
  const suiteSha256 = sha256Sync(JSON.stringify(cases));
  return {
    executedAt: new Date().toISOString(),
    dbSha256: DB.manifest.dbSha256,
    totalCases: cases.length,
    passedCount,
    failedCount: cases.length - passedCount,
    allPassed: passedCount === cases.length,
    suiteSha256,
    cases,
  };
}

// ----------------------------------------------------------------------------
// AI-022: Curated Assessor Feedback -> SFT / DPO Training Candidates
// ----------------------------------------------------------------------------
export interface ExpertFeedbackCandidate {
  feedbackId: string;
  tenantId: string;
  controlId: string;
  prompt: string;
  preferredResponse: string;
  rejectedResponse?: string;
  rationale: string;
  submittedBy: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  recordSha256: string;
}

export function createExpertFeedbackRecord(input: {
  tenantId: string;
  controlId: string;
  prompt: string;
  preferredResponse: string;
  rejectedResponse?: string;
  rationale: string;
  submittedBy: string;
}): ExpertFeedbackCandidate {
  const createdAt = new Date().toISOString();
  const base: Omit<ExpertFeedbackCandidate, "recordSha256"> = {
    feedbackId: `FB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    tenantId: input.tenantId,
    controlId: normalizeControl(input.controlId),
    prompt: input.prompt.trim(),
    preferredResponse: input.preferredResponse.trim(),
    ...(input.rejectedResponse?.trim() ? { rejectedResponse: input.rejectedResponse.trim() } : {}),
    rationale: input.rationale.trim(),
    submittedBy: input.submittedBy || "assessor",
    // Mandatory safety invariant: newly submitted feedback is ALWAYS unapproved until human sign-off
    status: "PENDING_REVIEW",
    approvedBy: null,
    approvedAt: null,
    createdAt,
  };
  return { ...base, recordSha256: sha256Sync(JSON.stringify(base)) };
}

export function approveExpertFeedbackRecord(
  record: ExpertFeedbackCandidate,
  reviewerId: string,
  decision: "APPROVED" | "REJECTED" = "APPROVED",
): ExpertFeedbackCandidate {
  const reviewer = reviewerId.trim();
  if (!reviewer) {
    return record;
  }
  const updated = {
    ...record,
    status: decision,
    approvedBy: reviewer,
    approvedAt: new Date().toISOString(),
  };
  return { ...updated, recordSha256: sha256Sync(JSON.stringify({ ...updated, recordSha256: undefined })) };
}

export function exportApprovedFeedbackJsonl(
  records: ExpertFeedbackCandidate[],
  format: "sft" | "dpo",
): { count: number; excludedUnapprovedCount: number; jsonl: string } {
  const approved = records.filter((r) => r.status === "APPROVED" && Boolean(r.approvedBy));
  const excludedUnapprovedCount = records.length - approved.length;

  if (format === "dpo") {
    const dpoRows = approved.filter((r) => Boolean(r.rejectedResponse?.trim()));
    const jsonl = dpoRows
      .map((r) =>
        JSON.stringify({
          prompt: r.prompt,
          chosen: r.preferredResponse,
          rejected: r.rejectedResponse,
          control_id: r.controlId,
          approved_by: r.approvedBy,
          record_sha256: r.recordSha256,
        }),
      )
      .join("\n");
    return { count: dpoRows.length, excludedUnapprovedCount, jsonl };
  }

  const jsonl = approved
    .map((r) =>
      JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are Noctis RMF Intelligence grounded strictly in NIST SP 800-53 Rev. 5.2.0 and deterministic compliance rules.",
          },
          { role: "user", content: r.prompt },
          { role: "assistant", content: r.preferredResponse },
        ],
        control_id: r.controlId,
        approved_by: r.approvedBy,
        record_sha256: r.recordSha256,
      }),
    )
    .join("\n");
  return { count: approved.length, excludedUnapprovedCount, jsonl };
}
