import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  FileCheck2,
  Lock,
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

interface NoctisNdkrsConsoleTabProps {
  onSendToChat?: (prompt: string) => void;
  onClose?: () => void;
}

type NdkrsSubTab = "overview" | "search" | "governance" | "certificates";

interface NdkrsStatus {
  platform: string;
  version: string;
  dbSource: "neon" | "pglite";
  pgvectorEnabled: boolean;
  rateLimitBackend?: string;
  counts: {
    sources: number;
    verifiedRecords: number;
    pendingRecords: number;
    chunks: number;
    deterministicRules: number;
    pendingReviewQueue: number;
    validationCertificates: number;
    openKnowledgeGaps: number;
    encryptedClinicalEnclaveRecords: number;
  };
}

interface SearchHit {
  chunkId: string;
  recordId: string | null;
  domain: string;
  canonicalKey: string;
  title: string;
  heading: string | null;
  excerpt: string;
  citationLabel: string;
  sourceUri: string;
  version: string;
  sha256: string;
  bm25Score: number;
  vectorScore: number;
  rrfScore: number;
  matchedTerms: number;
}

interface ReviewItem {
  id: string;
  domain: string;
  title: string;
  proposedBy: string;
  proposedByType: string;
  sourceUri: string | null;
  allowlistVerified: boolean;
  contradictionFlags: string[];
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewerId: string | null;
  reviewerRole: string | null;
  createdAt: string;
}

interface CertificateItem {
  id: string;
  domain: string;
  requestId: string;
  validatorVersion: string;
  sourceInputHash: string;
  outputHash: string;
  verdict: "APPROVED" | "FAIL_CLOSED";
  hmacSignature: string;
  keyMode: string;
  createdAt: string;
}

interface KnowledgeGapItem {
  id: string;
  domain: string;
  sanitizedTopic: string;
  failureReason: string;
  occurrences: number;
  status: string;
  lastSeenAt: string;
}

interface DeterministicRuleMeta {
  ruleId: string;
  domain: string;
  name: string;
  version: string;
  description: string;
  authorityCitation: string;
}

export const NoctisNdkrsConsoleTab: React.FC<NoctisNdkrsConsoleTabProps> = ({
  onSendToChat,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<NdkrsSubTab>("overview");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<NdkrsStatus | null>(null);
  const [staleness, setStaleness] = useState<{
    totalVerified: number;
    expiredCount: number;
    expiringSoonCount: number;
  } | null>(null);
  const [enclaveStatus, setEnclaveStatus] = useState<{
    encryptionCipher: string;
    keyMode: string;
    recordCount: number;
  } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("KDIGO AKI staging creatinine 5.1 baseline 1.8");
  const [searchDomain, setSearchDomain] = useState<string>("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [routerDecision, setRouterDecision] = useState<Record<string, unknown> | null>(null);

  // Governance / Ingest state
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [ingestKey, setIngestKey] = useState("CUSTOM-SOP-01");
  const [ingestDomain, setIngestDomain] = useState("clinical");
  const [ingestTitle, setIngestTitle] = useState("Electrolyte Safety Protocol Draft");
  const [ingestUri, setIngestUri] = useState("https://kdigo.org/guidelines/acute-kidney-injury/");
  const [ingestContent, setIngestContent] = useState(
    "Verify current serum creatinine against historical baseline within 7 days before KDIGO staging.",
  );
  const [ingestProposer, setIngestProposer] = useState("clinician-proposer-1");
  const [reviewerId, setReviewerId] = useState("human-sme-reviewer-2");
  const [reviewerRole, setReviewerRole] = useState("HUMAN_REVIEWER");
  const [govMessage, setGovMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Certificates, Gaps & Rules state
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [verifyMap, setVerifyMap] = useState<Record<string, boolean>>({});
  const [gaps, setGaps] = useState<KnowledgeGapItem[]>([]);
  const [rules, setRules] = useState<DeterministicRuleMeta[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState("CLIN-KDIGO-AKI");
  const [ruleInputsJson, setRuleInputsJson] = useState(
    JSON.stringify({ currentCrMgDl: 5.1, baselineCrMgDl: 1.8, timeframeText: "six days earlier" }, null, 2),
  );
  const [ruleResult, setRuleResult] = useState<Record<string, unknown> | null>(null);

  async function refreshAll() {
    setLoading(true);
    try {
      const [stRes, staleRes, encRes, qRes, certRes, gapRes, ruleRes] = await Promise.all([
        fetch("/api/v2/ndkrs/status").then((r) => r.json()),
        fetch("/api/v2/ndkrs/staleness").then((r) => r.json()),
        fetch("/api/v2/ndkrs/enclave/status").then((r) => r.json()),
        fetch("/api/v2/ndkrs/review-queue").then((r) => r.json()),
        fetch("/api/v2/ndkrs/certificates?limit=25").then((r) => r.json()),
        fetch("/api/v2/ndkrs/gaps?limit=25").then((r) => r.json()),
        fetch("/api/v2/ndkrs/rules").then((r) => r.json()),
      ]);
      if (stRes?.counts) setStatus(stRes);
      if (typeof staleRes?.totalVerified === "number") setStaleness(staleRes);
      if (encRes?.encryptionCipher) setEnclaveStatus(encRes);
      if (Array.isArray(qRes?.items)) setReviewItems(qRes.items);
      if (Array.isArray(certRes?.certificates)) setCertificates(certRes.certificates);
      if (Array.isArray(gapRes?.gaps)) setGaps(gapRes.gaps);
      if (Array.isArray(ruleRes?.rules)) setRules(ruleRes.rules);
    } catch {
      // Keep UI responsive
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  async function runHybridSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v2/ndkrs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          domain: searchDomain || undefined,
          limit: 6,
        }),
      }).then((r) => r.json());
      setRouterDecision(res?.routerDecision || null);
      setSearchHits(Array.isArray(res?.hits) ? res.hits : []);
    } finally {
      setLoading(false);
    }
  }

  async function submitIngest(e: React.FormEvent) {
    e.preventDefault();
    setGovMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v2/ndkrs/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: ingestDomain,
          canonicalKey: ingestKey,
          title: ingestTitle,
          sourceUri: ingestUri,
          content: ingestContent,
          proposedBy: ingestProposer,
          proposedByType: "HUMAN",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGovMessage({ ok: false, text: data.error || "Ingest failed" });
      } else {
        setGovMessage({
          ok: true,
          text: `Quarantined as ${data.status} (Record ${data.recordId}, Allowlist: ${data.allowlistVerified ? "PASS" : "UNVERIFIED HOST"}, Contradictions: ${data.contradictionFlags?.length ?? 0}). Human sign-off required.`,
        });
        await refreshAll();
      }
    } finally {
      setLoading(false);
    }
  }

  async function decideQueue(queueId: string, decision: "APPROVE" | "REJECT") {
    setGovMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v2/ndkrs/review-queue/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId,
          decision,
          reviewerId,
          reviewerRole,
          notes: `Decided via NDKRS Governance UI (${decision})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGovMessage({ ok: false, text: data.error || "Decision blocked by governance invariant" });
      } else {
        setGovMessage({
          ok: true,
          text: `Review ${queueId} marked ${data.item?.status || decision} by ${reviewerId}.`,
        });
        await refreshAll();
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyCert(cert: CertificateItem) {
    const res = await fetch("/api/v2/ndkrs/certificates/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificate: cert }),
    }).then((r) => r.json());
    setVerifyMap((prev) => ({ ...prev, [cert.id]: Boolean(res?.signatureValid) }));
  }

  async function evaluateRule() {
    setLoading(true);
    try {
      const parsed = JSON.parse(ruleInputsJson || "{}");
      const res = await fetch("/api/v2/ndkrs/rules/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: selectedRuleId, inputs: parsed }),
      }).then((r) => r.json());
      setRuleResult(res);
    } catch (err) {
      setRuleResult({ error: err instanceof Error ? err.message : "Invalid JSON inputs" });
    } finally {
      setLoading(false);
    }
  }

  const presetRule = (id: string) => {
    setSelectedRuleId(id);
    if (id === "CLIN-KDIGO-AKI") {
      setRuleInputsJson(JSON.stringify({ currentCrMgDl: 5.1, baselineCrMgDl: 1.8, timeframeText: "six days earlier" }, null, 2));
    } else if (id === "RMF-POAM-SLA") {
      setRuleInputsJson(JSON.stringify({ severity: "HIGH", openDays: 42 }, null, 2));
    } else if (id === "ENG-OHMS-POWER") {
      setRuleInputsJson(JSON.stringify({ currentA: 2.5, resistanceOhm: 12 }, null, 2));
    } else if (id === "LEGAL-CDS-21USC360J") {
      setRuleInputsJson(
        JSON.stringify(
          {
            analyzesImagesSignals: false,
            displaysMedicalInfo: true,
            supportsClinicianRecommendation: true,
            enablesIndependentReview: true,
          },
          null,
          2,
        ),
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#0b0f17] text-zinc-100 p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10"
                title="Back to Chat"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Database className="size-5" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Noctis Deterministic Knowledge & Reasoning System (NDKRS)
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                  {status?.dbSource === "neon" ? "Neon Postgres" : "PGLite"}
                </span>
                {status?.pgvectorEnabled && (
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300 border border-sky-500/30">
                    pgvector HNSW
                  </span>
                )}
              </h1>
              <p className="text-xs text-zinc-400">
                Hybrid BM25 + Vector Retrieval · Anti-Poisoning Dual Control · HMAC Certificates · Isolated Clinical Enclave
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh State
          </button>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "overview" as const, label: "Overview & Enclave Health", icon: Activity },
            { id: "search" as const, label: "Hybrid BM25 + Vector Search", icon: Search },
            { id: "governance" as const, label: "Ingest & Dual-Control Queue", icon: Shield },
            { id: "certificates" as const, label: "Signed Certificates & Rules", icon: FileCheck2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition border",
                  subTab === tab.id
                    ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]",
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Subtab 1: Overview */}
        {subTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Verified Knowledge Records", val: status?.counts.verifiedRecords ?? 0, tone: "text-emerald-300" },
                { label: "Indexed Vector Chunks", val: status?.counts.chunks ?? 0, tone: "text-sky-300" },
                { label: "Deterministic Rules", val: status?.counts.deterministicRules ?? 0, tone: "text-amber-300" },
                { label: "Pending Human Reviews", val: status?.counts.pendingReviewQueue ?? 0, tone: "text-violet-300" },
                { label: "Signed HMAC Certificates", val: status?.counts.validationCertificates ?? 0, tone: "text-emerald-300" },
                { label: "Open Knowledge Gaps", val: status?.counts.openKnowledgeGaps ?? 0, tone: "text-rose-300" },
                { label: "Expired Records Alert", val: staleness?.expiredCount ?? 0, tone: (staleness?.expiredCount ?? 0) > 0 ? "text-rose-400" : "text-zinc-300" },
                { label: "AES-256-GCM Enclave Records", val: enclaveStatus?.recordCount ?? 0, tone: "text-cyan-300" },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1"
                >
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400">{card.label}</div>
                  <div className={cn("text-2xl font-bold", card.tone)}>{card.val}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-cyan-400" />
                <span>
                  Enclave Cipher: <strong>{enclaveStatus?.encryptionCipher || "AES-256-GCM"}</strong> · Key Mode:{" "}
                  <code>{enclaveStatus?.keyMode || "default"}</code> · Rate-Limit Store:{" "}
                  <code>{status?.rateLimitBackend || "postgres_bucket"}</code>
                </span>
              </div>
              {onSendToChat && (
                <button
                  type="button"
                  onClick={() =>
                    onSendToChat(
                      "A patient has a current creatinine of 5.1 mg/dL. Their historical baseline creatinine was 1.8 mg/dL, measured six days earlier. What is the creatinine ratio, and how should KDIGO AKI staging be evaluated?",
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/20 border border-sky-500/40 px-3 py-1.5 font-semibold text-sky-200 hover:bg-sky-500/30"
                >
                  <Send className="size-3.5" />
                  Run Live KDIGO Safety Demo in Chat
                </button>
              )}
            </div>
          </div>
        )}

        {/* Subtab 2: Hybrid Search */}
        {subTab === "search" && (
          <div className="space-y-4">
            <form onSubmit={runHybridSearch} className="flex flex-wrap gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search verified clinical, RMF, legal, engineering, or science records..."
                className="flex-1 min-w-[240px] rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-sm text-white outline-none focus:border-sky-400"
              />
              <select
                value={searchDomain}
                onChange={(e) => setSearchDomain(e.target.value)}
                className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-200"
              >
                <option value="">All Domains</option>
                <option value="clinical">Clinical</option>
                <option value="rmf">RMF</option>
                <option value="cybersecurity">Cybersecurity</option>
                <option value="legal">Legal</option>
                <option value="engineering">Engineering</option>
                <option value="science">Science</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                <Search className="size-4" />
                Hybrid Search
              </button>
            </form>

            {routerDecision && (
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-xs text-sky-200 flex flex-wrap gap-4">
                <span>Primary Domain: <strong>{String(routerDecision.primaryDomain)}</strong></span>
                <span>Risk Tier: <strong>{String(routerDecision.riskTier)}</strong></span>
                <span>Strategy: <strong>{String(routerDecision.executionStrategy)}</strong></span>
                <span>Confidence: <strong>{String(routerDecision.confidence)}</strong></span>
              </div>
            )}

            <div className="space-y-3">
              {searchHits.map((hit) => (
                <div key={hit.chunkId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300 uppercase">
                        {hit.domain}
                      </span>
                      <span className="text-sm font-bold text-white">{hit.title}</span>
                      <span className="text-xs text-zinc-400">({hit.citationLabel} · v{hit.version})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span>RRF: <strong className="text-sky-300">{hit.rrfScore}</strong></span>
                      <span>BM25: {hit.bm25Score}</span>
                      <span>Vec: {hit.vectorScore}</span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">{hit.excerpt}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span>
                      SHA-256: <code>{hit.sha256.slice(0, 16)}</code> · Source: <code>{hit.sourceUri}</code>
                    </span>
                    {onSendToChat && (
                      <button
                        type="button"
                        onClick={() => onSendToChat(`Explain verified guidance for ${hit.canonicalKey}: ${hit.title}`)}
                        className="text-sky-300 hover:text-sky-200 font-semibold"
                      >
                        Ask in Chat -&gt;
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {searchHits.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-zinc-400">
                  Run a hybrid search query above to retrieve verified BM25 + vector records with provenance citations.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtab 3: Ingest & Governance */}
        {subTab === "governance" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form onSubmit={submitIngest} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Upload className="size-4 text-amber-400" />
                Submit Document to Quarantine Queue (Never Auto-Verified)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={ingestKey}
                  onChange={(e) => setIngestKey(e.target.value)}
                  placeholder="Canonical Key"
                  className="rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
                />
                <select
                  value={ingestDomain}
                  onChange={(e) => setIngestDomain(e.target.value)}
                  className="rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
                >
                  <option value="clinical">clinical</option>
                  <option value="rmf">rmf</option>
                  <option value="legal">legal</option>
                  <option value="cybersecurity">cybersecurity</option>
                  <option value="engineering">engineering</option>
                  <option value="science">science</option>
                </select>
              </div>
              <input
                value={ingestTitle}
                onChange={(e) => setIngestTitle(e.target.value)}
                placeholder="Document Title"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
              />
              <input
                value={ingestUri}
                onChange={(e) => setIngestUri(e.target.value)}
                placeholder="Authoritative Source HTTPS URL"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
              />
              <input
                value={ingestProposer}
                onChange={(e) => setIngestProposer(e.target.value)}
                placeholder="Proposer ID"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
              />
              <textarea
                rows={4}
                value={ingestContent}
                onChange={(e) => setIngestContent(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                Ingest as PENDING_REVIEW
              </button>
            </form>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Shield className="size-4 text-emerald-400" />
                  Dual-Control Review Queue ({reviewItems.length})
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={reviewerId}
                    onChange={(e) => setReviewerId(e.target.value)}
                    placeholder="Reviewer ID"
                    className="w-36 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white"
                  />
                  <select
                    value={reviewerRole}
                    onChange={(e) => setReviewerRole(e.target.value)}
                    className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white"
                  >
                    <option value="HUMAN_REVIEWER">HUMAN_REVIEWER</option>
                    <option value="AGENT">AGENT (Must Fail)</option>
                  </select>
                </div>
              </div>

              {govMessage && (
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs",
                    govMessage.ok
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-200",
                  )}
                >
                  {govMessage.text}
                </div>
              )}

              <div className="max-h-72 overflow-y-auto space-y-2">
                {reviewItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white">{item.title}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold",
                          item.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : item.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300",
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Proposer: <code>{item.proposedBy}</code> · Allowlist:{" "}
                      {item.allowlistVerified ? "VERIFIED" : "UNVERIFIED"}
                    </div>
                    {item.contradictionFlags.length > 0 && (
                      <div className="text-[11px] text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="size-3 shrink-0" />
                        {item.contradictionFlags.join("; ")}
                      </div>
                    )}
                    {item.status === "PENDING_REVIEW" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void decideQueue(item.id, "APPROVE")}
                          className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/30"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void decideQueue(item.id, "REJECT")}
                          className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {reviewItems.length === 0 && (
                  <div className="text-xs text-zinc-400 py-4 text-center">No submissions in review queue yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subtab 4: Certificates, Gaps & Deterministic Rules */}
        {subTab === "certificates" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="size-4 text-sky-400" />
                Deterministic Rule Evaluator ({rules.length} Verified Rules)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["CLIN-KDIGO-AKI", "RMF-POAM-SLA", "ENG-OHMS-POWER", "LEGAL-CDS-21USC360J"].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => presetRule(id)}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[11px] font-semibold",
                      selectedRuleId === id
                        ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
                        : "border-white/10 bg-white/5 text-zinc-300",
                    )}
                  >
                    {id}
                  </button>
                ))}
              </div>
              <textarea
                rows={5}
                value={ruleInputsJson}
                onChange={(e) => setRuleInputsJson(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 font-mono text-xs text-emerald-200"
              />
              <button
                type="button"
                onClick={() => void evaluateRule()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
              >
                <Play className="size-3.5" />
                Execute Deterministic Rule
              </button>
              {ruleResult && (
                <pre className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] text-zinc-200">
                  {JSON.stringify(ruleResult, null, 2)}
                </pre>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Persisted HMAC Validation Certificates ({certificates.length})
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">
                          {cert.requestId} <span className="text-zinc-400">({cert.domain})</span>
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold",
                            cert.verdict === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300",
                          )}
                        >
                          {cert.verdict}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        HMAC: <code>{cert.hmacSignature.slice(0, 24)}...</code> · Mode: {cert.keyMode}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void verifyCert(cert)}
                          className="rounded-lg border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-200 hover:bg-sky-500/25"
                        >
                          Verify HMAC Signature
                        </button>
                        {typeof verifyMap[cert.id] === "boolean" && (
                          <span className={verifyMap[cert.id] ? "text-emerald-300 font-semibold" : "text-rose-400 font-semibold"}>
                            {verifyMap[cert.id] ? "VALID HMAC" : "INVALID SIGNATURE"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {certificates.length === 0 && (
                    <div className="text-xs text-zinc-400 text-center py-3">No validation certificates recorded yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <ShieldAlert className="size-4 text-rose-400" />
                  Sanitized Knowledge Gaps ({gaps.length})
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {gaps.map((g) => (
                    <div key={g.id} className="rounded-lg border border-white/10 bg-black/30 p-2 text-[11px]">
                      <div className="font-semibold text-rose-200">{g.sanitizedTopic}</div>
                      <div className="text-zinc-400">Hits: {g.occurrences} · {g.failureReason.slice(0, 120)}</div>
                    </div>
                  ))}
                  {gaps.length === 0 && <div className="text-xs text-zinc-400 text-center py-2">No open knowledge gaps logged.</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
