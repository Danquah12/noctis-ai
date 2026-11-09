import React, { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Heart,
  HeartPulse,
  Info,
  Maximize2,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Square,
  Volume2,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  evaluate12LeadEcg,
  formatEcgSpokenAnalysis,
  generateSyntheticEcgPoints,
  deriveFrankXyzFrom12Lead,
  calculateModifiedSgarbossa,
  calculateTisdaleRisk,
  ECG_PRESET_ANTERIOR_STEMI,
  ECG_PRESET_WELLENS_LAD,
  ECG_PRESET_HYPERKALEMIC_SINE,
  ECG_PRESET_LONG_QTC_TORSADES,
  ECG_PRESET_NORMAL_SINUS,
  EcgAnalysisReport,
} from "../../lib/noctis-ecg-arrhythmia";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "../../lib/noctis-voice";

interface NoctisEcgSectionProps {
  onSendToChat?: (promptText: string) => void;
  onInjectEcgToCase?: (findings: string) => void;
}

export const NoctisEcgSection: React.FC<NoctisEcgSectionProps> = ({ onSendToChat, onInjectEcgToCase }) => {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("stemi");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [syncedSuccess, setSyncedSuccess] = useState<boolean>(false);
  const [activeVcgPlane, setActiveVcgPlane] = useState<"frontal" | "horizontal" | "sagittal">("frontal");

  const currentParams = useMemo(() => {
    switch (selectedPresetKey) {
      case "stemi":
        return ECG_PRESET_ANTERIOR_STEMI;
      case "wellens":
        return ECG_PRESET_WELLENS_LAD;
      case "hyperkalemia":
        return ECG_PRESET_HYPERKALEMIC_SINE;
      case "long_qtc":
        return ECG_PRESET_LONG_QTC_TORSADES;
      default:
        return ECG_PRESET_NORMAL_SINUS;
    }
  }, [selectedPresetKey]);

  const report: EcgAnalysisReport = useMemo(() => {
    return evaluate12LeadEcg(currentParams);
  }, [currentParams]);

  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const spoken = formatEcgSpokenAnalysis(report);
    const ok = await speakNoctisVoice(spoken, "alloy", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
    if (!ok) {
      setIsSpeaking(false);
    }
  };

  const handleSyncToCase = () => {
    if (onInjectEcgToCase) {
      const narrative = `12-Lead ECG Analysis: HR ${report.heartRateBpm} bpm, ${report.rhythmDescription}, PR ${report.prIntervalMs} ms, QRS ${report.qrsDurationMs} ms, QTc(Bazett) ${report.qtcBazettMs} ms, Axis ${report.qrsAxisDegrees}° (${report.qrsAxisCategory}). Finding: ${report.primaryEcgFinding}. Directives: ${report.immediateDirectives.join(" ")}`;
      onInjectEcgToCase(narrative);
      setSyncedSuccess(true);
      setTimeout(() => setSyncedSuccess(false), 3500);
    }
  };

  // 12-lead standard ordering for rendering grid
  const leadOrderGrid = [
    ["I", "aVR", "V1", "V4"],
    ["II", "aVL", "V2", "V5"],
    ["III", "aVF", "V3", "V6"],
  ];

  // Helper to render an SVG waveform for a lead
  const renderLeadWaveform = (leadName: string, isRhythmStrip = false) => {
    const lead = report.leads[leadName];
    const stDev = lead?.stDeviationMm || 0;
    const isTInverted = (lead?.tWaveAmplitudeMv || 0) < 0;
    const isSine = report.rhythm === "SINE_WAVE_HYPERKALEMIA";
    const points = generateSyntheticEcgPoints(leadName, report.heartRateBpm, stDev, isTInverted, isSine);

    const svgWidth = isRhythmStrip ? 600 : 200;
    const svgHeight = 70;
    const midY = svgHeight / 2;

    // Convert points to SVG polyline path
    const pathD = points
      .map((p, idx) => {
        const x = (idx / (points.length - 1)) * svgWidth;
        const y = midY - p.v * 18; // scale mV to pixels
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <div className="relative rounded-lg border border-neutral-800 bg-neutral-950/70 p-2 overflow-hidden shadow-inner">
        {/* ECG Grid Background (Standard 1mm/5mm grid simulation) */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(239, 68, 68, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(239, 68, 68, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "8px 8px",
          }}
        />

        <div className="relative z-10 flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-rose-300">{leadName}</span>
            {lead && Math.abs(lead.stDeviationMm) >= 1.0 && (
              <span
                className={cn(
                  "rounded px-1 text-[9px] font-mono font-bold",
                  lead.stDeviationMm > 0 ? "bg-rose-500/30 text-rose-300" : "bg-blue-500/30 text-blue-300"
                )}
              >
                {lead.stDeviationMm > 0 ? `+${lead.stDeviationMm}mm` : `${lead.stDeviationMm}mm`}
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono text-neutral-500">25mm/s 10mm/mV</span>
        </div>

        <svg className="w-full h-12 overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          <path
            d={pathD}
            fill="none"
            stroke={stDev >= 1.5 ? "#f43f5e" : stDev <= -1.0 ? "#38bdf8" : "#22c55e"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  };

  // Vectorcardiographic (VCG) 2D loop computation
  const vcgLoopPoints = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    const leadValues: Record<string, number> = {};
    for (const [k, v] of Object.entries(report.leads)) {
      leadValues[k] = v.stDeviationMm;
    }

    for (let t = 0; t <= 360; t += 6) {
      const rad = (t * Math.PI) / 180;
      // Synthetic QRS loop generation influenced by QRS axis
      const axisRad = (report.qrsAxisDegrees * Math.PI) / 180;
      const r = 45 * Math.sin(rad) * (1 + 0.3 * Math.cos(rad - axisRad));
      const frank = deriveFrankXyzFrom12Lead(leadValues, t);

      let px = 0;
      let py = 0;

      if (activeVcgPlane === "frontal") {
        px = 100 + r * Math.cos(rad) + frank.x * 12;
        py = 100 - r * Math.sin(rad) - frank.y * 12;
      } else if (activeVcgPlane === "horizontal") {
        px = 100 + r * Math.cos(rad) + frank.x * 12;
        py = 100 + r * Math.sin(rad) + frank.z * 12;
      } else {
        // sagittal
        px = 100 + r * Math.sin(rad) + frank.z * 12;
        py = 100 - r * Math.cos(rad) - frank.y * 12;
      }

      pts.push({ x: px, y: py });
    }
    return pts;
  }, [report, activeVcgPlane]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-red-950/30 to-amber-950/40 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider text-rose-300 uppercase">
                <HeartPulse className="size-3" />
                Track 15 · 12-Lead ECG & VCG Engine
              </span>
              <span className="text-[11px] font-mono text-rose-400/80">Frank XYZ Vectorcardiography · AHA/ACC/HRS</span>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
              12-Lead Electrocardiography & Vectorcardiographic Arrhythmia Engine
            </h2>
            <p className="mt-1 text-xs text-neutral-300 max-w-3xl leading-relaxed">
              Real-time multi-lead ST-elevation vector analysis, high-risk STEMI equivalents (Wellens' Type A/B, De Winter's T-waves), Modified Sgarbossa criteria in LBBB, Frank orthogonal X-Y-Z loops, hyperkalemic sine-wave detection, and Tisdale drug-induced QTc prolongation risk scoring.
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
                  : "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-200"
              )}
            >
              {isSpeaking ? (
                <>
                  <Square className="size-3.5 fill-current text-rose-300" />
                  Stop Voice Report
                </>
              ) : (
                <>
                  <Volume2 className="size-3.5 text-rose-300" />
                  Read 12-Lead ECG Aloud
                </>
              )}
            </button>

            {onInjectEcgToCase && (
              <button
                type="button"
                onClick={handleSyncToCase}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-md transition-all border",
                  syncedSuccess
                    ? "bg-emerald-500/30 border-emerald-400/60 text-emerald-200 ring-2 ring-emerald-500/40"
                    : "bg-gradient-to-r from-red-600/30 to-rose-600/30 hover:from-red-600/40 hover:to-rose-600/40 border-red-500/40 text-red-200"
                )}
              >
                {syncedSuccess ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-300" />
                    Synced to Clinical Case
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-rose-300" />
                    Inject into Active Case
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Clinical Preset Selector */}
        <div className="mt-4 pt-4 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-rose-300 uppercase tracking-wider">Electrophysiological Presets:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPresetKey("stemi")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPresetKey === "stemi"
                    ? "bg-rose-600 border-rose-400 text-white shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800"
                )}
              >
                Acute Anterior STEMI (V1–V4)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPresetKey("wellens")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPresetKey === "wellens"
                    ? "bg-amber-600 border-amber-400 text-white shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800"
                )}
              >
                Wellens' Syndrome (Critical LAD)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPresetKey("hyperkalemia")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPresetKey === "hyperkalemia"
                    ? "bg-purple-600 border-purple-400 text-white shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800"
                )}
              >
                Hyperkalemic Sine-Wave (K+ 7.8)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPresetKey("long_qtc")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPresetKey === "long_qtc"
                    ? "bg-blue-600 border-blue-400 text-white shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800"
                )}
              >
                Long QTc & Torsades Hazard
              </button>
              <button
                type="button"
                onClick={() => setSelectedPresetKey("normal")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  selectedPresetKey === "normal"
                    ? "bg-emerald-600 border-emerald-400 text-white shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800"
                )}
              >
                Normal Sinus Rhythm
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
            <span>Patient: <strong className="text-white">{report.patientName}</strong></span>
            <span>·</span>
            <span>Record: <strong className="text-rose-300">{report.recordId}</strong></span>
          </div>
        </div>
      </div>

      {/* Primary Interpretation & Safety Invariant Veto Alert */}
      <div
        className={cn(
          "rounded-xl border p-4 shadow-xl",
          report.trippedInvariants.length > 0
            ? "border-rose-500/50 bg-gradient-to-r from-rose-950/60 via-red-950/40 to-neutral-950/60"
            : "border-emerald-500/30 bg-neutral-900/60"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-lg p-2.5 border shrink-0",
              report.trippedInvariants.length > 0
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
            )}
          >
            {report.trippedInvariants.length > 0 ? (
              <ShieldAlert className="size-5" />
            ) : (
              <CheckCircle2 className="size-5" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{report.primaryEcgFinding}</span>
                {report.trippedInvariants.map((code) => (
                  <span
                    key={code}
                    className="rounded bg-rose-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-200 border border-rose-500/50"
                  >
                    {code}
                  </span>
                ))}
              </h3>
              <span className="text-[11px] font-mono text-rose-300">
                {report.rhythmDescription} ({report.heartRateBpm} bpm)
              </span>
            </div>

            {report.immediateDirectives.length > 0 && (
              <div className="mt-2.5 space-y-1">
                {report.immediateDirectives.map((dir, i) => (
                  <div key={i} className="text-xs text-rose-200/90 flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold shrink-0">▶</span>
                    <span>{dir}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interval, Axis & Electrophysiological Metrics HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">Ventricular Rate</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-white">{report.heartRateBpm}</span>
            <span className="text-[10px] text-neutral-400 font-mono">bpm</span>
          </div>
          <span className="text-[10px] text-neutral-500 block truncate mt-0.5">{report.rhythmDescription}</span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">P-R Interval</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={cn(
                "text-xl font-bold font-mono",
                report.prIntervalMs > 200 ? "text-amber-300" : "text-white"
              )}
            >
              {report.prIntervalMs}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">ms</span>
          </div>
          <span className="text-[10px] text-neutral-500 block truncate mt-0.5">Normal: 120-200 ms</span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">QRS Duration</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={cn(
                "text-xl font-bold font-mono",
                report.qrsDurationMs >= 120 ? "text-rose-400 font-extrabold" : "text-white"
              )}
            >
              {report.qrsDurationMs}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">ms</span>
          </div>
          <span className="text-[10px] text-neutral-500 block truncate mt-0.5">
            {report.qrsDurationMs >= 120 ? "Wide QRS / BBB" : "Normal: < 120 ms"}
          </span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">QT / QTc (Bazett)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={cn(
                "text-xl font-bold font-mono",
                report.qtcBazettMs >= 500
                  ? "text-rose-400 font-extrabold"
                  : report.qtcBazettMs >= 460
                  ? "text-amber-300"
                  : "text-white"
              )}
            >
              {report.qtcBazettMs}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">ms</span>
          </div>
          <span className="text-[10px] text-neutral-500 block truncate mt-0.5">
            Raw QT: {report.qtIntervalMs} ms
          </span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">QTc (Fridericia)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-white">{report.qtcFridericiaMs}</span>
            <span className="text-[10px] text-neutral-400 font-mono">ms</span>
          </div>
          <span className="text-[10px] text-neutral-500 block truncate mt-0.5">Rate-Invariant</span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">QRS Frontal Axis</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-cyan-300">{report.qrsAxisDegrees}°</span>
          </div>
          <span className="text-[10px] text-neutral-400 block truncate mt-0.5">
            {report.qrsAxisCategory.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Main Dual View: 12-Lead Electrocardiogram Grid vs Frank XYZ Vectorcardiogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side (8 cols): 12-Lead Waveform Grid */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Activity className="size-4 text-rose-400" />
              12-Lead Electrocardiogram Waveform Traces (Standard Layout)
            </h3>
            <span className="text-[10px] font-mono text-neutral-400">
              Calibration: 25 mm/s · 10 mm/mV · 0.05-150 Hz Filter
            </span>
          </div>

          {/* 3 Rows x 4 Columns Lead Matrix */}
          <div className="space-y-2">
            {leadOrderGrid.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {row.map((leadName) => (
                  <div key={leadName}>{renderLeadWaveform(leadName)}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Extended Continuous Rhythm Strip (Lead II) */}
          <div className="pt-2">
            <span className="text-[10px] font-mono text-neutral-400 block mb-1">
              Rhythm Strip (Continuous Lead II):
            </span>
            {renderLeadWaveform("II", true)}
          </div>
        </div>

        {/* Right Side (4 cols): Vectorcardiography (VCG) & Sgarbossa / Tisdale HUD */}
        <div className="lg:col-span-4 space-y-4">
          {/* Vectorcardiogram (VCG) Loop Visualizer */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-400" />
                Frank XYZ Vectorcardiogram
              </span>
              <div className="flex rounded-md bg-neutral-800 p-0.5 text-[9px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveVcgPlane("frontal")}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition",
                    activeVcgPlane === "frontal" ? "bg-rose-600 text-white font-bold" : "text-neutral-400"
                  )}
                >
                  Frontal (XY)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVcgPlane("horizontal")}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition",
                    activeVcgPlane === "horizontal" ? "bg-rose-600 text-white font-bold" : "text-neutral-400"
                  )}
                >
                  Horiz (XZ)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVcgPlane("sagittal")}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition",
                    activeVcgPlane === "sagittal" ? "bg-rose-600 text-white font-bold" : "text-neutral-400"
                  )}
                >
                  Sagit (ZY)
                </button>
              </div>
            </div>

            <div className="relative rounded-lg border border-neutral-800 bg-black/60 p-2 flex items-center justify-center">
              {/* Circular Polar Coordinate Grid */}
              <svg className="size-48 overflow-visible" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2,2" />

                {/* VCG QRS Loop */}
                <path
                  d={vcgLoopPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z"}
                  fill="rgba(244, 63, 94, 0.15)"
                  stroke="#fb7185"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Center Vector Dot */}
                <circle cx="100" cy="100" r="3" fill="#f43f5e" />
              </svg>
            </div>
            <div className="mt-2 text-[10px] text-neutral-400 leading-tight">
              Derived Frank lead loop represents electrical spatial orientation of ventricular depolarization (QRS vector loop).
            </div>
          </div>

          {/* Tisdale QT Risk Score Card */}
          {report.tisdaleRisk && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200">Tisdale Long-QT Risk</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-mono font-bold",
                    report.tisdaleRisk.riskTier === "HIGH"
                      ? "bg-rose-500/30 text-rose-300 border border-rose-500/50"
                      : report.tisdaleRisk.riskTier === "MODERATE"
                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  )}
                >
                  Score: {report.tisdaleRisk.score} ({report.tisdaleRisk.riskTier})
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                {report.tisdaleRisk.clinicalGuidance}
              </p>
            </div>
          )}

          {/* AHA / ACC Clinical Guidance Notice */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-[11px] text-neutral-400 space-y-1">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <Info className="size-3 text-cyan-400" />
              Statutory Clinical Decision Support
            </span>
            <p>
              ECG findings and QTc estimates are computed per FDA Non-Device CDS guidelines (21 U.S.C. § 360j(o)(1)(E)). All ST elevations and arrhythmias must be confirmed by the attending emergency physician prior to percutaneous coronary intervention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
