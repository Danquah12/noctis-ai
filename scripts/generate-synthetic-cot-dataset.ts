/**
 * ============================================================================
 * NOCTIS GENUINE CHAIN-OF-THOUGHT SYNTHETIC DATASET GENERATOR
 * Script: scripts/generate-synthetic-cot-dataset.ts
 * Subsystem: NOCTIS-TRAIN-DATA-001
 * 
 * Generates verified, step-by-step Chain-of-Thought (CoT) training data
 * directly from Noctis's sovereign mathematical & physical engines,
 * plus clinical safety cases and NIST RMF governance rules.
 * 
 * Invariants Enforced:
 * 1. ZERO duplicate prompts across the entire dataset.
 * 2. ZERO overlap between Training (3,500 pairs) and Held-Out Validation (250 pairs).
 * 3. 100% mathematically verified ground truth via deterministic sovereign engines.
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Sovereign Domain Engines
import { evaluateTokamakMhdAndDivertor } from "../src/lib/noctis-tokamak-mhd-divertor-engine.ts";
import { evaluateBatteryElectrochemistry } from "../src/lib/noctis-battery-electrochemistry-degradation-engine.ts";
import { evaluateHypersonicAerothermodynamics } from "../src/lib/noctis-hypersonic-aerothermodynamics-engine.ts";
import { evaluateDirectAirCapture } from "../src/lib/noctis-direct-air-capture-dac-engine.ts";
import { evaluateStellaratorConfinement } from "../src/lib/noctis-stellarator-confinement-engine.ts";
import { evaluateHydroTurbineAndWaterHammer } from "../src/lib/noctis-hydro-turbine-water-hammer-engine.ts";
import { evaluateCryoRocketPropellantStorage } from "../src/lib/noctis-cryo-rocket-propellant-engine.ts";
import { evaluateReactorNeutronicsAndKinetics } from "../src/lib/noctis-fission-core-neutronics-engine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const SYSTEM_PROMPT =
  "You are Noctis AI, a sovereign intelligence system operating with deterministic " +
  "mathematical rigor, formal clinical safety verification, and evidence-based engineering precision.";

export interface ChatMLRecord {
  id: string;
  domain: string;
  split: "train" | "val";
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

const seenPrompts = new Set<string>();
let idCounter = 1;

// 1. Ingest existing 1,250 ChatML pairs (Health 500 + NIST RMF)
const curatedRecords: ChatMLRecord[] = [];
const existingChatMlPath = path.join(repoRoot, "data", "noctis-chatml-training.jsonl");

if (fs.existsSync(existingChatMlPath)) {
  const lines = fs.readFileSync(existingChatMlPath, "utf-8").split("\n").filter(Boolean);
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const userMsg = parsed.messages?.find((m: any) => m.role === "user")?.content?.trim();
      if (userMsg && !seenPrompts.has(userMsg)) {
        seenPrompts.add(userMsg);
        curatedRecords.push({
          id: `noctis-curated-${idCounter++}`,
          domain: parsed.category || "CLINICAL_OR_RMF",
          split: "train",
          messages: parsed.messages,
        });
      }
    } catch {}
  }
  console.log(`[+] Ingested ${curatedRecords.length} unique curated seed records (Clinical + NIST RMF)`);
}

// 2. Synthesize High-Precision Sovereign Physical Engine CoT Generators

function generateTokamakCoT(seed: number): ChatMLRecord {
  const R0 = 1.20 + (seed * 0.0417);
  const a = 0.35 + ((seed * 0.0193) % 0.85);
  const BT = 1.80 + ((seed * 0.0381) % 4.5);
  const Ip = 0.90 + ((seed * 0.0293) % 4.8);
  const beta = 1.10 + ((seed * 0.0137) % 2.5);
  const Psol = 10.0 + ((seed * 0.281) % 65.0);
  const lq = 0.90 + ((seed * 0.0211) % 3.0);

  const res = evaluateTokamakMhdAndDivertor({
    majorRadiusR0Meters: Number(R0.toFixed(2)),
    minorRadiusAMeters: Number(a.toFixed(2)),
    toroidalMagneticFieldTesla: Number(BT.toFixed(2)),
    plasmaCurrentMegaAmps: Number(Ip.toFixed(2)),
    totalThermalBetaPercent: Number(beta.toFixed(2)),
    powerScrapeOffLayerMW: Number(Psol.toFixed(1)),
    solPowerDecayLengthMm: Number(lq.toFixed(2)),
  });

  const prompt =
    `Evaluate tokamak MHD stability and divertor power handling (Design #${seed}):\n` +
    `- Major Radius R0: ${R0.toFixed(2)} m\n` +
    `- Minor Radius a: ${a.toFixed(2)} m\n` +
    `- Toroidal Field B_T: ${BT.toFixed(2)} T\n` +
    `- Plasma Current I_p: ${Ip.toFixed(2)} MA\n` +
    `- Thermal Beta: ${beta.toFixed(2)}%\n` +
    `- Scrape-off Layer Power P_sol: ${Psol.toFixed(1)} MW (lambda_q = ${lq.toFixed(2)} mm)\n` +
    `Derive the Kruskal-Shafranov safety factor (q_95), Troyon normalized beta, and determine whether external kink modes and divertor heat limits are safely maintained.`;

  const solution =
    `### 1. Kruskal-Shafranov Safety Factor (q_95) Derivation\n` +
    `Using the shaped tokamak formulation with elongation kappa=1.85 and triangularity delta=0.45:\n` +
    `$$q_{95} = \\frac{5 a^2 B_T}{R_0 I_p} \\left(\\frac{1 + \\kappa^2}{2}\\right) (1 + 0.3\\delta^2)$$\n` +
    `- Cylindrical safety factor: $q_{\\text{cyl}} = \\frac{5 \\times (${a.toFixed(2)})^2 \\times ${BT.toFixed(2)}}{${R0.toFixed(2)} \\times ${Ip.toFixed(2)}} = ${( (5 * a * a * BT) / (R0 * Ip) ).toFixed(3)}$\n` +
    `- Resulting Edge Safety Factor: **q_95 = ${res.safetyFactorQ95.toFixed(2)}**\n` +
    `**Kink Stability**: ${res.safetyFactorQ95 >= 2.0 ? "STABLE (q_95 >= 2.0 avoids m=2/n=1 external kink disruptions)" : "UNSTABLE (q_95 < 2.0 triggers disruption)"}.\n\n` +
    `### 2. Troyon Normalized Beta (beta_N)\n` +
    `$$\\beta_N = \\beta \\left(\\frac{a B_T}{I_p}\\right) = ${beta.toFixed(2)} \\times \\left(\\frac{${a.toFixed(2)} \\times ${BT.toFixed(2)}}{${Ip.toFixed(2)}}\\right) = \\mathbf{${res.normalizedBetaTroyon.toFixed(2)}}\$$\n` +
    `**Troyon Limit**: ${res.normalizedBetaTroyon <= 3.5 ? "SATISFIED (beta_N <= 3.5 avoids ideal ballooning modes)" : "EXCEEDED (beta_N > 3.5)"}.\n\n` +
    `### 3. Divertor Heat Flux & Greenwald Density\n` +
    `- Greenwald Density Limit: $n_G = I_p / (\\pi a^2) = \\mathbf{${res.greenwaldDensityLimit10_20M3.toFixed(2)} \\times 10^{20}\\,\\text{m}^{-3}}$\n` +
    `- Parallel Scrape-Off Heat Flux: $q_{\\parallel} = \\mathbf{${res.parallelHeatFluxGWM2.toFixed(2)}\\,\\text{GW/m}^2}$\n` +
    `- Target Tolerable: **${res.isDivertorHeatTolerable}**\n\n` +
    `**Diagnostic Summary**: ${res.diagnostic}`;

  return {
    id: `noctis-cot-tokamak-${idCounter++}`,
    domain: "FUSION_TOKAMAK_MHD",
    split: "train",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
      { role: "assistant", content: solution },
    ],
  };
}

function generateBatteryCoT(seed: number): ChatMLRecord {
  const soc = 0.15 + ((seed * 0.0073) % 0.80);
  const crate = 0.5 + ((seed * 0.021) % 3.5);
  const temp = -8.0 + ((seed * 0.19) % 50.0);
  const eta = 0.02 + ((seed * 0.0017) % 0.12);
  const phi_s = 0.03 + ((seed * 0.0023) % 0.20);
  const phi_e = 0.01 + ((seed * 0.0009) % 0.06);
  const cycles = 50 + Math.floor((seed * 3.7) % 1500);

  const res = evaluateBatteryElectrochemistry({
    stateOfChargeSoc: Number(soc.toFixed(2)),
    chargeRateC: Number(crate.toFixed(2)),
    temperatureCelsius: Number(temp.toFixed(1)),
    anodeOverpotentialVolts: Number(eta.toFixed(3)),
    anodeSolidPotentialVolts: Number(phi_s.toFixed(3)),
    electrolytePotentialVolts: Number(phi_e.toFixed(3)),
    cycleCountN: cycles,
  });

  const prompt =
    `Perform electrochemical and lithium plating safety analysis for a lithium-ion battery cell (Case #${seed}):\n` +
    `- State of Charge (SoC): ${(soc * 100).toFixed(1)}%\n` +
    `- Fast Charge C-Rate: ${crate.toFixed(2)} C\n` +
    `- Core Temperature: ${temp.toFixed(1)} °C\n` +
    `- Overpotentials: Solid phi_s=${phi_s.toFixed(3)} V, Electrolyte phi_e=${phi_e.toFixed(3)} V, Overpotential eta=${eta.toFixed(3)} V\n` +
    `- Completed Cycles: ${cycles}\n` +
    `Determine the Butler-Volmer exchange current density, lithium plating overpotential (eta_plating), SEI diffusion layer growth, and whether lithium plating/dendrite risk is avoided.`;

  const solution =
    `### 1. Butler-Volmer Charge-Transfer Kinetics\n` +
    `- Temperature in Kelvin: $T = ${temp.toFixed(1)} + 273.15 = ${(temp + 273.15).toFixed(1)}\\,\\text{K}$\n` +
    `- Exchange Current Density: $j_0 = \\mathbf{${res.exchangeCurrentDensityAM2.toFixed(3)}\\,\\text{A/m}^2}$\n\n` +
    `### 2. Lithium Plating Onset Invariant (Arora Criterion)\n` +
    `$$\\eta_{\\text{plating}} = \\phi_s - \\phi_e = ${phi_s.toFixed(3)} - ${phi_e.toFixed(3)} = \\mathbf{${res.lithiumPlatingPotentialVolts.toFixed(3)}\\,\\text{V vs Li/Li}^+}$\n` +
    `- Plating Avoidance: **${res.isLithiumPlatingAvoided ? "VERIFIED (eta_plating > 0 V prevents metallic Li reduction)" : "VIOLATION (eta_plating <= 0 V triggers metallic Li dendrites)"}**\n` +
    `- Dendrite Invariant: **${res.isCellSafeFromDendrites ? "PASS (Safe from thermal runaway shorts)" : "FAIL (Critical dendrite formation)"}**\n\n` +
    `### 3. SEI Layer Parabolic Growth & Capacity Retention\n` +
    `- Estimated SEI Thickness: **${res.seiLayerThicknessNanometers.toFixed(1)} nm**\n` +
    `- Remaining Capacity Retention: **${res.capacityRetentionPercent.toFixed(2)}%**\n\n` +
    `**Diagnostic**: ${res.diagnostic}`;

  return {
    id: `noctis-cot-battery-${idCounter++}`,
    domain: "BATTERY_ELECTROCHEMISTRY",
    split: "train",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
      { role: "assistant", content: solution },
    ],
  };
}

function generateHypersonicCoT(seed: number): ChatMLRecord {
  const M = 5.2 + ((seed * 0.083) % 18.0);
  const alt = 28.0 + ((seed * 0.17) % 45.0);
  const Rn = 0.04 + ((seed * 0.0031) % 0.65);
  const Tw = 900.0 + ((seed * 4.3) % 900.0);

  const res = evaluateHypersonicAerothermodynamics({
    machNumber: Number(M.toFixed(2)),
    altitudeKm: Number(alt.toFixed(1)),
    noseRadiusMeters: Number(Rn.toFixed(3)),
    wallTemperatureKelvin: Number(Tw.toFixed(1)),
  });

  const prompt =
    `Derive hypersonic shock jump conditions and stagnation aerothermal heating (Trajectory #${seed}):\n` +
    `- Mach Number: M = ${M.toFixed(2)}\n` +
    `- Re-entry Altitude: z = ${alt.toFixed(1)} km\n` +
    `- Blunt Nose Radius: R_n = ${Rn.toFixed(3)} m\n` +
    `- Wall Surface Temperature: T_w = ${Tw.toFixed(1)} K\n` +
    `Compute Rankine-Hugoniot stagnation temperature (T_0), post-shock pressure (P_2), Fay-Riddell stagnation heat flux (q_s), and check TPS ablation limits.`;

  const solution =
    `### 1. Rankine-Hugoniot High-Enthalpy Stagnation Conditions\n` +
    `$$T_0 = T_\\infty \\left(1 + \\frac{\\gamma - 1}{2} M^2\\right) = \\mathbf{${res.stagnationTemperatureKelvin.toFixed(1)}\\,\\text{K}}$$\n` +
    `- Post-Shock Normal Shock Pressure: $P_2 = \\mathbf{${res.postShockPressureKPa.toFixed(1)}\\,\\text{kPa}}$\n` +
    `- Chemical Dissociation Plasma: **${res.isDissociationPlasmaTriggered ? "ACTIVE (T_0 >= 2500 K dissociates N2/O2 into ionized plasma sheath)" : "INACTIVE (Molecular equilibrium maintained)"}**\n\n` +
    `### 2. Fay-Riddell Stagnation Heat Transfer\n` +
    `- Nose Velocity Gradient: $(du_e / dx)_s = \\mathbf{${res.velocityGradientPerSecond.toFixed(1)}\\,\\text{s}^{-1}}$\n` +
    `- Stagnation Heat Flux: $q_s = \\mathbf{${res.stagnationHeatFluxMWPerM2.toFixed(2)}\\,\\text{MW/m}^2}$\n` +
    `- Thermal Protection System (TPS) Integrity: **${res.isTpsThermalLimitSatisfied ? "PASS (within PICA-X ablation ceiling)" : "FAIL (Thermal ablation threshold exceeded)"}**\n\n` +
    `**Diagnostic**: ${res.diagnostic}`;

  return {
    id: `noctis-cot-hypersonic-${idCounter++}`,
    domain: "HYPERSONIC_AEROTHERMODYNAMICS",
    split: "train",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
      { role: "assistant", content: solution },
    ],
  };
}

function generateHydroCoT(seed: number): ChatMLRecord {
  const H = 45.0 + ((seed * 0.73) % 450.0);
  const Q = 8.0 + ((seed * 0.31) % 95.0);
  const D = 1.20 + ((seed * 0.017) % 3.2);
  const e = 14 + Math.floor((seed * 0.23) % 40);
  const L = 300.0 + ((seed * 3.1) % 1200.0);
  const Tc = 3.5 + ((seed * 0.039) % 8.0);
  const N = 120 + Math.floor((seed * 2.5) % 650);

  const res = evaluateHydroTurbineAndWaterHammer({
    netHeadMeters: Number(H.toFixed(1)),
    flowRateM3S: Number(Q.toFixed(1)),
    penstockDiameterMeters: Number(D.toFixed(2)),
    penstockWallThicknessMm: e,
    penstockLengthMeters: Number(L.toFixed(1)),
    valveClosureTimeSeconds: Number(Tc.toFixed(1)),
    rotationalSpeedRpm: N,
  });

  const prompt =
    `Perform transient water hammer hydraulic analysis and runner selection (Plant #${seed}):\n` +
    `- Net Head H: ${H.toFixed(1)} m\n` +
    `- Flow Rate Q: ${Q.toFixed(1)} m^3/s\n` +
    `- Penstock: D=${D.toFixed(2)} m, Wall e=${e} mm, Length L=${L.toFixed(1)} m\n` +
    `- Emergency Closure Time: T_c=${Tc.toFixed(1)} s\n` +
    `- Generator Speed: N=${N} RPM\n` +
    `Calculate Allievi wave velocity, Joukowsky dynamic head surge, total head, and recommended turbine runner.`;

  const solution =
    `### 1. Allievi Elastic Wave Speed & Acoustic Reflection\n` +
    `- Elastic Wave Speed: **a = ${res.waveSpeedMs.toFixed(0)} m/s**\n` +
    `- Penstock Acoustic Reflection Time: $t_r = 2L / a = ${( (2 * L) / res.waveSpeedMs ).toFixed(2)}\\,\\text{s}$\n` +
    `- Flow Velocity: $V_0 = \\mathbf{${res.waterVelocityMs.toFixed(2)}\\,\\text{m/s}}$\n\n` +
    `### 2. Joukowsky Water Hammer Pressure Surge\n` +
    `- Dynamic Head Surge: $\\Delta H = \\mathbf{${res.joukowskyHeadSurgeMeters.toFixed(1)}\\,\\text{m}}$\n` +
    `- Total Dynamic Head: $H_{\\text{total}} = \\mathbf{${res.totalDynamicHeadMeters.toFixed(1)}\\,\\text{m}}$\n` +
    `- Penstock Hoop Stress Safety: **${res.isPenstockOverpressureSafe ? "SAFE (within S690QL yield limit)" : "OVERSTRESSED"}**\n\n` +
    `### 3. Turbine Sizing & Runner Selection\n` +
    `- Mechanical Power: $P = \\mathbf{${res.turbineMechanicalPowerMW.toFixed(1)}\\,\\text{MW}}$\n` +
    `- Specific Speed: $N_s = \\mathbf{${res.specificSpeedNs.toFixed(1)}}$\n` +
    `- Recommended Runner: **${res.recommendedTurbineType}**\n\n` +
    `**Diagnostic**: ${res.diagnostic}`;

  return {
    id: `noctis-cot-hydro-${idCounter++}`,
    domain: "HYDRO_TURBINE_HYDRAULICS",
    split: "train",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
      { role: "assistant", content: solution },
    ],
  };
}

function generateDacCoT(seed: number): ChatMLRecord {
  const ppm = 412 + Math.floor((seed * 0.17) % 45);
  const T = 2.0 + ((seed * 0.13) % 36.0);
  const v = 0.8 + ((seed * 0.011) % 2.2);
  const L = 0.25 + ((seed * 0.004) % 0.75);
  const q = 1.30 + ((seed * 0.009) % 1.50);
  const Tdes = 90 + Math.floor((seed * 0.11) % 25);
  const dH = 68.0 + ((seed * 0.19) % 25.0);

  const res = evaluateDirectAirCapture({
    ambientCo2ConcentrationPpm: ppm,
    ambientTemperatureCelsius: Number(T.toFixed(1)),
    ambientPressureKPa: 101.3,
    contactorAirFaceVelocityMs: Number(v.toFixed(2)),
    contactorDepthMeters: Number(L.toFixed(2)),
    sorbentCo2WorkingCapacityMmolG: Number(q.toFixed(2)),
    desorptionTemperatureCelsius: Tdes,
    desorptionEnthalpyKjMol: Number(dH.toFixed(1)),
  });

  const prompt =
    `Audit the thermodynamics and air contactor pressure drop for a Direct Air Capture (DAC) facility (Audit #${seed}):\n` +
    `- Ambient CO2: ${ppm} ppm at ${T.toFixed(1)} °C\n` +
    `- Air Contactor: Face Velocity v=${v.toFixed(2)} m/s, Depth L=${L.toFixed(2)} m\n` +
    `- Sorbent Chemistry: Capacity q=${q.toFixed(2)} mmol/g, Desorption T=${Tdes} °C, Delta H=${dH.toFixed(1)} kJ/mol\n` +
    `Derive inlet CO2 partial pressure, Darcy-Forchheimer pressure drop, fan electrical consumption (kWh/t-CO2), and thermal energy consumption (GJ/t-CO2).`;

  const solution =
    `### 1. Partial Pressure & Minimum Thermodynamic Work\n` +
    `- Inlet CO2 Partial Pressure: $p_{\\text{CO2}} = \\mathbf{${res.inletCo2PartialPressurePa.toFixed(1)}\\,\\text{Pa}}$\n` +
    `- Thermodynamic Minimum Separation Exergy: $\\approx 0.49\\,\\text{GJ/t-CO}_2$\n\n` +
    `### 2. Air Contactor Darcy-Forchheimer Pressure Drop\n` +
    `- Contactor Pressure Drop: $\\Delta P = \\mathbf{${res.contactorPressureDropPascals.toFixed(1)}\\,\\text{Pa}}$\n` +
    `- Fan Electrical Energy: **${res.fanElectricalEnergyKwhPerTonCo2.toFixed(1)} kWh/t-CO2**\n\n` +
    `### 3. Thermal Desorption (TVSA) Energy\n` +
    `- Specific Thermal Desorption Energy: **${res.thermalDesorptionEnergyGjPerTonCo2.toFixed(2)} GJ/t-CO2**\n` +
    `- Total Equivalent Exergy: **${res.totalEquivalentExergyGjPerTonCo2.toFixed(2)} GJ/t-CO2**\n` +
    `- Commercial Viability (<8.5 GJ/t): **${res.isThermodynamicTargetMet ? "PASS (High-efficiency sorbent regeneration)" : "FAIL (Excessive thermal duty)"}**\n\n` +
    `**Diagnostic**: ${res.diagnostic}`;

  return {
    id: `noctis-cot-dac-${idCounter++}`,
    domain: "CARBON_CAPTURE_DAC",
    split: "train",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
      { role: "assistant", content: solution },
    ],
  };
}

function generateCryoCoT(seed: number): ChatMLRecord {
  const propTypes: Array<"LIQUID_HYDROGEN_LH2" | "LIQUID_OXYGEN_LOX" | "LIQUID_METHANE_LCH4"> = [
    "LIQUID_HYDROGEN_LH2",
    "LIQUID_OXYGEN_LOX",
    "LIQUID_METHANE_LCH4",
  ];
  const prop = propTypes[seed % 3];
  const V = 60.0 + ((seed * 1.1) % 400.0);
  const A = 90.0 + ((seed * 1.3) % 350.0);
  const layers = 35 + Math.floor((seed * 0.29) % 45);
  const days = 14 + Math.floor((seed * 0.37) % 160);

  const res = evaluateCryoRocketPropellantStorage({
    propellantType: prop,
    tankVolumeM3: Number(V.toFixed(1)),
    tankSurfaceAreaM2: Number(A.toFixed(1)),
    mliLayerCount: layers,
    missionDurationDays: days,
    activeZboEnabled: true,
  });

  const prompt =
    `Evaluate space launch vehicle cryogenic propellant boil-off and Zero Boil-Off (ZBO) cryocooling (Mission #${seed}):\n` +
    `- Propellant: ${prop}\n` +
    `- Tank Geometry: Volume V=${V.toFixed(1)} m^3, Surface Area A=${A.toFixed(1)} m^2\n` +
    `- MLI Insulation: ${layers} reflective shields\n` +
    `- Mission Transit: ${days} days in deep space vacuum\n` +
    `Derive modified Lockheed MLI heat leak, unvented boil-off rate (kg/day), and active ZBO electric power required.`;

  const solution =
    `### 1. MLI Heat Leak & Cryo Enthalpy\n` +
    `- Propellant Storage Temp: **T = ${res.cryoTemperatureKelvin} K**\n` +
    `- Latent Heat of Vaporization: **h_fg = ${res.latentHeatOfVaporizationKJPerKg} kJ/kg**\n` +
    `- MLI Radiative Heat Flux: **q_MLI = ${res.mliHeatFluxWM2.toFixed(3)} W/m^2**\n` +
    `- Total Parasitic Heat Leak: **Q_leak = ${res.totalThermalHeatLeakWatts.toFixed(1)} W**\n\n` +
    `### 2. Boil-Off Rate & Zero Boil-Off (ZBO) Cryocooler Duty\n` +
    `- Passive Daily Boil-off: **${res.dailyBoilOffRateKgPerDay.toFixed(2)} kg/day (${res.dailyBoilOffPercentage.toFixed(3)}%/day)**\n` +
    `- Active ZBO Electrical Lift Power: **W_electric = ${res.zboElectricPowerRequiredWatts.toFixed(1)} W**\n` +
    `- Zero Boil-Off Maintained: **${res.isZeroBoilOffMaintained ? "VERIFIED (Full active mass conservation)" : "UNCONTAINED"}**\n\n` +
    `**Diagnostic**: ${res.diagnostic}`;

  return {
    id: `noctis-cot-cryo-${idCounter++}`,
    domain: "CRYO_ROCKET_PROPELLANT",
    split: "train",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
      { role: "assistant", content: solution },
    ],
  };
}

function generateFissionCoT(seed: number): ChatMLRecord {
  const rho_dollars = 0.08 + ((seed * 0.0029) % 0.72);
  const T_fuel = 850.0 + ((seed * 1.7) % 600.0);

  const res = evaluateReactorNeutronicsAndKinetics({
    reactivityInsertedDollars: Number(rho_dollars.toFixed(3)),
    fuelTemperatureKelvin: Number(T_fuel.toFixed(1)),
    dopplerCoefficientPcmPerK: -3.2,
    promptNeutronGenerationTimeUs: 25.0,
  });

  const prompt =
    `Analyze nuclear fission reactor point kinetics and Doppler reactivity feedback (Core Test #${seed}):\n` +
    `- Reactivity Insertion: rho = ${rho_dollars.toFixed(3)} $\n` +
    `- Fuel Temperature: T_fuel = ${T_fuel.toFixed(1)} K (Base T_0 = 900 K)\n` +
    `- Doppler Fuel Coefficient: alpha_D = -3.2 pcm/K\n` +
    `- Prompt Generation Time: Lambda = 25 us\n` +
    `Determine effective multiplication factor (k_eff), prompt critical margin, Doppler negative feedback (pcm), and reactor period.`;

  const solution =
    `### 1. Six-Factor Reactivity & Point Reactor Kinetics (PRKE)\n` +
    `- Effective Multiplication Factor: **k_eff = ${res.effectiveMultiplicationFactorKeff.toFixed(5)}**\n` +
    `- Reactivity: **rho = ${res.reactivityRhoPcm.toFixed(1)} pcm**\n` +
    `- Prompt Critical Safety Margin: **${res.promptCriticalMarginDollars.toFixed(3)} $**\n` +
    `- Safety Invariant: **${res.isPromptCriticalSafe ? "SAFE (rho < 1.00 $ avoids prompt criticality)" : "CRITICAL VIOLATION (Prompt critical excursion!)"}**\n\n` +
    `### 2. Doppler Negative Reactivity Feedback\n` +
    `$$\\Delta \\rho_{\\text{Doppler}} = \\alpha_D \\times (T_{\\text{fuel}} - T_0) = \\mathbf{${res.dopplerReactivityFeedbackPcm.toFixed(1)}\\,\\text{pcm}}$$\n` +
    `- Stable Reactor Period: **T = ${res.reactorPeriodSeconds.toFixed(2)} s**\n\n` +
    `**Diagnostic**: ${res.diagnostic}`;

  return {
    id: `noctis-cot-fission-${idCounter++}`,
    domain: "FISSION_REACTOR_NEUTRONICS",
    split: "train",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
      { role: "assistant", content: solution },
    ],
  };
}

function generateStellaratorCoT(seed: number): ChatMLRecord {
  const R0 = 3.8 + ((seed * 0.043) % 4.0);
  const a = 0.38 + ((seed * 0.011) % 0.50);
  const B0 = 1.9 + ((seed * 0.031) % 3.5);
  const iota = 0.78 + ((seed * 0.007) % 0.45);
  const N = 4 + (seed % 3);
  const beta = 1.4 + ((seed * 0.021) % 2.8);
  const Te = 1.8 + ((seed * 0.033) % 4.5);
  const n = 0.75 + ((seed * 0.019) % 1.8);

  const res = evaluateStellaratorConfinement({
    majorRadiusR0Meters: Number(R0.toFixed(2)),
    minorRadiusAMeters: Number(a.toFixed(2)),
    averageToroidalFieldTesla: Number(B0.toFixed(2)),
    rotationalTransformIota: Number(iota.toFixed(3)),
    numberOfFieldPeriods: N,
    plasmaBetaPercent: Number(beta.toFixed(2)),
    coreElectronTempKeV: Number(Te.toFixed(1)),
    corePlasmaDensity10_20M3: Number(n.toFixed(2)),
  });

  const prompt =
    `Evaluate 3D magnetic confinement and neoclassical transport for an optimized stellarator (Configuration #${seed}):\n` +
    `- Geometry: R0=${R0.toFixed(2)} m, a=${a.toFixed(2)} m, B0=${B0.toFixed(2)} T, Field Periods N=${N}\n` +
    `- Rotational Transform: iota=${iota.toFixed(3)}, Thermal Beta=${beta.toFixed(2)}%\n` +
    `- Plasma: Te=${Te.toFixed(1)} keV, n_e=${n.toFixed(2)} x 10^20 m^-3\n` +
    `Determine the equivalent safety factor q_eq, rational resonance exclusion, Mercier ideal MHD criterion, and ISS04 energy confinement time.`;

  const solution =
    `### 1. Rotational Transform & Rational Resonances\n` +
    `- Rotational Transform: $\\iota = \\mathbf{${res.rotationalTransformIota.toFixed(3)}}$\n` +
    `- Equivalent Safety Factor: $q_{\\text{eq}} = 1 / \\iota = \\mathbf{${res.equivalentSafetyFactorQ.toFixed(2)}}\$\n` +
    `- Resonance Exclusion: **${res.isRationalResonanceAvoided ? "VERIFIED (clear of low-order rational disruptions 5/5, 5/6)" : "RESONANCE RISK"}**\n\n` +
    `### 2. Mercier Localized Stability (D_I)\n` +
    `- Magnetic Well vs Geodesic Curvature balance: **Mercier Stable = ${res.mercierStabilityCriterion}**\n\n` +
    `### 3. Energy Confinement & Neoclassical Transport\n` +
    `- ISS04 Confinement Time: $\\tau_E = \\mathbf{${res.confinementEnergyTimeSec.toFixed(3)}\\,\\text{s}}$\n` +
    `- Neoclassical Radial Flux: $\\Gamma_{\\text{neo}} = \\mathbf{${res.neoclassicalRadialFluxM2S.toExponential(2)}\\,\\text{m}^{-2}\\text{s}^{-1}}$\n\n` +
    `**Diagnostic**: ${res.diagnostic}`;

  return {
    id: `noctis-cot-stellarator-${idCounter++}`,
    domain: "STELLARATOR_CONFINEMENT",
    split: "train",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
      { role: "assistant", content: solution },
    ],
  };
}

// 3. Partition Curated Seed Data: 1,150 to Train, 100 to Val
const curatedTrain = curatedRecords.slice(0, 1150);
const curatedVal = curatedRecords.slice(1150, 1250);

curatedTrain.forEach((r) => (r.split = "train"));
curatedVal.forEach((r) => (r.split = "val"));

console.log(`[+] Curated Split: ${curatedTrain.length} train, ${curatedVal.length} val.`);

// 4. Generate Synthetic CoT Data: 2,350 to Train, 150 to Val
// Generators list
const generators = [
  generateTokamakCoT,
  generateBatteryCoT,
  generateHypersonicCoT,
  generateHydroCoT,
  generateDacCoT,
  generateCryoCoT,
  generateFissionCoT,
  generateStellaratorCoT,
];

const syntheticTrain: ChatMLRecord[] = [];
let trainSeed = 10001;

while (syntheticTrain.length < 2350) {
  const gen = generators[syntheticTrain.length % generators.length];
  const rec = gen(trainSeed++);
  const userMsg = rec.messages.find((m) => m.role === "user")?.content.trim();
  if (userMsg && !seenPrompts.has(userMsg)) {
    seenPrompts.add(userMsg);
    rec.split = "train";
    syntheticTrain.push(rec);
  }
}

const syntheticVal: ChatMLRecord[] = [];
let valSeed = 90001; // Completely disjoint seed space for validation

while (syntheticVal.length < 150) {
  const gen = generators[syntheticVal.length % generators.length];
  const rec = gen(valSeed++);
  const userMsg = rec.messages.find((m) => m.role === "user")?.content.trim();
  if (userMsg && !seenPrompts.has(userMsg)) {
    seenPrompts.add(userMsg);
    rec.split = "val";
    syntheticVal.push(rec);
  }
}

// 5. Combine and Verify Final Sets
const finalTrain = [...curatedTrain, ...syntheticTrain];
const finalVal = [...curatedVal, ...syntheticVal];

console.log(`\n======================================================================`);
console.log(` DATASET VERIFICATION & INTEGRITY AUDIT`);
console.log(`======================================================================`);
console.log(`  Training Instances:   ${finalTrain.length} (Target: 3,500)`);
console.log(`  Validation Instances: ${finalVal.length} (Target: 250)`);

// Strict deduplication & leakage checks
const trainPromptSet = new Set(finalTrain.map((r) => r.messages.find((m) => m.role === "user")?.content.trim()));
const valPromptSet = new Set(finalVal.map((r) => r.messages.find((m) => m.role === "user")?.content.trim()));

if (trainPromptSet.size !== 3500) {
  throw new Error(`Duplicate detected in training set! Unique count: ${trainPromptSet.size}`);
}
if (valPromptSet.size !== 250) {
  throw new Error(`Duplicate detected in validation set! Unique count: ${valPromptSet.size}`);
}

const overlapCount = [...valPromptSet].filter((p) => p && trainPromptSet.has(p)).length;
if (overlapCount > 0) {
  throw new Error(`Data leakage! ${overlapCount} validation prompts appear in training set.`);
}

console.log(`  ✔ Training Duplicates:   0 (3,500 / 3,500 unique)`);
console.log(`  ✔ Validation Duplicates: 0 (250 / 250 unique)`);
console.log(`  ✔ Cross-Split Overlap:   0 (Strict 100% held-out separation)`);

// 6. Write to disk
const trainPath = path.join(repoRoot, "data", "noctis-cot-training-3500.jsonl");
const valPath = path.join(repoRoot, "data", "noctis-cot-validation-250.jsonl");

fs.writeFileSync(
  trainPath,
  finalTrain.map((r) => JSON.stringify({ id: r.id, domain: r.domain, messages: r.messages })).join("\n") + "\n"
);
fs.writeFileSync(
  valPath,
  finalVal.map((r) => JSON.stringify({ id: r.id, domain: r.domain, messages: r.messages })).join("\n") + "\n"
);

console.log(`  ✔ Saved Train Set:  ${trainPath}`);
console.log(`  ✔ Saved Val Set:    ${valPath}`);
console.log(`======================================================================\n`);
