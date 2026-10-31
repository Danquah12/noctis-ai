import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  FileCode,
  FileText,
  Flame,
  Layers,
  Lock,
  MessageSquare,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  PREDEFINED_SWARM_MISSIONS,
  runWorkSwarmMission,
  formatSwarmMissionMarkdown,
  exportSwarmMissionJson,
  type SwarmMissionResult,
  type SwarmRole,
} from "@/lib/noctis-work-swarm";

interface NoctisSwarmModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisSwarmModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisSwarmModalProps) {
  const [selectedMissionId, setSelectedMissionId] = useState<string>("mission-enterprise-solvency");
  const [activeStageTab, setActiveStageTab] = useState<"overview" | "harvester" | "quant" | "challenger" | "publisher">("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const missionKeys = useMemo(() => Object.keys(PREDEFINED_SWARM_MISSIONS), []);

  const result: SwarmMissionResult = useMemo(() => {
    return runWorkSwarmMission(selectedMissionId);
  }, [selectedMissionId]);

  const dossierMarkdown = useMemo(() => {
    return formatSwarmMissionMarkdown(result);
  }, [result]);

  if (!open) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleDownloadJson = () => {
    const jsonStr = exportSwarmMissionJson(result);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.executionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Work Swarm: ${result.mission.name}`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  const getStageHeader = (role: SwarmRole) => {
    switch (role) {
      case "HARVESTER":
        return {
          title: "Stage 1: Harvester",
          agent: "HARVEST-01",
          color: "text-cyan-400",
          border: "border-cyan-500/40",
          bg: "bg-cyan-500/10",
        };
      case "QUANT_SOLVER":
        return {
          title: "Stage 2: Quant Solver",
          agent: "QUANT-02",
          color: "text-emerald-400",
          border: "border-emerald-500/40",
          bg: "bg-emerald-500/10",
        };
      case "CHALLENGER":
        return {
          title: "Stage 3: Challenger",
          agent: "CHALLENGE-03",
          color: "text-amber-400",
          border: "border-amber-500/40",
          bg: "bg-amber-500/10",
        };
      case "PUBLISHER":
        return {
          title: "Stage 4: Publisher",
          agent: "PUBLISH-04",
          color: "text-violet-400",
          border: "border-violet-500/40",
          bg: "bg-violet-500/10",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600/20 via-zinc-900 to-cyan-500/20 border border-zinc-700">
              <Boxes className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Noctis Autonomous Work Swarm
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 font-semibold">
                  Concurrent 4-Agent Pipeline
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Zero-OpenAI Boundary
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Harvester (HARVEST-01) → Quant Solver (QUANT-02) → Challenger (CHALLENGE-03) → Executive Publisher (PUBLISH-04)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 transition-colors"
              title="Download Verifiable Swarm Mission JSON"
            >
              <Download className="w-3.5 h-3.5 text-violet-400" />
              <span>Download Mission JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mission Selector Bar */}
        <div className="px-6 py-2.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 shrink-0 mr-1 flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5 text-violet-400" /> Active Mission:
          </span>
          {missionKeys.map((key) => {
            const m = PREDEFINED_SWARM_MISSIONS[key];
            const isSelected = selectedMissionId === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMissionId(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <span>{m.domain}:</span>
                <span className={isSelected ? "text-violet-400 font-semibold" : ""}>{m.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Mission Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {result.mission.domain}
                </span>
                <h3 className="text-sm font-bold text-white">{result.mission.name}</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{result.mission.objective}</p>
            </div>
            <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-zinc-800 md:pl-4">
              <span className="text-[11px] text-zinc-400 font-mono">Executive Swarm Verdict</span>
              <span className="text-xs font-bold text-emerald-400 mt-0.5">
                {result.mission.publisherArtifact.executiveVerdict}
              </span>
              <span className="text-[11px] text-zinc-400 mt-1">
                Epistemic Rigor: <strong className="text-zinc-200">{result.mission.publisherArtifact.epistemicRigorScore}%</strong>
              </span>
            </div>
            <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-zinc-800 md:pl-4">
              <span className="text-[11px] text-zinc-400 font-mono">Swarm Execution Hash</span>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span className="text-xs font-mono text-violet-300 truncate" title={result.overallSwarmHash}>
                  {result.overallSwarmHash.slice(0, 16)}...
                </span>
                <button
                  onClick={() => copyToClipboard(result.overallSwarmHash, "swarmHash")}
                  className="text-zinc-400 hover:text-white shrink-0"
                >
                  {copiedField === "swarmHash" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono mt-1">
                Total Latency: {result.totalDurationMs} ms
              </span>
            </div>
          </div>

          {/* 4-Stage Stepper Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {result.pipelineStages.map((stage, idx) => {
              const info = getStageHeader(stage.role);
              return (
                <div
                  key={stage.role}
                  className={`p-3.5 rounded-xl border ${info.border} ${info.bg} flex flex-col justify-between space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold uppercase ${info.color}`}>
                      Step {idx + 1}: {stage.agentId}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-semibold">
                      {stage.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{stage.name}</h4>
                    <p className="text-[11px] text-zinc-300 line-clamp-2 mt-0.5 leading-snug">
                      {stage.outputSummary}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400">
                    <span>Latency: {stage.executionDurationMs}ms</span>
                    <span className="truncate max-w-[80px]" title={stage.stageHash}>
                      {stage.stageHash.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stage Inspector Tabs */}
          <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto">
            <span className="text-xs font-mono text-zinc-400 mr-2 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> Inspect Artifact:
            </span>
            <button
              onClick={() => setActiveStageTab("overview")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeStageTab === "overview"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mission Dossier
            </button>
            <button
              onClick={() => setActiveStageTab("harvester")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeStageTab === "harvester"
                  ? "bg-cyan-950/60 text-cyan-300 border border-cyan-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Stage 1: Harvester
            </button>
            <button
              onClick={() => setActiveStageTab("quant")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeStageTab === "quant"
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Stage 2: Quant Solver
            </button>
            <button
              onClick={() => setActiveStageTab("challenger")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeStageTab === "challenger"
                  ? "bg-amber-950/60 text-amber-300 border border-amber-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Stage 3: Challenger
            </button>
            <button
              onClick={() => setActiveStageTab("publisher")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeStageTab === "publisher"
                  ? "bg-violet-950/60 text-violet-300 border border-violet-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Stage 4: Publisher
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="space-y-4">
            {activeStageTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Solved Invariants Card */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                    <Cpu className="w-4 h-4" /> Quant Solved Invariants
                  </div>
                  <div className="space-y-2">
                    {result.mission.quantArtifact.solvedInvariants.map((inv) => (
                      <div key={inv.name} className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-200">{inv.name}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {inv.value} {inv.unit}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500 block mt-1">
                          {inv.deterministicProof}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategic Directives Card */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-violet-400 font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" /> Executive Strategic Directives
                  </div>
                  <ol className="space-y-2">
                    {result.mission.publisherArtifact.strategicDirectives.map((dir, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded bg-zinc-950 border border-zinc-800">
                        <span className="w-5 h-5 rounded bg-violet-950 border border-violet-800 text-violet-400 flex items-center justify-center font-mono text-[10px] shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-zinc-300 leading-snug">{dir}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {activeStageTab === "harvester" && (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-cyan-400 uppercase tracking-wider">
                    Stage 1: Harvester Extracted Sources &amp; Entities
                  </span>
                  <span className="font-mono text-zinc-400">
                    Telemetry Integrity: <strong>{result.mission.harvesterArtifact.telemetryIntegrityScore}%</strong>
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-300 block mb-1.5">Primary Authoritative Sources:</span>
                  <ul className="space-y-1">
                    {result.mission.harvesterArtifact.sourcesIngested.map((src, i) => (
                      <li key={i} className="p-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                        {src}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-semibold text-zinc-300 block mb-1.5">Extracted Entity Key-Value Ledger:</span>
                  <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                    {JSON.stringify(result.mission.harvesterArtifact.extractedEntities, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {activeStageTab === "quant" && (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider">
                    Stage 2: Deterministic Quant Solver
                  </span>
                  <span className="font-mono text-zinc-400">
                    Confidence: <strong>{result.mission.quantArtifact.computationalConfidence}%</strong> ({result.mission.quantArtifact.equationsEvaluated} Invariants)
                  </span>
                </div>
                <div className="space-y-3">
                  {result.mission.quantArtifact.solvedInvariants.map((inv) => (
                    <div key={inv.name} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{inv.name}</span>
                        <span className="font-mono text-emerald-400 font-bold text-sm">
                          {inv.value} {inv.unit}
                        </span>
                      </div>
                      <code className="block p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                        {inv.formulaLatex}
                      </code>
                      <span className="text-[11px] text-zinc-400 block">
                        Proof: <strong className="text-zinc-200">{inv.deterministicProof}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStageTab === "challenger" && (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wider">
                    Stage 3: Adversarial Stress Challenger
                  </span>
                  <span className="font-mono text-zinc-400">
                    Counter-Factual Score: <strong>{result.mission.challengerArtifact.counterFactualScore}%</strong>
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-300 block mb-1.5">Identified Tail Risks:</span>
                  <ul className="space-y-1.5">
                    {result.mission.challengerArtifact.tailRisksIdentified.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded bg-zinc-950 border border-zinc-800 text-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-semibold text-zinc-300 block mb-1.5">Stress Shock Simulations:</span>
                  <div className="space-y-2">
                    {result.mission.challengerArtifact.stressShocksEvaluated.map((s, i) => (
                      <div key={i} className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white block">{s.shockName}</span>
                          <span className="text-zinc-400 text-[11px]">{s.impactDescription}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ml-2 ${
                          s.severityRating === "CRITICAL"
                            ? "bg-red-950/70 border border-red-800 text-red-400"
                            : "bg-amber-950/70 border border-amber-800 text-amber-400"
                        }`}>
                          {s.severityRating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeStageTab === "publisher" && (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-violet-400 uppercase tracking-wider">
                    Stage 4: Executive Board Publisher
                  </span>
                  <span className="font-mono text-zinc-400">
                    Epistemic Rigor: <strong>{result.mission.publisherArtifact.epistemicRigorScore}%</strong>
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 font-mono text-[10px] block">EXECUTIVE VERDICT</span>
                  <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                    {result.mission.publisherArtifact.executiveVerdict}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-300 block mb-1.5">Consolidated Strategic Directives:</span>
                  <ol className="space-y-2">
                    {result.mission.publisherArtifact.strategicDirectives.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-200">
                        <span className="w-5 h-5 rounded bg-violet-950 border border-violet-800 text-violet-400 flex items-center justify-center font-mono text-[10px] shrink-0">
                          {i + 1}
                        </span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 text-xs">
          <div className="text-zinc-400 font-mono text-[11px] hidden sm:block">
            Sovereign Engine NOCTIS-SWARM-001 · Multi-Agent Parallel Pipeline
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => copyToClipboard(dossierMarkdown, "dossier")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors font-medium"
            >
              {copiedField === "dossier" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedField === "dossier" ? "Copied" : "Copy Dossier"}</span>
            </button>

            {onOpenInCanvas && (
              <button
                onClick={handleOpenCanvas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open in Canvas</span>
              </button>
            )}

            {onInsertToChat && (
              <button
                onClick={handleInsertChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-medium shadow-md transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send to Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
