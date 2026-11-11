import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluatePreeclampsia,
  evaluatePph,
  evaluateMaternalCardiacArrest,
  handleNaturalObstetricsQuery,
} from "./noctis-obstetrics-critical-care.ts";

describe("NOCTIS-OB-CRIT-001: Critical Care Obstetrics Engine", () => {
  it("enforces CF-OB-001 fetal toxicity veto against ACEi/ARBs in pregnancy", () => {
    const res = evaluatePreeclampsia({
      gestationalAgeWeeks: 32,
      systolicBpMmhg: 175,
      diastolicBpMmhg: 112,
      symptoms: ["SEVERE_HEADACHE"],
      plateletCountK: 140,
      serumCreatinineMgdl: 0.9,
      astAltElevated: false,
      seizureActiveOrPostictal: false,
      magnesiumSulfateInfusing: true,
      antihypertensiveOrdered: "ACE_INHIBITOR",
    });

    assert.equal(res.engineId, "NOCTIS-OB-CRIT-001");
    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-OB-001/);
    assert.match(res.safetyVetoesTriggered[0], /FETAL TOXICITY ANTIHYPERTENSIVE VETO/);
  });

  it("enforces CF-OB-002 magnesium toxicity veto and calcium gluconate mandate", () => {
    const res = evaluatePreeclampsia({
      gestationalAgeWeeks: 34,
      systolicBpMmhg: 155,
      diastolicBpMmhg: 95,
      symptoms: [],
      plateletCountK: 180,
      serumCreatinineMgdl: 0.8,
      astAltElevated: false,
      seizureActiveOrPostictal: false,
      magnesiumSulfateInfusing: true,
      serumMagnesiumMeq: 9.4,
      patellarReflexLoss: true,
      respiratoryRate: 9,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-OB-002/);
    assert.match(res.safetyVetoesTriggered[0], /Calcium Gluconate 1 g IV/);
    assert.match(res.safetyVetoesTriggered[0], /STOP MAGNESIUM INFUSION/);
  });

  it("enforces CF-OB-003 Methergine hypertensive stroke veto in preeclampsia/hypertension", () => {
    const res = evaluatePph({
      estimatedBloodLossMl: 1200,
      uterineAtonyPresent: true,
      hypertensionPresent: true,
      asthmaOrBronchospasmPresent: false,
      uterotonicProposed: "METHERGINE",
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-OB-003/);
    assert.match(res.safetyVetoesTriggered[0], /METHERGINE HYPERTENSIVE STROKE VETO/);
  });

  it("enforces CF-OB-004 Carboprost fatal bronchospasm veto in asthma", () => {
    const res = evaluatePph({
      estimatedBloodLossMl: 1100,
      uterineAtonyPresent: true,
      hypertensionPresent: false,
      asthmaOrBronchospasmPresent: true,
      uterotonicProposed: "CARBOPROST_HEMABATE",
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-OB-004/);
    assert.match(res.safetyVetoesTriggered[0], /CARBOPROST FATAL BRONCHOSPASM VETO/);
  });

  it("enforces CF-OB-005 PMCD / Resuscitative Hysterotomy 4-minute rule in maternal arrest", () => {
    const res = evaluateMaternalCardiacArrest({
      gestationalAgeWeeks: 28,
      arrestDurationMinutes: 4.5,
      roscAchieved: false,
      uterineDisplacementManualActive: true,
      perimortemCesareanInitiated: false,
      afeSuspected: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-OB-005/);
    assert.match(res.safetyVetoesTriggered[0], /PMCD \/ RESUSCITATIVE HYSTEROTOMY 4-MINUTE MANDATE/);
    assert.ok(res.recommendations.some((r) => r.includes("A-OK")));
  });

  it("handles natural query parsing for PPH with Methergine in hypertensive patient", () => {
    const output = handleNaturalObstetricsQuery("Patient with postpartum hemorrhage and preeclampsia, ordered methergine for uterine atony");
    assert.ok(output);
    assert.match(output, /CF-OB-003/);
    assert.match(output, /METHERGINE HYPERTENSIVE STROKE VETO/);
  });
});
