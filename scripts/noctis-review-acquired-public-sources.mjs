#!/usr/bin/env node
/**
 * Offline developer-only approved-public-source -> reviewed-example bridge.
 * No network requests, customer uploads, auto-generated "ground truth",
 * provider inference or model training. Dry run is read-only.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, chmodSync, lstatSync, openSync, closeSync, constants } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { prepareNoctisReviewedPublicBundle } from "../src/lib/noctis-reviewed-public-bundle.mjs";
import { NOCTIS_MAX_SOURCE_BYTES } from "../src/lib/noctis-public-source-acquisition.mjs";

function fail(message) {
  console.error("Noctis reviewed public bundle blocked: " + message);
  process.exitCode = 2;
}
function readLimitedFile(path, max) {
  const st = lstatSync(path);
  if (!st.isFile() || st.size > max) throw new Error("input_file_not_regular_or_too_large");
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const bytes = readFileSync(fd);
    if (bytes.length > max) throw new Error("input_exceeds_limit");
    return bytes;
  } finally { closeSync(fd); }
}
function readJson(path, max) {
  let value;
  try { value = JSON.parse(readLimitedFile(path, max).toString("utf8")); }
  catch { throw new Error("invalid_or_unreadable_local_json"); }
  return value;
}
function digest(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--write" && result.write === undefined) { result.write = true; continue; }
    if (!["--catalog", "--acquired", "--candidates"].includes(key) ||
      result[key] !== undefined || !argv[i + 1] || argv[i + 1].startsWith("--")) {
      throw new Error("usage: --catalog <reviewed.json> --acquired <private-dir> --candidates <reviewed.json> [--write]");
    }
    result[key] = resolve(argv[++i]);
  }
  if (!result["--catalog"] || !result["--acquired"] || !result["--candidates"]) {
    throw new Error("catalog_acquired_directory_and_candidates_required");
  }
  return result;
}
function run() {
  const args = parseArgs(process.argv.slice(2));
  const write = args.write === true;
  if (write && process.env.NOCTIS_DATASET_EXPORT_AUTHORIZED !== "YES") {
    throw new Error("writes_require_NOCTIS_DATASET_EXPORT_AUTHORIZED=YES");
  }
  const dir = args["--acquired"];
  if (!lstatSync(dir).isDirectory()) throw new Error("acquired_directory_invalid");
  const catalogBuffer = readLimitedFile(args["--catalog"], 100_000);
  const candidateBuffer = readLimitedFile(args["--candidates"], 3_000_000);
  const catalog = readJson(args["--catalog"], 100_000);
  const acquisition = readJson(join(dir, "acquisition-manifest.json"), 100_000);
  const candidateFile = readJson(args["--candidates"], 3_000_000);
  if (!candidateFile || !Array.isArray(candidateFile.candidates) ||
    !Array.isArray(acquisition?.sources) || acquisition.sources.length > 8) {
    throw new Error("reviewed_candidate_or_acquisition_manifest_invalid");
  }
  const filenames = new Set();
  const bytesById = new Map();
  for (const rec of acquisition.sources) {
    if (!rec || typeof rec.id !== "string" ||
      !/^source-[1-8]\.txt$/.test(rec.file || "") || filenames.has(rec.file) ||
      bytesById.has(rec.id)) throw new Error("acquisition_file_reference_invalid");
    filenames.add(rec.file);
    bytesById.set(rec.id, readLimitedFile(join(dir, rec.file), NOCTIS_MAX_SOURCE_BYTES));
  }
  const suite = readJson(new URL("./fixtures/noctis-general-assistant-baseline-v1.json", import.meta.url),
    3_000_000);
  const reserved = suite.cases.flatMap(c => c.turns.filter(t => t.role === "user").map(t => t.content));
  const result = prepareNoctisReviewedPublicBundle({
    catalog, acquisition, sourceBytesById: bytesById, candidates: candidateFile.candidates,
  }, { reservedHeldoutPrompts: reserved });
  const report = {
    mode: write ? "exported_reviewed_private_jsonl" : "dry_run_no_network_no_writes",
    schema: result.bridge_schema,
    source_count: result.source_count,
    accepted_examples: result.summary.accepted,
    split_counts: result.summary.counts,
    catalog_sha256: digest(catalogBuffer),
    candidates_sha256: digest(candidateBuffer),
    baseline_suite_id: suite.suite_id,
    note: "Only independently attested, source-anchored examples; no source-rights or answer-truth guarantee, no live model evaluation or neural training.",
  };
  if (!write) { console.log(JSON.stringify(report, null, 2)); return; }
  const output = mkdtempSync(join(tmpdir(), "noctis-reviewed-public-data-"));
  try {
    chmodSync(output, 0o700);
    const checksums = {};
    for (const split of ["train", "development", "heldout"]) {
      const contents = result.splits[split].map(row => JSON.stringify({ ...row, split })).join("\n");
      const bytes = Buffer.from(contents.length ? contents + "\n" : "", "utf8");
      writeFileSync(join(output, split + ".jsonl"), bytes, { mode: 0o600, flag: "wx" });
      checksums[split + ".jsonl"] = digest(bytes);
    }
    writeFileSync(join(output, "manifest.json"), JSON.stringify({ ...report, export_sha256: checksums }, null, 2),
      { mode: 0o600, flag: "wx" });
  } catch (e) { rmSync(output, { recursive: true, force: true }); throw e; }
  console.log(JSON.stringify({ ...report, output_directory: output }, null, 2));
}
try { run(); } catch (e) { fail(e instanceof Error ? e.message : "unknown_error"); }
