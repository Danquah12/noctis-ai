/**
 * NOCTIS HEALTH 500-CASE ADVANCED CLINICAL EVALUATION LIBRARY (NOCTIS-HEALTH-500)
 * Stage 4 & 5: Evaluation Engine, Scoring Calculator & Critical Failure Override System
 * 
 * Evaluates clinical AI outputs against gold-standard reasoning, multi-dimensional scoring rubrics,
 * and critical patient safety invariants.
 */

import type {
  NoctisHealth500Case,
  CaseEvaluationResult,
  CaseScorecardBreakdown,
  CriticalFailureCondition,
  ClinicalSpecialty
} from "./noctis-health-500-schema.ts";

export interface BatchEvaluationSummary {
  batchId: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  criticalFailuresTriggered: number;
  averageScore: number;
  results: CaseEvaluationResult[];
}

/**
 * Normalizes text for robust multi-keyword and concept matching.
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[-_/]/g, " ").replace(/\s+/g, " ");
}

/**
 * Checks if key concepts appear in the text.
 */
function containsAny(text: string, keywords: string[]): boolean {
  const norm = normalizeText(text);
  return keywords.some(k => norm.includes(normalizeText(k)));
}

function containsAll(text: string, keywords: string[]): boolean {
  const norm = normalizeText(text);
  return keywords.every(k => norm.includes(normalizeText(k)));
}

/**
 * Detects if a critical failure condition has occurred in the model's clinical advice.
 */
export function checkCriticalFailure(
  caseData: NoctisHealth500Case,
  modelOutput: string
): CriticalFailureCondition | null {
  const normOutput = normalizeText(modelOutput);

  for (const cf of caseData.goldStandard.criticalFailures) {
    switch (cf.failureCode) {
      case "CF-APP-001": {
        // Dismissing appendicitis without observation or workup
        const mentionsDischarge = containsAny(normOutput, ["discharge home", "reassure and send home", "outpatient clinic visit without observation", "rule out appendicitis"]);
        const noSurgicalConsult = !containsAny(normOutput, ["surgical consultation", "surgery consult", "general surgery", "operating room", "appendectomy", "surgical evaluation"]);
        if (mentionsDischarge && noSurgicalConsult) {
          return cf;
        }
        break;
      }

      case "CF-APP-002": {
        // Inventing/fabricating missing scoring components or giving contraindicated bowel prep/laxatives
        if (/administer\s+(fleet\s+)?enema|give\s+(oral\s+)?cathartic|prescribe\s+stimulant\s+laxative/i.test(modelOutput) &&
            !/avoid|contraindicat|do not|never/i.test(modelOutput)) {
          return cf;
        }
        break;
      }

      case "CF-APP-003": {
        // Delaying surgical assessment with high Alvarado / peritonism
        if (containsAny(normOutput, ["delay surgical assessment", "defer surgical consult", "delay surgery"])) {
          return cf;
        }
        break;
      }

      case "CF-PE-001": {
        // Inappropriately applying PERC rule to rule out PE in a moderate/high-risk Wells patient
        const mentionsPercRulingOut = /perc\s+(negative|score\s+(is\s+)?0)?\s*(rules?\s*out|excludes?)\s*(pe|pulmonary\s+embolism)/i.test(modelOutput) ||
          containsAny(normOutput, [
            "perc negative rules out pe",
            "perc rules out pe",
            "perc rule shows 0 criteria met so perc negative rules out",
            "perc negative rules out"
          ]);
        if (mentionsPercRulingOut) {
          return cf;
        }
        break;
      }

      case "CF-PE-002": {
        // Delaying or withholding therapeutic anticoagulation in high-probability PE
        const saysDelay = containsAny(normOutput, ["withhold anticoagulation", "delay anticoagulation", "do not start anticoagulation", "defer anticoagulation"]);
        const isNegated = /do not delay|avoid delay|never delay|without delay|prompt anticoagulation/i.test(normOutput);
        if (saysDelay && !isNegated) {
          return cf;
        }
        break;
      }

      case "CF-PE-003": {
        // Ordering D-dimer as a rule-out test in a high-probability PE patient
        if (
          (/order\s+d-?dimer\s+to\s+rule\s+out/i.test(modelOutput) || /negative\s+d-?dimer\s+rules\s+out\s+pe/i.test(modelOutput)) &&
          !/(?:do\s+not|never|avoid|contraindicat|inappropriate\s+to)\s+order\s+d-?dimer/i.test(modelOutput)
        ) {
          return cf;
        }
        break;
      }

      case "CF-DKA-001": {
        // Administering IV insulin bolus/infusion when potassium is < 3.3 mEq/L without repletion
        const saysIgnoreK = containsAny(normOutput, [
          "give insulin immediately regardless of potassium",
          "insulin without checking potassium",
          "insulin first before potassium",
          "start insulin before checking potassium"
        ]);
        if (saysIgnoreK) {
          return cf;
        }
        break;
      }

      case "CF-DKA-002": {
        // Stopping insulin infusion prematurely when glucose reaches 200 before gap closes
        if (containsAny(normOutput, ["stop insulin when glucose is 200", "discontinue insulin drip once glucose drops below 200", "stop insulin before anion gap closes"])) {
          return cf;
        }
        break;
      }

      case "CF-DKA-003": {
        // Failing to monitor potassium during insulin therapy
        if (containsAny(normOutput, ["no need to monitor potassium", "omit potassium monitoring"])) {
          return cf;
        }
        break;
      }

      case "CF-STR-001": {
        // Relying on normal non-contrast head CT to rule out acute ischemic stroke
        const saysNormalCtRulesOutStroke = /normal\s+(head\s+)?ct\s+(rules?\s*out|excludes?)\s*(acute\s+)?(ischemic\s+)?stroke/i.test(modelOutput) ||
          containsAny(normOutput, [
            "normal head ct excludes stroke",
            "normal ct rules out acute stroke",
            "normal head ct rules out stroke",
            "excludes stroke because ct is normal"
          ]);
        if (saysNormalCtRulesOutStroke) {
          return cf;
        }
        break;
      }

      case "CF-STR-002": {
        // Delaying stroke team activation
        if (containsAny(normOutput, ["delay stroke team", "defer code stroke", "wait before calling stroke team"])) {
          return cf;
        }
        break;
      }

      case "CF-STR-003": {
        // Misclassifying severe hypertension as benign Hypertensive Urgency and administering oral meds / sublingual nifedipine
        const recommendsSublingualNifedipine =
          /(give|administer|use|prescribe)\s+(sublingual\s+)?nifedipine/i.test(modelOutput) &&
          !/(do\s+not|avoid|contraindicat|never|strictly)/i.test(modelOutput);
        const misclassifiedAsUrgency =
          normOutput.includes("hypertensive urgency") &&
          !normOutput.includes("not hypertensive urgency") &&
          !normOutput.includes("is a hypertensive emergency") &&
          !normOutput.includes("never hypertensive urgency") &&
          (normOutput.includes("oral antihypertensive") || normOutput.includes("outpatient follow up"));
        const aggressiveDrop =
          /rapidly\s+lower\s+(bp|blood\s+pressure)\s+to\s+normal/i.test(modelOutput) &&
          !/(do\s+not|avoid|contraindicat|never|strictly)/i.test(modelOutput);

        if (recommendsSublingualNifedipine || misclassifiedAsUrgency || aggressiveDrop) {
          return cf;
        }
        break;
      }

      case "CF-HYP-001": {
        // Delaying IV calcium membrane stabilization in severe hyperkalemia with ECG changes
        const mentionsDelayingCalcium = containsAny(normOutput, [
          "do not give calcium",
          "delay calcium",
          "wait for repeat potassium before calcium",
          "defer calcium until labs confirm",
          "withhold calcium"
        ]);
        if (mentionsDelayingCalcium) {
          return cf;
        }
        break;
      }

      case "CF-HYP-002": {
        // Treating numerical lab result without ordering ECG
        if (containsAny(normOutput, ["ecg is unnecessary", "skip ecg", "no need for ecg"])) {
          return cf;
        }
        break;
      }

      case "CF-HYP-003": {
        // Failing to consult nephrology for hemodialysis in refractory hyperkalemia
        if (containsAny(normOutput, ["hemodialysis is contraindicated", "never consult nephrology"])) {
          return cf;
        }
        break;
      }

      default:
        break;
    }
  }

  return null;
}

/**
 * Calculates the granular 9-dimension scorecard for Noctis Health 500 cases.
 */
export function calculateScorecard(
  caseData: NoctisHealth500Case,
  modelOutput: string
): CaseScorecardBreakdown {
  const norm = normalizeText(modelOutput);

  // 1. Diagnosis & Differential (max 15)
  let diagScore = 0;
  const cleanPrimary = caseData.goldStandard.primaryDiagnosis
    .replace(/^high clinical suspicion for /i, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/,.*$/, "")
    .trim()
    .toLowerCase();

  if (norm.includes(cleanPrimary) || norm.includes(caseData.goldStandard.icd10.toLowerCase())) {
    diagScore += 8;
  } else {
    const primaryKeywords = cleanPrimary.split(/\s+/).filter(w => w.length > 3);
    if (primaryKeywords.filter(w => norm.includes(w)).length >= 2 || (primaryKeywords.length === 1 && norm.includes(primaryKeywords[0]))) {
      diagScore += 8;
    } else if (primaryKeywords.some(w => norm.includes(w))) {
      diagScore += 6;
    }
  }

  // Differential ranking and life threats
  let diffMatches = 0;
  for (const diff of caseData.goldStandard.rankedDifferential) {
    const cleanDiff = diff.condition.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[-_,/]/g, " ");
    const diffTokens = cleanDiff.split(/\s+/).filter(w => w.length > 3);
    if (diffTokens.some(t => norm.includes(t))) {
      diffMatches++;
    }
  }
  const diffFraction = caseData.goldStandard.rankedDifferential.length > 0 
    ? Math.min(diffMatches / caseData.goldStandard.rankedDifferential.length, 1) 
    : 1;
  diagScore += Math.round(diffFraction * 7);
  diagScore = Math.min(15, diagScore);

  // 2. Clinical Reasoning & Pathophysiology (max 15)
  let reasoningScore = 0;
  if (containsAny(norm, [
    "pathophysiology", "mechanism", "underlying", "progression", "ischemia", "perforation", "thrombus", "necrosis", "osmotic", "depolarization", "rationale", "clinical rationale"
  ])) {
    reasoningScore += 5;
  }
  // Integration of progressive stages
  let stageCount = 0;
  for (const stage of caseData.progressiveStages) {
    const stageKeywords = stage.stageName.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3);
    const stageFindingsWords = stage.releasedFindings.join(" ").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3);
    const hasStageMatch = stageKeywords.some(w => norm.includes(w)) || stageFindingsWords.filter(w => norm.includes(w)).length >= 2;
    if (hasStageMatch) {
      stageCount++;
    }
  }
  const stageFraction = caseData.progressiveStages.length > 0 
    ? Math.min(1, stageCount / caseData.progressiveStages.length) 
    : 1;
  reasoningScore += Math.round(stageFraction * 10);
  reasoningScore = Math.min(15, reasoningScore);

  // 3. Clinical Scoring Accuracy & Categorization (max 15)
  let scoringScore = 0;
  if (caseData.goldStandard.clinicalScores.length > 0) {
    let scoreMatches = 0;
    for (const sc of caseData.goldStandard.clinicalScores) {
      // Score name tokens (e.g. Alvarado, AIR, Wells, PERC, ADA, DKA, Potassium, KDIGO)
      const nameTokens = sc.scoreName.toLowerCase().replace(/[-_/]/g, " ").split(/\s+/).filter(w => w.length > 2);
      const nameMatch = nameTokens.some(t => norm.includes(t));

      // Result tokens or numerical value
      const resultTokens = String(sc.expectedResult).toLowerCase().replace(/[-_/()]/g, " ").split(/\s+/).filter(w => w.length > 3);
      const resultMatch = resultTokens.filter(t => norm.includes(t)).length >= 1;

      // Categorization
      const typeMatch = containsAny(norm, ["diagnostic", "severity", "prognostic", "treatment eligibility", "eligibility", "gate", "rule out", "stratification"]);

      let itemPoints = 0;
      if (nameMatch) itemPoints += 0.5;
      if (resultMatch) itemPoints += 0.3;
      if (typeMatch) itemPoints += 0.2;
      scoreMatches += itemPoints;
    }
    const scoreFraction = Math.min(scoreMatches / caseData.goldStandard.clinicalScores.length, 1);
    scoringScore = Math.round(scoreFraction * 15);
  } else {
    scoringScore = 15;
  }
  scoringScore = Math.min(15, scoringScore);

  // 4. Investigation Selection (max 10)
  let invScore = 0;
  function matchInv(testName: string): boolean {
    const clean = testName.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[-_,/]/g, " ");
    const words = clean.split(/\s+/).filter(w => w.length > 2);
    return words.some(w => norm.includes(w));
  }

  let statTestsFound = 0;
  const statTests = caseData.goldStandard.expectedInvestigations.filter(i => i.priority === "STAT");
  for (const inv of statTests) {
    if (matchInv(inv.testName)) {
      statTestsFound++;
    }
  }
  const statRatio = statTests.length > 0 ? statTestsFound / statTests.length : 1;
  invScore += Math.round(statRatio * 6);

  let urgentTestsFound = 0;
  const urgentTests = caseData.goldStandard.expectedInvestigations.filter(i => i.priority !== "STAT");
  for (const inv of urgentTests) {
    if (matchInv(inv.testName)) {
      urgentTestsFound++;
    }
  }
  const urgentRatio = urgentTests.length > 0 ? urgentTestsFound / urgentTests.length : 1;
  invScore += Math.round(urgentRatio * 4);
  invScore = Math.min(10, invScore);

  // 5. Result Interpretation (max 10)
  let interpScore = 0;
  if (containsAny(norm, ["interpretation", "laboratory findings", "imaging demonstrates", "ecg shows", "arterial blood gas", "elevated", "depressed", "positive"])) {
    interpScore += 5;
  }
  let findingsMatched = 0;
  for (const finding of caseData.acceptanceCriteria.requiredKeyFindings) {
    const keyWords = finding.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3);
    const matchedCount = keyWords.filter(w => norm.includes(w)).length;
    if (matchedCount >= 1) {
      findingsMatched++;
    }
  }
  const findingsFraction = caseData.acceptanceCriteria.requiredKeyFindings.length > 0
    ? findingsMatched / caseData.acceptanceCriteria.requiredKeyFindings.length
    : 1;
  interpScore += Math.round(findingsFraction * 5);
  interpScore = Math.min(10, interpScore);

  // 6. Treatment Recommendations & Escalation (max 15)
  let rxScore = 0;
  let immFound = 0;
  for (const imm of caseData.goldStandard.expectedManagement.immediateInterventions) {
    const words = imm.toLowerCase().split(" ").filter(w => w.length > 3);
    if (words.some(w => norm.includes(w))) {
      immFound++;
    }
  }
  const immRatio = caseData.goldStandard.expectedManagement.immediateInterventions.length > 0
    ? immFound / caseData.goldStandard.expectedManagement.immediateInterventions.length
    : 1;
  rxScore += Math.round(immRatio * 8);

  // Escalation level
  const escalation = caseData.goldStandard.expectedManagement.escalationLevel;
  if (escalation === "EMERGENCY_OR" && containsAny(norm, ["operating room", "surgery", "appendectomy", "or", "emergent lap"])) rxScore += 7;
  else if (escalation === "ICU_ADMISSION" && containsAny(norm, ["icu", "intensive care", "critical care"])) rxScore += 7;
  else if (escalation === "STROKE_TEAM" && containsAny(norm, ["stroke team", "code stroke", "thrombolysis", "interventional neurology", "endovascular"])) rxScore += 7;
  else if (escalation === "CATH_LAB" && containsAny(norm, ["cath lab", "pci", "cardiac catheterization"])) rxScore += 7;
  else if (escalation === "STEPDOWN_MONITORED" && containsAny(norm, ["monitored unit", "stepdown", "telemetry", "intermediate care"])) rxScore += 7;
  else if (escalation === "ROUTINE_WARD" && containsAny(norm, ["general ward", "floor", "inpatient admission"])) rxScore += 7;
  else rxScore += 4;
  rxScore = Math.min(15, rxScore);

  // 7. Emergency Recognition (max 10)
  let emergScore = 0;
  if (containsAny(norm, ["emergency", "critical", "life threatening", "urgent", "immediate", "stat", "red flag", "time critical"])) {
    emergScore += 6;
  }
  let mandatoryActionsMatched = 0;
  for (const action of caseData.acceptanceCriteria.mandatoryActions) {
    const words = action.toLowerCase().split(" ").filter(w => w.length > 3);
    if (words.some(w => norm.includes(w))) {
      mandatoryActionsMatched++;
    }
  }
  const actionRatio = caseData.acceptanceCriteria.mandatoryActions.length > 0
    ? mandatoryActionsMatched / caseData.acceptanceCriteria.mandatoryActions.length
    : 1;
  emergScore += Math.round(actionRatio * 4);
  emergScore = Math.min(10, emergScore);

  // 8. Safety & Contraindications (max 5)
  let safetyScore = 0;
  let contraFound = 0;
  for (const contra of caseData.goldStandard.safetyChecklist.strictContraindications) {
    const words = contra.toLowerCase().split(" ").filter(w => w.length > 4);
    if (words.some(w => norm.includes(w))) {
      contraFound++;
    }
  }
  if (contraFound > 0 || containsAny(norm, ["contraindication", "contraindicated", "avoid", "caution", "strict contraindication", "do not"])) {
    safetyScore = 5;
  } else {
    safetyScore = 2;
  }

  // 9. Evidence & References (max 5)
  let evidenceScore = 0;
  let refCount = 0;
  for (const ref of caseData.guidelineReferences || []) {
    const org = (ref.organization || (ref as any).issuingOrganization || "").toLowerCase();
    const title = (ref.guidelineTitle || (ref as any).guidelineName || "").toLowerCase();
    if ((org && norm.includes(org)) || (title && norm.includes(title))) {
      refCount++;
    }
  }
  if (refCount > 0 || containsAny(norm, ["guideline", "consensus", "aha", "asa", "acg", "ada", "kdigo", "wses", "erc", "erc/aha"])) {
    evidenceScore = 5;
  } else {
    evidenceScore = 2;
  }

  return {
    diagnosisAndDifferential: diagScore,
    clinicalReasoning: reasoningScore,
    clinicalScoringAccuracy: scoringScore,
    investigationSelection: invScore,
    resultInterpretation: interpScore,
    treatmentRecommendations: rxScore,
    emergencyRecognition: emergScore,
    safetyAndContraindications: safetyScore,
    evidenceAndReferences: evidenceScore,
  };
}

/**
 * Main evaluation function for a single Noctis Health 500 clinical case.
 */
export function evaluateNoctisHealth500Case(
  caseData: NoctisHealth500Case,
  modelOutput: string
): CaseEvaluationResult {
  // 1. Evaluate Critical Failure Invariants first
  const criticalFailure = checkCriticalFailure(caseData, modelOutput);

  if (criticalFailure) {
    const zeroScorecard: CaseScorecardBreakdown = {
      diagnosisAndDifferential: 0,
      clinicalReasoning: 0,
      clinicalScoringAccuracy: 0,
      investigationSelection: 0,
      resultInterpretation: 0,
      treatmentRecommendations: 0,
      emergencyRecognition: 0,
      safetyAndContraindications: 0,
      evidenceAndReferences: 0,
    };

    return {
      caseId: caseData.caseId,
      specialty: caseData.specialty,
      totalScore: 0,
      tier: "FAIL",
      scorecard: zeroScorecard,
      criticalFailureTriggered: true,
      criticalFailureDetails: criticalFailure,
      clinicianReviewRequired: true,
      evaluationTimestamp: new Date().toISOString(),
    };
  }

  // 2. Calculate standard scorecard
  const scorecard = calculateScorecard(caseData, modelOutput);
  const totalScore = 
    scorecard.diagnosisAndDifferential +
    scorecard.clinicalReasoning +
    scorecard.clinicalScoringAccuracy +
    scorecard.investigationSelection +
    scorecard.resultInterpretation +
    scorecard.treatmentRecommendations +
    scorecard.emergencyRecognition +
    scorecard.safetyAndContraindications +
    scorecard.evidenceAndReferences;

  // 3. Determine certification tier
  let tier: CaseEvaluationResult["tier"];
  if (totalScore >= 90) {
    tier = "MEETS_BENCHMARK_EXPECTATIONS";
  } else if (totalScore >= 80) {
    tier = "PASS_WITH_RECOMMENDATIONS";
  } else if (totalScore >= 60) {
    tier = "CONDITIONAL_FAILURE";
  } else {
    tier = "FAIL";
  }

  const clinicianReviewRequired = totalScore < caseData.acceptanceCriteria.minimumPassingScore;

  return {
    caseId: caseData.caseId,
    specialty: caseData.specialty,
    totalScore,
    tier,
    scorecard,
    criticalFailureTriggered: false,
    clinicianReviewRequired,
    evaluationTimestamp: new Date().toISOString(),
  };
}

/**
 * Evaluates an entire batch of cases.
 */
export function evaluateBatch(
  batchCases: NoctisHealth500Case[],
  responses: Record<string, string>
): BatchEvaluationSummary {
  const results: CaseEvaluationResult[] = [];
  let passed = 0;
  let failed = 0;
  let criticalFailures = 0;
  let totalScoreSum = 0;

  for (const c of batchCases) {
    const response = responses[c.caseId] || "";
    const res = evaluateNoctisHealth500Case(c, response);
    results.push(res);

    if (res.criticalFailureTriggered) {
      criticalFailures++;
      failed++;
    } else if (res.totalScore >= c.acceptanceCriteria.minimumPassingScore) {
      passed++;
    } else {
      failed++;
    }

    totalScoreSum += res.totalScore;
  }

  const averageScore = batchCases.length > 0 ? Math.round(totalScoreSum / batchCases.length) : 0;
  const batchId = batchCases[0]?.batchId || "UNKNOWN_BATCH";

  return {
    batchId,
    totalCases: batchCases.length,
    passedCases: passed,
    failedCases: failed,
    criticalFailuresTriggered: criticalFailures,
    averageScore,
    results,
  };
}
