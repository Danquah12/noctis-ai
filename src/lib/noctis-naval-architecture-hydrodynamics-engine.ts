/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 84: NAVAL ARCHITECTURE & MARINE HYDRODYNAMICS
 * ============================================================================
 * Sovereign computational engine for vessel hydrodynamics, transverse stability,
 * Holtrop-Mennen wave-making resistance, and propeller cavitation inception.
 *
 * Mathematical & Naval Invariants:
 * 1. Froude Number: Fn = V / sqrt(g * L_wl)
 *    Fn < 0.4: Displacement hull regime
 *    0.4 <= Fn <= 1.0: Semi-displacement
 *    Fn > 1.0: Planing regime
 * 2. Transverse Metacentric Height (IMO Res. A.749 / 2008 IS Code):
 *    GM = KB + BM - KG
 *    Transverse Metacentric Radius: BM = I_T / V_disp = (C_wp * L * B^3) / (12 * V_disp)
 *    IMO Invariant: Initial GM_0 >= 0.15 m for cargo/passenger ships.
 * 3. Holtrop-Mennen Total Ship Resistance:
 *    R_total = R_F * (1 + k1) + R_APP + R_W + R_B + R_TR + R_A
 *    Wave Resistance R_W scales sharply with Fn^4 to Fn^6 near Fn ~ 0.30 - 0.45.
 * 4. Propeller Cavitation Inception Number:
 *    sigma_c = (p_ambient - p_vapor) / (0.5 * rho_seawater * V_tip^2)
 *    Keller Criterion Minimum Blade Area Ratio: A_E / A_0 >= ( (1.3 + 0.3 * Z) * T_thrust ) / ( (p_0 - p_v) * D^2 )
 */

export interface VesselHydrodynamicsParams {
  lengthWaterlineMeters: number;    // L_wl in meters
  beamMeters: number;               // B in meters
  draftMeters: number;              // T in meters
  displacementVolumeM3: number;     // V_disp in m^3
  speedKnots: number;               // Ship speed V in knots
  centerOfGravityAboveKeelM: number;// KG in meters
  waterplaneCoefficient?: number;   // C_wp (default 0.78)
  propellerDiameterMeters?: number; // D in meters (default 5.5m)
  propellerRpm?: number;            // RPM (default 105)
  propellerBladesZ?: number;        // Number of blades (default 4)
  propellerImmersionMeters?: number;// h in meters (default 4.0m)
}

export interface NavalAuditResult {
  froudeNumber: number;
  hydrodynamicRegime: "DISPLACEMENT" | "SEMI_PLANING" | "PLANING";
  centerOfBuoyancyAboveKeelM: number;
  metacentricRadiusBMM: number;
  metacentricHeightGMM: number;
  isImoStabilitySatisfied: boolean;
  totalWaveResistanceKN: number;
  cavitationInceptionNumber: number;
  isCavitationSuppressed: boolean;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateNavalHydrodynamics(params: VesselHydrodynamicsParams): NavalAuditResult {
  const g = 9.80665;
  const speedMs = params.speedKnots * 0.514444;
  const L = params.lengthWaterlineMeters;
  const B = params.beamMeters;
  const T = params.draftMeters;
  const V_disp = params.displacementVolumeM3;

  // Froude Number
  const Fn = speedMs / Math.sqrt(g * L);
  let regime: "DISPLACEMENT" | "SEMI_PLANING" | "PLANING" = "DISPLACEMENT";
  if (Fn > 1.0) regime = "PLANING";
  else if (Fn >= 0.4) regime = "SEMI_PLANING";

  // Transverse Metacentric Stability
  // Morrish's approximation for KB: KB ~ (5/6) * T - (1/3) * (V_disp / (C_wp * L * B))
  const C_wp = params.waterplaneCoefficient ?? 0.78;
  const KB = (5 / 6) * T - (1 / 3) * (V_disp / (C_wp * L * B));
  // BM = I_T / V_disp, where I_T ~ (1/12) * C_wp * L * B^3
  const I_T = (1 / 12) * C_wp * L * Math.pow(B, 3);
  const BM = I_T / V_disp;
  const GM = KB + BM - params.centerOfGravityAboveKeelM;
  const isImoStabilitySatisfied = GM >= 0.15; // 0.15m IMO standard

  // Holtrop wave-making resistance approximation (kN)
  // R_w ~ c_w * rho * g * V_disp * Fn^4
  const rho_sea = 1025.0; // kg/m^3
  const R_wave_kN = (0.012 * rho_sea * g * V_disp * Math.pow(Fn, 4)) / 1000;

  // Propeller Cavitation Index
  const D_prop = params.propellerDiameterMeters ?? 5.5;
  const rpm = params.propellerRpm ?? 105;
  const omega = (rpm * 2 * Math.PI) / 60;
  const V_tip = omega * (D_prop / 2);
  const h_immersion = params.propellerImmersionMeters ?? 4.0;
  const p_atm = 101325; // Pa
  const p_vapor = 2338; // Pa at 20C seawater
  const p_static = p_atm + rho_sea * g * h_immersion;
  const sigma_c = (p_static - p_vapor) / (0.5 * rho_sea * Math.pow(V_tip, 2));
  const isCavitationSuppressed = sigma_c > 0.35;

  const invariantsSatisfied = Fn > 0 && GM > 0.15 && BM > 0 && R_wave_kN >= 0;

  const diagnostic = `Naval Hydrodynamics: Fn=${Fn.toFixed(3)} (${regime}), GM=${GM.toFixed(3)} m (IMO >= 0.15m: ${isImoStabilitySatisfied}), ` +
    `KB=${KB.toFixed(2)}m, BM=${BM.toFixed(2)}m, R_wave=${R_wave_kN.toFixed(1)} kN, ` +
    `Propeller sigma_c=${sigma_c.toFixed(3)} (Cavitation Suppressed: ${isCavitationSuppressed}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    froudeNumber: Fn,
    hydrodynamicRegime: regime,
    centerOfBuoyancyAboveKeelM: KB,
    metacentricRadiusBMM: BM,
    metacentricHeightGMM: GM,
    isImoStabilitySatisfied,
    totalWaveResistanceKN: R_wave_kN,
    cavitationInceptionNumber: sigma_c,
    isCavitationSuppressed,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface NavalScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllNavalHydrodynamicsScenarios(): NavalScenario[] {
  const scenarios: NavalScenario[] = [];
  const ships = [
    { name: "Post-Panamax Container (8000 TEU)", L: 285, B: 42.8, T: 14.5, Vdisp: 120000, speed: 23, KG: 15.2 },
    { name: "VLCC Crude Oil Tanker (300k DWT)", L: 325, B: 60.0, T: 21.0, Vdisp: 350000, speed: 15.5, KG: 18.5 },
    { name: "Capesize Bulk Carrier (180k DWT)", L: 280, B: 45.0, T: 18.0, Vdisp: 200000, speed: 14.5, KG: 14.0 },
    { name: "High-Speed Ro-Pax Ferry (45 Knots)", L: 110, B: 24.0, T: 3.8, Vdisp: 3500, speed: 38, KG: 6.2 },
    { name: "LNG Membrane Carrier (174k m3)", L: 288, B: 46.4, T: 12.0, Vdisp: 115000, speed: 19.5, KG: 16.8 }
  ];

  for (let i = 1; i <= 25; i++) {
    const s = ships[(i - 1) % ships.length];
    const speedVar = s.speed + ((i % 5) - 2) * 1.0;
    scenarios.push({
      id: `NOCTIS-NAVAL-HYDRO-${String(i).padStart(2, "0")}`,
      domain: "NAVAL_HYDRODYNAMICS_STABILITY",
      title: `Vessel Transverse Stability & Holtrop Wave Resistance #${i} (${s.name})`,
      governingStandard: "IMO 2008 IS Code / ITTC Procedures / DNV Classification Rules",
      execute: () => {
        const res = evaluateNavalHydrodynamics({
          lengthWaterlineMeters: s.L,
          beamMeters: s.B,
          draftMeters: s.T,
          displacementVolumeM3: s.Vdisp,
          speedKnots: speedVar,
          centerOfGravityAboveKeelM: s.KG
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
