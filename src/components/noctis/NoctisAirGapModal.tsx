import { useState, useMemo } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  FileCode,
  FileText,
  Flame,
  Globe,
  HardDrive,
  Lock,
  MessageSquare,
  Radio,
  RefreshCw,
  Scale,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import {
  PREDEFINED_AIR_GAP_SCENARIOS,
  evaluateAirGapSentinel,
  formatAirGapDossierMarkdown,
  type AirGapScenario,
} from "@/lib/noctis-air-gap";

interface NoctisAirGapModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisAirGapModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisAirGapModalProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scenario-scif-defense");
  const [airGapActive, setAirGapActive] = useState<boolean>(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const scenarioKeys = useMemo(() => Object.keys(PREDEFINED_AIR_GAP_SCENARIOS), []);

  const evaluation = useMemo(() => {
    return evaluateAirGapSentinel(selectedScenarioId, airGapActive);
  }, [selectedScenarioId, airGapActive]);

  const dossierMarkdown = useMemo(() => {
    return formatAirGapDossierMarkdown(evaluation);
  }, [evaluation]);

  if (!open) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleOpenCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Air-Gap Audit: ${evaluation.scenario.name}`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600/20 via-zinc-900 to-cyan-500/20 border border-zinc-700">
              <WifiOff className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Sovereign Air-Gap Sentinel
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Zero-Packet Egress
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
                  WebGPU / WASM
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                100% offline browser memory runtime · Outbound WAN firewall sniffer · Classified DoD / SCIF non-egress
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAirGapActive(!airGapActive)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                airGapActive
                  ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60"
                  : "bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60"
              }`}
            >
              {airGapActive ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Air-Gap Mode: ACTIVE</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Air-Gap Mode: STANDBY</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scenario Selector Ribbon */}
        <div className="px-6 py-2.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 shrink-0 mr-1 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" /> Mission Mandate:
          </span>
          {scenarioKeys.map((key) => {
            const sc = PREDEFINED_AIR_GAP_SCENARIOS[key];
            const isSelected = selectedScenarioId === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedScenarioId(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <span>{sc.classificationLevel.split(" ")[0]}:</span>
                <span className={isSelected ? "text-emerald-400 font-semibold" : ""}>{sc.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                WAN Outbound Egress
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {evaluation.certificate.packetsTransmittedWan}
                </span>
                <span className="text-xs text-zinc-400">Packets (Zero-Leak)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 mt-2 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Strict Socket Severance
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Blocked Exfiltration
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-amber-300">
                  {evaluation.certificate.packetsOutboundBlocked}
                </span>
                <span className="text-xs text-zinc-400">Attempts Intercepted</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 mt-2">
                External LLM &amp; DNS Drops
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Local Compute Pipeline
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-base font-bold font-mono text-cyan-300 truncate">
                  WebGPU / WASM
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 mt-2">
                0 Remote Server Calls
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Cryptographic Seal</span>
                <button
                  onClick={() => copyToClipboard(evaluation.certificate.cryptographicSeal, "seal")}
                  className="text-zinc-400 hover:text-white"
                >
                  {copiedField === "seal" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
              <div className="mt-2">
                <span className="text-xs font-mono text-zinc-300 block truncate" title={evaluation.certificate.cryptographicSeal}>
                  {evaluation.certificate.cryptographicSeal.slice(0, 18)}...
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono mt-1">
                  RAM Allocated: {evaluation.certificate.memoryBufferAllocatedMb} MB
                </span>
              </div>
            </div>
          </div>

          {/* Scenario Overview */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-red-950/70 border border-red-800/60 text-red-300 font-bold">
                {evaluation.scenario.classificationLevel}
              </span>
              <h3 className="font-bold text-white text-sm">{evaluation.scenario.name}</h3>
            </div>
            <p className="text-zinc-300 leading-relaxed">{evaluation.scenario.mandate}</p>
          </div>

          {/* Local Deterministic Solvers Engaged */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-3">
            <span className="font-bold text-emerald-400 uppercase tracking-wider block">
              Active In-Memory WebGPU / WebAssembly Solvers
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {evaluation.scenario.localSolversEngaged.map((solver, i) => (
                <div key={i} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-semibold">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{solver}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono block">
                    Execution: Local Browser Memory (Zero WAN)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Egress Packet Sniffer Stream Table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden text-xs">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
              <span className="font-bold text-zinc-200 uppercase tracking-wider font-mono text-[11px] flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400" /> Live Egress Packet Sniffer Logs
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                Firewall Policy: DROP ALL OUTBOUND WAN
              </span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-zinc-950 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Target Destination</th>
                  <th className="px-4 py-2.5 text-center">Protocol</th>
                  <th className="px-4 py-2.5 text-center">Size</th>
                  <th className="px-4 py-2.5 text-right">Firewall Disposition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono text-[11px]">
                {evaluation.recentEgressLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-2.5 text-zinc-400">{log.timestamp.slice(11, 19)}</td>
                    <td className="px-4 py-2.5 text-zinc-200 truncate max-w-[280px]" title={log.destination}>
                      {log.destination}
                    </td>
                    <td className="px-4 py-2.5 text-center text-zinc-400">{log.protocol}</td>
                    <td className="px-4 py-2.5 text-center text-zinc-400">{log.payloadSize} B</td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          log.verdict === "BLOCKED_AIR_GAP"
                            ? "bg-red-950/70 border border-red-800 text-red-400"
                            : "bg-emerald-950/70 border border-emerald-800 text-emerald-400"
                        }`}
                      >
                        {log.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 text-xs">
          <div className="text-zinc-400 font-mono text-[11px] hidden sm:block">
            Sovereign Engine NOCTIS-AIRGAP-001 · Zero Outbound Telemetry Guarantee
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium shadow-md transition-all"
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
