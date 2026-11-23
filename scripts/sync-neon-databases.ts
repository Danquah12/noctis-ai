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
import {
  seedExtendedDefenseAndEnterpriseCorpus,
  seedNdkrsAuthoritativeCorpus,
} from "../src/lib/ndkrs/corpus-seed.ts";
import { getNdkrsStatusSummary } from "../src/lib/ndkrs/persistence.server.ts";
import { getSchemaTableCounts } from "../src/lib/enterprise/persistence.server.ts";
import { syncAllRelationalEnterpriseSchemas } from "../src/lib/enterprise/relational-sync.server.ts";

async function main() {
  const startedAt = Date.now();
  const hasDbUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  console.log(
    JSON.stringify({
      step: "init",
      dbSource,
      hasDbUrl,
      hasOpenAiKey,
      startedAt: new Date(startedAt).toISOString(),
    }),
  );

  // 1. Apply 0019_telemetry_persistence.sql idempotently when connected to Postgres
  const sql = await getSql();
  const migPath = path.join(process.cwd(), "migrations", "0019_telemetry_persistence.sql");
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
  await sql.query(
    `INSERT INTO _migrations (name) VALUES ('0019_telemetry_persistence.sql') ON CONFLICT (name) DO NOTHING`,
  );
  console.log(JSON.stringify({ step: "migration_0019", applied: true }));

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
