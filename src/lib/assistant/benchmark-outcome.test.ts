import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyComponentTaskOutcome,
  COMPONENT_BENCHMARK_PROVENANCE,
} from "./benchmark-outcome.ts";

test("explicit failure sentinels cannot be reclassified as PASS", () => {
  for (const value of ["FAIL", "FAILED", "error", "Error: missing source", "UNVERIFIED", "false"]) {
    assert.equal(classifyComponentTaskOutcome(value).status, "FAIL", value);
  }
});

test("partial stays partial and pass remains pass", () => {
  assert.equal(classifyComponentTaskOutcome("PARTIAL").status, "PARTIAL");
  assert.equal(classifyComponentTaskOutcome("PASS").status, "PASS");
});

test("missing and invalid outcomes fail closed", () => {
  for (const value of [null, undefined, false, true, 0, 1, [], {}, "", "  "]) {
    assert.equal(classifyComponentTaskOutcome(value).status, "FAIL");
  }
});

test("legacy descriptive success strings remain supported", () => {
  assert.deepEqual(classifyComponentTaskOutcome("Blocked loopback"), {
    status: "PASS", evidence: "Blocked loopback",
  });
});

test("component metrics never advertise model intelligence or held-out evaluation", () => {
  assert.equal(COMPONENT_BENCHMARK_PROVENANCE.modelInferenceEvaluated, false);
  assert.equal(COMPONENT_BENCHMARK_PROVENANCE.heldOutDatasetEvaluated, false);
  assert.equal(COMPONENT_BENCHMARK_PROVENANCE.independentEvaluationVerified, false);
  assert.equal(COMPONENT_BENCHMARK_PROVENANCE.modelQualityScore, null);
  assert.equal(COMPONENT_BENCHMARK_PROVENANCE.releaseGate, "not_established");
});
