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

interface UnifiedDeepDive {
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  summary: string;
  operationalImpact?: string;
  keyPoints: { label: string; value: string | string[] }[];
  tags?: string[];
  actionLabel?: string;
  onAction?: () => void;
}

export function NoctisSovereignFactoryStudio({
  isOpen,
  onClose,
  onSelectSystem,
}: NoctisSovereignFactoryStudioProps) {
  const [systems, setSystems] = useState<SovereignSystem[]>(listSovereignSystems());
  const [selectedSystemId, setSelectedSystemId] = useState<string>("noctis-cyber");
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>("All");
  const [activeTab, setActiveTab] = useState<"matrix" | "inspector" | "architecture" | "lifecycle" | "bus" | "templates">("matrix");
  
  // Unified Deep Dive Modal State (Applies across Matrix, Inspector, Architecture, Lifecycle, Bus, Templates)
  const [activeDeepDive, setActiveDeepDive] = useState<UnifiedDeepDive | null>(null);

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
        if (activeDeepDive) {
          setActiveDeepDive(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, activeDeepDive]);

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

  const openSystemDeepDive = (sys: SovereignSystem) => {
    const expl = NOCTIS_SYSTEM_EXPLANATIONS[sys.identity.id] || {
      summary: sys.identity.purpose,
      operationalImpact: `Autonomous execution in ${sys.identity.category} domain with calibrated invariants.`,
      coreCapabilities: sys.capabilities.map((c) => c.name),
    };
    setActiveDeepDive({
      title: sys.identity.name,
      subtitle: `${sys.identity.category} · v${sys.identity.version} · ${sys.identity.owner}`,
      badge: typeof sys.priorityRank === "number" ? `Priority ${sys.priorityRank}` : sys.deployment.status.toUpperCase(),
      badgeColor: typeof sys.priorityRank === "number" ? "rose" : "emerald",
      summary: expl.summary,
      operationalImpact: expl.operationalImpact,
      tags: expl.coreCapabilities,
      keyPoints: [
        { label: "Runtime Enclave", value: sys.architecture.runtime },
        { label: "Microservices", value: sys.architecture.services.join(", ") },
        { label: "Databases", value: sys.architecture.databases.join(", ") },
        { label: "Memory Limit", value: `${sys.architecture.memoryLimitMb}MB` },
        { label: "Storage Quota", value: `${sys.architecture.storageQuotaGb}GB` },
        { label: "RAG Domain", value: sys.knowledgeBase.domain },
        { label: "RAG Sources", value: sys.knowledgeBase.dataSources.join(", ") },
        { label: "Grounding Threshold", value: `${Math.round(sys.knowledgeBase.groundingThreshold * 100)}%` },
        { label: "Specialized Agents", value: sys.agents.map((a) => `${a.name} (${a.role})`).join("; ") },
        { label: "Workflows", value: sys.workflows.map((w) => `${w.name} [Gates: ${w.approvalGates.join(", ") || "None"}]`).join("; ") },
        { label: "Security & Isolation", value: `${sys.security.tenantIsolation} · ${sys.security.authentication} · SHA-256 Sealed` },
        { label: "Measured Accuracy", value: `${sys.evaluation.measuredAccuracy}% (Target: >=${sys.evaluation.benchmarkScoreTarget}%)` },
      ],
      actionLabel: "Build in Forge",
      onAction: () => handleBuildSystem(sys),
    });
  };

  const openDimensionDeepDive = (dimensionNumber: number, dimensionName: string, sys: SovereignSystem) => {
    let summary = "";
    let operationalImpact = "";
    let keyPoints: { label: string; value: string | string[] }[] = [];

    switch (dimensionNumber) {
      case 1:
        summary = `Dimension 1 defines the sovereign identity boundaries of ${sys.identity.name}, establishing owner authority, immutable identifier (${sys.identity.id}), semantic versioning (v${sys.identity.version}), and core domain purpose.`;
        operationalImpact = "Enforces non-overlapping tenancy, cryptographic identity attestation, and governance lineage across sovereign execution.";
        keyPoints = [
          { label: "System ID", value: sys.identity.id },
          { label: "Owner Authority", value: sys.identity.owner },
          { label: "Version Semantics", value: `v${sys.identity.version}` },
          { label: "Domain Category", value: sys.identity.category },
          { label: "Core Purpose", value: sys.identity.purpose },
        ];
        break;
      case 2:
        summary = `Dimension 2 establishes the isolated compute enclave, multi-service topologies, state persistence engines, and hardware resource boundaries for ${sys.identity.name}.`;
        operationalImpact = "Provides zero-trust compute isolation with guaranteed memory and storage allocations, preventing noisy-neighbor interference and memory leakage.";
        keyPoints = [
          { label: "Runtime Environment", value: sys.architecture.runtime },
          { label: "Dedicated Microservices", value: sys.architecture.services },
          { label: "State Databases", value: sys.architecture.databases },
          { label: "Memory Allocation", value: `${sys.architecture.memoryLimitMb} MB dedicated RAM` },
          { label: "Storage Quota", value: `${sys.architecture.storageQuotaGb} GB encrypted volume` },
        ];
        break;
      case 3:
        summary = `Dimension 3 configures the domain-specific Retrieval-Augmented Generation (RAG) pipeline for ${sys.identity.name}, detailing authoritative data corpora, semantic chunking, and strict grounding cutoffs.`;
        operationalImpact = "Guarantees that all generative reasoning is strictly anchored in vetted domain literature, mathematically eliminating hallucination and unprovided fact fabrication.";
        keyPoints = [
          { label: "Domain Scope", value: sys.knowledgeBase.domain },
          { label: "Authoritative Sources", value: sys.knowledgeBase.dataSources },
          { label: "Semantic Chunking", value: sys.knowledgeBase.chunkingStrategy },
          { label: "Top-K Context Window", value: `${sys.knowledgeBase.retrievalTopK} vectors` },
          { label: "Grounding Threshold", value: `${Math.round(sys.knowledgeBase.groundingThreshold * 100)}% non-compensatory` },
        ];
        break;
      case 4:
        summary = `Dimension 4 registers the professional tools, mathematical solvers, and specialized capabilities accessible to ${sys.identity.name}.`;
        operationalImpact = "Empowers autonomous agents to invoke verified deterministic tools with typed interfaces and bounded execution timeouts.";
        keyPoints = sys.capabilities.map((c) => ({
          label: c.name,
          value: `${c.description} [Execution: ${c.toolType}, Timeout: ${c.executionTimeoutMs}ms]`,
        }));
        break;
      case 5:
        summary = `Dimension 5 details the autonomous multi-agent hierarchy operating within ${sys.identity.name}, including model targets, cognitive roles, and specific domain specializations.`;
        operationalImpact = "Enables multi-agent collaboration and peer verification, ensuring that complex multi-step reasoning is partitioned among dedicated specialists.";
        keyPoints = sys.agents.map((a) => ({
          label: `${a.name} (${a.role})`,
          value: `Model: ${a.modelTarget} | Focus: ${a.specialization} | Autonomy: ${a.permissions.join(", ")}`,
        }));
        break;
      case 6:
        summary = `Dimension 6 formalizes the operational processes, step-by-step execution pipelines, and mandatory human-in-the-loop approval gates for ${sys.identity.name}.`;
        operationalImpact = "Guarantees deterministic lifecycle progression and prevents autonomous action on sensitive assets without cryptographic sign-off from designated authorities.";
        keyPoints = sys.workflows.map((w) => ({
          label: `${w.name} (${w.trigger})`,
          value: `Pipeline: ${w.steps.join(" → ")} | Mandatory Approval Gate: ${w.approvalGates.join(", ") || "Autonomous"}`,
        }));
        break;
      case 7:
        summary = `Dimension 7 establishes the dedicated user interaction surfaces for ${sys.identity.name}, configuring Chat, Board, and Canvas interfaces with custom visual telemetry widgets.`;
        operationalImpact = "Provides tailored user experiences for distinct operational roles, seamlessly integrating real-time charts, AST taint graphs, OSCAL radars, and DCF grids.";
        keyPoints = [
          { label: "Default Surface View", value: sys.interface.defaultView },
          { label: "Supported Surfaces", value: [sys.interface.hasChat && "Chat", sys.interface.hasBoard && "Board", sys.interface.hasCanvas && "Canvas"].filter(Boolean).join(", ") },
          { label: "Custom Telemetry Widgets", value: sys.interface.customWidgets },
        ];
        break;
      case 8:
        summary = `Dimension 8 defines the security architecture, zero-compromise tenant isolation, cryptographic identity verification, and SHA-256 audit trail attestation for ${sys.identity.name}.`;
        operationalImpact = "Enforces defense-in-depth isolation, strict RBAC authorization, and tamper-proof ledger logging for every action, query, and state transition.";
        keyPoints = [
          { label: "Tenant Isolation", value: sys.security.tenantIsolation },
          { label: "Authentication Provider", value: sys.security.authentication },
          { label: "RBAC Roles", value: sys.security.rbacRoles },
          { label: "Cryptographic Audit", value: "Active (SHA-256 Sealed Continuous Hash Chain)" },
        ];
        break;
      case 9:
        summary = `Dimension 9 specifies the persistent cognitive memory architecture for ${sys.identity.name}, setting context window size, underlying storage technology, and decay policies.`;
        operationalImpact = "Maintains longitudinal cross-session coherence while strategically pruning stale or contradictory context to prevent hallucination.";
        keyPoints = [
          { label: "Persistent Context Window", value: `${sys.memory.persistentContextWindow.toLocaleString()} tokens` },
          { label: "Storage Engine", value: sys.memory.storageEngine },
          { label: "Memory Decay Policy", value: sys.memory.decayPolicy },
        ];
        break;
      case 10:
        summary = `Dimension 10 establishes the empirical evaluation benchmarks, regression test suites, and target accuracy gates for ${sys.identity.name}.`;
        operationalImpact = "Prevents regressions and verifies that production performance meets or exceeds strict domain acceptance thresholds before any deployment release.";
        keyPoints = [
          { label: "Measured Benchmark Accuracy", value: `${sys.evaluation.measuredAccuracy}%` },
          { label: "Target Gate Score", value: `>= ${sys.evaluation.benchmarkScoreTarget}%` },
          { label: "Automated Test Suites", value: sys.evaluation.testSuites },
        ];
        break;
      case 11:
        summary = `Dimension 11 governs the production deployment environment, container replica configuration, high-availability uptime SLA, and automated health probing for ${sys.identity.name}.`;
        operationalImpact = "Ensures high availability, fault tolerance, and zero-downtime operations with automated health probes and rapid recovery capabilities.";
        keyPoints = [
          { label: "Target Environment", value: sys.deployment.environment },
          { label: "Live Deployment Status", value: sys.deployment.status.toUpperCase() },
          { label: "Container Replicas", value: `${sys.deployment.replicas} active nodes` },
          { label: "Uptime Availability SLA", value: `${sys.deployment.uptimePercentage}%` },
          { label: "Health Probe Endpoint", value: sys.deployment.healthEndpoint },
        ];
        break;
      default:
        break;
    }

    setActiveDeepDive({
      title: `${dimensionNumber}. ${dimensionName}`,
      subtitle: `${sys.identity.name} · Dimension Blueprint`,
      badge: `Dimension ${dimensionNumber}/11`,
      badgeColor: "sky",
      summary,
      operationalImpact,
      keyPoints,
      actionLabel: "Inspect in Matrix",
      onAction: () => {
        setActiveDeepDive(null);
        setActiveTab("matrix");
      },
    });
  };

  const openLayerDeepDive = (layer: typeof FACTORY_FIVE_LAYERS[number]) => {
    setActiveDeepDive({
      title: `Layer ${layer.layerNumber} — ${layer.layerName}`,
      subtitle: `Sovereign Systems Factory · Top-to-Bottom Architecture`,
      badge: `Layer ${layer.layerNumber}`,
      badgeColor: "purple",
      summary: layer.description,
      operationalImpact: `Guarantees sovereign integrity at Layer ${layer.layerNumber}, ensuring clean separation of concerns and immutable boundary enforcement.`,
      tags: layer.components,
      keyPoints: [
        { label: "Layer Designation", value: `Layer ${layer.layerNumber} of 5` },
        { label: "Primary Architecture Role", value: layer.tagline },
        { label: "Core Subsystems", value: layer.components },
      ],
      actionLabel: "View Systems Matrix",
      onAction: () => {
        setActiveDeepDive(null);
        setActiveTab("matrix");
      },
    });
  };

  const openAgentDeepDive = (agent: (typeof ENTERPRISE_FABRIC_ORCHESTRATION.orchestrationLayer.agents)[number]) => {
    setActiveDeepDive({
      title: agent.name,
      subtitle: `Enterprise Orchestration Fabric · Autonomous Agent`,
      badge: agent.role,
      badgeColor: "indigo",
      summary: `${agent.name} is an autonomous specialized agent operating within the Enterprise Orchestration Layer, executing high-conviction workflows in ${agent.focus}.`,
      operationalImpact: `Connects directly to ingestion touchpoints, interacts with core enterprise databases, and enforces designated approval thresholds.`,
      keyPoints: [
        { label: "Agent Designation", value: agent.name },
        { label: "Operational Role", value: agent.role },
        { label: "Domain Focus", value: agent.focus },
        { label: "Orchestration Functions", value: ENTERPRISE_FABRIC_ORCHESTRATION.orchestrationLayer.coreFunctions },
      ],
      tags: ENTERPRISE_FABRIC_ORCHESTRATION.toolsAndServices.slice(0, 4),
      actionLabel: "View Architecture",
      onAction: () => {
        setActiveDeepDive(null);
        setActiveTab("architecture");
      },
    });
  };

  const openLifecycleDeepDive = (action: LifecycleAction) => {
    const descriptions: Record<LifecycleAction, { desc: string; transition: string; gates: string }> = {
      CREATE: { desc: "Instantiates system manifest, registers identity, assigns tenant IDs, and allocates isolated enclave memory.", transition: "DRAFT → INITIALIZED", gates: "System Registry Schema Validation" },
      CONFIGURE: { desc: "Applies environment variables, fine-tunes RAG thresholds, configures RBAC policies, and mounts encrypted storage volumes.", transition: "INITIALIZED → CONFIGURED", gates: "Configuration Integrity Check" },
      TEST: { desc: "Executes automated unit and integration suites, measuring regression preservation and benchmark target alignment.", transition: "CONFIGURED → TESTED", gates: "100% Invariant Test Pass Rate" },
      VALIDATE: { desc: "Enforces hard-fail invariant checks, boundary validation, and security compliance attestations.", transition: "TESTED → VALIDATED", gates: "Non-Compensatory Compliance Attestation" },
      DEPLOY: { desc: "Spins up live enclave replicas, mounts persistent databases, and establishes low-latency event bus endpoints.", transition: "VALIDATED → DEPLOYED (RUNNING)", gates: "Container Health Probe Handshake" },
      MONITOR: { desc: "Streams real-time metrics, telemetry graphs, latency measurements, and anomaly alarms.", transition: "RUNNING → MONITORED", gates: "Continuous Telemetry Heartbeat" },
      UPGRADE: { desc: "Performs blue/green zero-downtime rolling upgrades with automated rollback fallback triggers.", transition: "RUNNING → UPGRADED", gates: "Blue/Green Parity Attestation" },
      ROLLBACK: { desc: "Instantly reverts system state and binaries to previous cryptographically verified release.", transition: "DEGRADED → RESTORED", gates: "Prior Snapshot Cryptographic Verification" },
      RETIRE: { desc: "Safely drains active connections, archives persistent audit trails to SHA-256 evidence vault, and releases memory resources.", transition: "RUNNING → RETIRED", gates: "Audit Vault Final Seal" },
    };

    const d = descriptions[action];

    setActiveDeepDive({
      title: `Lifecycle Action: ${action}`,
      subtitle: `Noctis Sovereign Systems Factory · Audited Lifecycle Engine`,
      badge: "Cryptographically Audited",
      badgeColor: "amber",
      summary: d.desc,
      operationalImpact: `Guarantees deterministic, state-machine transitions across all 16 Sovereign Systems with SHA-256 cryptographic audit sealing.`,
      keyPoints: [
        { label: "Action Identifier", value: action },
        { label: "State Transition", value: d.transition },
        { label: "Verification Gate", value: d.gates },
        { label: "Audit Attestation", value: "SHA-256 Non-Repudiation Hash Chain" },
      ],
      actionLabel: `Execute ${action} on ${currentSystem.identity.name}`,
      onAction: () => {
        setActiveDeepDive(null);
        handleRunLifecycle(action);
      },
    });
  };

  const openBusDeepDive = () => {
    setActiveDeepDive({
      title: "DStrike Sovereign Interoperability Bus",
      subtitle: "Governed Sub-5ms Inter-System Event Routing Fabric",
      badge: "Sub-5ms Latency",
      badgeColor: "emerald",
      summary: "The Sovereign Interoperability Bus provides zero-trust, cryptographically signed, sub-5ms low latency event messaging between all 16 Sovereign Systems.",
      operationalImpact: "Enables autonomous task handoffs, audit attestations, clinical telemetry sharing, and risk alerts across independent systems without data leakage.",
      keyPoints: [
        { label: "Average Routing Latency", value: "1.4 ms (Zero-Trust Local Mesh)" },
        { label: "Supported Event Types", value: ["TASK_HANDOFF", "AUDIT_ATTESTATION", "CLINICAL_TELEMETRY", "RISK_ALERT", "HEALTH_CHECK"] },
        { label: "Encryption Mode", value: "AES-256-GCM + Post-Quantum Lattice Signing" },
        { label: "Isolation Protocol", value: "Zero-Knowledge Inter-System Gateway" },
      ],
      tags: ["Sub-5ms", "PQC-Ready", "Zero-Trust", "SHA-256 Audit"],
      actionLabel: "Send Event to RMF/GRC",
      onAction: () => {
        setActiveDeepDive(null);
        handleDispatchBusEvent("noctis-rmf");
      },
    });
  };

  const openTemplateDeepDive = (tpl: typeof REUSABLE_SYSTEM_TEMPLATES[number]) => {
    setActiveDeepDive({
      title: `Domain Template: ${tpl.name}`,
      subtitle: `Archetype: ${tpl.archetype} · Noctis Systems Factory`,
      badge: tpl.archetype,
      badgeColor: "teal",
      summary: tpl.description,
      operationalImpact: `Provides an end-to-end 11-dimension blueprint ready to instantiate a production-grade system with suggested runtime, memory, and database configurations.`,
      keyPoints: [
        { label: "Template Identifier", value: tpl.id },
        { label: "Archetype Category", value: tpl.archetype },
        { label: "Suggested Runtime", value: tpl.suggestedRuntime },
        { label: "Context Memory Tier", value: `${(tpl.memoryTier / 1000).toFixed(0)}k persistent context window` },
        { label: "Pre-Configured Capabilities", value: tpl.defaultCapabilities },
      ],
      tags: tpl.defaultCapabilities,
      actionLabel: "Select Template",
      onAction: () => {
        setSelectedTemplateId(tpl.id);
        setActiveDeepDive(null);
      },
    });
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
                      onClick={() => openSystemDeepDive(sys)}
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
                                openSystemDeepDive(sys);
                              }}
                              className="rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 px-2.5 py-1 text-[11px] font-bold text-sky-300 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="size-3 text-sky-300" />
                              <span>Deep Dive</span>
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
                    onClick={() => openSystemDeepDive(currentSystem)}
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

              {/* 11 Dimensions Interactive Grid (Click ANY card for in-place deep dive) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Identity */}
                <div
                  onClick={() => openDimensionDeepDive(1, "System Identity", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-sky-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 group-hover:underline">1. System Identity</span>
                    <Sparkles className="size-3 text-sky-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Owner:</strong> {currentSystem.identity.owner}</p>
                  <p className="text-xs text-zinc-300"><strong>Version:</strong> {currentSystem.identity.version}</p>
                  <p className="text-xs text-zinc-300"><strong>Purpose:</strong> {currentSystem.identity.purpose}</p>
                  <p className="text-[10px] text-sky-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 2. Architecture */}
                <div
                  onClick={() => openDimensionDeepDive(2, "Architecture & Compute", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-purple-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 group-hover:underline">2. Architecture</span>
                    <Sparkles className="size-3 text-purple-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Runtime:</strong> {currentSystem.architecture.runtime}</p>
                  <p className="text-xs text-zinc-300"><strong>Services:</strong> {currentSystem.architecture.services.join(", ")}</p>
                  <p className="text-xs text-zinc-300"><strong>Databases:</strong> {currentSystem.architecture.databases.join(", ")}</p>
                  <p className="text-xs text-zinc-400">Memory: {currentSystem.architecture.memoryLimitMb}MB · Storage: {currentSystem.architecture.storageQuotaGb}GB</p>
                  <p className="text-[10px] text-purple-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 3. Knowledge Base */}
                <div
                  onClick={() => openDimensionDeepDive(3, "Knowledge Base & RAG", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-teal-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 group-hover:underline">3. Knowledge Base & RAG</span>
                    <Sparkles className="size-3 text-teal-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Domain:</strong> {currentSystem.knowledgeBase.domain}</p>
                  <p className="text-xs text-zinc-300"><strong>Sources:</strong> {currentSystem.knowledgeBase.dataSources.slice(0, 3).join(", ")}</p>
                  <p className="text-xs text-zinc-300"><strong>Chunking:</strong> {currentSystem.knowledgeBase.chunkingStrategy}</p>
                  <p className="text-xs text-zinc-400">Top-K: {currentSystem.knowledgeBase.retrievalTopK} · Threshold: {Math.round(currentSystem.knowledgeBase.groundingThreshold * 100)}%</p>
                  <p className="text-[10px] text-teal-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 4. Capabilities */}
                <div
                  onClick={() => openDimensionDeepDive(4, "Capabilities & Tools", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-amber-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 group-hover:underline">4. Capabilities ({currentSystem.capabilities.length})</span>
                    <Sparkles className="size-3 text-amber-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  {currentSystem.capabilities.map((c) => (
                    <div key={c.id} className="text-xs bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="font-semibold text-white">{c.name}</p>
                      <p className="text-[11px] text-zinc-400">{c.description}</p>
                    </div>
                  ))}
                  <p className="text-[10px] text-amber-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 5. Agents */}
                <div
                  onClick={() => openDimensionDeepDive(5, "Specialized Agents", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-rose-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 group-hover:underline">5. Specialized Agents ({currentSystem.agents.length})</span>
                    <Sparkles className="size-3 text-rose-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  {currentSystem.agents.map((a) => (
                    <div key={a.id} className="text-xs bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="font-semibold text-white">{a.name} ({a.role})</p>
                      <p className="text-[11px] text-zinc-400">Model: {a.modelTarget} · Focus: {a.specialization}</p>
                    </div>
                  ))}
                  <p className="text-[10px] text-rose-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 6. Workflows */}
                <div
                  onClick={() => openDimensionDeepDive(6, "Operational Workflows", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-cyan-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 group-hover:underline">6. Operational Workflows</span>
                    <Sparkles className="size-3 text-cyan-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  {currentSystem.workflows.map((w) => (
                    <div key={w.id} className="text-xs bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="font-semibold text-white">{w.name} ({w.trigger})</p>
                      <p className="text-[11px] text-zinc-400">Steps: {w.steps.join(" → ")}</p>
                      {w.approvalGates.length > 0 && (
                        <p className="text-[10px] text-amber-300 mt-1">Approval Gate: {w.approvalGates.join(", ")}</p>
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-cyan-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 7. Interface */}
                <div
                  onClick={() => openDimensionDeepDive(7, "Interface & Visualization", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-emerald-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 group-hover:underline">7. Dedicated Interface</span>
                    <Sparkles className="size-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="flex gap-2">
                    <span className={cn("px-2 py-0.5 text-[10px] rounded font-semibold", currentSystem.interface.hasChat ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500")}>Chat</span>
                    <span className={cn("px-2 py-0.5 text-[10px] rounded font-semibold", currentSystem.interface.hasBoard ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500")}>Board</span>
                    <span className={cn("px-2 py-0.5 text-[10px] rounded font-semibold", currentSystem.interface.hasCanvas ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500")}>Canvas</span>
                  </div>
                  <p className="text-xs text-zinc-300">Default View: <strong>{currentSystem.interface.defaultView}</strong></p>
                  <p className="text-xs text-zinc-400">Widgets: {currentSystem.interface.customWidgets.join(", ")}</p>
                  <p className="text-[10px] text-emerald-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 8. Security */}
                <div
                  onClick={() => openDimensionDeepDive(8, "Security & Enclave Isolation", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-red-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 group-hover:underline">8. Security & RBAC</span>
                    <Sparkles className="size-3 text-red-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Isolation:</strong> {currentSystem.security.tenantIsolation}</p>
                  <p className="text-xs text-zinc-300"><strong>Auth:</strong> {currentSystem.security.authentication}</p>
                  <p className="text-xs text-zinc-300"><strong>Roles:</strong> {currentSystem.security.rbacRoles.join(", ")}</p>
                  <p className="text-[11px] text-emerald-400">SHA-256 Audit Trail: Active</p>
                  <p className="text-[10px] text-red-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 9. Memory */}
                <div
                  onClick={() => openDimensionDeepDive(9, "Memory Architecture", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-indigo-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 group-hover:underline">9. Memory Architecture</span>
                    <Sparkles className="size-3 text-indigo-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Context Window:</strong> {currentSystem.memory.persistentContextWindow.toLocaleString()} tokens</p>
                  <p className="text-xs text-zinc-300"><strong>Storage Engine:</strong> {currentSystem.memory.storageEngine}</p>
                  <p className="text-xs text-zinc-300"><strong>Decay Policy:</strong> {currentSystem.memory.decayPolicy}</p>
                  <p className="text-[10px] text-indigo-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 10. Evaluation */}
                <div
                  onClick={() => openDimensionDeepDive(10, "Evaluation & Benchmark Accuracy", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-yellow-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 group-hover:underline">10. Evaluation & Accuracy</span>
                    <Sparkles className="size-3 text-yellow-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Target Score:</strong> &gt;= {currentSystem.evaluation.benchmarkScoreTarget}%</p>
                  <p className="text-xs text-zinc-300"><strong>Measured Accuracy:</strong> <span className="text-emerald-400 font-bold">{currentSystem.evaluation.measuredAccuracy}%</span></p>
                  <p className="text-xs text-zinc-400">Suites: {currentSystem.evaluation.testSuites.join(", ")}</p>
                  <p className="text-[10px] text-yellow-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

                {/* 11. Deployment */}
                <div
                  onClick={() => openDimensionDeepDive(11, "Deployment & Health Probes", currentSystem)}
                  className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2 cursor-pointer transition hover:border-sky-400 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 group-hover:underline">11. Deployment & Health</span>
                    <Sparkles className="size-3 text-sky-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-zinc-300"><strong>Environment:</strong> {currentSystem.deployment.environment}</p>
                  <p className="text-xs text-zinc-300"><strong>Status:</strong> <span className="text-emerald-400 font-bold">{currentSystem.deployment.status.toUpperCase()}</span></p>
                  <p className="text-xs text-zinc-300"><strong>Uptime:</strong> {currentSystem.deployment.uptimePercentage}% ({currentSystem.deployment.replicas} replicas)</p>
                  <p className="text-xs font-mono text-zinc-500">{currentSystem.deployment.healthEndpoint}</p>
                  <p className="text-[10px] text-sky-300/80 pt-1 font-medium">Click for Deep Dive →</p>
                </div>

              </div>
            </div>
          )}

          {/* TAB: 5-LAYER ARCHITECTURE & ENTERPRISE FABRIC */}
          {activeTab === "architecture" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header Dossier */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-sky-950/30 via-zinc-900 to-indigo-950/30 p-5">
                <div className="flex items-center justify-between">
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
                  <span className="text-xs text-sky-400 font-mono hidden sm:inline">Click any layer or agent for Deep Dive</span>
                </div>
              </div>

              {/* Section 1: The Five Major Layers Stack (Interactive) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">1. The Five Major Architectural Layers</h4>
                  <span className="text-[11px] text-zinc-500 font-mono">Click layer to inspect Deep Dive</span>
                </div>

                <div className="space-y-2.5">
                  {FACTORY_FIVE_LAYERS.map((l, idx) => (
                    <div key={l.layerNumber} className="space-y-2.5">
                      <div
                        onClick={() => openLayerDeepDive(l)}
                        className={cn(
                          "rounded-2xl border border-white/10 bg-gradient-to-r p-4 transition hover:border-sky-400 hover:scale-[1.005] cursor-pointer shadow-md group",
                          l.bgGradient
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-black"
                              style={{ backgroundColor: l.color }}
                            >
                              L{l.layerNumber}
                            </span>
                            <div>
                              <h5 className="text-sm font-bold text-white group-hover:text-sky-300 transition">{l.layerName}</h5>
                              <p className="text-xs font-mono font-medium" style={{ color: l.color }}>
                                {l.tagline}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-sky-400/90 group-hover:text-sky-300 flex items-center gap-1 self-start sm:self-auto">
                            <span>Deep Dive</span>
                            <ArrowRight className="size-3" />
                          </span>
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

              {/* Section 2: Enterprise Orchestration Architecture (Interactive Agents) */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">2. Enterprise Fabric & Multi-Agent Orchestration</h4>
                  <span className="text-[11px] text-emerald-400 font-mono">Click any agent for Deep Dive</span>
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

                  {/* Center: Orchestration Layer & 8 Agents (Interactive) */}
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
                      <p className="text-[11px] text-zinc-400">8 Autonomous Specialized Agents (Click to inspect):</p>
                      <div className="grid grid-cols-2 gap-2">
                        {ENTERPRISE_FABRIC_ORCHESTRATION.orchestrationLayer.agents.map((ag) => (
                          <div
                            key={ag.name}
                            onClick={() => openAgentDeepDive(ag)}
                            className="rounded-xl bg-black/60 border border-white/10 p-2.5 cursor-pointer transition hover:border-indigo-400 hover:scale-[1.02] group"
                          >
                            <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition">{ag.name}</p>
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

              {/* Action Buttons Grid (Click action or info button for Deep Dive) */}
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
                    <div key={act} className="relative group">
                      <button
                        type="button"
                        disabled={executingAction !== null}
                        onClick={() => handleRunLifecycle(act)}
                        className={cn(
                          "w-full flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer",
                          executingAction === act
                            ? "bg-sky-500/20 border-sky-400 text-sky-300 animate-pulse"
                            : "bg-black/40 border-white/10 hover:bg-white/10 hover:border-white/25 text-zinc-200"
                        )}
                      >
                        <span>{act}</span>
                      </button>
                      <button
                        type="button"
                        title={`Deep Dive on ${act}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openLifecycleDeepDive(act);
                        }}
                        className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-sky-500 text-black text-[9px] font-bold opacity-0 group-hover:opacity-100 transition cursor-pointer shadow-xs"
                      >
                        ?
                      </button>
                    </div>
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
                  Select a lifecycle action above to initiate execution and generate a cryptographic SHA-256 audit seal, or hover and click "?" for action Deep Dive.
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
                    onClick={openBusDeepDive}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition cursor-pointer"
                  >
                    <Sparkles className="size-3" />
                    <span>Explain Bus Fabric</span>
                  </button>
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

              {/* Event Stream (Interactive) */}
              <div className="rounded-2xl border border-white/10 bg-black divide-y divide-zinc-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-900/60 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Inter-System Event Stream (Click row for Deep Dive)</span>
                  <span className="text-emerald-400 font-mono">Avg Latency: 1.4ms</span>
                </div>
                {busEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={openBusDeepDive}
                    className="p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.04] transition cursor-pointer"
                  >
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

              {/* Template Selection Grid (Interactive Deep Dive) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Domain Template</span>
                  <span className="text-[11px] text-zinc-500 font-mono">Click template for Deep Dive</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {REUSABLE_SYSTEM_TEMPLATES.map((tpl) => {
                    const isSelected = tpl.id === selectedTemplateId;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => openTemplateDeepDive(tpl)}
                        className={cn(
                          "p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] group",
                          isSelected
                            ? "bg-white/[0.08] border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                            : "bg-[#141418] border-white/10 hover:bg-white/[0.04] hover:border-white/20"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition">{tpl.name}</h4>
                            <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-semibold text-zinc-300">
                              {tpl.archetype}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{tpl.description}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                          <span>Runtime: {tpl.suggestedRuntime}</span>
                          <span className="text-sky-400 group-hover:underline">Deep Dive →</span>
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

      {/* UNIFIED NOCTIS INTELLIGENCE DEEP-DIVE MODAL (NO TRANSITION TO CHAT) */}
      {activeDeepDive && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveDeepDive(null);
          }}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-sky-500/40 bg-[#0f0f14] text-white shadow-[0_0_50px_rgba(56,189,248,0.25)]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#16161d] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-black border border-sky-500/30 text-sky-400 shadow-inner">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{activeDeepDive.title}</h2>
                    {activeDeepDive.badge && (
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                        activeDeepDive.badgeColor === "emerald"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : activeDeepDive.badgeColor === "rose"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : activeDeepDive.badgeColor === "purple"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : activeDeepDive.badgeColor === "amber"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      )}>
                        {activeDeepDive.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5">{activeDeepDive.subtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDeepDive(null)}
                aria-label="Close Deep Dive"
                className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-zinc-700">
              
              {/* Executive Noctis Assessment */}
              <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/30 via-zinc-900 to-indigo-950/30 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Noctis Sovereign Deep-Dive Assessment
                  </span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                  {activeDeepDive.summary}
                </p>
                {activeDeepDive.operationalImpact && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      <strong className="text-sky-300">Operational Significance:</strong> {activeDeepDive.operationalImpact}
                    </p>
                  </div>
                )}
                {activeDeepDive.tags && activeDeepDive.tags.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Key Components & Capabilities:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDeepDive.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 text-xs text-sky-200 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="size-3 text-sky-400" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Blueprint Key Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeDeepDive.keyPoints.map((kp, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-[#141418] p-3.5 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">{kp.label}</span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {Array.isArray(kp.value) ? kp.value.join(", ") : kp.value}
                    </p>
                  </div>
                ))}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#16161d] px-6 py-4">
              <button
                type="button"
                onClick={() => setActiveDeepDive(null)}
                className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white transition cursor-pointer"
              >
                Close Deep Dive
              </button>

              {activeDeepDive.actionLabel && activeDeepDive.onAction && (
                <button
                  type="button"
                  onClick={activeDeepDive.onAction}
                  className="rounded-xl bg-[#e4b86a] hover:bg-amber-400 text-black px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Play className="size-3 fill-current" />
                  <span>{activeDeepDive.actionLabel}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
