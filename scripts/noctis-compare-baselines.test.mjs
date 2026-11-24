import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCases, hash, runLive } from './noctis-general-baseline.mjs';
import { compareRuns } from './noctis-compare-baselines.mjs';

const bytes = readFileSync(new URL('../data/noctis-general-smoke-v1.jsonl', import.meta.url));
const cases = parseCases(bytes);
const datasetHash = hash(bytes);
const fixture = async (name, math, json, opts = {}) => {
  let n = 0;
  return runLive({ cases, datasetHash, endpoint: 'http://localhost:8000/v1/chat/completions',
    provider: 'mock-test-only', model: name, inferenceKind: 'local_service',
    maxRequests: opts.maxRequests ?? 8,
    fetchImpl: async () => {
      const i = n++;
      if (opts.errorAt === i) return {ok:false,status:503};
      return {ok:true,json:async () => ({model:opts.switchAt === i ? 'other' : name,
        choices:[{message:{content:i===1 ? json : i===2 ? math : 'mock response'}}]})};
    }});
};
const good = () => fixture('base','391','{"alpha":1,"beta":2}');
function reseal(row) {
  row.response_sha256 = hash(JSON.stringify({response_model:row.response_model,text:row.text,
    tool_calls:row.tool_calls,error:row.error}));
}
test('pairs deterministic changes and leaves all other capabilities unresolved', async () => {
  const a=await fixture('base','0','{"alpha":1,"beta":2}');
  const b=await fixture('candidate','391','{}');
  b.summary={pass:999};
  const r=compareRuns(bytes,a,b);
  assert.deepEqual(r.counts,{unchanged_pass:0,unchanged_fail:0,improved:1,regressed:1,
    requires_independent_review:6,unavailable:0,not_evaluated:1});
  assert.equal(r.deterministic_pairs,2);
  assert.equal(r.unresolved_pairs,7);
  assert.equal(r.intelligence_score,null);
  assert.equal(r.held_out_validation,false);
  assert.equal(r.artifact_authenticity_verified,false);
  assert.equal(r.release_gate,'not_established');
});
test('identical valid fixtures produce two unchanged passes', async () => {
  const a=await good();
  assert.equal(compareRuns(bytes,a,a).counts.unchanged_pass,2);
});
test('failed transport is not a model regression or pass', async () => {
  const a=await good(), b=await fixture('candidate','391','{"alpha":1,"beta":2}',{errorAt:2});
  const r=compareRuns(bytes,a,b);
  assert.equal(r.counts.unavailable,1); assert.equal(r.counts.regressed,0);
  assert.equal(r.deterministic_pairs,1);
});
test('reject partial runs even when both are identically partial', async () => {
  const a=await fixture('base','391','{}',{maxRequests:2});
  assert.throws(()=>compareRuns(bytes,a,a),/coverage/);
});
test('reject reordered responses', async () => {
  const a=await good(), b=structuredClone(a);
  b.results.reverse();
  assert.throws(()=>compareRuns(bytes,a,b),/coverage/);
});
test('reject dataset mismatch and modified responses', async () => {
  const a=await good(), b=structuredClone(a);
  assert.throws(()=>compareRuns(Buffer.concat([bytes,Buffer.from('\n')]),a,b),/hash mismatch/);
  b.results[2].text='999';
  assert.throws(()=>compareRuns(bytes,a,b),/Response hash mismatch/);
});
test('reject fallback and mismatched generation settings', async () => {
  const a=await good();
  for(const change of [{fallback_enabled:true},{temperature:1},{max_tokens:512},{inference_kind:'unknown'}])
    assert.throws(()=>compareRuns(bytes,a,{...a,...change}),/protocol/);
});
test('reject missing or drifting advertised identity', async () => {
  const a=await good(), b=await fixture('candidate','391','{}',{switchAt:2});
  assert.throws(()=>compareRuns(bytes,a,b),/model changed/);
  const c=structuredClone(a); c.results[0].response_model=null; reseal(c.results[0]);
  assert.throws(()=>compareRuns(bytes,a,c),/lacks advertised model/);
});
test('reject domain relabel and do not credit unexpected tool proposals', async () => {
  const a=await good(), b=structuredClone(a);
  b.results[2].domain='conversation';
  assert.throws(()=>compareRuns(bytes,a,b),/Domain mismatch/);
  b.results[2].domain='reasoning_math'; b.results[2].tool_calls=[{type:'function',name:'multiply',arguments_sha256:hash('{}')}]; reseal(b.results[2]);
  assert.equal(compareRuns(bytes,a,b).counts.unavailable,1);
});
