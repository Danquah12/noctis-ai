/**
 * Antigravity Python SDK Bridge
 * Connects the Noctis Web Frontend and API routes directly to the local
 * Google Antigravity Python runtime and autonomous agent pipelines.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export interface AntigravityQuizData {
  exam: string;
  domain: string;
  vignette: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: "A" | "B" | "C" | "D";
  high_yield_pearl: string;
  tactics_and_technique: string;
}

export interface AntigravityQuizResponse {
  status: "success" | "cached" | "fallback" | "error";
  quiz: AntigravityQuizData;
  source: "local_antigravity_agent" | "local_archive" | "synthesized";
  executionTimeMs?: number;
  error?: string;
}

function getQuizzesDir(): string {
  // Check relative to cwd or project root
  const candidates = [
    path.resolve(process.cwd(), "data", "generated-quizzes"),
    path.resolve(process.cwd(), "noctis-ai", "data", "generated-quizzes"),
    path.resolve(__dirname, "..", "..", "data", "generated-quizzes"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  const fallback = candidates[0];
  try {
    fs.mkdirSync(fallback, { recursive: true });
  } catch {
    // ignore
  }
  return fallback;
}

function getScriptPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "src", "scripts", "antigravity_board_quiz_generator.py"),
    path.resolve(process.cwd(), "noctis-ai", "src", "scripts", "antigravity_board_quiz_generator.py"),
    path.resolve(__dirname, "..", "scripts", "antigravity_board_quiz_generator.py"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

/**
 * Checks if a pre-generated scenario file exists for this exam
 */
export function getCachedQuizForExam(examName: string): AntigravityQuizData | null {
  try {
    const dir = getQuizzesDir();
    if (!fs.existsSync(dir)) return null;

    const safeExam = examName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().includes(safeExam) && f.endsWith(".json"));
    if (files.length === 0) return null;

    // Pick latest
    const latest = files.sort().reverse()[0];
    const raw = fs.readFileSync(path.join(dir, latest), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Executes the Python Antigravity script via local authentication
 */
export async function executeAntigravityQuizGeneration(
  examName: string,
  topic: string = "High Yield Core Principles & Edge Cases",
  timeoutMs: number = 45000
): Promise<AntigravityQuizResponse> {
  const startTime = Date.now();

  // First check if an existing file is already on disk for instant response
  const cached = getCachedQuizForExam(examName);
  if (cached) {
    return {
      status: "cached",
      source: "local_archive",
      quiz: cached,
      executionTimeMs: Date.now() - startTime,
    };
  }

  const scriptPath = getScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return createFallbackQuiz(examName, topic, "Script path not found: " + scriptPath);
  }

  return new Promise<AntigravityQuizResponse>((resolve) => {
    const proc = spawn("python", [scriptPath, "--exam", examName, "--topic", topic, "--quiet"]);
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        // ignore
      }
      resolve(createFallbackQuiz(examName, topic, "Local Antigravity generation timed out after " + timeoutMs + "ms"));
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout.trim()) as AntigravityQuizData;
          resolve({
            status: "success",
            source: "local_antigravity_agent",
            quiz: parsed,
            executionTimeMs: Date.now() - startTime,
          });
          return;
        } catch (err) {
          resolve(createFallbackQuiz(examName, topic, "Could not parse JSON output: " + String(err)));
          return;
        }
      }
      resolve(createFallbackQuiz(examName, topic, stderr || `Python exited with code ${code}`));
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve(createFallbackQuiz(examName, topic, err.message));
    });
  });
}

function createFallbackQuiz(examName: string, topic: string, reason?: string): AntigravityQuizResponse {
  return {
    status: "fallback",
    source: "synthesized",
    error: reason,
    quiz: {
      exam: examName,
      domain: topic,
      vignette: `During a standardized ${examName} simulation, an examinee is presented with a complex multi-factor scenario regarding ${topic}. The candidate must evaluate competing priorities, verify governing protocols, and select the optimal initial intervention while mitigating immediate failure risk.`,
      question: `Under standard ${examName} examination criteria for ${topic}, what is the mandatory first-order action?`,
      options: {
        A: "Implement immediate protocol containment and verify systemic telemetry against baseline.",
        B: "Defer intervention pending tertiary longitudinal assessment and committee review.",
        C: "Override core safety parameters and enact immediate non-standard bypass.",
        D: "Document status and notify peripheral stakeholders without active remediation.",
      },
      correct_answer: "A",
      high_yield_pearl: `In ${examName}, always prioritize the action that directly stabilizes the subject, eliminates acute catastrophic risk, and establishes verifiable telemetry before secondary administrative actions.`,
      tactics_and_technique: `1. Identify the acute presentation; 2. Eliminate deferral or passive monitoring distractors (Options B and D); 3. Reject reckless or unvalidated overrides (Option C); 4. Select the decisive stabilization protocol (Option A).`,
    },
  };
}
