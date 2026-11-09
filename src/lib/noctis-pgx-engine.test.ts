/**
 * NOCTIS HEALTH PHARMACOGENOMICS (PGx) TEST SUITE
 * Spec: NH500-PGX-CPIC-011
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateDrugGeneInteractions,
  formatPgxSpokenSummary,
  PGX_PATIENT_PRESETS,
} from "./noctis-pgx-engine.ts";
import { cleanVoiceText } from "./noctis-voice.ts";

describe("Noctis Pharmacogenomics (PGx) & Drug-Gene Safety Engine", () => {
  it("detects Clopidogrel resistance in CYP2C19 Poor Metabolizer and trips CF-PGX-001 invariant", () => {
    const strokePatient = PGX_PATIENT_PRESETS.STROKE_POOR_METABOLIZER;
    const alerts = evaluateDrugGeneInteractions(["Aspirin", "Clopidogrel 75mg daily", "Atorvastatin"], strokePatient);

    assert.equal(alerts.length, 1);
    const clopAlert = alerts[0];
    assert.equal(clopAlert.drugName, "Clopidogrel");
    assert.equal(clopAlert.targetGene, "CYP2C19");
    assert.equal(clopAlert.severity, "CRITICAL_CONTRAINDICATION");
    assert.equal(clopAlert.trippedSafetyInvariant, "CF-PGX-001");
    assert.ok(clopAlert.alternativeTherapies.some((t) => t.includes("Ticagrelor")));
    assert.ok(clopAlert.fdaBlackBoxWarning?.includes("Boxed Warning"));
  });

  it("detects fatal respiratory arrest risk for Codeine in CYP2D6 Ultrarapid Metabolizer and trips CF-PGX-002", () => {
    const postOpPatient = PGX_PATIENT_PRESETS.OPIOID_ULTRARAPID_METABOLIZER;
    const alerts = evaluateDrugGeneInteractions(["Codeine 30mg PO Q4H", "Cefazolin"], postOpPatient);

    assert.equal(alerts.length, 1);
    const opioidAlert = alerts[0];
    assert.equal(opioidAlert.drugName, "Codeine");
    assert.equal(opioidAlert.targetGene, "CYP2D6");
    assert.equal(opioidAlert.severity, "CRITICAL_CONTRAINDICATION");
    assert.equal(opioidAlert.trippedSafetyInvariant, "CF-PGX-002");
    assert.ok(opioidAlert.cpicRecommendation.includes("ABSOLUTE CONTRAINDICATION"));
    assert.ok(opioidAlert.alternativeTherapies.some((t) => t.includes("Hydromorphone")));
  });

  it("detects Warfarin hyper-sensitivity in CYP2C9 *3/*3 + VKORC1 AA patient and trips CF-PGX-003", () => {
    const cardioPatient = PGX_PATIENT_PRESETS.WARFARIN_HYPERSENSITIVE;
    const alerts = evaluateDrugGeneInteractions(["Warfarin 5mg daily", "Simvastatin 40mg"], cardioPatient);

    assert.equal(alerts.length, 2);

    const warfAlert = alerts.find((a) => a.drugName === "Warfarin");
    assert.ok(warfAlert);
    assert.equal(warfAlert.severity, "CRITICAL_CONTRAINDICATION");
    assert.equal(warfAlert.trippedSafetyInvariant, "CF-PGX-003");
    assert.ok(warfAlert.alternativeTherapies.some((t) => t.includes("Apixaban")));

    const statAlert = alerts.find((a) => a.drugName === "Simvastatin");
    assert.ok(statAlert);
    assert.equal(statAlert.targetGene, "SLCO1B1");
    assert.equal(statAlert.severity, "WARNING_DOSE_ADJUSTMENT");
  });

  it("permits standard pharmacotherapy in Wild-Type Normal Metabolizer with zero contraindications", () => {
    const wildType = PGX_PATIENT_PRESETS.WILD_TYPE_STANDARD;
    const alerts = evaluateDrugGeneInteractions(["Clopidogrel", "Warfarin", "Simvastatin"], wildType);

    assert.equal(alerts.length, 0);
  });

  it("formats zero-truncation spoken audio summary for clinical pharmacogenomics consultation", () => {
    const strokePatient = PGX_PATIENT_PRESETS.STROKE_POOR_METABOLIZER;
    const alerts = evaluateDrugGeneInteractions(["Clopidogrel"], strokePatient);
    const rawSpoken = formatPgxSpokenSummary(alerts, strokePatient);
    const spoken = cleanVoiceText(rawSpoken);

    assert.ok(spoken.includes("Clinical Pharmacogenomics Precision Medicine Report"));
    assert.ok(spoken.includes("CYP2C19"));
    assert.ok(spoken.includes("poor metabolizer"));
    assert.ok(spoken.includes("Clopidogrel"));
    assert.ok(spoken.includes("Ticagrelor"));
  });
});
