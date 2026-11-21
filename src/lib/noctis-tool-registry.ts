/**
 * ============================================================================
 * NOCTIS UNIFIED SOVEREIGN TOOL REGISTRY (Milestone 1)
 * File: src/lib/noctis-tool-registry.ts
 * Subsystem: NOCTIS-ORCHESTRATOR-TOOL-REGISTRY
 * 
 * Standardizes the initial 16 core sovereign computational engines into
 * formal tool definitions with parameter schemas, natural-language regex
 * extractors, and markdown solution formatters.
 * ============================================================================
 */

import {
  evaluateTokamakMhdAndDivertor,
  type TokamakMhdParams,
  type TokamakMhdAuditResult
} from "./noctis-tokamak-mhd-divertor-engine.ts";

import {
  evaluateBatteryElectrochemistry,
  type BatteryElectrochemistryParams,
  type BatteryElectrochemistryAuditResult
} from "./noctis-battery-electrochemistry-degradation-engine.ts";

import {
  evaluateHypersonicAerothermodynamics,
  type HypersonicAeroParams,
  type HypersonicAuditResult
} from "./noctis-hypersonic-aerothermodynamics-engine.ts";

import {
  evaluateDirectAirCapture,
  type DirectAirCaptureParams,
  type DirectAirCaptureAuditResult
} from "./noctis-direct-air-capture-dac-engine.ts";

import {
  evaluateStellaratorConfinement,
  type StellaratorConfinementParams,
  type StellaratorAuditResult
} from "./noctis-stellarator-confinement-engine.ts";

import {
  evaluateHydroTurbineAndWaterHammer,
  type HydroTurbineParams,
  type HydroTurbineAuditResult
} from "./noctis-hydro-turbine-water-hammer-engine.ts";

import {
  evaluateCryoRocketPropellantStorage,
  type CryoRocketParams,
  type CryoRocketAuditResult
} from "./noctis-cryo-rocket-propellant-engine.ts";

import {
  evaluateReactorNeutronicsAndKinetics,
  type ReactorNeutronicsParams,
  type ReactorNeutronicsAuditResult
} from "./noctis-fission-core-neutronics-engine.ts";

import {
  evaluateInSarInterferometry,
  type InSarParams,
  type InSarAuditResult
} from "./noctis-insar-geodesy-deformation-engine.ts";

import {
  evaluateDeepSpaceOpticalLink,
  type DeepSpaceOpticalParams,
  type DeepSpaceOpticalAuditResult
} from "./noctis-deep-space-optical-comms-engine.ts";

import {
  evaluateNeuromorphicCircuits,
  type NeuromorphicParams,
  type NeuromorphicAuditResult
} from "./noctis-neuromorphic-spiking-circuits-engine.ts";

import {
  evaluateOrbitalRendezvous,
  type RendezvousParams,
  type RendezvousAuditResult
} from "./noctis-orbital-rendezvous-docking-engine.ts";

import {
  evaluateRydbergQuantumSimulation,
  type RydbergSimulationParams,
  type RydbergAuditResult
} from "./noctis-rydberg-quantum-simulator-engine.ts";

import {
  evaluateOtecPowerPlant,
  type OtecPlantParams,
  type OtecAuditResult
} from "./noctis-otec-ocean-thermal-engine.ts";

import {
  evaluateDirectionalDrilling,
  type DirectionalDrillingParams,
  type DirectionalDrillingAuditResult
} from "./noctis-directional-drilling-geomechanics-engine.ts";

import {
  evaluateSpaceGeodesyAndVlbi,
  type SpaceGeodesyParams,
  type SpaceGeodesyAuditResult
} from "./noctis-space-geodesy-vlbi-engine.ts";

export interface ToolParamSpec {
  name: string;
  type: "number" | "string" | "boolean";
  description: string;
  required: boolean;
  unit?: string;
  default?: number | string | boolean;
  patterns: RegExp[];
}

export interface SovereignToolDefinition<TInput = any, TOutput = any> {
  id: string;
  domainId: number;
  domainName: string;
  title: string;
  description: string;
  keywords: string[];
  parameters: ToolParamSpec[];
  execute: (params: TInput) => TOutput;
  formatMarkdown: (params: TInput, result: TOutput) => string;
}

export const SOVEREIGN_TOOLS: SovereignToolDefinition[] = [
  // 1. Tokamak MHD & Divertor
  {
    id: "sovereign_tokamak_mhd",
    domainId: 101,
    domainName: "FUSION_TOKAMAK_MHD",
    title: "Tokamak Magnetohydrodynamic (MHD) & Divertor Engine",
    description: "Evaluates Kruskal-Shafranov edge safety factor (q95), Troyon normalized beta, Greenwald density, and divertor scrape-off layer heat flux.",
    keywords: ["tokamak", "mhd", "kruskal-shafranov", "safety factor", "q95", "troyon", "divertor", "scrape-off layer", "psol", "greenwald", "kink mode"],
    parameters: [
      { name: "majorRadiusR0Meters", type: "number", description: "Major radius R0 in meters", required: true, unit: "m", patterns: [/R0\s*[:=]?\s*([\d,.]+)\s*m?/i, /major\s+radius\s*[:=]?\s*([\d,.]+)\s*m?/i] },
      { name: "minorRadiusAMeters", type: "number", description: "Minor radius a in meters", required: true, unit: "m", patterns: [/\ba\s*[:=]?\s*([\d,.]+)\s*m?/i, /minor\s+radius\s*[:=]?\s*([\d,.]+)\s*m?/i] },
      { name: "toroidalMagneticFieldTesla", type: "number", description: "Toroidal magnetic field B_T in Tesla", required: true, unit: "T", patterns: [/B_?[Tt]\s*[:=]?\s*([\d,.]+)\s*T?/i, /toroidal\s+(?:magnetic\s+)?field\s*[:=]?\s*([\d,.]+)\s*T?/i] },
      { name: "plasmaCurrentMegaAmps", type: "number", description: "Plasma current I_p in MegaAmps", required: true, unit: "MA", patterns: [/I_?[Pp]\s*[:=]?\s*([\d,.]+)\s*(?:MA|megaamp)/i, /plasma\s+current\s*[:=]?\s*([\d,.]+)\s*(?:MA|megaamp)?/i] },
      { name: "totalThermalBetaPercent", type: "number", description: "Total thermal beta in percent", required: false, unit: "%", default: 1.8, patterns: [/beta\s*[:=]?\s*([\d,.]+)\s*%/i, /thermal\s+beta\s*[:=]?\s*([\d,.]+)\s*%/i] },
      { name: "powerScrapeOffLayerMW", type: "number", description: "Scrape-off layer exhaust power in MW", required: false, unit: "MW", default: 15.0, patterns: [/P_?sol\s*[:=]?\s*([\d,.]+)\s*MW?/i, /scrape-off\s+layer\s+power\s*[:=]?\s*([\d,.]+)\s*MW?/i] },
      { name: "solPowerDecayLengthMm", type: "number", description: "SOL decay length in mm", required: false, unit: "mm", default: 1.5, patterns: [/lambda_?q\s*[:=]?\s*([\d,.]+)\s*mm/i, /decay\s+length\s*[:=]?\s*([\d,.]+)\s*mm/i] },
    ],
    execute: (p: TokamakMhdParams) => evaluateTokamakMhdAndDivertor(p),
    formatMarkdown: (p: TokamakMhdParams, res: TokamakMhdAuditResult) => `
### Tokamak MHD Equilibrium & Divertor Verification (Sovereign Engine #101)
- **Edge Safety Factor (q_95)**: **${res.safetyFactorQ95.toFixed(2)}** (Kruskal-Shafranov Invariant: ${res.safetyFactorQ95 >= 2.0 ? "SAFE (>= 2.0 avoids m=2/n=1 kink disruption)" : "VIOLATION (< 2.0 triggers disruption)"})
- **Troyon Normalized Beta (beta_N)**: **${res.normalizedBetaTroyon.toFixed(2)}** (Limit <= 3.5: ${res.normalizedBetaTroyon <= 3.5 ? "SATISFIED" : "EXCEEDED"})
- **Greenwald Density Limit**: **${res.greenwaldDensityLimit10_20M3.toFixed(2)} x 10^20 m^-3**
- **Parallel Scrape-Off Heat Flux**: **${res.parallelHeatFluxGWM2.toFixed(2)} GW/m^2** (Divertor Tolerable: **${res.isDivertorHeatTolerable}**)
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 2. Battery Electrochemistry & Lithium Plating
  {
    id: "sovereign_battery_electrochemistry",
    domainId: 102,
    domainName: "BATTERY_ELECTROCHEMISTRY",
    title: "Battery Electrochemistry & Lithium Plating Onset Engine",
    description: "Evaluates Butler-Volmer exchange current density, Arora lithium plating overpotential, SEI diffusion layer growth, and dendrite short-circuit risks.",
    keywords: ["battery", "lithium plating", "sei layer", "butler-volmer", "c-rate", "dendrite", "overpotential", "anode solid potential", "soc"],
    parameters: [
      { name: "stateOfChargeSoc", type: "number", description: "State of Charge (0.0 to 1.0)", required: true, default: 0.8, patterns: [/SoC\s*[:=]?\s*([\d,.]+)\s*%?/i, /state\s+of\s+charge\s*[:=]?\s*([\d,.]+)\s*%?/i] },
      { name: "chargeRateC", type: "number", description: "C-rate charging speed (e.g. 1.0C to 4.0C)", required: true, default: 1.5, patterns: [/([\d,.]+)\s*C\b/i, /c-rate\s*[:=]?\s*([\d,.]+)/i] },
      { name: "temperatureCelsius", type: "number", description: "Core cell temperature in Celsius", required: true, unit: "°C", default: 20.0, patterns: [/temperature\s*[:=]?\s*([-+]?[\d,.]+)\s*°?C/i, /([-+]?[\d,.]+)\s*°?C\b/i] },
      { name: "anodeSolidPotentialVolts", type: "number", description: "Anode solid potential phi_s in Volts vs Li/Li+", required: false, unit: "V", default: 0.08, patterns: [/phi_s\s*[:=]?\s*([\d,.]+)\s*V?/i, /solid\s+potential\s*[:=]?\s*([\d,.]+)\s*V?/i] },
      { name: "electrolytePotentialVolts", type: "number", description: "Electrolyte potential phi_e in Volts", required: false, unit: "V", default: 0.02, patterns: [/phi_e\s*[:=]?\s*([\d,.]+)\s*V?/i, /electrolyte\s+potential\s*[:=]?\s*([\d,.]+)\s*V?/i] },
      { name: "anodeOverpotentialVolts", type: "number", description: "Anode overpotential eta in Volts", required: false, unit: "V", default: 0.04, patterns: [/eta\s*[:=]?\s*([\d,.]+)\s*V?/i, /overpotential\s*[:=]?\s*([\d,.]+)\s*V?/i] },
      { name: "cycleCountN", type: "number", description: "Completed full equivalent cycles", required: false, default: 200, patterns: [/(\d+)\s+cycles?/i, /cycle\s+count\s*[:=]?\s*(\d+)/i] },
    ],
    execute: (p: BatteryElectrochemistryParams) => evaluateBatteryElectrochemistry(p),
    formatMarkdown: (p: BatteryElectrochemistryParams, res: BatteryElectrochemistryAuditResult) => `
### Battery Electrochemistry & Lithium Plating Audit (Sovereign Engine #102)
- **Butler-Volmer Exchange Current Density**: **${res.exchangeCurrentDensityAM2.toFixed(3)} A/m^2**
- **Lithium Plating Overpotential (eta_plating)**: **${res.lithiumPlatingPotentialVolts.toFixed(3)} V vs Li/Li+**
- **Plating Invariant**: **${res.isLithiumPlatingAvoided ? "SAFE (eta_plating > 0 V prevents metallic Li deposition)" : "VIOLATION (Plating triggered, severe dendrite hazard)"}**
- **SEI Layer Thickness**: **${res.seiLayerThicknessNanometers.toFixed(1)} nm** (Capacity Retention: **${res.capacityRetentionPercent.toFixed(2)}%**)
- **Safety Verdict**: **${res.isCellSafeFromDendrites ? "PASS (No internal short-circuit risk)" : "FAIL (Thermal runaway risk)"}**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 3. Hypersonic Aerothermodynamics & Shock Heating
  {
    id: "sovereign_hypersonic_aero",
    domainId: 103,
    domainName: "HYPERSONIC_AEROTHERMODYNAMICS",
    title: "Hypersonic Compressible Aerothermodynamics & Shock Heating",
    description: "Derives Rankine-Hugoniot shock jumps, Fay-Riddell stagnation heat transfer, and thermal protection system (TPS) ablation ceilings.",
    keywords: ["hypersonic", "mach", "fay-riddell", "stagnation point", "shock jump", "re-entry", "aerothermodynamic", "pica-x", "heat flux"],
    parameters: [
      { name: "machNumber", type: "number", description: "Mach flight speed (e.g. 5.0 to 25.0)", required: true, patterns: [/Mach\s*[:=]?\s*([\d,.]+)/i, /M\s*=\s*([\d,.]+)/i] },
      { name: "altitudeKm", type: "number", description: "Flight altitude z in km", required: true, unit: "km", default: 35.0, patterns: [/altitude\s*[:=]?\s*([\d,.]+)\s*km/i, /z\s*[:=]?\s*([\d,.]+)\s*km/i] },
      { name: "noseRadiusMeters", type: "number", description: "Blunt nose radius R_n in meters", required: true, unit: "m", default: 0.15, patterns: [/R_?n\s*[:=]?\s*([\d,.]+)\s*m?/i, /nose\s+radius\s*[:=]?\s*([\d,.]+)\s*m?/i] },
      { name: "wallTemperatureKelvin", type: "number", description: "Wall surface temperature in Kelvin", required: false, unit: "K", default: 1200.0, patterns: [/T_?w\s*[:=]?\s*([\d,.]+)\s*K/i, /wall\s+temp(?:erature)?\s*[:=]?\s*([\d,.]+)\s*K?/i] },
    ],
    execute: (p: HypersonicAeroParams) => evaluateHypersonicAerothermodynamics(p),
    formatMarkdown: (p: HypersonicAeroParams, res: HypersonicAuditResult) => `
### Hypersonic Shock & Aerothermodynamic Audit (Sovereign Engine #103)
- **Stagnation Temperature (T_0)**: **${res.stagnationTemperatureKelvin.toFixed(1)} K** (Dissociation Plasma: **${res.isDissociationPlasmaTriggered ? "ACTIVE (Ionized sheath)" : "INACTIVE"}**)
- **Post-Shock Normal Pressure (P_2)**: **${res.postShockPressureKPa.toFixed(1)} kPa**
- **Fay-Riddell Stagnation Heat Flux (q_s)**: **${res.stagnationHeatFluxMWPerM2.toFixed(2)} MW/m^2**
- **TPS Ablation Ceiling**: **${res.isTpsThermalLimitSatisfied ? "PASS (within thermal limit)" : "EXCEEDED (Ablation limit breached)"}**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 4. Direct Air Capture (DAC) Thermodynamics
  {
    id: "sovereign_dac_thermodynamics",
    domainId: 104,
    domainName: "CARBON_CAPTURE_DAC",
    title: "Direct Air Capture (DAC) Thermodynamics & TVSA Contactor Sizing",
    description: "Calculates inlet CO2 partial pressure, Darcy-Forchheimer contactor pressure drop, fan electrical consumption, and thermal desorption energy.",
    keywords: ["dac", "direct air capture", "sorbent", "tvsa", "desorption", "darcy-forchheimer", "co2 capture", "air contactor"],
    parameters: [
      { name: "ambientCo2ConcentrationPpm", type: "number", description: "CO2 concentration in ppm", required: false, unit: "ppm", default: 420.0, patterns: [/([\d,.]+)\s*ppm/i, /co2\s*[:=]?\s*([\d,.]+)\s*ppm/i] },
      { name: "ambientTemperatureCelsius", type: "number", description: "Ambient temperature in Celsius", required: false, unit: "°C", default: 20.0, patterns: [/temperature\s*[:=]?\s*([-+]?[\d,.]+)\s*°?C/i] },
      { name: "ambientPressureKPa", type: "number", description: "Ambient pressure in kPa", required: false, unit: "kPa", default: 101.3, patterns: [/pressure\s*[:=]?\s*([\d,.]+)\s*kPa/i] },
      { name: "contactorAirFaceVelocityMs", type: "number", description: "Contactor face velocity in m/s", required: false, unit: "m/s", default: 1.5, patterns: [/face\s+velocity\s*[:=]?\s*([\d,.]+)\s*m\/s/i, /v\s*[:=]?\s*([\d,.]+)\s*m\/s/i] },
      { name: "contactorDepthMeters", type: "number", description: "Contactor monolith depth in meters", required: false, unit: "m", default: 0.35, patterns: [/depth\s*[:=]?\s*([\d,.]+)\s*m/i, /L\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "sorbentCo2WorkingCapacityMmolG", type: "number", description: "Sorbent capacity in mmol/g", required: false, unit: "mmol/g", default: 1.8, patterns: [/capacity\s*[:=]?\s*([\d,.]+)\s*mmol\/g/i, /q\s*[:=]?\s*([\d,.]+)\s*mmol\/g/i] },
      { name: "desorptionTemperatureCelsius", type: "number", description: "Desorption temperature in Celsius", required: false, unit: "°C", default: 100.0, patterns: [/desorption\s+temp(?:erature)?\s*[:=]?\s*([\d,.]+)\s*°?C/i] },
      { name: "desorptionEnthalpyKjMol", type: "number", description: "Desorption reaction enthalpy in kJ/mol", required: false, unit: "kJ/mol", default: 72.0, patterns: [/enthalpy\s*[:=]?\s*([\d,.]+)\s*kJ\/mol/i] },
    ],
    execute: (p: DirectAirCaptureParams) => evaluateDirectAirCapture(p),
    formatMarkdown: (p: DirectAirCaptureParams, res: DirectAirCaptureAuditResult) => `
### Direct Air Capture (DAC) Thermodynamic Audit (Sovereign Engine #104)
- **Inlet CO2 Partial Pressure**: **${res.inletCo2PartialPressurePa.toFixed(1)} Pa**
- **Darcy-Forchheimer Pressure Drop**: **${res.contactorPressureDropPascals.toFixed(1)} Pa**
- **Fan Electrical Duty**: **${res.fanElectricalEnergyKwhPerTonCo2.toFixed(1)} kWh/t-CO2**
- **Thermal Desorption Duty (TVSA)**: **${res.thermalDesorptionEnergyGjPerTonCo2.toFixed(2)} GJ/t-CO2** (Total Exergy: **${res.totalEquivalentExergyGjPerTonCo2.toFixed(2)} GJ/t-CO2**)
- **Target Viability (<8.5 GJ/t)**: **${res.isThermodynamicTargetMet ? "PASS (Efficient Regeneration)" : "FAIL (Excessive Duty)"}**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 5. Hydroelectric Water Hammer & Turbine Sizing
  {
    id: "sovereign_hydro_water_hammer",
    domainId: 105,
    domainName: "HYDRO_TURBINE_HYDRAULICS",
    title: "Hydroelectric Turbine Selection & Joukowsky Water Hammer Engine",
    description: "Calculates Allievi elastic acoustic wave speed, Joukowsky dynamic head surge, total dynamic head, and recommended turbine runner type.",
    keywords: ["water hammer", "hydroelectric", "joukowsky", "penstock", "allievi", "francis", "pelton", "kaplan", "turbine sizing"],
    parameters: [
      { name: "netHeadMeters", type: "number", description: "Net head H in meters", required: true, unit: "m", patterns: [/head\s*[:=]?\s*([\d,.]+)\s*m/i, /H\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "flowRateM3S", type: "number", description: "Flow rate Q in m^3/s", required: true, unit: "m^3/s", patterns: [/flow\s*(?:rate)?\s*[:=]?\s*([\d,.]+)\s*m\^?3\/s/i, /Q\s*[:=]?\s*([\d,.]+)\s*m\^?3\/s/i] },
      { name: "penstockDiameterMeters", type: "number", description: "Penstock diameter D in meters", required: true, unit: "m", patterns: [/diameter\s*[:=]?\s*([\d,.]+)\s*m/i, /D\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "penstockWallThicknessMm", type: "number", description: "Wall thickness e in mm", required: true, unit: "mm", patterns: [/thickness\s*[:=]?\s*([\d,.]+)\s*mm/i, /e\s*[:=]?\s*([\d,.]+)\s*mm/i] },
      { name: "penstockLengthMeters", type: "number", description: "Penstock length L in meters", required: true, unit: "m", patterns: [/length\s*[:=]?\s*([\d,.]+)\s*m/i, /L\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "valveClosureTimeSeconds", type: "number", description: "Valve emergency closure time in seconds", required: true, unit: "s", patterns: [/closure\s+time\s*[:=]?\s*([\d,.]+)\s*s/i, /T_?c\s*[:=]?\s*([\d,.]+)\s*s/i] },
      { name: "rotationalSpeedRpm", type: "number", description: "Turbine rotational speed in RPM", required: false, unit: "RPM", default: 375, patterns: [/(\d+)\s*RPM/i, /speed\s*[:=]?\s*(\d+)\s*RPM/i] },
    ],
    execute: (p: HydroTurbineParams) => evaluateHydroTurbineAndWaterHammer(p),
    formatMarkdown: (p: HydroTurbineParams, res: HydroTurbineAuditResult) => `
### Hydroelectric Transient & Runner Audit (Sovereign Engine #105)
- **Allievi Elastic Wave Speed**: **${res.waveSpeedMs.toFixed(0)} m/s** (Acoustic Reflection: **${((2 * p.penstockLengthMeters) / res.waveSpeedMs).toFixed(2)} s**)
- **Steady-State Velocity**: **${res.waterVelocityMs.toFixed(2)} m/s**
- **Joukowsky Transient Head Surge**: **${res.joukowskyHeadSurgeMeters.toFixed(1)} m**
- **Total Dynamic Head**: **${res.totalDynamicHeadMeters.toFixed(1)} m** (Penstock Stress: **${res.isPenstockOverpressureSafe ? "SAFE (within S690QL allowable)" : "OVERSTRESSED"}**)
- **Turbine Mechanical Output**: **${res.turbineMechanicalPowerMW.toFixed(1)} MW** (Specific Speed Ns: **${res.specificSpeedNs.toFixed(1)}**)
- **Recommended Runner**: **${res.recommendedTurbineType}**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 6. Nuclear Fission Core Point Kinetics
  {
    id: "sovereign_fission_kinetics",
    domainId: 106,
    domainName: "FISSION_REACTOR_NEUTRONICS",
    title: "Nuclear Fission Reactor Point Kinetics & Doppler Feedback Engine",
    description: "Evaluates effective multiplication factor (k_eff), prompt critical margin, Doppler negative reactivity feedback, and reactor period.",
    keywords: ["nuclear reactor", "fission", "point kinetics", "prke", "doppler feedback", "k_eff", "prompt critical", "reactivity"],
    parameters: [
      { name: "reactivityInsertedDollars", type: "number", description: "Reactivity inserted in Dollars ($)", required: true, unit: "$", patterns: [/rho\s*[:=]?\s*([\d,.]+)\s*\$/i, /([\d,.]+)\s*\$\s*reactivity/i, /reactivity\s*[:=]?\s*([\d,.]+)\s*\$/i] },
      { name: "fuelTemperatureKelvin", type: "number", description: "Fuel temperature T_fuel in Kelvin", required: true, unit: "K", default: 950.0, patterns: [/fuel\s+temp(?:erature)?\s*[:=]?\s*([\d,.]+)\s*K/i, /T_?fuel\s*[:=]?\s*([\d,.]+)\s*K/i] },
      { name: "dopplerCoefficientPcmPerK", type: "number", description: "Doppler coefficient in pcm/K", required: false, unit: "pcm/K", default: -3.2, patterns: [/doppler\s*[:=]?\s*([-+]?[\d,.]+)\s*pcm\/K/i] },
      { name: "promptNeutronGenerationTimeUs", type: "number", description: "Prompt generation time in microseconds", required: false, unit: "us", default: 25.0, patterns: [/Lambda\s*[:=]?\s*([\d,.]+)\s*(?:us|micro)/i] },
    ],
    execute: (p: ReactorNeutronicsParams) => evaluateReactorNeutronicsAndKinetics(p),
    formatMarkdown: (p: ReactorNeutronicsParams, res: ReactorNeutronicsAuditResult) => `
### Nuclear Fission Core Kinetics & Reactivity Audit (Sovereign Engine #106)
- **Effective Multiplication Factor (k_eff)**: **${res.effectiveMultiplicationFactorKeff.toFixed(5)}**
- **Reactivity (rho)**: **${res.reactivityRhoPcm.toFixed(1)} pcm**
- **Prompt Critical Safety Margin**: **${res.promptCriticalMarginDollars.toFixed(3)} $**
- **Prompt Critical Invariant**: **${res.isPromptCriticalSafe ? "SAFE (rho < 1.00 $ avoids prompt criticality)" : "CRITICAL VIOLATION (Prompt Critical Excursion!)"}**
- **Doppler Negative Feedback**: **${res.dopplerReactivityFeedbackPcm.toFixed(1)} pcm**
- **Reactor Period**: **${res.reactorPeriodSeconds.toFixed(2)} s**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 7. Cryogenic Rocket Propellant Storage & Zero Boil-Off (ZBO)
  {
    id: "sovereign_cryo_rocket",
    domainId: 107,
    domainName: "CRYO_ROCKET_PROPELLANT",
    title: "Cryogenic Rocket Propellant Storage & Zero Boil-Off Engine",
    description: "Evaluates modified Lockheed MLI heat leak, unvented boil-off rates for LH2/LOX/LCH4, and active cryocooler electrical lift requirements.",
    keywords: ["cryogenic", "rocket propellant", "boil-off", "liquid hydrogen", "lh2", "lox", "zero boil-off", "zbo", "cryocooler", "mli"],
    parameters: [
      { name: "propellantType", type: "string", description: "Propellant type", required: true, default: "LIQUID_HYDROGEN_LH2", patterns: [/(LIQUID_HYDROGEN_LH2|LIQUID_OXYGEN_LOX|LIQUID_METHANE_LCH4|LH2|LOX|LCH4)/i] },
      { name: "tankVolumeM3", type: "number", description: "Tank volume in m^3", required: true, unit: "m^3", default: 150.0, patterns: [/volume\s*[:=]?\s*([\d,.]+)\s*m\^?3/i, /V\s*[:=]?\s*([\d,.]+)\s*m\^?3/i] },
      { name: "tankSurfaceAreaM2", type: "number", description: "Tank surface area in m^2", required: true, unit: "m^2", default: 180.0, patterns: [/surface\s+area\s*[:=]?\s*([\d,.]+)\s*m\^?2/i, /A\s*[:=]?\s*([\d,.]+)\s*m\^?2/i] },
      { name: "mliLayerCount", type: "number", description: "MLI insulation layer count", required: false, default: 45, patterns: [/(\d+)\s+(?:mli|reflective)\s+layers?/i, /layers?\s*[:=]?\s*(\d+)/i] },
      { name: "missionDurationDays", type: "number", description: "Mission duration in days", required: false, unit: "days", default: 60, patterns: [/(\d+)\s+days?/i, /duration\s*[:=]?\s*(\d+)\s*days?/i] },
      { name: "activeZboEnabled", type: "boolean", description: "Whether active ZBO cryocooler is active", required: false, default: true, patterns: [/zbo\s*[:=]?\s*(true|false|active|enabled)/i] },
    ],
    execute: (p: CryoRocketParams) => {
      let prop = p.propellantType;
      if (/lh2|hydrogen/i.test(prop)) prop = "LIQUID_HYDROGEN_LH2";
      else if (/lox|oxygen/i.test(prop)) prop = "LIQUID_OXYGEN_LOX";
      else if (/methane|lch4/i.test(prop)) prop = "LIQUID_METHANE_LCH4";
      return evaluateCryoRocketPropellantStorage({ ...p, propellantType: prop as any });
    },
    formatMarkdown: (p: CryoRocketParams, res: CryoRocketAuditResult) => `
### Cryogenic Rocket Propellant Storage Audit (Sovereign Engine #107)
- **Propellant Storage Temperature**: **${res.cryoTemperatureKelvin} K** (h_fg: **${res.latentHeatOfVaporizationKJPerKg} kJ/kg**)
- **MLI Thermal Heat Leak**: **${res.mliHeatFluxWM2.toFixed(3)} W/m^2** (Total Parasitic Leak: **${res.totalThermalHeatLeakWatts.toFixed(1)} W**)
- **Passive Boil-Off Rate**: **${res.dailyBoilOffRateKgPerDay.toFixed(2)} kg/day (${res.dailyBoilOffPercentage.toFixed(3)}%/day)**
- **Active ZBO Cryocooler Power**: **${res.zboElectricPowerRequiredWatts.toFixed(1)} W** (Zero Boil-Off: **${res.isZeroBoilOffMaintained ? "MAINTAINED" : "UNCONTAINED"}**)
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 8. Stellarator 3D Confinement
  {
    id: "sovereign_stellarator_confinement",
    domainId: 108,
    domainName: "STELLARATOR_CONFINEMENT",
    title: "Stellarator 3D Magnetic Confinement & Neoclassical Transport",
    description: "Evaluates rotational transform iota, equivalent safety factor q_eq, rational resonance exclusion, Mercier ideal MHD criterion, and ISS04 confinement scaling.",
    keywords: ["stellarator", "rotational transform", "iota", "mercier", "iss04", "neoclassical transport", "wendelstein", "confinement time"],
    parameters: [
      { name: "majorRadiusR0Meters", type: "number", description: "Major radius R0 in meters", required: true, unit: "m", default: 4.5, patterns: [/R0\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "minorRadiusAMeters", type: "number", description: "Minor radius a in meters", required: true, unit: "m", default: 0.45, patterns: [/\ba\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "averageToroidalFieldTesla", type: "number", description: "Toroidal field B0 in Tesla", required: true, unit: "T", default: 2.5, patterns: [/B0\s*[:=]?\s*([\d,.]+)\s*T/i] },
      { name: "rotationalTransformIota", type: "number", description: "Rotational transform iota", required: true, default: 0.85, patterns: [/iota\s*[:=]?\s*([\d,.]+)/i] },
      { name: "numberOfFieldPeriods", type: "number", description: "Number of field periods N", required: false, default: 5, patterns: [/N\s*[:=]?\s*(\d+)\s*field\s*periods?/i, /field\s*periods?\s*[:=]?\s*(\d+)/i] },
      { name: "plasmaBetaPercent", type: "number", description: "Thermal beta in percent", required: false, unit: "%", default: 2.0, patterns: [/beta\s*[:=]?\s*([\d,.]+)\s*%/i] },
      { name: "coreElectronTempKeV", type: "number", description: "Electron temperature in keV", required: false, unit: "keV", default: 2.5, patterns: [/Te\s*[:=]?\s*([\d,.]+)\s*keV/i] },
      { name: "corePlasmaDensity10_20M3", type: "number", description: "Plasma density in 10^20 m^-3", required: false, default: 1.0, patterns: [/n(?:_e)?\s*[:=]?\s*([\d,.]+)\s*(?:x10\^20|\*10\^20)/i] },
    ],
    execute: (p: StellaratorConfinementParams) => evaluateStellaratorConfinement(p),
    formatMarkdown: (p: StellaratorConfinementParams, res: StellaratorAuditResult) => `
### Stellarator 3D Confinement Audit (Sovereign Engine #108)
- **Rotational Transform (iota)**: **${res.rotationalTransformIota.toFixed(3)}** (Equivalent q_eq: **${res.equivalentSafetyFactorQ.toFixed(2)}**)
- **Resonance Avoidance**: **${res.isRationalResonanceAvoided ? "VERIFIED (clear of low-order disruptions)" : "RISK (Resonance collision)"}**
- **Mercier Ideal MHD Stability**: **${res.mercierStabilityCriterion ? "SATISFIED" : "UNSTABLE"}**
- **ISS04 Energy Confinement Time (tau_E)**: **${res.confinementEnergyTimeSec.toFixed(3)} s**
- **Neoclassical Radial Flux**: **${res.neoclassicalRadialFluxM2S.toExponential(2)} m^-2 s^-1**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 9. InSAR Radar Interferometry & Geodesy
  {
    id: "sovereign_insar_geodesy",
    domainId: 109,
    domainName: "INSAR_GEODESY_DEFORMATION",
    title: "InSAR Satellite Radar Interferometry & Crustal Deformation Engine",
    description: "Derives interferometric phase sensitivity, ambiguity altitude, critical baseline, and phase unwrapping coherence limits for Sentinel-1/NISAR.",
    keywords: ["insar", "interferometry", "sar", "sentinel-1", "nisar", "deformation", "geodesy", "perpendicular baseline", "phase unwrapping"],
    parameters: [
      { name: "radarWavelengthCm", type: "number", description: "Radar wavelength in cm (5.55 C-band, 24.0 L-band)", required: true, unit: "cm", default: 5.55, patterns: [/wavelength\s*[:=]?\s*([\d,.]+)\s*cm/i, /lambda\s*[:=]?\s*([\d,.]+)\s*cm/i] },
      { name: "satelliteAltitudeKm", type: "number", description: "Satellite orbital altitude in km", required: true, unit: "km", default: 693.0, patterns: [/altitude\s*[:=]?\s*([\d,.]+)\s*km/i] },
      { name: "incidenceAngleDegrees", type: "number", description: "Look incidence angle in degrees", required: true, unit: "°", default: 37.0, patterns: [/incidence\s*angle\s*[:=]?\s*([\d,.]+)\s*°?/i] },
      { name: "perpendicularBaselineMeters", type: "number", description: "Perpendicular baseline B_perp in meters", required: true, unit: "m", default: 85.0, patterns: [/B_?perp\s*[:=]?\s*([\d,.]+)\s*m/i, /baseline\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "slantRangeResolutionMeters", type: "number", description: "Slant range resolution in meters", required: false, unit: "m", default: 5.0, patterns: [/resolution\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "temporalDecorrelationDays", type: "number", description: "Revisit temporal baseline in days", required: false, unit: "days", default: 12, patterns: [/(\d+)\s+days?\s+revisit/i] },
      { name: "surfaceDeformationRateMmYear", type: "number", description: "Surface deformation in mm/year", required: false, unit: "mm/yr", default: 15.0, patterns: [/([\d,.]+)\s*mm\/(?:yr|year)/i] },
    ],
    execute: (p: InSarParams) => evaluateInSarInterferometry(p),
    formatMarkdown: (p: InSarParams, res: InSarAuditResult) => `
### InSAR Satellite Interferometry & Geodesy Audit (Sovereign Engine #109)
- **Phase Sensitivity**: **${res.phaseSensitivityMmPerRadian.toFixed(2)} mm/rad**
- **Altitude of Ambiguity (h_a)**: **${res.altitudeOfAmbiguityMeters.toFixed(1)} m**
- **Critical Baseline (B_crit)**: **${res.criticalBaselineMeters.toFixed(1)} m** (Baseline Margin: **${res.isBaselineWithinCriticalLimit ? "SATISFIED" : "DECORRELATED"}**)
- **Interferometric Coherence (gamma)**: **${res.interferometricCoherenceGamma.toFixed(2)}** (Unwrapping Feasible: **${res.isPhaseUnwrappingFeasible}**)
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 10. Deep Space Optical Communications (DSOC)
  {
    id: "sovereign_deep_space_optical",
    domainId: 110,
    domainName: "DEEP_SPACE_OPTICAL_COMMS",
    title: "Deep-Space Optical Link & Photon-Counting Communications Engine",
    description: "Evaluates link budget, space loss, photon flux, Poisson PPM photon-counting SNR, and telemetry data rate for interplanetary missions.",
    keywords: ["deep space optical", "dsoc", "laser comms", "photon counting", "ppm", "psyche", "link budget", "astronomical units", "palomar"],
    parameters: [
      { name: "distanceAstronomicalUnits", type: "number", description: "Interplanetary distance in AU", required: true, unit: "AU", default: 1.5, patterns: [/([\d,.]+)\s*AU\b/i, /distance\s*[:=]?\s*([\d,.]+)\s*AU/i] },
      { name: "laserWavelengthNm", type: "number", description: "Laser wavelength in nm", required: false, unit: "nm", default: 1550.0, patterns: [/wavelength\s*[:=]?\s*([\d,.]+)\s*nm/i] },
      { name: "transmitPowerWatts", type: "number", description: "Laser transmit power in Watts", required: false, unit: "W", default: 10.0, patterns: [/transmit\s+power\s*[:=]?\s*([\d,.]+)\s*W/i, /P_?tx\s*[:=]?\s*([\d,.]+)\s*W/i] },
      { name: "transmitterApertureDiameterM", type: "number", description: "Flight telescope diameter in meters", required: false, unit: "m", default: 0.22, patterns: [/flight\s+aperture\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "groundReceiverApertureDiameterM", type: "number", description: "Ground telescope diameter in meters", required: false, unit: "m", default: 5.1, patterns: [/ground\s+aperture\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "pointingJitterMicroradians", type: "number", description: "Pointing jitter in microradians", required: false, unit: "urad", default: 1.0, patterns: [/jitter\s*[:=]?\s*([\d,.]+)\s*u?rad/i] },
      { name: "ppmOrderM", type: "number", description: "Pulse Position Modulation order M", required: false, default: 32, patterns: [/PPM-?(\d+)/i, /M\s*[:=]?\s*(\d+)/i] },
      { name: "slotWidthNanoseconds", type: "number", description: "PPM slot width in nanoseconds", required: false, unit: "ns", default: 2.0, patterns: [/slot\s+width\s*[:=]?\s*([\d,.]+)\s*ns/i] },
    ],
    execute: (p: DeepSpaceOpticalParams) => evaluateDeepSpaceOpticalLink(p),
    formatMarkdown: (p: DeepSpaceOpticalParams, res: DeepSpaceOpticalAuditResult) => `
### Deep-Space Optical Link (DSOC) Budget (Sovereign Engine #110)
- **Path Free-Space Loss**: **${res.freeSpaceLossDb.toFixed(1)} dB**
- **Received Optical Power**: **${res.receivedPowerPicowatts.toFixed(2)} pW**
- **Photons Per Slot**: **${res.photonsPerSlot.toFixed(2)} photons/slot**
- **Poisson PPM SNR**: **${res.photonCountingSnrDb.toFixed(1)} dB** (Link Margin >= 3.0 dB: **${res.isLinkMarginAcceptable ? "VERIFIED" : "DEGRADED"}**)
- **Data Throughput**: **${res.achievableDataRateMbps.toFixed(2)} Mbps**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 11. Neuromorphic Spiking Circuits
  {
    id: "sovereign_neuromorphic_circuits",
    domainId: 111,
    domainName: "NEUROMORPHIC_SPIKING_CIRCUITS",
    title: "Neuromorphic Spiking Neural Circuits & Leaky Integrate-and-Fire",
    description: "Evaluates LIF neuron dynamics, membrane time constants, spike firing frequency, energy dissipation per spike, and STDP synaptic plasticity.",
    keywords: ["neuromorphic", "spiking neuron", "lif", "leaky integrate-and-fire", "synapse", "stdp", "spike", "membrane potential"],
    parameters: [
      { name: "membraneCapacitancePicofarads", type: "number", description: "Capacitance C_m in pF", required: true, unit: "pF", default: 2.0, patterns: [/C_?m\s*[:=]?\s*([\d,.]+)\s*pF/i] },
      { name: "leakConductanceNanosiemens", type: "number", description: "Conductance g_L in nS", required: true, unit: "nS", default: 10.0, patterns: [/g_?L\s*[:=]?\s*([\d,.]+)\s*nS/i] },
      { name: "restingPotentialMillivolts", type: "number", description: "Resting potential E_L in mV", required: false, unit: "mV", default: -70.0, patterns: [/E_?L\s*[:=]?\s*([-+]?[\d,.]+)\s*mV/i] },
      { name: "thresholdPotentialMillivolts", type: "number", description: "Threshold V_th in mV", required: false, unit: "mV", default: -50.0, patterns: [/V_?th\s*[:=]?\s*([-+]?[\d,.]+)\s*mV/i] },
      { name: "resetPotentialMillivolts", type: "number", description: "Reset V_reset in mV", required: false, unit: "mV", default: -75.0, patterns: [/V_?reset\s*[:=]?\s*([-+]?[\d,.]+)\s*mV/i] },
      { name: "inputSynapticCurrentPicoamps", type: "number", description: "Synaptic current I_syn in pA", required: true, unit: "pA", default: 350.0, patterns: [/I_?syn\s*[:=]?\s*([\d,.]+)\s*pA/i, /current\s*[:=]?\s*([\d,.]+)\s*pA/i] },
      { name: "refractoryPeriodMilliseconds", type: "number", description: "Refractory period in ms", required: false, unit: "ms", default: 2.0, patterns: [/refractory\s*[:=]?\s*([\d,.]+)\s*ms/i] },
      { name: "stdpTimeDeltaMs", type: "number", description: "STDP delta t in ms", required: false, unit: "ms", default: 5.0, patterns: [/delta\s*t\s*[:=]?\s*([-+]?[\d,.]+)\s*ms/i] },
    ],
    execute: (p: NeuromorphicParams) => evaluateNeuromorphicCircuits(p),
    formatMarkdown: (p: NeuromorphicParams, res: NeuromorphicAuditResult) => `
### Neuromorphic Spiking Neuron (LIF) Audit (Sovereign Engine #111)
- **Membrane Time Constant (tau_m)**: **${res.membraneTimeConstantMs.toFixed(2)} ms**
- **Spike Firing Rate**: **${res.firingRateHz.toFixed(1)} Hz** (Firing Active: **${res.isSpikeThresholdExceeded}**)
- **Energy Per Spike**: **${res.energyPerSpikeFemtojoules.toFixed(1)} fJ/spike**
- **STDP Synaptic Weight Change (Delta W)**: **${(res.synapticWeightChangeDeltaW * 100).toFixed(2)}%** (${res.isLongTermPotentiation ? "LTP (Strengthened)" : "LTD (Depressed)"})
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 12. Orbital Rendezvous & Clohessy-Wiltshire Docking
  {
    id: "sovereign_orbital_rendezvous",
    domainId: 112,
    domainName: "ORBITAL_RENDEZVOUS_DOCKING",
    title: "Orbital Rendezvous Mechanics & Clohessy-Wiltshire Docking Engine",
    description: "Evaluates Clohessy-Wiltshire relative motion equations, approach corridors (V-bar/R-bar), and docking contact velocity limits for spacecraft.",
    keywords: ["orbital rendezvous", "clohessy-wiltshire", "v-bar", "r-bar", "docking", "spacecraft", "iss docking", "contact velocity"],
    parameters: [
      { name: "targetOrbitAltitudeKm", type: "number", description: "Target altitude in km", required: true, unit: "km", default: 400.0, patterns: [/altitude\s*[:=]?\s*([\d,.]+)\s*km/i] },
      { name: "initialRadialOffsetXMeters", type: "number", description: "Radial offset x in meters", required: false, unit: "m", default: 0.0, patterns: [/x\s*[:=]?\s*([-+]?[\d,.]+)\s*m/i] },
      { name: "initialAlongTrackOffsetYMeters", type: "number", description: "Along-track offset y in meters", required: true, unit: "m", default: -150.0, patterns: [/y\s*[:=]?\s*([-+]?[\d,.]+)\s*m/i, /along-track\s*[:=]?\s*([-+]?[\d,.]+)\s*m/i] },
      { name: "initialCrossTrackOffsetZMeters", type: "number", description: "Cross-track offset z in meters", required: false, unit: "m", default: 0.0, patterns: [/z\s*[:=]?\s*([-+]?[\d,.]+)\s*m/i] },
      { name: "approachCorridorType", type: "string", description: "Corridor: V_BAR or R_BAR", required: false, default: "V_BAR", patterns: [/(V_BAR|R_BAR|V-bar|R-bar)/i] },
      { name: "closingVelocityMs", type: "number", description: "Closing approach velocity in m/s", required: true, unit: "m/s", default: 0.08, patterns: [/closing\s+velocity\s*[:=]?\s*([\d,.]+)\s*m\/s/i, /velocity\s*[:=]?\s*([\d,.]+)\s*m\/s/i] },
      { name: "dockingDistanceMeters", type: "number", description: "Distance to docking port in meters", required: false, unit: "m", default: 0.05, patterns: [/docking\s+distance\s*[:=]?\s*([\d,.]+)\s*m/i] },
    ],
    execute: (p: RendezvousParams) => {
      let corridor = p.approachCorridorType || "V_BAR";
      if (/r[-_]?bar/i.test(corridor)) corridor = "R_BAR";
      else corridor = "V_BAR";
      return evaluateOrbitalRendezvous({ ...p, approachCorridorType: corridor as any });
    },
    formatMarkdown: (p: RendezvousParams, res: RendezvousAuditResult) => `
### Orbital Rendezvous & CW Docking Audit (Sovereign Engine #112)
- **Orbital Mean Motion (n)**: **${res.orbitalMeanMotionRadS.toExponential(3)} rad/s**
- **Docking Contact Velocity**: **${res.contactVelocityMs.toFixed(3)} m/s** (Limit <= 0.10 m/s: **${res.isContactVelocitySafe ? "SAFE" : "EXCESSIVE"}**)
- **Corridor Containment**: **${res.isWithinApproachCorridor ? "VERIFIED (within cone)" : "DRIFT DETECTED"}**
- **Delta-V Braking Required**: **${res.deltaVRequiredMs.toFixed(3)} m/s**
- **Docking Mechanism Structural Safety**: **${res.isDockingMechanismSafe ? "GO FOR DOCKING" : "ABORT"}**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 13. Rydberg Atom Quantum Simulation
  {
    id: "sovereign_rydberg_quantum",
    domainId: 113,
    domainName: "RYDBERG_QUANTUM_SIMULATION",
    title: "Rydberg Atom Neutral Qubit Array & Quantum Simulation Engine",
    description: "Calculates Rydberg blockade radius R_b, Van der Waals C6 interaction energy, Rabi oscillation frequency, and entanglement fidelity.",
    keywords: ["rydberg", "blockade radius", "neutral atom", "quantum simulation", "rabi", "van der waals", "c6 coefficient", "entanglement"],
    parameters: [
      { name: "principalQuantumNumberN", type: "number", description: "Principal quantum number n (e.g. 60 to 75)", required: true, default: 70, patterns: [/n\s*[:=]?\s*(\d+)/i, /principal\s+quantum\s+number\s*[:=]?\s*(\d+)/i] },
      { name: "rabiFrequencyMegaRadS", type: "number", description: "Rabi frequency Omega in Mrad/s", required: true, unit: "Mrad/s", default: 12.0, patterns: [/Omega\s*[:=]?\s*([\d,.]+)\s*Mrad\/s/i, /rabi\s*[:=]?\s*([\d,.]+)\s*Mrad\/s/i] },
      { name: "laserDetuningMegaRadS", type: "number", description: "Laser detuning Delta in Mrad/s", required: false, unit: "Mrad/s", default: 0.0, patterns: [/Delta\s*[:=]?\s*([-+]?[\d,.]+)\s*Mrad\/s/i, /detuning\s*[:=]?\s*([-+]?[\d,.]+)\s*Mrad\/s/i] },
      { name: "interatomicSeparationMicrons", type: "number", description: "Qubit separation R in microns", required: true, unit: "um", default: 4.5, patterns: [/R\s*[:=]?\s*([\d,.]+)\s*u?m/i, /separation\s*[:=]?\s*([\d,.]+)\s*u?m/i] },
      { name: "atomicSpecies", type: "string", description: "Atomic species (Rb87 or Sr88)", required: false, default: "Rb87", patterns: [/(Rb-?87|Sr-?88)/i] },
    ],
    execute: (p: RydbergSimulationParams) => {
      let spec = p.atomicSpecies || "Rb87";
      if (/sr/i.test(spec)) spec = "Sr88";
      else spec = "Rb87";
      return evaluateRydbergQuantumSimulation({ ...p, atomicSpecies: spec as any });
    },
    formatMarkdown: (p: RydbergSimulationParams, res: RydbergAuditResult) => `
### Rydberg Quantum Simulation Audit (Sovereign Engine #113)
- **Van der Waals C6 Coefficient**: **${res.vanDerWaalsC6GHzMicron6.toExponential(2)} GHz*um^6**
- **Rydberg Blockade Radius (R_b)**: **${res.blockadeRadiusMicrons.toFixed(2)} um**
- **Interaction Energy (V_R)**: **${res.interactionEnergyGHz.toFixed(3)} GHz** (Blockade: **${res.isBlockadeRegimeAchieved ? "STRONG BLOCKADE (V_R >> Omega)" : "WEAK (No blockade)"}**)
- **Bell-State Entanglement Fidelity**: **${(res.entanglementFidelity * 100).toFixed(2)}%**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 14. Ocean Thermal Energy Conversion (OTEC)
  {
    id: "sovereign_otec_power",
    domainId: 114,
    domainName: "OTEC_OCEAN_THERMAL",
    title: "Ocean Thermal Energy Conversion (OTEC) Thermodynamic Plant Engine",
    description: "Evaluates closed-cycle ammonia Rankine efficiency, cold water pipe hydraulic friction, parasitic pump load, and net electrical efficiency.",
    keywords: ["otec", "ocean thermal", "rankine", "cold water pipe", "ammonia power", "carnot", "parasitic pumping"],
    parameters: [
      { name: "surfaceWarmSeawaterTempC", type: "number", description: "Surface warm seawater temp in °C", required: true, unit: "°C", default: 28.0, patterns: [/surface\s+temp(?:erature)?\s*[:=]?\s*([\d,.]+)\s*°?C/i] },
      { name: "deepColdSeawaterTempC", type: "number", description: "Deep cold seawater temp in °C", required: true, unit: "°C", default: 5.0, patterns: [/cold\s+temp(?:erature)?\s*[:=]?\s*([\d,.]+)\s*°?C/i] },
      { name: "coldWaterPipeDepthMeters", type: "number", description: "Cold water pipe intake depth in meters", required: true, unit: "m", default: 900.0, patterns: [/depth\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "coldWaterPipeDiameterMeters", type: "number", description: "Cold water pipe diameter in meters", required: false, unit: "m", default: 3.5, patterns: [/pipe\s+diameter\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "warmWaterFlowRateM3S", type: "number", description: "Warm seawater flow rate in m^3/s", required: false, unit: "m^3/s", default: 25.0, patterns: [/warm\s+flow\s*[:=]?\s*([\d,.]+)\s*m\^?3\/s/i] },
      { name: "coldWaterFlowRateM3S", type: "number", description: "Cold seawater flow rate in m^3/s", required: false, unit: "m^3/s", default: 18.0, patterns: [/cold\s+flow\s*[:=]?\s*([\d,.]+)\s*m\^?3\/s/i] },
      { name: "grossTurbineOutputMWe", type: "number", description: "Gross turbine output in MWe", required: true, unit: "MWe", default: 10.0, patterns: [/gross\s+output\s*[:=]?\s*([\d,.]+)\s*MWe?/i, /turbine\s*[:=]?\s*([\d,.]+)\s*MWe?/i] },
    ],
    execute: (p: OtecPlantParams) => evaluateOtecPowerPlant(p),
    formatMarkdown: (p: OtecPlantParams, res: OtecAuditResult) => `
### OTEC Thermodynamic Power Plant Audit (Sovereign Engine #114)
- **Carnot Maximum Efficiency**: **${res.carnotIdealEfficiencyPercent.toFixed(2)}%** (Delta T = ${(p.surfaceWarmSeawaterTempC - p.deepColdSeawaterTempC).toFixed(1)} °C)
- **Net Electrical Power Output**: **${res.netElectricalPowerMWe.toFixed(2)} MWe** (Parasitic Load: **${res.parasiticPumpingPowerMWe.toFixed(2)} MWe**)
- **Cold Water Pipe Pressure Drop**: **${res.coldWaterPipingHeadLossMeters.toFixed(2)} m**
- **Commercial Viability (Net > 0)**: **${res.isNetPositivePowerVerified ? "VIABLE (Net power positive)" : "NEGATIVE NET POWER"}**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 15. Directional Wellbore Geomechanics
  {
    id: "sovereign_directional_drilling",
    domainId: 115,
    domainName: "DIRECTIONAL_DRILLING_GEOMECHANICS",
    title: "Directional Wellbore Geomechanics & Minimum Curvature Trajectory",
    description: "Calculates Minimum Curvature Dogleg Severity (DLS), True Vertical Depth (TVD), wellbore stability mud weight window, and kick tolerance.",
    keywords: ["directional drilling", "dogleg severity", "dls", "wellbore", "kick tolerance", "mud weight", "true vertical depth", "tvd"],
    parameters: [
      { name: "measuredDepthMeters", type: "number", description: "Measured depth (MD) in meters", required: true, unit: "m", default: 3500.0, patterns: [/MD\s*[:=]?\s*([\d,.]+)\s*m/i, /measured\s+depth\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "inclinationAngleDegrees", type: "number", description: "Current inclination in degrees", required: true, unit: "°", default: 45.0, patterns: [/inclination\s*[:=]?\s*([\d,.]+)\s*°?/i] },
      { name: "azimuthAngleDegrees", type: "number", description: "Current azimuth in degrees", required: true, unit: "°", default: 120.0, patterns: [/azimuth\s*[:=]?\s*([\d,.]+)\s*°?/i] },
      { name: "courseLengthMeters", type: "number", description: "Survey course length in meters", required: false, unit: "m", default: 30.0, patterns: [/course\s+length\s*[:=]?\s*([\d,.]+)\s*m/i] },
      { name: "previousInclinationDegrees", type: "number", description: "Previous inclination in degrees", required: false, unit: "°", default: 42.0, patterns: [/prev(?:ious)?\s+inc(?:lination)?\s*[:=]?\s*([\d,.]+)\s*°?/i] },
      { name: "previousAzimuthDegrees", type: "number", description: "Previous azimuth in degrees", required: false, unit: "°", default: 118.0, patterns: [/prev(?:ious)?\s+azimuth\s*[:=]?\s*([\d,.]+)\s*°?/i] },
      { name: "formationPorePressureEcdPpg", type: "number", description: "Pore pressure in ppg", required: true, unit: "ppg", default: 10.5, patterns: [/pore\s+pressure\s*[:=]?\s*([\d,.]+)\s*ppg/i] },
      { name: "formationFractureGradientEcdPpg", type: "number", description: "Fracture gradient in ppg", required: true, unit: "ppg", default: 16.0, patterns: [/fracture\s+gradient\s*[:=]?\s*([\d,.]+)\s*ppg/i] },
      { name: "drillingMudDensityEcdPpg", type: "number", description: "Active mud weight in ppg", required: true, unit: "ppg", default: 12.0, patterns: [/mud\s+weight\s*[:=]?\s*([\d,.]+)\s*ppg/i] },
    ],
    execute: (p: DirectionalDrillingParams) => evaluateDirectionalDrilling(p),
    formatMarkdown: (p: DirectionalDrillingParams, res: DirectionalDrillingAuditResult) => `
### Directional Wellbore Geomechanics Audit (Sovereign Engine #115)
- **Dogleg Severity (DLS)**: **${res.doglegSeverityDegPer30M.toFixed(2)} °/30m** (Limit <= 4.0 °/30m: **${res.isDoglegSeverityAcceptable ? "SAFE" : "EXCESSIVE FATIGUE"}**)
- **True Vertical Depth (TVD)**: **${res.trueVerticalDepthMeters.toFixed(1)} m**
- **Safe Mud Window**: **${p.formationPorePressureEcdPpg} ppg < ${p.drillingMudDensityEcdPpg} ppg < ${p.formationFractureGradientEcdPpg} ppg** (${res.isWellboreStabilityMaintained ? "STABLE" : "COLLAPSE / LOSS HAZARD"})
- **Kick Tolerance**: **${res.kickTolerancePpg.toFixed(2)} ppg**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  },

  // 16. Space Geodesy & VLBI
  {
    id: "sovereign_space_geodesy_vlbi",
    domainId: 116,
    domainName: "SPACE_GEODESY_VLBI",
    title: "Space Geodesy, VLBI Delay & General Relativistic Deflection",
    description: "Evaluates geometric group delay, General Relativistic gravitational time delay (Shapiro effect), and tectonic baseline plate motion.",
    keywords: ["vlbi", "space geodesy", "very long baseline interferometry", "shapiro delay", "general relativity", "tectonic drift", "group delay"],
    parameters: [
      { name: "baselineLengthKm", type: "number", description: "Intercontinental baseline in km", required: true, unit: "km", default: 6000.0, patterns: [/baseline\s*[:=]?\s*([\d,.]+)\s*km/i] },
      { name: "sourceDeclinationDeg", type: "number", description: "Radio source declination in degrees", required: true, unit: "°", default: 22.0, patterns: [/declination\s*[:=]?\s*([\d,.]+)\s*°?/i] },
      { name: "sourceRightAscensionHours", type: "number", description: "Right ascension in hours", required: true, unit: "h", default: 12.5, patterns: [/right\s+ascension\s*[:=]?\s*([\d,.]+)\s*h/i] },
      { name: "solarElongationAngleDeg", type: "number", description: "Solar elongation angle in degrees", required: false, unit: "°", default: 45.0, patterns: [/solar\s+elongation\s*[:=]?\s*([\d,.]+)\s*°?/i] },
      { name: "tectonicDriftRateMmPerYear", type: "number", description: "Tectonic drift in mm/year", required: false, unit: "mm/yr", default: 25.0, patterns: [/drift\s*[:=]?\s*([\d,.]+)\s*mm\/(?:yr|year)/i] },
    ],
    execute: (p: SpaceGeodesyParams) => evaluateSpaceGeodesyAndVlbi(p),
    formatMarkdown: (p: SpaceGeodesyParams, res: SpaceGeodesyAuditResult) => `
### Space Geodesy & VLBI Relativistic Delay Audit (Sovereign Engine #116)
- **Geometric Group Delay (tau_g)**: **${res.geometricGroupDelayNanoseconds.toFixed(3)} ns**
- **General Relativistic Shapiro Delay**: **${res.generalRelativisticShapiroDelayPs.toFixed(2)} ps**
- **Total Delay**: **${res.totalDelayNanoseconds.toFixed(3)} ns**
- **Tectonic Baseline Drift (10-Year)**: **${res.tenYearDriftCentimeters.toFixed(2)} cm**
- **Diagnostic Invariant**: ${res.diagnostic}
`
  }
];

export const SOVEREIGN_TOOLS_BY_ID: Record<string, SovereignToolDefinition> = Object.fromEntries(
  SOVEREIGN_TOOLS.map((t) => [t.id, t])
);
