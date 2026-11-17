import { createHash } from "node:crypto";

/**
 * Conservative, offline lexical contamination checks for reviewed Noctis datasets.
 * No inference, semantic embeddings, network requests, or model training.
 * Matching can miss paraphrases and can flag legitimate similar questions.
 */

const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const MIN_WORDS = 8;
const MAX_SHINGLES_PER_PROMPT = 128;
const MAX_SHINGLE_POSTINGS = 512;
const MAX_CANDIDATES_PER_PROMPT = 4096;
// Long, substantive answers are checked for exact copying across partitions.
// Short boilerplate answers remain intentionally exempt to limit false positives.
const MIN_EXACT_ANSWER_WORDS = 24;
const MIN_EXACT_ANSWER_CHARS = 120;

/** @param {string[]} words */
function exactTextDigest(words) {
  return createHash("sha256").update(words.join(" "), "utf8").digest("hex");
}

/** @param {unknown} text @returns {string[]} */
export function noctisLeakageWords(text) {
  return typeof text === "string" ?
    (text.normalize("NFKC").toLowerCase().match(TOKEN_PATTERN) || []) : [];
}

/** @param {string[]} words @returns {Set<string>} */
function trigrams(words) {
  const result = new Set();
  for (let i = 0; i + 2 < words.length && result.size < MAX_SHINGLES_PER_PROMPT; i++) {
    result.add(words.slice(i, i + 3).join(" "));
  }
  return result;
}

/** @param {Set<string>} a @param {Set<string>} b */
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

/**
 * Conservative lexical overlap test, NOT a semantic/paraphrase model.
 * Distinct numeric values are considered different examples to avoid
 * erasing math/science tasks solely because their templates resemble.
 * @param {unknown} a
 * @param {unknown} b
 */
export function isNoctisLexicalNearDuplicate(a, b) {
  const aw = noctisLeakageWords(a);
  const bw = noctisLeakageWords(b);
  if (!aw.length || !bw.length) return false;
  if (aw.join(" ") === bw.join(" ")) return true;
  if (aw.length < MIN_WORDS || bw.length < MIN_WORDS ||
    aw.length > 128 || bw.length > 128 ||
    Math.min(aw.length, bw.length) / Math.max(aw.length, bw.length) < 0.75) return false;
  const digits = (/** @type {string[]} */ words) => words.filter(w => /^\d+$/.test(w)).sort().join("|");
  if (digits(aw) !== digits(bw)) return false;
  return jaccard(new Set(aw), new Set(bw)) >= 0.80 &&
    jaccard(trigrams(aw), trigrams(bw)) >= 0.35;
}

/**
 * Fail closed on potential lexical overlap between dataset partitions. The
 * report contains counts only, never prompts/completions or source text.
 * This bounded shingle index avoids an unbounded O(n^2) pairwise scan;
 * ambiguous saturated indexes stop rather than silently ignoring examples.
 * @param {Record<"train" | "development" | "heldout", any[]>} splits
 * @returns {{checked: number, cross_split_lexical_pairs: number}}
 */
export function auditNoctisDatasetSplitLeakage(splits) {
  if (!splits || !/** @type {Array<"train"|"development"|"heldout">} */ (["train", "development", "heldout"])
    .every(name => Array.isArray(splits[name]))) {
    throw new TypeError("Expected three Noctis dataset partitions.");
  }
  /** @type {Map<string, number[]>} */
  const postings = new Map();
  /** @type {Map<string, string>} */
  const exactPromptSplits = new Map();
  /** @type {Map<string, string>} */
  const substantiveAnswerSplits = new Map();
  /** @type {Array<{split: string, prompt: string}>} */
  const previous = [];
  let overlapCount = 0;
  for (const split of ["train", "development", "heldout"]) {
    for (const item of splits[/** @type {"train" | "development" | "heldout"} */ (split)]) {
      const words = noctisLeakageWords(item.prompt);
      // Cover short and very long exact questions missed by bounded n-gram checks.
      // Store hashes only; never include the source text in thrown errors.
      if (words.length) {
        const digest = exactTextDigest(words);
        const earlierSplit = exactPromptSplits.get(digest);
        if (earlierSplit && earlierSplit !== split) {
          throw new Error("Noctis dataset blocked: cross_split_exact_prompt_overlap");
        }
        exactPromptSplits.set(digest, split);
      }
      const completionWords = noctisLeakageWords(item.completion);
      if (typeof item.completion === "string" &&
          item.completion.length >= MIN_EXACT_ANSWER_CHARS &&
          completionWords.length >= MIN_EXACT_ANSWER_WORDS) {
        const digest = exactTextDigest(completionWords);
        const earlierSplit = substantiveAnswerSplits.get(digest);
        if (earlierSplit && earlierSplit !== split) {
          throw new Error("Noctis dataset blocked: cross_split_exact_completion_overlap");
        }
        substantiveAnswerSplits.set(digest, split);
      }
      if (words.length < MIN_WORDS || words.length > 128) continue;
      const shingles = trigrams(words);
      const candidates = new Set();
      for (const shingle of shingles) {
        const ids = postings.get(shingle) || [];
        if (ids.length >= MAX_SHINGLE_POSTINGS) {
          throw new Error("Noctis dataset blocked: lexical_index_capacity_requires_independent_review");
        }
        for (const id of ids) {
          if (previous[id].split !== split) candidates.add(id);
          if (candidates.size > MAX_CANDIDATES_PER_PROMPT) {
            throw new Error("Noctis dataset blocked: lexical_candidate_capacity_requires_independent_review");
          }
        }
      }
      for (const id of candidates) {
        if (isNoctisLexicalNearDuplicate(item.prompt, previous[id].prompt)) overlapCount++;
      }
      const index = previous.length;
      previous.push({ split, prompt: item.prompt });
      for (const shingle of shingles) {
        const ids = postings.get(shingle) || [];
        ids.push(index);
        postings.set(shingle, ids);
      }
    }
  }
  if (overlapCount) throw new Error("Noctis dataset blocked: cross_split_lexical_overlap");
  return { checked: Object.values(splits).reduce((n, rows) => n + rows.length, 0), cross_split_lexical_pairs: 0 };
}
