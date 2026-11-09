import { test, describe } from "node:test";
import assert from "node:assert";
import {
  interpretViscoelasticTeg,
  evaluateMassiveTransfusion,
  formatMtpSpokenSummary,
  MTP_PRESET_LETHAL_TRIAD,
  MTP_PRESET_DELAYED_TXA,
  type MtpPatientProfile,
} from "./noctis-massive-transfusion.ts";

describe("Noctis Massive Transfusion Protocol (MTP) & Viscoelastic Hemostasis Engine (Track 25)", () => {
  test("interprets viscoelastic TEG 6s parameters into targeted component directives", () => {
    const teg = interpretViscoelasticTeg(MTP_PRESET_LETHAL_TRIAD);

    assert.strictEqual(teg.plasmaDeficiency, true);
    assert.strictEqual(teg.fibrinogenDeficiency, true);
    assert.strictEqual(teg.plateletDeficiency, true);
    assert.strictEqual(teg.hyperfibrinolysisPresent, true);
    assert.ok(teg.recommendedBloodProducts.some((r) => r.includes("Fresh Frozen Plasma")));
    assert.ok(teg.recommendedBloodProducts.some((r) => r.includes("Cryoprecipitate")));
    assert.ok(teg.recommendedBloodProducts.some((r) => r.includes("Platelets")));
    assert.ok(teg.recommendedBloodProducts.some((r) => r.includes("Tranexamic Acid")));
  });

  test("trips CF-MTP-001 (Crystalloid Drowning Veto) when crystalloid infusion exceeds 2000 mL in trauma shock", () => {
    const report = evaluateMassiveTransfusion(MTP_PRESET_LETHAL_TRIAD);

    assert.ok(report.trippedInvariants.includes("CF-MTP-001"));
    assert.strictEqual(report.crystalloidRatioAlert, true);
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("EXSANGUINATING CRYSTALLOID DROWNING VETO") && a.includes("1:1:1")
      )
    );
  });

  test("trips CF-MTP-002 (Citrate Hypocalcemia Veto) when ionized calcium is < 0.90 mmol/L", () => {
    const report = evaluateMassiveTransfusion(MTP_PRESET_LETHAL_TRIAD);

    assert.ok(report.trippedInvariants.includes("CF-MTP-002"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("CITRATE-INDUCED HYPOCALCEMIA VETO") && a.includes("Calcium Chloride 1g IV")
      )
    );
  });

  test("trips CF-MTP-003 (Delayed TXA Harm Veto) when TXA is prescribed > 3 hours post-injury", () => {
    const report = evaluateMassiveTransfusion(MTP_PRESET_DELAYED_TXA);

    assert.ok(report.trippedInvariants.includes("CF-MTP-003"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("DELAYED TRANEXAMIC ACID (TXA) HARM VETO") && a.includes("CRASH-2")
      )
    );
  });

  test("trips CF-MTP-004 (Lethal Triad of Death Veto) in concurrent hypothermia, acidosis, and coagulopathy", () => {
    const report = evaluateMassiveTransfusion(MTP_PRESET_LETHAL_TRIAD);

    assert.ok(report.trippedInvariants.includes("CF-MTP-004"));
    assert.strictEqual(report.lethalTriadActive, true);
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("TRAUMA LETHAL TRIAD OF DEATH VETO") && a.includes("Damage Control Surgery")
      )
    );
  });

  test("formats zero-truncation spoken audio summary with clinical precision", () => {
    const report = evaluateMassiveTransfusion(MTP_PRESET_LETHAL_TRIAD);
    const spoken = formatMtpSpokenSummary(report);

    assert.ok(spoken.includes("Jackson Miller"));
    assert.ok(spoken.includes("Trauma lethal triad of death is actively present"));
    assert.ok(spoken.includes("Fresh Frozen Plasma"));
    assert.ok(spoken.includes("CF-MTP-001"));
  });
});
