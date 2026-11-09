import test from "node:test";
import assert from "node:assert/strict";
import {
  formatInstructionToChatMl,
  synthesizeQloraConfig,
  compileDatasetSummary,
  NOCTIS_SYSTEM_PROMPT,
} from "./noctis-lora-pipeline.ts";

test("NOCTIS LORA & QLORA ADAPTATION PIPELINE (NLPA-TRAIN-001)", async (t) => {
  await t.test("formatInstructionToChatMl generates valid 3-turn ChatML structure", () => {
    const chat = formatInstructionToChatMl(
      "test-001",
      "What are the immediate 1-hour priorities for septic shock?",
      "1. Measure lactate. 2. Blood cultures before antibiotics. 3. Broad-spectrum IV antibiotics. 4. 30 mL/kg fluid bolus. 5. Norepinephrine for MAP >= 65 mmHg.",
      "CLINICAL"
    );

    assert.equal(chat.id, "test-001");
    assert.equal(chat.sourceCategory, "CLINICAL");
    assert.equal(chat.messages.length, 3);
    assert.equal(chat.messages[0].role, "system");
    assert.equal(chat.messages[0].content, NOCTIS_SYSTEM_PROMPT);
    assert.equal(chat.messages[1].role, "user");
    assert.equal(chat.messages[2].role, "assistant");
    assert.ok(chat.messages[2].content.includes("Norepinephrine"));
  });

  await t.test("synthesizeQloraConfig provides optimal NF4 4-bit hyperparameters", () => {
    const config = synthesizeQloraConfig("Qwen/Qwen2.5-72B-Instruct");
    assert.equal(config.baseModel, "Qwen/Qwen2.5-72B-Instruct");
    assert.equal(config.loraRank, 64);
    assert.equal(config.loraAlpha, 128);
    assert.equal(config.quantizationBits, 4);
    assert.equal(config.quantizationType, "nf4");
    assert.equal(config.doubleQuantization, true);
    assert.ok(config.targetModules.includes("q_proj"));
    assert.ok(config.targetModules.includes("down_proj"));
  });

  await t.test("compileDatasetSummary computes accurate train/val splits and steps", () => {
    const mockExamples = Array.from({ length: 100 }, (_, i) =>
      formatInstructionToChatMl(`ex-${i}`, `Question ${i}`, `Answer ${i}`, i % 2 === 0 ? "CLINICAL" : "ENGINEERING")
    );

    const summary = compileDatasetSummary(mockExamples);
    assert.equal(summary.totalExamples, 100);
    assert.equal(summary.trainExamplesCount, 90);
    assert.equal(summary.validationExamplesCount, 10);
    assert.equal(summary.categoryBreakdown["CLINICAL"], 50);
    assert.equal(summary.categoryBreakdown["ENGINEERING"], 50);
    assert.ok(summary.estimatedTotalTokens > 0);
    assert.ok(summary.recommendedTrainingSteps > 0);
  });
});
