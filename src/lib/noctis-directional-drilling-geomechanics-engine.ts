/**
 * ============================================================================
 * NOCTIS DIRECTIONAL DRILLING & GEOMECHANICS ENGINE (NOCTIS-DRILLING-001)
 * Sovereign Physical Systems: Rotary Steerable Systems (RSS), Minimum Curvature Wellbore Trajectory,
 * Dogleg Severity (DLS <= 10 deg / 30m), Pore Pressure vs Fracture Gradient Drilling Window, BHA Buckling
 * Standards: API Spec 7-1 / API RP 13B / IADC Drilling Manual / SPE Wellbore Mechanics
 * ============================================================================
 */

export interface DirectionalDrillingParams {
  measuredDepthMeters: number; // MD (e.g. 2500 to 6000m)
  inclinationAngleDegrees: number; // e.g. 15 to 88 deg (horizontal lateral)
  azimuthAngleDegrees: number; // e.g. 45 to 270 deg
  courseLengthMeters: number; // Delta MD (e.g. 30m survey intervals)
  previousInclinationDegrees: number; // I_1
  previousAzimuthDegrees: number; // A_1
  formationPorePressureEcdPpg: number; // Equivalent Circulating Density ppg (e.g. 9.5 to 13.5 ppg)
  formationFractureGradientEcdPpg: number; // Fracture limit ppg (e.g. 14.5 to 18.0 ppg)
  drillingMudDensityEcdPpg: number; // Mud weight ppg (e.g. 11.0 to 14.0 ppg)
  drillpipeWeightOnBitKiloNewtons?: number; // WOB (e.g. 50 to 200 kN)
}

export interface DirectionalDrillingAuditResult {
  doglegAngleDegrees: number;
  doglegSeverityDegPer30Meters: number; // DLS
  isDoglegSeverityWithinLimits: boolean; // DLS <= 10 deg/30m
  isMudWeightWithinSafeDrillingWindow: boolean; // Pore < Mud < Frac
  porePressureMarginPpg: number;
  fractureMarginPpg: number;
  trueVerticalDepthEstimateM: number;
  bhaBucklingSafetyFactor: number;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateDirectionalDrilling(params: DirectionalDrillingParams): DirectionalDrillingAuditResult {
  const deg2rad = Math.PI / 180.0;
  const I1 = params.previousInclinationDegrees * deg2rad;
  const I2 = params.inclinationAngleDegrees * deg2rad;
  const A1 = params.previousAzimuthDegrees * deg2rad;
  const A2 = params.azimuthAngleDegrees * deg2rad;
  const deltaMD = params.courseLengthMeters;

  // Minimum Curvature Method Dogleg Angle (beta):
  // cos(beta) = cos(I1)*cos(I2) + sin(I1)*sin(I2)*cos(A2 - A1)
  const cosBeta = Math.cos(I1) * Math.cos(I2) + Math.sin(I1) * Math.sin(I2) * Math.cos(A2 - A1);
  const clampedCos = Math.max(-1.0, Math.min(1.0, cosBeta));
  const doglegAngleRad = Math.acos(clampedCos);
  const doglegAngleDeg = doglegAngleRad / deg2rad;

  // Dogleg Severity (DLS) normalized to standard 30 meters (or 100 ft):
  const dlsDegPer30m = (doglegAngleDeg * 30.0) / Math.max(1.0, deltaMD);
  const isDlsSafe = dlsDegPer30m <= 10.0; // Industry standard for drillstring fatigue & casing wear

  // Geomechanical Drilling Window:
  // Mud weight must exceed pore pressure (prevent influx/blowout) and remain below fracture gradient (prevent losses)
  const mud = params.drillingMudDensityEcdPpg;
  const pore = params.formationPorePressureEcdPpg;
  const frac = params.formationFractureGradientEcdPpg;
  const poreMargin = mud - pore;
  const fracMargin = frac - mud;
  const isDrillingWindowSafe = poreMargin >= 0.3 && fracMargin >= 0.5;

  // True Vertical Depth (TVD) estimation via average inclination:
  const I_avg = (I1 + I2) / 2.0;
  const tvdM = params.measuredDepthMeters * Math.cos(I_avg);

  // Bottom Hole Assembly (BHA) critical buckling load safety factor (Paslay-Bogy relation):
  const wob = params.drillpipeWeightOnBitKiloNewtons ?? 120.0;
  const criticalBucklingForceKN = 280.0 * Math.max(0.2, Math.sin(I_avg));
  const bucklingSF = criticalBucklingForceKN / Math.max(1.0, wob);

  const invariantsSatisfied = dlsDegPer30m >= 0 &&
    isDlsSafe &&
    isDrillingWindowSafe &&
    bucklingSF >= 1.2;

  const diagnostic = `Directional Drilling Audit: MD=${params.measuredDepthMeters}m (TVD~${tvdM.toFixed(0)}m), ` +
    `Inc=${params.inclinationAngleDegrees}deg, Azi=${params.azimuthAngleDegrees}deg, DLS=${dlsDegPer30m.toFixed(2)} deg/30m (Limit <=10: ${isDlsSafe}), ` +
    `Mud=${mud} ppg vs Window [Pore=${pore}, Frac=${frac}] (PoreMargin=+${poreMargin.toFixed(2)}, FracMargin=+${fracMargin.toFixed(2)}, Safe: ${isDrillingWindowSafe}), ` +
    `BHA Buckling SF=${bucklingSF.toFixed(2)} (Safe: ${bucklingSF >= 1.2}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    doglegAngleDegrees: doglegAngleDeg,
    doglegSeverityDegPer30Meters: dlsDegPer30m,
    isDoglegSeverityWithinLimits: isDlsSafe,
    isMudWeightWithinSafeDrillingWindow: isDrillingWindowSafe,
    porePressureMarginPpg: poreMargin,
    fractureMarginPpg: fracMargin,
    trueVerticalDepthEstimateM: tvdM,
    bhaBucklingSafetyFactor: bucklingSF,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface DrillingScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllDrillingScenarios(): DrillingScenario[] {
  const scenarios: DrillingScenario[] = [];
  const wells = [
    { name: "Permian Basin Wolfcamp Horizontal Lateral (Texas)", md: 5400, inc: 89.2, azi: 178, dmd: 30, prevI: 88.0, prevA: 177, pore: 10.2, frac: 15.5, mud: 11.8, wob: 110 },
    { name: "North Sea Troll Field High-Angle Extended Reach (Norway)", md: 6800, inc: 82.5, azi: 245, dmd: 30, prevI: 81.0, prevA: 244, pore: 9.8, frac: 14.8, mud: 11.2, wob: 130 },
    { name: "Gulf of Mexico Deepwater Subsalt S-Curve (Green Canyon)", md: 7200, inc: 45.0, azi: 115, dmd: 30, prevI: 43.5, prevA: 114, pore: 13.2, frac: 17.2, mud: 14.5, wob: 95 },
    { name: "Bakken Shale Multi-Pad Dual Lateral (North Dakota)", md: 5800, inc: 90.0, azi: 358, dmd: 30, prevI: 89.0, prevA: 358, pore: 10.8, frac: 16.0, mud: 12.4, wob: 115 },
    { name: "Middle East Carbonate RSS Geosteered Lateral (Saudi Arabia)", md: 4500, inc: 86.5, azi: 85, dmd: 30, prevI: 85.0, prevA: 84, pore: 9.2, frac: 14.0, mud: 10.5, wob: 100 }
  ];

  for (let i = 1; i <= 25; i++) {
    const w = wells[(i - 1) % wells.length];
    const mudVar = w.mud * (1.0 + ((i % 5) - 2) * 0.015);
    scenarios.push({
      id: `NOCTIS-DRILLING-RSS-${String(i).padStart(2, "0")}`,
      domain: "ULTRA_DEEP_DIRECTIONAL_DRILLING",
      title: `RSS Dogleg Severity & Pore Pressure Window Invariant #${i} (${w.name})`,
      governingStandard: "API Spec 7-1 Rotary Drilling Equipment / API RP 13B / IADC Drilling Manual",
      execute: () => {
        const res = evaluateDirectionalDrilling({
          measuredDepthMeters: w.md,
          inclinationAngleDegrees: w.inc,
          azimuthAngleDegrees: w.azi,
          courseLengthMeters: w.dmd,
          previousInclinationDegrees: w.prevI,
          previousAzimuthDegrees: w.prevA,
          formationPorePressureEcdPpg: w.pore,
          formationFractureGradientEcdPpg: w.frac,
          drillingMudDensityEcdPpg: mudVar,
          drillpipeWeightOnBitKiloNewtons: w.wob
        });
        return {
          status: res.invariantsSatisfied ? "PASS" : "FAIL",
          score: res.invariantsSatisfied ? 100 : 0,
          verdict: res.diagnostic
        };
      }
    });
  }
  return scenarios;
}
