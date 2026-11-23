/**
 * Capability #2 — Noctis Authorization Digital Twin
 *
 * Models systems, accreditation boundaries, inherited CSP/common controls,
 * external ISA/MOU interconnections, cross-domain solutions, and real-time AO status.
 * Simulates control-inheritance & dependency blast radius before production rollout.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { CLASSIFICATION_RANK } from "../dod-ic/classification-gateway.ts";
import type { AuthorizationBoundaryTwin, TwinEvaluationResult } from "./types.ts";

export function getDefaultAuthorizationTwin(): AuthorizationBoundaryTwin {
  return {
    systemId: "NOCTIS-ENCLAVE-IL5-01",
    systemName: "Noctis Sovereign Defense & Intelligence Workload",
    impactLevel: "IL5",
    authorizationStatus: "ATO",
    atoExpiresAt: "2027-11-30",
    authorizingOfficial: "SES Authorizing Official (Component CIO/AO)",
    openCatIFindings: 0,
    overduePoams: 0,
    components: [
      { id: "COMP-API-01", name: "TanStack/Nitro Deterministic Runtime", category: "COMPUTE", classification: "CUI", stigCompliant: true },
      { id: "COMP-DB-01", name: "Neon/PGLite Isolated NDKRS Core", category: "DATASTORE", classification: "CUI", stigCompliant: true },
      { id: "COMP-IDP-01", name: "DoD PKI / CAC / OCSP Fail-Closed IdP", category: "IDENTITY", classification: "CUI", stigCompliant: true },
      { id: "COMP-GW-01", name: "SCCA BCAP / Gate 0 Model Gateway", category: "AI_GATEWAY", classification: "CUI", stigCompliant: true },
    ],
    inheritedProviders: [
      {
        providerId: "PROV-CSP-IL5",
        providerName: "DoD Accredited GovCloud Infrastructure (DISA PA)",
        paLevel: "DOD_IL5",
        paStatus: "ACTIVE",
        inheritedControls: ["PE-1", "PE-2", "PE-3", "PE-6", "SC-7(11)", "CP-2"],
      },
      {
        providerId: "PROV-CSSP-01",
        providerName: "Tier II DoD Cyber Security Service Provider (CSSP)",
        paLevel: "DOD_IL5",
        paStatus: "ACTIVE",
        inheritedControls: ["IR-4", "IR-5", "SI-4(2)", "AU-6(3)"],
      },
    ],
    interconnections: [
      {
        id: "ICON-EMASS-01",
        targetSystem: "DoD eMASS Enterprise Portal",
        targetClassification: "CUI",
        hasValidIsaMou: true,
        isaMouExpiresAt: "2027-08-15",
        usesApprovedCds: false,
      },
      {
        id: "ICON-SIPR-CDS-01",
        targetSystem: "SIPRNet Mission Planning Fabric",
        targetClassification: "SECRET",
        hasValidIsaMou: true,
        isaMouExpiresAt: "2027-06-01",
        usesApprovedCds: true,
      },
    ],
  };
}

export function evaluateAuthorizationTwin(
  twin: AuthorizationBoundaryTwin,
  asOfIso = new Date().toISOString().slice(0, 10),
): TwinEvaluationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (twin.authorizationStatus === "EXPIRED" || twin.authorizationStatus === "DENIED") {
    blockers.push(`System authorization status is ${twin.authorizationStatus}.`);
  }
  if (twin.atoExpiresAt && twin.atoExpiresAt < asOfIso) {
    blockers.push(`ATO expired on ${twin.atoExpiresAt} (evaluated as of ${asOfIso}).`);
  }
  if (twin.openCatIFindings > 0) {
    blockers.push(`${twin.openCatIFindings} unmitigated CAT I STIG / Critical vulnerability finding(s) present.`);
  }
  if (twin.overduePoams > 0) {
    blockers.push(`${twin.overduePoams} overdue POA&M milestone(s) exceed AO/DoDI 8531.01 SLA.`);
  }

  for (const comp of twin.components) {
    if (!comp.stigCompliant) {
      blockers.push(`Component "${comp.name}" (${comp.id}) is non-compliant with applicable DISA STIG.`);
    }
  }

  const inheritedSet = new Set<string>();
  for (const prov of twin.inheritedProviders) {
    for (const c of prov.inheritedControls) inheritedSet.add(c);
    if (prov.paStatus === "REVOKED" || prov.paStatus === "EXPIRED") {
      blockers.push(
        `Inherited provider "${prov.providerName}" has PA status ${prov.paStatus}, invalidating ${prov.inheritedControls.length} inherited controls (${prov.inheritedControls.join(", ")}).`,
      );
    } else if (prov.paStatus === "DEGRADED") {
      warnings.push(
        `Inherited provider "${prov.providerName}" PA is DEGRADED; ISSM compensating-control verification required for ${prov.inheritedControls.join(", ")}.`,
      );
    }
  }

  const enclaveMaxClass = twin.impactLevel === "IL6" ? "SECRET" : twin.impactLevel === "ICD503" ? "TS_SCI" : "CUI";
  for (const link of twin.interconnections) {
    if (!link.hasValidIsaMou) {
      blockers.push(`Interconnection "${link.targetSystem}" lacks signed ISA/MOU.`);
    } else if (link.isaMouExpiresAt && link.isaMouExpiresAt < asOfIso) {
      blockers.push(`Interconnection "${link.targetSystem}" ISA/MOU expired on ${link.isaMouExpiresAt}.`);
    }
    if (
      CLASSIFICATION_RANK[link.targetClassification] !== CLASSIFICATION_RANK[enclaveMaxClass] &&
      !link.usesApprovedCds
    ) {
      blockers.push(
        `Cross-domain interconnection "${link.targetSystem}" (${enclaveMaxClass} <-> ${link.targetClassification}) lacks an NSA/NCDSMO-approved Cross-Domain Solution (CDS).`,
      );
    }
  }

  const effectivePosture: TwinEvaluationResult["effectivePosture"] =
    blockers.length > 0 ? "AUTHORIZATION_BLOCKED" : warnings.length > 0 ? "CONDITIONAL_AT_RISK" : "AUTHORIZED";

  return {
    systemId: twin.systemId,
    systemName: twin.systemName,
    impactLevel: twin.impactLevel,
    effectivePosture,
    blockers,
    warnings,
    inheritedControlCount: inheritedSet.size,
    systemSpecificControlCount: Math.max(12, twin.components.length * 6),
    interconnectionsEvaluated: twin.interconnections.length,
    snapshotSha256: sha256Sync(JSON.stringify({ twin, effectivePosture, blockers, warnings })),
    aiCanIssueAto: false,
  };
}

export function simulateInheritanceChange(
  baseTwin: AuthorizationBoundaryTwin,
  change: {
    providerId: string;
    newPaStatus: "ACTIVE" | "DEGRADED" | "REVOKED" | "EXPIRED";
    impactedControls?: string[];
  },
): {
  before: TwinEvaluationResult;
  after: TwinEvaluationResult;
  providerId: string;
  newPaStatus: string;
  affectedControls: string[];
  authorizationDegraded: boolean;
  aiCanIssueAto: false;
} {
  const before = evaluateAuthorizationTwin(baseTwin);
  let targetFound = false;
  let affectedControls: string[] = [];

  const clonedProviders = baseTwin.inheritedProviders.map((p) => {
    if (p.providerId !== change.providerId) return p;
    targetFound = true;
    affectedControls = change.impactedControls?.length ? change.impactedControls : p.inheritedControls;
    return {
      ...p,
      paStatus: change.newPaStatus,
      inheritedControls: change.impactedControls?.length ? change.impactedControls : p.inheritedControls,
    };
  });

  if (!targetFound && clonedProviders.length > 0) {
    const first = clonedProviders[0]!;
    affectedControls = change.impactedControls?.length ? change.impactedControls : first.inheritedControls;
    clonedProviders[0] = { ...first, paStatus: change.newPaStatus };
  }

  const updatedTwin: AuthorizationBoundaryTwin = {
    ...baseTwin,
    inheritedProviders: clonedProviders,
  };
  const after = evaluateAuthorizationTwin(updatedTwin);

  return {
    before,
    after,
    providerId: targetFound ? change.providerId : clonedProviders[0]?.providerId || change.providerId,
    newPaStatus: change.newPaStatus,
    affectedControls,
    authorizationDegraded: before.effectivePosture === "AUTHORIZED" && after.effectivePosture !== "AUTHORIZED",
    aiCanIssueAto: false,
  };
}
