import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanVoiceText,
  VOICE_PERSONAS,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
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
});
