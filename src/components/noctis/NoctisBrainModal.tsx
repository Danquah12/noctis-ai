"use client";

import React, { useState, useEffect } from "react";
import { Brain, X, Check, ExternalLink, Zap, Shield, Key, RefreshCw, Cpu, Server, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrainConfig, saveBrainConfig, getActiveKeyAndModel, type BrainConfig, type BrainProvider } from "@/lib/noctis-brain";
import { testBrainConnection } from "@/lib/noctis-api";

interface NoctisBrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: BrainConfig) => void;
}

interface ProviderMeta {
  id: BrainProvider;
  name: string;
  badge: string;
  badgeColor: string;
  tagline: string;
  models: { id: string; label: string; note: string }[];
  defaultModel: string;
  keyPrefix: string;
  freeTier: boolean;
  signupUrl: string;
  signupLabel: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "Recommended • Free",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    tagline: "Multimodal frontier model with instant reasoning. Generous free tier via Google AI Studio.",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", note: "Ultra-fast, deep multimodal context, free tier" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", note: "Frontier reasoning & 2M token context" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", note: "Lightweight, highly optimized" },
    ],
    keyPrefix: "AIzaSy...",
    freeTier: true,
    signupUrl: "https://aistudio.google.com/app/apikey",
    signupLabel: "Get Free Gemini Key (No Card Needed)",
  },
  {
    id: "groq",
    name: "Groq (Llama 3.3)",
    badge: "Ultra-Fast • Free",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    tagline: "Blazing fast inference (300+ tokens/sec) on LPUs powering open-weights Llama 3.3.",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", note: "State of the art open reasoning" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", note: "Sub-100ms ultra-low latency" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", note: "High throughput MoE architecture" },
    ],
    keyPrefix: "gsk_...",
    freeTier: true,
    signupUrl: "https://console.groq.com/keys",
    signupLabel: "Get Free Groq Key",
  },
  {
    id: "openai",
    name: "OpenAI",
    badge: "Frontier Generalist",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    tagline: "Industry-standard GPT-4o models for reasoning, analysis, and coding.",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini", note: "Fast, intelligent, highly cost-efficient" },
      { id: "gpt-4o", label: "GPT-4o", note: "Omni flagship reasoning and vision" },
    ],
    keyPrefix: "sk-...",
    freeTier: false,
    signupUrl: "https://platform.openai.com/api-keys",
    signupLabel: "Get OpenAI API Key",
  },
  {
    id: "xai",
    name: "xAI Grok",
    badge: "Frontier Vision",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    tagline: "Real-time knowledge and frontier reasoning from xAI.",
    defaultModel: "grok-3-mini",
    models: [
      { id: "grok-3-mini", label: "Grok 3 Mini", note: "Fast, focused analytical model" },
      { id: "grok-2-1212", label: "Grok 2", note: "Full-capability multimodal model" },
    ],
    keyPrefix: "xai-...",
    freeTier: false,
    signupUrl: "https://console.x.ai",
    signupLabel: "Get xAI Grok Key",
  },
  {
    id: "custom",
    name: "Local Ollama / Custom",
    badge: "100% Offline • Private",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    tagline: "Run open models on your local machine with zero external network access.",
    defaultModel: "llama3.2",
    models: [
      { id: "llama3.2", label: "Ollama Llama 3.2", note: "Local 3B/1B parameter model" },
      { id: "mistral", label: "Ollama Mistral 7B", note: "Balanced general reasoning" },
      { id: "custom", label: "Custom Model Name", note: "Specify custom model" },
    ],
    keyPrefix: "Optional key",
    freeTier: true,
    signupUrl: "https://ollama.com",
    signupLabel: "Download Ollama (Free)",
  },
];

export function NoctisBrainModal({ isOpen, onClose, onConfigSaved }: NoctisBrainModalProps) {
  const [config, setConfig] = useState<BrainConfig>(() => getBrainConfig());
  const [activeProvider, setActiveProvider] = useState<BrainProvider>(config.provider || "gemini");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency?: number } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loaded = getBrainConfig();
      setConfig(loaded);
      setActiveProvider(loaded.provider || "gemini");
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProvider = PROVIDERS.find((p) => p.id === activeProvider) || PROVIDERS[0];

  function getKeyValue(p: BrainProvider): string {
    switch (p) {
      case "gemini":
        return config.geminiKey || "";
      case "groq":
        return config.groqKey || "";
      case "openai":
        return config.openaiKey || "";
      case "xai":
        return config.xaiKey || "";
      case "custom":
        return config.customKey || "";
    }
  }

  function setKeyValue(p: BrainProvider, val: string) {
    setConfig((prev) => {
      switch (p) {
        case "gemini":
          return { ...prev, geminiKey: val };
        case "groq":
          return { ...prev, groqKey: val };
        case "openai":
          return { ...prev, openaiKey: val };
        case "xai":
          return { ...prev, xaiKey: val };
        case "custom":
          return { ...prev, customKey: val };
      }
    });
    setTestResult(null);
  }

  function getModelValue(p: BrainProvider): string {
    switch (p) {
      case "gemini":
        return config.geminiModel || "gemini-2.0-flash";
      case "groq":
        return config.groqModel || "llama-3.3-70b-versatile";
      case "openai":
        return config.openaiModel || "gpt-4o-mini";
      case "xai":
        return config.xaiModel || "grok-3-mini";
      case "custom":
        return config.customModel || "llama3.2";
    }
  }

  function setModelValue(p: BrainProvider, val: string) {
    setConfig((prev) => {
      switch (p) {
        case "gemini":
          return { ...prev, geminiModel: val };
        case "groq":
          return { ...prev, groqModel: val };
        case "openai":
          return { ...prev, openaiModel: val };
        case "xai":
          return { ...prev, xaiModel: val };
        case "custom":
          return { ...prev, customModel: val };
      }
    });
    setTestResult(null);
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    const key = getKeyValue(activeProvider).trim();
    const model = getModelValue(activeProvider).trim();
    const endpoint = activeProvider === "custom" ? (config.customEndpoint || "http://localhost:11434/v1").trim() : undefined;

    try {
      const res = await testBrainConnection({
        data: {
          provider: activeProvider,
          apiKey: key,
          model,
          endpoint,
        },
      });

      if (res && typeof res === "object" && "ok" in res) {
        if (res.ok) {
          setTestResult({
            ok: true,
            latency: res.latencyMs,
            message: `Connected! Response in ${res.latencyMs}ms (${res.model})`,
          });
        } else {
          setTestResult({
            ok: false,
            message: res.error || "Connection failed. Check API key.",
          });
        }
      } else {
        setTestResult({ ok: false, message: "No response from test server." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during test.";
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    const updated: BrainConfig = {
      ...config,
      provider: activeProvider,
    };
    saveBrainConfig(updated);
    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved(updated);
    setTimeout(() => {
      onClose();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-[#161616] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#e4b86a]/15 text-[#e4b86a] border border-[#e4b86a]/30">
              <Brain className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Sovereign Brain & Provider Gateway</h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  Universal Q&A
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Connect frontier LLMs so Noctis responds to any question with ChatGPT-grade depth.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-6 py-2 bg-black/20 no-scrollbar">
          {PROVIDERS.map((p) => {
            const isActive = activeProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveProvider(p.id);
                  setTestResult(null);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition border",
                  isActive
                    ? "border-[#e4b86a] bg-[#e4b86a]/15 text-[#e4b86a] shadow-sm"
                    : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <span>{p.name}</span>
                {p.freeTier ? (
                  <span className="rounded-md bg-emerald-500/20 px-1 py-0.2 text-[9px] text-emerald-300">
                    Free
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Active Provider Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Provider Overview Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {currentProvider.name}
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", currentProvider.badgeColor)}>
                    {currentProvider.badge}
                  </span>
                </h3>
                <p className="mt-1 text-xs text-zinc-400">{currentProvider.tagline}</p>
              </div>
              <a
                href={currentProvider.signupUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-amber-300 border border-white/10 hover:bg-white/10 transition"
              >
                <span>{currentProvider.signupLabel}</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Key className="size-3.5 text-[#e4b86a]" />
                API Key {currentProvider.freeTier ? "(Free)" : ""}
              </label>
              <a
                href={currentProvider.signupUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#e4b86a] hover:underline sm:hidden"
              >
                Get Key →
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={getKeyValue(activeProvider)}
                onChange={(e) => setKeyValue(activeProvider, e.target.value)}
                placeholder={`Paste your ${currentProvider.name} key (${currentProvider.keyPrefix})`}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#e4b86a] focus:outline-none focus:ring-1 focus:ring-[#e4b86a] font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Keys are stored securely in your private browser sandbox and never logged on disk.
            </p>
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Cpu className="size-3.5 text-[#e4b86a]" />
              Model Selection
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {currentProvider.models.map((m) => {
                const isSelected = getModelValue(activeProvider) === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModelValue(activeProvider, m.id)}
                    className={cn(
                      "flex flex-col items-start rounded-xl p-2.5 text-left border transition",
                      isSelected
                        ? "border-[#e4b86a] bg-[#e4b86a]/10 text-white"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                    )}
                  >
                    <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                      {m.label}
                      {isSelected ? <Check className="size-3 text-[#e4b86a]" /> : null}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{m.note}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Endpoint (For Ollama / Local) */}
          {activeProvider === "custom" ? (
            <div className="space-y-1.5 rounded-2xl border border-white/10 bg-black/30 p-3.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Server className="size-3.5 text-cyan-400" />
                Local Ollama / OpenAI-Compatible Endpoint
              </label>
              <input
                type="text"
                value={config.customEndpoint || "http://localhost:11434/v1"}
                onChange={(e) => setConfig((prev) => ({ ...prev, customEndpoint: e.target.value }))}
                placeholder="http://localhost:11434/v1"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:border-[#e4b86a] focus:outline-none"
              />
              <p className="text-[11px] text-zinc-400">
                Supports Ollama, vLLM, LM Studio, or any local OpenAI-compatible inference server.
              </p>
            </div>
          ) : null}

          {/* Test Connection Banner */}
          {testResult ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl p-3 text-xs border animate-in fade-in",
                testResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              )}
            >
              {testResult.ok ? <Check className="size-4 shrink-0 text-emerald-400" /> : <X className="size-4 shrink-0 text-rose-400" />}
              <span className="flex-1 font-medium">{testResult.message}</span>
            </div>
          ) : null}

          {/* Sovereign Guarantee Note */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90">
            <Shield className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <p>
              <strong>Sovereign Dual-Brain Guarantee:</strong> General conversational questions flow directly through your configured model. High-stakes requests (cryptography, zero-knowledge proofs, vulnerability audits) automatically pass through Noctis's 16 local deterministic verification suites.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-white/[0.02]">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || (!getKeyValue(activeProvider).trim() && activeProvider !== "custom")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-50 transition"
          >
            <RefreshCw className={cn("size-3.5", testing && "animate-spin")} />
            <span>{testing ? "Testing..." : "Test Connection"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#e4b86a] px-4 py-2 text-xs font-bold text-black hover:bg-[#f3cca0] transition shadow-lg shadow-[#e4b86a]/15"
            >
              {savedSuccess ? (
                <>
                  <Check className="size-3.5" />
                  <span>Activated!</span>
                </>
              ) : (
                <>
                  <Zap className="size-3.5" />
                  <span>Save & Activate Brain</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
