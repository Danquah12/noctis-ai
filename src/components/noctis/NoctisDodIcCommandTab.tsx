import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Download,
  FileCheck2,
  FileSpreadsheet,
  GitBranch,
  KeyRound,
  Lock,
  Network,
  Play,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoctisDodIcCommandTabProps {
  onSendToChat?: (text: string) => void;
  onOpenInCanvas?: (title: string, md: string) => void;
  onClose?: () => void;
}

type DodIcSubTab =
  | "overview"
  | "scanner"
  | "zt-icam"
  | "classified-dco"
  | "intel-mission"
  | "policy-change"
  | "exports-replay";

interface PolicyItem {
  id: string;
  jurisdiction: string;
  title: string;
  version: string;
  effectiveDate: string;
  issuingAuthority: string;
  scope: string;
  distinctBoundaryNote: string;
}

interface StatusPayload {
  platform: string;
  version: string;
  policiesCount: number;
  policyLineagesCount: number;
  stigLibraryBenchmarks?: number;
  stigLibraryRulesCount?: number;
  rbacEnabled?: boolean;
  scheduledDriftCronPath?: string;
  disaCci?: { version: string; counts: { totalCcis: number; rev5MappedCcis: number; distinctRev5Controls: number } };
  zeroTrustCatalog?: { pillarsCount: number; capabilitiesCount: number; targetActivities: number; advancedActivities: number; totalActivities: number; targetDeadline: string };
  engines: string[];
}

interface CallerContext {
  actorId: string;
  actorEmail: string | null;
  tenantId: string;
  authMethod: string;
  rbacRole: string;
  permissions: { canApprovePolicy: boolean; canExportArtifacts: boolean };
}

const SAMPLE_NESSUS_XML = `<?xml version="1.0" ?>
<NessusClientData_v2>
  <Report name="NDIMP-Sample-Scan">
    <ReportHost name="enclave-app-01.dod.mil">
      <HostProperties>
        <tag name="Credentialed_Scan">true</tag>
        <tag name="HOST_END">Mon Nov 22 2026</tag>
      </HostProperties>
      <ReportItem port="443" svc_name="https" protocol="tcp" severity="4" pluginID="192774" pluginName="PAN-OS Arbitrary File Read / RCE Check">
        <cve>CVE-2024-3400</cve>
        <cvss3_base_score>10.0</cvss3_base_score>
      </ReportItem>
      <ReportItem port="22" svc_name="ssh" protocol="tcp" severity="2" pluginID="70658" pluginName="SSH Server CBC Mode Ciphers Enabled">
        <cvss3_base_score>5.3</cvss3_base_score>
      </ReportItem>
    </ReportHost>
    <ReportHost name="enclave-db-02.dod.mil">
      <ReportItem port="0" svc_name="general" protocol="tcp" severity="0" pluginID="21745" pluginName="Authentication Failure - Local Checks Not Run"/>
    </ReportHost>
  </Report>
</NessusClientData_v2>`;

const SAMPLE_CKL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CHECKLIST>
  <ASSET><HOST_NAME>rhel9-node-01</HOST_NAME></ASSET>
  <STIGS><iSTIG><STIG_INFO><SI_DATA><SID_NAME>title</SID_NAME><SID_DATA>RHEL 9 STIG V2R2</SID_DATA></SI_DATA></STIG_INFO>
    <VULN>
      <STIG_DATA><VULN_ATTRIBUTE>Vuln_Num</VULN_ATTRIBUTE><ATTRIBUTE_DATA>V-257777</ATTRIBUTE_DATA></STIG_DATA>
      <STIG_DATA><VULN_ATTRIBUTE>Severity</VULN_ATTRIBUTE><ATTRIBUTE_DATA>high</ATTRIBUTE_DATA></STIG_DATA>
      <STIG_DATA><VULN_ATTRIBUTE>CCI_REF</VULN_ATTRIBUTE><ATTRIBUTE_DATA>CCI-002450</ATTRIBUTE_DATA></STIG_DATA>
      <STATUS>Open</STATUS>
      <FINDING_DETAILS>FIPS kernel mode disabled</FINDING_DETAILS>
    </VULN>
    <VULN>
      <STIG_DATA><VULN_ATTRIBUTE>Vuln_Num</VULN_ATTRIBUTE><ATTRIBUTE_DATA>V-257880</ATTRIBUTE_DATA></STIG_DATA>
      <STIG_DATA><VULN_ATTRIBUTE>Severity</VULN_ATTRIBUTE><ATTRIBUTE_DATA>medium</ATTRIBUTE_DATA></STIG_DATA>
      <STIG_DATA><VULN_ATTRIBUTE>CCI_REF</VULN_ATTRIBUTE><ATTRIBUTE_DATA>CCI-000765</ATTRIBUTE_DATA></STIG_DATA>
      <STATUS>NotAFinding</STATUS>
      <FINDING_DETAILS>SSSD smartcard + fail-closed OCSP verified on host.</FINDING_DETAILS>
    </VULN>
  </iSTIG></STIGS>
</CHECKLIST>`;

const SAMPLE_SIGMA_YAML = `title: Suspicious LSASS Credential Dump via Process Access
id: 7a3f9a10-2026-4d1a-9f88-112233445566
status: stable
level: critical
logsource:
  category: process_access
  product: windows
detection:
  selection:
    TargetImage|endswith: '\\lsass.exe'
  condition: selection
tags:
  - attack.credential_access
  - attack.t1003.001`;

function badgeColor(verdict?: string) {
  const v = (verdict || "").toUpperCase();
  if (v === "PASS" || v === "APPROVED_FOR_ROLLOUT" || v === "VERIFIED") {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  }
  if (v === "FAIL" || v === "FAIL_CLOSED_BLOCK" || v === "REJECTED") {
    return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  }
  return "bg-amber-500/15 text-amber-300 border-amber-500/30";
}

export function NoctisDodIcCommandTab({ onSendToChat, onOpenInCanvas, onClose }: NoctisDodIcCommandTabProps) {
  const [subTab, setSubTab] = useState<DodIcSubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [caller, setCaller] = useState<CallerContext | null>(null);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [jurFilter, setJurFilter] = useState<string>("ALL");
  const [policySearch, setPolicySearch] = useState("");
  const [busyMsg, setBusyMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // Scanner / CCI / STIG Library state
  const [scanInput, setScanInput] = useState(SAMPLE_NESSUS_XML);
  const [scanMode, setScanMode] = useState<"acas" | "stig">("acas");
  const [scanResult, setScanResult] = useState<any>(null);
  const [cciQuery, setCciQuery] = useState("CCI-000765");
  const [cciLookupOut, setCciLookupOut] = useState<any>(null);
  const [stigBenchmark, setStigBenchmark] = useState("RHEL_9_STIG");
  const [stigSearchQ, setStigSearchQ] = useState("");
  const [stigRules, setStigRules] = useState<any[]>([]);

  // Zero Trust & ICAM state
  const [ztScores, setZtScores] = useState({ user: 3, device: 3, network: 2, apps: 3, data: 3, vis: 3, auto: 2 });
  const [ztResult, setZtResult] = useState<any>(null);
  const [icamInput, setIcamInput] = useState({
    credential_type: "SMS_OTP",
    is_privileged: true,
    separate_alt_token: false,
    ocsp_crl_checked: true,
    revocation_fail_closed: false,
  });
  const [icamResult, setIcamResult] = useState<any>(null);

  // Classified & Sigma/DCO state
  const [sanitizeInput, setSanitizeInput] = useState({
    media_type: "SSD_FLASH",
    highest_classification: "TS_SCI",
    proposed_method: "DEGAUSS_NSA_EPL",
    destination_boundary: "LOWER_OR_UNCLASSIFIED_RELEASE",
  });
  const [classifiedOut, setClassifiedOut] = useState<any>(null);
  const [sigmaYaml, setSigmaYaml] = useState(SAMPLE_SIGMA_YAML);
  const [sigmaResult, setSigmaResult] = useState<any>(null);

  // Intel ACH & Mission/CMMC state
  const [achConfidence, setAchConfidence] = useState<"HIGH" | "MODERATE" | "LOW">("HIGH");
  const [achAdmiralty, setAchAdmiralty] = useState("F6");
  const [achResult, setAchResult] = useState<any>(null);
  const [cmmcDays, setCmmcDays] = useState(210);
  const [dfarsHours, setDfarsHours] = useState(96);
  const [fociInstrument, setFociInstrument] = useState("NONE");
  const [missionAcqOut, setMissionAcqOut] = useState<any>(null);

  // Policy Change & Dual-Control state
  const [lineages, setLineages] = useState<any[]>([]);
  const [selectedLineage, setSelectedLineage] = useState<any>(null);
  const [driftReport, setDriftReport] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [newPropTitle, setNewPropTitle] = useState("Enforce 24-hour OCSP stapled freshness check");
  const [newPropPolicyId, setNewPropPolicyId] = useState("DODI-8520.02");
  const [newPropProposer, setNewPropProposer] = useState("issm-author@dod.mil");
  const [reviewerId, setReviewerId] = useState("sca-reviewer@dod.mil");
  const [reviewerRole, setReviewerRole] = useState("ISSM_HUMAN");
  const [reviewOutcome, setReviewOutcome] = useState<any>(null);

  // Exports & Trace Replay state
  const [exportSysName, setExportSysName] = useState("Noctis Sovereign Enclave Workload");
  const [exportEmassId, setExportEmassId] = useState("EMASS-90421");
  const [exportIl, setExportIl] = useState<"IL2" | "IL4" | "IL5" | "IL6">("IL5");
  const [binderOut, setBinderOut] = useState<any>(null);
  const [traceIdInput, setTraceIdInput] = useState("");
  const [traceReplayOut, setTraceReplayOut] = useState<any>(null);

  async function loadInitial() {
    setLoading(true);
    setErrMsg("");
    try {
      const [sRes, pRes, aRes, lRes, prRes] = await Promise.all([
        fetch("/api/v2/dod-ic/status").then((r) => r.json()),
        fetch("/api/v2/dod-ic/policies").then((r) => r.json()),
        fetch("/api/v2/dod-ic/auth/me").then((r) => r.json()),
        fetch("/api/v2/dod-ic/policy-change/lineage").then((r) => r.json()),
        fetch("/api/v2/dod-ic/policy-change/proposals").then((r) => r.json()),
      ]);
      setStatus(sRes);
      setPolicies(Array.isArray(pRes.policies) ? pRes.policies : []);
      setCaller(aRes);
      setLineages(Array.isArray(lRes.lineages) ? lRes.lineages : []);
      setProposals(Array.isArray(prRes.proposals) ? prRes.proposals : []);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Failed to load NDIMP Command telemetry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitial();
    void loadStigLibrary("RHEL_9_STIG", "");
  }, []);

  async function loadStigLibrary(benchmark: string, q: string) {
    try {
      const params = new URLSearchParams();
      if (benchmark && benchmark !== "ALL") params.set("benchmark", benchmark);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/v2/dod-ic/stig/library?${params.toString()}`).then((r) => r.json());
      setStigRules(Array.isArray(res.rules) ? res.rules : []);
    } catch {
      /* ignore */
    }
  }

  async function runScannerAnalysis() {
    setBusyMsg("Running ACAS/STIG deterministic evaluation...");
    setErrMsg("");
    try {
      const isCkl = /<(?:CHECKLIST|STIG_INFO|rule-result|Benchmark)\b/i.test(scanInput) || scanMode === "stig";
      const url = isCkl ? "/api/v2/dod-ic/stig/evaluate" : "/api/v2/dod-ic/acas/analyze";
      const body = isCkl
        ? /rule-result|Benchmark/i.test(scanInput)
          ? { xccdf_xml: scanInput }
          : { ckl_xml: scanInput }
        : { nessus_xml: scanInput };
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      setScanResult({ mode: isCkl ? "STIG" : "ACAS", data: res });
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Scanner analysis error.");
    } finally {
      setBusyMsg("");
    }
  }

  async function handleFileDrop(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0]!;
    const txt = await f.text();
    setScanInput(txt);
    if (/\.(ckl|xccdf)$/i.test(f.name) || /<(?:CHECKLIST|STIG_INFO|Benchmark)\b/i.test(txt)) {
      setScanMode("stig");
    } else {
      setScanMode("acas");
    }
  }

  async function runCciLookup() {
    const clean = cciQuery.trim().toUpperCase();
    if (!clean) return;
    const isCci = /^CCI-\d+$/i.test(clean);
    const url = isCci ? `/api/v2/dod-ic/cci/${encodeURIComponent(clean)}` : `/api/v2/dod-ic/cci/by-control/${encodeURIComponent(clean)}`;
    const res = await fetch(url).then((r) => r.json());
    setCciLookupOut(res);
  }

  async function downloadEmassXlsx() {
    setBusyMsg("Building OOXML eMASS .xlsx workbook...");
    try {
      const res = await fetch("/api/v2/dod-ic/export/emass-xlsx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system_name: exportSysName, emass_system_id: exportEmassId, impact_level: exportIl }),
      });
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `noctis-${exportEmassId.toLowerCase()}-emass.xlsx`;
      a.click();
      URL.revokeObjectURL(dlUrl);
    } finally {
      setBusyMsg("");
    }
  }

  async function generateBinder() {
    const res = await fetch("/api/v2/dod-ic/export/binder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system_name: exportSysName, emass_system_id: exportEmassId, impact_level: exportIl }),
    }).then((r) => r.json());
    setBinderOut(res);
  }

  const filteredPolicies = policies.filter((p) => {
    if (jurFilter !== "ALL" && p.jurisdiction !== jurFilter) return false;
    if (!policySearch.trim()) return true;
    const needle = policySearch.toLowerCase();
    return `${p.id} ${p.title} ${p.scope} ${p.issuingAuthority}`.toLowerCase().includes(needle);
  });

  const navTabs: { id: DodIcSubTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview & 32 Directives", icon: <Shield className="size-3.5" /> },
    { id: "scanner", label: "ACAS / STIG / CCI", icon: <Upload className="size-3.5" /> },
    { id: "zt-icam", label: "Zero Trust & ICAM", icon: <KeyRound className="size-3.5" /> },
    { id: "classified-dco", label: "Classified & Sigma/DCO", icon: <Lock className="size-3.5" /> },
    { id: "intel-mission", label: "ACH Intel & Mission/CMMC", icon: <Network className="size-3.5" /> },
    { id: "policy-change", label: "Policy Drift & Dual-Control", icon: <GitBranch className="size-3.5" /> },
    { id: "exports-replay", label: "eMASS .xlsx & Trace Replay", icon: <FileSpreadsheet className="size-3.5" /> },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0b0e14] text-zinc-100 overflow-hidden">
      {/* Header Bar */}
      <div className="shrink-0 border-b border-white/10 bg-[#0e121a] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="size-3.5" />
              Back to Chat
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-emerald-400" />
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
                Noctis NDIMP Defense & IC Command Center
              </h1>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {status?.version ? `v${status.version}` : "v4.0.0"} · Waves 1–4
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Deterministic DoDI 8510.01 · ODNI ICD 503/705/203 · DISA CCI (2025-01-23) · CNSA 2.0 · CMMC 32 CFR 170 · Gate 0 Fail-Closed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {caller && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
              <span className="text-zinc-400">RBAC:</span> <span className="font-semibold text-sky-300">{caller.rbacRole}</span>{" "}
              <span className="text-zinc-500">({caller.authMethod})</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => void loadInitial()}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 flex items-center gap-1"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="shrink-0 border-b border-white/10 bg-[#0d1118] px-4 py-2 flex flex-wrap gap-1.5">
        {navTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border",
              subTab === t.id
                ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/35"
                : "bg-white/[0.03] text-zinc-400 border-white/5 hover:text-white hover:bg-white/10",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {busyMsg && (
        <div className="shrink-0 bg-sky-500/10 border-b border-sky-500/20 px-4 py-1.5 text-xs text-sky-300 flex items-center gap-2">
          <Activity className="size-3.5 animate-pulse" />
          {busyMsg}
        </div>
      )}
      {errMsg && (
        <div className="shrink-0 bg-rose-500/10 border-b border-rose-500/20 px-4 py-1.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="size-3.5" />
          {errMsg}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto noctis-thin-scroll p-4 sm:p-6 space-y-6">
        {subTab === "overview" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] text-zinc-400">Verified Directives</div>
                <div className="text-xl font-bold text-emerald-300">{status?.policiesCount ?? 32}</div>
                <div className="text-[10px] text-zinc-500">UNCLASSIFIED Public</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] text-zinc-400">Official DISA CCIs</div>
                <div className="text-xl font-bold text-sky-300">{status?.disaCci?.counts?.totalCcis?.toLocaleString() ?? "5,137"}</div>
                <div className="text-[10px] text-zinc-500 whitespace-nowrap">{`CCI List ${status?.disaCci?.version ?? "2025-01-23"}`}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] text-zinc-400">Indexed STIG Rules</div>
                <div className="text-xl font-bold text-amber-300">{status?.stigLibraryRulesCount ?? 26}</div>
                <div className="text-[10px] text-zinc-500">{status?.stigLibraryBenchmarks ?? 5} Benchmarks</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] text-zinc-400">Zero Trust Target</div>
                <div className="text-xl font-bold text-purple-300">{status?.zeroTrustCatalog?.targetActivities ?? 91}</div>
                <div className="text-[10px] text-zinc-500">{`7 Pillars · ${status?.zeroTrustCatalog?.targetDeadline ?? "FY 2027"}`}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] text-zinc-400">Revision Lineages</div>
                <div className="text-xl font-bold text-cyan-300">{status?.policyLineagesCount ?? 12}</div>
                <div className="text-[10px] text-zinc-500">Dual-Control Protected</div>
              </div>
            </div>

            {/* Filter & Policy Catalog */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {["ALL", "DOD", "IC", "CNSS", "FEDERAL"].map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setJurFilter(j)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border",
                      jurFilter === j
                        ? "bg-sky-500/20 text-sky-200 border-sky-500/40"
                        : "bg-white/5 text-zinc-400 border-white/10 hover:text-white",
                    )}
                  >
                    {j}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="size-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  placeholder="Search 32 DoD / IC directives..."
                  className="w-full rounded-lg border border-white/10 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPolicies.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-300">{p.id}</span>
                      <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">{p.jurisdiction}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">Eff: {p.effectiveDate}</span>
                  </div>
                  <div className="text-sm font-medium text-white">{p.title}</div>
                  <p className="text-xs text-zinc-400 line-clamp-2">{p.scope}</p>
                  <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                    {p.distinctBoundaryNote}
                  </div>
                  {onSendToChat && (
                    <button
                      type="button"
                      onClick={() => onSendToChat(`Explain ${p.id} (${p.effectiveDate}) requirements, boundaries, and verification controls.`)}
                      className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-1 pt-1"
                    >
                      <Send className="size-3" /> Ask Noctis Chat
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {subTab === "scanner" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* File Dropzone & Raw Scanner Evaluation */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">ACAS (.nessus) / DISA STIG (.ckl) / SCAP XCCDF Analyzer</h2>
                  <p className="text-xs text-zinc-400">Deduplicates findings across hosts, checks CISA KEV, flags credentialed scan failures (19506/21745), and maps CCIs to NIST Rev. 5.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setScanMode("acas"); setScanInput(SAMPLE_NESSUS_XML); }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
                  >
                    Load Sample .nessus
                  </button>
                  <button
                    type="button"
                    onClick={() => { setScanMode("stig"); setScanInput(SAMPLE_CKL_XML); }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
                  >
                    Load Sample .ckl
                  </button>
                  <label className="rounded-lg border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs text-sky-200 cursor-pointer hover:bg-sky-500/25">
                    Upload .nessus/.ckl/.xml
                    <input type="file" accept=".nessus,.ckl,.xml,.xccdf" className="hidden" onChange={(e) => void handleFileDrop(e.target.files)} />
                  </label>
                </div>
              </div>
              <textarea
                rows={6}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-xs text-zinc-200 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void runScannerAnalysis()}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <Play className="size-3.5" /> Analyze Scan Payload
                </button>
                {onSendToChat && (
                  <button
                    type="button"
                    onClick={() => onSendToChat(`Analyze this scan payload under DoDI 8531.01 and DISA STIG:\n${scanInput.slice(0, 1800)}`)}
                    className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-zinc-200 flex items-center gap-1.5"
                  >
                    <Send className="size-3.5" /> Escalate to Noctis Chat
                  </button>
                )}
              </div>

              {scanResult && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", badgeColor(scanResult.data?.ruleResult?.verdict))}>
                      {scanResult.data?.ruleResult?.verdict}
                    </span>
                    <span className="font-semibold text-white">{scanResult.data?.ruleResult?.title}</span>
                  </div>
                  <p className="text-zinc-300">{scanResult.data?.ruleResult?.summary}</p>
                </div>
              )}
            </div>

            {/* DISA CCI & Pre-Indexed STIG Library */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Official DISA CCI Explorer (2025-01-23)</h3>
                <div className="flex gap-2">
                  <input
                    value={cciQuery}
                    onChange={(e) => setCciQuery(e.target.value)}
                    placeholder="CCI-000765 or IA-2(1)"
                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void runCciLookup()}
                    className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Lookup
                  </button>
                </div>
                {cciLookupOut && (
                  <pre className="max-h-60 overflow-auto rounded-lg bg-black/50 p-2.5 text-[11px] text-zinc-300">
                    {JSON.stringify(cciLookupOut, null, 2)}
                  </pre>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Pre-Indexed Public DISA STIG Library</h3>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={stigBenchmark}
                    onChange={(e) => {
                      setStigBenchmark(e.target.value);
                      void loadStigLibrary(e.target.value, stigSearchQ);
                    }}
                    className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="RHEL_9_STIG">RHEL 9 STIG V2R2</option>
                    <option value="WIN_2022_STIG">Windows Server 2022 STIG V2R2</option>
                    <option value="K8S_STIG">Kubernetes STIG V2R1</option>
                    <option value="PGSQL_STIG">PostgreSQL STIG V1R1</option>
                    <option value="ASD_STIG">ASD STIG V6R2</option>
                    <option value="ALL">All Benchmarks</option>
                  </select>
                  <input
                    value={stigSearchQ}
                    onChange={(e) => setStigSearchQ(e.target.value)}
                    placeholder="Search V-ID, FIPS, SSH, etcd..."
                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void loadStigLibrary(stigBenchmark, stigSearchQ)}
                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white"
                  >
                    Search
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {stigRules.map((r) => (
                    <div key={r.groupId} className="rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-300">{r.groupId} · {r.severity}</span>
                        <span className="text-[10px] text-zinc-400">
                          {`NIST Rev 5: ${(r.nistRev5Controls?.length ? r.nistRev5Controls : r.nistRev4Controls || []).join(", ")}`}
                        </span>
                      </div>
                      <div className="text-zinc-200">{r.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === "zt-icam" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">DoD 7-Pillar Zero Trust (FY 2027) & CISA ZTMM v2.0</h2>
              <div className="space-y-2">
                {([
                  ["user", "User Pillar"],
                  ["device", "Device Pillar"],
                  ["network", "Network & Env Pillar"],
                  ["apps", "Applications & Workloads"],
                  ["data", "Data Pillar"],
                  ["vis", "Visibility & Analytics"],
                  ["auto", "Automation & Orchestration"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-zinc-300 w-44">{label}</span>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      value={ztScores[key]}
                      onChange={(e) => setZtScores({ ...ztScores, [key]: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="font-mono text-emerald-300 w-8 text-right">{ztScores[key]}/4</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/dod-ic/zero-trust/evaluate", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      is_nss: true,
                      user_score: ztScores.user,
                      device_score: ztScores.device,
                      network_score: ztScores.network,
                      applications_score: ztScores.apps,
                      data_score: ztScores.data,
                      visibility_score: ztScores.vis,
                      automation_score: ztScores.auto,
                    }),
                  }).then((r) => r.json());
                  setZtResult(res);
                }}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Evaluate FY 2027 Readiness
              </button>
              {ztResult && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                  <div className="font-semibold text-white">
                    Target Readiness: <span className="text-emerald-300">{ztResult.targetReadinessPercent}%</span> · Status:{" "}
                    <span className="text-amber-300">{ztResult.fy2027Status}</span>
                  </div>
                  <div className="text-zinc-400">
                    CISA ZTMM v2.0 Overall: {ztResult.cisaZtmmCrosswalk?.overallStage} · Weakest: {ztResult.cisaZtmmCrosswalk?.weakestPillar}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">DoDI 8520.02 / 8520.03 PKI, CAC/ALT & OCSP Validator</h2>
              <div className="space-y-2 text-xs">
                <label className="block text-zinc-400">
                  Credential Type
                  <select
                    value={icamInput.credential_type}
                    onChange={(e) => setIcamInput({ ...icamInput, credential_type: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white"
                  >
                    <option value="DOD_PKI_ALT_TOKEN">DoD PKI ALT Token (Privileged)</option>
                    <option value="CAC">DoD CAC</option>
                    <option value="PIV">Federal PIV (FIPS 201-3)</option>
                    <option value="FIDO2_HARDWARE">FIDO2 Hardware</option>
                    <option value="SMS_OTP">SMS OTP (Non-Compliant)</option>
                    <option value="STATIC_SSH_KEY">Static SSH Key</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-zinc-300">
                  <input
                    type="checkbox"
                    checked={icamInput.revocation_fail_closed}
                    onChange={(e) => setIcamInput({ ...icamInput, revocation_fail_closed: e.target.checked })}
                  />
                  Enforce Fail-Closed OCSP/CRL Revocation Check
                </label>
                <label className="flex items-center gap-2 text-zinc-300">
                  <input
                    type="checkbox"
                    checked={icamInput.separate_alt_token}
                    onChange={(e) => setIcamInput({ ...icamInput, separate_alt_token: e.target.checked })}
                  />
                  Separate Privileged Admin Account + ALT Token
                </label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/dod-ic/icam/evaluate", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(icamInput),
                  }).then((r) => r.json());
                  setIcamResult(res);
                }}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Evaluate PKI / ICAM Compliance
              </button>
              {icamResult && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", badgeColor(icamResult.ruleResult?.verdict))}>
                    {icamResult.ruleResult?.verdict}
                  </span>
                  <p className="text-zinc-300 pt-1">{icamResult.ruleResult?.summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === "classified-dco" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">NIST SP 800-88 Rev. 2 Sanitization & Classified Policy Evaluator</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={sanitizeInput.media_type}
                  onChange={(e) => setSanitizeInput({ ...sanitizeInput, media_type: e.target.value })}
                  className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-white"
                >
                  <option value="SSD_FLASH">SSD / NAND Flash</option>
                  <option value="HDD_MAGNETIC">HDD Magnetic</option>
                  <option value="VOLATILE_RAM">Volatile RAM</option>
                </select>
                <select
                  value={sanitizeInput.highest_classification}
                  onChange={(e) => setSanitizeInput({ ...sanitizeInput, highest_classification: e.target.value })}
                  className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-white"
                >
                  <option value="TS_SCI">TS_SCI</option>
                  <option value="SECRET">SECRET</option>
                  <option value="CUI">CUI</option>
                </select>
                <select
                  value={sanitizeInput.proposed_method}
                  onChange={(e) => setSanitizeInput({ ...sanitizeInput, proposed_method: e.target.value })}
                  className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-white col-span-2"
                >
                  <option value="DEGAUSS_NSA_EPL">Magnetic Degaussing (NSA EPL)</option>
                  <option value="CLEAR_FORMAT">Clear / OS Format</option>
                  <option value="DESTROY_NSA_EPL_SHRED_DISINTEGRATE">Physical Destroy (NSA/CSS EPL Shred/Disintegrate)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/dod-ic/classified/sanitize", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(sanitizeInput),
                  }).then((r) => r.json());
                  setClassifiedOut(res);
                }}
                className="rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Check SP 800-88 R2 Compliance
              </button>
              {classifiedOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", badgeColor(classifiedOut.ruleResult?.verdict))}>
                    {classifiedOut.ruleResult?.verdict}
                  </span>
                  <p className="text-zinc-300 pt-1">{classifiedOut.ruleResult?.summary}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Sigma YAML Parser & MITRE ATT&CK Navigator v4.5 Exporter</h2>
              <textarea
                rows={7}
                value={sigmaYaml}
                onChange={(e) => setSigmaYaml(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 p-2.5 font-mono text-xs text-zinc-200"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch("/api/v2/dod-ic/dco/sigma-navigator", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ sigma_yaml: sigmaYaml, layer_name: "Noctis NDIMP SOC Coverage" }),
                    }).then((r) => r.json());
                    setSigmaResult(res);
                  }}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Parse Sigma & Build Navigator Layer
                </button>
                {sigmaResult?.navigator?.layer && (
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(sigmaResult.navigator.layer, null, 2)], { type: "application/json" });
                      const u = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = u;
                      a.download = "noctis-attack-navigator-layer.json";
                      a.click();
                      URL.revokeObjectURL(u);
                    }}
                    className="rounded-lg border border-sky-500/40 bg-sky-500/20 px-3 py-1.5 text-xs text-sky-200 flex items-center gap-1"
                  >
                    <Download className="size-3.5" /> Download Navigator .json
                  </button>
                )}
              </div>
              {sigmaResult && (
                <pre className="max-h-48 overflow-auto rounded-lg bg-black/50 p-2.5 text-[11px] text-zinc-300">
                  {JSON.stringify(sigmaResult.sigma, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {subTab === "intel-mission" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">ODNI ICD 203 ACH & NATO 6x6 Evaluator</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="text-zinc-400">
                  Claimed Confidence
                  <select
                    value={achConfidence}
                    onChange={(e) => setAchConfidence(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-white"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="LOW">LOW</option>
                  </select>
                </label>
                <label className="text-zinc-400">
                  NATO 6x6 Code
                  <select
                    value={achAdmiralty}
                    onChange={(e) => setAchAdmiralty(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-white"
                  >
                    <option value="F6">F6 (Cannot be judged)</option>
                    <option value="B2">B2 (Usually Reliable / Probably True)</option>
                    <option value="A1">A1 (Completely Reliable / Confirmed)</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/dod-ic/intel/icd203-ach", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      hypotheses: [
                        { id: "H1", label: "Routine Exercise" },
                        { id: "H2", label: "Operational Posture Change" },
                      ],
                      evidence: [
                        { id: "E1", description: "Primary indicator", admiraltyCode: achAdmiralty, ratingsByHypothesis: { H1: "INCONSISTENT", H2: "CONSISTENT" } },
                      ],
                      admiralty_codes: [achAdmiralty],
                      source_count: 1,
                      claimed_confidence: achConfidence,
                      alternatives_considered: true,
                    }),
                  }).then((r) => r.json());
                  setAchResult(res);
                }}
                className="rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Evaluate ACH & ICD 203
              </button>
              {achResult && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", badgeColor(achResult.ruleResult?.verdict))}>
                    {achResult.ruleResult?.verdict}
                  </span>
                  <p className="text-zinc-300 pt-1">{achResult.ruleResult?.summary}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">CMMC (32 CFR 170), DFARS 7012 & NISPOM FOCI Checker</h2>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="text-zinc-400">
                  POA&M Days
                  <input
                    type="number"
                    value={cmmcDays}
                    onChange={(e) => setCmmcDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-white"
                  />
                </label>
                <label className="text-zinc-400">
                  DFARS 7012 (h)
                  <input
                    type="number"
                    value={dfarsHours}
                    onChange={(e) => setDfarsHours(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-white"
                  />
                </label>
                <label className="text-zinc-400">
                  FOCI Mitigation
                  <select
                    value={fociInstrument}
                    onChange={(e) => setFociInstrument(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-white"
                  >
                    <option value="NONE">NONE</option>
                    <option value="SSA">SSA</option>
                    <option value="PROXY_AGREEMENT">Proxy Agreement</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/dod-ic/acquisition/cmmc-foci", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      cmmc_level: "LEVEL_2_C3PAO",
                      nist_800_171_percent: 85,
                      poam_closeout_days: cmmcDays,
                      dfars_incident_hours: dfarsHours,
                      has_foci: true,
                      foci_instrument: fociInstrument,
                    }),
                  }).then((r) => r.json());
                  setMissionAcqOut(res);
                }}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Evaluate CMMC / DFARS / FOCI
              </button>
              {missionAcqOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", badgeColor(missionAcqOut.ruleResult?.verdict))}>
                    {missionAcqOut.ruleResult?.verdict}
                  </span>
                  <p className="text-zinc-300 pt-1">{missionAcqOut.ruleResult?.summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === "policy-change" && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">Live Upstream Authoritative Drift Monitor & 12-Lineage Diffs</h2>
                  <p className="text-xs text-zinc-400">
                    Upstream OSCAL / DISA CCI / CISA KEV drift NEVER auto-applies (<code className="text-emerald-300">autoApplyToProduction: false</code>).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setBusyMsg("Checking upstream DISA CCI, NIST OSCAL & CISA KEV feeds...");
                    try {
                      const d = await fetch("/api/v2/dod-ic/policy-change/drift?live=true").then((r) => r.json());
                      setDriftReport(d);
                    } finally {
                      setBusyMsg("");
                    }
                  }}
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Run Live Upstream Drift Check
                </button>
              </div>
              {driftReport && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                  <div className="text-emerald-300 font-semibold">
                    Status: {driftReport.overallStatus} · Auto-Apply: {String(driftReport.autoApplyToProduction)} · KEV Count: {driftReport.kevStatus?.catalogCount}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {lineages.map((l) => (
                  <button
                    key={l.policyId}
                    type="button"
                    onClick={async () => {
                      const rep = await fetch(`/api/v2/dod-ic/policy-change/lineage?policy=${encodeURIComponent(l.policyId)}`).then((r) => r.json());
                      setSelectedLineage(rep);
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] text-zinc-200"
                  >
                    {l.policyId}
                  </button>
                ))}
              </div>
              {selectedLineage && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                  <div className="font-semibold text-white">
                    {selectedLineage.policyId}: {selectedLineage.priorVersion} ({selectedLineage.priorEffectiveDate}) → {selectedLineage.currentVersion} ({selectedLineage.currentEffectiveDate})
                  </div>
                  <div className="text-zinc-400">
                    {`Blast Radius: ${selectedLineage.blastRadius?.mappedDisaCciCount ?? 0} DISA CCIs across ${(selectedLineage.blastRadius?.impactedNistControls || []).join(", ")}`}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Dual-Control Policy Rollout Approval Queue</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <input value={newPropPolicyId} onChange={(e) => setNewPropPolicyId(e.target.value)} className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white" placeholder="Policy ID" />
                <input value={newPropTitle} onChange={(e) => setNewPropTitle(e.target.value)} className="sm:col-span-2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white" placeholder="Proposal Title" />
                <input value={newPropProposer} onChange={(e) => setNewPropProposer(e.target.value)} className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white" placeholder="Proposer ID" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/v2/dod-ic/policy-change/propose", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        policy_id: newPropPolicyId,
                        title: newPropTitle,
                        proposed_by: newPropProposer,
                        rationale: "Operator-initiated DoD/IC policy update check.",
                        new_requirements: [newPropTitle],
                      }),
                    });
                    const pr = await fetch("/api/v2/dod-ic/policy-change/proposals").then((r) => r.json());
                    setProposals(Array.isArray(pr.proposals) ? pr.proposals : []);
                  }}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 font-semibold text-white"
                >
                  Create Proposal
                </button>
                <span className="text-zinc-400">Reviewer:</span>
                <input value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} className="rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-white" />
                <select value={reviewerRole} onChange={(e) => setReviewerRole(e.target.value)} className="rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-white">
                  <option value="ISSM_HUMAN">ISSM_HUMAN</option>
                  <option value="AO_HUMAN">AO_HUMAN</option>
                  <option value="AGENT">AGENT (Must Block 403)</option>
                </select>
              </div>
              {reviewOutcome && (
                <div className="rounded-lg border border-white/10 bg-black/50 p-2.5 text-xs text-zinc-200">
                  Decision Result: <span className="font-mono font-bold text-amber-300">{reviewOutcome.errorCode || reviewOutcome.proposal?.status}</span> — {reviewOutcome.message || "Recorded in hash-chained SQL ledger."}
                </div>
              )}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {proposals.map((p) => (
                  <div key={p.id} className="rounded-lg border border-white/10 bg-black/40 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-mono text-sky-300">{p.id}</span> · <span className="text-white">{p.title}</span>{" "}
                      <span className={cn("ml-2 rounded-full border px-2 py-0.5 text-[10px]", badgeColor(p.status))}>{p.status}</span>
                    </div>
                    {p.status === "PENDING_HUMAN_REVIEW" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await fetch("/api/v2/dod-ic/policy-change/review", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              proposal_id: p.id,
                              decision: "APPROVE",
                              reviewer_id: reviewerId,
                              reviewer_role: reviewerRole,
                              regression_suite_passed: true,
                            }),
                          }).then((res) => res.json());
                          setReviewOutcome(r);
                          const pr = await fetch("/api/v2/dod-ic/policy-change/proposals").then((res) => res.json());
                          setProposals(Array.isArray(pr.proposals) ? pr.proposals : []);
                        }}
                        className="rounded bg-emerald-600/80 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {subTab === "exports-replay" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">eMASS / Xacta .xlsx Workbook & Authorization Binder</h2>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <input value={exportSysName} onChange={(e) => setExportSysName(e.target.value)} className="col-span-2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white" />
                <input value={exportEmassId} onChange={(e) => setExportEmassId(e.target.value)} className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white" />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={exportIl} onChange={(e) => setExportIl(e.target.value as any)} className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white">
                  <option value="IL4">IL4 (CUI)</option>
                  <option value="IL5">IL5 (NSS)</option>
                  <option value="IL6">IL6 (SIPR)</option>
                </select>
                <button
                  type="button"
                  onClick={() => void downloadEmassXlsx()}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="size-3.5" /> Download eMASS .xlsx
                </button>
                <button
                  type="button"
                  onClick={() => void generateBinder()}
                  className="rounded-lg border border-sky-500/40 bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-200 flex items-center gap-1.5"
                >
                  <FileCheck2 className="size-3.5" /> Generate Binder Markdown
                </button>
              </div>
              {binderOut && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>SHA-256: <code className="text-emerald-300">{binderOut.sha256?.slice(0, 16)}...</code></span>
                    {onOpenInCanvas && (
                      <button
                        type="button"
                        onClick={() => onOpenInCanvas(binderOut.title, binderOut.markdown)}
                        className="text-sky-300 hover:text-sky-200 flex items-center gap-1"
                      >
                        <Sparkles className="size-3" /> Open in Canvas
                      </button>
                    )}
                  </div>
                  <pre className="max-h-56 overflow-auto rounded-lg bg-black/50 p-2.5 text-[11px] text-zinc-300 whitespace-pre-wrap">
                    {binderOut.markdown}
                  </pre>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">SQL Explanation Trace Replay Inspector (EXPL-...)</h2>
              <div className="flex gap-2">
                <input
                  value={traceIdInput}
                  onChange={(e) => setTraceIdInput(e.target.value)}
                  placeholder="Enter EXPL-... trace ID (e.g. EXPL-03967B306400)"
                  className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 font-mono text-xs text-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!traceIdInput.trim()) return;
                    const res = await fetch(`/api/v2/dod-ic/explanations/${encodeURIComponent(traceIdInput.trim())}`).then((r) => r.json());
                    setTraceReplayOut(res);
                  }}
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Verify SHA-256 Replay
                </button>
              </div>
              {traceReplayOut && (
                <pre className="max-h-64 overflow-auto rounded-lg bg-black/50 p-2.5 text-[11px] text-zinc-300">
                  {JSON.stringify(traceReplayOut, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
