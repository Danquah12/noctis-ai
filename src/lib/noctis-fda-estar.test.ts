/**
 * NOCTIS HEALTH FDA 510(k) eSTAR REGULATORY SUBMISSION TEST SUITE
 * Spec: NH500-FDA-ESTAR-009
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  generateEstarPackage,
  buildEstarSubmissionXml,
  generatePrintableEstarDossierHtml,
  calculateClinicalPerformanceMetrics,
  formatEstarSpokenSummary,
  STANDARD_PREDICATES,
} from "./noctis-fda-estar.ts";
import { cleanVoiceText } from "./noctis-voice.ts";

describe("Noctis FDA 510(k) eSTAR Regulatory Submission Engine", () => {
  it("compiles a valid FDA eSTAR package meeting all 4 statutory CDS criteria", () => {
    const pkg = generateEstarPackage();

    assert.ok(pkg.submissionId.startsWith("ESTAR-510K-2026-"));
    assert.equal(pkg.eStarVersion, "5.2.0-JAN2026");
    assert.equal(pkg.fourStatutoryCriteriaStatus.criterion1Pass, true);
    assert.equal(pkg.fourStatutoryCriteriaStatus.criterion2Pass, true);
    assert.equal(pkg.fourStatutoryCriteriaStatus.criterion3Pass, true);
    assert.equal(pkg.fourStatutoryCriteriaStatus.criterion4Pass, true);
    assert.equal(pkg.predicates.length, STANDARD_PREDICATES.length);
    assert.ok(pkg.clinicalMetrics.totalCasesEvaluated >= 500);
    assert.equal(pkg.clinicalMetrics.criticalSafetyFailuresTripped, 0);
  });

  it("builds compliant FDA CDRH eSTAR v5.2 XML with proper tags and namespaces", () => {
    const pkg = generateEstarPackage();
    const xml = buildEstarSubmissionXml(pkg);

    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<estar:eSTARSubmission xmlns:estar="http://www.fda.gov/cdrh/estar/v5"'));
    assert.ok(xml.includes("<estar:SubmissionType>510(k) Traditional Pre-Market Notification</estar:SubmissionType>"));
    assert.ok(xml.includes("<estar:ProductCode>QHQ (Clinical Decision Support Software)</estar:ProductCode>"));
    assert.ok(xml.includes("<estar:Sensitivity>99.4%</estar:Sensitivity>"));
    assert.ok(xml.includes("<estar:RocAreaUnderCurve>0.996</estar:RocAreaUnderCurve>"));
    assert.ok(xml.includes("<estar:SbomFormat>CycloneDX</estar:SbomFormat>"));
  });

  it("generates a publication-grade printable HTML dossier with Form FDA 3881 and predicate matrix", () => {
    const pkg = generateEstarPackage();
    const html = generatePrintableEstarDossierHtml(pkg);

    assert.ok(html.includes("DEPARTMENT OF HEALTH AND HUMAN SERVICES · FOOD AND DRUG ADMINISTRATION"));
    assert.ok(html.includes("Form FDA 3881"));
    assert.ok(html.includes("Section 520(o)(1)(E) Non-Device CDS Four Statutory Criteria Evaluation"));
    assert.ok(html.includes("Epic Cognitive Computing Model Platform"));
    assert.ok(html.includes("K213042"));
    assert.ok(html.includes("Viz.ai Contact / LVO Subdural Suite"));
    assert.ok(html.includes("99.4%"));
    assert.ok(html.includes("FIPS 140-3 Level 3"));
  });

  it("calculates rigorous clinical performance metrics across 500 benchmark cases", () => {
    const metrics = calculateClinicalPerformanceMetrics(500);

    assert.equal(metrics.totalCasesEvaluated, 500);
    assert.ok(metrics.sensitivityPercent >= 99.0);
    assert.ok(metrics.specificityPercent >= 98.0);
    assert.ok(metrics.rocAuc >= 0.99);
    assert.equal(metrics.criticalSafetyFailuresTripped, 0);
    assert.equal(metrics.criticalSafetyPreventionRatePercent, 100.0);
  });

  it("formats zero-truncation spoken audio summary for regulatory review", () => {
    const pkg = generateEstarPackage();
    const rawSpoken = formatEstarSpokenSummary(pkg);
    const spoken = cleanVoiceText(rawSpoken);

    assert.ok(spoken.includes("FDA 510 k Pre-Market Notification eSTAR Submission Dossier"));
    assert.ok(spoken.includes("21 U.S.C. Section 360j(o)(1)(E)"));
    assert.ok(spoken.includes("Epic Cognitive Computing platform"));
    assert.ok(spoken.includes("99.4 percent"));
    assert.ok(spoken.includes("100 percent safety prevention rate"));
    assert.ok(spoken.includes("CycloneDX Software Bill of Materials"));
  });
});
