import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAllBenchmarkCases,
  getCaseById,
  evaluateCaseAgainstScorecard,
  type EmergencyCaseScenario,
} from "./noctis-emergency-30-benchmark.ts";

describe("Noctis Emergency Medicine 30-Case Clinical Benchmark Suite", () => {
  const cases = getAllBenchmarkCases();

  it("Benchmark Integrity: Loads all 30 clinical emergency cases across 7 domains", () => {
    assert.equal(cases.length, 30, "Benchmark must contain exactly 30 structured cases");

    const domains = new Set(cases.map((c) => c.domain));
    assert.ok(domains.has("Emergency Medicine & Abdominal Emergencies"));
    assert.ok(domains.has("Cardiovascular Emergencies"));
    assert.ok(domains.has("Neurology and Neurosurgical Emergencies"));
    assert.ok(domains.has("Infectious Diseases and Sepsis"));
    assert.ok(domains.has("Respiratory Emergencies"));
    assert.ok(domains.has("Endocrinology and Metabolic Emergencies"));
    assert.ok(domains.has("Renal, Hematology and Toxicology Emergencies"));
  });

  // Verify all 30 cases against the 100% Clinical Reasoning Acceptance Scorecard
  for (const c of cases) {
    it(`Case ${c.caseId} Scorecard Verification: ${c.title} -> Achieves 100% Available Evaluation Points`, () => {
      const evaluation = evaluateCaseAgainstScorecard(c);

      assert.equal(
        evaluation.totalScorePercent,
        100,
        `Case ${c.caseId} must achieve 100% on clinical reasoning scorecard. Current: ${evaluation.totalScorePercent}%`
      );
      assert.equal(evaluation.passedAcceptanceCriteria, true);

      // Verify 8 Scorecard Sub-components
      assert.equal(evaluation.scorecardBreakdown.differentialDiagnosis, 15, "Differential Diagnosis must be 15%");
      assert.equal(evaluation.scorecardBreakdown.recognitionOfLifeThreats, 15, "Recognition of Life-Threats must be 15%");
      assert.equal(evaluation.scorecardBreakdown.clinicalScoringAccuracy, 15, "Clinical Scoring Accuracy must be 15%");
      assert.equal(evaluation.scorecardBreakdown.labAndDiagnosticInterpretation, 15, "Lab/Diagnostic must be 15%");
      assert.equal(evaluation.scorecardBreakdown.clinicalReasoningAndPrioritization, 15, "Reasoning & Prioritization must be 15%");
      assert.equal(evaluation.scorecardBreakdown.emergencyManagement, 15, "Emergency Management must be 15%");
      assert.equal(evaluation.scorecardBreakdown.recognitionOfMissingInformation, 5, "Missing Info Recognition must be 5%");
      assert.equal(evaluation.scorecardBreakdown.avoidanceOfUnsupportedConclusions, 5, "Avoidance of Unsupported Conclusions must be 5%");
    });
  }

  // Domain 1: Abdominal Emergencies Invariants
  it("Domain 1: Abdominal Emergencies -> enforces Atlanta criteria, Alvarado gating, and Charcot triad", () => {
    // Q1: Undifferentiated pain
    const q1 = getCaseById("EM-ABDOMINAL-001");
    assert.ok(q1);
    assert.ok(q1.explicitMissingInformation.some((m) => m.toLowerCase().includes("quadrant")));

    // Q3: Atlanta Criteria for Pancreatitis
    const q3 = getCaseById("EM-ABDOMINAL-003");
    assert.ok(q3);
    const atlanta = q3.clinicalScores.find((s) => s.scoreName.includes("Atlanta"));
    assert.ok(atlanta);
    assert.equal(atlanta.scoreType, "DIAGNOSTIC");

    // Q5: Charcot Triad Cholangitis
    const q5 = getCaseById("EM-ABDOMINAL-005");
    assert.ok(q5);
    assert.ok(q5.immediateManagementPlan.some((p) => p.intervention.includes("ERCP")));
  });

  // Domain 2: Cardiovascular Emergencies Invariants
  it("Domain 2: Cardiovascular Emergencies -> enforces anti-impulse therapy order and VT wide-complex rule", () => {
    // Q8: Aortic Dissection: Beta-blocker before vasodilator
    const q8 = getCaseById("EM-CARDIO-008");
    assert.ok(q8);
    assert.ok(q8.strictContraindications.some((c) => c.includes("without prior beta-blockade")));

    // Q10: Wide-complex tachycardia: Treat as VT, avoid CCBs
    const q10 = getCaseById("EM-CARDIO-010");
    assert.ok(q10);
    assert.ok(q10.strictContraindications.some((c) => c.includes("Calcium channel blockers")));
  });

  // Domain 3: Neurology Emergencies Invariants
  it("Domain 3: Neurology Emergencies -> enforces permissive hypertension in stroke and LP/CTA after negative CT in SAH", () => {
    // Q11: Acute Ischemic Stroke
    const q11 = getCaseById("EM-NEURO-011");
    assert.ok(q11);
    assert.ok(q11.contradictionsAndCaveats.some((c) => c.includes("Permissive hypertension")));

    // Q12: Subarachnoid Hemorrhage
    const q12 = getCaseById("EM-NEURO-012");
    assert.ok(q12);
    assert.ok(q12.recommendedWorkup.some((w) => w.action.includes("Lumbar Puncture")));
  });

  // Domain 4: Infectious Diseases & Sepsis Invariants
  it("Domain 4: Infectious Diseases & Sepsis -> enforces qSOFA prognostic distinction and LRINEC limitation", () => {
    // Q16: qSOFA is NOT diagnostic
    const q16 = getCaseById("EM-INFECT-016");
    assert.ok(q16);
    assert.ok(q16.contradictionsAndCaveats.some((c) => c.includes("qSOFA is a PROGNOSTIC score")));

    // Q17: LRINEC does not safely rule out Necrotizing Fasciitis
    const q17 = getCaseById("EM-INFECT-017");
    assert.ok(q17);
    assert.ok(q17.strictContraindications.some((c) => c.includes("LRINEC score to rule out")));
  });

  // Domain 5: Respiratory Emergencies Invariants
  it("Domain 5: Respiratory Emergencies -> enforces COPD 88-92% O2 target and clinical tension pneumothorax", () => {
    // Q22: COPD O2 target 88-92%
    const q22 = getCaseById("EM-RESP-022");
    assert.ok(q22);
    assert.ok(q22.immediateManagementPlan.some((p) => p.intervention.includes("88–92%")));

    // Q23: Tension Pneumothorax: No delay for imaging
    const q23 = getCaseById("EM-RESP-023");
    assert.ok(q23);
    assert.ok(q23.contradictionsAndCaveats.some((c) => c.includes("NEVER DELAY EMERGENCY DECOMPRESSION FOR A CHEST RADIOGRAPH")));
  });

  // Domain 6: Endocrinology & Metabolism Invariants
  it("Domain 6: Endocrinology & Metabolism -> enforces potassium gating before insulin and adrenal crisis hydrocortisone", () => {
    // Q24: DKA potassium gate
    const q24 = getCaseById("EM-ENDO-024");
    assert.ok(q24);
    assert.ok(q24.contradictionsAndCaveats.some((c) => c.includes("Potassium is < 3.3")));

    // Q26: Adrenal Crisis: Do not wait for labs
    const q26 = getCaseById("EM-ENDO-026");
    assert.ok(q26);
    assert.ok(q26.contradictionsAndCaveats.some((c) => c.includes("NEVER WAIT FOR CORTISOL")));
  });

  // Domain 7: Renal, Hematology & Toxicology Invariants
  it("Domain 7: Renal, Hematology & Toxicology -> enforces hyperkalemia membrane stabilization and TTP platelet contraindication", () => {
    // Q27: Hyperkalemia: Calcium first
    const q27 = getCaseById("EM-TOX-027");
    assert.ok(q27);
    assert.ok(q27.immediateManagementPlan.some((p) => p.intervention.includes("Calcium Gluconate")));

    // Q28: TTP: Platelets strictly contraindicated
    const q28 = getCaseById("EM-TOX-028");
    assert.ok(q28);
    assert.ok(q28.strictContraindications.some((c) => c.includes("Platelet transfusions are STRICTLY CONTRAINDICATED")));
  });
});
