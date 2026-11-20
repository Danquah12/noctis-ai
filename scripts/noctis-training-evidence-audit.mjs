#!/usr/bin/env node
/** Offline artifact-integrity and response-coverage audit, NOT proof of GPU training. */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, lstatSync, readFileSync } from 'node:fs';
import { resolve, relative, isAbsolute, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const EXPECTED = [
  'models/noctis-7b-v2.0-adapter/adapter_model.safetensors',
  'models/noctis-7b-v2.0-adapter/adapter_config.json',
  'data/noctis-baseline-qwen7b-responses.jsonl',
  'data/noctis-trained-qwen7b-v2-responses.jsonl',
];
const CASES = 'data/noctis-cot-validation-250.jsonl';
const checksum = async path => new Promise((resolveHash, reject) => {
  const h = createHash('sha256');
  const stream = createReadStream(path);
  stream.on('data', bytes => h.update(bytes));
  stream.on('error', reject);
  stream.on('end', () => resolveHash(h.digest('hex')));
});

function safeFile(root, name) {
  const path = resolve(root, name);
  const rel = relative(root, path);
  if (rel.startsWith('..') || isAbsolute(rel)) throw Error('path_outside_root');
  let cursor = root;
  for (const part of name.split('/')) {
    cursor = join(cursor, part);
    if (!existsSync(cursor)) return null;
    if (lstatSync(cursor).isSymbolicLink()) throw Error('symlink_not_allowed');
  }
  if (!lstatSync(path).isFile()) throw Error('not_regular_file');
  return path;
}
function idsFor(path) {
  const ids = new Set();
  let count = 0;
  const rows = readFileSync(path, 'utf8').split('\n');
  for (const row of rows) {
    if (!row.trim()) continue;
    const record = JSON.parse(row);
    if (!record || typeof record.id !== 'string' || !record.id || ids.has(record.id)) throw Error('invalid_or_duplicate_case_id');
    ids.add(record.id);
    count++;
  }
  return { ids, count };
}
const sameIds = (a, b) => a.size === b.size && [...a].every(id => b.has(id));

export async function auditTrainingEvidence(rootPath) {
  const root = resolve(rootPath);
  const findings = [];
  const checked = {};
  const manifestPath = safeFile(root, 'deliverables/CHECKSUMS-PHASE2.sha256');
  if (!manifestPath) return { status: 'incomplete', findings: ['missing_checksum_manifest'], artifacts: {}, note: 'No evidence of training, model quality or genuine live inference is established.' };
  const lines = readFileSync(manifestPath, 'utf8').split('\n').filter(x => x.trim());
  const listed = new Map();
  for (const line of lines) {
    const m = /^([a-f0-9]{64})  (\S+)$/.exec(line);
    if (!m || !EXPECTED.includes(m[2]) || listed.has(m[2])) throw Error('invalid_or_unexpected_checksum_manifest_entry');
    listed.set(m[2], m[1]);
  }
  for (const name of EXPECTED) {
    if (!listed.has(name)) { findings.push(`unlisted:${name}`); continue; }
    const file = safeFile(root, name);
    if (!file) { findings.push(`missing:${name}`); continue; }
    const actual = await checksum(file);
    const match = actual === listed.get(name);
    checked[name] = { sha256_match: match };
    if (!match) findings.push(`checksum_mismatch:${name}`);
  }
  const benchmark = safeFile(root, CASES);
  if (!benchmark) findings.push(`missing:${CASES}`);
  else {
    const ref = idsFor(benchmark);
    checked[CASES] = { case_count: ref.count, sha256: await checksum(benchmark), committed_benchmark_lock: false };
    if (ref.count !== 250) findings.push('benchmark_case_count_not_250');
    for (const name of EXPECTED.slice(2)) {
      const file = safeFile(root, name);
      if (!file || checked[name]?.sha256_match !== true) continue;
      const responses = idsFor(file);
      checked[name] = { ...(checked[name] || {}), response_count: responses.count, case_id_coverage_match: sameIds(ref.ids, responses.ids) };
      if (!sameIds(ref.ids, responses.ids)) findings.push(`case_id_coverage_mismatch:${name}`);
    }
  }
  return {
    status: findings.length ? 'incomplete' : 'file_integrity_and_coverage_only',
    findings, artifacts: checked,
    note: 'Matching hashes and case IDs do not prove the adapter was trained, that responses came from it, true held-out isolation, independent grading, license authorization, or an improvement in intelligence.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--root' || !args[1])) {
    console.error('Usage: node scripts/noctis-training-evidence-audit.mjs [--root <checkout>]');
    process.exitCode = 2;
  } else {
    try {
      const root = args.length ? args[1] : resolve(dirname(fileURLToPath(import.meta.url)), '..');
      const result = await auditTrainingEvidence(root);
      console.log(JSON.stringify(result, null, 2));
      if (result.status === 'incomplete') process.exitCode = 2;
    } catch (error) {
      console.error(JSON.stringify({ status: 'invalid_evidence', code: error.message || 'audit_error' }));
      process.exitCode = 2;
    }
  }
}