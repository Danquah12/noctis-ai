import { test, describe } from "node:test";
import assert from "node:assert";
import {
  evaluatePocusResuscitation,
  formatPocusSpokenSummary,
  POCUS_PRESET_TENSION_PTX,
  POCUS_PRESET_TAMPONADE,
  POCUS_PRESET_RUPTURED_AAA,
  POCUS_PRESET_CARDIOGENIC_OVERLOAD,
} from "./noctis-pocus-resuscitation.ts";

describe("Noctis Point-of-Care Ultrasound (POCUS) & Resuscitation Engine (Track 22)", () => {
  test("trips CF-POCUS-001 (Tension Pneumothorax Veto) and prohibits sending unstable patient to CT", () => {
    const report = evaluatePocusResuscitation(POCUS_PRESET_TENSION_PTX);

    assert.strictEqual(report.shockEtiologyLikelihood, "OBSTRUCTIVE_TENSION_PTX");
    assert.strictEqual(report.blueProfileClassification, "PNEUMOTHORAX_NO_SLIDING_WITH_LUNG_POINT");
    assert.strictEqual(report.eFastSummary.pneumothoraxDetected, true);
    assert.ok(report.trippedInvariants.includes("CF-POCUS-001"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("TENSION PNEUMOTHORAX IMMEDIATE DECOMPRESSION VETO") && a.includes("DO NOT SEND TO RADIOLOGY")
      )
    );
  });

  test("trips CF-POCUS-002 (Cardiac Tamponade Veto) on RV diastolic collapse and plethoric IVC", () => {
    const report = evaluatePocusResuscitation(POCUS_PRESET_TAMPONADE);

    assert.strictEqual(report.shockEtiologyLikelihood, "OBSTRUCTIVE_TAMPONADE");
    assert.strictEqual(report.eFastSummary.pericardialTamponadeSigns, true);
    assert.strictEqual(report.ivcVolumeStatus, "PLETHORIC_OVERLOAD_OR_OBSTRUCTIVE");
    assert.ok(report.trippedInvariants.includes("CF-POCUS-002"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("CARDIAC TAMPONADE IMMEDIATE PERICARDIOCENTESIS VETO")
      )
    );
  });

  test("trips CF-POCUS-003 (Ruptured AAA Veto) when aorta >= 5.0 cm with shock and bans CT scan delay", () => {
    const report = evaluatePocusResuscitation(POCUS_PRESET_RUPTURED_AAA);

    assert.strictEqual(report.shockEtiologyLikelihood, "HEMORRHAGIC_HYPOVOLEMIC");
    assert.ok(report.trippedInvariants.includes("CF-POCUS-003"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("RUPTURED ABDOMINAL AORTIC ANEURYSM (AAA) VETO") && a.includes("Operating Room")
      )
    );
  });

  test("trips CF-POCUS-004 (Cardiogenic Fluid Overload Harm Veto) when fluid bolus is ordered in severe LV failure", () => {
    const report = evaluatePocusResuscitation(POCUS_PRESET_CARDIOGENIC_OVERLOAD);

    assert.strictEqual(report.shockEtiologyLikelihood, "CARDIOGENIC");
    assert.strictEqual(report.blueProfileClassification, "B_PROFILE_CARDIOGENIC_PULMONARY_EDEMA");
    assert.ok(report.trippedInvariants.includes("CF-POCUS-004"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("CARDIOGENIC FLUID OVERLOAD HARM VETO") && a.includes("pulmonary edema")
      )
    );
  });

  test("formats zero-truncation spoken audio summary with clinical precision", () => {
    const report = evaluatePocusResuscitation(POCUS_PRESET_TAMPONADE);
    const spoken = formatPocusSpokenSummary(report);

    assert.ok(spoken.includes("Angela Morris"));
    assert.ok(spoken.includes("obstructive tamponade"));
    assert.ok(spoken.includes("plethoric overload or obstructive"));
    assert.ok(spoken.includes("CF-POCUS-002"));
  });
});
