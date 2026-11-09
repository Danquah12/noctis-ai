/**
 * NOCTIS HEALTH 500 QLORA SPECIALIST FINE-TUNING PIPELINE TESTS
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  generateShareGptDataset,
  generateAlpacaDataset,
  generatePreferenceDataset,
  calculateVramEstimate,
  generateUnslothTrainingScript,
  generateOllamaModelfile,
  getAllBenchmarkCases,
} from "./noctis-qlora-pipeline.ts";

describe("Noctis Health 500 QLoRA Specialist Fine-Tuning Pipeline", () => {
  const cases = getAllBenchmarkCases();

  it("loads all 500 benchmark cases", () => {
    assert.strictEqual(cases.length, 500);
  });

  it("generates a compliant ShareGPT dataset with system, human, and gpt turns", () => {
    const sampleCases = cases.slice(0, 5);
    const shareGpt = generateShareGptDataset(sampleCases);

    assert.strictEqual(shareGpt.length, 5);
    for (const record of shareGpt) {
      assert.ok(record.id.startsWith("noctis-sft-"));
      assert.strictEqual(record.conversations.length, 3);
      assert.strictEqual(record.conversations[0].from, "system");
      assert.strictEqual(record.conversations[1].from, "human");
      assert.strictEqual(record.conversations[2].from, "gpt");

      // Verify the assistant turn has Section 1 3-column table and Section 5 warning
      const assistantText = record.conversations[2].value;
      assert.ok(assistantText.includes("1. Clinical Presentation & Baseline Physiological Profile"));
      assert.ok(assistantText.includes("| Patient Parameter | Documented Clinical Value | Physiological Significance & Localization |"));
      assert.ok(assistantText.includes("5. Critical Patient Safety Invariants & Contraindication Checklist"));
      assert.ok(assistantText.includes("> [!WARNING]"));
    }
  });

  it("generates an Alpaca format dataset matching instruction/output format", () => {
    const sampleCases = cases.slice(0, 5);
    const alpaca = generateAlpacaDataset(sampleCases);

    assert.strictEqual(alpaca.length, 5);
    for (const record of alpaca) {
      assert.ok(record.instruction.includes("[Case"));
      assert.strictEqual(record.input, "");
      assert.ok(record.output.includes("Noctis Health 500 Benchmark Dossier"));
      assert.ok(record.system?.includes("Noctis Sovereign"));
    }
  });

  it("generates DPO preference pairs with chosen gold standard and rejected unsafe response", () => {
    const sampleCases = cases.slice(0, 5);
    const dpo = generatePreferenceDataset(sampleCases);

    assert.strictEqual(dpo.length, 5);
    for (const record of dpo) {
      assert.ok(record.prompt.length > 50);
      assert.ok(record.chosen.includes("| Patient Parameter |"));
      assert.ok(record.rejected.includes("Disregarding contraindications"));
      assert.ok(record.metadata.caseId);
      assert.ok(record.metadata.specialty);
    }
  });

  it("calculates accurate hardware VRAM estimates for foundation models", () => {
    const l70b = calculateVramEstimate("llama-3.1-70b-instruct");
    assert.strictEqual(l70b.parametersBillion, 70.6);
    assert.ok(l70b.qloraVramGb < 50); // Under 50GB in 4-bit QLoRA
    assert.ok(l70b.recommendedHardware.includes("RTX"));

    const l8b = calculateVramEstimate("llama-3.1-8b-instruct");
    assert.strictEqual(l8b.parametersBillion, 8.0);
    assert.ok(l8b.qloraVramGb < 10);
  });

  it("generates an executable Unsloth Python script and Ollama Modelfile", () => {
    const script = generateUnslothTrainingScript();
    assert.ok(script.includes("from unsloth import FastLanguageModel"));
    assert.ok(script.includes("FastLanguageModel.get_peft_model"));
    assert.ok(script.includes("SFTTrainer"));
    assert.ok(script.includes("save_pretrained_gguf"));

    const modelfile = generateOllamaModelfile("noctis-adapter", "llama3.1:70b");
    assert.ok(modelfile.includes("FROM llama3.1:70b"));
    assert.ok(modelfile.includes("ADAPTER ./noctis-adapter"));
    assert.ok(modelfile.includes("SYSTEM"));
  });
});
