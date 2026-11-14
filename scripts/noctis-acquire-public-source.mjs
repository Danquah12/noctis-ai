#!/usr/bin/env node
/** Developer/operator-only; never invoked by app requests or CI. */
import { readFileSync, mkdtempSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { planNoctisPublicSourceAcquisition, acquireNoctisPinnedPublicSource } from "../src/lib/noctis-public-source-acquisition.mjs";

async function run() {
  const args = process.argv.slice(2);
  if ((args.length !== 2 && args.length !== 3) || args[0] !== "--manifest" ||
      !args[1] || args[1].startsWith("--") ||
      (args.length === 3 && args[2] !== "--fetch")) {
    throw new Error("Usage: --manifest <reviewed-local-catalog.json> [--fetch]");
  }
  const shouldFetch = args.includes("--fetch");
  if (shouldFetch && process.env.NOCTIS_PUBLIC_SOURCE_FETCH_AUTHORIZED !== "YES") {
    throw new Error("Fetching requires NOCTIS_PUBLIC_SOURCE_FETCH_AUTHORIZED=YES.");
  }
  const raw = readFileSync(resolve(args[1]), "utf8");
  if (raw.length > 100_000) throw new Error("Catalog too large.");
  const plan = planNoctisPublicSourceAcquisition(JSON.parse(raw));
  if (!shouldFetch) {
    console.log(JSON.stringify({ mode: "dry_run_no_network", schema: plan.schema,
      source_count: plan.sources.length, source_ids: plan.sources.map(source => source.id),
      note: "No sources downloaded. Declared rights not independently verified by software." }, null, 2));
    return;
  }
  // Fetch all and verify every digest before writing any content. Fail closed.
  const acquired = [];
  for (const src of plan.sources) acquired.push(await acquireNoctisPinnedPublicSource(src));
  const dir = mkdtempSync(join(tmpdir(), "noctis-private-public-corpus-"));
  try {
    chmodSync(dir, 0o700);
    const records = [];
    for (let i = 0; i < acquired.length; i++) {
      const item = acquired[i];
      const source = plan.sources[i];
      const filename = `source-${i + 1}.txt`;
      writeFileSync(join(dir, filename), item.bytes, { mode: 0o600, flag: "wx" });
      records.push({ id: source.id, file: filename, sha256: item.sha256,
        byte_count: item.byte_count, media_type: item.media_type, origin_url: source.url,
        license_id: source.license_id, usage_rights: source.usage_rights,
        license_review_reference: source.license_review_reference,
        attribution_required: source.attribution_required,
        status: "ACQUIRED_UNREVIEWED_CONTENT_NOT_TRAINING_DATA" });
    }
    writeFileSync(join(dir, "acquisition-manifest.json"), JSON.stringify({ schema: plan.schema,
      sources: records, note: "Recheck actual content/privacy/rights and independently validate examples before downstream preparation. No neural training occurred." }, null, 2),
    { mode: 0o600, flag: "wx" });
  } catch (error) { rmSync(dir, { recursive: true, force: true }); throw error; }
  console.log(JSON.stringify({ mode: "verified_private_download", source_count: acquired.length,
    output_directory: dir, note: "Raw pinned content only. No examples approved or weights trained." }, null, 2));
}
run().catch(error => { console.error("Noctis public-source acquisition blocked: " + (error instanceof Error ? error.message : "unknown failure")); process.exitCode = 2; });
