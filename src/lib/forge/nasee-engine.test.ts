import test from "node:test";
import assert from "node:assert/strict";
import {
  isAutonomousSoftwareEngineeringDirective,
  isExplicitWebsiteBuildIntent,
} from "../noctis-gadgets.server.ts";
import {
  NASEE_28_ENGINES,
  executeNaseeAutonomousPipeline,
  runNaseeCapabilityDiscovery,
  verifySqlMigrationsWithPglite,
} from "./nasee-engine.server.ts";
import { buildEnterpriseMonorepoFiles } from "./enterprise-monorepo-engine.ts";
import { runForgeFilesInSandbox } from "./sandbox-runner.server.ts";
import { handleForgeV2Request } from "./api-handler.server.ts";

const PROMPT_1 = `You are Noctis Autonomous Software Engineering Agent, operating as a principal software architect.
Your assignment is to design, develop, test and prepare for deployment a complete enterprise-grade web application named OmniSphere.
Mandatory requirements:
1. Implement all 30 functional modules and at least 110 functional screens.
12. Execute unit, integration, end-to-end, security and performance tests.`;

const DIRECTIVE_002 = `NOCTIS AUTONOMOUS SOFTWARE DEVELOPMENT — EXECUTION DIRECTIVE 002
Project: OmniSphere
SECTION 1 — DEVELOPMENT CAPABILITY DISCOVERY
Python runtime. npm and package management. PostgreSQL provisioning.
SECTION 4 — IMPLEMENT THE FIRST FUNCTIONAL WEBSITE
Execute unit, integration, e2e and security tests.`;

test("Chat routing recognizes both Prompt 1 and Execution Directive 002 without Python/unit-test false negatives", () => {
  assert.equal(isAutonomousSoftwareEngineeringDirective(PROMPT_1), true);
  assert.equal(isAutonomousSoftwareEngineeringDirective(DIRECTIVE_002), true);
  assert.equal(isExplicitWebsiteBuildIntent(PROMPT_1), true);
  assert.equal(isExplicitWebsiteBuildIntent(DIRECTIVE_002), true);

  // Unrelated standalone coding prompts remain excluded
  assert.equal(isExplicitWebsiteBuildIntent("Write a unit test in python for sorting algorithms"), false);
  assert.equal(isAutonomousSoftwareEngineeringDirective("Write a python sorting algorithm"), false);
});

test("NASEE 28-engine registry and live 25-capability discovery execute real environment probes", async () => {
  assert.equal(NASEE_28_ENGINES.length, 28);
  const caps = await runNaseeCapabilityDiscovery();
  assert.equal(caps.length, 25);
  for (const c of caps) {
    assert.ok(c.capability && c.toolOrService && c.verificationCommand && c.executionResult);
  }
  const nodeCap = caps.find((c) => c.capability.includes("Node.js"));
  assert.equal(nodeCap?.status, "AVAILABLE");
  const redisCap = caps.find((c) => c.capability.includes("Redis"));
  assert.ok(redisCap && (redisCap.status === "AVAILABLE" || redisCap.status === "UNAVAILABLE"));
});

test("PostgreSQL PGlite verifies DDL migrations, seeds, and cross-tenant RLS isolation live", async () => {
  const files = buildEnterpriseMonorepoFiles({
    projectId: "nasee-pg-test",
    brandName: "OmniSphere",
    domain: "omnisphere.com",
    prompt: DIRECTIVE_002,
    stack: "Next.js + NestJS + PostgreSQL",
    accentHex: "#0EA5E9",
  });
  const sqlInit = files["database/migrations/0001_init.sql"];
  const sqlSeed = files["database/seeds/0002_seed.sql"];

  const mig = await verifySqlMigrationsWithPglite(sqlInit, sqlSeed);
  assert.equal(mig.ok, true, mig.error);
  assert.ok(mig.tablesCreated >= 50, `Expected >= 50 SQL tables, got ${mig.tablesCreated}`);
  assert.ok(mig.rlsPoliciesCreated >= 50, `Expected >= 50 RLS policies, got ${mig.rlsPoliciesCreated}`);
  assert.ok(mig.seedRowsInserted >= 9, `Expected >= 9 seeded rows, got ${mig.seedRowsInserted}`);
  assert.equal(mig.rlsCrossTenantVerified, true);
  assert.equal(mig.auroraVisibleProducts, 3);
  assert.equal(mig.helixVisibleProducts, 1);
});

test("Sandbox G10 self-correction detects broken ESM manifest, repairs automatically, and passes on rerun", async () => {
  const files = buildEnterpriseMonorepoFiles({
    projectId: "nasee-repair-test",
    brandName: "OmniSphere",
    domain: "omnisphere.com",
    prompt: DIRECTIVE_002,
    stack: "Next.js + NestJS + PostgreSQL",
    accentHex: "#0EA5E9",
  });
  // Inject genuine defect: force CommonJS in package.json so ESM imports fail initially
  const brokenFiles = {
    ...files,
    "package.json": JSON.stringify({ name: "omnisphere", version: "1.0.0", private: true, type: "commonjs" }, null, 2),
  };

  const run = await runForgeFilesInSandbox({
    projectId: "nasee-repair-test",
    files: brokenFiles,
    preferredBackend: "local-isolated",
    autoRepair: true,
  });
  assert.equal(run.passed, true);
  assert.equal(run.repairsAttempted, 1);
  assert.ok(run.repairApplied && run.repairApplied.includes("module"));
  assert.equal(run.compilePassed, true);
  assert.ok(run.compiledFilesCount >= 15);
  assert.ok(run.gitCommitSha && /^[0-9a-f]{6,40}$/i.test(run.gitCommitSha));
});

test("NASEE REST API endpoints (/nasee/capabilities & /nasee/execute) deliver verified end-to-end execution evidence", async () => {
  const capRes = await handleForgeV2Request(new Request("https://www.dstrike.app/api/v2/forge/nasee/capabilities"));
  assert.equal(capRes.status, 200);
  const capJson = (await capRes.json()) as any;
  assert.equal(capJson.engineCount, 28);
  assert.equal(capJson.capabilities?.length, 25);

  const execRes = await handleForgeV2Request(
    new Request("https://www.dstrike.app/api/v2/forge/nasee/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: DIRECTIVE_002, preferredBackend: "local-isolated" }),
    }),
  );
  assert.equal(execRes.status, 200);
  const execJson = (await execRes.json()) as any;
  assert.equal(execJson.ok, true);
  assert.ok(execJson.projectId);
  assert.equal(execJson.pgliteMigration?.ok, true);
  assert.equal(execJson.pgliteMigration?.rlsCrossTenantVerified, true);
  assert.equal(execJson.sandboxExecution?.passed, true);
  assert.equal(execJson.sandboxExecution?.compilePassed, true);
  assert.equal(execJson.gates?.length, 12);
  assert.equal(execJson.scorecard?.totalScore, 100);

  // Also test full pipeline directly with persist:false
  const pipe = await executeNaseeAutonomousPipeline({ prompt: PROMPT_1, persist: false, preferredBackend: "local-isolated" });
  assert.equal(pipe.ok, true);
  assert.ok(pipe.markdownSummary.includes("Verified Runtime Capability Discovery"));
  assert.ok(pipe.markdownSummary.includes("Acceptance Gates (G01–G12)"));
});
