/**
 * Noctis engine registry foundation.
 *
 * This registry is intentionally descriptive: it records source-backed engine
 * identities and capability metadata without importing or executing specialist
 * modules. A registry entry does not imply that the engine is runtime-integrated
 * or production-approved.
 */

export type NoctisEngineDomain =
  | "core"
  | "cybersecurity"
  | "risk"
  | "health"
  | "science"
  | "engineering"
  | "legal"
  | "defense"
  | "research"
  | "professional";

export type NoctisEngineLifecycle =
  | "registered"
  | "implemented"
  | "integrated"
  | "validated"
  | "operational"
  | "deprecated";

export interface NoctisEngineManifest {
  id: string;
  name: string;
  version: string;
  domain: NoctisEngineDomain;
  description: string;
  sourcePath: string;
  capabilities: readonly string[];
  requiredScopes: readonly string[];
  dependencies: readonly string[];
  lifecycle: NoctisEngineLifecycle;
  executionModes: readonly ("analysis" | "assisted" | "supervised" | "approved_execution")[];
  dataClassification: "public" | "internal" | "confidential" | "restricted";
  evidenceRequired: boolean;
  humanReviewRequired: boolean;
}

export interface NoctisEngineRequest<TInput = unknown> {
  requestId: string;
  tenantId: string;
  actorId: string;
  engineId: string;
  capability: string;
  input: TInput;
  context: {
    correlationId: string;
    jurisdiction?: string;
    evidenceIds?: readonly string[];
  };
  authorization: {
    scopes: readonly string[];
    executionMode: "analysis" | "assisted" | "supervised" | "approved_execution";
    approvalId?: string;
  };
  constraints: {
    dataClassification: "public" | "internal" | "confidential" | "restricted";
    deadlineMs?: number;
    maxToolCalls?: number;
    maxCostUsd?: number;
  };
}

export type NoctisEngineRequestValidation =
  | { ok: true; manifest: NoctisEngineManifest }
  | { ok: false; code: "ENGINE_NOT_FOUND" | "CAPABILITY_NOT_SUPPORTED" | "EXECUTION_MODE_NOT_ALLOWED" | "EVIDENCE_REQUIRED" | "APPROVAL_REQUIRED" | "SCOPE_REQUIRED" | "DATA_CLASSIFICATION_EXCEEDED" | "INVALID_REQUEST"; message: string };

const MANIFESTS: readonly NoctisEngineManifest[] = [
  {
    id: "noctis.core.orchestrator", name: "Noctis Core Orchestrator", version: "0.1.0",
    domain: "core", description: "Intent routing and orchestration foundation.",
    sourcePath: "src/lib/noctis-orchestrator.ts", capabilities: ["intent.route", "task.classify"],
    requiredScopes: ["noctis:route"],
    dependencies: ["noctis.core.checks"], lifecycle: "registered",
    executionModes: ["analysis", "assisted"], dataClassification: "internal",
    evidenceRequired: false, humanReviewRequired: false,
  },
  {
    id: "noctis.cyber.vulnerability", name: "Cyber Vulnerability Intelligence", version: "0.1.0",
    domain: "cybersecurity", description: "Vulnerability assessment and defensive validation.",
    sourcePath: "src/lib/noctis-vuln-engine.ts", capabilities: ["cyber.vulnerability.assess", "cyber.finding.validate"],
    requiredScopes: ["cyber:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted", "supervised"], dataClassification: "confidential",
    evidenceRequired: true, humanReviewRequired: true,
  },
  {
    id: "noctis.cyber.sast", name: "SAST Intelligence", version: "0.1.0",
    domain: "cybersecurity", description: "Static application security analysis.",
    sourcePath: "src/lib/noctis-sast-engine.ts", capabilities: ["cyber.sast.analyze", "cyber.finding.triage"],
    requiredScopes: ["cyber:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted"], dataClassification: "confidential",
    evidenceRequired: true, humanReviewRequired: true,
  },
  {
    id: "noctis.risk.rmf", name: "RMF and Governance Risk", version: "0.1.0",
    domain: "risk", description: "Risk management framework and control assessment.",
    sourcePath: "src/lib/noctis-rmf-engine.ts", capabilities: ["risk.rmf.assess", "risk.control.map"],
    requiredScopes: ["risk:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted", "supervised"], dataClassification: "confidential",
    evidenceRequired: true, humanReviewRequired: true,
  },
  {
    id: "noctis.health.clinical", name: "Clinical Decision Support", version: "0.1.0",
    domain: "health", description: "Clinical calculation and decision-support modules.",
    sourcePath: "src/lib/noctis-clinical-engine.ts", capabilities: ["health.clinical.assess", "health.calculation.run"],
    requiredScopes: ["health:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted"], dataClassification: "restricted",
    evidenceRequired: true, humanReviewRequired: true,
  },
  {
    id: "noctis.science.universal", name: "Universal Science", version: "0.1.0",
    domain: "science", description: "Scientific reasoning and computational science modules.",
    sourcePath: "src/lib/noctis-universal-science-engine.ts", capabilities: ["science.research.analyze", "science.model.evaluate"],
    requiredScopes: ["science:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted", "supervised"], dataClassification: "internal",
    evidenceRequired: true, humanReviewRequired: false,
  },
  {
    id: "noctis.engineering.architect", name: "Engineering Architecture", version: "0.1.0",
    domain: "engineering", description: "Engineering design and deterministic calculation modules.",
    sourcePath: "src/lib/noctis-architect-engine.ts", capabilities: ["engineering.design.analyze", "engineering.calculation.run"],
    requiredScopes: ["engineering:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted", "supervised"], dataClassification: "internal",
    evidenceRequired: true, humanReviewRequired: true,
  },
  {
    id: "noctis.legal.advisory", name: "Legal Intelligence", version: "0.1.0",
    domain: "legal", description: "Legal and regulatory research support.",
    sourcePath: "src/lib/noctis-legal-engine.ts", capabilities: ["legal.research.analyze", "legal.authority.verify"],
    requiredScopes: ["legal:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted"], dataClassification: "confidential",
    evidenceRequired: true, humanReviewRequired: true,
  },
  {
    id: "noctis.defense.intelligence", name: "Defense Intelligence", version: "0.1.0",
    domain: "defense", description: "Defensive intelligence, protection and resilience analysis.",
    sourcePath: "src/lib/noctis-defense-subsystem.ts", capabilities: ["defense.telemetry.assess", "defense.resilience.analyze"],
    requiredScopes: ["defense:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted"], dataClassification: "restricted",
    evidenceRequired: true, humanReviewRequired: true,
  },
  {
    id: "noctis.research.deep", name: "Deep Research", version: "0.1.0",
    domain: "research", description: "Multi-source research and synthesis foundation.",
    sourcePath: "src/lib/noctis-deep-research.ts", capabilities: ["research.investigate", "research.synthesize"],
    requiredScopes: ["research:read"],
    dependencies: ["noctis.evidence.retrieval"], lifecycle: "registered",
    executionModes: ["analysis", "assisted"], dataClassification: "internal",
    evidenceRequired: true, humanReviewRequired: false,
  },
  {
    id: "noctis.professional.intelligence", name: "Professional Intelligence", version: "0.1.0",
    domain: "professional", description: "Profession, trade and work-execution intelligence.",
    sourcePath: "src/lib/noctis-professional-engine.ts", capabilities: ["profession.classify", "profession.workflow.plan"],
    requiredScopes: ["profession:read"],
    dependencies: ["noctis.core.orchestrator"], lifecycle: "registered",
    executionModes: ["analysis", "assisted", "supervised"], dataClassification: "internal",
    evidenceRequired: true, humanReviewRequired: true,
  },
];

const REGISTRY = new Map(MANIFESTS.map((manifest) => [manifest.id, manifest]));

export function listNoctisEngines(filters: {
  domain?: NoctisEngineDomain;
  lifecycle?: NoctisEngineLifecycle;
} = {}): NoctisEngineManifest[] {
  return MANIFESTS.filter((manifest) =>
    (!filters.domain || manifest.domain === filters.domain) &&
    (!filters.lifecycle || manifest.lifecycle === filters.lifecycle)
  ).map((manifest) => ({ ...manifest, capabilities: [...manifest.capabilities], requiredScopes: [...manifest.requiredScopes], dependencies: [...manifest.dependencies], executionModes: [...manifest.executionModes] }));
}

export function getNoctisEngine(engineId: string): NoctisEngineManifest | null {
  const manifest = REGISTRY.get(engineId);
  return manifest ? {
    ...manifest,
    capabilities: [...manifest.capabilities],
    requiredScopes: [...manifest.requiredScopes],
    dependencies: [...manifest.dependencies],
    executionModes: [...manifest.executionModes],
  } : null;
}

export function findNoctisEnginesByCapability(capability: string): NoctisEngineManifest[] {
  const normalized = capability.trim().toLowerCase();
  if (!normalized) return [];
  return listNoctisEngines().filter((manifest) => manifest.capabilities.includes(normalized));
}

/**
 * Pure contract validation only; this is not an authorization decision.
 * A trusted server adapter must construct actorId, tenantId and scopes from
 * authenticated identity, then resolve evidence IDs and verify approval IDs
 * against their authoritative services before any engine execution.
 */
export function validateNoctisEngineRequest(
  request: NoctisEngineRequest,
): NoctisEngineRequestValidation {
  if (!request || typeof request !== "object" ||
      !request.requestId?.trim() || !request.tenantId?.trim() ||
      !request.actorId?.trim() || !request.context?.correlationId?.trim() ||
      !request.capability?.trim() || !request.engineId?.trim() ||
      !request.authorization || !Array.isArray(request.authorization.scopes) ||
      !request.context || typeof request.context !== "object" ||
      !request.constraints || typeof request.constraints !== "object") {
    return { ok: false, code: "INVALID_REQUEST", message: "Required request identity and routing fields are missing." };
  }

  const manifest = REGISTRY.get(request.engineId);
  if (!manifest) {
    return { ok: false, code: "ENGINE_NOT_FOUND", message: "The requested engine is not registered." };
  }
  if (!manifest.capabilities.includes(request.capability)) {
    return { ok: false, code: "CAPABILITY_NOT_SUPPORTED", message: "The engine does not declare this capability." };
  }
  if (!manifest.requiredScopes.every((scope) => request.authorization.scopes.includes(scope))) {
    return { ok: false, code: "SCOPE_REQUIRED", message: "The caller lacks one or more required engine scopes." };
  }
  const classificationRank = { public: 0, internal: 1, confidential: 2, restricted: 3 } as const;
  if (!Object.hasOwn(classificationRank, request.constraints.dataClassification) ||
      classificationRank[request.constraints.dataClassification] > classificationRank[manifest.dataClassification]) {
    return { ok: false, code: "DATA_CLASSIFICATION_EXCEEDED", message: "The request classification exceeds the engine's declared data boundary." };
  }
  if (!manifest.executionModes.includes(request.authorization.executionMode)) {
    return { ok: false, code: "EXECUTION_MODE_NOT_ALLOWED", message: "The requested execution mode is not allowed for this engine." };
  }
  if (manifest.evidenceRequired && !(request.context.evidenceIds?.length)) {
    return { ok: false, code: "EVIDENCE_REQUIRED", message: "This capability requires evidence references; a trusted evidence service must verify approval and provenance." };
  }
  // This checks only for an approval reference. A trusted server-side approval
  // service must resolve and authorize that reference before any execution.
  if ((manifest.humanReviewRequired || request.authorization.executionMode === "approved_execution") &&
      request.authorization.executionMode !== "analysis" && !request.authorization.approvalId?.trim()) {
    return { ok: false, code: "APPROVAL_REQUIRED", message: "A valid approval reference is required before this workflow can proceed." };
  }
  return { ok: true, manifest: getNoctisEngine(request.engineId)! };
}
