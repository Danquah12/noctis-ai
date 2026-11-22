/**
 * Noctis Universal Neuro-Symbolic RMF Chat Reasoning Pipeline (Option B)
 *
 * Stage 1: Deterministic Retrieval, Rule Engine (10 starter controls), & FIPS 199 Math
 * Stage 2: Constrained LLM Reasoning (Federal RMF / FedRAMP / ISSO / ISSM / SCA)
 * Stage 3: Independent DB Verification + 1-Shot Auto-Repair + Offline Fallback
 */

import {
  buildRmfGroundingPacket,
  verifyRmfResponseAgainstDb,
  type RmfGroundingPacket,
  type RmfVerificationReport,
} from "./noctis-rmf-db.ts";
import { parseThinkEnvelope } from "./noctis-engine-registry.ts";

export interface RmfBrainOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export type RmfModelChatFn = (
  messages: { role: string; content: string }[],
  opts?: {
    maxTokens?: number;
    temperature?: number;
    brain?: RmfBrainOptions;
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
  },
) => Promise<{ text: string } | { error: string }>;

export interface RmfReasoningTurn {
  role: "user" | "assistant";
  content: string;
}

export interface RmfReasoningOptions {
  turns?: RmfReasoningTurn[];
  brain?: RmfBrainOptions;
  engineName?: string;
  language?: string;
  shouldThink?: boolean;
  modelChatFn?: RmfModelChatFn;
}

function cleanThinkOutput(raw: string): { thought: string; body: string } {
  const parsed = parseThinkEnvelope(raw);
  if (parsed.thought) {
    return { thought: parsed.thought, body: parsed.body };
  }
  const strippedUnclosed = raw.replace(/<think>[\s\S]*$/gi, "").trim();
  return { thought: "", body: strippedUnclosed };
}

function stripThinkFromTurn(text: string): string {
  return (text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .trim();
}

function buildRmfSystemPrompt(opts: {
  engineName?: string;
  language?: string;
  shouldThink?: boolean;
}): string {
  const lang = (opts.language || "English").trim();
  const langDirective =
    !/^english$/i.test(lang)
      ? `Write the final RMF explanation and sections entirely in ${lang}, preserving authoritative English NIST control IDs (e.g., AC-2, AU-6, FIPS 199) verbatim.`
      : "Write clearly in authoritative English.";

  return [
    `You are Noctis RMF Intelligence (${opts.engineName || "Noctis Ultra"}), acting as an expert Federal RMF Specialist, ISSO, ISSM, Security Control Assessor (SCA / 3PAO), and Federal Cloud Security Architect (Option B: Federal RMF + FedRAMP + Continuous Monitoring).`,
    "",
    opts.shouldThink !== false
      ? "MANDATORY PRE-RESPONSE DELIBERATION: Begin your response with a concise `<think>...</think>` reasoning block verifying cited control IDs against the Knowledge Packet, checking any withdrawn controls, checking deterministic verdicts, and ensuring Examine/Interview/Test coverage when requested. Always close `</think>` cleanly before writing the response body."
      : "Respond concisely with no raw XML tags.",
    "",
    "STRICT GROUNDING & DETERMINISTIC GOVERNANCE INVARIANTS (NON-NEGOTIABLE):",
    "1. NEVER fabricate NIST SP 800-53, 800-53A, 800-171, or CSF 2.0 control IDs. Cite ONLY control IDs verified in the Deterministic Knowledge Packet or standard Rev. 5 family catalog.",
    "2. WITHDRAWN CONTROLS: If a user asks about a withdrawn Rev. 5 control (e.g., AC-13, AU-15), you MUST state explicitly that it is WITHDRAWN and direct the user to its exact official replacement control(s) listed in the packet.",
    "3. IMMUTABLE VERDICTS: Never override or contradict a deterministic rule engine verdict (`PASS`, `FAIL`, `INSUFFICIENT_EVIDENCE`, `NOT_APPLICABLE`, `MANUAL_REVIEW_REQUIRED`) or a FIPS 199 High-Water Mark computed in code. If evidence is missing, preserve `INSUFFICIENT_EVIDENCE`.",
    "4. ASSESSMENT COMPLETENESS: Whenever the user asks about assessment methods, 800-53A procedures, or 3PAO audits, address all three methods explicitly: **Examine**, **Interview**, and **Test**.",
    "5. GOVERNANCE BOUNDARY: Explicitly note where professional judgment is required and state that final ATO / risk acceptance authority rests strictly with the designated **Authorizing Official (AO)**, not an automated score.",
    "6. STATUTORY POAM SLAS: Respect FedRAMP Rev. 5 POA&M remediation timelines (Critical/KEV per BOD 22-01 / 15d, High <= 30d, Moderate <= 90d, Low <= 180d).",
    "7. FACTS VS ESTIMATES: Explicitly distinguish **Observed Facts** (timestamps, scanner/config evidence), **Deterministic Classifications** (rule verdicts, SLAs), and **Analytical Estimates** (risk/likelihood projections, stating assumptions & uncertainty).",
    "8. FORMATTING (NO RAW LATEX): NEVER output raw LaTeX delimiters (`$$...$$`, `\\[...\\]`, `\\text{...}`, `\\{`, `\\}`). Noctis Chat renders Markdown without KaTeX. Express FIPS 199 security categorizations and formulas in clean Markdown inline code (e.g., `SC system = {(confidentiality, MODERATE), (integrity, HIGH), (availability, LOW)}`).",
    `9. LANGUAGE: ${langDirective}`,
  ].join("\n");
}

function unwrapLatexCommand(expr: string, command: string): string {
  const re = new RegExp(`\\\\${command}\\{([^{}]*)\\}`, "g");
  let next = expr;
  for (let i = 0; i < 4; i++) {
    const replaced = next.replace(re, "$1");
    if (replaced === next) break;
    next = replaced;
  }
  return next;
}

function cleanLatexExpression(rawExpr: string): string {
  let out = rawExpr;
  out = unwrapLatexCommand(out, "text");
  out = unwrapLatexCommand(out, "mathrm");
  out = unwrapLatexCommand(out, "textbf");
  out = out
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\leq\b|\\le\b/g, "<=")
    .replace(/\\geq\b|\\ge\b/g, ">=")
    .replace(/\\times\b/g, "×")
    .replace(/\\rightarrow\b|\\to\b/g, "->")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\(?:quad|qquad|,|;|:)/g, " ")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

export function sanitizeRmfMarkdownFormatting(markdown: string): string {
  if (!markdown) return markdown;
  const fencedParts = markdown.split(/(```[\s\S]*?```)/g);
  return fencedParts
    .map((part, idx) => {
      if (idx % 2 === 1) return part;
      const formatMatch = (_full: string, inner: string): string => {
        const cleaned = cleanLatexExpression(inner);
        return cleaned ? `\`${cleaned}\`` : "";
      };
      return part
        .replace(/\$\$([\s\S]*?)\$\$/g, formatMatch)
        .replace(/\\\[([\s\S]*?)\\\]/g, formatMatch)
        .replace(
          /\$([^\n$]*\\(?:text|mathrm|textbf|leq|le|geq|ge|times|rightarrow|to|approx|\{|\})[^\n$]*)\$/g,
          formatMatch,
        );
    })
    .join("");
}

function buildRmfUserPrompt(question: string, packet: RmfGroundingPacket): string {
  return [
    "USER QUESTION / EVIDENCE SCENARIO:",
    question.trim(),
    "",
    "IMMUTABLE DETERMINISTIC RMF KNOWLEDGE & RULE ENGINE PACKET (SINGLE SOURCE OF TRUTH):",
    packet.markdownContext,
    "",
    "Synthesize a clear, accurate, traceable RMF response grounded strictly in the authoritative data and deterministic verdicts above.",
  ].join("\n");
}

function buildRmfRepairPrompt(
  question: string,
  flawedBody: string,
  packet: RmfGroundingPacket,
  audit: RmfVerificationReport,
): string {
  return [
    "Your previous RMF draft failed independent verification against the Deterministic RMF Knowledge Database:",
    ...audit.violations.map((v, i) => `${i + 1}. ${v}`),
    "",
    "Fix ALL listed violations while preserving accuracy and clarity.",
    "",
    "USER QUESTION:",
    question.trim(),
    "",
    "AUTHORITATIVE KNOWLEDGE PACKET:",
    packet.markdownContext,
    "",
    "PREVIOUS DRAFT TO CORRECT:",
    flawedBody,
  ].join("\n");
}

export function renderDeterministicRmfFallback(packet: RmfGroundingPacket): string {
  const out: string[] = [];
  out.push(`# Noctis Deterministic RMF Assessment (NIST SP 800-53 Rev. ${packet.manifest.nistVersion})`);
  out.push(`**Scope:** ${packet.targetBaseline}\n`);

  if (packet.ruleEvaluations.length > 0) {
    out.push("## Deterministic Rule Evaluation Verdicts");
    for (const r of packet.ruleEvaluations) {
      out.push(`### ${r.controlId} — ${r.controlTitle} (\`${r.ruleId}\`)`);
      out.push(`- **Verdict:** **${r.verdict}**`);
      out.push(`- **Summary:** ${r.summary}`);
      out.push(`- **Policy / ODP Threshold:** ${r.threshold}`);
      out.push(`- **Variance:** ${r.variance}`);
      out.push(`- **Audit Hash:** \`${r.auditHash}\``);
      if (r.missingEvidence.length > 0) {
        out.push(`- **Missing Evidence Required:** ${r.missingEvidence.join("; ")}`);
      }
      if (r.draftFinding) {
        out.push(`- **Draft Assessment Finding (${r.draftFinding.severity}, ${r.draftFinding.objectiveId}):** ${r.draftFinding.title} — ${r.draftFinding.impactSummary}`);
      }
      if (r.draftPoam) {
        out.push(`- **Draft POA&M (\`${r.draftPoam.poamId}\`, SLA: ${r.draftPoam.slaDays} days):** ${r.draftPoam.weaknessName}`);
        out.push(`  - *Remediation Plan:* ${r.draftPoam.remediationPlan}`);
        out.push(`  - *Verification Proof Required:* ${r.draftPoam.requiredTechnicalProof}`);
      }
      out.push("");
    }
  }

  if (packet.fips199) {
    out.push("## FIPS 199 Security Categorization & High-Water Mark");
    out.push(`- **Expression:** \`${packet.fips199.securityCategorizationExpression}\``);
    out.push(`- **High-Water Mark Overall Impact:** **${packet.fips199.overallImpact}** (${packet.fips199.governingStandard})`);
    if (packet.fips199.mandatoryOverlays.length > 0) {
      out.push(`- **Applicable Overlays:** ${packet.fips199.mandatoryOverlays.join(", ")}`);
    }
    if (packet.fips199.safetyVetoes.length > 0) {
      out.push(`- **Compliance Vetoes:** ${packet.fips199.safetyVetoes.join(" | ")}`);
    }
    out.push("");
  }

  if (packet.controls.length > 0) {
    out.push("## Authoritative Controls, SP 800-53A Procedures & Crosswalks");
    for (const c of packet.controls) {
      if (c.withdrawn) {
        out.push(`### ${c.id} — ${c.title} (WITHDRAWN)`);
        out.push(`- **Rev. 5 Status:** **WITHDRAWN** — Incorporated/moved into: **${c.withdrawnInto.join(", ") || "N/A"}**.`);
        out.push("");
        continue;
      }
      out.push(`### ${c.id} — ${c.title}`);
      out.push(`- **Baselines:** ${c.baselines.length > 0 ? c.baselines.join(", ") : "Optional / Tailored Enhancement"}`);
      if (c.statement) out.push(`- **Statement:** ${c.statement}`);
      if (c.fedrampOdp) {
        out.push(`- **FedRAMP High ODP:** ${c.fedrampOdp.high} *(SLA: ${c.fedrampOdp.sla})*`);
      }
      if (c.objectives.length > 0) {
        out.push(`- **SP 800-53A Objectives:** ${c.objectives.join(" | ")}`);
      }
      out.push(
        `- **SP 800-53A Assessment Methods:**\n  - **Examine:** ${c.methods.examine || "Policies, system configs, and evidence artifacts"}\n  - **Interview:** ${c.methods.interview || "ISSO, system owners, and engineering operators"}\n  - **Test:** ${c.methods.test || "Automated and manual control enforcement verification"}`,
      );
      if (packet.attackByControl[c.id]?.length) {
        out.push(`- **Direct MITRE ATT&CK v16.1 Mitigations:** ${packet.attackByControl[c.id]!.map((t) => `${t.id} (${t.name})`).join(", ")}`);
      } else if (packet.relatedAttackHints[c.id]?.length) {
        out.push(`- **ATT&CK Mapping Note:** No direct CTID v16.1 mitigation edge on ${c.id}; related controls map to: ${packet.relatedAttackHints[c.id]!.map((h) => `${h.viaControl} → ${h.id} (${h.name})`).join(", ")}`);
      }
      out.push("");
    }
  }

  if (packet.csfItems.length > 0) {
    out.push("## NIST CSF 2.0 Crosswalk");
    for (const item of packet.csfItems) {
      out.push(`- **${item.id} (${item.title}):** ${item.statement}`);
    }
    out.push("");
  }

  if (packet.cuiRequirements.length > 0) {
    out.push("## NIST SP 800-171 Rev. 3 Requirements");
    for (const r of packet.cuiRequirements) {
      out.push(`- **${r.id} (Rev. 2 alias ${r.shortId}) — ${r.title}:** ${r.statement}`);
    }
    out.push("");
  }

  out.push(
    "> **Governance Boundary:** Automated checks verify explicit rules against documented evidence; interviews, compensating-control rationale, and formal ATO risk acceptance remain the exclusive responsibility of the designated **Authorizing Official (AO)**.",
  );
  return out.join("\n");
}

function buildDeterministicThoughtTrace(
  packet: RmfGroundingPacket,
  audit: RmfVerificationReport | null,
  hadRepair: boolean,
): string {
  const controlList = packet.controls.map((c) => `${c.id}${c.withdrawn ? " (WITHDRAWN)" : ""}`).join(", ") || "Lifecycle / Baseline Inquiry";
  const ruleLine =
    packet.ruleEvaluations.length > 0
      ? packet.ruleEvaluations.map((r) => `${r.ruleId}=${r.verdict} (${r.variance})`).join("; ")
      : "No quantitative compliance telemetry submitted; informational / advisory synthesis";
  const fipsLine = packet.fips199
    ? `${packet.fips199.securityCategorizationExpression} => High-Water Mark ${packet.fips199.overallImpact}`
    : "No FIPS 199 C/I/A calculation triggered";
  const verifyLine = audit
    ? audit.passed
      ? `DB Citation & Invariant Gate PASSED${hadRepair ? " after 1-shot repair" : ""} (${audit.verifiedControls.length} verified controls)`
      : `DB Citation Gate fallback applied (${audit.violations.length} violations intercepted)`
    : "Deterministic Offline RMF Synthesis Mode";
  return [
    `Noctis RMF Intelligence (NIST SP 800-53 Rev. ${packet.manifest.nistVersion}) — Grounding & Verification Trace:`,
    `1. Retrieved Authoritative Records: ${controlList}`,
    `2. Deterministic Rule Verdicts: ${ruleLine}`,
    `3. FIPS 199 Math: ${fipsLine}`,
    `4. Independent Verification: ${verifyLine} [DB SHA-256: ${packet.manifest.dbSha256.slice(0, 12)}]`,
  ].join("\n");
}

function buildProvenanceFooter(packet: RmfGroundingPacket, audit: RmfVerificationReport | null): string {
  const cited = audit?.verifiedControls.length ? audit.verifiedControls.slice(0, 8).join(", ") : packet.controls.map((c) => c.id).slice(0, 6).join(", ");
  const tracePart = packet.explanationBundle
    ? ` · Trace: \`${packet.explanationBundle.bundleId}\` (\`${packet.explanationBundle.canonicalTraceHash.slice(0, 12)}\`)`
    : "";
  return (
    `\n\n---\n` +
    `**Deterministic RMF Verification** · NIST SP 800-53/53A Rev. ${packet.manifest.nistVersion} · SP 800-53B · SP 800-171 Rev. 3 · CSF 2.0 · MITRE ATT&CK v16.1` +
    `${cited ? ` · Verified IDs: \`${cited}\`` : ""}` +
    `${tracePart}` +
    ` · DB SHA-256: \`${packet.manifest.dbSha256.slice(0, 12)}\``
  );
}

export async function executeUniversalRmfReasoning(
  rawQuestion: string,
  opts: RmfReasoningOptions = {},
): Promise<string> {
  const question = (rawQuestion || "").trim();
  const packet = buildRmfGroundingPacket(question);

  let chatFn = opts.modelChatFn;
  if (!chatFn) {
    const mod = await import("./video-mind.server.ts");
    chatFn = mod.modelChat as unknown as RmfModelChatFn;
  }

  const systemPrompt = buildRmfSystemPrompt({
    engineName: opts.engineName,
    language: opts.language,
    shouldThink: opts.shouldThink,
  });

  const historyTurns = (opts.turns || [])
    .slice(-6, -1)
    .map((t) => ({ role: t.role, content: stripThinkFromTurn(t.content).slice(0, 2000) }))
    .filter((t) => t.content.length > 0);

  let finalBody = "";
  let activeThought = "";
  let audit: RmfVerificationReport | null = null;
  let hadRepair = false;

  try {
    const first = await chatFn(
      [
        { role: "system", content: systemPrompt },
        ...historyTurns,
        { role: "user", content: buildRmfUserPrompt(question, packet) },
      ],
      {
        temperature: 0.15,
        maxTokens: 3200,
        thinkingLevel: opts.shouldThink === false ? "medium" : "high",
        brain: opts.brain,
      },
    );

    if ("text" in first && first.text.trim()) {
      const parsed = cleanThinkOutput(first.text);
      activeThought = parsed.thought;
      if (parsed.body.length >= 25) {
        finalBody = parsed.body;
        audit = verifyRmfResponseAgainstDb(question, finalBody, packet);

        if (!audit.passed) {
          hadRepair = true;
          const repaired = await chatFn(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: buildRmfRepairPrompt(question, finalBody, packet, audit) },
            ],
            {
              temperature: 0.05,
              maxTokens: 3200,
              thinkingLevel: opts.shouldThink === false ? "medium" : "high",
              brain: opts.brain,
            },
          );

          if ("text" in repaired && repaired.text.trim()) {
            const parsedRepair = cleanThinkOutput(repaired.text);
            if (parsedRepair.thought) activeThought = parsedRepair.thought;
            if (parsedRepair.body.length >= 25) {
              const repairedAudit = verifyRmfResponseAgainstDb(question, parsedRepair.body, packet);
              if (repairedAudit.passed || repairedAudit.violations.length < audit.violations.length) {
                finalBody = parsedRepair.body;
                audit = repairedAudit;
              }
            }
          }
        }
      }
    }
  } catch {
    /* Fall through to deterministic DB rendering below */
  }

  // Deterministic fail-safe if LLM offline, omitted body (unclosed <think>), or still failed blocking verification
  if (!finalBody || (audit && !audit.passed)) {
    finalBody = renderDeterministicRmfFallback(packet);
  }
  finalBody = sanitizeRmfMarkdownFormatting(finalBody);

  const footer = buildProvenanceFooter(packet, audit);
  if (opts.shouldThink === false) {
    return `${finalBody.trim()}${footer}`;
  }

  const thought = [activeThought, buildDeterministicThoughtTrace(packet, audit, hadRepair)]
    .filter(Boolean)
    .join("\n\n");

  return `<think>\n${thought}\n</think>\n\n${finalBody.trim()}${footer}`;
}
