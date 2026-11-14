/**
 * Explicitly authorized acquisition of independently reviewed PUBLIC corpus artifacts.
 * This module never trains, grades, or promotes examples into datasets.
 * Only immutable raw.githubusercontent.com commit URLs with pinned content digests.
 * No user records, conversational data, arbitrary URLs, or redirects are supported.
 */
import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";
import { prepareNoctisInternalDataset } from "./noctis-internal-dataset.mjs";

const SOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const HASH = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;
const MIME_TYPES = new Set(["text/plain", "application/json", "application/x-ndjson", "application/jsonl"]);
export const NOCTIS_MAX_SOURCE_BYTES = 2 * 1024 * 1024;

/** @param {unknown} value @returns {URL|null} */
function sourceUrl(value) {
  if (typeof value !== "string" || value.length > 800) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "raw.githubusercontent.com" ||
        url.port || url.username || url.password || url.search || url.hash ||
        url.href !== value) return null;
    const path = url.pathname.split("/").slice(1);
    if (path.length < 4 || !path[0] || !path[1] || !COMMIT.test(path[2]) ||
        path.slice(3).some(part => !part || /%2f|%5c|%00/i.test(part))) return null;
    return url;
  } catch { return null; }
}

/**
 * Validate only manifest metadata. Caller must separately verify actual licensing
 * and source contents; these fields are attestations rather than legal proof.
 * @param {unknown} manifest
 */
export function planNoctisPublicSourceAcquisition(manifest) {
  const supplied = /** @type {{sources?: any[]}|null} */ (manifest);
  if (!supplied || !Array.isArray(supplied.sources) ||
      supplied.sources.length === 0 || supplied.sources.length > 8) {
    throw new Error("Expected 1-8 separately approved public sources.");
  }
  const planned = [];
  const ids = new Set();
  for (const src of supplied.sources) {
    if (!src || !SOURCE_ID.test(src.id || "") || ids.has(src.id)) {
      throw new Error("Source ID missing, unsafe, or repeated.");
    }
    ids.add(src.id);
    if (src.kind !== "public_open" || src.private_record === true ||
        src.customer_data === true || src.user_conversation === true ||
        prepareNoctisInternalDataset({ sources: [src], examples: [] }).summary.rejected_count) {
      throw new Error("Source is not approved for internal model-training preparation.");
    }
    if (!sourceUrl(src.origin_url)) {
      throw new Error("Source URL must be an immutable raw.githubusercontent.com commit URL.");
    }
    if (!HASH.test(src.expected_sha256 || "") ||
        !SOURCE_ID.test(src.license_review_reference || "") ||
        !SOURCE_ID.test(src.license_reviewed_by || "") ||
        !/^\d{4}-\d{2}-\d{2}$/.test(src.license_reviewed_on || "") ||
        !Number.isFinite(Date.parse(src.license_reviewed_on + "T00:00:00Z"))) {
      throw new Error("Content hash and independent usage-rights review reference are required.");
    }
    if (src.reviewed_by === src.license_reviewed_by) {
      throw new Error("Independent usage-rights reviewer must differ from source approver.");
    }
    planned.push({
      id: src.id,
      url: src.origin_url,
      expected_sha256: src.expected_sha256.toLowerCase(),
      license_id: src.license_id,
      source_kind: src.kind,
      usage_rights: src.usage_rights,
      license_review_reference: src.license_review_reference,
      license_reviewed_on: src.license_reviewed_on,
      license_reviewed_by: src.license_reviewed_by,
      attribution_required: src.license_id === "CC-BY-4.0",
    });
  }
  return { schema: "noctis.public.source.acquisition.v1", sources: planned };
}

/**
 * Download and verify ONE already-planned source. Inject fetchImpl for offline tests.
 * @param {ReturnType<typeof planNoctisPublicSourceAcquisition>["sources"][number]} planned
 * @param {{fetchImpl?: typeof fetch}} options
 */
export async function acquireNoctisPinnedPublicSource(planned, options = {}) {
  if (!planned || !SOURCE_ID.test(planned.id || "") || !sourceUrl(planned.url) ||
      !HASH.test(planned.expected_sha256 || "")) {
    throw new Error("Acquisition plan is invalid.");
  }
  const fetchImpl = options.fetchImpl || fetch;
  const res = await fetchImpl(planned.url, {
    method: "GET", redirect: "manual", credentials: "omit", cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "text/plain, application/json, application/x-ndjson" },
  });
  if (res.status !== 200 || res.redirected || res.url && res.url !== planned.url) {
    throw new Error("Source fetch failed or redirected; no content accepted.");
  }
  const mime = (res.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!MIME_TYPES.has(mime)) throw new Error("Unexpected source media type.");
  const declaredLength = res.headers.get("content-length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) ||
      Number(declaredLength) > NOCTIS_MAX_SOURCE_BYTES)) {
    throw new Error("Source is larger than the acquisition limit.");
  }
  if (!res.body || typeof res.body.getReader !== "function") {
    throw new Error("Source response contains no readable body.");
  }
  const reader = res.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > NOCTIS_MAX_SOURCE_BYTES) throw new Error("Source exceeded the byte limit.");
      chunks.push(value);
    }
  } catch (err) {
    await reader.cancel().catch(() => {});
    throw err;
  } finally { reader.releaseLock(); }
  if (!length) throw new Error("Empty source not accepted.");
  const bytes = Buffer.concat(chunks, length);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== planned.expected_sha256.toLowerCase()) {
    throw new Error("Pinned source digest mismatch. No content accepted.");
  }
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("Only valid UTF-8 text is supported."); }
  if (text.includes("\0")) throw new Error("Binary content not accepted.");
  return { id: planned.id, sha256: digest, bytes, byte_count: length, media_type: mime };
}
