/** Synthetic, entirely offline source-to-reviewed-dataset tests. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { prepareNoctisReviewedPublicBundle } from "../src/lib/noctis-reviewed-public-bundle.mjs";

const SOURCE_URL = "https://raw.githubusercontent.com/reviewed-owner/reviewed-repo/0123456789abcdef0123456789abcdef01234567/corpus.txt";
const TEXT = "Open educational reference: groundwater moves through porous rock into rivers during the water cycle.";
const BYTES = Buffer.from(TEXT, "utf8");
const hash = value => createHash("sha256").update(value).digest("hex");
const sha = hash(BYTES);
const source = () => ({
  id: "public-water-1", kind: "public_open", license_id: "CC0-1.0",
  origin_url: SOURCE_URL, training_allowed: true, approved: true, usage_rights: "model_training",
  reviewed_by: "source-reviewer", license_review_reference: "rights-review-2026",
  license_reviewed_by: "license-reviewer", license_reviewed_on: "2026-11-14",
  expected_sha256: sha,
});
const acquired = () => ({
  schema: "noctis.public.source.acquisition.v1",
  sources: [{
    id: "public-water-1", file: "source-1.txt", sha256: sha,
    byte_count: BYTES.length, media_type: "text/plain", origin_url: SOURCE_URL,
    license_id: "CC0-1.0", usage_rights: "model_training",
    license_review_reference: "rights-review-2026", attribution_required: false,
    status: "ACQUIRED_UNREVIEWED_CONTENT_NOT_TRAINING_DATA",
  }],
});
const candidate = () => ({
  id: "reviewed-case-1", source_id: "public-water-1", source_sha256: sha,
  evidence: { byte_start: 0, byte_end: BYTES.length, sha256: sha },
  prompt: "What role does porous rock play in groundwater movement?",
  completion: "Groundwater can move through porous rock toward rivers.",
  validation: {
    kind: "independent_review", passed: true,
    verified_by: "independent-content-reviewer",
    reference: "reviewed-answer-record-01", reviewed_on: "2026-11-14",
  },
});
const bundle = () => ({
  catalog: { sources: [source()] },
  acquisition: acquired(),
  sourceBytesById: new Map([["public-water-1", BYTES]]),
  candidates: [candidate()],
});
const prepare = (b = bundle(), opts = {}) => prepareNoctisReviewedPublicBundle(b, opts);
const resultRows = result => Object.values(result.splits).flat();

test("verified, independently reviewed source-anchored candidate becomes prepared example", () => {
  const result = prepare();
  assert.equal(result.bridge_schema, "noctis.reviewed.public.bundle.v1");
  assert.equal(result.summary.accepted, 1);
  const row = resultRows(result)[0];
  assert.equal(row.provenance.source_id, "public-water-1");
  assert.equal(row.provenance.source_sha256, sha);
  assert.equal(row.provenance.evidence_sha256, sha);
  assert.equal(row.provenance.evidence_byte_start, 0);
  assert.equal(row.provenance.review_date, "2026-11-14");
  assert.equal(row.provenance.license_id, "CC0-1.0");
  assert.ok(!("source_text" in row));
  assert.ok(!("checkpoint" in result));
});
test("the full source bytes must match the pinned digest and acquisition manifest", () => {
  const b = bundle();
  b.sourceBytesById.set("public-water-1", Buffer.from(TEXT + " TAMPERED"));
  assert.throws(() => prepare(b), /source_bytes_invalid/);
  const b2 = bundle();
  b2.sourceBytesById.set("public-water-1", Buffer.from(TEXT.replace("groundwater", "GROUNDWATER")));
  assert.throws(() => prepare(b2), /acquired_content_digest_mismatch/);
  const b3 = bundle();
  b3.acquisition.sources[0].sha256 = "f".repeat(64);
  assert.throws(() => prepare(b3), /acquisition_metadata_mismatch/);
});
test("unreviewed acquisition status and altered rights and URL cannot be promoted", () => {
  for (const edit of [
    {status:"APPROVED_FOR_TRAINING"},
    {origin_url:"https://elsewhere.invalid/file"},
    {license_id:"MIT"}, {attribution_required:true},
    {license_review_reference:"a-different-review"},
  ]) {
    const b = bundle();
    Object.assign(b.acquisition.sources[0], edit);
    assert.throws(() => prepare(b), /acquisition_metadata_mismatch/);
  }
  const b = bundle(); b.catalog.sources[0].approved = false;
  assert.throws(() => prepare(b), /not approved|Source is not approved/);
});
test("candidate source ID, exact evidence span and byte checksum are required", () => {
  for (const edit of [
    {source_id: "not-in-manifest"},
    {source_sha256: "f".repeat(64)},
    {evidence: {byte_start: 0, byte_end: 4, sha256: sha}},
    {evidence: {byte_start: 0, byte_end: BYTES.length, sha256: "f".repeat(64)}},
    {evidence: {byte_start: 5, byte_end: BYTES.length + 1, sha256: sha}},
  ]) {
    const b = bundle(); Object.assign(b.candidates[0], edit);
    assert.throws(() => prepare(b), /bridge blocked/);
  }
});
test("source approver, license reviewer and model-self validation cannot approve examples", () => {
  for (const verified_by of ["source-reviewer", "license-reviewer"]) {
    const b = bundle(); b.candidates[0].validation.verified_by = verified_by;
    assert.throws(() => prepare(b), /independent_example_review_required/);
  }
  for (const validation of [
    {kind:"self_assessment"}, {passed:false}, {reviewed_on:"2026-02-30"},
  ]) {
    const b = bundle(); Object.assign(b.candidates[0].validation, validation);
    assert.throws(() => prepare(b), /independent_example_review_required/);
  }
});
test("private data indicators, duplicate prompts and held-out prompt leakage fail whole package", () => {
  for (const edit of [
    {from_user_conversation:true}, {private_record:true},
    {customer_data:true}, {contains_personal_data:true},
    {prompt:"Write to person@example.com about a private case."},
  ]) {
    const b = bundle(); Object.assign(b.candidates[0], edit);
    assert.throws(() => prepare(b), /preparation_rejected/);
  }
  const dupe = bundle();
  dupe.candidates.push({...candidate(), id:"reviewed-case-2"});
  assert.throws(() => prepare(dupe), /preparation_rejected_duplicate_prompt/);
  assert.throws(() => prepare(bundle(), {
    reservedHeldoutPrompts:["WHAT role does porous rock play in groundwater movement?"],
  }), /preparation_rejected_reserved_evaluation_prompt/);
});
test("missing and surplus raw sources are blocked, rather than silently ignored", () => {
  const b = bundle(); b.sourceBytesById.clear();
  assert.throws(() => prepare(b), /source_files_missing_or_extra/);
  const b2 = bundle(); b2.sourceBytesById.set("other", BYTES);
  assert.throws(() => prepare(b2), /source_files_missing_or_extra/);
});
test("CLI remains read-only by default and writes private synthetic splits only with authorization", () => {
  const dir = mkdtempSync(join(tmpdir(), "noctis-reviewed-public-bridge-test-"));
  let exported;
  try {
    const acquiredDir = join(dir, "acquired");
    mkdirSync(acquiredDir, { mode: 0o700 });
    const catPath = join(dir, "catalog.json");
    const candidatePath = join(dir, "reviewed-candidates.json");
    writeFileSync(catPath, JSON.stringify({sources:[source()]}));
    writeFileSync(candidatePath, JSON.stringify({candidates:[candidate()]}));
    writeFileSync(join(acquiredDir, "acquisition-manifest.json"), JSON.stringify(acquired()));
    writeFileSync(join(acquiredDir, "source-1.txt"), BYTES);
    const script = new URL("./noctis-review-acquired-public-sources.mjs", import.meta.url).pathname;
    const cmd = ["--catalog",catPath,"--acquired",acquiredDir,"--candidates",candidatePath];
    const base = {encoding:"utf8", timeout:10000, env:{...process.env,NOCTIS_DATASET_EXPORT_AUTHORIZED:""}};
    const dry = spawnSync(process.execPath, [script,...cmd], base);
    assert.equal(dry.status, 0, dry.stderr);
    const dryReport = JSON.parse(dry.stdout);
    assert.equal(dryReport.mode, "dry_run_no_network_no_writes");
    assert.equal(dryReport.accepted_examples, 1);
    assert.ok(!dry.stdout.includes(TEXT));
    assert.ok(!dry.stdout.includes(candidate().prompt));
    const deny = spawnSync(process.execPath, [script,...cmd,"--write"], base);
    assert.equal(deny.status, 2);
    assert.match(deny.stderr,/writes_require_NOCTIS_DATASET_EXPORT_AUTHORIZED/);
    const permit = spawnSync(process.execPath,[script,...cmd,"--write"],{
      ...base,env:{...process.env,NOCTIS_DATASET_EXPORT_AUTHORIZED:"YES"},
    });
    assert.equal(permit.status,0,permit.stderr);
    const manifest = JSON.parse(permit.stdout);
    exported = manifest.output_directory;
    const rows = ["train","development","heldout"].flatMap(s => {
      const lines = readFileSync(join(exported,s+".jsonl"),"utf8").trim();
      return lines ? lines.split("\n").map(JSON.parse) : [];
    });
    assert.equal(rows.length,1);
    assert.equal(rows[0].provenance.source_sha256,sha);
    if (process.platform !== "win32") {
      assert.equal(statSync(exported).mode & 0o777,0o700);
      assert.equal(statSync(join(exported,"manifest.json")).mode & 0o777,0o600);
    }
  } finally {
    if(exported) rmSync(exported,{recursive:true,force:true});
    rmSync(dir,{recursive:true,force:true});
  }
});
