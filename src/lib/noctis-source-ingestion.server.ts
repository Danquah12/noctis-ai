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
           ${`text-offset:${ordinal * CHUNK_CHARS}-${ordinal * CHUNK_CHARS + text.length}`},
           ${text}, ${chunkHash}, ${Math.ceil(text.length / 4)})
      `;
    }
  } catch (error) {
    // Keep the source quarantined; a later repair/retry can identify partial chunks.
    throw new Error(`Source was registered in quarantine but chunk storage was incomplete: ${error instanceof Error ? error.message : "storage error"}`);
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
