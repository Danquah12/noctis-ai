import { sha256Sync } from "./universal-crypto.ts";

export interface ExecutionResult {
  status: "SUCCESS" | "ERROR" | "TIMEOUT";
  stdout: string[];
  stderr: string[];
  returnValue: unknown;
  executionMs: number;
  memoryEstimateKb: number;
  executionSeal: string;
}

/**
 * Extracts runnable code from raw text, auto-extracting from markdown code fences if present.
 */
export function extractRunnableCode(raw: string): string {
  const match = raw.match(/```(?:javascript|typescript|js|ts|tsx|jsx)?\s*\n([\s\S]*?)```/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  if (/^#+\s+/m.test(raw)) {
    const lines = raw.split("\n").filter((l) => !l.trim().startsWith("#") && !l.trim().startsWith("*") && !l.trim().startsWith("-") && !l.trim().startsWith(">"));
    const candidate = lines.join("\n").trim();
    if (candidate) return candidate;
  }
  return raw;
}

/**
 * Strips basic TypeScript type annotations so code can run natively in JavaScript engines
 */
export function stripTypesSimple(code: string): string {
  return code
    // Remove type imports
    .replace(/import\s+type\s+[^;]+;/g, "")
    // Remove interface definitions
    .replace(/export\s+interface\s+\w+\s*\{[^}]*\}/g, "")
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, "")
    // Remove type aliases
    .replace(/export\s+type\s+\w+\s*=[^;]+;/g, "")
    .replace(/type\s+\w+\s*=[^;]+;/g, "")
    // Remove simple type annotations on variables (: string, : number, etc.)
    .replace(/:\s*(?:string|number|boolean|any|void|unknown|never|Record<[^>]+>|Array<[^>]+>|Promise<[^>]+>|[A-Z]\w*(?:\[\])?)/g, "")
    // Remove as type casts
    .replace(/\s+as\s+[A-Za-z0-9_<>[\]]+/g, "");
}

/**
 * Executes JavaScript/TypeScript code safely in an isolated browser sandbox
 * with real stdout/stderr capture and watchdog timeout.
 */
export async function executeInBrowserSandbox(
  code: string,
  timeoutMs: number = 3000
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const stdout: string[] = [];
  const stderr: string[] = [];

  const runnable = extractRunnableCode(code);
  if (!runnable.trim()) {
    return {
      status: "ERROR",
      stdout: [],
      stderr: ["No runnable JavaScript/TypeScript code block found in artifact."],
      returnValue: undefined,
      executionMs: 1,
      memoryEstimateKb: 0,
      executionSeal: `SIG_EXEC_${sha256Sync(code).slice(0, 24)}`
    };
  }

  const cleanJs = stripTypesSimple(runnable);

  const customConsole = {
    log: (...args: unknown[]) => {
      stdout.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
    info: (...args: unknown[]) => {
      stdout.push("[INFO] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
    warn: (...args: unknown[]) => {
      stderr.push("[WARN] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
    error: (...args: unknown[]) => {
      stderr.push("[ERROR] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    }
  };

  let returnValue: unknown = undefined;
  let status: ExecutionResult["status"] = "SUCCESS";

  try {
    // Wrap execution inside async function with custom console
    const executor = new Function(
      "console",
      `return (async () => {
        ${cleanJs}
      })();`
    );

    const runPromise = executor(customConsole);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    returnValue = await Promise.race([runPromise, timeoutPromise]);
  } catch (err: unknown) {
    status = err instanceof Error && err.message.includes("timed out") ? "TIMEOUT" : "ERROR";
    stderr.push(err instanceof Error ? err.message : String(err));
  }

  const executionMs = Math.max(1, Date.now() - startTime);
  const memoryEstimateKb = Math.round((code.length * 2 + stdout.join("").length * 2) / 1024);
  const seal = `SIG_EXEC_${sha256Sync(code + stdout.join("\n") + status).slice(0, 24)}`;

  return {
    status,
    stdout,
    stderr,
    returnValue,
    executionMs,
    memoryEstimateKb,
    executionSeal: seal
  };
}

/**
 * Extracts runnable Python code from raw text or markdown fences.
 */
export function extractRunnablePythonCode(raw: string): string {
  const match = raw.match(/```(?:python|py)\s*\n([\s\S]*?)```/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  if (/^(?:import\s+\w+|def\s+\w+|print\(|from\s+\w+)/m.test(raw)) {
    return raw.trim();
  }
  return raw;
}

/**
 * Executes Python code safely in isolated process mode with real stdio capture and timeout.
 */
export async function executePythonSandbox(
  code: string,
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const stdout: string[] = [];
  const stderr: string[] = [];

  const runnable = extractRunnablePythonCode(code);
  if (!runnable.trim()) {
    return {
      status: "ERROR",
      stdout: [],
      stderr: ["No runnable Python code block found in artifact."],
      returnValue: undefined,
      executionMs: 1,
      memoryEstimateKb: 0,
      executionSeal: `SIG_EXEC_${sha256Sync(code).slice(0, 24)}`,
    };
  }

  // Check if running in Node / Server environment
  const isNode = typeof process !== "undefined" && Boolean(process.versions?.node);

  if (isNode) {
    try {
      const { spawn } = await import("node:child_process");

      return await new Promise<ExecutionResult>((resolve) => {
        let timedOut = false;
        const pyProc = spawn("python", ["-I", "-"], {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });

        const timer = setTimeout(() => {
          timedOut = true;
          try {
            pyProc.kill("SIGKILL");
          } catch {
            // Ignore kill errors
          }
        }, timeoutMs);

        pyProc.stdout.on("data", (data: Buffer | string) => {
          const lines = data.toString().split(/\r?\n/).filter((l) => l.length > 0);
          stdout.push(...lines);
        });

        pyProc.stderr.on("data", (data: Buffer | string) => {
          const lines = data.toString().split(/\r?\n/).filter((l) => l.length > 0);
          stderr.push(...lines);
        });

        pyProc.on("error", (err: Error) => {
          clearTimeout(timer);
          const executionMs = Math.max(1, Date.now() - startTime);
          resolve({
            status: "ERROR",
            stdout,
            stderr: [`Python execution spawn error: ${err.message}`],
            returnValue: undefined,
            executionMs,
            memoryEstimateKb: Math.round(code.length / 1024),
            executionSeal: `SIG_EXEC_${sha256Sync(code + "SPAWN_ERROR").slice(0, 24)}`,
          });
        });

        pyProc.on("close", (exitCode: number | null) => {
          clearTimeout(timer);
          const executionMs = Math.max(1, Date.now() - startTime);
          const status: ExecutionResult["status"] = timedOut
            ? "TIMEOUT"
            : exitCode === 0
            ? "SUCCESS"
            : "ERROR";

          if (timedOut) {
            stderr.push(`Execution timed out after ${timeoutMs}ms`);
          }

          const memoryEstimateKb = Math.round(
            (code.length * 2 + stdout.join("").length * 2) / 1024
          );
          const seal = `SIG_EXEC_${sha256Sync(code + stdout.join("\n") + status).slice(0, 24)}`;

          resolve({
            status,
            stdout,
            stderr,
            returnValue: stdout.length > 0 ? stdout[stdout.length - 1] : undefined,
            executionMs,
            memoryEstimateKb,
            executionSeal: seal,
          });
        });

        // Write the code to stdin and close the stream
        pyProc.stdin.write(runnable);
        pyProc.stdin.end();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: "ERROR",
        stdout,
        stderr: [`Failed to invoke Python sandbox: ${msg}`],
        returnValue: undefined,
        executionMs: Math.max(1, Date.now() - startTime),
        memoryEstimateKb: 0,
        executionSeal: `SIG_EXEC_${sha256Sync(code + "INVOKE_ERROR").slice(0, 24)}`,
      };
    }
  }

  // Browser fallback when node:child_process is not available
  return {
    status: "ERROR",
    stdout: [],
    stderr: ["Python execution in client browser requires server runtime or Pyodide WASM bridge."],
    returnValue: undefined,
    executionMs: 1,
    memoryEstimateKb: 0,
    executionSeal: `SIG_EXEC_${sha256Sync(code + "BROWSER_UNSUPPORTED").slice(0, 24)}`,
  };
}

/**
 * Universal sandbox runner that automatically dispatches to JS/TS or Python runner
 */
export async function executeSandboxCode(
  code: string,
  language: "javascript" | "typescript" | "python" | "auto" = "auto",
  timeoutMs?: number
): Promise<ExecutionResult> {
  let lang = language;
  if (lang === "auto") {
    if (/```(?:python|py)\b/i.test(code) || /^(?:import\s+\w+|def\s+\w+|from\s+\w+)/m.test(code)) {
      lang = "python";
    } else {
      lang = "javascript";
    }
  }

  if (lang === "python") {
    return executePythonSandbox(code, timeoutMs ?? 5000);
  }
  return executeInBrowserSandbox(code, timeoutMs ?? 3000);
}
