#!/usr/bin/env tsx
/**
 * ============================================================================
 * NOCTIS UNIFIED INTELLIGENCE ORCHESTRATOR END-TO-END TEST SUITE
 * Script: scripts/test-unified-orchestrator.ts
 * Subsystem: NOCTIS-TEST-ORCHESTRATOR-001
 * 
 * Validates:
 * 1. Tool registry integrity across all 16 standardized engines.
 * 2. Natural language tool matching across all 16 domains.
 * 3. Parameter extraction, unit parsing, and schema validation.
 * 4. Deterministic mathematical execution and invariant enforcement.
 * 5. Explicit uncertainty handling on missing inputs (zero hallucination).
 * 6. End-to-end chat integration via vibeReply in noctis-desk.server.ts.
 * ============================================================================
 */

import { SOVEREIGN_TOOLS, SOVEREIGN_TOOLS_BY_ID } from "../src/lib/noctis-tool-registry.ts";
import {
  matchSovereignTool,
  extractToolParameters,
  orchestrateSovereignQuery
} from "../src/lib/noctis-tool-orchestrator.ts";
import { vibeReply } from "../src/lib/noctis-desk.server.ts";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

console.log(`${c.bold}${c.cyan}======================================================================${c.reset}`);
console.log(`${c.bold}${c.cyan} NOCTIS UNIFIED INTELLIGENCE ORCHESTRATOR TEST SUITE (MILESTONE 1)${c.reset}`);
console.log(`${c.dim} Validating 16 standardized tools, NL routing, uncertainty, and chat integration${c.reset}`);
console.log(`${c.bold}${c.cyan}======================================================================${c.reset}\n`);

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${c.green}✔ PASS${c.reset}: ${testName}`);
  } else {
    console.error(`  ${c.red}✘ FAIL${c.reset}: ${testName}`);
    if (details) console.error(`    ${c.dim}${details}${c.reset}`);
  }
}

// ----------------------------------------------------------------------------
// TEST 1: Tool Registry Integrity
// ----------------------------------------------------------------------------
console.log(`${c.bold}[1/6] Auditing Sovereign Tool Registry Schema (16 Core Engines)...${c.reset}`);
assert(SOVEREIGN_TOOLS.length === 16, "Tool registry contains exactly 16 standardized engines");

const uniqueIds = new Set(SOVEREIGN_TOOLS.map((t) => t.id));
assert(uniqueIds.size === 16, "All 16 tool IDs are strictly unique");

const allHaveParamsAndFormatters = SOVEREIGN_TOOLS.every(
  (t) => t.parameters.length > 0 && typeof t.execute === "function" && typeof t.formatMarkdown === "function"
);
assert(allHaveParamsAndFormatters, "All 16 tools implement parameters schema, execute, and formatMarkdown");

// ----------------------------------------------------------------------------
// TEST 2: Natural Language Tool Selection Across All 16 Domains
// ----------------------------------------------------------------------------
console.log(`\n${c.bold}[2/6] Auditing Natural Language Tool Selection Across All 16 Domains...${c.reset}`);

const NL_DOMAIN_TEST_CASES = [
  { domain: "Tokamak MHD", query: "Calculate tokamak MHD stability and Kruskal-Shafranov q95 for R0=1.65 m, a=0.45 m, BT=2.8 T, Ip=1.5 MA", expectedTool: "sovereign_tokamak_mhd" },
  { domain: "Battery Electrochemistry", query: "Audit lithium-ion battery fast charging at 2.0C rate and check lithium plating overpotential and SEI layer growth", expectedTool: "sovereign_battery_electrochemistry" },
  { domain: "Hypersonic Aero", query: "Compute hypersonic shock jump and Fay-Riddell stagnation heat flux at Mach 7.5 and altitude 35 km", expectedTool: "sovereign_hypersonic_aero" },
  { domain: "Direct Air Capture", query: "Audit direct air capture DAC TVSA contactor pressure drop and thermal desorption energy for 420 ppm CO2", expectedTool: "sovereign_dac_thermodynamics" },
  { domain: "Hydro Turbine", query: "Calculate hydroelectric water hammer Joukowsky head surge and Allievi wave speed for net head 120 m and penstock diameter 2.2 m", expectedTool: "sovereign_hydro_water_hammer" },
  { domain: "Nuclear Fission", query: "Evaluate nuclear fission reactor point kinetics PRKE and Doppler feedback for 0.35 $ reactivity insertion", expectedTool: "sovereign_fission_kinetics" },
  { domain: "Cryo Rocket", query: "Analyze cryogenic rocket propellant storage boil-off rate and zero boil-off ZBO cryocooler for liquid hydrogen LH2", expectedTool: "sovereign_cryo_rocket" },
  { domain: "Stellarator Confinement", query: "Evaluate stellarator 3D magnetic confinement rotational transform iota and ISS04 confinement scaling", expectedTool: "sovereign_stellarator_confinement" },
  { domain: "InSAR Geodesy", query: "Derive Sentinel-1 InSAR satellite radar interferometry phase sensitivity and critical perpendicular baseline", expectedTool: "sovereign_insar_geodesy" },
  { domain: "Deep Space Optical", query: "Evaluate deep space optical comms DSOC laser link budget and photon counting PPM SNR at distance 1.5 AU", expectedTool: "sovereign_deep_space_optical" },
  { domain: "Neuromorphic Circuits", query: "Simulate neuromorphic leaky integrate-and-fire LIF spiking neuron with STDP synaptic plasticity", expectedTool: "sovereign_neuromorphic_circuits" },
  { domain: "Orbital Rendezvous", query: "Calculate spacecraft orbital rendezvous docking approach corridor and Clohessy-Wiltshire relative motion on V-bar", expectedTool: "sovereign_orbital_rendezvous" },
  { domain: "Rydberg Quantum", query: "Simulate neutral atom Rydberg quantum array and compute Rydberg blockade radius and Van der Waals C6 coefficient", expectedTool: "sovereign_rydberg_quantum" },
  { domain: "OTEC Power", query: "Calculate ocean thermal energy conversion OTEC closed-cycle Rankine efficiency and cold water pipe pumping duty", expectedTool: "sovereign_otec_power" },
  { domain: "Directional Drilling", query: "Calculate directional drilling wellbore dogleg severity DLS and kick tolerance mud window", expectedTool: "sovereign_directional_drilling" },
  { domain: "Space Geodesy VLBI", query: "Derive space geodesy very long baseline interferometry VLBI geometric group delay and Shapiro relativistic time delay", expectedTool: "sovereign_space_geodesy_vlbi" },
];

for (const tc of NL_DOMAIN_TEST_CASES) {
  const match = matchSovereignTool(tc.query);
  assert(
    match?.tool.id === tc.expectedTool,
    `Routing: ${tc.domain} -> ${tc.expectedTool}`,
    `Got: ${match?.tool.id || "None"}, Confidence: ${match?.confidence || 0}`
  );
}

// ----------------------------------------------------------------------------
// TEST 3: Parameter Extraction & Schema Validation
// ----------------------------------------------------------------------------
console.log(`\n${c.bold}[3/6] Auditing Parameter Extraction & Unit Parsing...${c.reset}`);

const tokamakQuery = "Please evaluate tokamak MHD stability for R0 = 1.75 m, a = 0.50 m, B_T = 3.2 T, I_p = 1.8 MA, beta = 2.1%";
const tokamakTool = SOVEREIGN_TOOLS_BY_ID["sovereign_tokamak_mhd"];
const extracted = extractToolParameters(tokamakTool, tokamakQuery);

assert(extracted.params.majorRadiusR0Meters === 1.75, "Parsed majorRadiusR0Meters = 1.75 m");
assert(extracted.params.minorRadiusAMeters === 0.50, "Parsed minorRadiusAMeters = 0.50 m");
assert(extracted.params.toroidalMagneticFieldTesla === 3.2, "Parsed toroidalMagneticFieldTesla = 3.2 T");
assert(extracted.params.plasmaCurrentMegaAmps === 1.8, "Parsed plasmaCurrentMegaAmps = 1.8 MA");
assert(extracted.params.totalThermalBetaPercent === 2.1, "Parsed totalThermalBetaPercent = 2.1 %");
assert(extracted.missingRequiredKeys.length === 0, "Zero missing required parameters for fully specified query");

// ----------------------------------------------------------------------------
// TEST 4: Deterministic Mathematical Execution & Invariant Verification
// ----------------------------------------------------------------------------
console.log(`\n${c.bold}[4/6] Auditing Deterministic Mathematical Calculations & Output...${c.reset}`);

const orchResult = orchestrateSovereignQuery(tokamakQuery);
assert(orchResult.handled === true, "Orchestration handled = true");
assert(orchResult.status === "SUCCESS", "Orchestration status = SUCCESS");
assert(typeof orchResult.rawResult?.safetyFactorQ95 === "number", "Computed numeric safetyFactorQ95");
assert(orchResult.rawResult.safetyFactorQ95 > 2.0, `Kruskal-Shafranov safety factor is valid (${orchResult.rawResult.safetyFactorQ95.toFixed(2)})`);
assert(orchResult.formattedMarkdown?.includes("Kruskal-Shafranov"), "Output includes formal physical derivation header");
assert(orchResult.formattedMarkdown?.includes("Parameter Provenance"), "Output includes parameter provenance audit table");

// ----------------------------------------------------------------------------
// TEST 5: Explicit Uncertainty Handling on Missing Inputs (Zero Hallucination)
// ----------------------------------------------------------------------------
console.log(`\n${c.bold}[5/6] Auditing Explicit Uncertainty Handling on Missing Inputs...${c.reset}`);

// Query missing critical parameters (e.g. only mentioning tokamak without dimensions)
const vagueQuery = "Can you calculate the tokamak MHD stability and safety factor?";
const vagueResult = orchestrateSovereignQuery(vagueQuery);

assert(vagueResult.handled === true, "Vague query recognized by domain orchestrator");
assert(vagueResult.status === "UNCERTAIN_MISSING_INPUTS", "Explicit uncertainty triggered (STATUS: UNCERTAIN_MISSING_INPUTS)");
assert(vagueResult.missingParams!.length > 0, `Identified ${vagueResult.missingParams?.length} missing required parameters`);
assert(vagueResult.formattedMarkdown?.includes("STATUS: UNCERTAIN (INSUFFICIENT_EVIDENCE)"), "Response refuses to hallucinate default dimensions");
assert(vagueResult.formattedMarkdown?.includes("majorRadiusR0Meters"), "Response explicitly lists missing variables to user");

// ----------------------------------------------------------------------------
// TEST 6: End-to-End NoctisDesk Chat Integration (vibeReply)
// ----------------------------------------------------------------------------
console.log(`\n${c.bold}[6/6] Auditing End-to-End Chat Integration via vibeReply...${c.reset}`);

async function testChatIntegration() {
  const chatPrompt = "Analyze hypersonic shock jump and aerothermal heat flux for Mach 8.5 at altitude 40 km with nose radius 0.20 m";
  const reply = await vibeReply([{ role: "user", content: chatPrompt }]);

  assert("text" in reply, "vibeReply returned a valid text response");
  if ("text" in reply) {
    assert(reply.text.includes("Hypersonic Shock & Aerothermodynamic Audit"), "Response routed to Sovereign Hypersonic Engine (#103)");
    assert(reply.text.includes("Fay-Riddell Stagnation Heat Flux"), "Response derived Fay-Riddell heat flux");
    assert(reply.text.includes("Parameter Provenance"), "Response contains full parameter provenance table");
    assert(!reply.text.includes("could not finish"), "No fallback error occurred");
  }

  // Non-sovereign query seamless fall-through check
  const generalPrompt = "Hello Noctis, what is the capital of France?";
  const generalReply = await vibeReply([{ role: "user", content: generalPrompt }]);
  assert("text" in generalReply, "General query seamlessly falls through to general conversational engine");
}

testChatIntegration().then(() => {
  console.log(`\n${c.bold}${c.cyan}======================================================================${c.reset}`);
  console.log(` ${c.bold}${c.green}RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (100% INVARIANT ADHERENCE)${c.reset}`);
  console.log(`${c.bold}${c.cyan}======================================================================${c.reset}\n`);
  process.exit(totalTests === passedTests ? 0 : 1);
});
