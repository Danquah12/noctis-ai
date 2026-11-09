// ============================================================================
// NOCTIS VASOACTIVE & INOTROPIC TITRATION COCKPIT
// Standard: Surviving Sepsis 2021/2026, VIS Score, AHA Shock Statement
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  HeartPulse,
  ShieldAlert,
  Zap,
  Volume2,
  Square,
  Sparkles,
  Send,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  evaluateVasoactiveProtocol,
  type VasoactivePatientProfile,
  type ShockClassification,
} from "@/lib/noctis-vasoactive-titration";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

interface NoctisVasoactiveSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisVasoactiveSection({ onSendToChat }: NoctisVasoactiveSectionProps) {
  const [shockType, setShockType] = useState<ShockClassification>("DISTRIBUTIVE_SEPTIC");
  const [systolicBp, setSystolicBp] = useState<number>(84);
  const [diastolicBp, setDiastolicBp] = useState<number>(48);
  const [heartRate, setHeartRate] = useState<number>(114);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [fluidResusMl, setFluidResusMl] = useState<number>(2100);
  const [accessRoute, setAccessRoute] = useState<"CENTRAL_VENOUS_CATHETER" | "PERIPHERAL_IV_LINE">("CENTRAL_VENOUS_CATHETER");
  const [peripheralDurationHours, setPeripheralDurationHours] = useState<number>(2);

  // Active infusions
  const [norepinephrine, setNorepinephrine] = useState<number>(0.2);
  const [vasopressin, setVasopressin] = useState<number>(0.03);
  const [epinephrine, setEpinephrine] = useState<number>(0.0);
  const [dobutamine, setDobutamine] = useState<number>(0.0);
  const [milrinone, setMilrinone] = useState<number>(0.0);
  const [phenylephrine, setPhenylephrine] = useState<number>(0.0);

  // Invariant simulations
  const [simulateExtravasationHazard, setSimulateExtravasationHazard] = useState<boolean>(false);
  const [simulateEmptyTank, setSimulateEmptyTank] = useState<boolean>(false);
  const [simulateMilrinoneBolus, setSimulateMilrinoneBolus] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const profile = useMemo<VasoactivePatientProfile>(() => {
    const proposed: string[] = [];
    if (simulateMilrinoneBolus) proposed.push("MILRINONE_IV_BOLUS_50MCG_KG");

    return {
      encounterId: "ENC-VASO-9912",
      patientAge: 62,
      patientWeightKg: weightKg,
      shockType,
      systolicBpMmHg: systolicBp,
      diastolicBpMmHg: diastolicBp,
      heartRateBpm: heartRate,
      fluidResuscitationCompletedMl: simulateEmptyTank ? 350 : fluidResusMl,
      accessRoute: simulateExtravasationHazard ? "PERIPHERAL_IV_LINE" : accessRoute,
      peripheralInfusionDurationHours: simulateExtravasationHazard ? 15 : peripheralDurationHours,
      activeInfusions: {
        norepinephrine: simulateEmptyTank ? 0.45 : norepinephrine,
        vasopressinUnitsMin: vasopressin,
        epinephrineMcgKgMin: epinephrine,
        dobutamineMcgKgMin: dobutamine,
        milrinoneMcgKgMin: milrinone,
        dopamineMcgKgMin: 0,
        phenylephrineMcgKgMin: phenylephrine,
      },
      proposedInterventions: proposed,
    };
  }, [
    weightKg,
    shockType,
    systolicBp,
    diastolicBp,
    heartRate,
    fluidResusMl,
    accessRoute,
    peripheralDurationHours,
    norepinephrine,
    vasopressin,
    epinephrine,
    dobutamine,
    milrinone,
    phenylephrine,
    simulateExtravasationHazard,
    simulateEmptyTank,
    simulateMilrinoneBolus,
  ]);

  const report = useMemo(() => evaluateVasoactiveProtocol(profile), [profile]);

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    void speakNoctisVoice(report.spokenGuidance, "maple", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    }).then((ok) => {
      if (!ok) setIsSpeaking(false);
    });
  };

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis Vasoactive Titration Consult] Patient ${profile.encounterId}. Shock: ${profile.shockType}. BP: ${profile.systolicBpMmHg}/${profile.diastolicBpMmHg} (MAP ${report.meanArterialPressureMmHg} mmHg), Shock Index: ${report.shockIndex}. VIS Score: ${report.vasoactiveInotropicScore}. Primary Agent: ${report.primaryAgentRecommendation.firstLineDrug}. Tripped invariants: ${report.trippedInvariants.join(", ") || "None"}.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-neutral-900/60 to-orange-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-500/10 p-2.5 border border-rose-500/20 text-rose-400">
              <HeartPulse className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Hemodynamic Instability & Vasoactive Titration Cockpit
                </h2>
                <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-mono text-rose-300">
                  Surviving Sepsis 2026 / VIS
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Targeted inotrope/vasopressor hierarchy, Vasoactive-Inotropic Score (VIS), and peripheral line extravasation safety net
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVoice}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition shadow-sm",
                isSpeaking
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
              )}
            >
              {isSpeaking ? <Square className="size-3.5 fill-current" /> : <Volume2 className="size-3.5 text-amber-400" />}
              {isSpeaking ? "Stop Voice" : "Read Full Guidance"}
            </button>

            {onSendToChat && (
              <button
                type="button"
                onClick={handleSendChat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 px-3 py-1.5 text-xs font-semibold text-rose-200 border border-rose-500/40 transition"
              >
                <Send className="size-3.5" /> Send to Sovereign Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Safety Invariant Banners */}
      {report.trippedInvariants.length > 0 && (
        <div className="space-y-2">
          {report.safetyDirectives.map((directive, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-200 flex items-start gap-2.5 shadow-md shadow-red-950/30 animate-pulse"
            >
              <ShieldAlert className="size-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-mono uppercase tracking-wide mr-1">
                  Non-Compensatory Safety Invariant Triggered:
                </strong>
                {directive}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Hemodynamics & Shock State */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <HeartPulse className="size-4 text-rose-400" /> Hemodynamic Profile
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Shock Classification</label>
              <select
                value={shockType}
                onChange={(e) => setShockType(e.target.value as ShockClassification)}
                className="w-full rounded-md bg-neutral-900 border border-white/10 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="DISTRIBUTIVE_SEPTIC">Distributive / Septic Shock</option>
                <option value="CARDIOGENIC">Cardiogenic Shock</option>
                <option value="HYPOVOLEMIC">Hypovolemic / Hemorrhagic Shock</option>
                <option value="OBSTRUCTIVE">Obstructive Shock (PE / Tamponade)</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-neutral-400">SBP (mmHg)</label>
                <input
                  type="number"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(parseInt(e.target.value, 10) || 40)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">DBP (mmHg)</label>
                <input
                  type="number"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(parseInt(e.target.value, 10) || 20)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">HR (bpm)</label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(parseInt(e.target.value, 10) || 40)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center py-2 bg-neutral-900/60 rounded-lg border border-white/5">
              <div>
                <div className="text-[10px] text-neutral-400 uppercase font-mono">Mean Arterial Pressure</div>
                <div className={cn(
                  "text-base font-bold",
                  report.meanArterialPressureMmHg < 65 ? "text-rose-400" : "text-emerald-400"
                )}>
                  {report.meanArterialPressureMmHg} <span className="text-[10px] font-normal">mmHg</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-neutral-400 uppercase font-mono">Shock Index (HR/SBP)</div>
                <div className={cn(
                  "text-base font-bold",
                  report.shockIndex >= 1.0 ? "text-rose-400" : "text-neutral-200"
                )}>
                  {report.shockIndex}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400">Crystalloid Resus Volume (mL)</label>
              <input
                type="number"
                step="250"
                value={fluidResusMl}
                onChange={(e) => setFluidResusMl(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
              />
              <span className="text-[9px] text-neutral-500">Surviving Sepsis Target: 30 mL/kg ({weightKg * 30} mL)</span>
            </div>
          </div>
        </div>

        {/* Column 2: Active Infusions & VIS Calculation */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Zap className="size-4 text-amber-400" /> Active Infusions & VIS
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="rounded-lg bg-amber-950/20 border border-amber-500/20 p-2.5 text-center">
              <div className="text-[10px] uppercase font-mono text-amber-300">Vasoactive-Inotropic Score (VIS)</div>
              <div className="text-xl font-bold text-amber-200 mt-0.5">{report.vasoactiveInotropicScore}</div>
              <div className="text-[9px] text-neutral-400 mt-0.5">High Mortality Risk Tier if VIS &ge; 20</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400">Norepi (mcg/kg/min)</label>
                <input
                  type="number"
                  step="0.05"
                  value={norepinephrine}
                  onChange={(e) => setNorepinephrine(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Vasopressin (units/min)</label>
                <input
                  type="number"
                  step="0.01"
                  value={vasopressin}
                  onChange={(e) => setVasopressin(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Epinephrine (mcg/kg/min)</label>
                <input
                  type="number"
                  step="0.02"
                  value={epinephrine}
                  onChange={(e) => setEpinephrine(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Dobutamine (mcg/kg/min)</label>
                <input
                  type="number"
                  step="1"
                  value={dobutamine}
                  onChange={(e) => setDobutamine(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Milrinone (mcg/kg/min)</label>
                <input
                  type="number"
                  step="0.05"
                  value={milrinone}
                  onChange={(e) => setMilrinone(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Phenylephrine (mcg/kg/min)</label>
                <input
                  type="number"
                  step="0.1"
                  value={phenylephrine}
                  onChange={(e) => setPhenylephrine(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Titration Guidance & Extravasation Protocol */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Sparkles className="size-4 text-purple-400" /> Evidence Titration Architecture
          </h3>

          <div className="space-y-3 text-xs">
            <div className="rounded bg-neutral-900/80 p-2.5 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-rose-300">
                1st-Line: {report.primaryAgentRecommendation.firstLineDrug}
              </div>
              <div className="text-[10px] text-neutral-300">
                Range: {report.primaryAgentRecommendation.targetDoseRange}
              </div>
              <div className="text-[9px] text-neutral-400 mt-1">
                {report.primaryAgentRecommendation.rationale}
              </div>
            </div>

            <div className="rounded bg-neutral-900/80 p-2.5 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-amber-300">
                Secondary Add-On: {report.secondaryAddOnRecommendation.agent}
              </div>
              <div className="text-[9px] text-neutral-300">
                Trigger: {report.secondaryAddOnRecommendation.triggerCriteria}
              </div>
              <div className="text-[9px] text-neutral-400">
                Dose: {report.secondaryAddOnRecommendation.dosing}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-1">
              <div className="text-[11px] font-semibold text-neutral-300 flex items-center justify-between">
                <span>Access Route</span>
                <span className="font-mono text-[10px] text-rose-300">
                  {accessRoute === "CENTRAL_VENOUS_CATHETER" ? "CVC" : "PIV"}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400">{report.extravasationSafety.lineStatus}</div>
              <div className="text-[9px] text-amber-300/80">
                Antidote: {report.extravasationSafety.extravasationAntidoteProtocol}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Safety Stress Gates */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
          Interactive Invariant Stress Probes (21 U.S.C. § 360j(o)(1)(E))
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setSimulateExtravasationHazard((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateExtravasationHazard
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-VASO-001 Extravasation</span>
              <span className="font-mono text-[10px]">{simulateExtravasationHazard ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Simulate 15h peripheral vasopressor infusion</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulateEmptyTank((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateEmptyTank
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-VASO-002 Empty Tank</span>
              <span className="font-mono text-[10px]">{simulateEmptyTank ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Simulate high-dose pressor with &lt; 500 mL fluid</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulateMilrinoneBolus((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateMilrinoneBolus
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-VASO-003 Milrinone Bolus</span>
              <span className="font-mono text-[10px]">{simulateMilrinoneBolus ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Milrinone IV bolus ordered in hypotensive shock</div>
          </button>
        </div>
      </div>
    </div>
  );
}
