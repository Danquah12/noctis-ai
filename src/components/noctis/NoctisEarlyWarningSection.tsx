import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  Square,
  Send,
  Sparkles,
  Zap,
  ShieldAlert,
  Wind,
  Droplet,
  Heart,
  Thermometer,
  Brain,
  Sliders,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PatientVitalsForEws,
  type ComprehensiveDeteriorationReport,
  type AcvpuConsciousness,
  generateComprehensiveDeteriorationReport,
  formatDeteriorationSpokenAlert,
} from "@/lib/noctis-early-warning";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

interface NoctisEarlyWarningSectionProps {
  onSendToChat?: (text: string) => void;
  onInjectVitalsToCase?: (vitals: {
    bloodPressure: string;
    heartRateBpm: number;
    respiratoryRatePerMin: number;
    temperatureCelsius: number;
    spo2Percent: number;
    bloodGlucoseMgDl: number;
  }) => void;
}

export function NoctisEarlyWarningSection({
  onSendToChat,
  onInjectVitalsToCase,
}: NoctisEarlyWarningSectionProps) {
  const [vitals, setVitals] = useState<PatientVitalsForEws>({
    respiratoryRatePerMin: 32,
    spo2Percent: 98,
    isHypercapnicRespiratoryFailureScale2: false,
    onSupplementalOxygen: false,
    systolicMmHg: 96,
    diastolicMmHg: 62,
    heartRateBpm: 124,
    temperatureCelsius: 37.0,
    consciousness: "ALERT",
  });
  const [isReadingVoice, setIsReadingVoice] = useState(false);
  const [injectedNotification, setInjectedNotification] = useState<string | null>(null);

  const report = generateComprehensiveDeteriorationReport(vitals);
  const { news2, qsofa, mews } = report;

  // Preset Handlers
  const handleSelectPreset = (preset: "DKA" | "SEPTIC" | "COPD" | "STABLE") => {
    if (preset === "DKA") {
      setVitals({
        respiratoryRatePerMin: 32,
        spo2Percent: 98,
        isHypercapnicRespiratoryFailureScale2: false,
        onSupplementalOxygen: false,
        systolicMmHg: 96,
        diastolicMmHg: 62,
        heartRateBpm: 124,
        temperatureCelsius: 37.0,
        consciousness: "ALERT",
      });
    } else if (preset === "SEPTIC") {
      setVitals({
        respiratoryRatePerMin: 28,
        spo2Percent: 91,
        isHypercapnicRespiratoryFailureScale2: false,
        onSupplementalOxygen: true,
        systolicMmHg: 84,
        diastolicMmHg: 48,
        heartRateBpm: 138,
        temperatureCelsius: 39.4,
        consciousness: "CONFUSION",
      });
    } else if (preset === "COPD") {
      setVitals({
        respiratoryRatePerMin: 18,
        spo2Percent: 90,
        isHypercapnicRespiratoryFailureScale2: true,
        onSupplementalOxygen: false,
        systolicMmHg: 130,
        diastolicMmHg: 82,
        heartRateBpm: 78,
        temperatureCelsius: 36.9,
        consciousness: "ALERT",
      });
    } else {
      setVitals({
        respiratoryRatePerMin: 14,
        spo2Percent: 99,
        isHypercapnicRespiratoryFailureScale2: false,
        onSupplementalOxygen: false,
        systolicMmHg: 122,
        diastolicMmHg: 76,
        heartRateBpm: 68,
        temperatureCelsius: 36.7,
        consciousness: "ALERT",
      });
    }
  };

  // Zero-Truncation Voice Readout
  const handleToggleReadVoice = async () => {
    if (isReadingVoice) {
      stopCurrentVoicePlayback();
      setIsReadingVoice(false);
      return;
    }

    setIsReadingVoice(true);
    const spoken = formatDeteriorationSpokenAlert(report);
    const ok = await speakNoctisVoice(spoken, "alloy", {
      onStart: () => setIsReadingVoice(true),
      onEnd: () => setIsReadingVoice(false),
    });
    if (!ok) {
      setIsReadingVoice(false);
    }
  };

  // Inject to Active Case
  const handleInjectToCase = () => {
    if (onInjectVitalsToCase) {
      onInjectVitalsToCase({
        bloodPressure: `${vitals.systolicMmHg}/${vitals.diastolicMmHg}`,
        heartRateBpm: vitals.heartRateBpm,
        respiratoryRatePerMin: vitals.respiratoryRatePerMin,
        temperatureCelsius: vitals.temperatureCelsius,
        spo2Percent: vitals.spo2Percent,
        bloodGlucoseMgDl: 540,
      });
      setInjectedNotification("Deterioration vitals injected into Section 1 Reference Table!");
      setTimeout(() => setInjectedNotification(null), 3500);
    }
  };

  // Send to Chat
  const handleSendToChat = () => {
    if (onSendToChat) {
      const summary = `[CLINICAL DETERIORATION EARLY WARNING SURVEILLANCE]
NEWS2 Composite Score: ${news2.totalScore} (${news2.clinicalRiskTier.replace(/_/g, " ")}) ${news2.hasRedScoreTrigger ? "[RED SCORE TRIGGER: Single parameter breached score 3]" : ""}
qSOFA Sepsis-3 Score: ${qsofa.score}/3 (${qsofa.isHighRiskSepsis ? "POSITIVE SEPSIS-3 HIGH MORTALITY" : "Negative"})
MEWS Score: ${mews.score} (${mews.isCriticalAlert ? "CRITICAL ALERT >= 5" : "Stable"})
Escalation Status: ${report.rapidResponseTeamIndicated ? "RAPID RESPONSE TEAM STAT INDICATION" : "Ward monitoring protocol"}
Recommendations: ${news2.recommendedResponse} ${qsofa.isHighRiskSepsis ? `\nSepsis-3 Action: ${qsofa.sepsis3ClinicalGuidance}` : ""}`;
      onSendToChat(summary);
    }
  };

  return (
    <div className="rounded-xl border border-rose-500/30 bg-[#120609] p-4 text-xs space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-rose-500/20 p-2 border border-rose-500/40 text-rose-300">
            <BellRing className="size-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white/95">
                Automated Clinical Deterioration & Early Warning Scoring (NEWS2 / qSOFA)
              </h3>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 border border-rose-500/30">
                RCP NEWS2 · Sepsis-3
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Continuous physiological deterioration surveillance with automated Rapid Response Team (RRT) gating.
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
            title="Read deterioration scoring alert aloud"
          >
            {isReadingVoice ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Audio
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-amber-300" /> Read Deterioration Alert
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleInjectToCase}
            className="inline-flex items-center gap-1.5 rounded-md bg-rose-600/20 hover:bg-rose-600/30 px-3 py-1 text-[11px] font-semibold text-rose-300 border border-rose-500/30 transition shadow-sm"
            title="Inject deterioration vitals into Section 1 Reference Table"
          >
            <Zap className="size-3.5" /> Inject to Active Case
          </button>
        </div>
      </div>

      {/* Preset Cohort Buttons */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
          Calibrated Clinical Simulation Scenarios
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ["DKA", "Severe DKA / Kussmaul (NEWS2: 7)"],
            ["SEPTIC", "Septic Shock / qSOFA 3 (RRT Alert)"],
            ["COPD", "COPD Scale 2 SpO2 (Target 88-92%)"],
            ["STABLE", "Stable Ward Inpatient (NEWS2: 0)"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectPreset(key as any)}
              className="rounded-lg p-2 text-left bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-[11px] text-white/80 font-medium transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scoreboard Tri-Card HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* NEWS2 Card */}
        <div
          className={cn(
            "rounded-xl border p-3 flex flex-col justify-between space-y-2 shadow-lg",
            news2.totalScore >= 7
              ? "bg-rose-950/30 border-rose-500/50 ring-1 ring-rose-500/30"
              : news2.totalScore >= 5 || news2.hasRedScoreTrigger
              ? "bg-amber-950/25 border-amber-500/40"
              : "bg-black/40 border-white/10"
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">NEWS2 Composite</span>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[9px] font-bold font-mono uppercase",
                  news2.totalScore >= 7
                    ? "bg-rose-600/40 text-rose-200"
                    : news2.totalScore >= 5 || news2.hasRedScoreTrigger
                    ? "bg-amber-600/40 text-amber-200"
                    : "bg-emerald-600/30 text-emerald-200"
                )}
              >
                {news2.clinicalRiskTier.replace(/_/g, " ")}
              </span>
            </div>
            <div className="font-mono text-4xl font-black text-white mt-1">
              {news2.totalScore}
              <span className="text-xs text-white/40 ml-1 font-normal">pts</span>
            </div>
            {news2.hasRedScoreTrigger && (
              <div className="text-[10px] text-rose-300 font-bold mt-1">
                ⚠️ RED SCORE: Parameter with score of 3
              </div>
            )}
          </div>
          <div className="text-[10px] text-white/60 pt-2 border-t border-white/5">
            <strong>Monitoring:</strong> {news2.monitoringFrequency}
          </div>
        </div>

        {/* qSOFA Card */}
        <div
          className={cn(
            "rounded-xl border p-3 flex flex-col justify-between space-y-2 shadow-lg",
            qsofa.isHighRiskSepsis
              ? "bg-rose-950/30 border-rose-500/50 ring-1 ring-rose-500/30"
              : "bg-black/40 border-white/10"
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">qSOFA (Sepsis-3)</span>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[9px] font-bold font-mono uppercase",
                  qsofa.isHighRiskSepsis
                    ? "bg-rose-600/40 text-rose-200"
                    : "bg-emerald-600/30 text-emerald-200"
                )}
              >
                {qsofa.isHighRiskSepsis ? "HIGH RISK SEPSIS" : "SCREEN NEGATIVE"}
              </span>
            </div>
            <div className="font-mono text-4xl font-black text-white mt-1">
              {qsofa.score}
              <span className="text-xs text-white/40 ml-1 font-normal">/ 3</span>
            </div>
            <div className="space-y-0.5 mt-1 text-[10px] font-mono">
              <div className={qsofa.respiratoryRateTrigger ? "text-rose-300 font-bold" : "text-white/40"}>
                {qsofa.respiratoryRateTrigger ? "✓" : "○"} RR ≥ 22 /min ({vitals.respiratoryRatePerMin})
              </div>
              <div className={qsofa.hypotensionTrigger ? "text-rose-300 font-bold" : "text-white/40"}>
                {qsofa.hypotensionTrigger ? "✓" : "○"} SBP ≤ 100 mmHg ({vitals.systolicMmHg})
              </div>
              <div className={qsofa.alteredMentationTrigger ? "text-rose-300 font-bold" : "text-white/40"}>
                {qsofa.alteredMentationTrigger ? "✓" : "○"} Mentation: {vitals.consciousness}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-white/60 pt-2 border-t border-white/5">
            <strong>Criteria:</strong> Sepsis-3 Consensus Guidelines
          </div>
        </div>

        {/* MEWS Card */}
        <div
          className={cn(
            "rounded-xl border p-3 flex flex-col justify-between space-y-2 shadow-lg",
            mews.isCriticalAlert
              ? "bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/30"
              : "bg-black/40 border-white/10"
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">MEWS Score</span>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[9px] font-bold font-mono uppercase",
                  mews.isCriticalAlert
                    ? "bg-amber-600/40 text-amber-200"
                    : "bg-emerald-600/30 text-emerald-200"
                )}
              >
                {mews.isCriticalAlert ? "CRITICAL ALERT" : "WARD ROUTINE"}
              </span>
            </div>
            <div className="font-mono text-4xl font-black text-white mt-1">
              {mews.score}
              <span className="text-xs text-white/40 ml-1 font-normal">pts</span>
            </div>
            <div className="text-[10px] text-white/50 mt-1">
              Threshold ≥ 5 indicates high risk of inpatient ICU admission or cardiac arrest.
            </div>
          </div>
          <div className="text-[10px] text-white/60 pt-2 border-t border-white/5">
            <strong>Escalation:</strong> {mews.isCriticalAlert ? "Immediate Physician Review STAT" : "Routine Vital Rounds"}
          </div>
        </div>
      </div>

      {/* Escalation Pathway & Invariants */}
      {report.rapidResponseTeamIndicated && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 p-3.5 space-y-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30 uppercase">
              <ShieldAlert className="size-3 text-rose-400" /> RAPID RESPONSE TEAM STAT INDICATION
            </span>
            {news2.trippedSafetyInvariant && (
              <span className="rounded bg-rose-600/30 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-200">
                {news2.trippedSafetyInvariant}
              </span>
            )}
          </div>
          <div className="text-white/90 leading-relaxed font-sans text-xs">
            {news2.recommendedResponse}
          </div>
          {qsofa.isHighRiskSepsis && (
            <div className="rounded bg-black/40 border border-rose-500/30 p-2.5 text-[11px] text-rose-200 font-sans space-y-1">
              <strong className="text-rose-300">1-Hour Sepsis-3 Resuscitation Bundle Mandate:</strong>
              <div>{qsofa.sepsis3ClinicalGuidance}</div>
            </div>
          )}
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          {injectedNotification && (
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-300 font-medium">
              <CheckCircle2 className="size-3.5 text-rose-400" /> {injectedNotification}
            </span>
          )}
          <span className="text-[10px] text-white/40 font-mono">
            Royal College of Physicians (RCP) NEWS2 & SCCM Sepsis-3 Guidelines
          </span>
        </div>

        <button
          type="button"
          onClick={handleSendToChat}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600/20 hover:bg-violet-600/30 px-3 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30 transition shadow-sm"
          title="Send deterioration assessment to chat"
        >
          <Send className="size-3.5" /> Send Assessment to Chat
        </button>
      </div>
    </div>
  );
}
