import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanVoiceText,
  VOICE_PERSONAS,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  pickHumanBrowserVoice,
  stopCurrentVoicePlayback,
  speakNoctisVoice,
} from "./noctis-voice.ts";

describe("Noctis Voice Mode Engine", () => {
  it("provides complete voice persona definitions", () => {
    assert.equal(VOICE_PERSONAS.length, 5);
    const alloy = VOICE_PERSONAS.find((p) => p.id === "alloy");
    assert.ok(alloy);
    assert.equal(alloy.label, "Alloy");
    assert.equal(alloy.gender, "neutral");

    const nova = VOICE_PERSONAS.find((p) => p.id === "nova");
    assert.ok(nova);
    assert.equal(nova.label, "Nova");
  });

  it("handles environment detection gracefully in Node.js (no window)", () => {
    assert.equal(isSpeechRecognitionSupported(), false);
    assert.equal(isSpeechSynthesisSupported(), false);
  });

  it("cleans code blocks and tables from spoken output", () => {
    const rawMarkdown = `
# Executive Summary
Here is the core finding:
\`\`\`python
def calculate():
    return 42
\`\`\`
| Metric | Value |
|---|---|
| ARR | $3.8B |

> [!IMPORTANT]
> The critical boundary is verified.

Final determination: $OCF / Net Income$ is 1.45.
Evidence status: Audited.
    `;

    const cleaned = cleanVoiceText(rawMarkdown);
    assert.ok(!cleaned.includes("def calculate()"));
    assert.ok(cleaned.includes("[Code snippet omitted for speech]"));
    assert.ok(!cleaned.includes("| Metric | Value |"));
    assert.ok(cleaned.includes("Executive Summary"));
    assert.ok(cleaned.includes("Here is the core finding:"));
    assert.ok(cleaned.includes("Final determination: OCF / Net Income is 1.45."));
    assert.ok(!cleaned.includes("Evidence status:"));
  });

  it("handles empty or whitespace strings gracefully", () => {
    assert.equal(cleanVoiceText(""), "");
    assert.equal(cleanVoiceText("    "), "");
  });

  it("cleans LaTeX and markdown symbols properly", () => {
    const formulaText = "Under CAPM, cost of equity is $R_e = R_f + \\beta \\times \\text{ERP}$ where $\\text{ERP} = 5.5\\%$.";
    const cleaned = cleanVoiceText(formulaText);
    assert.ok(cleaned.includes("Under CAPM, cost of equity is"));
    assert.ok(cleaned.includes("beta"));
    assert.ok(cleaned.includes("times"));
    assert.ok(cleaned.includes("ERP where ERP = 5.5%."));
  });

  it("pronounces units, abbreviations, and currencies for human intelligibility", () => {
    const text = "Projected revenue is $12.5M vs. $10M last quarter (e.g. cloud sales). Energy consumption reached 450MWh with $2.4B total budget.";
    const cleaned = cleanVoiceText(text);
    assert.ok(cleaned.includes("12.5 million dollars"));
    assert.ok(cleaned.includes("10 million dollars"));
    assert.ok(cleaned.includes("versus"));
    assert.ok(cleaned.includes("for example"));
    assert.ok(cleaned.includes("450 megawatt hours"));
    assert.ok(cleaned.includes("2.4 billion dollars"));
  });

  it("never truncates mid-word or mid-sentence when exceeding maxLength", () => {
    const longText = "First sentence is completely clear. Second sentence has full context and logic. Third sentence finishes the explanation.";
    const truncated = cleanVoiceText(longText, 50);
    // Should end with a period and not cut off inside a word like 'sec...'
    assert.ok(truncated.endsWith("."));
    assert.equal(truncated, "First sentence is completely clear.");
  });

  it("intelligently selects online Natural human voices over legacy robotic synthesizers", () => {
    const mockVoices = [
      { name: "Microsoft David Desktop - English (United States)", lang: "en-US", localService: true },
      { name: "Microsoft Zira Desktop - English (United States)", lang: "en-US", localService: true },
      { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US", localService: false },
      { name: "Microsoft Guy Online (Natural) - English (United States)", lang: "en-US", localService: false },
      { name: "Microsoft Jenny Online (Natural) - English (United States)", lang: "en-US", localService: false },
    ] as unknown as SpeechSynthesisVoice[];

    const alloyPick = pickHumanBrowserVoice(mockVoices, "alloy");
    assert.ok(alloyPick);
    assert.ok(alloyPick.name.includes("Natural"));
    assert.ok(!alloyPick.name.includes("Desktop"));

    const novaPick = pickHumanBrowserVoice(mockVoices, "nova");
    assert.ok(novaPick);
    assert.ok(novaPick.name.includes("Jenny") || novaPick.name.includes("Aria"));

    const onyxPick = pickHumanBrowserVoice(mockVoices, "onyx");
    assert.ok(onyxPick);
    assert.ok(onyxPick.name.includes("Guy"));
  });

  it("handles stopCurrentVoicePlayback and speakNoctisVoice gracefully in headless environments", async () => {
    assert.doesNotThrow(() => stopCurrentVoicePlayback());
    const res = await speakNoctisVoice("Hello world", "natural");
    assert.equal(res, false);
  });
});
