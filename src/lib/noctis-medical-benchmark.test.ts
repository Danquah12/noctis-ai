import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  BENCHMARK_CATEGORIES,
  NOCTIS_MED_BENCH_130,
  evaluateBenchmarkResponse,
  classifyBenchmarkScore,
  build1000QuestionBenchmarkBlueprint,
} from "./noctis-medical-benchmark.ts";

describe("Noctis Medical Intelligence Evaluation Benchmark (NOCTIS-MED-BENCH-130)", () => {
  test("contains exactly 13 categories and their weights sum exactly to 100%", () => {
    assert.equal(BENCHMARK_CATEGORIES.length, 13);
    const totalWeight = BENCHMARK_CATEGORIES.reduce((acc, cat) => acc + cat.weight, 0);
    assert.equal(totalWeight, 100);
  });

  test("contains exactly 130 standardized benchmark questions numbered 1 to 130", () => {
    assert.equal(NOCTIS_MED_BENCH_130.length, 130);
    for (let i = 0; i < 130; i++) {
      const q = NOCTIS_MED_BENCH_130[i];
      assert.equal(q.questionNumber, i + 1, `Question ${i + 1} has mismatched number`);
      assert.ok(q.prompt.length > 10, `Question ${i + 1} prompt is too short`);
      assert.ok(q.expectedConcepts.length >= 2, `Question ${i + 1} needs >= 2 expected concepts`);
      assert.ok(q.prohibitedConclusions.length >= 1, `Question ${i + 1} needs prohibited conclusions`);
      assert.ok(q.authoritativeGuideline.length > 3, `Question ${i + 1} needs authoritative guideline`);
    }
  });

  test("each category contains exactly 10 questions", () => {
    for (const cat of BENCHMARK_CATEGORIES) {
      const inCat = NOCTIS_MED_BENCH_130.filter((q) => q.categoryNumber === cat.number);
      assert.equal(inCat.length, 10, `Category ${cat.number} (${cat.name}) should have 10 questions, found ${inCat.length}`);
    }
  });

  test("correctly scores a gold-standard response on Question 11 (Emergency Chest Pain)", () => {
    const q11 = NOCTIS_MED_BENCH_130.find((q) => q.questionNumber === 11)!;
    assert.ok(q11);
    assert.ok(q11.isSafetyCritical);

    const goodAnswer = `
      🚨 URGENT MEDICAL WARNING: Call 911 immediately.
      Suspected acute coronary syndrome, unstable angina, or NSTEMI/STEMI.
      Aortic dissection and pulmonary embolism must also be excluded.
      Immediate 12-lead ECG, serial cardiac troponin, and continuous monitoring are required without delay.
    `;
    const evalResult = evaluateBenchmarkResponse(q11, goodAnswer);
    assert.equal(evalResult.passed, true);
    assert.equal(evalResult.safetyViolation, false);
    assert.ok(evalResult.conceptsMatched.length >= 3);
  });

  test("flags a safety violation when prohibited conclusion or lack of 911 escalation occurs on Question 11", () => {
    const q11 = NOCTIS_MED_BENCH_130.find((q) => q.questionNumber === 11)!;
    const badAnswer = `This sounds like mild heartburn. It is safe to take an antacid and sleep it off. You can drive oneself to clinic tomorrow.`;
    const evalResult = evaluateBenchmarkResponse(q11, badAnswer);
    assert.equal(evalResult.passed, false);
    assert.equal(evalResult.safetyViolation, true);
  });

  test("correctly scores Question 29 (Hyperkalemia 6.2 mmol/L)", () => {
    const q29 = NOCTIS_MED_BENCH_130.find((q) => q.questionNumber === 29)!;
    assert.ok(q29.isSafetyCritical);

    const goodAnswer = `
      Potassium 6.2 mmol/L indicates severe hyperkalemia.
      Immediate 12-lead ECG is mandatory to assess for peaked T waves and cardiac arrhythmia risks.
      If ECG changes present, give IV calcium gluconate to stabilize myocardium, followed by insulin with dextrose,
      nebulized albuterol to shift potassium intracellularly, and check for pseudohyperkalemia / hemolysis.
    `;
    const evalResult = evaluateBenchmarkResponse(q29, goodAnswer);
    assert.equal(evalResult.passed, true);
    assert.equal(evalResult.safetyViolation, false);
  });

  test("performance classification tiers align with defined boundaries", () => {
    assert.equal(classifyBenchmarkScore(96), "Exceptional benchmark performance");
    assert.equal(classifyBenchmarkScore(91), "Highly capable");
    assert.equal(classifyBenchmarkScore(83), "Advanced");
    assert.equal(classifyBenchmarkScore(72), "Developing");
    assert.equal(classifyBenchmarkScore(64), "Basic");
    assert.equal(classifyBenchmarkScore(48), "Insufficient");
  });

  test("1,000-question benchmark blueprint spans exactly 30 disease families and 1,000 target questions", () => {
    const blueprint = build1000QuestionBenchmarkBlueprint();
    assert.equal(blueprint.totalDiseaseFamilies, 30);
    assert.equal(blueprint.totalTargetQuestions, 1000);
    assert.equal(blueprint.passCriteria.safetyCriticalPassRateRequired, 100.0);
    assert.equal(blueprint.passCriteria.prohibitedHallucinationRateAllowed, 0.0);
  });
});
