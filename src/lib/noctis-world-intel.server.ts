/**
 * Noctis World Bank Country Macro, Demographics & Debt Sustainability Engine (`/world`)
 *
 * Fetches live World Bank v2 country metadata and macroeconomic/energy indicators
 * (`NY.GDP.MKTP.CD`, `NY.GDP.PCAP.CD`, `FP.CPI.TOTL.ZG`, `SP.POP.TOTL`, `EG.ELC.ACCS.ZS`)
 * paired with deterministic Domar debt-trajectory & growth-doubling solvers. Zero API keys required.
 *
 * Pure TypeScript with no `@/` path aliases so it runs under Vite SSR, tsx, and
 * `node --experimental-strip-types --test`.
 */

const COUNTRY_ISO3_TABLE: Array<{ iso3: string; name: string; aliases: string[] }> = [
  { iso3: "GHA", name: "Ghana", aliases: ["ghana", "accra", "kumasi", "gha"] },
  { iso3: "USA", name: "United States", aliases: ["united states", "u.s.", "usa", "america"] },
  { iso3: "GBR", name: "United Kingdom", aliases: ["united kingdom", "u.k.", "uk", "britain", "england", "london", "gbr"] },
  { iso3: "UGA", name: "Uganda", aliases: ["uganda", "kampala", "uga"] },
  { iso3: "NGA", name: "Nigeria", aliases: ["nigeria", "lagos", "abuja", "nga"] },
  { iso3: "KEN", name: "Kenya", aliases: ["kenya", "nairobi", "ken"] },
  { iso3: "ZAF", name: "South Africa", aliases: ["south africa", "johannesburg", "cape town", "zaf"] },
  { iso3: "ETH", name: "Ethiopia", aliases: ["ethiopia", "addis ababa", "eth"] },
  { iso3: "EGY", name: "Egypt", aliases: ["egypt", "cairo", "egy"] },
  { iso3: "MAR", name: "Morocco", aliases: ["morocco", "casablanca", "rabat", "mar"] },
  { iso3: "RWA", name: "Rwanda", aliases: ["rwanda", "kigali", "rwa"] },
  { iso3: "TZA", name: "Tanzania", aliases: ["tanzania", "dar es salaam", "tza"] },
  { iso3: "SEN", name: "Senegal", aliases: ["senegal", "dakar", "sen"] },
  { iso3: "CIV", name: "Cote d'Ivoire", aliases: ["cote d'ivoire", "ivory coast", "abidjan", "civ"] },
  { iso3: "DEU", name: "Germany", aliases: ["germany", "berlin", "frankfurt", "deu"] },
  { iso3: "FRA", name: "France", aliases: ["france", "paris", "fra"] },
  { iso3: "ITA", name: "Italy", aliases: ["italy", "rome", "milan", "ita"] },
  { iso3: "ESP", name: "Spain", aliases: ["spain", "madrid", "esp"] },
  { iso3: "NLD", name: "Netherlands", aliases: ["netherlands", "amsterdam", "rotterdam", "nld"] },
  { iso3: "CHE", name: "Switzerland", aliases: ["switzerland", "zurich", "geneva", "che"] },
  { iso3: "POL", name: "Poland", aliases: ["poland", "warsaw", "pol"] },
  { iso3: "SWE", name: "Sweden", aliases: ["sweden", "stockholm", "swe"] },
  { iso3: "NOR", name: "Norway", aliases: ["norway", "oslo", "nor"] },
  { iso3: "JPN", name: "Japan", aliases: ["japan", "tokyo", "jpn"] },
  { iso3: "CHN", name: "China", aliases: ["china", "beijing", "shanghai", "chn"] },
  { iso3: "IND", name: "India", aliases: ["india", "delhi", "mumbai", "ind"] },
  { iso3: "KOR", name: "South Korea", aliases: ["south korea", "korea", "seoul", "kor"] },
  { iso3: "SGP", name: "Singapore", aliases: ["singapore", "sgp"] },
  { iso3: "IDN", name: "Indonesia", aliases: ["indonesia", "jakarta", "idn"] },
  { iso3: "VNM", name: "Vietnam", aliases: ["vietnam", "hanoi", "vnm"] },
  { iso3: "SAU", name: "Saudi Arabia", aliases: ["saudi arabia", "riyadh", "sau"] },
  { iso3: "ARE", name: "United Arab Emirates", aliases: ["united arab emirates", "uae", "dubai", "abu dhabi", "are"] },
  { iso3: "ISR", name: "Israel", aliases: ["israel", "tel aviv", "isr"] },
  { iso3: "TUR", name: "Turkiye", aliases: ["turkey", "turkiye", "istanbul", "ankara", "tur"] },
  { iso3: "CAN", name: "Canada", aliases: ["canada", "toronto", "ottawa", "can"] },
  { iso3: "MEX", name: "Mexico", aliases: ["mexico", "mex"] },
  { iso3: "BRA", name: "Brazil", aliases: ["brazil", "brasilia", "sao paulo", "bra"] },
  { iso3: "ARG", name: "Argentina", aliases: ["argentina", "buenos aires", "arg"] },
  { iso3: "CHL", name: "Chile", aliases: ["chile", "santiago", "chl"] },
  { iso3: "COL", name: "Colombia", aliases: ["colombia", "bogota", "col"] },
  { iso3: "AUS", name: "Australia", aliases: ["australia", "sydney", "canberra", "aus"] },
  { iso3: "NZL", name: "New Zealand", aliases: ["new zealand", "auckland", "nzl"] },
];

export interface DomarDebtResult {
  debtToGdpPct: number;
  realInterestPct: number;
  realGrowthPct: number;
  primaryBalancePct: number;
  deltaDebtPct: number;
  nextYearDebtPct: number;
  stabilizingPrimaryBalancePct: number;
  sustainable: boolean;
}

export function resolveCountryIso3(prompt: string): { iso3: string; name: string } {
  const lower = String(prompt || "").toLowerCase();
  for (const row of COUNTRY_ISO3_TABLE) {
    for (const alias of row.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) {
        return { iso3: row.iso3, name: row.name };
      }
    }
  }
  const isoMatch = prompt.match(/\b([A-Z]{3})\b/);
  if (isoMatch?.[1] && !/^(GDP|CPI|USD|EUR|GBP|IMF|AQI|API|VAR)$/.test(isoMatch[1])) {
    return { iso3: isoMatch[1], name: isoMatch[1] };
  }
  return { iso3: "GHA", name: "Ghana" };
}

export function computeDomarDebtTrajectory(
  debtToGdpPct: number,
  realInterestPct: number,
  realGrowthPct: number,
  primaryBalancePct: number,
): DomarDebtResult {
  const r = realInterestPct / 100;
  const g = realGrowthPct / 100;
  const spread = (r - g) / (1 + g);
  const deltaDebtPct = spread * debtToGdpPct - primaryBalancePct;
  const nextYearDebtPct = Math.max(0, debtToGdpPct + deltaDebtPct);
  const stabilizingPrimaryBalancePct = spread * debtToGdpPct;
  return {
    debtToGdpPct,
    realInterestPct,
    realGrowthPct,
    primaryBalancePct,
    deltaDebtPct,
    nextYearDebtPct,
    stabilizingPrimaryBalancePct,
    sustainable: deltaDebtPct <= 0.05,
  };
}

export function computeGrowthDoublingYears(annualGrowthPct: number): number {
  if (!Number.isFinite(annualGrowthPct) || annualGrowthPct <= 0) return Infinity;
  return Math.log(2) / Math.log(1 + annualGrowthPct / 100);
}

interface WorldBankPoint {
  year: string;
  value: number;
}

async function fetchWorldBankMeta(iso3: string): Promise<{
  name: string;
  capitalCity: string;
  region: string;
  incomeLevel: string;
}> {
  try {
    const res = await fetch(`https://api.worldbank.org/v2/country/${iso3}?format=json`, {
      headers: { "user-agent": "Noctis-World-Intel/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { name: iso3, capitalCity: "", region: "", incomeLevel: "" };
    const data = (await res.json()) as [unknown, Array<{ name?: string; capitalCity?: string; region?: { value?: string }; incomeLevel?: { value?: string } }>?];
    const row = data?.[1]?.[0];
    if (!row) return { name: iso3, capitalCity: "", region: "", incomeLevel: "" };
    return {
      name: String(row.name || iso3),
      capitalCity: String(row.capitalCity || ""),
      region: String(row.region?.value || "").trim(),
      incomeLevel: String(row.incomeLevel?.value || "").trim(),
    };
  } catch {
    return { name: iso3, capitalCity: "", region: "", incomeLevel: "" };
  }
}

async function fetchWorldBankIndicator(iso3: string, indicator: string): Promise<WorldBankPoint[]> {
  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${iso3}/indicator/${indicator}?format=json&mrv=5`,
      {
        headers: { "user-agent": "Noctis-World-Intel/1.0" },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as [unknown, Array<{ date?: string; value?: number | null }>?];
    return (data?.[1] || [])
      .filter((r) => typeof r.value === "number" && Number.isFinite(r.value))
      .map((r) => ({ year: String(r.date || ""), value: Number(r.value) }));
  } catch {
    return [];
  }
}

function fmtUsdCompact(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${Math.round(val).toLocaleString()}`;
}

export async function executeWorldIntelQuery(prompt: string): Promise<string> {
  const country = resolveCountryIso3(prompt);

  const debtMatch = prompt.match(/debt[-\s]*(?:to[-\s]*gdp)?\s*(?:of|=|:)?\s*(\d+(?:\.\d+)?)\s*%?/i);
  const realRateMatch = prompt.match(/real\s+interest\s*(?:rate)?\s*(?:of|=|:)?\s*(\d+(?:\.\d+)?)\s*%?/i);
  const growthMatch = prompt.match(/(?:gdp\s+)?growth\s*(?:of|=|:)?\s*(\d+(?:\.\d+)?)\s*%?/i);
  const balanceMatch = prompt.match(/primary\s+balance\s*(?:of|=|:)?\s*([-+]?\d+(?:\.\d+)?)\s*%?/i);

  const [meta, gdpSeries, gdpCapSeries, cpiSeries, popSeries, elecSeries] = await Promise.all([
    fetchWorldBankMeta(country.iso3),
    fetchWorldBankIndicator(country.iso3, "NY.GDP.MKTP.CD"),
    fetchWorldBankIndicator(country.iso3, "NY.GDP.PCAP.CD"),
    fetchWorldBankIndicator(country.iso3, "FP.CPI.TOTL.ZG"),
    fetchWorldBankIndicator(country.iso3, "SP.POP.TOTL"),
    fetchWorldBankIndicator(country.iso3, "EG.ELC.ACCS.ZS"),
  ]);

  const latestGdp = gdpSeries[0];
  const latestCap = gdpCapSeries[0];
  const latestCpi = cpiSeries[0];
  const latestPop = popSeries[0];
  const latestElec = elecSeries[0];

  const domar = computeDomarDebtTrajectory(
    debtMatch?.[1] ? Number(debtMatch[1]) : 72.0,
    realRateMatch?.[1] ? Number(realRateMatch[1]) : 4.2,
    growthMatch?.[1] ? Number(growthMatch[1]) : 4.5,
    balanceMatch?.[1] ? Number(balanceMatch[1]) : -0.8,
  );
  const doublingYears = computeGrowthDoublingYears(growthMatch?.[1] ? Number(growthMatch[1]) : 4.5);

  const riskLevel: "low" | "moderate" | "high" =
    (latestCpi && latestCpi.value >= 15) || !domar.sustainable ? "moderate" : "low";

  const displayName = meta.name || country.name;
  const dashboardPayload = {
    title: `World Bank Macro & Sovereign Country Profile — ${displayName} (${country.iso3})`,
    subtitle: [meta.region, meta.incomeLevel, meta.capitalCity ? `Capital: ${meta.capitalCity}` : ""]
      .filter(Boolean)
      .join(" · ") || "World Bank v2 Open Indicators API",
    riskLevel,
    kpis: [
      {
        label: `GDP (${latestGdp?.year || "Latest"})`,
        value: latestGdp ? fmtUsdCompact(latestGdp.value) : "Unavailable",
        sub: latestCap ? `$${Math.round(latestCap.value).toLocaleString()} per capita (${latestCap.year})` : country.iso3,
      },
      {
        label: `CPI Inflation (${latestCpi?.year || "Latest"})`,
        value: latestCpi ? `${latestCpi.value.toFixed(1)}%` : "Unavailable",
        sub: "Annual consumer price index",
      },
      {
        label: `Population (${latestPop?.year || "Latest"})`,
        value: latestPop ? `${(latestPop.value / 1e6).toFixed(2)}M` : "Unavailable",
        sub: latestElec ? `Electricity access: ${latestElec.value.toFixed(1)}% (${latestElec.year})` : "World Bank WDI",
      },
      {
        label: "Domar Debt Δ / Year",
        value: `${domar.deltaDebtPct >= 0 ? "+" : ""}${domar.deltaDebtPct.toFixed(2)} pp`,
        sub: `Stabilizing balance: ${domar.stabilizingPrimaryBalancePct.toFixed(2)}% GDP`,
      },
    ],
    ...(gdpSeries.length
      ? {
          trend: {
            title: `${displayName} GDP Trajectory (Current USD Billions)`,
            seriesLabel: "GDP ($B)",
            points: [...gdpSeries].reverse().map((p) => ({
              label: p.year,
              value: Number((p.value / 1e9).toFixed(2)),
              display: fmtUsdCompact(p.value),
            })),
          },
        }
      : {}),
  };

  const parts: string[] = [
    `## World Intelligence & Sovereign Macro Profile — ${displayName} (${country.iso3})`,
    `\`\`\`noctis-dashboard\n${JSON.stringify(dashboardPayload)}\n\`\`\``,
    [
      "### 1. Live World Bank WDI Telemetry",
      "| Indicator | Latest Value | Reference Year | Source Code |",
      "| :--- | :--- | :--- | :--- |",
      `| **GDP (Current US$)** | ${latestGdp ? fmtUsdCompact(latestGdp.value) : "N/A"} | ${latestGdp?.year || "—"} | \`NY.GDP.MKTP.CD\` |`,
      `| **GDP per Capita (US$)** | ${latestCap ? `$${Math.round(latestCap.value).toLocaleString()}` : "N/A"} | ${latestCap?.year || "—"} | \`NY.GDP.PCAP.CD\` |`,
      `| **Inflation (CPI Annual %)** | ${latestCpi ? `${latestCpi.value.toFixed(2)}%` : "N/A"} | ${latestCpi?.year || "—"} | \`FP.CPI.TOTL.ZG\` |`,
      `| **Total Population** | ${latestPop ? Math.round(latestPop.value).toLocaleString() : "N/A"} | ${latestPop?.year || "—"} | \`SP.POP.TOTL\` |`,
      `| **Electricity Access (%)** | ${latestElec ? `${latestElec.value.toFixed(1)}%` : "N/A"} | ${latestElec?.year || "—"} | \`EG.ELC.ACCS.ZS\` |`,
    ].join("\n"),
    [
      "### 2. Deterministic Domar Debt-to-GDP Sustainability Analysis",
      `- **Inputs:** Debt/GDP = **${domar.debtToGdpPct.toFixed(1)}%** · Real Rate $r$ = **${domar.realInterestPct.toFixed(1)}%** · Real Growth $g$ = **${domar.realGrowthPct.toFixed(1)}%** · Primary Balance = **${domar.primaryBalancePct.toFixed(1)}%**`,
      `- **Annual Debt Ratio Change ($\Delta d = \\frac{r - g}{1+g} d - pb$):** **${domar.deltaDebtPct >= 0 ? "+" : ""}${domar.deltaDebtPct.toFixed(2)} percentage points/yr** -> Next-year projected Debt/GDP = **${domar.nextYearDebtPct.toFixed(2)}%**`,
      `- **Debt-Stabilizing Primary Balance:** **${domar.stabilizingPrimaryBalancePct.toFixed(2)}% of GDP** · **Rule of $\\ln 2$ Output Doubling Time (at ${domar.realGrowthPct.toFixed(1)}% growth):** **${doublingYears.toFixed(1)} years**`,
    ].join("\n"),
    "**Live Source Checked:** World Bank Open Data API v2 (`api.worldbank.org`)",
  ];

  return parts.join("\n\n");
}
