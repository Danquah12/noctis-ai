/**
 * Noctis Data Analysis Studio (`Studio 2`)
 * Capabilities #8 (Data Analysis), #30 (Interactive Charts), #31 (Interactive Maps & Routes), #87 (Dashboards)
 */

import { parseUploadedTabularFile } from "./document-studio.server.ts";

export interface NumericColumnStats {
  column: string;
  count: number;
  nulls: number;
  sum: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  outliers: { rowIndex: number; value: number; method: "IQR" | "Z_SCORE"; zScore: number }[];
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return Number((sorted[lo]! * (1 - frac) + sorted[hi]! * frac).toFixed(4));
}

export function analyzeTabularDataset(input: {
  rawText: string;
  filename?: string;
  filterColumn?: string;
  filterValue?: string;
  groupByColumn?: string;
  valueColumn?: string;
}) {
  const parsed = parseUploadedTabularFile(input.filename || "dataset.csv", input.rawText);
  const { headers } = parsed;
  let rows: string[][] = parsed.rows;

  // Optional SQL-like WHERE filter
  if (input.filterColumn && input.filterValue !== undefined && input.filterValue !== "") {
    const fIdx = headers.indexOf(input.filterColumn);
    if (fIdx >= 0) {
      const target = input.filterValue.toLowerCase();
      rows = rows.filter((r) => String(r[fIdx] ?? "").toLowerCase() === target);
    }
  }

  const numericStats: NumericColumnStats[] = [];
  const colValues: Record<string, number[]> = {};

  headers.forEach((col, cIdx) => {
    const parsedNums: { rowIndex: number; val: number }[] = [];
    let nulls = 0;
    rows.forEach((r, rIdx) => {
      const cell = String(r[cIdx] ?? "").replace(/[$,%\s,]/g, "");
      if (!cell || cell === "null" || cell === "NA") {
        nulls += 1;
      } else {
        const n = Number(cell);
        if (Number.isFinite(n)) parsedNums.push({ rowIndex: rIdx, val: n });
      }
    });

    if (parsedNums.length >= Math.max(2, Math.floor(rows.length * 0.6))) {
      const vals = parsedNums.map((x) => x.val);
      colValues[col] = vals;
      const sorted = [...vals].sort((a, b) => a - b);
      const sum = Number(vals.reduce((a, b) => a + b, 0).toFixed(4));
      const mean = Number((sum / vals.length).toFixed(4));
      const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / Math.max(1, vals.length);
      const stdDev = Number(Math.sqrt(variance).toFixed(4));
      const q1 = quantile(sorted, 0.25);
      const median = quantile(sorted, 0.5);
      const q3 = quantile(sorted, 0.75);
      const iqr = Number((q3 - q1).toFixed(4));
      const lowFence = q1 - 1.5 * iqr;
      const highFence = q3 + 1.5 * iqr;

      const outliers: NumericColumnStats["outliers"] = [];
      for (const p of parsedNums) {
        const z = stdDev > 0 ? Number(((p.val - mean) / stdDev).toFixed(2)) : 0;
        if (Math.abs(z) >= 2.5 || p.val < lowFence || p.val > highFence) {
          outliers.push({
            rowIndex: p.rowIndex + 1,
            value: p.val,
            method: Math.abs(z) >= 2.5 ? "Z_SCORE" : "IQR",
            zScore: z,
          });
        }
      }

      numericStats.push({
        column: col,
        count: vals.length,
        nulls,
        sum,
        mean,
        median,
        stdDev,
        min: sorted[0]!,
        max: sorted[sorted.length - 1]!,
        q1,
        q3,
        iqr,
        outliers,
      });
    }
  });

  // Pearson correlation & simple OLS linear regression for first 2 numeric columns
  const correlations: { colX: string; colY: string; pearsonR: number; slope: number; intercept: number; rSquared: number }[] = [];
  if (numericStats.length >= 2) {
    const colX = numericStats[0]!.column;
    const colY = numericStats[1]!.column;
    const xIdx = headers.indexOf(colX);
    const yIdx = headers.indexOf(colY);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const r of rows) {
      const x = Number(String(r[xIdx] ?? "").replace(/[$,%\s,]/g, ""));
      const y = Number(String(r[yIdx] ?? "").replace(/[$,%\s,]/g, ""));
      if (Number.isFinite(x) && Number.isFinite(y)) {
        xs.push(x);
        ys.push(y);
      }
    }
    if (xs.length >= 2) {
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      let num = 0;
      let denX = 0;
      let denY = 0;
      for (let i = 0; i < xs.length; i++) {
        const dx = xs[i]! - mx;
        const dy = ys[i]! - my;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const r = denX > 0 && denY > 0 ? Number((num / Math.sqrt(denX * denY)).toFixed(4)) : 0;
      const slope = denX > 0 ? Number((num / denX).toFixed(4)) : 0;
      const intercept = Number((my - slope * mx).toFixed(4));
      correlations.push({
        colX,
        colY,
        pearsonR: r,
        slope,
        intercept,
        rSquared: Number((r * r).toFixed(4)),
      });
    }
  }

  // Optional SQL-like GROUP BY aggregation + primary interactive chart spec
  let groupedAggregation: { group: string; count: number; sum: number; mean: number }[] = [];
  const catCol = input.groupByColumn || headers.find((h) => !numericStats.some((n) => n.column === h)) || headers[0];
  const valCol = input.valueColumn || numericStats[0]?.column;
  if (catCol && valCol) {
    const gIdx = headers.indexOf(catCol);
    const vIdx = headers.indexOf(valCol);
    if (gIdx >= 0 && vIdx >= 0) {
      const map = new Map<string, { count: number; sum: number }>();
      for (const r of rows) {
        const key = String(r[gIdx] ?? "Other");
        const v = Number(String(r[vIdx] ?? "").replace(/[$,%\s,]/g, "")) || 0;
        const prev = map.get(key) || { count: 0, sum: 0 };
        prev.count += 1;
        prev.sum += v;
        map.set(key, prev);
      }
      groupedAggregation = [...map.entries()].map(([group, agg]) => ({
        group,
        count: agg.count,
        sum: Number(agg.sum.toFixed(2)),
        mean: Number((agg.sum / agg.count).toFixed(2)),
      }));
    }
  }

  const chartSpec = buildInteractiveChartSpec({
    title: valCol ? `${valCol} by ${catCol}` : "Dataset Overview",
    chartType: "bar",
    labels: groupedAggregation.slice(0, 12).map((g) => g.group),
    series: [{ name: valCol || "Count", data: groupedAggregation.slice(0, 12).map((g) => g.sum) }],
  });

  return {
    format: parsed.format,
    headers,
    totalRowsAnalyzed: rows.length,
    numericStats,
    anomalyCount: numericStats.reduce((a, s) => a + s.outliers.length, 0),
    correlationsAndRegression: correlations,
    groupedAggregation,
    chartSpec,
  };
}

/** #30 Interactive Chart Spec Builder */
export function buildInteractiveChartSpec(input: {
  title: string;
  chartType: "bar" | "line" | "area" | "scatter" | "pie";
  labels: string[];
  series: { name: string; data: number[] }[];
}) {
  const safeLabels = input.labels.slice(0, 30);
  const safeSeries = input.series.map((s) => ({
    name: s.name,
    data: s.data.slice(0, 30).map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0)),
  }));
  const allVals = safeSeries.flatMap((s) => s.data);
  const minVal = allVals.length > 0 ? Math.min(0, ...allVals) : 0;
  const maxVal = allVals.length > 0 ? Math.max(1, ...allVals) : 1;

  return {
    title: input.title,
    chartType: input.chartType,
    labels: safeLabels,
    series: safeSeries,
    yDomain: [minVal, maxVal],
  };
}

const CITY_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  "new york": { lat: 40.7128, lon: -74.006, label: "New York, US" },
  "washington": { lat: 38.9072, lon: -77.0369, label: "Washington, D.C., US" },
  "baltimore": { lat: 39.2904, lon: -76.6122, label: "Baltimore, MD" },
  "boston": { lat: 42.3601, lon: -71.0589, label: "Boston, MA" },
  "chicago": { lat: 41.8781, lon: -87.6298, label: "Chicago, IL" },
  "san francisco": { lat: 37.7749, lon: -122.4194, label: "San Francisco, CA" },
  "los angeles": { lat: 34.0522, lon: -118.2437, label: "Los Angeles, CA" },
  "houston": { lat: 29.7604, lon: -95.3698, label: "Houston, TX" },
  "atlanta": { lat: 33.749, lon: -84.388, label: "Atlanta, GA" },
  "miami": { lat: 25.7617, lon: -80.1918, label: "Miami, FL" },
  "seattle": { lat: 47.6062, lon: -122.3321, label: "Seattle, WA" },
  "norfolk": { lat: 36.8508, lon: -76.2859, label: "Norfolk Naval Base, VA" },
  "san diego": { lat: 32.7157, lon: -117.1611, label: "San Diego, CA" },
  "london": { lat: 51.5072, lon: -0.1276, label: "London, UK" },
  "paris": { lat: 48.8566, lon: 2.3522, label: "Paris, FR" },
  "frankfurt": { lat: 50.1109, lon: 8.6821, label: "Frankfurt, DE" },
  "brussels": { lat: 50.8503, lon: 4.3517, label: "Brussels, BE" },
  "accra": { lat: 5.6037, lon: -0.187, label: "Accra, GH" },
  "lagos": { lat: 6.5244, lon: 3.3792, label: "Lagos, NG" },
  "nairobi": { lat: -1.2921, lon: 36.8219, label: "Nairobi, KE" },
  "dubai": { lat: 25.2048, lon: 55.2708, label: "Dubai, UAE" },
  "singapore": { lat: 1.3521, lon: 103.8198, label: "Singapore, SG" },
  "tokyo": { lat: 35.6762, lon: 139.6503, label: "Tokyo, JP" },
  "seoul": { lat: 37.5665, lon: 126.978, label: "Seoul, KR" },
  "sydney": { lat: -33.8688, lon: 151.2093, label: "Sydney, AU" },
  "toronto": { lat: 43.6532, lon: -79.3832, label: "Toronto, CA" },
};

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLon / 2);
  const h =
    sin1 * sin1 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sin2 * sin2;
  return Number((2 * R * Math.asin(Math.sqrt(h))).toFixed(2));
}

/** #31 Interactive Map Waypoints, Haversine Distance & GeoJSON Route Planner */
export function planGeographicMapAndRoute(input: {
  locations: string[];
  mode?: "flight" | "drive" | "maritime";
}) {
  const mode = input.mode || "flight";
  const waypoints = input.locations
    .map((raw) => {
      const coordMatch = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (coordMatch) {
        return { label: raw, lat: parseFloat(coordMatch[1]!), lon: parseFloat(coordMatch[2]!) };
      }
      const key = Object.keys(CITY_COORDS).find((c) => raw.toLowerCase().includes(c));
      if (key) return CITY_COORDS[key]!;
      return null;
    })
    .filter((w): w is { lat: number; lon: number; label: string } => Boolean(w));

  const legs: { from: string; to: string; distanceKm: number; distanceMiles: number; estHours: number }[] = [];
  const speedKmh = mode === "flight" ? 850 : mode === "maritime" ? 38 : 95;
  let totalKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const km = haversineKm(waypoints[i]!, waypoints[i + 1]!);
    totalKm += km;
    legs.push({
      from: waypoints[i]!.label,
      to: waypoints[i + 1]!.label,
      distanceKm: km,
      distanceMiles: Number((km * 0.621371).toFixed(2)),
      estHours: Number((km / speedKmh).toFixed(2)),
    });
  }

  return {
    mode,
    waypoints,
    legs,
    totalDistanceKm: Number(totalKm.toFixed(2)),
    totalDistanceMiles: Number((totalKm * 0.621371).toFixed(2)),
    estimatedTotalHours: Number((totalKm / speedKmh).toFixed(2)),
    geoJson: {
      type: "FeatureCollection",
      features: [
        ...waypoints.map((w) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [w.lon, w.lat] },
          properties: { name: w.label },
        })),
        ...(waypoints.length >= 2
          ? [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: waypoints.map((w) => [w.lon, w.lat]),
                },
                properties: { mode, totalDistanceKm: Number(totalKm.toFixed(2)) },
              },
            ]
          : []),
      ],
    },
  };
}
