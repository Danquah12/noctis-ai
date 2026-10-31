/**
 * Sovereign Web Audio & Sound Synthesizer
 *
 * Runs 100% in-browser using standard Web Audio API (AudioContext)
 * with zero external API dependencies, zero tokens, and zero network calls.
 * Provides binaural harmonic focus tones (432 Hz, Solfeggio 528 Hz),
 * acoustic alerts, and pure client-side speech synthesis.
 */

let activeAudioCtx: AudioContext | null = null;
let activeOscillator: OscillatorNode | null = null;
let activeGain: GainNode | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!activeAudioCtx || activeAudioCtx.state === "closed") {
    activeAudioCtx = new AudioCtx();
  }
  if (activeAudioCtx.state === "suspended") {
    void activeAudioCtx.resume();
  }
  return activeAudioCtx;
}

export function playHarmonicTone(freq = 432, durationSeconds = 3, waveType: OscillatorType = "sine"): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    stopAudioSynth();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Smooth envelope attack and release
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSeconds);

    activeOscillator = osc;
    activeGain = gain;

    osc.onended = () => {
      if (activeOscillator === osc) {
        activeOscillator = null;
        activeGain = null;
      }
    };
    return true;
  } catch (err) {
    console.warn("Harmonic tone synthesis unavailable:", err);
    return false;
  }
}

export function playSovereignChime(): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const chords = [528, 660, 792]; // Solfeggio harmonic triad
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const start = ctx.currentTime + idx * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 1.2);
    });
    return true;
  } catch {
    return false;
  }
}

export function stopAudioSynth() {
  try {
    if (activeOscillator) {
      activeOscillator.stop();
      activeOscillator.disconnect();
      activeOscillator = null;
    }
    if (activeGain) {
      activeGain.disconnect();
      activeGain = null;
    }
  } catch {
    /* ignore */
  }
}
