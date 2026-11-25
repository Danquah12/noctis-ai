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
  extractRoutePair,
} from "./noctis-global-nav.server.ts";
import { dispatchUniversalLifeQuery } from "./noctis-universal-life-router.ts";
import {
  computeFisherRealYield,
  computeParametricVaR,
  convertCurrencyAmount,
} from "./noctis-global-markets.server.ts";
import {
  computeDomarDebtTrajectory,
  computeGrowthDoublingYears,
  resolveCountryIso3,
} from "./noctis-world-intel.server.ts";
import {
  formatApaCitation,
  formatBibtexCitation,
  parseArxivAtomXml,
} from "./noctis-papers-intel.server.ts";

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

  // Repeated ICAO codes before destination must deduplicate cleanly
  const pair1 = extractRoutePair(
    "Live METAR for KJFK with runway 31L crosswind and great-circle flight distance from KJFK to EGLL",
  );
  assert.equal(pair1?.origin.code, "KJFK");
  assert.equal(pair1?.dest.code, "EGLL");

  const pair2 = extractRoutePair("KJFK METAR and KJFK to EGLL");
  assert.equal(pair2?.origin.code, "KJFK");
  assert.equal(pair2?.dest.code, "EGLL");
});

test("Option A: /omni custom numeric parameter extraction updates solver results and runs Taylor Rule", () => {
  const civilA = dispatchUniversalLifeQuery("Calculate ASCE 7 seismic base shear with Sds=1.8 weight=80000 kips R=6");
  const civilB = dispatchUniversalLifeQuery("Calculate ASCE 7 seismic base shear with Sds=0.6 weight=20000 kips R=8");
  assert.notEqual(civilA.response, civilB.response);
  assert.ok(civilA.response.includes("80,000"));
  assert.ok(civilB.response.includes("20,000"));

  const acousticsA = dispatchUniversalLifeQuery("Evaluate Sabine RT60 architectural acoustics volume 850 m3 sabin 420");
  assert.ok(acousticsA.response.includes("850"));
  assert.ok(acousticsA.response.includes("420"));

  const hydro = dispatchUniversalLifeQuery("Evaluate Manning open channel flow width 12 m depth 3.5 m slope 0.004 manning 0.014");
  assert.ok(hydro.response.includes("Width=12 m"));

  const quantum = dispatchUniversalLifeQuery("Surface code quantum error correction distance d=11 error rate 0.002");
  assert.ok(quantum.response.includes("d=11"));

  const macro = dispatchUniversalLifeQuery("Evaluate Taylor rule interest rate inflation 4.5% target 2.0% output gap 1.2%");
  assert.equal(macro.domain, "MACROECONOMICS_FINANCE");
  assert.ok(macro.response.includes("TAYLOR_MONETARY_POLICY_RATE_RECOMMENDED"));
});

test("Option B: Markets, World Intel & Papers deterministic math and XML/citation formatters", () => {
  assert.equal(convertCurrencyAmount(1000, 1, 15.5), 15500);

  const fisher = computeFisherRealYield(8, 3);
  assert.ok(fisher.exactRealPct > 4.84 && fisher.exactRealPct < 4.86);
  assert.equal(fisher.approxRealPct, 5);

  const var99 = computeParametricVaR(1_000_000, 18, 10, 99);
  assert.ok(var99.varUsd > 80_000 && var99.varUsd < 86_000);

  assert.equal(resolveCountryIso3("Ghana GDP and inflation").iso3, "GHA");
  assert.equal(resolveCountryIso3("Nigeria CPI inflation").iso3, "NGA");
  assert.equal(resolveCountryIso3("United Kingdom economic output").iso3, "GBR");

  const domarSteady = computeDomarDebtTrajectory(70, 4, 4, 0);
  assert.equal(domarSteady.deltaDebtPct, 0);
  const dbl = computeGrowthDoublingYears(7.0);
  assert.ok(dbl > 10.1 && dbl < 10.4);

  const sampleXml = `<feed><entry><id>http://arxiv.org/abs/2601.01234v1</id><published>2026-01-10T00:00:00Z</published><title>Quantum Surface Codes</title><summary>Abstract text here.</summary><author><name>Alice Smith</name></author></entry></feed>`;
  const parsed = parseArxivAtomXml(sampleXml);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]!.id, "arXiv:2601.01234v1");
  assert.ok(formatApaCitation(parsed[0]!).includes("Alice Smith (2026)"));
  assert.ok(formatBibtexCitation(parsed[0]!).includes("@article{alice2026"));
});
