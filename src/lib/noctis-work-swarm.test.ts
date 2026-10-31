/**
 * Unit Test Suite for Noctis Autonomous "Work Swarm" Orchestrator (NOCTIS-SWARM-001)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PREDEFINED_SWARM_MISSIONS,
  runWorkSwarmMission,
  formatSwarmMissionMarkdown,
  exportSwarmMissionJson,
  handleNaturalWorkSwarmQuery,
} from "./noctis-work-swarm.ts";
import { runFollowUpIntelligence } from "./noctis-response-intelligence.ts";

describe("Noctis Autonomous 'Work Swarm' Orchestrator", () => {
  test("provides predefined enterprise missions across finance and cybersecurity", () => {
    const keys = Object.keys(PREDEFINED_SWARM_MISSIONS);
    assert.ok(keys.length >= 2);
    assert.ok(PREDEFINED_SWARM_MISSIONS["mission-enterprise-solvency"]);
    assert.ok(PREDEFINED_SWARM_MISSIONS["mission-ransomware-defense"]);
  });

  test("executes complete 4-stage pipeline with all agent roles verified", () => {
    const result = runWorkSwarmMission("mission-enterprise-solvency");
    assert.equal(result.pipelineStages.length, 4);

    const roles = result.pipelineStages.map((s) => s.role);
    assert.deepEqual(roles, ["HARVESTER", "QUANT_SOLVER", "CHALLENGER", "PUBLISHER"]);

    for (const stage of result.pipelineStages) {
      assert.equal(stage.status, "VERIFIED");
      assert.ok(stage.executionDurationMs > 0);
      assert.equal(stage.stageHash.length, 64); // SHA-256
    }

    assert.equal(result.overallSwarmHash.length, 64);
    assert.ok(result.totalDurationMs > 0);
  });

  test("verifies Harvester telemetry and entity extraction integrity", () => {
    const mission = PREDEFINED_SWARM_MISSIONS["mission-enterprise-solvency"];
    assert.ok(mission.harvesterArtifact.sourcesIngested.length >= 3);
    assert.equal(mission.harvesterArtifact.extractedEntities.CashReserves, 1450000);
    assert.equal(mission.harvesterArtifact.extractedEntities.MonthlyBurnRate, 110000);
    assert.ok(mission.harvesterArtifact.telemetryIntegrityScore >= 98.0);
  });

  test("verifies Quant Solver deterministic calculations and LaTeX formulas", () => {
    const mission = PREDEFINED_SWARM_MISSIONS["mission-enterprise-solvency"];
    const runway = mission.quantArtifact.solvedInvariants.find((i) => i.name === "Enterprise Runway");
    assert.ok(runway);
    assert.equal(runway.value, 13.18);
    assert.equal(runway.unit, "Months");
    assert.ok(runway.formulaLatex.includes("1,450,000"));
    assert.equal(mission.quantArtifact.computationalConfidence, 100.0);
  });

  test("verifies Adversarial Challenger tail risks and stress shocks", () => {
    const mission = PREDEFINED_SWARM_MISSIONS["mission-ransomware-defense"];
    assert.ok(mission.challengerArtifact.tailRisksIdentified.length >= 2);
    assert.ok(mission.challengerArtifact.stressShocksEvaluated.length >= 2);
    assert.ok(mission.challengerArtifact.counterFactualScore >= 90.0);
  });

  test("verifies Executive Publisher verdict and cryptographic seal", () => {
    const mission = PREDEFINED_SWARM_MISSIONS["mission-ransomware-defense"];
    assert.equal(mission.publisherArtifact.executiveVerdict, "HARDEN_AND_REASSESS");
    assert.ok(mission.publisherArtifact.strategicDirectives.length >= 3);
    assert.equal(mission.publisherArtifact.cryptographicSeal.length, 64);
    assert.ok(mission.publisherArtifact.epistemicRigorScore >= 90.0);
  });

  test("formats audited Markdown dossier with all 6 required sections", () => {
    const result = runWorkSwarmMission("mission-enterprise-solvency");
    const markdown = formatSwarmMissionMarkdown(result);

    assert.ok(markdown.includes("# Noctis Autonomous \"Work Swarm\" Orchestrator"));
    assert.ok(markdown.includes("### 1. Autonomous 4-Stage Agent Pipeline Progression"));
    assert.ok(markdown.includes("### 2. 📥 Stage 1: Harvester Agent"));
    assert.ok(markdown.includes("### 3. 🧮 Stage 2: Quant Solver"));
    assert.ok(markdown.includes("### 4. ⚔️ Stage 3: Adversarial Challenger"));
    assert.ok(markdown.includes("### 5. 🏛️ Stage 4: Executive Board Publisher"));
    assert.ok(markdown.includes("### 6. Cryptographic Swarm Verification Hash"));
    assert.ok(markdown.includes(result.overallSwarmHash));
  });

  test("exports valid parseable JSON mission bundle", () => {
    const result = runWorkSwarmMission("mission-ransomware-defense");
    const jsonStr = exportSwarmMissionJson(result);
    const parsed = JSON.parse(jsonStr);

    assert.equal(parsed.executionId, result.executionId);
    assert.equal(parsed.overallSwarmHash, result.overallSwarmHash);
    assert.equal(parsed.pipelineStages.length, 4);
  });

  test("routes natural language work swarm queries to appropriate missions", () => {
    const rsw = handleNaturalWorkSwarmQuery("Orchestrate an agent swarm for the ransomware active directory recovery incident");
    assert.ok(rsw);
    assert.ok(rsw.includes("Active Directory Recovery Inhibition"));

    const fin = handleNaturalWorkSwarmQuery("Run a multi-agent work swarm to analyze enterprise solvency and runway");
    assert.ok(fin);
    assert.ok(rsw.includes("Domain: Cyber Incident") || fin.includes("Financial Solvency"));

    const unrelated = handleNaturalWorkSwarmQuery("What is the recipe for chocolate cake?");
    assert.equal(unrelated, null);
  });

  test("integrates smoothly with runFollowUpIntelligence router", () => {
    const response = runFollowUpIntelligence([], "Run a multi-agent work swarm to analyze enterprise solvency and runway");
    assert.ok(response);
    assert.ok(response.includes("NOCTIS-SWARM-001") || response.includes("Work Swarm"));
    assert.ok(response.includes("Harvester Agent"));
    assert.ok(response.includes("Quant Solver"));
    assert.ok(response.includes("Adversarial Challenger"));
  });
});
