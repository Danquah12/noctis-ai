import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateVasoactiveInotropicScore,
  evaluateVasoactiveProtocol,
  type VasoactivePatientProfile,
} from "./noctis-vasoactive-titration.ts";

describe("Noctis Vasoactive & Inotropic Titration Engine (Track 29)", () => {
  const baseProfile: VasoactivePatientProfile = {
    encounterId: "ENC-VASO-001",
    patientAge: 62,
    patientWeightKg: 70,
    shockType: "DISTRIBUTIVE_SEPTIC",
    systolicBpMmHg: 82,
    diastolicBpMmHg: 46,
    heartRateBpm: 118,
    fluidResuscitationCompletedMl: 2200,
    accessRoute: "CENTRAL_VENOUS_CATHETER",
    activeInfusions: {
      norepinephrineMcgKgMin: 0.15,
      vasopressinUnitsMin: 0.0,
      epinephrineMcgKgMin: 0.0,
      dobutamineMcgKgMin: 0.0,
      milrinoneMcgKgMin: 0.0,
      dopamineMcgKgMin: 0.0,
      phenylephrineMcgKgMin: 0.0,
    },
  };

  test("calculates Vasoactive-Inotropic Score (VIS) accurately", () => {
    // 0.2 mcg/kg/min norepi (=20) + 5 mcg/kg/min dobutamine (=5) + 0.03 u/min vasopressin for 70kg (=4.3)
    const vis = calculateVasoactiveInotropicScore(
      {
        norepinephrineMcgKgMin: 0.2,
        dobutamineMcgKgMin: 5.0,
        vasopressinUnitsMin: 0.03,
        epinephrineMcgKgMin: 0.0,
        milrinoneMcgKgMin: 0.0,
        dopamineMcgKgMin: 0.0,
        phenylephrineMcgKgMin: 0.0,
      },
      70
    );
    // 5 + 0 + 0 + (10000 * 0.03 / 70 = 4.285) + (100 * 0.2 = 20) = 29.3
    assert.strictEqual(vis, 29.3);
  });

  test("evaluates septic shock protocol with Norepinephrine 1st line and Vasopressin add-on", () => {
    const report = evaluateVasoactiveProtocol(baseProfile);
    assert.strictEqual(report.primaryAgentRecommendation.firstLineDrug, "Norepinephrine");
    assert.strictEqual(report.secondaryAddOnRecommendation.agent, "Vasopressin (AVP)");
    assert.strictEqual(report.trippedInvariants.length, 0);
  });

  test("trips CF-VASO-001 (Peripheral Extravasation Ischemic Necrosis Veto) at > 12h peripheral infusion", () => {
    const extravasationProfile: VasoactivePatientProfile = {
      ...baseProfile,
      accessRoute: "PERIPHERAL_IV_LINE",
      peripheralInfusionDurationHours: 14,
    };
    const report = evaluateVasoactiveProtocol(extravasationProfile);
    assert.ok(report.trippedInvariants.includes("CF-VASO-001"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Extended Peripheral Vasopressor")));
  });

  test("trips CF-VASO-002 (Inadequate Fluid Resuscitation Lockout) when pressor started before 1000 mL fluid", () => {
    const emptyTankProfile: VasoactivePatientProfile = {
      ...baseProfile,
      fluidResuscitationCompletedMl: 400,
      activeInfusions: {
        ...baseProfile.activeInfusions,
        norepinephrineMcgKgMin: 0.35,
      },
    };
    const report = evaluateVasoactiveProtocol(emptyTankProfile);
    assert.ok(report.trippedInvariants.includes("CF-VASO-002"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Inadequate Fluid Resuscitation")));
  });

  test("trips CF-VASO-003 (Milrinone IV Bolus Absolute Contraindication in Hypotension)", () => {
    const cardioProfile: VasoactivePatientProfile = {
      ...baseProfile,
      shockType: "CARDIOGENIC",
      systolicBpMmHg: 76,
      diastolicBpMmHg: 42,
      proposedOrders: ["MILRINONE_IV_BOLUS_50MCG_KG"],
    };
    const report = evaluateVasoactiveProtocol(cardioProfile);
    assert.ok(report.trippedInvariants.includes("CF-VASO-003"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Milrinone IV Bolus Absolute Contraindication")));
  });

  test("trips CF-VASO-004 (Pure Alpha-Agonist Phenylephrine in Cardiogenic Shock Veto)", () => {
    const phenylephrineCardioProfile: VasoactivePatientProfile = {
      ...baseProfile,
      shockType: "CARDIOGENIC",
      activeInfusions: {
        ...baseProfile.activeInfusions,
        phenylephrineMcgKgMin: 0.5,
      },
    };
    const report = evaluateVasoactiveProtocol(phenylephrineCardioProfile);
    assert.ok(report.trippedInvariants.includes("CF-VASO-004"));
    assert.ok(report.safetyDirectives.some((d) => d.includes("Phenylephrine Vasoconstriction in Pump Failure")));
  });
});
