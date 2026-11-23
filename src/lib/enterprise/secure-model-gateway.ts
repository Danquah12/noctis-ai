/**
 * Capability #7 — Noctis Secure Model Gateway
 *
 * Routes AI inference requests strictly to approved deployment tiers based on data
 * sensitivity (classification markings + PHI/PII detection) and OWASP LLM01 prompt-injection checks.
 * Never exposes classified payloads or injection overrides to commercial cloud LLMs.
 */

import { sha256Sync } from "../universal-crypto.ts";
import {
  CLASSIFICATION_RANK,
  evaluateClassificationGate,
  type DeploymentBoundary,
} from "../dod-ic/classification-gateway.ts";
import type { ClassificationTier, ModelDeploymentTier } from "./types.ts";

const TIER_SPEC: Record<
  ModelDeploymentTier,
  { label: string; maxClass: ClassificationTier; externalCloudEgress: boolean; boundary: DeploymentBoundary }
> = {
  COMMERCIAL_CLOUD: {
    label: "Commercial Cloud SaaS Model",
    maxClass: "UNCLASSIFIED",
    externalCloudEgress: true,
    boundary: "COMMERCIAL_UNCLASSIFIED",
  },
  FEDRAMP_HIGH_IL4: {
    label: "FedRAMP High / DoD IL4 Accredited Model",
    maxClass: "CUI",
    externalCloudEgress: false,
    boundary: "DOD_IL4_CUI",
  },
  DOD_IL5_GOVCLOUD: {
    label: "DoD IL5 GovCloud Enclave Model",
    maxClass: "CUI",
    externalCloudEgress: false,
    boundary: "DOD_IL5_NSS",
  },
  SIPR_IL6_AIRGAP: {
    label: "DoD IL6 / SIPRNet Self-Hosted Model",
    maxClass: "SECRET",
    externalCloudEgress: false,
    boundary: "DOD_IL6_SECRET",
  },
  JWICS_TS_SCI_SCIF: {
    label: "JWICS / IC C2S Air-Gapped SCIF Model",
    maxClass: "TS_SCI",
    externalCloudEgress: false,
    boundary: "IC_C2S_TS_SCI",
  },
  LOCAL_DETERMINISTIC_ONLY: {
    label: "Local Deterministic Engine Only (Zero External LLM)",
    maxClass: "CUI",
    externalCloudEgress: false,
    boundary: "COMMERCIAL_UNCLASSIFIED",
  },
};

const INJECTION_PATTERNS: { id: string; re: RegExp; description: string }[] = [
  { id: "LLM01-IGNORE-SYS", re: /\b(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system)\s+instructions\b/i, description: "Direct system prompt override attempt" },
  { id: "LLM01-EXFIL-PROMPT", re: /\b(?:reveal|print|dump|repeat)\s+(?:your\s+)?(?:hidden|exact\s+)?system\s+prompt\b/i, description: "System prompt extraction probe" },
  { id: "LLM01-JAILBREAK-DAN", re: /\b(?:DAN\s*mode|Do\s+Anything\s+Now|developer\s+mode\s+bypass|bypass\s+all\s+safety)\b/i, description: "Jailbreak / safety bypass directive" },
  { id: "LLM01-ATO-SPOOF", re: /\b(?:pretend\s+you\s+are\s+the\s+AO|issue\s+an\s+ATO\s+immediately|bypass\s+Gate\s+0)\b/i, description: "Authorization / Gate 0 spoofing attack" },
];

const PHI_PII_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "SSN_FORMAT", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { id: "PATIENT_MRN", re: /\b(?:MRN|Medical\s+Record\s*(?:Number|#))\s*[:=#]?\s*[A-Z0-9-]{5,}/i },
];

export function routeSecureModelRequest(input: {
  prompt: string;
  requestedTier?: ModelDeploymentTier;
  claimedUserClearance?: ClassificationTier | null;
}) {
  const prompt = input.prompt || "";
  const requestedTier: ModelDeploymentTier = input.requestedTier || "COMMERCIAL_CLOUD";
  const tierInfo = TIER_SPEC[requestedTier];

  const gate = evaluateClassificationGate({
    text: prompt,
    targetBoundary: tierInfo.boundary,
    claimedUserClearance: input.claimedUserClearance || null,
    requestedModelTarget: tierInfo.externalCloudEgress ? "COMMERCIAL_CLOUD_LLM" : "ACCREDITED_GOVCLOUD_ENCLAVE",
  });

  const injectionHits = INJECTION_PATTERNS.filter((p) => p.re.test(prompt)).map((p) => ({
    id: p.id,
    description: p.description,
  }));
  const phiPiiHits = PHI_PII_PATTERNS.filter((p) => p.re.test(prompt)).map((p) => p.id);

  let requiredTier: ModelDeploymentTier = "COMMERCIAL_CLOUD";
  if (gate.detectedClassification === "TS_SCI" || gate.detectedClassification === "TOP_SECRET") {
    requiredTier = "JWICS_TS_SCI_SCIF";
  } else if (gate.detectedClassification === "SECRET") {
    requiredTier = "SIPR_IL6_AIRGAP";
  } else if (gate.detectedClassification === "CUI" || phiPiiHits.length > 0) {
    requiredTier = "DOD_IL5_GOVCLOUD";
  }

  const tierInsufficient = CLASSIFICATION_RANK[gate.detectedClassification] > CLASSIFICATION_RANK[tierInfo.maxClass];
  const phiBlockedOnCommercial = phiPiiHits.length > 0 && requestedTier === "COMMERCIAL_CLOUD";
  const injectionBlocked = injectionHits.length > 0;

  const blocked = gate.action === "FAIL_CLOSED_BLOCK" || tierInsufficient || phiBlockedOnCommercial || injectionBlocked;
  const decision = blocked ? ("FAIL_CLOSED_BLOCK" as const) : ("ALLOW_ROUTED" as const);

  const blockReasons: string[] = [];
  if (gate.action === "FAIL_CLOSED_BLOCK" || tierInsufficient) {
    blockReasons.push(
      `Classification sensitivity "${gate.detectedClassification}" exceeds permitted boundary for ${requestedTier} (max ${tierInfo.maxClass}).`,
    );
  }
  if (phiBlockedOnCommercial) {
    blockReasons.push(`Detected sensitive PII/PHI markers (${phiPiiHits.join(", ")}) on external commercial cloud tier.`);
  }
  if (injectionBlocked) {
    blockReasons.push(`OWASP LLM01 defense triggered: ${injectionHits.map((h) => h.description).join("; ")}.`);
  }

  return {
    decision,
    allowed: !blocked,
    requestedTier,
    recommendedAccreditedTier: requiredTier,
    detectedClassification: gate.detectedClassification,
    detectedMarkings: gate.detectedMarkings,
    phiPiiFlags: phiPiiHits,
    promptInjectionAlerts: injectionHits,
    externalCloudEgressPermitted: !blocked && tierInfo.externalCloudEgress,
    blockReasons,
    promptSha256: sha256Sync(prompt),
    routingAuditHash: sha256Sync(JSON.stringify({ decision, requestedTier, requiredTier, gateAudit: gate.auditHash })),
  };
}
