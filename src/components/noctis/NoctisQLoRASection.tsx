import React, { useState, useMemo } from "react";
import {
  Cpu,
  Download,
  Copy,
  Check,
  HardDrive,
  Clock,
  Sparkles,
  Layers,
  FileCode,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type QLoRAConfig,
  DEFAULT_QLORA_CONFIG,
  calculateVramEstimate,
  generateShareGptDataset,
  generateAlpacaDataset,
  generatePreferenceDataset,
  generateUnslothTrainingScript,
  generateOllamaModelfile,
} from "@/lib/noctis-qlora-pipeline.ts";
import { downloadBlob } from "@/lib/noctis-clinical-export.ts";

export function NoctisQLoRASection() {
  const [config, setConfig] = useState<QLoRAConfig>(DEFAULT_QLORA_CONFIG);
  const [activeCodeTab, setActiveCodeTab] = useState<"script" | "sharegpt" | "dpo" | "modelfile">("script");
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // VRAM & compute hardware sizing
  const vramEstimate = useMemo(() => {
    return calculateVramEstimate(config.baseModel);
  }, [config.baseModel]);

  // Generated code samples
  const unslothScript = useMemo(() => {
    return generateUnslothTrainingScript(config);
  }, [config]);

  const ollamaModelfile = useMemo(() => {
    return generateOllamaModelfile("noctis-sovereign-adapter", config.baseModel === "llama-3.1-70b-instruct" ? "llama3.1:70b" : "llama3.1:8b");
  }, [config.baseModel]);

  const shareGptSample = useMemo(() => {
    const data = generateShareGptDataset().slice(0, 1);
    return JSON.stringify(data[0], null, 2);
  }, []);

  const dpoSample = useMemo(() => {
    const data = generatePreferenceDataset().slice(0, 1);
    return JSON.stringify(data[0], null, 2);
  }, []);

  const activeCodeContent = useMemo(() => {
    switch (activeCodeTab) {
      case "script":
        return unslothScript;
      case "sharegpt":
        return shareGptSample;
      case "dpo":
        return dpoSample;
      case "modelfile":
        return ollamaModelfile;
    }
  }, [activeCodeTab, unslothScript, shareGptSample, dpoSample, ollamaModelfile]);

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(activeCodeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Full dataset downloads
  const handleDownloadDataset = (format: "sharegpt" | "alpaca" | "dpo") => {
    setIsExporting(format);
    setTimeout(() => {
      try {
        if (format === "sharegpt") {
          const dataset = generateShareGptDataset();
          const jsonl = dataset.map((d) => JSON.stringify(d)).join("\n");
          downloadBlob("noctis_health_500_sharegpt.jsonl", jsonl, "application/jsonl");
        } else if (format === "alpaca") {
          const dataset = generateAlpacaDataset();
          const jsonl = dataset.map((d) => JSON.stringify(d)).join("\n");
          downloadBlob("noctis_health_500_alpaca.jsonl", jsonl, "application/jsonl");
        } else if (format === "dpo") {
          const dataset = generatePreferenceDataset();
          const jsonl = dataset.map((d) => JSON.stringify(d)).join("\n");
          downloadBlob("noctis_health_500_dpo_safety.jsonl", jsonl, "application/jsonl");
        }
      } finally {
        setIsExporting(null);
      }
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              <Cpu className="size-3 text-cyan-400" /> SFT & DPO Forge
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              4-Bit NF4 Quantization
            </span>
            <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Air-Gapped Sovereign
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            Autonomous QLoRA Specialist Fine-Tuning Pipeline & Dataset Forge
          </h2>
          <p className="text-xs text-white/60">
            Convert the 500 gold-standard cases into high-fidelity ShareGPT/Alpaca instruction datasets and DPO safety preference pairs for fine-tuning sovereign Llama-3.1, Qwen-2.5, and Mistral models.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownloadDataset("sharegpt")}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200 transition shadow-sm"
          >
            <Download className="size-3.5" />
            {isExporting === "sharegpt" ? "Generating..." : "Download ShareGPT (.jsonl)"}
          </button>
          <button
            type="button"
            onClick={() => handleDownloadDataset("dpo")}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-200 transition shadow-sm"
          >
            <ShieldCheck className="size-3.5" />
            {isExporting === "dpo" ? "Generating..." : "Download DPO Safety (.jsonl)"}
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Training Instruction Pairs</div>
          <div className="text-xl font-bold text-white font-mono">500 <span className="text-xs text-emerald-400 font-normal">verified</span></div>
          <div className="text-[10px] text-white/50 mt-1">100% gold-standard cases</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Estimated Token Budget</div>
          <div className="text-xl font-bold text-cyan-300 font-mono">~1.45M <span className="text-xs text-white/50 font-normal">tokens</span></div>
          <div className="text-[10px] text-white/50 mt-1">Average 2,900 tokens/case</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Specialties Represented</div>
          <div className="text-xl font-bold text-violet-300 font-mono">15 / 15 <span className="text-xs text-violet-400 font-normal">subspecialties</span></div>
          <div className="text-[10px] text-white/50 mt-1">Balanced multi-specialty</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Safety Invariant Gates</div>
          <div className="text-xl font-bold text-amber-300 font-mono">100% <span className="text-xs text-amber-400 font-normal">codified</span></div>
          <div className="text-[10px] text-white/50 mt-1">Zero critical failure tolerance</div>
        </div>
      </div>

      {/* Configuration & Sizing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Hyperparameter Config */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4 lg:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Zap className="size-3.5 text-cyan-400" /> QLoRA Training Configuration
          </h3>

          {/* Base Model Picker */}
          <div>
            <label className="block text-[11px] text-white/60 mb-1">Target Foundation Model</label>
            <select
              value={config.baseModel}
              onChange={(e) => setConfig({ ...config, baseModel: e.target.value as any })}
              className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="llama-3.1-70b-instruct">Meta LLaMA-3.1-70B-Instruct (Recommended)</option>
              <option value="qwen-2.5-32b-instruct">Qwen-2.5-32B-Instruct (Balanced Speed/Accuracy)</option>
              <option value="llama-3.1-8b-instruct">Meta LLaMA-3.1-8B-Instruct (Edge/Local PC)</option>
              <option value="mistral-large-2407">Mistral Large 2 123B (Frontier Complex)</option>
            </select>
          </div>

          {/* LoRA Rank & Alpha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/60 mb-1">LoRA Rank (r)</label>
              <select
                value={config.loraRank}
                onChange={(e) => setConfig({ ...config, loraRank: parseInt(e.target.value, 10) })}
                className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value={16}>r = 16</option>
                <option value={32}>r = 32</option>
                <option value={64}>r = 64 (Optimal)</option>
                <option value={128}>r = 128 (High Capacity)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/60 mb-1">LoRA Alpha (α)</label>
              <select
                value={config.loraAlpha}
                onChange={(e) => setConfig({ ...config, loraAlpha: parseInt(e.target.value, 10) })}
                className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value={32}>α = 32</option>
                <option value={64}>α = 64</option>
                <option value={128}>α = 128 (2x Rank)</option>
                <option value={256}>α = 256</option>
              </select>
            </div>
          </div>

          {/* Sequence Length & Epochs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/60 mb-1">Max Context Length</label>
              <select
                value={config.maxSeqLength}
                onChange={(e) => setConfig({ ...config, maxSeqLength: parseInt(e.target.value, 10) })}
                className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value={2048}>2,048 tokens</option>
                <option value={4096}>4,096 tokens (Standard)</option>
                <option value={8192}>8,192 tokens</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/60 mb-1">Training Epochs</label>
              <select
                value={config.epochs}
                onChange={(e) => setConfig({ ...config, epochs: parseInt(e.target.value, 10) })}
                className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value={1}>1 epoch</option>
                <option value={2}>2 epochs</option>
                <option value={3}>3 epochs (Recommended)</option>
                <option value={5}>5 epochs</option>
              </select>
            </div>
          </div>

          {/* Hardware & VRAM Sizer Card */}
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-3 space-y-2 text-xs">
            <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="size-3.5 text-cyan-400" /> Hardware VRAM Sizing
            </div>
            <div className="space-y-1 text-white/80">
              <div className="flex justify-between">
                <span className="text-white/50">Base Model (FP16):</span>
                <span className="font-mono">{vramEstimate.baseModelVramGb} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300 font-semibold">4-Bit QLoRA Required VRAM:</span>
                <span className="font-mono font-bold text-cyan-300">{vramEstimate.qloraVramGb} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Estimated Training Time:</span>
                <span className="font-mono text-emerald-400">{vramEstimate.estimatedTrainingHoursA100} hrs (A100)</span>
              </div>
            </div>
            <div className="pt-2 border-t border-cyan-500/20 text-[10px] text-white/60">
              <span className="font-bold text-white/80">Recommended Setup:</span> {vramEstimate.recommendedHardware}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Code & Dataset Inspector */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2 flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveCodeTab("script")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  activeCodeTab === "script" ? "bg-cyan-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                <FileCode className="size-3 inline mr-1" /> train_qlora.py
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab("sharegpt")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  activeCodeTab === "sharegpt" ? "bg-cyan-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                <FileText className="size-3 inline mr-1" /> ShareGPT Format Sample
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab("dpo")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  activeCodeTab === "dpo" ? "bg-cyan-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                <ShieldCheck className="size-3 inline mr-1" /> DPO Safety Pair
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab("modelfile")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  activeCodeTab === "modelfile" ? "bg-cyan-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                <Sparkles className="size-3 inline mr-1" /> Ollama Modelfile
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] text-white/80 border border-white/10 transition"
                title="Copy code to clipboard"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const filename = activeCodeTab === "script" ? "train_qlora.py" : activeCodeTab === "modelfile" ? "Modelfile" : "sample.json";
                  const mime = activeCodeTab === "script" ? "text/x-python" : "text/plain";
                  downloadBlob(filename, activeCodeContent, mime);
                }}
                className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] text-white/80 border border-white/10 transition"
                title="Download file"
              >
                <Download className="size-3" /> Save File
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="flex-1 min-h-[380px] max-h-[500px] overflow-auto rounded-lg bg-black/60 border border-white/5 p-3.5 font-mono text-[11px] text-zinc-300 leading-relaxed">
            <pre className="whitespace-pre">{activeCodeContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
