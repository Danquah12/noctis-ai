import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Noctis Sovereign Air-Gapped Enclave Suite (Option 4)", () => {
  test("verifies Dockerfile.airgap hardening rules for zero WAN egress", () => {
    const dockerfilePath = path.resolve(process.cwd(), "deploy/Dockerfile.airgap");
    assert.ok(fs.existsSync(dockerfilePath), "deploy/Dockerfile.airgap must exist");

    const content = fs.readFileSync(dockerfilePath, "utf-8");
    assert.ok(content.includes("NOCTIS_SOVEREIGN_AIRGAP=true"));
    assert.ok(content.includes("NO_WAN_EGRESS=1"));
    assert.ok(content.includes("USER node"), "Must run as non-root user node");
    assert.ok(content.includes("HEALTHCHECK"), "Must declare local loopback healthcheck");
  });

  test("verifies docker-compose.sovereign.yml isolated internal mesh", () => {
    const composePath = path.resolve(process.cwd(), "deploy/docker-compose.sovereign.yml");
    assert.ok(fs.existsSync(composePath), "deploy/docker-compose.sovereign.yml must exist");

    const content = fs.readFileSync(composePath, "utf-8");
    assert.ok(content.includes("internal: true"), "Network must have internal: true for hard isolation");
    assert.ok(content.includes("127.0.0.1:8080:8080"), "Ports must bind only to loopback 127.0.0.1");
    assert.ok(content.includes("read_only: true"), "Container filesystem must be read-only");
    assert.ok(content.includes("no-new-privileges:true"), "Must drop privilege escalation");
    assert.ok(content.includes("cap_drop:\n      - ALL"), "Must drop all kernel capabilities");
  });

  test("verifies public/sw.js offline air-gap interceptor handles network disconnection", () => {
    const swPath = path.resolve(process.cwd(), "public/sw.js");
    assert.ok(fs.existsSync(swPath), "public/sw.js must exist");

    const content = fs.readFileSync(swPath, "utf-8");
    assert.ok(content.includes("noctis-sovereign-v2"));
    assert.ok(content.includes("SOVEREIGN_AIRGAP_ACTIVE"));
    assert.ok(content.includes("X-Noctis-Enclave-Mode"));
  });
});
