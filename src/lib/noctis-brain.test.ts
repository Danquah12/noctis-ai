import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getBrainConfig, saveBrainConfig, getActiveKeyAndModel, DEFAULT_BRAIN_CONFIG } from "./noctis-brain.ts";

describe("Noctis Brain Multi-Provider Config", () => {
  test("returns default config when storage is empty", () => {
    const config = getBrainConfig();
    assert.equal(config.provider, "gemini");
    assert.equal(config.geminiModel, "gemini-3.5-flash-lite");
    assert.equal(config.customEndpoint, "http://localhost:11434/v1");
  });

  test("extracts active key and model correctly for each provider and migrates legacy Gemini models", () => {
    const geminiActive = getActiveKeyAndModel({
      ...DEFAULT_BRAIN_CONFIG,
      provider: "gemini",
      geminiKey: "AIzaSyTest123",
      geminiModel: "gemini-2.5-flash",
    });
    assert.equal(geminiActive.provider, "gemini");
    assert.equal(geminiActive.apiKey, "AIzaSyTest123");
    assert.equal(geminiActive.model, "gemini-3.5-flash-lite");

    const groqActive = getActiveKeyAndModel({
      ...DEFAULT_BRAIN_CONFIG,
      provider: "groq",
      groqKey: "gsk_test456",
    });
    assert.equal(groqActive.provider, "groq");
    assert.equal(groqActive.apiKey, "gsk_test456");
    assert.equal(groqActive.endpoint, "https://api.groq.com/openai/v1");

    const customActive = getActiveKeyAndModel({
      ...DEFAULT_BRAIN_CONFIG,
      provider: "custom",
      customEndpoint: "http://127.0.0.1:11434/v1",
      customModel: "mistral",
    });
    assert.equal(customActive.provider, "custom");
    assert.equal(customActive.endpoint, "http://127.0.0.1:11434/v1");
    assert.equal(customActive.model, "mistral");
  });
});
