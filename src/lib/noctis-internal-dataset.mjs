/**
 * Offline, allowlist-only Noctis training-data preparation foundation.
 * This is NOT model-weight/adapter training and does not fetch external data.
 * Caller supplies internally approved source manifests and independently checked examples.
 * Nothing from end-user chats or private customer records may enter this pipeline.
 */
import { createHash } from "node:crypto";

const PUBLIC_LICENSES = new Set(["CC0-1.0", "CC-BY-4.0", "MIT", "Apache-2.0"]);
const INTERNAL_LICENSE = "NOCTIS-ORIGINAL";
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const HEX_HASH = /^[a-f0-9]{64}$/i;
const REVIEW_KINDS = new Set(["independent_review", "deterministic_test"]);

/** @param {unknown} value @returns {string} */
export function normalizeNoctisPrompt(value) {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase() : "";
}

/** @param {string} value @returns {string} */
export function sha256NoctisDataset(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** @param {unknown} value @returns {boolean} */
function isHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) &&
      !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch { return false; }
}

// Conservative blockers only, not a substitute for privacy review or DLP.
/** @param {string} value @returns {boolean} */
function containsSensitivePattern(value) {
  return /\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{16,}|AKIA[0-9A-Z]{16})\b/.test(value) ||
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value) ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) ||
    /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b/.test(value);
}

/** @param {any} source */
function sourceIssue(source) {
  if (!source || typeof source.id !== "string" || !ID_PATTERN.test(source.id)) return "source_id_invalid";
  if (source.kind !== "public_open" && source.kind !== "project_authored") return "source_kind_not_allowed";
  if (source.kind === "public_open" && (!PUBLIC_LICENSES.has(source.license_id) || !isHttpsUrl(source.origin_url))) {
    return "public_source_license_or_uri_invalid";
  }
  if (source.kind === "project_authored" && source.license_id !== INTERNAL_LICENSE) {
    return "project_source_license_invalid";
  }
  if (source.kind === "project_authored" && source.origin_url && !isHttpsUrl(source.origin_url)) {
    return "project_source_uri_invalid";
  }
  if (source.training_allowed !== true || source.approved !== true ||
      !ID_PATTERN.test(source.reviewed_by || "") || source.usage_rights !== "model_training") {
    return "source_not_approved_for_training";
  }
  if (source.private_record === true || source.user_conversation === true || source.customer_data === true) {
    return "private_source_forbidden";
  }
  return null;
}

/** @param {any} row */
function exampleIssue(row) {
  if (!row || typeof row.id !== "string" || typeof row.source_id !== "string" ||
      !ID_PATTERN.test(row.id) || !ID_PATTERN.test(row.source_id)) return "example_id_invalid";
  if (row.from_user_conversation === true || row.private_record === true ||
      row.customer_data === true || row.contains_personal_data === true) return "private_example_forbidden";
  if (typeof row.prompt !== "string" || typeof row.completion !== "string" ||
      !row.prompt.trim() || !row.completion.trim() ||
      row.prompt.length > 12000 || row.completion.length > 24000) return "example_text_invalid";
  if (containsSensitivePattern(row.prompt + "\n" + row.completion)) return "potential_secret_or_pii";
  if (!row.validation || !REVIEW_KINDS.has(row.validation.kind) ||
      row.validation.passed !== true ||
      !ID_PATTERN.test(row.validation.verified_by || "") ||
      typeof row.validation.reference !== "string" ||
      !ID_PATTERN.test(row.validation.reference) || row.validation.reference.length < 4) {
    return "independent_validation_required";
  }
  return null;
}

/**
 * Deterministic, prompt-grouped train/development/heldout partitions.
 *
 * Returns only accepted examples with provenance, plus sanitized rejected IDs/reasons.
 * Exact duplicate prompts across sources are quarantined rather than allowing leakage.
 * Reserved evaluator prompts are NEVER admitted into the training dataset at any split.
 * @param {{sources: any[], examples: any[]}} input
 * @param {{reservedHeldoutPrompts?: string[]}} [options]
 */
export function prepareNoctisInternalDataset(input, options = {}) {
  if (!input || !Array.isArray(input.sources) || !Array.isArray(input.examples)) {
    throw new TypeError("Expected {sources: [], examples: []}.");
  }
  if (input.sources.length > 10000 || input.examples.length > 200000) {
    throw new RangeError("Input batch exceeds offline preparation bounds.");
  }
  const sourceMap = new Map();
  const blockedSourceIds = new Set();
  const rejected = [];
  for (const source of input.sources) {
    const issue = sourceIssue(source);
    if (issue) {
      rejected.push({ id: ID_PATTERN.test(source?.id || "") ? source.id : "invalid-source", code: issue });
      continue;
    }
    if (sourceMap.has(source.id) || blockedSourceIds.has(source.id)) {
      sourceMap.delete(source.id);
      blockedSourceIds.add(source.id);
      rejected.push({ id: source.id, code: "duplicate_source_id" });
      continue;
    }
    sourceMap.set(source.id, source);
  }
  const reserved = new Set((options.reservedHeldoutPrompts || []).map(normalizeNoctisPrompt).filter(Boolean));
  const promptSeen = new Map();
  const idSeen = new Set();
  /** @type {Record<"train" | "development" | "heldout", any[]>} */
  const splits = { train: [], development: [], heldout: [] };
  for (const row of input.examples) {
    const id = ID_PATTERN.test(row?.id || "") ? row.id : "invalid-example";
    const issue = exampleIssue(row);
    if (issue) { rejected.push({ id, code: issue }); continue; }
    if (idSeen.has(id)) { rejected.push({ id, code: "duplicate_example_id" }); continue; }
    idSeen.add(id);
    const source = sourceMap.get(row.source_id);
    if (!source) { rejected.push({ id, code: "source_unapproved_or_missing" }); continue; }
    const normalizedPrompt = normalizeNoctisPrompt(row.prompt);
    if (reserved.has(normalizedPrompt)) { rejected.push({ id, code: "reserved_evaluation_prompt" }); continue; }
    const normalizedCompletion = row.completion.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (promptSeen.has(normalizedPrompt)) {
      rejected.push({ id, code: promptSeen.get(normalizedPrompt) === normalizedCompletion
        ? "duplicate_prompt" : "conflicting_duplicate_prompt" });
      continue;
    }
    promptSeen.set(normalizedPrompt, normalizedCompletion);
    const fingerprint = sha256NoctisDataset(normalizedPrompt);
    const bucket = Number.parseInt(fingerprint.slice(0, 8), 16) / 0x100000000;
    const split = bucket < 0.8 ? "train" : bucket < 0.9 ? "development" : "heldout";
    splits[split].push({
      id: row.id,
      prompt: row.prompt.trim(),
      completion: row.completion.trim(),
      provenance: {
        source_id: source.id,
        source_kind: source.kind,
        license_id: source.license_id,
        origin_url: source.origin_url || null,
        attribution_required: source.license_id === "CC-BY-4.0",
        example_sha256: sha256NoctisDataset(row.prompt + "\n" + row.completion),
        validation_kind: row.validation.kind,
        validation_reference: row.validation.reference.trim(),
      },
    });
  }
  return {
    schema: "noctis.internal.dataset.v1",
    splits,
    summary: {
      accepted: splits.train.length + splits.development.length + splits.heldout.length,
      counts: { train: splits.train.length, development: splits.development.length, heldout: splits.heldout.length },
      rejected_count: rejected.length,
      rejected,
      note: "Prepared examples only. No neural model training, live evaluation, license verification, or privacy guarantee.",
    },
  };
}
