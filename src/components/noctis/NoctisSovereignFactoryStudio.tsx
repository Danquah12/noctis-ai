"use client";

import { useState, useEffect } from "react";
import {
  X,
  Layers,
  Shield,
  Stethoscope,
  TrendingUp,
  Cpu,
  Code2,
  Scale,
  ShieldAlert,
  Atom,
  Search,
  Landmark,
  GraduationCap,
  Building2,
  Zap,
  Server,
  Microscope,
  FileCheck,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Activity,
  Send,
  Boxes,
  Database,
  Lock,
  Eye,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Headphones,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Network,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SOVEREIGN_SYSTEMS_PORTFOLIO,
  REUSABLE_SYSTEM_TEMPLATES,
  listSovereignSystems,
  getSovereignSystem,
  generateSovereignSystem,
  executeSystemLifecycle,
  routeSystemInteroperabilityEvent,
  type SovereignSystem,
  type LifecycleAction,
  type LifecycleExecutionResult,
  FACTORY_FIVE_LAYERS,
  ENTERPRISE_FABRIC_ORCHESTRATION,
} from "@/lib/noctis-sovereign-factory";

interface NoctisSovereignFactoryStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSystem?: (system: SovereignSystem, autoBuild?: boolean) => void;
}

const CATEGORIES = [
  "All",
  "Top 5 Priority",
  "Security",
  "Healthcare",
  "Governance",
  "Finance",
  "Engineering",
  "Operations",
  "Intelligence",
] as const;

export const NOCTIS_SYSTEM_EXPLANATIONS: Record<
  string,
  { summary: string; operationalImpact: string; coreCapabilities: string[] }
> = {
  "noctis-cyber": {
    summary:
      "Noctis Cyber is the sovereign security intelligence engine engineered for continuous AST taint tracking, live exploit graph validation, vulnerability triage, and zero-compromise enclave defense across cloud and edge clusters.",
    operationalImpact:
      "Autonomously detects and blocks zero-day lateral movement paths, validates CWE vulnerabilities against cryptographic AST invariant proofs, and eliminates false positives through deterministic AST execution.",
    coreCapabilities: [
      "XTRIKE Polyglot SAST/DAST Analysis",
      "TREPATH Lateral Movement Proof Graph",
      "AXIOM External Perimeter Attack Surface Discovery",
      "Zero-Knowledge Attestation & Audit Sealing",
    ],
  },
  "noctis-rmf": {
    summary:
      "Noctis RMF / GRC is the sovereign compliance automation engine implementing NIST SP 800-53 Rev. 5, FedRAMP High, ISO 27001, and SOC 2 Type II continuous controls auditing and machine-readable OSCAL evidence harvesting.",
    operationalImpact:
      "Accelerates Authority to Operate (ATO) timelines from months to minutes by transforming static compliance paperwork into live, continuously verifiable cryptographic control assessments.",
    coreCapabilities: [
      "Automated NIST SP 800-53 Rev. 5 Control Validation",
      "OSCAL Machine-Readable System Security Plan (SSP)",
      "Continuous ATO Evidence Harvesting Pipeline",
      "CISO & Authorizing Official Cryptographic Sign-Off Gates",
    ],
  },
  "noctis-health": {
    summary:
      "Noctis Health is a clinical diagnostic decision support (CDS) engine engineered under strict FDA CDS guidance, HIPAA enclave isolation, and FHIR R4 US Core v9.0.0 interoperability standards.",
    operationalImpact:
      "Enforces non-compensatory emergency triage gates, prevents unprovided clinical fact fabrication, reconciles multi-source longitudinal EHR records, and validates pharmacogenomic contraindications.",
    coreCapabilities: [
      "FDA CDS Non-Compensatory Diagnostic Triage",
      "Zero Unprovided Fact Fabrication Isolation Gateway",
      "FHIR R4 / US Core v9.0.0 Clinical Telemetry Mapping",
      "Hemolysis-Aware Potassium & Creatinine Acute Deterioration Gate",
    ],
  },
  "noctis-finance": {
    summary:
      "Noctis Finance & Investment Research is a high-conviction financial simulation engine executing multi-year discounted cash flow (DCF), Monte Carlo capital simulations, risk-parity portfolio allocation, and SEC 10-K/10-Q XBRL parsing.",
    operationalImpact:
      "Delivers institutional-grade capital allocation models with automated WACC/Terminal Growth sensitivity matrices, liquidity stress testing, and real-time filings gap auditing.",
    coreCapabilities: [
      "5-Year Discounted Cash Flow (DCF) Engine",
      "SEC 10-K/10-Q XBRL Automated Filing Ingestion",
      "Monte Carlo Risk-Parity Capital Allocation",
      "Institutional Capital Structure Sensitivity Modeling",
    ],
  },
  "noctis-engineering": {
    summary:
      "Noctis Engineering is an advanced multi-physics simulation engine running native WebAssembly solvers for partial differential equations (PDE), finite element analysis (FEA), and thermodynamic stress dynamics.",
    operationalImpact:
      "Enables sub-second mechanical, structural, and thermodynamic simulations directly within sovereign memory enclaves without exporting proprietary CAD/mesh geometries to public cloud APIs.",
    coreCapabilities: [
      "Multi-Physics Partial Differential Equation (PDE) Solving",
      "Finite Element Analysis (FEA) Structural Load Stress",
      "Thermodynamic Heat Dissipation Simulation",
      "WebAssembly High-Throughput PDE Compute Mesh",
    ],
  },
  "noctis-legal": {
    summary:
      "Noctis Legal provides sovereign jurisprudence intelligence, automated statutory contradiction redlining, patent claims construction, and regulatory compliance verification with verifiable citation graphs.",
    operationalImpact:
      "Reconciles conflicting multi-jurisdiction statutes, verifies precedent citation chains down to appellate court records, and generates redlined contractual amendments with audit trails.",
    coreCapabilities: [
      "Appellate & Supreme Court Case Precedent Retrieval",
      "Statutory Clause Redlining & Conflict Resolution",
      "Patent Claim Boundary & Prior Art Graphing",
      "Regulatory Compliance Citation Audit Chain",
    ],
  },
  "noctis-defense": {
    summary:
      "Noctis Defense provides mission-critical tactical intelligence, multi-domain defense simulation, post-quantum cryptographic (PQC) communication, and air-gapped threat surface modeling.",
    operationalImpact:
      "Maintains operational superiority in contested electronic environments through lattice-based Kyber-768 encryption, tactical mesh telemetry, and adversarial red-teaming simulations.",
    coreCapabilities: [
      "PQC Kyber-768 / Dilithium Enclave Encryption",
      "Multi-Domain Tactical Mission Simulation",
      "Air-Gapped Telemetry Threat Modeling",
      "Adversarial Deception & Canary Fleet Defense",
    ],
  },
  "noctis-science": {
    summary:
      "Noctis Science is an autonomous multi-disciplinary scientific research engine accelerating genomic sequencing analysis, molecular dynamics, biochemical binding affinities, and literature synthesis.",
    operationalImpact:
      "Rapidly stress-tests biomedical hypotheses against peer-reviewed corpora and executes automated laboratory protocol designs with reproducible mathematical models.",
    coreCapabilities: [
      "Genomic Variant & CRISPR Target Modeling",
      "Molecular Dynamics & Receptor Binding Affinities",
      "Peer-Reviewed Citation Graph Extraction",
      "Reproducible Laboratory Protocol Synthesis",
    ],
  },
  "noctis-intelligence": {
    summary:
      "Noctis Intelligence is an open-source intelligence (OSINT) and geopolitical investigative engine performing entity relationship link analysis, multi-modal signal reconnaissance, and global telemetry mapping.",
    operationalImpact:
      "Synthesizes fragmented open-source data streams into coherent intelligence dossiers, uncovering hidden entity relationships and temporal event correlations in real time.",
    coreCapabilities: [
      "Multi-Modal Open-Source Intelligence (OSINT) Ingestion",
      "Entity Relationship Knowledge Graph Construction",
      "Geopolitical Threat & Signal Telemetry Mapping",
      "Temporal Conflict & Disinformation Link Analysis",
    ],
  },
  "noctis-government": {
    summary:
      "Noctis Government coordinates sovereign public sector operations, policy formulation, administrative workflow compliance, and FISMA High data governance.",
    operationalImpact:
      "Ensures tamper-proof citizen service workflows, automated legislative impact analysis, and continuous compliance with federal and municipal transparency mandates.",
    coreCapabilities: [
      "FISMA High Sovereign Government Workflow Engine",
      "Legislative Impact Modeling & Statutory Analysis",
      "Tamper-Proof Citizen Service Audit Chains",
      "Public Sector Inter-Agency Data Gateway",
    ],
  },
  "noctis-education": {
    summary:
      "Noctis Education provides adaptive pedagogical modeling, clinical and engineering credentialing simulations, and personalized multi-modal instructional tutoring.",
    operationalImpact:
      "Dynamically models learner knowledge graphs, identifies conceptual misconceptions, and synthesizes rigorous professional credentialing examinations with calibrated difficulty.",
    coreCapabilities: [
      "Knowledge Graph Mastery & Cognitive Modeling",
      "High-Stakes Professional Credentialing Simulation",
      "Socratic Multi-Modal Instructional Tutoring",
      "Dynamic Curriculum Optimization Engine",
    ],
  },
  "noctis-enterprise": {
    summary:
      "Noctis Enterprise coordinates cross-organization operations, ERP/CRM workflow orchestration, supply chain resilience analysis, and executive decision-support analytics.",
    operationalImpact:
      "Connects distributed ERP, HRIS, CRM, and supply chain databases into a unified autonomous execution fabric with automated human-in-the-loop approval thresholds.",
    coreCapabilities: [
      "Cross-Enterprise ERP & CRM Unified Fabric",
      "Autonomous Supply Chain Resilience Modeling",
      "Multi-Department Workflow Orchestration",
      "Executive KPI Decision-Support Telemetry",
    ],
  },
  "noctis-energy": {
    summary:
      "Noctis Energy delivers real-time smart grid optimization, SCADA telemetry anomaly detection, renewable supply-demand balancing, and critical infrastructure resilience.",
    operationalImpact:
      "Prevents grid failure events by forecasting renewable intermittency, isolating abnormal SCADA telemetry signals, and optimizing distributed battery storage discharge cycles.",
    coreCapabilities: [
      "Real-Time SCADA Anomaly & Cyber Intrusion Detection",
      "Renewable Energy Supply-Demand Load Balancing",
      "Distributed Battery Storage Optimization",
      "Power Grid Infrastructure Transient Modeling",
    ],
  },
  "noctis-infrastructure": {
    summary:
      "Noctis Infrastructure monitors civil and digital critical systems, analyzing structural sensor telemetry, zero-trust network topologies, and disaster recovery orchestration.",
    operationalImpact:
      "Enables predictive maintenance across bridges, transportation hubs, and cloud datacenters before structural fatigue or network topology bottlenecks cause catastrophic outages.",
    coreCapabilities: [
      "Civil & Industrial Sensor Telemetry Ingestion",
      "Structural Fatigue Predictive Failure Analysis",
      "Zero-Trust Network Topology Verification",
      "Autonomous Disaster Recovery Orchestration",
    ],
  },
  "noctis-research": {
    summary:
      "Noctis Research synthesizes cross-disciplinary breakthroughs, stress-testing counterfactual hypotheses against academic corpora and generating structured research methodologies.",
    operationalImpact:
      "Breaks down research silos by discovering non-obvious cross-domain connections between physics, biology, computer science, and economics with formal citation proofs.",
    coreCapabilities: [
      "Cross-Discipline Citation & Discovery Mapping",
      "Counterfactual Hypothesis Stress-Testing",
      "Automated Literature Meta-Analysis Engine",
      "Formal Methodological Research Synthesis",
    ],
  },
  "noctis-software": {
    summary:
      "Noctis Software executes autonomous full-stack software engineering, AST-driven refactoring, formal verification, polyglot SAST/DAST CI/CD integration, and containerized deployment.",
    operationalImpact:
      "Autonomously synthesizes production-ready microservices, generates comprehensive unit and invariant test suites, and enforces zero-compromise architectural standards.",
    coreCapabilities: [
      "Autonomous Microservice Architecture Synthesis",
      "Formal AST Invariant Verification & Refactoring",
      "Polyglot SAST/DAST Continuous CI/CD Gates",
      "Deterministic Containerized Build & Deploy Pipelines",
    ],
  },
};

export function NoctisSovereignFactoryStudio({
  isOpen,
  onClose,
  onSelectSystem,
}: NoctisSovereignFactoryStudioProps) {
  const [systems, setSystems] = useState<SovereignSystem[]>(listSovereignSystems());
  const [selectedSystemId, setSelectedSystemId] = useState<string>("noctis-cyber");
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>("All");
  const [activeTab, setActiveTab] = useState<"matrix" | "inspector" | "architecture" | "lifecycle" | "bus" | "templates">("matrix");
  const [explainerSystem, setExplainerSystem] = useState<SovereignSystem | null>(null);
  const [lifecycleLog, setLifecycleLog] = useState<LifecycleExecutionResult | null>(null);
  const [executingAction, setExecutingAction] = useState<LifecycleAction | null>(null);
  const [busEvents, setBusEvents] = useState<{ id: string; from: string; to: string; type: string; latencyMs: number; status: string; timestamp: string }[]>([
    {
      id: "msg-initial-1",
      from: "Noctis Cyber",
      to: "Noctis RMF / GRC",
      type: "AUDIT_ATTESTATION",
      latencyMs: 1.4,
      status: "Delivered via DStrike Sovereign Bus",
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: "msg-initial-2",
      from: "Noctis Health",
      to: "Noctis Enterprise",
      type: "CLINICAL_TELEMETRY",
      latencyMs: 1.8,
      status: "Delivered via DStrike Sovereign Bus",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl-cybersecurity");
  const [newSystemName, setNewSystemName] = useState<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (explainerSystem) {
          setExplainerSystem(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, explainerSystem]);

  if (!isOpen) return null;

  const currentSystem = systems.find((s) => s.identity.id === selectedSystemId) || systems[0];

  const getCategoryCount = (cat: typeof CATEGORIES[number]) => {
    if (cat === "All") return systems.length;
    if (cat === "Top 5 Priority") return systems.filter((s) => typeof s.priorityRank === "number" && s.priorityRank <= 5).length;
    return systems.filter((s) => s.identity.category === cat).length;
  };

  const filteredSystems = systems.filter((s) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Top 5 Priority") return typeof s.priorityRank === "number" && s.priorityRank <= 5;
    return s.identity.category === activeCategory;
  });

  const getSystemIcon = (iconName: string) => {
    switch (iconName) {
      case "Shield": return <Shield className="size-4 text-rose-400" />;
      case "FileCheck": return <FileCheck className="size-4 text-amber-400" />;
      case "Stethoscope": return <Stethoscope className="size-4 text-sky-400" />;
      case "TrendingUp": return <TrendingUp className="size-4 text-emerald-400" />;
      case "Cpu": return <Cpu className="size-4 text-purple-400" />;
      case "Code2": return <Code2 className="size-4 text-indigo-400" />;
      case "Scale": return <Scale className="size-4 text-rose-400" />;
      case "ShieldAlert": return <ShieldAlert className="size-4 text-red-400" />;
      case "Atom": return <Atom className="size-4 text-teal-400" />;
      case "Search": return <Search className="size-4 text-indigo-400" />;
      case "Landmark": return <Landmark className="size-4 text-blue-400" />;
      case "GraduationCap": return <GraduationCap className="size-4 text-amber-400" />;
      case "Building2": return <Building2 className="size-4 text-emerald-400" />;
      case "Zap": return <Zap className="size-4 text-yellow-400" />;
      case "Server": return <Server className="size-4 text-cyan-400" />;
      case "Microscope": return <Microscope className="size-4 text-purple-400" />;
      default: return <Boxes className="size-4 text-zinc-400" />;
    }
  };

  const handleOpenInspector = (sys: SovereignSystem) => {
    setSelectedSystemId(sys.identity.id);
    setActiveTab("inspector");
  };

  const handleOpenLifecycle = (sys: SovereignSystem) => {
    setSelectedSystemId(sys.identity.id);
    setActiveTab("lifecycle");
  };

  const handleOpenBus = (sys: SovereignSystem) => {
    setSelectedSystemId(sys.identity.id);
    setActiveTab("bus");
  };

  const handleBuildSystem = (sys: SovereignSystem) => {
    setSelectedSystemId(sys.identity.id);
    if (onSelectSystem) {
      onSelectSystem(sys, true);
    }
    onClose();
  };

  const handleRunLifecycle = (action: LifecycleAction) => {
    setExecutingAction(action);
    setTimeout(() => {
      const res = executeSystemLifecycle(currentSystem.identity.id, action);
      setLifecycleLog(res);
      setExecutingAction(null);
      setSystems((prev) =>
        prev.map((s) => (s.identity.id === currentSystem.identity.id ? { ...s, deployment: { ...s.deployment, status: res.newStatus as any } } : s))
      );
    }, 300);
  };

  const handleDispatchBusEvent = (toId: string) => {
    const res = routeSystemInteroperabilityEvent({
      fromSystemId: currentSystem.identity.id,
      toSystemId: toId,
      eventType: "TASK_HANDOFF",
      payload: { trigger: "Manual Studio Simulation", timestamp: new Date().toISOString() },
    });
    const targetSys = systems.find((s) => s.identity.id === toId);
    setBusEvents((prev) => [
      {
        id: res.messageId,
        from: currentSystem.identity.name,
        to: targetSys ? targetSys.identity.name : toId,
        type: "TASK_HANDOFF",
        latencyMs: res.latencyMs,
        status: res.status,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 15),
    ]);
  };

  const handleCreateFromTemplate = () => {
    const tpl = REUSABLE_SYSTEM_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    const name = newSystemName.trim() || `${tpl.name} Instance`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const generated = generateSovereignSystem(selectedTemplateId, {
      identity: {
        id: `noctis-${slug}`,
        name,
        slug,
        tagline: tpl.description,
        category: tpl.archetype === "Clinical" ? "Healthcare" : tpl.archetype === "SecOps" ? "Security" : "Engineering",
        version: "1.0.0",
        owner: "Noctis Sovereign Systems Factory",
        purpose: tpl.description,
        icon: "Cpu",
        badge: "NEW",
        badgeColor: "sky",
      },
    });

    setSystems((prev) => [generated, ...prev]);
    setSelectedSystemId(generated.identity.id);
    setActiveTab("inspector");
    setNewSystemName("");
  };

  const explainerData = explainerSystem
    ? NOCTIS_SYSTEM_EXPLANATIONS[explainerSystem.identity.id] || {
        summary: explainerSystem.identity.purpose,
        operationalImpact: `Autonomous execution in ${explainerSystem.identity.category} domain with calibrated invariants.`,
        coreCapabilities: explainerSystem.capabilities.map((c) => c.name),
      }
    : null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="relative flex h-[94vh] max-h-[920px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d10] text-white shadow-2xl">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#141418] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400 shadow-inner">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">Noctis Sovereign Systems Factory</h1>
                <span className="rounded-full bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                  NOCTIS-FACTORY-2026
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                One Noctis Brain · 16 Sovereign Systems · Independent Execution · Shared Infrastructure
              </p>
            </div>
          </div>

          {/* Navigation Tab Pills */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                activeTab === "matrix" ? "bg-white/15 text-white shadow-xs" : "text-zinc-400 hover:text-white"
              )}
            >
              Systems Matrix ({systems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inspector")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                activeTab === "inspector" ? "bg-white/15 text-white shadow-xs" : "text-zinc-400 hover:text-white"
              )}
            >
              11-D Inspector
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("architecture")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                activeTab === "architecture" ? "bg-white/15 text-white shadow-xs" : "text-zinc-400 hover:text-white"
              )}
            >
              5-Layer Architecture
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lifecycle")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                activeTab === "lifecycle" ? "bg-white/15 text-white shadow-xs" : "text-zinc-400 hover:text-white"
              )}
            >
              Lifecycle Manager
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bus")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                activeTab === "bus" ? "bg-white/15 text-white shadow-xs" : "text-zinc-400 hover:text-white"
              )}
            >
              Event Bus
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                activeTab === "templates" ? "bg-white/15 text-white shadow-xs" : "text-zinc-400 hover:text-white"
              )}
            >
              New System
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Factory Studio"
            className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700">

          {/* TAB 1: SYSTEMS MATRIX */}
          {activeTab === "matrix" && (
            <div className="space-y-6">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "rounded-full px-3.5 py-1 text-xs font-medium transition shrink-0 cursor-pointer",
                      activeCategory === cat
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border border-white/5"
                    )}
                  >
                    {cat} ({getCategoryCount(cat)})
                  </button>
                ))}
              </div>

              {/* Systems Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSystems.map((sys) => {
                  const isSelected = sys.identity.id === selectedSystemId;
                  return (
                    <div
                      key={sys.identity.id}
                      onClick={() => setExplainerSystem(sys)}
                      className={cn(
                        "group relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition shadow-sm hover:scale-[1.01] active:scale-[0.99]",
                        isSelected
                          ? "bg-white/[0.08] border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.2)]"
                          : "bg-[#141418] border-white/10 hover:bg-white/[0.05] hover:border-sky-500/40"
                      )}
                    >
                      <div>
                        {/* Header: Icon, Name, Category */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-black border border-white/10">
                              {getSystemIcon(sys.identity.icon)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition">
                                  {sys.identity.name}
                                </h3>
                                {typeof sys.priorityRank === "number" && (
                                  <span className="rounded bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.2 text-[9px] font-bold text-rose-300">
                                    P{sys.priorityRank}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400">
                                {sys.identity.category} · v{sys.identity.version}
                              </p>
                            </div>
                          </div>

                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase",
                            sys.deployment.status === "running"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          )}>
                            {sys.deployment.status}
                          </span>
                        </div>

                        {/* Purpose Description */}
                        <p className="mt-3 text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                          {sys.identity.purpose}
                        </p>
                      </div>

                      {/* Footer Metrics & Direct Action Buttons */}
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="truncate max-w-[140px]">{sys.architecture.runtime}</span>
                          <span className="text-emerald-400 font-medium">{sys.evaluation.measuredAccuracy || 99}% Accuracy</span>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 pt-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExplainerSystem(sys);
                              }}
                              className="rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 px-2.5 py-1 text-[11px] font-bold text-sky-300 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="size-3 text-sky-300" />
                              <span>Explain</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInspector(sys);
                              }}
                              className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition cursor-pointer"
                            >
                              <Eye className="size-3" />
                              <span>Inspect</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLifecycle(sys);
                              }}
                              className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition cursor-pointer"
                            >
                              <span>Lifecycle</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBuildSystem(sys);
                            }}
                            className="rounded-lg bg-[#e4b86a] hover:bg-amber-400 text-black px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Play className="size-2.5 fill-current" />
                            <span>Build</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: 11-DIMENSION SYSTEM INSPECTOR */}
          {activeTab === "inspector" && (
            <div className="space-y-6">
              {/* Top Navigation & Action Controls */}
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("matrix")}
                  className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer rounded-lg px-2.5 py-1 hover:bg-white/5 transition"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Systems Matrix</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExplainerSystem(currentSystem)}
                    className="rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 px-3 py-1.5 text-xs text-sky-300 font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="size-3.5 text-sky-300" />
                    <span>Explain System</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("lifecycle")}
                    className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs text-white font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Lifecycle Manager</span>
                    <ArrowRight className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("bus")}
                    className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs text-white font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Event Bus</span>
                    <ArrowRight className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBuildSystem(currentSystem)}
                    className="rounded-xl bg-[#e4b86a] hover:bg-amber-400 text-black px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Play className="size-3 fill-current" />
                    <span>Build in Forge</span>
                  </button>
                </div>
              </div>

              {/* Selected System Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141418] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-black border border-white/10">
                    {getSystemIcon(currentSystem.identity.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">{currentSystem.identity.name}</h2>
                      <span className="text-xs text-zinc-400 font-mono">({currentSystem.identity.id})</span>
                      {typeof currentSystem.priorityRank === "number" && (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          Priority {currentSystem.priorityRank}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300">{currentSystem.identity.tagline}</p>
                  </div>
                </div>

                {/* Quick Switcher Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Switch System:</span>
                  <select
                    value={selectedSystemId}
                    onChange={(e) => setSelectedSystemId(e.target.value)}
                    className="rounded-xl bg-black border border-white/15 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {systems.map((s) => (
                      <option key={s.identity.id} value={s.identity.id}>
                        {s.identity.name} ({s.identity.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 11 Dimensions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Identity */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">1. System Identity</span>
                  <p className="text-xs text-zinc-300"><strong>Owner:</strong> {currentSystem.identity.owner}</p>
                  <p className="text-xs text-zinc-300"><strong>Version:</strong> {currentSystem.identity.version}</p>
                  <p className="text-xs text-zinc-300"><strong>Purpose:</strong> {currentSystem.identity.purpose}</p>
                </div>

                {/* 2. Architecture */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">2. Architecture</span>
                  <p className="text-xs text-zinc-300"><strong>Runtime:</strong> {currentSystem.architecture.runtime}</p>
                  <p className="text-xs text-zinc-300"><strong>Services:</strong> {currentSystem.architecture.services.join(", ")}</p>
                  <p className="text-xs text-zinc-300"><strong>Databases:</strong> {currentSystem.architecture.databases.join(", ")}</p>
                  <p className="text-xs text-zinc-400">Memory: {currentSystem.architecture.memoryLimitMb}MB · Storage: {currentSystem.architecture.storageQuotaGb}GB</p>
                </div>

                {/* 3. Knowledge Base */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">3. Knowledge Base & RAG</span>
                  <p className="text-xs text-zinc-300"><strong>Domain:</strong> {currentSystem.knowledgeBase.domain}</p>
                  <p className="text-xs text-zinc-300"><strong>Sources:</strong> {currentSystem.knowledgeBase.dataSources.slice(0, 3).join(", ")}</p>
                  <p className="text-xs text-zinc-300"><strong>Chunking:</strong> {currentSystem.knowledgeBase.chunkingStrategy}</p>
                  <p className="text-xs text-zinc-400">Top-K: {currentSystem.knowledgeBase.retrievalTopK} · Threshold: {Math.round(currentSystem.knowledgeBase.groundingThreshold * 100)}%</p>
                </div>

                {/* 4. Capabilities */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">4. Capabilities ({currentSystem.capabilities.length})</span>
                  {currentSystem.capabilities.map((c) => (
                    <div key={c.id} className="text-xs bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="font-semibold text-white">{c.name}</p>
                      <p className="text-[11px] text-zinc-400">{c.description}</p>
                    </div>
                  ))}
                </div>

                {/* 5. Agents */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">5. Specialized Agents ({currentSystem.agents.length})</span>
                  {currentSystem.agents.map((a) => (
                    <div key={a.id} className="text-xs bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="font-semibold text-white">{a.name} ({a.role})</p>
                      <p className="text-[11px] text-zinc-400">Model: {a.modelTarget} · Focus: {a.specialization}</p>
                    </div>
                  ))}
                </div>

                {/* 6. Workflows */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">6. Operational Workflows</span>
                  {currentSystem.workflows.map((w) => (
                    <div key={w.id} className="text-xs bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="font-semibold text-white">{w.name} ({w.trigger})</p>
                      <p className="text-[11px] text-zinc-400">Steps: {w.steps.join(" → ")}</p>
                      {w.approvalGates.length > 0 && (
                        <p className="text-[10px] text-amber-300 mt-1">Approval Gate: {w.approvalGates.join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* 7. Interface */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">7. Dedicated Interface</span>
                  <div className="flex gap-2">
                    <span className={cn("px-2 py-0.5 text-[10px] rounded font-semibold", currentSystem.interface.hasChat ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500")}>Chat</span>
                    <span className={cn("px-2 py-0.5 text-[10px] rounded font-semibold", currentSystem.interface.hasBoard ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500")}>Board</span>
                    <span className={cn("px-2 py-0.5 text-[10px] rounded font-semibold", currentSystem.interface.hasCanvas ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500")}>Canvas</span>
                  </div>
                  <p className="text-xs text-zinc-300">Default View: <strong>{currentSystem.interface.defaultView}</strong></p>
                  <p className="text-xs text-zinc-400">Widgets: {currentSystem.interface.customWidgets.join(", ")}</p>
                </div>

                {/* 8. Security */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">8. Security & RBAC</span>
                  <p className="text-xs text-zinc-300"><strong>Isolation:</strong> {currentSystem.security.tenantIsolation}</p>
                  <p className="text-xs text-zinc-300"><strong>Auth:</strong> {currentSystem.security.authentication}</p>
                  <p className="text-xs text-zinc-300"><strong>Roles:</strong> {currentSystem.security.rbacRoles.join(", ")}</p>
                  <p className="text-[11px] text-emerald-400">SHA-256 Audit Trail: Active</p>
                </div>

                {/* 9. Memory */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">9. Memory Architecture</span>
                  <p className="text-xs text-zinc-300"><strong>Context Window:</strong> {currentSystem.memory.persistentContextWindow.toLocaleString()} tokens</p>
                  <p className="text-xs text-zinc-300"><strong>Storage Engine:</strong> {currentSystem.memory.storageEngine}</p>
                  <p className="text-xs text-zinc-300"><strong>Decay Policy:</strong> {currentSystem.memory.decayPolicy}</p>
                </div>

                {/* 10. Evaluation */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400">10. Evaluation & Accuracy</span>
                  <p className="text-xs text-zinc-300"><strong>Target Score:</strong> &gt;= {currentSystem.evaluation.benchmarkScoreTarget}%</p>
                  <p className="text-xs text-zinc-300"><strong>Measured Accuracy:</strong> <span className="text-emerald-400 font-bold">{currentSystem.evaluation.measuredAccuracy}%</span></p>
                  <p className="text-xs text-zinc-400">Suites: {currentSystem.evaluation.testSuites.join(", ")}</p>
                </div>

                {/* 11. Deployment */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">11. Deployment & Health</span>
                  <p className="text-xs text-zinc-300"><strong>Environment:</strong> {currentSystem.deployment.environment}</p>
                  <p className="text-xs text-zinc-300"><strong>Status:</strong> <span className="text-emerald-400 font-bold">{currentSystem.deployment.status.toUpperCase()}</span></p>
                  <p className="text-xs text-zinc-300"><strong>Uptime:</strong> {currentSystem.deployment.uptimePercentage}% ({currentSystem.deployment.replicas} replicas)</p>
                  <p className="text-xs font-mono text-zinc-500">{currentSystem.deployment.healthEndpoint}</p>
                </div>

              </div>
            </div>
          )}

          {/* TAB: 5-LAYER ARCHITECTURE & ENTERPRISE FABRIC */}
          {activeTab === "architecture" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header Dossier */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-sky-950/30 via-zinc-900 to-indigo-950/30 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Layers className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">5 Major Layers & Enterprise Orchestration Fabric</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      One Noctis Brain · 16 Professional Intelligence Systems · Independent Execution · Shared Sovereign Infrastructure
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1: The Five Major Layers Stack */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">1. The Five Major Architectural Layers</h4>
                  <span className="text-[11px] text-zinc-500 font-mono">Top-to-Bottom Sovereignty Pipeline</span>
                </div>

                <div className="space-y-2.5">
                  {FACTORY_FIVE_LAYERS.map((l, idx) => (
                    <div key={l.layerNumber} className="space-y-2.5">
                      <div className={cn(
                        "rounded-2xl border border-white/10 bg-gradient-to-r p-4 transition hover:border-white/20 shadow-md",
                        l.bgGradient
                      )}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-black"
                              style={{ backgroundColor: l.color }}
                            >
                              L{l.layerNumber}
                            </span>
                            <div>
                              <h5 className="text-sm font-bold text-white">{l.layerName}</h5>
                              <p className="text-xs font-mono font-medium" style={{ color: l.color }}>
                                {l.tagline}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                          {l.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                          {l.components.map((c) => (
                            <span
                              key={c}
                              className="rounded-lg bg-black/50 border border-white/10 px-2.5 py-1 text-[11px] text-zinc-200"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Downward Arrow Connector */}
                      {idx < FACTORY_FIVE_LAYERS.length - 1 && (
                        <div className="flex justify-center py-0.5">
                          <ArrowDown className="size-4 text-zinc-500 animate-bounce" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Enterprise Orchestration Architecture */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">2. Enterprise Fabric & Multi-Agent Orchestration</h4>
                  <span className="text-[11px] text-emerald-400 font-mono">Autonomous Execution Engine</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left: Enterprise Systems & Ingestion Channels */}
                  <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Enterprise Systems & Channels</span>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] text-zinc-400 mb-1.5 font-medium">Ingestion Touchpoints:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ENTERPRISE_FABRIC_ORCHESTRATION.enterpriseSystems.channels.map((ch) => (
                            <span key={ch} className="rounded-lg bg-sky-500/10 border border-sky-500/20 px-2 py-1 text-[11px] text-sky-300 font-mono">
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] text-zinc-400 mb-1.5 font-medium">Core Enterprise Workloads:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ENTERPRISE_FABRIC_ORCHESTRATION.enterpriseSystems.systems.map((sys) => (
                            <span key={sys} className="rounded-lg bg-zinc-800/80 border border-white/10 px-2.5 py-1 text-xs text-white font-semibold">
                              {sys}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center: Orchestration Layer & 8 Agents */}
                  <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-[#141418] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Orchestration Layer</span>
                      <div className="flex gap-1">
                        {ENTERPRISE_FABRIC_ORCHESTRATION.orchestrationLayer.coreFunctions.map((fn) => (
                          <span key={fn} className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300">
                            {fn}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] text-zinc-400">8 Autonomous Specialized Agents:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {ENTERPRISE_FABRIC_ORCHESTRATION.orchestrationLayer.agents.map((ag) => (
                          <div key={ag.name} className="rounded-xl bg-black/60 border border-white/10 p-2.5">
                            <p className="text-xs font-bold text-white">{ag.name}</p>
                            <p className="text-[10px] text-indigo-300 font-mono">{ag.role}</p>
                            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-tight">{ag.focus}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Tools & Data Sources & Model Layer */}
                  <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Tools, Data & Model Layer</span>
                    
                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1">Tools & Services:</p>
                      <div className="flex flex-wrap gap-1">
                        {ENTERPRISE_FABRIC_ORCHESTRATION.toolsAndServices.map((t) => (
                          <span key={t} className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1">Data Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {ENTERPRISE_FABRIC_ORCHESTRATION.dataSources.map((d) => (
                          <span key={d} className="rounded bg-zinc-800 border border-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1">Model Layer:</p>
                      <div className="flex flex-wrap gap-1">
                        {ENTERPRISE_FABRIC_ORCHESTRATION.modelLayer.map((m) => (
                          <span key={m} className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Governance, Security & Impact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Governance, Security & Infrastructure</span>
                    <ul className="space-y-1 text-xs text-zinc-300">
                      {ENTERPRISE_FABRIC_ORCHESTRATION.governanceAndSecurity.map((g) => (
                        <li key={g} className="flex items-center gap-2">
                          <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                          <span>{g}</span>
                        </li>
                      ))}
                      {ENTERPRISE_FABRIC_ORCHESTRATION.infrastructureFoundation.map((inf) => (
                        <li key={inf} className="flex items-center gap-2">
                          <Server className="size-3.5 text-sky-400 shrink-0" />
                          <span>{inf}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Business & Operational Impact</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {ENTERPRISE_FABRIC_ORCHESTRATION.businessImpact.map((imp) => (
                        <div key={imp} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 p-2 text-xs font-semibold text-white">
                          <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                          <span>{imp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIFECYCLE MANAGER */}
          {activeTab === "lifecycle" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Terminal className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">System Lifecycle Management</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Audited deterministic execution across Create, Configure, Test, Validate, Deploy, Monitor, Upgrade, Rollback, Retire.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Target System:</span>
                  <select
                    value={selectedSystemId}
                    onChange={(e) => setSelectedSystemId(e.target.value)}
                    className="rounded-xl bg-black border border-white/15 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {systems.map((s) => (
                      <option key={s.identity.id} value={s.identity.id}>
                        {s.identity.name} ({s.deployment.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Execute Action on {currentSystem.identity.name}</span>
                  <span className="text-[11px] text-zinc-500">Status: <strong className="text-emerald-400">{currentSystem.deployment.status.toUpperCase()}</strong></span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                  {(
                    [
                      "CREATE",
                      "CONFIGURE",
                      "TEST",
                      "VALIDATE",
                      "DEPLOY",
                      "MONITOR",
                      "UPGRADE",
                      "ROLLBACK",
                      "RETIRE",
                    ] as LifecycleAction[]
                  ).map((act) => (
                    <button
                      key={act}
                      type="button"
                      disabled={executingAction !== null}
                      onClick={() => handleRunLifecycle(act)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer",
                        executingAction === act
                          ? "bg-sky-500/20 border-sky-400 text-sky-300 animate-pulse"
                          : "bg-black/40 border-white/10 hover:bg-white/10 hover:border-white/25 text-zinc-200"
                      )}
                    >
                      <span>{act}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Execution Console Output */}
              {lifecycleLog ? (
                <div className="rounded-2xl border border-white/10 bg-black p-4 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="text-sky-400 font-bold">Execution Result: {lifecycleLog.action.toUpperCase()}</span>
                    <span className="text-zinc-500">{lifecycleLog.timestamp}</span>
                  </div>
                  <p className="text-zinc-400">System ID: <span className="text-zinc-200">{lifecycleLog.systemId}</span></p>
                  <p className="text-zinc-400">Audit Seal: <span className="text-emerald-400 break-all">{lifecycleLog.auditSealSha256}</span></p>
                  <p className="text-zinc-400">State Transition: <span className="text-zinc-300">{lifecycleLog.priorStatus}</span> → <span className="text-emerald-400 font-bold">{lifecycleLog.newStatus}</span></p>
                  <div className="pt-2 text-zinc-300 space-y-1">
                    {lifecycleLog.log.map((line, idx) => (
                      <p key={idx} className={line.includes("✓") || line.includes("COMPLIANT") || line.includes("PASS") ? "text-emerald-300" : "text-zinc-400"}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-500 text-xs">
                  Select a lifecycle action above to initiate execution and generate a cryptographic SHA-256 audit seal.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EVENT BUS */}
          {activeTab === "bus" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">DStrike Sovereign Interoperability Bus</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Governed sub-5ms event dispatch between Sovereign Systems. Active source: <strong>{currentSystem.identity.name}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDispatchBusEvent("noctis-rmf")}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
                  >
                    <Send className="size-3" />
                    <span>Send to RMF/GRC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDispatchBusEvent("noctis-health")}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/30 transition cursor-pointer"
                  >
                    <Send className="size-3" />
                    <span>Send to Health CDS</span>
                  </button>
                </div>
              </div>

              {/* Event Stream */}
              <div className="rounded-2xl border border-white/10 bg-black divide-y divide-zinc-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-900/60 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Inter-System Event Stream</span>
                  <span className="text-emerald-400 font-mono">Avg Latency: 1.4ms</span>
                </div>
                {busEvents.map((evt) => (
                  <div key={evt.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{evt.from}</span>
                          <span className="text-zinc-500">→</span>
                          <span className="font-bold text-white">{evt.to}</span>
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                            {evt.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{evt.status}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <p className="text-emerald-400">{evt.latencyMs}ms</p>
                      <p className="text-zinc-500">{evt.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TEMPLATES & GENERATOR */}
          {activeTab === "templates" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Generate New Sovereign System</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Instantiate an independent, 11-dimension professional system from vetted architecture templates.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="text"
                    value={newSystemName}
                    onChange={(e) => setNewSystemName(e.target.value)}
                    placeholder="Enter system name (e.g. Noctis BioPharma Intelligence)..."
                    className="flex-1 rounded-xl bg-black border border-white/15 px-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateFromTemplate}
                    className="rounded-xl bg-[#e4b86a] hover:bg-amber-400 text-black px-4 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="size-3.5 stroke-[2.5]" />
                    <span>Generate Sovereign System</span>
                  </button>
                </div>
              </div>

              {/* Template Selection Grid */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Domain Template</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {REUSABLE_SYSTEM_TEMPLATES.map((tpl) => {
                    const isSelected = tpl.id === selectedTemplateId;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={cn(
                          "p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between",
                          isSelected
                            ? "bg-white/[0.08] border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                            : "bg-[#141418] border-white/10 hover:bg-white/[0.04] hover:border-white/20"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white">{tpl.name}</h4>
                            <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-semibold text-zinc-300">
                              {tpl.archetype}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{tpl.description}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                          <span>Runtime: {tpl.suggestedRuntime}</span>
                          <span>Context: {(tpl.memoryTier / 1000).toFixed(0)}k</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Footer Status Bar */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#141418] px-6 py-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sovereign Systems Factory Runtime: <strong className="text-white">Active ({systems.length} Systems Ready)</strong></span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <span>Shared Sovereign Enclave</span>
            <span>·</span>
            <span>Zero-Compromise Isolation</span>
            <span>·</span>
            <span>OSCAL & NIST SP 800-53 Verified</span>
          </div>
        </div>

      </div>

      {/* NOCTIS INTELLIGENCE DEEP-DIVE EXPLAINER POPUP (NO TRANSITION TO CHAT) */}
      {explainerSystem && explainerData && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setExplainerSystem(null);
          }}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-sky-500/40 bg-[#0f0f14] text-white shadow-[0_0_50px_rgba(56,189,248,0.25)]">
            
            {/* Pop-up Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#16161d] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-black border border-sky-500/30 text-sky-400 shadow-inner">
                  {getSystemIcon(explainerSystem.identity.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{explainerSystem.identity.name}</h2>
                    <span className="text-xs text-zinc-400 font-mono">({explainerSystem.identity.id})</span>
                    {typeof explainerSystem.priorityRank === "number" && (
                      <span className="rounded bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                        Priority {explainerSystem.priorityRank}
                      </span>
                    )}
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                      {explainerSystem.deployment.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    {explainerSystem.identity.category} · v{explainerSystem.identity.version} · {explainerSystem.identity.owner}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExplainerSystem(null)}
                aria-label="Close Pop-up"
                className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Pop-up Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-zinc-700">
              
              {/* Executive Noctis Assessment */}
              <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/30 via-zinc-900 to-indigo-950/30 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Noctis Sovereign Assessment & Deep-Dive Search
                  </span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                  {explainerData.summary}
                </p>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-sky-300">Operational Significance:</strong> {explainerData.operationalImpact}
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Core Sovereign Capabilities:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {explainerData.coreCapabilities.map((cap) => (
                      <span
                        key={cap}
                        className="rounded-lg bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 text-xs text-sky-200 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="size-3 text-sky-400" />
                        <span>{cap}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Technical Blueprint Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Architecture & Runtime */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Server className="size-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Architecture & Compute</span>
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Runtime Enclave:</strong> {explainerSystem.architecture.runtime}</p>
                  <p className="text-xs text-zinc-300"><strong>Services:</strong> {explainerSystem.architecture.services.join(", ")}</p>
                  <p className="text-xs text-zinc-300"><strong>Databases:</strong> {explainerSystem.architecture.databases.join(", ")}</p>
                  <p className="text-xs text-zinc-400 font-mono">Memory: {explainerSystem.architecture.memoryLimitMb}MB · Storage: {explainerSystem.architecture.storageQuotaGb}GB</p>
                </div>

                {/* Knowledge Base & RAG */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="size-4 text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Knowledge Base & RAG</span>
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Domain:</strong> {explainerSystem.knowledgeBase.domain}</p>
                  <p className="text-xs text-zinc-300"><strong>Data Sources:</strong> {explainerSystem.knowledgeBase.dataSources.slice(0, 3).join(", ")}</p>
                  <p className="text-xs text-zinc-300"><strong>Chunking:</strong> {explainerSystem.knowledgeBase.chunkingStrategy}</p>
                  <p className="text-xs text-zinc-400 font-mono">Top-K: {explainerSystem.knowledgeBase.retrievalTopK} · Threshold: {Math.round(explainerSystem.knowledgeBase.groundingThreshold * 100)}%</p>
                </div>

                {/* Specialized Agents */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-4 text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Specialized Autonomous Agents ({explainerSystem.agents.length})</span>
                  </div>
                  {explainerSystem.agents.map((ag) => (
                    <div key={ag.id} className="rounded-xl bg-black/40 border border-white/5 p-2 text-xs">
                      <p className="font-bold text-white">{ag.name} ({ag.role})</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Model: {ag.modelTarget} · Focus: {ag.specialization}</p>
                    </div>
                  ))}
                </div>

                {/* Operational Workflows */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Operational Workflows</span>
                  </div>
                  {explainerSystem.workflows.map((wf) => (
                    <div key={wf.id} className="rounded-xl bg-black/40 border border-white/5 p-2 text-xs">
                      <p className="font-bold text-white">{wf.name} ({wf.trigger})</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Steps: {wf.steps.join(" → ")}</p>
                      {wf.approvalGates.length > 0 && (
                        <p className="text-[10px] text-amber-300 mt-1">Approval Gate: {wf.approvalGates.join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Security & RBAC */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-red-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-red-400">Security & Isolation</span>
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Isolation:</strong> {explainerSystem.security.tenantIsolation}</p>
                  <p className="text-xs text-zinc-300"><strong>Authentication:</strong> {explainerSystem.security.authentication}</p>
                  <p className="text-xs text-zinc-300"><strong>RBAC:</strong> {explainerSystem.security.rbacRoles.join(", ")}</p>
                  <p className="text-[11px] text-emerald-400">Audit Trail: SHA-256 Cryptographically Sealed</p>
                </div>

                {/* Evaluation & Accuracy */}
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">Reliability & Accuracy</span>
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Target Score:</strong> &gt;= {explainerSystem.evaluation.benchmarkScoreTarget}%</p>
                  <p className="text-xs text-zinc-300"><strong>Measured Accuracy:</strong> <span className="text-emerald-400 font-bold">{explainerSystem.evaluation.measuredAccuracy}%</span></p>
                  <p className="text-xs text-zinc-400">Suites: {explainerSystem.evaluation.testSuites.join(", ")}</p>
                </div>

              </div>

            </div>

            {/* Pop-up Footer Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#16161d] px-6 py-4">
              <button
                type="button"
                onClick={() => setExplainerSystem(null)}
                className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white transition cursor-pointer"
              >
                Close Pop-up
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSystemId(explainerSystem.identity.id);
                    setActiveTab("inspector");
                    setExplainerSystem(null);
                  }}
                  className="rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 px-3.5 py-2 text-xs font-bold text-sky-300 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="size-3.5" />
                  <span>Inspect Full 11-D Blueprint</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSystemId(explainerSystem.identity.id);
                    setActiveTab("lifecycle");
                    setExplainerSystem(null);
                  }}
                  className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1.5"
                >
                  <Terminal className="size-3.5" />
                  <span>Lifecycle</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSystemId(explainerSystem.identity.id);
                    setActiveTab("bus");
                    setExplainerSystem(null);
                  }}
                  className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="size-3.5" />
                  <span>Bus</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sys = explainerSystem;
                    setExplainerSystem(null);
                    handleBuildSystem(sys);
                  }}
                  className="rounded-xl bg-[#e4b86a] hover:bg-amber-400 text-black px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Play className="size-3 fill-current" />
                  <span>Build in Forge</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
