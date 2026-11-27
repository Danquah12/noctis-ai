#!/usr/bin/env npx tsx
/**
 * Seeds Live Neon Postgres RMF & Training Tables with Complete NIST SP Coverage:
 *   1. `rmf_source_documents` & `rmf_source_versions` (19 NIST SP/FIPS + compiled OSCAL manifest sources)
 *   2. `rmf_tasks` (all 47 official NIST SP 800-37 Rev. 2 tasks P-1..M-7)
 *   3. `vibe_training_pair` (pgvector 256-dim indexed NIST SP Q&A corpus from `buildNistSpTrainingPairs()`)
 *   4. `knowledge_source_cursor` (registers `nist-csrc-rmf` source #12)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import { computeSemanticEmbedding256, formatVectorLiteral } from "../src/lib/noctis-knowledge-router.ts";
import {
  buildNistSpTrainingPairs,
  NIST_SP_800_37_TASKS,
  NIST_SP_PUBLICATIONS,
} from "../src/lib/noctis-nist-sp-catalog.ts";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const envPath = path.resolve(".env.local");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    const match = raw.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1]!.trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("DATABASE_URL not found in environment or .env.local");
}

async function main() {
  const dbUrl = resolveDatabaseUrl();
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // 1. Seed `rmf_source_documents` & `rmf_source_versions` for all 19 NIST SP / FIPS publications
    for (const pub of NIST_SP_PUBLICATIONS) {
      await client.query(
        `
        insert into public.rmf_source_documents (source_id, title, issuer, category, official_url)
        values ($1, $2, $3, $4, $5)
        on conflict (source_id) do update set
          title = excluded.title,
          issuer = excluded.issuer,
          category = excluded.category,
          official_url = excluded.official_url
        `,
        [pub.sourceId, `${pub.docNumber}: ${pub.title}`, pub.issuer, pub.category, pub.officialUrl],
      );

      const contentSha = crypto
        .createHash("sha256")
        .update(JSON.stringify({ sourceId: pub.sourceId, version: pub.version, sections: pub.sections }))
        .digest("hex");

      const versionId = `${pub.sourceId}-v1`;
      await client.query(
        `
        insert into public.rmf_source_versions (version_id, source_id, version_label, release_date, sha256, metadata)
        values ($1, $2, $3, $4::date, $5, $6::jsonb)
        on conflict (version_id) do update set
          version_label = excluded.version_label,
          release_date = excluded.release_date,
          sha256 = excluded.sha256,
          metadata = excluded.metadata
        `,
        [
          versionId,
          pub.sourceId,
          pub.version,
          pub.releaseDate,
          contentSha,
          JSON.stringify({ rmfSteps: pub.rmfSteps, crossReferences: pub.crossReferences, deliverables: pub.deliverables }),
        ],
      );
    }

    // 2. Also register compiled OSCAL catalog manifests from src/data/rmf-deterministic-db.json
    const rmfDbPath = path.resolve("src/data/rmf-deterministic-db.json");
    if (fs.existsSync(rmfDbPath)) {
      const rmfDb = JSON.parse(fs.readFileSync(rmfDbPath, "utf8")) as {
        manifest?: {
          fedrampPublished?: string;
          sources?: Array<{ id: string; title: string; url: string; sha256: string; bytes: number }>;
        };
      };
      for (const src of rmfDb.manifest?.sources || []) {
        const issuer = src.id.startsWith("mitre") ? "MITRE CTID" : src.id.startsWith("fedramp") ? "FedRAMP PMO" : "NIST";
        await client.query(
          `
          insert into public.rmf_source_documents (source_id, title, issuer, category, official_url)
          values ($1, $2, $3, 'oscal_catalog', $4)
          on conflict (source_id) do update set
            title = excluded.title,
            issuer = excluded.issuer,
            official_url = excluded.official_url
          `,
          [src.id, src.title, issuer, src.url],
        );
        await client.query(
          `
          insert into public.rmf_source_versions (version_id, source_id, version_label, sha256, metadata)
          values ($1, $2, $3, $4, $5::jsonb)
          on conflict (version_id) do update set
            sha256 = excluded.sha256,
            metadata = excluded.metadata
          `,
          [`${src.id}-oscal`, src.id, "OSCAL-Compiled", src.sha256, JSON.stringify({ bytes: src.bytes })],
        );
      }
    }

    // 3. Seed all 47 official NIST SP 800-37 Rev. 2 tasks into `rmf_tasks`
    for (const task of NIST_SP_800_37_TASKS) {
      await client.query(
        `
        insert into public.rmf_tasks (task_id, step_number, title, primary_roles, expected_outputs, description)
        values ($1, $2, $3, $4::text[], $5::text[], $6)
        on conflict (task_id) do update set
          step_number = excluded.step_number,
          title = excluded.title,
          primary_roles = excluded.primary_roles,
          expected_outputs = excluded.expected_outputs,
          description = excluded.description
        `,
        [
          task.taskId,
          task.stepNumber,
          `${task.title} (${task.level})`,
          task.primaryRoles,
          task.expectedOutputs,
          `${task.description} Governing: ${task.governingPubs.join(", ")}.`,
        ],
      );
    }

    // 4. Upsert NIST SP 800-Series training pairs into `vibe_training_pair` with pgvector 256-dim embeddings
    const pairs = buildNistSpTrainingPairs();
    let pairsUpserted = 0;
    for (const rec of pairs) {
      const dbId = `open-${crypto.createHash("sha256").update(rec.question.toLowerCase()).digest("hex").slice(0, 20)}`;
      const vecLit = formatVectorLiteral(computeSemanticEmbedding256(`${rec.question} ${rec.answer.slice(0, 1200)}`));
      await client.query(
        `
        insert into public.vibe_training_pair (id, question, answer, domain, model, hits, verified, stale, embedding, updated_at)
        values ($1, $2, $3, $4, 'open:nist-csrc-rmf', 12, true, false, $5::vector, now())
        on conflict (id) do update set
          answer = excluded.answer,
          domain = excluded.domain,
          model = excluded.model,
          verified = true,
          stale = false,
          embedding = excluded.embedding,
          updated_at = now()
        `,
        [dbId, rec.question.slice(0, 600), rec.answer.slice(0, 6000), rec.domain, vecLit],
      );
      pairsUpserted += 1;
    }

    // 5. Register cursor for source #12 (`nist-csrc-rmf`)
    await client.query(
      `
      insert into public.knowledge_source_cursor (source_id, next_offset, total_ingested, last_run_at, last_error, updated_at)
      values ('nist-csrc-rmf', $1, $2, now(), null, now())
      on conflict (source_id) do update set
        next_offset = excluded.next_offset,
        total_ingested = greatest(knowledge_source_cursor.total_ingested, excluded.total_ingested),
        last_run_at = now(),
        last_error = null,
        updated_at = now()
      `,
      [pairsUpserted, pairsUpserted],
    );

    const summary = await client.query(`
      select
        (select count(*)::int from public.rmf_source_documents) as rmf_source_documents,
        (select count(*)::int from public.rmf_source_versions) as rmf_source_versions,
        (select count(*)::int from public.rmf_steps) as rmf_steps,
        (select count(*)::int from public.rmf_tasks) as rmf_tasks,
        (select count(*)::int from public.rmf_controls) as rmf_controls,
        (select count(*)::int from public.vibe_training_pair where verified = true and coalesce(stale, false) = false) as active_training_pairs,
        (select count(*)::int from public.vibe_training_pair where model = 'open:nist-csrc-rmf') as nist_csrc_rmf_pairs,
        (select count(*)::int from public.knowledge_source_cursor) as registered_cursors
    `);
    console.log("NIST SP RMF Seed Complete:", summary.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Failed to seed NIST SP RMF database:", err);
  process.exit(1);
});
