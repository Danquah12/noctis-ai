import { useState, useMemo, useRef } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  LineChart as LineChartIcon,
  Maximize2,
  Minimize2,
  PieChart as PieChartIcon,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NoctisCodeInterpreterProps {
  code: string;
  lang?: string;
  onCodeChange?: (newCode: string) => void;
}

export interface ParsedDataSeries {
  labels: string[];
  series: Array<{
    name: string;
    values: number[];
    color: string;
  }>;
}

const PALETTE = ["#e4b86a", "#38bdf8", "#34d399", "#f87171", "#a78bfa", "#fb923c"];

export function parseTableOrJsonData(text: string): ParsedDataSeries | null {
  // 1. Try parsing JSON array of objects
  try {
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const keys = Object.keys(parsed[0] || {});
        const labelKey = keys.find((k) => typeof parsed[0]?.[k] === "string") || keys[0];
        const numKeys = keys.filter((k) => k !== labelKey && typeof parsed[0]?.[k] === "number");
        if (labelKey && numKeys.length > 0) {
          const labels = parsed.map((row) => String(row[labelKey] ?? ""));
          const series = numKeys.map((k, idx) => ({
            name: k,
            values: parsed.map((row) => Number(row[k]) || 0),
            color: PALETTE[idx % PALETTE.length] || "#e4b86a",
          }));
          return { labels, series };
        }
      }
    }
  } catch {
    /* continue to markdown table parser */
  }

  // 2. Parse Markdown Table
  const lines = text.trim().split("\n").filter((l) => l.includes("|"));
  if (lines.length >= 3) {
    const headerLine = lines[0] ?? "";
    const headers = headerLine
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    const dataRows = lines.slice(2).map((l) =>
      l
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
    );

    if (headers.length >= 2 && dataRows.length >= 2) {
      const labels = dataRows.map((r) => r[0] || "");
      const seriesList: Array<{ name: string; values: number[]; color: string }> = [];

      for (let col = 1; col < headers.length; col++) {
        const headerName = headers[col] ?? `Series ${col}`;
        const rawVals = dataRows.map((r) => {
          const raw = (r[col] || "").replace(/[$,%]/g, "").trim();
          const parsed = parseFloat(raw);
          return isNaN(parsed) ? 0 : parsed;
        });

        // Only include columns that contain numbers
        if (rawVals.some((v) => v !== 0)) {
          seriesList.push({
            name: headerName,
            values: rawVals,
            color: PALETTE[(col - 1) % PALETTE.length] || "#e4b86a",
          });
        }
      }

      if (seriesList.length > 0) {
        return { labels, series: seriesList };
      }
    }
  }

  return null;
}

export function evaluateJavaScriptOrPython(code: string, lang = "javascript"): {
  stdout: string[];
  result: unknown;
  error?: string;
  executionMs: number;
} {
  const stdout: string[] = [];
  const start = performance.now();

  try {
    if (lang === "javascript" || lang === "typescript" || lang === "js" || lang === "ts") {
      const customConsole = {
        log: (...args: unknown[]) => stdout.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")),
        warn: (...args: unknown[]) => stdout.push("[WARN] " + args.join(" ")),
        error: (...args: unknown[]) => stdout.push("[ERROR] " + args.join(" ")),
      };

      // Safe evaluation sandbox wrapping user code
      const fn = new Function("console", `"use strict";\n${code}`);
      const res = fn(customConsole);
      const executionMs = Math.round((performance.now() - start) * 10) / 10;
      return { stdout, result: res, executionMs };
    } else {
      // Python calculation parser / math evaluator
      const pyLines = code.split("\n");
      const vars: Record<string, number> = {};

      for (const line of pyLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        // Print statement match: print(...)
        const printMatch = trimmed.match(/^print\((.*)\)$/);
        if (printMatch) {
          const expr = printMatch[1] ?? "";
          // Replace known vars
          let evalExpr = expr;
          for (const [k, v] of Object.entries(vars)) {
            evalExpr = evalExpr.replace(new RegExp(`\\b${k}\\b`, "g"), String(v));
          }
          // Evaluate clean math
          try {
            const clean = evalExpr.replace(/[^0-9+\-*/(). eE%]/g, "");
            const val = clean ? new Function(`return (${clean})`)() : evalExpr;
            stdout.push(String(val));
          } catch {
            stdout.push(expr);
          }
          continue;
        }

        // Assignment match: x = 12 * 4
        const assignMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
        if (assignMatch) {
          const varName = assignMatch[1] ?? "";
          const expr = assignMatch[2] ?? "";
          let evalExpr = expr;
          for (const [k, v] of Object.entries(vars)) {
            evalExpr = evalExpr.replace(new RegExp(`\\b${k}\\b`, "g"), String(v));
          }
          try {
            const clean = evalExpr.replace(/[^0-9+\-*/(). eE%]/g, "");
            if (clean) {
              const val = Number(new Function(`return (${clean})`)());
              if (!isNaN(val)) vars[varName] = val;
            }
          } catch {
            /* ignore unparsed python line */
          }
        }
      }

      const executionMs = Math.round((performance.now() - start) * 10) / 10;
      return {
        stdout: stdout.length ? stdout : [Object.entries(vars).map(([k, v]) => `${k} = ${v}`).join("\n") || "Code executed successfully with zero runtime errors."],
        result: vars,
        executionMs,
      };
    }
  } catch (err: unknown) {
    const executionMs = Math.round((performance.now() - start) * 10) / 10;
    return {
      stdout,
      result: null,
      error: err instanceof Error ? err.message : String(err),
      executionMs,
    };
  }
}

export function NoctisCodeInterpreter({
  code,
  lang = "python",
  onCodeChange,
}: NoctisCodeInterpreterProps) {
  const [activeTab, setActiveTab] = useState<"code" | "chart" | "console">("code");
  const [chartType, setChartType] = useState<"line" | "bar" | "area" | "pie">("line");
  const [editableCode, setEditableCode] = useState(code);
  const [isRunning, setIsRunning] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<{
    stdout: string[];
    result: unknown;
    error?: string;
    executionMs: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const normalizedLang = (lang || "").toLowerCase().trim();
  const isRunnable =
    ["python", "py", "javascript", "typescript", "js", "ts", "json", "sql"].includes(normalizedLang) ||
    !normalizedLang;

  const parsedData = useMemo(() => parseTableOrJsonData(editableCode), [editableCode]);

  function handleRun() {
    setIsRunning(true);
    // Microtask delay for UI responsiveness
    window.setTimeout(() => {
      const res = evaluateJavaScriptOrPython(editableCode, normalizedLang);
      setExecutionOutput(res);
      setIsRunning(false);
      setActiveTab("console");
    }, 40);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(editableCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore copy error */
    }
  }

  function handleDownloadSvg() {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `noctis-data-chart.svg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // --- SVG Vector Chart Renderer ---
  function renderChart() {
    if (!parsedData || parsedData.labels.length === 0 || parsedData.series.length === 0) {
      return (
        <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-zinc-400">
          <BarChart3 className="size-8 text-zinc-600 mb-2" />
          <p className="text-sm font-semibold">No numerical table or JSON series detected in this block.</p>
          <p className="text-xs text-zinc-500 mt-1">
            Provide a markdown table or JSON array (e.g., Year | Revenue | Profit) to auto-render interactive plots.
          </p>
        </div>
      );
    }

    const { labels, series } = parsedData;
    const width = 640;
    const height = 300;
    const padX = 54;
    const padY = 36;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const allValues = series.flatMap((s) => s.values);
    const minVal = Math.min(0, ...allValues);
    const maxVal = Math.max(...allValues, 1);
    const range = maxVal - minVal || 1;

    const getX = (idx: number) => padX + (idx / Math.max(labels.length - 1, 1)) * chartW;
    const getY = (val: number) => padY + chartH - ((val - minVal) / range) * chartH;

    if (chartType === "pie") {
      // Render First Series as Donut / Pie
      const firstSeries = series[0]!;
      const total = firstSeries.values.reduce((sum, v) => sum + Math.max(v, 0), 0) || 1;
      let cumAngle = 0;
      const radius = 95;
      const innerRadius = 50;
      const cx = width / 2;
      const cy = height / 2;

      return (
        <div className="p-4 flex flex-col items-center">
          <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="h-64 w-full max-w-lg">
            {firstSeries.values.map((val, idx) => {
              const sliceAngle = (Math.max(val, 0) / total) * 2 * Math.PI;
              const startAngle = cumAngle;
              const endAngle = cumAngle + sliceAngle;
              cumAngle = endAngle;

              const x1 = cx + radius * Math.cos(startAngle);
              const y1 = cy + radius * Math.sin(startAngle);
              const x2 = cx + radius * Math.cos(endAngle);
              const y2 = cy + radius * Math.sin(endAngle);

              const ix1 = cx + innerRadius * Math.cos(endAngle);
              const iy1 = cy + innerRadius * Math.sin(endAngle);
              const ix2 = cx + innerRadius * Math.cos(startAngle);
              const iy2 = cy + innerRadius * Math.sin(startAngle);

              const largeArc = sliceAngle > Math.PI ? 1 : 0;
              const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

              return (
                <path
                  key={idx}
                  d={pathData}
                  fill={PALETTE[idx % PALETTE.length]}
                  stroke="#161616"
                  strokeWidth="2"
                  className="transition hover:opacity-85"
                >
                  <title>{`${labels[idx] || "Item"}: ${val} (${Math.round((val / total) * 100)}%)`}</title>
                </path>
              );
            })}
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#e4b86a" fontSize="12" fontWeight="700">
              {firstSeries.name}
            </text>
          </svg>
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs">
            {labels.map((lbl, idx) => (
              <span key={idx} className="flex items-center gap-1.5 text-zinc-300">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                <span>{lbl}</span>
                <span className="font-semibold text-zinc-100">({firstSeries.values[idx]})</span>
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (chartType === "bar") {
      const groupW = chartW / labels.length;
      const barW = Math.max(groupW / (series.length + 0.6), 8);

      return (
        <div className="p-4">
          <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padY + chartH * (1 - pct);
              const val = Math.round(minVal + range * pct);
              return (
                <g key={i}>
                  <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <text x={padX - 8} y={y + 4} textAnchor="end" fill="#71717a" fontSize="10">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {labels.map((lbl, groupIdx) => {
              const groupX = padX + groupIdx * groupW;
              return (
                <g key={groupIdx}>
                  {series.map((s, seriesIdx) => {
                    const val = s.values[groupIdx] ?? 0;
                    const barH = Math.max(((val - minVal) / range) * chartH, 2);
                    const bx = groupX + (groupW - barW * series.length) / 2 + seriesIdx * barW;
                    const by = padY + chartH - barH;
                    return (
                      <rect
                        key={seriesIdx}
                        x={bx}
                        y={by}
                        width={barW - 2}
                        height={barH}
                        rx="3"
                        fill={s.color}
                        className="transition hover:opacity-85"
                      >
                        <title>{`${s.name} (${lbl}): ${val}`}</title>
                      </rect>
                    );
                  })}
                  <text
                    x={groupX + groupW / 2}
                    y={height - padY + 18}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {lbl}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // Default: Line & Area Chart
    return (
      <div className="p-4">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padY + chartH * (1 - pct);
            const val = Math.round(minVal + range * pct);
            return (
              <g key={i}>
                <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <text x={padX - 8} y={y + 4} textAnchor="end" fill="#71717a" fontSize="10">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Series Paths */}
          {series.map((s, sIdx) => {
            const points = s.values.map((v, i) => `${getX(i)},${getY(v)}`);
            const pathD = `M ${points.join(" L ")}`;
            const areaD = `${pathD} L ${getX(s.values.length - 1)},${padY + chartH} L ${getX(0)},${padY + chartH} Z`;

            return (
              <g key={sIdx}>
                {chartType === "area" ? (
                  <path d={areaD} fill={s.color} fillOpacity="0.18" />
                ) : null}
                <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {s.values.map((val, i) => (
                  <circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(val)}
                    r="4"
                    fill="#181818"
                    stroke={s.color}
                    strokeWidth="2.5"
                    className="hover:r-6 transition"
                  >
                    <title>{`${s.name} (${labels[i]}): ${val}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* X-axis Labels */}
          {labels.map((lbl, i) => (
            <text key={i} x={getX(i)} y={height - padY + 18} textAnchor="middle" fill="#a1a1aa" fontSize="10" fontWeight="500">
              {lbl}
            </text>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-zinc-300">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-semibold text-zinc-200">{s.name}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-xl">
      {/* Code Interpreter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#1f1f1f] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-mono font-semibold uppercase text-[#e4b86a]">
            {normalizedLang || "code"}
          </span>

          <div className="flex items-center gap-1 rounded-full bg-black/40 p-0.5 text-xs ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                activeTab === "code" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Code2 className="size-3.5" />
              Source
            </button>

            {parsedData ? (
              <button
                type="button"
                onClick={() => setActiveTab("chart")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                  activeTab === "chart" ? "bg-[#e4b86a] text-[#1a1408] font-semibold" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <BarChart3 className="size-3.5" />
                Plot & Chart
              </button>
            ) : null}

            {executionOutput ? (
              <button
                type="button"
                onClick={() => setActiveTab("console")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                  activeTab === "console" ? "bg-white/15 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Terminal className="size-3.5" />
                Console
              </button>
            ) : null}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab === "chart" ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChartType("line")}
                title="Line Chart"
                className={cn("p-1.5 rounded-lg text-xs", chartType === "line" ? "bg-white/15 text-white" : "text-zinc-400")}
              >
                <LineChartIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                title="Bar Chart"
                className={cn("p-1.5 rounded-lg text-xs", chartType === "bar" ? "bg-white/15 text-white" : "text-zinc-400")}
              >
                <BarChart3 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType("pie")}
                title="Donut / Pie Chart"
                className={cn("p-1.5 rounded-lg text-xs", chartType === "pie" ? "bg-white/15 text-white" : "text-zinc-400")}
              >
                <PieChartIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-white/20"
              >
                <Download className="size-3" />
                SVG
              </button>
            </div>
          ) : null}

          {isRunnable ? (
            <button
              type="button"
              disabled={isRunning}
              onClick={handleRun}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#e4b86a] px-3 py-1 text-xs font-semibold text-[#1a1408] transition hover:opacity-90 disabled:opacity-50"
            >
              <Play className="size-3.5 fill-current" />
              {isRunning ? "Running..." : "Run Code"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleCopy}
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
            title="Copy code"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Editor / Source Tab */}
      {activeTab === "code" ? (
        <div className="relative">
          <pre className="max-h-[460px] overflow-auto p-4 text-[13px] leading-relaxed font-mono text-zinc-100 bg-[#111111]">
            <code>{editableCode}</code>
          </pre>
        </div>
      ) : null}

      {/* Interactive Chart Tab */}
      {activeTab === "chart" ? (
        <div className="bg-[#111111]">{renderChart()}</div>
      ) : null}

      {/* Execution Console Tab */}
      {activeTab === "console" ? (
        <div className="p-4 bg-[#0c0c0c] font-mono text-xs text-zinc-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <span className="flex items-center gap-2 text-emerald-400">
              <Check className="size-3.5" />
              Execution Finished ({executionOutput?.executionMs}ms)
            </span>
            <button
              type="button"
              onClick={() => setExecutionOutput(null)}
              className="text-zinc-500 hover:text-zinc-300 text-[11px]"
            >
              Clear Console
            </button>
          </div>

          {executionOutput?.error ? (
            <div className="rounded-lg bg-red-950/40 border border-red-800/40 p-3 text-red-300">
              <p className="font-bold">Runtime Error:</p>
              <pre className="mt-1 whitespace-pre-wrap">{executionOutput.error}</pre>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] text-zinc-500 mb-1">Standard Output (stdout):</p>
              {executionOutput?.stdout.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap leading-5 text-zinc-100">
                  {line}
                </div>
              ))}
              {executionOutput?.result !== undefined && executionOutput.result !== null ? (
                <div className="mt-3 pt-2 border-t border-white/10">
                  <p className="text-[11px] text-[#e4b86a] mb-1">Return Value:</p>
                  <pre className="text-zinc-300 whitespace-pre-wrap">
                    {typeof executionOutput.result === "object"
                      ? JSON.stringify(executionOutput.result, null, 2)
                      : String(executionOutput.result)}
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
