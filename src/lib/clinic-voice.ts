import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

let talkToken = 0;

export function stopClinicVoice() {
  talkToken += 1;
  stopCurrentVoicePlayback();
}

export function speakClinic(text: string) {
  stopClinicVoice();
  const line = text.replace(/\s+/g, " ").trim();
  if (!line || typeof window === "undefined") return;
  const mine = talkToken;
  if (mine !== talkToken) return;
  void speakNoctisVoice(line, "maple", { rate: 0.96 });
}
