/** No-network tests for guarded general-assistant baseline evaluation. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const runner = new URL("./noctis-live-eval.mjs", import.meta.url);
const corpus = new URL("./fixtures/noctis-general-assistant-baseline-v1.json", import.meta.url);
const data = JSON.parse(readFileSync(corpus, "utf8"));

function launch(args = [], overrides = {}) {
  return spawnSync(process.execPath, [runner.pathname, ...args], {
    encoding: "utf8", timeout: 12000,
    env: {
      ...process.env,
      NOCTIS_EVAL_AUTHORIZED: "", NOCTIS_EVAL_URL: "",
      NOCTIS_EVAL_ALLOW_REMOTE: "", NOCTIS_EVAL_STORE_RESPONSES: "",
      NOCTIS_EVAL_API_KEY: "", ...overrides,
    },
  });
}

test("benchmark is original held-out prompts with unique IDs and category coverage", () => {
  assert.equal(data.split, "heldout");
  assert.ok(data.cases.length >= 10);
  assert.equal(new Set(data.cases.map(x => x.id)).size, data.cases.length);
  assert.ok(new Set(data.cases.map(x => x.category)).size >= 8);
  assert.ok(data.cases.every(x => x.turns.some(t => t.role === "user")));
  assert.ok(data.cases.every(x => ["manual", "numeric_token", "contains_phrase"].includes(x.grader?.type)));
});

test("default run only describes the corpus and makes no requests", () => {
  const out = launch();
  assert.equal(out.status, 0, out.stderr);
  const report = JSON.parse(out.stdout);
  assert.equal(report.mode, "dry_run_no_requests");
  assert.equal(report.manifest.total_cases, data.cases.length);
  assert.match(report.manifest.dataset_sha256, /^[a-f0-9]{64}$/);
});

test("execute without approval is rejected before any network request", () => {
  const out = launch(["--execute"], { NOCTIS_EVAL_URL: "http://127.0.0.1:8080/api/noctis" });
  assert.equal(out.status, 2);
  assert.match(out.stderr, /AUTHORIZED=YES/);
});

test("execute with approval but no target is rejected", () => {
  const out = launch(["--execute"], { NOCTIS_EVAL_AUTHORIZED: "YES" });
  assert.equal(out.status, 2);
  assert.match(out.stderr, /NOCTIS_EVAL_URL/);
});

test("remote target without separate remote approval is rejected before fetch", () => {
  const out = launch(["--execute"], {
    NOCTIS_EVAL_AUTHORIZED: "YES",
    NOCTIS_EVAL_URL: "https://example.invalid/api/noctis",
  });
  assert.equal(out.status, 2);
  assert.match(out.stderr, /ALLOW_REMOTE=YES/);
});

test("remote target with URL credentials is rejected even if remote approved", () => {
  const out = launch(["--execute"], {
    NOCTIS_EVAL_AUTHORIZED: "YES", NOCTIS_EVAL_ALLOW_REMOTE: "YES",
    NOCTIS_EVAL_URL: "https://user:password@example.invalid/api/noctis",
  });
  assert.equal(out.status, 2);
  assert.match(out.stderr, /without URL credentials/);
});
