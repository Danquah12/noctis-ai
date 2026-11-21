import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateQtcIntervals,
  evaluateHyperkalemiaEcg,
  evaluateDigoxinEcg,
  digitize12LeadEcg,
} from "./noctis-ecg-vision.ts";

test("Noctis ECG Vision: QTc calculation using Bazett and Fridericia", () => {
  // HR = 60 bpm -> RR = 1000 ms = 1.0 sec -> QTc = QT
  const norm = calculateQtcIntervals(400, 1000, "male");
  assert.equal(norm.qtcBazettMs, 400);
  assert.equal(norm.qtcFridericiaMs, 400);
  assert.equal(norm.isQtcProlonged, false);

  // Bradycardia: HR = 30 bpm -> RR = 2000 ms = 2.0 sec -> QT = 500 ms
  // Bazett: 500 / sqrt(2) = 500 / 1.414 = 354 ms
  const brady = calculateQtcIntervals(500, 2000, "male");
  assert.equal(brady.qtcBazettMs, 354);
  assert.equal(brady.isQtcProlonged, false);

  // Prolonged QTc: HR = 100 bpm -> RR = 600 ms = 0.6 sec -> QT = 420 ms
  // Bazett: 420 / sqrt(0.6) = 420 / 0.7746 = 542 ms (> 450 ms)
  const tachy = calculateQtcIntervals(420, 600, "male");
  assert.equal(tachy.qtcBazettMs, 542);
  assert.equal(tachy.isQtcProlonged, true);
});

test("Noctis ECG Vision: Hyperkalemia Stage 1 to 4 electrophysiological progression", () => {
  // Stage 1: Peaked T waves only, normal QRS
  const stage1 = evaluateHyperkalemiaEcg({
    qrsDurationMs: 90,
    hasPeakedTWaves: true,
    hasFlattenedOrAbsentPWaves: false,
    serumPotassiumMmolL: 5.8,
  });
  assert.equal(stage1.severityStage, "STAGE_1_PEAKED_T");
  assert.equal(stage1.membraneStabilizationRequired, false);

  // Stage 3: QRS widening (154 ms) + Peaked T waves (ICU Case)
  const stage3 = evaluateHyperkalemiaEcg({
    qrsDurationMs: 154,
    hasPeakedTWaves: true,
    hasFlattenedOrAbsentPWaves: true,
    serumPotassiumMmolL: 7.3,
  });
  assert.equal(stage3.severityStage, "STAGE_3_QRS_WIDENING");
  assert.equal(stage3.membraneStabilizationRequired, true);
  assert.match(stage3.clinicalActionDirective, /IV Calcium/i);

  // Stage 4: Critical Sine Wave pre-arrest
  const stage4 = evaluateHyperkalemiaEcg({
    qrsDurationMs: 220,
    hasPeakedTWaves: false,
    hasFlattenedOrAbsentPWaves: true,
    hasSineWavePattern: true,
    serumPotassiumMmolL: 8.9,
  });
  assert.equal(stage4.severityStage, "STAGE_4_SINE_WAVE_PRE_ARREST");
  assert.equal(stage4.membraneStabilizationRequired, true);
});

test("Noctis ECG Vision: Digoxin toxicity detection and Salvador Dali ST morphology", () => {
  // Digoxin effect only: scooped ST depression without conduction block
  const effect = evaluateDigoxinEcg({
    heartRateBpm: 72,
    hasStScooping: true,
    hasSlowAtrialFibrillation: false,
    isJunctionalEscape: false,
  });
  assert.equal(effect.suspectedDigoxinEffect, true);
  assert.equal(effect.suspectedDigoxinToxicity, false);

  // Severe toxicity: Junctional escape with profound bradycardia (HR 29 bpm) + high level
  const tox = evaluateDigoxinEcg({
    heartRateBpm: 29,
    hasStScooping: true,
    hasSlowAtrialFibrillation: false,
    isJunctionalEscape: true,
    serumDigoxinNgMl: 3.6,
  });
  assert.equal(tox.suspectedDigoxinToxicity, true);
  assert.equal(tox.recommendDigiFabConsideration, true);

  // Pathognomonic bidirectional VT
  const bvt = evaluateDigoxinEcg({
    heartRateBpm: 140,
    hasStScooping: false,
    hasSlowAtrialFibrillation: false,
    isJunctionalEscape: false,
    hasBidirectionalVt: true,
  });
  assert.equal(bvt.hasBidirectionalVt, true);
  assert.equal(bvt.recommendDigiFabConsideration, true);
});

test("Noctis ECG Vision: Full 12-Lead Digitization of 78yo Complex BRASH & Digoxin ICU Case", () => {
  const ecg = digitize12LeadEcg({
    heartRateBpm: 29,
    qrsDurationMs: 154,
    prIntervalMs: null, // absent due to junctional bradycardia
    hasPeakedTWaves: true,
    hasFlattenedOrAbsentPWaves: true,
    hasStScooping: true,
    serumPotassiumMmolL: 7.3,
    serumDigoxinNgMl: 3.6,
    gender: "male",
  });

  assert.equal(ecg.intervals.heartRateBpm, 29);
  assert.equal(ecg.intervals.qrsDurationMs, 154);
  assert.equal(ecg.intervals.isQrsWidened, true);
  assert.equal(ecg.rhythmClassification, "JUNCTIONAL_BRADYCARDIA");
  assert.equal(ecg.hyperkalemia.severityStage, "STAGE_3_QRS_WIDENING");
  assert.equal(ecg.hyperkalemia.membraneStabilizationRequired, true);
  assert.equal(ecg.digoxin.suspectedDigoxinToxicity, true);
  assert.equal(ecg.digoxin.recommendDigiFabConsideration, true);
  assert.ok(ecg.diagnosticStatements.length >= 4);
});
