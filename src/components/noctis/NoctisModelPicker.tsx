"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Brain,
  Shield,
  DollarSign,
  BookOpen,
  ChevronDown,
  Check,
  Scale,
  Stethoscope,
  Terminal,
  Globe,
  Lock,
  Search,
  Cpu,
  EyeOff,
  Boxes,
  Zap,
  Activity,
  Crosshair,
  Network,
  FileLock,
  Users2,
  WifiOff,
  Swords,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SovereignEngineKey } from "@/components/noctis/NoctisCapabilityMatrixModal";

export type ModelCategory = "frontier" | "specialist" | "workspace" | "suite";

export interface ModelOption {
  id: string;
  name: string;
  badge: string;
  category: ModelCategory;
  categoryLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  deskTarget?: "chat" | "study" | "forge" | "plugins" | "console" | "redteam";
  engineTarget?: SovereignEngineKey;
}

export const NOCTIS_MODELS: ModelOption[] = [
  // ==========================================
  // FRONTIER & SOVEREIGN INTELLIGENCE ENGINES
  // ==========================================
  {
    id: "noctis-ultra",
    name: "Noctis Ultra",
    badge: "Default",
    category: "frontier",
    categoryLabel: "Frontier Models",
    description: "Multimodal frontier model. Ultra-fast, comprehensive, and context-aware sovereign core.",
    icon: Sparkles,
    accentColor: "text-[#e4b86a]",
  },
  {
    id: "noctis-o3-deep",
    name: "Noctis Deep Thinking",
    badge: "o1/o3 Proofs",
    category: "frontier",
    categoryLabel: "Frontier Models",
    description: "Multi-pass chain of thought, rigorous mathematical logic & counter-example search.",
    icon: Brain,
    accentColor: "text-sky-400",
  },
  {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet",
    badge: "Hybrid Thinking",
    category: "frontier",
    categoryLabel: "Frontier Models",
    description: "Anthropic's premier hybrid reasoning and deep architectural code synthesis engine.",
    icon: Zap,
    accentColor: "text-amber-400",
  },
  {
    id: "gpt-4o",
    name: "ChatGPT / GPT-4o",
    badge: "OpenAI Multimodal",
    category: "frontier",
    categoryLabel: "Frontier Models",
    description: "OpenAI flagship multimodal intelligence for rapid comprehension and reasoning.",
    icon: Sparkles,
    accentColor: "text-emerald-400",
  },
  {
    id: "gemini-2-flash",
    name: "Gemini 2.0 Flash",
    badge: "Google DeepMind",
    category: "frontier",
    categoryLabel: "Frontier Models",
    description: "2M context window with Google web grounding, ultra-low latency & deep multimodal parsing.",
    icon: Globe,
    accentColor: "text-blue-400",
  },
  {
    id: "grok-3",
    name: "xAI Grok 3",
    badge: "Frontier Deductive",
    category: "frontier",
    categoryLabel: "Frontier Models",
    description: "Uncensored frontier scientific reasoning, telemetry analysis & real-time search.",
    icon: Cpu,
    accentColor: "text-purple-400",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    badge: "Open Reasoning",
    category: "frontier",
    categoryLabel: "Frontier Models",
    description: "Advanced open-weights reasoning model with step-by-step chain of thought verification.",
    icon: Brain,
    accentColor: "text-cyan-400",
  },
  {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B",
    badge: "Groq 500 tok/s",
    category: "frontier",
    categoryLabel: "Frontier Models",
    description: "Ultra-fast sovereign edge reasoning powered by Groq LPU inference hardware.",
    icon: Terminal,
    accentColor: "text-orange-400",
  },

  // ==========================================
  // DOMAIN SPECIALIST ENGINES
  // ==========================================
  {
    id: "noctis-cyber-dfir",
    name: "XTRIKE Cyber DFIR",
    badge: "401 SAST Rules",
    category: "specialist",
    categoryLabel: "Specialist Engines",
    description: "Vulnerability intelligence, attack-path graphs, SAST triage & red team simulations.",
    icon: Shield,
    accentColor: "text-rose-400",
  },
  {
    id: "noctis-juris-law",
    name: "Noctis Juris & Law",
    badge: "Bar & Doctrine",
    category: "specialist",
    categoryLabel: "Specialist Engines",
    description: "Bar examination analysis, IRAC legal memoranda, statutory interpretation & compliance.",
    icon: Scale,
    accentColor: "text-amber-300",
  },
  {
    id: "noctis-clinical-dx",
    name: "Noctis Clinical DX",
    badge: "Physician Board",
    category: "specialist",
    categoryLabel: "Specialist Engines",
    description: "Physician-grade clinical diagnostic reasoning, board vignette analysis & pharmacology.",
    icon: Stethoscope,
    accentColor: "text-red-400",
  },
  {
    id: "noctis-invest-alpha",
    name: "Investment Alpha",
    badge: "SEC EDGAR",
    category: "specialist",
    categoryLabel: "Specialist Engines",
    description: "10-K/10-Q filings, ASC 606 revenue, working capital & DCF financial models.",
    icon: DollarSign,
    accentColor: "text-emerald-400",
  },
  {
    id: "noctis-theology-exegesis",
    name: "Bible & Exegesis",
    badge: "Greek & Hebrew",
    category: "specialist",
    categoryLabel: "Specialist Engines",
    description: "Historical-grammatical context, morphological lexicons & expository sermon outlines.",
    icon: BookOpen,
    accentColor: "text-amber-400",
  },

  // ==========================================
  // WORKSPACES & DESKS ("THE REST")
  // ==========================================
  {
    id: "desk-forge",
    name: "Noctis Forge",
    badge: "ARCHITECT",
    category: "workspace",
    categoryLabel: "Workspaces",
    description: "Visual full-stack software development environment, code architect & compiler.",
    icon: Terminal,
    accentColor: "text-amber-400",
    deskTarget: "forge",
  },
  {
    id: "desk-console",
    name: "Developer Console",
    badge: "GATEWAY",
    category: "workspace",
    categoryLabel: "Workspaces",
    description: "Live API gateway telemetry, health monitoring, runtime logs & system endpoints.",
    icon: Activity,
    accentColor: "text-emerald-400",
    deskTarget: "console",
  },
  {
    id: "desk-plugins",
    name: "Plugins & Systems",
    badge: "50+ CONNECTORS",
    category: "workspace",
    categoryLabel: "Workspaces",
    description: "Enterprise database, cloud, Git, analytics, and productivity connectors.",
    icon: Boxes,
    accentColor: "text-cyan-400",
    deskTarget: "plugins",
  },
  {
    id: "desk-redteam",
    name: "AI Red Team & Threat Matrix",
    badge: "SHIELD",
    category: "workspace",
    categoryLabel: "Workspaces",
    description: "OWASP GenAI Top 10 automated sandbox prober & model robustness matrix.",
    icon: Shield,
    accentColor: "text-rose-400",
    deskTarget: "redteam",
  },

  // ==========================================
  // SOVEREIGN SUITES (16 ENGINES)
  // ==========================================
  {
    id: "suite-canary",
    name: "Canary Deception",
    badge: "TRIPWIRE",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Deceptive honeypots and synthetic canary tokens for early adversarial intrusion detection.",
    icon: EyeOff,
    accentColor: "text-amber-400",
    engineTarget: "canary",
  },
  {
    id: "suite-war-room",
    name: "War Room Sandbox",
    badge: "CRISIS",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "High-stakes collaborative crisis simulation and incident command center.",
    icon: Crosshair,
    accentColor: "text-rose-400",
    engineTarget: "war_room",
  },
  {
    id: "suite-digital-twin",
    name: "Digital Twin",
    badge: "PREDICTIVE",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Dynamic infrastructure topology modeling, anomaly forecasting & resilience stress tests.",
    icon: Network,
    accentColor: "text-cyan-400",
    engineTarget: "digital_twin",
  },
  {
    id: "suite-pqc",
    name: "PQC Kyber Shield",
    badge: "KYBER-1024",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Post-quantum cryptographic migration audit and quantum-safe key exchange.",
    icon: Lock,
    accentColor: "text-blue-400",
    engineTarget: "pqc",
  },
  {
    id: "suite-holodeck",
    name: "3D Holodeck",
    badge: "SPATIAL",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Spatial situational awareness, topological mapping & system dossiers.",
    icon: Globe,
    accentColor: "text-purple-400",
    engineTarget: "holodeck",
  },
  {
    id: "suite-remediation",
    name: "Auto-Remediation",
    badge: "PLAYBOOKS",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Automated self-healing infrastructure runbooks and zero-touch incident remediation.",
    icon: Zap,
    accentColor: "text-emerald-400",
    engineTarget: "auto_remediation",
  },
  {
    id: "suite-truth-ledger",
    name: "Truth Ledger",
    badge: "SHA-256",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Cryptographically sealed, append-only immutable audit trail and verification hash.",
    icon: FileLock,
    accentColor: "text-amber-400",
    engineTarget: "truth_ledger",
  },
  {
    id: "suite-zk-proof",
    name: "Zero-Knowledge Proofs",
    badge: "zk-SNARKs",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Verifiable computation and identity claims without underlying data disclosure.",
    icon: Shield,
    accentColor: "text-indigo-400",
    engineTarget: "zk_proof",
  },
  {
    id: "suite-swarm",
    name: "Swarm Orchestrator",
    badge: "MULTI-AGENT",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Autonomous agent swarm coordination, task decomposition and parallel execution.",
    icon: Users2,
    accentColor: "text-teal-400",
    engineTarget: "work_swarm",
  },
  {
    id: "suite-air-gap",
    name: "Air-Gap Protocol",
    badge: "OFFLINE",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Zero-outbound strict offline perimeter for classified and sovereign operations.",
    icon: WifiOff,
    accentColor: "text-red-400",
    engineTarget: "air_gap",
  },
  {
    id: "suite-circuit-breaker",
    name: "Circuit Breaker",
    badge: "SAFETY VETO",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Non-compensatory automated safety barriers and algorithmic kill-switches.",
    icon: Activity,
    accentColor: "text-yellow-400",
    engineTarget: "circuit_breaker",
  },
  {
    id: "suite-enclave",
    name: "Enclave Attestation",
    badge: "CONFIDENTIAL",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Hardware-enforced secure enclaves (SGX/SEV) and remote cryptographic attestation.",
    icon: Lock,
    accentColor: "text-green-400",
    engineTarget: "enclave",
  },
  {
    id: "suite-cognitive",
    name: "Cognitive Bias Sandbox",
    badge: "EPISTEMIC",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Stress-tests assumptions against 24 cognitive biases and reasoning traps.",
    icon: Brain,
    accentColor: "text-pink-400",
    engineTarget: "cognitive_sandbox",
  },
  {
    id: "suite-crisis",
    name: "Crisis Negotiation",
    badge: "BEHAVIORAL",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Tactical negotiation modeling, sentiment de-escalation & crisis playbooks.",
    icon: Swords,
    accentColor: "text-orange-400",
    engineTarget: "crisis_negotiation",
  },
  {
    id: "suite-steganography",
    name: "Steganography Forensics",
    badge: "FORENSIC",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Covert payload extraction, forensic watermark verification & deep analysis.",
    icon: EyeOff,
    accentColor: "text-violet-400",
    engineTarget: "steganography",
  },
  {
    id: "suite-lex",
    name: "Lex Synthesizer",
    badge: "REGULATORY",
    category: "suite",
    categoryLabel: "Sovereign Suites",
    description: "Cross-jurisdiction regulatory harmonization and statutory conflict mapping.",
    icon: Scale,
    accentColor: "text-amber-300",
    engineTarget: "lex_synthesizer",
  },
];

interface NoctisModelPickerProps {
  currentModelId?: string;
  onModelSelect?: (modelId: string) => void;
  onOpenBrainModal?: () => void;
  onSelectDesk?: (desk: "chat" | "study" | "forge" | "plugins" | "console" | "redteam") => void;
  onSelectEngine?: (key: SovereignEngineKey) => void;
  onOpenCapabilities?: () => void;
}

export function NoctisModelPicker({
  currentModelId,
  onModelSelect,
  onOpenBrainModal,
  onSelectDesk,
  onSelectEngine,
  onOpenCapabilities,
}: NoctisModelPickerProps) {
  const [activeModel, setActiveModel] = useState("noctis-ultra");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "models" | "workspaces" | "suites">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("noctis_active_model");
      if (stored && NOCTIS_MODELS.some((m) => m.id === stored)) {
        setActiveModel(stored);
      }
    }
  }, []);

  const selected = NOCTIS_MODELS.find((m) => m.id === (currentModelId || activeModel)) || NOCTIS_MODELS[0];
  const Icon = selected.icon;

  function handleItemClick(item: ModelOption) {
    if (item.category === "workspace" && item.deskTarget && onSelectDesk) {
      onSelectDesk(item.deskTarget);
      setDropdownOpen(false);
      return;
    }

    if (item.category === "suite" && item.engineTarget && onSelectEngine) {
      onSelectEngine(item.engineTarget);
      setDropdownOpen(false);
      return;
    }

    // Default to model selection
    setActiveModel(item.id);
    if (typeof window !== "undefined") localStorage.setItem("noctis_active_model", item.id);
    if (onModelSelect) onModelSelect(item.id);
    setDropdownOpen(false);
  }

  // Filter items
  const filtered = NOCTIS_MODELS.filter((item) => {
    // Tab filter
    if (filterTab === "models" && item.category !== "frontier" && item.category !== "specialist") {
      return false;
    }
    if (filterTab === "workspaces" && item.category !== "workspace") {
      return false;
    }
    if (filterTab === "suites" && item.category !== "suite") {
      return false;
    }

    // Query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.categoryLabel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#252525] px-3 py-1 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-white"
        aria-expanded={dropdownOpen}
        title="Select Intelligence Engine, Sovereign Workspace or Suite"
      >
        <Icon className={cn("size-3.5", selected.accentColor)} />
        <span className="font-semibold text-zinc-100">{selected.name}</span>
        <span className="hidden sm:inline text-[10px] rounded bg-white/10 px-1.5 py-0.5 text-zinc-400 font-medium">
          {selected.badge}
        </span>
        <ChevronDown className="size-3 text-zinc-400" />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-80 sm:w-96 overflow-hidden rounded-2xl border border-white/12 bg-[#1b1b1b] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
            {/* Header with Title and Search Input */}
            <div className="pb-2 border-b border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[#e4b86a]" />
                  <span>Intelligence Engines & Systems</span>
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  {filtered.length} available
                </span>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter models, workspaces, and suites..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 pl-8 pr-7 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#e4b86a]/60 focus:outline-none"
                  autoFocus
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition shrink-0",
                    filterTab === "all"
                      ? "bg-[#e4b86a] text-[#1a1408]"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                  )}
                >
                  All ({NOCTIS_MODELS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("models")}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition shrink-0",
                    filterTab === "models"
                      ? "bg-[#e4b86a] text-[#1a1408]"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                  )}
                >
                  Models (13)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("workspaces")}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition shrink-0",
                    filterTab === "workspaces"
                      ? "bg-[#e4b86a] text-[#1a1408]"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                  )}
                >
                  Workspaces (4)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("suites")}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition shrink-0",
                    filterTab === "suites"
                      ? "bg-[#e4b86a] text-[#1a1408]"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                  )}
                >
                  Suites (16)
                </button>
              </div>
            </div>

            {/* List of Models, Workspaces, and Suites */}
            <div className="mt-2 space-y-1 max-h-72 overflow-y-auto pr-1 no-scrollbar">
              {filtered.map((item) => {
                const isCurrent = item.id === selected.id;
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl p-2 text-left text-xs transition",
                      isCurrent
                        ? "bg-[#e4b86a]/15 text-white ring-1 ring-[#e4b86a]/40"
                        : "text-zinc-300 hover:bg-white/5"
                    )}
                  >
                    <div className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-black/40", item.accentColor)}>
                      <ItemIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-zinc-100 truncate">{item.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] rounded bg-white/10 px-1.5 py-0.5 font-medium text-zinc-400">
                            {item.badge}
                          </span>
                          {isCurrent && <Check className="size-3 text-[#e4b86a]" />}
                        </div>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-zinc-400 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No matching engines or systems found.
                </div>
              )}
            </div>

            {/* Dropdown Quick Action Footer */}
            <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onOpenBrainModal) onOpenBrainModal();
                }}
                className="flex items-center justify-between gap-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-2 text-[11px] font-semibold text-emerald-300 transition"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Brain className="size-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Brain (BYOK)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onOpenCapabilities) onOpenCapabilities();
                }}
                className="flex items-center justify-between gap-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 p-2 text-[11px] font-semibold text-amber-300 transition"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Cpu className="size-3 text-amber-400 shrink-0" />
                  <span className="truncate">16 Capabilities</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
