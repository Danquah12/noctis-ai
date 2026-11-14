import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { planNoctisPublicSourceAcquisition, acquireNoctisPinnedPublicSource, NOCTIS_MAX_SOURCE_BYTES } from "../src/lib/noctis-public-source-acquisition.mjs";

const data = "{\"prompt\":\"Public sample\",\"completion\":\"For independent review only\"}\n";
const sha = createHash("sha256").update(data).digest("hex");
const url = "https://raw.githubusercontent.com/example/open-educational-data/0123456789abcdef0123456789abcdef01234567/data/examples.jsonl";
const source = (overrides={}) => ({
  id: "public-fixture", kind: "public_open", license_id: "CC0-1.0",
  origin_url: url, training_allowed: true, approved: true,
  usage_rights: "model_training", reviewed_by: "source-approver",
  expected_sha256: sha, license_review_reference: "license-check-01",
  license_reviewed_by: "separate-rights-reviewer", license_reviewed_on: "2026-11-13",
  ...overrides,
});
const plan = (src=source()) => planNoctisPublicSourceAcquisition({sources: [src]});
const fakeFetch = (response=new Response(data, {status: 200,headers:{"content-type":"text/plain; charset=utf-8"}})) =>
  async (u,options) => { assert.equal(u,url); assert.equal(options.redirect,"manual"); assert.equal(options.credentials,"omit"); return response; };

test("valid immutable, reviewed public source is planned without download", () => {
  const prepared = plan();
  assert.equal(prepared.sources.length,1);
  assert.equal(prepared.sources[0].expected_sha256,sha);
  assert.equal(prepared.schema,"noctis.public.source.acquisition.v1");
});
test("requires licensed, explicitly authorized source with independent rights review", () => {
  for (const change of [
    {training_allowed:false}, {approved:false},{usage_rights:"citation_only"},
    {customer_data:true},{user_conversation:true},{private_record:true},
    {license_id:"CC-BY-NC-4.0"},{license_review_reference:""},
    {license_reviewed_by:"source-approver"},{license_reviewed_by:""},
    {expected_sha256:"notahash"},{license_reviewed_on:""},
  ]) assert.throws(() => plan(source(change)));
});
test("only fixed-host HTTPS URLs at immutable 40-character commit IDs are accepted", () => {
  for (const bad of [
    "http://raw.githubusercontent.com/example/repo/0123456789abcdef0123456789abcdef01234567/file.jsonl",
    "https://raw.githubusercontent.com.evil.com/example/repo/0123456789abcdef0123456789abcdef01234567/f",
    "https://127.0.0.1/example/repo/0123456789abcdef0123456789abcdef01234567/f",
    "https://raw.githubusercontent.com/example/repo/main/f.jsonl",
    "https://raw.githubusercontent.com/example/repo/0123456789abcdef0123456789abcdef01234567/f?x=y",
    "https://user:pass@raw.githubusercontent.com/example/repo/0123456789abcdef0123456789abcdef01234567/f",
    "https://raw.githubusercontent.com/example/repo/0123456789abcdef0123456789abcdef01234567/f#frag",
  ]) assert.throws(() => plan(source({origin_url:bad})),bad);
});
test("duplicate source identifiers are blocked",()=>assert.throws(() => planNoctisPublicSourceAcquisition({sources:[source(),source()]})));
test("verified bytes are retained with pinned digest, not converted into training examples",async()=>{
  const item=await acquireNoctisPinnedPublicSource(plan().sources[0],{fetchImpl:fakeFetch()});
  assert.equal(item.sha256,sha);
  assert.equal(item.bytes.toString("utf8"),data);
  assert.equal(item.byte_count,Buffer.byteLength(data));
  assert.ok(!("split" in item));
});
test("redirects, wrong MIME types, non-200 responses, digest mismatch fail closed",async()=>{
  const prepared=plan().sources[0];
  for(const response of [
    new Response(null,{status:302,headers:{location:url}}),
    new Response(data,{status:200,headers:{"content-type":"text/html"}}),
    new Response(data,{status:404,headers:{"content-type":"text/plain"}}),
    new Response("different",{status:200,headers:{"content-type":"text/plain"}}),
  ]) await assert.rejects(() => acquireNoctisPinnedPublicSource(prepared,{fetchImpl:fakeFetch(response)}));
});
test("oversized declarations, actual bodies and invalid UTF-8 fail safely",async()=>{
  const planned=plan().sources[0];
  for(const response of [
    new Response(data,{headers:{"content-type":"text/plain","content-length":String(NOCTIS_MAX_SOURCE_BYTES+1)}}),
    new Response("z".repeat(NOCTIS_MAX_SOURCE_BYTES+1),{headers:{"content-type":"text/plain"}}),
  ]) await assert.rejects(() => acquireNoctisPinnedPublicSource(planned,{fetchImpl:fakeFetch(response)}));
  const bytes=Uint8Array.from([0xff,0xfe]);
  const planForBytes={...planned,expected_sha256:createHash("sha256").update(bytes).digest("hex")};
  await assert.rejects(() => acquireNoctisPinnedPublicSource(planForBytes,{fetchImpl:fakeFetch(new Response(bytes,{headers:{"content-type":"text/plain"}}))}));
});
test("CLI defaults to no network and refuses --fetch without operator authorization",()=>{
  const dir=mkdtempSync(join(tmpdir(),"noctis-acquisition-test-"));
  try {
    const file=join(dir,"manifest.json");
    writeFileSync(file,JSON.stringify({sources:[source()]}),{mode:0o600});
    const command=new URL("./noctis-acquire-public-source.mjs", import.meta.url).pathname;
    const opts={encoding:"utf8",timeout:10000,env:{...process.env,NOCTIS_PUBLIC_SOURCE_FETCH_AUTHORIZED:""}};
    const dry=spawnSync(process.execPath,[command,"--manifest",file],opts);
    assert.equal(dry.status,0,dry.stderr);
    const summary=JSON.parse(dry.stdout);
    assert.equal(summary.mode,"dry_run_no_network");
    assert.ok(!dry.stdout.includes(url));
    const denied=spawnSync(process.execPath,[command,"--manifest",file,"--fetch"],opts);
    assert.equal(denied.status,2);
    assert.match(denied.stderr,/NOCTIS_PUBLIC_SOURCE_FETCH_AUTHORIZED=YES/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
