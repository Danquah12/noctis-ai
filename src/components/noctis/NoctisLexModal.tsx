import { useState, useMemo } from "react";
import {
  Globe,
  Scale,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Copy,
  FileCode,
  MessageSquare,
  X,
  Lock,
  Layers,
  FileText,
  AlertOctagon,
} from "lucide-react";
import {
  CANONICAL_LEGAL_COLLISIONS,
  synthesizeRegulatoryHarmonization,
  formatLexSynthesisMarkdown,
  type LexSynthesisState,
} from "@/lib/noctis-lex-synthesizer";

interface NoctisLexModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisLexModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisLexModalProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("collision-cloud-gdpr");
  const [copied, setCopied] = useState<string | null>(null);

  const scenarioKeys = useMemo(() => Object.keys(CANONICAL_LEGAL_COLLISIONS), []);

  const lexState: LexSynthesisState = useMemo(() => {
    return synthesizeRegulatoryHarmonization(selectedScenarioId);
  }, [selectedScenarioId]);

  const dossierMarkdown = useMemo(() => {
    return formatLexSynthesisMarkdown(lexState);
  }, [lexState]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Regulatory Harmonization: ${lexState.scenario.name}`);
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

  const currentScenario = lexState.scenario;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-rose-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-rose-900/40 bg-gradient-to-r from-rose-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Globe className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Cross-Border Conflict-of-Laws Regulatory Synthesizer
                </h2>
                <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-rose-300 uppercase">
                  Comity Harmonization Matrix
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Multi-jurisdictional legal collision solver reconciling US, EU, UK, and APAC regulatory mandates
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-rose-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-rose-900/30 bg-rose-950/20 p-2.5">
            <ShieldCheck className="size-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Compliance Confidence</div>
              <div className="text-sm font-bold text-emerald-300">{lexState.complianceConfidenceScorePct}% Harmonized</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-rose-900/30 bg-rose-950/20 p-2.5">
            <AlertOctagon className="size-5 text-red-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Max Exposure (EU)</div>
              <div className="text-sm font-bold text-red-300">€{currentScenario.projectedExposureEur.toLocaleString()} EUR</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-rose-900/30 bg-rose-950/20 p-2.5">
            <DollarSign className="size-5 text-amber-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Max Exposure (US)</div>
              <div className="text-sm font-bold text-amber-300">${currentScenario.projectedExposureUsd.toLocaleString()} USD</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-rose-900/30 bg-rose-950/20 p-2.5">
            <Scale className="size-5 text-rose-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Arbitration Standing</div>
              <div className="text-sm font-bold text-rose-300">Safe-Harbor Comity</div>
            </div>
          </div>
        </div>

        {/* Scenario Selector Ribbon */}
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 p-3 overflow-x-auto text-xs">
          <span className="text-zinc-400 font-semibold whitespace-nowrap text-[11px] uppercase mr-1">
            Legal Collision:
          </span>
          {scenarioKeys.map((key) => {
            const sc = CANONICAL_LEGAL_COLLISIONS[key];
            const isSelected = key === selectedScenarioId;
            return (
              <button
                key={key}
                onClick={() => setSelectedScenarioId(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition ${
                  isSelected
                    ? "bg-rose-500/20 border-rose-500/60 text-rose-200"
                    : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {sc.name.split(" vs.")[0]}
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Statutory Collision & Contradiction Viewport */}
          <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-4 overflow-y-auto">
            {/* Dual Jurisdiction Collision Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300">{currentScenario.primaryStatute.code}</span>
                  <span className="text-[10px] font-semibold text-zinc-400 bg-black/40 px-2 py-0.5 rounded">
                    {currentScenario.primaryStatute.jurisdiction}
                  </span>
                </div>
                <div className="text-xs text-zinc-200 font-semibold">{currentScenario.primaryStatute.name}</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                  {currentScenario.primaryStatute.mandateDescription}
                </p>
                <div className="text-[10px] text-red-400 font-mono pt-1">
                  Penalty: {currentScenario.primaryStatute.maxStatutoryPenalty}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300">{currentScenario.conflictingStatute.code}</span>
                  <span className="text-[10px] font-semibold text-zinc-400 bg-black/40 px-2 py-0.5 rounded">
                    {currentScenario.conflictingStatute.jurisdiction}
                  </span>
                </div>
                <div className="text-xs text-zinc-200 font-semibold">{currentScenario.conflictingStatute.name}</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                  {currentScenario.conflictingStatute.mandateDescription}
                </p>
                <div className="text-[10px] text-red-400 font-mono pt-1">
                  Penalty: {currentScenario.conflictingStatute.maxStatutoryPenalty}
                </div>
              </div>
            </div>

            {/* Core Legal Contradiction */}
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                <AlertTriangle className="size-4 text-red-400" />
                <span>Statutory Contradiction Analysis:</span>
              </div>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                {currentScenario.coreContradiction}
              </p>
            </div>
          </div>

          {/* Harmonized Safe-Harbor Strategy Sidebar */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>Harmonized Safe-Harbor Strategy:</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-mono">
                {currentScenario.harmonizedSafeHarborStrategy}
              </p>
            </div>

            {/* Cryptographic Seal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Arbitration Seal</span>
                <button
                  onClick={() => handleCopy(lexState.cryptographicSeal, "seal")}
                  className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                >
                  {copied === "seal" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {lexState.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleCopy(lexState.recommendedLegalAction, "action")}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 text-xs transition border border-zinc-700"
              >
                <Copy className="size-3.5" />
                {copied === "action" ? "Copied Directive!" : "Copy Legal Directive"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCanvas}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium py-2.5 text-xs transition shadow-lg shadow-rose-600/20"
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
    </div>
  );
}
