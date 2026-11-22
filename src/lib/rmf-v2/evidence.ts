/**
 * Noctis RMF v2.0 — Evidence Integrity (CYB-014) & Multi-Objective Aggregation (CYB-015)
 *
 * Enforces SHA-256 hash verification, quarantine on mismatch, freshness windows,
 * and strict multi-objective assessment aggregation (1 passing check never promotes
 * an entire control to SATISFIED).
 */

import { sha256Sync } from "../universal-crypto.ts";
import type { RmfV2ErrorCode } from "./registry.ts";

export type EvidenceLifecycleState =
  | "COLLECTED"
  | "QUARANTINED"
  | "VALIDATED"
  | "VERIFIED"
  | "AVAILABLE_FOR_ASSESSMENT"
  | "RETAINED"
  | "EXPIRED";

export interface EvidenceVerifyInput {
  evidenceId: string;
  tenantId: string;
  controlId: string;
  origin: string;
  collectedAt: string;
  maxAgeDays?: number;
  claimedSha256?: string;
  payload: unknown;
  asOf?: string;
}

export interface EvidenceVerificationResult {
  evidenceId: string;
  tenantId: string;
  controlId: string;
  origin: string;
  status: EvidenceLifecycleState;
  verified: boolean;
  canSatisfyObjective: boolean;
  computedSha256: string;
  claimedSha256: string | null;
  ageDays: number;
  errorCode?: RmfV2ErrorCode;
  rationale: string;
  auditable: true;
}

export function verifyEvidenceRecord(input: EvidenceVerifyInput): EvidenceVerificationResult {
  const serialized = typeof input.payload === "string" ? input.payload : JSON.stringify(input.payload ?? {});
  const computedSha256 = sha256Sync(serialized);
  const claimed = input.claimedSha256 ? input.claimedSha256.trim().toLowerCase() : null;

  const collectedMs = Date.parse(input.collectedAt);
  const asOfMs = input.asOf ? Date.parse(input.asOf) : Date.now();
  const ageDays = Number.isFinite(collectedMs)
    ? Math.max(0, Number(((asOfMs - collectedMs) / (1000 * 60 * 60 * 24)).toFixed(2)))
    : 9999;

  if (claimed && claimed !== computedSha256) {
    return {
      evidenceId: input.evidenceId,
      tenantId: input.tenantId,
      controlId: input.controlId,
      origin: input.origin,
      status: "QUARANTINED",
      verified: false,
      canSatisfyObjective: false,
      computedSha256,
      claimedSha256: claimed,
      ageDays,
      errorCode: "EVIDENCE_HASH_MISMATCH",
      rationale: `SHA-256 mismatch detected: expected ${claimed}, computed ${computedSha256}. Evidence quarantined and blocked from satisfying assessment objectives.`,
      auditable: true,
    };
  }

  const maxAge = input.maxAgeDays ?? 30;
  if (!Number.isFinite(collectedMs) || ageDays > maxAge) {
    return {
      evidenceId: input.evidenceId,
      tenantId: input.tenantId,
      controlId: input.controlId,
      origin: input.origin,
      status: "EXPIRED",
      verified: false,
      canSatisfyObjective: false,
      computedSha256,
      claimedSha256: claimed,
      ageDays,
      errorCode: "EVIDENCE_UNVERIFIED",
      rationale: Number.isFinite(collectedMs)
        ? `Evidence is stale (${ageDays} days old > ${maxAge}-day freshness window). Marked EXPIRED.`
        : "Invalid or missing collection timestamp.",
      auditable: true,
    };
  }

  return {
    evidenceId: input.evidenceId,
    tenantId: input.tenantId,
    controlId: input.controlId,
    origin: input.origin,
    status: "AVAILABLE_FOR_ASSESSMENT",
    verified: true,
    canSatisfyObjective: true,
    computedSha256,
    claimedSha256: claimed,
    ageDays,
    rationale: "SHA-256 integrity and freshness verified; evidence approved for assessment linkage.",
    auditable: true,
  };
}

export type ObjectiveOutcome =
  | "SATISFIED"
  | "PASS"
  | "OTHER_THAN_SATISFIED"
  | "FAIL"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_TESTED"
  | "MANUAL_REVIEW_REQUIRED"
  | "NOT_APPLICABLE";

export interface ObjectiveEvaluationEntry {
  objectiveId: string;
  outcome: ObjectiveOutcome;
  evidenceVerified?: boolean;
}

export interface ControlEffectivenessAggregate {
  controlId: string;
  overallStatus: "SATISFIED" | "OTHER_THAN_SATISFIED" | "INCOMPLETE";
  totalObjectives: number;
  applicableObjectives: number;
  satisfiedCount: number;
  failedCount: number;
  incompleteCount: number;
  coveragePercent: number;
  disclaimer: string;
  objectives: ObjectiveEvaluationEntry[];
}

/**
 * CYB-015: Transparent multi-objective control aggregation.
 * One passing objective NEVER promotes an entire control to SATISFIED if other
 * applicable objectives failed, lack verified evidence, or remain untested.
 */
export function evaluateControlFromObjectives(
  controlId: string,
  objectiveResults: ObjectiveEvaluationEntry[],
): ControlEffectivenessAggregate {
  const totalObjectives = objectiveResults.length;
  const applicable = objectiveResults.filter((o) => o.outcome !== "NOT_APPLICABLE");
  const applicableCount = applicable.length;

  let satisfiedCount = 0;
  let failedCount = 0;
  let incompleteCount = 0;

  for (const obj of applicable) {
    const isPassing = (obj.outcome === "SATISFIED" || obj.outcome === "PASS") && obj.evidenceVerified !== false;
    if (isPassing) {
      satisfiedCount += 1;
    } else if (obj.outcome === "OTHER_THAN_SATISFIED" || obj.outcome === "FAIL") {
      failedCount += 1;
    } else {
      incompleteCount += 1;
    }
  }

  const coveragePercent =
    applicableCount > 0 ? Math.round((satisfiedCount / applicableCount) * 100) : 0;

  let overallStatus: "SATISFIED" | "OTHER_THAN_SATISFIED" | "INCOMPLETE" = "INCOMPLETE";
  if (applicableCount === 0 && totalObjectives === 0) {
    overallStatus = "INCOMPLETE";
  } else if (failedCount > 0) {
    overallStatus = "OTHER_THAN_SATISFIED";
  } else if (incompleteCount === 0 && satisfiedCount === applicableCount && applicableCount > 0) {
    overallStatus = "SATISFIED";
  }

  return {
    controlId,
    overallStatus,
    totalObjectives,
    applicableObjectives: applicableCount,
    satisfiedCount,
    failedCount,
    incompleteCount,
    coveragePercent,
    disclaimer:
      "Coverage percentage summarizes objective verification state only and does not equate to a formal Authorization to Operate (ATO).",
    objectives: objectiveResults,
  };
}
