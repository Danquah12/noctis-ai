#!/usr/bin/env node
/**
 * Internal, offline reviewed-dataset-to-SFT converter.
 * No network, model selection, training, GPU use or heldout export.
 * Read only a private export from scripts/noctis-prepare-internal-dataset.mjs.
 * Refuses file writes unless specifically authorized.
 */
import { lstatSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { buildNoctisSftPreflight } from "../src/lib/noctis-sft-preflight.mjs";

const NAMES = /** @type {Array<"train"|"development"|"heldout">} */ (["train", "development", "heldout"]);
const LIMIT_BYTES = 50_000_000;
const HASH = /^[a-f0-9]{64}$/;
const sha256 = value => createHash("sha256").update(value, "utf8").digest("hex");

function privateFile(path) {
  const st = lstatSync(path);
  if (!st.isFile() || st.isSymbolicLink() || st.size > LIMIT_BYTES || (st.mode & 0o077) !== 0) {
    throw new Error("Input blocked: requires bounded private regular files (0600).");
  }
  return readFileSync(path, "utf8");
}

function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input-dir");
  const write = args.includes("--write");
  if (inputIndex !== 0 || !args[1] || args[1].startsWith("--") ||
      args.length !== (write ? 3 : 2) || (write && args[2] !== "--write")) {
    throw new Error("Use --input-dir <private-approved-export-directory> [--write].");
  }
  if (write && process.env.NOCTIS_SFT_EXPORT_AUTHORIZED !== "YES") {
    throw new Error("No files created: --write requires NOCTIS_SFT_EXPORT_AUTHORIZED=YES.");
  }
  const inputDir = resolve(args[1]);
  const directory = lstatSync(inputDir);
  if (!directory.isDirectory() || directory.isSymbolicLink() || (directory.mode & 0o077) !== 0) {
    throw new Error("Input blocked: directory must be a private regular directory (0700).");
  }
  const original = JSON.parse(privateFile(join(inputDir, "manifest.json")));
  if (original.schema !== "noctis.internal.dataset.v1" ||
      original.mode !== "exported_private_local_files" ||
      !original.summary?.counts) {
    throw new Error("Input blocked: not an authorized Noctis internal dataset export.");
  }
  if (!HASH.test(original.input_sha256 || "") ||
      !original.split_sha256 ||
      NAMES.some(name => !HASH.test(original.split_sha256[name] || ""))) {
    throw new Error("Input blocked: missing_or_invalid_source_split_digests.");
  }
  const splits = /** @type {Record<"train"|"development"|"heldout", any[]>} */ ({ train: [], development: [], heldout: [] });
  for (const name of NAMES) {
    const data = privateFile(join(inputDir, name + ".jsonl"));
    // Verify the exact JSONL bytes, not just per-example hashes. This also
    // detects changes to heldout records without exporting heldout contents.
    if (sha256(data) !== original.split_sha256[name]) {
      throw new Error("Input blocked: source_split_checksum_mismatch.");
    }
    const lines = data.split("\n").filter(Boolean);
    if (lines.length > 200000 || original.summary.counts[name] !== lines.length) {
      throw new Error("Input blocked: declared dataset count mismatch.");
    }
    splits[name] = lines.map(line => JSON.parse(line));
  }
  const candidate = buildNoctisSftPreflight(splits);
  const trainingBytes = Object.fromEntries(["train", "development"].map(name =>
    [name, candidate[name].map(item => JSON.stringify(item)).join("\n") + "\n"]));
  const report = {
    train_file_sha256: sha256(trainingBytes.train),
    development_file_sha256: sha256(trainingBytes.development),
    ...candidate.manifest,
    schema: candidate.schema,
    input_manifest_sha256: original.input_sha256,
    mode: write ? "private_sft_files_exported" : "dry_run_no_file_writes",
    note: "Only train and development may be used for trainer configuration. The sealed heldout is never exported or tuned against. No license or privacy guarantee; no model trained.",
  };
  if (!write) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const outputDir = mkdtempSync(join(tmpdir(), "noctis-sft-private-"));
  for (const name of ["train", "development"]) {
    writeFileSync(join(outputDir, name + ".jsonl"), trainingBytes[name], {
      encoding: "utf8", mode: 0o600, flag: "wx",
    });
  }
  writeFileSync(join(outputDir, "manifest.json"), JSON.stringify(report, null, 2), {
    encoding: "utf8", mode: 0o600, flag: "wx",
  });
  console.log(JSON.stringify({ ...report, output_directory: outputDir }, null, 2));
}

try { main(); } catch (error) {
  console.error("Noctis SFT preflight blocked: " + (error instanceof Error ? error.message : "Unknown error"));
  process.exitCode = 2;
}
