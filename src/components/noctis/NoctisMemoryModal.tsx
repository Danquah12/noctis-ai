"use client";

import React, { useState, useEffect } from "react";
import { Brain, X, Plus, Trash2, Check, Clock, Play, Pause, Database } from "lucide-react";

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

export interface ScheduledTaskRow {
  id: string;
  title: string;
  task_type: string;
  cron_or_iso: string;
  status: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_output_summary?: string | null;
}

const STORAGE_INSTRUCTIONS_KEY = "noctis_custom_instructions";
const STORAGE_MEMORY_KEY = "noctis_memory_bank";
export const STORAGE_MEMORY_ENABLED_KEY = "noctis_memory_enabled";

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

export function isNoctisMemoryEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_MEMORY_ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
}

export function getNoctisPersonalizedContext(opts?: { skipAll?: boolean; skipMemory?: boolean }): string {
  if (opts?.skipAll) return "";
  if (typeof window === "undefined") return "";
  try {
    const rawInstr = localStorage.getItem(STORAGE_INSTRUCTIONS_KEY);
    const rawMem = localStorage.getItem(STORAGE_MEMORY_KEY);
    const memoryOn = !opts?.skipMemory && isNoctisMemoryEnabled();
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

    if (memoryOn && rawMem) {
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
  initialTab?: "instructions" | "memory" | "schedules";
}

const CRON_PRESETS = [
  { label: "Daily @ 08:00 UTC", cron: "0 8 * * *" },
  { label: "Weekdays @ 08:00 UTC", cron: "0 8 * * 1-5" },
  { label: "Weekly Monday @ 09:00 UTC", cron: "0 9 * * 1" },
  { label: "Hourly", cron: "0 * * * *" },
];

export function NoctisMemoryModal({ open, onClose, initialTab }: NoctisMemoryModalProps) {
  const [tab, setTab] = useState<"instructions" | "memory" | "schedules">(initialTab || "instructions");
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(true);
  const [syncedBadge, setSyncedBadge] = useState<boolean>(false);
  const [instructions, setInstructions] = useState<CustomInstructions>({
    aboutUser: "",
    responseStyle: "",
    personaPreset: "default",
  });
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [savedToast, setSavedToast] = useState(false);

  // Scheduled tasks state
  const [tasks, setTasks] = useState<ScheduledTaskRow[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCron, setNewTaskCron] = useState("0 8 * * 1-5");
  const [tasksBusy, setTasksBusy] = useState(false);

  useEffect(() => {
    if (open && initialTab) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    setMemoryEnabled(isNoctisMemoryEnabled());
    try {
      const rawInstr = localStorage.getItem(STORAGE_INSTRUCTIONS_KEY);
      if (rawInstr) setInstructions(JSON.parse(rawInstr));

      const rawMem = localStorage.getItem(STORAGE_MEMORY_KEY);
      if (rawMem) {
        setMemories(JSON.parse(rawMem));
      } else {
        const initial: MemoryItem[] = [
          { id: "1", text: "Prefers TypeScript, Tailwind CSS, and clean modular code.", createdAt: "2026-10-25" },
          { id: "2", text: "Values verifiable citations with primary sources (SEC, PubMed, NIST).", createdAt: "2026-10-28" },
        ];
        setMemories(initial);
        localStorage.setItem(STORAGE_MEMORY_KEY, JSON.stringify(initial));
      }
    } catch {
      /* ignore localStorage error */
    }

    // Hydrate from Neon Postgres personalization + schedules
    void (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch("/api/v2/assistant/personalization"),
          fetch("/api/v2/assistant/schedules"),
        ]);
        if (pRes.ok) {
          const pData = (await pRes.json()) as {
            memoryEnabled?: boolean;
            aboutUser?: string;
            responseStyle?: string;
            personaPreset?: string;
            synced?: boolean;
            memories?: Array<{ id?: string; content_redacted?: string; created_at?: string }>;
          };
          if (typeof pData.memoryEnabled === "boolean") {
            setMemoryEnabled(pData.memoryEnabled);
            localStorage.setItem(STORAGE_MEMORY_ENABLED_KEY, String(pData.memoryEnabled));
          }
          if (pData.aboutUser || pData.responseStyle || (pData.personaPreset && pData.personaPreset !== "default")) {
            const merged: CustomInstructions = {
              aboutUser: pData.aboutUser || "",
              responseStyle: pData.responseStyle || "",
              personaPreset: pData.personaPreset || "default",
            };
            setInstructions(merged);
            localStorage.setItem(STORAGE_INSTRUCTIONS_KEY, JSON.stringify(merged));
          }
          if (Array.isArray(pData.memories) && pData.memories.length > 0) {
            const dbMems = pData.memories
              .filter((m) => m.content_redacted)
              .map((m, i) => ({
                id: m.id || `db-${i}`,
                text: String(m.content_redacted),
                createdAt: String(m.created_at || "").slice(0, 10) || "synced",
              }));
            if (dbMems.length > 0) {
              setMemories(dbMems);
              localStorage.setItem(STORAGE_MEMORY_KEY, JSON.stringify(dbMems));
            }
          }
          if (pData.synced) setSyncedBadge(true);
        }
        if (sRes.ok) {
          const sData = (await sRes.json()) as { tasks?: ScheduledTaskRow[] };
          if (Array.isArray(sData.tasks)) setTasks(sData.tasks);
        }
      } catch {
        /* non-fatal fallback to localStorage */
      }
    })();
  }, [open]);

  async function syncPersonalizationToDb(payload: {
    memoryEnabled?: boolean;
    aboutUser?: string;
    responseStyle?: string;
    personaPreset?: string;
  }) {
    try {
      const res = await fetch("/api/v2/assistant/personalization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) setSyncedBadge(true);
    } catch {
      /* localStorage remains authoritative locally */
    }
  }

  function handleToggleMemoryEnabled(next: boolean) {
    setMemoryEnabled(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_MEMORY_ENABLED_KEY, String(next));
    }
    void syncPersonalizationToDb({ memoryEnabled: next });
  }

  function handleSaveInstructions() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_INSTRUCTIONS_KEY, JSON.stringify(instructions));
    void syncPersonalizationToDb({
      aboutUser: instructions.aboutUser,
      responseStyle: instructions.responseStyle,
      personaPreset: instructions.personaPreset,
      memoryEnabled,
    });
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
    void syncPersonalizationToDb({
      aboutUser: updated.aboutUser,
      responseStyle: updated.responseStyle,
      personaPreset: updated.personaPreset,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }

  async function handleAddMemory() {
    if (!newMemory.trim()) return;
    const cleanText = newMemory.trim();
    const item: MemoryItem = {
      id: Date.now().toString(),
      text: cleanText,
      createdAt: new Date().toISOString().split("T")[0]!,
    };
    const next = [item, ...memories];
    setMemories(next);
    setNewMemory("");
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_MEMORY_KEY, JSON.stringify(next));
    }
    try {
      const res = await fetch("/api/v2/assistant/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: cleanText, consentGranted: true, purpose: "user_preference" }),
      });
      if (res.ok) setSyncedBadge(true);
    } catch {
      /* non-fatal */
    }
  }

  async function handleDeleteMemory(id: string) {
    const next = memories.filter((m) => m.id !== id);
    setMemories(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_MEMORY_KEY, JSON.stringify(next));
    }
    try {
      await fetch(`/api/v2/assistant/memory?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      /* non-fatal */
    }
  }

  function handleClearAllMemories() {
    if (confirm("Are you sure you want to clear all personal memories?")) {
      setMemories([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_MEMORY_KEY);
      }
    }
  }

  async function reloadSchedules() {
    const res = await fetch("/api/v2/assistant/schedules");
    if (res.ok) {
      const data = (await res.json()) as { tasks?: ScheduledTaskRow[] };
      if (Array.isArray(data.tasks)) setTasks(data.tasks);
    }
  }

  async function handleCreateSchedule() {
    if (!newTaskTitle.trim()) return;
    setTasksBusy(true);
    try {
      await fetch("/api/v2/assistant/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          taskType: "RESEARCH_WATCH",
          cronOrIso: newTaskCron,
          payload: { prompt: newTaskTitle.trim() },
        }),
      });
      setNewTaskTitle("");
      await reloadSchedules();
    } finally {
      setTasksBusy(false);
    }
  }

  async function handleToggleTaskStatus(t: ScheduledTaskRow) {
    const nextStatus = t.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    await fetch("/api/v2/assistant/schedules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, status: nextStatus }),
    });
    await reloadSchedules();
  }

  async function handleRunTaskNow(t: ScheduledTaskRow) {
    setTasksBusy(true);
    try {
      await fetch("/api/v2/assistant/schedules/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, executeCron: true }),
      });
      await reloadSchedules();
    } finally {
      setTasksBusy(false);
    }
  }

  async function handleDeleteTask(id: string) {
    await fetch(`/api/v2/assistant/schedules?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await reloadSchedules();
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">Personalization, Memory &amp; Schedules</h2>
                {syncedBadge && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    <Database className="size-2.5" />
                    Neon Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Custom instructions, toggleable memory profile &amp; automated recurring prompts</p>
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
              tab === "instructions" ? "border-[#e4b86a] text-[#e4b86a]" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Custom Instructions
          </button>
          <button
            type="button"
            onClick={() => setTab("memory")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
              tab === "memory" ? "border-[#e4b86a] text-[#e4b86a]" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Memory</span>
            <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-zinc-300">{memories.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("schedules")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
              tab === "schedules" ? "border-[#e4b86a] text-[#e4b86a]" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clock className="size-3.5" />
            <span>Scheduled Tasks</span>
            <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-zinc-300">{tasks.length}</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {tab === "instructions" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">Quick Persona Presets</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PERSONA_PRESETS.map((preset) => {
                    const active = instructions.personaPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.id)}
                        className={`flex flex-col items-start rounded-xl p-2.5 text-left text-xs transition border ${
                          active ? "border-[#e4b86a] bg-[#e4b86a]/10 text-white" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="font-semibold text-zinc-100 flex items-center gap-1">
                          {preset.label}
                          {active && <Check className="size-3 text-[#e4b86a]" />}
                        </span>
                        <span className="mt-1 line-clamp-2 text-[11px] text-zinc-400 leading-snug">{preset.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">What would you like Noctis to know about you?</label>
                <textarea
                  rows={3}
                  value={instructions.aboutUser}
                  onChange={(e) => setInstructions((prev) => ({ ...prev, aboutUser: e.target.value }))}
                  placeholder="e.g. Your role, industry, technical preferences, or typical workflows..."
                  className="w-full rounded-xl border border-white/12 bg-black/40 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">How would you like Noctis to respond?</label>
                <textarea
                  rows={3}
                  value={instructions.responseStyle}
                  onChange={(e) => setInstructions((prev) => ({ ...prev, responseStyle: e.target.value }))}
                  placeholder="e.g. Be concise, use bullet points, table-first, cite primary sources..."
                  className="w-full rounded-xl border border-white/12 bg-black/40 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-zinc-500">Automatically included in non-temporary chats and synced to your account.</span>
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
          ) : tab === "memory" ? (
            <div className="space-y-4">
              {/* Master Memory ON/OFF toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="text-xs font-semibold text-zinc-100">Reference Saved Memories</div>
                  <div className="text-[11px] text-zinc-400">
                    {memoryEnabled ? "Active — Noctis uses saved memories across non-temporary chats." : "Paused — Saved memories are retained but excluded from prompts."}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={memoryEnabled}
                  onClick={() => handleToggleMemoryEnabled(!memoryEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${
                    memoryEnabled ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      memoryEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddMemory();
                    }
                  }}
                  placeholder="Add a fact, preference, or context Noctis should always remember..."
                  className="flex-1 rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleAddMemory()}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/20"
                >
                  <Plus className="size-3.5" />
                  <span>Remember</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Saved Memories ({memories.length})</span>
                  {memories.length > 0 && (
                    <button type="button" onClick={handleClearAllMemories} className="text-[11px] text-red-400 hover:text-red-300">
                      Clear all
                    </button>
                  )}
                </div>

                {memories.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
                    No memories saved yet. Noctis remembers preferences you teach it or add above.
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1.5 overflow-y-auto">
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
                            onClick={() => void handleDeleteMemory(mem.id)}
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
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
                <div className="text-xs font-semibold text-white">Create Automated Scheduled Task</div>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Summarize top 5 NIST CVE advisories & Kubernetes security updates"
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <select
                    value={newTaskCron}
                    onChange={(e) => setNewTaskCron(e.target.value)}
                    className="rounded-xl border border-white/12 bg-black/40 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    {CRON_PRESETS.map((p) => (
                      <option key={p.cron} value={p.cron}>
                        {p.label} ({p.cron})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleCreateSchedule()}
                    disabled={tasksBusy || !newTaskTitle.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#e4b86a] px-4 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-50"
                  >
                    <Plus className="size-3.5" />
                    <span>Schedule Task</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
                    No scheduled tasks yet. Create one above or ask in chat: &ldquo;Schedule a task to ...&rdquo;
                  </p>
                ) : (
                  tasks.map((t) => (
                    <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-zinc-100">{t.title}</div>
                          <div className="text-[11px] text-zinc-400">
                            Cron: <code>{t.cron_or_iso}</code> · Status:{" "}
                            <span className={t.status === "ACTIVE" ? "text-emerald-400" : "text-amber-300"}>{t.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleRunTaskNow(t)}
                            disabled={tasksBusy}
                            className="rounded-lg border border-sky-500/30 bg-sky-500/15 px-2 py-1 text-[11px] text-sky-300 hover:bg-sky-500/25"
                          >
                            <Play className="size-3 inline mr-1" />
                            Run
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleTaskStatus(t)}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/10"
                          >
                            {t.status === "PAUSED" ? <Play className="size-3 inline mr-1" /> : <Pause className="size-3 inline mr-1" />}
                            {t.status === "PAUSED" ? "Resume" : "Pause"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteTask(t.id)}
                            className="rounded-lg p-1 text-zinc-400 hover:text-rose-400"
                            title="Delete schedule"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      {t.last_output_summary && (
                        <div className="rounded-lg bg-black/30 px-2.5 py-1.5 text-[11px] text-zinc-300">
                          Latest run: {t.last_output_summary}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
