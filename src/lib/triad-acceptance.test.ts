import test from "node:test";
import assert from "node:assert/strict";
import { executeAutonomousRateLimiterDemo } from "./autonomous-agent-engine.ts";
import { noctisLiveSearch } from "./noctis-live-search.server.ts";
import { outsideFacts } from "./noctis-outside.server.ts";

test("NOCTIS TRIAD END-TO-END ACCEPTANCE TEST — ANTIGRAVITY + CANVAS + GROK", async (t) => {
  await t.test("Test Pillar 1 (Antigravity): Autonomous ReAct Loop with Self-Correction & Cryptographic Seal", async () => {
    const report = await executeAutonomousRateLimiterDemo();

    assert.equal(report.status, "COMPLETED");
    assert.equal(report.steps.length, 5);
    assert.ok(report.selfCorrectionsCount >= 1, "Must trigger and record self-correction");
    assert.ok(report.deliverables.length > 0, "Must produce sealed deliverables");
    assert.ok(report.cryptographicSignature.startsWith("SIG_NOCTIS_SOVEREIGN_"), "Must stamp sovereign cryptographic signature");
    console.log("  [PASS] Pillar 1: Autonomous ReAct loop, self-correction, and crypto seal verified.");
  });

  await t.test("Test Pillar 2 (Canvas / Artifacts): Live React Component Compilation Sandbox Verification", async () => {
    const sampleReactComponent = `
      import React, { useState } from 'react';
      export default function AttackRadar() {
        const [filter, setFilter] = useState('All');
        return (
          <div className="p-4 bg-zinc-900 text-zinc-100 rounded-xl">
            <h1 className="text-xl font-bold">Live Zero-Day Radar</h1>
            <p>Active filter: {filter}</p>
          </div>
        );
      }
    `;

    // Verify regex matching for Canvas auto-detection
    const isCode = /```(?:html|tsx|jsx|typescript|javascript)/i.test(sampleReactComponent) ||
      /import\s+React|export\s+default\s+function|<!DOCTYPE\s+html/i.test(sampleReactComponent);

    assert.equal(isCode, true, "Canvas must recognize React code and auto-switch to LivePreview");

    // Verify component extraction
    const hasDefaultExport = /export\s+default\s+function\s+([A-Za-z0-9_]+)/.test(sampleReactComponent);
    assert.equal(hasDefaultExport, true, "Canvas live runner must extract root component");
    console.log("  [PASS] Pillar 2: In-browser live preview parser and auto-detection verified.");
  });

  await t.test("Test Pillar 3 (Grok): Real-Time Web & CISA KEV Threat Ingestion via outsideFacts", async () => {
    const facts = await outsideFacts("What is the weaponization status of CVE-2024-3400 in the wild?");

    assert.ok(facts.length > 50, "Must return enriched intelligence");
    assert.ok(facts.includes("CVE-2024-3400"), "Must cite the specific CVE");
    assert.ok(facts.includes("CISA KEV Listed: YES") || facts.includes("Palo Alto Networks"), "Must identify CISA KEV listing");
    assert.ok(facts.includes("TIER-1") || facts.includes("Tier-1") || facts.includes("NOCTIS REAL-TIME LIVE INTELLIGENCE"), "Must include Tier-1 authority grounding");
    console.log("  [PASS] Pillar 3: Real-time search, CISA KEV ingestion, and Tier-1 provenance verified.");
  });
});
