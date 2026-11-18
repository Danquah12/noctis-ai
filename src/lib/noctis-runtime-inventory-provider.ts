/**
 * Provider inventory pagination contract for Noctis M3.
 *
 * A reconciliation pass may consume inventory only after every page belongs
 * to one provider snapshot and the provider confirms a terminal page. Partial,
 * unstable, duplicated, or malformed pagination fails closed.
 */
import type { NoctisObservedRuntimeExecution } from "./noctis-runtime-reconciliation.ts";

export type NoctisRuntimeInventoryPage = {
  snapshotId: string;
  executions: readonly NoctisObservedRuntimeExecution[];
  nextCursor: string | null;
  /** True only when this response is the terminal page of a complete snapshot. */
  complete: boolean;
};

export interface NoctisRuntimeInventoryProvider {
  readonly providerId: string;
  listExecutions(input: {
    cursor: string | null;
    snapshotId: string | null;
    pageSize: number;
  }): Promise<NoctisRuntimeInventoryPage>;
}

export type NoctisRuntimeInventoryFailure =
  | "PROVIDER_ERROR"
  | "INVALID_PAGE"
  | "SNAPSHOT_CHANGED"
  | "CURSOR_CYCLE"
  | "PAGE_LIMIT"
  | "DUPLICATE_EXECUTION_ID"
  | "INCOMPLETE_SNAPSHOT";

export type NoctisRuntimeInventoryResult =
  | {
      ok: true;
      providerId: string;
      snapshotId: string;
      executions: NoctisObservedRuntimeExecution[];
      pageCount: number;
      complete: true;
    }
  | {
      ok: false;
      providerId: string;
      reason: NoctisRuntimeInventoryFailure;
      pageCount: number;
      /** No partial observations are exposed as a reconciliation input. */
    };

export type NoctisRuntimeInventoryOptions = {
  pageSize?: number;
  maxPages?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Fetch a single consistent, complete provider snapshot.
 * The provider must guarantee stable snapshot semantics for a snapshotId and
 * cursor pair; this adapter verifies continuity but cannot prove provider truth.
 */
export async function collectNoctisRuntimeInventory(
  provider: NoctisRuntimeInventoryProvider,
  options: NoctisRuntimeInventoryOptions = {},
): Promise<NoctisRuntimeInventoryResult> {
  const pageSize = options.pageSize ?? 100;
  const maxPages = options.maxPages ?? 100;
  if (!provider || typeof provider.providerId !== "string" || !provider.providerId.trim() ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500 ||
      !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 1000 ||
      typeof provider.listExecutions !== "function") {
    throw new Error("A provider and bounded inventory pagination limits are required.");
  }

  let cursor: string | null = null;
  let snapshotId: string | null = null;
  const cursors = new Set<string>();
  const executionIds = new Set<string>();
  const executions: NoctisObservedRuntimeExecution[] = [];

  for (let pageCount = 1; pageCount <= maxPages; pageCount += 1) {
    let page: NoctisRuntimeInventoryPage;
    try {
      page = await provider.listExecutions({ cursor, snapshotId, pageSize });
    } catch {
      return { ok: false, providerId: provider.providerId, reason: "PROVIDER_ERROR", pageCount: pageCount - 1 };
    }

    if (!isRecord(page) || typeof page.snapshotId !== "string" || !page.snapshotId.trim() ||
        !Array.isArray(page.executions) ||
        !(page.nextCursor === null || (typeof page.nextCursor === "string" && !!page.nextCursor.trim())) ||
        typeof page.complete !== "boolean") {
      return { ok: false, providerId: provider.providerId, reason: "INVALID_PAGE", pageCount };
    }

    if (snapshotId === null) snapshotId = page.snapshotId;
    else if (page.snapshotId !== snapshotId) {
      return { ok: false, providerId: provider.providerId, reason: "SNAPSHOT_CHANGED", pageCount };
    }

    for (const item of page.executions) {
      if (!isRecord(item)) {
        return { ok: false, providerId: provider.providerId, reason: "INVALID_PAGE", pageCount };
      }
      const executionId = item.executionId;
      if (typeof executionId === "string" && executionId.trim()) {
        if (executionIds.has(executionId)) {
          return { ok: false, providerId: provider.providerId, reason: "DUPLICATE_EXECUTION_ID", pageCount };
        }
        executionIds.add(executionId);
      }
      executions.push(item as unknown as NoctisObservedRuntimeExecution);
    }

    if (page.nextCursor === null) {
      if (!page.complete) {
        return { ok: false, providerId: provider.providerId, reason: "INCOMPLETE_SNAPSHOT", pageCount };
      }
      return {
        ok: true, providerId: provider.providerId, snapshotId,
        executions, pageCount, complete: true,
      };
    }

    if (page.complete || cursors.has(page.nextCursor) || page.nextCursor === cursor) {
      return {
        ok: false, providerId: provider.providerId,
        reason: page.complete ? "INVALID_PAGE" : "CURSOR_CYCLE", pageCount,
      };
    }
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
    if (pageCount === maxPages) {
      return { ok: false, providerId: provider.providerId, reason: "PAGE_LIMIT", pageCount };
    }
  }

  return { ok: false, providerId: provider.providerId, reason: "PAGE_LIMIT", pageCount: maxPages };
}
