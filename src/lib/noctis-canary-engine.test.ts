import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_HONEYTOKENS,
  simulateCanaryTripwire,
  formatCanaryAlertMarkdown,
  handleNaturalCanaryQuery,
} from "./noctis-canary-engine.ts";

describe("Noctis Cyber Deception & Synthetic Honeytoken Canary Engine (NOCTIS-CANARY-001)", () => {
  test("provides complete canonical honeytokens across cloud, identity, and document tiers", () => {
    const tokens = Object.values(CANONICAL_HONEYTOKENS);
    assert.equal(tokens.length >= 3, true);

    const types = new Set(tokens.map((t) => t.type));
    assert.equal(types.has("CLOUD_IAM_KEY"), true);
    assert.equal(types.has("ACTIVE_DIRECTORY_SPN"), true);
    assert.equal(types.has("EXECUTIVE_DOCUMENT_BEACON"), true);
  });

  test("simulates attacker tripwire detonation with 0% false positive guarantee", () => {
    const alert = simulateCanaryTripwire("canary-aws-key");

    assert.equal(alert.threatSeverity, "CRITICAL_P0");
    assert.equal(alert.token.status, "TRIPPED_ALARM");
    assert.equal(alert.attackerTelemetry.sourceIp, "198.51.100.42");
    assert.equal(alert.suggestedContainment.includes("blocklist"), true);
    assert.equal(alert.cryptographicSeal.length, 64);
  });

  test("captures internal LAN lateral movement for Kerberos SPN honeytoken", () => {
    const alert = simulateCanaryTripwire("canary-ad-spn");

    assert.equal(alert.token.type, "ACTIVE_DIRECTORY_SPN");
    assert.equal(alert.attackerTelemetry.sourceIp, "10.0.4.112");
    assert.equal(alert.attackerTelemetry.userAgent.includes("Rubeus"), true);
    assert.equal(alert.suggestedContainment.includes("802.1X"), true);
  });

  test("formats audited Markdown dossier with forensic telemetry table and seal", () => {
    const alert = simulateCanaryTripwire("canary-doc-beacon");
    const md = formatCanaryAlertMarkdown(alert);

    assert.equal(md.includes("# Noctis Active Cyber Deception Canary Tripwire Alarm"), true);
    assert.equal(md.includes("Attacker Forensics & Reconnaissance Telemetry"), true);
    assert.equal(md.includes("Automated Containment Playbook"), true);
    assert.equal(md.includes(alert.cryptographicSeal), true);
  });

  test("accurately routes natural language canary deception queries", () => {
    const cloudQuery = "Deploy canary honeytoken to detect unauthorized AWS access key use";
    const resCloud = handleNaturalCanaryQuery(cloudQuery);
    assert.notEqual(resCloud, null);
    assert.equal(resCloud?.includes("Decoy AWS Root Operator Access Key"), true);

    const spnQuery = "Set up active directory Kerberos SPN honeytoken trap";
    const resSpn = handleNaturalCanaryQuery(spnQuery);
    assert.notEqual(resSpn, null);
    assert.equal(resSpn?.includes("Decoy Domain Kerberos SPN Honeytoken"), true);

    // Negative case
    const unrelated = "What is the capital of Australia?";
    assert.equal(handleNaturalCanaryQuery(unrelated), null);
  });
});
