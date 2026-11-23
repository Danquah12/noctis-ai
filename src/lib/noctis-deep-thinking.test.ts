import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NOCTIS_ENGINE_REGISTRY,
  NOCTIS_ENGINE_IDS,
  resolveNoctisEngine,
  mapWorkspaceModelToEngineId,
  parseThinkEnvelope,
  ensureDeepThinkEnvelope,
} from "./noctis-engine-registry.ts";
import { handleNaturalOncologyQuery } from "./noctis-oncology-immunotherapy.ts";

const EXPECTED_ALL_33_IDS = [
  // 8 Frontier Models
  "noctis-ultra",
  "noctis-o3-deep",
  "claude-3-7-sonnet",
  "gpt-4o",
  "gemini-35-flash-lite",
  "grok-3",
  "deepseek-r1",
  "llama-3-3-70b",
  // 5 Specialist Engines
  "noctis-cyber-dfir",
  "noctis-juris-law",
  "noctis-clinical-dx",
  "noctis-invest-alpha",
  "noctis-theology-exegesis",
  // 4 Workspaces
  "desk-forge",
  "desk-console",
  "desk-plugins",
  "desk-redteam",
  // 16 Sovereign Suites
  "suite-canary",
  "suite-war-room",
  "suite-digital-twin",
  "suite-pqc",
  "suite-holodeck",
  "suite-remediation",
  "suite-truth-ledger",
  "suite-zk-proof",
  "suite-swarm",
  "suite-air-gap",
  "suite-circuit-breaker",
  "suite-enclave",
  "suite-cognitive",
  "suite-crisis",
  "suite-steganography",
  "suite-lex",
];

describe("Noctis Universal Deep Thinking Registry & Envelope", () => {
  it("contains all 33 models, specialists, workspaces, and sovereign suites with deep thinking metadata", () => {
    assert.equal(EXPECTED_ALL_33_IDS.length, 33);
    assert.equal(NOCTIS_ENGINE_IDS.length, 33);

    for (const id of EXPECTED_ALL_33_IDS) {
      const profile = NOCTIS_ENGINE_REGISTRY[id];
      assert.ok(profile, `Missing registry profile for ${id}`);
      assert.equal(profile.id, id);
      assert.ok(profile.name.length > 0, `Missing name for ${id}`);
      assert.ok(profile.name.startsWith("Noctis "), `Expected Noctis-branded name for ${id}, got "${profile.name}"`);
      assert.ok(profile.thinkingLabel.length > 0, `Missing thinkingLabel for ${id}`);
      assert.equal(profile.thinkingStages.length, 4, `Expected 4 stages for ${id}`);
      assert.ok(profile.thinkingStages.every((s) => typeof s === "string" && s.length > 5));
      assert.match(profile.thinkingDirective, /<think>[\s\S]*<\/think>/i, `Directive for ${id} must require <think>...</think>`);
    }
  });

  it("resolves IDs, Noctis-branded engine names, workspace dropdown display names, and unknown fallback cleanly while keeping embedded engines identical", () => {
    const expectedMappings: Array<[string, string, string | undefined]> = [
      ["Noctis Apex", "claude-3-7-sonnet", "noctis"],
      ["Noctis Astra", "gpt-4o", "openai"],
      ["Noctis Cortex Flash", "gemini-35-flash-lite", "gemini"],
      ["Noctis Sentinel", "grok-3", "xai"],
      ["Noctis Axiom", "deepseek-r1", "noctis"],
      ["Noctis Velocity 70B", "llama-3-3-70b", "groq"],
      ["Noctis XTRIKE Cyber DFIR", "noctis-cyber-dfir", "noctis"],
      ["Noctis Investment Alpha", "noctis-invest-alpha", "noctis"],
      ["Noctis Bible & Exegesis", "noctis-theology-exegesis", "noctis"],
    ];

    for (const [displayName, embeddedId, expectedHint] of expectedMappings) {
      const resolved = resolveNoctisEngine(displayName);
      assert.equal(resolved.id, embeddedId);
      assert.equal(resolved.name, displayName);
      assert.equal(resolved.preferredProviderHint, expectedHint);
    }

    assert.equal(resolveNoctisEngine("claude-3-7-sonnet").id, "claude-3-7-sonnet");
    assert.equal(resolveNoctisEngine("XTRIKE Cyber DFIR").id, "noctis-cyber-dfir");
    assert.equal(resolveNoctisEngine("Noctis Ultra (Deep Sovereign Reasoning)").id, "noctis-ultra");
    assert.equal(resolveNoctisEngine("nonexistent-engine").id, "noctis-ultra");

    assert.equal(mapWorkspaceModelToEngineId("Noctis Cortex Flash (Ultra-Fast Core)", "desk-console"), "gemini-35-flash-lite");
    assert.equal(mapWorkspaceModelToEngineId("Noctis Astra High (Omni Multimodal)", "desk-console"), "gpt-4o");
    assert.equal(mapWorkspaceModelToEngineId("Noctis Velocity 70B (500 t/s Edge LPU)", "desk-forge"), "llama-3-3-70b");
    assert.equal(mapWorkspaceModelToEngineId("Noctis Sentinel (Deductive Autonomous Audit)", "desk-redteam"), "grok-3");
    assert.equal(mapWorkspaceModelToEngineId("Unknown Local Model", "desk-forge"), "desk-forge");
  });

  it("extracts <think>...</think> across LF/CRLF cleanly and strips it from body", () => {
    const raw = "<think>\r\nStep 1: Verify K+.\r\nStep 2: Confirm unit.\r\n</think>\r\n\r\nFinal answer here.";
    const parsed = parseThinkEnvelope(raw);
    assert.equal(parsed.thought, "Step 1: Verify K+.\r\nStep 2: Confirm unit.");
    assert.equal(parsed.body, "Final answer here.");

    const noThink = parseThinkEnvelope("Just the body");
    assert.equal(noThink.thought, "");
    assert.equal(noThink.body, "Just the body");
  });

  it("wraps deterministic outputs in <think> while preserving raw JSON, clinical fail-closed lockouts, and existing envelopes", () => {
    const wrapped = ensureDeepThinkEnvelope("## CVE-2024-3400 Advisory\nPatch immediately.", {
      shouldThink: true,
      engineId: "noctis-cyber-dfir",
      prompt: "Audit CVE-2024-3400",
      routeSummary: "Checked NVD and CISA KEV metadata",
    });
    assert.match(wrapped, /^<think>\n[\s\S]*XTRIKE Cyber DFIR[\s\S]*<\/think>\n\n## CVE-2024-3400 Advisory/);

    const existing = "<think>\nExisting model reasoning\n</think>\n\nBody text.";
    assert.equal(
      ensureDeepThinkEnvelope(existing, {
        shouldThink: true,
        engineId: "claude-3-7-sonnet",
        prompt: "Test",
        routeSummary: "Test",
      }),
      existing,
    );

    const jsonOut = '{"status":"ok","value":42}';
    assert.equal(
      ensureDeepThinkEnvelope(jsonOut, {
        shouldThink: true,
        wantsRawJson: false,
        prompt: "Test",
        routeSummary: "Test",
      }),
      jsonOut,
    );
    assert.equal(
      ensureDeepThinkEnvelope("Plain text", {
        shouldThink: true,
        wantsRawJson: true,
        prompt: "Return only JSON",
        routeSummary: "Test",
      }),
      "Plain text",
    );

    const lockout = "## RELEASE_BLOCKED — CLINICAL_VALIDATION_FAILED\nMissing data.";
    assert.equal(
      ensureDeepThinkEnvelope(lockout, {
        shouldThink: true,
        engineId: "noctis-clinical-dx",
        prompt: "Evaluate ICU patient",
        routeSummary: "Safety gate check",
      }),
      lockout,
    );

    assert.equal(
      ensureDeepThinkEnvelope("Bypassed think", {
        shouldThink: false,
        prompt: "Test",
        routeSummary: "Test",
      }),
      "Bypassed think",
    );
  });

  it("does not misroute mTLS or network TLS cybersecurity queries to Oncology Tumor Lysis Syndrome", () => {
    assert.equal(
      handleNaturalOncologyQuery(
        "Architect a production-grade Zero-Trust mTLS authentication gateway in TypeScript",
      ),
      null,
    );
    assert.equal(
      handleNaturalOncologyQuery("Why does zero-trust mTLS prevent replay attacks? 3 bullets."),
      null,
    );

    const clinicalTls = handleNaturalOncologyQuery(
      "Patient with TLS and uric acid 11.2, potassium 6.4, should we start sodium bicarbonate alkalinization?",
    );
    assert.ok(clinicalTls);
    assert.match(clinicalTls, /NOCTIS-ONC-IRAE-001/);
  });
});
