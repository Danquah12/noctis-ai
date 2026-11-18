/**
 * Offline, fail-closed compatibility boundary between independently reviewed
 * internal Noctis datasets and a future supervised fine-tuning job.
 *
 * Does not select a foundation model, fetch sources, make model calls, train
 * neural weights, write files, or promote a candidate for release.
 */
import { createHash } from "node:crypto";
import { auditNoctisDatasetSplitLeakage } from "./noctis-dataset-leakage.mjs";

const SPLITS = /** @type {Array<"train"|"development"|"heldout">} */ (["train", "development", "heldout"]);
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const PUBLIC_LICENSES = new Set(["CC0-1.0", "CC-BY-4.0", "MIT", "Apache-2.0"]);
const VALIDATIONS = new Set(["independent_review", "deterministic_test"]);

/** @param {string} content */
function digest(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/** @param {unknown} x */
function validId(x) {
  return typeof x === "string" && ID.test(x);
}

/**
 * Accept *only* the structured result of Noctis's offline dataset preparer,
 * with all three partitions intact. The held-out rows are inspected for
 * contamination but NEVER included in returned training or validation rows.
 *
 * A source manifest and validation marker are attestations, not independent
 * verification of copyright, authorization, factual quality or privacy.
 *
 * @param {Record<"train"|"development"|"heldout", any[]>} splits
 */
export function buildNoctisSftPreflight(splits) {
  if (!splits || SPLITS.some(key => !Array.isArray(splits[key]))) {
    throw new Error("Noctis SFT blocked: three_reviewed_splits_required");
  }
  const counts = SPLITS.map(key => splits[key].length);
  if (counts.some(n => !n) || counts.some(n => n > 200000)) {
    throw new Error("Noctis SFT blocked: nonempty_bounded_train_development_heldout_required");
  }
  if (counts.reduce((a, b) => a + b, 0) > 200000) {
    throw new Error("Noctis SFT blocked: total_dataset_capacity_exceeded");
  }
  const ids = new Set();
  const sourceGroups = new Map();
  const promptFingerprints = /** @type {Record<"train"|"development"|"heldout", string[]>} */ ({ train: [], development: [], heldout: [] });
  const licenseIds = new Set();
  const training = /** @type {Record<"train"|"development", Array<{messages: Array<{role: string, content: string}>}>>} */ ({ train: [], development: [] });
  for (const split of SPLITS) {
    for (const item of splits[split]) {
      const p = item?.provenance;
      if (!validId(item?.id) || ids.has(item.id) ||
          (item.split !== undefined && item.split !== split) ||
          typeof item.prompt !== "string" || !item.prompt.trim() ||
          typeof item.completion !== "string" || !item.completion.trim() ||
          item.prompt.length > 12000 || item.completion.length > 24000 ||
          item.prompt !== item.prompt.trim() || item.completion !== item.completion.trim() ||
          !p || !validId(p.source_id) || !HASH.test(p.source_group_sha256 || "") ||
          !HASH.test(p.example_sha256 || "") ||
          !VALIDATIONS.has(p.validation_kind) ||
          !validId(p.validation_reference) ||
          p.validation_reference.length < 4 ||
          (p.source_kind !== "project_authored" && p.source_kind !== "public_open") ||
          (p.source_kind === "project_authored" && p.license_id !== "NOCTIS-ORIGINAL") ||
          (p.source_kind === "public_open" && !PUBLIC_LICENSES.has(p.license_id)) ||
          (p.source_kind === "public_open" && typeof p.origin_url !== "string") ||
          p.attribution_required !== (p.license_id === "CC-BY-4.0") ||
          p.example_sha256 !== digest(item.prompt + "\n" + item.completion) ||
          item.private_record === true || item.customer_data === true ||
          item.from_user_conversation === true || item.contains_personal_data === true) {
        throw new Error("Noctis SFT blocked: invalid_or_unverifiable_reviewed_example");
      }
      ids.add(item.id);
      const earlier = sourceGroups.get(p.source_group_sha256);
      if (earlier && earlier !== split) {
        throw new Error("Noctis SFT blocked: source_group_crosses_splits");
      }
      sourceGroups.set(p.source_group_sha256, split);
      licenseIds.add(p.license_id);
      promptFingerprints[split].push(p.example_sha256);
      if (split !== "heldout") {
        training[split].push({ messages: [
          { role: "user", content: item.prompt },
          { role: "assistant", content: item.completion },
        ] });
      }
    }
  }
  // Includes near-duplicate prompts and substantial matching answers. It does
  // not prove semantic isolation from pretrained weights or external corpora.
  auditNoctisDatasetSplitLeakage(splits);
  return {
    schema: "noctis.sft.preflight.v1",
    train: training.train,
    development: training.development,
    manifest: {
      train_count: counts[0],
      development_count: counts[1],
      sealed_heldout_count: counts[2],
      sealed_heldout_sha256: digest(promptFingerprints.heldout.sort().join("\n")),
      source_group_count: sourceGroups.size,
      declared_license_ids: [...licenseIds].sort(),
      train_sha256: digest(promptFingerprints.train.sort().join("\n")),
      development_sha256: digest(promptFingerprints.development.sort().join("\n")),
      outcome: "offline_compatibility_preflight_only",
      caveat: "Source rights, independent grading, privacy and trainable base model require external verification; no weights or adapters trained.",
    },
  };
}
