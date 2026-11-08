import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { validateNoctisClaimEvidence, type NoctisEvidenceReference } from "./noctis-evidence-integrity.ts";

const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const evidence: NoctisEvidenceReference = {
  sourceId: "source-1",
  chunkId: "chunk-1",
  title: "Approved test source",
  canonicalUri: "https://example.org/source",
  locator: "page:4",
  excerpt: "The system shall encrypt restricted information at rest.",
  sourceHash: hash("complete-source-document"),
  chunkHash: hash("The system shall encrypt restricted information at rest."),
};

describe("Noctis evidence integrity", () => {
  it("marks a claim traceable when its evidence chunk resolves and hash matches", () => {
    const result = validateNoctisClaimEvidence({
      claims: [{ claimId: "claim-1", claimText: "Restricted data is encrypted.", evidenceChunkIds: ["chunk-1"] }],
      evidence: [evidence],
    });
    assert.equal(result.status, "traceable");
    assert.equal(result.claimResults[0].status, "traceable");
  });

  it("does not treat a missing evidence reference as traceable", () => {
    const result = validateNoctisClaimEvidence({
      claims: [{ claimId: "claim-1", claimText: "A claim.", evidenceChunkIds: ["missing"] }],
      evidence: [evidence],
    });
    assert.equal(result.status, "unverified");
    assert.deepEqual(result.claimResults[0].missingEvidenceChunkIds, ["missing"]);
  });

  it("rejects an excerpt whose content no longer matches its chunk hash", () => {
    const result = validateNoctisClaimEvidence({
      claims: [{ claimId: "claim-1", claimText: "A claim.", evidenceChunkIds: ["chunk-1"] }],
      evidence: [{ ...evidence, excerpt: "Tampered excerpt." }],
    });
    assert.equal(result.status, "unverified");
    assert.deepEqual(result.invalidEvidenceChunkIds, ["chunk-1"]);
  });

  it("rejects malformed hashes and non-HTTPS source links", () => {
    const result = validateNoctisClaimEvidence({
      claims: [{ claimId: "claim-1", claimText: "A claim.", evidenceChunkIds: ["chunk-1"] }],
      evidence: [{ ...evidence, sourceHash: "not-a-hash", canonicalUri: "http://example.org" }],
    });
    assert.equal(result.status, "unverified");
    assert.deepEqual(result.invalidEvidenceChunkIds, ["chunk-1"]);
  });

  it("does not silently accept duplicate chunk identifiers", () => {
    const result = validateNoctisClaimEvidence({
      claims: [{ claimId: "claim-1", claimText: "A claim.", evidenceChunkIds: ["chunk-1"] }],
      evidence: [evidence, evidence],
    });
    assert.equal(result.status, "unverified");
    assert.deepEqual(result.invalidEvidenceChunkIds, ["chunk-1"]);
  });

  it("reports unused retrieved evidence and empty claim references", () => {
    const result = validateNoctisClaimEvidence({
      claims: [{ claimId: "claim-1", claimText: "A claim.", evidenceChunkIds: [] }],
      evidence: [evidence],
    });
    assert.equal(result.status, "unverified");
    assert.deepEqual(result.unusedEvidenceChunkIds, ["chunk-1"]);
  });

  it("explicitly distinguishes traceability from semantic entailment", () => {
    const result = validateNoctisClaimEvidence({
      claims: [{ claimId: "claim-1", claimText: "An unrelated claim.", evidenceChunkIds: ["chunk-1"] }],
      evidence: [evidence],
    });
    assert.equal(result.status, "traceable");
    assert.ok(result.limitations.some((item) => item.includes("not semantic support")));
  });
});
