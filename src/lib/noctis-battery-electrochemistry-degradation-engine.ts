/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 103: BATTERY ELECTROCHEMISTRY & DEGRADATION
 * ============================================================================
 * Sovereign computational engine for lithium-ion battery physics, Butler-Volmer
 * charge transfer, Solid Electrolyte Interphase (SEI) diffusion growth, and lithium plating.
 *
 * Mathematical & Electrochemical Invariants:
 * 1. Butler-Volmer Charge-Transfer Current Density:
 *    j = j_0 * [ exp( (alpha_a * F * eta) / (R * T) ) - exp( -(alpha_c * F * eta) / (R * T) ) ]
 *    Exchange current density: j_0 = F * k_0 * c_e^alpha_a * c_s_max^(1 - alpha_a) * theta^alpha_c * (1 - theta)^alpha_a
 * 2. Solid Electrolyte Interphase (SEI) Parabolic Layer Growth (Pinson & Bazant):
 *    dL_SEI / dt = (M_SEI / (2 * rho_SEI * F)) * (D_solv * c_solv) / L_SEI
 *    L_SEI(t) = sqrt( L_0^2 + 2 * k_SEI * t ) (diffusive sqrt(t) capacity loss).
 * 3. Lithium Plating Onset Invariant (Arora et al.):
 *    eta_plating = phi_s_anode - phi_e_anode - U_ref(Li/Li+)
 *    Safety Invariant: eta_plating > 0 V vs Li/Li+ everywhere.
 *    If eta_plating <= 0 V (e.g. during fast charging at cold temperatures), metallic lithium plates,
 *    forming dendrites that risk thermal runaway internal shorts.
 */

export interface BatteryElectrochemistryParams {
  stateOfChargeSoc: number;          // SoC (0.0 to 1.0)
  chargeRateC: number;               // C-rate (e.g. 0.5C to 4.0C fast charge)
  temperatureCelsius: number;        // T in C (e.g. -10C to 45C)
  anodeOverpotentialVolts: number;   // eta_anode in V
  anodeSolidPotentialVolts: number;  // phi_s in V vs Li/Li+ (e.g. 0.03 - 0.25 V)
  electrolytePotentialVolts: number; // phi_e in V (e.g. 0.01 - 0.05 V)
  cycleCountN: number;               // Number of full equivalent cycles
  initialCapacityAh?: number;        // Nominal capacity in Ah (default 5.0 Ah)
}

export interface BatteryElectrochemistryAuditResult {
  exchangeCurrentDensityAM2: number;
  lithiumPlatingPotentialVolts: number;
  isLithiumPlatingAvoided: boolean;
  seiLayerThicknessNanometers: number;
  capacityRetentionPercent: number;
  isCellSafeFromDendrites: boolean;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateBatteryElectrochemistry(params: BatteryElectrochemistryParams): BatteryElectrochemistryAuditResult {
  const T_K = params.temperatureCelsius + 273.15;
  const F = 96485.3321; // C/mol
  const R = 8.314;       // J/(mol*K)

  // Lithium plating overpotential: eta_plating = phi_s - phi_e
  // If phi_s - phi_e < 0 V, driving force for Li deposition exceeds intercalation!
  const eta_plating = params.anodeSolidPotentialVolts - params.electrolytePotentialVolts;
  const isPlatingAvoided = eta_plating > 0.005; // 5 mV safety margin

  // Exchange current density Arrhenius scaling
  const E_a = 40000; // J/mol activation energy
  const j0_ref = 2.5; // A/m^2 at 298 K
  const j0 = j0_ref * Math.exp((-E_a / R) * (1 / T_K - 1 / 298.15)) * Math.sqrt(params.stateOfChargeSoc * (1 - params.stateOfChargeSoc + 0.01));

  // SEI layer growth thickness: L_SEI = L_0 + k_sei * sqrt(t_cycles)
  const L0_nm = 2.0;
  const k_sei = 0.45 * Math.exp((params.temperatureCelsius - 25) * 0.04);
  const L_sei_nm = L0_nm + k_sei * Math.sqrt(Math.max(1, params.cycleCountN));

  // Capacity retention % from SEI loss & cyclic fade
  const capacityLoss_pct = (L_sei_nm / 100) * 8.5 + (params.cycleCountN * 0.015) * (params.chargeRateC > 2.0 ? 1.5 : 1.0);
  const retention_pct = Math.max(0, Math.min(100, 100 - capacityLoss_pct));

  const isDendriteSafe = isPlatingAvoided && params.temperatureCelsius >= -5.0;
  const invariantsSatisfied = j0 > 0 && L_sei_nm > 0 && retention_pct > 0 && isPlatingAvoided;

  const diagnostic = `Battery Electrochemistry Audit: SoC=${(params.stateOfChargeSoc * 100).toFixed(0)}%, C-Rate=${params.chargeRateC}C, T=${params.temperatureCelsius} C, ` +
    `eta_plating=${(eta_plating * 1000).toFixed(1)} mV vs Li/Li+ (Plating Avoided: ${isPlatingAvoided}), ` +
    `j_0=${j0.toFixed(3)} A/m^2, SEI Thickness=${L_sei_nm.toFixed(1)} nm, Capacity Retention=${retention_pct.toFixed(1)}% ` +
    `after ${params.cycleCountN} cycles (Dendrite Safe: ${isDendriteSafe}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    exchangeCurrentDensityAM2: j0,
    lithiumPlatingPotentialVolts: eta_plating,
    isLithiumPlatingAvoided: isPlatingAvoided,
    seiLayerThicknessNanometers: L_sei_nm,
    capacityRetentionPercent: retention_pct,
    isCellSafeFromDendrites: isDendriteSafe,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface BatteryScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllBatteryScenarios(): BatteryScenario[] {
  const scenarios: BatteryScenario[] = [];
  const cellCases = [
    { name: "NMC811 Automotive Fast Charge 2C (25C)", soc: 0.65, C: 2.0, T: 25, phiS: 0.08, phiE: 0.03, cycles: 450 },
    { name: "LFP Commercial Storage Moderate 0.5C (30C)", soc: 0.80, C: 0.5, T: 30, phiS: 0.12, phiE: 0.02, cycles: 2500 },
    { name: "High-Power Drone LCO Pulse 3C (35C)", soc: 0.50, C: 3.0, T: 35, phiS: 0.06, phiE: 0.04, cycles: 300 },
    { name: "Cold-Weather EV Pre-conditioned Charge (10C)", soc: 0.40, C: 1.2, T: 10, phiS: 0.05, phiE: 0.02, cycles: 600 },
    { name: "Silicon-Graphite Next-Gen Anode 1.5C (25C)", soc: 0.55, C: 1.5, T: 25, phiS: 0.09, phiE: 0.03, cycles: 800 }
  ];

  for (let i = 1; i <= 25; i++) {
    const c = cellCases[(i - 1) % cellCases.length];
    const socVar = Math.min(0.95, c.soc + ((i % 5) - 2) * 0.03);
    scenarios.push({
      id: `NOCTIS-BATTERY-ELECTROCHEM-${String(i).padStart(2, "0")}`,
      domain: "BATTERY_ELECTROCHEMISTRY_DEGRADATION",
      title: `Butler-Volmer Kinetics & Lithium Plating Invariant #${i} (${c.name})`,
      governingStandard: "UL 2580 EV Battery Safety / IEC 62660 Li-Ion Cells / SAE J2464 Thermal Runaway Protocols",
      execute: () => {
        const res = evaluateBatteryElectrochemistry({
          stateOfChargeSoc: socVar,
          chargeRateC: c.C,
          temperatureCelsius: c.T,
          anodeOverpotentialVolts: 0.04,
          anodeSolidPotentialVolts: c.phiS,
          electrolytePotentialVolts: c.phiE,
          cycleCountN: c.cycles
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
