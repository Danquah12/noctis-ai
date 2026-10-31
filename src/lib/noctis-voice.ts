/**
 * Noctis Live Two-Way Voice Mode Engine
 * Manages streaming audio levels, real-time client SpeechRecognition (STT),
 * fallback server Whisper ingestion, and dual-mode human speech synthesis
 * (OpenAI Studio Neural TTS + Browser Natural Human Web Speech API).
 */

export type VoicePersona = "alloy" | "nova" | "onyx" | "echo" | "natural";
export type VoicePhase = "idle" | "listen" | "think" | "speak";

export interface VoicePersonaInfo {
  id: VoicePersona;
  label: string;
  tone: string;
  gender: "neutral" | "female" | "male";
  accent: string;
  description: string;
}

export const VOICE_PERSONAS: VoicePersonaInfo[] = [
  { id: "alloy", label: "Alloy", tone: "Balanced & Versatile", gender: "neutral", accent: "#38bdf8", description: "Studio-balanced neural tone suitable for all conversational queries." },
  { id: "nova", label: "Nova", tone: "Warm, Expressive & Engaging", gender: "female", accent: "#f472b6", description: "Warm, energetic, and expressive conversational human voice." },
  { id: "onyx", label: "Onyx", tone: "Deep, Calm & Authoritative", gender: "male", accent: "#a78bfa", description: "Deep, resonant, and calm authoritative executive voice." },
  { id: "echo", label: "Echo", tone: "Crisp, Clear & Direct", gender: "male", accent: "#34d399", description: "Crisp, precise, and articulate cadence with studio clarity." },
  { id: "natural", label: "Natural Browser", tone: "Device Neural / Native", gender: "neutral", accent: "#e4b86a", description: "Online neural voice provided natively by Edge, Chrome, or Safari." },
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
 * Sanitizes markdown, LaTeX math formulas, citations, and table formatting
 * into natural, fully intelligible spoken English without mid-sentence cutoffs.
 */
export function cleanVoiceText(rawText: string, maxLength = 1800): string {
  if (!rawText) return "";

  let spoken = rawText;

  // 1. Remove code blocks with clean spoken transition
  spoken = spoken.replace(/```[\s\S]*?```/g, " [Code snippet omitted for speech] ");
  spoken = spoken.replace(/`([^`]+)`/g, "$1");

  // 2. Remove markdown tables
  spoken = spoken.replace(/\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+/g, " [Detailed table summary available in chat] ");

  // 3. Remove metadata gates and callout blocks
  spoken = spoken.replace(/>\s*\[!(?:IMPORTANT|NOTE|WARNING|TIP|CAUTION)\]/gi, " ");
  spoken = spoken.replace(/^>\s*/gm, "");

  // 4. Units and currencies for human pronunciation (before LaTeX stripping)
  spoken = spoken.replace(/\$(\d+(?:\.\d+)?)\s*(?:billion|B)\b/gi, "$1 billion dollars");
  spoken = spoken.replace(/\$(\d+(?:\.\d+)?)\s*(?:million|M)\b/gi, "$1 million dollars");
  spoken = spoken.replace(/\$(\d+(?:\.\d+)?)\s*(?:thousand|K)\b/gi, "$1 thousand dollars");
  spoken = spoken.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, "$1 dollars");
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*MWh\b/gi, "$1 megawatt hours");
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*kWh\b/gi, "$1 kilowatt hours");
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*GW\b/gi, "$1 gigawatts");
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*MW\b/gi, "$1 megawatts");

  // 5. Clean LaTeX math formatting ($...$ and $$...$$)
  spoken = spoken.replace(/\$\$[\s\S]*?\$\$/g, " ");
  spoken = spoken.replace(/\\times/gi, " times ");
  spoken = spoken.replace(/\\pm/gi, " plus or minus ");
  spoken = spoken.replace(/\\approx/gi, " approximately ");
  spoken = spoken.replace(/\\neq/gi, " does not equal ");
  spoken = spoken.replace(/\\le\b|\\leq\b/gi, " less than or equal to ");
  spoken = spoken.replace(/\\ge\b|\\geq\b/gi, " greater than or equal to ");
  spoken = spoken.replace(/\\sqrt\{([^}]+)\}/gi, " square root of $1 ");
  spoken = spoken.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/gi, " $1 over $2 ");
  spoken = spoken.replace(/\\Delta/g, " delta ");
  spoken = spoken.replace(/\\sum/g, " sum of ");
  spoken = spoken.replace(/\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|tau|phi|omega)/gi, (m) => m.slice(1));
  spoken = spoken.replace(/\\text\{([^}]+)\}/g, "$1");
  spoken = spoken.replace(/\$([^\$]+)\$/g, "$1");
  spoken = spoken.replace(/\$/g, "");
  spoken = spoken.replace(/\\[a-zA-Z]+/g, " ");
  spoken = spoken.replace(/\\%/g, "%");

  // 6. Common abbreviations expanded into natural spoken English
  spoken = spoken.replace(/\be\.g\.,?\s*/gi, "for example, ");
  spoken = spoken.replace(/\bi\.e\.,?\s*/gi, "that is, ");
  spoken = spoken.replace(/\betc\.\b/gi, "etcetera");
  spoken = spoken.replace(/\bvs\.?\s*/gi, " versus ");
  spoken = spoken.replace(/\bapprox\.\s*/gi, "approximately ");

  // 7. Remove audit/claim status stamps
  spoken = spoken.split(/\b(?:Evidence status|Claim standing|Audit trail):/i)[0];

  // 8. Clean markdown links, headers, bold, italics, bullets
  spoken = spoken.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  spoken = spoken.replace(/^#+\s+/gm, "");
  spoken = spoken.replace(/^[*\-+]\s+/gm, "");
  spoken = spoken.replace(/[#*`_~]/g, " ");

  // 9. Collapse whitespace
  spoken = spoken.replace(/\s+/g, " ").trim();

  // 10. Sentence-boundary truncation: Never truncate mid-sentence or mid-word
  if (spoken.length > maxLength) {
    const candidate = spoken.slice(0, maxLength);
    const lastPunctuation = Math.max(
      candidate.lastIndexOf(". "),
      candidate.lastIndexOf("! "),
      candidate.lastIndexOf("? ")
    );
    if (lastPunctuation > maxLength * 0.5) {
      spoken = candidate.slice(0, lastPunctuation + 1);
    } else {
      const lastSpace = candidate.lastIndexOf(" ");
      spoken = (lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate) + ".";
    }
  }

  return spoken;
}

/**
 * Intelligently scores and selects the highest-quality human/natural browser voice,
 * strongly prioritizing neural and online voices over legacy robotic synthesizers.
 */
export function pickHumanBrowserVoice(
  voices: SpeechSynthesisVoice[],
  persona: VoicePersona = "alloy",
  lang = "en"
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
  const candidatePool = langVoices.length > 0 ? langVoices : voices;

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    let score = 0;
    const name = v.name.toLowerCase();

    // 1. Modern neural / natural online voices (Highest quality)
    if (name.includes("natural")) score += 100;
    if (name.includes("neural")) score += 95;
    if (name.includes("online")) score += 90;
    if (name.includes("enhanced") || name.includes("premium")) score += 85;
    if (name.includes("siri")) score += 80;
    if (name.includes("google")) score += 75;

    // 2. Persona matching
    if (persona === "nova") {
      if (/jenny|samantha|victoria|karen|female|ava|emma|sonia/.test(name)) score += 35;
      else if (/aria/.test(name)) score += 25;
      if (/david|male|george|guy|mark|christopher|eric|roger/.test(name)) score -= 25;
    } else if (persona === "onyx") {
      if (/guy|christopher|eric|roger|steffan|alex|daniel|male|george/.test(name)) score += 35;
      else if (/david/.test(name)) score += 10;
      if (/female|zira|samantha|jenny|aria|victoria|ava/.test(name)) score -= 25;
    } else if (persona === "echo") {
      if (/aria|guy|alex|mark|natural/.test(name)) score += 25;
    } else if (persona === "alloy") {
      if (/aria|jenny|google|natural/.test(name)) score += 25;
    }

    // 3. Heavy penalty for legacy robotic desktop synthesizers (e.g. MS David Desktop)
    if (name.includes("desktop") || /microsoft david|microsoft zira/.test(name)) {
      score -= 50;
    }

    // 4. Online neural service preference
    if (v.localService === false) score += 10;

    return score;
  };

  const sorted = [...candidatePool].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0] || null;
}

// Global active audio and speech references
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let keepAliveTimer: number | null = null;

/**
 * Stops all currently active audio playback (both Web Speech and HTML5 Audio).
 */
export function stopCurrentVoicePlayback(): void {
  if (typeof window !== "undefined") {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioElement) {
      try {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        currentAudioElement = null;
      } catch {}
    }
    if (keepAliveTimer !== null) {
      window.clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }
}

/**
 * Executes natural speech synthesis using the browser Web Speech API.
 * Uses intelligent voice picking for maximum human warmth and clarity.
 */
export function speakBrowserVoice(
  text: string,
  persona: VoicePersona = "alloy",
  rate = 1.0
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

      const cleaned = cleanVoiceText(text, 1400);
      if (!cleaned) {
        resolve(true);
        return;
      }

      // If already speaking, cancel previous
      stopCurrentVoicePlayback();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      activeUtterance = utterance; // Keep reference to prevent GC!

      utterance.lang = "en-US";
      utterance.rate = rate;
      utterance.pitch = persona === "nova" ? 1.05 : persona === "onyx" ? 0.92 : 1.0;

      const assignVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const chosen = pickHumanBrowserVoice(voices, persona, "en");
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
        if (keepAliveTimer !== null) {
          window.clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        resolve(true);
      };

      utterance.onend = done;
      utterance.onerror = () => {
        done();
      };

      // Workaround for Chrome auto-pause bug during longer utterances
      keepAliveTimer = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          if (keepAliveTimer !== null) {
            window.clearInterval(keepAliveTimer);
            keepAliveTimer = null;
          }
        } else {
          window.speechSynthesis.resume();
        }
      }, 2500);

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
 * Unified human speech synthesis engine.
 * First attempts Studio-Quality Neural TTS (OpenAI tts-1 with human inflection & breathing)
 * when an API key or server endpoint is configured.
 * Seamlessly falls back to the device's highest-quality natural browser voice.
 */
export async function speakNoctisVoice(
  text: string,
  persona: VoicePersona = "alloy",
  options?: {
    apiKey?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<boolean> {
  stopCurrentVoicePlayback();

  // 1. Try Studio-Quality Human Neural TTS if available (OpenAI tts-1)
  if (persona !== "natural") {
    try {
      const { sayVibe } = await import("@/lib/noctis-api");
      const cleanedForTts = cleanVoiceText(text, 1800);
      if (cleanedForTts) {
        const ttsVoice = persona === "onyx" || persona === "nova" || persona === "echo" ? persona : "alloy";
        const res = await sayVibe({
          data: {
            text: cleanedForTts,
            voice: ttsVoice,
            speed: 1.0,
            keyOverride: options?.apiKey || "",
          },
        });
        const bag = res && typeof res === "object" ? (res as { audio?: unknown; result?: unknown; error?: unknown }) : {};
        const inner = bag.result && typeof bag.result === "object" ? (bag.result as { audio?: unknown; error?: unknown }) : bag;
        const audioUrl = typeof inner.audio === "string" ? inner.audio : "";
        if (audioUrl && audioUrl.startsWith("data:audio/")) {
          return await new Promise<boolean>((resolve) => {
            try {
              const audio = new Audio(audioUrl);
              currentAudioElement = audio;
              if (options?.onStart) options.onStart();
              audio.onended = () => {
                currentAudioElement = null;
                if (options?.onEnd) options.onEnd();
                resolve(true);
              };
              audio.onerror = () => {
                currentAudioElement = null;
                resolve(false);
              };
              audio.play().catch(() => resolve(false));
            } catch {
              resolve(false);
            }
          });
        }
      }
    } catch {
      // Fallback seamlessly to native browser speech synthesis
    }
  }

  // 2. Fallback to Browser Natural Human Voice
  if (options?.onStart) options.onStart();
  const success = await speakBrowserVoice(text, persona);
  if (options?.onEnd) options.onEnd();
  return success;
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
      }, options.timeoutMs || 20000);

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
