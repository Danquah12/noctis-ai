import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { executeNaseeAutonomousPipeline } from "../src/lib/forge/nasee-engine.server.ts";

const execFileAsync = promisify(execFile);

const DIRECTIVE_002_PROMPT = `NOCTIS AUTONOMOUS SOFTWARE DEVELOPMENT — EXECUTION DIRECTIVE 002
Project: OmniSphere
Design, develop, test and prepare for deployment OmniSphere: an enterprise multi-tenant global digital ecosystem combining e-commerce, multi-vendor marketplace, professional networking, freelance escrow, job portal, LMS courses, video platform, messaging, WebRTC, Stripe Connect sandbox payments, double-entry ledger, CRM, documents, e-signatures, Noctis AI assistant, recommendations, semantic search, advertising, customer support, notifications, analytics, administration, SOC security operations, moderation, and developer portal across 30 modules, 20 live foundation screens, 110 mapped screens, 17 RBAC roles, and PostgreSQL + pgvector with Row-Level Security.`;

async function main() {
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const omnisphereDir = path.resolve(repoRoot, "..", "omnisphere");

  console.log("[NASEE / Directive 002] Executing autonomous development pipeline...");
  const report = await executeNaseeAutonomousPipeline({
    prompt: DIRECTIVE_002_PROMPT,
    persist: false,
    actorId: "nasee-directive-002-runner",
    preferredBackend: "local-isolated",
    repositoryLocation: omnisphereDir,
  });

  // Materialize isolated omnisphere workspace
  await fs.rm(omnisphereDir, { recursive: true, force: true });
  await fs.mkdir(omnisphereDir, { recursive: true });

  const fileEntries = Object.entries(report.generatedFiles);
  for (const [relPath, content] of fileEntries) {
    const cleanRel = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!cleanRel || cleanRel.includes("..") || path.isAbsolute(cleanRel)) continue;
    const absTarget = path.resolve(omnisphereDir, cleanRel);
    if (!absTarget.startsWith(omnisphereDir + path.sep)) continue;
    await fs.mkdir(path.dirname(absTarget), { recursive: true });
    await fs.writeFile(absTarget, content, "utf8");
  }
  console.log(`[NASEE] Materialized ${fileEntries.length} files to ${omnisphereDir}`);

  // Directly execute npm test and performance benchmark inside standalone omnisphere/
  const directTestRes =
    process.platform === "win32"
      ? await execFileAsync("cmd.exe", ["/d", "/s", "/c", "npm test"], {
          cwd: omnisphereDir,
          timeout: 60_000,
          maxBuffer: 4 * 1024 * 1024,
        })
      : await execFileAsync("npm", ["test"], {
          cwd: omnisphereDir,
          timeout: 60_000,
          maxBuffer: 4 * 1024 * 1024,
        });

  const directBenchRes = await execFileAsync(
    process.execPath,
    ["--experimental-strip-types", "tests/performance/benchmark.mjs"],
    {
      cwd: omnisphereDir,
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );

  // Initialize standalone Git repository inside omnisphere/ (excluding runtime tmp)
  await fs.writeFile(path.join(omnisphereDir, ".gitignore"), "node_modules/\n.env\n*.log\n", "utf8");
  let workspaceCommitSha = "UNAVAILABLE";
  try {
    await execFileAsync("git", ["init", "-q"], { cwd: omnisphereDir, timeout: 8_000 });
    await execFileAsync("git", ["config", "user.name", "Noctis NASEE"], { cwd: omnisphereDir, timeout: 5_000 });
    await execFileAsync("git", ["config", "user.email", "nasee@noctis.local"], { cwd: omnisphereDir, timeout: 5_000 });
    await execFileAsync("git", ["add", "."], { cwd: omnisphereDir, timeout: 10_000 });
    await execFileAsync(
      "git",
      ["commit", "-q", "-m", "feat(omnisphere): initial NASEE 20-screen foundation & 30-module ecosystem"],
      { cwd: omnisphereDir, timeout: 10_000 },
    );
    const rev = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd: omnisphereDir, timeout: 5_000 });
    workspaceCommitSha = rev.stdout.trim() || "UNAVAILABLE";
  } catch (err) {
    console.warn("[NASEE] Standalone git init warning:", err instanceof Error ? err.message : err);
  }

  const acceptanceLines = [
    "# OmniSphere — Noctis Autonomous Software Engineering Engine (NASEE) Acceptance Report",
    "",
    `- **Project / Workspace ID:** \`${report.projectId}\``,
    `- **Standalone Repository Location:** \`${omnisphereDir}\``,
    `- **Standalone Git Commit:** \`${workspaceCommitSha}\` (Sandbox Git Commit: \`${report.gitCommitSha || "N/A"}\`)`,
    `- **Generated Artifacts:** ${fileEntries.length} monorepo files`,
    `- **Executed At:** ${report.executedAt}`,
    `- **Acceptance Score:** **${report.scorecard.totalScore} / ${report.scorecard.maxScore}**`,
    `- **Release Ready:** ${report.scorecard.releaseReady ? "YES" : "NO"}`,
    `- **Hard Veto Triggered:** ${report.scorecard.vetoTriggered ? `YES (${report.scorecard.vetoReasons.join("; ")})` : "NO"}`,
    "",
    report.markdownSummary,
    "",
    "## Direct Execution inside Standalone `omnisphere/`",
    "",
    `- **Direct \`npm test\` in \`omnisphere/\`:** EXITED 0`,
    `- **Direct Benchmark in \`omnisphere/\`:** \`${directBenchRes.stdout.trim()}\``,
    "",
    "```text",
    directTestRes.stdout.trim().slice(-2500),
    "```",
    "",
  ];

  await fs.writeFile(path.join(omnisphereDir, "ACCEPTANCE_REPORT.md"), acceptanceLines.join("\n"), "utf8");
  if (workspaceCommitSha !== "UNAVAILABLE") {
    await execFileAsync("git", ["add", "ACCEPTANCE_REPORT.md"], { cwd: omnisphereDir, timeout: 5_000 }).catch(() => undefined);
    await execFileAsync("git", ["commit", "-q", "-m", "docs: add NASEE acceptance report"], { cwd: omnisphereDir, timeout: 5_000 }).catch(() => undefined);
    const revFinal = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd: omnisphereDir, timeout: 5_000 }).catch(() => null);
    if (revFinal?.stdout?.trim()) workspaceCommitSha = revFinal.stdout.trim();
  }

  console.log(
    `[NASEE] Done | Git=${workspaceCommitSha} | DB tables=${report.pgliteMigration.tablesCreated} policies=${report.pgliteMigration.rlsPoliciesCreated} RLS_verified=${report.pgliteMigration.rlsCrossTenantVerified} | Sandbox=${report.sandboxExecution.testsPassed}/${report.sandboxExecution.testsTotal} | Score=${report.scorecard.totalScore}/100`,
  );

  if (!report.ok || report.scorecard.vetoTriggered) {
    console.error("[NASEE] Verification gate failed:", report.scorecard.vetoReasons);
    process.exit(1);
  }
}

void main().catch((err) => {
  console.error("[NASEE] Runner error:", err);
  process.exit(1);
});
