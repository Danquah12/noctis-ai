import React, { useState } from "react";
import {
  Network,
  Shield,
  ShieldAlert,
  Server,
  Database,
  Radio,
  RefreshCw,
  Volume2,
  Square,
  Send,
  CheckCircle2,
  Lock,
  Cpu,
  Zap,
  Globe,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type HospitalEnclaveNode,
  type ClinicalDeltaOperation,
  INITIAL_FEDERATION_NODES,
  INITIAL_MOCK_DELTAS,
  createClinicalDelta,
  formatMeshTopologySpokenSummary,
} from "@/lib/noctis-hospital-mesh";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

interface NoctisHospitalMeshSectionProps {
  onSendToChat?: (text: string) => void;
  activeCaseId?: string;
}

export function NoctisHospitalMeshSection({
  onSendToChat,
  activeCaseId = "NH-EM-003",
}: NoctisHospitalMeshSectionProps) {
  const [nodes, setNodes] = useState<HospitalEnclaveNode[]>(INITIAL_FEDERATION_NODES);
  const [deltas, setDeltas] = useState<ClinicalDeltaOperation[]>(INITIAL_MOCK_DELTAS);
  const [isAirGapped, setIsAirGapped] = useState(false);
  const [isReadingVoice, setIsReadingVoice] = useState(false);
  const [replicateStatus, setReplicateStatus] = useState<string | null>(null);

  // Toggle Air-Gap Isolation Mode
  const handleToggleAirGap = () => {
    const nextState = !isAirGapped;
    setIsAirGapped(nextState);

    setNodes((prev) =>
      prev.map((n) => {
        if (n.nodeId === "NODE-LOCAL-00") return n;
        return {
          ...n,
          status: nextState ? "AIR_GAPPED_OFFLINE" : "ONLINE_SYNCED",
        };
      })
    );
  };

  // Broadcast Active Case to Mesh
  const handleBroadcastCase = () => {
    if (isAirGapped) {
      setReplicateStatus("Cannot replicate: Air-Gap Isolation Mode is actively blocking external packets!");
      setTimeout(() => setReplicateStatus(null), 3500);
      return;
    }

    const newDelta = createClinicalDelta(
      "NODE-LOCAL-00",
      activeCaseId,
      "CASE_PUBLISH",
      {
        replicatedToPeers: nodes.filter((n) => n.nodeId !== "NODE-LOCAL-00").map((n) => n.nodeId),
        timestamp: Date.now(),
        verifiedInvariants: ["CF-DKA-001", "CF-STR-001"],
      },
      deltas[deltas.length - 1]?.lamportClock || 106
    );

    setDeltas((prev) => [newDelta, ...prev]);
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        lastSyncTimestamp: Date.now(),
        casesSyncedCount: n.casesSyncedCount + 1,
      }))
    );

    setReplicateStatus(`Case ${activeCaseId} broadcasted to 4 remote hospital enclaves via WebRTC!`);
    setTimeout(() => setReplicateStatus(null), 3500);
  };

  // Zero-Truncation Voice Readout
  const handleToggleReadVoice = async () => {
    if (isReadingVoice) {
      stopCurrentVoicePlayback();
      setIsReadingVoice(false);
      return;
    }

    setIsReadingVoice(true);
    const spoken = formatMeshTopologySpokenSummary(nodes, isAirGapped, deltas.length);
    const ok = await speakNoctisVoice(spoken, "alloy", {
      onStart: () => setIsReadingVoice(true),
      onEnd: () => setIsReadingVoice(false),
    });
    if (!ok) {
      setIsReadingVoice(false);
    }
  };

  // Send to Chat
  const handleSendToChat = () => {
    if (onSendToChat) {
      const summary = `[MULTI-HOSPITAL SOVEREIGN MESH STATUS]
Air-Gap Mode: ${isAirGapped ? "ACTIVE (ISOLATED)" : "ONLINE (PEER-TO-PEER SYNCED)"}
Local Node: Bedside ICU Edge Sovereign Node (PGLite WASM Postgres)
Connected Enclaves: ${
        isAirGapped
          ? "None (Air-Gapped)"
          : nodes.filter((n) => n.nodeId !== "NODE-LOCAL-00").map((n) => `${n.institutionName} (${n.latencyMs}ms)`).join(", ")
      }
Total Synced Cases: 500 benchmark cases across ${nodes.length} sovereign enclaves
Recent Replications: ${deltas.map((d) => `[${d.opId}] ${d.operationType} on ${d.caseId} (Clock: ${d.lamportClock})`).join("; ")}`;
      onSendToChat(summary);
    }
  };

  return (
    <div className="rounded-xl border border-teal-500/30 bg-[#061010] p-4 text-xs space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-teal-500/20 p-2 border border-teal-500/40 text-teal-300">
            <Network className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white/95">
                Multi-Hospital Sovereign Federation & Air-Gapped Mesh Sync
              </h3>
              <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-300 border border-teal-500/30">
                PGLite-CRDT-010
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Air-gapped peer-to-peer data replication across sovereign hospital enclaves with Lamport CRDT clocks.
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleAirGap}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-bold transition border shadow-sm",
              isAirGapped
                ? "bg-amber-500/30 text-amber-200 border-amber-500/50 ring-1 ring-amber-500/50 animate-pulse"
                : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30"
            )}
            title="Toggle air-gapped isolation mode (severs external network links)"
          >
            <Shield className="size-3.5" />
            {isAirGapped ? "Air-Gap Active (Isolated)" : "Enable Air-Gap Mode"}
          </button>
          <button
            type="button"
            onClick={handleToggleReadVoice}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition border shadow-sm",
              isReadingVoice
                ? "bg-amber-500/25 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/50"
                : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
            )}
            title="Read mesh topology and sync status aloud"
          >
            {isReadingVoice ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Audio
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-amber-300" /> Read Mesh Status
              </>
            )}
          </button>
        </div>
      </div>

      {/* Air-Gap Warning Banner */}
      {isAirGapped && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-amber-200">
            <ShieldAlert className="size-4 shrink-0 text-amber-400" />
            <div>
              <span className="font-bold">Tactical Air-Gap Isolation Active:</span> External WebRTC data channels are severed. Operating 100% on local in-browser PGLite WASM Postgres. Zero PHI egress.
            </div>
          </div>
          <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-amber-500/30">
            OFFLINE SOVEREIGN
          </span>
        </div>
      )}

      {/* Hospital Enclaves Topology Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-white/40 tracking-wider">
          <span>Connected Federation Hospital Enclaves ({nodes.length} Nodes)</span>
          <span className="font-mono text-teal-400">P2P WebRTC Mesh Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {nodes.map((n) => {
            const isLocal = n.nodeId === "NODE-LOCAL-00";
            return (
              <div
                key={n.nodeId}
                className={cn(
                  "rounded-xl border p-3 flex flex-col justify-between space-y-2 transition-all shadow-sm",
                  isLocal
                    ? "bg-teal-950/20 border-teal-500/50 ring-1 ring-teal-500/30"
                    : n.status === "ONLINE_SYNCED"
                    ? "bg-black/40 border-white/10 hover:border-white/20"
                    : "bg-black/20 border-white/5 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-white/95 text-xs">{n.institutionName}</h4>
                      {isLocal && (
                        <span className="rounded bg-teal-500/30 px-1.5 py-0.2 font-mono text-[9px] font-bold text-teal-300">
                          LOCAL
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/50">{n.region}</div>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wide border shrink-0",
                      n.status === "ONLINE_SYNCED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    )}
                  >
                    {n.status === "ONLINE_SYNCED" ? "ONLINE" : "AIR-GAPPED"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/5 text-[10px] font-mono">
                  <div>
                    <span className="text-white/40 block">Latency</span>
                    <span className={cn(isLocal ? "text-teal-300 font-bold" : "text-white/90")}>
                      {isAirGapped && !isLocal ? "OFFLINE" : `${n.latencyMs} ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Synced</span>
                    <span className="text-white/90">{n.casesSyncedCount} cases</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Storage</span>
                    <span className="text-teal-300">{isLocal ? "PGLite WASM" : "On-Prem"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CRDT Merkle Delta Log & Replication Controls */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            Conflict-Free Replicated Data Log (Lamport Logical Clocks)
          </div>

          <div className="flex items-center gap-2">
            {replicateStatus && (
              <span className="inline-flex items-center gap-1 text-[11px] text-teal-400 font-medium">
                <CheckCircle2 className="size-3.5" /> {replicateStatus}
              </span>
            )}
            <button
              type="button"
              onClick={handleBroadcastCase}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal-600/20 hover:bg-teal-600/30 px-2.5 py-1 text-[11px] font-semibold text-teal-300 border border-teal-500/30 transition shadow-sm"
              title="Broadcast the current active clinical consultation to all connected hospital enclaves"
            >
              <Zap className="size-3.5" /> Broadcast Case {activeCaseId} to Mesh
            </button>
            <button
              type="button"
              onClick={handleSendToChat}
              className="inline-flex items-center gap-1.5 rounded-md bg-violet-600/20 hover:bg-violet-600/30 px-2.5 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30 transition shadow-sm"
              title="Send mesh federation status to assistant chat"
            >
              <Send className="size-3.5" /> Send to Chat
            </button>
          </div>
        </div>

        {/* Delta Log Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#04080c]">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] text-teal-300/80 font-mono">
                <th className="py-2 px-3">Op ID</th>
                <th className="py-2 px-3">Clock</th>
                <th className="py-2 px-3">Source Node</th>
                <th className="py-2 px-3">Operation</th>
                <th className="py-2 px-3">Case ID</th>
                <th className="py-2 px-3">Cryptographic Seal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {deltas.map((d) => (
                <tr key={d.opId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-white/90">{d.opId}</td>
                  <td className="py-2 px-3 text-teal-400 font-bold">L-{d.lamportClock}</td>
                  <td className="py-2 px-3 text-white/60">{d.sourceNodeId}</td>
                  <td className="py-2 px-3">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold",
                        d.operationType === "INVARIANT_VETO_ASSERTED"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : d.operationType === "CONSENSUS_RATIFIED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      )}
                    >
                      {d.operationType}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-amber-200">{d.caseId}</td>
                  <td className="py-2 px-3 text-white/40 text-[10px]">{d.signature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
