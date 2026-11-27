#!/usr/bin/env npx tsx
/**
 * Full Verbatim NIST SP / FIPS PDF Chunk Ingestor -> Neon Postgres `rmf_pdf_chunks` (FTS + pgvector)
 *
 * Downloads official US Gov Public Domain NIST Special Publication & FIPS PDFs (`nvlpubs.nist.gov`),
 * extracts page-by-page verbatim text with `pdfjs-dist`, segments into ~1,200-char chunks with
 * exact page spans & section headings, computes 256-dim semantic vectors, and batch-upserts into
 * PostgreSQL `public.rmf_pdf_chunks`.
 *
 * Usage:
 *   npx tsx scripts/ingest-nist-pdfs.ts [--docs=SP-800-37r2,SP-800-30r1] [--max-pages=200]
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { computeSemanticEmbedding256, formatVectorLiteral } from "../src/lib/noctis-knowledge-router.ts";
import { NIST_SP_PUBLICATIONS, type NistSpPublication } from "../src/lib/noctis-nist-sp-catalog.ts";

interface ExtractedChunk {
  chunkId: string;
  sourceId: string;
  docNumber: string;
  pageStart: number;
  pageEnd: number;
  sectionHeading: string;
  content: string;
  contentSha256: string;
  embeddingLiteral: string;
}

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const envPath = path.resolve(".env.local");
  if (fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, "utf8").match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1]!.trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("DATABASE_URL not found in environment or .env.local");
}

function parseArg(prefix: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : null;
}

function cleanPdfText(raw: string): string {
  return String(raw || "")
    .replace(/\u0000/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectHeading(text: string): string {
  const headMatch = text.match(/\b((?:CHAPTER|SECTION|APPENDIX)\s+[A-Z0-9.-]+[^.]{0,80}|\d+(?:\.\d+){0,2}\s+[A-Z][A-Za-z0-9 ,:/()-]{4,70})/);
  return headMatch ? headMatch[1]!.trim().slice(0, 120) : "";
}

async function resolveAndDownloadPdf(pub: NistSpPublication): Promise<Uint8Array | null> {
  const candidates: string[] = [];
  if (pub.pdfUrl) candidates.push(pub.pdfUrl);

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "NoctisNistPdfIngestor/1.0 (+https://www.dstrike.app)" },
        signal: AbortSignal.timeout(35_000),
      });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        if (ab.byteLength > 10_000) return new Uint8Array(ab);
      }
    } catch {
      /* fallback to CSRC landing page scrape */
    }
  }

  try {
    const pageRes = await fetch(pub.officialUrl, {
      headers: { "User-Agent": "NoctisNistPdfIngestor/1.0 (+https://www.dstrike.app)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const match = html.match(/https:\/\/nvlpubs\.nist\.gov\/nistpubs\/[^"'\s<>]+\.pdf/i);
      if (match) {
        const pdfRes = await fetch(match[0], {
          headers: { "User-Agent": "NoctisNistPdfIngestor/1.0 (+https://www.dstrike.app)" },
          signal: AbortSignal.timeout(35_000),
        });
        if (pdfRes.ok) {
          const ab = await pdfRes.arrayBuffer();
          if (ab.byteLength > 10_000) return new Uint8Array(ab);
        }
      }
    }
  } catch {
    /* ignore unreachable PDF */
  }
  return null;
}

async function extractPdfChunks(pub: NistSpPublication, pdfBytes: Uint8Array, maxPages: number): Promise<{ chunks: ExtractedChunk[]; pagesRead: number }> {
  const doc = await pdfjsLib.getDocument({
    data: pdfBytes,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    verbosity: 0,
  }).promise;

  const totalPages = Math.min(doc.numPages, maxPages);
  const pageTexts: Array<{ page: number; text: string }> = [];

  for (let p = 1; p <= totalPages; p += 1) {
    try {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const joined = cleanPdfText(
        (tc.items as Array<{ str?: string }>).map((it) => it.str || "").join(" "),
      );
      if (joined.length >= 60) {
        pageTexts.push({ page: p, text: joined });
      }
    } catch {
      /* skip malformed single page */
    }
  }

  await doc.destroy().catch(() => undefined);

  const chunks: ExtractedChunk[] = [];
  let bufText = "";
  let bufStartPage = pageTexts[0]?.page ?? 1;
  let bufEndPage = bufStartPage;
  let chunkIdx = 0;

  const flushChunk = () => {
    const clean = bufText.trim();
    if (clean.length < 180) return;
    chunkIdx += 1;
    const heading = detectHeading(clean) || pub.title.slice(0, 100);
    const sha = crypto.createHash("sha256").update(clean).digest("hex");
    const vecLit = formatVectorLiteral(computeSemanticEmbedding256(`${pub.docNumber} ${heading} ${clean.slice(0, 1200)}`));
    chunks.push({
      chunkId: `${pub.sourceId}-p${bufStartPage}-${bufEndPage}-${chunkIdx}`,
      sourceId: pub.sourceId,
      docNumber: pub.docNumber,
      pageStart: bufStartPage,
      pageEnd: bufEndPage,
      sectionHeading: heading,
      content: clean.slice(0, 2200),
      contentSha256: sha,
      embeddingLiteral: vecLit,
    });
  };

  for (const pt of pageTexts) {
    if (!bufText) bufStartPage = pt.page;
    let remaining = pt.text;
    while (remaining.length > 0) {
      const take = 1250 - bufText.length;
      if (remaining.length <= take) {
        bufText = bufText ? `${bufText} ${remaining}` : remaining;
        bufEndPage = pt.page;
        remaining = "";
      } else {
        const piece = remaining.slice(0, Math.max(200, take));
        const splitAt = piece.lastIndexOf(". ") > 400 ? piece.lastIndexOf(". ") + 1 : piece.length;
        bufText = bufText ? `${bufText} ${remaining.slice(0, splitAt)}` : remaining.slice(0, splitAt);
        bufEndPage = pt.page;
        flushChunk();
        const overlap = bufText.slice(-140);
        bufText = overlap;
        bufStartPage = pt.page;
        remaining = remaining.slice(splitAt).trim();
      }
    }
    if (bufText.length >= 1000) {
      flushChunk();
      bufText = "";
    }
  }
  flushChunk();

  return { chunks, pagesRead: totalPages };
}

async function upsertChunkBatch(client: pg.Client, batch: ExtractedChunk[]): Promise<number> {
  if (!batch.length) return 0;
  const cols = 9;
  const values: unknown[] = [];
  const placeholders: string[] = [];

  for (let i = 0; i < batch.length; i += 1) {
    const c = batch[i]!;
    const base = i * cols;
    placeholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}::vector)`,
    );
    values.push(
      c.chunkId,
      c.sourceId,
      c.docNumber,
      c.pageStart,
      c.pageEnd,
      c.sectionHeading,
      c.content,
      c.contentSha256,
      c.embeddingLiteral,
    );
  }

  await client.query(
    `
    insert into public.rmf_pdf_chunks
      (chunk_id, source_id, doc_number, page_start, page_end, section_heading, content, content_sha256, embedding)
    values ${placeholders.join(", ")}
    on conflict (chunk_id) do update set
      section_heading = excluded.section_heading,
      content = excluded.content,
      content_sha256 = excluded.content_sha256,
      embedding = excluded.embedding
    `,
    values,
  );
  return batch.length;
}

async function main() {
  const dbUrl = resolveDatabaseUrl();
  const docsArg = parseArg("--docs=");
  const maxPagesArg = Number(parseArg("--max-pages=") || 180);
  const maxPages = Number.isFinite(maxPagesArg) && maxPagesArg > 0 ? maxPagesArg : 180;
  const filterSet = docsArg
    ? new Set(docsArg.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))
    : null;

  const targets = NIST_SP_PUBLICATIONS.filter(
    (p) => Boolean(p.pdfUrl) && (!filterSet || filterSet.has(p.sourceId.toLowerCase())),
  );

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let docsIndexed = 0;
  let totalPagesExtracted = 0;
  let totalChunksUpserted = 0;
  const perDocStats: Array<{ sourceId: string; pages: number; chunks: number; status: string }> = [];

  try {
    // Process in small concurrent batches of 3 downloads at a time
    for (let i = 0; i < targets.length; i += 3) {
      const slice = targets.slice(i, i + 3);
      const parsed = await Promise.all(
        slice.map(async (pub) => {
          const bytes = await resolveAndDownloadPdf(pub);
          if (!bytes) {
            return { pub, pages: 0, chunks: [] as ExtractedChunk[], status: "FETCH_SKIPPED" };
          }
          try {
            const res = await extractPdfChunks(pub, bytes, maxPages);
            return { pub, pages: res.pagesRead, chunks: res.chunks, status: "INDEXED" };
          } catch (err) {
            return {
              pub,
              pages: 0,
              chunks: [] as ExtractedChunk[],
              status: `PARSE_ERR: ${err instanceof Error ? err.message : String(err)}`,
            };
          }
        }),
      );

      for (const item of parsed) {
        if (item.chunks.length > 0) {
          await client.query(`delete from public.rmf_pdf_chunks where source_id = $1`, [item.pub.sourceId]);
          for (let j = 0; j < item.chunks.length; j += 50) {
            totalChunksUpserted += await upsertChunkBatch(client, item.chunks.slice(j, j + 50));
          }
          docsIndexed += 1;
          totalPagesExtracted += item.pages;
        }
        perDocStats.push({
          sourceId: item.pub.sourceId,
          pages: item.pages,
          chunks: item.chunks.length,
          status: item.status,
        });
      }
    }

    const totalRow = await client.query(`select count(*)::int as cnt from public.rmf_pdf_chunks`);
    console.log("NIST SP Verbatim PDF Ingestion Complete:", {
      targetPdfs: targets.length,
      docsIndexed,
      totalPagesExtracted,
      totalChunksUpserted,
      dbRmfPdfChunksTotal: totalRow.rows[0]?.cnt ?? totalChunksUpserted,
      perDocStats,
    });
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Failed to ingest NIST PDFs:", err);
  process.exit(1);
});
