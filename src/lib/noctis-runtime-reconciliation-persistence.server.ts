/**
 * PostgreSQL/PGlite repository for complete runtime reconciliation snapshots.
 *
 * The repository uses a service identity for the cross-tenant provider inventory
 * operation. Provider-reported tenant metadata is never copied into decision
 * ownership fields. Tenant/workload fields are populated only for decisions
 * sourced from the authoritative execution ledger.
 */
import { createHash } from "node:crypto";
import type {
  NoctisExpectedRuntimeExecution,
  NoctisRuntimeReconciliationDecision,
} from "./noctis-runtime-reconciliation.ts";
import type { NoctisRuntimeReconciliationRepository } from "./noctis-runtime-reconciliation-service.ts";
import type {
  NoctisRuntimeSqlDatabase,
  NoctisRuntimeSqlExecutor,
} from "./noctis-runtime-persistence.server.ts";

export type NoctisRuntimeReconciliationServiceIdentity = {
  systemTenantId: string;
  serviceActorId: string;
};

type SnapshotCommitInput = {
  providerId: string;
  snapshotId: string;
  observedCount: number;
  pageCount: number;
  completedAt: string;
  decisions: readonly NoctisRuntimeReconciliationDecision[];
};

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function validUtc(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function stableDecision(decision: NoctisRuntimeReconciliationDecision): Record<string, unknown> {
  return JSON.parse(canonical(decision)) as Record<string, unknown>;
}
function decisionColumns(decision: NoctisRuntimeReconciliationDecision) {
  const value = decision as NoctisRuntimeReconciliationDecision;
  return {
    kind: value.kind,
    executionId: "executionId" in value ? value.executionId : null,
    idempotencyKey: "idempotencyKey" in value ? value.idempotencyKey : null,
    tenantId: value.kind === "missing_expected" ? value.tenantId : null,
    workloadId: value.kind === "missing_expected" ? value.workloadId : null,
    reason: "reason" in value ? value.reason : null,
  };
}

async function serviceTransaction<T>(
  db: NoctisRuntimeSqlDatabase,
  systemTenantId: string,
  operation: (tx: NoctisRuntimeSqlExecutor) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query("SELECT set_config('app.tenant_id', $1, true)", [systemTenantId]);
    return operation(tx);
  });
}

export class PostgresNoctisRuntimeReconciliationRepository
implements NoctisRuntimeReconciliationRepository {
  constructor(
    private readonly db: NoctisRuntimeSqlDatabase,
    private readonly identity: NoctisRuntimeReconciliationServiceIdentity,
  ) {
    if (!db || !isNonEmpty(identity?.systemTenantId) || !isNonEmpty(identity?.serviceActorId)) {
      throw new Error("A database and trusted reconciliation service identity are required.");
    }
  }

  async loadExpectedExecutions(providerId: string): Promise<readonly NoctisExpectedRuntimeExecution[]> {
    if (!isNonEmpty(providerId)) throw new Error("A provider ID is required.");
    return serviceTransaction(this.db, this.identity.systemTenantId, async (tx) => {
      const result = await tx.query<{
        idempotency_key: string; tenant_id: string; workload_id: string;
        workload_digest: string; runtime_id: string; execution_id: string | null;
        lease_expires_at: string;
      }>(
        `SELECT idempotency_key,tenant_id,workload_id,workload_digest,runtime_id,
                execution_id,lease_expires_at::text AS lease_expires_at
         FROM noctis_runtime_executions
         WHERE provider_id=$1 AND state NOT IN ('stopped','reaped','failed')
         ORDER BY idempotency_key`,
        [providerId],
      );
      return result.rows.map((row) => ({
        idempotencyKey: row.idempotency_key,
        tenantId: row.tenant_id,
        workloadId: row.workload_id,
        workloadDigest: row.workload_digest,
        runtimeId: row.runtime_id,
        ...(row.execution_id ? { executionId: row.execution_id } : {}),
        leaseExpiresAt: new Date(row.lease_expires_at).toISOString(),
      }));
    });
  }

  async commitSnapshot(input: SnapshotCommitInput): Promise<{ committed: true; replayed: boolean }> {
    if (!input || !isNonEmpty(input.providerId) || !isNonEmpty(input.snapshotId) ||
        !Number.isSafeInteger(input.observedCount) || input.observedCount < 0 ||
        !Number.isSafeInteger(input.pageCount) || input.pageCount < 1 ||
        !validUtc(input.completedAt) || !Array.isArray(input.decisions)) {
      throw new Error("Invalid reconciliation snapshot commit input.");
    }
    const decisions = input.decisions.map(stableDecision);
    const payload = {
      providerId: input.providerId,
      snapshotId: input.snapshotId,
      observedCount: input.observedCount,
      pageCount: input.pageCount,
      decisions,
    };
    const digest = `sha256:${sha256(canonical(payload))}`;
    const runId = `recon-run-${sha256(`${input.providerId}\0${input.snapshotId}`).slice(0, 40)}`;
    const eventId = `runtime-reconciliation:${sha256(`${input.providerId}\0${input.snapshotId}`)}`;
    const workloadId = "runtime-reconciliation";
    const occurredAt = input.completedAt;

    return serviceTransaction(this.db, this.identity.systemTenantId, async (tx) => {
      const inserted = await tx.query<{ reconciliation_run_id: string }>(
        `INSERT INTO noctis_runtime_reconciliation_runs
          (reconciliation_run_id,provider_id,snapshot_id,snapshot_digest,observed_count,
           page_count,decision_count,completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz)
         ON CONFLICT(provider_id,snapshot_id) DO NOTHING
         RETURNING reconciliation_run_id`,
        [runId,input.providerId,input.snapshotId,digest,input.observedCount,
          input.pageCount,decisions.length,input.completedAt],
      );

      if (inserted.rows.length === 0) {
        const existing = await tx.query<{ reconciliation_run_id: string; snapshot_digest: string }>(
          `SELECT reconciliation_run_id,snapshot_digest
           FROM noctis_runtime_reconciliation_runs
           WHERE provider_id=$1 AND snapshot_id=$2 FOR UPDATE`,
          [input.providerId,input.snapshotId],
        );
        const row = existing.rows[0];
        if (!row || row.snapshot_digest !== digest) {
          throw new Error("RECONCILIATION_SNAPSHOT_CONFLICT");
        }
        return { committed: true as const, replayed: true };
      }

      for (let index = 0; index < decisions.length; index += 1) {
        const decision = decisions[index] as unknown as NoctisRuntimeReconciliationDecision;
        const columns = decisionColumns(decision);
        const decisionId = `recon-decision-${sha256(`${runId}\0${index}`).slice(0, 40)}`;
        await tx.query(
          `INSERT INTO noctis_runtime_reconciliation_decisions
           (reconciliation_decision_id,reconciliation_run_id,provider_id,snapshot_id,decision_index,
            decision_kind,execution_id,idempotency_key,tenant_id,workload_id,reason,decision_payload)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
          [decisionId,runId,input.providerId,input.snapshotId,index,columns.kind,
            columns.executionId,columns.idempotencyKey,columns.tenantId,columns.workloadId,
            columns.reason,canonical(decisions[index])],
        );
      }

      await tx.query(
        `INSERT INTO noctis_runtime_audit_events
         (event_id,event_type,occurred_at,request_id,correlation_id,tenant_id,actor_id,
          workload_id,workload_digest,provider_id,outcome,details)
         VALUES ($1,'inventory_reconciled',$2::timestamptz,$3,$4,$5,$6,$7,$8,$9,'succeeded',$10::jsonb)`,
        [eventId,occurredAt,eventId,eventId,this.identity.systemTenantId,
          this.identity.serviceActorId,workloadId,digest,input.providerId,
          JSON.stringify({snapshotId:input.snapshotId,observedCount:input.observedCount,
            pageCount:input.pageCount,decisionCount:decisions.length})],
      );
      return { committed: true as const, replayed: false };
    });
  }
}
