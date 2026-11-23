/**
 * Capability #3 — Noctis Evidence Intelligence
 * Capability #4 — Noctis Continuous Control Validation (CCV)
 *
 * 1. Evidence Intelligence: SHA-256 validates, timestamps, checks freshness/quarantine,
 *    and maps artifacts across NIST SP 800-53 Rev. 5, DISA CCI, ICD 503, and CMMC Level 2.
 * 2. Continuous Control Validation: Tests live operational telemetry against SSP claims
 *    and explicitly flags PAPER_COMPLIANCE_DRIFT when documentation diverges from runtime reality.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { verifyEvidenceRecord } from "../rmf-v2/evidence.ts";
import { listCcisForNistControl } from "../dod-ic/stig-acas-engine.ts";
import type {
  CcvControlCheckResult,
  CcvValidationResult,
  ContinuousTelemetrySample,
  EvidencePortfolioItem,
} from "./types.ts";

const CROSSWALK_MAP: Record<string, { icd503: string; cmmc: string }> = {
  "IA-2(1)": { icd503: "ICD 503 IA-2(1) / Phishing-Resistant Auth", cmmc: "IA.L2-3.5.3 (Multifactor Authentication)" },
  "IA-2": { icd503: "ICD 503 IA-2 / Identity Verification", cmmc: "IA.L2-3.5.1 (Identify Users & Processes)" },
  "AC-2(3)": { icd503: "ICD 503 AC-2 / Account Lifecycle", cmmc: "AC.L2-3.1.1 (Disable Separated Accounts)" },
  "SC-13": { icd503: "CNSSP 15 / ICD 503 Cryptographic Protection", cmmc: "SC.L2-3.13.11 (FIPS-Validated Crypto)" },
  "SC-8": { icd503: "ICD 503 Transmission Confidentiality", cmmc: "SC.L2-3.13.8 (Protect CUI in Transit)" },
  "AU-9": { icd503: "ICD 502 / CNSSI 1253 Audit Protection", cmmc: "AU.L2-3.3.8 (Protect Audit Logs)" },
  "CM-6": { icd503: "DISA STIG / ICD 503 Baseline Settings", cmmc: "CM.L2-3.4.2 (Enforce Security Configs)" },
  "CP-9": { icd503: "ICD 502 Resilience & Backup Testing", cmmc: "MP/CP Continuity Backup Restore" },
  "SC-7": { icd503: "SCCA / ZT Microsegmentation Boundary", cmmc: "SC.L2-3.13.1 (Monitor & Control Comms)" },
};

export function analyzeEvidencePortfolio(
  items: EvidencePortfolioItem[],
  requiredControls: string[] = ["IA-2(1)", "AC-2(3)", "SC-13", "SC-8", "AU-9", "CM-6"],
  asOfIso = new Date().toISOString(),
) {
  const verifiedItems = items.map((item) => {
    const res = verifyEvidenceRecord({
      evidenceId: item.evidenceId,
      tenantId: "tenant:enterprise",
      controlId: item.controlId,
      origin: item.origin,
      collectedAt: item.collectedAt,
      maxAgeDays: item.maxAgeDays ?? 30,
      claimedSha256: item.claimedSha256,
      payload: item.payload,
      asOf: asOfIso,
    });
    const maxAge = item.maxAgeDays ?? 30;
    const freshnessState =
      res.status === "QUARANTINED"
        ? "QUARANTINED"
        : res.status === "EXPIRED"
        ? "EXPIRED"
        : res.ageDays >= maxAge * 0.75
        ? "EXPIRING_SOON"
        : "FRESH";

    const cciHits = listCcisForNistControl(item.controlId).slice(0, 5);
    const xwalk = CROSSWALK_MAP[item.controlId.toUpperCase()] || {
      icd503: `ICD 503 Equivalent (${item.controlId})`,
      cmmc: `NIST 800-171 / CMMC Crosswalk (${item.controlId})`,
    };

    return {
      evidenceId: item.evidenceId,
      title: item.title,
      controlId: item.controlId,
      origin: item.origin,
      status: res.status,
      freshnessState,
      verified: res.verified,
      canSatisfyObjective: res.canSatisfyObjective,
      ageDays: res.ageDays,
      computedSha256: res.computedSha256,
      rationale: res.rationale,
      crosswalk: {
        nistRev5: item.controlId,
        disaCcis: cciHits.map((c) => c.cciId),
        icd503: xwalk.icd503,
        cmmc: xwalk.cmmc,
      },
    };
  });

  const satisfiedControls = new Set(
    verifiedItems.filter((v) => v.canSatisfyObjective).map((v) => v.controlId.toUpperCase()),
  );
  const missingControls = requiredControls.filter((c) => !satisfiedControls.has(c.toUpperCase()));
  const quarantinedCount = verifiedItems.filter((v) => v.freshnessState === "QUARANTINED").length;
  const expiredCount = verifiedItems.filter((v) => v.freshnessState === "EXPIRED").length;
  const coveragePercent =
    requiredControls.length > 0
      ? Math.round(((requiredControls.length - missingControls.length) / requiredControls.length) * 100)
      : 100;

  return {
    analyzedAt: asOfIso,
    totalItems: verifiedItems.length,
    verifiedFreshCount: verifiedItems.filter((v) => v.verified).length,
    quarantinedCount,
    expiredCount,
    coveragePercent,
    missingControls,
    items: verifiedItems,
    portfolioSha256: sha256Sync(JSON.stringify(verifiedItems)),
    aiCanIssueAto: false as const,
  };
}

export function runContinuousControlValidation(
  telemetry: ContinuousTelemetrySample,
  sspClaims: Record<string, "Implemented" | "Planned" | "Partial"> = {},
): CcvValidationResult {
  const claimOf = (ctrl: string): "Implemented" | "Planned" | "Partial" => sspClaims[ctrl] || "Implemented";

  const makeCheck = (
    controlId: string,
    title: string,
    val: unknown,
    evaluator: () => { ok: boolean; detail: string },
  ): CcvControlCheckResult => {
    const sspClaim = claimOf(controlId);
    if (val === undefined || val === null) {
      return {
        controlId,
        title,
        sspClaim,
        liveTelemetryStatus: "UNVERIFIED",
        paperComplianceDrift: sspClaim === "Implemented",
        detail: `No live runtime telemetry collected for ${controlId}; cannot rely solely on SSP "${sspClaim}" claim.`,
      };
    }
    const { ok, detail } = evaluator();
    return {
      controlId,
      title,
      sspClaim,
      liveTelemetryStatus: ok ? "EFFECTIVE" : "INEFFECTIVE",
      paperComplianceDrift: !ok && sspClaim === "Implemented",
      detail,
    };
  };

  const checks: CcvControlCheckResult[] = [
    makeCheck("IA-2(1)", "Phishing-Resistant Hardware MFA Enforced", telemetry.phishingResistantMfaEnforced, () => ({
      ok: telemetry.phishingResistantMfaEnforced === true,
      detail: telemetry.phishingResistantMfaEnforced
        ? "IdP policy confirms FIDO2 / DoD PKI CAC hardware-bound authentication on all admin paths."
        : "PAPER_COMPLIANCE_DRIFT: IdP telemetry permits non-phishing-resistant or password/SMS fallback.",
    })),
    makeCheck("AC-2(3)", "Terminated Account Disablement <= 24h", telemetry.maxTerminationDisablementHours, () => {
      const h = Number(telemetry.maxTerminationDisablementHours);
      const ok = Number.isFinite(h) && h <= 24;
      return {
        ok,
        detail: ok
          ? `Max observed account revocation latency is ${h}h (within <= 24h SLA).`
          : `Observed account disablement latency ${h}h exceeds 24h threshold (+${h - 24}h over SLA).`,
      };
    }),
    makeCheck("SC-13", "FIPS 140 Validated Kernel Crypto Active", telemetry.fips140KernelModeEnabled, () => ({
      ok: telemetry.fips140KernelModeEnabled === true,
      detail: telemetry.fips140KernelModeEnabled
        ? "Host crypto telemetry reports fips_enabled=1."
        : "FIPS kernel mode disabled; unvalidated cryptographic primitives active.",
    })),
    makeCheck("SC-8", "Fail-Closed OCSP / TLS Revocation Check", telemetry.ocspFailClosedEnabled, () => ({
      ok: telemetry.ocspFailClosedEnabled === true,
      detail: telemetry.ocspFailClosedEnabled
        ? "Gateway enforces strict fail-closed OCSP stapling/CRL validation."
        : "OCSP soft-fail / bypass detected — revoked certificates could authenticate.",
    })),
    makeCheck("AU-9", "Centralized SIEM TLS Audit Forwarding", telemetry.siemTlsForwardingActive, () => ({
      ok: telemetry.siemTlsForwardingActive === true,
      detail: telemetry.siemTlsForwardingActive
        ? "SIEM collector confirms active encrypted syslog/TLS heartbeat."
        : "Centralized SIEM audit forwarding interrupted or unencrypted.",
    })),
    makeCheck("CM-6", "Zero Privileged / Root Containers", telemetry.privilegedContainersPresent, () => ({
      ok: telemetry.privilegedContainersPresent === false,
      detail:
        telemetry.privilegedContainersPresent === false
          ? "Admission controller telemetry shows zero privileged:true workloads."
          : "Privileged/UID-0 workload detected in runtime cluster.",
    })),
    makeCheck("CP-9", "Verified Backup Restore Test <= 90 Days", telemetry.lastBackupRestoreDrillDaysAgo, () => {
      const d = Number(telemetry.lastBackupRestoreDrillDaysAgo);
      const ok = Number.isFinite(d) && d <= 90;
      return {
        ok,
        detail: ok
          ? `Verified encrypted restore drill completed ${d} days ago.`
          : `Backup restore drill overdue (${d} days ago > 90-day window).`,
      };
    }),
    makeCheck("SC-7", "Default-Deny Network Microsegmentation", telemetry.defaultDenyNetworkPoliciesActive, () => ({
      ok: telemetry.defaultDenyNetworkPoliciesActive === true,
      detail: telemetry.defaultDenyNetworkPoliciesActive
        ? "Zero Trust microsegmentation default-deny policies verified active."
        : "Flat east-west network paths detected — default-deny not enforced.",
    })),
  ];

  const effectiveCount = checks.filter((c) => c.liveTelemetryStatus === "EFFECTIVE").length;
  const driftDetectedCount = checks.filter((c) => c.paperComplianceDrift).length;
  const effectivenessScorePercent = Math.round((effectiveCount / checks.length) * 100);
  const assessedAt = new Date().toISOString();

  return {
    assessedAt,
    effectivenessScorePercent,
    driftDetectedCount,
    checks,
    snapshotSha256: sha256Sync(JSON.stringify({ telemetry, checks })),
    aiCanIssueAto: false,
  };
}
