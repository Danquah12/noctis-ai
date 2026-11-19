import { executeSandboxCode, executeInBrowserSandbox, executePythonSandbox } from "../src/lib/noctis-wasm-runner.ts";

async function runTests() {
  console.log("=== TESTING NOCTIS SANDBOX RUNNER ===");

  // 1. JavaScript test
  const jsCode = `
    const q_edge = (2 * Math.PI * 0.5 * 0.5 * 5.3) / (1.2566e-6 * 15e6 * 1.85);
    console.log("Q_EDGE_RESULT:", q_edge.toFixed(4));
    return q_edge;
  `;
  const jsRes = await executeInBrowserSandbox(jsCode);
  console.log("JS Status:", jsRes.status);
  console.log("JS Stdout:", jsRes.stdout);
  console.log("JS Seal:", jsRes.executionSeal);
  if (jsRes.status !== "SUCCESS" || !jsRes.stdout.some((s) => s.includes("Q_EDGE_RESULT: 0.2387"))) {
    console.error("JS Test failed!");
    process.exit(1);
  }

  // 2. Python test
  const pyCode = `
import math

# Tokamak safety factor q_a = (2 * pi * a^2 * B_t) / (mu_0 * I_p * R_0)
a = 0.5       # minor radius (m)
R0 = 1.85     # major radius (m)
Bt = 5.3      # toroidal field (T)
Ip = 1.5e6    # plasma current (A)
mu0 = 4 * math.pi * 1e-7

qa = (2 * math.pi * (a ** 2) * Bt) / (mu0 * Ip * R0)
print(f"CALCULATED_QA={qa:.4f}")
print("STATUS=COMPUTATION_VERIFIED")
`;
  const pyRes = await executePythonSandbox(pyCode);
  console.log("Python Status:", pyRes.status);
  console.log("Python Stdout:", pyRes.stdout);
  console.log("Python Seal:", pyRes.executionSeal);
  if (pyRes.status !== "SUCCESS" || !pyRes.stdout.some((s) => s.includes("CALCULATED_QA=2.3874"))) {
    console.error("Python calculation test failed!");
    process.exit(1);
  }

  // 3. Auto-dispatch test with markdown fence
  const markdownFencedPy = `
Here is the simulation calculation:
\`\`\`python
import statistics
data = [14.2, 14.5, 14.1, 14.8, 14.3]
print("MEAN:", round(statistics.mean(data), 2))
\`\`\`
`;
  const autoRes = await executeSandboxCode(markdownFencedPy);
  console.log("Auto-Dispatch Status:", autoRes.status);
  console.log("Auto-Dispatch Stdout:", autoRes.stdout);
  if (autoRes.status !== "SUCCESS" || !autoRes.stdout.some((s) => s.includes("MEAN: 14.38"))) {
    console.error("Auto dispatch test failed!");
    process.exit(1);
  }

  console.log("ALL SANDBOX RUNNER TESTS PASSED! ✓");
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
