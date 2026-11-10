/**
 * Noctis gateway response provenance.
 * This reports which configured route returned an answer, NOT independent
 * verification of a third-party model's identity. No keys, prompts, endpoints,
 * documents or raw answers belong in this metadata.
 */

/**
 * @typedef {{
 *   protocol: "noctis.gateway.v1",
 *   source_kind: "model_gateway" | "native_fallback",
 *   requested_provider: string | null,
 *   responding_provider: "gemini" | "openai" | "groq" | "xai" | "custom" | "local_native",
 *   attempted_model: string | null,
 *   provider_reported_model: string | null,
 *   fallback_used: boolean,
 *   model_identity_independently_verified: false
 * }} NoctisModelProvenance
 */

const responders = new Set(["gemini", "openai", "groq", "xai", "custom", "local_native"]);

/** @param {unknown} value */
function safeLabel(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^[a-z0-9][a-z0-9._:/-]{0,99}$/i.test(text) ||
      /^(sk[-_]|gsk_|xai[-_]|AIza|bearer)/i.test(text)) return null;
  return text;
}

/**
 * @param {{
 *   requestedProvider?: string | null,
 *   respondingProvider: "gemini" | "openai" | "groq" | "xai" | "custom" | "local_native",
 *   attemptedModel?: unknown,
 *   providerReportedModel?: unknown,
 *   attemptNumber: number
 * }} input
 * @returns {NoctisModelProvenance}
 */
export function makeNoctisModelProvenance(input) {
  if (!responders.has(input.respondingProvider)) {
    throw new Error("Unknown Noctis model gateway responder");
  }
  const requested = safeLabel(input.requestedProvider);
  return {
    protocol: "noctis.gateway.v1",
    source_kind: input.respondingProvider === "local_native" ? "native_fallback" : "model_gateway",
    requested_provider: requested,
    responding_provider: input.respondingProvider,
    attempted_model: safeLabel(input.attemptedModel),
    provider_reported_model: safeLabel(input.providerReportedModel),
    fallback_used: input.respondingProvider === "local_native" ||
      input.attemptNumber > 1 ||
      (requested !== null && requested !== input.respondingProvider),
    model_identity_independently_verified: false,
  };
}
