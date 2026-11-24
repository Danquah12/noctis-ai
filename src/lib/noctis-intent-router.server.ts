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
  getPanelSpec,
  NOCTIS_SLASH_ROUTES,
  parseRouteStamp,
  stripLeadingSlashOverride,
  type NoctisPanelId,
  type NoctisRouteEngineId,
  type NoctisRouteStamp,
} from "./noctis-capability-registry.ts";
import { resolveFollowUpContext } from "./noctis-followup-resolver.ts";
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
  /\b(?:AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PM|PS|PT|RA|SA|SC|SI|SR)-\d{1,2}(?:\(\d{1,2}\))?\b/i;

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

  // Evaluate Weather (strictly vetoed when building platforms, cold-chain maritime, clinical, defense, or physics)
  const hasWeatherSignal =
    WEATHER_EXPLICIT_RE.test(prompt) ||
    (WEATHER_TEMP_WITH_TIME_RE.test(prompt) && WEATHER_TIME_RE.test(prompt));
  if (hasWeatherSignal) {
    if (scores.nasee || scores.website_builder || hasClinicalVitalsOrSyndrome || scores.dod_ic || scores.rmf_grc) {
      vetoedRoutes.weather = "Vetoed by higher-priority software build, clinical, or defense intent";
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
    "dod_ic",
    "cve_cyber",
    "science",
    "rmf_grc",
    "ndkrs_rule",
    "nups",
    "catalog260",
    "enterprise",
    "assistant",
    "sovereign_physics",
    "weather",
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
      ((priorRoute === "rmf_grc" || priorRoute === "dod_ic" || priorRoute === "weather" || priorRoute === "sovereign_physics" || priorRoute === "cve_cyber") &&
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
