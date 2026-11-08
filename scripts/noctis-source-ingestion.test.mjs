import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { compileFunction } from "node:vm";

// Run the actual tracked implementation with only its SQL dependency replaced.
// These are unit/SQL-contract tests, NOT real database isolation, rollback,
// authentication, tenant authorization, or independent-review certification.
// No database, network, environment credentials, or production migration is used.
const sourceUrl = new URL("../src/lib/noctis-source-ingestion.server.ts", import.meta.url);
let executable = stripTypeScriptTypes(readFileSync(sourceUrl, "utf8"));
for (const statement of [
  'import { createHash, randomUUID } from "node:crypto";',
  'import { getSql } from "@/lib/db";',
]) {
  assert.equal(executable.split(statement).length, 2, `Unexpected import contract: ${statement}`);
  executable = executable.replace(statement, "");
}
executable = executable.replace(/^export (?=async function )/gm, "");
const instantiate = compileFunction(
  `${executable}\nreturn { registerNoctisTextSource, reviewNoctisSource };`,
  ["createHash", "randomUUID", "getSql"],
  { filename: sourceUrl.pathname },
);

function fixture(steps = []) {
  const calls = [];
  const transactions = [];
  let position = 0;
  let connections = 0;
  const execute = async (transactional, strings, values) => {
    const text = strings.join("?").replace(/\s+/g, " ").trim();
    const step = steps[position++];
    assert.ok(step, `Unexpected SQL: ${text}`);
    assert.match(text, step.pattern);
    if (step.transactional !== undefined) assert.equal(transactional, step.transactional);
    calls.push({ text, values, transactional });
    if (step.error) throw step.error;
    return typeof step.rows === "function" ? step.rows(values) : step.rows ?? [];
  };
  const sql = (strings, ...values) => execute(false, strings, values);
  sql.transaction = async (operation) => {
    transactions.push("begin");
    try {
      const result = await operation((strings, ...values) => execute(true, strings, values));
      transactions.push("commit");
      return result;
    } catch (error) {
      transactions.push("rollback-requested");
      throw error;
    }
  };
  const api = instantiate(createHash, randomUUID, async () => {
    connections += 1;
    return sql;
  });
  return {
    api, calls, transactions,
    get connections() { return connections; },
    done() { assert.equal(position, steps.length, "Not all expected SQL statements ran"); },
  };
}

const source = {
  id: "source-1", content_hash: "a".repeat(64), status: "quarantined",
  license: "CC0-1.0", publisher: "Test publisher", submitted_by: "submitter-1",
};
const review = {
  sourceId: source.id, decision: "approved", reviewerId: "reviewer-2",
  reason: "Publisher and terms independently reviewed",
};
const submission = {
  title: "Test evidence", domain: "science",
  content: "A sufficiently long source text for isolated ingestion unit tests.",
};
const readSource = (rows = [source]) => ({ pattern: /^select id, content_hash/, rows });
const updateSource = (rows = [{ id: source.id }]) => ({ pattern: /^with changed as /, rows });
const insertSource = () => ({
  pattern: /^insert into noctis_learning_source /, transactional: true,
  rows: (values) => [{ id: values[0], status: "quarantined" }],
});
const insertChunk = () => ({ pattern: /^insert into noctis_source_chunk /, transactional: true });
const insertAudit = () => ({ pattern: /^insert into noctis_learning_audit /, transactional: true });
const digest = (text) => createHash("sha256").update(text, "utf8").digest("hex");

for (const [name, patch, message] of [
  ["missing source", { sourceId: " " }, /source ID, trusted reviewer ID/],
  ["missing reviewer", { reviewerId: undefined }, /trusted reviewer ID/],
  ["null reviewer", { reviewerId: null }, /trusted reviewer ID/],
  ["non-string reviewer", { reviewerId: 7 }, /trusted reviewer ID/],
  ["blank reviewer", { reviewerId: " \0 " }, /trusted reviewer ID/],
  ["short reason", { reason: "short" }, /review reason/],
  ["unknown decision", { decision: "active" }, /Invalid source review decision/],
  ["missing decision", { decision: undefined }, /Invalid source review decision/],
]) {
  test(`source review rejects ${name} before opening SQL`, async () => {
    const f = fixture();
    await assert.rejects(f.api.reviewNoctisSource({ ...review, ...patch }), message);
    assert.equal(f.connections, 0);
    f.done();
  });
}

for (const decision of ["approved", "rejected"]) {
  for (const reviewerId of ["submitter-1", " submitter-1 ", "submitter-\u00001"]) {
    test(`source review blocks ${decision} self-review (${JSON.stringify(reviewerId)})`, async () => {
      const f = fixture([readSource()]);
      await assert.rejects(f.api.reviewNoctisSource({ ...review, decision, reviewerId }), /cannot review their own source/);
      f.done();
    });
  }
}

for (const status of ["approved", "rejected", "deprecated"]) {
  test(`source review rejects existing ${status} status without writing`, async () => {
    const f = fixture([readSource([{ ...source, status }])]);
    await assert.rejects(f.api.reviewNoctisSource(review), /Only quarantined sources/);
    f.done();
  });
}

test("source review rejects a missing source without writing", async () => {
  const f = fixture([readSource([])]);
  await assert.rejects(f.api.reviewNoctisSource(review), /Source not found/);
  f.done();
});

for (const field of ["license", "publisher"]) {
  test(`source approval requires ${field} metadata`, async () => {
    const f = fixture([readSource([{ ...source, [field]: null }])]);
    await assert.rejects(f.api.reviewNoctisSource(review), /Approval requires publisher and license/);
    f.done();
  });
}

for (const decision of ["approved", "rejected"]) {
  test(`source ${decision} uses one normalized reviewer in guarded update and audit`, async () => {
    const row = decision === "rejected" ? { ...source, license: null, publisher: null } : source;
    const f = fixture([readSource([row]), updateSource()]);
    const result = await f.api.reviewNoctisSource({
      ...review, decision, sourceId: " source-1 ", reviewerId: " reviewer-\u00002 ",
    });
    assert.deepEqual(result, { ok: true, sourceId: source.id, status: decision });
    assert.deepEqual(f.calls[0].values, [source.id]);
    const update = f.calls[1];
    assert.match(update.text, /where id = \? and status = 'quarantined'/);
    assert.match(update.text, /and \(submitted_by is null or submitted_by <> \?\)/);
    assert.match(update.text, /insert into noctis_learning_audit/);
    assert.match(update.text, /from changed returning target_id/);
    assert.match(update.text, /join audit on audit.target_id = changed.id/);
    const [savedDecision, savedReviewer, reason, id, guardReviewer, auditId, auditReviewer, action] = update.values;
    assert.equal(savedDecision, decision);
    assert.equal(savedReviewer, "reviewer-2");
    assert.equal(guardReviewer, savedReviewer);
    assert.equal(auditReviewer, savedReviewer);
    assert.equal(reason, review.reason);
    assert.equal(id, source.id);
    assert.match(auditId, /^[a-f0-9-]{36}$/i);
    assert.equal(action, `source.${decision}`);
    assert.ok(!update.text.includes(review.reason));
    assert.ok(!update.text.includes(savedReviewer));
    f.done();
  });
}

test("source review fails closed when a concurrent update returns no row", async () => {
  const f = fixture([readSource(), updateSource([])]);
  await assert.rejects(f.api.reviewNoctisSource(review), /Source review conflict or audit failure/);
  f.done();
});

for (const stage of ["read", "update-and-audit"]) {
  test(`source review propagates ${stage} database failures`, async () => {
    const failure = new Error(`Simulated ${stage} failure`);
    const steps = stage === "read" ? [{ ...readSource(), error: failure }]
      : [readSource(), { ...updateSource(), error: failure }];
    const f = fixture(steps);
    await assert.rejects(f.api.reviewNoctisSource(review), (error) => error === failure);
    f.done();
  });
}

for (const submitterId of [undefined, " \0 "]) {
  test(`source submission rejects missing actor (${JSON.stringify(submitterId)}) before SQL`, async () => {
    const f = fixture();
    await assert.rejects(f.api.registerNoctisTextSource(submission, submitterId), /trusted submitter ID/);
    assert.equal(f.connections, 0);
    f.done();
  });
}

for (const [field, value, message] of [
  ["title", "x", /Source title/],
  ["domain", "invalid domain", /valid source domain/],
  ["content", "too short", /Source text must be between/],
  ["content", "x".repeat(500_001), /Source text must be between/],
  ["canonicalUri", "http://example.invalid/source", /HTTPS URL/],
  ["classification", "unknown", /Invalid source classification/],
]) {
  test(`source submission rejects invalid ${field} (${typeof value === "string" ? value.length : 0} chars) before SQL`, async () => {
    const f = fixture();
    await assert.rejects(f.api.registerNoctisTextSource({ ...submission, [field]: value }, "submitter-1"), message);
    assert.equal(f.connections, 0);
    f.done();
  });
}

test("source submission quarantines, hashes, chunks and audits through one transaction callback", async () => {
  const content = "a".repeat(4_000) + "b".repeat(4_000) + "c".repeat(45);
  const f = fixture([insertSource(), insertChunk(), insertChunk(), insertChunk(), insertAudit()]);
  const result = await f.api.registerNoctisTextSource({ ...submission, domain: " SCIENCE ", content: ` \0${content} ` }, " submitter-\u00001 ");
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.status, "quarantined");
  assert.equal(result.chunkCount, 3);
  assert.equal(result.contentHash, digest(content));
  assert.deepEqual(f.transactions, ["begin", "commit"]);
  assert.ok(f.calls.every((call) => call.transactional));
  const insert = f.calls[0];
  assert.match(insert.text, /'quarantined'/);
  assert.match(insert.text, /on conflict \(content_hash, domain\) do nothing/);
  assert.equal(insert.values[4], "science");
  assert.equal(insert.values[7], result.contentHash);
  assert.equal(insert.values[10], "submitter-1");
  for (let i = 0; i < 3; i += 1) {
    const [, sourceId, ordinal, locator, chunk, hash, tokens] = f.calls[i + 1].values;
    assert.equal(sourceId, result.sourceId);
    assert.equal(ordinal, i);
    assert.equal(locator, `text-chunk:${i}`);
    assert.equal(chunk, content.slice(i * 4_000, (i + 1) * 4_000));
    assert.equal(hash, digest(chunk));
    assert.equal(tokens, Math.ceil(chunk.length / 4));
  }
  assert.equal(f.calls[4].values[1], "submitter-1");
  assert.equal(f.calls[4].values[2], result.sourceId);
  assert.equal(f.calls[4].values[3], result.contentHash);
  assert.match(f.calls[4].text, /'source.submit'/);
  f.done();
});

test("duplicate source returns the existing record without new chunks or audit writes", async () => {
  const f = fixture([
    { ...insertSource(), rows: [] },
    { pattern: /^select id, status from noctis_learning_source /, transactional: true, rows: [{ id: "existing-1", status: "quarantined" }] },
  ]);
  const result = await f.api.registerNoctisTextSource(submission, "submitter-1");
  assert.deepEqual(result, { ok: true, duplicate: true, sourceId: "existing-1", status: "quarantined", chunkCount: 0 });
  assert.deepEqual(f.calls[1].values, [digest(submission.content), submission.domain]);
  assert.deepEqual(f.transactions, ["begin", "commit"]);
  f.done();
});

test("unresolved duplicate conflict rejects instead of reporting false success", async () => {
  const f = fixture([
    { ...insertSource(), rows: [] },
    { pattern: /^select id, status from noctis_learning_source /, transactional: true, rows: [] },
  ]);
  await assert.rejects(f.api.registerNoctisTextSource(submission, "submitter-1"), /idempotency conflict could not be resolved/);
  assert.deepEqual(f.transactions, ["begin", "rollback-requested"]);
  f.done();
});

for (const [stage, preceding, failed] of [
  ["source", [], insertSource()],
  ["chunk", [insertSource()], insertChunk()],
  ["audit", [insertSource(), insertChunk()], insertAudit()],
]) {
  test(`source submission propagates ${stage} failure out of its transaction callback`, async () => {
    const failure = new Error(`Simulated ${stage} failure`);
    const f = fixture([...preceding, { ...failed, error: failure }]);
    await assert.rejects(f.api.registerNoctisTextSource(submission, "submitter-1"), (error) => error === failure);
    assert.deepEqual(f.transactions, ["begin", "rollback-requested"]);
    assert.ok(f.calls.every((call) => call.transactional));
    f.done();
  });
}
