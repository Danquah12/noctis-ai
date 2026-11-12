import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCirrhosisMeld,
  evaluateGiBleed,
  handleNaturalGastroQuery,
} from "./noctis-gastro-hepatology.ts";

describe("NOCTIS-GI-HEP-001: Gastroenterology & Hepatology Engine", () => {
  it("enforces CF-GI-001 mandatory diagnostic paracentesis veto in decompensated cirrhosis with new ascites", () => {
    const res = evaluateCirrhosisMeld({
      serumBilirubinMgdl: 3.5,
      serumInr: 1.8,
      serumCreatinineMgdl: 1.9,
      serumSodiumMeqL: 132,
      serumAlbuminGdl: 2.6,
      isFemale: false,
      onDialysisTwiceInPastWeek: false,
      ascitesPresent: true,
      paracentesisPerformed: false, // Omission!
    });

    assert.equal(res.engineId, "NOCTIS-GI-HEP-001");
    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-GI-001/);
    assert.match(res.safetyVetoesTriggered[0], /MANDATORY DIAGNOSTIC PARACENTESIS VETO/);
  });

  it("enforces CF-GI-002 SBP Albumin infusion omission veto when PMN >= 250/uL", () => {
    const res = evaluateCirrhosisMeld({
      serumBilirubinMgdl: 4.0,
      serumInr: 2.0,
      serumCreatinineMgdl: 2.1,
      serumSodiumMeqL: 129,
      serumAlbuminGdl: 2.2,
      isFemale: false,
      onDialysisTwiceInPastWeek: false,
      ascitesPresent: true,
      paracentesisPerformed: true,
      asciticFluidPmnPerUl: 450,
      albuminInfusedWithAntibiotics: false, // Omission!
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-GI-002/);
    assert.match(res.safetyVetoesTriggered[0], /SBP ALBUMIN INFUSION OMISSION VETO/);
  });

  it("enforces CF-GI-003 liberal transfusion veto in acute variceal bleed", () => {
    const res = evaluateGiBleed({
      systolicBpMmhg: 88,
      heartRateBpm: 110,
      hemoglobinGdl: 7.2,
      bloodUreaNitrogenMgdl: 32,
      presentation: "HEMATEMESIS",
      suspectedVaricealBleed: true,
      targetHemoglobinGoalGdl: 10.5, // Liberal target!
      transfusionActiveAboveTarget: true,
      betaBlockerContinuedDuringBleed: false,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-GI-003/);
    assert.match(res.safetyVetoesTriggered[0], /LIBERAL TRANSFUSION PORTAL HYPERTENSION VETO/);
    assert.match(res.safetyVetoesTriggered[0], /RESTRICTIVE transfusion strategy: target Hb 7.0-9.0 g\/dL/);
  });

  it("enforces CF-GI-004 beta-blocker continuation veto during acute active hemorrhage", () => {
    const res = evaluateGiBleed({
      systolicBpMmhg: 82,
      heartRateBpm: 76, // Blunted tachycardia!
      hemoglobinGdl: 7.0,
      bloodUreaNitrogenMgdl: 28,
      presentation: "MELENA",
      suspectedVaricealBleed: true,
      targetHemoglobinGoalGdl: 8.0,
      transfusionActiveAboveTarget: false,
      betaBlockerContinuedDuringBleed: true, // Dangerous!
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-GI-004/);
    assert.match(res.safetyVetoesTriggered[0], /BETA-BLOCKER ACTIVE BLEEDING COLLAPSE VETO/);
  });

  it("handles natural language query for variceal bleed with liberal transfusion", () => {
    const output = handleNaturalGastroQuery("Cirrhotic patient with variceal bleed, Hb 7.4, should we transfuse to target Hb 10.5?");
    assert.ok(output);
    assert.match(output, /CF-GI-003/);
    assert.match(output, /LIBERAL TRANSFUSION PORTAL HYPERTENSION VETO/);
  });
});
