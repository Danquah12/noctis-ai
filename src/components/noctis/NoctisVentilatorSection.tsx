import React, { useState, useMemo } from "react";
import {
  Wind,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Square,
  Sparkles,
  Send,
  Check,
  RotateCcw,
  Activity,
  Heart,
  Gauge,
  Sliders,
  ArrowRight,
  TrendingDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  calculatePredictedBodyWeight,
  calculatePfRatio,
  classifyArdsSeverity,
  evaluateMechanicalVentilation,
  formatVentilatorSpokenSummary,
  ARDSNET_LOWER_PEEP_LADDER,
  VENT_PRESET_SEVERE_ARDS_COVID,
  VENT_PRESET_COPD_AUTOPEEP,
  VENT_PRESET_POST_OP_LUNG_PROTECTIVE,
  type BiologicalSex,
  type VentilationMode,
  type PatientVentilatorProfile,
} from "@/lib/noctis-mechanical-ventilation.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisVentilatorSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisVentilatorSection({ onSendToChat }: NoctisVentilatorSectionProps) {
  // Preset selection
  const [selectedPreset, setSelectedPreset] = useState<string>("ards");

  // Patient Demographics
  const [patientId, setPatientId] = useState<string>("VENT-ARDS-001");
  const [patientName, setPatientName] = useState<string>("Robert Chen (58yo M - Severe ARDS)");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>("MALE");
  const [heightInches, setHeightInches] = useState<number>(70); // 5'10"
  const [actualWeightKg, setActualWeightKg] = useState<number>(94);

  // Ventilator Settings
  const [mode, setMode] = useState<VentilationMode>("VOLUME_CONTROL_AC");
  const [setTidalVolumeMl, setSetTidalVolumeMl] = useState<number>(440);
  const [respiratoryRateSetPerMin, setRespiratoryRateSetPerMin] = useState<number>(26);
  const [respiratoryRateTotalPerMin, setRespiratoryRateTotalPerMin] = useState<number>(28);
  const [fiO2Percent, setFiO2Percent] = useState<number>(80);
  const [peepCmH2O, setPeepCmH2O] = useState<number>(14);
  const [peakInspiratoryPressureCmH2O, setPeakInspiratoryPressureCmH2O] = useState<number>(38);
  const [plateauPressureCmH2O, setPlateauPressureCmH2O] = useState<number>(32);
  const [autoPeepCmH2O, setAutoPeepCmH2O] = useState<number | undefined>(undefined);

  // ABG
  const [pH, setPH] = useState<number>(7.28);
  const [paCO2MmHg, setPaCO2MmHg] = useState<number>(52);
  const [paO2MmHg, setPaO2MmHg] = useState<number>(64);
  const [hco3MmolPerL, setHco3MmolPerL] = useState<number>(24);
  const [spO2Percent, setSpO2Percent] = useState<number>(90);

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Compute live Devine PBW
  const pbwKg = useMemo(() => {
    return calculatePredictedBodyWeight(biologicalSex, heightInches);
  }, [biologicalSex, heightInches]);

  // Compute live Evaluation Report
  const report = useMemo(() => {
    return evaluateMechanicalVentilation({
      patientId,
      patientName,
      biologicalSex,
      heightInches,
      actualWeightKg,
      mode,
      setTidalVolumeMl,
      respiratoryRateSetPerMin,
      respiratoryRateTotalPerMin,
      fiO2Percent,
      peepCmH2O,
      peakInspiratoryPressureCmH2O,
      plateauPressureCmH2O,
      autoPeepCmH2O,
      abg: {
        pH,
        paCO2MmHg,
        paO2MmHg,
        hco3MmolPerL,
        spO2Percent,
      },
    });
  }, [
    patientId,
    patientName,
    biologicalSex,
    heightInches,
    actualWeightKg,
    mode,
    setTidalVolumeMl,
    respiratoryRateSetPerMin,
    respiratoryRateTotalPerMin,
    fiO2Percent,
    peepCmH2O,
    peakInspiratoryPressureCmH2O,
    plateauPressureCmH2O,
    autoPeepCmH2O,
    pH,
    paCO2MmHg,
    paO2MmHg,
    hco3MmolPerL,
    spO2Percent,
  ]);

  // Handle Preset Load
  const handleLoadPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    if (presetKey === "ards") {
      const p = VENT_PRESET_SEVERE_ARDS_COVID;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setBiologicalSex(p.biologicalSex);
      setHeightInches(p.heightInches);
      setActualWeightKg(p.actualWeightKg);
      setMode(p.mode);
      setSetTidalVolumeMl(p.setTidalVolumeMl);
      setRespiratoryRateSetPerMin(p.respiratoryRateSetPerMin);
      setRespiratoryRateTotalPerMin(p.respiratoryRateTotalPerMin);
      setFiO2Percent(p.fiO2Percent);
      setPeepCmH2O(p.peepCmH2O);
      setPeakInspiratoryPressureCmH2O(p.peakInspiratoryPressureCmH2O);
      setPlateauPressureCmH2O(p.plateauPressureCmH2O);
      setAutoPeepCmH2O(undefined);
      setPH(p.abg.pH);
      setPaCO2MmHg(p.abg.paCO2MmHg);
      setPaO2MmHg(p.abg.paO2MmHg);
      setHco3MmolPerL(p.abg.hco3MmolPerL);
      setSpO2Percent(p.abg.spO2Percent);
    } else if (presetKey === "copd") {
      const p = VENT_PRESET_COPD_AUTOPEEP;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setBiologicalSex(p.biologicalSex);
      setHeightInches(p.heightInches);
      setActualWeightKg(p.actualWeightKg);
      setMode(p.mode);
      setSetTidalVolumeMl(p.setTidalVolumeMl);
      setRespiratoryRateSetPerMin(p.respiratoryRateSetPerMin);
      setRespiratoryRateTotalPerMin(p.respiratoryRateTotalPerMin);
      setFiO2Percent(p.fiO2Percent);
      setPeepCmH2O(p.peepCmH2O);
      setPeakInspiratoryPressureCmH2O(p.peakInspiratoryPressureCmH2O);
      setPlateauPressureCmH2O(p.plateauPressureCmH2O);
      setAutoPeepCmH2O(p.autoPeepCmH2O);
      setPH(p.abg.pH);
      setPaCO2MmHg(p.abg.paCO2MmHg);
      setPaO2MmHg(p.abg.paO2MmHg);
      setHco3MmolPerL(p.abg.hco3MmolPerL);
      setSpO2Percent(p.abg.spO2Percent);
    } else if (presetKey === "norm") {
      const p = VENT_PRESET_POST_OP_LUNG_PROTECTIVE;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setBiologicalSex(p.biologicalSex);
      setHeightInches(p.heightInches);
      setActualWeightKg(p.actualWeightKg);
      setMode(p.mode);
      setSetTidalVolumeMl(p.setTidalVolumeMl);
      setRespiratoryRateSetPerMin(p.respiratoryRateSetPerMin);
      setRespiratoryRateTotalPerMin(p.respiratoryRateTotalPerMin);
      setFiO2Percent(p.fiO2Percent);
      setPeepCmH2O(p.peepCmH2O);
      setPeakInspiratoryPressureCmH2O(p.peakInspiratoryPressureCmH2O);
      setPlateauPressureCmH2O(p.plateauPressureCmH2O);
      setAutoPeepCmH2O(undefined);
      setPH(p.abg.pH);
      setPaCO2MmHg(p.abg.paCO2MmHg);
      setPaO2MmHg(p.abg.paO2MmHg);
      setHco3MmolPerL(p.abg.hco3MmolPerL);
      setSpO2Percent(p.abg.spO2Percent);
    }
  };

  // Voice Read Aloud
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatVentilatorSpokenSummary(report);
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
    const prompt = `[Noctis Critical Care Mechanical Ventilation Assessment - ${report.patientName}] Evaluate ventilator profile: PBW ${report.predictedBodyWeightKg} kg, Mode ${mode}, Delivered Vt ${setTidalVolumeMl} mL (${report.currentVtPerKgPbw} mL/kg PBW), Pplat ${plateauPressureCmH2O} cmH2O, PEEP ${peepCmH2O} cmH2O, Driving Pressure ${report.drivingPressureCmH2O} cmH2O, FiO2 ${fiO2Percent}%, ABG pH ${pH}/PaCO2 ${paCO2MmHg}/PaO2 ${paO2MmHg}/SpO2 ${spO2Percent}%. Berlin ARDS Classification: ${report.ardsSeverity} (P/F Ratio: ${report.pao2Fio2Ratio}). Tripped Invariants: ${report.trippedInvariants.join(", ") || "None"}. Recommendations: ${report.recommendedVentilatorAdjustments.rationale}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-cyan-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
              <Wind className="size-3 text-sky-400" /> ARDSNet Ventilation
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              21 U.S.C. § 360j(o)(1)(E)
            </span>
            <span className="rounded bg-emerald-600/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              ARMA Trial (6 mL/kg PBW)
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mt-1">
            Critical Care Mechanical Ventilation &amp; ARDSNet Titration Protocol
          </h2>
          <p className="text-xs text-white/60">
            Automated Predicted Body Weight (Devine), Berlin ARDS stratification, Driving Pressure (&Delta;P &lt; 15 cmH2O) &amp; Barotrauma Veto (Pplat &le; 30 cmH2O).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition shadow-sm border",
              isSpeaking
                ? "bg-amber-500/25 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/50"
                : "bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border-sky-500/40"
            )}
          >
            {isSpeaking ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Readout
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-sky-300" /> Read Aloud (Full Invariants)
              </>
            )}
          </button>
          {onSendToChat && (
            <button
              type="button"
              onClick={handleSendChat}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-500 transition text-white shadow-md"
            >
              <Send className="size-3.5" /> Consult Noctis
            </button>
          )}
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider mr-1">
          Clinical Scenarios:
        </span>
        <button
          type="button"
          onClick={() => handleLoadPreset("ards")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "ards"
              ? "bg-rose-950/60 border-rose-500/60 text-rose-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-rose-400 font-bold mr-1">&bull;</span> Severe ARDS (COVID/Pneumonia, P/F 80, Pplat 32)
        </button>
        <button
          type="button"
          onClick={() => handleLoadPreset("copd")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "copd"
              ? "bg-amber-950/60 border-amber-500/60 text-amber-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-amber-400 font-bold mr-1">&bull;</span> Severe COPD (Dynamic Hyperinflation, Auto-PEEP 9.5)
        </button>
        <button
          type="button"
          onClick={() => handleLoadPreset("norm")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "norm"
              ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-emerald-400 font-bold mr-1">&bull;</span> Post-Op Protective (Normal Compliance, 6 mL/kg)
        </button>
      </div>

      {/* Tripped Invariants Banner */}
      {report.trippedInvariants.length > 0 && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="size-4 text-rose-400 animate-pulse" />
            CRITICAL SAFETY INVARIANT VETO TRIPPED ({report.trippedInvariants.join(", ")})
          </div>
          <div className="space-y-1.5 text-xs text-rose-200/90">
            {report.mandatoryActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2 bg-black/40 rounded p-2 border border-rose-500/30">
                <span className="text-rose-400 font-bold shrink-0">&bull;</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Ventilator & Patient Parameter Cockpit */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Sliders className="size-4" /> Patient &amp; Ventilator Parameters
            </h3>

            {/* Sex & Height (PBW Devine) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">Biological Sex</label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setBiologicalSex("MALE")}
                    className={cn(
                      "py-1 text-xs font-semibold rounded border transition",
                      biologicalSex === "MALE"
                        ? "bg-sky-600 text-white border-sky-500"
                        : "bg-white/5 text-white/60 border-white/10"
                    )}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiologicalSex("FEMALE")}
                    className={cn(
                      "py-1 text-xs font-semibold rounded border transition",
                      biologicalSex === "FEMALE"
                        ? "bg-rose-600 text-white border-rose-500"
                        : "bg-white/5 text-white/60 border-white/10"
                    )}
                  >
                    Female
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] font-bold text-white/60 uppercase">
                  <span>Height</span>
                  <span className="text-sky-300 font-mono">{heightInches} in ({Math.floor(heightInches/12)}'{heightInches%12}")</span>
                </div>
                <input
                  type="range"
                  min={55}
                  max={80}
                  value={heightInches}
                  onChange={(e) => setHeightInches(Number(e.target.value))}
                  className="w-full mt-2 accent-sky-500"
                />
              </div>
            </div>

            {/* Devine PBW HUD Badge */}
            <div className="rounded-lg bg-sky-950/30 border border-sky-500/30 p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-sky-300">Predicted Body Weight (Devine)</div>
                <div className="text-lg font-bold text-white font-mono">{pbwKg} <span className="text-xs text-white/60">kg</span></div>
              </div>
              <div className="text-right text-[11px] font-mono text-sky-200/80">
                <div>4 mL/kg: <strong className="text-white">{report.targetTidalVolumeRangeMl.fourMlPerKg} mL</strong></div>
                <div>6 mL/kg (Target): <strong className="text-emerald-300">{report.targetTidalVolumeRangeMl.sixMlPerKg} mL</strong></div>
                <div>8 mL/kg: <strong className="text-amber-300">{report.targetTidalVolumeRangeMl.eightMlPerKg} mL</strong></div>
              </div>
            </div>

            {/* Set Tidal Volume Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-white/80">Delivered Tidal Volume (Vt)</span>
                <span className={cn(
                  "font-mono font-bold text-xs px-2 py-0.5 rounded",
                  report.currentVtPerKgPbw <= 6.5 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                  report.currentVtPerKgPbw <= 8.0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                  "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                )}>
                  {setTidalVolumeMl} mL ({report.currentVtPerKgPbw} mL/kg PBW)
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={700}
                step={10}
                value={setTidalVolumeMl}
                onChange={(e) => setSetTidalVolumeMl(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            {/* Ventilator Pressures Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">PEEP (cmH2O)</label>
                <input
                  type="number"
                  min={5}
                  max={24}
                  value={peepCmH2O}
                  onChange={(e) => setPeepCmH2O(Number(e.target.value))}
                  className="w-full mt-1 bg-black/60 border border-white/20 rounded px-2.5 py-1 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">FiO2 (%)</label>
                <input
                  type="number"
                  min={21}
                  max={100}
                  value={fiO2Percent}
                  onChange={(e) => setFiO2Percent(Number(e.target.value))}
                  className="w-full mt-1 bg-black/60 border border-white/20 rounded px-2.5 py-1 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">Peak Pressure PIP (cmH2O)</label>
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={peakInspiratoryPressureCmH2O}
                  onChange={(e) => setPeakInspiratoryPressureCmH2O(Number(e.target.value))}
                  className="w-full mt-1 bg-black/60 border border-white/20 rounded px-2.5 py-1 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">Plateau Pressure Pplat</label>
                <input
                  type="number"
                  min={10}
                  max={50}
                  value={plateauPressureCmH2O}
                  onChange={(e) => setPlateauPressureCmH2O(Number(e.target.value))}
                  className={cn(
                    "w-full mt-1 bg-black/60 border rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none",
                    plateauPressureCmH2O > 30 ? "border-rose-500 text-rose-300" : "border-white/20 focus:border-sky-500"
                  )}
                />
              </div>
            </div>

            {/* Arterial Blood Gas (ABG) Strip */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Arterial Blood Gas (ABG)</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded bg-black/60 border border-white/10 p-1.5">
                  <div className="text-[9px] text-white/50">pH</div>
                  <input
                    type="number"
                    step={0.01}
                    value={pH}
                    onChange={(e) => setPH(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="rounded bg-black/60 border border-white/10 p-1.5">
                  <div className="text-[9px] text-white/50">PaCO2</div>
                  <input
                    type="number"
                    value={paCO2MmHg}
                    onChange={(e) => setPaCO2MmHg(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="rounded bg-black/60 border border-white/10 p-1.5">
                  <div className="text-[9px] text-white/50">PaO2</div>
                  <input
                    type="number"
                    value={paO2MmHg}
                    onChange={(e) => setPaO2MmHg(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="rounded bg-black/60 border border-white/10 p-1.5">
                  <div className="text-[9px] text-white/50">SpO2 %</div>
                  <input
                    type="number"
                    value={spO2Percent}
                    onChange={(e) => setSpO2Percent(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Airway Pressure Gauge, ARDSNet Titration & Directives */}
        <div className="lg:col-span-7 space-y-4">
          {/* Key Physiological Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Driving Pressure */}
            <div className={cn(
              "rounded-xl border p-3",
              report.drivingPressureCmH2O >= 15
                ? "bg-rose-950/30 border-rose-500/50 text-rose-300"
                : "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
            )}>
              <div className="text-[10px] uppercase font-bold text-white/60">Driving Pressure (&Delta;P)</div>
              <div className="text-xl font-bold font-mono mt-0.5">
                {report.drivingPressureCmH2O} <span className="text-xs">cmH2O</span>
              </div>
              <div className="text-[10px] mt-1">
                {report.drivingPressureCmH2O >= 15 ? "Elevated (&ge;15) -> High Strain" : "Optimal (&lt;15 cmH2O)"}
              </div>
            </div>

            {/* Static Compliance */}
            <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 text-sky-200">
              <div className="text-[10px] uppercase font-bold text-white/60">Static Compliance (Cstat)</div>
              <div className="text-xl font-bold font-mono mt-0.5 text-white">
                {report.staticCompliance} <span className="text-xs text-white/60">mL/cmH2O</span>
              </div>
              <div className="text-[10px] text-sky-300 mt-1">
                {report.staticCompliance < 30 ? "Severely Stiff Lungs" : "Acceptable Compliance"}
              </div>
            </div>

            {/* Berlin ARDS Severity & P/F */}
            <div className={cn(
              "rounded-xl border p-3",
              report.ardsSeverity === "SEVERE" ? "bg-rose-950/40 border-rose-500/60 text-rose-300" :
              report.ardsSeverity === "MODERATE" ? "bg-amber-950/30 border-amber-500/50 text-amber-300" :
              report.ardsSeverity === "MILD" ? "bg-yellow-950/20 border-yellow-500/40 text-yellow-300" :
              "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
            )}>
              <div className="text-[10px] uppercase font-bold text-white/60">Berlin ARDS Stratification</div>
              <div className="text-xl font-bold font-mono mt-0.5">
                {report.ardsSeverity}
              </div>
              <div className="text-[10px] font-mono mt-1">
                P/F: {report.pao2Fio2Ratio ?? "--"} mmHg
              </div>
            </div>
          </div>

          {/* Visual Airway Pressure Bar Graph */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Gauge className="size-4" /> Airway Pressure Gradient Visualizer
              </h4>
              <span className="text-[10px] text-white/50 font-mono">Ceiling: 30 cmH2O</span>
            </div>

            {/* Pressure Bar */}
            <div className="space-y-1">
              <div className="relative h-6 w-full rounded-md bg-white/5 overflow-hidden border border-white/10">
                {/* Safe zone background (up to 30 cmH2O) */}
                <div className="absolute top-0 bottom-0 left-0 bg-emerald-500/20" style={{ width: `${(30 / 60) * 100}%` }} />
                {/* Danger zone background (> 30 cmH2O) */}
                <div className="absolute top-0 bottom-0 left-[50%] right-0 bg-rose-500/20" />

                {/* 30 cmH2O Threshold Line */}
                <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-rose-500 z-10" />

                {/* PEEP Bar */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-sky-500/60 border-r border-sky-400"
                  style={{ width: `${(peepCmH2O / 60) * 100}%` }}
                />

                {/* Driving Pressure Bar (PEEP to Pplat) */}
                <div
                  className={cn(
                    "absolute top-0 bottom-0",
                    report.drivingPressureCmH2O >= 15 ? "bg-amber-500/70" : "bg-emerald-500/60"
                  )}
                  style={{
                    left: `${(peepCmH2O / 60) * 100}%`,
                    width: `${(Math.max(0, plateauPressureCmH2O - peepCmH2O) / 60) * 100}%`,
                  }}
                />

                {/* PIP Marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-400 z-20"
                  style={{ left: `${Math.min(100, (peakInspiratoryPressureCmH2O / 60) * 100)}%` }}
                />
              </div>

              {/* Legend & Labels */}
              <div className="flex justify-between items-center text-[10px] text-white/60 font-mono pt-1">
                <span>0</span>
                <span className="text-sky-300">PEEP: {peepCmH2O} cmH2O</span>
                <span className={plateauPressureCmH2O > 30 ? "text-rose-400 font-bold" : "text-emerald-300"}>
                  Pplat: {plateauPressureCmH2O} cmH2O {plateauPressureCmH2O > 30 && "(EXCEEDED!)"}
                </span>
                <span className="text-red-400">PIP: {peakInspiratoryPressureCmH2O} cmH2O</span>
                <span>60 cmH2O</span>
              </div>
            </div>
          </div>

          {/* ARDSNet Lower PEEP / Higher FiO2 Ladder Visualizer */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Wind className="size-4" /> ARDSNet PEEP / FiO2 Titration Ladder
              </h4>
              <span className="text-[10px] text-white/50">Current: FiO2 {fiO2Percent}% &bull; PEEP {peepCmH2O} cmH2O</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {ARDSNET_LOWER_PEEP_LADDER.slice(0, 8).map((step, idx) => {
                const isCurrent = step.peepCmH2O === peepCmH2O && step.fiO2Percent === fiO2Percent;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded p-2 text-center text-[10px] font-mono border transition",
                      isCurrent
                        ? "bg-sky-500/30 border-sky-400 text-sky-200 ring-1 ring-sky-400"
                        : "bg-white/[0.02] border-white/5 text-white/60 hover:border-white/20"
                    )}
                  >
                    <div className="text-[9px] text-white/40">Step {idx + 1}</div>
                    <div className="font-bold text-white">{step.fiO2Percent}%</div>
                    <div className="text-sky-300">{step.peepCmH2O} cm</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Ventilator Adjustments Card */}
          <div className="rounded-xl border border-sky-500/40 bg-gradient-to-r from-sky-950/30 to-black/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
              <Sparkles className="size-4 text-sky-400" />
              NOCTIS CLINICAL DECISION SUPPORT TITRATION RECOMMENDATION
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              {report.recommendedVentilatorAdjustments.rationale}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 text-xs font-mono">
              <div className="rounded bg-sky-500/10 border border-sky-500/30 px-2.5 py-1">
                Target Vt: <strong className="text-emerald-300">{report.recommendedVentilatorAdjustments.suggestedTidalVolumeMl} mL</strong>
              </div>
              <div className="rounded bg-sky-500/10 border border-sky-500/30 px-2.5 py-1">
                Titrated PEEP: <strong className="text-sky-300">{report.recommendedVentilatorAdjustments.suggestedPeepCmH2O} cmH2O</strong>
              </div>
              <div className="rounded bg-sky-500/10 border border-sky-500/30 px-2.5 py-1">
                Target FiO2: <strong className="text-amber-300">{report.recommendedVentilatorAdjustments.suggestedFiO2Percent}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
