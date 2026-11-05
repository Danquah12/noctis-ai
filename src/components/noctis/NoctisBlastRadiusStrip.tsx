import React from 'react';
import { ShieldCheck, Zap, AlertTriangle, ArrowRight, Clock, Target } from 'lucide-react';
import { calculateBlastRadius, type BlastRadiusReport } from '@/lib/noctis-blast-radius';
import { runPreMortemFuzzer, type PreMortemFuzzerReport } from '@/lib/noctis-fuzzer';

export interface NoctisBlastRadiusStripProps {
  content: string;
  title?: string;
  onOpenPassport?: () => void;
  className?: string;
}

export default function NoctisBlastRadiusStrip({
  content,
  title,
  onOpenPassport,
  className = ''
}: NoctisBlastRadiusStripProps) {
  const blast: BlastRadiusReport = React.useMemo(
    () => calculateBlastRadius(content, title),
    [content, title]
  );

  const fuzzer: PreMortemFuzzerReport = React.useMemo(
    () => runPreMortemFuzzer(content),
    [content]
  );

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#12161f]/90 border border-emerald-500/25 rounded-lg text-xs font-mono text-zinc-300 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Target Scope */}
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Target className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-400">Target:</span>
          <span className="text-cyan-300 font-semibold">{blast.targetResource}</span>
          <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
            {blast.scopeDescription}
          </span>
        </div>

        {/* Downtime SLA */}
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-zinc-400">Collateral:</span>
          <span className="text-emerald-300 font-semibold">
            {blast.collateralDowntimeMs}ms Downtime
          </span>
        </div>

        {/* Rollback SLA */}
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-zinc-400">Rollback SLA:</span>
          <span className="text-amber-300 font-semibold">
            &lt;{blast.reversibilitySlaMs / 1000}s
          </span>
        </div>

        {/* Pre-Mortem Fuzzer Integrity */}
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#e4b86a]" />
          <span className="text-zinc-400">Pre-Mortem:</span>
          <span className="text-[#e4b86a] font-semibold">
            {fuzzer.neutralizedVectors}/{fuzzer.totalVectors} Neutralized
          </span>
          <span className="text-[10px] text-zinc-400">({fuzzer.latencyMs}ms)</span>
        </div>
      </div>

      {/* Passport Link Button */}
      {onOpenPassport && (
        <button
          onClick={onOpenPassport}
          className="flex items-center gap-1 px-2 py-0.5 bg-[#e4b86a]/15 hover:bg-[#e4b86a]/25 text-[#e4b86a] border border-[#e4b86a]/30 rounded text-[11px] font-medium transition-colors"
          title="Open Sovereign Cryptographic Audit Passport in Canvas"
        >
          <span>Passport</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
