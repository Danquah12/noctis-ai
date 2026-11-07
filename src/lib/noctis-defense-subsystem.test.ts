import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  runNoctisDefenseAcceptanceTests,
  processSigintEmitter,
  processImintImagery,
  processSensorTelemetry,
  correlateGeospatial,
  matchThreatLibrary,
  evaluateEwAssurance,
  fuseMultiIntObservations,
  handleNaturalDefenseSubsystemQuery,
  type IntelligenceObservation,
} from "./noctis-defense-subsystem.ts";

describe("NOCTIS DEFENSE — Multi-INT Fusion & EW Assurance Engine (NDF-EW-001)", () => {
  it("executes all 25/25 formal production acceptance tests with zero failures", () => {
    const suite = runNoctisDefenseAcceptanceTests();
    assert.equal(suite.total, 25);
    assert.equal(suite.passed, 25);
    for (const r of suite.results) {
      assert.equal(r.status, "PASSED", `Test ${r.id} (${r.test}) failed: ${r.detail}`);
    }
  });

  it("strictly enforces the Mandatory Human Authorization Gateway for EW actions", () => {
    // Missing human authorization -> blocked with 0.0 effectiveness
    const unauthorized = evaluateEwAssurance({
      testEnvironment: "SIMULATION_SYNTHETIC",
      detectionLatencyMs: 120,
      spoofingDeviationMeters: 50,
      commsLossPercent: 2,
      friendlyRfDegraded: false,
      hasHumanAuthorization: false,
    });
    assert.equal(unauthorized.approval_status, "UNAUTHORIZED_EXECUTION_BLOCKED");
    assert.equal(unauthorized.effectiveness_score, 0.0);

    // Authorized defensive exercise -> records audited result
    const authorized = evaluateEwAssurance({
      testEnvironment: "SIMULATION_SYNTHETIC",
      detectionLatencyMs: 120,
      spoofingDeviationMeters: 50,
      commsLossPercent: 2,
      friendlyRfDegraded: false,
      hasHumanAuthorization: true,
    });
    assert.equal(authorized.approval_status, "AUTHORIZED_DEFENSIVE_ONLY");
    assert.ok(authorized.effectiveness_score > 0.9);
  });

  it("preserves contradictory observations without artificial AI reconciliation", () => {
    const base: IntelligenceObservation = {
      observation_id: "obs-test-1",
      source_id: "src-1",
      intelligence_domain: "SIGINT",
      observed_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      classification: "SECRET",
      confidence_score: 0.88,
      integrity_hash: "hash-1",
      provenance: {
        sensor_model: "AIR_SEARCH_RADAR_600",
        calibration_status: "CALIBRATED",
        platform: "AWACS",
        dissemination_controls: [],
        source_reliability: "A",
        information_credibility: "1",
      },
      authorization_id: "AUTH-TEST",
      validation_status: "CONFIRMED",
    };

    const conflict: IntelligenceObservation = {
      ...base,
      observation_id: "obs-test-2",
      integrity_hash: "hash-2",
      provenance: {
        ...base.provenance,
        sensor_model: "BARRAGE_NOISE_JAMMER_800",
      },
    };

    const fusion = fuseMultiIntObservations([base, conflict], { allowContradictionPreservation: true });
    assert.ok(fusion.contradictory_evidence);
    assert.equal(fusion.contradictory_evidence?.reconciliation_disposition, "CONFLICT_PRESERVED");
    assert.equal(fusion.confidence_level, "UNCERTAIN");
  });

  it("handles natural defense intelligence queries in Noctis Desk", () => {
    const answer = handleNaturalDefenseSubsystemQuery("Explain NDF-EW-001 Multi-INT Fusion and EW Assurance architecture");
    assert.ok(answer);
    assert.match(answer, /NOCTIS DEFENSE/i);
    assert.match(answer, /Detection Precision/);
    assert.match(answer, /25\/25 GATES PASSED/);
    assert.match(answer, /MANDATORY AUTHORIZATION REQUIRED/);
  });
});
