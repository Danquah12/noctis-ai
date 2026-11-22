/**
 * NDKRS Anti-Poisoning Governance, Dual-Control Review Queue & Staleness Monitor (Server-Side)
 *
 * Enforces:
 * - Hard separation between unverified submissions (`PENDING_REVIEW`) and authoritative `VERIFIED` DB.
 * - `AGENT_APPROVAL_FORBIDDEN`: AI agents/LLMs cannot approve knowledge updates.
 * - `SELF_APPROVAL_FORBIDDEN`: The proposer cannot approve their own submission.
 */

import { ensureNdkrsSchema, mapReviewQueueItem } from "./persistence.server.ts";
import type { KnowledgeRecord, ReviewQueueItem } from "./types.ts";

export async function listReviewQueue(status?: ReviewQueueItem["status"]): Promise<ReviewQueueItem[]> {
  const sql = await ensureNdkrsSchema();
  const rows = status
    ? await sql.query<Record<string, unknown>>(
        "SELECT * FROM ndkrs.review_queue WHERE status = $1 ORDER BY created_at DESC LIMIT 100",
        [status],
      )
    : await sql.query<Record<string, unknown>>(
        "SELECT * FROM ndkrs.review_queue ORDER BY created_at DESC LIMIT 100",
      );
  return rows.map(mapReviewQueueItem);
}

export async function decideReviewItem(input: {
  queueId: string;
  decision: "APPROVE" | "REJECT";
  reviewerId: string;
  reviewerRole: string;
  notes?: string;
}): Promise<ReviewQueueItem> {
  const sql = await ensureNdkrsSchema();
  const reviewerRoleNorm = (input.reviewerRole || "").trim().toUpperCase();
  const reviewerIdClean = (input.reviewerId || "").trim();

  if (!reviewerIdClean) {
    throw new Error("REVIEWER_ID_REQUIRED: Authenticated human reviewer ID is required.");
  }
  if (reviewerRoleNorm === "AGENT" || reviewerRoleNorm === "LLM" || reviewerRoleNorm === "AI") {
    throw new Error(
      "AGENT_APPROVAL_FORBIDDEN: Automated AI agents cannot approve authoritative knowledge updates.",
    );
  }

  const foundRows = await sql.query<Record<string, unknown>>(
    "SELECT * FROM ndkrs.review_queue WHERE id = $1",
    [input.queueId],
  );
  if (foundRows.length === 0) {
    throw new Error(`QUEUE_ITEM_NOT_FOUND: No review item with id "${input.queueId}".`);
  }
  const existing = mapReviewQueueItem(foundRows[0]);
  if (existing.proposedBy.trim().toLowerCase() === reviewerIdClean.toLowerCase()) {
    throw new Error(
      "SELF_APPROVAL_FORBIDDEN: Dual control prohibits a proposer from approving their own knowledge submission.",
    );
  }

  const nextStatus = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  const recordStatus = input.decision === "APPROVE" ? "VERIFIED" : "REJECTED";
  const nowIso = new Date().toISOString();

  const updatedRows = await sql.query<Record<string, unknown>>(
    `UPDATE ndkrs.review_queue
     SET status = $1, reviewer_id = $2, reviewer_role = $3, reviewer_notes = $4, decided_at = $5
     WHERE id = $6
     RETURNING *`,
    [
      nextStatus,
      reviewerIdClean,
      reviewerRoleNorm || "HUMAN_REVIEWER",
      input.notes?.trim() || null,
      nowIso,
      input.queueId,
    ],
  );

  const sourceId = String(existing.proposedPayload?.sourceId || "");
  await sql.query(
    `UPDATE ndkrs.knowledge_records
     SET verification_status = $1, approved_by = $2, approved_at = $3, updated_at = now()
     WHERE id = $4`,
    [recordStatus, reviewerIdClean, input.decision === "APPROVE" ? nowIso : null, existing.targetId],
  );
  if (sourceId) {
    await sql.query(
      `UPDATE ndkrs.knowledge_sources
       SET status = $1, approved_by = $2, approved_at = $3, updated_at = now()
       WHERE id = $4`,
      [recordStatus, reviewerIdClean, input.decision === "APPROVE" ? nowIso : null, sourceId],
    );
  }

  return mapReviewQueueItem(updatedRows[0]);
}

export async function scanStaleKnowledgeRecords(warningDays = 30): Promise<{
  totalVerified: number;
  expiredCount: number;
  expiringSoonCount: number;
  expired: Array<Pick<KnowledgeRecord, "id" | "canonicalKey" | "domain" | "title" | "expiresAt">>;
  expiringSoon: Array<Pick<KnowledgeRecord, "id" | "canonicalKey" | "domain" | "title" | "expiresAt">>;
}> {
  const sql = await ensureNdkrsSchema();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT id, canonical_key, domain, title, expires_at FROM ndkrs.knowledge_records WHERE verification_status = 'VERIFIED'",
  );
  const nowMs = Date.now();
  const warnCutoffMs = nowMs + warningDays * 86_400_000;

  const expired: Array<Pick<KnowledgeRecord, "id" | "canonicalKey" | "domain" | "title" | "expiresAt">> = [];
  const expiringSoon: Array<Pick<KnowledgeRecord, "id" | "canonicalKey" | "domain" | "title" | "expiresAt">> = [];

  for (const r of rows) {
    if (!r.expires_at) continue;
    const expIso = new Date(String(r.expires_at)).toISOString();
    const expMs = new Date(expIso).getTime();
    const item = {
      id: String(r.id),
      canonicalKey: String(r.canonical_key),
      domain: String(r.domain) as KnowledgeRecord["domain"],
      title: String(r.title),
      expiresAt: expIso,
    };
    if (expMs <= nowMs) {
      expired.push(item);
    } else if (expMs <= warnCutoffMs) {
      expiringSoon.push(item);
    }
  }

  return {
    totalVerified: rows.length,
    expiredCount: expired.length,
    expiringSoonCount: expiringSoon.length,
    expired,
    expiringSoon,
  };
}
