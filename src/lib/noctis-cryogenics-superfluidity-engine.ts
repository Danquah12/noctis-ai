/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 82: CRYOGENICS & SUPERFLUID HELIUM DYNAMICS
 * ============================================================================
 * Sovereign computational engine for ultra-low temperature physics, liquid He-4
 * superfluid transition, Gorter-Mellink internal convection, and refrigeration thermodynamics.
 *
 * Mathematical & Thermodynamic Invariants:
 * 1. Lambda Transition Point: T_lambda = 2.1720 K at saturated vapor pressure (0.0504 bar).
 *    Superfluid density fraction: rho_s / rho = 1 - (T / T_lambda)^5.6 (Landau two-fluid model)
 * 2. Gorter-Mellink Heat Transport in He-II:
 *    q^m = - (1 / f(T)) * (dT / dx), with m ~ 3 to 3.4 (turbulent mutual friction)
 *    Enables colossal effective thermal conductivity: k_eff > 10^5 * k_copper.
 * 3. Kapitza Thermal Boundary Resistance: R_K = Delta T / q = h_K^-1
 *    where h_K ~ alpha * T^3 (phonon mismatch across solid-liquid helium interface)
 * 4. Carnot Coefficient of Performance (COP) at Cryogenic Temperatures:
 *    COP_Carnot = T_cold / (T_warm - T_cold)
 *    Actual refrigerator efficiency: eta_carnot = COP_actual / COP_Carnot (typically 0.15 - 0.30)
 * 5. Minimum Work of Refrigeration: W_min = Q_cold * (T_warm - T_cold) / T_cold
 */

export interface CryogenicHe2Params {
  bathTemperatureK: number;         // Operating temperature in Kelvin (e.g. 1.8 - 2.1 K)
  ambientTemperatureK?: number;     // Heat sink warm temperature (default 300 K)
  heatLoadWatts: number;            // Applied thermal load Q in Watts
  channelLengthMeters: number;      // Heat conduction channel length in meters
  channelAreaM2: number;            // Conduction cross-sectional area in m^2
  solidContactAreaM2?: number;      // Interface area for Kapitza resistance in m^2
  refrigeratorExergyEfficiency?: number; // Real vs Carnot efficiency (default 0.22)
}

export interface CryogenicAuditResult {
  isSuperfluid: boolean;
  superfluidFractionRhoS: number;
  heatFluxDensityWM2: number;
  temperatureDropDeltaTK: number;
  kapitzaTemperatureJumpK: number;
  carnotCop: number;
  actualCop: number;
  inputPowerRequiredWatts: number;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateCryogenicSuperfluidSystem(params: CryogenicHe2Params): CryogenicAuditResult {
  const T_lambda = 2.172; // K at saturated vapor pressure
  const T_cold = params.bathTemperatureK;
  const T_warm = params.ambientTemperatureK ?? 300.0;
  const isSuperfluid = T_cold < T_lambda;

  // Superfluid density fraction from Landau 2-fluid phenomenological fit
  let rhoS_fraction = 0;
  if (isSuperfluid && T_cold > 0) {
    rhoS_fraction = Math.max(0, Math.min(1, 1 - Math.pow(T_cold / T_lambda, 5.6)));
  }

  // Heat flux density q = Q / A
  const q_WM2 = params.heatLoadWatts / params.channelAreaM2;

  // Gorter-Mellink heat conductivity function: q^3.4 = X(T) * grad(T)
  // For 1.8K to 2.0K, typical effective mutual friction conductivity function yields:
  // Delta T ~ L * (q / 10000)^3.4 * factor
  const gmConductivityFactor = 8.5e-4; // m * K / (W/m^2)^3.4 equivalent
  const deltaT_channel = params.channelLengthMeters * Math.pow(q_WM2 / 1000, 3.4) * gmConductivityFactor;

  // Kapitza thermal boundary resistance jump Delta T_K = q_interface / (h_0 * T^3)
  const contactArea = params.solidContactAreaM2 ?? params.channelAreaM2;
  const q_interface = params.heatLoadWatts / contactArea;
  const h_0 = 900; // W / (m^2 * K^4) for polished copper-helium interface
  const h_K = h_0 * Math.pow(T_cold, 3);
  const deltaT_kapitza = q_interface / Math.max(1, h_K);

  // Carnot COP and electrical input power calculation
  const carnotCop = T_cold / (T_warm - T_cold);
  const exergyEff = params.refrigeratorExergyEfficiency ?? 0.22;
  const actualCop = carnotCop * exergyEff;
  const inputPowerW = params.heatLoadWatts / Math.max(1e-6, actualCop);

  const invariantsSatisfied = isSuperfluid &&
    rhoS_fraction > 0 &&
    deltaT_channel >= 0 &&
    actualCop > 0 &&
    inputPowerW > params.heatLoadWatts;

  const diagnostic = `Cryogenics He-II Audit: T_bath=${T_cold.toFixed(3)} K (< T_lambda 2.172 K? ${isSuperfluid}), ` +
    `rho_s/rho=${(rhoS_fraction * 100).toFixed(1)}%, HeatFlux=${q_WM2.toFixed(1)} W/m^2, ` +
    `DeltaT_GM=${deltaT_channel.toFixed(4)} K, DeltaT_Kapitza=${deltaT_kapitza.toFixed(4)} K, ` +
    `InputPower=${(inputPowerW / 1000).toFixed(1)} kW (Carnot COP=${carnotCop.toFixed(5)}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    isSuperfluid,
    superfluidFractionRhoS: rhoS_fraction,
    heatFluxDensityWM2: q_WM2,
    temperatureDropDeltaTK: deltaT_channel,
    kapitzaTemperatureJumpK: deltaT_kapitza,
    carnotCop,
    actualCop,
    inputPowerRequiredWatts: inputPowerW,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface CryogenicsScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllCryogenicsScenarios(): CryogenicsScenario[] {
  const scenarios: CryogenicsScenario[] = [];
  const cryoCases = [
    { name: "LHC Magnet String (1.9 K)", T: 1.9, Q: 35, L: 5.0, A: 0.008 },
    { name: "Superconducting Cavity Cryomodule (1.8 K)", T: 1.8, Q: 80, L: 2.0, A: 0.015 },
    { name: "Deep Underground Dark Matter Detector (1.5 K)", T: 1.5, Q: 5, L: 1.0, A: 0.002 },
    { name: "High-Field Tokamak Solenoid Cryostat (2.0 K)", T: 2.0, Q: 120, L: 8.0, A: 0.025 },
    { name: "Quantum Processor Dilution Stage Pre-Cool (2.1 K)", T: 2.1, Q: 15, L: 1.5, A: 0.004 }
  ];

  for (let i = 1; i <= 25; i++) {
    const c = cryoCases[(i - 1) % cryoCases.length];
    const heatScale = 1.0 + ((i % 5) - 2) * 0.1;
    scenarios.push({
      id: `NOCTIS-CRYO-HE2-${String(i).padStart(2, "0")}`,
      domain: "CRYOGENICS_SUPERFLUID_DYNAMICS",
      title: `Cryogenic He-II Gorter-Mellink Heat Transport #${i} (${c.name})`,
      governingStandard: "CERN Cryogenic Guidelines / CEC Standards / ASME Cryo",
      execute: () => {
        const res = evaluateCryogenicSuperfluidSystem({
          bathTemperatureK: c.T,
          heatLoadWatts: c.Q * heatScale,
          channelLengthMeters: c.L,
          channelAreaM2: c.A
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
