import React, { useState, useMemo } from "react";
import {
  Flame,
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
  Wind,
  Layers,
  Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  calculateBurnFluidResuscitation,
  evaluateBurnResuscitation,
  formatBurnSpokenSummary,
  BURN_PRESET_INHALATION_AIRWAY,
  BURN_PRESET_CYANIDE_POISONING,
  BURN_PRESET_FLUID_CREEP,
  type BurnPatientProfile,
  type BurnEvaluationReport,
} from "@/lib/noctis-burn-resuscitation.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisBurnSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisBurnSection({ onSendToChat }: NoctisBurnSectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("inhalation");

  // Patient parameters
  const [patientId, setPatientId] = useState<string>(BURN_PRESET_INHALATION_AIRWAY.patientId);
  const [patientName, setPatientName] = useState<string>(BURN_PRESET_INHALATION_AIRWAY.patientName);
  const [ageYears, setAgeYears] = useState<number>(BURN_PRESET_INHALATION_AIRWAY.ageYears);
  const [weightKg, setWeightKg] = useState<number>(BURN_PRESET_INHALATION_AIRWAY.weightKg);
  const [hoursPostBurn, setHoursPostBurn] = useState<number>(BURN_PRESET_INHALATION_AIRWAY.hoursPostBurn);
  const [tbsaPercent, setTbsaPercent] = useState<number>(BURN_PRESET_INHALATION_AIRWAY.percentTbsaSecondAndThirdDegree);
  const [isElectrical, setIsElectrical] = useState<boolean>(BURN_PRESET_INHALATION_AIRWAY.isElectricalHighVoltage);

  // Inhalation & Toxicology
  const [closedSpaceFire, setClosedSpaceFire] = useState<boolean>(BURN_PRESET_INHALATION_AIRWAY.closedSpaceFire);
  const [singedFacialHair, setSingedFacialHair] = useState<boolean>(
    BURN_PRESET_INHALATION_AIRWAY.singedFacialHairOrSootInPharynx
  );
  const [stridorOrHoarseness, setStridorOrHoarseness] = useState<boolean>(
    BURN_PRESET_INHALATION_AIRWAY.stridorOrHoarseness
  );
  const [carboxyhemoglobin, setCarboxyhemoglobin] = useState<number>(
    BURN_PRESET_INHALATION_AIRWAY.carboxyhemoglobinPercent
  );
  const [serumLactate, setSerumLactate] = useState<number>(BURN_PRESET_INHALATION_AIRWAY.serumLactateMmolPerL);

  // Circumferential Eschar
  const [circumferentialExtremity, setCircumferentialExtremity] = useState<boolean>(
    BURN_PRESET_INHALATION_AIRWAY.circumferentialExtremityBurn
  );
  const [distalPulseLost, setDistalPulseLost] = useState<boolean>(BURN_PRESET_INHALATION_AIRWAY.distalPulseLost);
  const [circumferentialTorso, setCircumferentialTorso] = useState<boolean>(
    BURN_PRESET_INHALATION_AIRWAY.circumferentialTorsoBurn
  );
  const [pipHigh, setPipHigh] = useState<boolean>(BURN_PRESET_INHALATION_AIRWAY.peakInspiratoryPressureHigh);

  // Fluid Resuscitation Monitoring
  const [currentInfusionRate, setCurrentInfusionRate] = useState<number>(
    BURN_PRESET_INHALATION_AIRWAY.currentFluidInfusionMlPerHour
  );
  const [totalFluidReceived, setTotalFluidReceived] = useState<number>(
    BURN_PRESET_INHALATION_AIRWAY.totalFluidReceivedMl
  );
  const [urineOutput, setUrineOutput] = useState<number>(BURN_PRESET_INHALATION_AIRWAY.urineOutputMlPerHour);
  const [bladderPressure, setBladderPressure] = useState<number>(12);

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live Burn Evaluation Report
  const report = useMemo<BurnEvaluationReport>(() => {
    return evaluateBurnResuscitation({
      patientId,
      patientName,
      ageYears,
      weightKg,
      hoursPostBurn,
      percentTbsaSecondAndThirdDegree: tbsaPercent,
      isElectricalHighVoltage: isElectrical,
      closedSpaceFire,
      singedFacialHairOrSootInPharynx: singedFacialHair,
      stridorOrHoarseness,
      carboxyhemoglobinPercent: carboxyhemoglobin,
      serumLactateMmolPerL: serumLactate,
      circumferentialExtremityBurn: circumferentialExtremity,
      distalPulseLost,
      circumferentialTorsoBurn: circumferentialTorso,
      peakInspiratoryPressureHigh: pipHigh,
      currentFluidInfusionMlPerHour: currentInfusionRate,
      totalFluidReceivedMl: totalFluidReceived,
      urineOutputMlPerHour: urineOutput,
      intraAbdominalPressureMmHg: bladderPressure,
    });
  }, [
    patientId,
    patientName,
    ageYears,
    weightKg,
    hoursPostBurn,
    tbsaPercent,
    isElectrical,
    closedSpaceFire,
    singedFacialHair,
    stridorOrHoarseness,
    carboxyhemoglobin,
    serumLactate,
    circumferentialExtremity,
    distalPulseLost,
    circumferentialTorso,
    pipHigh,
    currentInfusionRate,
    totalFluidReceived,
    urineOutput,
    bladderPressure,
  ]);

  // Handle Preset Load
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    if (key === "inhalation") {
      const p = BURN_PRESET_INHALATION_AIRWAY;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setHoursPostBurn(p.hoursPostBurn);
      setTbsaPercent(p.percentTbsaSecondAndThirdDegree);
      setIsElectrical(p.isElectricalHighVoltage);
      setClosedSpaceFire(p.closedSpaceFire);
      setSingedFacialHair(p.singedFacialHairOrSootInPharynx);
      setStridorOrHoarseness(p.stridorOrHoarseness);
      setCarboxyhemoglobin(p.carboxyhemoglobinPercent);
      setSerumLactate(p.serumLactateMmolPerL);
      setCircumferentialExtremity(p.circumferentialExtremityBurn);
      setDistalPulseLost(p.distalPulseLost);
      setCircumferentialTorso(p.circumferentialTorsoBurn);
      setPipHigh(p.peakInspiratoryPressureHigh);
      setCurrentInfusionRate(p.currentFluidInfusionMlPerHour);
      setTotalFluidReceived(p.totalFluidReceivedMl);
      setUrineOutput(p.urineOutputMlPerHour);
      setBladderPressure(12);
    } else if (key === "cyanide") {
      const p = BURN_PRESET_CYANIDE_POISONING;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setHoursPostBurn(p.hoursPostBurn);
      setTbsaPercent(p.percentTbsaSecondAndThirdDegree);
      setIsElectrical(p.isElectricalHighVoltage);
      setClosedSpaceFire(p.closedSpaceFire);
      setSingedFacialHair(p.singedFacialHairOrSootInPharynx);
      setStridorOrHoarseness(p.stridorOrHoarseness);
      setCarboxyhemoglobin(p.carboxyhemoglobinPercent);
      setSerumLactate(p.serumLactateMmolPerL);
      setCircumferentialExtremity(p.circumferentialExtremityBurn);
      setDistalPulseLost(p.distalPulseLost);
      setCircumferentialTorso(p.circumferentialTorsoBurn);
      setPipHigh(p.peakInspiratoryPressureHigh);
      setCurrentInfusionRate(p.currentFluidInfusionMlPerHour);
      setTotalFluidReceived(p.totalFluidReceivedMl);
      setUrineOutput(p.urineOutputMlPerHour);
      setBladderPressure(14);
    } else if (key === "fluid_creep") {
      const p = BURN_PRESET_FLUID_CREEP;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setHoursPostBurn(p.hoursPostBurn);
      setTbsaPercent(p.percentTbsaSecondAndThirdDegree);
      setIsElectrical(p.isElectricalHighVoltage);
      setClosedSpaceFire(p.closedSpaceFire);
      setSingedFacialHair(p.singedFacialHairOrSootInPharynx);
      setStridorOrHoarseness(p.stridorOrHoarseness);
      setCarboxyhemoglobin(p.carboxyhemoglobinPercent);
      setSerumLactate(p.serumLactateMmolPerL);
      setCircumferentialExtremity(p.circumferentialExtremityBurn);
      setDistalPulseLost(p.distalPulseLost);
      setCircumferentialTorso(p.circumferentialTorsoBurn);
      setPipHigh(p.peakInspiratoryPressureHigh);
      setCurrentInfusionRate(p.currentFluidInfusionMlPerHour);
      setTotalFluidReceived(p.totalFluidReceivedMl);
      setUrineOutput(p.urineOutputMlPerHour);
      setBladderPressure(p.intraAbdominalPressureMmHg || 24);
    } else if (key === "escharotomy") {
      setPatientId("BURN-ESCHAR-004");
      setPatientName("Carl Weber (50yo M - Full Thickness Arm Burn)");
      setAgeYears(50);
      setWeightKg(85);
      setHoursPostBurn(4);
      setTbsaPercent(20);
      setIsElectrical(false);
      setClosedSpaceFire(false);
      setSingedFacialHair(false);
      setStridorOrHoarseness(false);
      setCarboxyhemoglobin(2);
      setSerumLactate(2.1);
      setCircumferentialExtremity(true);
      setDistalPulseLost(true); // Loss of radial pulse!
      setCircumferentialTorso(false);
      setPipHigh(false);
      setCurrentInfusionRate(425);
      setTotalFluidReceived(1700);
      setUrineOutput(50);
      setBladderPressure(10);
    }
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatBurnSpokenSummary(report);
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
    const prompt = `[Noctis Acute Burn Resuscitation - ${report.patientName}] TBSA: ${tbsaPercent}%. Weight: ${weightKg} kg. Parkland 24h: ${report.fluidCalculations.parklandTotal24hMl} mL (First 8h rate: ${report.fluidCalculations.first8HoursHourlyRateMl} mL/h, Next 16h: ${report.fluidCalculations.next16HoursHourlyRateMl} mL/h). Inhalation Severity: ${report.inhalationInjurySeverity}. Escharotomy Required: ${report.escharotomyRequired ? "YES - IMMEDIATE" : "NO"}. Tripped Invariants: ${report.trippedInvariants.join(", ") || "None"}. Mandated Actions: ${report.mandatoryActions.join(" | ") || "Titrate fluids to target UOP 0.5-1.0 mL/kg/h."}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-950/40 via-red-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300 border border-orange-500/40">
              <Flame className="h-3.5 w-3.5" />
              TRACK 24 ENGINE
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300 border border-red-500/40">
              ABA Practice Guidelines
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/40">
              Parkland &amp; Brooke Formulas
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/40">
              Cyanide &amp; Escharotomy Gates
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Acute Burn Resuscitation &amp; Inhalation Injury Protocol
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-compensatory safety invariant gates: Inhalation injury prophylactic intubation veto, fluid creep / abdominal compartment syndrome veto, smoke cyanide poisoning antidote veto, and circumferential escharotomy.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleVoice}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-md",
              isSpeaking
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30"
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
              className="flex items-center gap-1.5 rounded-lg bg-orange-600/30 hover:bg-orange-600/40 text-orange-200 border border-orange-500/50 px-3 py-1.5 text-xs font-medium transition-colors shadow-md"
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
            <Sliders className="h-3.5 w-3.5 text-orange-400" />
            Curated Burn Trauma Resuscitation Scenarios
          </span>
          <span className="text-[11px] text-zinc-500">Live Invariant Probes</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            onClick={() => handleLoadPreset("inhalation")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "inhalation"
                ? "bg-orange-950/40 border-orange-500/60 text-orange-200 shadow-md ring-1 ring-orange-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Dominic Torres (45yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-BURN-001
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">35% TBSA, Singed Hair, Stridor (Early Intubation Mandate)</div>
          </button>

          <button
            onClick={() => handleLoadPreset("cyanide")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "cyanide"
                ? "bg-orange-950/40 border-orange-500/60 text-orange-200 shadow-md ring-1 ring-orange-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Evelyn Reed (62yo F)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-BURN-003
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Closed Space Smoke, Lactate 11.5 (Hydroxocobalamin Antidote)</div>
          </button>

          <button
            onClick={() => handleLoadPreset("fluid_creep")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "fluid_creep"
                ? "bg-orange-950/40 border-orange-500/60 text-orange-200 shadow-md ring-1 ring-orange-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Mason Clark (34yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CF-BURN-002
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">286 mL/kg Received, Bladder P 24 mmHg (Fluid Creep ACS)</div>
          </button>

          <button
            onClick={() => handleLoadPreset("escharotomy")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "escharotomy"
                ? "bg-orange-950/40 border-orange-500/60 text-orange-200 shadow-md ring-1 ring-orange-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Carl Weber (50yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-BURN-004
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Circumferential Arm Burn, Absent Radial Pulse (Escharotomy)</div>
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
                    Gate: {report.trippedInvariants[idx] || "CF-BURN"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100 font-medium">{action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid: Fluid Resuscitation Formulas vs Inhalation & Escharotomy Monitors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Parkland & Modified Brooke Fluid Titration */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-orange-400" />
              Parkland &amp; Brooke Fluid Dynamics
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Time: {hoursPostBurn}h Post-Burn</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Total Burn TBSA (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={tbsaPercent}
                  onChange={(e) => setTbsaPercent(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Body Weight (kg)</label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated Infusion Rates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-orange-500/30 bg-orange-950/20 p-3">
                <span className="text-[11px] font-semibold text-orange-300 block">Parkland 24h Total</span>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  {report.fluidCalculations.parklandTotal24hMl.toLocaleString()} mL
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">4 mL x {weightKg}kg x {tbsaPercent}% TBSA</div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <span className="text-[11px] font-semibold text-zinc-400 block">Initial 8-Hour Rate</span>
                <div className="text-lg font-mono font-bold text-orange-400 mt-0.5">
                  {report.fluidCalculations.first8HoursHourlyRateMl} mL/hr
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  Next 16h: {report.fluidCalculations.next16HoursHourlyRateMl} mL/hr
                </div>
              </div>
            </div>

            {/* Hourly Urine Output & Titration Guidance */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400">Target Urine Output (UOP)</span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {report.fluidCalculations.targetUrineOutputMlPerHourMin} - {report.fluidCalculations.targetUrineOutputMlPerHourMax} mL/hr
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Current UOP (mL/hr)</label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={urineOutput}
                    onChange={(e) => setUrineOutput(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Total Infused (mL)</label>
                  <input
                    type="number"
                    min={0}
                    max={50000}
                    value={totalFluidReceived}
                    onChange={(e) => setTotalFluidReceived(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Inhalation Airway, Cyanide & Circumferential Eschar */}
        <div className="space-y-4">
          {/* Inhalation & Cyanide Monitor */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-cyan-400" />
                Inhalation Airway &amp; Cyanide Toxicity
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                  report.inhalationInjurySeverity === "SEVERE_AIRWAY_THREAT" || report.inhalationInjurySeverity === "LETHAL_CYANIDE_TOXICITY"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                )}
              >
                {report.inhalationInjurySeverity.replace(/_/g, " ")}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closedSpaceFire}
                    onChange={(e) => setClosedSpaceFire(e.target.checked)}
                    className="rounded border-zinc-700 text-orange-600 focus:ring-orange-500"
                  />
                  <span>Closed-Space Fire</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stridorOrHoarseness}
                    onChange={(e) => setStridorOrHoarseness(e.target.checked)}
                    className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Stridor / Hoarseness</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Serum Lactate (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0.5}
                    max={25.0}
                    value={serumLactate}
                    onChange={(e) => setSerumLactate(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-0.5">&ge; 8.0 = Cyanide Poisoning Hallmark</span>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">CO-Hb (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={carboxyhemoglobin}
                    onChange={(e) => setCarboxyhemoglobin(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-0.5">&gt; 10% = Carbon Monoxide Poisoning</span>
                </div>
              </div>
            </div>
          </div>

          {/* Circumferential Burn Escharotomy Monitor */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                Circumferential Eschar &amp; Compartment Syndrome
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded",
                  report.escharotomyRequired
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                )}
              >
                {report.escharotomyRequired ? "ESCHAROTOMY MANDATED" : "PERFUSION INTACT"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={circumferentialExtremity}
                  onChange={(e) => setCircumferentialExtremity(e.target.checked)}
                  className="rounded border-zinc-700 text-orange-600 focus:ring-orange-500"
                />
                <span>Circumferential Extremity Burn</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={distalPulseLost}
                  onChange={(e) => setDistalPulseLost(e.target.checked)}
                  className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500"
                />
                <span>Loss of Distal Arterial Pulse</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Guidance Footnote */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <Info className="h-4 w-4 text-orange-400" />
          Evidence-Based Burn Resuscitation Principles (FDA Non-Device CDS)
        </div>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">1. Prophylactic Airway in Inhalation Injury:</strong> Thermal injury to the supraglottic structures produces massive progressive edema reaching maximum swelling at 12 to 24 hours. Waiting for signs of respiratory fatigue or hypoxemia leads to complete glottic closure and can't-intubate-can't-oxygenate (CICO) arrest. Stridor or soot in the oropharynx mandates immediate preemptive intubation with an endotracheal tube size &ge; 7.5 mm to facilitate subsequent bronchoscopy.
        </p>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">2. Cyanide Poisoning &amp; Hydroxocobalamin:</strong> Combustion of nitrogen-containing synthetic polymers (plastics, wool, polyurethane) produces hydrogen cyanide gas. Cyanide binds ferric iron (Fe3+) in cytochrome c oxidase, blocking aerobic ATP production and causing severe lactic acidosis (&ge; 8 mmol/L). Hydroxocobalamin (5g IV) chelates cyanide to form non-toxic cyanocobalamin (vitamin B12), which is excreted in the urine without inducing methemoglobinemia.
        </p>
      </div>
    </div>
  );
}
