/** Synthetic-only, no-network CLI tests. Never access user data or model providers. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const cli = new URL("./noctis-prepare-internal-dataset.mjs", import.meta.url);
const baseline = JSON.parse(readFileSync(new URL("./fixtures/noctis-general-assistant-baseline-v1.json", import.meta.url), "utf8"));
const original = {
  sources: [{
    id: "synthetic", kind: "project_authored", license_id: "NOCTIS-ORIGINAL",
    usage_rights: "model_training", training_allowed: true, approved: true,
    reviewed_by: "internal-reviewer"
  }],
  examples: [{
    id: "sample-1", source_id: "synthetic", prompt: "What is an algorithm?",
    completion: "An algorithm is a defined sequence of operations.",
    validation: { kind: "deterministic_test", passed: true, verified_by: "checker-1", reference: "synthetic-fixture" }
  },{
    id: "baseline-contamination", source_id: "synthetic", prompt: baseline.cases[0].turns[0].content,
    completion: "This must not enter training.",
    validation: { kind: "independent_review", passed: true, verified_by: "checker-2", reference: "synthetic-fixture" }
  }],
};
const dir = mkdtempSync(join(tmpdir(), "noctis-test-dataset-"));
const input = join(dir, "approved-fixture.json");
writeFileSync(input, JSON.stringify(original), { mode: 0o600 });
function invoke(extra=[],env={}) {
  return spawnSync(process.execPath, [cli.pathname, "--input", input, ...extra], {
    encoding: "utf8", timeout: 10000,
    env: { ...process.env, NOCTIS_DATASET_EXPORT_AUTHORIZED: "", ...env },
  });
}
test("dry-run only emits sanitized counts and reserves original held-out questions", () => {
  const result = invoke();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mode, "dry_run_no_file_writes");
  assert.equal(report.summary.accepted, 1);
  assert.equal(report.reject_codes.reserved_evaluation_prompt, 1);
  assert.ok(!result.stdout.includes("What is an algorithm?"));
});
test("--write is denied without separate explicit export authorization", () => {
  const result = invoke(["--write"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DATASET_EXPORT_AUTHORIZED=YES/);
});
test("authorized synthetic exports use a private OS temporary directory", () => {
  const result = invoke(["--write"], { NOCTIS_DATASET_EXPORT_AUTHORIZED: "YES" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const output = report.output_directory;
  try {
    assert.ok(output.startsWith(tmpdir()));
    const rows = ["train", "development", "heldout"]
      .flatMap(name => readFileSync(join(output, name + ".jsonl"), "utf8").trim().split("\n").filter(Boolean));
    assert.equal(rows.length, 1);
    const item = JSON.parse(rows[0]);
    assert.equal(item.provenance.source_id, "synthetic");
    assert.equal(item.provenance.license_id, "NOCTIS-ORIGINAL");
    assert.equal(item.id, "sample-1");
    if (process.platform !== "win32") {
      assert.equal(statSync(join(output, item.split + ".jsonl")).mode & 0o777, 0o600);
    }
  } finally { rmSync(output, { recursive: true, force: true }); }
});
test("remove synthetic test fixture", () => {
  rmSync(dir, { recursive: true, force: true });
});
