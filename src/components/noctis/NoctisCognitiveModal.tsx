import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  FileCode,
  FileText,
  Flame,
  Gauge,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  INITIAL_DPO_PAIRS,
  runCognitiveBenchmark,
  generateDpoTrainingPair,
  exportDpoDatasetJsonl,
  formatCognitiveBenchmarkMarkdown,
  type BenchmarkDomain,
  type DpoTrainingPair,
  type CognitiveBenchmarkResult,
} from "@/lib/noctis-cognitive-sandbox";

interface NoctisCognitiveModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisCognitiveModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisCognitiveModalProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "dpo" | "create">("matrix");
  const [dpoList, setDpoList] = useState<DpoTrainingPair[]>(INITIAL_DPO_PAIRS);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New DPO form state
  const [formDomain, setFormDomain] = useState<BenchmarkDomain>("Deterministic Math");
  const [formPrompt, setFormPrompt] = useState<string>("");
  const [formChosen, setFormChosen] = useState<string>("");
  const [formRejected, setFormRejected] = useState<string>("");
  const [formRationale, setFormRationale] = useState<string>("");

  const benchmarkResult: CognitiveBenchmarkResult = useMemo(() => {
    const res = runCognitiveBenchmark();
    res.recentDpoPairs = dpoList;
    return res;
  }, [dpoList]);

  const dossierMarkdown = useMemo(() => {
    return formatCognitiveBenchmarkMarkdown(benchmarkResult);
  }, [benchmarkResult]);

  if (!open) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleDownloadJsonl = () => {
    const jsonlStr = exportDpoDatasetJsonl(dpoList);
    const blob = new Blob([jsonlStr], { type: "application/jsonlines" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noctis-dpo-dataset-${Date.now()}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateDpoPair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrompt.trim() || !formChosen.trim() || !formRejected.trim()) return;

    const newPair = generateDpoTrainingPair(
      formDomain,
      formPrompt.trim(),
      formChosen.trim(),
      formRejected.trim(),
      formRationale.trim() || "User-verified invariant alignment & calibration hardening."
    );

    setDpoList([newPair, ...dpoList]);
    setFormPrompt("");
    setFormChosen("");
    setFormRejected("");
    setFormRationale("");
    setActiveTab("dpo");
  };

  const handleOpenCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Cognitive Sandbox: Zero-Drift Benchmark`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-600/20 via-zinc-900 to-emerald-500/20 border border-zinc-700">
              <Brain className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Sovereign Cognitive Sandbox
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Zero-Drift Certified
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
                  Dynamic DPO v1.0
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Continuous self-evaluation against regression test vectors · Real-time DPO pair synthesis · NIST AI RMF 1.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJsonl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 transition-colors"
              title="Download DPO Training Pairs (.jsonl)"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export DPO JSONL</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top 4 Metrics Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Zero-Drift Invariant Index
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {benchmarkResult.zeroDriftInvariantIndex}%
                </span>
                <span className="text-[10px] font-mono text-emerald-300 font-semibold">
                  {benchmarkResult.status}
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${benchmarkResult.zeroDriftInvariantIndex}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Overall Accuracy
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {benchmarkResult.overallAccuracy}%
                </span>
                <span className="text-xs text-zinc-400">
                  (Baseline: {benchmarkResult.baselineAccuracy}%)
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 mt-2">
                Drift Delta: <strong className="text-emerald-400">+{benchmarkResult.driftDeltaBps} bps</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Expected Calibration Error (ECE)
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-amber-300">
                  {(benchmarkResult.expectedCalibrationError * 100).toFixed(2)}%
                </span>
                <span className="text-xs text-zinc-400">Strict Bound</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 mt-2">
                |Confidence - Empirical Accuracy|
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Evaluation Seal</span>
                <button
                  onClick={() => copyToClipboard(benchmarkResult.evaluationSeal, "evalSeal")}
                  className="text-zinc-400 hover:text-white"
                  title="Copy Evaluation Seal"
                >
                  {copiedField === "evalSeal" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
              <div className="mt-2">
                <span
                  className="text-xs font-mono text-zinc-300 block truncate"
                  title={benchmarkResult.evaluationSeal}
                >
                  {benchmarkResult.evaluationSeal.slice(0, 18)}...
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono mt-1">
                  SHA-256 Benchmark Invariant
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "matrix"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Target className="w-3.5 h-3.5" /> Domain Benchmark Matrix (6)
            </button>
            <button
              onClick={() => setActiveTab("dpo")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "dpo"
                  ? "bg-amber-950/60 text-amber-300 border border-amber-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> Verifiable DPO Pairs ({dpoList.length})
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "create"
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Teach Noctis (New DPO Pair)
            </button>
          </div>

          {/* Tab 1: Domain Benchmark Matrix */}
          {activeTab === "matrix" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-900/90 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Benchmark Domain</th>
                      <th className="px-4 py-3 text-center">Evaluated Vectors</th>
                      <th className="px-4 py-3 text-center">Empirical Accuracy</th>
                      <th className="px-4 py-3 text-center">Drift (Δ)</th>
                      <th className="px-4 py-3 text-right">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {benchmarkResult.domainScores.map((ds) => (
                      <tr key={ds.domain} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{ds.domain}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-zinc-300">
                          {ds.casesCount} Test Vectors
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400">
                          {ds.accuracyPercent}%
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-zinc-300">
                          {ds.driftPercent >= 0 ? "+" : ""}{ds.driftPercent}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-bold">
                            {ds.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Verifiable DPO Pairs */}
          {activeTab === "dpo" && (
            <div className="space-y-4">
              {dpoList.map((pair) => (
                <div
                  key={pair.id}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/90 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{pair.id}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {pair.domain}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                      <span>Proof: {pair.proofHash.slice(0, 16)}...</span>
                      <button
                        onClick={() => copyToClipboard(pair.proofHash, pair.id)}
                        className="hover:text-white"
                        title="Copy Proof Hash"
                      >
                        {copiedField === pair.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-mono text-zinc-300">
                    <strong className="text-zinc-500">Prompt:</strong> "{pair.prompt}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block">
                        ✅ Chosen (Deterministic &amp; Calibrated)
                      </span>
                      <p className="text-emerald-200/90 leading-relaxed font-sans">{pair.chosen}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-red-950/20 border border-red-800/40 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-red-400 uppercase block">
                        ❌ Rejected (Vague / Unanchored)
                      </span>
                      <p className="text-red-200/90 leading-relaxed font-sans">{pair.rejected}</p>
                    </div>
                  </div>

                  <span className="text-[11px] text-zinc-400 font-mono block pt-1">
                    Rationale: <strong className="text-zinc-200">{pair.correctionRationale}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Synthesize New DPO Pair */}
          {activeTab === "create" && (
            <form onSubmit={handleCreateDpoPair} className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider text-xs">
                  Teach Noctis: Synthesize Verified DPO Training Pair
                </span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  Zero-Drift Invariant Enforcement
                </span>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Benchmark Domain</label>
                <select
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value as BenchmarkDomain)}
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Deterministic Math">Deterministic Math</option>
                  <option value="Financial Solvency">Financial Solvency</option>
                  <option value="Threat Modeling">Threat Modeling</option>
                  <option value="Clinical Diagnostic">Clinical Diagnostic</option>
                  <option value="Fiduciary Governance">Fiduciary Governance</option>
                  <option value="Physical Systems">Physical Systems</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">User Query / Scenario Prompt</label>
                <input
                  type="text"
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="e.g. What is the maximum safe operating temperature for transformer oil?"
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-400 font-medium mb-1">
                    ✅ Chosen Response (Audited Exact Answer)
                  </label>
                  <textarea
                    value={formChosen}
                    onChange={(e) => setFormChosen(e.target.value)}
                    placeholder="Enter the mathematically exact, primary-source backed answer..."
                    rows={4}
                    className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-sans resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-red-400 font-medium mb-1">
                    ❌ Rejected Response (Hallucination / Vague Approximation)
                  </label>
                  <textarea
                    value={formRejected}
                    onChange={(e) => setFormRejected(e.target.value)}
                    placeholder="Enter what a generic probabilistic model would incorrectly guess..."
                    rows={4}
                    className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-red-500 font-sans resize-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Correction Rationale</label>
                <input
                  type="text"
                  value={formRationale}
                  onChange={(e) => setFormRationale(e.target.value)}
                  placeholder="e.g. Enforced IEEE C57.106 standard maximum top-oil temperature limit (105°C)."
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-medium text-xs shadow-md transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Synthesize Verified DPO Pair</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 text-xs">
          <div className="text-zinc-400 font-mono text-[11px] hidden sm:block">
            Sovereign Engine NOCTIS-COG-001 · Zero Model Drift Guarantee
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => copyToClipboard(dossierMarkdown, "dossier")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors font-medium"
            >
              {copiedField === "dossier" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedField === "dossier" ? "Copied" : "Copy Dossier"}</span>
            </button>

            {onOpenInCanvas && (
              <button
                onClick={handleOpenCanvas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open in Canvas</span>
              </button>
            )}

            {onInsertToChat && (
              <button
                onClick={handleInsertChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-medium shadow-md transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send to Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
