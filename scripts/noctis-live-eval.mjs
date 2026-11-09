/**
 * Noctis live-model baseline runner. Dry-run by default; no provider requests
 * without explicit authorization. Uses only project-authored synthetic prompts.
 * A returned model name is NOT proof of the actual responding provider.
 *
 * Dry-run: node scripts/noctis-live-eval.mjs
 * Opt-in: NOCTIS_EVAL_AUTHORIZED=YES NOCTIS_EVAL_URL=http://127.0.0.1:8080/api/noctis \
 *         node scripts/noctis-live-eval.mjs --execute
 *
 * A configured backend may make paid provider calls; obtain approval first.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const suitePath = new URL("./fixtures/noctis-general-assistant-baseline-v1.json", import.meta.url);
const rawSuite = readFileSync(suitePath, "utf8");
const suite = JSON.parse(rawSuite);
const sha256 = value => createHash("sha256").update(value).digest("hex");

function validateSuite(value) {
  if (value.split !== "heldout" || typeof value.suite_id !== "string" || !Array.isArray(value.cases)) {
    throw new Error("Expected a versioned held-out suite.");
  }
  const ids = new Set();
  for (const row of value.cases) {
    if (typeof row.id !== "string" || ids.has(row.id) ||
        !Array.isArray(row.turns) || !row.turns.length ||
        !row.turns.every(t => ["user", "assistant"].includes(t.role) && typeof t.content === "string") ||
        !row.turns.some(t => t.role === "user") ||
        !["manual", "numeric_token", "contains_phrase"].includes(row.grader?.type)) {
      throw new Error("Malformed or duplicate evaluation case: " + String(row?.id));
    }
    ids.add(row.id);
  }
  return value;
}
validateSuite(suite);
const manifest = {
  suite_id: suite.suite_id, version: suite.version, split: suite.split,
  source: suite.source, dataset_sha256: sha256(rawSuite),
  total_cases: suite.cases.length,
  categories: [...new Set(suite.cases.map(c => c.category))],
};

function targetUrl() {
  const specified = process.env.NOCTIS_EVAL_URL;
  if (!specified) throw new Error("NOCTIS_EVAL_URL is required for --execute.");
  const u = new URL(specified);
  if (u.username || u.password || u.search || u.hash || u.pathname !== "/api/noctis") {
    throw new Error("Target must be exact /api/noctis without URL credentials or query.");
  }
  const local = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(u.hostname.toLowerCase());
  if (local && !["http:", "https:"].includes(u.protocol)) {
    throw new Error("Only local HTTP(S) targets are supported.");
  }
  if (!local && (u.protocol !== "https:" || process.env.NOCTIS_EVAL_ALLOW_REMOTE !== "YES")) {
    throw new Error("Remote evaluation requires HTTPS and NOCTIS_EVAL_ALLOW_REMOTE=YES.");
  }
  return u.toString();
}

function independentCheck(caseDef, responseText) {
  const grader = caseDef.grader;
  if (grader.type === "manual") return { status: "requires_manual_review" };
  const answer = String(responseText || "");
  if (grader.type === "contains_phrase") {
    const pass = answer.toLowerCase().includes(String(grader.value).toLowerCase());
    return { status: pass ? "mechanical_check_pass" : "mechanical_check_fail" };
  }
  if (grader.type === "numeric_token") {
    const value = String(grader.value).replace(/,/g, "");
    if (!/^-?[0-9]+(?:\.[0-9]+)?$/.test(value)) throw new Error("Invalid numeric benchmark answer key.");
    const escaped = value.replace(/\./g, "\\.");
    const found = new RegExp("(^|[^0-9.])" + escaped + "(?![0-9.])").test(answer.replace(/,/g, ""));
    return { status: found ? "mechanical_check_pass" : "mechanical_check_fail" };
  }
  return { status: "ungraded" };
}

async function run() {
  if (!process.argv.includes("--execute")) {
    console.log(JSON.stringify({
      mode: "dry_run_no_requests", manifest,
      instructions: "Obtain approval, set NOCTIS_EVAL_AUTHORIZED=YES and NOCTIS_EVAL_URL, then pass --execute. Provider calls may cost money."
    }, null, 2));
    return;
  }
  if (process.env.NOCTIS_EVAL_AUTHORIZED !== "YES") {
    throw new Error("No requests made. NOCTIS_EVAL_AUTHORIZED=YES requires prior authorization.");
  }
  const url = targetUrl();
  const results = [];
  const apiKey = process.env.NOCTIS_EVAL_API_KEY || "";
  const provider = process.env.NOCTIS_EVAL_PROVIDER || "";
  const model = process.env.NOCTIS_EVAL_MODEL || "";
  const begun = new Date().toISOString();
  for (const item of suite.cases) {
    const started = performance.now();
    try {
      const body = { turns: item.turns, skill: "talk", ...(provider ? { brain: { provider, ...(model ? { model } : {}) } } : {}) };
      const response = await fetch(url, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(45000),
        headers: { "content-type": "application/json", ...(apiKey ? { authorization: "Bearer " + apiKey } : {}) },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      const answer = typeof data?.text === "string" ? data.text : "";
      results.push({
        id: item.id, category: item.category, http_status: response.status,
        request_ok: response.ok && Boolean(answer), elapsed_ms: Math.round(performance.now() - started),
        response_sha256: answer ? sha256(answer) : null, response_characters: answer.length,
        returned_model_label_unverified: typeof data?.model === "string" ? data.model : null,
        actual_model_provenance_verified: false,
        check: response.ok && answer ? independentCheck(item, answer) : { status: "request_failed" },
        ...(process.env.NOCTIS_EVAL_STORE_RESPONSES === "YES" ? { response_text: answer } : {}),
        ...(response.ok ? {} : { error: typeof data?.error === "string" ? data.error.slice(0, 300) : "HTTP request failed" }),
      });
    } catch (err) {
      results.push({
        id: item.id, category: item.category,
        request_ok: false, elapsed_ms: Math.round(performance.now() - started),
        actual_model_provenance_verified: false, check: { status: "request_failed" },
        error: err instanceof Error ? err.message.slice(0, 300) : "Unknown evaluation error",
      });
    }
  }
  const stats = {
    completed_requests: results.filter(r => r.request_ok).length,
    failed_requests: results.filter(r => !r.request_ok).length,
    mechanically_checked: results.filter(r => r.check.status.startsWith("mechanical_check_")).length,
    mechanical_passes: results.filter(r => r.check.status === "mechanical_check_pass").length,
    needs_manual_review: results.filter(r => r.check.status === "requires_manual_review").length,
  };
  const report = {
    metadata: { ...manifest, started_at: begun, completed_at: new Date().toISOString(), origin: url,
      configured_provider: provider || null, configured_model: model || null, model_provenance_verified: false },
    stats,
    note: "Mechanical checks verify only narrow expected tokens. Open-ended cases are unscored. No overall intelligence claim is supported.",
    results,
  };
  const output = process.env.NOCTIS_EVAL_OUTPUT || join(tmpdir(), "noctis-eval-" + Date.now() + ".json");
  writeFileSync(output, JSON.stringify(report, null, 2), { encoding: "utf8", mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ mode: "executed_with_operator_approval", output, stats, manifest }, null, 2));
  if (stats.failed_requests) process.exitCode = 1;
}
run().catch(err => {
  console.error("Noctis baseline aborted: " + (err instanceof Error ? err.message : String(err)));
  process.exitCode = 2;
});
