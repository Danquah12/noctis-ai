import React, { useState } from "react";
import { Users, Shield, Cpu, Scale, CheckCircle2, AlertCircle, Copy, Check, Sparkles, RefreshCw } from "lucide-react";
import { executeMeshSwarm, type SwarmConsensusRound, type SwarmAgentVote } from "@/lib/noctis-mesh-swarm";

export interface NoctisSwarmViewProps {
  content: string;
  title?: string;
  className?: string;
}

export default function NoctisSwarmView({
  content,
  title = "Sovereign Proposal",
  className = ""
}: NoctisSwarmViewProps) {
  const [copiedSeal, setCopiedSeal] = useState(false);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState<number>(0);

  const swarmRound: SwarmConsensusRound = React.useMemo(
    () => executeMeshSwarm(content, title),
    [content, title]
  );

  const selectedAgent: SwarmAgentVote = swarmRound.votes[selectedAgentIndex] || swarmRound.votes[0];

  const handleCopySeal = async () => {
    await navigator.clipboard.writeText(swarmRound.consensusSeal);
    setCopiedSeal(true);
    setTimeout(() => setCopiedSeal(false), 2000);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ARCHITECT":
        return <Cpu className="w-5 h-5 text-cyan-400" />;
      case "ADVERSARY":
        return <Shield className="w-5 h-5 text-rose-400" />;
      case "AUDITOR":
        return <Scale className="w-5 h-5 text-amber-400" />;
      case "RECONCILER":
        return <Sparkles className="w-5 h-5 text-[#e4b86a]" />;
      default:
        return <Users className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ARCHITECT":
        return "border-cyan-500/40 bg-cyan-950/20 text-cyan-300";
      case "ADVERSARY":
        return "border-rose-500/40 bg-rose-950/20 text-rose-300";
      case "AUDITOR":
        return "border-amber-500/40 bg-amber-950/20 text-amber-300";
      case "RECONCILER":
        return "border-[#e4b86a]/40 bg-[#e4b86a]/10 text-[#e4b86a]";
      default:
        return "border-zinc-700 bg-zinc-900 text-zinc-300";
    }
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto space-y-6 text-zinc-200 font-sans ${className}`}>
      {/* Council Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-[#0e121a] border border-[#e4b86a]/30 rounded-xl shadow-lg relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#e4b86a]" />
            <h2 className="text-base font-bold text-zinc-100 tracking-wider font-mono">
              NOCTIS MESH SWARM COUNCIL
            </h2>
            <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-mono font-semibold">
              {swarmRound.consensusStatus.replace(/_/g, " ")} ({swarmRound.consensusScore}%)
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-400">
            Round: <span className="text-[#e4b86a]">{swarmRound.roundId}</span> · Target: {title}
          </p>
        </div>

        <button
          onClick={handleCopySeal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e4b86a]/15 hover:bg-[#e4b86a]/25 text-[#e4b86a] border border-[#e4b86a]/40 rounded-lg text-xs font-mono font-medium transition-colors"
        >
          {copiedSeal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedSeal ? "Copied Seal" : "Copy Seal"}</span>
        </button>
      </div>

      {/* 4-Node Council Graph */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {swarmRound.votes.map((vote, idx) => {
          const isSelected = selectedAgentIndex === idx;
          return (
            <div
              key={vote.agentId}
              onClick={() => setSelectedAgentIndex(idx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? `${getRoleColor(vote.role)} ring-1 ring-white/20 shadow-md`
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  {getRoleIcon(vote.role)}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 border border-white/5 text-emerald-400 font-semibold">
                  {vote.stance}
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-zinc-100 mb-0.5">{vote.name}</h3>
              <p className="font-mono text-[10px] text-zinc-400">{vote.agentId} · {vote.latencyMs}ms</p>
            </div>
          );
        })}
      </div>

      {/* Selected Agent Deep-Dive Panel */}
      <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            {getRoleIcon(selectedAgent.role)}
            <span className="font-bold text-zinc-100 text-sm">{selectedAgent.name} Argument</span>
          </div>
          <span className="text-zinc-400 text-[11px]">Latency: {selectedAgent.latencyMs}ms</span>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-lg">
            <span className="text-zinc-400 text-[11px] block mb-1">Deliberation Rationale:</span>
            <p className="text-zinc-200 leading-relaxed">{selectedAgent.keyArgument}</p>
          </div>

          {selectedAgent.dissentVectors.length > 0 && (
            <div className="p-3 bg-rose-950/20 border border-rose-500/25 rounded-lg space-y-1">
              <span className="text-rose-400 text-[11px] font-semibold block">Dissent & Attack Vectors Probed:</span>
              {selectedAgent.dissentVectors.map((v, i) => (
                <p key={i} className="text-rose-200 text-[11px]">
                  • {v}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compensatory Mitigations & Reconciled Verdict */}
      <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3 font-mono text-xs">
        <h4 className="font-bold text-zinc-200 text-xs tracking-wider">
          RECONCILED CONSENSUS DIRECTIVES
        </h4>
        <div className="space-y-1.5">
          {swarmRound.mitigationsApplied.map((mit, i) => (
            <div key={i} className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{mit}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 break-all">
          <span className="text-[#e4b86a] font-semibold">Consensus Attestation Seal: </span>
          {swarmRound.consensusSeal}
        </div>
      </div>
    </div>
  );
}
