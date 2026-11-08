import { createHash } from "node:crypto";

export interface NoctisEvidenceReference {
  sourceId: string;
  chunkId: string;
  title: string;
  canonicalUri: string | null;
  locator: string;
  excerpt: string;
  sourceHash: string;
  chunkHash: string;
}

export interface NoctisClaimEvidenceInput {
  claimId: string;
  claimText: string;
  evidenceChunkIds: readonly string[];
}

export interface NoctisEvidenceIntegrityResult {
  status: "traceable" | "unverified";
  claimResults: Array<{
    claimId: string;
    status: "traceable" | "unverified";
    resolvedEvidenceChunkIds: string[];
    missingEvidenceChunkIds: string[];
  }>;
  invalidEvidenceChunkIds: string[];
  unusedEvidenceChunkIds: string[];
  limitations: string[];
}

const SHA256 = /^[a-f0-9]{64}$/i;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Checks citation identity and provenance integrity only.
 *
 * A traceable citation means the referenced retrieved chunk exists and its
 * excerpt hash matches the stored chunk hash. It does NOT establish that the
 * excerpt semantically entails, proves, or agrees with the associated claim.
 * That requires a separately evaluated entailment process or human review.
 */
export function validateNoctisClaimEvidence(input: {
  claims: readonly NoctisClaimEvidenceInput[];
  evidence: readonly NoctisEvidenceReference[];
}): NoctisEvidenceIntegrityResult {
  const byChunkId = new Map<string, NoctisEvidenceReference>();
  const invalidEvidenceChunkIds: string[] = [];

  for (const item of input.evidence) {
    const valid =
      Boolean(item.chunkId.trim()) &&
      Boolean(item.sourceId.trim()) &&
      Boolean(item.title.trim()) &&
      Boolean(item.locator.trim()) &&
      Boolean(item.excerpt.trim()) &&
      SHA256.test(item.sourceHash) &&
      SHA256.test(item.chunkHash) &&
      sha256(item.excerpt) === item.chunkHash &&
      (!item.canonicalUri || /^https:\/\//i.test(item.canonicalUri));

    if (!valid || byChunkId.has(item.chunkId)) {
      invalidEvidenceChunkIds.push(item.chunkId);
      continue;
    }
    byChunkId.set(item.chunkId, item);
  }

  const referenced = new Set<string>();
  const claimResults = input.claims.map((claim) => {
    const uniqueIds = [...new Set(claim.evidenceChunkIds)];
    const resolvedEvidenceChunkIds = uniqueIds.filter((id) => {
      referenced.add(id);
      return byChunkId.has(id);
    });
    const missingEvidenceChunkIds = uniqueIds.filter((id) => !byChunkId.has(id));
    const validClaim = Boolean(claim.claimId.trim() && claim.claimText.trim());
    const traceable = validClaim && uniqueIds.length > 0 && missingEvidenceChunkIds.length === 0;
    return {
      claimId: claim.claimId,
      status: traceable ? "traceable" as const : "unverified" as const,
      resolvedEvidenceChunkIds,
      missingEvidenceChunkIds: validClaim ? missingEvidenceChunkIds : [...missingEvidenceChunkIds, "<invalid-claim>"],
    };
  });

  const unusedEvidenceChunkIds = [...byChunkId.keys()].filter((id) => !referenced.has(id));
  return {
    status: claimResults.length > 0 &&
      claimResults.every((claim) => claim.status === "traceable") &&
      invalidEvidenceChunkIds.length === 0
      ? "traceable"
      : "unverified",
    claimResults,
    invalidEvidenceChunkIds,
    unusedEvidenceChunkIds,
    limitations: [
      "Traceability is not semantic support or factual correctness.",
      "A matching SHA-256 hash verifies excerpt integrity, not publisher authenticity.",
      "Source approval, access authorization, freshness, and jurisdiction must be verified by their authoritative services.",
    ],
  };
}
