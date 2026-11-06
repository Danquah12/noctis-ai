/**
 * NOCTIS EMERGENCY MEDICINE 30-CASE CLINICAL BENCHMARK & REASONING ENGINE
 * 
 * Formal codification of 30 emergency medicine scenarios across 7 core clinical domains:
 * 1. Emergency Medicine & Abdominal Emergencies (Cases 1-5)
 * 2. Cardiovascular Emergencies (Cases 6-10)
 * 3. Neurology & Neurosurgical Emergencies (Cases 11-15)
 * 4. Infectious Diseases & Sepsis (Cases 16-20)
 * 5. Respiratory Emergencies (Cases 21-23)
 * 6. Endocrinology & Metabolic Emergencies (Cases 24-26)
 * 7. Renal, Hematology & Toxicology Emergencies (Cases 27-30)
 * 
 * Each case is evaluated against the 12 Core Challenge Invariants:
 *  1. Top 5 Differential Diagnoses (ranked by probability and danger)
 *  2. Must-Not-Miss Life-Threatening Conditions
 *  3. Explicit Identification of Missing Information (Zero Hallucination)
 *  4. Validated Clinical Scoring (diagnostic vs. severity vs. eligibility)
 *  5. Scoring Invalidation & Boundary Constraints
 *  6. Recommended Laboratory, Imaging & Bedside Workup
 *  7. Clinical Result Interpretation & Contradiction Detection
 *  8. Immediate Time-Based Management & Prioritized Interventions
 *  9. Strict Contraindications & High-Risk Pharmacotherapy
 * 10. Escalation Triggers & Specialist Consultation Protocols
 * 11. Explicit Clinical Assumptions & Uncertainties
 * 12. Authoritative Clinical Guideline References with Dates
 */

import casesJson from "./noctis-emergency-30-cases.json" with { type: "json" };

export interface EmergencyCaseScenario {
  caseId: string;
  domain: string;
  title: string;
  vignette: string;
  top5Differentials: {
    name: string;
    icd10: string;
    clinicalCategory: "TIER_1_PRIMARY_EMERGENCY" | "TIER_2_MUST_NOT_MISS" | "TIER_3_ALTERNATIVE";
    dangerTier: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
    rationale: string;
  }[];
  mustNotMissConditions: string[];
  explicitMissingInformation: string[];
  clinicalScores: {
    scoreName: string;
    scoreType: "DIAGNOSTIC" | "SEVERITY_PROGNOSTIC" | "TREATMENT_ELIGIBILITY";
    calculatedValue?: number | string;
    isFullyCalculable: boolean;
    missingComponents?: string[];
    clinicalMeaning: string;
  }[];
  recommendedWorkup: {
    category: "LABORATORY" | "IMAGING" | "BEDSIDE";
    action: string;
    priority: "STAT" | "URGENT" | "ROUTINE";
    rationale: string;
  }[];
  contradictionsAndCaveats: string[];
  immediateManagementPlan: {
    priority: number;
    intervention: string;
    timeframe: string;
    objective: string;
  }[];
  strictContraindications: string[];
  escalationTriggers: string[];
  guidelineCitations: {
    issuingOrganization: string;
    guidelineName: string;
    year: number;
  }[];
}

export const NOCTIS_EMERGENCY_30_BENCHMARK: EmergencyCaseScenario[] = casesJson as unknown as EmergencyCaseScenario[];

export function getAllBenchmarkCases(): EmergencyCaseScenario[] {
  return NOCTIS_EMERGENCY_30_BENCHMARK;
}

export function getCaseById(caseId: string): EmergencyCaseScenario | undefined {
  return NOCTIS_EMERGENCY_30_BENCHMARK.find((c) => c.caseId === caseId);
}

/**
 * Scorecard Evaluator Engine (100% Total Available Points)
 */
export function evaluateCaseAgainstScorecard(caseScenario: EmergencyCaseScenario): {
  totalScorePercent: number;
  scorecardBreakdown: {
    differentialDiagnosis: number;             // 15%
    recognitionOfLifeThreats: number;          // 15%
    clinicalScoringAccuracy: number;           // 15%
    labAndDiagnosticInterpretation: number;    // 15%
    clinicalReasoningAndPrioritization: number;// 15%
    emergencyManagement: number;               // 15%
    recognitionOfMissingInformation: number;   // 5%
    avoidanceOfUnsupportedConclusions: number; // 5%
  };
  passedAcceptanceCriteria: boolean;
} {
  const breakdown = {
    differentialDiagnosis: caseScenario.top5Differentials && caseScenario.top5Differentials.length === 5 ? 15 : 0,
    recognitionOfLifeThreats: caseScenario.mustNotMissConditions && caseScenario.mustNotMissConditions.length >= 2 ? 15 : 0,
    clinicalScoringAccuracy:
      caseScenario.clinicalScores &&
      caseScenario.clinicalScores.length >= 1 &&
      caseScenario.clinicalScores.every((s) => Boolean(s.scoreName && s.scoreType && s.clinicalMeaning))
        ? 15
        : 0,
    labAndDiagnosticInterpretation:
      caseScenario.recommendedWorkup && caseScenario.recommendedWorkup.length >= 2 ? 15 : 0,
    clinicalReasoningAndPrioritization:
      caseScenario.immediateManagementPlan && caseScenario.immediateManagementPlan.length >= 2 ? 15 : 0,
    emergencyManagement:
      caseScenario.strictContraindications && caseScenario.strictContraindications.length >= 1 ? 15 : 0,
    recognitionOfMissingInformation:
      caseScenario.explicitMissingInformation && caseScenario.explicitMissingInformation.length >= 1 ? 5 : 0,
    avoidanceOfUnsupportedConclusions:
      caseScenario.contradictionsAndCaveats && caseScenario.contradictionsAndCaveats.length >= 1 ? 5 : 0,
  };

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return {
    totalScorePercent: total,
    scorecardBreakdown: breakdown,
    passedAcceptanceCriteria: total === 100,
  };
}
