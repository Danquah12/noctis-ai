/**
 * Noctis Earth Hazards, Seismology & Air Quality Live Telemetry Engine (`/earth`)
 *
 * Combines live USGS M4.5+ earthquakes, NASA EONET natural disasters (wildfires, volcanoes,
 * severe storms, sea ice), and Open-Meteo Global Air Quality (`US AQI`, `PM2.5`, `PM10`, `O3`, `UV`)
 * with deterministic seismic moment energy and tsunami travel-time physics.
 *
 * Pure TypeScript with no `@/` path aliases so it runs natively under Vite SSR,
 * tsx, and `node --experimental-strip-types --test`.
 */

const G_EARTH_MS2 = 9.80665;
const JOULES_PER_TON_TNT = 4.184e9;

export interface SeismicEnergyResult {
  magnitude: number;
  seismicMomentNm: number;
  radiatedEnergyJoules: number;
  tntEquivalentTons: number;
  severityClass: string;
}

export interface TsunamiTravelResult {
  oceanDepthMeters: number;
  distanceKm: number;
  waveSpeedMs: number;
  waveSpeedKmH: number;
  etaMinutes: number;
  etaHours: number;
}

export interface AqiClassification {
  usAqi: number;
  category: string;
  riskLevel: "low" | "moderate" | "high";
  advisory: string;
}

export function computeSeismicMomentEnergy(magnitude: number): SeismicEnergyResult {
  const m = Math.max(0, Math.min(10, magnitude));
  // Kanamori moment-magnitude relation & Gutenberg-Richter radiated energy relation
  const log10M0 = 1.5 * m + 9.1;
  const seismicMomentNm = Math.pow(10, log10M0);
  const log10E = 1.5 * m + 4.8;
  const radiatedEnergyJoules = Math.pow(10, log10E);
  const tntEquivalentTons = radiatedEnergyJoules / JOULES_PER_TON_TNT;

  let severityClass = "Light / Minor";
  if (m >= 8.0) severityClass = "Great Earthquake (Basin-Wide Destructive + Major Tsunami Risk)";
  else if (m >= 7.0) severityClass = "Major Earthquake (Serious Damage + Tsunamigenic Potential)";
  else if (m >= 6.0) severityClass = "Strong Earthquake (Significant Regional Shaking)";
  else if (m >= 5.0) severityClass = "Moderate Earthquake";

  return {
    magnitude: m,
    seismicMomentNm,
    radiatedEnergyJoules,
    tntEquivalentTons,
    severityClass,
  };
}

export function computeTsunamiWaveSpeed(oceanDepthMeters: number, distanceKm = 1000): TsunamiTravelResult {
  const depth = Math.max(10, oceanDepthMeters);
  const dist = Math.max(1, distanceKm);
  const speedMs = Math.sqrt(G_EARTH_MS2 * depth);
  const speedKmH = speedMs * 3.6;
  const etaHours = dist / speedKmH;
  return {
    oceanDepthMeters: depth,
    distanceKm: dist,
    waveSpeedMs: speedMs,
    waveSpeedKmH: speedKmH,
    etaHours,
    etaMinutes: etaHours * 60,
  };
}

export function classifyUsAqi(aqi: number): AqiClassification {
  const val = Math.max(0, Number.isFinite(aqi) ? aqi : 0);
  if (val > 300) {
    return {
      usAqi: val,
      category: "Hazardous",
      riskLevel: "high",
      advisory: "Health warning of emergency conditions: everyone should avoid all outdoor exertion.",
    };
  }
  if (val > 200) {
    return {
      usAqi: val,
      category: "Very Unhealthy",
      riskLevel: "high",
      advisory: "Significant respiratory alert: stay indoors with HEPA filtration.",
    };
  }
  if (val > 150) {
    return {
      usAqi: val,
      category: "Unhealthy",
      riskLevel: "high",
      advisory: "General public may experience effects; avoid prolonged outdoor activity.",
    };
  }
  if (val > 100) {
    return {
      usAqi: val,
      category: "Unhealthy for Sensitive Groups",
      riskLevel: "moderate",
      advisory: "Asthma, cardiac, elderly, and pediatric groups should reduce prolonged outdoor exertion.",
    };
  }
  if (val > 50) {
    return {
      usAqi: val,
      category: "Moderate",
      riskLevel: "moderate",
      advisory: "Acceptable air quality; unusually sensitive individuals should monitor symptoms.",
    };
  }
  return {
    usAqi: val,
    category: "Good",
    riskLevel: "low",
    advisory: "Clean air quality posing little or no atmospheric respiratory risk.",
  };
}

interface UsgsQuake {
  id: string;
  mag: number;
  place: string;
  depthKm: number;
  timeIso: string;
  tsunamiFlag: boolean;
}

interface EonetEvent {
  id: string;
  title: string;
  category: string;
  updatedIso: string;
}

interface CityAirQuality {
  locationDisplay: string;
  usAqi: number;
  pm25: number;
  pm10: number;
  ozone: number;
  no2: number;
  uvIndex: number;
  hourlyAqi: Array<{ hour: string; aqi: number }>;
}

async function fetchUsgsEarthquakes(): Promise<{ quakes: UsgsQuake[]; source: string }> {
  try {
    const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson", {
      headers: { "user-agent": "Noctis-Earth-Hazards/1.0" },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return { quakes: [], source: `USGS HTTP ${res.status}` };
    const data = (await res.json()) as {
      features?: Array<{
        id?: string;
        properties?: { mag?: number; place?: string; time?: number; tsunami?: number };
        geometry?: { coordinates?: number[] };
      }>;
    };
    const quakes: UsgsQuake[] = (data.features || [])
      .map((f) => ({
        id: String(f.id || "eq"),
        mag: Number(f.properties?.mag ?? 0),
        place: String(f.properties?.place || "Unknown Region"),
        depthKm: Number(f.geometry?.coordinates?.[2] ?? 10),
        timeIso: f.properties?.time ? new Date(f.properties.time).toISOString() : "",
        tsunamiFlag: Number(f.properties?.tsunami ?? 0) === 1,
      }))
      .sort((a, b) => b.mag - a.mag)
      .slice(0, 8);
    return { quakes, source: "USGS Earthquake Hazards Feed (M4.5+ 24h)" };
  } catch {
    return { quakes: [], source: "USGS Earthquake feed unavailable" };
  }
}

async function fetchNasaEonetEvents(): Promise<{ events: EonetEvent[]; source: string }> {
  try {
    const res = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=8", {
      headers: { "user-agent": "Noctis-Earth-Hazards/1.0" },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return { events: [], source: `NASA EONET HTTP ${res.status}` };
    const data = (await res.json()) as {
      events?: Array<{
        id?: string;
        title?: string;
        categories?: Array<{ title?: string }>;
        geometry?: Array<{ date?: string }>;
      }>;
    };
    const events: EonetEvent[] = (data.events || []).slice(0, 8).map((ev) => ({
      id: String(ev.id || "EONET"),
      title: String(ev.title || "Natural Event"),
      category: String(ev.categories?.[0]?.title || "Hazard"),
      updatedIso: String(ev.geometry?.[ev.geometry.length - 1]?.date || ""),
    }));
    return { events, source: "NASA EONET Open Earth Observatory" };
  } catch {
    return { events: [], source: "NASA EONET unavailable" };
  }
}

function extractCityForAirQuality(prompt: string): string | null {
  const cleaned = prompt
    .replace(/\b(?:earthquakes?|tsunamis?|wildfires?|volcanoes?|aqi|air\s+quality|pm2\.5|pm10|smoke|uv\s+index|live|check|show|current|hazards?|in|for|at)\b/gi, " ")
    .replace(/[^\p{L}\s,'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const prepMatch = prompt.match(
    /\b(?:in|for|at|around|near)\s+([A-Z\p{L}][\p{L}\s,.'-]{1,40}?)(?:\s+(?:and|with|today|right|please)|[?.!]|$)/u,
  );
  const raw = prepMatch?.[1]?.trim() || (cleaned.length >= 2 && cleaned.split(/\s+/).length <= 4 ? cleaned : "");
  if (!raw || /\b(usgs|nasa|eonet|world|global|earth|tsunami|ocean)\b/i.test(raw)) return null;
  return raw;
}

async function fetchCityAirQuality(cityQuery: string): Promise<{ aq: CityAirQuality | null; source: string }> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`,
      { headers: { "user-agent": "Noctis-Earth-Hazards/1.0" }, signal: AbortSignal.timeout(5500) },
    );
    if (!geoRes.ok) return { aq: null, source: "Geocoding unavailable" };
    const geo = (await geoRes.json()) as {
      results?: Array<{ name?: string; admin1?: string; country?: string; latitude?: number; longitude?: number }>;
    };
    const place = geo.results?.[0];
    if (!place || typeof place.latitude !== "number" || typeof place.longitude !== "number") {
      return { aq: null, source: `Location '${cityQuery}' not geocoded` };
    }
    const aqRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,uv_index&hourly=us_aqi&forecast_days=1`,
      { headers: { "user-agent": "Noctis-Earth-Hazards/1.0" }, signal: AbortSignal.timeout(5500) },
    );
    if (!aqRes.ok) return { aq: null, source: `Open-Meteo Air Quality HTTP ${aqRes.status}` };
    const aqData = (await aqRes.json()) as {
      current?: {
        us_aqi?: number;
        pm2_5?: number;
        pm10?: number;
        ozone?: number;
        nitrogen_dioxide?: number;
        uv_index?: number;
      };
      hourly?: { time?: string[]; us_aqi?: number[] };
    };
    const c = aqData.current || {};
    const times = aqData.hourly?.time || [];
    const vals = aqData.hourly?.us_aqi || [];
    const hourlyAqi = times.slice(0, 12).map((t, i) => ({
      hour: t.slice(11, 16) || t,
      aqi: Number(vals[i] ?? c.us_aqi ?? 0),
    }));
    const locationDisplay = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
    return {
      aq: {
        locationDisplay,
        usAqi: Number(c.us_aqi ?? 0),
        pm25: Number(c.pm2_5 ?? 0),
        pm10: Number(c.pm10 ?? 0),
        ozone: Number(c.ozone ?? 0),
        no2: Number(c.nitrogen_dioxide ?? 0),
        uvIndex: Number(c.uv_index ?? 0),
        hourlyAqi,
      },
      source: "Open-Meteo Copernicus Atmospheric Air Quality",
    };
  } catch {
    return { aq: null, source: "Air quality feed unavailable" };
  }
}

export async function executeEarthHazardsQuery(prompt: string): Promise<string> {
  const city = extractCityForAirQuality(prompt) || (/\b(aqi|air\s+quality|pm2\.5|uv\s+index)\b/i.test(prompt) ? "Laurel, Maryland" : null);
  const tsunamiDepthMatch = prompt.match(/(?:depth|ocean)\s*(?:of|=|:)?\s*([\d,.]+)\s*m\b/i);
  const tsunamiDistMatch = prompt.match(/([\d,.]+)\s*km\b/i);
  const magMatch = prompt.match(/\bM\s*([\d.]+)|\bmagnitude\s*([\d.]+)/i);

  const [usgsOut, eonetOut, aqOut] = await Promise.all([
    fetchUsgsEarthquakes(),
    fetchNasaEonetEvents(),
    city ? fetchCityAirQuality(city) : Promise.resolve({ aq: null, source: "Not requested" }),
  ]);

  const strongQuake = usgsOut.quakes[0] || null;
  const evalMag = Number(magMatch?.[1] || magMatch?.[2] || strongQuake?.mag || 6.0);
  const seismic = computeSeismicMomentEnergy(Number.isFinite(evalMag) ? evalMag : 6.0);
  const tsunami =
    /\btsunami\b/i.test(prompt) || strongQuake?.tsunamiFlag
      ? computeTsunamiWaveSpeed(
          tsunamiDepthMatch ? Number(tsunamiDepthMatch[1]!.replace(/,/g, "")) : 4000,
          tsunamiDistMatch ? Number(tsunamiDistMatch[1]!.replace(/,/g, "")) : 1200,
        )
      : null;

  const aqiClass = aqOut.aq ? classifyUsAqi(aqOut.aq.usAqi) : null;
  const riskLevel: "low" | "moderate" | "high" =
    (strongQuake && strongQuake.mag >= 6.5) || aqiClass?.riskLevel === "high"
      ? "high"
      : (strongQuake && strongQuake.mag >= 5.5) || aqiClass?.riskLevel === "moderate"
        ? "moderate"
        : "low";

  const dashboardPayload = {
    title: aqOut.aq
      ? `Planetary Hazards & Air Quality — ${aqOut.aq.locationDisplay}`
      : "Global Earth Hazards, Seismology & EONET Observatory",
    subtitle: `${usgsOut.quakes.length} USGS M4.5+ quakes (24h) · ${eonetOut.events.length} NASA EONET active events`,
    riskLevel,
    kpis: [
      {
        label: "Peak 24h Earthquake",
        value: strongQuake ? `M${strongQuake.mag.toFixed(1)}` : "None >= 4.5",
        sub: strongQuake ? strongQuake.place.slice(0, 42) : usgsOut.source,
      },
      {
        label: "Active NASA EONET Events",
        value: String(eonetOut.events.length),
        sub: eonetOut.events[0] ? `${eonetOut.events[0].category}: ${eonetOut.events[0].title.slice(0, 28)}` : eonetOut.source,
      },
      {
        label: aqOut.aq ? `US AQI (${aqOut.aq.locationDisplay.split(",")[0]})` : "Seismic Radiated Energy",
        value: aqOut.aq ? `${Math.round(aqOut.aq.usAqi)} AQI` : `${Math.round(seismic.tntEquivalentTons).toLocaleString()} t TNT`,
        sub: aqOut.aq
          ? `${aqiClass?.category} · PM2.5 ${aqOut.aq.pm25.toFixed(1)} µg/m³`
          : `M${seismic.magnitude.toFixed(1)} moment energy`,
      },
      {
        label: tsunami ? "Tsunami Shallow Speed" : "UV / PM10 Telemetry",
        value: tsunami ? `${Math.round(tsunami.waveSpeedKmH)} km/h` : aqOut.aq ? `UV ${aqOut.aq.uvIndex.toFixed(1)}` : "Nominal",
        sub: tsunami
          ? `${tsunami.etaHours.toFixed(2)} hr over ${tsunami.distanceKm} km @ ${tsunami.oceanDepthMeters}m`
          : aqOut.aq
            ? `PM10 ${aqOut.aq.pm10.toFixed(1)} µg/m³ · O₃ ${Math.round(aqOut.aq.ozone)} µg/m³`
            : "Specify any city for live AQI/UV",
      },
    ],
    ...(aqOut.aq?.hourlyAqi.length
      ? {
          trend: {
            title: `24h US AQI Trajectory — ${aqOut.aq.locationDisplay}`,
            seriesLabel: "US AQI",
            points: aqOut.aq.hourlyAqi.map((h) => ({
              label: h.hour,
              value: Math.round(h.aqi),
              display: `${Math.round(h.aqi)} AQI`,
            })),
          },
        }
      : {}),
    ...(usgsOut.quakes.length
      ? {
          bars: {
            title: "Strongest Global Earthquakes (Last 24h, Magnitude >= 4.5)",
            items: usgsOut.quakes.slice(0, 6).map((q) => ({
              label: q.place.slice(0, 38),
              value: Number(q.mag.toFixed(1)),
              max: 9,
              display: `M${q.mag.toFixed(1)} · ${q.depthKm.toFixed(0)} km depth${q.tsunamiFlag ? " · TSUNAMI FLAG" : ""}`,
              tone: q.mag >= 6.5 ? "rose" : q.mag >= 5.5 ? "amber" : "emerald",
            })),
          },
        }
      : {}),
  };

  const parts: string[] = [
    "## Planetary Earth Hazards, Seismic & Air Quality Telemetry",
    `\`\`\`noctis-dashboard\n${JSON.stringify(dashboardPayload)}\n\`\`\``,
  ];

  if (aqOut.aq && aqiClass) {
    parts.push(
      [
        `### Air Quality & Atmospheric Exposure — ${aqOut.aq.locationDisplay}`,
        `- **US AQI:** **${Math.round(aqOut.aq.usAqi)} (${aqiClass.category})** — ${aqiClass.advisory}`,
        `- **Particulates:** PM2.5 **${aqOut.aq.pm25.toFixed(1)} µg/m³** · PM10 **${aqOut.aq.pm10.toFixed(1)} µg/m³**`,
        `- **Trace Gases & Radiation:** Ozone **${aqOut.aq.ozone.toFixed(1)} µg/m³** · NO₂ **${aqOut.aq.no2.toFixed(1)} µg/m³** · UV Index **${aqOut.aq.uvIndex.toFixed(1)}**`,
      ].join("\n"),
    );
  }

  if (tsunami || magMatch) {
    parts.push(
      [
        "### Deterministic Geophysical Physics",
        `- **Magnitude M${seismic.magnitude.toFixed(1)}:** Moment $M_0$ = **${seismic.seismicMomentNm.toExponential(2)} N·m**, Radiated Energy = **${Math.round(seismic.tntEquivalentTons).toLocaleString()} tons TNT** (${seismic.severityClass}).`,
        ...(tsunami
          ? [
              `- **Tsunami Shallow-Water Celerity (c = √gh at ${tsunami.oceanDepthMeters} m):** **${tsunami.waveSpeedMs.toFixed(1)} m/s (${Math.round(tsunami.waveSpeedKmH)} km/h)** → **${tsunami.etaHours.toFixed(2)} hr (${Math.round(tsunami.etaMinutes)} min)** across **${tsunami.distanceKm} km**.`,
            ]
          : []),
      ].join("\n"),
    );
  }

  if (usgsOut.quakes.length) {
    parts.push(
      [
        "### Live USGS Earthquakes (M4.5+ Last 24 Hours)",
        "| Mag | Region | Depth | Time (UTC) | Tsunami |",
        "| :--- | :--- | :--- | :--- | :--- |",
        ...usgsOut.quakes.slice(0, 6).map(
          (q) => `| **M${q.mag.toFixed(1)}** | ${q.place} | ${q.depthKm.toFixed(1)} km | ${q.timeIso.slice(0, 16).replace("T", " ")} | ${q.tsunamiFlag ? "Alert" : "No"} |`,
        ),
      ].join("\n"),
    );
  }

  if (eonetOut.events.length) {
    parts.push(
      [
        "### NASA EONET Active Global Natural Events",
        "| Category | Event | Latest Update |",
        "| :--- | :--- | :--- |",
        ...eonetOut.events.slice(0, 6).map(
          (ev) => `| **${ev.category}** | ${ev.title} | ${ev.updatedIso.slice(0, 10) || "Active"} |`,
        ),
      ].join("\n"),
    );
  }

  parts.push(
    `**Live Sources Checked:** ${usgsOut.source} · ${eonetOut.source}${aqOut.aq ? ` · ${aqOut.source}` : ""}`,
  );

  return parts.join("\n\n");
}
