import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanVoiceText,
  VOICE_PERSONAS,
  VOICE_LANGUAGE_GROUPS,
  getVoicePersona,
  previewVoiceSample,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  pickHumanBrowserVoice,
  stopCurrentVoicePlayback,
  speakNoctisVoice,
} from "./noctis-voice.ts";

describe("Noctis Voice Mode Engine", () => {
  it("provides complete voice persona definitions across all 9 language families", () => {
    // 23 modern OpenAI Advanced Voice personas + 5 classic personas
    assert.equal(VOICE_PERSONAS.length, 28);

    // Verify all 9 language groups matching mobile/web selection modal
    assert.equal(VOICE_LANGUAGE_GROUPS.length, 9);
    const languages = VOICE_LANGUAGE_GROUPS.map((g) => g.language);
    assert.deepEqual(languages, [
      "American English",
      "Brazilian Portuguese",
      "British English",
      "French",
      "German",
      "Hindi",
      "Japanese",
      "Korean",
      "Mexican Spanish",
    ]);

    // Check American English selected default (Maple)
    const maple = getVoicePersona("maple");
    assert.equal(maple.id, "maple");
    assert.equal(maple.label, "Maple");
    assert.equal(maple.gender, "female");
    assert.equal(maple.languageCode, "en-US");
    assert.ok(maple.samplePhrase.length > 0);

    // Check Brazilian Portuguese
    const rio = getVoicePersona("rio");
    assert.equal(rio.label, "Rio");
    assert.equal(rio.languageCode, "pt-BR");
    assert.equal(rio.gender, "male");

    const viola = getVoicePersona("viola");
    assert.equal(viola.label, "Viola");
    assert.equal(viola.languageCode, "pt-BR");
    assert.equal(viola.gender, "female");

    // Check British English
    const arbor = getVoicePersona("arbor");
    assert.equal(arbor.label, "Arbor");
    assert.equal(arbor.languageCode, "en-GB");

    const vale = getVoicePersona("vale");
    assert.equal(vale.label, "Vale");
    assert.equal(vale.languageCode, "en-GB");

    // Check French
    const rivage = getVoicePersona("rivage");
    assert.equal(rivage.label, "Rivage");
    assert.equal(rivage.languageCode, "fr-FR");

    const aube = getVoicePersona("aube");
    assert.equal(aube.label, "Aube");
    assert.equal(aube.languageCode, "fr-FR");

    // Check German
    const miko = getVoicePersona("miko");
    assert.equal(miko.label, "Miko");
    assert.equal(miko.languageCode, "de-DE");

    const sonna = getVoicePersona("sonna");
    assert.equal(sonna.label, "Sonna");
    assert.equal(sonna.languageCode, "de-DE");

    // Check Hindi
    const neer = getVoicePersona("neer");
    assert.equal(neer.label, "Neer");
    assert.equal(neer.languageCode, "hi-IN");

    const leher = getVoicePersona("leher");
    assert.equal(leher.label, "Leher");
    assert.equal(leher.languageCode, "hi-IN");

    // Check Japanese
    const rindo = getVoicePersona("rindo");
    assert.equal(rindo.label, "Rindō");
    assert.equal(rindo.languageCode, "ja-JP");

    const himari = getVoicePersona("himari");
    assert.equal(himari.label, "Himari");
    assert.equal(himari.languageCode, "ja-JP");

    // Check Korean
    const haetsal = getVoicePersona("haetsal");
    assert.equal(haetsal.label, "Haetsal");
    assert.equal(haetsal.languageCode, "ko-KR");

    const hanul = getVoicePersona("hanul");
    assert.equal(hanul.label, "Hanul");
    assert.equal(hanul.languageCode, "ko-KR");

    // Check Mexican Spanish
    const arrullo = getVoicePersona("arrullo");
    assert.equal(arrullo.label, "Arrullo");
    assert.equal(arrullo.languageCode, "es-MX");

    const tinta = getVoicePersona("tinta");
    assert.equal(tinta.label, "Tinta");
    assert.equal(tinta.languageCode, "es-MX");

    // Fallback behavior
    const fallback = getVoicePersona("non_existent_voice");
    assert.equal(fallback.id, "maple");
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

  it("handles previewVoiceSample gracefully across multiple languages in headless environments", async () => {
    const previewMaple = await previewVoiceSample("maple");
    assert.equal(previewMaple, false); // Returns false gracefully without throwing in Node

    const previewRio = await previewVoiceSample("rio");
    assert.equal(previewRio, false);

    const previewRindo = await previewVoiceSample("rindo");
    assert.equal(previewRindo, false);
  });
});
