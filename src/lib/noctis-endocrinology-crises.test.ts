import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDkaHhs,
  evaluateThyroidStorm,
  evaluateMyxedemaComa,
  evaluatePheochromocytoma,
  handleNaturalEndocrinologyQuery,
} from "./noctis-endocrinology-crises.ts";

describe("NOCTIS-ENDO-CRISIS-001: Critical Care Endocrinology & Endocrine Crises Engine", () => {
  it("enforces CF-ENDO-001 hypokalemic insulin arrest veto when K+ < 3.3 mEq/L", () => {
    const res = evaluateDkaHhs({
      serumGlucoseMgdl: 580,
      measuredSodiumMeq: 130,
      serumPotassiumMeq: 2.9, // Severe hypokalemia!
      serumChlorideMeq: 95,
      serumBicarbMeq: 8,
      arterialPh: 7.12,
      mentalStatus: "DROWSY",
      insulinOrderActive: true,
    });

    assert.equal(res.engineId, "NOCTIS-ENDO-CRISIS-001");
    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ENDO-001/);
    assert.match(res.safetyVetoesTriggered[0], /HOLD ALL INSULIN STAT/);
    // Corrected Na: 130 + 2.0 * (480 / 100) = 139.6
    assert.equal(res.calculations.correctedSodiumMeq, 139.6);
  });

  it("enforces CF-ENDO-002 two-bag dextrose transition veto when glucose < 200 mg/dL", () => {
    const res = evaluateDkaHhs({
      serumGlucoseMgdl: 180,
      measuredSodiumMeq: 138,
      serumPotassiumMeq: 4.2,
      serumChlorideMeq: 104,
      serumBicarbMeq: 14,
      arterialPh: 7.28,
      mentalStatus: "ALERT",
      insulinOrderActive: true,
      glucoseBelow200WithoutDextrose: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ENDO-002/);
    assert.match(res.safetyVetoesTriggered[0], /Two-Bag System/);
  });

  it("evaluates Burch-Wartofsky score and enforces CF-ENDO-003 iodine before thionamide veto in thyroid storm", () => {
    const res = evaluateThyroidStorm({
      temperatureCelsius: 39.8, // +25
      heartRateBpm: 142, // +25
      cnsEffects: "DELIRIUM_PSYCHOSIS", // +20
      giHepatic: "DIARRHEA_NAUSEA", // +10
      atrialFibrillationPresent: true, // +10
      heartFailureStage: "MODERATE_EDEMA", // +10 -> Total = 100
      thionamideAdministered: false,
      iodineAdministeredBeforeThionamide: true,
      hydrocortisoneAdministered: true,
    });

    assert.equal(res.calculations.bwpsScore, 100);
    assert.equal(res.calculations.riskInterpretation, "HIGHLY_SUGGESTIVE_THYROID_STORM");
    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ENDO-003/);
    assert.match(res.safetyVetoesTriggered[0], /Jod-Basedow/);
    assert.match(res.safetyVetoesTriggered[0], /DELAY IODINE FOR AT LEAST 1 HOUR/);
  });

  it("enforces CF-ENDO-004 corticosteroid before thyroid replacement veto in myxedema coma", () => {
    const res = evaluateMyxedemaComa({
      hypothermiaCelsius: 31.8,
      alteredMentalStatus: true,
      hypoventilationHypercapnia: true,
      bradycardiaBpm: 38,
      stressDoseSteroidsGivenBeforeLevothyroxine: false,
      ivLevothyroxineOrdered: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ENDO-004/);
    assert.match(res.safetyVetoesTriggered[0], /Hydrocortisone 100 mg IV STAT BEFORE/);
  });

  it("enforces CF-ENDO-005 unopposed alpha crisis veto in pheochromocytoma", () => {
    const res = evaluatePheochromocytoma({
      systolicBpMmhg: 230,
      diastolicBpMmhg: 130,
      heartRateBpm: 120,
      alphaBlockerAdministered: false,
      betaBlockerMonotherapyOrdered: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ENDO-005/);
    assert.match(res.safetyVetoesTriggered[0], /UNOPPOSED ALPHA/);
    assert.match(res.safetyVetoesTriggered[0], /Phenoxybenzamine/);
  });

  it("handles natural query parsing for DKA with hypokalemic insulin danger", () => {
    const output = handleNaturalEndocrinologyQuery("Patient with DKA, blood glucose 550, K 2.8 mEq/L, starting insulin infusion");
    assert.ok(output);
    assert.match(output, /CF-ENDO-001/);
    assert.match(output, /HOLD ALL INSULIN STAT/);
  });
});
