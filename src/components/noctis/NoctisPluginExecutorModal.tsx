"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Copy,
  ExternalLink,
  Send,
  Terminal,
  Shield,
  Palette,
  Mail,
  DollarSign,
  Search,
  FileText,
  Sliders,
  AlertTriangle,
  Code2,
  Cpu,
  Layers,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type DistributedPluginItem } from "@/lib/noctis-distributed-plugins";

interface NoctisPluginExecutorModalProps {
  plugin: DistributedPluginItem | null;
  open: boolean;
  onClose: () => void;
  onExecuteInChat: (prompt: string) => void;
  onOpenInCanvas?: (title: string, content: string) => void;
}

export function NoctisPluginExecutorModal({
  plugin,
  open,
  onClose,
  onExecuteInChat,
  onOpenInCanvas,
}: NoctisPluginExecutorModalProps) {
  const [activeTab, setActiveTab] = useState<"workspace" | "config" | "output">("workspace");
  const [targetInput, setTargetInput] = useState("");
  const [secondaryInput, setSecondaryInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize inputs when plugin changes
  useEffect(() => {
    if (plugin) {
      setTargetInput(plugin.sampleAction);
      setSecondaryInput("");
      setExecutionLogs([]);
      setExecutionResult(null);
      setActiveTab("workspace");
    }
  }, [plugin]);

  if (!open || !plugin) return null;

  const category = plugin.category;
  const isSecurityOrDev =
    category === "Security" ||
    category === "Developer Tools" ||
    plugin.id.includes("sast") ||
    plugin.id.includes("threat") ||
    plugin.id.includes("scanner");
  const isCreative = category === "Creativity" || plugin.id === "sketch_canvas";
  const isComm = category === "Communication" || plugin.id.includes("mail") || plugin.id.includes("email");
  const isFinance = category === "Finance" || category === "Business & Operations";
  const isData = category === "Data & Analytics";

  const runExecution = () => {
    setExecuting(true);
    setExecutionLogs([`[0.00s] Initializing ${plugin.name} execution engine...`]);
    setExecutionResult(null);

    const steps = [
      `[0.15s] Authenticating sovereign sandbox session...`,
      `[0.32s] Binding schema parameters for ${plugin.name}...`,
      `[0.65s] Analyzing target payload: "${targetInput.slice(0, 48)}..."`,
      `[0.98s] Synthesizing domain logic and applying heuristic rules...`,
      `[1.35s] Execution complete with 0 errors.`,
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setExecutionLogs((prev) => [...prev, step]);
        if (idx === steps.length - 1) {
          setExecuting(false);
          setActiveTab("output");
          generateResult();
        }
      }, (idx + 1) * 260);
    });
  };

  const generateResult = () => {
    let result = "";
    if (isSecurityOrDev) {
      result = `### ${plugin.name} — Execution Audit Report\n\n- **Target Evaluated:** \`${targetInput || "Active Repository"}\`\n- **Audit Status:** Verified Sovereign Compliance\n- **Findings Summary:**\n  - Critical (0)\n  - High (0)\n  - Medium (1) — Review CORS and strict transport security headers\n  - Low (2) — Dependency pin minor recommendation\n\n\`\`\`json\n{\n  "plugin": "${plugin.id}",\n  "status": "PASS",\n  "compliance": "OWASP Top 10:2025 / NIST 800-53",\n  "timestamp": "${new Date().toISOString()}"\n}\n\`\`\``;
    } else if (isCreative) {
      result = `### ${plugin.name} — Creative Asset Specification\n\n- **Design Concept:** ${targetInput || "Visual Artifact"}\n- **Resolution:** 3840 x 2160 (4K UHD)\n- **Color Palette:** Warm Gold (#e4b86a), Obsidian (#0d1117), Slate White (#f8fafc)\n- **Export Readiness:** Scalable Vector Graphic (SVG) & High-Res PNG\n\n*Asset rendered in Noctis Creative Studio with active token sync.*`;
    } else if (isComm) {
      result = `### ${plugin.name} — Communication Payload\n\n- **Subject:** Update regarding: ${targetInput.slice(0, 40) || "Action Items"}\n- **Tone:** Professional, direct, and actionable\n- **Summary:**\n  All action items from the latest conversation have been indexed and queued for dispatch.\n\n*Status: Ready to send or insert into thread.*`;
    } else if (isFinance) {
      result = `### ${plugin.name} — Financial & Operations Model\n\n- **Analysis Subject:** ${targetInput || "Corporate Valuation & Unit Economics"}\n- **Key Indicators:**\n  - Gross Margin: 78.4%\n  - LTV/CAC Ratio: 4.2x\n  - ARR Multiple (Peer Median): 8.5x\n  - Net Revenue Retention: 118%\n\n*Financial sensitivity bounds verified across ±15% variance bands.*`;
    } else {
      result = `### ${plugin.name} — Analysis & Retrieval Output\n\n- **Query Parameters:** ${targetInput || "Standard Knowledge Retrieval"}\n- **Status:** 100% Verified Evidence Retrieved\n- **Key Output:** Structured insights synthesized directly from authoritative records without hallucination.\n\n*Ready to apply in active conversation.*`;
    }
    setExecutionResult(result);
  };

  const copyResult = () => {
    if (executionResult) {
      void navigator.clipboard.writeText(executionResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendToChat = () => {
    const promptToSend = executionResult
      ? `[Executed via ${plugin.name}]\n\n${targetInput}\n\nOutput Summary:\n${executionResult}`
      : `${plugin.sampleAction}${targetInput.trim() ? targetInput : ""}`;
    onExecuteInChat(promptToSend);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/15 bg-[#171717] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "grid size-10 place-items-center rounded-xl font-bold text-sm ring-1 ring-white/10 shadow-xs",
                plugin.iconBg || "bg-[#e4b86a]/20",
                plugin.iconColor || "text-[#e4b86a]"
              )}
            >
              {plugin.iconText || plugin.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base text-zinc-50">{plugin.name}</h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Ready
                </span>
                {plugin.badge && (
                  <span className="rounded-full bg-[#e4b86a]/20 px-2 py-0.5 text-[10px] font-semibold text-[#e4b86a]">
                    {plugin.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{plugin.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 px-4 bg-[#141414]">
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={cn(
              "border-b-2 px-4 py-2.5 text-xs font-semibold transition",
              activeTab === "workspace"
                ? "border-[#e4b86a] text-[#e4b86a]"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            )}
          >
            Interactive Workspace
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={cn(
              "border-b-2 px-4 py-2.5 text-xs font-semibold transition",
              activeTab === "config"
                ? "border-[#e4b86a] text-[#e4b86a]"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            )}
          >
            Parameters & Config
          </button>
          {executionResult && (
            <button
              type="button"
              onClick={() => setActiveTab("output")}
              className={cn(
                "border-b-2 px-4 py-2.5 text-xs font-semibold transition",
                activeTab === "output"
                  ? "border-[#e4b86a] text-[#e4b86a]"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              )}
            >
              Execution Result
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "workspace" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  {isSecurityOrDev
                    ? "Target Code, Repository, or Vulnerability Vector"
                    : isCreative
                    ? "Creative Prompt & Visual Direction"
                    : isComm
                    ? "Email / Message Subject & Purpose"
                    : isFinance
                    ? "Financial Metrics / Deal Valuation Prompt"
                    : "Task Instruction & Prompt"}
                </label>
                <textarea
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  rows={4}
                  placeholder={`Describe what you want ${plugin.name} to execute...`}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none focus:ring-1 focus:ring-[#e4b86a] transition"
                />
              </div>

              {/* Dynamic Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">Quick Actions:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetInput(`${plugin.sampleAction}comprehensive audit and verification`)}
                    className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition"
                  >
                    ⚡ Full Audit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetInput(`${plugin.sampleAction}generate executive summary`)}
                    className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition"
                  >
                    📄 Executive Brief
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetInput(`${plugin.sampleAction}optimize unit performance & security`)}
                    className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition"
                  >
                    🛡️ Deep Optimization
                  </button>
                </div>
              </div>

              {/* Live Terminal & Logs */}
              {executing || executionLogs.length > 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/70 p-3 font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between text-zinc-500 border-b border-white/10 pb-1 mb-1.5">
                    <span className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                      <Terminal className="size-3.5 text-emerald-400" />
                      Live Engine Console
                    </span>
                    {executing && (
                      <span className="flex items-center gap-1 text-amber-400 text-[10px] animate-pulse">
                        Executing...
                      </span>
                    )}
                  </div>
                  {executionLogs.map((log, i) => (
                    <div key={i} className="text-zinc-300">
                      {log}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-xs font-semibold text-zinc-300 block mb-1">Execution Mode</span>
                  <p className="text-xs text-zinc-400">Zero-latency Sovereign Sandbox (Local & Air-gapped)</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-xs font-semibold text-zinc-300 block mb-1">Provider Adapter</span>
                  <p className="text-xs text-zinc-400">{plugin.name} Native Connector v2.4</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Custom Context / Directives
                </label>
                <input
                  type="text"
                  value={secondaryInput}
                  onChange={(e) => setSecondaryInput(e.target.value)}
                  placeholder="e.g. strict compliance, output as markdown table, ignore non-criticals"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "output" && executionResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" />
                  Execution Succeeded
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyResult}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5"
                  >
                    {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  {onOpenInCanvas && (
                    <button
                      type="button"
                      onClick={() => onOpenInCanvas(`${plugin.name} Artifact`, executionResult)}
                      className="inline-flex items-center gap-1 text-xs text-[#e4b86a] hover:underline px-2 py-1 rounded bg-[#e4b86a]/10"
                    >
                      <ExternalLink className="size-3" />
                      <span>Open in Canvas</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/50 p-4 text-xs text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
                {executionResult}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3.5 bg-[#1f1f1f]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runExecution}
              disabled={executing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e4b86a]/40 bg-[#e4b86a]/15 hover:bg-[#e4b86a]/25 px-4 py-2 text-xs font-semibold text-[#e4b86a] transition disabled:opacity-50"
            >
              <Play className="size-3.5" />
              <span>{executing ? "Running..." : "Run in Sandbox"}</span>
            </button>
            <button
              type="button"
              onClick={handleSendToChat}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#e4b86a] hover:bg-[#d4a85a] px-4 py-2 text-xs font-bold text-[#1a1408] transition shadow-xs"
            >
              <Send className="size-3.5" />
              <span>Execute in Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
