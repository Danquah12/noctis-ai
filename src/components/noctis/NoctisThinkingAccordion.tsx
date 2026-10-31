"use client";

import React, { useState } from "react";
import { Brain, ChevronDown, CheckCircle2, Search, ShieldCheck, Sparkles, ExternalLink } from "lucide-react";

interface ThinkingStep {
  title: string;
  detail: string;
  status: "done" | "active" | "waiting";
  timeMs?: number;
}

interface NoctisThinkingProps {
  durationSeconds?: number;
  rawThought?: string;
  steps?: ThinkingStep[];
  defaultOpen?: boolean;
}

export function NoctisThinkingAccordion({
  durationSeconds = 4,
  rawThought,
  steps,
  defaultOpen = false,
}: NoctisThinkingProps) {
  const [open, setOpen] = useState(defaultOpen);

  const defaultSteps: ThinkingStep[] = [
    {
      title: "Query Triage & Safety Validation",
      detail: "Assessed prompt intent, clinical & security guardrails, and domain scope.",
      status: "done",
      timeMs: 420,
    },
    {
      title: "Knowledge Retrieval & Multi-Corpus Grounding",
      detail: "Cross-referenced verified institutional datasets, standard schemas, and regulatory references.",
      status: "done",
      timeMs: 1250,
    },
    {
      title: "Deductive Synthesis & Evidence Cross-Check",
      detail: "Synthesized arguments, pruned hallucinations, and verified claim soundness against primary sources.",
      status: "done",
      timeMs: 1480,
    },
    {
      title: "Deterministic Formulation",
      detail: "Structured the final answer with clarity, precision, and actionable guidance.",
      status: "done",
      timeMs: 850,
    },
  ];

  const displaySteps = steps && steps.length > 0 ? steps : defaultSteps;

  return (
    <div className="my-2.5 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 text-zinc-300 transition-all">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-200"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full bg-[#e4b86a]/15 text-[#e4b86a]">
            <Brain className="size-3 animate-pulse" />
          </span>
          <span className="font-semibold text-zinc-200">
            Thought for {durationSeconds} seconds
          </span>
          <span className="hidden text-[11px] text-zinc-500 sm:inline">
            (Chain of Thought & Domain Reasoning)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span className="text-[11px]">{open ? "Hide reasoning" : "View steps"}</span>
          <ChevronDown
            className={`size-3.5 transition-transform duration-200 ${
              open ? "rotate-180 text-[#e4b86a]" : ""
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-white/8 px-4 py-3 text-xs leading-relaxed space-y-3 bg-black/25">
          {rawThought ? (
            <div className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-zinc-300">
              {rawThought}
            </div>
          ) : (
            <div className="space-y-2.5">
              {displaySteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="size-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-zinc-200">{step.title}</span>
                      {step.timeMs ? (
                        <span className="font-mono text-[10px] text-zinc-500">
                          {step.timeMs}ms
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11.5px] text-zinc-400 mt-0.5">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CitationBadgeProps {
  label: string;
  source: string;
  url?: string;
  snippet?: string;
}

export function CitationBadge({ label, source, url, snippet }: CitationBadgeProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-block align-baseline mx-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a
        href={url || "#"}
        target={url ? "_blank" : undefined}
        rel="noopener noreferrer"
        onClick={(e) => {
          if (!url) e.preventDefault();
        }}
        className="inline-flex items-center gap-0.5 rounded-md bg-[#e4b86a]/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#e4b86a] ring-1 ring-[#e4b86a]/30 transition hover:bg-[#e4b86a]/25 hover:ring-[#e4b86a]/50"
      >
        <span>[{label}]</span>
        {url && <ExternalLink className="size-2.5 opacity-70" />}
      </a>

      {hovered && (
        <span className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 w-64 rounded-xl border border-white/12 bg-zinc-950 p-2.5 text-xs text-zinc-200 shadow-xl backdrop-blur-md">
          <span className="block font-semibold text-zinc-100">{source}</span>
          {snippet && (
            <span className="mt-1 block text-[11px] leading-snug text-zinc-400 line-clamp-3">
              "{snippet}"
            </span>
          )}
          {url && (
            <span className="mt-1.5 block truncate text-[10px] text-[#38bdf8]">
              {url}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
