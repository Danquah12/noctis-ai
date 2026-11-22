#!/usr/bin/env node
/**
 * Noctis Grounded RMF SFT (ChatML) & Verifier-Scored DPO Dataset Generator (Option B)
 *
 * Reads `src/data/rmf-deterministic-db.json` (authoritative NIST SP 800-53 Rev. 5.2.0,
 * SP 800-53A, SP 800-53B, SP 800-171 Rev. 3, CSF 2.0, FedRAMP ODPs, and MITRE ATT&CK v16.1)
 * and exports strictly separate training examples (`data/rmf-sft-chatml.jsonl`) and
 * DPO preference pairs (`data/rmf-dpo-pairs.jsonl`).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(REPO_ROOT, "src", "data", "rmf-deterministic-db.json");
const SFT_OUT = path.join(REPO_ROOT, "data", "rmf-sft-chatml.jsonl");
const DPO_OUT = path.join(REPO_ROOT, "data", "rmf-dpo-pairs.jsonl");

const HELD_OUT_FAMILIES = new Set(["SC", "SI"]);

const SYSTEM_PROMPT =
  "You are Noctis RMF Intelligence, a Federal RMF Specialist, ISSO, ISSM, and Security Control Assessor grounded in NIST SP 800-37 Rev. 2, NIST SP 800-53/53A Rev. 5.2.0, FedRAMP ODPs, and deterministic compliance rules. Cite only verified controls, preserve rule verdicts verbatim, flag withdrawn controls with official replacements, and reserve ATO risk acceptance for the Authorizing Official (AO).";

function makeChatMl(category, controlId, family, userContent, assistantContent, meta = {}) {
  const split = HELD_OUT_FAMILIES.has(family) ? "eval_holdout" : "train";
  return {
    id: `rmf-${category}-${controlId}`.replace(/[^a-z0-9_-]/gi, "_"),
    category,
    split,
    source_version: meta.nistVersion || "5.2.0",
    db_sha256: meta.dbSha256,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
      { role: "assistant", content: assistantContent },
    ],
  };
}

function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  const meta = {
    nistVersion: db.manifest.nistVersion,
    dbSha256: db.manifest.dbSha256,
  };

  const sftRecords = [];
  const dpoRecords = [];

  // 1. Authoritative Control Interpretation, Baselines & 800-53A Assessment Procedures
  for (const ctrl of Object.values(db.controls)) {
    if (ctrl.withdrawn) {
      const repl = ctrl.withdrawnInto?.length ? ctrl.withdrawnInto.join(", ") : "the active replacement controls";
      const prompt = `What does NIST SP 800-53 Rev. 5 control ${ctrl.id} require in a Federal / FedRAMP system?`;
      const chosen = `**${ctrl.id} (${ctrl.title}) is WITHDRAWN in NIST SP 800-53 Rev. ${db.manifest.nistVersion}.** Do not implement or cite ${ctrl.id} as an active baseline control; its requirements were incorporated/moved into **${repl}**. Evaluate ${repl} instead.`;
      sftRecords.push(makeChatMl("withdrawn_redirect", ctrl.id, ctrl.family, prompt, chosen, meta));

      if (ctrl.withdrawnInto?.length) {
        dpoRecords.push({
          id: `dpo-withdrawn-${ctrl.id}`,
          category: "withdrawn_control_fidelity",
          prompt,
          chosen,
          rejected: `Control ${ctrl.id} (${ctrl.title}) is an active mandatory requirement in the FedRAMP Moderate and High baselines and must be tested directly in your SSP.`,
          reason: `Rejected failed Citation Gate: failed to disclose ${ctrl.id} is WITHDRAWN in Rev. ${db.manifest.nistVersion} and omitted replacement(s) ${repl}.`,
        });
      }
      continue;
    }

    if (ctrl.baselines?.length > 0 || ctrl.fedrampOdp) {
      const baselineStr = ctrl.baselines?.length ? ctrl.baselines.join(", ") : "Tailored / Enhancement";
      const attackStr = (db.attackByControl[ctrl.id] || [])
        .slice(0, 5)
        .map((t) => `${t.id} (${t.name})`)
        .join(", ");

      const prompt = `Explain NIST SP 800-53 Rev. 5 control ${ctrl.id} (${ctrl.title}), its baseline applicability, and SP 800-53A Examine/Interview/Test assessment procedures.`;
      const answerParts = [
        `### ${ctrl.id} — ${ctrl.title}`,
        `- **NIST SP 800-53B Baselines:** ${baselineStr}`,
        ctrl.statement ? `- **Requirement:** ${ctrl.statement}` : "",
        ctrl.fedrampOdp ? `- **FedRAMP High ODP:** ${ctrl.fedrampOdp.high} (POA&M SLA: ${ctrl.fedrampOdp.sla})` : "",
        ctrl.objectives?.length ? `- **Key Assessment Objectives:** ${ctrl.objectives.join(" | ")}` : "",
        `- **SP 800-53A Assessment Methods:**`,
        `  - **Examine:** ${ctrl.methods?.examine || "Relevant system policies, configurations, and logs."}`,
        `  - **Interview:** ${ctrl.methods?.interview || "ISSO, system owners, and technical administrators."}`,
        `  - **Test:** ${ctrl.methods?.test || "Automated and manual control verification procedures."}`,
        attackStr ? `- **MITRE ATT&CK v16.1 Mitigations:** ${attackStr}` : "",
      ].filter(Boolean);

      const chosen = answerParts.join("\n");
      sftRecords.push(makeChatMl("control_and_53a", ctrl.id, ctrl.family, prompt, chosen, meta));

      // DPO pair for Assessment Method completeness + Citation accuracy on top baseline controls
      if (!ctrl.parentId) {
        dpoRecords.push({
          id: `dpo-53a-${ctrl.id}`,
          category: "800_53a_and_citation_fidelity",
          prompt,
          chosen,
          rejected: `${ctrl.id} (${ctrl.title}) can be verified by reviewing the SSP policy document alone under AC-99. Once documented, mark the control compliant without testing.`,
          reason: "Rejected failed Citation & 800-53A Gates: cited non-existent AC-99 and omitted Interview and Test procedures.",
        });
      }
    }
  }

  // 2. Deterministic Rule Evaluation Scenarios (PASS, FAIL, INSUFFICIENT_EVIDENCE)
  const deterministicScenarios = [
    {
      id: "AC2_FAIL_31H",
      family: "AC",
      prompt:
        "Evaluate NIST SP 800-53 AC-2: approved policy requires terminated accounts disabled within 24 hours. Termination occurred at 08:00 Monday and the account was disabled at 15:00 Tuesday.",
      chosen:
        "**Verdict: `FAIL` (Rule `RMF-AC2-TERM-001`)**\n- **Elapsed Time:** 31 hours (exceeded 24-hour policy threshold by +7 hours).\n- **Draft Finding:** Delayed termination account removal under AC-2 (Severity: HIGH).\n- **Draft POA&M (`POAM-AC2-TERM-001`, SLA: 30 days):** Revoke lingering sessions/tokens immediately, audit excess-window activity, and automate HRIS-to-IdP SCIM deprovisioning.",
      rejected:
        "**Verdict: `PASS`** — Because the account was disabled by Tuesday afternoon on the following business day, AC-2 is substantively compliant and no POA&M is needed.",
    },
    {
      id: "AC2_PASS_6H",
      family: "AC",
      prompt:
        "Evaluate NIST SP 800-53 AC-2: approved policy requires terminated accounts disabled within 24 hours. Termination occurred at 08:00 Monday and the IdP log shows disablement at 14:00 Monday (6 hours elapsed).",
      chosen:
        "**Verdict: `PASS` (Rule `RMF-AC2-TERM-001`)**\n- **Elapsed Time:** 6 hours (within the 24-hour policy threshold by 18 hours margin).\n- Verify via SP 800-53A Test that active OAuth tokens/SSH certs were simultaneously invalidated.",
      rejected:
        "**Verdict: `FAIL`** — Automated revocation must occur within 60 seconds under NIST SP 800-53 AC-2.",
    },
    {
      id: "AC2_INSUFFICIENT",
      family: "AC",
      prompt:
        "Is our organization compliant with NIST SP 800-53 AC-2 for terminated users? We do not have HR offboarding timestamps or IdP revocation logs yet.",
      chosen:
        "**Verdict: `INSUFFICIENT_EVIDENCE` (Rule `RMF-AC2-TERM-001`)**\nCompliance cannot be determined because required objective evidence is missing:\n1. Timestamped HR termination notice / offboarding ticket.\n2. Immutable IAM/IdP audit log confirming disablement timestamp.\nCollect both artifacts before issuing PASS or FAIL.",
      rejected:
        "**Verdict: `PASS` (Provisional)** — Assuming HR normally handles terminations on time, AC-2 is marked implemented pending documentation.",
    },
    {
      id: "RA5_FAIL_45D",
      family: "RA",
      prompt:
        "Evaluate FedRAMP High RA-5 & POA&M SLA compliance: a HIGH-severity vulnerability finding has been open for 45 days without verified remediation.",
      chosen:
        "**Verdict: `FAIL` (Rule `RMF-RA5-VULN-001`)**\n- **Variance:** +15 days past the statutory **30-day** FedRAMP High remediation SLA.\n- Requires immediate remediation/mitigation execution, authenticated rescan proof, and AO escalation.",
      rejected:
        "**Verdict: `PASS`** — High-severity POA&M findings under FedRAMP have a 90-day remediation window, so 45 days remains compliant.",
    },
  ];

  for (const sc of deterministicScenarios) {
    sftRecords.push(makeChatMl("deterministic_rule", sc.id, sc.family, sc.prompt, sc.chosen, meta));
    dpoRecords.push({
      id: `dpo-${sc.id}`,
      category: "deterministic_verdict_fidelity",
      prompt: sc.prompt,
      chosen: sc.chosen,
      rejected: sc.rejected,
      reason: "Rejected contradicted deterministic compliance rule outcome or FedRAMP SLA.",
    });
  }

  // 3. FIPS 199 Security Categorization & High-Water Mark Examples
  for (const ftype of db.fips199Types || []) {
    const rank = { LOW: 1, MODERATE: 2, HIGH: 3 };
    const maxLevel = Math.max(rank[ftype.c], rank[ftype.i], rank[ftype.a]);
    const hwm = maxLevel === 3 ? "HIGH" : maxLevel === 2 ? "MODERATE" : "LOW";
    const prompt = `Calculate the FIPS 199 Security Categorization High-Water Mark for a federal system processing ${ftype.name} (${ftype.code}) with Confidentiality ${ftype.c}, Integrity ${ftype.i}, and Availability ${ftype.a}.`;
    const chosen = `\`SC = {(confidentiality, ${ftype.c}), (integrity, ${ftype.i}), (availability, ${ftype.a})}\`\n- **High-Water Mark Overall Impact:** **${hwm}** (` + `max(${ftype.c}, ${ftype.i}, ${ftype.a}) = ${hwm}` + `).\n- **Guidance:** ${ftype.notes}\n- **SP 800-53B Baseline Selected:** ${hwm} Baseline.`;
    sftRecords.push(makeChatMl("fips199", ftype.code, "PL", prompt, chosen, meta));
  }

  // 4. SP 800-171 Rev. 3 CUI & CSF 2.0 Examples
  for (const req of Object.values(db.cui800171).slice(0, 60)) {
    const fam = req.familyTitle?.slice(0, 2).toUpperCase() || "AC";
    const prompt = `Summarize NIST SP 800-171 Rev. 3 CUI security requirement ${req.id} (alias ${req.shortId}: ${req.title}).`;
    const chosen = `**NIST SP 800-171 Rev. 3 — ${req.id} (${req.title})** [Family: ${req.familyTitle}]\n${req.statement}`;
    sftRecords.push(makeChatMl("cui_800_171", req.id, fam, prompt, chosen, meta));
  }

  fs.mkdirSync(path.dirname(SFT_OUT), { recursive: true });
  fs.writeFileSync(SFT_OUT, sftRecords.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  fs.writeFileSync(DPO_OUT, dpoRecords.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

  const trainCount = sftRecords.filter((r) => r.split === "train").length;
  const evalHoldoutCount = sftRecords.filter((r) => r.split === "eval_holdout").length;

  console.log("=== RMF Grounded Training & DPO Dataset Generated ===");
  console.log(`SFT ChatML JSONL: ${SFT_OUT}`);
  console.log(`  Total SFT examples:  ${sftRecords.length} (train: ${trainCount}, eval_holdout [SC, SI]: ${evalHoldoutCount})`);
  console.log(`DPO Pairs JSONL:  ${DPO_OUT}`);
  console.log(`  Total DPO pairs:     ${dpoRecords.length}`);
}

main();
