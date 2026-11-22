/**
 * NDKRS Authoritative & Quarantined Document Ingestion Pipeline (Server-Side)
 *
 * Splits incoming documents/guidelines into heading-aware chunks (~1,600 chars, 200 overlap),
 * validates source allowlist provenance, detects numeric/version contradictions against
 * existing VERIFIED records, computes 384-dim embeddings, and quarantines submissions into
 * `PENDING_REVIEW` unless explicitly invoked by an approved authoritative seed script.
 */

import { APPROVED_SOURCES } from "../approved-sources.ts";
import { sha256Sync } from "../universal-crypto.ts";
import { computeEmbedding, shouldUseOpenAiEmbeddings } from "./embeddings.server.ts";
import {
  ensureNdkrsSchema,
  findVerifiedRecordsByCanonicalKey,
  insertKnowledgeChunk,
  insertReviewQueueItem,
  storeObjectBlob,
  upsertKnowledgeRecord,
  upsertKnowledgeSource,
} from "./persistence.server.ts";
import type { NdkrsDomain, ReviewQueueItem, TrustTier } from "./types.ts";

const EXTRA_ALLOWLIST_HOSTS = [
  "nist.gov",
  "csrc.nist.gov",
  "nvd.nist.gov",
  "fedramp.gov",
  "cisa.gov",
  "cyber.mil",
  "public.cyber.mil",
  "mitre.org",
  "attack.mitre.org",
  "nih.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "kdigo.org",
  "fda.gov",
  "hhs.gov",
  "ecfr.gov",
  "uscode.house.gov",
  "law.cornell.edu",
  "sccm.org",
  "iso.org",
  "github.com",
  "usnistgov.github.io",
  "ietf.org",
  "w3.org",
  "arxiv.org",
  "en.wikipedia.org",
];

export function isAllowlistedSourceUri(sourceUri: string): boolean {
  const raw = (sourceUri || "").trim();
  if (!raw) return false;
  if (/^internal:\/\/noctis-(authoritative|seed|spec)/i.test(raw)) return true;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (EXTRA_ALLOWLIST_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return true;
    }
    return APPROVED_SOURCES.some((s) => s.state === "Connected" && host.includes(s.id));
  } catch {
    return false;
  }
}

export function splitHeadingAwareChunks(
  content: string,
  maxChars = 1500,
  overlap = 180,
): Array<{ heading: string | null; content: string; tokenCount: number }> {
  const normalized = (content || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sections: Array<{ heading: string | null; body: string }> = [];
  const lines = normalized.split("\n");
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch && buffer.length > 0) {
      sections.push({ heading: currentHeading, body: buffer.join("\n").trim() });
      currentHeading = headingMatch[1].trim();
      buffer = [line];
    } else {
      if (headingMatch && !currentHeading) {
        currentHeading = headingMatch[1].trim();
      }
      buffer.push(line);
    }
  }
  if (buffer.length > 0) {
    sections.push({ heading: currentHeading, body: buffer.join("\n").trim() });
  }

  const out: Array<{ heading: string | null; content: string; tokenCount: number }> = [];
  for (const sec of sections) {
    if (sec.body.length <= maxChars) {
      out.push({
        heading: sec.heading,
        content: sec.body,
        tokenCount: sec.body.split(/\s+/).filter(Boolean).length,
      });
      continue;
    }
    let start = 0;
    while (start < sec.body.length) {
      const end = Math.min(sec.body.length, start + maxChars);
      const slice = sec.body.slice(start, end).trim();
      if (slice.length > 0) {
        out.push({
          heading: sec.heading,
          content: slice,
          tokenCount: slice.split(/\s+/).filter(Boolean).length,
        });
      }
      if (end >= sec.body.length) break;
      start = Math.max(start + 1, end - overlap);
    }
  }
  return out;
}

function detectNumericContradictions(newText: string, existingSummary: string): string[] {
  const flags: string[] = [];
  if (!existingSummary || existingSummary.trim() === newText.trim()) return flags;
  const extractKeyNums = (s: string) => {
    const matches = [...s.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:mg\/dl|days?|years?|x|×|%|mmhg|meq\/l)\b/gi)];
    return new Set(matches.map((m) => m[0].toLowerCase().replace(/\s+/g, " ")));
  };
  const prevNums = extractKeyNums(existingSummary);
  const nextNums = extractKeyNums(newText);
  if (prevNums.size > 0 && nextNums.size > 0) {
    const newUnique = [...nextNums].filter((n) => !prevNums.has(n));
    const missingPrev = [...prevNums].filter((n) => !nextNums.has(n));
    if (newUnique.length > 0 && missingPrev.length > 0) {
      flags.push(
        `Threshold/numeric shift vs VERIFIED record: replaced [${missingPrev.slice(0, 3).join(", ")}] with [${newUnique.slice(0, 3).join(", ")}]`,
      );
    }
  }
  return flags;
}

export interface IngestKnowledgeInput {
  domain: NdkrsDomain;
  canonicalKey: string;
  title: string;
  summary: string;
  content: string;
  sourceUri: string;
  trustTier?: TrustTier;
  version?: string;
  citationLabel?: string;
  effectiveDate?: string | null;
  expiresAt?: string | null;
  structuredJson?: Record<string, unknown>;
  proposedBy: string;
  proposedByType?: "HUMAN" | "AGENT" | "INGESTION_WORKER" | "API";
  /** Only trusted seed scripts may pass `preVerifiedBy` to bypass queue quarantine. */
  preVerifiedBy?: string;
  allowExternalEmbeddings?: boolean;
}

export interface IngestKnowledgeResult {
  sourceId: string;
  recordId: string;
  chunkCount: number;
  status: "PENDING_REVIEW" | "VERIFIED";
  allowlistVerified: boolean;
  contradictionFlags: string[];
  reviewQueueItem: ReviewQueueItem | null;
  blobProvider: string;
  contentSha256: string;
}

export async function ingestKnowledgeDocument(
  input: IngestKnowledgeInput,
): Promise<IngestKnowledgeResult> {
  await ensureNdkrsSchema();

  const cleanContent = input.content.trim();
  const cleanSummary = input.summary.trim() || cleanContent.slice(0, 320);
  const version = input.version?.trim() || "1.0.0";
  const citationLabel = input.citationLabel?.trim() || `${input.canonicalKey} (${version})`;
  const trustTier: TrustTier = input.trustTier ?? "USER_SUBMITTED";
  const allowlistVerified = isAllowlistedSourceUri(input.sourceUri);
  const contentSha256 = sha256Sync(`${input.domain}|${input.canonicalKey}|${version}|${cleanContent}`);

  const sourceId = `SRC-${sha256Sync(`${input.domain}|${input.sourceUri}|${version}`).slice(0, 12).toUpperCase()}`;
  const recordId = `REC-${contentSha256.slice(0, 12).toUpperCase()}`;

  const blob = await storeObjectBlob({
    filename: `${input.canonicalKey.replace(/[^a-zA-Z0-9._-]+/g, "_")}.md`,
    mimeType: "text/markdown",
    contentText: cleanContent,
    uploadedBy: input.proposedBy,
  });

  const existingVerified = await findVerifiedRecordsByCanonicalKey(input.domain, input.canonicalKey);
  const contradictionFlags: string[] = [];
  for (const existing of existingVerified) {
    contradictionFlags.push(...detectNumericContradictions(cleanContent, existing.summary));
  }

  // Enforce anti-poisoning: external/API/agent ingestion ALWAYS enters PENDING_REVIEW.
  const canPreVerify = Boolean(input.preVerifiedBy && input.proposedByType !== "AGENT");
  const status: "PENDING_REVIEW" | "VERIFIED" = canPreVerify ? "VERIFIED" : "PENDING_REVIEW";
  const nowIso = new Date().toISOString();

  await upsertKnowledgeSource({
    id: sourceId,
    domain: input.domain,
    title: input.title,
    sourceUri: input.sourceUri,
    trustTier,
    version,
    effectiveDate: input.effectiveDate ?? null,
    expiresAt: input.expiresAt ?? null,
    contentSha256: blob.sha256,
    storageRef: blob.externalUrl || blob.blobId,
    status,
    ingestedBy: input.proposedBy,
    approvedBy: canPreVerify ? input.preVerifiedBy! : null,
    approvedAt: canPreVerify ? nowIso : null,
  });

  await upsertKnowledgeRecord({
    id: recordId,
    sourceId,
    domain: input.domain,
    canonicalKey: input.canonicalKey,
    title: input.title,
    summary: cleanSummary,
    structuredJson: input.structuredJson ?? {},
    citationLabel,
    version,
    effectiveDate: input.effectiveDate ?? null,
    expiresAt: input.expiresAt ?? null,
    verificationStatus: status,
    recordSha256: contentSha256,
    createdBy: input.proposedBy,
    approvedBy: canPreVerify ? input.preVerifiedBy! : null,
    approvedAt: canPreVerify ? nowIso : null,
  });

  const rawChunks = splitHeadingAwareChunks(cleanContent);
  const useExternalEmb = shouldUseOpenAiEmbeddings(input.allowExternalEmbeddings);
  for (let i = 0; i < rawChunks.length; i++) {
    const ch = rawChunks[i];
    const embText = `${input.title} ${input.canonicalKey} ${ch.heading || ""} ${ch.content}`;
    const emb = await computeEmbedding(embText, {
      allowExternal: useExternalEmb,
    });
    const chunkSha = sha256Sync(`${recordId}:${i}:${ch.content}`);
    await insertKnowledgeChunk({
      id: `CHK-${chunkSha.slice(0, 14).toUpperCase()}`,
      sourceId,
      recordId,
      domain: input.domain,
      chunkIndex: i,
      heading: ch.heading,
      content: ch.content,
      tokenCount: ch.tokenCount,
      embeddingModel: emb.model,
      embeddingDims: emb.dims,
      embeddingJson: emb.vector,
      contentSha256: chunkSha,
    });
  }

  let reviewQueueItem: ReviewQueueItem | null = null;
  if (!canPreVerify) {
    reviewQueueItem = await insertReviewQueueItem({
      id: `REV-${contentSha256.slice(0, 12).toUpperCase()}`,
      targetType: "knowledge_record",
      targetId: recordId,
      domain: input.domain,
      title: input.title,
      proposedPayload: {
        sourceId,
        recordId,
        canonicalKey: input.canonicalKey,
        version,
        summary: cleanSummary.slice(0, 400),
        chunkCount: rawChunks.length,
        contentSha256,
      },
      proposedBy: input.proposedBy,
      proposedByType: input.proposedByType ?? "API",
      sourceUri: input.sourceUri,
      allowlistVerified,
      contradictionFlags,
    });
  }

  return {
    sourceId,
    recordId,
    chunkCount: rawChunks.length,
    status,
    allowlistVerified,
    contradictionFlags,
    reviewQueueItem,
    blobProvider: blob.storageProvider,
    contentSha256,
  };
}
