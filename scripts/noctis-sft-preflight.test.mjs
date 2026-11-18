import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { buildNoctisSftPreflight } from "../src/lib/noctis-sft-preflight.mjs";
import { prepareNoctisInternalDataset } from "../src/lib/noctis-internal-dataset.mjs";

const sha = s => createHash("sha256").update(s).digest("hex");
const row = (id, group, prompt, overrides = {}) => {
  const completion = "Independently checked answer for " + id + " and a verified task.";
  return {
    id, prompt, completion,
    provenance: {
      source_id: "src-" + group,
      source_group_sha256: sha("group:" + group),
      source_kind: "project_authored",
      license_id: "NOCTIS-ORIGINAL",
      origin_url: null,
      attribution_required: false,
      example_sha256: sha(prompt + "\n" + completion),
      validation_kind: "independent_review",
      validation_reference: "review-2026-" + id,
    },
    ...overrides,
  };
};
const sample = () => ({
  train: [row("one", "a", "Explain water cycle stages in this sample.")],
  development: [row("two", "b", "What happens in a mechanical spring?")],
  heldout: [row("three", "c", "Describe a chemical equilibrium state.")],
});

test("produces only training and development ChatML, never sealed heldout text", () => {
  const bundle = buildNoctisSftPreflight(sample());
  assert.equal(bundle.schema, "noctis.sft.preflight.v1");
  assert.deepEqual(Object.keys(bundle), ["schema", "train", "development", "manifest"]);
  assert.equal(bundle.train[0].messages[0].role, "user");
  assert.equal(bundle.train[0].messages[1].role, "assistant");
  assert.equal(bundle.manifest.sealed_heldout_count, 1);
  assert.match(bundle.manifest.sealed_heldout_sha256, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(bundle.train).includes("chemical equilibrium"));
  assert.ok(!JSON.stringify(bundle.development).includes("chemical equilibrium"));
  assert.equal(bundle.manifest.outcome, "offline_compatibility_preflight_only");
});

test("requires three nonempty groups of separately partitioned examples", () => {
  assert.throws(() => buildNoctisSftPreflight({ train: [], development: [], heldout: [] }), /nonempty/);
  assert.throws(() => buildNoctisSftPreflight({ train: [], development: [] }), /three_reviewed/);
  assert.throws(() => buildNoctisSftPreflight(null), /three_reviewed/);
});

test("blocks a source group that crosses training and heldout", () => {
  const s = sample();
  s.heldout[0].provenance.source_group_sha256 = s.train[0].provenance.source_group_sha256;
  assert.throws(() => buildNoctisSftPreflight(s), /source_group_crosses_splits/);
});

test("blocks changed prompts, completions or forged content fingerprints", () => {
  for (const field of ["prompt", "completion"]) {
    const s = sample();
    s.train[0][field] += " tampered";
    assert.throws(() => buildNoctisSftPreflight(s), /invalid_or_unverifiable/);
  }
  const s = sample();
  s.train[0].provenance.example_sha256 = "0".repeat(64);
  assert.throws(() => buildNoctisSftPreflight(s), /invalid_or_unverifiable/);
});

test("blocks duplicate IDs across partitions", () => {
  const s = sample();
  s.development[0].id = "one";
  assert.throws(() => buildNoctisSftPreflight(s), /invalid_or_unverifiable/);
});

test("blocks unverified examples, wrong license, and mistaken attribution", () => {
  for (const override of [
    { validation_kind: "self_assessment" },
    { validation_reference: "" },
    { source_kind: "public_open", license_id: "NOCTIS-ORIGINAL" },
    { license_id: "CC-BY-NC-4.0" },
    { attribution_required: true },
  ]) {
    const s = sample();
    Object.assign(s.train[0].provenance, override);
    assert.throws(() => buildNoctisSftPreflight(s), /invalid_or_unverifiable/);
  }
});

test("blocks marked personal/private or customer records", () => {
  for (const flag of ["private_record", "customer_data", "from_user_conversation", "contains_personal_data"]) {
    const s = sample();
    s.train[0][flag] = true;
    assert.throws(() => buildNoctisSftPreflight(s), /invalid_or_unverifiable/);
  }
});

test("enforces exact short prompt isolation even across distinct source groups", () => {
  const s = sample();
  s.heldout[0] = row("three", "c", s.train[0].prompt);
  assert.throws(() => buildNoctisSftPreflight(s), /cross_split_exact_prompt_overlap/);
});

test("enforces overlap checks on substantive answers", () => {
  const s = sample();
  const repeated = "This independently verified discussion covers the same underlying requirements and validation procedure with enough detailed explanation to represent a substantive answer intended for testing rather than generic boilerplate language.";
  s.train[0].completion = repeated;
  s.heldout[0].completion = repeated;
  for (const split of ["train", "heldout"]) {
    const r = s[split][0];
    r.provenance.example_sha256 = sha(r.prompt + "\n" + r.completion);
  }
  assert.throws(() => buildNoctisSftPreflight(s), /cross_split_exact_completion_overlap/);
});

test("heldout data remains unavailable even when there are several allowed training examples", () => {
  const s = sample();
  s.train.push(row("four", "a", "Explain conservation of energy in an isolated system."));
  const r = buildNoctisSftPreflight(s);
  assert.equal(r.train.length, 2);
  assert.equal(r.development.length, 1);
  assert.equal(r.manifest.source_group_count, 3);
  assert.equal(r.manifest.train_count, 2);
});

test("returned manifests are stable for row-order changes", () => {
  const s = sample();
  s.train.push(row("four", "a", "Analyze a simple harmonic oscillator."));
  const first = buildNoctisSftPreflight(s);
  s.train.reverse();
  const second = buildNoctisSftPreflight(s);
  assert.deepEqual(first.manifest, second.manifest);
});

test("serialized approved examples carry a fingerprint of the actual trimmed export", () => {
  const p = "  Explain a tested algorithm.  ";
  const c = "  A reviewed answer with explicit, deterministic behavior.  ";
  const data = prepareNoctisInternalDataset({
    sources: [{
      id: "original", kind: "project_authored", license_id: "NOCTIS-ORIGINAL",
      usage_rights: "model_training", training_allowed: true, approved: true,
      reviewed_by: "source-reviewer",
    }],
    examples: [{
      id: "prepared-1", source_id: "original", prompt: p, completion: c,
      validation: {
        kind: "independent_review", passed: true,
        verified_by: "answer-reviewer", reference: "internal-test-2026",
      },
    }],
  });
  const saved = Object.values(data.splits).flat()[0];
  assert.ok(saved);
  assert.equal(saved.prompt, p.trim());
  assert.equal(saved.completion, c.trim());
  assert.equal(saved.provenance.example_sha256, sha(saved.prompt + "\n" + saved.completion));
});

test("row split metadata must match the containing partition", () => {
  const s = sample();
  s.train[0].split = "heldout";
  assert.throws(() => buildNoctisSftPreflight(s), /invalid_or_unverifiable/);
});
