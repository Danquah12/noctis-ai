import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Flame,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import type {
  CveFeedSourceId,
  CveStreamSnapshot,
  SourceHealthStatus,
  StreamedCveItem,
} from "@/lib/noctis-cve-stream.server";
import { cn } from "@/lib/utils";

export type LiveCveEntry = StreamedCveItem;

const ACK_STORAGE_KEY = "noctis_ack_zerodays_v1";

const FALLBACK_ENTRIES: StreamedCveItem[] = [
  {
    id: "CVE-2024-3400",
    cveId: "CVE-2024-3400",
    title: "PAN-OS GlobalProtect Command Injection",
    vendor: "Palo Alto Networks",
    product: "PAN-OS GlobalProtect",
    description:
      "Unauthenticated OS command injection in the GlobalProtect feature of Palo Alto Networks PAN-OS allowing arbitrary code execution with root privileges.",
    publishedDate: "2024-04-12",
    cvssScore: 10.0,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
    severity: "CRITICAL",
    epssPercentile: 97.6,
    cwe: "CWE-77",
    ransomware: true,
    requiredAction: "Apply vendor hotfixes or disable GlobalProtect device telemetry immediately.",
    dueDate: null,
    isZeroDay: false,
    zeroDayReason: null,
    searchsploitCmd: "searchsploit --cve CVE-2024-3400",
    matchedFeeds: ["NVD", "CISA_KEV"],
    sources: [
      { id: "NVD", label: "NIST NVD", url: "https://nvd.nist.gov/vuln/detail/CVE-2024-3400", matchedInFeed: true },
      { id: "EXPLOITDB", label: "Exploit-DB", url: "https://www.exploit-db.com/search?cve=CVE-2024-3400", matchedInFeed: false },
      { id: "METASPLOIT", label: "Metasploit", url: "https://github.com/rapid7/metasploit-framework/search?q=CVE-2024-3400", matchedInFeed: false },
      { id: "SEARCHSPLOIT", label: "SearchSploit", url: "https://gitlab.com/exploit-database/exploitdb/-/search?search=CVE-2024-3400", matchedInFeed: false },
      { id: "CISA_KEV", label: "CISA KEV", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=CVE-2024-3400", matchedInFeed: true },
    ],
  },
  {
    id: "CVE-2024-21762",
    cveId: "CVE-2024-21762",
    title: "FortiOS SSL-VPN Out-of-Bounds Write",
    vendor: "Fortinet",
    product: "FortiOS sslvpnd",
    description:
      "Out-of-bounds write vulnerability in Fortinet FortiOS SSL-VPN daemon allowing a remote unauthenticated attacker to execute arbitrary code via specially crafted HTTP requests.",
    publishedDate: "2024-02-09",
    cvssScore: 9.8,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    severity: "CRITICAL",
    epssPercentile: 98.2,
    cwe: "CWE-787",
    ransomware: true,
    requiredAction: "Disable SSL-VPN web portal or upgrade FortiOS firmware release immediately.",
    dueDate: null,
    isZeroDay: false,
    zeroDayReason: null,
    searchsploitCmd: "searchsploit --cve CVE-2024-21762",
    matchedFeeds: ["NVD", "CISA_KEV"],
    sources: [
      { id: "NVD", label: "NIST NVD", url: "https://nvd.nist.gov/vuln/detail/CVE-2024-21762", matchedInFeed: true },
      { id: "EXPLOITDB", label: "Exploit-DB", url: "https://www.exploit-db.com/search?cve=CVE-2024-21762", matchedInFeed: false },
      { id: "METASPLOIT", label: "Metasploit", url: "https://github.com/rapid7/metasploit-framework/search?q=CVE-2024-21762", matchedInFeed: false },
      { id: "SEARCHSPLOIT", label: "SearchSploit", url: "https://gitlab.com/exploit-database/exploitdb/-/search?search=CVE-2024-21762", matchedInFeed: false },
      { id: "CISA_KEV", label: "CISA KEV", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=CVE-2024-21762", matchedInFeed: true },
    ],
  },
];

const SOURCE_SHORT_BADGE: Record<CveFeedSourceId, { code: string; label: string }> = {
  NVD: { code: "NVD", label: "NIST NVD" },
  EXPLOITDB: { code: "EDB", label: "ExploitDB" },
  METASPLOIT: { code: "MSF", label: "Metasploit" },
  SEARCHSPLOIT: { code: "SS", label: "SearchSploit" },
  CISA_KEV: { code: "KEV", label: "CISA KEV" },
};

export interface NoctisLiveCveTickerProps {
  onSelectCve?: (cveId: string, prompt: string) => void;
  className?: string;
  centerSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

function readAckSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(ACK_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeAckSet(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ACK_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage quota / privacy mode restrictions
  }
}

export default function NoctisLiveCveTicker({
  onSelectCve,
  className,
  centerSlot,
  rightSlot,
}: NoctisLiveCveTickerProps) {
  const [entries, setEntries] = useState<StreamedCveItem[]>(FALLBACK_ENTRIES);
  const [zeroDays, setZeroDays] = useState<StreamedCveItem[]>([]);
  const [sourceHealth, setSourceHealth] = useState<SourceHealthStatus[]>([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [activeIdx, setActiveIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("ALL");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("All");
  const [manualCve, setManualCve] = useState<string>("");

  const [inspectedCve, setInspectedCve] = useState<StreamedCveItem | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [zeroDayPopupOpen, setZeroDayPopupOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const ackedIdsRef = useRef<Set<string> | null>(null);

  const applySnapshot = useCallback((snap: CveStreamSnapshot) => {
    if (!snap || !Array.isArray(snap.items) || snap.items.length === 0) return;
    setEntries(snap.items);
    setSourceHealth(Array.isArray(snap.sourceHealth) ? snap.sourceHealth : []);

    const zdList = Array.isArray(snap.zeroDays) ? snap.zeroDays : snap.items.filter((i) => i.isZeroDay);
    setZeroDays(zdList);

    if (zdList.length > 0) {
      if (!ackedIdsRef.current) {
        ackedIdsRef.current = readAckSet();
      }
      const hasUnacked = zdList.some((z) => !ackedIdsRef.current!.has(z.id));
      if (hasUnacked) {
        setZeroDayPopupOpen(true);
      }
    }
  }, []);

  const fetchSnapshotOnce = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) setRefreshing(true);
      try {
        const res = await fetch(forceRefresh ? "/api/cve-stream?refresh=1" : "/api/cve-stream");
        if (res.ok) {
          const snap = (await res.json()) as CveStreamSnapshot;
          applySnapshot(snap);
        }
      } catch {
        // Keep current stream state cleanly
      } finally {
        if (forceRefresh) setRefreshing(false);
      }
    },
    [applySnapshot],
  );

  // Live SSE Multi-Source CVE Stream + Fallback Poll
  useEffect(() => {
    let active = true;
    void fetchSnapshotOnce(false);

    let es: EventSource | null = null;
    if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
      es = new EventSource("/api/cve-stream?stream=1");
      es.onopen = () => {
        if (active) setStreamConnected(true);
      };
      es.addEventListener("snapshot", (ev) => {
        if (!active) return;
        setStreamConnected(true);
        try {
          applySnapshot(JSON.parse((ev as MessageEvent).data) as CveStreamSnapshot);
        } catch {
          // Ignore malformed event
        }
      });
      es.addEventListener("zeroday", (ev) => {
        if (!active) return;
        try {
          const payload = JSON.parse((ev as MessageEvent).data) as { zeroDays?: StreamedCveItem[] };
          if (Array.isArray(payload.zeroDays) && payload.zeroDays.length > 0) {
            setZeroDays(payload.zeroDays);
            if (!ackedIdsRef.current) ackedIdsRef.current = readAckSet();
            if (payload.zeroDays.some((z) => !ackedIdsRef.current!.has(z.id))) {
              setZeroDayPopupOpen(true);
            }
          }
        } catch {
          // Ignore malformed zeroday event
        }
      });
      es.onerror = () => {
        if (active) setStreamConnected(false);
      };
    }

    const pollTimer = setInterval(() => {
      void fetchSnapshotOnce(false);
    }, 90_000);

    return () => {
      active = false;
      clearInterval(pollTimer);
      es?.close();
    };
  }, [applySnapshot, fetchSnapshotOnce]);

  // Cycle highlighted CVE every 6 seconds when interactive drawers/modals are closed
  useEffect(() => {
    if (expanded || hoverPaused || inspectedCve || zeroDayPopupOpen || entries.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % entries.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [expanded, hoverPaused, inspectedCve, zeroDayPopupOpen, entries.length]);

  const safeIdx = entries.length > 0 ? activeIdx % entries.length : 0;
  const current = entries[safeIdx] || entries[0];

  const hasActiveZeroDay = zeroDays.length > 0;
  const highlightRed = hasActiveZeroDay || Boolean(current?.isZeroDay);

  const vendors = useMemo(
    () => ["All", ...Array.from(new Set(entries.map((e) => e.vendor).filter(Boolean))).slice(0, 12)],
    [entries],
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedSourceFilter === "ZERODAY" && !e.isZeroDay) return false;
      if (
        selectedSourceFilter !== "ALL" &&
        selectedSourceFilter !== "ZERODAY" &&
        !e.matchedFeeds.includes(selectedSourceFilter as CveFeedSourceId)
      ) {
        return false;
      }
      if (selectedVendorFilter !== "All" && e.vendor !== selectedVendorFilter) return false;
      return true;
    });
  }, [entries, selectedSourceFilter, selectedVendorFilter]);

  const openInspector = useCallback(async (seedItem: StreamedCveItem) => {
    setInspectedCve(seedItem);
    setCopiedCmd(false);
    if (!seedItem.cveId) return;

    setInspectLoading(true);
    try {
      const res = await fetch(`/api/cve-stream?cve=${encodeURIComponent(seedItem.cveId)}`);
      if (res.ok) {
        const enriched = (await res.json()) as StreamedCveItem;
        setInspectedCve(enriched);
      }
    } catch {
      // Keep seed metadata visible cleanly
    } finally {
      setInspectLoading(false);
    }
  }, []);

  const acknowledgeZeroDays = useCallback(() => {
    const nextAck = ackedIdsRef.current ? new Set(ackedIdsRef.current) : readAckSet();
    for (const z of zeroDays) {
      nextAck.add(z.id);
    }
    ackedIdsRef.current = nextAck;
    writeAckSet(nextAck);
    setZeroDayPopupOpen(false);
  }, [zeroDays]);

  const sendToChat = useCallback(
    (item: StreamedCveItem) => {
      const targetId = item.cveId || item.title;
      setExpanded(false);
      setInspectedCve(null);
      acknowledgeZeroDays();
      onSelectCve?.(
        targetId,
        `Assess active weaponization, CVSS exploitability, NVD/ExploitDB/Metasploit/SearchSploit attack surface, EPSS risk, and remediation playbook for ${targetId} (${item.vendor} ${item.product}).`,
      );
    },
    [acknowledgeZeroDays, onSelectCve],
  );

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = manualCve.trim();
    let targetCve = raw;
    if (!targetCve) {
      if (current) void openInspector(current);
      return;
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

    const existing = entries.find((item) => item.cveId === targetCve || item.id === targetCve);
    setManualCve("");
    setExpanded(false);
    if (existing) {
      void openInspector(existing);
    } else {
      void openInspector({
        id: targetCve,
        cveId: targetCve,
        title: `Inspecting ${targetCve}...`,
        vendor: "NVD / MITRE Lookup",
        product: "Resolving live telemetry",
        description: `Querying NIST NVD, MITRE CVE, ExploitDB, Metasploit, and SearchSploit for ${targetCve}...`,
        publishedDate: new Date().toISOString().slice(0, 10),
        cvssScore: null,
        cvssVector: null,
        severity: "UNKNOWN",
        epssPercentile: null,
        cwe: null,
        ransomware: false,
        requiredAction: "Loading advisory...",
        dueDate: null,
        isZeroDay: false,
        zeroDayReason: null,
        searchsploitCmd: `searchsploit --cve ${targetCve}`,
        matchedFeeds: ["NVD"],
        sources: [
          { id: "NVD", label: "NIST NVD", url: `https://nvd.nist.gov/vuln/detail/${targetCve}`, matchedInFeed: true },
          { id: "EXPLOITDB", label: "Exploit-DB", url: `https://www.exploit-db.com/search?cve=${targetCve}`, matchedInFeed: false },
          { id: "METASPLOIT", label: "Metasploit", url: `https://github.com/rapid7/metasploit-framework/search?q=${targetCve}`, matchedInFeed: false },
          { id: "SEARCHSPLOIT", label: "SearchSploit", url: `https://gitlab.com/exploit-database/exploitdb/-/search?search=${targetCve}`, matchedInFeed: false },
        ],
      });
    }
  };

  const handleCopyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <>
      <div
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        className={cn(
          "relative z-20 border-b text-zinc-100 transition-colors duration-300 min-w-0",
          highlightRed
            ? "border-red-500/75 bg-gradient-to-r from-[#3a0811] via-[#24060c] to-[#11080f] shadow-[0_2px_16px_rgba(239,68,68,0.28)]"
            : "border-white/10 bg-[#0e1017]",
          expanded ? "shadow-2xl" : "h-9 overflow-hidden",
          className,
        )}
      >
        {/* Top Highlighted CVE Stream Ribbon */}
        <div className="flex h-9 min-w-0 items-center justify-between overflow-x-auto no-scrollbar px-3 sm:px-4 text-xs font-mono gap-2">
          <div className="flex min-w-[205px] flex-1 items-center gap-2 overflow-hidden">
            {/* Live Stream / Zero-Day Status Pill */}
            <button
              type="button"
              onClick={() => {
                if (hasActiveZeroDay) {
                  setZeroDayPopupOpen(true);
                } else {
                  setExpanded((v) => !v);
                }
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-sans font-bold transition cursor-pointer",
                highlightRed
                  ? "bg-red-600/35 border-red-400 text-red-100 hover:bg-red-600/50 shadow-[0_0_10px_rgba(239,68,68,0.45)]"
                  : "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30",
              )}
              title={
                hasActiveZeroDay
                  ? `${zeroDays.length} active Zero-Day CVE alert(s) announced — click to open Zero-Day bulletin`
                  : "Live stream from NVD, ExploitDB, Metasploit & SearchSploit — click to expand radar"
              }
            >
              <span
                className={cn(
                  "size-2 rounded-full animate-pulse",
                  highlightRed ? "bg-red-400" : streamConnected ? "bg-emerald-400" : "bg-rose-500",
                )}
              />
              {highlightRed ? (
                <span>ZERO-DAY{zeroDays.length > 0 ? ` (${zeroDays.length})` : ""}</span>
              ) : (
                <>
                  <span className="hidden xl:inline">LIVE CVE STREAM</span>
                  <span className="xl:hidden">LIVE CVE</span>
                </>
              )}
            </button>

            {/* Clickable Highlighted CVE Entry (opens detailed inspector on click) */}
            {current ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
                <button
                  type="button"
                  onClick={() => void openInspector(current)}
                  className="group flex min-w-0 items-center gap-2 truncate text-left transition cursor-pointer"
                  title="Click to inspect full CVE details, NVD, ExploitDB, Metasploit & SearchSploit links"
                >
                  <span
                    className={cn(
                      "font-bold shrink-0 transition",
                      highlightRed
                        ? "rounded bg-red-600/45 border border-red-400/80 px-1.5 py-0.2 text-red-50 group-hover:bg-red-600/65"
                        : "text-[#e4b86a] underline underline-offset-2 group-hover:text-white",
                    )}
                  >
                    {current.cveId || current.id}
                  </span>
                  <span
                    className={cn(
                      "truncate group-hover:text-white",
                      highlightRed ? "text-red-100/90" : "text-zinc-300",
                    )}
                  >
                    {current.vendor} <span className={highlightRed ? "text-red-200/75" : "text-zinc-500"}>({current.product})</span>
                  </span>
                </button>

                {/* Matched Feed Micro-Badges */}
                <div className="hidden lg:flex items-center gap-1 shrink-0">
                  {current.matchedFeeds.slice(0, 4).map((fid) => (
                    <span
                      key={fid}
                      className={cn(
                        "rounded px-1 py-0.2 text-[9px] font-bold tracking-tight border",
                        highlightRed
                          ? "bg-red-950/80 border-red-400/40 text-red-200"
                          : "bg-white/5 border-white/15 text-zinc-300",
                      )}
                    >
                      {SOURCE_SHORT_BADGE[fid]?.code || fid}
                    </span>
                  ))}
                </div>

                {current.ransomware ? (
                  <span className="hidden xl:inline-flex items-center gap-1 rounded bg-rose-950/90 border border-rose-500/50 px-1.5 py-0.2 text-[10px] text-rose-200 font-sans font-semibold shrink-0">
                    <Flame className="size-2.5 text-rose-400" />
                    RANSOMWARE
                  </span>
                ) : null}

                {current.epssPercentile !== null ? (
                  <span
                    className={cn(
                      "hidden 2xl:inline text-[11px] shrink-0",
                      highlightRed ? "text-red-200" : "text-amber-300/80",
                    )}
                  >
                    EPSS: {current.epssPercentile}%
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Center Slot (kept compact on smaller screens so CVE stays prominent) */}
          {centerSlot ? (
            <div className="hidden xl:flex items-center shrink-0 px-1 sm:px-2">{centerSlot}</div>
          ) : null}

          {/* Right Controls: Manual Input + Investigate + Drawer + Clear */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pl-1">
            <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 size-3 text-zinc-500" />
                <input
                  type="text"
                  value={manualCve}
                  onChange={(e) => setManualCve(e.target.value)}
                  placeholder="CVE-YYYY-NNNN"
                  className={cn(
                    "h-6 w-28 sm:w-36 rounded-full border pl-6 pr-2 text-[11px] font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition uppercase",
                    highlightRed
                      ? "border-red-400/40 bg-black/40 focus:border-red-400"
                      : "border-white/15 bg-white/5 focus:border-[#e4b86a] focus:bg-[#121622]",
                  )}
                  title="Enter any CVE ID and click Investigate to inspect or audit"
                />
              </div>
              <button
                type="submit"
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-full px-2 sm:px-2.5 text-[11px] font-sans font-bold shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap",
                  highlightRed
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "bg-[#e4b86a] hover:bg-[#d4a85a] text-[#1a1408]",
                )}
                title="Inspect CVE or investigate"
              >
                <span>Investigate</span>
                <ArrowRight className="size-3" />
              </button>
            </form>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="grid size-6 place-items-center rounded-md text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label={expanded ? "Collapse radar drawer" : "Expand radar drawer"}
              title="Open Multi-Source CVE Radar Drawer (NVD, ExploitDB, Metasploit, SearchSploit, KEV)"
            >
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
            {rightSlot ? <div className="flex items-center shrink-0">{rightSlot}</div> : null}
          </div>
        </div>

        {/* Expanded Multi-Source Threat Radar Drawer */}
        {expanded ? (
          <div className="border-t border-white/10 bg-[#0a0c12] p-4 text-xs font-sans">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
              <div className="flex items-center gap-2">
                <Radio className={cn("size-4", streamConnected ? "text-emerald-400" : "text-amber-400")} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-100">
                      Multi-Source Live Vulnerability Stream
                    </span>
                    {sourceHealth.map((sh) => (
                      <span
                        key={sh.source}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono border",
                          sh.ok
                            ? "bg-emerald-950/50 border-emerald-500/35 text-emerald-300"
                            : "bg-zinc-900 border-white/10 text-zinc-400",
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", sh.ok ? "bg-emerald-400" : "bg-zinc-500")} />
                        {sh.source}: {sh.count}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Click any CVE to inspect what it is and jump directly to NVD, Exploit-DB, Metasploit, or SearchSploit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasActiveZeroDay ? (
                  <button
                    type="button"
                    onClick={() => setZeroDayPopupOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 text-xs font-bold text-white cursor-pointer"
                  >
                    <AlertOctagon className="size-3.5" />
                    <span>Zero-Day Bulletin ({zeroDays.length})</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void fetchSnapshotOnce(true)}
                  disabled={refreshing}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 text-xs font-medium text-zinc-200 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
                  <span>{refreshing ? "Streaming..." : "Refresh Feeds"}</span>
                </button>
              </div>
            </div>

            {/* Source & Vendor Filters */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: "ALL", label: `All (${entries.length})` },
                  { id: "ZERODAY", label: `Zero-Day (${zeroDays.length})` },
                  { id: "NVD", label: "NVD" },
                  { id: "EXPLOITDB", label: "Exploit-DB" },
                  { id: "METASPLOIT", label: "Metasploit" },
                  { id: "SEARCHSPLOIT", label: "SearchSploit" },
                  { id: "CISA_KEV", label: "CISA KEV" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedSourceFilter(f.id)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition cursor-pointer",
                      selectedSourceFilter === f.id
                        ? f.id === "ZERODAY"
                          ? "bg-red-600 text-white font-semibold"
                          : "bg-[#e4b86a] text-[#1a1408] font-semibold"
                        : "bg-white/5 text-zinc-300 hover:bg-white/10",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-zinc-400 mr-1">Vendor:</span>
                {vendors.slice(0, 7).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVendorFilter(v)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium transition cursor-pointer",
                      selectedVendorFilter === v
                        ? "bg-zinc-200 text-zinc-900 font-semibold"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Streamed CVE Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredEntries.map((item) => (
                <div
                  key={item.id}
                  onClick={() => void openInspector(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      void openInspector(item);
                    }
                  }}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-xl border p-3 transition cursor-pointer text-left",
                    item.isZeroDay
                      ? "border-red-500/60 bg-red-950/35 hover:bg-red-950/55 hover:border-red-400"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-[#e4b86a]/40",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "font-mono font-bold text-xs",
                            item.isZeroDay ? "text-red-300" : "text-[#e4b86a]",
                          )}
                        >
                          {item.cveId || item.id}
                        </span>
                        {item.isZeroDay ? (
                          <span className="rounded bg-red-600 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                            Zero-Day
                          </span>
                        ) : null}
                      </div>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-200">
                        {item.cvssScore !== null ? `CVSS ${item.cvssScore}` : item.severity}
                        {item.epssPercentile !== null ? ` · EPSS ${item.epssPercentile}%` : ""}
                      </span>
                    </div>
                    <h4 className="font-semibold text-zinc-100 text-xs truncate">
                      {item.vendor} — {item.product}
                    </h4>
                    <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
                    <div className="flex items-center gap-1">
                      {item.matchedFeeds.map((f) => (
                        <span
                          key={f}
                          className="rounded bg-white/5 border border-white/10 px-1 py-0.2 text-[9px] font-mono text-zinc-300"
                        >
                          {SOURCE_SHORT_BADGE[f]?.code || f}
                        </span>
                      ))}
                    </div>
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold group-hover:underline", item.isZeroDay ? "text-red-300" : "text-[#e4b86a]")}>
                      Inspect Details
                      <ArrowRight className="size-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Clickable CVE Intelligence Inspector Modal */}
      {inspectedCve ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setInspectedCve(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`CVE Inspector for ${inspectedCve.cveId || inspectedCve.id}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-2xl rounded-2xl border bg-[#0e1118] text-zinc-100 shadow-2xl overflow-hidden",
              inspectedCve.isZeroDay ? "border-red-500/75" : "border-white/15",
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-start justify-between gap-3 border-b px-5 py-4",
                inspectedCve.isZeroDay
                  ? "border-red-500/40 bg-gradient-to-r from-red-950/85 via-[#2a0910] to-[#120b12]"
                  : "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "font-mono text-lg font-extrabold",
                      inspectedCve.isZeroDay ? "text-red-200" : "text-[#e4b86a]",
                    )}
                  >
                    {inspectedCve.cveId || inspectedCve.id}
                  </span>
                  {inspectedCve.isZeroDay ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white animate-pulse">
                      <AlertOctagon className="size-3" />
                      ZERO-DAY ANNOUNCED
                    </span>
                  ) : null}
                  <span className="rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
                    {inspectedCve.severity}
                    {inspectedCve.cvssScore !== null ? ` · CVSS ${inspectedCve.cvssScore}` : ""}
                  </span>
                  {inspectedCve.epssPercentile !== null ? (
                    <span className="rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-mono text-amber-200">
                      EPSS {inspectedCve.epssPercentile}%
                    </span>
                  ) : null}
                  {inspectedCve.ransomware ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-950 border border-rose-500/50 px-2 py-0.5 text-[10px] font-bold text-rose-200">
                      <Flame className="size-3 text-rose-400" />
                      RANSOMWARE
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-1 text-sm font-semibold text-zinc-100">
                  {inspectedCve.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {inspectedCve.vendor} · {inspectedCve.product} · Published/Added: {inspectedCve.publishedDate}
                  {inspectedCve.cwe ? ` · ${inspectedCve.cwe}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedCve(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close CVE Inspector"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto text-xs">
              {inspectedCve.isZeroDay && inspectedCve.zeroDayReason ? (
                <div className="rounded-xl border border-red-500/60 bg-red-950/50 px-3.5 py-2.5 text-red-100">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-red-300">
                    Active Zero-Day Alert Rationale
                  </div>
                  <p className="mt-0.5 text-xs">{inspectedCve.zeroDayReason}</p>
                </div>
              ) : null}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-400">
                    What This Vulnerability Is
                  </h4>
                  {inspectLoading ? (
                    <span className="text-[11px] text-amber-300 animate-pulse">Enriching live NVD/MITRE data...</span>
                  ) : null}
                </div>
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-200">
                  {inspectedCve.description}
                </p>
              </div>

              <div>
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-400 mb-1">
                  Required Remediation{inspectedCve.dueDate ? ` (Due ${inspectedCve.dueDate})` : ""}
                </h4>
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-200">
                  {inspectedCve.requiredAction}
                </p>
              </div>

              {/* Linked Upstream Feeds: NVD, ExploitDB, Metasploit, SearchSploit */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-400 mb-2">
                  Linked Threat Feeds & Verification Indexes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectedCve.sources.map((src) => (
                    <a
                      key={src.id}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition",
                        src.matchedInFeed
                          ? "border-emerald-500/40 bg-emerald-950/25 hover:bg-emerald-950/45"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-100">{src.label}</span>
                          {src.matchedInFeed ? (
                            <span className="rounded bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
                              MATCHED IN STREAM
                            </span>
                          ) : null}
                        </div>
                        {src.detail ? (
                          <p className="truncate text-[10px] text-zinc-400 mt-0.5">{src.detail}</p>
                        ) : null}
                      </div>
                      <ExternalLink className="size-3.5 shrink-0 text-zinc-400" />
                    </a>
                  ))}
                </div>
              </div>

              {/* SearchSploit Defensive CLI Lookup Reference */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px]">
                <div className="flex items-center gap-2 truncate text-zinc-300">
                  <Terminal className="size-3.5 text-[#e4b86a] shrink-0" />
                  <span className="truncate">{inspectedCve.searchsploitCmd}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyCommand(inspectedCve.searchsploitCmd)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px] font-sans text-zinc-200 cursor-pointer shrink-0"
                >
                  {copiedCmd ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  <span>{copiedCmd ? "Copied" : "Copy CLI"}</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-white/[0.02] px-5 py-3">
              <button
                type="button"
                onClick={() => setInspectedCve(null)}
                className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => sendToChat(inspectedCve)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#e4b86a] hover:bg-[#d4a85a] px-4 py-1.5 text-xs font-bold text-[#1a1408] cursor-pointer"
              >
                <Sparkles className="size-3.5" />
                <span>Deep Audit in Noctis Chat</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Automatic Crimson/Red Zero-Day Announcement Popup */}
      {zeroDayPopupOpen && zeroDays.length > 0 ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Zero-Day CVE Announcement"
            className="w-full max-w-xl rounded-2xl border-2 border-red-500 bg-[#14070b] text-zinc-100 shadow-[0_0_45px_rgba(239,68,68,0.45)] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-red-500/40 bg-gradient-to-r from-red-700/45 via-red-900/40 to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-red-600/35 border border-red-400 text-red-200 animate-pulse">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-red-300">
                    Active Threat Advisory · {zeroDays.length} Announced
                  </div>
                  <h2 className="text-base font-extrabold text-white">
                    ZERO-DAY CVE ANNOUNCED
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={acknowledgeZeroDays}
                className="rounded-lg p-1.5 text-red-200 hover:bg-red-500/25 hover:text-white cursor-pointer"
                aria-label="Dismiss Zero-Day alert"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-red-100/85">
                Live NVD / CISA KEV / ExploitDB / Metasploit monitoring detected newly announced zero-day or emergency active-exploitation vulnerabilities. Click any CVE to inspect what it is or launch a remediation audit.
              </p>

              {zeroDays.slice(0, 6).map((zd) => (
                <div
                  key={zd.id}
                  className="rounded-xl border border-red-500/50 bg-red-950/45 p-3 hover:bg-red-950/65 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        acknowledgeZeroDays();
                        void openInspector(zd);
                      }}
                      className="font-mono text-sm font-extrabold text-red-200 underline underline-offset-2 hover:text-white cursor-pointer"
                    >
                      {zd.cveId || zd.id}
                    </button>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {zd.dueDate ? (
                        <span className="rounded bg-red-600/50 border border-red-400/50 px-1.5 py-0.5 font-bold text-white">
                          Due {zd.dueDate}
                        </span>
                      ) : null}
                      {zd.epssPercentile !== null ? (
                        <span className="rounded bg-black/50 border border-red-400/35 px-1.5 py-0.5 font-mono text-red-200">
                          EPSS {zd.epssPercentile}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white">
                    {zd.vendor} — {zd.product}
                  </div>
                  <p className="mt-1 text-[11px] text-red-100/80 line-clamp-2">
                    {zd.zeroDayReason || zd.description}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-red-500/25 pt-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {zd.sources.slice(0, 4).map((src) => (
                        <a
                          key={src.id}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-black/40 hover:bg-black/70 border border-red-400/35 px-1.5 py-0.5 text-[10px] font-medium text-red-100"
                        >
                          {SOURCE_SHORT_BADGE[src.id]?.label || src.label}
                          <ExternalLink className="size-2.5" />
                        </a>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          acknowledgeZeroDays();
                          void openInspector(zd);
                        }}
                        className="text-[11px] font-semibold text-red-200 hover:text-white underline cursor-pointer"
                      >
                        What is this?
                      </button>
                      <button
                        type="button"
                        onClick={() => sendToChat(zd)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                      >
                        <Sparkles className="size-3" />
                        Audit in Chat
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-red-500/35 bg-black/50 px-5 py-3">
              <span className="text-[11px] text-red-200/80">
                Top threat ribbon remains highlighted red while active zero-days persist.
              </span>
              <button
                type="button"
                onClick={acknowledgeZeroDays}
                className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
