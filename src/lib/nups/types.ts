/**
 * Shared TypeScript types for Noctis Universal Problem Solver (NUPS)
 * and the 40-Engine Master Capability Matrix.
 */

import type { NdkrsDomain } from "../ndkrs/types.ts";
import type { SQDECPillar } from "../noctis-cross-domain-consensus.ts";
import type { ClassificationTier, VerificationStatus } from "../enterprise/types.ts";

export type NupsEngineCategory =
  | "ORCHESTRATOR"
  | "INDUSTRY"
  | "SCIENTIFIC_TECHNICAL"
  | "CROSS_PLATFORM";

export type NupsExpansionPhase =
  | "PHASE_1_FOUNDATION"
  | "PHASE_2_SHARED_TOOLS"
  | "PHASE_3_TECHNICAL"
  | "PHASE_4_ENTERPRISE"
  | "PHASE_5_SPECIALIZED";

export type NupsRepoStatus =
  | "LIVE_WIRED"
  | "EXISTING_ENGINE_WIRED_VIA_NUPS"
  | "NEWLY_BUILT_GAP_CLOSED";

export interface NupsCapabilityEntry {
  id: string;
  number: number;
  name: string;
  category: NupsEngineCategory;
  phase: NupsExpansionPhase;
  status: NupsRepoStatus;
  ndkrsDomain: NdkrsDomain;
  sqdecPillar: SQDECPillar;
  capabilitiesSummary: string;
  existingModules: string[];
  authoritativeSources: string[];
  deterministicRules: string[];
  apis: string[];
  validationRequirements: string[];
  dependencies: string[];
  triggerKeywords: string[];
}

export interface NupsPlanStep {
  stepNumber: number;
  engineId: string;
  engineName: string;
  category: NupsEngineCategory;
  ndkrsDomain: NdkrsDomain;
  sqdecPillar: SQDECPillar;
  isolatedFactBoundary: string;
  assignedTask: string;
}

export interface NupsDomainExpertOutput {
  engineId: string;
  engineName: string;
  domainLabel: string;
  ndkrsDomain: NdkrsDomain;
  sqdecPillar: SQDECPillar;
  isolatedFactBoundary: string;
  rulesApplied: string[];
  computations: Record<string, string | number | boolean>;
  findings: string[];
  recommendations: string[];
  complianceStatus: "PASS" | "WARN" | "CRITICAL_ACTION_REQUIRED";
  authoritiesCited: string[];
}

export interface NupsCrossDomainConflict {
  conflictId: string;
  betweenEngines: [string, string];
  topic: string;
  tensionSummary: string;
  governingSqdecPillar: SQDECPillar;
  resolutionDecision: string;
}

export interface NupsRetrievedAuthority {
  recordId: string;
  domain: string;
  canonicalKey: string;
  title: string;
  citationLabel: string;
  sourceUri: string;
  snippet: string;
  score: number;
}

export interface NupsSolveRequest {
  query: string;
  actorId?: string;
  tenantId?: string;
  maxClassification?: ClassificationTier;
  persist?: boolean;
}

export interface NupsSolveResult {
  runId: string;
  query: string;
  generatedAt: string;
  latencyMs: number;
  classification: {
    matchedEngines: {
      id: string;
      name: string;
      category: NupsEngineCategory;
      phase: NupsExpansionPhase;
      sqdecPillar: SQDECPillar;
      ndkrsDomain: NdkrsDomain;
      score: number;
    }[];
    distinctDomains: NdkrsDomain[];
    isMultiDomainProblem: boolean;
  };
  plan: NupsPlanStep[];
  retrievedAuthorities: NupsRetrievedAuthority[];
  expertOutputs: NupsDomainExpertOutput[];
  crossDomainConflicts: NupsCrossDomainConflict[];
  safetyValidation: {
    status: VerificationStatus;
    rulesChecked: number;
    failClosedTriggered: boolean;
    violations: { code: string; severity: string; message: string }[];
    verificationEventId: string;
  };
  synthesizedMarkdown: string;
  auditSha256: string;
  persistedToSql: boolean;
}
