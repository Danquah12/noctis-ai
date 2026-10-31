"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Search,
  ExternalLink,
  ShieldAlert,
  TrendingUp,
  FileText,
  RefreshCw,
  X,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SecCompanyProfile,
  type MacroIndicator,
  type CisaKevItem,
  fetchLiveSecFilings,
  fetchLiveMacroIndicators,
  fetchLiveCisaKev,
} from "@/lib/noctis-live-connectors";

interface NoctisDataConnectorsModalProps {
  open: boolean;
  onClose: () => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisDataConnectorsModal({
  open,
  onClose,
  onInsertToChat,
}: NoctisDataConnectorsModalProps) {
  const [activeTab, setActiveTab] = useState<"sec" | "macro" | "cisa">("sec");

  // SEC EDGAR state
  const [tickerQuery, setTickerQuery] = useState("CRWD");
  const [secProfile, setSecProfile] = useState<SecCompanyProfile | null>(null);
  const [secLoading, setSecLoading] = useState(false);

  // Macro state
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);

  // CISA KEV state
  const [kevQuery, setKevQuery] = useState("");
  const [kevList, setKevList] = useState<CisaKevItem[]>([]);
  const [kevLoading, setKevLoading] = useState(false);

  useEffect(() => {
    if (open) {
      handleSearchSec(tickerQuery);
      setMacroIndicators(fetchLiveMacroIndicators());
      handleSearchKev("");
    }
  }, [open]);

  async function handleSearchSec(t: string) {
    setSecLoading(true);
    try {
      const data = await fetchLiveSecFilings(t);
      setSecProfile(data);
    } catch {
      /* ignore */
    } finally {
      setSecLoading(false);
    }
  }

  async function handleSearchKev(q: string) {
    setKevLoading(true);
    try {
      const data = await fetchLiveCisaKev(q);
      setKevList(data);
    } catch {
      /* ignore */
    } finally {
      setKevLoading(false);
    }
  }

  function handleSendToChat(text: string) {
    if (onInsertToChat) {
      onInsertToChat(text);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-[#141414] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6 bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30">
              <Activity className="size-5 text-emerald-400" />
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                Live Data Feeds & Telemetry
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Radio className="size-2.5 animate-pulse" /> STREAMING
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Ground models in live SEC EDGAR filings, FRED Treasury yield curves, and CISA KEV feeds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center rounded-full bg-white/5 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("sec")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition flex items-center gap-1.5",
                  activeTab === "sec" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Building2 className="size-3.5 text-blue-400" />
                SEC EDGAR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("macro")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition flex items-center gap-1.5",
                  activeTab === "macro" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <TrendingUp className="size-3.5 text-emerald-400" />
                FRED Macro Yields
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cisa")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition flex items-center gap-1.5",
                  activeTab === "cisa" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <ShieldAlert className="size-3.5 text-rose-400" />
                CISA KEV Catalog
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {/* TAB 1: SEC EDGAR */}
          {activeTab === "sec" ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Ticker Search Bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                  <input
                    value={tickerQuery}
                    onChange={(e) => setTickerQuery(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchSec(tickerQuery);
                    }}
                    placeholder="Search SEC EDGAR by Ticker (e.g. CRWD, PANW, MSFT, AAPL, ZS)..."
                    className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] pl-10 pr-4 py-2.5 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-[#e4b86a]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearchSec(tickerQuery)}
                  disabled={secLoading}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-[#e4b86a] px-5 py-2.5 text-xs font-bold text-[#141414] hover:bg-[#d4a85a] transition disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", secLoading ? "animate-spin" : "")} />
                  Fetch Filings
                </button>
              </div>

              {/* Company Profile Header */}
              {secProfile ? (
                <div className="rounded-2xl border border-white/10 bg-[#181818] p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-300">
                        {secProfile.ticker}
                      </span>
                      <h3 className="text-base font-bold text-white">{secProfile.companyName}</h3>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      CIK: <span className="font-mono text-zinc-200">{secProfile.cik}</span> • Industry: {secProfile.sicDescription}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendToChat(
                        `Audit the latest SEC EDGAR disclosures (10-K, 10-Q, 8-K) for ${secProfile.ticker} (${secProfile.companyName}, CIK: ${secProfile.cik}). Evaluate revenue growth vs. operating cash flows, working-capital DSO/DIO, and GAAP-to-Non-GAAP reconciliation.`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/20 transition"
                  >
                    Audit {secProfile.ticker} in Chat
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              ) : null}

              {/* Filings Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Recent Official SEC Submissions
                </h4>
                <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-[#161616] overflow-hidden">
                  {secProfile?.filings.map((filing) => (
                    <div
                      key={filing.accessionNumber}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-white/[0.02] transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[11px] font-bold",
                              filing.form === "10-K"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : filing.form === "10-Q"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            )}
                          >
                            {filing.form}
                          </span>
                          <span className="font-semibold text-xs text-white">{filing.description}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Filed: <span className="text-zinc-200">{filing.filingDate}</span> • Accession:{" "}
                          <span className="font-mono text-zinc-300">{filing.accessionNumber}</span>
                          {filing.items ? ` • ${filing.items}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={filing.secUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white"
                        >
                          SEC Document
                          <ExternalLink className="size-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            handleSendToChat(
                              `Analyze ${secProfile?.ticker} ${filing.form} filing (Accession: ${filing.accessionNumber}, Filed: ${filing.filingDate}). Audit disclosure footnote items and evaluate operating cash flow conversion.`
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#e4b86a]/20 px-2.5 py-1 text-xs font-semibold text-[#e4b86a] hover:bg-[#e4b86a]/30"
                        >
                          Audit Filing
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* TAB 2: FRED MACRO YIELDS */}
          {activeTab === "macro" ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">FRED Macroeconomic & Yield Curve Indicators</h3>
                  <p className="text-xs text-zinc-400">
                    Federal Reserve Bank of St. Louis benchmark rates for DCF valuation hurdle rates and WACC calculations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSendToChat(
                      `Incorporate current FRED benchmark rates (10Y Treasury: 4.28%, 2Y Treasury: 4.15%, Spread: +13 bps, SOFR: 4.85%) into a Discounted Cash Flow valuation with Bear / Base / Bull WACC sensitivity.`
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#e4b86a] px-4 py-2 text-xs font-bold text-[#141414] hover:bg-[#d4a85a] transition"
                >
                  Inject Macro Curve into Chat
                  <ArrowRight className="size-3.5" />
                </button>
              </div>

              {/* Indicators Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {macroIndicators.map((ind) => (
                  <div key={ind.seriesId} className="rounded-2xl border border-white/10 bg-[#181818] p-4.5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                          {ind.seriesId} • {ind.source}
                        </span>
                        <h4 className="text-sm font-semibold text-zinc-100">{ind.name}</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {ind.change1M}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-[#e4b86a]">{ind.value.toFixed(2)}</span>
                      <span className="text-sm text-zinc-400">{ind.unit}</span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed border-t border-white/5 pt-2">
                      {ind.interpretation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* TAB 3: CISA KEV CATALOG */}
          {activeTab === "cisa" ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    CISA Known Exploited Vulnerabilities Catalog
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                      LIVE KEV
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Actively weaponized zero-day CVEs requiring mandatory federal remediation.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                  <input
                    value={kevQuery}
                    onChange={(e) => {
                      setKevQuery(e.target.value);
                      handleSearchKev(e.target.value);
                    }}
                    placeholder="Filter by CVE, Vendor, or Product..."
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] pl-9 pr-3 py-1.5 text-xs text-zinc-100 outline-none focus:ring-1 focus:ring-[#e4b86a]"
                  />
                </div>
              </div>

              {/* KEV List */}
              <div className="space-y-3">
                {kevList.map((item) => (
                  <div
                    key={item.cveID}
                    className="rounded-2xl border border-white/10 bg-[#161616] p-4.5 space-y-2.5 hover:border-white/20 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-300 border border-rose-500/30">
                          {item.cveID}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {item.vendorProject} {item.product}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.knownRansomwareCampaignUse === "Known" ? (
                          <span className="rounded-full bg-rose-950/60 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-800/60 flex items-center gap-1">
                            <AlertTriangle className="size-3" /> Ransomware Linked
                          </span>
                        ) : null}
                        <span className="text-[11px] text-zinc-400">
                          Due Date: <span className="text-zinc-200 font-semibold">{item.dueDate}</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">{item.shortDescription}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5 text-[11px]">
                      <span className="text-zinc-400">
                        Required Action: <span className="text-zinc-200">{item.requiredAction}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleSendToChat(
                            `Conduct a forensic vulnerability exploitability assessment on ${item.cveID} (${item.vendorProject} ${item.product}). Provide MITRE ATT&CK technique mapping, runtime PoC validation constraints, and immediate mitigation plan.`
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-md bg-[#e4b86a]/20 px-2.5 py-1 text-xs font-semibold text-[#e4b86a] hover:bg-[#e4b86a]/30"
                      >
                        Scan in Noctis Chat
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
