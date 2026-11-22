#!/usr/bin/env npx tsx
/**
 * Seeds the NDKRS Authoritative Multi-Domain Corpus & Deterministic Rules Registry
 * into Managed Neon PostgreSQL (when DATABASE_URL is set) or PGLite.
 */
import { seedNdkrsAuthoritativeCorpus } from "../src/lib/ndkrs/corpus-seed.ts";
import { getNdkrsStatusSummary } from "../src/lib/ndkrs/persistence.server.ts";

async function main() {
  const res = await seedNdkrsAuthoritativeCorpus({
    preVerifiedBy: "noctis-authoritative-seed-cli",
  });
  const status = await getNdkrsStatusSummary();
  console.log(JSON.stringify({ ok: true, seeded: res, status }, null, 2));
}

main().catch((err) => {
  console.error("[seed-ndkrs-corpus] Failed:", err?.message || err);
  process.exit(1);
});
