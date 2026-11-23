/**
 * NDKRS Hybrid Retrieval Engine (BM25 Full-Text + Vector Cosine + RRF Ranking)
 *
 * Strictly filters out unverified (`PENDING_REVIEW`), rejected (`REJECTED`),
 * and expired (`expires_at <= now()`) knowledge unless an operator explicitly passes
 * `includePending: true` for audit inspection.
 */

import { computeEmbedding, cosineSimilarity } from "./embeddings.server.ts";
import {
  ensureNdkrsSchema,
  getDominantChunkEmbeddingModel,
  isPgvectorActive,
} from "./persistence.server.ts";
import {
  filterRecordsByClassificationBoundary,
  type SecurityClassification,
} from "../dod-ic/classification-gateway.ts";
import type { HybridSearchHit, NdkrsDomain } from "./types.ts";

interface ChunkJoinedRow {
  chunk_id: string;
  record_id: string | null;
  source_id: string;
  domain: string;
  canonical_key: string;
  title: string;
  heading: string | null;
  content: string;
  citation_label: string;
  source_uri: string;
  version: string;
  record_sha256: string;
  structured_json?: Record<string, unknown> | string | null;
  embedding_model: string;
  embedding_json: number[];
  ts_rank: number;
  pg_vec_sim?: number;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "what", "when", "where",
  "how", "are", "was", "were", "have", "has", "had", "into", "about", "should",
  "which", "their", "they", "patient", "measured", "earlier", "using", "under",
]);

function extractQueryTerms(query: string): string[] {
  return [...new Set(
    (query || "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t)),
  )];
}

export async function hybridSearchNdkrs(
  query: string,
  opts: {
    domain?: NdkrsDomain;
    limit?: number;
    includePending?: boolean;
    allowExternalEmbeddings?: boolean;
    maxClassification?: SecurityClassification;
    authorizedCompartments?: string[];
  } = {},
): Promise<HybridSearchHit[]> {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) return [];

  const sql = await ensureNdkrsSchema();
  const usePgvector = await isPgvectorActive();
  const limit = Math.max(1, Math.min(25, opts.limit ?? 5));
  const dominantModel = await getDominantChunkEmbeddingModel();
  const useExternal =
    opts.allowExternalEmbeddings !== undefined
      ? opts.allowExternalEmbeddings
      : dominantModel === "text-embedding-3-small";
  const qEmb = await computeEmbedding(cleanQuery, {
    allowExternal: useExternal,
  });
  const qTerms = extractQueryTerms(cleanQuery);

  const statusFilter = opts.includePending
    ? "r.verification_status IN ('VERIFIED', 'PENDING_REVIEW')"
    : "r.verification_status = 'VERIFIED' AND s.status = 'VERIFIED'";
  const expiryFilter = "(r.expires_at IS NULL OR r.expires_at > now())";
  const domainFilter = opts.domain ? "AND c.domain = $2" : "";
  const baseParams: unknown[] = opts.domain ? [cleanQuery, opts.domain] : [cleanQuery];

  let rows: ChunkJoinedRow[] = [];
  if (usePgvector) {
    const vecLiteral = `[${qEmb.vector.map((n) => Number(n) || 0).join(",")}]`;
    const vecParamIdx = baseParams.length + 1;
    const modelParamIdx = baseParams.length + 2;
    rows = await sql.query<ChunkJoinedRow>(
      `SELECT
         c.id AS chunk_id,
         c.record_id,
         c.source_id,
         c.domain,
         r.canonical_key,
         r.title,
         c.heading,
         c.content,
         r.citation_label,
         r.version,
         r.record_sha256,
         r.structured_json,
         s.source_uri,
         c.embedding_model,
         c.embedding_json,
         ts_rank_cd(
           to_tsvector('english', r.canonical_key || ' ' || r.title || ' ' || coalesce(c.heading, '') || ' ' || c.content),
           plainto_tsquery('english', $1)
         )::float8 AS ts_rank,
         CASE
           WHEN c.embedding_vec IS NOT NULL AND c.embedding_model = $${modelParamIdx}
           THEN (1 - (c.embedding_vec <=> $${vecParamIdx}::vector))::float8
           ELSE 0
         END AS pg_vec_sim
       FROM ndkrs.knowledge_chunks c
       JOIN ndkrs.knowledge_records r ON r.id = c.record_id
       JOIN ndkrs.knowledge_sources s ON s.id = c.source_id
       WHERE ${statusFilter} AND ${expiryFilter} ${domainFilter}
       LIMIT 250`,
      [...baseParams, vecLiteral, qEmb.model],
    );
  } else {
    rows = await sql.query<ChunkJoinedRow>(
      `SELECT
         c.id AS chunk_id,
         c.record_id,
         c.source_id,
         c.domain,
         r.canonical_key,
         r.title,
         c.heading,
         c.content,
         r.citation_label,
         r.version,
         r.record_sha256,
         r.structured_json,
         s.source_uri,
         c.embedding_model,
         c.embedding_json,
         ts_rank_cd(
           to_tsvector('english', r.canonical_key || ' ' || r.title || ' ' || coalesce(c.heading, '') || ' ' || c.content),
           plainto_tsquery('english', $1)
         )::float8 AS ts_rank
       FROM ndkrs.knowledge_chunks c
       JOIN ndkrs.knowledge_records r ON r.id = c.record_id
       JOIN ndkrs.knowledge_sources s ON s.id = c.source_id
       WHERE ${statusFilter} AND ${expiryFilter} ${domainFilter}
       LIMIT 250`,
      baseParams,
    );
  }

  // Enforce classification-aware retrieval filtering so classified/SCI records never leak across boundaries
  const taggedRows = rows.map((row) => {
    let sj: Record<string, unknown> = {};
    try {
      sj =
        typeof row.structured_json === "string"
          ? (JSON.parse(row.structured_json) as Record<string, unknown>)
          : ((row.structured_json as Record<string, unknown>) || {});
    } catch {
      sj = {};
    }
    return {
      row,
      classification: (typeof sj.classification === "string"
        ? sj.classification.toUpperCase()
        : "UNCLASSIFIED") as SecurityClassification,
      compartments: Array.isArray(sj.compartments) ? sj.compartments.map(String) : [],
    };
  });
  const boundaryFiltered = filterRecordsByClassificationBoundary(
    taggedRows,
    opts.maxClassification ?? "UNCLASSIFIED",
    opts.authorizedCompartments ?? [],
  );
  rows = boundaryFiltered.allowedRecords.map((item) => item.row);

  if (rows.length === 0) return [];

  const lowerQuery = cleanQuery.toLowerCase();
  const scored = rows.map((row) => {
    const hay = `${row.canonical_key} ${row.title} ${row.heading || ""} ${row.content}`.toLowerCase();
    let matchedTerms = 0;
    for (const term of qTerms) {
      if (hay.includes(term)) matchedTerms += 1;
    }
    const exactKeyHit = row.canonical_key && lowerQuery.includes(row.canonical_key.toLowerCase()) ? 1.5 : 0;
    const termRatio = qTerms.length > 0 ? matchedTerms / qTerms.length : 0;
    const bm25Score = Number((Number(row.ts_rank || 0) + exactKeyHit + termRatio * 0.75).toFixed(4));

    const embVec = Array.isArray(row.embedding_json) ? row.embedding_json : [];
    const sameModel = row.embedding_model === qEmb.model;
    const vectorScore =
      sameModel && typeof row.pg_vec_sim === "number" && row.pg_vec_sim > 0
        ? Number(row.pg_vec_sim.toFixed(4))
        : sameModel
        ? Number(cosineSimilarity(qEmb.vector, embVec).toFixed(4))
        : 0;

    return { row, bm25Score, vectorScore, matchedTerms };
  });

  // Compute Reciprocal Rank Fusion (RRF, k = 60)
  const byBm25 = [...scored].sort((a, b) => b.bm25Score - a.bm25Score);
  const byVec = [...scored].sort((a, b) => b.vectorScore - a.vectorScore);
  const bm25Rank = new Map<string, number>();
  const vecRank = new Map<string, number>();
  byBm25.forEach((entry, idx) => bm25Rank.set(entry.row.chunk_id, idx + 1));
  byVec.forEach((entry, idx) => vecRank.set(entry.row.chunk_id, idx + 1));

  const K_RRF = 60;
  const fused: HybridSearchHit[] = scored
    .filter((entry) => entry.matchedTerms > 0 || entry.vectorScore >= 0.14 || entry.bm25Score > 0)
    .map((entry) => {
      const rB = bm25Rank.get(entry.row.chunk_id) ?? 999;
      const rV = vecRank.get(entry.row.chunk_id) ?? 999;
      // Only credit BM25 rank if there was actual lexical signal
      const bm25Contrib = entry.bm25Score > 0 ? 1 / (K_RRF + rB) : 0;
      const vecContrib = entry.vectorScore > 0.08 ? 1 / (K_RRF + rV) : 0;
      const rrfScore = Number((bm25Contrib + vecContrib).toFixed(6));

      return {
        chunkId: entry.row.chunk_id,
        recordId: entry.row.record_id,
        sourceId: entry.row.source_id,
        domain: entry.row.domain as NdkrsDomain,
        canonicalKey: entry.row.canonical_key,
        title: entry.row.title,
        heading: entry.row.heading,
        excerpt: entry.row.content.slice(0, 600),
        citationLabel: entry.row.citation_label,
        sourceUri: entry.row.source_uri,
        version: entry.row.version,
        sha256: entry.row.record_sha256,
        bm25Score: entry.bm25Score,
        vectorScore: entry.vectorScore,
        rrfScore,
        matchedTerms: entry.matchedTerms,
      };
    })
    .sort((a, b) => b.rrfScore - a.rrfScore || b.vectorScore - a.vectorScore)
    .slice(0, limit);

  return fused;
}
