import test from "node:test";
import assert from "node:assert/strict";
import {
  FORGE_12_AGENTS,
  FORGE_35_CAPABILITIES,
  FORGE_40_CATEGORIES,
  FORGE_COMPLEX_PLATFORMS,
  FORGE_STACK_PRESETS,
} from "./forge-catalog.ts";
import {
  convertScreenshotOrFigmaToCode,
  editForgeProjectConversationally,
  exportForgeProjectZipBuffer,
  generateForgeProject,
  prepareForgeGitHubPr,
  requestOrApproveForgeDeploy,
  restoreForgeProjectRevision,
  validateDevelopmentEnvironment,
} from "./forge-engine.server.ts";
import { handleForgeV2Request } from "./api-handler.server.ts";

test("Noctis Forge catalogs cover 40 website categories, 35 software-company capabilities, 12 agents & 6 complex platforms", () => {
  assert.equal(FORGE_40_CATEGORIES.length, 40);
  assert.equal(FORGE_35_CAPABILITIES.length, 35);
  assert.equal(FORGE_12_AGENTS.length, 12);
  assert.equal(FORGE_COMPLEX_PLATFORMS.length, 6);
  assert.ok(FORGE_STACK_PRESETS.length >= 4);

  const env = validateDevelopmentEnvironment();
  assert.ok(env.summary.liveInRepo >= 4);
  assert.equal(
    env.checks.some(
      (c) =>
        c.component.includes("Isolated Execution Sandbox") &&
        (c.status === "LIVE_IN_REPO" || c.status === "LIVE_IN_REPO_LOCAL_SANDBOX"),
    ),
    true,
  );
});

test("Noctis Forge 12-agent pipeline generates full-stack app, edits conversationally, restores revisions, zips binary & enforces human deploy gate", async () => {
  const gen = await generateForgeProject({
    prompt: "Build a healthcare patient portal with FHIR observations and appointments",
    category: "Healthcare",
    actorId: "forge-test",
    persist: true,
  });
  assert.equal(gen.category.regulated, true);
  assert.ok(gen.spec.specialistAdvisory && gen.spec.specialistAdvisory.includes("HIPAA"));
  assert.equal(gen.qaSecurity.passedAll, true);
  assert.ok(gen.fileNames.includes("index.html"));
  assert.ok(gen.fileNames.includes("src/App.tsx"));
  assert.ok(gen.fileNames.includes("src/server/api.ts"));
  assert.ok(gen.fileNames.includes("migrations/0001_init.sql"));
  assert.ok(gen.fileNames.includes("tests/app.test.ts"));
  assert.ok(gen.fileNames.includes(".github/workflows/ci.yml"));
  assert.equal(gen.deployState.canAutoDeploy, false);

  const edit = await editForgeProjectConversationally({
    projectId: gen.projectId,
    instruction: "Add table billing_invoices and use emerald palette for mobile app",
    actorId: "forge-test",
  });
  assert.equal(edit.ok, true);
  assert.equal(edit.revisionNumber, 2);
  assert.ok(edit.entities.includes("billing_invoices"));
  assert.ok(edit.fileNames.includes("capacitor.config.json"));

  const restore = await restoreForgeProjectRevision(gen.projectId, 1, "forge-test");
  assert.equal(restore.ok, true);
  assert.equal(restore.newRevisionNumber, 3);

  const zipped = await exportForgeProjectZipBuffer(gen.projectId);
  assert.ok(zipped && zipped.zipBuffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));
  assert.ok(zipped!.fileCount >= 11);

  const pr = await prepareForgeGitHubPr(gen.projectId);
  assert.equal(pr.ok, true);
  assert.equal(pr.requiresHumanApproval, true);
  assert.equal(pr.canAutoMerge, false);

  // AI cannot self-approve deployment
  const blockedDeploy = await requestOrApproveForgeDeploy({
    projectId: gen.projectId,
    target: "PRODUCTION",
    approver: "ai-agent",
  });
  assert.equal(blockedDeploy.approved, false);

  const okDeploy = await requestOrApproveForgeDeploy({
    projectId: gen.projectId,
    target: "STAGING",
    approver: "human-release-lead",
  });
  assert.equal(okDeploy.approved, true);

  const sc = convertScreenshotOrFigmaToCode({
    mode: "FIGMA_TO_CODE",
    title: "DashboardCard",
    description: "Responsive dashboard summary",
  });
  assert.equal(sc.passesWcagAa, true);
});

test("REST /api/v2/forge/* endpoints handle generation, environment check, .zip download & human deploy veto", async () => {
  const envRes = await handleForgeV2Request(new Request("https://www.dstrike.app/api/v2/forge/environment"));
  assert.equal(envRes.status, 200);

  const genRes = await handleForgeV2Request(
    new Request("https://www.dstrike.app/api/v2/forge/projects/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Build a CRM system for B2B sales pipelines", category: "CRM systems" }),
    }),
  );
  assert.equal(genRes.status, 200);
  const genJson = (await genRes.json()) as any;
  assert.ok(genJson.projectId);

  const zipRes = await handleForgeV2Request(
    new Request(`https://www.dstrike.app/api/v2/forge/projects/export-zip?id=${encodeURIComponent(genJson.projectId)}&download=true`),
  );
  assert.equal(zipRes.status, 200);
  const zBuf = Buffer.from(await zipRes.arrayBuffer());
  assert.ok(zBuf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));

  const vetoRes = await handleForgeV2Request(
    new Request("https://www.dstrike.app/api/v2/forge/projects/deploy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: genJson.projectId, target: "PRODUCTION", approver: "noctis-agent" }),
    }),
  );
  assert.equal(vetoRes.status, 403);
});
