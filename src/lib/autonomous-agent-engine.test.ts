import test from "node:test";
import assert from "node:assert";
import {
  AutonomousAgentEngine,
  AutonomousFilesystem,
  AutonomousTerminalSandbox,
  SubagentSwarmOrchestrator
} from "./autonomous-agent-engine.ts";

test("NOCTIS AUTONOMOUS ENGINE — 5-PILLAR ARCHITECTURAL SUITE", async (t) => {
  await t.test("Pillar 1: Filesystem read, write, and exact target string edits", () => {
    const engine = new AutonomousAgentEngine("test-fs-run");
    const workspace = engine.getWorkspace();
    const fs = new AutonomousFilesystem(workspace);

    // 1. Write file
    const writeRes = fs.writeFile("src/rateLimiter.ts", "line 1\nline 2\nconst limit = 5;\nline 4\n");
    assert.strictEqual(writeRes.path, "src/rateLimiter.ts");
    assert.strictEqual(workspace.files.has("src/rateLimiter.ts"), true);

    // 2. Read line range
    const slice = fs.readFile("src/rateLimiter.ts", 2, 3);
    assert.strictEqual(slice, "line 2\nconst limit = 5;");

    // 3. Edit exact target string
    fs.editFile("src/rateLimiter.ts", "const limit = 5;", "const limit = 10;");
    const updated = fs.readFile("src/rateLimiter.ts");
    assert.strictEqual(updated.includes("const limit = 10;"), true);
    assert.strictEqual(updated.includes("const limit = 5;"), false);
  });

  await t.test("Pillar 2: Sandboxed terminal execution and error capture", async () => {
    const engine = new AutonomousAgentEngine("test-term-run");
    const workspace = engine.getWorkspace();
    const term = new AutonomousTerminalSandbox(workspace);

    // Missing test file triggers non-zero exit code
    const missingRes = await term.runCommand("test: missing.ts");
    assert.strictEqual(missingRes.exitCode, 1);
    assert.strictEqual(missingRes.output.includes("Target test file 'missing.ts' does not exist"), true);

    // Add valid test file
    workspace.files.set("service.test.ts", "// Clean test file");
    const passRes = await term.runCommand("test: service.test.ts");
    assert.strictEqual(passRes.exitCode, 0);
    assert.strictEqual(passRes.output.includes("PASS service.test.ts"), true);
  });

  await t.test("Pillar 4: Hierarchical subagent swarms delegation", async () => {
    const engine = new AutonomousAgentEngine("test-swarm-run");
    const workspace = engine.getWorkspace();
    const swarm = new SubagentSwarmOrchestrator(workspace);

    const secRes = await swarm.invokeSubagent("Security Auditor", "Audit API attack surfaces");
    assert.strictEqual(secRes.role, "Security Auditor");
    assert.strictEqual(secRes.deliverable.includes("CVSS score 0.0"), true);

    const perfRes = await swarm.invokeSubagent("Performance Optimizer", "Analyze time complexity");
    assert.strictEqual(perfRes.role, "Performance Optimizer");
    assert.strictEqual(perfRes.deliverable.includes("O(1)"), true);

    assert.strictEqual(workspace.subagentLogs.length, 2);
  });

  await t.test("Pillar 3 & 5: Complete ReAct Closed-Loop Self-Correction & Cryptographic Signing", async () => {
    const engine = new AutonomousAgentEngine("test-react-e2e");

    // We simulate an autonomous coding task:
    // Step 1: Agent writes code containing an intentional bug
    // Step 2: Agent runs the test sandbox -> FAILS
    // Step 3: Agent reads error stack trace, formulates patch, and uses edit_file to fix the bug
    // Step 4: Agent re-runs the test sandbox -> PASSES
    // Step 5: Agent delegates to Security Auditor subagent
    // Step 6: Agent finalizes deliverable with cryptographic seal

    const report = await engine.executeGoal(
      "Build verified resilient rate-limiter microservice with 100% test pass rate",
      async (stepNum, history, ws) => {
        if (stepNum === 1) {
          return {
            thought: "I will scaffold the rateLimiter.test.ts microservice with test assertions.",
            action: {
              toolName: "write_file",
              args: {
                path: "rateLimiter.test.ts",
                content: "// INTENTIONAL_BUG\nexport function check() { throw new Error('Test Failure'); }"
              }
            }
          };
        }

        if (stepNum === 2) {
          return {
            thought: "I will execute the test harness in the terminal sandbox to check for regressions.",
            action: {
              toolName: "run_command",
              args: {
                commandLine: "test: rateLimiter.test.ts"
              }
            }
          };
        }

        if (stepNum === 3) {
          // Check last observation - did it fail?
          const lastObs = history[history.length - 1].observation;
          assert.strictEqual(lastObs?.success, false);

          return {
            thought: "The test failed with an assertion error. I will self-correct by editing out the bug.",
            action: {
              toolName: "edit_file",
              args: {
                path: "rateLimiter.test.ts",
                target: "// INTENTIONAL_BUG\nexport function check() { throw new Error('Test Failure'); }",
                replacement: "export function check() { return true; }"
              }
            }
          };
        }

        if (stepNum === 4) {
          return {
            thought: "I will re-run the terminal test suite to verify the self-correction fix.",
            action: {
              toolName: "run_command",
              args: {
                commandLine: "test: rateLimiter.test.ts"
              }
            }
          };
        }

        if (stepNum === 5) {
          const lastObs = history[history.length - 1].observation;
          assert.strictEqual(lastObs?.success, true);

          return {
            thought: "Tests pass. I will now invoke the Security Auditor subagent to verify zero vulnerabilities.",
            action: {
              toolName: "invoke_subagent",
              args: {
                role: "Security Auditor",
                prompt: "Audit rateLimiter.test.ts against OWASP API standards"
              }
            }
          };
        }

        // Final completion step
        return {
          thought: "Task complete. Code is verified, tests passed, and security audit confirmed."
        };
      }
    );

    assert.strictEqual(report.status, "COMPLETED");
    assert.strictEqual(report.totalSteps, 5);
    assert.strictEqual(report.selfCorrectionsCount, 1);
    assert.strictEqual(report.deliverables.length >= 1, true);
    assert.strictEqual(report.cryptographicSignature.startsWith("SIG_NOCTIS_SOVEREIGN_"), true);
  });
});
