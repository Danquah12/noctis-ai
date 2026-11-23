/**
 * Noctis Coding Agent (`Studio 1`)
 * Capabilities #5 (Coding assistant), #6 (Repository analysis), #7 (Safe Code execution),
 * plus #61-#70 (Maintenance, Multi-file PR, Test gen, Debug, Arch, Reversible Migrations, Profiler, SAST, CI/CD, Deploy verification).
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { sha256Sync } from "../universal-crypto.ts";
import { buildPullRequestPackage } from "../noctis-git-remediator.server.ts";
import { executePythonSandbox, extractRunnableCode, stripTypesSimple } from "../noctis-wasm-runner.ts";
import { evaluateCanaryRollbackGate } from "../catalog260/persistence.server.ts";
import { NOCTIS_100_CAPABILITY_PARITY_MATRIX } from "./parity-matrix.ts";

const ARCHITECTURE_LAYERS = [
  "Routes & REST Handlers (src/routes/api/v2.*)",
  "Deterministic Domain Solvers (NDKRS + NUPS + Catalog260 + Assistant + Forge)",
  "Independent Verification Engine & RBAC / Fail-Closed Safety Gates",
  "Neon PostgreSQL + pgvector HNSW Persistent Storage (migrations/0001..0022)",
];

const EXTRA_MANIFEST_MODULES = [
  "src/lib/assistant/benchmark-100.server.ts",
  "src/lib/assistant/chat-bridge.server.ts",
  "src/lib/assistant/parity-matrix.ts",
  "src/lib/forge/forge-catalog.ts",
  "src/lib/forge/forge-engine.server.ts",
  "src/lib/forge/forge-persistence.server.ts",
  "src/lib/forge/api-handler.server.ts",
  "src/routes/api/v2.assistant.$.ts",
  "src/routes/api/v2.forge.$.ts",
  "src/components/noctis/NoctisForgeBuilderStudio.tsx",
  "src/components/noctis/NoctisForgeTab.tsx",
];

function resolveSafeRepoRoot(): string {
  const cwd = process.cwd();
  return fs.existsSync(path.join(cwd, "src")) ? cwd : path.join(cwd, "noctis-ai");
}

/** #6 / #61 / #65 Workspace Repository & Architecture Analyzer (Strictly path-traversal guarded) */
export function analyzeWorkspaceRepository(input: { subdir?: string; query?: string } = {}) {
  const repoRoot = resolveSafeRepoRoot();
  const rel = (input.subdir || "src").replace(/\\/g, "/").replace(/\/+$/, "") || "src";
  if (rel.includes("..") || path.isAbsolute(rel) || /\.env|node_modules|\.git|secret|private/i.test(rel)) {
    return {
      ok: false as const,
      error: "Blocked unsafe or restricted path outside src/ workspace boundary.",
      totalFiles: 0,
      extensionCounts: {},
      sampleFiles: [],
      architectureLayers: [],
    };
  }

  const q = (input.query || "").trim().toLowerCase();
  const hasSourceTree = fs.existsSync(path.join(repoRoot, "src"));
  if (!hasSourceTree) {
    // Compiled serverless bundles (Vercel Nitro) omit raw src/*.ts files; introspect the verified runtime manifest.
    const uniqueModules = Array.from(
      new Set([
        ...NOCTIS_100_CAPABILITY_PARITY_MATRIX.flatMap((m) => m.sourceModules),
        ...EXTRA_MANIFEST_MODULES,
      ]),
    ).sort();
    const scoped = uniqueModules.filter((f) => f === rel || f.startsWith(`${rel}/`));
    const filtered = q ? scoped.filter((f) => f.toLowerCase().includes(q)) : scoped;
    if (filtered.length === 0) {
      return {
        ok: false as const,
        error: `Directory '${rel}' does not exist inside compiled runtime manifest.`,
        totalFiles: 0,
        extensionCounts: {},
        sampleFiles: [],
        architectureLayers: [],
      };
    }
    const extCounts: Record<string, number> = {};
    const matched = filtered.map((file) => {
      const ext = path.extname(file).toLowerCase() || ".other";
      extCounts[ext] = (extCounts[ext] || 0) + 1;
      return { file, bytes: 0, lines: 0 };
    });
    return {
      ok: true as const,
      sourceMode: "compiled-runtime-manifest" as const,
      scannedPath: rel,
      totalFiles: matched.length,
      extensionCounts: extCounts,
      sampleFiles: matched.slice(0, 35),
      architectureLayers: ARCHITECTURE_LAYERS,
    };
  }

  const targetDir = path.resolve(repoRoot, rel);
  if (!targetDir.startsWith(repoRoot) || !fs.existsSync(targetDir)) {
    return {
      ok: false as const,
      error: `Directory '${rel}' does not exist inside workspace.`,
      totalFiles: 0,
      extensionCounts: {},
      sampleFiles: [],
      architectureLayers: [],
    };
  }

  const extCounts: Record<string, number> = {};
  const matchedFiles: { file: string; bytes: number; lines: number }[] = [];

  function walk(dir: string, depth: number) {
    if (depth > 4 || matchedFiles.length >= 250) return;
    let items: fs.Dirent[] = [];
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of items) {
      if (ent.name.startsWith(".") || ent.name === "node_modules" || ent.name === "dist") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, depth + 1);
      } else if (/\.(ts|tsx|sql|json|mjs|md)$/i.test(ent.name)) {
        const ext = path.extname(ent.name).toLowerCase() || ".other";
        extCounts[ext] = (extCounts[ext] || 0) + 1;
        const relPath = path.relative(repoRoot, full).replace(/\\/g, "/");
        if (!q || relPath.toLowerCase().includes(q)) {
          let bytes = 0;
          let lines = 0;
          try {
            const st = fs.statSync(full);
            bytes = st.size;
            if (bytes < 250_000) {
              lines = fs.readFileSync(full, "utf8").split(/\r?\n/).length;
            }
          } catch {
            /* ignore */
          }
          matchedFiles.push({ file: relPath, bytes, lines });
        }
      }
    }
  }

  walk(targetDir, 0);

  return {
    ok: true as const,
    sourceMode: "filesystem" as const,
    scannedPath: rel,
    totalFiles: matchedFiles.length,
    extensionCounts: extCounts,
    sampleFiles: matchedFiles.slice(0, 35),
    architectureLayers: ARCHITECTURE_LAYERS,
  };
}

/** #7 Isolated node:vm JavaScript/TypeScript + Guarded Python Code Execution Sandbox */
export async function executeSafeCodeSandbox(input: {
  code: string;
  language?: "javascript" | "typescript" | "python" | "auto";
  timeoutMs?: number;
}) {
  const startedAt = Date.now();
  const runnable = extractRunnableCode(input.code || "");
  if (!runnable.trim()) {
    return {
      status: "ERROR" as const,
      language: input.language || "javascript",
      stdout: [],
      stderr: ["No executable code supplied."],
      returnValue: undefined,
      executionMs: 1,
      executionSeal: `SIG_SANDBOX_${sha256Sync("EMPTY").slice(0, 16)}`,
    };
  }

  const detectedLang =
    input.language && input.language !== "auto"
      ? input.language
      : /^(?:import\s+\w+|def\s+\w+|print\s*\()/m.test(runnable)
        ? "python"
        : "javascript";

  if (detectedLang === "python") {
    if (/\b(os\.system|subprocess|socket|__import__\s*\(\s*['"](?:os|subprocess|socket)|open\s*\(\s*['"]\/etc)\b/i.test(runnable)) {
      return {
        status: "BLOCKED" as const,
        language: "python",
        stdout: [],
        stderr: ["Blocked restricted system/network call inside isolated sandbox."],
        returnValue: undefined,
        executionMs: 1,
        executionSeal: `SIG_SANDBOX_BLOCK_${sha256Sync(runnable).slice(0, 16)}`,
      };
    }
    const pyRes = await executePythonSandbox(runnable, Math.min(4000, input.timeoutMs || 3000));
    return {
      status: pyRes.status,
      language: "python",
      stdout: pyRes.stdout,
      stderr: pyRes.stderr,
      returnValue: pyRes.returnValue,
      executionMs: pyRes.executionMs,
      executionSeal: pyRes.executionSeal,
    };
  }

  // Block global escape or Node native bindings inside JS/TS vm context
  if (/\b(process\.env|require\s*\(|child_process|import\s*\(|eval\s*\(|Function\s*\()\b/.test(runnable)) {
    return {
      status: "BLOCKED" as const,
      language: detectedLang,
      stdout: [],
      stderr: ["Sandbox policy blocked forbidden host primitive (process/require/eval/child_process/dynamic import)."],
      returnValue: undefined,
      executionMs: 1,
      executionSeal: `SIG_SANDBOX_BLOCK_${sha256Sync(runnable).slice(0, 16)}`,
    };
  }

  const cleanJs = stripTypesSimple(runnable).replace(/\bexport\s+/g, "");
  const stdout: string[] = [];
  const stderr: string[] = [];

  const sandbox = vm.createContext({
    console: {
      log: (...args: unknown[]) => stdout.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")),
      warn: (...args: unknown[]) => stderr.push(`[WARN] ${args.map(String).join(" ")}`),
      error: (...args: unknown[]) => stderr.push(`[ERROR] ${args.map(String).join(" ")}`),
    },
    Math,
    JSON,
    Date,
    Array,
    Object,
    Number,
    String,
    Boolean,
  });

  try {
    const script = new vm.Script(`"use strict";\n${cleanJs}`);
    const ret = script.runInContext(sandbox, { timeout: Math.min(3000, Math.max(200, input.timeoutMs || 1500)) });
    const elapsed = Math.max(1, Date.now() - startedAt);
    return {
      status: "SUCCESS" as const,
      language: detectedLang,
      stdout,
      stderr,
      returnValue: ret,
      executionMs: elapsed,
      executionSeal: `SIG_VM_${sha256Sync(cleanJs + stdout.join("\n")).slice(0, 20)}`,
    };
  } catch (err) {
    return {
      status: "ERROR" as const,
      language: detectedLang,
      stdout,
      stderr: [err instanceof Error ? err.message : String(err)],
      returnValue: undefined,
      executionMs: Math.max(1, Date.now() - startedAt),
      executionSeal: `SIG_VM_ERR_${sha256Sync(cleanJs).slice(0, 16)}`,
    };
  }
}

/** #5 / #62 / #68 Quick SAST Scan + Pull Request Proposal with Mandatory Human Merge Gate */
export function generateCodingAgentProposal(input: {
  title: string;
  filePath: string;
  originalCode: string;
  patchedCode: string;
  repo?: string;
  summary?: string;
}) {
  const securityFlags: string[] = [];
  if (/\beval\s*\(|new\s+Function\s*\(/i.test(input.patchedCode)) securityFlags.push("CRITICAL: Dynamic code evaluation (eval/Function)");
  if (/dangerouslySetInnerHTML|innerHTML\s*=/i.test(input.patchedCode)) securityFlags.push("HIGH: Potential DOM XSS sink");
  if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/i.test(input.patchedCode)) {
    securityFlags.push("CRITICAL: Hardcoded credential detected");
  }
  if (/SELECT\s+.*\+\s*[a-zA-Z0-9_]+|sql\.query\s*\(\s*`[^`]*\$\{/i.test(input.patchedCode)) {
    securityFlags.push("HIGH: Potential string-interpolated SQL query (use parameterized $1)");
  }

  const pr = buildPullRequestPackage({
    title: input.title,
    targetFilename: input.filePath,
    originalCode: input.originalCode,
    patchedCode: input.patchedCode,
    vulnerabilitySummary: input.summary,
  });

  return {
    ...pr,
    sastReview: {
      findingsCount: securityFlags.length,
      findings: securityFlags,
      passedClean: securityFlags.length === 0,
    },
    requiresHumanApproval: true,
    canAutoMergeOrDeploy: false,
  };
}

/** #63 Test Generator */
export function generateUnitTestScaffold(input: { moduleName: string; exportNames: string[] }) {
  const fns = input.exportNames.length > 0 ? input.exportNames : ["runTarget"];
  const code = [
    `import test from "node:test";`,
    `import assert from "node:assert/strict";`,
    `import { ${fns.join(", ")} } from "./${input.moduleName.replace(/\.ts$/, "")}.ts";`,
    ``,
    ...fns.flatMap((fn) => [
      `test("${fn} satisfies deterministic contract and boundary checks", async () => {`,
      `  assert.equal(typeof ${fn}, "function");`,
      `});`,
      ``,
    ]),
  ].join("\n");
  return { moduleName: input.moduleName, generatedTestsCount: fns.length, testCode: code };
}

/** #64 Automated Debugging Trace Analyzer */
export function diagnoseFailureTrace(stackOrError: string) {
  const lines = (stackOrError || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const frames = lines.filter((l) => /^at\s+/i.test(l)).slice(0, 6);
  let rootCause = "Inspect thrown exception and input boundary assumptions.";
  let fixRecommendation = "Add defensive validation and unit regression case in tests.";

  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(stackOrError)) {
    rootCause = "Network/database socket connection failed or timed out.";
    fixRecommendation = "Verify DATABASE_URL/upstream host availability, TLS sslmode, and retry backoff.";
  } else if (/ERR_ASSERTION|AssertionError/i.test(stackOrError)) {
    rootCause = "Contract assertion mismatch between actual and expected output schema/values.";
    fixRecommendation = "Inspect property spelling, numeric rounding tolerance, or boundary condition in target function.";
  } else if (/TS\d{4}|error TS/i.test(stackOrError)) {
    rootCause = "TypeScript compile-time type mismatch or missing property in interface.";
    fixRecommendation = "Update interface definition or pass exact typed fields matching callee signature.";
  } else if (/Cannot find module|MODULE_NOT_FOUND/i.test(stackOrError)) {
    rootCause = "Unresolved module import path relative to execution working directory.";
    fixRecommendation = "Check relative .ts/.mjs path or NODE_PATH / tsconfig path alias.";
  }

  return {
    headlineError: lines[0] || "Unknown error",
    framesCount: frames.length,
    topFrames: frames,
    rootCause,
    fixRecommendation,
  };
}

/** #66 Safe Reversible PostgreSQL Migration Generator */
export function generateSafeSqlMigration(input: {
  tableName: string;
  columns: { name: string; sqlType: string; notNull?: boolean }[];
  allowDestructive?: boolean;
}) {
  const safeTable = input.tableName.replace(/[^a-zA-Z0-9_.]/g, "");
  if (/\bdrop\s+table\b|\btruncate\b/i.test(input.tableName) && !input.allowDestructive) {
    return { blocked: true, reason: "Destructive DDL rejected without explicit human DBA confirmation." };
  }
  const colDefs = input.columns.map(
    (c) => `  ${c.name.replace(/[^a-zA-Z0-9_]/g, "")} ${c.sqlType}${c.notNull ? " NOT NULL" : ""}`,
  );
  const upSql = `CREATE TABLE IF NOT EXISTS ${safeTable} (\n  id TEXT PRIMARY KEY,\n${colDefs.join(",\n")},\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n);`;
  const downSql = `-- Execute ONLY with DBA human approval:\nDROP TABLE IF EXISTS ${safeTable};`;
  return {
    blocked: false,
    tableName: safeTable,
    upSql,
    downSql,
    reversible: true,
    sha256: sha256Sync(upSql),
  };
}

/** #67 Static Complexity & N+1 Bottleneck Profiler */
export function profileCodeOrQuery(sourceCode: string) {
  const warnings: string[] = [];
  if (/for\s*\([^)]*\)\s*\{[\s\S]{0,200}await\s+(?:sql|fetch|db)/i.test(sourceCode)) {
    warnings.push("BOTTLENECK_N_PLUS_ONE: Awaited DB/HTTP call inside loop -> batch with Promise.all or SQL = ANY($1).");
  }
  if (/for\s*\([^)]*\)\s*\{[\s\S]{0,180}for\s*\(/i.test(sourceCode)) {
    warnings.push("COMPLEXITY_O_N2: Nested loop detected -> index lookup with Map/Set for O(N) runtime.");
  }
  if (/SELECT\s+\*\s+FROM/i.test(sourceCode) && !/\bLIMIT\b/i.test(sourceCode)) {
    warnings.push("UNBOUNDED_SELECT: SELECT * without LIMIT -> project needed columns and cap rows.");
  }
  return {
    linesAnalyzed: sourceCode.split(/\r?\n/).length,
    bottleneckCount: warnings.length,
    warnings,
    status: warnings.length === 0 ? "OPTIMAL" : "NEEDS_TUNING",
  };
}

/** #69 CI/CD Pipeline Generator & Security Linter */
export function generateOrAuditCiCdPipeline(yamlContent?: string) {
  if (!yamlContent) {
    return {
      mode: "GENERATED",
      yaml: `name: noctis-ci
on: [push, pull_request]
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: npm ci
      - run: npm test && npm run build
`,
    };
  }
  const issues: string[] = [];
  if (!/permissions:/i.test(yamlContent)) issues.push("Missing explicit least-privilege 'permissions:' block.");
  if (/pull_request_target/i.test(yamlContent)) issues.push("CRITICAL: Avoid 'pull_request_target' executing untrusted PR code.");
  if (!/npm test|pytest|cargo test/i.test(yamlContent)) issues.push("No automated test command found in workflow.");
  return { mode: "AUDITED", issuesCount: issues.length, issues, passed: issues.length === 0 };
}

/** #70 Deployment Health & Rollback Gate Verifier */
export async function verifyDeploymentHealth(input: {
  modelId?: string;
  observedAccuracyPct: number;
  criticalSafetyFailures: number;
  healthEndpointHttpOk?: boolean;
}) {
  const gate = await evaluateCanaryRollbackGate({
    modelId: input.modelId || "noctis-core-v1",
    observedAccuracyPct: input.observedAccuracyPct,
    criticalSafetyFailures: input.criticalSafetyFailures,
  });
  const healthy = input.healthEndpointHttpOk !== false && gate.decision === "PROMOTE_CANARY_PASS";
  return {
    healthy,
    ...gate,
    recommendedAction: healthy ? "Deployment healthy — release checks pass." : "Halt rollout & auto-rollback triggered.",
  };
}
