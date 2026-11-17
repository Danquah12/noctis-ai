/**
 * ============================================================================
 * NOCTIS DEEP SPACE OPTICAL COMMUNICATIONS (DSOC) ENGINE (NOCTIS-DSOC-001)
 * Sovereign Physical Systems: Interplanetary Laser Communications, M-ary Pulse Position Modulation (PPM),
 * Poisson Photon-Counting Statistics, Superconducting Nanowire (SNSPD) Detection, Fried Parameter Atmospheric Turbulence
 * Standards: CCSDS 141.0-B-1 Optical Communications Physical Layer / NASA DSOC Psyche Flight Mission Standard
 * ============================================================================
 */

export interface DeepSpaceOpticalParams {
  distanceAstronomicalUnits: number; // AU (e.g. 0.2 to 2.7 AU for Mars/Psyche)
  laserWavelengthNm: number; // e.g. 1550 nm
  transmitPowerWatts: number; // e.g. 5W to 20W flight laser
  transmitterApertureDiameterM: number; // e.g. 0.22m for flight telescope
  groundReceiverApertureDiameterM: number; // e.g. 5.1m (Hale Telescope at Palomar)
  pointingJitterMicroradians: number; // e.g. 0.5 to 1.5 urad
  ppmOrderM: number; // 16, 32, 64, 128
  slotWidthNanoseconds: number; // e.g. 0.5 to 8 ns
  atmosphericFriedParameterR0Cm?: number; // e.g. 5 to 15 cm at 1550 nm
}

export interface DeepSpaceOpticalAuditResult {
  freeSpacePathLossDb: number;
  receivedSignalPhotonsPerPulse: number;
  photonsPerBit: number;
  dataRateMbps: number;
  pointingLossDb: number;
  strehlRatioGroundAtmosphere: number;
  quantumPoissonBer: number;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateDeepSpaceOpticalLink(params: DeepSpaceOpticalParams): DeepSpaceOpticalAuditResult {
  const c = 2.99792458e8;
  const h = 6.62607015e-34; // Planck constant
  const lambda_m = params.laserWavelengthNm * 1e-9;
  const photonEnergyJoules = (h * c) / lambda_m;

  const R_meters = params.distanceAstronomicalUnits * 1.495978707e11;

  // Transmitter & Receiver optical gains:
  // G_t = (pi * D_t / lambda)^2
  const G_t = Math.pow((Math.PI * params.transmitterApertureDiameterM) / lambda_m, 2);
  const G_r = Math.pow((Math.PI * params.groundReceiverApertureDiameterM) / lambda_m, 2);

  // Free-space path loss (lambda / (4 * pi * R))^2
  const pathLossLinear = Math.pow(lambda_m / (4 * Math.PI * R_meters), 2);
  const pathLossDb = 10 * Math.log10(pathLossLinear);

  // Pointing loss due to sub-microradian jitter:
  // theta_div ~ 1.22 * lambda / D_t
  const beamDivergenceRad = (1.22 * lambda_m) / params.transmitterApertureDiameterM;
  const pointingJitterRad = params.pointingJitterMicroradians * 1e-6;
  const pointingLossLinear = Math.exp(-4 * Math.pow(pointingJitterRad / beamDivergenceRad, 2));
  const pointingLossDb = 10 * Math.log10(Math.max(1e-6, pointingLossLinear));

  // Atmospheric turbulence Strehl ratio:
  // r_0 Fried parameter (~ 10 cm at zenith, 1550nm)
  const r0_m = (params.atmosphericFriedParameterR0Cm ?? 10.0) * 1e-2;
  const d_eff = Math.min(params.groundReceiverApertureDiameterM, 0.5); // Post-AO effective aperture
  const phaseVariance = 0.134 * Math.pow(d_eff / r0_m, 5 / 3);
  const strehlRatio = Math.max(0.1, Math.min(0.95, Math.exp(-phaseVariance)));

  // Received optical power:
  const opticalEfficiency = 0.45; // Total optics transmissivity
  const P_rx = params.transmitPowerWatts * G_t * G_r * pathLossLinear * pointingLossLinear * strehlRatio * opticalEfficiency;

  // PPM Signaling & Photon Arrival:
  // Data bits per PPM pulse: k = log2(M)
  const k_bits = Math.log2(params.ppmOrderM);
  const pulseRepetitionPeriod = params.ppmOrderM * params.slotWidthNanoseconds * 1e-9;
  const pulseRepetitionFreq = 1.0 / pulseRepetitionPeriod;

  const energyPerPulse = P_rx / pulseRepetitionFreq;
  const photonsPerPulse = energyPerPulse / photonEnergyJoules;
  const photonsPerBit = photonsPerPulse / k_bits;

  const dataRateMbps = (k_bits * pulseRepetitionFreq) / 1e6;

  // Poisson Quantum Bit Error Rate for direct detection SNSPD:
  // P_error ~ (1/2) * exp(-photonsPerPulse)
  const quantumPoissonBer = Math.max(1e-15, 0.5 * Math.exp(-Math.min(50, photonsPerPulse)));

  const invariantsSatisfied = pathLossDb < -200 && pathLossDb > -420 &&
    photonsPerBit > 0.05 &&
    pointingLossDb > -10.0 &&
    strehlRatio > 0.05 &&
    quantumPoissonBer < 0.25;

  const diagnostic = `DSOC Link Audit: Dist=${params.distanceAstronomicalUnits} AU (${(R_meters / 1e9).toFixed(1)}M km), ` +
    `Tx=${params.transmitPowerWatts}W @ ${params.laserWavelengthNm}nm, PathLoss=${pathLossDb.toFixed(1)} dB, ` +
    `PointingLoss=${pointingLossDb.toFixed(2)} dB, Strehl=${strehlRatio.toFixed(2)}, ` +
    `Photons/Bit=${photonsPerBit.toFixed(2)} (SNSPD Poisson BER=${quantumPoissonBer.toExponential(2)}), ` +
    `Rate=${dataRateMbps.toFixed(2)} Mbps (PPM-${params.ppmOrderM}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    freeSpacePathLossDb: pathLossDb,
    receivedSignalPhotonsPerPulse: photonsPerPulse,
    photonsPerBit,
    dataRateMbps,
    pointingLossDb,
    strehlRatioGroundAtmosphere: strehlRatio,
    quantumPoissonBer,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface DsocScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllDsocScenarios(): DsocScenario[] {
  const scenarios: DsocScenario[] = [];
  const missions = [
    { name: "NASA Psyche DSOC Milestone 1 (Near Earth, 0.25 AU)", au: 0.25, Ptx: 5.0, Dt: 0.22, Dr: 5.1, jitter: 0.6, M: 16, slot: 1.0, r0: 12 },
    { name: "NASA Psyche DSOC Milestone 2 (Intermediate, 1.1 AU)", au: 1.10, Ptx: 5.0, Dt: 0.22, Dr: 5.1, jitter: 0.8, M: 32, slot: 2.0, r0: 10 },
    { name: "NASA Psyche DSOC Deep Milestone (Max Range, 2.5 AU)", au: 2.50, Ptx: 5.0, Dt: 0.22, Dr: 5.1, jitter: 0.9, M: 64, slot: 4.0, r0: 9 },
    { name: "ESA ScyLight Mars Express Optical Trunk (1.5 AU)", au: 1.50, Ptx: 10.0, Dt: 0.30, Dr: 8.2, jitter: 0.5, M: 32, slot: 1.5, r0: 14 },
    { name: "Next-Gen Outer Solar System Jupiter Relay (4.2 AU)", au: 4.20, Ptx: 25.0, Dt: 0.50, Dr: 10.0, jitter: 0.4, M: 128, slot: 8.0, r0: 15 }
  ];

  for (let i = 1; i <= 25; i++) {
    const m = missions[(i - 1) % missions.length];
    const distVar = m.au * (1.0 + ((i % 5) - 2) * 0.02);
    scenarios.push({
      id: `NOCTIS-DSOC-OPTICAL-${String(i).padStart(2, "0")}`,
      domain: "DEEP_SPACE_OPTICAL_COMMS",
      title: `Photon-Counting PPM & Atmospheric Jitter Invariant #${i} (${m.name})`,
      governingStandard: "CCSDS 141.0-B-1 / NASA DSOC Flight Operations / IEEE Transactions on Aerospace and Electronic Systems",
      execute: () => {
        const res = evaluateDeepSpaceOpticalLink({
          distanceAstronomicalUnits: distVar,
          laserWavelengthNm: 1550,
          transmitPowerWatts: m.Ptx,
          transmitterApertureDiameterM: m.Dt,
          groundReceiverApertureDiameterM: m.Dr,
          pointingJitterMicroradians: m.jitter,
          ppmOrderM: m.M,
          slotWidthNanoseconds: m.slot,
          atmosphericFriedParameterR0Cm: m.r0
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
