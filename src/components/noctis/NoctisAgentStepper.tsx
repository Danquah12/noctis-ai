import React, { useState } from "react";
import {
  Terminal,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Cpu,
  FileCode,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Layers
} from "lucide-react";
import type { AgentExecutionReport, ReActStep } from "@/lib/autonomous-agent-engine";
import { SAMPLE_AUTONOMOUS_REPORT } from "@/lib/autonomous-agent-engine";

interface NoctisAgentStepperProps {
  report?: AgentExecutionReport;
  initialExpanded?: boolean;
}

export default function NoctisAgentStepper({
  report = SAMPLE_AUTONOMOUS_REPORT,
  initialExpanded = true
}: NoctisAgentStepperProps) {
  const [expanded, setExpanded] = useState<boolean>(initialExpanded);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({ 2: true });

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="size-3" /> VERIFIED COMPLETE</span>;
      case "SELF_CORRECTING":
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-amber-400 border border-amber-500/20 animate-pulse"><RotateCw className="size-3 animate-spin" /> SELF-HEALING</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-sky-400 border border-sky-500/20"><Cpu className="size-3" /> RUNNING</span>;
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] text-zinc-100 shadow-xl font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] p-3.5 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#e4b86a]/15 text-[#e4b86a] border border-[#e4b86a]/30">
            <Sparkles className="size-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-white">Autonomous ReAct Engineering Execution</span>
              {getStatusBadge(report.status)}
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              {report.totalSteps} steps • {report.selfCorrectionsCount} autonomous correction{report.selfCorrectionsCount === 1 ? "" : "s"} • {report.durationMs}ms
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition cursor-pointer font-mono"
        >
          {expanded ? "Collapse Trace" : "Expand Trace"}
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3.5">
          {/* Goal Summary */}
          <div className="p-2.5 px-3 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-300 font-mono flex items-start gap-2">
            <span className="text-[#e4b86a] font-semibold select-none">GOAL:</span>
            <span>{report.goal}</span>
          </div>

          {/* Steps Timeline */}
          <div className="space-y-2.5">
            {report.steps.map((step) => {
              const isStepExpanded = expandedSteps[step.stepNumber] ?? false;
              const isHealed = step.status === "SELF_CORRECTING";

              return (
                <div
                  key={step.stepNumber}
                  className={`rounded-xl border transition p-3 ${
                    isHealed
                      ? "border-amber-500/30 bg-amber-950/10"
                      : "border-white/5 bg-white/[0.015] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-bold ${
                        isHealed ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-white/10 text-zinc-300 border border-white/10"
                      }`}>
                        {step.stepNumber}
                      </span>
                      <div>
                        <p className="text-xs text-zinc-200 leading-relaxed font-normal">
                          {step.thought}
                        </p>

                        {/* Action Tool Pill */}
                        {step.action && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-300 border border-sky-500/20">
                              <Terminal className="size-2.5" />
                              Tool: {step.action.toolName}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 truncate max-w-sm">
                              {JSON.stringify(step.action.args)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {step.observation && (
                      <button
                        type="button"
                        onClick={() => toggleStep(step.stepNumber)}
                        className="shrink-0 text-[10px] text-zinc-500 hover:text-zinc-300 font-mono flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                      >
                        {isStepExpanded ? "Hide" : "Trace"}
                        {isStepExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>
                    )}
                  </div>

                  {/* Collapsible Observation Console */}
                  {step.observation && isStepExpanded && (
                    <div className="mt-2.5 pt-2 border-t border-white/5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1 flex items-center justify-between">
                        <span>Terminal Sandbox Output:</span>
                        <span>{step.observation.durationMs}ms</span>
                      </div>
                      <pre className={`text-[11px] font-mono p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed ${
                        step.observation.success
                          ? "bg-black/60 text-emerald-300 border border-emerald-500/20"
                          : "bg-rose-950/20 text-rose-300 border border-rose-500/30"
                      }`}>
                        {step.observation.output}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cryptographic Seal & Deliverables Footer */}
          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              <span>Attestation Seal:</span>
              <span className="text-[#e4b86a] font-semibold">{report.cryptographicSignature.slice(0, 32)}...</span>
            </div>

            <div className="flex items-center gap-2">
              {report.deliverables.map((d) => (
                <span
                  key={d.path}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-mono text-zinc-300 border border-white/10"
                >
                  <FileCode className="size-2.5 text-sky-400" />
                  {d.path}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
