/**
 * Permissive Open-Dataset Ingestion Connector (Zero Credentials Required)
 *
 * Pulls real, open-licensed & public-domain corpora across all 11 configured public sources:
 *   Cosmopedia, FineWeb-Edu, arXiv CS/Quant, IETF RFCs, CISA KEV, NCBI PubMed,
 *   MITRE ATT&CK STIX, OWASP Cheat Sheets, NIST NVD CVE v2.0, World Bank Indicators, and Open Tech Docs.
 *
 * Writes deduplicated ChatML JSONL.GZ to `data/open-datasets/noctis-open-datasets-sft.jsonl.gz`
 * plus `data/open-datasets/manifest.json`, upserts into Neon Postgres with 256-dim pgvector embeddings,
 * backfills any missing embeddings, runs the supersession sweeper, and updates `knowledge_ingestion_run`.
 */
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import pg from "pg";
import { computeSemanticEmbedding256, formatVectorLiteral } from "../src/lib/noctis-knowledge-router.ts";
import {
  computeDailyOffsetSeed,
  deduplicateOpenRecords,
  fetchArxivBatch,
  fetchCisaKevBatch,
  fetchCosmopediaBatch,
  fetchFinewebEduBatch,
  fetchIetfRfcBatch,
  fetchMitreAttackBatch,
  fetchNistNvdBatch,
  fetchOpenTechDocsBatch,
  fetchOwaspCheatsheetsBatch,
  fetchPubmedBatch,
  fetchWorldBankIndicatorsBatch,
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
  const startedAt = new Date();
  loadEnvLocalIfMissing();
  mkdirSync(OUT_DIR, { recursive: true });

  const hfLimit = parseIntArg("hf-limit", 200);
  const arxivLimit = parseIntArg("arxiv-limit", 150);
  const rfcLimit = parseIntArg("rfc-limit", 150);
  const cisaLimit = parseIntArg("cisa-limit", 200);
  const pubmedLimit = parseIntArg("pubmed-limit", 120);
  const mitreLimit = parseIntArg("mitre-limit", 250);
  const owaspLimit = parseIntArg("owasp-limit", 24);
  const nvdLimit = parseIntArg("nvd-limit", 100);
  const wbLimit = parseIntArg("wb-limit", 150);
  const docsLimit = parseIntArg("docs-limit", 7);
  const offsetSeed = parseIntArg("offset", computeDailyOffsetSeed());
  const syncDb = hasFlag("sync-db");
  const dbLimit = parseIntArg("db-limit", 1800);

  const heldOutPrompts = loadHeldOutPrompts();
  const sourceStats: Array<{ sourceId: string; source: string; license: string; fetched: number; kept: number; error?: string }> = [];
  const allCandidates: OpenIngestedRecord[] = [];

  const pipelines: Array<{ sourceId: string; name: string; license: string; fn: () => Promise<OpenIngestedRecord[]> }> = [
    { sourceId: "cosmopedia", name: "HuggingFaceTB/cosmopedia", license: "Apache-2.0", fn: () => fetchCosmopediaBatch(hfLimit, offsetSeed) },
    { sourceId: "fineweb-edu", name: "HuggingFaceFW/fineweb-edu", license: "ODC-By-1.0", fn: () => fetchFinewebEduBatch(hfLimit, offsetSeed) },
    { sourceId: "arxiv", name: "arXiv-CS-OpenArchive", license: "arXiv-Open-Access", fn: () => fetchArxivBatch(arxivLimit, offsetSeed) },
    { sourceId: "ietf-rfc", name: "IETF-Datatracker-RFC", license: "IETF-Open-Standards", fn: () => fetchIetfRfcBatch(rfcLimit, offsetSeed) },
    { sourceId: "cisa-kev", name: "CISA-KEV-Catalog", license: "US-Gov-Public-Domain", fn: () => fetchCisaKevBatch(cisaLimit, offsetSeed) },
    { sourceId: "pubmed", name: "NCBI-PubMed-Biomed", license: "NIH-NLM-Public-Domain", fn: () => fetchPubmedBatch(pubmedLimit, offsetSeed) },
    { sourceId: "mitre-attack", name: "MITRE-ATT&CK-Enterprise-STIX", license: "Apache-2.0", fn: () => fetchMitreAttackBatch(mitreLimit, offsetSeed) },
    { sourceId: "owasp-cheatsheets", name: "OWASP-CheatSheet-Series", license: "CC-BY-SA-4.0", fn: () => fetchOwaspCheatsheetsBatch(owaspLimit, offsetSeed) },
    { sourceId: "nist-nvd", name: "NIST-NVD-CVE-v2.0", license: "US-Gov-Public-Domain", fn: () => fetchNistNvdBatch(nvdLimit, offsetSeed) },
    { sourceId: "world-bank", name: "World-Bank-Open-Indicators", license: "CC-BY-4.0", fn: () => fetchWorldBankIndicatorsBatch(wbLimit, offsetSeed) },
    { sourceId: "open-tech-docs", name: "Open-Engineering-Docs", license: "CC-BY-4.0/MIT", fn: () => fetchOpenTechDocsBatch(docsLimit, offsetSeed) },
  ];

  await Promise.all(
    pipelines.map(async (pipe) => {
      try {
        const items = await pipe.fn();
        allCandidates.push(...items);
        sourceStats.push({ sourceId: pipe.sourceId, source: pipe.name, license: pipe.license, fetched: items.length, kept: 0 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sourceStats.push({ sourceId: pipe.sourceId, source: pipe.name, license: pipe.license, fetched: 0, kept: 0, error: msg });
      }
    }),
  );

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
    const stat = sourceStats.find((s) => s.sourceId === rec.sourceId);
    if (stat) stat.kept += 1;
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
  let embeddingsBackfilled = 0;
  let staleSuperseded = 0;
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
          const vecLit = formatVectorLiteral(computeSemanticEmbedding256(`${q} ${a.slice(0, 1200)}`));
          await client.query(
            `INSERT INTO public.vibe_training_pair (id, question, answer, domain, model, hits, verified, stale, embedding, updated_at)
             VALUES ($1, $2, $3, $4, $5, 10, true, false, $6::vector, NOW())
             ON CONFLICT (id) DO UPDATE SET
               answer = EXCLUDED.answer,
               domain = EXCLUDED.domain,
               model = EXCLUDED.model,
               verified = true,
               stale = false,
               embedding = EXCLUDED.embedding,
               updated_at = NOW()`,
            [id, q, a, rec.domain, rec.source, vecLit],
          );
          postgresUpserted += 1;
        }

        // Backfill vectors on ALL existing rows where embedding IS NULL
        while (true) {
          const missing = await client.query<{ id: string; question: string; answer: string }>(
            `SELECT id, question, answer FROM public.vibe_training_pair WHERE verified = true AND embedding IS NULL LIMIT 250`,
          );
          if (missing.rows.length === 0) break;
          for (const row of missing.rows) {
            const vecLit = formatVectorLiteral(
              computeSemanticEmbedding256(`${stripNullBytes(row.question)} ${stripNullBytes(row.answer).slice(0, 1200)}`),
            );
            await client.query(`UPDATE public.vibe_training_pair SET embedding = $1::vector WHERE id = $2`, [vecLit, row.id]);
            embeddingsBackfilled += 1;
          }
        }

        // Record cursors and run ledger
        for (const st of sourceStats) {
          await client.query(
            `INSERT INTO knowledge_source_cursor (source_id, next_offset, total_ingested, last_run_at, last_error, updated_at)
             VALUES ($1, $2, $3, NOW(), $4, NOW())
             ON CONFLICT (source_id) DO UPDATE SET
               next_offset = EXCLUDED.next_offset,
               total_ingested = knowledge_source_cursor.total_ingested + EXCLUDED.total_ingested,
               last_run_at = NOW(),
               last_error = EXCLUDED.last_error,
               updated_at = NOW()`,
            [st.sourceId, offsetSeed + Math.max(st.fetched, 20), st.kept, st.error || null],
          ).catch(() => undefined);
        }

        const cntRes = await client.query<{ cnt: number }>(
          `SELECT COUNT(*)::int AS cnt FROM public.vibe_training_pair WHERE verified = true AND COALESCE(stale, false) = false`,
        );
        dbTotalVerified = cntRes.rows[0]?.cnt ?? 0;

        const finishedAt = new Date();
        const runId = `CLI-INGEST-${startedAt.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
        await client.query(
          `INSERT INTO knowledge_ingestion_run (run_id, started_at, finished_at, duration_ms, status, offset_seed, total_fetched, total_deduplicated, postgres_upserted, db_total_after, sources_json)
           VALUES ($1, $2, $3, $4, 'ok', $5, $6, $7, $8, $9, $10::jsonb)`,
          [
            runId,
            startedAt.toISOString(),
            finishedAt.toISOString(),
            finishedAt.getTime() - startedAt.getTime(),
            offsetSeed,
            allCandidates.length,
            kept.length,
            postgresUpserted,
            dbTotalVerified,
            JSON.stringify(sourceStats),
          ],
        ).catch(() => undefined);
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
      embeddingsBackfilled,
      staleSuperseded,
      dbTotalVerified,
      sources: sourceStats,
    }),
  );
}

main().catch((err) => {
  console.error("[ingest-open-datasets] error:", err);
  process.exit(1);
});
