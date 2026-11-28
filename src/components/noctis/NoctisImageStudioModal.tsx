"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Eraser, Image as ImageIcon, Paintbrush, Send, Sparkles, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoctisImageStudioModalProps {
  open: boolean;
  onClose: () => void;
  onAttachToChat?: (dataUrl: string, caption: string) => void;
}

export function NoctisImageStudioModal({ open, onClose, onAttachToChat }: NoctisImageStudioModalProps) {
  const [mode, setMode] = useState<"GENERATE" | "EDIT">("GENERATE");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1536x1024" | "1024x1536">("1024x1024");
  const [sourcePreview, setSourcePreview] = useState<string>("");
  const [brushSize, setBrushSize] = useState(24);
  const [drawing, setDrawing] = useState(false);
  const [hasMaskStrokes, setHasMaskStrokes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ dataUri: string; engine: string; providerNote?: string } | null>(null);

  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
  }, [open]);

  function clearMask() {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasMaskStrokes(false);
  }

  function handleUploadSource(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (dataUrl) {
        setSourcePreview(dataUrl);
        setMode("EDIT");
        clearMask();
      }
    };
    reader.readAsDataURL(file);
  }

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height,
    };
  }

  function paintMaskDot(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.fillStyle = "rgba(228, 184, 106, 0.72)";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    setHasMaskStrokes(true);
  }

  function exportOpenAiInpaintMaskDataUrl(): string | undefined {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !hasMaskStrokes) return undefined;
    // OpenAI image edit masks use transparent pixels (alpha = 0) to mark the region to edit
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = maskCanvas.width;
    exportCanvas.height = maskCanvas.height;
    const ectx = exportCanvas.getContext("2d");
    const mctx = maskCanvas.getContext("2d");
    if (!ectx || !mctx) return undefined;
    const srcPixels = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const outImg = ectx.createImageData(maskCanvas.width, maskCanvas.height);
    for (let i = 0; i < srcPixels.data.length; i += 4) {
      const painted = (srcPixels.data[i + 3] ?? 0) > 10;
      outImg.data[i] = 0;
      outImg.data[i + 1] = 0;
      outImg.data[i + 2] = 0;
      outImg.data[i + 3] = painted ? 0 : 255;
    }
    ectx.putImageData(outImg, 0, 0);
    return exportCanvas.toDataURL("image/png");
  }

  async function handleRun() {
    if (!prompt.trim()) {
      setError("Describe what you want to generate or edit.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const endpoint = mode === "EDIT" ? "/api/v2/assistant/images/edit" : "/api/v2/assistant/images/generate";
      const maskImageBase64 = mode === "EDIT" ? exportOpenAiInpaintMaskDataUrl() : undefined;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt: prompt.trim(),
          size,
          sourceImageBase64: mode === "EDIT" ? sourcePreview || undefined : undefined,
          maskImageBase64,
        }),
      });
      const json = (await res.json()) as {
        dataUri?: string;
        engine?: string;
        providerNote?: string;
        error?: string;
      };
      if (!res.ok || !json.dataUri) {
        setError(json.error || "Failed to generate image.");
        return;
      }
      setResult({
        dataUri: json.dataUri,
        engine: json.engine || "noctis-image-studio",
        providerNote: json.providerNote,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image request failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-[#16181f] text-zinc-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-sky-500/20 text-sky-300">
              <ImageIcon className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Noctis Image Studio &amp; Region Inpainting</h2>
              <p className="text-xs text-zinc-400">Live raster generation &amp; brush-mask editing (OpenAI gpt-image-1 / xAI Imagine + SVG fallback)</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("GENERATE")}
                className={cn("rounded-full px-3.5 py-1 font-medium transition", mode === "GENERATE" ? "bg-[#e4b86a] text-[#1a1408]" : "text-zinc-300 hover:text-white")}
              >
                Generate New
              </button>
              <button
                type="button"
                onClick={() => setMode("EDIT")}
                className={cn("rounded-full px-3.5 py-1 font-medium transition", mode === "EDIT" ? "bg-[#e4b86a] text-[#1a1408]" : "text-zinc-300 hover:text-white")}
              >
                Edit / Inpaint Mask
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10">
                <Upload className="size-3.5 text-sky-400" />
                <span>Upload Source Image</span>
                <input type="file" accept="image/*" onChange={handleUploadSource} className="hidden" />
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as "1024x1024" | "1536x1024" | "1024x1536")}
                className="rounded-xl border border-white/12 bg-[#0d1017] px-2.5 py-1.5 text-xs text-zinc-200"
              >
                <option value="1024x1024">Square (1024×1024)</option>
                <option value="1536x1024">Landscape (1536×1024)</option>
                <option value="1024x1536">Portrait (1024×1536)</option>
              </select>
            </div>
          </div>

          {mode === "EDIT" && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1017] p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-amber-300">
                  <Paintbrush className="size-3.5" />
                  Paint over the region you want to modify or inpaint
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-zinc-400">
                    Brush {brushSize}px
                    <input
                      type="range"
                      min={8}
                      max={64}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="ml-2 w-24 align-middle"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={clearMask}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
                  >
                    <Eraser className="size-3" />
                    Clear Mask
                  </button>
                </div>
              </div>

              <div className="relative mx-auto flex h-64 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/40">
                {sourcePreview ? (
                  <>
                    <img src={sourcePreview} alt="Edit source" className="h-full w-full object-contain pointer-events-none select-none" />
                    <canvas
                      ref={maskCanvasRef}
                      width={512}
                      height={512}
                      onPointerDown={(e) => {
                        setDrawing(true);
                        paintMaskDot(e);
                      }}
                      onPointerMove={(e) => {
                        if (drawing) paintMaskDot(e);
                      }}
                      onPointerUp={() => setDrawing(false)}
                      onPointerLeave={() => setDrawing(false)}
                      className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                    />
                  </>
                ) : (
                  <p className="text-xs text-zinc-500">Click &ldquo;Upload Source Image&rdquo; above to paint an inpainting mask.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleRun();
                }
              }}
              placeholder={
                mode === "EDIT"
                  ? "Describe what should change inside the masked area..."
                  : "Describe the diagram, illustration, UI mockup, or photorealistic visual..."
              }
              className="flex-1 rounded-xl border border-white/12 bg-[#0d1017] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#e4b86a] px-4 py-2 text-xs font-semibold text-[#1a1408] hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" />
              <span>{busy ? "Rendering..." : mode === "EDIT" ? "Apply Edit" : "Generate"}</span>
            </button>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          {result && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0d1017] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-300">
                  Engine: {result.engine}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={result.dataUri}
                    download={`noctis-${mode.toLowerCase()}.${result.dataUri.startsWith("data:image/png") ? "png" : "svg"}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10"
                  >
                    <Download className="size-3.5" />
                    Download
                  </a>
                  {onAttachToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onAttachToChat(result.dataUri, prompt.trim());
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/30"
                    >
                      <Send className="size-3.5" />
                      Attach to Chat
                    </button>
                  )}
                </div>
              </div>
              {result.providerNote && <p className="text-[11px] text-zinc-400">{result.providerNote}</p>}
              <img src={result.dataUri} alt={prompt} className="mx-auto max-h-80 rounded-xl border border-white/10 object-contain" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
