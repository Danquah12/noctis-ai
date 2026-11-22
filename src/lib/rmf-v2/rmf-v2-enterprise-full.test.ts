import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_COVERED_RULE_CONTROLS,
  evaluateAc6LeastPrivilegeRule,
  evaluateAt2TrainingRule,
  evaluateCp9BackupRule,
  evaluateIa5AuthenticatorRule,
  evaluateIr4IncidentRule,
  evaluateSc7BoundaryRule,
  evaluateSc13CryptoRule,
  evaluateSi4MonitoringRule,
  evaluateMa4Rule,
  evaluateMp6Rule,
  evaluatePe3Rule,
  evaluatePl2Rule,
  evaluatePm9Rule,
  evaluatePs3Rule,
  evaluatePt2Rule,
  evaluateSa11Rule,
  evaluateSc28Rule,
  evaluateSr3Rule,
  evaluateDodImpactLevelOverlay,
  evaluateCmmcSprsScore,
  extractAndEvaluateRmfRulesFromText,
} from "../noctis-rmf-rules.ts";
import {
  analyzeVulnerabilityIntelligence,
  analyzeAttackPaths,
  evaluateConfigurationCompliance,
  collectConnectorEvidence,
  forecastCyberRisk,
  evaluateSupplyChainSbom,
  evaluateZeroTrustMaturity,
  createEnterpriseRiskRegisterRecord,
} from "./cyber-intelligence.ts";
import {
  generateOscalSap,
  generateOscalSar,
  evaluateContinuousAtoStatus,
  resolveFrameworkCrosswalk,
  runDeterministicRmfSimulation,
  createExpertFeedbackRecord,
  approveExpertFeedbackRecord,
  exportApprovedFeedbackJsonl,
} from "./assessment-and-learning.ts";
import {
  saveRmfArtifact,
  listRmfArtifacts,
  updateRmfArtifactApproval,
  getRmfStorageStatus,
} from "./persistence.server.ts";
import { RMF_V2_CAPABILITIES } from "./registry.ts";
import { handleRmfV2Request } from "./api-handler.server.ts";

describe("Noctis RMF Intelligence Platform v2.0 — Phases 1–4 Enterprise Full Verification", () => {
  it("covers all 20 NIST SP 800-53 families across 28 rule evaluators + DoD IL2-IL6 + CMMC SPRS", () => {
    assert.ok(ALL_COVERED_RULE_CONTROLS.length >= 28);
    const coveredFamilies = new Set(ALL_COVERED_RULE_CONTROLS.map((c) => c.slice(0, 2)));
    assert.equal(coveredFamilies.size, 20, `expected all 20 families covered, got ${[...coveredFamilies].join(",")}`);

    assert.equal(evaluateAc6LeastPrivilegeRule({ standingGlobalAdmins: 2, jitPamEnforced: false }).verdict, "FAIL");
    assert.equal(evaluateAt2TrainingRule({ completionPercent: 98 }).verdict, "PASS");
    assert.equal(evaluateCp9BackupRule({ backupFrequencyHours: 12, lastRestoreTestDays: 400 }).verdict, "FAIL");
    assert.equal(evaluateIa5AuthenticatorRule({ maxSecretAgeDays: 45, hardcodedSecretsFound: false }).verdict, "PASS");
    assert.equal(evaluateIr4IncidentRule({ reportingHours: 4 }).verdict, "FAIL");
    assert.equal(evaluateSc7BoundaryRule({ defaultDenyEgress: false, unrestrictedPublicPorts: 2 }).verdict, "FAIL");
    assert.equal(evaluateSc13CryptoRule({ fips140Validated: false }).verdict, "FAIL");
    assert.equal(evaluateSi4MonitoringRule({ telemetryCoveragePercent: 85 }).verdict, "FAIL");

    assert.equal(evaluateMa4Rule(true).verdict, "PASS");
    assert.equal(evaluateMp6Rule(false).verdict, "FAIL");
    assert.equal(evaluatePe3Rule(true).verdict, "PASS");
    assert.equal(evaluatePl2Rule(400).verdict, "FAIL");
    assert.equal(evaluatePm9Rule(90, true).verdict, "PASS");
    assert.equal(evaluatePs3Rule(false).verdict, "FAIL");
    assert.equal(evaluatePt2Rule(true).verdict, "PASS");
    assert.equal(evaluateSa11Rule(false).verdict, "FAIL");
    assert.equal(evaluateSc28Rule(true).verdict, "PASS");
    assert.equal(evaluateSr3Rule(500).verdict, "FAIL");

    const nlMulti = extractAndEvaluateRmfRulesFromText(
      "Evaluate AC-6 with 3 standing admins and no JIT, SC-7 allowing 0.0.0.0/0, and SC-13 using non-FIPS modules.",
    );
    assert.equal(nlMulti.length, 3);

    const il5Fail = evaluateDodImpactLevelOverlay({
      impactLevel: "IL5",
      hostingEnvironment: "Commercial",
      sccaCompliant: false,
      usCitizenAdminsOnly: true,
    });
    assert.equal(il5Fail.verdict, "FAIL");
    assert.ok(il5Fail.violations.length >= 2);

    const sprsBlocked = evaluateCmmcSprsScore({
      failedControls: [
        { controlId: "3.5.3", weight: 5, onPoam: true },
        { controlId: "3.1.2", weight: 3, onPoam: true },
      ],
    });
    assert.equal(sprsBlocked.sprsScore, 102);
    assert.equal(sprsBlocked.conditionalCertificationEligible, false);

    const sprsAllowed = evaluateCmmcSprsScore({
      failedControls: [{ controlId: "3.1.22", weight: 1, onPoam: true }],
    });
    assert.equal(sprsAllowed.sprsScore, 109);
    assert.equal(sprsAllowed.conditionalCertificationEligible, true);
  });

  it("marks all 25 capabilities implemented and verifies CYB-011..CYB-018 & RMF-005..AI-022 contracts", async () => {
    assert.equal(RMF_V2_CAPABILITIES.length, 25);
    assert.ok(RMF_V2_CAPABILITIES.every((c) => c.status === "implemented"));

    const vuln = await analyzeVulnerabilityIntelligence({
      forceOfflineKev: true,
      findings: [
        { assetId: "vpn-1", cve: "CVE-2024-3400", severity: "CRITICAL", daysOpen: 21 },
        { assetId: "web-2", cve: "CVE-2023-4966", severity: "HIGH", daysOpen: 5 },
      ],
    });
    assert.equal(vuln.summary.kevMatches, 2);
    assert.equal(vuln.summary.overdueCount, 1);

    const ap = analyzeAttackPaths({
      nodes: [
        { id: "edge", label: "Edge", tier: "ENTRY" },
        { id: "db", label: "DB", tier: "CROWN_JEWEL" },
      ],
      edges: [
        { from: "edge", to: "db", techniqueId: "T1190", techniqueName: "Exploit", evidenceKind: "INFERRED" },
      ],
    });
    assert.equal(ap.pathsFound, 1);
    assert.equal(ap.pathsWithInferredHops, 1);
    assert.equal(ap.paths[0]!.confidenceClassification, "CONTAINS_INFERRED_EDGES");

    const stig = evaluateConfigurationCompliance({
      checks: [
        { ruleId: "V-1", title: "Root login", benchmark: "DISA_STIG", severityCategory: "CAT_I", status: "FAIL" },
      ],
    });
    assert.equal(stig.atoVetoTriggered, true);

    const connTamper = collectConnectorEvidence({
      connectorId: "aws-securityhub",
      tenantId: "t-a",
      controlId: "CM-6",
      scopeBoundary: "govcloud",
      claimedSha256: "f".repeat(64),
      samplePayload: { drifted: 1 },
    });
    assert.equal(connTamper.verification.status, "QUARANTINED");

    const fc = forecastCyberRisk({ openKevCount: 2, openHighCount: 8 });
    assert.equal(fc.classification, "ANALYTICAL_ESTIMATE");
    assert.equal(fc.horizons.length, 4);

    const sbom = evaluateSupplyChainSbom({
      sbom: {
        components: [{ name: "log4j-core", version: "2.14.1" }],
      },
    });
    assert.equal(sbom.verdict, "FAIL");
    assert.ok(sbom.flaggedComponents.some((f) => f.severity === "CRITICAL"));

    const zt = evaluateZeroTrustMaturity({
      identityScore: 4,
      devicesScore: 3,
      networksScore: 2,
      applicationsScore: 3,
      dataScore: 2,
    });
    assert.equal(zt.pillars.length, 5);
    assert.equal(zt.weakestPillar, "Networks");

    const risk = createEnterpriseRiskRegisterRecord({
      tenantId: "t-a",
      systemId: "sys-1",
      title: "Mission risk",
      inherentLikelihood: 4,
      inherentImpact: 5,
      treatmentStrategy: "PROPOSE_ACCEPTANCE",
    });
    assert.equal(risk.aiCanAcceptRisk, false);
    assert.equal(risk.aoAcceptanceRequired, true);
    assert.equal(risk.approvalState, "PENDING_AO_ACCEPTANCE");

    const sap = generateOscalSap({ systemId: "sys-1", systemName: "Sys", tenantId: "t-a", controlIds: ["AC-2", "AU-6"] });
    assert.equal(sap.controlsPlanned, 2);
    const sar = generateOscalSar({
      systemId: "sys-1",
      systemName: "Sys",
      tenantId: "t-a",
      observations: [{ controlId: "AC-2", objectiveId: "AC-02[01]", verdict: "OTHER_THAN_SATISFIED", severity: "CAT_I", observation: "Gap" }],
    });
    assert.equal(sar.summary.authorizationDecision, "PENDING_AO_SIGNATURE");

    const cato = evaluateContinuousAtoStatus({
      systemId: "sys-1",
      vulnScanAgeDays: 10,
      overdueKevCount: 1,
      overdueHighPoamCount: 0,
      stigCompliancePercent: 95,
      siemTelemetryActive: true,
      significantBoundaryChangePending: false,
    });
    assert.equal(cato.status, "REASSESSMENT_REQUIRED");
    assert.equal(cato.aiCanGrantOrRevokeAto, false);

    const xwalk = resolveFrameworkCrosswalk("AC-2");
    assert.ok(xwalk.iso27001_2022.length >= 1);
    assert.ok(xwalk.cisControlsV8.length >= 1);

    const sim = runDeterministicRmfSimulation();
    assert.equal(sim.allPassed, true);
    assert.equal(sim.passedCount, 10);

    const pendingFb = createExpertFeedbackRecord({
      tenantId: "t-a",
      controlId: "AC-2",
      prompt: "Test prompt",
      preferredResponse: "Approved response",
      rejectedResponse: "Bad response",
      rationale: "Correct ODP",
      submittedBy: "isso-1",
    });
    assert.equal(exportApprovedFeedbackJsonl([pendingFb], "sft").count, 0);
    const approvedFb = approveExpertFeedbackRecord(pendingFb, "sca-1", "APPROVED");
    assert.equal(exportApprovedFeedbackJsonl([approvedFb], "sft").count, 1);
    assert.equal(exportApprovedFeedbackJsonl([approvedFb], "dpo").count, 1);
  });

  it("persists tenant-scoped artifacts to SQL with hash-chained ledger and serves all new /api/v2/rmf/* endpoints", async () => {
    const saved = await saveRmfArtifact({
      tenantId: "tenant:persist-a",
      artifactType: "SSP",
      systemId: "sys-persist",
      title: "Test SSP",
      payload: { hello: "world" },
      createdBy: "actor-a",
    });
    assert.match(saved.ledgerEventHash, /^[a-f0-9]{64}$/);

    const listA = await listRmfArtifacts("tenant:persist-a", "SSP");
    const listB = await listRmfArtifacts("tenant:persist-b", "SSP");
    assert.ok(listA.some((a) => a.id === saved.artifact.id));
    assert.equal(listB.length, 0);

    const approved = await updateRmfArtifactApproval("tenant:persist-a", saved.artifact.id, "APPROVED", "issm-a");
    assert.equal(approved?.artifact.status, "APPROVED");

    const st = await getRmfStorageStatus("tenant:persist-a");
    assert.equal(st.runtimeReady, true);
    assert.ok(st.auditLedgerCount >= 2);

    const catRes = await handleRmfV2Request(new Request("https://www.dstrike.app/api/v2/rmf/rules/catalog"));
    assert.equal(catRes.status, 200);
    const catJson = (await catRes.json()) as { familiesCoveredCount: number; totalRules: number };
    assert.equal(catJson.familiesCoveredCount, 20);
    assert.ok(catJson.totalRules >= 28);

    const simRes = await handleRmfV2Request(
      new Request("https://www.dstrike.app/api/v2/rmf/simulator/run", { method: "POST", body: "{}" }),
    );
    assert.equal(simRes.status, 200);
    const simJson = (await simRes.json()) as { allPassed: boolean; passedCount: number };
    assert.equal(simJson.allPassed, true);

    const exportRes = await handleRmfV2Request(new Request("https://www.dstrike.app/api/v2/rmf/training/export?format=sft"));
    assert.equal(exportRes.status, 200);
    const jsonlText = await exportRes.text();
    assert.ok(jsonlText.includes("authoritative-nist-5.2.0"));
  });
});
