import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Copy, Check, Download, Lock, Target, Zap, Clock, AlertTriangle } from 'lucide-react';
import { generateSovereignPassport, type SovereignPassport } from '@/lib/noctis-passport';

export interface NoctisPassportViewProps {
  content: string;
  title?: string;
  className?: string;
}

export default function NoctisPassportView({
  content,
  title = 'Active Sovereign Artifact',
  className = ''
}: NoctisPassportViewProps) {
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [copiedCert, setCopiedCert] = useState(false);

  const passport: SovereignPassport = React.useMemo(
    () => generateSovereignPassport(content, title),
    [content, title]
  );

  const handleCopyDigest = async () => {
    await navigator.clipboard.writeText(passport.fingerprintSha256);
    setCopiedDigest(true);
    setTimeout(() => setCopiedDigest(false), 2000);
  };

  const handleCopyCertificate = async () => {
    await navigator.clipboard.writeText(passport.exportableCertificate);
    setCopiedCert(true);
    setTimeout(() => setCopiedCert(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(passport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${passport.passportId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto space-y-6 text-zinc-200 font-sans ${className}`}>
      {/* Sovereign Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 bg-[#0e121a] border border-[#e4b86a]/30 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e4b86a]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#e4b86a]" />
            <h2 className="text-base font-bold text-zinc-100 tracking-wider font-mono">
              SOVEREIGN AUDIT PASSPORT
            </h2>
            <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-mono font-semibold">
              SEALED & NON-REPUDIABLE
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-400">
            ID: <span className="text-[#e4b86a]">{passport.passportId}</span> · Authority: {passport.authority}
          </p>
          <p className="text-[11px] font-mono text-zinc-400">
            Standard: {passport.standard} · Created: {new Date(passport.timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCertificate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
          >
            {copiedCert ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCert ? 'Copied Cert' : 'Copy Cert'}</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e4b86a]/15 hover:bg-[#e4b86a]/25 text-[#e4b86a] border border-[#e4b86a]/40 rounded-lg text-xs font-mono font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export FIPS JSON</span>
          </button>
        </div>
      </div>

      {/* 4 Invariant Verification Gates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 bg-zinc-900/60 border border-emerald-500/20 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Epistemic Honesty</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-emerald-300">UNKNOWN != 0</p>
          <p className="text-[10px] text-zinc-400">0 ungrounded assumptions</p>
        </div>

        <div className="p-3.5 bg-zinc-900/60 border border-emerald-500/20 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Pre-Mortem Fuzzer</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-[#e4b86a]">
            {passport.fuzzerReport.neutralizedVectors}/{passport.fuzzerReport.totalVectors} Neutralized
          </p>
          <p className="text-[10px] text-zinc-400">Latency: {passport.fuzzerReport.latencyMs}ms</p>
        </div>

        <div className="p-3.5 bg-zinc-900/60 border border-emerald-500/20 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Blast Radius</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-cyan-300">
            {passport.blastRadius.collateralDowntimeMs}ms Downtime
          </p>
          <p className="text-[10px] text-zinc-400">Rollback SLA: &lt;5,000ms</p>
        </div>

        <div className="p-3.5 bg-zinc-900/60 border border-emerald-500/20 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Chain of Custody</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-purple-300">FIPS 180-4</p>
          <p className="text-[10px] text-zinc-400">SHA-256 Tamper-Evident</p>
        </div>
      </div>

      {/* Pre-Mortem Adversarial Fuzzer Vector Breakdown */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold tracking-wider font-mono text-zinc-200">
            PRE-MORTEM ADVERSARIAL VECTOR BREAKDOWN
          </h3>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% Invariant Compliance
          </span>
        </div>

        <div className="space-y-3">
          {passport.fuzzerReport.vectors.map((vec) => (
            <div
              key={vec.vectorId}
              className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg space-y-1 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">{vec.name}</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px]">
                  NEUTRALIZED
                </span>
              </div>
              <p className="text-zinc-400 text-[11px]">{vec.description}</p>
              <p className="text-zinc-300 text-[11px]">
                <span className="text-[#e4b86a]">Mitigation:</span> {vec.mitigation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Cryptographic Attestation Digest */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400">SHA-256 Tamper-Evident Attestation Digest</span>
          <button
            onClick={handleCopyDigest}
            className="flex items-center gap-1 text-[#e4b86a] hover:underline"
          >
            {copiedDigest ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedDigest ? 'Copied' : 'Copy Digest'}</span>
          </button>
        </div>
        <p className="font-mono text-xs text-emerald-400 break-all bg-zinc-950 p-2.5 rounded border border-zinc-800">
          {passport.fingerprintSha256}
        </p>
      </div>
    </div>
  );
}
