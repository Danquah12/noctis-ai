"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Compass,
  ExternalLink,
  FolderGit2,
  MessageSquareText,
  Search,
  Terminal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NOCTIS_API_ROUTES,
  NOCTIS_PANELS,
  NOCTIS_SLASH_ROUTES,
  type NoctisPanelId,
} from "@/lib/noctis-capability-registry";

interface RecentForgeProjectItem {
  id: string;
  name: string;
  category: string;
  status: string;
  currentRevision: number;
  deepLink: string;
  previewUrl: string;
}

interface RecentRoutedResponseItem {
  id: string;
  routeId: string;
  routeLabel: string;
  targetPanel: NoctisPanelId;
  prompt: string;
  summary: string;
  createdAt: string;
  deepLink: string;
  retrievalUrl: string;
}

interface RouteHealthEntry {
  id: string;
  ok: boolean;
  latencyMs: number;
  detail: string;
}

interface RouteHealthSummary {
  checkedAt: string;
  overallStatus: "healthy" | "degraded";
  dbSource: string;
  sandboxReady: boolean;
  totalOk: number;
  totalRoutes: number;
  routes: RouteHealthEntry[];
}

interface NoctisCommandPaletteProps {
  open: boolean;
  activePanel: NoctisPanelId;
  onClose: () => void;
  onSelectPanel: (panel: NoctisPanelId) => void;
  onOpenProject: (projectId: string) => void;
  onOpenResponse?: (responseId: string) => void;
  onPrefillCommand: (prefix: string) => void;
}

type PaletteEntry =
  | { kind: "panel"; key: string; panelId: NoctisPanelId; title: string; subtitle: string; badge: string; healthOk?: boolean }
  | { kind: "project"; key: string; project: RecentForgeProjectItem; title: string; subtitle: string; badge: string }
  | { kind: "response"; key: string; response: RecentRoutedResponseItem; title: string; subtitle: string; badge: string }
  | { kind: "command"; key: string; command: string; title: string; subtitle: string; badge: string };

export function NoctisCommandPalette({
  open,
  activePanel,
  onClose,
  onSelectPanel,
  onOpenProject,
  onOpenResponse,
  onPrefillCommand,
}: NoctisCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [recentProjects, setRecentProjects] = useState<RecentForgeProjectItem[]>([]);
  const [recentResponses, setRecentResponses] = useState<RecentRoutedResponseItem[]>([]);
  const [health, setHealth] = useState<RouteHealthSummary | null>(null);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 20);

    let cancelled = false;
    setLoadingDirectory(true);
    fetch("/api/v2/forge/platform-routes?health=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.recentProjects)) setRecentProjects(data.recentProjects);
        if (Array.isArray(data.recentResponses)) setRecentResponses(data.recentResponses);
        if (data.health) setHealth(data.health);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingDirectory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const panelHealthMap = useMemo(() => {
    const map = new Map<NoctisPanelId, boolean>();
    if (!health?.routes?.length) return map;
    const statusById = new Map(health.routes.map((r) => [r.id, r.ok]));
    for (const api of NOCTIS_API_ROUTES) {
      const ok = statusById.get(api.id);
      if (typeof ok === "boolean") {
        const prev = map.get(api.panelId);
        map.set(api.panelId, prev === undefined ? ok : prev && ok);
      }
    }
    return map;
  }, [health]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteEntry[] = [];

    for (const panel of NOCTIS_PANELS) {
      const hay = `${panel.label} ${panel.group} ${panel.description} ${panel.deepLink} ${panel.keywords.join(" ")} ${panel.slashCommand || ""}`.toLowerCase();
      if (!q || hay.includes(q)) {
        list.push({
          kind: "panel",
          key: `panel:${panel.id}`,
          panelId: panel.id,
          title: panel.label,
          subtitle: panel.description,
          badge: panel.group,
          healthOk: panelHealthMap.get(panel.id),
        });
      }
    }

    for (const resp of recentResponses) {
      const hay = `${resp.id} ${resp.prompt} ${resp.summary} ${resp.routeLabel} ${resp.routeId}`.toLowerCase();
      if (!q || hay.includes(q)) {
        list.push({
          kind: "response",
          key: `resp:${resp.id}`,
          response: resp,
          title: resp.prompt.slice(0, 72) || resp.id,
          subtitle: `${resp.routeLabel} · ${resp.summary}`,
          badge: resp.id,
        });
      }
    }

    for (const proj of recentProjects) {
      const hay = `${proj.name} ${proj.id} ${proj.category} ${proj.status} ${proj.deepLink}`.toLowerCase();
      if (!q || hay.includes(q)) {
        list.push({
          kind: "project",
          key: `project:${proj.id}`,
          project: proj,
          title: proj.name,
          subtitle: `${proj.category} · Rev #${proj.currentRevision} · ${proj.status}`,
          badge: proj.id,
        });
      }
    }

    for (const cmd of NOCTIS_SLASH_ROUTES) {
      const hay = `${cmd.command} ${cmd.aliases.join(" ")} ${cmd.label} ${cmd.description}`.toLowerCase();
      if (!q || hay.includes(q)) {
        list.push({
          kind: "command",
          key: `cmd:${cmd.command}`,
          command: cmd.command,
          title: `${cmd.command} — ${cmd.label}`,
          subtitle: cmd.description,
          badge: "Slash Route",
        });
      }
    }

    return list.slice(0, 32);
  }, [query, recentProjects, recentResponses, panelHealthMap]);

  useEffect(() => {
    if (activeIndex >= entries.length) {
      setActiveIndex(0);
    }
  }, [entries.length, activeIndex]);

  function triggerEntry(entry: PaletteEntry) {
    if (entry.kind === "panel") {
      onSelectPanel(entry.panelId);
      onClose();
      return;
    }
    if (entry.kind === "response") {
      if (onOpenResponse) {
        onOpenResponse(entry.response.id);
      }
      onClose();
      return;
    }
    if (entry.kind === "project") {
      onOpenProject(entry.project.id);
      onClose();
      return;
    }
    onPrefillCommand(`${entry.command} `);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Noctis Quick Switcher and Route Directory"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#e4b86a]/35 bg-[#0d1017]/95 text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => (entries.length ? (prev + 1) % entries.length : 0));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (entries.length ? (prev - 1 + entries.length) % entries.length : 0));
          } else if (e.key === "Enter" && entries[activeIndex]) {
            e.preventDefault();
            triggerEntry(entries[activeIndex]!);
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
          <Search className="size-4 text-[#e4b86a] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to any console, saved Forge app (FRG-...), recent reply (RSP-...), or /command..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick switcher"
            className="grid size-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2 space-y-1 noctis-thin-scroll">
          {entries.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-zinc-400">
              No consoles, saved replies, apps, or slash commands matched &ldquo;{query}&rdquo;.
            </div>
          ) : (
            entries.map((entry, idx) => {
              const isSelected = idx === activeIndex;
              const isCurrentPanel = entry.kind === "panel" && entry.panelId === activePanel;
              return (
                <div
                  key={entry.key}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => triggerEntry(entry)}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left transition cursor-pointer",
                    isSelected
                      ? "bg-[#e4b86a]/15 border border-[#e4b86a]/35 text-white"
                      : "border border-transparent hover:bg-white/[0.04] text-zinc-200",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-xl border",
                        entry.kind === "panel"
                          ? "border-sky-500/25 bg-sky-500/10 text-sky-300"
                          : entry.kind === "response"
                            ? "border-violet-500/25 bg-violet-500/10 text-violet-300"
                            : entry.kind === "project"
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                              : "border-amber-500/25 bg-amber-500/10 text-[#e4b86a]",
                      )}
                    >
                      {entry.kind === "panel" ? (
                        <Compass className="size-4" />
                      ) : entry.kind === "response" ? (
                        <MessageSquareText className="size-4" />
                      ) : entry.kind === "project" ? (
                        <FolderGit2 className="size-4" />
                      ) : (
                        <Terminal className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {entry.kind === "panel" && typeof entry.healthOk === "boolean" ? (
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              entry.healthOk ? "bg-emerald-400" : "bg-amber-400",
                            )}
                            title={entry.healthOk ? "Route API healthy" : "Route degraded"}
                          />
                        ) : null}
                        <span className="truncate text-xs font-semibold">{entry.title}</span>
                        {isCurrentPanel ? (
                          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[11px] text-zinc-400">{entry.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {entry.kind === "project" ? (
                      <a
                        href={entry.project.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:border-emerald-400/50 hover:text-emerald-200"
                      >
                        <span>Preview</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                    <span className="hidden sm:inline rounded-md border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                      {entry.badge}
                    </span>
                    <ArrowRight className={cn("size-3.5 transition", isSelected ? "text-[#e4b86a]" : "text-zinc-600")} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-4 py-2.5 text-[10px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>Esc Close</span>
          </div>
          <div className="flex items-center gap-2">
            {health ? (
              <span className={cn("inline-flex items-center gap-1 font-medium", health.overallStatus === "healthy" ? "text-emerald-300" : "text-amber-300")}>
                <span className={cn("size-1.5 rounded-full", health.overallStatus === "healthy" ? "bg-emerald-400" : "bg-amber-400")} />
                {health.totalOk}/{health.totalRoutes} Routes Healthy
              </span>
            ) : null}
            <span>
              {loadingDirectory
                ? "Checking routes..."
                : `${NOCTIS_PANELS.length} Consoles · ${recentProjects.length} Apps · ${recentResponses.length} Recent Replies`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
