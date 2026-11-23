/**
 * Priority #1 — Noctis Independent Verification Engine
 *
 * Checks every substantive candidate output across Clinical, RMF, DoD/IC, Legal,
 * Science, and Engineering domains against authoritative facts, classification gates,
 * prompt-injection patterns, deterministic calculations, and domain invariants.
 * High-risk or safety-violating answers FAIL CLOSED (`FAIL_CLOSED_BLOCK`) and log telemetry
 * to `enterprise.verification_events`.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { evaluateClassificationGate } from "../dod-ic/classification-gateway.ts";
import { detectEncounterContamination } from "../noctis-clinical-validation-engine.ts";
import { auditAndEnforceClinicalDossier } from "../noctis-clinical-preflight-auditor.ts";
import { buildRmfGroundingPacket, verifyRmfResponseAgainstDb } from "../noctis-rmf-db.ts";
import { validateCrossDomainFactLock } from "../ndkrs/fact-lock-validator.server.ts";
import type { FactLockClaim, NdkrsDomain } from "../ndkrs/types.ts";
import { routeSecureModelRequest } from "./secure-model-gateway.ts";
import { recordVerificationEvent } from "./persistence.server.ts";
import type { IndependentVerificationResult, VerificationStatus } from "./types.ts";

export async function verifySubstantiveOutput(input: {
  domain: NdkrsDomain | "dod-ic" | "enterprise";
  requestId?: string;
  rawPrompt: string;
  candidateOutput: string;
  lockedClaims?: FactLockClaim[];
  expectedVerdict?: string;
  actorId?: string;
  tenantId?: string;
  persistTelemetry?: boolean;
}): Promise<IndependentVerificationResult> {
  const start = Date.now();
  const reqId = input.requestId || `VERIF-${sha256Sync(`${input.rawPrompt}|${Date.now()}`).slice(0, 10).toUpperCase()}`;
  const outHash = sha256Sync(input.candidateOutput || "");
  const violations: IndependentVerificationResult["violations"] = [];
  let rulesChecked = 0;

  // Gate 1: Classification Boundary & Commercial Cloud Safety
  rulesChecked += 1;
  const gate = evaluateClassificationGate({
    text: `${input.rawPrompt}\n${input.candidateOutput}`,
  });
  if (gate.action === "FAIL_CLOSED_BLOCK") {
    violations.push({
      code: "GATE0_CLASSIFICATION_VIOLATION",
      severity: "CRITICAL",
      message: gate.reason,
    });
  }

  // Gate 2: OWASP LLM01 Prompt-Injection / Spoofing Defense
  rulesChecked += 1;
  const gw = routeSecureModelRequest({ prompt: input.rawPrompt, requestedTier: "COMMERCIAL_CLOUD" });
  if (gw.promptInjectionAlerts.length > 0) {
    violations.push({
      code: "OWASP_LLM01_INJECTION",
      severity: "CRITICAL",
      message: gw.promptInjectionAlerts.map((a) => a.description).join("; "),
    });
  }

  // Gate 3: Clinical Safety & Encounter Contamination
  if (input.domain === "clinical") {
    rulesChecked += 2;
    const contamination = detectEncounterContamination(input.rawPrompt);
    if (contamination.isContaminated) {
      violations.push({
        code: `CLINICAL_${contamination.contaminationType || "CONTAMINATION"}`,
        severity: "CRITICAL",
        message: `Blocked cross-encounter / demographic contamination (${contamination.contaminationType}).`,
      });
    }
    if (input.candidateOutput.trim()) {
      const preflight = auditAndEnforceClinicalDossier(input.candidateOutput, input.rawPrompt, reqId);
      if (!preflight.isApproved || !preflight.mandatoryReleasePassed) {
        for (const f of preflight.mandatoryReleaseFailures) {
          violations.push({
            code: "CLINICAL_MANDATORY_RELEASE_FAIL",
            severity: "CRITICAL",
            message: f,
          });
        }
        if (preflight.mandatoryReleaseFailures.length === 0) {
          for (const v of preflight.violations.slice(0, 4)) {
            violations.push({
              code: v.ruleId,
              severity: "HIGH",
              message: v.description,
            });
          }
        }
      }
    }
  }

  // Gate 4: RMF & DoD/IC Authorizing Official & Jurisdiction Separation Invariants
  if (input.domain === "rmf" || input.domain === "dod-ic") {
    rulesChecked += 2;
    const lowerOut = (input.candidateOutput || "").toLowerCase();
    if (
      /\b(?:ai|noctis)\s+(?:has\s+)?(?:granted|issued|approved)\s+(?:the\s+)?(?:ato|authorization\s+to\s+operate)\b/i.test(
        input.candidateOutput,
      )
    ) {
      violations.push({
        code: "RMF_AI_ATO_FORBIDDEN",
        severity: "CRITICAL",
        message: "Only a designated Human Authorizing Official (AO) can grant an ATO (`aiCanIssueAto: false`).",
      });
    }
    const hasNegationBeforeEquivalence =
      /\b(?:not|never|cannot|doesn't|does\s+not|do\s+not)\s+(?:be\s+|automatically\s+)?(?:identical|satisfy|satisfies|equivalent|cover|covers|authorize|authorizes)/i.test(
        input.candidateOutput,
      );
    if (
      /\bdod\s+ato\s+automatically\s+satisfies\s+icd\s*503\b/i.test(input.candidateOutput) ||
      (lowerOut.includes("dodi 8510.01") && lowerOut.includes("identical to icd 503")) ||
      (!hasNegationBeforeEquivalence &&
        /\b(?:dod\s+rmf|dodi\s*8510\.01|dod\s+ato)\b[^.\n]{0,80}\b(?:identical\s+to|automatically\s+satisfies|equivalent\s+to|replaces)\b[^.\n]{0,80}\bicd\s*503\b/i.test(
          input.candidateOutput,
        ))
    ) {
      violations.push({
        code: "DOD_IC_JURISDICTION_CONFLATION",
        severity: "CRITICAL",
        message: "DoD RMF (DoDI 8510.01) ATOs do NOT automatically satisfy ODNI ICD 503 IC authorization.",
      });
    }
    if (
      !hasNegationBeforeEquivalence &&
      /\bfedramp\b[^.\n]{0,80}\b(?:satisfies|covers|equivalent\s+to|automatically\s+authorizes|authorizes)\b[^.\n]{0,80}\b(?:top\s*secret|ts\s*\/\/\s*sci|scif|icd\s*503|classified)\b/i.test(
        input.candidateOutput,
      )
    ) {
      violations.push({
        code: "FEDRAMP_CLASSIFIED_JURISDICTION_CONFLATION",
        severity: "CRITICAL",
        message: "FedRAMP authorization never automatically satisfies Top Secret / SCI / SCIF / ICD 503 requirements.",
      });
    }
    if (input.domain === "rmf" && input.candidateOutput.trim()) {
      const packet = buildRmfGroundingPacket(input.rawPrompt);
      const rmfCheck = verifyRmfResponseAgainstDb(input.rawPrompt, input.candidateOutput, packet);
      for (const v of rmfCheck.violations.slice(0, 4)) {
        violations.push({
          code: "RMF_STAGE3_INVARIANT",
          severity: "HIGH",
          message: v,
        });
      }
    }
  }

  // Gate 5: Cross-Domain Numeric & Claim Fact-Lock Validation
  if ((input.lockedClaims && input.lockedClaims.length > 0) || input.expectedVerdict) {
    rulesChecked += 1;
    const ndkrsDomain: NdkrsDomain =
      input.domain === "dod-ic" ? "cybersecurity" : input.domain === "enterprise" ? "general" : input.domain;
    const lockRes = await validateCrossDomainFactLock({
      domain: ndkrsDomain,
      requestId: reqId,
      rawPrompt: input.rawPrompt,
      candidateText: input.candidateOutput,
      lockedClaims: input.lockedClaims,
      expectedVerdict: input.expectedVerdict,
      persist: false,
    });
    for (const v of lockRes.violations) {
      violations.push({
        code: v.ruleId,
        severity: "CRITICAL",
        message: v.description,
      });
    }
  }

  const hasCritical = violations.some((v) => v.severity === "CRITICAL");
  const status: VerificationStatus = hasCritical
    ? "FAIL_CLOSED_BLOCK"
    : violations.length > 0
    ? "FAIL"
    : "PASS";
  const latencyMs = Math.max(1, Date.now() - start);
  const eventId = `VRF-${sha256Sync(`${reqId}|${outHash}|${latencyMs}`).slice(0, 10).toUpperCase()}`;

  const persisted =
    input.persistTelemetry === false
      ? false
      : await recordVerificationEvent({
          id: eventId,
          domain: input.domain,
          requestId: reqId,
          status,
          rulesChecked,
          violations,
          outputSha256: outHash,
          latencyMs,
          actorId: input.actorId || "system",
          tenantId: input.tenantId || "tenant:public-sandbox",
        });

  return {
    id: eventId,
    domain: input.domain,
    requestId: reqId,
    status,
    rulesChecked,
    violations,
    outputSha256: outHash,
    latencyMs,
    failClosedTriggered: status === "FAIL_CLOSED_BLOCK",
    persisted,
  };
}
