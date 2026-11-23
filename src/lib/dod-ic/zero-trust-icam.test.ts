import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDodIcamPkiAuthentication,
  evaluateDodZeroTrust7Pillar,
  evaluatePrivilegedAccessAndAbac,
  getDodZeroTrustCatalog,
} from "./zero-trust-icam-engine.ts";
import {
  executeDodIcReasoning,
  isDodIcQuery,
  verifyDodIcResponse,
} from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";
import { lookupDodIcPolicy } from "./policy-registry.ts";

test("DoD Zero Trust 7-Pillar Strategy catalog & verified policy dates (DoDI 8520.02/03, NSM-8, ZTMM v2.0)", () => {
  assert.equal(lookupDodIcPolicy("DOD-ZT-STRATEGY-2022")?.effectiveDate, "2022-11-22");
  assert.equal(lookupDodIcPolicy("DODI-8520.02")?.effectiveDate, "2023-05-18");
  assert.equal(lookupDodIcPolicy("DODI-8520.03")?.effectiveDate, "2023-05-19");
  assert.equal(lookupDodIcPolicy("NSM-8")?.effectiveDate, "2022-01-19");
  assert.equal(lookupDodIcPolicy("CISA-ZTMM-2.0-OMB-M22-09")?.effectiveDate, "2023-04-11");

  const catalog = getDodZeroTrustCatalog();
  assert.equal(catalog.summary.pillarsCount, 7);
  assert.equal(catalog.summary.capabilitiesCount, 45);
  assert.equal(catalog.summary.targetActivities, 91);
  assert.equal(catalog.summary.advancedActivities, 61);
  assert.equal(catalog.summary.totalActivities, 152);
  assert.equal(catalog.summary.targetDeadline, "FY 2027");
  assert.equal(catalog.pillars.length, 7);
});

test("DOD-ZT-7PILLAR-001: fails on missing phishing-resistant MFA + flat network, crosswalks CISA ZTMM v2.0, and passes Target readiness", () => {
  const failRes = evaluateDodZeroTrust7Pillar({
    systemName: "SIPR Enclave Alpha",
    isNationalSecuritySystem: true,
    userScore: 2,
    deviceScore: 2,
    networkScore: 1,
    applicationsScore: 2,
    dataScore: 2,
    visibilityScore: 2,
    automationScore: 2,
    phishingResistantMfaEnforced: false,
    microsegmentationAndMtlsEnforced: false,
    assessmentMode: "SCENARIO_ASSUMPTION",
  });
  assert.equal(failRes.ruleResult.ruleId, "DOD-ZT-7PILLAR-001");
  assert.equal(failRes.ruleResult.verdict, "FAIL");
  assert.equal(failRes.ruleResult.aiCanIssueAto, false);
  assert.equal(failRes.fy2027Status, "NOT_READY");
  assert.ok(failRes.cisaZtmmCrosswalk);
  assert.equal(failRes.cisaZtmmCrosswalk.weakestPillar, "Networks");

  const passRes = evaluateDodZeroTrust7Pillar({
    systemName: "Mission Enclave Target",
    isNationalSecuritySystem: true,
    userScore: 3,
    deviceScore: 3,
    networkScore: 3,
    applicationsScore: 3,
    dataScore: 3,
    visibilityScore: 3,
    automationScore: 3,
    phishingResistantMfaEnforced: true,
    devicePostureAndEdrVerified: true,
    microsegmentationAndMtlsEnforced: true,
    dataTaggingAndEncryptionEnforced: true,
    continuousPdpPepEnforced: true,
    centralizedSiemsAndSoarActive: true,
    assessmentMode: "SCENARIO_ASSUMPTION",
  });
  assert.equal(passRes.ruleResult.verdict, "PASS");
  assert.equal(passRes.ruleResult.formalDetermination, "PENDING_EVIDENCE");
  assert.equal(passRes.fy2027Status, "TARGET_READY");
  assert.equal(passRes.targetReadinessPercent, 100);
});

test("DOD-ICAM-PKI-001 & DOD-ICAM-PAM-ABAC-001: SMS/OTP, shared CAC without ALT, OCSP fail-open, standing admin & RBAC-only fail cleanly", () => {
  const smsFail = evaluateDodIcamPkiAuthentication({
    credentialType: "SMS_OTP",
    isPrivilegedAccount: false,
    ocspOrCrlRevocationChecked: false,
  });
  assert.equal(smsFail.phishingResistant, false);
  assert.equal(smsFail.ruleResult.verdict, "FAIL");
  assert.ok(smsFail.resolvedDisaCcis.some((c) => c.cciId === "CCI-000765"));

  const altOcspFail = evaluateDodIcamPkiAuthentication({
    credentialType: "CAC",
    isPrivilegedAccount: true,
    separatePrivilegedAccountAndAltToken: false,
    ocspOrCrlRevocationChecked: true,
    revocationFailClosed: false,
  });
  assert.equal(altOcspFail.revocationFailClosedEnforced, false);
  assert.equal(altOcspFail.ruleResult.verdict, "FAIL");
  assert.match(altOcspFail.ruleResult.summary, /ALT token/i);
  assert.match(altOcspFail.ruleResult.summary, /fail-open/i);

  const pkiPass = evaluateDodIcamPkiAuthentication({
    credentialType: "DOD_PKI_ALT_TOKEN",
    isPrivilegedAccount: true,
    separatePrivilegedAccountAndAltToken: true,
    ocspOrCrlRevocationChecked: true,
    revocationFailClosed: true,
    dodRootCaChainVerified: true,
    fips140ValidatedCrypto: true,
  });
  assert.equal(pkiPass.phishingResistant, true);
  assert.equal(pkiPass.ruleResult.verdict, "PASS");

  const pamFail = evaluatePrivilegedAccessAndAbac({
    standingPrivilegedAccessEliminated: false,
    rbacOnlyWithoutAttributeChecks: true,
    eastWestMicrosegmentationEnforced: false,
    workloadMtlsWithNpeCerts: false,
    isIcOrClassifiedEnvironment: true,
  });
  assert.equal(pamFail.ruleResult.ruleId, "DOD-ICAM-PAM-ABAC-001");
  assert.equal(pamFail.ruleResult.verdict, "FAIL");
  assert.equal(pamFail.ruleResult.jurisdiction, "IC");
});

test("Chat tiering, non-regression, Stage 3 ICAM/PKI verifier & SQL trace replay in Chat", async () => {
  // Positive Step 3 routing
  assert.equal(
    isDodIcQuery("Under DoD Zero Trust Strategy FY 2027, evaluate a privileged DoD admin using a daily CAC without a separate ALT token, OCSP fail-open, standing domain admin rights, and flat network with no microsegmentation."),
    true,
  );
  assert.equal(isDodIcQuery("What DoD and IC engines and policies are live in Noctis NDIMP right now?"), true);
  assert.equal(isDodIcQuery("Replay trace EXPL-7EFAB200589E"), true);

  // Critical non-regressions MUST stay false in isDodIcQuery
  assert.equal(
    isDodIcQuery("Evaluate FedRAMP High AC-2 and IA-2: a terminated employee account remained active for 38 hours and admins use static SSH keys without hardware MFA."),
    false,
  );
  assert.equal(isDodIcQuery("Explain CVE-2024-3400"), false);

  // Stage 3 blocks OCSP fail-open endorsement & SMS MFA compliance claim
  const badOcsp = verifyDodIcResponse(
    "Check DoDI 8520.02",
    "Configuring OCSP fail-open / soft-fail is compliant with DoDI 8520.02.",
    [],
  );
  assert.equal(badOcsp.passed, false);
  assert.ok(badOcsp.violations.some((v) => v.includes("PKI_REVOCATION_FAIL_OPEN_ENDORSEMENT")));

  const badSms = verifyDodIcResponse(
    "Check DoDI 8520.03",
    "SMS OTP satisfies DoDI 8520.03 phishing-resistant MFA requirements.",
    [],
  );
  assert.equal(badSms.passed, false);
  assert.ok(badSms.violations.some((v) => v.includes("PHISHABLE_MFA_DOD_COMPLIANCE_CLAIM")));

  // End-to-end Chat reasoning + deterministic trace generation + Chat SQL trace replay
  const chatAns = await executeDodIcReasoning(
    "Under DoD Zero Trust Strategy FY 2027 and DoDI 8520.02 / DoDI 8520.03, evaluate a privileged DoD admin using a daily CAC without a separate ALT token, OCSP set to fail-open, standing domain admin rights, and a flat network with no microsegmentation.",
    {
      modelChatFn: async () => ({ error: "offline test" }),
    },
  );
  assert.match(chatAns, /2022-11-22/);
  assert.match(chatAns, /2023-05-18/);
  assert.match(chatAns, /2023-05-19/);
  assert.match(chatAns, /DOD-ICAM-PKI-001/);
  assert.match(chatAns, /DOD-ICAM-PAM-ABAC-001/);
  assert.match(chatAns, /DOD-ZT-7PILLAR-001/);
  assert.match(chatAns, /FAIL/);

  const traceMatch = chatAns.match(/Trace:\s*`(EXPL-[A-Z0-9]+)`/);
  assert.ok(traceMatch, "Missing EXPL trace in Step 3 response");

  // Live Chat SQL Replay on generated trace
  const chatReplay = await executeDodIcReasoning(`Replay trace ${traceMatch[1]}`, {
    shouldThink: false,
  });
  assert.match(chatReplay, new RegExp(traceMatch[1]!));
  assert.match(chatReplay, /reproducible|Persisted/i);

  // API endpoints verification
  const pillarsRes = await handleDodIcV2Request(new Request("http://localhost/api/v2/dod-ic/zero-trust/pillars"));
  assert.equal(pillarsRes.status, 200);
  const pillarsJson = (await pillarsRes.json()) as { summary: { targetActivities: number; totalActivities: number } };
  assert.equal(pillarsJson.summary.targetActivities, 91);
  assert.equal(pillarsJson.summary.totalActivities, 152);

  const icamRes = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/icam/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        credential_type: "CAC",
        is_privileged: true,
        separate_alt_token: false,
        ocsp_crl_checked: true,
        revocation_fail_closed: false,
      }),
    }),
  );
  assert.equal(icamRes.status, 200);
  const icamJson = (await icamRes.json()) as { ruleResult: { verdict: string; ruleId: string } };
  assert.equal(icamJson.ruleResult.ruleId, "DOD-ICAM-PKI-001");
  assert.equal(icamJson.ruleResult.verdict, "FAIL");
});
