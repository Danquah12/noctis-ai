/**
 * Schema-Enforced Structured Compliance Fact Extractor (Pillar #2)
 *
 * Translates natural-language audit/compliance paraphrases (arbitrary wording,
 * apostrophes, slashes, omitted control IDs) into strict Zod-validated typed facts,
 * then executes deterministic TypeScript RMF rules on those typed inputs.
 */

import { z } from "zod";
import {
  getAuthoritativeControlRecord,
  getRmfDbManifest,
  lookupNistPublication,
  lookupRmfControl,
  lookupRmfTask,
  type RmfGroundingPacket,
} from "./noctis-rmf-db.ts";
import { evaluateFips199SecurityCategorization } from "./noctis-rmf-engine.ts";
import {
  evaluateAc2AccountManagementRule,
  evaluateIa2AuthRule,
  evaluateMp6SanitizationRule,
  type RmfRuleEvaluationResult,
} from "./noctis-rmf-rules.ts";
import { createExplanationBundle } from "./rmf-v2/graph-and-trace.ts";
import { sha256Sync } from "./universal-crypto.ts";

export type StructuredExtractorChatFn = (
  messages: { role: string; content: string }[],
  opts?: {
    maxTokens?: number;
    temperature?: number;
    json?: boolean;
    preferredProvider?: "openai" | "gemini" | "xai" | "groq" | "noctis";
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
    tier?: "fast" | "reasoning";
  },
) => Promise<{ text: string } | { error: string }>;

const nullableBool = z.boolean().nullable().catch(null).default(null);
const nullableNum = z.number().finite().nullable().catch(null).default(null);

export const StructuredComplianceFactsSchema = z.object({
  ac2Termination: z
    .object({
      mentioned: z.boolean().catch(false).default(false),
      elapsedHours: nullableNum,
      policyThresholdHours: nullableNum,
      inactiveAccountDays: nullableNum,
    })
    .catch({ mentioned: false, elapsedHours: null, policyThresholdHours: null, inactiveAccountDays: null })
    .default({ mentioned: false, elapsedHours: null, policyThresholdHours: null, inactiveAccountDays: null }),

  ia2Auth: z
    .object({
      mentioned: z.boolean().catch(false).default(false),
      staticSshKeysInUse: nullableBool,
      mfaEnforcedPrivileged: nullableBool,
      phishingResistant: nullableBool,
      upstreamBastionMfaEnforced: nullableBool,
      idpFederationPhishingResistant: nullableBool,
      ephemeralSshCertificates: nullableBool,
      directSshBypassBlocked: nullableBool,
    })
    .catch({
      mentioned: false,
      staticSshKeysInUse: null,
      mfaEnforcedPrivileged: null,
      phishingResistant: null,
      upstreamBastionMfaEnforced: null,
      idpFederationPhishingResistant: null,
      ephemeralSshCertificates: null,
      directSshBypassBlocked: null,
    })
    .default({
      mentioned: false,
      staticSshKeysInUse: null,
      mfaEnforcedPrivileged: null,
      phishingResistant: null,
      upstreamBastionMfaEnforced: null,
      idpFederationPhishingResistant: null,
      ephemeralSshCertificates: null,
      directSshBypassBlocked: null,
    }),

  mediaSanitization: z
    .object({
      mentioned: z.boolean().catch(false).default(false),
      mediaType: z
        .enum(["NVME_SSD", "SSD_FLASH", "HDD_MAGNETIC", "PAPER", "OTHER", "UNKNOWN"])
        .catch("UNKNOWN")
        .default("UNKNOWN"),
      proposedMethod: z
        .enum(["CLEAR_OVERWRITE", "PURGE_CRYPTO_ERASE", "PURGE_SANITIZE", "DEGAUSS", "DESTROY", "UNKNOWN"])
        .catch("UNKNOWN")
        .default("UNKNOWN"),
      dataSensitivity: z
        .enum(["LOW", "MODERATE", "HIGH_PHI_ITAR", "SECRET", "TS_SCI", "UNKNOWN"])
        .catch("UNKNOWN")
        .default("UNKNOWN"),
    })
    .catch({
      mentioned: false,
      mediaType: "UNKNOWN",
      proposedMethod: "UNKNOWN",
      dataSensitivity: "UNKNOWN",
    })
    .default({
      mentioned: false,
      mediaType: "UNKNOWN",
      proposedMethod: "UNKNOWN",
      dataSensitivity: "UNKNOWN",
    }),

  fips199: z
    .object({
      mentioned: z.boolean().catch(false).default(false),
      confidentiality: z.enum(["LOW", "MODERATE", "HIGH"]).nullable().catch(null).default(null),
      integrity: z.enum(["LOW", "MODERATE", "HIGH"]).nullable().catch(null).default(null),
      availability: z.enum(["LOW", "MODERATE", "HIGH"]).nullable().catch(null).default(null),
      informationTypes: z.array(z.string()).catch([]).default([]),
      isNationalSecuritySystem: z.boolean().catch(false).default(false),
    })
    .catch({
      mentioned: false,
      confidentiality: null,
      integrity: null,
      availability: null,
      informationTypes: [],
      isNationalSecuritySystem: false,
    })
    .default({
      mentioned: false,
      confidentiality: null,
      integrity: null,
      availability: null,
      informationTypes: [],
      isNationalSecuritySystem: false,
    }),

  citedControls: z.array(z.string()).catch([]).default([]),
  citedRmfTasks: z.array(z.string()).catch([]).default([]),
  citedStandards: z.array(z.string()).catch([]).default([]),
  requestsTable: z.boolean().catch(false).default(false),
  requestsAtoIssuance: z.boolean().catch(false).default(false),
  claimsPoamStatutory: z.boolean().catch(false).default(false),
});

export type StructuredComplianceFacts = z.infer<typeof StructuredComplianceFactsSchema>;

const EXTRACTION_SYSTEM_PROMPT = `You are a strict compliance fact extractor. Convert the user's natural-language prompt into JSON matching this exact schema.
Rules:
- Extract ONLY facts explicitly stated in the prompt. NEVER guess or invent unstated numbers or booleans (use null when not stated).
- For ac2Termination: capture any account deprovisioning delay after firing/separation/termination (elapsedHours, policyThresholdHours, inactiveAccountDays).
- For ia2Auth: staticSshKeysInUse=true if using static SSH keys/PEM files without ephemeral certs; phishingResistant=false if lacking FIDO2/PIV/CAC/hardware MFA; mfaEnforcedPrivileged=false if logging in without MFA.
- For mediaSanitization: mediaType ("NVME_SSD"|"SSD_FLASH"|"HDD_MAGNETIC"|"PAPER"|"OTHER"|"UNKNOWN"), proposedMethod ("CLEAR_OVERWRITE" for single logical overwrite/wipe/quick-format, "PURGE_CRYPTO_ERASE", "PURGE_SANITIZE", "DEGAUSS", "DESTROY"), dataSensitivity ("HIGH_PHI_ITAR" if PHI/HIPAA/ITAR/CUI/FedRAMP High, "SECRET", "TS_SCI", "MODERATE", "LOW").
- For fips199: confidentiality/integrity/availability if stated or clearly implied by FedRAMP baseline (HIGH/MODERATE/LOW), plus informationTypes (e.g., "PHI", "ITAR_TECHNICAL_DATA", "CUI").
- Output valid JSON ONLY matching this exact template:
{"ac2Termination":{"mentioned":false,"elapsedHours":null,"policyThresholdHours":null,"inactiveAccountDays":null},"ia2Auth":{"mentioned":false,"staticSshKeysInUse":null,"mfaEnforcedPrivileged":null,"phishingResistant":null,"upstreamBastionMfaEnforced":null,"idpFederationPhishingResistant":null,"ephemeralSshCertificates":null,"directSshBypassBlocked":null},"mediaSanitization":{"mentioned":false,"mediaType":"UNKNOWN","proposedMethod":"UNKNOWN","dataSensitivity":"UNKNOWN"},"fips199":{"mentioned":false,"confidentiality":null,"integrity":null,"availability":null,"informationTypes":[],"isNationalSecuritySystem":false},"citedControls":[],"citedRmfTasks":[],"citedStandards":[],"requestsTable":false,"requestsAtoIssuance":false,"claimsPoamStatutory":false}`;

function parseJsonObjectLoose(raw: string): unknown {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

export async function extractStructuredComplianceFacts(
  question: string,
  opts: { modelChatFn?: StructuredExtractorChatFn; timeoutMs?: number } = {},
): Promise<StructuredComplianceFacts | null> {
  const q = (question || "").trim();
  if (!q || q.length < 30) return null;

  let chatFn = opts.modelChatFn;
  if (!chatFn) {
    const mod = await import("./video-mind.server.ts");
    chatFn = mod.modelChat as unknown as StructuredExtractorChatFn;
  }

  const timeoutMs = opts.timeoutMs ?? 12000;
  try {
    const res = await Promise.race([
      chatFn(
        [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: q.slice(0, 6000) },
        ],
        {
          temperature: 0.0,
          maxTokens: 700,
          json: true,
          preferredProvider: "openai",
          thinkingLevel: "minimal",
          tier: "reasoning",
        },
      ),
      new Promise<{ error: string }>((resolve) => {
        setTimeout(() => resolve({ error: "Structured extractor timed out" }), timeoutMs);
      }),
    ]);

    if (!("text" in res) || !res.text.trim()) return null;
    const rawJson = parseJsonObjectLoose(res.text);
    if (!rawJson) return null;
    const parsed = StructuredComplianceFactsSchema.safeParse(rawJson);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function mergeStructuredFactsIntoRmfPacket(
  packet: RmfGroundingPacket,
  facts: StructuredComplianceFacts | null,
): RmfGroundingPacket {
  if (!facts) return packet;

  const baseline = /moderate/i.test(packet.targetBaseline)
    ? "FedRAMP Rev. 5 Moderate"
    : /low/i.test(packet.targetBaseline)
    ? "FedRAMP Rev. 5 Low"
    : "FedRAMP Rev. 5 High";
  const baselineKey: "LOW" | "MODERATE" | "HIGH" = /moderate/i.test(baseline)
    ? "MODERATE"
    : /low/i.test(baseline)
    ? "LOW"
    : "HIGH";

  const ruleEvaluations: RmfRuleEvaluationResult[] = [...packet.ruleEvaluations];
  const controls = [...packet.controls];
  const controlIds = new Set(controls.map((c) => c.id));
  const authRecords = [...packet.authoritativeRecords];
  const rmfTasks = [...packet.rmfTasksReferenced];
  const taskIds = new Set(rmfTasks.map((t) => t.taskId));
  const pubs = [...packet.nistPublicationsReferenced];
  const pubIds = new Set(pubs.map((p) => p.sourceId));
  const addedNotes: string[] = [];

  const ensureCtrlAndAuth = (cid: string) => {
    const ctrl = lookupRmfControl(cid);
    if (!ctrl || controlIds.has(ctrl.id)) return;
    controlIds.add(ctrl.id);
    controls.push(ctrl);
    if (!ctrl.withdrawn) {
      const rec = getAuthoritativeControlRecord(ctrl.id, baselineKey, {
        evidenceStatus: "SCENARIO_STIPULATED",
        determination: "PENDING",
      });
      if (rec) authRecords.push(rec);
    }
    if (ctrl.withdrawn && ctrl.withdrawnInto.length > 0) {
      for (const repl of ctrl.withdrawnInto) ensureCtrlAndAuth(repl);
    }
  };

  const upsertRule = (nextRule: RmfRuleEvaluationResult) => {
    const idx = ruleEvaluations.findIndex((r) => r.controlId === nextRule.controlId);
    if (idx === -1) {
      ruleEvaluations.push(nextRule);
      addedNotes.push(`Structured extraction triggered ${nextRule.ruleId} [${nextRule.controlId}] => ${nextRule.verdict} (${nextRule.variance})`);
    } else if (
      ruleEvaluations[idx]!.verdict === "INSUFFICIENT_EVIDENCE" &&
      nextRule.verdict !== "INSUFFICIENT_EVIDENCE"
    ) {
      ruleEvaluations[idx] = nextRule;
      addedNotes.push(`Structured extraction upgraded ${nextRule.ruleId} [${nextRule.controlId}] => ${nextRule.verdict} (${nextRule.variance})`);
    }
  };

  // 1. AC-2 Account Termination
  if (facts.ac2Termination.mentioned) {
    ensureCtrlAndAuth("AC-2");
    ensureCtrlAndAuth("AC-2(3)");
    if (
      facts.ac2Termination.elapsedHours != null ||
      facts.ac2Termination.inactiveAccountDays != null ||
      !ruleEvaluations.some((r) => r.controlId === "AC-2")
    ) {
      upsertRule(
        evaluateAc2AccountManagementRule({
          baseline,
          policyThresholdHours: facts.ac2Termination.policyThresholdHours,
          elapsedHours: facts.ac2Termination.elapsedHours,
          inactiveAccountDays: facts.ac2Termination.inactiveAccountDays,
          assessmentMode: "SCENARIO_ASSUMPTION",
          evidenceVerified: false,
        }),
      );
    }
  }

  // 2. IA-2 Authentication Path
  if (facts.ia2Auth.mentioned) {
    ensureCtrlAndAuth("IA-2");
    ensureCtrlAndAuth("IA-2(1)");
    ensureCtrlAndAuth("IA-2(6)");
    const nextIa2 = evaluateIa2AuthRule({
      baseline,
      staticSshKeysInUse: facts.ia2Auth.staticSshKeysInUse,
      mfaEnforcedPrivileged: facts.ia2Auth.mfaEnforcedPrivileged,
      phishingResistant: facts.ia2Auth.phishingResistant,
      upstreamBastionMfaEnforced: facts.ia2Auth.upstreamBastionMfaEnforced,
      idpFederationPhishingResistant: facts.ia2Auth.idpFederationPhishingResistant,
      ephemeralSshCertificates: facts.ia2Auth.ephemeralSshCertificates,
      directSshBypassBlocked: facts.ia2Auth.directSshBypassBlocked,
      assessmentMode: "SCENARIO_ASSUMPTION",
      evidenceVerified: false,
    });
    const existingIa2Idx = ruleEvaluations.findIndex((r) => r.controlId === "IA-2");
    const hasUpstreamUpgrade =
      (facts.ia2Auth.upstreamBastionMfaEnforced === true || facts.ia2Auth.idpFederationPhishingResistant === true) &&
      existingIa2Idx !== -1 &&
      ruleEvaluations[existingIa2Idx]!.observedFacts.upstreamBastionMfaEnforced !== true &&
      ruleEvaluations[existingIa2Idx]!.observedFacts.idpFederationPhishingResistant !== true;
    if (hasUpstreamUpgrade) {
      ruleEvaluations[existingIa2Idx] = nextIa2;
      addedNotes.push(`Structured extraction detected upstream IdP/bastion MFA path for IA-2 => ${nextIa2.verdict}`);
    } else {
      upsertRule(nextIa2);
    }
  }

  // 3. MP-6 / SP 800-88 Media Sanitization
  if (facts.mediaSanitization.mentioned) {
    ensureCtrlAndAuth("MP-6");
    const pub = lookupNistPublication("SP-800-88r1");
    if (pub && !pubIds.has(pub.sourceId)) {
      pubIds.add(pub.sourceId);
      pubs.push(pub);
    }
    if (
      facts.mediaSanitization.mediaType !== "UNKNOWN" ||
      facts.mediaSanitization.proposedMethod !== "UNKNOWN" ||
      !ruleEvaluations.some((r) => r.ruleId === "RMF-MP6-80088-001")
    ) {
      upsertRule(
        evaluateMp6SanitizationRule({
          baseline,
          mediaType: facts.mediaSanitization.mediaType,
          proposedMethod: facts.mediaSanitization.proposedMethod,
          dataSensitivity: facts.mediaSanitization.dataSensitivity,
          assessmentMode: "SCENARIO_ASSUMPTION",
          evidenceVerified: false,
        }),
      );
    }
  }

  // 4. Cited controls, SP 800-37 tasks, and NIST publications missed by regex
  for (const rawCid of facts.citedControls) ensureCtrlAndAuth(rawCid);
  for (const rawTid of facts.citedRmfTasks) {
    const task = lookupRmfTask(rawTid);
    if (task && !taskIds.has(task.taskId)) {
      taskIds.add(task.taskId);
      rmfTasks.push(task);
      addedNotes.push(`Added SP 800-37 Task ${task.taskId} (${task.title})`);
    }
  }
  for (const rawStd of facts.citedStandards) {
    const pub = lookupNistPublication(rawStd);
    if (pub && !pubIds.has(pub.sourceId)) {
      pubIds.add(pub.sourceId);
      pubs.push(pub);
      addedNotes.push(`Added ${pub.docNumber}`);
    }
  }

  // 5. FIPS 199 if missed by regex
  let fips199 = packet.fips199;
  if (!fips199 && facts.fips199.mentioned) {
    const hasItar = facts.fips199.informationTypes.some((t) => /itar|export|classified/i.test(t));
    const hasPhiCui = facts.fips199.informationTypes.some((t) => /phi|hipaa|cui|pii/i.test(t));
    const floor = hasItar || baselineKey === "HIGH" ? "HIGH" : hasPhiCui || baselineKey === "MODERATE" ? "MODERATE" : "LOW";
    fips199 = evaluateFips199SecurityCategorization({
      systemName: "Target System",
      confidentialityImpact: facts.fips199.confidentiality || floor,
      integrityImpact: facts.fips199.integrity || floor,
      availabilityImpact: facts.fips199.availability || (baselineKey === "HIGH" ? "HIGH" : hasPhiCui ? "MODERATE" : "LOW"),
      informationTypes: facts.fips199.informationTypes,
      isNationalSecuritySystem: facts.fips199.isNationalSecuritySystem,
    });
    addedNotes.push(`Structured FIPS 199 => ${fips199.overallImpact} (${fips199.securityCategorizationExpression})`);
  }

  if (addedNotes.length === 0) {
    return packet;
  }

  const manifest = getRmfDbManifest();
  const extraBlock = [
    "### 1B. STRUCTURED EXTRACTION AUGMENTED RULE VERDICTS & REFERENCES (DO NOT CONTRADICT)",
    ...ruleEvaluations.map(
      (r) =>
        `- **Rule ${r.ruleId} [${r.controlId} — ${r.controlTitle}]: SCENARIO VERDICT = \`${r.verdict}\` | FORMAL = \`${r.formalDetermination || r.verdict}\`** — ${r.summary} *(Variance: ${r.variance})*`,
    ),
    ...(fips199
      ? [`- **FIPS 199 High-Water Mark:** **${fips199.overallImpact}** (\`${fips199.securityCategorizationExpression}\`)`]
      : []),
    ...addedNotes.map((n) => `- ${n}`),
    "",
  ].join("\n");

  const combinedAuditSha =
    ruleEvaluations.length === 1
      ? ruleEvaluations[0]!.auditHash
      : sha256Sync(ruleEvaluations.map((r) => `${r.ruleId}:${r.auditHash}`).join("|"));

  const explanationBundle =
    ruleEvaluations.length > 0
      ? createExplanationBundle({
          tenantId: "chat-session",
          evaluationRef: ruleEvaluations.map((r) => r.controlId).join("+"),
          nistVersion: manifest.nistVersion,
          dbSha256: manifest.dbSha256,
          ruleId: ruleEvaluations.map((r) => r.ruleId).join("+"),
          ruleVersion: ruleEvaluations.map((r) => r.ruleVersion).join("+"),
          evidenceSha256: combinedAuditSha,
          observedFacts:
            ruleEvaluations.length === 1
              ? ruleEvaluations[0]!.observedFacts
              : {
                  ruleCount: ruleEvaluations.length,
                  controls: ruleEvaluations.map((r) => r.controlId).join(", "),
                  verdicts: ruleEvaluations.map((r) => `${r.controlId}:${r.verdict}`).join(", "),
                },
          deterministicClassifications: ruleEvaluations.map(
            (r) => `${r.controlId} (${r.ruleId}): Scenario=${r.verdict} | Formal=${r.formalDetermination || r.verdict} — ${r.variance}`,
          ),
          analyticalEstimates: [],
          verdict:
            ruleEvaluations.length === 1
              ? ruleEvaluations[0]!.verdict
              : ruleEvaluations.map((r) => `${r.controlId}:${r.verdict}`).join("|"),
          ruleEvaluations: ruleEvaluations.map((r) => ({
            ruleId: r.ruleId,
            ruleVersion: r.ruleVersion,
            controlId: r.controlId,
            assessmentMode: r.assessmentMode || "SCENARIO_ASSUMPTION",
            verdict: r.verdict,
            formalDetermination: String(r.formalDetermination || r.verdict),
            variance: r.variance,
            auditHash: r.auditHash,
            observedFacts: r.observedFacts,
            authorityDocs: (r.authorityCitations || []).map(
              (a) => `${a.document} (${a.version}) ${a.section}${a.parameterId ? ` [${a.parameterId}]` : ""}`,
            ),
          })),
        })
      : packet.explanationBundle;

  return {
    ...packet,
    controls,
    authoritativeRecords: authRecords,
    rmfTasksReferenced: rmfTasks,
    nistPublicationsReferenced: pubs,
    ruleEvaluations,
    fips199,
    explanationBundle,
    markdownContext: `${packet.markdownContext}\n\n${extraBlock}`,
  };
}
