/**
 * Noctis Defense & IC Neuro-Symbolic Reasoning Engine (Wave 1 — Step 1)
 *
 * Orchestrates:
 *   Gate 0: Classification & Boundary Guard BEFORE any external LLM dispatch
 *   Stage 1: Deterministic DoDI 8510.01 / CNSSI 1253 / ICD 503 / ICD 501 / CDS Rules
 *   Stage 2: Constrained Synthesis (temperature: 0.0) + Deterministic Offline Fallback
 *   Stage 3: Anti-Conflation Verifier + 1-Shot Repair + SQL EXPLANATION Persistence
 */

import { parseThinkEnvelope } from "../noctis-engine-registry.ts";
import { createExplanationBundle, type ExplanationBundle } from "../rmf-v2/graph-and-trace.ts";
import { saveRmfArtifact } from "../rmf-v2/persistence.server.ts";
import { sha256Sync } from "../universal-crypto.ts";
import {
  evaluateClassificationGate,
  evaluateCrossDomainTransfer,
  type ClassificationGateResult,
  type DeploymentBoundary,
  type SecurityClassification,
} from "./classification-gateway.ts";
import {
  evaluateCnssi1253Categorization,
  evaluateDod8510Authorization,
  evaluateDodReciprocity,
  type DodIcRuleResult,
  type ImpactLevel,
} from "./dod-rmf-engine.ts";
import { evaluateIcd501SharingGovernance, evaluateIcd503Authorization, evaluateIcReciprocity } from "./ic-security-engine.ts";
import { searchDodIcPolicies, type DodIcPolicyRecord } from "./policy-registry.ts";

export interface DodIcModelChatFn {
  (
    messages: { role: string; content: string }[],
    opts?: {
      maxTokens?: number;
      temperature?: number;
      brain?: { provider?: string; apiKey?: string; model?: string; endpoint?: string };
      thinkingLevel?: "minimal" | "low" | "medium" | "high";
    },
  ): Promise<{ text: string } | { error: string }>;
}

export interface DodIcReasoningOptions {
  turns?: { role: "user" | "assistant"; content: string }[];
  brain?: { provider?: string; apiKey?: string; model?: string; endpoint?: string };
  engineName?: string;
  language?: string;
  shouldThink?: boolean;
  modelChatFn?: DodIcModelChatFn;
  deploymentBoundary?: DeploymentBoundary;
  claimedUserClearance?: SecurityClassification | null;
  tenantId?: string;
  persistTrace?: boolean;
}

export function isDodIcQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q) return false;
  return /\b(?:dodi?\s*8510(?:\.01)?|dodi?\s*8540(?:\.01)?|dodm\s*5200(?:\.01)?|eo\s*13526|dod\s+rmf|dod\s+ato|dod\s+reciproc\w*|emass\b|iatt\b|dato\b|atowc\b|icd\s*50[123]|icd\s*705|ic\s+ie\b|ic\s+rmf|ic\s+ato|ic\s+reciproc\w*|ic\s+cloud|ic\s+security|odni\b|cnssi?\s*1253|national\s+security\s+system|nss\s+categoriz\w*|cross[- ]?domain\s+(?:solution|transfer|guard|governance)|ncdsmo\b|ts\/?sci\b|\bscif\b|classified\s+(?:spillage|system|systems|enclave|handling|payload|cable|material)|commercial\s+cloud[^.\n]{0,40}classified|classified[^.\n]{0,40}commercial\s+cloud)\b/i.test(
    q,
  );
}

export function extractAndEvaluateDodIcRulesFromText(question: string): DodIcRuleResult[] {
  const q = (question || "").trim();
  if (!q) return [];
  const results: DodIcRuleResult[] = [];
  const evidenceVerified = /\b(?:verified\s+(?:audit\s+)?evidence|attached\s+(?:audit\s+)?artifacts?|immutable\s+logs?\s+attached|sha-?256\s*[:=])\b/i.test(
    q,
  );
  const assessmentMode = evidenceVerified ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION";

  const parseImpact = (label: string): ImpactLevel | null => {
    const m = q.match(new RegExp(`\\b${label}\\s*(?:impact|=|:|\\bis\\b)?\\s*(low|moderate|high)\\b`, "i"));
    if (!m) return null;
    return m[1]!.toUpperCase() as ImpactLevel;
  };

  // 1. CNSSI 1253 Security Categorization & Overlays
  if (/\b(?:cnssi?\s*1253|nss\s+categoriz\w*|national\s+security\s+system)\b/i.test(q) || (parseImpact("confidentiality") && /\b(?:ts\/?sci|secret|classified|icd\s*503|dodi?\s*8510)\b/i.test(q))) {
    const c = parseImpact("confidentiality") || (/\b(ts\/?sci|top\s*secret|secret)\b/i.test(q) ? "HIGH" : "MODERATE");
    const i = parseImpact("integrity") || "MODERATE";
    const a = parseImpact("availability") || "LOW";
    const cls: SecurityClassification = /\b(ts\/?sci|sci\b)\b/i.test(q)
      ? "TS_SCI"
      : /\btop\s*secret\b/i.test(q)
      ? "TOP_SECRET"
      : /\bsecret\b/i.test(q)
      ? "SECRET"
      : /\bcui\b/i.test(q)
      ? "CUI"
      : "UNCLASSIFIED";
    results.push(
      evaluateCnssi1253Categorization({
        confidentiality: c,
        integrity: i,
        availability: a,
        classification: cls,
        isIntelligenceSystem: /\b(ic\b|icd\s*503|intelligence|ts\/?sci|\bsci\b)\b/i.test(q),
        hasCrossDomainSolution: /\b(cross[- ]?domain|\bcds\b|ncdsmo)\b/i.test(q),
        isSpaceSystem: /\bspace\b|\bsatellite\b/i.test(q),
        processesPiiPrivacy: /\bpii\b|\bprivacy\b/i.test(q),
        isCloudSystem: /\bcloud\b|\bsrg\b|\bc2s\b|\bil[456]\b/i.test(q),
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 2. IC vs. DoD Reciprocity Check
  if (
    (/\breciproc\w*|automatically\s+satisf(?:y|ies)|reuse\s+(?:an?\s+)?(?:dod\s+)?ato|cross[- ]?community\b/i.test(q) &&
      /\b(?:icd\s*503|ic\s+authorization|ic\s+rmf|ic\s+ato|intelligence\s+community|dod\s+ato)\b/i.test(q)) ||
    (/\bdod\s+ato\b/i.test(q) && /\bicd\s*503\b/i.test(q))
  ) {
    if (/\b(?:icd\s*503|ic\s+authorization|ic\s+ato|ic\s+system|intelligence\s+community)\b/i.test(q)) {
      const sourceAuthorizationType = /\b(?:dod\s+ato|dodi?\s*8510)\b/i.test(q)
        ? "DOD_ATO"
        : /\bfedramp\b/i.test(q)
        ? "FEDRAMP_ATO"
        : "IC_ICD503_ATO";
      results.push(
        evaluateIcReciprocity({
          sourceAuthorizationType,
          sourceAtoActiveAndUnexpired: /\bexpired\b/i.test(q) ? false : null,
          icOverlaysAndSciVerified: /\bverified\s+(?:ic|sci)\s+overlays\b/i.test(q) ? true : sourceAuthorizationType !== "IC_ICD503_ATO" ? false : null,
          assessmentMode,
          evidenceVerified,
        }),
      );
    } else {
      results.push(
        evaluateDodReciprocity({
          targetJurisdiction: "DOD",
          sourceAtoActiveAndUnexpired: /\bexpired\b/i.test(q) ? false : null,
          cat1OpenWithoutAoAcceptance: /\bcat\s*i\b|\bcat[- ]?1\b/i.test(q) ? true : null,
          assessmentMode,
          evidenceVerified,
        }),
      );
    }
  }

  // 3. DoDI 8510.01 DoD RMF Authorization Readiness
  if (/\bdodi?\s*8510|emass|dod\s+ato|dod\s+rmf|cat\s*i\b|cat\s*1\b/i.test(q) && /\b(evaluat\w*|assess\w*|ready|readiness|authorize|authorization|can\s+.*issue|gap|missing|cat\s*i|cat\s*1|no\s+independent\s+sca)\b/i.test(q)) {
    const cat1Match = q.match(/(\d+)\s+(?:unmitigated\s+|open\s+)?cat\s*(?:i|1)\b/i);
    const noSca = /\b(?:no|without|lacks?|missing)\s+independent\s+sca\b|\bself[- ]assess/i.test(q);
    const noEmass = /\b(?:not\s+(?:registered|in)\s+emass|missing\s+emass|no\s+emass)\b/i.test(q);
    results.push(
      evaluateDod8510Authorization({
        emassRegistered: noEmass ? false : /\bemass\s+(?:registered|active)\b/i.test(q) ? true : null,
        independentScaAssigned: noSca ? false : null,
        cat1UnmitigatedCount: cat1Match ? Number(cat1Match[1]) : null,
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 4. ICD 503 IC Authorization Readiness
  if (/\bicd\s*503|ic\s+cloud|ic\s+rmf|ic\s+ie\b/i.test(q) && /\b(evaluat\w*|assess\w*|commercial\s+cloud|zero\s+trust|authorize|authorization|requirements?|ts\/?sci)\b/i.test(q)) {
    const isCommercial = /\bcommercial\s+(?:cloud|llm|saas|public\s+cloud)\b/i.test(q);
    const noZt = /\bwithout\s+zero\s+trust|no\s+zero\s+trust\b/i.test(q);
    const no502 = /\b(?:no|without)\s+icd\s*502\b/i.test(q);
    if (isCommercial || noZt || no502 || /\bevaluat\w*|assess\w*/i.test(q)) {
      results.push(
        evaluateIcd503Authorization({
          deploymentBoundary: isCommercial ? "COMMERCIAL_UNCLASSIFIED" : "IC_C2S_TS_SCI",
          zeroTrustAligned: noZt ? false : /\bzero\s+trust\b/i.test(q) ? true : null,
          icd502ConMonEnrolled: no502 ? false : null,
          assessmentMode,
          evidenceVerified,
        }),
      );
    }
  }

  // 5. Cross-Domain Solution (DoDI 8540.01)
  if (/\b(?:cross[- ]?domain|ncdsmo|\bcds\b|high[- ]to[- ]low|dodi?\s*8540)\b/i.test(q) && /\b(evaluat\w*|assess\w*|transfer|without|bypass|check|missing|script)\b/i.test(q)) {
    const srcCls: SecurityClassification = /\b(?:ts\/?sci|top\s*secret)\b/i.test(q) ? "TS_SCI" : /\bsecret\b/i.test(q) ? "SECRET" : "CUI";
    const dstCls: SecurityClassification = /\b(?:unclass|low[- ]side|nipr)\b/i.test(q) ? "UNCLASSIFIED" : "CUI";
    const noCds = /\b(?:without|no|bypass(?:ing)?)\s+(?:an?\s+)?(?:accredited\s+)?(?:cds|cross[- ]?domain)\b|\bdual[- ]homed\b/i.test(q);
    results.push(
      evaluateCrossDomainTransfer({
        sourceClassification: srcCls,
        targetClassification: dstCls,
        accreditedCdsPresent: noCds ? false : null,
        securityLabelingVerified: /\bmissing\s+(?:security\s+)?label\b/i.test(q) ? false : null,
        releaseAuthorityApproved: /\bno\s+release\s+approv\w*|without\s+release\b/i.test(q) ? false : null,
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 6. ICD 501 Sharing / Commercial Cloud Scenario
  if (/\bicd\s*501\b/i.test(q) && /\b(commercial\s+cloud|orcon|noforn|need[- ]to[- ]know|clearance|share|disseminat)\b/i.test(q)) {
    const isCom = /\bcommercial\s+(?:cloud|model|llm|saas)\b/i.test(q);
    results.push(
      evaluateIcd501SharingGovernance({
        dataClassification: /\bts\/?sci|top\s*secret\b/i.test(q) ? "TS_SCI" : /\bsecret\b/i.test(q) ? "SECRET" : "CUI",
        targetBoundary: isCom ? "COMMERCIAL_UNCLASSIFIED" : "IC_C2S_TS_SCI",
        userClearance: /\bts\/?sci\b/i.test(q) ? "TS_SCI" : "SECRET",
        requiresOrconApproval: /\borcon\b/i.test(q),
        orconOriginatorApproved: /\bno\s+orcon|without\s+orcon|unapproved\b/i.test(q) ? false : null,
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  return results;
}

export interface DodIcVerificationReport {
  passed: boolean;
  violations: string[];
}

export function verifyDodIcResponse(
  _question: string,
  draftBody: string,
  ruleResults: DodIcRuleResult[],
): DodIcVerificationReport {
  const violations: string[] = [];

  // Block DoD ATO == IC ATO conflation
  if (
    /\bdod\s+ato\b[^.\n]{0,80}\bautomatically\s+satisf(?:y|ies)\b[^.\n]{0,60}\bic(?:d\s*503)?\b/i.test(draftBody) &&
    !/\bdoes\s+not\s+automatically\b|\bnot\s+automatically\b|\bcannot\s+automatically\b/i.test(draftBody)
  ) {
    violations.push(
      "DOD_IC_RECIPROCITY_CONFLATION: Response claimed a DoD ATO automatically satisfies IC ICD 503. Per ODNI ICD 503 (Oct 25, 2024), DoD and IC authorizations remain distinct.",
    );
  }

  // Block claiming user clearance authorizes commercial cloud processing of classified material
  if (
    /\bclearance\b[^.\n]{0,80}\b(?:authorizes?|allows?|permits?)\b[^.\n]{0,80}\bcommercial\s+(?:cloud|llm|model)\b[^.\n]{0,40}\b(?:secret|classified|ts\/?sci)\b/i.test(
      draftBody,
    ) &&
    !/\bdoes\s+not\s+authorize\b|\bnever\s+authorizes\b|\bprohibited\b/i.test(draftBody)
  ) {
    violations.push(
      "CLASSIFICATION_BOUNDARY_VIOLATION: User security clearance never authorizes classified/SCI material in a commercial cloud model or lower-classification enclave.",
    );
  }

  // Block AI ATO issuance claims
  if (/\bnoctis\s+(?:grants?|issues?|approves?)\s+(?:an?\s+)?(?:ato|iatt|authorization\s+to\s+operate)\b/i.test(draftBody)) {
    violations.push("AI_ATO_CLAIM: Only a designated DoD or IC Authorizing Official (AO) can render an ATO decision.");
  }

  // Per-rule verdict fidelity check
  for (const r of ruleResults) {
    const scopeId = r.ruleId.includes("RECIP") ? "reciprocity" : r.ruleId.includes("CNSSI") ? "cnssi" : r.ruleId;
    if (r.verdict === "FAIL") {
      const hasFailWord = /\b(?:FAIL|FAILED|DOES NOT|NOT PERMITTED|PROHIBITED|DENIED|BLOCKED|NON[- ]COMPLIANT)\b/i.test(draftBody);
      if (!hasFailWord) {
        violations.push(`RULE_VERDICT_CONTRADICTION: Rule ${r.ruleId} [${scopeId}] evaluated to FAIL, but draft omitted FAIL / denial language.`);
      }
    }
  }

  return { passed: violations.length === 0, violations };
}

export function renderDeterministicDodIcFallback(
  question: string,
  policies: DodIcPolicyRecord[],
  ruleResults: DodIcRuleResult[],
): string {
  const out: string[] = [];
  out.push("# Noctis DoD RMF & Intelligence Community Security Assessment (NDIMP Wave 1)");
  out.push(`**Query Scope:** ${question.trim().slice(0, 220)}\n`);

  if (ruleResults.length > 0) {
    out.push("## Deterministic Rule Evaluations");
    for (const r of ruleResults) {
      out.push(`### ${r.title} (\`${r.ruleId}\` · Jurisdiction: \`${r.jurisdiction}\`)`);
      out.push(`- **Scenario / Rule Verdict:** **${r.verdict}** *(Mode: \`${r.assessmentMode}\`)*`);
      out.push(`- **Formal Assessor Determination:** **${r.formalDetermination}**`);
      out.push(`- **Summary:** ${r.summary}`);
      out.push(`- **Threshold:** ${r.threshold}`);
      out.push(`- **Variance:** ${r.variance}`);
      out.push(`- **Audit Hash:** \`${r.auditHash}\` · \`aiCanIssueAto: ${r.aiCanIssueAto}\``);
      if (r.missingEvidence.length > 0) {
        out.push(`- **Formal Evidence Required:** ${r.missingEvidence.join("; ")}`);
      }
      out.push("");
    }
  }

  out.push("## Authoritative Policy Citations & Boundary Rules");
  for (const p of policies) {
    out.push(`### ${p.id} — ${p.title}`);
    out.push(`- **Jurisdiction:** \`${p.jurisdiction}\` | **Version:** ${p.version} | **Effective:** \`${p.effectiveDate}\` | **Issuing Authority:** ${p.issuingAuthority}`);
    if (p.supersededVersion) out.push(`- **Supersedes:** ${p.supersededVersion}`);
    out.push(`- **Scope:** ${p.scope}`);
    out.push(`- **Key Requirements:** ${p.keyRequirements.join(" ")}`);
    out.push(`- **Distinct Boundary Invariant:** ${p.distinctBoundaryNote}`);
    out.push("");
  }

  out.push(
    "> **Governance & Accreditation Boundary:** Noctis enforces strict DoD vs. IC reciprocity separation (`DoD ATO != IC ICD 503`), strict classification-aware boundaries (clearance never authorizes commercial cloud processing of classified/SCI data), and human Authorizing Official (AO) authority for all ATO/DATO decisions.",
  );
  return out.join("\n");
}

function buildDodIcSystemPrompt(lang: string, shouldThink: boolean): string {
  return [
    "You are Noctis Defense & Intelligence Community Security Architect (NDIMP Wave 1), strictly grounded in verified public DoD Directives, ODNI Intelligence Community Directives (ICDs), CNSSI 1253, and EO 13526.",
    "",
    shouldThink
      ? "Begin with a concise `<think>...</think>` block verifying policy effective dates, DoD-vs-IC reciprocity boundaries, CNSSI 1253 C/I/A vectors, and classification invariants before writing the Markdown response."
      : "Respond concisely with no raw XML tags.",
    "",
    "NON-NEGOTIABLE INVARIANTS:",
    "1. DOD VS. IC DISTINCTION: A DoD ATO (DoDI 8510.01, July 19, 2022) NEVER automatically satisfies an ODNI ICD 503 (Oct 25, 2024) IC IE authorization. Explain exact IC/SCI overlay delta analysis, ICD 502 ConMon, and receiving IC AO acceptance requirements.",
    "2. CNSSI 1253 VECTORS: Under CNSSI 1253 (July 2022), Confidentiality, Integrity, and Availability remain INDEPENDENT control-selection vectors (do NOT collapse C/I/A into a single FedRAMP High-Water Mark baseline); cite Confidentiality floors & mandatory NSS overlays.",
    "3. CLASSIFICATION BOUNDARY: User clearance and need-to-know NEVER authorize sending classified or TS/SCI data to commercial cloud LLMs or lower-classification enclaves; accredited boundary + need-to-know + ICD 501/503 gates are mandatory.",
    "4. SCENARIO VS. FORMAL EVIDENCE: Distinguish stipulated scenario assumptions from formal assessor verification (`PENDING_EVIDENCE` until eMASS/Xacta/SCA artifacts are verified). State that only a designated DoD or IC AO renders formal ATO decisions.",
    "5. AUTHORITIES: Cite ONLY exact versions and effective dates present in the Knowledge Packet (`DoDI 8510.01` `2022-07-19`, `ICD 503` `2024-10-25`, `ICD 502` `2011-03-11`, `ICD 501` `2009-01-21`, `CNSSI 1253` `2022-07`).",
    `6. LANGUAGE: ${!/^english$/i.test(lang) ? `Respond in ${lang} while keeping US DoD/IC directive IDs in English.` : "Write in authoritative English."}`,
  ].join("\n");
}

export async function executeDodIcReasoning(
  rawQuestion: string,
  opts: DodIcReasoningOptions = {},
): Promise<string> {
  const q = (rawQuestion || "").trim();
  const shouldThink = opts.shouldThink !== false;
  const tenantId = opts.tenantId?.trim() || "chat-session";

  // GATE 0: Fail-Closed Classification & Commercial Cloud Boundary Check BEFORE any LLM call
  const gate: ClassificationGateResult = evaluateClassificationGate({
    text: q,
    targetBoundary: opts.deploymentBoundary || "COMMERCIAL_UNCLASSIFIED",
    claimedUserClearance: opts.claimedUserClearance ?? null,
    requestedModelTarget: "COMMERCIAL_CLOUD_LLM",
  });

  if (gate.action === "FAIL_CLOSED_BLOCK") {
    // Log sanitized audit metadata ONLY (never store raw classified input text!)
    const blockBundle = createExplanationBundle({
      tenantId,
      evaluationRef: "CLASSIFICATION_GATE_BLOCK",
      nistVersion: "5.2.0",
      dbSha256: gate.auditHash,
      ruleId: "DOD-IC-CLASSIFICATION-GATE-001",
      ruleVersion: "1.0.0",
      evidenceSha256: gate.inputSha256,
      observedFacts: {
        action: gate.action,
        targetBoundary: gate.targetBoundary,
        detectedClassification: gate.detectedClassification,
        detectedMarkings: gate.detectedMarkings.join(","),
        blockExternalLlm: true,
        rawTextStored: false,
      },
      deterministicClassifications: [
        `FAIL_CLOSED_BLOCK: ${gate.detectedClassification} markings blocked from ${gate.targetBoundary}`,
      ],
      analyticalEstimates: [],
      verdict: "FAIL_CLOSED_BLOCK",
      ruleEvaluations: [
        {
          ruleId: "DOD-IC-CLASSIFICATION-GATE-001",
          ruleVersion: "1.0.0",
          controlId: "CLASSIFICATION-GATE",
          assessmentMode: "DETERMINISTIC_BOUNDARY_GUARD",
          verdict: "FAIL_CLOSED_BLOCK",
          formalDetermination: "FAIL_CLOSED_BLOCK",
          variance: `${gate.detectedClassification} > ${gate.boundaryMaxClassification}`,
          auditHash: gate.auditHash,
          observedFacts: {
            targetBoundary: gate.targetBoundary,
            detectedClassification: gate.detectedClassification,
            blockExternalLlm: true,
          },
          authorityDocs: gate.authorityCitations.map((a) => `${a.id} (${a.effectiveDate})`),
        },
      ],
    });

    if (opts.persistTrace !== false) {
      try {
        await saveRmfArtifact({
          id: blockBundle.bundleId,
          tenantId,
          artifactType: "EXPLANATION",
          systemId: "noctis-classification-gateway",
          title: `Classification Boundary Block (${gate.detectedClassification})`,
          status: "BLOCKED",
          payload: blockBundle as unknown as Record<string, unknown>,
          createdBy: tenantId,
        });
      } catch {
        /* Non-fatal if DB unavailable */
      }
    }

    const body = `${gate.refusalMarkdown}\n\n**Audit Trace:** \`${blockBundle.bundleId}\` (\`${blockBundle.canonicalTraceHash.slice(0, 12)}\`)`;
    return shouldThink
      ? `<think>\nClassification Gate FAIL_CLOSED_BLOCK triggered (${gate.detectedClassification} markings detected; external LLM dispatch aborted).\n</think>\n\n${body}`
      : body;
  }

  // STAGE 1: Deterministic Policy & Rule Execution
  const policies = searchDodIcPolicies(q);
  const rules = extractAndEvaluateDodIcRulesFromText(q);
  const combinedEvidenceSha =
    rules.length === 0
      ? sha256Sync(policies.map((p) => `${p.id}:${p.effectiveDate}`).join("|"))
      : sha256Sync(rules.map((r) => `${r.ruleId}:${r.auditHash}`).join("|"));

  const bundle: ExplanationBundle = createExplanationBundle({
    tenantId,
    evaluationRef: rules.length > 0 ? rules.map((r) => r.ruleId).join("+") : policies.map((p) => p.id).join("+"),
    nistVersion: "5.2.0",
    dbSha256: sha256Sync(JSON.stringify(policies.map((p) => ({ id: p.id, effectiveDate: p.effectiveDate })))),
    ruleId: rules.length > 0 ? rules.map((r) => r.ruleId).join("+") : "DOD-IC-POLICY-GROUNDED",
    ruleVersion: "ndimp-wave1-1.0.0",
    evidenceSha256: combinedEvidenceSha,
    observedFacts:
      rules.length === 1
        ? rules[0]!.observedFacts
        : {
            rulesExecuted: rules.length,
            policiesLoaded: policies.map((p) => p.id).join(", "),
            verdicts: rules.map((r) => `${r.ruleId}:${r.verdict}`).join(", "),
          },
    deterministicClassifications:
      rules.length > 0
        ? rules.map((r) => `${r.ruleId}: Scenario=${r.verdict} | Formal=${r.formalDetermination} — ${r.variance}`)
        : policies.map((p) => `${p.id} (${p.effectiveDate}): Grounded Policy Citation`),
    analyticalEstimates: [],
    verdict: rules.length > 0 ? rules.map((r) => `${r.ruleId}:${r.verdict}`).join("|") : "POLICY_GROUNDED",
    ruleEvaluations: rules.map((r) => ({
      ruleId: r.ruleId,
      ruleVersion: r.ruleVersion,
      controlId: r.jurisdiction + ":" + r.ruleId,
      assessmentMode: r.assessmentMode,
      verdict: r.verdict,
      formalDetermination: r.formalDetermination,
      variance: r.variance,
      auditHash: r.auditHash,
      observedFacts: r.observedFacts,
      authorityDocs: r.authorityCitations.map((a) => `${a.id} (${a.effectiveDate})`),
    })),
  });

  // Build deterministic knowledge packet for LLM Stage 2
  const packetText = [
    "### AUTHORITATIVE DOD & IC POLICY REGISTRY (VERIFIED PUBLIC METADATA)",
    ...policies.map(
      (p) =>
        `- **${p.id} (${p.title})** | Version: ${p.version} | Effective: ${p.effectiveDate} | Authority: ${p.issuingAuthority}\n  - Requirements: ${p.keyRequirements.join(" ")}\n  - Boundary Invariant: ${p.distinctBoundaryNote}`,
    ),
    "",
    ...(rules.length > 0
      ? [
          "### DETERMINISTIC DOD/IC RULE VERDICTS (IMMUTABLE)",
          ...rules.map(
            (r) =>
              `- **${r.ruleId} [${r.jurisdiction}]: VERDICT = \`${r.verdict}\` | MODE = \`${r.assessmentMode}\` | FORMAL = \`${r.formalDetermination}\`**\n  - Summary: ${r.summary}\n  - Threshold: ${r.threshold}\n  - Variance: ${r.variance}\n  - Missing Evidence: ${r.missingEvidence.join("; ")}\n  - Audit Hash: \`${r.auditHash}\``,
          ),
        ]
      : []),
    "",
    `Trace Bundle: \`${bundle.bundleId}\` (Canonical SHA-256: \`${bundle.canonicalTraceHash}\`)`,
  ].join("\n");

  let chatFn = opts.modelChatFn;
  if (!chatFn) {
    const mod = await import("../video-mind.server.ts");
    chatFn = mod.modelChat as unknown as DodIcModelChatFn;
  }

  let finalBody = "";
  let activeThought = "";
  let audit = verifyDodIcResponse(q, "", rules);

  try {
    const sys = buildDodIcSystemPrompt(opts.language || "English", shouldThink);
    const first = await chatFn(
      [
        { role: "system", content: sys },
        ...(opts.turns || []).slice(-4, -1).map((t) => ({ role: t.role, content: t.content.slice(0, 1500) })),
        { role: "user", content: `QUESTION:\n${q}\n\nIMMUTABLE DOD/IC PACKET:\n${packetText}` },
      ],
      { temperature: 0.0, maxTokens: 2800, thinkingLevel: shouldThink ? "high" : "medium", brain: opts.brain },
    );

    if ("text" in first && first.text.trim()) {
      const parsed = parseThinkEnvelope(first.text);
      activeThought = parsed.thought;
      if (parsed.body.length >= 25) {
        finalBody = parsed.body;
        audit = verifyDodIcResponse(q, finalBody, rules);
        if (!audit.passed) {
          const repaired = await chatFn(
            [
              { role: "system", content: sys },
              {
                role: "user",
                content: `Fix ALL violations:\n${audit.violations.join("\n")}\n\nPACKET:\n${packetText}\n\nDRAFT:\n${finalBody}`,
              },
            ],
            { temperature: 0.0, maxTokens: 2800, thinkingLevel: "high", brain: opts.brain },
          );
          if ("text" in repaired && repaired.text.trim()) {
            const p2 = parseThinkEnvelope(repaired.text);
            if (p2.body.length >= 25) {
              const a2 = verifyDodIcResponse(q, p2.body, rules);
              if (a2.passed) {
                finalBody = p2.body;
                if (p2.thought) activeThought = p2.thought;
                audit = a2;
              }
            }
          }
        }
      }
    }
  } catch {
    /* Deterministic fallback below */
  }

  if (!finalBody || !audit.passed) {
    finalBody = renderDeterministicDodIcFallback(q, policies, rules);
  }

  let persistedSql = false;
  if (opts.persistTrace !== false) {
    try {
      await saveRmfArtifact({
        id: bundle.bundleId,
        tenantId,
        artifactType: "EXPLANATION",
        systemId: "noctis-dod-ic-engine",
        title: `DoD/IC Trace ${bundle.evaluationRef} (${bundle.verdict})`,
        status: "RECORDED",
        payload: bundle as unknown as Record<string, unknown>,
        createdBy: tenantId,
      });
      persistedSql = true;
    } catch {
      /* Non-fatal when offline */
    }
  }

  const citeSummary = policies.map((p) => `${p.id} (${p.effectiveDate})`).join(", ");
  const footer =
    `\n\n---\n**Noctis DoD & IC Security Verification** · Jurisdictions Segregated (` +
    `\`DoDI 8510.01 != ICD 503\`) · Verified Directives: \`${citeSummary}\`` +
    ` · Trace: \`${bundle.bundleId}\` (\`${bundle.canonicalTraceHash.slice(0, 12)}\`${persistedSql ? ", SQL Replayable" : ""})`;

  if (!shouldThink) return `${finalBody.trim()}${footer}`;
  const detTrace = `DoD/IC Trace: Policies=[${policies.map((p) => p.id).join(", ")}]; Rules=[${rules.map((r) => `${r.ruleId}=${r.verdict}`).join(", ") || "policy"}]; ClassificationGate=${gate.action}`;
  const thought = [activeThought, detTrace].filter(Boolean).join("\n\n");
  return `<think>\n${thought}\n</think>\n\n${finalBody.trim()}${footer}`;
}
