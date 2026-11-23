/**
 * Noctis Defense AI Governance & Adversarial Red-Team Evaluator Engine (NDIMP Wave 2 — Step 4)
 *
 * Implements:
 *  - DOD-AI-RAI-001: NIST AI 100-1 (AI RMF 1.0), NIST AI 600-1 (GenAI Profile), DoD RAI Principles & DoDD 3000.09 (Jan 25, 2023)
 *  - DOD-AI-REDTEAM-001: OWASP LLM/Agentic Top 10 Adversarial Red-Team & Classification Boundary Evaluation
 */

import { sha256Sync } from "../universal-crypto.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY } from "./policy-registry.ts";

export interface DefenseAiRaiResult {
  ruleResult: DodIcRuleResult;
  nistAiRmfAverageScore: number | null;
  dodd300009HumanJudgmentSatisfied: boolean;
}

/** Evaluates DoD Responsible AI 5 Ethical Principles, NIST AI 100-1/600-1 & DoDD 3000.09 Autonomy in Weapon Systems. */
export function evaluateDefenseAiGovernanceAndRai(input: {
  governScore?: 1 | 2 | 3 | 4 | null;
  mapScore?: 1 | 2 | 3 | 4 | null;
  measureScore?: 1 | 2 | 3 | 4 | null;
  manageScore?: 1 | 2 | 3 | 4 | null;
  isLethalOrWeaponSystem?: boolean | null;
  appropriateHumanJudgmentEnforced?: boolean | null;
  seniorReviewCompleted?: boolean | null;
  traceableAuditLoggingActive?: boolean | null;
  biasAndReliabilityEvaluated?: boolean | null;
  killSwitchAndDeactivationVerified?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DefenseAiRaiResult {
  const mode: AssessmentMode = input.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const scores = [input.governScore, input.mapScore, input.measureScore, input.manageScore].filter(
    (n): n is 1 | 2 | 3 | 4 => typeof n === "number",
  );
  const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null;

  const blockers: string[] = [];
  if (input.isLethalOrWeaponSystem === true && input.appropriateHumanJudgmentEnforced === false) {
    blockers.push("DODD_3000_09_HUMAN_JUDGMENT_VIOLATION: Autonomous lethal/weapon systems MUST permit appropriate human judgment over the use of force");
  }
  if (input.isLethalOrWeaponSystem === true && input.seniorReviewCompleted === false) {
    blockers.push("DoDD 3000.09 (Jan 25, 2023) Senior Review (USD(P)/USD(R&E)/VCJCS) missing for covered autonomous weapon system");
  }
  if (input.traceableAuditLoggingActive === false) blockers.push("DoD RAI Traceable principle violated: immutable model decision/prompt audit trail missing");
  if (input.biasAndReliabilityEvaluated === false) blockers.push("DoD RAI Equitable/Reliable T&E benchmark evaluation missing");
  if (input.killSwitchAndDeactivationVerified === false) blockers.push("DoD RAI Governable principle violated: disengagement / kill-switch control unverified");
  if (avgScore !== null && avgScore < 3) blockers.push(`NIST AI 100-1 average maturity ${avgScore}/4 below minimum operational threshold 3.0/4`);

  const hasAnySignal =
    scores.length > 0 ||
    input.isLethalOrWeaponSystem != null ||
    input.appropriateHumanJudgmentEnforced != null ||
    input.seniorReviewCompleted != null ||
    input.traceableAuditLoggingActive != null ||
    input.killSwitchAndDeactivationVerified != null;

  const verdict: DodVerdict = !hasAnySignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? "FAIL"
    : input.appropriateHumanJudgmentEnforced == null || input.traceableAuditLoggingActive == null
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";

  const humanOk = input.appropriateHumanJudgmentEnforced !== false && !(input.isLethalOrWeaponSystem === true && input.seniorReviewCompleted === false);
  const observedFacts: Record<string, string | number | boolean | null> = {
    nistAiRmfAverageScore: avgScore,
    isLethalOrWeaponSystem: input.isLethalOrWeaponSystem ?? null,
    appropriateHumanJudgmentEnforced: input.appropriateHumanJudgmentEnforced ?? null,
    seniorReviewCompleted: input.seniorReviewCompleted ?? null,
    traceableAuditLoggingActive: input.traceableAuditLoggingActive ?? null,
    killSwitchAndDeactivationVerified: input.killSwitchAndDeactivationVerified ?? null,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-AI-RAI-001",
    ruleVersion: "2024.07.26",
    jurisdiction: "DOD",
    title: "Defense AI Governance, DoD RAI Principles, NIST AI RMF & DoDD 3000.09",
    verdict,
    assessmentMode: mode,
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      blockers.length > 0
        ? `FAIL [DOD-AI-RAI-001]: ${blockers.join("; ")}.`
        : verdict === "PASS"
        ? "PASS [DOD-AI-RAI-001]: Defense AI system aligns with NIST AI 100-1/600-1, DoD RAI 5 Principles, and DoDD 3000.09 human judgment oversight."
        : `${verdict} [DOD-AI-RAI-001]: AI RMF T&E and Senior Review artifacts required.`,
    observedFacts,
    threshold: "Human judgment & Senior Review under DoDD 3000.09; Traceable/Reliable/Governable RAI controls; NIST AI RMF >= 3.0/4",
    variance: blockers.length > 0 ? blockers.join("; ") : "Aligned with Defense AI governance baseline",
    missingEvidence: ["DoD RAI Test & Evaluation Report, NIST AI 600-1 GenAI Risk Profile & DoDD 3000.09 Senior Review Record"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODD-3000.09-RAI"]!, DOD_IC_POLICY_REGISTRY["NIST-AI-RMF-600-1"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-AI-RAI-001", verdict, observedFacts, blockers })),
  };

  return { ruleResult, nistAiRmfAverageScore: avgScore, dodd300009HumanJudgmentSatisfied: humanOk };
}

export interface AiRedTeamResult {
  ruleResult: DodIcRuleResult;
  redTeamGatePassed: boolean;
}

/** Evaluates OWASP LLM/Agentic Top 10 adversarial red-team defenses and strict non-autonomous policy approval. */
export function evaluateAiAdversarialRedTeam(input: {
  promptInjectionDefensesTested?: boolean | null;
  indirectToolInjectionBlocked?: boolean | null;
  classificationBoundaryLeakageBlocked?: boolean | null;
  modelSupplyChainAndWeightsSigned?: boolean | null;
  agentAutonomousApprovalBlocked?: boolean | null;
  hallucinationGroundingVerifierActive?: boolean | null;
  adversarialRedTeamPassRatePercent?: number | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): AiRedTeamResult {
  const mode: AssessmentMode = input.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const blockers: string[] = [];

  if (input.promptInjectionDefensesTested === false) blockers.push("OWASP LLM01 direct prompt injection testing bypassed or failed");
  if (input.indirectToolInjectionBlocked === false) blockers.push("Agentic indirect prompt/tool injection execution path unblocked");
  if (input.classificationBoundaryLeakageBlocked === false) blockers.push("Model permits classification/boundary leakage across security domains");
  if (input.modelSupplyChainAndWeightsSigned === false) blockers.push("Model weights/artifacts lack cryptographic signature & provenance verification");
  if (input.agentAutonomousApprovalBlocked === false) blockers.push("AGENT_APPROVAL_FORBIDDEN: AI agents must NEVER hold autonomous ATO/policy approval authority");
  if (input.hallucinationGroundingVerifierActive === false) blockers.push("Deterministic factual/regulatory grounding verifier absent");
  if (typeof input.adversarialRedTeamPassRatePercent === "number" && input.adversarialRedTeamPassRatePercent < 95) {
    blockers.push(`Adversarial red-team pass rate ${input.adversarialRedTeamPassRatePercent}% below 95% defense threshold`);
  }

  const hasAnySignal =
    input.promptInjectionDefensesTested != null ||
    input.indirectToolInjectionBlocked != null ||
    input.classificationBoundaryLeakageBlocked != null ||
    input.agentAutonomousApprovalBlocked != null ||
    input.hallucinationGroundingVerifierActive != null ||
    input.adversarialRedTeamPassRatePercent != null;

  const verdict: DodVerdict = !hasAnySignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? "FAIL"
    : input.adversarialRedTeamPassRatePercent == null
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    promptInjectionDefensesTested: input.promptInjectionDefensesTested ?? null,
    indirectToolInjectionBlocked: input.indirectToolInjectionBlocked ?? null,
    classificationBoundaryLeakageBlocked: input.classificationBoundaryLeakageBlocked ?? null,
    modelSupplyChainAndWeightsSigned: input.modelSupplyChainAndWeightsSigned ?? null,
    agentAutonomousApprovalBlocked: input.agentAutonomousApprovalBlocked ?? null,
    adversarialRedTeamPassRatePercent: input.adversarialRedTeamPassRatePercent ?? null,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-AI-REDTEAM-001",
    ruleVersion: "2024.07.26",
    jurisdiction: "DOD",
    title: "OWASP LLM/Agentic Adversarial Red-Team & AI Assurance Gate",
    verdict,
    assessmentMode: mode,
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      blockers.length > 0
        ? `FAIL [DOD-AI-REDTEAM-001]: ${blockers.join("; ")}.`
        : verdict === "PASS"
        ? `PASS [DOD-AI-REDTEAM-001]: Adversarial red-team suite (${input.adversarialRedTeamPassRatePercent ?? 100}% pass) verifies prompt/tool isolation and boundary integrity.`
        : `${verdict} [DOD-AI-REDTEAM-001]: Quantitative red-team test suite evidence required.`,
    observedFacts,
    threshold: ">=95% red-team pass rate, 0 boundary leaks, signed model weights, AGENT_APPROVAL_FORBIDDEN",
    variance: blockers.length > 0 ? blockers.join("; ") : "Adversarial red-team invariants satisfied",
    missingEvidence: ["Reproducible adversarial red-team test transcript & signed model SBOM/weight hash"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["NIST-AI-RMF-600-1"]!, DOD_IC_POLICY_REGISTRY["DODD-3000.09-RAI"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-AI-REDTEAM-001", verdict, observedFacts, blockers })),
  };

  return { ruleResult, redTeamGatePassed: verdict === "PASS" };
}
