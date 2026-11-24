import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  buildDeterministicWebsiteBlueprint,
  isEnterpriseEcosystemPrompt,
  stripAgentPersonaPreamble,
} from "./website-blueprint-engine.ts";
import {
  ENTERPRISE_15_DB_DOMAINS,
  ENTERPRISE_17_ROLES,
  ENTERPRISE_30_MODULES,
  buildEnterprise110Screens,
  buildEnterpriseMonorepoFiles,
} from "./enterprise-monorepo-engine.ts";
import { runForgeFilesInSandbox } from "./sandbox-runner.server.ts";
import { evaluateChallenge001 } from "./challenge-001-evaluator.server.ts";
import { handleForgeV2Request } from "./api-handler.server.ts";

const CHALLENGE_PROMPT_WITH_PERSONA = `You are Noctis AI, a cybersecurity engineer and autonomous full-stack architect.
NOCTIS WEBSITE DEVELOPMENT CHALLENGE 001
Build OmniSphere, an enterprise multi-tenant global digital marketplace and professional services ecosystem combining e-commerce, professional networking, freelance marketplace, job portal, learning management, payments, CRM, analytics, and security operations with EN/ES/FR/AR RTL support.`;

test("Persona preamble stripping prevents Cybersecurity misclassification on OmniSphere Challenge 001", () => {
  const stripped = stripAgentPersonaPreamble(CHALLENGE_PROMPT_WITH_PERSONA);
  assert.equal(/^You are Noctis/i.test(stripped), false);
  assert.equal(isEnterpriseEcosystemPrompt(CHALLENGE_PROMPT_WITH_PERSONA), true);

  const bp = buildDeterministicWebsiteBlueprint({ prompt: CHALLENGE_PROMPT_WITH_PERSONA });
  assert.equal(bp.brandName, "OmniSphere");
  assert.equal(bp.industrySpecialty, "Enterprise Multi-Tenant Digital Ecosystem");
  assert.notEqual(bp.industrySpecialty, "Cybersecurity & SOC Operations");
});

test("Enterprise monorepo generator emits 30 modules, 110 screens, 17 roles, 15 RLS SQL domains, and valid browser JS", () => {
  assert.equal(ENTERPRISE_30_MODULES.length, 30);
  assert.equal(ENTERPRISE_17_ROLES.length, 17);
  assert.equal(ENTERPRISE_15_DB_DOMAINS.length, 15);
  assert.equal(buildEnterprise110Screens().length, 110);

  const files = buildEnterpriseMonorepoFiles({
    projectId: "test-omni-1",
    brandName: "OmniSphere",
    domain: "omnisphere.com",
    prompt: CHALLENGE_PROMPT_WITH_PERSONA,
    stack: "Next.js + TypeScript + PostgreSQL + pgvector",
    accentHex: "#0EA5E9",
  });

  assert.ok(Object.keys(files).length >= 35);
  assert.ok(files["index.html"]);
  assert.ok(files["apps/web/src/screen-registry.ts"]);
  assert.ok(files["apps/api/src/server.ts"]);
  assert.ok(files["packages/security/zero-trust.ts"]);
  assert.ok(files["database/migrations/0001_init.sql"]);
  assert.ok(files["database/schemas/erd.mmd"]);
  assert.ok(files["tests/performance/benchmark.mjs"]);

  const sql = files["database/migrations/0001_init.sql"];
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /CREATE POLICY/i);
  assert.match(sql, /CREATE EXTENSION[^;]*vector/i);

  // Validate inline JavaScript in index.html parses cleanly without syntax errors
  const scriptMatch = files["index.html"].match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch && scriptMatch[1], "index.html must include inline controller <script>");
  assert.doesNotThrow(() => new vm.Script(scriptMatch[1]));
});

test("Isolated sandbox runner executes OmniSphere test suites & benchmark cleanly and enforces SAST precheck", async () => {
  const files = buildEnterpriseMonorepoFiles({
    projectId: "test-omni-sandbox",
    brandName: "OmniSphere",
    domain: "omnisphere.com",
    prompt: CHALLENGE_PROMPT_WITH_PERSONA,
    stack: "Next.js + TypeScript + PostgreSQL",
    accentHex: "#0EA5E9",
  });

  const blocked = await runForgeFilesInSandbox({
    projectId: "test-omni-sandbox",
    files,
    sastFindingsCount: 2,
    preferredBackend: "local-isolated",
  });
  assert.equal(blocked.passed, false);
  assert.equal(blocked.sastPrecheckPassed, false);

  const run = await runForgeFilesInSandbox({
    projectId: "test-omni-sandbox",
    files,
    sastFindingsCount: 0,
    preferredBackend: "local-isolated",
    autoRepair: true,
  });
  assert.equal(run.passed, true);
  assert.ok(run.testsPassed > 0);
  assert.equal(run.testsFailed, 0);
  assert.ok(run.benchmark && run.benchmark.p95Ms > 0 && run.benchmark.rps > 0);
});

test("Challenge 001 evaluator scores 28 checklist items cleanly and triggers hard vetoes on missing RLS, secrets, or failed sandbox", async () => {
  const files = buildEnterpriseMonorepoFiles({
    projectId: "test-omni-eval",
    brandName: "OmniSphere",
    domain: "omnisphere.com",
    prompt: CHALLENGE_PROMPT_WITH_PERSONA,
    stack: "Next.js + TypeScript + PostgreSQL",
    accentHex: "#0EA5E9",
  });

  const sandboxExecution = await runForgeFilesInSandbox({
    projectId: "test-omni-eval",
    files,
    preferredBackend: "local-isolated",
  });

  const passing = evaluateChallenge001({
    projectId: "test-omni-eval",
    files,
    sandboxExecution,
  });
  assert.equal(passing.checklist.length, 28);
  assert.equal(passing.counts.blockedExternal, 3);
  assert.equal(passing.counts.implementedVerified, 25);
  assert.equal(passing.vetoTriggered, false);
  assert.equal(passing.releaseReady, true);
  assert.equal(passing.totalScore, 100);

  // Veto 1: Remove PostgreSQL RLS policies
  const noRlsFiles = {
    ...files,
    "database/migrations/0001_init.sql": "CREATE TABLE users (id TEXT PRIMARY KEY);",
    "migrations/0001_init.sql": "CREATE TABLE users (id TEXT PRIMARY KEY);",
  };
  const noRlsEval = evaluateChallenge001({ projectId: "test-no-rls", files: noRlsFiles, sandboxExecution });
  assert.equal(noRlsEval.vetoTriggered, true);
  assert.equal(noRlsEval.releaseReady, false);
  assert.ok(noRlsEval.vetoReasons.some((r) => r.includes("VETO_MISSING_TENANT_RLS")));
  assert.ok(noRlsEval.totalScore <= 49);

  // Veto 2: Inject eval()
  const badSecFiles = { ...files, "src/unsafe.ts": "export const bad = eval('1+1');" };
  const badSecEval = evaluateChallenge001({ projectId: "test-bad-sec", files: badSecFiles, sandboxExecution });
  assert.equal(badSecEval.vetoTriggered, true);
  assert.ok(badSecEval.vetoReasons.some((r) => r.includes("VETO_SECURITY_HYGIENE")));

  // Veto 3: Failed sandbox run
  const failedSandboxEval = evaluateChallenge001({
    projectId: "test-bad-sandbox",
    files,
    sandboxExecution: { ...sandboxExecution, ok: false, passed: false, testsFailed: 1 },
  });
  assert.equal(failedSandboxEval.vetoTriggered, true);
  assert.ok(failedSandboxEval.vetoReasons.some((r) => r.includes("VETO_SANDBOX_FAILED")));
});

test("REST /api/v2/forge/projects/sandbox-run and evaluate-challenge execute end-to-end on OmniSphere project", async () => {
  const genRes = await handleForgeV2Request(
    new Request("https://www.dstrike.app/api/v2/forge/projects/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: CHALLENGE_PROMPT_WITH_PERSONA }),
    }),
  );
  assert.equal(genRes.status, 200);
  const genJson = (await genRes.json()) as any;
  assert.equal(genJson.spec?.architectureMode, "ENTERPRISE_MULTI_TENANT_MONOREPO");

  const sbxRes = await handleForgeV2Request(
    new Request("https://www.dstrike.app/api/v2/forge/projects/sandbox-run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: genJson.projectId, preferredBackend: "local-isolated" }),
    }),
  );
  assert.equal(sbxRes.status, 200);
  const sbxJson = (await sbxRes.json()) as any;
  assert.equal(sbxJson.passed, true);
  assert.ok(sbxJson.testsPassed > 0);

  const evalRes = await handleForgeV2Request(
    new Request("https://www.dstrike.app/api/v2/forge/projects/evaluate-challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: genJson.projectId }),
    }),
  );
  assert.equal(evalRes.status, 200);
  const evalJson = (await evalRes.json()) as any;
  assert.equal(evalJson.scorecard?.totalScore, 100);
  assert.equal(evalJson.scorecard?.releaseReady, true);
});
