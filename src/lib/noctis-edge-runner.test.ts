import test from "node:test";
import assert from "node:assert/strict";
import {
  probeWebGpuCapabilities,
  calculateEdgeModelProfile,
  executeEdgeModelInference,
} from "./noctis-edge-runner.ts";

test("NOCTIS WEBGPU & WASM CLIENT-SIDE EDGE RUNNER (NEMR-EDGE-001)", async (t) => {
  await t.test("probeWebGpuCapabilities handles both headless and browser environments", () => {
    // Headless test
    const headless = probeWebGpuCapabilities();
    assert.equal(headless.supported, false);
    assert.equal(headless.recommendedQuantization, "WASM_FALLBACK");

    // Mock WebGPU device
    const mockGpu = probeWebGpuCapabilities({
      gpu: {
        requestAdapter: async () => ({
          info: { vendor: "NVIDIA", architecture: "Ada Lovelace" },
          features: { has: (f) => f === "shader-f16" },
          limits: { maxBufferSize: 2147483648, maxComputeWorkgroupSizeX: 1024 },
        }),
      },
    });
    assert.equal(mockGpu.supported, true);
    assert.equal(mockGpu.recommendedQuantization, "INT4_NF4");
    assert.equal(mockGpu.hasFp16, true);
  });

  await t.test("calculateEdgeModelProfile computes memory footprints accurately", () => {
    // 1.5B model in 4-bit quantization with 4k context
    const profile = calculateEdgeModelProfile({
      parameterCountBillions: 1.5,
      quantizationBits: 4,
      contextWindow: 4096,
    });

    assert.equal(profile.modelId, "noctis-edge-1.5b-int4_nf4");
    assert.equal(profile.quantizationFormat, "INT4_NF4");
    assert.ok(profile.memoryFootprintMb > 700 && profile.memoryFootprintMb < 1200);
    assert.ok(profile.expectedTokensPerSecond > 25);
  });

  await t.test("executeEdgeModelInference streams tokens and handles local inference", async () => {
    const profile = calculateEdgeModelProfile({
      parameterCountBillions: 1.5,
      quantizationBits: 4,
      contextWindow: 2048,
    });

    const streamChunks: string[] = [];
    const result = await executeEdgeModelInference({
      prompt: "What are the immediate priorities for septic shock?",
      modelConfig: profile,
      onChunk: (chunk) => {
        streamChunks.push(chunk.textChunk);
      },
    });

    assert.ok(result.totalTokensGenerated > 10);
    assert.ok(result.fullText.includes("Sepsis with shock physiology"));
    assert.ok(result.fullText.includes("Norepinephrine"));
    assert.equal(streamChunks.length, result.totalTokensGenerated);
  });
});
