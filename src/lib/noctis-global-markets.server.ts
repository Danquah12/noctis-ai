/**
 * Noctis Global Markets, Live FX & Quantitative Macro Engine (`/markets`)
 *
 * Combines live public FX rates (open.er-api.com USD base) and live digital-asset
 * spot telemetry (CoinGecko) with deterministic financial math (cross-currency conversion,
 * Fisher exact real yield, and parametric VaR). Zero API keys required.
 *
 * Pure TypeScript with no `@/` path aliases so it runs under Vite SSR, tsx, and
 * `node --experimental-strip-types --test`.
 */

const DEFAULT_CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  GHS: "Ghanaian Cedi",
  JPY: "Japanese Yen",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  AUD: "Australian Dollar",
  CNY: "Chinese Yuan",
  INR: "Indian Rupee",
  NGN: "Nigerian Naira",
  KES: "Kenyan Shilling",
  UGX: "Ugandan Shilling",
  ZAR: "South African Rand",
  AED: "UAE Dirham",
  SGD: "Singapore Dollar",
};

export interface FisherRealYieldResult {
  nominalRatePct: number;
  inflationPct: number;
  exactRealPct: number;
  approxRealPct: number;
}

export interface ParametricVarResult {
  portfolioUsd: number;
  annualVolPct: number;
  horizonDays: number;
  confidence: 95 | 99;
  zScore: number;
  varUsd: number;
  pctOfPortfolio: number;
}

export function convertCurrencyAmount(
  amount: number,
  fromRatePerUsd: number,
  toRatePerUsd: number,
): number {
  const safeAmt = Number.isFinite(amount) ? amount : 0;
  if (!Number.isFinite(fromRatePerUsd) || fromRatePerUsd <= 0) return 0;
  if (!Number.isFinite(toRatePerUsd) || toRatePerUsd <= 0) return 0;
  return (safeAmt / fromRatePerUsd) * toRatePerUsd;
}

export function computeFisherRealYield(
  nominalRatePct: number,
  inflationPct: number,
): FisherRealYieldResult {
  const i = nominalRatePct / 100;
  const pi = inflationPct / 100;
  const exactReal = ((1 + i) / (1 + pi) - 1) * 100;
  return {
    nominalRatePct,
    inflationPct,
    exactRealPct: exactReal,
    approxRealPct: nominalRatePct - inflationPct,
  };
}

export function computeParametricVaR(
  portfolioUsd: number,
  annualVolPct: number,
  horizonDays: number,
  confidence: 95 | 99 = 99,
): ParametricVarResult {
  const zScore = confidence === 99 ? 2.326348 : 1.644854;
  const safePort = Math.max(0, portfolioUsd);
  const safeVol = Math.max(0, annualVolPct) / 100;
  const safeDays = Math.max(1, horizonDays);
  const horizonVol = safeVol * Math.sqrt(safeDays / 252);
  const varUsd = safePort * zScore * horizonVol;
  return {
    portfolioUsd: safePort,
    annualVolPct,
    horizonDays: safeDays,
    confidence,
    zScore,
    varUsd,
    pctOfPortfolio: safePort > 0 ? (varUsd / safePort) * 100 : 0,
  };
}

interface LiveFxData {
  updatedUtc: string;
  rates: Record<string, number>;
  source: string;
}

interface LiveCryptoAsset {
  id: string;
  symbol: string;
  priceUsd: number;
  change24hPct: number;
}

async function fetchLiveFxRates(): Promise<LiveFxData> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { "user-agent": "Noctis-Global-Markets/1.0" },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return { updatedUtc: "", rates: {}, source: `ExchangeRate API HTTP ${res.status}` };
    const data = (await res.json()) as {
      result?: string;
      time_last_update_utc?: string;
      rates?: Record<string, number>;
    };
    if (!data.rates || typeof data.rates !== "object") {
      return { updatedUtc: "", rates: {}, source: "ExchangeRate payload invalid" };
    }
    return {
      updatedUtc: String(data.time_last_update_utc || ""),
      rates: data.rates,
      source: "ExchangeRate-API v6 Open Feed (USD Base)",
    };
  } catch {
    return { updatedUtc: "", rates: {}, source: "ExchangeRate API unavailable" };
  }
}

async function fetchLiveCryptoSpot(): Promise<{ assets: LiveCryptoAsset[]; source: string }> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
      {
        headers: { "user-agent": "Noctis-Global-Markets/1.0" },
        signal: AbortSignal.timeout(6500),
      },
    );
    if (!res.ok) return { assets: [], source: `CoinGecko HTTP ${res.status}` };
    const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const mapping: Array<[string, string]> = [
      ["bitcoin", "BTC"],
      ["ethereum", "ETH"],
      ["solana", "SOL"],
    ];
    const assets: LiveCryptoAsset[] = [];
    for (const [id, symbol] of mapping) {
      const row = data?.[id];
      if (row && typeof row.usd === "number") {
        assets.push({
          id,
          symbol,
          priceUsd: row.usd,
          change24hPct: Number(row.usd_24h_change ?? 0),
        });
      }
    }
    return { assets, source: "CoinGecko Live Spot API" };
  } catch {
    return { assets: [], source: "CoinGecko API unavailable" };
  }
}

function parseCurrencyConversionRequest(prompt: string): {
  amount: number;
  fromCode: string;
  toCode: string;
} {
  const knownCodes = Object.keys(DEFAULT_CURRENCY_NAMES);
  const codeUnion = knownCodes.join("|");
  const pairRe = new RegExp(
    `(?:([\\d,.]+)\\s*)?\\b(${codeUnion})\\b\\s*(?:to|in|->|\\/|versus|vs)\\s*\\b(${codeUnion})\\b`,
    "i",
  );
  const m = prompt.match(pairRe);
  if (m?.[2] && m?.[3]) {
    const amt = m[1] ? Number(m[1].replace(/,/g, "")) : 1000;
    return {
      amount: Number.isFinite(amt) && amt > 0 ? amt : 1000,
      fromCode: m[2].toUpperCase(),
      toCode: m[3].toUpperCase(),
    };
  }
  const singleMention = [...prompt.toUpperCase().matchAll(new RegExp(`\\b(${codeUnion})\\b`, "g"))].map((x) => x[1]!);
  const nonUsd = singleMention.find((c) => c !== "USD");
  const amtMatch = prompt.match(/(?:\$|\bamount\s*(?:=|:)?\s*)([\d,.]+)/i);
  const parsedAmt = amtMatch?.[1] ? Number(amtMatch[1].replace(/,/g, "")) : 1000;
  return {
    amount: Number.isFinite(parsedAmt) && parsedAmt > 0 ? parsedAmt : 1000,
    fromCode: "USD",
    toCode: nonUsd || "GHS",
  };
}

export async function executeGlobalMarketsQuery(prompt: string): Promise<string> {
  const convReq = parseCurrencyConversionRequest(prompt);
  const nomMatch = prompt.match(/(\d+(?:\.\d+)?)\s*%?\s*nominal/i);
  const infMatch = prompt.match(/(\d+(?:\.\d+)?)\s*%?\s*inflation/i);
  const volMatch = prompt.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:annual\s+)?vol(?:atility)?/i);
  const portMatch = prompt.match(/(?:portfolio|var)\s*(?:of|=|:)?\s*\$?([\d,.]+)/i);

  const [fx, crypto] = await Promise.all([fetchLiveFxRates(), fetchLiveCryptoSpot()]);

  const fromRate = convReq.fromCode === "USD" ? 1 : fx.rates[convReq.fromCode] ?? 0;
  const toRate = convReq.toCode === "USD" ? 1 : fx.rates[convReq.toCode] ?? 0;
  const converted = fromRate > 0 && toRate > 0 ? convertCurrencyAmount(convReq.amount, fromRate, toRate) : 0;
  const unitRate = fromRate > 0 && toRate > 0 ? convertCurrencyAmount(1, fromRate, toRate) : 0;

  const nominalPct = nomMatch?.[1] ? Number(nomMatch[1]) : 8.0;
  const inflationPct = infMatch?.[1] ? Number(infMatch[1]) : 3.2;
  const fisher = computeFisherRealYield(nominalPct, inflationPct);

  const portfolioUsd = portMatch?.[1] ? Number(portMatch[1].replace(/,/g, "")) : 1_000_000;
  const annualVolPct = volMatch?.[1] ? Number(volMatch[1]) : 18.0;
  const varRes = computeParametricVaR(
    Number.isFinite(portfolioUsd) && portfolioUsd > 0 ? portfolioUsd : 1_000_000,
    annualVolPct,
    10,
    99,
  );

  const btc = crypto.assets.find((a) => a.symbol === "BTC");
  const eurRate = fx.rates.EUR;
  const ghsRate = fx.rates.GHS;
  const riskLevel: "low" | "moderate" | "high" =
    fisher.exactRealPct < 0 || (btc && btc.change24hPct <= -5) ? "moderate" : "low";

  const watchCodes = ["EUR", "GBP", "GHS", "JPY", "CAD", "NGN", "KES", "ZAR"].filter((c) => fx.rates[c] !== undefined);
  const dashboardPayload = {
    title: `Global FX, Crypto & Sovereign Macro Desk (${convReq.fromCode}→${convReq.toCode})`,
    subtitle: `${fx.source}${fx.updatedUtc ? ` · ${fx.updatedUtc}` : ""}`,
    riskLevel,
    kpis: [
      {
        label: `${convReq.fromCode}/${convReq.toCode} Live Rate`,
        value: unitRate > 0 ? unitRate.toFixed(unitRate >= 100 ? 2 : 4) : "Unavailable",
        sub:
          converted > 0
            ? `${convReq.amount.toLocaleString()} ${convReq.fromCode} = ${converted.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${convReq.toCode}`
            : fx.source,
      },
      {
        label: "Bitcoin Spot (USD)",
        value: btc ? `$${Math.round(btc.priceUsd).toLocaleString()}` : "Unavailable",
        sub: btc
          ? `24h ${btc.change24hPct >= 0 ? "+" : ""}${btc.change24hPct.toFixed(2)}% · ${crypto.source}`
          : crypto.source,
      },
      {
        label: "Fisher Exact Real Yield",
        value: `${fisher.exactRealPct.toFixed(2)}%`,
        sub: `Nominal ${fisher.nominalRatePct.toFixed(1)}% vs Inflation ${fisher.inflationPct.toFixed(1)}%`,
      },
      {
        label: "10-Day 99% Parametric VaR",
        value: `$${Math.round(varRes.varUsd).toLocaleString()}`,
        sub: `${varRes.pctOfPortfolio.toFixed(2)}% of $${Math.round(varRes.portfolioUsd).toLocaleString()} (${annualVolPct}% vol)`,
      },
    ],
    ...(watchCodes.length
      ? {
          bars: {
            title: "Units per 1 USD (Live Exchange Rates)",
            items: watchCodes.slice(0, 6).map((code) => {
              const rate = fx.rates[code]!;
              return {
                label: `${code} (${DEFAULT_CURRENCY_NAMES[code] || code})`,
                value: Number(Math.log10(Math.max(1, rate + 1)).toFixed(2)),
                max: 4,
                display: `1 USD = ${rate >= 100 ? rate.toFixed(2) : rate.toFixed(4)} ${code}`,
                tone: code === convReq.toCode ? "amber" : "emerald",
              };
            }),
          },
        }
      : {}),
  };

  const parts: string[] = [
    "## Global FX, Digital Assets & Sovereign Macro Brief",
    `\`\`\`noctis-dashboard\n${JSON.stringify(dashboardPayload)}\n\`\`\``,
  ];

  if (converted > 0) {
    parts.push(
      [
        `### 1. Live FX Conversion (${convReq.fromCode} → ${convReq.toCode})`,
        `- **Spot Cross Rate:** **1 ${convReq.fromCode} = ${unitRate.toFixed(unitRate >= 100 ? 2 : 4)} ${convReq.toCode}**`,
        `- **Converted Amount:** **${convReq.amount.toLocaleString("en-US")} ${convReq.fromCode} = ${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${convReq.toCode}**`,
        ...(eurRate && ghsRate ? [`- **Benchmark Benchmarks:** \`USD/EUR = ${eurRate.toFixed(4)}\` · \`USD/GHS = ${ghsRate.toFixed(4)}\``] : []),
      ].join("\n"),
    );
  }

  parts.push(
    [
      "### 2. Deterministic Macro & Quantitative Risk Metrics",
      `- **Fisher Equation (Exact vs. Approx Real Rate):** $(1 + i)/(1 + \\pi) - 1$ = **${fisher.exactRealPct.toFixed(3)}%** (Nominal ${fisher.nominalRatePct.toFixed(2)}%, Inflation ${fisher.inflationPct.toFixed(2)}%; nominal minus inflation approx: **${fisher.approxRealPct.toFixed(2)}%**)`,
      `- **Parametric Value-at-Risk (99%, 10-day):** **$${Math.round(varRes.varUsd).toLocaleString()}** (**${varRes.pctOfPortfolio.toFixed(2)}%** of $${Math.round(varRes.portfolioUsd).toLocaleString()} at ${varRes.annualVolPct}% annualized volatility)`,
    ].join("\n"),
  );

  if (crypto.assets.length) {
    parts.push(
      [
        "### 3. Live Digital Asset Spot Telemetry",
        "| Asset | Spot Price (USD) | 24h Change |",
        "| :--- | :--- | :--- |",
        ...crypto.assets.map(
          (a) =>
            `| **${a.symbol}** | $${a.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${a.change24hPct >= 0 ? "+" : ""}${a.change24hPct.toFixed(2)}% |`,
        ),
      ].join("\n"),
    );
  }

  if (watchCodes.length) {
    parts.push(
      [
        "### 4. Major Global FX Reference Rates (Base: 1 USD)",
        "| Currency | Name | Rate per 1 USD |",
        "| :--- | :--- | :--- |",
        ...watchCodes.map(
          (c) =>
            `| **${c}** | ${DEFAULT_CURRENCY_NAMES[c] || c} | ${fx.rates[c]! >= 100 ? fx.rates[c]!.toFixed(2) : fx.rates[c]!.toFixed(4)} |`,
        ),
      ].join("\n"),
    );
  }

  parts.push(`**Live Sources Checked:** ${fx.source} · ${crypto.source}`);
  return parts.join("\n\n");
}
