import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  admitNoctisSandboxWorkload,
  type NoctisSandboxAdmissionRequest,
  type NoctisSandboxAttestation,
  type NoctisSandboxPolicy,
} from "./noctis-isolation-contract.ts";

const now = "2026-11-08T12:00:00Z";
const digest = `sha256:${"a".repeat(64)}`;
const policy: NoctisSandboxPolicy = {
  allowedProviderIds: ["trusted-provider"],
  allowedIsolationTypes: ["microvm"],
  maxLimits: { executionMs: 30_000, cpuMillis: 20_000, memoryMb: 512, outputBytes: 1_000_000 },
  requireNetworkDisabled: true,
  requireEphemeralFilesystem: true,
  requireNoHostFilesystem: true,
  requireResourceLimits: true,
  requireForcedTermination: true,
  requireTenantIsolation: true,
  requireAuditLogging: true,
  requireUnprivilegedExecution: true,
};

function attestation(overrides: Partial<NoctisSandboxAttestation> = {}): NoctisSandboxAttestation {
  return {
    providerId: "trusted-provider",
    runtimeId: "runtime-01",
    runtimeVersion: "1.2.3",
    isolationType: "microvm",
    workloadDigest: digest,
    tenantId: "tenant-01",
    networkDisabled: true,
    ephemeralFilesystem: true,
    noHostFilesystem: true,
    resourceLimitsEnforced: true,
    forcedTerminationAvailable: true,
    tenantIsolationEnforced: true,
    auditLoggingEnabled: true,
    unprivilegedExecution: true,
    issuedAt: "2026-11-08T11:00:00Z",
    expiresAt: "2026-11-08T13:00:00Z",
    signature: "provider-signature",
    ...overrides,
  };
}

function request(overrides: Partial<NoctisSandboxAdmissionRequest> = {}): NoctisSandboxAdmissionRequest {
  return {
    workloadId: "workload-01",
    tenantId: "tenant-01",
    actorId: "actor-01",
    workloadDigest: digest,
    limits: { executionMs: 10_000, cpuMillis: 5_000, memoryMb: 256, outputBytes: 100_000 },
    attestation: attestation(),
    now,
    ...overrides,
  };
}

describe("Noctis sandbox isolation admission contract", () => {
  it("admits a correctly bound, signed, unexpired microVM attestation", async () => {
    const result = await admitNoctisSandboxWorkload(request(), policy, async (value) => value.signature === "provider-signature");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.providerId, "trusted-provider");
      assert.equal(result.workloadDigest, digest);
      assert.equal(result.limits.memoryMb, 256);
    }
  });

  it("fails closed when signature verification fails or throws", async () => {
    const invalid = await admitNoctisSandboxWorkload(request(), policy, () => false);
    assert.deepEqual(invalid, {
      ok: false, code: "ATTESTATION_INVALID",
      message: "Sandbox attestation signature could not be verified by the trusted verifier.",
    });
    const unavailable = await admitNoctisSandboxWorkload(request(), policy, () => { throw new Error("key service unavailable"); });
    assert.equal(unavailable.ok, false);
    if (!unavailable.ok) assert.equal(unavailable.code, "ATTESTATION_INVALID");
  });

  it("rejects tenant and workload-digest binding mismatches", async () => {
    const wrongTenant = await admitNoctisSandboxWorkload(
      request({ attestation: attestation({ tenantId: "other-tenant" }) }), policy, () => true,
    );
    assert.equal(wrongTenant.ok, false);
    if (!wrongTenant.ok) assert.equal(wrongTenant.code, "ATTESTATION_BINDING_MISMATCH");

    const wrongDigest = await admitNoctisSandboxWorkload(
      request({ attestation: attestation({ workloadDigest: `sha256:${"b".repeat(64)}` }) }), policy, () => true,
    );
    assert.equal(wrongDigest.ok, false);
    if (!wrongDigest.ok) assert.equal(wrongDigest.code, "ATTESTATION_BINDING_MISMATCH");
  });

  it("rejects missing isolation controls, including enabled network access", async () => {
    const result = await admitNoctisSandboxWorkload(
      request({ attestation: attestation({ networkDisabled: false }) }), policy, () => true,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "ISOLATION_CONTROL_MISSING");
  });

  it("rejects providers and isolation types outside the allowlist", async () => {
    const provider = await admitNoctisSandboxWorkload(
      request({ attestation: attestation({ providerId: "unknown-provider" }) }), policy, () => true,
    );
    assert.equal(provider.ok, false);
    if (!provider.ok) assert.equal(provider.code, "PROVIDER_NOT_ALLOWED");

    const type = await admitNoctisSandboxWorkload(
      request({ attestation: attestation({ isolationType: "hardened_container" }) }), policy, () => true,
    );
    assert.equal(type.ok, false);
    if (!type.ok) assert.equal(type.code, "ISOLATION_TYPE_NOT_ALLOWED");
  });

  it("rejects excessive resource limits and expired attestations", async () => {
    const limits = await admitNoctisSandboxWorkload(
      request({ limits: { executionMs: 60_000, cpuMillis: 5_000, memoryMb: 256, outputBytes: 100_000 } }),
      policy, () => true,
    );
    assert.equal(limits.ok, false);
    if (!limits.ok) assert.equal(limits.code, "LIMIT_EXCEEDED");

    const expired = await admitNoctisSandboxWorkload(
      request({ attestation: attestation({ expiresAt: "2026-11-08T11:59:59Z" }) }), policy, () => true,
    );
    assert.equal(expired.ok, false);
    if (!expired.ok) assert.equal(expired.code, "ATTESTATION_EXPIRED");
  });

  it("rejects malformed digests and non-positive resource limits", async () => {
    const badDigest = await admitNoctisSandboxWorkload(request({ workloadDigest: "not-a-digest" }), policy, () => true);
    assert.equal(badDigest.ok, false);
    if (!badDigest.ok) assert.equal(badDigest.code, "INVALID_REQUEST");

    const badLimits = await admitNoctisSandboxWorkload(
      request({ limits: { executionMs: 0, cpuMillis: 5_000, memoryMb: 256, outputBytes: 100_000 } }),
      policy, () => true,
    );
    assert.equal(badLimits.ok, false);
    if (!badLimits.ok) assert.equal(badLimits.code, "INVALID_REQUEST");
  });
});
