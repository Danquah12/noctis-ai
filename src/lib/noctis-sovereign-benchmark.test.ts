import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  runSovereignBenchmarkSuite,
  SOVEREIGN_16_BENCHMARK_CASES,
} from "./noctis-sovereign-benchmark.ts";

describe("Noctis 16 Sovereign Suites Master Benchmark (Phase 5)", () => {
  it("verifies all 16 benchmark cases are registered and map to distinct sovereign suites", () => {
    assert.equal(SOVEREIGN_16_BENCHMARK_CASES.length, 16);
    const suiteIds = SOVEREIGN_16_BENCHMARK_CASES.map((c) => c.suiteId);
    const uniqueIds = new Set(suiteIds);
    assert.equal(uniqueIds.size, 16);
  });

  it("executes the full master benchmark suite and achieves 100% certification pass rate", () => {
    const result = runSovereignBenchmarkSuite();

    assert.equal(result.totalSuitesTested, 16);
    assert.equal(result.totalTestsRun, 16);
    assert.equal(result.totalPassCount, 16);
    assert.equal(result.totalFailCount, 0);
    assert.equal(result.overallPassRatePercent, 100);
    assert.equal(result.certificationStatus, "CERTIFIED_SOVEREIGN");
    assert.equal(result.masterAttestationSha256.length, 64);

    // Verify all 16 individual results
    for (const testResult of result.suiteResults) {
      assert.equal(testResult.passed, true, `Test failed for suite ${testResult.suiteId}`);
      assert.equal(testResult.score, 100);
      assert.ok(testResult.evidence.length > 0);
    }
  });

  it("filters benchmark execution by specific sovereign suite", () => {
    const cyberResult = runSovereignBenchmarkSuite("cyber");
    assert.equal(cyberResult.totalTestsRun, 1);
    assert.equal(cyberResult.totalPassCount, 1);
    assert.equal(cyberResult.suiteResults[0].suiteId, "noctis-cyber");
    assert.equal(cyberResult.suiteResults[0].passed, true);

    const healthResult = runSovereignBenchmarkSuite("health");
    assert.equal(healthResult.totalTestsRun, 1);
    assert.equal(healthResult.suiteResults[0].suiteId, "noctis-health");
    assert.equal(healthResult.suiteResults[0].passed, true);
  });
});
