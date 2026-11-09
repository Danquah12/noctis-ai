import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateTtmResuscitation,
  evaluateShiveringProtocol,
  type TtmPatientProfile,
} from "./noctis-ttm-resuscitation.ts";

describe("Noctis Targeted Temperature Management (TTM) Engine (Track 27)", () => {
  const baseProfile: TtmPatientProfile = {
    encounterId: "ENC-TTM-001",
    patientAge: 58,
    arrestRhythm: "VF_VT",
    timeToRoscMinutes: 18,
    currentCoreTempC: 33.0,
    hoursPostRosc: 12,
    bsasScore: 0,
    selectedProtocol: "HYPOTHERMIA_32_34C",
    neuromuscularBlockadeActive: false,
    pupillometryNpi: 4.2,
    ssepN20Present: true,
  };

  test("evaluates hypothermia 32-34C protocol with zero shivering (BSAS 0)", () => {
    const report = evaluateTtmResuscitation(baseProfile);
    assert.strictEqual(report.protocolGuidance.targetRange, "32.0°C to 34.0°C Core");
    assert.strictEqual(report.trippedInvariants.length, 0);
    assert.strictEqual(report.neuroprognostication.timingStatus, "PREMATURE_LOCKOUT");
  });

  test("evaluates BSAS stepped shivering protocol across grades 0 to 3", () => {
    const b0 = evaluateShiveringProtocol(0);
    assert.ok(b0.bsasGrade.includes("BSAS 0"));

    const b1 = evaluateShiveringProtocol(1);
    assert.ok(b1.steppedTherapyPlan.some((p) => p.includes("Acetaminophen 1000 mg")));
    assert.ok(b1.steppedTherapyPlan.some((p) => p.includes("Magnesium Sulfate")));

    const b2 = evaluateShiveringProtocol(2);
    assert.ok(b2.steppedTherapyPlan.some((p) => p.includes("Dexmedetomidine")));

    const b3 = evaluateShiveringProtocol(3);
    assert.ok(b3.steppedTherapyPlan.some((p) => p.includes("Cisatracurium")));
  });

  test("trips CF-TTM-001 (Rebound Hyperthermia Veto) when core temp > 37.7C within 72h", () => {
    const feverProfile: TtmPatientProfile = {
      ...baseProfile,
      hoursPostRosc: 48,
      currentCoreTempC: 38.4,
    };
    const report = evaluateTtmResuscitation(feverProfile);
    assert.ok(report.trippedInvariants.includes("CF-TTM-001"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Rebound Hyperthermia")));
  });

  test("trips CF-TTM-002 (Rapid Rewarming Fatal Hyperkalemia Veto) when rewarming rate > 0.5C/hr", () => {
    const fastRewarmProfile: TtmPatientProfile = {
      ...baseProfile,
      currentCoreTempC: 34.5,
      rewarmingRateDegreesPerHour: 0.85,
    };
    const report = evaluateTtmResuscitation(fastRewarmProfile);
    assert.ok(report.trippedInvariants.includes("CF-TTM-002"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Rapid Rewarming Rate Veto")));
  });

  test("trips CF-TTM-003 (Premature Neuroprognostication Lockout) when WLST proposed < 72h or on paralytics", () => {
    const prematureProfile: TtmPatientProfile = {
      ...baseProfile,
      hoursPostRosc: 24,
      neuromuscularBlockadeActive: true,
      proposedInterventions: ["WITHDRAWAL_LIFE_SUSTAINING_THERAPY"],
    };
    const report = evaluateTtmResuscitation(prematureProfile);
    assert.ok(report.trippedInvariants.includes("CF-TTM-003"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Premature Neuroprognostication")));
  });

  test("evaluates multimodal neuroprognostication at >= 72h off paralytics", () => {
    const lateProfile: TtmPatientProfile = {
      ...baseProfile,
      hoursPostRosc: 76,
      currentCoreTempC: 36.8,
      neuromuscularBlockadeActive: false,
      pupillometryNpi: 1.8, // abnormal
      ssepN20Present: false, // absent
      serumNseMcgPerL: 85, // > 60
      eegPattern: "MALIGNANT_BURST_SUPPRESSION",
    };
    const report = evaluateTtmResuscitation(lateProfile);
    assert.strictEqual(report.neuroprognostication.timingStatus, "ELIGIBLE_FOR_ASSESSMENT");
    assert.strictEqual(report.neuroprognostication.conclusivePrognosisAvailable, true);
    assert.strictEqual(report.neuroprognostication.poorOutcomeSignsCount, 4);
    assert.ok(report.spokenGuidance.toLowerCase().includes("multimodal neuroprognostication"));
  });
});
