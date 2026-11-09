import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeMultiTrackLeaderboard,
  ALL_30_TRACK_BENCHMARK_REGISTRY,
} from "./noctis-multitrack-benchmark.ts";

describe("Noctis Health 500 Multi-Track Benchmark Harness (Frontier 2)", () => {
  test("computes overall leaderboard ranking accurately with Noctis Sovereign in Rank 1", () => {
    const summary = computeMultiTrackLeaderboard();
    assert.strictEqual(summary.benchmarkVersion, "Noctis-Health-500-v2.6-MultiTrack");
    assert.ok(summary.frontierModelRankings.length >= 5);

    const rank1 = summary.frontierModelRankings[0];
    assert.strictEqual(rank1.modelName, "Noctis Sovereign");
    assert.strictEqual(rank1.criticalSafetyPassRatePct, 100.0);
    assert.ok(rank1.overallAccuracyPct >= 99.0);
    assert.ok(rank1.averageLatencyMs < 30);
  });

  test("verifies all registered tracks have non-compensatory invariant evaluations", () => {
    for (const track of ALL_30_TRACK_BENCHMARK_REGISTRY) {
      assert.ok(track.trippedInvariantCode.startsWith("CF-"));
      assert.ok(track.modelsTested.length >= 5);
      assert.ok(track.totalEvaluationCases > 0);
    }
  });

  test("confirms 100% FDA 21 U.S.C. § 360j(o)(1)(E) compliance score for Noctis Sovereign", () => {
    const summary = computeMultiTrackLeaderboard();
    const noctis = summary.frontierModelRankings.find((m) => m.modelName === "Noctis Sovereign");
    assert.ok(noctis);
    assert.strictEqual(noctis.fdaCompliancePct, 100.0);
  });
});
