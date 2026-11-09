/**
 * NOCTIS FRONTIER & BENCHMARK API SUITE (NFBA-001)
 *
 * Verifies that the API endpoints for Noctis Health 500,
 * 20 Hard Engineering Challenges, DICOM Vision, and Quant Risk
 * are fully operable and return accurate deterministic responses.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  solveSmartCity001,
  solveFusionTokamak006,
  solveDacEnergetics011,
  solveAsteroidDeflection020,
} from "./noctis-engineering-challenges.ts";
import { classifyHounsfieldUnit, calculateAspectsScore } from "./noctis-dicom-vision.ts";
import { calculateMonteCarloVaR, calculateBlackScholesOption } from "./noctis-quant-risk.ts";
import { evaluateNoctisHealth500Case } from "./noctis-health-500-engine.ts";
import type { NoctisHealth500Case } from "./noctis-health-500-schema.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Noctis Frontier & Benchmark API Validation", () => {
  it("should provide overview metrics covering all 500 cases and 20 challenges", () => {
    const catalogPath = path.join(__dirname, "noctis-health-500-complete.json");
    assert.ok(fs.existsSync(catalogPath), "500-case catalog file must exist");
    
    const cases: NoctisHealth500Case[] = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
    assert.strictEqual(cases.length, 500);

    const solarMW = solveSmartCity001().requiredSolarCapacityMW;
    assert.strictEqual(solarMW, 170.59);

    const fusion = solveFusionTokamak006();
    assert.ok(fusion.tripleProductKeVSM3 > 3.0e21);

    const dac = solveDacEnergetics011();
    assert.ok(dac.netNegativeRatio >= 0.85);

    const asteroid = solveAsteroidDeflection020();
    assert.ok(asteroid.deflectionDistanceKm >= 500);
  });

  it("should evaluate a Health 500 clinical case submission with full scoring", () => {
    const catalogPath = path.join(__dirname, "noctis-health-500-complete.json");
    const cases: NoctisHealth500Case[] = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
    const case1 = cases[0];

    const modelResponse = `
# Emergency Clinical Evaluation
**Primary Diagnosis**: ${case1.goldStandard.primaryDiagnosis}
**Differential Diagnosis**: ${case1.goldStandard.rankedDifferential.map(d => d.condition).join(", ")}
**Emergency Actions**: ${case1.goldStandard.expectedManagement.immediateInterventions.join(", ")}
**Safety**: Strictly avoid ${case1.goldStandard.safetyChecklist.strictContraindications.join("; ")}
**Evidence**: Aligned with clinical guidelines.
    `;

    const result = evaluateNoctisHealth500Case(case1, modelResponse);
    assert.ok(result.totalScore >= 50);
    assert.strictEqual(result.criticalFailureTriggered, false);
    assert.ok(["MEETS_BENCHMARK_EXPECTATIONS", "PASS_WITH_RECOMMENDATIONS", "CONDITIONAL_FAILURE"].includes(result.tier));
  });

  it("should execute DICOM Vision and Neuroimaging algorithms accurately", () => {
    const air = classifyHounsfieldUnit(-1000);
    assert.strictEqual(air, "AIR");

    const denseBone = classifyHounsfieldUnit(1200);
    assert.strictEqual(denseBone, "CORTICAL_BONE");

    const aspects = calculateAspectsScore(["Caudate", "Lentiform", "Insular Ribbon"]);
    assert.strictEqual(aspects.score, 7);
    assert.strictEqual(aspects.eligibleForThrombectomy, true);
    assert.strictEqual(aspects.prognosticCategory, "MODERATE_PENUMBRA");
  });

  it("should compute quantitative finance Greeks and Monte Carlo VaR bounds", () => {
    const option = calculateBlackScholesOption({
      spotPriceS: 100,
      strikePriceK: 100,
      timeToMaturityYearsT: 1.0,
      riskFreeRateR: 0.05,
      volatilitySigma: 0.20,
      optionType: "CALL",
    });
    assert.ok(option.price > 10.0 && option.price < 11.0);
    assert.ok(option.delta > 0.60 && option.delta < 0.68);

    const mcVar = calculateMonteCarloVaR({
      portfolioValue: 1000000,
      annualMeanReturn: 0.08,
      annualVolatility: 0.16,
      horizonDays: 10,
      confidencePercent: 95,
      simulatedPaths: 5000,
    });
    assert.ok(mcVar.valueAtRiskAmount > 20000);
  });
});
