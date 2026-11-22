import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {parseCases, validateEndpoint, gradeCase, auditRun, runLive, parseCli, hash} from './noctis-general-baseline.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const bytes = readFileSync(resolve(root, '../data/noctis-general-smoke-v1.jsonl'));
const cases = parseCases(bytes);
const digest = hash(bytes);

test('public synthetic suite covers general skills, specialists and explicitly untested vision', () => {
  assert.equal(cases.length, 9);
  assert.equal(cases.filter((c) => c.run_mode).length, 1);
  assert.ok(cases.some((c) => c.domain === 'conversation'));
});
test('bad/duplicate records fail closed', () => {
  assert.throws(() => parseCases(`${bytes.toString()}\n${bytes.toString().split('\n')[0]}`), /duplicate/);
  assert.throws(() => parseCases(JSON.stringify({...cases[0], data_policy:'private_record'})), /synthetic/);
  assert.throws(() => parseCases(JSON.stringify({...cases[7], grading:{type:'exact', expected:'safe'}})), /Clinical/);
});
test('remote access requires explicit permission and secure URL', () => {
  assert.equal(validateEndpoint('http://127.0.0.1:8000/v1/chat/completions'), 'http://127.0.0.1:8000/v1/chat/completions');
  assert.throws(() => validateEndpoint('https://example.org/v1/chat/completions'), /opt-in/);
  assert.throws(() => validateEndpoint('http://example.org/v1/chat/completions', true), /HTTPS/);
  assert.throws(() => validateEndpoint('https://user:pw@example.org/v1/chat/completions', true), /credentials/);
  assert.throws(() => validateEndpoint('https://example.org/v1/chat/completions?token=secret', true), /credentials/);
});
test('deterministic checks score only their actual response', () => {
  assert.equal(gradeCase(cases[1], '{"beta":2,"alpha":1}').status, 'pass');
  assert.equal(gradeCase(cases[1], '{"beta":3,"alpha":1}').status, 'fail');
  assert.equal(gradeCase(cases[2], '391').status, 'pass');
  assert.equal(gradeCase(cases[2], '392').status, 'fail');
  assert.equal(gradeCase(cases[4], 'citation X').status, 'requires_independent_review');
  assert.equal(gradeCase(cases[5], 'I used a tool').status, 'requires_independent_review');
});
test('offline mocked local inference records exact provider and no fallback or tool execution', async () => {
  let count=0;
  const fetchImpl = async (_url, opt) => {
    count++;
    assert.equal(JSON.parse(opt.body).model, 'local-test-v1');
    assert.equal(opt.redirect, 'error');
    assert.ok(!opt.headers.Authorization);
    return {ok:true, json:async()=>({model:'returned-name', choices:[{message:{content:'391'}}]})};
  };
  const artifact = await runLive({cases,datasetHash:digest,endpoint:'http://localhost:8000/v1/chat/completions',
    provider:'local-smoke',model:'local-test-v1',inferenceKind:'local_service',maxRequests:3,fetchImpl});
  assert.equal(count, 3);
  assert.equal(artifact.summary.deterministic_scored, 2);
  assert.equal(artifact.summary.intelligence_score, null);
  assert.equal(artifact.summary.not_evaluated, 6);
  assert.equal(artifact.fallback_enabled, false);
  assert.equal(artifact.results[0].response_model, 'returned-name');
  assert.equal(artifact.results[0].tool_calls.length, 0);
  assert.equal(artifact.results[0].response_sha256.length, 64);
});
test('audit rejects changed dataset and replayed/unknown/misbound prompts', async () => {
  const artifact=await runLive({cases,datasetHash:digest,endpoint:'http://localhost:8000/v1/chat/completions',
    provider:'local-smoke',model:'local-test-v1',inferenceKind:'local_service',maxRequests:1,
    fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:'fine'}}]})})});
  assert.throws(()=>auditRun(cases,'0'.repeat(64),artifact),/hash mismatch/);
  artifact.results.push({...artifact.results[0]});
  assert.throws(()=>auditRun(cases,digest,artifact),/duplicate/);
  artifact.results.pop();
  artifact.results[0].request_sha256='0'.repeat(64);
  assert.throws(()=>auditRun(cases,digest,artifact),/Prompt hash mismatch/);
  artifact.results[0].request_sha256=hash(JSON.stringify(cases[0].messages));
  artifact.results[0].text = 'tampered';
  assert.throws(()=>auditRun(cases,digest,artifact),/Response hash mismatch/);
});
test('failed provider response is not silently replaced by another model', async () => {
  const artifact=await runLive({cases,datasetHash:digest,endpoint:'http://localhost:8000/v1/chat/completions',
    provider:'local-smoke',model:'local-test-v1',inferenceKind:'local_service',maxRequests:1,
    fetchImpl:async()=>({ok:false,status:503})});
  assert.equal(artifact.results[0].error,'HTTP_503');
  assert.equal(artifact.results[0].text,null);
  assert.equal(artifact.summary.missing_response,1);
});
test('tool requests are captured but never executed', async () => {
  let executed=false;
  const artifact=await runLive({cases:[cases[5]],datasetHash:digest,endpoint:'http://localhost:8000/v1/chat/completions',
    provider:'test',model:'test',inferenceKind:'local_service',maxRequests:1,
    fetchImpl:async (_url, opt)=>{
      assert.equal(JSON.parse(opt.body).tools[0].function.name,'multiply');
      return {ok:true,json:async()=>({choices:[{message:{content:null,tool_calls:[{type:'function',function:{name:'multiply',arguments:'{"a":23,"b":17}'}}]}}]})};
    }});
  assert.equal(executed,false);
  assert.equal(artifact.results[0].tool_calls[0].name,'multiply');
  assert.equal(artifact.results[0].tool_calls[0].arguments_sha256.length,64);
  assert.equal(artifact.summary.requires_independent_review,1);
});
test('CLI rejects unknown or duplicate controls', () => {
  assert.throws(()=>parseCli(['--bogus','1']),/Unrecognized/);
  assert.throws(()=>parseCli(['--mode','live','--mode','inspect']),/Duplicate/);
});
