import React, { useState } from "react";
import {
  Dna,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  Square,
  Send,
  Pill,
  Sparkles,
  Zap,
  Info,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PatientGenomicProfile,
  type DrugGeneInteractionAlert,
  PGX_PATIENT_PRESETS,
  evaluateDrugGeneInteractions,
  formatPgxSpokenSummary,
} from "@/lib/noctis-pgx-engine";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

interface NoctisPgxSectionProps {
  onSendToChat?: (text: string) => void;
  onApplyPgxToCase?: (recommendation: string) => void;
}

export function NoctisPgxSection({ onSendToChat, onApplyPgxToCase }: NoctisPgxSectionProps) {
  const [selectedPresetKey, setSelectedPresetKey] = useState<keyof typeof PGX_PATIENT_PRESETS>("STROKE_POOR_METABOLIZER");
  const [profile, setProfile] = useState<PatientGenomicProfile>(PGX_PATIENT_PRESETS.STROKE_POOR_METABOLIZER);
  const [activeMeds, setActiveMeds] = useState<string[]>(["Clopidogrel 75mg daily", "Atorvastatin 40mg", "Aspirin 81mg"]);
  const [customMedInput, setCustomMedInput] = useState("");
  const [isReadingVoice, setIsReadingVoice] = useState(false);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  const alerts = evaluateDrugGeneInteractions(activeMeds, profile);

  // Switch Patient Preset
  const handleSelectPreset = (key: keyof typeof PGX_PATIENT_PRESETS) => {
    setSelectedPresetKey(key);
    const p = PGX_PATIENT_PRESETS[key];
    setProfile(p);

    if (key === "STROKE_POOR_METABOLIZER") {
      setActiveMeds(["Clopidogrel 75mg daily", "Atorvastatin 40mg", "Aspirin 81mg"]);
    } else if (key === "OPIOID_ULTRARAPID_METABOLIZER") {
      setActiveMeds(["Codeine 30mg Q4H PRN", "Acetaminophen 650mg", "Cefazolin"]);
    } else if (key === "WARFARIN_HYPERSENSITIVE") {
      setActiveMeds(["Warfarin 5mg daily", "Simvastatin 40mg", "Lisinopril 10mg"]);
    } else {
      setActiveMeds(["Clopidogrel 75mg", "Warfarin 5mg", "Simvastatin 20mg"]);
    }
  };

  // Add Medication
  const handleAddMed = (medName: string) => {
    if (!medName.trim() || activeMeds.includes(medName.trim())) return;
    setActiveMeds((prev) => [...prev, medName.trim()]);
    setCustomMedInput("");
  };

  // Remove Medication
  const handleRemoveMed = (index: number) => {
    setActiveMeds((prev) => prev.filter((_, i) => i !== index));
  };

  // Zero-Truncation Voice Readout
  const handleToggleReadVoice = async () => {
    if (isReadingVoice) {
      stopCurrentVoicePlayback();
      setIsReadingVoice(false);
      return;
    }

    setIsReadingVoice(true);
    const spoken = formatPgxSpokenSummary(alerts, profile);
    const ok = await speakNoctisVoice(spoken, "alloy", {
      onStart: () => setIsReadingVoice(true),
      onEnd: () => setIsReadingVoice(false),
    });
    if (!ok) {
      setIsReadingVoice(false);
    }
  };

  // Apply to Active Case
  const handleApplyToCase = () => {
    if (onApplyPgxToCase) {
      const topAlert = alerts[0];
      const summary = topAlert
        ? `[PGx SAFETY GATING APPLIED]: ${topAlert.cpicRecommendation}`
        : "PGx clearance verified: Standard metabolic profile under CPIC guidelines.";
      onApplyPgxToCase(summary);
      setAppliedNotification("PGx Safety Guidance integrated into active CDS case!");
      setTimeout(() => setAppliedNotification(null), 3500);
    }
  };

  // Send to Chat
  const handleSendToChat = () => {
    if (onSendToChat) {
      const summary = `[CLINICAL PHARMACOGENOMICS (PGx) CPIC LEVEL A REPORT]
Patient: ${profile.patientName} (${profile.profileId})
Target Genotypes: ${Object.values(profile.genes).map((g) => `${g.gene}: ${g.diplotype} (${g.phenotype})`).join("; ")}
Candidate Medications: ${activeMeds.join(", ")}
Interaction Findings: ${
        alerts.length > 0
          ? alerts.map((a) => `[${a.severity}] ${a.drugName} (${a.targetGene}): ${a.cpicRecommendation}`).join("\n")
          : "No actionable drug-gene contraindications detected. Standard dosing approved."
      }`;
      onSendToChat(summary);
    }
  };

  return (
    <div className="rounded-xl border border-fuchsia-500/30 bg-[#0f0614] p-4 text-xs space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-fuchsia-500/20 p-2 border border-fuchsia-500/40 text-fuchsia-300">
            <Dna className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white/95">
                Real-Time Pharmacogenomics (PGx) & Drug-Gene Safety Engine
              </h3>
              <span className="rounded bg-fuchsia-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-fuchsia-300 border border-fuchsia-500/30">
                CPIC Level A · FDA CDS
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Screens patient diplotypes (CYP2C19, CYP2D6, CYP2C9, VKORC1, SLCO1B1) against prescribed therapies.
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleReadVoice}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition border shadow-sm",
              isReadingVoice
                ? "bg-amber-500/25 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/50"
                : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
            )}
            title="Read PGx report aloud with zero truncation"
          >
            {isReadingVoice ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Audio
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-amber-300" /> Read PGx Report
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleApplyToCase}
            className="inline-flex items-center gap-1.5 rounded-md bg-fuchsia-600/20 hover:bg-fuchsia-600/30 px-3 py-1 text-[11px] font-semibold text-fuchsia-300 border border-fuchsia-500/30 transition shadow-sm"
            title="Integrate PGx safety invariant guidance into active CDS case"
          >
            <Zap className="size-3.5" /> Apply to Active Case
          </button>
        </div>
      </div>

      {/* Patient Profile Preset Selector */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
          Patient Genomic Cohort Presets
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(
            [
              ["STROKE_POOR_METABOLIZER", "Stroke: CYP2C19 *2/*2 (Clopidogrel Resistance)"],
              ["OPIOID_ULTRARAPID_METABOLIZER", "Post-Op: CYP2D6 Ultrarapid (Fatal Opioid Risk)"],
              ["WARFARIN_HYPERSENSITIVE", "Cardio: CYP2C9 *3/*3 + VKORC1 AA (Bleeding)"],
              ["WILD_TYPE_STANDARD", "Reference: Wild-Type Normal Metabolizer"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectPreset(key)}
              className={cn(
                "rounded-lg p-2.5 text-left transition border text-[11px] font-medium leading-tight",
                selectedPresetKey === key
                  ? "bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-200 ring-1 ring-fuchsia-500/30"
                  : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.05]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Gene Diplotypes HUD Grid */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
          Patient Diplotypes & Metabolic Phenotypes ({profile.patientName})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.values(profile.genes).map((g) => {
            const isPoor = g.phenotype === "POOR_METABOLIZER";
            const isUltra = g.phenotype === "ULTRARAPID_METABOLIZER";
            return (
              <div
                key={g.gene}
                className={cn(
                  "rounded-xl border p-2.5 space-y-1 flex flex-col justify-between shadow-sm",
                  isPoor || isUltra
                    ? "bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/20"
                    : "bg-black/40 border-white/10"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white/95 text-xs">{g.gene}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase",
                        isPoor
                          ? "bg-rose-500/30 text-rose-300"
                          : isUltra
                          ? "bg-amber-500/30 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      )}
                    >
                      {g.phenotype.replace(/_METABOLIZER/g, "").replace(/_EXTENSIVE/g, "")}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-extrabold text-fuchsia-300 mt-1">
                    {g.diplotype}
                  </div>
                </div>
                <div className="text-[10px] text-white/50 leading-tight pt-1 border-t border-white/5">
                  {g.clinicalSignificance}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Medication Order Screener & Quick Chips */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            Active Prescription Gating & Candidate Orders
          </div>

          {/* Quick Add Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-white/40">Quick Add:</span>
            {["Clopidogrel 75mg", "Codeine 30mg", "Warfarin 5mg", "Simvastatin 40mg", "Ticagrelor 90mg", "Hydromorphone 2mg"].map(
              (med) => (
                <button
                  key={med}
                  type="button"
                  onClick={() => handleAddMed(med)}
                  className="rounded bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-white/80 transition"
                >
                  + {med}
                </button>
              )
            )}
          </div>
        </div>

        {/* Active Med Chips & Input */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/10">
          {activeMeds.map((m, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-950/40 border border-fuchsia-500/30 px-2.5 py-1 text-xs text-fuchsia-200"
            >
              <Pill className="size-3 text-fuchsia-400" />
              {m}
              <button
                type="button"
                onClick={() => handleRemoveMed(idx)}
                className="text-fuchsia-400 hover:text-white font-bold ml-1"
                title="Remove medication"
              >
                ×
              </button>
            </span>
          ))}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddMed(customMedInput);
            }}
            className="flex-1 min-w-[140px]"
          >
            <input
              type="text"
              value={customMedInput}
              onChange={(e) => setCustomMedInput(e.target.value)}
              placeholder="Type drug name and press enter..."
              className="w-full bg-transparent border-none text-xs text-white/90 placeholder:text-white/30 focus:outline-none px-2 py-1"
            />
          </form>
        </div>
      </div>

      {/* Actionable CPIC Drug-Gene Interaction Alerts */}
      {alerts.length > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1">
            <AlertTriangle className="size-3.5" /> Actionable CPIC Level A Drug-Gene Interaction Alerts ({alerts.length})
          </div>

          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.alertId}
                className={cn(
                  "rounded-xl border p-3.5 space-y-2 shadow-lg",
                  a.severity === "CRITICAL_CONTRAINDICATION"
                    ? "bg-rose-950/25 border-rose-500/40"
                    : "bg-amber-950/20 border-amber-500/30"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border",
                        a.severity === "CRITICAL_CONTRAINDICATION"
                          ? "bg-rose-500/30 text-rose-300 border-rose-500/40"
                          : "bg-amber-500/30 text-amber-300 border-amber-500/40"
                      )}
                    >
                      {a.severity.replace(/_/g, " ")}
                    </span>
                    <span className="font-bold text-white text-xs">
                      {a.drugName} ↔ {a.targetGene} ({a.patientPhenotype.replace(/_/g, " ")})
                    </span>
                  </div>

                  {a.trippedSafetyInvariant && (
                    <span className="rounded bg-rose-600/30 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-200 border border-rose-500/40">
                      SAFETY INVARIANT: {a.trippedSafetyInvariant}
                    </span>
                  )}
                </div>

                <div className="text-white/90 leading-relaxed font-sans text-xs">
                  {a.cpicRecommendation}
                </div>

                {a.fdaBlackBoxWarning && (
                  <div className="rounded bg-black/40 border border-rose-500/30 p-2 text-[11px] text-rose-300 font-mono">
                    ⚠️ {a.fdaBlackBoxWarning}
                  </div>
                )}

                <div className="pt-1.5 border-t border-white/5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-emerald-400 font-semibold">Recommended Alternatives:</span>
                  {a.alternativeTherapies.map((alt, i) => (
                    <span
                      key={i}
                      className="rounded bg-emerald-950/30 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
                    >
                      ✓ {alt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3 flex items-center gap-2.5 text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <div className="text-xs">
            <strong>CPIC Level A Clearance Verified:</strong> No actionable drug-gene contraindications detected for current prescriptions against patient genomic diplotypes.
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          {appliedNotification && (
            <span className="inline-flex items-center gap-1 text-[11px] text-fuchsia-300 font-medium">
              <CheckCircle2 className="size-3.5 text-fuchsia-400" /> {appliedNotification}
            </span>
          )}
          <span className="text-[10px] text-white/40 font-mono">
            Clinical Pharmacogenetics Implementation Consortium (CPIC) Guidelines 2026
          </span>
        </div>

        <button
          type="button"
          onClick={handleSendToChat}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600/20 hover:bg-violet-600/30 px-3 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30 transition shadow-sm"
          title="Send pharmacogenomics consultation summary to chat"
        >
          <Send className="size-3.5" /> Send PGx to Chat
        </button>
      </div>
    </div>
  );
}
