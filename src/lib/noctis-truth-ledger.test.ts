/**
 * Unit Test Suite for Noctis Cryptographic Epistemic Truth Ledger (NOCTIS-LEDGER-001)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  sha256Digest,
  computeMerkleRoot,
  calculateEpistemicMetrics,
  CANONICAL_TRUTH_BUNDLES,
  analyzeTextEpistemicLedger,
  formatTruthLedgerMarkdown,
  exportTruthLedgerJson,
  handleNaturalTruthLedgerQuery,
  type EpistemicClaim,
} from "./noctis-truth-ledger.ts";
import { runFollowUpIntelligence } from "./noctis-response-intelligence.ts";

describe("Noctis Cryptographic Epistemic Truth Ledger", () => {
  test("computes deterministic SHA-256 digests accurately", () => {
    const hash1 = sha256Digest("hello world");
    const hash2 = sha256Digest("hello world");
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
    assert.equal(hash1, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  test("computes balanced Merkle Trees for empty, single, even, and odd leaf sets", () => {
    // Empty
    const emptyRoot = computeMerkleRoot([]);
    assert.equal(emptyRoot.length, 64);

    // Single leaf
    const leafA = sha256Digest("leafA");
    const singleRoot = computeMerkleRoot([leafA]);
    assert.equal(singleRoot, leafA);

    // Even (2 leaves)
    const leafB = sha256Digest("leafB");
    const evenRoot = computeMerkleRoot([leafA, leafB]);
    assert.equal(evenRoot, sha256Digest(leafA + leafB));

    // Odd (3 leaves)
    const leafC = sha256Digest("leafC");
    const oddRoot = computeMerkleRoot([leafA, leafB, leafC]);
    assert.equal(oddRoot.length, 64);
  });

  test("calculates Epistemic Rigor Score based on weighted distribution of claims", () => {
    const claims: EpistemicClaim[] = [
      {
        id: "C1",
        claimText: "Math 1+1=2",
        badge: "DETERMINISTIC_PROOF", // 1.0
        confidenceScore: 1.0,
        sourceAttestation: "Arithmetic",
        verificationMethod: "Proof",
        sha256Proof: sha256Digest("C1"),
      },
      {
        id: "C2",
        claimText: "SEC 10-Q filing CRWD",
        badge: "PRIMARY_AUDITED_SOURCE", // 0.95
        confidenceScore: 0.99,
        sourceAttestation: "SEC",
        verificationMethod: "EDGAR",
        sha256Proof: sha256Digest("C2"),
      },
      {
        id: "C3",
        claimText: "Hypothetical +200 bps yield increase",
        badge: "SCENARIO_HYPOTHESIS", // 0.60
        confidenceScore: 0.85,
        sourceAttestation: "Model",
        verificationMethod: "Simulation",
        sha256Proof: sha256Digest("C3"),
      },
    ];

    const metrics = calculateEpistemicMetrics(claims);
    assert.equal(metrics.totalClaims, 3);
    assert.equal(metrics.deterministicCount, 1);
    assert.equal(metrics.primarySourceCount, 1);
    assert.equal(metrics.hypothesisCount, 1);
    // (1.0 + 0.95 + 0.60) / 3 = 2.55 / 3 = 0.85 = 85.0%
    assert.equal(metrics.epistemicRigorScore, 85.0);
  });

  test("provides pre-audited canonical truth bundles with valid Merkle roots", () => {
    const fin = CANONICAL_TRUTH_BUNDLES["bundle-financial-runway"];
    assert.ok(fin);
    assert.equal(fin.claims.length, 5);
    assert.equal(fin.merkleRoot.length, 64);
    assert.equal(fin.attestationDigest.length, 64);
    assert.ok(fin.metrics.epistemicRigorScore >= 85.0);

    const cyb = CANONICAL_TRUTH_BUNDLES["bundle-cyber-ransomware"];
    assert.ok(cyb);
    assert.equal(cyb.claims.length, 5);
    assert.equal(cyb.merkleRoot.length, 64);
  });

  test("analyzes raw text dynamically into tagged epistemic claims with Merkle proof", () => {
    const text = `
    The enterprise runway was computed as calculate_runway(1450000, 110000) yielding exactly 13.18 months.
    According to SEC EDGAR Q2 10-Q filings, operating cash flow conversion was positive.
    The Council of Engines issued a consensus verdict of CONDITIONAL_APPROVAL.
    Assuming a stress scenario with interest rates jumping 200 bps over the next quarter.
    `;

    const bundle = analyzeTextEpistemicLedger(text, "Quarterly Solvency Review");
    assert.ok(bundle.claims.length >= 3);
    assert.equal(bundle.merkleRoot.length, 64);
    assert.equal(bundle.attestationDigest.length, 64);
    assert.ok(bundle.claims.some((c) => c.badge === "DETERMINISTIC_PROOF"));
    assert.ok(bundle.claims.some((c) => c.badge === "PRIMARY_AUDITED_SOURCE"));
  });

  test("formats Markdown dossier and JSON export accurately", () => {
    const fin = CANONICAL_TRUTH_BUNDLES["bundle-financial-runway"];
    const markdown = formatTruthLedgerMarkdown(fin);
    assert.ok(markdown.includes("# Noctis Cryptographic Epistemic Truth Ledger"));
    assert.ok(markdown.includes("### 1. Epistemic Claim Distribution & Rigor Metrics"));
    assert.ok(markdown.includes("### 2. Itemized Cryptographic Proof-of-Fact Ledger"));
    assert.ok(markdown.includes("### 3. Cryptographic Attestation & Merkle Proof"));
    assert.ok(markdown.includes(fin.merkleRoot));

    const jsonStr = exportTruthLedgerJson(fin);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.bundleId, fin.bundleId);
    assert.equal(parsed.merkleRoot, fin.merkleRoot);
    assert.equal(parsed.claims.length, 5);
  });

  test("routes natural language truth ledger queries to appropriate audit bundles", () => {
    const cybQuery = handleNaturalTruthLedgerQuery("Can you audit the epistemic truth ledger for the ransomware incident?");
    assert.ok(cybQuery);
    assert.ok(cybQuery.includes("Active Directory Intrusion"));

    const finQuery = handleNaturalTruthLedgerQuery("Show the cryptographic Merkle root for the enterprise runway calculation");
    assert.ok(finQuery);
    assert.ok(finQuery.includes("Enterprise Runway & Valuation DCF"));

    const unrelated = handleNaturalTruthLedgerQuery("What is the capital of France?");
    assert.equal(unrelated, null);
  });

  test("integrates smoothly with runFollowUpIntelligence router", () => {
    const response = runFollowUpIntelligence([], "Audit epistemic truth ledger and calculate Merkle root for enterprise runway");
    assert.ok(response);
    assert.ok(response.includes("NOCTIS-LEDGER-001") || response.includes("Truth Ledger"));
    assert.ok(response.includes("Merkle Tree Root") || response.includes("Merkle Root"));
    assert.ok(response.includes("Epistemic Rigor Score"));
  });
});
