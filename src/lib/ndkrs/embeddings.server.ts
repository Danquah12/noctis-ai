/**
 * NDKRS Embedding Service (Server-Side)
 *
 * Produces L2-normalized 384-dimensional unit vectors for hybrid vector + BM25 search:
 * - Optional OpenAI `text-embedding-3-small` (`dimensions: 384`) when `allowExternal` is true and `OPENAI_API_KEY` is configured.
 * - Deterministic signed unigram + bigram + character-trigram feature-hashing (`noctis-det-embed-384-v1`)
 *   so embeddings run deterministically offline and identically across Neon Postgres and PGLite.
 */

export const NDKRS_EMBEDDING_DIMS = 384;
export const NDKRS_DETERMINISTIC_EMBED_MODEL = "noctis-det-embed-384-v1";

function fnv1a32(str: string, seed = 0x811c9dc5): number {
  let hash = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function tokenizeNormalized(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9._+/-]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[._/-]+|[._/-]+$/g, ""))
    .filter((t) => t.length >= 2);
}

export function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec.map(() => 0);
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

/**
 * Deterministic L2-normalized 384-dim feature-hashed embedding over tokens, bigrams, and char 3-grams.
 */
export function computeDeterministicEmbedding(text: string): number[] {
  const vec = new Array<number>(NDKRS_EMBEDDING_DIMS).fill(0);
  const tokens = tokenizeNormalized(text).slice(0, 400);
  if (tokens.length === 0) {
    vec[0] = 1;
    return vec;
  }

  const addFeature = (feature: string, weight: number) => {
    const hIdx = fnv1a32(feature, 0x811c9dc5) % NDKRS_EMBEDDING_DIMS;
    const hSign = (fnv1a32(feature, 0x9e3779b9) & 1) === 0 ? 1 : -1;
    vec[hIdx] += hSign * weight;
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // Strong weight on domain identifiers & clinical/legal terms
    const weight = /^[a-z]{1,4}-\d+/.test(tok) || /\d/.test(tok) ? 1.8 : 1.25;
    addFeature(`w:${tok}`, weight);

    if (i + 1 < tokens.length) {
      addFeature(`b:${tok}_${tokens[i + 1]}`, 0.9);
    }

    if (tok.length >= 4) {
      const padded = `_${tok.slice(0, 24)}_`;
      for (let j = 0; j <= padded.length - 3; j++) {
        addFeature(`c:${padded.slice(j, j + 3)}`, 0.35);
      }
    }
  }

  return l2Normalize(vec);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Number((dot / denom).toFixed(6));
}

export async function computeEmbedding(
  text: string,
  opts: { allowExternal?: boolean } = {},
): Promise<{ vector: number[]; model: string; dims: number }> {
  const apiKey = typeof process !== "undefined" ? process.env.OPENAI_API_KEY?.trim() : "";
  if (opts.allowExternal && apiKey && text.trim().length > 0) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(4500),
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text.slice(0, 7500),
          dimensions: NDKRS_EMBEDDING_DIMS,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
        const emb = data.data?.[0]?.embedding;
        if (Array.isArray(emb) && emb.length === NDKRS_EMBEDDING_DIMS) {
          return {
            vector: l2Normalize(emb),
            model: "text-embedding-3-small",
            dims: NDKRS_EMBEDDING_DIMS,
          };
        }
      }
    } catch {
      // Fall back cleanly to deterministic offline embedding
    }
  }

  return {
    vector: computeDeterministicEmbedding(text),
    model: NDKRS_DETERMINISTIC_EMBED_MODEL,
    dims: NDKRS_EMBEDDING_DIMS,
  };
}
