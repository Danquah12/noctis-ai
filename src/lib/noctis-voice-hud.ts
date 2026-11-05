/**
 * NOCTIS SOVEREIGN AMBIENT VOICE HUD ENGINE
 * Military-grade hands-free tactical voice command router, audio visualizer,
 * and synthesized voice telemetry for sovereign cyber defense operations.
 */

export type VoiceIntent =
  | "FUZZ_INVARIANTS"
  | "BLAST_RADIUS"
  | "AUDIT_PASSPORT"
  | "MESH_SWARM"
  | "DISPATCH_PR"
  | "EXECUTE_SANDBOX"
  | "CONVERT_TABLE"
  | "EXPLAIN_CODE"
  | "OPTIMIZE_CODE"
  | "MAKE_CONCISE"
  | "STATUS_CHECK"
  | "UNKNOWN";

export interface RecognizedVoiceCommand {
  rawTranscript: string;
  normalizedText: string;
  intent: VoiceIntent;
  confidence: number;
  tacticalConfirmation: string;
  actionPayload?: Record<string, unknown>;
  timestamp: string;
}

export interface VoiceToneConfig {
  frequency: number;
  durationMs: number;
  type: "sine" | "triangle" | "sawtooth" | "square";
  gain: number;
}

/**
 * Normalizes input voice transcript by trimming, lowercasing, and stripping punctuation.
 */
export function normalizeVoiceInput(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[.,\/#!$%\^&\*;:{}=`~()?'"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classifies spoken voice input into tactical sovereign intents with confidence scoring.
 */
export function parseVoiceIntent(transcript: string): RecognizedVoiceCommand {
  const norm = normalizeVoiceInput(transcript);
  const ts = new Date().toISOString();

  if (!norm) {
    return {
      rawTranscript: transcript,
      normalizedText: "",
      intent: "UNKNOWN",
      confidence: 0,
      tacticalConfirmation: "Standby. No acoustic signal detected.",
      timestamp: ts,
    };
  }

  // 1. Swarm Consensus Council
  if (
    norm.includes("swarm") ||
    norm.includes("council") ||
    norm.includes("consensus") ||
    norm.includes("assemble swarm") ||
    norm.includes("mesh swarm")
  ) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "MESH_SWARM",
      confidence: 0.98,
      tacticalConfirmation: "Acknowledged. Convening 4-agent Mesh Swarm Consensus Council.",
      timestamp: ts,
    };
  }

  // 2. Pre-Mortem Adversarial Fuzzer
  if (
    norm.includes("fuzz") ||
    norm.includes("fuzzer") ||
    norm.includes("pre mortem") ||
    norm.includes("premortem") ||
    norm.includes("invariant")
  ) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "FUZZ_INVARIANTS",
      confidence: 0.96,
      tacticalConfirmation: "Executing Pre-Mortem Adversarial Invariant Fuzzer across 4 threat vectors.",
      timestamp: ts,
    };
  }

  // 3. Operational Blast Radius
  if (
    norm.includes("blast") ||
    norm.includes("radius") ||
    norm.includes("collateral") ||
    norm.includes("downtime") ||
    norm.includes("rollback sla")
  ) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "BLAST_RADIUS",
      confidence: 0.95,
      tacticalConfirmation: "Computing operational blast radius and rollback restoration SLA.",
      timestamp: ts,
    };
  }

  // 4. Sovereign Audit Passport
  if (
    norm.includes("passport") ||
    norm.includes("audit") ||
    norm.includes("chain of custody") ||
    norm.includes("fips")
  ) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "AUDIT_PASSPORT",
      confidence: 0.97,
      tacticalConfirmation: "Attesting cryptographic Sovereign Audit Passport under FIPS 180-4 standard.",
      timestamp: ts,
    };
  }

  // 5. GitHub Pull Request Dispatch
  if (
    norm.includes("pull request") ||
    norm.includes("pr") ||
    norm.includes("github") ||
    norm.includes("dispatch pr") ||
    norm.includes("create pr")
  ) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "DISPATCH_PR",
      confidence: 0.94,
      tacticalConfirmation: "Synthesizing unified patch and opening autonomous GitHub PR dispatcher.",
      timestamp: ts,
    };
  }

  // 6. In-Browser WASM / MicroVM Sandbox Execution
  if (
    norm.includes("run code") ||
    norm.includes("execute") ||
    norm.includes("wasm") ||
    norm.includes("run sandbox") ||
    norm.includes("node")
  ) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "EXECUTE_SANDBOX",
      confidence: 0.93,
      tacticalConfirmation: "Spinning ephemeral in-browser micro-VM to execute target payload.",
      timestamp: ts,
    };
  }

  // 7. Convert to Table
  if (norm.includes("table") || norm.includes("tabular") || norm.includes("grid")) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "CONVERT_TABLE",
      confidence: 0.92,
      tacticalConfirmation: "Restructuring artifact telemetry into exhaustive tabular matrix.",
      timestamp: ts,
    };
  }

  // 8. Plain English Explanation
  if (norm.includes("explain") || norm.includes("plain english") || norm.includes("layperson")) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "EXPLAIN_CODE",
      confidence: 0.91,
      tacticalConfirmation: "Generating executive plain-English summary with safety guarantees.",
      timestamp: ts,
    };
  }

  // 9. Optimize & Tests
  if (norm.includes("optimize") || norm.includes("unit test") || norm.includes("tests")) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "OPTIMIZE_CODE",
      confidence: 0.90,
      tacticalConfirmation: "Synthesizing boundary test cases and applying performance optimizations.",
      timestamp: ts,
    };
  }

  // 10. Make Concise
  if (norm.includes("concise") || norm.includes("punchy") || norm.includes("shorten") || norm.includes("brief")) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "MAKE_CONCISE",
      confidence: 0.89,
      tacticalConfirmation: "Pruning redundant prose and condensing artifact to core findings.",
      timestamp: ts,
    };
  }

  // 11. Status Check
  if (norm.includes("status") || norm.includes("health") || norm.includes("ping") || norm.includes("enclave")) {
    return {
      rawTranscript: transcript,
      normalizedText: norm,
      intent: "STATUS_CHECK",
      confidence: 0.95,
      tacticalConfirmation: "All systems nominal. Zero-trust sovereign enclave operational.",
      timestamp: ts,
    };
  }

  return {
    rawTranscript: transcript,
    normalizedText: norm,
    intent: "UNKNOWN",
    confidence: 0.45,
    tacticalConfirmation: `Instruction noted: "${norm}". Routing to sovereign autonomous planner.`,
    timestamp: ts,
  };
}

/**
 * Returns tactical audio tone configuration for sovereign auditory feedback.
 */
export function getTacticalToneConfig(intent: VoiceIntent): VoiceToneConfig {
  switch (intent) {
    case "MESH_SWARM":
      return { frequency: 880, durationMs: 120, type: "sine", gain: 0.12 };
    case "FUZZ_INVARIANTS":
      return { frequency: 1046.5, durationMs: 140, type: "triangle", gain: 0.15 };
    case "BLAST_RADIUS":
      return { frequency: 659.25, durationMs: 100, type: "sine", gain: 0.1 };
    case "AUDIT_PASSPORT":
      return { frequency: 1174.66, durationMs: 160, type: "sine", gain: 0.14 };
    case "DISPATCH_PR":
      return { frequency: 987.77, durationMs: 130, type: "sine", gain: 0.12 };
    case "EXECUTE_SANDBOX":
      return { frequency: 783.99, durationMs: 110, type: "square", gain: 0.08 };
    case "STATUS_CHECK":
      return { frequency: 523.25, durationMs: 90, type: "sine", gain: 0.1 };
    default:
      return { frequency: 440, durationMs: 80, type: "sine", gain: 0.08 };
  }
}

/**
 * Synthesizes tactical audio cue in browser using Web Audio API safely.
 */
export function playTacticalFeedbackCue(intent: VoiceIntent): void {
  if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) {
    return;
  }
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const cfg = getTacticalToneConfig(intent);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(cfg.gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + cfg.durationMs / 1000);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + cfg.durationMs / 1000);
  } catch {
    // Audio contexts may be blocked by browser autoplay policies before user interaction
  }
}

/**
 * Uses SpeechSynthesis to enunciate tactical confirmations if enabled and available in browser.
 */
export function speakTacticalConfirmation(text: string, voiceRate: number = 1.05): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceRate;
    utterance.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const targetVoice =
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Enhanced") || v.name.includes("Google"))) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis error handled gracefully
  }
}
