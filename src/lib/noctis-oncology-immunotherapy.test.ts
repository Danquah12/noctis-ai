import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateTumorLysisSyndrome,
  evaluateIrae,
  evaluateFebrileNeutropenia,
  handleNaturalOncologyQuery,
} from "./noctis-oncology-immunotherapy.ts";

describe("NOCTIS-ONC-IRAE-001: Oncology & Immunotherapy Engine", () => {
  it("enforces CF-ONC-001 urinary alkalinization veto in Tumor Lysis Syndrome", () => {
    const res = evaluateTumorLysisSyndrome({
      uricAcidMgdl: 10.5,
      potassiumMeqL: 6.2,
      phosphorusMgdl: 5.4,
      correctedCalciumMgdl: 6.9,
      creatinineMgdl: 2.1,
      baselineCreatinineMgdl: 1.0,
      cardiacArrhythmiaPresent: false,
      seizurePresent: false,
      urinaryAlkalinizationProposed: true,
      g6pdDeficiencyPresent: false,
      rasburicaseOrdered: true,
    });

    assert.equal(res.engineId, "NOCTIS-ONC-IRAE-001");
    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ONC-001/);
    assert.match(res.safetyVetoesTriggered[0], /URINARY ALKALINIZATION NEPHROCALCINOSIS VETO/);
  });

  it("enforces CF-ONC-002 Rasburicase G6PD hemolysis veto", () => {
    const res = evaluateTumorLysisSyndrome({
      uricAcidMgdl: 12.0,
      potassiumMeqL: 5.5,
      phosphorusMgdl: 4.8,
      correctedCalciumMgdl: 7.2,
      creatinineMgdl: 1.8,
      baselineCreatinineMgdl: 1.0,
      cardiacArrhythmiaPresent: false,
      seizurePresent: false,
      urinaryAlkalinizationProposed: false,
      g6pdDeficiencyPresent: true,
      rasburicaseOrdered: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ONC-002/);
    assert.match(res.safetyVetoesTriggered[0], /RASBURICASE G6PD HEMOLYSIS/);
  });

  it("enforces CF-ONC-003 Infliximab severe heart failure veto in irAE colitis", () => {
    const res = evaluateIrae({
      checkpointInhibitorAgent: "Nivolumab",
      organSystem: "COLITIS",
      grade: 3,
      symptoms: ["Severe diarrhea", "Tenesmus"],
      infliximabProposed: true,
      heartFailurePresent: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ONC-003/);
    assert.match(res.safetyVetoesTriggered[0], /Vedolizumab/);
  });

  it("enforces CF-ONC-004 rapid steroid taper rebound veto in high-grade irAE", () => {
    const res = evaluateIrae({
      checkpointInhibitorAgent: "Pembrolizumab",
      organSystem: "PNEUMONITIS",
      grade: 3,
      symptoms: ["Hypoxia", "New bilateral infiltrates"],
      steroidTaperDurationWeeks: 2, // Too fast!
      infliximabProposed: false,
      heartFailurePresent: false,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ONC-004/);
    assert.match(res.safetyVetoesTriggered[0], /AT LEAST 4 TO 6 WEEKS/);
  });

  it("enforces CF-ONC-005 empiric vancomycin overuse veto in febrile neutropenia", () => {
    const res = evaluateFebrileNeutropenia({
      absoluteNeutrophilCount: 150,
      temperatureCelsius: 38.8,
      antipseudomonalOrdered: true,
      vancomycinOrderedWithoutIndication: true,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-ONC-005/);
    assert.match(res.safetyVetoesTriggered[0], /EMPIRIC VANCOMYCIN OVERUSE VETO/);
  });

  it("handles natural language query for TLS with alkalinization question", () => {
    const output = handleNaturalOncologyQuery("Patient with tumor lysis syndrome, uric acid 11.2, potassium 6.4, should we start sodium bicarbonate alkalinization?");
    assert.ok(output);
    assert.match(output, /CF-ONC-001/);
    assert.match(output, /URINARY ALKALINIZATION NEPHROCALCINOSIS VETO/);
  });
});
