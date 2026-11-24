#!/usr/bin/env node
/** Offline paired smoke comparison; not an authenticated evaluation or release gate. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditRun, gradeCase, hash, parseCases } from './noctis-general-baseline.mjs';

function requireCondition(ok, message) { if (!ok) throw new Error(message); }
function validId(v) { return typeof v === 'string' && v.trim().length > 0; }

function inspect(cases, datasetHash, run) {
  requireCondition(run && Array.isArray(run.results), 'Missing results array');
  auditRun(cases, datasetHash, run); // Recompute integrity and grades; ignore stored summary.
  requireCondition(run.fallback_enabled === false &&
    run.temperature === 0 && run.max_tokens === 256 &&
    run.input_classification === 'public_synthetic_smoke_only' &&
    ['external_api', 'local_service', 'unverified'].includes(run.inference_kind),
    'Unsupported or mismatched v1 run protocol');
  const runnable = cases.filter(c => !c.run_mode);
  requireCondition(runnable.length > 0 && runnable.length <= 25, 'Full runnable cohort must contain 1–25 cases');
  requireCondition(run.results.length === runnable.length &&
    runnable.every((c, i) => run.results[i].id === c.id),
    'Incomplete, reordered or unsupported case coverage');
  const models = new Set();
  for (const row of run.results) {
    requireCondition(row.domain === runnable.find(c => c.id === row.id).domain, 'Domain mismatch');
    requireCondition(Array.isArray(row.tool_calls), 'Invalid tool-call record');
    requireCondition(row.error === null || validId(row.error), 'Invalid error record');
    requireCondition(row.text === null || typeof row.text === 'string', 'Invalid response text');
    if (row.error === null) {
      requireCondition(validId(row.response_model), 'Successful response lacks advertised model');
      requireCondition(validId(row.text) || row.tool_calls.length > 0, 'Empty successful response');
      models.add(row.response_model);
    }
  }
  requireCondition(models.size <= 1, 'Advertised model changed within run');
  return { rows: new Map(run.results.map(row => [row.id, row])),
    provenance: { provider: run.provider, requested_model: run.requested_model,
      advertised_model: [...models][0] ?? null, inference_kind: run.inference_kind } };
}

function outcome(c, row) {
  if (row.error !== null) return 'request_failed';
  if (c.grading.type === 'manual' || c.grading.type === 'tool_trace_manual') return 'requires_independent_review';
  if (row.tool_calls.length > 0) return 'unexpected_tool_proposal';
  return gradeCase(c, row.text).status;
}

export function compareRuns(datasetBytes, baseline, candidate) {
  const cases = parseCases(datasetBytes);
  const datasetHash = hash(datasetBytes);
  const a = inspect(cases, datasetHash, baseline);
  const b = inspect(cases, datasetHash, candidate);
  const counts = { unchanged_pass: 0, unchanged_fail: 0, improved: 0, regressed: 0,
    requires_independent_review: 0, unavailable: 0, not_evaluated: 0 };
  const rows = cases.map(c => {
    let left, right, transition;
    if (c.run_mode) {
      left = right = 'not_evaluated'; transition = 'not_evaluated';
    } else {
      left = outcome(c, a.rows.get(c.id)); right = outcome(c, b.rows.get(c.id));
      if (left === 'pass' && right === 'pass') transition = 'unchanged_pass';
      else if (left === 'fail' && right === 'fail') transition = 'unchanged_fail';
      else if (left === 'fail' && right === 'pass') transition = 'improved';
      else if (left === 'pass' && right === 'fail') transition = 'regressed';
      else if (left === 'requires_independent_review' && right === left) transition = left;
      else transition = 'unavailable';
    }
    counts[transition]++;
    return { id: c.id, domain: c.domain, baseline: left, candidate: right, transition };
  });
  return { schema: 'noctis-paired-smoke-comparison-v1', dataset_sha256: datasetHash,
    baseline: a.provenance, candidate: b.provenance, counts, cases: rows,
    deterministic_pairs: counts.unchanged_pass + counts.unchanged_fail + counts.improved + counts.regressed,
    unresolved_pairs: counts.requires_independent_review + counts.unavailable + counts.not_evaluated,
    artifact_authenticity_verified: false, held_out_validation: false,
    intelligence_score: null, release_gate: 'not_established' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const paths = process.argv.slice(2);
    requireCondition(paths.length === 3, 'Usage: node scripts/noctis-compare-baselines.mjs CASES.jsonl BASELINE.json CANDIDATE.json');
    const [dataset, base, next] = paths;
    const report = compareRuns(readFileSync(dataset),
      JSON.parse(readFileSync(base, 'utf8')), JSON.parse(readFileSync(next, 'utf8')));
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    console.error('Paired baseline comparison rejected: ' + err.message);
    process.exitCode = 1;
  }
}
