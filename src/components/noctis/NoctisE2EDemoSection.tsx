import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BellRing,
  CheckCircle2,
  Cpu,
  Dna,
  FileCheck,
  FileCode,
  FileSpreadsheet,
  FlaskConical,
  HeartPulse,
  Info,
  Layers,
  Link2,
  Mic,
  Microscope,
  Network,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Square,
  Stethoscope,
  TrendingUp,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  initializeSimulation,
  executeSimulationStep,
  runFullSimulationSync,
  formatE2ESpokenExecutiveBriefing,
  E2EClinicalSimulationState,
  SimulationScenarioKey,
} from "../../lib/noctis-e2e-demo";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "../../lib/noctis-voice";

const STEP_ICONS: Record<string, React.ReactNode> = {
  ambient: <Mic className="size-4 text-rose-400" />,
  imaging: <Microscope className="size-4 text-violet-400" />,
  telemetry: <Activity className="size-4 text-emerald-400" />,
  early_warning: <BellRing className="size-4 text-amber-400" />,
  lis: <FlaskConical className="size-4 text-cyan-400" />,
  pgx: <Dna className="size-4 text-teal-400" />,
  swarm: <Users className="size-4 text-indigo-400" />,
  fhir: <Link2 className="size-4 text-blue-400" />,
  mesh: <Network className="size-4 text-sky-400" />,
  estar: <FileCheck className="size-4 text-emerald-400" />,
};

export const NoctisE2EDemoSection: React.FC = () => {
  const [scenarioKey, setScenarioKey] = useState<SimulationScenarioKey>("cardiac_stemi");
  const [simState, setSimState] = useState<E2EClinicalSimulationState>(() => initializeSimulation("cardiac_stemi"));
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSimState(initializeSimulation(scenarioKey));
    setSelectedStepIdx(0);
    setIsAutoPlaying(false);
  }, [scenarioKey]);

  useEffect(() => {
    if (isAutoPlaying) {
      if (simState.overallStatus === "completed") {
        setIsAutoPlaying(false);
        return;
      }

      timerRef.current = setTimeout(() => {
        setSimState((prev) => {
          const next = executeSimulationStep(prev, prev.currentStepIndex);
          setSelectedStepIdx(next.currentStepIndex < next.steps.length ? next.currentStepIndex : next.steps.length - 1);
          return next;
        });
      }, 1600);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAutoPlaying, simState]);

  const handleStepForward = () => {
    if (simState.overallStatus === "completed") return;
    setSimState((prev) => {
      const next = executeSimulationStep(prev, prev.currentStepIndex);
      setSelectedStepIdx(next.currentStepIndex < next.steps.length ? next.currentStepIndex : next.steps.length - 1);
      return next;
    });
  };

  const handleRunFullSync = () => {
    const full = runFullSimulationSync(scenarioKey);
    setSimState(full);
    setSelectedStepIdx(full.steps.length - 1);
    setIsAutoPlaying(false);
  };

  const handleReset = () => {
    stopCurrentVoicePlayback();
    setIsSpeaking(false);
    setIsAutoPlaying(false);
    setSimState(initializeSimulation(scenarioKey));
    setSelectedStepIdx(0);
  };

  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const spokenText = formatE2ESpokenExecutiveBriefing(simState);
    const ok = await speakNoctisVoice(spokenText, "alloy", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
    if (!ok) {
      setIsSpeaking(false);
    }
  };

  const activeStep = simState.steps[selectedStepIdx] || simState.steps[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-violet-500/40 bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-purple-950/40 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider text-violet-300 uppercase">
                <Sparkles className="size-3" />
                Track 14 · Autonomous E2E Pipeline
              </span>
              <span className="text-[11px] font-mono text-violet-400/80">
                10-Pillar Autonomous Clinical Orchestration
              </span>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Autonomous Clinical Encounter Simulation Pipeline
            </h2>
            <p className="mt-1 text-xs text-neutral-300 max-w-3xl leading-relaxed">
              Demonstrates complete end-to-end clinical synthesis across all 10 Noctis sovereign intelligence engines in real time: Ambient Dictation → DICOM Neuroimaging → IoMT Telemetry → NEWS2 Early Warning → LIS HL7 → PGx Safety Gating → Swarm Council → SMART FHIR R4 → Sovereign Mesh → FDA 510(k) eSTAR.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={simState.overallStatus !== "completed"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-md transition-all border",
                simState.overallStatus !== "completed"
                  ? "bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed"
                  : isSpeaking
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300 ring-2 ring-rose-500/50 animate-pulse"
                  : "bg-violet-500/20 hover:bg-violet-500/30 border-violet-500/40 text-violet-200"
              )}
            >
              {isSpeaking ? (
                <>
                  <Square className="size-3.5 fill-current text-rose-300" />
                  Stop Executive Briefing
                </>
              ) : (
                <>
                  <Volume2 className="size-3.5 text-violet-300" />
                  Read Executive Briefing
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 px-3 py-2 text-xs font-semibold text-neutral-300 transition"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Scenario Selection & Pipeline Progress Bar */}
        <div className="mt-4 pt-4 border-t border-violet-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-violet-300 uppercase tracking-wider">Clinical Scenario:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setScenarioKey("cardiac_stemi")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  scenarioKey === "cardiac_stemi"
                    ? "bg-violet-600 border-violet-400 text-white shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800"
                )}
              >
                Cardiac STEMI & PGx Veto (Eleanor Thompson)
              </button>
              <button
                type="button"
                onClick={() => setScenarioKey("septic_dka")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  scenarioKey === "septic_dka"
                    ? "bg-violet-600 border-violet-400 text-white shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800"
                )}
              >
                Severe Sepsis & High Anion Gap DKA (Marcus C.)
              </button>
              <button
                type="button"
                onClick={() => setScenarioKey("acute_stroke")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition border",
                  scenarioKey === "acute_stroke"
                    ? "bg-violet-600 border-violet-400 text-white shadow-sm"
                    : "bg-neutral-900/60 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800"
                )}
              >
                Acute MCA Ischemic Stroke (David Miller)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              disabled={simState.overallStatus === "completed"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold shadow-sm transition border",
                simState.overallStatus === "completed"
                  ? "bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed"
                  : isAutoPlaying
                  ? "bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white"
              )}
            >
              {isAutoPlaying ? (
                <>
                  <Square className="size-3 fill-current" />
                  Pause Auto-Play
                </>
              ) : (
                <>
                  <Play className="size-3 fill-current" />
                  1-Click Auto Run
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleStepForward}
              disabled={isAutoPlaying || simState.overallStatus === "completed"}
              className="inline-flex items-center gap-1 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-200 transition disabled:opacity-50"
            >
              Step Forward <ArrowRight className="size-3" />
            </button>

            <button
              type="button"
              onClick={handleRunFullSync}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600/40 hover:bg-indigo-600/60 border border-indigo-400/50 px-2.5 py-1 text-xs font-medium text-indigo-200 transition"
            >
              Run Instant
            </button>
          </div>
        </div>
      </div>

      {/* Stepper HUD: 10 Sequential Pillar Nodes */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider">
            Pipeline Execution Stepper ({simState.steps.filter((s) => s.status !== "pending").length}/10 Pillars)
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border",
              simState.overallStatus === "completed"
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : simState.overallStatus === "running"
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse"
                : "bg-neutral-800 border-neutral-700 text-neutral-400"
            )}
          >
            {simState.overallStatus === "completed"
              ? "ALL PILLARS CONVERGED"
              : simState.overallStatus === "running"
              ? "PIPELINE ACTIVE"
              : "IDLE STANDBY"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {simState.steps.map((step, idx) => {
            const isSelected = selectedStepIdx === idx;
            const isCompleted = step.status === "completed";
            const isWarning = step.status === "warning";
            const isVeto = step.status === "veto_asserted";
            const isPending = step.status === "pending";

            return (
              <button
                key={step.stepId}
                type="button"
                onClick={() => setSelectedStepIdx(idx)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
                  isSelected ? "ring-2 ring-violet-500 shadow-md" : "hover:bg-neutral-800/60",
                  isCompleted
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : isVeto
                    ? "bg-rose-950/40 border-rose-500/60 text-rose-200"
                    : isWarning
                    ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                    : "bg-neutral-900/60 border-neutral-800 text-neutral-500"
                )}
              >
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] font-bold">#{step.stepNumber}</span>
                  {STEP_ICONS[step.stepId]}
                </div>
                <span className="mt-1 text-[10px] font-semibold truncate w-full">
                  {step.title.split(" ")[0]}
                </span>
                <span
                  className={cn(
                    "mt-1 rounded px-1 text-[8px] font-mono uppercase font-bold",
                    isCompleted
                      ? "bg-emerald-500/30 text-emerald-300"
                      : isVeto
                      ? "bg-rose-500/40 text-rose-300 font-extrabold"
                      : isWarning
                      ? "bg-amber-500/30 text-amber-300"
                      : "bg-neutral-800 text-neutral-500"
                  )}
                >
                  {isVeto ? "VETO" : isCompleted ? "PASS" : isWarning ? "WARN" : "WAIT"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tripped Invariants Global Bar */}
      {simState.allInvariantsTripped.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-red-950/30 to-neutral-950/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-200 flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-400" />
              <span>NON-COMPENSATORY SAFETY INVARIANTS TRIPPED & RECONCILED ({simState.allInvariantsTripped.length}):</span>
            </span>
            <span className="text-[10px] font-mono text-rose-300/80">FDA 21 U.S.C. § 360j(o)(1)(E) Invariant Audit</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {simState.allInvariantsTripped.map((inv) => (
              <span
                key={inv}
                className="rounded-md border border-rose-500/50 bg-rose-500/20 px-2 py-0.5 font-mono text-xs font-bold text-rose-300 shadow-sm"
              >
                {inv}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active Step Detailed Inspection Deck */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-neutral-800 p-2 border border-neutral-700">
              {STEP_ICONS[activeStep.stepId]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-neutral-400">Pillar #{activeStep.stepNumber}</span>
                <span className="text-neutral-500">·</span>
                <span className="text-xs font-mono text-cyan-300">{activeStep.engineName}</span>
              </div>
              <h3 className="text-base font-bold text-white">{activeStep.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400">Timestamp: {activeStep.timestamp}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border",
                activeStep.status === "completed"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : activeStep.status === "veto_asserted"
                  ? "bg-rose-500/30 border-rose-500/50 text-rose-300 font-extrabold"
                  : activeStep.status === "warning"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-neutral-800 border-neutral-700 text-neutral-500"
              )}
            >
              {activeStep.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Narrative Summary */}
        <div className="rounded-lg bg-black/40 border border-neutral-800 p-3.5">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
            Engine Output Summary & Action Directive:
          </span>
          <p className="text-xs text-neutral-200 leading-relaxed font-sans">{activeStep.summary}</p>
        </div>

        {/* Numerical Metrics Matrix */}
        {Object.keys(activeStep.metrics).length > 0 && (
          <div>
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-2">
              Objective Parameter Ledger:
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(activeStep.metrics).map(([key, val]) => (
                <div key={key} className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-2.5">
                  <span className="text-[10px] text-neutral-400 block truncate">{key}</span>
                  <span className="text-sm font-bold font-mono text-cyan-300 truncate block mt-0.5">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spoken Audio Translation Script */}
        {activeStep.spokenSummary && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 flex items-start gap-2.5">
            <Volume2 className="size-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider block">
                Zero-Truncation Spoken Script (Natural Voice Persona):
              </span>
              <p className="text-xs text-cyan-100/90 italic mt-0.5 leading-relaxed">
                "{activeStep.spokenSummary}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Audit Dossier (Visible upon completion) */}
      {simState.overallStatus === "completed" && (
        <div className="rounded-xl border border-emerald-500/30 bg-neutral-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              Complete Encounter Audit Dossier (10/10 Pillars Converged)
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              Patient: <strong className="text-white">{simState.patientName}</strong> ({simState.mrn})
            </span>
          </div>
          <pre className="rounded-lg bg-black/60 p-3.5 text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-emerald-500/20">
            {simState.fullAuditDossier}
          </pre>
        </div>
      )}
    </div>
  );
};
