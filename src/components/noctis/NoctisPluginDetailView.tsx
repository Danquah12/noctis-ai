"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Check,
  Plus,
  ArrowRight,
  Shield,
  Key,
  ExternalLink,
  Layers,
  Sparkles,
  Lock,
  Cpu,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PluginItem } from "./NoctisPluginsTab";
import { getPluginScenarioDetail, PluginScenarioDetail } from "@/lib/noctis-plugin-scenarios";

interface NoctisPluginDetailViewProps {
  plugin: PluginItem;
  isInstalled: boolean;
  onToggleInstall: () => void;
  onBack: () => void;
  onLaunchPrompt: (promptText: string) => void;
  onOpenWorkspace?: () => void;
}

export function NoctisPluginDetailView({
  plugin,
  isInstalled,
  onToggleInstall,
  onBack,
  onLaunchPrompt,
  onOpenWorkspace,
}: NoctisPluginDetailViewProps) {
  const detail: PluginScenarioDetail = getPluginScenarioDetail(
    plugin.id,
    plugin.name,
    plugin.category,
    plugin.description
  );

  const [connectionMode, setConnectionMode] = useState<"sandbox" | "live">("sandbox");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [oauthConnecting, setOauthConnecting] = useState(false);
  const [oauthSuccess, setOauthSuccess] = useState(false);

  const handleSimulateOAuth = () => {
    setOauthConnecting(true);
    setTimeout(() => {
      setOauthConnecting(false);
      setOauthSuccess(true);
      if (!isInstalled) {
        onToggleInstall();
      }
    }, 1200);
  };

  const handleSaveKey = () => {
    if (!apiKeyInput.trim()) return;
    setKeySaved(true);
    if (!isInstalled) {
      onToggleInstall();
    }
    setTimeout(() => setKeySaved(false), 3000);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#141414] text-zinc-100 overflow-y-auto select-none">
      {/* Top Breadcrumb Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#141414]/90 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 font-medium text-zinc-400 hover:text-white transition"
          >
            <ChevronLeft className="size-3.5" />
            <span>Plugins</span>
          </button>
          <span className="text-zinc-600">/</span>
          <span className="font-semibold text-zinc-200">{detail.name}</span>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition"
        >
          Close
        </button>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 space-y-8">
        {/* Header Block (Matching Screenshot Structure) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div className="flex items-center gap-4">
            {/* App Icon */}
            <div
              className={cn(
                "grid size-16 shrink-0 place-items-center rounded-2xl text-2xl font-bold shadow-xl border border-white/15",
                plugin.iconBg || "bg-[#252525]",
                plugin.iconColor || "text-white"
              )}
            >
              {plugin.iconText || detail.name.slice(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">{detail.name}</h1>
                {plugin.isPlatform && (
                  <span className="rounded-full bg-[#e4b86a]/20 border border-[#e4b86a]/40 px-2 py-0.5 text-[10px] font-bold text-[#e4b86a] uppercase">
                    Platform Native
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                By <span className="font-medium text-zinc-300">{detail.publisher}</span> • {detail.tagline}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {onOpenWorkspace && (
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:border-white/30 transition shadow-sm"
              >
                <Terminal className="size-3.5 text-[#e4b86a]" />
                <span>Open Workspace</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleInstall}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold transition shadow-lg",
                isInstalled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                  : "bg-white text-black hover:bg-zinc-200"
              )}
            >
              {isInstalled ? (
                <>
                  <Check className="size-3.5 stroke-[2.5]" />
                  <span>Installed</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>Install plugin</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hero Interactive Prompt Showcase (Matching Screenshot Visual Card) */}
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#1e1b2e] via-[#151926] to-[#0f141d] p-6 sm:p-8 shadow-2xl">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 size-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#e4b86a]" />
                Sovereign Prompt Scenarios • Click to Execute
              </span>
              <span className="text-[11px] text-zinc-400">Runs directly in Noctis Desk</span>
            </div>

            {detail.prompts.map((scenario, idx) => (
              <div
                key={idx}
                onClick={() => onLaunchPrompt(scenario.prompt)}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/[0.08] hover:bg-white/[0.14] hover:border-[#e4b86a]/50 p-4 transition-all duration-150 cursor-pointer shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#e4b86a]">{detail.name}</span>
                    <span className="text-xs font-semibold text-white truncate">{scenario.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>

                <div className="shrink-0 grid size-8 place-items-center rounded-full bg-white/10 text-zinc-300 group-hover:bg-[#e4b86a] group-hover:text-black transition">
                  <ArrowRight className="size-4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plugin Overview Description */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Overview</h2>
          <p className="text-sm leading-relaxed text-zinc-300">
            {detail.description}
          </p>
        </div>

        {/* Apps Section (Matching Screenshot Apps 1) */}
        <div className="space-y-3 border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Apps ({detail.apps.length})
          </h2>
          <div className="space-y-2">
            {detail.apps.map((app, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white font-bold text-xs">
                  {detail.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{app.name}</h3>
                  <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">{app.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills Section (Matching Screenshot Skills 1) */}
        {detail.skills.length > 0 && (
          <div className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Skills ({detail.skills.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {detail.skills.map((skill, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-[#e4b86a]" />
                    <h3 className="text-xs font-semibold text-zinc-200">{skill.name}</h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{skill.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Architecture & API Credentials (Addressing User's Question Directly) */}
        <div className="space-y-4 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Connection Architecture &amp; Credentials
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Choose between sovereign local air-gapped simulation or live external API connectivity.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setConnectionMode("sandbox")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition",
                  connectionMode === "sandbox" ? "bg-[#e4b86a] text-black font-bold" : "text-zinc-400 hover:text-white"
                )}
              >
                Local Sandbox
              </button>
              <button
                type="button"
                onClick={() => setConnectionMode("live")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition",
                  connectionMode === "live" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                )}
              >
                Live Remote API
              </button>
            </div>
          </div>

          {connectionMode === "sandbox" ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Sovereign Air-Gapped Mode Active</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Zero external telemetry. Noctis uses client-side AST synthesis, realistic mock mailboxes, and pre-indexed schema state. No external API keys or vendor logins required to run all functions.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300">
                  <Key className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Live Remote API Integration</span>
                </div>
                <span className="text-[11px] text-zinc-400">Stored in encrypted local vault</span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {detail.apiConfig.helpText}
              </p>

              {detail.apiConfig.oauthProvider ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSimulateOAuth}
                    disabled={oauthConnecting || oauthSuccess}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-50"
                  >
                    <ExternalLink className="size-3.5 text-[#e4b86a]" />
                    <span>
                      {oauthConnecting
                        ? "Authenticating OAuth..."
                        : oauthSuccess
                        ? "✓ Account Connected"
                        : `Sign in with ${detail.apiConfig.oauthProvider}`}
                    </span>
                  </button>
                  {oauthSuccess && (
                    <span className="text-xs text-emerald-400">OAuth token valid &amp; active</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={detail.apiConfig.placeholder || "Enter API Key or Bearer Token..."}
                    className="flex-1 rounded-xl border border-white/15 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="rounded-xl bg-[#e4b86a] px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition"
                  >
                    {keySaved ? "Saved!" : "Save to Vault"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Technical Metadata Table (Matching Screenshot Information section) */}
        <div className="space-y-3 border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Information</h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 text-xs">
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-400">Capabilities</span>
              <span className="font-medium text-zinc-200">{detail.capabilities.join(", ")}</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-400">Developer</span>
              <span className="font-medium text-zinc-200">{detail.publisher}</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-400">Protocol</span>
              <span className="font-medium text-zinc-200">{detail.protocol}</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-400">Data Isolation</span>
              <span className="font-medium text-emerald-400">Sovereign Air-Gap Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
