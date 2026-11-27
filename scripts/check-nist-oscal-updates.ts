#!/usr/bin/env npx tsx
/**
 * Upstream NIST / FedRAMP / MITRE OSCAL Digest Monitor
 *
 * Audits every source listed in `src/data/rmf-deterministic-db.json` against live upstream
 * GitHub raw endpoints (usnistgov/oscal-content, oscal-compass-lab/fedramp-automation,
 * MITRE CTID), records audit status in Neon Postgres `rmf_oscal_sync_log`, and optionally
 * runs `node scripts/ingest-rmf-oscal.mjs` when `--apply` is passed and an update exists.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import pg from "pg";

interface ManifestSource {
  id: string;
  title: string;
  url: string;
  sha256: string;
  bytes: number;
}

function resolveDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const envPath = path.resolve(".env.local");
  if (fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, "utf8").match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1]!.trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

async function main() {
  const applyUpdates = process.argv.includes("--apply");
  const dbPath = path.resolve("src/data/rmf-deterministic-db.json");
  const raw = JSON.parse(fs.readFileSync(dbPath, "utf8")) as {
    manifest?: { nistVersion?: string; fedrampVersion?: string; sources?: ManifestSource[] };
  };
  const sources = raw.manifest?.sources || [];
  if (!sources.length) {
    throw new Error("No sources found in rmf-deterministic-db.json manifest");
  }

  const results: Array<{
    sourceId: string;
    localSha256: string;
    upstreamSha256: string | null;
    status: "UP_TO_DATE" | "UPDATE_AVAILABLE" | "CHECK_FAILED";
    url: string;
    bytes?: number;
    error?: string;
  }> = [];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        headers: { "User-Agent": "NoctisOscalSyncMonitor/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        results.push({
          sourceId: src.id,
          localSha256: src.sha256,
          upstreamSha256: null,
          status: "CHECK_FAILED",
          url: src.url,
          error: `HTTP ${res.status}`,
        });
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const upSha = crypto.createHash("sha256").update(buf).digest("hex");
      results.push({
        sourceId: src.id,
        localSha256: src.sha256,
        upstreamSha256: upSha,
        status: upSha === src.sha256 ? "UP_TO_DATE" : "UPDATE_AVAILABLE",
        url: src.url,
        bytes: buf.byteLength,
      });
    } catch (err) {
      results.push({
        sourceId: src.id,
        localSha256: src.sha256,
        upstreamSha256: null,
        status: "CHECK_FAILED",
        url: src.url,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const updatesAvailable = results.filter((r) => r.status === "UPDATE_AVAILABLE").length;
  const checkFailed = results.filter((r) => r.status === "CHECK_FAILED").length;
  const upToDate = results.filter((r) => r.status === "UP_TO_DATE").length;

  let syncedApplied = false;
  if (applyUpdates && updatesAvailable > 0) {
    execFileSync(process.execPath, ["scripts/ingest-rmf-oscal.mjs"], { stdio: "inherit" });
    syncedApplied = true;
  }

  const dbUrl = resolveDatabaseUrl();
  if (dbUrl) {
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
      const runStamp = Date.now();
      for (let i = 0; i < results.length; i += 1) {
        const r = results[i]!;
        const finalStatus = syncedApplied && r.status === "UPDATE_AVAILABLE" ? "SYNCED" : r.status;
        await client.query(
          `
          insert into public.rmf_oscal_sync_log (sync_id, source_id, local_sha256, upstream_sha256, status, upstream_url, details)
          values ($1, $2, $3, $4, $5, $6, $7::jsonb)
          `,
          [
            `OSCAL-${runStamp}-${i}-${r.sourceId}`,
            r.sourceId,
            r.localSha256,
            r.upstreamSha256,
            finalStatus,
            r.url,
            JSON.stringify({ bytes: r.bytes ?? null, error: r.error ?? null }),
          ],
        );
      }
    } finally {
      await client.end();
    }
  }

  console.log("OSCAL Sync Audit Complete:", {
    totalSources: results.length,
    upToDate,
    updatesAvailable,
    checkFailed,
    syncedApplied,
    details: results.map((r) => ({ id: r.sourceId, status: r.status })),
  });
}

main().catch((err) => {
  console.error("OSCAL sync monitor failed:", err);
  process.exit(1);
});
