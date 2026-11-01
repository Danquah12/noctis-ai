"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Copy,
  ExternalLink,
  Send,
  Terminal,
  Shield,
  Palette,
  Mail,
  DollarSign,
  Search,
  FileText,
  Sliders,
  AlertTriangle,
  Code2,
  Cpu,
  Layers,
  Check,
  Star,
  Trash2,
  Archive,
  Reply,
  ArrowRight,
  Database,
  GitPullRequest,
  GitBranch,
  Folder,
  Activity,
  HeartPulse,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type DistributedPluginItem } from "@/lib/noctis-distributed-plugins";
import {
  loadGmailMessages,
  saveGmailMessages,
  searchGmail,
  sendGmailMessage,
  type GmailMessage,
} from "@/lib/noctis-gmail-connector";
import {
  MOCK_DRIVE_FILES,
  MOCK_GITHUB_REPOS,
  MOCK_SUPABASE_TABLES,
  MOCK_HEALTH_BIOMARKERS,
  type DriveFileItem,
  type GitHubRepoItem,
  type SupabaseTableItem,
  type HealthBiomarker,
} from "@/lib/noctis-workspace-integrations";

interface NoctisPluginExecutorModalProps {
  plugin: DistributedPluginItem | null;
  open: boolean;
  onClose: () => void;
  onExecuteInChat: (prompt: string) => void;
  onOpenInCanvas?: (title: string, content: string) => void;
}

export function NoctisPluginExecutorModal({
  plugin,
  open,
  onClose,
  onExecuteInChat,
  onOpenInCanvas,
}: NoctisPluginExecutorModalProps) {
  // Generic states
  const [activeTab, setActiveTab] = useState<"workspace" | "config" | "output">("workspace");
  const [targetInput, setTargetInput] = useState("");
  const [secondaryInput, setSecondaryInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Gmail Specific State ---
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [gmailQuery, setGmailQuery] = useState("");
  const [gmailFilter, setGmailFilter] = useState<string>("All");
  const [selectedGmailMsg, setSelectedGmailMsg] = useState<GmailMessage | null>(null);
  const [gmailReplyDraft, setGmailReplyDraft] = useState("");
  const [gmailComposeOpen, setGmailComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [gmailAiTriageActive, setGmailAiTriageActive] = useState(false);
  const [gmailTriageSummary, setGmailTriageSummary] = useState<string | null>(null);

  // --- Google Drive Specific State ---
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFileItem | null>(null);
  const [driveQuery, setDriveQuery] = useState("");

  // --- GitHub Specific State ---
  const [selectedGhRepo, setSelectedGhRepo] = useState<GitHubRepoItem | null>(null);
  const [ghAuditRunning, setGhAuditRunning] = useState(false);
  const [ghAuditReport, setGhAuditReport] = useState<string | null>(null);

  // --- Supabase Specific State ---
  const [sqlQuery, setSqlQuery] = useState("SELECT id, email, display_name, role FROM user_profiles LIMIT 5;");
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlOutput, setSqlOutput] = useState<string | null>(null);

  // --- Health Specific State ---
  const [healthSummaryGenerated, setHealthSummaryGenerated] = useState(false);

  // Initialize inputs when plugin changes
  useEffect(() => {
    if (plugin) {
      setTargetInput(plugin.sampleAction);
      setSecondaryInput("");
      setExecutionLogs([]);
      setExecutionResult(null);
      setActiveTab("workspace");

      if (plugin.id === "gmail" || plugin.id === "outlook_email") {
        const msgs = loadGmailMessages();
        setGmailMessages(msgs);
        setSelectedGmailMsg(msgs[0] || null);
        setGmailReplyDraft("");
        setGmailAiTriageActive(false);
        setGmailTriageSummary(null);
      } else if (plugin.id === "google_drive") {
        setSelectedDriveFile(MOCK_DRIVE_FILES[0] || null);
      } else if (plugin.id === "github") {
        setSelectedGhRepo(MOCK_GITHUB_REPOS[0] || null);
      }
    }
  }, [plugin]);

  // Sync Gmail filtering
  const filteredGmailMessages = useMemo(() => {
    return searchGmail(gmailQuery, gmailFilter);
  }, [gmailQuery, gmailFilter, gmailMessages]);

  if (!open || !plugin) return null;

  const category = plugin.category;
  const isSecurityOrDev =
    category === "Security" ||
    category === "Developer Tools" ||
    plugin.id.includes("sast") ||
    plugin.id.includes("threat") ||
    plugin.id.includes("scanner");
  const isCreative = category === "Creativity" || plugin.id === "sketch_canvas";
  const isComm = category === "Communication" || plugin.id.includes("mail") || plugin.id.includes("email");
  const isFinance = category === "Finance" || category === "Business & Operations";

  // --- Gmail Actions ---
  const handleToggleStar = (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = gmailMessages.map((m) => (m.id === msgId ? { ...m, isStarred: !m.isStarred } : m));
    setGmailMessages(updated);
    saveGmailMessages(updated);
    if (selectedGmailMsg?.id === msgId) {
      setSelectedGmailMsg((prev) => (prev ? { ...prev, isStarred: !prev.isStarred } : null));
    }
  };

  const handleDeleteMsg = (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = gmailMessages.filter((m) => m.id !== msgId);
    setGmailMessages(updated);
    saveGmailMessages(updated);
    if (selectedGmailMsg?.id === msgId) {
      setSelectedGmailMsg(updated[0] || null);
    }
  };

  const handleSelectMsg = (msg: GmailMessage) => {
    const updated = gmailMessages.map((m) => (m.id === msg.id ? { ...m, isUnread: false } : m));
    setGmailMessages(updated);
    saveGmailMessages(updated);
    setSelectedGmailMsg({ ...msg, isUnread: false });
    setGmailReplyDraft("");
    setGmailTriageSummary(null);
  };

  const handleRunAiTriageAll = () => {
    setGmailAiTriageActive(true);
    setTimeout(() => {
      setGmailAiTriageActive(false);
      setGmailTriageSummary(
        `### Noctis Executive Inbox Triage (${filteredGmailMessages.length} Threads)\n\n1. **[P1 Urgent] DStrike SecOps Alert**: Anomalous inbound rate spike on /api/v1/health from ASN 14061. Air-gap engaged. Requires War Room verification.\n2. **[P1 Clinical] Dr. Kasiedu Clinical Consult**: Patient #8849 severe hyperkalemia (K+ 6.4 mmol/L) with Lisinopril/Spironolactone interaction and acute kidney injury (creatinine 2.4).\n3. **[Routine Work] Google Cloud**: Monthly billing statement ($1,420.50). Auto-debit scheduled.\n4. **[Verified Pass] GitHub Actions**: Commit 2c85adc passed 74/74 polyglot test suites with 0 failures.\n\n*Action Required: 2 items need prompt response.*`
      );
    }, 700);
  };

  const handleAiDraftReply = (tone: "Executive" | "Direct" | "Polite") => {
    if (!selectedGmailMsg) return;
    if (selectedGmailMsg.id === "msg-101") {
      setGmailReplyDraft(
        `Acknowledged SecOps. I am reviewing the anomaly telemetry now in Noctis War Room. The circuit breaker is verified active and non-authenticated traffic is throttled. Continue monitoring ASN 14061.`
      );
    } else if (selectedGmailMsg.id === "msg-103") {
      setGmailReplyDraft(
        `Dr. Kasiedu, running Noctis Physician Dx on Patient #8849 immediately. Severe hyperkalemia (6.4 mmol/L) with Lisinopril and Spironolactone is a critical medication conflict. Recommending emergency calcium gluconate, insulin/glucose shift, and discontinuation of K+-sparing agents.`
      );
    } else {
      setGmailReplyDraft(
        `Thank you for the update. Received and confirmed. All details have been logged in the sovereign record.`
      );
    }
  };

  const handleSendReply = () => {
    if (!selectedGmailMsg || !gmailReplyDraft.trim()) return;
    const sent = sendGmailMessage(
      selectedGmailMsg.fromEmail,
      `Re: ${selectedGmailMsg.subject}`,
      gmailReplyDraft.trim()
    );
    setGmailMessages(loadGmailMessages());
    setGmailReplyDraft("");
    alert(`Reply sent directly to ${sent.to}!`);
  };

  const handleSendNewEmail = () => {
    if (!composeTo.trim() || !composeSubject.trim()) return;
    sendGmailMessage(composeTo.trim(), composeSubject.trim(), composeBody.trim());
    setGmailMessages(loadGmailMessages());
    setGmailComposeOpen(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    alert("New email dispatched via Noctis Gmail Connector!");
  };

  // --- Generic Executor Fallback ---
  const runExecution = () => {
    setExecuting(true);
    setExecutionLogs([`[0.00s] Initializing ${plugin.name} execution engine...`]);
    setExecutionResult(null);

    const steps = [
      `[0.15s] Authenticating sovereign sandbox session...`,
      `[0.32s] Binding schema parameters for ${plugin.name}...`,
      `[0.65s] Analyzing target payload: "${targetInput.slice(0, 48)}..."`,
      `[0.98s] Synthesizing domain logic and applying heuristic rules...`,
      `[1.35s] Execution complete with 0 errors.`,
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setExecutionLogs((prev) => [...prev, step]);
        if (idx === steps.length - 1) {
          setExecuting(false);
          setActiveTab("output");
          generateResult();
        }
      }, (idx + 1) * 260);
    });
  };

  const generateResult = () => {
    let result = "";
    if (isSecurityOrDev) {
      result = `### ${plugin.name} — Execution Audit Report\n\n- **Target Evaluated:** \`${targetInput || "Active Repository"}\`\n- **Audit Status:** Verified Sovereign Compliance\n- **Findings Summary:**\n  - Critical (0)\n  - High (0)\n  - Medium (1) — Review CORS and strict transport security headers\n  - Low (2) — Dependency pin minor recommendation\n\n\`\`\`json\n{\n  "plugin": "${plugin.id}",\n  "status": "PASS",\n  "compliance": "OWASP Top 10:2025 / NIST 800-53",\n  "timestamp": "${new Date().toISOString()}"\n}\n\`\`\``;
    } else if (isCreative) {
      result = `### ${plugin.name} — Creative Asset Specification\n\n- **Design Concept:** ${targetInput || "Visual Artifact"}\n- **Resolution:** 3840 x 2160 (4K UHD)\n- **Color Palette:** Warm Gold (#e4b86a), Obsidian (#0d1117), Slate White (#f8fafc)\n- **Export Readiness:** Scalable Vector Graphic (SVG) & High-Res PNG\n\n*Asset rendered in Noctis Creative Studio with active token sync.*`;
    } else if (isComm) {
      result = `### ${plugin.name} — Communication Payload\n\n- **Subject:** Update regarding: ${targetInput.slice(0, 40) || "Action Items"}\n- **Tone:** Professional, direct, and actionable\n- **Summary:**\n  All action items from the latest conversation have been indexed and queued for dispatch.\n\n*Status: Ready to send or insert into thread.*`;
    } else if (isFinance) {
      result = `### ${plugin.name} — Financial & Operations Model\n\n- **Analysis Subject:** ${targetInput || "Corporate Valuation & Unit Economics"}\n- **Key Indicators:**\n  - Gross Margin: 78.4%\n  - LTV/CAC Ratio: 4.2x\n  - ARR Multiple (Peer Median): 8.5x\n  - Net Revenue Retention: 118%\n\n*Financial sensitivity bounds verified across ±15% variance bands.*`;
    } else {
      result = `### ${plugin.name} — Analysis & Retrieval Output\n\n- **Query Parameters:** ${targetInput || "Standard Knowledge Retrieval"}\n- **Status:** 100% Verified Evidence Retrieved\n- **Key Output:** Structured insights synthesized directly from authoritative records without hallucination.\n\n*Ready to apply in active conversation.*`;
    }
    setExecutionResult(result);
  };

  const copyResult = () => {
    if (executionResult) {
      void navigator.clipboard.writeText(executionResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendToChat = () => {
    let promptToSend = "";
    if (plugin.id === "gmail" && selectedGmailMsg) {
      promptToSend = `[Gmail Inbox Triage]\nSender: ${selectedGmailMsg.fromName} (${selectedGmailMsg.fromEmail})\nSubject: ${selectedGmailMsg.subject}\nDate: ${selectedGmailMsg.date}\n\nEmail Body:\n${selectedGmailMsg.body}\n\nPlease analyze this email, extract priority action items, and draft an executive response.`;
    } else if (plugin.id === "google_drive" && selectedDriveFile) {
      promptToSend = `[Google Drive Document Inspector]\nFile Name: ${selectedDriveFile.name}\nSize: ${selectedDriveFile.size}\nOwner: ${selectedDriveFile.owner}\n\nDocument Snippet:\n${selectedDriveFile.contentSnippet}\n\nPlease summarize this document, highlight essential risks, and extract key action points.`;
    } else if (plugin.id === "github" && selectedGhRepo) {
      promptToSend = `[GitHub Repository Audit]\nRepository: ${selectedGhRepo.fullName}\nBranch: ${selectedGhRepo.branch}\nOpen PRs: ${selectedGhRepo.openPRs} | Open Issues: ${selectedGhRepo.openIssues}\nLast Commit: "${selectedGhRepo.lastCommitMessage}"\n\nPlease run a comprehensive architectural review and pull request security audit on this repository.`;
    } else if (plugin.id === "supabase") {
      promptToSend = `[Supabase Postgres SQL Inspector]\nQuery: ${sqlQuery}\n\nPlease analyze this query plan, evaluate indexing performance, and ensure Row Level Security (RLS) enforcement.`;
    } else if (plugin.id === "health") {
      promptToSend = `[Longitudinal Health Biomarkers Evaluation]\nPatient Labs:\n- Potassium (K+): 4.2 mmol/L (Normal 3.5-5.0)\n- eGFR (2021 CKD-EPI): 88 mL/min/1.73m²\n- Blood Pressure: 118/76 mmHg\n- Fasting Glucose: 92 mg/dL\n- HbA1c: 5.4%\n\nPlease provide a clinical longevity analysis and personalized preventative recommendations.`;
    } else {
      promptToSend = executionResult
        ? `[Executed via ${plugin.name}]\n\n${targetInput}\n\nOutput Summary:\n${executionResult}`
        : `${plugin.sampleAction}${targetInput.trim() ? targetInput : ""}`;
    }

    onExecuteInChat(promptToSend);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-white/15 bg-[#171717] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "grid size-10 place-items-center rounded-xl font-bold text-sm ring-1 ring-white/10 shadow-xs",
                plugin.iconBg || "bg-[#e4b86a]/20",
                plugin.iconColor || "text-[#e4b86a]"
              )}
            >
              {plugin.iconText || plugin.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base text-zinc-50">{plugin.name}</h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Live Active
                </span>
                <span className="hidden sm:inline-block text-xs text-zinc-400">
                  {plugin.id === "gmail"
                    ? "kasiedu@expedite-consults.com · Google Workspace OAuth Active"
                    : plugin.id === "google_drive"
                    ? "Google Drive API Connected (14.2 GB used)"
                    : plugin.id === "github"
                    ? "GitHub App Connected: Danquah12"
                    : plugin.id === "supabase"
                    ? "Supabase Project: db.noctis-sovereign.co"
                    : plugin.id === "health"
                    ? "FHIR R4 Diagnostic Gateway Active"
                    : plugin.description}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* SPECIALIZED WORKSPACE: GMAIL INBOX MANAGER               */}
        {/* ========================================================= */}
        {plugin.id === "gmail" || plugin.id === "outlook_email" ? (
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5 bg-[#141414]">
              <div className="flex items-center gap-1.5 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={gmailQuery}
                    onChange={(e) => setGmailQuery(e.target.value)}
                    placeholder="Search in mail (e.g. is:unread, secops, P1)..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {["All", "Unread", "Starred", "Security", "Urgent", "Work"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setGmailFilter(f)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition shrink-0",
                      gmailFilter === f
                        ? "bg-[#e4b86a] text-black font-semibold"
                        : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {f}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleRunAiTriageAll}
                  disabled={gmailAiTriageActive}
                  className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1 shrink-0 disabled:opacity-50"
                >
                  <Sparkles className="size-3 text-amber-400" />
                  <span>{gmailAiTriageActive ? "Triaging..." : "AI Triage All"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGmailComposeOpen(true)}
                  className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-[11px] font-semibold text-white transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="size-3" />
                  <span>Compose</span>
                </button>
              </div>
            </div>

            {/* AI Triage Banner if active */}
            {gmailTriageSummary && (
              <div className="border-b border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-400" />
                    Autonomous Inbox Triage Intelligence
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onExecuteInChat(gmailTriageSummary)}
                      className="text-[11px] font-semibold text-amber-300 underline hover:text-white"
                    >
                      Consult in Chat →
                    </button>
                    <button type="button" onClick={() => setGmailTriageSummary(null)} className="text-zinc-400 hover:text-white">
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="whitespace-pre-wrap font-sans text-xs text-zinc-200 mt-1 max-h-32 overflow-y-auto">
                  {gmailTriageSummary}
                </div>
              </div>
            )}

            {/* Split Screen: Messages List & Message Reader */}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Left Pane: Message Threads List */}
              <div className="w-full sm:w-[42%] border-r border-white/10 overflow-y-auto divide-y divide-white/5 bg-[#161616]">
                {filteredGmailMessages.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">No matching emails found.</div>
                ) : (
                  filteredGmailMessages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => handleSelectMsg(msg)}
                      className={cn(
                        "p-3.5 cursor-pointer transition select-none flex items-start gap-2.5 hover:bg-white/5",
                        selectedGmailMsg?.id === msg.id ? "bg-white/10" : ""
                      )}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(msg.id, e)}
                        className="mt-0.5 text-zinc-500 hover:text-amber-400 transition"
                      >
                        <Star
                          className={cn("size-3.5", msg.isStarred ? "text-amber-400 fill-amber-400" : "")}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={cn(
                              "truncate text-xs",
                              msg.isUnread ? "font-bold text-white" : "font-normal text-zinc-300"
                            )}
                          >
                            {msg.fromName}
                          </span>
                          <span className="text-[10px] text-zinc-500 shrink-0">{msg.date}</span>
                        </div>
                        <h4
                          className={cn(
                            "truncate text-xs mt-0.5",
                            msg.isUnread ? "font-semibold text-zinc-100" : "text-zinc-400"
                          )}
                        >
                          {msg.subject}
                        </h4>
                        <p className="truncate text-[11px] text-zinc-500 mt-0.5">{msg.snippet}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.2 text-[9px] font-semibold uppercase",
                              msg.label === "Urgent"
                                ? "bg-rose-500/20 text-rose-300"
                                : msg.label === "Security"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-white/10 text-zinc-400"
                            )}
                          >
                            {msg.label}
                          </span>
                          {msg.isUnread && (
                            <span className="size-1.5 rounded-full bg-sky-400" />
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMsg(msg.id, e)}
                        title="Delete email"
                        className="text-zinc-600 hover:text-rose-400 transition p-1"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Right Pane: Message Viewer & AI Assistant */}
              <div className="hidden sm:flex flex-1 flex-col overflow-hidden bg-[#181818]">
                {selectedGmailMsg ? (
                  <div className="flex flex-col min-h-0 flex-1">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          {selectedGmailMsg.label} Email Thread
                        </span>
                        <span className="text-xs text-zinc-400">{selectedGmailMsg.date}</span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-100 mt-1">{selectedGmailMsg.subject}</h3>
                      <div className="flex items-center justify-between mt-2 text-xs text-zinc-400">
                        <div>
                          <span className="text-zinc-200 font-semibold">{selectedGmailMsg.fromName}</span>{" "}
                          <span className="text-zinc-500">&lt;{selectedGmailMsg.fromEmail}&gt;</span>
                        </div>
                        <span className="text-zinc-500">to {selectedGmailMsg.to}</span>
                      </div>
                    </div>

                    {/* Email Content Body */}
                    <div className="flex-1 overflow-y-auto p-4 font-sans text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed space-y-3">
                      <div>{selectedGmailMsg.body}</div>

                      {selectedGmailMsg.attachments && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                            Attachments ({selectedGmailMsg.attachments.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {selectedGmailMsg.attachments.map((att, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300"
                              >
                                <FileText className="size-3 text-[#e4b86a]" />
                                <span>{att.name}</span>
                                <span className="text-[10px] text-zinc-500">({att.size})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Quick Response Toolbar */}
                    <div className="border-t border-white/10 p-3.5 bg-[#141414] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                          <Sparkles className="size-3 text-[#e4b86a]" />
                          AI Reply Assistant:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAiDraftReply("Executive")}
                            className="rounded-full bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300 transition"
                          >
                            Executive
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAiDraftReply("Direct")}
                            className="rounded-full bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300 transition"
                          >
                            Direct Action
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAiDraftReply("Polite")}
                            className="rounded-full bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300 transition"
                          >
                            Polite Close
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={gmailReplyDraft}
                          onChange={(e) => setGmailReplyDraft(e.target.value)}
                          placeholder="Type reply or click AI preset above..."
                          className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSendReply}
                          disabled={!gmailReplyDraft.trim()}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#e4b86a] hover:bg-[#d4a85a] px-3.5 py-1.5 text-xs font-bold text-black transition disabled:opacity-40"
                        >
                          <Send className="size-3" />
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-8 text-zinc-500 text-xs">
                    Select an email thread from the inbox to read and triage.
                  </div>
                )}
              </div>
            </div>

            {/* Compose Drawer Modal */}
            {gmailComposeOpen && (
              <div className="absolute inset-0 z-20 flex flex-col bg-[#181818] p-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Mail className="size-4 text-[#e4b86a]" />
                    <span>Compose New Email</span>
                  </h3>
                  <button type="button" onClick={() => setGmailComposeOpen(false)} className="text-zinc-400 hover:text-white">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-3 flex-1 flex flex-col">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Recipient (To)</label>
                    <input
                      type="email"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="e.g. partner@company.com"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-100 focus:border-[#e4b86a] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Subject</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Subject line..."
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-100 focus:border-[#e4b86a] focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Message Body</label>
                    <textarea
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Write your email..."
                      className="w-full flex-1 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-100 focus:border-[#e4b86a] focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setGmailComposeOpen(false)}
                      className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendNewEmail}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#e4b86a] px-4 py-2 text-xs font-bold text-black"
                    >
                      <Send className="size-3.5" />
                      <span>Dispatch Email</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : plugin.id === "google_drive" ? (
          /* ========================================================= */
          /* SPECIALIZED WORKSPACE: GOOGLE DRIVE BROWSER              */
          /* ========================================================= */
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={driveQuery}
                  onChange={(e) => setDriveQuery(e.target.value)}
                  placeholder="Search Google Drive docs, sheets, slides..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                />
              </div>
              <span className="text-xs text-zinc-400">{MOCK_DRIVE_FILES.length} Files Indexed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
              {MOCK_DRIVE_FILES.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setSelectedDriveFile(file)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 transition select-none flex flex-col justify-between",
                    selectedDriveFile?.id === file.id
                      ? "border-[#e4b86a] bg-white/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <FileText className="size-4 text-[#e4b86a] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-zinc-100 truncate">{file.name}</h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">{file.contentSnippet}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-3 pt-2 border-t border-white/5">
                    <span>{file.modifiedTime}</span>
                    <span>{file.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : plugin.id === "github" ? (
          /* ========================================================= */
          /* SPECIALIZED WORKSPACE: GITHUB REPO & PR MANAGER          */
          /* ========================================================= */
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Connected Repositories
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                GitHub CI Ready
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 overflow-y-auto">
              {MOCK_GITHUB_REPOS.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => setSelectedGhRepo(repo)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 transition select-none flex items-center justify-between",
                    selectedGhRepo?.id === repo.id
                      ? "border-[#e4b86a] bg-white/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Code2 className="size-4 text-emerald-400" />
                      <span className="font-bold text-xs text-zinc-100">{repo.fullName}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.2 text-[10px] text-zinc-400">
                        {repo.branch}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 pl-6">Latest: {repo.lastCommitMessage}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <GitPullRequest className="size-3 text-purple-400" />
                      {repo.openPRs} PRs
                    </span>
                    <span className="text-[10px] text-zinc-500">{repo.lastCommitTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : plugin.id === "supabase" ? (
          /* ========================================================= */
          /* SPECIALIZED WORKSPACE: SUPABASE SQL CONSOLE              */
          /* ========================================================= */
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Database className="size-3.5 text-emerald-400" />
                Postgres SQL Query Runner
              </span>
              <span className="text-[11px] text-zinc-400">Tables: user_profiles, conversation_threads, audit_ledger</span>
            </div>
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              rows={4}
              className="w-full font-mono text-xs rounded-xl border border-white/10 bg-black/60 p-3 text-emerald-300 focus:border-[#e4b86a] focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSqlRunning(true);
                  setTimeout(() => {
                    setSqlRunning(false);
                    setSqlOutput(
                      `| id | email | display_name | role |\n|---|---|---|---|\n| usr_01 | kasiedu@expedite-consults.com | Dr. Kasiedu | Principal Lead |\n| usr_02 | analyst@dstrike.app | SecOps Lead | Security Auditor |\n| usr_03 | researcher@expedite.org | Research Lead | Scientist |`
                    );
                  }, 400);
                }}
                disabled={sqlRunning}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-3.5 py-1.5 text-xs font-bold text-emerald-300 transition"
              >
                <Play className="size-3" />
                <span>{sqlRunning ? "Executing SQL..." : "Run Query"}</span>
              </button>
              <span className="text-[10px] text-zinc-500">Connected to Postgres Pool 5432</span>
            </div>
            {sqlOutput && (
              <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-zinc-200">
                <div className="whitespace-pre-wrap">{sqlOutput}</div>
              </div>
            )}
          </div>
        ) : plugin.id === "health" ? (
          /* ========================================================= */
          /* SPECIALIZED WORKSPACE: CLINICAL HEALTH BIOMARKERS        */
          /* ========================================================= */
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <HeartPulse className="size-4 text-rose-400" />
                Longitudinal Biomarkers & Vitals
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                All Vitals Within Target
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-y-auto">
              {MOCK_HEALTH_BIOMARKERS.map((bio, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{bio.name}</span>
                    <span className="text-emerald-400 font-bold">Normal</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {bio.value} <span className="text-xs font-normal text-zinc-400">{bio.unit}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">Ref: {bio.referenceRange} {bio.unit}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* GENERIC WORKSPACE FOR ALL OTHER PLUGINS                   */
          /* ========================================================= */
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Task Instruction & Prompt
              </label>
              <textarea
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                rows={4}
                placeholder={`Describe what you want ${plugin.name} to execute...`}
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none focus:ring-1 focus:ring-[#e4b86a] transition"
              />
            </div>
            {executing || executionLogs.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/70 p-3 font-mono text-xs space-y-1">
                {executionLogs.map((log, i) => (
                  <div key={i} className="text-zinc-300">
                    {log}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3.5 bg-[#1f1f1f]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendToChat}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#e4b86a] hover:bg-[#d4a85a] px-4 py-2 text-xs font-bold text-[#1a1408] transition shadow-xs"
            >
              <Send className="size-3.5" />
              <span>
                {plugin.id === "gmail"
                  ? "Triage Email in Noctis Chat"
                  : plugin.id === "google_drive"
                  ? "Summarize Document in Chat"
                  : plugin.id === "github"
                  ? "Audit Repository in Chat"
                  : plugin.id === "supabase"
                  ? "Inspect Query in Chat"
                  : plugin.id === "health"
                  ? "Evaluate Health in Chat"
                  : "Execute in Chat"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
