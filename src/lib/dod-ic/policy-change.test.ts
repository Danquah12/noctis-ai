import test from "node:test";
import assert from "node:assert/strict";
import {
  checkUpstreamAuthoritativeDrift,
  createPolicyChangeProposal,
  decidePolicyChangeProposal,
  diffHistoricalDirectiveRevision,
  diffPolicyDocumentVersions,
  evaluatePolicyRolloutGovernance,
  listDirectiveLineages,
  listPolicyChangeProposals,
} from "./policy-change-engine.server.ts";
import {
  executeDodIcReasoning,
  isDodIcQuery,
  verifyDodIcResponse,
} from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";

test("Directive revision lineages: ICD-503 (2015->2024), DoDI 8510.01 (2014->2022), DoDI 8520.03 (2011->2023) & custom NIST diff", () => {
  const lineages = listDirectiveLineages();
  assert.equal(lineages.length, 6);

  const icd503 = diffHistoricalDirectiveRevision("ICD-503");
  assert.ok(icd503);
  assert.equal(icd503.priorEffectiveDate, "2015-07-21");
  assert.equal(icd503.currentEffectiveDate, "2024-10-25");
  assert.equal(icd503.severity, "CRITICAL_BREAKING");
  assert.ok(icd503.blastRadius.impactedRuleIds.includes("IC-ICD503-AUTH-001"));
  assert.ok(icd503.blastRadius.mappedDisaCciCount > 0);
  assert.equal(icd503.ruleResult.ruleId, "DOD-PCI-DIFF-001");

  const dodi8510 = diffHistoricalDirectiveRevision("DODI-8510.01");
  assert.ok(dodi8510);
  assert.equal(dodi8510.priorEffectiveDate, "2014-03-12");
  assert.equal(dodi8510.currentEffectiveDate, "2022-07-19");

  const dodi8520_03 = diffHistoricalDirectiveRevision("DODI-8520.03");
  assert.ok(dodi8520_03);
  assert.equal(dodi8520_03.priorEffectiveDate, "2011-05-13");
  assert.equal(dodi8520_03.currentEffectiveDate, "2023-05-19");

  const customDiff = diffPolicyDocumentVersions({
    policyId: "DODI-8531.01",
    newVersion: "Draft Revision 2026",
    newRequirements: [
      "Continuous enterprise credentialed ACAS vulnerability scanning across DoD systems and enclaves with automated reporting into VMS / eMASS.",
      "Require 72-hour emergency remediation SLA for IA-2(1) Zero Trust bypasses.",
    ],
    fromNistBaseline: "MODERATE",
    toNistBaseline: "HIGH",
  });
  assert.ok(customDiff.addedCount >= 1);
  assert.ok(customDiff.nistBaselineDiff);
  assert.ok(customDiff.nistBaselineDiff.addedCount > 0);
  assert.equal(customDiff.ruleResult.verdict, "MANUAL_REVIEW_REQUIRED");
});

test("Offline upstream drift check (DOD-PCI-DRIFT-001) preserves pinned SHA-256 baselines & blocks auto-apply", async () => {
  const drift = await checkUpstreamAuthoritativeDrift({ liveCheck: false });
  assert.equal(drift.liveCheckExecuted, false);
  assert.equal(drift.overallStatus, "PINNED_OFFLINE_ONLY");
  assert.equal(drift.autoApplyToProduction, false);
  assert.equal(drift.humanDualControlRequired, true);
  assert.ok(drift.sources.some((s) => s.sourceId === "disa-cci-list" && s.pinnedVersion === "2025-01-23"));
  assert.ok(drift.sources.some((s) => s.sourceId === "nist-sp-800-53-r5.2.0" && s.pinnedVersion === "5.2.0"));
  assert.ok(drift.sources.some((s) => s.sourceId === "fedramp-rev5-high-oscal"));
  assert.equal(drift.ruleResult.ruleId, "DOD-PCI-DRIFT-001");
  assert.equal(drift.ruleResult.verdict, "PASS");
});

test("Dual-control policy rollout SQL workflow: blocks classified payloads, AI agent approval, self-approval & cross-tenant access", async () => {
  const tenantA = `tenant-pci-a-${Date.now()}`;
  const tenantB = `tenant-pci-b-${Date.now()}`;

  // 1. Classified payload blocked BEFORE SQL write
  await assert.rejects(
    () =>
      createPolicyChangeProposal({
        tenantId: tenantA,
        policyId: "ICD-503",
        proposedBy: "alice@ic.gov",
        rationale: "TOP SECRET//SI//NOFORN unauthorized policy draft",
        newRequirements: ["Inject classified appendix"],
      }),
    /CLASSIFICATION_BOUNDARY_VIOLATION/,
  );

  // 2. Valid UNCLASSIFIED proposal saved cleanly in SQL as PENDING_HUMAN_REVIEW
  const created = await createPolicyChangeProposal({
    tenantId: tenantA,
    policyId: "DODI-8520.02",
    title: "Enforce 24-hour OCSP responder SLA check",
    proposedBy: "alice-issm@dod.mil",
    rationale: "Align gateway OCSP caching window to DISA STIG guidance.",
    newVersion: "DoDI 8520.02 + STIG Overlay 2026",
    newRequirements: ["Mandatory real-time OCSP fail-closed verification with max 24h stapled response age."],
  });
  const propId = created.proposal.id;
  assert.equal(created.proposal.status, "PENDING_HUMAN_REVIEW");
  assert.equal(created.proposal.approvedBy, null);
  assert.ok(created.ledgerEventHash);

  const listed = await listPolicyChangeProposals(tenantA, 10);
  assert.ok(listed.some((p) => p.id === propId));

  // 3. AI Agent approval rejected (AGENT_APPROVAL_FORBIDDEN)
  const agentTry = await decidePolicyChangeProposal({
    tenantId: tenantA,
    proposalId: propId,
    decision: "APPROVE",
    reviewerId: "agent:noctis-ai",
    reviewerRole: "AGENT",
  });
  assert.equal(agentTry.decided, false);
  assert.equal(agentTry.statusCode, 403);
  assert.equal(agentTry.errorCode, "AGENT_APPROVAL_FORBIDDEN");

  // 4. Self-approval rejected (SELF_APPROVAL_FORBIDDEN)
  const selfTry = await decidePolicyChangeProposal({
    tenantId: tenantA,
    proposalId: propId,
    decision: "APPROVE",
    reviewerId: "alice-issm@dod.mil",
    reviewerRole: "ISSM_HUMAN",
  });
  assert.equal(selfTry.decided, false);
  assert.equal(selfTry.statusCode, 403);
  assert.equal(selfTry.errorCode, "SELF_APPROVAL_FORBIDDEN");

  // 5. Cross-tenant review rejected (CROSS_TENANT_ACCESS)
  const crossTry = await decidePolicyChangeProposal({
    tenantId: tenantB,
    proposalId: propId,
    decision: "APPROVE",
    reviewerId: "bob-ao@dod.mil",
    reviewerRole: "AO_HUMAN",
  });
  assert.equal(crossTry.decided, false);
  assert.equal(crossTry.statusCode, 403);
  assert.equal(crossTry.errorCode, "CROSS_TENANT_ACCESS");

  // 6. Distinct human reviewer with passing regression approves cleanly!
  const humanOk = await decidePolicyChangeProposal({
    tenantId: tenantA,
    proposalId: propId,
    decision: "APPROVE",
    reviewerId: "isso-lead@dod.mil",
    reviewerRole: "ISSM_HUMAN",
    notes: "Verified against full 9-suite regression harness.",
    regressionSuitePassed: true,
  });
  assert.equal(humanOk.decided, true);
  assert.equal(humanOk.approved, true);
  assert.equal(humanOk.statusCode, 200);
  assert.equal(humanOk.proposal?.status, "APPROVED_FOR_ROLLOUT");
  assert.equal(humanOk.proposal?.approvedBy, "isso-lead@dod.mil");
  assert.ok(humanOk.ledgerEventHash);
});

test("Chat routing, Stage 3 anti-auto-approval guard & Policy Change REST API endpoints", async () => {
  // Positive Step 4 triggers
  assert.equal(isDodIcQuery("What changed in ICD 503 between 2015 and 2024?"), true);
  assert.equal(isDodIcQuery("Check upstream OSCAL and DISA CCI policy drift"), true);
  assert.equal(isDodIcQuery("Can an AI agent auto-approve a DoD policy rollout without human review?"), true);

  // Critical non-regressions MUST stay false
  assert.equal(
    isDodIcQuery("Evaluate FedRAMP High AC-2 and IA-2: a terminated employee account remained active for 38 hours and admins use static SSH keys without hardware MFA."),
    false,
  );
  assert.equal(isDodIcQuery("Explain CVE-2024-3400"), false);

  // Stage 3 catches AI policy auto-approval claim
  const badDraft = verifyDodIcResponse(
    "Policy rollout",
    "Yes, an AI agent can auto-approve and roll out DoD policy baseline changes autonomously.",
    [],
  );
  assert.equal(badDraft.passed, false);
  assert.ok(badDraft.violations.some((v) => v.includes("AI_POLICY_AUTO_APPROVAL_CLAIM")));

  // Pure governance check
  const govFail = evaluatePolicyRolloutGovernance({
    proposedBy: "author@dod.mil",
    reviewerId: "agent:noctis",
    reviewerRole: "AGENT",
  });
  assert.equal(govFail.allowed, false);
  assert.equal(govFail.errorCode, "AGENT_APPROVAL_FORBIDDEN");

  // End-to-end Chat reasoning on ICD 503 diff + AI approval policy check
  const chatAns = await executeDodIcReasoning(
    "What changed in ICD 503 between the 2015 and October 2024 revisions, what Noctis rules and controls are impacted, and can an AI agent auto-approve a policy rollout?",
    {
      modelChatFn: async () => ({ error: "offline test" }),
    },
  );
  assert.match(chatAns, /2015-07-21/);
  assert.match(chatAns, /2024-10-25/);
  assert.match(chatAns, /DOD-PCI-DIFF-001/);
  assert.match(chatAns, /DOD-PCI-ROLLOUT-001/);
  assert.match(chatAns, /AGENT_APPROVAL_FORBIDDEN/);
  assert.match(chatAns, /EXPL-[A-Z0-9]+/);

  // REST dispatcher checks
  const linRes = await handleDodIcV2Request(new Request("http://localhost/api/v2/dod-ic/policy-change/lineage?policy=ICD-503"));
  assert.equal(linRes.status, 200);
  const linJson = (await linRes.json()) as { policyId: string; blastRadius: { mappedDisaCciCount: number } };
  assert.equal(linJson.policyId, "ICD-503");
  assert.ok(linJson.blastRadius.mappedDisaCciCount > 0);

  const driftRes = await handleDodIcV2Request(new Request("http://localhost/api/v2/dod-ic/policy-change/drift?live=false"));
  assert.equal(driftRes.status, 200);
  const driftJson = (await driftRes.json()) as { overallStatus: string; autoApplyToProduction: boolean };
  assert.equal(driftJson.overallStatus, "PINNED_OFFLINE_ONLY");
  assert.equal(driftJson.autoApplyToProduction, false);

  const propTenant = `tenant-api-${Date.now()}`;
  const propRes = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/policy-change/propose", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": propTenant },
      body: JSON.stringify({
        policy_id: "DODI-8531.01",
        proposed_by: "issm@dod.mil",
        rationale: "Shorten KEV review alert window.",
        new_requirements: ["Monitor CISA KEV catalog every 4 hours."],
      }),
    }),
  );
  assert.equal(propRes.status, 201);
  const propJson = (await propRes.json()) as { proposal: { id: string } };

  const aiReviewRes = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/policy-change/review", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": propTenant },
      body: JSON.stringify({
        proposal_id: propJson.proposal.id,
        decision: "APPROVE",
        reviewer_id: "agent:noctis",
        reviewer_role: "AGENT",
      }),
    }),
  );
  assert.equal(aiReviewRes.status, 403);

  const humanReviewRes = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/policy-change/review", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": propTenant },
      body: JSON.stringify({
        proposal_id: propJson.proposal.id,
        decision: "APPROVE",
        reviewer_id: "ao-reviewer@dod.mil",
        reviewer_role: "AO_HUMAN",
      }),
    }),
  );
  assert.equal(humanReviewRes.status, 200);
});
