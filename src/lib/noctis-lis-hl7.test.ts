import test from "node:test";
import assert from "node:assert/strict";
import {
  parseHl7OruR01,
  formatLisSpokenSummary,
  convertLisBatchToStructuredTable,
  HL7_PRESET_SEPSIS_DKA,
  HL7_PRESET_STEMI_TROPONIN,
  HL7_PRESET_CRITICAL_THROMBOCYTOPENIA,
  HL7_PRESET_NORMAL_BASELINE,
} from "./noctis-lis-hl7.ts";

test("Noctis Clinical Laboratory LIS Ingestion Engine", async (t) => {
  await t.test("parses Sepsis/DKA HL7 v2.5.1 message and trips severe metabolic invariants", () => {
    const batch = parseHl7OruR01(HL7_PRESET_SEPSIS_DKA);

    assert.equal(batch.patient.patientName, "MARCUS CHEVALLIER");
    assert.equal(batch.patient.mrn, "MRN-789021");
    assert.equal(batch.orders.length, 3); // CMP, ABG, CBC

    // Check critical panics
    const panicIdentifiers = batch.criticalPanics.map((p) => p.identifier);
    assert.ok(panicIdentifiers.includes("K"), "Must detect critical hyperkalemia (K 6.4)");
    assert.ok(panicIdentifiers.includes("GLU"), "Must detect critical hyperglycemia (GLU 485)");
    assert.ok(panicIdentifiers.includes("CREAT"), "Must detect KDIGO Stage 3 AKI (Cr 4.2)");
    assert.ok(panicIdentifiers.includes("PH"), "Must detect severe acidemia (pH 7.12)");
    assert.ok(panicIdentifiers.includes("LACTATE"), "Must detect septic shock lactic acidosis (Lactate 4.8)");
    assert.ok(panicIdentifiers.includes("WBC"), "Must detect severe leukocytosis (WBC 26.8)");

    // Anion gap check: Na (131) - (Cl (94) + HCO3 (8)) = 131 - 102 = 29
    assert.equal(batch.anionGap, 29);
    assert.ok(batch.trippedInvariants.includes("CF-AGAP-001"), "Must trip elevated anion gap invariant");
    assert.ok(batch.trippedInvariants.includes("CF-HYPERK-001"), "Must trip hyperkalemia invariant");
    assert.ok(batch.trippedInvariants.includes("CF-SEP-001"), "Must trip sepsis resuscitation bundle invariant");
  });

  await t.test("evaluates high-sensitivity troponin 0/1h delta protocol and trips ESC rule-in invariant", () => {
    const batch = parseHl7OruR01(HL7_PRESET_STEMI_TROPONIN);

    assert.equal(batch.patient.patientName, "ELEANOR THOMPSON");
    assert.ok(batch.deltaTroponin, "Must calculate serial troponin delta");
    assert.equal(batch.deltaTroponin.baseline, 12);
    assert.equal(batch.deltaTroponin.current, 148);
    assert.equal(batch.deltaTroponin.ruleIn, true, "148 ng/L exceeds 52 ng/L ESC rule-in");
    assert.ok(batch.trippedInvariants.includes("CF-ACS-001"), "Must trip acute coronary syndrome invariant");
  });

  await t.test("detects fatal spontaneous bleeding risk in critical thrombocytopenia", () => {
    const batch = parseHl7OruR01(HL7_PRESET_CRITICAL_THROMBOCYTOPENIA);

    assert.equal(batch.patient.patientName, "ROBERTO VAZQUEZ");
    const pltObs = batch.criticalPanics.find((p) => p.identifier === "PLT");
    assert.ok(pltObs, "Must catch critical platelet count");
    assert.equal(pltObs.value, "12");
    assert.equal(pltObs.status, "CRITICAL_LOW");
    assert.ok(batch.trippedInvariants.includes("CF-PLT-001"), "Must trip critical thrombocytopenia invariant");
  });

  await t.test("parses normal baseline panel with zero panics", () => {
    const batch = parseHl7OruR01(HL7_PRESET_NORMAL_BASELINE);

    assert.equal(batch.criticalPanics.length, 0, "Normal panel must have 0 panics");
    assert.equal(batch.trippedInvariants.length, 0, "Normal panel must have 0 tripped invariants");
    assert.equal(batch.anionGap, 10); // 140 - (104 + 26) = 10
  });

  await t.test("generates full-fidelity structured reference table and zero-truncation audio summary", () => {
    const batch = parseHl7OruR01(HL7_PRESET_SEPSIS_DKA);
    const table = convertLisBatchToStructuredTable(batch);

    assert.ok(table.length >= 10, "Should generate rows for all lab parameters + anion gap");
    const kRow = table.find((r) => r.parameter.includes("Potassium"));
    assert.ok(kRow, "Table must include Potassium");
    assert.equal(kRow.value, "6.4 mmol/L");

    const spoken = formatLisSpokenSummary(batch);
    assert.ok(spoken.includes("MARCUS CHEVALLIER"), "Audio must include patient name");
    assert.ok(spoken.includes("Potassium, Serum is 6.4 mmol/L"), "Audio must include exact lab and unit");
    assert.ok(spoken.includes("Lactate, Blood is 4.8 mmol/L"), "Audio must pronounce lactate");
    assert.ok(spoken.includes("29 millimoles per liter"), "Audio must state anion gap");
  });
});
