import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateImpellaManagement,
  evaluateIabpManagement,
  evaluateEcprCandidacy,
  evaluateArrhythmiaEmergency,
  handleNaturalCardioMcsQuery,
} from "./noctis-cardiology-mcs.ts";

test("NOCTIS-CARDIO-MCS-001: Impella manages suction alarms, purge leaks, and trips bleeding veto", () => {
  const suctionRes = evaluateImpellaManagement({
    deviceType: "Impella CP",
    currentPLevel: "P-8",
    flowRateLpm: 0.9,
    purgePressureMmhg: 220, // Leak
    purgeFlowMlh: 14,
    suctionAlarmActive: true,
    cvpMmhg: 4,
    lactateMmol: 4.1,
    anticoagulationActive: true,
    activeBleeding: true, // Bleeding
  });

  assert.equal(suctionRes.engineId, "NOCTIS-CARDIO-MCS-001");
  assert.ok(suctionRes.safetyVetoesTriggered.some((v) => v.includes("CF-CARDIO-001"))); // Purge leak
  assert.ok(suctionRes.safetyVetoesTriggered.some((v) => v.includes("CF-CARDIO-003"))); // Active hemorrhage
  assert.ok(suctionRes.recommendations.some((r) => r.includes("Drop P-level by 2 steps")));
  assert.ok(suctionRes.recommendations.some((r) => r.includes("Preload Deficit Detected")));
});

test("NOCTIS-CARDIO-MCS-001: IABP vetoes severe aortic regurgitation, dissection, and early inflation", () => {
  const iabpRes = evaluateIabpManagement({
    currentRatio: "1:1",
    inflationTiming: "EARLY_INFLATION",
    deflationTiming: "NORMAL_PRESYS",
    aorticRegurgitationGrade: "SEVERE",
    aorticDissectionPresent: true,
  });

  assert.ok(iabpRes.safetyVetoesTriggered.some((v) => v.includes("CF-CARDIO-004"))); // Aortic dissection
  assert.ok(iabpRes.safetyVetoesTriggered.some((v) => v.includes("CF-CARDIO-005"))); // Aortic regurgitation
  assert.ok(iabpRes.safetyVetoesTriggered.some((v) => v.includes("CF-CARDIO-006"))); // Early inflation
});

test("NOCTIS-CARDIO-MCS-001: E-CPR identifies eligible candidate vs unwitnessed futility", () => {
  const goodCandidate = evaluateEcprCandidacy({
    witnessedArrest: true,
    bystanderCprPerformed: true,
    initialRhythm: "VF",
    noFlowMinutes: 2,
    cprMinutes: 25,
    endTidalCo2Mmhg: 24,
    patientAgeYears: 48,
    pupilsResponsive: true,
  });

  assert.equal(goodCandidate.safetyVetoesTriggered.length, 0);
  assert.ok(goodCandidate.recommendations.some((r) => r.includes("STRONG CANDIDATE FOR IMMEDIATE E-CPR")));

  const futileCandidate = evaluateEcprCandidacy({
    witnessedArrest: false,
    bystanderCprPerformed: false,
    initialRhythm: "ASYSTOLE",
    noFlowMinutes: 20,
    cprMinutes: 30,
    endTidalCo2Mmhg: 6,
    patientAgeYears: 78,
    pupilsResponsive: false,
  });

  assert.ok(futileCandidate.safetyVetoesTriggered.some((v) => v.includes("CF-CARDIO-008"))); // Unwitnessed prolonged no-flow
  assert.ok(futileCandidate.safetyVetoesTriggered.some((v) => v.includes("CF-CARDIO-009"))); // Low ETCO2
});

test("NOCTIS-CARDIO-MCS-001: Arrhythmia engine vetoes CCB in wide complex tachycardia and directs Torsades/Storm protocols", () => {
  const wctRes = evaluateArrhythmiaEmergency({
    rhythmType: "WCT",
    heartRateBpm: 195,
    hemodynamicallyStable: true,
    qrsDurationMs: 160,
    leadAvrInitialR: true,
    brugadaCriteriaPositive: true,
    calciumChannelBlockerProposed: true, // Veto!
  });

  assert.ok(wctRes.safetyVetoesTriggered.some((v) => v.includes("CF-CARDIO-010"))); // CCB veto

  const torsadesRes = evaluateArrhythmiaEmergency({
    rhythmType: "POLYMORPHIC_VT_TORSADES",
    heartRateBpm: 210,
    hemodynamicallyStable: false,
    qrsDurationMs: 180,
    qtcIntervalMs: 560,
    leadAvrInitialR: false,
    brugadaCriteriaPositive: true,
  });

  assert.ok(torsadesRes.recommendations.some((r) => r.includes("TORSADES DE POINTES")));
  assert.ok(torsadesRes.recommendations.some((r) => r.includes("Magnesium Sulfate 2.0 grams IV")));
  assert.ok(torsadesRes.recommendations.some((r) => r.includes("IMMEDIATE SYNCHRONIZED DIRECT-CURRENT CARDIOVERSION")));
});

test("NOCTIS-CARDIO-MCS-001: Natural language query routing tests", () => {
  const impellaQuery = handleNaturalCardioMcsQuery("An Impella CP is alarming for suction with low flow and CVP of 5 mmHg");
  assert.ok(impellaQuery && impellaQuery.includes("NOCTIS-CARDIO-MCS-001"));
  assert.ok(impellaQuery.includes("Drop P-level by 2 steps"));

  const iabpQuery = handleNaturalCardioMcsQuery("Patient with acute MI on IABP has severe aortic regurgitation and early inflation before dicrotic notch");
  assert.ok(iabpQuery && iabpQuery.includes("CF-CARDIO-005"));

  const ecprQuery = handleNaturalCardioMcsQuery("Can we cannulate for ECPR in a witnessed VF arrest with CPR for 28 minutes and ETCO2 22 mmHg?");
  assert.ok(ecprQuery && ecprQuery.includes("STRONG CANDIDATE FOR IMMEDIATE E-CPR"));
});
