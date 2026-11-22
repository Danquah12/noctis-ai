/**
 * NDKRS Confidence-Scored Intent & Domain Router (Server-Side)
 */

import { isUniversalClinicalQuestion } from "../noctis-universal-clinical.server.ts";
import { isRmfGrcQuery } from "../noctis-rmf-engine.ts";
import type { NdkrsDomain, NdkrsRouterDecision } from "./types.ts";

const DOMAIN_PATTERNS: Record<Exclude<NdkrsDomain, "general">, RegExp[]> = {
  clinical: [
    /\b(kdigo|creatinine|aki|winters|winter's|bicarbonate|anion\s+gap|digoxin|digifab|sepsis|map|blood\s+pressure|potassium|hyperkalemia|patient|icu|triage)\b/gi,
    /\b(mg\/dl|meq\/l|mmol\/l|mmhg|ml\/kg\/h)\b/gi,
  ],
  rmf: [
    /\b(rmf|nist|800-53|800-37|800-171|fedramp|oscal|fips\s*199|fips\s*200|poa&m|ssp|sar|sap|ato|cato|isso|issm|sca|cmmc|sprs)\b/gi,
    /\b(ac-\d+|au-\d+|cm-\d+|ia-\d+|ra-\d+|sc-\d+|si-\d+)\b/gi,
  ],
  cybersecurity: [
    /\b(cve-\d{4}-\d{4,7}|cisa\s*kev|mitre\s*att&ck|owasp|zero\s*trust|encryption|aes-256|hmac|vulnerability|firewall|ransomware|siem)\b/gi,
  ],
  legal: [
    /\b(statute|hipaa|21\s*u\.?s\.?c|45\s*cfr|44\s*u\.?s\.?c|fisma|non-device\s+cds|fda|irac|creac|liability|compliance\s+law|regulation|contract|tort)\b/gi,
  ],
  science: [
    /\b(ideal\s+gas|pv\s*=\s*nrt|thermodynamics|molar|chemistry|physics|biology|quantum|enthalpy|entropy|reynolds|kinetic)\b/gi,
  ],
  engineering: [
    /\b(ohm['’]?s\s+law|voltage|current|resistance|wattage|power\s+dissipation|shannon-hartley|bandwidth|iso\s*14971|iec\s*62304|fmea|tokamak|structural|beam)\b/gi,
  ],
};

const RECOMMENDED_RULES: Record<NdkrsDomain, string[]> = {
  clinical: ["CLIN-KDIGO-AKI", "CLIN-MAP", "CLIN-WINTERS"],
  rmf: ["RMF-FIPS-199", "RMF-POAM-SLA"],
  cybersecurity: ["RMF-POAM-SLA"],
  legal: ["LEGAL-CDS-21USC360J"],
  engineering: ["ENG-OHMS-POWER"],
  science: ["SCI-IDEAL-GAS"],
  general: [],
};

export function routeNdkrsQuery(query: string): NdkrsRouterDecision {
  const q = (query || "").trim();
  const scores: Record<NdkrsDomain, number> = {
    clinical: 0,
    rmf: 0,
    cybersecurity: 0,
    legal: 0,
    science: 0,
    engineering: 0,
    general: 0.15,
  };

  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS) as Array<
    [Exclude<NdkrsDomain, "general">, RegExp[]]
  >) {
    let hits = 0;
    for (const rx of patterns) {
      const m = q.match(rx);
      if (m) hits += m.length;
    }
    scores[domain] = Number(Math.min(0.95, hits * 0.22).toFixed(2));
  }

  if (isUniversalClinicalQuestion(q)) {
    scores.clinical = Math.max(scores.clinical, 0.92);
  }
  if (isRmfGrcQuery(q)) {
    scores.rmf = Math.max(scores.rmf, 0.9);
  }

  let primaryDomain: NdkrsDomain = "general";
  let topScore = scores.general;
  for (const [dom, sc] of Object.entries(scores) as Array<[NdkrsDomain, number]>) {
    if (sc > topScore) {
      topScore = sc;
      primaryDomain = dom;
    }
  }

  const isLiveTool = /\b(cve-\d{4}-\d{4,7}|latest\s+today|current\s+weather)\b/i.test(q);
  const riskTier: NdkrsRouterDecision["riskTier"] =
    primaryDomain === "clinical" || primaryDomain === "rmf"
      ? "REGULATED_CRITICAL"
      : primaryDomain === "legal" || primaryDomain === "cybersecurity" || primaryDomain === "engineering" || primaryDomain === "science"
      ? "HIGH_ASSURANCE"
      : "STANDARD";

  const hasNumericOrCalcSignals = /\d+(?:\.\d+)?\s*(?:mg\/dl|mmhg|meq\/l|mmol\/l|volt|ohm|amp|mol|kelvin|atm|days?|high|moderate|low)/i.test(q);
  const executionStrategy: NdkrsRouterDecision["executionStrategy"] = isLiveTool
    ? "LIVE_TOOL_FIRST"
    : primaryDomain === "clinical" || primaryDomain === "rmf" || (hasNumericOrCalcSignals && RECOMMENDED_RULES[primaryDomain].length > 0)
    ? "DETERMINISTIC_FIRST"
    : primaryDomain !== "general"
    ? "HYBRID_RAG_FIRST"
    : "LLM_SYNTHESIS";

  return {
    primaryDomain,
    domainScores: scores,
    confidence: Number(Math.min(0.99, Math.max(0.25, topScore)).toFixed(2)),
    riskTier,
    executionStrategy,
    recommendedRuleIds: RECOMMENDED_RULES[primaryDomain] ?? [],
    requiresFactLock: riskTier !== "STANDARD",
  };
}
