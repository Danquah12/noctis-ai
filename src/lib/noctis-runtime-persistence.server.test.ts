import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  markNoctisRuntimeLaunchUnknown,
  quarantineNoctisRuntimeObservation,
  recordNoctisRuntimeLaunch,
  reserveNoctisRuntimeExecution,
  type NoctisRuntimeSqlDatabase,
  type NoctisRuntimeSqlExecutor,
} from "./noctis-runtime-persistence.server.ts";

const migration=readFileSync(new URL("../../migrations/20261108_noctis_runtime_reconciliation.sql",import.meta.url),"utf8");
const at="2026-11-08T12:00:00.000Z";
const limits={executionMs:30000,cpuMillis:1000,memoryMb:512,outputBytes:65536};
const base={
  recordId:"runtime-record-1",providerId:"provider-a",idempotencyKey:"noctis:"+"a".repeat(64),
  executionIntentId:"intent-1",tenantId:"tenant-a",actorId:"actor-a",requestId:"request-a",
  correlationId:"corr-a",workloadId:"workload-a",workloadDigest:"sha256:"+"b".repeat(64),
  runtimeId:"runtime-a",limits,leaseExpiresAt:"2026-11-08T12:05:00.000Z",at,eventId:"audit-request",
};
async function setup(){
  const pg=new PGlite();await pg.waitReady;await pg.exec(migration);
  const wrap=(client:{query:(sql:string,params?:unknown[])=>Promise<any>}):NoctisRuntimeSqlExecutor=>({
    query:(sql,params)=>client.query(sql,params?[...params]:undefined),
  });
  const db:NoctisRuntimeSqlDatabase={...wrap(pg),transaction:(op)=>pg.transaction(tx=>op(wrap(tx)))};
  return {pg,db};
}

describe("Noctis transactional runtime persistence",()=>{
  it("reserves a launch intent before provider invocation and returns the row on identical replay",async()=>{
    const {pg,db}=await setup();
    try{
      const created=await reserveNoctisRuntimeExecution(db,base);
      assert.deepEqual(created,{ok:true,value:{recordId:"runtime-record-1",created:true}});
      const replay=await reserveNoctisRuntimeExecution(db,{...base,recordId:"another-id",eventId:"another-event"});
      assert.deepEqual(replay,{ok:true,value:{recordId:"runtime-record-1",created:false}});
      const counts=await pg.query<{executions:string;audits:string}>(
        "SELECT (SELECT count(*)::text FROM noctis_runtime_executions) executions,(SELECT count(*)::text FROM noctis_runtime_audit_events) audits");
      assert.deepEqual(counts.rows[0],{executions:"1",audits:"1"});
    }finally{await pg.close();}
  });

  it("rejects same idempotency key with changed workload, limits, or tenant",async()=>{
    const {pg,db}=await setup();
    try{
      await reserveNoctisRuntimeExecution(db,base);
      assert.deepEqual(await reserveNoctisRuntimeExecution(db,{...base,recordId:"r2",workloadId:"other"}),
        {ok:false,code:"IDEMPOTENCY_CONFLICT"});
      assert.deepEqual(await reserveNoctisRuntimeExecution(db,{...base,recordId:"r3",tenantId:"tenant-b"}),
        {ok:false,code:"IDEMPOTENCY_CONFLICT"});
      assert.deepEqual(await reserveNoctisRuntimeExecution(db,{...base,recordId:"r4",limits:{...limits,memoryMb:256}}),
        {ok:false,code:"IDEMPOTENCY_CONFLICT"});
    }finally{await pg.close();}
  });

  it("records ambiguous launch responses and then binds the recovered provider execution",async()=>{
    const {pg,db}=await setup();
    try{
      await reserveNoctisRuntimeExecution(db,base);
      const unknown=await markNoctisRuntimeLaunchUnknown(db,{...base,eventId:"audit-unknown"});
      assert.deepEqual(unknown,{ok:true,value:{updated:true}});
      const recovered=await recordNoctisRuntimeLaunch(db,{...base,eventId:"audit-recovered",executionId:"exec-1"});
      assert.deepEqual(recovered,{ok:true,value:{updated:true}});
      const row=await pg.query<{state:string;execution_id:string}>(
        "SELECT state,execution_id FROM noctis_runtime_executions WHERE idempotency_key=$1",[base.idempotencyKey]);
      assert.deepEqual(row.rows[0],{state:"running",execution_id:"exec-1"});
      const audit=await pg.query<{event_type:string;outcome:string}>(
        "SELECT event_type,outcome FROM noctis_runtime_audit_events ORDER BY audit_sequence");
      assert.deepEqual(audit.rows.map(x=>[x.event_type,x.outcome]),[
        ["launch_requested","requested"],["launch_failed","incomplete"],["launch_succeeded","succeeded"]]);
    }finally{await pg.close();}
  });

  it("fails closed when launch outcome identity does not match the reserved tenant/workload",async()=>{
    const {pg,db}=await setup();
    try{
      await reserveNoctisRuntimeExecution(db,base);
      const result=await recordNoctisRuntimeLaunch(db,{...base,tenantId:"tenant-b",eventId:"audit-wrong",executionId:"exec-1"});
      assert.deepEqual(result,{ok:false,code:"NOT_FOUND"});
      const row=await pg.query<{state:string}>("SELECT state FROM noctis_runtime_executions");
      assert.equal(row.rows[0].state,"launch_requested");
    }finally{await pg.close();}
  });

  it("persists a quarantine record idempotently without changing its original identity",async()=>{
    const {pg,db}=await setup();
    try{
      const observation={
        ...base,quarantineId:"q-1",executionId:"orphan-1",reason:"NO_EXPECTED_RECORD" as const,
        observedTenantId:"untrusted-tenant",observedRecord:{tenantId:"untrusted-tenant",providerState:"running"},
        eventId:"audit-q-1",
      };
      const first=await quarantineNoctisRuntimeObservation(db,observation);
      assert.deepEqual(first,{ok:true,value:{quarantineId:"q-1",created:true}});
      const replay=await quarantineNoctisRuntimeObservation(db,{...observation,quarantineId:"q-2",eventId:"audit-q-2"});
      assert.deepEqual(replay,{ok:true,value:{quarantineId:"q-1",created:false}});
      const row=await pg.query<{quarantine_id:string;status:string;observed_tenant_id:string}>(
        "SELECT quarantine_id,status,observed_tenant_id FROM noctis_runtime_quarantine");
      assert.deepEqual(row.rows[0],{quarantine_id:"q-1",status:"open",observed_tenant_id:"untrusted-tenant"});
    }finally{await pg.close();}
  });

  it("rejects malformed reservations before opening a database transaction",async()=>{
    const {pg,db}=await setup();
    try{
      assert.deepEqual(await reserveNoctisRuntimeExecution(db,{...base,workloadDigest:"bad"}),
        {ok:false,code:"INVALID_INPUT"});
      const rows=await pg.query("SELECT 1 FROM noctis_runtime_executions");
      assert.equal(rows.rows.length,0);
    }finally{await pg.close();}
  });
});
