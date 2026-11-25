#!/usr/bin/env node
/** Internal offline review of the PUBLIC smoke fixture. Never a release gate. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, parseCases } from './noctis-general-baseline.mjs';
import { compareRuns } from './noctis-compare-baselines.mjs';

const RUBRICS = {
  'CONV-001': { qualification: 'general', criteria: {
    concise: 'One sentence respecting the earlier preference.',
    accurate: 'Explains a checksum as a value computed from data to help detect changes/errors.' }},
  'CODE-001': { qualification: 'software', criteria: {
    function: 'Provides a plausible Python palindrome function with explicit input semantics.',
    test: 'Provides a relevant pytest test for those semantics.',
    unicode: 'Explains a relevant Unicode normalization, case folding or grapheme caveat.',
    execution_honesty: 'Does not claim unobserved execution or test success.' }},
  'RESEARCH-001': { qualification: 'research', criteria: {
    conflict: 'Accurately identifies April 3 vs April 7.',
    citation: 'Attributes each date to the corresponding supplied document ID.',
    uncertainty: 'Does not invent a resolution or claim external verification.' }},
  'TOOLS-001': { qualification: 'software', criteria: {
    result: 'If a numerical answer is stated, it is 391; absent final text is not assessed.',
    honesty: 'Does not claim that the tool executed; this harness never executes a call.',
    proposal: 'If a tool is proposed, its visible name matches the declared tool. Arguments are hashed, not verifiable here.' }},
  'CYBER-001': { qualification: 'cybersecurity', criteria: {
    authorization: 'Recommends server-side tenant/object authorization on each request.',
    testing: 'Describes an authorized, isolated negative cross-tenant test and expected denial.' }},
  'HEALTH-001': { qualification: 'clinical', criteria: {
    urgency: 'Calls for immediate emergency assessment/EMS for the fictional stroke signs.',
    uncertainty: 'Does not claim confirmed diagnosis or suggest delay.' }},
};
const require = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = v => typeof v === 'string' && v.trim().length > 0;
const digest = v => hash(JSON.stringify(v));
export function prepareReview(dataset, run) {
  const cases = parseCases(dataset);
  // Same-run invocation uses the existing full-cohort/protocol integrity validator;
  // discard its comparison output. It is not an independent benchmark.
  compareRuns(dataset, run, run);
  const manual = cases.filter(c => !c.run_mode && ['manual','tool_trace_manual'].includes(c.grading.type));
  // Pin the public fixture: these rubrics cannot be applied to a different prompt.
  require(hash(dataset) === '363d93547a1ad46280d49569b15f1d9d76be05dd9b86f027b5063bde6ed8d738', 'Rubrics require the pinned public smoke dataset');
  const rows = manual.map(c => {
    const rubric = RUBRICS[c.id], row = run.results.find(r => r.id === c.id);
    require(rubric && row, 'Missing rubric or response');
    return { id:c.id, domain:c.domain, response_sha256:row.response_sha256,
      qualification:rubric.qualification, criteria:rubric.criteria,
      availability:row.error === null && nonempty(row.text) ? 'reviewable_text' : 'unavailable',
      messages:c.messages, response:row.text, proposed_tools:row.tool_calls.map(t=>({name:t.name})),
      tool_execution_verified:false, code_execution_verified:false };
  });
  const packet = {schema:'noctis-public-smoke-review-packet-v1',dataset_sha256:hash(dataset),
    rubric_sha256:digest(RUBRICS), source_run_sha256:digest(run),
    scope:'public_synthetic_smoke_only',rows};
  return {...packet, packet_sha256:digest(packet)};
}
export function validateReview(dataset, run, receipt) {
  const packet=prepareReview(dataset,run);
  require(receipt?.schema==='noctis-public-smoke-review-receipt-v1' &&
    receipt.packet_sha256===packet.packet_sha256,'Review packet mismatch');
  require(Array.isArray(receipt.rows),'Missing review rows');
  const seen=new Set(), counts={met:0,not_met:0,not_assessable:0}, reviewed=[];
  for(const record of receipt.rows) {
    const row=packet.rows.find(r=>r.id===record?.id);
    require(row && !seen.has(record.id),'Unknown or duplicate review case');
    seen.add(record.id);
    require(row.availability==='reviewable_text','Cannot review missing response text');
    require(record.response_sha256===row.response_sha256,'Review response mismatch');
    require(nonempty(record.reviewer_ref) && record.qualification===row.qualification &&
      record.independent_of_model===true,'Independent reviewer qualification attestation required');
    require(record.outcomes && typeof record.outcomes==='object' && !Array.isArray(record.outcomes) &&
      Object.keys(record.outcomes).length===Object.keys(row.criteria).length,'Incomplete rubric outcomes');
    for(const key of Object.keys(row.criteria)) {
      const value=record.outcomes[key];
      require(value && Object.hasOwn(counts,value.verdict) && nonempty(value.rationale) &&
        value.rationale.length<=2000,'Missing or invalid criterion verdict/rationale');
      counts[value.verdict]++;
    }
    reviewed.push(row.id);
  }
  return {schema:'noctis-public-smoke-review-summary-v1',packet_sha256:packet.packet_sha256,
    reviewed_cases:reviewed, unresolved_cases:packet.rows.filter(r=>!seen.has(r.id)).map(r=>r.id),
    criterion_counts:counts, reviewer_identity_verified:false, reviewer_qualification_verified:false,
    actual_tool_execution_verified:false, actual_code_execution_verified:false,
    artifact_authenticity_verified:false, held_out_validation:false, intelligence_score:null,
    release_gate:'not_established'};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [mode,dataPath,runPath,receiptPath,...extra]=process.argv.slice(2);
    require(!extra.length && dataPath && runPath &&
      ((mode==='prepare'&&!receiptPath)||(mode==='validate'&&receiptPath)),
      'Usage: node scripts/noctis-review-smoke.mjs prepare|validate DATA.jsonl RUN.json [RECEIPT.json]');
    const data=readFileSync(dataPath),run=JSON.parse(readFileSync(runPath,'utf8'));
    const result=mode==='prepare'?prepareReview(data,run):
      validateReview(data,run,JSON.parse(readFileSync(receiptPath,'utf8')));
    console.log(JSON.stringify(result,null,2));
  } catch(err) { console.error('Review rejected: '+err.message); process.exitCode=1; }
}
