import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRmfDbManifest,
  listBaselineControls,
  lookupRmfControl,
  lookup800171Requirement,
  lookupCsf2Item,
  lookupAttackControls,
  isValid80053ControlId,
  buildRmfGroundingPacket,
  verifyRmfResponseAgainstDb,
  getAuthoritativeControlRecord,
  getAuthorityPolicy,
} from "./noctis-rmf-db.ts";
import { handleRmfV2Request } from "./rmf-v2/api-handler.server.ts";
import {
  evaluateAc2AccountManagementRule,
  evaluateAc3AccessEnforcementRule,
  evaluateAu2EventLoggingRule,
  evaluateAu6AuditReviewRule,
  evaluateCa7ConMonRule,
  evaluateCm2BaselineRule,
  evaluateCm6ConfigSettingsRule,
  evaluateIa2AuthRule,
  evaluateRa5VulnScanningRule,
  evaluateSi2FlawRemediationRule,
  extractAndEvaluateRmfRulesFromText,
} from "./noctis-rmf-rules.ts";
import { executeUniversalRmfReasoning, sanitizeRmfMarkdownFormatting } from "./noctis-rmf-reasoning.server.ts";
import { buildContextualFollowUps } from "./noctis-followups.ts";

describe("Deterministic RMF Knowledge DB (NIST SP 800-53 Rev. 5.2.0 + 800-53A + 800-53B + 800-171 + CSF 2.0 + MITRE ATT&CK)", () => {
  it("loads complete authoritative NIST 5.2.0, baselines, 800-171 Rev. 3, CSF 2.0, and ATT&CK v16.1 datasets with SHA-256 provenance", () => {
    const manifest = getRmfDbManifest();
    assert.match(manifest.dbSha256, /^[a-f0-9]{64}$/);
    assert.ok(manifest.counts.totalControlsAndEnhancements >= 1100);
    assert.equal(listBaselineControls("HIGH").length, 370);
    assert.equal(listBaselineControls("MODERATE").length, 287);
    assert.equal(listBaselineControls("LOW").length, 149);

    const ac2 = lookupRmfControl("ac-02");
    assert.ok(ac2);
    assert.equal(ac2.id, "AC-2");
    assert.equal(ac2.withdrawn, false);
    assert.ok(ac2.methods.examine.length > 10);
    assert.ok(ac2.methods.interview.length > 10);
    assert.ok(ac2.methods.test.length > 10);

    const ac13 = lookupRmfControl("AC-13");
    assert.ok(ac13);
    assert.equal(ac13.withdrawn, true);
    assert.deepEqual(ac13.withdrawnInto, ["AC-2", "AU-6"]);

    assert.equal(isValid80053ControlId("IA-2(6)"), true);
    assert.equal(isValid80053ControlId("AC-99"), false);

    const cuiReq = lookup800171Requirement("3.1.1");
    assert.ok(cuiReq);
    assert.equal(cuiReq.id, "03.01.01");

    const csf = lookupCsf2Item("DE.CM-01");
    assert.ok(csf);
    assert.equal(csf.level, "subcategory");

    const t1666 = lookupAttackControls("T1666");
    assert.ok(t1666);
    assert.ok(t1666.controls.length >= 1);
  });

  it("evaluates all 10 starter control deterministic rules cleanly with 5-state verdicts", () => {
    const ac2Fail = evaluateAc2AccountManagementRule({
      policyThresholdHours: 24,
      elapsedHours: 31,
      terminationTimestampLabel: "08:00 Monday",
      disablementTimestampLabel: "15:00 Tuesday",
    });
    assert.equal(ac2Fail.verdict, "FAIL");
    assert.ok(ac2Fail.variance.includes("+7"));
    assert.ok(ac2Fail.draftPoam && ac2Fail.draftPoam.slaDays === 30);

    const ac2Pass = evaluateAc2AccountManagementRule({
      policyThresholdHours: 24,
      elapsedHours: 6,
    });
    assert.equal(ac2Pass.verdict, "PASS");

    const ac2Missing = evaluateAc2AccountManagementRule({ policyThresholdHours: 24 });
    assert.equal(ac2Missing.verdict, "INSUFFICIENT_EVIDENCE");
    assert.ok(ac2Missing.missingEvidence.length >= 1);

    const ac2Na = evaluateAc2AccountManagementRule({ notApplicableReason: "No interactive user accounts on air-gapped sensor" });
    assert.equal(ac2Na.verdict, "NOT_APPLICABLE");

    assert.equal(evaluateAc3AccessEnforcementRule({ rbacDefaultDenyEnforced: false }).verdict, "FAIL");
    assert.equal(evaluateAu2EventLoggingRule({ authLogged: true, privEscLogged: true, adminChangesLogged: true }).verdict, "PASS");
    assert.equal(evaluateAu6AuditReviewRule({ reviewIntervalDays: 14 }).verdict, "FAIL");
    assert.equal(evaluateCa7ConMonRule({ conmonIntervalDays: 30 }).verdict, "PASS");
    assert.equal(evaluateCm2BaselineRule({ daysSinceLastBaselineReview: 400 }).verdict, "FAIL");
    assert.equal(evaluateCm6ConfigSettingsRule({ compliancePercent: 78, baseline: "FedRAMP Rev. 5 High" }).verdict, "FAIL");
    assert.equal(evaluateIa2AuthRule({ staticSshKeysInUse: true, phishingResistant: false }).verdict, "FAIL");
    assert.equal(evaluateRa5VulnScanningRule({ findingSeverity: "HIGH", findingDaysOpen: 45 }).verdict, "FAIL");
    assert.equal(evaluateSi2FlawRemediationRule({ severity: "MODERATE", remediationDays: 60 }).verdict, "PASS");
  });

  it("extracts and evaluates deterministic rules from natural-language RMF scenarios", () => {
    const ac2Eval = extractAndEvaluateRmfRulesFromText(
      "Evaluate NIST SP 800-53 AC-2: our approved policy requires terminated accounts disabled within 24 hours. The employee was terminated at 08:00 Monday and their account was disabled at 15:00 Tuesday.",
    );
    assert.equal(ac2Eval.length, 1);
    assert.equal(ac2Eval[0]!.ruleId, "RMF-AC2-TERM-001");
    assert.equal(ac2Eval[0]!.observedFacts.elapsedHours, 31);
    assert.equal(ac2Eval[0]!.verdict, "FAIL");
    assert.ok(ac2Eval[0]!.variance.includes("+7"));

    const poamEval = extractAndEvaluateRmfRulesFromText(
      "Evaluate FedRAMP High RA-5 compliance: a HIGH severity finding has been open for 45 days.",
    );
    assert.equal(poamEval.length, 1);
    assert.equal(poamEval[0]!.verdict, "FAIL");
    assert.ok(poamEval[0]!.variance.includes("+15"));

    const missingEval = extractAndEvaluateRmfRulesFromText("Evaluate AC-3 compliance: we have no evidence logs available.");
    assert.equal(missingEval.length, 1);
    assert.equal(missingEval[0]!.verdict, "INSUFFICIENT_EVIDENCE");
  });

  it("catches fabricated control IDs, unflagged withdrawn controls, verdict contradictions, FIPS downgrades, and incomplete 800-53A methods", () => {
    const packet = buildRmfGroundingPacket(
      "Evaluate AC-2: terminated at 08:00 Monday, disabled at 15:00 Tuesday within 24 hour limit. Also explain AC-13 and calculate FIPS 199 Confidentiality Moderate, Integrity High, Availability Low with 800-53A test procedures.",
    );
    assert.equal(packet.fips199?.overallImpact, "HIGH");
    assert.ok(packet.explanationBundle);

    const badDraft = `
Control AC-99 requires automatic account expiration.
For AC-2 termination review, Verdict: PASS.
For AC-13, apply this directly in your baseline.
FIPS 199 overall impact is MODERATE.
Use Examine only for the assessment.
`;
    const audit = verifyRmfResponseAgainstDb(packet.question, badDraft, packet);
    assert.equal(audit.passed, false);
    assert.ok(audit.invalidIds.includes("AC-99"));
    assert.ok(audit.violations.some((v) => v.includes("FABRICATED_CONTROL_ID")));
    assert.ok(audit.violations.some((v) => v.includes("UNFLAGGED_WITHDRAWN_CONTROL")));
    assert.ok(audit.violations.some((v) => v.includes("RULE_VERDICT_CONTRADICTION")));
    assert.ok(audit.violations.some((v) => v.includes("FIPS_199_MATH_CONTRADICTION")));
    assert.ok(audit.violations.some((v) => v.includes("ASSESSMENT_PROCEDURE_INCOMPLETE")));
  });

  it("runs Neuro-Symbolic RMF Chat reasoning with clean pass, 1-shot repair on AC-99, and deterministic offline fallback", async () => {
    const prompt =
      "Evaluate NIST SP 800-53 AC-2: policy threshold 24 hours, terminated 08:00 Monday, disabled 15:00 Tuesday. Include 800-53A Examine/Interview/Test and draft POA&M.";

    // 1. Clean pass
    const cleanOut = await executeUniversalRmfReasoning(prompt, {
      modelChatFn: async () => ({
        text: `<think>Checked AC-2 (31h vs 24h -> FAIL)</think>\n\n**Verdict: FAIL** — Elapsed time is 31 hours (+7 hours over 24h limit under AC-2). **Examine**, **Interview**, and **Test** procedures and POA&M remediation included. Final risk acceptance belongs to the Authorizing Official (AO).`,
      }),
    });
    assert.ok(cleanOut.includes("<think>"));
    assert.ok(cleanOut.includes("Deterministic RMF Verification"));
    assert.ok(cleanOut.includes("Verified IDs:"));

    // 2. 1-shot auto-repair when Stage 2 cites fabricated AC-99
    let calls = 0;
    const repairedOut = await executeUniversalRmfReasoning(prompt, {
      modelChatFn: async () => {
        calls += 1;
        if (calls === 1) {
          return {
            text: "<think>Drafting</think>\n\nVerdict: FAIL under AC-2 and fabricated AC-99. Examine, Interview, Test.",
          };
        }
        return {
          text: "<think>Removed invalid control ID</think>\n\n**Verdict: FAIL** — Elapsed 31 hours exceeded 24h under **AC-2**. Include **Examine**, **Interview**, and **Test** plus POA&M.",
        };
      },
    });
    assert.equal(calls, 2);
    const repairedBody = repairedOut.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    assert.ok(!repairedBody.includes("AC-99"));
    assert.ok(repairedOut.includes("after 1-shot repair"));

    // 3. Offline deterministic fallback
    const offlineOut = await executeUniversalRmfReasoning(prompt, {
      modelChatFn: async () => ({ error: "LLM upstream offline" }),
    });
    assert.ok(offlineOut.includes("FAIL"));
    assert.ok(offlineOut.includes("31"));
    assert.ok(offlineOut.includes("Examine"));
    assert.ok(offlineOut.includes("Interview"));
    assert.ok(offlineOut.includes("Test"));
  });

  it("generates RMF-tailored contextual follow-up pills in Noctis Chat", () => {
    const rmfAnswer = `
### Noctis Deterministic RMF Assessment (AC-2)

**Verdict:** FAIL — Terminated user account remained enabled for 31 hours (7 hours past the 24-hour policy threshold). Under NIST SP 800-53 Rev. 5 AC-2 and FedRAMP High ODPs, a POA&M entry (30-day SLA) and 800-53A Examine/Interview/Test evidence are required before AO authorization review.
`;
    const pills = buildContextualFollowUps(
      "Evaluate NIST SP 800-53 AC-2 termination timeline",
      rmfAnswer,
      { desk: "chat" },
    );
    const labels = pills.map((p) => p.label);
    assert.ok(labels.includes("800-53A Examine, Interview & Test"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("FedRAMP High ODPs & POA&M SLAs"), `got: ${labels.join(", ")}`);
    assert.ok(!labels.includes("Draw the architecture"));
    assert.ok(!labels.includes("Calculate implementation cost"));
  });

  it("sanitizes raw LaTeX FIPS 199 delimiters into clean inline code while preserving currency and fenced code blocks", () => {
    const raw = [
      "### FIPS 199 Categorization",
      "",
      "$$\\text{SC} = \\{(\\text{confidentiality}, \\text{MODERATE}), (\\text{integrity}, \\text{HIGH}), (\\text{availability}, \\text{LOW})\\}$$",
      "",
      "Estimated remediation budget is $250 to $500, and threshold is $\\text{days} \\leq 30$.",
      "",
      "```tex",
      "$$\\text{keep_inside_fence}$$",
      "```",
    ].join("\n");
    const cleaned = sanitizeRmfMarkdownFormatting(raw);
    assert.ok(
      cleaned.includes("`SC = {(confidentiality, MODERATE), (integrity, HIGH), (availability, LOW)}`"),
      `unexpected sanitized output:\n${cleaned}`,
    );
    assert.ok(cleaned.includes("$250 to $500"), "must preserve normal currency amounts");
    assert.ok(cleaned.includes("`days <= 30`"), `expected <= operator cleanup:\n${cleaned}`);
    assert.ok(cleaned.includes("$$\\text{keep_inside_fence}$$"), "must preserve fenced code blocks");
    const outsideFence = cleaned.split("```tex")[0]!;
    assert.ok(!outsideFence.includes("$$"), "must strip display $$ delimiters outside code blocks");
    assert.ok(!outsideFence.includes("\\text{"), "must strip \\text{} macros outside code blocks");
  });

  it("ingests official FedRAMP Rev. 5 OSCAL High/Mod/Low baseline profiles with structured authority metadata and non-statutory POA&M scope", () => {
    const manifest = getRmfDbManifest() as unknown as {
      fedrampVersion?: string;
      sources: { id: string; sha256: string }[];
    };
    assert.equal(manifest.fedrampVersion, "fedramp2.1.0-oscal1.0.4");
    assert.ok(manifest.sources.some((s) => s.id === "fedramp-rev5-high-oscal" && /^[a-f0-9]{64}$/.test(s.sha256)));

    const ac23 = getAuthoritativeControlRecord("AC-2(3)", "HIGH");
    assert.ok(ac23);
    assert.equal(ac23.baseline_version, "fedramp2.1.0-oscal1.0.4");
    assert.equal(ac23.authority.effective_date, "2024-09-24");
    assert.ok(ac23.organization_defined_parameters.some((p) => p.param_id === "ac-02.03_odp.01" && p.value.includes("24 hours")));
    assert.ok(ac23.organization_defined_parameters.some((p) => p.param_id === "ac-02.03_odp.02" && /thirty-five\s*\(35\)\s*days/i.test(p.value)));

    const ac2 = getAuthoritativeControlRecord("AC-2", "HIGH");
    assert.ok(ac2);
    assert.ok(ac2.organization_defined_parameters.some((p) => p.param_id === "ac-02_odp.07" && /eight\s*\(8\)\s*hours/i.test(p.value)));
    assert.ok(ac2.organization_defined_parameters.some((p) => p.param_id === "ac-02_odp.10" && /monthly/i.test(p.value)));

    const ia21 = getAuthoritativeControlRecord("IA-2(1)", "HIGH");
    assert.ok(ia21);
    assert.ok(ia21.additional_fedramp_requirements.some((r) => /phishing-resistant/i.test(r)));
    assert.ok(ia21.additional_fedramp_guidance.some((g) => /subsequent components in the same user domain/i.test(g)));

    const poamPol = getAuthorityPolicy("FEDRAMP_POAM_TIMELINES");
    assert.ok(poamPol);
    assert.equal(poamPol.statutory, false);
    const kevPol = getAuthorityPolicy("CISA_BOD_22_01");
    assert.ok(kevPol);
    assert.ok(/Does NOT automatically govern/i.test(kevPol.exceptions));
  });

  it("remediates audit root causes: extracts 38h & without hardware MFA, separates scenario vs formal evidence, and evaluates IA-2 end-to-end auth paths", () => {
    const auditPrompt =
      "Evaluate FedRAMP High AC-2 and IA-2: a terminated employee account remained active for 38 hours, and privileged administrators use static SSH keys without hardware MFA.";
    const evals = extractAndEvaluateRmfRulesFromText(auditPrompt);
    assert.equal(evals.length, 2);

    const ac2 = evals.find((e) => e.controlId === "AC-2")!;
    const ia2 = evals.find((e) => e.controlId === "IA-2")!;
    assert.ok(ac2 && ia2);

    assert.equal(ac2.verdict, "FAIL");
    assert.equal(ac2.assessmentMode, "SCENARIO_ASSUMPTION");
    assert.equal(ac2.formalDetermination, "PENDING_EVIDENCE");
    assert.equal(ac2.observedFacts.elapsedHours, 38);
    assert.equal(ac2.observedFacts.policyThresholdHours, 24);
    assert.equal(ac2.variance, "+14 hours over deadline");
    assert.ok(ac2.draftPoam?.remediationPlan.includes("14-hour excess window"));
    assert.ok(!ac2.draftPoam?.remediationPlan.includes("7-hour excess window"));
    assert.ok((ac2.authorityCitations?.length ?? 0) >= 2);
    assert.ok(ac2.missingEvidence.length >= 2);

    assert.equal(ia2.verdict, "FAIL");
    assert.equal(ia2.assessmentMode, "SCENARIO_ASSUMPTION");
    assert.equal(ia2.formalDetermination, "PENDING_EVIDENCE");
    assert.equal(ia2.observedFacts.mfaEnforcedPrivileged, false);
    assert.equal(ia2.observedFacts.phishingResistant, false);
    assert.equal(ia2.observedFacts.staticSshKeysInUse, true);
    assert.equal(ia2.authPathAssessment?.upstreamMfaConsidered, true);

    // End-to-end IA-2 path cases
    const bastionSameDomain = evaluateIa2AuthRule({
      staticSshKeysInUse: true,
      upstreamBastionMfaEnforced: true,
      directSshBypassBlocked: true,
      phishingResistant: true,
    });
    assert.equal(bastionSameDomain.verdict, "MANUAL_REVIEW_REQUIRED");
    assert.equal(bastionSameDomain.authPathAssessment?.sameDomainGuidanceApplies, true);

    const ephemeralCertPass = evaluateIa2AuthRule({
      ephemeralSshCertificates: true,
      staticSshKeysInUse: false,
      upstreamBastionMfaEnforced: true,
      directSshBypassBlocked: true,
      phishingResistant: true,
    });
    assert.equal(ephemeralCertPass.verdict, "PASS");

    const ephemeralUnverifiedBypass = evaluateIa2AuthRule({
      ephemeralSshCertificates: true,
      staticSshKeysInUse: false,
      upstreamBastionMfaEnforced: true,
      phishingResistant: true,
    });
    assert.equal(ephemeralUnverifiedBypass.verdict, "MANUAL_REVIEW_REQUIRED");

    const omittedMfaDoesNotCoerceTrue = evaluateIa2AuthRule({ staticSshKeysInUse: true });
    assert.equal(omittedMfaDoesNotCoerceTrue.verdict, "FAIL");
    assert.equal(omittedMfaDoesNotCoerceTrue.observedFacts.mfaEnforcedPrivileged, null);
    assert.equal(omittedMfaDoesNotCoerceTrue.observedFacts.phishingResistant, null);
  });

  it("prevents Stage 3 multi-control verdict collision, blocks silent FAIL->INSUFFICIENT_EVIDENCE downgrade, and rejects 'statutory' POA&M claims", () => {
    const packet = buildRmfGroundingPacket(
      "Evaluate AC-2 termination and IA-2 static SSH keys for FedRAMP High.",
    );
    // Packet here has AC-2 = INSUFFICIENT_EVIDENCE (no hours) and IA-2 = FAIL
    assert.equal(packet.ruleEvaluations.length, 2);
    assert.equal(packet.ruleEvaluations.find((r) => r.controlId === "AC-2")?.verdict, "INSUFFICIENT_EVIDENCE");
    assert.equal(packet.ruleEvaluations.find((r) => r.controlId === "IA-2")?.verdict, "FAIL");

    const validScopedDraft = `
### AC-2 — Account Management
- **Scenario Verdict:** **INSUFFICIENT_EVIDENCE** — missing HR termination timestamp and immutable IdP log.

### IA-2 — Identification and Authentication
- **Scenario Verdict:** **FAIL** — Static SSH keys without verified upstream phishing-resistant MFA.
- **Formal Audit Determination:** **PENDING_VERIFIED_EVIDENCE** — requires bastion/IdP & sshd_config verification.
`;
    const okAudit = verifyRmfResponseAgainstDb(packet.question, validScopedDraft, packet);
    assert.equal(okAudit.passed, true, `Expected pass, got: ${okAudit.violations.join(" | ")}`);

    const silentDowngradeDraft = `
### AC-2 — Account Management
- **Verdict:** **INSUFFICIENT_EVIDENCE** — missing timestamps.

### IA-2 — Identification and Authentication
- **Verdict:** **INSUFFICIENT_EVIDENCE** — unverified deficiency in SSH MFA path.
`;
    const caughtDowngrade = verifyRmfResponseAgainstDb(packet.question, silentDowngradeDraft, packet);
    assert.equal(caughtDowngrade.passed, false);
    assert.ok(caughtDowngrade.violations.some((v) => v.includes("RULE_VERDICT_CONTRADICTION") && v.includes("IA-2")));

    const statutoryDraft = validScopedDraft + "\nFedRAMP imposes a statutory 30-day POA&M deadline for all High findings.";
    const caughtAuthority = verifyRmfResponseAgainstDb(packet.question, statutoryDraft, packet);
    assert.equal(caughtAuthority.passed, false);
    assert.ok(caughtAuthority.violations.some((v) => v.includes("AUTHORITY_MISREPRESENTATION")));
  });

  it("persists multi-rule EXPL-... bundles to SQL and replays them via GET /api/v2/rmf/explanations/:id", async () => {
    const prompt =
      "Evaluate FedRAMP High AC-2 and IA-2: a terminated employee account remained active for 38 hours, and privileged administrators use static SSH keys without hardware MFA.";
    const out = await executeUniversalRmfReasoning(prompt, {
      shouldThink: false,
      modelChatFn: async () => ({ error: "offline test mode" }),
    });
    assert.ok(out.includes("+14 hours over deadline"));
    assert.ok(out.includes("PENDING_EVIDENCE") || out.includes("PENDING_VERIFIED_EVIDENCE"));
    assert.ok(out.includes("fedramp2.1.0-oscal1.0.4"));
    const traceMatch = out.match(/Trace:\s*`(EXPL-[A-Z0-9]+)`/);
    assert.ok(traceMatch, `Expected EXPL bundle id in footer:\n${out}`);

    const res = await handleRmfV2Request(new Request(`https://www.dstrike.app/api/v2/rmf/explanations/${traceMatch[1]}`));
    assert.equal(res.status, 200);
    const json = (await res.json()) as {
      persistedInSql: boolean;
      replayVerification: { reproducible: boolean };
      bundle: { ruleEvaluations?: { controlId: string; verdict: string }[] };
    };
    assert.equal(json.persistedInSql, true);
    assert.equal(json.replayVerification.reproducible, true);
    assert.equal(json.bundle.ruleEvaluations?.length, 2);
  });
});
