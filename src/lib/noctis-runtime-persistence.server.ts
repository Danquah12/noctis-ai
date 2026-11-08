/**
 * Tenant-scoped persistence adapter for Noctis cloud runtime execution records.
 *
 * This module reserves launch intent before a provider call, records provider
 * outcomes, and persists quarantined observations. It never calls a provider,
 * authorizes cleanup, or exposes arbitrary SQL to callers.
 */
import type { NoctisSandboxLimits } from "./noctis-isolation-contract.ts";

export type NoctisRuntimeSqlResult<Row> = { rows: Row[]; rowCount?: number | null };
export interface NoctisRuntimeSqlExecutor {
  query<Row = Record<string, unknown>>(sql: string, parameters?: readonly unknown[]): Promise<NoctisRuntimeSqlResult<Row>>;
}
export interface NoctisRuntimeSqlDatabase extends NoctisRuntimeSqlExecutor {
  transaction<T>(operation: (tx: NoctisRuntimeSqlExecutor) => Promise<T>): Promise<T>;
}

export type NoctisRuntimeTrustedContext = {
  tenantId: string;
  actorId: string;
  requestId: string;
  correlationId: string;
};

export type NoctisRuntimeReservation = NoctisRuntimeTrustedContext & {
  recordId: string;
  providerId: string;
  idempotencyKey: string;
  executionIntentId: string;
  workloadId: string;
  workloadDigest: string;
  runtimeId: string;
  limits: NoctisSandboxLimits;
  leaseExpiresAt: string;
  at: string;
  eventId: string;
};

export type NoctisRuntimePersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "INVALID_INPUT" | "IDEMPOTENCY_CONFLICT" | "NOT_FOUND" | "STATE_CONFLICT" };

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function utc(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}
function validLimits(value: NoctisSandboxLimits): boolean {
  return !!value && Number.isSafeInteger(value.executionMs) && value.executionMs > 0 &&
    Number.isSafeInteger(value.cpuMillis) && value.cpuMillis > 0 &&
    Number.isSafeInteger(value.memoryMb) && value.memoryMb > 0 &&
    Number.isSafeInteger(value.outputBytes) && value.outputBytes > 0;
}
function validReservation(input: NoctisRuntimeReservation): boolean {
  return !!input && [input.recordId,input.providerId,input.tenantId,input.actorId,input.requestId,
    input.correlationId,input.idempotencyKey,input.executionIntentId,input.workloadId,input.runtimeId,
    input.eventId].every(nonEmpty) &&
    /^noctis:[a-f0-9]{64}$/.test(input.idempotencyKey) &&
    /^sha256:[a-f0-9]{64}$/.test(input.workloadDigest) &&
    validLimits(input.limits) && utc(input.at) && utc(input.leaseExpiresAt) &&
    Date.parse(input.leaseExpiresAt) > Date.parse(input.at);
}
async function tenantTransaction<T>(
  db: NoctisRuntimeSqlDatabase, tenantId: string,
  operation: (tx: NoctisRuntimeSqlExecutor) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    return operation(tx);
  });
}
async function appendAudit(tx: NoctisRuntimeSqlExecutor, input: {
  eventId: string; eventType: string; occurredAt: string; context: NoctisRuntimeTrustedContext;
  workloadId: string; workloadDigest: string; providerId: string; runtimeId?: string;
  executionId?: string; outcome: string; details?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await tx.query(
    `INSERT INTO noctis_runtime_audit_events
      (event_id,event_type,occurred_at,request_id,correlation_id,tenant_id,actor_id,
       workload_id,workload_digest,provider_id,runtime_id,execution_id,outcome,details)
     VALUES ($1,$2,$3::timestamptz,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
    [input.eventId,input.eventType,input.occurredAt,input.context.requestId,input.context.correlationId,
      input.context.tenantId,input.context.actorId,input.workloadId,input.workloadDigest,input.providerId,
      input.runtimeId ?? null,input.executionId ?? null,input.outcome,JSON.stringify(input.details ?? {})],
  );
}

/** Persist launch intent before calling the provider. Identical replays return the existing row. */
export async function reserveNoctisRuntimeExecution(
  db: NoctisRuntimeSqlDatabase, input: NoctisRuntimeReservation,
): Promise<NoctisRuntimePersistenceResult<{ recordId: string; created: boolean }>> {
  if (!validReservation(input)) return { ok: false, code: "INVALID_INPUT" };
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    const inserted=await tx.query<{runtime_execution_record_id:string}>(
      `INSERT INTO noctis_runtime_executions
       (runtime_execution_record_id,provider_id,idempotency_key,execution_intent_id,tenant_id,
        workload_id,workload_digest,runtime_id,resource_limits,state,lease_expires_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'launch_requested',$10::timestamptz,$11::timestamptz,$11::timestamptz)
       ON CONFLICT (provider_id,idempotency_key) DO NOTHING
       RETURNING runtime_execution_record_id`,
      [input.recordId,input.providerId,input.idempotencyKey,input.executionIntentId,input.tenantId,
       input.workloadId,input.workloadDigest,input.runtimeId,JSON.stringify(input.limits),
       input.leaseExpiresAt,input.at]);
    if(inserted.rows.length===0){
      const existing=await tx.query<{
        runtime_execution_record_id:string;tenant_id:string;execution_intent_id:string;
        workload_id:string;workload_digest:string;runtime_id:string;resource_limits:NoctisSandboxLimits;
      }>(
       `SELECT runtime_execution_record_id,tenant_id,execution_intent_id,workload_id,
               workload_digest,runtime_id,resource_limits
        FROM noctis_runtime_executions WHERE provider_id=$1 AND idempotency_key=$2 FOR UPDATE`,
       [input.providerId,input.idempotencyKey]);
      const row=existing.rows[0];
      if(!row || row.tenant_id!==input.tenantId || row.execution_intent_id!==input.executionIntentId ||
        row.workload_id!==input.workloadId || row.workload_digest!==input.workloadDigest ||
        row.runtime_id!==input.runtimeId || !row.resource_limits ||\n        row.resource_limits.executionMs!==input.limits.executionMs ||\n        row.resource_limits.cpuMillis!==input.limits.cpuMillis ||\n        row.resource_limits.memoryMb!==input.limits.memoryMb ||\n        row.resource_limits.outputBytes!==input.limits.outputBytes)
        return {ok:false,code:"IDEMPOTENCY_CONFLICT" as const};
      return {ok:true,value:{recordId:row.runtime_execution_record_id,created:false}};
    }
    await appendAudit(tx,{eventId:input.eventId,eventType:"launch_requested",occurredAt:input.at,
      context:input,workloadId:input.workloadId,workloadDigest:input.workloadDigest,
      providerId:input.providerId,runtimeId:input.runtimeId,outcome:"requested",
      details:{idempotencyKey:input.idempotencyKey}});
    return {ok:true,value:{recordId:input.recordId,created:true}};
  });
}

export async function recordNoctisRuntimeLaunch(
  db:NoctisRuntimeSqlDatabase,input:NoctisRuntimeTrustedContext & {
    providerId:string;idempotencyKey:string;executionId:string;runtimeId:string;
    workloadId:string;workloadDigest:string;at:string;eventId:string;
  },
):Promise<NoctisRuntimePersistenceResult<{updated:true}>>{
  if(!input || ![input.tenantId,input.actorId,input.requestId,input.correlationId,input.providerId,
    input.idempotencyKey,input.executionId,input.runtimeId,input.workloadId,input.eventId].every(nonEmpty) ||
    !/^noctis:[a-f0-9]{64}$/.test(input.idempotencyKey) ||
    !/^sha256:[a-f0-9]{64}$/.test(input.workloadDigest) || !utc(input.at))
    return {ok:false,code:"INVALID_INPUT"};
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    const updated=await tx.query<{runtime_execution_record_id:string}>(
      `UPDATE noctis_runtime_executions SET execution_id=$1,state='running',updated_at=$2::timestamptz
       WHERE provider_id=$3 AND idempotency_key=$4 AND tenant_id=$5 AND workload_id=$6
         AND workload_digest=$7 AND runtime_id=$8 AND state IN ('launch_requested','launch_unknown','running')
         AND (execution_id IS NULL OR execution_id=$1)
       RETURNING runtime_execution_record_id`,
      [input.executionId,input.at,input.providerId,input.idempotencyKey,input.tenantId,
       input.workloadId,input.workloadDigest,input.runtimeId]);
    if(updated.rows.length===0){
      const exists=await tx.query("SELECT 1 FROM noctis_runtime_executions WHERE provider_id=$1 AND idempotency_key=$2",
        [input.providerId,input.idempotencyKey]);
      return {ok:false,code:exists.rows.length?"STATE_CONFLICT" as const:"NOT_FOUND" as const};
    }
    await appendAudit(tx,{eventId:input.eventId,eventType:"launch_succeeded",occurredAt:input.at,
      context:input,workloadId:input.workloadId,workloadDigest:input.workloadDigest,
      providerId:input.providerId,runtimeId:input.runtimeId,executionId:input.executionId,
      outcome:"succeeded"});
    return {ok:true,value:{updated:true}};
  });
}

/** Mark an ambiguous provider response so reconciliation can discover a lost launch response. */
export async function markNoctisRuntimeLaunchUnknown(
  db:NoctisRuntimeSqlDatabase,input:NoctisRuntimeTrustedContext & {
    providerId:string;idempotencyKey:string;workloadId:string;workloadDigest:string;
    runtimeId:string;at:string;eventId:string;
  },
):Promise<NoctisRuntimePersistenceResult<{updated:true}>>{
  if(!input || ![input.tenantId,input.actorId,input.requestId,input.correlationId,input.providerId,
    input.idempotencyKey,input.workloadId,input.runtimeId,input.eventId].every(nonEmpty) ||
    !/^noctis:[a-f0-9]{64}$/.test(input.idempotencyKey) ||
    !/^sha256:[a-f0-9]{64}$/.test(input.workloadDigest) || !utc(input.at))
    return {ok:false,code:"INVALID_INPUT"};
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    const updated=await tx.query(
      `UPDATE noctis_runtime_executions SET state='launch_unknown',updated_at=$1::timestamptz
       WHERE provider_id=$2 AND idempotency_key=$3 AND tenant_id=$4 AND workload_id=$5
         AND workload_digest=$6 AND runtime_id=$7 AND state='launch_requested'`,
      [input.at,input.providerId,input.idempotencyKey,input.tenantId,input.workloadId,input.workloadDigest,input.runtimeId]);
    if((updated.rowCount??0)!==1)return {ok:false,code:"STATE_CONFLICT" as const};
    await appendAudit(tx,{eventId:input.eventId,eventType:"launch_failed",occurredAt:input.at,
      context:input,workloadId:input.workloadId,workloadDigest:input.workloadDigest,
      providerId:input.providerId,runtimeId:input.runtimeId,outcome:"incomplete",
      details:{reasonCode:"PROVIDER_RESPONSE_AMBIGUOUS"}});
    return {ok:true,value:{updated:true}};
  });
}

export async function quarantineNoctisRuntimeObservation(
  db:NoctisRuntimeSqlDatabase,input:NoctisRuntimeTrustedContext & {
    quarantineId:string;providerId:string;executionId:string;idempotencyKey?:string;
    observedTenantId?:string;workloadId:string;workloadDigest:string;runtimeId?:string;
    reason:"NO_EXPECTED_RECORD"|"IDENTITY_MISMATCH"|"DUPLICATE_IDEMPOTENCY_KEY"|"INVALID_OBSERVATION"|"PROVIDER_CONFLICT";
    observedRecord:Record<string,unknown>;at:string;eventId:string;
  },
):Promise<NoctisRuntimePersistenceResult<{quarantineId:string;created:boolean}>>{
  if(!input || ![input.tenantId,input.actorId,input.requestId,input.correlationId,input.quarantineId,
    input.providerId,input.executionId,input.workloadId,input.eventId].every(nonEmpty) ||
    !/^sha256:[a-f0-9]{64}$/.test(input.workloadDigest) || !utc(input.at) ||
    !input.observedRecord || typeof input.observedRecord!=="object" || Array.isArray(input.observedRecord))
    return {ok:false,code:"INVALID_INPUT"};
  let encoded:string;
  try{encoded=JSON.stringify(input.observedRecord);if(!encoded || encoded==="{}" && Object.keys(input.observedRecord).length)throw new Error();}
  catch{return {ok:false,code:"INVALID_INPUT"};}
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    const inserted=await tx.query<{quarantine_id:string}>(
      `INSERT INTO noctis_runtime_quarantine
       (quarantine_id,provider_id,execution_id,idempotency_key,observed_tenant_id,reason,
        observed_record,status,first_seen_at,last_seen_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'open',$8::timestamptz,$8::timestamptz)
       ON CONFLICT(provider_id,execution_id) DO NOTHING RETURNING quarantine_id`,
      [input.quarantineId,input.providerId,input.executionId,input.idempotencyKey??null,
       input.observedTenantId??null,input.reason,encoded,input.at]);
    let quarantineId=input.quarantineId;
    if(inserted.rows.length===0){
      const existing=await tx.query<{quarantine_id:string}>(
        "SELECT quarantine_id FROM noctis_runtime_quarantine WHERE provider_id=$1 AND execution_id=$2 FOR UPDATE",
        [input.providerId,input.executionId]);
      if(!existing.rows[0])return {ok:false,code:"STATE_CONFLICT" as const};
      quarantineId=existing.rows[0].quarantine_id;
      await tx.query(
        "UPDATE noctis_runtime_quarantine SET last_seen_at=$1::timestamptz WHERE provider_id=$2 AND execution_id=$3",
        [input.at,input.providerId,input.executionId]);
    }
    await appendAudit(tx,{eventId:input.eventId,eventType:"resource_quarantined",occurredAt:input.at,
      context:input,workloadId:input.workloadId,workloadDigest:input.workloadDigest,
      providerId:input.providerId,runtimeId:input.runtimeId,executionId:input.executionId,
      outcome:"observed",details:{reason:input.reason,quarantineId}});
    return {ok:true,value:{quarantineId,created:inserted.rows.length===1}};
  });
}
