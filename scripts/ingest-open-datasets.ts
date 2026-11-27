/**
 * Permissive Open-Dataset Ingestion Connector (Zero Credentials Required)
 *
 * Pulls real, open-licensed & public-domain educational, research, security, clinical, and RFC corpora:
 *   1. HuggingFaceTB/cosmopedia (`openstax` & `stanford`, Apache-2.0)
 *   2. HuggingFaceFW/fineweb-edu (`sample-10BT`, ODC-By-1.0)
 *   3. arXiv Open-Access Atom API (`cs.*`, `q-fin.RM`)
 *   4. IETF Datatracker RFC Public API
 *   5. CISA Known Exploited Vulnerabilities (KEV) Catalog
 *   6. NCBI PubMed E-utilities Biomedical Abstracts
 *
 * Writes deduplicated, validation-isolated ChatML JSONL.GZ to `data/open-datasets/noctis-open-datasets-sft.jsonl.gz`
 * plus `data/open-datasets/manifest.json`, and optionally upserts into Neon Postgres (`public.vibe_training_pair`).
 *
 * Usage:
 *   npm run ingest:open-datasets
 *   node --experimental-strip-types scripts/ingest-open-datasets.ts --hf-limit=350 --arxiv-limit=300 --rfc-limit=250 --cisa-limit=300 --pubmed-limit=200 --sync-db --db-limit=1500
 */
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import pg from "pg";
import {
  computeDailyOffsetSeed,
  deduplicateOpenRecords,
  fetchArxivBatch,
  fetchCisaKevBatch,
  fetchCosmopediaBatch,
  fetchFinewebEduBatch,
  fetchIetfRfcBatch,
  fetchPubmedBatch,
  stripNullBytes,
  type OpenIngestedRecord,
} from "../src/lib/noctis-open-ingestion.server.ts";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DATA_DIR = path.join(ROOT, "data");
const OUT_DIR = path.join(DATA_DIR, "open-datasets");

function parseIntArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return fallback;
  const parsed = Number.parseInt(hit.slice(prefix.length), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function loadEnvLocalIfMissing() {
  if (process.env.DATABASE_URL?.trim()) return;
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function loadHeldOutPrompts(): Set<string> {
  const out = new Set<string>();
  const valPath = path.join(DATA_DIR, "noctis-cot-validation-250.jsonl");
  if (!existsSync(valPath)) return out;
  for (const line of readFileSync(valPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as { messages?: Array<{ role?: string; content?: string }> };
      const u = parsed.messages?.find((m) => m.role === "user")?.content?.trim().toLowerCase();
      if (u) out.add(u);
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}

async function main() {
  loadEnvLocalIfMissing();
  mkdirSync(OUT_DIR, { recursive: true });

  const hfLimit = parseIntArg("hf-limit", 250);
  const arxivLimit = parseIntArg("arxiv-limit", 200);
  const rfcLimit = parseIntArg("rfc-limit", 150);
  const cisaLimit = parseIntArg("cisa-limit", 250);
  const pubmedLimit = parseIntArg("pubmed-limit", 150);
  const offsetSeed = parseIntArg("offset", computeDailyOffsetSeed());
  const syncDb = hasFlag("sync-db");
  const dbLimit = parseIntArg("db-limit", 1500);

  const heldOutPrompts = loadHeldOutPrompts();
  const sourceStats: Array<{ source: string; license: string; fetched: number; kept: number; error?: string }> = [];
  const allCandidates: OpenIngestedRecord[] = [];

  const pipelines: Array<{ sourceId: string; name: string; license: string; fn: () => Promise<OpenIngestedRecord[]> }> = [
    { sourceId: "cosmopedia", name: "HuggingFaceTB/cosmopedia", license: "Apache-2.0", fn: () => fetchCosmopediaBatch(hfLimit, offsetSeed) },
    { sourceId: "fineweb-edu", name: "HuggingFaceFW/fineweb-edu", license: "ODC-By-1.0", fn: () => fetchFinewebEduBatch(hfLimit, offsetSeed) },
    { sourceId: "arxiv", name: "arXiv-CS-OpenArchive", license: "arXiv-Open-Access", fn: () => fetchArxivBatch(arxivLimit, offsetSeed) },
    { sourceId: "ietf-rfc", name: "IETF-Datatracker-RFC", license: "IETF-Open-Standards", fn: () => fetchIetfRfcBatch(rfcLimit, offsetSeed) },
    { sourceId: "cisa-kev", name: "CISA-KEV-Catalog", license: "US-Gov-Public-Domain", fn: () => fetchCisaKevBatch(cisaLimit, offsetSeed) },
    { sourceId: "pubmed", name: "NCBI-PubMed-Biomed", license: "NIH-NLM-Public-Domain", fn: () => fetchPubmedBatch(pubmedLimit, offsetSeed) },
  ];

  for (const pipe of pipelines) {
    try {
      const items = await pipe.fn();
      allCandidates.push(...items);
      sourceStats.push({ source: pipe.name, license: pipe.license, fetched: items.length, kept: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sourceStats.push({ source: pipe.name, license: pipe.license, fetched: 0, kept: 0, error: msg });
    }
  }

  let heldOutSkipped = 0;
  const nonHeldOut = allCandidates.filter((rec) => {
    const prompt = rec.messages[1]?.content?.trim().toLowerCase() || "";
    if (heldOutPrompts.has(prompt)) {
      heldOutSkipped += 1;
      return false;
    }
    return true;
  });

  const kept = deduplicateOpenRecords(nonHeldOut);
  for (const rec of kept) {
    const idx = pipelines.findIndex((p) => p.sourceId === rec.sourceId);
    if (idx >= 0 && sourceStats[idx]) sourceStats[idx]!.kept += 1;
  }

  if (kept.length === 0) {
    console.error("[ingest-open-datasets] All public sources returned 0 usable records:", JSON.stringify(sourceStats));
    process.exit(1);
  }

  const outFile = path.join(OUT_DIR, "noctis-open-datasets-sft.jsonl.gz");
  const fileStream = createWriteStream(outFile);
  const gzip = createGzip({ level: 3 });
  const hash = createHash("sha256");
  let bytes = 0;
  gzip.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    hash.update(chunk);
  });
  gzip.pipe(fileStream);

  for (const rec of kept) {
    const line = `${JSON.stringify(rec)}\n`;
    if (!gzip.write(line)) {
      await once(gzip, "drain");
    }
  }
  const finished = once(fileStream, "finish");
  gzip.end();
  await finished;

  const manifest = {
    generatedAt: new Date().toISOString(),
    outputFile: path.relative(ROOT, outFile),
    offsetSeed,
    totalKeptRows: kept.length,
    heldOutSkipped,
    compressedBytes: bytes,
    sha256: hash.digest("hex"),
    sources: sourceStats,
  };
  writeFileSync(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  let postgresUpserted = 0;
  let dbTotalVerified = 0;
  if (syncDb && process.env.DATABASE_URL?.trim()) {
    const databaseUrl = process.env.DATABASE_URL.trim();
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
    });
    try {
      const client = await pool.connect();
      try {
        for (const rec of kept.slice(0, dbLimit)) {
          const q = stripNullBytes(rec.messages[1]!.content).slice(0, 600);
          const a = stripNullBytes(rec.messages[2]!.content).slice(0, 6000);
          const id = `open-${createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 20)}`;
          await client.query(
            `INSERT INTO public.vibe_training_pair (id, question, answer, domain, model, hits, verified, updated_at)
             VALUES ($1, $2, $3, $4, $5, 10, true, NOW())
             ON CONFLICT (id) DO UPDATE SET
               answer = EXCLUDED.answer,
               domain = EXCLUDED.domain,
               model = EXCLUDED.model,
               verified = true,
               updated_at = NOW()`,
            [id, q, a, rec.domain, rec.source],
          );
          postgresUpserted += 1;
        }
        const cntRes = await client.query<{ cnt: number }>(
          `SELECT COUNT(*)::int AS cnt FROM public.vibe_training_pair WHERE verified = true`,
        );
        dbTotalVerified = cntRes.rows[0]?.cnt ?? 0;
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  }

  console.log(
    JSON.stringify({
      status: "ok",
      offsetSeed,
      totalKeptRows: kept.length,
      heldOutSkipped,
      compressedBytes: bytes,
      postgresUpserted,
      dbTotalVerified,
      sources: sourceStats,
    }),
  );
}

main().catch((err) => {
  console.error("[ingest-open-datasets] error:", err);
  process.exit(1);
});
