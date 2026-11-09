import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCockcroftGaultCrCl,
  getSyndromeEmpiricRegimen,
  auditRenalDosing,
  evaluateAntimicrobialPlan,
  formatAntimicrobialSpokenSummary,
  ABX_PRESET_CEFEPIME_RENAL,
  ABX_PRESET_MENINGITIS,
  ABX_PRESET_ANAPHYLAXIS_CROSS_REACT,
} from "./noctis-antimicrobial-stewardship.ts";

describe("Noctis Antimicrobial Stewardship & Sepsis Guidance Engine", () => {
  it("calculates Cockcroft-Gault Creatinine Clearance for males and females accurately", () => {
    // 68yo male, 78kg, Scr 2.8 mg/dL: ((140 - 68) * 78) / (72 * 2.8) = 5616 / 201.6 = 27.85 mL/min
    const crClMale = calculateCockcroftGaultCrCl(68, 78, 2.8, "MALE");
    assert.strictEqual(crClMale, 27.9);

    // 56yo female, 64kg, Scr 0.9 mg/dL: (((140 - 56) * 64) / (72 * 0.9)) * 0.85 = (5376 / 64.8) * 0.85 = 82.96 * 0.85 = 70.5 mL/min
    const crClFemale = calculateCockcroftGaultCrCl(56, 64, 0.9, "FEMALE");
    assert.strictEqual(crClFemale, 70.5);
  });

  it("trips CF-ABX-001 (Cefepime Neurotoxicity Veto) when unadjusted dose is prescribed in renal impairment", () => {
    const report = evaluateAntimicrobialPlan(ABX_PRESET_CEFEPIME_RENAL);

    assert.ok(report.calculatedCrClMlPerMin < 30);
    assert.ok(report.trippedInvariants.includes("CF-ABX-001"), "Must trip CF-ABX-001");
    assert.ok(report.mandatoryActions[0].includes("CEFEPIME NEUROTOXICITY VETO"));
    assert.ok(report.mandatoryActions[0].includes("status epilepticus"));

    // Check adjusted recommendation
    const cefAudit = report.renalDosingAudits.find((a) => a.drugName === "Cefepime");
    assert.ok(cefAudit?.doseReductionRequired);
    assert.ok(cefAudit?.recommendedAdjustedDose.includes("1g IV Q24h") || cefAudit?.recommendedAdjustedDose.includes("2g IV Q24h"));
  });

  it("requires Ampicillin for Listeria and Dexamethasone adjuvant in meningitis age >= 50", () => {
    const report = evaluateAntimicrobialPlan(ABX_PRESET_MENINGITIS);

    assert.strictEqual(report.syndrome, "BACTERIAL_MENINGITIS");
    assert.ok(report.empiricRecommendations.primaryRegimen.some((r) => r.includes("Ampicillin 2g IV Q4h")));
    assert.ok(report.empiricRecommendations.adjuvantTherapy?.includes("Dexamethasone 10mg IV"));
    assert.strictEqual(report.trippedInvariants.length, 0);
  });

  it("trips CF-ABX-003 (Beta-Lactam Anaphylaxis Veto) when Cephalexin is prescribed in Penicillin Anaphylaxis", () => {
    const report = evaluateAntimicrobialPlan(ABX_PRESET_ANAPHYLAXIS_CROSS_REACT);

    assert.strictEqual(report.allergyCrossReactivityRisk, "HIGH_RISK_CROSS_REACTIVITY");
    assert.ok(report.trippedInvariants.includes("CF-ABX-003"), "Must trip CF-ABX-003");
    assert.ok(report.mandatoryActions[0].includes("BETA-LACTAM ANAPHYLAXIS VETO"));
    assert.ok(report.mandatoryActions[0].includes("shared R1 aminopenicillin side-chain"));
  });

  it("trips CF-ABX-002 when MRSA coverage is omitted in Septic Shock with MRSA risk", () => {
    const report = evaluateAntimicrobialPlan({
      ...ABX_PRESET_CEFEPIME_RENAL,
      proposedAntibiotics: [
        { drugName: "Cefepime", doseMg: 1000, frequencyHours: 24 }, // Only GNR, missing MRSA!
      ],
    });

    assert.ok(report.trippedInvariants.includes("CF-ABX-002"), "Must trip CF-ABX-002");
    assert.ok(report.mandatoryActions.some((a) => a.includes("CRITICAL MRSA COVERAGE OMISSION VETO")));
  });

  it("formats zero-truncation spoken audio summary with clinical precision", () => {
    const report = evaluateAntimicrobialPlan(ABX_PRESET_CEFEPIME_RENAL);
    const spoken = formatAntimicrobialSpokenSummary(report);

    assert.ok(spoken.toLowerCase().includes("cockcroft-gault creatinine clearance is"));
    assert.ok(spoken.includes("CF-ABX-001"));
    assert.ok(spoken.includes("Cefepime"));
    assert.ok(spoken.includes("adjusted to"));
  });
});
