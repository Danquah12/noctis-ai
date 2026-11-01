import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  OWASP_LLM_VECTORS,
  MODEL_ROBUSTNESS_LEADERBOARD,
  AI_CVE_ADVISORIES,
  ADVERSARIAL_TEST_BATTERY,
} from "./noctis-llm-redteam.ts";

describe("Noctis AI Red Team & LLM Threat Matrix Engine", () => {
  test("OWASP GenAI Top vectors are complete with MITRE ATLAS mappings", () => {
    assert.ok(OWASP_LLM_VECTORS.length >= 6);
    for (const vector of OWASP_LLM_VECTORS) {
      assert.ok(vector.id.startsWith("LLM0"));
      assert.ok(vector.name.length > 5);
      assert.ok(vector.mitreAtlasId.startsWith("AML."));
      assert.ok(vector.description.length > 0);
      assert.ok(vector.remediation.length > 0);
    }
  });

  test("Model Robustness Leaderboard evaluates all 5 frontier architectures", () => {
    assert.strictEqual(MODEL_ROBUSTNESS_LEADERBOARD.length, 5);
    const models = MODEL_ROBUSTNESS_LEADERBOARD.map((m) => m.modelName);
    assert.ok(models.includes("Noctis Ultra (Sovereign Core)"));
    assert.ok(models.includes("ChatGPT / GPT-4o"));
    assert.ok(models.includes("Gemini 2.0 Flash"));
    assert.ok(models.includes("xAI Grok 3"));
    assert.ok(models.includes("Llama 3.3 70B"));

    for (const card of MODEL_ROBUSTNESS_LEADERBOARD) {
      assert.ok(card.overallRobustness >= 80 && card.overallRobustness <= 100);
      assert.ok(card.attackSuccessRate >= 0 && card.attackSuccessRate <= 20);
      assert.ok(card.cveExposureCount >= 0);
    }
  });

  test("AI CVE Observatory contains real-world advisories with CVSS scores", () => {
    assert.ok(AI_CVE_ADVISORIES.length >= 4);
    for (const cve of AI_CVE_ADVISORIES) {
      assert.ok(cve.cveId.startsWith("CVE-"));
      assert.ok(cve.cvss >= 6.0 && cve.cvss <= 10.0);
      assert.ok(cve.affectedVendors.length > 0);
    }
  });

  test("Adversarial Test Battery provides standardized probes across top attack vectors", () => {
    assert.strictEqual(ADVERSARIAL_TEST_BATTERY.length, 4);
    for (const testItem of ADVERSARIAL_TEST_BATTERY) {
      assert.ok(testItem.id.startsWith("test-"));
      assert.ok(testItem.payload.length > 20);
      assert.ok(testItem.expectedRefusalKeywords.length > 0);
    }
  });
});
