/**
 * Noctis RMF v2.0 — Bounded 10-Agent Workforce & Independent Review Gate (RMF-001, AI-020)
 *
 * Agents act strictly within explicit permission envelopes. No agent may self-approve
 * its own work, alter deterministic rules, close findings without proof, or issue ATOs.
 */

import type { RmfV2ErrorCode } from "./registry.ts";

export type RmfAgentId =
  | "CATEGORIZATION_AGENT"
  | "BASELINE_AGENT"
  | "IMPLEMENTATION_AGENT"
  | "EVIDENCE_AGENT"
  | "ASSESSMENT_AGENT"
  | "RISK_AGENT"
  | "POAM_AGENT"
  | "AUTHORIZATION_AGENT"
  | "MONITORING_AGENT"
  | "INDEPENDENT_REVIEW_AGENT";

export interface RmfAgentManifestEntry {
  id: RmfAgentId;
  responsibility: string;
  permittedOutput: string;
  permissions: {
    read_system_evidence: boolean;
    create_drafts: boolean;
    execute_approved_rules: boolean;
    approve_findings: false;
    accept_risk: false;
    issue_authorization: false;
    modify_rules: false;
  };
}

const DEFAULT_PERMISSIONS = {
  read_system_evidence: true,
  create_drafts: true,
  execute_approved_rules: true,
  approve_findings: false as const,
  accept_risk: false as const,
  issue_authorization: false as const,
  modify_rules: false as const,
};

export const RMF_V2_AGENTS: RmfAgentManifestEntry[] = [
  {
    id: "CATEGORIZATION_AGENT",
    responsibility: "Analyze information types and impact rationale",
    permittedOutput: "Categorization recommendation",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "BASELINE_AGENT",
    responsibility: "Resolve and compare applicable profiles",
    permittedOutput: "Tailoring proposal",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "IMPLEMENTATION_AGENT",
    responsibility: "Review SSP implementation statements",
    permittedOutput: "Draft implementation analysis",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "EVIDENCE_AGENT",
    responsibility: "Identify required evidence and gaps",
    permittedOutput: "Evidence request",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "ASSESSMENT_AGENT",
    responsibility: "Prepare assessment procedures and observations",
    permittedOutput: "Draft assessment",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "RISK_AGENT",
    responsibility: "Explain findings and mission impact",
    permittedOutput: "Risk recommendation",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "POAM_AGENT",
    responsibility: "Draft corrective action plans",
    permittedOutput: "Proposed remediation",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "AUTHORIZATION_AGENT",
    responsibility: "Check package readiness",
    permittedOutput: "Readiness report",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "MONITORING_AGENT",
    responsibility: "Analyze trends and deviations",
    permittedOutput: "Monitoring alert",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "INDEPENDENT_REVIEW_AGENT",
    responsibility: "Validate grounding and consistency",
    permittedOutput: "Review findings",
    permissions: DEFAULT_PERMISSIONS,
  },
];

export type GuardedAgentAction =
  | "READ_EVIDENCE"
  | "CREATE_DRAFT"
  | "EXECUTE_APPROVED_RULE"
  | "SELF_APPROVE_TASK"
  | "APPROVE_FINDING"
  | "MODIFY_RULE"
  | "ISSUE_ATO"
  | "ACCEPT_RISK";

export interface AgentActionGuardResult {
  allowed: boolean;
  agentId: RmfAgentId;
  action: GuardedAgentAction;
  errorCode?: RmfV2ErrorCode;
  reason: string;
}

export function executeAgentActionGuard(
  agentId: RmfAgentId,
  action: GuardedAgentAction,
  actorIsHuman = false,
): AgentActionGuardResult {
  if (action === "SELF_APPROVE_TASK" || action === "APPROVE_FINDING" || action === "MODIFY_RULE" || action === "ISSUE_ATO" || action === "ACCEPT_RISK") {
    if (!actorIsHuman || action === "SELF_APPROVE_TASK") {
      return {
        allowed: false,
        agentId,
        action,
        errorCode: "HUMAN_APPROVAL_REQUIRED",
        reason: `Blocked action ${action} by ${agentId}: agents cannot approve their own tasks, modify approved rules, close/approve findings, accept risk, or issue an ATO.`,
      };
    }
  }
  return {
    allowed: true,
    agentId,
    action,
    reason: `Action ${action} permitted under ${agentId} bounded tool envelope.`,
  };
}

export interface AgentReviewInput {
  runId: string;
  tenantId: string;
  primaryAgent: RmfAgentId;
  primaryVerdict: string;
  primaryCitations: string[];
  independentReviewVerdict: string;
  independentReviewViolations: string[];
}

export interface IndependentReviewOutcome {
  runId: string;
  tenantId: string;
  status: "DRAFT_READY" | "ESCALATED_FOR_HUMAN_REVIEW";
  humanReviewRequired: true;
  disagreementDetected: boolean;
  reasons: string[];
}

/**
 * AI-020: Compares primary agent output with INDEPENDENT_REVIEW_AGENT findings.
 * Any verdict disagreement or citation/grounding violation escalates for human review.
 */
export function runIndependentAgentReview(input: AgentReviewInput): IndependentReviewOutcome {
  const reasons: string[] = [];
  const verdictMismatch =
    input.primaryVerdict.trim().toUpperCase() !== input.independentReviewVerdict.trim().toUpperCase();

  if (verdictMismatch) {
    reasons.push(
      `Verdict disagreement: ${input.primaryAgent} proposed '${input.primaryVerdict}', whereas INDEPENDENT_REVIEW_AGENT assessed '${input.independentReviewVerdict}'.`,
    );
  }
  if (input.independentReviewViolations.length > 0) {
    reasons.push(...input.independentReviewViolations);
  }

  const escalated = verdictMismatch || input.independentReviewViolations.length > 0;
  return {
    runId: input.runId,
    tenantId: input.tenantId,
    status: escalated ? "ESCALATED_FOR_HUMAN_REVIEW" : "DRAFT_READY",
    humanReviewRequired: true,
    disagreementDetected: escalated,
    reasons,
  };
}
