import test from "node:test";
import assert from "node:assert/strict";
import { generateUnifiedDiff, buildPullRequestPackage } from "./noctis-git-remediator.server.ts";

test("NOCTIS GIT PULL REQUEST AUTO-REMEDIATOR — TEST SUITE", async (t) => {
  await t.test("Generates RFC-compliant unified diff header and changes", () => {
    const original = "export const rateLimit = 10;\nexport const windowMs = 1000;";
    const patched = "export const rateLimit = 20;\nexport const windowMs = 1000;";

    const diff = generateUnifiedDiff("src/rateLimiter.ts", original, patched);
    assert.ok(diff.includes("diff --git a/src/rateLimiter.ts b/src/rateLimiter.ts"));
    assert.ok(diff.includes("-export const rateLimit = 10;"));
    assert.ok(diff.includes("+export const rateLimit = 20;"));
  });

  await t.test("Builds complete GitHub-ready PR package with cryptographic seal and test traces", () => {
    const pkg = buildPullRequestPackage({
      title: "fix(security): resolve concurrency race-condition in rateLimiter.ts",
      targetFilename: "src/rateLimiter.ts",
      originalCode: "function consume() { count++; }",
      patchedCode: "async function consume() { await mutex.lock(); count++; }",
      vulnerabilitySummary: "Patched non-atomic read-modify-write race condition.",
      testPassCount: 103,
    });

    assert.ok(pkg.branchName.startsWith("patch/sovereign-remediation-"));
    assert.equal(pkg.baseBranch, "main");
    assert.ok(pkg.bodyMarkdown.includes("Noctis Autonomous Security Auto-Remediation"));
    assert.ok(pkg.bodyMarkdown.includes("VERIFIED PASS (103/103 invariants passing)"));
    assert.ok(pkg.bodyMarkdown.includes("```diff"));
    assert.ok(pkg.unifiedDiff.includes("+async function consume()"));
    assert.ok(pkg.sha256Attestation.startsWith("SIG_NOCTIS_SOVEREIGN_"));
  });
});
