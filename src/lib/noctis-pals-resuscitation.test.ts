import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getBroselowZoneFromWeight,
  calculatePediatricNormalVitals,
  calculateAirwaySizing,
  calculatePalsMedications,
  evaluatePalsResuscitation,
  formatPalsSpokenSummary,
  PALS_PRESET_TODDLER_SEPSIS,
  PALS_PRESET_PRESCHOOL_ARREST,
  PALS_PRESET_INFANT_CARDIOGENIC,
} from "./noctis-pals-resuscitation.ts";

describe("Noctis Pediatric Advanced Life Support (PALS) Resuscitation Engine", () => {
  it("maps weight to accurate Broselow color zones across all pediatric tiers", () => {
    assert.strictEqual(getBroselowZoneFromWeight(4.5).color, "GREY");
    assert.strictEqual(getBroselowZoneFromWeight(7.0).color, "PINK");
    assert.strictEqual(getBroselowZoneFromWeight(8.5).color, "RED");
    assert.strictEqual(getBroselowZoneFromWeight(11.0).color, "PURPLE");
    assert.strictEqual(getBroselowZoneFromWeight(13.5).color, "YELLOW");
    assert.strictEqual(getBroselowZoneFromWeight(16.0).color, "WHITE");
    assert.strictEqual(getBroselowZoneFromWeight(21.0).color, "BLUE");
    assert.strictEqual(getBroselowZoneFromWeight(26.0).color, "ORANGE");
    assert.strictEqual(getBroselowZoneFromWeight(32.0).color, "GREEN");
    assert.strictEqual(getBroselowZoneFromWeight(45.0).color, "ADOLESCENT");
  });

  it("calculates age-stratified normal vitals and hypotension thresholds", () => {
    // 4-year-old child: SBP minimum = 70 + (2 * 4) = 78 mmHg
    const vitals4yo = calculatePediatricNormalVitals(4, 0);
    assert.strictEqual(vitals4yo.sbpMinimumHypotensionThreshold, 78);
    assert.strictEqual(vitals4yo.hrNormalMin, 80);
    assert.strictEqual(vitals4yo.hrNormalMax, 140);

    // Neonate (<1 mo): SBP minimum = 60 mmHg
    const vitalsNeonate = calculatePediatricNormalVitals(0, 0);
    assert.strictEqual(vitalsNeonate.sbpMinimumHypotensionThreshold, 60);

    // Adolescent (>12 yr): SBP minimum = 90 mmHg
    const vitalsAdolescent = calculatePediatricNormalVitals(14, 0);
    assert.strictEqual(vitalsAdolescent.sbpMinimumHypotensionThreshold, 90);
  });

  it("calculates airway equipment sizing correctly (cuffed ETT and depth at lip)", () => {
    // 4-year-old: cuffed ETT = (4/4) + 3.5 = 4.5 mm; depth = 4.5 * 3 = 13.5 cm
    const airway4yo = calculateAirwaySizing(4, 16);
    assert.strictEqual(airway4yo.cuffedEttSizeMm, 4.5);
    assert.strictEqual(airway4yo.uncuffedEttSizeMm, 5.0);
    assert.strictEqual(airway4yo.depthAtLipCm, 13.5);
    assert.strictEqual(airway4yo.suctionCatheterFr, 9);
  });

  it("calculates weight-based PALS resuscitation medication doses and exact mL volumes", () => {
    // 16 kg child (Preschooler)
    const meds = calculatePalsMedications(16);

    // Epinephrine 1:10,000: 0.01 mg/kg = 0.16 mg = 1.6 mL
    const epi = meds.find((m) => m.drugName.includes("Epinephrine"));
    assert.ok(epi);
    assert.strictEqual(epi.totalDoseMg, 0.16);
    assert.strictEqual(epi.volumeToAdministerMl, 1.6);

    // Atropine: 0.02 mg/kg = 0.32 mg
    const atropine = meds.find((m) => m.drugName.includes("Atropine"));
    assert.ok(atropine);
    assert.strictEqual(atropine.totalDoseMg, 0.32);

    // Adenosine: 0.1 mg/kg = 1.6 mg
    const adeno = meds.find((m) => m.drugName.includes("Adenosine"));
    assert.ok(adeno);
    assert.strictEqual(adeno.totalDoseMg, 1.6);

    // Amiodarone: 5 mg/kg = 80 mg
    const amio = meds.find((m) => m.drugName.includes("Amiodarone"));
    assert.ok(amio);
    assert.strictEqual(amio.totalDoseMg, 80);
  });

  it("evaluates septic shock case with 20 mL/kg fluid bolus and Broselow PURPLE zone", () => {
    const report = evaluatePalsResuscitation(PALS_PRESET_TODDLER_SEPSIS);
    assert.strictEqual(report.broselowZone.color, "PURPLE");
    assert.strictEqual(report.fluidResuscitation.bolusVolumeMl, 220); // 11 kg * 20 mL/kg
    assert.strictEqual(report.trippedInvariants.length, 0);
  });

  it("trips CF-PALS-001 (Lethal 10-Fold Epinephrine Overdose Veto) on 1:1,000 IV/IO order", () => {
    const report = evaluatePalsResuscitation({
      ...PALS_PRESET_PRESCHOOL_ARREST,
      attemptedEpiConcentration: "1:1,000",
    });

    assert.ok(report.trippedInvariants.includes("CF-PALS-001"), "Must trip CF-PALS-001");
    assert.ok(report.mandatoryActions[0].includes("LETHAL 10-FOLD EPINEPHRINE OVERDOSE VETO"));
  });

  it("trips CF-PALS-003 (Neonatal Undiluted Sodium Bicarbonate Veto)", () => {
    const report = evaluatePalsResuscitation({
      patientId: "NEO-001",
      patientName: "Baby Boy Smith (Neonate)",
      ageYears: 0,
      ageMonths: 0,
      weightKg: 3.2,
      attemptedBicarbNeonatal: "8.4%_UNDILUTED",
    });

    assert.ok(report.trippedInvariants.includes("CF-PALS-003"), "Must trip CF-PALS-003 for undiluted 8.4% bicarb");
    assert.ok(report.mandatoryActions[0].includes("NEONATAL INTRAVENTRICULAR HEMORRHAGE VETO"));
  });

  it("formats zero-truncation spoken audio summary with full PALS parameters", () => {
    const report = evaluatePalsResuscitation(PALS_PRESET_PRESCHOOL_ARREST);
    const spoken = formatPalsSpokenSummary(report);
    assert.ok(spoken.includes("Broselow color-coded zone is WHITE"));
    assert.ok(spoken.includes("Epinephrine 1 to 10,000 concentration"));
    assert.ok(spoken.includes("Airway sizing"));
    assert.ok(spoken.includes("Electrical defibrillation energy"));
  });
});
