#!/usr/bin/env node
/** Offline DPO corpus/held-out preflight. No training, model calls, uploads or output writes. */
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');

function safePath(root, relativePath) {
  if (!relativePath || isAbsolute(relativePath)) throw Error('invalid_path');
  const abs = resolve(root, relativePath);
  const rel = relative(root, abs);
  if (!rel || rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) throw Error('path_outside_checkout');
  let cursor = root;
  for (const component of rel.split(/[\\/]+/)) {
    cursor = join(cursor, component);
    if (lstatSync(cursor).isSymbolicLink()) throw Error('symlink_forbidden');
  }
  if (!lstatSync(abs).isFile()) throw Error('not_regular_file');
  return abs;
}
function readFile(root, path) {
  const bytes = readFileSync(safePath(root, path));
  if (bytes.length > 64 * 1024 * 1024) throw Error('file_size_limit_exceeded');
  return { sha256: sha256(bytes), text: bytes.toString('utf8') };
}
function parseJsonl(text, type) {
  const rows = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); }
    catch { throw Error(`${type}_invalid_jsonl_at_line_${index + 1}`); }
  }
  return rows;
}
function getPrompt(record) {
  if (Array.isArray(record?.messages)) {
    const users = record.messages.filter(m => m?.role === 'user' && typeof m.content === 'string');
    if (users.length) return users.at(-1).content;
  }
  if (typeof record?.prompt === 'string') {
    const matches = [...record.prompt.matchAll(/<\|im_start\|>user\s*([\s\S]*?)<\|im_end\|>/g)];
    return matches.length ? matches.at(-1)[1] : record.prompt;
  }
  return typeof record?.question === 'string' ? record.question : '';
}
function gramSet(normalized, n = 5) {
  const tokens = normalized.split(' ').filter(Boolean);
  const set = new Set();
  for (let i = 0; i <= tokens.length - n; i++) set.add(tokens.slice(i, i + n).join(' '));
  return set;
}
function similar(a, b) {
  if (a.text === b.text) return true;
  if (a.tokenCount < 12 || b.tokenCount < 12) return false;
  if (!a.grams.size || !b.grams.size) return false;
  let shared = 0;
  for (const gram of a.grams) if (b.grams.has(gram)) shared++;
  return shared / Math.min(a.grams.size, b.grams.size) >= 0.92;
}
const indexedPrompt = text => ({ text, tokenCount: text.split(' ').length, grams: gramSet(text) });
const unique = values => [...new Set(values)];

export function analyzeDpoRows(dpoRows, heldoutRows) {
  const issues = [];
  const seenIds = new Set(), seenPrompts = new Set();
  const testPrompts = heldoutRows.map(r => normalize(getPrompt(r))).filter(Boolean).map(indexedPrompt);
  if (!dpoRows.length) issues.push('empty_dpo_dataset');
  if (!heldoutRows.length || !testPrompts.length) issues.push('empty_or_invalid_heldout_dataset');
  for (const row of dpoRows) {
    if (!row || typeof row.id !== 'string' || !row.id.trim() || seenIds.has(row.id)) {
      issues.push('missing_or_duplicate_dpo_id');
    } else seenIds.add(row.id);
    if (!row || !['prompt', 'chosen', 'rejected'].every(k => typeof row[k] === 'string' && row[k].trim())) {
      issues.push('missing_dpo_preference_fields'); continue;
    }
    const prompt = normalize(getPrompt(row));
    if (!prompt || seenPrompts.has(prompt)) issues.push('empty_or_duplicate_dpo_prompt');
    seenPrompts.add(prompt);
    if (normalize(row.chosen) === normalize(row.rejected)) issues.push('identical_chosen_and_rejected');
    const indexed = indexedPrompt(prompt);
    if (testPrompts.some(h => similar(indexed, h))) issues.push('heldout_prompt_overlap');
  }
  return { issues: unique(issues), dpo_rows: dpoRows.length, heldout_rows: heldoutRows.length };
}

/** A matching approval manifest records attestations only; it cannot prove licenses or review authenticity. */
export function auditDpoReadiness({ root, dataset = 'data/noctis-dpo-clinical-safety.jsonl', heldout = 'data/noctis-cot-validation-250.jsonl', approval = null }) {
  const rootPath = resolve(root);
  const issues = [], checked = {};
  let data, evaluation;
  try { data = readFile(rootPath, dataset); checked.dataset_sha256 = data.sha256; }
  catch { issues.push('dataset_missing_or_unsafe'); }
  try { evaluation = readFile(rootPath, heldout); checked.heldout_sha256 = evaluation.sha256; }
  catch { issues.push('heldout_missing_or_unsafe'); }
  if (data && evaluation) {
    try {
      const inspected = analyzeDpoRows(parseJsonl(data.text, 'dpo'), parseJsonl(evaluation.text, 'heldout'));
      Object.assign(checked, { dpo_rows: inspected.dpo_rows, heldout_rows: inspected.heldout_rows });
      issues.push(...inspected.issues);
    } catch { issues.push('invalid_dpo_or_heldout_jsonl'); }
  }
  if (!approval) issues.push('independent_source_rights_and_quality_approval_missing');
  else {
    try {
      const attestation = JSON.parse(readFile(rootPath, approval).text);
      const review = attestation?.review;
      if (attestation?.schema_version !== 'noctis-dpo-approval-v1' ||
          attestation?.dataset_sha256 !== checked.dataset_sha256 ||
          attestation?.heldout_sha256 !== checked.heldout_sha256 ||
          review?.source_rights !== 'approved' || review?.privacy !== 'approved' ||
          review?.clinical_accuracy !== 'independently_reviewed' ||
          typeof review?.reviewer !== 'string' || !review.reviewer.trim() ||
          typeof review?.source_register_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(review.source_register_sha256)) {
        issues.push('approval_manifest_missing_invalid_or_stale');
      } else checked.approval_attestation_matches_bytes = true;
    } catch { issues.push('approval_manifest_missing_invalid_or_stale'); }
  }
  return {
    status: issues.length ? 'blocked' : 'file_integrity_and_review_attestation_only',
    issues: unique(issues), checked,
    note: 'This offline check does not validate reviewer identity, source permissions, factual clinical accuracy, model weights, training, or benchmark performance. Training and publishing require separate authorization.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--root', '--dataset', '--heldout', '--approval'].includes(args[i]) || !args[i + 1] || values[args[i]]) {
      console.error('Usage: node scripts/noctis-dpo-readiness.mjs [--root <checkout>] [--dataset <relative>] [--heldout <relative>] [--approval <relative>]');
      process.exit(2);
    }
    values[args[i]] = args[i + 1];
  }
  const root = values['--root'] || resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = auditDpoReadiness({ root, dataset: values['--dataset'], heldout: values['--heldout'], approval: values['--approval'] });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'blocked') process.exitCode = 2;
}
