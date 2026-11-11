import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateRvFailure,
  evaluatePulmonaryEmbolism,
  evaluateStatusAsthmaticus,
  handleNaturalPulmRvQuery,
} from "./noctis-pulmonary-rv-failure.ts";

describe("NOCTIS-PULM-RV-001: Acute RV Failure, Massive PE & Status Asthmaticus Engine", () => {
  it("enforces CF-PULM-001 fluid restriction veto in acute RV failure with high CVP and RV dilatation", () => {
    const res = evaluateRvFailure({
      systolicBpMmhg: 80,
      meanArterialPressureMmhg: 52,
      centralVenousPressureMmhg: 19,
      tapseMm: 10,
      rvLvDiameterRatio: 1.5,
      dShapedSeptumPresent: true,
      fluidBolusProposedMl: 1000,
      norepinephrineOrdered: true,
    });

    assert.equal(res.engineId, "NOCTIS-PULM-RV-001");
    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-PULM-001/);
    assert.match(res.safetyVetoesTriggered[0], /ACUTE RV FAILURE FLUID RESTRICTION VETO/);
    assert.match(res.safetyVetoesTriggered[0], /IMMEDIATELY CANCEL FLUID BOLUS/);
  });

  it("enforces CF-PULM-002 systemic thrombolysis bleeding contraindication veto in massive PE", () => {
    const res = evaluatePulmonaryEmbolism({
      systolicBpMmhg: 75,
      hypotensionDurationMinutes: 25,
      cardiacArrestActive: false,
      rvDysfunctionPresent: true,
      cardiacBiomarkersElevated: true,
      systemicThrombolysisProposed: true,
      hasAbsoluteBleedingContraindication: true,
      candidateForCatheterThrombectomy: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-PULM-002/);
    assert.match(res.safetyVetoesTriggered[0], /SYSTEMIC THROMBOLYSIS ABSOLUTE BLEEDING CONTRAINDICATION VETO/);
    assert.match(res.safetyVetoesTriggered[0], /Catheter-Directed Mechanical Thrombectomy/);
  });

  it("enforces CF-PULM-003 ventilator disconnect rule in post-intubation status asthmaticus collapse", () => {
    const res = evaluateStatusAsthmaticus({
      intubated: true,
      arterialPh: 7.12,
      arterialPaco2Mmhg: 80,
      autoPeepCmh2o: 20,
      plateauPressureCmh2o: 38,
      respiratoryRatePerMin: 24,
      inspiratoryToExpiratoryRatio: "1:2",
      suddenPostIntubationHypotension: true,
      ventilatorDisconnectedForExhalation: false,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-PULM-003/);
    assert.match(res.safetyVetoesTriggered[0], /IMMEDIATELY DISCONNECT THE PATIENT FROM THE VENTILATOR/);
  });

  it("recommends protective ventilation and permissive hypercapnia in status asthmaticus", () => {
    const res = evaluateStatusAsthmaticus({
      intubated: true,
      arterialPh: 7.24,
      arterialPaco2Mmhg: 64,
      autoPeepCmh2o: 8,
      plateauPressureCmh2o: 26,
      respiratoryRatePerMin: 12,
      inspiratoryToExpiratoryRatio: "1:4",
      suddenPostIntubationHypotension: false,
      ventilatorDisconnectedForExhalation: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 0);
    assert.ok(res.recommendations.some((r) => r.includes("Permissive Hypercapnia")));
  });

  it("handles natural query parsing for massive PE with thrombolysis contraindication", () => {
    const output = handleNaturalPulmRvQuery("Patient with massive PE, BP 76/40, but has stroke history and bleeding contraindication for thrombolysis");
    assert.ok(output);
    assert.match(output, /CF-PULM-002/);
    assert.match(output, /SYSTEMIC THROMBOLYSIS ABSOLUTE BLEEDING CONTRAINDICATION VETO/);
  });

  it("handles natural query parsing for status asthmaticus post-intubation collapse", () => {
    const output = handleNaturalPulmRvQuery("Severe status asthmaticus patient had sudden post-intubation hypotension and high auto-peep");
    assert.ok(output);
    assert.match(output, /CF-PULM-003/);
    assert.match(output, /IMMEDIATELY DISCONNECT THE PATIENT FROM THE VENTILATOR/);
  });
});
