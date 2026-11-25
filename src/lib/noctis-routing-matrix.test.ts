import test from "node:test";
import assert from "node:assert/strict";
import {
  attachRouteStamp,
  extractMultiSlashOverrides,
  getPanelSpec,
  getSlashCommandForRouteId,
  isValidNoctisPanelId,
  NOCTIS_API_ROUTES,
  NOCTIS_PANELS,
  NOCTIS_SLASH_ROUTES,
  parseRouteStamp,
  stripLeadingSlashOverride,
  upsertRouteStampResponseId,
  type NoctisRouteEngineId,
} from "./noctis-capability-registry.ts";
import { cleanAssistantTurnForHistory } from "./noctis-followup-resolver.ts";
import {
  classifyMultiTurnIntent,
  classifyNoctisIntent,
  decisionToRouteStamp,
} from "./noctis-intent-router.server.ts";
import {
  getRoutedChatResponseById,
  listRoutedChatResponses,
  saveRoutedChatResponse,
} from "./noctis-response-store.server.ts";
import { matchSovereignTool } from "./noctis-tool-orchestrator.ts";

test("Capability registry invariants: unique IDs, valid deep links, and unique slash commands", () => {
  const panelIds = new Set(NOCTIS_PANELS.map((p) => p.id));
  assert.equal(panelIds.size, NOCTIS_PANELS.length);
  assert.ok(NOCTIS_PANELS.length >= 13);

  for (const panel of NOCTIS_PANELS) {
    assert.equal(isValidNoctisPanelId(panel.id), true);
    assert.ok(panel.deepLink.startsWith("/noctis"), `${panel.id} deepLink must start with /noctis`);
    assert.equal(getPanelSpec(panel.id).id, panel.id);
  }
  assert.equal(isValidNoctisPanelId("nonexistent_panel"), false);

  const cmdSet = new Set<string>();
  for (const route of NOCTIS_SLASH_ROUTES) {
    assert.equal(cmdSet.has(route.command), false, `Duplicate slash command: ${route.command}`);
    cmdSet.add(route.command);
    for (const alias of route.aliases) {
      assert.equal(cmdSet.has(alias), false, `Duplicate slash alias: ${alias}`);
      cmdSet.add(alias);
    }
    assert.equal(isValidNoctisPanelId(route.targetPanel), true);
  }

  const apiPaths = new Set(NOCTIS_API_ROUTES.map((r) => r.basePath));
  assert.equal(apiPaths.size, NOCTIS_API_ROUTES.length);
  assert.ok(NOCTIS_API_ROUTES.some((r) => r.basePath === "/api/v2/forge/platform-routes"));
});

test("Route stamp round-trip and strict JSON-only non-corruption invariant", () => {
  const sampleDecision = classifyNoctisIntent("Build Meridian Reefers cold-chain maritime platform");
  const stamp = decisionToRouteStamp(sampleDecision);

  const md = "## Meridian Reefers Ready\n\nLive preview prepared.";
  const stamped = attachRouteStamp(md, stamp, false);
  assert.ok(stamped.includes("<!-- noctis-route:"));
  const parsed = parseRouteStamp(stamped);
  assert.equal(parsed.cleanText, md);
  assert.equal(parsed.stamp?.routeId, "website_builder");
  assert.equal(parsed.stamp?.targetPanel, "forge");

  const jsonBody = JSON.stringify({ status: "OK", k: 6.4 });
  assert.equal(attachRouteStamp(jsonBody, stamp, false), jsonBody);
  assert.equal(attachRouteStamp('[{"id":1}]', stamp, false), '[{"id":1}]');
  assert.equal(attachRouteStamp("Plain prose", stamp, true), "Plain prose");
});

const GOLDEN_ROUTING_CASES: Array<{ name: string; prompt: string; expected: NoctisRouteEngineId }> = [
  // NASEE Autonomous Software Engineering & Enterprise Monorepo Challenge 001 / Directive 002 (1-8)
  {
    name: "NASEE Directive 002 OmniSphere with Security SOC + Python",
    prompt: "NOCTIS AUTONOMOUS SOFTWARE DEVELOPMENT — EXECUTION DIRECTIVE 002: Build OmniSphere enterprise multi-tenant web application with Security SOC, Python runtime, PostgreSQL RLS, 30 modules, and 20 screens.",
    expected: "nasee",
  },
  {
    name: "NASEE keyword trigger on software factory + acceptance gates",
    prompt: "Run NASEE autonomous software engineering agent for 30 modules and 12 acceptance gates in isolated workspace.",
    expected: "nasee",
  },
  {
    name: "Challenge 001 OmniSphere multi-tenant ecosystem with Docker + tests",
    prompt: "Design, develop, test and prepare for deployment OmniSphere enterprise multi-tenant web platform combining 30 functional modules, 110 functional screens, Security SOC, and PostgreSQL RLS.",
    expected: "nasee",
  },
  {
    name: "Development capability discovery directive",
    prompt: "Execute DEVELOPMENT CAPABILITY DISCOVERY and verify Terminal, Git, Node.js, PostgreSQL provisioning, MicroVM execution.",
    expected: "nasee",
  },
  {
    name: "NASEE mentioning NIST + SOC 2 + RBAC inside OmniSphere prompt",
    prompt: "Build OmniSphere complete enterprise-grade web application with 30 modules, 20 foundation screens, PostgreSQL RLS, RBAC, SOC dashboard, and NIST control mapping.",
    expected: "nasee",
  },
  {
    name: "NASEE mentioning weather dashboard module inside OmniSphere",
    prompt: "NOCTIS AUTONOMOUS SOFTWARE DEVELOPMENT: Build OmniSphere including weather analytics module, freight tracking, and Security SOC.",
    expected: "nasee",
  },
  {
    name: "NASEE mentioning clinical telemedicine module inside OmniSphere",
    prompt: "NOCTIS AUTONOMOUS SOFTWARE DEVELOPMENT: Build OmniSphere 30 modules and 20 screens with patient booking portal and Postgres RLS.",
    expected: "nasee",
  },
  {
    name: "Explicit NASEE Execution Directive with MicroVM test proof",
    prompt: "Execution Directive 002: generate isolated monorepo, run PostgreSQL PGlite migration and MicroVM verification.",
    expected: "nasee",
  },

  // Universal Website & Application Builder (9-20)
  {
    name: "Meridian Reefers maritime cold-chain platform (must never hit Weather or Physics)",
    prompt: "Design and build a complex dynamic global maritime cold-chain logistics and refrigerated vessel charter platform called Meridian Reefers with multi-lane port-to-port filtering, dynamic rate calculator, live slot reservation and checkout, multilingual EN/ES/FR switcher, and PostgreSQL + PostGIS tables.",
    expected: "website_builder",
  },
  {
    name: "Tourism & Safari interactive booking website",
    prompt: "Build an interactive worldwide tourism and safari booking platform with destination filters, AI trip planner, and online booking checkout.",
    expected: "website_builder",
  },
  {
    name: "Veterinary clinic portal with triage scheduler",
    prompt: "Build an interactive veterinary & animal hospital website with surgical care tiers, vaccination scheduling, and pet owner portal.",
    expected: "website_builder",
  },
  {
    name: "B2B SaaS platform with ROI calculator and SOC 2 landing",
    prompt: "Create a modern B2B analytics & workflow automation SaaS platform with interactive ROI calculator, SOC 2 trust badge, pricing tiers, and admin dashboard.",
    expected: "website_builder",
  },
  {
    name: "Fine dining tasting restaurant website",
    prompt: "Design a fine dining & culinary tasting restaurant website with seasonal menu catalog and table reservation checkout.",
    expected: "website_builder",
  },
  {
    name: "Luxury real estate marketplace portal",
    prompt: "Build a luxury real estate & property marketplace with neighborhood filtering, mortgage calculator, and private viewing booking.",
    expected: "website_builder",
  },
  {
    name: "Telemedicine booking website without acute patient vitals",
    prompt: "Create a telehealth clinic website and appointment portal with doctor profiles, insurance checker, and video visit booking.",
    expected: "website_builder",
  },
  {
    name: "Compliance portal website mentioning NIST 800-53 checklist",
    prompt: "Build a SaaS compliance portal website with interactive NIST 800-53 SSP checklist, dynamic readiness calculator, and client checkout.",
    expected: "website_builder",
  },
  {
    name: "Clean solar microgrid storefront",
    prompt: "Design and build an interactive residential solar microgrid website with kWh bill offset calculator and site survey booking.",
    expected: "website_builder",
  },
  {
    name: "Weather portal website build request (never Weather forecast)",
    prompt: "Build a responsive marine weather analytics web app and port advisory dashboard with subscription checkout and multilingual switcher.",
    expected: "website_builder",
  },
  {
    name: "Website for local coffee roastery",
    prompt: "Create a website for an artisan specialty coffee roastery storefront with roast subscription calculator.",
    expected: "website_builder",
  },
  {
    name: "E-commerce storefront with multi-currency checkout",
    prompt: "Architect a dynamic e-commerce storefront application with cart checkout, theme switcher, and product catalog filters.",
    expected: "website_builder",
  },

  // Clinical Neuro-Symbolic Safety Gate (21-28)
  {
    name: "Acute hyperkalemia with ECG changes and hypotension",
    prompt: "64yo patient presents with K+ 6.4 mEq/L, peaked T waves on ECG, and BP 88/54 mmHg. Immediate stabilization steps?",
    expected: "clinical",
  },
  {
    name: "Septic shock resuscitation (must never trigger Battery SOC)",
    prompt: "72yo male in septic shock with lactate 4.8, BP 78/46, fever 39.2C after norepinephrine titration. Next critical action?",
    expected: "clinical",
  },
  {
    name: "ARDS plateau pressure and PBW safety invariant",
    prompt: "Patient with severe ARDS on mechanical ventilation, plateau pressure 34 cmH2O, actual weight 110 kg, height 170 cm. Adjust tidal volume.",
    expected: "clinical",
  },
  {
    name: "Acute STEMI emergency triage",
    prompt: "58yo patient with crushing chest pain, ST elevations in V1-V4, troponin 2.4, HR 112. Urgent STEMI management protocol?",
    expected: "clinical",
  },
  {
    name: "Diabetic ketoacidosis insulin and potassium check",
    prompt: "24yo female presents in DKA with pH 7.12, glucose 540, K+ 3.1 mEq/L. Should we start insulin drip immediately?",
    expected: "clinical",
  },
  {
    name: "Massive PE obstructive shock triage",
    prompt: "52yo patient post-op sudden dyspnea, SpO2 84%, BP 82/50 mmHg, CT confirms massive PE. Immediate intervention?",
    expected: "clinical",
  },
  {
    name: "Anticoagulation contraindication check",
    prompt: "Assess patient medication dosing for vancomycin trough 24 with rising creatinine 2.9 and eGFR 21.",
    expected: "clinical",
  },
  {
    name: "Hyperkalemia calcium gluconate vs weather rain noise",
    prompt: "Patient walking in rain collapsed, ER labs show K+ 6.8 mEq/L, QRS widening, BP 80/48 mmHg. Resuscitation steps?",
    expected: "clinical",
  },

  // DoD / IC National Security Defense Engine (29-34)
  {
    name: "DoDI 8510.01 & CNSSI 1253 reciprocity assessment",
    prompt: "Analyze DoDI 8510.01 authorization reciprocity and CNSSI 1253 security control overlays for a DoD IL5 mission system.",
    expected: "dod_ic",
  },
  {
    name: "ICD 503 & SIPR/JWICS cross-domain guard",
    prompt: "Evaluate ICD 503 Risk Management Framework and NCDSMO cross-domain guard controls between SIPR and JWICS enclaves.",
    expected: "dod_ic",
  },
  {
    name: "DISA CCI mapping with STIG verification",
    prompt: "Map CCI-000213 and DISA CCIs for eMASS package submission under ICD 705 SCIF accreditation.",
    expected: "dod_ic",
  },
  {
    name: "CNSA 2.0 & TEMPEST red/black separation",
    prompt: "Review CNSA 2.0 ML-KEM transition requirements and CNSSAM TEMPEST red/black isolation.",
    expected: "dod_ic",
  },
  {
    name: "OMB M-22-09 & CISA ZTMM DoD Zero Trust pillars",
    prompt: "Assess DoD Zero Trust 7 pillars against CISA ZTMM FY 2027 targets and OMB M-22-09 mandates.",
    expected: "dod_ic",
  },
  {
    name: "Classified marking fail-closed check",
    prompt: "TS/SCI compartmented JWICS telemetry payload routing check under NDIMP policy boundary.",
    expected: "dod_ic",
  },

  // RMF v2.0 & NIST 800-53 GRC (35-41)
  {
    name: "NIST SP 800-53 Rev 5 control family audit",
    prompt: "Evaluate NIST 800-53 Rev 5 AC-2 and AU-6 compliance controls for our FedRAMP Moderate ATO package.",
    expected: "rmf_grc",
  },
  {
    name: "RMF POA&M SLA remediation check",
    prompt: "Review open POA&M weaknesses for High-impact FIPS 199 boundary and prepare ISSO ATO readiness brief.",
    expected: "rmf_grc",
  },
  {
    name: "Security SOC analyst asking NIST 800-53 AU-6 / SI-4 (never Battery SOC)",
    prompt: "As our Security SOC analyst, verify NIST 800-53 AU-6 and SI-4 continuous monitoring SLA compliance for the SSP.",
    expected: "rmf_grc",
  },
  {
    name: "OSCAL & CMMC Level 2 assessment",
    prompt: "Validate NIST 800-171 CMMC Level 2 gap assessment and export OSCAL System Security Plan baseline.",
    expected: "rmf_grc",
  },
  {
    name: "FedRAMP 3PAO readiness check",
    prompt: "What evidence does a 3PAO require for FedRAMP SC-7 and CM-6 control baseline validation?",
    expected: "rmf_grc",
  },
  {
    name: "NIST 800-37 & FISMA RMF lifecycle",
    prompt: "Explain RMF step transitions in NIST 800-37 for FISMA continuous authorization (cATO).",
    expected: "rmf_grc",
  },
  {
    name: "SOC 2 & NIST CSF 2.0 control mapping query",
    prompt: "Map our DISA STIG remediation evidence into NIST 800-53 control baseline and POA&M tracker.",
    expected: "rmf_grc",
  },

  // CVE & Cybersecurity Lab (42-46)
  {
    name: "CVE-2024-3094 XZ Utils lookup",
    prompt: "Provide full severity, affected versions, and remediation steps for CVE-2024-3094.",
    expected: "cve_cyber",
  },
  {
    name: "CVE-2021-44228 Log4Shell analysis",
    prompt: "Check CISA KEV status and mitigation guidance for CVE-2021-44228.",
    expected: "cve_cyber",
  },
  {
    name: "OWASP Top 10 SSRF & SQLi remediation",
    prompt: "Audit this API flow for OWASP Top 10 SSRF and SQL injection risk and provide remediation.",
    expected: "cve_cyber",
  },
  {
    name: "JWT alg=none audit gadget",
    prompt: "Decode JWT signature and audit for jwt alg=none vulnerability.",
    expected: "cve_cyber",
  },
  {
    name: "CIDR & HTTP security header audit",
    prompt: "Audit HTTP security headers and CIDR subnet mask for 10.20.4.0/22.",
    expected: "cve_cyber",
  },

  // Sovereign Physics #101-#116 (47-53)
  {
    name: "Battery electrochemistry lithium plating & 4C rate",
    prompt: "Calculate Butler-Volmer exchange current density and lithium plating onset for a battery at 4.0C charge rate, SoC 0.85, and -5°C.",
    expected: "sovereign_physics",
  },
  {
    name: "Tokamak MHD safety factor q95 & Troyon beta",
    prompt: "Evaluate tokamak MHD Kruskal-Shafranov safety factor q95 and Troyon beta with R0=6.2m, a=2.0m, Bt=5.3T, Ip=15MA.",
    expected: "sovereign_physics",
  },
  {
    name: "Hypersonic Fay-Riddell stagnation heating",
    prompt: "Calculate hypersonic Fay-Riddell stagnation heat flux at Mach 12, altitude 40 km, and nose radius R_n=0.15m.",
    expected: "sovereign_physics",
  },
  {
    name: "Direct air capture TVSA thermodynamics",
    prompt: "Size a direct air capture TVSA sorbent air contactor at 420 ppm CO2 and calculate Darcy-Forchheimer pressure drop.",
    expected: "sovereign_physics",
  },
  {
    name: "Nuclear fission reactor point kinetics",
    prompt: "Evaluate nuclear reactor point kinetics k_eff, Doppler feedback, and prompt critical margin for reactivity 0.65 $.",
    expected: "sovereign_physics",
  },
  {
    name: "Cryogenic LH2 zero boil-off storage",
    prompt: "Compute cryogenic rocket propellant LH2 boil-off rate and ZBO cryocooler power with 45 MLI layers.",
    expected: "sovereign_physics",
  },
  {
    name: "InSAR Sentinel-1 perpendicular baseline geodesy",
    prompt: "Calculate InSAR satellite radar interferometry critical baseline for Sentinel-1 C-band wavelength 5.55 cm and B_perp 85m.",
    expected: "sovereign_physics",
  },

  // Weather Global NWP (54-57)
  {
    name: "Laurel Maryland rain question",
    prompt: "Will it rain tomorrow in Laurel, Maryland?",
    expected: "weather",
  },
  {
    name: "Tokyo 7-day weather forecast",
    prompt: "Give me the 7-day weather forecast and temperature outlook for Tokyo, Japan.",
    expected: "weather",
  },
  {
    name: "Global multi-continent weather outlook",
    prompt: "Show today's global weather forecast and rainfall risk around the world.",
    expected: "weather",
  },
  {
    name: "Weekend thunderstorm & humidity forecast",
    prompt: "What is the thunderstorm and humidity forecast for London this weekend?",
    expected: "weather",
  },

  // Science, NDKRS Rules, Enterprise, NUPS, Catalog260, Assistant, General Chat (58-66)
  {
    name: "Schwarzschild event horizon radius",
    prompt: "Calculate the Schwarzschild event horizon radius for a 10 solar mass black hole.",
    expected: "science",
  },
  {
    name: "NDKRS explicit rule CLIN-ANION-GAP",
    prompt: "Execute CLIN-ANION-GAP deterministic verification rule for Na=140, Cl=102, HCO3=14.",
    expected: "ndkrs_rule",
  },
  {
    name: "Enterprise Intelligence Tests 046/047 query",
    prompt: "Show Noctis Enterprise Command Center status for Test 046 and Auth Digital Twin.",
    expected: "enterprise",
  },
  {
    name: "NUPS 40-Engine Master Matrix query",
    prompt: "Run NUPS Noctis Universal Problem Solver cross-domain fact-lock matrix check.",
    expected: "nups",
  },
  {
    name: "Catalog 260 dependability suite audit",
    prompt: "Audit Catalog 260 capabilities and Dependability Suite #251-#260 readiness.",
    expected: "catalog260",
  },
  {
    name: "Universal Assistant v1.0 100-capability check",
    prompt: "Inspect Universal Assistant v1.0 100-capability parity and benchmark status.",
    expected: "assistant",
  },
  {
    name: "General software architecture Q&A (never hijacked by Website Builder or Weather)",
    prompt: "Compare PostgreSQL row-level security policies vs schema-per-tenant isolation for multi-tenant SaaS tradeoffs.",
    expected: "general_chat",
  },
  {
    name: "General conversational greeting",
    prompt: "Hello Noctis, summarize how your specialized engines are organized.",
    expected: "general_chat",
  },
  {
    name: "Algorithmic coding question (never hijacked by Website Builder)",
    prompt: "Write a clean binary search function in Python with iterative bounds handling.",
    expected: "general_chat",
  },
];

test(`Golden & adversarial routing matrix (${GOLDEN_ROUTING_CASES.length} prompts) dispatches deterministically`, () => {
  assert.ok(GOLDEN_ROUTING_CASES.length >= 65);
  for (const tc of GOLDEN_ROUTING_CASES) {
    const decision = classifyNoctisIntent(tc.prompt);
    assert.equal(
      decision.routeId,
      tc.expected,
      `[${tc.name}] expected "${tc.expected}", got "${decision.routeId}" (scores=${JSON.stringify(decision.scores)}, vetoes=${JSON.stringify(decision.vetoedRoutes)})`,
    );
    assert.equal(decision.override, false);
  }
});

test("Explicit /command overrides force exact engine with confidence=100 and strip prefix", () => {
  const cases: Array<{ input: string; expectedRoute: NoctisRouteEngineId; expectedStripped: string }> = [
    { input: "/nasee Build Meridian Reefers", expectedRoute: "nasee", expectedStripped: "Build Meridian Reefers" },
    { input: "/build Dental clinic portal", expectedRoute: "website_builder", expectedStripped: "Dental clinic portal" },
    { input: "/site Dental clinic portal", expectedRoute: "website_builder", expectedStripped: "Dental clinic portal" },
    { input: "/clinical 50yo fever and low BP", expectedRoute: "clinical", expectedStripped: "50yo fever and low BP" },
    { input: "/rmf Review AC-2 control family", expectedRoute: "rmf_grc", expectedStripped: "Review AC-2 control family" },
    { input: "/dod Check SIPR boundary", expectedRoute: "dod_ic", expectedStripped: "Check SIPR boundary" },
    { input: "/cyber CVE-2024-3094 summary", expectedRoute: "cve_cyber", expectedStripped: "CVE-2024-3094 summary" },
    { input: "/cve CVE-2024-3094 summary", expectedRoute: "cve_cyber", expectedStripped: "CVE-2024-3094 summary" },
    { input: "/weather Laurel, MD", expectedRoute: "weather", expectedStripped: "Laurel, MD" },
    { input: "/enterprise Show Test 046 status", expectedRoute: "enterprise", expectedStripped: "Show Test 046 status" },
    { input: "/nups Run 40-engine check", expectedRoute: "nups", expectedStripped: "Run 40-engine check" },
    { input: "/catalog Inspect 260 suite", expectedRoute: "catalog260", expectedStripped: "Inspect 260 suite" },
    { input: "/assistant Check 100-task parity", expectedRoute: "assistant", expectedStripped: "Check 100-task parity" },
    { input: "/physics Lithium plating at 4C SoC 0.8 -5C", expectedRoute: "sovereign_physics", expectedStripped: "Lithium plating at 4C SoC 0.8 -5C" },
    { input: "/science Schwarzschild 5 solar masses", expectedRoute: "science", expectedStripped: "Schwarzschild 5 solar masses" },
    { input: "/ndkrs CLIN-ANION-GAP", expectedRoute: "ndkrs_rule", expectedStripped: "CLIN-ANION-GAP" },
    { input: "/chat Build a quick mental model of OmniSphere", expectedRoute: "general_chat", expectedStripped: "Build a quick mental model of OmniSphere" },
  ];

  for (const tc of cases) {
    const slash = stripLeadingSlashOverride(tc.input);
    assert.equal(slash.routeId, tc.expectedRoute, `stripLeadingSlashOverride failed for ${tc.input}`);
    assert.equal(slash.strippedPrompt, tc.expectedStripped);

    const decision = classifyNoctisIntent(tc.input);
    assert.equal(decision.override, true);
    assert.equal(decision.confidence, 100);
    assert.equal(decision.routeId, tc.expectedRoute);
    assert.equal(decision.effectivePrompt, tc.expectedStripped);
  }
});

test("matchSovereignTool rejects Security SOC, clinical shock, and maritime cold-chain false positives", () => {
  assert.equal(
    matchSovereignTool("Build OmniSphere with Security SOC, RBAC, and Python runtime"),
    null,
  );
  assert.equal(
    matchSovereignTool("Review NIST 800-53 AU-6 logs with our Security SOC analyst"),
    null,
  );
  assert.equal(
    matchSovereignTool("68yo patient in septic shock with K+ 6.2 and hypotension"),
    null,
  );
  assert.equal(
    matchSovereignTool("Design Meridian Reefers cold-chain maritime vessel docking platform"),
    null,
  );

  // Legitimate physics queries must still match accurately
  const battery = matchSovereignTool("Calculate lithium plating at 4C rate, SoC 0.85, -5°C temperature");
  assert.equal(battery?.tool.id, "sovereign_battery_electrochemistry");

  const tokamak = matchSovereignTool("Evaluate tokamak MHD q95 with R0=6.2m a=2.0m Bt=5.3T Ip=15MA");
  assert.equal(tokamak?.tool.id, "sovereign_tokamak_mhd");

  const hypersonic = matchSovereignTool("Compute hypersonic Fay-Riddell heat flux at Mach 12 altitude 40 km R_n=0.15m");
  assert.equal(hypersonic?.tool.id, "sovereign_hypersonic_aero");

  // Bare acronyms SAR + DAC in compliance prompt must never match InSAR #109 or Direct Air Capture #104
  assert.equal(
    matchSovereignTool(
      "Compare SAR suspicious activity reporting and DAC discretionary access control enforcement under NIST 800-53 AC-3 and AU-6",
    ),
    null,
  );
  assert.equal(
    classifyNoctisIntent(
      "Compare SAR suspicious activity reporting and DAC discretionary access control enforcement under NIST 800-53 AC-3 and AU-6",
    ).routeId,
    "rmf_grc",
  );
  // DoD/IC priority over standalone CVE lookup
  assert.equal(
    classifyNoctisIntent(
      "Assess CVE-2024-3094 impact under DoDI 8510.01 and ICD 503 cross-domain guard rules between NIPR and SIPR",
    ).routeId,
    "dod_ic",
  );
  assert.equal(getSlashCommandForRouteId("rmf_grc"), "/rmf");
  assert.equal(getSlashCommandForRouteId("weather"), "/weather");
  assert.equal(getSlashCommandForRouteId("/site"), "/build");
});

test("Multi-turn intent router isolates cross-domain whiplash and carries contextual follow-ups cleanly", () => {
  // Chain A: Clinical -> Weather -> Website Builder (no bleed)
  const clinStamp = attachRouteStamp("Administer IV calcium gluconate.", {
    routeId: "clinical",
    label: "Clinical · Neuro-Symbolic",
    confidence: 96,
    override: false,
    targetPanel: "frontier",
  });
  const wxStamp = attachRouteStamp("Tomorrow in Accra: dry and sunny.", {
    routeId: "weather",
    label: "Weather · Global NWP",
    confidence: 87,
    override: false,
    targetPanel: "chat",
  });

  const turn2Wx = classifyMultiTurnIntent([
    { role: "user", content: "64yo patient with K+ 6.4 mEq/L, peaked T waves, BP 88/54." },
    { role: "assistant", content: clinStamp },
    { role: "user", content: "Will it rain tomorrow in Accra, Ghana?" },
  ]);
  assert.equal(turn2Wx.routeId, "weather");

  const turn3Site = classifyMultiTurnIntent([
    { role: "user", content: "64yo patient with K+ 6.4 mEq/L, peaked T waves, BP 88/54." },
    { role: "assistant", content: clinStamp },
    { role: "user", content: "Will it rain tomorrow in Accra, Ghana?" },
    { role: "assistant", content: wxStamp },
    { role: "user", content: "Build a boutique dental clinic website with online appointment booking and treatment estimator." },
  ]);
  assert.equal(turn3Site.routeId, "website_builder");

  // Chain B: Website refinement carries website_builder, then topic shift moves to RMF
  const siteStamp = attachRouteStamp("Generated Meridian Reefers site.", {
    routeId: "website_builder",
    label: "Forge · Website & App Builder",
    confidence: 91,
    override: false,
    targetPanel: "forge",
  });
  const siteRefine = classifyMultiTurnIntent([
    { role: "user", content: "Build Meridian Reefers cold-chain maritime platform" },
    { role: "assistant", content: siteStamp },
    { role: "user", content: "Switch it to dark mode and add French localization" },
  ]);
  assert.equal(siteRefine.routeId, "website_builder");

  const switchToRmf = classifyMultiTurnIntent([
    { role: "user", content: "Build Meridian Reefers cold-chain maritime platform" },
    { role: "assistant", content: siteStamp },
    { role: "user", content: "Switch it to dark mode and add French localization" },
    { role: "assistant", content: siteStamp },
    { role: "user", content: "Now evaluate NIST 800-53 AC-2 control readiness" },
  ]);
  assert.equal(switchToRmf.routeId, "rmf_grc");

  // Chain C: Same-patient clinical follow-up stays clinical, weather follow-up ("What about Sunday?") stays weather
  const clinFollow = classifyMultiTurnIntent([
    { role: "user", content: "64yo patient with K+ 6.4 mEq/L, peaked T waves, BP 88/54." },
    { role: "assistant", content: clinStamp },
    { role: "user", content: "What if creatinine rises to 3.4 or we hold insulin?" },
  ]);
  assert.equal(clinFollow.routeId, "clinical");

  const wxFollow = classifyMultiTurnIntent([
    { role: "user", content: "Will it rain tomorrow in Accra, Ghana?" },
    { role: "assistant", content: wxStamp },
    { role: "user", content: "What about Sunday?" },
  ]);
  assert.equal(wxFollow.routeId, "weather");

  // History cleaner strips route stamp comments
  assert.equal(cleanAssistantTurnForHistory(clinStamp).includes("noctis-route"), false);
});

test("Routed response store persists, searches, retrieves by ID, and redacts fail-closed blocks", async () => {
  const savedWx = await saveRoutedChatResponse({
    routeId: "weather",
    routeLabel: "Weather · Global NWP",
    targetPanel: "chat",
    confidence: 100,
    override: true,
    command: "/weather",
    prompt: "UniqueTestCity Laurel MD rain check",
    rawText: "<think>trace</think>\n## Weather Forecast for Laurel\nLow rain chance (5%).",
    latencyMs: 120,
  });
  assert.ok(savedWx.id.startsWith("RSP-"));
  const updated = upsertRouteStampResponseId(
    attachRouteStamp("## Weather Forecast", {
      routeId: "weather",
      label: "Weather · Global NWP",
      confidence: 100,
      override: true,
      targetPanel: "chat",
    }),
    savedWx.id,
  );
  assert.equal(parseRouteStamp(updated).stamp?.responseId, savedWx.id);

  const fetched = await getRoutedChatResponseById(savedWx.id);
  assert.equal(fetched?.id, savedWx.id);
  assert.equal(fetched?.routeId, "weather");
  assert.equal(fetched?.responseText.includes("<think>"), false);

  const searched = await listRoutedChatResponses({ engine: "weather", q: "UniqueTestCity", limit: 10 });
  assert.ok(searched.some((item) => item.id === savedWx.id));

  // Fail-closed security invariant: never persist classified prompt text
  const redacted = await saveRoutedChatResponse({
    routeId: "dod_ic",
    routeLabel: "NDIMP · DoD / IC Defense",
    targetPanel: "dod-ic",
    confidence: 95,
    override: false,
    prompt: "TOP SECRET // SI // JWICS secret payload",
    rawText: "FAIL_CLOSED_BLOCK: Classified data blocked from commercial cloud.",
    latencyMs: 12,
  });
  assert.equal(redacted.prompt.includes("TOP SECRET"), false);
  assert.equal(redacted.prompt, "[REDACTED — Classification Boundary Gate]");
});

test("Global & Universe Bundle (/space, /earth, /nav) routes accurately with zero cross-domain collisions", () => {
  const spaceCases = [
    "Where is the ISS right now and what is the current NOAA SWPC Kp geomagnetic storm index?",
    "Calculate Hohmann transfer delta-v from 400 km LEO to 35786 km GEO orbit",
    "Estimate kinetic impact energy in megatons TNT for a 150m asteroid at 22 km/s and check NASA NEO close approaches",
    "Compute exoplanet habitable zone bounds for a star with 2.5 solar luminosities",
  ];
  for (const p of spaceCases) {
    assert.equal(classifyNoctisIntent(p).routeId, "space_universe", `Failed space routing: ${p}`);
  }

  const earthCases = [
    "Show live USGS earthquakes M4.5+ and NASA EONET active wildfires",
    "Check current US AQI, PM2.5, and wildfire smoke risk in Accra, Ghana",
    "Calculate tsunami wave speed and ETA across 1500 km at 4000m ocean depth and M7.8 seismic moment energy",
  ];
  for (const p of earthCases) {
    assert.equal(classifyNoctisIntent(p).routeId, "earth_hazards", `Failed earth routing: ${p}`);
  }

  const navCases = [
    "Fetch live METAR for KJFK and compute runway 31L crosswind and density altitude",
    "Calculate great-circle distance and jet flight time from KJFK to EGLL",
    "Evaluate orthodromic maritime route distance from Port of Rotterdam to Port of Singapore via Suez Canal",
  ];
  for (const p of navCases) {
    assert.equal(classifyNoctisIntent(p).routeId, "global_nav", `Failed nav routing: ${p}`);
  }

  // Strict non-regression collision guards
  assert.equal(
    classifyNoctisIntent("Calculate orbital rendezvous Clohessy-Wiltshire V-bar docking at 400 km altitude with 0.08 m/s closing velocity").routeId,
    "sovereign_physics",
  );
  assert.equal(
    classifyNoctisIntent("Compute InSAR Sentinel-1 critical baseline for 5.55 cm C-band and B_perp 85m").routeId,
    "sovereign_physics",
  );
  assert.equal(
    classifyNoctisIntent("Calculate the Schwarzschild event horizon radius for a 10 solar mass black hole").routeId,
    "science",
  );
  assert.equal(
    classifyNoctisIntent("Will it rain tomorrow in Laurel, Maryland?").routeId,
    "weather",
  );
  assert.equal(
    classifyNoctisIntent("Design and build Meridian Reefers global maritime cold-chain logistics and refrigerated vessel charter platform with live slot reservation and PostgreSQL tables").routeId,
    "website_builder",
  );
  assert.equal(
    classifyNoctisIntent("64yo asthmatic patient exposed to wildfire smoke presents with SpO2 85% and BP 88/54 mmHg. Immediate stabilization?").routeId,
    "clinical",
  );

  // Explicit slash overrides
  for (const [cmd, expected] of [
    ["/space Kp index", "space_universe"],
    ["/astro NEO list", "space_universe"],
    ["/iss track", "space_universe"],
    ["/earth quakes", "earth_hazards"],
    ["/aqi Accra", "earth_hazards"],
    ["/nav KJFK", "global_nav"],
    ["/metar EGLL", "global_nav"],
    ["/flight KJFK to EGLL", "global_nav"],
  ] as const) {
    const d = classifyNoctisIntent(cmd);
    assert.equal(d.override, true);
    assert.equal(d.routeId, expected, `Override ${cmd} expected ${expected}`);
  }
});

test("Multi-slash batch parser splits multi-command prompts cleanly with zero false positives", () => {
  const threeBatch = [
    "/space Live ISS position, NOAA Kp geomagnetic index, and Hohmann transfer from 400 km LEO to 35786 km GEO",
    "",
    "/earth Live USGS earthquakes M4.5+, NASA active wildfires, and air quality in Accra, Ghana",
    "",
    "/nav Live METAR for KJFK with runway 31L crosswind and great-circle flight distance from KJFK to EGLL",
  ].join("\n");

  const segs = extractMultiSlashOverrides(threeBatch);
  assert.equal(segs.length, 3);
  assert.deepEqual(
    segs.map((s) => s.routeId),
    ["space_universe", "earth_hazards", "global_nav"],
  );
  assert.ok(segs[0]!.prompt.includes("Hohmann transfer"));
  assert.ok(segs[1]!.prompt.includes("Accra, Ghana"));
  assert.ok(segs[2]!.prompt.includes("KJFK to EGLL"));

  const decision = classifyNoctisIntent(threeBatch);
  assert.equal(decision.override, true);
  assert.equal(decision.label, "Multi-Route · /space + /earth + /nav");
  assert.equal(decision.targetPanel, "chat");

  // Bare first command followed by explicit /earth and /nav
  const bareFirst = threeBatch.replace(/^\/space/, "space");
  const bareSegs = extractMultiSlashOverrides(bareFirst);
  assert.equal(bareSegs.length, 3);
  assert.deepEqual(
    bareSegs.map((s) => s.routeId),
    ["space_universe", "earth_hazards", "global_nav"],
  );

  // Bulleted slash commands
  const bulleted = [
    "- /space Live ISS position and Kp index",
    "- /earth Live USGS earthquakes M4.5+",
    "- /nav Live METAR for KJFK",
  ].join("\n");
  assert.deepEqual(
    extractMultiSlashOverrides(bulleted).map((s) => s.routeId),
    ["space_universe", "earth_hazards", "global_nav"],
  );

  // Single slash command stays single-override (returns [])
  assert.deepEqual(extractMultiSlashOverrides("/space Live ISS position"), []);

  // File paths, regular prose, and code blocks must return []
  assert.deepEqual(
    extractMultiSlashOverrides("Inspect /api/v2/forge and /etc/passwd before deploying"),
    [],
  );
  assert.deepEqual(
    extractMultiSlashOverrides("```bash\n/space test\n/earth test\n```"),
    [],
  );
});

test("Noctis Architect (NOCTIS-ARCH-001) routes cleanly as first-class engine with strict collision guards", () => {
  const archNaturalPrompts = [
    "Design a single-storey 3-bedroom house on a 15m x 30m sloping site with 2 baths and Ghana Building Code GS 1207",
    "Run NOCTIS ARCHITECTURAL VALIDATION CHALLENGE ARCH-AT-11 through ARCH-AT-15 with Shared IFC 4.3 and buildingSMART IDS",
    "Enlarge bedroom 2 from 12x12 to 14x14 and recalculate joist span and door/window schedule",
    "Design a 4-bedroom villa in Accra with rainfall drainage and seismic shear walls",
  ];
  for (const p of archNaturalPrompts) {
    const d = classifyNoctisIntent(p);
    assert.equal(d.routeId, "architect", `Expected architect for: ${p}, got ${d.routeId}`);
  }

  // Explicit slash overrides
  for (const cmd of ["/architect 4BR family home", "/arch 3BR villa", "/bim IFC 4.3 house", "/house 15x30 plot"]) {
    const d = classifyNoctisIntent(cmd);
    assert.equal(d.override, true);
    assert.equal(d.routeId, "architect", `Expected override architect for ${cmd}`);
  }

  // Multi-slash batch combining /architect and /earth
  const archEarthBatch = "/architect 3BR house in Accra\n\n/earth Air quality in Accra, Ghana";
  assert.deepEqual(
    extractMultiSlashOverrides(archEarthBatch).map((s) => s.routeId),
    ["architect", "earth_hazards"],
  );
  assert.equal(classifyNoctisIntent(archEarthBatch).label, "Multi-Route · /architect + /earth");

  // Multi-turn carryover stays on architect
  const archStamp = attachRouteStamp("Generated NOCTIS-ARCH-001 Shared IFC 4.3 residential plan.", {
    routeId: "architect",
    label: "Architect · BIM & CAD",
    confidence: 100,
    override: true,
    command: "/architect",
    targetPanel: "chat",
  });
  const archFollowUp = classifyMultiTurnIntent([
    { role: "user", content: "/architect 4BR family house" },
    { role: "assistant", content: archStamp },
    { role: "user", content: "What if we enlarge Bedroom 2 to 14x14?" },
  ]);
  assert.equal(archFollowUp.routeId, "architect");

  // Strict non-regression collision guards
  assert.equal(
    classifyNoctisIntent("Build a luxury villa real-estate website with interactive floor plan viewer and booking checkout").routeId,
    "website_builder",
  );
  assert.notEqual(
    classifyNoctisIntent("Design a data warehouse schema and in-house ETL pipeline").routeId,
    "architect",
  );
  assert.equal(
    classifyNoctisIntent("67yo male patient 4 days after flight, HR 126, BP 92/64, SpO2 88% — prioritize stabilization").routeId,
    "clinical",
  );
});

test("Promoted 8-engine bundle (/legal, /invest, /auto, /bible, /energy, /career, /research, /omni) routes accurately with zero collisions", () => {
  const naturalCases: Array<[string, NoctisRouteEngineId]> = [
    ["Analyze federal government contract breach remedies under FAR Part 49", "legal"],
    ["Evaluate cross-border conflict-of-laws regulatory harmonization for GDPR vs HIPAA (NOCTIS-LEX-001)", "legal"],
    ["Operating cash flow fell while receivables and DSO surged — check working capital divergence", "invest"],
    ["Build a DCF valuation model with WACC and EV/EBITDA sensitivity for this 10-K filing", "invest"],
    ["Diagnose OBD-II P0302 cylinder misfire under load with LTFT +18% fuel trim", "automotive"],
    ["Prepare a sermon on Ephesians 2:1-10 and exegesis of Romans 8", "bible"],
    ["Prepare a structured Bible study on Psalm 23", "bible"],
    ["Evaluate BESS thermal runaway at 58 C under NFPA 855 and IEEE 1547 anti-islanding", "energy_grid"],
    ["How do I become a nurse?", "career"],
    ["Run Noctis Research Intelligence Controller claim-level evidence ledger audit (NOCTIS-RIC-001)", "deep_research"],
    ["Evaluate quantum surface code error correction syndrome extraction threshold", "omni_solver"],
    ["Calculate ASCE 7 seismic base shear for reinforced concrete building", "omni_solver"],
    ["Evaluate Sabine RT60 architectural acoustics and Schroeder frequency", "omni_solver"],
    ["Compute Manning open channel flow roughness and Froude number", "omni_solver"],
  ];

  for (const [prompt, expected] of naturalCases) {
    const d = classifyNoctisIntent(prompt);
    assert.equal(d.routeId, expected, `Expected ${expected} for "${prompt}", got ${d.routeId}`);
  }

  for (const [cmd, expected] of [
    ["/legal FAR Part 49", "legal"],
    ["/law breach of contract", "legal"],
    ["/lex GDPR vs HIPAA", "legal"],
    ["/invest DCF WACC", "invest"],
    ["/finance working capital", "invest"],
    ["/auto P0302 misfire", "automotive"],
    ["/obd fuel trim LTFT", "automotive"],
    ["/bible Romans 8", "bible"],
    ["/scripture Psalm 23", "bible"],
    ["/energy BESS NFPA 855", "energy_grid"],
    ["/bess thermal runaway", "energy_grid"],
    ["/career electrician", "career"],
    ["/research evidence ledger", "deep_research"],
    ["/ric disputed claim", "deep_research"],
    ["/omni surface code quantum error correction", "omni_solver"],
    ["/stem ASCE 7 seismic base shear", "omni_solver"],
  ] as const) {
    const d = classifyNoctisIntent(cmd);
    assert.equal(d.override, true);
    assert.equal(d.routeId, expected, `Override ${cmd} expected ${expected}`);
  }

  const multiBatch = "/legal FAR Part 49 breach\n\n/invest DCF valuation\n\n/omni surface code quantum error correction";
  assert.deepEqual(
    extractMultiSlashOverrides(multiBatch).map((s) => s.routeId),
    ["legal", "invest", "omni_solver"],
  );
  assert.equal(classifyNoctisIntent(multiBatch).label, "Multi-Route · /legal + /invest + /omni");

  // Strict collision guards
  assert.equal(
    classifyNoctisIntent("Design and build an interactive residential solar microgrid website with kWh bill offset calculator and site survey booking").routeId,
    "website_builder",
  );
  assert.equal(
    classifyNoctisIntent("Calculate Butler-Volmer exchange current density and lithium plating onset for a battery at 4.0C charge rate, SoC 0.85, and -5°C").routeId,
    "sovereign_physics",
  );
  assert.equal(
    classifyNoctisIntent("Patient has chest pain, fever 39.2C, BP 80/50 mmHg, K+ 6.4 mEq/L").routeId,
    "clinical",
  );
  assert.equal(
    classifyNoctisIntent("Compare PostgreSQL row-level security policies vs schema-per-tenant isolation for multi-tenant SaaS tradeoffs").routeId,
    "general_chat",
  );
});
