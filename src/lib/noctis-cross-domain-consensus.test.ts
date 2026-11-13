import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  runCrossDomainConsensus,
  simulateCrossDomainScenario,
  PREDEFINED_CROSS_DOMAIN_SCENARIOS,
  type CrossDomainIncidentInput,
} from "./noctis-cross-domain-consensus.ts";

describe("Noctis Cross-Domain Consensus Swarm (Phase 4)", () => {
  it("deliberates on hospital ransomware infusion scenario with Safety invariant override", () => {
    const result = simulateCrossDomainScenario("hospital_ransomware_infusion");

    assert.equal(result.severity, "CRITICAL");
    assert.equal(result.governingSqdecPillar, "Safety");
    assert.equal(result.participatingSuites.length, 4);

    // Verify round 1 assessments
    const cyberAssessment = result.round1Assessments.find((a) => a.suiteId === "noctis-cyber");
    const healthAssessment = result.round1Assessments.find((a) => a.suiteId === "noctis-health");
    assert.ok(cyberAssessment);
    assert.ok(healthAssessment);
    assert.equal(healthAssessment.invariantVeto.triggered, true);
    assert.equal(healthAssessment.invariantVeto.invariantId, "INV-PATIENT-SAFETY-001");

    // Verify round 2 conflict detection and SQDEC arbitration
    const conflict = result.conflictsDetected.find((c) => c.conflictId === "CONF-001-CYBER-VS-HEALTH");
    assert.ok(conflict);
    assert.equal(conflict.arbitratedWinner, "noctis-health");
    assert.match(conflict.reconciliationRationale, /Safety.*strictly supersedes.*Control/i);

    // Verify round 3 consensus attestation
    assert.equal(result.consensusStatus, "ARBITRATED_OVERRIDE");
    assert.equal(result.vetoesExercised.length, 1);
    assert.equal(result.consensusAttestationSha256.length, 64);
    assert.match(result.auditSignature, /^SIG-NOCTIS-SWARM-[0-9A-F]{16}$/);
    assert.equal(result.unifiedActionDirectives.length, 5);
  });

  it("arbitrates financial market manipulation with Legal/Quality priority over Economics", () => {
    const result = simulateCrossDomainScenario("flash_crash_market_manipulation");

    assert.equal(result.severity, "CRITICAL");
    const conflict = result.conflictsDetected.find((c) => c.conflictId === "CONF-002-FIN-VS-LEGAL");
    assert.ok(conflict);
    assert.equal(conflict.arbitratedWinner, "noctis-legal");
    assert.match(conflict.reconciliationRationale, /Quality.*supersedes.*Economics/i);
    assert.equal(result.consensusAttestationSha256.length, 64);
  });

  it("arbitrates defense firmware supply chain incident with ITAR integrity veto", () => {
    const result = simulateCrossDomainScenario("defense_firmware_supply_chain");

    assert.equal(result.governingSqdecPillar, "Safety");
    const conflict = result.conflictsDetected.find((c) => c.conflictId === "CONF-003-DEF-VS-ENG");
    assert.ok(conflict);
    assert.equal(conflict.arbitratedWinner, "noctis-defense");
    assert.ok(result.vetoesExercised.some((v) => v.invariantId === "INV-ITAR-INTEGRITY-001"));
  });

  it("arbitrates hybrid critical infrastructure incident (OT pressure surge + 5G desync + PQC harvesting)", () => {
    const result = simulateCrossDomainScenario("hybrid_ot_5g_pqc_cascade");

    assert.equal(result.severity, "CRITICAL");
    assert.equal(result.governingSqdecPillar, "Safety");
    assert.equal(result.participatingSuites.length, 4);

    // Verify infrastructure safety veto was triggered
    const infraAssessment = result.round1Assessments.find((a) => a.suiteId === "noctis-infrastructure");
    assert.ok(infraAssessment);
    assert.equal(infraAssessment.invariantVeto.triggered, true);
    assert.equal(infraAssessment.invariantVeto.invariantId, "INV-SCADA-SAFETY-001");

    // Verify consensus attestation and SHA-256 seal
    assert.equal(result.consensusStatus, "ARBITRATED_OVERRIDE");
    assert.ok(result.vetoesExercised.some((v) => v.invariantId === "INV-SCADA-SAFETY-001"));
    assert.equal(result.consensusAttestationSha256.length, 64);
    assert.match(result.auditSignature, /^SIG-NOCTIS-SWARM-[0-9A-F]{16}$/);
    assert.ok(result.unifiedActionDirectives.length >= 5);
  });

  it("evaluates custom cross-domain incident dynamically", () => {
    const customIncident: CrossDomainIncidentInput = {
      title: "SCADA Water Treatment Chlorine Anomaly",
      description: "PLC telemetry reports out-of-band chlorine dosing while external SSH access observed.",
      severity: "HIGH",
      domainsInvolved: ["noctis-infrastructure", "noctis-cyber"],
      telemetryPayload: {
        plcAddress: "10.200.4.12",
        chlorinePpm: 12.8,
        nominalPpm: 2.0,
      },
    };

    const result = runCrossDomainConsensus(customIncident);
    assert.equal(result.title, "SCADA Water Treatment Chlorine Anomaly");
    assert.equal(result.severity, "HIGH");
    assert.equal(result.governingSqdecPillar, "Safety");
    assert.equal(result.participatingSuites.length, 2);
    assert.equal(result.consensusAttestationSha256.length, 64);
  });

  it("throws informative error on unknown scenario key", () => {
    assert.throws(
      () => simulateCrossDomainScenario("non_existent_key"),
      /Scenario 'non_existent_key' not found/
    );
  });
});
