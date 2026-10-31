"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, Volume2, Sparkles, PhoneOff, Radio } from "lucide-react";
import { VOICE_PERSONAS, type VoicePersona } from "@/lib/noctis-voice";

interface NoctisVoiceVisualizerProps {
  phase: "listen" | "speak" | "transcribe" | "idle";
  spokenText?: string;
  responseText?: string;
  onInterrupt?: () => void;
  audioLevel?: number;
  persona?: VoicePersona;
  onPersonaChange?: (p: VoicePersona) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onClose?: () => void;
}

export function NoctisVoiceVisualizer({
  phase,
  spokenText,
  responseText,
  onInterrupt,
  audioLevel = 0,
  persona = "alloy",
  onPersonaChange,
  isMuted = false,
  onToggleMute,
  onClose,
}: NoctisVoiceVisualizerProps) {
  const [pulse, setPulse] = useState(1);
  const activePersona = VOICE_PERSONAS.find((p) => p.id === persona) || VOICE_PERSONAS[0];

  useEffect(() => {
    if (phase === "speak") {
      const interval = setInterval(() => {
        setPulse((p) => (p > 1.15 ? 0.95 : p + 0.04));
      }, 160);
      return () => clearInterval(interval);
    } else {
      setPulse(1);
    }
  }, [phase]);

  // Audio level amplification for organic pulsation
  const dynamicScale = phase === "listen" ? 1 + Math.min(0.45, audioLevel * 1.5) : pulse;

  return (
    <div className="relative flex w-full max-w-xl flex-col items-center justify-center p-4 text-center select-none">
      {/* Outer ambient glow */}
      <div
        className={`absolute size-72 sm:size-96 rounded-full blur-3xl opacity-35 transition-all duration-700 pointer-events-none ${
          phase === "listen"
            ? "bg-gradient-to-tr from-[#e4b86a]/40 via-amber-500/25 to-orange-500/40"
            : phase === "speak"
            ? "bg-gradient-to-tr from-sky-500/45 via-blue-600/35 to-indigo-600/45"
            : "bg-gradient-to-tr from-purple-600/35 via-pink-500/25 to-blue-500/35 animate-spin"
        }`}
      />

      {/* Main Fluid Animated Visualizer Core */}
      <div className="relative my-4 size-48 sm:size-56 grid place-items-center">
        {/* Outer Wave Rings */}
        <div
          className={`absolute inset-0 rounded-full border transition-all duration-500 ${
            phase === "speak"
              ? "border-sky-400/50 animate-ping opacity-60"
              : phase === "listen"
              ? "border-[#e4b86a]/50 animate-pulse opacity-50"
              : "border-purple-400/40 animate-spin"
          }`}
          style={{ animationDuration: phase === "speak" ? "2.2s" : "3s" }}
        />

        <div
          className={`absolute -inset-4 rounded-full border border-dashed transition-all duration-700 ${
            phase === "speak"
              ? "border-cyan-400/30 animate-spin"
              : "border-white/10"
          }`}
          style={{ animationDuration: "14s" }}
        />

        {/* Luminous Interactive Core */}
        <div
          onClick={onInterrupt}
          className={`relative size-40 sm:size-48 rounded-full shadow-[0_0_60px_rgba(0,0,0,0.85)] flex flex-col items-center justify-center cursor-pointer transition-transform duration-150 transform active:scale-95 ${
            isMuted
              ? "bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 border border-zinc-600 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
              : phase === "listen"
              ? "bg-gradient-to-br from-[#f6cb7d] via-[#d4a045] to-[#785317] shadow-[0_0_50px_rgba(228,184,106,0.45)]"
              : phase === "speak"
              ? "bg-gradient-to-br from-[#38bdf8] via-[#2563eb] to-[#1e1b4b] shadow-[0_0_55px_rgba(56,189,248,0.55)]"
              : "bg-gradient-to-br from-purple-500 via-indigo-600 to-zinc-900 shadow-[0_0_45px_rgba(168,85,247,0.45)]"
          }`}
          style={{
            transform: `scale(${dynamicScale})`,
          }}
          title={phase === "speak" ? "Tap to interrupt Noctis" : isMuted ? "Microphone muted" : "Listening..."}
        >
          {/* Animated 7-band Equalizer Frequency Bars */}
          {isMuted ? (
            <MicOff className="size-8 text-zinc-400" />
          ) : phase === "listen" ? (
            <div className="flex items-center gap-1.5 h-12">
              {[0.4, 0.7, 1.0, 0.85, 0.6, 0.9, 0.5].map((mult, idx) => {
                const heightPx = Math.max(8, Math.min(38, Math.round(audioLevel * mult * 46) + 8));
                return (
                  <span
                    key={idx}
                    className="w-1.5 rounded-full bg-white transition-all duration-75"
                    style={{ height: `${heightPx}px` }}
                  />
                );
              })}
            </div>
          ) : phase === "speak" ? (
            <div className="flex items-center gap-1.5 h-12">
              <span className="h-6 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="h-10 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "120ms" }} />
              <span className="h-7 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "240ms" }} />
              <span className="h-11 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "80ms" }} />
              <span className="h-8 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "180ms" }} />
            </div>
          ) : (
            <Sparkles className="size-8 text-white animate-spin" />
          )}

          <span className="mt-1 text-[10px] font-semibold tracking-wider text-white/80 uppercase">
            {isMuted ? "Muted" : phase === "speak" ? "Tap to Interrupt" : "Listening"}
          </span>
        </div>
      </div>

      {/* State label & Persona Badge */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
              isMuted
                ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                : phase === "listen"
                ? "bg-[#e4b86a]/20 text-[#e4b86a] border border-[#e4b86a]/30"
                : phase === "speak"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
            }`}
          >
            <span className="size-2 rounded-full bg-current animate-ping" />
            {isMuted ? "Mic Muted" : phase === "listen" ? "Listening..." : phase === "speak" ? "Noctis Speaking" : "Processing Thought"}
          </span>

          {/* Persona indicator pill */}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-300">
            <Radio className="size-3 text-[#e4b86a]" />
            {activePersona.label}
          </span>
        </div>

        <p className="text-[12px] text-zinc-400">
          {phase === "speak"
            ? "Tap the orb anytime to interrupt Noctis"
            : isMuted
            ? "Unmute your microphone to speak"
            : "Speak naturally — Noctis responds conversationally"}
        </p>
      </div>

      {/* Real-time speech transcription & response display */}
      <div className="mt-5 w-full max-w-lg rounded-2xl border border-white/10 bg-black/60 p-4 text-left shadow-xl backdrop-blur-xl transition-all">
        {spokenText ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">You said:</span>
              {phase === "listen" ? (
                <span className="text-[10px] text-[#e4b86a] animate-pulse">Streaming speech...</span>
              ) : null}
            </div>
            <p className="text-sm font-medium text-zinc-100">{spokenText}</p>
          </div>
        ) : null}

        {responseText ? (
          <div className={`${spokenText ? "mt-3 pt-3 border-t border-white/10" : ""} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-[#e4b86a] uppercase">Noctis ({activePersona.label}):</span>
              {phase === "speak" ? (
                <span className="text-[10px] text-sky-400 animate-pulse">Speaking...</span>
              ) : null}
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed max-h-36 overflow-y-auto pr-1">
              {responseText}
            </p>
          </div>
        ) : !spokenText ? (
          <div className="py-2 text-center">
            <p className="text-xs text-zinc-400">"Ask me about financial filings, cyber exploitability, or live research..."</p>
            <p className="mt-1 text-[11px] text-zinc-500">Continuous two-way audio streaming is active</p>
          </div>
        ) : null}
      </div>

      {/* Voice Persona Selector & Quick Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onPersonaChange ? (
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#181818] p-1">
            {VOICE_PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPersonaChange(p.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  persona === p.id
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
                title={p.tone}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}

        {onToggleMute ? (
          <button
            type="button"
            onClick={onToggleMute}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              isMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-white/10 text-zinc-200 hover:bg-white/15"
            }`}
          >
            {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
            {isMuted ? "Unmute Mic" : "Mute Mic"}
          </button>
        ) : null}

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="End voice call"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition"
          >
            <PhoneOff className="size-3.5" />
            End Call
          </button>
        ) : null}
      </div>
    </div>
  );
}
