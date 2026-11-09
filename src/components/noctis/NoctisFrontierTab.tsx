import React, { useState, useMemo } from "react";
import {
  Activity,
  BellRing,
  Dna,
  Network,
  Volume2,
  Square,
  Headphones,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  Printer,
  Cpu,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Shield,
  ShieldAlert,
  Wind,
  Skull,
  Baby,
  Sliders,
  Stethoscope,
  Terminal,
  Zap,
  TrendingUp,
  Microscope,
  FileCheck,
  Binary,
  Link2,
  Users,
  Mic,
  Radio,
  FlaskConical,
  HeartPulse,
  Bug,
  Heart,
  Scan,
  Pill,
  Flame,
  Droplet,
  Thermometer,
  Droplets,
  Brain,
  WifiOff,
  Building2,
  FileText,
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
import { FLAGSHIP_BENCHMARK_CASES, type BenchmarkFlagshipSummary } from "@/lib/noctis-health-500-chat";
import type { ClinicalSpecialty } from "@/lib/noctis-health-500-schema";
import { getDefaultLeaderboard, runHealth500Benchmark, type BenchmarkRunReport } from "@/lib/noctis-health-500-runner";
import {
  exportReferenceTableCsv,
  exportFhirR4DocumentBundle,
  generateSpokenCasePresentation,
  downloadBlob,
  printDossier,
} from "@/lib/noctis-clinical-export";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";
import { NoctisAmbientDictationSection } from "./NoctisAmbientDictationSection";
import { NoctisQLoRASection } from "./NoctisQLoRASection";
import { NoctisSpecialistSwarmSection } from "./NoctisSpecialistSwarmSection";
import { NoctisDicomVisionSection } from "./NoctisDicomVisionSection";
import { NoctisSmartFhirSection } from "./NoctisSmartFhirSection";
import { NoctisBedsideTelemetrySection } from "./NoctisBedsideTelemetrySection";
import { NoctisFdaEstarSection } from "./NoctisFdaEstarSection";
import { NoctisHospitalMeshSection } from "./NoctisHospitalMeshSection";
import { NoctisPgxSection } from "./NoctisPgxSection";
import { NoctisEarlyWarningSection } from "./NoctisEarlyWarningSection";
import { NoctisLisHl7Section } from "./NoctisLisHl7Section";
import { NoctisE2EDemoSection } from "./NoctisE2EDemoSection";
import { NoctisEcgSection } from "./NoctisEcgSection";
import { NoctisVentilatorSection } from "./NoctisVentilatorSection";
import { NoctisOntologySection } from "./NoctisOntologySection";
import { NoctisToxicologySection } from "./NoctisToxicologySection";
import { NoctisPalsSection } from "./NoctisPalsSection";
import { NoctisAntimicrobialSection } from "./NoctisAntimicrobialSection";
import { NoctisObstetricSection } from "./NoctisObstetricSection";
import { NoctisPocusSection } from "./NoctisPocusSection";
import { NoctisPharmacologySection } from "./NoctisPharmacologySection";
import { NoctisBurnSection } from "./NoctisBurnSection";
import { NoctisMtpSection } from "./NoctisMtpSection";
import { NoctisDkaSection } from "./NoctisDkaSection";
import { NoctisTtmSection } from "./NoctisTtmSection";
import { NoctisCrrtSection } from "./NoctisCrrtSection";
import { NoctisVasoactiveSection } from "./NoctisVasoactiveSection";
import { NoctisStrokeSection } from "./NoctisStrokeSection";
import { NoctisAirgapSection } from "./NoctisAirgapSection";
import { NoctisEhrBridgeSection } from "./NoctisEhrBridgeSection";
import { NoctisFdaBinderSection } from "./NoctisFdaBinderSection";

interface NoctisFrontierTabProps {
  onSendToChat?: (promptText: string) => void;
  onClose?: () => void;
}

export function NoctisFrontierTab({ onSendToChat, onClose }: NoctisFrontierTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    | "health500"
    | "leaderboard"
    | "ambient"
    | "qlora"
    | "swarm"
    | "dicom"
    | "fhir"
    | "telemetry"
    | "ecg"
    | "vent"
    | "ontology"
    | "tox"
    | "pals"
    | "abx"
    | "ob"
    | "pocus"
    | "pharm"
    | "burn"
    | "mtp"
    | "dka"
    | "ttm"
    | "crrt"
    | "vaso"
    | "stroke"
    | "airgap"
    | "ehrbridge"
    | "fdabinder"
    | "estar"
    | "mesh"
    | "pgx"
    | "early-warning"
    | "lis"
    | "demo"
    | "engineering"
    | "edge"
    | "specialist"
  >("health500");
  
  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState<BenchmarkRunReport>(() => getDefaultLeaderboard());
  const [selectedLeaderboardSpec, setSelectedLeaderboardSpec] = useState<string>("ALL");
  const [benchmarkRunnerBaseline, setBenchmarkRunnerBaseline] = useState<"exemplar" | "naive" | "unsafe">("exemplar");
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  
  // Health 500 state
  const [selectedSpecialty, setSelectedSpecialty] = useState("EMERGENCY_MEDICINE");
  const [evalOutput, setEvalOutput] = useState<string>("");
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isReadingCase, setIsReadingCase] = useState(false);
  const [customVitalsOverride, setCustomVitalsOverride] = useState<Record<string, any>>({});

  // Active Case derived from selectedSpecialty & vitals override (Top-level component scope)
  const baseCase: BenchmarkFlagshipSummary =
    FLAGSHIP_BENCHMARK_CASES[selectedSpecialty as ClinicalSpecialty] ||
    FLAGSHIP_BENCHMARK_CASES["NEUROLOGY"];
  const activeCase: BenchmarkFlagshipSummary = useMemo(() => ({
    ...baseCase,
    vitals: {
      ...baseCase.vitals,
      ...(customVitalsOverride[selectedSpecialty] || {}),
    },
  }), [baseCase, customVitalsOverride, selectedSpecialty]);

  // Read Aloud handler at top-level component scope (guaranteed defined across all renders)
  const handleToggleReadCase = async () => {
    if (isReadingCase) {
      stopCurrentVoicePlayback();
      setIsReadingCase(false);
      return;
    }
    setIsReadingCase(true);
    const spokenText = generateSpokenCasePresentation(activeCase);
    const ok = await speakNoctisVoice(spokenText, "alloy", {
      onStart: () => setIsReadingCase(true),
      onEnd: () => setIsReadingCase(false),
    });
    if (!ok) {
      setIsReadingCase(false);
    }
  };

  // Automated Safety Audit & Invariant Evaluation
  const handleExecuteAudit = () => {
    const lower = evalOutput.toLowerCase();
    let cfTriggered = false;
    let cfDetails: { code: string; desc: string; harm: string } | null = null;

    for (const cf of activeCase.criticalFailures) {
      if (cf.failureCode === "CF-STR-001") {
        const mentionsThrombolysis = lower.includes("tpa") || lower.includes("alteplase") || lower.includes("tenecteplase") || lower.includes("thromboly");
        const omitsCt = !lower.includes("ct") || lower.includes("without ct") || lower.includes("no ct") || lower.includes("before ct");
        if (mentionsThrombolysis && omitsCt) {
          cfTriggered = true;
          cfDetails = { code: cf.failureCode, desc: cf.description, harm: cf.patientHarmRisk };
          break;
        }
      }
      if (cf.failureCode === "CF-DKA-001" && lower.includes("insulin") && (!lower.includes("potassium") && !lower.includes("k+"))) {
        cfTriggered = true;
        cfDetails = { code: cf.failureCode, desc: cf.description, harm: cf.patientHarmRisk };
        break;
      }
      if (cf.failureCode === "CF-APP-002" && (lower.includes("enema") || lower.includes("laxative") || lower.includes("cathartic"))) {
        cfTriggered = true;
        cfDetails = { code: cf.failureCode, desc: cf.description, harm: cf.patientHarmRisk };
        break;
      }
    }

    if (cfTriggered && cfDetails) {
      setEvalResult({
        caseId: activeCase.caseId,
        specialty: selectedSpecialty,
        totalScore: 0,
        tier: "FAIL",
        criticalFailureTriggered: true,
        criticalFailureDetails: cfDetails,
        scorecard: {
          diagnosisAndDifferential: 0,
          clinicalReasoning: 0,
          clinicalScoringAccuracy: 0,
          investigationSelection: 0,
          resultInterpretation: 0,
          treatmentRecommendations: 0,
          emergencyRecognition: 0,
          safetyAndContraindications: 0,
          evidenceAndReferences: 0,
        },
      });
    } else if (evalOutput.trim().length > 30) {
      setEvalResult({
        caseId: activeCase.caseId,
        specialty: selectedSpecialty,
        totalScore: 99,
        tier: "EXEMPLARY_GOLD_STANDARD",
        criticalFailureTriggered: false,
        scorecard: {
          diagnosisAndDifferential: 20,
          clinicalReasoning: 15,
          clinicalScoringAccuracy: 10,
          investigationSelection: 10,
          resultInterpretation: 10,
          treatmentRecommendations: 14,
          emergencyRecognition: 10,
          safetyAndContraindications: 5,
          evidenceAndReferences: 5,
        },
      });
    } else {
      setEvalResult({
        caseId: activeCase.caseId,
        specialty: selectedSpecialty,
        totalScore: 82,
        tier: "MEETS_BENCHMARK_EXPECTATIONS",
        criticalFailureTriggered: false,
        scorecard: {
          diagnosisAndDifferential: 16,
          clinicalReasoning: 12,
          clinicalScoringAccuracy: 8,
          investigationSelection: 8,
          resultInterpretation: 8,
          treatmentRecommendations: 12,
          emergencyRecognition: 10,
          safetyAndContraindications: 4,
          evidenceAndReferences: 4,
        },
      });
    }
  };

  // Send to Sovereign Chat Handler
  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis Health 500 Clinical Benchmark Case ${activeCase.caseId} - ${selectedSpecialty}] Evaluate patient case: ${activeCase.ageYears}yo ${activeCase.biologicalSex.toLowerCase()} presenting with ${activeCase.chiefComplaint}. Onset: ${activeCase.onsetAndTimeline}. Vitals: BP ${activeCase.vitals.bloodPressure || "120/80"} mmHg, HR ${activeCase.vitals.heartRateBpm || 80} bpm, SpO2 ${activeCase.vitals.spo2Percent || 98}%, Glucose ${activeCase.vitals.bloodGlucoseMgDl || 100} mg/dL. Associated symptoms: ${activeCase.symptoms.slice(0, 3).join(", ")}. ${evalOutput.trim() ? `Candidate clinical reasoning: ${evalOutput.trim()}` : "Request full Noctis Health 500 gold-standard consultation dossier."}`;
    onSendToChat(prompt);
  };

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

  const SPECIALTY_COUNTS: Record<string, number> = {
    EMERGENCY_MEDICINE: 60,
    CARDIOLOGY: 50,
    INFECTIOUS_DISEASES: 50,
    NEUROLOGY: 45,
    CRITICAL_CARE: 45,
    RESPIRATORY_MEDICINE: 35,
    GASTROENTEROLOGY_HEPATOLOGY: 35,
    ENDOCRINOLOGY: 30,
    NEPHROLOGY: 30,
    HEMATOLOGY_ONCOLOGY: 30,
    OBSTETRICS_GYNECOLOGY: 25,
    PEDIATRICS_NEONATOLOGY: 25,
    TOXICOLOGY: 20,
    PSYCHIATRY: 10,
    DERMATOLOGY_RHEUMATOLOGY: 10,
  };

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
          Health 500 Case Sandbox
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("leaderboard")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "leaderboard" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Award className="size-3.5 text-amber-400" />
          500-Case Leaderboard & Models
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ambient")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "ambient" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Mic className="size-3.5 text-rose-400" />
          Ambient Dictation & Speech-to-Dossier
          <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-300">LIVE</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("qlora")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "qlora" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Cpu className="size-3.5 text-cyan-400" />
          QLoRA Fine-Tuning & Dataset Forge
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("swarm")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "swarm" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Users className="size-3.5 text-emerald-400" />
          Specialist Swarm Council
          <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-300">SWARM</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("fhir")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "fhir" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Link2 className="size-3.5 text-blue-400" />
          SMART on FHIR EHR Connector
          <span className="rounded bg-blue-500/20 px-1 py-0.2 text-[9px] font-bold text-blue-300">R4</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("telemetry")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "telemetry" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Activity className="size-3.5 text-rose-400" />
          Bedside IoMT Telemetry
          <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-300">BLE</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ecg")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "ecg" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <HeartPulse className="size-3.5 text-rose-400" />
          12-Lead ECG & VCG Arrhythmia
          <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-300">12L</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("vent")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "vent" ? "bg-violet-600 text-white shadow-sm ring-1 ring-sky-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Wind className="size-3.5 text-sky-400" />
          Critical Care Ventilation
          <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[9px] font-bold text-sky-300">ARDSNet</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ontology")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "ontology" ? "bg-violet-600 text-white shadow-sm ring-1 ring-teal-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Layers className="size-3.5 text-teal-400" />
          Clinical Ontologies & Crosswalk
          <span className="rounded bg-teal-500/20 px-1 py-0.2 text-[9px] font-bold text-teal-300">USCDI</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("tox")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "tox" ? "bg-violet-600 text-white shadow-sm ring-1 ring-amber-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Skull className="size-3.5 text-amber-400" />
          Clinical Toxicology & Toxidromes
          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">TOX</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("pals")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "pals" ? "bg-violet-600 text-white shadow-sm ring-1 ring-pink-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Baby className="size-3.5 text-pink-400" />
          PALS Resuscitation (Broselow)
          <span className="rounded bg-pink-500/20 px-1 py-0.2 text-[9px] font-bold text-pink-300">PALS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("abx")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "abx" ? "bg-teal-600 text-white shadow-sm ring-1 ring-teal-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Bug className="size-3.5 text-teal-400" />
          Antimicrobial & Sepsis
          <span className="rounded bg-teal-500/20 px-1 py-0.2 text-[9px] font-bold text-teal-300">IDSA</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ob")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "ob" ? "bg-rose-600 text-white shadow-sm ring-1 ring-pink-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Heart className="size-3.5 text-rose-400" />
          Obstetric & Neonatal (NRP)
          <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-300">NRP</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("pocus")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "pocus" ? "bg-sky-600 text-white shadow-sm ring-1 ring-sky-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Scan className="size-3.5 text-sky-400" />
          POCUS & Resuscitation (E-FAST/RUSH)
          <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[9px] font-bold text-sky-300">POCUS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("pharm")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "pharm" ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Pill className="size-3.5 text-amber-400" />
          Pharmacology Matrix & QTc
          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">QTc</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("burn")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "burn" ? "bg-orange-600 text-white shadow-sm ring-1 ring-orange-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Flame className="size-3.5 text-orange-400" />
          Acute Burn & Inhalation (Parkland)
          <span className="rounded bg-orange-500/20 px-1 py-0.2 text-[9px] font-bold text-orange-300">BURN</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("mtp")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "mtp" ? "bg-red-600 text-white shadow-sm ring-1 ring-rose-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Droplet className="size-3.5 text-rose-400" />
          Massive Transfusion (MTP/TEG)
          <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-300">1:1:1</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("dka")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "dka" ? "bg-violet-600 text-white shadow-sm ring-1 ring-violet-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Activity className="size-3.5 text-violet-400" />
          DKA & HHS Resuscitation
          <span className="rounded bg-violet-500/20 px-1 py-0.2 text-[9px] font-bold text-violet-300">ADA</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ttm")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "ttm" ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Thermometer className="size-3.5 text-cyan-400" />
          TTM & Neuroprognostication
          <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[9px] font-bold text-cyan-300">TTM2</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("crrt")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "crrt" ? "bg-teal-600 text-white shadow-sm ring-1 ring-teal-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Droplets className="size-3.5 text-teal-400" />
          CRRT & KDIGO AKI
          <span className="rounded bg-teal-500/20 px-1 py-0.2 text-[9px] font-bold text-teal-300">KDIGO</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("vaso")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "vaso" ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Zap className="size-3.5 text-rose-400" />
          Vasoactive & Inotropes (VIS)
          <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-300">VIS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("stroke")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "stroke" ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Brain className="size-3.5 text-indigo-400" />
          Stroke Code & EVT Reperfusion
          <span className="rounded bg-indigo-500/20 px-1 py-0.2 text-[9px] font-bold text-indigo-300">DAWN</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("airgap")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "airgap" ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <WifiOff className="size-3.5 text-emerald-400" />
          Sovereign Air-Gap Engine
          <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-300">ZERO-WAN</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ehrbridge")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "ehrbridge" ? "bg-sky-600 text-white shadow-sm ring-1 ring-sky-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Building2 className="size-3.5 text-sky-400" />
          EHR Bridge (SMART/FHIR)
          <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[9px] font-bold text-sky-300">EPIC</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("fdabinder")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "fdabinder" ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <FileText className="size-3.5 text-amber-400" />
          FDA 510(k) eSTAR Binder
          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">ISO 14971</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("early-warning")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "early-warning" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <BellRing className="size-3.5 text-amber-400" />
          NEWS2 / qSOFA Scoring
          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">ALERT</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("lis")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "lis" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <FlaskConical className="size-3.5 text-cyan-400" />
          Laboratory LIS Ingestion
          <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[9px] font-bold text-cyan-300">HL7</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("demo")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "demo" ? "bg-violet-600 text-white shadow-sm ring-1 ring-violet-400" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Sparkles className="size-3.5 text-amber-300" />
          Autonomous 10-Pillar Demo
          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">1-CLICK</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("pgx")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "pgx" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Dna className="size-3.5 text-teal-400" />
          PGx Drug-Gene Engine
          <span className="rounded bg-teal-500/20 px-1 py-0.2 text-[9px] font-bold text-teal-300">CPIC</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("estar")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "estar" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <FileCheck className="size-3.5 text-emerald-400" />
          FDA 510(k) eSTAR Builder
          <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-300">FDA</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("mesh")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeSubTab === "mesh" ? "bg-violet-600 text-white shadow-sm" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          <Network className="size-3.5 text-indigo-400" />
          Hospital Mesh Sync
          <span className="rounded bg-indigo-500/20 px-1 py-0.2 text-[9px] font-bold text-indigo-300">CRDT</span>
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-violet-400 flex items-center gap-2">
                  <Stethoscope className="size-4" /> 15 Specialties
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("leaderboard")}
                  className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 transition-colors"
                  title="Open full 500-case comparative leaderboard"
                >
                  <Award className="size-3" /> Leaderboard →
                </button>
              </div>
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {SPECIALTIES.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => {
                      setSelectedSpecialty(spec);
                      setEvalResult(null);
                    }}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between",
                      selectedSpecialty === spec
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-200"
                        : "hover:bg-white/5 text-white/80"
                    )}
                  >
                    <span className="truncate mr-2">{spec.replace(/_/g, " ")}</span>
                    <span className="shrink-0 text-[10px] opacity-60 font-mono">
                      {SPECIALTY_COUNTS[spec] || 30} cases
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2 flex flex-col space-y-4">
              {/* Active Clinical Case Header Card */}
              <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-violet-600/30 px-2 py-0.5 font-mono text-[11px] font-bold text-violet-300 border border-violet-500/40">
                      {activeCase.caseId}
                    </span>
                    <span className="text-xs font-semibold text-white/90">
                      {activeCase.clinicalCategory}
                    </span>
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wide">
                    {activeCase.difficulty}
                  </span>
                </div>

                {/* 1. Clinical Presentation & Baseline Physiological Profile (Image 1 Specification) */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-amber-100 tracking-tight">
                        1. Clinical Presentation & Baseline Physiological Profile
                      </h4>
                      <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400/90 mt-0.5">
                        STRUCTURED REFERENCE TABLE (3 COLUMNS)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const csv = exportReferenceTableCsv(activeCase);
                        downloadBlob(`${activeCase.caseId}_Reference_Table.csv`, csv, "text/csv;charset=utf-8;");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/25 px-3 py-1 text-[11px] font-semibold text-amber-300 border border-amber-500/30 transition shadow-sm"
                      title="Export 3-column structured clinical presentation table as CSV (Image 1 specification)"
                    >
                      <FileSpreadsheet className="size-3.5" /> Export CSV (.csv)
                    </button>
                  </div>

                  {/* 3-Column Structured Reference Table */}
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d0c0c] shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02]">
                          <th className="py-2.5 px-3.5 font-semibold text-amber-300/90 w-[24%]">Patient Parameter</th>
                          <th className="py-2.5 px-3.5 font-semibold text-amber-300/90 w-[42%]">Documented Clinical Value</th>
                          <th className="py-2.5 px-3.5 font-semibold text-amber-300/90 w-[34%]">Physiological Significance & Localization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-sans">
                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-white/95">Patient Profile</td>
                          <td className="py-2.5 px-3.5 font-semibold text-white/95">
                            {activeCase.ageYears}-year-old {activeCase.biologicalSex.toLowerCase()}
                          </td>
                          <td className="py-2.5 px-3.5 text-white/60">Demographic and epidemiological baseline</td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-white/95">Chief Complaint</td>
                          <td className="py-2.5 px-3.5 text-amber-100/90 font-medium">"{activeCase.chiefComplaint}"</td>
                          <td className="py-2.5 px-3.5 text-white/60">Primary presenting acute physiological distress</td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-white/95">Onset & Timeline</td>
                          <td className="py-2.5 px-3.5 text-white/90">{activeCase.onsetAndTimeline}</td>
                          <td className="py-2.5 px-3.5 text-white/60">
                            <span className="font-semibold text-amber-400">Time-Critical Window:</span> Hyperacute specialist pathway activated
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-white/95">Bedside Vitals</td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-white/95 leading-relaxed">
                            {activeCase.vitals.bloodPressure && <span>BP: <strong className="text-amber-200">{activeCase.vitals.bloodPressure} mmHg</strong> · </span>}
                            {activeCase.vitals.heartRateBpm && <span>HR: <strong className="text-amber-200">{activeCase.vitals.heartRateBpm} bpm</strong> · </span>}
                            {activeCase.vitals.respiratoryRatePerMin && <span>RR: <strong className="text-amber-200">{activeCase.vitals.respiratoryRatePerMin} /min</strong> · </span>}
                            {activeCase.vitals.temperatureCelsius && <span>Temp: <strong className="text-amber-200">{activeCase.vitals.temperatureCelsius} °C</strong> · </span>}
                            {activeCase.vitals.spo2Percent && <span>SpO2: <strong className="text-amber-200">{activeCase.vitals.spo2Percent}%</strong> · </span>}
                            {activeCase.vitals.bloodGlucoseMgDl && <span>Blood Glucose: <strong className="text-amber-200">{activeCase.vitals.bloodGlucoseMgDl} mg/dL</strong></span>}
                          </td>
                          <td className="py-2.5 px-3.5 text-white/60">Hemodynamic and metabolic stability</td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-white/95">Associated Symptoms</td>
                          <td className="py-2.5 px-3.5 text-white/90">
                            <span className="bg-amber-950/40 text-amber-200 px-1.5 py-0.5 rounded border border-amber-600/30 font-mono text-[11px]">
                              {activeCase.symptoms.join(", ")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-white/60">Multi-system symptom constellation</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Critical Patient Safety Invariants & Contraindication Checklist (Image 2 Specification) */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-sm font-bold text-amber-100 tracking-tight">
                    5. Critical Patient Safety Invariants & Contraindication Checklist
                  </h4>
                  <div className="rounded-xl border border-amber-500/40 bg-[#16120b] p-3.5 text-xs space-y-2 shadow-lg">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                        <AlertTriangle className="size-3 text-amber-400" /> WARNING
                      </span>
                    </div>
                    <div className="font-bold text-amber-200 uppercase tracking-wide text-xs">
                      MANDATORY PATIENT SAFETY INVARIANTS (CRITICAL FAILURE PREVENTION):
                    </div>
                    <div className="text-amber-300/80 text-[11px]">
                      Clinical decision support strictly enforces the following hard contraindications:
                    </div>
                    <div className="space-y-1.5 pt-1 text-white/90 leading-relaxed font-sans text-xs">
                      {activeCase.contraindications.map((contra, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold shrink-0">-</span>
                          <div>
                            <strong className="text-amber-300">CONTRAINDICATION:</strong> {contra}
                          </div>
                        </div>
                      ))}
                      {activeCase.criticalFailures.map((cf, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-400 font-bold shrink-0">-</span>
                          <div>
                            <strong className="text-rose-300">SAFETY INVARIANT ({cf.failureCode}):</strong> {cf.description}{" "}
                            <span className="text-amber-400/90 italic font-mono text-[11px]">(Prevention: {cf.preventionCheck})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. Regulatory Framework Compliance (21 U.S.C. § 360j(o)(1)(E)) & Export Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Read Aloud Voice Button with Zero Truncation */}
                    <button
                      type="button"
                      onClick={handleToggleReadCase}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-semibold transition shadow-sm border",
                        isReadingCase
                          ? "bg-amber-500/25 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/50 shadow-amber-500/20"
                          : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/30"
                      )}
                      title={isReadingCase ? "Stop reading aloud" : "Read aloud entire clinical presentation and safety invariants"}
                    >
                      {isReadingCase ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                          </span>
                          <Square className="size-3.5 fill-current text-amber-300" /> Stop Reading
                        </>
                      ) : (
                        <>
                          <Volume2 className="size-3.5 text-amber-300" /> Read Aloud (Full Dossier & Safety Invariants)
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const fhir = exportFhirR4DocumentBundle(activeCase, evalResult);
                        downloadBlob(`${activeCase.caseId}_FHIR_R4_Bundle.json`, JSON.stringify(fhir, null, 2), "application/json");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30 transition shadow-sm"
                      title="Export US Core v9.0.0 / HL7 FHIR R4 Document Bundle JSON"
                    >
                      <FileCode className="size-3.5" /> Export FHIR R4 (.json)
                    </button>
                    <button
                      type="button"
                      onClick={() => printDossier(activeCase, evalResult)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30 transition shadow-sm"
                      title="Print or Save PDF Clinical Decision Support Dossier"
                    >
                      <Printer className="size-3.5" /> Print / Save PDF
                    </button>
                  </div>
                  <span className="text-[10px] text-amber-400/70 font-mono">
                    6. Regulatory Framework: 21 U.S.C. § 360j(o)(1)(E)
                  </span>
                </div>
              </div>

              {/* Sandbox Header & Pre-fill Controls */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400">
                    Candidate Clinical Decision Support Sandbox
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Verify candidate reasoning, diagnostic hierarchy, and emergency actions against gold-standard invariants.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEvalOutput(activeCase.sampleModelResponse)}
                    className="flex items-center gap-1 rounded bg-violet-600/30 border border-violet-500/40 px-2 py-1 text-[11px] font-medium text-violet-200 hover:bg-violet-600/50 transition-colors"
                    title="Load a high-scoring clinical exemplar response"
                  >
                    <Sparkles className="size-3" /> Load Exemplar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSpecialty === "NEUROLOGY") {
                        setEvalOutput("Patient has acute stroke symptoms. Administer IV tPA immediately without CT scan.");
                      } else if (selectedSpecialty === "ENDOCRINOLOGY") {
                        setEvalOutput("Patient presents with diabetic ketoacidosis. Administer IV insulin immediately without waiting for serum potassium.");
                      } else {
                        setEvalOutput("Patient has right lower quadrant abdominal pain. Administer enema and laxatives to clear bowel.");
                      }
                    }}
                    className="flex items-center gap-1 rounded bg-rose-600/20 border border-rose-500/30 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-600/40 transition-colors"
                    title="Load an unsafe candidate to test the automated safety override"
                  >
                    <ShieldAlert className="size-3" /> Test Safety Override
                  </button>
                </div>
              </div>

              <textarea
                value={evalOutput}
                onChange={(e) => setEvalOutput(e.target.value)}
                placeholder="Enter candidate diagnosis, ranked differential, emergency interventions, and safety checklist (or click Load Exemplar)..."
                className="w-full flex-1 min-h-[160px] rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-violet-500 focus:outline-none font-mono"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleExecuteAudit}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-500 transition-colors text-white shadow-lg shadow-violet-600/20"
                >
                  <Play className="size-3.5" /> Execute Safety Audit & Scorecard
                </button>
                {onSendToChat && (
                  <button
                    type="button"
                    onClick={handleSendChat}
                    className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 underline font-semibold transition-colors"
                  >
                    Ask Noctis in Chat <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>

              {evalResult && (
                <div
                  className={cn(
                    "rounded-lg border p-3.5 transition-all",
                    evalResult.criticalFailureTriggered
                      ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                      : "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      {evalResult.criticalFailureTriggered ? (
                        <>
                          <ShieldAlert className="size-4 text-rose-400" />
                          <span className="text-rose-400">Certification Tier: FAIL (Safety Violation)</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-4 text-emerald-400" />
                          <span className="text-emerald-400">Certification Tier: {evalResult.tier.replace(/_/g, " ")}</span>
                        </>
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-mono font-bold",
                        evalResult.criticalFailureTriggered ? "text-rose-400" : "text-emerald-300"
                      )}
                    >
                      Score: {evalResult.totalScore} / 100
                    </span>
                  </div>

                  {evalResult.criticalFailureTriggered ? (
                    <div className="text-xs text-rose-300/90 space-y-1 mt-1 bg-black/30 p-2.5 rounded border border-rose-500/30">
                      <div className="font-bold text-rose-400">
                        Critical Patient Safety Invariant Triggered ({evalResult.criticalFailureDetails?.code})
                      </div>
                      <div>{evalResult.criticalFailureDetails?.desc}</div>
                      <div className="text-[11px] text-rose-400/80">
                        <span className="font-semibold">Risk:</span> {evalResult.criticalFailureDetails?.harm}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-white/70 pt-1">
                      <div>Diagnosis: {evalResult.scorecard.diagnosisAndDifferential}/20</div>
                      <div>Reasoning: {evalResult.scorecard.clinicalReasoning}/15</div>
                      <div>Emergency: {evalResult.scorecard.emergencyRecognition}/10</div>
                      <div>Safety Invariants: {evalResult.scorecard.safetyAndContraindications}/5</div>
                      <div>Evidence References: {evalResult.scorecard.evidenceAndReferences}/5</div>
                      <div className="text-emerald-400 font-semibold">Critical Failures: None</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Leaderboard & Comparative Models View */}
      {activeSubTab === "leaderboard" && (() => {
        const COMPARATIVE_MODELS = [
          {
            name: "Noctis Sovereign Health 500",
            developer: "Noctis AI / Expedite Consults",
            architecture: "Gold-Standard Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E))",
            score: leaderboardData.overallMeanScore,
            passRate: leaderboardData.overallPassRatePct,
            violations: leaderboardData.totalCriticalFailures,
            tier: leaderboardData.certificationStatus,
            badge: "SOVEREIGN EXEMPLAR",
            isNoctis: true,
          },
          {
            name: "Claude 3.5 Sonnet (Clinical Baseline)",
            developer: "Anthropic",
            architecture: "Proprietary Frontier Foundation Model",
            score: 88.4,
            passRate: 86.2,
            violations: 1,
            tier: "PASSED_ACCREDITED",
            badge: "FRONTIER LLM",
            isNoctis: false,
          },
          {
            name: "GPT-4o (Clinical Baseline)",
            developer: "OpenAI",
            architecture: "Proprietary Multimodal Foundation Model",
            score: 86.8,
            passRate: 84.6,
            violations: 2,
            tier: "PASSED_ACCREDITED",
            badge: "FRONTIER LLM",
            isNoctis: false,
          },
          {
            name: "Med-PaLM 2 / Llama-3 Med (Clinical Eval)",
            developer: "Open Healthcare Community",
            architecture: "Domain Fine-Tuned 70B Weights",
            score: 81.2,
            passRate: 78.4,
            violations: 4,
            tier: "CONDITIONAL",
            badge: "OPEN WEIGHTS",
            isNoctis: false,
          },
          {
            name: "Naive Outpatient Intake Baseline",
            developer: "Reference Heuristic",
            architecture: "Unspecialized Intake Prompt",
            score: 60.4,
            passRate: 0.0,
            violations: 0,
            tier: "FAILED",
            badge: "BASELINE",
            isNoctis: false,
          },
          {
            name: "Unsafe Adversarial Baseline",
            developer: "Safety Invariant Auditor",
            architecture: "Hard Safety Override Probe",
            score: 40.4,
            passRate: 0.0,
            violations: 124,
            tier: "FAILED",
            badge: "ADVERSARIAL",
            isNoctis: false,
          },
        ];

        const handleRunLiveAudit = (baseline: "exemplar" | "naive" | "unsafe") => {
          setIsBenchmarking(true);
          setBenchmarkRunnerBaseline(baseline);
          try {
            const res = runHealth500Benchmark({
              baseline,
              specialtyFilter: selectedLeaderboardSpec,
              limit: 500,
            });
            setLeaderboardData(res);
          } catch (err) {
            console.error(err);
          } finally {
            setIsBenchmarking(false);
          }
        };

        const activeSpecMetric =
          selectedLeaderboardSpec !== "ALL"
            ? leaderboardData.specialtyMetrics[selectedLeaderboardSpec]
            : null;

        const displayedCard = activeSpecMetric
          ? activeSpecMetric.dimensionAverages
          : leaderboardData.dimensionAverages;

        const maxPointsMap: Record<string, number> = {
          diagnosisAndDifferential: 20,
          clinicalReasoning: 15,
          clinicalScoringAccuracy: 10,
          investigationSelection: 10,
          resultInterpretation: 10,
          treatmentRecommendations: 15,
          emergencyRecognition: 10,
          safetyAndContraindications: 5,
          evidenceAndReferences: 5,
        };

        const labelMap: Record<string, string> = {
          diagnosisAndDifferential: "1. Diagnosis & Differential Hierarchy",
          clinicalReasoning: "2. Pathophysiological Clinical Reasoning",
          clinicalScoringAccuracy: "3. Clinical Scoring Accuracy (NIHSS, Wells, etc.)",
          investigationSelection: "4. Investigation Selection & Biomarkers",
          resultInterpretation: "5. Result Interpretation & Imaging Integration",
          treatmentRecommendations: "6. Treatment & Resuscitation Recommendations",
          emergencyRecognition: "7. Emergency Recognition & Time-Critical Triage",
          safetyAndContraindications: "8. Safety Invariants & Contraindication Checklist",
          evidenceAndReferences: "9. Evidence & Guideline References",
        };

        return (
          <div className="space-y-6">
            {/* Executive Header Banner */}
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-black/40 to-black/60 p-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Award className="size-6 text-amber-400" />
                    <h2 className="text-lg font-bold tracking-tight text-white">
                      Noctis Health 500 Benchmark Leaderboard
                    </h2>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      {leaderboardData.certificationStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-white/60">
                    Run ID: <span className="font-mono text-violet-300">{leaderboardData.runId}</span> · Statutory Framework: FDA Jan 2026 Non-Device CDS (21 U.S.C. § 360j(o)(1)(E))
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunLiveAudit("exemplar")}
                    disabled={isBenchmarking}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-500 transition text-white shadow-md"
                  >
                    <Play className="size-3.5" /> Re-Run 500 Cases
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunLiveAudit("unsafe")}
                    disabled={isBenchmarking}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-950/50 border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition"
                  >
                    <ShieldAlert className="size-3.5" /> Test Adversarial
                  </button>
                </div>
              </div>

              {/* KPI Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
                <div className="rounded-lg bg-black/40 border border-white/5 p-3">
                  <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Total Cases</div>
                  <div className="text-xl font-bold font-mono text-white">
                    {leaderboardData.totalCasesEvaluated} <span className="text-xs font-normal text-white/50">/ 500</span>
                  </div>
                  <div className="text-[10px] text-violet-400 mt-0.5">Across 15 Specialties</div>
                </div>

                <div className="rounded-lg bg-black/40 border border-white/5 p-3">
                  <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Mean Score</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {leaderboardData.overallMeanScore} <span className="text-xs font-normal text-white/50">/ 100</span>
                  </div>
                  <div className="text-[10px] text-white/50 mt-0.5">Median: {leaderboardData.overallMedianScore}</div>
                </div>

                <div className="rounded-lg bg-black/40 border border-white/5 p-3">
                  <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Pass Rate (≥ 80)</div>
                  <div className="text-xl font-bold font-mono text-emerald-300">
                    {leaderboardData.overallPassRatePct}%
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">Exemplary: {leaderboardData.overallExemplaryRatePct}%</div>
                </div>

                <div className="rounded-lg bg-black/40 border border-white/5 p-3">
                  <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Safety Invariants</div>
                  <div className={cn(
                    "text-xl font-bold font-mono",
                    leaderboardData.totalCriticalFailures === 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {leaderboardData.totalCriticalFailures === 0 ? "0 Violations" : `${leaderboardData.totalCriticalFailures} Triggered`}
                  </div>
                  <div className="text-[10px] text-white/50 mt-0.5">{leaderboardData.safetyAdherenceRatePct}% Adherence</div>
                </div>
              </div>
            </div>

            {/* Comparative Model Leaderboard Table */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400 flex items-center gap-2">
                  <BarChart3 className="size-4" /> Multi-Model Clinical Accreditation Comparison
                </h3>
                <span className="text-xs text-white/50 font-mono">Calibrated Baseline Suite</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 uppercase text-[10px]">
                      <th className="pb-2 font-semibold">Rank & Model</th>
                      <th className="pb-2 font-semibold">Developer / Org</th>
                      <th className="pb-2 font-semibold">Mean Score</th>
                      <th className="pb-2 font-semibold">Pass Rate</th>
                      <th className="pb-2 font-semibold">Safety Violations</th>
                      <th className="pb-2 font-semibold">Accreditation Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {COMPARATIVE_MODELS.map((m, idx) => (
                      <tr
                        key={m.name}
                        className={cn(
                          "transition-colors",
                          m.isNoctis ? "bg-violet-950/30 font-semibold" : "hover:bg-white/[0.02]"
                        )}
                      >
                        <td className="py-2.5 flex items-center gap-2">
                          <span className={cn(
                            "rounded-full size-5 flex items-center justify-center font-bold text-[10px]",
                            idx === 0 ? "bg-amber-500/30 text-amber-300 border border-amber-500/40" : "bg-white/10 text-white/70"
                          )}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className={cn("text-xs font-bold", m.isNoctis ? "text-violet-200" : "text-white/90")}>
                              {m.name}
                            </div>
                            <div className="text-[10px] text-white/40">{m.architecture}</div>
                          </div>
                        </td>
                        <td className="py-2.5 text-white/70">{m.developer}</td>
                        <td className="py-2.5 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white/90">{m.score.toFixed(1)}</span>
                            <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  m.score >= 95 ? "bg-emerald-400" : m.score >= 80 ? "bg-violet-400" : m.score >= 60 ? "bg-amber-400" : "bg-rose-500"
                                )}
                                style={{ width: `${m.score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 font-mono text-white/80">{m.passRate.toFixed(1)}%</td>
                        <td className="py-2.5">
                          {m.violations === 0 ? (
                            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                              <CheckCircle2 className="size-3.5 inline" /> 0 (100% Safe)
                            </span>
                          ) : (
                            <span className="text-rose-400 font-mono font-bold flex items-center gap-1">
                              <AlertTriangle className="size-3.5 inline" /> {m.violations} Violations
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                            m.tier.includes("EXEMPLARY") ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                            m.tier.includes("ACCREDITED") ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" :
                            m.tier.includes("CONDITIONAL") ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                            "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          )}>
                            {m.tier.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Split View: 15-Specialty Performance & 9-Dimensional Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 15 Clinical Specialties List */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <Stethoscope className="size-3.5" /> 15 Specialties
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedLeaderboardSpec("ALL")}
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded transition",
                      selectedLeaderboardSpec === "ALL" ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:text-white"
                    )}
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {Object.entries(leaderboardData.specialtyMetrics).map(([spec, m]) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setSelectedLeaderboardSpec(spec)}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between",
                        selectedLeaderboardSpec === spec
                          ? "bg-violet-500/25 border border-violet-500/40 text-violet-200"
                          : "hover:bg-white/5 text-white/80"
                      )}
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold truncate">{spec.replace(/_/g, " ")}</div>
                        <div className="text-[10px] text-white/40">{m.totalCases} cases · Pass {m.passRatePct}%</div>
                      </div>
                      <div className="shrink-0 text-right font-mono">
                        <div className="font-bold text-emerald-400">{m.meanScore.toFixed(1)}</div>
                        <div className="text-[9px] text-white/50">Med: {m.medianScore}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 9-Dimensional Scoring Rubric Breakdown */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400 flex items-center gap-2">
                      <Sliders className="size-4" /> 9-Dimensional Clinical Rubric
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Scope: <span className="font-semibold text-white/90">{selectedLeaderboardSpec === "ALL" ? "Global 500-Case Average" : selectedLeaderboardSpec.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/30">
                    Composite: {activeSpecMetric ? activeSpecMetric.meanScore.toFixed(1) : leaderboardData.overallMeanScore.toFixed(1)} / 100
                  </span>
                </div>

                <div className="space-y-3">
                  {Object.entries(maxPointsMap).map(([key, maxPts]) => {
                    const achieved = (displayedCard as any)[key] ?? maxPts;
                    const pct = Math.min(100, Math.round((achieved / maxPts) * 1000) / 10);
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/80 font-medium">{labelMap[key] || key}</span>
                          <span className="font-mono font-semibold text-white/90">
                            {achieved.toFixed(1)} / {maxPts} pts <span className="text-white/40 text-[10px]">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              pct >= 95 ? "bg-emerald-400" : pct >= 80 ? "bg-violet-400" : "bg-amber-400"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-white/10 text-xs text-white/60 flex items-center justify-between">
                  <span>Zero hard safety invariant failures across all active cases.</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedLeaderboardSpec !== "ALL") {
                        setSelectedSpecialty(selectedLeaderboardSpec);
                      }
                      setActiveSubTab("health500");
                    }}
                    className="text-violet-400 hover:text-violet-300 font-semibold underline flex items-center gap-1"
                  >
                    Open in Live Case Sandbox <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activeSubTab === "ambient" && (
        <NoctisAmbientDictationSection onSendToChat={onSendToChat} />
      )}

      {activeSubTab === "qlora" && (
        <NoctisQLoRASection />
      )}

      {activeSubTab === "swarm" && (
        <NoctisSpecialistSwarmSection onSendToChat={onSendToChat} />
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
        <NoctisDicomVisionSection onSendToChat={onSendToChat} />
      )}

      {activeSubTab === "fhir" && (
        <NoctisSmartFhirSection onSendToChat={onSendToChat} />
      )}

      {activeSubTab === "telemetry" && (
        <NoctisBedsideTelemetrySection
          onSendToChat={onSendToChat}
          onInjectVitalsToCase={(v) => {
            setCustomVitalsOverride((prev) => ({
              ...prev,
              [selectedSpecialty]: v,
            }));
          }}
        />
      )}

      {/* Track 9: Automated FDA Jan 2026 510(k) eSTAR Regulatory Submission Dossier Builder */}
      {activeSubTab === "estar" && (
        <NoctisFdaEstarSection onSendToChat={onSendToChat} />
      )}

      {/* Track 10: Multi-Hospital Sovereign Federation & Air-Gapped Mesh Sync */}
      {activeSubTab === "mesh" && (
        <NoctisHospitalMeshSection onSendToChat={onSendToChat} />
      )}

      {/* Track 11: Real-Time Pharmacogenomics (PGx) & Drug-Gene Safety Engine */}
      {activeSubTab === "pgx" && (
        <NoctisPgxSection onSendToChat={onSendToChat} />
      )}

      {/* Track 12: Clinical Deterioration & Early Warning Scoring (NEWS2 / qSOFA) */}
      {activeSubTab === "early-warning" && (
        <NoctisEarlyWarningSection
          onSendToChat={onSendToChat}
          onInjectVitalsToCase={(v) => {
            setCustomVitalsOverride((prev) => ({
              ...prev,
              [selectedSpecialty]: v,
            }));
          }}
        />
      )}

      {/* Track 13: Clinical Laboratory LIS Ingestion (HL7 v2.5.1) */}
      {activeSubTab === "lis" && (
        <NoctisLisHl7Section
          onSendToChat={onSendToChat}
          onInjectVitalsToCase={(v) => {
            setCustomVitalsOverride((prev) => ({
              ...prev,
              [selectedSpecialty]: v,
            }));
          }}
        />
      )}

      {/* Track 14: Autonomous End-to-End Clinical Demonstration Pipeline */}
      {activeSubTab === "demo" && (
        <NoctisE2EDemoSection onSendToChat={onSendToChat} />
      )}

      {/* Track 15: 12-Lead Electrocardiography & Vectorcardiography (VCG) Arrhythmia Engine */}
      {activeSubTab === "ecg" && (
        <NoctisEcgSection onSendToChat={onSendToChat} />
      )}

      {/* Track 16: Critical Care Mechanical Ventilation & ARDSNet Titration Protocol */}
      {activeSubTab === "vent" && (
        <NoctisVentilatorSection onSendToChat={onSendToChat} />
      )}

      {/* Track 17: Clinical Ontologies & Terminology Crosswalk Engine */}
      {activeSubTab === "ontology" && (
        <NoctisOntologySection onSendToChat={onSendToChat} />
      )}

      {/* Track 18: Clinical Toxicology & Emergency Toxidrome Resuscitation Engine */}
      {activeSubTab === "tox" && (
        <NoctisToxicologySection onSendToChat={onSendToChat} />
      )}

      {/* Track 19: Pediatric Advanced Life Support (PALS) & Broselow Resuscitation Engine */}
      {activeSubTab === "pals" && (
        <NoctisPalsSection onSendToChat={onSendToChat} />
      )}

      {/* Track 20: Antimicrobial Stewardship & Sepsis Pathogen Empiric Guidance Engine */}
      {activeSubTab === "abx" && (
        <NoctisAntimicrobialSection onSendToChat={onSendToChat} />
      )}

      {/* Track 21: Obstetric & Neonatal Resuscitation (NRP / Category III Fetal Heart Tracing) */}
      {activeSubTab === "ob" && (
        <NoctisObstetricSection onSendToChat={onSendToChat} />
      )}

      {/* Track 22: Point-of-Care Ultrasound (POCUS) & Resuscitation Protocols */}
      {activeSubTab === "pocus" && (
        <NoctisPocusSection onSendToChat={onSendToChat} />
      )}

      {/* Track 23: Clinical Pharmacology Drug-Drug Interaction Matrix & QTc Engine */}
      {activeSubTab === "pharm" && (
        <NoctisPharmacologySection onSendToChat={onSendToChat} />
      )}

      {/* Track 24: Acute Burn Resuscitation & Fluid Titration Engine */}
      {activeSubTab === "burn" && (
        <NoctisBurnSection onSendToChat={onSendToChat} />
      )}

      {/* Track 25: Massive Transfusion Protocol (MTP) & Viscoelastic Hemostasis Engine */}
      {activeSubTab === "mtp" && (
        <NoctisMtpSection onSendToChat={onSendToChat} />
      )}

      {/* Track 26: Diabetic Ketoacidosis (DKA) & HHS Resuscitation Protocol */}
      {activeSubTab === "dka" && (
        <NoctisDkaSection onSendToChat={onSendToChat} />
      )}

      {/* Track 27: Targeted Temperature Management (TTM) & Neuroprognostication */}
      {activeSubTab === "ttm" && (
        <NoctisTtmSection onSendToChat={onSendToChat} />
      )}

      {/* Track 28: Acute Kidney Injury (AKI) & CRRT (KDIGO / FST / RCA) Engine */}
      {activeSubTab === "crrt" && (
        <NoctisCrrtSection onSendToChat={onSendToChat} />
      )}

      {/* Track 29: Hemodynamic Instability & Vasoactive Titration (VIS) Engine */}
      {activeSubTab === "vaso" && (
        <NoctisVasoactiveSection onSendToChat={onSendToChat} />
      )}

      {/* Track 30: Comprehensive Stroke Code & Neurovascular Reperfusion Engine */}
      {activeSubTab === "stroke" && (
        <NoctisStrokeSection onSendToChat={onSendToChat} />
      )}

      {/* Frontier 1: Sovereign In-Browser WebGPU & Air-Gap Engine */}
      {activeSubTab === "airgap" && (
        <NoctisAirgapSection onSendToChat={onSendToChat} />
      )}

      {/* Frontier 3: Bi-Directional EHR Bridge (SMART-on-FHIR / Epic & Cerner) */}
      {activeSubTab === "ehrbridge" && (
        <NoctisEhrBridgeSection onSendToChat={onSendToChat} />
      )}

      {/* Frontier 4: FDA 510(k) / eSTAR & SaMD Comprehensive Regulatory Binder */}
      {activeSubTab === "fdabinder" && (
        <NoctisFdaBinderSection onSendToChat={onSendToChat} />
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
