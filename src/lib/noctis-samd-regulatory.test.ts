import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSaMdRegulatoryDossier } from "./noctis-samd-regulatory.ts";

test("Noctis SaMD Regulatory Generator emits compliant ISO 14971 and IEC 62304 artifacts", () => {
  const dossier = generateSaMdRegulatoryDossier("Noctis-7b-v3.1-Enterprise");

  assert.equal(dossier.iec62304SoftwareSafetyClass, "CLASS_B");
  assert.equal(dossier.iso14971RiskAnalysis.length >= 5, true);
  assert.equal(dossier.sha256Seal.length, 64);
  assert.equal(dossier.markdownRegulatoryBrief.includes("21 CFR Part 820"), true);

  // Check all hazards have acceptable residual risk
  const allAcceptable = dossier.iso14971RiskAnalysis.every(
    (h) => h.residualRiskLevel === "ACCEPTABLE" || h.residualRiskLevel === "ALARP"
  );
  assert.equal(allAcceptable, true);
});
