/**
 * NDKRS Cross-Domain Pre-Presentation Fact-Lock Validator & Certificate Signer (Server-Side)
 */

import { hmacSha256Sync, sha256Sync } from "../universal-crypto.ts";
import { logKnowledgeGap, persistValidationCertificate } from "./persistence.server.ts";
import type {
  FactLockClaim,
  FactLockResult,
  FactLockViolation,
  NdkrsDomain,
  ValidationCertificateRecord,
} from "./types.ts";

export function resolveNdkrsSigningKey(): { signingKey: string; keyMode: string } {
  const dedicatedKey = typeof process !== "undefined" ? process.env.NOCTIS_CERT_SIGNING_KEY?.trim() : "";
  if (dedicatedKey) {
    return { signingKey: dedicatedKey, keyMode: "production-hmac-key" };
  }
  const authSecret = typeof process !== "undefined" ? process.env.BETTER_AUTH_SECRET?.trim() : "";
  if (authSecret) {
    return { signingKey: authSecret, keyMode: "auth-secret-derived" };
  }
  return { signingKey: "noctis-dev-cert-key-v1", keyMode: "development-fallback" };
}

export function buildHmacCertificateSignature(params: {
  requestId: string;
  sourceInputHash: string;
  outputHash: string;
  validatorVersion: string;
  createdAt: string;
}): { hmacSignature: string; keyMode: string } {
  const { signingKey, keyMode } = resolveNdkrsSigningKey();
  const payload = `${params.requestId}|${params.sourceInputHash}|${params.outputHash}|${params.validatorVersion}|${params.createdAt}`;
  return {
    hmacSignature: hmacSha256Sync(signingKey, payload),
    keyMode,
  };
}

export function verifyCertificateSignature(cert: ValidationCertificateRecord): boolean {
  const { hmacSignature } = buildHmacCertificateSignature({
    requestId: cert.requestId,
    sourceInputHash: cert.sourceInputHash,
    outputHash: cert.outputHash,
    validatorVersion: cert.validatorVersion,
    createdAt: cert.createdAt,
  });
  return hmacSignature === cert.hmacSignature;
}

export async function validateCrossDomainFactLock(input: {
  domain: NdkrsDomain;
  requestId: string;
  rawPrompt: string;
  candidateText: string;
  lockedClaims?: FactLockClaim[];
  verifiedCitations?: string[];
  expectedVerdict?: string;
  strictCitations?: boolean;
  persist?: boolean;
}): Promise<FactLockResult> {
  const violations: FactLockViolation[] = [];
  const text = input.candidateText || "";
  const lowerText = text.toLowerCase();

  // 1. Numeric / Label Claim Verification
  for (const claim of input.lockedClaims ?? []) {
    if (typeof claim.expectedValue === "number") {
      const tol = claim.tolerance ?? Math.max(0.05, Math.abs(claim.expectedValue) * 0.02);
      const escapedLabel = claim.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const labelMatchRx = new RegExp(
        `${escapedLabel}\\s*(?:is|of|was|=|:)?\\s*(-?\\d+(?:\\.\\d+)?)`,
        "gi",
      );
      let sawLabelMatch = false;
      for (const m of text.matchAll(labelMatchRx)) {
        sawLabelMatch = true;
        const observed = parseFloat(m[1]);
        if (Number.isFinite(observed) && Math.abs(observed - claim.expectedValue) > tol) {
          violations.push({
            ruleId: "NDKRS-FACT-NUMERIC-MISMATCH",
            description: `Claim "${claim.label}" stated ${observed}${claim.unit ? ` ${claim.unit}` : ""}, conflicting with verified value ${claim.expectedValue}${claim.unit ? ` ${claim.unit}` : ""}.`,
          });
        }
      }
      if (claim.mustAppear && !sawLabelMatch && !text.includes(String(claim.expectedValue))) {
        violations.push({
          ruleId: "NDKRS-FACT-MISSING-CLAIM",
          description: `Required deterministic fact "${claim.label}" (${claim.expectedValue}) omitted from response.`,
        });
      }
    } else if (claim.mustAppear && !lowerText.includes(String(claim.expectedValue).toLowerCase())) {
      violations.push({
        ruleId: "NDKRS-FACT-MISSING-VERDICT",
        description: `Required deterministic claim "${claim.label}: ${claim.expectedValue}" omitted from response.`,
      });
    }
  }

  // 2. Contradictory Verdict Alignment
  if (input.expectedVerdict) {
    const ev = input.expectedVerdict.toUpperCase();
    if (ev === "NOT_SATISFIED" && /\b(?:fully\s+satisfied|control\s+is\s+satisfied)\b/i.test(text)) {
      violations.push({
        ruleId: "NDKRS-VERDICT-CONTRADICTION",
        description: "Candidate text asserts control is SATISFIED when deterministic verdict is NOT_SATISFIED.",
      });
    } else if (ev === "SATISFIED" && /\b(?:control\s+is\s+not\s+satisfied|fails\s+compliance)\b/i.test(text)) {
      violations.push({
        ruleId: "NDKRS-VERDICT-CONTRADICTION",
        description: "Candidate text asserts NOT_SATISFIED when deterministic verdict is SATISFIED.",
      });
    } else if (ev === "KDIGO_STAGE_3" && /\bno\s+acute\s+kidney\s+injury\b/i.test(text)) {
      violations.push({
        ruleId: "NDKRS-VERDICT-CONTRADICTION",
        description: "Candidate text denies AKI when deterministic KDIGO Stage 3 is established.",
      });
    } else if (ev === "NON_DEVICE_CDS" && /\bclassified\s+as\s+a\s+regulated\s+medical\s+device\b/i.test(text)) {
      violations.push({
        ruleId: "NDKRS-VERDICT-CONTRADICTION",
        description: "Candidate text contradicts NON_DEVICE_CDS statutory evaluation.",
      });
    }
  }

  // 3. Strict Citation Grounding
  if (input.strictCitations && (input.verifiedCitations?.length ?? 0) > 0) {
    const allowedSet = new Set(input.verifiedCitations!.map((c) => c.toUpperCase()));
    const citedControls = [...text.matchAll(/\b([A-Z]{2}-\d+(?:\(\d+\))?)\b/g)].map((m) => m[1].toUpperCase());
    for (const cited of citedControls) {
      if (!allowedSet.has(cited)) {
        violations.push({
          ruleId: "NDKRS-UNVERIFIED-CITATION",
          description: `Candidate response cited identifier "${cited}" which is absent from verified retrieved citations.`,
        });
      }
    }
  }

  const verdict: "APPROVED" | "FAIL_CLOSED" = violations.length === 0 ? "APPROVED" : "FAIL_CLOSED";
  const createdAt = new Date().toISOString();
  const validatorVersion = "NDKRS-FACTLOCK-v1.0";
  const sourceInputHash = sha256Sync(input.rawPrompt || "");
  const outputHash = sha256Sync(text);
  const { hmacSignature, keyMode } = buildHmacCertificateSignature({
    requestId: input.requestId,
    sourceInputHash,
    outputHash,
    validatorVersion,
    createdAt,
  });

  const certificate: ValidationCertificateRecord = {
    id: `CERT-${sha256Sync(`${input.requestId}|${createdAt}|${outputHash}`).slice(0, 12).toUpperCase()}`,
    domain: input.domain,
    requestId: input.requestId,
    validatorVersion,
    sourceInputHash,
    outputHash,
    verdict,
    gatesJson: [
      {
        gate: "Numeric & Claim Consistency",
        status: violations.some((v) => v.ruleId.includes("NUMERIC") || v.ruleId.includes("MISSING")) ? "FAIL" : "PASS",
      },
      {
        gate: "Deterministic Verdict Alignment",
        status: violations.some((v) => v.ruleId.includes("VERDICT")) ? "FAIL" : "PASS",
      },
      {
        gate: "Authoritative Citation Grounding",
        status: violations.some((v) => v.ruleId.includes("CITATION")) ? "FAIL" : "PASS",
      },
    ],
    violationsJson: violations,
    hmacSignature,
    keyMode,
    createdAt,
  };

  if (input.persist !== false) {
    await persistValidationCertificate(certificate).catch(() => {});
    if (verdict === "FAIL_CLOSED") {
      await logKnowledgeGap({
        domain: input.domain,
        sanitizedTopic: `FactLock Failed (${input.requestId}): ${(input.rawPrompt || "").slice(0, 140)}`,
        failureReason: violations.map((v) => v.description).join("; "),
        validatorRuleIds: violations.map((v) => v.ruleId),
      }).catch(() => {});
    }
  }

  return {
    passed: verdict === "APPROVED",
    verdict,
    violations,
    certificate,
  };
}

export async function recordClinicalCertificateAndGap(params: {
  encounterId: string;
  sourceInputHash: string;
  outputHash: string;
  verdict: "APPROVED" | "FAIL_CLOSED";
  hmacSignature: string;
  keyMode: string;
  timestamp: string;
  violations: Array<{ ruleId: string; description: string }>;
}): Promise<void> {
  const cert: ValidationCertificateRecord = {
    id: `CERT-${sha256Sync(`${params.encounterId}|${params.timestamp}`).slice(0, 12).toUpperCase()}`,
    domain: "clinical",
    requestId: params.encounterId,
    validatorVersion: "NOCTIS-VAL-v2.4-CLINICAL",
    sourceInputHash: params.sourceInputHash,
    outputHash: params.outputHash,
    verdict: params.verdict,
    gatesJson: [
      { gate: "Encounter Isolation & Single Authoritative Context", status: params.verdict === "APPROVED" ? "PASS" : "FAIL" },
      { gate: "Zero Data Fabrication & Temporal Provenance", status: params.verdict === "APPROVED" ? "PASS" : "FAIL" },
      { gate: "KDIGO Dual-Pathway & Cross-Section Integrity", status: params.verdict === "APPROVED" ? "PASS" : "FAIL" },
    ],
    violationsJson: params.violations,
    hmacSignature: params.hmacSignature,
    keyMode: params.keyMode,
    createdAt: params.timestamp,
  };
  await persistValidationCertificate(cert).catch(() => {});
  if (params.verdict === "FAIL_CLOSED") {
    await logKnowledgeGap({
      domain: "clinical",
      sanitizedTopic: `Clinical Fail-Closed Lockout (${params.encounterId})`,
      failureReason: params.violations.map((v) => v.description).join("; ") || "Safety invariant gate violation",
      validatorRuleIds: params.violations.map((v) => v.ruleId),
    }).catch(() => {});
  }
}
