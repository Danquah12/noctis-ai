/**
 * Durable, tenant-scoped learning submissions and immutable dataset snapshots.
 *
 * This repository records governed examples; it does not train model weights.
 * Actor and tenant identity must be supplied by a trusted authenticated server
 * boundary, never copied from an untrusted request body.
 */
import { createHash } from "node:crypto";

export type TrainingSqlExecutor = {
  query<Row = Record<string, unknown>>(sql: string, parameters?: readonly unknown[]): Promise<{ rows: Row[]; rowCount?: number | null }>;
};
export type TrainingSqlDatabase = TrainingSqlExecutor & {
  transaction<T>(operation: (tx: TrainingSqlExecutor) => Promise<T>): Promise<T>;
};
export type NoctisTrainingTrustedContext = {
  tenantId: string;
  actorId: string;
};
export type NoctisTrainingSubmission = NoctisTrainingTrustedContext & {
  pairId: string;
  question: string;
  answer: string;
  domain: string;
  model: string;
  sourceId?: string;
  sourceLocator?: string;
  sourceHash?: string;
  license?: string;
  at: string;
  auditId: string;
};
export type NoctisTrainingRepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "INVALID_INPUT" | "NOT_FOUND" | "SOURCE_NOT_APPROVED" | "IDEMPOTENCY_CONFLICT" | "STATE_CONFLICT" };

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function validUtc(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
}
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}
function pairHash(input: { question: string; answer: string; domain: string; sourceId?: string; sourceHash?: string; license?: string }): string {
  return `sha256:${sha256(canonical(input))}`;
}
async function tenantTransaction<T>(db: TrainingSqlDatabase, tenantId: string, operation: (tx: TrainingSqlExecutor) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    return operation(tx);
  });
}

export async function submitNoctisTrainingExample(
  db: TrainingSqlDatabase,
  input: NoctisTrainingSubmission,
): Promise<NoctisTrainingRepositoryResult<{ pairId: string; created: boolean; pairDigest: string }>> {
  if (!input || ![input.tenantId,input.actorId,input.pairId,input.question,input.answer,input.domain,input.model,input.auditId].every(nonEmpty) ||
      input.question.trim().length < 4 || input.answer.trim().length < 12 ||
      input.question.length > 600 || input.answer.length > 6000 || !validUtc(input.at) ||
      ((input.sourceId || input.sourceHash || input.license) && ![input.sourceId,input.sourceHash,input.license].every(nonEmpty)) ||
      (input.sourceHash !== undefined && !/^sha256:[a-f0-9]{64}$/.test(input.sourceHash))) {
    return { ok: false, code: "INVALID_INPUT" };
  }
  const clean = {
    question: input.question.replace(/\s+/g, " ").trim(),
    answer: input.answer.trim(),
    domain: input.domain.trim(),
    sourceId: input.sourceId,
    sourceHash: input.sourceHash,
    license: input.license,
  };
  const digest = pairHash(clean);
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    if(input.sourceId){
      const source=await tx.query<{content_hash:string;license:string|null;status:string}>(
        "SELECT content_hash,license,status FROM noctis_learning_source WHERE id=$1",
        [input.sourceId]);
      const row=source.rows[0];
      if(!row)return {ok:false,code:"NOT_FOUND" as const};
      if(row.status!=="approved" || !row.license || row.content_hash!==input.sourceHash || row.license!==input.license)
        return {ok:false,code:"SOURCE_NOT_APPROVED" as const};
    }
    const inserted=await tx.query<{id:string}>(
      `INSERT INTO vibe_training_pair
       (id,tenant_id,question,answer,domain,model,hits,verified,approval_status,source_id,source_locator,source_hash,license,submitted_by,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,1,false,'quarantined',$7,$8,$9,$10,$11,$12::timestamptz)
       ON CONFLICT(id) DO NOTHING RETURNING id`,
      [input.pairId,input.tenantId,clean.question,clean.answer,clean.domain,input.model,
       input.sourceId??null,input.sourceLocator??null,input.sourceHash??null,input.license??null,input.actorId,input.at]);
    if(!inserted.rows.length){
      const existing=await tx.query<{tenant_id:string;question:string;answer:string;domain:string;source_id:string|null;source_hash:string|null;license:string|null}>(
        "SELECT tenant_id,question,answer,domain,source_id,source_hash,license FROM vibe_training_pair WHERE id=$1 FOR UPDATE",
        [input.pairId]);
      const row=existing.rows[0];
      if(!row || row.tenant_id!==input.tenantId || row.question!==clean.question || row.answer!==clean.answer ||
         row.domain!==clean.domain || row.source_id!==(input.sourceId??null) ||
         row.source_hash!==(input.sourceHash??null) || row.license!==(input.license??null))
        return {ok:false,code:"IDEMPOTENCY_CONFLICT" as const};
      return {ok:true,value:{pairId:input.pairId,created:false,pairDigest:digest}};
    }
    await tx.query(
      `INSERT INTO noctis_learning_audit
       (id,actor_id,action,target_type,target_id,reason,after_hash)
       VALUES ($1,$2,'training_pair_submitted','training_pair',$3,'Candidate submitted for independent review',$4)`,
      [input.auditId,input.actorId,input.pairId,digest]);
    return {ok:true,value:{pairId:input.pairId,created:true,pairDigest:digest}};
  });
}

export async function reviewNoctisTrainingExample(
  db: TrainingSqlDatabase,
  input: NoctisTrainingTrustedContext & {
    pairId:string; decision:"approved"|"rejected"; reason:string; at:string; auditId:string;
  },
): Promise<NoctisTrainingRepositoryResult<{pairId:string;decision:"approved"|"rejected"}>> {
  if(!input || ![input.tenantId,input.actorId,input.pairId,input.reason,input.auditId].every(nonEmpty) ||
     input.reason.trim().length>500 || !validUtc(input.at))
    return {ok:false,code:"INVALID_INPUT"};
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    const existing=await tx.query<{
      id:string;question:string;answer:string;domain:string;source_id:string|null;source_hash:string|null;
      license:string|null;approval_status:string;
    }>(
      "SELECT id,question,answer,domain,source_id,source_hash,license,approval_status FROM vibe_training_pair WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
      [input.pairId,input.tenantId]);
    const row=existing.rows[0];
    if(!row)return {ok:false,code:"NOT_FOUND" as const};
    if(row.approval_status!=="quarantined" && row.approval_status!=="legacy_review_required")
      return {ok:false,code:"STATE_CONFLICT" as const};
    if(input.decision==="approved"){
      if(!row.source_id || !row.source_hash || !row.license)
        return {ok:false,code:"SOURCE_NOT_APPROVED" as const};
      const source=await tx.query<{content_hash:string;license:string|null;status:string}>(
        "SELECT content_hash,license,status FROM noctis_learning_source WHERE id=$1",
        [row.source_id]);
      const sourceRow=source.rows[0];
      if(!sourceRow || sourceRow.status!=="approved" || sourceRow.content_hash!==row.source_hash || sourceRow.license!==row.license)
        return {ok:false,code:"SOURCE_NOT_APPROVED" as const};
    }
    const before=pairHash({question:row.question,answer:row.answer,domain:row.domain,sourceId:row.source_id??undefined,sourceHash:row.source_hash??undefined,license:row.license??undefined});
    const after=sha256(`${before}: ${input.decision}: ${input.reason.trim()}`);
    await tx.query(
      `UPDATE vibe_training_pair SET approval_status=$1,verified=$2,reviewed_by=$3,
       reviewed_at=$4::timestamptz,approval_reason=$5,updated_at=$4::timestamptz
       WHERE id=$6 AND tenant_id=$7`,
      [input.decision,input.decision==="approved",input.actorId,input.at,input.reason.trim(),input.pairId,input.tenantId]);
    await tx.query(
      `INSERT INTO noctis_learning_audit
       (id,actor_id,action,target_type,target_id,reason,before_hash,after_hash)
       VALUES ($1,$2,$3,'training_pair',$4,$5,$6,$7)`,
      [input.auditId,input.actorId,input.decision==="approved"?"training_pair_approved":"training_pair_rejected",
       input.pairId,input.reason.trim(),before,after]);
    return {ok:true,value:{pairId:input.pairId,decision:input.decision}};
  });
}

export async function createNoctisTrainingDataset(
  db:TrainingSqlDatabase,
  input:NoctisTrainingTrustedContext & {datasetId:string;name:string;domain:string;description?:string},
):Promise<NoctisTrainingRepositoryResult<{datasetId:string;created:boolean}>>{
  if(!input || ![input.tenantId,input.actorId,input.datasetId,input.name,input.domain].every(nonEmpty) ||
     input.name.length>160 || input.domain.length>80 || (input.description?.length??0)>2000)
    return {ok:false,code:"INVALID_INPUT"};
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    const inserted=await tx.query<{dataset_id:string}>(
      `INSERT INTO noctis_training_dataset(dataset_id,tenant_id,name,domain,description,created_by)
       VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,name) DO NOTHING RETURNING dataset_id`,
      [input.datasetId,input.tenantId,input.name.trim(),input.domain.trim(),input.description??null,input.actorId]);
    if(inserted.rows.length)return {ok:true,value:{datasetId:input.datasetId,created:true}};
    const existing=await tx.query<{dataset_id:string;domain:string;description:string|null}>(
      "SELECT dataset_id,domain,description FROM noctis_training_dataset WHERE tenant_id=$1 AND name=$2",
      [input.tenantId,input.name.trim()]);
    const row=existing.rows[0];
    if(!row || row.domain!==input.domain.trim() || row.description!==(input.description??null))
      return {ok:false,code:"IDEMPOTENCY_CONFLICT" as const};
    return {ok:true,value:{datasetId:row.dataset_id,created:false}};
  });
}

export async function snapshotNoctisTrainingDataset(
  db:TrainingSqlDatabase,
  input:NoctisTrainingTrustedContext & {
    datasetId:string;datasetVersionId:string;pairIds:readonly string[];splitSeed:string;at:string;
  },
):Promise<NoctisTrainingRepositoryResult<{datasetVersionId:string;versionNumber:number;contentDigest:string;counts:{train:number;validation:number;test:number}}>>{
  if(!input || ![input.tenantId,input.actorId,input.datasetId,input.datasetVersionId,input.splitSeed].every(nonEmpty) ||
     !Array.isArray(input.pairIds) || input.pairIds.length<1 || input.pairIds.length>100000 ||
     new Set(input.pairIds).size!==input.pairIds.length || input.pairIds.some(id=>!nonEmpty(id)) || !validUtc(input.at))
    return {ok:false,code:"INVALID_INPUT"};
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    const dataset=await tx.query<{domain:string}>(
      "SELECT domain FROM noctis_training_dataset WHERE dataset_id=$1 AND tenant_id=$2 FOR UPDATE",
      [input.datasetId,input.tenantId]);
    if(!dataset.rows.length)return {ok:false,code:"NOT_FOUND" as const};
    const placeholders=input.pairIds.map((_,i)=>"$"+(i+2)).join(",");
    const rows=await tx.query<{
      id:string;question:string;answer:string;domain:string;source_id:string;source_hash:string;license:string;
      source_status:string;source_content_hash:string;source_license:string;
    }>(
      `SELECT p.id,p.question,p.answer,p.domain,p.source_id,p.source_hash,p.license,
        s.status AS source_status,s.content_hash AS source_content_hash,s.license AS source_license
       FROM vibe_training_pair p JOIN noctis_learning_source s ON s.id=p.source_id
       WHERE p.tenant_id=$1 AND p.approval_status='approved' AND p.verified=true
         AND s.status='approved' AND s.license IS NOT NULL
         AND p.source_hash=s.content_hash AND p.license=s.license
         AND p.id IN (${placeholders})
       ORDER BY p.id`,
      [input.tenantId,...input.pairIds]);
    if(rows.rows.length!==input.pairIds.length)return {ok:false,code:"SOURCE_NOT_APPROVED" as const};
    if(rows.rows.some(r=>r.domain!==dataset.rows[0].domain))return {ok:false,code:"INVALID_INPUT" as const};
    const items=rows.rows.map(r=>({
      pairId:r.id,sourceId:r.source_id,
      pairDigest:pairHash({question:r.question,answer:r.answer,domain:r.domain,sourceId:r.source_id,sourceHash:r.source_hash,license:r.license}),
    }));
    const assigned=items.map(item=>{
      const bucket=parseInt(sha256(`${input.splitSeed}: ${item.pairId}`).slice(0,8),16)%100;
      return {...item,split:bucket<80?"train" as const:bucket<90?"validation" as const:"test" as const};
    });
    const counts={
      train:assigned.filter(x=>x.split==="train").length,
      validation:assigned.filter(x=>x.split==="validation").length,
      test:assigned.filter(x=>x.split==="test").length,
    };
    const digest=`sha256:${sha256(canonical({datasetId:input.datasetId,splitSeed:input.splitSeed,items:assigned}))}`;
    const versionRows=await tx.query<{version_number:string}>(
      "SELECT COALESCE(MAX(version_number),0)::text AS version_number FROM noctis_training_dataset_version WHERE dataset_id=$1",
      [input.datasetId]);
    const versionNumber=Number(versionRows.rows[0]?.version_number??0)+1;
    await tx.query(
      `INSERT INTO noctis_training_dataset_version
       (dataset_version_id,dataset_id,version_number,content_digest,item_count,train_count,validation_count,test_count,split_seed,created_by,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz)`,
      [input.datasetVersionId,input.datasetId,versionNumber,digest,assigned.length,counts.train,counts.validation,counts.test,input.splitSeed,input.actorId,input.at]);
    for(const item of assigned){
      await tx.query(
        `INSERT INTO noctis_training_dataset_member(dataset_version_id,training_pair_id,source_id,split,pair_digest)
         VALUES($1,$2,$3,$4,$5)`,
        [input.datasetVersionId,item.pairId,item.sourceId,item.split,item.pairDigest]);
    }
    await tx.query(
      `INSERT INTO noctis_learning_audit(id,actor_id,action,target_type,target_id,reason,after_hash)
       VALUES($1,$2,'training_dataset_version_created','training_dataset_version',$3,$4,$5)`,
      [`dataset-audit-${sha256(input.datasetVersionId)}`,input.actorId,
       input.datasetVersionId,`Snapshot contains ${assigned.length} source-approved examples`,digest]);
    return {ok:true,value:{datasetVersionId:input.datasetVersionId,versionNumber,contentDigest:digest,counts}};
  });
}

export async function reviewNoctisTrainingDatasetVersion(
  db:TrainingSqlDatabase,
  input:NoctisTrainingTrustedContext & {
    datasetVersionId:string;decision:"approved"|"rejected";reason:string;at:string;
  },
):Promise<NoctisTrainingRepositoryResult<{datasetVersionId:string;decision:"approved"|"rejected"}>>{
  if(!input || ![input.tenantId,input.actorId,input.datasetVersionId,input.reason].every(nonEmpty) ||
     input.reason.trim().length>500 || !validUtc(input.at))
    return {ok:false,code:"INVALID_INPUT"};
  return tenantTransaction(db,input.tenantId,async(tx)=>{
    const rows=await tx.query<{dataset_version_id:string;approval_status:string;content_digest:string}>(
      `SELECT v.dataset_version_id,v.approval_status,v.content_digest
       FROM noctis_training_dataset_version v
       JOIN noctis_training_dataset d ON d.dataset_id=v.dataset_id
       WHERE v.dataset_version_id=$1 AND d.tenant_id=$2 FOR UPDATE`,
      [input.datasetVersionId,input.tenantId]);
    const row=rows.rows[0];
    if(!row)return {ok:false,code:"NOT_FOUND" as const};
    if(row.approval_status!=="quarantined")return {ok:false,code:"STATE_CONFLICT" as const};
    if(input.decision==="approved"){
      const eligible=await tx.query<{count:string}>(
        `SELECT count(*)::text AS count
         FROM noctis_training_dataset_member m
         JOIN vibe_training_pair p ON p.id=m.training_pair_id
         JOIN noctis_learning_source s ON s.id=m.source_id
         WHERE m.dataset_version_id=$1 AND p.approval_status='approved'
           AND p.verified=true AND s.status='approved' AND s.license IS NOT NULL
           AND p.source_hash=s.content_hash AND p.license=s.license`,
        [input.datasetVersionId]);
      const version=await tx.query<{item_count:number}>(
        "SELECT item_count FROM noctis_training_dataset_version WHERE dataset_version_id=$1",
        [input.datasetVersionId]);
      if(Number(eligible.rows[0]?.count??0)!==Number(version.rows[0]?.item_count??-1))
        return {ok:false,code:"SOURCE_NOT_APPROVED" as const};
    }
    await tx.query(
      `UPDATE noctis_training_dataset_version
       SET approval_status=$1,approved_by=$2,approved_at=$3::timestamptz,approval_reason=$4
       WHERE dataset_version_id=$5`,
      [input.decision,input.actorId,input.at,input.reason.trim(),input.datasetVersionId]);
    await tx.query(
      `INSERT INTO noctis_learning_audit(id,actor_id,action,target_type,target_id,reason,before_hash,after_hash)
       VALUES($1,$2,$3,'training_dataset_version',$4,$5,$6,$7)`,
      [`dataset-review-${sha256(input.datasetVersionId+":"+input.decision)}`,input.actorId,
       input.decision==="approved"?"training_dataset_version_approved":"training_dataset_version_rejected",
       input.datasetVersionId,input.reason.trim(),row.content_digest,
       sha256(row.content_digest+":"+input.decision+":"+input.reason.trim())]);
    return {ok:true,value:{datasetVersionId:input.datasetVersionId,decision:input.decision}};
  });
}
