// ============================================================================
// NOCTIS ADVANCED TRAINING & NEXT-GEN FRONTIER TEST SUITE
// Standards: IEC 62304 Class C, FDA GMLP, GGUF v3, NIST AI RMF
// Tests: Multimodal Fusion, Adversarial Self-Play, Edge Quantization
// ============================================================================

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  fuseMultimodalObservation,
  type MultimodalObservationInput,
} from "./noctis-multimodal-cross-attention.ts";

import {
  executeAdversarialSelfPlayTournament,
  ADVERSARIAL_BENCHMARK_SCENARIOS,
} from "./noctis-adversarial-self-play.ts";

import {
  buildEdgeDeploymentManifest,
  SUPPORTED_QUANTIZATION_PROFILES,
} from "./noctis-edge-quantization.ts";

describe("NOCTIS ADVANCED TRAINING & FRONTIER EXPANSION (OPTIONS A, B, C)", () => {
  // Option A Tests: Multimodal Cross-Attention
  test("Option A: fuses DICOM CT-PA, 4-channel telemetry, and FHIR vitals with deterministic attention", () => {
    const input: MultimodalObservationInput = {
      patientId: "PT-TRAINING-001",
      timestamp: new Date().toISOString(),
      dicomScan: {
        modality: "CT_PA",
        findingsSummary: "Large saddle pulmonary embolus with RV strain",
        quantitativeMetrics: {
          rvLvRatio: 1.15, // > 0.9 critical threshold
        },
      },
      waveforms: [
        {
          channel: "ECG_LEAD_II",
          sampleRateHz: 250,
          points: [0.1, 0.2, 1.2, -0.4, 0.3],
          featureExtract: {
            heartRateBpm: 124,
            stSegmentElevationMm: 0.2,
            peakedTWave: false,
          },
        },
        {
          channel: "ART_LINE_BP",
          sampleRateHz: 125,
          points: [110, 115, 120, 80],
          featureExtract: {
            systolicBpMmHg: 88, // Hypotension
            diastolicBpMmHg: 54,
            ppvPercent: 16.5, // > 13% fluid responsive
          },
        },
        {
          channel: "ETCO2_CAPNO",
          sampleRateHz: 50,
          points: [22, 22, 24],
          featureExtract: {
            etco2MmHg: 22, // Low EtCO2 indicating dead space / poor cardiac output
          },
        },
      ],
      ehrDossier: {
        vitals: { MAP: 65, SpO2: 89 },
        labs: {
          LACTATE: { value: 4.8, unit: "mmol/L", flag: "CRITICAL" },
          POTASSIUM: { value: 4.5, unit: "mEq/L", flag: "NORMAL" },
          CREATININE: { value: 1.2, unit: "mg/dL", flag: "NORMAL" },
        },
        medications: ["Enoxaparin"],
        allergies: [],
      },
    };

    const res = fuseMultimodalObservation(input);

    assert.ok(res.multimodalDeteriorationIndex >= 70, "Should detect high deterioration index");
    assert.ok(
      res.acuityTier === "CRITICAL_DETERIORATION" || res.acuityTier === "CODE_IMMINENT",
      `Expected critical tier, got ${res.acuityTier}`
    );
    assert.ok(res.crossAttention.pixelWeight > 0.2, "Pixel weight must be populated");
    assert.ok(res.crossAttention.waveformWeight > 0.2, "Waveform weight must be populated");
    assert.ok(res.actionableDirectives.length > 0, "Directives must be generated");
    assert.ok(res.sha256Signature.startsWith("0x"), "SHA-256 seal must be attached");
  });

  // Option B Tests: Adversarial Self-Play
  test("Option B: executes self-play tournament across clinical traps with zero invariant breach", () => {
    const tournament = executeAdversarialSelfPlayTournament(ADVERSARIAL_BENCHMARK_SCENARIOS);

    assert.equal(tournament.totalRounds, ADVERSARIAL_BENCHMARK_SCENARIOS.length);
    assert.ok(tournament.trapRecognitionRatePercent >= 90.0, "Trap recognition rate must be >= 90%");
    assert.equal(tournament.zeroToleranceInvariantBreaches, 0, "Zero-tolerance invariants must NOT be breached");
    assert.ok(tournament.governorElo >= 1850, "Governor Elo must increase or remain high");
    assert.ok(tournament.recordedRounds.length === 5, "Should record all 5 rounds");
  });

  // Option C Tests: Edge Enclave Quantization
  test("Option C: generates valid GGUF and AWQ deployment manifests for air-gapped hospital deployment", () => {
    assert.equal(SUPPORTED_QUANTIZATION_PROFILES.length, 4);

    const ggufManifest = buildEdgeDeploymentManifest("GGUF_Q4_K_M", 8192);
    assert.equal(ggufManifest.runtimeConfig.engine, "LLAMA_CPP_SERVER");
    assert.ok(ggufManifest.generatedCliCommand.includes("llama-server"));
    assert.ok(ggufManifest.generatedCliCommand.includes("--host 127.0.0.1"));
    assert.ok(ggufManifest.airgapSecurityAttestation.hipaaCompliantEgressZero);

    const awqManifest = buildEdgeDeploymentManifest("AWQ_INT4", 4096);
    assert.equal(awqManifest.runtimeConfig.engine, "VLLM_OFFLINE");
    assert.ok(awqManifest.generatedCliCommand.includes("vllm.entrypoints"));
  });
});
