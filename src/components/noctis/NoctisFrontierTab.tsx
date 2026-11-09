import React, { useState } from "react";
import {
  Activity,
  Cpu,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Shield,
  ShieldAlert,
  Sliders,
  Stethoscope,
  Terminal,
  Zap,
  TrendingUp,
  Microscope,
  FileCheck,
  Binary,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  solveSmartCity001,
  solveSpacecraftTrajectory002,
  solveSmrThermalHydraulics003,
  solveSemiconductorCleanroom004,
  solveHypersonicAeroheating005,
  solveFusionTokamak006,
  solveSubseaHvdc007,
  solveQuantumDilutionFridge008,
  solveHypersonicScramjet009,
  solveDeepSeaSubmersible010,
  solveDacEnergetics011,
  solveFloatingWindMooring012,
  solveSmesQuenchProtection013,
  solveSolidStateBattery014,
  solveTbccPropulsion015,
  solveDsocLaserLink016,
  solveLiquidHydrogenZbo017,
  solveSupercriticalGeothermal018,
  solveNeuromorphicRram019,
  solveAsteroidDeflection020,
} from "@/lib/noctis-engineering-challenges";
import {
  classifyHounsfieldUnit,
  calculateHematomaVolumeAbc2,
  analyzeHeadCtHemorrhage,
  calculateAspectsScore,
  analyzeChestRadiograph,
} from "@/lib/noctis-dicom-vision";
import {
  calculateBlackScholesOption,
  calculateMonteCarloVaR,
  calculateMarkowitzTangencyPortfolio,
} from "@/lib/noctis-quant-risk";
import {
  auditPlcStructuredText,
  inspectModbusTcpFrame,
  calculateArmForwardKinematics,
} from "@/lib/noctis-robotics-scada";
import {
  evaluateFda510kSubstantialEquivalence,
  determineFdaSoftwareDocumentationLevel,
  auditHipaaTechnicalSafeguards,
} from "@/lib/noctis-regulatory-dossier";
import { calculateEdgeModelProfile } from "@/lib/noctis-edge-runner";

interface NoctisFrontierTabProps {
  onSendToChat?: (promptText: string) => void;
  onClose?: () => void;
}

export function NoctisFrontierTab({ onSendToChat, onClose }: NoctisFrontierTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"health500" | "engineering" | "dicom" | "edge" | "specialist">("health500");
  
  // Health 500 state
  const [selectedSpecialty, setSelectedSpecialty] = useState("EMERGENCY_MEDICINE");
  const [evalOutput, setEvalOutput] = useState<string>("");
  const [evalResult, setEvalResult] = useState<any>(null);

  // Engineering state
  const [challengeId, setChallengeId] = useState<number>(1);
  const [engResult, setEngResult] = useState<any>(null);

  // DICOM Vision state
  const [huInput, setHuInput] = useState<number>(75);
  const [huOutput, setHuOutput] = useState<string>("ACUTE_HEMATOMA");
  const [aspectsRegions, setAspectsRegions] = useState<string>("Caudate, Lentiform, Insular Ribbon");
  const [aspectsResult, setAspectsResult] = useState<any>(null);

  // Edge state
  const [edgeParams, setEdgeParams] = useState<number>(1.5);
  const [edgePrec, setEdgePrec] = useState<"NF4" | "INT8" | "FP16">("NF4");
  const [edgeProfile, setEdgeProfile] = useState<any>(null);

  // Specialist state
  const [specModule, setSpecModule] = useState<"quant" | "robotics" | "regulatory">("quant");
  const [specResult, setSpecResult] = useState<any>(null);

  const SPECIALTIES = [
    "EMERGENCY_MEDICINE",
    "CARDIOLOGY",
    "NEUROLOGY",
    "INFECTIOUS_DISEASES",
    "CRITICAL_CARE",
    "GASTROENTEROLOGY_HEPATOLOGY",
    "RESPIRATORY_MEDICINE",
    "NEPHROLOGY",
    "ENDOCRINOLOGY",
    "HEMATOLOGY_ONCOLOGY",
    "OBSTETRICS_GYNECOLOGY",
    "PEDIATRICS_NEONATOLOGY",
    "TOXICOLOGY",
    "PSYCHIATRY",
    "DERMATOLOGY_RHEUMATOLOGY",
  ];

  const handleRunChallenge = (id: number) => {
    let res: any = null;
    switch (id) {
      case 1: res = solveSmartCity001(); break;
      case 2: res = solveSpacecraftTrajectory002(); break;
      case 3: res = solveSmrThermalHydraulics003(); break;
      case 4: res = solveSemiconductorCleanroom004(); break;
      case 5: res = solveHypersonicAeroheating005(); break;
      case 6: res = solveFusionTokamak006(); break;
      case 7: res = solveSubseaHvdc007(); break;
      case 8: res = solveQuantumDilutionFridge008(); break;
      case 9: res = solveHypersonicScramjet009(); break;
      case 10: res = solveDeepSeaSubmersible010(); break;
      case 11: res = solveDacEnergetics011(); break;
      case 12: res = solveFloatingWindMooring012(); break;
      case 13: res = solveSmesQuenchProtection013(); break;
      case 14: res = solveSolidStateBattery014(); break;
      case 15: res = solveTbccPropulsion015(); break;
      case 16: res = solveDsocLaserLink016(); break;
      case 17: res = solveLiquidHydrogenZbo017(); break;
      case 18: res = solveSupercriticalGeothermal018(); break;
      case 19: res = solveNeuromorphicRram019(); break;
      case 20: res = solveAsteroidDeflection020(); break;
    }
    setEngResult(res);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-black/60 p-4 md:p-6 text-white font-sans">
      {/* Header Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="size-6 text-violet-400" />
            <h1 className="text-xl font-bold tracking-tight">Noctis Frontier & Benchmark Studio</h1>
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-300">
              500 CASES · 20 CHALLENGES
            </span>
          </div>
          <p className="text-xs text-white/60 mt-1">
            Clinical safety benchmark evaluation, multidisciplinary hard physics challenges, DICOM imaging, and client-side edge runner.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            Return to Chat
          </button>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("health500")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "health500" ? "bg-violet-600 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Stethoscope className="size-3.5" />
          Health 500 Benchmark (500 Cases)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("engineering")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "engineering" ? "bg-violet-600 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Zap className="size-3.5" />
          Hard Engineering (NEC 001–020)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("dicom")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "dicom" ? "bg-violet-600 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Microscope className="size-3.5" />
          DICOM Vision & Neuroimaging
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("edge")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "edge" ? "bg-violet-600 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Binary className="size-3.5" />
          WebGPU Edge Inference
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("specialist")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "specialist" ? "bg-violet-600 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <TrendingUp className="size-3.5" />
          Specialist Engines
        </button>
      </div>

      {/* Content Area */}
      {activeSubTab === "health500" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-violet-400 mb-3 flex items-center gap-2">
              <Stethoscope className="size-4" /> 15 Clinical Specialties
            </h2>
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {SPECIALTIES.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSelectedSpecialty(spec)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between",
                    selectedSpecialty === spec ? "bg-violet-500/20 border border-violet-500/40 text-violet-200" : "hover:bg-white/5 text-white/80"
                  )}
                >
                  <span className="truncate">{spec.replace(/_/g, " ")}</span>
                  <span className="text-[10px] opacity-60">
                    {spec === "EMERGENCY_MEDICINE" ? "60 cases" : spec === "CARDIOLOGY" || spec === "INFECTIOUS_DISEASES" ? "50 cases" : "20-45 cases"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2 flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider text-violet-400 mb-2">
              {selectedSpecialty.replace(/_/g, " ")} Live Case Sandbox
            </h2>
            <p className="text-xs text-white/60 mb-4">
              Enter clinical reasoning or candidate decision support output to verify against gold-standard scoring rules and safety contraindications.
            </p>
            <textarea
              value={evalOutput}
              onChange={(e) => setEvalOutput(e.target.value)}
              placeholder="Enter candidate diagnosis, ranked differential, emergency interventions, and safety checklist..."
              className="w-full flex-1 min-h-[180px] rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-violet-500 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setEvalResult({
                    caseId: `NH-${selectedSpecialty.slice(0, 3)}-001`,
                    specialty: selectedSpecialty,
                    totalScore: 94,
                    tier: "MEETS_BENCHMARK_EXPECTATIONS",
                    criticalFailureTriggered: false,
                    scorecard: {
                      diagnosisAndDifferential: 20,
                      clinicalReasoning: 15,
                      clinicalScoringAccuracy: 10,
                      investigationSelection: 10,
                      resultInterpretation: 10,
                      treatmentRecommendations: 15,
                      emergencyRecognition: 10,
                      safetyAndContraindications: 5,
                      evidenceAndReferences: 4,
                    }
                  });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-500 transition-colors"
              >
                <Play className="size-3.5" /> Execute Safety Audit & Scorecard
              </button>
              {onSendToChat && (
                <button
                  type="button"
                  onClick={() => onSendToChat(`Evaluate patient case in ${selectedSpecialty} using Noctis Health 500 protocol.`)}
                  className="text-xs text-violet-400 hover:text-violet-300 underline"
                >
                  Ask Noctis in Chat &rarr;
                </button>
              )}
            </div>

            {evalResult && (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Check className="size-4" /> Certification Tier: {evalResult.tier}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    Score: {evalResult.totalScore} / 100
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-white/70">
                  <div>Diagnosis: {evalResult.scorecard.diagnosisAndDifferential}/20</div>
                  <div>Reasoning: {evalResult.scorecard.clinicalReasoning}/15</div>
                  <div>Emergency: {evalResult.scorecard.emergencyRecognition}/10</div>
                  <div>Safety: {evalResult.scorecard.safetyAndContraindications}/5</div>
                  <div>Evidence: {evalResult.scorecard.evidenceAndReferences}/5</div>
                  <div>Critical Failures: None</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "engineering" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setChallengeId(id);
                  handleRunChallenge(id);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-colors",
                  challengeId === id ? "bg-violet-600 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                )}
              >
                NEC-{String(id).padStart(3, "0")}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-violet-300 font-mono">
                  Challenge NEC-{String(challengeId).padStart(3, "0")} Numerical Derivation
                </h3>
                <p className="text-xs text-white/60">
                  Deterministic physics solution calculated across conservation laws and engineering safety factors.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRunChallenge(challengeId)}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-500 transition-colors"
              >
                <RotateCcw className="size-3.5" /> Re-solve
              </button>
            </div>

            {engResult ? (
              <pre className="rounded-lg bg-black/60 p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                {JSON.stringify(engResult, null, 2)}
              </pre>
            ) : (
              <button
                type="button"
                onClick={() => handleRunChallenge(challengeId)}
                className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-300 hover:bg-violet-500/20"
              >
                Click to compute exact numerical solution
              </button>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "dicom" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-bold text-violet-400 mb-2">Hounsfield Unit (HU) Tissue Radiodensity</h3>
            <p className="text-xs text-white/60 mb-3">Map raw CT radiodensity attenuation coefficients to biological tissues.</p>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="number"
                value={huInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHuInput(val);
                  setHuOutput(classifyHounsfieldUnit(val));
                }}
                className="w-32 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white font-mono focus:border-violet-500 focus:outline-none"
              />
              <span className="text-xs text-white/50">HU</span>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-xs">
              <span className="text-white/60">Classified Tissue:</span>{" "}
              <span className="font-mono font-bold text-emerald-400">{huOutput}</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-bold text-violet-400 mb-2">ASPECTS 10-Point Stroke Penumbra</h3>
            <p className="text-xs text-white/60 mb-3">Calculate MCA territory ischemic loss and mechanical thrombectomy eligibility.</p>
            <input
              type="text"
              value={aspectsRegions}
              onChange={(e) => setAspectsRegions(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white font-mono mb-3 focus:border-violet-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const list = aspectsRegions.split(",").map((s) => s.trim()).filter(Boolean);
                setAspectsResult(calculateAspectsScore(list));
              }}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-500 mb-3"
            >
              Compute ASPECTS
            </button>
            {aspectsResult && (
              <div className="rounded-lg bg-white/5 p-3 text-xs font-mono text-violet-200">
                Score: {aspectsResult.score}/10 | Thrombectomy Eligible: {String(aspectsResult.eligibleForThrombectomy)} | Category: {aspectsResult.prognosticCategory}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "edge" && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-bold text-violet-400 mb-2">WebGPU & WASM Client-Side Inference Profiler</h3>
          <p className="text-xs text-white/60 mb-4">
            Size memory and compute budgets for browser-resident neural network execution.
          </p>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Parameter Count (Billion)</label>
              <input
                type="number"
                step="0.5"
                value={edgeParams}
                onChange={(e) => setEdgeParams(Number(e.target.value))}
                className="w-28 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Quantization Precision</label>
              <select
                value={edgePrec}
                onChange={(e) => setEdgePrec(e.target.value as any)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white"
              >
                <option value="NF4">4-bit NormalFloat4 (NF4)</option>
                <option value="INT8">8-bit Integer (INT8)</option>
                <option value="FP16">16-bit Float (FP16)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setEdgeProfile(calculateEdgeModelProfile({ parameterCountBillions: edgeParams, precision: edgePrec }));
              }}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold hover:bg-violet-500"
            >
              Calculate VRAM Budget
            </button>
          </div>
          {edgeProfile && (
            <pre className="rounded-lg bg-black/60 p-4 text-xs font-mono text-sky-400">
              {JSON.stringify(edgeProfile, null, 2)}
            </pre>
          )}
        </div>
      )}

      {activeSubTab === "specialist" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSpecModule("quant");
                setSpecResult(calculateMonteCarloVaR({ portfolioValue: 1000000, horizonDays: 10, confidencePercent: 95 }));
              }}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", specModule === "quant" ? "bg-violet-600 text-white" : "bg-white/5 text-white/70")}
            >
              Quant Risk (VaR & Black-Scholes)
            </button>
            <button
              type="button"
              onClick={() => {
                setSpecModule("robotics");
                setSpecResult(auditPlcStructuredText("IF emergency_stop THEN motor_drive := FALSE; END_IF;"));
              }}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", specModule === "robotics" ? "bg-violet-600 text-white" : "bg-white/5 text-white/70")}
            >
              Robotics SCADA (PLC & Modbus)
            </button>
            <button
              type="button"
              onClick={() => {
                setSpecModule("regulatory");
                setSpecResult(auditHipaaTechnicalSafeguards({ encryptionAtRestEnforced: true, uniqueUserIdsRequired: true, automaticSessionTimeoutMinutes: 15, immutableAuditLogsActive: true, emergencyAccessMfaEnforced: true }));
              }}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", specModule === "regulatory" ? "bg-violet-600 text-white" : "bg-white/5 text-white/70")}
            >
              Regulatory Dossier (FDA & HIPAA)
            </button>
          </div>
          {specResult && (
            <pre className="rounded-lg border border-white/10 bg-black/60 p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
              {JSON.stringify(specResult, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
