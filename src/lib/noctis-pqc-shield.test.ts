import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_PQC_ASSETS,
  evaluatePqcMigration,
  formatPqcMigrationMarkdown,
  handleNaturalPqcQuery,
} from "./noctis-pqc-shield.ts";

describe("Noctis Post-Quantum Cryptographic Migration Sentinel (NOCTIS-PQC-001)", () => {
  test("provides complete canonical enterprise cryptographic assets with PQC targets", () => {
    const assets = Object.values(CANONICAL_PQC_ASSETS);
    assert.equal(assets.length >= 4, true);

    for (const a of assets) {
      assert.equal(typeof a.assetId, "string");
      assert.equal(typeof a.name, "string");
      assert.equal(a.classicalKeyLengthBits > 0, true);
      assert.equal(a.recommendedPqcReplacement.length > 5, true);
    }
  });

  test("calculates Mosca's Theorem Y2Q exposure gap and active HNDL risk", () => {
    const state = evaluatePqcMigration({
      assetId: "asset-tls-ingress",
      dataRetentionYears: 10,
      migrationDurationYears: 3,
      projectedY2qArrivalYear: 2032,
    });

    // Protection time: 10 + 3 = 13 years. Years to 2032 from 2026 = 6 years.
    // Exposure gap: 13 - 6 = 7 years.
    assert.equal(state.exposureGapYears, 7);
    assert.equal(state.hndlActiveBreachRisk, true);
    assert.equal(state.quantumReadinessScorePct < 100, true);
    assert.equal(state.cryptographicSeal.length, 64);
  });

  test("generates valid hybrid classical + PQC configuration snippet", () => {
    const state = evaluatePqcMigration({ assetId: "asset-ipsec-vpn" });

    assert.equal(state.hybridConfigurationSnippet.includes("X25519_kyber768"), true);
    assert.equal(state.hybridConfigurationSnippet.includes("NIST FIPS 203"), true);
    assert.equal(state.targetAsset.recommendedPqcReplacement, "ML-KEM-1024 (Kyber)");
  });

  test("formats audited Markdown dossier with all required sections and seal", () => {
    const state = evaluatePqcMigration({ assetId: "asset-db-vault" });
    const md = formatPqcMigrationMarkdown(state);

    assert.equal(md.includes("# Noctis Post-Quantum Cryptographic Migration Sentinel"), true);
    assert.equal(md.includes("Classical vs. Post-Quantum Cryptographic Profile"), true);
    assert.equal(md.includes("Mosca's Theorem Quantum Exposure Horizon"), true);
    assert.equal(md.includes(state.cryptographicSeal), true);
  });

  test("accurately routes natural language PQC queries", () => {
    const tlsQuery = "Evaluate post-quantum cryptography migration for edge TLS gateway with Kyber";
    const resTls = handleNaturalPqcQuery(tlsQuery);
    assert.notEqual(resTls, null);
    assert.equal(resTls?.includes("Edge API & Reverse Proxy Ingress"), true);

    const vpnQuery = "Calculate Y2Q quantum exposure gap for IPSec VPN tunnel";
    const resVpn = handleNaturalPqcQuery(vpnQuery);
    assert.notEqual(resVpn, null);
    assert.equal(resVpn?.includes("IPSec VPN Tunnel"), true);

    // Negative case
    const unrelated = "What is the recipe for chocolate chip cookies?";
    assert.equal(handleNaturalPqcQuery(unrelated), null);
  });
});
