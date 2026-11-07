import { createHash, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";

export type NoctisSourceSubmission = {
  title: string;
  domain: string;
  content: string;
  canonicalUri?: string;
  publisher?: string;
  jurisdiction?: string;
  sourceVersion?: string;
  license?: string;
  classification?: "public" | "internal" | "confidential" | "restricted";
};

const MAX_CONTENT_CHARS = 500_000;
const CHUNK_CHARS = 4_000;
const SAFE_DOMAIN = /^[a-z0-9][a-z0-9._-]{1,79}$/i;
const SAFE_URI = /^https:\/\//i;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\0/g, "").trim().slice(0, max) : "";
}

function splitIntoChunks(content: string): string[] {
  const normalized = content.replace(/\r\n?/g, "\n").trim();
  const chunks: string[] = [];
  for (let offset = 0; offset < normalized.length; offset += CHUNK_CHARS) {
    const piece = normalized.slice(offset, offset + CHUNK_CHARS).trim();
    if (piece) chunks.push(piece);
  }
  return chunks;
}

/**
 * Registers user-supplied text as quarantined evidence.
 * This function deliberately performs no URL fetch, model extraction, approval,
 * or training export. It is a persistence boundary, not a trust decision.
 */
export async function registerNoctisTextSource(input: NoctisSourceSubmission, submitterId: string) {
  const title = clean(input.title, 240);
  const domain = clean(input.domain, 80).toLowerCase();
  const content = typeof input.content === "string" ? input.content.replace(/\0/g, "").trim() : "";
  const canonicalUri = clean(input.canonicalUri, 1000);
  const publisher = clean(input.publisher, 200);
  const jurisdiction = clean(input.jurisdiction, 120);
  const sourceVersion = clean(input.sourceVersion, 120);
  const license = clean(input.license, 240);
  const classification = input.classification || "public";

  if (title.length < 3) throw new Error("Source title must contain at least 3 characters.");
  if (!SAFE_DOMAIN.test(domain)) throw new Error("A valid source domain is required.");
  if (content.length < 40 || content.length > MAX_CONTENT_CHARS) {
    throw new Error(`Source text must be between 40 and ${MAX_CONTENT_CHARS.toLocaleString()} characters.`);
  }
  if (canonicalUri && (!SAFE_URI.test(canonicalUri) || canonicalUri.length > 1000)) {
    throw new Error("Source URI must be an HTTPS URL.");
  }
  if (!["public", "internal", "confidential", "restricted"].includes(classification)) {
    throw new Error("Invalid source classification.");
  }

  const sourceHash = createHash("sha256").update(content, "utf8").digest("hex");
  const chunks = splitIntoChunks(content);
  const sourceId = randomUUID();
  const sql = await getSql();

  const existing = await sql<{ id: string; status: string }>`
    select id, status from noctis_learning_source
    where content_hash = ${sourceHash} and domain = ${domain}
    limit 1
  `;
  if (existing[0]) {
    return { ok: true as const, duplicate: true, sourceId: existing[0].id, status: existing[0].status, chunkCount: 0 };
  }

  await sql`
    insert into noctis_learning_source
      (id, canonical_uri, title, publisher, domain, jurisdiction, source_version,
       content_hash, license, classification, status, submitted_by)
    values
      (${sourceId}, ${canonicalUri || null}, ${title}, ${publisher || null},
       ${domain}, ${jurisdiction || null}, ${sourceVersion || null},
       ${sourceHash}, ${license || null}, ${classification}, 'quarantined', ${submitterId})
  `;

  try {
    for (let ordinal = 0; ordinal < chunks.length; ordinal += 1) {
      const text = chunks[ordinal];
      const chunkHash = createHash("sha256").update(text, "utf8").digest("hex");
      await sql`
        insert into noctis_source_chunk
          (id, source_id, ordinal, locator, content_text, content_hash, token_estimate)
        values
          (${randomUUID()}, ${sourceId}, ${ordinal},
           ${`text-chunk:${ordinal}`},
           ${text}, ${chunkHash}, ${Math.ceil(text.length / 4)})
      `;
    }
  } catch (error) {
    // Best-effort cleanup prevents an incomplete source from appearing ingestible.
    await sql.query("delete from noctis_source_chunk where source_id = $1", [sourceId]).catch(() => []);
    await sql.query("delete from noctis_learning_source where id = $1", [sourceId]).catch(() => []);
    throw new Error(`Source registration failed and was rolled back where possible: ${error instanceof Error ? error.message : "storage error"}`);
  }

  await sql`
    insert into noctis_learning_audit
      (id, actor_id, action, target_type, target_id, reason, after_hash)
    values
      (${randomUUID()}, ${submitterId}, 'source.submit', 'source', ${sourceId},
       'Text source registered; awaiting independent review', ${sourceHash})
  `;

  return { ok: true as const, duplicate: false, sourceId, status: "quarantined" as const, chunkCount: chunks.length, contentHash: sourceHash };
}

export async function pendingNoctisSources(limit = 50) {
  const sql = await getSql();
  return sql<{
    id: string; title: string; domain: string; publisher: string | null;
    canonical_uri: string | null; license: string | null; classification: string;
    content_hash: string; retrieved_at: string; submitted_by: string | null;
    chunk_count: number;
  }>`
    select s.id, s.title, s.domain, s.publisher, s.canonical_uri, s.license,
           s.classification, s.content_hash, s.retrieved_at::text as retrieved_at,
           s.submitted_by, count(c.id)::int as chunk_count
    from noctis_learning_source s
    left join noctis_source_chunk c on c.source_id = s.id
    where s.status = 'quarantined'
    group by s.id
    order by s.created_at asc
    limit ${Math.max(1, Math.min(100, Math.trunc(limit)))}
  `;
}

export async function reviewNoctisSource(input: {
  sourceId: string; decision: "approved" | "rejected"; reviewerId: string; reason: string;
}) {
  const sourceId = clean(input.sourceId, 160);
  const reason = clean(input.reason, 500);
  if (!sourceId || reason.length < 8) throw new Error("A source ID and review reason of at least 8 characters are required.");
  const sql = await getSql();
  const rows = await sql<{ id: string; content_hash: string; status: string; license: string | null; publisher: string | null }>`
    select id, content_hash, status, license, publisher from noctis_learning_source where id = ${sourceId} limit 1
  `;
  const source = rows[0];
  if (!source) throw new Error("Source not found.");
  if (source.status !== "quarantined") throw new Error("Only quarantined sources can be reviewed.");
  if (input.decision === "approved" && (!source.license || !source.publisher)) {
    throw new Error("Approval requires publisher and license/terms metadata. Keep the source quarantined until verified.");
  }
  const changed = await sql<{ id: string }>`
    update noctis_learning_source
    set status = ${input.decision}, reviewed_by = ${input.reviewerId},
        reviewed_at = now(), review_reason = ${reason}, updated_at = now()
    where id = ${sourceId} and status = 'quarantined'
    returning id
  `;
  if (!changed[0]) throw new Error("Source review conflict: the source was already reviewed.");

  await sql`
    insert into noctis_learning_audit
      (id, actor_id, action, target_type, target_id, reason, before_hash, after_hash)
    values
      (${randomUUID()}, ${input.reviewerId}, ${`source.${input.decision}`},
       'source', ${sourceId}, ${reason}, ${source.content_hash}, ${source.content_hash})
  `;
  return { ok: true as const, sourceId, status: input.decision };
}
