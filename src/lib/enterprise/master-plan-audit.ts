/**
 * Sections 5 & 6 — Evidence-Based Repository Gap Analysis & Noctis Enterprise Intelligence
 * Master Development Plan
 *
 * Documents what ALREADY existed cleanly in `noctis-ai`, what gaps remained prior to the
 * `src/lib/enterprise/*` layer, and consolidates the 5-horizon roadmap (explicitly labeled
 * as planning targets rather than verified development estimates) without replacing existing features.
 */

export interface GapAnalysisRow {
  area: string;
  classification: "BUILT_AND_VERIFIED" | "CONSOLIDATED_IN_ENTERPRISE_LAYER" | "EXTERNAL_GOV_DEPENDENCY";
  existingModules: string[];
  whatWasAddedNow: string;
  notes: string;
}

export interface RoadmapHorizon {
  phase: number;
  windowLabel: string;
  status: "COMPLETED_IN_CODEBASE" | "ACTIVE_TARGET";
  scopeSummary: string;
  deliverables: string[];
  planningTargetDisclaimer: string;
}

export const REPOSITORY_GAP_ANALYSIS: GapAnalysisRow[] = [
  {
    area: "Clinical Data Integrity, Scratchpad & CRIT-046 / CRIT-047",
    classification: "BUILT_AND_VERIFIED",
    existingModules: [
      "src/lib/noctis-clinical-scratchpad.ts",
      "src/lib/noctis-clinical-preflight-auditor.ts",
      "src/lib/noctis-clinical-validation-engine.ts",
      "src/lib/noctis-self-healing-reflection.ts",
      "src/lib/noctis-clinical-scratchpad.test.ts",
    ],
    whatWasAddedNow:
      "Exposed live CRIT-046 & CRIT-047 regression diagnostics inside AI Evaluation Laboratory (`src/lib/enterprise/ai-evaluation-lab.ts`), the 6-Panel Command Center, and Chat.",
    notes:
      "Did NOT rewrite clinical extraction; preserved all existing deterministic renal/ABG/creatinine timeline logic.",
  },
  {
    area: "Unified Deterministic Knowledge Base (NDKRS + Vector RRF + Enclave)",
    classification: "BUILT_AND_VERIFIED",
    existingModules: [
      "migrations/0017_ndkrs_core.sql",
      "src/lib/ndkrs/persistence.server.ts",
      "src/lib/ndkrs/hybrid-retrieval.server.ts",
      "src/lib/ndkrs/rules-engine.server.ts",
      "src/lib/ndkrs/fact-lock-validator.server.ts",
      "src/lib/ndkrs/enclave-crypto.server.ts",
      "src/lib/ndkrs/chat-bridge.server.ts",
    ],
    whatWasAddedNow:
      "Connected live NDKRS DB health, 7-domain record counts, open gap tracking, and chunk metrics directly into Command Center Panel #1 (`Database Health`) and Panel #4 (`Knowledge Coverage`).",
    notes: "Live Neon PostgreSQL (`72` seeded verified records / `72` chunks / `12` executable rules) preserved intact.",
  },
  {
    area: "RMF v2.0 + DoD/IC Waves 1–4 + eMASS .xlsx + STIG Library + RBAC",
    classification: "BUILT_AND_VERIFIED",
    existingModules: [
      "src/lib/rmf-v2/governance.ts",
      "src/lib/rmf-v2/evidence.ts",
      "src/lib/rmf-v2/graph-and-trace.ts",
      "src/lib/dod-ic/classification-gateway.ts",
      "src/lib/dod-ic/stig-acas-engine.ts",
      "src/lib/dod-ic/stig-library.ts",
      "src/lib/dod-ic/emass-export-engine.ts",
      "src/lib/dod-ic/rbac.server.ts",
      "src/components/noctis/NoctisDodIcCommandTab.tsx",
    ],
    whatWasAddedNow:
      "Composed into Authorization Digital Twin, Evidence Intelligence, Compliance Knowledge Graph, and Continuous Control Validation without duplicating any RMF or DoD/IC engine.",
    notes: "All 32 directives, 5,137 DISA CCIs (`2025-01-23`), and 26 STIG rules across 5 benchmarks remain authoritative.",
  },
  {
    area: "10 Enterprise Capabilities + Independent Verification + 6-Panel Command Center",
    classification: "CONSOLIDATED_IN_ENTERPRISE_LAYER",
    existingModules: [
      "migrations/0018_enterprise_governance.sql",
      "src/lib/enterprise/policy-as-code-engine.ts",
      "src/lib/enterprise/authorization-digital-twin.ts",
      "src/lib/enterprise/evidence-and-ccv-engine.ts",
      "src/lib/enterprise/graph-and-mission-risk.ts",
      "src/lib/enterprise/ai-agent-governance.ts",
      "src/lib/enterprise/secure-model-gateway.ts",
      "src/lib/enterprise/evidence-chain-of-custody.ts",
      "src/lib/enterprise/independent-verification-engine.ts",
      "src/lib/enterprise/ai-evaluation-lab.ts",
      "src/lib/enterprise/government-readiness.ts",
      "src/lib/enterprise/api-handler.server.ts",
      "src/lib/enterprise/chat-bridge.server.ts",
      "src/components/noctis/NoctisEnterpriseCommandTab.tsx",
    ],
    whatWasAddedNow:
      "Implemented all 10 capabilities, 3 immediate priorities, unified telemetry SQL schema (`enterprise.*`), `/api/v2/enterprise/*`, Chat integration, and 6-panel UI.",
    notes: "Cleanly closes previous unification, continuous runtime telemetry, and enterprise governance gaps.",
  },
  {
    area: "Formal Government Accreditations (FedRAMP ATO / DoD IL5-IL6 PA / SCIF-JWICS Deployment)",
    classification: "EXTERNAL_GOV_DEPENDENCY",
    existingModules: ["src/lib/enterprise/government-readiness.ts"],
    whatWasAddedNow: "Documented technical control mapping & explicit non-accreditation boundary banner.",
    notes:
      "Requires external 3PAO/SCA assessment, physical accredited infrastructure (GovCloud/SIPR/JWICS), and formal Human Authorizing Official (AO) authorization decision.",
  },
];

export const MASTER_DEVELOPMENT_HORIZONS: RoadmapHorizon[] = [
  {
    phase: 1,
    windowLabel: "First 30 Days — Audit, Clinical Fixes & Verified Schemas",
    status: "COMPLETED_IN_CODEBASE",
    scopeSummary: "Repository gap analysis, clinical creatinine & sepsis remediation, and versioned SQL schemas.",
    deliverables: [
      "Verified clinical extraction pipeline (`CRIT-046` & `CRIT-047` table/temporal provenance, `NH-AI-001..016`).",
      "Additive Neon/PGLite migrations (`0014`–`0018`) isolating verified facts, audit ledgers, and custody chains.",
    ],
    planningTargetDisclaimer: "Planning target horizon; technical codebase baseline implemented and test-verified.",
  },
  {
    phase: 2,
    windowLabel: "Days 31–60 — Retrieval Gateway, Deterministic Rules & Independent Validation",
    status: "COMPLETED_IN_CODEBASE",
    scopeSummary: "Unified NDKRS RAG, Policy-as-Code execution, and fail-closed Independent Verification Engine.",
    deliverables: [
      "NDKRS hybrid BM25 + vector retrieval (`0017_ndkrs_core.sql`) + HMAC Fact-Lock validation.",
      "Independent Verification Engine (`enterprise.verification_events`) + 5 Policy-as-Code packs.",
    ],
    planningTargetDisclaimer: "Planning target horizon; core retrieval and validation services operational in codebase.",
  },
  {
    phase: 3,
    windowLabel: "Days 61–90 — DoD RMF, ICD 503, DISA STIG, ACAS & ConMon Integration",
    status: "COMPLETED_IN_CODEBASE",
    scopeSummary: "Full DoD/IC Waves 1–4, 5,137 DISA CCIs, STIG library, eMASS .xlsx, and scheduled drift cron.",
    deliverables: [
      "`/api/v2/dod-ic/*`, `NoctisDodIcCommandTab.tsx`, 32 DoD/IC directives, Zero Trust 7-pillar evaluator, daily drift cron.",
    ],
    planningTargetDisclaimer: "Planning target horizon; unclassified DoD/IC compliance & tooling engines live.",
  },
  {
    phase: 4,
    windowLabel: "Months 4–6 — Enterprise Command Center, Knowledge Graph & Agent Governance",
    status: "COMPLETED_IN_CODEBASE",
    scopeSummary: "6-panel Intelligence Command Center, Auth Digital Twin, Knowledge Graph, Agent Governance, and Secure Model Gateway.",
    deliverables: [
      "`/api/v2/enterprise/command-center`, 10 Enterprise capabilities wired to REST, Chat & `NoctisEnterpriseCommandTab.tsx`.",
    ],
    planningTargetDisclaimer:
      "Planning target horizon; software platform layer implemented, subject to customer enterprise IdP/SIEM connector binding.",
  },
  {
    phase: 5,
    windowLabel: "Months 7–12 — Specialized Intelligence, Mission Assurance & External Accreditation",
    status: "ACTIVE_TARGET",
    scopeSummary: "Formal 3PAO / DoD SCA assessments, sovereign air-gapped hardware deployments (IL5/IL6/SCIF), and live enclave connectors.",
    deliverables: [
      "Authorized eMASS API/PKI bilateral sync inside DoD enclaves; formal 3PAO SAR & Authorizing Official (AO) packages.",
    ],
    planningTargetDisclaimer:
      "Planning target rather than verified development estimate; external formal accreditation & classified hosting depend on Sponsor AO.",
  },
];

export function getMasterDevelopmentPlan() {
  const markdown = [
    "# Noctis Enterprise Intelligence Master Development Plan & Repository Gap Analysis",
    "",
    "> **Planning Basis Note:** Development windows below represent **planning targets rather than verified delivery estimates**. Architectural alignment does **not** grant FedRAMP authorization, DoD approval, or classified suitability without formal assessment and Authorizing Official (AO) signature.",
    "",
    "## 1. Evidence-Based Repository Gap Analysis (Zero Feature Loss)",
    "| Capability Domain | Classification | Existing Verified Modules Preserved | New Consolidation / Remaining Boundary |",
    "| :--- | :--- | :--- | :--- |",
    ...REPOSITORY_GAP_ANALYSIS.map(
      (r) => `| **${r.area}** | \`${r.classification}\` | ${r.existingModules.slice(0, 3).map((m) => `\`${m}\``).join(", ")} | ${r.whatWasAddedNow} |`,
    ),
    "",
    "## 2. Consolidated 5-Horizon Master Roadmap",
    ...MASTER_DEVELOPMENT_HORIZONS.map(
      (h) =>
        `### Phase ${h.phase} — ${h.windowLabel} (\`${h.status}\`)\n- **Scope:** ${h.scopeSummary}\n- **Deliverables:** ${h.deliverables.join(" ")}\n- *Caveat:* ${h.planningTargetDisclaimer}`,
    ),
  ].join("\n");

  return {
    title: "Noctis Enterprise Intelligence Master Development Plan",
    generatedAt: new Date().toISOString(),
    gapAnalysis: REPOSITORY_GAP_ANALYSIS,
    roadmapHorizons: MASTER_DEVELOPMENT_HORIZONS,
    markdown,
  };
}
