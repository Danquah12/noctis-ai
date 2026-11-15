/**
 * Offline bridge from PR #8 acquired PUBLIC artifacts to PR #7 reviewed examples.
 * No extraction, model-generated answers, uploads, network, inference or training.
 * All inputs are operator-supplied, and source rights / answer quality remain
 * independent attestations; a matching excerpt digest is NOT proof of entailment.
 */
import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";
import {
  planNoctisPublicSourceAcquisition, NOCTIS_MAX_SOURCE_BYTES,
} from "./noctis-public-source-acquisition.mjs";
import { prepareNoctisInternalDataset } from "./noctis-internal-dataset.mjs";

const HASH = /^[a-f0-9]{64}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const SOURCE_STATUS = "ACQUIRED_UNREVIEWED_CONTENT_NOT_TRAINING_DATA";
const MAX_CANDIDATES = 2000;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function requireCheck(ok, code) {
  if (!ok) throw new Error("Reviewed source bridge blocked: " + code);
}

/**
 * @param {{catalog: any, acquisition: any, sourceBytesById: Map<string, Uint8Array>, candidates: any[]}} bundle
 * @param {{reservedHeldoutPrompts?: string[]}} [options]
 */
export function prepareNoctisReviewedPublicBundle(bundle, options = {}) {
  requireCheck(bundle && typeof bundle === "object", "bundle_invalid");
  const { catalog, acquisition, sourceBytesById, candidates } = bundle;
  // Existing source approval/rights and URL pinning contract, not a new bypass.
  const plan = planNoctisPublicSourceAcquisition(catalog);
  requireCheck(acquisition?.schema === plan.schema &&
    Array.isArray(acquisition.sources) &&
    acquisition.sources.length === plan.sources.length, "acquisition_manifest_invalid");
  requireCheck(sourceBytesById instanceof Map &&
    sourceBytesById.size === plan.sources.length, "source_files_missing_or_extra");
  requireCheck(Array.isArray(candidates) &&
    candidates.length > 0 && candidates.length <= MAX_CANDIDATES, "reviewed_candidates_required");
  requireCheck(plan.sources.length === new Set(plan.sources.map(s => s.id)).size, "source_ids_repeated");

  const catalogById = new Map(catalog.sources.map(s => [s.id, s]));
  const acquiredById = new Map();
  for (const record of acquisition.sources) {
    requireCheck(record && ID.test(record.id || "") && !acquiredById.has(record.id),
      "acquisition_source_duplicate_or_invalid");
    acquiredById.set(record.id, record);
  }
  const verifiedBytes = new Map();
  for (const planned of plan.sources) {
    const rec = acquiredById.get(planned.id);
    requireCheck(rec && rec.status === SOURCE_STATUS &&
      rec.sha256 === planned.expected_sha256 &&
      rec.origin_url === planned.url &&
      rec.license_id === planned.license_id &&
      rec.usage_rights === planned.usage_rights &&
      rec.license_review_reference === planned.license_review_reference &&
      rec.attribution_required === planned.attribution_required &&
      /^source-[1-8]\.txt$/.test(rec.file || "") &&
      Number.isSafeInteger(rec.byte_count) && rec.byte_count > 0 &&
      rec.byte_count <= NOCTIS_MAX_SOURCE_BYTES, "acquisition_metadata_mismatch");
    const bytes = sourceBytesById.get(planned.id);
    requireCheck(bytes instanceof Uint8Array && bytes.byteLength > 0 &&
      bytes.byteLength === rec.byte_count &&
      bytes.byteLength <= NOCTIS_MAX_SOURCE_BYTES, "source_bytes_invalid");
    requireCheck(sha256(bytes) === planned.expected_sha256, "acquired_content_digest_mismatch");
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { throw new Error("Reviewed source bridge blocked: source_not_utf8"); }
    requireCheck(!text.includes("\0"), "source_binary_content");
    verifiedBytes.set(planned.id, bytes);
  }

  const evidenceByExample = new Map();
  const examples = [];
  for (const candidate of candidates) {
    requireCheck(candidate && ID.test(candidate.id || "") &&
      ID.test(candidate.source_id || ""), "candidate_identifiers_invalid");
    const source = catalogById.get(candidate.source_id);
    const bytes = verifiedBytes.get(candidate.source_id);
    requireCheck(source && bytes, "candidate_source_not_acquired");
    requireCheck(candidate.source_sha256 === sha256(bytes), "candidate_source_digest_mismatch");
    const e = candidate.evidence;
    requireCheck(e && Number.isSafeInteger(e.byte_start) &&
      Number.isSafeInteger(e.byte_end) &&
      e.byte_start >= 0 && e.byte_end <= bytes.byteLength &&
      e.byte_end - e.byte_start >= 24 && HASH.test(e.sha256 || "") &&
      sha256(bytes.subarray(e.byte_start, e.byte_end)) === e.sha256.toLowerCase(),
      "source_evidence_span_invalid");
    const v = candidate.validation;
    requireCheck(v && v.kind === "independent_review" && v.passed === true &&
      ID.test(v.verified_by || "") && ID.test(v.reference || "") &&
      validDate(v.reviewed_on) &&
      v.verified_by !== source.reviewed_by &&
      v.verified_by !== source.license_reviewed_by,
      "independent_example_review_required");
    evidenceByExample.set(candidate.id, {
      source_sha256: candidate.source_sha256,
      evidence_sha256: e.sha256.toLowerCase(),
      evidence_byte_start: e.byte_start,
      evidence_byte_end: e.byte_end,
      review_date: v.reviewed_on,
    });
    examples.push({
      id: candidate.id, source_id: candidate.source_id,
      prompt: candidate.prompt, completion: candidate.completion,
      validation: candidate.validation,
      from_user_conversation: candidate.from_user_conversation,
      private_record: candidate.private_record,
      customer_data: candidate.customer_data,
      contains_personal_data: candidate.contains_personal_data,
    });
  }
  const prepared = prepareNoctisInternalDataset({
    sources: catalog.sources, examples,
  }, { reservedHeldoutPrompts: options.reservedHeldoutPrompts || [] });
  // Quarantine entire package instead of exporting a silently partial batch.
  if (prepared.summary.accepted !== candidates.length || prepared.summary.rejected_count) {
    const codes = [...new Set(prepared.summary.rejected.map(r => r.code))].sort();
    throw new Error("Reviewed source bridge blocked: preparation_rejected_" + codes.join("_"));
  }
  for (const split of ["train", "development", "heldout"]) {
    for (const row of prepared.splits[split]) {
      row.provenance = { ...row.provenance, ...evidenceByExample.get(row.id) };
    }
  }
  return {
    ...prepared,
    bridge_schema: "noctis.reviewed.public.bundle.v1",
    source_count: plan.sources.length,
    note: "Verified source bytes and independently attested candidate spans; no proof of answer truth, license verification, model training or performance improvement.",
  };
}
