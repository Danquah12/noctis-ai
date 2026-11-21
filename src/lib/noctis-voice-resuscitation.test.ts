import { test } from "node:test";
import assert from "node:assert/strict";
import { processVoiceResuscitationCommand } from "./noctis-voice-resuscitation.ts";

test("Noctis Bedside Voice Resuscitation provides immediate verbal safety vetoes and directives", () => {
  // Test 1: Fluid Veto in Heart Failure
  const vetoResp = processVoiceResuscitationCommand("Order 30 mL/kg normal saline bolus immediately", {
    efPercent: 25,
  });
  assert.equal(vetoResp.safetyInterlockTriggered, true);
  assert.equal(vetoResp.visualHudAlert.urgencyTier, "SAFETY_INTERLOCK_VETO");
  assert.equal(vetoResp.verbalSynthesisDirective.includes("Hold fluids"), true);
  assert.equal(vetoResp.verbalSynthesisDirective.split(" ").length < 25, true);

  // Test 2: Slow Calcium Push Directive in Digoxin Toxicity
  const calciumResp = processVoiceResuscitationCommand("Rapid push calcium gluconate stat", {
    hasDigoxinToxicity: true,
  });
  assert.equal(calciumResp.safetyInterlockTriggered, true);
  assert.equal(calciumResp.verbalSynthesisDirective.includes("over 10 minutes"), true);

  // Test 3: Weight-Unmeasured DigiFab Empiric Directive
  const digiResp = processVoiceResuscitationCommand("What is the DigiFab dose?", {
    isWeightKnown: false,
  });
  assert.equal(digiResp.safetyInterlockTriggered, false);
  assert.equal(digiResp.verbalSynthesisDirective.includes("weight unmeasured"), true);
  assert.equal(digiResp.verbalSynthesisDirective.includes("10 vials"), true);

  // Test 4: Cryptographic seal validity
  assert.equal(digiResp.cryptographicSeal.length, 64);
});
