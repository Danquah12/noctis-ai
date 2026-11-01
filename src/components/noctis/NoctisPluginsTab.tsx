"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Check,
  Plus,
  Sparkles,
  Shield,
  Layers,
  Code2,
  Terminal,
  Cpu,
  Brain,
  Globe,
  Database,
  Lock,
  MessageSquare,
  FileText,
  Mail,
  Calendar,
  Briefcase,
  TrendingUp,
  DollarSign,
  Palette,
  Cloud,
  CheckCircle2,
  ExternalLink,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PluginItem {
  id: string;
  name: string;
  category:
    | "Platform Systems"
    | "Popular"
    | "Developer Tools"
    | "Security"
    | "Productivity"
    | "Communication"
    | "Creativity"
    | "Finance"
    | "Data & Analytics"
    | "Business & Operations"
    | "Travel"
    | "Other";
  description: string;
  iconBg?: string;
  iconColor?: string;
  isPlatform?: boolean;
  badge?: string;
  iconText?: string;
}

export const ALL_PLUGINS: PluginItem[] = [
  // --- 1. Our Platform Systems ---
  {
    id: "xtrike_sast",
    name: "XTRIKE SAST 710",
    category: "Platform Systems",
    description: "Automated static code security analysis, OWASP Top 10:2025 & polyglot verification across 710 repos.",
    isPlatform: true,
    badge: "Platform Core",
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-400",
    iconText: "XS",
  },
  {
    id: "trepath_threat",
    name: "TREPATH Threat Modeler",
    category: "Platform Systems",
    description: "Quantitative attack path validation, CVSS/EPSS scoring, active proof engine & 8-state plugin ledger.",
    isPlatform: true,
    badge: "Platform Core",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    iconText: "TP",
  },
  {
    id: "axiom_scanner",
    name: "AXIOM Vulnerability Scanner",
    category: "Platform Systems",
    description: "Automated DAST vulnerability scanning, live security headers audit, CVE feeds & MITRE ATT&CK mapping.",
    isPlatform: true,
    badge: "Platform Core",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    iconText: "AX",
  },
  {
    id: "careerorbit_ai",
    name: "CareerOrbit & Resume Clinic",
    category: "Platform Systems",
    description: "98-domain global career expansion roadmap, verified skills gap analyzer & automated resume compiler.",
    isPlatform: true,
    badge: "Career Suite",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    iconText: "CO",
  },
  {
    id: "connectin_portal",
    name: "ConnectIn / Sphera Portal",
    category: "Platform Systems",
    description: "Professional talent networking, verified proof credentials, study circles & peer collaboration.",
    isPlatform: true,
    badge: "Network",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-400",
    iconText: "CI",
  },
  {
    id: "physician_dx",
    name: "Noctis Physician Dx Engine",
    category: "Platform Systems",
    description: "Clinical diagnostic & differential reasoning engine, longitudinal labs, 2021 CKD-EPI & emergency triage.",
    isPlatform: true,
    badge: "Clinical AI",
    iconBg: "bg-teal-500/20",
    iconColor: "text-teal-400",
    iconText: "DX",
  },
  {
    id: "capital_valuation",
    name: "Noctis Capital & DCF Valuation",
    category: "Platform Systems",
    description: "M&A valuation strategist, ARR multiples, cap table audits & quantitative financial sensitivity modeling.",
    isPlatform: true,
    badge: "Finance AI",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
    iconText: "NC",
  },
  {
    id: "faith_theology",
    name: "Noctis Faith & Hermeneutics",
    category: "Platform Systems",
    description: "King James theological research, scripture cross-referencing, exegesis & historical context.",
    isPlatform: true,
    badge: "Research",
    iconBg: "bg-indigo-500/20",
    iconColor: "text-indigo-400",
    iconText: "TH",
  },
  {
    id: "sovereign_voice",
    name: "Sovereign Voice Studio",
    category: "Platform Systems",
    description: "Two-way streaming neural speech, studio voice personas (Alloy, Nova, Onyx, Echo) & Whisper STT.",
    isPlatform: true,
    badge: "Voice AI",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
    iconText: "VS",
  },
  {
    id: "sketch_canvas",
    name: "Noctis Multi-Slide Canvas",
    category: "Platform Systems",
    description: "Interactive visual thinking, system architectural blueprints, live diagramming & slide deck composer.",
    isPlatform: true,
    badge: "Studio",
    iconBg: "bg-pink-500/20",
    iconColor: "text-pink-400",
    iconText: "MC",
  },
  {
    id: "agent_builder",
    name: "Autonomous Agent Builder",
    category: "Platform Systems",
    description: "Custom specialist engine registry, agent persona engineering, domain boundaries & persistent memory.",
    isPlatform: true,
    badge: "Agent OS",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
    iconText: "AB",
  },
  {
    id: "document_compiler",
    name: "Document & Paper Studio",
    category: "Platform Systems",
    description: "Autonomous Word (.docx), Excel (.xlsx), PowerPoint (.pptx), and PDF paper compiler with audit seals.",
    isPlatform: true,
    badge: "Publishing",
    iconBg: "bg-sky-500/20",
    iconColor: "text-sky-400",
    iconText: "DS",
  },

  // --- 2. Popular ---
  {
    id: "gmail",
    name: "Gmail",
    category: "Popular",
    description: "Read, triage, search, and manage Gmail inboxes directly from Noctis.",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    iconText: "M",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    category: "Popular",
    description: "Access, read, and summarize Drive, Docs, Sheets, and Slides in real-time.",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    iconText: "▲",
  },
  {
    id: "health",
    name: "Health",
    category: "Popular",
    description: "Explore longitudinal health data, lab biomarkers, and medical summaries.",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    iconText: "♥",
  },
  {
    id: "github",
    name: "GitHub",
    category: "Popular",
    description: "Triage pull requests, inspect commits, automate issues, CI/CD, and publish flows.",
    iconBg: "bg-white/10",
    iconColor: "text-white",
    iconText: "GH",
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "Popular",
    description: "Manage Postgres databases, execute SQL queries, and inspect auth tables.",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    iconText: "⚡",
  },
  {
    id: "outlook_email",
    name: "Outlook Email",
    category: "Popular",
    description: "Triage Outlook inboxes, prioritize messages, and draft contextual replies.",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    iconText: "O",
  },

  // --- 3. New & Noteworthy ---
  {
    id: "icloud_mail",
    name: "iCloud Mail",
    category: "Productivity",
    description: "Read and manage Apple iCloud email accounts seamlessly.",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
    iconText: "✉",
  },
  {
    id: "icloud_calendar",
    name: "iCloud Calendar",
    category: "Productivity",
    description: "Read and schedule Apple iCloud calendar events and reminders.",
    iconBg: "bg-zinc-500/20",
    iconColor: "text-zinc-200",
    iconText: "1",
  },
  {
    id: "tripsy",
    name: "Tripsy",
    category: "Travel",
    description: "Plan, organize, and automate multi-city trip itineraries and bookings.",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-400",
    iconText: "🧳",
  },
  {
    id: "sonos",
    name: "Sonos",
    category: "Other",
    description: "Control your multi-room Sonos audio system and playlists with voice.",
    iconBg: "bg-white/10",
    iconColor: "text-white",
    iconText: "SO",
  },
  {
    id: "hevy",
    name: "Hevy",
    category: "Other",
    description: "Gym workout plans, set-volume progression, and strength insights.",
    iconBg: "bg-zinc-700",
    iconColor: "text-white",
    iconText: "H",
  },
  {
    id: "adobe",
    name: "Adobe",
    category: "Creativity",
    description: "Design, combine, edit, and export visual assets and PDF workflows.",
    iconBg: "bg-red-600/20",
    iconColor: "text-red-500",
    iconText: "A",
  },

  // --- 4. Developer Tools ---
  {
    id: "remote_desktop",
    name: "Remote Desktop Commander",
    category: "Developer Tools",
    description: "Interact with and manage your remote workstations directly from chat.",
    iconBg: "bg-zinc-800",
    iconColor: "text-zinc-200",
    iconText: "DC",
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "Developer Tools",
    description: "Build, preview, deploy, and inspect cloud serverless web apps.",
    iconBg: "bg-white/10",
    iconColor: "text-white",
    iconText: "▲",
  },
  {
    id: "lovable",
    name: "Lovable",
    category: "Developer Tools",
    description: "Build full-stack web applications conversationally from chat.",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    iconText: "♥",
  },
  {
    id: "tinyfish",
    name: "TinyFish",
    category: "Developer Tools",
    description: "Autonomous browser web agents for automated data extraction and tasks.",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-400",
    iconText: "🐟",
  },

  // --- 5. Security ---
  {
    id: "sovereign_code_guard",
    name: "Sovereign Code Guard",
    category: "Security",
    description: "Continuous automated security scanning, dependency hardening, and CVE patches for your codebases.",
    iconBg: "bg-blue-600/20",
    iconColor: "text-blue-400",
    iconText: "🛡️",
  },
  {
    id: "malwarebytes",
    name: "Malwarebytes",
    category: "Security",
    description: "Verify URLs, domains, phone numbers, and inspect zero-day threats.",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-300",
    iconText: "M",
  },
  {
    id: "privacyhawk",
    name: "PrivacyHawk",
    category: "Security",
    description: "Protect personal data footprint and remove public broker profiles.",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    iconText: "PH",
  },
  {
    id: "ajaxx_scrubber",
    name: "AJAXX Data Scrubber",
    category: "Security",
    description: "Scan data broker databases and automate privacy opt-out requests.",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-400",
    iconText: "AX",
  },
  {
    id: "mcafee",
    name: "McAfee",
    category: "Security",
    description: "Real-time scam protection, phishing domain detection, and safe browsing.",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    iconText: "M",
  },
  {
    id: "soluvery",
    name: "Soluvery",
    category: "Security",
    description: "Audit Google Drive, Dropbox, and cloud folder permissions for data leaks.",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    iconText: "S",
  },

  // --- 6. Productivity & Communication ---
  {
    id: "notion",
    name: "Notion",
    category: "Productivity",
    description: "Create, sync, search, and edit docs, team tasks, and workspace databases.",
    iconBg: "bg-white/10",
    iconColor: "text-white",
    iconText: "N",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Productivity",
    description: "Manage Google Calendar events, schedule meetings, and resolve conflicts.",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    iconText: "31",
  },
  {
    id: "outlook_calendar",
    name: "Outlook Calendar",
    category: "Productivity",
    description: "Manage Microsoft Outlook schedules and organizational timeblocks.",
    iconBg: "bg-blue-600/15",
    iconColor: "text-blue-300",
    iconText: "O",
  },
  {
    id: "todoist",
    name: "Todoist",
    category: "Productivity",
    description: "Natural language tasks, project lists, and contextual reminders.",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    iconText: "≡",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    category: "Productivity",
    description: "Search and summarize organizational documents across Microsoft SharePoint.",
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-400",
    iconText: "SP",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    description: "Read, summarize, and draft messages across company Slack channels.",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    iconText: "#",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "Communication",
    description: "Summarize Teams meetings, track action items, and draft follow-ups.",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-400",
    iconText: "T",
  },
  {
    id: "zoom",
    name: "Zoom",
    category: "Communication",
    description: "Extract meeting insights, transcripts, and commitments from Zoom calls.",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    iconText: "Z",
  },

  // --- 7. Finance & Business ---
  {
    id: "stripe",
    name: "Stripe",
    category: "Finance",
    description: "Accept payments, inspect billing, manage customer subscriptions, and revenue.",
    iconBg: "bg-indigo-600/20",
    iconColor: "text-indigo-400",
    iconText: "S",
  },
  {
    id: "quickbooks",
    name: "Intuit QuickBooks",
    category: "Finance",
    description: "Accounting reconciliation, invoices, expenses, and payroll automation.",
    iconBg: "bg-emerald-600/20",
    iconColor: "text-emerald-400",
    iconText: "qb",
  },
  {
    id: "binance",
    name: "Binance",
    category: "Finance",
    description: "Explore live Binance crypto market data, order books, and ticker volumes.",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
    iconText: "B",
  },
  {
    id: "ibkr",
    name: "Interactive Brokers (IBKR)",
    category: "Finance",
    description: "Analyze global equity markets, options chains, and portfolio risk.",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    iconText: "IB",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "Business & Operations",
    description: "Transform customer data into action, manage deals, and track pipeline.",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
    iconText: "HS",
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "Business & Operations",
    description: "Create, inspect, and manage products, orders, and customer queries.",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    iconText: "S",
  },

  // --- 8. Creativity ---
  {
    id: "canva",
    name: "Canva",
    category: "Creativity",
    description: "Create, review, edit, and brand-check graphics and social presentations.",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-400",
    iconText: "C",
  },
  {
    id: "figma",
    name: "Figma",
    category: "Creativity",
    description: "Turn Figma design tokens into production code and map design components.",
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-400",
    iconText: "F",
  },
  {
    id: "runway",
    name: "Runway",
    category: "Creativity",
    description: "Generate video clips and motion graphics with leading AI video models.",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
    iconText: "R",
  },

  // --- 9. Data & Analytics ---
  {
    id: "power_bi",
    name: "Microsoft Power BI",
    category: "Data & Analytics",
    description: "Explore and author executive business intelligence analytics in your browser.",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    iconText: "BI",
  },
  {
    id: "posthog",
    name: "PostHog",
    category: "Data & Analytics",
    description: "Analyze product analytics, user funnel retention, and session recordings.",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
    iconText: "PH",
  },
  {
    id: "helium10",
    name: "Helium 10",
    category: "Data & Analytics",
    description: "Access Amazon product keyword metrics, competitor volume, and sales trends.",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    iconText: "H10",
  },
];

const CATEGORIES = [
  "All",
  "Platform Systems",
  "Popular",
  "Developer Tools",
  "Security",
  "Productivity",
  "Communication",
  "Creativity",
  "Finance",
  "Business & Operations",
  "Data & Analytics",
  "Travel",
] as const;

interface NoctisPluginsTabProps {
  onSelectPlugin?: (plugin: PluginItem) => void;
  activePluginId?: string;
  onClose?: () => void;
}

export function NoctisPluginsTab({
  onSelectPlugin,
  activePluginId,
  onClose,
}: NoctisPluginsTabProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [installedIds, setInstalledIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("noctis-installed-plugins");
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    // Default installed platform systems
    return new Set(["xtrike_sast", "trepath_threat", "axiom_scanner", "careerorbit_ai", "sovereign_voice"]);
  });

  const toggleInstall = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInstalledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem("noctis-installed-plugins", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = ALL_PLUGINS;
    if (selectedCategory !== "All") {
      list = list.filter((item) => item.category === selectedCategory);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [query, selectedCategory]);

  // Group by category if "All" is selected and no query
  const grouped = useMemo(() => {
    if (query.trim() || selectedCategory !== "All") return null;
    const map = new Map<string, PluginItem[]>();
    for (const item of ALL_PLUGINS) {
      const cat = item.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [query, selectedCategory]);

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] text-zinc-100 overflow-y-auto no-scrollbar">
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#121212]/90 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Sparkles className="size-5 text-[#e4b86a]" />
                  Plugin Directory & Systems
                </h1>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-[#e4b86a]">
                  {ALL_PLUGINS.length} Available
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Extend Noctis with native platform engines, cybersecurity audit tools, and cloud workspace connectors.
              </p>
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="self-end sm:self-center inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition"
              >
                Back to Chat
              </button>
            ) : null}
          </div>

          {/* Search Input Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plugins, platform systems, developer tools..."
              className="w-full rounded-2xl border border-white/15 bg-white/5 pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#e4b86a] focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-[#e4b86a] transition"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              const isPlatformCat = cat === "Platform Systems";
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition touch-manipulation",
                    active
                      ? isPlatformCat
                        ? "bg-[#e4b86a] text-black font-semibold shadow-xs"
                        : "bg-white text-black font-semibold shadow-xs"
                      : isPlatformCat
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
                        : "bg-white/5 border border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                  )}
                >
                  {isPlatformCat ? "★ " : null}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-8 py-6">
        {grouped ? (
          // Categorized Layout (Matching Screenshot Store style)
          <div className="space-y-8">
            {[...grouped.entries()].map(([catName, items]) => (
              <div key={catName}>
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    {catName === "Platform Systems" ? (
                      <span className="text-[#e4b86a]">★ Our Platform Systems</span>
                    ) : (
                      <span>{catName}</span>
                    )}
                    <span className="text-xs font-normal text-zinc-500">&gt;</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(catName)}
                    className="text-xs text-zinc-400 hover:text-white transition"
                  >
                    View all ({items.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((item) => (
                    <PluginCard
                      key={item.id}
                      item={item}
                      isInstalled={installedIds.has(item.id)}
                      onToggle={(e) => toggleInstall(item.id, e)}
                      onSelect={() => onSelectPlugin?.(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Filtered Search Results Grid
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-zinc-400">
                Found {filtered.length} matching {filtered.length === 1 ? "plugin" : "plugins"}
              </p>
            </div>
            {filtered.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((item) => (
                  <PluginCard
                    key={item.id}
                    item={item}
                    isInstalled={installedIds.has(item.id)}
                    onToggle={(e) => toggleInstall(item.id, e)}
                    onSelect={() => onSelectPlugin?.(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Search className="size-10 mx-auto text-zinc-600 mb-3" />
                <p className="text-sm font-semibold text-zinc-300">No plugins found matching &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-zinc-500 mt-1">Try searching for GitHub, XTRIKE, Supabase, Stripe, or Gmail.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSelectedCategory("All");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white hover:bg-white/20 transition"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PluginCard({
  item,
  isInstalled,
  onToggle,
  onSelect,
}: {
  item: PluginItem;
  isInstalled: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelect?: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex items-start justify-between gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer select-none",
        item.isPlatform
          ? "border-[#e4b86a]/30 bg-gradient-to-br from-[#1c1810] to-[#121212] hover:border-[#e4b86a]/60 hover:shadow-lg hover:shadow-amber-500/5"
          : "border-white/10 bg-[#181818]/80 hover:bg-[#202020] hover:border-white/20"
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* App Icon */}
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl font-bold text-sm shadow-inner transition-transform group-hover:scale-105",
            item.iconBg || "bg-white/10",
            item.iconColor || "text-zinc-100"
          )}
        >
          {item.iconText || item.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-white transition">
              {item.name}
            </h3>
            {item.badge ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-semibold tracking-wide uppercase",
                  item.isPlatform
                    ? "bg-[#e4b86a]/20 text-[#e4b86a] border border-[#e4b86a]/40"
                    : "bg-white/10 text-zinc-400"
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Action Button (+ or checkmark) */}
      <button
        type="button"
        onClick={onToggle}
        title={isInstalled ? "Installed (click to remove)" : "Install plugin"}
        className={cn(
          "shrink-0 grid size-8 place-items-center rounded-full transition-all touch-manipulation",
          isInstalled
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
            : item.isPlatform
              ? "bg-[#e4b86a]/15 text-[#e4b86a] border border-[#e4b86a]/30 hover:bg-[#e4b86a] hover:text-black"
              : "bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white"
        )}
      >
        {isInstalled ? <Check className="size-4 stroke-[2.5]" /> : <Plus className="size-4 stroke-[2.5]" />}
      </button>
    </div>
  );
}
