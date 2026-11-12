import { test, describe } from "node:test";
import assert from "node:assert";
import {
  evaluateDistributedRaftQuorum,
  evaluateBgpRouteFlapDampening,
  evaluatePostgresMvccIsolation,
  evaluateSreErrorBudget,
  evaluateAmdahlSpeedup,
  evaluateLinuxEbpfSafety,
  evaluateOAuth2PkceSecurity,
  evaluateLlmInferenceMemory,
  evaluateDisasterRecoveryInvariants,
  evaluateRaidRebuildUreRisk,
  generateAllInformationTechnologyScenarios,
  handleNaturalInformationTechnologyQuery,
} from "./noctis-it-master-engine.ts";

describe("NOCTIS-IT-MASTER-001: Sovereign Information Technology Master Engine", () => {
  test("evaluates Domain 1: Cloud Architecture & Raft Distributed Quorum", () => {
    const res1 = evaluateDistributedRaftQuorum({ clusterNodes: 5, unresponsiveNodes: 1 });
    assert.strictEqual(res1.passed, true);
    assert.strictEqual(res1.calculations.quorumRequired, 3);
    assert.strictEqual(res1.calculations.hasQuorum, true);

    const res2 = evaluateDistributedRaftQuorum({ clusterNodes: 5, unresponsiveNodes: 3 });
    assert.strictEqual(res2.passed, false);
    assert.strictEqual(res2.calculations.hasQuorum, false);
  });

  test("evaluates Domain 2: Enterprise Networking & BGP Flap Dampening", () => {
    const res = evaluateBgpRouteFlapDampening({ routeFlapCount: 3, flapTimeWindowSeconds: 60 });
    assert.strictEqual(res.passed, true);
    assert.strictEqual(res.calculations.flapsRecorded, 3);
    assert.strictEqual(res.calculations.routeSuppressed, true);
  });

  test("evaluates Domain 3: Databases & PostgreSQL MVCC Isolation", () => {
    const res1 = evaluatePostgresMvccIsolation({ isolationLevel: "SERIALIZABLE", concurrentWriteDetected: false, writeSkewPotential: false });
    assert.strictEqual(res1.passed, true);
    assert.strictEqual(res1.calculations.allowsWriteSkew, false);

    const res2 = evaluatePostgresMvccIsolation({ isolationLevel: "READ_COMMITTED", concurrentWriteDetected: false, writeSkewPotential: true });
    assert.strictEqual(res2.passed, false);
  });

  test("evaluates Domain 4: DevOps & SRE Error Budget Enforcement", () => {
    const res1 = evaluateSreErrorBudget({ targetSloPercent: 99.9, periodDays: 30, currentOutageMinutes: 10 });
    assert.strictEqual(res1.passed, true);
    assert.strictEqual(res1.calculations.totalWindowMinutes, 43200);

    const res2 = evaluateSreErrorBudget({ targetSloPercent: 99.9, periodDays: 30, currentOutageMinutes: 50 });
    assert.strictEqual(res2.passed, false);
  });

  test("evaluates Domain 5: Software Architecture & Amdahl's Law", () => {
    const res = evaluateAmdahlSpeedup({ parallelFraction: 0.85, processorCores: 64 });
    assert.strictEqual(res.passed, true);
    assert.ok(Number(res.calculations.actualSpeedup) > 6.0);
  });

  test("evaluates Domain 6: Operating Systems & Linux Kernel eBPF Verifier", () => {
    const res = evaluateLinuxEbpfSafety({ instructionCount: 5000, unboundedLoopDetected: false, unalignedMemoryAccess: false, helperFunctionIdValid: true });
    assert.strictEqual(res.passed, true);
    assert.strictEqual(res.calculations.verifierPassed, true);
  });

  test("evaluates Domain 7: Identity, Access & RFC 7636 PKCE Security", () => {
    const res1 = evaluateOAuth2PkceSecurity({ codeChallengeMethod: "S256", hasClientSecretOnPublicClient: false, tokenEndpointTlsVersion: 1.3 });
    assert.strictEqual(res1.passed, true);

    const res2 = evaluateOAuth2PkceSecurity({ codeChallengeMethod: "plain", hasClientSecretOnPublicClient: true, tokenEndpointTlsVersion: 1.1 });
    assert.strictEqual(res2.passed, false);
    assert.strictEqual(res2.safetyVetoes.length, 3);
  });

  test("evaluates Domain 8: AI/MLOps Infrastructure & KV-Cache Sizing", () => {
    const res = evaluateLlmInferenceMemory({ parameterCountBillion: 70, contextWindowTokens: 8192, precisionBytes: 2, layersCount: 80, hiddenDim: 8192, numAttentionHeads: 64 });
    assert.strictEqual(res.passed, true);
    assert.ok(Number(res.calculations.weightsVramGb) > 120);
  });

  test("evaluates Domain 9: ITSM & Disaster Recovery RTO/RPO Compliance", () => {
    const res1 = evaluateDisasterRecoveryInvariants({ rpoHoursTarget: 4, rtoHoursTarget: 2, actualBackupFrequencyHours: 1, automatedFailoverTestedDaysAgo: 30 });
    assert.strictEqual(res1.passed, true);

    const res2 = evaluateDisasterRecoveryInvariants({ rpoHoursTarget: 4, rtoHoursTarget: 2, actualBackupFrequencyHours: 8, automatedFailoverTestedDaysAgo: 180 });
    assert.strictEqual(res2.passed, false);
    assert.strictEqual(res2.safetyVetoes.length, 2);
  });

  test("evaluates Domain 10: Storage Systems & RAID URE Failure Math", () => {
    const res1 = evaluateRaidRebuildUreRisk({ driveCapacityTb: 16, driveCount: 8, ureRatePower: 14, raidType: "RAID5_SINGLE_PARITY" });
    assert.strictEqual(res1.passed, false); // RAID5 with 16TB drives has >30% URE probability

    const res2 = evaluateRaidRebuildUreRisk({ driveCapacityTb: 16, driveCount: 8, ureRatePower: 15, raidType: "RAID6_DUAL_PARITY" });
    assert.strictEqual(res2.passed, true);
  });

  test("generates and audits all 250 Information Technology Scenarios", () => {
    const scenarios = generateAllInformationTechnologyScenarios();
    assert.strictEqual(scenarios.length, 250);

    let passCount = 0;
    for (const sc of scenarios) {
      const res = sc.evaluator();
      if (res.passed) passCount++;
    }
    assert.strictEqual(passCount, 250);
  });

  test("handles natural language Information Technology queries", () => {
    const q1 = handleNaturalInformationTechnologyQuery("In a Raft consensus cluster with 5 nodes, what is the quorum required?");
    assert.ok(q1 && q1.includes("NOCTIS-IT-CLOUD-001"));
    assert.ok(q1.includes("nodes") && q1.includes("3"));

    const q2 = handleNaturalInformationTechnologyQuery("What are the 10 domains in information technology for Noctis?");
    assert.ok(q2 && q2.includes("NOCTIS-IT-MASTER-001"));
    assert.ok(q2.includes("Cloud Architecture"));
    assert.ok(q2.includes("250 Deterministic Scenarios"));
  });
});
