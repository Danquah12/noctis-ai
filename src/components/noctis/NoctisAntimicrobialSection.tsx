import React, { useState, useMemo } from "react";
import {
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
  Pill,
  Bug,
  AlertOctagon,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  calculateCockcroftGaultCrCl,
  getSyndromeEmpiricRegimen,
  auditRenalDosing,
  evaluateAntimicrobialPlan,
  formatAntimicrobialSpokenSummary,
  ABX_PRESET_CEFEPIME_RENAL,
  ABX_PRESET_MENINGITIS,
  ABX_PRESET_ANAPHYLAXIS_CROSS_REACT,
  type InfectionSyndrome,
  type AllergySeverity,
  type PatientInfectionProfile,
  type AntimicrobialEvaluationReport,
} from "@/lib/noctis-antimicrobial-stewardship.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisAntimicrobialSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisAntimicrobialSection({ onSendToChat }: NoctisAntimicrobialSectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("cefepime_renal");

  // Patient parameters
  const [patientId, setPatientId] = useState<string>(ABX_PRESET_CEFEPIME_RENAL.patientId);
  const [patientName, setPatientName] = useState<string>(ABX_PRESET_CEFEPIME_RENAL.patientName);
  const [ageYears, setAgeYears] = useState<number>(ABX_PRESET_CEFEPIME_RENAL.ageYears);
  const [biologicalSex, setBiologicalSex] = useState<"MALE" | "FEMALE">(ABX_PRESET_CEFEPIME_RENAL.biologicalSex);
  const [weightKg, setWeightKg] = useState<number>(ABX_PRESET_CEFEPIME_RENAL.weightKg);
  const [serumCreatinine, setSerumCreatinine] = useState<number>(ABX_PRESET_CEFEPIME_RENAL.serumCreatinineMgPerDl);
  const [syndrome, setSyndrome] = useState<InfectionSyndrome>(ABX_PRESET_CEFEPIME_RENAL.syndrome);
  const [mrsaRisk, setMrsaRisk] = useState<boolean>(ABX_PRESET_CEFEPIME_RENAL.mrsaRiskFactor);
  const [pseudomonasRisk, setPseudomonasRisk] = useState<boolean>(ABX_PRESET_CEFEPIME_RENAL.pseudomonasRiskFactor);
  const [allergySeverity, setAllergySeverity] = useState<AllergySeverity>(ABX_PRESET_CEFEPIME_RENAL.betaLactamAllergy);
  const [allergyDetails, setAllergyDetails] = useState<string>("");

  // Antibiotics regimen under evaluation
  const [proposedAntibiotics, setProposedAntibiotics] = useState<
    Array<{ drugName: string; doseMg: number; frequencyHours: number }>
  >(ABX_PRESET_CEFEPIME_RENAL.proposedAntibiotics);

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live Antimicrobial Evaluation Report
  const report = useMemo<AntimicrobialEvaluationReport>(() => {
    return evaluateAntimicrobialPlan({
      patientId,
      patientName,
      ageYears,
      biologicalSex,
      weightKg,
      serumCreatinineMgPerDl: serumCreatinine,
      syndrome,
      mrsaRiskFactor: mrsaRisk,
      pseudomonasRiskFactor: pseudomonasRisk,
      betaLactamAllergy: allergySeverity,
      allergyDetails,
      proposedAntibiotics,
    });
  }, [
    patientId,
    patientName,
    ageYears,
    biologicalSex,
    weightKg,
    serumCreatinine,
    syndrome,
    mrsaRisk,
    pseudomonasRisk,
    allergySeverity,
    allergyDetails,
    proposedAntibiotics,
  ]);

  // Handle Preset Load
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);

    if (key === "cefepime_renal") {
      const p = ABX_PRESET_CEFEPIME_RENAL;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setBiologicalSex(p.biologicalSex);
      setWeightKg(p.weightKg);
      setSerumCreatinine(p.serumCreatinineMgPerDl);
      setSyndrome(p.syndrome);
      setMrsaRisk(p.mrsaRiskFactor);
      setPseudomonasRisk(p.pseudomonasRiskFactor);
      setAllergySeverity(p.betaLactamAllergy);
      setAllergyDetails("");
      setProposedAntibiotics(p.proposedAntibiotics);
    } else if (key === "meningitis") {
      const p = ABX_PRESET_MENINGITIS;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setBiologicalSex(p.biologicalSex);
      setWeightKg(p.weightKg);
      setSerumCreatinine(p.serumCreatinineMgPerDl);
      setSyndrome(p.syndrome);
      setMrsaRisk(p.mrsaRiskFactor);
      setPseudomonasRisk(p.pseudomonasRiskFactor);
      setAllergySeverity(p.betaLactamAllergy);
      setAllergyDetails("");
      setProposedAntibiotics(p.proposedAntibiotics);
    } else if (key === "allergy_cross") {
      const p = ABX_PRESET_ANAPHYLAXIS_CROSS_REACT;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setBiologicalSex(p.biologicalSex);
      setWeightKg(p.weightKg);
      setSerumCreatinine(p.serumCreatinineMgPerDl);
      setSyndrome(p.syndrome);
      setMrsaRisk(p.mrsaRiskFactor);
      setPseudomonasRisk(p.pseudomonasRiskFactor);
      setAllergySeverity(p.betaLactamAllergy);
      setAllergyDetails(p.allergyDetails);
      setProposedAntibiotics(p.proposedAntibiotics);
    }
  };

  // Add / remove test antibiotic
  const handleToggleDrug = (drugName: string, defaultDoseMg: number, defaultFreq: number) => {
    const exists = proposedAntibiotics.find((a) => a.drugName.toLowerCase() === drugName.toLowerCase());
    if (exists) {
      setProposedAntibiotics(proposedAntibiotics.filter((a) => a.drugName.toLowerCase() !== drugName.toLowerCase()));
    } else {
      setProposedAntibiotics([...proposedAntibiotics, { drugName, doseMg: defaultDoseMg, frequencyHours: defaultFreq }]);
    }
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatAntimicrobialSpokenSummary(report);
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
    const prompt = `[Noctis Antimicrobial Stewardship & Sepsis Guidance - ${report.patientName}] Syndrome: ${report.syndrome}. Calculated CrCl: ${report.calculatedCrClMlPerMin} mL/min. Proposed Regimen: ${proposedAntibiotics.map((a) => `${a.drugName} ${a.doseMg}mg Q${a.frequencyHours}h`).join(", ")}. Tripped Safety Invariants: ${report.trippedInvariants.join(", ") || "None (All Regimens Validated)"}. IDSA Recommended Regimen: ${report.empiricRecommendations.primaryRegimen.join("; ")}. Directives: ${report.mandatoryActions.join(" | ") || "Proceed with standard therapeutic monitoring."}`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-teal-500/30 bg-gradient-to-r from-teal-950/40 via-emerald-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-300 border border-teal-500/40">
              <Bug className="h-3.5 w-3.5" />
              TRACK 20 ENGINE
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/40">
              IDSA / Sanford Stewardship
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/40">
              Cockcroft-Gault CrCl
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/40">
              R1 Cross-Reactivity Tree
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Antimicrobial Stewardship & Empiric Pathogen Guidance
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-compensatory safety invariant gates: Cefepime neurotoxicity veto, empiric MRSA omission veto, and beta-lactam R1 side-chain cross-reactivity tree.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleVoice}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-md",
              isSpeaking
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30"
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
              className="flex items-center gap-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/40 text-teal-200 border border-teal-500/50 px-3 py-1.5 text-xs font-medium transition-colors shadow-md"
            >
              <Send className="h-3.5 w-3.5" />
              Send to Sovereign Chat
            </button>
          )}
        </div>
      </div>

      {/* Preset Case Selector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-teal-400" />
            Curated Stewardship Test Cases
          </span>
          <span className="text-[11px] text-zinc-500">Instant Non-Compensatory Probe Activation</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadPreset("cefepime_renal")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "cefepime_renal"
                ? "bg-teal-950/40 border-teal-500/60 text-teal-200 shadow-md ring-1 ring-teal-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Harold Brooks (68yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CF-ABX-001
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Sepsis & AKI (CrCl 22.7) with Cefepime 2g Q8h probe</div>
          </button>

          <button
            onClick={() => handleLoadPreset("meningitis")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "meningitis"
                ? "bg-teal-950/40 border-teal-500/60 text-teal-200 shadow-md ring-1 ring-teal-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Elena Rostova (56yo F)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Listeria Amp
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Community Meningitis (Age &gt;= 50) + Dexamethasone</div>
          </button>

          <button
            onClick={() => handleLoadPreset("allergy_cross")}
            className={cn(
              "text-left p-2.5 rounded-lg border transition-all text-xs",
              selectedPreset === "allergy_cross"
                ? "bg-teal-950/40 border-teal-500/60 text-teal-200 shadow-md ring-1 ring-teal-500/30"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <div className="font-semibold text-white flex items-center justify-between">
              <span>David Kim (42yo M)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CF-ABX-003
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Ampicillin Anaphylaxis + Cephalexin R1 Cross-Reaction</div>
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
                    Triggered Invariant: {report.trippedInvariants[idx] || "CF-ABX"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100 font-medium">{action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Clinical Profile & Renal Dynamics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient Parameters & Syndrome Select */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-teal-400" />
              Patient & Syndrome Inputs
            </span>
            <span className="text-[11px] text-zinc-500">ID: {patientId}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Infection Syndrome</label>
              <select
                value={syndrome}
                onChange={(e) => setSyndrome(e.target.value as InfectionSyndrome)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-teal-500 focus:outline-none"
              >
                <option value="SEPTIC_SHOCK_UNKNOWN_SOURCE">Septic Shock (Unknown Source)</option>
                <option value="HAP_VAP">Hospital-Acquired / Ventilator-Associated Pneumonia (HAP/VAP)</option>
                <option value="COMMUNITY_ACQUIRED_PNEUMONIA">Community-Acquired Pneumonia (CAP)</option>
                <option value="BACTERIAL_MENINGITIS">Acute Bacterial Meningitis</option>
                <option value="NECROTIZING_FASCIITIS">Necrotizing Fasciitis (Type I / Type II)</option>
                <option value="NEUTROPENIC_FEVER">Febrile Neutropenia (High-Risk)</option>
                <option value="COMPLICATED_INTRA_ABDOMINAL">Complicated Intra-Abdominal Infection (cIAI)</option>
                <option value="UROSEPSIS_PYELONEPHRITIS">Urosepsis / Complicated Pyelonephritis</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Age (Years)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={ageYears}
                  onChange={(e) => setAgeYears(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Biological Sex</label>
                <select
                  value={biologicalSex}
                  onChange={(e) => setBiologicalSex(e.target.value as "MALE" | "FEMALE")}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-teal-500 focus:outline-none"
                >
                  <option value="MALE">Male (x1.0)</option>
                  <option value="FEMALE">Female (x0.85)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  min={30}
                  max={250}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Serum Cr (mg/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0.2}
                  max={15}
                  value={serumCreatinine}
                  onChange={(e) => setSerumCreatinine(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated CrCl Live Badge */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400">Cockcroft-Gault CrCl</span>
                <span
                  className={cn(
                    "text-xs font-mono font-bold px-2 py-0.5 rounded",
                    report.calculatedCrClMlPerMin >= 60
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : report.calculatedCrClMlPerMin >= 30
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  )}
                >
                  {report.calculatedCrClMlPerMin} mL/min
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                {report.calculatedCrClMlPerMin >= 60
                  ? "Normal renal clearance. Full standard dosing recommended."
                  : report.calculatedCrClMlPerMin >= 30
                  ? "Moderate renal impairment. Dose or frequency adjustments required."
                  : "Severe renal impairment. Extreme neurotoxicity risk for unadjusted Cefepime."}
              </div>
            </div>

            {/* Pathogen Risk Factors & Allergy */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="text-[11px] font-medium text-zinc-400 block">Pathogen Risk Factors</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mrsaRisk}
                    onChange={(e) => setMrsaRisk(e.target.checked)}
                    className="rounded border-zinc-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>MRSA Risk Factors</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pseudomonasRisk}
                    onChange={(e) => setPseudomonasRisk(e.target.checked)}
                    className="rounded border-zinc-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Pseudomonas Risk</span>
                </label>
              </div>

              <div className="pt-2">
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Beta-Lactam Allergy Severity</label>
                <select
                  value={allergySeverity}
                  onChange={(e) => setAllergySeverity(e.target.value as AllergySeverity)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-teal-500 focus:outline-none"
                >
                  <option value="NO_ALLERGY">No Documented Allergy (Safe for Beta-Lactams)</option>
                  <option value="MILD_DELAYED_CUTANEOUS">Mild Delayed Rash (&gt;72h, Non-IgE)</option>
                  <option value="IGE_MEDIATED_ANAPHYLAXIS">IgE Anaphylaxis / Angioedema / Urticaria (&lt;1h)</option>
                  <option value="SCAR_SJS_TEN_DRESS">SCAR / SJS / TEN / DRESS (Absolute Class Veto)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right Column: IDSA Guideline Empiric Regimen & Renal Audit */}
        <div className="lg:col-span-2 space-y-6">
          {/* IDSA Regimen Visual Card */}
          <div className="rounded-xl border border-teal-500/20 bg-zinc-900/60 p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5" />
                IDSA Guideline Empiric Regimen
              </span>
              <span className="text-[11px] text-zinc-400">Duration: {report.empiricRecommendations.durationDays} Days</span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  First-Line Standard Regimen
                </span>
                <div className="mt-1.5 space-y-1.5">
                  {report.empiricRecommendations.primaryRegimen.map((reg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg bg-teal-950/20 border border-teal-500/30 px-3 py-2 text-xs text-teal-100"
                    >
                      <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                      <span className="font-mono">{reg}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Alternative Regimen (Severe Allergy / Beta-Lactam Avoidance)
                </span>
                <div className="mt-1.5 space-y-1.5">
                  {report.empiricRecommendations.alternativeRegimenAllergy.map((reg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg bg-zinc-950/50 border border-zinc-800 px-3 py-2 text-xs text-zinc-300"
                    >
                      <Info className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="font-mono">{reg}</span>
                    </div>
                  ))}
                </div>
              </div>

              {report.empiricRecommendations.adjuvantTherapy && (
                <div className="rounded-lg border border-purple-500/40 bg-purple-950/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <Sparkles className="h-4 w-4" />
                    Mandatory Adjuvant Therapy Directive
                  </div>
                  <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                    {report.empiricRecommendations.adjuvantTherapy}
                  </p>
                </div>
              )}

              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Targeted Pathogen Spectrum
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {report.empiricRecommendations.targetedPathogens.map((pathogen, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 text-[11px] font-mono text-zinc-300"
                    >
                      {pathogen}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Renal Dosing Audit Table & Interactive Regimen Probe */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-teal-400" />
                Active Regimen & Pharmacokinetic Renal Dosing Audit
              </span>
              <span className="text-[11px] text-zinc-400">Current CrCl: {report.calculatedCrClMlPerMin} mL/min</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                    <th className="pb-2">Prescribed Antimicrobial</th>
                    <th className="pb-2">Prescribed Dose</th>
                    <th className="pb-2">Recommended Adjusted Dose</th>
                    <th className="pb-2 text-right">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {report.renalDosingAudits.map((audit, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/20">
                      <td className="py-2.5 font-semibold text-white">{audit.drugName}</td>
                      <td className="py-2.5 font-mono text-zinc-300">{audit.prescribedDose}</td>
                      <td className="py-2.5 font-mono text-teal-300">{audit.recommendedAdjustedDose}</td>
                      <td className="py-2.5 text-right">
                        {audit.neurotoxicityRiskHigh ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40 animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                            NEUROTOXICITY
                          </span>
                        ) : audit.doseReductionRequired ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                            REDUCTION REQUIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                            <Check className="h-3 w-3" />
                            OPTIMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Test Drug Toggles for Live Invariant Probing */}
            <div className="pt-2 border-t border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Live Invariant Probing Toggles (Simulate High-Risk Prescriptions)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleToggleDrug("Cefepime", 2000, 8)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs border font-medium transition-colors",
                    proposedAntibiotics.some((a) => a.drugName.toLowerCase() === "cefepime")
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                  )}
                >
                  {proposedAntibiotics.some((a) => a.drugName.toLowerCase() === "cefepime") ? "✓ " : "+ "}
                  Cefepime 2g Q8h (Unadjusted)
                </button>

                <button
                  onClick={() => handleToggleDrug("Cephalexin", 500, 6)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs border font-medium transition-colors",
                    proposedAntibiotics.some((a) => a.drugName.toLowerCase() === "cephalexin")
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                  )}
                >
                  {proposedAntibiotics.some((a) => a.drugName.toLowerCase() === "cephalexin") ? "✓ " : "+ "}
                  Cephalexin 500mg Q6h (R1 Challenge)
                </button>

                <button
                  onClick={() => handleToggleDrug("Vancomycin", 1500, 12)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs border font-medium transition-colors",
                    proposedAntibiotics.some((a) => a.drugName.toLowerCase() === "vancomycin")
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/50"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                  )}
                >
                  {proposedAntibiotics.some((a) => a.drugName.toLowerCase() === "vancomycin") ? "✓ " : "+ "}
                  Vancomycin 15-20mg/kg (MRSA Cover)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Guidance Footnote */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <Info className="h-4 w-4 text-teal-400" />
          Clinical Pharmacokinetic Principles & Cross-Reactivity Tree (FDA Non-Device CDS)
        </div>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">1. Cefepime Neurotoxicity:</strong> Patients with renal impairment (CrCl &lt; 60 mL/min) receiving unadjusted Cefepime doses accumulate high cerebrospinal fluid concentrations. Cefepime acts as a competitive antagonist at GABA-A receptors, inducing encephalopathy, myoclonus, and non-convulsive status epilepticus (NCSE), often misdiagnosed as septic delirium.
        </p>
        <p className="leading-relaxed">
          <strong className="text-zinc-200">2. Beta-Lactam R1 Homology:</strong> Cross-reactivity in IgE-mediated anaphylaxis is governed by side-chain homology rather than the common beta-lactam ring. Amoxicillin and Ampicillin share identical R1 side chains with first-generation aminocephalosporins (Cephalexin, Cefaclor), producing high cross-reactivity (&gt;10-40%). In contrast, Cefazolin and Carbapenems possess distinct side chains with cross-reactivity &lt;1%.
        </p>
      </div>
    </div>
  );
}
