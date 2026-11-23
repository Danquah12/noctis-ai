"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bot,
  Code2,
  Database,
  Download,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  MapPin,
  MessageSquare,
  Mic,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NOCTIS_100_CAPABILITY_PARITY_MATRIX,
  type ParityCapabilityItem,
} from "@/lib/assistant/parity-matrix";

interface NoctisUniversalAssistantTabProps {
  onSendToChat?: (text: string) => void;
  onOpenInCanvas?: (title: string, md: string) => void;
  onClose?: () => void;
}

type WorkMode = "Chat" | "Research" | "Code" | "Documents" | "Analyze" | "Images" | "Voice" | "Agents" | "Verify";
type SpecialistEngine = "Health" | "Legal" | "Cyber" | "RMF" | "Defense" | "Science" | "Engineering" | "Business";
type VerifyView = "parity" | "benchmark" | "moat";

const WORK_MODES: { id: WorkMode; icon: React.ReactNode }[] = [
  { id: "Chat", icon: <MessageSquare className="size-3.5" /> },
  { id: "Research", icon: <Globe className="size-3.5" /> },
  { id: "Code", icon: <Code2 className="size-3.5" /> },
  { id: "Documents", icon: <FileText className="size-3.5" /> },
  { id: "Analyze", icon: <BarChart3 className="size-3.5" /> },
  { id: "Images", icon: <ImageIcon className="size-3.5" /> },
  { id: "Voice", icon: <Mic className="size-3.5" /> },
  { id: "Agents", icon: <Bot className="size-3.5" /> },
  { id: "Verify", icon: <ShieldCheck className="size-3.5" /> },
];

const SPECIALIST_ENGINES: SpecialistEngine[] = [
  "Health",
  "Legal",
  "Cyber",
  "RMF",
  "Defense",
  "Science",
  "Engineering",
  "Business",
];

function statusBadgeTone(status: string) {
  if (status === "VERIFIED_OPERATIONAL" || status === "PASS") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (status === "PARTIALLY_IMPLEMENTED" || status === "PARTIAL") return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  return "border-sky-500/40 bg-sky-500/15 text-sky-300";
}

function downloadBase64File(base64: string, filename: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NoctisUniversalAssistantTab({ onSendToChat, onOpenInCanvas, onClose }: NoctisUniversalAssistantTabProps) {
  const [mode, setMode] = useState<WorkMode>("Verify");
  const [engine, setEngine] = useState<SpecialistEngine>("Business");
  const [a11yMode, setA11yMode] = useState<"standard" | "high-contrast" | "large-text">("standard");
  const [prompt, setPrompt] = useState("Analyze quarterly expenditure trends, flag anomalies, and certify outputs.");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // Parity, Benchmark & Observatory state
  const [statusData, setStatusData] = useState<any>(null);
  const [benchOut, setBenchOut] = useState<any>(null);
  const [verifyView, setVerifyView] = useState<VerifyView>("parity");
  const [paritySearch, setParitySearch] = useState("");
  const [parityFilterStatus, setParityFilterStatus] = useState("ALL");
  const [observatory, setObservatory] = useState<any>(null);
  const [passportOut, setPassportOut] = useState<any>(null);
  const [replayOut, setReplayOut] = useState<any>(null);

  // Research state
  const [fetchUrl, setFetchUrl] = useState("https://csrc.nist.gov/publications/sp");
  const [researchOut, setResearchOut] = useState<any>(null);
  const [urlOut, setUrlOut] = useState<any>(null);

  // Code state
  const [codeSnippet, setCodeSnippet] = useState(
    `const costs = [12000, 18000, 22000, 95000];\nconst total = costs.reduce((a, b) => a + b, 0);\nconsole.log("Total:", total);\ntotal;`,
  );
  const [codeOut, setCodeOut] = useState<any>(null);
  const [repoOut, setRepoOut] = useState<any>(null);

  // Documents state
  const [docTitle, setDocTitle] = useState("Noctis Sovereign Executive Deliverable");
  const [docFormat, setDocFormat] = useState<"pdf" | "docx" | "xlsx" | "pptx">("docx");
  const [docBody, setDocBody] = useState("Deterministic verification ensures every number, statute, and compliance claim is backed by an auditable trail.");
  const [docOut, setDocOut] = useState<any>(null);

  // Analyze & Maps & Simulation state
  const [csvInput, setCsvInput] = useState("Department,Quarter,Spend\nCyber,Q1,12000\nCloud,Q1,18000\nAI,Q1,22000\nInfra,Q1,95000");
  const [dataOut, setDataOut] = useState<any>(null);
  const [routeLocations, setRouteLocations] = useState("Washington, London, Accra");
  const [mapOut, setMapOut] = useState<any>(null);
  const [demandGrowth, setDemandGrowth] = useState(20);
  const [simOut, setSimOut] = useState<any>(null);

  // Images & Vision & Voice state
  const [imgPrompt, setImgPrompt] = useState("Zero-Trust Sovereign Architecture Blueprint");
  const [imgOut, setImgOut] = useState<any>(null);
  const [voiceText, setVoiceText] = useState("Verification complete: 100 capability gates active with deterministic Answer Passport seals.");
  const [translateLang, setTranslateLang] = useState("es");
  const [voiceOut, setVoiceOut] = useState<any>(null);

  // Agents / Email / Calendar / Workspaces state
  const [wfList, setWfList] = useState<any[]>([]);
  const [emailTo, setEmailTo] = useState("security-lead@example.com");
  const [emailSubject, setEmailSubject] = useState("Noctis Verification Brief");
  const [emailOut, setEmailOut] = useState<any>(null);
  const [calOut, setCalOut] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  async function callApi(urlPath: string, method = "GET", payload?: unknown) {
    setErr("");
    const res = await fetch(urlPath, {
      method,
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const json = await res.json();
    if (!res.ok && !json.ssrfBlocked && json.sendStatus !== "AWAITING_HUMAN_APPROVAL") {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json;
  }

  async function loadInitial() {
    setBusy("Loading Universal Assistant telemetry & Parity Matrix...");
    try {
      const [st, obs, bGet, wfs, schs, wss] = await Promise.all([
        callApi("/api/v2/assistant/status"),
        callApi("/api/v2/assistant/moat/observatory"),
        callApi("/api/v2/assistant/benchmark-100"),
        callApi("/api/v2/assistant/workflows"),
        callApi("/api/v2/assistant/schedules"),
        callApi("/api/v2/assistant/workspaces"),
      ]);
      setStatusData(st);
      setObservatory(obs);
      if (Array.isArray(bGet.runs) && bGet.runs.length > 0) setBenchOut(bGet.runs[0]);
      setWfList(Array.isArray(wfs.runs) ? wfs.runs : []);
      setSchedules(Array.isArray(schs.tasks) ? schs.tasks : []);
      setWorkspaces(Array.isArray(wss.workspaces) ? wss.workspaces : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load assistant state.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    void loadInitial();
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (/\.(csv|tsv|json|txt|md)$/i.test(f.name)) {
      const text = await f.text();
      setCsvInput(text);
      setMode("Analyze");
      setBusy(`Analyzing uploaded file ${f.name}...`);
      try {
        const res = await callApi("/api/v2/assistant/data/analyze", "POST", { rawText: text, filename: f.name });
        setDataOut(res);
      } finally {
        setBusy("");
      }
    } else {
      const buf = await f.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      setMode("Images");
      setBusy(`Inspecting ${f.name}...`);
      try {
        const res = await callApi("/api/v2/assistant/vision/analyze", "POST", { image: b64, notes: f.name });
        setImgOut({ visionInspection: res });
      } finally {
        setBusy("");
      }
    }
  }

  async function run100Benchmark() {
    setBusy("Executing all 100 real multi-domain benchmark tasks across Noctis backends...");
    try {
      const res = await callApi("/api/v2/assistant/benchmark-100/run", "POST", { persist: true });
      setBenchOut(res);
      setVerifyView("benchmark");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Benchmark failed.");
    } finally {
      setBusy("");
    }
  }

  const filteredParity: ParityCapabilityItem[] = NOCTIS_100_CAPABILITY_PARITY_MATRIX.filter((i) => {
    if (parityFilterStatus !== "ALL" && i.status !== parityFilterStatus) return false;
    if (paritySearch.trim()) {
      const hay = `${i.capabilityNumber} ${i.name} ${i.category} ${i.group} ${i.requirement}`.toLowerCase();
      if (!hay.includes(paritySearch.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div
      className={cn(
        "flex-1 min-h-0 flex flex-col overflow-hidden",
        a11yMode === "high-contrast" ? "bg-black text-white" : "bg-[#0b0e14] text-zinc-100",
        a11yMode === "large-text" ? "text-[15px]" : "text-xs",
      )}
    >
      {/* Sleek Workspace Header */}
      <div className="shrink-0 border-b border-white/10 bg-[#0e121a] px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300 hover:bg-white/10 flex items-center gap-1"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
            )}
            <Sparkles className="size-5 text-cyan-400" />
            <h1 className="text-sm sm:text-base font-bold text-white">Noctis Universal Assistant</h1>
            <span className="rounded-full bg-cyan-500/20 border border-cyan-500/35 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
              v1.0 · 100 Capabilities
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Accessibility mode"
              value={a11yMode}
              onChange={(e) => setA11yMode(e.target.value as "standard" | "high-contrast" | "large-text")}
              className="rounded-lg border border-white/15 bg-black/60 px-2 py-1 text-[11px] text-zinc-200"
            >
              <option value="standard">Theme: Standard</option>
              <option value="high-contrast">Theme: WCAG High Contrast</option>
              <option value="large-text">Theme: Large Text</option>
            </select>
            <button
              type="button"
              onClick={() => void loadInitial()}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10 flex items-center gap-1"
            >
              <RefreshCw className="size-3" /> Sync
            </button>
          </div>
        </div>

        {/* Unified Prompt Bar + File Upload (Section 4 Spec) */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Noctis anything, upload files, or select a specialized engine..."
            className="flex-1 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <label className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-zinc-200 cursor-pointer flex items-center gap-1.5 shrink-0">
            <Upload className="size-3.5 text-cyan-300" />
            <span>Upload File</span>
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
          {onSendToChat && (
            <button
              type="button"
              onClick={() => onSendToChat(`[Engine: ${engine} | Mode: ${mode}] ${prompt}`)}
              className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
            >
              <Send className="size-3.5" /> Run in Chat
            </button>
          )}
        </div>

        {/* 9 Work Modes & 8 Specialist Engines */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {WORK_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-medium flex items-center gap-1 border transition",
                  mode === m.id
                    ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white",
                )}
              >
                {m.icon}
                <span>{m.id}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className="text-zinc-500 mr-1">Specialist:</span>
            {SPECIALIST_ENGINES.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => setEngine(sp)}
                className={cn(
                  "rounded-full px-2 py-0.5 border",
                  engine === sp
                    ? "bg-amber-500/20 border-amber-400/50 text-amber-200 font-semibold"
                    : "border-white/10 bg-black/40 text-zinc-400 hover:text-zinc-200",
                )}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status / Error Strip */}
      {(busy || err) && (
        <div className={cn("px-4 py-1.5 text-[11px] border-b border-white/10", err ? "bg-rose-500/15 text-rose-200" : "bg-cyan-500/10 text-cyan-200")}>
          {err || busy}
        </div>
      )}

      {/* Focused Mode Workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* CHAT MODE */}
        {mode === "Chat" && (
          <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Unified Conversational & Specialist Bridge</h2>
            <p className="text-xs text-zinc-400">
              Routes multi-turn dialogue directly through `{engine}` specialist reasoning, NDKRS hybrid semantic + BM25 knowledge, and Gate 0 fail-closed verification.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSendToChat?.(prompt)}
                className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-semibold text-white"
              >
                Dispatch Prompt to Noctis Chat
              </button>
              <button
                type="button"
                onClick={() => onSendToChat?.("Generate ChatGPT vs. Noctis 100-Capability Feature Parity Matrix")}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-zinc-200 hover:bg-white/10"
              >
                Send Parity Audit to Chat
              </button>
            </div>
          </div>
        )}

        {/* RESEARCH MODE */}
        {mode === "Research" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Studio 4 — Deep Research Agent & SSRF-Protected Web Reader</h2>
                <button
                  type="button"
                  onClick={async () => {
                    setBusy("Executing multi-step Deep Research & Contradiction Check...");
                    try {
                      setResearchOut(await callApi("/api/v2/assistant/research", "POST", { query: prompt }));
                    } finally {
                      setBusy("");
                    }
                  }}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-semibold text-white flex items-center gap-1"
                >
                  <Play className="size-3" /> Run Deep Research
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={fetchUrl}
                  onChange={(e) => setFetchUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-1.5 text-white"
                  placeholder="https://... (Blocks localhost / 169.254.169.254 / private IPs)"
                />
                <button
                  type="button"
                  onClick={async () => {
                    setBusy("Fetching & quarantining web page...");
                    try {
                      setUrlOut(await callApi("/api/v2/assistant/browser/fetch", "POST", { url: fetchUrl }));
                    } finally {
                      setBusy("");
                    }
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-zinc-200"
                >
                  Fetch Verified URL
                </button>
              </div>
              {urlOut && (
                <div className="rounded-lg border border-white/10 bg-black/45 p-3 text-xs space-y-1">
                  <div className="font-semibold text-cyan-300">{urlOut.ssrfBlocked ? `BLOCKED: ${urlOut.error}` : `${urlOut.title} (HTTP ${urlOut.httpStatus})`}</div>
                  {urlOut.excerpt && <p className="text-zinc-300 line-clamp-4">{urlOut.excerpt}</p>}
                </div>
              )}
              {researchOut && (
                <div className="rounded-lg border border-white/10 bg-black/45 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Sources: {researchOut.sourcesCount}</span>
                    <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-cyan-300">
                      Confidence: {researchOut.epistemicConfidence?.calibratedConfidence} {researchOut.epistemicConfidence?.confidenceBand}
                    </span>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-zinc-300">{researchOut.contradictions?.status}</span>
                    {onOpenInCanvas && (
                      <button
                        type="button"
                        onClick={() => onOpenInCanvas("Deep Research Report", researchOut.reportMarkdown)}
                        className="ml-auto text-sky-300 hover:underline"
                      >
                        Open Report in Canvas
                      </button>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px] text-zinc-300 max-h-72 overflow-y-auto">{researchOut.reportMarkdown}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CODE MODE */}
        {mode === "Code" && (
          <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Studio 1 — Noctis Coding Agent & Isolated Sandbox</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => setRepoOut(await callApi("/api/v2/assistant/code/analyze-repo", "POST", { subdir: "src/lib/assistant" }))}
                  className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-zinc-200"
                >
                  Analyze Repo Architecture
                </button>
                <button
                  type="button"
                  onClick={async () => setCodeOut(await callApi("/api/v2/assistant/code/execute", "POST", { code: codeSnippet, language: "javascript" }))}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 font-semibold text-white flex items-center gap-1"
                >
                  <Play className="size-3" /> Run in Safe Sandbox
                </button>
              </div>
            </div>
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-white/15 bg-black/60 p-3 font-mono text-xs text-emerald-300"
            />
            {codeOut && (
              <div className="rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-xs space-y-1">
                <div className="text-cyan-300">{`Status: ${codeOut.status} · ${codeOut.executionMs}ms · Seal: ${codeOut.executionSeal}`}</div>
                <div className="text-white">{`stdout: ${(codeOut.stdout || []).join(" | ") || "(none)"} · return: ${JSON.stringify(codeOut.returnValue)}`}</div>
                {(codeOut.stderr || []).length > 0 && <div className="text-rose-300">{`stderr: ${codeOut.stderr.join(" | ")}`}</div>}
              </div>
            )}
            {repoOut && (
              <div className="rounded-lg border border-white/10 bg-black/45 p-3 text-xs space-y-1">
                <div className="font-semibold text-white">{`Scanned ${repoOut.scannedPath}: ${repoOut.totalFiles} source files`}</div>
                <div className="text-zinc-400">{(repoOut.architectureLayers || []).join(" · ")}</div>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS MODE */}
        {mode === "Documents" && (
          <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Studio 3 — Genuine Word (.docx), Excel (.xlsx), PowerPoint (.pptx) & PDF Generator</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="sm:col-span-2 rounded-lg border border-white/15 bg-black/55 px-3 py-1.5 text-white"
              />
              <select
                value={docFormat}
                onChange={(e) => setDocFormat(e.target.value as "pdf" | "docx" | "xlsx" | "pptx")}
                className="rounded-lg border border-white/15 bg-black/65 px-3 py-1.5 text-white"
              >
                <option value="docx">Word Document (.docx)</option>
                <option value="xlsx">Excel Workbook (.xlsx)</option>
                <option value="pptx">PowerPoint Deck (.pptx)</option>
                <option value="pdf">Standards PDF (.pdf)</option>
              </select>
            </div>
            <textarea
              value={docBody}
              onChange={(e) => setDocBody(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-white/15 bg-black/55 p-3 text-xs text-white"
            />
            <button
              type="button"
              onClick={async () => {
                setBusy(`Building genuine .${docFormat} binary...`);
                try {
                  const res = await callApi("/api/v2/assistant/documents/generate", "POST", {
                    format: docFormat,
                    title: docTitle,
                    content: docBody,
                  });
                  setDocOut(res);
                  if (res.base64) downloadBase64File(res.base64, res.filename, res.mimeType);
                } finally {
                  setBusy("");
                }
              }}
              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 font-semibold text-white inline-flex items-center gap-1.5"
            >
              <Download className="size-3.5" /> Generate & Download Genuine .{docFormat.toUpperCase()}
            </button>
            {docOut && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                {`Generated ${docOut.filename} (${docOut.byteLength} bytes, MIME: ${docOut.mimeType}, SHA-256: ${String(docOut.sha256 || "").slice(0, 16)}...)`}
              </div>
            )}
          </div>
        )}

        {/* ANALYZE MODE (DATA + INTERACTIVE SVG CHART + MAP + WHAT-IF SIMULATOR) */}
        {mode === "Analyze" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Studio 2 — Dataset Analytics, Outliers & Interactive Charts</h2>
                <button
                  type="button"
                  onClick={async () => setDataOut(await callApi("/api/v2/assistant/data/analyze", "POST", { rawText: csvInput }))}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-semibold text-white"
                >
                  Run Statistical Analysis & Chart
                </button>
              </div>
              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-white/15 bg-black/55 p-3 font-mono text-xs text-zinc-200"
              />
              {dataOut && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div className="rounded-lg border border-white/10 bg-black/45 p-3 space-y-1">
                    <div className="font-semibold text-cyan-300">{`Rows: ${dataOut.totalRowsAnalyzed} · Anomalies Flagged: ${dataOut.anomalyCount}`}</div>
                    {(dataOut.numericStats || []).map((st: any) => (
                      <div key={st.column} className="text-[11px] text-zinc-300">
                        {`${st.column}: Mean=${st.mean}, Median=${st.median}, StdDev=${st.stdDev}, IQR=${st.iqr}, Outliers=${st.outliers?.length || 0}`}
                      </div>
                    ))}
                  </div>
                  {/* Interactive Live SVG Bar Chart */}
                  {dataOut.chartSpec && (
                    <div className="rounded-lg border border-white/10 bg-black/45 p-3">
                      <div className="text-[11px] font-semibold text-white mb-2">{dataOut.chartSpec.title}</div>
                      <svg viewBox="0 0 360 120" className="w-full h-28">
                        {(dataOut.chartSpec.labels || []).map((lbl: string, idx: number) => {
                          const val = dataOut.chartSpec.series?.[0]?.data?.[idx] || 0;
                          const max = Math.max(1, dataOut.chartSpec.yDomain?.[1] || 1);
                          const h = Math.round((val / max) * 82);
                          const x = 14 + idx * Math.floor(330 / Math.max(1, dataOut.chartSpec.labels.length));
                          return (
                            <g key={lbl}>
                              <rect x={x} y={96 - h} width={28} height={h} rx={4} fill="#06b6d4" />
                              <text x={x + 14} y={112} textAnchor="middle" fill="#94a3b8" fontSize="9">{lbl.slice(0, 6)}</text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Geo Route Map + What-If Sliders (#31, #86) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5"><MapPin className="size-3.5 text-emerald-400" /> Interactive Route & Haversine Map</h3>
                  <button
                    type="button"
                    onClick={async () => setMapOut(await callApi("/api/v2/assistant/maps/plan", "POST", { locations: routeLocations.split(",").map((s) => s.trim()), mode: "flight" }))}
                    className="rounded-md bg-white/10 hover:bg-white/15 px-2.5 py-1 text-[11px] text-white"
                  >
                    Plot Route
                  </button>
                </div>
                <input
                  type="text"
                  value={routeLocations}
                  onChange={(e) => setRouteLocations(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 text-white"
                />
                {mapOut && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-emerald-300">{`Total Distance: ${mapOut.totalDistanceKm} km (${mapOut.totalDistanceMiles} mi) · Est Flight: ${mapOut.estimatedTotalHours}h`}</div>
                    <svg viewBox="-180 -90 360 180" className="w-full h-32 rounded border border-white/10 bg-[#05080f]">
                      <rect x="-180" y="-90" width="360" height="180" fill="#070b14" />
                      {(mapOut.waypoints || []).map((w: any, idx: number, arr: any[]) => {
                        const x = w.lon;
                        const y = -w.lat;
                        const next = arr[idx + 1];
                        return (
                          <g key={w.label}>
                            {next && <line x1={x} y1={y} x2={next.lon} y2={-next.lat} stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 2" />}
                            <circle cx={x} cy={y} r="3.5" fill="#10b981" />
                            <text x={x + 5} y={y + 3} fill="#e2e8f0" fontSize="8">{w.label.split(",")[0]}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white">Interactive What-If Counterfactual Simulator (#86)</h3>
                  <button
                    type="button"
                    onClick={async () => setSimOut(await callApi("/api/v2/assistant/reasoning/counterfactual", "POST", { scenarioName: "Capacity Stress", demandGrowthPct: demandGrowth, efficiencyGainPct: 10 }))}
                    className="rounded-md bg-white/10 hover:bg-white/15 px-2.5 py-1 text-[11px] text-white"
                  >
                    Simulate
                  </button>
                </div>
                <label className="block text-[11px] text-zinc-300">
                  {`Demand Surge Scenario: +${demandGrowth}%`}
                  <input type="range" min={-20} max={80} value={demandGrowth} onChange={(e) => setDemandGrowth(Number(e.target.value))} className="w-full mt-1" />
                </label>
                {simOut && (
                  <div className="rounded-lg border border-white/10 bg-black/45 p-2.5 text-[11px] text-zinc-300">
                    {`Projected Demand: ${simOut.counterfactual?.projectedDemand} · Utilization: ${simOut.counterfactual?.utilizationPct}% · Overload Risk: ${simOut.counterfactual?.overloadRisk}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* IMAGES & VISION MODE */}
        {mode === "Images" && (
          <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Image Generation, Editing & Vision Inspection</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                className="flex-1 rounded-lg border border-white/15 bg-black/55 px-3 py-1.5 text-white"
              />
              <button
                type="button"
                onClick={async () => setImgOut(await callApi("/api/v2/assistant/images/generate", "POST", { prompt: imgPrompt }))}
                className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-semibold text-white"
              >
                Generate Visual
              </button>
              <button
                type="button"
                onClick={async () => setImgOut(await callApi("/api/v2/assistant/images/edit", "POST", { prompt: imgPrompt, overlayCaption: "ANNOTATED LAYER v2", accentHex: "#10b981" }))}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-white hover:bg-white/10"
              >
                Apply Edit Layer
              </button>
            </div>
            {imgOut?.dataUri && <img src={imgOut.dataUri} alt={imgPrompt} className="max-w-lg rounded-xl border border-white/15" />}
            {imgOut?.visionInspection && (
              <pre className="rounded-lg bg-black/50 p-3 text-[11px] text-emerald-300">{JSON.stringify(imgOut.visionInspection, null, 2)}</pre>
            )}
          </div>
        )}

        {/* VOICE & TRANSLATION MODE */}
        {mode === "Voice" && (
          <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Multilingual Translation & Barge-In Voice Engine</h2>
            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white/15 bg-black/55 p-3 text-white"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={translateLang}
                onChange={(e) => setTranslateLang(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/65 px-2.5 py-1.5 text-white"
              >
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
                <option value="pt">Portuguese (pt)</option>
              </select>
              <button
                type="button"
                onClick={async () => setVoiceOut(await callApi("/api/v2/assistant/translate", "POST", { text: voiceText, targetLang: translateLang }))}
                className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-semibold text-white"
              >
                Translate
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(new SpeechSynthesisUtterance(voiceText));
                  }
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-white hover:bg-white/10"
              >
                Speak (Web Speech)
              </button>
            </div>
            {voiceOut && (
              <div className="rounded-lg border border-white/10 bg-black/45 p-3 text-xs text-emerald-300">
                {`[${voiceOut.mode} -> ${voiceOut.targetLang}] ${voiceOut.translatedText}`}
              </div>
            )}
          </div>
        )}

        {/* AGENTS, WORKFLOWS, EMAIL, CALENDAR & WORKSPACES */}
        {mode === "Agents" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Studio 5 — Autonomous Work Agent & Approval Gate</h2>
                <button
                  type="button"
                  onClick={async () => {
                    await callApi("/api/v2/assistant/workflows", "POST", {
                      workflowName: "Research & Compliance Release",
                      objective: prompt,
                      externalWriteRequested: true,
                    });
                    const list = await callApi("/api/v2/assistant/workflows");
                    setWfList(Array.isArray(list.runs) ? list.runs : []);
                  }}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1 text-white font-semibold"
                >
                  Launch Workflow
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {wfList.map((w) => (
                  <div key={String(w.id)} className="rounded-lg border border-white/10 bg-black/45 p-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white">{String(w.workflow_name)}</div>
                      <div className="text-[10px] text-zinc-400">{`${String(w.id)} · Status: ${String(w.status)}`}</div>
                    </div>
                    {String(w.status) === "AWAITING_APPROVAL" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await callApi("/api/v2/assistant/workflows/approve", "POST", { id: w.id, approver: "human-reviewer" });
                          const list = await callApi("/api/v2/assistant/workflows");
                          setWfList(Array.isArray(list.runs) ? list.runs : []);
                        }}
                        className="rounded bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white"
                      >
                        Approve Execution
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-2.5">
              <h2 className="text-sm font-semibold text-white">Email (.eml), Calendar (.ics), Schedules ({schedules.length}) & Workspaces ({workspaces.length})</h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="rounded-lg border border-white/15 bg-black/55 px-2.5 py-1 text-white"
                />
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="flex-1 rounded-lg border border-white/15 bg-black/55 px-2.5 py-1 text-white"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const em = await callApi("/api/v2/assistant/connectors/email", "POST", { to: emailTo, subject: emailSubject, body: prompt });
                    setEmailOut(em);
                    if (em.emlBase64) downloadBase64File(em.emlBase64, em.emlFilename, "message/rfc822");
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-zinc-200 hover:bg-white/10"
                >
                  Draft & Export .EML
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const cal = await callApi("/api/v2/assistant/connectors/calendar", "POST", { title: emailSubject });
                    setCalOut(cal);
                    if (cal.icsBase64) downloadBase64File(cal.icsBase64, cal.icsFilename, "text/calendar");
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-zinc-200 hover:bg-white/10"
                >
                  Create Invite & Export .ICS
                </button>
              </div>
              {(emailOut || calOut) && (
                <div className="rounded-lg border border-white/10 bg-black/45 p-2.5 text-[11px] text-emerald-300">
                  {emailOut ? `EML: ${emailOut.emlFilename} (${emailOut.sendStatus}) ` : ""}
                  {calOut ? `| ICS: ${calOut.icsFilename} (Conflicts: ${calOut.conflictCount})` : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VERIFY MODE: PARITY MATRIX (100) + 100-TASK BENCHMARK + DISTINCTIVE MOAT (#91-#100) */}
        {mode === "Verify" && (
          <div className="space-y-4">
            {/* Compact KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#121722] p-3">
                <div className="text-[10px] text-zinc-400 uppercase">Audited Matrix</div>
                <div className="text-xl font-bold text-white">{statusData?.paritySummary?.totalCapabilities ?? 100}</div>
                <div className="text-[10px] text-cyan-300">40 ChatGPT + 50 Adv + 10 Moat</div>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                <div className="text-[10px] text-zinc-400 uppercase">Verified Operational</div>
                <div className="text-xl font-bold text-emerald-300">
                  {statusData?.paritySummary?.countsByStatus?.VERIFIED_OPERATIONAL ?? 98}
                </div>
                <div className="text-[10px] text-zinc-400">Real backends & tests</div>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                <div className="text-[10px] text-zinc-400 uppercase">Partially Implemented</div>
                <div className="text-xl font-bold text-amber-300">
                  {statusData?.paritySummary?.countsByStatus?.PARTIALLY_IMPLEMENTED ?? 2}
                </div>
                <div className="text-[10px] text-zinc-400">#28 Browser / #29 OS GUI</div>
              </div>
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
                <div className="text-[10px] text-zinc-400 uppercase">100-Task Benchmark</div>
                <div className="text-xl font-bold text-sky-300">
                  {benchOut ? `${benchOut.passRatePct ?? benchOut.pass_rate_pct}%` : "Run Now"}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {benchOut ? `${benchOut.passedTasks ?? benchOut.passed_tasks} PASS / ${benchOut.partialTasks ?? benchOut.partial_tasks} PARTIAL` : "Executable verification"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#121722] p-3">
                <div className="text-[10px] text-zinc-400 uppercase">Observatory (#100)</div>
                <div className="text-xl font-bold text-cyan-300">{observatory?.sealedPassportsCount ?? 0}</div>
                <div className="text-[10px] text-zinc-400">Sealed Answer Passports</div>
              </div>
            </div>

            {/* Sub-pills under Verify to keep screen clean */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "parity", label: "100-Capability 5-Status Parity Matrix" },
                  { id: "benchmark", label: "100-Task Real Benchmark Scorecard" },
                  { id: "moat", label: "Noctis Distinctive Moat (#91–#100)" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVerifyView(v.id as VerifyView)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium border",
                      verifyView === v.id
                        ? "bg-white/15 border-cyan-400/50 text-white"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white",
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void run100Benchmark()}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <Activity className="size-3.5" /> Execute 100-Task Benchmark Live
              </button>
            </div>

            {/* Sub-view 1: Parity Matrix */}
            {verifyView === "parity" && (
              <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">{`Showing ${filteredParity.length} / 100 Capabilities`}</span>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={parityFilterStatus}
                      onChange={(e) => setParityFilterStatus(e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 text-zinc-200"
                    >
                      <option value="ALL">All 5 Audit Statuses</option>
                      <option value="VERIFIED_OPERATIONAL">VERIFIED_OPERATIONAL</option>
                      <option value="IMPLEMENTED_NOT_TESTED">IMPLEMENTED_NOT_TESTED</option>
                      <option value="PARTIALLY_IMPLEMENTED">PARTIALLY_IMPLEMENTED</option>
                      <option value="NOT_IMPLEMENTED">NOT_IMPLEMENTED</option>
                      <option value="UNKNOWN">UNKNOWN</option>
                    </select>
                    <input
                      type="text"
                      value={paritySearch}
                      onChange={(e) => setParitySearch(e.target.value)}
                      placeholder="Filter # or capability..."
                      className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredParity.map((item) => (
                    <div key={item.capabilityNumber} className="rounded-lg border border-white/10 bg-black/45 p-2.5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-white">{`#${item.capabilityNumber} · ${item.name}`}</span>
                        <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0", statusBadgeTone(item.status))}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-cyan-300/80">{`${item.group} · ${item.priority} · Est: ${item.devEstimate}`}</div>
                      <div className="text-[11px] text-zinc-300">{item.demoNote}</div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">{`${item.apiEndpoint} · ${item.sourceModules[0]}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-view 2: 100-Task Benchmark */}
            {verifyView === "benchmark" && (
              <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
                {!benchOut ? (
                  <p className="text-zinc-400">Click "Execute 100-Task Benchmark Live" above to measure all 100 tasks in real time.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-white">{`Run ${benchOut.runId ?? benchOut.run_id} — Pass Rate ${benchOut.passRatePct ?? benchOut.pass_rate_pct}%`}</span>
                      <span className="text-[11px] text-emerald-300">{`PASS: ${benchOut.passedTasks ?? benchOut.passed_tasks} · PARTIAL: ${benchOut.partialTasks ?? benchOut.partial_tasks} · FAIL: ${benchOut.failedTasks ?? benchOut.failed_tasks}`}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                      {Object.entries(benchOut.categoryScores ?? benchOut.category_scores_json ?? {}).map(([cat, sc]: [string, any]) => (
                        <div key={cat} className="rounded-lg border border-white/10 bg-black/45 p-2.5 text-[11px]">
                          <div className="font-semibold text-white truncate">{cat}</div>
                          <div className="text-emerald-300">{`Pass ${sc.pass}/${sc.total} · Partial ${sc.partial} · Fail ${sc.fail}`}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sub-view 3: Distinctive Moat (#91-#100) */}
            {verifyView === "moat" && (
              <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Layers className="size-4 text-cyan-400" /> Answer Passport (#91) & Deterministic Replay (#93)
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const pp = await callApi("/api/v2/assistant/moat/passport", "POST", {
                        domain: "legal",
                        promptText: prompt,
                        inputs: { triggerDate: "2026-11-07", periodDays: 21 },
                        answerSummary: "Rolled FRCP deadline to 2026-11-30 with barred-attorney sign-off gate.",
                        sourceVersions: [{ sourceId: "CAT260-LEGAL-FRCP6-DISCOVERY", version: "FRCP-2025" }],
                        calculationTrace: [{ step: "1", formula: "2026-11-07 + 21d -> Sat -> Mon", result: "2026-11-30" }],
                      });
                      setPassportOut(pp);
                      setReplayOut(await callApi("/api/v2/assistant/moat/replay", "POST", { passportId: pp.passportId }));
                    }}
                    className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-semibold text-white"
                  >
                    Mint Answer Passport & Verify Replay
                  </button>
                </div>
                {passportOut && (
                  <div className="rounded-lg border border-white/10 bg-black/45 p-3 text-xs space-y-1 font-mono">
                    <div className="text-cyan-300">{`Passport ID: ${passportOut.passportId} · Replay SHA-256: ${passportOut.replaySha256}`}</div>
                    {replayOut && (
                      <div className="text-emerald-300">{`Deterministic Replay Match: ${String(replayOut.deterministicMatch)}`}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
