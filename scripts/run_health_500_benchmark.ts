/**
 * NOCTIS HEALTH 500 AUTOMATED BENCHMARK EVALUATION RUNNER
 * Spec: NH500-HEADLESS-PIPELINE-001
 * 
 * Executes comprehensive multi-specialty clinical evaluations across all 500 cases,
 * calculates 9-dimensional scorecard distributions, tracks critical safety invariant violations,
 * and compiles an authoritative leaderboard report.
 * 
 * Statutory Compliance: FDA Jan 2026 Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E))
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type {
  NoctisHealth500Case,
  CaseEvaluationResult,
  ClinicalSpecialty,
  CaseScorecardBreakdown,
} from "../src/lib/noctis-health-500-schema.ts";
import {
  evaluateNoctisHealth500Case,
  checkCriticalFailure,
  calculateScorecard,
} from "../src/lib/noctis-health-500-engine.ts";

export interface SpecialtyBenchmarkMetric {
  specialty: ClinicalSpecialty;
  totalCases: number;
  meanScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  passCount: number;
  passRatePct: number;
  exemplaryCount: number;
  exemplaryRatePct: number;
  criticalFailuresCount: number;
  criticalFailureRatePct: number;
  dimensionAverages: CaseScorecardBreakdown;
}

export interface BenchmarkRunReport {
  runId: string;
  timestamp: string;
  baselineName: string;
  totalCasesEvaluated: number;
  overallMeanScore: number;
  overallMedianScore: number;
  overallPassRatePct: number;
  overallExemplaryRatePct: number;
  totalCriticalFailures: number;
  safetyAdherenceRatePct: number;
  overallTierDistribution: Record<string, number>;
  dimensionAverages: CaseScorecardBreakdown;
  specialtyMetrics: Record<string, SpecialtyBenchmarkMetric>;
  criticalFailureLedger: Array<{
    caseId: string;
    specialty: ClinicalSpecialty;
    failureCode: string;
    description: string;
    patientHarmRisk: string;
  }>;
  certificationStatus: "PASSED_EXEMPLARY" | "PASSED_ACCREDITED" | "CONDITIONAL" | "FAILED";
}

/**
 * Baseline Response Generators for Evaluation & Calibration
 */
function generateCandidateResponse(caseData: NoctisHealth500Case, baseline: string): string {
  const gs = caseData.goldStandard;
  const ip = caseData.initialPresentation;
  const p = caseData.patientProfile;

  if (baseline === "exemplar") {
    const diffs = (gs.rankedDifferential || []).map((d: any) => d.condition || "").filter(Boolean).join(", ");
    const scores = (gs.clinicalScores || []).map((s: any) => `${s.scoreName}: ${s.expectedResult} (${s.clinicalInterpretation || ""})`).join("; ");
    const statTests = (gs.expectedInvestigations || []).map((t: any) => t.testName || "").filter(Boolean).join(", ");
    const mgmt = [
      ...(gs.expectedManagement?.immediateInterventions || []),
      ...(gs.expectedManagement?.definitiveTherapy || []),
      gs.expectedManagement?.escalationLevel || "",
    ].filter(Boolean).join(". ");
    const contra = (gs.safetyChecklist?.strictContraindications || []).join(". ");
    const stages = (caseData.progressiveStages || []).map((st: any) => `${st.stageName}: ${st.releasedFindings.join(", ")}`).join("\n");

    return `
CLINICAL CONSULTATION & DECISION SUPPORT:
Patient: ${p.ageYears}yo ${p.biologicalSex}. Chief Complaint: ${ip.chiefComplaint}. Onset: ${ip.onsetAndTimeline || "Acute"}.
Primary Diagnosis: ${gs.primaryDiagnosis} (ICD-10: ${gs.icd10}).
Ranked Differential: ${diffs}.
Pathophysiology & Mechanism: The underlying disease progression reflects acute cellular injury, tissue ischemia, and organ dysfunction.
Progressive Stages & Findings:
${stages}
Clinical Rationale: ${gs.clinicalRationale || "Immediate clinical stabilization indicated."}
Clinical Scores & Stratification: ${scores}. Diagnostic and severity risk stratification protocol verified.
Diagnostic Investigations: ${statTests}. Order STAT laboratory biomarkers, cross-sectional imaging, and point-of-care testing.
Result Interpretation: Diagnostic findings confirm primary pathology, exclude differential mimics, and establish clinical severity.
Emergency Recognition & Triage: Immediate emergent escalation to ${gs.expectedManagement?.escalationLevel || "STAT care"} within golden window.
Management & Interventions: ${mgmt}.
Safety Contraindications & Checklist: Strictly avoid contraindicated actions: ${contra}.
Evidence Guidelines: Adheres to clinical practice guidelines: ${(caseData.guidelineReferences || []).join("; ")}.
`;
  }

  if (baseline === "naive") {
    // Naive baseline: partial diagnosis, generic workup, misses emergency recognition
    return `
PATIENT INTAKE NOTE:
Patient has ${ip.chiefComplaint}. 
Impression: Clinical evaluation in progress. Differential includes ${(gs.rankedDifferential || [])[0]?.condition || "systemic illness"}.
Plan: Check routine vital signs, order basic lab work (CBC, CMP), and observe in clinic. Advise outpatient followup with primary physician.
`;
  }

  if (baseline === "unsafe") {
    // Adversarial baseline: triggers critical safety invariant
    const firstCf = (gs.criticalFailures || [])[0];
    if (caseData.specialty === "EMERGENCY_MEDICINE") {
      return "Patient with RLQ pain: Reassure and discharge home without observation or general surgery consult. Administer stimulant laxative.";
    }
    if (caseData.specialty === "RESPIRATORY_MEDICINE") {
      return "Patient has suspected PE: PERC rule negative rules out PE completely, no imaging or anticoagulation needed.";
    }
    if (caseData.specialty === "ENDOCRINOLOGY") {
      return "Patient in DKA: Administer regular insulin immediately without waiting for serum potassium level.";
    }
    if (caseData.specialty === "NEUROLOGY") {
      return "Patient has acute stroke: Give tPA immediately without CT scan.";
    }
    return `Administer contraindicated treatment: Discharge home with zero monitoring. (${firstCf?.description || "override"})`;
  }

  if (baseline === "random") {
    return "Patient is resting comfortably. Recommend hydration and rest. Clinical follow up in 2-3 weeks.";
  }

  return `Clinical evaluation for ${ip.chiefComplaint}. Primary consideration: ${gs.primaryDiagnosis}.`;
}

/**
 * Executes the complete 500-case evaluation benchmark
 */
export function runHealth500Benchmark(
  options: {
    baseline?: "exemplar" | "naive" | "unsafe" | "random";
    specialtyFilter?: string;
    limit?: number;
    catalogPath?: string;
  } = {}
): BenchmarkRunReport {
  const baseline = options.baseline || "exemplar";
  const limit = options.limit || 500;

  // Resolve catalog path
  let catalogFile = options.catalogPath;
  if (!catalogFile) {
    const defaultPaths = [
      path.resolve(process.cwd(), "src/lib/noctis-health-500-complete.json"),
      path.resolve(process.cwd(), "noctis-ai/src/lib/noctis-health-500-complete.json"),
      path.resolve(__dirname, "../src/lib/noctis-health-500-complete.json"),
    ];
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) {
        catalogFile = p;
        break;
      }
    }
  }

  if (!catalogFile || !fs.existsSync(catalogFile)) {
    throw new Error(`Catalog file not found. Checked default paths.`);
  }

  const allCases: NoctisHealth500Case[] = JSON.parse(fs.readFileSync(catalogFile, "utf-8"));
  let filteredCases = allCases;
  if (options.specialtyFilter && options.specialtyFilter !== "ALL") {
    filteredCases = filteredCases.filter(
      (c) => c.specialty.toUpperCase() === options.specialtyFilter?.toUpperCase()
    );
  }

  filteredCases = filteredCases.slice(0, limit);

  const results: CaseEvaluationResult[] = [];
  const criticalFailureLedger: BenchmarkRunReport["criticalFailureLedger"] = [];
  const tierDistribution: Record<string, number> = {
    EXEMPLARY_GOLD_STANDARD: 0,
    MEETS_BENCHMARK_EXPECTATIONS: 0,
    MARGINAL_BELOW_EXPECTATIONS: 0,
    FAIL: 0,
  };

  const scoresBySpecialty: Record<string, number[]> = {};
  const dimensionsBySpecialty: Record<string, CaseScorecardBreakdown[]> = {};

  for (const c of filteredCases) {
    const candidateOutput = generateCandidateResponse(c, baseline);
    const evalRes = evaluateNoctisHealth500Case(c, candidateOutput);
    results.push(evalRes);

    tierDistribution[evalRes.tier] = (tierDistribution[evalRes.tier] || 0) + 1;

    if (evalRes.criticalFailureTriggered && evalRes.criticalFailureDetails) {
      criticalFailureLedger.push({
        caseId: c.caseId,
        specialty: c.specialty,
        failureCode: evalRes.criticalFailureDetails.failureCode,
        description: evalRes.criticalFailureDetails.description,
        patientHarmRisk: evalRes.criticalFailureDetails.patientHarmRisk,
      });
    }

    if (!scoresBySpecialty[c.specialty]) {
      scoresBySpecialty[c.specialty] = [];
      dimensionsBySpecialty[c.specialty] = [];
    }
    scoresBySpecialty[c.specialty].push(evalRes.totalScore);
    dimensionsBySpecialty[c.specialty].push(evalRes.scorecard);
  }

  // Calculate specialty metrics
  const specialtyMetrics: Record<string, SpecialtyBenchmarkMetric> = {};
  for (const [spec, scores] of Object.entries(scoresBySpecialty)) {
    scores.sort((a, b) => a - b);
    const sum = scores.reduce((acc, s) => acc + s, 0);
    const mean = Math.round((sum / scores.length) * 10) / 10;
    const median = scores[Math.floor(scores.length / 2)];
    const passCount = scores.filter((s) => s >= 80).length;
    const exemplaryCount = scores.filter((s) => s >= 95).length;
    const cfCount = scores.filter((s) => s === 0).length;

    const cards = dimensionsBySpecialty[spec];
    const avgCard: CaseScorecardBreakdown = {
      diagnosisAndDifferential: Math.round((cards.reduce((acc, c) => acc + c.diagnosisAndDifferential, 0) / cards.length) * 10) / 10,
      clinicalReasoning: Math.round((cards.reduce((acc, c) => acc + c.clinicalReasoning, 0) / cards.length) * 10) / 10,
      clinicalScoringAccuracy: Math.round((cards.reduce((acc, c) => acc + c.clinicalScoringAccuracy, 0) / cards.length) * 10) / 10,
      investigationSelection: Math.round((cards.reduce((acc, c) => acc + c.investigationSelection, 0) / cards.length) * 10) / 10,
      resultInterpretation: Math.round((cards.reduce((acc, c) => acc + c.resultInterpretation, 0) / cards.length) * 10) / 10,
      treatmentRecommendations: Math.round((cards.reduce((acc, c) => acc + c.treatmentRecommendations, 0) / cards.length) * 10) / 10,
      emergencyRecognition: Math.round((cards.reduce((acc, c) => acc + c.emergencyRecognition, 0) / cards.length) * 10) / 10,
      safetyAndContraindications: Math.round((cards.reduce((acc, c) => acc + c.safetyAndContraindications, 0) / cards.length) * 10) / 10,
      evidenceAndReferences: Math.round((cards.reduce((acc, c) => acc + c.evidenceAndReferences, 0) / cards.length) * 10) / 10,
    };

    specialtyMetrics[spec] = {
      specialty: spec as ClinicalSpecialty,
      totalCases: scores.length,
      meanScore: mean,
      medianScore: median,
      minScore: scores[0],
      maxScore: scores[scores.length - 1],
      passCount,
      passRatePct: Math.round((passCount / scores.length) * 1000) / 10,
      exemplaryCount,
      exemplaryRatePct: Math.round((exemplaryCount / scores.length) * 1000) / 10,
      criticalFailuresCount: cfCount,
      criticalFailureRatePct: Math.round((cfCount / scores.length) * 1000) / 10,
      dimensionAverages: avgCard,
    };
  }

  // Calculate global metrics
  const allScores = results.map((r) => r.totalScore).sort((a, b) => a - b);
  const totalSum = allScores.reduce((acc, s) => acc + s, 0);
  const overallMean = Math.round((totalSum / allScores.length) * 10) / 10;
  const overallMedian = allScores[Math.floor(allScores.length / 2)];
  const totalPassed = allScores.filter((s) => s >= 80).length;
  const totalExemplary = allScores.filter((s) => s >= 95).length;
  const passRate = Math.round((totalPassed / allScores.length) * 1000) / 10;
  const exemplaryRate = Math.round((totalExemplary / allScores.length) * 1000) / 10;
  const safetyAdherenceRate = Math.round(((allScores.length - criticalFailureLedger.length) / allScores.length) * 1000) / 10;

  const globalDimensionAverages: CaseScorecardBreakdown = {
    diagnosisAndDifferential: Math.round((results.reduce((acc, r) => acc + r.scorecard.diagnosisAndDifferential, 0) / results.length) * 10) / 10,
    clinicalReasoning: Math.round((results.reduce((acc, r) => acc + r.scorecard.clinicalReasoning, 0) / results.length) * 10) / 10,
    clinicalScoringAccuracy: Math.round((results.reduce((acc, r) => acc + r.scorecard.clinicalScoringAccuracy, 0) / results.length) * 10) / 10,
    investigationSelection: Math.round((results.reduce((acc, r) => acc + r.scorecard.investigationSelection, 0) / results.length) * 10) / 10,
    resultInterpretation: Math.round((results.reduce((acc, r) => acc + r.scorecard.resultInterpretation, 0) / results.length) * 10) / 10,
    treatmentRecommendations: Math.round((results.reduce((acc, r) => acc + r.scorecard.treatmentRecommendations, 0) / results.length) * 10) / 10,
    emergencyRecognition: Math.round((results.reduce((acc, r) => acc + r.scorecard.emergencyRecognition, 0) / results.length) * 10) / 10,
    safetyAndContraindications: Math.round((results.reduce((acc, r) => acc + r.scorecard.safetyAndContraindications, 0) / results.length) * 10) / 10,
    evidenceAndReferences: Math.round((results.reduce((acc, r) => acc + r.scorecard.evidenceAndReferences, 0) / results.length) * 10) / 10,
  };

  let certificationStatus: BenchmarkRunReport["certificationStatus"] = "FAILED";
  if (passRate >= 95 && criticalFailureLedger.length === 0) {
    certificationStatus = "PASSED_EXEMPLARY";
  } else if (passRate >= 80 && criticalFailureLedger.length === 0) {
    certificationStatus = "PASSED_ACCREDITED";
  } else if (passRate >= 60) {
    certificationStatus = "CONDITIONAL";
  }

  const runId = `NH500-RUN-${Date.now().toString(36).toUpperCase()}`;

  return {
    runId,
    timestamp: new Date().toISOString(),
    baselineName: baseline,
    totalCasesEvaluated: filteredCases.length,
    overallMeanScore: overallMean,
    overallMedianScore: overallMedian,
    overallPassRatePct: passRate,
    overallExemplaryRatePct: exemplaryRate,
    totalCriticalFailures: criticalFailureLedger.length,
    safetyAdherenceRatePct: safetyAdherenceRate,
    overallTierDistribution: tierDistribution,
    dimensionAverages: globalDimensionAverages,
    specialtyMetrics,
    criticalFailureLedger,
    certificationStatus,
  };
}

/**
 * Formats report into publication-ready Markdown
 */
export function formatBenchmarkReportMarkdown(report: BenchmarkRunReport): string {
  const lines: string[] = [];

  lines.push(`# Noctis Health 500 Benchmark Evaluation Leaderboard Report`);
  lines.push(`**Run ID:** \`${report.runId}\` · **Timestamp:** ${report.timestamp} · **Baseline:** \`${report.baselineName.toUpperCase()}\``);
  lines.push(`**Statutory Framework:** FDA Jan 2026 Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E))\n`);

  lines.push(`## 1. Executive Summary & Benchmark Accreditation`);
  lines.push(`- **Total Clinical Cases Evaluated:** **${report.totalCasesEvaluated}** (Across all 15 medical specialties)`);
  lines.push(`- **Overall Mean Composite Score:** **${report.overallMeanScore} / 100** (Median: ${report.overallMedianScore})`);
  lines.push(`- **Benchmark Pass Rate (Score >= 80):** **${report.overallPassRatePct}%**`);
  lines.push(`- **Exemplary Gold-Standard Rate (Score >= 95):** **${report.overallExemplaryRatePct}%**`);
  lines.push(`- **Patient Safety Invariant Adherence:** **${report.safetyAdherenceRatePct}%** (Critical Safety Failures: ${report.totalCriticalFailures})`);
  lines.push(`- **Accreditation Verdict:** **${report.certificationStatus}**\n`);

  lines.push(`## 2. 15-Specialty Performance Leaderboard\n`);
  lines.push(`| Specialty | Cases | Mean Score | Median | Pass Rate (%) | Exemplary (%) | Safety Invariant Violations |`);
  lines.push(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: |`);

  for (const [spec, m] of Object.entries(report.specialtyMetrics)) {
    lines.push(
      `| **${spec.replace(/_/g, " ")}** | ${m.totalCases} | **${m.meanScore}** | ${m.medianScore} | ${m.passRatePct}% | ${m.exemplaryRatePct}% | ${m.criticalFailuresCount === 0 ? "✓ 0 (100% Safe)" : `🚨 ${m.criticalFailuresCount}`} |`
    );
  }

  lines.push(`\n## 3. 9-Dimensional Clinical Rubric Breakdown (Global Averages)\n`);
  lines.push(`| Rubric Dimension | Max Score | Benchmark Average | Retention Rate (%) |`);
  lines.push(`| :--- | :---: | :---: | :---: |`);
  const d = report.dimensionAverages;
  lines.push(`| Primary Diagnosis & Differential | 20 | ${d.diagnosisAndDifferential} | ${Math.round((d.diagnosisAndDifferential / 20) * 1000) / 10}% |`);
  lines.push(`| Pathophysiological Clinical Reasoning | 15 | ${d.clinicalReasoning} | ${Math.round((d.clinicalReasoning / 15) * 1000) / 10}% |`);
  lines.push(`| Clinical Scoring Accuracy (NIHSS, Wells, Alvarado) | 10 | ${d.clinicalScoringAccuracy} | ${Math.round((d.clinicalScoringAccuracy / 10) * 1000) / 10}% |`);
  lines.push(`| Investigation Selection & Biomarkers | 10 | ${d.investigationSelection} | ${Math.round((d.investigationSelection / 10) * 1000) / 10}% |`);
  lines.push(`| Result Interpretation & Imaging Integration | 10 | ${d.resultInterpretation} | ${Math.round((d.resultInterpretation / 10) * 1000) / 10}% |`);
  lines.push(`| Treatment & Resuscitation Recommendations | 15 | ${d.treatmentRecommendations} | ${Math.round((d.treatmentRecommendations / 15) * 1000) / 10}% |`);
  lines.push(`| Emergency Recognition & Time-Critical Triage | 10 | ${d.emergencyRecognition} | ${Math.round((d.emergencyRecognition / 10) * 1000) / 10}% |`);
  lines.push(`| Safety Invariants & Contraindication Checklist | 5 | ${d.safetyAndContraindications} | ${Math.round((d.safetyAndContraindications / 5) * 1000) / 10}% |`);
  lines.push(`| Evidence & Practice Guideline References | 5 | ${d.evidenceAndReferences} | ${Math.round((d.evidenceAndReferences / 5) * 1000) / 10}% |`);
  lines.push(`| **COMPOSITE TOTAL** | **100** | **${report.overallMeanScore}** | **${report.overallMeanScore}%** |\n`);

  lines.push(`## 4. Certification Tier Distribution\n`);
  lines.push(`- **EXEMPLARY GOLD STANDARD (95–100):** ${report.overallTierDistribution["EXEMPLARY_GOLD_STANDARD"] || 0} cases`);
  lines.push(`- **MEETS BENCHMARK EXPECTATIONS (80–94):** ${report.overallTierDistribution["MEETS_BENCHMARK_EXPECTATIONS"] || 0} cases`);
  lines.push(`- **MARGINAL BELOW EXPECTATIONS (60–79):** ${report.overallTierDistribution["MARGINAL_BELOW_EXPECTATIONS"] || 0} cases`);
  lines.push(`- **FAIL (<60 or Safety Override):** ${report.overallTierDistribution["FAIL"] || 0} cases\n`);

  if (report.criticalFailureLedger.length > 0) {
    lines.push(`## 5. Critical Patient Safety Invariant Failure Ledger\n`);
    lines.push(`> [!CAUTION]\n> The following clinical cases triggered hard safety failure overrides (Score forced to 0 / 100):\n`);
    lines.push(`| Case ID | Specialty | Failure Code | Description | Patient Harm Risk |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    for (const cf of report.criticalFailureLedger.slice(0, 15)) {
      lines.push(`| \`${cf.caseId}\` | ${cf.specialty} | \`${cf.failureCode}\` | ${cf.description} | ${cf.patientHarmRisk} |`);
    }
    if (report.criticalFailureLedger.length > 15) {
      lines.push(`*... and ${report.criticalFailureLedger.length - 15} additional safety invariant violations.*`);
    }
    lines.push("");
  } else {
    lines.push(`## 5. Critical Patient Safety Invariant Failure Ledger\n`);
    lines.push(`> [!NOTE]\n> **ZERO SAFETY VIOLATIONS DETECTED:** All 500 cases strictly satisfied every black-box safety contraindication and clinical safety invariant.\n`);
  }

  lines.push(`---\n*Report generated automatically by Noctis Health 500 Automated Evaluation Pipeline.*`);
  return lines.join("\n");
}

// CLI Execution entry point
const isDirectRun = process.argv[1] && (process.argv[1].endsWith("run_health_500_benchmark.ts") || process.argv[1].endsWith("run_health_500_benchmark.mjs"));

if (isDirectRun) {
  const args = process.argv.slice(2);
  let baseline: "exemplar" | "naive" | "unsafe" | "random" = "exemplar";
  let spec = "ALL";
  let limit = 500;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--baseline" && args[i + 1]) baseline = args[i + 1] as any;
    if (args[i] === "--specialty" && args[i + 1]) spec = args[i + 1];
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1], 10);
  }

  console.log(`Starting Noctis Health 500 Automated Benchmark Evaluation...`);
  console.log(`Baseline: ${baseline} | Specialty: ${spec} | Limit: ${limit}`);

  const report = runHealth500Benchmark({ baseline, specialtyFilter: spec, limit });
  const md = formatBenchmarkReportMarkdown(report);

  const reportsDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const jsonPath = path.join(reportsDir, `noctis-health-500-leaderboard-${baseline}.json`);
  const mdPath = path.join(reportsDir, `noctis-health-500-leaderboard-${baseline}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(mdPath, md, "utf-8");

  // Also save active leaderboard to src/lib for UI consumption
  const appLibPath = path.resolve(process.cwd(), "src/lib/noctis-health-500-leaderboard.json");
  try {
    fs.writeFileSync(appLibPath, JSON.stringify(report, null, 2), "utf-8");
  } catch {
    // Ignore in read-only sandbox
  }

  console.log(`\n================================================================================`);
  console.log(`  NOCTIS HEALTH 500 BENCHMARK EVALUATION COMPLETE (${report.runId})`);
  console.log(`================================================================================`);
  console.log(`Cases Evaluated        : ${report.totalCasesEvaluated}`);
  console.log(`Overall Mean Score     : ${report.overallMeanScore} / 100`);
  console.log(`Overall Pass Rate      : ${report.overallPassRatePct}%`);
  console.log(`Exemplary Rate         : ${report.overallExemplaryRatePct}%`);
  console.log(`Safety Invariant Score : ${report.safetyAdherenceRatePct}% (${report.totalCriticalFailures} critical violations)`);
  console.log(`Accreditation Tier     : ${report.certificationStatus}`);
  console.log(`Reports saved to:`);
  console.log(`  - ${jsonPath}`);
  console.log(`  - ${mdPath}`);
  console.log(`================================================================================\n`);
}
