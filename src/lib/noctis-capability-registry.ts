/**
 * Noctis Platform Capability, Panel, Slash-Command & API Route Registry
 *
 * Single source of truth used by:
 * - Client navigation (`NoctisDesk`, `NoctisCommandPalette`) for URL deep links & Cmd/Ctrl+K
 * - Server unified intent router (`noctis-intent-router.server.ts`) for `/command` overrides & route stamps
 * - Forge platform routes API (`GET /api/v2/forge/platform-routes`) for live introspection
 *
 * IMPORTANT: Uses pure TypeScript and no `@/` path aliases so it runs identically under
 * Vite SSR, browser bundles, and `node --experimental-strip-types --test`.
 */

export type NoctisPanelId =
  | "chat"
  | "study"
  | "forge"
  | "plugins"
  | "console"
  | "redteam"
  | "frontier"
  | "training"
  | "rmf"
  | "dod-ic"
  | "enterprise"
  | "ndkrs"
  | "assistant";

export type NoctisRouteEngineId =
  | "nasee"
  | "website_builder"
  | "clinical"
  | "dod_ic"
  | "rmf_grc"
  | "cve_cyber"
  | "enterprise"
  | "nups"
  | "catalog260"
  | "assistant"
  | "weather"
  | "sovereign_physics"
  | "science"
  | "ndkrs_rule"
  | "space_universe"
  | "earth_hazards"
  | "global_nav"
  | "architect"
  | "legal"
  | "invest"
  | "automotive"
  | "bible"
  | "energy_grid"
  | "career"
  | "deep_research"
  | "omni_solver"
  | "global_markets"
  | "world_intel"
  | "science_papers"
  | "med_labs"
  | "predictive"
  | "secops_suite"
  | "general_chat";

export type NoctisPanelGroup =
  | "Core"
  | "Build & Engineering"
  | "Defense & Compliance"
  | "Intelligence & Diagnostics";

export interface NoctisPanelSpec {
  id: NoctisPanelId;
  label: string;
  shortLabel: string;
  group: NoctisPanelGroup;
  description: string;
  deepLink: string;
  apiBase?: string;
  slashCommand?: string;
  keywords: string[];
  samplePrompt: string;
}

export interface NoctisSlashRouteSpec {
  command: string;
  aliases: string[];
  routeId: NoctisRouteEngineId;
  label: string;
  description: string;
  targetPanel: NoctisPanelId;
  quickSwitch: boolean;
}

export interface NoctisApiRouteSpec {
  id: string;
  name: string;
  basePath: string;
  statusPath: string;
  panelId: NoctisPanelId;
}

export interface NoctisRouteStamp {
  routeId: NoctisRouteEngineId;
  label: string;
  confidence: number;
  override: boolean;
  command?: string;
  targetPanel: NoctisPanelId;
  responseId?: string;
}

export const NOCTIS_CHAT_RETRIEVAL_ENDPOINTS = {
  chatPost: "/api/noctis",
  routesDirectory: "/api/noctis?routes=1",
  platformRoutesHealth: "/api/v2/forge/platform-routes?health=1",
  listResponses: "/api/noctis?responses=1&engine={routeId}&q={query}&limit=20",
  getResponseById: "/api/noctis?responseId={responseId}",
  deepLinkResponse: "/noctis?response={responseId}",
} as const;

export const NOCTIS_PANELS: NoctisPanelSpec[] = [
  {
    id: "chat",
    label: "Noctis Sovereign Chat",
    shortLabel: "Chat",
    group: "Core",
    description: "Unified multi-domain assistant with auto intent routing, deep think, and slash overrides.",
    deepLink: "/noctis",
    apiBase: "/api/noctis",
    slashCommand: "/chat",
    keywords: ["chat", "home", "desk", "assistant", "ask", "general", "question"],
    samplePrompt: "/chat Summarize the active architecture boundaries of Noctis",
  },
  {
    id: "forge",
    label: "Noctis Forge Studio",
    shortLabel: "Forge Studio",
    group: "Build & Engineering",
    description: "AI website, full-stack monorepo & NASEE builder with Preview, Code, Data, Publish, and History.",
    deepLink: "/noctis?panel=forge",
    apiBase: "/api/v2/forge",
    slashCommand: "/build",
    keywords: ["forge", "builder", "website", "app", "nasee", "omnisphere", "meridian", "sandbox", "microvm", "preview"],
    samplePrompt: "Build an interactive global maritime cold-chain logistics platform called Meridian Reefers",
  },
  {
    id: "rmf",
    label: "RMF v2.0 Intelligence Command",
    shortLabel: "RMF v2.0",
    group: "Defense & Compliance",
    description: "NIST 800-53 Rev 5 / 800-37 Risk Management Framework, SSP, ATO, POA&M SLAs, and OSCAL audits.",
    deepLink: "/noctis?panel=rmf",
    apiBase: "/api/v2/rmf",
    slashCommand: "/rmf",
    keywords: ["rmf", "nist", "800-53", "800-37", "poam", "ato", "ssp", "oscal", "fedramp", "compliance", "audit"],
    samplePrompt: "/rmf Evaluate NIST 800-53 AU-6 and AC-2 audit readiness and open POA&M SLA windows",
  },
  {
    id: "dod-ic",
    label: "NDIMP Defense & IC Command",
    shortLabel: "DoD / IC",
    group: "Defense & Compliance",
    description: "DoDI 8510.01, ICD 503/502, CNSSI 1253, SIPR/JWICS cross-domain guard & fail-closed classification.",
    deepLink: "/noctis?panel=dod-ic",
    apiBase: "/api/v2/dod-ic",
    slashCommand: "/dod",
    keywords: ["dod", "ic", "dodi", "8510", "icd", "503", "cnssi", "1253", "sipr", "jwics", "scif", "ndimp"],
    samplePrompt: "/dod Assess DoDI 8510.01 and CNSSI 1253 cross-domain guard controls between NIPR and SIPR",
  },
  {
    id: "enterprise",
    label: "Enterprise Intelligence Command",
    shortLabel: "Enterprise",
    group: "Intelligence & Diagnostics",
    description: "6-panel Enterprise Command Center, policy-as-code, Auth Digital Twin, Custody Chain, Tests 046/047.",
    deepLink: "/noctis?panel=enterprise",
    apiBase: "/api/v2/enterprise",
    slashCommand: "/enterprise",
    keywords: ["enterprise", "command", "policy", "digital twin", "custody", "test 046", "test 047", "soc"],
    samplePrompt: "/enterprise Open Enterprise Command Center status for policy-as-code and custody ledger",
  },
  {
    id: "ndkrs",
    label: "NDKRS Deterministic Rules",
    shortLabel: "NDKRS",
    group: "Intelligence & Diagnostics",
    description: "Deterministic knowledge ledger, HMAC Fact-Lock certificates, Reynolds/Anion-Gap/FDA CDS rules.",
    deepLink: "/noctis?panel=ndkrs",
    apiBase: "/api/v2/ndkrs",
    slashCommand: "/ndkrs",
    keywords: ["ndkrs", "deterministic", "fact-lock", "certificate", "reynolds", "anion gap", "ledger", "rules"],
    samplePrompt: "/ndkrs Run CLIN-ANION-GAP deterministic verification rule and inspect certificate status",
  },
  {
    id: "assistant",
    label: "Universal Assistant v1.0",
    shortLabel: "Assistant",
    group: "Core",
    description: "100-capability workspace, 100-task benchmark runner, and structured multi-step synthesis.",
    deepLink: "/noctis?panel=assistant",
    apiBase: "/api/v2/assistant",
    slashCommand: "/assistant",
    keywords: ["universal assistant", "benchmark", "100-capability", "workspace"],
    samplePrompt: "/assistant Show Universal Assistant v1.0 100-capability readiness",
  },
  {
    id: "frontier",
    label: "Frontier Clinical Lab",
    shortLabel: "Clinical Lab",
    group: "Intelligence & Diagnostics",
    description: "Zero-hallucination clinical decision support, resuscitation protocols, labs, ECG & FHIR R4 validation.",
    deepLink: "/noctis?panel=frontier",
    slashCommand: "/clinical",
    keywords: ["clinical", "medical", "patient", "icu", "ecg", "fhir", "triage", "resuscitation", "sepsis", "lab"],
    samplePrompt: "/clinical Patient 64yo with K+ 6.4 mEq/L, peaked T waves, and BP 88/54 mmHg",
  },
  {
    id: "study",
    label: "Learning & Study Board",
    shortLabel: "Study Board",
    group: "Core",
    description: "Interactive teaching workspace, board exam explorer, concept maps, and mastery progression.",
    deepLink: "/noctis?panel=study",
    keywords: ["study", "board", "learn", "exam", "lesson", "tutor"],
    samplePrompt: "Walk me step by step through acid-base Winter's formula compensation",
  },
  {
    id: "console",
    label: "Sovereign Systems Console",
    shortLabel: "Console",
    group: "Build & Engineering",
    description: "Live autonomous execution telemetry, multi-engine bus, and SQDEC governance inspector.",
    deepLink: "/noctis?panel=console",
    slashCommand: "/physics",
    keywords: ["console", "sovereign", "physics", "tokamak", "battery", "hypersonic", "engines", "telemetry"],
    samplePrompt: "/physics Calculate lithium plating onset at 4C charging, SoC 0.85, and -5C temperature",
  },
  {
    id: "plugins",
    label: "Distributed Plugin Mesh",
    shortLabel: "Plugins",
    group: "Build & Engineering",
    description: "Manage Gmail, Calendar, DevOps, Security, and Sovereign distributed connectors.",
    deepLink: "/noctis?panel=plugins",
    keywords: ["plugins", "connectors", "integrations", "mcp", "tools", "mesh"],
    samplePrompt: "Check unread high-priority alerts across connected enterprise plugins",
  },
  {
    id: "redteam",
    label: "Red-Team & Vulnerability Lab",
    shortLabel: "Red Team",
    group: "Defense & Compliance",
    description: "Adversarial testing, CVE/NVD live lookup, OWASP Top 10 harnesses, and exploit boundary checks.",
    deepLink: "/noctis?panel=redteam",
    slashCommand: "/cyber",
    keywords: ["redteam", "cyber", "cve", "nvd", "owasp", "sqli", "pentest", "vulnerability", "security"],
    samplePrompt: "/cyber Analyze CVE-2024-3094 XZ Utils supply-chain backdoor severity and mitigation",
  },
  {
    id: "training",
    label: "Autonomous Training Studio",
    shortLabel: "Training",
    group: "Intelligence & Diagnostics",
    description: "Teach persistent domain rules, inspect epistemic gap closure, and export JSONL fine-tune pairs.",
    deepLink: "/noctis?panel=training",
    keywords: ["training", "memory", "rules", "jsonl", "fine-tune", "epistemic"],
    samplePrompt: "Check Vibe training database status and active rules",
  },
];

export const NOCTIS_SLASH_ROUTES: NoctisSlashRouteSpec[] = [
  {
    command: "/nasee",
    aliases: [],
    routeId: "nasee",
    label: "NASEE · Autonomous Engineer",
    description: "Runs full monorepo synthesis, PGlite PostgreSQL RLS proof, Sandbox tests & 12-Gate verification.",
    targetPanel: "forge",
    quickSwitch: true,
  },
  {
    command: "/build",
    aliases: ["/site", "/forge"],
    routeId: "website_builder",
    label: "Forge · Website & App Builder",
    description: "Generates interactive full-stack web apps, schemas, and live preview bundles in Forge.",
    targetPanel: "forge",
    quickSwitch: true,
  },
  {
    command: "/clinical",
    aliases: ["/med"],
    routeId: "clinical",
    label: "Clinical · Neuro-Symbolic",
    description: "Safety-gated clinical reasoning, acute triage, dosing calculations, and contraindication audits.",
    targetPanel: "frontier",
    quickSwitch: true,
  },
  {
    command: "/rmf",
    aliases: ["/nist"],
    routeId: "rmf_grc",
    label: "RMF v2.0 · NIST 800-53",
    description: "Deterministic RMF control baseline, POA&M SLAs, SSP readiness, and OSCAL compliance.",
    targetPanel: "rmf",
    quickSwitch: true,
  },
  {
    command: "/dod",
    aliases: ["/ic", "/ndimp"],
    routeId: "dod_ic",
    label: "NDIMP · DoD / IC Defense",
    description: "DoDI 8510.01, ICD 503, CNSSI 1253, and fail-closed cross-domain security guards.",
    targetPanel: "dod-ic",
    quickSwitch: true,
  },
  {
    command: "/cyber",
    aliases: ["/cve", "/sec"],
    routeId: "cve_cyber",
    label: "Cyber · CVE / Security Lab",
    description: "Live MITRE CVE / NVD lookups, CISA KEV status, and application security remediation.",
    targetPanel: "redteam",
    quickSwitch: true,
  },
  {
    command: "/weather",
    aliases: ["/forecast"],
    routeId: "weather",
    label: "Weather · Global NWP",
    description: "Real-time city or global 7-day forecast, rain probability, and meteorological dashboard.",
    targetPanel: "chat",
    quickSwitch: true,
  },
  {
    command: "/enterprise",
    aliases: [],
    routeId: "enterprise",
    label: "Enterprise · Command Engine",
    description: "Enterprise governance, Auth Digital Twin, policy-as-code, and custody ledger.",
    targetPanel: "enterprise",
    quickSwitch: false,
  },
  {
    command: "/nups",
    aliases: [],
    routeId: "nups",
    label: "NUPS · 40-Engine Solver",
    description: "Noctis Universal Problem Solver with isolated fact boundaries and safety validation.",
    targetPanel: "console",
    quickSwitch: false,
  },
  {
    command: "/catalog",
    aliases: [],
    routeId: "catalog260",
    label: "Catalog 260 · Dependability",
    description: "Master Capability Catalog v1.0 & Dependability Suite (#251-#260).",
    targetPanel: "console",
    quickSwitch: false,
  },
  {
    command: "/assistant",
    aliases: [],
    routeId: "assistant",
    label: "Universal Assistant v1.0",
    description: "100-capability workspace and benchmark task suite.",
    targetPanel: "assistant",
    quickSwitch: false,
  },
  {
    command: "/physics",
    aliases: ["/tool"],
    routeId: "sovereign_physics",
    label: "Sovereign Physics (#101-#116)",
    description: "Tokamak MHD, battery lithium plating, hypersonics, fission kinetics, orbital docking.",
    targetPanel: "console",
    quickSwitch: false,
  },
  {
    command: "/science",
    aliases: [],
    routeId: "science",
    label: "Science · Deterministic Formulas",
    description: "Schwarzschild radius, de Broglie wavelength, Henderson-Hasselbalch, Lorentz factor.",
    targetPanel: "study",
    quickSwitch: false,
  },
  {
    command: "/ndkrs",
    aliases: [],
    routeId: "ndkrs_rule",
    label: "NDKRS · Fact-Lock Ledger",
    description: "Direct deterministic rule execution and HMAC-signed validation certificates.",
    targetPanel: "ndkrs",
    quickSwitch: false,
  },
  {
    command: "/space",
    aliases: ["/astro", "/iss", "/orbit"],
    routeId: "space_universe",
    label: "Space · Orbital & SWPC",
    description: "Live NOAA geomagnetic Kp index, ISS position, NASA JPL close-approach asteroids, Hohmann Δv & impact energy.",
    targetPanel: "chat",
    quickSwitch: true,
  },
  {
    command: "/earth",
    aliases: ["/quake", "/aqi", "/hazards"],
    routeId: "earth_hazards",
    label: "Earth · Hazards & AQI",
    description: "Live USGS earthquakes, NASA EONET wildfires/volcanoes, city US AQI/PM2.5 & tsunami travel physics.",
    targetPanel: "chat",
    quickSwitch: true,
  },
  {
    command: "/nav",
    aliases: ["/metar", "/flight", "/maritime"],
    routeId: "global_nav",
    label: "Nav · Aviation & Sea",
    description: "Live NOAA METAR airport weather, runway crosswind/density altitude & great-circle flight/sea routing.",
    targetPanel: "chat",
    quickSwitch: true,
  },
  {
    command: "/architect",
    aliases: ["/arch", "/bim", "/house"],
    routeId: "architect",
    label: "Architect · BIM & CAD",
    description: "Shared IFC 4.3 + buildingSMART IDS house design, 4-sheet CAD SVG, cost QTO, ripple resize & 15-gate verification.",
    targetPanel: "chat",
    quickSwitch: true,
  },
  {
    command: "/legal",
    aliases: ["/law", "/lex"],
    routeId: "legal",
    label: "Legal · Attorney & Lex",
    description: "IRAC/CREAC legal analysis, federal FAR procurement, HIPAA/APA litigation & cross-border conflict-of-laws.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/invest",
    aliases: ["/finance", "/valuation"],
    routeId: "invest",
    label: "Invest · Research & Valuation",
    description: "Wall Street & Main Street equity analysis, working-capital divergence, DCF/WACC, SEC filings & SaaS modeling.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/auto",
    aliases: ["/obd", "/mechanic"],
    routeId: "automotive",
    label: "Auto · OBD-II & Diagnostics",
    description: "OBD-II DTCs, fuel trims (STFT/LTFT), crank/no-start, CKP signals, misfires & causal automotive fault trees.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/bible",
    aliases: ["/scripture", "/theology"],
    routeId: "bible",
    label: "Bible · Exegesis & Study",
    description: "Genesis-to-Revelation biblical exegesis, sermon prep, Bible study lessons & historical-grammatical analysis.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/energy",
    aliases: ["/grid", "/bess"],
    routeId: "energy_grid",
    label: "Energy · Smart Grid & BESS",
    description: "NERC BAL-003 frequency droop, IEEE 1547 anti-islanding, black-start sync & NFPA 855 BESS thermal runaway gates.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/career",
    aliases: ["/jobs", "/pathways"],
    routeId: "career",
    label: "Career · Pathways & Wages",
    description: "Step-by-step career pathways, licensing, skills, regional wage data & multilingual profession guides.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/research",
    aliases: ["/ric", "/evidence"],
    routeId: "deep_research",
    label: "Research · Deep Evidence & RIC",
    description: "Research Intelligence Controller, claim-level evidence ledger, contradiction audit & reproducible research lab.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/omni",
    aliases: ["/solver", "/stem"],
    routeId: "omni_solver",
    label: "Omni · 81-Domain STEM Solver",
    description: "81 specialized scientific, civil, quantum, acoustics, hydrology, naval, EUV, pharma, macro & engineering solvers.",
    targetPanel: "chat",
    quickSwitch: true,
  },
  {
    command: "/markets",
    aliases: ["/fx", "/crypto", "/macro"],
    routeId: "global_markets",
    label: "Markets · Live FX & Macro",
    description: "Live ExchangeRate-API currency conversions, CoinGecko crypto spot, Fisher real yield & parametric VaR.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/world",
    aliases: ["/country", "/gdp", "/demographics"],
    routeId: "world_intel",
    label: "World · Bank GDP & Macro",
    description: "Live World Bank v2 country GDP, inflation, population, power access & Domar debt sustainability.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/papers",
    aliases: ["/arxiv", "/pubmed", "/lit"],
    routeId: "science_papers",
    label: "Papers · arXiv & PubMed",
    description: "Live arXiv + NCBI PubMed scientific literature search with APA & BibTeX citations.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/labs",
    aliases: ["/records", "/pathology"],
    routeId: "med_labs",
    label: "Labs · Medical Records & Biopsy",
    description: "Non-urgent interpretation of lab panels, pathology biopsies, imaging notes & clinician reports.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/predict",
    aliases: ["/anomaly", "/backtest"],
    routeId: "predictive",
    label: "Predict · 15-Engine Forecasting",
    description: "Point-in-time forecasting, chronological backtesting, probability calibration & drift monitoring.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/secops",
    aliases: ["/warroom", "/pqc", "/zkp", "/twin"],
    routeId: "secops_suite",
    label: "SecOps · Twin, WarRoom & PQC",
    description: "Digital Twin attack graphs, Red vs Blue War Room, Post-Quantum Crypto sentinel, ZK proofs & SAST.",
    targetPanel: "chat",
    quickSwitch: false,
  },
  {
    command: "/chat",
    aliases: ["/core"],
    routeId: "general_chat",
    label: "Core · General Reasoning",
    description: "Direct Noctis LLM synthesis without specialized gadget interception.",
    targetPanel: "chat",
    quickSwitch: true,
  },
];

export const NOCTIS_API_ROUTES: NoctisApiRouteSpec[] = [
  { id: "forge", name: "Noctis Forge & NASEE API", basePath: "/api/v2/forge", statusPath: "/api/v2/forge/status", panelId: "forge" },
  { id: "platform-routes", name: "Platform Capability & Route Directory", basePath: "/api/v2/forge/platform-routes", statusPath: "/api/v2/forge/platform-routes", panelId: "forge" },
  { id: "rmf", name: "RMF v2.0 & NIST 800-53 API", basePath: "/api/v2/rmf", statusPath: "/api/v2/rmf/status", panelId: "rmf" },
  { id: "dod-ic", name: "NDIMP DoD & IC Security API", basePath: "/api/v2/dod-ic", statusPath: "/api/v2/dod-ic/status", panelId: "dod-ic" },
  { id: "enterprise", name: "Enterprise Intelligence API", basePath: "/api/v2/enterprise", statusPath: "/api/v2/enterprise/status", panelId: "enterprise" },
  { id: "ndkrs", name: "NDKRS Deterministic Rules API", basePath: "/api/v2/ndkrs", statusPath: "/api/v2/ndkrs/status", panelId: "ndkrs" },
  { id: "nups", name: "NUPS Problem Solver API", basePath: "/api/v2/nups", statusPath: "/api/v2/nups/status", panelId: "console" },
  { id: "catalog", name: "Catalog 260 Capability API", basePath: "/api/v2/catalog", statusPath: "/api/v2/catalog/status", panelId: "console" },
  { id: "assistant", name: "Universal Assistant v1.0 API", basePath: "/api/v2/assistant", statusPath: "/api/v2/assistant/status", panelId: "assistant" },
  { id: "space", name: "Space & Universe Live Telemetry API", basePath: "/api/noctis?space=1", statusPath: "/api/noctis?space=1", panelId: "chat" },
  { id: "earth", name: "Earth Hazards & Air Quality API", basePath: "/api/noctis?earth=1", statusPath: "/api/noctis?earth=1", panelId: "chat" },
  { id: "nav", name: "Aviation METAR & Global Navigation API", basePath: "/api/noctis?nav=KJFK", statusPath: "/api/noctis?nav=KJFK", panelId: "chat" },
  { id: "architect", name: "Noctis Architectural Intelligence API (NOCTIS-ARCH-001)", basePath: "/api/noctis?architect=1", statusPath: "/api/noctis?architect=1", panelId: "chat" },
  { id: "legal", name: "Noctis Legal & Cross-Border Lex API (NOCTIS-LEGAL-001)", basePath: "/api/noctis?legal=1", statusPath: "/api/noctis?legal=1", panelId: "chat" },
  { id: "invest", name: "Noctis Research & Investment Valuation API (NOCTIS-INVEST-001)", basePath: "/api/noctis?invest=1", statusPath: "/api/noctis?invest=1", panelId: "chat" },
  { id: "auto", name: "Noctis Automotive OBD-II Diagnostic API (NOCTIS-AUTO-001)", basePath: "/api/noctis?auto=1", statusPath: "/api/noctis?auto=1", panelId: "chat" },
  { id: "bible", name: "Noctis Bible Exegesis & Study API (NOCTIS-BIBLE-001)", basePath: "/api/noctis?bible=1", statusPath: "/api/noctis?bible=1", panelId: "chat" },
  { id: "energy", name: "Noctis Energy & Smart Grid BESS API (NOCTIS-ENERGY-GRID-001)", basePath: "/api/noctis?energy=1", statusPath: "/api/noctis?energy=1", panelId: "chat" },
  { id: "career", name: "Noctis Career Pathways Repository API (NOCTIS-CAREERS-001)", basePath: "/api/noctis?career=1", statusPath: "/api/noctis?career=1", panelId: "chat" },
  { id: "research", name: "Noctis Deep Research & RIC Evidence API (NOCTIS-RIC-001)", basePath: "/api/noctis?research=1", statusPath: "/api/noctis?research=1", panelId: "chat" },
  { id: "omni", name: "Noctis 81-Domain Universal STEM Solver API (NOCTIS-OMNI-ROUTER-001)", basePath: "/api/noctis?omni=1", statusPath: "/api/noctis?omni=1", panelId: "chat" },
  { id: "markets", name: "Noctis Global FX, Crypto & Macro API", basePath: "/api/noctis?markets=1", statusPath: "/api/noctis?markets=1", panelId: "chat" },
  { id: "world", name: "Noctis World Bank Country Intelligence API", basePath: "/api/noctis?world=GHA", statusPath: "/api/noctis?world=GHA", panelId: "chat" },
  { id: "papers", name: "Noctis Live arXiv & PubMed Literature API", basePath: "/api/noctis?papers=1", statusPath: "/api/noctis?papers=1", panelId: "chat" },
  { id: "labs", name: "Noctis Medical Record & Lab Interpreter API", basePath: "/api/noctis?labs=1", statusPath: "/api/noctis?labs=1", panelId: "chat" },
  { id: "predict", name: "Noctis Predictive Intelligence 15-Engine API", basePath: "/api/noctis?predict=1", statusPath: "/api/noctis?predict=1", panelId: "chat" },
  { id: "secops", name: "Noctis SecOps Twin, WarRoom, PQC & ZKP API", basePath: "/api/noctis?secops=pqc", statusPath: "/api/noctis?secops=pqc", panelId: "chat" },
  { id: "noctis", name: "Core Noctis Chat Endpoint", basePath: "/api/noctis", statusPath: "/api/v1/health", panelId: "chat" },
];

const PANEL_IDS_SET = new Set<string>(NOCTIS_PANELS.map((p) => p.id));

export function isValidNoctisPanelId(value: string | null | undefined): value is NoctisPanelId {
  return typeof value === "string" && PANEL_IDS_SET.has(value);
}

export function getPanelSpec(id: NoctisPanelId): NoctisPanelSpec {
  return NOCTIS_PANELS.find((p) => p.id === id) || NOCTIS_PANELS[0]!;
}

export function getSlashRouteByEngine(routeId: NoctisRouteEngineId): NoctisSlashRouteSpec | undefined {
  return NOCTIS_SLASH_ROUTES.find((r) => r.routeId === routeId);
}

export function getSlashCommandForRouteId(routeOrCommand: string | null | undefined): string | null {
  const raw = String(routeOrCommand || "").trim().toLowerCase();
  if (!raw) return null;
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const spec = NOCTIS_SLASH_ROUTES.find(
    (item) => item.routeId.toLowerCase() === raw || item.command === withSlash || item.aliases.includes(withSlash),
  );
  return spec?.command || null;
}

export function stripLeadingSlashOverride(rawPrompt: string): {
  command: string | null;
  routeId: NoctisRouteEngineId | null;
  spec: NoctisSlashRouteSpec | null;
  strippedPrompt: string;
} {
  const trimmed = String(rawPrompt || "").trim();
  if (!trimmed.startsWith("/")) {
    return { command: null, routeId: null, spec: null, strippedPrompt: trimmed };
  }
  const m = trimmed.match(/^(\/[a-z0-9_-]+)(?:\s+([\s\S]*))?$/i);
  if (!m) {
    return { command: null, routeId: null, spec: null, strippedPrompt: trimmed };
  }
  const token = m[1]!.toLowerCase();
  const rest = (m[2] || "").trim();
  const spec = NOCTIS_SLASH_ROUTES.find(
    (item) => item.command === token || item.aliases.includes(token),
  );
  if (!spec) {
    return { command: null, routeId: null, spec: null, strippedPrompt: trimmed };
  }
  return {
    command: spec.command,
    routeId: spec.routeId,
    spec,
    strippedPrompt: rest,
  };
}

export interface NoctisSlashSegment {
  command: string;
  routeId: NoctisRouteEngineId;
  spec: NoctisSlashRouteSpec;
  prompt: string;
}

function findSlashSpec(tokenWithSlash: string): NoctisSlashRouteSpec | undefined {
  const normalized = tokenWithSlash.toLowerCase();
  return NOCTIS_SLASH_ROUTES.find(
    (item) => item.command === normalized || item.aliases.includes(normalized),
  );
}

/**
 * Splits a single chat message containing 2..maxSegments stacked `/command ...`
 * directives so Noctis executes all requested engines in one coordinated pass.
 * Returns `[]` for single-slash prompts, prose, code blocks, or file paths.
 */
export function extractMultiSlashOverrides(rawPrompt: string, maxSegments = 5): NoctisSlashSegment[] {
  const lines = String(rawPrompt || "").split(/\r?\n/);
  let inCodeFence = false;
  let explicitSlashCount = 0;
  const working: Array<{
    command: string;
    routeId: NoctisRouteEngineId;
    spec: NoctisSlashRouteSpec;
    lines: string[];
  }> = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("```")) {
      if (working.length === 0) return [];
      inCodeFence = !inCodeFence;
      working[working.length - 1]!.lines.push(rawLine.trimEnd());
      continue;
    }

    if (!trimmed) {
      if (working.length > 0 && working[working.length - 1]!.lines.length > 0) {
        working[working.length - 1]!.lines.push("");
      }
      continue;
    }

    if (!inCodeFence) {
      const unbulleted = trimmed.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, "").trim();
      const slashMatch = unbulleted.match(/^(\/[a-z][a-z0-9_-]*)(?:\s+([\s\S]*))?$/i);
      if (slashMatch) {
        const spec = findSlashSpec(slashMatch[1]!);
        if (spec) {
          if (working.length < maxSegments) {
            explicitSlashCount += 1;
            const rest = (slashMatch[2] || "").trim();
            working.push({
              command: spec.command,
              routeId: spec.routeId,
              spec,
              lines: rest ? [rest] : [],
            });
            continue;
          }
        }
      }

      if (working.length === 0) {
        const bareMatch = unbulleted.match(/^([a-z][a-z0-9_-]*)\s+([\s\S]+)$/i);
        const bareSpec = bareMatch ? findSlashSpec(`/${bareMatch[1]!}`) : undefined;
        if (bareSpec) {
          const rest = bareMatch![2]!.trim();
          working.push({
            command: bareSpec.command,
            routeId: bareSpec.routeId,
            spec: bareSpec,
            lines: rest ? [rest] : [],
          });
          continue;
        }
        return [];
      }
    }

    if (working.length > 0) {
      working[working.length - 1]!.lines.push(rawLine.trimEnd());
    }
  }

  if (working.length < 2 || explicitSlashCount < 1) {
    return [];
  }

  return working.map((seg) => ({
    command: seg.command,
    routeId: seg.routeId,
    spec: seg.spec,
    prompt: seg.lines.join("\n").trim(),
  }));
}

export const ROUTE_STAMP_REGEX = /<!--\s*noctis-route:(\{[\s\S]*?\})\s*-->/i;
const ROUTE_STAMP_GLOBAL_REGEX = /\n?<!--\s*noctis-route:\{[\s\S]*?\}\s*-->/gi;

export function parseRouteStamp(text: string): {
  cleanText: string;
  stamp: NoctisRouteStamp | null;
} {
  const input = String(text || "");
  const m = input.match(ROUTE_STAMP_REGEX);
  let stamp: NoctisRouteStamp | null = null;
  if (m?.[1]) {
    try {
      const parsed = JSON.parse(m[1]) as Partial<NoctisRouteStamp>;
      if (parsed && typeof parsed.routeId === "string" && typeof parsed.label === "string") {
        stamp = {
          routeId: parsed.routeId as NoctisRouteEngineId,
          label: parsed.label,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 90,
          override: Boolean(parsed.override),
          command: typeof parsed.command === "string" ? parsed.command : undefined,
          targetPanel: isValidNoctisPanelId(parsed.targetPanel) ? parsed.targetPanel : "chat",
          responseId: typeof parsed.responseId === "string" ? parsed.responseId : undefined,
        };
      }
    } catch {
      stamp = null;
    }
  }
  const cleanText = input.replace(ROUTE_STAMP_GLOBAL_REGEX, "").trim();
  return { cleanText, stamp };
}

export function attachRouteStamp(
  text: string,
  stamp: NoctisRouteStamp,
  wantsRawJson = false,
): string {
  const raw = String(text || "");
  const trimmed = raw.trim();
  if (wantsRawJson || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return raw;
  }
  if (ROUTE_STAMP_REGEX.test(raw)) {
    return raw;
  }
  return `${raw}\n<!-- noctis-route:${JSON.stringify(stamp)} -->`;
}

export function upsertRouteStampResponseId(text: string, responseId: string): string {
  const raw = String(text || "");
  if (!responseId || !ROUTE_STAMP_REGEX.test(raw)) {
    return raw;
  }
  const { cleanText, stamp } = parseRouteStamp(raw);
  if (!stamp) return raw;
  return `${cleanText}\n<!-- noctis-route:${JSON.stringify({ ...stamp, responseId })} -->`;
}
