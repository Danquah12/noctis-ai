// ============================================================================
// NOCTIS COMPREHENSIVE STROKE CODE & REPERFUSION COCKPIT
// Standard: AHA/ASA 2019/2026 Guidelines, DAWN / DEFUSE 3 EVT Protocols
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  Brain,
  ShieldAlert,
  Zap,
  Volume2,
  Square,
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  evaluateStrokeReperfusion,
  type StrokePatientProfile,
  type LargeVesselOcclusionSite,
} from "@/lib/noctis-stroke-reperfusion";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

interface NoctisStrokeSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisStrokeSection({ onSendToChat }: NoctisStrokeSectionProps) {
  const [nihss, setNihss] = useState<number>(16);
  const [onsetHours, setOnsetHours] = useState<number>(2.0);
  const [aspects, setAspects] = useState<number>(9);
  const [lvoSite, setLvoSite] = useState<LargeVesselOcclusionSite>("MCA_M1");
  const [coreVolume, setCoreVolume] = useState<number>(18);
  const [hypoperfusedVolume, setHypoperfusedVolume] = useState<number>(85);
  const [systolicBp, setSystolicBp] = useState<number>(164);
  const [diastolicBp, setDiastolicBp] = useState<number>(92);
  const [glucose, setGlucose] = useState<number>(128);
  const [platelets, setPlatelets] = useState<number>(245000);
  const [inr, setInr] = useState<number>(1.1);
  const [anticoagulantUse, setAnticoagulantUse] = useState<boolean>(false);
  const [recanalizationStatus, setRecanalizationStatus] = useState<
    "PENDING" | "TICI_2B_3_SUCCESSFUL" | "UNSUCCESSFUL"
  >("PENDING");

  // Invariant simulations
  const [simulatePostTpaHeparin, setSimulatePostTpaHeparin] = useState<boolean>(false);
  const [simulateHypertensionOvershoot, setSimulateHypertensionOvershoot] = useState<boolean>(false);
  const [simulateFutileGroinPuncture, setSimulateFutileGroinPuncture] = useState<boolean>(false);
  const [simulateAcuteDeterioration, setSimulateAcuteDeterioration] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const profile = useMemo<StrokePatientProfile>(() => {
    const proposed: string[] = [];
    if (simulatePostTpaHeparin) proposed.push("THERAPEUTIC_ANTICOAGULATION_HEPARIN");
    if (simulateFutileGroinPuncture) proposed.push("PROCEED_TO_CATH_LAB_GROIN_PUNCTURE");
    if (simulateAcuteDeterioration) proposed.push("ACUTE_NEUROLOGIC_DETERIORATION_POST_TPA");

    return {
      encounterId: "ENC-STROKE-5011",
      patientAge: 68,
      nihssScore: nihss,
      symptomOnsetHours: onsetHours,
      aspectsScore: aspects,
      lvoSite,
      ischemicCoreVolumeMl: simulateFutileGroinPuncture ? 85 : coreVolume,
      hypoperfusedVolumeMl: hypoperfusedVolume,
      systolicBpMmHg: simulateHypertensionOvershoot ? 198 : systolicBp,
      diastolicBpMmHg: simulateHypertensionOvershoot ? 116 : diastolicBp,
      bloodGlucoseMgDl: glucose,
      plateletsPerUl: platelets,
      inrValue: inr,
      recentAnticoagulantUse: anticoagulantUse,
      recanalizationStatus,
      proposedOrders: proposed,
    };
  }, [
    nihss,
    onsetHours,
    aspects,
    lvoSite,
    coreVolume,
    hypoperfusedVolume,
    systolicBp,
    diastolicBp,
    glucose,
    platelets,
    inr,
    anticoagulantUse,
    recanalizationStatus,
    simulatePostTpaHeparin,
    simulateHypertensionOvershoot,
    simulateFutileGroinPuncture,
    simulateAcuteDeterioration,
  ]);

  const report = useMemo(() => evaluateStrokeReperfusion(profile), [profile]);

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
    const prompt = `[Noctis Comprehensive Stroke Reperfusion Consult] Patient ${profile.encounterId}. Onset: ${profile.symptomOnsetHours}h, NIHSS: ${profile.nihssScore}, ASPECTS: ${profile.aspectsScore}, LVO: ${profile.lvoSite}. Thrombolysis: ${report.thrombolysisEligibility.eligible ? "ELIGIBLE" : "CONTRAINDICATED"}. EVT: ${report.evtEligibility.eligibleForEvt ? "ELIGIBLE (" + report.evtEligibility.windowClassification + ")" : "NOT ELIGIBLE"}. Tripped invariants: ${report.trippedInvariants.join(", ") || "None"}.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-neutral-900/60 to-purple-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2.5 border border-indigo-500/20 text-indigo-400">
              <Brain className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Comprehensive Stroke Code & Neurovascular Reperfusion Cockpit
                </h2>
                <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300">
                  AHA/ASA 2026 / DAWN / DEFUSE 3
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Intravenous thrombolysis eligibility, extended 6-24h endovascular thrombectomy mismatch gating, and post-recanalization hemodynamics
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 px-3 py-1.5 text-xs font-semibold text-indigo-200 border border-indigo-500/40 transition"
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
        {/* Column 1: Presentation & Baseline Imaging */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Clock className="size-4 text-indigo-400" /> Patient Presentation & CT
          </h3>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-neutral-400">Onset (Hours Ago)</label>
                <input
                  type="number"
                  step="0.5"
                  value={onsetHours}
                  onChange={(e) => setOnsetHours(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">NIHSS Score (0-42)</label>
                <input
                  type="number"
                  value={nihss}
                  onChange={(e) => setNihss(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">ASPECTS Score (0-10)</label>
                <input
                  type="number"
                  value={aspects}
                  onChange={(e) => setAspects(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Occlusion Site (LVO)</label>
                <select
                  value={lvoSite}
                  onChange={(e) => setLvoSite(e.target.value as LargeVesselOcclusionSite)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[10px]"
                >
                  <option value="MCA_M1">MCA M1</option>
                  <option value="ICA_TERMINUS">ICA Terminus</option>
                  <option value="MCA_M2">MCA M2</option>
                  <option value="BASILAR_ARTERY">Basilar Artery</option>
                  <option value="NONE">No LVO</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <label className="text-[10px] text-neutral-400">Blood Pressure</label>
                <div className="text-[11px] font-mono text-white mt-1">
                  {systolicBp}/{diastolicBp} mmHg
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Blood Glucose</label>
                <div className="text-[11px] font-mono text-white mt-1">{glucose} mg/dL</div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Intravenous Thrombolysis (Tenecteplase) */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Zap className="size-4 text-amber-400" /> Intravenous Thrombolysis (TNK)
          </h3>

          <div className="space-y-3 text-xs">
            <div className={cn(
              "rounded-lg p-2.5 border font-semibold",
              report.thrombolysisEligibility.eligible
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-red-950/30 border-red-500/40 text-red-300"
            )}>
              {report.thrombolysisEligibility.eligible ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" /> ELIGIBLE FOR IV THROMBOLYSIS
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-red-400" /> THROMBOLYSIS CONTRAINDICATED
                </div>
              )}
            </div>

            <div className="rounded bg-neutral-900/80 p-2.5 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-neutral-200">
                Agent: {report.thrombolysisEligibility.recommendedAgent}
              </div>
              <div className="text-[10px] text-neutral-300">
                Regimen: {report.thrombolysisEligibility.dosingRegimen}
              </div>
              <div className="text-[9px] text-neutral-400 mt-1">
                BP Goal: {report.thrombolysisEligibility.bloodPressureTarget}
              </div>
            </div>

            {report.thrombolysisEligibility.contraindicationsFound.length > 0 && (
              <div className="bg-red-950/20 border border-red-500/20 p-2 rounded text-[10px] text-red-300 space-y-1">
                <span className="font-semibold block">Identified Contraindications:</span>
                {report.thrombolysisEligibility.contraindicationsFound.map((contra, idx) => (
                  <div key={idx}>• {contra}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Mechanical Thrombectomy & Perfusion Mismatch */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Brain className="size-4 text-purple-400" /> Endovascular Thrombectomy (EVT)
          </h3>

          <div className="space-y-3 text-xs">
            <div className={cn(
              "rounded-lg p-2.5 border font-semibold",
              report.evtEligibility.eligibleForEvt
                ? "bg-purple-950/30 border-purple-500/40 text-purple-300"
                : "bg-neutral-900 border-white/10 text-neutral-400"
            )}>
              {report.evtEligibility.eligibleForEvt ? (
                <div>EVT ELIGIBLE: {report.evtEligibility.windowClassification.replace(/_/g, " ")}</div>
              ) : (
                <div>EVT NOT INDICATED</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400">Core Volume (rCBF &lt; 30%)</label>
                <input
                  type="number"
                  value={coreVolume}
                  onChange={(e) => setCoreVolume(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Hypoperfused (Tmax &gt; 6s)</label>
                <input
                  type="number"
                  value={hypoperfusedVolume}
                  onChange={(e) => setHypoperfusedVolume(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="rounded bg-neutral-900/80 p-2.5 border border-white/5 text-[10px] space-y-1">
              <div>{report.evtEligibility.clinicalAdvisory}</div>
              {report.evtEligibility.mismatchRatio !== undefined && (
                <div className="text-purple-300">
                  Mismatch Ratio: <strong>{report.evtEligibility.mismatchRatio}</strong> (Target &ge; 1.8), Penumbra: {report.evtEligibility.mismatchVolumeMl} mL
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10">
              <label className="text-[10px] text-neutral-400 block mb-1">Recanalization Status (TICI)</label>
              <select
                value={recanalizationStatus}
                onChange={(e) => setRecanalizationStatus(e.target.value as any)}
                className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[10px]"
              >
                <option value="PENDING">Pending Groin Puncture</option>
                <option value="TICI_2B_3_SUCCESSFUL">TICI 2b/3 (Successful Recanalization)</option>
                <option value="UNSUCCESSFUL">TICI 0-2a (Unsuccessful / Refractory)</option>
              </select>
              <div className="text-[9px] text-neutral-400 mt-1">{report.neurovascularHemodynamics.targetBpPostReperfusion}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Safety Stress Gates */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
          Interactive Invariant Stress Probes (21 U.S.C. § 360j(o)(1)(E))
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setSimulatePostTpaHeparin((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulatePostTpaHeparin
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-STROKE-001 Post-tPA Heparin</span>
              <span className="font-mono text-[10px]">{simulatePostTpaHeparin ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Anticoagulant ordered within 24h of thrombolysis</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulateHypertensionOvershoot((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateHypertensionOvershoot
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-STROKE-002 SBP &ge; 185</span>
              <span className="font-mono text-[10px]">{simulateHypertensionOvershoot ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">BP 198/116 mmHg exceeds safety threshold</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulateFutileGroinPuncture((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateFutileGroinPuncture
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-STROKE-003 Large Core</span>
              <span className="font-mono text-[10px]">{simulateFutileGroinPuncture ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Groin puncture with core 85 mL at &gt; 6h</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulateAcuteDeterioration((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateAcuteDeterioration
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-STROKE-004 sICH Reversal</span>
              <span className="font-mono text-[10px]">{simulateAcuteDeterioration ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Trigger Cryoprecipitate + TXA reversal</div>
          </button>
        </div>
      </div>
    </div>
  );
}
