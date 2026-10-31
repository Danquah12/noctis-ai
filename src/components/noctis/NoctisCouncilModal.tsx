"use client";

import { useState } from "react";
import {
  Users2,
  Sparkles,
  X,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ArrowRight,
  Flame,
  Scale,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COUNCIL_PRESETS,
  getAllAvailableCouncilMembers,
  runCouncilDeliberation,
  formatCouncilDossierMarkdown,
  type CouncilMember,
  type CouncilPreset,
  type CouncilSession,
} from "@/lib/noctis-council";

interface NoctisCouncilModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title?: string) => void;
  onInsertToChat?: (text: string) => void;
  initialTopic?: string;
}

export function NoctisCouncilModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
  initialTopic = "",
}: NoctisCouncilModalProps) {
  const allMembers = getAllAvailableCouncilMembers();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(COUNCIL_PRESETS[0].id);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    COUNCIL_PRESETS[0].memberIds
  );
  const [topic, setTopic] = useState<string>(
    initialTopic || COUNCIL_PRESETS[0].defaultQuestion
  );
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [session, setSession] = useState<CouncilSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"debate" | "consensus">("debate");

  if (!open) return null;

  const handleSelectPreset = (preset: CouncilPreset) => {
    setSelectedPresetId(preset.id);
    setSelectedMemberIds(preset.memberIds);
    setTopic(preset.defaultQuestion);
    setSession(null);
  };

  const toggleMember = (memberId: string) => {
    setSelectedPresetId("custom");
    if (selectedMemberIds.includes(memberId)) {
      if (selectedMemberIds.length > 2) {
        setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const handleConvene = () => {
    if (!topic.trim()) return;
    setIsDeliberating(true);
    setSession(null);

    // Simulate authentic deliberative latency
    setTimeout(() => {
      const result = runCouncilDeliberation(topic, selectedMemberIds);
      setSession(result);
      setIsDeliberating(false);
      setActiveTab("debate");
    }, 850);
  };

  const handleCopy = () => {
    if (!session) return;
    const md = formatCouncilDossierMarkdown(session);
    void navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-[#0e0e0e] shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Users2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">Council of Engines</h2>
                <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  Consensus Studio
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Multi-agent cross-examination and risk synthesis across Noctis specialist engines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-6">
          {/* Preset Chamber Selector */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Select Deliberation Chamber
            </span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {COUNCIL_PRESETS.map((p) => {
                const active = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={cn(
                      "flex flex-col text-left p-3 rounded-2xl border transition text-xs",
                      active
                        ? "border-indigo-500/50 bg-indigo-950/20 text-white shadow-sm ring-1 ring-indigo-500/30"
                        : "border-white/5 bg-[#141414] text-zinc-400 hover:border-white/15 hover:text-zinc-200"
                    )}
                  >
                    <span className="font-semibold text-zinc-100">{p.title}</span>
                    <span className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{p.description}</span>
                    <span className="mt-2 inline-flex items-center text-[10px] font-medium text-indigo-400">
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Council Members Selector */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Active Council Members ({selectedMemberIds.length} Selected)
              </span>
              <span className="text-[11px] text-zinc-500">Min 2 engines required</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {allMembers.map((member) => {
                const selected = selectedMemberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border transition",
                      selected
                        ? "border-white/20 bg-white/10 text-white shadow-sm"
                        : "border-white/5 bg-[#141414] text-zinc-400 opacity-60 hover:opacity-100"
                    )}
                  >
                    <span className="text-base">{member.avatarEmoji}</span>
                    <div className="text-left">
                      <p className="font-semibold text-zinc-200 leading-tight">{member.name}</p>
                      <p className="text-[10px] text-zinc-400">{member.engineId}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deliberation Topic Input */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Deliberation Mandate or Strategic Dilemma
            </span>
            <div className="relative">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="State the acquisition, technology change, clinical protocol, or systemic dilemma for council cross-examination..."
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-[#141414] p-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 leading-relaxed resize-none"
              />
              <button
                type="button"
                onClick={handleConvene}
                disabled={isDeliberating || !topic.trim()}
                className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {isDeliberating ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Deliberating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Convene Council
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Deliberation Results Stage */}
          {session ? (
            <div className="mt-4 space-y-4 rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-inner">
              {/* Header metrics bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs">
                    <Scale className="size-3.5 text-indigo-400" />
                    <span className="font-semibold text-zinc-300">Consensus Alignment:</span>
                    <span className="font-bold text-indigo-400">{session.consensus.consensusScore}%</span>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold border uppercase tracking-wider",
                      session.consensus.verdict === "APPROVED"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : session.consensus.verdict === "CONDITIONAL_APPROVAL"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    )}
                  >
                    Verdict: {session.consensus.verdict.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("debate")}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      activeTab === "debate" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Debate Transcript ({session.turns.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("consensus")}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      activeTab === "consensus" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Consensus & Directives
                  </button>
                </div>
              </div>

              {/* View 1: Multi-turn Debate Transcript */}
              {activeTab === "debate" ? (
                <div className="space-y-4">
                  {session.turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/5 bg-[#171717] p-4 text-xs space-y-2"
                      style={{ borderLeftColor: turn.speakerColor, borderLeftWidth: "4px" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{turn.speakerAvatar}</span>
                          <div>
                            <span className="font-bold text-zinc-100">{turn.speakerName}</span>
                            <span className="text-zinc-400 ml-1.5 font-normal text-[11px]">({turn.speakerRole})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase font-bold text-zinc-400">
                            {turn.round}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                              turn.riskRating === "critical"
                                ? "bg-rose-500/20 text-rose-300"
                                : turn.riskRating === "high"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            )}
                          >
                            {turn.riskRating} risk
                          </span>
                        </div>
                      </div>

                      <p className="text-zinc-300 text-sm leading-relaxed">{turn.content}</p>

                      {turn.keyMetricOrCitation ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] font-mono text-zinc-400">
                          <span className="text-indigo-400 font-bold">Citation:</span>
                          {turn.keyMetricOrCitation}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* View 2: Formal Consensus & Directives */}
              {activeTab === "consensus" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-[#161616] p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                      Governing Council Determination
                    </span>
                    <p className="mt-1 text-sm text-zinc-200 leading-relaxed font-medium">
                      {session.consensus.verdictSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Unanimous findings */}
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <CheckCircle2 className="size-4" />
                        Unanimous Agreements
                      </span>
                      <ul className="space-y-1.5 text-xs text-zinc-300">
                        {session.consensus.unanimousAgreements.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Dissenting viewpoints */}
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-4 space-y-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                        <AlertTriangle className="size-4" />
                        Active Dissenting Points
                      </span>
                      <ul className="space-y-2 text-xs text-zinc-300">
                        {session.consensus.activeDissents.map((item, i) => (
                          <li key={i} className="space-y-0.5">
                            <p className="font-semibold text-rose-300">{item.engineName} ({item.engineId}):</p>
                            <p className="text-zinc-400 text-[11px]">{item.concern}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Binding directives */}
                  <div className="rounded-2xl border border-white/10 bg-[#161616] p-4 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Binding Action Directives (Execution Roadmap)
                    </span>
                    <ol className="space-y-2 text-xs text-zinc-300">
                      {session.consensus.bindingDirectives.map((directive, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{directive}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 transition"
                >
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  {copied ? "Dossier Copied" : "Copy Dossier"}
                </button>

                <div className="flex items-center gap-2">
                  {onOpenInCanvas ? (
                    <button
                      type="button"
                      onClick={() => {
                        const md = formatCouncilDossierMarkdown(session);
                        onOpenInCanvas(md, `Council: ${session.title}`);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition"
                    >
                      <FileText className="size-3.5" />
                      Open in Canvas
                    </button>
                  ) : null}

                  {onInsertToChat ? (
                    <button
                      type="button"
                      onClick={() => {
                        const md = formatCouncilDossierMarkdown(session);
                        onInsertToChat(md);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition"
                    >
                      <ArrowRight className="size-3.5" />
                      Insert into Chat
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
