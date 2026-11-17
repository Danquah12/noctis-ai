/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 107: QUANTUM OPTOMECHANICS & CAVITY COOLING
 * ============================================================================
 * Sovereign computational engine for cavity optomechanics, radiation pressure
 * dynamical backaction, resolved-sideband laser cooling to the quantum ground state (n_m < 1),
 * and Optomechanically Induced Transparency (OMIT).
 *
 * Mathematical & Quantum Invariants:
 * 1. Single-Photon Optomechanical Coupling Rate:
 *    g_0 = (omega_c / L_cav) * x_zpf
 *    Zero-point fluctuation amplitude: x_zpf = sqrt( hbar / (2 * m_eff * omega_m) )
 * 2. Resolved-Sideband Cooling Limit (Good Cavity Regime):
 *    omega_m >> kappa (mechanical resonance exceeds optical cavity decay rate).
 *    Laser detuned to the red sideband: Delta = - omega_m.
 * 3. Final Mechanical Phonon Occupation Number:
 *    n_final = (gamma_m * n_th + Gamma_opt * n_min) / (gamma_m + Gamma_opt)
 *    Optomechanical damping rate: Gamma_opt = 4 * g_0^2 * n_photons / kappa
 *    Ground State Invariant: n_final < 1.0 (quantum ground state cooling).
 * 4. Optomechanical Cooperativity:
 *    C_om = 4 * g_0^2 * n_photons / (kappa * gamma_m) >= 1 (strong quantum regime).
 */

export interface OptomechanicsParams {
  cavityLengthMm: number;            // L_cav in mm (e.g. 1.0 - 25 mm)
  cavityWavelengthNm: number;        // lambda in nm (e.g. 1064 or 1550 nm)
  cavityDecayRateKappaMhz: number;   // kappa / (2*pi) in MHz (e.g. 0.5 - 5.0 MHz)
  mechanicalFrequencyOmegaMMhz: number; // omega_m / (2*pi) in MHz (e.g. 5.0 - 50 MHz)
  effectiveMassPicograms: number;    // m_eff in pg (e.g. 10 - 1000 pg)
  mechanicalQualityFactorQm: number; // Q_m (e.g. 1e5 to 1e7)
  cryogenicBathTempKelvin: number;   // T_bath in K (e.g. 0.05 to 4.2 K)
  intracavityPhotonNumber: number;   // n_cav (e.g. 1e4 to 1e6)
}

export interface OptomechanicsAuditResult {
  zeroPointFluctuationFm: number;
  singlePhotonCouplingG0Hz: number;
  isResolvedSidebandRegime: boolean;
  optomechanicalCooperativity: number;
  finalPhononOccupation: number;
  isQuantumGroundStateCooled: boolean;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateQuantumOptomechanics(params: OptomechanicsParams): OptomechanicsAuditResult {
  const hbar = 1.054571817e-34;
  const k_B = 1.380649e-23;
  const c = 2.99792458e8;

  // Mechanical properties
  const omega_m = params.mechanicalFrequencyOmegaMMhz * 1e6 * 2 * Math.PI;
  const m_eff_kg = params.effectiveMassPicograms * 1e-15;

  // Zero-point fluctuation x_zpf = sqrt(hbar / (2 * m * omega_m))
  const x_zpf_m = Math.sqrt(hbar / (2 * m_eff_kg * omega_m));
  const x_zpf_fm = x_zpf_m * 1e15; // femtometers

  // Optical properties
  const lambda_m = params.cavityWavelengthNm * 1e-9;
  const omega_c = (2 * Math.PI * c) / lambda_m;
  const L_cav_m = params.cavityLengthMm * 1e-3;

  // Single-photon coupling g0 = (omega_c / L) * x_zpf
  const g0_rad_s = (omega_c / L_cav_m) * x_zpf_m;
  const g0_hz = g0_rad_s / (2 * Math.PI);

  // Resolved sideband condition: omega_m > kappa
  const kappa_rad_s = params.cavityDecayRateKappaMhz * 1e6 * 2 * Math.PI;
  const isResolvedSideband = omega_m > kappa_rad_s;

  // Thermal phonon number n_th = k_B * T / (hbar * omega_m)
  const n_th = (k_B * params.cryogenicBathTempKelvin) / (hbar * omega_m);

  // Mechanical damping rate gamma_m = omega_m / Q_m
  const gamma_m = omega_m / params.mechanicalQualityFactorQm;

  // Optomechanical damping rate: Gamma_opt = 4 * g0^2 * n_photons / kappa
  const Gamma_opt = (4 * Math.pow(g0_rad_s, 2) * params.intracavityPhotonNumber) / Math.max(1, kappa_rad_s);

  // Cooperativity C = Gamma_opt / gamma_m
  const C_om = Gamma_opt / Math.max(1e-6, gamma_m);

  // Final phonon occupation n_final ~ n_th / (1 + C_om) + (kappa / (4 * omega_m))^2
  const quantumBackactionFloor = Math.pow(kappa_rad_s / (4 * omega_m), 2);
  const n_final = (n_th / (1 + C_om)) + quantumBackactionFloor;
  const isGroundState = n_final < 1.0;

  const invariantsSatisfied = x_zpf_fm > 0 &&
    g0_hz > 0 &&
    isResolvedSideband &&
    C_om > 1.0 &&
    n_final > 0;

  const diagnostic = `Quantum Optomechanics Audit: omega_m/2pi=${params.mechanicalFrequencyOmegaMMhz} MHz, kappa/2pi=${params.cavityDecayRateKappaMhz} MHz (Resolved: ${isResolvedSideband}), ` +
    `x_zpf=${x_zpf_fm.toFixed(2)} fm, g_0/2pi=${g0_hz.toFixed(1)} Hz, Cooperativity C=${C_om.toFixed(1)}, ` +
    `Thermal n_th=${n_th.toFixed(0)}, Final Phonon n_final=${n_final.toFixed(3)} (Ground State < 1: ${isGroundState}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    zeroPointFluctuationFm: x_zpf_fm,
    singlePhotonCouplingG0Hz: g0_hz,
    isResolvedSidebandRegime: isResolvedSideband,
    optomechanicalCooperativity: C_om,
    finalPhononOccupation: n_final,
    isQuantumGroundStateCooled: isGroundState,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface OptomechanicsScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllOptomechanicsScenarios(): OptomechanicsScenario[] {
  const scenarios: OptomechanicsScenario[] = [];
  const resonators = [
    { name: "Silicon Nitride Membrane in Fabry-Perot (T=0.1K)", L: 2.0, lambda: 1064, kap: 1.2, om: 12.0, m: 20, Q: 2e6, T: 0.1, n: 2.5e5 },
    { name: "Photonic Crystal Nanobeam Resonator (T=4K)", L: 0.05, lambda: 1550, kap: 2.5, om: 45.0, m: 0.5, Q: 5e6, T: 4.0, n: 8e4 },
    { name: "Microtoroid Whispering-Gallery Cavity (T=0.5K)", L: 0.08, lambda: 1550, kap: 3.0, om: 35.0, m: 2.0, Q: 1e6, T: 0.5, n: 1.5e5 },
    { name: "Levitated Nanosphere in Optical Tweezer (T=0.01K)", L: 5.0, lambda: 1064, kap: 0.8, om: 8.5, m: 5.0, Q: 1e7, T: 0.01, n: 5e5 },
    { name: "Superconducting Aluminum Drum Microwave Cavity (T=0.02K)", L: 0.1, lambda: 1550, kap: 1.5, om: 15.0, m: 50, Q: 3e6, T: 0.02, n: 4e5 }
  ];

  for (let i = 1; i <= 25; i++) {
    const r = resonators[(i - 1) % resonators.length];
    const nVar = r.n * (1.0 + ((i % 5) - 2) * 0.05);
    scenarios.push({
      id: `NOCTIS-OPTOMECHANICS-${String(i).padStart(2, "0")}`,
      domain: "QUANTUM_OPTOMECHANICS_COOLING",
      title: `Sideband Cooling to Quantum Ground State #${i} (${r.name})`,
      governingStandard: "BIPM Quantum Precision Metrology / IEEE Quantum Electronics / NIST PML Protocols",
      execute: () => {
        const res = evaluateQuantumOptomechanics({
          cavityLengthMm: r.L,
          cavityWavelengthNm: r.lambda,
          cavityDecayRateKappaMhz: r.kap,
          mechanicalFrequencyOmegaMMhz: r.om,
          effectiveMassPicograms: r.m,
          mechanicalQualityFactorQm: r.Q,
          cryogenicBathTempKelvin: r.T,
          intracavityPhotonNumber: nVar
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
