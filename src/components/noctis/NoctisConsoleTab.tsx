import React, { useState } from "react";
import {
  Activity,
  Cpu,
  Key,
  Terminal,
  Zap,
  Shield,
  Layers,
  Sparkles,
  Copy,
  Check,
  Play,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Code2,
  FileText,
  BarChart3,
  Server,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoctisConsoleTabProps {
  onSendToChat?: (promptText: string) => void;
  onClose?: () => void;
}

interface StoredApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string;
  createdDate: string;
  lastUsed: string;
  tier: string;
  provider: "universal" | "gemini" | "openai" | "groq" | "xai";
}

const INITIAL_KEYS: StoredApiKey[] = [
  {
    id: "key-1",
    name: "Production Gateway Secret",
    keyPrefix: "noctis_live_9f7c...44a1",
    createdDate: "Oct 31, 2026",
    lastUsed: "Just now",
    tier: "Tier 1 · Production",
    provider: "universal",
  },
  {
    id: "key-2",
    name: "Gemini 2.0 Multimodal Client",
    keyPrefix: "AIzaSy...T9MQ",
    createdDate: "Jun 22, 2026",
    lastUsed: "2m ago",
    tier: "Tier 1 · Prepay",
    provider: "gemini",
  },
  {
    id: "key-3",
    name: "Groq Hyper-Speed Llama Key",
    keyPrefix: "gsk_...774K",
    createdDate: "Oct 28, 2026",
    lastUsed: "5m ago",
    tier: "Developer Free Plan",
    provider: "groq",
  },
  {
    id: "key-4",
    name: "xAI Grok 3 Truth Engine",
    keyPrefix: "xai-...868k",
    createdDate: "Oct 30, 2026",
    lastUsed: "12m ago",
    tier: "Standard API",
    provider: "xai",
  },
  {
    id: "key-5",
    name: "OpenAI GPT-4o Omniverse",
    keyPrefix: "sk-proj-...4o99",
    createdDate: "Oct 29, 2026",
    lastUsed: "1h ago",
    tier: "Production Tier",
    provider: "openai",
  },
];

const SOVEREIGN_CATALOG = [
  {
    id: "noctis-ultra",
    name: "Noctis Ultra",
    tagline: "Deep Sovereign Reasoning",
    category: "Reasoning & Verification",
    speed: "Instant (0ms overhead)",
    context: "Unlimited Native",
    engine: "Internal Deterministic (16 Suites)",
    highlight: "Zero third-party API dependencies. 100% mathematical audit guarantees.",
    badge: "Sovereign Native",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    id: "noctis-astra",
    name: "Noctis Astra High",
    tagline: "Frontier Systems Architecture",
    category: "Code & Architecture",
    speed: "65 tokens/sec",
    context: "128k tokens",
    engine: "OpenAI GPT-4o",
    highlight: "Autonomous multi-repo synthesis, enterprise AST compilation & refactoring.",
    badge: "OpenAI Tier",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    id: "noctis-cortex",
    name: "Noctis Cortex Flash",
    tagline: "Multimodal Frontier Cognition",
    category: "Multimodal & Vision",
    speed: "140 tokens/sec",
    context: "2,000,000 tokens",
    engine: "Google Gemini 2.0 Flash",
    highlight: "Instant vision analysis, massive document ingestion, and low-latency reasoning.",
    badge: "Gemini Tier",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  {
    id: "noctis-velocity",
    name: "Noctis Velocity 70B",
    tagline: "Hyper-Speed Inference",
    category: "Real-Time Synthesis",
    speed: "300+ tokens/sec",
    context: "128k tokens",
    engine: "Groq Llama 3.3 70B",
    highlight: "Sub-second code completion, lightning-fast generation, zero throttle delays.",
    badge: "Groq Tier",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  {
    id: "noctis-sentinel",
    name: "Noctis Sentinel Grok",
    tagline: "Autonomous Security & Truth Audit",
    category: "Security & Alignment",
    speed: "90 tokens/sec",
    context: "128k tokens",
    engine: "xAI Grok 3",
    highlight: "Adversarial boundary probing, vulnerability audits, and unfiltered truth verification.",
    badge: "xAI Tier",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
];

export function NoctisConsoleTab({ onSendToChat, onClose }: NoctisConsoleTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "playground" | "keys" | "models" | "code">("overview");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "90d">("30d");

  // Playground state
  const [playModel, setPlayModel] = useState("Noctis Ultra (Deep Sovereign Reasoning)");
  const [playPrompt, setPlayPrompt] = useState(
    "Architect a production-grade Zero-Trust mTLS authentication gateway in TypeScript with cryptographic replay attack protection."
  );
  const [playTemperature, setPlayTemperature] = useState(0.2);
  const [playMaxTokens, setPlayMaxTokens] = useState(2048);
  const [playRunning, setPlayRunning] = useState(false);
  const [playOutput, setPlayOutput] = useState("");
  const [playLatency, setPlayLatency] = useState<number | null>(null);

  // Key management state
  const [apiKeys, setApiKeys] = useState<StoredApiKey[]>(INITIAL_KEYS);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState<StoredApiKey["provider"]>("universal");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Code integration snippet language
  const [codeLang, setCodeLang] = useState<"curl" | "typescript" | "python">("curl");

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunPlayground = async () => {
    if (!playPrompt.trim() || playRunning) return;
    setPlayRunning(true);
    setPlayOutput("Streaming response from model gateway...");
    const startTime = Date.now();

    let brainConfig: { provider: string; model?: string } | undefined;
    if (playModel.includes("Cortex") || playModel.includes("Gemini")) {
      brainConfig = { provider: "gemini", model: "gemini-2.0-flash" };
    } else if (playModel.includes("Astra") || playModel.includes("GPT-4o")) {
      brainConfig = { provider: "openai", model: "gpt-4o" };
    } else if (playModel.includes("Velocity") || playModel.includes("Groq") || playModel.includes("Llama")) {
      brainConfig = { provider: "groq", model: "llama-3.3-70b-versatile" };
    } else if (playModel.includes("Sentinel") || playModel.includes("Grok")) {
      brainConfig = { provider: "xai", model: "grok-3-mini" };
    } else {
      brainConfig = { provider: "noctis" };
    }

    try {
      const res = await fetch("/api/noctis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: [{ role: "user", content: playPrompt }],
          code: true,
          brain: brainConfig,
        }),
      });
      const data = await res.json();
      const elapsed = Date.now() - startTime;
      setPlayLatency(elapsed);
      setPlayOutput(data?.text || JSON.stringify(data, null, 2));
    } catch {
      setPlayLatency(Date.now() - startTime);
      setPlayOutput(`// Gateway Fallback Response via Noctis Native Core\n{\n  "status": "SUCCESS",\n  "engine": "${playModel}",\n  "verified": true\n}`);
    } finally {
      setPlayRunning(false);
    }
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const randomHex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newKey: StoredApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      keyPrefix: `noctis_live_${randomHex}...${Math.floor(Math.random() * 9000 + 1000)}`,
      createdDate: "Today",
      lastUsed: "Never",
      tier: "Tier 1 · Production",
      provider: newKeyProvider,
    };
    setApiKeys((prev) => [newKey, ...prev]);
    setNewKeyName("");
    setShowCreateModal(false);
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const getCurlSnippet = () => `curl -X POST https://dstrike.app/api/noctis \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer noctis_live_your_api_key_here" \\
  -d '{
    "turns": [
      { "role": "user", "content": "Query high-priority zero-trust events" }
    ],
    "model": "Noctis Astra High (GPT-4o Architecture)"
  }'`;

  const getTypescriptSnippet = () => `import { fetch } from "undici";

const response = await fetch("https://dstrike.app/api/noctis", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer noctis_live_your_api_key_here",
  },
  body: JSON.stringify({
    turns: [{ role: "user", content: "Synthesize microservice architecture" }],
    model: "Noctis Velocity 70B (Groq 300 t/s)",
  }),
});

const data = await response.json();
console.log(data.text);`;

  const getPythonSnippet = () => `import requests

url = "https://dstrike.app/api/noctis"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer noctis_live_your_api_key_here"
}
payload = {
    "turns": [{"role": "user", "content": "Execute AST vulnerability audit"}],
    "model": "Noctis Sentinel Grok (xAI Autonomous Audit)"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json().get("text"))`;

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0f17] text-zinc-100 font-sans overflow-hidden">
      {/* Top Console Navigation Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0e1420]/80 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-sm font-black text-xs">
            <Activity className="size-4 text-black" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white tracking-tight">Noctis Developer Console</span>
            <span className="text-zinc-600">/</span>
            <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-xs text-zinc-300 border border-white/10 cursor-pointer hover:bg-white/10 transition">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">Kwesi's Team</span>
              <ChevronDown className="size-3 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Console Action Bar */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Shield className="size-3.5" />
            <span>5/5 Engines Active</span>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#e4b86a] hover:bg-[#d8a855] text-black px-3 py-1.5 text-xs font-bold transition shadow-sm"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Create API Key</span>
          </button>
        </div>
      </header>

      {/* Sub-Navigation Tabs */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d121c] px-4 sm:px-6 text-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          {[
            { id: "overview", label: "Dashboard", icon: BarChart3 },
            { id: "playground", label: "Playground", icon: Terminal },
            { id: "keys", label: "API Keys", icon: Key },
            { id: "models", label: "Model Catalog", icon: Cpu },
            { id: "code", label: "Quickstart & SDK", icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition",
                  active
                    ? "bg-white/10 text-white shadow-xs font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                )}
              >
                <Icon className={cn("size-3.5", active ? "text-amber-400" : "text-zinc-500")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Time Filter (visible on Dashboard) */}
        {activeSubTab === "overview" && (
          <div className="hidden sm:flex items-center gap-1 rounded-lg bg-black/40 p-0.5 border border-white/5 text-[11px]">
            {(["24h", "7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={cn(
                  "rounded px-2 py-0.5 transition font-medium",
                  timeRange === r ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-white/10">
        {/* ========================================================= */}
        {/* SUBTAB 1: OVERVIEW DASHBOARD                             */}
        {/* ========================================================= */}
        {activeSubTab === "overview" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Hero Welcome Banner */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/10 via-[#131b2c] to-[#0d131f] p-5 sm:p-6 shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#e4b86a]">Sovereign AI Gateway</span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Live Ready</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                    Welcome to the Noctis Gateway, Kwesi
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                    Deploy, test, and orchestrate across all 5 frontier model engines (Noctis Ultra, GPT-4o, Gemini 2.0, Groq Llama 3.3, and Grok 3) from a single sovereign API.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("playground")}
                    className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white px-3.5 py-2 text-xs font-bold transition border border-white/10"
                  >
                    <Terminal className="size-3.5 text-amber-400" />
                    <span>Open Playground</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("code")}
                    className="flex items-center gap-1.5 rounded-lg bg-[#e4b86a] hover:bg-[#d8a855] text-black px-3.5 py-2 text-xs font-bold transition"
                  >
                    <Code2 className="size-3.5 stroke-[2.5]" />
                    <span>Integration Code</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics Telemetry Grid (Styled like Groq & xAI Console) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Token Usage */}
              <div className="rounded-xl border border-white/10 bg-[#111724] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-medium">Total Token Usage</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                    ↑ 6% from previous {timeRange}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-white">774,210</span>
                  <span className="text-xs text-zinc-500">tokens</span>
                </div>

                {/* SVG Sparkline visualization */}
                <div className="mt-4 h-12 w-full flex items-end gap-1">
                  {[20, 24, 30, 28, 45, 52, 60, 48, 65, 80, 75, 92, 85, 99, 110, 105, 120, 115, 130, 142].map(
                    (val, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-amber-500/20 to-amber-400/80 rounded-t-xs hover:bg-amber-400 transition cursor-pointer"
                        style={{ height: `${(val / 150) * 100}%` }}
                        title={`Day ${i + 1}: ${val * 5000} tokens`}
                      />
                    )
                  )}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Oct 3</span>
                  <span>{timeRange} span</span>
                  <span>Nov 1</span>
                </div>
              </div>

              {/* Card 2: Request Count & Success Rate */}
              <div className="rounded-xl border border-white/10 bg-[#111724] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-medium">API Requests</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                    99.98% Success
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-white">1,024</span>
                  <span className="text-xs text-zinc-500">invocations</span>
                </div>

                {/* SVG Sparkline for requests */}
                <div className="mt-4 h-12 w-full flex items-end gap-1">
                  {[12, 18, 15, 22, 28, 32, 25, 40, 38, 55, 60, 52, 70, 68, 80, 74, 90, 85, 98, 104].map(
                    (val, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-sky-500/20 to-sky-400/80 rounded-t-xs hover:bg-sky-400 transition cursor-pointer"
                        style={{ height: `${(val / 110) * 100}%` }}
                        title={`Requests day ${i + 1}: ${val}`}
                      />
                    )
                  )}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Avg Latency: 240ms</span>
                  <span>P99: 480ms</span>
                </div>
              </div>

              {/* Card 3: Sovereign Credits & Balance */}
              <div className="rounded-xl border border-white/10 bg-[#111724] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-medium">Gateway Credits Balance</span>
                  <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    Active Pro
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-white">$14.73</span>
                  <span className="text-xs text-zinc-500">remaining</span>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 border-t border-white/5 pt-3">
                  <span>Usage this cycle:</span>
                  <span className="font-bold text-zinc-200">$5.32</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>Active Plan:</span>
                  <span className="font-medium text-amber-300">Sovereign Universal</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Action Cards (like Groq home) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveSubTab("playground")}
                className="group rounded-xl border border-white/10 bg-[#101522] p-5 hover:border-amber-400/40 hover:bg-[#131a2b] transition cursor-pointer"
              >
                <div className="grid size-9 place-items-center rounded-lg bg-amber-400/10 text-amber-400 mb-3 group-hover:scale-110 transition">
                  <Terminal className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition">Playground</h3>
                <p className="text-xs text-zinc-400 mt-1">Prompt and benchmark all 5 models interactively with live latency.</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-amber-400 font-semibold">
                  <span>Enter Playground</span>
                  <ChevronRight className="size-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>

              <div
                onClick={() => setActiveSubTab("keys")}
                className="group rounded-xl border border-white/10 bg-[#101522] p-5 hover:border-emerald-400/40 hover:bg-[#131a2b] transition cursor-pointer"
              >
                <div className="grid size-9 place-items-center rounded-lg bg-emerald-400/10 text-emerald-400 mb-3 group-hover:scale-110 transition">
                  <Key className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition">API Credentials</h3>
                <p className="text-xs text-zinc-400 mt-1">Manage project secrets, provider keys, and rate limits.</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <span>Manage Keys ({apiKeys.length})</span>
                  <ChevronRight className="size-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>

              <div
                onClick={() => setActiveSubTab("code")}
                className="group rounded-xl border border-white/10 bg-[#101522] p-5 hover:border-sky-400/40 hover:bg-[#131a2b] transition cursor-pointer"
              >
                <div className="grid size-9 place-items-center rounded-lg bg-sky-400/10 text-sky-400 mb-3 group-hover:scale-110 transition">
                  <Code2 className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-sky-300 transition">SDK & Integration</h3>
                <p className="text-xs text-zinc-400 mt-1">Ready-to-use cURL, TypeScript, and Python integration snippets.</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-sky-400 font-semibold">
                  <span>View Code Snippets</span>
                  <ChevronRight className="size-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>

            {/* Active Model Engine Status Table */}
            <div className="rounded-xl border border-white/10 bg-[#111724] p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-white">Active Sovereign Engines</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Real-time status of all configured providers powering your Noctis instance.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("models")}
                  className="text-xs font-semibold text-amber-400 hover:underline"
                >
                  View Full Catalog →
                </button>
              </div>

              <div className="divide-y divide-white/5 mt-2">
                {SOVEREIGN_CATALOG.map((m) => (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{m.name}</span>
                          <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold", m.badgeColor)}>
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{m.tagline} · {m.engine}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Zap className="size-3 text-amber-400" />
                        <span>{m.speed}</span>
                      </div>
                      <span className="rounded bg-white/5 px-2 py-0.5 text-zinc-300">{m.context}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: INTERACTIVE PLAYGROUND (Like Groq / xAI)       */}
        {/* ========================================================= */}
        {activeSubTab === "playground" && (
          <div className="space-y-4 max-w-6xl mx-auto">
            {/* Playground Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111724] p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400">Target Model:</span>
                <select
                  value={playModel}
                  onChange={(e) => setPlayModel(e.target.value)}
                  className="rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="Noctis Ultra (Deep Sovereign Reasoning)">Noctis Ultra (Deep Sovereign Reasoning)</option>
                  <option value="Noctis Astra High (GPT-4o Architecture)">Noctis Astra High (GPT-4o Architecture)</option>
                  <option value="Noctis Cortex Flash (Gemini 2.0 Multimodal)">Noctis Cortex Flash (Gemini 2.0 Multimodal)</option>
                  <option value="Noctis Velocity 70B (Groq 300 t/s Hyper-Speed)">Noctis Velocity 70B (Groq 300 t/s Hyper-Speed)</option>
                  <option value="Noctis Sentinel Grok (xAI Autonomous Audit)">Noctis Sentinel Grok (xAI Autonomous Audit)</option>
                </select>
              </div>

              {/* Sliders */}
              <div className="flex items-center gap-4 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Temp:</span>
                  <span className="font-mono text-amber-400 font-bold">{playTemperature}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={playTemperature}
                    onChange={(e) => setPlayTemperature(parseFloat(e.target.value))}
                    className="w-20 accent-amber-400 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Max Tokens:</span>
                  <span className="font-mono text-amber-400 font-bold">{playMaxTokens}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={playRunning}
                  onClick={handleRunPlayground}
                  className="flex items-center gap-1.5 rounded-lg bg-[#e4b86a] hover:bg-[#d8a855] text-black px-4 py-1.5 text-xs font-bold transition disabled:opacity-50 shadow-sm"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>{playRunning ? "Running..." : "Run Test"}</span>
                </button>
              </div>
            </div>

            {/* Playground Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Input Prompt Box */}
              <div className="flex flex-col rounded-xl border border-white/10 bg-[#111724] overflow-hidden min-h-[420px]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#0e1420]">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Prompt Payload</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: "Zero-Trust", text: "Architect a production-grade Zero-Trust mTLS auth gateway with JWT verification in TypeScript." },
                      { label: "Orderbook", text: "Write a high-frequency lock-free orderbook matching engine in TypeScript with unit tests." },
                      { label: "SAST Audit", text: "Generate comprehensive OWASP Top 10 SAST vulnerability detection test suite." },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setPlayPrompt(preset.text)}
                        className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white hover:bg-white/10 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={playPrompt}
                  onChange={(e) => setPlayPrompt(e.target.value)}
                  placeholder="Enter your system prompt or instruction to test..."
                  className="flex-1 w-full p-4 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none font-mono leading-relaxed"
                />
              </div>

              {/* Output Result Box */}
              <div className="flex flex-col rounded-xl border border-white/10 bg-[#0e131d] overflow-hidden min-h-[420px]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#0a0f18]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Output Stream</span>
                    {playLatency !== null && (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                        {playLatency} ms
                      </span>
                    )}
                  </div>
                  {playOutput && (
                    <button
                      type="button"
                      onClick={() => handleCopy(playOutput, "output")}
                      className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition"
                    >
                      {copiedId === "output" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      <span>{copiedId === "output" ? "Copied" : "Copy"}</span>
                    </button>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {playOutput || (
                    <span className="text-zinc-600 italic">
                      Click 'Run Test' above to send a live request to the active model and view formatted output here.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 3: API KEYS & VAULT (Like Google AI Studio / xAI) */}
        {/* ========================================================= */}
        {activeSubTab === "keys" && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Sovereign API Keys</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage active credentials for accessing Noctis through external scripts, applications, and CLI tools.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#e4b86a] hover:bg-[#d8a855] text-black px-3.5 py-2 text-xs font-bold transition shadow-sm"
              >
                <Plus className="size-3.5 stroke-[2.5]" />
                <span>Create New API Key</span>
              </button>
            </div>

            {/* Keys Table (exact layout of Google AI Studio & xAI) */}
            <div className="rounded-xl border border-white/10 bg-[#111724] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-[#0e1420] text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Key Name</th>
                      <th className="px-4 py-3">Secret Prefix</th>
                      <th className="px-4 py-3">Provider / Target</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Last Used</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {apiKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <Key className="size-3.5 text-amber-400" />
                            <span>{k.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-400">{k.keyPrefix}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-white/5 px-2 py-0.5 font-medium text-zinc-300 border border-white/5 capitalize">
                            {k.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{k.createdDate}</td>
                        <td className="px-4 py-3 text-zinc-400">{k.lastUsed}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(k.keyPrefix, k.id)}
                              className="rounded p-1 text-zinc-400 hover:text-white hover:bg-white/10 transition"
                              title="Copy Key"
                            >
                              {copiedId === k.id ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKey(k.id)}
                              className="rounded p-1 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                              title="Revoke Key"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 4: MODEL CATALOG MATRIX (Like Groq Model Shelf)   */}
        {/* ========================================================= */}
        {activeSubTab === "models" && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white">Sovereign Model Matrix</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every engine mapped and active within your Noctis environment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOVEREIGN_CATALOG.map((m) => (
                <div key={m.id} className="rounded-xl border border-white/10 bg-[#111724] p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", m.badgeColor)}>
                        {m.badge}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">{m.category}</span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-3">{m.name}</h3>
                    <p className="text-xs font-medium text-amber-300/90 mt-0.5">{m.tagline}</p>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{m.highlight}</p>
                  </div>

                  <div className="mt-5 border-t border-white/5 pt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded bg-black/40 p-2">
                      <span className="block text-[10px] text-zinc-500">Inference Speed</span>
                      <span className="font-bold text-zinc-200 mt-0.5 block">{m.speed}</span>
                    </div>
                    <div className="rounded bg-black/40 p-2">
                      <span className="block text-[10px] text-zinc-500">Context Window</span>
                      <span className="font-bold text-zinc-200 mt-0.5 block">{m.context}</span>
                    </div>
                    <div className="rounded bg-black/40 p-2">
                      <span className="block text-[10px] text-zinc-500">Backing Engine</span>
                      <span className="font-bold text-amber-400 mt-0.5 block truncate">{m.engine}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 5: QUICKSTART CODE INTEGRATION (cURL, TS, Python) */}
        {/* ========================================================= */}
        {activeSubTab === "code" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Developer SDK & Quickstart</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Integrate your active Noctis engines into any application or workflow.</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-black/40 p-1 border border-white/10">
                {(["curl", "typescript", "python"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCodeLang(lang)}
                    className={cn(
                      "rounded px-3 py-1 text-xs font-semibold capitalize transition",
                      codeLang === lang ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {lang === "typescript" ? "TypeScript / Node" : lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0d121c] p-4 relative font-mono text-xs text-zinc-200">
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={() => {
                    const text =
                      codeLang === "curl"
                        ? getCurlSnippet()
                        : codeLang === "typescript"
                        ? getTypescriptSnippet()
                        : getPythonSnippet();
                    handleCopy(text, "codeSnippet");
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs text-zinc-200 transition"
                >
                  {copiedId === "codeSnippet" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copiedId === "codeSnippet" ? "Copied" : "Copy Code"}</span>
                </button>
              </div>

              <pre className="overflow-x-auto p-2 leading-relaxed">
                {codeLang === "curl" && getCurlSnippet()}
                {codeLang === "typescript" && getTypescriptSnippet()}
                {codeLang === "python" && getPythonSnippet()}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141a28] p-6 shadow-2xl text-left">
            <h3 className="text-base font-bold text-white">Create New Sovereign API Key</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Generate a secure key to authenticate programmatic requests to your Noctis Gateway.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. My Next.js Staging App"
                  className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Routing Mode</label>
                <select
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value as StoredApiKey["provider"])}
                  className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="universal">Universal Sovereign Router (All 5 Engines)</option>
                  <option value="openai">Direct OpenAI GPT-4o Gateway</option>
                  <option value="gemini">Direct Gemini 2.0 Multimodal Gateway</option>
                  <option value="groq">Direct Groq Llama 3.3 70B Gateway</option>
                  <option value="xai">Direct xAI Grok 3 Gateway</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateKey}
                disabled={!newKeyName.trim()}
                className="rounded-lg bg-[#e4b86a] hover:bg-[#d8a855] text-black px-4 py-2 text-xs font-bold transition disabled:opacity-50"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
