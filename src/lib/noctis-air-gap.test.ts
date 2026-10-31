/**
 * Unit Test Suite for Noctis Sovereign Local WebGPU / WASM "Air-Gap Mode" (NOCTIS-AIRGAP-001)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PREDEFINED_AIR_GAP_SCENARIOS,
  evaluateAirGapSentinel,
  formatAirGapDossierMarkdown,
  handleNaturalAirGapQuery,
} from "./noctis-air-gap.ts";
import { runFollowUpIntelligence } from "./noctis-response-intelligence.ts";

describe("Noctis Sovereign Local WebGPU / WASM 'Air-Gap Mode'", () => {
  test("provides 3 canonical classified and confidential air-gap scenarios", () => {
    const keys = Object.keys(PREDEFINED_AIR_GAP_SCENARIOS);
    assert.equal(keys.length, 3);
    assert.ok(PREDEFINED_AIR_GAP_SCENARIOS["scenario-scif-defense"]);
    assert.ok(PREDEFINED_AIR_GAP_SCENARIOS["scenario-ma-confidential"]);
    assert.ok(PREDEFINED_AIR_GAP_SCENARIOS["scenario-phi-hipaa"]);
  });

  test("guarantees 0 outbound WAN packets transmitted when Air-Gap is active", () => {
    const result = evaluateAirGapSentinel("scenario-scif-defense", true);
    assert.equal(result.certificate.packetsTransmittedWan, 0);
    assert.equal(result.certificate.airGapState, "AIR_GAP_ACTIVE");
    assert.ok(result.certificate.packetsOutboundBlocked >= 2);
    assert.equal(result.certificate.cryptographicSeal.length, 64);
  });

  test("intercepts external LLM API and DNS leak attempts in egress sniffer logs", () => {
    const result = evaluateAirGapSentinel("scenario-scif-defense", true);
    const blockedLogs = result.recentEgressLogs.filter((l) => l.verdict === "BLOCKED_AIR_GAP");
    assert.ok(blockedLogs.length >= 2);
    assert.ok(blockedLogs.some((l) => l.protocol === "HTTPS"));
    assert.ok(blockedLogs.some((l) => l.protocol === "DNS"));
  });

  test("formats audited Markdown dossier with all 4 required sections and seal", () => {
    const result = evaluateAirGapSentinel("scenario-ma-confidential", true);
    const md = formatAirGapDossierMarkdown(result);

    assert.ok(md.includes("# Noctis Sovereign Local WebGPU / WASM \"Air-Gap Mode\""));
    assert.ok(md.includes("### 1. Zero-Packet Egress Isolation & Compute Invariants"));
    assert.ok(md.includes("### 2. Active Local WASM / WebGPU Deterministic Solvers"));
    assert.ok(md.includes("### 3. Egress Packet Sniffer Telemetry Log"));
    assert.ok(md.includes("### 4. Cryptographic Zero-Egress Attestation Seal"));
    assert.ok(md.includes("0 PACKETS TRANSMITTED"));
    assert.ok(md.includes(result.certificate.cryptographicSeal));
  });

  test("routes natural language air-gap queries to appropriate mission templates", () => {
    const scif = handleNaturalAirGapQuery("Enable air-gap mode for SCIF critical infrastructure assessment");
    assert.ok(scif);
    assert.ok(scif.includes("DoD SCIF Classified Mission"));

    const ma = handleNaturalAirGapQuery("Activate zero-egress offline mode for confidential board merger due diligence");
    assert.ok(ma);
    assert.ok(ma.includes("Board M&A Due Diligence"));

    const unrelated = handleNaturalAirGapQuery("How do I bake sourdough bread?");
    assert.equal(unrelated, null);
  });

  test("integrates smoothly with runFollowUpIntelligence router", () => {
    const response = runFollowUpIntelligence([], "Activate zero-packet air-gap mode for SCIF classified inspection");
    assert.ok(response);
    assert.ok(response.includes("NOCTIS-AIRGAP-001") || response.includes("Air-Gap Mode"));
    assert.ok(response.includes("0 PACKETS TRANSMITTED"));
    assert.ok(response.includes("Egress Packet Sniffer"));
  });
});
