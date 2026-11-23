/**
 * Shared TypeScript types for Noctis Enterprise Intelligence Platform:
 * - 10 Enterprise Capabilities (Policy-as-Code, Digital Twin, Evidence Intelligence,
 *   Continuous Control Validation, Compliance Knowledge Graph, AI Agent Governance,
 *   Secure Model Gateway, Mission Risk Intelligence, Digital Evidence Chain of Custody,
 *   AI Evaluation Laboratory)
 * - 3 Immediate Priorities (Independent Verification Engine, Unified Deterministic Knowledge,
 *   Controlled Autonomous Agent Platform)
 * - 6-Panel Noctis Intelligence Command Center
 * - 9 Government-Readiness Controls & Master Development Plan
 */

export type ClassificationTier = "UNCLASSIFIED" | "CUI" | "SECRET" | "TOP_SECRET" | "TS_SCI";

export type ModelDeploymentTier =
  | "COMMERCIAL_CLOUD"
  | "FEDRAMP_HIGH_IL4"
  | "DOD_IL5_GOVCLOUD"
  | "SIPR_IL6_AIRGAP"
  | "JWICS_TS_SCI_SCIF"
  | "LOCAL_DETERMINISTIC_ONLY";

export type VerificationStatus = "PASS" | "REPAIRED" | "FAIL_CLOSED_BLOCK" | "FAIL";

export type PolicyOperator =
  | "THRESHOLD_LE"
  | "THRESHOLD_GE"
  | "EQUALS"
  | "NOT_EQUALS"
  | "IN_SET"
  | "REQUIRED_TRUE"
  | "FORBIDDEN_VALUES"
  | "NOT_CONTAINS";

export interface PolicyAsCodeRule {
  ruleId: string;
  controlId: string;
  title: string;
  authorityCitation: string;
  field: string;
  operator: PolicyOperator;
  expectedValue: unknown;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  remediation: string;
}

export interface PolicyAsCodePack {
  packId: string;
  name: string;
  version: string;
  authoritySource: string;
  domain: "dod-ic" | "rmf" | "zero-trust" | "clinical" | "enterprise";
  rules: PolicyAsCodeRule[];
  bundleSha256: string;
}

export interface PolicyRuleEvalOutcome {
  ruleId: string;
  controlId: string;
  title: string;
  authorityCitation: string;
  verdict: "PASS" | "FAIL" | "INSUFFICIENT_EVIDENCE";
  observedValue: unknown;
  expectedValue: unknown;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  rationale: string;
  remediation: string;
}

export interface PolicyPackEvalResult {
  packId: string;
  packName: string;
  version: string;
  authoritySource: string;
  overallVerdict: "PASS" | "FAIL" | "PARTIAL";
  passedCount: number;
  failedCount: number;
  insufficientCount: number;
  compliancePercent: number;
  rules: PolicyRuleEvalOutcome[];
  evalSha256: string;
  aiCanIssueAto: false;
}

export interface AuthorizationBoundaryComponent {
  id: string;
  name: string;
  category: "COMPUTE" | "IDENTITY" | "DATASTORE" | "NETWORK" | "AI_GATEWAY";
  classification: ClassificationTier;
  stigCompliant: boolean;
}

export interface InheritedProviderSpec {
  providerId: string;
  providerName: string;
  paLevel: "FEDRAMP_HIGH" | "DOD_IL4" | "DOD_IL5" | "DOD_IL6" | "IC_C2S";
  paStatus: "ACTIVE" | "DEGRADED" | "REVOKED" | "EXPIRED";
  inheritedControls: string[];
}

export interface InterconnectionSpec {
  id: string;
  targetSystem: string;
  targetClassification: ClassificationTier;
  hasValidIsaMou: boolean;
  isaMouExpiresAt: string;
  usesApprovedCds: boolean;
}

export interface AuthorizationBoundaryTwin {
  systemId: string;
  systemName: string;
  impactLevel: "IL2" | "IL4" | "IL5" | "IL6" | "ICD503" | "FEDRAMP_HIGH";
  authorizationStatus: "ATO" | "IATT" | "CATO" | "EXPIRED" | "DENIED";
  atoExpiresAt: string;
  authorizingOfficial: string;
  openCatIFindings: number;
  overduePoams: number;
  components: AuthorizationBoundaryComponent[];
  inheritedProviders: InheritedProviderSpec[];
  interconnections: InterconnectionSpec[];
}

export interface TwinEvaluationResult {
  systemId: string;
  systemName: string;
  impactLevel: string;
  effectivePosture: "AUTHORIZED" | "CONDITIONAL_AT_RISK" | "AUTHORIZATION_BLOCKED";
  blockers: string[];
  warnings: string[];
  inheritedControlCount: number;
  systemSpecificControlCount: number;
  interconnectionsEvaluated: number;
  snapshotSha256: string;
  aiCanIssueAto: false;
}

export interface EvidencePortfolioItem {
  evidenceId: string;
  controlId: string;
  title: string;
  origin: string;
  collectedAt: string;
  maxAgeDays?: number;
  claimedSha256?: string;
  payload: unknown;
}

export interface ContinuousTelemetrySample {
  phishingResistantMfaEnforced?: boolean | null;
  maxTerminationDisablementHours?: number | null;
  fips140KernelModeEnabled?: boolean | null;
  ocspFailClosedEnabled?: boolean | null;
  siemTlsForwardingActive?: boolean | null;
  privilegedContainersPresent?: boolean | null;
  lastBackupRestoreDrillDaysAgo?: number | null;
  defaultDenyNetworkPoliciesActive?: boolean | null;
}

export interface CcvControlCheckResult {
  controlId: string;
  title: string;
  sspClaim: "Implemented" | "Planned" | "Partial";
  liveTelemetryStatus: "EFFECTIVE" | "INEFFECTIVE" | "UNVERIFIED";
  paperComplianceDrift: boolean;
  detail: string;
}

export interface CcvValidationResult {
  assessedAt: string;
  effectivenessScorePercent: number;
  driftDetectedCount: number;
  checks: CcvControlCheckResult[];
  snapshotSha256: string;
  aiCanIssueAto: false;
}

export interface EnterpriseGraphNode {
  id: string;
  nodeType: "Policy" | "Control" | "DISA_CCI" | "Vulnerability" | "Asset" | "Finding" | "MissionFunction" | "MissionRisk";
  label: string;
  classification: ClassificationTier;
  tenantId: string;
  attributes: Record<string, unknown>;
}

export interface EnterpriseGraphEdge {
  sourceId: string;
  targetId: string;
  relation: string;
}

export interface MissionRiskAssessmentResult {
  operationalReadinessScore: number;
  readinessPosture: "FMC" | "PMC" | "NMC";
  operationalRiskTier: "CRITICAL_MISSION_STOP" | "HIGH_OPERATIONAL_DEGRADATION" | "MODERATE" | "LOW";
  impactedMissionFunctions: {
    mefId: string;
    name: string;
    status: "MISSION_CAPABLE" | "DEGRADED" | "MISSION_STOP";
    blastRadiusReason: string;
  }[];
  remediationRoi: {
    priorityRank: number;
    action: string;
    riskReductionPoints: number;
    addressesItems: string[];
  }[];
  assessmentSha256: string;
  aiCanIssueAto: false;
}

export interface GovernedAgentSpec {
  agentId: string;
  name: string;
  domain: string;
  maxClassification: ClassificationTier;
  canRead: boolean;
  canDraft: boolean;
  canExecuteSandboxTools: boolean;
  canProposeChanges: boolean;
  canApproveConsequential: false;
  canIssueAto: false;
  canModifyDeterministicRules: false;
  allowedTools: string[];
}

export interface AgentProposalRecord {
  id: string;
  agentId: string;
  actionType: string;
  targetResource: string;
  riskTier: string;
  classificationLevel: ClassificationTier;
  rationale: string;
  payload: Record<string, unknown>;
  payloadSha256: string;
  status: "PENDING_HUMAN_AUTH" | "APPROVED" | "DENIED" | "BLOCKED_POLICY";
  requestedBy: string;
  reviewedBy: string | null;
  reviewerRole: string | null;
  reviewNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface AgentActivityRecord {
  seq: number;
  agentId: string;
  toolName: string;
  actionType: string;
  tenantId: string;
  decision: string;
  policyReason: string;
  prevHash: string;
  eventHash: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface CustodyEventRecord {
  seq: number;
  artifactId: string;
  artifactType: string;
  custodyState: string;
  custodianId: string;
  custodianRole: string;
  tenantId: string;
  artifactSha256: string;
  prevHash: string;
  entryHash: string;
  notes: string;
  createdAt: string;
}

export interface EvalLabCaseResult {
  caseId: string;
  category: "CLINICAL_SAFETY" | "RMF_COMPLIANCE" | "DOD_IC_SECURITY" | "AGENT_GOVERNANCE" | "MODEL_GATEWAY" | "CUSTODY";
  title: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  expectedSummary: string;
  observedSummary: string;
  regressionNote: string;
  evidenceDetails: Record<string, unknown>;
  caseSha256: string;
}

export interface EvalLabRunRecord {
  id: string;
  suiteName: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  accuracyPct: number;
  durationMs: number;
  results: EvalLabCaseResult[];
  runSha256: string;
  triggeredBy: string;
  createdAt: string;
}

export interface IndependentVerificationResult {
  id: string;
  domain: string;
  requestId: string;
  status: VerificationStatus;
  rulesChecked: number;
  violations: { code: string; severity: "CRITICAL" | "HIGH" | "MEDIUM"; message: string }[];
  outputSha256: string;
  latencyMs: number;
  failClosedTriggered: boolean;
  persisted: boolean;
}

export interface GovernmentReadinessControl {
  id: string;
  requirement: string;
  implementationObjective: string;
  status: "IMPLEMENTED" | "ARCHITECTED_LOCAL";
  verifiedModules: string[];
  runtimeEvidence: string;
}

export interface EnterpriseCommandCenterSnapshot {
  generatedAt: string;
  rbacCaller: {
    actorId: string;
    tenantId: string;
    rbacRole: string;
    authMethod: string;
  };
  databaseHealth: {
    dbSource: "neon" | "pglite";
    ndkrsSchemaReady: boolean;
    enterpriseSchemaReady: boolean;
    verifiedSourcesCount: number;
    verifiedRecordsCount: number;
    vectorChunksCount: number;
    ingestTotalEvents: number;
    persistedTelemetryCount?: number;
    embeddingModel: string;
    pgvectorEnabled?: boolean;
    clinicalEnclaveRecordsCount?: number;
    relationalTablesTracked?: number;
    relationalTablesPopulated?: number;
    policyBundlesCount?: number;
    sbomComponentsCount?: number;
  };
  aiModelPerformance: {
    latestRunId: string | null;
    suiteName: string;
    totalCases: number;
    passedCases: number;
    failedCases: number;
    accuracyPct: number;
    avgLatencyMs: number;
    lastEvaluatedAt: string | null;
    crit046Status: "PASS" | "FAIL";
    crit047Status: "PASS" | "FAIL";
  };
  safetyValidation: {
    totalChecked: number;
    passedCount: number;
    repairedCount: number;
    blockedCount: number;
    failedCount: number;
    recentEvents: {
      id: string;
      domain: string;
      status: VerificationStatus;
      rulesChecked: number;
      createdAt: string;
    }[];
  };
  knowledgeCoverage: {
    ndkrsDomainsCovered: number;
    recordsByDomain: Record<string, number>;
    openKnowledgeGaps: number;
    dodIcPoliciesCount: number;
    disaCciCount: number;
    indexedStigRulesCount: number;
    rmfControlEvaluators: number;
  };
  agentActivity: {
    governedAgentsCount: number;
    pendingProposalsCount: number;
    totalActivityEvents: number;
    activityChainIntact: boolean;
    recentProposals: AgentProposalRecord[];
    recentActivity: AgentActivityRecord[];
  };
  securityOperations: {
    gate0FailClosedActive: boolean;
    custodyArtifactsTracked: number;
    custodyEventsCount: number;
    govReadinessControlsImplemented: number;
    govReadinessTotalControls: number;
    designAlignedNotAccredited: true;
    accreditationNotice: string;
  };
}
