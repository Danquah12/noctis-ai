/**
 * Provider inventory reconciliation contract for Noctis cloud runtimes.
 *
 * This is a pure, fail-closed classifier. It never terminates or deletes a
 * provider resource. Unknown or mismatched resources are quarantined for
 * operator investigation; only a separately authorized cleanup workflow may
 * act after authoritative tenant/workload binding is established.
 */

export type NoctisExpectedRuntimeExecution = {
  idempotencyKey: string;
  tenantId: string;
  workloadId: string;
  workloadDigest: string;
  runtimeId: string;
  executionId?: string;
  leaseExpiresAt: string;
};

export type NoctisObservedRuntimeExecution = {
  providerId: string;
  idempotencyKey: string;
  tenantId: string;
  workloadId: string;
  workloadDigest: string;
  runtimeId: string;
  executionId: string;
  state: "starting" | "running" | "stopping" | "stopped" | "unknown";
  createdAt: string;
};

export type NoctisRuntimeReconciliationDecision =
  | { kind: "tracked"; executionId: string; idempotencyKey: string }
  | { kind: "missing_expected"; idempotencyKey: string; tenantId: string; workloadId: string }
  | { kind: "stale_expected"; idempotencyKey: string; executionId?: string }
  | { kind: "quarantine_unknown"; executionId: string; reason: "NO_EXPECTED_RECORD" }
  | { kind: "quarantine_mismatch"; executionId: string; reason: "IDENTITY_MISMATCH" | "DUPLICATE_IDEMPOTENCY_KEY" | "INVALID_OBSERVATION" };

export type NoctisRuntimeReconciliationInput = {
  providerId: string;
  expected: readonly NoctisExpectedRuntimeExecution[];
  observed: readonly NoctisObservedRuntimeExecution[];
  now: string;
};

function validUtc(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function validIdentity(value: NoctisObservedRuntimeExecution): boolean {
  return !!value.executionId?.trim() && /^noctis:[a-f0-9]{64}$/.test(value.idempotencyKey) &&
    !!value.tenantId?.trim() && !!value.workloadId?.trim() &&
    !!value.runtimeId?.trim() && /^sha256:[a-f0-9]{64}$/.test(value.workloadDigest) &&
    validUtc(value.createdAt);
}

/**
 * Compare the authoritative Noctis execution ledger with provider inventory.
 * Duplicate or uncertain records are quarantined, never auto-deleted.
 */
export function reconcileNoctisRuntimeInventory(
  input: NoctisRuntimeReconciliationInput,
): NoctisRuntimeReconciliationDecision[] {
  if (!input || !input.providerId?.trim() || !validUtc(input.now) ||
      !Array.isArray(input.expected) || !Array.isArray(input.observed)) {
    throw new Error("A provider ID, valid UTC time, and inventory arrays are required.");
  }

  const expectedByKey = new Map<string, NoctisExpectedRuntimeExecution>();
  for (const item of input.expected) {
    if (!/^noctis:[a-f0-9]{64}$/.test(item.idempotencyKey) || !item.tenantId?.trim() ||
        !item.workloadId?.trim() || !item.runtimeId?.trim() ||
        !/^sha256:[a-f0-9]{64}$/.test(item.workloadDigest) || !validUtc(item.leaseExpiresAt) ||
        expectedByKey.has(item.idempotencyKey)) {
      throw new Error("Expected runtime ledger contains an invalid or duplicate idempotency key.");
    }
    expectedByKey.set(item.idempotencyKey, item);
  }

  const observedByKey = new Map<string, NoctisObservedRuntimeExecution[]>();
  const decisions: NoctisRuntimeReconciliationDecision[] = [];
  for (const item of input.observed) {
    if (item.providerId !== input.providerId || !validIdentity(item) ||
        !["starting", "running", "stopping", "stopped", "unknown"].includes(item.state)) {
      decisions.push({
        kind: "quarantine_mismatch",
        executionId: item.executionId?.trim() || "unidentified",
        reason: "INVALID_OBSERVATION",
      });
      continue;
    }
    const list = observedByKey.get(item.idempotencyKey) ?? [];
    list.push(item);
    observedByKey.set(item.idempotencyKey, list);
  }

  for (const [key, executions] of observedByKey) {
    const expected = expectedByKey.get(key);
    if (!expected) {
      for (const item of executions) {
        decisions.push({ kind: "quarantine_unknown", executionId: item.executionId, reason: "NO_EXPECTED_RECORD" });
      }
      continue;
    }
    if (executions.length !== 1) {
      for (const item of executions) {
        decisions.push({ kind: "quarantine_mismatch", executionId: item.executionId, reason: "DUPLICATE_IDEMPOTENCY_KEY" });
      }
      continue;
    }
    const item = executions[0];
    const exactBinding = item.tenantId === expected.tenantId &&
      item.workloadId === expected.workloadId &&
      item.workloadDigest === expected.workloadDigest &&
      item.runtimeId === expected.runtimeId &&
      (!expected.executionId || item.executionId === expected.executionId);
    if (!exactBinding) {
      decisions.push({ kind: "quarantine_mismatch", executionId: item.executionId, reason: "IDENTITY_MISMATCH" });
      continue;
    }
    decisions.push({ kind: "tracked", executionId: item.executionId, idempotencyKey: key });
  }

  for (const [key, expected] of expectedByKey) {
    if (observedByKey.has(key)) continue;
    if (Date.parse(expected.leaseExpiresAt) <= Date.parse(input.now)) {
      decisions.push({ kind: "stale_expected", idempotencyKey: key, executionId: expected.executionId });
    } else {
      decisions.push({
        kind: "missing_expected",
        idempotencyKey: key,
        tenantId: expected.tenantId,
        workloadId: expected.workloadId,
      });
    }
  }
  return decisions;
}
