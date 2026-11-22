/**
 * Shared TypeScript types for Noctis Deterministic Knowledge and Reasoning System (NDKRS).
 */

export type NdkrsDomain =
  | "clinical"
  | "rmf"
  | "cybersecurity"
  | "legal"
  | "science"
  | "engineering"
  | "general";

export type TrustTier =
  | "AUTHORITATIVE_GOV"
  | "CLINICAL_GUIDELINE"
  | "PEER_REVIEWED"
  | "INTERNAL_SPEC"
  | "USER_SUBMITTED";

export type VerificationStatus = "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED";

export interface KnowledgeSourceRecord {
  id: string;
  domain: NdkrsDomain;
  title: string;
  sourceUri: string;
  trustTier: TrustTier;
  version: string;
  effectiveDate: string | null;
  expiresAt: string | null;
  contentSha256: string;
  storageRef: string | null;
  status: VerificationStatus;
  ingestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeRecord {
  id: string;
  sourceId: string;
  domain: NdkrsDomain;
  canonicalKey: string;
  title: string;
  summary: string;
  structuredJson: Record<string, unknown>;
  citationLabel: string;
  version: string;
  effectiveDate: string | null;
  expiresAt: string | null;
  verificationStatus: VerificationStatus;
  recordSha256: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  recordId: string | null;
  domain: NdkrsDomain;
  chunkIndex: number;
  heading: string | null;
  content: string;
  tokenCount: number;
  embeddingModel: string;
  embeddingDims: number;
  embeddingJson: number[];
  contentSha256: string;
  createdAt: string;
}

export interface DeterministicRuleRecord {
  ruleId: string;
  domain: NdkrsDomain;
  name: string;
  version: string;
  description: string;
  authorityCitation: string;
  inputSchema: Record<string, unknown>;
  ruleSpec: Record<string, unknown>;
  executorRef: string;
  status: "PENDING_REVIEW" | "VERIFIED" | "DEPRECATED";
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewQueueItem {
  id: string;
  targetType: string;
  targetId: string;
  domain: NdkrsDomain;
  title: string;
  proposedPayload: Record<string, unknown>;
  proposedBy: string;
  proposedByType: "HUMAN" | "AGENT" | "INGESTION_WORKER" | "API";
  sourceUri: string | null;
  allowlistVerified: boolean;
  contradictionFlags: string[];
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewerId: string | null;
  reviewerRole: string | null;
  reviewerNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface ValidationCertificateRecord {
  id: string;
  domain: NdkrsDomain;
  requestId: string;
  validatorVersion: string;
  sourceInputHash: string;
  outputHash: string;
  verdict: "APPROVED" | "FAIL_CLOSED";
  gatesJson: Array<{ gate: string; status: "PASS" | "FAIL" }>;
  violationsJson: Array<{ ruleId: string; description: string }>;
  hmacSignature: string;
  keyMode: string;
  createdAt: string;
}

export interface KnowledgeGapRecord {
  id: string;
  domain: NdkrsDomain;
  queryHash: string;
  sanitizedTopic: string;
  failureReason: string;
  validatorRuleIds: string[];
  occurrences: number;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED";
  lastSeenAt: string;
  createdAt: string;
}

export interface HybridSearchHit {
  chunkId: string;
  recordId: string | null;
  sourceId: string;
  domain: NdkrsDomain;
  canonicalKey: string;
  title: string;
  heading: string | null;
  excerpt: string;
  citationLabel: string;
  sourceUri: string;
  version: string;
  sha256: string;
  bm25Score: number;
  vectorScore: number;
  rrfScore: number;
  matchedTerms: number;
}

export interface NdkrsRouterDecision {
  primaryDomain: NdkrsDomain;
  domainScores: Record<NdkrsDomain, number>;
  confidence: number;
  riskTier: "REGULATED_CRITICAL" | "HIGH_ASSURANCE" | "STANDARD";
  executionStrategy: "DETERMINISTIC_FIRST" | "HYBRID_RAG_FIRST" | "LIVE_TOOL_FIRST" | "LLM_SYNTHESIS";
  recommendedRuleIds: string[];
  requiresFactLock: boolean;
}

export interface FactLockClaim {
  label: string;
  expectedValue: number | string;
  unit?: string;
  tolerance?: number;
  mustAppear?: boolean;
}

export interface FactLockViolation {
  ruleId: string;
  description: string;
}

export interface FactLockResult {
  passed: boolean;
  verdict: "APPROVED" | "FAIL_CLOSED";
  violations: FactLockViolation[];
  certificate: ValidationCertificateRecord;
}
