#!/usr/bin/env node
/**
 * Safely enables `pgvector` on Managed Neon PostgreSQL, adds the `embedding_vec vector(384)`
 * column and HNSW cosine similarity index on `ndkrs.knowledge_chunks`, and backfills
 * existing `embedding_json` rows without altering PGLite compatibility.
 */
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("[enable-pgvector] DATABASE_URL is not set.");
  process.exit(1);
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    const extRes = await client.query(
      "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';",
    );
    const pgvectorVersion = extRes.rows[0]?.extversion || "unknown";

    await client.query(
      "ALTER TABLE ndkrs.knowledge_chunks ADD COLUMN IF NOT EXISTS embedding_vec vector(384);",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_ndkrs_chunks_embedding_hnsw ON ndkrs.knowledge_chunks USING hnsw (embedding_vec vector_cosine_ops);",
    );

    const pending = await client.query(
      "SELECT id, embedding_json FROM ndkrs.knowledge_chunks WHERE embedding_vec IS NULL AND embedding_json IS NOT NULL;",
    );
    let backfilledRows = 0;
    for (const row of pending.rows) {
      const vec = Array.isArray(row.embedding_json) ? row.embedding_json : [];
      if (vec.length !== 384) continue;
      const literal = `[${vec.map((n) => Number(n) || 0).join(",")}]`;
      await client.query(
        "UPDATE ndkrs.knowledge_chunks SET embedding_vec = $1::vector WHERE id = $2;",
        [literal, row.id],
      );
      backfilledRows += 1;
    }

    console.log(
      JSON.stringify({
        ok: true,
        pgvectorEnabled: true,
        pgvectorVersion,
        hnswIndex: "idx_ndkrs_chunks_embedding_hnsw",
        backfilledRows,
      }),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[enable-pgvector] Failed:", err?.message || err);
  process.exit(1);
});
