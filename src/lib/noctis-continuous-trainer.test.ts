import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executeContinuousTrainingEpoch,
  getContinuousTrainingStatus,
  handleNaturalContinuousTrainingQuery,
} from "./noctis-continuous-trainer.ts";

describe("NOCTIS-CONT-TRAIN-001: Sovereign Continuous Autonomous Training Engine", () => {
  it("executes a complete continuous training epoch across clinical, energy, benchmark, and autonomous domains", () => {
    const summary = executeContinuousTrainingEpoch();

    assert.ok(summary.epochId.startsWith("EPOCH-NOCTIS-"));
    assert.equal(summary.status, "COMPLETED");
    assert.equal(summary.safetyViolationsCount, 0); // 0 tolerance for safety violation
    assert.ok(summary.totalScenariosEvaluated >= 160);
    assert.ok(summary.accuracyScorePercent >= 95.0);
    assert.equal(summary.domainBreakdown.length, 4);
    assert.ok(summary.domainBreakdown.every((d) => d.status === "PASS"));
  });

  it("retrieves continuous training status and history correctly", () => {
    const status = getContinuousTrainingStatus();

    assert.equal(status.isDaemonActive, true);
    assert.ok(status.history.length >= 1);
    assert.ok(status.lastRunTimestamp !== null);
  });

  it("handles natural query parsing for continuous automated training", () => {
    const output = handleNaturalContinuousTrainingQuery("Can we automate the training for Noctis so it runs continuously for all requirements?");
    assert.ok(output);
    assert.match(output, /NOCTIS-CONT-TRAIN-001/);
    assert.match(output, /Continuous Training Metrics & Telemetry/);
    assert.match(output, /CLINICAL_MEDICINE_STEPS_1_16/);
    assert.match(output, /NOCTIS_MED_BENCH_130/);
  });
});
