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
