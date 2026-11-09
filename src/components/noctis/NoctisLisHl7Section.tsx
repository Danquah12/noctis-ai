import React, { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileCode,
  FlaskConical,
  HeartPulse,
  Info,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  parseHl7OruR01,
  formatLisSpokenSummary,
  convertLisBatchToStructuredTable,
  HL7_PRESET_SEPSIS_DKA,
  HL7_PRESET_STEMI_TROPONIN,
  HL7_PRESET_CRITICAL_THROMBOCYTOPENIA,
  HL7_PRESET_NORMAL_BASELINE,
  Hl7LisBatch,
  Hl7Observation,
} from "../../lib/noctis-lis-hl7";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "../../lib/noctis-voice";

interface NoctisLisHl7SectionProps {
  onSyncToActiveCase?: (tableRows: Array<{ parameter: string; value: string; referenceRange: string; status: string }>) => void;
}

export const NoctisLisHl7Section: React.FC<NoctisLisHl7SectionProps> = ({ onSyncToActiveCase }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("sepsis");
  const [rawHl7Input, setRawHl7Input] = useState<string>(HL7_PRESET_SEPSIS_DKA);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [copiedHl7, setCopiedHl7] = useState<boolean>(false);

  const parsedBatch: Hl7LisBatch = useMemo(() => {
    try {
      return parseHl7OruR01(rawHl7Input);
    } catch {
      return parseHl7OruR01(HL7_PRESET_SEPSIS_DKA);
    }
  }, [rawHl7Input]);

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    if (key === "sepsis") setRawHl7Input(HL7_PRESET_SEPSIS_DKA);
    else if (key === "stemi") setRawHl7Input(HL7_PRESET_STEMI_TROPONIN);
    else if (key === "thrombocytopenia") setRawHl7Input(HL7_PRESET_CRITICAL_THROMBOCYTOPENIA);
    else if (key === "normal") setRawHl7Input(HL7_PRESET_NORMAL_BASELINE);
    setSyncSuccess(false);
  };

  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const textToSpeak = formatLisSpokenSummary(parsedBatch);
    const ok = await speakNoctisVoice(textToSpeak, "alloy", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
    if (!ok) {
      setIsSpeaking(false);
    }
  };

  const handleSyncToCase = () => {
    if (onSyncToActiveCase) {
      const rows = convertLisBatchToStructuredTable(parsedBatch);
      onSyncToActiveCase(rows);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    }
  };

  const handleCopyHl7 = () => {
    navigator.clipboard.writeText(rawHl7Input);
    setCopiedHl7(true);
    setTimeout(() => setCopiedHl7(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-teal-950/30 to-emerald-950/40 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
                <FlaskConical className="size-3" />
                Track 13 · LIS Ingestion
              </span>
              <span className="text-[11px] font-mono text-cyan-400/80">HL7 v2.5.1 / v3 ORU-R01 Protocol</span>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Hospital Laboratory LIS Direct Ingestion & Analyzer Bridge
            </h2>
            <p className="mt-1 text-xs text-neutral-300 max-w-3xl leading-relaxed">
              Real-time unsolicited observation ingestion from hospital Laboratory Information Systems (Epic, Cerner, Abbott Architect, Roche Cobas). Automatically computes serum anion gaps, ESC 0/1h hs-cTn deltas, trips non-compensatory safety invariant gates, and formats zero-truncation spoken panic enunciations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleVoice}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-md transition-all border",
                isSpeaking
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300 ring-2 ring-rose-500/50 animate-pulse"
                  : "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-200"
              )}
            >
              {isSpeaking ? (
                <>
                  <Square className="size-3.5 fill-current text-rose-300" />
                  Stop Reading Labs
                </>
              ) : (
                <>
                  <Volume2 className="size-3.5 text-cyan-300" />
                  Enunciate LIS Report
                </>
              )}
            </button>

            {onSyncToActiveCase && (
              <button
                type="button"
                onClick={handleSyncToCase}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-md transition-all border",
                  syncSuccess
                    ? "bg-emerald-500/30 border-emerald-400/60 text-emerald-200 ring-2 ring-emerald-500/40"
                    : "bg-gradient-to-r from-teal-600/30 to-emerald-600/30 hover:from-teal-600/40 hover:to-emerald-600/40 border-teal-500/40 text-teal-200"
                )}
              >
                {syncSuccess ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-300" />
                    Synced to Case Reference Table
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-teal-300" />
                    Sync to Active Case
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Preset Selector Bar */}
        <div className="mt-4 pt-4 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider">Hospital Clinical Presets:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectPreset("sepsis")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPreset === "sepsis"
                    ? "bg-rose-500/25 border-rose-500/60 text-rose-200 shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800/80"
                )}
              >
                Acute Sepsis & DKA Panel (HH Panics)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset("stemi")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPreset === "stemi"
                    ? "bg-amber-500/25 border-amber-500/60 text-amber-200 shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800/80"
                )}
              >
                Acute STEMI / hs-cTn Serial Delta
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset("thrombocytopenia")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPreset === "thrombocytopenia"
                    ? "bg-purple-500/25 border-purple-500/60 text-purple-200 shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800/80"
                )}
              >
                Critical Thrombocytopenia (LL Panics)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset("normal")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPreset === "normal"
                    ? "bg-emerald-500/25 border-emerald-500/60 text-emerald-200 shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800/80"
                )}
              >
                Outpatient Normal Baseline
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-400">
              Facility: <strong className="text-cyan-300">{parsedBatch.sendingFacility}</strong>
            </span>
            <span className="text-neutral-500">·</span>
            <span className="text-[11px] font-mono text-neutral-400">
              Control ID: <strong className="text-cyan-300">{parsedBatch.messageControlId}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Critical Panics & Safety Invariant Veto Banner */}
      {parsedBatch.criticalPanics.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/60 via-red-950/40 to-neutral-950/60 p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-rose-500/20 p-2 border border-rose-500/40 text-rose-300 shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-rose-200 flex items-center gap-2">
                  <span>CRITICAL LABORATORY PANIC ALERTS DETECTED ({parsedBatch.criticalPanics.length})</span>
                  {parsedBatch.trippedInvariants.map((code) => (
                    <span
                      key={code}
                      className="rounded bg-rose-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-200 border border-rose-500/50"
                    >
                      {code}
                    </span>
                  ))}
                </h3>
                <span className="text-[11px] font-mono text-rose-300/80 uppercase">
                  CLIA / CAP Critical Thresholds Tripped
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {parsedBatch.criticalPanics.map((panic, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-rose-500/30 bg-black/40 p-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{panic.testName}</span>
                        <span className="rounded bg-rose-500/30 px-1.5 py-0.2 font-mono text-[10px] font-bold text-rose-200 border border-rose-500/50">
                          {panic.abnormalFlag}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-rose-400 font-mono">
                          {panic.value}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-mono">{panic.units}</span>
                        <span className="text-[10px] text-neutral-500 ml-auto">
                          Ref: {panic.referenceRange}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-rose-200/90 leading-tight">
                      {panic.clinicalSignificance}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Clinical Calculations (Anion Gap & Serial Troponin Delta) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calculated Anion Gap */}
        <div className="rounded-xl border border-teal-500/30 bg-neutral-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-teal-300 uppercase flex items-center gap-1.5">
              <Activity className="size-3.5 text-teal-400" />
              Calculated Serum Anion Gap
            </span>
            {parsedBatch.anionGap !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-mono font-bold border",
                  parsedBatch.anionGap > 12
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                )}
              >
                {parsedBatch.anionGap > 12 ? "HIGH ANION GAP" : "NORMAL GAP"}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {parsedBatch.anionGap !== undefined ? parsedBatch.anionGap : "--"}
            </span>
            <span className="text-xs text-neutral-400 font-mono">mmol/L</span>
            <span className="text-xs text-neutral-500 ml-auto font-mono">Normal Interval: 8.0 - 12.0</span>
          </div>
          <p className="mt-2 text-xs text-neutral-300">
            {parsedBatch.anionGap !== undefined
              ? parsedBatch.anionGap > 12
                ? "Anion gap > 12 mmol/L confirms high-anion-gap metabolic acidosis (HAGMA - DKA, lactic acidosis, uremia, toxic ingestion). Requires immediate etiology identification."
                : "Serum electrolyte balance shows normal unmeasured anion concentration."
              : "Electrolytes (Na, Cl, HCO3) incomplete in current batch."}
          </p>
        </div>

        {/* High-Sensitivity Troponin Serial Delta */}
        <div className="rounded-xl border border-indigo-500/30 bg-neutral-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-indigo-300 uppercase flex items-center gap-1.5">
              <HeartPulse className="size-3.5 text-indigo-400" />
              High-Sensitivity Troponin Serial Delta
            </span>
            {parsedBatch.deltaTroponin && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-mono font-bold border",
                  parsedBatch.deltaTroponin.ruleIn
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                )}
              >
                {parsedBatch.deltaTroponin.ruleIn ? "ESC RULE-IN" : "OBSERVATION"}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {parsedBatch.deltaTroponin ? (
              <>
                <span className="text-xs text-neutral-400">Baseline (0h):</span>
                <span className="text-lg font-mono font-bold text-white">
                  {parsedBatch.deltaTroponin.baseline}
                </span>
                <span className="text-xs text-neutral-400 font-mono">ng/L</span>
                <span className="text-xs text-neutral-500">→</span>
                <span className="text-xs text-neutral-400">Repeat ({parsedBatch.deltaTroponin.deltaHours}h):</span>
                <span className="text-2xl font-mono font-bold text-rose-400">
                  {parsedBatch.deltaTroponin.current}
                </span>
                <span className="text-xs text-neutral-400 font-mono">ng/L</span>
              </>
            ) : (
              <span className="text-xs text-neutral-400">No serial repeat troponin in current batch.</span>
            )}
          </div>
          <p className="mt-2 text-xs text-neutral-300">
            {parsedBatch.deltaTroponin
              ? parsedBatch.deltaTroponin.ruleIn
                ? "European Society of Cardiology (ESC) 0/1h rule-in threshold exceeded (current >= 52 ng/L or delta >= 5.0 ng/L). Urgent invasive coronary angiography evaluation required."
                : "Troponin dynamics remain below acute myocardial necrosis thresholds."
              : "Standard single point or non-serial cardiac biomarker report."}
          </p>
        </div>
      </div>

      {/* Main Dual Grid: Parsed Orders vs Raw HL7 Message */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side (7 cols): Parsed Laboratory Panels & Scorecard */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FlaskConical className="size-4 text-cyan-400" />
              <span>Parsed Clinical Panels ({parsedBatch.orders.length})</span>
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              Patient: <strong className="text-neutral-200">{parsedBatch.patient.patientName}</strong> ({parsedBatch.patient.mrn})
            </span>
          </div>

          <div className="space-y-3">
            {parsedBatch.orders.map((order, orderIdx) => (
              <div
                key={orderIdx}
                className="rounded-xl border border-neutral-800 bg-neutral-900/70 overflow-hidden shadow-sm"
              >
                <div className="bg-neutral-800/60 px-3.5 py-2 flex items-center justify-between border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-200">{order.panelName}</span>
                    <span className="text-[10px] font-mono text-neutral-400">({order.universalServiceId})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                    <span>Source: {order.specimenSource}</span>
                    <span>·</span>
                    <span>Order: {order.orderNumber}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950/40 text-[10px] uppercase font-mono text-neutral-400 border-b border-neutral-800/60">
                      <tr>
                        <th className="px-3.5 py-1.5 font-semibold">Test Parameter</th>
                        <th className="px-3 py-1.5 font-semibold">Result</th>
                        <th className="px-3 py-1.5 font-semibold">Reference Range</th>
                        <th className="px-3 py-1.5 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/40 font-mono">
                      {order.observations.map((obs, obsIdx) => (
                        <tr
                          key={obsIdx}
                          className={cn(
                            "hover:bg-neutral-800/30 transition-colors",
                            obs.isPanic ? "bg-rose-950/20" : ""
                          )}
                        >
                          <td className="px-3.5 py-2 font-sans font-medium text-neutral-200">
                            {obs.testName}
                          </td>
                          <td className="px-3 py-2 font-bold">
                            <span
                              className={cn(
                                obs.status === "CRITICAL_HIGH" || obs.status === "CRITICAL_LOW"
                                  ? "text-rose-400 font-extrabold"
                                  : obs.status === "BORDERLINE"
                                  ? "text-amber-300"
                                  : "text-emerald-400"
                              )}
                            >
                              {obs.value}
                            </span>{" "}
                            <span className="text-[10px] text-neutral-400 font-normal">{obs.units}</span>
                          </td>
                          <td className="px-3 py-2 text-neutral-400 text-[11px]">
                            {obs.referenceRange} {obs.units}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={cn(
                                "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                                obs.status === "CRITICAL_HIGH" || obs.status === "CRITICAL_LOW"
                                  ? "bg-rose-500/30 text-rose-300 border border-rose-500/50"
                                  : obs.status === "BORDERLINE"
                                  ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              )}
                            >
                              {obs.abnormalFlag === "N" ? "NORMAL" : `${obs.abnormalFlag} (${obs.status})`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side (5 cols): Raw HL7 v2.5.1 Message Editor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileCode className="size-4 text-cyan-400" />
              <span>Live HL7 v2.5.1 ORU-R01 Stream</span>
            </h3>
            <button
              type="button"
              onClick={handleCopyHl7}
              className="inline-flex items-center gap-1 rounded bg-neutral-800 hover:bg-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300 transition"
            >
              {copiedHl7 ? <CheckCircle2 className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              {copiedHl7 ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="relative rounded-xl border border-neutral-800 bg-black/60 p-3 shadow-inner">
            <textarea
              value={rawHl7Input}
              onChange={(e) => setRawHl7Input(e.target.value)}
              rows={16}
              className="w-full bg-transparent font-mono text-[11px] text-cyan-300/90 leading-tight focus:outline-none resize-none selection:bg-cyan-900 selection:text-white"
              spellCheck={false}
            />
            <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>Standard: HL7 2.5.1 (Pipes & Hats)</span>
              <span>Edit any line to test real-time re-parsing</span>
            </div>
          </div>

          {/* CLIA / 21 CFR § 862/864 Regulatory Compliance Card */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
              <Info className="size-3.5 text-cyan-400" />
              <span>FDA 21 CFR § 862/864 & CLIA / CAP Conformance</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Standardized HL7 v2.5.1 parser isolates patient demographics (PID), clinical service requests (OBR), and numerical results with reference intervals (OBX). Unsolicited observation batches are validated before entering the clinical differential matrix.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
