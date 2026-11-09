import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRumackMatthewThreshold,
  calculateNac3BagRegimen,
  calculateDigiFabVials,
  classifyToxidrome,
  evaluateToxicologyCase,
  formatToxicologySpokenSummary,
  TOX_PRESET_APAP_DELAYED,
  TOX_PRESET_CCB_SHOCK,
  TOX_PRESET_SEROTONIN_SYNDROME,
  TOX_PRESET_BENZO_CHRONIC,
} from "./noctis-toxicology.ts";

describe("Noctis Clinical Toxicology & Emergency Toxidrome Engine", () => {
  it("calculates Rumack-Matthew nomogram 150-treatment line correctly across hours", () => {
    // 4 hours: exactly 150 mcg/mL
    assert.strictEqual(calculateRumackMatthewThreshold(4), 150.0);

    // 8 hours (1 half-life = 4h): 75.0 mcg/mL
    assert.strictEqual(calculateRumackMatthewThreshold(8), 75.0);

    // 12 hours (2 half-lives = 8h): 37.5 mcg/mL
    assert.strictEqual(calculateRumackMatthewThreshold(12), 37.5);

    // 16 hours (3 half-lives): 18.8 mcg/mL
    assert.strictEqual(calculateRumackMatthewThreshold(16), 18.8);
  });

  it("calculates weight-based 3-bag IV NAC infusion protocol accurately", () => {
    // 70 kg patient
    const nac = calculateNac3BagRegimen(70);
    assert.strictEqual(nac.totalDoseMg, 21000); // 300 mg/kg * 70 = 21,000 mg
    assert.ok(nac.loadingBag.includes("10,500 mg")); // 150 mg/kg * 70 = 10,500 mg
    assert.ok(nac.secondBag.includes("3,500 mg")); // 50 mg/kg * 70 = 3,500 mg
    assert.ok(nac.thirdBag.includes("7,000 mg")); // 100 mg/kg * 70 = 7,000 mg

    // Capping at 100 kg for fluid safety
    const nac120 = calculateNac3BagRegimen(120);
    assert.strictEqual(nac120.totalDoseMg, 30000); // Capped at 100kg -> 30,000 mg
  });

  it("calculates DigiFab vials for acute ingestion and steady-state serum levels", () => {
    // Acute ingestion of 10 mg Digoxin: 10 / 0.5 = 20 vials
    const vialsAcute = calculateDigiFabVials({ ingestedDoseMg: 10 });
    assert.strictEqual(vialsAcute, 20);

    // Steady-state serum level 5.2 ng/mL in 70 kg patient: (5.2 * 70) / 100 = 3.64 -> 4 vials
    const vialsSerum = calculateDigiFabVials({ serumDigoxinNgPerMl: 5.2, weightKg: 70 });
    assert.strictEqual(vialsSerum, 4);
  });

  it("classifies Hunter criteria positive Serotonin Syndrome and differentiates from NMS", () => {
    const reportSS = evaluateToxicologyCase(TOX_PRESET_SEROTONIN_SYNDROME);
    assert.strictEqual(reportSS.detectedToxidrome, "SEROTONIN_SYNDROME");
    assert.ok(reportSS.clinicalFindings[0].includes("Hunter"));
    assert.ok(reportSS.immediateAntidoteDirectives.some((d) => d.includes("CYPROHEPTADINE")));

    // Lead pipe rigidity and extreme temp gives NMS
    const nmsPatient = {
      ...TOX_PRESET_SEROTONIN_SYNDROME,
      neuromuscular: "LEAD_PIPE_RIGIDITY" as const,
      temperatureCelsius: 40.1,
    };
    const reportNMS = evaluateToxicologyCase(nmsPatient);
    assert.strictEqual(reportNMS.detectedToxidrome, "NEUROLEPTIC_MALIGNANT_SYNDROME");
    assert.ok(reportNMS.immediateAntidoteDirectives.some((d) => d.includes("DANTROLENE")));
  });

  it("trips CF-TOX-001 (Flumazenil Contraindication Veto) in chronic benzodiazepine user", () => {
    const report = evaluateToxicologyCase(TOX_PRESET_BENZO_CHRONIC);
    assert.ok(report.trippedInvariants.includes("CF-TOX-001"), "Must trip CF-TOX-001");
    assert.ok(report.mandatoryActions[0].includes("FLUMAZENIL CONTRAINDICATION VETO"));
    assert.ok(report.mandatoryActions[0].includes("status epilepticus"));
  });

  it("evaluates delayed APAP overdose, recommends NAC and trips CF-TOX-002", () => {
    const report = evaluateToxicologyCase(TOX_PRESET_APAP_DELAYED);
    assert.ok(report.rumackMatthew?.treatmentIndicated, "Treatment must be indicated for 140 mcg/mL at 10h");
    assert.ok(report.trippedInvariants.includes("CF-TOX-002"), "Must trip CF-TOX-002 for presentation > 8h");
    assert.ok(report.mandatoryActions.some((a) => a.includes("DELAYED NAC HEPATOTOXICITY VETO")));
  });

  it("triggers High-Dose Insulin Euglycemia Therapy (HIET) and Intralipid in CCB shock", () => {
    const report = evaluateToxicologyCase(TOX_PRESET_CCB_SHOCK);
    assert.strictEqual(report.highDoseInsulinIndicated, true);
    assert.ok(report.immediateAntidoteDirectives.some((d) => d.includes("HIGH-DOSE INSULIN")));
    assert.ok(report.immediateAntidoteDirectives.some((d) => d.includes("INTRALIPID 20%")));
  });

  it("formats zero-truncation spoken audio summary with clinical precision", () => {
    const report = evaluateToxicologyCase(TOX_PRESET_APAP_DELAYED);
    const spoken = formatToxicologySpokenSummary(report);
    assert.ok(spoken.includes("Rumack-Matthew treatment threshold is"));
    assert.ok(spoken.includes("CF-TOX-002"));
    assert.ok(spoken.includes("N-ACETYLCYSTEINE"));
  });
});
