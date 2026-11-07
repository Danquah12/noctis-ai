import { createHash, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";

export type NoctisEvidenceCitation = {
  sourceId: string;
  chunkId: string;
  title: string;
  publisher: string;
  canonicalUri: string | null;
  license: string;
  domain: string;
  jurisdiction: string | null;
  sourceVersion: string | null;
  sourceHash: string;
  chunkHash: string;
  locator: string;
  excerpt: string;
  rank: number;
  relevanceScore: number;
};

function normalizedTerms(query: string): string[] {
  return [...new Set(query.toLowerCase().match(/[a-z0-9][a-z0-9._-]{2,}/g) ?? [])].slice(0, 12);
}

/**
 * Lexical evidence retrieval. Only explicitly approved, public sources can
 * enter this initial retrieval tier. It does not infer source trust, execute
 * embedded instructions, or claim semantic/vector relevance.
 */
export async function retrieveApprovedNoctisEvidence(input: {
  query: string;
  domain?: string;
  userId: string;
  limit?: number;
}) {
  const query = input.query.trim().slice(0, 2000);
  const terms = normalizedTerms(query);
  if (query.length < 3 || !terms.length) {
    return { requestId: randomUUID(), method: "lexical" as const, citations: [] as NoctisEvidenceCitation[] };
  }
  const domain = (input.domain || "").trim().toLowerCase().slice(0, 80);
  const sql = await getSql();
  const requestId = randomUUID();
  const queryHash = createHash("sha256").update(query, "utf8").digest("hex");

  const conditions = terms.map((_, i) => `c.content_text ilike $${i + 1} or s.title ilike $${i + 1}`);
  const params: unknown[] = terms.map((term) => `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  let where = `s.status = 'approved' and s.classification = 'public' and (${conditions.join(" or ")})`;
  if (domain) {
    params.push(domain);
    where += ` and s.domain = $${params.length}`;
  }
  const candidates = await sql.query<{
    source_id: string; chunk_id: string; title: string; publisher: string;
    canonical_uri: string | null; license: string; domain: string;
    jurisdiction: string | null; source_version: string | null;
    source_hash: string; chunk_hash: string; locator: string; content_text: string;
  }>(
    `select s.id as source_id, c.id as chunk_id, s.title, s.publisher,
            s.canonical_uri, s.license, s.domain, s.jurisdiction,
            s.source_version, s.content_hash as source_hash,
            c.content_hash as chunk_hash, c.locator, c.content_text
     from noctis_learning_source s
     join noctis_source_chunk c on c.source_id = s.id
     where ${where}
     order by s.retrieved_at desc, c.ordinal asc
     limit 100`,
    params,
  );

  const scored = candidates.map((row) => {
    const haystack = `${row.title} ${row.content_text}`.toLowerCase();
    const matched = terms.filter((term) => haystack.includes(term)).length;
    const score = matched / terms.length;
    return { row, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(10, Math.trunc(input.limit ?? 5))));

  const citations: NoctisEvidenceCitation[] = [];
  for (let index = 0; index < scored.length; index += 1) {
    const { row, score } = scored[index];
    const rank = index + 1;
    const traceId = randomUUID();
    await sql`
      insert into noctis_retrieval_trace
        (id, request_id, user_id, domain, query_hash, source_id, chunk_id, rank, relevance_score, selected)
      values
        (${traceId}, ${requestId}, ${input.userId}, ${row.domain}, ${queryHash},
         ${row.source_id}, ${row.chunk_id}, ${rank}, ${score}, true)
    `;
    citations.push({
      sourceId: row.source_id,
      chunkId: row.chunk_id,
      title: row.title,
      publisher: row.publisher,
      canonicalUri: row.canonical_uri,
      license: row.license,
      domain: row.domain,
      jurisdiction: row.jurisdiction,
      sourceVersion: row.source_version,
      sourceHash: row.source_hash,
      chunkHash: row.chunk_hash,
      locator: row.locator,
      excerpt: row.content_text,
      rank,
      relevanceScore: score,
    });
  }

  return { requestId, method: "lexical" as const, citations };
}
