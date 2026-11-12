/** Contract tests: public /api/noctis chat response origin; no network. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { sanitizeNoctisPublicResponseProvenance } from "../src/lib/noctis-public-response-provenance.mjs";
import { makeNoctisModelProvenance } from "../src/lib/noctis-model-provenance.mjs";
import { makeNoctisRouteProvenance } from "../src/lib/noctis-route-provenance.mjs";

const apiRoute = readFileSync(new URL("../src/routes/api/noctis.ts", import.meta.url), "utf8");

test("API response serializes only sanitized provenance in the general chat success branch", () => {
  assert.match(apiRoute, /const publicProvenance = sanitizeNoctisPublicResponseProvenance\(/);
  assert.match(apiRoute, /\.{3}\(publicProvenance \? \{ provenance: publicProvenance \} : \{\}\)/);
  assert.match(apiRoute, /if \("text" in reply\)/);
  assert.match(apiRoute, /text: reply\.text/);
});

test("actual Gemini gateway responder retains only allowed origin metadata", () => {
  const result = makeNoctisModelProvenance({
    requestedProvider: "openai", respondingProvider: "gemini", attemptedModel: "gemini-3.5-flash-lite", attemptNumber: 3,
  });
  const sanitized = sanitizeNoctisPublicResponseProvenance({
    ...result, auth_header: "Bearer secret", prompt: "private conversation", key: "sk-private", endpoint: "http://localhost:11434",
  });
  assert.equal(sanitized?.protocol, "noctis.gateway.v1");
  assert.equal(sanitized?.responding_provider, "gemini");
  assert.equal(sanitized?.fallback_used, true);
  assert.equal(sanitized?.model_identity_independently_verified, false);
  assert.equal(Object.hasOwn(sanitized, "auth_header"), false);
  assert.equal(Object.hasOwn(sanitized, "prompt"), false);
  assert.equal(Object.hasOwn(sanitized, "key"), false);
  assert.equal(Object.hasOwn(sanitized, "endpoint"), false);
});

test("local/native fallback is never mislabeled as neural model inference", () => {
  const data = makeNoctisModelProvenance({ respondingProvider: "local_native", attemptNumber: 3 });
  const sanitized = sanitizeNoctisPublicResponseProvenance(data);
  assert.equal(sanitized?.source_kind, "native_fallback");
  assert.equal(sanitized?.responding_provider, "local_native");
  assert.equal(sanitized?.provider_reported_model, null);
});

test("specialist route origin remains a route, not a model identity assertion", () => {
  const data = makeNoctisRouteProvenance("cve_intelligence");
  const sanitized = sanitizeNoctisPublicResponseProvenance({ ...data, raw_answer: "secret" });
  assert.equal(sanitized?.source_kind, "specialist");
  assert.equal(sanitized?.route_id, "cve_intelligence");
  assert.equal(sanitized?.model_gateway_attribution, "not_available");
  assert.equal(Object.hasOwn(sanitized, "raw_answer"), false);
});

test("untrusted or incompatible origin input is omitted rather than leaked", () => {
  for (const invalid of [null, undefined, "model", [], {}, { protocol: "invalid", bearer: "abc" },
    { protocol: "noctis.route.v1", route_id: "client_named_custom", source_kind: "specialist", model_gateway_attribution: "not_available" },
    { protocol: "noctis.gateway.v1", source_kind: "model_gateway", responding_provider: "foo", fallback_used: false },
  ]) {
    assert.equal(sanitizeNoctisPublicResponseProvenance(invalid), null);
  }
});

test("provider-supplied secrets or malformed model labels are dropped", () => {
  const data = makeNoctisModelProvenance({
    requestedProvider: "openai", respondingProvider: "openai", attemptedModel: "sk-sensitive", providerReportedModel: "gpt 4o;token", attemptNumber: 1,
  });
  const sanitized = sanitizeNoctisPublicResponseProvenance(data);
  assert.equal(sanitized?.attempted_model, null);
  assert.equal(sanitized?.provider_reported_model, null);
  assert.equal(sanitized?.responding_provider, "openai");
});
