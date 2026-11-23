/**
 * Production Neon PostgreSQL & pgvector Sync Script
 *
 * Applies migration 0019 idempotently, seeds all 7 NDKRS domains (including the
 * 24 new science/general/legal/engineering records plus 32 DoD/IC directives,
 * 26 DISA STIG rules, 5 Policy-as-Code packs, and 9 Government-Readiness controls)
 * with external text-embedding-3-small vectors when OPENAI_API_KEY is available,
 * and synchronizes all 0015 normalized relational schemas + AES-256-GCM enclave anchors.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { getSql, dbSource } from "../src/lib/db.ts";
import { computeEmbedding } from "../src/lib/ndkrs/embeddings.server.ts";
import {
  seedExtendedDefenseAndEnterpriseCorpus,
  seedNdkrsAuthoritativeCorpus,
} from "../src/lib/ndkrs/corpus-seed.ts";
import { getNdkrsStatusSummary } from "../src/lib/ndkrs/persistence.server.ts";
import { getSchemaTableCounts } from "../src/lib/enterprise/persistence.server.ts";
import { syncAllRelationalEnterpriseSchemas } from "../src/lib/enterprise/relational-sync.server.ts";
import { OPENAI_KEY } from "../src/lib/openai-key.server.ts";
import { syncNupsCatalogToSql, listNupsRuns } from "../src/lib/nups/persistence.server.ts";
import { solveUniversalProblem } from "../src/lib/nups/orchestrator.server.ts";

async function main() {
  const startedAt = Date.now();
  const hasDbUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim() || OPENAI_KEY?.trim());
  console.log(
    JSON.stringify({
      step: "init",
      dbSource,
      hasDbUrl,
      hasOpenAiKey,
      startedAt: new Date(startedAt).toISOString(),
    }),
  );

  // 1. Apply 0019_telemetry_persistence.sql & 0020_nups_orchestration.sql idempotently
  const sql = await getSql();
  for (const migFile of ["0019_telemetry_persistence.sql", "0020_nups_orchestration.sql"]) {
    const migPath = path.join(process.cwd(), "migrations", migFile);
    const migSql = readFileSync(migPath, "utf8");
    for (const rawStmt of migSql.split(/;\s*(?:\r?\n|$)/)) {
      const stmt = rawStmt
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();
      if (stmt) {
        await sql.query(stmt);
      }
    }
    await sql.query(`INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [migFile]);
  }
  console.log(JSON.stringify({ step: "migrations_0019_0020", applied: true }));

  // 2. Sync relational 0015 + enterprise + enclave + baseline telemetry schemas first (fast SQL operations)
  const relational = await syncAllRelationalEnterpriseSchemas({
    triggeredBy: "scripts/sync-neon-databases.ts",
  });
  console.log(JSON.stringify({ step: "relational_sync", ...relational }));

  // 3. Seed core 7-domain NDKRS authoritative corpus (skipping unchanged pre-verified records with chunks)
  const coreSeed = await seedNdkrsAuthoritativeCorpus({
    allowExternalEmbeddings: hasOpenAiKey,
    skipExistingVerified: true,
    preVerifiedBy: "noctis-neon-closure-board",
  });
  console.log(JSON.stringify({ step: "ndkrs_core_seed", ...coreSeed }));

  // 4. Seed extended Defense / IC / STIG / Policy-as-Code / Gov-Readiness records into NDKRS
  const extSeed = await seedExtendedDefenseAndEnterpriseCorpus({
    allowExternalEmbeddings: hasOpenAiKey,
    skipExistingVerified: true,
    preVerifiedBy: "noctis-neon-closure-board",
  });
  console.log(JSON.stringify({ step: "ndkrs_extended_seed", ...extSeed }));

  // 4b. Upgrade any non-OpenAI chunks to text-embedding-3-small (384-dim) so pgvector HNSW stays unified
  if (hasOpenAiKey) {
    const nonOpenAiRows = await sql.query<{ id: string; content: string }>(
      "SELECT id, content FROM ndkrs.knowledge_chunks WHERE embedding_model <> 'text-embedding-3-small' ORDER BY id",
    );
    let upgradedCount = 0;
    for (let i = 0; i < nonOpenAiRows.length; i += 10) {
      const batch = nonOpenAiRows.slice(i, i + 10);
      await Promise.all(
        batch.map(async (row) => {
          const emb = await computeEmbedding(row.content, { allowExternal: true });
          if (emb.model === "text-embedding-3-small") {
            await sql.query(
              `UPDATE ndkrs.knowledge_chunks
               SET embedding_json = $1::jsonb, embedding_model = $2, embedding_vec = NULL
               WHERE id = $3`,
              [JSON.stringify(emb.vector), emb.model, row.id],
            );
            upgradedCount += 1;
          }
        }),
      );
    }
    const remRows = await sql.query<{ c: number }>(
      "SELECT count(*)::int AS c FROM ndkrs.knowledge_chunks WHERE embedding_model <> 'text-embedding-3-small'",
    );
    console.log(
      JSON.stringify({
        step: "reembed_openai",
        attempted: nonOpenAiRows.length,
        upgradedCount,
        remainingNonOpenAi: Number(remRows[0]?.c ?? 0),
      }),
    );
  }

  const nupsCatalogCount = await syncNupsCatalogToSql();
  const existingRuns = await listNupsRuns(1);
  let baselineRunId: string | null = null;
  if (existingRuns.length === 0) {
    const baseline = await solveUniversalProblem({
      query:
        "A hospital experiences a power outage affecting backup electrical generators (transfer time 8.5s, 2400 gal tank at 50 gph, 300 kWh UPS at 400 kW critical load), 24 ICU ventilator operations, cybersecurity, emergency management, and HIPAA/CMS regulatory compliance",
      actorId: "scripts/sync-neon-databases.ts",
      tenantId: "tenant:public-sandbox",
      persist: true,
    });
    baselineRunId = baseline.runId;
  }
  console.log(JSON.stringify({ step: "nups_sync", catalogedEngines: nupsCatalogCount, baselineRunId }));

  // 5. Summarize live state across all schemas and NDKRS domains
  const [schemaCounts, ndkrsSummary, domainRows] = await Promise.all([
    getSchemaTableCounts(),
    getNdkrsStatusSummary(),
    sql.query<{ domain: string; c: number }>(
      "SELECT domain, count(*)::int AS c FROM ndkrs.knowledge_records WHERE verification_status = 'VERIFIED' GROUP BY domain ORDER BY domain",
    ),
  ]);

  const elapsedMs = Date.now() - startedAt;
  console.log(
    JSON.stringify(
      {
        ok: true,
        elapsedMs,
        dbSource: schemaCounts.dbSource,
        nonEmptyTablesCount: schemaCounts.nonEmptyTablesCount,
        totalTablesTracked: schemaCounts.totalTablesTracked,
        ndkrsDomains: Object.fromEntries(domainRows.map((r) => [r.domain, Number(r.c)])),
        ndkrsSummary,
        schemaTotals: Object.fromEntries(
          Object.entries(schemaCounts.schemas).map(([s, info]) => [
            s,
            { populated: `${info.nonEmptyTables}/${info.tables.length}`, totalRows: info.totalRows },
          ]),
        ),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("SYNC_NEON_FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
