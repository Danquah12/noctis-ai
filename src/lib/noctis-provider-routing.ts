export type PreferredLlmProvider = "noctis" | "gemini" | "openai" | "groq" | "xai";

export type ServerLlmProvider = "custom" | "xai" | "gemini" | "openai" | "groq";

export interface BrainRoutingOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

const LOCAL_OR_CUSTOM_PROVIDERS = new Set(["ollama", "vllm", "noctis-local", "custom"]);

/**
 * Resolves the ordered list of server LLM providers to try for a chat completion.
 * Places any engine-pinned provider ahead of "custom" (and the default chain) while
 * preserving all remaining providers as automatic fallbacks.
 */
export function resolveProviderOrder(
  preferredProvider?: PreferredLlmProvider,
  hasPicture = false,
): ServerLlmProvider[] {
  const baseOrder: ServerLlmProvider[] = hasPicture
    ? ["custom", "xai", "gemini", "openai"]
    : ["custom", "xai", "gemini", "openai", "groq"];

  if (!preferredProvider || preferredProvider === "noctis") {
    return baseOrder;
  }

  if (preferredProvider === "groq" && hasPicture) {
    return baseOrder;
  }

  return [preferredProvider, ...baseOrder.filter((provider) => provider !== preferredProvider)];
}

/**
 * Determines whether client Brain (BYOK / user-chosen provider) should run in Priority 1
 * ahead of the server's preferred-provider routing chain.
 */
export function shouldPrioritizeClientBrain(
  brain: BrainRoutingOptions | undefined,
  preferredProvider?: PreferredLlmProvider,
  hasPicture = false,
): boolean {
  const provider = brain?.provider;
  if (!provider || provider === "noctis") {
    return false;
  }

  if (provider === "groq" && hasPicture) {
    return false;
  }

  if (brain?.apiKey?.trim()) {
    return true;
  }

  if (LOCAL_OR_CUSTOM_PROVIDERS.has(provider)) {
    return true;
  }

  if (!preferredProvider || preferredProvider === "noctis" || provider === preferredProvider) {
    return true;
  }

  return false;
}
