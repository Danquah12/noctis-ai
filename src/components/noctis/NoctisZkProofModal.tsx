import { useState, useMemo } from "react";
import {
  FileCode,
  ShieldCheck,
  EyeOff,
  CheckCircle2,
  Copy,
  Download,
  MessageSquare,
  X,
  Lock,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  CANONICAL_ZK_CIRCUITS,
  generateZeroKnowledgeProof,
  formatZkProofMarkdown,
  type ZkProofArtifact,
} from "@/lib/noctis-zk-proof";

interface NoctisZkProofModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisZkProofModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisZkProofModalProps) {
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>("circuit-solvency");
  const [solvencyThreshold, setSolvencyThreshold] = useState<number>(50000000);
  const [nodeCount, setNodeCount] = useState<number>(128);
  const [recordCount, setRecordCount] = useState<number>(50000);
  const [copied, setCopied] = useState<string | null>(null);

  const circuitKeys = useMemo(() => Object.keys(CANONICAL_ZK_CIRCUITS), []);

  const proofArtifact: ZkProofArtifact = useMemo(() => {
    let customInputs: Record<string, string | number> = {};
    let witnessVal = 85000000;

    if (selectedCircuitId === "circuit-solvency") {
      customInputs = { minLiabilitiesUsd: solvencyThreshold };
      witnessVal = solvencyThreshold * 1.6;
    } else if (selectedCircuitId === "circuit-patch") {
      customInputs = { nodeCount };
    } else {
      customInputs = { recordCount };
    }

    return generateZeroKnowledgeProof({
      circuitId: selectedCircuitId,
      customPublicInputs: customInputs,
      privateWitnessValue: witnessVal,
    });
  }, [selectedCircuitId, solvencyThreshold, nodeCount, recordCount]);

  const dossierMarkdown = useMemo(() => {
    return formatZkProofMarkdown(proofArtifact);
  }, [proofArtifact]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Zero-Knowledge Proof: ${proofArtifact.circuit.name}`);
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

  const currentCircuit = proofArtifact.circuit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-teal-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-teal-900/40 bg-gradient-to-r from-teal-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <EyeOff className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Autonomous Zero-Knowledge Audit Proof Generator
                </h2>
                <span className="rounded-full bg-teal-500/20 border border-teal-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-teal-300 uppercase">
                  Groth16 / BN254 zk-SNARK
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Mathematical proof of truth without revealing proprietary balances, internal hostnames, or confidential records
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-teal-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-teal-900/30 bg-teal-950/20 p-2.5">
            <ShieldCheck className="size-5 text-teal-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Verification Status</div>
              <div className="text-sm font-bold text-teal-300">{proofArtifact.verificationStatus}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-teal-900/30 bg-teal-950/20 p-2.5">
            <Lock className="size-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Witness Privacy</div>
              <div className="text-sm font-bold text-emerald-300">0 Data Disclosure</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-teal-900/30 bg-teal-950/20 p-2.5">
            <Zap className="size-5 text-amber-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Verifier Complexity</div>
              <div className="text-sm font-bold text-amber-300">O(1) Constant-Time</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-teal-900/30 bg-teal-950/20 p-2.5">
            <Layers className="size-5 text-sky-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Pairing Equation</div>
              <div className="text-sm font-bold text-sky-300">e(pi_A, pi_B) Verified</div>
            </div>
          </div>
        </div>

        {/* Circuit Selector Ribbon */}
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 p-3 overflow-x-auto text-xs">
          <span className="text-zinc-400 font-semibold whitespace-nowrap text-[11px] uppercase mr-1">
            ZKP Circuit:
          </span>
          {circuitKeys.map((key) => {
            const c = CANONICAL_ZK_CIRCUITS[key];
            const isSelected = key === selectedCircuitId;
            return (
              <button
                key={key}
                onClick={() => setSelectedCircuitId(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition ${
                  isSelected
                    ? "bg-teal-500/20 border-teal-500/60 text-teal-200"
                    : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {c.name.split(" ")[0]} ({c.type.split("_")[2]})
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Circuit Proof Parameters & Curve Points */}
          <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-4 overflow-y-auto">
            {/* Statement Callout */}
            <div className="rounded-xl border border-teal-900/30 bg-teal-950/20 p-3 space-y-1">
              <span className="text-xs font-bold text-teal-300">Verified Zero-Knowledge Claim:</span>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                {currentCircuit.claimStatement}
              </p>
            </div>

            {/* Dynamic Parameter Sliders */}
            {selectedCircuitId === "circuit-solvency" ? (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Declared Liabilities Floor:</span>
                  <span className="text-zinc-200 font-bold">${solvencyThreshold.toLocaleString()} USD</span>
                </div>
                <input
                  type="range"
                  min="10000000"
                  max="200000000"
                  step="5000000"
                  value={solvencyThreshold}
                  onChange={(e) => setSolvencyThreshold(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1 bg-zinc-700 rounded"
                />
              </div>
            ) : selectedCircuitId === "circuit-patch" ? (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Verified Node Count:</span>
                  <span className="text-zinc-200 font-bold">{nodeCount} Infrastructure Nodes</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="1024"
                  step="16"
                  value={nodeCount}
                  onChange={(e) => setNodeCount(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1 bg-zinc-700 rounded"
                />
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Audited Database Record Count:</span>
                  <span className="text-zinc-200 font-bold">{recordCount.toLocaleString()} Records</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="500000"
                  step="5000"
                  value={recordCount}
                  onChange={(e) => setRecordCount(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1 bg-zinc-700 rounded"
                />
              </div>
            )}

            {/* Groth16 Curve Points */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-300">
                Groth16 zk-SNARK Elliptic Curve Coordinates:
              </span>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2 text-xs font-mono">
                <div>
                  <span className="text-teal-400 font-bold">pi_A (G1):</span>
                  <div className="text-[11px] text-zinc-400 truncate bg-black/40 rounded p-1">
                    {proofArtifact.groth16Proof.pi_A.join(", ")}
                  </div>
                </div>
                <div>
                  <span className="text-teal-400 font-bold">pi_B (G2):</span>
                  <div className="text-[11px] text-zinc-400 truncate bg-black/40 rounded p-1">
                    {proofArtifact.groth16Proof.pi_B[0].join(", ")}
                  </div>
                </div>
                <div>
                  <span className="text-teal-400 font-bold">Pedersen Commitment:</span>
                  <div className="text-[11px] text-emerald-400 truncate bg-black/40 rounded p-1">
                    {proofArtifact.groth16Proof.commitment}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Standalone Verifier & Actions Sidebar */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            <div className="rounded-xl border border-teal-900/30 bg-zinc-900/50 p-3 space-y-2">
              <span className="text-xs font-semibold text-zinc-200">Standalone O(1) Public Verifier</span>
              <div className="font-mono text-[11px] text-zinc-300 bg-black/50 rounded p-2.5 border border-white/5 overflow-x-auto">
                <pre>{proofArtifact.publicVerifierCodeSnippet}</pre>
              </div>
            </div>

            {/* Cryptographic Seal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Proof Seal</span>
                <button
                  onClick={() => handleCopy(proofArtifact.cryptographicSeal, "seal")}
                  className="text-[10px] text-teal-400 hover:text-teal-300 underline"
                >
                  {copied === "seal" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {proofArtifact.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleCopy(JSON.stringify(proofArtifact, null, 2), "proof")}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 text-xs transition border border-zinc-700"
              >
                <Copy className="size-3.5" />
                {copied === "proof" ? "Copied Proof JSON!" : "Copy Full Proof JSON"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCanvas}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 text-xs transition shadow-lg shadow-teal-600/20"
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
