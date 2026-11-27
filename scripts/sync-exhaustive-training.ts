/**
 * Syncs all exhaustive Noctis training seed pairs into Managed Neon Postgres (`public.vibe_training_pair`)
 * and exports unified deduplicated SFT (ChatML) + DPO JSONL datasets into `data/` for GPU fine-tuning.
 *
 * Run via: npm run sync:training
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import {
  buildAutonomous20AreaSeedPairs,
  exportAutonomousDpoJsonl,
} from "../src/lib/noctis-autonomous-trainer.ts";
import { buildRemainingNoctisSeedPairs } from "../src/lib/noctis-exhaustive-training.ts";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DATA_DIR = path.join(ROOT, "data");

function deterministicId(prefix: string, text: string): string {
  return `${prefix}-${createHash("sha256").update(text.trim().toLowerCase()).digest("hex").slice(0, 20)}`;
}

function readJsonlLines(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const autoPairs = buildAutonomous20AreaSeedPairs();
  const remainingPairs = buildRemainingNoctisSeedPairs();
  const seenQuestions = new Set<string>();
  const allSeedPairs = [...autoPairs, ...remainingPairs].filter((p) => {
    const k = p.question.trim().toLowerCase();
    if (!k || seenQuestions.has(k)) return false;
    seenQuestions.add(k);
    return true;
  });

  // 1. Export Unified ChatML SFT JSONL (existing ChatML + CoT + RMF SFT + exhaustive seeds)
  const existingSftSources = [
    path.join(DATA_DIR, "noctis-chatml-training.jsonl"),
    path.join(DATA_DIR, "rmf-sft-chatml.jsonl"),
  ];
  const sftSeen = new Set<string>();
  const unifiedSft: string[] = [];

  for (const src of existingSftSources) {
    for (const line of readJsonlLines(src)) {
      const h = createHash("sha256").update(line).digest("hex");
      if (!sftSeen.has(h)) {
        sftSeen.add(h);
        unifiedSft.push(line);
      }
    }
  }

  for (const pair of allSeedPairs) {
    const rec = JSON.stringify({
      messages: [
        {
          role: "system",
          content: `You are Noctis Sovereign Intelligence operating in the ${pair.domain || "general"} domain under verified non-fabrication and SQDEC safety invariants.`,
        },
        { role: "user", content: pair.question },
        { role: "assistant", content: pair.answer },
      ],
      domain: pair.domain || "general",
      model: pair.model,
    });
    const h = createHash("sha256").update(rec).digest("hex");
    if (!sftSeen.has(h)) {
      sftSeen.add(h);
      unifiedSft.push(rec);
    }
  }

  const sftOutPath = path.join(DATA_DIR, "noctis-unified-sft-export.jsonl");
  writeFileSync(sftOutPath, `${unifiedSft.join("\n")}\n`, "utf8");

  // 2. Export Unified DPO JSONL (clinical DPO + RMF DPO + 20-area autonomous DPO)
  const existingDpoSources = [
    path.join(DATA_DIR, "noctis-dpo-clinical-safety.jsonl"),
    path.join(DATA_DIR, "rmf-dpo-pairs.jsonl"),
  ];
  const dpoSeen = new Set<string>();
  const unifiedDpo: string[] = [];

  for (const src of existingDpoSources) {
    for (const line of readJsonlLines(src)) {
      const h = createHash("sha256").update(line).digest("hex");
      if (!dpoSeen.has(h)) {
        dpoSeen.add(h);
        unifiedDpo.push(line);
      }
    }
  }
  for (const line of exportAutonomousDpoJsonl().split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const h = createHash("sha256").update(line).digest("hex");
    if (!dpoSeen.has(h)) {
      dpoSeen.add(h);
      unifiedDpo.push(line);
    }
  }

  const dpoOutPath = path.join(DATA_DIR, "noctis-unified-dpo-export.jsonl");
  writeFileSync(dpoOutPath, `${unifiedDpo.join("\n")}\n`, "utf8");

  console.log(
    JSON.stringify({
      seedPairsPrepared: allSeedPairs.length,
      unifiedSftRows: unifiedSft.length,
      unifiedDpoRows: unifiedDpo.length,
      sftOutPath: path.relative(ROOT, sftOutPath),
      dpoOutPath: path.relative(ROOT, dpoOutPath),
    }),
  );

  // 3. Upsert into Managed Neon Postgres `public.vibe_training_pair` if DATABASE_URL is configured
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log("[sync-exhaustive-training] DATABASE_URL not set; skipped Postgres upsert.");
    return;
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    try {
      let upserted = 0;
      for (const p of allSeedPairs) {
        const id = deterministicId("exh", p.question);
        await client.query(
          `INSERT INTO public.vibe_training_pair (id, question, answer, domain, model, hits, verified, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, now(), now())
           ON CONFLICT (id) DO UPDATE SET
             answer = EXCLUDED.answer,
             domain = EXCLUDED.domain,
             model = EXCLUDED.model,
             hits = GREATEST(public.vibe_training_pair.hits, EXCLUDED.hits),
             verified = true,
             updated_at = now()`,
          [id, p.question, p.answer, p.domain || "general", p.model || "noctis-exhaustive-2026", p.hits ?? 30],
        );
        upserted += 1;
      }
      const { rows } = await client.query<{ total: string }>(`SELECT count(*)::text AS total FROM public.vibe_training_pair`);
      console.log(
        JSON.stringify({
          postgresUpserted: upserted,
          totalVibeTrainingPairsInDb: Number(rows[0]?.total || 0),
        }),
      );
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[sync-exhaustive-training] ERROR:", err);
  process.exit(1);
});
