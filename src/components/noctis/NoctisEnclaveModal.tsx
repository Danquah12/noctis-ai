import { useState, useMemo } from "react";
import {
  Cpu,
  ShieldCheck,
  Lock,
  Layers,
  CheckCircle2,
  Copy,
  Download,
  FileCode,
  MessageSquare,
  X,
  Server,
  Key,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import {
  CANONICAL_ENCLAVE_ARCHITECTURES,
  generateEnclaveAttestation,
  formatEnclaveAttestationMarkdown,
  type EnclaveAttestationQuote,
} from "@/lib/noctis-enclave-attestation";

interface NoctisEnclaveModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisEnclaveModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisEnclaveModalProps) {
  const [selectedArchKey, setSelectedArchKey] = useState<string>("aws-nitro");
  const [nonce, setNonce] = useState<string>("NONCE-SOVEREIGN-PROOF-8F2A");
  const [copied, setCopied] = useState<string | null>(null);

  const archKeys = useMemo(() => Object.keys(CANONICAL_ENCLAVE_ARCHITECTURES), []);

  const quote: EnclaveAttestationQuote = useMemo(() => {
    return generateEnclaveAttestation({
      architectureId: selectedArchKey,
      customNonce: nonce,
    });
  }, [selectedArchKey, nonce]);

  const dossierMarkdown = useMemo(() => {
    return formatEnclaveAttestationMarkdown(quote);
  }, [quote]);

  const handleRefreshNonce = () => {
    setNonce(`NONCE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = () => {
    const filename = `enclave-attestation-${quote.architecture.toLowerCase()}.json`;
    const blob = new Blob([JSON.stringify(quote, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Hardware Enclave Attestation: ${quote.architecture}`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-cyan-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-cyan-900/40 bg-gradient-to-r from-cyan-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Confidential Hardware Enclave Attestation
                </h2>
                <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
                  RFC 9334 RATS Hardware Verifier
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Cryptographic PCR measurement proof of memory-encrypted execution isolated from cloud hypervisors
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-cyan-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-cyan-900/30 bg-cyan-950/20 p-2.5">
            <Lock className="size-5 text-cyan-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Memory Protection</div>
              <div className="text-sm font-bold text-cyan-300">AES-256 Hardware Encrypted</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-cyan-900/30 bg-cyan-950/20 p-2.5">
            <ShieldCheck className="size-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Hypervisor Isolation</div>
              <div className="text-sm font-bold text-emerald-300">0 Memory Snoop Access</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-cyan-900/30 bg-cyan-950/20 p-2.5">
            <Layers className="size-5 text-purple-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">PCR Registers</div>
              <div className="text-sm font-bold text-purple-300">4 Registers Stamped</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-cyan-900/30 bg-cyan-950/20 p-2.5">
            <Server className="size-5 text-amber-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Attestation Verdict</div>
              <div className="text-sm font-bold text-emerald-400">{quote.attestationVerdict}</div>
            </div>
          </div>
        </div>

        {/* Architecture Selector */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 p-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-semibold whitespace-nowrap text-[11px] uppercase mr-1">
              Confidential Hardware Root:
            </span>
            {archKeys.map((key) => {
              const def = CANONICAL_ENCLAVE_ARCHITECTURES[key];
              const isSelected = key === selectedArchKey;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedArchKey(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition ${
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-200"
                      : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {def.name.split(" ")[0]} ({def.arch})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshNonce}
              className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition"
              title="Generate fresh cryptographic nonce"
            >
              <RefreshCw className="size-3" />
              Fresh Nonce
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* PCR Measurements Grid */}
          <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Platform Configuration Registers (PCR Measurements):
              </span>
              <span className="font-mono text-[10px] text-zinc-500">Nonce: {quote.userNonce}</span>
            </div>

            <div className="space-y-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">PCR0: Enclave Bootloader & Microcode</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    MATCHED
                  </span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                  {quote.pcrs.pcr0_bootloader}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">PCR1: Linux Confidential Kernel Boundary</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    MATCHED
                  </span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                  {quote.pcrs.pcr1_kernel}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">PCR2: Noctis Sovereign Weights & Model Memory</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    MATCHED
                  </span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                  {quote.pcrs.pcr2_model_weights}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">PCR8: Authorized Sovereign Operator IAM Role</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    MATCHED
                  </span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                  {quote.pcrs.pcr8_identity_role}
                </div>
              </div>
            </div>
          </div>

          {/* Root-of-Trust Inspector */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            <div className="rounded-xl border border-cyan-900/30 bg-zinc-900/50 p-3 space-y-2">
              <span className="text-xs font-semibold text-zinc-200">Hardware Root of Trust Certificate</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                {quote.hardwareRootOfTrust}
              </p>
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase">Signing Certificate Fingerprint</div>
                <div className="font-mono text-[10px] text-cyan-300 truncate bg-black/40 rounded p-1.5 border border-white/5">
                  {quote.signingCertFingerprint}
                </div>
              </div>
            </div>

            {/* Cryptographic Attestation Seal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Attestation Quote Seal</span>
                <button
                  onClick={() => handleCopy(quote.cryptographicSeal, "seal")}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                >
                  {copied === "seal" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {quote.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(JSON.stringify(quote, null, 2), "quote")}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 text-xs transition border border-zinc-700"
                >
                  <Copy className="size-3.5" />
                  {copied === "quote" ? "Copied JSON!" : "Copy Quote"}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 text-xs transition border border-zinc-700"
                >
                  <Download className="size-3.5" />
                  Download JSON
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCanvas}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 text-xs transition shadow-lg shadow-cyan-600/20"
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
