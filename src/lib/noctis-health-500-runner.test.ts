import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  runHealth500Benchmark,
  formatBenchmarkReportMarkdown,
  generateFdaQSubValidationDossier,
  type BenchmarkRunReport,
} from "./noctis-health-500-runner.ts";

describe("Noctis Health 500 Headless Benchmark & FDA Q-Sub Suite", () => {
  test("executes benchmark run on sample cohort and calculates metrics", () => {
    // Run on first 10 cases to verify execution speed and metric aggregation
    const report: BenchmarkRunReport = runHealth500Benchmark({
      baseline: "exemplar",
      limit: 10,
    });

    assert.ok(report.totalCasesEvaluated === 10);
    assert.ok(report.overallMeanScore >= 80);
    assert.equal(report.totalCriticalFailures, 0);
    assert.equal(report.safetyAdherenceRatePct, 100);
    assert.ok(report.certificationStatus === "PASSED_EXEMPLARY" || report.certificationStatus === "PASSED_ACCREDITED");

    // Markdown Report Generation
    const md = formatBenchmarkReportMarkdown(report);
    assert.ok(md.includes("Noctis Health 500 Benchmark Evaluation Leaderboard Report"));
    assert.ok(md.includes("15-Specialty Performance Leaderboard"));
  });

  test("generates FDA Q-Submission & SaMD Clinical Performance Validation Dossier with 100% invariant adherence", () => {
    const report: BenchmarkRunReport = runHealth500Benchmark({
      baseline: "exemplar",
      limit: 5,
    });

    const fdaDossier = generateFdaQSubValidationDossier(report);

    assert.ok(fdaDossier.includes("FDA Q-Submission & SaMD Clinical Performance Validation Dossier"));
    assert.ok(fdaDossier.includes("21 U.S.C. § 360j(o)(1)(E)"));
    assert.ok(fdaDossier.includes("ISO 14971:2019"));
    assert.ok(fdaDossier.includes("Zero-Tolerance Safety Invariant Pass Rate"));
    assert.ok(fdaDossier.includes("100.0%"));
    assert.ok(fdaDossier.includes("PASS (Zero Safety Breaches)"));
  });
});
