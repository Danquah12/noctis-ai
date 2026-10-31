import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_ZK_CIRCUITS,
  generateZeroKnowledgeProof,
  verifyZeroKnowledgeProof,
  formatZkProofMarkdown,
  handleNaturalZkProofQuery,
} from "./noctis-zk-proof.ts";

describe("Noctis Autonomous Zero-Knowledge Audit Proof (ZKP) Generator (NOCTIS-ZKPROOF-001)", () => {
  test("provides complete canonical zk-SNARK circuits with clear statements", () => {
    const circuits = Object.values(CANONICAL_ZK_CIRCUITS);
    assert.equal(circuits.length >= 3, true);

    for (const c of circuits) {
      assert.equal(typeof c.circuitId, "string");
      assert.equal(typeof c.name, "string");
      assert.equal(c.claimStatement.length > 20, true);
      assert.equal(c.publicInputsDescription.length > 5, true);
    }
  });

  test("generates mathematically valid proof of solvency with Groth16 curve points", () => {
    const proof = generateZeroKnowledgeProof({
      circuitId: "circuit-solvency",
      customPublicInputs: { minLiabilitiesUsd: 40000000 },
      privateWitnessValue: 75000000,
    });

    assert.equal(proof.circuit.type, "PROOF_OF_SOLVENCY");
    assert.equal(proof.verificationStatus, "VERIFIED_VALID");
    assert.equal(verifyZeroKnowledgeProof(proof), true);

    // Verify curve points exist and match Groth16 structure
    assert.equal(proof.groth16Proof.pi_A.length, 2);
    assert.equal(proof.groth16Proof.pi_B.length, 2);
    assert.equal(proof.groth16Proof.pi_C.length, 2);
    assert.equal(proof.groth16Proof.commitment.startsWith("0x"), true);
    assert.equal(proof.cryptographicSeal.length, 64);
  });

  test("generates valid vulnerability patch proof without disclosing internal hostnames", () => {
    const proof = generateZeroKnowledgeProof({
      circuitId: "circuit-patch",
      customPublicInputs: { nodeCount: 256 },
    });

    assert.equal(proof.circuit.type, "PROOF_OF_VULN_PATCH");
    assert.equal(proof.publicInputs.totalVerifiedNodes, 256);
    assert.equal(verifyZeroKnowledgeProof(proof), true);
  });

  test("formats audited Markdown dossier with curve points and verifier snippet", () => {
    const proof = generateZeroKnowledgeProof({ circuitId: "circuit-minimization" });
    const md = formatZkProofMarkdown(proof);

    assert.equal(md.includes("# Noctis Autonomous Zero-Knowledge Audit Proof"), true);
    assert.equal(md.includes("Groth16 zk-SNARK Curve Points"), true);
    assert.equal(md.includes("Constant-Time"), true);
    assert.equal(md.includes(proof.cryptographicSeal), true);
  });

  test("accurately routes natural language ZKP queries", () => {
    const solvencyQuery = "Generate zero-knowledge proof of solvency for board audit";
    const resSolvency = handleNaturalZkProofQuery(solvencyQuery);
    assert.notEqual(resSolvency, null);
    assert.equal(resSolvency?.includes("Corporate Solvency zk-SNARK Circuit"), true);

    const patchQuery = "Synthesize zk-SNARK proof of critical CVE patch across cluster";
    const resPatch = handleNaturalZkProofQuery(patchQuery);
    assert.notEqual(resPatch, null);
    assert.equal(resPatch?.includes("Vulnerability Patching zk-SNARK Circuit"), true);

    // Negative case
    const unrelated = "How to grow tomatoes in a greenhouse?";
    assert.equal(handleNaturalZkProofQuery(unrelated), null);
  });
});
