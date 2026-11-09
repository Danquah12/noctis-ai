import React, { useState, useMemo } from "react";
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Square,
  Sparkles,
  FileSpreadsheet,
  FileCode,
  Printer,
  Send,
  Check,
  Copy,
  Activity,
  Heart,
  Stethoscope,
  Radio,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SPECIALIST_COUNCIL,
  runSpecialistSwarmDeliberation,
  type SwarmDeliberationResult,
} from "@/lib/noctis-specialist-swarm.ts";
import { FLAGSHIP_BENCHMARK_CASES, type BenchmarkFlagshipSummary } from "@/lib/noctis-health-500-chat.ts";
import type { ClinicalSpecialty } from "@/lib/noctis-health-500-schema.ts";
import {
  exportReferenceTableCsv,
  exportFhirR4DocumentBundle,
  downloadBlob,
  printDossier,
} from "@/lib/noctis-clinical-export.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisSpecialistSwarmSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisSpecialistSwarmSection({ onSendToChat }: NoctisSpecialistSwarmSectionProps) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<ClinicalSpecialty>("NEUROLOGY");
  const [injectFlawedOrder, setInjectFlawedOrder] = useState<boolean>(false);
  const [activeRound, setActiveRound] = useState<1 | 2 | 3>(3);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const activeCase: BenchmarkFlagshipSummary = useMemo(() => {
    return FLAGSHIP_BENCHMARK_CASES[selectedSpecialty] || FLAGSHIP_BENCHMARK_CASES.NEUROLOGY;
  }, [selectedSpecialty]);

  const deliberationResult: SwarmDeliberationResult = useMemo(() => {
    return runSpecialistSwarmDeliberation(activeCase, { injectFlawedOrder });
  }, [activeCase, injectFlawedOrder]);

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    void speakNoctisVoice(deliberationResult.consensusDossier, "maple", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    }).then((ok) => {
      if (!ok) setIsSpeaking(false);
    });
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(deliberationResult.consensusDossier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Multi-Specialist Council Consensus — ${activeCase.specialty}] Case ${activeCase.caseId}: ${activeCase.ageYears}yo ${activeCase.biologicalSex.toLowerCase()} with ${activeCase.chiefComplaint}. Swarm Agreement Index: ${deliberationResult.round3ConsensusPlan.agreementIndexPercent}%. Approved Order Set: ${deliberationResult.round3ConsensusPlan.prioritizedOrders.slice(0, 3).join(", ")}. Full Swarm Consensus: "${deliberationResult.consensusDossier.slice(0, 400)}..."`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <Users className="size-3 text-emerald-400" /> Specialist Swarm
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              Autonomous Consensus
            </span>
            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              Binding Safety Veto
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            Multi-Specialist Agent Swarm Council & Autonomous Consensus Protocol
          </h2>
          <p className="text-xs text-white/60">
            Four specialized clinical agents deliberate simultaneously, cross-examine candidate orders, enforce codified safety invariant vetoes, and synthesize a unified ratified CDS treatment plan.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm border",
              isSpeaking
                ? "bg-amber-500/30 text-amber-300 border-amber-500/50"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            )}
            title="Read consensus aloud with zero truncation"
          >
            {isSpeaking ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Reading
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-amber-400" /> Read Consensus
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 border border-white/10 transition"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Dossier"}
          </button>
        </div>
      </div>

      {/* Case Selector & Safety Stress-Test Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-white/60 flex items-center gap-1">
            <Stethoscope className="size-3.5 text-emerald-400" /> Active Case:
          </span>
          {(["NEUROLOGY", "ENDOCRINOLOGY", "CARDIOLOGY", "INFECTIOUS_DISEASES"] as ClinicalSpecialty[]).map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSelectedSpecialty(spec)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border",
                selectedSpecialty === spec
                  ? "bg-emerald-600/30 border-emerald-500/60 text-emerald-200"
                  : "bg-black/20 border-white/10 text-white/70 hover:bg-white/5"
              )}
            >
              {spec}
            </button>
          ))}
        </div>

        {/* Safety Stress-Test Injection Toggle */}
        <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={injectFlawedOrder}
            onChange={(e) => setInjectFlawedOrder(e.target.checked)}
            className="rounded border-white/20 bg-black/40 text-rose-500 focus:ring-0 focus:outline-none size-3.5"
          />
          <span className={cn("font-medium", injectFlawedOrder ? "text-rose-400 font-bold" : "text-white/60")}>
            Inject Flawed Order (Test Binding Safety Invariant Veto)
          </span>
        </label>
      </div>

      {/* Specialist Council Roster Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {SPECIALIST_COUNCIL.map((agent) => {
          const opinion = deliberationResult.round1Opinions.find((o) => o.agentId === agent.id);
          const isVetoAgent = agent.id === "pharmacologist" && deliberationResult.safetyVeto !== null;

          return (
            <div
              key={agent.id}
              className={cn(
                "rounded-xl border p-3 space-y-2 transition",
                isVetoAgent
                  ? "border-rose-500/60 bg-rose-950/25 ring-1 ring-rose-500/40"
                  : "border-white/10 bg-white/[0.02]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase", agent.avatarColor)}>
                  {agent.credentials}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {opinion?.confidenceScorePercent}% Conf
                </span>
              </div>
              <div>
                <div className="font-bold text-white text-xs">{agent.name}</div>
                <div className="text-[10px] text-white/50">{agent.title}</div>
              </div>
              <div className="text-[11px] text-zinc-300/80 line-clamp-2" title={agent.roleDescription}>
                {agent.roleDescription}
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Invariant Veto Alert (When Injected) */}
      {deliberationResult.safetyVeto && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wide">
              <ShieldAlert className="size-4 text-rose-400" />
              <span>Binding Safety Invariant Veto Issued by Clinical Pharmacologist</span>
            </div>
            <span className="rounded bg-rose-600/30 border border-rose-500/50 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-200">
              {deliberationResult.safetyVeto.invariantCode}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div className="rounded-lg bg-black/40 p-2.5 border border-rose-500/30">
              <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">Revoked Flawed Order</span>
              <div className="text-white/90 line-through decoration-rose-500 font-medium">
                "{deliberationResult.safetyVeto.prohibitedOrder}"
              </div>
              <div className="text-[11px] text-rose-200/80 mt-1">
                <span className="font-semibold text-rose-300">Clinical Harm:</span> {deliberationResult.safetyVeto.clinicalHarmRisk}
              </div>
            </div>
            <div className="rounded-lg bg-emerald-950/30 p-2.5 border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Mandatory Corrective Action</span>
              <div className="text-emerald-200 font-medium">
                {deliberationResult.safetyVeto.mandatoryCorrection}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deliberation Round Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveRound(1)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-semibold transition",
              activeRound === 1 ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            Round 1: Independent Appraisals
          </button>
          <button
            type="button"
            onClick={() => setActiveRound(2)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-semibold transition",
              activeRound === 2 ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            Round 2: Peer Review & Safety Audit
          </button>
          <button
            type="button"
            onClick={() => setActiveRound(3)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-semibold transition",
              activeRound === 3 ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            Round 3: Unified Consensus Plan
          </button>
        </div>

        <div className="text-xs text-white/60 font-mono">
          Agreement Index: <span className="font-bold text-emerald-400">{deliberationResult.round3ConsensusPlan.agreementIndexPercent}%</span>
        </div>
      </div>

      {/* Round 1: Independent Appraisals */}
      {activeRound === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {deliberationResult.round1Opinions.map((op) => (
            <div key={op.agentId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{op.agentName}</span>
                <span className="text-[10px] text-violet-400 font-mono">{op.confidenceScorePercent}% confidence</span>
              </div>
              <div className="rounded bg-black/30 p-2 text-violet-200 font-medium">
                <span className="text-white/40 font-normal">Impression:</span> {op.primaryImpression}
              </div>
              <div>
                <span className="text-[10px] text-white/50 uppercase font-bold block mb-1">Priority Orders</span>
                <ul className="space-y-1 pl-4 list-disc text-zinc-300">
                  {op.priorityOrders.map((ord, idx) => (
                    <li key={idx}>{ord}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Round 2: Peer Review & Audits */}
      {activeRound === 2 && (
        <div className="space-y-3 text-xs">
          {deliberationResult.round2PeerCritiques.map((crit, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {crit.endorsementStatus === "ENDORSED" ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : crit.endorsementStatus === "SAFETY_CHALLENGED" ? (
                  <ShieldAlert className="size-4 text-rose-400" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-400" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    {SPECIALIST_COUNCIL.find((s) => s.id === crit.reviewerId)?.name} ➔ {SPECIALIST_COUNCIL.find((s) => s.id === crit.targetAgentId)?.name}
                  </span>
                  <span className={cn(
                    "rounded px-2 py-0.5 text-[9px] font-bold uppercase",
                    crit.endorsementStatus === "ENDORSED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : crit.endorsementStatus === "SAFETY_CHALLENGED"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  )}>
                    {crit.endorsementStatus}
                  </span>
                </div>
                <p className="text-zinc-300 leading-relaxed">{crit.critique}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Round 3: Unified Consensus Plan */}
      {activeRound === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Set */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" /> Ratified Multidisciplinary Orders
            </h3>
            <div className="space-y-1.5">
              {deliberationResult.round3ConsensusPlan.prioritizedOrders.map((ord, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg bg-black/30 p-2.5 text-xs text-white/90 border border-white/5">
                  <span className="size-4 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{ord}</span>
                </div>
              ))}
            </div>

            {/* Specialist Sign-Offs */}
            <div className="pt-3 border-t border-white/10">
              <div className="text-[10px] text-white/40 uppercase font-semibold mb-2">Council Sign-Offs</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                {deliberationResult.round3ConsensusPlan.specialistSignoffs.map((sig, idx) => (
                  <div key={idx} className="rounded bg-white/[0.03] p-1.5 border border-white/5 text-white/80">
                    <Check className="size-3 text-emerald-400 mx-auto mb-0.5" />
                    <span className="font-semibold">{sig}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dossier Preview & Interoperability Bar */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Stethoscope className="size-3.5 text-amber-400" /> Consensus Dossier
            </h3>

            <div className="flex-1 min-h-[280px] max-h-[380px] overflow-y-auto rounded-lg bg-black/50 border border-white/5 p-3 text-[11px] font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {deliberationResult.consensusDossier}
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const csv = exportReferenceTableCsv(activeCase);
                    downloadBlob(`${activeCase.caseId}_Swarm_Reference_Table.csv`, csv, "text/csv;charset=utf-8;");
                  }}
                  className="rounded bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-300 border border-amber-500/30 transition"
                  title="Export CSV"
                >
                  <FileSpreadsheet className="size-3 inline mr-1" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fhir = exportFhirR4DocumentBundle(activeCase);
                    downloadBlob(`${activeCase.caseId}_Swarm_FHIR.json`, JSON.stringify(fhir, null, 2), "application/json");
                  }}
                  className="rounded bg-violet-500/10 hover:bg-violet-500/20 px-2 py-1 text-[10px] font-semibold text-violet-300 border border-violet-500/30 transition"
                  title="Export FHIR R4"
                >
                  <FileCode className="size-3 inline mr-1" /> FHIR
                </button>
                <button
                  type="button"
                  onClick={() => printDossier(activeCase)}
                  className="rounded bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30 transition"
                  title="Print / Save PDF"
                >
                  <Printer className="size-3 inline mr-1" /> PDF
                </button>
              </div>

              {onSendToChat && (
                <button
                  type="button"
                  onClick={handleSendChat}
                  className="inline-flex items-center gap-1 rounded bg-violet-600/30 hover:bg-violet-600/50 px-2 py-1 text-[10px] font-semibold text-violet-200 border border-violet-500/40 transition"
                >
                  <Send className="size-3" /> Chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
