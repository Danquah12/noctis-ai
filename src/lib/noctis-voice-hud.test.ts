import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVoiceInput,
  parseVoiceIntent,
  getTacticalToneConfig,
} from "./noctis-voice-hud.ts";

describe("NOCTIS SOVEREIGN AMBIENT VOICE HUD — TEST SUITE", () => {
  test("Normalizes spoken voice inputs with punctuation removal", () => {
    const raw = "  Run the Pre-Mortem Fuzzer, please?! ";
    const clean = normalizeVoiceInput(raw);
    assert.equal(clean, "run the pre mortem fuzzer please");
  });

  test("Accurately classifies tactical voice commands to correct sovereign intents", () => {
    // 1. Mesh Swarm
    const cmd1 = parseVoiceIntent("Convene the mesh swarm council for consensus");
    assert.equal(cmd1.intent, "MESH_SWARM");
    assert.ok(cmd1.confidence >= 0.9);
    assert.match(cmd1.tacticalConfirmation, /Mesh Swarm Consensus Council/i);

    // 2. Pre-Mortem Fuzzer
    const cmd2 = parseVoiceIntent("Fuzz invariant boundaries right now");
    assert.equal(cmd2.intent, "FUZZ_INVARIANTS");
    assert.ok(cmd2.confidence >= 0.9);

    // 3. Operational Blast Radius
    const cmd3 = parseVoiceIntent("Calculate the operational blast radius and downtime");
    assert.equal(cmd3.intent, "BLAST_RADIUS");
    assert.ok(cmd3.confidence >= 0.9);

    // 4. Sovereign Audit Passport
    const cmd4 = parseVoiceIntent("Generate the cryptographic audit passport");
    assert.equal(cmd4.intent, "AUDIT_PASSPORT");
    assert.ok(cmd4.confidence >= 0.9);

    // 5. GitHub Pull Request Dispatch
    const cmd5 = parseVoiceIntent("Dispatch GitHub pull request for this patch");
    assert.equal(cmd5.intent, "DISPATCH_PR");
    assert.ok(cmd5.confidence >= 0.9);

    // 6. In-Browser WASM execution
    const cmd6 = parseVoiceIntent("Execute the sandbox microvm code");
    assert.equal(cmd6.intent, "EXECUTE_SANDBOX");
    assert.ok(cmd6.confidence >= 0.9);

    // 7. Status Check
    const cmd7 = parseVoiceIntent("System status check on enclave");
    assert.equal(cmd7.intent, "STATUS_CHECK");
    assert.ok(cmd7.confidence >= 0.9);
  });

  test("Generates distinct frequency tones for military auditory feedback", () => {
    const swarmTone = getTacticalToneConfig("MESH_SWARM");
    const fuzzTone = getTacticalToneConfig("FUZZ_INVARIANTS");
    const blastTone = getTacticalToneConfig("BLAST_RADIUS");

    assert.equal(swarmTone.frequency, 880);
    assert.equal(fuzzTone.frequency, 1046.5);
    assert.equal(blastTone.frequency, 659.25);
    assert.ok(fuzzTone.gain > 0);
  });
});
