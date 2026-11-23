import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDcoSocDetectionCoverage,
  evaluateDigitalForensicsChainOfCustody,
  evaluateInsiderThreatProgram,
} from "./dco-forensics-engine.ts";
import {
  evaluateDevSecOpsCatoAndSsdf,
  evaluateDodCloudSrgInheritance,
  evaluateKubernetesAndContainerHardening,
} from "./devsecops-cloud-engine.ts";
import {
  evaluateAiAdversarialRedTeam,
  evaluateDefenseAiGovernanceAndRai,
} from "./defense-ai-governance-engine.ts";
import { executeDodIcReasoning, verifyDodIcResponse } from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";

test("DCO, NIST SP 800-86 Forensics & DoDI 5205.16 Insider Threat enforce telemetry & chain-of-custody invariants", () => {
  const blindDco = evaluateDcoSocDetectionCoverage({
    edrTelemetryPresent: false,
    dnsLogsPresent: false,
    siemCorrelationActive: true,
    claimsNoIntrusionOccurred: true,
  });
  assert.equal(blindDco.ruleResult.verdict, "FAIL");
  assert.equal(blindDco.claimBlockedMissingTelemetry, true);

  const wipedForensics = evaluateDigitalForensicsChainOfCustody({
    hostWipedOrReimagedBeforeAcquisition: true,
    volatileMemoryCapturedBeforeReboot: false,
  });
  assert.equal(wipedForensics.ruleResult.verdict, "FAIL");
  assert.equal(wipedForensics.evidenceIntegrityPreserved, false);

  const insiderOk = evaluateInsiderThreatProgram({
    insiderThreatHubActive: true,
    classifiedNetworkUamEnabled: true,
    legalAndPrivacyOversightActive: true,
    humanAdjudicationRequired: true,
  });
  assert.equal(insiderOk.ruleResult.verdict, "PASS");
});

test("DevSecOps cATO/SSDF, K8s STIG & CC SRG Cloud Inheritance block one-time cATO, privileged pods & CSP PA != Mission ATO", () => {
  const badCato = evaluateDevSecOpsCatoAndSsdf({
    sastPassed: true,
    sbomGeneratedAndScanned: true,
    continuousRuntimeMonitoringActive: false,
  });
  assert.equal(badCato.ruleResult.verdict, "FAIL");
  assert.equal(badCato.catoEligible, false);

  const badK8s = evaluateKubernetesAndContainerHardening({
    privilegedContainersPresent: true,
    runningAsRootUid0: true,
  });
  assert.equal(badK8s.ruleResult.verdict, "FAIL");
  assert.equal(badK8s.hardenedCompliant, false);

  const badCloud = evaluateDodCloudSrgInheritance({
    impactLevel: "IL5",
    cspProvisionalAuthActive: true,
    missionOwnerWorkloadAtoIssued: false,
    sccaComponentsEnforced: false,
  });
  assert.equal(badCloud.ruleResult.verdict, "FAIL");
  assert.equal(badCloud.cspPaEqualsMissionAto, false);
});

test("Defense AI RAI / DoDD 3000.09 & OWASP Red Team block unsupervised lethal systems and agent approvals", () => {
  const lethalNoHuman = evaluateDefenseAiGovernanceAndRai({
    isLethalOrWeaponSystem: true,
    appropriateHumanJudgmentEnforced: false,
    seniorReviewCompleted: false,
  });
  assert.equal(lethalNoHuman.ruleResult.verdict, "FAIL");
  assert.equal(lethalNoHuman.dodd300009HumanJudgmentSatisfied, false);

  const redFail = evaluateAiAdversarialRedTeam({
    promptInjectionDefensesTested: true,
    agentAutonomousApprovalBlocked: false,
    adversarialRedTeamPassRatePercent: 88,
  });
  assert.equal(redFail.ruleResult.verdict, "FAIL");
  assert.equal(redFail.redTeamGatePassed, false);
});

test("Stage 3 verifier, Chat reasoning & REST routes for DCO, DevSecOps/CC SRG & DoDD 3000.09", async () => {
  const badPa = verifyDodIcResponse("CC SRG", "CSP PA automatically grants the DoD Mission Owner ATO at IL5.", []);
  assert.equal(badPa.passed, false);
  assert.ok(badPa.violations.some((v) => v.includes("CSP_PA_EQUALS_MISSION_ATO_CLAIM")));

  const badLethal = verifyDodIcResponse("DoDD 3000.09", "An unsupervised autonomous lethal weapon is permitted without human judgment.", []);
  assert.equal(badLethal.passed, false);
  assert.ok(badLethal.violations.some((v) => v.includes("UNSUPERVISED_AUTONOMOUS_LETHAL_CLAIM")));

  const chatAns = await executeDodIcReasoning(
    "We have an IL5 workload with CSP PA active but no Mission Owner ATO and no SCCA, plus a DoDD 3000.09 autonomous weapon system removing human judgment without Senior Review.",
    { modelChatFn: async () => ({ error: "offline test" }), persistTrace: false },
  );
  assert.match(chatAns, /DOD-CCSRG-INHERIT-001/);
  assert.match(chatAns, /DOD-AI-RAI-001/);
  assert.match(chatAns, /FAIL/);

  const restRai = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/ai/rai-governance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        is_lethal_weapon: true,
        human_judgment_enforced: false,
        senior_review_completed: false,
      }),
    }),
  );
  assert.equal(restRai.status, 200);
  const raiJson = (await restRai.json()) as { ruleResult: { verdict: string } };
  assert.equal(raiJson.ruleResult.verdict, "FAIL");
});
