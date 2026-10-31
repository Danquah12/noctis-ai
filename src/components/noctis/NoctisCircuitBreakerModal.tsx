import { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  FileCode,
  MessageSquare,
  X,
  Scale,
  Activity,
  Lock,
  Flame,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  evaluateCircuitBreaker,
  formatCircuitBreakerMarkdown,
  type CircuitBreakerState,
} from "@/lib/noctis-circuit-breaker";

interface NoctisCircuitBreakerModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

const SAMPLE_BENCHMARKS = [
  {
    label: "Financial Balance Sheet Imbalance",
    text: "Quarterly earnings report confirms total assets of $850M, total liabilities of $650M, and stockholders' equity of $350M. Working capital burn is 12 months.",
  },
  {
    label: "Critical Hyperkalemia with Discharge",
    text: "Patient lab results demonstrate serum potassium K+ is 6.4 mmol/L with mild fatigue. Patient is stable for safe discharge home with routine 4-week follow-up.",
  },
  {
    label: "Impossible CVSS Metric Score",
    text: "Zero-day vulnerability CVE-2026-99999 discovered in edge proxy. CVSS v3.1 base score calculated as 14.5 out of 10.0.",
  },
  {
    label: "100% Compliant Verified Dossier",
    text: "Audited financial statement confirms total assets of $500M, total liabilities of $300M, and stockholders' equity of $200M. Serum potassium is 4.1 mmol/L. CVSS v3.1 score is 7.5.",
  },
];

export function NoctisCircuitBreakerModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisCircuitBreakerModalProps) {
  const [inputText, setInputText] = useState<string>(SAMPLE_BENCHMARKS[0].text);
  const [copied, setCopied] = useState<boolean>(false);

  const evaluation: CircuitBreakerState = useMemo(() => {
    return evaluateCircuitBreaker(inputText);
  }, [inputText]);

  const dossierMarkdown = useMemo(() => {
    return formatCircuitBreakerMarkdown(evaluation);
  }, [evaluation]);

  const handleCopySeal = () => {
    navigator.clipboard.writeText(evaluation.cryptographicSeal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Circuit Breaker Audit: ${evaluation.auditId}`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-red-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-red-900/40 bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Zap className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Epistemic Circuit Breaker & Kill-Switch
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase border ${
                  evaluation.tripped
                    ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse"
                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                }`}>
                  {evaluation.tripped ? "TRIPPED & INTERCEPTED" : "ARMED & PASSING"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Non-bypassable client-side mathematical invariant auditor with automated hallucination veto
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-red-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-red-900/30 bg-red-950/20 p-2.5">
            <ShieldAlert className="size-5 text-red-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Invariants Tripped</div>
              <div className="text-sm font-bold text-red-300">{evaluation.trippedCount} / {evaluation.totalInvariantsChecked} Violations</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-red-900/30 bg-red-950/20 p-2.5">
            <Scale className="size-5 text-amber-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Epistemic Veto</div>
              <div className="text-sm font-bold text-amber-300">{evaluation.tripped ? "Active Intercept" : "Zero Vetoes"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-red-900/30 bg-red-950/20 p-2.5">
            <Activity className="size-5 text-sky-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Correction Loop</div>
              <div className="text-sm font-bold text-sky-300">{evaluation.tripped ? "Auto-Recalibrated" : "Unmodified"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-red-900/30 bg-red-950/20 p-2.5">
            <Lock className="size-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Invariant Standard</div>
              <div className="text-sm font-bold text-emerald-300">NOCTIS-CIRCUIT-001</div>
            </div>
          </div>
        </div>

        {/* Benchmark Presets Toolbar */}
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 p-3 overflow-x-auto text-xs">
          <span className="text-zinc-400 font-semibold whitespace-nowrap text-[11px] uppercase mr-1">
            Test Benchmarks:
          </span>
          {SAMPLE_BENCHMARKS.map((b, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(b.text)}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 whitespace-nowrap border border-zinc-700 transition"
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Candidate Text Inspector */}
          <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Candidate Output / Prompt Input</span>
              <span className="text-[10px] text-zinc-500 font-mono">{inputText.length} chars</span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={5}
              placeholder="Paste candidate output here to evaluate against mathematical & empirical invariants..."
              className="w-full rounded-xl bg-black/60 p-3 text-xs text-zinc-200 border border-zinc-800 focus:outline-none focus:border-red-500/50 font-mono resize-none leading-relaxed"
            />

            {/* Invariant Evaluations Matrix */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-zinc-300">Active Invariant Verifications:</span>
              <div className="space-y-1.5">
                {evaluation.evaluations.map((inv) => (
                  <div
                    key={inv.id}
                    className={`rounded-xl p-3 border text-xs transition ${
                      inv.passed
                        ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-200"
                        : "bg-red-950/30 border-red-500/50 text-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{inv.name}</span>
                        <span className="font-mono text-[10px] text-zinc-400">({inv.id})</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        inv.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                      }`}>
                        {inv.passed ? "PASSED" : "TRIPPED"}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">{inv.mathematicalProof}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-Corrected Epistemic Intercept Viewport */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            <div className="rounded-xl border border-red-900/30 bg-zinc-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">Circuit Breaker Disposition</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  evaluation.tripped ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {evaluation.actionTaken}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {evaluation.tripped
                  ? "A hard mathematical invariant was violated. The epistemic kill-switch intercepted the output to halt hallucinated downstream propagation."
                  : "All invariants satisfied. Candidate output verified against conservation equations and clinical caps."}
              </p>
            </div>

            {/* Recalibrated Output Card */}
            {evaluation.tripped && evaluation.correctedText && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 space-y-2">
                <span className="text-xs font-semibold text-amber-200">Auto-Corrected Epistemic Text:</span>
                <div className="text-xs text-zinc-300 font-mono bg-black/40 rounded p-2.5 border border-white/5 whitespace-pre-wrap leading-relaxed">
                  {evaluation.correctedText}
                </div>
              </div>
            )}

            {/* Cryptographic Verification Seal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Cryptographic Seal</span>
                <button
                  onClick={handleCopySeal}
                  className="text-[10px] text-red-400 hover:text-red-300 underline"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {evaluation.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExportCanvas}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium py-2.5 text-xs transition shadow-lg shadow-red-600/20"
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
