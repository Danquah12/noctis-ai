import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanVoiceText,
  splitIntoSpokenChunks,
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

  it("splits long text into safe, grammatically coherent spoken chunks under 220 chars", () => {
    const complexLegalMemo = `
I. STATEMENT OF THE ISSUE
Pursuant to the applicable provisions of the Federal Acquisition Regulation (FAR) and Title 41 of the United States Code, what legal remedies, procedural mechanisms, and damages are available to the Federal Government where a commercial prime contractor has committed a material breach of a non-severable supply or service contract?

II. CONTROLLING LEGAL RULES & AUTHORITIES
1. FAR Part 49 (Termination of Contracts) & FAR 52.249-8 (Default - Fixed-Price Supply and Service): Authorizes the Contracting Officer to terminate a contract for default if the contractor fails to deliver supplies or perform services within the time specified.
2. Procedural Preconditions — Cure Notice & Show Cause Notice (FAR 49.607): For non-delivery failures occurring prior to the contractual expiration date, the Government must issue a formal written Cure Notice affording the contractor a minimum of ten calendar days to cure the defect. If the delivery date has lapsed, no cure notice is required; the Contracting Officer may issue an immediate Show Cause Notice.
3. Reprocurement and Excess Reprocurement Costs (FAR 49.402-6): Upon termination for default, the Government may acquire similar supplies or services against the contractor's account and hold the defaulted contractor liable for all reasonable excess reprocurement costs incurred.
    `;

    const cleaned = cleanVoiceText(complexLegalMemo);
    // When maxLength is omitted, entire memo is preserved without truncation
    assert.ok(cleaned.length > 800);
    assert.ok(cleaned.includes("STATEMENT OF THE ISSUE"));
    assert.ok(cleaned.includes("excess reprocurement costs"));

    const chunks = splitIntoSpokenChunks(cleaned, 220);
    assert.ok(chunks.length >= 4);

    // Verify every single chunk is within the safe browser speech limit
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 220, `Chunk exceeds 220 chars: "${chunk}" (${chunk.length})`);
      assert.ok(chunk.trim().length > 0);
    }

    // Verify zero words were cut off or lost across all chunks
    const combinedChunks = chunks.join(" ");
    assert.ok(combinedChunks.includes("Contracting Officer"));
    assert.ok(combinedChunks.includes("Show Cause Notice"));
    assert.ok(combinedChunks.includes("excess reprocurement costs"));
  });

  it("retains arbitrarily long text when maxLength is omitted or <= 0", () => {
    const veryLongParagraph = "Legal precedent analysis continues with thorough diligence across multiple jurisdictions. ".repeat(60);
    assert.ok(veryLongParagraph.length > 5000);

    const fullCleaned = cleanVoiceText(veryLongParagraph);
    assert.equal(fullCleaned.length, veryLongParagraph.trim().length);

    const explicitZero = cleanVoiceText(veryLongParagraph, 0);
    assert.equal(explicitZero.length, veryLongParagraph.trim().length);

    const explicitNegative = cleanVoiceText(veryLongParagraph, -1);
    assert.equal(explicitNegative.length, veryLongParagraph.trim().length);
  });

  it("reads clinical presentation tables, vitals, and safety contraindications without leaving anything out", () => {
    const clinicalDossier = `
1. Clinical Presentation & Baseline Physiological Profile

| Patient Parameter | Documented Clinical Value | Physiological Significance & Localization |
| :--- | :--- | :--- |
| Patient Profile | 24-year-old female | Demographic and epidemiological baseline |
| Chief Complaint | "Vomiting, diffuse abdominal pain, and rapid deep breathing" | Primary presenting acute physiological distress |
| Onset & Timeline | Symptoms developed over 18 hours following a 2-day bout of gastroenteritis and missed insulin doses | Time-Critical Window: Hyperacute specialist pathway activated |
| Bedside Vitals | BP: 96/62 mmHg · HR: 124 bpm · RR: 32 /min · Temp: 37 °C · SpO2: 98% · Blood Glucose: 540 mg/dL | Hemodynamic and metabolic stability |
| Associated Symptoms | Kussmaul breathing (deep, rapid respirations with fruity acetone odor), dry mucous membranes | Multi-system symptom constellation |

5. Critical Patient Safety Invariants & Contraindication Checklist

> [!WARNING]
> MANDATORY PATIENT SAFETY INVARIANTS (CRITICAL FAILURE PREVENTION):
> Clinical decision support strictly enforces the following hard contraindications:
> - CONTRAINDICATION: Absolute contraindication: Do NOT administer intravenous insulin if serum potassium is < 3.3 mEq/L (drives potassium into cells causing fatal hypokalemic cardiac arrest and respiratory paralysis)
> - CONTRAINDICATION: Do NOT discontinue insulin infusion when blood glucose reaches 200 mg/dL; add dextrose to fluids and continue insulin until anion gap closes
> - SAFETY INVARIANT (CF-DKA-001): Administering IV insulin when serum potassium is < 3.3 mEq/L (Prevention: Mandatory potassium safety gate: verify K+ >= 3.3 mEq/L before starting insulin infusion)
> - SAFETY INVARIANT (CF-DKA-002): Stopping insulin infusion prematurely when blood glucose drops below 200 mg/dL before ketoacidosis and anion gap resolve (Prevention: Protocolized addition of D5W while continuing insulin until venous pH > 7.30 and anion gap <= 12)
`;

    const cleaned = cleanVoiceText(clinicalDossier);

    // Table parameters must all be preserved in spoken English
    assert.ok(cleaned.includes("Patient Profile: 24-year-old female"));
    assert.ok(cleaned.includes("Demographic and epidemiological baseline"));
    assert.ok(cleaned.includes("Vomiting, diffuse abdominal pain, and rapid deep breathing"));
    assert.ok(cleaned.includes("Blood pressure: 96 over 62 millimeters of mercury"));
    assert.ok(cleaned.includes("Heart rate: 124 beats per minute"));
    assert.ok(cleaned.includes("Respiratory rate: 32 per minute"));
    assert.ok(cleaned.includes("Temperature: 37 degrees Celsius"));
    assert.ok(cleaned.includes("Oxygen saturation: 98%"));
    assert.ok(cleaned.includes("Blood Glucose: 540 milligrams per deciliter"));
    assert.ok(cleaned.includes("Kussmaul breathing"));

    // Critical safety invariants and contraindications must all be preserved
    assert.ok(cleaned.includes("Warning: MANDATORY PATIENT SAFETY INVARIANTS"));
    assert.ok(cleaned.includes("CONTRAINDICATION: Absolute contraindication: Do NOT administer intravenous insulin"));
    assert.ok(cleaned.includes("less than 3.3 milliequivalents per liter"));
    assert.ok(cleaned.includes("Safety invariant DKA 001"));
    assert.ok(cleaned.includes("Safety invariant DKA 002"));
    assert.ok(cleaned.includes("greater than or equal to 3.3 milliequivalents per liter"));
    assert.ok(cleaned.includes("D 5 W"));
    assert.ok(cleaned.includes("less than or equal to 12"));

    // Ensure speech chunks cover the complete text without exceeding 220 chars
    const chunks = splitIntoSpokenChunks(cleaned, 220);
    assert.ok(chunks.length > 5);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 220, `Spoken chunk exceeded 220 chars: ${chunk}`);
    }
  });
});
