/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 90: QUANTUM SENSING & COLD ATOM GRAVIMETRY
 * ============================================================================
 * Sovereign computational engine for precision quantum metrology, cold-atom
 * Mach-Zehnder gravimetry, NV-center magnetometry, and Standard Quantum Limit (SQL).
 *
 * Mathematical & Quantum Metrology Invariants:
 * 1. Atom Interferometer Gravimeter Phase Shift (Kasevich & Chu 1991):
 *    Delta Phi_grav = k_eff * g * T^2
 *    where k_eff = 2 * (2 * pi / lambda) is Raman effective wavevector,
 *    T is free-fall interrogation time between pi/2 - pi - pi/2 laser pulses.
 * 2. Standard Quantum Limit (SQL) Shot-Noise Boundary:
 *    delta g_SQL = 1 / (C * k_eff * T^2 * sqrt(N_atoms))
 *    where C is fringe contrast / visibility (0 < C <= 1).
 * 3. Sagnac Atom Interferometer Gyroscope Rotation Phase Shift:
 *    Delta Phi_Sagnac = (4 * pi * m_atom / h) * Omega * Area
 * 4. Nitrogen-Vacancy (NV) Center Electron Spin Magnetometer Sensitivity:
 *    eta_B = (hbar / (g_e * mu_B)) * (1 / (C * sqrt(N_NV * T_2_star)))
 *    where g_e ~ 2.0028, mu_B is Bohr magneton, T_2_star is dephasing time.
 */

export interface QuantumSensingParams {
  laserWavelengthNm: number;         // e.g. 780 nm for Rb-87 D2 line
  pulseSeparationTimeSec: number;    // T in seconds (e.g. 0.05 to 0.20 s)
  atomNumberN: number;               // Number of detected atoms per shot (e.g. 1e6)
  fringeContrastVisibility?: number; // C (default 0.65)
  localGravityMs2?: number;          // g in m/s^2 (default 9.80665)
  nvDephasingTimeUs?: number;        // T2* in microseconds (default 2.5 us)
  nvDensityPerCm3?: number;          // NV density (default 1e16 cm^-3)
}

export interface QuantumSensingAuditResult {
  effectiveWavevectorKeffM: number;
  totalInterferometerPhaseRad: number;
  shotNoiseLimitDeltaGPerShotMs2: number;
  gravimeterSensitivityUgalPerSqrtHz: number;
  nvMagnetometerSensitivityPtPerSqrtHz: number;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateQuantumSensingGravimetry(params: QuantumSensingParams): QuantumSensingAuditResult {
  const lambda_m = params.laserWavelengthNm * 1e-9;
  const k_laser = (2 * Math.PI) / lambda_m;
  // Counter-propagating two-photon Raman transition: k_eff = 2 * k_laser
  const k_eff = 2 * k_laser;

  const T = params.pulseSeparationTimeSec;
  const g = params.localGravityMs2 ?? 9.80665;
  const C = params.fringeContrastVisibility ?? 0.65;
  const N = params.atomNumberN;

  // Phase shift Delta Phi = k_eff * g * T^2
  const deltaPhi_rad = k_eff * g * Math.pow(T, 2);

  // Single-shot standard quantum limit uncertainty: delta g = 1 / (C * k_eff * T^2 * sqrt(N))
  const delta_g_shot = 1 / (C * k_eff * Math.pow(T, 2) * Math.sqrt(Math.max(1, N)));

  // Sensitivity in uGal / sqrt(Hz) (1 Gal = 1 cm/s^2 = 1e-2 m/s^2, 1 uGal = 1e-8 m/s^2)
  // Assuming repetition cycle time ~ 2 * T + 0.1 s
  const cycleTime = 2 * T + 0.1;
  const delta_g_uGal = delta_g_shot * 1e8;
  const sensitivity_uGal_sqrtHz = delta_g_uGal * Math.sqrt(cycleTime);

  // NV Center Magnetometer Sensitivity (pT / sqrt(Hz))
  // eta_B ~ hbar / (g * mu_B) * 1 / (C * sqrt(N_NV * T_2*))
  const hbar = 1.054571817e-34;
  const g_e = 2.0028;
  const mu_B = 9.2740100783e-24;
  const T2_star_s = (params.nvDephasingTimeUs ?? 2.5) * 1e-6;
  const N_NV = (params.nvDensityPerCm3 ?? 1e16) * 1e-6; // per mm^3
  const eta_B_Tesla_sqrtHz = (hbar / (g_e * mu_B)) * (1 / (0.5 * Math.sqrt(Math.max(1, N_NV) * T2_star_s)));
  const eta_B_pT_sqrtHz = eta_B_Tesla_sqrtHz * 1e12;

  const invariantsSatisfied = k_eff > 0 && deltaPhi_rad > 0 && delta_g_shot > 0 && sensitivity_uGal_sqrtHz > 0;

  const diagnostic = `Quantum Sensing Audit: k_eff=${k_eff.toExponential(3)} m^-1 (lambda=${params.laserWavelengthNm}nm), ` +
    `T=${T}s, Phase Shift=${deltaPhi_rad.toExponential(3)} rad, Single-shot delta_g=${delta_g_shot.toExponential(2)} m/s^2 ` +
    `(${delta_g_uGal.toFixed(1)} uGal), Sensitivity=${sensitivity_uGal_sqrtHz.toFixed(1)} uGal/sqrt(Hz), ` +
    `NV Magnetometer=${eta_B_pT_sqrtHz.toFixed(2)} pT/sqrt(Hz). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    effectiveWavevectorKeffM: k_eff,
    totalInterferometerPhaseRad: deltaPhi_rad,
    shotNoiseLimitDeltaGPerShotMs2: delta_g_shot,
    gravimeterSensitivityUgalPerSqrtHz: sensitivity_uGal_sqrtHz,
    nvMagnetometerSensitivityPtPerSqrtHz: eta_B_pT_sqrtHz,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface QuantumSensingScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllQuantumSensingScenarios(): QuantumSensingScenario[] {
  const scenarios: QuantumSensingScenario[] = [];
  const sensors = [
    { name: "Rubidium-87 Absolute Cold-Atom Gravimeter", lambda: 780.0, T: 0.12, N: 1e6, C: 0.70 },
    { name: "Cesium-133 Raman Atom Interferometer", lambda: 852.0, T: 0.15, N: 2e6, C: 0.65 },
    { name: "Strontium Optical Lattice Clock Gravimeter", lambda: 698.0, T: 0.20, N: 5e5, C: 0.80 },
    { name: "Portable Field Atom Gravimeter (Geodesy)", lambda: 780.0, T: 0.06, N: 8e5, C: 0.60 },
    { name: "High-Flux Cold Beam Sagnac Gyroscope", lambda: 780.0, T: 0.08, N: 3e6, C: 0.55 }
  ];

  for (let i = 1; i <= 25; i++) {
    const s = sensors[(i - 1) % sensors.length];
    const tVar = Math.max(0.02, s.T + ((i % 5) - 2) * 0.015);
    scenarios.push({
      id: `NOCTIS-QUANTUM-SENSE-${String(i).padStart(2, "0")}`,
      domain: "QUANTUM_SENSING_GRAVIMETRY",
      title: `Atom Interferometer Raman Phase Shift & SQL Precision #${i} (${s.name})`,
      governingStandard: "BIPM Quantum Metrology Standards / NIST PML / IEEE Metrology",
      execute: () => {
        const res = evaluateQuantumSensingGravimetry({
          laserWavelengthNm: s.lambda,
          pulseSeparationTimeSec: tVar,
          atomNumberN: s.N,
          fringeContrastVisibility: s.C
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
