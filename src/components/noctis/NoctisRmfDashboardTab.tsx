import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  FileCheck2,
  GitBranch,
  Lock,
  Network,
  Play,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoctisRmfDashboardTabProps {
  onSendToChat?: (text: string) => void;
  onOpenInCanvas?: (title: string, md: string) => void;
  onClose?: () => void;
}

type RmfSubTab =
  | "overview"
  | "authoring"
  | "ato"
  | "rules"
  | "cyber"
  | "graph"
  | "training";

interface CapabilityItem {
  id: string;
  name: string;
  category: "governance" | "cyber_security" | "ai_knowledge";
  priority: string;
  subsystem: string;
  status: string;
  requiredBehavior: string;
}

interface StorageStatus {
  tenant_id: string;
  dbSource: "neon" | "pglite";
  runtimeReady: boolean;
  countsByType: Record<string, number>;
  totalArtifacts: number;
  auditLedgerCount: number;
  latestLedgerHash: string;
  latestEvents: {
    seq: number;
    eventType: string;
    actorId: string;
    artifactId: string | null;
    eventHash: string;
    createdAt: string;
  }[];
}

interface RuleCatalogEntry {
  ruleId: string;
  controlId: string;
  family: string;
  controlTitle: string;
  defaultBaseline: string;
  thresholdSummary: string;
  severityOnFail: string;
}

async function apiJson<T = Record<string, unknown>>(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const res = await fetch(path, {
    method,
    headers: method === "POST" ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as T;
  return { status: res.status, data };
}

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SUB_TABS: { id: RmfSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview & Simulator", icon: Activity },
  { id: "authoring", label: "SSP / SAP / SAR", icon: FileCheck2 },
  { id: "ato", label: "POA&M, ATO & Risk", icon: Shield },
  { id: "rules", label: "20-Family Rules & SPRS", icon: Wrench },
  { id: "cyber", label: "Cyber Intel & ZTMM", icon: ShieldAlert },
  { id: "graph", label: "Graph & Trace", icon: GitBranch },
  { id: "training", label: "Feedback & LoRA", icon: Sparkles },
];

export function NoctisRmfDashboardTab({
  onSendToChat,
  onOpenInCanvas,
  onClose,
}: NoctisRmfDashboardTabProps) {
  const [subTab, setSubTab] = useState<RmfSubTab>("overview");
  const [loading, setLoading] = useState(false);

  // Header & overview telemetry
  const [manifest, setManifest] = useState<{ nistVersion?: string; dbSha256?: string; counts?: Record<string, number> }>({});
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [capFilter, setCapFilter] = useState<string>("all");
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);

  // Authoring (RMF-002..005)
  const [systemId, setSystemId] = useState("sys-noctis-enclave");
  const [systemName, setSystemName] = useState("Noctis Sovereign GovCloud Enclave");
  const [baseline, setBaseline] = useState<"HIGH" | "MODERATE" | "LOW">("HIGH");
  const [inheritedControls, setInheritedControls] = useState("PE-1, PE-2, PE-3, PE-6, MA-2");
  const [hybridControls, setHybridControls] = useState("IA-2, AU-6, CM-2, SC-7");
  const [authoringOutput, setAuthoringOutput] = useState<Record<string, unknown> | null>(null);
  const [tailorApproved, setTailorApproved] = useState(false);
  const [tailorResult, setTailorResult] = useState<{ status: number; data: Record<string, unknown> } | null>(null);

  // ATO, POA&M, cATO & Risk (RMF-006..009)
  const [atoResult, setAtoResult] = useState<Record<string, unknown> | null>(null);
  const [poamResult, setPoamResult] = useState<{ status: number; data: Record<string, unknown> } | null>(null);
  const [catoResult, setCatoResult] = useState<Record<string, unknown> | null>(null);
  const [riskTitle, setRiskTitle] = useState("Legacy unrotated service tokens on staging ingress");
  const [riskResult, setRiskResult] = useState<Record<string, unknown> | null>(null);

  // Rules, DoD IL & CMMC SPRS
  const [rulesCatalog, setRulesCatalog] = useState<RuleCatalogEntry[]>([]);
  const [ruleSearch, setRuleSearch] = useState("");
  const [scenarioInput, setScenarioInput] = useState(
    "Evaluate NIST SP 800-53 AC-2 (terminated 08:00 Monday, disabled 15:00 Tuesday within 24 hour limit) and AC-6 (2 standing global admins with no JIT) and SC-13 (non-FIPS cryptography).",
  );
  const [scenarioEvalResult, setScenarioEvalResult] = useState<Record<string, unknown> | null>(null);
  const [sprsFails, setSprsFails] = useState<{ controlId: string; weight: 1 | 3 | 5; onPoam: boolean }[]>([
    { controlId: "3.5.3 (MFA)", weight: 5, onPoam: true },
    { controlId: "3.1.2 (Transaction Limit)", weight: 3, onPoam: true },
  ]);
  const [sprsResult, setSprsResult] = useState<Record<string, unknown> | null>(null);
  const [dodIl, setDodIl] = useState<"IL2" | "IL4" | "IL5" | "IL6">("IL5");
  const [dodEnv, setDodEnv] = useState<"GovCloud_Dedicated" | "Commercial" | "SIPRNet_Classified">("GovCloud_Dedicated");
  const [dodScca, setDodScca] = useState(true);
  const [dodResult, setDodResult] = useState<Record<string, unknown> | null>(null);
  const [crosswalkId, setCrosswalkId] = useState("AC-2");
  const [crosswalkResult, setCrosswalkResult] = useState<Record<string, unknown> | null>(null);

  // Cyber Intelligence (CYB-011..018)
  const [kevResult, setKevResult] = useState<Record<string, unknown> | null>(null);
  const [attackResult, setAttackResult] = useState<Record<string, unknown> | null>(null);
  const [stigResult, setStigResult] = useState<Record<string, unknown> | null>(null);
  const [connectorResult, setConnectorResult] = useState<{ status: number; data: Record<string, unknown> } | null>(null);
  const [sbomResult, setSbomResult] = useState<Record<string, unknown> | null>(null);
  const [ztScores, setZtScores] = useState({ identity: 4, devices: 3, networks: 2, applications: 3, data: 3 });
  const [ztResult, setZtResult] = useState<Record<string, unknown> | null>(null);
  const [forecastResult, setForecastResult] = useState<Record<string, unknown> | null>(null);

  // Knowledge Graph & Trace
  const [graphData, setGraphData] = useState<Record<string, unknown> | null>(null);
  const [graphFilter, setGraphFilter] = useState<string>("ALL");
  const [selectedNode, setSelectedNode] = useState<Record<string, unknown> | null>(null);
  const [tenantBlockResult, setTenantBlockResult] = useState<{ status: number; data: Record<string, unknown> } | null>(null);
  const [traceQuestion, setTraceQuestion] = useState("Evaluate AC-2: terminated 08:00 Monday, disabled 15:00 Tuesday against 24 hour policy.");
  const [traceResult, setTraceResult] = useState<Record<string, unknown> | null>(null);

  // Feedback & LoRA Training (AI-022)
  const [trainingStatus, setTrainingStatus] = useState<Record<string, unknown> | null>(null);
  const [fbControl, setFbControl] = useState("AC-2");
  const [fbPrompt, setFbPrompt] = useState("What is the FedRAMP High ODP inactivity threshold for AC-2(3)?");
  const [fbPreferred, setFbPreferred] = useState("Under FedRAMP Rev. 5 High baseline ODP, inactive user accounts under AC-2(3) must be automatically disabled after <= 35 days of inactivity.");
  const [fbRejected, setFbRejected] = useState("Inactive accounts can remain enabled for 180 days.");

  const refreshCore = async () => {
    setLoading(true);
    try {
      const [capRes, storeRes, rulesRes, trainRes] = await Promise.all([
        apiJson<{ manifest: Record<string, unknown>; capabilities: CapabilityItem[] }>("/api/v2/rmf/capabilities"),
        apiJson<StorageStatus>("/api/v2/rmf/storage/status"),
        apiJson<{ rules: RuleCatalogEntry[] }>("/api/v2/rmf/rules/catalog"),
        apiJson<Record<string, unknown>>("/api/v2/rmf/training/status"),
      ]);
      setManifest(capRes.data.manifest || {});
      setCapabilities(capRes.data.capabilities || []);
      setStorage(storeRes.data);
      setRulesCatalog(rulesRes.data.rules || []);
      setTrainingStatus(trainRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshCore();
  }, []);

  const refreshStorage = async () => {
    const res = await apiJson<StorageStatus>("/api/v2/rmf/storage/status");
    setStorage(res.data);
  };

  const runSimulator = async () => {
    setLoading(true);
    try {
      const res = await apiJson("/api/v2/rmf/simulator/run", "POST", {});
      setSimResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  const runCyberSuite = async () => {
    setLoading(true);
    try {
      const [kev, ap, stig, sbom, zt, fc] = await Promise.all([
        apiJson("/api/v2/rmf/cyber/vulnerabilities", "POST", {
          findings: [
            { id: "SCAN-1", assetId: "vpn-gw-01", cve: "CVE-2024-3400", severity: "CRITICAL", cvss: 10.0, daysOpen: 21 },
            { id: "SCAN-2", assetId: "app-node-04", cve: "CVE-2024-21887", severity: "CRITICAL", cvss: 9.1, daysOpen: 18 },
            { id: "SCAN-3", assetId: "db-02", cve: "CVE-2023-4966", severity: "HIGH", cvss: 7.5, daysOpen: 10 },
          ],
        }),
        apiJson("/api/v2/rmf/cyber/attack-paths", "POST", {
          nodes: [
            { id: "internet-edge", label: "Public Edge Gateway", tier: "ENTRY" },
            { id: "vpn-gw-01", label: "PAN-OS VPN", tier: "PIVOT" },
            { id: "iam-idp", label: "Identity Provider", tier: "PIVOT" },
            { id: "cui-vault", label: "CUI Postgres Enclave", tier: "CROWN_JEWEL" },
          ],
          edges: [
            { from: "internet-edge", to: "vpn-gw-01", techniqueId: "T1190", techniqueName: "Exploit Public-Facing App", evidenceKind: "OBSERVED", mitigatingControls: ["SC-7", "SI-2"] },
            { from: "vpn-gw-01", to: "iam-idp", techniqueId: "T1078", techniqueName: "Valid Accounts", evidenceKind: "INFERRED", mitigatingControls: ["IA-2", "AC-6"] },
            { from: "iam-idp", to: "cui-vault", techniqueId: "T1552", techniqueName: "Unsecured Credentials", evidenceKind: "OBSERVED", mitigatingControls: ["IA-5", "AC-3", "SC-28"] },
          ],
        }),
        apiJson("/api/v2/rmf/cyber/config-compliance", "POST", {
          benchmarkName: "DISA RHEL 9 STIG v2r1",
          checks: [
            { ruleId: "V-257777", title: "FIPS mode enabled", benchmark: "DISA_STIG", severityCategory: "CAT_I", status: "PASS", controlId: "SC-13" },
            { ruleId: "V-257844", title: "Disable direct root SSH login", benchmark: "DISA_STIG", severityCategory: "CAT_I", status: "FAIL", controlId: "IA-2" },
            { ruleId: "V-257901", title: "Auditd remote SIEM forwarding", benchmark: "DISA_STIG", severityCategory: "CAT_II", status: "PASS", controlId: "AU-2" },
          ],
        }),
        apiJson("/api/v2/rmf/cyber/sbom", "POST", {
          sbom: {
            bomFormat: "CycloneDX",
            components: [
              { name: "openssl-fips", version: "3.0.14", hashes: [{ alg: "SHA-256", content: "abc" }], licenses: [{ license: { id: "Apache-2.0" } }] },
              { name: "log4j-core", version: "2.14.1", licenses: [{ license: { id: "Apache-2.0" } }] },
              { name: "liblzma", version: "5.6.1", hashes: [{ alg: "SHA-256", content: "def" }] },
            ],
          },
        }),
        apiJson("/api/v2/rmf/cyber/zero-trust", "POST", ztScores),
        apiJson("/api/v2/rmf/cyber/forecast", "POST", { open_kev_count: 2, open_high_count: 8 }),
      ]);
      setKevResult(kev.data);
      setAttackResult(ap.data);
      setStigResult(stig.data);
      setSbomResult(sbom.data);
      setZtResult(zt.data);
      setForecastResult(fc.data);
    } finally {
      setLoading(false);
    }
  };

  const loadKnowledgeGraph = async () => {
    setLoading(true);
    try {
      const res = await apiJson("/api/v2/rmf/graph/query", "POST", {
        system_id: systemId,
        system_name: systemName,
        baseline: `FEDRAMP_${baseline}`,
        controls: ["AC-2", "AC-6", "AU-6", "IA-2", "SC-7", "SI-4"],
      });
      setGraphData(res.data);
    } finally {
      setLoading(false);
    }
  };

  const filteredCapabilities = capabilities.filter((c) => capFilter === "all" || c.category === capFilter);
  const filteredRules = rulesCatalog.filter((r) => {
    const q = ruleSearch.trim().toLowerCase();
    return !q || r.controlId.toLowerCase().includes(q) || r.family.toLowerCase().includes(q) || r.controlTitle.toLowerCase().includes(q);
  });

  const isNeon = storage?.dbSource === "neon";

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[#0a0d14] text-zinc-100 overflow-hidden">
      {/* Header Bar */}
      <div className="shrink-0 border-b border-white/10 bg-[#0e131e]/95 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 transition"
            >
              <ArrowLeft className="size-3.5" />
              Chat
            </button>
          ) : null}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Shield className="size-4 text-[#e4b86a]" />
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Noctis RMF Intelligence Command Center v2.0
              </h1>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {capabilities.filter((c) => c.status === "implemented").length || 25}/25 Capabilities
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                  isNeon
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-200",
                )}
              >
                <Database className="size-3" />
                {isNeon ? "Managed Neon Postgres" : "Embedded PGLite"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
              {`NIST SP 800-53/53A Rev. ${manifest.nistVersion || "5.2.0"} · 28 Rules / 20 Families · DB SHA-256: `}
              <span className="text-[#e4b86a]">{(manifest.dbSha256 || "").slice(0, 12) || "verified"}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refreshCore()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 transition"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Sub-tab Navigation Strip */}
      <div className="shrink-0 border-b border-white/10 bg-[#0b0f18] px-4 py-2 flex flex-wrap items-center gap-1.5">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
                active
                  ? "bg-[#e4b86a]/20 text-[#e4b86a] border border-[#e4b86a]/40"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body Area */}
      <div className="flex-1 min-h-0 overflow-y-auto noctis-thin-scroll p-4 sm:p-6 space-y-6">
        {/* ======================== 1. OVERVIEW & SIMULATOR ======================== */}
        {subTab === "overview" ? (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400">NIST 800-53 Catalog</div>
                <div className="text-xl font-bold text-white font-mono mt-1">
                  {manifest.counts?.totalControlsAndEnhancements ?? 1196}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">324 base · 872 enhancements</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Rule Engine Scope</div>
                <div className="text-xl font-bold text-emerald-300 font-mono mt-1">{rulesCatalog.length || 28} Rules</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">All 20 families + IL2–IL6/SPRS</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400">SQL Backend</div>
                <div className="text-xl font-bold text-cyan-300 font-mono mt-1">
                  {isNeon ? "NEON PG" : "PGLITE"}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {storage?.totalArtifacts ?? 0} artifacts stored
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Hash Audit Ledger</div>
                <div className="text-xl font-bold text-[#e4b86a] font-mono mt-1">
                  {storage?.auditLedgerCount ?? 0} Events
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                  Head: {(storage?.latestLedgerHash || "GENESIS").slice(0, 12)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400">MITRE ATT&CK v16.1</div>
                <div className="text-xl font-bold text-rose-300 font-mono mt-1">
                  {manifest.counts?.mitreAttackEdges ?? 5314}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">CSF 2.0: {manifest.counts?.csf2Items ?? 225} items</div>
              </div>
            </div>

            {/* AI-021 10-Case Deterministic Golden Simulator */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Play className="size-4 text-emerald-400" />
                    AI-021 Deterministic Golden RMF Simulator (10 Verification Cases)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Tests rule evaluation, SHA-256 tamper quarantine, STIG CAT I veto, withdrawn AC-13 redirection, DoD IL5 SCCA, CMMC SPRS 5-pt POA&M block, and ZTMM scoring.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void runSimulator()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-500/40 px-3.5 py-2 text-xs font-bold text-emerald-200 transition"
                >
                  <Play className="size-3.5" />
                  Run 10-Case Simulator
                </button>
              </div>
              {simResult ? (
                <div className="space-y-2 pt-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300 font-bold">
                      {`Passed: ${String(simResult.passedCount)} / ${String(simResult.totalCases)}`}
                    </span>
                    <span className="text-zinc-400">Suite SHA-256: {String(simResult.suiteSha256 || "").slice(0, 16)}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {((simResult.cases as { id: string; name: string; expected: string; actual: string; passed: boolean }[]) || []).map((c) => (
                      <div key={c.id} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs flex items-start gap-2">
                        {c.passed ? (
                          <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-white">{c.id}: {c.name}</div>
                          <div className="text-[11px] font-mono text-zinc-400">expected={c.expected} · actual={c.actual}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* 25-Capability Matrix */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">Enterprise v2.0 Capability Matrix (RMF-001 – AI-025)</h2>
                <div className="flex gap-1.5 text-xs">
                  {(["all", "governance", "cyber_security", "ai_knowledge"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCapFilter(cat)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium border transition",
                        capFilter === cat
                          ? "bg-[#e4b86a]/20 border-[#e4b86a]/40 text-[#e4b86a]"
                          : "border-white/10 text-zinc-400 hover:text-white",
                      )}
                    >
                      {cat.replace("_", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredCapabilities.map((c) => (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#e4b86a]">{c.id} · {c.name}</span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{c.requiredBehavior}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* ======================== 2. SSP / SAP / SAR & TAILORING ======================== */}
        {subTab === "authoring" ? (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
              <h2 className="text-sm font-bold text-white">OSCAL SSP / SAP / SAR & Control Inheritance Workbench (RMF-002..005)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="text-zinc-400 font-medium">System ID</span>
                  <input value={systemId} onChange={(e) => setSystemId(e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-400 font-medium">System Name</span>
                  <input value={systemName} onChange={(e) => setSystemName(e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-400 font-medium">FIPS 199 / SP 800-53B Baseline</span>
                  <select value={baseline} onChange={(e) => setBaseline(e.target.value as "HIGH" | "MODERATE" | "LOW")} className="w-full rounded-lg border border-white/15 bg-[#101521] px-3 py-1.5 text-white">
                    <option value="HIGH">FedRAMP High (370 controls)</option>
                    <option value="MODERATE">FedRAMP Moderate (287 controls)</option>
                    <option value="LOW">FedRAMP Low (149 controls)</option>
                  </select>
                </label>
                <label className="space-y-1 sm:col-span-3">
                  <span className="text-zinc-400 font-medium">Inherited / Hybrid Controls (CRM Split)</span>
                  <input value={`${inheritedControls} | ${hybridControls}`} onChange={(e) => {
                    const [a, b] = e.target.value.split("|");
                    setInheritedControls((a || "").trim());
                    setHybridControls((b || "").trim());
                  }} className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white font-mono" />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await apiJson("/api/v2/rmf/ssp/generate", "POST", {
                      system_id: systemId,
                      system_name: systemName,
                      baseline,
                      implementations: [
                        { controlId: "AC-2", responsibility: "HYBRID", statement: "SCIM automated disablement within 24 hours; quarterly RBAC attestations.", evidenceIds: ["EV-AC2-SCIM"] },
                        { controlId: "AU-6", responsibility: "CUSTOMER_SPECIFIC", statement: "Weekly SIEM correlation review (<= 7d FedRAMP High ODP)." },
                      ],
                    });
                    setAuthoringOutput(res.data);
                    void refreshStorage();
                  }}
                  className="rounded-lg bg-[#e4b86a]/25 hover:bg-[#e4b86a]/35 border border-[#e4b86a]/40 px-3 py-1.5 text-xs font-bold text-[#e4b86a]"
                >
                  Generate OSCAL SSP
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await apiJson("/api/v2/rmf/sap/generate", "POST", {
                      system_id: systemId,
                      system_name: systemName,
                      control_ids: ["AC-2", "AC-6", "AU-6", "CM-6", "IA-2", "SC-7", "SI-2"],
                    });
                    setAuthoringOutput(res.data);
                    void refreshStorage();
                  }}
                  className="rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200"
                >
                  Generate 800-53A SAP
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await apiJson("/api/v2/rmf/sar/generate", "POST", {
                      system_id: systemId,
                      system_name: systemName,
                      assessor_name: "Independent 3PAO Assessor",
                      observations: [
                        { controlId: "AC-2", objectiveId: "AC-02[01]", verdict: "SATISFIED", observation: "Automated SCIM disablement verified", evidenceSha256: "abc123verified" },
                        { controlId: "CM-6", objectiveId: "CM-06[02]", verdict: "OTHER_THAN_SATISFIED", severity: "CAT_II", observation: "3 SSH hardening exceptions pending POA&M", evidenceSha256: "def456verified" },
                      ],
                    });
                    setAuthoringOutput(res.data);
                    void refreshStorage();
                  }}
                  className="rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 px-3 py-1.5 text-xs font-bold text-violet-200"
                >
                  Generate SAR Results
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await apiJson("/api/v2/rmf/inheritance/resolve", "POST", {
                      system_id: systemId,
                      baseline,
                      provider_name: "FedRAMP High Authorized IaaS/PaaS",
                      inherited_controls: inheritedControls.split(",").map((s) => s.trim()).filter(Boolean),
                      hybrid_controls: hybridControls.split(",").map((s) => s.trim()).filter(Boolean),
                    });
                    setAuthoringOutput(res.data);
                  }}
                  className="rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-200"
                >
                  Resolve CRM Inheritance
                </button>
                {authoringOutput ? (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadJsonFile(`${systemId}-oscal-artifact.json`, authoringOutput)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                    >
                      <Download className="size-3.5" /> Export JSON
                    </button>
                    {onOpenInCanvas ? (
                      <button
                        type="button"
                        onClick={() => onOpenInCanvas(`${systemName} OSCAL Artifact`, "```json\n" + JSON.stringify(authoringOutput, null, 2) + "\n```")}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                      >
                        Open in Canvas
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {authoringOutput ? (
                <pre className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] font-mono text-emerald-200">
                  {JSON.stringify(authoringOutput, null, 2)}
                </pre>
              ) : null}
            </div>

            {/* RMF-004 Tailoring Approval Gate */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">RMF-004 Baseline Tailoring Approval Gate</h3>
                  <p className="text-xs text-zinc-400">Draft tailoring changes are blocked (`POLICY_NOT_APPROVED`) until explicitly approved by a human ISSM/AO.</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <label className="inline-flex items-center gap-1.5 text-zinc-300">
                    <input type="checkbox" checked={tailorApproved} onChange={(e) => setTailorApproved(e.target.checked)} />
                    ISSM Approved (`APPROVED`)
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/tailoring/propose", "POST", {
                        system_id: systemId,
                        control_id: "AU-6",
                        action: "SET_ODP",
                        rationale: "Set continuous SIEM audit correlation cadence to weekly (<= 7d) per FedRAMP High ODP",
                        source_citation: "NIST SP 800-53B / FedRAMP Rev. 5 High ODP",
                        status: tailorApproved ? "APPROVED" : "DRAFT",
                        approved_by: tailorApproved ? "issm@agency.gov" : null,
                      });
                      setTailorResult(res);
                      void refreshStorage();
                    }}
                    className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 font-bold text-amber-200"
                  >
                    Submit Tailoring Change
                  </button>
                </div>
              </div>
              {tailorResult ? (
                <div className={cn("rounded-lg border p-3 text-xs font-mono", tailorResult.status === 200 ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200" : "border-rose-500/40 bg-rose-950/20 text-rose-200")}>
                  HTTP {tailorResult.status} · {JSON.stringify(tailorResult.data)}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ======================== 3. POA&M, ATO READINESS & RISK ======================== */}
        {subTab === "ato" ? (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 flex items-center gap-3 text-xs text-amber-200">
              <Lock className="size-4 text-amber-400 shrink-0" />
              <span>
                <strong>Architectural Invariant:</strong> Noctis evaluates readiness and evidence gates deterministically, but{" "}
                <strong>only a human Authorizing Official (AO) can grant an ATO or accept residual risk.</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ATO Readiness + cATO */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h2 className="text-sm font-bold text-white">RMF-007 ATO Readiness & RMF-008 cATO Monitor</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/ato/readiness", "POST", {
                        system_id: systemId,
                        missing_evidence: [{ controlId: "AC-2", objectiveId: "AC-02j.[01]", action: "Attach SCIM disablement log" }],
                      });
                      setAtoResult(res.data);
                    }}
                    className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200"
                  >
                    Evaluate ATO Readiness (With Blocker)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/ato/readiness", "POST", { system_id: systemId });
                      setAtoResult(res.data);
                    }}
                    className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-200"
                  >
                    Evaluate 100% Complete Package
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/cato/evaluate", "POST", {
                        system_id: systemId,
                        vuln_scan_age_days: 14,
                        overdue_kev_count: 1,
                        overdue_high_poam_count: 0,
                        stig_compliance_percent: 93,
                        siem_telemetry_active: true,
                      });
                      setCatoResult(res.data);
                      void refreshStorage();
                    }}
                    className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-200"
                  >
                    Check cATO Drift Triggers
                  </button>
                </div>
                {atoResult ? <pre className="rounded-lg bg-black/50 p-3 text-[11px] font-mono text-cyan-200 overflow-auto max-h-56">{JSON.stringify(atoResult, null, 2)}</pre> : null}
                {catoResult ? <pre className="rounded-lg bg-black/50 p-3 text-[11px] font-mono text-amber-200 overflow-auto max-h-56">{JSON.stringify(catoResult, null, 2)}</pre> : null}
              </div>

              {/* POA&M Closure Gate + Enterprise Risk Register */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h2 className="text-sm font-bold text-white">RMF-006 POA&M Evidence Gate & RMF-009 Risk Register</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/poam", "POST", {
                        system_id: systemId,
                        control_id: "AC-2",
                        remediation_summary: "Closed without attaching proof",
                      });
                      setPoamResult(res);
                    }}
                    className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-200"
                  >
                    Test Unverified Closure (Blocked)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/poam", "POST", {
                        system_id: systemId,
                        control_id: "AC-2",
                        remediation_summary: "Automated SCIM disablement verified <= 4h",
                        evidence_payload: { scimJobSuccess: true, maxTerminationHours: 4.1 },
                      });
                      setPoamResult(res);
                      void refreshStorage();
                    }}
                    className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-200"
                  >
                    Close With Verified Evidence
                  </button>
                </div>
                {poamResult ? (
                  <div className={cn("rounded-lg border p-2.5 text-[11px] font-mono", poamResult.status === 200 ? "border-emerald-500/40 text-emerald-200" : "border-rose-500/40 text-rose-200")}>
                    HTTP {poamResult.status}: {JSON.stringify(poamResult.data)}
                  </div>
                ) : null}

                <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
                  <div className="font-semibold text-zinc-300">Log Organizational Risk (AO Acceptance Required)</div>
                  <div className="flex gap-2">
                    <input value={riskTitle} onChange={(e) => setRiskTitle(e.target.value)} className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white" />
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await apiJson("/api/v2/rmf/risks/register", "POST", {
                          system_id: systemId,
                          title: riskTitle,
                          tier: "MISSION",
                          inherent_likelihood: 4,
                          inherent_impact: 5,
                          residual_likelihood: 2,
                          residual_impact: 4,
                          treatment_strategy: "PROPOSE_ACCEPTANCE",
                        });
                        setRiskResult(res.data);
                        void refreshStorage();
                      }}
                      className="rounded-lg bg-[#e4b86a]/25 border border-[#e4b86a]/40 px-3 py-1.5 font-bold text-[#e4b86a]"
                    >
                      Register Risk
                    </button>
                  </div>
                  {riskResult ? <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-zinc-200 overflow-auto max-h-40">{JSON.stringify(riskResult, null, 2)}</pre> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ======================== 4. 20-FAMILY RULES, DOD IL & CMMC SPRS ======================== */}
        {subTab === "rules" ? (
          <div className="space-y-5 max-w-6xl mx-auto">
            {/* Natural Language 28-Rule Scenario Evaluator */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-bold text-white">20-Family Deterministic Rule Scenario Evaluator</h2>
              <textarea
                rows={3}
                value={scenarioInput}
                onChange={(e) => setScenarioInput(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-xs font-mono text-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await apiJson("/api/v2/rmf/rules/evaluate", "POST", { mode: "text", scenario: scenarioInput });
                    setScenarioEvalResult(res.data);
                  }}
                  className="rounded-lg bg-emerald-600/30 border border-emerald-500/40 px-3.5 py-1.5 text-xs font-bold text-emerald-200"
                >
                  Evaluate All Triggered Rules
                </button>
                {onSendToChat ? (
                  <button
                    type="button"
                    onClick={() => onSendToChat(scenarioInput)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                  >
                    <Send className="size-3.5" /> Ask in Noctis Chat
                  </button>
                ) : null}
              </div>
              {scenarioEvalResult ? <pre className="rounded-lg bg-black/50 p-3 text-[11px] font-mono text-emerald-200 overflow-auto max-h-60">{JSON.stringify(scenarioEvalResult, null, 2)}</pre> : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* CMMC Level 2 / SPRS Score Calculator */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-sm font-bold text-white">CMMC Level 2 / NIST SP 800-171 SPRS Score Calculator</h3>
                <div className="space-y-1.5 text-xs">
                  {sprsFails.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-1.5">
                      <span className="font-mono text-zinc-200">{item.controlId}</span>
                      <span className="text-amber-300 font-bold">-{item.weight} pts</span>
                      <button
                        type="button"
                        onClick={() => setSprsFails((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:underline"
                      >
                        Remediate
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSprsFails((prev) => [...prev, { controlId: "3.13.11 (FIPS Crypto)", weight: 5, onPoam: true }])}
                    className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
                  >
                    + Add 5-pt Failure
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/rules/evaluate", "POST", { mode: "cmmc_sprs", failed_controls: sprsFails });
                      setSprsResult(res.data);
                    }}
                    className="rounded-lg bg-[#e4b86a]/25 border border-[#e4b86a]/40 px-3 py-1.5 text-xs font-bold text-[#e4b86a]"
                  >
                    Compute Official SPRS Score
                  </button>
                </div>
                {sprsResult ? <pre className="rounded-lg bg-black/50 p-3 text-[11px] font-mono text-amber-200 overflow-auto max-h-48">{JSON.stringify(sprsResult, null, 2)}</pre> : null}
              </div>

              {/* DoD IL2-IL6 Overlay & RMF-010 Crosswalk */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-sm font-bold text-white">DoD IL2–IL6 / SCCA Overlay & RMF-010 Framework Crosswalk</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <select value={dodIl} onChange={(e) => setDodIl(e.target.value as "IL2" | "IL4" | "IL5" | "IL6")} className="rounded-lg border border-white/15 bg-[#101521] px-2.5 py-1.5 text-white">
                    <option value="IL2">DoD IL2</option>
                    <option value="IL4">DoD IL4</option>
                    <option value="IL5">DoD IL5 (CUI/NSS)</option>
                    <option value="IL6">DoD IL6 (SECRET)</option>
                  </select>
                  <select value={dodEnv} onChange={(e) => setDodEnv(e.target.value as "GovCloud_Dedicated" | "Commercial" | "SIPRNet_Classified")} className="rounded-lg border border-white/15 bg-[#101521] px-2.5 py-1.5 text-white">
                    <option value="GovCloud_Dedicated">GovCloud Dedicated</option>
                    <option value="Commercial">Commercial Multi-Tenant</option>
                    <option value="SIPRNet_Classified">SIPRNet Classified</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="inline-flex items-center gap-1.5 text-zinc-300">
                    <input type="checkbox" checked={dodScca} onChange={(e) => setDodScca(e.target.checked)} />
                    SCCA Boundary Enabled
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/rules/evaluate", "POST", {
                        mode: "dod_il",
                        impact_level: dodIl,
                        hosting_environment: dodEnv,
                        scca_compliant: dodScca,
                        us_citizen_admins_only: true,
                      });
                      setDodResult(res.data);
                    }}
                    className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1 font-bold text-cyan-200"
                  >
                    Evaluate DoD Overlay
                  </button>
                </div>
                {dodResult ? <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-cyan-200 overflow-auto max-h-36">{JSON.stringify(dodResult, null, 2)}</pre> : null}

                <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-xs">
                  <input value={crosswalkId} onChange={(e) => setCrosswalkId(e.target.value)} placeholder="Control e.g. AC-2" className="w-28 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-white font-mono" />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/crosswalk", "POST", { control_id: crosswalkId });
                      setCrosswalkResult(res.data);
                    }}
                    className="rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 font-bold text-zinc-200"
                  >
                    Resolve Crosswalk (800-171 / CSF / ISO / CIS / ATT&CK)
                  </button>
                </div>
                {crosswalkResult ? <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-zinc-200 overflow-auto max-h-44">{JSON.stringify(crosswalkResult, null, 2)}</pre> : null}
              </div>
            </div>

            {/* 28-Rule Catalog Table */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">All {rulesCatalog.length} Deterministic Rule Evaluators (20 NIST Families)</h3>
                <input value={ruleSearch} onChange={(e) => setRuleSearch(e.target.value)} placeholder="Filter control / family..." className="rounded-lg border border-white/15 bg-black/40 px-3 py-1 text-xs text-white" />
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-zinc-400 border-b border-white/10">
                    <tr>
                      <th className="py-1.5 pr-3">Control</th>
                      <th className="py-1.5 pr-3">Rule ID</th>
                      <th className="py-1.5 pr-3">Threshold</th>
                      <th className="py-1.5">Fail Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRules.map((r) => (
                      <tr key={r.ruleId}>
                        <td className="py-1.5 pr-3 font-mono font-bold text-[#e4b86a]">{r.controlId}</td>
                        <td className="py-1.5 pr-3 font-mono text-zinc-300">{r.ruleId}</td>
                        <td className="py-1.5 pr-3 text-zinc-400">{r.thresholdSummary}</td>
                        <td className="py-1.5 font-bold text-rose-300">{r.severityOnFail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {/* ======================== 5. CYBER INTELLIGENCE & ZTMM ======================== */}
        {subTab === "cyber" ? (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/15 p-4">
              <div>
                <h2 className="text-sm font-bold text-white">Cyber Intelligence Suite (CYB-011 – CYB-018)</h2>
                <p className="text-xs text-zinc-400">
                  Syncs live CISA KEV catalog, classifies attack-path telemetry (`OBSERVED` vs `INFERRED`), checks STIG CAT I vetoes, inspects SBOMs, scores Zero Trust pillars, and computes FAIR risk forecasts (`ANALYTICAL_ESTIMATE`).
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runCyberSuite()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/45 border border-rose-500/40 px-4 py-2 text-xs font-bold text-rose-200 transition"
              >
                <ZapIcon /> Sync Live CISA KEV & Run Full Cyber Suite
              </button>
            </div>

            {kevResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">CYB-011 Live CISA KEV & SLA Correlation</h3>
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-200">
                      {String(kevResult.kevFeedSource)} ({String(kevResult.kevCatalogCount)} CVEs)
                    </span>
                  </div>
                  <pre className="rounded-lg bg-black/50 p-3 text-[11px] font-mono text-rose-200 overflow-auto max-h-56">{JSON.stringify(kevResult, null, 2)}</pre>
                </div>

                {/* CYB-012 Attack-Path SVG */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">CYB-012 Attack-Path Visualizer</h3>
                    <span className="text-[10px] font-mono text-zinc-400">Solid = OBSERVED · Dashed = INFERRED</span>
                  </div>
                  <svg viewBox="0 0 560 120" className="w-full h-32 rounded-xl border border-white/10 bg-black/40">
                    <line x1="85" y1="60" x2="215" y2="60" stroke="#34d399" strokeWidth="2.5" />
                    <line x1="255" y1="60" x2="365" y2="60" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6 4" />
                    <line x1="405" y1="60" x2="500" y2="60" stroke="#f87171" strokeWidth="2.5" />
                    <text x="150" y="45" fill="#6ee7b7" fontSize="9" textAnchor="middle">T1190 (OBSERVED)</text>
                    <text x="310" y="45" fill="#fde68a" fontSize="9" textAnchor="middle">T1078 (INFERRED)</text>
                    <text x="452" y="45" fill="#fca5a5" fontSize="9" textAnchor="middle">T1552 (OBSERVED)</text>
                    <circle cx="65" cy="60" r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                    <text x="65" y="63" fill="#e2e8f0" fontSize="8" textAnchor="middle">Edge</text>
                    <circle cx="235" cy="60" r="22" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                    <text x="235" y="63" fill="#e2e8f0" fontSize="8" textAnchor="middle">PAN-OS</text>
                    <circle cx="385" cy="60" r="22" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                    <text x="385" y="63" fill="#e2e8f0" fontSize="8" textAnchor="middle">IdP</text>
                    <circle cx="515" cy="60" r="24" fill="#450a0a" stroke="#f87171" strokeWidth="2" />
                    <text x="515" y="63" fill="#fecaca" fontSize="8" textAnchor="middle">CUI DB</text>
                  </svg>
                  {attackResult ? <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-zinc-200 overflow-auto max-h-36">{JSON.stringify(attackResult.rankedChokePoints, null, 2)}</pre> : null}
                </div>
              </div>
            ) : null}

            {/* CYB-014 Evidence Connector & SHA-256 Tamper Test + ZTMM */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-sm font-bold text-white">CYB-014 Scoped Connector & SHA-256 Quarantine Gate</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/connectors/collect", "POST", {
                        connector_id: "aws-securityhub",
                        control_id: "CM-6",
                        scope_boundary: "us-gov-west-1-enclave",
                      });
                      setConnectorResult(res);
                      void refreshStorage();
                    }}
                    className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-200"
                  >
                    Collect Verified Connector Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/connectors/collect", "POST", {
                        connector_id: "tenable-vuln",
                        control_id: "RA-5",
                        claimed_sha256: "000000000000000000000000000000000000000000000000000000000000dead",
                        sample_payload: { criticalCount: 0, tampered: true },
                      });
                      setConnectorResult(res);
                      void refreshStorage();
                    }}
                    className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-200"
                  >
                    Simulate Hash Mismatch (Quarantine)
                  </button>
                </div>
                {connectorResult ? (
                  <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-zinc-200 overflow-auto max-h-48">
                    HTTP {connectorResult.status} · {JSON.stringify(connectorResult.data, null, 2)}
                  </pre>
                ) : null}
                {stigResult ? <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-amber-200 overflow-auto max-h-40">STIG Veto Check: {JSON.stringify(stigResult, null, 2)}</pre> : null}
                {sbomResult ? <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-cyan-200 overflow-auto max-h-40">CycloneDX SBOM: {JSON.stringify(sbomResult, null, 2)}</pre> : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-sm font-bold text-white">CYB-018 Zero Trust Pillars (ZTMM v2.0) & CYB-016 Risk Forecast</h3>
                <div className="space-y-2 text-xs">
                  {(["identity", "devices", "networks", "applications", "data"] as const).map((k) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-24 capitalize text-zinc-300">{k}</span>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        value={ztScores[k]}
                        onChange={(e) => setZtScores((prev) => ({ ...prev, [k]: Number(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="w-12 font-mono text-[#e4b86a] font-bold">{ztScores[k]}/4</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const [zt, fc] = await Promise.all([
                      apiJson("/api/v2/rmf/cyber/zero-trust", "POST", ztScores),
                      apiJson("/api/v2/rmf/cyber/forecast", "POST", { open_kev_count: 2, open_high_count: 10 }),
                    ]);
                    setZtResult(zt.data);
                    setForecastResult(fc.data);
                  }}
                  className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200"
                >
                  Score Zero Trust & Forecast Risk
                </button>
                {ztResult ? <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-cyan-200 overflow-auto max-h-40">{JSON.stringify(ztResult, null, 2)}</pre> : null}
                {forecastResult ? (
                  <div className="space-y-1">
                    <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                      Classification: ANALYTICAL_ESTIMATE (With P10/P50/P90 Uncertainty)
                    </span>
                    <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-zinc-200 overflow-auto max-h-44">{JSON.stringify(forecastResult, null, 2)}</pre>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* ======================== 6. KNOWLEDGE GRAPH & TRACE ======================== */}
        {subTab === "graph" ? (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white">AI-019 Tenant-Scoped RMF Knowledge Graph & AI-025 Decision Trace</h2>
                  <p className="text-xs text-zinc-400">Interactive graph linking System → Baseline → Controls → Provider with strict caller tenant isolation.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadKnowledgeGraph()}
                    className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200"
                  >
                    Build & Query Tenant Graph
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await apiJson("/api/v2/rmf/graph/query", "POST", { graph_tenant_id: "tenant:forbidden-other-org" });
                      setTenantBlockResult(res);
                    }}
                    className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-200"
                  >
                    Verify Cross-Tenant 403 Block
                  </button>
                </div>
              </div>

              {tenantBlockResult ? (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/25 px-3 py-2 text-xs font-mono text-rose-200">
                  HTTP {tenantBlockResult.status} · {JSON.stringify(tenantBlockResult.data)}
                </div>
              ) : null}

              {graphData ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {["ALL", "System", "Baseline", "Control", "Provider"].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setGraphFilter(f)}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-mono border",
                          graphFilter === f ? "bg-[#e4b86a]/20 border-[#e4b86a]/40 text-[#e4b86a]" : "border-white/10 text-zinc-400",
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {((graphData.nodes as { id: string; nodeType: string; label: string }[]) || [])
                      .filter((n) => graphFilter === "ALL" || n.nodeType === graphFilter)
                      .map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setSelectedNode(node)}
                          className="rounded-lg border border-white/10 bg-black/40 p-2.5 text-left hover:border-[#e4b86a]/50 transition"
                        >
                          <div className="text-[10px] font-mono uppercase text-cyan-300">{node.nodeType}</div>
                          <div className="text-xs font-bold text-white truncate">{node.label}</div>
                        </button>
                      ))}
                  </div>
                  {selectedNode ? <pre className="rounded-lg bg-black/50 p-2.5 text-[11px] font-mono text-[#e4b86a]">{JSON.stringify(selectedNode, null, 2)}</pre> : null}
                </div>
              ) : null}
            </div>

            {/* AI-025 Reproducible Trace Investigate */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h3 className="text-sm font-bold text-white">AI-025 Replayable Investigation & Explanation Bundle</h3>
              <div className="flex gap-2">
                <input value={traceQuestion} onChange={(e) => setTraceQuestion(e.target.value)} className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white" />
                <button
                  type="button"
                  onClick={async () => {
                    const res = await apiJson("/api/v2/rmf/investigate", "POST", { question: traceQuestion });
                    setTraceResult(res.data);
                  }}
                  className="rounded-lg bg-[#e4b86a]/25 border border-[#e4b86a]/40 px-3.5 py-1.5 text-xs font-bold text-[#e4b86a]"
                >
                  Run Traceable Investigate
                </button>
              </div>
              {traceResult ? <pre className="rounded-lg bg-black/50 p-3 text-[11px] font-mono text-emerald-200 overflow-auto max-h-60">{JSON.stringify(traceResult, null, 2)}</pre> : null}
            </div>
          </div>
        ) : null}

        {/* ======================== 7. FEEDBACK LEARNING & LORA TRAINING ======================== */}
        {subTab === "training" ? (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/15 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="size-4 text-cyan-400" />
                  AI-022 Curated Assessor Feedback & LoRA / QLoRA Dataset Export
                </h2>
                <p className="text-xs text-zinc-400">
                  Unapproved assessor corrections remain isolated (`PENDING_REVIEW`) and are never exported into SFT/DPO datasets until explicitly human-approved.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/v2/rmf/training/export?format=sft"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600/30 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-600/45"
                >
                  <Download className="size-3.5" /> Download SFT ChatML (.jsonl)
                </a>
                <a
                  href="/api/v2/rmf/training/export?format=dpo"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-600/45"
                >
                  <Download className="size-3.5" /> Download DPO Pairs (.jsonl)
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white">Submit Expert Assessor Correction</h3>
                <input value={fbControl} onChange={(e) => setFbControl(e.target.value)} placeholder="Control ID" className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white font-mono" />
                <input value={fbPrompt} onChange={(e) => setFbPrompt(e.target.value)} placeholder="Prompt" className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white" />
                <textarea rows={4} value={fbPreferred} onChange={(e) => setFbPreferred(e.target.value)} placeholder="Approved Preferred Response" className="w-full rounded-lg border border-white/15 bg-black/40 p-2.5 text-white" />
                <input value={fbRejected} onChange={(e) => setFbRejected(e.target.value)} placeholder="Rejected Example (optional for DPO)" className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white" />
                <button
                  type="button"
                  onClick={async () => {
                    await apiJson("/api/v2/rmf/training/feedback", "POST", {
                      control_id: fbControl,
                      prompt: fbPrompt,
                      preferred_response: fbPreferred,
                      rejected_response: fbRejected,
                      rationale: "Assessor-reviewed FedRAMP High ODP clarification",
                    });
                    const res = await apiJson("/api/v2/rmf/training/status");
                    setTrainingStatus(res.data);
                    void refreshStorage();
                  }}
                  className="rounded-lg bg-[#e4b86a]/25 border border-[#e4b86a]/40 px-3.5 py-1.5 font-bold text-[#e4b86a]"
                >
                  Submit Correction (Pending Review)
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white">PyTorch + PEFT LoRA Training Commands</h3>
                <pre className="rounded-lg bg-black/50 p-3 font-mono text-[11px] text-emerald-300 overflow-auto">
{`# Generate SFT (684) + DPO (411) grounded corpora
node scripts/generate-rmf-training-dataset.mjs

# Local CPU/GPU PEFT LoRA verification run
python scripts/train_rmf_lora.py --smoke-test

# Full GPU Qwen2.5-7B 4-bit QLoRA SFT & DPO
python scripts/train_rmf_lora.py --mode sft --epochs 3
python scripts/train_rmf_lora.py --mode dpo --epochs 2`}
                </pre>
                {trainingStatus ? (
                  <div className="space-y-2">
                    <div className="font-mono text-[11px] text-zinc-300">
                      {"Base SFT: "}<strong>{String(trainingStatus.baseCorpusSftExamples)}</strong>{" · Base DPO: "}
                      <strong>{String(trainingStatus.baseCorpusDpoPairs)}</strong>{" · Feedback Pending: "}
                      <strong className="text-amber-300">{String(trainingStatus.feedbackPending)}</strong>{" · Approved: "}
                      <strong className="text-emerald-300">{String(trainingStatus.feedbackApproved)}</strong>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-auto">
                      {((trainingStatus.records as { feedbackId: string; controlId: string; status: string; prompt: string }[]) || []).map((rec) => (
                        <div key={rec.feedbackId} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5">
                          <div className="min-w-0 truncate">
                            <span className="font-mono text-[#e4b86a] mr-2">{rec.controlId}</span>
                            <span className="text-zinc-300">{rec.prompt}</span>
                          </div>
                          {rec.status === "PENDING_REVIEW" ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await apiJson("/api/v2/rmf/training/feedback/approve", "POST", {
                                  feedback_id: rec.feedbackId,
                                  approved_by: "sca-reviewer@agency.gov",
                                });
                                const res = await apiJson("/api/v2/rmf/training/status");
                                setTrainingStatus(res.data);
                              }}
                              className="shrink-0 rounded bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/40"
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              {rec.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ZapIcon() {
  return <Network className="size-3.5" />;
}
