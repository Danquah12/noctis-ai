import React, { useState, useEffect } from "react";
import { GitPullRequest, ExternalLink, Key, Check, ShieldCheck, FileCode, AlertCircle, X } from "lucide-react";
import { createGitHubPrPackage, dispatchLiveGitHubPr, type GitHubDispatchResult } from "@/lib/noctis-github-dispatcher";

export interface NoctisGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifactTitle: string;
  activeContent: string;
}

export default function NoctisGitHubModal({
  isOpen,
  onClose,
  artifactTitle,
  activeContent
}: NoctisGitHubModalProps) {
  const [repo, setRepo] = useState("Danquah12/noctis-ai");
  const [baseBranch, setBaseBranch] = useState("main");
  const [filePath, setFilePath] = useState("src/remediation/sovereign-patch.ts");
  const [token, setToken] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [result, setResult] = useState<GitHubDispatchResult | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("noctis_github_token");
    if (saved) setToken(saved);
  }, []);

  const handleSaveToken = (val: string) => {
    setToken(val);
    localStorage.setItem("noctis_github_token", val);
  };

  const handlePreparePackage = () => {
    const pkg = createGitHubPrPackage({
      repo,
      baseBranch,
      filePath,
      originalContent: "// Original unpatched implementation\nexport const VULNERABLE = true;",
      patchedContent: activeContent,
      prTitle: `fix(security): auto-remediation patch for ${artifactTitle}`,
      token
    });
    setResult(pkg);
    return pkg;
  };

  const handleDispatchLive = async () => {
    setIsDispatching(true);
    try {
      const res = await dispatchLiveGitHubPr({
        repo,
        baseBranch,
        filePath,
        originalContent: "// Original unpatched implementation\nexport const VULNERABLE = true;",
        patchedContent: activeContent,
        prTitle: `fix(security): auto-remediation patch for ${artifactTitle}`,
        token
      });
      setResult(res);
    } finally {
      setIsDispatching(false);
    }
  };

  if (!isOpen) return null;

  const pkg = result || handlePreparePackage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0d1017] border border-[#e4b86a]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#121622]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#e4b86a]/15 text-[#e4b86a]">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                AUTONOMOUS GITHUB PR AUTO-REMEDIATOR
              </h3>
              <p className="font-mono text-xs text-zinc-400">
                FIPS 180-4 Sealed Pull Request Dispatcher
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 font-mono text-xs text-zinc-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Target Repository</label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-100 outline-none focus:border-[#e4b86a]/50"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Target File Path</label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-100 outline-none focus:border-[#e4b86a]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              GitHub Personal Access Token (Optional for direct API dispatch)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => handleSaveToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (stored in browser memory)"
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-100 outline-none focus:border-[#e4b86a]/50"
              />
            </div>
          </div>

          {/* Unified Diff Box */}
          <div className="space-y-1">
            <span className="text-[11px] text-zinc-400">Unified Diff Patch (RFC Compliant):</span>
            <pre className="p-3 bg-black/60 border border-white/10 rounded-lg text-emerald-300 font-mono text-[11px] max-h-36 overflow-y-auto">
              {pkg.unifiedDiff}
            </pre>
          </div>

          {/* Attestation Seal Badge */}
          <div className="p-3 bg-zinc-900/60 border border-[#e4b86a]/20 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#e4b86a] font-bold">SOVEREIGN AUDIT PASSPORT EMBEDDED</span>
              <span className="text-[10px] text-emerald-400">{pkg.passportId}</span>
            </div>
            <p className="text-[10px] text-zinc-500 break-all">Commit Seal: {pkg.commitSeal}</p>
          </div>

          {pkg.error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pkg.error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-[#121622]">
          <a
            href={pkg.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 rounded-xl font-mono text-xs transition"
          >
            <span>Open 1-Click PR on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={handleDispatchLive}
            disabled={isDispatching || !token}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#e4b86a] hover:bg-[#d8a855] text-black font-semibold rounded-xl font-mono text-xs transition disabled:opacity-40"
          >
            <GitPullRequest className="w-4 h-4" />
            <span>{isDispatching ? "Dispatching..." : "Dispatch Live via API"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
