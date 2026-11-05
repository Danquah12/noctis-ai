import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createGitHubPrPackage } from "./noctis-github-dispatcher.ts";

describe("NOCTIS LIVE GITHUB PULL REQUEST DISPATCHER", () => {
  test("Generates complete PR package with embedded passport and GitHub URL", () => {
    const pkg = createGitHubPrPackage({
      repo: "Danquah12/noctis-ai",
      filePath: "src/middleware/rate-limiter.ts",
      originalContent: "export const count = 0; // naive counter",
      patchedContent: "export const count = new Map(); // atomic mutex",
      prTitle: "fix(security): apply atomic mutex patch for CVE-2024-3400"
    });

    assert.equal(pkg.status, "SIMULATED_READY");
    assert.match(pkg.branchName, /^patch\/noctis-/);
    assert.ok(pkg.unifiedDiff.includes("--- a/src/middleware/rate-limiter.ts"));
    assert.ok(pkg.unifiedDiff.includes("+++ b/src/middleware/rate-limiter.ts"));
    assert.ok(pkg.prPayloadMarkdown.includes("Sovereign Autonomous Remediation PR"));
    assert.ok(pkg.prPayloadMarkdown.includes(pkg.passportId));
    assert.match(pkg.commitSeal, /^SIG_COMMIT_/);
    assert.ok(pkg.prUrl.startsWith("https://github.com/Danquah12/noctis-ai/compare/"));
  });
});
