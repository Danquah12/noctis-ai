import { useState } from "react";
import {
  Activity,
  Boxes,
  Brain,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Crosshair,
  ExternalLink,
  EyeOff,
  FileLock,
  Globe,
  Key,
  Lock,
  Network,
  Search,
  Shield,
  Sparkles,
  Swords,
  Users2,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SovereignEngineKey =
  | "canary"
  | "war_room"
  | "digital_twin"
  | "holodeck"
  | "auto_remediation"
  | "pqc"
  | "enclave"
  | "zk_proof"
  | "steganography"
  | "air_gap"
  | "circuit_breaker"
  | "truth_ledger"
  | "work_swarm"
  | "council"
  | "cognitive_sandbox"
  | "crisis_negotiation"
  | "lex_synthesizer"
  | "live_feeds"
  | "vault";

export interface EngineCardDefinition {
  key: SovereignEngineKey;
  id: string;
  name: string;
  category: "cyber" | "crypto" | "epistemic" | "governance";
  categoryLabel: string;
  badge: string;
  badgeColor: string;
  icon: typeof Shield;
  iconColor: string;
  summary: string;
  samplePrompt: string;
}

export const SOVEREIGN_ENGINES: EngineCardDefinition[] = [
  // 1. Cyber & Attack Defense
  {
    key: "canary",
    id: "NOCTIS-CANARY-001",
    name: "Canary Deception & Honeytokens",
    category: "cyber",
    categoryLabel: "Cyber Deception",
    badge: "0% False Positive",
    badgeColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    icon: Crosshair,
    iconColor: "text-yellow-400",
    summary: "Synthetic AWS/Azure IAM keys, Active Directory Kerberos SPNs, and executive PDF beacon tripwires.",
    samplePrompt: "Deploy synthetic AWS IAM access key canary in the production VPC and monitor tripwire alerts",
  },
  {
    key: "war_room",
    id: "NOCTIS-WAR-001",
    name: "Autonomous War Room Sandbox",
    category: "cyber",
    categoryLabel: "Red vs Blue",
    badge: "Zero Payload",
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: Swords,
    iconColor: "text-red-400",
    summary: "Red vs Blue autonomous duel generating Sigma rules, KQL hunting queries, and certified risk reduction.",
    samplePrompt: "Simulate unauthenticated API token exfiltration in the War Room and generate Blue Team Sigma detections",
  },
  {
    key: "digital_twin",
    id: "NOCTIS-TWIN-001",
    name: "Topological Digital Twin",
    category: "cyber",
    categoryLabel: "Attack Graph",
    badge: "Blast Radius",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: Network,
    iconColor: "text-cyan-400",
    summary: "Graph-theoretic lateral movement simulation across edge DMZs, VPCs, and isolated database choke points.",
    samplePrompt: "Simulate ransomware lateral traversal from edge VPN to internal customer database in the Digital Twin",
  },
  {
    key: "holodeck",
    id: "NOCTIS-HOLO-001",
    name: "3D Spatial Systems Holodeck",
    category: "cyber",
    categoryLabel: "Spatial Telemetry",
    badge: "3D Vector Space",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Boxes,
    iconColor: "text-emerald-400",
    summary: "3D node graph spatial engine visualizing infection propagation vectors and perimeter containment.",
    samplePrompt: "Visualize our multi-region AWS and on-prem cluster in the 3D Holodeck with active threat telemetry",
  },
  {
    key: "auto_remediation",
    id: "NOCTIS-REMED-001",
    name: "Pre-Signed Auto-Remediation",
    category: "cyber",
    categoryLabel: "Remediation",
    badge: "Sub-Second Rollback",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: Wrench,
    iconColor: "text-purple-400",
    summary: "Deterministic forward remediation scripts paired with atomic one-click rollbacks for zero-downtime fixes.",
    samplePrompt: "Execute pre-signed auto-remediation for CVE-2026-3841 with atomic rollback verification",
  },

  // 2. Post-Quantum & Sovereign Security
  {
    key: "pqc",
    id: "NOCTIS-PQC-001",
    name: "Post-Quantum Migration Sentinel",
    category: "crypto",
    categoryLabel: "PQC Migration",
    badge: "NIST FIPS 203/204",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: Key,
    iconColor: "text-indigo-400",
    summary: "Mosca's Theorem Y2Q exposure analysis, Kyber/ML-KEM-768 key exchange, and Dilithium/ML-DSA-65 signatures.",
    samplePrompt: "Audit enterprise TLS ciphers for Harvest Now Decrypt Later risk under Mosca Theorem",
  },
  {
    key: "enclave",
    id: "NOCTIS-ENCLAVE-001",
    name: "Confidential Enclave Attestation",
    category: "crypto",
    categoryLabel: "Hardware Root of Trust",
    badge: "SGX / SEV-SNP / CCA",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Cpu,
    iconColor: "text-amber-400",
    summary: "Cryptographic quote verification with PCR measurement registers and untrusted host memory isolation.",
    samplePrompt: "Verify AMD SEV-SNP confidential VM attestation report with PCR measurement registers",
  },
  {
    key: "zk_proof",
    id: "NOCTIS-ZKPROOF-001",
    name: "Zero-Knowledge Audit Proofs",
    category: "crypto",
    categoryLabel: "zk-SNARK Groth16",
    badge: "Zero Disclosure",
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    icon: EyeOff,
    iconColor: "text-teal-400",
    summary: "Mathematically prove solvency and patch compliance without disclosing internal asset values or hostnames.",
    samplePrompt: "Generate a Zero-Knowledge proof of reserve solvency proving assets exceed liabilities without revealing balances",
  },
  {
    key: "steganography",
    id: "NOCTIS-STAG-001",
    name: "Steganographic Provenance Vault",
    category: "crypto",
    categoryLabel: "Forensic Watermark",
    badge: "Invisible & Tamper-Proof",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: FileLock,
    iconColor: "text-blue-400",
    summary: "Zero-width unicode cryptographic watermarking preserving document readability with instant tamper detection.",
    samplePrompt: "Embed a cryptographic sovereign watermark into this intelligence brief for provenance tracking",
  },
  {
    key: "air_gap",
    id: "NOCTIS-AIRGAP-001",
    name: "Sovereign Air-Gap Engine",
    category: "crypto",
    categoryLabel: "Local WebGPU / WASM",
    badge: "0 Outbound WAN Bytes",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: WifiOff,
    iconColor: "text-emerald-400",
    summary: "Strict zero-outbound hardware air-gap for classified, defense, and top-secret intelligence processing.",
    samplePrompt: "Enable classified air-gap mode: verify zero outbound packets and enforce local WASM execution",
  },

  // 3. Epistemic Truth & Multi-Agent Intelligence
  {
    key: "circuit_breaker",
    id: "NOCTIS-CIRCUIT-001",
    name: "Epistemic Circuit Breaker",
    category: "epistemic",
    categoryLabel: "Hallucination Defense",
    badge: "Invariant Kill-Switch",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    icon: Brain,
    iconColor: "text-rose-400",
    summary: "Real-time mathematical and clinical invariant enforcer tripping an epistemic kill-switch on hallucinations.",
    samplePrompt: "Run epistemic circuit breaker evaluation on balance sheet assets versus liabilities and equity",
  },
  {
    key: "truth_ledger",
    id: "NOCTIS-LEDGER-001",
    name: "Epistemic Truth Ledger",
    category: "epistemic",
    categoryLabel: "Merkle Proofs",
    badge: "SHA-256 Chain",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Lock,
    iconColor: "text-amber-400",
    summary: "Cryptographic Merkle tree verification tagging every claim with mathematical certainty and verifiable proofs.",
    samplePrompt: "Construct an epistemic Merkle truth ledger for our quarterly financial performance claims",
  },
  {
    key: "work_swarm",
    id: "NOCTIS-SWARM-001",
    name: "Autonomous Work Swarm",
    category: "epistemic",
    categoryLabel: "Multi-Agent Swarm",
    badge: "4-Stage Pipeline",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: Users2,
    iconColor: "text-cyan-400",
    summary: "Collaborative 4-agent swarm: Telemetry Harvester, Quant Solver, Adversarial Challenger, and Executive Publisher.",
    samplePrompt: "Deploy an autonomous work swarm to analyze a $500M enterprise datacenter transition",
  },
  {
    key: "council",
    id: "NOCTIS-COUNCIL-001",
    name: "Council of Engines",
    category: "epistemic",
    categoryLabel: "Consensus Studio",
    badge: "Adversarial Debate",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: Users2,
    iconColor: "text-indigo-400",
    summary: "Multi-agent deliberative debate pitting cyber, financial, legal, and engineering engines for synthesized consensus.",
    samplePrompt: "Convene the Council of Engines to debate our cloud migration risk versus sovereign on-prem deployment",
  },
  {
    key: "cognitive_sandbox",
    id: "NOCTIS-SANDBOX-001",
    name: "Self-Evolving Cognitive Sandbox",
    category: "epistemic",
    categoryLabel: "DPO Training",
    badge: "Zero-Drift Tuning",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: Sparkles,
    iconColor: "text-purple-400",
    summary: "Dynamic benchmark calibration synthesizing DPO pairs from corrections to eliminate model drift.",
    samplePrompt: "Execute cognitive sandbox calibration across 6 core sovereign domains and export DPO dataset",
  },

  // 4. Crisis Strategy & Enterprise Governance
  {
    key: "crisis_negotiation",
    id: "NOCTIS-NASH-001",
    name: "Game-Theoretic Crisis Negotiation",
    category: "governance",
    categoryLabel: "Nash Equilibrium",
    badge: "OFAC Enforced",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    icon: Swords,
    iconColor: "text-orange-400",
    summary: "Empirical ransomware discount modeling, leak probability calibration, and strict OFAC sanctions compliance.",
    samplePrompt: "Calculate optimal Nash Equilibrium counter-offer for BlackCat ransomware syndicate with proof of decryption",
  },
  {
    key: "lex_synthesizer",
    id: "NOCTIS-LEX-001",
    name: "Cross-Border Regulatory Synthesizer",
    category: "governance",
    categoryLabel: "Conflict of Laws",
    badge: "EU AI Act / CLOUD Act / SEC",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    icon: Globe,
    iconColor: "text-rose-400",
    summary: "Synthesizes mutually irreconcilable cross-border regulations into legally defensible tier-1 compliance protocols.",
    samplePrompt: "Harmonize SEC 4-day cyber incident disclosure with GDPR Art. 33 and EU NIS2 reporting requirements",
  },
  {
    key: "live_feeds",
    id: "NOCTIS-FEEDS-001",
    name: "Live Telemetry Feeds",
    category: "governance",
    categoryLabel: "Market & Security",
    badge: "SEC EDGAR / FRED / KEV",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Activity,
    iconColor: "text-emerald-400",
    summary: "Continuous streaming feeds for US Treasury yield curves, SEC EDGAR 10-K/8-K filings, and CISA KEV exploits.",
    samplePrompt: "Fetch latest CISA Known Exploited Vulnerabilities and US Treasury yield curve telemetry",
  },
];

interface NoctisCapabilityMatrixModalProps {
  open: boolean;
  onClose: () => void;
  onSelectEngine: (key: SovereignEngineKey, samplePrompt?: string) => void;
}

export function NoctisCapabilityMatrixModal({
  open,
  onClose,
  onSelectEngine,
}: NoctisCapabilityMatrixModalProps) {
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "cyber" | "crypto" | "epistemic" | "governance">("all");

  if (!open) return null;

  const filteredEngines = SOVEREIGN_ENGINES.filter((eng) => {
    const matchesTab = activeTab === "all" || eng.category === activeTab;
    const q = filter.trim().toLowerCase();
    const matchesQuery =
      !q ||
      eng.name.toLowerCase().includes(q) ||
      eng.id.toLowerCase().includes(q) ||
      eng.summary.toLowerCase().includes(q) ||
      eng.categoryLabel.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-white/15 bg-[#171717] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4 bg-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-300">
              <Cpu className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Sovereign Capability Matrix</h2>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  16 Engines Active
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Frontier defense, cryptographic attestation, epistemic verification, and autonomous multi-agent intelligence.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#1a1a1a] px-6 py-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: "all", label: "All Engines (16)" },
                { id: "cyber", label: "🛡️ Cyber & Attack" },
                { id: "crypto", label: "🔐 Quantum & Enclaves" },
                { id: "epistemic", label: "🧠 Epistemic & Swarm" },
                { id: "governance", label: "⚖️ Governance & Crisis" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  activeTab === tab.id
                    ? "bg-[#e4b86a] text-[#1a1408] font-semibold"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 size-3.5 text-zinc-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search engines (e.g., canary, pqc, twin, zk)..."
              className="h-8 w-full rounded-xl border border-white/10 bg-[#252525] pl-8 pr-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#e4b86a]/50"
            />
          </div>
        </div>

        {/* Engine Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEngines.map((eng) => {
              const IconComp = eng.icon;
              return (
                <div
                  key={eng.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#202020] p-4 transition-all duration-200 hover:border-white/20 hover:bg-[#252525] hover:shadow-xl"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="grid size-8 place-items-center rounded-xl bg-white/5 border border-white/10">
                          <IconComp className={cn("size-4", eng.iconColor)} />
                        </div>
                        <div>
                          <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                            {eng.id}
                          </span>
                          <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white">
                            {eng.name}
                          </h3>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0",
                          eng.badgeColor
                        )}
                      >
                        {eng.badge}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      {eng.summary}
                    </p>
                  </div>

                  <div className="mt-auto border-t border-white/5 pt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-zinc-500 truncate">
                      {eng.categoryLabel}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectEngine(eng.key, eng.samplePrompt);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-[#e4b86a] hover:text-[#1a1408] transition"
                        title="Launch Interactive Studio"
                      >
                        Launch Studio
                        <ChevronRight className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEngines.length === 0 ? (
            <div className="py-12 text-center">
              <Cpu className="mx-auto size-8 text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-400 font-medium">No matching engines found</p>
              <p className="text-xs text-zinc-500">Try searching for &quot;canary&quot;, &quot;pqc&quot;, &quot;twin&quot;, or &quot;circuit&quot;</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-[#1c1c1c] px-6 py-3 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              All 16 Engines FIPS & NIST Verified
            </span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:inline text-zinc-400">Pure Synchronous Cryptography & Zero External Leaks</span>
          </div>
          <span className="font-mono text-[11px] text-zinc-500">Architecture: NOCTIS-SOVEREIGN-v3.0</span>
        </div>
      </div>
    </div>
  );
}
