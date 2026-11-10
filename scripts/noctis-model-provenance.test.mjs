import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { makeNoctisModelProvenance as provenance } from "../src/lib/noctis-model-provenance.mjs";

test("records successful selected provider, attempted model and reported model without claiming independent verification", () => {
  const value = provenance({ requestedProvider: "gemini", respondingProvider: "gemini", attemptedModel: "gemini-test", providerReportedModel: "gemini-test-001", attemptNumber: 1 });
  assert.deepEqual(value, {
    protocol: "noctis.gateway.v1", source_kind: "model_gateway",
    requested_provider: "gemini", responding_provider: "gemini",
    attempted_model: "gemini-test", provider_reported_model: "gemini-test-001",
    fallback_used: false, model_identity_independently_verified: false,
  });
});
test("selected provider differs from responding provider", () => {
  assert.equal(provenance({ requestedProvider: "openai", respondingProvider: "xai", attemptedModel: "grok-3", attemptNumber: 1 }).fallback_used, true);
});
test("retrying a different model from the same provider is a fallback", () => {
  assert.equal(provenance({ requestedProvider: "openai", respondingProvider: "openai", attemptedModel: "gpt-4o-mini", attemptNumber: 2 }).fallback_used, true);
});
test("the local native response never masquerades as model-weight inference", () => {
  const value = provenance({ requestedProvider: "gemini", respondingProvider: "local_native", attemptNumber: 4 });
  assert.equal(value.source_kind, "native_fallback");
  assert.equal(value.attempted_model, null);
  assert.equal(value.provider_reported_model, null);
  assert.equal(value.fallback_used, true);
});
test("no explicit requested provider is reported as null", () => {
  assert.equal(provenance({ respondingProvider: "groq", attemptedModel: "llama-3.3-70b-versatile", attemptNumber: 1 }).requested_provider, null);
});
test("unreported model identity remains unknown rather than inheriting the attempted model", () => {
  const value = provenance({ respondingProvider: "openai", attemptedModel: "gpt-4o", attemptNumber: 1 });
  assert.equal(value.attempted_model, "gpt-4o");
  assert.equal(value.provider_reported_model, null);
});
test("rejects unknown responders", () => {
  assert.throws(() => provenance({ respondingProvider: "attacker", attemptNumber: 1 }), /Unknown/);
});
test("secrets and multiline provider-controlled labels are not exposed", () => {
  const value = provenance({
    requestedProvider: "gemini\nAuthorization: Bearer secret", respondingProvider: "openai",
    attemptedModel: "sk-proj-not-a-model", providerReportedModel: "model\nsecret",
    attemptNumber: 1,
  });
  assert.equal(value.requested_provider, null);
  assert.equal(value.attempted_model, null);
  assert.equal(value.provider_reported_model, null);
  assert.ok(!JSON.stringify(value).includes("secret"));
});
test("gateway integration covers every model-response return and local fallback", () => {
  const source = readFileSync(new URL("../src/lib/video-mind.server.ts", import.meta.url), "utf8");
  const gateway = source.slice(source.indexOf("export async function modelChat("), source.indexOf("\nasync function complete(", source.indexOf("export async function modelChat(")));
  assert.ok(gateway.includes("makeNoctisModelProvenance"));
  const matches = gateway.match(/if \(text\) return \{ text, provenance: reportOrigin\(/g) || [];
  assert.equal(matches.length, 7, "all seven provider success paths must report their origin");
  assert.match(gateway, /if \(nativeText\?\.text\) return \{ text: nativeText\.text, provenance: reportOrigin\("local_native"/);
  assert.equal((gateway.match(/modelAttempts \+= 1;/g) || []).length, 7);
});
test("chat preserves gateway provenance through the final assistant response", () => {
  const source = readFileSync(new URL("../src/lib/noctis-desk.server.ts", import.meta.url), "utf8");
  assert.match(source, /return \{ text: result\.text, provenance: result\.provenance \};/);
  assert.match(source, /return \{ text: finalOut, provenance: result\.provenance \};/);
  assert.match(source, /provenance: reply\.provenance/);
});
