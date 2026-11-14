import {
  getNoctisEngine,
  listNoctisEngines,
  type NoctisEngineDomain,
  type NoctisEngineManifest,
} from "./noctis-engine-registry.ts";

export type NoctisPlanStep = {
  stepId: string;
  engineId: string;
  capability: string;
  purpose: string;
  dependsOn: string[];
  executionMode: "analysis";
  requiresEvidence: boolean;
  requiresHumanReview: boolean;
};

export type NoctisOrchestrationPlan = {
  planVersion: "1.0";
  planId: string;
  status: "plan_only";
  requestSummary: string;
  selectedDomains: NoctisEngineDomain[];
  steps: NoctisPlanStep[];
  approvalRequired: boolean;
  evidenceRequired: boolean;
  executionBlocked: true;
  limitations: string[];
};

type DomainRule = {
  domain: NoctisEngineDomain;
  pattern: RegExp;
  purpose: string;
};

const DOMAIN_RULES: readonly DomainRule[] = [
  { domain: "cybersecurity", pattern: /\b(cyber|security|vulnerab|exploit|sast|dast|penetration|pentest|malware|cve|incident response|threat model)\b/i, purpose: "Assess security findings, threats, controls and authorized validation." },
  { domain: "risk", pattern: /\b(rmf|nist 800|800-53|poa.?m|ato|risk|compliance|control assessment|governance)\b/i, purpose: "Map requirements, controls, evidence, gaps and residual risk." },
  { domain: "health", pattern: /\b(clinical|patient|diagnos|medical|pathology|laboratory|lab result|medication|symptom|healthcare)\b/i, purpose: "Provide bounded clinical or health-information analysis with required human review." },
  { domain: "science", pattern: /\b(science|scientific|hypothesis|experiment|biology|chemistry|physics|research paper|statistical model)\b/i, purpose: "Evaluate scientific claims, methods, models and uncertainty." },
  { domain: "engineering", pattern: /\b(engineer|microgrid|solar|battery|inverter|structural|electrical|mechanical|civil design|load calculation|power system)\b/i, purpose: "Analyze engineering requirements, calculations, constraints and failure modes." },
  { domain: "legal", pattern: /\b(legal|law|statute|regulation|contract|court|litigation|jurisdiction|case law)\b/i, purpose: "Research legal authorities and identify jurisdiction-specific issues for professional review." },
  { domain: "defense", pattern: /\b(defense|defence|dod|military|sigint|imint|electronic warfare|ew telemetry|mission assurance)\b/i, purpose: "Analyze defensive intelligence, protection and resilience within authorized boundaries." },
  { domain: "research", pattern: /\b(research|literature review|sources|compare studies|evidence synthesis|investigate|citation)\b/i, purpose: "Coordinate multi-source investigation and evidence synthesis." },
  { domain: "professional", pattern: /\b(profession|career|workflow|business process|operations|professional|trade)\b/i, purpose: "Classify the professional task and develop a structured workflow." },
];

const CAPABILITY_BY_DOMAIN: Partial<Record<NoctisEngineDomain, string>> = {
  cybersecurity: "cyber.vulnerability.assess",
  risk: "risk.rmf.assess",
  health: "health.clinical.assess",
  science: "science.research.analyze",
  engineering: "engineering.design.analyze",
  legal: "legal.research.analyze",
  defense: "defense.telemetry.assess",
  research: "research.investigate",
  professional: "profession.workflow.plan",
};

function stepFor(
  manifest: NoctisEngineManifest,
  capability: string,
  purpose: string,
  dependsOn: string[],
): NoctisPlanStep {
  return {
    stepId: manifest.id.replace(/[^a-z0-9]+/gi, "-"),
    engineId: manifest.id,
    capability,
    purpose,
    dependsOn,
    executionMode: "analysis",
    requiresEvidence: manifest.evidenceRequired,
    requiresHumanReview: manifest.humanReviewRequired,
  };
}

/**
 * Builds a deterministic, non-executing plan from explicit domain signals.
 * This is a planning aid, not an agent runtime, authorization check, or proof
 * that a selected engine is integrated or operational.
 */
export function buildNoctisOrchestrationPlan(input: {
  requestId: string;
  question: string;
}): NoctisOrchestrationPlan {
  const requestId = input.requestId.trim().slice(0, 120);
  const question = input.question.trim().slice(0, 4000);
  if (!requestId || question.length < 3) {
    throw new Error("A request ID and a question of at least 3 characters are required.");
  }

  const selectedDomains = DOMAIN_RULES
    .filter((rule) => rule.pattern.test(question))
    .map((rule) => rule.domain);
  const rules = DOMAIN_RULES.filter((rule) => selectedDomains.includes(rule.domain));
  const manifests = listNoctisEngines();
  const steps: NoctisPlanStep[] = [];
  const evidence = getNoctisEngine("noctis.evidence.retrieval");
  const integrity = getNoctisEngine("noctis.evidence.integrity");
  const checks = getNoctisEngine("noctis.core.checks");

  // A core verification step is planned for every request. It does not imply
  // that the verification service has run.
  if (checks) {
    steps.push(stepFor(checks, "checks.evaluate", "Apply deterministic input and output checks.", []));
  }

  const selectedManifests = rules.map((rule) => ({
    rule,
    manifest: manifests.find((item) => item.domain === rule.domain && item.id !== "noctis.evidence.retrieval" && item.id !== "noctis.evidence.integrity"),
  })).filter((item): item is { rule: DomainRule; manifest: NoctisEngineManifest } => Boolean(item.manifest));

  const needsEvidence = selectedManifests.some(({ manifest }) => manifest.evidenceRequired);
  if (needsEvidence && evidence) {
    steps.push(stepFor(evidence, "evidence.retrieve", "Retrieve approved evidence with provenance before specialist analysis.", []));
  }

  for (const { rule, manifest } of selectedManifests) {
    const capability = CAPABILITY_BY_DOMAIN[rule.domain];
    if (!capability || !manifest.capabilities.includes(capability)) continue;
    steps.push(stepFor(
      manifest,
      capability,
      rule.purpose,
      [ ...(checks ? [checks.id.replace(/[^a-z0-9]+/gi, "-")] : []), ...(manifest.evidenceRequired && evidence ? [evidence.id.replace(/[^a-z0-9]+/gi, "-")] : []) ],
    ));
  }

  if (needsEvidence && integrity && evidence) {
    steps.push(stepFor(
      integrity,
      "evidence.integrity.validate",
      "Validate citation identities and excerpt hashes after evidence has been attached.",
      [evidence.id.replace(/[^a-z0-9]+/gi, "-")],
    ));
  }

  const approvalRequired = selectedManifests.some(({ manifest }) => manifest.humanReviewRequired);
  const limitations = [
    "This output is a deterministic plan only; no specialist engine or external tool was executed.",
    "Registry presence does not establish runtime integration, operational readiness, or production approval.",
    "A trusted server must derive tenant identity and scopes from the authenticated session and resolve evidence and approvals authoritatively.",
  ];
  if (!selectedManifests.length) limitations.push("No specialist domain matched confidently; route to general reasoning or request clarification.");
  if (approvalRequired) limitations.push("One or more selected specialists require human review before consequential decisions or actions.");

  return {
    planVersion: "1.0",
    planId: `noctis-plan:${requestId}`,
    status: "plan_only",
    requestSummary: question,
    selectedDomains,
    steps,
    approvalRequired,
    evidenceRequired: needsEvidence,
    executionBlocked: true,
    limitations,
  };
}
