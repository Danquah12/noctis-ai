/**
 * NOCTIS HEALTH 500-CASE ADVANCED CLINICAL EVALUATION LIBRARY (NOCTIS-HEALTH-500)
 * Stage 1: Benchmark Architecture, Specialty Distribution & Case Evaluation Schema
 * 
 * Formal architecture defining the 500-case clinical evaluation framework across
 * 15 clinical specialties, 100 core reasoning tests, and 5 evaluation dimensions.
 */

export type ClinicalSpecialty =
  | "EMERGENCY_MEDICINE"          // 60 cases
  | "CARDIOLOGY"                   // 50 cases
  | "NEUROLOGY"                    // 45 cases
  | "INFECTIOUS_DISEASES"          // 50 cases
  | "CRITICAL_CARE"                // 45 cases
  | "GASTROENTEROLOGY_HEPATOLOGY"  // 35 cases
  | "RESPIRATORY_MEDICINE"         // 35 cases
  | "NEPHROLOGY"                   // 30 cases
  | "ENDOCRINOLOGY"                // 30 cases
  | "HEMATOLOGY_ONCOLOGY"          // 30 cases
  | "OBSTETRICS_GYNECOLOGY"        // 25 cases
  | "PEDIATRICS_NEONATOLOGY"       // 25 cases
  | "TOXICOLOGY"                   // 20 cases
  | "PSYCHIATRY"                   // 10 cases
  | "DERMATOLOGY_RHEUMATOLOGY";     // 10 cases

export const SPECIALTY_CASE_ALLOCATION: Record<ClinicalSpecialty, number> = {
  EMERGENCY_MEDICINE: 60,
  CARDIOLOGY: 50,
  NEUROLOGY: 45,
  INFECTIOUS_DISEASES: 50,
  CRITICAL_CARE: 45,
  GASTROENTEROLOGY_HEPATOLOGY: 35,
  RESPIRATORY_MEDICINE: 35,
  NEPHROLOGY: 30,
  ENDOCRINOLOGY: 30,
  HEMATOLOGY_ONCOLOGY: 30,
  OBSTETRICS_GYNECOLOGY: 25,
  PEDIATRICS_NEONATOLOGY: 25,
  TOXICOLOGY: 20,
  PSYCHIATRY: 10,
  DERMATOLOGY_RHEUMATOLOGY: 10,
};

export const TOTAL_BENCHMARK_CASES = Object.values(SPECIALTY_CASE_ALLOCATION).reduce((a, b) => a + b, 0); // 500

export type EvaluationDimension =
  | "DIAGNOSTIC_REASONING"        // Probability weighting, differential prioritization, atypical presentations
  | "EVIDENCE_INTERPRETATION"     // Progressive evidence integration, contradictory labs, multimodal synthesis
  | "CLINICAL_SAFETY_GATING"      // Red flags, medication contraindications, procedural safety gates
  | "DYNAMIC_REASSESSMENT"        // Detecting acute deterioration, response to therapy, trajectory shifting
  | "EVIDENCE_BASED_ESCALATION";  // Guideline compliance, level-of-care matching, emergent specialist mobilization

export interface ProgressiveStage {
  stageIndex: number;
  stageName: string;
  releasedFindings: string[];
  newVitalSigns?: Record<string, string | number>;
  expectedClinicalRealignment: string;
}

export interface ClinicalScoreRequirement {
  scoreName: string;
  scoreType: "DIAGNOSTIC" | "SEVERITY_PROGNOSTIC" | "TREATMENT_ELIGIBILITY";
  formula: string;
  requiredInputs: string[];
  expectedCalculation: string;
  expectedResult: string | number;
  missingDataBehavior: string; // Explains behavior if any component is missing
}

export interface CriticalFailureCondition {
  failureCode: string;
  description: string;
  clinicalHarmPotential: "DEATH" | "PERMANENT_DISABILITY" | "SEVERE_SYSTEMIC_HARM" | "UNNECESSARY_INVASIVE_PROCEDURE";
  overrideRule: "INSTANT_BENCHMARK_FAIL";
}

export interface NoctisHealth500Case {
  benchmark: "NOCTIS-HEALTH-500";
  caseId: string;
  batchId: string;
  specialty: ClinicalSpecialty;
  clinicalCategory: string;
  difficulty: "FOUNDATIONAL" | "ADVANCED" | "EXPERT_COMPLEX";
  patientProfile: {
    ageYears: number;
    biologicalSex: "MALE" | "FEMALE";
    pastMedicalHistory: string[];
    currentMedications: string[];
    allergies: string[];
  };
  initialPresentation: {
    chiefComplaint: string;
    onsetAndTimeline: string;
    symptoms: string[];
    vitals: {
      bloodPressure?: string;
      heartRateBpm?: number;
      respiratoryRatePerMin?: number;
      temperatureCelsius?: number;
      spo2Percent?: number;
      bloodGlucoseMgDl?: number;
    };
  };
  progressiveStages: ProgressiveStage[];
  goldStandard: {
    primaryDiagnosis: string;
    icd10: string;
    clinicalRationale: string;
    rankedDifferential: {
      rank: number;
      condition: string;
      tier: "TIER_1_PRIMARY_EMERGENCY" | "TIER_2_MUST_NOT_MISS" | "TIER_3_ALTERNATIVE";
      probabilityPercent: number;
      dangerRating: "CRITICAL" | "HIGH" | "MODERATE";
    }[];
    clinicalScores: ClinicalScoreRequirement[];
    expectedInvestigations: {
      priority: "STAT" | "URGENT" | "ROUTINE";
      testName: string;
      modality: "LABORATORY" | "IMAGING" | "BEDSIDE";
      rationale: string;
    }[];
    expectedManagement: {
      immediateInterventions: string[];
      definitiveTherapy: string[];
      escalationLevel: "EMERGENCY_OR" | "ICU_ADMISSION" | "CATH_LAB" | "STROKE_TEAM" | "STEPDOWN_MONITORED" | "ROUTINE_WARD";
    };
    safetyChecklist: {
      strictContraindications: string[];
      highRiskInteractions: string[];
    };
    criticalFailures: CriticalFailureCondition[];
  };
  acceptanceCriteria: {
    minimumPassingScore: number; // Default 80
    requiredKeyFindings: string[];
    mandatoryActions: string[];
  };
  guidelineReferences: {
    organization: string;
    guidelineTitle: string;
    publicationYear: number;
  }[];
}

export interface CaseScorecardBreakdown {
  diagnosisAndDifferential: number;     // max 15
  clinicalReasoning: number;            // max 15
  clinicalScoringAccuracy: number;      // max 15
  investigationSelection: number;       // max 10
  resultInterpretation: number;         // max 10
  treatmentRecommendations: number;     // max 15
  emergencyRecognition: number;         // max 10
  safetyAndContraindications: number;   // max 5
  evidenceAndReferences: number;        // max 5
}

export interface CaseEvaluationResult {
  caseId: string;
  specialty: ClinicalSpecialty;
  totalScore: number;                   // out of 100
  tier: "MEETS_BENCHMARK_EXPECTATIONS" | "PASS_WITH_RECOMMENDATIONS" | "CONDITIONAL_FAILURE" | "FAIL";
  scorecard: CaseScorecardBreakdown;
  criticalFailureTriggered: boolean;
  criticalFailureDetails?: CriticalFailureCondition;
  clinicianReviewRequired: boolean;
  evaluationTimestamp: string;
}
