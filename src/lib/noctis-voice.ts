/**
 * Noctis Live Two-Way Voice Mode Engine
 * Manages streaming audio levels, real-time client SpeechRecognition (STT),
 * fallback server Whisper ingestion, and natural dual-mode speech synthesis (OpenAI TTS + Web Speech API).
 */

export type VoicePersona = "alloy" | "nova" | "onyx" | "echo" | "natural";
export type VoicePhase = "idle" | "listen" | "think" | "speak";

export interface VoicePersonaInfo {
  id: VoicePersona;
  label: string;
  tone: string;
  gender: "neutral" | "female" | "male";
  accent: string;
}

export const VOICE_PERSONAS: VoicePersonaInfo[] = [
  { id: "alloy", label: "Alloy", tone: "Balanced & Versatile", gender: "neutral", accent: "#38bdf8" },
  { id: "nova", label: "Nova", tone: "Warm, Expressive & Engaging", gender: "female", accent: "#f472b6" },
  { id: "onyx", label: "Onyx", tone: "Deep, Calm & Authoritative", gender: "male", accent: "#a78bfa" },
  { id: "echo", label: "Echo", tone: "Crisp, Clear & Direct", gender: "male", accent: "#34d399" },
  { id: "natural", label: "Natural Browser", tone: "Client-side Native Voice", gender: "neutral", accent: "#e4b86a" },
];

/**
 * Checks if Speech Recognition (Web Speech API) is supported in the current environment.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Detects if the current user agent is Brave Browser.
 * Brave disables Google Speech Services by default under its privacy shields.
 */
export function isBraveBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const nav = navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } };
  return Boolean(nav.brave || /Brave/i.test(navigator.userAgent));
}

/**
 * Checks if Speech Synthesis (Web Speech API) is supported in the current environment.
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== "undefined");
}

/**
 * Sanitizes markdown, LaTeX math formulas, citations, and table formatting for natural spoken speech.
 */
export function cleanVoiceText(rawText: string, maxLength = 1200): string {
  if (!rawText) return "";

  let spoken = rawText;

  // 1. Remove code blocks
  spoken = spoken.replace(/```[\s\S]*?```/g, " [Code snippet omitted for speech] ");

  // 2. Remove markdown tables
  spoken = spoken.replace(/\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+/g, " [Detailed table summary available in chat] ");

  // 3. Remove metadata gates and callout blocks
  spoken = spoken.replace(/>\s*\[!(?:IMPORTANT|NOTE|WARNING|TIP|CAUTION)\]/gi, " ");
  spoken = spoken.replace(/>/g, " ");

  // 4. Clean LaTeX math formatting ($...$ and $$...$$)
  spoken = spoken.replace(/\$\$[\s\S]*?\$\$/g, " ");
  spoken = spoken.replace(/\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|tau|phi|omega)/gi, (m) => m.slice(1));
  spoken = spoken.replace(/\\times/gi, " times ");
  spoken = spoken.replace(/\$([^\$]+)\$/g, "$1");
  spoken = spoken.replace(/\\text\{([^}]+)\}/g, "$1");
  spoken = spoken.replace(/\\[a-zA-Z]+/g, " ");
  spoken = spoken.replace(/\\%/g, "%");

  // 5. Remove audit/claim status stamps
  spoken = spoken.split(/\b(?:Evidence status|Claim standing|Audit trail):/i)[0];

  // 6. Clean markdown bold, italics, links, and headers
  spoken = spoken.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  spoken = spoken.replace(/[#*`_~]/g, " ");

  // 7. Collapse whitespace and truncate to reasonable speech turn limit
  spoken = spoken.replace(/\s+/g, " ").trim();

  return spoken.slice(0, maxLength);
}

/**
 * Executes natural speech synthesis using the browser Web Speech API.
 * Returns a Promise that resolves when speech completes or rejects on error.
 */
// Global reference to prevent Chromium / V8 garbage collection during active speech playback
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakBrowserVoice(
  text: string,
  persona: VoicePersona = "alloy",
  rate = 1.05
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve(false);
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const cleaned = cleanVoiceText(text, 650);
      if (!cleaned) {
        resolve(true);
        return;
      }

      // If already speaking, cancel previous
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      activeUtterance = utterance; // Keep reference to prevent GC!

      utterance.lang = "en-US";
      utterance.rate = rate;
      utterance.pitch = persona === "nova" ? 1.15 : persona === "onyx" ? 0.85 : 1.0;

      const assignVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          let chosen = null;
          if (persona === "nova") {
            chosen = voices.find((v) => /samantha|zira|female|karen|victoria|jenny/i.test(v.name) && v.lang.startsWith("en"));
          } else if (persona === "onyx") {
            chosen = voices.find((v) => /david|george|male|daniel|guy|guy/i.test(v.name) && v.lang.startsWith("en"));
          } else if (persona === "echo") {
            chosen = voices.find((v) => /alex|mark|natural|aria/i.test(v.name) && v.lang.startsWith("en"));
          } else {
            chosen = voices.find((v) => /google|natural|aria|jenny/i.test(v.name) && v.lang.startsWith("en"));
          }
          if (!chosen) chosen = voices.find((v) => v.lang.startsWith("en"));
          if (chosen) utterance.voice = chosen;
        }
      };

      assignVoice();
      if (!utterance.voice && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = assignVoice;
      }

      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        activeUtterance = null;
        resolve(true);
      };

      utterance.onend = done;
      utterance.onerror = (e) => {
        done();
      };

      // Workaround for Chrome auto-pause bug during longer utterances
      const keepAlive = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          window.clearInterval(keepAlive);
        } else {
          window.speechSynthesis.resume();
        }
      }, 3000);

      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      resolve(false);
    }
  });
}

/**
 * Creates an AudioContext AnalyzerNode on an active MediaStream
 * to stream normalized real-time audio volume levels (0.0 to 1.0).
 */
export function createAudioLevelAnalyzer(
  stream: MediaStream,
  onLevel: (level: number) => void
): { stop: () => void } {
  let active = true;
  let intervalId: number | null = null;
  let audioCtx: AudioContext | null = null;

  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtor) {
      return { stop: () => {} };
    }

    audioCtx = new AudioCtor();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    intervalId = window.setInterval(() => {
      if (!active) return;
      analyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i];
      }
      const avg = sum / buffer.length;
      // Normalize to 0.0 - 1.0 range with non-linear boost for speech sensitivity
      const normalized = Math.min(1.0, Math.pow(avg / 128, 1.2));
      onLevel(normalized);
    }, 60);
  } catch {
    // Graceful degrade if audio context fails
  }

  return {
    stop: () => {
      active = false;
      if (intervalId !== null) window.clearInterval(intervalId);
      if (audioCtx && audioCtx.state !== "closed") {
        void audioCtx.close();
      }
      onLevel(0);
    },
  };
}

/**
 * Listens for speech using client-side Web Speech Recognition with real-time interim updates.
 */
export function listenBrowserSpeech(options: {
  onInterim?: (text: string) => void;
  lang?: string;
  timeoutMs?: number;
}): Promise<{ text: string; error?: string }> {
  return new Promise((resolve) => {
    if (!isSpeechRecognitionSupported()) {
      resolve({ text: "", error: "SpeechRecognition not supported in this browser." });
      return;
    }

    try {
      const w = window as unknown as {
        SpeechRecognition?: new () => any;
        webkitSpeechRecognition?: new () => any;
      };
      const RecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!RecognitionCtor) {
        resolve({ text: "", error: "Recognition constructor unavailable." });
        return;
      }

      const recognition = new RecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = options.lang || "en-US";

      let finalTranscript = "";
      let settled = false;

      const finish = (resultText: string, err?: string) => {
        if (settled) return;
        settled = true;
        try {
          recognition.stop();
        } catch {}
        resolve({ text: resultText.trim(), error: err });
      };

      const safetyTimer = window.setTimeout(() => {
        finish(finalTranscript);
      }, options.timeoutMs || 15000);

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript + " ";
          } else {
            interim += item[0].transcript;
          }
        }
        if (options.onInterim) {
          options.onInterim((finalTranscript + interim).trim());
        }
      };

      recognition.onerror = (event: any) => {
        window.clearTimeout(safetyTimer);
        const errType = event?.error || "unknown";
        if (errType === "no-speech") {
          finish(finalTranscript);
        } else if (errType === "network") {
          const brave = isBraveBrowser();
          const msg = brave
            ? "Brave Privacy Shield blocked speech services. To enable, toggle 'Use Google speech services' under brave://settings/privacy or switch to Chrome/Edge."
            : "Network error in speech service. Please verify your connection or use Chrome/Edge/Safari.";
          finish(finalTranscript, msg);
        } else if (errType === "not-allowed" || errType === "service-not-allowed") {
          finish(finalTranscript, "Microphone access or speech service was not allowed. Please grant microphone permissions in your address bar.");
        } else {
          finish(finalTranscript, `Speech recognition error: ${errType}`);
        }
      };

      recognition.onend = () => {
        window.clearTimeout(safetyTimer);
        finish(finalTranscript);
      };

      recognition.start();
    } catch (err: any) {
      resolve({ text: "", error: err?.message || "Failed to initialize microphone." });
    }
  });
}
