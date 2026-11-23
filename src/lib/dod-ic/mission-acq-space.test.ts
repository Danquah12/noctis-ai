import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAcquisitionCmmcAndFoci,
  evaluateDigitalEngineeringSpaceSpectrum,
  evaluateMissionAssuranceDag,
} from "./mission-acquisition-space-engine.ts";
import { executeDodIcReasoning, isDodIcQuery } from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";

test("Mission Assurance DAG detects unmitigated critical SPOF & computes exact blast radius", () => {
  const spof = evaluateMissionAssuranceDag({
    mefs: [
      { id: "MEF-1", name: "Strategic C2", critical: true },
      { id: "MEF-2", name: "ISR Relay", critical: false },
    ],
    assets: [
      { id: "PWR-1", name: "Substation Alpha", redundant: false },
      { id: "NET-1", name: "DualSAT Gateway", redundant: true },
    ],
    dependencies: [
      { fromId: "MEF-1", toId: "PWR-1" },
      { fromId: "MEF-2", toId: "PWR-1" },
      { fromId: "MEF-1", toId: "NET-1" },
    ],
  });
  assert.equal(spof.ruleResult.verdict, "FAIL");
  assert.equal(spof.spofs.length, 1);
  assert.equal(spof.spofs[0]!.assetId, "PWR-1");
  assert.equal(spof.spofs[0]!.blastRadiusPercent, 100);
  assert.equal(spof.hasCycle, false);
});

test("CMMC 32 CFR Part 170 180-day POA&M limit, DFARS 7012 72h reporting & 32 CFR Part 117 FOCI rules", () => {
  const acqFail = evaluateAcquisitionCmmcAndFoci({
    cmmcLevel: "LEVEL_2_C3PAO",
    nist800171PercentMet: 85,
    poamCloseoutDays: 210,
    dfars7012IncidentReportedHours: 96,
    hasForeignOwnershipOrControl: true,
    fociMitigationInstrument: "NONE",
  });
  assert.equal(acqFail.ruleResult.verdict, "FAIL");
  assert.equal(acqFail.cmmcConditionalPoamEligible, false);

  const acqPass = evaluateAcquisitionCmmcAndFoci({
    cmmcLevel: "LEVEL_2_C3PAO",
    nist800171PercentMet: 90,
    poamCloseoutDays: 120,
    fivePointControlsMissing: false,
    dfars7012CloudFedrampModEquiv: true,
    dfars7012IncidentReportedHours: 24,
    sprsSubmitted: true,
    hasForeignOwnershipOrControl: true,
    fociMitigationInstrument: "SSA",
  });
  assert.equal(acqPass.ruleResult.verdict, "PASS");
  assert.equal(acqPass.cmmcConditionalPoamEligible, true);
});

test("Space SPD-5 TT&C crypto, DoDI 4650.01 Spectrum, DoDI 5000.97 MBSE & Logistics Ao formula", () => {
  const badSpace = evaluateDigitalEngineeringSpaceSpectrum({
    ttcCommandLinkEncryptedAndAuthenticated: false,
    spectrumCertificationObtained: true,
    mbseAuthoritativeSourceOfTruthActive: true,
    mtbfHours: 190,
    mttrHours: 10,
  });
  assert.equal(badSpace.ruleResult.verdict, "FAIL");
  assert.equal(badSpace.operationalAvailabilityAo, 0.95);

  const goodSpace = evaluateDigitalEngineeringSpaceSpectrum({
    ttcCommandLinkEncryptedAndAuthenticated: true,
    antiJamAndAntiSpoofVerified: true,
    groundSegmentSegmented: true,
    flightSoftwareCryptographicallySigned: true,
    spectrumCertificationObtained: true,
    mbseAuthoritativeSourceOfTruthActive: true,
    mtbfHours: 195,
    mttrHours: 5,
  });
  assert.equal(goodSpace.ruleResult.verdict, "PASS");
  assert.equal(goodSpace.operationalAvailabilityAo, 0.975);
});

test("Wave 4 Chat routing, REST routes & FedRAMP/CVE non-regressions", async () => {
  // FedRAMP AC-2/IA-2, CVE Radar, and medical phrasing MUST NOT false-trigger NDIMP
  assert.equal(
    isDodIcQuery("Evaluate FedRAMP High AC-2 and IA-2: a terminated employee account remained active for 38 hours and admins use static SSH keys without hardware MFA."),
    false,
  );
  assert.equal(isDodIcQuery("Explain CVE-2024-3400"), false);
  assert.equal(isDodIcQuery("Evaluate seizure foci and acetylcholine receptor blockade in a patient"), false);

  assert.equal(
    isDodIcQuery("Evaluate CMMC 32 CFR Part 170 210-day POA&M, DFARS 252.204-7012 reported at 96 hours, and unencrypted TT&C under SPD-5"),
    true,
  );

  const chatAns = await executeDodIcReasoning(
    "Under 32 CFR Part 170 CMMC Level 2 with a 210-day POA&M and DFARS 252.204-7012 cyber incident reported after 96 hours, plus unencrypted space TT&C under SPD-5 with MTBF 190 MTTR 10, what are the verdicts?",
    { modelChatFn: async () => ({ error: "offline test" }), persistTrace: false },
  );
  assert.match(chatAns, /DOD-ACQ-CMMC-001/);
  assert.match(chatAns, /DOD-SPACE-MBSE-001/);
  assert.match(chatAns, /FAIL/);

  const statusRes = await handleDodIcV2Request(new Request("http://localhost/api/v2/dod-ic/status"));
  assert.equal(statusRes.status, 200);
  const stJson = (await statusRes.json()) as {
    version: string;
    wave4Complete: boolean;
    policiesCount: number;
    policyLineagesCount: number;
  };
  assert.equal(stJson.version, "4.0.0");
  assert.equal(stJson.wave4Complete, true);
  assert.equal(stJson.policiesCount, 32);
  assert.equal(stJson.policyLineagesCount, 12);
});
