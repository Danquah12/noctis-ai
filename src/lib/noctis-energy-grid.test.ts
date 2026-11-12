import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateFrequencyDroopResponse,
  evaluateBessSafety,
  evaluateAntiIslandingAndBlackStart,
  handleNaturalEnergyQuery,
} from "./noctis-energy-grid.ts";

describe("NOCTIS-ENERGY-GRID-001: Sovereign Energy & Smart Grid Resilience Engine", () => {
  it("calculates exact frequency droop response under grid under-frequency contingency", () => {
    const res = evaluateFrequencyDroopResponse({
      nominalFrequencyHz: 60,
      measuredFrequencyHz: 59.4, // -0.6 Hz deviation
      droopPercentageR: 0.04, // 4% droop
      generatorRatedPowerMw: 100,
      currentPowerMw: 60,
    });

    assert.equal(res.engineId, "NOCTIS-ENERGY-GRID-001");
    // deltaP_pu = - (-0.6 / 60) / 0.04 = 0.01 / 0.04 = 0.25 (25 MW increase)
    assert.equal(res.calculations.powerDeltaMw, 25.0);
    assert.equal(res.calculations.commandedPowerOutputMw, 85.0);
  });

  it("enforces CF-ENERGY-001 BESS thermal runaway veto when cell temperature >= 55 °C", () => {
    const res = evaluateBessSafety({
      bessRatedCapacityKwh: 1000,
      currentSocPercent: 75,
      cellMaxTemperatureCelsius: 58.2, // Overheating!
      chargeDischargeRateC: 1.0,
      coolingSystemOperational: true,
      isolationResistanceKohm: 200,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ENERGY-001/);
    assert.match(res.safetyVetoesTriggered[0], /BESS THERMAL RUNAWAY EMERGENCY VETO/);
    assert.match(res.safetyVetoesTriggered[0], /IMMEDIATELY OPEN DC CONTACTOR/);
  });

  it("enforces CF-ENERGY-004 IEEE 1547 anti-islanding 2.0s trip time mandate", () => {
    const res = evaluateAntiIslandingAndBlackStart({
      gridVoltageVolts: 0,
      nominalVoltageVolts: 480,
      gridConnected: false,
      gridPowerLossDetected: true,
      antiIslandingTripTimeSeconds: 2.8, // Exceeds 2.0s limit!
      blackStartGeneratorRunning: false,
      generatorSynchronizedWithBus: false,
      busVoltageDiffPercent: 0,
      busPhaseAngleDiffDegrees: 0,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ENERGY-004/);
    assert.match(res.safetyVetoesTriggered[0], /IEEE 1547 ANTI-ISLANDING TRIP TIME VETO/);
  });

  it("enforces CF-ENERGY-005 black-start out-of-phase breaker closure veto", () => {
    const res = evaluateAntiIslandingAndBlackStart({
      gridVoltageVolts: 0,
      nominalVoltageVolts: 480,
      gridConnected: false,
      gridPowerLossDetected: true,
      antiIslandingTripTimeSeconds: 0.8,
      blackStartGeneratorRunning: true,
      generatorSynchronizedWithBus: false,
      busVoltageDiffPercent: 12.0, // > 5% limit
      busPhaseAngleDiffDegrees: 25.0, // > 10 deg limit
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ENERGY-005/);
    assert.match(res.safetyVetoesTriggered[0], /OUT-OF-PHASE SYNCHRONIZATION BREAKER VETO/);
  });

  it("handles natural query parsing for BESS thermal runaway", () => {
    const output = handleNaturalEnergyQuery("BESS battery bank overheating at 58 degrees C with cooling offline");
    assert.ok(output);
    assert.match(output, /CF-ENERGY-001/);
    assert.match(output, /BESS THERMAL RUNAWAY EMERGENCY VETO/);
  });
});
