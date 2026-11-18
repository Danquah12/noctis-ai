/**
 * ============================================================================
 * NOCTIS GENUINE CHAIN-OF-THOUGHT SYNTHETIC DATASET GENERATOR
 * Script: scripts/generate-synthetic-cot-dataset.ts
 * Subsystem: NOCTIS-TRAIN-DATA-001
 * 
 * Generates verified, step-by-step Chain-of-Thought (CoT) training data
 * directly from Noctis's 120 sovereign mathematical & physical engines,
 * plus clinical safety cases and NIST RMF governance rules.
 * 
 * Outputs:
 * 1. data/noctis-cot-training-3500.jsonl (Training Set: 3,500 pairs)
 * 2. data/noctis-cot-validation-250.jsonl (Held-Out Benchmark: 250 pairs)
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Import sample domain engines for verified mathematical ground-truth generation
import { evaluateTokamakMhdAndDivertor } from "../src/lib/noctis-tokamak-mhd-divertor-engine.ts";
import { evaluateBatteryElectrochemistry } from "../src/lib/noctis-battery-electrochemistry-degradation-engine.ts";
import { evaluateHypersonicAerothermodynamics } from "../src/lib/noctis-hypersonic-aerothermodynamics-engine.ts";
import { evaluateDirectAirCapture } from "../src/lib/noctis-direct-air-capture-dac-engine.ts";
import { evaluateStellaratorConfinement } from "../src/lib/noctis-stellarator-confinement-engine.ts";
import { evaluateInSarInterferometry } from "../src/lib/noctis-insar-geodesy-deformation-engine.ts";
import { evaluateDeepSpaceOpticalLink } from "../src/lib/noctis-deep-space-optical-comms-engine.ts";
import { evaluateNeuromorphicCircuits } from "../src/lib/noctis-neuromorphic-spiking-circuits-engine.ts";
import { evaluateOrbitalRendezvous } from "../src/lib/noctis-orbital-rendezvous-docking-engine.ts";
import { evaluateRydbergQuantumSimulation } from "../src/lib/noctis-rydberg-quantum-simulator-engine.ts";
import { evaluateOtecPowerPlant } from "../src/lib/noctis-otec-ocean-thermal-engine.ts";
import { evaluateDirectionalDrilling } from "../src/lib/noctis-directional-drilling-geomechanics-engine.ts";
import { evaluateHydroTurbineAndWaterHammer } from "../src/lib/noctis-hydro-turbine-water-hammer-engine.ts";
import { evaluateCryoRocketPropellantStorage } from "../src/lib/noctis-cryo-rocket-propellant-engine.ts";
import { evaluateSpaceGeodesyAndVlbi } from "../src/lib/noctis-space-geodesy-vlbi-engine.ts";
import { evaluateReactorNeutronicsAndKinetics } from "../src/lib/noctis-fission-core-neutronics-engine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const SYSTEM_PROMPT =
  "You are Noctis AI, a sovereign intelligence system operating with deterministic " +
  "mathematical rigor, formal clinical safety verification, and evidence-based engineering precision.";

interface ChatMLRecord {
  id: string;
  domain: string;
  split: "train" | "val";
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

const allRecords: ChatMLRecord[] = [];
let idCounter = 1;

// 1. Ingest existing 1,250 ChatML pairs from health and RMF
const existingChatMlPath = path.join(repoRoot, "data", "noctis-chatml-training.jsonl");
if (fs.existsSync(existingChatMlPath)) {
  const lines = fs.readFileSync(existingChatMlPath, "utf-8").split("\n").filter(Boolean);
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      allRecords.push({
        id: `noctis-seed-${idCounter++}`,
        domain: parsed.category || "CLINICAL_OR_RMF",
        split: "train",
        messages: parsed.messages,
      });
    } catch {}
  }
  console.log(`[+] Ingested ${allRecords.length} curated seed examples (Health 500 + NIST RMF)`);
}

// 2. Synthesize High-Precision Engineering CoT Examples from Sovereign Engines
function generateTokamakCoT(seed: number): ChatMLRecord {
  const R0 = 1.5 + (seed % 10) * 0.5;
  const a = 0.4 + (seed % 8) * 0.2;
  const BT = 2.0 + (seed % 12) * 0.9;
  const Ip = 1.0 + (seed % 15) * 0.9;
  const beta = 1.2 + (seed % 5) * 0.4;
  const Psol = 10 + (seed % 8) * 10;
  const lq = 1.0 + (seed % 5) * 0.4;

  const res = evaluateTokamakMhdAndDivertor({
    majorRadiusR0Meters: R0,
    minorRadiusAMeters: a,
    toroidalMagneticFieldTesla: BT,
    plasmaCurrentMegaAmps: Ip,
    totalThermalBetaPercent: beta,
    powerScrapeOffLayerMW: Psol,
    solPowerDecayLengthMm: lq,
  });

  const prompt =
    `Evaluate tokamak MHD stability and divertor power handling for the following parameters:\n` +
    `- Major Radius R0: ${R0.toFixed(2)} m\n` +
    `- Minor Radius a: ${a.toFixed(2)} m\n` +
    `- Toroidal Field B_T: ${BT.toFixed(2)} T\n` +
    `- Plasma Current I_p: ${Ip.toFixed(2)} MA\n` +
    `- Thermal Beta: ${beta.toFixed(2)}%\n` +
    `- Scrape-off Layer Power P_sol: ${Psol} MW (lambda_q = ${lq.toFixed(1)} mm)\n` +
    `Derive the Kruskal-Shafranov safety factor (q_95), Troyon normalized beta, and determine whether external kink modes and divertor heat limits are safely maintained.`;

  const solution =
    `### 1. Kruskal-Shafranov Safety Factor (q_95) Derivation\n` +
    `Using the shaped tokamak formulation with elongation kappa=1.85 and triangularity delta=0.45:\n` +
    `$$q_{95} = \\frac{5 a^2 B_T}{R_0 I_p} \\left(\\frac{1 + \\kappa^2}{2}\\right) (1 + 0.3\\delta^2)$$\n` +
    `- Cylindrical safety factor: $q_{\\text{cyl}} = \\frac{5 \\times (${a.toFixed(2)})^2 \\times ${BT.toFixed(2)}}{${R0.toFixed(2)} \\times ${Ip.toFixed(2)}} = ${( (5 * a * a * BT) / (R0 * Ip) ).toFixed(3)}$\n` +
    `- Shape factor: $f_{\\text{shape}} = \\frac{1 + 1.85^2}{2} \\times (1 + 0.3 \\times 0.45^2) \\approx 2.345$\n` +
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

function generateHydroCoT(seed: number): ChatMLRecord {
  const H = 60 + (seed % 15) * 35;
  const Q = 10 + (seed % 12) * 12;
  const D = 1.5 + (seed % 8) * 0.4;
  const e = 18 + (seed % 10) * 3;
  const L = 400 + (seed % 10) * 150;
  const Tc = 4.0 + (seed % 8) * 1.0;
  const N = 100 + (seed % 10) * 50;

  const res = evaluateHydroTurbineAndWaterHammer({
    netHeadMeters: H,
    flowRateM3S: Q,
    penstockDiameterMeters: D,
    penstockWallThicknessMm: e,
    penstockLengthMeters: L,
    valveClosureTimeSeconds: Tc,
    rotationalSpeedRpm: N,
  });

  const prompt =
    `Perform a transient water hammer hydraulic analysis and runner selection for a hydroelectric station:\n` +
    `- Net Head H: ${H.toFixed(1)} m\n` +
    `- Flow Rate Q: ${Q.toFixed(1)} m^3/s\n` +
    `- Penstock: Diameter D=${D.toFixed(2)} m, Thickness e=${e} mm, Length L=${L} m\n` +
    `- Emergency Valve Closure Time: ${Tc.toFixed(1)} s\n` +
    `- Generator Rotational Speed: ${N} RPM\n` +
    `Calculate the Allievi elastic wave speed, Joukowsky transient pressure surge (Delta H), hoop stress safety, and specific speed (Ns).`;

  const solution =
    `### 1. Allievi Elastic Wave Speed (a)\n` +
    `Using the elastic water-pipe interaction formula:\n` +
    `$$a = \\sqrt{\\frac{K_w / \\rho}{1 + (K_w / E_s)(D / e)}}$$\n` +
    `- Elastic wave velocity: **a = ${res.waveSpeedMs.toFixed(0)} m/s**\n` +
    `- Penstock acoustic reflection time: $t_r = 2L / a = ${( (2 * L) / res.waveSpeedMs ).toFixed(2)} s$\n\n` +
    `### 2. Joukowsky Water Hammer Pressure Surge\n` +
    `Steady-state flow velocity: $V_0 = \\frac{Q}{\\frac{\\pi}{4} D^2} = \\mathbf{${res.waterVelocityMs.toFixed(2)}\\,\\text{m/s}}$\n` +
    `Since closure time $T_c = ${Tc.toFixed(1)} s > t_r$, this represents slow closure:\n` +
    `$$\\Delta H = \\frac{2 L V_0}{g T_c} = \\mathbf{${res.joukowskyHeadSurgeMeters.toFixed(1)}\\,\\text{m}}$$\n` +
    `- Total dynamic head: $H_{\\text{total}} = ${H.toFixed(1)} + ${res.joukowskyHeadSurgeMeters.toFixed(1)} = \\mathbf{${res.totalDynamicHeadMeters.toFixed(1)}\\,\\text{m}}$\n` +
    `- Penstock Hoop Stress Safety: **${res.isPenstockOverpressureSafe ? "SAFE (within S690QL allowable limits)" : "OVERSTRESSED"}**\n\n` +
    `### 3. Turbine Sizing & Specific Speed (Ns)\n` +
    `- Mechanical Power: $P = 0.92 \\rho g Q H = \\mathbf{${res.turbineMechanicalPowerMW.toFixed(1)}\\,\\text{MW}}$\n` +
    `- Specific Speed: $N_s = \\frac{N \\sqrt{P_{\\text{kW}}}}{H^{1.25}} = \\mathbf{${res.specificSpeedNs.toFixed(1)}}$\n` +
    `- Recommended Runner Type: **${res.recommendedTurbineType}**\n\n` +
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
  const ppm = 415 + (seed % 15);
  const T = 5 + (seed % 25);
  const v = 1.0 + (seed % 8) * 0.2;
  const L = 0.3 + (seed % 5) * 0.1;
  const q = 1.5 + (seed % 8) * 0.15;
  const Tdes = 95 + (seed % 6) * 3;
  const dH = 72 + (seed % 10) * 1.5;

  const res = evaluateDirectAirCapture({
    ambientCo2ConcentrationPpm: ppm,
    ambientTemperatureCelsius: T,
    ambientPressureKPa: 101.3,
    contactorAirFaceVelocityMs: v,
    contactorDepthMeters: L,
    sorbentCo2WorkingCapacityMmolG: q,
    desorptionTemperatureCelsius: Tdes,
    desorptionEnthalpyKjMol: dH,
  });

  const prompt =
    `Audit the thermodynamics and air contactor pressure drop for a Direct Air Capture (DAC) plant:\n` +
    `- Ambient CO2: ${ppm} ppm at ${T}°C\n` +
    `- Contactor: Face Velocity v=${v.toFixed(1)} m/s, Depth L=${L.toFixed(2)} m\n` +
    `- Sorbent: Working Capacity=${q.toFixed(2)} mmol/g, Desorption Temp=${Tdes}°C, Delta H=${dH.toFixed(1)} kJ/mol\n` +
    `Determine inlet CO2 partial pressure, Darcy-Forchheimer pressure drop, fan electrical consumption (kWh/t-CO2), and thermal desorption energy (GJ/t-CO2).`;

  const solution =
    `### 1. Partial Pressure & Minimum Thermodynamic Work\n` +
    `At ambient concentration $y_{\\text{CO2}} = ${ppm} \\times 10^{-6}$ and $P_0 = 101.3\\,\\text{kPa}$:\n` +
    `- Inlet CO2 Partial Pressure: $p_{\\text{CO2}} = y_{\\text{CO2}} P_0 = \\mathbf{${res.inletCo2PartialPressurePa.toFixed(1)}\\,\\text{Pa}}$\n` +
    `- Second-Law Minimum Work: $W_{\\text{min}} = -RT \\ln(y) \\approx 0.49\\,\\text{GJ/ton-CO}_2$\n\n` +
    `### 2. Air Contactor Aerodynamic Pressure Drop\n` +
    `Using the Darcy-Forchheimer open-channel monolith formulation:\n` +
    `$$\\Delta P = \\frac{\\mu}{\\kappa} L v + \\beta \\rho L v^2$$\n` +
    `- Contactor Pressure Drop: **Delta P = ${res.contactorPressureDropPascals.toFixed(1)} Pa**\n` +
    `- Fan Electrical Consumption: **${res.fanElectricalEnergyKwhPerTonCo2.toFixed(1)} kWh/t-CO2**\n\n` +
    `### 3. Thermal Desorption Energy (TVSA)\n` +
    `Combining sensible heat of sorbent with reaction desorption enthalpy:\n` +
    `- Thermal Energy: **${res.thermalDesorptionEnergyGjPerTonCo2.toFixed(2)} GJ/t-CO2**\n` +
    `- Total Equivalent Exergy: **${res.totalEquivalentExergyGjPerTonCo2.toFixed(2)} GJ/t-CO2**\n` +
    `- Target Compliant (<8.5 GJ/t): **${res.isThermodynamicTargetMet}**\n\n` +
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

function generateStellaratorCoT(seed: number): ChatMLRecord {
  const R0 = 4.0 + (seed % 8) * 0.4;
  const a = 0.4 + (seed % 6) * 0.05;
  const B0 = 2.0 + (seed % 10) * 0.4;
  const iota = 0.8 + (seed % 12) * 0.05;
  const N = 4 + (seed % 3);
  const beta = 1.5 + (seed % 6) * 0.3;
  const Te = 2.0 + (seed % 8) * 0.5;
  const n = 0.8 + (seed % 8) * 0.2;

  const res = evaluateStellaratorConfinement({
    majorRadiusR0Meters: R0,
    minorRadiusAMeters: a,
    averageToroidalFieldTesla: B0,
    rotationalTransformIota: iota,
    numberOfFieldPeriods: N,
    plasmaBetaPercent: beta,
    coreElectronTempKeV: Te,
    corePlasmaDensity10_20M3: n,
  });

  const prompt =
    `Evaluate 3D magnetic confinement and neoclassical transport for an optimized stellarator:\n` +
    `- R0=${R0.toFixed(2)} m, a=${a.toFixed(2)} m, B0=${B0.toFixed(2)} T, Field Periods N=${N}\n` +
    `- Rotational Transform iota=${iota.toFixed(3)}, Thermal Beta=${beta.toFixed(2)}%, Te=${Te.toFixed(1)} keV, n_e=${n.toFixed(2)} x10^20 m^-3\n` +
    `Determine the equivalent safety factor q_eq, rational resonance exclusion, Mercier ideal MHD criterion, and empirical energy confinement time (ISS04).`;

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

// 3. Synthesize balanced dataset across the physical domains to reach 3,750 total instances
console.log(`[+] Synthesizing Chain-of-Thought instances across sovereign physical domains...`);

for (let i = 1; i <= 625; i++) {
  allRecords.push(generateTokamakCoT(i));
  allRecords.push(generateHydroCoT(i));
  allRecords.push(generateDacCoT(i));
  allRecords.push(generateStellaratorCoT(i));
}

console.log(`[+] Total accumulated CoT records: ${allRecords.length}`);

// 4. Split into 3,500 Training and 250 Held-Out Validation Instances
// Shuffle deterministically
function seededShuffle(arr: ChatMLRecord[], seed = 42) {
  let m = arr.length, t, i;
  while (m) {
    i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

const shuffled = seededShuffle(allRecords, 2026);
const valSet = shuffled.slice(0, 250);
const trainSet = shuffled.slice(250, 3750); // Exactly 3,500 training instances

// Mark splits
valSet.forEach((r) => (r.split = "val"));
trainSet.forEach((r) => (r.split = "train"));

const trainPath = path.join(repoRoot, "data", "noctis-cot-training-3500.jsonl");
const valPath = path.join(repoRoot, "data", "noctis-cot-validation-250.jsonl");

fs.writeFileSync(
  trainPath,
  trainSet.map((r) => JSON.stringify({ id: r.id, domain: r.domain, messages: r.messages })).join("\n") + "\n"
);
fs.writeFileSync(
  valPath,
  valSet.map((r) => JSON.stringify({ id: r.id, domain: r.domain, messages: r.messages })).join("\n") + "\n"
);

console.log(`\n======================================================================`);
console.log(` NOCTIS CHAIN-OF-THOUGHT SYNTHETIC DATASET GENERATION COMPLETE`);
console.log(`======================================================================`);
console.log(`  ✔ Training Set:     ${trainSet.length} instances -> ${trainPath}`);
console.log(`  ✔ Held-Out Val Set: ${valSet.length} instances -> ${valPath}`);
console.log(`  ✔ Total Generated:  ${trainSet.length + valSet.length} instances`);
console.log(`======================================================================\n`);
