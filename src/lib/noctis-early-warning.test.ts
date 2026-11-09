/**
 * NOCTIS HEALTH CLINICAL DETERIORATION (NEWS2 / qSOFA) TEST SUITE
 * Spec: NH500-EARLY-WARNING-012
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  calculateNews2,
  calculateQsofa,
  calculateMews,
  generateComprehensiveDeteriorationReport,
  formatDeteriorationSpokenAlert,
  type PatientVitalsForEws,
} from "./noctis-early-warning.ts";
import { cleanVoiceText } from "./noctis-voice.ts";

describe("Noctis Clinical Deterioration & Early Warning Scoring Engine", () => {
  it("calculates accurate NEWS2 score for severe DKA/Septic patient and triggers HIGH_EMERGENCY", () => {
    // Severe DKA presentation matching Image 1:
    // RR: 32 (3 pts), SpO2: 98% (0 pts), On O2: No (0 pts), SBP: 96 (2 pts), HR: 124 (2 pts), Alert (0 pts), Temp: 37.0 (0 pts)
    // Total = 3 + 0 + 0 + 2 + 2 + 0 + 0 = 7
    const dkaVitals: PatientVitalsForEws = {
      respiratoryRatePerMin: 32,
      spo2Percent: 98,
      onSupplementalOxygen: false,
      systolicMmHg: 96,
      diastolicMmHg: 62,
      heartRateBpm: 124,
      temperatureCelsius: 37.0,
      consciousness: "ALERT",
    };

    const news2 = calculateNews2(dkaVitals);
    assert.equal(news2.totalScore, 7);
    assert.equal(news2.clinicalRiskTier, "HIGH_EMERGENCY");
    assert.equal(news2.hasRedScoreTrigger, true); // RR >= 25 is score 3
    assert.ok(news2.trippedSafetyInvariant?.includes("CF-NEWS-001"));
  });

  it("handles Scale 2 SpO2 for hypercapnic respiratory failure / COPD patients correctly", () => {
    // Hypercapnic patient target 88-92%:
    // SpO2 90% on room air should be 0 pts in Scale 2 (whereas in Scale 1 it would be 3 pts)
    const copdVitals: PatientVitalsForEws = {
      respiratoryRatePerMin: 18,
      spo2Percent: 90,
      isHypercapnicRespiratoryFailureScale2: true,
      onSupplementalOxygen: false,
      systolicMmHg: 128,
      diastolicMmHg: 78,
      heartRateBpm: 76,
      temperatureCelsius: 36.8,
      consciousness: "ALERT",
    };

    const news2 = calculateNews2(copdVitals);
    assert.equal(news2.spo2Score, 0);
    assert.equal(news2.totalScore, 0);
    assert.equal(news2.clinicalRiskTier, "LOW");
  });

  it("evaluates qSOFA accurately and triggers Sepsis-3 resuscitation bundle when score >= 2", () => {
    // Septic patient: RR 24 (>=22 -> 1 pt), SBP 88 (<=100 -> 1 pt), Confusion (ACVPU != Alert -> 1 pt)
    // Total = 3 / 3
    const septicVitals: PatientVitalsForEws = {
      respiratoryRatePerMin: 24,
      spo2Percent: 92,
      onSupplementalOxygen: true,
      systolicMmHg: 88,
      diastolicMmHg: 52,
      heartRateBpm: 136,
      temperatureCelsius: 39.2,
      consciousness: "CONFUSION",
    };

    const qsofa = calculateQsofa(septicVitals);
    assert.equal(qsofa.score, 3);
    assert.equal(qsofa.isHighRiskSepsis, true);
    assert.ok(qsofa.sepsis3ClinicalGuidance.includes("1-Hour Sepsis Bundle"));
    assert.ok(qsofa.trippedSafetyInvariant?.includes("CF-SEP-001"));
  });

  it("calculates MEWS score and triggers critical alert when score >= 5", () => {
    const shockVitals: PatientVitalsForEws = {
      respiratoryRatePerMin: 28, // 2 pts
      spo2Percent: 90,
      onSupplementalOxygen: true,
      systolicMmHg: 78, // 2 pts
      diastolicMmHg: 46,
      heartRateBpm: 134, // 3 pts
      temperatureCelsius: 38.8, // 2 pts
      consciousness: "VOICE", // 1 pt
    };

    const mews = calculateMews(shockVitals);
    assert.ok(mews.score >= 5);
    assert.equal(mews.isCriticalAlert, true);
  });

  it("synthesizes comprehensive report and formats zero-truncation spoken audio alerts", () => {
    const severeVitals: PatientVitalsForEws = {
      respiratoryRatePerMin: 30,
      spo2Percent: 88,
      onSupplementalOxygen: true,
      systolicMmHg: 84,
      diastolicMmHg: 48,
      heartRateBpm: 140,
      temperatureCelsius: 39.6,
      consciousness: "CONFUSION",
    };

    const report = generateComprehensiveDeteriorationReport(severeVitals);
    assert.equal(report.rapidResponseTeamIndicated, true);
    assert.equal(report.sepsisBundleStatTrigger, true);

    const rawSpoken = formatDeteriorationSpokenAlert(report);
    const spoken = cleanVoiceText(rawSpoken);

    assert.ok(spoken.includes("Clinical Deterioration and Early Warning Surveillance Alert"));
    assert.ok(spoken.includes("National Early Warning Score 2"));
    assert.ok(spoken.includes("Sepsis 3 High Mortality Risk Triggered"));
    assert.ok(spoken.includes("1-Hour Sepsis Bundle"));
    assert.ok(spoken.includes("Medical Emergency Team"));
  });
});
