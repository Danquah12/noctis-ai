import { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Lock,
  RotateCcw,
  Copy,
  Download,
  FileCode,
  MessageSquare,
  X,
  AlertTriangle,
  Zap,
  Sliders,
  Layers,
  Key,
  Flame,
} from "lucide-react";
import {
  CANONICAL_PQC_ASSETS,
  evaluatePqcMigration,
  formatPqcMigrationMarkdown,
  type PqcMigrationState,
} from "@/lib/noctis-pqc-shield";

interface NoctisPqcModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisPqcModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisPqcModalProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>("asset-tls-ingress");
  const [dataRetentionYears, setDataRetentionYears] = useState<number>(10);
  const [migrationDurationYears, setMigrationDurationYears] = useState<number>(3);
  const [projectedY2qArrivalYear, setProjectedY2qArrivalYear] = useState<number>(2032);
  const [copied, setCopied] = useState<boolean>(false);

  const assetKeys = useMemo(() => Object.keys(CANONICAL_PQC_ASSETS), []);

  const pqcState: PqcMigrationState = useMemo(() => {
    return evaluatePqcMigration({
      assetId: selectedAssetId,
      dataRetentionYears,
      migrationDurationYears,
      projectedY2qArrivalYear,
    });
  }, [
    selectedAssetId,
    dataRetentionYears,
    migrationDurationYears,
    projectedY2qArrivalYear,
  ]);

  const dossierMarkdown = useMemo(() => {
    return formatPqcMigrationMarkdown(pqcState);
  }, [pqcState]);

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(pqcState.hybridConfigurationSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `PQC Migration Audit: ${pqcState.targetAsset.name}`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  if (!open) return null;

  const currentAsset = pqcState.targetAsset;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-indigo-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-indigo-900/40 bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Key className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Post-Quantum Cryptographic Migration Sentinel
                </h2>
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-300 uppercase">
                  NIST FIPS 203 ML-KEM / FIPS 204 ML-DSA
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Harvest-Now-Decrypt-Later (HNDL) exposure modeling & hybrid quantum-resistant key encapsulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Real-time KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-indigo-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-indigo-900/30 bg-indigo-950/20 p-2.5">
            <Zap className="size-5 text-indigo-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Quantum Readiness</div>
              <div className="text-sm font-bold text-indigo-300">{pqcState.quantumReadinessScorePct}% Q-Score</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-indigo-900/30 bg-indigo-950/20 p-2.5">
            <Flame className="size-5 text-red-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">HNDL Exposure Gap</div>
              <div className={`text-sm font-bold ${
                pqcState.hndlActiveBreachRisk ? "text-red-400" : "text-emerald-400"
              }`}>
                {pqcState.exposureGapYears > 0 ? `+${pqcState.exposureGapYears} Years Exposed` : "0 (Buffered)"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-indigo-900/30 bg-indigo-950/20 p-2.5">
            <Lock className="size-5 text-cyan-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Classical Algorithm</div>
              <div className="text-sm font-bold text-cyan-300">{currentAsset.currentClassicalAlgorithm} (0 bits)</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-indigo-900/30 bg-indigo-950/20 p-2.5">
            <ShieldCheck className="size-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">NIST Target PQC</div>
              <div className="text-sm font-bold text-emerald-300">{currentAsset.recommendedPqcReplacement}</div>
            </div>
          </div>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 p-3 overflow-x-auto text-xs">
          <span className="text-zinc-400 font-semibold whitespace-nowrap text-[11px] uppercase mr-1">
            Protected Asset:
          </span>
          {assetKeys.map((key) => {
            const a = CANONICAL_PQC_ASSETS[key];
            const isSelected = key === selectedAssetId;
            return (
              <button
                key={key}
                onClick={() => setSelectedAssetId(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition ${
                  isSelected
                    ? "bg-indigo-500/20 border-indigo-500/60 text-indigo-200"
                    : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {a.targetTier}
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Sliders & Mosca Equation Viewport */}
          <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-4 overflow-y-auto">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Sliders className="size-4 text-indigo-400" />
                <span>Mosca's Theorem Quantum Threat Parameters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Data Retention:</span>
                    <span className="text-zinc-200 font-bold">{dataRetentionYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={dataRetentionYears}
                    onChange={(e) => setDataRetentionYears(Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Migration Time:</span>
                    <span className="text-zinc-200 font-bold">{migrationDurationYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={migrationDurationYears}
                    onChange={(e) => setMigrationDurationYears(Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Y2Q Arrival Year:</span>
                    <span className="text-zinc-200 font-bold">{projectedY2qArrivalYear}</span>
                  </div>
                  <input
                    type="range"
                    min="2028"
                    max="2040"
                    value={projectedY2qArrivalYear}
                    onChange={(e) => setProjectedY2qArrivalYear(Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 pt-1">
                Mosca&apos;s Theorem: If (Retention {dataRetentionYears}y + Migration {migrationDurationYears}y = {dataRetentionYears + migrationDurationYears}y) &gt; (Time to CRQC {projectedY2qArrivalYear - 2026}y), your data is already being harvested for future decryption.
              </p>
            </div>

            {/* Production Hybrid Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Production Hybrid Classical + PQC Configuration:
                </span>
                <button
                  onClick={handleCopyConfig}
                  className="flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-[11px] text-white font-medium transition"
                >
                  <Copy className="size-3" />
                  {copied ? "Copied!" : "Copy Configuration"}
                </button>
              </div>

              <div className="font-mono text-xs text-zinc-300 bg-black/60 rounded-xl p-4 border border-zinc-800 overflow-x-auto">
                <pre className="leading-relaxed">{pqcState.hybridConfigurationSnippet}</pre>
              </div>
            </div>
          </div>

          {/* Cryptographic Details Sidebar */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            <div className="rounded-xl border border-indigo-900/30 bg-zinc-900/50 p-3 space-y-2">
              <span className="text-xs font-semibold text-zinc-200">Quantum Vulnerability Diagnosis</span>
              <div className="text-[11px] text-zinc-400 space-y-1.5 font-mono">
                <div>Asset: <span className="text-zinc-200">{currentAsset.name}</span></div>
                <div>Algorithm: <span className="text-red-400">{currentAsset.currentClassicalAlgorithm}</span></div>
                <div>Quantum Vulnerability: <span className="text-red-400">{currentAsset.quantumVulnerabilityLevel}</span></div>
                <div>NIST Post-Quantum Replacement: <span className="text-emerald-400 font-bold">{currentAsset.recommendedPqcReplacement}</span></div>
              </div>
            </div>

            {/* Cryptographic Seal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">PQC Audit Seal</span>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {pqcState.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExportCanvas}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 text-xs transition shadow-lg shadow-indigo-600/20"
              >
                <FileCode className="size-3.5" />
                Export to Canvas
              </button>
              <button
                onClick={handleInsertChat}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2.5 text-xs transition border border-zinc-700"
              >
                <MessageSquare className="size-3.5" />
                Insert into Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
