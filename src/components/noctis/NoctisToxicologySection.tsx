import React, { useState, useMemo } from "react";
import {
  Skull,
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
  Pill,
  Droplets,
  Sliders,
  ArrowRight,
  TrendingDown,
  Info,
  Clock,
  Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  calculateRumackMatthewThreshold,
  calculateNac3BagRegimen,
  calculateDigiFabVials,
  classifyToxidrome,
  evaluateToxicologyCase,
  formatToxicologySpokenSummary,
  TOX_PRESET_APAP_DELAYED,
  TOX_PRESET_CCB_SHOCK,
  TOX_PRESET_SEROTONIN_SYNDROME,
  TOX_PRESET_BENZO_CHRONIC,
  type PatientToxProfile,
  type ToxidromeType,
  type PupilExam,
  type SkinExam,
  type BowelSoundsExam,
  type NeuromuscularExam,
} from "@/lib/noctis-toxicology.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisToxicologySectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisToxicologySection({ onSendToChat }: NoctisToxicologySectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("apap");

  // Patient Demographic & Ingestion Parameters
  const [patientId, setPatientId] = useState<string>("TOX-APAP-001");
  const [patientName, setPatientName] = useState<string>("Chloe Martin (22yo F - Acute APAP Overdose)");
  const [ageYears, setAgeYears] = useState<number>(22);
  const [weightKg, setWeightKg] = useState<number>(60);
  const [suspectedToxins, setSuspectedToxins] = useState<string[]>(["Acetaminophen 500mg"]);
  const [ingestionTimeHoursAgo, setIngestionTimeHoursAgo] = useState<number>(10);

  // Vitals
  const [heartRateBpm, setHeartRateBpm] = useState<number>(92);
  const [bloodPressureSystolic, setBloodPressureSystolic] = useState<number>(118);
  const [bloodPressureDiastolic, setBloodPressureDiastolic] = useState<number>(74);
  const [respiratoryRatePerMin, setRespiratoryRatePerMin] = useState<number>(16);
  const [temperatureCelsius, setTemperatureCelsius] = useState<number>(36.9);

  // Physical Exam
  const [pupils, setPupils] = useState<PupilExam>("NORMAL");
  const [skin, setSkin] = useState<SkinExam>("NORMAL");
  const [bowelSounds, setBowelSounds] = useState<BowelSoundsExam>("NORMAL");
  const [neuromuscular, setNeuromuscular] = useState<NeuromuscularExam>("NORMAL_OR_DEPRESSED");
  const [mentalStatus, setMentalStatus] = useState<"ALERT" | "AGITATED_DELIRIOUS" | "STUPOROUS_COMATOSE">("ALERT");

  // Specific Laboratory Measurements
  const [serumAcetaminophenMcgPerMl, setSerumAcetaminophenMcgPerMl] = useState<number | undefined>(140);
  const [serumSalicylateMgPerDl, setSerumSalicylateMgPerDl] = useState<number | undefined>(undefined);
  const [serumDigoxinNgPerMl, setSerumDigoxinNgPerMl] = useState<number | undefined>(undefined);
  const [arterialPh, setArterialPh] = useState<number | undefined>(undefined);
  const [chronicBenzodiazepineUser, setChronicBenzodiazepineUser] = useState<boolean>(false);
  const [cyclicAntidepressantSuspected, setCyclicAntidepressantSuspected] = useState<boolean>(false);

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live Patient Profile
  const patientProfile = useMemo<PatientToxProfile>(() => {
    return {
      patientId,
      patientName,
      ageYears,
      weightKg,
      suspectedToxins,
      ingestionTimeHoursAgo,
      heartRateBpm,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      respiratoryRatePerMin,
      temperatureCelsius,
      pupils,
      skin,
      bowelSounds,
      neuromuscular,
      mentalStatus,
      serumAcetaminophenMcgPerMl,
      serumSalicylateMgPerDl,
      serumDigoxinNgPerMl,
      arterialPh,
      chronicBenzodiazepineUser,
      cyclicAntidepressantSuspected,
    };
  }, [
    patientId,
    patientName,
    ageYears,
    weightKg,
    suspectedToxins,
    ingestionTimeHoursAgo,
    heartRateBpm,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    respiratoryRatePerMin,
    temperatureCelsius,
    pupils,
    skin,
    bowelSounds,
    neuromuscular,
    mentalStatus,
    serumAcetaminophenMcgPerMl,
    serumSalicylateMgPerDl,
    serumDigoxinNgPerMl,
    arterialPh,
    chronicBenzodiazepineUser,
    cyclicAntidepressantSuspected,
  ]);

  // Live Toxicology Report
  const report = useMemo(() => {
    return evaluateToxicologyCase(patientProfile);
  }, [patientProfile]);

  // Load Presets
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    if (key === "apap") {
      const p = TOX_PRESET_APAP_DELAYED;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setSuspectedToxins(p.suspectedToxins);
      setIngestionTimeHoursAgo(p.ingestionTimeHoursAgo);
      setHeartRateBpm(p.heartRateBpm);
      setBloodPressureSystolic(p.bloodPressureSystolic);
      setBloodPressureDiastolic(p.bloodPressureDiastolic);
      setRespiratoryRatePerMin(p.respiratoryRatePerMin);
      setTemperatureCelsius(p.temperatureCelsius);
      setPupils(p.pupils);
      setSkin(p.skin);
      setBowelSounds(p.bowelSounds);
      setNeuromuscular(p.neuromuscular);
      setMentalStatus(p.mentalStatus);
      setSerumAcetaminophenMcgPerMl(p.serumAcetaminophenMcgPerMl);
      setSerumSalicylateMgPerDl(undefined);
      setSerumDigoxinNgPerMl(undefined);
      setChronicBenzodiazepineUser(false);
      setCyclicAntidepressantSuspected(false);
    } else if (key === "ccb") {
      const p = TOX_PRESET_CCB_SHOCK;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setSuspectedToxins(p.suspectedToxins);
      setIngestionTimeHoursAgo(p.ingestionTimeHoursAgo);
      setHeartRateBpm(p.heartRateBpm);
      setBloodPressureSystolic(p.bloodPressureSystolic);
      setBloodPressureDiastolic(p.bloodPressureDiastolic);
      setRespiratoryRatePerMin(p.respiratoryRatePerMin);
      setTemperatureCelsius(p.temperatureCelsius);
      setPupils(p.pupils);
      setSkin(p.skin);
      setBowelSounds(p.bowelSounds);
      setNeuromuscular(p.neuromuscular);
      setMentalStatus(p.mentalStatus);
      setSerumAcetaminophenMcgPerMl(undefined);
      setSerumSalicylateMgPerDl(undefined);
      setSerumDigoxinNgPerMl(undefined);
      setChronicBenzodiazepineUser(false);
      setCyclicAntidepressantSuspected(false);
    } else if (key === "serotonin") {
      const p = TOX_PRESET_SEROTONIN_SYNDROME;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setSuspectedToxins(p.suspectedToxins);
      setIngestionTimeHoursAgo(p.ingestionTimeHoursAgo);
      setHeartRateBpm(p.heartRateBpm);
      setBloodPressureSystolic(p.bloodPressureSystolic);
      setBloodPressureDiastolic(p.bloodPressureDiastolic);
      setRespiratoryRatePerMin(p.respiratoryRatePerMin);
      setTemperatureCelsius(p.temperatureCelsius);
      setPupils(p.pupils);
      setSkin(p.skin);
      setBowelSounds(p.bowelSounds);
      setNeuromuscular(p.neuromuscular);
      setMentalStatus(p.mentalStatus);
      setSerumAcetaminophenMcgPerMl(undefined);
      setSerumSalicylateMgPerDl(undefined);
      setSerumDigoxinNgPerMl(undefined);
      setChronicBenzodiazepineUser(false);
      setCyclicAntidepressantSuspected(false);
    } else if (key === "benzo") {
      const p = TOX_PRESET_BENZO_CHRONIC;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setSuspectedToxins(p.suspectedToxins);
      setIngestionTimeHoursAgo(p.ingestionTimeHoursAgo);
      setHeartRateBpm(p.heartRateBpm);
      setBloodPressureSystolic(p.bloodPressureSystolic);
      setBloodPressureDiastolic(p.bloodPressureDiastolic);
      setRespiratoryRatePerMin(p.respiratoryRatePerMin);
      setTemperatureCelsius(p.temperatureCelsius);
      setPupils(p.pupils);
      setSkin(p.skin);
      setBowelSounds(p.bowelSounds);
      setNeuromuscular(p.neuromuscular);
      setMentalStatus(p.mentalStatus);
      setSerumAcetaminophenMcgPerMl(undefined);
      setSerumSalicylateMgPerDl(undefined);
      setSerumDigoxinNgPerMl(undefined);
      setChronicBenzodiazepineUser(true);
      setCyclicAntidepressantSuspected(false);
    }
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatToxicologySpokenSummary(report);
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
    const prompt = `[Noctis Clinical Toxicology & Resuscitation Assessment - ${report.patientName}] Identified Toxidrome: ${report.detectedToxidrome} (${report.toxidromeConfidence} confidence). Vitals: HR ${heartRateBpm} bpm, BP ${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg, Temp ${temperatureCelsius}°C, RR ${respiratoryRatePerMin}/min. Physical Exam: Pupils ${pupils}, Skin ${skin}, Bowel Sounds ${bowelSounds}, Tone ${neuromuscular}. Ingestion: ${suspectedToxins.join(", ")} at ${ingestionTimeHoursAgo}h ago. APAP Level: ${serumAcetaminophenMcgPerMl || "N/A"} mcg/mL. Tripped Invariants: ${report.trippedInvariants.join(", ") || "None"}. Antidote Orders: ${report.immediateAntidoteDirectives.join(" | ") || "Supportive care."}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-red-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Skull className="size-3 text-amber-400" /> Clinical Toxicology
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              21 U.S.C. § 360j(o)(1)(E)
            </span>
            <span className="rounded bg-red-600/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-300">
              Rumack-Matthew &amp; Hunter Criteria
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mt-1">
            Clinical Toxicology &amp; Emergency Toxidrome Resuscitation Engine
          </h2>
          <p className="text-xs text-white/60">
            Rumack-Matthew APAP nomogram with 3-bag IV NAC infusion, Hunter Serotonin Syndrome criteria, High-Dose Insulin (HIET), and Flumazenil veto.
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
                : "bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border-amber-500/40"
            )}
          >
            {isSpeaking ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Readout
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-amber-300" /> Read Aloud (Full Antidotes)
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
          Clinical Overdoses:
        </span>
        <button
          type="button"
          onClick={() => handleLoadPreset("apap")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "apap"
              ? "bg-amber-950/60 border-amber-500/60 text-amber-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-amber-400 font-bold mr-1">&bull;</span> Acute APAP (140 mcg/mL at 10h, Delayed NAC Veto)
        </button>
        <button
          type="button"
          onClick={() => handleLoadPreset("ccb")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "ccb"
              ? "bg-rose-950/60 border-rose-500/60 text-rose-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-rose-400 font-bold mr-1">&bull;</span> Diltiazem Shock (HR 38, BP 72/44, HIET &amp; Intralipid)
        </button>
        <button
          type="button"
          onClick={() => handleLoadPreset("serotonin")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "serotonin"
              ? "bg-purple-950/60 border-purple-500/60 text-purple-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-purple-400 font-bold mr-1">&bull;</span> Serotonin Syndrome (Clonus, Temp 39.2°C, Cyproheptadine)
        </button>
        <button
          type="button"
          onClick={() => handleLoadPreset("benzo")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "benzo"
              ? "bg-blue-950/60 border-blue-500/60 text-blue-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-blue-400 font-bold mr-1">&bull;</span> Chronic Benzo User (CF-TOX-001 Flumazenil Veto)
        </button>
      </div>

      {/* Tripped Invariants Banner */}
      {report.trippedInvariants.length > 0 && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="size-4 text-rose-400 animate-pulse" />
            CRITICAL TOXICOLOGY SAFETY INVARIANT VETO TRIPPED ({report.trippedInvariants.join(", ")})
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
        {/* Left Column: Physical Exam Cockpit & Toxin Biomarkers */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sliders className="size-4" /> Toxidrome Physical Exam &amp; Vitals
            </h3>

            {/* Vitals Strip */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded bg-black/60 border border-white/10 p-2">
                <div className="text-[9px] text-white/50 uppercase font-bold">HR (bpm)</div>
                <input
                  type="number"
                  value={heartRateBpm}
                  onChange={(e) => setHeartRateBpm(Number(e.target.value))}
                  className="w-full bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
              <div className="rounded bg-black/60 border border-white/10 p-2">
                <div className="text-[9px] text-white/50 uppercase font-bold">BP (sys)</div>
                <input
                  type="number"
                  value={bloodPressureSystolic}
                  onChange={(e) => setBloodPressureSystolic(Number(e.target.value))}
                  className="w-full bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
              <div className="rounded bg-black/60 border border-white/10 p-2">
                <div className="text-[9px] text-white/50 uppercase font-bold">RR (/min)</div>
                <input
                  type="number"
                  value={respiratoryRatePerMin}
                  onChange={(e) => setRespiratoryRatePerMin(Number(e.target.value))}
                  className="w-full bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
              <div className="rounded bg-black/60 border border-white/10 p-2">
                <div className="text-[9px] text-white/50 uppercase font-bold">Temp (°C)</div>
                <input
                  type="number"
                  step={0.1}
                  value={temperatureCelsius}
                  onChange={(e) => setTemperatureCelsius(Number(e.target.value))}
                  className="w-full bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Physical Exam Toggles */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              {/* Pupils */}
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">Pupils</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(["MIOSIS", "NORMAL", "MYDRIASIS"] as PupilExam[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPupils(p)}
                      className={cn(
                        "py-1 text-[11px] font-semibold rounded border transition",
                        pupils === p
                          ? "bg-amber-600 text-white border-amber-500"
                          : "bg-white/5 text-white/60 border-white/10"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin */}
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">Skin</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(["DIAPHORETIC", "NORMAL", "DRY_FLUSHED"] as SkinExam[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSkin(s)}
                      className={cn(
                        "py-1 text-[11px] font-semibold rounded border transition",
                        skin === s
                          ? "bg-amber-600 text-white border-amber-500"
                          : "bg-white/5 text-white/60 border-white/10"
                      )}
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bowel Sounds */}
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">Bowel Sounds</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(["HYPERACTIVE", "NORMAL", "HYPOACTIVE_ABSENT"] as BowelSoundsExam[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBowelSounds(b)}
                      className={cn(
                        "py-1 text-[11px] font-semibold rounded border transition",
                        bowelSounds === b
                          ? "bg-amber-600 text-white border-amber-500"
                          : "bg-white/5 text-white/60 border-white/10"
                      )}
                    >
                      {b.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Neuromuscular Tone */}
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">Neuromuscular Exam</label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {(["CLONUS_HYPERREFLEXIA", "LEAD_PIPE_RIGIDITY", "TREMOR_FASCICULATIONS", "NORMAL_OR_DEPRESSED"] as NeuromuscularExam[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNeuromuscular(n)}
                      className={cn(
                        "py-1 text-[10px] font-semibold rounded border transition text-center px-1",
                        neuromuscular === n
                          ? "bg-purple-600 text-white border-purple-500"
                          : "bg-white/5 text-white/60 border-white/10"
                      )}
                    >
                      {n.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Toxic Biomarkers */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Toxic Ingestion Biomarkers
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-white/60 uppercase">Acetaminophen (mcg/mL)</label>
                  <input
                    type="number"
                    value={serumAcetaminophenMcgPerMl ?? ""}
                    placeholder="e.g. 140"
                    onChange={(e) => setSerumAcetaminophenMcgPerMl(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full mt-1 bg-black/60 border border-white/20 rounded px-2.5 py-1 text-xs font-mono text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/60 uppercase">Post-Ingestion Hours</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={ingestionTimeHoursAgo}
                    onChange={(e) => setIngestionTimeHoursAgo(Number(e.target.value))}
                    className="w-full mt-1 bg-black/60 border border-white/20 rounded px-2.5 py-1 text-xs font-mono text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Safety Veto Probe Toggles */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setChronicBenzodiazepineUser(!chronicBenzodiazepineUser)}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-semibold border transition",
                    chronicBenzodiazepineUser
                      ? "bg-rose-600/30 border-rose-500/50 text-rose-300"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  )}
                >
                  {chronicBenzodiazepineUser ? "Chronic Benzo User (Active)" : "Toggle Chronic Benzo Use"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Rumack-Matthew SVG Nomogram & Antidote Directives */}
        <div className="lg:col-span-7 space-y-4">
          {/* Identified Toxidrome HUD */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="size-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Identified Toxidrome Profile
                </span>
              </div>
              <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
                {report.toxidromeConfidence} CONFIDENCE
              </span>
            </div>
            <div className="text-lg font-bold text-white tracking-wide">
              {report.detectedToxidrome.replace(/_/g, " ")}
            </div>
            <div className="text-xs text-white/70">
              {report.clinicalFindings.join("; ")}
            </div>
          </div>

          {/* Interactive Rumack-Matthew Nomogram SVG Chart */}
          {serumAcetaminophenMcgPerMl !== undefined && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Activity className="size-4" /> Rumack-Matthew Acetaminophen Nomogram
                </h4>
                <span className="text-[10px] text-white/50 font-mono">Treatment Line: 150 mcg/mL at 4h</span>
              </div>

              {/* SVG Nomogram */}
              <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                <svg viewBox="0 0 400 200" className="w-full h-44 overflow-visible font-mono text-[9px]">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.06)" />
                  <line x1="40" y1="60" x2="380" y2="60" stroke="rgba(255,255,255,0.06)" />
                  <line x1="40" y1="100" x2="380" y2="100" stroke="rgba(255,255,255,0.06)" />
                  <line x1="40" y1="140" x2="380" y2="140" stroke="rgba(255,255,255,0.06)" />
                  <line x1="40" y1="180" x2="380" y2="180" stroke="rgba(255,255,255,0.3)" />
                  <line x1="40" y1="20" x2="40" y2="180" stroke="rgba(255,255,255,0.3)" />

                  {/* Y-Axis Labels (mcg/mL) */}
                  <text x="35" y="24" fill="rgba(255,255,255,0.5)" textAnchor="end">300</text>
                  <text x="35" y="64" fill="rgba(255,255,255,0.5)" textAnchor="end">150</text>
                  <text x="35" y="104" fill="rgba(255,255,255,0.5)" textAnchor="end">75</text>
                  <text x="35" y="144" fill="rgba(255,255,255,0.5)" textAnchor="end">37.5</text>
                  <text x="35" y="184" fill="rgba(255,255,255,0.5)" textAnchor="end">0</text>

                  {/* X-Axis Labels (Hours) */}
                  <text x="40" y="195" fill="rgba(255,255,255,0.5)" textAnchor="middle">4h</text>
                  <text x="125" y="195" fill="rgba(255,255,255,0.5)" textAnchor="middle">8h</text>
                  <text x="210" y="195" fill="rgba(255,255,255,0.5)" textAnchor="middle">12h</text>
                  <text x="295" y="195" fill="rgba(255,255,255,0.5)" textAnchor="middle">16h</text>
                  <text x="380" y="195" fill="rgba(255,255,255,0.5)" textAnchor="middle">24h</text>

                  {/* Rumack-Matthew 150-Treatment Line Path */}
                  {/* (4h, 150 mcg/mL) -> (8h, 75) -> (12h, 37.5) -> (16h, 18.8) -> (24h, 4.7) */}
                  <path
                    d="M 40 60 Q 180 120 380 175"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />

                  {/* Shaded Toxic Zone (above line) */}
                  <path
                    d="M 40 60 Q 180 120 380 175 L 380 20 L 40 20 Z"
                    fill="rgba(245, 158, 11, 0.08)"
                  />

                  {/* Plotted Patient Point */}
                  {(() => {
                    const h = Math.max(4, Math.min(24, ingestionTimeHoursAgo));
                    const x = 40 + ((h - 4) / 20) * 340;
                    const level = Math.max(0, Math.min(300, serumAcetaminophenMcgPerMl));
                    const y = 180 - (level / 300) * 160;
                    const isAbove = level >= calculateRumackMatthewThreshold(h);

                    return (
                      <g>
                        <circle
                          cx={x}
                          cy={y}
                          r="6"
                          className={cn(isAbove ? "fill-rose-500" : "fill-emerald-400")}
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="10"
                          fill="none"
                          stroke={isAbove ? "#f43f5e" : "#34d399"}
                          strokeWidth="1.5"
                          className="animate-ping"
                        />
                        <text
                          x={x}
                          y={Math.max(15, y - 10)}
                          fill={isAbove ? "#f43f5e" : "#34d399"}
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {level} mcg/mL ({h}h)
                        </text>
                      </g>
                    );
                  })()}
                </svg>

                <div className="flex justify-between items-center text-[10px] text-white/60 pt-2 border-t border-white/5">
                  <span className="text-amber-400 font-bold">&mdash; Treatment Line (150-Line)</span>
                  <span className={report.rumackMatthew?.treatmentIndicated ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                    Status: {report.rumackMatthew?.treatmentIndicated ? "TOXIC (NAC Indicated)" : "NON-TOXIC"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Antidote Resuscitation Directives */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 to-black/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Droplets className="size-4 text-amber-400" />
              TARGETED ANTIDOTE RESUSCITATION ORDERS
            </div>

            {report.immediateAntidoteDirectives.length > 0 ? (
              <div className="space-y-2">
                {report.immediateAntidoteDirectives.map((dir, i) => (
                  <div key={i} className="rounded-lg bg-black/60 border border-white/10 p-3 text-xs leading-relaxed text-white">
                    <span className="text-amber-400 font-bold mr-1.5">&bull;</span>
                    {dir}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-white/60">
                No immediate specific antidotes indicated. Maintain supportive resuscitation.
              </div>
            )}

            {/* 3-Bag NAC Schedule Breakdown */}
            {report.rumackMatthew?.treatmentIndicated && (
              <div className="pt-2 border-t border-white/10 space-y-1.5 font-mono text-[11px]">
                <div className="text-[10px] uppercase font-bold text-amber-300">IV NAC 3-Bag Schedule ({weightKg} kg):</div>
                <div className="rounded bg-black/40 p-2 border border-white/5 text-amber-200">
                  {report.rumackMatthew.nacRegimen.loadingBag}
                </div>
                <div className="rounded bg-black/40 p-2 border border-white/5 text-white/80">
                  {report.rumackMatthew.nacRegimen.secondBag}
                </div>
                <div className="rounded bg-black/40 p-2 border border-white/5 text-white/80">
                  {report.rumackMatthew.nacRegimen.thirdBag}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
