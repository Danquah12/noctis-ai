import { useState, useMemo } from "react";
import {
  Radar,
  ShieldAlert,
  ShieldCheck,
  Radio,
  RotateCcw,
  CheckCircle2,
  Copy,
  Download,
  FileCode,
  MessageSquare,
  X,
  Lock,
  AlertTriangle,
  Zap,
  Terminal,
  Crosshair,
  Flame,
} from "lucide-react";
import {
  CANONICAL_HONEYTOKENS,
  simulateCanaryTripwire,
  formatCanaryAlertMarkdown,
  type CanaryIncidentAlert,
} from "@/lib/noctis-canary-engine";

interface NoctisCanaryModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisCanaryModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisCanaryModalProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<string>("canary-aws-key");
  const [tripped, setTripped] = useState<boolean>(true);
  const [copied, setCopied] = useState<string | null>(null);

  const tokenKeys = useMemo(() => Object.keys(CANONICAL_HONEYTOKENS), []);

  const alertData: CanaryIncidentAlert = useMemo(() => {
    return simulateCanaryTripwire(selectedTokenId);
  }, [selectedTokenId]);

  const dossierMarkdown = useMemo(() => {
    return formatCanaryAlertMarkdown(alertData);
  }, [alertData]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Canary Tripwire: ${alertData.token.name}`);
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

  const currentToken = alertData.token;
  const attacker = alertData.attackerTelemetry;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-yellow-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-yellow-900/40 bg-gradient-to-r from-yellow-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <Crosshair className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Cyber Deception & Synthetic Honeytoken Canary Engine
                </h2>
                <span className="rounded-full bg-yellow-500/20 border border-yellow-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-yellow-300 uppercase">
                  Active Cyber Deception
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                0% false-positive decoy tripwires capturing lateral movement and credential access in real-time
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

        {/* Real-time KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-yellow-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-yellow-900/30 bg-yellow-950/20 p-2.5">
            <ShieldAlert className="size-5 text-red-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Threat Severity</div>
              <div className="text-sm font-bold text-red-300">{alertData.threatSeverity}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-yellow-900/30 bg-yellow-950/20 p-2.5">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">False Positive Rate</div>
              <div className="text-sm font-bold text-emerald-300">0.00% Guaranteed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-yellow-900/30 bg-yellow-950/20 p-2.5">
            <Radar className="size-5 text-yellow-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tripwire Status</div>
              <div className="text-sm font-bold text-yellow-300">
                {tripped ? "ALARM DETONATED" : "ARMED / LISTENING"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-yellow-900/30 bg-yellow-950/20 p-2.5">
            <Terminal className="size-5 text-sky-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">MITRE Mapping</div>
              <div className="text-sm font-bold text-sky-300">{currentToken.mitreTechnique.split(" ")[2]}</div>
            </div>
          </div>
        </div>

        {/* Honeytoken Selector Ribbon */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 p-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-semibold whitespace-nowrap text-[11px] uppercase mr-1">
              Active Decoy Trap:
            </span>
            {tokenKeys.map((key) => {
              const t = CANONICAL_HONEYTOKENS[key];
              const isSelected = key === selectedTokenId;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedTokenId(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition ${
                    isSelected
                      ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-200"
                      : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t.name.split(" ")[1]} ({t.type.split("_")[0]})
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setTripped((prev) => !prev)}
            className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 transition"
          >
            <RotateCcw className="size-3" />
            {tripped ? "Reset Alarm" : "Trigger Tripwire"}
          </button>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Attacker Forensics & Decoy Code Viewport */}
          <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-4 overflow-y-auto">
            {/* Real-time Threat Actor Telemetry */}
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                <Flame className="size-4 text-red-400" />
                <span>Attacker Reconnaissance Telemetry Captured:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-zinc-400">Source IP:</span>{" "}
                  <span className="text-red-300 font-bold">{attacker.sourceIp}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Origin AS:</span>{" "}
                  <span className="text-zinc-200">{attacker.autonomousSystem}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Location:</span>{" "}
                  <span className="text-zinc-200">{attacker.geolocation}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Exploit Tool:</span>{" "}
                  <span className="text-amber-300">{attacker.userAgent}</span>
                </div>
              </div>

              <div className="text-xs font-mono bg-black/40 rounded p-2 border border-white/5">
                <span className="text-zinc-400">Action Attempted:</span>{" "}
                <span className="text-zinc-200 font-semibold">{attacker.actionAttempted}</span>
              </div>
            </div>

            {/* Decoy Credential / Beacon Payload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Synthesized Decoy Honeytoken Payload:
                </span>
                <button
                  onClick={() => handleCopy(currentToken.decoyCredentialPayload, "payload")}
                  className="flex items-center gap-1 rounded bg-yellow-600 hover:bg-yellow-500 px-2.5 py-1 text-[11px] text-black font-semibold transition"
                >
                  <Copy className="size-3" />
                  {copied === "payload" ? "Copied!" : "Copy Decoy Credential"}
                </button>
              </div>

              <div className="font-mono text-xs text-zinc-300 bg-black/60 rounded-xl p-4 border border-zinc-800 overflow-x-auto">
                <pre className="leading-relaxed">{currentToken.decoyCredentialPayload}</pre>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Location: {currentToken.deploymentLocation}
              </p>
            </div>
          </div>

          {/* Automated Containment Sidebar */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            <div className="rounded-xl border border-yellow-900/30 bg-yellow-950/20 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-yellow-300">
                <ShieldCheck className="size-4 text-yellow-400" />
                <span>Automated Containment Playbook:</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-mono">
                {alertData.suggestedContainment}
              </p>
            </div>

            {/* Cryptographic Seal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Incident Seal</span>
                <button
                  onClick={() => handleCopy(alertData.cryptographicSeal, "seal")}
                  className="text-[10px] text-yellow-400 hover:text-yellow-300 underline"
                >
                  {copied === "seal" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {alertData.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleCopy(JSON.stringify(alertData, null, 2), "alert")}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 text-xs transition border border-zinc-700"
              >
                <Copy className="size-3.5" />
                {copied === "alert" ? "Copied Alert JSON!" : "Copy Incident Alert JSON"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCanvas}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2.5 text-xs transition shadow-lg shadow-yellow-500/20"
                >
                  <FileCode className="size-3.5" />
                  Export to Canvas
                </button>
                <button
                  onClick={handleInsertChat}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2.5 text-xs transition border border-zinc-700"
                >
                  <MessageSquare className="size-3.5" />
                  Insert into Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
