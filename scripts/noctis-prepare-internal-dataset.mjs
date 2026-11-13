#!/usr/bin/env node
/**
 * Developer-only offline Noctis dataset preparation. No data acquisition,
 * provider API calls, uploads, model evaluation, or model-weight training.
 * Dry-run unless BOTH --write and NOCTIS_DATASET_EXPORT_AUTHORIZED=YES are set.
 * Exports are placed in a new private OS temporary directory, never in Git.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { prepareNoctisInternalDataset } from "../src/lib/noctis-internal-dataset.mjs";

function fail(message) {
  console.error("Noctis offline preparation aborted: " + message);
  process.exitCode = 2;
}
function run() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const writes = args.includes("--write");
  const allowed = new Set(["--input", "--write"]);
  const others = args.filter((arg, index) => !allowed.has(arg) && index !== inputIndex + 1);
  if (inputIndex === -1 || !args[inputIndex + 1] || args[inputIndex + 1].startsWith("--") || others.length) {
    throw new Error("Use --input <internal-approved-local-manifest.json> [--write].");
  }
  if (writes && process.env.NOCTIS_DATASET_EXPORT_AUTHORIZED !== "YES") {
    throw new Error("No files created: --write requires NOCTIS_DATASET_EXPORT_AUTHORIZED=YES.");
  }
  const inputPath = resolve(args[inputIndex + 1]);
  const raw = readFileSync(inputPath, "utf8");
  if (raw.length > 50_000_000) throw new Error("Input exceeds the offline size limit.");
  const manifest = JSON.parse(raw);
  const baseline = JSON.parse(readFileSync(new URL("./fixtures/noctis-general-assistant-baseline-v1.json", import.meta.url), "utf8"));
  const reserved = baseline.cases.flatMap(item => item.turns.filter(t => t.role === "user").map(t => t.content));
  const result = prepareNoctisInternalDataset(manifest, { reservedHeldoutPrompts: reserved });
  const { rejected, ...summary } = result.summary;
  const byCode = {};
  for (const item of rejected) byCode[item.code] = (byCode[item.code] || 0) + 1;
  const report = {
    mode: writes ? "exported_private_local_files" : "dry_run_no_file_writes",
    schema: result.schema, summary,
    reject_codes: byCode,
    input_sha256: createHash("sha256").update(raw).digest("hex"),
    baseline_id: baseline.suite_id,
    note: "Source permissions and independent validation are manifest attestations; human/legal review remains necessary. No model training performed.",
  };
  if (!writes) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "noctis-private-data-"));
  for (const split of ["train", "development", "heldout"]) {
    const rows = result.splits[split].map(item => JSON.stringify({ ...item, split }));
    writeFileSync(join(dir, split + ".jsonl"), rows.length ? rows.join("\n") + "\n" : "", {
      encoding: "utf8", mode: 0o600, flag: "wx",
    });
  }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(report, null, 2), {
    encoding: "utf8", mode: 0o600, flag: "wx",
  });
  console.log(JSON.stringify({ ...report, output_directory: dir }, null, 2));
}
try { run(); } catch (error) { fail(error instanceof Error ? error.message : "Unknown input error"); }
