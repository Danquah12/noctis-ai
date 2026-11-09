// ============================================================================
// NOCTIS TARGETED TEMPERATURE MANAGEMENT (TTM) & NEUROPROGNOSTICATION COCKPIT
// Standard: AHA / ERC 2020/2026 Guidelines & TTM2 Strict Normothermia
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  Thermometer,
  ShieldAlert,
  Brain,
  Volume2,
  Square,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  evaluateTtmResuscitation,
  type TtmPatientProfile,
  type TtmTargetProtocol,
  type ShiveringSeverity,
} from "@/lib/noctis-ttm-resuscitation";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

interface NoctisTtmSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisTtmSection({ onSendToChat }: NoctisTtmSectionProps) {
  const [protocol, setProtocol] = useState<TtmTargetProtocol>("HYPOTHERMIA_32_34C");
  const [coreTemp, setCoreTemp] = useState<number>(33.0);
  const [hoursPostRosc, setHoursPostRosc] = useState<number>(12);
  const [bsasScore, setBsasScore] = useState<ShiveringSeverity>(0);
  const [rewarmingRate, setRewarmingRate] = useState<number>(0.25);
  const [neuromuscularBlockade, setNeuromuscularBlockade] = useState<boolean>(false);
  const [pupillometryNpi, setPupillometryNpi] = useState<number>(3.8);
  const [ssepN20Present, setSsepN20Present] = useState<boolean>(true);
  const [serumNse, setSerumNse] = useState<number>(24);
  const [eegPattern, setEegPattern] = useState<
    "CONTINUOUS_REACTIVE" | "DIFFUSE_SLOWING" | "STATUS_EPILEPTICUS" | "MALIGNANT_BURST_SUPPRESSION"
  >("CONTINUOUS_REACTIVE");
  const [simulateReboundFever, setSimulateReboundFever] = useState<boolean>(false);
  const [simulateRapidRewarm, setSimulateRapidRewarm] = useState<boolean>(false);
  const [simulatePrematureWlst, setSimulatePrematureWlst] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const profile = useMemo<TtmPatientProfile>(() => {
    const proposed: string[] = [];
    if (simulatePrematureWlst) proposed.push("WITHDRAWAL_LIFE_SUSTAINING_THERAPY");

    return {
      encounterId: "ENC-TTM-7702",
      patientAge: 58,
      arrestRhythm: "VF_VT",
      timeToRoscMinutes: 18,
      currentCoreTempC: simulateReboundFever ? 38.6 : coreTemp,
      hoursPostRosc,
      bsasScore,
      rewarmingRateDegreesPerHour: simulateRapidRewarm ? 0.95 : rewarmingRate,
      selectedProtocol: protocol,
      neuromuscularBlockadeActive: neuromuscularBlockade,
      pupillometryNpi,
      ssepN20Present,
      serumNseMcgPerL: serumNse,
      eegPattern,
      proposedInterventions: proposed,
    };
  }, [
    protocol,
    coreTemp,
    hoursPostRosc,
    bsasScore,
    rewarmingRate,
    neuromuscularBlockade,
    pupillometryNpi,
    ssepN20Present,
    serumNse,
    eegPattern,
    simulateReboundFever,
    simulateRapidRewarm,
    simulatePrematureWlst,
  ]);

  const report = useMemo(() => evaluateTtmResuscitation(profile), [profile]);

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
    const prompt = `[Noctis TTM & Neuroprognostication Consult] Patient ${profile.encounterId} at ${profile.hoursPostRosc}h post-ROSC. Protocol: ${profile.selectedProtocol}. Core Temp: ${profile.currentCoreTempC}°C. BSAS: ${profile.bsasScore}. Rewarming rate: ${profile.rewarmingRateDegreesPerHour}°C/hr. Neuroprognostication status: ${report.neuroprognostication.timingStatus}. Invariants tripped: ${report.trippedInvariants.join(", ") || "None"}.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-neutral-900/60 to-blue-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2.5 border border-cyan-500/20 text-cyan-400">
              <Thermometer className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Targeted Temperature Management & Neuroprognostication Cockpit
                </h2>
                <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                  AHA/ERC 2026 / TTM2
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                32°C-36°C hypothermia vs strict normothermia, stepped BSAS shivering suppression, and 72-hour multimodal neuroprognostication
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 px-3 py-1.5 text-xs font-semibold text-cyan-200 border border-cyan-500/40 transition"
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

      {/* Interactive Controls & Parameter Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: TTM Protocol & Shivering Controls */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Thermometer className="size-4 text-cyan-400" /> TTM Protocol Configuration
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Target Temperature Strategy</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as TtmTargetProtocol)}
                className="w-full rounded-md bg-neutral-900 border border-white/10 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="HYPOTHERMIA_32_34C">Therapeutic Hypothermia (32.0°C - 34.0°C)</option>
                <option value="HYPOTHERMIA_36C">Moderate Hypothermia (36.0°C)</option>
                <option value="STRICT_NORMOTHERMIA_37_5C">Strict Normothermia (Fever Prevention &le; 37.5°C)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-neutral-300 block mb-1">Core Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={coreTemp}
                  onChange={(e) => setCoreTemp(parseFloat(e.target.value) || 33.0)}
                  className="w-full rounded-md bg-neutral-900 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-300 block mb-1">Hours Post-ROSC</label>
                <input
                  type="number"
                  value={hoursPostRosc}
                  onChange={(e) => setHoursPostRosc(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-md bg-neutral-900 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Bedside Shivering Assessment Scale (BSAS)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setBsasScore(score as ShiveringSeverity)}
                    className={cn(
                      "py-1.5 px-2 rounded text-[11px] font-bold border transition text-center",
                      bsasScore === score
                        ? "bg-cyan-600 text-white border-cyan-400"
                        : "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10"
                    )}
                  >
                    BSAS {score}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-neutral-300 block mb-1">Rewarming Rate Target (°C/hr)</label>
              <input
                type="number"
                step="0.05"
                value={rewarmingRate}
                onChange={(e) => setRewarmingRate(parseFloat(e.target.value) || 0.25)}
                className="w-full rounded-md bg-neutral-900 border border-white/10 px-2.5 py-1.5 text-xs text-white"
              />
              <span className="text-[10px] text-neutral-500">Max safe rate: 0.25 - 0.50 °C/hr</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-neutral-300">Neuromuscular Blockade Active</span>
              <input
                type="checkbox"
                checked={neuromuscularBlockade}
                onChange={(e) => setNeuromuscularBlockade(e.target.checked)}
                className="size-4 rounded accent-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Middle Column: Stepped Shivering Plan & Rewarming */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Sparkles className="size-4 text-amber-400" /> Stepped Shivering Control Plan
          </h3>

          <div className="space-y-3">
            <div className="rounded-lg bg-neutral-900/80 border border-white/5 p-3">
              <div className="text-[11px] font-bold text-cyan-300">{report.shiveringControl.bsasGrade}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">{report.shiveringControl.metabolicRiskWarning}</div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-neutral-300">Prescribed Interventions:</span>
              <ul className="space-y-1 text-[11px] text-neutral-300">
                {report.shiveringControl.steppedTherapyPlan.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-cyan-400 shrink-0 font-bold">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2.5 text-[11px] text-amber-200">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <RotateCcw className="size-3.5" /> Controlled Rewarming Protocol
              </div>
              <div className="mt-1 text-[10px] text-neutral-300">
                Estimated duration: <strong>{report.rewarmingProtocol.safeRewarmingDurationHours} hours</strong> at {report.rewarmingProtocol.targetRateCPerHour}°C/hr.
              </div>
              <div className="mt-1 text-[10px] text-amber-300/90">{report.rewarmingProtocol.hyperkalemiaRiskNotice}</div>
            </div>
          </div>
        </div>

        {/* Right Column: 72-Hour Multimodal Neuroprognostication */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Brain className="size-4 text-purple-400" /> Multimodal Neuroprognostication
          </h3>

          <div className="space-y-3">
            <div className={cn(
              "rounded-lg p-2.5 border text-xs font-semibold",
              report.neuroprognostication.timingStatus === "ELIGIBLE_FOR_ASSESSMENT"
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-red-950/30 border-red-500/40 text-red-300"
            )}>
              {report.neuroprognostication.timingStatus === "ELIGIBLE_FOR_ASSESSMENT" ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" /> Eligible for Assessment (&ge; 72h Off Sedatives)
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-red-400 shrink-0" /> Locked: Early Post-Arrest / Pharmacologic Confounders
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-neutral-400">Pupillometry NPi</label>
                <input
                  type="number"
                  step="0.1"
                  value={pupillometryNpi}
                  onChange={(e) => setPupillometryNpi(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Serum NSE (mcg/L)</label>
                <input
                  type="number"
                  value={serumNse}
                  onChange={(e) => setSerumNse(parseFloat(e.target.value) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Continuous EEG Pattern</label>
              <select
                value={eegPattern}
                onChange={(e) => setEegPattern(e.target.value as any)}
                className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
              >
                <option value="CONTINUOUS_REACTIVE">Continuous & Reactive (Benign)</option>
                <option value="DIFFUSE_SLOWING">Diffuse Generalized Slowing (Indeterminate)</option>
                <option value="STATUS_EPILEPTICUS">Status Epilepticus (Malignant)</option>
                <option value="MALIGNANT_BURST_SUPPRESSION">Burst-Suppression / Suppressed Background (Highly Malignant)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-300">SSEP N20 Cortical Present</span>
              <input
                type="checkbox"
                checked={ssepN20Present}
                onChange={(e) => setSsepN20Present(e.target.checked)}
                className="size-4 rounded accent-cyan-500"
              />
            </div>

            <div className="text-[11px] text-neutral-300 bg-neutral-900/60 p-2.5 rounded border border-white/5">
              <strong>Advisory:</strong> {report.neuroprognostication.advisory}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Invariant Stress Tests */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
          Interactive Non-Compensatory Safety Gates (21 U.S.C. § 360j(o)(1)(E))
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setSimulateReboundFever((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateReboundFever
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-TTM-001 Rebound Fever</span>
              <span className="font-mono text-[10px]">{simulateReboundFever ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Simulate post-ROSC hyperthermia (38.6°C)</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulateRapidRewarm((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateRapidRewarm
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-TTM-002 Rapid Rewarming</span>
              <span className="font-mono text-[10px]">{simulateRapidRewarm ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Simulate unsafe rewarming rate (0.95°C/hr)</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulatePrematureWlst((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulatePrematureWlst
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-TTM-003 Premature WLST</span>
              <span className="font-mono text-[10px]">{simulatePrematureWlst ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Simulate life support withdrawal order before 72h</div>
          </button>
        </div>
      </div>
    </div>
  );
}
