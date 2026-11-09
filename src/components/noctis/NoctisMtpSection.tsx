import React, { useState, useMemo } from "react";
import {
  Droplet,
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
  Clock,
  CheckCircle2,
  AlertOctagon,
  Thermometer,
  Layers,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  interpretViscoelasticTeg,
  evaluateMassiveTransfusion,
  formatMtpSpokenSummary,
  MTP_PRESET_LETHAL_TRIAD,
  MTP_PRESET_DELAYED_TXA,
  type MtpPatientProfile,
  type MtpEvaluationReport,
} from "@/lib/noctis-massive-transfusion.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisMtpSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisMtpSection({ onSendToChat }: NoctisMtpSectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("lethal_triad");

  // Patient parameters
  const [patientId, setPatientId] = useState<string>(MTP_PRESET_LETHAL_TRIAD.patientId);
  const [patientName, setPatientName] = useState<string>(MTP_PRESET_LETHAL_TRIAD.patientName);
  const [hoursSinceInjury, setHoursSinceInjury] = useState<number>(MTP_PRESET_LETHAL_TRIAD.hoursSinceInjury);
  const [systolicBp, setSystolicBp] = useState<number>(MTP_PRESET_LETHAL_TRIAD.systolicBp);
  const [heartRateBpm, setHeartRateBpm] = useState<number>(MTP_PRESET_LETHAL_TRIAD.heartRateBpm);
  const [coreTemp, setCoreTemp] = useState<number>(MTP_PRESET_LETHAL_TRIAD.coreTemperatureCelsius);
  const [arterialPh, setArterialPh] = useState<number>(MTP_PRESET_LETHAL_TRIAD.arterialPh);
  const [baseDeficit, setBaseDeficit] = useState<number>(MTP_PRESET_LETHAL_TRIAD.baseDeficitMeqPerL);
  const [ionizedCalcium, setIonizedCalcium] = useState<number>(MTP_PRESET_LETHAL_TRIAD.ionizedCalciumMmolPerL);
  const [serumFibrinogen, setSerumFibrinogen] = useState<number>(MTP_PRESET_LETHAL_TRIAD.serumFibrinogenMgPerDl);
  const [platelets, setPlatelets] = useState<number>(MTP_PRESET_LETHAL_TRIAD.plateletCountKPerUl);

  // Transfused Products
  const [crystalloidMl, setCrystalloidMl] = useState<number>(MTP_PRESET_LETHAL_TRIAD.crystalloidInfusedMl);
  const [prbcUnits, setPrbcUnits] = useState<number>(MTP_PRESET_LETHAL_TRIAD.prbcUnitsTransfused);
  const [ffpUnits, setFfpUnits] = useState<number>(MTP_PRESET_LETHAL_TRIAD.ffpUnitsTransfused);
  const [plateletUnits, setPlateletUnits] = useState<number>(MTP_PRESET_LETHAL_TRIAD.plateletUnitsTransfused);
  const [calciumGrams, setCalciumGrams] = useState<number>(MTP_PRESET_LETHAL_TRIAD.calciumChlorideGramsGiven);

  // TEG Parameters
  const [tegRTime, setTegRTime] = useState<number>(MTP_PRESET_LETHAL_TRIAD.tegRTimeMin || 14.5);
  const [tegAlpha, setTegAlpha] = useState<number>(MTP_PRESET_LETHAL_TRIAD.tegAlphaAngleDeg || 42);
  const [tegMa, setTegMa] = useState<number>(MTP_PRESET_LETHAL_TRIAD.tegMaxAmplitudeMm || 38);
  const [tegLy30, setTegLy30] = useState<number>(MTP_PRESET_LETHAL_TRIAD.tegLy30Percent || 7.8);

  // Proposed Orders
  const [proposedOrders, setProposedOrders] = useState<MtpPatientProfile["proposedOrders"]>(
    MTP_PRESET_LETHAL_TRIAD.proposedOrders
  );

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live MTP Evaluation Report
  const report = useMemo<MtpEvaluationReport>(() => {
    return evaluateMassiveTransfusion({
      patientId,
      patientName,
      hoursSinceInjury,
      systolicBp,
      heartRateBpm,
      coreTemperatureCelsius: coreTemp,
      arterialPh,
      baseDeficitMeqPerL: baseDeficit,
      ionizedCalciumMmolPerL: ionizedCalcium,
      serumFibrinogenMgPerDl: serumFibrinogen,
      plateletCountKPerUl: platelets,
      crystalloidInfusedMl: crystalloidMl,
      prbcUnitsTransfused: prbcUnits,
      ffpUnitsTransfused: ffpUnits,
      plateletUnitsTransfused: plateletUnits,
      calciumChlorideGramsGiven: calciumGrams,
      tegRTimeMin: tegRTime,
      tegAlphaAngleDeg: tegAlpha,
      tegMaxAmplitudeMm: tegMa,
      tegLy30Percent: tegLy30,
      proposedOrders,
    });
  }, [
    patientId,
    patientName,
    hoursSinceInjury,
    systolicBp,
    heartRateBpm,
    coreTemp,
    arterialPh,
    baseDeficit,
    ionizedCalcium,
    serumFibrinogen,
    platelets,
    crystalloidMl,
    prbcUnits,
    ffpUnits,
    plateletUnits,
    calciumGrams,
    tegRTime,
    tegAlpha,
    tegMa,
    tegLy30,
    proposedOrders,
  ]);

  // Handle Preset Load
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    if (key === "lethal_triad") {
      const p = MTP_PRESET_LETHAL_TRIAD;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setHoursSinceInjury(p.hoursSinceInjury);
      setSystolicBp(p.systolicBp);
      setHeartRateBpm(p.heartRateBpm);
      setCoreTemp(p.coreTemperatureCelsius);
      setArterialPh(p.arterialPh);
      setBaseDeficit(p.baseDeficitMeqPerL);
      setIonizedCalcium(p.ionizedCalciumMmolPerL);
      setSerumFibrinogen(p.serumFibrinogenMgPerDl);
      setPlatelets(p.plateletCountKPerUl);
      setCrystalloidMl(p.crystalloidInfusedMl);
      setPrbcUnits(p.prbcUnitsTransfused);
      setFfpUnits(p.ffpUnitsTransfused);
      setPlateletUnits(p.plateletUnitsTransfused);
      setCalciumGrams(p.calciumChlorideGramsGiven);
      setTegRTime(p.tegRTimeMin || 14.5);
      setTegAlpha(p.tegAlphaAngleDeg || 42);
      setTegMa(p.tegMaxAmplitudeMm || 38);
      setTegLy30(p.tegLy30Percent || 7.8);
      setProposedOrders(p.proposedOrders);
    } else if (key === "delayed_txa") {
      const p = MTP_PRESET_DELAYED_TXA;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setHoursSinceInjury(p.hoursSinceInjury);
      setSystolicBp(p.systolicBp);
      setHeartRateBpm(p.heartRateBpm);
      setCoreTemp(p.coreTemperatureCelsius);
      setArterialPh(p.arterialPh);
      setBaseDeficit(p.baseDeficitMeqPerL);
      setIonizedCalcium(p.ionizedCalciumMmolPerL);
      setSerumFibrinogen(p.serumFibrinogenMgPerDl);
      setPlatelets(p.plateletCountKPerUl);
      setCrystalloidMl(p.crystalloidInfusedMl);
      setPrbcUnits(p.prbcUnitsTransfused);
      setFfpUnits(p.ffpUnitsTransfused);
      setPlateletUnits(p.plateletUnitsTransfused);
      setCalciumGrams(p.calciumChlorideGramsGiven);
      setTegRTime(p.tegRTimeMin || 7.2);
      setTegAlpha(p.tegAlphaAngleDeg || 62);
      setTegMa(p.tegMaxAmplitudeMm || 58);
      setTegLy30(p.tegLy30Percent || 1.2);
      setProposedOrders(p.proposedOrders);
    }
  };

  // Toggle Order
  const handleToggleOrder = (order: any) => {
    if (proposedOrders?.includes(order)) {
      setProposedOrders(proposedOrders.filter((o) => o !== order));
    } else {
      setProposedOrders([...(proposedOrders || []), order]);
    }
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatMtpSpokenSummary(report);
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
    const prompt = `[Noctis MTP Resuscitation - ${report.patientName}] Transfusion Status: ${report.mtpStatus}. Ratios: ${prbcUnits} PRBC : ${ffpUnits} FFP : ${plateletUnits} Plt. Crystalloid Infused: ${crystalloidMl} mL. Ionized Ca2+: ${ionizedCalcium} mmol/L. Core Temp: ${coreTemp}°C, pH: ${arterialPh}. TEG: R-time ${tegRTime}m, Alpha ${tegAlpha}°, MA ${tegMa}mm, LY30 ${tegLy30}%. Tripped Invariants: ${report.trippedInvariants.join(", ") || "None"}. Mandated Actions: ${report.mandatoryActions.join(" | ") || "Maintain 1:1:1 balanced blood transfusion."}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-gradient-to-r from-red-950/40 via-rose-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/40">
              <Droplet className="h-3.5 w-3.5" />
              TRACK 25 ENGINE
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300 border border-red-500/40">
              PROPPR 1:1:1 Protocol
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/40">
              TEG 6s / ROTEM Hemostasis
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/40">
              CRASH-2 TXA 3h Cutoff
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Massive Transfusion Protocol (MTP) &amp; Viscoelastic Hemostasis
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-compensatory safety invariant gates: Exsanguinating crystalloid drowning veto, citrate hypocalcemia veto, delayed TXA harm veto, and trauma lethal triad of death.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleVoice}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-md",
              isSpeaking
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
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
              className="flex items-center gap-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/40 text-red-200 border border-red-500/50 px-3 py-1.5 text-xs font-medium transition-colors shadow-md"
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
            <Sliders className="h-3.5 w-3.5 text-rose-400" />
            Curated Massive Transfusion Scenarios
          </span>
          <span className="text-[11px] text-zinc-500">Live Invariant Probes</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => handleLoadPreset("lethal_triad")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "lethal_triad"
                ? "bg-red-950/40 border-rose-500/60 text-rose-200 shadow-md ring-1 ring-rose-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Jackson Miller (28yo M - GSW Abdomen)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-MTP-001, 002, 004
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Lethal Triad (33.4°C, pH 7.12), iCa 0.82, 3500 mL Crystalloid</div>
          </button>

          <button
            onClick={() => handleLoadPreset("delayed_txa")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "delayed_txa"
                ? "bg-red-950/40 border-rose-500/60 text-rose-200 shadow-md ring-1 ring-rose-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Elena Gomez (46yo F - MVC Entrapped)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CF-MTP-003
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">4.5 Hours Post-Injury, Attempted Delayed TXA Order (CRASH-2 Cutoff)</div>
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
                    Gate: {report.trippedInvariants[idx] || "CF-MTP"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100 font-medium">{action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid: Blood Cooler Balance vs Viscoelastic TEG Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Balanced Hemostatic Resuscitation (PROPPR 1:1:1) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-rose-400" />
              Blood Cooler Component Ratios (1:1:1)
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Post-Injury: {hoursSinceInjury}h</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/20">
                <div className="text-[11px] text-red-300 font-semibold">PRBC Units</div>
                <div className="text-xl font-bold text-white mt-1">{prbcUnits}</div>
              </div>
              <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20">
                <div className="text-[11px] text-amber-300 font-semibold">FFP Units</div>
                <div className="text-xl font-bold text-white mt-1">{ffpUnits}</div>
              </div>
              <div className="p-3 rounded-lg border border-yellow-500/40 bg-yellow-950/20">
                <div className="text-[11px] text-yellow-300 font-semibold">Platelet Packs</div>
                <div className="text-xl font-bold text-white mt-1">{plateletUnits}</div>
              </div>
            </div>

            {/* Crystalloid vs Blood Balance Alert */}
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400">Crystalloid Infused</span>
                <span
                  className={cn(
                    "text-xs font-mono font-bold px-2 py-0.5 rounded",
                    crystalloidMl > 2000
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  )}
                >
                  {crystalloidMl} mL
                </span>
              </div>
              <div className="text-[10px] text-zinc-500">
                {crystalloidMl > 2000
                  ? "CRITICAL: Crystalloid drowning active. Stop saline/LR; use blood products only."
                  : "Crystalloid volume within restrictive damage-control limits."}
              </div>
            </div>

            {/* Lethal Triad Physiologic Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Core Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  min={28}
                  max={40}
                  value={coreTemp}
                  onChange={(e) => setCoreTemp(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&lt; 35°C = Coagulopathy</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Arterial pH</label>
                <input
                  type="number"
                  step="0.01"
                  min={6.8}
                  max={7.6}
                  value={arterialPh}
                  onChange={(e) => setArterialPh(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&lt; 7.25 = Severe Acidosis</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Ionized Ca2+ (mmol/L)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.4}
                  max={2.0}
                  value={ionizedCalcium}
                  onChange={(e) => setIonizedCalcium(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&lt; 0.90 = Citrate Toxicity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Viscoelastic TEG 6s / ROTEM Clot Dynamics */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-amber-400" />
              Viscoelastic TEG 6s Goal-Directed Guidance
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Targeted Factor Therapy</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">R-Time (min) [Thrombin]</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={30}
                  value={tegRTime}
                  onChange={(e) => setTegRTime(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&gt; 10 min = FFP / PCC Mandate</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Alpha Angle (°) [Fibrinogen]</label>
                <input
                  type="number"
                  min={10}
                  max={85}
                  value={tegAlpha}
                  onChange={(e) => setTegAlpha(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&lt; 53° = Cryoprecipitate 10u</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Max Amplitude (MA, mm)</label>
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={tegMa}
                  onChange={(e) => setTegMa(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&lt; 50 mm = Platelet Transfusion</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">LY30 (%) [Fibrinolysis]</label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={50}
                  value={tegLy30}
                  onChange={(e) => setTegLy30(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&gt; 3% = TXA (if &le; 3h injury)</span>
              </div>
            </div>

            {/* Targeted Component Recommendations */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-400 block">Targeted Product Directives</span>
              {report.viscoelasticInterpretation.recommendedBloodProducts.length > 0 ? (
                report.viscoelasticInterpretation.recommendedBloodProducts.map((rec, idx) => (
                  <div key={idx} className="text-[11px] text-amber-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-zinc-500">TEG parameters within normal hemostatic ranges.</div>
              )}
            </div>

            {/* Interactive Proposed Orders Probe */}
            <div className="pt-1 border-t border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                Simulate Resuscitation Orders (Invariant Probing)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleToggleOrder("CRYSTALLOID_BOLUS_2000ML")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs border font-medium transition-colors",
                    proposedOrders?.includes("CRYSTALLOID_BOLUS_2000ML")
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                  )}
                >
                  {proposedOrders?.includes("CRYSTALLOID_BOLUS_2000ML") ? "✓ " : "+ "}
                  2000 mL Saline Bolus (Drowning Probe)
                </button>
                <button
                  onClick={() => handleToggleOrder("TXA_1G_IV")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs border font-medium transition-colors",
                    proposedOrders?.includes("TXA_1G_IV")
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                  )}
                >
                  {proposedOrders?.includes("TXA_1G_IV") ? "✓ " : "+ "}
                  TXA 1g IV (CRASH-2 Timing Probe)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Guidance Footnote */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <Info className="h-4 w-4 text-rose-400" />
          Evidence-Based Hemostatic Resuscitation Principles (FDA Non-Device CDS)
        </div>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">1. CRASH-2 Trial 3-Hour TXA Cutoff:</strong> The randomized CRASH-2 trial demonstrated that Tranexamic Acid administered within 3 hours of trauma significantly reduced all-cause mortality and death due to bleeding. In contrast, when administered after 3 hours, TXA resulted in a 44% increase in the risk of fatal bleeding and occlusive thrombotic events. After 3 hours, TXA is strictly contraindicated.
        </p>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">2. Citrate Hypocalcemia &amp; Coagulation Arrest:</strong> Citrate preservative in PRBC and FFP packs binds free ionized calcium ($Ca^{2+}$). Calcium is a critical cofactor in tenase and prothrombinase enzyme complexes, as well as cardiac excitation-contraction coupling. When $iCa < 0.9\text{ mmol/L}$, refractory hypotension, arrhythmias, and non-correctable coagulopathy occur. 1 gram of Calcium Chloride IV is mandatory for every 4 units of blood products.
        </p>
      </div>
    </div>
  );
}
