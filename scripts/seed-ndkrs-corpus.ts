#!/usr/bin/env npx tsx
/**
 * Seeds the expanded 42-record NDKRS Authoritative Multi-Domain Corpus & 12 Deterministic Rules
 * into Managed Neon PostgreSQL (or PGLite fallback). Pass `--openai-embeddings` or set
 * `NDKRS_EMBEDDING_PROVIDER=openai` to compute OpenAI `text-embedding-3-small` 384-dim vectors.
 */
import { seedNdkrsAuthoritativeCorpus } from "../src/lib/ndkrs/corpus-seed.ts";
import { getNdkrsStatusSummary } from "../src/lib/ndkrs/persistence.server.ts";

async function main() {
  const useOpenAi =
    process.argv.includes("--openai-embeddings") ||
    process.env.NDKRS_EMBEDDING_PROVIDER?.toLowerCase() === "openai";
  const res = await seedNdkrsAuthoritativeCorpus({
    preVerifiedBy: "noctis-authoritative-seed-cli",
    allowExternalEmbeddings: useOpenAi,
  });
  const status = await getNdkrsStatusSummary();
  console.log(JSON.stringify({ ok: true, useOpenAi, seeded: res, status }, null, 2));
}

main().catch((err) => {
  console.error("[seed-ndkrs-corpus] Failed:", err?.message || err);
  process.exit(1);
});
