"use client";

import { useMemo } from "react";
import { Plus, ArrowRight, Sparkles, Layers } from "lucide-react";
import {
  getPluginsForShelf,
  type PluginShelfKey,
  type DistributedPluginItem,
} from "@/lib/noctis-distributed-plugins";
import { cn } from "@/lib/utils";

interface NoctisShelfPluginSectionProps {
  shelfKey: PluginShelfKey;
  title?: string;
  subtitle?: string;
  onUsePlugin: (plugin: DistributedPluginItem) => void;
  onOpenAllPlugins?: () => void;
  className?: string;
  compact?: boolean;
}

const SHELF_LABELS: Record<PluginShelfKey, { title: string; subtitle: string }> = {
  pictures: {
    title: "Creative & Visual Plugins",
    subtitle: "Design, video generation, vector UI & creative studio tools",
  },
  library: {
    title: "Knowledge, Academic & Reference Plugins",
    subtitle: "Peer-reviewed science, literature citations, scripture & learning roadmap",
  },
  tools: {
    title: "Dev & Security Plugins",
    subtitle: "SAST 710, threat modeling, vulnerability scanners & cloud developer tools",
  },
  more: {
    title: "Business, Operations & Finance Plugins",
    subtitle: "Email, team chat, CRM, accounting, market data, and productivity connectors",
  },
  search: {
    title: "Search & Research Plugins",
    subtitle: "Deep scientific research, web intelligence, SEO & telemetry analytics",
  },
  read: {
    title: "Reading & Document Plugins",
    subtitle: "Cloud drive documents, notes, enterprise wikis & task databases",
  },
  see: {
    title: "Vision & UI Inspection Plugins",
    subtitle: "Visual layout inspection, design tokens, CAD & remote control",
  },
  watch: {
    title: "Video & Media Plugins",
    subtitle: "Video optimization, algorithm signals, audio streams & media systems",
  },
  agent: {
    title: "Autonomous Agent Engines",
    subtitle: "Autonomous multi-step execution, diagnostic clinical reasoning & financial valuation",
  },
};

export function NoctisShelfPluginSection({
  shelfKey,
  title,
  subtitle,
  onUsePlugin,
  onOpenAllPlugins,
  className,
  compact = false,
}: NoctisShelfPluginSectionProps) {
  const plugins = useMemo(() => getPluginsForShelf(shelfKey), [shelfKey]);
  const defaultMeta = SHELF_LABELS[shelfKey] || {
    title: "Integrated Plugins",
    subtitle: "Select a tool to connect directly into your active conversation",
  };

  if (plugins.length === 0) return null;

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <Sparkles className="size-3.5 text-[#e4b86a]" />
            <span>{title || defaultMeta.title}</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-bold text-zinc-400">
              {plugins.length}
            </span>
          </h2>
          {!compact && (
            <p className="mt-0.5 text-xs text-zinc-400">{subtitle || defaultMeta.subtitle}</p>
          )}
        </div>
        {onOpenAllPlugins && (
          <button
            type="button"
            onClick={onOpenAllPlugins}
            className="group inline-flex items-center gap-1 text-[11px] font-medium text-[#e4b86a] hover:text-[#fde68a] transition"
          >
            <span>All plugins</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      <div
        className={cn(
          "grid gap-2",
          compact
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            onClick={() => onUsePlugin(plugin)}
            className="group relative flex cursor-pointer items-start justify-between rounded-xl border border-white/10 bg-[#1e1e1e]/80 p-3 hover:border-[#e4b86a]/40 hover:bg-[#252525] transition shadow-xs touch-manipulation"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <div
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg font-bold text-xs ring-1 ring-white/10 transition-transform group-hover:scale-105",
                  plugin.iconBg || "bg-white/10",
                  plugin.iconColor || "text-zinc-200"
                )}
              >
                {plugin.iconText || plugin.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-xs font-semibold text-zinc-100 group-hover:text-[#e4b86a] transition">
                    {plugin.name}
                  </h3>
                  {plugin.badge && (
                    <span className="shrink-0 rounded-full bg-[#e4b86a]/20 px-1.5 py-0.2 text-[9px] font-semibold text-[#e4b86a]">
                      {plugin.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400 group-hover:text-zinc-300">
                  {plugin.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUsePlugin(plugin);
              }}
              title={`Use ${plugin.name} in chat`}
              className="ml-2 shrink-0 grid size-6 place-items-center rounded-md border border-white/10 bg-white/5 text-zinc-400 hover:border-[#e4b86a] hover:bg-[#e4b86a] hover:text-black transition"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
