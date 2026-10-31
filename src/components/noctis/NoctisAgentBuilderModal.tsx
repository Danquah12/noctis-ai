"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bot,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Shield,
  Send,
  X,
  FileCode,
  Zap,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type NoctisCustomAgent,
  type BaseSpecialistEngine,
  getCustomAgents,
  saveCustomAgent,
  deleteCustomAgent,
  getActiveCustomAgentId,
  setActiveCustomAgentId,
} from "@/lib/noctis-custom-agents";

interface NoctisAgentBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAgent?: (agent: NoctisCustomAgent | null) => void;
  workspaceFileNames?: string[];
}

const EMOJI_OPTIONS = ["📊", "🛡️", "🩺", "🏛️", "⚡", "🔬", "🤖", "📈", "🔍", "💼", "🧠", "🎯"];

const BASE_ENGINES: Array<{ id: BaseSpecialistEngine; label: string; desc: string }> = [
  { id: "NOCTIS-INVEST-001", label: "Financial & Valuation Engine", desc: "DCF, ASC 606, Rule of 40, SaaS unit economics" },
  { id: "NOCTIS-CYBER-001", label: "Cyber & Threat Defense", desc: "MITRE ATT&CK, SAST-to-DAST, CVSS exploitability" },
  { id: "NOCTIS-HEALTH-001", label: "Clinical & Health Intelligence", desc: "Emergency triage, differential diagnosis, FHIR v5" },
  { id: "NOCTIS-ARCH-001", label: "Architectural & BIM Validator", desc: "IFC 4.3, buildingSMART IDS, structural codes" },
  { id: "NOCTIS-CORE-001", label: "General Frontier Intelligence", desc: "Autonomous reasoning, polyglot coding, synthesis" },
];

export function NoctisAgentBuilderModal({
  open,
  onClose,
  onSelectAgent,
  workspaceFileNames = [],
}: NoctisAgentBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<"directory" | "builder" | "playground">("directory");
  const [agents, setAgents] = useState<NoctisCustomAgent[]>([]);
  const [activeAgentId, setActiveAgentIdState] = useState<string | null>(null);

  // Form State
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("🤖");
  const [baseEngine, setBaseEngine] = useState<BaseSpecialistEngine>("NOCTIS-INVEST-001");
  const [reasoningDepth, setReasoningDepth] = useState<"standard" | "deep" | "forensic">("forensic");
  const [systemInstructions, setSystemInstructions] = useState("");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([""]);
  const [selectedKnowledgeFiles, setSelectedKnowledgeFiles] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Playground State
  const [playgroundTurns, setPlaygroundTurns] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [playgroundInput, setPlaygroundInput] = useState("");
  const [playgroundBusy, setPlaygroundBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const loaded = getCustomAgents();
      setAgents(loaded);
      setActiveAgentIdState(getActiveCustomAgentId());
    }
  }, [open]);

  function handleCreateNew() {
    setEditingAgentId(null);
    setName("");
    setTagline("");
    setAvatarEmoji(EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)] || "🤖");
    setBaseEngine("NOCTIS-INVEST-001");
    setReasoningDepth("forensic");
    setSystemInstructions(
      "You are a specialized Noctis AI Agent.\nEnforce deterministic calculations, verified primary evidence citations, and structured markdown delivery."
    );
    setSuggestedPrompts([""]);
    setSelectedKnowledgeFiles([]);
    setActiveTab("builder");
  }

  function handleEdit(agent: NoctisCustomAgent) {
    setEditingAgentId(agent.id);
    setName(agent.name);
    setTagline(agent.tagline);
    setAvatarEmoji(agent.avatarEmoji);
    setBaseEngine(agent.baseEngine);
    setReasoningDepth(agent.reasoningDepth);
    setSystemInstructions(agent.systemInstructions);
    setSuggestedPrompts(agent.suggestedPrompts.length ? agent.suggestedPrompts : [""]);
    setSelectedKnowledgeFiles(agent.knowledgeFileNames);
    setActiveTab("builder");
  }

  function handleSave() {
    if (!name.trim()) return;

    const newAgent: NoctisCustomAgent = {
      id: editingAgentId || `custom-agent-${Date.now()}`,
      name: name.trim(),
      tagline: tagline.trim() || "Custom Noctis Specialist",
      avatarEmoji,
      baseEngine,
      reasoningDepth,
      systemInstructions: systemInstructions.trim(),
      suggestedPrompts: suggestedPrompts.filter((p) => p.trim().length > 0),
      knowledgeFileNames: selectedKnowledgeFiles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveCustomAgent(newAgent);
    const updated = getCustomAgents();
    setAgents(updated);
    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 2000);
    setActiveTab("directory");
  }

  function handleDelete(id: string) {
    deleteCustomAgent(id);
    const updated = getCustomAgents();
    setAgents(updated);
    if (activeAgentId === id) {
      setActiveAgentIdState(null);
      if (onSelectAgent) onSelectAgent(null);
    }
  }

  function handleActivate(agent: NoctisCustomAgent | null) {
    const id = agent ? agent.id : null;
    setActiveCustomAgentId(id);
    setActiveAgentIdState(id);
    if (onSelectAgent) onSelectAgent(agent);
    onClose();
  }

  // Quick playground simulator
  function handlePlaygroundSubmit() {
    if (!playgroundInput.trim() || playgroundBusy) return;
    const userText = playgroundInput.trim();
    setPlaygroundTurns((prev) => [...prev, { role: "user", text: userText }]);
    setPlaygroundInput("");
    setPlaygroundBusy(true);

    window.setTimeout(() => {
      const response = `[${avatarEmoji} ${name || "Custom Agent"}] Evaluating under ${baseEngine} (${reasoningDepth.toUpperCase()} stance):\n\nI have received your prompt: "${userText}". My custom instructions are active, and primary evidence provenance gates are enforced.`;
      setPlaygroundTurns((prev) => [...prev, { role: "assistant", text: response }]);
      setPlaygroundBusy(false);
    }, 600);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-[#141414] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6 bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#e4b86a]/20 to-purple-500/20 border border-[#e4b86a]/30">
              <Bot className="size-5 text-[#e4b86a]" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                Specialist Agent Builder
                <span className="rounded-full bg-gradient-to-r from-[#e4b86a]/20 to-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-[#e4b86a] border border-[#e4b86a]/30">
                  NOCTIS GPTS
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Design, specialize, and deploy tailored AI engines with persistent knowledge and personas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center rounded-full bg-white/5 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("directory")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition",
                  activeTab === "directory" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                Agent Directory ({agents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("builder")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition",
                  activeTab === "builder" ? "bg-[#e4b86a] text-[#141414] font-semibold" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {editingAgentId ? "Edit Agent" : "+ Create Agent"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("playground")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition",
                  activeTab === "playground" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                Test Playground
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* TAB 1: AGENT DIRECTORY */}
          {activeTab === "directory" ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">Active Specialist Squad</h3>
                  <p className="text-xs text-zinc-500">
                    Switch between tailored personas or create your own custom agent.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#e4b86a] px-4 py-2 text-xs font-semibold text-[#141414] hover:bg-[#d4a85a] transition"
                >
                  <Plus className="size-4" />
                  New Specialist Agent
                </button>
              </div>

              {activeAgentId ? (
                <div className="flex items-center justify-between rounded-2xl border border-[#e4b86a]/40 bg-[#e4b86a]/10 p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {agents.find((a) => a.id === activeAgentId)?.avatarEmoji || "🤖"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#e4b86a]">
                          Active In Chat
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {agents.find((a) => a.id === activeAgentId)?.name}
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-300">
                        {agents.find((a) => a.id === activeAgentId)?.tagline}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActivate(null)}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300 hover:bg-white/20"
                  >
                    Deactivate (Revert to Default)
                  </button>
                </div>
              ) : null}

              {/* Grid of Agents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => {
                  const isActive = activeAgentId === agent.id;
                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        "flex flex-col justify-between rounded-2xl border p-4.5 transition",
                        isActive
                          ? "border-[#e4b86a] bg-[#1a1710] shadow-lg shadow-[#e4b86a]/5"
                          : "border-white/10 bg-[#181818] hover:border-white/20"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl p-2 rounded-2xl bg-white/5 border border-white/10">
                              {agent.avatarEmoji}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {agent.name}
                                {agent.isBuiltIn ? (
                                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-semibold text-blue-300 border border-blue-500/30">
                                    Official
                                  </span>
                                ) : null}
                              </h4>
                              <p className="text-xs text-zinc-400 line-clamp-1">{agent.tagline}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(agent)}
                              title="Edit Agent"
                              className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                            >
                              <Edit3 className="size-3.5" />
                            </button>
                            {!agent.isBuiltIn ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(agent.id)}
                                title="Delete Agent"
                                className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-zinc-400 border border-white/5">
                            {agent.baseEngine}
                          </span>
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-zinc-400 border border-white/5">
                            {agent.reasoningDepth.toUpperCase()}
                          </span>
                          {agent.knowledgeFileNames.length ? (
                            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-purple-300 border border-purple-500/20">
                              {agent.knowledgeFileNames.length} Knowledge Bases
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAgentId(agent.id);
                            setName(agent.name);
                            setAvatarEmoji(agent.avatarEmoji);
                            setBaseEngine(agent.baseEngine);
                            setReasoningDepth(agent.reasoningDepth);
                            setSystemInstructions(agent.systemInstructions);
                            setActiveTab("playground");
                          }}
                          className="text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          Test in Playground
                        </button>

                        <button
                          type="button"
                          onClick={() => handleActivate(isActive ? null : agent)}
                          className={cn(
                            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition flex items-center gap-1.5",
                            isActive
                              ? "bg-[#e4b86a] text-[#141414]"
                              : "bg-white/10 text-white hover:bg-white/20"
                          )}
                        >
                          {isActive ? (
                            <>
                              <Check className="size-3.5" /> Active
                            </>
                          ) : (
                            "Activate Agent"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* TAB 2: AGENT BUILDER / CONFIGURE */}
          {activeTab === "builder" ? (
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingAgentId ? `Edit Agent: ${name || "Untitled"}` : "Create New Specialist Agent"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Define the agent persona, domain boundaries, and specialized behavior.
                  </p>
                </div>
                {savedSuccess ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="size-4" /> Saved Successfully
                  </span>
                ) : null}
              </div>

              {/* Identity & Emoji */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">Avatar Emoji</label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#1a1a1a] border border-white/10">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setAvatarEmoji(e)}
                        className={cn(
                          "size-8 rounded-lg text-lg grid place-items-center transition",
                          avatarEmoji === e ? "bg-[#e4b86a]/30 ring-2 ring-[#e4b86a]" : "hover:bg-white/10"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-3 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Agent Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. SaaS Valuation Strategist"
                      className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3.5 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-[#e4b86a]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Tagline / Mission</label>
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Audit ARR multiples, Free Cash Flow margins, and Rule of 40 benchmarks"
                      className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3.5 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-[#e4b86a]"
                    />
                  </div>
                </div>
              </div>

              {/* Governing Engine & Reasoning Depth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Governing Specialist Engine
                  </label>
                  <select
                    value={baseEngine}
                    onChange={(e) => setBaseEngine(e.target.value as BaseSpecialistEngine)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3.5 py-2 text-xs text-zinc-100 outline-none focus:ring-1 focus:ring-[#e4b86a]"
                  >
                    {BASE_ENGINES.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.label} ({eng.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Reasoning Stance</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["standard", "deep", "forensic"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setReasoningDepth(d)}
                        className={cn(
                          "rounded-xl border py-2 text-xs font-semibold capitalize transition",
                          reasoningDepth === d
                            ? "border-[#e4b86a] bg-[#e4b86a]/15 text-[#e4b86a]"
                            : "border-white/10 bg-[#1a1a1a] text-zinc-400 hover:text-white"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* System Instructions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    System Instructions & Domain Rules
                  </label>
                  <span className="text-[11px] text-zinc-500">Auto-injected into every query</span>
                </div>
                <textarea
                  rows={6}
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  placeholder="Specify exact calculations, tone, formatting requirements, and adversarial pushback boundaries..."
                  className="w-full font-mono rounded-2xl border border-white/10 bg-[#1a1a1a] p-4 text-xs leading-relaxed text-zinc-100 outline-none focus:ring-1 focus:ring-[#e4b86a]"
                />
              </div>

              {/* Knowledge Base Bindings from Project Workspace */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <FolderOpen className="size-4 text-[#e4b86a]" />
                  Bind Project Workspace Files as Knowledge
                </label>
                <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-3 text-xs space-y-2">
                  {workspaceFileNames.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {workspaceFileNames.map((fn) => {
                        const isSelected = selectedKnowledgeFiles.includes(fn);
                        return (
                          <button
                            key={fn}
                            type="button"
                            onClick={() =>
                              setSelectedKnowledgeFiles((prev) =>
                                isSelected ? prev.filter((f) => f !== fn) : [...prev, fn]
                              )
                            }
                            className={cn(
                              "rounded-lg border px-2.5 py-1 font-mono transition flex items-center gap-1.5",
                              isSelected
                                ? "border-[#e4b86a] bg-[#e4b86a]/20 text-[#e4b86a]"
                                : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                            )}
                          >
                            <FileCode className="size-3" />
                            {fn}
                            {isSelected ? <Check className="size-3" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-xs">
                      No workspace files detected. Open the <strong>Projects</strong> explorer to add files that can be bound as knowledge bases.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab("directory")}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-full bg-[#e4b86a] px-6 py-2 text-xs font-bold text-[#141414] hover:bg-[#d4a85a] transition"
                >
                  Save Specialist Agent
                </button>
              </div>
            </div>
          ) : null}

          {/* TAB 3: PLAYGROUND */}
          {activeTab === "playground" ? (
            <div className="flex h-full flex-col p-6 max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{avatarEmoji}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{name || "Testing Agent"}</h4>
                    <span className="text-[11px] text-zinc-400">
                      Sandbox test environment • {baseEngine}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPlaygroundTurns([])}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Clear Chat
                </button>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 min-h-[300px] overflow-y-auto space-y-3 p-4 rounded-2xl border border-white/10 bg-[#161616]">
                {playgroundTurns.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-8 text-zinc-500">
                    <Sparkles className="size-8 text-[#e4b86a]/40 mb-2" />
                    <p className="text-sm font-semibold text-zinc-300">Agent Playground Ready</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      Send a test query below to verify how your agent responds under its custom instructions.
                    </p>
                  </div>
                ) : (
                  playgroundTurns.map((turn, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed",
                        turn.role === "user"
                          ? "ml-auto bg-[#e4b86a] text-[#141414] font-medium"
                          : "mr-auto bg-white/5 border border-white/10 text-zinc-200"
                      )}
                    >
                      {turn.text}
                    </div>
                  ))
                )}
                {playgroundBusy ? (
                  <div className="mr-auto rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-xs text-zinc-400 animate-pulse">
                    {avatarEmoji} {name || "Agent"} is analyzing under custom instructions...
                  </div>
                ) : null}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2">
                <input
                  value={playgroundInput}
                  onChange={(e) => setPlaygroundInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePlaygroundSubmit();
                  }}
                  placeholder={`Ask ${name || "this agent"} a test question...`}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#181818] px-4 py-2.5 text-xs text-zinc-100 outline-none focus:ring-1 focus:ring-[#e4b86a]"
                />
                <button
                  type="button"
                  onClick={handlePlaygroundSubmit}
                  disabled={!playgroundInput.trim() || playgroundBusy}
                  className="grid size-10 place-items-center rounded-2xl bg-[#e4b86a] text-[#141414] hover:bg-[#d4a85a] disabled:opacity-40 transition"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
