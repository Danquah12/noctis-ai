/** No-network unit tests for the opt-in internal dataset preparation core. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeNoctisPrompt, prepareNoctisInternalDataset } from "../src/lib/noctis-internal-dataset.mjs";

const src = (overrides = {}) => ({
  id: "noctis-original-v1", kind: "project_authored",
  license_id: "NOCTIS-ORIGINAL", usage_rights: "model_training",
  training_allowed: true, approved: true, reviewed_by: "internal-reviewer",
  ...overrides,
});
const row = (id, prompt, overrides = {}) => ({
  id, source_id: "noctis-original-v1", prompt,
  completion: "A verified explanation with enough substance to use as an example.",
  validation: { kind: "independent_review", passed: true,
    verified_by: "second-reviewer", reference: "internal-test-record-01" },
  ...overrides,
});
const prepare = (examples, sources = [src()], options = {}) =>
  prepareNoctisInternalDataset({ sources, examples }, options);
const accepted = result => Object.values(result.splits).flat();

test("normalization is stable across unicode and whitespace for duplicate grouping", () => {
  assert.equal(normalizeNoctisPrompt("  HELLO\u00a0 World  "), "hello world");
  assert.equal(normalizeNoctisPrompt("HELLO    World"), "hello world");
});
test("approved internally authored, independently verified examples are admitted with evidence", () => {
  const result = prepare([row("one", "Explain a water-cycle diagram.")]);
  assert.equal(result.summary.accepted, 1);
  const item = accepted(result)[0];
  assert.equal(item.id, "one");
  assert.equal(item.provenance.source_id, "noctis-original-v1");
  assert.equal(item.provenance.license_id, "NOCTIS-ORIGINAL");
  assert.equal(item.provenance.validation_kind, "independent_review");
  assert.match(item.provenance.example_sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.schema, "noctis.internal.dataset.v1");
});
test("no source is silently considered approved", () => {
  const result = prepare([row("one", "Explain valves.")], [src({ approved: false })]);
  assert.equal(result.summary.accepted, 0);
  assert.ok(result.summary.rejected.some(r => r.code === "source_not_approved_for_training"));
  assert.ok(result.summary.rejected.some(r => r.code === "source_unapproved_or_missing"));
});
test("public license and HTTPS origin must both pass the allowlist", () => {
  const example = row("example1", "Explain an engineering safety factor.", { source_id: "public-1" });
  const base = src({ id: "public-1", kind: "public_open", license_id: "CC-BY-4.0",
    origin_url: "https://example.org/open-reference" });
  const good = prepare([example], [base]);
  assert.equal(good.summary.accepted, 1);
  assert.equal(accepted(good)[0].provenance.attribution_required, true);
  for (const bad of [
    { license_id: "CC-BY-NC-4.0" },
    { license_id: "unknown" },
    { origin_url: "http://example.org/" },
    { origin_url: "https://user:password@example.org/" },
  ]) {
    assert.equal(prepare([example], [{ ...base, ...bad }]).summary.accepted, 0);
  }
});
test("unverified and model-self-asserted answers never enter the dataset", () => {
  for (const validation of [
    undefined,
    { kind: "self_assessment", passed: true, verified_by: "model", reference: "self-judged" },
    { kind: "independent_review", passed: false, verified_by: "reviewer", reference: "failed-test" },
  ]) {
    assert.equal(prepare([row("one", "Design a safe loop.", { validation })]).summary.accepted, 0);
  }
});
test("private chats and customer records are denied even when other flags are approved", () => {
  const badSource = src({ user_conversation: true });
  assert.equal(prepare([row("one", "Private conversation.")], [badSource]).summary.accepted, 0);
  for (const bad of [{ from_user_conversation: true }, { customer_data: true },
    { private_record: true }, { contains_personal_data: true }]) {
    assert.equal(prepare([row("one", "Never use this case file.", bad)]).summary.accepted, 0);
  }
});
test("basic secret, email, and phone-number indicators block export", () => {
  for (const prompt of [
    "Email test.person@example.com about this question.",
    "Use token sk-abcdefghijklmnopqrstu in the API request.",
    "Contact 202-555-0199 for this test.",
    "-----BEGIN PRIVATE KEY-----"
  ]) {
    assert.equal(prepare([row("one", prompt)]).summary.accepted, 0);
  }
});
test("reserved evaluation prompts cannot appear in any export split", () => {
  const result = prepare([row("one", "  Explain  WATER cycle. ")], [src()],
    { reservedHeldoutPrompts: ["explain water cycle."] });
  assert.equal(result.summary.accepted, 0);
  assert.equal(result.summary.rejected.at(-1).code, "reserved_evaluation_prompt");
});
test("identical and conflicting repeated prompts cannot leak across splits", () => {
  const result = prepare([
    row("one", "What is risk?"),
    row("two", "  WHAT   is risk?  "),
    row("three", "What is risk?", { completion: "A conflicting answer" }),
  ]);
  assert.equal(result.summary.accepted, 1);
  assert.equal(result.summary.rejected.filter(r => r.code === "duplicate_prompt").length, 1);
  assert.equal(result.summary.rejected.filter(r => r.code === "conflicting_duplicate_prompt").length, 1);
});
test("same example ID is not accepted twice; missing sources are not trusted", () => {
  const result = prepare([
    row("same", "What is viscosity?"),
    row("same", "What is elasticity?"),
    row("no-source", "How does a battery work?", { source_id: "unlisted" }),
  ]);
  assert.equal(result.summary.accepted, 1);
  assert.ok(result.summary.rejected.some(r => r.code === "duplicate_example_id"));
  assert.ok(result.summary.rejected.some(r => r.code === "source_unapproved_or_missing"));
});
test("prompt-based partition assignment remains stable when input order changes", () => {
  const examples = Array.from({ length: 50 }, (_, i) => row("ex" + i, "Explain model calibration case " + i + "."));
  const a = prepare(examples), b = prepare([...examples].reverse());
  for (const split of ["train", "development", "heldout"]) {
    assert.deepEqual(a.splits[split].map(x => x.id).sort(), b.splits[split].map(x => x.id).sort());
  }
  assert.equal(a.summary.accepted, 50);
  assert.equal(a.summary.counts.train + a.summary.counts.development + a.summary.counts.heldout, 50);
});
test("dataset source and example bounds fail closed without echoing private text", () => {
  assert.throws(() => prepareNoctisInternalDataset({ sources: {}, examples: [] }), TypeError);
  assert.equal(prepare([row("x", "  ")]).summary.accepted, 0);
  assert.equal(prepare([row("x", "hello", { completion: "" })]).summary.accepted, 0);
  assert.ok(!JSON.stringify(prepare([row("bad", "example person@example.com")]).summary).includes("person@example.com"));
});
