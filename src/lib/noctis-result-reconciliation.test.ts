import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  reconcileNoctisSpecialistResults,
  type NoctisSpecialistClaim,
  type NoctisSpecialistResult,
} from "./noctis-result-reconciliation.ts";
import type { NoctisEvidenceReference } from "./noctis-evidence-integrity.ts";

const AT = "2026-11-07T15:00:00Z";
const excerpt = "The system encrypts restricted information at rest.";
const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const evidence: NoctisEvidenceReference = {
  sourceId: "source-1",
  chunkId: "chunk-1",
  title: "Security control standard",
  canonicalUri: "https://example.org/standard",
  locator: "section:3.1",
  excerpt,
  sourceHash: hash("complete source document"),
  chunkHash: hash(excerpt),
};

function claim(overrides: Partial<NoctisSpecialistClaim> = {}): NoctisSpecialistClaim {
  return {
    claimId: "claim-1",
    subject: "Restricted information",
    predicate: "is encrypted at rest",
    polarity: "affirmed",
    statement: "Restricted information is encrypted at rest.",
    confidence: "medium",
    confidenceRationale: "The specialist matched a control statement.",
    evidenceChunkIds: ["chunk-1"],
    ...overrides,
  };
}

function result(overrides: Partial<NoctisSpecialistResult> = {}): NoctisSpecialistResult {
  return {
    resultId: "result-1",
    engineId: "noctis.cyber.sast",
    status: "complete",
    claims: [claim()],
    evidence: [evidence],
    limitations: [],
    ...overrides,
  };
}

function reconcile(results: NoctisSpecialistResult[]) {
  const output = reconcileNoctisSpecialistResults({ requestId: "req-1", at: AT, results });
  assert.equal(output.ok, true);
  if (!output.ok) throw new Error(output.message);
  return output.report;
}

describe("Noctis specialist result reconciliation", () => {
  it("normalizes and reconciles a traceable single-specialist claim", () => {
    const report = reconcile([result()]);
    assert.equal(report.status, "consistent");
    assert.equal(report.claims[0].status, "consistent");
    assert.equal(report.claims[0].evidenceStatus, "traceable");
    assert.equal(report.claims[0].confidence, "medium");
    assert.deepEqual(report.claims[0].sourceIds, ["source-1"]);
  });

  it("detects opposite explicit polarities for the same normalized subject and predicate", () => {
    const report = reconcile([
      result(),
      result({
        resultId: "result-2",
        engineId: "noctis.risk.rmf",
        claims: [claim({
          claimId: "claim-2",
          subject: "  restricted   INFORMATION ",
          predicate: "IS ENCRYPTED AT REST",
          polarity: "negated",
          statement: "Restricted information is not encrypted at rest.",
          confidence: "high",
        })],
      }),
    ]);
    assert.equal(report.status, "conflicted");
    assert.equal(report.claims[0].status, "conflicted");
    assert.equal(report.claims[0].polarity, "mixed");
    assert.equal(report.claims[0].confidence, "not_assessed");
    assert.equal(report.humanReviewRecommended, true);
  });

  it("does not merge different subject/predicate keys based on loose wording", () => {
    const report = reconcile([
      result(),
      result({
        resultId: "result-2",
        engineId: "noctis.risk.rmf",
        claims: [claim({ claimId: "claim-2", predicate: "is protected by encryption" , polarity: "negated" })],
      }),
    ]);
    assert.equal(report.claims.length, 2);
    assert.equal(report.status, "consistent");
  });

  it("marks claims with missing evidence as insufficient rather than supported", () => {
    const report = reconcile([result({
      claims: [claim({ evidenceChunkIds: ["missing-chunk"] })],
    })]);
    assert.equal(report.status, "insufficient_evidence");
    assert.equal(report.claims[0].status, "insufficient_evidence");
    assert.equal(report.claims[0].evidenceStatus, "unverified");
    assert.equal(report.humanReviewRecommended, true);
  });

  it("does not treat unknown polarity as an affirmative conclusion", () => {
    const report = reconcile([result({
      claims: [claim({ polarity: "unknown", confidence: "high" })],
    })]);
    assert.equal(report.claims[0].polarity, "unknown");
    assert.equal(report.claims[0].status, "insufficient_evidence");
    assert.equal(report.claims[0].confidence, "not_assessed");
  });

  it("uses the lowest contributing confidence label without averaging", () => {
    const report = reconcile([
      result(),
      result({
        resultId: "result-2",
        engineId: "noctis.risk.rmf",
        claims: [claim({ claimId: "claim-2", confidence: "low" })],
      }),
    ]);
    assert.equal(report.claims[0].confidence, "low");
  });

  it("records partial and failed specialist results and flags incomplete synthesis", () => {
    const report = reconcile([
      result(),
      result({ resultId: "result-2", engineId: "noctis.health.clinical", status: "partial", claims: [] }),
      result({ resultId: "result-3", engineId: "noctis.legal.advisory", status: "failed", claims: [] }),
    ]);
    assert.equal(report.status, "partial");
    assert.deepEqual(report.partialEngines, ["noctis.health.clinical"]);
    assert.deepEqual(report.failedEngines, ["noctis.legal.advisory"]);
    assert.equal(report.humanReviewRecommended, true);
  });

  it("rejects duplicate result IDs and duplicate claim IDs", () => {
    const duplicateResult = reconcileNoctisSpecialistResults({
      requestId: "req-1", at: AT, results: [result(), result()],
    });
    assert.equal(duplicateResult.ok, false);
    if (!duplicateResult.ok) assert.equal(duplicateResult.code, "DUPLICATE_RESULT");

    const duplicateClaim = reconcileNoctisSpecialistResults({
      requestId: "req-1", at: AT,
      results: [result(), result({
        resultId: "result-2",
        claims: [claim()],
      })],
    });
    assert.equal(duplicateClaim.ok, false);
    if (!duplicateClaim.ok) assert.equal(duplicateClaim.code, "DUPLICATE_CLAIM");
  });

  it("rejects malformed timestamps and invalid claim contracts", () => {
    const invalidTime = reconcileNoctisSpecialistResults({ requestId: "req-1", at: "yesterday", results: [] });
    assert.equal(invalidTime.ok, false);
    if (!invalidTime.ok) assert.equal(invalidTime.code, "INVALID_TIMESTAMP");

    const invalidClaim = reconcileNoctisSpecialistResults({
      requestId: "req-1", at: AT,
      results: [result({ claims: [claim({ subject: " " })] })],
    });
    assert.equal(invalidClaim.ok, false);
    if (!invalidClaim.ok) assert.equal(invalidClaim.code, "INVALID_CLAIM");
  });

  it("deduplicates an identical citation shared by multiple specialist engines", () => {
    const report = reconcile([
      result(),
      result({
        resultId: "result-2",
        engineId: "noctis.risk.rmf",
        claims: [claim({ claimId: "claim-2" })],
      }),
    ]);
    assert.equal(report.evidenceIntegrity.status, "traceable");
    assert.equal(report.claims[0].evidenceStatus, "traceable");
    assert.deepEqual(report.claims[0].sourceIds, ["source-1"]);
  });

  it("marks conflicting metadata for one evidence chunk ID as invalid", () => {
    const report = reconcile([
      result(),
      result({
        resultId: "result-2",
        engineId: "noctis.risk.rmf",
        claims: [claim({ claimId: "claim-2" })],
        evidence: [{ ...evidence, title: "Different title for same chunk" }],
      }),
    ]);
    assert.equal(report.evidenceIntegrity.status, "unverified");
    assert.ok(report.evidenceIntegrity.invalidEvidenceChunkIds.includes("chunk-1"));
  });

  it("does not accept claims emitted by a failed specialist result", () => {
    const failed = reconcileNoctisSpecialistResults({
      requestId: "req-1", at: AT,
      results: [result({ status: "failed", claims: [] }), result({
        resultId: "result-2",
        engineId: "noctis.risk.rmf",
        status: "failed",
        claims: [claim({ claimId: "claim-failed" })],
      })],
    });
    assert.equal(failed.ok, false);
    if (!failed.ok) assert.equal(failed.code, "INVALID_INPUT");
  });

  it("reports evidence hash tampering as unverified", () => {
    const report = reconcile([result({
      evidence: [{ ...evidence, excerpt: "tampered" }],
    })]);
    assert.equal(report.evidenceIntegrity.status, "unverified");
    assert.equal(report.claims[0].evidenceStatus, "unverified");
  });

  it("handles empty specialist results as insufficient evidence", () => {
    const report = reconcile([]);
    assert.equal(report.status, "insufficient_evidence");
    assert.deepEqual(report.claims, []);
    assert.equal(report.humanReviewRecommended, true);
  });

  it("keeps generated time explicit and preserves specialist statements", () => {
    const report = reconcile([result()]);
    assert.equal(report.generatedAt, AT);
    assert.deepEqual(report.claims[0].statements, ["Restricted information is encrypted at rest."]);
    assert.ok(report.limitations.some((item) => item.includes("not calibrated probabilities")));
  });
});
