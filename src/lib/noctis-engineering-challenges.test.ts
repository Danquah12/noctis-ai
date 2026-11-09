import test from "node:test";
import assert from "node:assert/strict";
import {
  solveSmartCity001,
  solveSpacecraftTrajectory002,
  solveSmrThermalHydraulics003,
  solveSemiconductorCleanroom004,
  solveHypersonicAeroheating005,
} from "./noctis-engineering-challenges.ts";

test("NOCTIS MULTIDISCIPLINARY HARD ENGINEERING CHALLENGES (NEC-001..005)", async (t) => {
  await t.test("Challenge 001: Computes exact smart city energy, solar, storage, and water balances", () => {
    const city = solveSmartCity001();
    assert.equal(city.dailyElectricityDemandMWh, 725);
    assert.equal(city.requiredSolarCapacityMW, 170.59);
    assert.equal(city.batteryCapacityFor30DaysMWh, 24166.67);
    assert.equal(city.dailyWaterDemandM3, 15000);
    assert.equal(city.waterStorage30DaysM3, 450000);
    assert.equal(city.dailyFoodCaloriesKcal, 240000000);
    assert.equal(city.annualFoodCaloriesKcal, 87600000000);
    assert.equal(city.independentAuditFeasibility, "CONDITIONALLY_FEASIBLE");
  });

  await t.test("Challenge 002: Calculates orbital Hohmann delta-v and ion propulsion Xenon mass", () => {
    const space = solveSpacecraftTrajectory002({ dryMassKg: 2000, ionEngineIspSec: 3500 });
    assert.equal(space.earthMarsDeltaVTotalKmS, 5.594);
    assert.ok(space.transferTimeDays > 250 && space.transferTimeDays < 265);
    // Tsiolkovsky mass check: m0 = 2000 * exp(5594 / (3500 * 9.80665)) ~ 2353.4 kg
    assert.ok(space.initialMassKg > 2300 && space.initialMassKg < 2400);
    assert.ok(space.xenonPropellantMassKg > 300 && space.xenonPropellantMassKg < 400);
  });

  await t.test("Challenge 003: Computes SMR passive decay heat curve and natural circulation flow", () => {
    const smr = solveSmrThermalHydraulics003({ coreThermalPowerMWth: 300 });
    assert.equal(smr.coreThermalPowerMWth, 300);
    assert.ok(smr.decayHeat1HourMWth < 5.0 && smr.decayHeat1HourMWth > 3.0);
    assert.ok(smr.decayHeat24HoursMWth < smr.decayHeat1HourMWth);
    assert.ok(smr.naturalCirculationFlowRateKgS > 25);
    assert.ok(smr.dnbrSafetyMargin > 1.30);
    assert.equal(smr.passiveCoolingAdequate, true);
  });

  await t.test("Challenge 004: Verifies 2nm semiconductor ISO Class 1 HVAC and VC-G vibration", () => {
    const fab = solveSemiconductorCleanroom004();
    assert.equal(fab.airChangesPerHour, 600);
    assert.equal(fab.ceilingUlpaCoveragePercent, 100);
    assert.equal(fab.laminarAirVelocityMs, 0.45);
    assert.equal(fab.targetVibrationRmsUmS, 0.78);
    assert.equal(fab.vibrationCriterionMet, true);
  });

  await t.test("Challenge 005: Calculates Mach 7.5 aeroheating and radiative equilibrium UHTC temperature", () => {
    const hypersonic = solveHypersonicAeroheating005({ mach: 7.5 });
    assert.equal(hypersonic.machNumber, 7.5);
    assert.equal(hypersonic.stagnationHeatFluxMWm2, 2.45);
    assert.ok(hypersonic.radiativeEquilibriumTempCelsius > 2000);
    assert.ok(hypersonic.radiativeEquilibriumTempCelsius < 2500);
    assert.equal(hypersonic.thermalProtectionFeasible, true);
    assert.ok(hypersonic.uhtcMaterialRecommended.includes("ZrB2"));
  });
});
