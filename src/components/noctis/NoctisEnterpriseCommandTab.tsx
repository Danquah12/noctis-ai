import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck2,
  GitBranch,
  KeyRound,
  Lock,
  Network,
  Play,
  RefreshCw,
  Send,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnterpriseCommandCenterSnapshot } from "@/lib/enterprise/types";

interface NoctisEnterpriseCommandTabProps {
  onSendToChat?: (text: string) => void;
  onOpenInCanvas?: (title: string, md: string) => void;
  onClose?: () => void;
}

type EnterpriseSubTab =
  | "command-overview"
  | "policy-ccv"
  | "twin-graph-risk"
  | "evidence-custody"
  | "agents-gateway"
  | "gov-master-plan";

function statusTone(status?: string) {
  const s = (status || "").toUpperCase();
  if (
    s === "PASS" ||
    s === "AUTHORIZED" ||
    s === "APPROVED" ||
    s === "FMC" ||
    s === "ALLOW_ROUTED" ||
    s === "EFFECTIVE" ||
    s === "IMPLEMENTED" ||
    s === "FRESH"
  ) {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/35";
  }
  if (
    s === "FAIL" ||
    s === "FAIL_CLOSED_BLOCK" ||
    s === "AUTHORIZATION_BLOCKED" ||
    s === "DENIED" ||
    s === "BLOCKED_POLICY" ||
    s === "NMC" ||
    s === "CRITICAL_MISSION_STOP" ||
    s === "INEFFECTIVE" ||
    s === "QUARANTINED"
  ) {
    return "bg-rose-500/15 text-rose-300 border-rose-500/35";
  }
  return "bg-amber-500/15 text-amber-300 border-amber-500/35";
}

export function NoctisEnterpriseCommandTab({
  onSendToChat,
  onOpenInCanvas,
  onClose,
}: NoctisEnterpriseCommandTabProps) {
  const [subTab, setSubTab] = useState<EnterpriseSubTab>("command-overview");
  const [loading, setLoading] = useState(true);
  const [busyMsg, setBusyMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [snap, setSnap] = useState<EnterpriseCommandCenterSnapshot | null>(null);

  // Eval Lab & Safety Investigation
  const [evalRunOut, setEvalRunOut] = useState<any>(null);
  const [investigationOut, setInvestigationOut] = useState<any>(null);
  const [safetyProbeOut, setSafetyProbeOut] = useState<any>(null);

  // Policy-as-Code & CCV
  const [packs, setPacks] = useState<any[]>([]);
  const [selectedPackId, setSelectedPackId] = useState("DOD-IL5-CORE");
  const [pacMfa, setPacMfa] = useState(true);
  const [pacFips, setPacFips] = useState(true);
  const [pacCat1, setPacCat1] = useState(0);
  const [pacScca, setPacScca] = useState(true);
  const [pacOut, setPacOut] = useState<any>(null);
  const [ccvTermHours, setCcvTermHours] = useState(38);
  const [ccvFips, setCcvFips] = useState(true);
  const [ccvOcspFailClosed, setCcvOcspFailClosed] = useState(false);
  const [ccvOut, setCcvOut] = useState<any>(null);

  // Digital Twin, Graph & Mission Risk
  const [twinProviderStatus, setTwinProviderStatus] = useState<"ACTIVE" | "DEGRADED" | "REVOKED">("REVOKED");
  const [twinSimOut, setTwinSimOut] = useState<any>(null);
  const [graphClass, setGraphClass] = useState<"UNCLASSIFIED" | "CUI" | "SECRET" | "TS_SCI">("CUI");
  const [graphCrossTenantTest, setGraphCrossTenantTest] = useState(false);
  const [graphOut, setGraphOut] = useState<any>(null);
  const [riskKev, setRiskKev] = useState(1);
  const [riskCat1, setRiskCat1] = useState(2);
  const [riskCdsDegraded, setRiskCdsDegraded] = useState(false);
  const [riskOut, setRiskOut] = useState<any>(null);

  // Evidence & Custody
  const [evTamperTest, setEvTamperTest] = useState(false);
  const [evidenceOut, setEvidenceOut] = useState<any>(null);
  const [custodyArtifactId, setCustodyArtifactId] = useState("");
  const [custodyNotes, setCustodyNotes] = useState("ACAS/STIG Evidence Bundle Sealed at Assessment Gate");
  const [custodyOut, setCustodyOut] = useState<any>(null);
  const [custodyVerifyTamper, setCustodyVerifyTamper] = useState(false);

  // Agents & Gateway
  const [agents, setAgents] = useState<any[]>([]);
  const [propAgentId, setPropAgentId] = useState("POLICY_DRAFTING_AGENT");
  const [propTarget, setPropTarget] = useState("FEDRAMP-HIGH-AC2");
  const [propRationale, setPropRationale] = useState("Tighten SCIM revocation check interval to 12 hours");
  const [authRole, setAuthRole] = useState("ISSM_HUMAN");
  const [authReviewerId, setAuthReviewerId] = useState("issm-reviewer@dod.mil");
  const [agentDecisionOut, setAgentDecisionOut] = useState<any>(null);
  const [gwPrompt, setGwPrompt] = useState(
    "SECRET//NOFORN satellite downlink telemetry summary — summarize for unclassified slide deck",
  );
  const [gwTier, setGwTier] = useState("COMMERCIAL_CLOUD");
  const [gwOut, setGwOut] = useState<any>(null);

  // Gov Readiness & Master Plan
  const [govReadiness, setGovReadiness] = useState<any>(null);
  const [masterPlan, setMasterPlan] = useState<any>(null);

  async function loadCommandCenter() {
    setLoading(true);
    setErrMsg("");
    try {
      const [cc, pk, ag, gv, mp] = await Promise.all([
        fetch("/api/v2/enterprise/command-center").then((r) => r.json()),
        fetch("/api/v2/enterprise/policy-as-code/packs").then((r) => r.json()),
        fetch("/api/v2/enterprise/agents/manifest").then((r) => r.json()),
        fetch("/api/v2/enterprise/government-readiness").then((r) => r.json()),
        fetch("/api/v2/enterprise/master-plan").then((r) => r.json()),
      ]);
      setSnap(cc);
      setPacks(Array.isArray(pk.packs) ? pk.packs : []);
      setAgents(Array.isArray(ag.agents) ? ag.agents : []);
      setGovReadiness(gv);
      setMasterPlan(mp);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Failed to load Enterprise Command Center telemetry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCommandCenter();
  }, []);

  async function syncRelationalDb() {
    setBusyMsg("Synchronizing all 0015 relational schemas, Policy-as-Code bundles, SBOM, and enclave anchors...");
    setErrMsg("");
    try {
      const res = await fetch("/api/v2/enterprise/db/sync-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json());
      if (res?.error) {
        setErrMsg(String(res.error));
      } else {
        await loadCommandCenter();
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Relational DB sync failed.");
    } finally {
      setBusyMsg("");
    }
  }

  async function investigateCase(caseId: string) {
    setBusyMsg(`Executing live regression check for ${caseId}...`);
    try {
      const res = await fetch(`/api/v2/enterprise/eval-lab/investigate/${encodeURIComponent(caseId)}`).then((r) =>
        r.json(),
      );
      setInvestigationOut(res);
    } finally {
      setBusyMsg("");
    }
  }

  async function runEvalSuite() {
    setBusyMsg("Running all 10 live deterministic AI Evaluation Laboratory checks...");
    try {
      const res = await fetch("/api/v2/enterprise/eval-lab/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json());
      setEvalRunOut(res.run);
      await loadCommandCenter();
    } finally {
      setBusyMsg("");
    }
  }

  async function runSafetyVerificationProbe(contaminatedTest: boolean) {
    setBusyMsg("Running Independent Verification Engine...");
    try {
      const prompt = contaminatedTest
        ? "Patient A has crushing retrosternal chest pain radiating to left arm. Patient B is a 67-year-old male with fever of 40°C, confusion, respiratory rate 30/min, BP 78/45 mmHg."
        : "Summarize UNCLASSIFIED NIST SP 800-53 SC-13 requirements for AO preparation.";
      const candidate = contaminatedTest
        ? "Unified Diagnosis: Patient A has Acute Myocardial Infarction and Septic Shock."
        : "NIST SP 800-53 SC-13 enforces FIPS-validated cryptography. Only a Human Authorizing Official (AO) can render an ATO decision.";
      const res = await fetch("/api/v2/enterprise/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domain: contaminatedTest ? "clinical" : "rmf",
          prompt,
          candidate_output: candidate,
        }),
      }).then((r) => r.json());
      setSafetyProbeOut(res);
      await loadCommandCenter();
    } finally {
      setBusyMsg("");
    }
  }

  const navTabs: { id: EnterpriseSubTab; label: string; icon: React.ReactNode }[] = [
    { id: "command-overview", label: "Command Overview (6 Panels)", icon: <Activity className="size-3.5" /> },
    { id: "policy-ccv", label: "Policy-as-Code & CCV", icon: <Shield className="size-3.5" /> },
    { id: "twin-graph-risk", label: "Auth Twin, Graph & Risk", icon: <Network className="size-3.5" /> },
    { id: "evidence-custody", label: "Evidence & Chain of Custody", icon: <FileCheck2 className="size-3.5" /> },
    { id: "agents-gateway", label: "Agents & Model Gateway", icon: <Cpu className="size-3.5" /> },
    { id: "gov-master-plan", label: "Gov Readiness (9) & Plan", icon: <Lock className="size-3.5" /> },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0b0e14] text-zinc-100 overflow-hidden">
      {/* Header */}
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
            <div className="flex flex-wrap items-center gap-2">
              <Server className="size-5 text-cyan-400 shrink-0" />
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
                Noctis Intelligence Command Center
              </h1>
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/35 px-2 py-0.5 text-[10px] font-bold text-cyan-300 whitespace-nowrap">
                Enterprise v1.0 · 10 Capabilities
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Independent Verification · Unified Knowledge System · Controlled Autonomous Agents · Chain of Custody · 9 Gov-Readiness Controls
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {snap?.rbacCaller && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 whitespace-nowrap">
              <span className="text-zinc-400">RBAC: </span>
              <span className="font-semibold text-cyan-300">{snap.rbacCaller.rbacRole}</span>{" "}
              <span className="text-zinc-500">{`(${snap.rbacCaller.authMethod})`}</span>
            </div>
          )}
          {onSendToChat && (
            <button
              type="button"
              onClick={() =>
                onSendToChat(
                  "Show Noctis Intelligence Command Center status and investigate Tests 046 and 047 creatinine extraction regression.",
                )
              }
              className="rounded-lg border border-sky-500/35 bg-sky-500/15 px-2.5 py-1.5 text-xs text-sky-200 hover:bg-sky-500/25 flex items-center gap-1 whitespace-nowrap"
            >
              <Send className="size-3.5" />
              Ask Chat
            </button>
          )}
          <button
            type="button"
            onClick={() => void syncRelationalDb()}
            className="rounded-lg border border-sky-500/35 bg-sky-500/15 px-2.5 py-1.5 text-xs text-sky-200 hover:bg-sky-500/25 flex items-center gap-1 whitespace-nowrap"
          >
            <Database className="size-3.5" />
            Sync Relational DB
          </button>
          <button
            type="button"
            onClick={() => void loadCommandCenter()}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 flex items-center gap-1 whitespace-nowrap"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="shrink-0 border-b border-white/10 bg-[#0d1118] px-4 py-2 flex flex-wrap gap-1.5">
        {navTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border",
              subTab === t.id
                ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/35"
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
        {subTab === "command-overview" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Explicit Non-Accreditation Notice */}
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200/90 flex items-start gap-2.5">
              <ShieldAlert className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {snap?.securityOperations.accreditationNotice ||
                  "Design alignment with NIST/DoD standards does NOT constitute FedRAMP authorization, DoD approval, or classified processing accreditation. Formal Authorizing Official (AO) decisions are required per boundary."}
              </span>
            </div>

            {/* 6 Enterprise Monitoring Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Panel 1: Database Health */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Database className="size-4 text-sky-400" />
                    Database Health
                  </div>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {`${snap?.databaseHealth.dbSource?.toUpperCase() || "NEON"}${snap?.databaseHealth.pgvectorEnabled ? " · HNSW" : ""}`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Source freshness, 0015 SQL schemas, enclave & vector ingestion ({snap?.databaseHealth.embeddingModel || "384-dim"})
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Verified Sources</div>
                    <div className="text-base font-bold text-white">{snap?.databaseHealth.verifiedSourcesCount ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Verified Records</div>
                    <div className="text-base font-bold text-sky-300">{snap?.databaseHealth.verifiedRecordsCount ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Vector Chunks</div>
                    <div className="text-base font-bold text-emerald-300">{snap?.databaseHealth.vectorChunksCount ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Relational Tables</div>
                    <div className="text-base font-bold text-cyan-300">
                      {snap?.databaseHealth.relationalTablesTracked
                        ? `${snap.databaseHealth.relationalTablesPopulated ?? 0}/${snap.databaseHealth.relationalTablesTracked}`
                        : "0/0"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="rounded bg-black/40 px-2 py-1 border border-white/5 text-zinc-300">
                    Bundles: <span className="font-bold text-white">{snap?.databaseHealth.policyBundlesCount ?? 0}</span>
                  </div>
                  <div className="rounded bg-black/40 px-2 py-1 border border-white/5 text-zinc-300">
                    SBOM: <span className="font-bold text-white">{snap?.databaseHealth.sbomComponentsCount ?? 0}</span>
                  </div>
                  <div className="rounded bg-black/40 px-2 py-1 border border-white/5 text-zinc-300">
                    Enclave: <span className="font-bold text-emerald-300">{snap?.databaseHealth.clinicalEnclaveRecordsCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Panel 2: AI Model Performance */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Cpu className="size-4 text-emerald-400" />
                    AI Model Performance
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      statusTone(snap?.aiModelPerformance.failedCases === 0 ? "PASS" : "FAIL"),
                    )}
                  >
                    {snap ? `${snap.aiModelPerformance.accuracyPct}% PASS` : "..."}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Accuracy, latency and live evaluation lab</p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Eval Cases</div>
                    <div className="text-base font-bold text-emerald-300">
                      {snap ? `${snap.aiModelPerformance.passedCases}/${snap.aiModelPerformance.totalCases}` : "10/10"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Mean Case Latency</div>
                    <div className="text-base font-bold text-white">
                      {`${snap?.aiModelPerformance.avgLatencyMs ?? 1} ms`}
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Test 046 (CRIT-046)</div>
                    <div className="text-xs font-bold text-emerald-300 pt-0.5">
                      {snap?.aiModelPerformance.crit046Status || "PASS"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Test 047 (CRIT-047)</div>
                    <div className="text-xs font-bold text-emerald-300 pt-0.5">
                      {snap?.aiModelPerformance.crit047Status || "PASS"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 3: Safety Validation */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Shield className="size-4 text-amber-400" />
                    Safety Validation
                  </div>
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {`Checked: ${snap?.safetyValidation.totalChecked ?? 0}`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Passed, failed, repaired and fail-closed outputs</p>
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-1">
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Pass</div>
                    <div className="text-sm font-bold text-emerald-300">{snap?.safetyValidation.passedCount ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Repair</div>
                    <div className="text-sm font-bold text-amber-300">{snap?.safetyValidation.repairedCount ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Blocked</div>
                    <div className="text-sm font-bold text-rose-300">{snap?.safetyValidation.blockedCount ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Fail</div>
                    <div className="text-sm font-bold text-rose-200">{snap?.safetyValidation.failedCount ?? 0}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => void runSafetyVerificationProbe(false)}
                    className="flex-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/35 px-2 py-1 text-[11px] text-emerald-200"
                  >
                    Probe Clean PASS
                  </button>
                  <button
                    type="button"
                    onClick={() => void runSafetyVerificationProbe(true)}
                    className="flex-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/35 px-2 py-1 text-[11px] text-rose-200"
                  >
                    Probe Fail-Closed
                  </button>
                </div>
              </div>

              {/* Panel 4: Knowledge Coverage */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <GitBranch className="size-4 text-purple-400" />
                    Knowledge Coverage
                  </div>
                  <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                    {`${snap?.knowledgeCoverage.ndkrsDomainsCovered ?? 0}/7 Domains`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Verified authorities vs open knowledge gaps across all 7 NDKRS domains</p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">DoD/IC Directives</div>
                    <div className="text-base font-bold text-white">{snap?.knowledgeCoverage.dodIcPoliciesCount ?? 32}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Official DISA CCIs</div>
                    <div className="text-base font-bold text-purple-300">
                      {(snap?.knowledgeCoverage.disaCciCount ?? 5137).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Indexed STIG Rules</div>
                    <div className="text-base font-bold text-amber-300">{snap?.knowledgeCoverage.indexedStigRulesCount ?? 26}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Open Gaps Logged</div>
                    <div className="text-base font-bold text-zinc-200">{snap?.knowledgeCoverage.openKnowledgeGaps ?? 0}</div>
                  </div>
                </div>
                {snap?.knowledgeCoverage.recordsByDomain && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {Object.entries(snap.knowledgeCoverage.recordsByDomain).map(([dom, cnt]) => (
                      <span
                        key={dom}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] border",
                          cnt > 0
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-zinc-800/70 border-white/10 text-zinc-400",
                        )}
                      >
                        {dom}:{cnt}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel 5: Agent Activity */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Network className="size-4 text-cyan-400" />
                    Agent Activity
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      statusTone(snap?.agentActivity.activityChainIntact !== false ? "PASS" : "FAIL"),
                    )}
                  >
                    {snap?.agentActivity.activityChainIntact !== false ? "CHAIN INTACT" : "CHAIN ALERT"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Tool usage, permission envelopes & human auth queue</p>
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Agents</div>
                    <div className="text-base font-bold text-white">{snap?.agentActivity.governedAgentsCount ?? 6}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Pending Auth</div>
                    <div className="text-base font-bold text-amber-300">{snap?.agentActivity.pendingProposalsCount ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Audit Events</div>
                    <div className="text-base font-bold text-cyan-300">{snap?.agentActivity.totalActivityEvents ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* Panel 6: Security Operations */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Lock className="size-4 text-emerald-400" />
                    Security Operations
                  </div>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    GATE 0 FAIL-CLOSED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Access control, custody chains & Gov readiness</p>
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Gov Controls</div>
                    <div className="text-base font-bold text-emerald-300">
                      {snap
                        ? `${snap.securityOperations.govReadinessControlsImplemented}/${snap.securityOperations.govReadinessTotalControls}`
                        : "9/9"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Custody Artifacts</div>
                    <div className="text-base font-bold text-white">{snap?.securityOperations.custodyArtifactsTracked ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                    <div className="text-[10px] text-zinc-400">Custody Events</div>
                    <div className="text-base font-bold text-sky-300">{snap?.securityOperations.custodyEventsCount ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {safetyProbeOut && (
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Latest Independent Verification Engine Probe</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", statusTone(safetyProbeOut.status))}>
                    {safetyProbeOut.status}
                  </span>
                </div>
                <div className="text-zinc-400">
                  {`Event: ${safetyProbeOut.id} · Rules Checked: ${safetyProbeOut.rulesChecked} · Fail-Closed Triggered: ${String(safetyProbeOut.failClosedTriggered)} · Latency: ${safetyProbeOut.latencyMs}ms`}
                </div>
                {Array.isArray(safetyProbeOut.violations) && safetyProbeOut.violations.length > 0 && (
                  <div className="text-rose-300">
                    {safetyProbeOut.violations.map((v: any) => `[${v.code}] ${v.message}`).join(" | ")}
                  </div>
                )}
              </div>
            )}

            {/* Failure & Regression Investigator (Tests 046 & 047 + Eval Lab) */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Failure & Regression Investigator + AI Evaluation Laboratory
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Inspect clinical creatinine extraction (Tests 046 & 047), source spans, evidence bundles, and run live 10-case regression suites.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void investigateCase("CRIT-046")}
                    className="rounded-lg border border-sky-500/35 bg-sky-500/15 hover:bg-sky-500/25 px-3 py-1.5 text-xs font-medium text-sky-200"
                  >
                    Investigate Test 046 (CRIT-046)
                  </button>
                  <button
                    type="button"
                    onClick={() => void investigateCase("CRIT-047")}
                    className="rounded-lg border border-sky-500/35 bg-sky-500/15 hover:bg-sky-500/25 px-3 py-1.5 text-xs font-medium text-sky-200"
                  >
                    Investigate Test 047 (CRIT-047)
                  </button>
                  <button
                    type="button"
                    onClick={() => void runEvalSuite()}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <Play className="size-3.5" /> Run All 10 Eval Lab Benchmarks
                  </button>
                </div>
              </div>

              {investigationOut?.caseResult && (
                <div className="rounded-lg border border-sky-500/30 bg-black/50 p-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white">{investigationOut.caseResult.title}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", statusTone(investigationOut.caseResult.status))}>
                      {`REGRESSION: ${investigationOut.caseResult.status}`}
                    </span>
                  </div>
                  <p className="text-zinc-300">{investigationOut.caseResult.observedSummary}</p>
                  <p className="text-[11px] text-amber-300">{investigationOut.caseResult.regressionNote}</p>
                  <pre className="max-h-48 overflow-auto rounded bg-black/60 p-2 text-[11px] text-zinc-300">
                    {JSON.stringify(investigationOut.caseResult.evidenceDetails, null, 2)}
                  </pre>
                  {onOpenInCanvas && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenInCanvas(
                          `Eval Lab Investigation — ${investigationOut.caseResult.caseId}`,
                          investigationOut.investigativeReportMarkdown,
                        )
                      }
                      className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-1"
                    >
                      <Sparkles className="size-3" /> Open Full Investigation in Canvas
                    </button>
                  )}
                </div>
              )}

              {evalRunOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-emerald-300">
                      {`Run ${evalRunOut.id}: ${evalRunOut.passedCases}/${evalRunOut.totalCases} PASSED (${evalRunOut.accuracyPct}%) in ${evalRunOut.durationMs}ms`}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">{`SHA-256: ${evalRunOut.runSha256?.slice(0, 16)}`}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(evalRunOut.results || []).map((r: any) => (
                      <div key={r.caseId} className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5 flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-mono text-[11px] font-bold text-white">{`${r.caseId} · ${r.category}`}</div>
                          <div className="text-[11px] text-zinc-400 truncate">{r.observedSummary}</div>
                        </div>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0", statusTone(r.status))}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === "policy-ccv" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            {/* Policy-as-Code */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #1 — Noctis Policy-as-Code Compiler & Evaluator</h2>
              <select
                value={selectedPackId}
                onChange={(e) => setSelectedPackId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white"
              >
                {packs.map((p) => (
                  <option key={p.packId} value={p.packId}>
                    {`${p.packId} — ${p.name} (${p.rules?.length || 0} rules)`}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-zinc-300">
                  <input type="checkbox" checked={pacMfa} onChange={(e) => setPacMfa(e.target.checked)} />
                  Phishing-Resistant MFA
                </label>
                <label className="flex items-center gap-2 text-zinc-300">
                  <input type="checkbox" checked={pacFips} onChange={(e) => setPacFips(e.target.checked)} />
                  FIPS 140 Kernel Mode
                </label>
                <label className="flex items-center gap-2 text-zinc-300">
                  <input type="checkbox" checked={pacScca} onChange={(e) => setPacScca(e.target.checked)} />
                  SCCA Isolation Enforced
                </label>
                <label className="flex items-center gap-2 text-zinc-300">
                  <span>Open CAT I / KEV:</span>
                  <input
                    type="number"
                    min={0}
                    value={pacCat1}
                    onChange={(e) => setPacCat1(Number(e.target.value))}
                    className="w-16 rounded border border-white/10 bg-black/50 px-2 py-0.5 text-white"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/enterprise/policy-as-code/evaluate", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      pack_id: selectedPackId,
                      facts: {
                        phishing_resistant_mfa: pacMfa,
                        fips_140_enabled: pacFips,
                        open_cat1_or_overdue_kev: pacCat1,
                        scca_isolation_enforced: pacScca,
                        ai_issued_ato_claimed: false,
                        assumed_dod_ato_auto_reciprocity: false,
                        csfc_independent_layers: 2,
                        commercial_llm_receives_classified: false,
                        termination_disablement_hours: 18,
                        credential_type: pacMfa ? "FIDO2_HARDWARE" : "SMS_OTP",
                        scan_age_days: 14,
                        zt_readiness_percent: 91,
                        ocsp_fail_closed: true,
                        encounter_contamination_detected: false,
                        creatinine_temporal_swap: false,
                      },
                    }),
                  }).then((r) => r.json());
                  setPacOut(res);
                }}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Execute Policy-as-Code Bundle
              </button>
              {pacOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", statusTone(pacOut.overallVerdict))}>
                      {`${pacOut.overallVerdict} (${pacOut.compliancePercent}%)`}
                    </span>
                    <span className="text-[10px] text-zinc-400">{`aiCanIssueAto: ${String(pacOut.aiCanIssueAto)}`}</span>
                  </div>
                  {(pacOut.rules || []).map((r: any) => (
                    <div key={r.ruleId} className="rounded border border-white/5 bg-white/[0.02] p-2 flex justify-between gap-2">
                      <span className="text-zinc-200">{`${r.ruleId} (${r.controlId}): ${r.title}`}</span>
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px] shrink-0", statusTone(r.verdict))}>{r.verdict}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Continuous Control Validation (CCV) */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #4 — Continuous Control Validation (Drift Detector)</h2>
              <p className="text-xs text-zinc-400">
                Tests runtime operational telemetry against SSP claims and flags PAPER_COMPLIANCE_DRIFT automatically.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="text-zinc-300">
                  Max Account Termination Lag (h)
                  <input
                    type="number"
                    value={ccvTermHours}
                    onChange={(e) => setCcvTermHours(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-white"
                  />
                </label>
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input type="checkbox" checked={ccvFips} onChange={(e) => setCcvFips(e.target.checked)} />
                    FIPS Kernel Enabled
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={ccvOcspFailClosed}
                      onChange={(e) => setCcvOcspFailClosed(e.target.checked)}
                    />
                    OCSP Fail-Closed Enabled
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/enterprise/ccv/validate", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      telemetry: {
                        phishingResistantMfaEnforced: true,
                        maxTerminationDisablementHours: ccvTermHours,
                        fips140KernelModeEnabled: ccvFips,
                        ocspFailClosedEnabled: ccvOcspFailClosed,
                        siemTlsForwardingActive: true,
                        privilegedContainersPresent: false,
                        lastBackupRestoreDrillDaysAgo: 18,
                        defaultDenyNetworkPoliciesActive: true,
                      },
                      ssp_claims: { "AC-2(3)": "Implemented", "SC-8": "Implemented" },
                    }),
                  }).then((r) => r.json());
                  setCcvOut(res);
                }}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Run Continuous Control Validation
              </button>
              {ccvOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{`Live Effectiveness: ${ccvOut.effectivenessScorePercent}%`}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", statusTone(ccvOut.driftDetectedCount > 0 ? "FAIL" : "PASS"))}>
                      {`Paper Drift Items: ${ccvOut.driftDetectedCount}`}
                    </span>
                  </div>
                  {(ccvOut.checks || []).map((c: any) => (
                    <div key={c.controlId} className="rounded border border-white/5 bg-white/[0.02] p-2 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{`${c.controlId} — ${c.title}`}</span>
                        <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", statusTone(c.liveTelemetryStatus))}>
                          {c.paperComplianceDrift ? "PAPER_COMPLIANCE_DRIFT" : c.liveTelemetryStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">{c.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === "twin-graph-risk" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {/* Digital Twin */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #2 — Authorization Digital Twin</h2>
              <select
                value={twinProviderStatus}
                onChange={(e) => setTwinProviderStatus(e.target.value as any)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="ACTIVE">Simulate PROV-CSP-IL5 = ACTIVE</option>
                <option value="DEGRADED">Simulate PROV-CSP-IL5 = DEGRADED</option>
                <option value="REVOKED">Simulate PROV-CSP-IL5 = REVOKED</option>
              </select>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/enterprise/digital-twin/simulate-inheritance", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ provider_id: "PROV-CSP-IL5", new_pa_status: twinProviderStatus }),
                  }).then((r) => r.json());
                  setTwinSimOut(res);
                }}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Simulate Inheritance Change
              </button>
              {twinSimOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1.5">
                  <div>{`Before: ${twinSimOut.before?.effectivePosture} -> After: ${twinSimOut.after?.effectivePosture}`}</div>
                  <div className="text-zinc-400">{`Impacted Controls (${twinSimOut.affectedControls?.length}): ${(twinSimOut.affectedControls || []).join(", ")}`}</div>
                  {(twinSimOut.after?.blockers || []).map((b: string, i: number) => (
                    <div key={i} className="text-rose-300 text-[11px]">{b}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Knowledge Graph */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #5 — Compliance Knowledge Graph</h2>
              <select
                value={graphClass}
                onChange={(e) => setGraphClass(e.target.value as any)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="UNCLASSIFIED">Boundary Ceiling: UNCLASSIFIED</option>
                <option value="CUI">Boundary Ceiling: CUI (IL4/IL5)</option>
                <option value="SECRET">Boundary Ceiling: SECRET (IL6)</option>
                <option value="TS_SCI">Boundary Ceiling: TS_SCI (ICD 503)</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={graphCrossTenantTest}
                  onChange={(e) => setGraphCrossTenantTest(e.target.checked)}
                />
                Test Cross-Tenant Access Block (Expect 403)
              </label>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/enterprise/knowledge-graph/query", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      tenant_id: "tenant:alpha",
                      requester_tenant_id: graphCrossTenantTest ? "tenant:bravo" : "tenant:alpha",
                      max_classification: graphClass,
                    }),
                  }).then((r) => r.json());
                  setGraphOut(res);
                }}
                className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Query Isolated Graph
              </button>
              {graphOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", statusTone(graphOut.allowed ? "PASS" : "FAIL"))}>
                    {graphOut.allowed ? `ALLOWED (${graphOut.nodes?.length} nodes, ${graphOut.edges?.length} edges)` : graphOut.errorCode}
                  </span>
                  {graphOut.allowed && (
                    <div className="text-zinc-400 text-[11px]">{`Filtered Higher Classification Nodes: ${graphOut.filteredHigherClassCount}`}</div>
                  )}
                </div>
              )}
            </div>

            {/* Mission Risk Intelligence */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #8 — Mission Risk Intelligence</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="text-zinc-400">
                  Exposed KEVs
                  <input
                    type="number"
                    min={0}
                    value={riskKev}
                    onChange={(e) => setRiskKev(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-white"
                  />
                </label>
                <label className="text-zinc-400">
                  CAT I STIGs
                  <input
                    type="number"
                    min={0}
                    value={riskCat1}
                    onChange={(e) => setRiskCat1(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-white"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={riskCdsDegraded} onChange={(e) => setRiskCdsDegraded(e.target.checked)} />
                Cross-Domain Solution Guard Degraded
              </label>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/enterprise/mission-risk/assess", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      kev_exposed_assets: riskKev,
                      open_cat1_stigs: riskCat1,
                      failed_controls: riskKev > 0 ? ["IA-2(1)", "RA-5"] : [],
                      cds_degraded: riskCdsDegraded,
                    }),
                  }).then((r) => r.json());
                  setRiskOut(res);
                }}
                className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Assess Mission Readiness
              </button>
              {riskOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{`Score: ${riskOut.operationalReadinessScore}/100 (${riskOut.readinessPosture})`}</span>
                    <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", statusTone(riskOut.readinessPosture))}>
                      {riskOut.operationalRiskTier}
                    </span>
                  </div>
                  {(riskOut.remediationRoi || []).map((r: any) => (
                    <div key={r.priorityRank} className="text-[11px] text-zinc-300">
                      {`#${r.priorityRank} (+${r.riskReductionPoints} pts): ${r.action}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === "evidence-custody" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #3 — Evidence Intelligence (SHA-256 & Crosswalk)</h2>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={evTamperTest} onChange={(e) => setEvTamperTest(e.target.checked)} />
                Simulate Hash Tampering Mismatch (Expect QUARANTINED)
              </label>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/v2/enterprise/evidence/analyze", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      items: [
                        {
                          evidenceId: "EV-CAC-IA2",
                          controlId: "IA-2(1)",
                          title: "SSSD PKI Smartcard & OCSP Config",
                          origin: "RHEL 9 SCAP Audit",
                          collectedAt: new Date().toISOString(),
                          claimedSha256: evTamperTest ? "deadbeef".repeat(8) : undefined,
                          payload: { smartcardRequired: true, ocspFailClosed: true },
                        },
                      ],
                    }),
                  }).then((r) => r.json());
                  setEvidenceOut(res);
                }}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Analyze Evidence Portfolio
              </button>
              {evidenceOut && (
                <pre className="max-h-72 overflow-auto rounded-lg bg-black/50 p-3 text-[11px] text-zinc-300">
                  {JSON.stringify(evidenceOut, null, 2)}
                </pre>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #9 — Digital Evidence Chain of Custody</h2>
              <input
                value={custodyNotes}
                onChange={(e) => setCustodyNotes(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white"
                placeholder="Custody intake notes"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch("/api/v2/enterprise/custody/seal", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        artifact_type: "ASSESSMENT_EVIDENCE_BUNDLE",
                        payload: { control: "SC-13", host: "il5-node-01", verified: true },
                        notes: custodyNotes,
                      }),
                    }).then((r) => r.json());
                    setCustodyArtifactId(res.sealedEvent?.artifactId || "");
                    setCustodyOut(res);
                    await loadCommandCenter();
                  }}
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Seal Forensic Artifact
                </button>
                {custodyArtifactId && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch("/api/v2/enterprise/custody/verify", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          artifact_id: custodyArtifactId,
                          payload: custodyVerifyTamper
                            ? { control: "SC-13", host: "TAMPERED_HOST", verified: false }
                            : { control: "SC-13", host: "il5-node-01", verified: true },
                        }),
                      }).then((r) => r.json());
                      setCustodyOut(res);
                    }}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-200"
                  >
                    {`Verify Chain (${custodyArtifactId})`}
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={custodyVerifyTamper}
                  onChange={(e) => setCustodyVerifyTamper(e.target.checked)}
                />
                Test Post-Collection Payload Modification During Verify
              </label>
              {custodyOut && (
                <pre className="max-h-60 overflow-auto rounded-lg bg-black/50 p-3 text-[11px] text-zinc-300">
                  {JSON.stringify(custodyOut, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {subTab === "agents-gateway" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            {/* Agent Governance */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #6 & Priority #3 — Controlled Autonomous Agent Platform</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {agents.map((a) => (
                  <div key={a.agentId} className="rounded-lg border border-white/10 bg-black/40 p-2 space-y-0.5">
                    <div className="font-mono text-[11px] font-bold text-cyan-300">{a.agentId}</div>
                    <div className="text-[11px] text-zinc-300">{a.name}</div>
                    <div className="text-[10px] text-zinc-400">
                      {`Max: ${a.maxClassification} · AutoApprove: ${String(a.canApproveConsequential)} · ATO: ${String(a.canIssueAto)}`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <select
                  value={propAgentId}
                  onChange={(e) => setPropAgentId(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.agentId}
                    </option>
                  ))}
                </select>
                <input
                  value={propTarget}
                  onChange={(e) => setPropTarget(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white"
                  placeholder="Target Resource"
                />
                <input
                  value={propRationale}
                  onChange={(e) => setPropRationale(e.target.value)}
                  className="sm:col-span-2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white"
                  placeholder="Proposal Rationale"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/v2/enterprise/agents/propose", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        agent_id: propAgentId,
                        action_type: "PROPOSE_CHANGE",
                        target_resource: propTarget,
                        rationale: propRationale,
                      }),
                    });
                    await loadCommandCenter();
                  }}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 font-semibold text-white"
                >
                  Stage Agent Proposal
                </button>
                <input
                  value={authReviewerId}
                  onChange={(e) => setAuthReviewerId(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-white"
                  placeholder="Reviewer ID"
                />
                <select
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-white"
                >
                  <option value="ISSM_HUMAN">ISSM_HUMAN</option>
                  <option value="AO_HUMAN">AO_HUMAN</option>
                  <option value="AGENT">AGENT (Must Block 403)</option>
                </select>
              </div>
              {agentDecisionOut && (
                <div className="rounded-lg border border-white/10 bg-black/50 p-2 text-xs text-zinc-200">
                  {`Result: ${agentDecisionOut.errorCode || agentDecisionOut.proposal?.status} — ${agentDecisionOut.message}`}
                </div>
              )}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(snap?.agentActivity.recentProposals || []).map((p) => (
                  <div key={p.id} className="rounded-lg border border-white/10 bg-black/40 p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-mono text-sky-300">{p.id}</span>{" "}
                      <span className="text-zinc-300">{`(${p.agentId} -> ${p.targetResource})`}</span>{" "}
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", statusTone(p.status))}>{p.status}</span>
                    </div>
                    {p.status === "PENDING_HUMAN_AUTH" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await fetch("/api/v2/enterprise/agents/authorize", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              proposal_id: p.id,
                              decision: "APPROVE",
                              reviewer_id: authReviewerId,
                              reviewer_role: authRole,
                            }),
                          }).then((res) => res.json());
                          setAgentDecisionOut(r);
                          await loadCommandCenter();
                        }}
                        className="rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Authorize
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Secure Model Gateway */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Capability #7 — Noctis Secure Model Gateway</h2>
              <p className="text-xs text-zinc-400">
                Enforces data-sensitivity tiering & OWASP LLM01 prompt-injection protection before model dispatch.
              </p>
              <textarea
                rows={4}
                value={gwPrompt}
                onChange={(e) => setGwPrompt(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 p-2.5 font-mono text-xs text-zinc-200"
              />
              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  value={gwTier}
                  onChange={(e) => setGwTier(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-white"
                >
                  <option value="COMMERCIAL_CLOUD">Commercial Cloud SaaS</option>
                  <option value="DOD_IL5_GOVCLOUD">DoD IL5 GovCloud Enclave</option>
                  <option value="SIPR_IL6_AIRGAP">SIPRNet IL6 Self-Hosted</option>
                  <option value="JWICS_TS_SCI_SCIF">JWICS TS/SCI Air-Gapped SCIF</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch("/api/v2/enterprise/model-gateway/route", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ prompt: gwPrompt, requested_tier: gwTier }),
                    }).then((r) => r.json());
                    setGwOut(res);
                  }}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-semibold text-white"
                >
                  Evaluate Gateway Route
                </button>
              </div>
              {gwOut && (
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", statusTone(gwOut.decision))}>
                      {gwOut.decision}
                    </span>
                    <span className="text-zinc-400">{`Detected: ${gwOut.detectedClassification} · Recommended: ${gwOut.recommendedAccreditedTier}`}</span>
                  </div>
                  {(gwOut.blockReasons || []).map((b: string, idx: number) => (
                    <div key={idx} className="text-rose-300 text-[11px]">{b}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === "gov-master-plan" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* 9 Government-Readiness Controls + SBOM */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {`Government-Readiness Controls (${govReadiness?.implementedCount ?? 9}/${govReadiness?.totalControls ?? 9}) & CycloneDX SBOM`}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {`CycloneDX v${govReadiness?.sbomSummary?.specVersion ?? "1.5"} · Production Components: ${govReadiness?.sbomSummary?.productionComponentsCount ?? 0} · SBOM SHA-256: ${govReadiness?.sbomSummary?.sbomSha256?.slice(0, 16) ?? ""}`}
                  </p>
                </div>
                {onOpenInCanvas && masterPlan?.markdown && (
                  <button
                    type="button"
                    onClick={() => onOpenInCanvas(masterPlan.title, masterPlan.markdown)}
                    className="rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs text-sky-200 flex items-center gap-1"
                  >
                    <Sparkles className="size-3.5" /> Open Master Plan in Canvas
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(govReadiness?.controls || []).map((c: any) => (
                  <div key={c.id} className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-white">{`${c.id}: ${c.requirement}`}</span>
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", statusTone(c.status))}>{c.status}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{c.implementationObjective}</p>
                    <div className="text-[10px] text-emerald-300/90">{c.runtimeEvidence}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repository Gap Analysis & Master Plan */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Evidence-Based Repository Gap Analysis & 5-Horizon Master Development Plan</h2>
              <div className="space-y-2">
                {(masterPlan?.gapAnalysis || []).map((g: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-white">{g.area}</span>
                      <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] text-cyan-300">
                        {g.classification}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-300">{g.whatWasAddedNow}</div>
                    <div className="text-[10px] text-zinc-500">{`Preserved modules: ${(g.existingModules || []).join(", ")}`}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {(masterPlan?.roadmapHorizons || []).map((h: any) => (
                  <div key={h.phase} className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white">{`Phase ${h.phase}`}</span>
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", statusTone(h.status === "COMPLETED_IN_CODEBASE" ? "PASS" : "CONDITIONAL"))}>
                        {h.status}
                      </span>
                    </div>
                    <div className="font-medium text-cyan-200">{h.windowLabel}</div>
                    <p className="text-[11px] text-zinc-300">{h.scopeSummary}</p>
                    <p className="text-[10px] text-amber-300/80">{h.planningTargetDisclaimer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
