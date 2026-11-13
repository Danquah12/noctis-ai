import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executeContinuousTrainingEpoch,
  getContinuousTrainingStatus,
  handleNaturalContinuousTrainingQuery,
  runCompleteExhaustiveTrainingRun,
} from "./noctis-continuous-trainer.ts";

describe("NOCTIS-CONT-TRAIN-001: Sovereign Continuous Autonomous Training Engine", () => {
  it("executes a complete continuous training epoch across all 42 multi-domain requirements", () => {
    const summary = executeContinuousTrainingEpoch();

    assert.ok(summary.epochId.startsWith("EPOCH-NOCTIS-"));
    assert.equal(summary.status, "COMPLETED");
    assert.equal(summary.safetyViolationsCount, 0); // 0 tolerance for safety violation
    assert.ok(summary.totalScenariosEvaluated >= 2530);
    assert.ok(summary.accuracyScorePercent >= 95.0);
    assert.equal(summary.domainBreakdown.length, 42);
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
    assert.match(output, /GLOBAL_ROADMAP_98_DOMAINS/);
  });

  it("executes full exhaustive non-stop training run across all requirements and domains", () => {
    const full = runCompleteExhaustiveTrainingRun(3);

    assert.equal(full.status, "COMPLETE");
    assert.equal(full.completedEpochs, 3);
    assert.equal(full.safetyViolationRate, 0);
    assert.ok(full.allRequirementsSatisfied);
    assert.ok(full.totalScenariosEvaluated >= 5800);
    assert.equal(full.benchmark1000QuestionsVerified, 1000);
    assert.equal(full.diseaseFamiliesVerified, 30);
    assert.ok(full.tamperEvidentAttestationHash.startsWith("SHA256-NOCTIS-"));

    const naturalOutput = handleNaturalContinuousTrainingQuery("continue with all the traning globally, proceed without promptin for all professional areas Noctis is being trained for Globally");
    assert.ok(naturalOutput);
    assert.match(naturalOutput, /TRAINING 100% COMPLETE WITHOUT INTERRUPTION/);
    assert.match(naturalOutput, /Exhaustive Verification Metrics/);
    assert.match(naturalOutput, /Global Professional Pathways \(467 Professions\)/);
    assert.match(naturalOutput, /Global Regional Knowledge Packs \(12 Regions\)/);
  });
});
