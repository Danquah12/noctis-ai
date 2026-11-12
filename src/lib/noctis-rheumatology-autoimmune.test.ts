import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateBiologicSafety,
  evaluateSclerodermaRenalCrisis,
  handleNaturalRheumatologyQuery,
} from "./noctis-rheumatology-autoimmune.ts";

describe("NOCTIS-RHEUM-EMERG-001: Rheumatology & Autoimmune Emergencies Engine", () => {
  it("enforces CF-RHEUM-001 biologic latent infection screening mandate veto", () => {
    const res = evaluateBiologicSafety({
      candidateAgent: "TNF_INHIBITOR",
      latentTbScreeningPerformed: false,
      tbScreeningPositive: false,
      tbProphylaxisInitiated: false,
      hepatitisBSerologyPerformed: false,
      hepatitisBCorePositive: false,
      hbvProphylaxisInitiated: false,
    });

    assert.equal(res.engineId, "NOCTIS-RHEUM-EMERG-001");
    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-RHEUM-001/);
    assert.match(res.safetyVetoesTriggered[0], /BIOLOGICS LATENT INFECTION SCREENING MANDATE VETO/);
  });

  it("enforces CF-RHEUM-003 Hepatitis B reactivation prophylaxis veto in anti-HBc positive patient receiving Rituximab", () => {
    const res = evaluateBiologicSafety({
      candidateAgent: "RITUXIMAB",
      latentTbScreeningPerformed: true,
      tbScreeningPositive: false,
      tbProphylaxisInitiated: false,
      hepatitisBSerologyPerformed: true,
      hepatitisBCorePositive: true,
      hbvProphylaxisInitiated: false, // Omission!
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-RHEUM-003/);
    assert.match(res.safetyVetoesTriggered[0], /HEPATITIS B REACTIVATION PROPHYLAXIS VETO/);
    assert.match(res.safetyVetoesTriggered[0], /Entecavir or Tenofovir/);
  });

  it("enforces CF-RHEUM-004 high-dose corticosteroid veto in diffuse cutaneous systemic sclerosis", () => {
    const res = evaluateSclerodermaRenalCrisis({
      sclerodermaSubtype: "DIFFUSE_CUTANEOUS",
      systolicBpMmhg: 130,
      diastolicBpMmhg: 80,
      acuteKidneyInjuryPresent: false,
      microangiopathicHemolyticAnemia: false,
      prednisoneDoseMgDay: 40, // High-dose steroid!
      aceInhibitorOrdered: false,
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-RHEUM-004/);
    assert.match(res.safetyVetoesTriggered[0], /SCLERODERMA HIGH-DOSE STEROID RENAL CRISIS VETO/);
  });

  it("enforces CF-RHEUM-005 ACE inhibitor mandate in Scleroderma Renal Crisis", () => {
    const res = evaluateSclerodermaRenalCrisis({
      sclerodermaSubtype: "DIFFUSE_CUTANEOUS",
      systolicBpMmhg: 175,
      diastolicBpMmhg: 110,
      acuteKidneyInjuryPresent: true,
      microangiopathicHemolyticAnemia: true,
      prednisoneDoseMgDay: 10,
      aceInhibitorOrdered: false, // Omission!
    });

    assert.equal(res.safetyVetoesTriggered.length, 1);
    assert.match(res.safetyVetoesTriggered[0], /CF-RHEUM-005/);
    assert.match(res.safetyVetoesTriggered[0], /SCLERODERMA RENAL CRISIS ACE INHIBITOR MANDATE/);
    assert.match(res.safetyVetoesTriggered[0], /Captopril/);
  });

  it("handles natural query parsing for scleroderma with high-dose steroids", () => {
    const output = handleNaturalRheumatologyQuery("Diffuse scleroderma patient started on prednisone 40 mg for joint pain");
    assert.ok(output);
    assert.match(output, /CF-RHEUM-004/);
    assert.match(output, /SCLERODERMA HIGH-DOSE STEROID RENAL CRISIS VETO/);
  });
});
