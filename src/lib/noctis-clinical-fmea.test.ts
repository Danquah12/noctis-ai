// ============================================================================
// NOCTIS TASK 2 UNIT TEST: CLINICAL FMEA RISK MATRIX SUITE
// Standards: ISO 14971:2019, IEC 62304 Class C, FDA SaMD Clinical Guidance
// ============================================================================

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  generateClinicalFmeaReport,
  exportFmeaMarkdownTable,
  CLINICAL_FMEA_MASTER_CATALOG,
} from "./noctis-clinical-fmea.ts";

describe("TASK 2: NOCTIS CLINICAL FMEA (ISO 14971:2019) RISK MATRIX SUITE", () => {
  test("Task 2.1: validates all catastrophic clinical hazards have residual RPN < 25", () => {
    const report = generateClinicalFmeaReport();

    assert.equal(report.totalRisksEvaluated, CLINICAL_FMEA_MASTER_CATALOG.length);
    assert.ok(report.criticalCatastrophicHazardsMitigated >= 4, "Must identify and mitigate >= 4 catastrophic hazards");
    assert.ok(report.riskReductionPercentage > 70.0, "Overall risk reduction must exceed 70%");

    // Verify every single post-mitigation RPN is strictly < 25 (acceptable risk threshold)
    for (const item of report.fmeaMatrix) {
      assert.ok(item.postMitigation.rpn < 25, `Item ${item.id} residual RPN ${item.postMitigation.rpn} exceeds 25`);
      assert.ok(item.postMitigation.riskAcceptable, `Item ${item.id} must be marked acceptable`);
      assert.ok(item.architecturalInvariantSafeguard.length > 20, `Item ${item.id} must have detailed safeguard`);
    }
  });

  test("Task 2.2: generates compliant markdown audit table with SHA-256 seal", () => {
    const report = generateClinicalFmeaReport();
    const md = exportFmeaMarkdownTable(report);

    assert.ok(md.includes("ISO 14971:2019"));
    assert.ok(md.includes("FMEA-001-THROMBOLYSIS-ICH"));
    assert.ok(md.includes("FMEA-002-SGLT2I-EUGLYCEMIC-DKA"));
    assert.ok(md.includes("FMEA-003-MASKED-HYPERKALEMIC-LBBB"));
    assert.ok(md.includes("FMEA-SHA256:0x"));
    assert.ok(md.includes("✅ PASS"));
  });
});
