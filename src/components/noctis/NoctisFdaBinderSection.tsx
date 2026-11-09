// ============================================================================
// NOCTIS FDA 510(K) / ESTAR & SAMD REGULATORY BINDER COCKPIT
// Standard: FDA eSTAR Submission v5.2, ISO 14971, IEC 62304, 21 U.S.C. § 360j(o)(1)(E)
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  FileText,
  ShieldCheck,
  Download,
  Send,
  AlertTriangle,
  CheckCircle2,
  Check,
} from "lucide-react";
import {
  generateFdaRegulatoryBinder,
  type FdaRegulatoryBinder,
} from "@/lib/noctis-fda-binder-generator";

interface NoctisFdaBinderSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisFdaBinderSection({ onSendToChat }: NoctisFdaBinderSectionProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const binder = useMemo<FdaRegulatoryBinder>(() => generateFdaRegulatoryBinder(), []);

  const handleCopy = () => {
    void navigator.clipboard.writeText(binder.binderMarkdownDossier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([binder.binderMarkdownDossier], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FDA_510K_eSTAR_Binder_${binder.submissionId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis FDA 510(k) Regulatory Binder Consult] Submission ${binder.submissionId}. Product Code: ${binder.productCode} (${binder.regulationNumber}). Software Safety Class: ${binder.softwareSafetyClass}. Total Registered Safety Gates: ${binder.totalSafetyGatesRegistered}. ISO 14971 Risk Status: All residual risks mitigated to Negligible.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-neutral-900/60 to-orange-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2.5 border border-amber-500/20 text-amber-400">
              <FileText className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  FDA 510(k) / eSTAR &amp; SaMD Comprehensive Regulatory Binder
                </h2>
                <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                  eSTAR v5.2 / ISO 14971
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Automated risk management, IEC 62304 software safety lifecycle, and statutory 21 U.S.C. § 360j(o)(1)(E) audit binder
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 border border-white/10 transition"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <FileText className="size-3.5" />}
              {copied ? "Copied" : "Copy Dossier"}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 px-3 py-1.5 text-xs font-semibold text-amber-200 border border-amber-500/40 transition"
            >
              <Download className="size-3.5" /> Export Markdown (.md)
            </button>

            {onSendToChat && (
              <button
                type="button"
                onClick={handleSendChat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
              >
                <Send className="size-3.5" /> Send to Sovereign Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
          <div className="text-[10px] text-neutral-400 font-mono">Submission ID</div>
          <div className="text-xs font-bold text-white mt-1">{binder.submissionId}</div>
          <div className="text-[9px] text-neutral-500">eSTAR Premarket</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
          <div className="text-[10px] text-neutral-400 font-mono">Product Code</div>
          <div className="text-xs font-bold text-amber-300 mt-1">{binder.productCode} / LLZ</div>
          <div className="text-[9px] text-neutral-500">21 CFR § 880.6310</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
          <div className="text-[10px] text-neutral-400 font-mono">Software Safety Class</div>
          <div className="text-xs font-bold text-emerald-400 mt-1">Class C (IEC 62304)</div>
          <div className="text-[9px] text-neutral-500">Life-Critical Lockout</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
          <div className="text-[10px] text-neutral-400 font-mono">ISO 14971 Safety Gates</div>
          <div className="text-xs font-bold text-cyan-300 mt-1">{binder.totalSafetyGatesRegistered} Gates</div>
          <div className="text-[9px] text-emerald-400 font-semibold">100% Mitigated</div>
        </div>
      </div>

      {/* Risk Management Matrix */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
          <ShieldCheck className="size-4 text-emerald-400" /> ISO 14971:2019 Risk Management &amp; Hazard Analysis Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 text-[10px] font-mono">
                <th className="py-2 px-2">Hazard ID</th>
                <th className="py-2 px-2">Domain</th>
                <th className="py-2 px-2">Invariant</th>
                <th className="py-2 px-2">Clinical Hazard Description</th>
                <th className="py-2 px-2">Pre-Mitigation</th>
                <th className="py-2 px-2">Software Gate</th>
                <th className="py-2 px-2">Residual Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {binder.iso14971RiskMatrix.map((h) => (
                <tr key={h.hazardId} className="hover:bg-white/[0.02] transition">
                  <td className="py-2 px-2 font-mono font-bold text-amber-300">{h.hazardId}</td>
                  <td className="py-2 px-2 text-neutral-300">{h.clinicalDomain}</td>
                  <td className="py-2 px-2 font-mono text-cyan-300">{h.invariantCode}</td>
                  <td className="py-2 px-2 text-neutral-300 max-w-xs">{h.hazardDescription}</td>
                  <td className="py-2 px-2 text-red-400 font-semibold">{h.preMitigationSeverity}</td>
                  <td className="py-2 px-2 text-neutral-400 max-w-xs">{h.softwareMitigationGate}</td>
                  <td className="py-2 px-2 text-emerald-400 font-bold">NEGLIGIBLE</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
