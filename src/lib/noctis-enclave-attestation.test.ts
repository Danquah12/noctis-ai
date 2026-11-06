import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_ENCLAVE_ARCHITECTURES,
  generateEnclaveAttestation,
  formatEnclaveAttestationMarkdown,
  handleNaturalEnclaveQuery,
} from "./noctis-enclave-attestation.ts";

describe("Noctis Confidential Compute Hardware Enclave Attestation (NOCTIS-ENCLAVE-001)", () => {
  test("provides complete canonical hardware architectures with valid roots of trust", () => {
    const archs = Object.values(CANONICAL_ENCLAVE_ARCHITECTURES);
    assert.equal(archs.length >= 3, true);

    for (const a of archs) {
      assert.equal(typeof a.arch, "string");
      assert.equal(typeof a.name, "string");
      assert.equal(a.rootOfTrust.length > 10, true);
      assert.equal(a.certFingerprint.length, 64);
    }
  });

  test("generates cryptographically verified attestation quote with all PCR measurements", () => {
    const quote = generateEnclaveAttestation({ architectureId: "aws-nitro" });

    assert.equal(quote.architecture, "AWS_NITRO_ENCLAVE");
    assert.equal(quote.attestationVerdict, "VERIFIED_CONFIDENTIAL");
    assert.equal(quote.memoryEncryptionStatus, "HARDWARE_ENCRYPTED_AES256");
    assert.equal(quote.hypervisorSnoopProtection, "CERTIFIED_ISOLATED");

    // Check all PCRs are 64-char hex SHA-256 digests
    assert.equal(quote.pcrs.pcr0_bootloader.length, 64);
    assert.equal(quote.pcrs.pcr1_kernel.length, 64);
    assert.equal(quote.pcrs.pcr2_model_weights.length, 64);
    assert.equal(quote.pcrs.pcr8_identity_role.length, 64);

    assert.equal(quote.cryptographicSeal.length, 64);
  });

  test("incorporates custom fresh nonce to defeat replay attacks", () => {
    const customNonce = "FRESH_NONCE_ABCD_1234_5678";
    const quote = generateEnclaveAttestation({
      architectureId: "amd-sev",
      customNonce,
    });

    assert.equal(quote.userNonce, customNonce);
    assert.equal(quote.architecture, "AMD_SEV_SNP");
  });

  test("formats audited Markdown dossier with PCR table and seal", () => {
    const quote = generateEnclaveAttestation({ architectureId: "intel-sgx" });
    const md = formatEnclaveAttestationMarkdown(quote);

    assert.equal(md.includes("# Noctis Confidential Compute Hardware Enclave Attestation"), true);
    assert.equal(md.includes("Platform Configuration Registers"), true);
    assert.equal(md.includes("PCR0"), true);
    assert.equal(md.includes(quote.cryptographicSeal), true);
  });

  test("accurately routes natural language enclave queries", () => {
    const nitroQuery = "Generate AWS Nitro enclave hardware attestation quote with PCR measurements";
    const resNitro = handleNaturalEnclaveQuery(nitroQuery);
    assert.notEqual(resNitro, null);
    assert.equal(resNitro?.includes("AWS_NITRO_ENCLAVE"), true);

    const sevQuery = "Verify AMD SEV-SNP confidential compute memory encryption quote";
    const resSev = handleNaturalEnclaveQuery(sevQuery);
    assert.notEqual(resSev, null);
    assert.equal(resSev?.includes("AMD_SEV_SNP"), true);

    // Negative cases: CMMC / GRC / CUI enclave scoping must never trigger hardware attestation quotes
    const cmmcEnclaveQuery = "Our application processes CUI inside an AWS GovCloud VPC. Laptops live outside the CUI enclave.";
    assert.equal(handleNaturalEnclaveQuery(cmmcEnclaveQuery), null);

    const unrelated = "How to write a poem about trees?";
    assert.equal(handleNaturalEnclaveQuery(unrelated), null);
  });
});
