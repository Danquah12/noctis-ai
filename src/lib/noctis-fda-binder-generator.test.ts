import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateFdaRegulatoryBinder,
  CANONICAL_30_TRACK_HAZARDS,
} from "./noctis-fda-binder-generator.ts";

describe("Noctis FDA 510(k) & SaMD Regulatory Binder Generator (Frontier 4)", () => {
  test("generates compliant FDA eSTAR regulatory binder covering all primary hazard gates", () => {
    const binder = generateFdaRegulatoryBinder();
    assert.strictEqual(binder.submissionId, "ESTAR-510K-NOCTIS-2026-V1");
    assert.strictEqual(binder.productCode, "QAN");
    assert.strictEqual(binder.softwareSafetyClass, "CLASS_C_LIFE_CRITICAL");
    assert.ok(binder.totalSafetyGatesRegistered >= 11);
    assert.strictEqual(binder.statutoryExemptionAnalysis.criterion1Met, true);
    assert.strictEqual(binder.statutoryExemptionAnalysis.criterion4Met, true);
  });

  test("confirms ISO 14971 risk mitigations achieve NEGLIGIBLE residual risk across all hazards", () => {
    for (const entry of CANONICAL_30_TRACK_HAZARDS) {
      assert.strictEqual(entry.postMitigationSeverity, "NEGLIGIBLE");
      assert.strictEqual(entry.postMitigationProbability, "IMPROBABLE");
      assert.strictEqual(entry.residualRiskAcceptable, true);
    }
  });

  test("generates Markdown regulatory audit dossier containing 21 U.S.C. § 360j(o)(1)(E) citations", () => {
    const binder = generateFdaRegulatoryBinder();
    assert.ok(binder.binderMarkdownDossier.includes("21 U.S.C. § 360j(o)(1)(E)"));
    assert.ok(binder.binderMarkdownDossier.includes("ISO 14971:2019"));
    assert.ok(binder.binderMarkdownDossier.includes("IEC 62304"));
  });
});
