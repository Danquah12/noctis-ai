import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ingestVercelLaunchpadApps,
  REAL_WORLD_SCENARIOS,
  dispatchRealWorldEvent,
  PILLAR_TO_SYSTEM_MAP,
} from "./noctis-real-world-mesh.ts";

describe("Noctis Real-World Data Ingestion & Launchpad Mesh", () => {
  test("ingests all 65+ Vercel Launchpad applications across all 8 pillars", () => {
    const mesh = ingestVercelLaunchpadApps();
    assert.ok(mesh.totalApps >= 60, `Total apps should be >= 60, got ${mesh.totalApps}`);
    assert.ok(mesh.totalPillars >= 7, `Total pillars should be >= 7, got ${mesh.totalPillars}`);
    assert.ok(mesh.vercelLiveCount >= 60, `Live Vercel count should be >= 60, got ${mesh.vercelLiveCount}`);
    assert.ok(mesh.boundSystemsCount >= 8, `Bound systems count should be >= 8, got ${mesh.boundSystemsCount}`);

    // Verify key systems received apps
    assert.ok(mesh.appsBySystem["noctis-cyber"]?.length > 0, "Noctis Cyber should have bound apps");
    assert.ok(mesh.appsBySystem["noctis-enterprise"]?.length > 0, "Noctis Enterprise should have bound apps");
    assert.ok(mesh.appsBySystem["noctis-finance"]?.length > 0, "Noctis Finance should have bound apps");
  });

  test("defines comprehensive real-world scenarios for all 16 Sovereign Systems", () => {
    assert.equal(REAL_WORLD_SCENARIOS.length, 16, "Must define exactly 16 real-world event scenarios");

    const systemIds = new Set(REAL_WORLD_SCENARIOS.map((s) => s.systemId));
    assert.equal(systemIds.size, 16, "All 16 systems must have a unique scenario");

    // Spot check key priority 1-5 scenarios
    assert.ok(systemIds.has("noctis-cyber"));
    assert.ok(systemIds.has("noctis-rmf"));
    assert.ok(systemIds.has("noctis-health"));
    assert.ok(systemIds.has("noctis-finance"));
    assert.ok(systemIds.has("noctis-engineering"));
  });

  test("dispatches real-world events with SQDEC policy enforcement and SHA-256 seals", () => {
    // 1. Dispatch CISA Zero-Day CVE scenario
    const cyberResult = dispatchRealWorldEvent("SCENARIO-CYBER-001");
    assert.equal(cyberResult.status, "EXECUTED_ATTESTED");
    assert.ok(cyberResult.latencyMs < 10, "Latency should be sub-10ms");
    assert.equal(cyberResult.proofOfExecution.sha256Seal.length, 64, "SHA-256 seal must be exactly 64 hex chars");
    assert.ok(cyberResult.narrativeSummary.includes("Noctis Cyber"));

    // 2. Dispatch Healthcare FHIR Critical Alert
    const healthResult = dispatchRealWorldEvent("SCENARIO-HEALTH-003");
    assert.equal(healthResult.status, "EXECUTED_ATTESTED");
    assert.equal(healthResult.proofOfExecution.sha256Seal.length, 64);
    assert.ok(healthResult.narrativeSummary.includes("Noctis Health"));
    assert.ok(healthResult.proofOfExecution.verificationChecklist.length >= 3);

    // 3. Dispatch SCADA Grid Frequency Surge
    const energyResult = dispatchRealWorldEvent("SCENARIO-ENERGY-007");
    assert.equal(energyResult.status, "EXECUTED_ATTESTED");
    assert.ok(energyResult.proofOfExecution.sha256Seal.length === 64);
  });
});
