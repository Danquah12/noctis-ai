/**
 * Noctis Unified Scored Intent Router
 *
 * Replaces fragile sequential keyword waterfalls with:
 * 1. Explicit `/command` overrides (confidence = 100, strips leading command cleanly)
 * 2. Scored multi-signal intent classification across all Noctis engines
 * 3. Cross-domain collision vetoes (e.g., NASEE / Website Builder / Clinical never hijacked by
 *    "Security SOC" -> Battery #102 or "cold-chain maritime" -> Weather)
 * 4. Structured `NoctisRouteStamp` metadata for transparent UI attribution & 1-click re-route
 *
 * IMPORTANT: Uses pure relative `.ts` imports only (no `@/` aliases) so it runs natively under
 * `node --experimental-strip-types --test`, Vitest/tsx, and Vite SSR.
 */

import {
  extractMultiSlashOverrides,
  getPanelSpec,
  NOCTIS_SLASH_ROUTES,
  parseRouteStamp,
  stripLeadingSlashOverride,
  type NoctisPanelId,
  type NoctisRouteEngineId,
  type NoctisRouteStamp,
} from "./noctis-capability-registry.ts";
import { resolveFollowUpContext } from "./noctis-followup-resolver.ts";
import { matchesAnyArchitect40BenchmarkPrompt } from "./noctis-architect-benchmarks.ts";
import { isLegalQuery } from "./noctis-legal-engine.ts";
import { isCareerPathwayQuery } from "./noctis-career-query.ts";
import { detectLifeDomain } from "./noctis-universal-life-router.ts";
import { matchSovereignTool } from "./noctis-tool-orchestrator.ts";

export interface NoctisIntentDecision {
  routeId: NoctisRouteEngineId;
  label: string;
  confidence: number;
  override: boolean;
  overrideCommand?: string;
  effectivePrompt: string;
  matchedSignals: string[];
  vetoedRoutes: Partial<Record<NoctisRouteEngineId, string>>;
  scores: Partial<Record<NoctisRouteEngineId, number>>;
  targetPanel: NoctisPanelId;
}

const ROUTE_LABELS: Record<NoctisRouteEngineId, { label: string; targetPanel: NoctisPanelId }> = {
  nasee: { label: "NASEE · Autonomous Engineer", targetPanel: "forge" },
  website_builder: { label: "Forge · Website & App Builder", targetPanel: "forge" },
  clinical: { label: "Clinical · Neuro-Symbolic", targetPanel: "frontier" },
  dod_ic: { label: "NDIMP · DoD / IC Defense", targetPanel: "dod-ic" },
  rmf_grc: { label: "RMF v2.0 · NIST 800-53", targetPanel: "rmf" },
  cve_cyber: { label: "Cyber · CVE / Security Lab", targetPanel: "redteam" },
  enterprise: { label: "Enterprise · Command Engine", targetPanel: "enterprise" },
  nups: { label: "NUPS · 40-Engine Solver", targetPanel: "console" },
  catalog260: { label: "Catalog 260 · Dependability", targetPanel: "console" },
  assistant: { label: "Universal Assistant v1.0", targetPanel: "assistant" },
  weather: { label: "Weather · Global NWP", targetPanel: "chat" },
  sovereign_physics: { label: "Sovereign Physics (#101-#116)", targetPanel: "console" },
  science: { label: "Science · Deterministic Formulas", targetPanel: "study" },
  ndkrs_rule: { label: "NDKRS · Fact-Lock Ledger", targetPanel: "ndkrs" },
  space_universe: { label: "Space · Orbital & SWPC", targetPanel: "chat" },
  earth_hazards: { label: "Earth · Hazards & AQI", targetPanel: "chat" },
  global_nav: { label: "Nav · Aviation & Sea", targetPanel: "chat" },
  architect: { label: "Architect · BIM & CAD", targetPanel: "chat" },
  legal: { label: "Legal · Attorney & Lex", targetPanel: "chat" },
  invest: { label: "Invest · Research & Valuation", targetPanel: "chat" },
  automotive: { label: "Auto · OBD-II & Diagnostics", targetPanel: "chat" },
  bible: { label: "Bible · Exegesis & Study", targetPanel: "chat" },
  energy_grid: { label: "Energy · Smart Grid & BESS", targetPanel: "chat" },
  career: { label: "Career · Pathways & Wages", targetPanel: "chat" },
  deep_research: { label: "Research · Deep Evidence & RIC", targetPanel: "chat" },
  omni_solver: { label: "Omni · 81-Domain STEM Solver", targetPanel: "chat" },
  global_markets: { label: "Markets · Live FX & Macro", targetPanel: "chat" },
  world_intel: { label: "World · Bank GDP & Macro", targetPanel: "chat" },
  science_papers: { label: "Papers · arXiv & PubMed", targetPanel: "chat" },
  med_labs: { label: "Labs · Medical Records & Biopsy", targetPanel: "chat" },
  predictive: { label: "Predict · 15-Engine Forecasting", targetPanel: "chat" },
  secops_suite: { label: "SecOps · Twin, WarRoom & PQC", targetPanel: "chat" },
  knowledge_library: { label: "Knowledge · Training & Table Router", targetPanel: "training" },
  general_chat: { label: "Core · General Reasoning", targetPanel: "chat" },
};

const HARD_CLINICAL_VITALS_RE =
  /\b(?:\d{1,3}\s*(?:yo|y\/o|years?-old)|patient\s+(?:presents?|with|has|in)|chief\s+complaint|code\s+blue|resuscitation|intubat|vasopressor|norepinephrine|epinephrine\s+drip|calcium\s+gluconate|bp\s*[:=]?\s*\d{2,3}\s*\/\s*\d{2,3}|blood\s+pressure\s+\d{2,3}\s*\/\s*\d{2,3}|(?:k\+|potassium)\s*[:=]?\s*[\d.]+|hyperkalemia|peaked\s+t[\s-]*waves|stemi|nstemi|septic\s+shock|anaphylaxis|status\s+epilepticus|diabetic\s+ketoacidosis|\bdka\b|\bards\b|tension\s+pneumothorax|massive\s+pe|eclampsia|troponin\s*[:=]?\s*[\d.]+|lactate\s*[:=]?\s*[\d.]+|egfr\s*[:=]?\s*[\d.]+)\b/i;

const NASEE_DIRECTIVE_RE =
  /EXECUTION\s+DIRECTIVE\s+002|NOCTIS\s+AUTONOMOUS\s+SOFTWARE\s+DEVELOPMENT|DEVELOPMENT\s+CAPABILITY\s+DISCOVERY|Noctis\s+Autonomous\s+Software\s+Engineering\s+(?:Agent|Engine)|\bNASEE\b/i;

const NASEE_COMPOUND_ECOSYSTEM_RE =
  /\b(?:omni ?sphere|enterprise\s+multi-?tenant\s+web\s+platform|complete\s+enterprise-grade\s+web\s+application|autonomous\s+software\s+(?:engineering|development)\s+agent)\b/i;

const NASEE_INFRA_PROOF_RE =
  /\b(?:30\s+(?:functional\s+)?modules|110\s+(?:functional\s+)?screens|20\s+(?:functional\s+)?foundation\s+screens|isolated\s+(?:development\s+)?workspace|acceptance\s+gates|postgresql\s+(?:database|rls)|microvm)\b/i;

const WEBSITE_BUILD_VERB_NOUN_RE =
  /\b(?:build|create|make|design|generate|code|develop|draft|scaffold|architect|prepare)\b[\s\S]{0,180}\b(?:web\s*site|website|web\s*page|webpage|landing\s*page|html\s*page|homepage|home\s*page|storefront|web\s*app|web\s+application|portal|marketplace|portfolio|booking\s+page|site)\b/i;

const WEBSITE_PLATFORM_APP_RE =
  /\b(?:build|create|make|design|generate|code|develop|draft|scaffold|architect)\b[\s\S]{0,180}\b(?:(?:web\s+)?platform|dashboard|app(?:lication)?|saas|ecosystem)\b/i;

const WEBSITE_UI_FEATURE_RE =
  /\b(?:dynamic|interactive|booking|checkout|calculator|filtering|switcher|ledger|multi-?lane|reservation|cold-?chain|reefer|tables?\s+for|called\s+[A-Z]|theme|responsive|e-?commerce|multilingual|en\/es\/fr)\b/i;

const DOD_IC_STRONG_RE =
  /\b(?:dodi?\s*8510(?:\.01)?|dodi?\s*853[01](?:\.\d+)?|dodi?\s*8520(?:\.\d+)?|icd\s*50[123]|icd\s*705|ics\s*705|cnssi?\s*1253|cnssp\s*15|\bndimp\b|ncdsmo\b|ts\/?sci\b|\bscif\b|\bsipr\b|\bjwics\b|cross[- ]?domain\s+(?:solution|transfer|guard|governance)|emass\b|disa\s+cci|cci-\d{4,6}|tempest\b|cnsa\s*2\.0|cisa\s+ztmm|dod\s+zero\s+trust|ic\s+rmf|dod\s+rmf|ic\s+ato|dod\s+ato)\b/i;

const RMF_STRONG_RE =
  /\b(?:fedramp|nist\s+(?:sp\s*)?800-53|800-53[ab]?\b|800-37\b|800-171\b|nist\s+csf\b|rmf\b|grc\b|poa&m|poam\b|3pao\b|c3pao\b|oscal\b|fips\s*(?:199|200)|cmmc\b|system\s+security\s+plan|\bssp\b|ato\s+readiness|cato\b|fisma\b|disa\s+stig|authorizing\s+official|\bisso\b|\bissm\b|control\s+baseline)\b/i;

const NIST_CONTROL_ID_RE =
  /(?<![A-Za-z0-9-])(?:AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PM|PS|PT|RA|SA|SC|SI|SR)-\d{1,2}(?:\(\d{1,2}\))?\b/i;

const CVE_ID_RE = /\bCVE-\d{4}-\d{4,7}\b/i;

const CYBER_OPS_RE =
  /\b(?:sql\s+injection|sqli\b|xss\b|ssrf\b|csrf\b|owasp\s+top\s*10|cisa\s+kev|decode\s+jwt|jwt\s+(?:header|claim|alg=none)|cidr\s+(?:subnet|slash)|http\s+security\s+headers?|zero[- ]?day|ransomware|malware\s+triage)\b/i;

const ENTERPRISE_RE =
  /\b(?:noctis\s+enterprise|enterprise\s+command\s+center|test\s*046|test\s*047|auth\s+digital\s+twin|custody\s+chain|government\s+readiness|policy-as-code|secure\s+model\s+gateway)\b/i;

const NUPS_RE =
  /\b(?:noctis\s+universal\s+problem\s+solver|\bnups\b|40-engine\s+master|cross-domain\s+fact-lock\s+matrix)\b/i;

const CATALOG_260_RE =
  /\b(?:catalog\s*260|260\s+capabilities|dependability\s+suite|master\s+capability\s+catalog|#251-#260)\b/i;

const ASSISTANT_RE =
  /\b(?:universal\s+assistant\s+v?1\.0|100-capability\s+parity|100-task\s+benchmark|noctis\s+forge\s+builder\s+studio)\b/i;

const SCIENCE_FORMULA_RE =
  /\b(?:schwarzschild|de\s+broglie|henderson-?hasselbalch|lorentz\s+factor|relativistic\s+lorentz|melting\s+temp.*(?:dna|primer)|dna.*melting\s+temp|hubble.*recession|event\s+horizon\s+radius)\b/i;

const NDKRS_EXPLICIT_RE =
  /\b(?:ENG-REYNOLDS|CLIN-ANION-GAP|RMF-POAM-SLA|LEGAL-CDS-21USC360J|NDKRS\s+(?:status|ledger|certificate|rule)|cross-domain\s+truth\s+ledger)\b/i;

const WEATHER_EXPLICIT_RE =
  /\b(?:rain|raining|rainfall|precipitation|weather|forecast|snowing|snowfall|thunderstorm|drizzle|downpour|heat\s*wave|cold\s+front|humidity|barometric|meteorolog(?:y|ical)|7-day\s+weather|will\s+it\s+rain)\b/i;

const WEATHER_TEMP_WITH_TIME_RE =
  /\b(?:temperature|wind\s+speed|degrees)\b/i;
const WEATHER_TIME_RE =
  /\b(?:tomorrow|today|tonight|this\s+week|next\s+week|weekend|forecast|outside)\b/i;

const EXPLICIT_HARD_PHYSICS_RE =
  /\b(tokamak|kruskal-shafranov|butler-volmer|lithium\s+plating|dendrite|hypersonic|fay-riddell|direct\s+air\s+capture|stellarator|orbital\s+rendezvous|clohessy|water\s+hammer|joukowsky|cryogenic\s+propellant|boil-off|zero\s+boil-off|point\s+kinetics|prompt\s+critical|insar|interferometry|interferogram|deep\s+space\s+optical|neuromorphic|rydberg|otec|ocean\s+thermal|directional\s+drilling|dogleg\s+severity|vlbi)\b/i;

const PURE_CODE_ALGO_EXCLUDE_RE =
  /\b(?:cve-\d|cvss|outline\s+the\s+postgresql|write\s+(?:a\s+)?(?:react\s+component|binary\s+search|quicksort|unit\s+test)|explain\s+how|what\s+is\s+(?:a|an|the))\b/i;

const SPACE_UNIVERSE_RE =
  /\b(?:iss\s+(?:position|location|altitude|tracking|orbit)|where\s+is\s+the\s+iss|space\s+weather|geomagnetic\s+storm|kp\s+index|noaa\s+swpc|solar\s+flare|coronal\s+mass\s+ejection|aurora\s+(?:forecast|reach)|near[-\s]earth\s+(?:object|asteroid)|nasa\s+(?:neo|cad|close\s+approach)|hohmann\s+(?:transfer|orbit)|asteroid\s+impact\s+(?:energy|kinetic)|exoplanet\s+habitable\s+zone|goldilocks\s+zone|escape\s+velocity|orbital\s+period)\b/i;

const EARTH_HAZARDS_RE =
  /\b(?:usgs|earthquakes?|seismic\s+(?:moment|energy)|richter|moment\s+magnitude|tsunami\s+(?:wave|speed|travel|warning|alert)|nasa\s+eonet|active\s+(?:wildfires?|volcan(?:o|oes))|air\s+quality|\bus\s*aqi\b|\baqi\b|\bpm2\.?5\b|\bpm10\b|wildfire\s+smoke)\b/i;

const GLOBAL_NAV_RE =
  /\b(?:live\s+metar|\bmetar\b|\btaf\b|flight\s+category|\bfltcat\b|runway\s+\d{1,2}[LCR]?|crosswind|headwind\s+component|density\s+altitude|great[-\s]?circle\s+(?:distance|flight|route)|orthodromic|strait\s+of\s+(?:malacca|hormuz)|suez\s+canal|panama\s+canal|cape\s+of\s+good\s+hope|\b(?:KJFK|KLAX|KORD|KATL|KIAD|KDCA|KBWI|EGLL|LFPG|EDDF|EHAM|OMDB|RJTT|WSSS|DGAA|DNMM|FAOR|YSSY|SBGR)\b)\b/i;

const EXPLICIT_SOFTWARE_WEB_NOUN_RE =
  /\b(?:web\s*site|website|web\s*page|webpage|landing\s*page|html\s*page|homepage|home\s*page|storefront|web\s*app|web\s+application|portal|marketplace|e-?commerce|saas|booking\s+page|react\s+(?:app|component)|nextjs)\b/i;

const ARCHITECT_NON_BUILDING_EXCLUDE_RE =
  /\b(?:data\s+warehouse|clearing\s*house|white\s+house|house\s+of\s+representatives|in-house\s+team)\b/i;

const ARCHITECT_EXPLICIT_RE =
  /\b(?:design\s+houses?\s+like\s+(?:a\s+|an\s+)?(?:professional\s+)?architect|architectural\s+intelligence\s+(?:system|engine)|noctis\s+architect|noctis-arch-001|architectural\s+validation\s+challenge|arch-at-\d+|arch-bench-\d+|ifcopenshell|ifc\s*4\.3|buildingsmart\s+ids|ghana\s+building\s+code|gs\s*1207|uganda\s+national\s+building\s+code|sheet\s+a-101|4-sheet\s+cad|door\s+and\s+window\s+schedule|room[-\s]adjacency\s+matrix|parametric\s+house\s+generator|residential\s+design\s+feasibility\s+report|(?:12\s*[x×]\s*12|enlarge\s+(?:a\s+|the\s+)?bedroom|resize\s+(?:a\s+|the\s+)?bedroom)[\s\S]{0,60}(?:\d+\s*[x×]\s*\d+|circulation|footprint|joist|schedule))\b/i;

const ARCHITECT_RESIDENTIAL_RE =
  /\b(?:design|create|build|generate|draw|plan|draft|sketch|layout|model)\b[\s\S]{0,120}\b(?:house|home|residence|villa|bungalow|duplex|cottage|townhouse|apartment\s+building|floor\s+plan|house\s+plan|building\s+plan|architectural\s+plan|architectural\s+package|cad\s+blueprint|blueprint|bim\s+model|house\s+design)\b|\b(?:\d+|two|three|four|five|six|seven|eight)\s*(?:-|\s)?(?:bed(?:room)?s?|br)\b[\s\S]{0,100}\b(?:house|home|residence|villa|bungalow|duplex|floor\s+plan|blueprint|bath(?:room)?s?|ba\b|lot\b|plot\b|sq\.?\s*ft|m²|m2)\b/i;

const LEX_CROSS_BORDER_RE =
  /\b(?:noctis-lex-001|cross-border\s+conflict[-\s]of[-\s]laws|regulatory\s+harmonization|gdpr\s+(?:vs|versus|and)\s+hipaa|eu\s+ai\s+act\s+conflict)\b/i;

const INVEST_EXPLICIT_RE =
  /\b(?:noctis-invest-001|noctis\s+research\s*(?:&|and)\s*investment|main\s+street\s+and\s+wall\s+street|working[-\s]capital\s+divergence|earnings[-\s]quality|channel\s+stuffing|dcf\s+(?:model|valuation|sensitivity)|wacc\b|ev\/ebitda|enterprise\s+value|free\s+cash\s+flow|\bfcf\b|sec\s+(?:10-k|10-q|edgar|filing)|saas\s+(?:arr|nrr|cac|ltv)|equity\s+valuation|investment\s+(?:memo|thesis|dossier))\b|\b(?:operating\s+cash\s+flow|\bocf\b)\b[\s\S]{0,140}\b(?:receivables?|dso\b|dio\b|inventor(?:y|ies)|working\s+capital|revenue\s+growth)\b/i;

const AUTOMOTIVE_EXPLICIT_RE =
  /\b(?:noctis-auto-001|auto-ac-\d+|auto-trap-\d+|obd-?ii|\b[pbu][0-3]\d{3}\b|crank[- ]?no[- ]?start|clicking\s+no[- ]?start|fuel\s+trims?|\bstft\b|\bltft\b|ckp\s+(?:sensor|circuit|signal)|misfire\s+under\s+load|cylinder\s+\d+\s+misfire|catalytic\s+converter|ignition\s+coil|spark\s+plugs?|freeze[-\s]frame|scan[-\s]tool\s+disagreement)\b/i;

const BIBLE_EXPLICIT_RE =
  /\b(?:noctis-bible-001|noctis\s+bible|genesis\s+to\s+revelation|bible\s+study|sunday\s+school|sermon\s+on\b|prepare\s+a\s+[\w\s-]{0,30}sermon|preach\s+on\b|biblical\s+exegesis|koine\s+greek|hebrew\s+term\s+hesed|old\s+testament|new\s+testament|scripture\s+(?:study|exegesis|commentary)|(?:genesis|exodus|psalms?|proverbs|isaiah|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|hebrews|james|revelation)\s+\d+(?::\d+)?)\b/i;

const ENERGY_GRID_RE =
  /\b(?:noctis-energy-grid-001|\bbess\b|nfpa\s*855|ieee\s*1547|nerc\s+bal-003|anti-?islanding|black-?start|frequency\s+droop|frequency\s+regulation|microgrid|thermal\s+runaway)\b/i;

const DEEP_RESEARCH_RE =
  /\b(?:noctis\s+deep\s+research|noctis-deep-research-001|research\s+intelligence\s+controller|noctis-ric-001|claim-level\s+evidence\s+ledger|reproducible\s+research\s+laboratory|research\s+orchestration|disputed\s+engineering\s+claim|national\s+resilience\s+strategy|source\s+independence\s+and\s+information\s+lineage|adversarial\s+research\s+team|\/v1\/research\/jobs|ric-benchmark)\b/i;

const GLOBAL_MARKETS_RE =
  /\b(?:usd\s*(?:to|\/)\s*(?:ghs|eur|gbp|jpy|ngn|kes|cad|chf|zar|ugx|cny|inr)|(?:eur|gbp|ghs)\s*(?:to|\/)\s*usd|exchange\s+rate|fx\s+rate|bitcoin\s+price|ethereum\s+price|crypto\s+prices?|fisher\s+real\s+yield|parametric\s+var)\b/i;

const WORLD_INTEL_RE =
  /\b(?:world\s+bank|gdp\s+(?:of|for|per\s+capita|trajectory)|[a-z]+\s+gdp\b|country\s+profile|domar\s+debt|debt[-\s]to[-\s]gdp\s+(?:sustainability|trajectory)|electricity\s+access\s+in|cpi\s+inflation\s+(?:of|in))\b/i;

const SCIENCE_PAPERS_RE =
  /\b(?:arxiv|pubmed|find\s+(?:recent\s+)?(?:research\s+)?papers?\s+(?:on|about)|literature\s+(?:search|review)\s+(?:on|for)|bibtex\s+citation|peer[-\s]reviewed\s+papers?\s+on)\b/i;

const MED_LABS_RE =
  /\b(?:noctis-med-record-001|interpret\s+(?:my|these|this)\s+(?:lab|pathology|biopsy|radiology|mri|ct\s+scan|doctor'?s?\s+note)|biopsy\s+report|pathology\s+report|(?:hba1c|tsh|ldl)\s*(?:is|of|=|:)?\s*[\d.]+)\b/i;

const PREDICTIVE_RE =
  /\b(?:noctis-pred-001|pred-1042|unified\s+predictive\s+intelligence|15\s+prediction\s+engines|prediction[-\s]to[-\s]action|chronological\s+backtest|probability\s+calibration|prediction\s+drift\s+monitor)\b/i;

const SECOPS_SUITE_RE =
  /\b(?:noctis-twin-001|noctis-war-room-001|noctis-pqc-001|noctis-zkproof-001|xtrike\s+sast|topological\s+attack[-\s]graph|red\s+vs\.?\s+blue\s+war\s+room|post-quantum\s+(?:crypto|migration)\s+sentinel|zero-knowledge\s+audit\s+proof)\b/i;

const KNOWLEDGE_LIBRARY_RE =
  /\b(?:noctis\s+(?:knowledge|curriculum|training\s+(?:library|corpus|tracks?|table))|open\s+technical\s+curriculum|25\s+(?:technical\s+)?tracks|search\s+(?:the\s+)?(?:knowledge\s+base|training\s+(?:db|database|library|store|corpus))|query\s+(?:the\s+)?(?:knowledge\s+base|training\s+(?:db|database|library|table))|list\s+(?:all\s+)?(?:25\s+)?curriculum\s+tracks)\b|\b(?:put|show|display|query|retrieve|summarize|list|compare|organize)\b[\s\S]{0,80}\b(?:on\s+a\s+table|in\s+a\s+table|as\s+a\s+table|into\s+a\s+table|table\s+of\s+(?:tracks|topics|standards|invariants|training))\b/i;

export function decisionToRouteStamp(decision: NoctisIntentDecision): NoctisRouteStamp {
  return {
    routeId: decision.routeId,
    label: decision.label,
    confidence: decision.confidence,
    override: decision.override,
    ...(decision.overrideCommand ? { command: decision.overrideCommand } : {}),
    targetPanel: decision.targetPanel,
  };
}

export function classifyNoctisIntent(rawPrompt: string): NoctisIntentDecision {
  const original = String(rawPrompt || "").trim();

  // 0. Multi-slash batch dispatch (`/space ... \n /earth ... \n /nav ...`)
  const multi = extractMultiSlashOverrides(original);
  if (multi.length >= 2) {
    const first = multi[0]!;
    const combinedCmds = multi.map((s) => s.command).join(" + ");
    return {
      routeId: first.routeId,
      label: `Multi-Route · ${combinedCmds}`,
      confidence: 100,
      override: true,
      overrideCommand: combinedCmds,
      effectivePrompt: original,
      matchedSignals: multi.map((s) => `multi-override:${s.command}`),
      vetoedRoutes: {},
      scores: Object.fromEntries(multi.map((s) => [s.routeId, 100])) as Partial<Record<NoctisRouteEngineId, number>>,
      targetPanel: "chat",
    };
  }

  // 1. Explicit slash command override always wins with 100% confidence
  const slash = stripLeadingSlashOverride(original);
  if (slash.routeId && slash.spec) {
    return {
      routeId: slash.routeId,
      label: slash.spec.label,
      confidence: 100,
      override: true,
      overrideCommand: slash.command || undefined,
      effectivePrompt: slash.strippedPrompt || original,
      matchedSignals: [`override:${slash.command}`],
      vetoedRoutes: {},
      scores: { [slash.routeId]: 100 },
      targetPanel: slash.spec.targetPanel,
    };
  }

  // Strip attachment tail (`\n--- file ---`) for classification purity
  const prompt = original.replace(/\n--- [^\n]+ ---\n[\s\S]*$/g, "").replace(/\[Image:[^\]]*\]/g, "").trim();

  const scores: Partial<Record<NoctisRouteEngineId, number>> = {
    general_chat: 60,
  };
  const matchedSignals: string[] = [];
  const vetoedRoutes: Partial<Record<NoctisRouteEngineId, string>> = {};

  // Evaluate Clinical Acute / Physiologic Encounter first for patient safety
  const hasClinicalVitalsOrSyndrome = HARD_CLINICAL_VITALS_RE.test(prompt);
  const looksLikeHealthcareSiteBuild =
    (WEBSITE_BUILD_VERB_NOUN_RE.test(prompt) || WEBSITE_PLATFORM_APP_RE.test(prompt)) &&
    !hasClinicalVitalsOrSyndrome;

  if (hasClinicalVitalsOrSyndrome) {
    scores.clinical = 96;
    matchedSignals.push("clinical:vitals-or-acute-syndrome");
  } else if (
    /\b(?:patient|diagnosis|clinical\s+triage|differential\s+diagnosis|antibiotic\s+regimen|medication\s+dosing|contraindication|qtc|warfarin|vancomycin|heparin)\b/i.test(
      prompt,
    ) &&
    !looksLikeHealthcareSiteBuild &&
    !NASEE_DIRECTIVE_RE.test(prompt)
  ) {
    scores.clinical = 88;
    matchedSignals.push("clinical:clinical-domain");
  }

  // Evaluate NASEE Autonomous Software Engineering Directives
  if (
    NASEE_DIRECTIVE_RE.test(prompt) ||
    (NASEE_COMPOUND_ECOSYSTEM_RE.test(prompt) && NASEE_INFRA_PROOF_RE.test(prompt)) ||
    (/\b(?:omnisphere)\b/i.test(prompt) &&
      /\b(?:build|design|develop|implement|challenge\s*001)\b/i.test(prompt) &&
      /\b(?:30\s+(?:functional\s+)?modules|110\s+(?:functional\s+)?screens|postgresql|docker|security\s+soc|python|rust|tests?)\b/i.test(
        prompt,
      ))
  ) {
    scores.nasee = 97;
    matchedSignals.push("nasee:autonomous-directive");
  }

  // Evaluate Universal Website & Full-Stack Platform Builder Intent
  const hasBuildPair =
    WEBSITE_BUILD_VERB_NOUN_RE.test(prompt) ||
    (WEBSITE_PLATFORM_APP_RE.test(prompt) && WEBSITE_UI_FEATURE_RE.test(prompt)) ||
    /^\s*(?:web\s*site|website|web\s*page|webpage|landing\s*page)\s+(?:for|of|on|about|covering)\b/i.test(prompt);

  if (hasBuildPair && !PURE_CODE_ALGO_EXCLUDE_RE.test(prompt) && !hasClinicalVitalsOrSyndrome) {
    scores.website_builder = 91;
    matchedSignals.push("website_builder:build-platform-intent");
  }

  // Evaluate DoD / IC National Security
  if (DOD_IC_STRONG_RE.test(prompt)) {
    scores.dod_ic = 92;
    matchedSignals.push("dod_ic:directive-or-boundary");
  }

  // Evaluate RMF / NIST 800-53 GRC
  if (RMF_STRONG_RE.test(prompt) || (NIST_CONTROL_ID_RE.test(prompt) && !hasBuildPair && !scores.nasee)) {
    scores.rmf_grc = 89;
    matchedSignals.push("rmf_grc:nist-compliance");
  }

  // Evaluate CVE / Cyber Operations
  if (CVE_ID_RE.test(prompt)) {
    scores.cve_cyber = 93;
    matchedSignals.push("cve_cyber:cve-id");
  } else if (CYBER_OPS_RE.test(prompt) && !hasBuildPair && !scores.nasee) {
    scores.cve_cyber = 85;
    matchedSignals.push("cve_cyber:security-ops");
  }

  // Evaluate Enterprise / NUPS / Catalog260 / Assistant / Science / NDKRS
  if (ENTERPRISE_RE.test(prompt) && !hasBuildPair && !scores.nasee) {
    scores.enterprise = 87;
    matchedSignals.push("enterprise:command-query");
  }
  if (NUPS_RE.test(prompt)) {
    scores.nups = 88;
    matchedSignals.push("nups:problem-solver");
  }
  if (CATALOG_260_RE.test(prompt)) {
    scores.catalog260 = 88;
    matchedSignals.push("catalog260:audit");
  }
  if (ASSISTANT_RE.test(prompt) && !scores.nasee) {
    scores.assistant = 86;
    matchedSignals.push("assistant:v1-benchmark");
  }
  if (SCIENCE_FORMULA_RE.test(prompt)) {
    scores.science = 90;
    matchedSignals.push("science:exact-formula");
  }
  if (NDKRS_EXPLICIT_RE.test(prompt)) {
    scores.ndkrs_rule = 89;
    matchedSignals.push("ndkrs:explicit-rule");
  }

  // Evaluate Noctis Architect (NOCTIS-ARCH-001) before planetary telemetry & weather; veto website_builder on bare "site"
  const isArchitectIntent =
    !EXPLICIT_SOFTWARE_WEB_NOUN_RE.test(prompt) &&
    (matchesAnyArchitect40BenchmarkPrompt(prompt) ||
      ARCHITECT_EXPLICIT_RE.test(prompt) ||
      (!ARCHITECT_NON_BUILDING_EXCLUDE_RE.test(prompt) && ARCHITECT_RESIDENTIAL_RE.test(prompt)));

  if (
    isArchitectIntent &&
    !hasClinicalVitalsOrSyndrome &&
    !scores.nasee &&
    !scores.dod_ic &&
    !scores.rmf_grc &&
    !scores.cve_cyber
  ) {
    scores.architect = 92;
    matchedSignals.push("architect:noctis-arch-001");
    if (scores.website_builder) {
      vetoedRoutes.website_builder = "Architectural house/BIM design brief (not a web site build)";
      delete scores.website_builder;
    }
  }

  // Evaluate Space & Universe, Earth Hazards, and Global Navigation before Weather so "space weather" / "METAR weather" / "wildfire" route accurately
  if (SPACE_UNIVERSE_RE.test(prompt) && !EXPLICIT_HARD_PHYSICS_RE.test(prompt) && !scores.architect && !scores.science && !scores.nasee && !scores.website_builder && !hasClinicalVitalsOrSyndrome && !scores.dod_ic && !scores.rmf_grc) {
    scores.space_universe = 90;
    matchedSignals.push("space:orbital-swpc-neo");
  }
  if (EARTH_HAZARDS_RE.test(prompt) && !EXPLICIT_HARD_PHYSICS_RE.test(prompt) && !scores.architect && !scores.nasee && !scores.website_builder && !hasClinicalVitalsOrSyndrome && !scores.dod_ic && !scores.rmf_grc) {
    scores.earth_hazards = 90;
    matchedSignals.push("earth:hazards-aqi");
  }
  if (GLOBAL_NAV_RE.test(prompt) && !EXPLICIT_HARD_PHYSICS_RE.test(prompt) && !scores.architect && !scores.nasee && !scores.website_builder && !hasClinicalVitalsOrSyndrome && !scores.dod_ic && !scores.rmf_grc && !scores.cve_cyber) {
    scores.global_nav = 90;
    matchedSignals.push("nav:metar-greatcircle");
  }

  // Evaluate Promoted 7 Domain Engines (guarded strictly against higher-priority clinical/builder/architect/defense/cyber routes)
  const hasHigherPriority = Boolean(
    scores.clinical ||
      hasClinicalVitalsOrSyndrome ||
      scores.nasee ||
      scores.website_builder ||
      scores.architect ||
      scores.dod_ic ||
      scores.rmf_grc ||
      scores.cve_cyber,
  );
  if (!hasHigherPriority && AUTOMOTIVE_EXPLICIT_RE.test(prompt)) {
    scores.automotive = 90;
    matchedSignals.push("auto:obd-diagnostics");
  }
  if (!hasHigherPriority && !EXPLICIT_HARD_PHYSICS_RE.test(prompt) && ENERGY_GRID_RE.test(prompt)) {
    scores.energy_grid = 89;
    matchedSignals.push("energy:smart-grid-bess");
  }
  if (!hasHigherPriority && !scores.automotive && (isLegalQuery(prompt) || LEX_CROSS_BORDER_RE.test(prompt))) {
    scores.legal = 89;
    matchedSignals.push("legal:attorney-lex");
  }
  if (!hasHigherPriority && !scores.automotive && !scores.energy_grid && INVEST_EXPLICIT_RE.test(prompt)) {
    scores.invest = 89;
    matchedSignals.push("invest:valuation-research");
  }
  if (!hasHigherPriority && !scores.automotive && !scores.invest && BIBLE_EXPLICIT_RE.test(prompt)) {
    scores.bible = 89;
    matchedSignals.push("bible:scripture-exegesis");
  }
  if (
    !hasHigherPriority &&
    !/\b(?:patient|symptoms?|diagnos\w*|dosage|dose|\d+\s?mg|lab\s+results?|egfr|creatinine|fhir|chest\s+pain|fever)\b/i.test(prompt) &&
    isCareerPathwayQuery(prompt)
  ) {
    scores.career = 88;
    matchedSignals.push("career:pathway-repo");
  }
  if (!hasHigherPriority && DEEP_RESEARCH_RE.test(prompt)) {
    scores.deep_research = 89;
    matchedSignals.push("research:deep-evidence-ric");
  }
  if (!hasHigherPriority && GLOBAL_MARKETS_RE.test(prompt)) {
    scores.global_markets = 90;
    matchedSignals.push("markets:live-fx-macro");
  }
  if (!hasHigherPriority && WORLD_INTEL_RE.test(prompt)) {
    scores.world_intel = 90;
    matchedSignals.push("world:worldbank-domar");
  }
  if (!hasHigherPriority && SCIENCE_PAPERS_RE.test(prompt)) {
    scores.science_papers = 90;
    matchedSignals.push("papers:arxiv-pubmed");
  }
  if (!hasHigherPriority && MED_LABS_RE.test(prompt)) {
    scores.med_labs = 89;
    matchedSignals.push("labs:med-record-interpreter");
  }
  if (!hasHigherPriority && PREDICTIVE_RE.test(prompt)) {
    scores.predictive = 89;
    matchedSignals.push("predict:15-engines");
  }
  if (!hasHigherPriority && SECOPS_SUITE_RE.test(prompt)) {
    scores.secops_suite = 90;
    matchedSignals.push("secops:twin-warroom-pqc-zkp");
  }
  if (
    !hasHigherPriority &&
    !scores.automotive &&
    !scores.energy_grid &&
    !scores.legal &&
    !scores.invest &&
    !scores.bible &&
    !scores.career &&
    !scores.deep_research &&
    !scores.global_markets &&
    !scores.world_intel &&
    !scores.science_papers &&
    !scores.med_labs &&
    !scores.predictive &&
    !scores.secops_suite &&
    !scores.space_universe &&
    !scores.earth_hazards &&
    !scores.global_nav &&
    KNOWLEDGE_LIBRARY_RE.test(prompt)
  ) {
    scores.knowledge_library = 88;
    matchedSignals.push("knowledge:curriculum-or-table-query");
  }

  // Evaluate Weather (strictly vetoed when building platforms, cold-chain maritime, clinical, defense, architect, space/earth/nav, promoted domain engines, or physics)
  const hasWeatherSignal =
    WEATHER_EXPLICIT_RE.test(prompt) ||
    (WEATHER_TEMP_WITH_TIME_RE.test(prompt) && WEATHER_TIME_RE.test(prompt));
  if (hasWeatherSignal) {
    if (
      scores.nasee ||
      scores.website_builder ||
      scores.architect ||
      hasClinicalVitalsOrSyndrome ||
      scores.dod_ic ||
      scores.rmf_grc ||
      scores.space_universe ||
      scores.earth_hazards ||
      scores.global_nav ||
      scores.legal ||
      scores.invest ||
      scores.automotive ||
      scores.bible ||
      scores.energy_grid ||
      scores.career ||
      scores.deep_research ||
      scores.global_markets ||
      scores.world_intel ||
      scores.science_papers ||
      scores.med_labs ||
      scores.predictive ||
      scores.secops_suite
    ) {
      vetoedRoutes.weather = "Vetoed by higher-priority software build, architect, clinical, defense, planetary, or promoted specialist intent";
    } else if (/\b(?:cold-?chain|cold-?storage|reefer|maritime|vessel|charter|postgis|postgresql|reactor|boiler|furnace|patient|sepsis)\b/i.test(prompt)) {
      vetoedRoutes.weather = "Vetoed by non-meteorological domain terms";
    } else {
      scores.weather = 87;
      matchedSignals.push("weather:meteorological-forecast");
    }
  }

  // Evaluate Sovereign Physics (#101-#116)
  const physicsMatch = matchSovereignTool(prompt);
  if (physicsMatch) {
    if (scores.nasee || scores.website_builder || hasClinicalVitalsOrSyndrome) {
      vetoedRoutes.sovereign_physics = "Vetoed by software build or clinical encounter context";
    } else if ((scores.rmf_grc || scores.dod_ic) && !EXPLICIT_HARD_PHYSICS_RE.test(prompt)) {
      vetoedRoutes.sovereign_physics = "Vetoed by RMF/DoD governance context";
    } else {
      scores.sovereign_physics = Math.max(82, Math.round(physicsMatch.confidence * 92));
      matchedSignals.push(`physics:${physicsMatch.tool.id}`);
    }
  }

  // Evaluate 81-Domain Omni STEM Solver only when no dedicated engine scored
  const hasAnySpecializedRoute = Object.keys(scores).some((k) => k !== "general_chat");
  if (!hasAnySpecializedRoute) {
    const omniDomain = detectLifeDomain(prompt);
    if (
      omniDomain !== "GENERAL_SOVEREIGN" &&
      omniDomain !== "CLINICAL_MEDICINE" &&
      omniDomain !== "RMF_CYBER_GRC" &&
      omniDomain !== "IT_DISTRIBUTED_SYSTEMS"
    ) {
      scores.omni_solver = 84;
      matchedSignals.push(`omni:${omniDomain}`);
    }
  }

  // Cross-domain vetoes for clean disambiguation
  if (scores.clinical && scores.clinical >= 92) {
    if (scores.website_builder) vetoedRoutes.website_builder = "Clinical patient safety override";
    if (scores.rmf_grc) vetoedRoutes.rmf_grc = "Clinical patient safety override";
    if (scores.dod_ic) vetoedRoutes.dod_ic = "Clinical patient safety override";
    delete scores.website_builder;
    delete scores.rmf_grc;
    delete scores.dod_ic;
  }

  if (scores.nasee && scores.nasee >= 95) {
    if (scores.website_builder) vetoedRoutes.website_builder = "Superseded by full NASEE directive";
    if (scores.rmf_grc) vetoedRoutes.rmf_grc = "SOC/governance inside NASEE build specification";
    if (scores.dod_ic) vetoedRoutes.dod_ic = "Defense/compliance inside NASEE build specification";
    if (scores.enterprise) vetoedRoutes.enterprise = "Enterprise features inside NASEE build specification";
    delete scores.website_builder;
    delete scores.rmf_grc;
    delete scores.dod_ic;
    delete scores.enterprise;
  }

  if (scores.website_builder && scores.website_builder >= 88) {
    if (scores.rmf_grc) vetoedRoutes.rmf_grc = "Compliance requirement inside website build prompt";
    if (scores.dod_ic) vetoedRoutes.dod_ic = "Defense requirement inside website build prompt";
    if (scores.cve_cyber) vetoedRoutes.cve_cyber = "Security feature inside website build prompt";
    delete scores.rmf_grc;
    delete scores.dod_ic;
    delete scores.cve_cyber;
  }

  if (scores.dod_ic && scores.cve_cyber) {
    vetoedRoutes.cve_cyber = "Superseded by DoD/IC authorization & cross-domain boundary context";
    delete scores.cve_cyber;
  }

  // Pick highest scoring route (deterministic tie-break priority order)
  const PRIORITY_ORDER: NoctisRouteEngineId[] = [
    "clinical",
    "nasee",
    "website_builder",
    "architect",
    "dod_ic",
    "cve_cyber",
    "science",
    "rmf_grc",
    "ndkrs_rule",
    "nups",
    "catalog260",
    "enterprise",
    "assistant",
    "secops_suite",
    "automotive",
    "energy_grid",
    "global_markets",
    "world_intel",
    "science_papers",
    "med_labs",
    "predictive",
    "legal",
    "invest",
    "bible",
    "deep_research",
    "career",
    "sovereign_physics",
    "space_universe",
    "earth_hazards",
    "global_nav",
    "weather",
    "omni_solver",
    "knowledge_library",
    "general_chat",
  ];

  let winningRoute: NoctisRouteEngineId = "general_chat";
  let winningScore = scores.general_chat ?? 60;

  for (const id of PRIORITY_ORDER) {
    const candidateScore = scores[id] ?? 0;
    if (candidateScore > winningScore || (candidateScore === winningScore && id !== "general_chat" && winningRoute === "general_chat")) {
      winningScore = candidateScore;
      winningRoute = id;
    }
  }

  const meta = ROUTE_LABELS[winningRoute];
  const slashMeta = NOCTIS_SLASH_ROUTES.find((r) => r.routeId === winningRoute);

  return {
    routeId: winningRoute,
    label: slashMeta?.label || meta.label,
    confidence: Math.min(99, Math.max(55, winningScore)),
    override: false,
    effectivePrompt: prompt || original,
    matchedSignals,
    vetoedRoutes,
    scores,
    targetPanel: slashMeta?.targetPanel || getPanelSpec(meta.targetPanel).id,
  };
}

const WEBSITE_REFINEMENT_CUE_RE =
  /\b(?:dark\s+(?:mode|theme)|light\s+(?:mode|theme)|add\s+(?:french|spanish|arabic|german|multilingual|booking|checkout|table|section|pricing|faq|testimonials?)|switch\s+(?:it\s+|the\s+\w+\s+|to\s+)?(?:dark|light|vector|photo|french|spanish)|change\s+(?:the\s+)?(?:color|palette|accent|theme|layout|font)|rebuild|regenerate)\b/i;

export function classifyMultiTurnIntent(
  turns: Array<{ role: "user" | "assistant"; content: string }>,
): NoctisIntentDecision {
  const cleanList = Array.isArray(turns) ? turns : [];
  let lastUserIdx = -1;
  for (let i = cleanList.length - 1; i >= 0; i--) {
    if (cleanList[i]?.role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  const latest = lastUserIdx >= 0 ? cleanList[lastUserIdx]!.content : "";
  const direct = classifyNoctisIntent(latest);

  if (direct.override || direct.routeId !== "general_chat" || lastUserIdx <= 0) {
    return direct;
  }

  // Latest message had no standalone specialized engine trigger; evaluate prior conversation context
  const priorTurns = cleanList.slice(0, lastUserIdx);
  let priorRoute: NoctisRouteEngineId | null = null;
  for (let i = priorTurns.length - 1; i >= 0; i--) {
    const t = priorTurns[i];
    if (!t) continue;
    if (t.role === "assistant") {
      const stamped = parseRouteStamp(t.content).stamp?.routeId;
      if (stamped && stamped !== "general_chat") {
        priorRoute = stamped;
        break;
      }
    } else if (t.role === "user") {
      const classified = classifyNoctisIntent(t.content).routeId;
      if (classified !== "general_chat") {
        priorRoute = classified;
        break;
      }
    }
  }

  if (!priorRoute) {
    return direct;
  }

  // Handle explicit website builder refinements cleanly without losing Forge routing
  if ((priorRoute === "website_builder" || priorRoute === "nasee") && WEBSITE_REFINEMENT_CUE_RE.test(direct.effectivePrompt)) {
    const meta = ROUTE_LABELS.website_builder;
    const slashMeta = NOCTIS_SLASH_ROUTES.find((r) => r.routeId === "website_builder");
    return {
      routeId: "website_builder",
      label: slashMeta?.label || meta.label,
      confidence: 84,
      override: false,
      effectivePrompt: direct.effectivePrompt,
      matchedSignals: ["multi-turn:website-refinement"],
      vetoedRoutes: {},
      scores: { ...direct.scores, website_builder: 84 },
      targetPanel: slashMeta?.targetPanel || meta.targetPanel,
    };
  }

  const followUp = resolveFollowUpContext(cleanList, direct.effectivePrompt);
  if (followUp.isFollowUp && !followUp.topicShiftDetected && !followUp.shouldIsolateEncounter) {
    if (
      (priorRoute === "clinical" && followUp.relation === "same_patient_followup") ||
      ((priorRoute === "rmf_grc" ||
        priorRoute === "dod_ic" ||
        priorRoute === "weather" ||
        priorRoute === "sovereign_physics" ||
        priorRoute === "cve_cyber" ||
        priorRoute === "space_universe" ||
        priorRoute === "earth_hazards" ||
        priorRoute === "global_nav" ||
        priorRoute === "architect" ||
        priorRoute === "legal" ||
        priorRoute === "invest" ||
        priorRoute === "automotive" ||
        priorRoute === "bible" ||
        priorRoute === "energy_grid" ||
        priorRoute === "career" ||
        priorRoute === "deep_research" ||
        priorRoute === "omni_solver" ||
        priorRoute === "global_markets" ||
        priorRoute === "world_intel" ||
        priorRoute === "science_papers" ||
        priorRoute === "med_labs" ||
        priorRoute === "predictive" ||
        priorRoute === "secops_suite" ||
        priorRoute === "knowledge_library") &&
        (followUp.relation === "coreference" || followUp.relation === "what_if_parameter_shift" || followUp.relation === "continuation"))
    ) {
      const meta = ROUTE_LABELS[priorRoute];
      const slashMeta = NOCTIS_SLASH_ROUTES.find((r) => r.routeId === priorRoute);
      return {
        routeId: priorRoute,
        label: slashMeta?.label || meta.label,
        confidence: 82,
        override: false,
        effectivePrompt: direct.effectivePrompt,
        matchedSignals: [`multi-turn:carry-${priorRoute}`],
        vetoedRoutes: {},
        scores: { ...direct.scores, [priorRoute]: 82 },
        targetPanel: slashMeta?.targetPanel || meta.targetPanel,
      };
    }
  }

  return direct;
}
