import test from "node:test";
import assert from "node:assert/strict";
import {
  getAudioContext,
  playHarmonicTone,
  playSovereignChime,
  stopAudioSynth,
} from "./noctis-audio-synth.ts";

test("Sovereign Audio Synthesizer (Zero External Dependencies)", async (t) => {
  await t.test("gracefully returns null/false in headless Node environment", () => {
    assert.equal(getAudioContext(), null);
    assert.equal(playHarmonicTone(432, 2), false);
    assert.equal(playSovereignChime(), false);
    assert.doesNotThrow(() => stopAudioSynth());
  });
});
