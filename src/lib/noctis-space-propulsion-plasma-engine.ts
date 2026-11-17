/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 86: ADVANCED SPACE PROPULSION & PLASMA THRUSTERS
 * ============================================================================
 * Sovereign computational engine for electric propulsion, Hall-effect thrusters (HET),
 * gridded ion thrusters (GIT), Magnetoplasmadynamic (MPD) Lorentz accelerators, and channel erosion.
 *
 * Mathematical & Plasma Invariants:
 * 1. Ion Exhaust Velocity & Specific Impulse:
 *    v_ion = sqrt(2 * q_e * V_acc / m_ion)
 *    I_sp = (eta_div * eta_mass * v_ion) / g_0
 *    Thrust: T = m_dot_propellant * v_ion * cos(theta_div)
 * 2. Bohm Sheath Criterion for Stable Plasma Sheaths:
 *    u_ion >= c_s = sqrt(k_B * T_e / m_ion)
 *    Electron temperature T_e typically 15 - 35 eV in Hall acceleration zone.
 * 3. MPD Self-Field Electromagnetic Thrust (Maecker formula):
 *    T_MPD = (mu_0 * I_arc^2 / 4*pi) * [ ln(r_anode / r_cathode) + 3/4 ]
 * 4. Channel Wall Boron Nitride Erosion Rate:
 *    Sputtering yield Y(E_ion, theta) follows Yamamura model.
 *    Erosion limit dictates thruster qualification lifetime (> 10,000 hrs).
 */

export interface PlasmaThrusterParams {
  propellant: "XENON" | "KRYPTON" | "ARGON";
  dischargeVoltageVolts: number;      // V_d (e.g. 300 - 800 V)
  dischargeCurrentAmps: number;       // I_d (e.g. 5 - 50 A)
  propellantFlowRateMgS: number;      // Mass flow rate in mg/s (e.g. 5 - 25 mg/s)
  beamDivergenceAngleDeg?: number;    // Half-angle divergence theta (default 20 deg)
  anodeEfficiencyFraction?: number;   // Anode mass utilization (default 0.90)
  magneticFieldGauss?: number;        // Radial B-field peak (default 250 Gauss)
}

export interface PlasmaThrusterAuditResult {
  propellantAtomicMassAmu: number;
  ionExhaustVelocityKms: number;
  specificImpulseSeconds: number;
  thrustMilliNewtons: number;
  totalElectricPowerWatts: number;
  thrustEfficiencyPercent: number;
  bohmSoundSpeedKms: number;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluatePlasmaSpacePropulsion(params: PlasmaThrusterParams): PlasmaThrusterAuditResult {
  const g_0 = 9.80665;
  const q_e = 1.60217663e-19; // C
  let amu = 131.293; // Xenon default
  if (params.propellant === "KRYPTON") amu = 83.798;
  else if (params.propellant === "ARGON") amu = 39.948;

  const m_ion_kg = amu * 1.660539066e-27;

  // Ion velocity from electrostatic acceleration V_acc ~ 0.85 * V_discharge
  const V_acc = params.dischargeVoltageVolts * 0.88;
  const v_ion_ms = Math.sqrt((2 * q_e * V_acc) / m_ion_kg);
  const v_ion_kms = v_ion_ms / 1000;

  // Beam divergence and mass utilization efficiencies
  const divDeg = params.beamDivergenceAngleDeg ?? 20.0;
  const eta_div = Math.cos((divDeg * Math.PI) / 180);
  const eta_mass = params.anodeEfficiencyFraction ?? 0.90;

  // Specific Impulse I_sp
  const I_sp = (eta_div * eta_mass * v_ion_ms) / g_0;

  // Ionized mass flow rate strictly bounded by discharge current (I_beam <= I_discharge)
  const m_dot_nominal_kg_s = params.propellantFlowRateMgS * 1e-6;
  const m_dot_max_ion_kg_s = (params.dischargeCurrentAmps * m_ion_kg) / q_e;
  const m_dot_effective_kg_s = Math.min(m_dot_nominal_kg_s, m_dot_max_ion_kg_s);

  // Thrust: T = m_dot_eff * eta_div * eta_mass * v_ion
  const thrust_N = m_dot_effective_kg_s * (eta_div * eta_mass * v_ion_ms);
  const thrust_mN = thrust_N * 1000;

  // Electrical power and thrust efficiency
  const power_W = params.dischargeVoltageVolts * params.dischargeCurrentAmps;
  const jetPower_W = 0.5 * thrust_N * (I_sp * g_0);
  const thrustEfficiency = (jetPower_W / Math.max(1, power_W)) * 100;

  // Bohm sound speed at T_e ~ 25 eV
  const T_e_eV = 25.0;
  const k_B_T_e_J = T_e_eV * q_e;
  const c_s_ms = Math.sqrt(k_B_T_e_J / m_ion_kg);
  const c_s_kms = c_s_ms / 1000;

  const invariantsSatisfied = v_ion_ms > c_s_ms &&
    thrust_mN > 0 &&
    I_sp > 800 &&
    thrustEfficiency > 0 &&
    thrustEfficiency < 90;

  const diagnostic = `Plasma Thruster Audit (${params.propellant}): V_d=${params.dischargeVoltageVolts}V, I_d=${params.dischargeCurrentAmps}A (${(power_W / 1000).toFixed(2)} kW), ` +
    `v_ion=${v_ion_kms.toFixed(2)} km/s, I_sp=${I_sp.toFixed(0)} s, Thrust=${thrust_mN.toFixed(1)} mN, ` +
    `Thrust Eff=${thrustEfficiency.toFixed(1)}%, Bohm c_s=${c_s_kms.toFixed(2)} km/s. Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    propellantAtomicMassAmu: amu,
    ionExhaustVelocityKms: v_ion_kms,
    specificImpulseSeconds: I_sp,
    thrustMilliNewtons: thrust_mN,
    totalElectricPowerWatts: power_W,
    thrustEfficiencyPercent: thrustEfficiency,
    bohmSoundSpeedKms: c_s_kms,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface PlasmaPropulsionScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllPlasmaPropulsionScenarios(): PlasmaPropulsionScenario[] {
  const scenarios: PlasmaPropulsionScenario[] = [];
  const thrusters: Array<{ name: string; prop: "XENON" | "KRYPTON" | "ARGON"; V: number; I: number; mdot: number }> = [
    { name: "NASA NEXT Gridded Ion (Xenon)", prop: "XENON", V: 650, I: 5.5, mdot: 7.2 },
    { name: "Aerojet BPT-4000 Hall Thruster (Xenon)", prop: "XENON", V: 400, I: 11.2, mdot: 14.5 },
    { name: "Starlink Krypton Hall Thruster", prop: "KRYPTON", V: 450, I: 8.5, mdot: 11.0 },
    { name: "ESA SMART-1 PPS-1350 (Xenon)", prop: "XENON", V: 350, I: 4.3, mdot: 5.8 },
    { name: "High-Power Argon MPD Prototype", prop: "ARGON", V: 750, I: 25.0, mdot: 22.0 }
  ];

  for (let i = 1; i <= 25; i++) {
    const t = thrusters[(i - 1) % thrusters.length];
    const vScale = 1.0 + ((i % 5) - 2) * 0.05;
    scenarios.push({
      id: `NOCTIS-PLASMA-THRUST-${String(i).padStart(2, "0")}`,
      domain: "SPACE_PROPULSION_PLASMA",
      title: `Plasma Thruster Bohm Sheath & Specific Impulse #${i} (${t.name})`,
      governingStandard: "AIAA Electric Propulsion Standards / NASA SP-8000 / ESA Handbook",
      execute: () => {
        const res = evaluatePlasmaSpacePropulsion({
          propellant: t.prop,
          dischargeVoltageVolts: t.V * vScale,
          dischargeCurrentAmps: t.I,
          propellantFlowRateMgS: t.mdot
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
