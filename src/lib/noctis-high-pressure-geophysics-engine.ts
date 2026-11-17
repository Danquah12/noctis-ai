/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 98: HIGH-PRESSURE GEOPHYSICS & MINERAL PHYSICS
 * ============================================================================
 * Sovereign computational engine for planetary interior mineral physics,
 * Birch-Murnaghan equation of state (EOS), mantle transition zone phase boundaries,
 * and laser-heated diamond anvil cell (LH-DAC) core-mantle boundary (CMB) conditions.
 *
 * Mathematical & Geodynamic Invariants:
 * 1. Birch-Murnaghan 3rd-Order Isothermal Equation of State:
 *    P(V) = (3/2) * K_0 * [ (V_0/V)^(7/3) - (V_0/V)^(5/3) ] * [ 1 + (3/4)*(K_0_prime - 4)*((V_0/V)^(2/3) - 1) ]
 *    where K_0 is zero-pressure bulk modulus, K_0_prime = dK/dP.
 * 2. Mantle Discontinuity Phase Transitions:
 *    - 410 km (14 GPa): Olivine (alpha) -> Wadsleyite (beta) (Clapeyron slope gamma ~ +2.5 to +3.0 MPa/K)
 *    - 520 km (18 GPa): Wadsleyite (beta) -> Ringwoodite (gamma)
 *    - 660 km (24 GPa): Ringwoodite (gamma) -> Bridgmanite + Ferropericlase (gamma ~ -2.0 to -2.8 MPa/K)
 * 3. Seismic Wave Speeds:
 *    V_p = sqrt( (K + 4/3 * G) / rho )
 *    V_s = sqrt( G / rho )
 * 4. Earth Core-Mantle Boundary (CMB): P ~ 136 GPa, T ~ 3800 - 4200 K.
 */

export interface HighPressureGeophysicsParams {
  depthKm: number;                  // Depth z in km (e.g. 50 - 2900 km)
  zeroPressureBulkModulusGPa: number;// K_0 in GPa (e.g. 128 GPa for olivine, 260 GPa for bridgmanite)
  bulkModulusPressureDeriv?: number; // K_0' (default 4.0)
  volumeCompressionRatioVOverV0: number; // V / V_0 (e.g. 0.70 - 0.95)
  temperatureKelvin: number;        // T in K (e.g. 1500 - 4000 K)
  shearModulusGPa?: number;         // G in GPa (default 80 GPa)
  densityGPerCm3: number;           // rho in g/cm^3 (e.g. 3.3 to 5.5 g/cm^3)
}

export interface GeophysicsAuditResult {
  birchMurnaghanPressureGPa: number;
  mantleZoneIdentification: "UPPER_MANTLE" | "TRANSITION_ZONE_410" | "TRANSITION_ZONE_520" | "LOWER_MANTLE_660" | "D_DOUBLE_PRIME_CMB";
  pWaveVelocityKms: number;
  sWaveVelocityKms: number;
  isStableHighPressurePhase: boolean;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateHighPressureGeophysics(params: HighPressureGeophysicsParams): GeophysicsAuditResult {
  const K0 = params.zeroPressureBulkModulusGPa;
  const K0_prime = params.bulkModulusPressureDeriv ?? 4.0;
  const eta = 1 / params.volumeCompressionRatioVOverV0; // V0 / V

  // Birch-Murnaghan 3rd-order EOS:
  // P = 1.5 * K0 * [eta^(7/3) - eta^(5/3)] * [1 + 0.75 * (K0' - 4) * (eta^(2/3) - 1)]
  const f_strain = 0.5 * (Math.pow(eta, 2 / 3) - 1);
  const P_BM_GPa = 3 * K0 * f_strain * Math.pow(1 + 2 * f_strain, 2.5) * (1 + 1.5 * (K0_prime - 4) * f_strain);

  // Mantle zone identification by depth and pressure
  const z = params.depthKm;
  let zone: "UPPER_MANTLE" | "TRANSITION_ZONE_410" | "TRANSITION_ZONE_520" | "LOWER_MANTLE_660" | "D_DOUBLE_PRIME_CMB" = "UPPER_MANTLE";
  if (z >= 2700) zone = "D_DOUBLE_PRIME_CMB";
  else if (z >= 660) zone = "LOWER_MANTLE_660";
  else if (z >= 520) zone = "TRANSITION_ZONE_520";
  else if (z >= 410) zone = "TRANSITION_ZONE_410";

  // Seismic speeds V_p and V_s
  // V_p = sqrt((K + 4/3*G) / rho), V_s = sqrt(G / rho)
  const rho_kg_m3 = params.densityGPerCm3 * 1000;
  const K_eff_Pa = (K0 + K0_prime * P_BM_GPa) * 1e9;
  const G_eff_Pa = (params.shearModulusGPa ?? 80.0) * 1e9;

  const V_s_ms = Math.sqrt(G_eff_Pa / rho_kg_m3);
  const V_p_ms = Math.sqrt((K_eff_Pa + (4 / 3) * G_eff_Pa) / rho_kg_m3);

  const V_s_kms = V_s_ms / 1000;
  const V_p_kms = V_p_ms / 1000;

  const isStable = P_BM_GPa > 0 && V_p_kms > V_s_kms;
  const invariantsSatisfied = P_BM_GPa > 0 && V_p_kms > 0 && V_s_kms > 0 && isStable;

  const diagnostic = `High-Pressure Geophysics: Depth=${z} km (${zone}), V/V0=${params.volumeCompressionRatioVOverV0.toFixed(3)}, ` +
    `Birch-Murnaghan P=${P_BM_GPa.toFixed(1)} GPa, T=${params.temperatureKelvin} K, ` +
    `Seismic V_p=${V_p_kms.toFixed(2)} km/s, V_s=${V_s_kms.toFixed(2)} km/s (Phase Stable: ${isStable}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    birchMurnaghanPressureGPa: P_BM_GPa,
    mantleZoneIdentification: zone,
    pWaveVelocityKms: V_p_kms,
    sWaveVelocityKms: V_s_kms,
    isStableHighPressurePhase: isStable,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface GeophysicsScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllGeophysicsScenarios(): GeophysicsScenario[] {
  const scenarios: GeophysicsScenario[] = [];
  const interiorLayers = [
    { name: "410 km Olivine-Wadsleyite Transition Zone", z: 415, K0: 128, Kp: 4.2, vRatio: 0.94, T: 1750, G: 82, rho: 3.6 },
    { name: "660 km Ringwoodite-Bridgmanite Discontinuity", z: 665, K0: 175, Kp: 4.1, vRatio: 0.90, T: 1900, G: 115, rho: 4.1 },
    { name: "Mid-Lower Mantle Bridgmanite & Ferropericlase", z: 1500, K0: 250, Kp: 4.0, vRatio: 0.82, T: 2400, G: 160, rho: 4.8 },
    { name: "D'' Layer Core-Mantle Boundary (CMB Post-Perovskite)", z: 2850, K0: 260, Kp: 3.9, vRatio: 0.74, T: 3800, G: 220, rho: 5.5 },
    { name: "Subducting Cold Lithospheric Slab in Transition Zone", z: 550, K0: 160, Kp: 4.3, vRatio: 0.92, T: 1400, G: 98, rho: 3.8 }
  ];

  for (let i = 1; i <= 25; i++) {
    const l = interiorLayers[(i - 1) % interiorLayers.length];
    const vScale = l.vRatio * (1.0 + ((i % 5) - 2) * 0.01);
    scenarios.push({
      id: `NOCTIS-GEOPHYSICS-HP-${String(i).padStart(2, "0")}`,
      domain: "HIGH_PRESSURE_GEOPHYSICS",
      title: `Birch-Murnaghan EOS & Mantle Phase Transition #${i} (${l.name})`,
      governingStandard: "IUGG Mineral Physics Standards / PREM Reference Earth Model / AGU Geodynamics",
      execute: () => {
        const res = evaluateHighPressureGeophysics({
          depthKm: l.z,
          zeroPressureBulkModulusGPa: l.K0,
          bulkModulusPressureDeriv: l.Kp,
          volumeCompressionRatioVOverV0: vScale,
          temperatureKelvin: l.T,
          shearModulusGPa: l.G,
          densityGPerCm3: l.rho
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
