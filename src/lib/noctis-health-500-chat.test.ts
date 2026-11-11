import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isHealth500Query,
  resolveSpecialtyFromQuery,
  getHealth500FlagshipCase,
  handleNaturalHealth500Query,
  FLAGSHIP_BENCHMARK_CASES,
} from "./noctis-health-500-chat.ts";

describe("Noctis Health 500 Chat Intelligence Engine", () => {
  it("should correctly identify Health 500 benchmark queries", () => {
    assert.strictEqual(
      isHealth500Query("Evaluate patient case in NEUROLOGY using Noctis Health 500 protocol."),
      true
    );
    assert.strictEqual(
      isHealth500Query("[Noctis Health 500 Clinical Benchmark Case NH-EM-004 - NEUROLOGY] Evaluate patient case"),
      true
    );
    assert.strictEqual(
      isHealth500Query("Run evaluation on case NH-CARD-001"),
      true
    );
    assert.strictEqual(
      isHealth500Query("What is the weather today in Boston?"),
      false
    );
  });

  it("should resolve clinical specialties correctly", () => {
    assert.strictEqual(resolveSpecialtyFromQuery("Evaluate case in NEUROLOGY"), "NEUROLOGY");
    assert.strictEqual(resolveSpecialtyFromQuery("Case in CARDIOLOGY"), "CARDIOLOGY");
    assert.strictEqual(resolveSpecialtyFromQuery("Emergency case with acute appendicitis"), "EMERGENCY_MEDICINE");
    assert.strictEqual(resolveSpecialtyFromQuery("Infectious disease meningitis"), "INFECTIOUS_DISEASES");
    assert.strictEqual(resolveSpecialtyFromQuery("DKA endocrine crisis"), "ENDOCRINOLOGY");
    assert.strictEqual(resolveSpecialtyFromQuery("Severe hyperkalemia renal failure"), "NEPHROLOGY");
  });

  it("should have flagship cases configured for all 15 clinical specialties", () => {
    const specialties = [
      "EMERGENCY_MEDICINE", "CARDIOLOGY", "NEUROLOGY", "INFECTIOUS_DISEASES", "CRITICAL_CARE",
      "GASTROENTEROLOGY_HEPATOLOGY", "RESPIRATORY_MEDICINE", "NEPHROLOGY", "ENDOCRINOLOGY",
      "HEMATOLOGY_ONCOLOGY", "OBSTETRICS_GYNECOLOGY", "PEDIATRICS_NEONATOLOGY", "TOXICOLOGY",
      "PSYCHIATRY", "DERMATOLOGY_RHEUMATOLOGY"
    ];
    for (const spec of specialties) {
      const c = FLAGSHIP_BENCHMARK_CASES[spec as keyof typeof FLAGSHIP_BENCHMARK_CASES];
      assert.ok(c, `Missing flagship case for ${spec}`);
      assert.ok(c.caseId.startsWith("NH-"));
      assert.ok(c.primaryDiagnosis.length > 5);
      assert.ok(c.icd10.length > 2);
      assert.ok(c.criticalActions.length >= 3);
      assert.ok(c.contraindications.length >= 1);
    }
  });

  it("should generate full gold-standard consultation for user's prompt", () => {
    const userPrompt = "Evaluate patient case in NEUROLOGY using Noctis Health 500 protocol.";
    const result = handleNaturalHealth500Query(userPrompt);
    assert.ok(result, "Expected non-null response");
    assert.ok(result.includes("Noctis Health 500 Benchmark Dossier — NEUROLOGY"));
    assert.ok(result.includes("NH-EM-004"));
    assert.ok(result.includes("Acute Ischemic Stroke with Left M1 MCA Large Vessel Occlusion"));
    assert.ok(result.includes("I63.9"));
    assert.ok(result.includes("182/104"));
    assert.ok(result.includes("NIHSS score 16"));
    assert.ok(result.includes("Tenecteplase"));
    assert.ok(result.toLowerCase().includes("endovascular mechanical thrombectomy"));
    assert.ok(result.includes("TIER: EXEMPLARY_GOLD_STANDARD"));
  });

  it("should evaluate candidate reasoning with safety check", () => {
    const candidatePrompt = `Evaluate case in NEUROLOGY using Noctis Health 500 protocol.
Candidate Reasoning: The patient has acute stroke. Give tPA immediately without CT scan.`;
    const result = handleNaturalHealth500Query(candidatePrompt);
    assert.ok(result);
    assert.ok(result.includes("CRITICAL PATIENT SAFETY FAILURE TRIGGERED (CF-STR-001)"));
    assert.ok(result.includes("0 / 100"));
  });

  it("should trigger CF-AOR-001 veto on tearing chest pain with aspirin and heparin orders", () => {
    const aorticPrompt = `A 52-year-old male presents to the resuscitation bay with sudden-onset hyperacute tearing substernal chest pain radiating into the interscapular back. Initial vital signs: BP 192/104 mmHg in the right arm, 118/68 mmHg in the left arm, HR 108 bpm, SpO2 97%. The 12-lead ECG demonstrates 2.5 mm ST-segment elevation in leads II, III, and aVF with reciprocal depressions in I and aVL. The resident physician wants to administer a 300 mg Aspirin chewable, 5,000 units IV unfractionated Heparin, and call an emergency STEMI Code for immediate cath lab activation. How does Noctis evaluate this order under its Clinical Decision Support safety invariants?`;
    const result = handleNaturalHealth500Query(aorticPrompt);
    assert.ok(result);
    assert.ok(result.includes("CRITICAL PATIENT SAFETY FAILURE TRIGGERED (CF-AOR-001)"));
    assert.ok(result.includes("0 / 100"));
    assert.ok(result.includes("Acute Stanford Type A"));
    assert.ok(result.includes("anti-impulse therapy"));
  });

  it("should trigger CF-ARD-001 veto on ARDS order attempting to increase tidal volume to 650 mL", () => {
    const ardsPrompt = `A 44-year-old female (height: 5 ft 3 in / 160 cm, actual body weight: 88 kg) with severe bacterial pneumonia is intubated in the ICU for acute hypoxemic respiratory failure. Arterial Blood Gas on FiO2 0.80 and PEEP 14 cmH2O: pH 7.24, PaCO2 56 mmHg, PaO2 62 mmHg, HCO3- 23 mEq/L. The bedside ventilator is set to Volume Control: Tidal Volume (Vt) 550 mL, Respiratory Rate 18 bpm, measured Plateau Pressure (Pplat) 36 cmH2O, and Peak Inspiratory Pressure (Ppeak) 44 cmH2O. The resident wants to increase the tidal volume to 650 mL to blow off the CO2 and treat the respiratory acidosis. How does Noctis evaluate this order under ARDSNet lung-protective ventilation invariants, what is the exact Predicted Body Weight (PBW) calculation, what is the driving pressure, and what immediate ventilator changes must be made?`;
    const result = handleNaturalHealth500Query(ardsPrompt);
    assert.ok(result);
    assert.ok(result.includes("CRITICAL CARE"));
    assert.ok(result.includes("NH-CC-001"));
    assert.ok(result.includes("CRITICAL PATIENT SAFETY FAILURE TRIGGERED (CF-ARD-001)"));
    assert.ok(result.includes("0 / 100"));
    assert.ok(result.includes("Lung-protective mechanical ventilation"));
  });
});
