import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditDpoReadiness, analyzeDpoRows } from './noctis-dpo-readiness.mjs';
const hash = text => createHash('sha256').update(text).digest('hex');
const sample = (id, prompt) => ({ id, prompt: `<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`, chosen: 'A careful validated answer', rejected: 'An unsafe answer' });
const user = text => ({ id: 'EVAL-001', messages: [{ role: 'user', content: text }, { role: 'assistant', content: 'reference' }] });
const unrelated = 'Explain Newton second law of motion using forces mass acceleration and a simple algebraic example in mechanics';
function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), 'noctis-dpo-'));
  mkdirSync(join(root, 'data')); mkdirSync(join(root, 'internal'));
  const dataset = 'data/pairs.jsonl', heldout = 'data/heldout.jsonl', approval = 'internal/approved.json';
  const make = (dpo = [sample('A1', 'Identify red flags in patient with acute hyperkalemia ECG changes and severe kidney injury')], evalRows = [user(unrelated)]) => {
    const dpoText = dpo.map(x => JSON.stringify(x)).join('\n') + '\n';
    const evalText = evalRows.map(x => JSON.stringify(x)).join('\n') + '\n';
    writeFileSync(join(root, dataset), dpoText); writeFileSync(join(root, heldout), evalText);
    const review = { schema_version: 'noctis-dpo-approval-v1', dataset_sha256: hash(dpoText), heldout_sha256: hash(evalText), review: { source_rights: 'approved', privacy: 'approved', clinical_accuracy: 'independently_reviewed', reviewer: 'independent-clinician', source_register_sha256: 'a'.repeat(64) } };
    writeFileSync(join(root, approval), JSON.stringify(review));
  };
  try { make(); fn({ root, dataset, heldout, approval, make }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}
test('without reviewer attestation the audit fails closed', () => fixture(f => {
  const r = auditDpoReadiness(f.root ? { root: f.root, dataset: f.dataset, heldout: f.heldout } : {});
  assert.equal(r.status, 'blocked'); assert.ok(r.issues.includes('independent_source_rights_and_quality_approval_missing'));
}));
test('review attestation only establishes a limited, explicitly non-training status', () => fixture(f => {
  const r = auditDpoReadiness(f); assert.equal(r.status, 'file_integrity_and_review_attestation_only');
  assert.equal(r.checked.dpo_rows, 1); assert.equal(r.checked.heldout_rows, 1);
  assert.match(r.note, /does not validate.*permissions/);
}));
test('changed dataset bytes invalidate pinned approval', () => fixture(f => {
  writeFileSync(join(f.root, f.dataset), JSON.stringify(sample('X', 'Completely changed question')) + '\n');
  assert.ok(auditDpoReadiness(f).issues.includes('approval_manifest_missing_invalid_or_stale'));
}));
test('exact heldout overlap blocks', () => {
  const text = 'Assess acute kidney injury with a dangerous potassium level and ECG abnormalities';
  assert.ok(analyzeDpoRows([sample('A', text)], [user(text)]).issues.includes('heldout_prompt_overlap'));
});
test('near-duplicate heldout overlap blocks', () => {
  const text = 'An adult presenting with acute kidney injury has elevated potassium and prominent peaked T waves on the ECG tracing and needs emergency evaluation';
  assert.ok(analyzeDpoRows([sample('A', text + ' now')], [user(text)]).issues.includes('heldout_prompt_overlap'));
});
test('duplicated identifiers and normalized prompts block', () => {
  const r = analyzeDpoRows([sample('A', 'same prompt'), sample('A', 'Same, PROMPT!')], [user(unrelated)]);
  assert.ok(r.issues.includes('missing_or_duplicate_dpo_id'));
  assert.ok(r.issues.includes('empty_or_duplicate_dpo_prompt'));
});
test('chosen and rejected cannot be textually equal', () => {
  const r = analyzeDpoRows([{...sample('A', 'medication reasoning'), rejected: 'A careful validated answer'}], [user(unrelated)]);
  assert.ok(r.issues.includes('identical_chosen_and_rejected'));
});
test('symlinks fail closed and no data is emitted', () => fixture(f => {
  symlinkSync(join(f.root, f.dataset), join(f.root, 'data', 'pointer.jsonl'));
  const r = auditDpoReadiness({ ...f, dataset: 'data/pointer.jsonl' });
  assert.equal(r.status, 'blocked'); assert.ok(r.issues.includes('dataset_missing_or_unsafe'));
  assert.equal(JSON.stringify(r).includes('Identify red flags'), false);
}));
test('unreadable or absent inputs block without fetching or writing', () => fixture(f => {
  const r = auditDpoReadiness({ ...f, heldout: 'data/missing.jsonl' });
  assert.ok(r.issues.includes('heldout_missing_or_unsafe')); assert.equal(r.status, 'blocked');
}));
