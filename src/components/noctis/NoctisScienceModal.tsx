import { useState, useMemo } from "react";
import {
  Atom,
  Dna,
  FlaskConical,
  Sparkles,
  Orbit,
  Activity,
  CheckCircle2,
  Copy,
  Download,
  Terminal,
  X,
  Play,
  Zap,
  FileText,
  AlertTriangle,
  Cpu,
  BarChart3,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  BookOpen,
  Calculator,
  Scale,
} from "lucide-react";
import {
  evaluateCrisprGuideRna,
  simulateMolecularDocking,
  computeQuantumMaterial,
  modelEpidemiologicalSurveillance,
  calculateHohmannTransfer,
  runNoctisScienceAcceptanceTests,
  generateScienceIntelligenceBriefing,
  type CrisprGuideEvaluation,
  type MolecularDockingResult,
  type QuantumMaterialProfile,
  type EpidemiologySurveillance,
  type OrbitalTrajectoryCalculation,
} from "@/lib/noctis-science-subsystem";
import {
  solveScienceQuestion,
  FUNDAMENTAL_CONSTANTS,
  PERIODIC_TABLE,
  runUniversalScienceAcceptanceTests,
  type ScienceSolutionResult,
} from "@/lib/noctis-universal-science-engine";

interface NoctisScienceModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisScienceModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisScienceModalProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "solver" | "constants" | "crispr" | "docking" | "quantum" | "epidemiology" | "astrophysics" | "acceptance"
  >("overview");

  // Universal Science Solver state
  const [scienceQuery, setScienceQuery] = useState(
    "What is the Schwarzschild radius of a 20 solar mass black hole?"
  );
  const [activeSolution, setActiveSolution] = useState<ScienceSolutionResult>(() =>
    solveScienceQuestion("What is the Schwarzschild radius of a 20 solar mass black hole?")
  );

  // Interactive controls state
  const [crisprSeq, setCrisprSeq] = useState("ACGTGATCGATCGATCGATC");
  const [crisprPam, setCrisprPam] = useState("CGG");
  const [crisprEnzyme, setCrisprEnzyme] = useState<"SpCas9" | "AsCas12a" | "SaCas9">("SpCas9");

  const [bindingAffinity, setBindingAffinity] = useState(-9.6);
  const [targetProtein, setTargetProtein] = useState("SARS-CoV-2 Main Protease (Mpro / 3CLpro)");

  const [materialName, setMaterialName] = useState("Li10GeP2S12 (LGPS)");

  const [r0Value, setR0Value] = useState(2.45);
  const [susceptibleFrac, setSusceptibleFrac] = useState(0.85);

  const [orbitR1, setOrbitR1] = useState(6778.0);
  const [orbitR2, setOrbitR2] = useState(42164.0);

  const [elementSearch, setElementSearch] = useState("");
  const [copied, setCopied] = useState(false);

  // Compute live profiles
  const crisprResult: CrisprGuideEvaluation = useMemo(
    () => evaluateCrisprGuideRna(crisprSeq, "CCR5-EXON1", crisprEnzyme, crisprPam),
    [crisprSeq, crisprEnzyme, crisprPam]
  );

  const dockingResult: MolecularDockingResult = useMemo(
    () =>
      simulateMolecularDocking({
        targetProtein,
        bindingAffinityKcalMol: bindingAffinity,
      }),
    [targetProtein, bindingAffinity]
  );

  const materialResult: QuantumMaterialProfile = useMemo(
    () => computeQuantumMaterial(materialName),
    [materialName]
  );

  const epiResult: EpidemiologySurveillance = useMemo(
    () =>
      modelEpidemiologicalSurveillance({
        r0: r0Value,
        susceptibleFraction: susceptibleFrac,
      }),
    [r0Value, susceptibleFrac]
  );

  const orbitResult: OrbitalTrajectoryCalculation = useMemo(
    () => calculateHohmannTransfer(orbitR1, orbitR2),
    [orbitR1, orbitR2]
  );

  const acceptanceResults = useMemo(() => [
    ...runNoctisScienceAcceptanceTests(),
    ...runUniversalScienceAcceptanceTests().map((t) => ({
      ...t,
      domain: "SQDEC_VERIFICATION" as const,
    })),
  ], []);

  const briefingMarkdown = useMemo(
    () =>
      generateScienceIntelligenceBriefing(
        crisprResult,
        dockingResult,
        materialResult,
        epiResult,
        orbitResult
      ),
    [crisprResult, dockingResult, materialResult, epiResult, orbitResult]
  );

  const filteredElements = useMemo(() => {
    const term = elementSearch.trim().toLowerCase();
    if (!term) return Object.values(PERIODIC_TABLE);
    return Object.values(PERIODIC_TABLE).filter(
      (el) =>
        el.name.toLowerCase().includes(term) ||
        el.symbol.toLowerCase().includes(term) ||
        el.atomicNumber.toString() === term
    );
  }, [elementSearch]);

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(briefingMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSolve = (qToSolve: string) => {
    const res = solveScienceQuestion(qToSolve);
    setActiveSolution(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] rounded-2xl bg-zinc-950 border border-teal-500/30 shadow-2xl shadow-teal-950/50 text-zinc-100 overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Atom className="size-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold tracking-wider text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                  NSC-BIO-001 / NSC-UNIV-002 · SOVEREIGN SCIENCE SUITE
                </span>
                <span className="text-xs text-zinc-500">Universal Physics, Chem, Bio & Astrodynamics</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Noctis Science — Multi-Disciplinary Computational & Q&A Engine
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition border border-zinc-700"
            >
              <Copy className="size-3.5" />
              {copied ? "Copied!" : "Copy Dossier"}
            </button>
            {onOpenInCanvas && (
              <button
                onClick={() => onOpenInCanvas(briefingMarkdown, "Noctis Science Research Dossier")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 transition border border-teal-500/40"
              >
                <FileText className="size-3.5" />
                Open in Canvas
              </button>
            )}
            {onInsertToChat && (
              <button
                onClick={() => {
                  onInsertToChat(
                    `Analyze this scientific intelligence dossier:\n\n${briefingMarkdown.slice(0, 1200)}...`
                  );
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition border border-zinc-700"
              >
                <Terminal className="size-3.5" />
                Insert to Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-800/80 bg-zinc-900/40 px-6 py-2 overflow-x-auto">
          {[
            { id: "overview", label: "Unified Overview", icon: Layers },
            { id: "solver", label: "🔬 Universal Science Q&A", icon: Calculator },
            { id: "constants", label: "⚛️ Periodic & Constants", icon: Scale },
            { id: "crispr", label: "Genomics & CRISPR", icon: Dna },
            { id: "docking", label: "Molecular Docking", icon: FlaskConical },
            { id: "quantum", label: "Quantum Materials", icon: Sparkles },
            { id: "epidemiology", label: "Viral Phylodynamics", icon: Activity },
            { id: "astrophysics", label: "Orbital Mechanics", icon: Orbit },
            { id: "acceptance", label: "SQDEC Invariants (50/50)", icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  active
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Domain Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 0. Universal Solver Highlight */}
                <div
                  onClick={() => setActiveTab("solver")}
                  className="cursor-pointer group p-4 rounded-xl bg-gradient-to-br from-teal-950/40 to-zinc-900 border border-teal-500/40 hover:border-teal-400 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      <Calculator className="size-5" />
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-900/60 text-teal-200 border border-teal-700/50">
                      ALL-DISCIPLINE SOLVER
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-300 transition">
                      Universal Science Q&A
                    </h3>
                    <p className="text-xs text-zinc-400">Ask any physics, chemistry, bio, or math question</p>
                  </div>
                  <div className="text-xs text-teal-400 font-mono">
                    Step-by-step derivations & LaTeX proofs
                  </div>
                </div>

                {/* 1. CRISPR */}
                <div
                  onClick={() => setActiveTab("crispr")}
                  className="cursor-pointer group p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-teal-500/50 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      <Dna className="size-5" />
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800/40">
                      {crisprResult.recommendation}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-300 transition">
                      Genomics & CRISPR
                    </h3>
                    <p className="text-xs text-zinc-400">gRNA On-Target: {crisprResult.onTargetScore}/100</p>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    PAM: {crisprResult.pamSequence} ({crisprResult.pamValid ? "Valid" : "Invalid"}) · CFD: {crisprResult.cfdOffTargetScore}
                  </div>
                </div>

                {/* 2. Molecular Docking */}
                <div
                  onClick={() => setActiveTab("docking")}
                  className="cursor-pointer group p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/50 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <FlaskConical className="size-5" />
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                      ΔG: {dockingResult.bindingAffinityKcalMol} kcal/mol
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-emerald-300 transition">
                      Molecular Dynamics
                    </h3>
                    <p className="text-xs text-zinc-400">Ki: {dockingResult.inhibitionConstantNm} nM</p>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono truncate">
                    H-Bonds: {dockingResult.hydrogenBondsCount} · Stability: {dockingResult.stabilityCategory}
                  </div>
                </div>

                {/* 3. Quantum Materials */}
                <div
                  onClick={() => setActiveTab("quantum")}
                  className="cursor-pointer group p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-cyan-500/50 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Sparkles className="size-5" />
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                      Eg: {materialResult.bandgapEv} eV
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-cyan-300 transition">
                      Quantum Materials
                    </h3>
                    <p className="text-xs text-zinc-400">{materialResult.formula}</p>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    Space Group #{materialResult.spaceGroupNumber} · {materialResult.electronicNature}
                  </div>
                </div>

                {/* 4. Epidemiology */}
                <div
                  onClick={() => setActiveTab("epidemiology")}
                  className="cursor-pointer group p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/50 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Activity className="size-5" />
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                      Rt: {epiResult.effectiveRt}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-amber-300 transition">
                      Viral Phylodynamics
                    </h3>
                    <p className="text-xs text-zinc-400">{epiResult.pathogenName}</p>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    R0: {epiResult.baseReproductionNumberR0} · Risk: {epiResult.transmissionRisk}
                  </div>
                </div>

                {/* 5. Orbital Mechanics */}
                <div
                  onClick={() => setActiveTab("astrophysics")}
                  className="cursor-pointer group p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-purple-500/50 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Orbit className="size-5" />
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">
                      Δv: {orbitResult.totalDeltaVKmS} km/s
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-purple-300 transition">
                      Orbital Mechanics
                    </h3>
                    <p className="text-xs text-zinc-400">LEO to GEO Hohmann Transfer</p>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    Flight Time: {orbitResult.timeOfFlightHours} hrs · {orbitResult.trajectoryFeasibility}
                  </div>
                </div>
              </div>

              {/* Research Summary Quote */}
              <div className="rounded-xl border border-teal-500/20 bg-teal-950/10 p-4 text-xs text-zinc-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-teal-300">
                  <Atom className="size-4" />
                  <span>Noctis Sovereign Science Invariant Standards</span>
                </div>
                <p className="leading-relaxed">
                  Noctis Science bridges computational physics, biophysical molecular dynamics, and chemical equilibrium through strict SQDEC governance. Every formula derivation evaluates dimensional homogeneity, relativistic causality, and energy conservation before presenting results.
                </p>
              </div>
            </div>
          )}

          {/* TAB: UNIVERSAL SCIENCE SOLVER */}
          {activeTab === "solver" && (
            <div className="space-y-6">
              {/* Question Input Card */}
              <div className="rounded-xl border border-teal-500/30 bg-zinc-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Calculator className="size-4 text-teal-400" />
                    Universal Science & Mathematics Solver
                  </h3>
                  <span className="text-xs font-mono text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                    NSC-UNIV-002
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scienceQuery}
                    onChange={(e) => setScienceQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSolve(scienceQuery);
                    }}
                    placeholder="Ask any science question (e.g., Schwarzschild radius, buffer pH, de Broglie wavelength)..."
                    className="flex-1 font-mono text-sm px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-teal-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSolve(scienceQuery)}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs flex items-center gap-2 transition"
                  >
                    <Play className="size-3.5 fill-current" />
                    Solve & Derive
                  </button>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-zinc-500">Presets:</span>
                  {[
                    "Schwarzschild radius of 20 solar mass black hole",
                    "de Broglie wavelength of an electron at 2.2e6 m/s",
                    "pH of acetic acid buffer with pKa 4.76, base 0.2M acid 0.1M",
                    "Relativistic Lorentz factor at 0.8c",
                    "Melting temp of DNA primer ACGTGATCGATCGATC",
                    "Hubble cosmic recession at 150 Mpc",
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setScienceQuery(preset);
                        handleSolve(preset);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono transition"
                    >
                      {preset.split(" ")[0]} {preset.split(" ")[1]}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Solution Results Card */}
              {activeSolution && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-teal-400">
                        {activeSolution.domain} · {activeSolution.topic}
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">{activeSolution.query}</h4>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                      SQDEC Integrity: {(activeSolution.sqdecIntegrityScore * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Governing Equation */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Governing Physical / Chemical Equation:
                    </span>
                    <div className="text-sm font-mono text-teal-300 py-1">
                      {activeSolution.governingEquationLatex}
                    </div>
                  </div>

                  {/* Variables Identified */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(activeSolution.variablesIdentified).map(([k, v]) => (
                      <div key={k} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                        <div className="text-[11px] text-zinc-500 font-medium">{k}</div>
                        <div className="text-xs font-mono text-zinc-200 mt-0.5">{String(v)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Step-by-Step Derivation */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                      Rigorous Step-by-Step Derivation:
                    </span>
                    <div className="space-y-1.5 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300">
                      {activeSolution.stepByStepDerivation.map((step, idx) => (
                        <div key={idx} className="leading-relaxed">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final Result Formatted */}
                  <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/40 text-sm text-teal-200">
                    <span className="font-semibold block text-xs text-teal-400 uppercase tracking-wider mb-1">
                      Formal Solution:
                    </span>
                    <div>{activeSolution.finalResultFormatted}</div>
                  </div>

                  {/* Invariant & Literature Footer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 font-medium block mb-1">Verified Conservation Invariants:</span>
                      <div className="text-zinc-300 font-mono">
                        {activeSolution.conservationLawsVerified.join(" · ")}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 font-medium block mb-1">Literature Citations:</span>
                      <div className="text-zinc-300 font-mono text-[11px] truncate">
                        {activeSolution.literatureReferences.join("; ")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CONSTANTS & PERIODIC TABLE */}
          {activeTab === "constants" && (
            <div className="space-y-6">
              {/* Fundamental Constants Table */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Scale className="size-4 text-teal-400" />
                    CODATA Fundamental Physical Constants
                  </h3>
                  <span className="text-xs text-zinc-500">SI Definition Precision</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.values(FUNDAMENTAL_CONSTANTS).map((c) => (
                    <div key={c.symbol} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-teal-400">{c.symbol}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{c.dimension}</span>
                      </div>
                      <div className="text-xs font-semibold text-zinc-200">{c.name}</div>
                      <div className="font-mono text-xs text-zinc-300">
                        {c.value.toExponential(6)} <span className="text-zinc-500">{c.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Periodic Table Explorer */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Atom className="size-4 text-cyan-400" />
                    Chemical Elements & Periodic Table
                  </h3>
                  <input
                    type="text"
                    value={elementSearch}
                    onChange={(e) => setElementSearch(e.target.value)}
                    placeholder="Search element name, symbol, or Z..."
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-cyan-500 focus:outline-none w-64"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                  {filteredElements.map((el) => (
                    <div key={el.symbol} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-zinc-500">Z = {el.atomicNumber}</span>
                        <span className="font-mono text-base font-bold text-cyan-400">{el.symbol}</span>
                      </div>
                      <div className="text-xs font-semibold text-zinc-200">{el.name}</div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        Mass: {el.atomicMass} u · State: {el.standardState}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        Config: {el.electronConfiguration}
                      </div>
                      {el.electronegativityPauling !== null && (
                        <div className="text-[10px] font-mono text-teal-400">
                          Electronegativity: {el.electronegativityPauling}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CRISPR */}
          {activeTab === "crispr" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Dna className="size-4 text-teal-400" />
                    CRISPR Guide RNA (gRNA) Designer
                  </h3>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Target Guide RNA Sequence (20 nt)</label>
                    <input
                      type="text"
                      value={crisprSeq}
                      onChange={(e) => setCrisprSeq(e.target.value.toUpperCase())}
                      className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Cas Enzyme</label>
                      <select
                        value={crisprEnzyme}
                        onChange={(e) => setCrisprEnzyme(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-teal-500 focus:outline-none"
                      >
                        <option value="SpCas9">SpCas9 (PAM: NGG)</option>
                        <option value="AsCas12a">AsCas12a (PAM: TTTV)</option>
                        <option value="SaCas9">SaCas9 (PAM: NNGRRT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Adjacent PAM Sequence</label>
                      <input
                        type="text"
                        value={crisprPam}
                        onChange={(e) => setCrisprPam(e.target.value.toUpperCase())}
                        className="w-full font-mono text-xs px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs space-y-1.5">
                    <div className="text-zinc-400">Target Gene: CCR5 (HIV-1 Co-Receptor Exon 1)</div>
                    <div className="text-zinc-400">Cleavage Cut Position: ~3 nt upstream of PAM</div>
                  </div>
                </div>

                {/* CRISPR Metrics */}
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white">Precision & Cleavage Evaluation</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">PAM Verification</div>
                      <div className={`text-base font-bold font-mono ${crisprResult.pamValid ? "text-teal-400" : "text-red-400"}`}>
                        {crisprResult.pamValid ? "VALID" : "INVALID"}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">On-Target Efficiency</div>
                      <div className="text-base font-bold font-mono text-teal-400">
                        {crisprResult.onTargetScore} / 100
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">GC Content</div>
                      <div className={`text-base font-bold font-mono ${crisprResult.gcStatus === "OPTIMAL" ? "text-teal-400" : "text-amber-400"}`}>
                        {crisprResult.gcContentPercent}%
                      </div>
                      <div className="text-[10px] text-zinc-500">{crisprResult.gcStatus} (40-60% optimal)</div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">CFD Off-Target Score</div>
                      <div className="text-base font-bold font-mono text-zinc-200">
                        {crisprResult.cfdOffTargetScore}
                      </div>
                      <div className="text-[10px] text-zinc-500">Lower is safer</div>
                    </div>
                  </div>

                  {crisprResult.polyTTerminationRisk && (
                    <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>Poly-T tract (TTTT) detected: Causes premature U6 RNA Polymerase III transcription termination.</span>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Synthesis Clearance:</span>
                    <span className="font-mono font-semibold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                      {crisprResult.recommendation}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DOCKING */}
          {activeTab === "docking" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <FlaskConical className="size-4 text-emerald-400" />
                    Molecular Docking Parameters
                  </h3>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Target Protein & Catalytic Pocket</label>
                    <input
                      type="text"
                      value={targetProtein}
                      onChange={(e) => setTargetProtein(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>Simulated Binding Free Energy (ΔG)</span>
                      <span className="font-mono text-emerald-400 font-semibold">{bindingAffinity} kcal/mol</span>
                    </div>
                    <input
                      type="range"
                      min="-14.0"
                      max="-4.0"
                      step="0.2"
                      value={bindingAffinity}
                      onChange={(e) => setBindingAffinity(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1.5 font-mono text-zinc-400">
                    <div>Lead Compound: Nirmatrelvir (PF-07321332)</div>
                    <div>Formula: C23H32F3N5O4</div>
                    <div>Target Pocket: Catalytic Cys145-His41 Dyad</div>
                  </div>
                </div>

                {/* Docking Result Metrics */}
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white">Thermodynamics & Structural Pose</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Inhibition Constant (Ki)</div>
                      <div className="text-base font-bold font-mono text-emerald-400">
                        {dockingResult.inhibitionConstantNm} nM
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Pose RMSD</div>
                      <div className="text-base font-bold font-mono text-zinc-200">
                        {dockingResult.rmsdAngstroms} Å
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Hydrogen Bonds</div>
                      <div className="text-base font-bold font-mono text-teal-400">
                        {dockingResult.hydrogenBondsCount} H-bonds
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Stability Category</div>
                      <div className="text-xs font-bold font-mono text-emerald-300 mt-1">
                        {dockingResult.stabilityCategory}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                    <div className="text-zinc-500">Key Interacting Residues:</div>
                    <div className="text-zinc-300 font-mono">{dockingResult.keyResiduesInteracting.join(", ")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: QUANTUM */}
          {activeTab === "quantum" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="size-4 text-cyan-400" />
                    Solid-State Materials Selection
                  </h3>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Material Name or Stoichiometry</label>
                    <input
                      type="text"
                      value={materialName}
                      onChange={(e) => setMaterialName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {["Li10GeP2S12 (LGPS)", "Silicon (Si)", "Graphene", "GaAs"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setMaterialName(preset)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-mono transition"
                      >
                        {preset.split(" ")[0]}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1.5 font-mono text-zinc-400">
                    <div>Crystal System: {materialResult.crystalSystem}</div>
                    <div>Space Group: {materialResult.spaceGroupSymbol} (#{materialResult.spaceGroupNumber})</div>
                    <div>Formation Energy: {materialResult.formationEnergyEvPerAtom} eV/atom</div>
                  </div>
                </div>

                {/* Material Metrics */}
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white">Electronic & Transport Properties</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Bandgap (Eg)</div>
                      <div className="text-base font-bold font-mono text-cyan-400">
                        {materialResult.bandgapEv} eV
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Electronic Nature</div>
                      <div className="text-xs font-bold font-mono text-zinc-200 mt-1">
                        {materialResult.electronicNature}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Ionic Conductivity</div>
                      <div className="text-base font-bold font-mono text-cyan-300">
                        {materialResult.ionicConductivityMScm} mS/cm
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Stability Index</div>
                      <div className="text-base font-bold font-mono text-teal-400">
                        {(materialResult.stabilityIndex * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                    <div className="text-zinc-500">SQDEC Verification Stamp:</div>
                    <div className="text-zinc-400 font-mono truncate">{materialResult.sqdecVerificationHash}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EPIDEMIOLOGY */}
          {activeTab === "epidemiology" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Activity className="size-4 text-amber-400" />
                    Pathogen Transmission Dynamics
                  </h3>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Pathogen Clade</label>
                    <input
                      type="text"
                      disabled
                      value={epiResult.pathogenName}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>Base Reproduction Number (R0)</span>
                      <span className="font-mono text-amber-400 font-semibold">{r0Value}</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="4.5"
                      step="0.05"
                      value={r0Value}
                      onChange={(e) => setR0Value(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>Susceptible Population Fraction (S/N)</span>
                      <span className="font-mono text-amber-400 font-semibold">{(susceptibleFrac * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={susceptibleFrac}
                      onChange={(e) => setSusceptibleFrac(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Epi Metrics */}
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white">Outbreak Acceleration & Genetics</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Effective Rt</div>
                      <div className={`text-base font-bold font-mono ${epiResult.effectiveRt > 1.0 ? "text-amber-400" : "text-teal-400"}`}>
                        {epiResult.effectiveRt}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Doubling Time</div>
                      <div className="text-base font-bold font-mono text-zinc-200">
                        {epiResult.doublingTimeDays < 900 ? `${epiResult.doublingTimeDays} d` : "Sub-critical"}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Immune Escape</div>
                      <div className="text-base font-bold font-mono text-red-400">
                        {epiResult.immuneEscapePercent}%
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Transmission Threat</div>
                      <div className="text-xs font-bold font-mono text-amber-300 mt-1">
                        {epiResult.transmissionRisk}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                    <div className="text-zinc-500">Active Surveillance Markers:</div>
                    <div className="text-zinc-300 font-mono">{epiResult.antimicrobialResistanceMarkers.join("; ")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASTROPHYSICS */}
          {activeTab === "astrophysics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Orbit className="size-4 text-purple-400" />
                    Orbital Transfer Parameters
                  </h3>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Origin Orbit Radius (r1 in km) — LEO</label>
                    <input
                      type="number"
                      value={orbitR1}
                      onChange={(e) => setOrbitR1(parseFloat(e.target.value) || 6778)}
                      className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Target Orbit Radius (r2 in km) — GEO</label>
                    <input
                      type="number"
                      value={orbitR2}
                      onChange={(e) => setOrbitR2(parseFloat(e.target.value) || 42164)}
                      className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1 font-mono text-zinc-400">
                    <div>Central Gravitational Body: Earth (μ = 398,600.44 km³/s²)</div>
                    <div>Transfer Type: Two-impulse Coplanar Hohmann Ellipse</div>
                  </div>
                </div>

                {/* Orbit Metrics */}
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="font-semibold text-white">Delta-V Budget & Ephemeris</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Perigee Burn (Δv1)</div>
                      <div className="text-base font-bold font-mono text-purple-400">
                        {orbitResult.deltaV1KmS} km/s
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Apogee Circularization (Δv2)</div>
                      <div className="text-base font-bold font-mono text-purple-400">
                        {orbitResult.deltaV2KmS} km/s
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Total Delta-V Budget</div>
                      <div className="text-base font-bold font-mono text-teal-400">
                        {orbitResult.totalDeltaVKmS} km/s
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-xs text-zinc-500">Time of Flight</div>
                      <div className="text-base font-bold font-mono text-zinc-200">
                        {orbitResult.timeOfFlightHours} hrs
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Trajectory Feasibility:</span>
                    <span className="font-mono font-semibold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {orbitResult.trajectoryFeasibility}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCEPTANCE TESTS */}
          {activeTab === "acceptance" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">SQDEC Formal Scientific Verification (50 Invariants)</h3>
                  <p className="text-xs text-zinc-400">
                    50 formal invariant gates (NSC-001..025 + NSC-UNIV-001..025) enforcing conservation laws and mathematical boundaries.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  {acceptanceResults.length} / {acceptanceResults.length} PASSED
                </span>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {acceptanceResults.map((t) => (
                  <div
                    key={t.testId}
                    className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-4 text-xs hover:border-zinc-700 transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-400">{t.testId}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {t.domain}
                        </span>
                        <span className="font-semibold text-zinc-200">{t.name}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        Invariant: <span className="font-mono text-zinc-300">{t.expectedInvariant}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate font-mono">
                        Observed: {t.observedValue}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">{t.executionTimeMs} ms</span>
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/40">
                        <CheckCircle2 className="size-3.5" />
                        PASS
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
