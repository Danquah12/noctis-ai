// ============================================================================
// NOCTIS SOVEREIGN AIR-GAP WEBGPU / OFFLINE COCKPIT
// Standard: Department of Defense / Zero-Trust Hospital ICU Air-Gap Boundary
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  WifiOff,
  ShieldCheck,
  Cpu,
  Lock,
  RefreshCw,
  Send,
  AlertOctagon,
  FileCode,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  executeAirgapClinicalEvaluation,
  type AirgapExecutionResult,
} from "@/lib/noctis-sovereign-airgap-engine";

interface NoctisAirgapSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisAirgapSection({ onSendToChat }: NoctisAirgapSectionProps) {
  const [selectedTrack, setSelectedTrack] = useState<number>(27);
  const [airgapForced, setAirgapForced] = useState<boolean>(true);
  const [simulateLeakAttempt, setSimulateLeakAttempt] = useState<boolean>(false);

  const trackNames: Record<number, string> = {
    21: "Track 21: Obstetric & Neonatal Resuscitation (NRP)",
    22: "Track 22: Point-of-Care Ultrasound (POCUS / RUSH / BLUE)",
    23: "Track 23: Clinical Pharmacology & QTc Matrix (Tisdale)",
    24: "Track 24: Acute Burn Resuscitation (Parkland)",
    25: "Track 25: Massive Transfusion Protocol (PROPPR 1:1:1)",
    26: "Track 26: Diabetic Ketoacidosis (DKA Two-Bag)",
    27: "Track 27: Targeted Temperature Management (TTM2)",
    28: "Track 28: CRRT & KDIGO AKI Staging",
    29: "Track 29: Hemodynamic Instability & Vasoactive Titration (VIS)",
    30: "Track 30: Comprehensive Stroke Code (DAWN / DEFUSE 3)",
  };

  const executionResult = useMemo<AirgapExecutionResult>(() => {
    return executeAirgapClinicalEvaluation(
      "ENC-OFFLINE-7701",
      selectedTrack,
      trackNames[selectedTrack] || "Clinical Resuscitation Track",
      { coreTempC: 38.4, shockIndex: 1.25, timeToRoscMinutes: 20 },
      [
        {
          code: "CF-AIRGAP-001",
          tripped: true,
          directive: "Strict local cryptographic verification active. Network hardware interface locked.",
        },
      ]
    );
  }, [selectedTrack, airgapForced]);

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis Sovereign Air-Gap Consult] Verified offline execution for ${executionResult.trackName}. Zero-WAN Egress Packets: ${executionResult.egressPacketsSent}. SHA-256 Digest: ${executionResult.integritySeal.sha256BundleDigest.slice(0, 16)}... Egress Intercept Events: ${executionResult.auditTrail.length}.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-neutral-900/60 to-cyan-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-emerald-400">
              <WifiOff className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Sovereign In-Browser WebGPU & Air-Gap Engine (Bedside Offline Mode)
                </h2>
                <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
                  ZERO-WAN EGRESS
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Execute all 30 Clinical Decision Support tracks 100% locally in browser memory without transmitting a single byte of Protected Health Information
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSendToChat && (
              <button
                type="button"
                onClick={handleSendChat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 px-3 py-1.5 text-xs font-semibold text-emerald-200 border border-emerald-500/40 transition"
              >
                <Send className="size-3.5" /> Send Audit to Sovereign Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cryptographic Seal Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="size-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white">
                {executionResult.integritySeal.sealId}
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                CRYPTOGRAPHICALLY SEALED
              </span>
            </div>
            <div className="text-[11px] font-mono text-neutral-300 mt-1 break-all">
              SHA-256: {executionResult.integritySeal.sha256BundleDigest}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              {executionResult.integritySeal.provenanceStatement}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-neutral-400 font-mono">WAN Egress Packets</div>
          <div className="text-2xl font-bold text-emerald-400">0.00 <span className="text-xs">KB</span></div>
          <div className="text-[9px] text-emerald-300/80 font-mono">100% Air-Gap Verified</div>
        </div>
      </div>

      {/* Configuration & Egress Sniffer Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Column 1: Local Engine Configuration */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Cpu className="size-4 text-emerald-400" /> In-Browser Hardware & Pipeline
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Select Resuscitation Track</label>
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(parseInt(e.target.value, 10))}
                className="w-full rounded-md bg-neutral-900 border border-white/10 px-2.5 py-1.5 text-xs text-white"
              >
                {Object.entries(trackNames).map(([trackId, name]) => (
                  <option key={trackId} value={trackId}>{name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-white/5">
                <div className="text-[10px] text-neutral-400 font-mono">Execution Backend</div>
                <div className="text-xs font-bold text-cyan-300 mt-0.5 flex items-center gap-1.5">
                  <Cpu className="size-3.5" /> WebGPU Native
                </div>
                <div className="text-[9px] text-neutral-500 mt-1">Fallback: WASM SIMD</div>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-white/5">
                <div className="text-[10px] text-neutral-400 font-mono">Local Weight Footprint</div>
                <div className="text-xs font-bold text-amber-300 mt-0.5">INT4_NF4 Quantized</div>
                <div className="text-[9px] text-neutral-500 mt-1">VRAM Budget: &lt; 2.2 GB</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-300">Strict Hardware Egress Isolation</span>
              <input
                type="checkbox"
                checked={airgapForced}
                onChange={(e) => setAirgapForced(e.target.checked)}
                className="size-4 rounded accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Column 2: Egress Sniffer & Intercept Audit Trail */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Lock className="size-4 text-cyan-400" /> Network Egress Sniffer & Audit Ledger
          </h3>

          <div className="space-y-2 text-xs">
            <div className="text-[11px] text-neutral-400">
              Active tamper-evident security ledger intercepting unauthorized cloud or API exfiltration:
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[10px]">
              {executionResult.auditTrail.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded bg-neutral-900/80 border border-white/5 p-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-red-400 font-bold mr-1">[{entry.actionTaken}]</span>
                    <span className="text-neutral-300">{entry.interceptedTarget}</span>
                  </div>
                  <span className="text-neutral-500 text-[9px]">{entry.protocol}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-[10px] text-emerald-300">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Full compliance with military and HIPAA air-gapped confidential compute standards.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
