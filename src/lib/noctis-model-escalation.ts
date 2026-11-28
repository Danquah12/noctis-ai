/**
 * Noctis Smart Model Escalation Classifier (Pillar #3)
 *
 * Routes trivial/casual queries to fast low-latency models while automatically
 * escalating multi-constraint compliance, regulatory, clinical, or cross-domain
 * prompts to higher-fidelity reasoning models (`gpt-4o`, `grok-3`, `gemini-2.5-pro`).
 */

import type { ServerLlmProvider } from "./noctis-provider-routing.ts";

export type ModelEscalationTier = "fast" | "reasoning";

export interface ComplexityAssessment {
  tier: ModelEscalationTier;
  score: number;
  reasons: string[];
  providerOrder: ServerLlmProvider[];
}

const REGULATORY_OR_STD_PATTERNS: [RegExp, string][] = [
  [/\bfips\s*(?:140|199|200|20[1345])\b/gi, "FIPS standard"],
  [/\b(?:sp\s*)?800-(?:18|30|34|37|47|50|53a?|60|63|82|86|88|115|122|137|160|161|171|190|207|218)\b/gi, "NIST SP 800-series"],
  [/\bfedramp\b|\bfisma\b|\b3pao\b|\bpoa&?m\b|\bato\b|\boscal\b/gi, "Federal RMF/FedRAMP"],
  [/\b(?:dodi?|dodd?|dodm)\s*\d{4}(?:\.\d+)?\b|\bicd\s*\d{3}\b|\bcnss[ipam]+\s*(?:no\.?\s*)?\d+\b/gi, "DoD/IC Directive"],
  [/\b(?:hipaa|phi|itar|ear|cui|dfars|cmmc|foci|nispom|gdpr|sox)\b/gi, "Regulated Data/Statutory"],
  [/\b(?:mitre\s+att&ck|t\d{4}(?:\.\d{3})?|disa\s+stig|cci-\d+)\b/gi, "Threat/STIG Mapping"],
  [/\b(?:examine|interview|test)\b[\s\S]{0,60}\b(?:examine|interview|test)\b/i, "SP 800-53A EIT"],
];

export function assessPromptComplexity(
  question: string,
  opts: { domainHint?: string; forceReasoning?: boolean } = {},
): ComplexityAssessment {
  const q = (question || "").trim();
  const reasons: string[] = [];
  let score = 0;

  if (opts.forceReasoning) {
    score += 4;
    reasons.push("Explicit reasoning mode requested");
  }

  if (q.length >= 400) {
    score += 3;
    reasons.push("Dense multi-clause prompt (>=400 chars)");
  } else if (q.length >= 220) {
    score += 1;
    reasons.push("Substantive multi-sentence prompt");
  }

  // Numbered or bulleted multi-fact audit scenarios
  const numberedFacts = q.match(/(?:^|\n|\s)(?:\d+[.)]|\([a-z0-9]\))\s+\S/gi) || [];
  if (numberedFacts.length >= 2) {
    score += 3;
    reasons.push(`${numberedFacts.length} enumerated audit facts`);
  }

  // Count distinct standards/frameworks referenced
  let stdHits = 0;
  for (const [re] of REGULATORY_OR_STD_PATTERNS) {
    const matches = q.match(re);
    if (matches && matches.length > 0) {
      stdHits += Math.min(2, matches.length);
    }
  }
  if (stdHits >= 3) {
    score += 3;
    reasons.push(`${stdHits} regulatory/technical standard citations`);
  } else if (stdHits >= 1) {
    score += 1;
  }

  if (/\b(?:markdown\s+table|table\s+with|on\s+a\s+table|in\s+a\s+table|matrix|crosswalk)\b/i.test(q)) {
    score += 1;
    reasons.push("Structured table/crosswalk deliverable requested");
  }

  if (/\b(?:audit|evaluate|assess|remediat\w*|withdrawn|deterministic|verdict|ato|reciprocity|sanitiz\w*|categoriz\w*)\b/i.test(q)) {
    score += 1;
    reasons.push("Evaluative compliance/governance judgment");
  }

  if (opts.domainHint && ["rmf_grc", "dod_ic", "clinical", "legal", "invest"].includes(opts.domainHint)) {
    score += 1;
    reasons.push(`High-assurance domain (${opts.domainHint})`);
  }

  const tier: ModelEscalationTier = score >= 4 ? "reasoning" : "fast";
  const providerOrder: ServerLlmProvider[] =
    tier === "reasoning"
      ? ["openai", "xai", "gemini", "custom", "groq"]
      : ["custom", "xai", "gemini", "openai", "groq"];

  return {
    tier,
    score,
    reasons,
    providerOrder,
  };
}
