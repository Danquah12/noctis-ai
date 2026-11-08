/**
 * Deterministic specialist-result normalization and reconciliation.
 *
 * This module compares explicitly structured propositions. It does not infer
 * semantic equivalence, determine truth, grade publisher authority, or prove
 * that evidence entails a claim. Traceability delegates to the evidence
 * integrity validator; unresolved conflicts remain unresolved for review.
 */

import {
  validateNoctisClaimEvidence,
  type NoctisClaimEvidenceInput,
  type NoctisEvidenceReference,
} from "./noctis-evidence-integrity.ts";

export type NoctisConfidenceLabel = "low" | "medium" | "high" | "not_assessed";
export type NoctisClaimPolarity = "affirmed" | "negated" | "unknown";

export type NoctisSpecialistClaim = {
  claimId: string;
  subject: string;
  predicate: string;
  polarity: NoctisClaimPolarity;
  statement: string;
  confidence: NoctisConfidenceLabel;
  confidenceRationale: string;
  evidenceChunkIds: readonly string[];
};

export type NoctisSpecialistResult = {
  resultId: string;
  engineId: string;
  status: "complete" | "partial" | "failed";
  claims: readonly NoctisSpecialistClaim[];
  evidence: readonly NoctisEvidenceReference[];
  limitations: readonly string[];
};

export type NoctisReconciliationInput = {
  requestId: string;
  at: string;
  results: readonly NoctisSpecialistResult[];
};

export type NoctisReconciledClaim = {
  key: string;
  subject: string;
  predicate: string;
  status: "consistent" | "conflicted" | "insufficient_evidence";
  polarity: NoctisClaimPolarity | "mixed";
  claimIds: string[];
  engineIds: string[];
  confidence: NoctisConfidenceLabel;
  evidenceStatus: "traceable" | "unverified";
  evidenceChunkIds: string[];
  sourceIds: string[];
  statements: string[];
  limitations: string[];
};

export type NoctisReconciliationReport = {
  requestId: string;
  generatedAt: string;
  status: "consistent" | "conflicted" | "insufficient_evidence" | "partial";
  claims: NoctisReconciledClaim[];
  evidenceIntegrity: ReturnType<typeof validateNoctisClaimEvidence>;
  failedEngines: string[];
  partialEngines: string[];
  limitations: string[];
  humanReviewRecommended: boolean;
};

export type NoctisReconciliationError = {
  ok: false;
  code: "INVALID_INPUT" | "DUPLICATE_RESULT" | "DUPLICATE_CLAIM" | "INVALID_CLAIM" | "INVALID_TIMESTAMP";
  message: string;
};

export type NoctisReconciliationResult =
  | { ok: true; report: NoctisReconciliationReport }
  | NoctisReconciliationError;

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function validTimestamp(value: string): boolean {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function error(code: NoctisReconciliationError["code"], message: string): NoctisReconciliationError {
  return { ok: false, code, message };
}

function confidenceFor(
  claims: readonly NoctisSpecialistClaim[],
  conflicted: boolean,
  traceable: boolean,
): NoctisConfidenceLabel {
  if (conflicted || !traceable || claims.length === 0) return "not_assessed";
  const labels = new Set(claims.map((claim) => claim.confidence));
  if (labels.has("not_assessed")) return "not_assessed";
  // Do not average confidence labels. The least confident contributor governs.
  if (labels.has("low")) return "low";
  if (labels.has("medium")) return "medium";
  return "high";
}

/**
 * Reconciles exact subject/predicate keys and opposite explicit polarities.
 * The keying is intentionally conservative: semantically equivalent wording
 * with different subject/predicate strings is not automatically merged.
 */
export function reconcileNoctisSpecialistResults(
  input: NoctisReconciliationInput,
): NoctisReconciliationResult {
  if (!input || !input.requestId?.trim() || !Array.isArray(input.results)) {
    return error("INVALID_INPUT", "A request ID and specialist result array are required.");
  }
  if (!validTimestamp(input.at)) {
    return error("INVALID_TIMESTAMP", "Reconciliation time must be a valid UTC ISO-8601 timestamp.");
  }

  const resultIds = new Set<string>();
  const claimIds = new Set<string>();
  const allEvidence = new Map<string, NoctisEvidenceReference>();
  const claimRows: Array<{ claim: NoctisSpecialistClaim; engineId: string; key: string }> = [];
  const failedEngines: string[] = [];
  const partialEngines: string[] = [];

  for (const result of input.results) {
    if (!result?.resultId?.trim() || !result.engineId?.trim() ||
        !["complete", "partial", "failed"].includes(result.status) ||
        !Array.isArray(result.claims) || !Array.isArray(result.evidence)) {
      return error("INVALID_INPUT", "Each specialist result requires an ID, engine, valid status, claims, and evidence.");
    }
    if (resultIds.has(result.resultId)) {
      return error("DUPLICATE_RESULT", `Duplicate specialist result ID: ${result.resultId}.`);
    }
    resultIds.add(result.resultId);
    if (result.status === "failed") {
      failedEngines.push(result.engineId);
      if (result.claims.length > 0) {
        return error("INVALID_INPUT", "Failed specialist results cannot contribute claims.");
      }
    }
    if (result.status === "partial") partialEngines.push(result.engineId);

    for (const evidence of result.evidence) {
      const existing = allEvidence.get(evidence.chunkId);
      if (!existing) {
        allEvidence.set(evidence.chunkId, evidence);
      } else if (JSON.stringify(existing) !== JSON.stringify(evidence)) {
        // Identical citations shared by multiple specialists are deduplicated;
        // conflicting records for one chunk ID are preserved as duplicates so
        // the integrity validator marks the identifier invalid.
        allEvidence.set(`${evidence.chunkId}#conflict#${allEvidence.size}`, evidence);
      }
    }

    for (const claim of result.claims) {
      if (!claim?.claimId?.trim() || !claim.subject?.trim() || !claim.predicate?.trim() ||
          !claim.statement?.trim() || !claim.confidenceRationale?.trim() ||
          !["affirmed", "negated", "unknown"].includes(claim.polarity) ||
          !["low", "medium", "high", "not_assessed"].includes(claim.confidence) ||
          !Array.isArray(claim.evidenceChunkIds)) {
        return error("INVALID_CLAIM", "Claims require identity, structured subject/predicate, polarity, statement, confidence rationale, and evidence IDs.");
      }
      if (claimIds.has(claim.claimId)) return error("DUPLICATE_CLAIM", `Duplicate claim ID: ${claim.claimId}.`);
      claimIds.add(claim.claimId);
      const subject = normalized(claim.subject);
      const predicate = normalized(claim.predicate);
      if (!subject || !predicate) return error("INVALID_CLAIM", "Claim subject and predicate cannot be empty after normalization.");
      claimRows.push({ claim, engineId: result.engineId, key: `${subject}::${predicate}` });
    }
  }

  const evidence = [...allEvidence.values()];
  const integrityClaims: NoctisClaimEvidenceInput[] = claimRows.map(({ claim }) => ({
    claimId: claim.claimId,
    claimText: claim.statement,
    evidenceChunkIds: claim.evidenceChunkIds,
  }));
  const evidenceIntegrity = validateNoctisClaimEvidence({
    claims: integrityClaims,
    evidence,
  });

  const grouped = new Map<string, typeof claimRows>();
  for (const row of claimRows) {
    const group = grouped.get(row.key) ?? [];
    group.push(row);
    grouped.set(row.key, group);
  }

  const integrityByClaim = new Map(evidenceIntegrity.claimResults.map((item) => [item.claimId, item]));
  const claims: NoctisReconciledClaim[] = [...grouped.entries()].map(([key, rows]) => {
    const polarities = new Set(rows.map((row) => row.claim.polarity).filter((p) => p !== "unknown"));
    const conflicted = polarities.has("affirmed") && polarities.has("negated");
    const evidenceChunkIds = [...new Set(rows.flatMap((row) => row.claim.evidenceChunkIds))].sort();
    const traceable = rows.every((row) => integrityByClaim.get(row.claim.claimId)?.status === "traceable");
    const allUnknown = rows.every((row) => row.claim.polarity === "unknown");
    const subject = rows[0].claim.subject.trim();
    const predicate = rows[0].claim.predicate.trim();
    const limitations = [
      "Exact normalized subject/predicate matching only; semantic equivalence is not inferred.",
      "Opposing polarity indicates disagreement, not which specialist is correct.",
      "Evidence traceability does not establish semantic entailment or factual correctness.",
    ];
    if (allUnknown) limitations.push("All contributing specialists marked polarity unknown.");
    return {
      key,
      subject,
      predicate,
      status: conflicted ? "conflicted" : (!traceable || allUnknown ? "insufficient_evidence" : "consistent"),
      polarity: conflicted ? "mixed" : (allUnknown ? "unknown" : [...polarities][0] ?? "unknown"),
      claimIds: rows.map((row) => row.claim.claimId),
      engineIds: [...new Set(rows.map((row) => row.engineId))].sort(),
      confidence: confidenceFor(rows.map((row) => row.claim), conflicted, traceable && !allUnknown),
      evidenceStatus: traceable ? "traceable" : "unverified",
      evidenceChunkIds,
      sourceIds: [...new Set(evidence.filter((item) => evidenceChunkIds.includes(item.chunkId)).map((item) => item.sourceId))].sort(),
      statements: rows.map((row) => row.claim.statement.trim()),
      limitations,
    };
  });

  const hasConflict = claims.some((claim) => claim.status === "conflicted");
  const hasInsufficient = claims.some((claim) => claim.status === "insufficient_evidence");
  const hasPartial = failedEngines.length > 0 || partialEngines.length > 0;
  const status = hasConflict ? "conflicted" :
    (hasPartial ? "partial" : (claims.length === 0 || hasInsufficient ? "insufficient_evidence" : "consistent"));
  const limitations = [
    "This report reconciles structured specialist assertions; it does not establish truth.",
    "Confidence labels are specialist-provided and are not calibrated probabilities.",
    "Source authenticity, authority, freshness, access rights, and jurisdiction are not established here.",
    "No specialist engine was invoked by this function; it only processes supplied result records.",
  ];
  if (hasConflict) limitations.push("Conflicting claims require human adjudication or additional authoritative evidence.");
  if (hasPartial) limitations.push("At least one specialist result was partial or failed; the synthesis may be incomplete.");

  return {
    ok: true,
    report: {
      requestId: input.requestId,
      generatedAt: input.at,
      status,
      claims,
      evidenceIntegrity,
      failedEngines: [...new Set(failedEngines)].sort(),
      partialEngines: [...new Set(partialEngines)].sort(),
      limitations,
      humanReviewRecommended: hasConflict || hasInsufficient || hasPartial,
    },
  };
}
