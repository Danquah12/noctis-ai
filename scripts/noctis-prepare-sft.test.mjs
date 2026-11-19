import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cli = new URL("./noctis-prepare-sft.mjs", import.meta.url).pathname;
const sha = x => createHash("sha256").update(x).digest("hex");

function fixture(dir) {
  const items = {};
  const splitSha256 = {};
  for (const [split, id] of [["train", "a"], ["development", "b"], ["heldout", "c"]]) {
    const prompt = { train: "Explain evaporation, condensation and precipitation in the water cycle.", development: "Describe the role of a transistor in a switching circuit.", heldout: "Outline political changes during the French Revolution in Europe." }[split];
    const completion = "Independently checked synthetic answer " + id + " for testing.";
    items[split] = [{
      id, prompt, completion, split,
      provenance: {
        source_id: "src-" + id, source_kind: "project_authored",
        source_group_sha256: sha("group:" + id),
        license_id: "NOCTIS-ORIGINAL", attribution_required: false,
        example_sha256: sha(prompt + "\n" + completion),
        validation_kind: "independent_review", validation_reference: "internal-review-" + id,
      },
    }];
    const fileBytes = items[split].map(x => JSON.stringify(x)).join("\n") + "\n";
    splitSha256[split] = sha(fileBytes);
    writeFileSync(join(dir, split + ".jsonl"), fileBytes, { mode: 0o600 });
  }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({
    schema: "noctis.internal.dataset.v1",
    mode: "exported_private_local_files",
    input_sha256: "a".repeat(64),
    split_sha256: splitSha256,
    summary: { counts: { train: 1, development: 1, heldout: 1 } },
  }), { mode: 0o600 });
  return items;
}
const run = (dir, write, authorized) => spawnSync(process.execPath,
  [cli, "--input-dir", dir, ...(write ? ["--write"] : [])],
  { encoding: "utf8", env: {
    ...process.env,
    NOCTIS_SFT_EXPORT_AUTHORIZED: authorized ? "YES" : "NO",
  } });

test("CLI dry-run performs no writes and reports locked heldout counts", () => {
  const dir = mkdtempSync(join(tmpdir(), "noctis-sft-cli-test-"));
  try {
    fixture(dir);
    const before = readdirSync(dir).sort();
    const result = run(dir, false, false);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.mode, "dry_run_no_file_writes");
    assert.equal(report.sealed_heldout_count, 1);
    assert.equal(report.train_count, 1);
    assert.equal(report.development_count, 1);
    assert.ok(!("output_directory" in report));
    assert.deepEqual(readdirSync(dir).sort(), before);
  } finally { rmSync(dir, { force: true, recursive: true }); }
});

test("CLI requires authorization to write even synthetic example exports", () => {
  const dir = mkdtempSync(join(tmpdir(), "noctis-sft-cli-test-"));
  try {
    fixture(dir);
    const result = run(dir, true, false);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /NOCTIS_SFT_EXPORT_AUTHORIZED/);
    assert.deepEqual(readdirSync(dir).sort(),
      ["development.jsonl", "heldout.jsonl", "manifest.json", "train.jsonl"]);
  } finally { rmSync(dir, { force: true, recursive: true }); }
});

test("authorized export writes only training and development in separate private directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "noctis-sft-cli-test-"));
  let outputDir;
  try {
    fixture(dir);
    const result = run(dir, true, true);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    outputDir = report.output_directory;
    assert.deepEqual(readdirSync(outputDir).sort(), ["development.jsonl", "manifest.json", "train.jsonl"]);
    const train = JSON.parse(readFileSync(join(outputDir, "train.jsonl"), "utf8").trim());
    assert.equal(train.messages[0].role, "user");
    assert.equal(train.messages[1].role, "assistant");
    assert.ok(!readFileSync(join(outputDir, "train.jsonl"), "utf8").includes("French Revolution"));
    assert.equal(report.train_file_sha256, sha(readFileSync(join(outputDir, "train.jsonl"), "utf8")));
    assert.equal(report.development_file_sha256, sha(readFileSync(join(outputDir, "development.jsonl"), "utf8")));
  } finally {
    if (outputDir) rmSync(outputDir, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI refuses tampered examples and inconsistent declared partition counts", () => {
  const dir = mkdtempSync(join(tmpdir(), "noctis-sft-cli-test-"));
  try {
    const rows = fixture(dir);
    rows.train[0].prompt += " malicious modification";
    writeFileSync(join(dir, "train.jsonl"), JSON.stringify(rows.train[0]) + "\n", { mode: 0o600 });
    assert.equal(run(dir, false, false).status, 2);
    fixture(dir);
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({
      schema: "noctis.internal.dataset.v1", mode: "exported_private_local_files",
      summary: { counts: { train: 99, development: 1, heldout: 1 } },
    }), { mode: 0o600 });
    assert.match(run(dir, false, false).stderr, /count mismatch/);
  } finally { rmSync(dir, { force: true, recursive: true }); }
});

test("CLI rejects heldout edits even when the example's own digest is recomputed", () => {
  const dir = mkdtempSync(join(tmpdir(), "noctis-sft-sealed-test-"));
  try {
    const items = fixture(dir);
    const row = items.heldout[0];
    row.prompt += " Supplemental private details must not be exported.";
    row.provenance.example_sha256 = sha(row.prompt + "\n" + row.completion);
    writeFileSync(join(dir, "heldout.jsonl"), JSON.stringify(row) + "\n", { mode: 0o600 });
    const result = run(dir, false, false);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /source_split_checksum_mismatch/);
    assert.ok(!result.stderr.includes("Supplemental private details"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("CLI blocks legacy unsigned split manifests pending regeneration", () => {
  const dir = mkdtempSync(join(tmpdir(), "noctis-sft-legacy-test-"));
  try {
    fixture(dir);
    const manifestPath = join(dir, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    delete manifest.split_sha256;
    writeFileSync(manifestPath, JSON.stringify(manifest), { mode: 0o600 });
    const result = run(dir, false, false);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /missing_or_invalid_source_split_digests/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
