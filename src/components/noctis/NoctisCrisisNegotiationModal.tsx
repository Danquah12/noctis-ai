import { useState, useMemo } from "react";
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  Clock,
  RotateCcw,
  CheckCircle2,
  Copy,
  FileCode,
  MessageSquare,
  X,
  TrendingDown,
  AlertOctagon,
  Percent,
  Sliders,
  Lock,
} from "lucide-react";
import {
  PREDEFINED_THREAT_SYNDICATES,
  solveCrisisNegotiationGame,
  formatCrisisNegotiationMarkdown,
  type GameTheoreticState,
} from "@/lib/noctis-crisis-negotiation";

interface NoctisCrisisNegotiationModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisCrisisNegotiationModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisCrisisNegotiationModalProps) {
  const [selectedSyndicateId, setSelectedSyndicateId] = useState<string>("syndicate-lockbit");
  const [hoursElapsed, setHoursElapsed] = useState<number>(24);
  const [hourlyDowntimeBurnUsd, setHourlyDowntimeBurnUsd] = useState<number>(45000);
  const [cyberInsuranceCoveragePct, setCyberInsuranceCoveragePct] = useState<number>(60);
  const [backupRecoveryDays, setBackupRecoveryDays] = useState<number>(7);
  const [copied, setCopied] = useState<boolean>(false);

  const syndicateKeys = useMemo(() => Object.keys(PREDEFINED_THREAT_SYNDICATES), []);

  const gameState: GameTheoreticState = useMemo(() => {
    return solveCrisisNegotiationGame({
      syndicateId: selectedSyndicateId,
      hoursElapsed,
      hourlyDowntimeBurnUsd,
      cyberInsuranceCoveragePct,
      backupRecoveryDays,
    });
  }, [
    selectedSyndicateId,
    hoursElapsed,
    hourlyDowntimeBurnUsd,
    cyberInsuranceCoveragePct,
    backupRecoveryDays,
  ]);

  const dossierMarkdown = useMemo(() => {
    return formatCrisisNegotiationMarkdown(gameState);
  }, [gameState]);

  const handleCopySeal = () => {
    navigator.clipboard.writeText(gameState.cryptographicSeal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Crisis Negotiation Dossier: ${gameState.profile.name}`);
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

  const currentSyndicate = gameState.profile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-amber-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-amber-900/40 bg-gradient-to-r from-amber-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Scale className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Game-Theoretic Crisis Negotiation Engine
                </h2>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
                  Subgame Perfect Nash Equilibrium
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Mathematical multi-round extortion solver with Bayesian belief updating & OFAC sanctions compliance
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-amber-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-amber-900/30 bg-amber-950/20 p-2.5">
            <DollarSign className="size-5 text-amber-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Initial Extortion Demand</div>
              <div className="text-sm font-bold text-amber-300">${currentSyndicate.initialDemandUsd.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-amber-900/30 bg-amber-950/20 p-2.5">
            <TrendingDown className="size-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Optimal Counter-Offer</div>
              <div className="text-sm font-bold text-emerald-300">
                {gameState.recommendedCounterOfferUsd > 0
                  ? `$${gameState.recommendedCounterOfferUsd.toLocaleString()}`
                  : "ZERO ($0 VETO)"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-amber-900/30 bg-amber-950/20 p-2.5">
            <Percent className="size-5 text-sky-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Key Delivery Odds</div>
              <div className="text-sm font-bold text-sky-300">{currentSyndicate.keyDeliveryReliabilityPct}% Probability</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-amber-900/30 bg-amber-950/20 p-2.5">
            <AlertOctagon className="size-5 text-red-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">OFAC Sanction Standing</div>
              <div className={`text-sm font-bold ${
                gameState.ofacViolationRisk === "CRITICAL_BLOCKED" ? "text-red-400" : "text-emerald-400"
              }`}>
                {gameState.ofacViolationRisk}
              </div>
            </div>
          </div>
        </div>

        {/* Syndicate Selector Ribbon */}
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 p-3 overflow-x-auto text-xs">
          <span className="text-zinc-400 font-semibold whitespace-nowrap text-[11px] uppercase mr-1">
            Threat Profile:
          </span>
          {syndicateKeys.map((key) => {
            const s = PREDEFINED_THREAT_SYNDICATES[key];
            const isSelected = s.id === selectedSyndicateId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSyndicateId(s.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition ${
                  isSelected
                    ? "bg-amber-500/20 border-amber-500/60 text-amber-200"
                    : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Simulation Sliders & Matrix View */}
          <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-4 overflow-y-auto">
            {/* Simulation Parameter Sliders */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Sliders className="size-4 text-amber-400" />
                <span>Crisis Variables & Economic Parameters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Incident Age:</span>
                    <span className="text-zinc-200 font-bold">{hoursElapsed} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="168"
                    value={hoursElapsed}
                    onChange={(e) => setHoursElapsed(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Downtime Burn Rate:</span>
                    <span className="text-zinc-200 font-bold">${hourlyDowntimeBurnUsd.toLocaleString()}/hr</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="150000"
                    step="5000"
                    value={hourlyDowntimeBurnUsd}
                    onChange={(e) => setHourlyDowntimeBurnUsd(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Cyber Insurance Coverage:</span>
                    <span className="text-zinc-200 font-bold">{cyberInsuranceCoveragePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={cyberInsuranceCoveragePct}
                    onChange={(e) => setCyberInsuranceCoveragePct(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Cold-Storage Rebuild Window:</span>
                    <span className="text-zinc-200 font-bold">{backupRecoveryDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={backupRecoveryDays}
                    onChange={(e) => setBackupRecoveryDays(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Payoff Comparison Matrix */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-300">Strategic Payoff Matrix (Expected Total Loss):</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Pay Initial Demand</div>
                  <div className="text-base font-bold text-red-400">
                    ${gameState.payoffMatrix.payFullExpectedLossUsd.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-500">Includes secondary re-extortion risk</div>
                </div>

                <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 space-y-1">
                  <div className="text-[10px] text-amber-300 uppercase font-semibold">Anchor Counter-Offer</div>
                  <div className="text-base font-bold text-amber-300">
                    ${gameState.payoffMatrix.counterOfferExpectedLossUsd.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-amber-400">Optimal repeated-game equilibrium</div>
                </div>

                <div className="rounded-xl border border-sky-500/40 bg-sky-950/20 p-3 space-y-1">
                  <div className="text-[10px] text-sky-300 uppercase font-semibold">Cold-Storage Rebuild</div>
                  <div className="text-base font-bold text-sky-300">
                    ${gameState.payoffMatrix.restoreBackupsExpectedLossUsd.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-sky-400">Zero extortion, clean offline build</div>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Recommendation Viewport */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            <div className={`rounded-xl border p-3 space-y-2 ${
              gameState.ofacViolationRisk === "CRITICAL_BLOCKED"
                ? "bg-red-950/30 border-red-500/60"
                : "bg-amber-950/30 border-amber-500/60"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">Recommended Policy</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/40 text-amber-300 border border-white/5">
                  {gameState.recommendedStrategy}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                {gameState.strategicRationale}
              </p>
            </div>

            {/* Cryptographic Seal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Nash Solution Seal</span>
                <button
                  onClick={handleCopySeal}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {gameState.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExportCanvas}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium py-2.5 text-xs transition shadow-lg shadow-amber-600/20"
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
  );
}
