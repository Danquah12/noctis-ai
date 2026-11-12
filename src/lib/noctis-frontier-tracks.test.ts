import { test, describe } from "node:test";
import assert from "node:assert";
import {
  evaluateSabatierIsruReactor,
  evaluateSatelliteConjunctionCdm,
  evaluateEuvLithographyDefect,
  evaluateSuperconductingQubitGate,
  evaluateSurgicalHapticTeleoperation,
  evaluateHospitalAmrNav,
  evaluateCrisprCasOffTarget,
  evaluateMrnaLnpFormulation,
  evaluateDsgeMacroeconomicShock,
  evaluateWholesaleCbdcSettlement,
  evaluateColregsAutonomousAvoidance,
  evaluateGreenAmmoniaMarinePropulsion,
  generateAllFrontierTrackScenarios,
} from "./noctis-frontier-tracks.ts";

describe("Noctis Frontier Tracks 1 to 6 Suite", () => {
  test("Track 1: Space Systems - Sabatier ISRU & Satellite Conjunction", () => {
    const isru = evaluateSabatierIsruReactor({
      co2FlowRateKgHr: 20,
      h2FlowRateKgHr: 20 * 0.182,
      reactorTempC: 350,
      reactorPressureBar: 3.5,
      catalystType: "RUTHENIUM_ALUMINA",
    });
    assert.strictEqual(isru.safetyVeto, false);
    assert.ok(isru.co2ConversionPercent >= 90);
    assert.ok(isru.methaneYieldKgHr > 0);
    assert.ok(isru.waterYieldKgHr > 0);

    // Hard temperature runaway veto
    const runaway = evaluateSabatierIsruReactor({
      co2FlowRateKgHr: 20,
      h2FlowRateKgHr: 20 * 0.182,
      reactorTempC: 480,
      reactorPressureBar: 3.5,
      catalystType: "RUTHENIUM_ALUMINA",
    });
    assert.strictEqual(runaway.safetyVeto, true);

    const cdm = evaluateSatelliteConjunctionCdm({
      primarySatId: "SAT-SOVEREIGN-01",
      secondaryObjectId: "DEBRIS-COSMOS-2251",
      missDistanceMeters: 85,
      probabilityOfCollisionPc: 3.2e-4,
      timeToClosestApproachSeconds: 14400,
      relativeVelocityKmS: 14.1,
    });
    assert.strictEqual(cdm.maneuverRequired, true);
    assert.ok(cdm.recommendedDeltaVMs > 0);
  });

  test("Track 2: Advanced Semiconductors & Quantum Systems", () => {
    const euv = evaluateEuvLithographyDefect({
      wavelengthNm: 13.5,
      numericalAperture: 0.55,
      processK1Factor: 0.33,
      pellicleTempC: 420,
      overlayErrorNm: 0.8,
    });
    assert.strictEqual(euv.safetyVeto, false);
    assert.strictEqual(euv.overlayAcceptable, true);
    assert.ok(euv.criticalDimensionResolutionNm < 10);

    const qubit = evaluateSuperconductingQubitGate({
      t1RelaxationTimeMicrosec: 140,
      t2DephasingTimeMicrosec: 160,
      czGatePulseDurationNs: 20,
      leakageToState2Prob: 0.0008,
    });
    assert.strictEqual(qubit.safetyVeto, false);
    assert.strictEqual(qubit.surfaceCodeFaultTolerantEligible, true);
    assert.ok(qubit.averageGateFidelityPercent >= 99.5);
  });

  test("Track 3: Surgical Robotics & Hospital AMRs", () => {
    const surg = evaluateSurgicalHapticTeleoperation({
      toolTipForceNewtons: 1.8,
      teleoperationLatencyMs: 16,
      tissueType: "BOWEL_WALL",
      tremorFilterSuppressionDb: 40,
    });
    assert.strictEqual(surg.safetyVeto, false);
    assert.strictEqual(surg.tissueTearRisk, false);

    // Latency veto (> 35ms)
    const laggy = evaluateSurgicalHapticTeleoperation({
      toolTipForceNewtons: 1.8,
      teleoperationLatencyMs: 45,
      tissueType: "BOWEL_WALL",
      tremorFilterSuppressionDb: 40,
    });
    assert.strictEqual(laggy.safetyVeto, true);

    const amr = evaluateHospitalAmrNav({
      obstacleDistanceMeters: 4.5,
      vehicleSpeedMs: 1.2,
      isEmergencyCodeBlueCorridor: false,
      lidarConfidenceScore: 0.99,
    });
    assert.strictEqual(amr.safetyVeto, false);
    assert.strictEqual(amr.evasiveAction, "PROCEED");
  });

  test("Track 4: Synthetic Biology & Genomic Engineering", () => {
    const crispr = evaluateCrisprCasOffTarget({
      targetDnaSequence: "GTCGTACTGACTGATCGATC",
      pamSequence: "TGG",
      offTargetCfdScore: 0.004,
      isTargetInTumorSuppressorGene: false,
    });
    assert.strictEqual(crispr.isPamValid, true);
    assert.strictEqual(crispr.safetyVeto, false);
    assert.strictEqual(crispr.cleavageSafetyGrade, "CLINICAL_GRADE");

    const lnp = evaluateMrnaLnpFormulation({
      nitrogenToPhosphateRatio: 6.0,
      polydispersityIndexPdi: 0.09,
      encapsulationEfficiencyPercent: 94.5,
      storageTempC: -80,
    });
    assert.strictEqual(lnp.safetyVeto, false);
    assert.strictEqual(lnp.formulationApproved, true);
    assert.strictEqual(lnp.lnpHomogeneityStatus, "MONODISPERSE_STABLE");
  });

  test("Track 5: Sovereign Macroeconomics & Wholesale CBDC", () => {
    const macro = evaluateDsgeMacroeconomicShock({
      neutralRealRatePercent: 1.0,
      currentInflationPercent: 2.4,
      targetInflationPercent: 2.0,
      realGdpGrowthPercent: 2.3,
      potentialGdpGrowthPercent: 2.0,
    });
    assert.strictEqual(macro.safetyVeto, false);
    assert.ok(macro.prescribedPolicyRatePercent > 0);

    const cbdc = evaluateWholesaleCbdcSettlement({
      senderBankBic: "CHASUS33",
      receiverBankBic: "BNPAFRPP",
      settlementAmountMillions: 50,
      liquidityReserveMillions: 1200,
      iso20022MessageType: "pacs.009",
    });
    assert.strictEqual(cbdc.safetyVeto, false);
    assert.strictEqual(cbdc.settlementStatus, "SETTLED_ATOMIC_DVP");
  });

  test("Track 6: Maritime Hydrodynamics & Green Marine Propulsion", () => {
    const colregs = evaluateColregsAutonomousAvoidance({
      ownShipHeadingDeg: 0,
      targetBearingDeg: 35,
      targetHeadingDeg: 260,
      targetSpeedKnots: 15,
      closestPointOfApproachNm: 0.8,
      timeToClosestApproachMinutes: 14,
    });
    assert.strictEqual(colregs.encounterGeometry, "CROSSING_RULE_15_GIVE_WAY");
    assert.strictEqual(colregs.actionRequired, true);

    const ammonia = evaluateGreenAmmoniaMarinePropulsion({
      ammoniaFuelRatioPercent: 85,
      pilotDieselRatioPercent: 15,
      engineLoadPercent: 80,
      scrDeNoxTempC: 350,
      unburntAmmoniaSlipPpm: 3.2,
    });
    assert.strictEqual(ammonia.safetyVeto, false);
    assert.ok(ammonia.co2ReductionPercent >= 75);
  });

  test("generates and verifies all 140 multi-track scenarios across Tracks 1 to 6", () => {
    const scenarios = generateAllFrontierTrackScenarios();
    assert.strictEqual(scenarios.length, 140);

    let passedInvariants = 0;
    for (const sc of scenarios) {
      const res = sc.evaluator();
      if (res.safetyVeto === sc.expectedSafetyVeto) {
        passedInvariants++;
      }
    }
    assert.strictEqual(passedInvariants, 140);
  });
});
