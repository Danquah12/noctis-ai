/**
 * Noctis Live Two-Way Voice Mode Engine
 * Manages streaming audio levels, real-time client SpeechRecognition (STT),
 * fallback server Whisper ingestion, and dual-mode human speech synthesis
 * (OpenAI Studio Neural TTS + Browser Natural Human Web Speech API).
 */

export type VoicePersona =
  // American English (OpenAI Advanced Voice 2024-2026 + Core)
  | "maple"
  | "bubbie"
  | "spruce"
  | "breeze"
  | "juniper"
  | "cove"
  | "sol"
  | "alloy"
  | "nova"
  | "onyx"
  | "echo"
  | "natural"
  // Brazilian Portuguese
  | "rio"
  | "viola"
  // British English
  | "arbor"
  | "vale"
  // French
  | "rivage"
  | "aube"
  // German
  | "miko"
  | "sonna"
  // Hindi
  | "neer"
  | "leher"
  // Japanese
  | "rindo"
  | "himari"
  // Korean
  | "haetsal"
  | "hanul"
  // Mexican Spanish
  | "arrullo"
  | "tinta";

export type VoicePhase = "idle" | "listen" | "think" | "speak";

export interface VoicePersonaInfo {
  id: VoicePersona;
  label: string;
  language: string;
  languageCode: string;
  tone: string;
  gender: "neutral" | "female" | "male";
  accent: string;
  description: string;
  samplePhrase: string;
}

export interface VoiceLanguageGroup {
  language: string;
  languageCode: string;
  voices: VoicePersonaInfo[];
}

export const VOICE_PERSONAS: VoicePersonaInfo[] = [
  // American English
  {
    id: "maple",
    label: "Maple",
    language: "American English",
    languageCode: "en-US",
    tone: "Cheerful, bright & friendly",
    gender: "female",
    accent: "#38bdf8",
    description: "Warm, energetic, and expressive conversational tone.",
    samplePhrase: "Hello! I'm Noctis. How can I help you today?",
  },
  {
    id: "bubbie",
    label: "Bubbie",
    language: "American English",
    languageCode: "en-US",
    tone: "Comforting & familiar",
    gender: "neutral",
    accent: "#fbbf24",
    description: "Warm, supportive, and soothing cadence.",
    samplePhrase: "Hi there! I'm here to support you with whatever you need.",
  },
  {
    id: "spruce",
    label: "Spruce",
    language: "American English",
    languageCode: "en-US",
    tone: "Calm & grounded",
    gender: "male",
    accent: "#34d399",
    description: "Steady, reassuring, and articulate conversational tone.",
    samplePhrase: "Good day. Let's work through your questions step by step.",
  },
  {
    id: "breeze",
    label: "Breeze",
    language: "American English",
    languageCode: "en-US",
    tone: "Animated & earnest",
    gender: "female",
    accent: "#60a5fa",
    description: "Light, animated, and friendly conversational presence.",
    samplePhrase: "Hi! I'm ready whenever you are. What would you like to explore?",
  },
  {
    id: "juniper",
    label: "Juniper",
    language: "American English",
    languageCode: "en-US",
    tone: "Open & upbeat",
    gender: "female",
    accent: "#ec4899",
    description: "Engaging, crisp, and dynamic voice.",
    samplePhrase: "Hello! Let's dive in and find exactly what you're looking for.",
  },
  {
    id: "cove",
    label: "Cove",
    language: "American English",
    languageCode: "en-US",
    tone: "Composed & direct",
    gender: "male",
    accent: "#818cf8",
    description: "Smooth, focused, and articulate cadence.",
    samplePhrase: "Hello. I'm ready to review your data and clinical questions.",
  },
  {
    id: "sol",
    label: "Sol",
    language: "American English",
    languageCode: "en-US",
    tone: "Radiant & relaxed",
    gender: "neutral",
    accent: "#f59e0b",
    description: "Relaxed, clear, and reassuring tone.",
    samplePhrase: "Hey there! Ready to assist you with your tasks today.",
  },
  {
    id: "alloy",
    label: "Alloy",
    language: "American English",
    languageCode: "en-US",
    tone: "Balanced & Versatile",
    gender: "neutral",
    accent: "#38bdf8",
    description: "Studio-balanced neural tone suitable for all conversational queries.",
    samplePhrase: "Hello. I am Noctis, your analytical and clinical assistant.",
  },
  {
    id: "nova",
    label: "Nova",
    language: "American English",
    languageCode: "en-US",
    tone: "Warm, Expressive & Engaging",
    gender: "female",
    accent: "#f472b6",
    description: "Warm, energetic, and expressive conversational human voice.",
    samplePhrase: "Hi! How can I assist you with your research or workflow today?",
  },
  {
    id: "onyx",
    label: "Onyx",
    language: "American English",
    languageCode: "en-US",
    tone: "Deep, Calm & Authoritative",
    gender: "male",
    accent: "#a78bfa",
    description: "Deep, resonant, and calm authoritative executive voice.",
    samplePhrase: "Welcome. Let's analyze your clinical evidence and findings.",
  },
  {
    id: "echo",
    label: "Echo",
    language: "American English",
    languageCode: "en-US",
    tone: "Crisp, Clear & Direct",
    gender: "male",
    accent: "#34d399",
    description: "Crisp, precise, and articulate cadence with studio clarity.",
    samplePhrase: "Hello. Systems are active and ready for your query.",
  },
  {
    id: "natural",
    label: "Natural Browser",
    language: "American English",
    languageCode: "en-US",
    tone: "Device Neural / Native",
    gender: "neutral",
    accent: "#e4b86a",
    description: "Online neural voice provided natively by Edge, Chrome, or Safari.",
    samplePhrase: "Hello! Using your device's native high-definition speech synthesizer.",
  },

  // Brazilian Portuguese
  {
    id: "rio",
    label: "Rio",
    language: "Brazilian Portuguese",
    languageCode: "pt-BR",
    tone: "Lyrical & vibrant",
    gender: "male",
    accent: "#10b981",
    description: "Natural, rhythmic, and engaging Brazilian Portuguese cadence.",
    samplePhrase: "Olá! Eu sou Noctis, seu assistente inteligente. Como posso ajudar você hoje?",
  },
  {
    id: "viola",
    label: "Viola",
    language: "Brazilian Portuguese",
    languageCode: "pt-BR",
    tone: "Melodic & warm",
    gender: "female",
    accent: "#f43f5e",
    description: "Warm, expressive, and melodic Brazilian Portuguese voice.",
    samplePhrase: "Olá! Tudo bem? Estou pronta para ajudar em suas consultas e pesquisas.",
  },

  // British English
  {
    id: "arbor",
    label: "Arbor",
    language: "British English",
    languageCode: "en-GB",
    tone: "Refined & scholarly",
    gender: "male",
    accent: "#0ea5e9",
    description: "Measured, eloquent, and sophisticated British articulation.",
    samplePhrase: "Good day. I am Noctis, your clinical decision support assistant. How may I be of service?",
  },
  {
    id: "vale",
    label: "Vale",
    language: "British English",
    languageCode: "en-GB",
    tone: "Crisp & poised",
    gender: "female",
    accent: "#8b5cf6",
    description: "Clear, poised, and articulate modern British cadence.",
    samplePhrase: "Hello. I am ready to review your clinical cases and guidelines whenever you wish.",
  },

  // French
  {
    id: "rivage",
    label: "Rivage",
    language: "French",
    languageCode: "fr-FR",
    tone: "Smooth & sophisticated",
    gender: "male",
    accent: "#3b82f6",
    description: "Gentle, cultured, and fluent French speech with natural prosody.",
    samplePhrase: "Bonjour. Je suis Noctis, votre assistant clinique. Comment puis-je vous aider aujourd'hui ?",
  },
  {
    id: "aube",
    label: "Aube",
    language: "French",
    languageCode: "fr-FR",
    tone: "Bright & elegant",
    gender: "female",
    accent: "#f472b6",
    description: "Luminous, articulate, and engaging French voice.",
    samplePhrase: "Bonjour ! Je suis prête à vous accompagner dans vos analyses médicales et techniques.",
  },

  // German
  {
    id: "miko",
    label: "Miko",
    language: "German",
    languageCode: "de-DE",
    tone: "Structured & direct",
    gender: "male",
    accent: "#6366f1",
    description: "Crisp, structured, and precise German pronunciation.",
    samplePhrase: "Guten Tag. Ich bin Noctis, Ihr klinischer Assistent. Wie kann ich Sie unterstützen?",
  },
  {
    id: "sonna",
    label: "Sonna",
    language: "German",
    languageCode: "de-DE",
    tone: "Friendly & balanced",
    gender: "female",
    accent: "#14b8a6",
    description: "Clear, natural, and welcoming German cadence.",
    samplePhrase: "Hallo! Ich stehe Ihnen gerne für Ihre medizinischen Fragen und Analysen zur Seite.",
  },

  // Hindi
  {
    id: "neer",
    label: "Neer",
    language: "Hindi",
    languageCode: "hi-IN",
    tone: "Calm & harmonious",
    gender: "male",
    accent: "#f97316",
    description: "Deep, resonant, and balanced Hindi/Indo-English voice.",
    samplePhrase: "नमस्ते। मैं नोक्टिस हूँ, आपका सहायक। आज मैं आपकी क्या मदद कर सकता हूँ?",
  },
  {
    id: "leher",
    label: "Leher",
    language: "Hindi",
    languageCode: "hi-IN",
    tone: "Fluid & gentle",
    gender: "female",
    accent: "#ec4899",
    description: "Flowing, warm, and natural Hindi articulation.",
    samplePhrase: "नमस्ते! नोक्टिस में आपका स्वागत है। आप मुझसे कोई भी प्रश्न पूछ सकते हैं।",
  },

  // Japanese
  {
    id: "rindo",
    label: "Rindō",
    language: "Japanese",
    languageCode: "ja-JP",
    tone: "Steady & polite",
    gender: "male",
    accent: "#06b6d4",
    description: "Polite, focused, and steady Japanese pitch-accent.",
    samplePhrase: "こんにちは。ノクティスです。臨床および分析アシスタントとしてサポートいたします。",
  },
  {
    id: "himari",
    label: "Himari",
    language: "Japanese",
    languageCode: "ja-JP",
    tone: "Warm & gentle",
    gender: "female",
    accent: "#fb7185",
    description: "Warm, respectful, and articulate Japanese voice.",
    samplePhrase: "こんにちは！ノクティスへようこそ。どのようなご用件でしょうか？",
  },

  // Korean
  {
    id: "haetsal",
    label: "Haetsal",
    language: "Korean",
    languageCode: "ko-KR",
    tone: "Sunny & clear",
    gender: "female",
    accent: "#eab308",
    description: "Bright, polite, and warm Korean honorific cadence.",
    samplePhrase: "안녕하세요! 노크티스입니다. 임상 지원과 연구 분석을 도와드릴게요.",
  },
  {
    id: "hanul",
    label: "Hanul",
    language: "Korean",
    languageCode: "ko-KR",
    tone: "Open & resonant",
    gender: "male",
    accent: "#3b82f6",
    description: "Calm, steady, and trustworthy Korean voice.",
    samplePhrase: "안녕하십니까. 노크티스 임상 지능 시스템입니다. 무엇을 확인하시겠습니까?",
  },

  // Mexican Spanish
  {
    id: "arrullo",
    label: "Arrullo",
    language: "Mexican Spanish",
    languageCode: "es-MX",
    tone: "Soothing & warm",
    gender: "female",
    accent: "#e11d48",
    description: "Warm, empathetic, and melodic Mexican Spanish cadence.",
    samplePhrase: "¡Hola! Soy Noctis, tu asistente clínico. ¿En qué te puedo apoyar el día de hoy?",
  },
  {
    id: "tinta",
    label: "Tinta",
    language: "Mexican Spanish",
    languageCode: "es-MX",
    tone: "Dynamic & clear",
    gender: "male",
    accent: "#059669",
    description: "Crisp, dynamic, and grounded Latin American Spanish voice.",
    samplePhrase: "¡Hola! Todo listo para revisar tus consultas y datos médicos cuando gustes.",
  },
];

/**
 * Standard categorized language groups matching the mobile & web voice selection interface.
 */
export const VOICE_LANGUAGE_GROUPS: VoiceLanguageGroup[] = [
  {
    language: "American English",
    languageCode: "en-US",
    voices: VOICE_PERSONAS.filter((v) => v.language === "American English" && !["alloy", "nova", "onyx", "echo", "natural"].includes(v.id)),
  },
  {
    language: "Brazilian Portuguese",
    languageCode: "pt-BR",
    voices: VOICE_PERSONAS.filter((v) => v.language === "Brazilian Portuguese"),
  },
  {
    language: "British English",
    languageCode: "en-GB",
    voices: VOICE_PERSONAS.filter((v) => v.language === "British English"),
  },
  {
    language: "French",
    languageCode: "fr-FR",
    voices: VOICE_PERSONAS.filter((v) => v.language === "French"),
  },
  {
    language: "German",
    languageCode: "de-DE",
    voices: VOICE_PERSONAS.filter((v) => v.language === "German"),
  },
  {
    language: "Hindi",
    languageCode: "hi-IN",
    voices: VOICE_PERSONAS.filter((v) => v.language === "Hindi"),
  },
  {
    language: "Japanese",
    languageCode: "ja-JP",
    voices: VOICE_PERSONAS.filter((v) => v.language === "Japanese"),
  },
  {
    language: "Korean",
    languageCode: "ko-KR",
    voices: VOICE_PERSONAS.filter((v) => v.language === "Korean"),
  },
  {
    language: "Mexican Spanish",
    languageCode: "es-MX",
    voices: VOICE_PERSONAS.filter((v) => v.language === "Mexican Spanish"),
  },
];

/**
 * Retrieves full persona metadata with safe fallback to Maple.
 */
export function getVoicePersona(id: string): VoicePersonaInfo {
  const match = VOICE_PERSONAS.find((p) => p.id === id);
  if (match) return match;
  return VOICE_PERSONAS[0]; // Maple is index 0
}

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
 * When maxLength is omitted or <= 0, the full text is cleaned without truncation.
 */
export function cleanVoiceText(rawText: string, maxLength?: number): string {
  if (!rawText) return "";

  let spoken = rawText;

  // 1. Remove code blocks with clean spoken transition
  spoken = spoken.replace(/```[\s\S]*?```/g, " [Code snippet omitted for speech] ");
  spoken = spoken.replace(/`([^`]+)`/g, "$1");

  // 2. Remove horizontal rules and decorative dividers
  spoken = spoken.replace(/^[─\-_=*]{3,}\s*$/gm, " ");

  // 3. Remove markdown tables
  spoken = spoken.replace(/\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+/g, " [Detailed table summary available in chat] ");

  // 4. Remove metadata gates and callout blocks
  spoken = spoken.replace(/>\s*\[!(?:IMPORTANT|NOTE|WARNING|TIP|CAUTION)\]/gi, " ");
  spoken = spoken.replace(/^>\s*/gm, "");

  // 5. Legal symbols and statutory references for speech
  spoken = spoken.replace(/§§\s*/g, "Sections ");
  spoken = spoken.replace(/§\s*/g, "Section ");
  spoken = spoken.replace(/\bU\.S\.C\.\b/g, "U S C");
  spoken = spoken.replace(/\bC\.F\.R\.\b/g, "C F R");
  spoken = spoken.replace(/\bFAR\b/g, "F A R");

  // 6. Units and currencies for human pronunciation (before LaTeX stripping)
  spoken = spoken.replace(/\$(\d+(?:\.\d+)?)\s*(?:billion|B)\b/gi, "$1 billion dollars");
  spoken = spoken.replace(/\$(\d+(?:\.\d+)?)\s*(?:million|M)\b/gi, "$1 million dollars");
  spoken = spoken.replace(/\$(\d+(?:\.\d+)?)\s*(?:thousand|K)\b/gi, "$1 thousand dollars");
  spoken = spoken.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, "$1 dollars");
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*MWh\b/gi, "$1 megawatt hours");
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*kWh\b/gi, "$1 kilowatt hours");
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*GW\b/gi, "$1 gigawatts");
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*MW\b/gi, "$1 megawatts");

  // 7. Clean LaTeX math formatting ($...$ and $$...$$)
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

  // 8. Common abbreviations expanded into natural spoken English
  spoken = spoken.replace(/\be\.g\.,?\s*/gi, "for example, ");
  spoken = spoken.replace(/\bi\.e\.,?\s*/gi, "that is, ");
  spoken = spoken.replace(/\betc\.\b/gi, "etcetera");
  spoken = spoken.replace(/\bvs\.?\s*/gi, " versus ");
  spoken = spoken.replace(/\bapprox\.\s*/gi, "approximately ");

  // 9. Remove audit/claim status stamps
  spoken = spoken.split(/\b(?:Evidence status|Claim standing|Audit trail):/i)[0];

  // 10. Clean markdown links, headers, bold, italics, bullets
  spoken = spoken.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  spoken = spoken.replace(/^#+\s+/gm, "");
  spoken = spoken.replace(/^[*\-+•]\s+/gm, "");
  spoken = spoken.replace(/[#*`_~]/g, " ");

  // 11. Collapse whitespace
  spoken = spoken.replace(/\s+/g, " ").trim();

  // 12. Sentence-boundary truncation: Only when maxLength is explicitly provided and positive
  if (typeof maxLength === "number" && maxLength > 0 && spoken.length > maxLength) {
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
 * Splits sanitized text into natural sentence- and clause-bounded chunks
 * optimized for browser SpeechSynthesis. Each chunk stays under ~220 characters
 * to eliminate browser audio buffer overflows, GC drops, and the 15-second speech cutoff.
 */
export function splitIntoSpokenChunks(text: string, maxChunkLength = 220): string[] {
  if (!text || !text.trim()) return [];

  // Match sentences ending in ., !, ?, ;, or major delimiters followed by whitespace
  // Also treat paragraph breaks and list item bullets as natural pauses
  const sentences = text
    .split(/(?<=[.?!;:])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    if (!sentence) continue;

    // If the sentence itself is short enough to fit in current buffer
    if (buffer && (buffer + " " + sentence).length <= maxChunkLength) {
      buffer = buffer + " " + sentence;
      continue;
    }

    // Flush existing buffer if adding this sentence exceeds maxChunkLength
    if (buffer) {
      chunks.push(buffer.trim());
      buffer = "";
    }

    // If the single sentence is <= maxChunkLength, start a new buffer with it
    if (sentence.length <= maxChunkLength) {
      buffer = sentence;
      continue;
    }

    // The sentence is longer than maxChunkLength: split by sub-clauses (commas, colons, dashes)
    const subClauses = sentence.split(/(?<=[,:\u2014\u2013\-])\s+/);
    let clauseBuffer = "";

    for (const clause of subClauses) {
      if (!clause) continue;

      if (clauseBuffer && (clauseBuffer + " " + clause).length <= maxChunkLength) {
        clauseBuffer = clauseBuffer + " " + clause;
        continue;
      }

      if (clauseBuffer) {
        chunks.push(clauseBuffer.trim());
        clauseBuffer = "";
      }

      if (clause.length <= maxChunkLength) {
        clauseBuffer = clause;
        continue;
      }

      // If even a sub-clause exceeds maxChunkLength, break down cleanly by words
      const words = clause.split(/\s+/);
      let wordBuffer = "";
      for (const word of words) {
        if (!word) continue;
        if (wordBuffer && (wordBuffer + " " + word).length <= maxChunkLength) {
          wordBuffer = wordBuffer + " " + word;
        } else {
          if (wordBuffer) chunks.push(wordBuffer.trim());
          wordBuffer = word;
        }
      }
      if (wordBuffer) {
        clauseBuffer = wordBuffer;
      }
    }

    if (clauseBuffer) {
      buffer = clauseBuffer;
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks;
}

/**
 * Intelligently scores and selects the highest-quality human/natural browser voice,
 * strongly prioritizing neural and online voices over legacy robotic synthesizers.
 */
export function pickHumanBrowserVoice(
  voices: SpeechSynthesisVoice[],
  persona: VoicePersona = "maple",
  lang = "en"
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const targetLang = (lang || "en").toLowerCase();
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(targetLang.slice(0, 2)));
  const candidatePool = langVoices.length > 0 ? langVoices : voices;

  const info = getVoicePersona(persona);

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

    // 2. Gender & Persona matching
    const isFemaleVoice = /female|woman|girl|jenny|samantha|aria|victoria|ava|emma|sonia|dalia|paulina|sabina|luciana|leticia|francisca|denise|celine|katja|marlena|swara|kalpana|himari|kyoko|nanami|ayumi|haruka|sunhi|yuna|libby|hazel/.test(name);
    const isMaleVoice = /male|man|boy|guy|david|george|mark|christopher|eric|roger|steffan|alex|daniel|jorge|raul|alvaro|antonio|felipe|henri|thomas|mathieu|conrad|bernd|stefan|neer|madhur|hemant|rindo|otoya|keita|hanul|injoon|bongjin|oliver|ryan/.test(name);

    if (info.gender === "female") {
      if (isFemaleVoice) score += 40;
      if (isMaleVoice) score -= 30;
    } else if (info.gender === "male") {
      if (isMaleVoice) score += 40;
      if (isFemaleVoice) score -= 30;
    }

    // Specific persona name affinities
    if (persona === "nova" || persona === "maple" || persona === "breeze") {
      if (/jenny|samantha|victoria|karen|female|ava|emma|sonia|aria/.test(name)) score += 20;
    } else if (persona === "onyx" || persona === "spruce" || persona === "cove") {
      if (/guy|christopher|eric|roger|steffan|alex|daniel|male|george|david/.test(name)) score += 20;
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

// Global active audio, speech, and session references
let activeUtterances: SpeechSynthesisUtterance[] = [];
let currentAudioElement: HTMLAudioElement | null = null;
let keepAliveTimer: number | null = null;
let activeSessionId = 0;

/**
 * Stops all currently active audio playback (both Web Speech and HTML5 Audio).
 */
export function stopCurrentVoicePlayback(): void {
  activeSessionId++;
  if (typeof window !== "undefined") {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (currentAudioElement) {
      try {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
      } catch {}
      currentAudioElement = null;
    }
    if (keepAliveTimer !== null) {
      window.clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    activeUtterances = [];
    try {
      (window as unknown as { __noctisSpeechUtterances?: SpeechSynthesisUtterance[] }).__noctisSpeechUtterances = [];
    } catch {}
  }
}

/**
 * Executes natural, uninterrupted speech synthesis using the browser Web Speech API.
 * Uses sentence-level chunking and continuous utterance queuing to eliminate browser
 * audio buffer overflows and the 15-second speech cutoff bug in Chromium and WebKit.
 */
export function speakBrowserVoice(
  text: string,
  persona: VoicePersona = "maple",
  rate = 1.0,
  langCode?: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onChunk?: (current: number, total: number) => void;
  }
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

      // Clean the entire text without arbitrary truncation (maxLength omitted)
      const cleaned = cleanVoiceText(text);
      if (!cleaned) {
        if (options?.onEnd) options.onEnd();
        resolve(true);
        return;
      }

      // Cancel previous playback and claim a new session ID
      stopCurrentVoicePlayback();
      const thisSession = ++activeSessionId;

      // Split into small, natural phrase chunks (< 220 chars) to prevent Chrome timeouts
      const chunks = splitIntoSpokenChunks(cleaned, 220);
      if (chunks.length === 0) {
        if (options?.onEnd) options.onEnd();
        resolve(true);
        return;
      }

      const info = getVoicePersona(persona);
      const effectiveLang = langCode || info.languageCode || "en-US";
      const pitch = info.gender === "female" ? 1.05 : info.gender === "male" ? 0.94 : 1.0;

      let preferredVoice: SpeechSynthesisVoice | null = null;
      const assignVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          preferredVoice = pickHumanBrowserVoice(voices, persona, effectiveLang);
        }
      };
      assignVoice();
      if (!preferredVoice && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = assignVoice;
      }

      let currentIndex = 0;
      let isSettled = false;

      const cleanup = () => {
        if (keepAliveTimer !== null) {
          window.clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        activeUtterances = [];
        try {
          (window as unknown as { __noctisSpeechUtterances?: SpeechSynthesisUtterance[] }).__noctisSpeechUtterances = [];
        } catch {}
      };

      const finish = (success: boolean) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        if (options?.onEnd) options.onEnd();
        resolve(success);
      };

      // Watchdog & Keep-alive timer: Prevents Chrome speech engine from freezing after 14 seconds
      keepAliveTimer = window.setInterval(() => {
        if (thisSession !== activeSessionId) {
          cleanup();
          return;
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 3000);

      if (options?.onStart) options.onStart();

      const speakNextChunk = () => {
        if (thisSession !== activeSessionId) {
          finish(false);
          return;
        }

        if (currentIndex >= chunks.length) {
          // Entire text read successfully to completion!
          finish(true);
          return;
        }

        const chunkText = chunks[currentIndex];
        currentIndex++;

        try {
          const utterance = new SpeechSynthesisUtterance(chunkText);
          utterance.lang = effectiveLang;
          utterance.rate = rate;
          utterance.pitch = pitch;

          if (!preferredVoice) {
            assignVoice();
          }
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          // Retain strong references in memory to prevent V8 garbage collection mid-speech
          activeUtterances.push(utterance);
          if (activeUtterances.length > 25) activeUtterances.shift();
          try {
            (window as unknown as { __noctisSpeechUtterances?: SpeechSynthesisUtterance[] }).__noctisSpeechUtterances = activeUtterances;
          } catch {}

          if (options?.onChunk) {
            options.onChunk(currentIndex, chunks.length);
          }

          let chunkFinished = false;
          const onChunkDone = () => {
            if (chunkFinished) return;
            chunkFinished = true;
            if (thisSession === activeSessionId) {
              speakNextChunk();
            }
          };

          utterance.onend = onChunkDone;
          utterance.onerror = () => {
            if (thisSession !== activeSessionId) return;
            // On non-fatal chunk error, continue seamlessly to the next chunk
            onChunkDone();
          };

          window.speechSynthesis.speak(utterance);
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {
          if (thisSession === activeSessionId) {
            speakNextChunk();
          }
        }
      };

      speakNextChunk();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Unified human speech synthesis engine.
 * First attempts Studio-Quality Neural TTS (OpenAI tts-1) when configured.
 * Seamlessly falls back to the device's natural browser speech engine with
 * complete sentence-level chunking and continuous keep-alive playback.
 */
export async function speakNoctisVoice(
  text: string,
  persona: VoicePersona = "maple",
  options?: {
    apiKey?: string;
    langCode?: string;
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onChunk?: (current: number, total: number) => void;
  }
): Promise<boolean> {
  stopCurrentVoicePlayback();

  const info = getVoicePersona(persona);
  const effectiveLang = options?.langCode || info.languageCode || "en-US";
  const cleaned = cleanVoiceText(text);

  if (!cleaned) {
    if (options?.onEnd) options.onEnd();
    return true;
  }

  // 1. Try Studio-Quality Human Neural TTS if available (OpenAI tts-1 for <= 3800 chars)
  if (persona !== "natural" && cleaned.length <= 3800) {
    try {
      const { sayVibe } = await import("@/lib/noctis-api");
      let ttsVoice = "alloy";
      if (["onyx", "spruce", "cove", "arbor", "rivage", "miko", "neer", "rindo", "hanul", "tinta"].includes(persona)) {
        ttsVoice = "onyx";
      } else if (["nova", "maple", "breeze", "juniper", "viola", "vale", "aube", "sonna", "leher", "himari", "haetsal", "arrullo"].includes(persona)) {
        ttsVoice = "nova";
      } else if (persona === "echo") {
        ttsVoice = "echo";
      }

      const res = await sayVibe({
        data: {
          text: cleaned,
          voice: ttsVoice,
          speed: options?.rate || 1.0,
          keyOverride: options?.apiKey || "",
        },
      });
      const bag = res && typeof res === "object" ? (res as { audio?: unknown; result?: unknown; error?: unknown }) : {};
      const inner = bag.result && typeof bag.result === "object" ? (bag.result as { audio?: unknown; error?: unknown }) : bag;
      const audioUrl = typeof inner.audio === "string" ? inner.audio : "";
      if (audioUrl && audioUrl.startsWith("data:audio/")) {
        const played = await new Promise<boolean>((resolve) => {
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
            audio.play().catch(() => {
              currentAudioElement = null;
              resolve(false);
            });
          } catch {
            currentAudioElement = null;
            resolve(false);
          }
        });

        if (played) {
          return true;
        }
      }
    } catch {
      // Fallback seamlessly to native browser speech synthesis
    }
  }

  // 2. Uninterrupted Browser Natural Human Voice Fallback
  // Handles arbitrarily long text without mid-stream cutoffs or timeouts
  return speakBrowserVoice(cleaned, persona, options?.rate || 1.0, effectiveLang, options);
}

/**
 * Plays an audio preview sample for a specified voice persona in its native language.
 * Used by the "Choose your voice" modal for real-time auditory evaluation before starting voice mode.
 */
export async function previewVoiceSample(
  persona: VoicePersona,
  options?: {
    apiKey?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<boolean> {
  const info = getVoicePersona(persona);
  return speakNoctisVoice(info.samplePhrase, persona, {
    apiKey: options?.apiKey,
    langCode: info.languageCode,
    onStart: options?.onStart,
    onEnd: options?.onEnd,
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
