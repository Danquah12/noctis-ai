"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  GitPullRequest,
  History,
  Image as ImageIcon,
  Layers,
  Paintbrush,
  Play,
  RefreshCw,
  Rocket,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NoctisLivePreview from "@/components/noctis/NoctisLivePreview";
import { FORGE_40_CATEGORIES, FORGE_STACK_PRESETS } from "@/lib/forge/forge-catalog";

type StudioStage = "Preview" | "Code" | "Data" | "Publish" | "History";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero & Metrics",
  showcase: "Featured Catalog",
  capabilities: "Capabilities Grid",
  estimator: "Interactive Estimator",
  testimonials: "Customer Proof",
  faq: "FAQ Accordion",
  contact: "Booking & Lead Form",
};

const DEFAULT_SECTION_ORDER = [
  "hero",
  "showcase",
  "capabilities",
  "estimator",
  "testimonials",
  "faq",
  "contact",
];

const PRIMARY_STARTERS = [
  {
    id: "tourism",
    label: "Tourism & Safaris",
    prompt:
      "Build an interactive worldwide tourism and safari booking platform with destination filters, AI trip planner, verified tour guides, and online booking checkout",
  },
  {
    id: "vet",
    label: "Veterinary Clinic",
    prompt:
      "Build an interactive veterinary & animal hospital platform with 24/7 pet triage, surgical care tiers, vaccination scheduling, and pet owner portal",
  },
  {
    id: "saas",
    label: "SaaS Platform",
    prompt:
      "Build a modern B2B analytics & workflow automation SaaS platform with interactive ROI calculator, seat pricing tiers, API showcase, and admin dashboard",
  },
  {
    id: "dining",
    label: "Fine Dining",
    prompt:
      "Build a fine dining & culinary tasting restaurant website with seasonal course catalog, table reservation checkout, sommelier notes, and private dining quotes",
  },
  {
    id: "realestate",
    label: "Real Estate",
    prompt:
      "Build a luxury real estate & property marketplace with neighborhood filter cards, mortgage payment estimator, private viewing booking, and agent dashboard",
  },
] as const;

const MORE_INDUSTRIES = [
  {
    id: "omnisphere",
    label: "OmniSphere (Enterprise Challenge 001)",
    prompt:
      "Build OmniSphere, an enterprise multi-tenant digital marketplace and professional services ecosystem combining e-commerce, professional networking, freelance escrow, LMS, payments, analytics, and SOC governance with 30 modules, 110 screens, 17 RBAC roles, PostgreSQL RLS, pgvector, and multilingual EN/ES/FR/AR RTL support.",
  },
  {
    id: "solar",
    label: "Solar & Clean Energy",
    prompt:
      "Build a residential and commercial solar microgrid platform with kWh bill offset calculator, battery storage packages, and site survey booking",
  },
  {
    id: "wedding",
    label: "Wedding & Events",
    prompt:
      "Build a luxury wedding planning & floral design studio website with package tiers, guest budget planner, gallery showcase, and consultation scheduler",
  },
  {
    id: "coffee",
    label: "Coffee Roastery & Cafe",
    prompt:
      "Build an artisan specialty coffee roastery storefront with single-origin tasting notes, subscription roast frequency calculator, and wholesale inquiry form",
  },
  {
    id: "yoga",
    label: "Yoga & Wellness Studio",
    prompt:
      "Build a holistic yoga & wellness retreat studio platform with class schedule filters, membership calculator, instructor bios, and session checkout",
  },
  {
    id: "legal",
    label: "Law Firm & Legal Practice",
    prompt:
      "Build a corporate & litigation law firm website with practice area directory, retainer fee estimator, attorney profiles, and confidential consultation booking",
  },
  {
    id: "podcast",
    label: "Podcast & Media Network",
    prompt:
      "Build an investigative podcast & independent media network site with episode archive filters, sponsorship calculator, host bios, and studio booking",
  },
  {
    id: "construction",
    label: "Architecture & Construction",
    prompt:
      "Build a sustainable architecture & commercial engineering firm website with project portfolio, build-cost sq-ft estimator, BIM workflow specs, and RFP intake",
  },
  {
    id: "healthcare",
    label: "Healthcare & Telemedicine",
    prompt:
      "Build a HIPAA-aware digital clinic & specialist telehealth portal with care plan selector, copay estimator, board-certified physicians, and appointment checkout",
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity & SOC",
    prompt:
      "Build an enterprise Zero-Trust & 24/7 MDR cybersecurity platform with attack-surface audit tiers, endpoint pricing calculator, and incident response intake",
  },
  {
    id: "nonprofit",
    label: "Nonprofit & Humanitarian",
    prompt:
      "Build a transparent global nonprofit & humanitarian aid portal with field program tracker, impact calculator, audited fund ledger, and donor checkout",
  },
  {
    id: "logistics",
    label: "Logistics & Freight",
    prompt:
      "Build an international cold-chain logistics & freight forwarding platform with lane transit filters, container rate calculator, customs tracking, and quote booking",
  },
  {
    id: "hospitality",
    label: "Luxury Resort & Spa",
    prompt:
      "Build a beachfront boutique resort & holistic spa platform with villa availability, stay-package estimator, concierge experiences, and direct reservation checkout",
  },
] as const;

const REFINE_PRESETS = [
  { label: "Light Theme", instruction: "Switch to bright light editorial theme with crisp contrast" },
  { label: "Dark Theme", instruction: "Switch to sleek dark executive theme" },
  { label: "Photography", instruction: "Use real high-resolution industry photography" },
  { label: "Vector Art", instruction: "Use vector svg artwork only across hero and cards" },
  { label: "Add Multilingual", instruction: "Add multilingual locale switcher English French Spanish" },
  { label: "Add Bookings Table", instruction: "Add table verified_reviews and booking slot confirmation" },
] as const;

function downloadZipBase64(b64: string, filename: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadTextFile(text: string, filename: string, mime = "text/html;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizeLoadedProject(rawProject: any, fallbackRevisions?: any[]) {
  const spec = rawProject?.spec_json && typeof rawProject.spec_json === "object" ? rawProject.spec_json : {};
  return {
    projectId: rawProject.id,
    name: rawProject.name,
    category: {
      name: rawProject.category,
      regulated: rawProject.regulated_domain && rawProject.regulated_domain !== "NONE",
    },
    stack: rawProject.stack,
    currentRevision: rawProject.current_revision,
    status: rawProject.status,
    blueprint: spec.blueprint || null,
    files: rawProject.files_json || {},
    qaSecurity: rawProject.qa_security_json || {},
    deployState: rawProject.deploy_state_json || {},
    revisions: fallbackRevisions,
  };
}

export interface NoctisForgeBuilderStudioProps {
  initialPrompt?: string;
  initialNonce?: number;
}

export function NoctisForgeBuilderStudio({
  initialPrompt,
  initialNonce,
}: NoctisForgeBuilderStudioProps = {}) {
  const [prompt, setPrompt] = useState<string>(PRIMARY_STARTERS[0].prompt);
  const [category, setCategory] = useState("");
  const [stack, setStack] = useState<string>(FORGE_STACK_PRESETS[0] ?? "Next.js 15 + React 19 + Tailwind + PostgreSQL");
  const [accentHex, setAccentHex] = useState("#06B6D4");
  const [preferredVisualStyle, setPreferredVisualStyle] = useState<"photography" | "vector">("photography");
  const [stage, setStage] = useState<StudioStage>("Preview");

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);

  const [activeProject, setActiveProject] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState("src/App.tsx");
  const [editInstruction, setEditInstruction] = useState("");
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [envAudit, setEnvAudit] = useState<any>(null);
  const [prOut, setPrOut] = useState<any>(null);
  const [deployOut, setDeployOut] = useState<any>(null);
  const [sandboxOut, setSandboxOut] = useState<any>(null);
  const [challengeOut, setChallengeOut] = useState<any>(null);

  const [visualEditMode, setVisualEditMode] = useState(false);
  const [pendingFieldEdits, setPendingFieldEdits] = useState<Record<string, string>>({});
  const [pendingVisualStyle, setPendingVisualStyle] = useState<"photography" | "vector">("photography");
  const [pendingSectionOrder, setPendingSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [pendingHiddenSections, setPendingHiddenSections] = useState<string[]>([]);
  const [pendingCustomHeroImage, setPendingCustomHeroImage] = useState<string>("");

  const [dataView, setDataView] = useState<"submissions" | "schema">("submissions");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const [approverName, setApproverName] = useState("release-engineer");
  const [deployTarget, setDeployTarget] = useState<"STAGING" | "PRODUCTION">("STAGING");
  const [dispatchExternal, setDispatchExternal] = useState(false);

  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  async function api(path: string, method = "GET", body?: unknown) {
    setErr("");
    const res = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: any = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { error: text || `HTTP ${res.status}` };
    }
    if (!res.ok) {
      throw new Error(parsed?.error || `Request failed (${res.status})`);
    }
    return parsed;
  }

  function syncVisualControlsFromProject(proj: any) {
    const bp = proj?.blueprint;
    setPendingFieldEdits({});
    setPendingCustomHeroImage("");
    setPendingVisualStyle(bp?.visualStyle === "vector" ? "vector" : "photography");
    setPendingSectionOrder(
      Array.isArray(bp?.sectionOrder) && bp.sectionOrder.length ? [...bp.sectionOrder] : [...DEFAULT_SECTION_ORDER],
    );
    setPendingHiddenSections(Array.isArray(bp?.hiddenSections) ? [...bp.hiddenSections] : []);
  }

  function copyWithFeedback(key: string, text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? "" : prev)), 1800);
  }

  async function loadSubmissions(projectId: string) {
    if (!projectId) return;
    setSubsLoading(true);
    try {
      const res = await api(`/api/v2/forge/submissions?projectId=${encodeURIComponent(projectId)}`);
      setSubmissions(Array.isArray(res.submissions) ? res.submissions : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setSubsLoading(false);
    }
  }

  async function refreshProjects(skipAutoLoad = false) {
    try {
      const [st, env] = await Promise.all([api("/api/v2/forge/status"), api("/api/v2/forge/environment")]);
      setProjectsList(Array.isArray(st.projects) ? st.projects : []);
      setEnvAudit(env);
      if (!skipAutoLoad && !activeProject && !initialPrompt && Array.isArray(st.projects) && st.projects[0]?.id) {
        await loadProjectById(String(st.projects[0].id));
      }
    } catch {
      // Keep UI responsive even if initial background status fails
    }
  }

  async function loadProjectById(id: string) {
    const full = await api(`/api/v2/forge/projects?id=${encodeURIComponent(id)}`);
    if (full.project) {
      const normalized = normalizeLoadedProject(full.project);
      setActiveProject(normalized);
      syncVisualControlsFromProject(normalized);
      setRevisions(Array.isArray(full.revisions) ? full.revisions : []);
      setDeployOut(null);
      setPrOut(null);
      setSandboxOut(normalized.qaSecurity?.sandboxExecution || null);
      setChallengeOut(normalized.qaSecurity?.challenge001Scorecard || null);
    }
  }

  useEffect(() => {
    void refreshProjects(Boolean(initialPrompt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateProject(promptOverride?: string, categoryOverride?: string) {
    const basePrompt = (promptOverride ?? prompt).trim();
    const activeCategory = categoryOverride !== undefined ? categoryOverride : category;
    if (!basePrompt) return;
    const activePrompt =
      preferredVisualStyle === "vector" && categoryOverride === undefined && !/\b(vector|svg)\b/i.test(basePrompt)
        ? `${basePrompt} use vector svg artwork only`
        : basePrompt;

    setBusy("Architecting full-stack website & preview...");
    setMoreOpen(false);
    setOptionsOpen(false);
    try {
      const res = await api("/api/v2/forge/projects/generate", "POST", {
        prompt: activePrompt,
        category: activeCategory || undefined,
        stack,
        accentHex: categoryOverride === "" ? undefined : accentHex,
      });
      setActiveProject(res);
      syncVisualControlsFromProject(res);
      setStage("Preview");
      setDeployOut(null);
      setPrOut(null);
      setSandboxOut(null);
      setChallengeOut(null);
      const full = await api(`/api/v2/forge/projects?id=${encodeURIComponent(res.projectId)}`);
      if (Array.isArray(full.revisions)) setRevisions(full.revisions);
      await refreshProjects(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to generate website");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (initialPrompt && initialNonce) {
      setPrompt(initialPrompt);
      setCategory("");
      void generateProject(initialPrompt, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, initialNonce]);

  useEffect(() => {
    if (stage === "Data" && activeProject?.projectId) {
      void loadSubmissions(String(activeProject.projectId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, activeProject?.projectId]);

  async function applyConversationalEdit(instructionOverride?: string) {
    const activeInstruction = (instructionOverride ?? editInstruction).trim();
    if (!activeProject?.projectId || !activeInstruction) return;
    setBusy(`Applying update (Rev #${Number(activeProject.currentRevision || 1) + 1})...`);
    setStylesOpen(false);
    try {
      const res = await api("/api/v2/forge/projects/edit", "POST", {
        projectId: activeProject.projectId,
        instruction: activeInstruction,
      });
      if (res.ok) {
        const updated = {
          ...activeProject,
          currentRevision: res.revisionNumber,
          files: res.files,
          qaSecurity: res.qaSecurity,
          blueprint: res.blueprint || activeProject.blueprint,
        };
        setActiveProject(updated);
        syncVisualControlsFromProject(updated);
        if (!instructionOverride) setEditInstruction("");
        const full = await api(`/api/v2/forge/projects?id=${encodeURIComponent(activeProject.projectId)}`);
        if (Array.isArray(full.revisions)) setRevisions(full.revisions);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to apply update");
    } finally {
      setBusy("");
    }
  }

  async function saveVisualPatch() {
    if (!activeProject?.projectId) return;
    setBusy("Saving visual edits...");
    try {
      const visualPatch = {
        fieldEdits: Object.keys(pendingFieldEdits).length ? pendingFieldEdits : undefined,
        sectionOrder: pendingSectionOrder,
        hiddenSections: pendingHiddenSections,
        visualStyle: pendingVisualStyle,
        customHeroImage: pendingCustomHeroImage || undefined,
      };
      const res = await api("/api/v2/forge/projects/edit", "POST", {
        projectId: activeProject.projectId,
        instruction: "",
        visualPatch,
      });
      if (res.ok) {
        const updated = {
          ...activeProject,
          currentRevision: res.revisionNumber,
          files: res.files,
          qaSecurity: res.qaSecurity,
          blueprint: res.blueprint || activeProject.blueprint,
        };
        setActiveProject(updated);
        syncVisualControlsFromProject(updated);
        const full = await api(`/api/v2/forge/projects?id=${encodeURIComponent(activeProject.projectId)}`);
        if (Array.isArray(full.revisions)) setRevisions(full.revisions);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save visual edits");
    } finally {
      setBusy("");
    }
  }

  function handleHeroPhotoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const srcUrl = typeof reader.result === "string" ? reader.result : "";
      if (!srcUrl) return;
      const img = new window.Image();
      img.onload = () => {
        const maxW = 1280;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        setPendingCustomHeroImage(dataUrl);
        setPendingVisualStyle("photography");
      };
      img.src = srcUrl;
    };
    reader.readAsDataURL(file);
  }

  function moveSection(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= pendingSectionOrder.length) return;
    const copy = [...pendingSectionOrder];
    const [moved] = copy.splice(index, 1);
    if (!moved) return;
    copy.splice(target, 0, moved);
    setPendingSectionOrder(copy);
  }

  function toggleSectionVisibility(sectionId: string) {
    if (sectionId === "hero") return;
    setPendingHiddenSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  }

  const files: Record<string, string> = activeProject?.files || {};
  const fileNames = Object.keys(files);
  const liveUrl = activeProject?.projectId
    ? `/api/v2/forge/live?id=${encodeURIComponent(String(activeProject.projectId))}`
    : "";
  const absoluteLiveUrl =
    liveUrl && typeof window !== "undefined" ? `${window.location.origin}${liveUrl}` : liveUrl;

  const hasVisualChanges =
    Object.keys(pendingFieldEdits).length > 0 ||
    Boolean(pendingCustomHeroImage) ||
    pendingVisualStyle !== ((activeProject?.blueprint?.visualStyle as "photography" | "vector") || "photography") ||
    JSON.stringify(pendingSectionOrder) !==
      JSON.stringify(
        Array.isArray(activeProject?.blueprint?.sectionOrder) && activeProject.blueprint.sectionOrder.length
          ? activeProject.blueprint.sectionOrder
          : DEFAULT_SECTION_ORDER,
      ) ||
    JSON.stringify(pendingHiddenSections) !==
      JSON.stringify(
        Array.isArray(activeProject?.blueprint?.hiddenSections) ? activeProject.blueprint.hiddenSections : [],
      );

  const stageItems: { id: StudioStage; label: string; icon: React.ReactNode }[] = [
    { id: "Preview", label: "Preview", icon: <Eye className="size-3.5" /> },
    { id: "Code", label: "Code", icon: <Code2 className="size-3.5" /> },
    { id: "Data", label: "Data", icon: <Database className="size-3.5" /> },
    { id: "Publish", label: "Publish", icon: <Rocket className="size-3.5" /> },
    { id: "History", label: "History", icon: <History className="size-3.5" /> },
  ];

  const paidSubmissionsCount = submissions.filter((s) =>
    /PAID|BOOKED|SESSION_CREATED/i.test(String(s.payment_status || "")),
  ).length;
  const totalSubmissionsCents = submissions.reduce((acc, s) => acc + Number(s.amount_cents || 0), 0);

  return (
    <div className="space-y-4 text-xs text-zinc-200 max-w-6xl mx-auto">
      {/* Calm Composer */}
      <div className="rounded-2xl border border-white/10 bg-[#0d121a]/90 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="size-4 text-[#e4b86a]" />
              Noctis Forge Studio
            </h2>
            <p className="text-[11px] text-zinc-400">
              All-industry web & full-stack app architect — clean multi-page sites, visual editing & instant live hosting
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer transition",
              optionsOpen
                ? "border-[#e4b86a]/40 bg-[#e4b86a]/15 text-[#e4b86a]"
                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            Options
            <ChevronDown className={cn("size-3 transition-transform", optionsOpen && "rotate-180")} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Describe any website or web app to build (e.g., boutique coffee roastery, veterinary clinic, worldwide safari portal, SaaS dashboard)..."
            className="flex-1 rounded-xl border border-white/15 bg-black/50 p-3 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#e4b86a]/60"
          />
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void generateProject()}
            className="rounded-xl bg-[#e4b86a] hover:bg-[#efc77b] disabled:opacity-50 text-black font-semibold px-5 py-2.5 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition"
          >
            <Play className="size-3.5" /> Build Site
          </button>
        </div>

        {/* Starter Pills + Collapsible More Industries */}
        <div className="relative flex flex-wrap items-center gap-1.5">
          {PRIMARY_STARTERS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setPrompt(preset.prompt);
                setCategory("");
                setMoreOpen(false);
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer transition"
            >
              {preset.label}
            </button>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] flex items-center gap-1 cursor-pointer transition",
                moreOpen
                  ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                  : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/10 hover:text-white",
              )}
            >
              More Industries
              <ChevronDown className={cn("size-3 transition-transform", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-8 z-30 w-72 sm:w-96 rounded-xl border border-white/15 bg-[#0e141f] p-2.5 shadow-2xl grid grid-cols-2 gap-1.5">
                {MORE_INDUSTRIES.map((ind) => (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => {
                      setPrompt(ind.prompt);
                      setCategory("");
                      setMoreOpen(false);
                    }}
                    className="text-left rounded-lg border border-white/5 bg-white/[0.03] hover:bg-white/10 px-2.5 py-1.5 text-[11px] text-zinc-200 cursor-pointer transition truncate"
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Secondary Options Drawer */}
        {optionsOpen && (
          <div className="pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Industry Category</label>
              <select
                aria-label="Website Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 text-white text-[11px]"
              >
                <option value="">Auto-Detect (Any Industry · 40 Categories)</option>
                {FORGE_40_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.name}>{`#${c.id} ${c.name}${c.regulated ? " (Regulated)" : ""}`}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] text-zinc-400 mb-1">Export Code Stack</label>
              <select
                aria-label="Tech Stack"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 text-white text-[11px]"
              >
                {FORGE_STACK_PRESETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <div className="w-12 shrink-0">
                <label className="block text-[10px] text-zinc-400 mb-1">Accent</label>
                <input
                  type="color"
                  aria-label="Design accent color"
                  value={accentHex}
                  onChange={(e) => setAccentHex(e.target.value)}
                  className="h-8 w-full rounded-lg border border-white/15 bg-black/55 p-0.5 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-zinc-400 mb-1">Visual Style</label>
                <div className="grid grid-cols-2 rounded-lg border border-white/15 bg-black/55 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPreferredVisualStyle("photography")}
                    className={cn(
                      "rounded py-1 font-medium cursor-pointer",
                      preferredVisualStyle === "photography" ? "bg-white/15 text-white" : "text-zinc-400",
                    )}
                  >
                    Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredVisualStyle("vector")}
                    className={cn(
                      "rounded py-1 font-medium cursor-pointer",
                      preferredVisualStyle === "vector" ? "bg-white/15 text-white" : "text-zinc-400",
                    )}
                  >
                    Vector
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(busy || err) && (
          <div className="flex flex-wrap items-center gap-2">
            {busy && (
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-200 flex items-center gap-2">
                <RefreshCw className="size-3 animate-spin" />
                {busy}
              </div>
            )}
            {err && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-200">
                {err}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calm 5-Tab Workspace Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {stageItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStage(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition",
                stage === tab.id
                  ? "border-[#e4b86a]/45 bg-[#e4b86a]/15 text-[#e4b86a]"
                  : "border-transparent bg-white/[0.03] text-zinc-400 hover:bg-white/10 hover:text-zinc-200",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "Code" && fileNames.length > 0 && (
                <span className="text-[10px] opacity-70">({fileNames.length})</span>
              )}
            </button>
          ))}
        </div>
        {activeProject?.projectId && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="font-mono text-zinc-300">{`Rev #${activeProject.currentRevision || 1}`}</span>
            <span>·</span>
            <span className="text-zinc-200 font-medium truncate max-w-[200px]">{activeProject.name}</span>
          </div>
        )}
      </div>

      {/* Stage 1: Preview + Opt-In Visual Inspector */}
      {stage === "Preview" && (
        <div className="space-y-3">
          {!activeProject ? (
            <div className="rounded-2xl border border-white/10 bg-[#0b0f17] p-8 text-center text-zinc-400">
              Pick an industry starter or type any prompt above and click <strong className="text-white">Build Site</strong> to generate a multi-page interactive website.
            </div>
          ) : (
            <>
              {/* Clean Single-Row Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0d121a] px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
                    {activeProject.category?.name || "Custom Domain"}
                  </span>
                  {activeProject.blueprint?.industrySpecialty && (
                    <span className="rounded-md bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 text-[10px] text-cyan-300">
                      {activeProject.blueprint.industrySpecialty}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {activeProject.qaSecurity?.passedAll ? "QA & WCAG Verified" : "Draft"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVisualEditMode((v) => !v)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition",
                      visualEditMode
                        ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-300"
                        : "border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10",
                    )}
                  >
                    <Paintbrush className="size-3.5" />
                    {visualEditMode ? "Visual Edit: ON" : "Visual Edit"}
                  </button>

                  {liveUrl && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-200 flex items-center gap-1 transition"
                    >
                      Live URL
                      <ExternalLink className="size-3" />
                    </a>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExportOpen((v) => !v)}
                      className="rounded-lg border border-cyan-500/35 bg-cyan-500/15 hover:bg-cyan-500/25 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 flex items-center gap-1 cursor-pointer transition"
                    >
                      <Download className="size-3.5" />
                      Export
                      <ChevronDown className="size-3" />
                    </button>
                    {exportOpen && (
                      <div className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-white/15 bg-[#0e141f] p-1.5 shadow-2xl space-y-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setExportOpen(false);
                            try {
                              const zipped = await api(
                                `/api/v2/forge/projects/export-zip?projectId=${encodeURIComponent(activeProject.projectId)}`,
                              );
                              if (zipped.base64) downloadZipBase64(zipped.base64, zipped.filename);
                            } catch (e) {
                              setErr(e instanceof Error ? e.message : "Zip export failed");
                            }
                          }}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/10 cursor-pointer flex items-center gap-2"
                        >
                          <Download className="size-3.5 text-cyan-300" /> Download Full-Stack .zip
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExportOpen(false);
                            downloadTextFile(
                              files["index.html"] || "",
                              `${String(activeProject.name || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`,
                            );
                          }}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/10 cursor-pointer flex items-center gap-2"
                        >
                          <Layers className="size-3.5 text-emerald-300" /> Download Static .html
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExportOpen(false);
                            copyWithFeedback("html", files["index.html"] || "");
                          }}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/10 cursor-pointer flex items-center gap-2"
                        >
                          <Copy className="size-3.5 text-zinc-400" /> {copiedKey === "html" ? "Copied HTML!" : "Copy index.html"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Frame + Opt-In Visual Inspector */}
              <div className="flex flex-col lg:flex-row gap-3 items-stretch">
                <div className="flex-1 min-w-0">
                  <NoctisLivePreview
                    code={files["index.html"] || "<p>No preview generated.</p>"}
                    title={`${activeProject.name} — Multi-Page Preview`}
                    className="h-[580px]"
                    visualEditMode={visualEditMode}
                    liveUrl={liveUrl}
                    apiBase={typeof window !== "undefined" ? window.location.origin : ""}
                    onFieldEdited={(field, value) => {
                      setPendingFieldEdits((prev) => ({ ...prev, [field]: value }));
                    }}
                  />
                </div>

                {visualEditMode && (
                  <aside className="w-full lg:w-[280px] shrink-0 rounded-2xl border border-white/10 bg-[#0d121a] p-3.5 flex flex-col justify-between gap-3">
                    <div className="space-y-3 overflow-y-auto max-h-[490px] pr-1">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="font-semibold text-white text-xs">Visual Inspector</span>
                        <button
                          type="button"
                          onClick={() => setVisualEditMode(false)}
                          className="text-zinc-400 hover:text-white cursor-pointer"
                          aria-label="Close Visual Inspector"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Click any headline, subtitle, stat, or card title directly in the preview to edit text inline, then click Save below.
                      </p>

                      {Object.keys(pendingFieldEdits).length > 0 && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 space-y-1">
                          <div className="text-[10px] font-semibold text-emerald-300">
                            {`${Object.keys(pendingFieldEdits).length} inline edit(s) queued`}
                          </div>
                          {Object.entries(pendingFieldEdits).map(([k, v]) => (
                            <div key={k} className="text-[10px] text-zinc-200 truncate">
                              <span className="font-mono text-zinc-400">{k}:</span> {v}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Visual Style Switcher */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">
                          Visual Media Style
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPendingVisualStyle("photography")}
                            className={cn(
                              "rounded-lg border py-1.5 text-[11px] font-medium cursor-pointer",
                              pendingVisualStyle === "photography"
                                ? "border-[#e4b86a]/45 bg-[#e4b86a]/15 text-[#e4b86a]"
                                : "border-white/10 bg-white/5 text-zinc-300",
                            )}
                          >
                            Photography
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingVisualStyle("vector")}
                            className={cn(
                              "rounded-lg border py-1.5 text-[11px] font-medium cursor-pointer",
                              pendingVisualStyle === "vector"
                                ? "border-[#e4b86a]/45 bg-[#e4b86a]/15 text-[#e4b86a]"
                                : "border-white/10 bg-white/5 text-zinc-300",
                            )}
                          >
                            Vector Art
                          </button>
                        </div>
                      </div>

                      {/* Custom Hero Photo Upload */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">
                          Custom Hero Photo
                        </div>
                        <label className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 bg-black/35 hover:bg-white/5 px-3 py-2 text-[11px] text-zinc-300 cursor-pointer transition">
                          <ImageIcon className="size-3.5 text-cyan-300" />
                          {pendingCustomHeroImage ? "Hero photo ready — Save below" : "Upload Custom Hero Image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleHeroPhotoUpload(file);
                            }}
                          />
                        </label>
                      </div>

                      {/* Section Reorder & Show/Hide */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">
                          Sections Order & Visibility
                        </div>
                        <div className="space-y-1">
                          {pendingSectionOrder.map((secId, idx) => {
                            const hidden = pendingHiddenSections.includes(secId);
                            return (
                              <div
                                key={secId}
                                className="flex items-center justify-between gap-1 rounded-lg border border-white/10 bg-black/35 px-2 py-1"
                              >
                                <span className={cn("text-[11px] truncate", hidden ? "text-zinc-500 line-through" : "text-zinc-200")}>
                                  {SECTION_LABELS[secId] || secId}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveSection(idx, -1)}
                                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-25 cursor-pointer"
                                    title="Move up"
                                  >
                                    <ArrowUp className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === pendingSectionOrder.length - 1}
                                    onClick={() => moveSection(idx, 1)}
                                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-25 cursor-pointer"
                                    title="Move down"
                                  >
                                    <ArrowDown className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={secId === "hero"}
                                    onClick={() => toggleSectionVisibility(secId)}
                                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-25 cursor-pointer"
                                    title={hidden ? "Show section" : "Hide section"}
                                  >
                                    {hidden ? <EyeOff className="size-3 text-rose-400" /> : <Eye className="size-3" />}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        disabled={!hasVisualChanges || Boolean(busy)}
                        onClick={() => void saveVisualPatch()}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Save className="size-3.5" /> Save Changes
                      </button>
                      <button
                        type="button"
                        disabled={!hasVisualChanges}
                        onClick={() => syncVisualControlsFromProject(activeProject)}
                        className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 px-2.5 py-2 text-[11px] text-zinc-300 cursor-pointer"
                      >
                        Discard
                      </button>
                    </div>
                  </aside>
                )}
              </div>

              {/* Single-Row Conversational Refine Bar + Popover Styles */}
              <div className="relative flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0d121a] p-2.5">
                <input
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editInstruction.trim()) {
                      e.preventDefault();
                      void applyConversationalEdit();
                    }
                  }}
                  placeholder="Refine this website conversationally (e.g., 'Rename to Savanna Trails', 'Switch to light theme', 'Add table tour_guides')..."
                  className="flex-1 min-w-[220px] rounded-lg border border-white/15 bg-black/55 px-3 py-1.5 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#e4b86a]/60"
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStylesOpen((v) => !v)}
                    className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 flex items-center gap-1 cursor-pointer"
                  >
                    Styles
                    <ChevronDown className="size-3" />
                  </button>
                  {stylesOpen && (
                    <div className="absolute right-0 bottom-10 z-30 w-52 rounded-xl border border-white/15 bg-[#0e141f] p-1.5 shadow-2xl space-y-1">
                      {REFINE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => void applyConversationalEdit(preset.instruction)}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/10 cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={Boolean(busy) || !editInstruction.trim()}
                  onClick={() => void applyConversationalEdit()}
                  className="rounded-lg bg-white text-black font-semibold px-3.5 py-1.5 text-xs hover:bg-zinc-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <Wrench className="size-3" /> Apply
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Stage 2: Source Code Explorer */}
      {stage === "Code" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-white/10 bg-[#0d121a] p-4">
          <div className="space-y-1 max-h-[540px] overflow-y-auto pr-1">
            {fileNames.map((fn) => (
              <button
                key={fn}
                type="button"
                onClick={() => setSelectedFile(fn)}
                className={cn(
                  "w-full text-left rounded-lg px-2.5 py-1.5 font-mono text-[11px] cursor-pointer truncate",
                  selectedFile === fn ? "bg-[#e4b86a]/20 text-[#e4b86a]" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                )}
              >
                {fn}
              </button>
            ))}
          </div>
          <div className="md:col-span-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-zinc-400">{selectedFile}</span>
              <button
                type="button"
                onClick={() => copyWithFeedback("code", files[selectedFile] || "")}
                className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] text-zinc-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === "code" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copiedKey === "code" ? "Copied" : "Copy File"}
              </button>
            </div>
            <pre className="max-h-[500px] overflow-auto rounded-xl border border-white/10 bg-black/75 p-3 font-mono text-[11px] text-emerald-200 whitespace-pre-wrap">
              {files[selectedFile] || "// Generate a site first to browse full-stack source files."}
            </pre>
          </div>
        </div>
      )}

      {/* Stage 3: Data (Live Submissions + PostgreSQL Schema) */}
      {stage === "Data" && (
        <div className="rounded-2xl border border-white/10 bg-[#0d121a] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 p-0.5">
              <button
                type="button"
                onClick={() => setDataView("submissions")}
                className={cn(
                  "rounded-md px-3 py-1 text-[11px] font-medium cursor-pointer",
                  dataView === "submissions" ? "bg-white/15 text-white" : "text-zinc-400",
                )}
              >
                Live Submissions
              </button>
              <button
                type="button"
                onClick={() => setDataView("schema")}
                className={cn(
                  "rounded-md px-3 py-1 text-[11px] font-medium cursor-pointer",
                  dataView === "schema" ? "bg-white/15 text-white" : "text-zinc-400",
                )}
              >
                PostgreSQL Schema
              </button>
            </div>

            {dataView === "submissions" && activeProject?.projectId && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadSubmissions(String(activeProject.projectId))}
                  className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={cn("size-3", subsLoading && "animate-spin")} />
                  Refresh
                </button>
                <button
                  type="button"
                  disabled={submissions.length === 0}
                  onClick={() => {
                    const cell = (v: unknown) => JSON.stringify(String(v ?? ""));
                    const csv = [
                      "id,type,name,email,amount_usd,status,created_at",
                      ...submissions.map((r) =>
                        [
                          cell(r.id),
                          cell(r.submission_type),
                          cell(r.customer_name),
                          cell(r.customer_email),
                          (Number(r.amount_cents || 0) / 100).toFixed(2),
                          cell(r.payment_status),
                          cell(r.created_at),
                        ].join(","),
                      ),
                    ].join("\n");
                    downloadTextFile(csv, `${activeProject.projectId}-submissions.csv`, "text/csv;charset=utf-8");
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 px-2.5 py-1 text-[11px] text-zinc-200 cursor-pointer"
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>

          {dataView === "submissions" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <div className="text-[10px] uppercase text-zinc-400">Persisted Leads & Bookings</div>
                  <div className="text-xl font-bold text-white mt-0.5">{submissions.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <div className="text-[10px] uppercase text-zinc-400">Paid / Confirmed Checkouts</div>
                  <div className="text-xl font-bold text-emerald-300 mt-0.5">{paidSubmissionsCount}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <div className="text-[10px] uppercase text-zinc-400">Recorded Booking Volume</div>
                  <div className="text-xl font-bold text-[#e4b86a] mt-0.5">
                    {`$${Math.round(totalSubmissionsCents / 100).toLocaleString("en-US")}`}
                  </div>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-center text-zinc-400">
                  No server-persisted submissions yet for this project. Open <strong className="text-white">Book / Pay</strong> or the inquiry form in Preview / Live URL and submit to verify live persistence.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-white/5 text-zinc-400 uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {submissions.map((row) => (
                        <tr key={String(row.id)} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-mono text-zinc-300">{row.id}</td>
                          <td className="px-3 py-2 text-zinc-200">{row.submission_type}</td>
                          <td className="px-3 py-2 text-white">{row.customer_name}</td>
                          <td className="px-3 py-2 text-zinc-400">{row.customer_email || "—"}</td>
                          <td className="px-3 py-2 font-mono text-zinc-200">
                            {`$${Math.round(Number(row.amount_cents || 0) / 100).toLocaleString("en-US")}`}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px]">
                              {row.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="font-semibold text-white mb-1.5">migrations/0001_init.sql</div>
                <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/75 p-3 font-mono text-[11px] text-cyan-200">
                  {files["migrations/0001_init.sql"] || "-- Generate a project first."}
                </pre>
              </div>
              <div>
                <div className="font-semibold text-white mb-1.5">migrations/0002_seed.sql</div>
                <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/75 p-3 font-mono text-[11px] text-amber-200">
                  {files["migrations/0002_seed.sql"] || "-- Seed data appears after generation."}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage 4: Publish (Instant Live URL + Human Deploy Gate & QA) */}
      {stage === "Publish" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Instant Live Hosting */}
          <div className="rounded-2xl border border-white/10 bg-[#0d121a] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Rocket className="size-4 text-emerald-400" /> Instant Live Hosting
              </h3>
              <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                {deployOut?.approved ? deployOut.target : activeProject?.status || "DRAFT"}
              </span>
            </div>

            {activeProject?.projectId ? (
              <>
                <div className="rounded-xl border border-white/10 bg-black/45 p-3 space-y-2">
                  <div className="text-[10px] uppercase text-zinc-400">Shareable Live Endpoint</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate text-[11px] text-cyan-300 font-mono">{liveUrl}</code>
                    <button
                      type="button"
                      onClick={() => copyWithFeedback("live", absoluteLiveUrl)}
                      className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] text-zinc-200 cursor-pointer flex items-center gap-1"
                    >
                      {copiedKey === "live" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      {copiedKey === "live" ? "Copied" : "Copy"}
                    </button>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 text-[11px] text-emerald-200 font-semibold flex items-center gap-1"
                    >
                      Open <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Human Approver Identity</label>
                      <input
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        placeholder="e.g., release-engineer"
                        className="w-full rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 text-white text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Release Environment</label>
                      <select
                        value={deployTarget}
                        onChange={(e) => setDeployTarget(e.target.value === "PRODUCTION" ? "PRODUCTION" : "STAGING")}
                        className="w-full rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 text-white text-[11px]"
                      >
                        <option value="STAGING">Staging Preview</option>
                        <option value="PRODUCTION">Production Live</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispatchExternal}
                      onChange={(e) => setDispatchExternal(e.target.checked)}
                    />
                    Trigger configured external Vercel Deploy Hook (optional)
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const out = await api("/api/v2/forge/projects/deploy", "POST", {
                          projectId: activeProject.projectId,
                          target: deployTarget,
                          approver: approverName,
                          dispatchExternal,
                        });
                        setDeployOut(out);
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : "Deployment approval blocked");
                      }
                    }}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Rocket className="size-3.5" /> Approve & Publish Live URL
                  </button>
                </div>

                {deployOut && (
                  <pre className="rounded-xl border border-emerald-500/30 bg-black/65 p-3 font-mono text-[10px] text-emerald-200 max-h-44 overflow-auto">
                    {JSON.stringify(deployOut, null, 2)}
                  </pre>
                )}
              </>
            ) : (
              <p className="text-zinc-400">Generate a website first to unlock instant live hosting.</p>
            )}
          </div>

          {/* Card 2: QA Security & GitHub PR */}
          <div className="rounded-2xl border border-white/10 bg-[#0d121a] p-4 space-y-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-cyan-400" /> QA Security, WCAG & GitHub PR
            </h3>

            {activeProject?.qaSecurity ? (
              <>
                <div className="rounded-xl border border-white/10 bg-black/35 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-white">
                      {`${activeProject.qaSecurity.checksPassed || 0} / ${activeProject.qaSecurity.checksTotal || 0} Automated Gates Passed`}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {`WCAG 2.2 Contrast Ratio: ${activeProject.qaSecurity.wcagContrastRatio || "—"}:1`}
                    </div>
                  </div>
                  <CheckCircle2
                    className={cn(
                      "size-5",
                      activeProject.qaSecurity.passedAll ? "text-emerald-400" : "text-amber-400",
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  {(activeProject.qaSecurity.qaChecks || []).map((q: any) => (
                    <div
                      key={q.name}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
                    >
                      <span className="text-[11px] text-zinc-200">{q.name}</span>
                      <span className={q.passed ? "text-emerald-300 font-semibold text-[10px]" : "text-rose-300 text-[10px]"}>
                        {q.passed ? "PASS" : "CHECK"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={async () => {
                      setBusy("Running isolated test suite & benchmark...");
                      setErr("");
                      try {
                        const r = await fetch("/api/v2/forge/projects/sandbox-run", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ projectId: activeProject.projectId }),
                        });
                        const data = await r.json().catch(() => ({}));
                        if (r.status >= 500 || r.status === 404) {
                          setErr(data?.error || `Sandbox run failed (${r.status})`);
                        } else {
                          setSandboxOut(data);
                        }
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : "Sandbox execution failed");
                      } finally {
                        setBusy("");
                      }
                    }}
                    className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 font-semibold py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Terminal className="size-3.5 text-emerald-300" /> Run Isolated Tests (MicroVM)
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={async () => {
                      setBusy("Evaluating Challenge 001 acceptance scorecard...");
                      setErr("");
                      try {
                        const res = await api("/api/v2/forge/projects/evaluate-challenge", "POST", {
                          projectId: activeProject.projectId,
                          runSandbox: !sandboxOut,
                        });
                        if (res.sandboxExecution) setSandboxOut(res.sandboxExecution);
                        setChallengeOut(res.scorecard || res);
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : "Challenge 001 evaluation failed");
                      } finally {
                        setBusy("");
                      }
                    }}
                    className="rounded-xl border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-semibold py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Award className="size-3.5 text-amber-300" /> Challenge 001 Scorecard
                  </button>
                </div>

                {sandboxOut && (
                  <div className="rounded-xl border border-emerald-500/25 bg-black/50 p-3 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {`Sandbox: ${sandboxOut.backend || "ISOLATED"} (${sandboxOut.networkPolicy || "isolated"})`}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          sandboxOut.passed
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300",
                        )}
                      >
                        {sandboxOut.passed
                          ? `PASS (${sandboxOut.testsPassed}/${sandboxOut.testsTotal})`
                          : `FAIL (${sandboxOut.testsPassed || 0}/${sandboxOut.testsTotal || 0})`}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {`Duration: ${sandboxOut.durationMs ?? 0}ms · Auto-repairs: ${sandboxOut.repairsAttempted ?? 0}`}
                      {sandboxOut.benchmark
                        ? ` · p50=${sandboxOut.benchmark.p50Ms}ms · p95=${sandboxOut.benchmark.p95Ms}ms · ${sandboxOut.benchmark.rps} req/s`
                        : ""}
                    </div>
                    {sandboxOut.isolationNote && (
                      <div className="text-[10px] text-zinc-400">{sandboxOut.isolationNote}</div>
                    )}
                    {sandboxOut.error && (
                      <div className="text-[10px] text-rose-300">{sandboxOut.error}</div>
                    )}
                  </div>
                )}

                {challengeOut && (
                  <div className="rounded-xl border border-amber-500/25 bg-black/50 p-3 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {`Challenge 001 Score: ${challengeOut.totalScore ?? 0} / ${challengeOut.maxScore ?? 100}`}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          challengeOut.vetoTriggered
                            ? "bg-rose-500/20 text-rose-300"
                            : challengeOut.releaseReady
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300",
                        )}
                      >
                        {challengeOut.vetoTriggered
                          ? "VETO BLOCKED"
                          : challengeOut.releaseReady
                            ? "RELEASE READY"
                            : "SANDBOX REQUIRED"}
                      </span>
                    </div>
                    {challengeOut.counts && (
                      <div className="text-[10px] text-zinc-300">
                        {`Verified: ${challengeOut.counts.implementedVerified} · Partial: ${challengeOut.counts.partiallyImplemented} · External Blockers: ${challengeOut.counts.blockedExternal} (Total ${challengeOut.counts.totalItems})`}
                      </div>
                    )}
                    {Array.isArray(challengeOut.vetoReasons) && challengeOut.vetoReasons.length > 0 && (
                      <div className="text-[10px] text-rose-300">
                        {challengeOut.vetoReasons.join(" | ")}
                      </div>
                    )}
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {(challengeOut.checklist || []).map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded border border-white/5 bg-white/[0.02] px-2 py-1 text-[10px]"
                        >
                          <span className="text-zinc-200 truncate">{`${item.id}. ${item.title}`}</span>
                          <span
                            className={cn(
                              "shrink-0 font-semibold",
                              item.status === "IMPLEMENTED_VERIFIED"
                                ? "text-emerald-300"
                                : item.status === "BLOCKED_EXTERNAL"
                                  ? "text-amber-300"
                                  : "text-rose-300",
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const pr = await api("/api/v2/forge/projects/github-pr", "POST", {
                        projectId: activeProject.projectId,
                      });
                      setPrOut(pr);
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : "Failed to prepare PR");
                    }
                  }}
                  className="w-full rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <GitPullRequest className="size-3.5 text-cyan-300" /> Generate Sealed GitHub PR
                </button>

                {prOut && (
                  <pre className="rounded-xl border border-cyan-500/30 bg-black/65 p-3 font-mono text-[10px] text-cyan-200 max-h-44 overflow-auto">
                    {JSON.stringify(prOut, null, 2)}
                  </pre>
                )}
              </>
            ) : (
              <p className="text-zinc-400">QA & WCAG checks run automatically on every build and edit.</p>
            )}
          </div>
        </div>
      )}

      {/* Stage 5: History & Diagnostics */}
      {stage === "History" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#0d121a] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Revision History</span>
                <span className="text-[10px] text-zinc-400">{`${revisions.length} saved revisions`}</span>
              </div>
              {revisions.length === 0 ? (
                <p className="text-zinc-400">No revisions loaded yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {revisions.map((r) => (
                    <div
                      key={`${r.id}-${r.revision_number}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 p-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-white font-medium text-[11px]">{`Revision #${r.revision_number}`}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{r.change_summary}</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const restored = await api("/api/v2/forge/projects/restore", "POST", {
                            projectId: activeProject.projectId,
                            revisionNumber: r.revision_number,
                          });
                          setActiveProject((prev: any) => ({
                            ...prev,
                            currentRevision: restored.newRevisionNumber,
                            files: restored.files,
                          }));
                          setStage("Preview");
                          const full = await api(
                            `/api/v2/forge/projects?id=${encodeURIComponent(activeProject.projectId)}`,
                          );
                          if (Array.isArray(full.revisions)) setRevisions(full.revisions);
                        }}
                        className="rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[10px] text-white shrink-0 cursor-pointer"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d121a] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Saved Projects</span>
                <span className="text-[10px] text-zinc-400">{`${projectsList.length} recent builds`}</span>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {projectsList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      await loadProjectById(String(p.id));
                      setStage("Preview");
                    }}
                    className={cn(
                      "w-full text-left rounded-xl border p-2.5 cursor-pointer transition",
                      activeProject?.projectId === p.id
                        ? "border-[#e4b86a]/40 bg-[#e4b86a]/10"
                        : "border-white/10 bg-black/35 hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white truncate">{p.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{`Rev #${p.current_revision}`}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">{`${p.category} · ${p.stack}`}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible Diagnostics (Hidden by Default) */}
          <details className="rounded-2xl border border-white/10 bg-[#0d121a] p-4">
            <summary className="cursor-pointer font-semibold text-zinc-300 hover:text-white select-none">
              Environment & Runtime Diagnostics
            </summary>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {(envAudit?.checks || []).map((c: any) => (
                <div key={c.name} className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-white truncate">{c.name}</span>
                    <span className="text-[10px] font-mono text-emerald-300 shrink-0">{c.status}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">{c.detail}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default NoctisForgeBuilderStudio;
