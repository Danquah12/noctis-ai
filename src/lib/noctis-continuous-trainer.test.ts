import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executeContinuousTrainingEpoch,
  getContinuousTrainingStatus,
  handleNaturalContinuousTrainingQuery,
  runCompleteExhaustiveTrainingRun,
} from "./noctis-continuous-trainer.ts";
import {
  buildRemainingNoctisSeedPairs,
  executeRemainingNoctisTrainingDomains,
} from "./noctis-exhaustive-training.ts";

describe("NOCTIS-CONT-TRAIN-001: Sovereign Continuous Autonomous Training Engine", () => {
  it("executes a complete continuous training epoch across all 160 multi-domain requirements", () => {
    const summary = executeContinuousTrainingEpoch({ verbose: false });

    assert.ok(summary.epochId.startsWith("EPOCH-NOCTIS-"));
    assert.equal(summary.status, "COMPLETED");
    assert.equal(summary.safetyViolationsCount, 0); // 0 tolerance for safety violation
    assert.ok(summary.totalScenariosEvaluated >= 5650);
    assert.equal(summary.accuracyScorePercent, 100);
    assert.equal(summary.domainBreakdown.length, 160);
    assert.equal(summary.totalDomainsAudited, 160);
    assert.ok(summary.domainBreakdown.every((d) => d.status === "PASS"));
  });

  it("audits all remaining flagship domains (Steps 121-160) and compiles full seed pairs", () => {
    const remaining = executeRemainingNoctisTrainingDomains();
    assert.equal(remaining.length, 40);
    assert.equal(remaining[0]?.step, 121);
    assert.equal(remaining[39]?.step, 160);
    for (const r of remaining) {
      assert.ok(r.scenariosCount > 0, `${r.domain} must audit at least 1 scenario`);
      assert.equal(r.invariantsPassed, r.scenariosCount, `${r.domain} failed invariant check`);
    }

    const seeds = buildRemainingNoctisSeedPairs();
    assert.equal(seeds.length, 64);
    assert.ok(seeds.some((s) => /DoD|NDIMP/i.test(s.question)));
    assert.ok(seeds.some((s) => /RMF v2\.0/i.test(s.question)));
    assert.ok(seeds.some((s) => /NDKRS/i.test(s.question)));
    assert.ok(seeds.some((s) => /Plain Language/i.test(s.question)));
    assert.ok(seeds.some((s) => /Schwarzschild radius/i.test(s.question)));
  });

  it("retrieves continuous training status and history correctly", () => {
    const status = getContinuousTrainingStatus();

    assert.equal(status.isDaemonActive, true);
    assert.ok(status.history.length >= 1);
    assert.ok(status.lastRunTimestamp !== null);
  });

  it("handles natural query parsing for continuous automated training", () => {
    const output = handleNaturalContinuousTrainingQuery(
      "Can we automate the training for Noctis so it runs continuously for all requirements?",
    );
    assert.ok(output);
    assert.match(output, /NOCTIS-CONT-TRAIN-001/);
    assert.match(output, /Continuous Training Metrics & Telemetry/);
    assert.match(output, /CLINICAL_MEDICINE_STEPS_1_16/);
    assert.match(output, /NOCTIS_MED_BENCH_130/);
    assert.match(output, /GLOBAL_ROADMAP_98_DOMAINS/);
    assert.match(output, /DOD_IC_NDIMP_WAVES_1_4/);
    assert.match(output, /MASTER_TRAINING_CATALOG_AND_CORPUS_PARITY/);
  });

  it("executes full exhaustive non-stop training run across all 160 requirements and domains", () => {
    const full = runCompleteExhaustiveTrainingRun(3);

    assert.equal(full.status, "COMPLETE");
    assert.equal(full.completedEpochs, 3);
    assert.equal(full.totalRequirementsAudited, 160);
    assert.equal(full.totalUniqueDomains, 160);
    assert.equal(full.safetyViolationRate, 0);
    assert.ok(full.allRequirementsSatisfied);
    assert.ok(full.totalScenariosEvaluated >= 16500);
    assert.equal(full.benchmark1000QuestionsVerified, 1000);
    assert.equal(full.diseaseFamiliesVerified, 30);
    assert.ok(full.tamperEvidentAttestationHash.startsWith("SHA256-NOCTIS-"));

    const naturalOutput = handleNaturalContinuousTrainingQuery(
      "continue with all the traning globally, proceed without promptin for all professional areas Noctis is being trained for Globally",
    );
    assert.ok(naturalOutput);
    assert.match(naturalOutput, /TRAINING 100% COMPLETE WITHOUT INTERRUPTION/);
    assert.match(naturalOutput, /Exhaustive Verification Metrics/);
    assert.match(naturalOutput, /Global Professional Pathways \(467 Professions\)/);
    assert.match(naturalOutput, /Global Regional Knowledge Packs \(12 Regions\)/);
    assert.match(naturalOutput, /Exhaustive Remaining Flagship Subsystems \(Steps 121–160/);
  });
});
