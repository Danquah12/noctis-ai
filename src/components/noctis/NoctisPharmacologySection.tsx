import React, { useState, useMemo } from "react";
import {
  Pill,
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
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  calculateTisdaleScore,
  evaluatePharmacologyMatrix,
  formatPharmacologySpokenSummary,
  PHARM_PRESET_TORSADES,
  PHARM_PRESET_SEROTONIN,
  PHARM_PRESET_TRANSPLANT_INDUCTION,
  type PatientPharmacologyProfile,
  type PharmacologyEvaluationReport,
} from "@/lib/noctis-pharmacology-matrix.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisPharmacologySectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisPharmacologySection({ onSendToChat }: NoctisPharmacologySectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("torsades");

  // Patient parameters
  const [patientId, setPatientId] = useState<string>(PHARM_PRESET_TORSADES.patientId);
  const [patientName, setPatientName] = useState<string>(PHARM_PRESET_TORSADES.patientName);
  const [ageYears, setAgeYears] = useState<number>(PHARM_PRESET_TORSADES.ageYears);
  const [biologicalSex, setBiologicalSex] = useState<"MALE" | "FEMALE">(PHARM_PRESET_TORSADES.biologicalSex);
  const [baselineQtcMs, setBaselineQtcMs] = useState<number>(PHARM_PRESET_TORSADES.baselineQtcMs);
  const [serumPotassium, setSerumPotassium] = useState<number>(PHARM_PRESET_TORSADES.serumPotassiumMeqPerL);
  const [hasAcuteMi, setHasAcuteMi] = useState<boolean>(PHARM_PRESET_TORSADES.hasAcuteMi);
  const [hasHeartFailure, setHasHeartFailure] = useState<boolean>(PHARM_PRESET_TORSADES.hasHeartFailure);
  const [hasSepsis, setHasSepsis] = useState<boolean>(PHARM_PRESET_TORSADES.hasSepsis);
  const [takingLoopDiuretic, setTakingLoopDiuretic] = useState<boolean>(PHARM_PRESET_TORSADES.takingLoopDiuretic);

  // Active Medications
  const [activeMeds, setActiveMeds] = useState<PatientPharmacologyProfile["activeMedications"]>(
    PHARM_PRESET_TORSADES.activeMedications
  );

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live Pharmacology Evaluation Report
  const report = useMemo<PharmacologyEvaluationReport>(() => {
    return evaluatePharmacologyMatrix({
      patientId,
      patientName,
      ageYears,
      biologicalSex,
      baselineQtcMs,
      serumPotassiumMeqPerL: serumPotassium,
      hasAcuteMi,
      hasHeartFailure,
      hasSepsis,
      takingLoopDiuretic,
      activeMedications: activeMeds,
    });
  }, [
    patientId,
    patientName,
    ageYears,
    biologicalSex,
    baselineQtcMs,
    serumPotassium,
    hasAcuteMi,
    hasHeartFailure,
    hasSepsis,
    takingLoopDiuretic,
    activeMeds,
  ]);

  // Handle Preset Load
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    if (key === "torsades") {
      const p = PHARM_PRESET_TORSADES;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setBiologicalSex(p.biologicalSex);
      setBaselineQtcMs(p.baselineQtcMs);
      setSerumPotassium(p.serumPotassiumMeqPerL);
      setHasAcuteMi(p.hasAcuteMi);
      setHasHeartFailure(p.hasHeartFailure);
      setHasSepsis(p.hasSepsis);
      setTakingLoopDiuretic(p.takingLoopDiuretic);
      setActiveMeds(p.activeMedications);
    } else if (key === "serotonin") {
      const p = PHARM_PRESET_SEROTONIN;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setBiologicalSex(p.biologicalSex);
      setBaselineQtcMs(p.baselineQtcMs);
      setSerumPotassium(p.serumPotassiumMeqPerL);
      setHasAcuteMi(p.hasAcuteMi);
      setHasHeartFailure(p.hasHeartFailure);
      setHasSepsis(p.hasSepsis);
      setTakingLoopDiuretic(p.takingLoopDiuretic);
      setActiveMeds(p.activeMedications);
    } else if (key === "transplant") {
      const p = PHARM_PRESET_TRANSPLANT_INDUCTION;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setBiologicalSex(p.biologicalSex);
      setBaselineQtcMs(p.baselineQtcMs);
      setSerumPotassium(p.serumPotassiumMeqPerL);
      setHasAcuteMi(p.hasAcuteMi);
      setHasHeartFailure(p.hasHeartFailure);
      setHasSepsis(p.hasSepsis);
      setTakingLoopDiuretic(p.takingLoopDiuretic);
      setActiveMeds(p.activeMedications);
    } else if (key === "triple") {
      setPatientId("PHARM-TRIPLE-004");
      setPatientName("James Carter (65yo M - Triple Therapy)");
      setAgeYears(65);
      setBiologicalSex("MALE");
      setBaselineQtcMs(410);
      setSerumPotassium(4.2);
      setHasAcuteMi(false);
      setHasHeartFailure(false);
      setHasSepsis(false);
      setTakingLoopDiuretic(false);
      setActiveMeds([
        { drugName: "Aspirin", doseMg: 81, cypRole: "ANTIPLATELET" },
        { drugName: "Clopidogrel", doseMg: 75, cypRole: "ANTIPLATELET" },
        { drugName: "Apixaban", doseMg: 5, cypRole: "ANTICOAGULANT" },
      ]);
    }
  };

  // Add / Remove Drug
  const handleAddDrug = (drugName: string, doseMg: number, credibleMedsRisk: any, cypRole: any) => {
    setActiveMeds([...activeMeds, { drugName, doseMg, credibleMedsRisk, cypRole }]);
  };

  const handleRemoveDrug = (index: number) => {
    setActiveMeds(activeMeds.filter((_, idx) => idx !== index));
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatPharmacologySpokenSummary(report);
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
    const prompt = `[Noctis Pharmacology & Drug Interaction Matrix - ${report.patientName}] Tisdale Score: ${report.tisdaleReport.totalScore} pts (${report.tisdaleReport.riskTier}). Active QTc Drugs: ${report.activeQTCProLongingDrugs.join(", ") || "None"}. Detected Interactions: ${report.detectedInteractions.map((d) => `${d.drug1} + ${d.drug2}: ${d.clinicalEffect}`).join(" | ") || "None"}. Invariants Tripped: ${report.trippedInvariants.join(", ") || "None"}. Mandated Directives: ${report.mandatoryActions.join(" | ") || "Therapy validated."}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/40">
              <Pill className="h-3.5 w-3.5" />
              TRACK 23 ENGINE
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300 border border-orange-500/40">
              Tisdale QTc Prolongation
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-300 border border-yellow-500/40">
              CredibleMeds Known Risk
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300 border border-red-500/40">
              CYP3A4 / Serotonin Toxicity
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Clinical Pharmacology & Drug-Drug Interaction Matrix
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-compensatory safety invariant gates: Extreme QTc Torsades de Pointes veto, lethal serotonin syndrome veto, catastrophic CYP3A4 graft rejection veto, and triple antithrombotic hemorrhage veto.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleVoice}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-md",
              isSpeaking
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
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
              className="flex items-center gap-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/50 px-3 py-1.5 text-xs font-medium transition-colors shadow-md"
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
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            Curated Pharmacology Interaction Scenarios
          </span>
          <span className="text-[11px] text-zinc-500">Live Invariant Probes</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            onClick={() => handleLoadPreset("torsades")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "torsades"
                ? "bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-md ring-1 ring-amber-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Walter White (72yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-PHARM-001
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Amiodarone + Haloperidol (QTc 515ms, K 3.2, Tisdale 11)</div>
          </button>

          <button
            onClick={() => handleLoadPreset("serotonin")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "serotonin"
                ? "bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-md ring-1 ring-amber-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Chloe Martin (38yo F)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-PHARM-002
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Linezolid (MAOI) + Sertraline / Tramadol (Serotonin Storm)</div>
          </button>

          <button
            onClick={() => handleLoadPreset("transplant")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "transplant"
                ? "bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-md ring-1 ring-amber-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Eduardo Silva (54yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-PHARM-003
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Rifampin (Inducer) + Tacrolimus / Apixaban (90% Drop)</div>
          </button>

          <button
            onClick={() => handleLoadPreset("triple")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "triple"
                ? "bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-md ring-1 ring-amber-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>James Carter (65yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CF-PHARM-004
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Triple Antithrombotic: Aspirin + Plavix + Eliquis Bleeding</div>
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
                    Gate: {report.trippedInvariants[idx] || "CF-PHARM"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100 font-medium">{action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid: Left Column Tisdale Score Inputs, Right Column Active Meds & Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tisdale Risk Parameters */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-amber-400" />
              Tisdale QTc Risk Inputs
            </span>
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded uppercase",
                report.tisdaleReport.riskTier === "HIGH_RISK"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  : report.tisdaleReport.riskTier === "MODERATE_RISK"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              )}
            >
              {report.tisdaleReport.totalScore} Pts ({report.tisdaleReport.riskTier.replace("_", " ")})
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Age (Years)</label>
                <input
                  type="number"
                  min={18}
                  max={110}
                  value={ageYears}
                  onChange={(e) => setAgeYears(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Biological Sex</label>
                <select
                  value={biologicalSex}
                  onChange={(e) => setBiologicalSex(e.target.value as any)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="MALE">Male (0 pts)</option>
                  <option value="FEMALE">Female (+1 pt)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Baseline QTc (ms)</label>
                <input
                  type="number"
                  min={300}
                  max={650}
                  value={baselineQtcMs}
                  onChange={(e) => setBaselineQtcMs(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&ge; 450 ms (+2 pts)</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Potassium K+ (mEq/L)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1.5}
                  max={7.0}
                  value={serumPotassium}
                  onChange={(e) => setSerumPotassium(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">&le; 3.5 mEq/L (+2 pts)</span>
              </div>
            </div>

            {/* Risk Factors Checkboxes */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={takingLoopDiuretic}
                  onChange={(e) => setTakingLoopDiuretic(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-600 focus:ring-amber-500"
                />
                <span>Loop Diuretic (+1 pt)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHeartFailure}
                  onChange={(e) => setHasHeartFailure(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-600 focus:ring-amber-500"
                />
                <span>Congestive Heart Failure (+1 pt)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSepsis}
                  onChange={(e) => setHasSepsis(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-600 focus:ring-amber-500"
                />
                <span>Systemic Sepsis (+1 pt)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAcuteMi}
                  onChange={(e) => setHasAcuteMi(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-600 focus:ring-amber-500"
                />
                <span>Acute Myocardial Infarction (+2 pts)</span>
              </label>
            </div>

            {/* Tisdale Point Details */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Scored Risk Contributors</span>
              {report.tisdaleReport.pointDetails.length > 0 ? (
                report.tisdaleReport.pointDetails.map((det, idx) => (
                  <div key={idx} className="text-[11px] text-zinc-300 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-amber-400" />
                    <span>{det}</span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-zinc-500">No major Tisdale risk points triggered.</div>
              )}
            </div>
          </div>
        </div>

        {/* Center & Right Column: Active Medications & Detected Interactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Drug Matrix */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5" />
                Active Pharmacotherapy Matrix
              </span>
              <span className="text-[11px] text-zinc-400">{activeMeds.length} Active Agents</span>
            </div>

            <div className="space-y-2">
              {activeMeds.map((med, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">{med.drugName}</span>
                    <span className="font-mono text-zinc-400">{med.doseMg} mg</span>
                    {med.credibleMedsRisk === "KNOWN_RISK" && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                        KNOWN QTC RISK
                      </span>
                    )}
                    {med.cypRole && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                        {med.cypRole}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveDrug(idx)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Drug Adder to Probe Lethal Invariants */}
            <div className="pt-2 border-t border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Probe Invariant Gates (Inject High-Risk Agents)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleAddDrug("Haloperidol", 5, "KNOWN_RISK", undefined)}
                  className="px-2.5 py-1 rounded text-xs bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700"
                >
                  + Haloperidol 5mg (Known QTc)
                </button>
                <button
                  onClick={() => handleAddDrug("Linezolid", 600, undefined, "MAOI")}
                  className="px-2.5 py-1 rounded text-xs bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700"
                >
                  + Linezolid 600mg (MAOI)
                </button>
                <button
                  onClick={() => handleAddDrug("Sertraline", 100, undefined, "SEROTONERGIC")}
                  className="px-2.5 py-1 rounded text-xs bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700"
                >
                  + Sertraline 100mg (SSRI)
                </button>
                <button
                  onClick={() => handleAddDrug("Rifampin", 600, undefined, "CYP3A4_INDUCER")}
                  className="px-2.5 py-1 rounded text-xs bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700"
                >
                  + Rifampin 600mg (CYP3A4 Inducer)
                </button>
              </div>
            </div>
          </div>

          {/* Detected Drug-Drug Interactions */}
          {report.detectedInteractions.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <AlertTriangle className="h-4 w-4" />
                Detected High-Alert Drug Interactions
              </div>
              <div className="space-y-2">
                {report.detectedInteractions.map((inter, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-rose-500/40 bg-zinc-950/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {inter.drug1} + {inter.drug2}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200 text-[10px] font-mono font-bold">
                        {inter.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">Mechanism: {inter.mechanism}</div>
                    <div className="text-[11px] font-semibold text-rose-200">Risk: {inter.clinicalEffect}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Guidance Footnote */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <Info className="h-4 w-4 text-amber-400" />
          Evidence-Based Clinical Pharmacology Principles (FDA Non-Device CDS)
        </div>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">1. IKr Blockade & Torsades de Pointes:</strong> Delayed rectifier potassium channels ($I_{Kr}$) mediate myocardial repolarization (Phase 3). Stacking multiple CredibleMeds Known Risk drugs or administering them in the presence of hypokalemia ($K^+ \le 3.5$) creates severe repolarization dispersion, triggering early afterdepolarizations (EADs) and degenerate polymorphic ventricular tachycardia (Torsades de Pointes).
        </p>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">2. PXR Nuclear Receptor Hyperinduction:</strong> Rifampin acts as a potent agonist of the Pregnane X Receptor (PXR), profoundly upregulating transcription of CYP3A4 and P-glycoprotein (MDR1). Co-administration with critical narrow-therapeutic-index substrates (Tacrolimus, Cyclosporine, DOACs) drops circulating drug concentrations by 80% to 90%, precipitating hyperacute allograft rejection or fatal stroke.
        </p>
      </div>
    </div>
  );
}
