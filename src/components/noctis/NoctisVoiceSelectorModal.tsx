"use client";

import { useState, useEffect } from "react";
import { X, Volume2, Square, Check, Loader2 } from "lucide-react";
import {
  VOICE_PERSONAS,
  VOICE_LANGUAGE_GROUPS,
  type VoicePersona,
  getVoicePersona,
  previewVoiceSample,
  stopCurrentVoicePlayback,
  isSpeechSynthesisSupported,
} from "@/lib/noctis-voice";

interface NoctisVoiceSelectorModalProps {
  isOpen: boolean;
  currentPersona: VoicePersona;
  onSelectPersona: (persona: VoicePersona) => void;
  onClose: () => void;
  onStartVoice?: (persona: VoicePersona) => void;
}

export function NoctisVoiceSelectorModal({
  isOpen,
  currentPersona,
  onSelectPersona,
  onClose,
  onStartVoice,
}: NoctisVoiceSelectorModalProps) {
  const [selected, setSelected] = useState<VoicePersona>(currentPersona || "maple");
  const [previewingId, setPreviewingId] = useState<VoicePersona | null>(null);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSpeechSupported(isSpeechSynthesisSupported());
    }
  }, []);

  useEffect(() => {
    setSelected(currentPersona || "maple");
  }, [currentPersona]);

  useEffect(() => {
    if (!isOpen) {
      stopCurrentVoicePlayback();
      setPreviewingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlayPreview = async (personaId: VoicePersona, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If already previewing this voice, stop it
    if (previewingId === personaId) {
      stopCurrentVoicePlayback();
      setPreviewingId(null);
      return;
    }

    stopCurrentVoicePlayback();
    setPreviewingId(personaId);
    setPreviewUnavailable(false);

    try {
      const ok = await previewVoiceSample(personaId, {
        onStart: () => setPreviewingId(personaId),
        onEnd: () => setPreviewingId(null),
      });

      if (!ok && !speechSupported) {
        setPreviewUnavailable(true);
        setPreviewingId(null);
      }
    } catch {
      setPreviewUnavailable(true);
      setPreviewingId(null);
    }
  };

  const handleSelect = (personaId: VoicePersona) => {
    setSelected(personaId);
    onSelectPersona(personaId);
    // Auto-play short preview on select
    void handlePlayPreview(personaId);
  };

  const handleStartVoice = () => {
    stopCurrentVoicePlayback();
    onSelectPersona(selected);
    if (onStartVoice) {
      onStartVoice(selected);
    }
    onClose();
  };

  const activePersonaInfo = getVoicePersona(selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex h-[92vh] max-h-[760px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0e] shadow-2xl">
        {/* Top Header with Close Button */}
        <div className="relative flex items-center justify-between px-6 pt-5 pb-2">
          <div className="w-8" />
          <h2 className="text-xl font-bold tracking-tight text-white">Choose your voice</h2>
          <button
            type="button"
            onClick={() => {
              stopCurrentVoicePlayback();
              onClose();
            }}
            className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Close voice selection"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Central Fluid Luminous Blue Orb */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative size-32 sm:size-36 grid place-items-center">
            {/* Ambient aura glow */}
            <div
              className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
                previewingId
                  ? "bg-sky-400/40 animate-pulse scale-125"
                  : "bg-gradient-to-tr from-sky-500/25 via-blue-600/30 to-indigo-500/25"
              }`}
            />

            {/* Outer animated fluid orbital ring */}
            <div
              className={`absolute inset-0 rounded-full border border-sky-400/30 transition-all duration-500 ${
                previewingId ? "animate-spin scale-110 opacity-80" : "opacity-40"
              }`}
              style={{ animationDuration: "12s" }}
            />

            {/* Glowing Gradient Sphere */}
            <div
              className={`relative size-28 sm:size-32 rounded-full shadow-[0_0_40px_rgba(56,189,248,0.45)] transition-transform duration-300 ${
                previewingId ? "scale-105" : "scale-100"
              }`}
              style={{
                background: "radial-gradient(circle at 35% 30%, #a5f3fc 0%, #38bdf8 30%, #2563eb 65%, #0f172a 100%)",
              }}
            >
              {/* Internal atmospheric cloud reflection */}
              <div className="absolute inset-0 rounded-full opacity-60 mix-blend-screen bg-gradient-to-tr from-white/30 via-transparent to-blue-200/20" />
            </div>
          </div>

          <p className="mt-2 text-xs font-medium text-zinc-400">
            {previewingId ? (
              <span className="text-sky-300 animate-pulse flex items-center gap-1.5">
                <Volume2 className="size-3.5" />
                Previewing {activePersonaInfo.label} ({activePersonaInfo.language})...
              </span>
            ) : (
              `Active: ${activePersonaInfo.label} · ${activePersonaInfo.tone}`
            )}
          </p>
        </div>

        {/* Scrollable Language Grouped Voice List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700">
          {VOICE_LANGUAGE_GROUPS.map((group) => (
            <div key={group.language} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-zinc-400">{group.language}</span>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                  {group.languageCode}
                </span>
              </div>

              {/* Card Container for Voices in This Language */}
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#141416] divide-y divide-white/5 shadow-sm">
                {group.voices.map((v) => {
                  const isSelected = selected === v.id;
                  const isPlaying = previewingId === v.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSelect(v.id)}
                      className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition ${
                        isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Left: Checkmark & Voice Name */}
                      <div className="flex items-center gap-3">
                        <div className="flex size-5 items-center justify-center shrink-0">
                          {isSelected ? (
                            <Check className="size-4 text-white font-bold stroke-[3]" />
                          ) : null}
                        </div>
                        <div className="flex flex-col text-left">
                          <span
                            className={`text-base font-medium tracking-tight ${
                              isSelected ? "text-white font-semibold" : "text-zinc-200 group-hover:text-white"
                            }`}
                          >
                            {v.label}
                          </span>
                          <span className="text-[11px] text-zinc-500 line-clamp-1">
                            {v.tone}
                          </span>
                        </div>
                      </div>

                      {/* Right: Audio Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => handlePlayPreview(v.id, e)}
                        aria-label={`Preview voice sample for ${v.label}`}
                        className={`flex size-8 items-center justify-center rounded-full transition ${
                          isPlaying
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "text-zinc-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {isPlaying ? (
                          <Square className="size-3.5 fill-current animate-pulse" />
                        ) : (
                          <Volume2 className="size-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Classic Voices Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-zinc-400">Classic Voices</span>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">Neural / Legacy</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#141416] divide-y divide-white/5 shadow-sm">
              {VOICE_PERSONAS.filter((v) => ["alloy", "nova", "onyx", "echo", "natural"].includes(v.id)).map((v) => {
                const isSelected = selected === v.id;
                const isPlaying = previewingId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v.id)}
                    className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition ${
                      isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-5 items-center justify-center shrink-0">
                        {isSelected ? <Check className="size-4 text-white font-bold stroke-[3]" /> : null}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={`text-base font-medium ${isSelected ? "text-white font-semibold" : "text-zinc-200"}`}>
                          {v.label}
                        </span>
                        <span className="text-[11px] text-zinc-500 line-clamp-1">{v.tone}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handlePlayPreview(v.id, e)}
                      aria-label={`Preview voice sample for ${v.label}`}
                      className={`flex size-8 items-center justify-center rounded-full transition ${
                        isPlaying
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                          : "text-zinc-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {isPlaying ? <Square className="size-3.5 fill-current animate-pulse" /> : <Volume2 className="size-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Fixed Action Bar */}
        <div className="border-t border-white/10 bg-[#0c0c0e]/95 p-4 backdrop-blur-md">
          {previewUnavailable ? (
            <p className="mb-2 text-center text-xs font-medium text-rose-400 animate-in fade-in">
              Preview unavailable in this browser environment
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleStartVoice}
            className="flex w-full items-center justify-center rounded-full bg-white py-3.5 px-6 text-base font-semibold text-black shadow-lg transition active:scale-[0.98] hover:bg-zinc-100"
          >
            Start Voice
          </button>
        </div>
      </div>
    </div>
  );
}
