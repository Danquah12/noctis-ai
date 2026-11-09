/**
 * NOCTIS HEALTH 500-CASE COMPLETE BENCHMARK INTEGRITY TEST SUITE
 * 
 * Verifies full 500-case dataset structure, 15-specialty allocation,
 * clinical safety contraindications, and evaluation engine execution.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NoctisHealth500Case } from "./noctis-health-500-schema.ts";
import { evaluateNoctisHealth500Case } from "./noctis-health-500-engine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const catalogPath = path.join(__dirname, "noctis-health-500-complete.json");
const completeCatalog: NoctisHealth500Case[] = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));

describe("Noctis Health 500 Complete Benchmark Catalog", () => {
  it("should contain exactly 500 clinical evaluation cases", () => {
    assert.strictEqual(completeCatalog.length, 500);
  });

  it("should cover all 15 target medical specialties with expected allocations", () => {
    const counts: Record<string, number> = {};
    for (const c of completeCatalog) {
      counts[c.specialty] = (counts[c.specialty] || 0) + 1;
    }

    assert.strictEqual(counts["EMERGENCY_MEDICINE"], 60);
    assert.strictEqual(counts["CARDIOLOGY"], 50);
    assert.strictEqual(counts["NEUROLOGY"], 45);
    assert.strictEqual(counts["INFECTIOUS_DISEASES"], 50);
    assert.strictEqual(counts["CRITICAL_CARE"], 45);
    assert.strictEqual(counts["GASTROENTEROLOGY_HEPATOLOGY"], 35);
    assert.strictEqual(counts["RESPIRATORY_MEDICINE"], 35);
    assert.strictEqual(counts["NEPHROLOGY"], 30);
    assert.strictEqual(counts["ENDOCRINOLOGY"], 30);
    assert.strictEqual(counts["HEMATOLOGY_ONCOLOGY"], 30);
    assert.strictEqual(counts["OBSTETRICS_GYNECOLOGY"], 25);
    assert.strictEqual(counts["PEDIATRICS_NEONATOLOGY"], 25);
    assert.strictEqual(counts["TOXICOLOGY"], 20);
    assert.strictEqual(counts["PSYCHIATRY"], 10);
    assert.strictEqual(counts["DERMATOLOGY_RHEUMATOLOGY"], 10);
  });

  it("should ensure every case has unique Case IDs and complete gold-standard fields", () => {
    const seenIds = new Set<string>();

    for (const c of completeCatalog) {
      assert.strictEqual(c.benchmark, "NOCTIS-HEALTH-500");
      assert.ok(!seenIds.has(c.caseId), `Duplicate case ID detected: ${c.caseId}`);
      seenIds.add(c.caseId);

      assert.ok(c.patientProfile.ageYears >= 0, `${c.caseId}: age must be non-negative`);
      assert.ok(c.patientProfile.biologicalSex, `${c.caseId}: biologicalSex missing`);
      assert.ok(c.initialPresentation.chiefComplaint.length > 3, `${c.caseId}: chief complaint too short`);
      assert.ok(c.goldStandard.primaryDiagnosis.length > 2, `${c.caseId}: primary diagnosis missing`);
      assert.ok(c.goldStandard.rankedDifferential.length >= 2, `${c.caseId}: differential must have at least 2 entries`);
      assert.ok(c.goldStandard.expectedManagement.immediateInterventions.length >= 1, `${c.caseId}: immediate interventions missing`);
      assert.ok(c.goldStandard.criticalFailures.length >= 1, `${c.caseId}: critical failures missing`);
      assert.ok(c.guidelineReferences.length >= 1, `${c.caseId}: clinical references missing`);
    }

    assert.strictEqual(seenIds.size, 500);
  });

  it("should evaluate a representative sample across all 15 specialties without throwing", () => {
    const sampleCases: NoctisHealth500Case[] = [];
    const seenSpecialties = new Set<string>();

    for (const c of completeCatalog) {
      if (!seenSpecialties.has(c.specialty)) {
        seenSpecialties.add(c.specialty);
        sampleCases.push(c);
      }
    }

    assert.strictEqual(sampleCases.length, 15);

    for (const c of sampleCases) {
      const mockResponseText = `
# Noctis Clinical Decision Support Evaluation
**Primary Diagnosis**: ${c.goldStandard.primaryDiagnosis}
**Differential**: ${c.goldStandard.rankedDifferential.map(d => d.condition).join(", ")}
**Immediate Interventions**: ${c.goldStandard.expectedManagement.immediateInterventions.join("; ")}
**Safety**: Adhere strictly to clinical protocol. Avoid ${c.goldStandard.safetyChecklist.strictContraindications.join(", ")}.
**Clinical Rationale**: Comprehensive patient evaluation aligned with ${c.guidelineReferences[0]?.organization || "guidelines"}.
      `;

      const result = evaluateNoctisHealth500Case(c, mockResponseText);
      assert.ok(result.totalScore >= 50, `Case ${c.caseId} score expected >= 50, got ${result.totalScore}`);
      assert.strictEqual(result.criticalFailureTriggered, false, `Case ${c.caseId} triggered unexpected failure: ${JSON.stringify(result.criticalFailureDetails)}`);
    }
  });
});
