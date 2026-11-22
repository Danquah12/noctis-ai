#!/usr/bin/env node
/**
 * Noctis general-assistant live-model baseline (opt-in, no dependencies).
 * This is an inference evaluator, NOT a model trainer, benchmark certification,
 * retrieval validation, or proof that model weights belong to Noctis.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export const DOMAINS = new Set([
  'conversation', 'instruction_following', 'reasoning_math', 'coding',
  'research_citations', 'tool_use', 'specialist_cyber', 'specialist_health',
  'multimodal_vision',
]);
const ROLES = new Set(['system', 'user', 'assistant']);
const GRADERS = new Set(['exact', 'json_exact', 'manual', 'tool_trace_manual']);
const sha = (v) => createHash('sha256').update(v).digest('hex');
export const hash = sha;
const validString = (v) => typeof v === 'string' && v.trim().length > 0;
const fail = (reason) => { throw new Error(reason); };

export function parseCases(bytes) {
  const content = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  const rows = content.split(/\r?\n/).filter((line) => line.trim());
  if (!rows.length || rows.length > 100) fail('Case count must be between 1 and 100');
  const ids = new Set();
  const cases = rows.map((line) => {
    const c = JSON.parse(line);
    if (!c || !/^[A-Z][A-Z0-9_-]{2,39}$/.test(c.id || '') || ids.has(c.id)) fail('Invalid or duplicate case ID');
    ids.add(c.id);
    if (!DOMAINS.has(c.domain)) fail(`Unsupported domain for ${c.id}`);
    if (c.data_policy !== 'synthetic_public_no_personal_data') fail(`Missing public synthetic data designation for ${c.id}`);
    if (!Array.isArray(c.messages) || !c.messages.length || c.messages.length > 12 ||
        c.messages.some((m) => !ROLES.has(m?.role) || !validString(m.content) || m.content.length > 8000)) {
      fail(`Invalid bounded chat messages for ${c.id}`);
    }
    const g = c.grading;
    if (!g || !GRADERS.has(g.type)) fail(`Invalid grader for ${c.id}`);
    if (g.type === 'exact' && !validString(g.expected)) fail(`Missing exact reference for ${c.id}`);
    if (g.type === 'json_exact' && (!g.expected || typeof g.expected !== 'object' || Array.isArray(g.expected))) fail(`Missing JSON reference for ${c.id}`);
    if (c.domain === 'research_citations' && g.type !== 'manual') fail('Research citation support requires independent review');
    if (c.domain === 'specialist_health' && g.type !== 'manual') fail('Clinical safety requires qualified independent review');
    if (c.domain === 'tool_use' && g.type !== 'tool_trace_manual') fail('Tool use requires trace review');
    if (c.tools && (!Array.isArray(c.tools) || c.tools.length > 4 ||
        c.tools.some((t) => t.type !== 'function' || !validString(t.function?.name) ||
          !t.function?.parameters || typeof t.function.parameters !== 'object'))) fail('Invalid tool declarations');
    if (c.domain === 'multimodal_vision' && c.run_mode !== 'not_supported_by_text_harness') fail('Vision must be explicitly marked untested');
    if (c.run_mode && c.run_mode !== 'not_supported_by_text_harness') fail('Unsupported run_mode');
    return c;
  });
  return cases;
}

/** Never infer a deployed weight owner from a client-supplied model name. */
export function validateEndpoint(input, allowRemote = false) {
  const url = new URL(input);
  if (url.username || url.password || url.search || url.hash) fail('Endpoint must not embed credentials, query or fragments');
  if (!url.pathname.endsWith('/chat/completions')) fail('Endpoint must end with /chat/completions');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!local && (!allowRemote || url.protocol !== 'https:')) fail('Remote model access requires explicit opt-in and HTTPS');
  if (local && !['http:', 'https:'].includes(url.protocol)) fail('Unsupported local URL protocol');
  return url.toString();
}

export function gradeCase(testCase, response) {
  const type = testCase.grading.type;
  if (!validString(response)) return {status: 'missing_response'};
  if (type === 'manual' || type === 'tool_trace_manual') return {status: 'requires_independent_review'};
  if (type === 'exact') return {status: response.trim() === testCase.grading.expected.trim() ? 'pass' : 'fail'};
  try {
    const actual = JSON.parse(response);
    const expected = testCase.grading.expected;
    return {status: isDeepStrictEqual(actual, expected) ? 'pass' : 'fail'};
  } catch { return {status: 'fail'}; }
}

export function auditRun(cases, datasetHash, artifact) {
  if (!artifact || artifact.schema !== 'noctis-general-live-baseline-v1' || artifact.dataset_sha256 !== datasetHash) {
    fail('Run schema/dataset hash mismatch');
  }
  if (!validString(artifact.provider) || !validString(artifact.requested_model) || !validString(artifact.inference_kind)) {
    fail('Provider/model provenance required');
  }
  const caseById = new Map(cases.map((c) => [c.id, c]));
  const seen = new Set();
  const stats = {pass: 0, fail: 0, requires_independent_review: 0, missing_response: 0, not_evaluated: 0};
  for (const row of artifact.results || []) {
    if (!caseById.has(row.id) || seen.has(row.id)) fail('Unexpected or duplicate response ID');
    seen.add(row.id);
    const c = caseById.get(row.id);
    if (row.request_sha256 !== sha(JSON.stringify(c.messages))) fail(`Prompt hash mismatch for ${row.id}`);
    const responseFingerprint = sha(JSON.stringify({response_model: row.response_model, text: row.text,
      tool_calls: row.tool_calls, error: row.error}));
    if (row.response_sha256 !== responseFingerprint) fail(`Response hash mismatch for ${row.id}`);
    const status = row.error ? 'missing_response' :
      (c.domain === 'tool_use' && row.tool_calls?.length ? 'requires_independent_review' : gradeCase(c, row.text).status);
    stats[status]++;
  }
  for (const c of cases) if (!seen.has(c.id)) stats.not_evaluated++;
  return {
    dataset_sha256: datasetHash,
    provider: artifact.provider,
    requested_model: artifact.requested_model,
    inference_kind: artifact.inference_kind,
    cases: cases.length,
    ...stats,
    deterministic_scored: stats.pass + stats.fail,
    // Never produce a composite intelligence score from a small public smoke fixture.
    intelligence_score: null,
    held_out_validation: false,
    release_gate: 'not_established',
  };
}

export async function runLive({cases, datasetHash, endpoint, allowRemote = false, provider, model,
  inferenceKind, maxRequests, apiKey = '', fetchImpl = fetch}) {
  validateEndpoint(endpoint, allowRemote);
  if (!validString(provider) || !validString(model) || !['external_api', 'local_service', 'unverified'].includes(inferenceKind)) fail('Explicit provider, model, and inference kind required');
  if (!Number.isSafeInteger(maxRequests) || maxRequests < 1 || maxRequests > 25) fail('Set maxRequests between 1 and 25');
  const runnable = cases.filter((c) => c.run_mode !== 'not_supported_by_text_harness').slice(0, maxRequests);
  const artifact = {
    schema: 'noctis-general-live-baseline-v1',
    created_utc: new Date().toISOString(), dataset_sha256: datasetHash,
    provider, requested_model: model, inference_kind: inferenceKind,
    adapter_checkpoint_verified: false, input_classification: 'public_synthetic_smoke_only',
    fallback_enabled: false, temperature: 0, max_tokens: 256,
    results: [],
  };
  const target = validateEndpoint(endpoint, allowRemote);
  for (const c of runnable) {
    const begun = Date.now();
    const row = {id: c.id, domain: c.domain, request_sha256: sha(JSON.stringify(c.messages)),
      response_model: null, latency_ms: null, text: null, tool_calls: [], error: null, response_sha256: null};
    try {
      const res = await fetchImpl(target, {method: 'POST', redirect: 'error',
        headers: {'Content-Type': 'application/json', ...(apiKey ? {Authorization: `Bearer ${apiKey}`} : {})},
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({model, messages: c.messages, temperature: 0, max_tokens: 256,
          ...(c.tools ? {tools: c.tools, tool_choice: 'auto'} : {})})});
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const data = await res.json();
      const message = data?.choices?.[0]?.message;
      row.response_model = validString(data?.model) ? data.model : null;
      row.text = typeof message?.content === 'string' ? message.content : null;
      row.tool_calls = Array.isArray(message?.tool_calls)
        ? message.tool_calls.map((tool) => ({type: tool.type, name: tool.function?.name || null,
          // Never execute tool calls. Raw arguments require separate review.
          arguments_sha256: sha(String(tool.function?.arguments ?? ''))})) : [];
      if (!row.text && !row.tool_calls.length) throw new Error('EMPTY_MODEL_RESPONSE');
    } catch (err) {
      // Do not copy server response bodies, secrets, or endpoint details to artifacts.
      row.error = /^HTTP_\d{3}$/.test(err.message) ? err.message : 'REQUEST_OR_RESPONSE_FAILED';
    }
    row.latency_ms = Date.now() - begun;
    row.response_sha256 = sha(JSON.stringify({response_model: row.response_model, text: row.text,
      tool_calls: row.tool_calls, error: row.error}));
    artifact.results.push(row);
  }
  artifact.summary = auditRun(cases, datasetHash, artifact);
  return artifact;
}

export function parseCli(argv) {
  const flags = new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) fail(`Unknown positional argument ${arg}`);
    const key = arg.slice(2);
    if (flags.has(key)) fail(`Duplicate option ${key}`);
    if (['execute-live', 'allow-remote', 'authorize-public-prompts'].includes(key)) flags.set(key, true);
    else { if (!argv[i + 1] || argv[i + 1].startsWith('--')) fail(`Missing value for ${key}`); flags.set(key, argv[++i]); }
  }
  const allowed = new Set(['mode', 'cases', 'responses', 'endpoint', 'provider', 'model', 'inference-kind',
    'max-requests', 'output', 'execute-live', 'allow-remote', 'authorize-public-prompts']);
  for (const k of flags.keys()) if (!allowed.has(k)) fail(`Unrecognized option ${k}`);
  return flags;
}

export async function main(argv) {
  const f = parseCli(argv);
  const mode = f.get('mode') || 'inspect';
  if (!['inspect', 'score-file', 'live'].includes(mode)) fail('mode must be inspect, score-file or live');
  const file = resolve(f.get('cases') || 'data/noctis-general-smoke-v1.jsonl');
  const bytes = readFileSync(file);
  const cases = parseCases(bytes);
  const datasetHash = sha(bytes);
  if (mode === 'inspect') {
    console.log(JSON.stringify({dataset_sha256: datasetHash, cases: cases.length,
      by_domain: Object.fromEntries([...DOMAINS].map((d) => [d, cases.filter((c) => c.domain === d).length])),
      evidence: 'public synthetic smoke fixture; no provider call; no model evaluation'}, null, 2));
    return;
  }
  if (mode === 'score-file') {
    if (!f.get('responses')) fail('--responses required for score-file');
    const artifact = JSON.parse(readFileSync(resolve(f.get('responses')), 'utf8'));
    console.log(JSON.stringify(auditRun(cases, datasetHash, artifact), null, 2));
    return;
  }
  if (!f.get('execute-live') || !f.get('authorize-public-prompts')) fail('Live mode requires --execute-live and --authorize-public-prompts');
  for (const name of ['endpoint', 'model', 'provider', 'inference-kind', 'max-requests', 'output']) if (!f.get(name)) fail(`Live mode requires --${name}`);
  const output = resolve(f.get('output'));
  if (existsSync(output)) fail('Refusing to overwrite an existing baseline artifact');
  const artifact = await runLive({cases, datasetHash, endpoint: f.get('endpoint'),
    allowRemote: !!f.get('allow-remote'), provider: f.get('provider'), model: f.get('model'),
    inferenceKind: f.get('inference-kind'), maxRequests: Number(f.get('max-requests')),
    apiKey: process.env.NOCTIS_BASELINE_API_KEY || ''});
  mkdirSync(dirname(output), {recursive: true, mode: 0o700});
  writeFileSync(output, JSON.stringify(artifact, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify({artifact_path: output, ...artifact.summary}, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => { console.error(`Noctis baseline: ${err.message}`); process.exitCode = 1; });
}
