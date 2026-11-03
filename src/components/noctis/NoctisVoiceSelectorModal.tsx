"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
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
      setPreviewUnavailable(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlayPreview = async (personaId: VoicePersona) => {
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

      if (!ok) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex h-[94vh] max-h-[800px] w-full max-w-[420px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#1c1c1e] text-white shadow-2xl">
        {/* Top Header with Centered Title & Close Button */}
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

        {/* Central Luminous Blue & White Atmospheric Orb */}
        <div className="flex flex-col items-center justify-center py-4 shrink-0">
          <div className="relative size-32 sm:size-36 grid place-items-center">
            {/* Ambient aura glow */}
            <div
              className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
                previewingId
                  ? "bg-sky-400/40 animate-pulse scale-125"
                  : "bg-gradient-to-tr from-sky-500/25 via-blue-600/30 to-indigo-500/25"
              }`}
            />

            {/* Glowing Gradient Sphere with White Atmospheric Cloud Streak */}
            <div
              className={`relative size-28 sm:size-32 rounded-full overflow-hidden shadow-[0_0_35px_rgba(56,189,248,0.4)] transition-transform duration-300 ${
                previewingId ? "scale-105" : "scale-100"
              }`}
              style={{
                background: "radial-gradient(circle at 35% 30%, #a5f3fc 0%, #38bdf8 30%, #2563eb 65%, #0f172a 100%)",
              }}
            >
              {/* Soft diagonal mist / cloud reflection matching screenshot */}
              <div
                className="absolute inset-0 rounded-full opacity-80 mix-blend-screen"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.45) 25%, transparent 60%)",
                  filter: "blur(2px)",
                }}
              />
              <div
                className="absolute inset-0 rounded-full opacity-70 mix-blend-overlay"
                style={{
                  background:
                    "radial-gradient(circle at 70% 70%, rgba(96,165,250,0.6) 0%, transparent 60%)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Language Grouped Voice List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700">
          {VOICE_LANGUAGE_GROUPS.map((group) => (
            <div key={group.language} className="space-y-2">
              <div className="px-1 text-sm font-normal text-zinc-400">
                {group.language}
              </div>

              {/* Pitch Black Card Container */}
              <div className="overflow-hidden rounded-2xl bg-black border border-white/5 divide-y divide-zinc-900/80 shadow-inner">
                {group.voices.map((v) => {
                  const isSelected = selected === v.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSelect(v.id)}
                      className={`group flex items-center px-4 py-3.5 cursor-pointer transition select-none ${
                        isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02] active:bg-white/[0.05]"
                      }`}
                    >
                      {/* Left: Checkmark Slot */}
                      <div className="flex w-7 shrink-0 items-center justify-start">
                        {isSelected ? (
                          <Check className="size-4 text-white stroke-[2.5]" />
                        ) : null}
                      </div>

                      {/* Voice Name */}
                      <span
                        className={`text-[16px] tracking-tight ${
                          isSelected ? "text-white font-medium" : "text-zinc-200 group-hover:text-white"
                        }`}
                      >
                        {v.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Classic Voices Section */}
          <div className="space-y-2 pt-1 pb-4">
            <div className="px-1 text-sm font-normal text-zinc-400">
              Classic Voices
            </div>
            <div className="overflow-hidden rounded-2xl bg-black border border-white/5 divide-y divide-zinc-900/80 shadow-inner">
              {VOICE_PERSONAS.filter((v) =>
                ["alloy", "nova", "onyx", "echo", "natural"].includes(v.id)
              ).map((v) => {
                const isSelected = selected === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v.id)}
                    className={`group flex items-center px-4 py-3.5 cursor-pointer transition select-none ${
                      isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02] active:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex w-7 shrink-0 items-center justify-start">
                      {isSelected ? (
                        <Check className="size-4 text-white stroke-[2.5]" />
                      ) : null}
                    </div>
                    <span
                      className={`text-[16px] tracking-tight ${
                        isSelected ? "text-white font-medium" : "text-zinc-200 group-hover:text-white"
                      }`}
                    >
                      {v.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Fixed Action Bar matching Screenshot 2 & 5 */}
        <div className="border-t border-white/5 bg-[#1c1c1e] px-5 pt-3 pb-5">
          {previewUnavailable ? (
            <p className="mb-2 text-left text-sm font-normal text-red-500 animate-in fade-in">
              Preview unavailable
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleStartVoice}
            className="flex w-full items-center justify-center rounded-full bg-white py-3.5 px-6 text-[16px] font-semibold text-black shadow-lg transition active:scale-[0.98] hover:bg-zinc-200"
          >
            Start Voice
          </button>
        </div>
      </div>
    </div>
  );
}
