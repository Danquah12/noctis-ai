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
import { saveRmfArtifact } from "./rmf-v2/persistence.server.ts";

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
  tenantId?: string;
  persistTrace?: boolean;
}

function cleanThinkOutput(raw: string): { thought: string; body: string } {
  const parsed = parseThinkEnvelope(raw);
  const cleanBody = parsed.body.replace(/<\/?think>/gi, "").trim();
  return { thought: parsed.thought, body: cleanBody };
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
      ? "MANDATORY PRE-RESPONSE DELIBERATION: Begin your response with a concise `<think>...</think>` reasoning block (strictly 3-5 brief bullet lines, under 120 words) verifying cited control IDs against the Knowledge Packet, checking any withdrawn controls, checking deterministic verdicts, and ensuring Examine/Interview/Test coverage when requested. Always close `</think>` immediately before writing the full Markdown response."
      : "Respond concisely with no raw XML tags.",
    "",
    "STRICT GROUNDING & DETERMINISTIC GOVERNANCE INVARIANTS (NON-NEGOTIABLE):",
    "1. NEVER fabricate NIST SP 800-53, 800-53A, 800-171, FedRAMP, or CSF 2.0 control IDs or ODPs. Cite ONLY control IDs, parameter IDs, versions, and effective dates verified in the Deterministic Knowledge Packet.",
    "2. WITHDRAWN CONTROLS: If a user asks about a withdrawn Rev. 5 control (e.g., AC-13, AU-15), you MUST state explicitly that it is WITHDRAWN and direct the user to its exact official replacement control(s) listed in the packet.",
    "3. IMMUTABLE DETERMINISTIC VERDICTS: Never override or contradict a deterministic rule engine verdict (`PASS`, `FAIL`, `INSUFFICIENT_EVIDENCE`, `NOT_APPLICABLE`, `MANUAL_REVIEW_REQUIRED`) or a FIPS 199 High-Water Mark computed in code.",
    "4. SCENARIO-BASED VS FORMAL ASSESSMENT SEPARATION: When a prompt provides stipulated scenario facts without attached immutable audit artifacts, treat the scenario facts as stipulated assumptions to compute the exact compliance variance (e.g., 38h active vs 24h limit = +14h excess) and preserve the rule's Scenario Verdict (`FAIL` / `PASS`), while explicitly stating that the Formal Assessor Determination remains `PENDING_VERIFIED_EVIDENCE` until HRIS/IdP/config artifacts and approved SSP ODPs are verified.",
    "5. PER-CONTROL SECTION STRUCTURE: Organize multi-control evaluations under distinct per-control headings (`### AC-2 — ...`, `### IA-2 — ...`), stating each control's Scenario Verdict, Formal Audit Determination, exact Authority Citations (document, version, parameter ID, effective date, exceptions), and SP 800-53A Examine/Interview/Test evidence requirements cleanly.",
    "6. END-TO-END IA-2 AUTHENTICATION PATH: For privileged SSH/MFA assessments, evaluate the entire authentication path (upstream bastion/jump host, federated IdP, FIDO2/PIV hardware authenticator, ephemeral SSH CA certs vs static keys, direct bypass blocking), referencing FedRAMP IA-2(1) guidance (`ia-2.1_fr_gdn.1`: subsequent same-domain components exempt when domain entry enforces phishing-resistant MFA) and IA-2(6) cryptography rather than blanket-failing solely on the phrase 'SSH key'.",
    "7. ASSESSMENT COMPLETENESS: Whenever the user asks about assessment methods, 800-53A procedures, or 3PAO audits (or when listing evidence requirements), address **Examine**, **Interview**, and **Test** explicitly.",
    "8. GOVERNANCE BOUNDARY & AUTHORIZING OFFICIAL: Explicitly state that final ATO / risk acceptance rests strictly with the designated **Authorizing Official (AO)**, not an automated score.",
    "9. ACCURATE POA&M & BOD 22-01 AUTHORITY SCOPE: NEVER call a 30-day POA&M deadline a 'statutory requirement'. Explain accurately from the packet that High <= 30d / Moderate <= 90d / Low <= 180d come from FedRAMP `RA-5(d)` ODP `ra-05_odp.03` (for vulnerability-scan findings) and FedRAMP Continuous Monitoring / POA&M program guidance (subject to Agency/JAB AO tailoring and Deviation Requests). State explicitly that CISA BOD 22-01 governs KEV-listed vulnerabilities, NOT automatically AC-2 or IA-2 control weaknesses.",
    "10. FACTS VS ESTIMATES: Explicitly distinguish **Stipulated Scenario Assumptions**, **Verified Audit Evidence** (when present), **Deterministic Rule Verdicts**, and **Analytical Estimates** (stating assumptions & uncertainty).",
    "11. FORMATTING (NO RAW LATEX): NEVER output raw LaTeX delimiters (`$$...$$`, `\\[...\\]`, `\\text{...}`, `\\{`, `\\}`). Express formulas in clean Markdown inline code.",
    "12. TABLES, MEDIA SANITIZATION & PQC: When the user requests a Markdown table, include a complete GitHub-Flavored Markdown audit table summarizing findings, deterministic verdicts, SP 800-53A Examine/Interview/Test methods, MITRE ATT&CK mitigations, and remediation plans alongside per-control sections. For NVMe/SSD sanitization holding PHI/ITAR or High-impact data under NIST SP 800-88 Rev. 1 & MP-6, explain why a single logical overwrite (`Clear`) is INSUFFICIENT due to flash wear-leveling, over-provisioning, and remapped sectors, requiring `Purge` (NVMe Format Cryptographic Erase / Sanitize) or physical `Destroy`. Cite FIPS 203 (`ML-KEM`) for quantum-resistant key encapsulation when asked.",
    `13. LANGUAGE: ${langDirective}`,
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
  const wantsTable = /\btable\b/i.test(packet.question);
  const escapeCell = (v: string): string => v.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const findCtrl = (id: string) => packet.controls.find((c) => c.id === id);

  out.push(
    `# Noctis Deterministic RMF Assessment (NIST SP 800-53 Rev. ${packet.manifest.nistVersion} · FedRAMP Rev. 5 ${packet.manifest.fedrampVersion || "fedramp2.1.0-oscal1.0.4"})`,
  );
  out.push(`**Scope:** ${packet.targetBaseline}\n`);

  if (wantsTable) {
    out.push("## Audit Findings, Verdicts, SP 800-53A & Remediation Matrix");
    out.push("| Finding / Control | Deterministic Verdict | Authority / ODP Basis | SP 800-53A (Examine / Interview / Test) | MITRE ATT&CK | Remediation Plan |");
    out.push("| :--- | :--- | :--- | :--- | :--- | :--- |");

    for (const r of packet.ruleEvaluations) {
      const ctrl = findCtrl(r.controlId) || findCtrl(`${r.controlId}(3)`) || findCtrl(`${r.controlId}(1)`);
      const att =
        packet.attackByControl[r.controlId]?.map((t) => `${t.id} (${t.name})`).join(", ") ||
        packet.relatedAttackHints[r.controlId]?.map((h) => `${h.viaControl}→${h.id} (${h.name})`).join(", ") ||
        "Control-specific ATT&CK mitigation mapping verified in packet";
      const eit = ctrl
        ? `**Examine:** ${ctrl.methods.examine || "Policies & system configs"}; **Interview:** ${ctrl.methods.interview || "ISSO & admins"}; **Test:** ${ctrl.methods.test || "Technical verification"}`
        : "**Examine:** Policies, logs, configs; **Interview:** ISSO & operators; **Test:** Automated & manual verification";
      const rem = r.draftPoam
        ? `${r.draftPoam.remediationPlan} (Program Guidance Timeline: ${r.draftPoam.slaDays}d — NOT statutory)`
        : r.missingEvidence.join("; ") || "Remediate control gap and collect verified artifacts";
      out.push(
        `| **${escapeCell(r.controlId)} — ${escapeCell(r.controlTitle)}** | **${r.verdict}** *(Formal: ${r.formalDetermination || r.verdict}; ${escapeCell(r.variance)})* | ${escapeCell(r.threshold)} | ${escapeCell(eit)} | ${escapeCell(att)} | ${escapeCell(rem)} |`,
      );
    }

    const withdrawnCtrls = packet.controls.filter((c) => c.withdrawn);
    const hasNvmeSanitize = /\b(?:800-88|sanitiz\w*|nvme|ssd|clear)\b/i.test(packet.question);
    if (withdrawnCtrls.length > 0 || hasNvmeSanitize) {
      const mp6 = findCtrl("MP-6");
      const mp6Att =
        (mp6 && packet.attackByControl[mp6.id]?.map((t) => `${t.id} (${t.name})`).join(", ")) ||
        (mp6 && packet.relatedAttackHints[mp6.id]?.map((h) => `${h.viaControl}→${h.id} (${h.name})`).join(", ")) ||
        "T1005 / T1530 / Media Exposure Mitigations";
      const ac13Note = withdrawnCtrls
        .map((c) => `${c.id} is **WITHDRAWN** in Rev. 5 -> replaced by **${c.withdrawnInto.join(", ")}**`)
        .join("; ");
      const sanNote = hasNvmeSanitize
        ? "Single logical overwrite (`Clear`) on retired NVMe SSDs holding Clinical PHI/ITAR is **INSUFFICIENT / BLOCKED** due to flash wear-leveling, over-provisioning & bad-block remapping; **Purge** (NVMe Format Cryptographic Erase / Sanitize) or physical **Destroy** required."
        : "";
      out.push(
        `| **MP-6 / Media Sanitization & ${withdrawnCtrls.map((c) => c.id).join(", ") || "SSP Citations"}** | **FAIL / BLOCKED** *(Withdrawn Citation & NVMe Clear Rejected)* | NIST SP 800-88 Rev. 1 (Clear vs. Purge/Destroy) & NIST SP 800-53 Rev. 5 MP-6 | **Examine:** Sanitization SOPs, NVMe certificates & SSP (AC-2/AU-6); **Interview:** Custodian/ISSO; **Test:** Verify NVMe Crypto Erase/Sanitize or physical destruction | ${escapeCell(mp6Att)} | ${escapeCell([ac13Note, sanNote, "Replace AC-13 in SSP with AC-2 & AU-6; execute SP 800-88 Purge or Destroy with signed Certificates of Sanitization."].filter(Boolean).join(" "))} |`,
      );
    }

    if (/\b(?:poa&m|poam|statutory|issue.*ato|grant.*ato|ato\s+today)\b/i.test(packet.question)) {
      out.push(
        `| **Governance: FedRAMP POA&M Authority & ATO Issuance** | **FAIL / DENIED** *(Cannot Auto-Issue ATO)* | FedRAMP Rev. 5 ConMon / ` +
          "`RA-5(d)`" +
          ` ODP Guidance (NOT federal statute) & SP 800-37 Rev. 2 Step 5 | **Examine:** SAR, POA&M & Authorization Package; **Interview:** ISSM, 3PAO & AO; **Test:** Independent 3PAO validation | Governance / Risk Acceptance Boundary | Correct SSP (30d High POA&M timeline is FedRAMP program guidance, subject to AO tailoring, NOT universal statute); remediate FAIL findings before submitting package to the human **Authorizing Official (AO)** for ATO decision. |`,
      );
    }
    out.push("");
  }

  if (packet.ruleEvaluations.length > 0) {
    out.push("## Deterministic Rule Evaluation Verdicts");
    for (const r of packet.ruleEvaluations) {
      out.push(`### ${r.controlId} — ${r.controlTitle} (\`${r.ruleId}\`)`);
      out.push(`- **Scenario Verdict:** **${r.verdict}** *(Assessment Mode: \`${r.assessmentMode || "FORMAL_EVIDENCE_AUDIT"}\`)*`);
      out.push(
        `- **Formal Audit Determination:** **${r.formalDetermination || r.verdict}** *(Evidence Status: \`${r.formalEvidenceStatus || "PENDING_VERIFIED_EVIDENCE"}\`)*`,
      );
      out.push(`- **Summary:** ${r.summary}`);
      out.push(`- **Policy / ODP Threshold:** ${r.threshold}`);
      out.push(`- **Variance:** ${r.variance}`);
      out.push(`- **Audit Hash:** \`${r.auditHash}\``);
      if (r.authorityCitations?.length) {
        out.push("- **Authoritative Citations:**");
        for (const a of r.authorityCitations) {
          out.push(
            `  - **${a.document}** (\`${a.version}\`, effective \`${a.effectiveDate}\`, ${a.url}) — *${a.section}*${a.parameterId ? ` [\`${a.parameterId}\`: ${a.parameterValue || ""}]` : ""}. *Exceptions:* ${a.exceptions}`,
          );
        }
      }
      if (r.authPathAssessment) {
        out.push(`- **End-to-End Authentication Path:** ${r.authPathAssessment.evaluatedPath}`);
        out.push(
          `  - *Architectural Checks:* ${r.authPathAssessment.architecturalVerificationRequired.join(" | ")}`,
        );
      }
      if (r.missingEvidence.length > 0) {
        out.push(`- **Evidence Required for Formal Assessor Determination:** ${r.missingEvidence.join("; ")}`);
      }
      if (r.draftFinding) {
        out.push(`- **Draft Assessment Finding (${r.draftFinding.severity}, ${r.draftFinding.objectiveId}):** ${r.draftFinding.title} — ${r.draftFinding.impactSummary}`);
      }
      if (r.draftPoam) {
        out.push(
          `- **Draft POA&M (\`${r.draftPoam.poamId}\`, Program Guidance Timeline: ${r.draftPoam.slaDays} days — NOT Statutory):** ${r.draftPoam.weaknessName}`,
        );
        out.push(`  - *Remediation Plan:* ${r.draftPoam.remediationPlan}`);
        out.push(`  - *Verification Proof Required:* ${r.draftPoam.requiredTechnicalProof}`);
      }
      if (r.poamAuthorityNote) {
        out.push(`- **POA&M & Directive Scope Note:** ${r.poamAuthorityNote}`);
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
      const authRec = packet.authoritativeRecords?.find((rec) => (rec.enhancement || rec.control_id) === c.id);
      if (authRec) {
        lines_auth(out, authRec);
      } else if (c.fedrampOdp) {
        out.push(`- **FedRAMP ODP Summary:** ${c.fedrampOdp.high} *(Timeline Scope: ${c.fedrampOdp.sla})*`);
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

  if (packet.rmfTasksReferenced.length > 0) {
    out.push("## NIST SP 800-37 Rev. 2 Official Tasks");
    for (const t of packet.rmfTasksReferenced) {
      out.push(`- **Task ${t.taskId} — ${t.title}** (Step ${t.stepNumber} ${t.stepCode}, ${t.level}): ${t.description} *Outputs:* ${t.expectedOutputs.join("; ")}.`);
    }
    out.push("");
  }

  if (packet.nistPublicationsReferenced.length > 0) {
    out.push("## Supporting NIST SP & FIPS Standards Grounding");
    for (const pub of packet.nistPublicationsReferenced) {
      out.push(`- **${pub.docNumber} — ${pub.title}** (${pub.version}): ${pub.summary} *Mandatory Invariant:* ${pub.invariants[0] || ""}`);
      if (pub.sourceId === "SP-800-88r1") {
        out.push("  - **NVMe SSD Flash Caution:** Logical overwrite (`Clear`) does NOT reach wear-leveled spare blocks, over-provisioning, or remapped sectors on NVMe SSDs holding PHI/ITAR data; execute `Purge` (Cryptographic Erase / NVMe Sanitize) or physical `Destroy`.");
      }
    }
    out.push("");
  }

  if (packet.sp80060InfoTypesReferenced.length > 0) {
    out.push("## NIST SP 800-60 Vol. 2 Provisional Categorization");
    for (const it of packet.sp80060InfoTypesReferenced) {
      out.push(`- **${it.code} (${it.name}):** C=${it.confidentiality}, I=${it.integrity}, A=${it.availability} -> High-Watermark **${it.highWatermark}**. ${it.tailoringNotes}`);
    }
    out.push("");
  }

  if (/\b(?:poa&m|poam|statutory|30-day)\b/i.test(packet.question)) {
    out.push("## POA&M Timeline Authority & Governance Correction");
    out.push("- **Program Guidance vs. Statute:** FedRAMP's 30-day High / 90-day Moderate / 180-day Low POA&M remediation timelines come from FedRAMP Continuous Monitoring / `RA-5(d)` ODP (`ra-05_odp.03`) program guidance subject to Agency/JAB Authorizing Official (AO) tailoring and Deviation Requests — they are **NOT** a universal federal statute.");
    out.push("");
  }

  out.push(
    "> **Governance Boundary:** Automated checks verify explicit rules against documented evidence; interviews, compensating-control rationale, and formal ATO risk acceptance remain the exclusive responsibility of the designated **Authorizing Official (AO)** — Noctis cannot issue or grant an ATO.",
  );
  return out.join("\n");
}

function lines_auth(out: string[], rec: import("./noctis-rmf-db.ts").AuthoritativeControlRecord): void {
  out.push(
    `- **Authoritative Registry Metadata:** ${rec.authority.document} (\`${rec.authority.version}\`, effective \`${rec.authority.effective_date}\`, SHA-256 \`${rec.authority.sha256.slice(0, 12)}\`)`,
  );
  if (rec.organization_defined_parameters.length > 0) {
    out.push(
      `- **FedRAMP OSCAL ODPs:** ${rec.organization_defined_parameters.map((p) => `\`${p.param_id}\` = "${p.value}"`).join("; ")}`,
    );
  }
  if (rec.additional_fedramp_requirements.length > 0) {
    out.push(`- **Additional FedRAMP Requirements:** ${rec.additional_fedramp_requirements.join(" | ")}`);
  }
  if (rec.additional_fedramp_guidance.length > 0) {
    out.push(`- **Additional FedRAMP Guidance / Exceptions:** ${rec.additional_fedramp_guidance.join(" | ")}`);
  }
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

function buildProvenanceFooter(
  packet: RmfGroundingPacket,
  audit: RmfVerificationReport | null,
  persistedTraceSql?: boolean,
): string {
  const cited = audit?.verifiedControls.length ? audit.verifiedControls.slice(0, 8).join(", ") : packet.controls.map((c) => c.id).slice(0, 6).join(", ");
  const tracePart = packet.explanationBundle
    ? ` · Trace: \`${packet.explanationBundle.bundleId}\` (\`${packet.explanationBundle.canonicalTraceHash.slice(0, 12)}\`${persistedTraceSql ? ", SQL Replayable" : ""})`
    : "";
  const frVer = packet.manifest.fedrampVersion ? ` · FedRAMP Rev. 5 OSCAL (${packet.manifest.fedrampVersion})` : "";
  return (
    `\n\n---\n` +
    `**Deterministic RMF Verification** · NIST SP 800-53/53A Rev. ${packet.manifest.nistVersion}${frVer} · SP 800-53B · SP 800-171 Rev. 3 · CSF 2.0 · MITRE ATT&CK v16.1` +
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
        temperature: 0.0,
        maxTokens: 8192,
        thinkingLevel: opts.shouldThink === false ? "low" : "medium",
        brain: opts.brain,
      },
    );

    if ("text" in first && first.text.trim()) {
      const parsed = cleanThinkOutput(first.text);
      activeThought = parsed.thought;
      if (parsed.body.length >= 25 && !/<\/?think>/i.test(parsed.body)) {
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
              temperature: 0.0,
              maxTokens: 8192,
              thinkingLevel: opts.shouldThink === false ? "low" : "medium",
              brain: opts.brain,
            },
          );

          if ("text" in repaired && repaired.text.trim()) {
            const parsedRepair = cleanThinkOutput(repaired.text);
            if (parsedRepair.thought) activeThought = parsedRepair.thought;
            if (parsedRepair.body.length >= 25 && !/<\/?think>/i.test(parsedRepair.body)) {
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

  let persistedTraceSql = false;
  if (packet.explanationBundle && opts.persistTrace !== false) {
    try {
      const traceTenant = opts.tenantId?.trim() || "chat-session";
      await saveRmfArtifact({
        id: packet.explanationBundle.bundleId,
        tenantId: traceTenant,
        artifactType: "EXPLANATION",
        systemId: "noctis-chat-rmf",
        title: `Decision Trace ${packet.explanationBundle.evaluationRef} (${packet.explanationBundle.verdict})`,
        status: "RECORDED",
        payload: packet.explanationBundle as unknown as Record<string, unknown>,
        createdBy: traceTenant,
      });
      persistedTraceSql = true;
    } catch {
      /* Non-fatal if DB unavailable during ephemeral offline inference */
    }
  }

  const footer = buildProvenanceFooter(packet, audit, persistedTraceSql);
  if (opts.shouldThink === false) {
    return `${finalBody.trim()}${footer}`;
  }

  const thought = [activeThought, buildDeterministicThoughtTrace(packet, audit, hadRepair)]
    .filter(Boolean)
    .join("\n\n");

  return `<think>\n${thought}\n</think>\n\n${finalBody.trim()}${footer}`;
}
