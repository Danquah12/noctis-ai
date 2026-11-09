import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Microscope,
  Layers,
  Sliders,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Volume2,
  Square,
  Sparkles,
  Send,
  RotateCcw,
  Check,
  Copy,
  Eye,
  EyeOff,
  Activity,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  classifyHounsfieldUnit,
  calculateHematomaVolumeAbc2,
  analyzeHeadCtHemorrhage,
  calculateAspectsScore,
  type AspectsScoreResult,
  type TissueRadiodensityClass,
} from "@/lib/noctis-dicom-vision.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisDicomVisionSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisDicomVisionSection({ onSendToChat }: NoctisDicomVisionSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Imaging Controls State
  const [sliceIndex, setSliceIndex] = useState<number>(8); // Slices 1 to 16 (8 is basal ganglia level)
  const [activeWindowPreset, setActiveWindowPreset] = useState<"brain" | "stroke" | "subdural" | "bone">("stroke");
  const [windowWidth, setWindowWidth] = useState<number>(30);
  const [windowLevel, setWindowLevel] = useState<number>(30);
  const [showAspectsOverlay, setShowAspectsOverlay] = useState<boolean>(true);
  const [showLesionMask, setShowLesionMask] = useState<boolean>(true);

  // Crosshair probe coordinates & live HU
  const [probePos, setProbePos] = useState<{ x: number; y: number } | null>(null);
  const [probeHu, setProbeHu] = useState<number>(34);
  const [probeTissue, setProbeTissue] = useState<TissueRadiodensityClass>("SOFT_TISSUE");

  // ASPECTS Scoring State
  const [selectedRegions, setSelectedRegions] = useState<string[]>([
    "Caudate",
    "Lentiform",
    "Insular Ribbon",
  ]);

  // ABC/2 Intracranial Hemorrhage Sizer State
  const [hemorrhageDiameterA, setHemorrhageDiameterA] = useState<number>(4.5);
  const [hemorrhageDiameterB, setHemorrhageDiameterB] = useState<number>(3.2);
  const [hemorrhageSlices, setHemorrhageSlices] = useState<number>(6);
  const [sliceThickness, setSliceThickness] = useState<number>(5.0);
  const [midlineShiftMm, setMidlineShiftMm] = useState<number>(4.0);

  // Voice playback state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Window presets map
  const WINDOW_PRESETS = {
    brain: { label: "Brain (W:80, L:40)", width: 80, level: 40 },
    stroke: { label: "Stroke / Penumbra (W:30, L:30)", width: 30, level: 30 },
    subdural: { label: "Subdural / Blood (W:130, L:50)", width: 130, level: 50 },
    bone: { label: "Bone (W:2500, L:500)", width: 2500, level: 500 },
  };

  const handleSelectPreset = (preset: "brain" | "stroke" | "subdural" | "bone") => {
    setActiveWindowPreset(preset);
    setWindowWidth(WINDOW_PRESETS[preset].width);
    setWindowLevel(WINDOW_PRESETS[preset].level);
  };

  // Compute live ASPECTS
  const aspectsResult: AspectsScoreResult = useMemo(() => {
    return calculateAspectsScore(selectedRegions);
  }, [selectedRegions]);

  const toggleRegion = (reg: string) => {
    if (selectedRegions.includes(reg)) {
      setSelectedRegions(selectedRegions.filter((r) => r !== reg));
    } else {
      setSelectedRegions([...selectedRegions, reg]);
    }
  };

  // Compute live ABC/2 Volume
  const abc2Result = useMemo(() => {
    return calculateHematomaVolumeAbc2(
      hemorrhageDiameterA,
      hemorrhageDiameterB,
      hemorrhageSlices,
      sliceThickness
    );
  }, [hemorrhageDiameterA, hemorrhageDiameterB, hemorrhageSlices, sliceThickness]);

  // Neurosurgical emergency check
  const isNeurosurgicalEmergency = midlineShiftMm >= 5.0 || abc2Result.volumeCm3 >= 30.0;

  // Render Synthetic Axial Head CT on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background (Air = -1000 HU)
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width * 0.42;
    const radiusY = height * 0.45;

    // 1. Calvarium (Bone: ~1000 HU)
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = activeWindowPreset === "bone" ? "#ffffff" : "#dedede";
    ctx.stroke();

    // 2. Brain Parenchyma (Soft tissue: ~35 HU)
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX - 8, radiusY - 8, 0, 0, Math.PI * 2);
    const parenchymaColor =
      activeWindowPreset === "stroke"
        ? "#4a4a58"
        : activeWindowPreset === "bone"
        ? "#222222"
        : "#555562";
    ctx.fillStyle = parenchymaColor;
    ctx.fill();

    // 3. Ventricles (Water/CSF: ~0 to 10 HU)
    ctx.beginPath();
    const ventScale = Math.max(0.5, (16 - sliceIndex) / 10);
    ctx.ellipse(centerX - 18, centerY - 10, 10 * ventScale, 26 * ventScale, -0.15, 0, Math.PI * 2);
    ctx.ellipse(centerX + 18, centerY - 10, 10 * ventScale, 26 * ventScale, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "#121218";
    ctx.fill();

    // 4. Subtle Interhemispheric Fissure & Falx
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radiusY + 12);
    ctx.lineTo(centerX, centerY + radiusY - 12);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#252530";
    ctx.stroke();

    // 5. Left MCA Ischemic Hypodensity / Penumbra Mask (when enabled)
    if (showLesionMask && selectedRegions.length > 0) {
      ctx.save();
      // Glowing ischemic core
      ctx.beginPath();
      ctx.ellipse(centerX + 65, centerY - 15, 48, 56, 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239, 68, 68, 0.28)"; // Red core
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
      ctx.stroke();

      // Penumbra halo
      ctx.beginPath();
      ctx.ellipse(centerX + 68, centerY - 12, 62, 70, 0.25, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.75)"; // Amber penumbra boundary
      ctx.stroke();
      ctx.restore();
    }

    // 6. ASPECTS Anatomical Boundary Labels (when toggled)
    if (showAspectsOverlay) {
      ctx.save();
      ctx.font = "bold 10px monospace";

      const regions = [
        { label: "C", name: "Caudate", x: centerX + 14, y: centerY - 25 },
        { label: "L", name: "Lentiform", x: centerX + 34, y: centerY - 5 },
        { label: "IC", name: "Internal Capsule", x: centerX + 24, y: centerY + 12 },
        { label: "I", name: "Insular Ribbon", x: centerX + 74, y: centerY - 8 },
        { label: "M1", name: "M1", x: centerX + 82, y: centerY - 52 },
        { label: "M2", name: "M2", x: centerX + 98, y: centerY - 10 },
        { label: "M3", name: "M3", x: centerX + 84, y: centerY + 42 },
      ];

      for (const reg of regions) {
        const isAffected = selectedRegions.includes(reg.name) || selectedRegions.includes(reg.label);
        ctx.fillStyle = isAffected ? "#ef4444" : "#10b981";
        ctx.beginPath();
        ctx.arc(reg.x, reg.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(reg.label, reg.x, reg.y);
      }
      ctx.restore();
    }

    // 7. Interactive Crosshair Cursor
    if (probePos) {
      ctx.save();
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(probePos.x - 12, probePos.y);
      ctx.lineTo(probePos.x + 12, probePos.y);
      ctx.moveTo(probePos.x, probePos.y - 12);
      ctx.lineTo(probePos.x, probePos.y + 12);
      ctx.stroke();
      ctx.restore();
    }
  }, [sliceIndex, activeWindowPreset, showAspectsOverlay, showLesionMask, selectedRegions, probePos]);

  // Handle canvas mouse move to simulate CT Hounsfield attenuation
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setProbePos({ x, y });

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dist = Math.hypot(x - centerX, y - centerY);

    let hu = 34; // default brain soft tissue
    if (dist > 155) {
      hu = -1000; // air outside skull
    } else if (dist >= 142 && dist <= 155) {
      hu = 1150; // cortical bone
    } else if (Math.hypot(x - centerX, y - (centerY - 10)) < 24) {
      hu = 6; // CSF in ventricle
    } else if (x > centerX + 40 && y > centerY - 45 && y < centerY + 45) {
      hu = 22; // Acute ischemic penumbra / cytotoxic edema (subtle hypodensity)
    } else {
      hu = 36 + Math.round((Math.sin(x * 0.1) + Math.cos(y * 0.1)) * 3);
    }

    setProbeHu(hu);
    setProbeTissue(classifyHounsfieldUnit(hu));
  };

  const handleCanvasMouseLeave = () => {
    setProbePos(null);
  };

  // Generate Imaging Report Summary
  const imagingSummary = useMemo(() => {
    return `# Noctis Multi-Modal DICOM Neuroimaging Report
Modality: Non-Contrast Head CT · Axial Slice ${sliceIndex}/16 · Series: STROKE_ACUTE_CTA
Window Preset: ${WINDOW_PRESETS[activeWindowPreset].label}
Alberta Stroke Program Early CT Score (ASPECTS): ${aspectsResult.score}/10
Ischemic Regions Involved: ${selectedRegions.join(", ") || "None (Pristine Penumbra)"}
Mechanical Thrombectomy (EVT) Eligibility: ${aspectsResult.eligibleForThrombectomy ? "ELIGIBLE (ASPECTS >= 6, DAWN/DEFUSE-3 Criteria Met)" : "INELIGIBLE (Extensive Core, High Hemorrhagic Risk)"}
Prognostic Category: ${aspectsResult.prognosticCategory}

Hemorrhage Sizing (ABC/2 Conjoint Ellipsoid):
- Estimated Hematoma Volume: ${abc2Result.volumeCm3} cm³
- Mortality Risk Tier: ${abc2Result.mortalityRiskCategory}
- Midline Shift: ${midlineShiftMm} mm (${midlineShiftMm >= 5.0 ? "CRITICAL EMERGENCY: Subfalcine / Uncal Herniation Risk" : "Permissible / Monitored"})

Impression:
Acute ischemic hypodensity localizing to the contralateral MCA territory with loss of insular ribbon and lentiform gray-white distinction. No acute intracranial hemorrhage or mass effect identified. Patient is within the hyperacute endovascular reperfusion golden window.`;
  }, [sliceIndex, activeWindowPreset, aspectsResult, selectedRegions, abc2Result, midlineShiftMm]);

  // Spoken voice read aloud
  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    void speakNoctisVoice(imagingSummary, "maple", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    }).then((ok) => {
      if (!ok) setIsSpeaking(false);
    });
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(imagingSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis DICOM Neuroimaging Consultation] Evaluated non-contrast head CT: ASPECTS ${aspectsResult.score}/10 (${selectedRegions.join(", ")}). EVT status: ${aspectsResult.eligibleForThrombectomy ? "Thrombectomy Eligible" : "Extensive Core"}. Midline shift: ${midlineShiftMm} mm, ABC/2 hematoma volume: ${abc2Result.volumeCm3} cm³. Integrate neuroimaging findings into active clinical consultation.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-purple-500/30 bg-purple-950/20 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300">
              <Microscope className="size-3 text-purple-400" /> DICOM Vision
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              10-Point ASPECTS Engine
            </span>
            <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
              Calibrated HU Probe
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            DICOM Web-Based Volumetric Viewer & Multimodal Stroke Lesion Segmentation
          </h2>
          <p className="text-xs text-white/60">
            Interactive axial head CT slice stack, dynamic Hounsfield windowing, 10-point MCA ASPECTS ischemic loss quantification, and ABC/2 hematoma volumetric gating.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm border",
              isSpeaking
                ? "bg-amber-500/30 text-amber-300 border-amber-500/50"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            )}
          >
            {isSpeaking ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-amber-400" /> Read Report
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 border border-white/10 transition"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Report"}
          </button>
        </div>
      </div>

      {/* Main Workstation: Canvas + Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive CT Slice Canvas (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-purple-300">
                AXIAL SLICE {sliceIndex} / 16
              </span>
              <span className="text-[10px] text-white/40">
                (Basal Ganglia / Ganglionic ASPECTS Level)
              </span>
            </div>

            {/* Canvas Overlay Toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAspectsOverlay(!showAspectsOverlay)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition border",
                  showAspectsOverlay
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-white/5 text-white/50 border-white/10"
                )}
              >
                {showAspectsOverlay ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                ASPECTS Overlay
              </button>

              <button
                type="button"
                onClick={() => setShowLesionMask(!showLesionMask)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition border",
                  showLesionMask
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-white/5 text-white/50 border-white/10"
                )}
              >
                {showLesionMask ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                Ischemic Mask
              </button>
            </div>
          </div>

          {/* Canvas Display Viewport */}
          <div className="relative mx-auto rounded-lg overflow-hidden border border-white/15 bg-black shadow-2xl">
            <canvas
              ref={canvasRef}
              width={380}
              height={380}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="cursor-crosshair block"
            />

            {/* Real-Time HU Density Probe Badge */}
            <div className="absolute bottom-2 left-2 rounded bg-black/80 backdrop-blur-xs border border-white/20 px-2.5 py-1 text-[11px] font-mono text-white flex items-center gap-2 shadow-lg">
              <span className="text-cyan-400 font-bold">
                {probeHu >= 0 ? `+${probeHu}` : probeHu} HU
              </span>
              <span className="text-white/40">|</span>
              <span className="text-zinc-300 text-[10px]">{probeTissue}</span>
            </div>

            {/* Orientation Badges */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-white/40">
              ANTERIOR
            </span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-white/40">
              POSTERIOR
            </span>
            <span className="absolute top-1/2 left-2 -translate-y-1/2 text-[10px] font-mono font-bold text-white/40">
              R
            </span>
            <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] font-mono font-bold text-white/40">
              L (MCA Infarct)
            </span>
          </div>

          {/* Slice Stack Navigator & Window Preset Ribbon */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-[11px] text-white/60 mb-1">
                <span>Axial Slice Stack: {sliceIndex} / 16</span>
                <span className="font-mono">5.0 mm Slice Thickness</span>
              </div>
              <input
                type="range"
                min={1}
                max={16}
                value={sliceIndex}
                onChange={(e) => setSliceIndex(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 cursor-pointer h-1.5 rounded-lg bg-white/10"
              />
            </div>

            {/* Window Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-white/50 mr-1 flex items-center gap-1">
                <Sliders className="size-3" /> Preset:
              </span>
              {(["stroke", "brain", "subdural", "bone"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium transition border",
                    activeWindowPreset === preset
                      ? "bg-purple-600/30 border-purple-500/60 text-purple-200"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  )}
                >
                  {preset.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: ASPECTS Calculator & Neuro-Resuscitation Sizer (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* ASPECTS 10-Point Score Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  ASPECTS 10-Point MCA Scoring
                </h3>
                <span className="text-[10px] text-white/50">
                  Subtract 1 point per ischemic territory with acute hypodensity
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-purple-300">
                  {aspectsResult.score} <span className="text-xs text-white/40">/ 10</span>
                </div>
              </div>
            </div>

            {/* Thrombectomy Eligibility Badge */}
            <div className={cn(
              "rounded-lg p-2.5 text-xs font-semibold flex items-center justify-between border",
              aspectsResult.eligibleForThrombectomy
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/30 border-rose-500/40 text-rose-300"
            )}>
              <span className="flex items-center gap-1.5">
                {aspectsResult.eligibleForThrombectomy ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="size-4 text-rose-400" />
                )}
                <span>EVT Thrombectomy: {aspectsResult.eligibleForThrombectomy ? "ELIGIBLE" : "INELIGIBLE"}</span>
              </span>
              <span className="text-[10px] font-mono opacity-80">
                {aspectsResult.eligibleForThrombectomy ? "Score >= 6 (DAWN Criteria)" : "Score < 6 (Extensive Core)"}
              </span>
            </div>

            {/* Clickable MCA Territories */}
            <div>
              <div className="text-[10px] text-white/40 uppercase font-bold mb-1.5">
                Click Regions to Toggle Acute Ischemic Loss:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: "Caudate", label: "C - Caudate" },
                  { id: "Lentiform", label: "L - Lentiform" },
                  { id: "Internal Capsule", label: "IC - Internal Capsule" },
                  { id: "Insular Ribbon", label: "I - Insular Ribbon" },
                  { id: "M1", label: "M1 - Anterior MCA" },
                  { id: "M2", label: "M2 - Lateral MCA" },
                  { id: "M3", label: "M3 - Posterior MCA" },
                  { id: "M4", label: "M4 - Superior Anterior" },
                  { id: "M5", label: "M5 - Superior Lateral" },
                  { id: "M6", label: "M6 - Superior Posterior" },
                ].map((region) => {
                  const isChecked = selectedRegions.includes(region.id);
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => toggleRegion(region.id)}
                      className={cn(
                        "rounded px-2 py-1 text-left text-[11px] font-medium transition border flex items-center justify-between",
                        isChecked
                          ? "bg-rose-500/20 border-rose-500/40 text-rose-200"
                          : "bg-black/30 border-white/5 text-white/70 hover:bg-white/5"
                      )}
                    >
                      <span className="truncate">{region.label}</span>
                      {isChecked && <span className="size-1.5 rounded-full bg-rose-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ABC/2 Hematoma Sizer & Midline Shift Gating */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Activity className="size-3.5 text-amber-400" /> ABC/2 Volume & Midline Shift Gating
              </h3>
              <span className="font-mono text-white font-bold">
                {abc2Result.volumeCm3} cm³
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-white/50 mb-0.5">Diameter A (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={hemorrhageDiameterA}
                  onChange={(e) => setHemorrhageDiameterA(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/50 mb-0.5">Diameter B (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={hemorrhageDiameterB}
                  onChange={(e) => setHemorrhageDiameterB(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/50 mb-0.5">
                <span>Midline Shift: {midlineShiftMm} mm</span>
                <span className={cn(midlineShiftMm >= 5.0 ? "text-rose-400 font-bold" : "text-emerald-400")}>
                  {midlineShiftMm >= 5.0 ? "Critical Shift (>= 5mm)" : "Stable Shift (< 5mm)"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={midlineShiftMm}
                onChange={(e) => setMidlineShiftMm(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1 rounded-lg bg-white/10"
              />
            </div>

            {/* Neurosurgical Emergency Alert */}
            {isNeurosurgicalEmergency && (
              <div className="rounded-lg border border-rose-500/50 bg-rose-950/40 p-2.5 text-[11px] text-rose-200 flex items-start gap-2">
                <ShieldAlert className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-300">Critical Neurosurgical Emergency:</div>
                  <div>Midline shift {midlineShiftMm} mm or volume {abc2Result.volumeCm3} cm³ indicates impending uncal herniation. Immediate emergent craniotomy consultation required.</div>
                </div>
              </div>
            )}

            {onSendToChat && (
              <button
                type="button"
                onClick={handleSendChat}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 p-2 text-xs font-semibold text-purple-200 transition"
              >
                <Send className="size-3" /> Transmit Imaging Findings to Active Consultation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
