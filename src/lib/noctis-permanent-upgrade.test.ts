import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assessPromptComplexity } from "./noctis-model-escalation.ts";
import {
  extractStructuredComplianceFacts,
  mergeStructuredFactsIntoRmfPacket,
} from "./noctis-structured-extractor.server.ts";
import { runComposableComplianceTools } from "./noctis-composable-orchestrator.server.ts";
import { buildRmfGroundingPacket, verifyRmfResponseAgainstDb } from "./noctis-rmf-db.ts";
import { evaluateMp6SanitizationRule } from "./noctis-rmf-rules.ts";
import { executeUniversalRmfReasoning, renderDeterministicRmfFallback, sanitizeRmfMarkdownFormatting } from "./noctis-rmf-reasoning.server.ts";
import { parseThinkEnvelope } from "./noctis-engine-registry.ts";
import { extractAndEvaluateRmfRulesFromText } from "./noctis-rmf-rules.ts";

describe("Noctis Permanent 4-Pillar Upgrade (Escalation + Structured JSON + Composable Tools + Strict Verifier)", () => {
  it("Pillar #3: keeps casual prompts on fast tier and escalates multi-constraint audits to reasoning tier", () => {
    const simple = assessPromptComplexity("What does AC-2 stand for in NIST?");
    assert.equal(simple.tier, "fast");

    const complex = assessPromptComplexity(
      [
        "Evaluate our FedRAMP High cloud healthcare system (Clinical PHI + ITAR) under FIPS 199, SP 800-37 Rev. 2 (P-11, C-2, M-7), SP 800-53A, SP 800-88 Rev. 1, and FIPS 203.",
        "1) Terminated admin active 39h.",
        "2) Static SSH keys without hardware FIDO2/PIV AAL3 MFA.",
        "3) NVMe Clear overwrite + AC-13.",
        "Put on a Markdown table.",
      ].join("\n"),
      { domainHint: "rmf_grc" },
    );
    assert.equal(complex.tier, "reasoning");
    assert.ok(complex.score >= 4);
    assert.equal(complex.providerOrder[0], "openai");
  });

  it("Pillar #2 (Deterministic MP-6 Rule + Zod Structured Extraction): evaluates paraphrased zero-control-ID prompt accurately", async () => {
    // Direct MP-6 rules
    const clearNvmeFail = evaluateMp6SanitizationRule({
      mediaType: "NVME_SSD",
      proposedMethod: "CLEAR_OVERWRITE",
      dataSensitivity: "HIGH_PHI_ITAR",
      assessmentMode: "SCENARIO_ASSUMPTION",
    });
    assert.equal(clearNvmeFail.verdict, "FAIL");
    assert.equal(clearNvmeFail.controlId, "MP-6");

    const degaussSsdFail = evaluateMp6SanitizationRule({
      mediaType: "SSD_FLASH",
      proposedMethod: "DEGAUSS",
      dataSensitivity: "MODERATE",
    });
    assert.equal(degaussSsdFail.verdict, "FAIL");

    const purgePass = evaluateMp6SanitizationRule({
      mediaType: "NVME_SSD",
      proposedMethod: "PURGE_CRYPTO_ERASE",
      dataSensitivity: "HIGH_PHI_ITAR",
    });
    assert.equal(purgePass.verdict, "PASS");

    // Paraphrase intentionally avoids control IDs and regex triggers ("terminated", "NVMe Clear")
    const paraphrasePrompt =
      "Our cloud EHR fired a sysadmin on Tuesday and left his Okta active for 52 hours; engineers shell into prod using shared PEM files with no hardware token; we want to wipe retired solid-state drives with a single pass before recycling. Put the findings on a Markdown table.";

    const extracted = await extractStructuredComplianceFacts(paraphrasePrompt, {
      modelChatFn: async () => ({
        text: JSON.stringify({
          ac2Termination: { mentioned: true, elapsedHours: 52, policyThresholdHours: 24, inactiveAccountDays: null },
          ia2Auth: {
            mentioned: true,
            staticSshKeysInUse: true,
            mfaEnforcedPrivileged: false,
            phishingResistant: false,
            upstreamBastionMfaEnforced: null,
            idpFederationPhishingResistant: null,
            ephemeralSshCertificates: false,
            directSshBypassBlocked: null,
          },
          mediaSanitization: {
            mentioned: true,
            mediaType: "NVME_SSD",
            proposedMethod: "CLEAR_OVERWRITE",
            dataSensitivity: "HIGH_PHI_ITAR",
          },
          fips199: {
            mentioned: true,
            confidentiality: "HIGH",
            integrity: "HIGH",
            availability: "HIGH",
            informationTypes: ["PHI"],
            isNationalSecuritySystem: false,
          },
          citedControls: ["AC-2", "IA-2", "MP-6"],
          citedRmfTasks: ["M-7"],
          citedStandards: ["800-88"],
          requestsTable: true,
          requestsAtoIssuance: false,
          claimsPoamStatutory: false,
        }),
      }),
    });
    assert.ok(extracted);
    assert.equal(extracted.ac2Termination.elapsedHours, 52);

    const basePacket = buildRmfGroundingPacket(paraphrasePrompt);
    const merged = mergeStructuredFactsIntoRmfPacket(basePacket, extracted);

    const ac2Rule = merged.ruleEvaluations.find((r) => r.controlId === "AC-2");
    const ia2Rule = merged.ruleEvaluations.find((r) => r.controlId === "IA-2");
    const mp6Rule = merged.ruleEvaluations.find((r) => r.controlId === "MP-6");
    assert.equal(ac2Rule?.verdict, "FAIL");
    assert.ok(ac2Rule?.variance.includes("+28 hours"));
    assert.equal(ia2Rule?.verdict, "FAIL");
    assert.equal(mp6Rule?.verdict, "FAIL");
    assert.equal(merged.fips199?.overallImpact, "HIGH");
    assert.ok(merged.rmfTasksReferenced.some((t) => t.taskId === "M-7"));

    // Graceful failure on malformed JSON
    const malformed = await extractStructuredComplianceFacts(paraphrasePrompt, {
      modelChatFn: async () => ({ text: "not valid json {" }),
    });
    assert.equal(malformed, null);
  });

  it("Pillar #1: Composable multi-domain tools run in parallel & prevent AC-13 / MP-6 conflation", async () => {
    const q =
      "Evaluate FedRAMP High Clinical PHI + ITAR under FIPS 203 (ML-KEM), SP 800-88 NVMe Clear, and SSP citation AC-13 on a Markdown table.";
    const packet = buildRmfGroundingPacket(q);
    const tools = await runComposableComplianceTools(q, packet, null, { allowDbQueries: false });

    assert.ok(tools.toolsInvoked.includes("tool_withdrawn_control_lineage"));
    assert.ok(tools.toolsInvoked.includes("tool_pqc_fips203"));
    assert.ok(tools.toolsInvoked.includes("tool_dod_ic_overlay"));
    assert.ok(tools.markdownAppendix.includes("AC-2 and AU-6"));
    assert.ok(tools.markdownAppendix.includes("NEVER state that MP-6"));
    assert.ok(tools.markdownAppendix.includes("FIPS 203"));
  });

  it("Stage 3 Tightened Verifier: blocks AC-13->MP-6 conflation, missing AU-6, missing FIPS 203, and missing Markdown table", async () => {
    const q =
      "Evaluate FedRAMP High under FIPS 203, SP 800-88 NVMe Clear, and AC-13. Put the findings, Examine/Interview/Test procedures on a Markdown table.";
    const packet = buildRmfGroundingPacket(q);

    const conflatedDraft = `
### MP-6 — Media Sanitization (replaces withdrawn AC-13)
Scenario Verdict: FAIL. Single logical overwrite Clear is insufficient on NVMe.
Examine, Interview, Test procedures covered under AC-2.
`;
    const audit = verifyRmfResponseAgainstDb(q, conflatedDraft, packet);
    assert.equal(audit.passed, false);
    assert.ok(audit.violations.some((v) => v.includes("WITHDRAWN_REPLACEMENT_CONFLATION")));
    assert.ok(audit.violations.some((v) => v.includes("UNFLAGGED_WITHDRAWN_CONTROL")));
    assert.ok(audit.violations.some((v) => v.includes("MISSING_REQUESTED_STANDARD")));
    assert.ok(audit.violations.some((v) => v.includes("MISSING_REQUESTED_TABLE")));

    // Deterministic fallback + composable tool appendix passes cleanly!
    const tools = await runComposableComplianceTools(q, packet, null, { allowDbQueries: false });
    const fallback = renderDeterministicRmfFallback(packet, tools.markdownAppendix);
    const fallbackAudit = verifyRmfResponseAgainstDb(q, fallback, packet);
    assert.equal(fallbackAudit.passed, true, `Unexpected violations: ${fallbackAudit.violations.join(" | ")}`);

    // Verify executeUniversalRmfReasoning sends tier='reasoning' to chatFn
    let capturedTier: string | undefined;
    const out = await executeUniversalRmfReasoning(
      q + " 1) Terminated admin active 39h. 2) Static SSH keys without hardware FIDO2 MFA.",
      {
        shouldThink: true,
        persistTrace: false,
        structuredExtractFn: async () => ({ text: "{}" }),
        modelChatFn: async (_msgs, opts) => {
          capturedTier = opts?.tier;
          return { text: "<think>Truncated" };
        },
      },
    );
    assert.equal(capturedTier, "reasoning");
    const visible = parseThinkEnvelope(out).body;
    assert.ok(visible.includes("AC-2") && visible.includes("AU-6") && visible.includes("FIPS 203"));
    assert.ok(/\|[^\n]+\|\r?\n\|[\s:|-]+\|/m.test(visible));

    // Omitting AC-13 completely when prompt asked about AC-13 MUST be caught
    const omittedAc13 = `
### MP-6 — Media Sanitization
Scenario Verdict: FAIL. Purge required under SP 800-88. FIPS 203 (ML-KEM) required.
Examine, Interview, Test procedures covered.
| Control | Verdict |
| :--- | :--- |
| MP-6 | FAIL |
`;
    const missingAc13Audit = verifyRmfResponseAgainstDb(q, omittedAc13, packet);
    assert.equal(missingAc13Audit.passed, false);
    assert.ok(missingAc13Audit.violations.some((v) => v.includes("MISSING_REQUESTED_WITHDRAWN_CONTROL")));

    // Fenced ```markdown tables unwrap cleanly
    const fenced = "### Table\n\n```markdown\n| Control | Verdict |\n| :--- | :--- |\n| AC-2 | FAIL |\n```\n";
    const unwrapped = sanitizeRmfMarkdownFormatting(fenced);
    assert.ok(!unwrapped.includes("```markdown"));
    assert.ok(/\| Control \| Verdict \|\r?\n\| :--- \| :--- \|/m.test(unwrapped));
  });

  it("handles EVAL-02 fired/left-active 52h paraphrase and EVAL-08 Okta+bastion same-domain MFA in regex rules", () => {
    const eval02 = extractAndEvaluateRmfRulesFromText(
      "Our FedRAMP High cloud EHR fired a sysadmin on Tuesday and left his Okta active for 52 hours.",
    );
    const ac2 = eval02.find((r) => r.controlId === "AC-2");
    assert.equal(ac2?.verdict, "FAIL");
    assert.ok(ac2?.variance.includes("+28 hours"));

    const eval08 = extractAndEvaluateRmfRulesFromText(
      "Evaluate IA-2 for FedRAMP High: privileged admins authenticate via a centralized Okta IdP enforcing FIDO2 phishing-resistant MFA to an upstream bastion, then use static SSH keys inside the same domain with direct SSH bypass blocked.",
    );
    const ia2 = eval08.find((r) => r.controlId === "IA-2");
    assert.equal(ia2?.verdict, "MANUAL_REVIEW_REQUIRED");
  });
});
