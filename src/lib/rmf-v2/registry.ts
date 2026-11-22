/**
 * Noctis RMF Intelligence Platform v2.0 — Capability Registry, Error Contracts & Feature Flags
 *
 * Preserves existing Noctis RMF core while making all v2.0 subsystems modular,
 * independently toggleable via feature flags, and contract-checked.
 */

export type RmfV2ErrorCode =
  | "POLICY_NOT_APPROVED"
  | "EVIDENCE_UNVERIFIED"
  | "EVIDENCE_HASH_MISMATCH"
  | "CROSS_TENANT_ACCESS"
  | "SOURCE_VERSION_MISSING"
  | "HUMAN_APPROVAL_REQUIRED"
  | "OBJECTIVE_INCOMPLETE"
  | "INVALID_WORKFLOW_TRANSITION";

export class RmfV2Error extends Error {
  readonly code: RmfV2ErrorCode;
  readonly status: number;

  constructor(code: RmfV2ErrorCode, message: string, status = 400) {
    super(message);
    this.name = "RmfV2Error";
    this.code = code;
    this.status = status;
  }
}

export interface RmfV2Capability {
  id: string;
  name: string;
  category: "governance" | "cyber_security" | "ai_knowledge";
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  subsystem:
    | "noctis-rmf-governance"
    | "noctis-evidence-intelligence"
    | "noctis-cyber-risk"
    | "noctis-rmf-agents"
    | "noctis-rmf-graph";
  status: "implemented" | "planned";
  requiredBehavior: string;
}

export const RMF_V2_CAPABILITIES: RmfV2Capability[] = [
  // A. RMF governance and authorization (10)
  {
    id: "RMF-001",
    name: "Agentic RMF workflow",
    category: "governance",
    priority: "P3",
    subsystem: "noctis-rmf-agents",
    status: "implemented",
    requiredBehavior: "Orchestrate Prepare, Categorize, Select, Implement, Assess, Authorize, and Monitor tasks with human approval gates.",
  },
  {
    id: "RMF-002",
    name: "Automated SSP",
    category: "governance",
    priority: "P1",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Generate versioned OSCAL-compatible SSP drafts from approved system facts and control implementations.",
  },
  {
    id: "RMF-003",
    name: "Control inheritance",
    category: "governance",
    priority: "P0",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Resolve inherited, shared, hybrid, and system-specific control responsibilities including provider boundaries.",
  },
  {
    id: "RMF-004",
    name: "Baseline tailoring",
    category: "governance",
    priority: "P0",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Propose additions, exclusions, overlays, and parameter values with rationale and mandatory human approval.",
  },
  {
    id: "RMF-005",
    name: "SAP/SAR generation",
    category: "governance",
    priority: "P1",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Produce assessment plans and results with objective-level methods, verified evidence, observations, and findings.",
  },
  {
    id: "RMF-006",
    name: "POA&M management",
    category: "governance",
    priority: "P1",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Track findings, owners, milestones, dependencies, statutory SLAs, validation proof, and closure approval.",
  },
  {
    id: "RMF-007",
    name: "ATO readiness",
    category: "governance",
    priority: "P1",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Evaluate package completeness, blockers, and prerequisites without converting readiness into an AI ATO decision.",
  },
  {
    id: "RMF-008",
    name: "Continuous ATO support",
    category: "governance",
    priority: "P1",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Monitor approved authorization conditions and trigger reassessment when drift or violations occur.",
  },
  {
    id: "RMF-009",
    name: "Enterprise risk register",
    category: "governance",
    priority: "P2",
    subsystem: "noctis-cyber-risk",
    status: "implemented",
    requiredBehavior: "Link technical findings to system, mission, organizational, and human-accepted risks with versioned history.",
  },
  {
    id: "RMF-010",
    name: "Framework crosswalk",
    category: "governance",
    priority: "P2",
    subsystem: "noctis-rmf-graph",
    status: "implemented",
    requiredBehavior: "Maintain versioned mappings among NIST SP 800-53 Rev. 5, SP 800-171 Rev. 3, CSF 2.0, FedRAMP, and MITRE ATT&CK v16.1.",
  },
  // B. Technical security and monitoring (8)
  {
    id: "CYB-011",
    name: "Vulnerability intelligence",
    category: "cyber_security",
    priority: "P2",
    subsystem: "noctis-cyber-risk",
    status: "implemented",
    requiredBehavior: "Normalize scanner findings and correlate assets, CVEs, CISA KEV due dates, remediation SLAs, and exceptions.",
  },
  {
    id: "CYB-012",
    name: "Attack-path analysis",
    category: "cyber_security",
    priority: "P4",
    subsystem: "noctis-cyber-risk",
    status: "implemented",
    requiredBehavior: "Construct evidence-backed privilege, exposure, and asset dependency paths marking uncertain edges explicitly.",
  },
  {
    id: "CYB-013",
    name: "Configuration compliance",
    category: "cyber_security",
    priority: "P2",
    subsystem: "noctis-evidence-intelligence",
    status: "implemented",
    requiredBehavior: "Assess configuration settings against approved CIS/STIG hardening baselines and flag unauthorized drift.",
  },
  {
    id: "CYB-014",
    name: "Evidence collection & integrity",
    category: "cyber_security",
    priority: "P0",
    subsystem: "noctis-evidence-intelligence",
    status: "implemented",
    requiredBehavior: "Collect, SHA-256 verify, quarantine mismatches, validate freshness, and enforce lifecycle gates before assessment use.",
  },
  {
    id: "CYB-015",
    name: "Control effectiveness",
    category: "cyber_security",
    priority: "P2",
    subsystem: "noctis-evidence-intelligence",
    status: "implemented",
    requiredBehavior: "Aggregate objective-level results transparently without auto-satisfying a whole control from a single check.",
  },
  {
    id: "CYB-016",
    name: "Risk forecasting",
    category: "cyber_security",
    priority: "P4",
    subsystem: "noctis-cyber-risk",
    status: "implemented",
    requiredBehavior: "Run assumption-based scenario projections with explicit uncertainty and model-version tracking.",
  },
  {
    id: "CYB-017",
    name: "Supply-chain risk",
    category: "cyber_security",
    priority: "P4",
    subsystem: "noctis-cyber-risk",
    status: "implemented",
    requiredBehavior: "Maintain vendor, dependency, SBOM, advisory, and third-party assessment records.",
  },
  {
    id: "CYB-018",
    name: "Zero Trust assessment",
    category: "cyber_security",
    priority: "P4",
    subsystem: "noctis-cyber-risk",
    status: "implemented",
    requiredBehavior: "Evaluate identity, device, network, application, workload, and data protection maturity.",
  },
  // C. Knowledge, AI, and decision support (7)
  {
    id: "AI-019",
    name: "RMF knowledge graph",
    category: "ai_knowledge",
    priority: "P0",
    subsystem: "noctis-rmf-graph",
    status: "implemented",
    requiredBehavior: "Link systems, baselines, controls, objectives, evidence, rules, findings, assets, and POA&Ms with strict tenant isolation.",
  },
  {
    id: "AI-020",
    name: "Multi-agent review",
    category: "ai_knowledge",
    priority: "P3",
    subsystem: "noctis-rmf-agents",
    status: "implemented",
    requiredBehavior: "Run independent evidence, citation, and consistency checks; escalate disagreements for human review.",
  },
  {
    id: "AI-021",
    name: "Deterministic simulator",
    category: "ai_knowledge",
    priority: "P3",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Generate reproducible RMF compliance scenarios and expected golden verdicts under pinned rules.",
  },
  {
    id: "AI-022",
    name: "Expert feedback learning",
    category: "ai_knowledge",
    priority: "P3",
    subsystem: "noctis-rmf-agents",
    status: "implemented",
    requiredBehavior: "Separate human-approved corrections from unapproved feedback before building SFT/DPO training datasets.",
  },
  {
    id: "AI-023",
    name: "Policy impact analysis",
    category: "ai_knowledge",
    priority: "P2",
    subsystem: "noctis-rmf-governance",
    status: "implemented",
    requiredBehavior: "Diff policy baselines/releases and identify exact added/removed controls and affected artifacts.",
  },
  {
    id: "AI-024",
    name: "Natural-language investigation",
    category: "ai_knowledge",
    priority: "P3",
    subsystem: "noctis-rmf-graph",
    status: "implemented",
    requiredBehavior: "Answer permission-scoped RMF questions using hybrid retrieval and verified authoritative data without fabricating unavailable evidence.",
  },
  {
    id: "AI-025",
    name: "Explainable decisions",
    category: "ai_knowledge",
    priority: "P0",
    subsystem: "noctis-rmf-graph",
    status: "implemented",
    requiredBehavior: "Produce reproducible explanation bundles containing pinned requirements, evidence hashes, rule versions, and verification trace.",
  },
];

export interface RmfV2FeatureFlags {
  enabled: boolean;
  governance: boolean;
  evidence: boolean;
  cyberRisk: boolean;
  graph: boolean;
  agents: boolean;
}

export function getRmfV2FeatureFlags(): RmfV2FeatureFlags {
  const env = typeof process !== "undefined" ? process.env : {};
  const isEnabled = (key: string, fallback = true) => {
    const val = (env[key] || "").trim().toLowerCase();
    if (val === "0" || val === "false" || val === "off") return false;
    if (val === "1" || val === "true" || val === "on") return true;
    return fallback;
  };

  const master = isEnabled("RMF_V2_ENABLED", true);
  return {
    enabled: master,
    governance: master && isEnabled("RMF_V2_GOVERNANCE", true),
    evidence: master && isEnabled("RMF_V2_EVIDENCE", true),
    cyberRisk: master && isEnabled("RMF_V2_CYBER_RISK", true),
    graph: master && isEnabled("RMF_V2_GRAPH", true),
    agents: master && isEnabled("RMF_V2_AGENTS", true),
  };
}
