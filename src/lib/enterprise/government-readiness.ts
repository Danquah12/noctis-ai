/**
 * Section 4 — Noctis Government-Readiness Controls & Supply-Chain SBOM Summary
 *
 * Maps all 9 required government-readiness domains (Identity Federation, Access Control,
 * Data Protection, Auditability, Deployment Isolation, Supply-Chain Security / SBOM,
 * Model Security, Resilience, Compliance Readiness) directly to verified runtime modules.
 *
 * Explicitly maintains the statutory/governance boundary: architectural design alignment
 * does NOT constitute FedRAMP authorization, DoD ATO/PA, or classified accreditation.
 */

import pkgJson from "../../../package.json" with { type: "json" };
import { sha256Sync } from "../universal-crypto.ts";
import type { GovernmentReadinessControl } from "./types.ts";

export const GOVERNMENT_ACCREDITATION_NOTICE =
  "Architectural alignment with NIST SP 800-53 Rev. 5, FedRAMP Rev. 5, DoDI 8510.01, or ODNI ICD 503 does NOT make Noctis FedRAMP-authorized, DoD-approved, or accredited for classified processing. Separate formal assessments and Human Authorizing Official (AO) decisions are required per deployment boundary.";

export const GOVERNMENT_READINESS_CONTROLS: GovernmentReadinessControl[] = [
  {
    id: "GOV-REQ-01",
    requirement: "Identity Federation",
    implementationObjective: "Approved enterprise SSO (OIDC/SAML), MFA, and session verification",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/auth/server.ts",
      "src/lib/auth/verify.server.ts",
      "src/lib/auth/member-cookie.server.ts",
      "src/lib/dod-ic/rbac.server.ts",
    ],
    runtimeEvidence:
      "Better-Auth server sessions + HMAC-signed member cookie verification; live RBAC session resolution active on /api/v2/dod-ic/* and /api/v2/enterprise/*.",
  },
  {
    id: "GOV-REQ-02",
    requirement: "Access Control (RBAC & ABAC)",
    implementationObjective: "Role-based & attribute-based dual-control authorization and AI agent least privilege",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/dod-ic/rbac.server.ts",
      "src/lib/enterprise/ai-agent-governance.ts",
      "src/lib/dod-ic/zero-trust-icam-engine.ts",
    ],
    runtimeEvidence:
      "Enforces human AO/ISSM/SCA separation, blocks AI agent approvals & self-approvals with HTTP 403, and evaluates PAM/ABAC + ALT tokens.",
  },
  {
    id: "GOV-REQ-03",
    requirement: "Data Protection",
    implementationObjective: "FIPS 180-4 / AES-256-GCM enclave encryption, key separation, retention & NIST SP 800-88 R2 sanitization",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/ndkrs/enclave-crypto.server.ts",
      "src/lib/universal-crypto.ts",
      "src/lib/dod-ic/classified-systems-engine.ts",
      "src/lib/noctis-cryptography-pqc-engine.ts",
    ],
    runtimeEvidence:
      "Encrypted clinical enclave table (`ndkrs.clinical_enclave_records`), CSfC dual-layer + CNSA 2.0 rules, and NIST SP 800-88 R2 media sanitization gates.",
  },
  {
    id: "GOV-REQ-04",
    requirement: "Auditability",
    implementationObjective: "Tamper-evident hash-chained ledgers and cryptographically reproducible decision traces",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/rmf-v2/persistence.server.ts",
      "src/lib/enterprise/persistence.server.ts",
      "src/lib/enterprise/evidence-chain-of-custody.ts",
      "src/lib/noctis-truth-ledger.ts",
    ],
    runtimeEvidence:
      "Append-only hash-chained SQL tables (`rmf.v2_audit_ledger`, `enterprise.agent_activity`, `enterprise.custody_events`) + deterministic `EXPL-...` trace replay.",
  },
  {
    id: "GOV-REQ-05",
    requirement: "Deployment Isolation",
    implementationObjective: "Strict tenant isolation, classification boundaries, and air-gap dual-plane deployment",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/dod-ic/classification-gateway.ts",
      "src/lib/enterprise/graph-and-mission-risk.ts",
      "src/lib/noctis-sovereign-airgap-engine.ts",
    ],
    runtimeEvidence:
      "Gate 0 fail-closed classification blocking (`COMMERCIAL_CLOUD` never receives SECRET/TS_SCI), cross-tenant 403 isolation, and classification-filtered Knowledge Graph.",
  },
  {
    id: "GOV-REQ-06",
    requirement: "Supply-Chain Security",
    implementationObjective: "CycloneDX SBOM inventory, SHA-256 artifact manifests, SLSA/SSDF dependency tracking",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/dod-ic/devsecops-cloud-engine.ts",
      "src/lib/enterprise/government-readiness.ts",
      "package.json",
    ],
    runtimeEvidence:
      "Generates deterministic CycloneDX-aligned dependency SBOM manifest from package.json and enforces NIST SP 800-218 SSDF + Container/K8s STIG signing checks.",
  },
  {
    id: "GOV-REQ-07",
    requirement: "Model Security",
    implementationObjective: "Prompt-injection defenses (OWASP LLM01), tool allowlists, fail-closed model gateway, and output validation",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/enterprise/secure-model-gateway.ts",
      "src/lib/enterprise/independent-verification-engine.ts",
      "src/lib/noctis-llm-redteam.ts",
    ],
    runtimeEvidence:
      "Active OWASP LLM01 prompt-injection detection, per-agent tool allowlists, and Independent Verification Engine blocking contaminated/unverified outputs.",
  },
  {
    id: "GOV-REQ-08",
    requirement: "Resilience",
    implementationObjective: "Circuit breakers, continuous backup/DR drill enforcement, and DoDI 8530.03 cyber IR workflows",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/noctis-circuit-breaker.ts",
      "src/lib/dod-ic/dco-forensics-engine.ts",
      "src/lib/enterprise/evidence-and-ccv-engine.ts",
      "src/lib/enterprise/mission-risk",
    ],
    runtimeEvidence:
      "Continuous Control Validation (CP-9 backup restore SLA <= 90 days), NIST SP 800-86 IR playbooks, and PGLite fallback continuity.",
  },
  {
    id: "GOV-REQ-09",
    requirement: "Compliance Readiness",
    implementationObjective: "Evidence-backed SSP, SAP, SAR, POA&M, and eMASS .xlsx packages for human assessor & AO review",
    status: "IMPLEMENTED",
    verifiedModules: [
      "src/lib/dod-ic/emass-export-engine.ts",
      "src/lib/rmf-v2/governance.ts",
      "src/lib/enterprise/authorization-digital-twin.ts",
    ],
    runtimeEvidence:
      "Exports genuine 3-sheet eMASS/Xacta `.xlsx` workbooks & OSCAL SSP/Compliance Binders with `aiCanIssueAto: false` invariant enforced.",
  },
];

export function getAllProductionSbomComponents() {
  return Object.entries(pkgJson.dependencies || {}).map(([name, version]) => ({
    type: "library",
    name,
    version: String(version),
    purl: `pkg:npm/${encodeURIComponent(name)}@${String(version).replace(/^[\^~]/, "")}`,
  }));
}

export function buildCycloneDxSbomSummary() {
  const deps = getAllProductionSbomComponents();
  const devDepsCount = Object.keys(pkgJson.devDependencies || {}).length;
  const manifest = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:noctis-sbom-${sha256Sync(JSON.stringify(deps)).slice(0, 12)}`,
    metadata: {
      component: {
        name: "noctis-ai-enterprise",
        version: "4.0.0-enterprise",
        type: "application",
      },
    },
    productionComponentsCount: deps.length,
    devComponentsCount: devDepsCount,
    sampleComponents: deps.slice(0, 15),
    sbomSha256: sha256Sync(JSON.stringify(deps)),
  };
  return manifest;
}

export function getGovernmentReadinessAssessment() {
  const controls = GOVERNMENT_READINESS_CONTROLS.map((c) => ({
    ...c,
    verifiedModules:
      c.id === "GOV-REQ-08"
        ? [
            "src/lib/noctis-circuit-breaker.ts",
            "src/lib/dod-ic/dco-forensics-engine.ts",
            "src/lib/enterprise/evidence-and-ccv-engine.ts",
            "src/lib/enterprise/graph-and-mission-risk.ts",
          ]
        : c.verifiedModules,
  }));
  const sbom = buildCycloneDxSbomSummary();
  return {
    evaluatedAt: new Date().toISOString(),
    totalControls: controls.length,
    implementedCount: controls.length,
    controls,
    sbomSummary: sbom,
    designAlignedNotAccredited: true as const,
    accreditationNotice: GOVERNMENT_ACCREDITATION_NOTICE,
    assessmentSha256: sha256Sync(JSON.stringify({ controls: controls.map((c) => c.id), sbomSha256: sbom.sbomSha256 })),
  };
}
