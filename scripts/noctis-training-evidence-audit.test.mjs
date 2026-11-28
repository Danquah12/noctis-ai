import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { auditTrainingEvidence } from './noctis-training-evidence-audit.mjs';

const FILES = [
  'models/noctis-7b-v2.0-adapter/adapter_model.safetensors',
  'models/noctis-7b-v2.0-adapter/adapter_config.json',
  'data/noctis-baseline-qwen7b-responses.jsonl',
  'data/noctis-trained-qwen7b-v2-responses.jsonl',
];
const hex = s => createHash('sha256').update(s).digest('hex');
async function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), 'noctis-evidence-test-'));
  const write = (file, content) => { mkdirSync(dirname(join(root, file)), {recursive:true}); writeFileSync(join(root,file),content); };
  try {
    const cases = Array.from({length:250}, (_,i) => JSON.stringify({id:`case-${i}`})).join('\n')+'\n';
    write('data/noctis-cot-validation-250.jsonl', cases);
    const records = cases;
    const values = ['adapter-mock','{"base_model_name_or_path":"test"}',records,records];
    FILES.forEach((file,i) => write(file, values[i]));
    write('deliverables/CHECKSUMS-PHASE2.sha256', FILES.map((file,i) => `${hex(values[i])}  ${file}`).join('\n')+'\n');
    return await fn({root,write});
  } finally { rmSync(root, {recursive:true,force:true}); }
}
test('checks matching bytes and exact benchmark case IDs without claiming training', async () => fixture(async ({root}) => {
  const result = await auditTrainingEvidence(root);
  assert.equal(result.status, 'file_integrity_and_coverage_only');
  assert.equal(result.artifacts['data/noctis-trained-qwen7b-v2-responses.jsonl'].response_count, 250);
  assert.match(result.note, /do not prove/);
}));
test('flags missing model adapter instead of assuming PR report is evidence', async () => fixture(async ({root}) => {
  rmSync(join(root,FILES[0]));
  const result = await auditTrainingEvidence(root);
  assert.equal(result.status, 'incomplete');
  assert.ok(result.findings.some(f=>f.startsWith('missing:models/')));
}));
test('rejects changed response bytes with unchanged manifest', async () => fixture(async ({root,write}) => {
  write(FILES[3], 'tampered');
  const result = await auditTrainingEvidence(root);
  assert.equal(result.status, 'incomplete');
  assert.ok(result.findings.some(f => f.includes('checksum_mismatch')));
}));
test('fails when response case set differs despite newly matching checksum', async () => fixture(async ({root,write}) => {
  const modified = Array.from({length:250},(_,i)=>JSON.stringify({id:`wrong-${i}`})).join('\n')+'\n';
  write(FILES[3],modified);
  const manifest = readFileSync(join(root,'deliverables/CHECKSUMS-PHASE2.sha256'),'utf8').split('\n').map(x=>x.includes(FILES[3])?`${hex(modified)}  ${FILES[3]}`:x).join('\n');
  write('deliverables/CHECKSUMS-PHASE2.sha256',manifest);
  const result = await auditTrainingEvidence(root);
  assert.equal(result.status,'incomplete');
  assert.ok(result.findings.some(f=>f.includes('case_id_coverage_mismatch')));
}));
test('rejects unknown checksum targets instead of opening untrusted paths', async () => fixture(async ({root,write}) => {
  write('deliverables/CHECKSUMS-PHASE2.sha256', `${hex('secret')}  ../../.ssh/id_rsa\n`);
  await assert.rejects(()=>auditTrainingEvidence(root), /invalid_or_unexpected/);
}));