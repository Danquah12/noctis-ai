import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RMF_V2_CAPABILITIES } from "./registry.ts";
import { verifyEvidenceRecord, evaluateControlFromObjectives } from "./evidence.ts";
import {
  transitionWorkflowState,
  resolveControlInheritance,
  evaluateTailoringProposal,
  generateOscalSspDraft,
  evaluatePoamClosure,
  evaluateAtoReadiness,
  computePolicyImpactDiff,
} from "./governance.ts";
import {
  buildTenantRmfGraph,
  queryTenantRmfGraph,
  createExplanationBundle,
  replayExplanationBundle,
} from "./graph-and-trace.ts";
import { executeAgentActionGuard, runIndependentAgentReview } from "./agents.ts";
import { handleRmfV2Request } from "./api-handler.server.ts";
import { sha256Sync } from "../universal-crypto.ts";

describe("Noctis RMF Intelligence Platform v2.0 — Enterprise Invariants & Acceptance Gates", () => {
  it("registers all 25 stable capability IDs (RMF-001..AI-025)", () => {
    assert.equal(RMF_V2_CAPABILITIES.length, 25);
    assert.equal(RMF_V2_CAPABILITIES[0]!.id, "RMF-001");
    assert.equal(RMF_V2_CAPABILITIES[24]!.id, "AI-025");
  });

  it("RMF-001 & Release Gate: blocks agent self-approval and AI ATO issuance", () => {
    const selfApprove = executeAgentActionGuard("ASSESSMENT_AGENT", "SELF_APPROVE_TASK", false);
    assert.equal(selfApprove.allowed, false);
    assert.equal(selfApprove.errorCode, "HUMAN_APPROVAL_REQUIRED");

    const aiAto = executeAgentActionGuard("AUTHORIZATION_AGENT", "ISSUE_ATO", false);
    assert.equal(aiAto.allowed, false);
    assert.equal(aiAto.errorCode, "HUMAN_APPROVAL_REQUIRED");

    const workflow = transitionWorkflowState({
      currentState: "DRAFT",
      nextState: "APPROVED", // illegal skip without review
      actorSubject: "isso-1",
      actorRole: "ISSO",
      reason: "Attempt shortcut",
    });
    assert.equal(workflow.transitioned, false);
    assert.equal(workflow.errorCode, "INVALID_WORKFLOW_TRANSITION");
  });

  it("RMF-002: generates OSCAL-compatible SSP draft anchored to verified DB SHA-256", () => {
    const ssp = generateOscalSspDraft({
      systemId: "11111111-1111-4111-8111-111111111111",
      systemName: "Mission Enclave Alpha",
      tenantId: "tenant-alpha",
      baseline: "HIGH",
      implementations: [
        { controlId: "AC-2", narrative: "Automated Okta SCIM termination webhook.", responsibility: "hybrid", evidenceIds: ["ev-1"] },
        { controlId: "AC-99", narrative: "Fake control must be dropped.", responsibility: "system_specific" },
      ],
    });
    assert.equal(ssp.oscalModel, "system-security-plan");
    assert.equal(ssp.validControlCount, 1);
    assert.match(ssp.documentSha256, /^[a-f0-9]{64}$/);
  });

  it("RMF-003: recalculates control inheritance when CSP provider inheritance changes and enforces cspPaGrantsSystemAto=false", () => {
    const before = resolveControlInheritance({
      systemId: "sys-1",
      baseline: "HIGH",
      providerName: "AWS GovCloud",
      inheritedControlIds: ["PE-1", "PE-2", "PE-3"],
      hybridControlIds: ["IA-2"],
    });
    const after = resolveControlInheritance({
      systemId: "sys-1",
      baseline: "HIGH",
      providerName: "AWS GovCloud",
      inheritedControlIds: ["PE-1", "PE-2", "PE-3", "MA-2", "MP-6"],
      hybridControlIds: ["IA-2"],
    });
    assert.equal(before.totalBaselineControls, 370);
    assert.equal(before.inheritedCount, 3);
    assert.equal(after.inheritedCount, 5);
    assert.equal(after.systemSpecificCount, before.systemSpecificCount - 2);
    assert.equal(after.cspPaGrantsSystemAto, false);
  });

  it("RMF-004: blocks unapproved tailoring changes (POLICY_NOT_APPROVED)", () => {
    const unapproved = evaluateTailoringProposal({
      proposalId: "TAIL-1",
      controlId: "AC-18",
      action: "EXCLUDE_SCOPING",
      rationale: "No wireless interfaces present",
      status: "SUBMITTED",
      approvedBy: null,
    });
    assert.equal(unapproved.applied, false);
    assert.equal(unapproved.errorCode, "POLICY_NOT_APPROVED");

    const approved = evaluateTailoringProposal({
      proposalId: "TAIL-1",
      controlId: "AC-18",
      action: "EXCLUDE_SCOPING",
      rationale: "No wireless interfaces present",
      status: "APPROVED",
      approvedBy: "ao-jane-doe",
    });
    assert.equal(approved.applied, true);
  });

  it("CYB-014 & RMF-006: quarantines evidence hash mismatch and blocks POA&M closure without verified evidence", () => {
    const payload = { scanId: "scan-123", openHigh: 0 };
    const goodHash = sha256Sync(JSON.stringify(payload));
    const tampered = verifyEvidenceRecord({
      evidenceId: "ev-tampered",
      tenantId: "tenant-a",
      controlId: "RA-5",
      origin: "scanner",
      collectedAt: new Date().toISOString(),
      claimedSha256: "0".repeat(64),
      payload,
    });
    assert.equal(tampered.status, "QUARANTINED");
    assert.equal(tampered.verified, false);
    assert.equal(tampered.canSatisfyObjective, false);
    assert.equal(tampered.errorCode, "EVIDENCE_HASH_MISMATCH");

    const blockedClosure = evaluatePoamClosure({
      poamId: "POAM-1",
      controlId: "RA-5",
      owner: "isso",
      remediationSummary: "Patched server",
      evidenceVerification: tampered,
    });
    assert.equal(blockedClosure.closed, false);
    assert.equal(blockedClosure.status, "OPEN");

    const validEv = verifyEvidenceRecord({
      evidenceId: "ev-valid",
      tenantId: "tenant-a",
      controlId: "RA-5",
      origin: "scanner",
      collectedAt: new Date().toISOString(),
      claimedSha256: goodHash,
      payload,
    });
    assert.equal(validEv.status, "AVAILABLE_FOR_ASSESSMENT");
    const closed = evaluatePoamClosure({
      poamId: "POAM-1",
      controlId: "RA-5",
      owner: "isso",
      remediationSummary: "Patched and rescanned cleanly",
      evidenceVerification: validEv,
    });
    assert.equal(closed.closed, true);
    assert.equal(closed.status, "CLOSED_VERIFIED");
  });

  it("CYB-015: one passing objective does NOT promote entire control to SATISFIED", () => {
    const agg = evaluateControlFromObjectives("AC-2", [
      { objectiveId: "AC-02a.[01]", outcome: "PASS", evidenceVerified: true },
      { objectiveId: "AC-02b.", outcome: "NOT_TESTED" },
      { objectiveId: "AC-02c.", outcome: "INSUFFICIENT_EVIDENCE" },
    ]);
    assert.equal(agg.overallStatus, "INCOMPLETE");
    assert.equal(agg.coveragePercent, 33);
  });

  it("RMF-007: ATO readiness returns NOT_READY on blockers and NEVER grants ATO even when package complete", () => {
    const notReady = evaluateAtoReadiness({
      system_id: "11111111-1111-4111-8111-111111111111",
      package_id: "22222222-2222-4222-8222-222222222222",
      missingEvidenceItems: [{ controlId: "AC-2", objectiveId: "AC-02j.[01]" }],
      openFindings: [{ findingId: "F-01", controlId: "RA-5" }],
    });
    assert.equal(notReady.status, "NOT_READY");
    assert.equal(notReady.authorization_decision, "NOT_MADE");
    assert.equal(notReady.package_complete, false);
    assert.equal(notReady.human_authorization_required, true);
    assert.equal(notReady.blocking_items.length, 2);

    const readyForReview = evaluateAtoReadiness({
      system_id: "11111111-1111-4111-8111-111111111111",
      package_id: "22222222-2222-4222-8222-222222222222",
    });
    assert.equal(readyForReview.status, "READY_FOR_AO_REVIEW");
    assert.equal(readyForReview.authorization_decision, "NOT_MADE");
    assert.equal(readyForReview.human_authorization_required, true);
  });

  it("AI-019, AI-020, AI-023, AI-025: enforces tenant isolation, independent agent review escalation, baseline diff, and replayable explanation trace", () => {
    const graph = buildTenantRmfGraph({
      tenantId: "tenant-alpha",
      systemId: "sys-1",
      systemName: "Alpha Enclave",
      baseline: "FEDRAMP_HIGH",
      controls: ["AC-2", "PE-2"],
      providerName: "AWS GovCloud",
    });
    const crossTenant = queryTenantRmfGraph({ graph, requestTenantId: "tenant-bravo" });
    assert.equal(crossTenant.allowed, false);
    assert.equal(crossTenant.errorCode, "CROSS_TENANT_ACCESS");

    const sameTenant = queryTenantRmfGraph({ graph, requestTenantId: "tenant-alpha" });
    assert.equal(sameTenant.allowed, true);
    assert.ok(sameTenant.nodes.length >= 4);

    const disagreement = runIndependentAgentReview({
      runId: "run-1",
      tenantId: "tenant-alpha",
      primaryAgent: "ASSESSMENT_AGENT",
      primaryVerdict: "PASS",
      primaryCitations: ["AC-2"],
      independentReviewVerdict: "FAIL",
      independentReviewViolations: ["Elapsed 31h > 24h threshold"],
    });
    assert.equal(disagreement.status, "ESCALATED_FOR_HUMAN_REVIEW");
    assert.equal(disagreement.disagreementDetected, true);

    const diff = computePolicyImpactDiff("LOW", "HIGH");
    assert.equal(diff.fromCount, 149);
    assert.equal(diff.toCount, 370);
    assert.equal(diff.addedCount, 221);

    const bundle = createExplanationBundle({
      tenantId: "tenant-alpha",
      evaluationRef: "AC-2",
      nistVersion: "5.2.0",
      dbSha256: "abc123",
      ruleId: "RMF-AC2-TERM-001",
      ruleVersion: "1.2.0",
      evidenceSha256: "def456",
      observedFacts: { elapsedHours: 31 },
      deterministicClassifications: ["FAIL (+7h over 24h threshold)"],
      analyticalEstimates: [],
      verdict: "FAIL",
    });
    const replayed = replayExplanationBundle(bundle);
    assert.equal(replayed.reproducible, true);
    assert.equal(replayed.recomputedHash, bundle.canonicalTraceHash);
  });

  it("API dispatcher /api/v2/rmf/* returns capabilities, ATO readiness, and blocks cross-tenant queries", async () => {
    const capRes = await handleRmfV2Request(new Request("https://www.dstrike.app/api/v2/rmf/capabilities"));
    assert.equal(capRes.status, 200);
    const capJson = (await capRes.json()) as { capabilitiesCount: number };
    assert.equal(capJson.capabilitiesCount, 25);

    const atoRes = await handleRmfV2Request(
      new Request("https://www.dstrike.app/api/v2/rmf/ato/readiness", {
        method: "POST",
        headers: { "content-type": "application/json", "x-correlation-id": "corr-test-1" },
        body: JSON.stringify({
          system_id: "11111111-1111-4111-8111-111111111111",
          package_id: "22222222-2222-4222-8222-222222222222",
          missing_evidence: [{ controlId: "AC-2", objectiveId: "AC-02j.[01]" }],
        }),
      }),
    );
    assert.equal(atoRes.status, 200);
    assert.equal(atoRes.headers.get("x-correlation-id"), "corr-test-1");
    const atoJson = (await atoRes.json()) as { status: string; authorization_decision: string };
    assert.equal(atoJson.status, "NOT_READY");
    assert.equal(atoJson.authorization_decision, "NOT_MADE");

    const crossRes = await handleRmfV2Request(
      new Request("https://www.dstrike.app/api/v2/rmf/graph/query", {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-id": "tenant:caller-a" },
        body: JSON.stringify({ graph_tenant_id: "tenant:caller-b" }),
      }),
    );
    assert.equal(crossRes.status, 403);
    const crossJson = (await crossRes.json()) as { errorCode: string };
    assert.equal(crossJson.errorCode, "CROSS_TENANT_ACCESS");
  });
});
