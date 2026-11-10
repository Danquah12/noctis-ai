// ============================================================================
// NOCTIS TASK 1 UNIT TEST: LOCAL OFFLINE AIR-GAP ENCLAVE TEST SUITE
// Standards: NIST SP 800-53 SC-7, HIPAA Zero-Egress, GGUF Runner Validation
// ============================================================================

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  validateAirgapSecurityPolicy,
  executeOfflineEnclaveProbe,
  DEFAULT_AIRGAP_CONFIG,
} from "./noctis-offline-enclave-runner.ts";

describe("TASK 1: NOCTIS LOCAL OFFLINE AIR-GAP ENCLAVE SUITE", () => {
  test("Task 1.1: validates local enclave scripts exist on disk with executable configuration", () => {
    const shPath = path.resolve(process.cwd(), "scripts/run-airgap-local-enclave.sh");
    const ps1Path = path.resolve(process.cwd(), "scripts/run-airgap-local-enclave.ps1");

    assert.ok(fs.existsSync(shPath), "run-airgap-local-enclave.sh must exist");
    assert.ok(fs.existsSync(ps1Path), "run-airgap-local-enclave.ps1 must exist");

    const shContent = fs.readFileSync(shPath, "utf-8");
    assert.ok(shContent.includes("127.0.0.1"), "Shell script must bind to 127.0.0.1 loopback");
    assert.ok(shContent.includes("Darwin") && shContent.includes("arm64"), "Must detect Apple Silicon");
    assert.ok(shContent.includes("llama-server"), "Must configure llama-server");

    const ps1Content = fs.readFileSync(ps1Path, "utf-8");
    assert.ok(ps1Content.includes("127.0.0.1"), "PowerShell script must bind to 127.0.0.1");
    assert.ok(ps1Content.includes("NOCTIS_SOVEREIGN_AIRGAP"), "Must set enclave air-gap environment");
  });

  test("Task 1.2: enforces strict air-gap boundary policy (rejects non-loopback bindings)", () => {
    // Valid loopback
    const valid = validateAirgapSecurityPolicy(DEFAULT_AIRGAP_CONFIG);
    assert.ok(valid.compliant, "Default config must be compliant");
    assert.equal(valid.violations.length, 0);

    // Invalid non-loopback host (e.g. 0.0.0.0 or public IP)
    const invalid = validateAirgapSecurityPolicy({
      ...DEFAULT_AIRGAP_CONFIG,
      host: "192.168.1.50",
      zeroWanEnforced: false,
    });
    assert.ok(!invalid.compliant, "Non-loopback binding must be rejected");
    assert.ok(invalid.violations.length >= 2, "Must report host and WAN egress violations");
  });

  test("Task 1.3: executes deterministic offline clinical diagnostic probe with 100% invariant adherence", async () => {
    const probe = await executeOfflineEnclaveProbe({ timeoutMs: 100 });

    assert.ok(probe.probeId.startsWith("PROBE-"));
    assert.ok(probe.zeroEgressConfirmed, "Must confirm zero WAN egress");
    assert.ok(
      probe.enclaveStatus === "STANDALONE_FALLBACK" || probe.enclaveStatus === "ONLINE_AIRGAPPED",
      `Unexpected status: ${probe.enclaveStatus}`
    );
    assert.ok(probe.sampleInference.invariantsPreserved, "Clinical contraindication invariant must be strictly preserved");
    assert.ok(probe.sampleInference.clinicalDetermination.includes("PROHIBITED") || probe.sampleInference.clinicalDetermination.includes("CONTRAINDICATION"));
  });
});
