import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyGeomagneticStormScale,
  computeAsteroidImpactEnergy,
  computeExoplanetHabitableZone,
  computeHohmannTransfer,
  computeOrbitalMechanics,
  estimateAsteroidDiameterMeters,
} from "./noctis-space-universe.server.ts";
import {
  classifyUsAqi,
  computeSeismicMomentEnergy,
  computeTsunamiWaveSpeed,
} from "./noctis-earth-hazards.server.ts";
import {
  computeDensityAltitude,
  computeGreatCircle,
  computeRunwayWindComponents,
} from "./noctis-global-nav.server.ts";

test("Space & Universe deterministic orbital, Hohmann, impact, and habitable zone physics", () => {
  const leo = computeOrbitalMechanics(400);
  assert.ok(leo.circularVelocityKmS > 7.6 && leo.circularVelocityKmS < 7.75);
  assert.ok(leo.orbitalPeriodMin > 91 && leo.orbitalPeriodMin < 94);
  assert.ok(leo.escapeVelocityKmS > 10.7 && leo.escapeVelocityKmS < 11.0);

  const hohmann = computeHohmannTransfer(400, 35786);
  assert.ok(hohmann.totalDeltaVKmS > 3.8 && hohmann.totalDeltaVKmS < 4.0);
  assert.ok(hohmann.transferTimeHr > 5.0 && hohmann.transferTimeHr < 5.5);

  const d = estimateAsteroidDiameterMeters(20.0);
  assert.ok(d > 250 && d < 450);

  const impact = computeAsteroidImpactEnergy(100, 20, 3000);
  assert.ok(impact.energyMegatonsTnt > 65 && impact.energyMegatonsTnt < 85);

  const hz = computeExoplanetHabitableZone(1.0);
  assert.ok(hz.conservativeInnerAu > 0.9 && hz.conservativeInnerAu < 1.0);
  assert.ok(hz.conservativeOuterAu > 1.6 && hz.conservativeOuterAu < 1.75);

  assert.equal(classifyGeomagneticStormScale(2.3).gScale, "G0");
  assert.equal(classifyGeomagneticStormScale(5.2).gScale, "G1");
  assert.equal(classifyGeomagneticStormScale(7.1).gScale, "G3");
  assert.equal(classifyGeomagneticStormScale(9.0).gScale, "G5");
});

test("Earth Hazards deterministic seismic, tsunami, and AQI classifications", () => {
  const m5 = computeSeismicMomentEnergy(5.0);
  const m7 = computeSeismicMomentEnergy(7.0);
  const ratio = m7.radiatedEnergyJoules / m5.radiatedEnergyJoules;
  assert.ok(ratio > 999 && ratio < 1001, "Each +2.0 magnitude step must release 1000x energy");

  const tsu = computeTsunamiWaveSpeed(4000, 1200);
  assert.ok(tsu.waveSpeedMs > 195 && tsu.waveSpeedMs < 201);
  assert.ok(tsu.waveSpeedKmH > 700 && tsu.waveSpeedKmH < 725);
  assert.ok(tsu.etaHours > 1.6 && tsu.etaHours < 1.8);

  assert.equal(classifyUsAqi(32).category, "Good");
  assert.equal(classifyUsAqi(125).category, "Unhealthy for Sensitive Groups");
  assert.equal(classifyUsAqi(340).category, "Hazardous");
});

test("Global Navigation great-circle, runway wind components, and density altitude", () => {
  // KJFK (40.6413, -73.7781) -> EGLL (51.47, -0.4543)
  const gc = computeGreatCircle(40.6413, -73.7781, 51.47, -0.4543);
  assert.ok(gc.distanceKm > 5500 && gc.distanceKm < 5580);
  assert.ok(gc.distanceNm > 2970 && gc.distanceNm < 3020);
  assert.ok(gc.estJetHours460Kt > 6.3 && gc.estJetHours460Kt < 6.7);

  // Direct 90-degree right crosswind on runway 360 (North) from wind 090 @ 20 kt
  const cwRight = computeRunwayWindComponents(90, 20, 360);
  assert.ok(cwRight.crosswindKt > 19.9 && cwRight.crosswindKt <= 20.0);
  assert.equal(cwRight.crosswindSide, "Right");
  assert.ok(Math.abs(cwRight.headwindKt) < 0.01);

  // Direct headwind on runway 270 from wind 270 @ 15 kt
  const hw = computeRunwayWindComponents(270, 15, 270);
  assert.ok(hw.headwindKt > 14.9 && hw.headwindKt <= 15.0);
  assert.equal(hw.crosswindSide, "Calm");

  // Hot/high day density altitude
  const da = computeDensityAltitude(5000, 29.92, 30);
  assert.ok(da.densityAltitudeFt > 7500 && da.densityAltitudeFt < 8500);
});
