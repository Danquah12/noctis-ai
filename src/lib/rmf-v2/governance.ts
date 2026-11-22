/**
 * Noctis RMF v2.0 — Governance & Authorization Subsystem (noctis-rmf-governance)
 *
 * Implements RMF-002 (Automated OSCAL SSP), RMF-003 (Control Inheritance),
 * RMF-004 (Baseline Tailoring Approval Gate), RMF-006 (POA&M Closure Proof Gate),
 * RMF-007 (ATO Readiness Without AI Risk Acceptance), and AI-023 (Policy Impact Diff).
 */

import rmfDbJson from "../../data/rmf-deterministic-db.json" with { type: "json" };
import { sha256Sync } from "../universal-crypto.ts";
import type { EvidenceVerificationResult } from "./evidence.ts";
import type { RmfV2ErrorCode } from "./registry.ts";

export type WorkflowState =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "EFFECTIVE"
  | "SUPERSEDED"
  | "CLOSED";

const LEGAL_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  DRAFT: ["SUBMITTED", "CLOSED"],
  SUBMITTED: ["UNDER_REVIEW", "CHANGES_REQUESTED", "CLOSED"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "CLOSED"],
  CHANGES_REQUESTED: ["SUBMITTED", "DRAFT", "CLOSED"],
  APPROVED: ["EFFECTIVE", "CHANGES_REQUESTED", "SUPERSEDED"],
  EFFECTIVE: ["SUPERSEDED", "CLOSED"],
  SUPERSEDED: ["CLOSED"],
  CLOSED: [],
};

interface DbShape {
  manifest: { nistVersion: string; dbSha256: string };
  controls: Record<
    string,
    { id: string; title: string; withdrawn: boolean; baselines: string[] }
  >;
}

const DB = rmfDbJson as unknown as DbShape;

function normalizeBaselineKey(raw: string): "LOW" | "MODERATE" | "HIGH" | "PRIVACY" {
  const s = (raw || "").toUpperCase();
  if (s.includes("LOW")) return "LOW";
  if (s.includes("MOD")) return "MODERATE";
  if (s.includes("PRIV")) return "PRIVACY";
  return "HIGH";
}

function normalizeControlKey(raw: string): string {
  const s = (raw || "").trim().replace(/\s+/g, "");
  const m = s.match(/^([a-z]{2})-?0*(\d{1,2})(?:\(0*(\d{1,2})\))?$/i);
  if (!m) return s.toUpperCase();
  return `${m[1]!.toUpperCase()}-${Number(m[2])}${m[3] ? `(${Number(m[3])})` : ""}`;
}

export function getBaselineControlIds(baseline: "LOW" | "MODERATE" | "HIGH" | "PRIVACY"): string[] {
  return Object.values(DB.controls)
    .filter((c) => !c.withdrawn && Array.isArray(c.baselines) && c.baselines.includes(baseline))
    .map((c) => c.id);
}

// ----------------------------------------------------------------------------
// Workflow State Transition Enforcement
// ----------------------------------------------------------------------------
export function transitionWorkflowState(input: {
  currentState: WorkflowState;
  nextState: WorkflowState;
  actorSubject: string;
  actorRole: string;
  reason: string;
}): {
  transitioned: boolean;
  state: WorkflowState;
  errorCode?: RmfV2ErrorCode;
  auditEvent: {
    fromState: WorkflowState;
    toState: WorkflowState;
    actorSubject: string;
    actorRole: string;
    reason: string;
    decidedAt: string;
    eventSha256: string;
  };
} {
  const decidedAt = new Date().toISOString();
  const actorOk = Boolean(input.actorSubject?.trim() && input.actorRole?.trim() && input.reason?.trim());
  const legal = (LEGAL_TRANSITIONS[input.currentState] || []).includes(input.nextState);
  const ok = actorOk && legal;
  const eventSha256 = sha256Sync(
    JSON.stringify({
      from: input.currentState,
      to: input.nextState,
      actor: input.actorSubject,
      role: input.actorRole,
      reason: input.reason,
      decidedAt,
    }),
  );

  return {
    transitioned: ok,
    state: ok ? input.nextState : input.currentState,
    ...(ok
      ? {}
      : {
          errorCode: actorOk ? "INVALID_WORKFLOW_TRANSITION" : "HUMAN_APPROVAL_REQUIRED",
        }),
    auditEvent: {
      fromState: input.currentState,
      toState: input.nextState,
      actorSubject: input.actorSubject || "UNKNOWN",
      actorRole: input.actorRole || "UNSPECIFIED",
      reason: input.reason || "",
      decidedAt,
      eventSha256,
    },
  };
}

// ----------------------------------------------------------------------------
// RMF-003: Control Inheritance & CRM Responsibility Resolution
// ----------------------------------------------------------------------------
export interface InheritanceResolutionResult {
  systemId: string;
  baseline: string;
  providerName: string;
  totalBaselineControls: number;
  inheritedCount: number;
  hybridCount: number;
  systemSpecificCount: number;
  inheritedControls: string[];
  hybridControls: string[];
  sampleCustomerSpecificControls: string[];
  cspPaGrantsSystemAto: false;
  inheritanceHash: string;
  note: string;
}

export function resolveControlInheritance(input: {
  systemId: string;
  baseline?: string;
  providerName?: string;
  inheritedControlIds?: string[];
  hybridControlIds?: string[];
  totalControls?: number;
}): InheritanceResolutionResult {
  const bKey = normalizeBaselineKey(input.baseline || "HIGH");
  const baselineControls = getBaselineControlIds(bKey);
  const effectiveList =
    input.totalControls && input.totalControls > 0 && input.totalControls < baselineControls.length
      ? baselineControls.slice(0, input.totalControls)
      : baselineControls;

  const inheritedSet = new Set((input.inheritedControlIds || []).map(normalizeControlKey));
  const hybridSet = new Set(
    (input.hybridControlIds || []).map(normalizeControlKey).filter((id) => !inheritedSet.has(id)),
  );

  const inheritedControls = effectiveList.filter((id) => inheritedSet.has(id));
  // Preserve explicit inherited IDs even if outside subset when calculating custom totals
  for (const id of inheritedSet) {
    if (!inheritedControls.includes(id)) inheritedControls.push(id);
  }

  const hybridControls = effectiveList.filter((id) => hybridSet.has(id));
  for (const id of hybridSet) {
    if (!hybridControls.includes(id)) hybridControls.push(id);
  }

  const totalBaselineControls = input.totalControls ?? baselineControls.length;
  const systemSpecificList = effectiveList.filter((id) => !inheritedSet.has(id) && !hybridSet.has(id));
  const systemSpecificCount = Math.max(
    0,
    totalBaselineControls - inheritedControls.length - hybridControls.length,
  );

  const inheritanceHash = sha256Sync(
    JSON.stringify({
      systemId: input.systemId,
      baseline: bKey,
      provider: input.providerName || "CSP",
      inheritedControls,
      hybridControls,
      systemSpecificCount,
    }),
  );

  return {
    systemId: input.systemId,
    baseline: `NIST SP 800-53B ${bKey}`,
    providerName: input.providerName || "FedRAMP Authorized CSP",
    totalBaselineControls,
    inheritedCount: inheritedControls.length,
    hybridCount: hybridControls.length,
    systemSpecificCount,
    inheritedControls,
    hybridControls,
    sampleCustomerSpecificControls: systemSpecificList.slice(0, 12),
    cspPaGrantsSystemAto: false,
    inheritanceHash,
    note: "A CSP Provisional Authorization (PA) applies only to inherited infrastructure controls; the mission Authorizing Official must separately authorize all hybrid and system-specific controls.",
  };
}

// ----------------------------------------------------------------------------
// RMF-004: Baseline Tailoring Proposal & Mandatory Human Approval Gate
// ----------------------------------------------------------------------------
export type TailoringAction =
  | "ADD"
  | "EXCLUDE_SCOPING"
  | "OVERLAY"
  | "SET_ODP"
  | "COMPENSATING_CONTROL";

export function evaluateTailoringProposal(input: {
  proposalId: string;
  controlId: string;
  action: TailoringAction;
  rationale: string;
  sourceCitation?: string;
  status: WorkflowState;
  approvedBy?: string | null;
}): {
  proposalId: string;
  controlId: string;
  action: TailoringAction;
  applied: boolean;
  status: WorkflowState;
  approvedBy: string | null;
  errorCode?: RmfV2ErrorCode;
  message: string;
} {
  const cid = normalizeControlKey(input.controlId);
  const ctrl = DB.controls[cid];
  if (!ctrl) {
    return {
      proposalId: input.proposalId,
      controlId: cid,
      action: input.action,
      applied: false,
      status: input.status,
      approvedBy: input.approvedBy ?? null,
      errorCode: "SOURCE_VERSION_MISSING",
      message: `Control ${cid} does not exist in pinned NIST SP 800-53 Rev. ${DB.manifest.nistVersion}.`,
    };
  }

  const isApproved =
    (input.status === "APPROVED" || input.status === "EFFECTIVE") &&
    Boolean(input.approvedBy && input.approvedBy.trim().length > 0);

  if (!isApproved) {
    return {
      proposalId: input.proposalId,
      controlId: cid,
      action: input.action,
      applied: false,
      status: input.status,
      approvedBy: input.approvedBy ?? null,
      errorCode: "POLICY_NOT_APPROVED",
      message: `Tailoring proposal ${input.proposalId} for ${cid} (${input.action}) cannot be applied without formal human approval (current status: ${input.status}).`,
    };
  }

  return {
    proposalId: input.proposalId,
    controlId: cid,
    action: input.action,
    applied: true,
    status: input.status,
    approvedBy: input.approvedBy!,
    message: `Approved tailoring (${input.action}) on ${cid} recorded with rationale and human approver ${input.approvedBy}.`,
  };
}

// ----------------------------------------------------------------------------
// RMF-002: Automated OSCAL-Compatible SSP Draft Generator
// ----------------------------------------------------------------------------
export interface SspControlImplementationInput {
  controlId: string;
  narrative: string;
  responsibility: "system_specific" | "inherited" | "hybrid";
  evidenceIds?: string[];
}

export function generateOscalSspDraft(input: {
  systemId: string;
  systemName: string;
  tenantId: string;
  baseline?: string;
  implementations: SspControlImplementationInput[];
}) {
  const bKey = normalizeBaselineKey(input.baseline || "HIGH");
  const implementedRequirements = input.implementations
    .filter((impl) => Boolean(DB.controls[normalizeControlKey(impl.controlId)]))
    .map((impl) => {
      const cid = normalizeControlKey(impl.controlId);
      return {
        uuid: sha256Sync(`${input.systemId}:${cid}`).slice(0, 32),
        "control-id": cid.toLowerCase(),
        props: [
          { name: "control-label", value: cid },
          { name: "responsibility", value: impl.responsibility },
        ],
        description: impl.narrative,
        remarks: `Authoritative Ref: NIST SP 800-53 Rev. ${DB.manifest.nistVersion} — ${DB.controls[cid]!.title}`,
        links: (impl.evidenceIds || []).map((eid) => ({
          href: `#evidence-${eid}`,
          rel: "related",
        })),
      };
    });

  const oscalDocument = {
    "system-security-plan": {
      uuid: input.systemId,
      metadata: {
        title: `${input.systemName} — System Security Plan (OSCAL Draft)`,
        "last-modified": new Date().toISOString(),
        version: "2.0.0-draft",
        "oscal-version": "1.1.2",
        props: [
          { name: "tenant-id", value: input.tenantId },
          { name: "baseline", value: `NIST SP 800-53B ${bKey}` },
          { name: "nist-catalog-version", value: DB.manifest.nistVersion },
          { name: "deterministic-db-sha256", value: DB.manifest.dbSha256 },
          { name: "ai-draft-notice", value: "Requires human ISSO/ISSM review and AO authorization." },
        ],
      },
      "system-characteristics": {
        "system-ids": [{ id: input.systemId }],
        "system-name": input.systemName,
        status: { state: "operational" },
      },
      "control-implementation": {
        description: `OSCAL control implementation statements anchored to NIST SP 800-53 Rev. ${DB.manifest.nistVersion}.`,
        "implemented-requirements": implementedRequirements,
      },
    },
  };

  return {
    oscalModel: "system-security-plan",
    oscalVersion: "1.1.2",
    nistVersion: DB.manifest.nistVersion,
    dbSha256: DB.manifest.dbSha256,
    validControlCount: implementedRequirements.length,
    documentSha256: sha256Sync(JSON.stringify(oscalDocument)),
    document: oscalDocument,
  };
}

// ----------------------------------------------------------------------------
// RMF-006: POA&M Closure Gate Requiring Verified Evidence
// ----------------------------------------------------------------------------
export function evaluatePoamClosure(input: {
  poamId: string;
  controlId: string;
  owner: string;
  remediationSummary: string;
  evidenceVerification?: EvidenceVerificationResult | null;
}): {
  poamId: string;
  controlId: string;
  closed: boolean;
  status: "CLOSED_VERIFIED" | "OPEN";
  errorCode?: RmfV2ErrorCode;
  rationale: string;
} {
  const ev = input.evidenceVerification;
  if (!ev || !ev.verified || !ev.canSatisfyObjective || ev.status !== "AVAILABLE_FOR_ASSESSMENT") {
    return {
      poamId: input.poamId,
      controlId: normalizeControlKey(input.controlId),
      closed: false,
      status: "OPEN",
      errorCode: ev?.errorCode || "EVIDENCE_UNVERIFIED",
      rationale:
        ev?.rationale ||
        `POA&M ${input.poamId} closure rejected: verified technical remediation evidence (AVAILABLE_FOR_ASSESSMENT) is required; paper attestations cannot close findings.`,
    };
  }

  return {
    poamId: input.poamId,
    controlId: normalizeControlKey(input.controlId),
    closed: true,
    status: "CLOSED_VERIFIED",
    rationale: `POA&M ${input.poamId} eligible for verified closure backed by SHA-256 verified artifact ${ev.evidenceId} (${ev.computedSha256.slice(0, 12)}).`,
  };
}

// ----------------------------------------------------------------------------
// RMF-007: ATO Readiness Gate (Never Issues an ATO on Behalf of AO)
// ----------------------------------------------------------------------------
export interface AtoBlockingItem {
  type: "MISSING_EVIDENCE" | "OPEN_FINDING" | "INCOMPLETE_PACKAGE" | "UNAPPROVED_TAILORING";
  control_id?: string;
  objective_id?: string;
  finding_id?: string;
  required_action: string;
}

export interface AtoReadinessResponse {
  system_id: string;
  package_id: string;
  assessment_snapshot_id?: string;
  as_of: string;
  status: "NOT_READY" | "READY_FOR_AO_REVIEW";
  authorization_decision: "NOT_MADE";
  blocking_items: AtoBlockingItem[];
  package_complete: boolean;
  human_authorization_required: true;
  readiness_checklist_percent: number;
  disclaimer: string;
}

export function evaluateAtoReadiness(input: {
  system_id: string;
  package_id: string;
  assessment_snapshot_id?: string;
  as_of?: string;
  missingEvidenceItems?: { controlId: string; objectiveId?: string; action?: string }[];
  openFindings?: { findingId: string; controlId?: string; action?: string }[];
  missingPackageArtifacts?: string[];
  totalChecklistItems?: number;
}): AtoReadinessResponse {
  const blockers: AtoBlockingItem[] = [];

  for (const item of input.missingEvidenceItems || []) {
    blockers.push({
      type: "MISSING_EVIDENCE",
      control_id: normalizeControlKey(item.controlId),
      ...(item.objectiveId ? { objective_id: item.objectiveId } : {}),
      required_action: item.action || "Complete evidence verification",
    });
  }
  for (const f of input.openFindings || []) {
    blockers.push({
      type: "OPEN_FINDING",
      finding_id: f.findingId,
      ...(f.controlId ? { control_id: normalizeControlKey(f.controlId) } : {}),
      required_action: f.action || "Review remediation and risk",
    });
  }
  for (const art of input.missingPackageArtifacts || []) {
    blockers.push({
      type: "INCOMPLETE_PACKAGE",
      required_action: `Supply approved ${art} artifact before AO submission`,
    });
  }

  const totalItems = Math.max(10, input.totalChecklistItems ?? 20);
  const completed = Math.max(0, totalItems - blockers.length);
  const readinessPct = Math.round((completed / totalItems) * 100);
  const ready = blockers.length === 0;

  return {
    system_id: input.system_id,
    package_id: input.package_id,
    ...(input.assessment_snapshot_id ? { assessment_snapshot_id: input.assessment_snapshot_id } : {}),
    as_of: input.as_of || new Date().toISOString(),
    status: ready ? "READY_FOR_AO_REVIEW" : "NOT_READY",
    authorization_decision: "NOT_MADE",
    blocking_items: blockers,
    package_complete: ready,
    human_authorization_required: true,
    readiness_checklist_percent: readinessPct,
    disclaimer:
      "Readiness percentage reflects checklist completion only. Noctis cannot grant an ATO or accept organizational risk; only the designated Authorizing Official (AO) may issue an authorization decision.",
  };
}

// ----------------------------------------------------------------------------
// AI-023: Policy Impact Analysis & Baseline Release Diff
// ----------------------------------------------------------------------------
export interface PolicyImpactDiffResult {
  fromBaseline: string;
  toBaseline: string;
  nistVersion: string;
  fromCount: number;
  toCount: number;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  addedControlsSample: string[];
  removedControlsSample: string[];
  impactedArtifacts: string[];
}

export function computePolicyImpactDiff(
  fromBaselineRaw: string,
  toBaselineRaw: string,
): PolicyImpactDiffResult {
  const fromKey = normalizeBaselineKey(fromBaselineRaw);
  const toKey = normalizeBaselineKey(toBaselineRaw);
  const fromList = getBaselineControlIds(fromKey);
  const toList = getBaselineControlIds(toKey);
  const fromSet = new Set(fromList);
  const toSet = new Set(toList);

  const added = toList.filter((id) => !fromSet.has(id));
  const removed = fromList.filter((id) => !toSet.has(id));
  const unchangedCount = toList.filter((id) => fromSet.has(id)).length;

  return {
    fromBaseline: `NIST SP 800-53B ${fromKey}`,
    toBaseline: `NIST SP 800-53B ${toKey}`,
    nistVersion: DB.manifest.nistVersion,
    fromCount: fromList.length,
    toCount: toList.length,
    addedCount: added.length,
    removedCount: removed.length,
    unchangedCount,
    addedControlsSample: added.slice(0, 25),
    removedControlsSample: removed.slice(0, 25),
    impactedArtifacts: [
      "System Security Plan (SSP) & Customer Responsibility Matrix (CRM)",
      "Security Assessment Plan (SAP) & SP 800-53A Test Cases",
      "Continuous Monitoring (ConMon) & Configuration Baseline Templates",
    ],
  };
}
