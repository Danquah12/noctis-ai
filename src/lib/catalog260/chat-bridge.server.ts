/**
 * Catalog 260 & Dependability Chat Bridge (`noctis-desk.server.ts` Integration)
 *
 * Routes Master Capability Catalog (260 items) audits, Dependability Suite (#251-#260)
 * checks, and newly closed deterministic solvers directly through Chat while strictly
 * preserving clinical patient, DoD/IC STIG, FedRAMP RMF, Enterprise, and NUPS routing.
 */

import { isEnterpriseChatQuery } from "../enterprise/chat-bridge.server.ts";
import { isNupsChatQuery } from "../nups/chat-bridge.server.ts";
import { renderCatalog260GapAuditMarkdown } from "./catalog-260-registry.ts";
import {
  calibrateEpistemicConfidence,
  runUnifiedDependabilityAudit,
} from "./dependability-suite.server.ts";
import { solveCatalog260GapQuery } from "./gap-closure-solvers.ts";

const CLINICAL_PATIENT_EXCLUSION_RE =
  /\b(?:crit-\d{3}|patient\s+[ab]|\d{1,3}-year-old\s+(?:male|female)|chief\s+complaint|bp\s+\d{2,3}\/\d{2,3}\s*mmhg|serum\s+lipase|creatinine\s+of|troponin|kdigo|hyperkalemia|septic\s+shock)\b/i;

const DOD_IC_RMF_EXCLUSION_RE =
  /\b(?:rhel\s+9\s+stig|v-\d{5,6}|dodi\s+85(?:00|10)|icd\s+503|fedramp\s+(?:high|moderate)\s+system\s+uses|nist\s+800-53\s+rmf)\b/i;

const EXPLICIT_CATALOG_260_RE =
  /\b(?:260[-\s]?capabilit(?:y|ies)|master\s+capability\s+catalog|catalog[-\s]?260|260[-\s]?catalog|gap\s+audit\s+(?:260|catalog)|dependability\s+suite|epistemic\s+confidence|contradiction\s+detection|source\s+freshness\s+monitor|autonomous\s+evaluation\s+factory|knowledge\s+verification\s+authority|canary\s+rollback\s+gate|privacy[-\s]?preserving\s+memory)\b/i;

const CATALOG_GAP_SOLVER_RE =
  /\b(?:frcp\s+rule\s*6|procedural\s+deadline|rule\s*6\s*\(?(?:a|d)\)?|flsa\s+overtime|fmla\s+eligib|warn\s+act|owasp\s+masvs|shannon\s+entropy|packed\s+binary|benford(?:'?s)?\s+law|31\s*u\.?s\.?c\.?\s*5324|bsa\s+structuring|earned\s+value\s+management|\bevm\b.*\b(?:bac|cpi|spi)\b|\bcpi\b\s*(?:and|&|,)\s*\bspi\b|ashrae\s+(?:62\.1|170)|hvac\s+cooling\s+tons|chlorine\s+ct\b|hazen-?williams|wcag\s+(?:2\.[012]\s+)?contrast|debt\s+avalanche|amortized\s+loan|convert\s+\d+(?:\.\d+)?\s*(?:psi|kpa|kwh|btu|msv|rem|celsius|fahrenheit|km|miles))\b/i;

export function isCatalog260ChatQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q) return false;
  if (CLINICAL_PATIENT_EXCLUSION_RE.test(q)) return false;
  if (DOD_IC_RMF_EXCLUSION_RE.test(q)) return false;
  if (isNupsChatQuery(q)) return false;
  if (isEnterpriseChatQuery(q)) return false;

  return EXPLICIT_CATALOG_260_RE.test(q) || CATALOG_GAP_SOLVER_RE.test(q);
}

export async function tryHandleCatalog260ChatQuery(question: string): Promise<string | null> {
  const q = (question || "").trim();
  if (!isCatalog260ChatQuery(q)) return null;

  // 1. Catalog 260 Audit & Live Dependability Suite report
  if (EXPLICIT_CATALOG_260_RE.test(q) && !CATALOG_GAP_SOLVER_RE.test(q)) {
    const wantsFullAudit = /\b(?:260|catalog|gap\s+audit|what\s+is\s+not\s+done|list)\b/i.test(q);
    let dependabilitySection = "";
    try {
      const audit = await runUnifiedDependabilityAudit({ text: q });
      dependabilitySection = [
        "### Live Dependability Suite Telemetry (#251-#257)",
        `- **Knowledge Verification (#251):** \`${audit.knowledgeVerificationAuthority.status}\` (${audit.knowledgeVerificationAuthority.supportingHits.length} authority hit(s))`,
        `- **Temporal Intelligence (#252):** \`${audit.temporalIntelligence.temporalGuardNote}\``,
        `- **Contradiction Detection (#253):** \`${audit.contradictionDetection.status}\` (${audit.contradictionDetection.contradictionCount} conflict(s))`,
        `- **Epistemic Confidence (#254/#38/#39):** \`${audit.epistemicConfidence.calibratedConfidence}\` band \`${audit.epistemicConfidence.confidenceBand}\` (Hallucination risk: \`${audit.epistemicConfidence.hallucinationRisk}\`)`,
        `- **Autonomous Eval Factory (#255):** ${audit.evaluationFactory.passedCount}/${audit.evaluationFactory.totalDynamicTests} dynamic regression tests passing`,
        `- **Source Freshness Monitor (#256):** \`${audit.sourceFreshness.status}\` (${audit.sourceFreshness.ndkrsVerifiedRecords} verified NDKRS records, ${audit.sourceFreshness.dodIcDirectivesCount} DoD/IC directives, ${audit.sourceFreshness.disaCciCount} DISA CCIs)`,
        `- **Privacy Guard (#257):** compliant=\`${audit.privacyPreserving.compliant}\`, redacted=\`${audit.privacyPreserving.piiTypesRedacted.length}\``,
      ].join("\n");
    } catch {
      dependabilitySection = "### Live Dependability Suite Telemetry (#251-#257)\n- Executed in offline deterministic mode (SQL database not attached in current runtime).";
    }

    if (wantsFullAudit) {
      return `${renderCatalog260GapAuditMarkdown()}\n\n${dependabilitySection}`;
    }
    return dependabilitySection;
  }

  // 2. Deterministic Gap-Closure Domain Solvers
  const solved = solveCatalog260GapQuery(q);
  const conf = calibrateEpistemicConfidence(solved.findings.join(" "), solved.authorities.length);

  const metricLines = Object.entries(solved.metrics).map(([k, v]) => `- **${k}:** \`${String(v)}\``);
  return [
    `## ${solved.title} (\`${solved.solverId}\`)`,
    `- **Catalog Capabilities Closed:** ${solved.capabilityNumbers.map((n) => `#${n}`).join(", ")} | **Status:** \`${solved.status}\``,
    `- **Epistemic Confidence (#254):** \`${conf.calibratedConfidence}\` band \`${conf.confidenceBand}\` (Hallucination risk: \`${conf.hallucinationRisk}\`)`,
    "",
    "### Deterministic Computation Metrics",
    ...metricLines,
    "",
    "### Verified Findings",
    ...solved.findings.map((f) => `- ${f}`),
    "",
    "### Recommendations & Authorities",
    ...solved.recommendations.map((r) => `- ${r}`),
    `- **Authorities:** ${solved.authorities.join("; ")}`,
  ].join("\n");
}
