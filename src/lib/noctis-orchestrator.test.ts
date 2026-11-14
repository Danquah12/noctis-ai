import test from "node:test";
import assert from "node:assert/strict";
import { buildRouteDirective, routeQuestion } from "./noctis-orchestrator.ts";

test("routes engineering design requests to reasoning with verification", () => {
  const question = "Design a 1,000-household microgrid with 10 kWh per household per day and 48-hour outage autonomy.";
  const route = routeQuestion(question);
  assert.equal(route.intent, "engineering");
  assert.equal(route.tool, "reason");
  assert.equal(route.verify, true);
});

test("routes vulnerability and exploitability questions to the cyber specialist", () => {
  const route = routeQuestion("Assess CVE-2025-12345 vulnerability exploitability and false positives.");
  assert.equal(route.intent, "cyber");
  assert.equal(route.tool, "specialist");
});

test("routes Bible questions to the library path", () => {
  const route = routeQuestion("Explain Ephesians in its historical and literary context.");
  assert.equal(route.intent, "bible");
  assert.equal(route.tool, "library");
});

test("route directive carries the decision but never fabricates tool execution", () => {
  const directive = buildRouteDirective("What is the latest unemployment rate?");
  assert.match(directive, /intent=current/);
  assert.match(directive, /preferred_tool=web/);
  assert.match(directive, /Never claim a tool result unless the corresponding integration actually returned it/);
});
