import { useState, useMemo } from "react";
import {
  Wrench,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Copy,
  Download,
  FileCode,
  MessageSquare,
  X,
  AlertTriangle,
  Play,
  Terminal,
  Activity,
  Layers,
  Lock,
  Zap,
} from "lucide-react";
import {
  PREDEFINED_REMEDIATION_PLAYBOOKS,
  dispatchAutoRemediation,
  formatRemediationMarkdown,
  type RemediationDispatchResult,
} from "@/lib/noctis-auto-remediation";

interface NoctisAutoRemediationModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisAutoRemediationModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisAutoRemediationModalProps) {
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>("remed-ad-kerberos");
  const [activeTab, setActiveTab] = useState<"forward" | "rollback" | "preflight">("forward");
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [copied, setCopied] = useState<string | null>(null);

  const playbookKeys = useMemo(() => Object.keys(PREDEFINED_REMEDIATION_PLAYBOOKS), []);

  const dispatchResult: RemediationDispatchResult = useMemo(() => {
    return dispatchAutoRemediation(selectedPlaybookId, { dryRun });
  }, [selectedPlaybookId, dryRun]);

  const dossierMarkdown = useMemo(() => {
    return formatRemediationMarkdown(dispatchResult);
  }, [dispatchResult]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = () => {
    const ext = dispatchResult.playbook.environment === "PowerShell" ? "ps1" : "sh";
    const filename = `${dispatchResult.playbook.id}-${activeTab}.${ext}`;
    const content =
      activeTab === "rollback"
        ? dispatchResult.playbook.rollbackScript
        : dispatchResult.playbook.forwardScript;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Auto-Remediation: ${dispatchResult.playbook.name}`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  if (!open) return null;

  const currentPlaybook = dispatchResult.playbook;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-emerald-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-emerald-900/40 bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Wrench className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Pre-Signed Auto-Remediation Dispatcher
                </h2>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
                  Atomic Forward + Rollback
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                100% reversible infrastructure auto-fixes with mandatory pre-flight environment verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Real-time Status & Playbook Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-emerald-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {playbookKeys.map((key) => {
              const pb = PREDEFINED_REMEDIATION_PLAYBOOKS[key];
              const isSelected = pb.id === selectedPlaybookId;
              return (
                <button
                  key={pb.id}
                  onClick={() => setSelectedPlaybookId(pb.id)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition border whitespace-nowrap ${
                    isSelected
                      ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-200 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Terminal className="size-3.5 text-emerald-400" />
                  <span>{pb.name.split(" ")[0]} ({pb.environment})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDryRun((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
                dryRun
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
              }`}
            >
              <Zap className="size-3.5" />
              <span>{dryRun ? "Mode: Dry-Run Simulation" : "Mode: Live Dispatch"}</span>
            </button>
          </div>
        </div>

        {/* Playbook Metadata Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-emerald-950/40 bg-zinc-900/40 p-4 text-xs">
          <div>
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Target Resource</div>
            <div className="text-zinc-200 font-mono truncate">{currentPlaybook.targetResource}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Environment</div>
            <div className="text-emerald-300 font-semibold">{currentPlaybook.environment}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Execution SLA</div>
            <div className="text-zinc-200 font-semibold">Under 5000ms rollback guarantee</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Safety Status</div>
            <div className="flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="size-3.5" />
              <span>{dispatchResult.status}</span>
            </div>
          </div>
        </div>

        {/* Script Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-[#090d18] px-6 pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("forward")}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "forward"
                  ? "border-emerald-400 text-emerald-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Play className="size-3.5" />
              Forward Remediation Script
            </button>
            <button
              onClick={() => setActiveTab("rollback")}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "rollback"
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <RotateCcw className="size-3.5" />
              1-Click Rollback / Undo Script
            </button>
            <button
              onClick={() => setActiveTab("preflight")}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "preflight"
                  ? "border-sky-400 text-sky-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              Pre-Flight Checks ({currentPlaybook.preFlightChecks.length})
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={() =>
                handleCopy(
                  activeTab === "rollback"
                    ? currentPlaybook.rollbackScript
                    : currentPlaybook.forwardScript,
                  "script"
                )
              }
              className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 transition border border-zinc-700"
            >
              <Copy className="size-3" />
              {copied === "script" ? "Copied!" : "Copy Code"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 transition border border-zinc-700"
            >
              <Download className="size-3" />
              Download
            </button>
          </div>
        </div>

        {/* Code Viewport & Pre-Flight Body */}
        <div className="flex-1 p-4 bg-[#050811] overflow-y-auto max-h-[380px]">
          {activeTab === "preflight" ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                Mandatory pre-flight checks are run in dry-run mode to verify host dependencies, service permissions, and cluster reachability prior to executing changes:
              </div>
              <div className="space-y-2">
                {currentPlaybook.preFlightChecks.map((check) => (
                  <div
                    key={check.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 text-xs">{check.name}</span>
                        <span className="font-mono text-[10px] text-zinc-500">({check.id})</span>
                      </div>
                      <div className="font-mono text-[11px] text-zinc-400 bg-black/40 rounded px-2 py-0.5 border border-white/5">
                        {check.command}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Expected: <span className="text-zinc-300">{check.expectedCondition}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {check.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative font-mono text-xs text-zinc-300 bg-black/60 rounded-xl p-4 border border-zinc-800 overflow-x-auto">
              <pre className="leading-relaxed">
                {activeTab === "rollback" ? currentPlaybook.rollbackScript : currentPlaybook.forwardScript}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Seal & Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-emerald-950/40 bg-zinc-950/80 px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Lock className="size-3.5 text-emerald-400" />
            <span className="font-semibold">SHA-256 Dispatch Seal:</span>
            <span className="font-mono text-[11px] text-emerald-300 max-w-[200px] sm:max-w-xs truncate">
              {dispatchResult.cryptographicSeal}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCanvas}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 text-xs transition shadow-lg shadow-emerald-600/20"
            >
              <FileCode className="size-3.5" />
              Export to Canvas
            </button>
            <button
              onClick={handleInsertChat}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium px-4 py-2 text-xs transition border border-zinc-700"
            >
              <MessageSquare className="size-3.5" />
              Insert into Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
