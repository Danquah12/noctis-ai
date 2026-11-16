/** Synthetic, network-free source-grouping and lexical leakage regression tests. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  auditNoctisDatasetSplitLeakage, isNoctisLexicalNearDuplicate,
} from "../src/lib/noctis-dataset-leakage.mjs";
import { prepareNoctisInternalDataset } from "../src/lib/noctis-internal-dataset.mjs";

const digest = v => createHash("sha256").update(v).digest("hex");
const source = (id, extras = {}) => ({
  id, kind: "project_authored", license_id: "NOCTIS-ORIGINAL",
  usage_rights: "model_training", training_allowed: true, approved: true,
  reviewed_by: "reviewer-rights", ...extras,
});
const example = (id, source_id, prompt) => ({
  id, source_id, prompt,
  completion: "Independently checked synthetic completion for a permitted sample.",
  validation: { kind: "independent_review", passed: true,
    verified_by: "reviewer-content", reference: "synthetic-reference-01" },
});
const partition = groupKey => {
  const n = Number.parseInt(digest(groupKey).slice(0, 8), 16) / 0x100000000;
  return n < 0.8 ? "train" : n < 0.9 ? "development" : "heldout";
};
function groupWithPartition(target) {
  for (let i = 0; i < 1000; i++) {
    const group = "group-" + i;
    if (partition("group:" + group) === target) return group;
  }
  throw new Error("Could not find deterministic test partition.");
}

test("lexical overlap detects long near duplicates without treating number changes as equal", () => {
  const a = "Describe how a solar inverter transforms battery power during safe laboratory testing.";
  const b = "Describe how a solar inverter transforms stored battery power during safe laboratory testing.";
  assert.equal(isNoctisLexicalNearDuplicate(a, b), true);
  assert.equal(isNoctisLexicalNearDuplicate(
    "Calculate the recommended testing pressure for system 120 in a controlled environment.",
    "Calculate the recommended testing pressure for system 220 in a controlled environment."), false);
  assert.equal(isNoctisLexicalNearDuplicate("What is gravity?", "What is inertia?"), false);
});

test("the full source group stays in one partition and is stable across input order", () => {
  const inputs = Array.from({length: 60}, (_, n) =>
    example("ex-" + n, "source-A", "Explain controlled scientific scenario " + n + "."));
  const a = prepareNoctisInternalDataset({sources: [source("source-A")], examples: inputs});
  const b = prepareNoctisInternalDataset({sources: [source("source-A")], examples: inputs.slice().reverse()});
  assert.equal(a.summary.accepted, 60);
  assert.equal(a.summary.partition_strategy, "source_group_sha256_v1");
  assert.equal(Object.values(a.summary.counts).filter(Boolean).length, 1);
  for (const split of ["train", "development", "heldout"]) {
    assert.deepEqual(a.splits[split].map(r => r.id).sort(), b.splits[split].map(r => r.id).sort());
  }
  const rows = Object.values(a.splits).flat();
  assert.equal(new Set(rows.map(r => r.provenance.source_group_sha256)).size, 1);
});

test("explicit source-family identifier keeps separate source IDs in the same partition", () => {
  const group = "same-curriculum-group";
  const sources = [source("alpha", {dataset_group_id: group}), source("beta", {dataset_group_id: group})];
  const examples = [example("a", "alpha", "Explain thermodynamics."),
    example("b", "beta", "Explain Newtonian mechanics.")];
  const prepared = prepareNoctisInternalDataset({sources, examples});
  assert.equal(prepared.summary.accepted, 2);
  assert.equal(Object.values(prepared.summary.counts).filter(Boolean).length, 1);
  assert.equal(new Set(Object.values(prepared.splits).flat().map(r => r.provenance.source_group_sha256)).size, 1);
});

test("two separately named sources with the same pinned content digest stay together", () => {
  const sources = [source("alpha", {expected_sha256: "f".repeat(64)}),
    source("beta", {expected_sha256: "f".repeat(64)})];
  const prepared = prepareNoctisInternalDataset({sources, examples: [
    example("a", "alpha", "Explain an open data contract."),
    example("b", "beta", "Explain verification.") ]});
  assert.equal(prepared.summary.accepted, 2);
  assert.equal(Object.values(prepared.summary.counts).filter(Boolean).length, 1);
});

test("invalid source-group identifiers and digests are not silently accepted", () => {
  for (const edit of [{dataset_group_id:"../breakout"}, {expected_sha256:"not-a-sha256"}]) {
    const result = prepareNoctisInternalDataset({
      sources:[source("source-A",edit)],
      examples:[example("a", "source-A", "Explain a governed dataset.")],
    });
    assert.equal(result.summary.accepted, 0);
    assert.equal(result.summary.rejected_count, 2);
  }
});

test("near duplicate of reserved held-out evaluation question is blocked from all splits", () => {
  const reserved = "Describe the steps required to verify a distributed system is functioning correctly under heavy traffic.";
  const similar = "Describe the steps required to verify a distributed system is functioning correctly under heavy production traffic.";
  const result = prepareNoctisInternalDataset({
    sources:[source("source-A")],
    examples:[example("a","source-A",similar)],
  }, {reservedHeldoutPrompts:[reserved]});
  assert.equal(result.summary.accepted, 0);
  assert.equal(result.summary.rejected[0].code, "reserved_evaluation_lexical_overlap");
});

test("near identical questions from distinct partition groups fail closed before export", () => {
  const a = "Explain how a regulated electrical system can be tested for safe voltage operation.";
  const b = "Explain how a regulated electrical system can be carefully tested for safe voltage operation.";
  const group1 = groupWithPartition("train");
  const group2 = groupWithPartition("heldout");
  assert.throws(() => prepareNoctisInternalDataset({
    sources:[source("a",{dataset_group_id:group1}),source("b",{dataset_group_id:group2})],
    examples:[example("a","a",a),example("b","b",b)],
  }), /cross_split_lexical_overlap/);
});

test("leakage audit reports counts without returning prompt or document text", () => {
  const prompt = "Explain how a regulated electrical system can be tested for safe voltage operation.";
  const result = auditNoctisDatasetSplitLeakage({
    train:[{prompt}],development:[],heldout:[],
  });
  assert.deepEqual(result, {checked:1,cross_split_lexical_pairs:0});
  assert.equal(JSON.stringify(result).includes(prompt),false);
});

test("overloaded lexical index fails closed rather than quietly dropping candidates", () => {
  const prompt = "Explain how a regulated electrical system can be tested for safe voltage operation.";
  const train = Array.from({length:513}, () => ({prompt}));
  assert.throws(() => auditNoctisDatasetSplitLeakage({
    train,development:[],heldout:[],
  }), /lexical_index_capacity_requires_independent_review/);
});
