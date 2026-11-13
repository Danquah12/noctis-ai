import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateRmfPrepareStep,
  evaluateFips199SecurityCategorization,
  evaluateControlBaselineSelection,
  evaluateSspImplementationReadiness,
  evaluateSecurityControlAssessment,
  evaluateAuthorizationDecisionPackage,
  evaluateContinuousMonitoringAndPoam,
  generateAllRmfScenarios,
  handleNaturalRmfGrcQuery,
  isRmfGrcQuery,
} from "./noctis-rmf-engine.ts";

describe("NOCTIS-RMF-MASTER-001: Risk Management Framework (RMF) Lifecycle Engine", () => {
  it("Step 0 (Prepare): Enforces role independence and identifies conflicts of interest", () => {
    const valid = evaluateRmfPrepareStep({
      systemName: "Core-GovCloud-Enclave",
      authorizingOfficialAssigned: true,
      issoAssigned: true,
      issmAssigned: true,
      securityControlAssessorIndependent: true,
      systemBoundaryDefined: true,
      hardwareSoftwareInventoryComplete: true,
      riskToleranceDocumented: true,
    });
    assert.equal(valid.passed, true);
    assert.equal(valid.safetyVetoes.length, 0);
    assert.equal(valid.preparednessScorePercent, 100);

    const conflicted = evaluateRmfPrepareStep({
      systemName: "Core-GovCloud-Enclave",
      authorizingOfficialAssigned: true,
      issoAssigned: true,
      issmAssigned: true,
      securityControlAssessorIndependent: false, // Conflict of interest
      systemBoundaryDefined: true,
      hardwareSoftwareInventoryComplete: true,
      riskToleranceDocumented: true,
    });
    assert.equal(conflicted.passed, false);
    assert.ok(conflicted.safetyVetoes.some((v) => v.includes("CONFLICT_OF_INTEREST_VETO")));
  });

  it("Step 1 (Categorize): Calculates FIPS 199 High-Water Mark and enforces CNSSI 1253 for ITAR", () => {
    const fips199 = evaluateFips199SecurityCategorization({
      systemName: "Defense-Telemetry-Enclave",
      confidentialityImpact: "MODERATE",
      integrityImpact: "HIGH",
      availabilityImpact: "LOW",
      informationTypes: ["CUI_SPECIFIED"],
      isNationalSecuritySystem: false,
    });
    assert.equal(fips199.passed, true);
    assert.equal(fips199.overallImpact, "HIGH"); // Max(Moderate, High, Low) = HIGH
    assert.equal(fips199.governingStandard, "FIPS 199 / FIPS 200");

    const itarViolation = evaluateFips199SecurityCategorization({
      systemName: "Missile-Guidance-Simulator",
      confidentialityImpact: "LOW", // Invalid for ITAR
      integrityImpact: "HIGH",
      availabilityImpact: "MODERATE",
      informationTypes: ["ITAR_TECHNICAL_DATA"],
      isNationalSecuritySystem: true,
    });
    assert.equal(itarViolation.passed, false);
    assert.ok(itarViolation.safetyVetoes.some((v) => v.includes("FIPS_199_CATEGORIZATION_ERROR")));
  });

  it("Step 2 (Select): Allocates NIST SP 800-53B baselines and partitions CSP common controls", () => {
    const fedrampHigh = evaluateControlBaselineSelection({
      overallImpact: "HIGH",
      cloudDeploymentModel: "IaaS",
      targetEnvironment: "FedRAMP",
      commonControlsInheritedFromCsp: ["PE-1", "PE-2", "PE-3", "MA-1", "MA-2"],
    });
    assert.equal(fedrampHigh.baselineName, "FedRAMP Rev. 5 HIGH Baseline");
    assert.ok(fedrampHigh.totalControlsEstimated > 400);
    assert.equal(fedrampHigh.inheritedControlsCount, 5);
    assert.equal(
      fedrampHigh.customerResponsibilityControlsCount,
      fedrampHigh.totalControlsEstimated - 5
    );
  });

  it("Step 3 (Implement): Detects placeholder 'TBD' statements in SSP", () => {
    const sspWithTbd = evaluateSspImplementationReadiness({
      implementedControlsCount: 250,
      totalRequiredControlsCount: 262,
      hasPlaceholderOrTbdStatements: true,
      oscalSchemaValidated: true,
      stigComplianceRatePercent: 95,
    });
    assert.equal(sspWithTbd.passed, false);
    assert.ok(sspWithTbd.safetyVetoes.some((v) => v.includes("CRITICAL_SSP_VETO")));
  });

  it("Step 4 (Assess): Enforces Examine/Interview/Test trinity under NIST SP 800-53A Rev. 5", () => {
    const fullSca = evaluateSecurityControlAssessment({
      examineMethodExecuted: true,
      interviewMethodExecuted: true,
      testMethodExecuted: true,
      criticalVulnerabilitiesCount: 0,
      highVulnerabilitiesCount: 0,
      penetrationTestingCompleted: true,
    });
    assert.equal(fullSca.passed, true);
    assert.equal(fullSca.sarRecommendation, "RECOMMEND_ATO");

    const partialSca = evaluateSecurityControlAssessment({
      examineMethodExecuted: true,
      interviewMethodExecuted: false, // Skipped interview
      testMethodExecuted: true,
      criticalVulnerabilitiesCount: 0,
      highVulnerabilitiesCount: 0,
      penetrationTestingCompleted: true,
    });
    assert.equal(partialSca.passed, false);
    assert.ok(partialSca.safetyVetoes.some((v) => v.includes("ASSESSMENT_INCOMPLETE_VETO")));
  });

  it("Step 5 (Authorize): Validates Continuous ATO (cATO) 3-pillar criteria", () => {
    const validCato = evaluateAuthorizationDecisionPackage({
      hasSsp: true,
      hasSar: true,
      hasPoam: true,
      hasContingencyPlanAndTest: true,
      openCriticalPoamCount: 0,
      openHighPoamCount: 0,
      isContinuousAtoRequested: true,
      automatedDevSecOpsPipelineActive: true,
      continuousMonitoringTelemetryActive: true,
      csspServiceLevelAgreementActive: true,
    });
    assert.equal(validCato.passed, true);
    assert.equal(validCato.authorizationDecision, "CATO");

    const missingPipelineCato = evaluateAuthorizationDecisionPackage({
      hasSsp: true,
      hasSar: true,
      hasPoam: true,
      hasContingencyPlanAndTest: true,
      openCriticalPoamCount: 0,
      openHighPoamCount: 0,
      isContinuousAtoRequested: true,
      automatedDevSecOpsPipelineActive: false, // Missing automated DevSecOps gate
      continuousMonitoringTelemetryActive: true,
      csspServiceLevelAgreementActive: true,
    });
    assert.equal(missingPipelineCato.authorizationDecision, "ATO_WITH_CONDITIONS");
    assert.ok(missingPipelineCato.safetyVetoes.some((v) => v.includes("cATO_CRITERIA_UNMET")));
  });

  it("Step 6 (Monitor): Enforces strict POA&M statutory SLAs and prohibits paper closure", () => {
    const monitor = evaluateContinuousMonitoringAndPoam({
      vulnerabilityScanFrequencyDays: 14,
      poamItems: [
        {
          id: "POAM-2026-001",
          severity: "HIGH",
          daysOpen: 45, // Exceeds 30-day SLA
          hasTechnicalRemediationProof: false, // Paper closure attempted
        },
      ],
    });
    assert.equal(monitor.passed, false);
    assert.equal(monitor.slaBreachesCount, 1);
    assert.equal(monitor.paperClosuresVetoedCount, 1);
    assert.ok(monitor.safetyVetoes.some((v) => v.includes("POA&M_SLA_BREACH")));
    assert.ok(monitor.safetyVetoes.some((v) => v.includes("NON_PAPER_CLOSURE_VETO")));
  });

  it("Executes all 25 deterministic RMF scenarios across all 7 steps with deterministic invariant results", () => {
    const scenarios = generateAllRmfScenarios();
    assert.equal(scenarios.length, 25);
    for (const scn of scenarios) {
      const res = scn.execute();
      assert.ok(typeof res.passed === "boolean");
      if (!res.passed) {
        assert.ok(res.safetyVetoes.length > 0, `Scenario ${scn.id} failed without safety veto explanation`);
      }
    }
  });

  it("Routes natural queries regarding RMF, FedRAMP, and DoD Impact Levels", () => {
    assert.equal(isRmfGrcQuery("What is the difference between DoD IL4 and IL5 under DISA CC SRG?"), true);
    assert.equal(isRmfGrcQuery("Explain FedRAMP High 3PAO testing methodology for Kubernetes"), true);
    const resp = handleNaturalRmfGrcQuery("What is the difference between DoD IL4 and IL5 under DISA CC SRG?");
    assert.ok(resp);
    assert.match(resp, /NOCTIS-RMF-001/);
    assert.match(resp, /IL4.*IL5/);
    assert.match(resp, /SCCA/);
  });
});
