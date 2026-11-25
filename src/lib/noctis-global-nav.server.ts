/**
 * Noctis Global Aviation METAR & Maritime / Great-Circle Navigation Engine (`/nav`)
 *
 * Combines live NOAA Aviation Weather Center METAR telemetry with deterministic
 * aviation & maritime calculations: runway crosswind/headwind components, density altitude,
 * great-circle orthodromic distance/bearings, jet flight times, and global chokepoint routing.
 *
 * Pure TypeScript with no `@/` path aliases so it runs natively under Vite SSR,
 * tsx, and `node --experimental-strip-types --test`.
 */

const EARTH_RADIUS_KM = 6371.0;
const KM_PER_NM = 1.852;
const KM_PER_SM = 1.609344;

export interface GreatCircleResult {
  distanceKm: number;
  distanceNm: number;
  distanceMiles: number;
  initialBearingDeg: number;
  estJetHours460Kt: number;
  estShipDays18Kt: number;
}

export interface RunwayWindResult {
  windDirDeg: number;
  windSpeedKt: number;
  runwayHeadingDeg: number;
  headwindKt: number;
  crosswindKt: number;
  crosswindSide: "Left" | "Right" | "Calm";
}

export interface DensityAltitudeResult {
  elevationFt: number;
  altimeterInHg: number;
  tempC: number;
  pressureAltitudeFt: number;
  isaTempC: number;
  densityAltitudeFt: number;
}

export interface GeoHub {
  code: string;
  name: string;
  lat: number;
  lon: number;
  kind: "airport" | "port" | "chokepoint";
}

export const GLOBAL_NAV_HUBS: GeoHub[] = [
  { code: "KJFK", name: "John F. Kennedy Intl (New York)", lat: 40.6413, lon: -73.7781, kind: "airport" },
  { code: "KLAX", name: "Los Angeles Intl (Los Angeles)", lat: 33.9416, lon: -118.4085, kind: "airport" },
  { code: "KORD", name: "Chicago O'Hare Intl", lat: 41.9742, lon: -87.9073, kind: "airport" },
  { code: "KATL", name: "Hartsfield-Jackson Atlanta", lat: 33.6407, lon: -84.4277, kind: "airport" },
  { code: "KIAD", name: "Washington Dulles Intl", lat: 38.9531, lon: -77.4565, kind: "airport" },
  { code: "KDCA", name: "Reagan National Airport", lat: 38.8512, lon: -77.0402, kind: "airport" },
  { code: "KBWI", name: "Baltimore/Washington Intl", lat: 39.1774, lon: -76.6684, kind: "airport" },
  { code: "EGLL", name: "London Heathrow (London)", lat: 51.47, lon: -0.4543, kind: "airport" },
  { code: "LFPG", name: "Paris Charles de Gaulle", lat: 49.0097, lon: 2.5479, kind: "airport" },
  { code: "EDDF", name: "Frankfurt Airport", lat: 50.0379, lon: 8.5622, kind: "airport" },
  { code: "EHAM", name: "Amsterdam Schiphol", lat: 52.3105, lon: 4.7683, kind: "airport" },
  { code: "OMDB", name: "Dubai Intl", lat: 25.2532, lon: 55.3657, kind: "airport" },
  { code: "RJTT", name: "Tokyo Haneda", lat: 35.5494, lon: 139.7798, kind: "airport" },
  { code: "WSSS", name: "Singapore Changi", lat: 1.3644, lon: 103.9915, kind: "airport" },
  { code: "DGAA", name: "Kotoka Intl (Accra)", lat: 5.6052, lon: -0.1668, kind: "airport" },
  { code: "DNMM", name: "Murtala Muhammed Intl (Lagos)", lat: 6.5774, lon: 3.3212, kind: "airport" },
  { code: "FAOR", name: "O.R. Tambo Intl (Johannesburg)", lat: -26.1367, lon: 28.2411, kind: "airport" },
  { code: "YSSY", name: "Sydney Kingsford Smith", lat: -33.9399, lon: 151.1753, kind: "airport" },
  { code: "SBGR", name: "Sao Paulo Guarulhos", lat: -23.4356, lon: -46.4731, kind: "airport" },
  { code: "ROTTERDAM", name: "Port of Rotterdam", lat: 51.9244, lon: 4.4777, kind: "port" },
  { code: "SINGAPORE", name: "Port of Singapore", lat: 1.2644, lon: 103.822, kind: "port" },
  { code: "SHANGHAI", name: "Port of Shanghai", lat: 31.3667, lon: 121.6167, kind: "port" },
  { code: "TEMA", name: "Port of Tema", lat: 5.626, lon: 0.017, kind: "port" },
  { code: "SUEZ", name: "Suez Canal", lat: 30.5852, lon: 32.2654, kind: "chokepoint" },
  { code: "PANAMA", name: "Panama Canal", lat: 9.08, lon: -79.68, kind: "chokepoint" },
  { code: "MALACCA", name: "Strait of Malacca", lat: 2.5, lon: 101.2, kind: "chokepoint" },
  { code: "HORMUZ", name: "Strait of Hormuz", lat: 26.5667, lon: 56.25, kind: "chokepoint" },
  { code: "CAPE_GOOD_HOPE", name: "Cape of Good Hope", lat: -34.3568, lon: 18.474, kind: "chokepoint" },
];

export function computeGreatCircle(lat1: number, lon1: number, lat2: number, lon2: number): GreatCircleResult {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLam = toRad(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const distanceKm = EARTH_RADIUS_KM * c;
  const distanceNm = distanceKm / KM_PER_NM;
  const distanceMiles = distanceKm / KM_PER_SM;

  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;

  return {
    distanceKm,
    distanceNm,
    distanceMiles,
    initialBearingDeg: brng,
    estJetHours460Kt: distanceNm / 460,
    estShipDays18Kt: distanceNm / (18 * 24),
  };
}

export function computeRunwayWindComponents(
  windDirDeg: number,
  windSpeedKt: number,
  runwayHeadingDeg: number,
): RunwayWindResult {
  const wDir = ((windDirDeg % 360) + 360) % 360;
  const rwy = ((runwayHeadingDeg % 360) + 360) % 360;
  const spd = Math.max(0, windSpeedKt);
  const angleRad = ((wDir - rwy) * Math.PI) / 180;
  const headwindKt = spd * Math.cos(angleRad);
  const signedCrosswind = spd * Math.sin(angleRad);
  const absCross = Math.abs(signedCrosswind);
  const crosswindSide: "Left" | "Right" | "Calm" =
    absCross < 0.05 ? "Calm" : signedCrosswind > 0 ? "Right" : "Left";
  return {
    windDirDeg: wDir,
    windSpeedKt: spd,
    runwayHeadingDeg: rwy,
    headwindKt,
    crosswindKt: absCross,
    crosswindSide,
  };
}

export function computeDensityAltitude(
  elevationFt: number,
  altimeterInHg: number,
  tempC: number,
): DensityAltitudeResult {
  const pressureAltitudeFt = elevationFt + (29.92 - altimeterInHg) * 1000;
  const isaTempC = 15 - (pressureAltitudeFt / 1000) * 1.98;
  const densityAltitudeFt = pressureAltitudeFt + 120 * (tempC - isaTempC);
  return {
    elevationFt,
    altimeterInHg,
    tempC,
    pressureAltitudeFt,
    isaTempC,
    densityAltitudeFt,
  };
}

interface MetarReading {
  icaoId: string;
  name: string;
  rawOb: string;
  fltCat: string;
  tempC: number;
  dewpC: number;
  windDirDeg: number;
  windSpeedKt: number;
  altimHpa: number;
  altimInHg: number;
  visibMiles: string;
  elevFt: number;
  obsTime: string;
}

async function fetchLiveMetar(icao: string): Promise<{ metar: MetarReading | null; source: string }> {
  try {
    const res = await fetch(
      `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(icao)}&format=json`,
      {
        headers: { "user-agent": "Noctis-Aviation-Nav/1.0" },
        signal: AbortSignal.timeout(6500),
      },
    );
    if (!res.ok) return { metar: null, source: `NOAA AWC HTTP ${res.status}` };
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const m = rows?.[0];
    if (!m) return { metar: null, source: `No METAR returned for ${icao}` };
    const altimHpa = Number(m.altim ?? 1013.25);
    const altimInHg = altimHpa > 100 ? altimHpa * 0.02953 : altimHpa;
    const elevMeters = Number(m.elev ?? 10);
    return {
      metar: {
        icaoId: String(m.icaoId || icao),
        name: String(m.name || icao),
        rawOb: String(m.rawOb || ""),
        fltCat: String(m.fltCat || "VFR"),
        tempC: Number(m.temp ?? 15),
        dewpC: Number(m.dewp ?? 10),
        windDirDeg: Number(m.wdir ?? 0),
        windSpeedKt: Number(m.wspd ?? 0),
        altimHpa,
        altimInHg,
        visibMiles: String(m.visib ?? "10+"),
        elevFt: Math.round(elevMeters * 3.28084),
        obsTime: String(m.reportTime || m.obsTime || ""),
      },
      source: "NOAA Aviation Weather Center (METAR JSON)",
    };
  } catch {
    return { metar: null, source: "NOAA Aviation Weather Center unavailable" };
  }
}

function findHubByToken(token: string): GeoHub | null {
  const norm = token.trim().toUpperCase();
  if (!norm) return null;
  const exact = GLOBAL_NAV_HUBS.find((h) => h.code === norm);
  if (exact) return exact;
  const byName = GLOBAL_NAV_HUBS.find((h) => h.name.toLowerCase().includes(token.trim().toLowerCase()));
  return byName || null;
}

function extractRoutePair(prompt: string): { origin: GeoHub; dest: GeoHub } | null {
  const icaoHits = [...prompt.matchAll(/\b([A-Z]{4})\b/g)]
    .map((m) => findHubByToken(m[1]!))
    .filter((h): h is GeoHub => h !== null);
  if (icaoHits.length >= 2 && icaoHits[0]!.code !== icaoHits[1]!.code) {
    return { origin: icaoHits[0]!, dest: icaoHits[1]! };
  }

  const fromTo = prompt.match(/\bfrom\s+([A-Za-z\s]+?)\s+(?:to|->)\s+([A-Za-z\s]+?)(?:[,.?!]|with|via|$)/i);
  if (fromTo?.[1] && fromTo?.[2]) {
    const h1 = findHubByToken(fromTo[1]);
    const h2 = findHubByToken(fromTo[2]);
    if (h1 && h2 && h1.code !== h2.code) return { origin: h1, dest: h2 };
  }
  return null;
}

export async function executeGlobalNavQuery(prompt: string): Promise<string> {
  const icaos = [...new Set([...prompt.matchAll(/\b([A-Z]{4})\b/g)].map((m) => m[1]!).filter((c) => findHubByToken(c)?.kind === "airport"))];
  const primaryIcao = icaos[0] || (/\b(metar|runway|crosswind|density\s+altitude|fltcat|airport)\b/i.test(prompt) ? "KJFK" : null);
  const routePair = extractRoutePair(prompt);
  const rwyMatch = prompt.match(/\b(?:runway|rwy)\s*(\d{1,2})[LCR]?\b/i);
  const runwayHeadingDeg = rwyMatch?.[1] ? (Number(rwyMatch[1]) % 36 || 36) * 10 : null;

  const metarOut = primaryIcao
    ? await fetchLiveMetar(primaryIcao)
    : { metar: null, source: "Not requested" };

  const gc = routePair
    ? computeGreatCircle(routePair.origin.lat, routePair.origin.lon, routePair.dest.lat, routePair.dest.lon)
    : null;

  const rwyWind =
    metarOut.metar && runwayHeadingDeg !== null
      ? computeRunwayWindComponents(metarOut.metar.windDirDeg, metarOut.metar.windSpeedKt, runwayHeadingDeg)
      : metarOut.metar
        ? computeRunwayWindComponents(metarOut.metar.windDirDeg, metarOut.metar.windSpeedKt, 310)
        : null;

  const densityAlt = metarOut.metar
    ? computeDensityAltitude(metarOut.metar.elevFt, metarOut.metar.altimInHg, metarOut.metar.tempC)
    : null;

  const riskLevel: "low" | "moderate" | "high" =
    metarOut.metar && (/IFR|LIFR/i.test(metarOut.metar.fltCat) || (rwyWind && rwyWind.crosswindKt >= 20))
      ? "high"
      : metarOut.metar && (/MVFR/i.test(metarOut.metar.fltCat) || (rwyWind && rwyWind.crosswindKt >= 12))
        ? "moderate"
        : "low";

  const dashboardPayload = {
    title: metarOut.metar
      ? `Aviation METAR & Runway Telemetry — ${metarOut.metar.icaoId} (${metarOut.metar.name})`
      : routePair
        ? `Global Great-Circle Route — ${routePair.origin.code} → ${routePair.dest.code}`
        : "Global Aviation METAR & Great-Circle Navigation Desk",
    subtitle: metarOut.metar
      ? `Flight Cat: ${metarOut.metar.fltCat} · ${metarOut.source}`
      : "Orthodromic Navigation & Sea Chokepoint Calculator",
    riskLevel,
    kpis: [
      {
        label: metarOut.metar ? `Flight Category (${metarOut.metar.icaoId})` : "Great-Circle Distance",
        value: metarOut.metar
          ? metarOut.metar.fltCat
          : gc
            ? `${Math.round(gc.distanceNm).toLocaleString()} NM`
            : "Ready",
        sub: metarOut.metar
          ? `Vis ${metarOut.metar.visibMiles} SM · Temp ${metarOut.metar.tempC}°C`
          : gc
            ? `${Math.round(gc.distanceKm).toLocaleString()} km`
            : "Provide ICAO code or city pair",
      },
      {
        label: rwyWind ? `Runway ${rwyMatch?.[1] || "31"} Crosswind` : "Initial Bearing",
        value: rwyWind
          ? `${rwyWind.crosswindKt.toFixed(1)} kt ${rwyWind.crosswindSide}`
          : gc
            ? `${Math.round(gc.initialBearingDeg)}°`
            : "—",
        sub: rwyWind
          ? `Wind ${String(rwyWind.windDirDeg).padStart(3, "0")}° @ ${rwyWind.windSpeedKt} kt · Headwind ${rwyWind.headwindKt.toFixed(1)} kt`
          : "True orthodromic heading",
      },
      {
        label: gc ? "Jet / Maritime Transit" : "Density Altitude",
        value: gc
          ? `${gc.estJetHours460Kt.toFixed(1)} hr jet`
          : densityAlt
            ? `${Math.round(densityAlt.densityAltitudeFt).toLocaleString()} ft`
            : "—",
        sub: gc
          ? `${gc.estShipDays18Kt.toFixed(1)} days @ 18 kt sea`
          : densityAlt
            ? `Field ${densityAlt.elevationFt} ft · Altim ${densityAlt.altimeterInHg.toFixed(2)} inHg`
            : "",
      },
      {
        label: "Route Pair",
        value: routePair ? `${routePair.origin.code}→${routePair.dest.code}` : metarOut.metar?.icaoId || "Global Hub",
        sub: routePair ? `${Math.round(gc?.distanceMiles || 0).toLocaleString()} statute mi` : metarOut.metar?.obsTime || "",
      },
    ],
  };

  const parts: string[] = [
    "## Global Aviation METAR & Navigation Telemetry",
    `\`\`\`noctis-dashboard\n${JSON.stringify(dashboardPayload)}\n\`\`\``,
  ];

  if (metarOut.metar) {
    const m = metarOut.metar;
    parts.push(
      [
        `### Live NOAA METAR — ${m.icaoId} (${m.name})`,
        `- **Raw METAR:** \`${m.rawOb}\``,
        `- **Category & Visibility:** **${m.fltCat}** · Visibility **${m.visibMiles} SM** · Observed \`${m.obsTime}\``,
        `- **Wind & Pressure:** **${String(m.windDirDeg).padStart(3, "0")}° @ ${m.windSpeedKt} kt** · Altimeter **${m.altimHpa.toFixed(1)} hPa (${m.altimInHg.toFixed(2)} inHg)** · Temp/Dewpoint **${m.tempC}°C / ${m.dewpC}°C**`,
        ...(rwyWind
          ? [
              `- **Runway ${rwyMatch?.[1] || "31"} (${rwyWind.runwayHeadingDeg}°) Components:** Headwind **${rwyWind.headwindKt.toFixed(1)} kt** · Crosswind **${rwyWind.crosswindKt.toFixed(1)} kt (${rwyWind.crosswindSide})**`,
            ]
          : []),
        ...(densityAlt
          ? [
              `- **Density Altitude:** **${Math.round(densityAlt.densityAltitudeFt).toLocaleString()} ft** (Pressure Alt ${Math.round(densityAlt.pressureAltitudeFt).toLocaleString()} ft, ISA ${densityAlt.isaTempC.toFixed(1)}°C)`,
            ]
          : []),
      ].join("\n"),
    );
  }

  if (routePair && gc) {
    parts.push(
      [
        `### Great-Circle Navigation (${routePair.origin.name} → ${routePair.dest.name})`,
        `- **Orthodromic Distance:** **${Math.round(gc.distanceNm).toLocaleString()} NM** (${Math.round(gc.distanceKm).toLocaleString()} km / ${Math.round(gc.distanceMiles).toLocaleString()} mi)`,
        `- **Initial True Bearing:** **${gc.initialBearingDeg.toFixed(1)}°**`,
        `- **Estimated Transit:** **${gc.estJetHours460Kt.toFixed(2)} hours** (460 kt commercial jet) · **${gc.estShipDays18Kt.toFixed(1)} days** (18 kt maritime vessel, direct water proxy)`,
      ].join("\n"),
    );
  }

  parts.push(`**Live Source Checked:** ${metarOut.source}`);
  return parts.join("\n\n");
}
