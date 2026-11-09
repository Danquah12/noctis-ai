import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateBurnFluidResuscitation,
  evaluateBurnResuscitation,
  formatBurnSpokenSummary,
  BURN_PRESET_INHALATION_AIRWAY,
  BURN_PRESET_CYANIDE_POISONING,
  BURN_PRESET_FLUID_CREEP,
  type BurnPatientProfile,
} from "./noctis-burn-resuscitation.ts";

describe("Noctis Acute Burn Resuscitation & Inhalation Injury Engine (Track 24)", () => {
  test("calculates Parkland and Modified Brooke fluid requirements accurately", () => {
    // 80 kg, 35% TBSA
    // Parkland = 4 * 80 * 35 = 11,200 mL
    // Brooke = 2 * 80 * 35 = 5,600 mL
    // First 8 hours rate = 11,200 / 2 / 8 = 700 mL/hr
    // Next 16 hours rate = 11,200 / 2 / 16 = 350 mL/hr
    const fluid = calculateBurnFluidResuscitation(BURN_PRESET_INHALATION_AIRWAY);

    assert.strictEqual(fluid.parklandTotal24hMl, 11200);
    assert.strictEqual(fluid.modifiedBrookeTotal24hMl, 5600);
    assert.strictEqual(fluid.first8HoursHourlyRateMl, 700);
    assert.strictEqual(fluid.next16HoursHourlyRateMl, 350);
    assert.strictEqual(fluid.targetUrineOutputMlPerHourMin, 40); // 0.5 * 80
    assert.strictEqual(fluid.targetUrineOutputMlPerHourMax, 80); // 1.0 * 80
  });

  test("trips CF-BURN-001 (Inhalation Injury Airway Veto) and mandates early intubation for stridor", () => {
    const report = evaluateBurnResuscitation(BURN_PRESET_INHALATION_AIRWAY);

    assert.ok(report.trippedInvariants.includes("CF-BURN-001"));
    assert.strictEqual(report.inhalationInjurySeverity, "SEVERE_AIRWAY_THREAT");
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("INHALATION INJURY IMMEDIATE INTUBATION VETO") && a.includes("video laryngoscopy")
      )
    );
  });

  test("trips CF-BURN-002 (Fluid Creep & Abdominal Compartment Syndrome Veto) at > 250 mL/kg", () => {
    const report = evaluateBurnResuscitation(BURN_PRESET_FLUID_CREEP);

    assert.ok(report.trippedInvariants.includes("CF-BURN-002"));
    assert.strictEqual(report.fluidCalculations.fluidAdjustmentAdvice, "HIGH_RISK_FLUID_CREEP");
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("FLUID CREEP & ABDOMINAL COMPARTMENT SYNDROME VETO") && a.includes("5% albumin")
      )
    );
  });

  test("trips CF-BURN-003 (Cyanide Poisoning Hydroxocobalamin Antidote Veto) when lactate >= 8.0 in smoke", () => {
    const report = evaluateBurnResuscitation(BURN_PRESET_CYANIDE_POISONING);

    assert.ok(report.trippedInvariants.includes("CF-BURN-003"));
    assert.strictEqual(report.inhalationInjurySeverity, "LETHAL_CYANIDE_TOXICITY");
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("CYANIDE SMOKE INHALATION ANTIDOTE VETO") && a.includes("Hydroxocobalamin 5g IV")
      )
    );
  });

  test("trips CF-BURN-004 (Circumferential Burn Escharotomy Veto) when extremity pulse is lost", () => {
    const escharPatient: BurnPatientProfile = {
      patientId: "BURN-ESCHAR-004",
      patientName: "Carl Weber (50yo M - Full Thickness Arm Burn)",
      ageYears: 50,
      weightKg: 85,
      hoursPostBurn: 4,
      percentTbsaSecondAndThirdDegree: 20,
      isElectricalHighVoltage: false,
      closedSpaceFire: false,
      singedFacialHairOrSootInPharynx: false,
      stridorOrHoarseness: false,
      carboxyhemoglobinPercent: 2,
      serumLactateMmolPerL: 2.1,
      circumferentialExtremityBurn: true,
      distalPulseLost: true, // Loss of pulse!
      circumferentialTorsoBurn: false,
      peakInspiratoryPressureHigh: false,
      currentFluidInfusionMlPerHour: 425,
      totalFluidReceivedMl: 1700,
      urineOutputMlPerHour: 50,
    };

    const report = evaluateBurnResuscitation(escharPatient);
    assert.ok(report.trippedInvariants.includes("CF-BURN-004"));
    assert.strictEqual(report.escharotomyRequired, true);
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("CIRCUMFERENTIAL BURN IMMEDIATE ESCHAROTOMY VETO") && a.includes("mid-axial escharotomy")
      )
    );
  });

  test("formats zero-truncation spoken audio summary with clinical precision", () => {
    const report = evaluateBurnResuscitation(BURN_PRESET_INHALATION_AIRWAY);
    const spoken = formatBurnSpokenSummary(report);

    assert.ok(spoken.includes("Dominic Torres"));
    assert.ok(spoken.includes("Parkland 24-hour total fluid estimate is 11200 milliliters"));
    assert.ok(spoken.includes("Initial 8-hour resuscitation rate is 700 milliliters per hour"));
    assert.ok(spoken.includes("CF-BURN-001"));
  });
});
