/**
 * Capability #6 — Noctis AI Agent Governance
 * Priority #3 — Controlled Autonomous Agent Platform
 *
 * Enforces strict permission envelopes over all autonomous agents:
 *  - Agents may research, analyze, draft, run sandboxed verification tools, and propose changes.
 *  - Agents can NEVER self-approve proposals, alter deterministic policy rules, mutate production
 *    directly without human authorization, bypass classification ceilings, or issue ATOs.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { CLASSIFICATION_RANK, evaluateClassificationGate } from "../dod-ic/classification-gateway.ts";
import {
  appendAgentActivity,
  getAgentProposalById,
  saveAgentProposal,
} from "./persistence.server.ts";
import type {
  AgentProposalRecord,
  ClassificationTier,
  GovernedAgentSpec,
} from "./types.ts";

export const GOVERNED_AGENT_CATALOG: GovernedAgentSpec[] = [
  {
    agentId: "RESEARCH_AGENT",
    name: "Autonomous Deep Research & Policy Diff Agent",
    domain: "enterprise",
    maxClassification: "CUI",
    canRead: true,
    canDraft: true,
    canExecuteSandboxTools: true,
    canProposeChanges: true,
    canApproveConsequential: false,
    canIssueAto: false,
    canModifyDeterministicRules: false,
    allowedTools: ["hybrid_search_ndkrs", "policy_drift_check", "sbom_inspect", "draft_report"],
  },
  {
    agentId: "CLINICAL_ANALYSIS_AGENT",
    name: "Clinical Safety & Lab Extraction Agent",
    domain: "clinical",
    maxClassification: "CUI",
    canRead: true,
    canDraft: true,
    canExecuteSandboxTools: true,
    canProposeChanges: false,
    canApproveConsequential: false,
    canIssueAto: false,
    canModifyDeterministicRules: false,
    allowedTools: ["build_clinical_scratchpad", "run_clinical_calc", "audit_clinical_dossier"],
  },
  {
    agentId: "RMF_ASSESSMENT_AGENT",
    name: "NIST / FedRAMP Assessment Draft & POA&M Agent",
    domain: "rmf",
    maxClassification: "CUI",
    canRead: true,
    canDraft: true,
    canExecuteSandboxTools: true,
    canProposeChanges: true,
    canApproveConsequential: false,
    canIssueAto: false,
    canModifyDeterministicRules: false,
    allowedTools: ["evaluate_rmf_rules", "generate_ssp_draft", "export_emass_xlsx"],
  },
  {
    agentId: "DOD_IC_SECURITY_AGENT",
    name: "DoD RMF / ICD 503 / ACAS / STIG Analyst Agent",
    domain: "dod-ic",
    maxClassification: "CUI",
    canRead: true,
    canDraft: true,
    canExecuteSandboxTools: true,
    canProposeChanges: true,
    canApproveConsequential: false,
    canIssueAto: false,
    canModifyDeterministicRules: false,
    allowedTools: ["lookup_disa_cci", "analyze_acas_nessus", "evaluate_stig_ckl", "stig_library_search"],
  },
  {
    agentId: "DEVSECOPS_AGENT",
    name: "DCO / Sigma / DevSecOps Supply-Chain Agent",
    domain: "cybersecurity",
    maxClassification: "CUI",
    canRead: true,
    canDraft: true,
    canExecuteSandboxTools: true,
    canProposeChanges: true,
    canApproveConsequential: false,
    canIssueAto: false,
    canModifyDeterministicRules: false,
    allowedTools: ["parse_sigma_yaml", "build_attack_navigator", "run_ccv_check"],
  },
  {
    agentId: "POLICY_DRAFTING_AGENT",
    name: "Policy-as-Code Rule Composer & Redline Agent",
    domain: "enterprise",
    maxClassification: "UNCLASSIFIED",
    canRead: true,
    canDraft: true,
    canExecuteSandboxTools: true,
    canProposeChanges: true,
    canApproveConsequential: false,
    canIssueAto: false,
    canModifyDeterministicRules: false,
    allowedTools: ["compile_policy_pack_draft", "propose_policy_change", "run_eval_lab"],
  },
];

const FORBIDDEN_AGENT_ACTIONS = new Set([
  "ISSUE_ATO",
  "GRANT_ATO",
  "APPROVE_FINDING",
  "SELF_APPROVE",
  "MODIFY_DETERMINISTIC_RULES",
  "DIRECT_PROD_MUTATION",
  "BYPASS_CLASSIFICATION_GATE",
]);

const HUMAN_APPROVER_ROLES = new Set([
  "ISSM_HUMAN",
  "AO_HUMAN",
  "CLINICAL_SAFETY_OFFICER",
  "ADMIN_HUMAN",
  "SCA_HUMAN",
]);

export function listGovernedAgents(): GovernedAgentSpec[] {
  return GOVERNED_AGENT_CATALOG;
}

export async function evaluateAgentActionPolicy(input: {
  agentId: string;
  actionType: string;
  toolName: string;
  targetClassification?: ClassificationTier;
  tenantId?: string;
}): Promise<{
  decision: "ALLOW" | "REQUIRE_HUMAN_AUTH" | "DENY";
  reason: string;
  agent: GovernedAgentSpec | null;
  auditEventHash: string;
}> {
  const agent = GOVERNED_AGENT_CATALOG.find((a) => a.agentId === input.agentId) || null;
  const action = (input.actionType || "").trim().toUpperCase();
  const targetClass: ClassificationTier = input.targetClassification || "UNCLASSIFIED";
  const tenantId = input.tenantId || "tenant:public-sandbox";

  let decision: "ALLOW" | "REQUIRE_HUMAN_AUTH" | "DENY" = "ALLOW";
  let reason = `Permitted read/draft/sandbox execution under ${agent?.agentId ?? "UNKNOWN"} envelope.`;

  if (!agent) {
    decision = "DENY";
    reason = `Unregistered agent ID "${input.agentId}" denied by zero-trust agent registry.`;
  } else if (FORBIDDEN_AGENT_ACTIONS.has(action)) {
    decision = "DENY";
    reason = `Consequential action "${action}" is permanently forbidden for autonomous AI agents; human AO/ISSM authority required.`;
  } else if (CLASSIFICATION_RANK[targetClass] > CLASSIFICATION_RANK[agent.maxClassification]) {
    decision = "DENY";
    reason = `Classification ceiling exceeded: agent "${agent.agentId}" max is ${agent.maxClassification}, requested ${targetClass}.`;
  } else if (action === "PROPOSE_CHANGE" || action === "DEPLOY_POLICY_ROLLOUT" || action === "CLOSE_POAM") {
    decision = agent.canProposeChanges ? "REQUIRE_HUMAN_AUTH" : "DENY";
    reason = agent.canProposeChanges
      ? `Proposal staged cleanly; human authorization required before execution.`
      : `Agent "${agent.agentId}" lacks proposal privileges.`;
  } else if (input.toolName && !agent.allowedTools.includes(input.toolName)) {
    decision = "DENY";
    reason = `Tool "${input.toolName}" is outside "${agent.agentId}" allowlist (${agent.allowedTools.join(", ")}).`;
  }

  const logged = await appendAgentActivity({
    agentId: input.agentId,
    toolName: input.toolName || "none",
    actionType: action,
    tenantId,
    decision,
    policyReason: reason,
    detail: { targetClassification: targetClass },
  });

  return {
    decision,
    reason,
    agent,
    auditEventHash: logged.eventHash,
  };
}

export async function proposeAutonomousAction(input: {
  agentId: string;
  actionType: string;
  targetResource: string;
  riskTier?: string;
  classificationLevel?: ClassificationTier;
  rationale: string;
  payload?: Record<string, unknown>;
  requestedBy?: string;
  tenantId?: string;
}): Promise<AgentProposalRecord> {
  const payload = input.payload || {};
  const gate = evaluateClassificationGate({
    text: `${input.rationale}\n${JSON.stringify(payload)}`,
    claimedPayloadClassification: input.classificationLevel || null,
  });

  const payloadSha256 = sha256Sync(JSON.stringify({ agentId: input.agentId, actionType: input.actionType, target: input.targetResource, payload }));
  const id = `AGPROP-${payloadSha256.slice(0, 10).toUpperCase()}`;
  const requestedBy = input.requestedBy?.trim() || input.agentId;
  const blockedByGate = gate.action === "FAIL_CLOSED_BLOCK" || FORBIDDEN_AGENT_ACTIONS.has(input.actionType.toUpperCase());

  const saved = await saveAgentProposal({
    id,
    agentId: input.agentId,
    actionType: input.actionType,
    targetResource: input.targetResource,
    riskTier: input.riskTier || "HIGH",
    classificationLevel: (input.classificationLevel || "UNCLASSIFIED") as ClassificationTier,
    rationale: blockedByGate ? "[REDACTED_CLASSIFICATION_GATE_BLOCK]" : input.rationale,
    payload: blockedByGate ? { redacted: true, gateReason: gate.reason } : payload,
    payloadSha256,
    status: blockedByGate ? "BLOCKED_POLICY" : "PENDING_HUMAN_AUTH",
    requestedBy,
    reviewedBy: null,
    reviewerRole: null,
    reviewNotes: blockedByGate ? `Blocked at submission: ${gate.reason}` : null,
    decidedAt: null,
  });

  await appendAgentActivity({
    agentId: input.agentId,
    toolName: "propose_autonomous_action",
    actionType: input.actionType,
    tenantId: input.tenantId || "tenant:public-sandbox",
    decision: saved.status,
    policyReason: blockedByGate ? gate.reason : "Queued for independent human approval.",
    detail: { proposalId: saved.id, targetResource: saved.targetResource },
  });

  return saved;
}

export async function authorizeAgentProposal(input: {
  proposalId: string;
  decision: "APPROVE" | "DENY";
  reviewerId: string;
  reviewerRole: string;
  notes?: string;
  tenantId?: string;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  errorCode?: "PROPOSAL_NOT_FOUND" | "AGENT_CANNOT_APPROVE" | "SELF_APPROVAL_BLOCKED" | "POLICY_BLOCKED";
  message: string;
  proposal?: AgentProposalRecord;
}> {
  const existing = await getAgentProposalById(input.proposalId);
  if (!existing) {
    return {
      ok: false,
      httpStatus: 404,
      errorCode: "PROPOSAL_NOT_FOUND",
      message: `Agent proposal "${input.proposalId}" not found.`,
    };
  }

  const roleUpper = (input.reviewerRole || "").trim().toUpperCase();
  if (
    !HUMAN_APPROVER_ROLES.has(roleUpper) ||
    roleUpper.includes("AGENT") ||
    roleUpper.includes("BOT") ||
    roleUpper === "AI"
  ) {
    await appendAgentActivity({
      agentId: existing.agentId,
      toolName: "authorize_agent_proposal",
      actionType: "AUTHORIZE_PROPOSAL",
      tenantId: input.tenantId || "tenant:public-sandbox",
      decision: "DENY_403",
      policyReason: `Blocked non-human/unauthorized role "${input.reviewerRole}" from authorizing consequential proposal.`,
      detail: { proposalId: existing.id, reviewerId: input.reviewerId },
    });
    return {
      ok: false,
      httpStatus: 403,
      errorCode: "AGENT_CANNOT_APPROVE",
      message: `Role "${input.reviewerRole}" cannot approve consequential agent actions; independent human authority required.`,
    };
  }

  if (input.reviewerId.trim().toLowerCase() === existing.requestedBy.trim().toLowerCase() || input.reviewerId.trim().toLowerCase() === existing.agentId.trim().toLowerCase()) {
    await appendAgentActivity({
      agentId: existing.agentId,
      toolName: "authorize_agent_proposal",
      actionType: "SELF_APPROVAL_ATTEMPT",
      tenantId: input.tenantId || "tenant:public-sandbox",
      decision: "DENY_403",
      policyReason: `Self-approval violation blocked: reviewer "${input.reviewerId}" matches proposer "${existing.requestedBy}".`,
      detail: { proposalId: existing.id },
    });
    return {
      ok: false,
      httpStatus: 403,
      errorCode: "SELF_APPROVAL_BLOCKED",
      message: "Dual-control separation violated: proposer or proposing agent cannot self-approve.",
    };
  }

  if (existing.status === "BLOCKED_POLICY") {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: "POLICY_BLOCKED",
      message: `Proposal "${existing.id}" was blocked by Gate 0 / safety policy and cannot be approved.`,
    };
  }

  const updated = await saveAgentProposal({
    ...existing,
    status: input.decision === "APPROVE" ? "APPROVED" : "DENIED",
    reviewedBy: input.reviewerId,
    reviewerRole: roleUpper,
    reviewNotes: input.notes || `Human decision (${input.decision}) recorded.`,
    decidedAt: new Date().toISOString(),
  });

  await appendAgentActivity({
    agentId: existing.agentId,
    toolName: "authorize_agent_proposal",
    actionType: input.decision === "APPROVE" ? "HUMAN_APPROVED" : "HUMAN_DENIED",
    tenantId: input.tenantId || "tenant:public-sandbox",
    decision: updated.status,
    policyReason: `Authorized by ${input.reviewerId} (${roleUpper}).`,
    detail: { proposalId: updated.id },
  });

  return {
    ok: true,
    httpStatus: 200,
    message: `Proposal "${updated.id}" marked ${updated.status} by ${input.reviewerId} (${roleUpper}).`,
    proposal: updated,
  };
}
