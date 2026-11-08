/**
 * Orchestrates one complete provider-inventory reconciliation pass.
 *
 * The provider inventory is collected first and must be complete before the
 * authoritative ledger is read. Decisions are committed through an injected
 * atomic/idempotent repository. This service never adopts, stops, or deletes
 * provider resources and never treats provider-supplied tenant metadata as
 * authorization.
 */
import {
  reconcileNoctisRuntimeInventory,
  type NoctisExpectedRuntimeExecution,
  type NoctisRuntimeReconciliationDecision,
} from "./noctis-runtime-reconciliation.ts";
import {
  collectNoctisRuntimeInventory,
  type NoctisRuntimeInventoryFailure,
  type NoctisRuntimeInventoryOptions,
  type NoctisRuntimeInventoryProvider,
} from "./noctis-runtime-inventory-provider.ts";

export interface NoctisRuntimeReconciliationRepository {
  /** Must return an authoritative, provider-scoped ledger snapshot. */
  loadExpectedExecutions(providerId: string): Promise<readonly NoctisExpectedRuntimeExecution[]>;
  /**
   * Must atomically persist the complete decision set. The pair
   * (providerId,snapshotId) is the idempotency key: exact replay is a no-op;
   * a different payload for the same key must be rejected as a conflict.
   */
  commitSnapshot(input: {
    providerId: string;
    snapshotId: string;
    observedCount: number;
    pageCount: number;
    completedAt: string;
    decisions: readonly NoctisRuntimeReconciliationDecision[];
  }): Promise<{ committed: true; replayed: boolean }>;
}

export type NoctisRuntimeReconciliationRunResult =
  | {
      ok: true;
      providerId: string;
      snapshotId: string;
      observedCount: number;
      expectedCount: number;
      pageCount: number;
      decisions: NoctisRuntimeReconciliationDecision[];
      committed: true;
      replayed: boolean;
    }
  | {
      ok: false;
      providerId: string;
      stage: "inventory" | "ledger" | "classification" | "persistence";
      reason: string;
      inventoryFailure?: NoctisRuntimeInventoryFailure;
      pageCount?: number;
    };

export async function runNoctisRuntimeReconciliation(
  provider: NoctisRuntimeInventoryProvider,
  repository: NoctisRuntimeReconciliationRepository,
  options: NoctisRuntimeInventoryOptions & { now: string },
): Promise<NoctisRuntimeReconciliationRunResult> {
  if (!provider || !repository || typeof options?.now !== "string" ||
      !Number.isFinite(Date.parse(options.now)) || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(options.now) ||
      typeof repository.loadExpectedExecutions !== "function" ||
      typeof repository.commitSnapshot !== "function") {
    throw new Error("A provider, repository, and valid UTC reconciliation time are required.");
  }

  const inventory = await collectNoctisRuntimeInventory(provider, options);
  if (!inventory.ok) {
    return {
      ok: false, providerId: provider.providerId, stage: "inventory",
      reason: inventory.reason, inventoryFailure: inventory.reason, pageCount: inventory.pageCount,
    };
  }
  if (inventory.providerId !== provider.providerId) {
    return { ok: false, providerId: provider.providerId, stage: "inventory", reason: "PROVIDER_IDENTITY_MISMATCH" };
  }

  let expected: readonly NoctisExpectedRuntimeExecution[];
  try {
    expected = await repository.loadExpectedExecutions(provider.providerId);
    if (!Array.isArray(expected)) throw new Error("Ledger repository returned a non-array snapshot.");
  } catch (error) {
    return {
      ok: false, providerId: provider.providerId, stage: "ledger",
      reason: error instanceof Error ? error.message : "LEDGER_READ_FAILED",
    };
  }

  let decisions: NoctisRuntimeReconciliationDecision[];
  try {
    decisions = reconcileNoctisRuntimeInventory({
      providerId: provider.providerId, expected, observed: inventory.executions, now: options.now,
    });
  } catch (error) {
    return {
      ok: false, providerId: provider.providerId, stage: "classification",
      reason: error instanceof Error ? error.message : "CLASSIFICATION_FAILED",
    };
  }

  try {
    const committed = await repository.commitSnapshot({
      providerId: provider.providerId,
      snapshotId: inventory.snapshotId,
      observedCount: inventory.executions.length,
      pageCount: inventory.pageCount,
      completedAt: options.now,
      decisions,
    });
    if (!committed || committed.committed !== true || typeof committed.replayed !== "boolean") {
      throw new Error("Repository did not confirm an atomic snapshot commit.");
    }
    return {
      ok: true, providerId: provider.providerId, snapshotId: inventory.snapshotId,
      observedCount: inventory.executions.length, expectedCount: expected.length,
      pageCount: inventory.pageCount, decisions, committed: true, replayed: committed.replayed,
    };
  } catch (error) {
    return {
      ok: false, providerId: provider.providerId, stage: "persistence",
      reason: error instanceof Error ? error.message : "SNAPSHOT_COMMIT_FAILED",
    };
  }
}
