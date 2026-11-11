import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateMassiveTransfusion,
  evaluateViscoelasticAssay,
  evaluateHit4TsScore,
  evaluateIsthDicScore,
  handleNaturalHematologyHemostasisQuery,
} from "./noctis-icu-hematology-hemostasis.ts";

test("NOCTIS-HEM-TRANS-001: MTP calculates ABC score, recommends 1:1:1, trips hypocalcemia & delayed TXA vetoes", () => {
  // Penetrating, SBP 85, HR 125, FAST positive -> ABC = 4
  // Shock index = 125 / 85 = 1.47
  // iCa = 0.95 (< 1.1 -> trips CF-HEM-001)
  // Hours since injury = 4.0 (> 3.0 -> trips CF-HEM-003)
  const res = evaluateMassiveTransfusion({
    patientWeightKg: 80,
    penetratingTrauma: true,
    systolicBpMmHg: 85,
    heartRateBpm: 125,
    positiveFastExam: true,
    hoursSinceInjury: 4.0,
    unitsPrbcTransfused: 6,
    unitsFfpTransfused: 4,
    unitsPlateletsTransfused: 1,
    crystalloidInfusedLiters: 2.0, // > 1.5 -> trips CF-HEM-004
    systemicIonizedCalciumMmolL: 0.95,
    bodyTemperatureCelsius: 35.0,
    arterialPh: 7.20,
    fibrinogenMgDl: 110,
  });

  assert.strictEqual(res.abcScore, 4);
  assert.strictEqual(res.mtpActivated, true);
  assert.strictEqual(res.txaRecommendation.indicated, false); // > 3h
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-HEM-001") && v.includes("HYPOCALCEMIA")));
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-HEM-003") && v.includes("TXA DELAYED")));
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-HEM-004") && v.includes("EXCESSIVE CRYSTALLOID")));
});

test("NOCTIS-HEM-TRANS-001: TEG differentiates clotting factor deficiency, low fibrinogen, and hyperfibrinolysis", () => {
  const res = evaluateViscoelasticAssay({
    assayType: "TEG_6S",
    rTimeMinutes: 14.0, // > 10 min -> FFP/PCC
    alphaAngleDegrees: 45.0, // < 53 deg -> Cryo
    maximumAmplitudeMm: 38.0, // < 50 mm -> Platelets
    ly30Percent: 8.5, // > 3.0% -> TXA
  });

  assert.ok(res.detectedCoagulopathies.some((c) => c.includes("Prolonged R-Time")));
  assert.ok(res.detectedCoagulopathies.some((c) => c.includes("Decreased Alpha Angle")));
  assert.ok(res.detectedCoagulopathies.some((c) => c.includes("Depressed Maximum Amplitude")));
  assert.ok(res.detectedCoagulopathies.some((c) => c.includes("Hyperfibrinolysis")));
  assert.ok(res.targetedBloodProducts.some((p) => p.includes("Fresh Frozen Plasma")));
  assert.ok(res.targetedBloodProducts.some((p) => p.includes("Cryoprecipitate")));
  assert.ok(res.antifibrinolyticDirective?.includes("Tranexamic Acid"));
});

test("NOCTIS-HEM-TRANS-001: HIT 4Ts scores high probability and trips Warfarin gangrene veto", () => {
  const res = evaluateHit4TsScore({
    thrombocytopeniaDropCategory: "DROP_GT_50_PERCENT_NADIR_GE_20", // 2
    timingOfPlateletDrop: "DAYS_5_TO_10", // 2
    thrombosisIdentified: "NEW_THROMBOSIS_OR_SKIN_NECROSIS", // 2
    otherCausesOfThrombocytopenia: "NO_OTHER_CAUSE", // 2
    warfarinActiveOrOrdered: true, // Trips CF-HEM-002
  });

  assert.strictEqual(res.totalScore, 8);
  assert.strictEqual(res.pretestProbability, "HIGH_PROBABILITY");
  assert.ok(res.immediateAnticoagulationDirectives.some((d) => d.includes("Argatroban")));
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-HEM-002") && v.includes("WARFARIN GANGRENE")));
});

test("NOCTIS-HEM-TRANS-001: ISTH scoring identifies overt DIC", () => {
  const res = evaluateIsthDicScore({
    underlyingDisorderKnownToCauseDic: true,
    plateletCount10e9L: 40, // 2 pts (< 50)
    dDimerFdpLevel: "STRONG_INCREASE", // 3 pts
    prothrombinTimeProlongationSeconds: 6.5, // 2 pts (> 6s)
    fibrinogenLevelMgDl: 80, // 1 pt (< 100)
  });

  assert.strictEqual(res.isthScore, 8);
  assert.strictEqual(res.diagnosticOutcome, "OVERT_DIC_COMPATIBLE");
});

test("NOCTIS-HEM-TRANS-001: Natural language query routing tests", () => {
  const mtpQuery = "Trauma patient with penetrating wound, SBP 85, HR 125, positive FAST at 1.5 hours post-injury. Calculate ABC score and MTP ratio.";
  const mtpRes = handleNaturalHematologyHemostasisQuery(mtpQuery);
  assert.ok(mtpRes);
  assert.ok(mtpRes.includes("NOCTIS-HEM-TRANS-001"));
  assert.ok(mtpRes.includes("ABC Score:** 4/4"));
  assert.ok(mtpRes.includes("1:1:1"));

  const tegQuery = "Trauma TEG tracing shows R time 12.5 min, MA 42 mm, LY30 7.5%. What blood products and antifibrinolytics are indicated?";
  const tegRes = handleNaturalHematologyHemostasisQuery(tegQuery);
  assert.ok(tegRes);
  assert.ok(tegRes.includes("Fresh Frozen Plasma"));
  assert.ok(tegRes.includes("Tranexamic Acid"));

  const hitQuery = "Patient on heparin for 7 days has platelet count drop from 250k to 60k with new deep vein thrombosis on warfarin. Calculate 4Ts score.";
  const hitRes = handleNaturalHematologyHemostasisQuery(hitQuery);
  assert.ok(hitRes);
  assert.ok(hitRes.includes("HIGH_PROBABILITY"));
  assert.ok(hitRes.includes("WARFARIN GANGRENE"));
});
