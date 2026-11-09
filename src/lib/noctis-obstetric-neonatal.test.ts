import { test, describe } from "node:test";
import assert from "node:assert";
import {
  classifyFetalHeartRate,
  calculateApgarScore,
  evaluateNeonatalResuscitation,
  evaluateObstetricNeonatalCare,
  formatObstetricSpokenSummary,
  OB_PRESET_CATEGORY_III_DISTRESS,
  NRP_PRESET_TERM_DEPRESSION,
  OB_PRESET_MAGNESIUM_TOXICITY,
  type FetalHeartMonitoringProfile,
  type NeonatalResuscitationProfile,
} from "./noctis-obstetric-neonatal.ts";

describe("Noctis Obstetric & Neonatal Resuscitation Engine (Track 21)", () => {
  test("classifies FHR Category I, II, and III accurately according to NICHD standards", () => {
    // Normal Category I
    const normalFhr: FetalHeartMonitoringProfile = {
      patientId: "OB-NORM",
      patientName: "Normal Labor",
      gestationalWeeks: 39,
      fhrBaselineBpm: 135,
      variability: "MODERATE",
      decelerations: "NONE",
      accelerationsPresent: true,
      uterineTachysystole: false,
      oxytocinInfusionActive: false,
    };
    const resNormal = classifyFetalHeartRate(normalFhr);
    assert.strictEqual(resNormal.category, "CATEGORY_I");

    // Sinusoidal Category III
    const sinusoidalFhr: FetalHeartMonitoringProfile = {
      patientId: "OB-SINUS",
      patientName: "Sinusoidal Tracing",
      gestationalWeeks: 36,
      fhrBaselineBpm: 130,
      variability: "MODERATE",
      decelerations: "SINUSOIDAL",
      accelerationsPresent: false,
      uterineTachysystole: false,
      oxytocinInfusionActive: false,
    };
    const resSinusoidal = classifyFetalHeartRate(sinusoidalFhr);
    assert.strictEqual(resSinusoidal.category, "CATEGORY_III");

    // Absent variability with late decelerations (Category III)
    const resCat3 = classifyFetalHeartRate(OB_PRESET_CATEGORY_III_DISTRESS);
    assert.strictEqual(resCat3.category, "CATEGORY_III");
  });

  test("calculates APGAR scores correctly across all 5 clinical parameters", () => {
    // Score 1 (Depressed neonate)
    const depressedScore = calculateApgarScore(NRP_PRESET_TERM_DEPRESSION.apgar1Min!);
    assert.strictEqual(depressedScore, 1);

    // Score 10 (Vigorous neonate)
    const vigorousScore = calculateApgarScore({
      appearanceSkinColor: 2,
      pulseHeartRate: 2,
      grimaceReflex: 2,
      activityMuscleTone: 2,
      respirationEffort: 2,
    });
    assert.strictEqual(vigorousScore, 10);
  });

  test("trips CF-OB-001 (Category III Fetal Distress Veto) and orders intrauterine resuscitation", () => {
    const report = evaluateObstetricNeonatalCare({
      fhrProfile: OB_PRESET_CATEGORY_III_DISTRESS,
    });

    assert.ok(report.trippedInvariants.includes("CF-OB-001"));
    assert.strictEqual(report.intrauterineResuscitationRequired, true);
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("EMERGENT CATEGORY III FETAL DISTRESS VETO") && a.includes("Discontinue Oxytocin")
      )
    );
  });

  test("trips CF-OB-002 (Neonatal Hyperoxic Free-Radical Injury Veto) when >=35w infant receives 100% O2", () => {
    const report = evaluateObstetricNeonatalCare({
      neonatalProfile: NRP_PRESET_TERM_DEPRESSION,
    });

    assert.ok(report.trippedInvariants.includes("CF-OB-002"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("NEONATAL HYPEROXIC BRAIN INJURY VETO") && a.includes("21% (room air)")
      )
    );
  });

  test("trips CF-OB-003 (Golden Minute PPV Delay Veto) when PPV is omitted past 60s", () => {
    const report = evaluateObstetricNeonatalCare({
      neonatalProfile: NRP_PRESET_TERM_DEPRESSION,
    });

    assert.ok(report.trippedInvariants.includes("CF-OB-003"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("GOLDEN MINUTE PPV DELAY VETO") && a.includes("40-60 breaths/min")
      )
    );
  });

  test("trips CF-OB-004 (Maternal Magnesium Toxicity Veto) with Calcium Gluconate antidote directive", () => {
    const report = evaluateObstetricNeonatalCare({
      maternalMagnesium: OB_PRESET_MAGNESIUM_TOXICITY,
    });

    assert.ok(report.trippedInvariants.includes("CF-OB-004"));
    assert.strictEqual(report.magnesiumToxicityDetected, true);
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("MATERNAL MAGNESIUM TOXICITY VETO") && a.includes("Calcium Gluconate")
      )
    );
  });

  test("formats zero-truncation spoken audio summary with full clinical precision", () => {
    const report = evaluateObstetricNeonatalCare({
      fhrProfile: OB_PRESET_CATEGORY_III_DISTRESS,
      neonatalProfile: NRP_PRESET_TERM_DEPRESSION,
      maternalMagnesium: OB_PRESET_MAGNESIUM_TOXICITY,
    });

    const spoken = formatObstetricSpokenSummary(report);
    assert.ok(spoken.toLowerCase().includes("category iii"));
    assert.ok(spoken.includes("Intrauterine resuscitation protocol actively required"));
    assert.ok(spoken.includes("Calculated 1-minute APGAR score is 1 out of 10"));
    assert.ok(spoken.includes("Maternal magnesium sulfate toxicity detected"));
    assert.ok(spoken.includes("CF-OB-001"));
  });
});
