import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  createNoctisTrainingDataset,
  reviewNoctisTrainingDatasetVersion,
  reviewNoctisTrainingExample,
  snapshotNoctisTrainingDataset,
  submitNoctisTrainingExample,
  type TrainingSqlDatabase,
  type TrainingSqlExecutor,
} from "./noctis-training-data-persistence.server.ts";

const migrations=[
  "0013_vibe_training.sql",
  "0014_noctis_learning_governance.sql",
  "0016_noctis_training_data_pipeline.sql",
].map(name=>readFileSync(new URL(`../../migrations/${name}`,import.meta.url),"utf8"));
const at="2026-11-08T16:00:00.000Z";
const sourceHash="a".repeat(64);
const base={
  tenantId:"tenant-a",actorId:"reviewer-a",pairId:"pair-1",
  question:"Explain secure training data provenance",
  answer:"A training example must retain a verified source, license, content hash, and review history.",
  domain:"engineering",model:"user-taught",sourceId:"source-1",
  sourceHash,license:"CC-BY-4.0",sourceLocator:"section-2",at,auditId:"audit-submit-1",
};
async function setup(){
  const pg=new PGlite();await pg.waitReady;
  for(const migration of migrations)await pg.exec(migration);
  await pg.query(
    `INSERT INTO noctis_learning_source
     (id,title,domain,content_hash,license,status,classification)
     VALUES('source-1','Verified source','engineering',$1,'CC-BY-4.0','approved','public')`,
    [sourceHash]);
  const wrap=(client:{query:(sql:string,params?:unknown[])=>Promise<any>}):TrainingSqlExecutor=>({
    query:async(sql,params)=>{try{return await client.query(sql,params?[...params]:undefined);}catch(error){throw new Error(`Training SQL failed: ${sql}: ${error instanceof Error?error.message:String(error)}`);}},
  });
  const db:TrainingSqlDatabase={
    ...wrap(pg),
    transaction:(operation)=>pg.transaction(tx=>operation(wrap(tx))),
  };
  return {pg,db};
}

describe("Noctis governed training data persistence",()=>{
  it("persists a quarantined candidate and makes identical submission replay idempotent",async()=>{
    const {pg,db}=await setup();
    try{
      const first=await submitNoctisTrainingExample(db,base);
      assert.equal(first.ok,true);
      if(!first.ok)return;
      assert.equal(first.value.created,true);
      const replay=await submitNoctisTrainingExample(db,{...base,auditId:"audit-replay"});
      assert.deepEqual(replay,{ok:true,value:{...first.value,created:false}});
      const rows=await pg.query<{approval_status:string;verified:boolean;tenant_id:string}>(
        "SELECT approval_status,verified,tenant_id FROM vibe_training_pair WHERE id='pair-1'");
      assert.deepEqual(rows.rows[0],{approval_status:"quarantined",verified:false,tenant_id:"tenant-a"});
      const audits=await pg.query<{count:string}>("SELECT count(*)::text AS count FROM noctis_learning_audit");
      assert.equal(audits.rows[0].count,"1");
    }finally{await pg.close();}
  });

  it("rejects unapproved or mismatched source provenance",async()=>{
    const {pg,db}=await setup();
    try{
      assert.deepEqual(await submitNoctisTrainingExample(db,{...base,sourceHash:"b".repeat(64)}),
        {ok:false,code:"SOURCE_NOT_APPROVED"});
      const result=await submitNoctisTrainingExample(db,{...base,sourceId:"missing"});
      assert.deepEqual(result,{ok:false,code:"NOT_FOUND"});
    }finally{await pg.close();}
  });

  it("requires source approval before approving a candidate and audits the review atomically",async()=>{
    const {pg,db}=await setup();
    try{
      await submitNoctisTrainingExample(db,base);
      const reviewed=await reviewNoctisTrainingExample(db,{
        tenantId:"tenant-a",actorId:"reviewer-b",pairId:"pair-1",decision:"approved",
        reason:"Verified against the approved source",at,auditId:"audit-review-1",
      });
      assert.deepEqual(reviewed,{ok:true,value:{pairId:"pair-1",decision:"approved"}});
      const row=await pg.query<{approval_status:string;reviewed_by:string;verified:boolean}>(
        "SELECT approval_status,reviewed_by,verified FROM vibe_training_pair WHERE id='pair-1'");
      assert.deepEqual(row.rows[0],{approval_status:"approved",reviewed_by:"reviewer-b",verified:true});
      const audit=await pg.query<{count:string}>("SELECT count(*)::text AS count FROM noctis_learning_audit");
      assert.equal(audit.rows[0].count,"2");
    }finally{await pg.close();}
  });

  it("creates a reproducible dataset snapshot from only approved, licensed examples",async()=>{
    const {pg,db}=await setup();
    try{
      await submitNoctisTrainingExample(db,base);
      await reviewNoctisTrainingExample(db,{
        tenantId:"tenant-a",actorId:"reviewer-b",pairId:"pair-1",decision:"approved",
        reason:"Source and answer verified",at,auditId:"audit-review-1",
      });
      assert.deepEqual(await createNoctisTrainingDataset(db,{
        tenantId:"tenant-a",actorId:"owner-a",datasetId:"dataset-1",name:"Engineering Core",domain:"engineering",
      }),{ok:true,value:{datasetId:"dataset-1",created:true}});
      const snapshot=await snapshotNoctisTrainingDataset(db,{
        tenantId:"tenant-a",actorId:"owner-a",datasetId:"dataset-1",datasetVersionId:"dataset-version-1",
        pairIds:["pair-1"],splitSeed:"frozen-seed-v1",at,
      });
      assert.equal(snapshot.ok,true);
      if(!snapshot.ok)return;
      assert.equal(snapshot.value.contentDigest.startsWith("sha256:"),true);
      assert.equal(snapshot.value.versionNumber,1);
      assert.equal(snapshot.value.counts.train+snapshot.value.counts.validation+snapshot.value.counts.test,1);
      const reviewed=await reviewNoctisTrainingDatasetVersion(db,{
        tenantId:"tenant-a",actorId:"dataset-reviewer",datasetVersionId:"dataset-version-1",
        decision:"approved",reason:"Dataset lineage and membership reviewed",at,
      });
      assert.deepEqual(reviewed,{ok:true,value:{datasetVersionId:"dataset-version-1",decision:"approved"}});
      await assert.rejects(()=>pg.query(
        "UPDATE noctis_training_dataset_member SET split='test' WHERE dataset_version_id='dataset-version-1'"),
        /immutable/);
      await assert.rejects(()=>pg.query(
        "UPDATE noctis_training_dataset_version SET content_digest='sha256:'||repeat('f',64) WHERE dataset_version_id='dataset-version-1'"),
        /immutable/);
    }finally{await pg.close();}
  });

  it("blocks dataset approval when an underlying source has been revoked",async()=>{
    const {pg,db}=await setup();
    try{
      await submitNoctisTrainingExample(db,base);
      await reviewNoctisTrainingExample(db,{
        tenantId:"tenant-a",actorId:"reviewer-b",pairId:"pair-1",decision:"approved",
        reason:"Source verified",at,auditId:"audit-review-1",
      });
      await createNoctisTrainingDataset(db,{
        tenantId:"tenant-a",actorId:"owner-a",datasetId:"dataset-1",name:"Engineering Core",domain:"engineering",
      });
      await snapshotNoctisTrainingDataset(db,{
        tenantId:"tenant-a",actorId:"owner-a",datasetId:"dataset-1",datasetVersionId:"dataset-version-1",
        pairIds:["pair-1"],splitSeed:"frozen-seed-v1",at,
      });
      await pg.query("UPDATE noctis_learning_source SET status='deprecated' WHERE id='source-1'");
      const result=await reviewNoctisTrainingDatasetVersion(db,{
        tenantId:"tenant-a",actorId:"dataset-reviewer",datasetVersionId:"dataset-version-1",
        decision:"approved",reason:"Attempt after revocation",at,
      });
      assert.deepEqual(result,{ok:false,code:"SOURCE_NOT_APPROVED"});
    }finally{await pg.close();}
  });
});
