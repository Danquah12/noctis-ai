/**
 * Noctis Space & Universe Live Telemetry + Orbital / Astrophysics Engine (`/space`)
 *
 * Combines live public feeds (NOAA SWPC Kp index, NASA JPL Small-Body Close-Approach CAD,
 * live ISS telemetry) with deterministic orbital & astrophysical solvers (Hohmann transfer,
 * asteroid kinetic impact energy, exoplanet habitable zone, orbital mechanics).
 *
 * Pure TypeScript with no `@/` path aliases so it runs natively under Vite SSR,
 * tsx, and `node --experimental-strip-types --test`.
 */

const EARTH_RADIUS_KM = 6371.0;
const MU_EARTH_KM3_S2 = 398600.4418;
const G0_MS2 = 9.80665;
const AU_IN_LUNAR_DISTANCES = 389.17;
const JOULES_PER_MEGATON_TNT = 4.184e15;

export interface OrbitalMechanicsResult {
  altitudeKm: number;
  semiMajorAxisKm: number;
  circularVelocityKmS: number;
  escapeVelocityKmS: number;
  orbitalPeriodMin: number;
  localGravityMs2: number;
}

export interface HohmannTransferResult {
  alt1Km: number;
  alt2Km: number;
  v1CircularKmS: number;
  v2CircularKmS: number;
  deltaV1KmS: number;
  deltaV2KmS: number;
  totalDeltaVKmS: number;
  totalDeltaVMS: number;
  transferTimeMin: number;
  transferTimeHr: number;
}

export interface AsteroidImpactResult {
  diameterMeters: number;
  velocityKmS: number;
  densityKgM3: number;
  massKg: number;
  kineticEnergyJoules: number;
  energyMegatonsTnt: number;
  severityTier: string;
}

export interface HabitableZoneResult {
  luminositySolar: number;
  conservativeInnerAu: number;
  conservativeOuterAu: number;
  optimisticInnerAu: number;
  optimisticOuterAu: number;
}

export interface GeomagneticStormClassification {
  kp: number;
  gScale: "G0" | "G1" | "G2" | "G3" | "G4" | "G5";
  label: string;
  riskLevel: "low" | "moderate" | "high";
  auroraReach: string;
  operationalImpact: string;
}

export function computeOrbitalMechanics(altitudeKm: number): OrbitalMechanicsResult {
  const safeAlt = Math.max(100, altitudeKm);
  const r = EARTH_RADIUS_KM + safeAlt;
  const vCirc = Math.sqrt(MU_EARTH_KM3_S2 / r);
  const vEsc = Math.sqrt((2 * MU_EARTH_KM3_S2) / r);
  const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / MU_EARTH_KM3_S2);
  const gLocal = G0_MS2 * Math.pow(EARTH_RADIUS_KM / r, 2);
  return {
    altitudeKm: safeAlt,
    semiMajorAxisKm: r,
    circularVelocityKmS: vCirc,
    escapeVelocityKmS: vEsc,
    orbitalPeriodMin: periodSec / 60,
    localGravityMs2: gLocal,
  };
}

export function computeHohmannTransfer(alt1Km: number, alt2Km: number): HohmannTransferResult {
  const lowAlt = Math.max(120, Math.min(alt1Km, alt2Km));
  const highAlt = Math.max(120, Math.max(alt1Km, alt2Km));
  const r1 = EARTH_RADIUS_KM + lowAlt;
  const r2 = EARTH_RADIUS_KM + highAlt;
  const v1 = Math.sqrt(MU_EARTH_KM3_S2 / r1);
  const v2 = Math.sqrt(MU_EARTH_KM3_S2 / r2);
  const aTrans = (r1 + r2) / 2;
  const vTrans1 = Math.sqrt(MU_EARTH_KM3_S2 * (2 / r1 - 1 / aTrans));
  const vTrans2 = Math.sqrt(MU_EARTH_KM3_S2 * (2 / r2 - 1 / aTrans));
  const dv1 = Math.abs(vTrans1 - v1);
  const dv2 = Math.abs(v2 - vTrans2);
  const totalKmS = dv1 + dv2;
  const transferSec = Math.PI * Math.sqrt(Math.pow(aTrans, 3) / MU_EARTH_KM3_S2);
  return {
    alt1Km: alt1Km,
    alt2Km: alt2Km,
    v1CircularKmS: v1,
    v2CircularKmS: v2,
    deltaV1KmS: dv1,
    deltaV2KmS: dv2,
    totalDeltaVKmS: totalKmS,
    totalDeltaVMS: totalKmS * 1000,
    transferTimeMin: transferSec / 60,
    transferTimeHr: transferSec / 3600,
  };
}

export function estimateAsteroidDiameterMeters(hMag: number, albedo = 0.14): number {
  const safeAlbedo = Math.max(0.02, Math.min(0.6, albedo));
  const diameterKm = (1329 / Math.sqrt(safeAlbedo)) * Math.pow(10, -0.2 * hMag);
  return diameterKm * 1000;
}

export function computeAsteroidImpactEnergy(
  diameterMeters: number,
  velocityKmS: number,
  densityKgM3 = 3000,
): AsteroidImpactResult {
  const d = Math.max(0.5, diameterMeters);
  const vKmS = Math.max(1, velocityKmS);
  const rho = Math.max(500, densityKgM3);
  const radiusM = d / 2;
  const volumeM3 = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
  const massKg = volumeM3 * rho;
  const vMs = vKmS * 1000;
  const keJoules = 0.5 * massKg * vMs * vMs;
  const mt = keJoules / JOULES_PER_MEGATON_TNT;

  let severityTier = "Bolide / Atmospheric Airburst";
  if (mt >= 1000) severityTier = "Global Mass-Extinction Class (> 1,000 MT)";
  else if (mt >= 100) severityTier = "Continental / Ocean-Basin Tsunami Risk";
  else if (mt >= 10) severityTier = "Regional City-Destroying Event (10–100 MT)";
  else if (mt >= 0.4) severityTier = "Chelyabinsk-to-Tunguska Local Blast";

  return {
    diameterMeters: d,
    velocityKmS: vKmS,
    densityKgM3: rho,
    massKg,
    kineticEnergyJoules: keJoules,
    energyMegatonsTnt: mt,
    severityTier,
  };
}

export function computeExoplanetHabitableZone(luminositySolar: number): HabitableZoneResult {
  const lum = Math.max(1e-5, luminositySolar);
  return {
    luminositySolar: lum,
    conservativeInnerAu: Math.sqrt(lum / 1.1),
    conservativeOuterAu: Math.sqrt(lum / 0.356),
    optimisticInnerAu: Math.sqrt(lum / 1.78),
    optimisticOuterAu: Math.sqrt(lum / 0.32),
  };
}

export function classifyGeomagneticStormScale(kp: number): GeomagneticStormClassification {
  const k = Math.max(0, Math.min(9, Number.isFinite(kp) ? kp : 0));
  if (k >= 9) {
    return {
      kp: k,
      gScale: "G5",
      label: "Extreme Geomagnetic Storm",
      riskLevel: "high",
      auroraReach: "Low latitudes (~40° geomagnetic latitude)",
      operationalImpact: "Widespread power grid voltage collapse risks, HF blackout, major satellite drag & GNSS disruption.",
    };
  }
  if (k >= 8) {
    return {
      kp: k,
      gScale: "G4",
      label: "Severe Geomagnetic Storm",
      riskLevel: "high",
      auroraReach: "Mid-to-low latitudes (~45° geomagnetic latitude)",
      operationalImpact: "Possible voltage control alerts on high-latitude grids, spacecraft surface charging, degraded GPS lock.",
    };
  }
  if (k >= 7) {
    return {
      kp: k,
      gScale: "G3",
      label: "Strong Geomagnetic Storm",
      riskLevel: "high",
      auroraReach: "Mid-latitudes (~50° geomagnetic latitude)",
      operationalImpact: "Intermittent satellite navigation degradation and increased LEO atmospheric drag.",
    };
  }
  if (k >= 6) {
    return {
      kp: k,
      gScale: "G2",
      label: "Moderate Geomagnetic Storm",
      riskLevel: "moderate",
      auroraReach: "Upper US states / Northern Europe (~55°)",
      operationalImpact: "Minor high-latitude grid transformer heating; orbit drag adjustments needed for LEO sats.",
    };
  }
  if (k >= 5) {
    return {
      kp: k,
      gScale: "G1",
      label: "Minor Geomagnetic Storm",
      riskLevel: "moderate",
      auroraReach: "Northern tier (~60° geomagnetic latitude)",
      operationalImpact: "Weak power grid fluctuations and minor polar HF radio attenuation.",
    };
  }
  return {
    kp: k,
    gScale: "G0",
    label: "Quiet to Unsettled Magnetosphere",
    riskLevel: "low",
    auroraReach: "High-latitude Arctic/Antarctic ovals (~65°+)",
    operationalImpact: "Nominal satellite operations, clean GNSS precision, nominal HF propagation.",
  };
}

interface KpSample {
  timeTag: string;
  kp: number;
  aRunning: number;
}

interface CloseApproachObject {
  designation: string;
  closeApproachTime: string;
  distAu: number;
  distLunar: number;
  relVelKmS: number;
  hMag: number;
  estDiameterM: number;
}

interface IssTelemetry {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmH: number;
  visibility: string;
  timestampIso: string;
}

async function fetchNoaaKpIndex(): Promise<{ samples: KpSample[]; source: string }> {
  try {
    const res = await fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", {
      headers: { "user-agent": "Noctis-Space-Telemetry/1.0" },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return { samples: [], source: `NOAA SWPC HTTP ${res.status}` };
    const raw = (await res.json()) as unknown[];
    const samples: KpSample[] = [];
    for (const row of raw) {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        const obj = row as Record<string, unknown>;
        const kp = Number(obj.Kp ?? obj.kp_index ?? NaN);
        const timeTag = String(obj.time_tag || "");
        const aRunning = Number(obj.a_running ?? 0);
        if (timeTag && Number.isFinite(kp)) samples.push({ timeTag, kp, aRunning });
      } else if (Array.isArray(row) && row.length >= 2 && row[0] !== "time_tag") {
        const kp = Number(row[1]);
        const timeTag = String(row[0] || "");
        const aRunning = Number(row[2] ?? 0);
        if (timeTag && Number.isFinite(kp)) samples.push({ timeTag, kp, aRunning });
      }
    }
    return { samples: samples.slice(-12), source: "NOAA SWPC Planetary K-Index" };
  } catch {
    return { samples: [], source: "NOAA SWPC unavailable" };
  }
}

async function fetchNasaCloseApproaches(): Promise<{ neos: CloseApproachObject[]; source: string }> {
  try {
    const res = await fetch("https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&dist-max=0.05&limit=6", {
      headers: { "user-agent": "Noctis-Space-Telemetry/1.0" },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return { neos: [], source: `NASA JPL CAD HTTP ${res.status}` };
    const data = (await res.json()) as { fields?: string[]; data?: string[][] };
    const fields = data.fields || [];
    const idx = (name: string) => fields.indexOf(name);
    const neos: CloseApproachObject[] = (data.data || []).slice(0, 6).map((row) => {
      const distAu = Number(row[idx("dist")] ?? 0.05);
      const hMag = Number(row[idx("h")] ?? 25);
      return {
        designation: String(row[idx("des")] || "Unknown NEO"),
        closeApproachTime: String(row[idx("cd")] || "Unknown"),
        distAu,
        distLunar: distAu * AU_IN_LUNAR_DISTANCES,
        relVelKmS: Number(row[idx("v_rel")] ?? 0),
        hMag,
        estDiameterM: estimateAsteroidDiameterMeters(Number.isFinite(hMag) ? hMag : 25),
      };
    });
    return { neos, source: "NASA JPL SSD Close-Approach API" };
  } catch {
    return { neos: [], source: "NASA JPL CAD unavailable" };
  }
}

async function fetchIssLivePosition(): Promise<{ iss: IssTelemetry | null; source: string }> {
  try {
    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544", {
      headers: { "user-agent": "Noctis-Space-Telemetry/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { iss: null, source: `ISS Feed HTTP ${res.status}` };
    const d = (await res.json()) as Record<string, unknown>;
    const lat = Number(d.latitude);
    const lon = Number(d.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { iss: null, source: "ISS telemetry malformed" };
    return {
      iss: {
        latitude: lat,
        longitude: lon,
        altitudeKm: Number(d.altitude ?? 418),
        velocityKmH: Number(d.velocity ?? 27580),
        visibility: String(d.visibility || "daylight"),
        timestampIso: d.timestamp ? new Date(Number(d.timestamp) * 1000).toISOString() : new Date().toISOString(),
      },
      source: "WhereTheISS Live Ephemeris (NORAD 25544)",
    };
  } catch {
    return { iss: null, source: "ISS live feed unavailable" };
  }
}

function parseHohmannPair(prompt: string): { alt1: number; alt2: number } | null {
  if (!/\b(?:hohmann|orbit(?:al)?\s+transfer|delta[-\s]?v)\b/i.test(prompt)) return null;
  const nums = [...prompt.matchAll(/([\d,.]+)\s*km\b/gi)]
    .map((m) => Number(m[1]!.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 100 && n <= 500000);
  if (nums.length >= 2) {
    return { alt1: nums[0]!, alt2: nums[1]! };
  }
  if (/\bleo\b/i.test(prompt) && /\bgeo\b/i.test(prompt)) {
    return { alt1: 400, alt2: 35786 };
  }
  return { alt1: 400, alt2: 35786 };
}

function parseAsteroidParams(prompt: string): { diameterM: number; velocityKmS: number } | null {
  if (!/\b(?:impact\s+energy|asteroid\s+impact|kinetic\s+impact|megatons?)\b/i.test(prompt)) return null;
  const dm = prompt.match(/([\d,.]+)\s*(?:m\b|meters?)\b/i);
  const dKm = prompt.match(/([\d,.]+)\s*km\b/i);
  const vel = prompt.match(/([\d,.]+)\s*km\/s\b/i);
  const diameterM = dm ? Number(dm[1]!.replace(/,/g, "")) : dKm ? Number(dKm[1]!.replace(/,/g, "")) * 1000 : 140;
  const velocityKmS = vel ? Number(vel[1]!.replace(/,/g, "")) : 19.5;
  return {
    diameterM: Number.isFinite(diameterM) ? diameterM : 140,
    velocityKmS: Number.isFinite(velocityKmS) ? velocityKmS : 19.5,
  };
}

function parseExoplanetLuminosity(prompt: string): number | null {
  if (!/\b(?:habitable\s+zone|goldilocks\s+zone|exoplanet)\b/i.test(prompt)) return null;
  const m = prompt.match(/([\d,.]+)\s*(?:l_?sun|l☉|solar\s+luminosit)/i);
  if (m?.[1]) {
    const val = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(val) && val > 0) return val;
  }
  return 1.0;
}

export async function executeSpaceUniverseQuery(prompt: string): Promise<string> {
  const hohmannSpec = parseHohmannPair(prompt);
  const asteroidSpec = parseAsteroidParams(prompt);
  const exoLum = parseExoplanetLuminosity(prompt);
  const customAltMatch = prompt.match(/(?:altitude|orbit)\s*(?:of|=|:)?\s*([\d,.]+)\s*km\b/i);
  const customOrbit = customAltMatch?.[1] && !hohmannSpec ? computeOrbitalMechanics(Number(customAltMatch[1].replace(/,/g, ""))) : null;

  const [kpOut, neoOut, issOut] = await Promise.all([
    fetchNoaaKpIndex(),
    fetchNasaCloseApproaches(),
    fetchIssLivePosition(),
  ]);

  const latestKp = kpOut.samples.length ? kpOut.samples[kpOut.samples.length - 1]! : null;
  const storm = classifyGeomagneticStormScale(latestKp?.kp ?? 0);
  const hohmann = hohmannSpec ? computeHohmannTransfer(hohmannSpec.alt1, hohmannSpec.alt2) : null;
  const impact = asteroidSpec ? computeAsteroidImpactEnergy(asteroidSpec.diameterM, asteroidSpec.velocityKmS) : null;
  const hz = exoLum !== null ? computeExoplanetHabitableZone(exoLum) : null;
  const closestNeo = neoOut.neos[0] || null;

  const issOrbital = issOut.iss ? computeOrbitalMechanics(issOut.iss.altitudeKm) : computeOrbitalMechanics(418);

  const dashboardPayload = {
    title: "Space Weather, Orbital Tracking & Astrophysics Telemetry",
    subtitle: `${storm.gScale} (${storm.label}) · ${kpOut.source} + ${neoOut.source}`,
    riskLevel: impact && impact.energyMegatonsTnt >= 100 ? "high" : storm.riskLevel,
    kpis: [
      {
        label: "Geomagnetic Kp Index",
        value: latestKp ? `${latestKp.kp.toFixed(2)} (${storm.gScale})` : "Feed offline",
        sub: latestKp ? `${storm.auroraReach}` : kpOut.source,
      },
      {
        label: "ISS Live Position",
        value: issOut.iss ? `${issOut.iss.latitude.toFixed(2)}°, ${issOut.iss.longitude.toFixed(2)}°` : "Unavailable",
        sub: issOut.iss
          ? `${issOut.iss.altitudeKm.toFixed(1)} km alt · ${Math.round(issOut.iss.velocityKmH).toLocaleString()} km/h`
          : issOut.source,
      },
      {
        label: hohmann ? "Hohmann Total Δv" : impact ? "Impact Energy" : "Nearest Upcoming NEO",
        value: hohmann
          ? `${hohmann.totalDeltaVKmS.toFixed(3)} km/s`
          : impact
            ? `${impact.energyMegatonsTnt.toFixed(1)} MT TNT`
            : closestNeo
              ? `${closestNeo.distLunar.toFixed(1)} LD`
              : "No CAD hits",
        sub: hohmann
          ? `${hohmann.alt1Km}→${hohmann.alt2Km} km (${hohmann.transferTimeHr.toFixed(2)} hr)`
          : impact
            ? `${impact.diameterMeters}m @ ${impact.velocityKmS} km/s`
            : closestNeo
              ? `${closestNeo.designation} · ${closestNeo.closeApproachTime}`
              : neoOut.source,
      },
      {
        label: hz ? "Habitable Zone (AU)" : "ISS Period / Speed",
        value: hz
          ? `${hz.conservativeInnerAu.toFixed(2)}–${hz.conservativeOuterAu.toFixed(2)} AU`
          : `${issOrbital.orbitalPeriodMin.toFixed(1)} min`,
        sub: hz
          ? `Luminosity ${hz.luminositySolar} L☉`
          : `${issOrbital.circularVelocityKmS.toFixed(2)} km/s orbital speed`,
      },
    ],
    ...(kpOut.samples.length
      ? {
          trend: {
            title: "Recent Planetary Geomagnetic Kp Index",
            seriesLabel: "Kp Index",
            points: kpOut.samples.map((s) => ({
              label: s.timeTag.slice(11, 16) || s.timeTag.slice(5, 10),
              value: Number(s.kp.toFixed(2)),
              display: `Kp ${s.kp.toFixed(2)}`,
            })),
          },
        }
      : {}),
    ...(neoOut.neos.length
      ? {
          bars: {
            title: "NASA JPL Upcoming Near-Earth Object Close Approaches (Lunar Distances)",
            items: neoOut.neos.slice(0, 6).map((n) => ({
              label: `${n.designation} (${n.closeApproachTime.slice(0, 11)})`,
              value: Number(n.distLunar.toFixed(2)),
              max: 20,
              display: `${n.distLunar.toFixed(2)} LD · ${n.relVelKmS.toFixed(1)} km/s · ~${Math.round(n.estDiameterM)}m`,
              tone: n.distLunar < 2 ? "rose" : n.distLunar < 6 ? "amber" : "emerald",
            })),
          },
        }
      : {}),
  };

  const sections: string[] = [
    "## Space, Orbital Tracking & Universe Telemetry Brief",
    `\`\`\`noctis-dashboard\n${JSON.stringify(dashboardPayload)}\n\`\`\``,
  ];

  sections.push(
    [
      "### 1. Live Space Weather & ISS Telemetry",
      `- **NOAA SWPC Magnetosphere:** ${latestKp ? `**Kp = ${latestKp.kp.toFixed(2)}** (**${storm.gScale}** — ${storm.label}) as of \`${latestKp.timeTag} UTC\`` : kpOut.source}`,
      `- **Operational Impact:** ${storm.operationalImpact}`,
      issOut.iss
        ? `- **ISS (NORAD 25544):** Lat **${issOut.iss.latitude.toFixed(4)}°**, Lon **${issOut.iss.longitude.toFixed(4)}°**, Altitude **${issOut.iss.altitudeKm.toFixed(2)} km**, Ground/Orbital Speed **${Math.round(issOut.iss.velocityKmH).toLocaleString()} km/h** (${issOut.iss.visibility}, timestamp \`${issOut.iss.timestampIso}\`).`
        : `- **ISS Live Tracking:** ${issOut.source}`,
    ].join("\n"),
  );

  if (hohmann) {
    sections.push(
      [
        `### 2. Deterministic Hohmann Orbital Transfer (${hohmann.alt1Km} km → ${hohmann.alt2Km} km)`,
        `- **Initial Circular Velocity (v1):** **${hohmann.v1CircularKmS.toFixed(3)} km/s**`,
        `- **Target Circular Velocity (v2):** **${hohmann.v2CircularKmS.toFixed(3)} km/s**`,
        `- **Perigee Burn (Δv1):** **${hohmann.deltaV1KmS.toFixed(3)} km/s**`,
        `- **Apogee Circularization Burn (Δv2):** **${hohmann.deltaV2KmS.toFixed(3)} km/s**`,
        `- **Total Transfer Δv:** **${hohmann.totalDeltaVKmS.toFixed(3)} km/s** (${Math.round(hohmann.totalDeltaVMS).toLocaleString()} m/s)`,
        `- **Half-Ellipse Transfer Time:** **${hohmann.transferTimeHr.toFixed(2)} hours** (${hohmann.transferTimeMin.toFixed(1)} min)`,
      ].join("\n"),
    );
  }

  if (impact) {
    sections.push(
      [
        "### Deterministic Asteroid Kinetic Impact Analysis",
        `- **Assumed Impactor:** Diameter **${impact.diameterMeters} m**, Relative Velocity **${impact.velocityKmS} km/s**, Bulk Density **${impact.densityKgM3} kg/m³**`,
        `- **Estimated Mass:** **${impact.massKg.toExponential(2)} kg**`,
        `- **Kinetic Energy:** **${impact.kineticEnergyJoules.toExponential(2)} J** (**${impact.energyMegatonsTnt.toFixed(2)} Megatons TNT**)`,
        `- **Consequence Class:** **${impact.severityTier}**`,
      ].join("\n"),
    );
  }

  if (hz) {
    sections.push(
      [
        `### Exoplanet Habitable Zone Bounds (${hz.luminositySolar} L☉)`,
        `- **Conservative Zone (Water Stability):** **${hz.conservativeInnerAu.toFixed(3)} – ${hz.conservativeOuterAu.toFixed(3)} AU**`,
        `- **Optimistic Zone (Recent Venus / Early Mars):** **${hz.optimisticInnerAu.toFixed(3)} – ${hz.optimisticOuterAu.toFixed(3)} AU**`,
      ].join("\n"),
    );
  }

  if (customOrbit) {
    sections.push(
      [
        `### Circular Orbit Mechanics (${customOrbit.altitudeKm} km Altitude)`,
        `- **Orbital Speed:** **${customOrbit.circularVelocityKmS.toFixed(3)} km/s** | **Escape Velocity:** **${customOrbit.escapeVelocityKmS.toFixed(3)} km/s**`,
        `- **Period:** **${customOrbit.orbitalPeriodMin.toFixed(2)} min** | **Local g:** **${customOrbit.localGravityMs2.toFixed(3)} m/s²**`,
      ].join("\n"),
    );
  }

  if (neoOut.neos.length) {
    const neoRows = neoOut.neos.map(
      (n) =>
        `| **${n.designation}** | ${n.closeApproachTime} | ${n.distLunar.toFixed(2)} LD (${n.distAu.toFixed(4)} AU) | ${n.relVelKmS.toFixed(2)} km/s | ~${Math.round(n.estDiameterM)} m (H=${n.hMag.toFixed(1)}) |`,
    );
    sections.push(
      [
        "### Live NASA JPL Near-Earth Object Close Approaches (< 0.05 AU)",
        "| Object | Close Approach (TDB) | Miss Distance | Rel. Velocity | Est. Diameter |",
        "| :--- | :--- | :--- | :--- | :--- |",
        ...neoRows,
      ].join("\n"),
    );
  }

  sections.push(
    `**Live Sources Checked:** ${kpOut.source} · ${neoOut.source} · ${issOut.source}`,
  );

  return sections.join("\n\n");
}
