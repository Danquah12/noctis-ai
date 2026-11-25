import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hash, parseCases, runLive } from './noctis-general-baseline.mjs';
import { prepareReview, validateReview } from './noctis-review-smoke.mjs';

const data=readFileSync(new URL('../data/noctis-general-smoke-v1.jsonl',import.meta.url));
const cases=parseCases(data);
async function fixture(opts={}) {
  let i=0;
  return runLive({cases,datasetHash:hash(data),endpoint:'http://localhost:8000/v1/chat/completions',
    provider:'mock-only',model:'mock-model',inferenceKind:'local_service',maxRequests:8,
    fetchImpl:async()=>{
      const n=i++;
      if(n===opts.errorAt)return {ok:false,status:503};
      return {ok:true,json:async()=>({model:'mock-model',choices:[{message:{content:'synthetic test response'}}]})};
    }});
}
function receipt(packet,id='CONV-001') {
  const row=packet.rows.find(r=>r.id===id);
  return {schema:'noctis-public-smoke-review-receipt-v1',packet_sha256:packet.packet_sha256,rows:[
    {id,response_sha256:row.response_sha256,reviewer_ref:'mock-reviewer',qualification:row.qualification,
      independent_of_model:true,outcomes:Object.fromEntries(Object.keys(row.criteria).map(k=>[k,
        {verdict:'not_assessable',rationale:'Synthetic test only; not real adjudication.'}]))}
  ]};
}
test('packet binds six manual cases, does not include vision or provider/model fields',async()=>{
  const run=await fixture(),packet=prepareReview(data,run);
  assert.equal(packet.rows.length,6);
  assert.equal(packet.rows.some(r=>r.id==='VISION-001'),false);
  assert.equal(packet.provider,undefined);assert.equal(packet.requested_model,undefined);
  assert.equal(packet.packet_sha256.length,64);
  assert.equal(packet.rows.find(r=>r.id==='HEALTH-001').qualification,'clinical');
});
test('partial review preserves unresolved cases and never certifies intelligence or reviewer identity',async()=>{
  const run=await fixture(),packet=prepareReview(data,run);
  const summary=validateReview(data,run,receipt(packet));
  assert.deepEqual(summary.reviewed_cases,['CONV-001']);
  assert.equal(summary.unresolved_cases.length,5);
  assert.deepEqual(summary.criterion_counts,{met:0,not_met:0,not_assessable:2});
  assert.equal(summary.reviewer_identity_verified,false);
  assert.equal(summary.actual_tool_execution_verified,false);
  assert.equal(summary.held_out_validation,false);
  assert.equal(summary.intelligence_score,null);
});
test('changed response, stale packet or changed dataset fail closed',async()=>{
  const run=await fixture(),packet=prepareReview(data,run),rec=receipt(packet);
  rec.rows[0].response_sha256='0'.repeat(64);
  assert.throws(()=>validateReview(data,run,rec),/response mismatch/);
  rec.packet_sha256='0'.repeat(64);
  assert.throws(()=>validateReview(data,run,rec),/packet mismatch/);
  const changed=Buffer.concat([data,Buffer.from('\n')]);
  assert.throws(()=>prepareReview(changed,{...run,dataset_sha256:hash(changed)}),/pinned public/);
  run.results[0].text='changed';
  assert.throws(()=>prepareReview(data,run),/Response hash mismatch/);
});
test('reject duplicate, unknown and missing review criteria',async()=>{
  const run=await fixture(),packet=prepareReview(data,run),rec=receipt(packet);
  rec.rows.push({...rec.rows[0]});
  assert.throws(()=>validateReview(data,run,rec),/duplicate/);
  rec.rows.pop(); rec.rows[0].id='VISION-001';
  assert.throws(()=>validateReview(data,run,rec),/Unknown/);
  rec.rows[0].id='CONV-001';delete rec.rows[0].outcomes.concise;
  assert.throws(()=>validateReview(data,run,rec),/Incomplete/);
});
test('reject missing clinical qualification and model self-review',async()=>{
  const run=await fixture(),packet=prepareReview(data,run),rec=receipt(packet,'HEALTH-001');
  rec.rows[0].qualification='general';
  assert.throws(()=>validateReview(data,run,rec),/qualification/);
  rec.rows[0].qualification='clinical';rec.rows[0].independent_of_model=false;
  assert.throws(()=>validateReview(data,run,rec),/qualification/);
});
test('request errors stay unavailable, cannot be credited by review',async()=>{
  const run=await fixture({errorAt:0}),packet=prepareReview(data,run);
  assert.equal(packet.rows[0].availability,'unavailable');
  assert.throws(()=>validateReview(data,run,receipt(packet)),/missing response/);
});
test('reject invalid verdict and empty rationale',async()=>{
  const run=await fixture(),packet=prepareReview(data,run),rec=receipt(packet);
  rec.rows[0].outcomes.concise.verdict='pass';
  assert.throws(()=>validateReview(data,run,rec),/invalid criterion/);
  rec.rows[0].outcomes.concise.verdict='met';rec.rows[0].outcomes.concise.rationale=' ';
  assert.throws(()=>validateReview(data,run,rec),/invalid criterion/);
});
