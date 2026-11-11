import React, { useState, useEffect } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Flame, ExternalLink, ShieldAlert, Sparkles, Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveCveEntry {
  cveId: string;
  vendor: string;
  product: string;
  addedDate: string;
  epssPercentile: number;
  ransomware: boolean;
  action: string;
}

const DEFAULT_KEV_TICKER: LiveCveEntry[] = [
  {
    cveId: "CVE-2024-3400",
    vendor: "Palo Alto Networks",
    product: "PAN-OS GlobalProtect",
    addedDate: "2024-04-12",
    epssPercentile: 97.6,
    ransomware: true,
    action: "Apply vendor hotfixes or disable telemetry immediately.",
  },
  {
    cveId: "CVE-2024-21762",
    vendor: "Fortinet",
    product: "FortiOS sslvpnd",
    addedDate: "2024-02-09",
    epssPercentile: 98.2,
    ransomware: true,
    action: "Disable SSL-VPN web portal or upgrade firmware release.",
  },
  {
    cveId: "CVE-2023-46805",
    vendor: "Ivanti",
    product: "Connect Secure",
    addedDate: "2024-01-10",
    epssPercentile: 96.4,
    ransomware: true,
    action: "Apply mitigation XML and run external ICT integrity checker.",
  },
  {
    cveId: "CVE-2023-38606",
    vendor: "Apple",
    product: "iOS & macOS Kernel",
    addedDate: "2023-07-26",
    epssPercentile: 91.5,
    ransomware: false,
    action: "Apply security updates to prevent kernel state modification.",
  },
  {
    cveId: "CVE-2023-2868",
    vendor: "Barracuda Networks",
    product: "Email Security Gateway",
    addedDate: "2023-05-26",
    epssPercentile: 99.1,
    ransomware: true,
    action: "Replace compromised hardware appliances per vendor directive.",
  },
];

export interface NoctisLiveCveTickerProps {
  onSelectCve?: (cveId: string, prompt: string) => void;
  className?: string;
  centerSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export default function NoctisLiveCveTicker({ onSelectCve, className, centerSlot, rightSlot }: NoctisLiveCveTickerProps) {
  const [entries] = useState<LiveCveEntry[]>(DEFAULT_KEV_TICKER);
  const [activeIdx, setActiveIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("All");
  const [manualCve, setManualCve] = useState<string>("");

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = manualCve.trim();
    let targetCve = raw;
    if (!targetCve) {
      targetCve = entries[activeIdx]?.cveId || "CVE-2024-3400";
    } else {
      targetCve = targetCve.toUpperCase().replace(/\s+/g, "-");
      if (!targetCve.startsWith("CVE-")) {
        if (/^\d{4}-\d{4,8}$/.test(targetCve)) {
          targetCve = `CVE-${targetCve}`;
        } else if (/^CVE\d{4}/.test(targetCve)) {
          targetCve = targetCve.replace(/^CVE/, "CVE-");
        }
      }
    }

    if (onSelectCve) {
      onSelectCve(
        targetCve,
        `Assess active weaponization, CVSS exploitability, attack vectors, EPSS score, and CISA KEV remediation playbook for ${targetCve}.`
      );
    }
    setManualCve("");
    setExpanded(false);
  };

  // Cycle ticker every 6 seconds if not expanded
  useEffect(() => {
    if (expanded) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % entries.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [expanded, entries.length]);

  const current = entries[activeIdx] || entries[0];
  const vendors = ["All", ...Array.from(new Set(entries.map((e) => e.vendor)))];
  const filteredEntries =
    selectedVendorFilter === "All"
      ? entries
      : entries.filter((e) => e.vendor === selectedVendorFilter);

  return (
    <div
      className={cn(
        "relative z-20 border-b border-white/10 bg-[#0e1017] text-zinc-100 transition-all duration-300",
        expanded ? "shadow-2xl" : "h-9",
        className
      )}
    >
      {/* Collapsed Strip */}
      <div className="flex h-10 items-center justify-between px-3 sm:px-4 text-xs font-mono gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {/* Live Pulse Indicator */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[11px] font-sans font-bold text-rose-300 hover:bg-rose-500/30 transition cursor-pointer"
            title="Click to toggle Attack Surface Radar drawer"
          >
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="hidden sm:inline">LIVE KEV RADAR</span>
            <span className="sm:hidden">KEV</span>
          </button>

          {/* Active Ticker Item */}
          <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
            <button
              type="button"
              onClick={() =>
                onSelectCve?.(
                  current.cveId,
                  `Assess active weaponization, CVSS exploitability, and CISA KEV remediation for ${current.cveId} (${current.vendor} ${current.product}).`
                )
              }
              className="group flex min-w-0 items-center gap-2 truncate text-left hover:text-white transition cursor-pointer"
            >
              <span className="font-bold text-[#e4b86a] underline underline-offset-2 shrink-0">
                {current.cveId}
              </span>
              <span className="truncate text-zinc-400 group-hover:text-zinc-200">
                {current.vendor} <span className="text-zinc-500">({current.product})</span>
              </span>
              {current.ransomware ? (
                <span className="hidden md:inline-flex items-center gap-1 rounded bg-rose-950/80 border border-rose-500/40 px-1.5 py-0.2 text-[10px] text-rose-300 font-sans font-semibold shrink-0">
                  <Flame className="size-2.5 text-rose-400" />
                  RANSOMWARE
                </span>
              ) : null}
              <span className="hidden xl:inline text-[11px] text-amber-300/80 shrink-0">
                EPSS: {current.epssPercentile}%
              </span>
            </button>
          </div>
        </div>

        {/* Center Slot (e.g. Cryptographic Proof & SQDEC badge) */}
        {centerSlot ? (
          <div className="hidden lg:flex items-center shrink-0 px-2">
            {centerSlot}
          </div>
        ) : null}

        {/* Controls: Manual Input + Investigate Button + Drawer Toggle + Right Slot */}
        <div className="flex items-center gap-2 shrink-0 pl-1">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2 size-3 text-zinc-500" />
              <input
                type="text"
                value={manualCve}
                onChange={(e) => setManualCve(e.target.value)}
                placeholder="CVE-YYYY-NNNN"
                className="h-6 w-24 sm:w-32 md:w-40 rounded-full border border-white/15 bg-white/5 pl-6 pr-2 text-[11px] font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:bg-[#121622] focus:outline-none transition uppercase"
                title="Enter any CVE value and press Enter or click Investigate"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-6 items-center gap-1 rounded-full bg-[#e4b86a] hover:bg-[#d4a85a] text-[#1a1408] px-2 sm:px-2.5 text-[11px] font-sans font-bold shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Investigate this CVE (or press Enter)"
            >
              <span>Investigate</span>
              <ArrowRight className="size-3" />
            </button>
          </form>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="grid size-6 place-items-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            aria-label={expanded ? "Collapse radar drawer" : "Expand radar drawer"}
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          {rightSlot ? (
            <div className="flex items-center shrink-0">
              {rightSlot}
            </div>
          ) : null}
        </div>
      </div>

      {/* Expanded Multi-CVE Radar Drawer */}
      {expanded ? (
        <div className="border-t border-white/10 bg-[#0a0c12] p-4 text-xs font-sans animate-in slide-in-from-top-2 duration-200">
          {/* Prominent Manual CVE Investigation Banner */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-[#e4b86a]" />
              <div>
                <span className="font-semibold text-xs text-zinc-200">Manual CVE Deep Investigation</span>
                <p className="text-[11px] text-zinc-400">Enter any CVE identifier from NVD / CISA KEV to simulate weaponization and remediation</p>
              </div>
            </div>
            <form onSubmit={handleManualSubmit} className="flex flex-1 items-center gap-2 min-w-[280px] max-w-md">
              <input
                type="text"
                value={manualCve}
                onChange={(e) => setManualCve(e.target.value)}
                placeholder="e.g. CVE-2024-3400, CVE-2023-46805, CVE-2021-44228"
                className="h-8 flex-1 rounded-lg border border-white/15 bg-black/60 px-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-[#e4b86a] focus:outline-none uppercase"
              />
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e4b86a] hover:bg-[#d4a85a] px-3.5 text-xs font-bold text-[#1a1408] transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="size-3.5" />
                <span>Investigate CVE</span>
              </button>
            </form>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-400" />
              <span className="font-bold text-sm text-zinc-100">
                Live Attack Surface & CISA KEV Radar
              </span>
              <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                Active In-The-Wild Exploitation
              </span>
            </div>

            {/* Vendor Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-zinc-400 mr-1">Vendor:</span>
              {vendors.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVendorFilter(v)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition",
                    selectedVendorFilter === v
                      ? "bg-[#e4b86a] text-[#1a1408] font-semibold"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {filteredEntries.map((e) => (
              <div
                key={e.cveId}
                className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-[#e4b86a]/40 p-3 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-[#e4b86a] text-xs">
                      {e.cveId}
                    </span>
                    <span className="rounded bg-rose-950/70 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                      EPSS {e.epssPercentile}%
                    </span>
                  </div>
                  <h4 className="font-semibold text-zinc-200 text-xs truncate">
                    {e.vendor} — {e.product}
                  </h4>
                  <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {e.action}
                  </p>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Added: {e.addedDate}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(false);
                      onSelectCve?.(
                        e.cveId,
                        `Assess active weaponization, CVSS exploitability, and CISA KEV remediation for ${e.cveId} (${e.vendor} ${e.product}).`
                      );
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#e4b86a] hover:underline"
                  >
                    <Sparkles className="size-3" />
                    Deep Audit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
