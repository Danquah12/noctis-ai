import { useState, useMemo } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Download,
  FileCode,
  FileText,
  Fingerprint,
  Hash,
  HelpCircle,
  Lock,
  MessageSquare,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  CANONICAL_TRUTH_BUNDLES,
  analyzeTextEpistemicLedger,
  formatTruthLedgerMarkdown,
  exportTruthLedgerJson,
  type EpistemicBadgeType,
  type TruthLedgerBundle,
} from "@/lib/noctis-truth-ledger";

interface NoctisTruthLedgerModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
  initialText?: string;
}

export function NoctisTruthLedgerModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
  initialText = "",
}: NoctisTruthLedgerModalProps) {
  const [selectedBundleKey, setSelectedBundleKey] = useState<string>("bundle-financial-runway");
  const [customText, setCustomText] = useState<string>(initialText);
  const [badgeFilter, setBadgeFilter] = useState<string>("ALL");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Compute active bundle based on selection
  const activeBundle: TruthLedgerBundle = useMemo(() => {
    if (selectedBundleKey === "custom") {
      return analyzeTextEpistemicLedger(
        customText || "Enterprise Runway calculated as $1.45M cash / $110K burn = 13.18 months.",
        "Custom Dynamic Text Epistemic Audit"
      );
    }
    return CANONICAL_TRUTH_BUNDLES[selectedBundleKey] || CANONICAL_TRUTH_BUNDLES["bundle-financial-runway"];
  }, [selectedBundleKey, customText]);

  const dossierMarkdown = useMemo(() => {
    return formatTruthLedgerMarkdown(activeBundle);
  }, [activeBundle]);

  const filteredClaims = useMemo(() => {
    if (badgeFilter === "ALL") return activeBundle.claims;
    return activeBundle.claims.filter((c) => c.badge === badgeFilter);
  }, [activeBundle, badgeFilter]);

  if (!open) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleDownloadJson = () => {
    const jsonStr = exportTruthLedgerJson(activeBundle);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeBundle.bundleId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Truth Ledger: ${activeBundle.documentTitle}`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  const getBadgeStyle = (badge: EpistemicBadgeType) => {
    switch (badge) {
      case "DETERMINISTIC_PROOF":
        return {
          pill: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
          label: "DETERMINISTIC PROOF",
        };
      case "PRIMARY_AUDITED_SOURCE":
        return {
          pill: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
          icon: <FileText className="w-3.5 h-3.5 text-cyan-400" />,
          label: "PRIMARY AUDITED SOURCE",
        };
      case "CONSENSUS_VERDICT":
        return {
          pill: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
          icon: <Scale className="w-3.5 h-3.5 text-indigo-400" />,
          label: "CONSENSUS VERDICT",
        };
      case "SCENARIO_HYPOTHESIS":
        return {
          pill: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
          label: "SCENARIO HYPOTHESIS",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600/20 via-zinc-900 to-cyan-500/20 border border-zinc-700">
              <Fingerprint className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Cryptographic Epistemic Truth Ledger
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Merkle Tree v1.0
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
                  Proof-of-Fact Discipline
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Deterministic mathematical invariants, primary filings (SEC EDGAR / FRED / CISA), and cryptographic Merkle proofs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 transition-colors"
              title="Download Verifiable JSON Audit Bundle"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download JSON Bundle</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit Bundle Selector Ribbon */}
        <div className="px-6 py-2.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 shrink-0 mr-1 flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" /> Audit Scope:
          </span>
          <button
            onClick={() => setSelectedBundleKey("bundle-financial-runway")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              selectedBundleKey === "bundle-financial-runway"
                ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <span>Finance:</span>
            <span className={selectedBundleKey === "bundle-financial-runway" ? "text-emerald-400 font-semibold" : ""}>
              Runway & Valuation DCF
            </span>
          </button>
          <button
            onClick={() => setSelectedBundleKey("bundle-cyber-ransomware")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              selectedBundleKey === "bundle-cyber-ransomware"
                ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <span>Cyber:</span>
            <span className={selectedBundleKey === "bundle-cyber-ransomware" ? "text-cyan-400 font-semibold" : ""}>
              Active Directory Intrusion & KEV
            </span>
          </button>
          <button
            onClick={() => setSelectedBundleKey("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              selectedBundleKey === "custom"
                ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <span>Dynamic:</span>
            <span className={selectedBundleKey === "custom" ? "text-amber-400 font-semibold" : ""}>
              Custom Text Audit
            </span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Custom Text Ingestion Area (if custom selected) */}
          {selectedBundleKey === "custom" && (
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-semibold">Paste Technical Text or Incident Notes to Extract Claims:</span>
                <span className="text-zinc-500">Auto-Tags Deterministic Math, SEC/CISA Citations & Hypotheses</span>
              </div>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste analytical findings, calculations, balance sheet figures, or incident response logs here..."
                rows={3}
                className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono resize-none"
              />
            </div>
          )}

          {/* Top Metrics Ribbon: 4 Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Epistemic Rigor Score
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {activeBundle.metrics.epistemicRigorScore}%
                </span>
                <span className="text-xs text-zinc-400">Weighted Rigor</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${activeBundle.metrics.epistemicRigorScore}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Deterministic Invariants
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-emerald-300">
                  {activeBundle.metrics.deterministicCount}
                </span>
                <span className="text-xs text-zinc-400">
                  / {activeBundle.metrics.totalClaims} claims (
                  {(
                    (activeBundle.metrics.deterministicCount / (activeBundle.metrics.totalClaims || 1)) *
                    100
                  ).toFixed(0)}
                  %)
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 font-mono">
                Exact Math &amp; Code Reproducibility
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Primary Audited Sources
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-cyan-300">
                  {activeBundle.metrics.primarySourceCount}
                </span>
                <span className="text-xs text-zinc-400">
                  / {activeBundle.metrics.totalClaims} claims (
                  {(
                    (activeBundle.metrics.primarySourceCount / (activeBundle.metrics.totalClaims || 1)) *
                    100
                  ).toFixed(0)}
                  %)
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 font-mono">SEC EDGAR · FRED · CISA KEV</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Merkle Root</span>
                <button
                  onClick={() => copyToClipboard(activeBundle.merkleRoot, "merkleRoot")}
                  className="text-zinc-400 hover:text-white"
                  title="Copy Merkle Root"
                >
                  {copiedField === "merkleRoot" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
              <div className="mt-2">
                <span
                  className="text-xs font-mono text-zinc-300 block truncate"
                  title={activeBundle.merkleRoot}
                >
                  {activeBundle.merkleRoot.slice(0, 18)}...
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono mt-1">
                  RFC 6962 Standard Tree
                </span>
              </div>
            </div>
          </div>

          {/* Claims Filter Tabs */}
          <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto">
            <span className="text-xs font-mono text-zinc-400 mr-2 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> Filter:
            </span>
            <button
              onClick={() => setBadgeFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                badgeFilter === "ALL"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Claims ({activeBundle.claims.length})
            </button>
            <button
              onClick={() => setBadgeFilter("DETERMINISTIC_PROOF")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                badgeFilter === "DETERMINISTIC_PROOF"
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Deterministic ({activeBundle.metrics.deterministicCount})
            </button>
            <button
              onClick={() => setBadgeFilter("PRIMARY_AUDITED_SOURCE")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                badgeFilter === "PRIMARY_AUDITED_SOURCE"
                  ? "bg-cyan-950/60 text-cyan-300 border border-cyan-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Primary Sources ({activeBundle.metrics.primarySourceCount})
            </button>
            <button
              onClick={() => setBadgeFilter("CONSENSUS_VERDICT")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                badgeFilter === "CONSENSUS_VERDICT"
                  ? "bg-indigo-950/60 text-indigo-300 border border-indigo-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Consensus ({activeBundle.metrics.verdictCount})
            </button>
            <button
              onClick={() => setBadgeFilter("SCENARIO_HYPOTHESIS")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                badgeFilter === "SCENARIO_HYPOTHESIS"
                  ? "bg-amber-950/60 text-amber-300 border border-amber-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Hypotheses ({activeBundle.metrics.hypothesisCount})
            </button>
          </div>

          {/* Claims Stream */}
          <div className="space-y-3">
            {filteredClaims.map((claim) => {
              const badgeStyle = getBadgeStyle(claim.badge);
              return (
                <div
                  key={claim.id}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-400">{claim.id}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${badgeStyle.pill}`}
                      >
                        {badgeStyle.icon}
                        {badgeStyle.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-zinc-400">
                        Confidence:{" "}
                        <strong className="text-emerald-400">
                          {(claim.confidenceScore * 100).toFixed(0)}%
                        </strong>
                      </span>
                      <button
                        onClick={() => copyToClipboard(claim.sha256Proof, claim.id)}
                        className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                        title="Copy SHA-256 Leaf Proof"
                      >
                        {copiedField === claim.id ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Hash className="w-3 h-3" />
                        )}
                        <span>{copiedField === claim.id ? "Proof Copied" : "Leaf Hash"}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                    "{claim.claimText}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 block">PRIMARY ATTESTATION</span>
                      <span className="text-zinc-300 text-[11px]">{claim.sourceAttestation}</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 block">VERIFICATION METHOD</span>
                      <span className="text-zinc-300 text-[11px]">{claim.verificationMethod}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cryptographic Attestation Block */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white uppercase tracking-wider text-xs">
                  Cryptographic Attestation &amp; Merkle Proof Chain
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {activeBundle.bundleId}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Audited: {activeBundle.certifiedBy}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">MERKLE TREE ROOT</span>
                <span className="text-emerald-400 text-[11px] break-all block mt-0.5">
                  {activeBundle.merkleRoot}
                </span>
              </div>
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">ATTESTATION DIGEST</span>
                <span className="text-cyan-400 text-[11px] break-all block mt-0.5">
                  {activeBundle.attestationDigest}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-zinc-500">
              <span>Governing Standards:</span>
              <span className="text-zinc-300">{activeBundle.verificationStandard.join(" · ")}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 text-xs">
          <div className="text-zinc-400 font-mono text-[11px] hidden sm:block">
            Sovereign Engine NOCTIS-LEDGER-001 · Zero Hallucination Boundary
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium shadow-md transition-all"
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
