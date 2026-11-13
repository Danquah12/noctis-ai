import { test, describe } from "node:test";
import assert from "node:assert";
import {
  evaluateHpcGpuClusterTopology,
  evaluatePostQuantumSecurity,
  evaluateOtPurdueArchitectureSecurity,
  evaluate5gCoreSliceAndSync,
  evaluateZkProofSoundness,
  generateAllAdvancedItScenarios
} from "./noctis-advanced-it-master-engine.ts";

describe("NOCTIS-ADV-IT-MASTER-001: Advanced IT Domains Master Engine", () => {
  test("Domain 1 (HPC): Validates GPU cluster fabric and blocks cross-node Tensor Parallelism", () => {
    const valid = evaluateHpcGpuClusterTopology({
      totalGpus: 64,
      gpusPerNode: 8,
      tensorParallelSize: 8,
      pipelineParallelSize: 2,
      dataParallelSize: 4,
      networkType: "Infiniband_NDR",
      pfcEnabled: true,
      ecnEnabled: true,
      modelParamCountB: 70,
      sequenceLength: 4096,
      batchSize: 16
    });
    assert.strictEqual(valid.passed, true);
    assert.strictEqual(valid.safetyVetoes.length, 0);

    const invalid = evaluateHpcGpuClusterTopology({
      totalGpus: 64,
      gpusPerNode: 8,
      tensorParallelSize: 16, // > 8 crosses nodes
      pipelineParallelSize: 2,
      dataParallelSize: 2,
      networkType: "Standard_Ethernet_100G",
      pfcEnabled: false,
      ecnEnabled: false,
      modelParamCountB: 70,
      sequenceLength: 4096,
      batchSize: 16
    });
    assert.strictEqual(invalid.passed, false);
    assert.strictEqual(invalid.safetyVetoes.some(v => v.includes("TP_CROSS_NODE_VIOLATION")), true);
    assert.strictEqual(invalid.safetyVetoes.some(v => v.includes("UNSUPPORTED_FABRIC")), true);
  });

  test("Domain 2 (PQC): Enforces NIST FIPS 203/204 algorithms and QBER <= 11% ceiling", () => {
    const valid = evaluatePostQuantumSecurity({
      algorithm: "ML_KEM_768",
      observedQberPct: 2.4,
      hybridX25519Enabled: true
    });
    assert.strictEqual(valid.passed, true);

    const classical = evaluatePostQuantumSecurity({
      algorithm: "RSA_2048",
      observedQberPct: 15.0
    });
    assert.strictEqual(classical.passed, false);
    assert.strictEqual(classical.safetyVetoes.some(v => v.includes("VULNERABLE_CLASSICAL_PRIMITIVE")), true);
    assert.strictEqual(classical.safetyVetoes.some(v => v.includes("QBER_THRESHOLD_EXCEEDED")), true);
  });

  test("Domain 3 (OT/ICS): Enforces Purdue Model micro-segmentation and SIS SIL-3 isolation", () => {
    const valid = evaluateOtPurdueArchitectureSecurity({
      purdueSourceLevel: 2,
      purdueDestinationLevel: 1,
      protocol: "MODBUS_TCP",
      isDirectRoutable: false,
      unidirectionalDataDiodePresent: true,
      safetyInstrumentedSystemIndependent: true,
      modbusFunctionCode: 0x03
    });
    assert.strictEqual(valid.passed, true);

    const breach = evaluateOtPurdueArchitectureSecurity({
      purdueSourceLevel: 4, // Enterprise
      purdueDestinationLevel: 1, // Controller
      protocol: "MODBUS_TCP",
      isDirectRoutable: true,
      unidirectionalDataDiodePresent: false,
      safetyInstrumentedSystemIndependent: false,
      modbusFunctionCode: 0x06
    });
    assert.strictEqual(breach.passed, false);
    assert.strictEqual(breach.safetyVetoes.some(v => v.includes("PERA_DIRECT_ROUTING_BREACH")), true);
    assert.strictEqual(breach.safetyVetoes.some(v => v.includes("SIS_INDEPENDENCE_VETO")), true);
    assert.strictEqual(breach.safetyVetoes.some(v => v.includes("UNAUTHORIZED_MODBUS_WRITE_COMMAND")), true);
  });

  test("Domain 4 (5G SA Core): Enforces O-RAN time error <= 130ns and 3GPP SBA mTLS", () => {
    const valid = evaluate5gCoreSliceAndSync({
      sliceType: "URLLC",
      measuredLatencyMs: 0.62,
      measuredJitterUs: 15,
      timeErrorNanoseconds: 40,
      ptpSyncStatus: "LOCKED",
      mulsEnabledBetweenNfs: true,
      packetLossRate: 1e-6
    });
    assert.strictEqual(valid.passed, true);

    const invalid = evaluate5gCoreSliceAndSync({
      sliceType: "URLLC",
      measuredLatencyMs: 3.5,
      measuredJitterUs: 600,
      timeErrorNanoseconds: 350, // > 130ns
      ptpSyncStatus: "FREE_RUN",
      mulsEnabledBetweenNfs: false,
      packetLossRate: 1e-3
    });
    assert.strictEqual(invalid.passed, false);
    assert.strictEqual(invalid.safetyVetoes.some(v => v.includes("O_RAN_SYNCHRONIZATION_VIOLATION")), true);
    assert.strictEqual(invalid.safetyVetoes.some(v => v.includes("3GPP_SBA_ZERO_TRUST_BREACH")), true);
    assert.strictEqual(invalid.safetyVetoes.some(v => v.includes("URLLC_LATENCY_SLA_BREACH")), true);
  });

  test("Domain 5 (ZKP): Enforces zk-SNARK trusted setup verification and anti-trapdoor soundness", () => {
    const valid = evaluateZkProofSoundness({
      proofSystem: "GROTH16",
      constraintCount: 131072,
      trustedSetupCeremonyVerified: true,
      publicInputsCount: 2,
      proofSizeBytes: 128,
      verificationTimeMs: 3.2,
      containsSoundnessTrapdoorRisk: false
    });
    assert.strictEqual(valid.passed, true);

    const untrusted = evaluateZkProofSoundness({
      proofSystem: "GROTH16",
      constraintCount: 131072,
      trustedSetupCeremonyVerified: false,
      publicInputsCount: 2,
      proofSizeBytes: 128,
      verificationTimeMs: 3.2,
      containsSoundnessTrapdoorRisk: true
    });
    assert.strictEqual(untrusted.passed, false);
    assert.strictEqual(untrusted.safetyVetoes.some(v => v.includes("GROTH16_UNVERIFIED_SETUP_VETO")), true);
    assert.strictEqual(untrusted.safetyVetoes.some(v => v.includes("SOUNDNESS_TRAPDOOR_VETO")), true);
  });

  test("Executes all 125 Advanced IT Scenarios across 5 domains with 100% deterministic safety bounds", () => {
    const scenarios = generateAllAdvancedItScenarios();
    assert.strictEqual(scenarios.length, 125);

    let executed = 0;
    for (const scn of scenarios) {
      const res = scn.execute();
      assert.ok(res.engineId);
      assert.ok(res.domain);
      assert.ok(res.calculations);
      assert.ok(res.standardsReferenced.length > 0);
      executed++;
    }
    assert.strictEqual(executed, 125);
  });
});
