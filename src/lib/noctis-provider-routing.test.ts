import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveProviderOrder, shouldPrioritizeClientBrain } from "./noctis-provider-routing.ts";
import { DEFAULT_BRAIN_CONFIG, getBrainForEngine, type BrainConfig } from "./noctis-brain.ts";

describe("Noctis Preferred Provider Routing", () => {
  it("prioritizes each engine's preferred provider ahead of custom and preserves all fallbacks", () => {
    assert.deepEqual(resolveProviderOrder("openai", false), [
      "openai",
      "custom",
      "xai",
      "gemini",
      "groq",
    ]);
    assert.deepEqual(resolveProviderOrder("gemini", false), [
      "gemini",
      "custom",
      "xai",
      "openai",
      "groq",
    ]);
    assert.deepEqual(resolveProviderOrder("xai", false), [
      "xai",
      "custom",
      "gemini",
      "openai",
      "groq",
    ]);
    assert.deepEqual(resolveProviderOrder("groq", false), [
      "groq",
      "custom",
      "xai",
      "gemini",
      "openai",
    ]);

    // Default / Noctis-native engines preserve the standard fallback order
    assert.deepEqual(resolveProviderOrder("noctis", false), [
      "custom",
      "xai",
      "gemini",
      "openai",
      "groq",
    ]);
    assert.deepEqual(resolveProviderOrder(undefined, false), [
      "custom",
      "xai",
      "gemini",
      "openai",
      "groq",
    ]);
  });

  it("drops text-only groq provider when images are attached and keeps vision-capable fallbacks", () => {
    assert.deepEqual(resolveProviderOrder("groq", true), ["custom", "xai", "gemini", "openai"]);
    assert.deepEqual(resolveProviderOrder("openai", true), ["openai", "custom", "xai", "gemini"]);
    assert.deepEqual(resolveProviderOrder("gemini", true), ["gemini", "custom", "xai", "openai"]);
    assert.deepEqual(resolveProviderOrder("xai", true), ["xai", "custom", "gemini", "openai"]);
  });

  it("prevents empty-key default client Brain from overriding another engine's preferredProvider", () => {
    const emptyGeminiBrain = { provider: "gemini", apiKey: "", model: "gemini-3.5-flash-lite" };

    // Default Gemini config without user key should NOT hijack Noctis Astra (openai), Sentinel (xai), or Velocity (groq)
    assert.equal(shouldPrioritizeClientBrain(emptyGeminiBrain, "openai", false), false);
    assert.equal(shouldPrioritizeClientBrain(emptyGeminiBrain, "xai", false), false);
    assert.equal(shouldPrioritizeClientBrain(emptyGeminiBrain, "groq", false), false);

    // Matching provider or unpinned "noctis" engines keep existing behavior
    assert.equal(shouldPrioritizeClientBrain(emptyGeminiBrain, "gemini", false), true);
    assert.equal(shouldPrioritizeClientBrain(emptyGeminiBrain, "noctis", false), true);
    assert.equal(shouldPrioritizeClientBrain(emptyGeminiBrain, undefined, false), true);

    // Explicit user BYOK key always takes priority regardless of preferredProvider
    assert.equal(
      shouldPrioritizeClientBrain(
        { provider: "openai", apiKey: "sk-user-key-123", model: "gpt-4o" },
        "openai",
        false,
      ),
      true,
    );
    assert.equal(
      shouldPrioritizeClientBrain(
        { provider: "gemini", apiKey: "AIza-user-key", model: "gemini-3.5-flash-lite" },
        "openai",
        false,
      ),
      true,
    );

    // Local/custom endpoints always prioritize, while text-only groq skips picture requests
    assert.equal(shouldPrioritizeClientBrain({ provider: "ollama", model: "noctis-7b" }, "openai", false), true);
    assert.equal(shouldPrioritizeClientBrain({ provider: "vllm", model: "noctis-7b" }, "gemini", false), true);
    assert.equal(shouldPrioritizeClientBrain({ provider: "custom", endpoint: "http://localhost:11434/v1" }, "xai", false), true);
    assert.equal(shouldPrioritizeClientBrain({ provider: "groq", apiKey: "gsk_123" }, "groq", true), false);
    assert.equal(shouldPrioritizeClientBrain(undefined, "openai", false), false);
  });

  it("selects targeted BYOK credentials only when saved for that engine's provider, otherwise defers to server routing", () => {
    // No BYOK keys saved -> provider-pinned engines return undefined so server flagship env key + model runs
    assert.equal(getBrainForEngine(DEFAULT_BRAIN_CONFIG, "openai"), undefined);
    assert.equal(getBrainForEngine(DEFAULT_BRAIN_CONFIG, "gemini"), undefined);
    assert.equal(getBrainForEngine(DEFAULT_BRAIN_CONFIG, "xai"), undefined);
    assert.equal(getBrainForEngine(DEFAULT_BRAIN_CONFIG, "groq"), undefined);

    // "noctis" / undefined engines keep standard getActiveKeyAndModel behavior
    const fallbackBrain = getBrainForEngine(DEFAULT_BRAIN_CONFIG, "noctis");
    assert.equal(fallbackBrain?.provider, "gemini");
    assert.equal(fallbackBrain?.model, "gemini-3.5-flash-lite");

    // When a user saves a BYOK key for OpenAI, Noctis Astra picks up that OpenAI key even if Brain tab defaulted to Gemini
    const withOpenAiByok: BrainConfig = {
      ...DEFAULT_BRAIN_CONFIG,
      provider: "gemini",
      openaiKey: "sk-proj-user-byok",
      openaiModel: "gpt-4o",
      xaiKey: "xai-user-byok",
      xaiModel: "grok-3",
    };

    const astraBrain = getBrainForEngine(withOpenAiByok, "openai");
    assert.equal(astraBrain?.provider, "openai");
    assert.equal(astraBrain?.apiKey, "sk-proj-user-byok");
    assert.equal(astraBrain?.model, "gpt-4o");

    const sentinelBrain = getBrainForEngine(withOpenAiByok, "xai");
    assert.equal(sentinelBrain?.provider, "xai");
    assert.equal(sentinelBrain?.apiKey, "xai-user-byok");
    assert.equal(sentinelBrain?.model, "grok-3");

    // Cortex & Velocity still have no user key saved -> defer to server GEMINI_API_KEY / GROQ_API_KEY
    assert.equal(getBrainForEngine(withOpenAiByok, "gemini"), undefined);
    assert.equal(getBrainForEngine(withOpenAiByok, "groq"), undefined);
  });
});
