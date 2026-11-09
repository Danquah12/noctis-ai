/**
 * NOCTIS HEALTH 500 AUTOMATED BENCHMARK EVALUATION RUNNER (CLI)
 * Spec: NH500-HEADLESS-PIPELINE-001
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  runHealth500Benchmark,
  formatBenchmarkReportMarkdown,
  type BenchmarkRunReport,
} from "../src/lib/noctis-health-500-runner.ts";

export { runHealth500Benchmark, formatBenchmarkReportMarkdown };

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
  console.log(`Baseline: ${baseline} | Specialty: ${spec} | Limit: ${limit}\n`);

  const report = runHealth500Benchmark({
    baseline,
    specialtyFilter: spec,
    limit,
  });

  const mdReport = formatBenchmarkReportMarkdown(report);

  // Write outputs to data/
  const dataDir = path.resolve(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const jsonOut = path.join(dataDir, `noctis-health-500-leaderboard-${baseline}.json`);
  const mdOut = path.join(dataDir, `noctis-health-500-leaderboard-${baseline}.md`);

  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(mdOut, mdReport, "utf-8");

  console.log("=".repeat(80));
  console.log(`  NOCTIS HEALTH 500 BENCHMARK EVALUATION COMPLETE (${report.runId})`);
  console.log("=".repeat(80));
  console.log(`Cases Evaluated        : ${report.totalCasesEvaluated}`);
  console.log(`Overall Mean Score     : ${report.overallMeanScore} / 100`);
  console.log(`Overall Pass Rate      : ${report.overallPassRatePct}%`);
  console.log(`Exemplary Rate         : ${report.overallExemplaryRatePct}%`);
  console.log(`Safety Invariant Score : ${report.safetyAdherenceRatePct}% (${report.totalCriticalFailures} critical violations)`);
  console.log(`Accreditation Tier     : ${report.certificationStatus}`);
  console.log(`Reports saved to:`);
  console.log(`  - ${jsonOut}`);
  console.log(`  - ${mdOut}`);
  console.log("=".repeat(80));
}
