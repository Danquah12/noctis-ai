import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Sandbox } from "@vercel/sandbox";
import {
  getForgeProjectRecord,
  updateForgeProjectQaSecurity,
} from "./forge-persistence.server.ts";

const execFileAsync = promisify(execFile);

export type SandboxBackendKind = "VERCEL_FIRECRACKER_MICROVM" | "LOCAL_ISOLATED_TEMP_EXEC";

export interface SandboxBenchmarkMetrics {
  measuredLocally: boolean;
  requests: number;
  p50Ms: number;
  p95Ms: number;
  rps: number;
  healthStatus?: number;
  metricsStatus?: number;
}

export interface SandboxExecutionResult {
  ok: boolean;
  projectId: string;
  backend: SandboxBackendKind;
  networkPolicy: "deny-all" | "local-process-no-inbound";
  isolationNote: string;
  sastPrecheckPassed: boolean;
  sastFindingsCount: number;
  compilePassed: boolean;
  compiledFilesCount: number;
  compileNote: string;
  gitCommitSha: string | null;
  gitStatusNote: string;
  testFilesExecuted: string[];
  passed: boolean;
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  durationMs: number;
  repairsAttempted: number;
  repairApplied: string | null;
  initialFailureExcerpt: string | null;
  benchmark: SandboxBenchmarkMetrics | null;
  stdoutExcerpt: string;
  stderrExcerpt: string;
  error?: string;
  ranAt: string;
}

function validateClientHtmlScript(files: Record<string, string>): { ok: boolean; note: string } {
  const html = files["index.html"];
  if (!html) return { ok: true, note: "No index.html present." };
  const matches = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    const tag = m[0] || "";
    if (/type\s*=\s*["']application\/(?:ld\+)?json["']/i.test(tag)) continue;
    const body = m[1] || "";
    if (!body.trim()) continue;
    try {
      new vm.Script(body);
    } catch (err) {
      return {
        ok: false,
        note: `index.html inline script syntax error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
  return { ok: true, note: "index.html inline <script> parsed via vm.Script." };
}

function collectSyntaxCheckFiles(files: Record<string, string>): string[] {
  return Object.keys(files)
    .map(sanitizeRelativePath)
    .filter((f): f is string => Boolean(f))
    .filter((f) => /\.(ts|mts|js|mjs)$/i.test(f) && !/\.tsx$/i.test(f) && !f.startsWith("tests/"))
    .slice(0, 20);
}

function sanitizeRelativePath(relPath: string): string | null {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    return null;
  }
  return normalized;
}

function parseNodeTapCounts(output: string): { total: number; passed: number; failed: number } {
  const testsMatch = output.match(/^# tests\s+(\d+)/m);
  const passMatch = output.match(/^# pass\s+(\d+)/m);
  const failMatch = output.match(/^# fail\s+(\d+)/m);
  if (testsMatch && passMatch && failMatch) {
    return {
      total: Number(testsMatch[1]),
      passed: Number(passMatch[1]),
      failed: Number(failMatch[1]),
    };
  }
  const okLines = (output.match(/^ok \d+\b/gm) || []).length;
  const notOkLines = (output.match(/^not ok \d+\b/gm) || []).length;
  const total = okLines + notOkLines;
  return { total, passed: okLines, failed: notOkLines };
}

function parseBenchmarkJson(output: string): SandboxBenchmarkMetrics | null {
  const lines = output.trim().split(/\r?\n/).reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) continue;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsed.p95Ms === "number" && typeof parsed.requests === "number") {
        return {
          measuredLocally: Boolean(parsed.measuredLocally ?? true),
          requests: Number(parsed.requests),
          p50Ms: Number(parsed.p50Ms ?? 0),
          p95Ms: Number(parsed.p95Ms ?? 0),
          rps: Number(parsed.rps ?? 0),
          healthStatus: typeof parsed.healthStatus === "number" ? parsed.healthStatus : undefined,
          metricsStatus: typeof parsed.metricsStatus === "number" ? parsed.metricsStatus : undefined,
        };
      }
    } catch {
      // continue scanning prior lines
    }
  }
  return null;
}

function hasVercelSandboxAuth(): boolean {
  if (process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN) return true;
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID) {
    return true;
  }
  return false;
}

function collectTestFiles(files: Record<string, string>): string[] {
  return Object.keys(files)
    .map(sanitizeRelativePath)
    .filter((f): f is string => Boolean(f))
    .filter((f) => /^tests\/.*\.test\.(ts|mts|js|mjs)$/i.test(f))
    .sort();
}

function attemptSingleAutoRepair(
  files: Record<string, string>,
  failureOutput: string,
): { files: Record<string, string>; repairNote: string } | null {
  const nextFiles = { ...files };
  // Repair case 1: package.json missing "type": "module" causes ESM import SyntaxError in node --test
  if (nextFiles["package.json"]) {
    try {
      const pkg = JSON.parse(nextFiles["package.json"]) as Record<string, unknown>;
      if (pkg.type !== "module") {
        pkg.type = "module";
        nextFiles["package.json"] = JSON.stringify(pkg, null, 2);
        return {
          files: nextFiles,
          repairNote: "Added \"type\": \"module\" to package.json for ESM test resolution.",
        };
      }
    } catch {
      // fall through
    }
  } else {
    nextFiles["package.json"] = JSON.stringify({ name: "forge-sandbox-app", version: "1.0.0", private: true, type: "module" }, null, 2);
    return {
      files: nextFiles,
      repairNote: "Synthesized missing package.json with ESM module mode.",
    };
  }

  // Repair case 2: benchmark or app server missing .ts extension in import
  if (/Cannot find module .*apps\/api\/src\/server['"]/.test(failureOutput)) {
    let changed = false;
    for (const [k, v] of Object.entries(nextFiles)) {
      if (v.includes("apps/api/src/server\"") && !v.includes("apps/api/src/server.ts\"")) {
        nextFiles[k] = v.replaceAll("apps/api/src/server\"", "apps/api/src/server.ts\"");
        changed = true;
      }
    }
    if (changed) {
      return {
        files: nextFiles,
        repairNote: "Resolved explicit .ts import extension for Node native type-stripping runner.",
      };
    }
  }

  return null;
}

async function runInVercelMicroVm(
  files: Record<string, string>,
  testFiles: string[],
  benchFile: string | null,
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  benchmark: SandboxBenchmarkMetrics | null;
  compilePassed: boolean;
  compiledFilesCount: number;
  compileNote: string;
  gitCommitSha: string | null;
  gitStatusNote: string;
  isolationNote: string;
}> {
  const explicitCreds =
    !process.env.VERCEL_OIDC_TOKEN &&
    process.env.VERCEL_TOKEN &&
    process.env.VERCEL_TEAM_ID &&
    process.env.VERCEL_PROJECT_ID
      ? {
          token: process.env.VERCEL_TOKEN,
          teamId: process.env.VERCEL_TEAM_ID,
          projectId: process.env.VERCEL_PROJECT_ID,
        }
      : {};

  const sandbox = await Sandbox.create({
    image: "vercel/sandbox/node:24",
    resources: { vcpus: 1 },
    timeout: 90_000,
    persistent: false,
    networkPolicy: "deny-all",
    ...explicitCreds,
  });

  const projectRoot = "/vercel/sandbox/project";
  try {
    const dirSet = new Set<string>([projectRoot]);
    const writeEntries: { path: string; content: Buffer }[] = [];

    for (const [rawRel, content] of Object.entries(files)) {
      const rel = sanitizeRelativePath(rawRel);
      if (!rel) continue;
      const fullPath = `${projectRoot}/${rel}`;
      const parts = rel.split("/");
      for (let i = 1; i < parts.length; i += 1) {
        dirSet.add(`${projectRoot}/${parts.slice(0, i).join("/")}`);
      }
      writeEntries.push({
        path: fullPath,
        content: Buffer.from(content, "utf8"),
      });
    }

    const sortedDirs = [...dirSet].sort((a, b) => a.split("/").length - b.split("/").length);
    if (sortedDirs.length > 0) {
      await sandbox.runCommand({
        cmd: "mkdir",
        args: ["-p", ...sortedDirs],
      });
    }

    // Batch writeFiles calls in chunks of 40 so payload stays compact
    for (let i = 0; i < writeEntries.length; i += 40) {
      await sandbox.writeFiles(writeEntries.slice(i, i + 40));
    }

    const htmlCheck = validateClientHtmlScript(files);
    const tsTargets = collectSyntaxCheckFiles(files);
    let compilePassed = htmlCheck.ok;
    let compiledFilesCount = files["index.html"] ? 1 : 0;
    const compileNotes: string[] = [htmlCheck.note];
    for (const tsFile of tsTargets) {
      const chk = await sandbox.runCommand({
        cmd: "node",
        args: ["--experimental-strip-types", "--check", tsFile],
        cwd: projectRoot,
      });
      if (chk.exitCode === 0) {
        compiledFilesCount += 1;
      } else {
        compilePassed = false;
        const cErr = await chk.stderr();
        compileNotes.push(`${tsFile}: ${cErr.slice(0, 120)}`);
      }
    }

    let gitCommitSha: string | null = null;
    let gitStatusNote = "git unavailable in Vercel MicroVM image.";
    try {
      const gCmd = await sandbox.runCommand({
        cmd: "sh",
        args: [
          "-c",
          "if command -v git >/dev/null 2>&1; then git init -q && git config user.name 'Noctis NASEE' && git config user.email 'nasee@noctis.local' && git add . && git commit -q -m 'chore: initial autonomous build' && git rev-parse --short HEAD; fi",
        ],
        cwd: projectRoot,
      });
      const shaOut = (await gCmd.stdout()).trim();
      if (gCmd.exitCode === 0 && /^[0-9a-f]{6,40}$/i.test(shaOut)) {
        gitCommitSha = shaOut;
        gitStatusNote = `Committed isolated workspace snapshot (${shaOut}).`;
      }
    } catch {
      // keep honest fallback note
    }

    const testCmd = await sandbox.runCommand({
      cmd: "node",
      args: ["--experimental-strip-types", "--test-reporter=tap", "--test", ...testFiles],
      cwd: projectRoot,
    });

    const stdout = await testCmd.stdout();
    const stderr = await testCmd.stderr();
    let benchmark: SandboxBenchmarkMetrics | null = null;
    let combinedStdout = stdout;
    let combinedStderr = stderr;

    if (benchFile) {
      const benchCmd = await sandbox.runCommand({
        cmd: "node",
        args: ["--experimental-strip-types", benchFile],
        cwd: projectRoot,
      });
      const bOut = await benchCmd.stdout();
      const bErr = await benchCmd.stderr();
      benchmark = parseBenchmarkJson(bOut);
      if (bOut) combinedStdout += `\n--- benchmark ---\n${bOut}`;
      if (bErr) combinedStderr += `\n--- benchmark stderr ---\n${bErr}`;
    }

    return {
      exitCode: testCmd.exitCode,
      stdout: combinedStdout,
      stderr: combinedStderr,
      benchmark,
      compilePassed,
      compiledFilesCount,
      compileNote: compileNotes.join(" "),
      gitCommitSha,
      gitStatusNote,
      isolationNote: "Executed inside ephemeral Vercel Firecracker MicroVM (node:24, networkPolicy=deny-all).",
    };
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}

async function runInLocalTempDir(
  files: Record<string, string>,
  testFiles: string[],
  benchFile: string | null,
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  benchmark: SandboxBenchmarkMetrics | null;
  compilePassed: boolean;
  compiledFilesCount: number;
  compileNote: string;
  gitCommitSha: string | null;
  gitStatusNote: string;
  isolationNote: string;
}> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "noctis-forge-sandbox-"));
  const scrubbedEnv: Record<string, string> = {
    NODE_ENV: "test",
    PATH: process.env.PATH || "",
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
  };

  try {
    for (const [rawRel, content] of Object.entries(files)) {
      const rel = sanitizeRelativePath(rawRel);
      if (!rel) continue;
      const absTarget = path.resolve(tempDir, rel);
      if (!absTarget.startsWith(tempDir + path.sep) && absTarget !== tempDir) continue;
      await fs.mkdir(path.dirname(absTarget), { recursive: true });
      await fs.writeFile(absTarget, content, "utf8");
    }

    const htmlCheck = validateClientHtmlScript(files);
    const tsTargets = collectSyntaxCheckFiles(files);
    let compilePassed = htmlCheck.ok;
    let compiledFilesCount = files["index.html"] ? 1 : 0;
    const compileNotes: string[] = [htmlCheck.note];
    for (const tsFile of tsTargets) {
      try {
        await execFileAsync(
          process.execPath,
          ["--experimental-strip-types", "--check", tsFile],
          { cwd: tempDir, env: scrubbedEnv, timeout: 10_000 },
        );
        compiledFilesCount += 1;
      } catch (err) {
        compilePassed = false;
        const e = err as { stderr?: string; message?: string };
        compileNotes.push(`${tsFile}: ${String(e.stderr || e.message || "").slice(0, 120)}`);
      }
    }

    let gitCommitSha: string | null = null;
    let gitStatusNote = "git binary unavailable in runtime container.";
    try {
      await execFileAsync("git", ["init", "-q"], { cwd: tempDir, env: scrubbedEnv, timeout: 8_000 });
      await execFileAsync("git", ["config", "user.name", "Noctis NASEE"], { cwd: tempDir, env: scrubbedEnv, timeout: 5_000 });
      await execFileAsync("git", ["config", "user.email", "nasee@noctis.local"], { cwd: tempDir, env: scrubbedEnv, timeout: 5_000 });
      await execFileAsync("git", ["add", "."], { cwd: tempDir, env: scrubbedEnv, timeout: 10_000 });
      await execFileAsync("git", ["commit", "-q", "-m", "chore: initial autonomous build"], { cwd: tempDir, env: scrubbedEnv, timeout: 10_000 });
      const rev = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd: tempDir, env: scrubbedEnv, timeout: 5_000 });
      const sha = rev.stdout.trim();
      if (/^[0-9a-f]{6,40}$/i.test(sha)) {
        gitCommitSha = sha;
        gitStatusNote = `Committed isolated git repo (${sha}).`;
      }
    } catch {
      // serverless container without git binary falls back cleanly
    }

    let exitCode = 0;
    let stdout = "";
    let stderr = "";

    try {
      const res = await execFileAsync(
        process.execPath,
        ["--experimental-strip-types", "--test-reporter=tap", "--test", ...testFiles],
        {
          cwd: tempDir,
          env: scrubbedEnv,
          timeout: 30_000,
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      stdout = res.stdout;
      stderr = res.stderr;
    } catch (err) {
      const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
      exitCode = typeof e.code === "number" ? e.code : 1;
      stdout = String(e.stdout || "");
      stderr = String(e.stderr || e.message || "Test execution failed");
    }

    let benchmark: SandboxBenchmarkMetrics | null = null;
    if (benchFile) {
      try {
        const bRes = await execFileAsync(
          process.execPath,
          ["--experimental-strip-types", benchFile],
          {
            cwd: tempDir,
            env: scrubbedEnv,
            timeout: 20_000,
            maxBuffer: 2 * 1024 * 1024,
          },
        );
        benchmark = parseBenchmarkJson(bRes.stdout);
        if (bRes.stdout) stdout += `\n--- benchmark ---\n${bRes.stdout}`;
        if (bRes.stderr) stderr += `\n--- benchmark stderr ---\n${bRes.stderr}`;
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        stderr += `\n--- benchmark error ---\n${e.stderr || e.message || "Benchmark failed"}`;
      }
    }

    return {
      exitCode,
      stdout,
      stderr,
      benchmark,
      compilePassed,
      compiledFilesCount,
      compileNote: compileNotes.join(" "),
      gitCommitSha,
      gitStatusNote,
      isolationNote:
        "Executed in isolated OS temporary workspace with scrubbed environment variables (no Vercel Sandbox MicroVM OIDC/token configured in runtime).",
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function runForgeFilesInSandbox(input: {
  projectId: string;
  files: Record<string, string>;
  sastFindingsCount?: number;
  preferredBackend?: "auto" | "vercel-sandbox" | "local-isolated";
  autoRepair?: boolean;
}): Promise<SandboxExecutionResult> {
  const startedAt = Date.now();
  const sastFindingsCount = input.sastFindingsCount ?? 0;
  const testFiles = collectTestFiles(input.files);
  const benchFile = input.files["tests/performance/benchmark.mjs"] ? "tests/performance/benchmark.mjs" : null;

  if (sastFindingsCount > 0) {
    return {
      ok: false,
      projectId: input.projectId,
      backend: hasVercelSandboxAuth() ? "VERCEL_FIRECRACKER_MICROVM" : "LOCAL_ISOLATED_TEMP_EXEC",
      networkPolicy: hasVercelSandboxAuth() ? "deny-all" : "local-process-no-inbound",
      isolationNote: "Blocked execution before sandbox launch due to static security findings.",
      sastPrecheckPassed: false,
      sastFindingsCount,
      compilePassed: false,
      compiledFilesCount: 0,
      compileNote: "Skipped due to SAST precheck block.",
      gitCommitSha: null,
      gitStatusNote: "Not initialized.",
      testFilesExecuted: [],
      passed: false,
      testsTotal: 0,
      testsPassed: 0,
      testsFailed: 0,
      durationMs: Date.now() - startedAt,
      repairsAttempted: 0,
      repairApplied: null,
      initialFailureExcerpt: null,
      benchmark: null,
      stdoutExcerpt: "",
      stderrExcerpt: "",
      error: `SAST precheck blocked sandbox execution (${sastFindingsCount} finding(s)).`,
      ranAt: new Date().toISOString(),
    };
  }

  if (testFiles.length === 0) {
    return {
      ok: false,
      projectId: input.projectId,
      backend: "LOCAL_ISOLATED_TEMP_EXEC",
      networkPolicy: "local-process-no-inbound",
      isolationNote: "No executable tests/*.test.* files found in project artifacts.",
      sastPrecheckPassed: true,
      sastFindingsCount: 0,
      compilePassed: false,
      compiledFilesCount: 0,
      compileNote: "No test files found.",
      gitCommitSha: null,
      gitStatusNote: "Not initialized.",
      testFilesExecuted: [],
      passed: false,
      testsTotal: 0,
      testsPassed: 0,
      testsFailed: 0,
      durationMs: Date.now() - startedAt,
      repairsAttempted: 0,
      repairApplied: null,
      initialFailureExcerpt: null,
      benchmark: null,
      stdoutExcerpt: "",
      stderrExcerpt: "",
      error: "Project does not contain tests/*.test.ts files.",
      ranAt: new Date().toISOString(),
    };
  }

  const preferred = input.preferredBackend ?? "auto";
  const canUseVercel = preferred !== "local-isolated" && (preferred === "vercel-sandbox" || hasVercelSandboxAuth());
  const executeOnce = async (filesToRun: Record<string, string>) => {
    if (canUseVercel) {
      try {
        const res = await runInVercelMicroVm(filesToRun, testFiles, benchFile);
        return { backend: "VERCEL_FIRECRACKER_MICROVM" as const, networkPolicy: "deny-all" as const, ...res };
      } catch (err) {
        if (preferred === "vercel-sandbox") {
          throw err;
        }
        const fallback = await runInLocalTempDir(filesToRun, testFiles, benchFile);
        const msg = err instanceof Error ? err.message : "MicroVM unavailable";
        return {
          backend: "LOCAL_ISOLATED_TEMP_EXEC" as const,
          networkPolicy: "local-process-no-inbound" as const,
          ...fallback,
          isolationNote: `${fallback.isolationNote} (Vercel MicroVM fallback reason: ${msg.slice(0, 120)})`,
        };
      }
    }
    const local = await runInLocalTempDir(filesToRun, testFiles, benchFile);
    return { backend: "LOCAL_ISOLATED_TEMP_EXEC" as const, networkPolicy: "local-process-no-inbound" as const, ...local };
  };

  try {
    let workingFiles = input.files;
    let run = await executeOnce(workingFiles);
    let counts = parseNodeTapCounts(run.stdout);
    let passed = run.exitCode === 0 && counts.failed === 0 && counts.passed > 0;
    let repairsAttempted = 0;
    let repairApplied: string | null = null;
    let initialFailureExcerpt: string | null = null;

    if (!passed && input.autoRepair !== false) {
      initialFailureExcerpt = (run.stderr || run.stdout || "").slice(0, 500) || null;
      const repair = attemptSingleAutoRepair(workingFiles, `${run.stdout}\n${run.stderr}`);
      if (repair) {
        repairsAttempted = 1;
        repairApplied = repair.repairNote;
        workingFiles = repair.files;
        run = await executeOnce(workingFiles);
        counts = parseNodeTapCounts(run.stdout);
        passed = run.exitCode === 0 && counts.failed === 0 && counts.passed > 0;
      }
    }

    return {
      ok: passed,
      projectId: input.projectId,
      backend: run.backend,
      networkPolicy: run.networkPolicy,
      isolationNote: run.isolationNote,
      sastPrecheckPassed: true,
      sastFindingsCount: 0,
      compilePassed: run.compilePassed,
      compiledFilesCount: run.compiledFilesCount,
      compileNote: run.compileNote,
      gitCommitSha: run.gitCommitSha,
      gitStatusNote: run.gitStatusNote,
      testFilesExecuted: testFiles,
      passed,
      testsTotal: counts.total,
      testsPassed: counts.passed,
      testsFailed: counts.failed,
      durationMs: Date.now() - startedAt,
      repairsAttempted,
      repairApplied,
      initialFailureExcerpt,
      benchmark: run.benchmark,
      stdoutExcerpt: run.stdout.slice(-3000),
      stderrExcerpt: run.stderr.slice(-1500),
      ranAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      projectId: input.projectId,
      backend: canUseVercel ? "VERCEL_FIRECRACKER_MICROVM" : "LOCAL_ISOLATED_TEMP_EXEC",
      networkPolicy: canUseVercel ? "deny-all" : "local-process-no-inbound",
      isolationNote: "Sandbox runner aborted with runtime exception.",
      sastPrecheckPassed: true,
      sastFindingsCount: 0,
      compilePassed: false,
      compiledFilesCount: 0,
      compileNote: "Aborted before compilation.",
      gitCommitSha: null,
      gitStatusNote: "Not initialized.",
      testFilesExecuted: testFiles,
      passed: false,
      testsTotal: 0,
      testsPassed: 0,
      testsFailed: 0,
      durationMs: Date.now() - startedAt,
      repairsAttempted: 0,
      repairApplied: null,
      initialFailureExcerpt: null,
      benchmark: null,
      stdoutExcerpt: "",
      stderrExcerpt: "",
      error: err instanceof Error ? err.message : "Sandbox execution failed",
      ranAt: new Date().toISOString(),
    };
  }
}

export async function runForgeProjectInSandbox(
  projectId: string,
  opts?: {
    preferredBackend?: "auto" | "vercel-sandbox" | "local-isolated";
    autoRepair?: boolean;
  },
): Promise<SandboxExecutionResult> {
  const proj = await getForgeProjectRecord(projectId);
  if (!proj) {
    return {
      ok: false,
      projectId,
      backend: "LOCAL_ISOLATED_TEMP_EXEC",
      networkPolicy: "local-process-no-inbound",
      isolationNote: "Forge project record not found.",
      sastPrecheckPassed: false,
      sastFindingsCount: 0,
      compilePassed: false,
      compiledFilesCount: 0,
      compileNote: "Project not found.",
      gitCommitSha: null,
      gitStatusNote: "Not initialized.",
      testFilesExecuted: [],
      passed: false,
      testsTotal: 0,
      testsPassed: 0,
      testsFailed: 0,
      durationMs: 0,
      repairsAttempted: 0,
      repairApplied: null,
      initialFailureExcerpt: null,
      benchmark: null,
      stdoutExcerpt: "",
      stderrExcerpt: "",
      error: "Project not found.",
      ranAt: new Date().toISOString(),
    };
  }

  const files = (proj.files_json && typeof proj.files_json === "object" ? proj.files_json : {}) as Record<string, string>;
  const existingQa = (proj.qa_security_json && typeof proj.qa_security_json === "object"
    ? proj.qa_security_json
    : {}) as Record<string, unknown>;
  const findings = Array.isArray(existingQa.securityFindings) ? existingQa.securityFindings : [];

  const result = await runForgeFilesInSandbox({
    projectId,
    files,
    sastFindingsCount: findings.length,
    preferredBackend: opts?.preferredBackend,
    autoRepair: opts?.autoRepair,
  });

  await updateForgeProjectQaSecurity(projectId, {
    ...existingQa,
    sandboxExecution: result,
  }).catch(() => undefined);

  return result;
}
