import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { generateForgeProject } from "../src/lib/forge/forge-engine.server.ts";
import { runForgeFilesInSandbox } from "../src/lib/forge/sandbox-runner.server.ts";
import { evaluateChallenge001 } from "../src/lib/forge/challenge-001-evaluator.server.ts";

const execFileAsync = promisify(execFile);

const CHALLENGE_001_PROMPT = `You are Noctis AI, a principal cloud-native full-stack software engineer and cybersecurity architect.
NOCTIS WEBSITE DEVELOPMENT CHALLENGE 001
Build OmniSphere, an enterprise multi-tenant global digital marketplace and professional services ecosystem combining e-commerce, multi-vendor storefronts, professional networking, freelance escrow marketplace, job portal, booking system, learning management, video platform, messaging, WebRTC video conferencing, Stripe Connect split payments, double-entry financial ledger, CRM, document management, electronic signatures, AI assistant, recommendation engine, semantic search, advertising platform, customer support, notification center, analytics, admin console, security operations, content moderation, and developer portal across 30 core functional modules, 110 mapped screens, 17 RBAC roles, PostgreSQL + pgvector with Row-Level Security, and EN/ES/FR/AR RTL multilingual support.`;

async function main() {
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const omnisphereDir = path.resolve(repoRoot, "..", "omnisphere");

  console.log("[Challenge 001] Generating OmniSphere enterprise monorepo...");
  const generated = await generateForgeProject({
    prompt: CHALLENGE_001_PROMPT,
    useAi: false,
    persist: false,
    actorId: "challenge-001-runner",
    stack: "Next.js + React + TypeScript + Tailwind + FastAPI/NestJS + PostgreSQL + pgvector + Redis + OpenSearch",
  });

  // Reset destination safely inside omnisphereDir before writing fresh tree
  await fs.rm(omnisphereDir, { recursive: true, force: true });
  await fs.mkdir(omnisphereDir, { recursive: true });

  const fileEntries = Object.entries(generated.files);
  for (const [relPath, content] of fileEntries) {
    const cleanRel = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!cleanRel || cleanRel.includes("..") || path.isAbsolute(cleanRel)) continue;
    const absTarget = path.resolve(omnisphereDir, cleanRel);
    if (!absTarget.startsWith(omnisphereDir + path.sep)) continue;
    await fs.mkdir(path.dirname(absTarget), { recursive: true });
    await fs.writeFile(absTarget, content, "utf8");
  }
  console.log(`[Challenge 001] Materialized ${fileEntries.length} files to ${omnisphereDir}`);

  // Run isolated sandbox verification & benchmark
  const sandboxExecution = await runForgeFilesInSandbox({
    projectId: generated.projectId,
    files: generated.files,
    sastFindingsCount: Array.isArray(generated.qaSecurity?.securityFindings)
      ? generated.qaSecurity.securityFindings.length
      : 0,
    preferredBackend: "local-isolated",
    autoRepair: true,
  });

  // Directly execute generated test suite and benchmark inside omnisphere directory
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

  const scorecard = evaluateChallenge001({
    projectId: generated.projectId,
    files: generated.files,
    qaSecurity: generated.qaSecurity,
    sandboxExecution,
  });

  const acceptanceLines = [
    "# OmniSphere — Noctis Website Development Challenge 001 Acceptance Report",
    "",
    `- **Project ID:** \`${generated.projectId}\``,
    `- **Project Name:** ${generated.name}`,
    `- **Classified Specialty:** \`${generated.spec.industrySpecialty}\` (Persona preamble stripped cleanly)`,
    `- **Generated Artifacts:** ${fileEntries.length} monorepo files`,
    `- **Evaluated At:** ${scorecard.evaluatedAt}`,
    `- **Acceptance Score:** **${scorecard.totalScore} / ${scorecard.maxScore}**`,
    `- **Release Ready:** ${scorecard.releaseReady ? "YES" : "NO"}`,
    `- **Hard Veto Triggered:** ${scorecard.vetoTriggered ? `YES (${scorecard.vetoReasons.join("; ")})` : "NO (All hard security/RLS/workflow/sandbox gates passed)"}`,
    "",
    "## Isolated Sandbox & Direct Execution Verification",
    "",
    `- **Sandbox Backend:** \`${sandboxExecution.backend}\` (\`${sandboxExecution.networkPolicy}\`)`,
    `- **Sandbox Tests Passed:** ${sandboxExecution.testsPassed} / ${sandboxExecution.testsTotal} in ${sandboxExecution.durationMs}ms (auto-repairs: ${sandboxExecution.repairsAttempted})`,
    sandboxExecution.benchmark
      ? `- **Measured Local HTTP Benchmark:** ${sandboxExecution.benchmark.requests} requests · p50=${sandboxExecution.benchmark.p50Ms}ms · p95=${sandboxExecution.benchmark.p95Ms}ms · ${sandboxExecution.benchmark.rps} req/s`
      : "- **Measured Local HTTP Benchmark:** N/A",
    `- **Direct \`npm test\` in \`omnisphere/\`:** EXITED 0`,
    `- **Direct Benchmark in \`omnisphere/\`:** \`${directBenchRes.stdout.trim()}\``,
    "",
    "## 12-Category Scorecard Breakdown (100 Points)",
    "",
    "| Category | Score | Max | Evidence |",
    "| --- | ---: | ---: | --- |",
    ...scorecard.categories.map(
      (c) => `| ${c.category} | ${c.score} | ${c.maxPoints} | ${c.evidence} |`,
    ),
    "",
    `## 28-Item Challenge 001 Checklist (${scorecard.counts.implementedVerified} Verified / ${scorecard.counts.partiallyImplemented} Partial / ${scorecard.counts.blockedExternal} Blocked External)`,
    "",
    "| # | Item | Status | Evidence / External Blocker |",
    "| ---: | --- | --- | --- |",
    ...scorecard.checklist.map(
      (item) =>
        `| ${item.id} | ${item.title} | \`${item.status}\` | ${item.evidence}${item.blockerNote ? ` **Blocker:** ${item.blockerNote}` : ""} |`,
    ),
    "",
    "## Direct `npm test` Output Excerpt",
    "",
    "```text",
    directTestRes.stdout.trim().slice(-2500),
    "```",
    "",
  ];

  await fs.writeFile(path.join(omnisphereDir, "ACCEPTANCE_REPORT.md"), acceptanceLines.join("\n"), "utf8");
  console.log(
    `[Challenge 001] Scorecard: ${scorecard.totalScore}/${scorecard.maxScore} | Verified=${scorecard.counts.implementedVerified} BlockedExternal=${scorecard.counts.blockedExternal} | ReleaseReady=${scorecard.releaseReady}`,
  );

  if (!sandboxExecution.passed || scorecard.vetoTriggered || !scorecard.releaseReady) {
    console.error("[Challenge 001] Verification gate failed:", scorecard.vetoReasons);
    process.exit(1);
  }
}

void main().catch((err) => {
  console.error("[Challenge 001] Runner error:", err);
  process.exit(1);
});
