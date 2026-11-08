/**
 * Noctis secure-execution admission contract.
 *
 * This module validates a provider-signed isolation attestation before a
 * workload may be submitted to an external sandbox provider. It does NOT
 * create a sandbox or enforce OS/container controls itself. A production
 * provider adapter and independent attestation-signature verifier are required.
 */

export type NoctisIsolationType = "microvm" | "hardened_container" | "hardened_wasm";

export type NoctisSandboxLimits = {
  executionMs: number;
  cpuMillis: number;
  memoryMb: number;
  outputBytes: number;
};

export type NoctisSandboxPolicy = {
  allowedProviderIds: readonly string[];
  allowedIsolationTypes: readonly NoctisIsolationType[];
  maxLimits: NoctisSandboxLimits;
  requireNetworkDisabled: true;
  requireEphemeralFilesystem: true;
  requireNoHostFilesystem: true;
  requireResourceLimits: true;
  requireForcedTermination: true;
  requireTenantIsolation: true;
  requireAuditLogging: true;
  requireUnprivilegedExecution: true;
};

export type NoctisSandboxAttestation = {
  providerId: string;
  runtimeId: string;
  runtimeVersion: string;
  isolationType: NoctisIsolationType;
  workloadDigest: string;
  tenantId: string;
  /** Actual provider-enforced ceilings; must be no greater than requested. */
  enforcedLimits: NoctisSandboxLimits;
  networkDisabled: boolean;
  ephemeralFilesystem: boolean;
  noHostFilesystem: boolean;
  resourceLimitsEnforced: boolean;
  forcedTerminationAvailable: boolean;
  tenantIsolationEnforced: boolean;
  auditLoggingEnabled: boolean;
  unprivilegedExecution: boolean;
  issuedAt: string;
  expiresAt: string;
  signature: string;
};

export type NoctisSandboxAdmissionRequest = {
  workloadId: string;
  tenantId: string;
  actorId: string;
  workloadDigest: string;
  limits: NoctisSandboxLimits;
  attestation: NoctisSandboxAttestation;
  now: string;
};

export type NoctisSandboxAdmissionError =
  | "INVALID_REQUEST"
  | "LIMIT_EXCEEDED"
  | "PROVIDER_NOT_ALLOWED"
  | "ISOLATION_TYPE_NOT_ALLOWED"
  | "ATTESTATION_BINDING_MISMATCH"
  | "ATTESTATION_EXPIRED"
  | "ATTESTATION_INVALID"
  | "ISOLATION_CONTROL_MISSING";

export type NoctisSandboxAdmissionResult =
  | { ok: true; providerId: string; runtimeId: string; limits: NoctisSandboxLimits; workloadDigest: string }
  | { ok: false; code: NoctisSandboxAdmissionError; message: string };

export type NoctisSandboxAttestationVerifier = (
  attestation: NoctisSandboxAttestation,
) => boolean | Promise<boolean>;

function reject(code: NoctisSandboxAdmissionError, message: string): NoctisSandboxAdmissionResult {
  return { ok: false, code, message };
}

function isUtcTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function validLimits(limits: NoctisSandboxLimits): boolean {
  return !!limits &&
    Number.isSafeInteger(limits.executionMs) && limits.executionMs > 0 &&
    Number.isSafeInteger(limits.cpuMillis) && limits.cpuMillis > 0 &&
    Number.isSafeInteger(limits.memoryMb) && limits.memoryMb > 0 &&
    Number.isSafeInteger(limits.outputBytes) && limits.outputBytes > 0;
}

function withinLimits(requested: NoctisSandboxLimits, maximum: NoctisSandboxLimits): boolean {
  return requested.executionMs <= maximum.executionMs &&
    requested.cpuMillis <= maximum.cpuMillis &&
    requested.memoryMb <= maximum.memoryMb &&
    requested.outputBytes <= maximum.outputBytes;
}

/**
 * Fail-closed admission check. Signature verification must be implemented by
 * a trusted provider-key service; never replace it with a truthy signature check.
 */
export async function admitNoctisSandboxWorkload(
  request: NoctisSandboxAdmissionRequest,
  policy: NoctisSandboxPolicy,
  verifyAttestation: NoctisSandboxAttestationVerifier,
): Promise<NoctisSandboxAdmissionResult> {
  if (!request || !policy || typeof verifyAttestation !== "function" ||
      !request.workloadId?.trim() || !request.tenantId?.trim() || !request.actorId?.trim() ||
      !/^sha256:[a-f0-9]{64}$/.test(request.workloadDigest) ||
      !validLimits(request.limits) || !validLimits(policy.maxLimits) ||
      !Array.isArray(policy.allowedProviderIds) || !Array.isArray(policy.allowedIsolationTypes) ||
      !isUtcTimestamp(request.now) || !request.attestation) {
    return reject("INVALID_REQUEST", "A workload identity, SHA-256 digest, valid limits, UTC time and attestation are required.");
  }

  if (!withinLimits(request.limits, policy.maxLimits)) {
    return reject("LIMIT_EXCEEDED", "Requested sandbox limits exceed the configured policy maximum.");
  }

  const attestation = request.attestation;
  if (!policy.allowedProviderIds.includes(attestation.providerId)) {
    return reject("PROVIDER_NOT_ALLOWED", "Sandbox provider is not in the trusted provider allowlist.");
  }
  if (!policy.allowedIsolationTypes.includes(attestation.isolationType)) {
    return reject("ISOLATION_TYPE_NOT_ALLOWED", "Sandbox isolation type is not approved by policy.");
  }
  if (attestation.tenantId !== request.tenantId ||
      attestation.workloadDigest !== request.workloadDigest ||
      !attestation.runtimeId?.trim() || !attestation.runtimeVersion?.trim() ||
      !validLimits(attestation.enforcedLimits) || !withinLimits(attestation.enforcedLimits, request.limits)) {
    return reject("ATTESTATION_BINDING_MISMATCH", "Attestation does not bind this tenant and exact workload digest.");
  }
  if (!isUtcTimestamp(attestation.issuedAt) || !isUtcTimestamp(attestation.expiresAt) ||
      Date.parse(attestation.issuedAt) > Date.parse(request.now) ||
      Date.parse(attestation.expiresAt) <= Date.parse(request.now)) {
    return reject("ATTESTATION_EXPIRED", "Sandbox attestation is malformed, not yet valid or expired.");
  }

  const controlsPresent =
    (!policy.requireNetworkDisabled || attestation.networkDisabled) &&
    (!policy.requireEphemeralFilesystem || attestation.ephemeralFilesystem) &&
    (!policy.requireNoHostFilesystem || attestation.noHostFilesystem) &&
    (!policy.requireResourceLimits || attestation.resourceLimitsEnforced) &&
    (!policy.requireForcedTermination || attestation.forcedTerminationAvailable) &&
    (!policy.requireTenantIsolation || attestation.tenantIsolationEnforced) &&
    (!policy.requireAuditLogging || attestation.auditLoggingEnabled) &&
    (!policy.requireUnprivilegedExecution || attestation.unprivilegedExecution);
  if (!controlsPresent) {
    return reject("ISOLATION_CONTROL_MISSING", "Attestation does not demonstrate every isolation control required by policy.");
  }

  let signatureValid = false;
  try {
    signatureValid = await verifyAttestation(attestation);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid || !attestation.signature?.trim()) {
    return reject("ATTESTATION_INVALID", "Sandbox attestation signature could not be verified by the trusted verifier.");
  }

  return {
    ok: true,
    providerId: attestation.providerId,
    runtimeId: attestation.runtimeId,
    limits: { ...attestation.enforcedLimits },
    workloadDigest: request.workloadDigest,
  };
}

/**
 * Production adapter boundary. Implementations must submit only to the
 * attested runtime and must confirm both stop and reap before reporting
 * termination. No implementation is wired by this contract module.
 */
export interface NoctisIsolatedRuntimeProvider {
  launch(input: {
    workloadId: string;
    tenantId: string;
    workloadDigest: string;
    limits: NoctisSandboxLimits;
    networkAccess: "disabled";
    filesystem: "ephemeral-only";
    privileged: false;
  }): Promise<{ runtimeId: string; executionId: string }>;
  terminateAndReap(executionId: string): Promise<{
    processStopped: boolean;
    resourcesReaped: boolean;
  }>;
}
