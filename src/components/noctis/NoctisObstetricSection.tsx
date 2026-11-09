import React, { useState, useMemo } from "react";
import {
  Heart,
  Baby,
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
  Flame,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  classifyFetalHeartRate,
  calculateApgarScore,
  evaluateNeonatalResuscitation,
  evaluateObstetricNeonatalCare,
  formatObstetricSpokenSummary,
  OB_PRESET_CATEGORY_III_DISTRESS,
  NRP_PRESET_TERM_DEPRESSION,
  OB_PRESET_MAGNESIUM_TOXICITY,
  type FhrCategory,
  type FhrBaselineVariability,
  type FhrDecelerationType,
  type FetalHeartMonitoringProfile,
  type NeonatalResuscitationProfile,
  type MaternalMagnesiumProfile,
  type ObstetricEvaluationReport,
  type ApgarParameters,
} from "@/lib/noctis-obstetric-neonatal.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisObstetricSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisObstetricSection({ onSendToChat }: NoctisObstetricSectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("cat3_distress");

  // Fetal Monitoring State
  const [gestationalWeeks, setGestationalWeeks] = useState<number>(39);
  const [fhrBaselineBpm, setFhrBaselineBpm] = useState<number>(105);
  const [variability, setVariability] = useState<FhrBaselineVariability>("ABSENT");
  const [decelerations, setDecelerations] = useState<FhrDecelerationType>("LATE");
  const [oxytocinActive, setOxytocinActive] = useState<boolean>(true);
  const [uterineTachysystole, setUterineTachysystole] = useState<boolean>(true);

  // Neonatal NRP State
  const [neoBirthWeightGrams, setNeoBirthWeightGrams] = useState<number>(3400);
  const [neoSecondsSinceBirth, setNeoSecondsSinceBirth] = useState<number>(75);
  const [neoHeartRateBpm, setNeoHeartRateBpm] = useState<number>(72);
  const [neoBreathing, setNeoBreathing] = useState<boolean>(false);
  const [neoTone, setNeoTone] = useState<"FLACCID" | "SOME_FLEXION" | "ACTIVE">("FLACCID");
  const [neoInitialFiO2, setNeoInitialFiO2] = useState<number>(100); // 100% triggers CF-OB-002
  const [neoPpvInitiated, setNeoPpvInitiated] = useState<boolean>(false);

  // APGAR 1-Min State
  const [apgarParams, setApgarParams] = useState<ApgarParameters>({
    appearanceSkinColor: 0,
    pulseHeartRate: 1,
    grimaceReflex: 0,
    activityMuscleTone: 0,
    respirationEffort: 0,
  });

  // Maternal Magnesium State
  const [magInfusionActive, setMagInfusionActive] = useState<boolean>(false);
  const [magDtr, setMagDtr] = useState<"ABSENT" | "HYPOREFLEXIC" | "NORMAL" | "BRISK">("ABSENT");
  const [magRr, setMagRr] = useState<number>(9);
  const [magUop, setMagUop] = useState<number>(18);

  // Voice State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live Obstetric & Neonatal Evaluation Report
  const report = useMemo<ObstetricEvaluationReport>(() => {
    const fhrProfile: FetalHeartMonitoringProfile = {
      patientId: "OB-EVAL-001",
      patientName: "Rachel Vance (39w2d)",
      gestationalWeeks,
      fhrBaselineBpm,
      variability,
      decelerations,
      accelerationsPresent: false,
      uterineTachysystole,
      oxytocinInfusionActive: oxytocinActive,
    };

    const neonatalProfile: NeonatalResuscitationProfile = {
      neonatalId: "NEO-EVAL-001",
      gestationalAgeWeeks: gestationalWeeks,
      birthWeightGrams: neoBirthWeightGrams,
      secondsSinceBirth: neoSecondsSinceBirth,
      heartRateBpm: neoHeartRateBpm,
      isBreathingOrCrying: neoBreathing,
      muscleTone: neoTone,
      attemptedInitialFiO2Percent: neoInitialFiO2,
      ppvInitiated: neoPpvInitiated,
      chestCompressionsActive: neoHeartRateBpm < 60,
      apgar1Min: apgarParams,
    };

    const maternalMagnesium: MaternalMagnesiumProfile | undefined = magInfusionActive
      ? {
          maternalId: "OB-MAG-001",
          magnesiumInfusionGramsPerHour: 2.0,
          deepTendonReflexes: magDtr,
          respiratoryRatePerMin: magRr,
          urineOutputMlPerHour: magUop,
          serumMagnesiumMgPerDl: 9.8,
        }
      : undefined;

    return evaluateObstetricNeonatalCare({
      fhrProfile,
      neonatalProfile,
      maternalMagnesium,
    });
  }, [
    gestationalWeeks,
    fhrBaselineBpm,
    variability,
    decelerations,
    oxytocinActive,
    uterineTachysystole,
    neoBirthWeightGrams,
    neoSecondsSinceBirth,
    neoHeartRateBpm,
    neoBreathing,
    neoTone,
    neoInitialFiO2,
    neoPpvInitiated,
    apgarParams,
    magInfusionActive,
    magDtr,
    magRr,
    magUop,
  ]);

  // Load Curated Presets
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    if (key === "cat3_distress") {
      setGestationalWeeks(39);
      setFhrBaselineBpm(105);
      setVariability("ABSENT");
      setDecelerations("LATE");
      setOxytocinActive(true);
      setUterineTachysystole(true);
      setMagInfusionActive(false);
      setNeoSecondsSinceBirth(30);
      setNeoHeartRateBpm(130);
      setNeoBreathing(true);
      setNeoTone("ACTIVE");
      setNeoInitialFiO2(21);
      setNeoPpvInitiated(false);
    } else if (key === "neo_arrest") {
      setGestationalWeeks(39);
      setFhrBaselineBpm(140);
      setVariability("MODERATE");
      setDecelerations("NONE");
      setOxytocinActive(false);
      setUterineTachysystole(false);
      setMagInfusionActive(false);
      setNeoBirthWeightGrams(3400);
      setNeoSecondsSinceBirth(75);
      setNeoHeartRateBpm(72);
      setNeoBreathing(false);
      setNeoTone("FLACCID");
      setNeoInitialFiO2(100); // Probe CF-OB-002
      setNeoPpvInitiated(false); // Probe CF-OB-003
      setApgarParams({
        appearanceSkinColor: 0,
        pulseHeartRate: 1,
        grimaceReflex: 0,
        activityMuscleTone: 0,
        respirationEffort: 0,
      });
    } else if (key === "mag_toxicity") {
      setGestationalWeeks(34);
      setFhrBaselineBpm(130);
      setVariability("MINIMAL");
      setDecelerations("NONE");
      setOxytocinActive(false);
      setUterineTachysystole(false);
      setMagInfusionActive(true);
      setMagDtr("ABSENT");
      setMagRr(9);
      setMagUop(18);
    }
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatObstetricSpokenSummary(report);
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
    const prompt = `[Noctis Obstetric & Neonatal Resuscitation - FHR ${report.fhrCategory}] Gestation: ${gestationalWeeks}w. FHR Baseline: ${fhrBaselineBpm} bpm, Variability: ${variability}, Decels: ${decelerations}. NRP Phase: ${report.neonatalNrpStep}, Target FiO2: ${report.targetOxygenFiO2Range}. 1-Min APGAR: ${report.calculatedApgar1Min}/10. Invariants Tripped: ${report.trippedInvariants.join(", ") || "None"}. Mandated Actions: ${report.mandatoryActions.join(" | ") || "Routine intrapartum care."}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-pink-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/40">
              <Heart className="h-3.5 w-3.5" />
              TRACK 21 ENGINE
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-pink-500/20 px-2 py-0.5 text-xs font-semibold text-pink-300 border border-pink-500/40">
              NICHD / ACOG 3-Tier FHR
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/40">
              AAP / AHA NRP 8th Edition
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/40">
              Maternal Mag Safety
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Obstetric & Neonatal Resuscitation Protocol Engine
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-compensatory safety invariant gates: Category III emergent cesarean veto, neonatal hyperoxic brain injury veto, golden minute PPV delay veto, and maternal magnesium toxicity.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleVoice}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-md",
              isSpeaking
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-pink-500/20 text-pink-300 border border-pink-500/40 hover:bg-pink-500/30"
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
              className="flex items-center gap-1.5 rounded-lg bg-pink-600/30 hover:bg-pink-600/40 text-pink-200 border border-pink-500/50 px-3 py-1.5 text-xs font-medium transition-colors shadow-md"
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
            <Sliders className="h-3.5 w-3.5 text-pink-400" />
            Curated Obstetric & Neonatal Emergency Scenarios
          </span>
          <span className="text-[11px] text-zinc-500">Live Invariant Probes</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadPreset("cat3_distress")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "cat3_distress"
                ? "bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-md ring-1 ring-rose-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Rachel Vance (39w2d G2P1)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-OB-001
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Category III FHR: Absent variability + Recurrent Late Decels</div>
          </button>

          <button
            onClick={() => handleLoadPreset("neo_arrest")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "neo_arrest"
                ? "bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-md ring-1 ring-rose-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Baby Boy Vance (Term Neonate)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CF-OB-002 & 003
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Depressed Neonate at 75s, 100% O2 Free-Radical Risk</div>
          </button>

          <button
            onClick={() => handleLoadPreset("mag_toxicity")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "mag_toxicity"
                ? "bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-md ring-1 ring-rose-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Sarah Jenkins (34w Preeclampsia)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                CF-OB-004
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Magnesium Toxicity: Absent DTRs, RR 9/min, Calcium Antidote</div>
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
                    Gate: {report.trippedInvariants[idx] || "CF-OB"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100 font-medium">{action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid: Left Column FHR Monitor, Right Column NRP Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fetal Heart Rate Tracing Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              Intrapartum FHR Tracing (NICHD Classification)
            </span>
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded uppercase",
                report.fhrCategory === "CATEGORY_I"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : report.fhrCategory === "CATEGORY_II"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
              )}
            >
              {report.fhrCategory.replace("_", " ")}
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">FHR Baseline (bpm)</label>
                <input
                  type="number"
                  min={50}
                  max={220}
                  value={fhrBaselineBpm}
                  onChange={(e) => setFhrBaselineBpm(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Baseline Variability</label>
                <select
                  value={variability}
                  onChange={(e) => setVariability(e.target.value as FhrBaselineVariability)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                >
                  <option value="ABSENT">Absent (Undetectable amplitude)</option>
                  <option value="MINIMAL">Minimal (&le;5 bpm)</option>
                  <option value="MODERATE">Moderate (6-25 bpm - Normal)</option>
                  <option value="MARKED">Marked (&gt;25 bpm)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Deceleration Pattern</label>
                <select
                  value={decelerations}
                  onChange={(e) => setDecelerations(e.target.value as FhrDecelerationType)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                >
                  <option value="NONE">None</option>
                  <option value="EARLY">Early (Head compression - Benign)</option>
                  <option value="VARIABLE">Variable (Cord compression)</option>
                  <option value="LATE">Late (Uteroplacental insufficiency)</option>
                  <option value="PROLONGED">Prolonged (&ge;2 min to &lt;10 min)</option>
                  <option value="SINUSOIDAL">Sinusoidal (Severe fetal anemia/acidemia)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Gestational Age (Weeks)</label>
                <input
                  type="number"
                  min={24}
                  max={42}
                  value={gestationalWeeks}
                  onChange={(e) => setGestationalWeeks(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* High-Risk Intrapartum Interventions Toggles */}
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={oxytocinActive}
                  onChange={(e) => setOxytocinActive(e.target.checked)}
                  className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500"
                />
                <span>Oxytocin Infusion Active</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uterineTachysystole}
                  onChange={(e) => setUterineTachysystole(e.target.checked)}
                  className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500"
                />
                <span>Uterine Tachysystole (&gt;5/10min)</span>
              </label>
            </div>

            {/* Intrauterine Resuscitation Card */}
            {report.intrauterineResuscitationRequired && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <Flame className="h-4 w-4" />
                  Mandatory Intrauterine Resuscitation Directives
                </div>
                <ul className="text-xs text-rose-100 space-y-1 pl-4 list-disc">
                  <li><strong>Stop Oxytocin immediately</strong> to relieve uterine hyperstimulation.</li>
                  <li><strong>Left lateral tilt / maternal repositioning</strong> to relieve IVC/aortocaval compression.</li>
                  <li><strong>High-flow oxygen (10 L/min non-rebreather)</strong> for maternal hyperoxygenation.</li>
                  <li><strong>500-1000 mL IV crystalloid fluid bolus</strong> to maximize placental perfusion.</li>
                  <li><strong>Prepare for Emergent Operative Delivery</strong> if no recovery within 10-15 minutes.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Neonatal Resuscitation Program (NRP 8th Ed) Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Baby className="h-3.5 w-3.5 text-pink-400" />
              NRP 8th Edition Resuscitation Monitor
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Phase: {report.neonatalNrpStep.replace(/_/g, " ")}
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Time Post-Birth (Seconds)</label>
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={neoSecondsSinceBirth}
                  onChange={(e) => setNeoSecondsSinceBirth(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  min={0}
                  max={220}
                  value={neoHeartRateBpm}
                  onChange={(e) => setNeoHeartRateBpm(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Attempted Initial FiO2 (%)</label>
                <input
                  type="number"
                  min={21}
                  max={100}
                  value={neoInitialFiO2}
                  onChange={(e) => setNeoInitialFiO2(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-pink-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  Term: Start at 21% (Room Air). Preterm: 21-30%.
                </span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">PPV Initiated?</label>
                <select
                  value={neoPpvInitiated ? "YES" : "NO"}
                  onChange={(e) => setNeoPpvInitiated(e.target.value === "YES")}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-pink-500 focus:outline-none"
                >
                  <option value="NO">No PPV Active (Probe Golden Minute)</option>
                  <option value="YES">Yes, PPV Initiated (40-60 bpm)</option>
                </select>
              </div>
            </div>

            {/* APGAR 1-Minute Score Breakdown */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400">1-Minute APGAR Score</span>
                <span
                  className={cn(
                    "text-xs font-mono font-bold px-2 py-0.5 rounded",
                    (report.calculatedApgar1Min ?? 0) >= 7
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : (report.calculatedApgar1Min ?? 0) >= 4
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  )}
                >
                  {report.calculatedApgar1Min} / 10
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                <div className="bg-zinc-900 p-1 rounded border border-zinc-800">
                  <div className="text-zinc-500">Color</div>
                  <div className="font-bold text-white">{apgarParams.appearanceSkinColor}</div>
                </div>
                <div className="bg-zinc-900 p-1 rounded border border-zinc-800">
                  <div className="text-zinc-500">Pulse</div>
                  <div className="font-bold text-white">{apgarParams.pulseHeartRate}</div>
                </div>
                <div className="bg-zinc-900 p-1 rounded border border-zinc-800">
                  <div className="text-zinc-500">Grimace</div>
                  <div className="font-bold text-white">{apgarParams.grimaceReflex}</div>
                </div>
                <div className="bg-zinc-900 p-1 rounded border border-zinc-800">
                  <div className="text-zinc-500">Activity</div>
                  <div className="font-bold text-white">{apgarParams.activityMuscleTone}</div>
                </div>
                <div className="bg-zinc-900 p-1 rounded border border-zinc-800">
                  <div className="text-zinc-500">Resp</div>
                  <div className="font-bold text-white">{apgarParams.respirationEffort}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maternal Magnesium Sulfate Safety Monitor */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-purple-400" />
            Maternal Magnesium Sulfate Toxicity & Antidote Surveillance
          </span>
          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={magInfusionActive}
              onChange={(e) => setMagInfusionActive(e.target.checked)}
              className="rounded border-zinc-700 text-purple-600 focus:ring-purple-500"
            />
            <span>Magnesium Sulfate Infusion Active</span>
          </label>
        </div>

        {magInfusionActive && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Deep Tendon Reflexes (Patellar)</label>
              <select
                value={magDtr}
                onChange={(e) => setMagDtr(e.target.value as any)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
              >
                <option value="BRISK">Brisk (+3/+4)</option>
                <option value="NORMAL">Normal (+2)</option>
                <option value="HYPOREFLEXIC">Hyporeflexic (+1)</option>
                <option value="ABSENT">Absent (0 - Early Toxicity Hallmark)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Respiratory Rate (/min)</label>
              <input
                type="number"
                min={4}
                max={40}
                value={magRr}
                onChange={(e) => setMagRr(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500 block mt-0.5">&lt; 12/min = Impending Respiratory Arrest</span>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Urine Output (mL/hr)</label>
              <input
                type="number"
                min={0}
                max={200}
                value={magUop}
                onChange={(e) => setMagUop(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500 block mt-0.5">&lt; 30 mL/hr = Magnesium Accumulation Risk</span>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Guidance Footnote */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <Info className="h-4 w-4 text-rose-400" />
          Clinical Physiology & NRP 8th Edition Invariants (FDA Non-Device CDS)
        </div>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">1. Neonatal Hyperoxic Reperfusion Toxicity:</strong> Resuscitation of term and late-preterm neonates (&ge;35 weeks) with 100% oxygen leads to excessive reactive oxygen species (ROS) formation, cerebral vasoconstriction, impaired myocardial function, and increased mortality. Initial resuscitation must begin at 21% (room air) and be titrated against pre-ductal target saturation tables.
        </p>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">2. Calcium Gluconate Competitive Antidote:</strong> Magnesium acts as a competitive antagonist of calcium at the presynaptic motor endplate, inhibiting acetylcholine release. Calcium gluconate (1g IV of 10% solution over 3 minutes) immediately displaces magnesium from calcium channels, reversing neuromuscular blockade and respiratory depression.
        </p>
      </div>
    </div>
  );
}
