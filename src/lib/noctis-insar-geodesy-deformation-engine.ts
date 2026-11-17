/**
 * ============================================================================
 * NOCTIS SYNTHETIC APERTURE RADAR (InSAR) GEODESY ENGINE (NOCTIS-INSAR-001)
 * Sovereign Physical Systems: Repeat-Pass InSAR Phase Unwrapping, Line-of-Sight (LOS) Surface Displacement,
 * Complex Coherence (gamma), Perpendicular Critical Baseline, Tropospheric Phase Delay Correction
 * Standards: ESA Sentinel-1 SAR Mission / NASA-ISRO SAR (NISAR) Handbook / CEOS Calibration Working Group
 * ============================================================================
 */

export interface InSarParams {
  radarWavelengthCm: number; // e.g. 5.55 cm (C-band Sentinel-1), 24.0 cm (L-band NISAR)
  satelliteAltitudeKm: number; // e.g. 693 km
  incidenceAngleDegrees: number; // e.g. 35 to 45 deg
  perpendicularBaselineMeters: number; // B_perp (e.g. 10 to 150m)
  slantRangeResolutionMeters: number; // e.g. 3.0 to 10.0m
  temporalDecorrelationDays: number; // e.g. 6, 12, 24 days
  interferometricCoherenceGamma?: number; // 0 to 1 (e.g. 0.45 to 0.90)
  surfaceDeformationRateMmYear: number; // Subsidence / seismic slip (e.g. 5 to 45 mm/yr)
}

export interface InSarAuditResult {
  criticalPerpendicularBaselineMeters: number;
  isBaselineSubcritical: boolean; // B_perp < B_perp,crit
  altitudeOfAmbiguityMeters: number; // h_a
  phaseSensitivityMmPerRadian: number;
  interferometricCoherence: number;
  isPhaseUnwrappingFeasible: boolean; // Coherence >= 0.35
  lineOfSightDisplacementMm: number;
  phaseVarianceRadiansSquared: number;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateInSarInterferometry(params: InSarParams): InSarAuditResult {
  const lambda_m = params.radarWavelengthCm * 1e-2;
  const theta_rad = (params.incidenceAngleDegrees * Math.PI) / 180.0;
  const slantRange_m = (params.satelliteAltitudeKm * 1e3) / Math.cos(theta_rad);

  // Critical perpendicular baseline:
  // B_perp,crit = (lambda * R * tan(theta)) / (2 * rho_r)
  const B_perp_crit = (lambda_m * slantRange_m * Math.tan(theta_rad)) / (2 * params.slantRangeResolutionMeters);
  const isBaselineSubcritical = Math.abs(params.perpendicularBaselineMeters) < (0.5 * B_perp_crit);

  // Altitude of ambiguity (height change corresponding to 2*pi phase change):
  // h_a = (lambda * R * sin(theta)) / (2 * B_perp)
  const h_a = Math.abs((lambda_m * slantRange_m * Math.sin(theta_rad)) / (2 * Math.max(1.0, params.perpendicularBaselineMeters)));

  // Phase-to-displacement conversion factor: Delta phi = - (4 * pi / lambda) * d_LOS
  // Sensitivity = lambda / (4 * pi) meters per radian
  const sensitivityMmPerRad = (lambda_m / (4 * Math.PI)) * 1e3;

  // Interferometric coherence gamma estimation:
  // gamma_total = gamma_geom * gamma_temp * gamma_therm
  const B_ratio = Math.min(0.95, Math.abs(params.perpendicularBaselineMeters) / B_perp_crit);
  const gamma_geom = 1.0 - B_ratio;
  const tau_decay = params.radarWavelengthCm > 15 ? 90.0 : 35.0; // L-band decorrelates slower than C-band
  const gamma_temp = Math.exp(-params.temporalDecorrelationDays / tau_decay);
  const gamma = params.interferometricCoherenceGamma ?? Math.max(0.2, gamma_geom * gamma_temp * 0.95);

  const isUnwrappingFeasible = gamma >= 0.35;

  // Phase variance from Cramer-Rao bound:
  // sigma_phi^2 = (1 - gamma^2) / (2 * N_looks * gamma^2)  (assume 20 multilook factors)
  const N_looks = 20;
  const phaseVariance = (1.0 - Math.pow(gamma, 2)) / (2 * N_looks * Math.pow(Math.max(0.1, gamma), 2));

  // Line-of-sight surface displacement over elapsed temporal baseline:
  const d_LOS_mm = params.surfaceDeformationRateMmYear * (params.temporalDecorrelationDays / 365.25);

  const invariantsSatisfied = B_perp_crit > 500 &&
    isBaselineSubcritical &&
    h_a > 10.0 &&
    isUnwrappingFeasible &&
    phaseVariance < 1.5;

  const diagnostic = `InSar Geodesy Audit: Wavelength=${params.radarWavelengthCm}cm, Alt=${params.satelliteAltitudeKm}km, ` +
    `Inc=${params.incidenceAngleDegrees}deg, B_perp=${params.perpendicularBaselineMeters}m (Crit=${B_perp_crit.toFixed(0)}m, Safe: ${isBaselineSubcritical}), ` +
    `Ambiguity h_a=${h_a.toFixed(1)}m, Coherence gamma=${gamma.toFixed(2)} (Unwrap: ${isUnwrappingFeasible}), ` +
    `LOS d=${d_LOS_mm.toFixed(2)}mm (${params.surfaceDeformationRateMmYear} mm/yr, sigma_phi^2=${phaseVariance.toFixed(3)} rad^2). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    criticalPerpendicularBaselineMeters: B_perp_crit,
    isBaselineSubcritical,
    altitudeOfAmbiguityMeters: h_a,
    phaseSensitivityMmPerRadian: sensitivityMmPerRad,
    interferometricCoherence: gamma,
    isPhaseUnwrappingFeasible: isUnwrappingFeasible,
    lineOfSightDisplacementMm: d_LOS_mm,
    phaseVarianceRadiansSquared: phaseVariance,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface InSarScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllInSarScenarios(): InSarScenario[] {
  const scenarios: InSarScenario[] = [];
  const tracks = [
    { name: "Sentinel-1 San Andreas Fault Slip (C-band, 12-day)", wl: 5.55, alt: 693, inc: 38, Bp: 45, res: 4.0, dt: 12, rate: 32 },
    { name: "NISAR Central Valley Aquifer Subsidence (L-band, 12-day)", wl: 24.0, alt: 747, inc: 37, Bp: 85, res: 6.0, dt: 12, rate: 45 },
    { name: "ALOS-2 PALSAR-2 Mount Etna Inflation (L-band, 14-day)", wl: 23.6, alt: 628, inc: 35, Bp: 60, res: 5.0, dt: 14, rate: 25 },
    { name: "TerraSAR-X Urban Infrastructure Bridge Deflection (X-band)", wl: 3.1, alt: 514, inc: 42, Bp: 35, res: 2.0, dt: 11, rate: 8 },
    { name: "Sentinel-1 Yellowstone Caldera Uplift (C-band, 24-day)", wl: 5.55, alt: 693, inc: 40, Bp: 50, res: 4.0, dt: 24, rate: 18 }
  ];

  for (let i = 1; i <= 25; i++) {
    const t = tracks[(i - 1) % tracks.length];
    const bpVar = t.Bp * (1.0 + ((i % 5) - 2) * 0.04);
    scenarios.push({
      id: `NOCTIS-INSAR-GEODESY-${String(i).padStart(2, "0")}`,
      domain: "SYNTHETIC_APERTURE_RADAR_INTERFEROMETRY",
      title: `Interferometric Phase Unwrapping & Coherence Invariant #${i} (${t.name})`,
      governingStandard: "ESA Sentinel-1 SAR Calibration / NASA-ISRO SAR (NISAR) Handbook / CEOS WGCV",
      execute: () => {
        const res = evaluateInSarInterferometry({
          radarWavelengthCm: t.wl,
          satelliteAltitudeKm: t.alt,
          incidenceAngleDegrees: t.inc,
          perpendicularBaselineMeters: bpVar,
          slantRangeResolutionMeters: t.res,
          temporalDecorrelationDays: t.dt,
          surfaceDeformationRateMmYear: t.rate
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
