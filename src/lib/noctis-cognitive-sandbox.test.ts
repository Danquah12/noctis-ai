/**
 * Unit Test Suite for Noctis Sovereign "Self-Evolving Cognitive Sandbox" (NOCTIS-COG-001)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_BENCHMARK_CASES,
  INITIAL_DPO_PAIRS,
  runCognitiveBenchmark,
  generateDpoTrainingPair,
  exportDpoDatasetJsonl,
  formatCognitiveBenchmarkMarkdown,
  handleNaturalCognitiveSandboxQuery,
} from "./noctis-cognitive-sandbox.ts";
import { runFollowUpIntelligence } from "./noctis-response-intelligence.ts";

describe("Noctis Sovereign 'Self-Evolving Cognitive Sandbox'", () => {
  test("provides canonical benchmark cases across 6 core sovereign domains", () => {
    assert.equal(CANONICAL_BENCHMARK_CASES.length, 6);
    const domains = new Set(CANONICAL_BENCHMARK_CASES.map((c) => c.domain));
    assert.ok(domains.has("Deterministic Math"));
    assert.ok(domains.has("Financial Solvency"));
    assert.ok(domains.has("Threat Modeling"));
    assert.ok(domains.has("Clinical Diagnostic"));
    assert.ok(domains.has("Fiduciary Governance"));
    assert.ok(domains.has("Physical Systems"));
  });

  test("runs cognitive benchmark with high calibration and zero-drift verification", () => {
    const result = runCognitiveBenchmark();
    assert.ok(result.overallAccuracy >= 98.0);
    assert.ok(result.zeroDriftInvariantIndex >= 98.0);
    assert.ok(result.expectedCalibrationError <= 0.03); // ECE < 3%
    assert.equal(result.status, "OPTIMAL_ZERO_DRIFT");
    assert.equal(result.domainScores.length, 6);
    assert.equal(result.evaluationSeal.length, 64); // SHA-256 seal
  });

  test("synthesizes dynamic DPO training pair from user correction", () => {
    const pair = generateDpoTrainingPair(
      "Deterministic Math",
      "What is 1,450,000 / 110,000?",
      "13.1818 months exactly [DETERMINISTIC_PROOF]",
      "Around 13 months maybe",
      "Enforce IEEE 754 precision instead of conversational rounding."
    );

    assert.ok(pair.id.startsWith("DPO-"));
    assert.equal(pair.domain, "Deterministic Math");
    assert.ok(pair.chosen.includes("13.1818"));
    assert.equal(pair.proofHash.length, 64);
  });

  test("exports valid JSONL dataset of DPO training pairs", () => {
    const jsonl = exportDpoDatasetJsonl(INITIAL_DPO_PAIRS);
    const lines = jsonl.trim().split("\n");
    assert.equal(lines.length, INITIAL_DPO_PAIRS.length);

    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert.ok(parsed.id);
      assert.ok(parsed.prompt);
      assert.ok(parsed.chosen);
      assert.ok(parsed.rejected);
      assert.ok(parsed.proofHash);
    }
  });

  test("formats audited Markdown dossier with domain matrix and DPO cards", () => {
    const result = runCognitiveBenchmark();
    const md = formatCognitiveBenchmarkMarkdown(result);

    assert.ok(md.includes("# Noctis Sovereign \"Self-Evolving Cognitive Sandbox\""));
    assert.ok(md.includes("### 1. Domain Accuracy & Calibration Matrix"));
    assert.ok(md.includes("### 2. Dynamic Direct Preference Optimization (DPO) Pairs"));
    assert.ok(md.includes("### 3. Cryptographic Verification & Benchmark Seal"));
    assert.ok(md.includes(result.evaluationSeal));
  });

  test("routes natural language cognitive sandbox queries accurately", () => {
    const cog = handleNaturalCognitiveSandboxQuery("Can you audit model drift and show the cognitive benchmark?");
    assert.ok(cog);
    assert.ok(cog.includes("Zero-Drift Invariant Index"));
    assert.ok(cog.includes("Expected Calibration Error"));

    const dpo = handleNaturalCognitiveSandboxQuery("Generate DPO pairs and evaluate calibration error");
    assert.ok(dpo);
    assert.ok(dpo.includes("Direct Preference Optimization"));

    const unrelated = handleNaturalCognitiveSandboxQuery("How many miles to the moon?");
    assert.equal(unrelated, null);
  });

  test("integrates smoothly with runFollowUpIntelligence router", () => {
    const response = runFollowUpIntelligence([], "Show the cognitive sandbox benchmark evaluation and model drift");
    assert.ok(response);
    assert.ok(response.includes("NOCTIS-COG-001") || response.includes("Cognitive Sandbox"));
    assert.ok(response.includes("Zero-Drift Invariant Index"));
    assert.ok(response.includes("Domain Accuracy & Calibration Matrix"));
  });
});
