#!/usr/bin/env node
/**
 * Internal, offline reviewed-dataset-to-SFT converter.
 * No network, model selection, training, GPU use or heldout export.
 * Read only a private export from scripts/noctis-prepare-internal-dataset.mjs.
 * Refuses file writes unless specifically authorized.
 */
import { lstatSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { buildNoctisSftPreflight } from "../src/lib/noctis-sft-preflight.mjs";

const NAMES = ["train", "development", "heldout"];
const LIMIT_BYTES = 50_000_000;

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
  const splits = {};
  for (const name of NAMES) {
    const data = privateFile(join(inputDir, name + ".jsonl"));
    const lines = data.split("\n").filter(Boolean);
    if (lines.length > 200000 || original.summary.counts[name] !== lines.length) {
      throw new Error("Input blocked: declared dataset count mismatch.");
    }
    splits[name] = lines.map(line => JSON.parse(line));
  }
  const candidate = buildNoctisSftPreflight(splits);
  const report = {
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
    const rows = candidate[name].map(item => JSON.stringify(item));
    writeFileSync(join(outputDir, name + ".jsonl"), rows.join("\n") + "\n", {
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
