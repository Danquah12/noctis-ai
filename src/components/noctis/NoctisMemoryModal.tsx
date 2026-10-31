"use client";

import React, { useState, useEffect } from "react";
import { Brain, X, Plus, Trash2, Check, Sparkles, User, Settings2, Sliders } from "lucide-react";

export interface MemoryItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface CustomInstructions {
  aboutUser: string;
  responseStyle: string;
  personaPreset: string;
}

const STORAGE_INSTRUCTIONS_KEY = "noctis_custom_instructions";
const STORAGE_MEMORY_KEY = "noctis_memory_bank";

export const PERSONA_PRESETS = [
  {
    id: "default",
    label: "Adaptive Generalist",
    description: "Balanced, authoritative, comprehensive and context-aware.",
    about: "",
    style: "Be thorough, objective, concise, and prioritize verifiable facts.",
  },
  {
    id: "pastoral",
    label: "Pastoral & Theological Scholar",
    description: "Expository exegesis, historical-grammatical context, pastoral warmth.",
    about: "Christian scholar, pastor, and Bible teacher. Prioritize biblical fidelity, Greek/Hebrew text, and pastoral ministry applications.",
    style: "Adopt a scholarly yet reverent pastoral tone. Reference Scripture with book, chapter, and verse citations.",
  },
  {
    id: "finance",
    label: "Wall Street Equity Analyst & CFO",
    description: "10-K SEC filings, ASC 606 revenue, DCF valuation, EBITDA margin.",
    about: "Institutional investor, equity researcher, and corporate finance director. Focused on unit economics, capital allocation, and SEC disclosures.",
    style: "Present data in structured tables, cite SEC EDGAR filings, provide sensitivity analyses, and avoid boilerplate disclaimers.",
  },
  {
    id: "cyber",
    label: "Red Team DFIR & Cloud Architect",
    description: "MITRE ATT&CK, NIST SP 800-53, CVE/KEV, SAST 401 rules.",
    about: "Senior offensive security engineer, cloud architect, and DFIR responder. Hardened infrastructure, zero trust, threat hunting.",
    style: "Format vulnerabilities with CVSS scores, remediation code snippets, exploit preconditions, and MITRE tactic/technique IDs.",
  },
  {
    id: "executive",
    label: "Executive Briefing (CEO/Board)",
    description: "High-signal executive summaries, decision trees, bottom-line upfront.",
    about: "Chief Executive Officer / Board Director evaluating strategic trade-offs.",
    style: "Lead with the Bottom Line Up Front (BLUF). Use 3-5 high-impact bullet points followed by concise financial/risk implications.",
  },
];

export function getNoctisPersonalizedContext(): string {
  if (typeof window === "undefined") return "";
  try {
    const rawInstr = localStorage.getItem(STORAGE_INSTRUCTIONS_KEY);
    const rawMem = localStorage.getItem(STORAGE_MEMORY_KEY);
    const parts: string[] = [];

    if (rawInstr) {
      const instr: CustomInstructions = JSON.parse(rawInstr);
      if (instr.aboutUser?.trim()) {
        parts.push(`[User Context]: ${instr.aboutUser.trim()}`);
      }
      if (instr.responseStyle?.trim()) {
        parts.push(`[Response Guidelines]: ${instr.responseStyle.trim()}`);
      }
    }

    if (rawMem) {
      const memories: MemoryItem[] = JSON.parse(rawMem);
      if (memories.length > 0) {
        const memStrings = memories.map((m) => `• ${m.text}`).join("\n");
        parts.push(`[User Memory Profile]:\n${memStrings}`);
      }
    }

    return parts.join("\n\n");
  } catch {
    return "";
  }
}

interface NoctisMemoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function NoctisMemoryModal({ open, onClose }: NoctisMemoryModalProps) {
  const [tab, setTab] = useState<"instructions" | "memory">("instructions");
  const [instructions, setInstructions] = useState<CustomInstructions>({
    aboutUser: "",
    responseStyle: "",
    personaPreset: "default",
  });
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawInstr = localStorage.getItem(STORAGE_INSTRUCTIONS_KEY);
      if (rawInstr) setInstructions(JSON.parse(rawInstr));

      const rawMem = localStorage.getItem(STORAGE_MEMORY_KEY);
      if (rawMem) {
        setMemories(JSON.parse(rawMem));
      } else {
        // Seed initial memory items for demonstration
        const initial: MemoryItem[] = [
          { id: "1", text: "Prefers TypeScript, Tailwind CSS, and clean modular code.", createdAt: "2026-10-25" },
          { id: "2", text: "Values verifiable citations with primary sources (SEC, PubMed, NIST).", createdAt: "2026-10-28" },
        ];
        setMemories(initial);
        localStorage.setItem(STORAGE_MEMORY_KEY, JSON.stringify(initial));
      }
    } catch {
      // ignore
    }
  }, [open]);

  function handleSaveInstructions() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_INSTRUCTIONS_KEY, JSON.stringify(instructions));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }

  function handleApplyPreset(presetId: string) {
    const p = PERSONA_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    const updated: CustomInstructions = {
      personaPreset: p.id,
      aboutUser: p.about,
      responseStyle: p.style,
    };
    setInstructions(updated);
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_INSTRUCTIONS_KEY, JSON.stringify(updated));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }

  function handleAddMemory() {
    if (!newMemory.trim()) return;
    const item: MemoryItem = {
      id: Date.now().toString(),
      text: newMemory.trim(),
      createdAt: new Date().toISOString().split("T")[0],
    };
    const next = [item, ...memories];
    setMemories(next);
    setNewMemory("");
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_MEMORY_KEY, JSON.stringify(next));
  }

  function handleDeleteMemory(id: string) {
    const next = memories.filter((m) => m.id !== id);
    setMemories(next);
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_MEMORY_KEY, JSON.stringify(next));
  }

  function handleClearAllMemories() {
    if (confirm("Are you sure you want to clear all personal memories?")) {
      setMemories([]);
      if (typeof window === "undefined") return;
      localStorage.removeItem(STORAGE_MEMORY_KEY);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-white/12 bg-[#1c1c1c] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#e4b86a]/20 text-[#e4b86a]">
              <Brain className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Personalization & Memory</h2>
              <p className="text-xs text-zinc-400">Custom instructions & memory profile for Noctis</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/8 px-6 pt-2">
          <button
            type="button"
            onClick={() => setTab("instructions")}
            className={`border-b-2 px-4 py-2.5 text-xs font-medium transition ${
              tab === "instructions"
                ? "border-[#e4b86a] text-[#e4b86a]"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Custom Instructions & Persona
          </button>
          <button
            type="button"
            onClick={() => setTab("memory")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
              tab === "memory"
                ? "border-[#e4b86a] text-[#e4b86a]"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Memory Bank</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-zinc-300">
              {memories.length}
            </span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {tab === "instructions" ? (
            <div className="space-y-4">
              {/* Persona Presets */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Quick Persona Presets
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PERSONA_PRESETS.map((preset) => {
                    const active = instructions.personaPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.id)}
                        className={`flex flex-col items-start rounded-xl p-2.5 text-left text-xs transition border ${
                          active
                            ? "border-[#e4b86a] bg-[#e4b86a]/10 text-white"
                            : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="font-semibold text-zinc-100 flex items-center gap-1">
                          {preset.label}
                          {active && <Check className="size-3 text-[#e4b86a]" />}
                        </span>
                        <span className="mt-1 line-clamp-2 text-[11px] text-zinc-400 leading-snug">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* About user */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  What would you like Noctis to know about you to provide better responses?
                </label>
                <textarea
                  rows={3}
                  value={instructions.aboutUser}
                  onChange={(e) => setInstructions((prev) => ({ ...prev, aboutUser: e.target.value }))}
                  placeholder="e.g. Your role, industry, technical preferences, theological convictions, or typical workflows..."
                  className="w-full rounded-xl border border-white/12 bg-black/40 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
              </div>

              {/* Response style */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  How would you like Noctis to respond?
                </label>
                <textarea
                  rows={3}
                  value={instructions.responseStyle}
                  onChange={(e) => setInstructions((prev) => ({ ...prev, responseStyle: e.target.value }))}
                  placeholder="e.g. Format preferences, tone, table-first, cite sources with primary links, concise vs detailed..."
                  className="w-full rounded-xl border border-white/12 bg-black/40 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-zinc-500">
                  Instructions are automatically included with every Noctis conversation.
                </span>
                <button
                  type="button"
                  onClick={handleSaveInstructions}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#e4b86a] px-4 py-2 text-xs font-semibold text-[#1a1408] transition hover:opacity-90"
                >
                  {savedToast ? (
                    <>
                      <Check className="size-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Instructions</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Memory Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMemory();
                    }
                  }}
                  placeholder="Add a fact, preference, or context Noctis should always remember..."
                  className="flex-1 rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMemory}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/20"
                >
                  <Plus className="size-3.5" />
                  <span>Remember</span>
                </button>
              </div>

              {/* Memory List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Saved Memories ({memories.length})</span>
                  {memories.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllMemories}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {memories.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
                    No memories saved yet. Noctis remembers preferences you teach it or add above.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-1.5 overflow-y-auto">
                    {memories.map((mem) => (
                      <div
                        key={mem.id}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-2.5 text-xs transition hover:bg-white/[0.05]"
                      >
                        <span className="text-zinc-200">{mem.text}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">{mem.createdAt}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="text-zinc-500 opacity-60 transition group-hover:opacity-100 hover:text-red-400"
                            title="Delete memory"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
