"use client";

import React, { useEffect, useState } from "react";
import { Mic, Volume2, Sparkles } from "lucide-react";

interface NoctisVoiceVisualizerProps {
  phase: "listen" | "speak" | "transcribe";
  spokenText?: string;
  responseText?: string;
  onInterrupt?: () => void;
}

export function NoctisVoiceVisualizer({
  phase,
  spokenText,
  responseText,
  onInterrupt,
}: NoctisVoiceVisualizerProps) {
  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => (p > 1.2 ? 0.95 : p + 0.05));
    }, 180);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Outer ambient glow */}
      <div
        className={`absolute size-64 sm:size-80 rounded-full blur-3xl opacity-40 transition-all duration-700 pointer-events-none ${
          phase === "listen"
            ? "bg-gradient-to-tr from-[#e4b86a]/30 via-amber-600/20 to-orange-500/30"
            : phase === "speak"
            ? "bg-gradient-to-tr from-blue-600/40 via-cyan-500/30 to-indigo-600/40"
            : "bg-gradient-to-tr from-purple-600/30 via-pink-500/20 to-blue-500/30 animate-spin"
        }`}
      />

      {/* Main Fluid Animated Orb */}
      <div className="relative size-44 sm:size-52 grid place-items-center">
        {/* Animated wave rings */}
        <div
          className={`absolute inset-0 rounded-full border transition-all duration-500 ${
            phase === "speak"
              ? "border-sky-400/40 animate-ping opacity-60"
              : phase === "listen"
              ? "border-[#e4b86a]/40 animate-pulse opacity-40"
              : "border-purple-400/30 animate-spin"
          }`}
          style={{ animationDuration: phase === "speak" ? "2.5s" : "3s" }}
        />

        <div
          className={`absolute -inset-3 rounded-full border border-dashed transition-all duration-700 ${
            phase === "speak"
              ? "border-cyan-400/30 animate-spin"
              : "border-white/10"
          }`}
          style={{ animationDuration: "12s" }}
        />

        {/* Luminous Inner Core */}
        <div
          onClick={onInterrupt}
          className={`relative size-36 sm:size-44 rounded-full shadow-[0_0_60px_rgba(0,0,0,0.8)] flex items-center justify-center cursor-pointer transition-transform duration-300 transform active:scale-95 ${
            phase === "listen"
              ? "bg-gradient-to-br from-[#e4b86a] via-[#c29648] to-[#694e1d] shadow-[0_0_40px_rgba(228,184,106,0.4)]"
              : phase === "speak"
              ? "bg-gradient-to-br from-[#38bdf8] via-[#2563eb] to-[#1e1b4b] shadow-[0_0_50px_rgba(56,189,248,0.5)]"
              : "bg-gradient-to-br from-purple-500 via-indigo-600 to-zinc-900 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
          }`}
          style={{
            transform: `scale(${pulse})`,
          }}
          title={phase === "speak" ? "Tap to interrupt" : "Listening..."}
        >
          {/* Waveform bars or icon */}
          {phase === "listen" ? (
            <div className="flex items-center gap-1.5">
              <span className="h-4 w-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-8 w-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-5 w-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : phase === "speak" ? (
            <div className="flex items-center gap-1.5">
              <span className="h-7 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="h-10 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "100ms" }} />
              <span className="h-6 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "200ms" }} />
              <span className="h-9 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "150ms" }} />
            </div>
          ) : (
            <Sparkles className="size-8 text-white animate-spin" />
          )}
        </div>
      </div>

      {/* State label */}
      <div className="mt-6 flex flex-col items-center gap-1">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
            phase === "listen"
              ? "bg-[#e4b86a]/20 text-[#e4b86a]"
              : phase === "speak"
              ? "bg-sky-500/20 text-sky-300"
              : "bg-purple-500/20 text-purple-300"
          }`}
        >
          <span className="size-2 rounded-full bg-current animate-ping" />
          {phase === "listen" ? "Listening..." : phase === "speak" ? "Noctis Speaking" : "Processing Thought"}
        </span>
        <span className="text-[11px] text-zinc-400">
          {phase === "speak" ? "Tap the orb to interrupt" : "Speak naturally, Noctis responds in real-time"}
        </span>
      </div>

      {/* Real-time transcribed text box */}
      <div className="mt-5 w-full max-w-lg rounded-2xl border border-white/10 bg-black/40 p-4 text-left shadow-lg backdrop-blur-md">
        {spokenText ? (
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">You said:</span>
            <p className="text-sm font-medium text-zinc-100">{spokenText}</p>
          </div>
        ) : null}

        {responseText ? (
          <div className={`${spokenText ? "mt-3 pt-3 border-t border-white/8" : ""} space-y-1`}>
            <span className="text-[10px] font-bold tracking-wider text-[#e4b86a] uppercase">Noctis:</span>
            <p className="text-sm text-zinc-200 leading-relaxed line-clamp-4">{responseText}</p>
          </div>
        ) : !spokenText ? (
          <p className="text-center text-xs text-zinc-500 italic py-2">
            "Ask a question or discuss an idea..."
          </p>
        ) : null}
      </div>
    </div>
  );
}
