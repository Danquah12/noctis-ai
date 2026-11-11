import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeNoctisRouteProvenance, readNoctisRouteProvenance } from "../src/lib/noctis-route-provenance.mjs";
import { makeNoctisModelProvenance, readNoctisModelProvenance } from "../src/lib/noctis-model-provenance.mjs";

const routes = {
  source_retrieval_report: "retrieval",
  science_formula_solver: "specialist",
  inline_math: "deterministic",
  cve_intelligence: "specialist",
  approved_qa_memory: "stored_answer",
  science_lab: "specialist",
  calculation_engine: "deterministic",
  knowledge_card: "stored_answer",
  missing_source_response: "unavailable",
  missing_chapter_response: "unavailable",
};

test("all fixed route identifiers map to their actual source category", () => {
  for (const [route, kind] of Object.entries(routes)) {
    const origin = makeNoctisRouteProvenance(route);
    assert.deepEqual(origin, {
      protocol: "noctis.route.v1", source_kind: kind, route_id: route,
      model_gateway_attribution: "not_available", model_identity_independently_verified: false,
    });
    assert.deepEqual(readNoctisRouteProvenance(origin), origin);
  }
});
test("route metadata cannot carry user prompts, secrets, or arbitrary handler names", () => {
  assert.throws(() => makeNoctisRouteProvenance("user:PRIVATE"), /Unknown/);
  assert.throws(() => makeNoctisRouteProvenance("__proto__"), /Unknown/);
  const input = { ...makeNoctisRouteProvenance("science_lab"), token: "SECRET", text: "private document", endpoint: "https://private" };
  const serialized = JSON.stringify(readNoctisRouteProvenance(input));
  assert.ok(!serialized.includes("SECRET"));
  assert.ok(!serialized.includes("private"));
});
test("contradictory, malformed, or unrecognized route reports are not trusted", () => {
  const good = makeNoctisRouteProvenance("cve_intelligence");
  const bad = [
    null, [], "cve_intelligence", {}, { ...good, protocol: "noctis.gateway.v1" },
    { ...good, route_id: "unknown" }, { ...good, source_kind: "model_gateway" },
    { ...good, model_gateway_attribution: "verified" },
  ];
  for (const value of bad) assert.equal(readNoctisRouteProvenance(value), null);
});
test("local route and provider gateway metadata remain distinct", () => {
  const route = makeNoctisRouteProvenance("inline_math");
  const gateway = makeNoctisModelProvenance({ respondingProvider: "openai", attemptedModel: "gpt-4o", attemptNumber: 1 });
  assert.equal(readNoctisModelProvenance(route), null);
  assert.equal(readNoctisRouteProvenance(gateway), null);
  assert.equal(readNoctisModelProvenance(gateway)?.source_kind, "model_gateway");
});
test("source short-circuits that are tagged preserve the existing reply body", () => {
  const source = readFileSync(new URL("../src/lib/noctis-desk.server.ts", import.meta.url), "utf8");
  for (const route of Object.keys(routes)) {
    assert.match(source, new RegExp('makeNoctisRouteProvenance\\("' + route + '"\\)'));
  }
  assert.match(source, /if \(math\) return \{ text: math, provenance: makeNoctisRouteProvenance\("inline_math"\) \};/);
  assert.match(source, /if \(trainedHit &&[\s\S]*?return \{ text: trainedHit\.answer, provenance: makeNoctisRouteProvenance\("approved_qa_memory"\)/);
  assert.match(source, /return \{ text: formatScienceResponse\(sol\), provenance: makeNoctisRouteProvenance\("science_formula_solver"\)/);
  assert.match(source, /return \{ text: formatCveResponse\(profile\), provenance: makeNoctisRouteProvenance\("cve_intelligence"\)/);
  assert.match(source, /return \{ text: attachHard\(scenario, reply\.text\), provenance: reply\.provenance \}/);
});
test("model gateway provenance is retained on both model-backed branches", () => {
  const source = readFileSync(new URL("../src/lib/noctis-desk.server.ts", import.meta.url), "utf8");
  assert.match(source, /return \{ text: result\.text, provenance: result\.provenance \};/);
  assert.match(source, /return \{ text: finalOut, provenance: result\.provenance \};/);
});
test("evaluation has separate gateway and non-model route attribution", () => {
  const source = readFileSync(new URL("./noctis-live-eval.mjs", import.meta.url), "utf8");
  assert.match(source, /readNoctisModelProvenance\(data\?\.provenance\)/);
  assert.match(source, /readNoctisRouteProvenance\(data\?\.provenance\)/);
  assert.match(source, /route_origin_reported_by_application: Boolean\(routeOrigin\)/);
  assert.match(source, /application_reported_origin: appOrigin \|\| routeOrigin/);
});
