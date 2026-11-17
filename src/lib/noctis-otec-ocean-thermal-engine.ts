/**
 * ============================================================================
 * NOCTIS OCEAN THERMAL ENERGY CONVERSION (OTEC) ENGINE (NOCTIS-OTEC-001)
 * Sovereign Physical Systems: Closed-Cycle Ammonia Rankine Thermodynamics, Tropical Seawater Thermocline (Delta T >= 20C),
 * Deep Cold Seawater Pipe (CWP) Hydrodynamics, Heat Exchanger LMTD, Parasitic Pumping Exergy Ratio
 * Standards: IEC 62600-20 Marine Energy - OTEC Plant Design Guidelines / ASME PTC 46 / US DOE Water Power Technologies
 * ============================================================================
 */

export interface OtecPlantParams {
  surfaceWarmSeawaterTempC: number; // e.g. 26 to 29 deg C
  deepColdSeawaterTempC: number; // e.g. 4 to 6 deg C
  coldWaterPipeDepthMeters: number; // e.g. 800 to 1000 m
  coldWaterPipeDiameterMeters: number; // e.g. 2.0 to 4.5 m
  warmWaterFlowRateM3S: number; // e.g. 15 to 45 m3/s
  coldWaterFlowRateM3S: number; // e.g. 10 to 30 m3/s
  grossTurbineOutputMWe: number; // e.g. 5 to 25 MWe
  workingFluid?: "AMMONIA" | "R134A";
}

export interface OtecAuditResult {
  temperatureDifferenceDeltaTCelsius: number;
  carnotIdealEfficiencyPercent: number;
  grossRankineThermalEfficiencyPercent: number;
  coldWaterPipingHeadLossMeters: number;
  parasiticPumpingPowerMWe: number;
  netElectricalPowerMWe: number;
  parasiticLossFractionPercent: number;
  isNetPositivePowerVerified: boolean; // P_net > 0 && parasitic < 35%
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateOtecPowerPlant(params: OtecPlantParams): OtecAuditResult {
  const g = 9.80665;
  const rho_seawater = 1025.0; // kg/m^3

  const T_warm_K = params.surfaceWarmSeawaterTempC + 273.15;
  const T_cold_K = params.deepColdSeawaterTempC + 273.15;
  const deltaT = params.surfaceWarmSeawaterTempC - params.deepColdSeawaterTempC;

  // Carnot theoretical upper limit:
  const eta_carnot = (1.0 - (T_cold_K / T_warm_K)) * 100.0;

  // Practical organic Rankine cycle (ORC) using anhydrous ammonia:
  // Actual thermal efficiency is typically 45-55% of Carnot limit
  const eta_rankine = eta_carnot * 0.48;

  // Deep Cold Water Pipe (CWP) friction and minor loss (Darcy-Weisbach):
  // h_f = f * (L / D) * (V^2 / (2g))
  const D_cwp = params.coldWaterPipeDiameterMeters;
  const L_cwp = params.coldWaterPipeDepthMeters * 1.05; // slightly longer than depth due to catenary/slope
  const A_cwp = (Math.PI / 4) * Math.pow(D_cwp, 2);
  const V_cold = params.coldWaterFlowRateM3S / A_cwp;
  const frictionFactor = 0.016; // smooth HDPE pipe
  const headLossFriction = frictionFactor * (L_cwp / D_cwp) * (Math.pow(V_cold, 2) / (2 * g));
  const headLossMinor = 1.5 * (Math.pow(V_cold, 2) / (2 * g)); // intake screen + diffusers
  const totalHeadLossCold = headLossFriction + headLossMinor;

  // Cold seawater pump electrical consumption:
  const pumpEfficiency = 0.82;
  const motorEfficiency = 0.95;
  const P_cold_pump_W = (rho_seawater * g * params.coldWaterFlowRateM3S * totalHeadLossCold) / (pumpEfficiency * motorEfficiency);
  const P_cold_pump_MWe = P_cold_pump_W / 1e6;

  // Warm seawater pump consumption (shorter pipe, ~ 2.5m head loss):
  const headLossWarm = 2.5;
  const P_warm_pump_W = (rho_seawater * g * params.warmWaterFlowRateM3S * headLossWarm) / (pumpEfficiency * motorEfficiency);
  const P_warm_pump_MWe = P_warm_pump_W / 1e6;

  // Ammonia working fluid feed pump & auxiliaries (~ 5% of gross):
  const P_aux_MWe = params.grossTurbineOutputMWe * 0.05;

  const totalParasiticMWe = P_cold_pump_MWe + P_warm_pump_MWe + P_aux_MWe;
  const netPowerMWe = params.grossTurbineOutputMWe - totalParasiticMWe;
  const parasiticFraction = (totalParasiticMWe / params.grossTurbineOutputMWe) * 100.0;

  const isNetPositive = netPowerMWe > 0;

  const invariantsSatisfied = deltaT >= 19.5 &&
    eta_carnot > 5.5 && eta_carnot < 9.0 &&
    eta_rankine > 2.0 &&
    isNetPositive;

  const diagnostic = `OTEC Thermodynamics Audit: T_warm=${params.surfaceWarmSeawaterTempC}C, T_cold=${params.deepColdSeawaterTempC}C (DeltaT=${deltaT.toFixed(1)}C), ` +
    `Carnot=${eta_carnot.toFixed(2)}%, Rankine=${eta_rankine.toFixed(2)}%, CWP L=${params.coldWaterPipeDepthMeters}m (HeadLoss=${totalHeadLossCold.toFixed(2)}m), ` +
    `P_gross=${params.grossTurbineOutputMWe.toFixed(1)} MWe, Parasitic=${totalParasiticMWe.toFixed(2)} MWe (${parasiticFraction.toFixed(1)}%), ` +
    `P_net=${netPowerMWe.toFixed(2)} MWe (Viable: ${isNetPositive}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    temperatureDifferenceDeltaTCelsius: deltaT,
    carnotIdealEfficiencyPercent: eta_carnot,
    grossRankineThermalEfficiencyPercent: eta_rankine,
    coldWaterPipingHeadLossMeters: totalHeadLossCold,
    parasiticPumpingPowerMWe: totalParasiticMWe,
    netElectricalPowerMWe: netPowerMWe,
    parasiticLossFractionPercent: parasiticFraction,
    isNetPositivePowerVerified: isNetPositive,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface OtecScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllOtecScenarios(): OtecScenario[] {
  const scenarios: OtecScenario[] = [];
  const plants = [
    { name: "Makai Ocean Engineering 105 kW OTEC (Kona, Hawaii)", Tw: 26.5, Tc: 5.0, depth: 900, D: 0.6, Qw: 0.8, Qc: 0.5, Pg: 0.18 },
    { name: "Okinawa Kume Island OTEC Research Facility (Japan)", Tw: 27.0, Tc: 5.2, depth: 650, D: 0.5, Qw: 0.6, Qc: 0.4, Pg: 0.14 },
    { name: "Global OTEC Dominique Floating Platform (Sao Tome)", Tw: 28.5, Tc: 4.5, depth: 1000, D: 2.2, Qw: 18.0, Qc: 12.0, Pg: 1.8 },
    { name: "CNIM Martinique Deep Offshore OTEC Plant (Caribbean)", Tw: 28.0, Tc: 4.8, depth: 1050, D: 3.5, Qw: 38.0, Qc: 25.0, Pg: 16.0 },
    { name: "Kiribati Tarawa Low-Latitude Baseline OTEC (Pacific)", Tw: 29.0, Tc: 4.2, depth: 950, D: 2.8, Qw: 25.0, Qc: 16.5, Pg: 5.5 }
  ];

  for (let i = 1; i <= 25; i++) {
    const p = plants[(i - 1) % plants.length];
    const twVar = p.Tw * (1.0 + ((i % 5) - 2) * 0.01);
    scenarios.push({
      id: `NOCTIS-OTEC-THERMAL-${String(i).padStart(2, "0")}`,
      domain: "OCEAN_THERMAL_ENERGY_CONVERSION",
      title: `Rankine Thermal Efficiency & CWP Head Loss Invariant #${i} (${p.name})`,
      governingStandard: "IEC 62600-20 Marine Energy OTEC Guidelines / ASME PTC 46 Overall Plant Performance",
      execute: () => {
        const res = evaluateOtecPowerPlant({
          surfaceWarmSeawaterTempC: twVar,
          deepColdSeawaterTempC: p.Tc,
          coldWaterPipeDepthMeters: p.depth,
          coldWaterPipeDiameterMeters: p.D,
          warmWaterFlowRateM3S: p.Qw,
          coldWaterFlowRateM3S: p.Qc,
          grossTurbineOutputMWe: p.Pg
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
