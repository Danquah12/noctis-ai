/**
 * NOCTIS HEALTH 500 REAL-TIME AMBIENT CLINICAL DICTATION ENGINE TESTS
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  extractClinicalEntitiesFromTranscript,
  synthesizeAmbientToDossier,
  CURATED_AMBIENT_PRESETS,
} from "./noctis-ambient-dictation.ts";

describe("Noctis Ambient Clinical Dictation Engine", () => {
  it("extracts clinical vitals, demographics, and symptoms accurately from ambient speech", () => {
    const rawSpeech = `
      Patient is a 68-year-old female presenting with sudden onset right-sided weakness and difficulty speaking.
      Symptoms began 75 minutes ago.
      Bedside vitals: blood pressure 182/104 mmHg, heart rate 88 bpm, respiratory rate 16 breaths per minute,
      temperature 36.8 degrees Celsius, oxygen saturation 98% on room air, blood glucose 118 mg/dL.
      Exam shows severe right facial droop and expressive aphasia.
      Suspecting acute MCA stroke.
    `;

    const extracted = extractClinicalEntitiesFromTranscript(rawSpeech);

    assert.strictEqual(extracted.patientAge, 68);
    assert.strictEqual(extracted.biologicalSex, "FEMALE");
    assert.strictEqual(extracted.vitals.bloodPressure, "182/104");
    assert.strictEqual(extracted.vitals.heartRateBpm, 88);
    assert.strictEqual(extracted.vitals.respiratoryRatePerMin, 16);
    assert.strictEqual(extracted.vitals.temperatureCelsius, 36.8);
    assert.strictEqual(extracted.vitals.spo2Percent, 98);
    assert.strictEqual(extracted.vitals.bloodGlucoseMgDl, 118);
    assert.strictEqual(extracted.detectedSpecialty, "NEUROLOGY");
    assert.strictEqual(extracted.icd10Candidate, "I63.9");
  });

  it("screens for tripped safety invariants in real-time dictations", () => {
    const dkaUnsafeSpeech = `
      We have a 24yo female with DKA and severe dehydration.
      Her potassium is 3.1 mEq/L and blood glucose is 540.
      Let's start IV insulin infusion right away.
    `;

    const extracted = extractClinicalEntitiesFromTranscript(dkaUnsafeSpeech);

    assert.strictEqual(extracted.detectedSpecialty, "ENDOCRINOLOGY");
    assert.strictEqual(extracted.criticalTrippedInvariants.length > 0, true);
    assert.strictEqual(extracted.criticalTrippedInvariants[0].code, "CF-DKA-001");
    assert.ok(extracted.criticalTrippedInvariants[0].risk.includes("fatal cardiac"));
  });

  it("synthesizes a compliant 7-section gold-standard dossier with 3-column reference table and warning box", () => {
    const strokePreset = CURATED_AMBIENT_PRESETS[0];
    const { flagshipSummary, goldDossier } = synthesizeAmbientToDossier(strokePreset.rawTranscript);

    assert.strictEqual(flagshipSummary.specialty, "NEUROLOGY");
    assert.strictEqual(flagshipSummary.ageYears, 68);
    assert.strictEqual(flagshipSummary.vitals.bloodPressure, "182/104");

    // Section 1 Verification (3-column Structured Reference Table matching Image 1)
    assert.ok(goldDossier.includes("1. Clinical Presentation & Baseline Physiological Profile"));
    assert.ok(goldDossier.includes("| Patient Parameter | Documented Clinical Value | Physiological Significance & Localization |"));
    assert.ok(goldDossier.includes("| Patient Profile | 68-year-old female | Demographic and epidemiological baseline |"));
    assert.ok(goldDossier.includes("| Bedside Vitals |"));

    // Section 3 Verification (Differential Hierarchy)
    assert.ok(goldDossier.includes("3. Evidence-Weighted Differential Diagnosis Hierarchy"));
    assert.ok(goldDossier.includes("🚨 PRIMARY GOLD-STANDARD DIAGNOSIS"));

    // Section 5 Verification (Safety Invariant Warning Box matching Image 2)
    assert.ok(goldDossier.includes("5. Critical Patient Safety Invariants & Contraindication Checklist"));
    assert.ok(goldDossier.includes("> [!WARNING]"));
    assert.ok(goldDossier.includes("> MANDATORY PATIENT SAFETY INVARIANTS"));
    assert.ok(goldDossier.includes("> - CONTRAINDICATION:"));

    // Section 6 & 7 Verification (Regulatory & Objective Scorecard)
    assert.ok(goldDossier.includes("6. Regulatory Framework Compliance (21 U.S.C. § 360j(o)(1)(E))"));
    assert.ok(goldDossier.includes("7. Noctis Health 500 Objective Benchmark Scorecard (Gold Standard Specification)"));
  });

  it("handles all curated clinical ambient presets without throwing", () => {
    for (const preset of CURATED_AMBIENT_PRESETS) {
      const { flagshipSummary, goldDossier } = synthesizeAmbientToDossier(preset.rawTranscript);
      assert.ok(flagshipSummary.caseId.startsWith("AMB-"));
      assert.strictEqual(flagshipSummary.specialty, preset.specialty);
      assert.ok(goldDossier.length > 500);
    }
  });
});
