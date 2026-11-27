/**
 * Syncs ALL exhaustive Noctis training seed pairs and curated Q&A datasets into Managed Neon Postgres (`public.vibe_training_pair`)
 * and exports unified, validation-isolated, deduplicated SFT (ChatML) + DPO JSONL datasets into `data/` for GPU fine-tuning.
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
import { INITIAL_DPO_PAIRS, exportDpoDatasetJsonl } from "../src/lib/noctis-cognitive-sandbox.ts";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DATA_DIR = path.join(ROOT, "data");

interface VibePairInput {
  question: string;
  answer: string;
  domain?: string;
  model?: string;
  hits?: number;
  at?: string;
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

function extractNormalizedUserPrompt(jsonLine: string): string | null {
  try {
    const parsed = JSON.parse(jsonLine) as {
      messages?: Array<{ role?: string; content?: string }>;
      prompt?: string;
      question?: string;
    };
    const msgPrompt = parsed.messages?.find((m) => m.role === "user")?.content;
    const raw = msgPrompt || parsed.prompt || parsed.question;
    return typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

async function main() {
  loadEnvLocalIfMissing();
  mkdirSync(DATA_DIR, { recursive: true });

  // Collect all programmatic seed pairs (27 autonomous + 100 exhaustive = 127)
  // plus the 216 pairs from data/vibe-training.json
  const autoPairs = buildAutonomous20AreaSeedPairs();
  const remainingPairs = buildRemainingNoctisSeedPairs();

  const vibeJsonPath = path.join(DATA_DIR, "vibe-training.json");
  let vibeFilePairs: VibePairInput[] = [];
  if (existsSync(vibeJsonPath)) {
    try {
      const parsed = JSON.parse(readFileSync(vibeJsonPath, "utf8"));
      if (Array.isArray(parsed)) {
        vibeFilePairs = parsed.filter(
          (item): item is VibePairInput =>
            Boolean(item && typeof item.question === "string" && typeof item.answer === "string"),
        );
      }
    } catch {
      vibeFilePairs = [];
    }
  }

  const seenQuestions = new Set<string>();
  const allSeedPairs: VibePairInput[] = [];
  for (const p of [...autoPairs, ...remainingPairs, ...vibeFilePairs]) {
    const k = p.question.trim().toLowerCase();
    if (!k || seenQuestions.has(k)) continue;
    seenQuestions.add(k);
    allSeedPairs.push({
      question: p.question,
      answer: p.answer,
      domain: p.domain || "general",
      model: p.model || "noctis-ultra-2026",
      hits: typeof p.hits === "number" ? p.hits : 20,
      at: p.at || "2026-11-26T22:00:00.000Z",
    });
  }

  // Build strict held-out validation exclusion set (no leakage into SFT)
  const valLines = readJsonlLines(path.join(DATA_DIR, "noctis-cot-validation-250.jsonl"));
  const heldOutHashes = new Set<string>();
  const heldOutPrompts = new Set<string>();
  for (const vl of valLines) {
    heldOutHashes.add(createHash("sha256").update(vl).digest("hex"));
    const np = extractNormalizedUserPrompt(vl);
    if (np) heldOutPrompts.add(np);
  }

  // 1. Export Unified ChatML SFT JSONL across ALL training corpora
  const existingSftSources = [
    path.join(DATA_DIR, "noctis-chatml-training.jsonl"),
    path.join(DATA_DIR, "rmf-sft-chatml.jsonl"),
    path.join(DATA_DIR, "noctis-cot-training-3500.jsonl"),
    path.join(DATA_DIR, "noctis-cot-training-25k.jsonl"),
  ];
  const sftSeen = new Set<string>();
  const unifiedSft: string[] = [];
  let heldOutSkipped = 0;

  for (const src of existingSftSources) {
    for (const line of readJsonlLines(src)) {
      const h = createHash("sha256").update(line).digest("hex");
      const np = extractNormalizedUserPrompt(line);
      if (heldOutHashes.has(h) || (np && heldOutPrompts.has(np))) {
        heldOutSkipped++;
        continue;
      }
      if (!sftSeen.has(h)) {
        sftSeen.add(h);
        unifiedSft.push(line);
      }
    }
  }

  for (const pair of allSeedPairs) {
    const np = pair.question.trim().toLowerCase();
    if (heldOutPrompts.has(np)) {
      heldOutSkipped++;
      continue;
    }
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
      model: pair.model || "noctis-ultra-2026",
    });
    const h = createHash("sha256").update(rec).digest("hex");
    if (!sftSeen.has(h)) {
      sftSeen.add(h);
      unifiedSft.push(rec);
    }
  }

  const sftOutPath = path.join(DATA_DIR, "noctis-unified-sft-export.jsonl");
  writeFileSync(sftOutPath, `${unifiedSft.join("\n")}\n`, "utf8");

  // 2. Export Unified DPO JSONL across ALL preference corpora
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
  for (const line of [
    ...exportAutonomousDpoJsonl().split(/\r?\n/),
    ...exportDpoDatasetJsonl(INITIAL_DPO_PAIRS).split(/\r?\n/),
  ]
    .map((l) => l.trim())
    .filter(Boolean)) {
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
      vibeTrainingJsonPairs: vibeFilePairs.length,
      heldOutValidationRows: valLines.length,
      heldOutSkipped,
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
      const stripNull = (s: string) => s.replace(/\u0000/g, "");
      for (const p of allSeedPairs) {
        const cleanQ = stripNull(p.question);
        const cleanA = stripNull(p.answer);
        const id = deterministicId("exh", cleanQ);
        await client.query(
          `INSERT INTO public.vibe_training_pair (id, question, answer, domain, model, hits, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
           ON CONFLICT (id) DO UPDATE SET
             question = EXCLUDED.question,
             answer = EXCLUDED.answer,
             domain = EXCLUDED.domain,
             model = EXCLUDED.model,
             hits = GREATEST(public.vibe_training_pair.hits, EXCLUDED.hits),
             updated_at = NOW()`,
          [id, cleanQ, cleanA, p.domain, p.model, p.hits, p.at],
        );
        upserted++;
      }
      const countRes = await client.query<{ cnt: string }>(`SELECT COUNT(*)::text AS cnt FROM public.vibe_training_pair`);
      console.log(
        JSON.stringify({
          postgresUpserted: upserted,
          totalVibeTrainingPairsInDb: Number(countRes.rows[0]?.cnt || 0),
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
  console.error("[sync-exhaustive-training] error:", err);
  process.exit(1);
});
