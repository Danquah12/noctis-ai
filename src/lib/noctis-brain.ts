export type BrainProvider = "gemini" | "groq" | "openai" | "xai" | "custom";

export interface BrainConfig {
  provider: BrainProvider;
  geminiKey?: string;
  geminiModel?: string;
  groqKey?: string;
  groqModel?: string;
  openaiKey?: string;
  openaiModel?: string;
  xaiKey?: string;
  xaiModel?: string;
  customEndpoint?: string;
  customKey?: string;
  customModel?: string;
}

export const DEFAULT_BRAIN_CONFIG: BrainConfig = {
  provider: "gemini",
  geminiModel: "gemini-3.5-flash-lite",
  groqModel: "llama-3.3-70b-versatile",
  openaiModel: "gpt-4o-mini",
  xaiModel: "grok-3-mini",
  customEndpoint: "http://localhost:11434/v1",
  customModel: "llama3.2",
};

const STORAGE_KEY = "noctis_brain_config_v1";

export function getBrainConfig(): BrainConfig {
  if (typeof window === "undefined") return DEFAULT_BRAIN_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAIN_CONFIG;
    const parsed = JSON.parse(raw) as Partial<BrainConfig>;
    return { ...DEFAULT_BRAIN_CONFIG, ...parsed };
  } catch {
    return DEFAULT_BRAIN_CONFIG;
  }
}

export function saveBrainConfig(config: BrainConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore write errors */
  }
}

export function getActiveKeyAndModel(config: BrainConfig): { provider: BrainProvider; apiKey: string; model: string; endpoint?: string } {
  switch (config.provider) {
    case "gemini":
      const requestedGemini = (config.geminiModel || "").trim();
      const normalizedGemini =
        requestedGemini === "gemini-2.5-flash" ||
        requestedGemini === "gemini-2.0-flash" ||
        requestedGemini === "gemini-flash" ||
        !requestedGemini
          ? "gemini-3.5-flash-lite"
          : requestedGemini;
      return {
        provider: "gemini",
        apiKey: (config.geminiKey || "").trim(),
        model: normalizedGemini,
      };
    case "groq":
      return {
        provider: "groq",
        apiKey: (config.groqKey || "").trim(),
        model: config.groqModel || "llama-3.3-70b-versatile",
        endpoint: "https://api.groq.com/openai/v1",
      };
    case "openai":
      return {
        provider: "openai",
        apiKey: (config.openaiKey || "").trim(),
        model: config.openaiModel || "gpt-4o-mini",
      };
    case "xai":
      return {
        provider: "xai",
        apiKey: (config.xaiKey || "").trim(),
        model: config.xaiModel || "grok-3-mini",
      };
    case "custom":
      return {
        provider: "custom",
        apiKey: (config.customKey || "").trim(),
        model: config.customModel || "llama3.2",
        endpoint: (config.customEndpoint || "http://localhost:11434/v1").trim(),
      };
  }
}
