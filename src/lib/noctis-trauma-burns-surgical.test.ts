import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSevereBurnResuscitation,
  evaluateAbdominalCompartmentSyndrome,
  evaluateTensionPneumoAndPelvicTrauma,
  handleNaturalTraumaBurnsQuery,
} from "./noctis-trauma-burns-surgical.ts";

test("NOCTIS-TRAUMA-BURNS-001: Severe burns calculates Parkland formula, splits 50/50, and checks fluid creep", () => {
  // 70 kg patient with 50% TBSA burn, 2 hours elapsed since burn
  // Total 24h = 3.0 * 70 * 50 = 10,500 mL
  // First 8h = 5,250 mL; remaining 16h = 5,250 mL
  // Adjusted rate for 6 hours remaining in first 8 = (5250 - 1000) / 6 = 708 mL/hr
  const res = evaluateSevereBurnResuscitation({
    patientWeightKg: 70,
    totalBodySurfaceAreaBurnPercent: 50,
    hoursSinceBurnInjury: 2,
    crystalloidInfusedSoFarMl: 1000,
    urineOutputMlPerHour: 35,
    inhalationInjurySuspected: false,
    electricalBurnWithMyoglobinuria: false,
  });

  assert.strictEqual(res.totalCalculatedParkland24hVolumeMl, 10500);
  assert.strictEqual(res.first8HoursVolumeMl, 5250);
  assert.strictEqual(res.remaining16HoursVolumeMl, 5250);
  assert.strictEqual(res.adjustedRateForTimeElapsedMlHr, 708);
  assert.ok(res.urineOutputEndpointTarget.includes("0.5 mL/kg/h"));
});

test("NOCTIS-TRAUMA-BURNS-001: ACS detects Grade III IAH with new organ failure and mandates decompression", () => {
  // IAP 24 mmHg, MAP 75 mmHg -> APP = 51 mmHg (< 60 -> compromised)
  // Urine output 15 mL/h in 70kg patient = 0.21 mL/kg/h (< 0.5 -> acute oliguria)
  const res = evaluateAbdominalCompartmentSyndrome({
    patientWeightKg: 70,
    intraAbdominalPressureMmHg: 24,
    meanArterialPressureMmHg: 75,
    peakAirwayPressureCmH2O: 38,
    urineOutputMlPerHour: 15,
  });

  assert.strictEqual(res.intraAbdominalHypertensionGrade, "GRADE_III");
  assert.strictEqual(res.abdominalCompartmentSyndromePresent, true);
  assert.strictEqual(res.abdominalPerfusionPressureMmHg, 51);
  assert.strictEqual(res.appTargetMet, false);
  assert.strictEqual(res.surgicalDecompressionIndicated, true);
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-TRAUMA-004") && v.includes("DECOMPRESSION")));
});

test("NOCTIS-TRAUMA-BURNS-001: Tension pneumothorax vetoes waiting for chest X-ray", () => {
  const res = evaluateTensionPneumoAndPelvicTrauma({
    clinicalScenario: "TENSION_PNEUMOTHORAX",
    systolicBpMmHg: 78,
    heartRateBpm: 132,
    trachealDeviation: true,
    absentUnilateralBreathSounds: true,
    severeHypoxemia: true,
    pelvicRingInstability: false,
    proposedAction: "Wait 15 minutes for portable chest x-ray to confirm before decompressing",
  });

  assert.strictEqual(res.actionAuthorization, "VETOED_HAZARDOUS");
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-TRAUMA-001") && v.includes("IMAGING DELAY")));
  assert.ok(res.immediateInterventionDirectives.some((d) => d.includes("finger thoracostomy")));
});

test("NOCTIS-TRAUMA-BURNS-001: Natural language routing resolves Burns, ACS, and Tension Trauma", () => {
  const burnQuery = "Calculate Parkland formula for 70 kg patient with 40% TBSA thermal burn at 2 hours post-injury.";
  const burnRes = handleNaturalTraumaBurnsQuery(burnQuery);
  assert.ok(burnRes);
  assert.ok(burnRes.includes("NOCTIS-TRAUMA-BURNS-001"));
  assert.ok(burnRes.includes("Parkland Fluid Calculations"));

  const acsQuery = "Patient with bladder pressure IAP 24, MAP 75, and acute oliguria. Calculate APP and determine decompressive laparotomy.";
  const acsRes = handleNaturalTraumaBurnsQuery(acsQuery);
  assert.ok(acsRes);
  assert.ok(acsRes.includes("Abdominal Perfusion Pressure"));
  assert.ok(acsRes.includes("EMERGENT SURGICAL INTERVENTION"));

  const pneumoQuery = "Severe hypoxemic trauma patient with absent breath sounds and tracheal deviation, wait for x-ray before needle decompression?";
  const pneumoRes = handleNaturalTraumaBurnsQuery(pneumoQuery);
  assert.ok(pneumoRes);
  assert.ok(pneumoRes.includes("VETOED_HAZARDOUS"));
  assert.ok(pneumoRes.includes("CF-TRAUMA-001"));
});
