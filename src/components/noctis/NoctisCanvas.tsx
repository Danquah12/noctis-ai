import { useState, useRef, useEffect, useMemo } from "react";
import {
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  GitCompare,
  History,
  Maximize2,
  Minimize2,
  PanelRightClose,
  Pencil,
  Presentation,
  Printer,
  Redo2,
  RotateCcw,
  Sparkles,
  Table,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CanvasMode = "document" | "code" | "sermon" | "spreadsheet" | "presentation";
export type CanvasView = "preview" | "edit" | "split" | "diff";

export interface NoctisCanvasProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  content: string;
  onContentChange: (newContent: string) => void;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onReviseArtifact: (instruction: string) => Promise<void>;
  isRevising?: boolean;
  onDownloadDoc?: (title: string, content: string) => void;
  onPrint?: (title: string, content: string) => void;
  renderPreview?: (content: string) => React.ReactNode;
}

export function detectCanvasMode(text: string): CanvasMode {
  if (
    /```(?:python|typescript|javascript|tsx|jsx|c|cpp|rust|go|sql|bash|sh|json)/i.test(text) ||
    /^(?:import\s|function\s|def\s|class\s|export\s)/m.test(text)
  ) {
    return "code";
  }
  if (
    /\b(expository\s+sermon|sermon\s+outline|homiletics|hermeneutic|psalms?|romans|genesis|revelation|kjv|matthew|hebrew|greek\s+lexic)/i.test(
      text
    )
  ) {
    return "sermon";
  }
  if (
    /\b(slide\s+\d+|presentation\s+deck|speaker\s+notes|keynote)/i.test(text)
  ) {
    return "presentation";
  }
  if (
    (/\|(?:\s*[-:]+\s*\|)+/.test(text) && /\b(revenue|dso|dio|ebitda|margin|wacc|capex|balance\s+sheet)/i.test(text)) ||
    (text.match(/\|/g) || []).length > 20
  ) {
    return "spreadsheet";
  }
  return "document";
}

export function NoctisCanvas({
  title,
  onTitleChange,
  content,
  onContentChange,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  onReviseArtifact,
  isRevising = false,
  onDownloadDoc,
  onPrint,
  renderPreview,
}: NoctisCanvasProps) {
  const [view, setView] = useState<CanvasView>("preview");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [copied, setCopied] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [showReviseTools, setShowReviseTools] = useState(false);
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const mode = useMemo(() => detectCanvasMode(content), [content]);

  // Keep history updated when external content changes from a revision
  useEffect(() => {
    if (content !== history[historyIndex]) {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), content].slice(-30));
      setHistoryIndex((prev) => prev + 1);
    }
  }, [content]);

  useEffect(() => {
    setTitleDraft(title);
  }, [title]);

  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const charCount = content.length;

  function handleUndo() {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      onContentChange(history[nextIndex] ?? "");
    }
  }

  function handleRedo() {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onContentChange(history[nextIndex] ?? "");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore copy errors */
    }
  }

  function handleDownloadRaw() {
    const ext =
      mode === "code"
        ? content.includes("def ")
          ? "py"
          : content.includes("function")
            ? "ts"
            : "txt"
        : mode === "spreadsheet"
          ? "csv"
          : "md";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "noctis-artifact"}.${ext}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function triggerRevision(instruction: string) {
    if (!instruction.trim() || isRevising) return;
    await onReviseArtifact(instruction.trim());
    setRevisionPrompt("");
  }

  const modeBadge = {
    document: { label: "Document", icon: FileText, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    code: { label: "Code", icon: Code2, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    sermon: { label: "Exposition", icon: BookOpen, color: "text-[#e4b86a] bg-[#e4b86a]/15 border-[#e4b86a]/30" },
    spreadsheet: { label: "Data Model", icon: Table, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    presentation: { label: "Presentation", icon: Presentation, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  }[mode];

  const ModeIcon = modeBadge.icon;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#141414] text-zinc-100 border-l border-white/10 shadow-2xl">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 bg-[#1a1a1a]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              modeBadge.color
            )}
          >
            <ModeIcon className="size-3.5" />
            {modeBadge.label}
          </span>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (titleDraft.trim()) onTitleChange(titleDraft.trim());
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditingTitle(false);
                  if (titleDraft.trim()) onTitleChange(titleDraft.trim());
                } else if (e.key === "Escape") {
                  setTitleDraft(title);
                  setEditingTitle(false);
                }
              }}
              className="h-7 w-48 sm:w-64 rounded-lg bg-black/40 px-2 text-sm font-semibold text-zinc-100 outline-none ring-1 ring-[#e4b86a]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="group flex max-w-[200px] sm:max-w-xs items-center gap-1.5 truncate text-left text-sm font-semibold text-zinc-200 hover:text-white"
              title="Click to rename artifact"
            >
              <span className="truncate">{title || "Noctis Artifact"}</span>
              <Pencil className="size-3 shrink-0 text-zinc-500 group-hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* View Toggles & Actions */}
        <div className="flex items-center gap-1.5">
          {/* View mode switcher */}
          <div className="hidden sm:inline-flex rounded-full bg-black/30 p-0.5 text-xs ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setView("preview")}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition",
                view === "preview" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setView("edit")}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition",
                view === "edit" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setView("split")}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition",
                view === "split" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Split
            </button>
            <button
              type="button"
              onClick={() => setView("diff")}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition flex items-center gap-1",
                view === "diff" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <GitCompare className="size-3" />
              Diff
            </button>
          </div>

          {/* Undo / Redo */}
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Undo edit"
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title="Redo edit"
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <Redo2 className="size-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Canvas"}
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          {/* Close Canvas */}
          <button
            type="button"
            onClick={onClose}
            title="Close Canvas"
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <PanelRightClose className="size-4" />
          </button>
        </div>
      </header>

      {/* Smart Inline Revision Pills (ChatGPT Canvas style) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-[#161616] px-4 py-2 text-xs">
        <button
          type="button"
          onClick={() => setShowReviseTools((o) => !o)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition",
            showReviseTools ? "bg-[#e4b86a] text-[#1a1408]" : "bg-white/10 text-[#e4b86a] hover:bg-white/15"
          )}
        >
          <Sparkles className="size-3.5" />
          Canvas Tools
        </button>

        <button
          type="button"
          disabled={isRevising}
          onClick={() =>
            triggerRevision("Make this artifact punchier, more concise, and highlight the highest-priority conclusions.")
          }
          className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-300 hover:bg-white/15 disabled:opacity-40"
        >
          Make Concise
        </button>

        <button
          type="button"
          disabled={isRevising}
          onClick={() =>
            triggerRevision("Structure this artifact with clean section headings, hierarchical numbering, and executive takeaways.")
          }
          className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-300 hover:bg-white/15 disabled:opacity-40"
        >
          Add Headings
        </button>

        <button
          type="button"
          disabled={isRevising}
          onClick={() =>
            triggerRevision("Convert the quantitative metrics, key findings, and comparison data into clear markdown tables.")
          }
          className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-300 hover:bg-white/15 disabled:opacity-40"
        >
          Convert to Table
        </button>

        <button
          type="button"
          disabled={isRevising}
          onClick={() =>
            triggerRevision(
              mode === "sermon"
                ? "Add Hebrew/Greek lexical notes, canonical cross-references, and explicit hermeneutical context."
                : "Audit all claims and references in this artifact, adding verifiable citations and authoritative footnotes."
            )
          }
          className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-300 hover:bg-white/15 disabled:opacity-40"
        >
          {mode === "sermon" ? "Lexical Notes" : "Audit Citations"}
        </button>

        {mode === "code" ? (
          <button
            type="button"
            disabled={isRevising}
            onClick={() =>
              triggerRevision("Review this code for edge cases, optimize performance, and append complete unit test cases.")
            }
            className="rounded-full bg-amber-500/20 px-2.5 py-1 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40"
          >
            Optimize & Tests
          </button>
        ) : null}

        <div className="ml-auto hidden items-center gap-2 text-[11px] text-zinc-500 sm:flex">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Expanded Canvas Tools Palette */}
      {showReviseTools ? (
        <div className="border-b border-[#e4b86a]/30 bg-[#1c1913] p-3 text-xs">
          <p className="mb-2 font-semibold text-[#e4b86a] uppercase tracking-wider text-[11px]">
            Targeted Tone & Audience Calibration
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "Executive Memo",
                instruction: "Rewrite this in an institutional executive memo format with a 3-bullet executive summary, risk factors, and strategic next steps.",
              },
              {
                label: "Pastoral / Expository",
                instruction: "Rewrite this in a clear expository teaching tone with verbatim scripture anchors, pastoral illustrations, and practical life applications.",
              },
              {
                label: "Technical Deep-Dive",
                instruction: "Rewrite this with deep technical precision, architectural rationale, code/formula rigor, and edge-case mitigations.",
              },
              {
                label: "Main Street Plain-Language",
                instruction: "Explain all technical/financial concepts in plain, accessible language suitable for everyday families and entrepreneurs.",
              },
              {
                label: "Expand Evidence & Footnotes",
                instruction: "Expand all assertions with primary-source footnotes, methodology details, and boundary conditions.",
              },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={isRevising}
                onClick={() => triggerRevision(p.instruction)}
                className="rounded-xl border border-[#e4b86a]/20 bg-[#252016] px-3 py-1.5 text-zinc-200 hover:bg-[#e4b86a]/20 hover:text-white disabled:opacity-40"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Main Workspace Body */}
      <div className="min-h-0 flex-1 overflow-hidden relative">
        {isRevising ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs">
            <div className="flex items-center gap-3 rounded-2xl border border-[#e4b86a]/40 bg-[#1e1e1e] px-5 py-3 shadow-2xl">
              <Sparkles className="size-5 animate-spin text-[#e4b86a]" />
              <span className="text-sm font-semibold text-zinc-100">Noctis Canvas is revising artifact...</span>
            </div>
          </div>
        ) : null}

        {/* Preview View */}
        {view === "preview" ? (
          <div className="h-full overflow-y-auto px-6 py-6 font-sans">
            <article className="mx-auto max-w-4xl space-y-4">
              {renderPreview ? (
                renderPreview(content)
              ) : (
                <div className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-zinc-100">
                  {content}
                </div>
              )}
            </article>
          </div>
        ) : null}

        {/* Edit View */}
        {view === "edit" ? (
          <div className="h-full p-4">
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className={cn(
                "h-full w-full resize-none rounded-2xl border border-white/10 bg-[#111111] p-4 text-[14px] leading-relaxed text-zinc-100 outline-none ring-1 ring-white/5",
                mode === "code" ? "font-mono" : "font-sans"
              )}
              placeholder="Edit your artifact directly in the Canvas..."
            />
          </div>
        ) : null}

        {/* Diff View (Visual Comparison with previous versions) */}
        {view === "diff" ? (
          <div className="h-full overflow-y-auto p-4 space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-sans text-xs">Compare against:</span>
                <select
                  value={selectedCompareVersion}
                  onChange={(e) => setSelectedCompareVersion(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-zinc-100 outline-none"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber}: {v.label} ({v.timestamp})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-semibold">+{diffStats.added} added</span>
                <span className="text-rose-400 font-semibold">-{diffStats.removed} removed</span>
                <span className="text-zinc-500">{diffStats.unchanged} unchanged</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-3 overflow-x-auto space-y-0.5">
              {diffLines.length ? (
                diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-2 px-2 py-0.5 rounded text-[12.5px] leading-relaxed",
                      line.type === "added"
                        ? "bg-emerald-950/40 text-emerald-300"
                        : line.type === "removed"
                        ? "bg-rose-950/40 text-rose-300 line-through opacity-80"
                        : "text-zinc-400"
                    )}
                  >
                    <span className="w-4 shrink-0 text-center font-bold select-none opacity-60">
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap">{line.text || " "}</span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-center py-4">No differences detected.</p>
              )}
            </div>
          </div>
        ) : null}

        {/* Split View (Side-by-side Edit & Preview) */}
        {view === "split" ? (
          <div className="flex h-full w-full">
            <div className="h-full w-1/2 border-r border-white/10 p-3">
              <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                className={cn(
                  "h-full w-full resize-none rounded-2xl border border-white/10 bg-[#111111] p-3 text-[13px] leading-relaxed text-zinc-100 outline-none",
                  mode === "code" ? "font-mono" : "font-sans"
                )}
                placeholder="Edit artifact markdown or code here..."
              />
            </div>
            <div className="h-full w-1/2 overflow-y-auto p-4">
              <article className="space-y-3">
                {renderPreview ? (
                  renderPreview(content)
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-100">
                    {content}
                  </div>
                )}
              </article>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Revision Input & Export Actions */}
      <footer className="shrink-0 border-t border-white/10 bg-[#181818] p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void triggerRevision(revisionPrompt);
          }}
          className="mb-2 flex items-center gap-2"
        >
          <input
            value={revisionPrompt}
            onChange={(e) => setRevisionPrompt(e.target.value)}
            disabled={isRevising}
            placeholder="Tell Noctis how to edit this artifact (e.g. 'Add a section on verse 4', 'Refactor into async')..."
            className="h-9 min-w-0 flex-1 rounded-full border border-white/10 bg-[#242424] px-4 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-[#e4b86a]"
          />
          <button
            type="submit"
            disabled={!revisionPrompt.trim() || isRevising}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#e4b86a] px-3.5 text-xs font-semibold text-[#1a1408] hover:opacity-90 disabled:opacity-40"
          >
            <Sparkles className="size-3.5" />
            Revise
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            {onDownloadDoc ? (
              <button
                type="button"
                onClick={() => onDownloadDoc(title, content)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
              >
                <FileText className="size-3.5" />
                Word (.doc)
              </button>
            ) : null}
            {onPrint ? (
              <button
                type="button"
                onClick={() => onPrint(title, content)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
              >
                <Printer className="size-3.5" />
                Print / PDF
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDownloadRaw}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
            >
              <Download className="size-3.5" />
              Download Raw
            </button>
          </div>

          <span className="text-[11px] text-zinc-500">
            Noctis Split Canvas v1.0 • Instant Co-Editing
          </span>
        </div>
      </footer>
    </div>
  );
}
