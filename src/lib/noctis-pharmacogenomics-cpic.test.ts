import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCyp2c19Antiplatelet,
  evaluateDpydFluoropyrimidine,
  evaluateHlaScreening,
  handleNaturalPgxQuery,
} from "./noctis-pharmacogenomics-cpic.ts";

describe("NOCTIS-PGX-CPIC-001: Clinical Pharmacogenomics & CPIC Actionable Dosing Engine", () => {
  it("enforces CF-PGX-001 Clopidogrel resistance veto in CYP2C19 loss-of-function metabolizer", () => {
    const res = evaluateCyp2c19Antiplatelet({
      diplotype: "*2/*2",
      drugProposed: "CLOPIDOGREL",
      clinicalIndication: "POST_PCI_ACS",
    });

    assert.equal(res.engineId, "NOCTIS-PGX-CPIC-001");
    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-PGX-001/);
    assert.match(res.safetyVetoesTriggered[0], /CLOPIDOGREL RESISTANCE & STENT THROMBOSIS VETO/);
    assert.match(res.safetyVetoesTriggered[0], /Ticagrelor 90 mg BID/);
  });

  it("enforces CF-PGX-002 fatal 5-FU toxicity veto in DPYD poor metabolizer (Activity Score 0)", () => {
    const res = evaluateDpydFluoropyrimidine({
      activityScore: 0.0,
      drugProposed: "5_FLUOROURACIL",
      proposedDosePercent: 100,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-PGX-002/);
    assert.match(res.safetyVetoesTriggered[0], /DPYD POOR METABOLIZER FATAL 5-FU TOXICITY VETO/);
    assert.match(res.safetyVetoesTriggered[0], /STRICTLY CONTRAINDICATED/);
  });

  it("enforces CF-PGX-003 dose reduction in DPYD intermediate metabolizer (Activity Score 1.0)", () => {
    const res = evaluateDpydFluoropyrimidine({
      activityScore: 1.0,
      drugProposed: "CAPECITABINE",
      proposedDosePercent: 100, // Standard dose without reduction!
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-PGX-003/);
    assert.match(res.safetyVetoesTriggered[0], /minimum 50% initial dose reduction/);
  });

  it("enforces CF-PGX-004 Abacavir fatal hypersensitivity veto in HLA-B*57:01 positive patient", () => {
    const res = evaluateHlaScreening({
      hlaB5701Positive: true,
      proposedAbacavir: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-PGX-004/);
    assert.match(res.safetyVetoesTriggered[0], /HLA-B\*57:01 ABACAVIR FATAL HYPERSENSITIVITY VETO/);
  });

  it("enforces CF-PGX-005 Carbamazepine SJS/TEN veto in HLA-B*15:02 positive patient", () => {
    const res = evaluateHlaScreening({
      hlaB1502Positive: true,
      proposedCarbamazepine: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-PGX-005/);
    assert.match(res.safetyVetoesTriggered[0], /HLA-B\*15:02 CARBAMAZEPINE SJS\/TEN VETO/);
  });

  it("handles natural query parsing for CYP2C19 loss-of-function patient on Clopidogrel", () => {
    const output = handleNaturalPgxQuery("Patient post-PCI with CYP2C19 *2 loss of function allele, starting clopidogrel");
    assert.ok(output);
    assert.match(output, /CF-PGX-001/);
    assert.match(output, /CLOPIDOGREL RESISTANCE & STENT THROMBOSIS VETO/);
  });
});
