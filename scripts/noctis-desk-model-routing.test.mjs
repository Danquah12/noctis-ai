/**
 * Real-source branch regression coverage for the Noctis ordinary-answer path.
 * Providers are mocked; these tests make no network calls and prove no live-model quality.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { makeNoctisRouteProvenance } from "../src/lib/noctis-route-provenance.mjs";

const sourceFile = process.env.NOCTIS_MODEL_ROUTING_SOURCE
  ? resolve(process.env.NOCTIS_MODEL_ROUTING_SOURCE)
  : new URL("../src/lib/noctis-desk.server.ts", import.meta.url);
const source = readFileSync(sourceFile, "utf8");
const startMarker = "  const plain = !design && !resourcePlan(question)";
const endMarker = "  const stance = [";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "ordinary-answer branch was not located");
assert.equal(source.indexOf(startMarker, start + 1), -1, "branch selector must be unique");
const branch = source.slice(start, end);
const gatewayImport = 'const { modelChat } = await import("@/lib/video-mind.server");';
assert.equal(branch.split(gatewayImport).length - 1, 1, "expected one gateway import");
const instrumented = branch.replace(gatewayImport, "const { modelChat } = gateway;");
assert.ok(!/\bimport\s*\(/.test(instrumented), "no unexpected imports in sandbox");
const runnable = stripTypeScriptTypes(
  "async function run(env) {\n" +
  "const { design, resourcePlan, question, hasHardRows, seeing, strict, fresh,\n" +
  "recallTrainedAnswer, spoken, lessonBlock, TEACH, style, wantsCode,\n" +
  "persistedRules, notes, turns, toChatMessage, gateway, makeNoctisRouteProvenance } = env;\n" +
  instrumented + "\nreturn { skipped: true };\n}",
  { mode: "strip" }
);
const invoke = runInNewContext("(" + runnable + ")", {}, { timeout: 1000 });

function setup(brain, opts = {}, reply = { text: "Model reply" }) {
  const calls = [];
  const turns = opts.turns || [{ role: "user", content: "Explain this topic." }];
  const env = {
    design: false, resourcePlan: () => false, question: "Explain this topic.",
    hasHardRows: false, seeing: false, strict: false, fresh: false,
    recallTrainedAnswer: () => null, spoken: "English", lessonBlock: () => "",
    TEACH: "Base instruction", style: { brain }, wantsCode: false, persistedRules: "", notes: "",
    turns, toChatMessage: turn => turn, makeNoctisRouteProvenance,
    ...opts,
    gateway: { modelChat: async (messages, config) => { calls.push({ messages, config }); return reply; } },
  };
  return { calls, invoke: () => invoke(env) };
}

for (const provider of ["gemini", "openai", "groq", "xai", "custom"]) {
  for (const wantsCode of [false, true]) {
    test("passes " + provider + " selection for " + (wantsCode ? "coding" : "chat"), async () => {
      const brain = Object.freeze({
        provider, model: "test-model", apiKey: "dummy-not-real",
        ...(provider === "custom" ? { endpoint: "https://model.invalid/v1" } : {}),
      });
      const h = setup(brain, { wantsCode });
      assert.equal((await h.invoke()).text, "Model reply");
      assert.equal(h.calls.length, 1);
      assert.strictEqual(h.calls[0].config.brain, brain);
      assert.equal(h.calls[0].config.maxTokens, 4096);
      assert.equal(h.calls[0].config.temperature, 0.5);
      assert.ok(!JSON.stringify(h.calls[0].messages).includes("dummy-not-real"));
      if (wantsCode) assert.ok(h.calls[0].messages.some(m => m.role === "system" && m.content.includes("runnable code")));
    });
  }
}
test("keyless selection is passed to server provider resolver", async () => {
  const brain = Object.freeze({ provider: "gemini", model: "test-keyless" });
  const h = setup(brain); await h.invoke();
  assert.strictEqual(h.calls[0].config.brain, brain);
});
test("no selection preserves server default behavior", async () => {
  const h = setup(undefined); await h.invoke();
  assert.equal(h.calls[0].config.brain, undefined);
});
test("conversation history retains last 24 turns in order", async () => {
  const turns = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user", content: "turn " + i,
  }));
  const h = setup({ provider: "openai" }, { turns }); await h.invoke();
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].messages.filter(m => m.role !== "system"))), turns.slice(-24));
});
test("stored answer still short-circuits without model call", async () => {
  const h = setup({ provider: "openai" }, { recallTrainedAnswer: () => ({ answer: "Stored lesson" }) });
  const reply = await h.invoke();
  assert.equal(reply.text, "Stored lesson");
  assert.equal(reply.provenance?.source_kind, "stored_answer");
  assert.equal(h.calls.length, 0);
});
test("gateway error is propagated", async () => {
  const h = setup({ provider: "openai" }, {}, { error: "No provider available" });
  assert.equal((await h.invoke()).error, "No provider available");
});
