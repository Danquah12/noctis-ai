#!/usr/bin/env node
/**
 * Idempotently populates the previously-empty `public.rmf_controls` (base controls),
 * `public.rmf_control_enhancements` (control enhancements), and `public.vibe_training_pair`
 * tables in Managed Neon PostgreSQL from Noctis's compiled JSON corpora.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("[seed-existing-knowledge] DATABASE_URL is not set.");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cleanText = (v) => String(v || "").replace(/\u0000/g, "");

async function main() {
  const rmf = JSON.parse(readFileSync(join(root, "src", "data", "rmf-deterministic-db.json"), "utf8"));
  const training = JSON.parse(readFileSync(join(root, "data", "vibe-training.json"), "utf8"));

  const allControls = Object.values(rmf.controls || {});
  const baseControls = allControls.filter((c) => !c.parentId);
  const enhancements = allControls.filter((c) => Boolean(c.parentId));
  const pairs = Array.isArray(training) ? training : [];

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let baseInserted = 0;
    for (const c of baseControls) {
      await client.query(
        `INSERT INTO public.rmf_controls (
           control_id, family_id, family_title, title, statement, guidance,
           withdrawn, withdrawn_into, related_controls, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
         ON CONFLICT (control_id) DO UPDATE SET
           title = EXCLUDED.title,
           statement = EXCLUDED.statement,
           guidance = EXCLUDED.guidance,
           withdrawn = EXCLUDED.withdrawn,
           updated_at = now()`,
        [
          cleanText(c.id),
          cleanText(c.family),
          cleanText(c.familyTitle),
          cleanText(c.title),
          cleanText(c.statement),
          cleanText(c.guidance),
          Boolean(c.withdrawn),
          Array.isArray(c.withdrawnInto) ? c.withdrawnInto.map(cleanText) : [],
          Array.isArray(c.related) ? c.related.map(cleanText) : [],
        ],
      );
      baseInserted += 1;
    }

    let enhInserted = 0;
    for (const e of enhancements) {
      await client.query(
        `INSERT INTO public.rmf_control_enhancements (
           enhancement_id, parent_control_id, title, statement, guidance, withdrawn, withdrawn_into
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (enhancement_id) DO UPDATE SET
           title = EXCLUDED.title,
           statement = EXCLUDED.statement,
           guidance = EXCLUDED.guidance,
           withdrawn = EXCLUDED.withdrawn`,
        [
          cleanText(e.id),
          cleanText(e.parentId),
          cleanText(e.title),
          cleanText(e.statement),
          cleanText(e.guidance),
          Boolean(e.withdrawn),
          Array.isArray(e.withdrawnInto) ? e.withdrawnInto.map(cleanText) : [],
        ],
      );
      enhInserted += 1;
    }

    let pairsInserted = 0;
    for (const p of pairs) {
      const q = cleanText(p.question).trim();
      const a = cleanText(p.answer).trim();
      if (!q || !a) continue;
      const id =
        p.id && cleanText(p.id).trim()
          ? cleanText(p.id).trim()
          : `vt-${createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 16)}`;
      await client.query(
        `INSERT INTO public.vibe_training_pair (
           id, question, answer, domain, model, hits, verified, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,true,now())
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          q.slice(0, 600),
          a.slice(0, 6000),
          cleanText(p.domain || "general"),
          cleanText(p.model || "vibe-seed"),
          Number(p.hits || 1),
        ],
      );
      pairsInserted += 1;
    }

    await client.query("COMMIT");
    console.log(
      JSON.stringify({
        ok: true,
        baseControlsSeeded: baseInserted,
        controlEnhancementsSeeded: enhInserted,
        vibeTrainingPairsSeeded: pairsInserted,
      }),
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed-existing-knowledge] Failed:", err?.message || err);
  process.exit(1);
});
