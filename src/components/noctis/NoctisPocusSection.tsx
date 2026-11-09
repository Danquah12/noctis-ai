import React, { useState, useMemo } from "react";
import {
  Scan,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Square,
  Sparkles,
  Send,
  Check,
  RotateCcw,
  Activity,
  Droplets,
  Zap,
  Sliders,
  ArrowRight,
  Info,
  Waves,
  Heart,
  Wind,
  AlertOctagon,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  evaluatePocusResuscitation,
  formatPocusSpokenSummary,
  POCUS_PRESET_TENSION_PTX,
  POCUS_PRESET_TAMPONADE,
  POCUS_PRESET_RUPTURED_AAA,
  POCUS_PRESET_CARDIOGENIC_OVERLOAD,
  type PocusExaminationProfile,
  type PocusEvaluationReport,
  type BlueLungProfile,
} from "@/lib/noctis-pocus-resuscitation.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisPocusSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisPocusSection({ onSendToChat }: NoctisPocusSectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("tension_ptx");

  // Patient parameters
  const [patientId, setPatientId] = useState<string>(POCUS_PRESET_TENSION_PTX.patientId);
  const [patientName, setPatientName] = useState<string>(POCUS_PRESET_TENSION_PTX.patientName);
  const [clinicalPresentation, setClinicalPresentation] = useState<PocusExaminationProfile["clinicalPresentation"]>(
    POCUS_PRESET_TENSION_PTX.clinicalPresentation
  );
  const [systolicBp, setSystolicBp] = useState<number>(POCUS_PRESET_TENSION_PTX.systolicBp);
  const [heartRateBpm, setHeartRateBpm] = useState<number>(POCUS_PRESET_TENSION_PTX.heartRateBpm);

  // E-FAST Findings
  const [morisonsFreeFluid, setMorisonsFreeFluid] = useState<boolean>(POCUS_PRESET_TENSION_PTX.morisonsPouchFreeFluid);
  const [splenorenalFreeFluid, setSplenorenalFreeFluid] = useState<boolean>(POCUS_PRESET_TENSION_PTX.splenorenalFreeFluid);
  const [suprapubicFreeFluid, setSuprapubicFreeFluid] = useState<boolean>(POCUS_PRESET_TENSION_PTX.suprapubicFreeFluid);
  const [pericardialEffusion, setPericardialEffusion] = useState<boolean>(POCUS_PRESET_TENSION_PTX.pericardialEffusion);
  const [rightLungSliding, setRightLungSliding] = useState<boolean>(POCUS_PRESET_TENSION_PTX.rightLungSlidingPresent);
  const [leftLungSliding, setLeftLungSliding] = useState<boolean>(POCUS_PRESET_TENSION_PTX.leftLungSlidingPresent);
  const [lungPoint, setLungPoint] = useState<boolean>(POCUS_PRESET_TENSION_PTX.lungPointIdentified);
  const [hemothorax, setHemothorax] = useState<boolean>(POCUS_PRESET_TENSION_PTX.hemothoraxIdentified);

  // RUSH Findings (Pump / Tank / Pipes)
  const [lvContractility, setLvContractility] = useState<PocusExaminationProfile["lvContractility"]>(
    POCUS_PRESET_TENSION_PTX.lvContractility
  );
  const [rvDiastolicCollapse, setRvDiastolicCollapse] = useState<boolean>(POCUS_PRESET_TENSION_PTX.rvDiastolicCollapse);
  const [ivcDiameterCm, setIvcDiameterCm] = useState<number>(POCUS_PRESET_TENSION_PTX.ivcDiameterCm);
  const [ivcCollapsibilityPercent, setIvcCollapsibilityPercent] = useState<number>(
    POCUS_PRESET_TENSION_PTX.ivcCollapsibilityPercent
  );
  const [aortaDiameterCm, setAortaDiameterCm] = useState<number>(POCUS_PRESET_TENSION_PTX.aortaMaxDiameterCm);
  const [dvtPositive, setDvtPositive] = useState<boolean>(POCUS_PRESET_TENSION_PTX.dvtCompressionPositive);

  // Proposed Intervention (Probe Gate)
  const [proposedIntervention, setProposedIntervention] = useState<PocusExaminationProfile["proposedIntervention"]>(
    POCUS_PRESET_TENSION_PTX.proposedIntervention
  );

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live POCUS Evaluation Report
  const report = useMemo<PocusEvaluationReport>(() => {
    return evaluatePocusResuscitation({
      patientId,
      patientName,
      clinicalPresentation,
      systolicBp,
      heartRateBpm,
      morisonsPouchFreeFluid: morisonsFreeFluid,
      splenorenalFreeFluid,
      suprapubicFreeFluid,
      pericardialEffusion,
      rightLungSlidingPresent: rightLungSliding,
      leftLungSlidingPresent: leftLungSliding,
      lungPointIdentified: lungPoint,
      hemothoraxIdentified: hemothorax,
      lvContractility,
      rvDiastolicCollapse,
      ivcDiameterCm,
      ivcCollapsibilityPercent,
      aortaMaxDiameterCm: aortaDiameterCm,
      dvtCompressionPositive: dvtPositive,
      proposedIntervention,
    });
  }, [
    patientId,
    patientName,
    clinicalPresentation,
    systolicBp,
    heartRateBpm,
    morisonsFreeFluid,
    splenorenalFreeFluid,
    suprapubicFreeFluid,
    pericardialEffusion,
    rightLungSliding,
    leftLungSliding,
    lungPoint,
    hemothorax,
    lvContractility,
    rvDiastolicCollapse,
    ivcDiameterCm,
    ivcCollapsibilityPercent,
    aortaDiameterCm,
    dvtPositive,
    proposedIntervention,
  ]);

  // Handle Preset Load
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    let p: PocusExaminationProfile;
    if (key === "tension_ptx") p = POCUS_PRESET_TENSION_PTX;
    else if (key === "tamponade") p = POCUS_PRESET_TAMPONADE;
    else if (key === "aaa") p = POCUS_PRESET_RUPTURED_AAA;
    else p = POCUS_PRESET_CARDIOGENIC_OVERLOAD;

    setPatientId(p.patientId);
    setPatientName(p.patientName);
    setClinicalPresentation(p.clinicalPresentation);
    setSystolicBp(p.systolicBp);
    setHeartRateBpm(p.heartRateBpm);
    setMorisonsFreeFluid(p.morisonsPouchFreeFluid);
    setSplenorenalFreeFluid(p.splenorenalFreeFluid);
    setSuprapubicFreeFluid(p.suprapubicFreeFluid);
    setPericardialEffusion(p.pericardialEffusion);
    setRightLungSliding(p.rightLungSlidingPresent);
    setLeftLungSliding(p.leftLungSlidingPresent);
    setLungPoint(p.lungPointIdentified);
    setHemothorax(p.hemothoraxIdentified);
    setLvContractility(p.lvContractility);
    setRvDiastolicCollapse(p.rvDiastolicCollapse);
    setIvcDiameterCm(p.ivcDiameterCm);
    setIvcCollapsibilityPercent(p.ivcCollapsibilityPercent);
    setAortaDiameterCm(p.aortaMaxDiameterCm);
    setDvtPositive(p.dvtCompressionPositive);
    setProposedIntervention(p.proposedIntervention);
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatPocusSpokenSummary(report);
    setIsSpeaking(true);
    const ok = await speakNoctisVoice(script, "alloy", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
    if (!ok) {
      setIsSpeaking(false);
    }
  };

  // Send to Sovereign Chat
  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis POCUS Resuscitation Assessment - ${report.patientName}] Shock Etiology: ${report.shockEtiologyLikelihood}. BLUE Profile: ${report.blueProfileClassification}. IVC Status: ${report.ivcVolumeStatus}. E-FAST: Abdominal Free Fluid: ${report.eFastSummary.freeFluidAbdomen ? "POSITIVE" : "NEGATIVE"}, Pneumothorax: ${report.eFastSummary.pneumothoraxDetected ? "DETECTED" : "NONE"}, Pericardial Tamponade: ${report.eFastSummary.pericardialTamponadeSigns ? "PRESENT" : "ABSENT"}. Tripped Invariants: ${report.trippedInvariants.join(", ") || "None"}. Mandated Actions: ${report.mandatoryActions.join(" | ") || "Proceed with standard targeted therapy."}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-blue-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-sky-500/20 px-2 py-0.5 text-xs font-semibold text-sky-300 border border-sky-500/40">
              <Scan className="h-3.5 w-3.5" />
              TRACK 22 ENGINE
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/40">
              E-FAST Trauma Protocol
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/40">
              BLUE Dyspnea Algorithm
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-300 border border-teal-500/40">
              RUSH Shock (Pump/Tank/Pipes)
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Point-of-Care Ultrasound (POCUS) & Resuscitation Engine
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-compensatory safety invariant gates: Tension pneumothorax decompression veto, tamponade pericardiocentesis veto, ruptured AAA direct OR transfer veto, and cardiogenic fluid overload harm veto.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleVoice}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-md",
              isSpeaking
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30"
            )}
          >
            {isSpeaking ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop Voice
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                Read Full Guidance
              </>
            )}
          </button>

          {onSendToChat && (
            <button
              onClick={handleSendChat}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/40 text-sky-200 border border-sky-500/50 px-3 py-1.5 text-xs font-medium transition-colors shadow-md"
            >
              <Send className="h-3.5 w-3.5" />
              Send to Sovereign Chat
            </button>
          )}
        </div>
      </div>

      {/* Preset Selector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-sky-400" />
            Curated Emergency POCUS Resuscitation Presets
          </span>
          <span className="text-[11px] text-zinc-500">Live Invariant Probing</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            onClick={() => handleLoadPreset("tension_ptx")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "tension_ptx"
                ? "bg-sky-950/40 border-sky-500/60 text-sky-200 shadow-md ring-1 ring-sky-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Marcus Brody (24yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-POCUS-001
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Trauma Shock: Absent Right Lung Sliding + BP 74/40</div>
          </button>

          <button
            onClick={() => handleLoadPreset("tamponade")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "tamponade"
                ? "bg-sky-950/40 border-sky-500/60 text-sky-200 shadow-md ring-1 ring-sky-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Angela Morris (58yo F)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-POCUS-002
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Cardiac Tamponade: Diastolic RV Collapse + Plethoric IVC</div>
          </button>

          <button
            onClick={() => handleLoadPreset("aaa")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "aaa"
                ? "bg-sky-950/40 border-sky-500/60 text-sky-200 shadow-md ring-1 ring-sky-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Gerald Thomas (71yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-POCUS-003
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Ruptured AAA (6.8 cm) + Shock: Skip CT, Direct to OR</div>
          </button>

          <button
            onClick={() => handleLoadPreset("cardiogenic")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "cardiogenic"
                ? "bg-sky-950/40 border-sky-500/60 text-sky-200 shadow-md ring-1 ring-sky-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Arthur King (66yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CF-POCUS-004
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Cardiogenic Shock: Fluid Bolus Harm Veto with Confluent B-Lines</div>
          </button>
        </div>
      </div>

      {/* Non-Compensatory Safety Invariant Veto Banners */}
      {report.trippedInvariants.length > 0 && (
        <div className="space-y-3">
          {report.mandatoryActions.map((action, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-rose-500/60 bg-rose-950/30 p-4 shadow-lg flex items-start gap-3 animate-in fade-in duration-300"
            >
              <AlertOctagon className="h-6 w-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded border border-rose-500/40">
                    NON-COMPENSATORY SAFETY INVARIANT VETO
                  </span>
                  <span className="text-xs font-semibold text-rose-300">
                    Gate: {report.trippedInvariants[idx] || "CF-POCUS"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100 font-medium">{action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diagnostic Synthesis Cards: Shock Etiology & BLUE Profile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Ultrasound Shock Etiology
          </span>
          <div className="text-sm font-bold text-sky-300 font-mono">
            {report.shockEtiologyLikelihood.replace(/_/g, " ")}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Synthesized from RUSH pump contractility, IVC collapsibility, and free fluid.
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            BLUE Protocol Dyspnea Profile
          </span>
          <div className="text-sm font-bold text-teal-300 font-mono">
            {report.blueProfileClassification.replace(/_/g, " ")}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Alveolar-interstitial vs pneumothorax lung sliding algorithm.
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            IVC Volume & Preload Status
          </span>
          <div className="text-sm font-bold text-indigo-300 font-mono">
            {report.ivcVolumeStatus.replace(/_/g, " ")}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Diameter: {ivcDiameterCm} cm | Collapsibility: {ivcCollapsibilityPercent}%
          </div>
        </div>
      </div>

      {/* Grid: E-FAST Anatomical Zones vs RUSH Protocol (Pump/Tank/Pipes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* E-FAST Multi-Zone Anatomical Board */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scan className="h-3.5 w-3.5 text-sky-400" />
              E-FAST Multi-Zone Trauma Examination
            </span>
            <span
              className={cn(
                "text-[11px] font-bold px-2 py-0.5 rounded",
                report.eFastSummary.freeFluidAbdomen || report.eFastSummary.pneumothoraxDetected
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              )}
            >
              {report.eFastSummary.freeFluidAbdomen || report.eFastSummary.pneumothoraxDetected ? "POSITIVE FAST" : "NEGATIVE FAST"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={morisonsFreeFluid}
                onChange={(e) => setMorisonsFreeFluid(e.target.checked)}
                className="rounded border-zinc-700 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-white">RUQ (Morison's Pouch)</div>
                <div className="text-[10px] text-zinc-400">Hepatorenal free fluid</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={splenorenalFreeFluid}
                onChange={(e) => setSplenorenalFreeFluid(e.target.checked)}
                className="rounded border-zinc-700 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-white">LUQ (Splenorenal)</div>
                <div className="text-[10px] text-zinc-400">Perisplenic free fluid</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={suprapubicFreeFluid}
                onChange={(e) => setSuprapubicFreeFluid(e.target.checked)}
                className="rounded border-zinc-700 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-white">Pelvic (Suprapubic)</div>
                <div className="text-[10px] text-zinc-400">Rectovesical / Douglas</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={pericardialEffusion}
                onChange={(e) => setPericardialEffusion(e.target.checked)}
                className="rounded border-zinc-700 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-white">Pericardium (Subxiphoid)</div>
                <div className="text-[10px] text-zinc-400">Anechoic fluid stripe</div>
              </div>
            </label>
          </div>

          {/* Thoracic Lung Sliding Examination */}
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Thoracic Pleural Sliding & Pneumothorax Interrogation
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rightLungSliding}
                  onChange={(e) => setRightLungSliding(e.target.checked)}
                  className="rounded border-zinc-700 text-sky-600 focus:ring-sky-500"
                />
                <span>Right Lung Sliding Present</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={leftLungSliding}
                  onChange={(e) => setLeftLungSliding(e.target.checked)}
                  className="rounded border-zinc-700 text-sky-600 focus:ring-sky-500"
                />
                <span>Left Lung Sliding Present</span>
              </label>
            </div>
          </div>
        </div>

        {/* RUSH Protocol: Pump, Tank, Pipes Dashboard */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              RUSH Protocol (The Pump, The Tank, The Pipes)
            </span>
            <span className="text-[11px] font-mono text-zinc-400">BP: {systolicBp} mmHg</span>
          </div>

          <div className="space-y-3">
            {/* The Pump */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                The Pump: LV Systolic Contractility
              </label>
              <select
                value={lvContractility}
                onChange={(e) => setLvContractility(e.target.value as any)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="HYPERDYNAMIC">Hyperdynamic (Septic / Hypovolemic Shock)</option>
                <option value="NORMAL">Normal Contractility</option>
                <option value="MODERATELY_DEPRESSED">Moderately Depressed</option>
                <option value="SEVERELY_DEPRESSED">Severely Depressed (Cardiogenic Shock / EF &lt; 20%)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rvDiastolicCollapse}
                  onChange={(e) => setRvDiastolicCollapse(e.target.checked)}
                  className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500"
                />
                <span>Early Diastolic RV Free-Wall Collapse (Cardiac Tamponade Hallmark)</span>
              </label>
            </div>

            {/* The Tank */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">IVC Diameter (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0.5}
                  max={4.0}
                  value={ivcDiameterCm}
                  onChange={(e) => setIvcDiameterCm(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">IVC Collapsibility (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={ivcCollapsibilityPercent}
                  onChange={(e) => setIvcCollapsibilityPercent(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* The Pipes */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Aorta Max Diameter (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1.0}
                  max={12.0}
                  value={aortaDiameterCm}
                  onChange={(e) => setAortaDiameterCm(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&ge; 5.0 cm = Emergent Rupture Risk</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Proposed Clinical Action</label>
                <select
                  value={proposedIntervention}
                  onChange={(e) => setProposedIntervention(e.target.value as any)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="SEND_TO_CT_SCAN">Send Unstable Patient to CT Scan (Fatal Delay Probe)</option>
                  <option value="FLUID_BOLUS_1000ML">1000 mL IV Fluid Bolus (Overload Probe)</option>
                  <option value="EMERGENT_DECOMPRESSION">Immediate Needle/Finger Thoracostomy</option>
                  <option value="PERICARDIOCENTESIS">Ultrasound-Guided Pericardiocentesis</option>
                  <option value="INOTROPES_DOBUTAMINE">Inotropic Support (Dobutamine / Norepinephrine)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Guidance Footnote */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <Info className="h-4 w-4 text-sky-400" />
          Evidence-Based POCUS Resuscitation Principles (FDA Non-Device CDS)
        </div>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">1. Prohibiting CT in Obstructive Shock:</strong> Tension pneumothorax, cardiac tamponade, and ruptured abdominal aortic aneurysms with hemodynamic instability are clinical and ultrasound diagnoses. Moving a hemodynamically collapsed patient into a CT scanner leads to rapid in-transit cardiac arrest. Immediate bedside intervention (decompression, pericardiocentesis, or emergent OR transfer) is non-negotiable.
        </p>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">2. M-Mode Lung Sliding:</strong> In normal lungs, the visceral and parietal pleura slide against each other producing granular artifacts ("seashore sign"). In pneumothorax, intrapleural air separates the two layers, abolishing sliding and creating rigid horizontal lines ("barcode / stratosphere sign"). The junction between normal sliding and pneumothorax is the "lung point", which has 100% specificity for pneumothorax.
        </p>
      </div>
    </div>
  );
}
