import React, { useState, useMemo } from "react";
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Square,
  Sparkles,
  Send,
  Check,
  RotateCcw,
  Droplets,
  Zap,
  Sliders,
  ArrowRight,
  Info,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Flame,
  Pill,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  calculateDkaMetrics,
  evaluateDkaHhsProtocol,
  formatDkaSpokenSummary,
  DKA_PRESET_HYPOKALEMIA,
  DKA_PRESET_DEXTROSE_OMISSION,
  DKA_PRESET_BICARB_ABUSE,
  type DkaPatientProfile,
  type DkaEvaluationReport,
} from "@/lib/noctis-dka-hhs-protocol.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisDkaSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisDkaSection({ onSendToChat }: NoctisDkaSectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("hypokalemia");

  // Patient parameters
  const [patientId, setPatientId] = useState<string>(DKA_PRESET_HYPOKALEMIA.patientId);
  const [patientName, setPatientName] = useState<string>(DKA_PRESET_HYPOKALEMIA.patientName);
  const [ageYears, setAgeYears] = useState<number>(DKA_PRESET_HYPOKALEMIA.ageYears);
  const [weightKg, setWeightKg] = useState<number>(DKA_PRESET_HYPOKALEMIA.weightKg);
  const [glucose, setGlucose] = useState<number>(DKA_PRESET_HYPOKALEMIA.serumGlucoseMgPerDl);
  const [sodium, setSodium] = useState<number>(DKA_PRESET_HYPOKALEMIA.serumSodiumMeqPerL);
  const [potassium, setPotassium] = useState<number>(DKA_PRESET_HYPOKALEMIA.serumPotassiumMeqPerL);
  const [chloride, setChloride] = useState<number>(DKA_PRESET_HYPOKALEMIA.serumChlorideMeqPerL);
  const [bicarbonate, setBicarbonate] = useState<number>(DKA_PRESET_HYPOKALEMIA.serumBicarbonateMeqPerL);
  const [ph, setPh] = useState<number>(DKA_PRESET_HYPOKALEMIA.arterialOrVenousPh);
  const [betaHydroxybutyrate, setBetaHydroxybutyrate] = useState<number>(
    DKA_PRESET_HYPOKALEMIA.betaHydroxybutyrateMmolPerL
  );
  const [mentalStatus, setMentalStatus] = useState<DkaPatientProfile["mentalStatus"]>(
    DKA_PRESET_HYPOKALEMIA.mentalStatus
  );

  // Active Orders
  const [insulinActive, setInsulinActive] = useState<boolean>(DKA_PRESET_HYPOKALEMIA.insulinInfusionActive);
  const [dextroseActive, setDextroseActive] = useState<boolean>(DKA_PRESET_HYPOKALEMIA.dextroseInfusionActive);
  const [potassiumAdded, setPotassiumAdded] = useState<boolean>(DKA_PRESET_HYPOKALEMIA.potassiumAddedToIvFluids);
  const [bicarbonateOrdered, setBicarbonateOrdered] = useState<boolean>(
    DKA_PRESET_HYPOKALEMIA.sodiumBicarbonateOrdered
  );
  const [subqBasalHoursAgo, setSubqBasalHoursAgo] = useState<number | undefined>(undefined);

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live DKA Evaluation Report
  const report = useMemo<DkaEvaluationReport>(() => {
    return evaluateDkaHhsProtocol({
      patientId,
      patientName,
      ageYears,
      weightKg,
      serumGlucoseMgPerDl: glucose,
      serumSodiumMeqPerL: sodium,
      serumPotassiumMeqPerL: potassium,
      serumChlorideMeqPerL: chloride,
      serumBicarbonateMeqPerL: bicarbonate,
      bloodUreaNitrogenMgPerDl: 24,
      arterialOrVenousPh: ph,
      betaHydroxybutyrateMmolPerL: betaHydroxybutyrate,
      urineKetones: "LARGE",
      mentalStatus,
      insulinInfusionActive: insulinActive,
      insulinInfusionRateUnitsPerHour: Math.round(weightKg * 0.1 * 10) / 10,
      dextroseInfusionActive: dextroseActive,
      potassiumAddedToIvFluids: potassiumAdded,
      subcutaneousBasalGivenHoursAgo: subqBasalHoursAgo,
      sodiumBicarbonateOrdered: bicarbonateOrdered,
    });
  }, [
    patientId,
    patientName,
    ageYears,
    weightKg,
    glucose,
    sodium,
    potassium,
    chloride,
    bicarbonate,
    ph,
    betaHydroxybutyrate,
    mentalStatus,
    insulinActive,
    dextroseActive,
    potassiumAdded,
    subqBasalHoursAgo,
    bicarbonateOrdered,
  ]);

  // Handle Preset Load
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    if (key === "hypokalemia") {
      const p = DKA_PRESET_HYPOKALEMIA;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setGlucose(p.serumGlucoseMgPerDl);
      setSodium(p.serumSodiumMeqPerL);
      setPotassium(p.serumPotassiumMeqPerL);
      setChloride(p.serumChlorideMeqPerL);
      setBicarbonate(p.serumBicarbonateMeqPerL);
      setPh(p.arterialOrVenousPh);
      setBetaHydroxybutyrate(p.betaHydroxybutyrateMmolPerL);
      setMentalStatus(p.mentalStatus);
      setInsulinActive(p.insulinInfusionActive);
      setDextroseActive(p.dextroseInfusionActive);
      setPotassiumAdded(p.potassiumAddedToIvFluids);
      setBicarbonateOrdered(p.sodiumBicarbonateOrdered);
      setSubqBasalHoursAgo(undefined);
    } else if (key === "dextrose_omission") {
      const p = DKA_PRESET_DEXTROSE_OMISSION;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setGlucose(p.serumGlucoseMgPerDl);
      setSodium(p.serumSodiumMeqPerL);
      setPotassium(p.serumPotassiumMeqPerL);
      setChloride(p.serumChlorideMeqPerL);
      setBicarbonate(p.serumBicarbonateMeqPerL);
      setPh(p.arterialOrVenousPh);
      setBetaHydroxybutyrate(p.betaHydroxybutyrateMmolPerL);
      setMentalStatus(p.mentalStatus);
      setInsulinActive(p.insulinInfusionActive);
      setDextroseActive(p.dextroseInfusionActive);
      setPotassiumAdded(p.potassiumAddedToIvFluids);
      setBicarbonateOrdered(p.sodiumBicarbonateOrdered);
      setSubqBasalHoursAgo(undefined);
    } else if (key === "bicarb_abuse") {
      const p = DKA_PRESET_BICARB_ABUSE;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setGlucose(p.serumGlucoseMgPerDl);
      setSodium(p.serumSodiumMeqPerL);
      setPotassium(p.serumPotassiumMeqPerL);
      setChloride(p.serumChlorideMeqPerL);
      setBicarbonate(p.serumBicarbonateMeqPerL);
      setPh(p.arterialOrVenousPh);
      setBetaHydroxybutyrate(p.betaHydroxybutyrateMmolPerL);
      setMentalStatus(p.mentalStatus);
      setInsulinActive(p.insulinInfusionActive);
      setDextroseActive(p.dextroseInfusionActive);
      setPotassiumAdded(p.potassiumAddedToIvFluids);
      setBicarbonateOrdered(p.sodiumBicarbonateOrdered);
      setSubqBasalHoursAgo(undefined);
    }
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatDkaSpokenSummary(report);
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
    const prompt = `[Noctis DKA / HHS Resuscitation - ${report.patientName}] Crisis: ${report.calculations.crisisClassification}. Anion Gap: ${report.calculations.anionGapMeqPerL} mEq/L. Corrected Na+: ${report.calculations.correctedSodiumMeqPerL} mEq/L. Effective Osm: ${report.calculations.effectiveOsmolalityMOsmPerKg} mOsm/kg. Potassium Status: ${report.potassiumCheckpointStatus} (K+ ${potassium} mEq/L). Recommended Fluid: ${report.calculations.recommendedIvFluidType}. Insulin Rate: ${report.calculations.recommendedInsulinRateUnitsPerHour} u/h. Tripped Invariants: ${report.trippedInvariants.join(", ") || "None"}. Mandated Actions: ${report.mandatoryActions.join(" | ") || "Maintain standard ADA protocol."}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-300 border border-violet-500/40">
              <Activity className="h-3.5 w-3.5" />
              TRACK 26 ENGINE
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/40">
              ADA Hyperglycemic Crisis
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/40">
              Two-Bag Fluid Titration
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/40">
              Potassium Checkpoint Gate
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Diabetic Ketoacidosis (DKA) & HHS Resuscitation Protocol
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-compensatory safety invariant gates: Hypokalemic insulin infusion veto (K+ &lt; 3.3 mEq/L), premature dextrose omission veto, premature IV insulin discontinuation veto, and bicarbonate contraindication.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleVoice}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-md",
              isSpeaking
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30"
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
              className="flex items-center gap-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/40 text-violet-200 border border-violet-500/50 px-3 py-1.5 text-xs font-medium transition-colors shadow-md"
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
            <Sliders className="h-3.5 w-3.5 text-violet-400" />
            Curated DKA / HHS Clinical Scenarios
          </span>
          <span className="text-[11px] text-zinc-500">Live Invariant Probes</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadPreset("hypokalemia")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "hypokalemia"
                ? "bg-violet-950/40 border-violet-500/60 text-violet-200 shadow-md ring-1 ring-violet-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Samantha Hayes (22yo F)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-DKA-001
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Severe DKA, K+ 2.9 mEq/L (Lethal Hypokalemic Insulin Veto)</div>
          </button>

          <button
            onClick={() => handleLoadPreset("dextrose_omission")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "dextrose_omission"
                ? "bg-violet-950/40 border-violet-500/60 text-violet-200 shadow-md ring-1 ring-violet-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Brandon Lee (31yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CF-DKA-002
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Glucose 175 mg/dL with AG 13 (Dextrose Omission Veto)</div>
          </button>

          <button
            onClick={() => handleLoadPreset("bicarb_abuse")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "bicarb_abuse"
                ? "bg-violet-950/40 border-violet-500/60 text-violet-200 shadow-md ring-1 ring-violet-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Karen Phillips (48yo F)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-DKA-004
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">pH 7.15, Inappropriate Bicarbonate Infusion Order</div>
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
                    Gate: {report.trippedInvariants[idx] || "CF-DKA"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100 font-medium">{action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diagnostic Synthesis Cards: Anion Gap & Effective Osmolality */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Crisis Classification
          </span>
          <div className="text-sm font-bold text-violet-300 font-mono">
            {report.calculations.crisisClassification.replace(/_/g, " ")}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">ADA Hyperglycemia Criteria</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Serum Anion Gap
          </span>
          <div className="text-lg font-bold text-white font-mono">
            {report.calculations.anionGapMeqPerL} mEq/L
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Normal: &le; 12 mEq/L</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Corrected Sodium
          </span>
          <div className="text-lg font-bold text-white font-mono">
            {report.calculations.correctedSodiumMeqPerL} mEq/L
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Katz Formula (1.6 Factor)</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Effective Osmolality
          </span>
          <div className="text-lg font-bold text-white font-mono">
            {report.calculations.effectiveOsmolalityMOsmPerKg} mOsm/kg
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">&gt; 320 mOsm/kg = HHS Threshold</div>
        </div>
      </div>

      {/* Grid: Chemistry Inputs vs Protocol Resuscitation Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Serum Chemistry & Acid-Base Parameters */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-violet-400" />
              Serum Chemistry & Ketone Panel
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Weight: {weightKg} kg</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Serum Glucose (mg/dL)</label>
                <input
                  type="number"
                  min={40}
                  max={2000}
                  value={glucose}
                  onChange={(e) => setGlucose(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Potassium K+ (mEq/L)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1.5}
                  max={8.0}
                  value={potassium}
                  onChange={(e) => setPotassium(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&lt; 3.3 mEq/L = HOLD INSULIN</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Sodium Na+</label>
                <input
                  type="number"
                  min={100}
                  max={180}
                  value={sodium}
                  onChange={(e) => setSodium(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Chloride Cl-</label>
                <input
                  type="number"
                  min={70}
                  max={140}
                  value={chloride}
                  onChange={(e) => setChloride(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Bicarb HCO3-</label>
                <input
                  type="number"
                  min={1}
                  max={45}
                  value={bicarbonate}
                  onChange={(e) => setBicarbonate(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Arterial / Venous pH</label>
                <input
                  type="number"
                  step="0.01"
                  min={6.7}
                  max={7.6}
                  value={ph}
                  onChange={(e) => setPh(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Beta-Hydroxybutyrate</label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={20}
                  value={betaHydroxybutyrate}
                  onChange={(e) => setBetaHydroxybutyrate(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Two-Bag Titration & Potassium Checkpoint */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Two-Bag Resuscitation & Safety Checkpoints
            </span>
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded",
                report.potassiumCheckpointStatus === "HOLD_INSULIN_AGGRESSIVE_REPLETION"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              )}
            >
              {report.potassiumCheckpointStatus === "HOLD_INSULIN_AGGRESSIVE_REPLETION"
                ? "HOLD INSULIN"
                : "POTASSIUM SAFE"}
            </span>
          </div>

          <div className="space-y-3">
            {/* Fluid & Insulin Directives */}
            <div className="p-3 rounded-lg border border-violet-500/30 bg-violet-950/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-violet-300">Fluid Selection:</span>
                <span className="font-mono text-white">{report.calculations.recommendedIvFluidType}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-violet-300">Insulin Infusion:</span>
                <span className="font-mono text-white">
                  {report.calculations.recommendedInsulinRateUnitsPerHour} units/hr (0.1 u/kg/h)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-violet-300">Target Glycemic Plateau:</span>
                <span className="font-mono text-emerald-300">{report.calculations.targetGlucoseRangeMgPerDl}</span>
              </div>
            </div>

            {/* Active Therapy Toggles for Live Invariant Probing */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-400 block">
                Active Orders Under Audit (Test Invariant Triggers)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insulinActive}
                    onChange={(e) => setInsulinActive(e.target.checked)}
                    className="rounded border-zinc-700 text-violet-600 focus:ring-violet-500"
                  />
                  <span>Insulin Infusion Active</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dextroseActive}
                    onChange={(e) => setDextroseActive(e.target.checked)}
                    className="rounded border-zinc-700 text-violet-600 focus:ring-violet-500"
                  />
                  <span>Dextrose Infusion Active</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bicarbonateOrdered}
                    onChange={(e) => setBicarbonateOrdered(e.target.checked)}
                    className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Sodium Bicarbonate Ordered</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subqBasalHoursAgo !== undefined && subqBasalHoursAgo >= 2}
                    onChange={(e) => setSubqBasalHoursAgo(e.target.checked ? 2.5 : undefined)}
                    className="rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>SubQ Basal Overlap (&ge; 2h)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Guidance Footnote */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <Info className="h-4 w-4 text-violet-400" />
          Evidence-Based Endocrine Resuscitation Principles (FDA Non-Device CDS)
        </div>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">1. Potassium Safety Checkpoint:</strong> Insulin stimulates the Na⁺/K⁺-ATPase pump, rapidly translocating potassium from the extracellular space into skeletal muscle and hepatic cells. If insulin is started with a baseline serum potassium &lt; 3.3 mEq/L, it precipitates profound hypokalemia, lethal ventricular arrhythmias, and respiratory arrest. Insulin MUST be withheld until K⁺ ≥ 3.3 mEq/L.
        </p>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">2. Bicarbonate Paradoxical CNS Acidosis:</strong> Sodium bicarbonate administration in moderate DKA generates carbonic acid (H₂CO₃), which dissociates into H₂O and CO₂. While charged bicarbonate ions cross the blood-brain barrier slowly, lipid-soluble CO₂ rapidly diffuses into the cerebrospinal fluid, reacting to form carbonic acid and causing paradoxical, worsening intracellular CNS acidosis. Bicarbonate is contraindicated unless pH &lt; 6.90.
        </p>
      </div>
    </div>
  );
}
