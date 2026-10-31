"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Brain, Shield, DollarSign, BookOpen, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const NOCTIS_MODELS: ModelOption[] = [
  {
    id: "noctis-ultra",
    name: "Noctis Ultra",
    badge: "Default",
    description: "Multimodal frontier model. Ultra-fast, comprehensive, and context-aware.",
    icon: Sparkles,
    accentColor: "text-[#e4b86a]",
  },
  {
    id: "noctis-o3-deep",
    name: "Noctis Deep Thinking",
    badge: "o1/o3 Proofs",
    description: "Multi-pass chain of thought, rigorous mathematical logic & counter-example search.",
    icon: Brain,
    accentColor: "text-blue-400",
  },
  {
    id: "noctis-cyber-dfir",
    name: "XTRIKE Cyber DFIR",
    badge: "401 SAST Rules",
    description: "Vulnerability intelligence, attack-path graphs & hardened zero-trust triage.",
    icon: Shield,
    accentColor: "text-purple-400",
  },
  {
    id: "noctis-invest-alpha",
    name: "Investment Alpha",
    badge: "SEC EDGAR",
    description: "10-K filings, ASC 606 revenue, working capital & DCF financial models.",
    icon: DollarSign,
    accentColor: "text-emerald-400",
  },
  {
    id: "noctis-theology-exegesis",
    name: "Bible & Exegesis",
    badge: "Greek & Hebrew",
    description: "Historical-grammatical context, morphological lexicons & expository sermon outlines.",
    icon: BookOpen,
    accentColor: "text-amber-400",
  },
];

interface NoctisModelPickerProps {
  currentModelId?: string;
  onModelSelect?: (modelId: string) => void;
}

export function NoctisModelPicker({ currentModelId, onModelSelect }: NoctisModelPickerProps) {
  const [activeModel, setActiveModel] = useState("noctis-ultra");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("noctis_active_model");
      if (stored && NOCTIS_MODELS.some((m) => m.id === stored)) {
        setActiveModel(stored);
      }
    }
  }, []);

  const selected = NOCTIS_MODELS.find((m) => m.id === (currentModelId || activeModel)) || NOCTIS_MODELS[0];
  const Icon = selected.icon;

  function handleSelect(id: string) {
    setActiveModel(id);
    if (typeof window !== "undefined") localStorage.setItem("noctis_active_model", id);
    if (onModelSelect) onModelSelect(id);
    setDropdownOpen(false);
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#252525] px-3 py-1 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-white"
        aria-expanded={dropdownOpen}
      >
        <Icon className={cn("size-3.5", selected.accentColor)} />
        <span>{selected.name}</span>
        <span className="hidden sm:inline text-[10px] rounded bg-white/10 px-1.5 py-0.2 text-zinc-400">
          {selected.badge}
        </span>
        <ChevronDown className="size-3 text-zinc-400" />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-72 sm:w-80 overflow-hidden rounded-2xl border border-white/12 bg-[#1e1e1e] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Select Intelligence Engine
            </div>
            <div className="space-y-1">
              {NOCTIS_MODELS.map((model) => {
                const isCurrent = model.id === selected.id;
                const ModelIcon = model.icon;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(model.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left text-xs transition",
                      isCurrent
                        ? "bg-white/10 text-white ring-1 ring-white/15"
                        : "text-zinc-300 hover:bg-white/5"
                    )}
                  >
                    <div className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-black/40", model.accentColor)}>
                      <ModelIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-zinc-100">{model.name}</span>
                        {isCurrent && <Check className="size-3 text-[#e4b86a]" />}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                        {model.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
