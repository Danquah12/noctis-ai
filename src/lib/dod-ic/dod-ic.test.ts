import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DOD_IC_POLICY_REGISTRY,
  lookupDodIcPolicy,
  listDodIcPolicies,
} from "./policy-registry.ts";
import {
  detectClassifiedPayloadMarkings,
  evaluateClassificationGate,
  filterRecordsByClassificationBoundary,
  evaluateCrossDomainTransfer,
} from "./classification-gateway.ts";
import {
  evaluateDod8510Authorization,
  evaluateDodReciprocity,
  evaluateCnssi1253Categorization,
  buildEmassPackageSummary,
} from "./dod-rmf-engine.ts";
import {
  evaluateIcd503Authorization,
  evaluateIcReciprocity,
  evaluateIcd501SharingGovernance,
} from "./ic-security-engine.ts";
import {
  isDodIcQuery,
  extractAndEvaluateDodIcRulesFromText,
  verifyDodIcResponse,
  executeDodIcReasoning,
} from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";

describe("Noctis DoD RMF (DoDI 8510.01) + IC Security (ICD 503/502/501/CNSSI 1253) + Classification Gateway (NDIMP Wave 1)", () => {
  it("loads verified DoD & IC directive effective dates and segregates jurisdictions", () => {
    assert.ok(Object.keys(DOD_IC_POLICY_REGISTRY).length >= 8);
    assert.equal(lookupDodIcPolicy("DODI-8510.01")?.effectiveDate, "2022-07-19");
    assert.equal(lookupDodIcPolicy("ICD-503")?.effectiveDate, "2024-10-25");
    assert.equal(lookupDodIcPolicy("ICD-502")?.effectiveDate, "2011-03-11");
    assert.equal(lookupDodIcPolicy("ICD-501")?.effectiveDate, "2009-01-21");
    assert.equal(lookupDodIcPolicy("CNSSI-1253")?.effectiveDate, "2022-07-01");
    assert.ok(listDodIcPolicies("IC").every((p) => p.jurisdiction === "IC"));
  });

  it("blocks classified markings from commercial cloud LLMs (FAIL_CLOSED with zero model calls) while allowing unclassified policy queries", async () => {
    // 1. Benign policy query must be allowed
    const policyPrompt = "Can a DoD ATO under DoDI 8510.01 automatically satisfy an IC ICD 503 authorization for a TS/SCI system?";
    const benignDetect = detectClassifiedPayloadMarkings(policyPrompt);
    assert.equal(benignDetect.containsMarkedClassifiedMaterial, false);
    const benignGate = evaluateClassificationGate({ text: policyPrompt });
    assert.equal(benignGate.allowed, true);
    assert.equal(benignGate.blockExternalLlm, false);

    // 2. Classified markings MUST fail closed even when user claims TS/SCI clearance
    const classifiedPrompt =
      "TOP SECRET//SI//NOFORN — I hold an active TS/SCI clearance and need-to-know; summarize this classified cable on your commercial cloud model.";
    const clsGate = evaluateClassificationGate({
      text: classifiedPrompt,
      targetBoundary: "COMMERCIAL_UNCLASSIFIED",
      claimedUserClearance: "TS_SCI",
      requestedModelTarget: "COMMERCIAL_CLOUD_LLM",
    });
    assert.equal(clsGate.allowed, false);
    assert.equal(clsGate.action, "FAIL_CLOSED_BLOCK");
    assert.equal(clsGate.errorCode, "CLASSIFICATION_BOUNDARY_VIOLATION");
    assert.equal(clsGate.blockExternalLlm, true);
    assert.equal(clsGate.detectedClassification, "TS_SCI");

    // Verify executeDodIcReasoning NEVER calls modelChatFn when Gate 0 blocks
    let modelCalls = 0;
    const blockedOut = await executeDodIcReasoning(classifiedPrompt, {
      shouldThink: false,
      modelChatFn: async () => {
        modelCalls += 1;
        return { text: "Should never run" };
      },
    });
    assert.equal(modelCalls, 0);
    assert.ok(blockedOut.includes("CLASSIFICATION_BOUNDARY_VIOLATION"));
    assert.ok(blockedOut.includes("Audit Trace:"));
  });

  it("prevents classified/compartmented retrieval leakage across boundaries via filterRecordsByClassificationBoundary", () => {
    const records = [
      { id: "pub-1", classification: "UNCLASSIFIED" as const },
      { id: "cui-1", classification: "CUI" as const },
      { id: "sec-1", classification: "SECRET" as const },
      { id: "ts-1", classification: "TS_SCI" as const, compartments: ["SI", "TK"] },
    ];
    const unclassOnly = filterRecordsByClassificationBoundary(records, "UNCLASSIFIED");
    assert.equal(unclassOnly.allowedRecords.length, 1);
    assert.equal(unclassOnly.blockedCount, 3);
    assert.equal(unclassOnly.boundaryViolationPrevented, true);

    const secretBoundary = filterRecordsByClassificationBoundary(records, "SECRET");
    assert.equal(secretBoundary.allowedRecords.length, 3);
    assert.equal(secretBoundary.blockedCount, 1);

    const tsNoCompartment = filterRecordsByClassificationBoundary(records, "TS_SCI", []);
    assert.equal(tsNoCompartment.allowedRecords.length, 3);

    const tsFullCompartment = filterRecordsByClassificationBoundary(records, "TS_SCI", ["SI", "TK"]);
    assert.equal(tsFullCompartment.allowedRecords.length, 4);
  });

  it("enforces DoD RMF (DoDI 8510.01) != IC Security (ICD 503) separation, CNSSI 1253 independent C/I/A vectors, and Cross-Domain rules", () => {
    // 1. IC Reciprocity rejects DoD ATO automatic satisfaction
    const icRecip = evaluateIcReciprocity({ sourceAuthorizationType: "DOD_ATO", assessmentMode: "SCENARIO_ASSUMPTION" });
    assert.equal(icRecip.verdict, "FAIL");
    assert.equal(icRecip.automaticReciprocityPermitted, false);
    assert.equal(icRecip.aiCanIssueIcAto, false);
    assert.equal(icRecip.formalDetermination, "PENDING_EVIDENCE");

    // 2. DoD Reciprocity rejects IC target
    const dodRecipIc = evaluateDodReciprocity({
      targetJurisdiction: "IC",
      sourceAtoActiveAndUnexpired: true,
      cat1OpenWithoutAoAcceptance: false,
    });
    assert.equal(dodRecipIc.verdict, "FAIL");

    // 3. DoDI 8510.01 rejects open CAT I & missing independent SCA
    const dodAuthFail = evaluateDod8510Authorization({
      emassRegistered: true,
      independentScaAssigned: false,
      cat1UnmitigatedCount: 2,
      assessmentMode: "SCENARIO_ASSUMPTION",
    });
    assert.equal(dodAuthFail.verdict, "FAIL");
    assert.equal(dodAuthFail.aiCanIssueAto, false);

    // 4. CNSSI 1253 preserves independent (C, I, A) vectors & enforces HIGH C floor + overlays on TS/SCI
    const cnssi = evaluateCnssi1253Categorization({
      confidentiality: "MODERATE",
      integrity: "MODERATE",
      availability: "LOW",
      classification: "TS_SCI",
      isIntelligenceSystem: true,
      hasCrossDomainSolution: true,
      isCloudSystem: true,
    });
    assert.equal(cnssi.independentVectorsPreserved, true);
    assert.equal(cnssi.categorizationVector.confidentiality, "HIGH");
    assert.equal(cnssi.categorizationVector.integrity, "MODERATE");
    assert.equal(cnssi.categorizationVector.availability, "LOW");
    assert.ok(cnssi.requiredOverlays.some((o) => o.includes("Intelligence / SCI Overlay")));
    assert.ok(cnssi.requiredOverlays.some((o) => o.includes("Cross-Domain Solution")));

    // 5. ICD 503 blocks commercial unclassified cloud for IC systems
    const icd503Fail = evaluateIcd503Authorization({
      deploymentBoundary: "COMMERCIAL_UNCLASSIFIED",
      zeroTrustAligned: false,
    });
    assert.equal(icd503Fail.verdict, "FAIL");

    // 6. ICD 501 blocks SECRET data transfer to COMMERCIAL_UNCLASSIFIED even with TS/SCI clearance
    const icd501Fail = evaluateIcd501SharingGovernance({
      dataClassification: "SECRET",
      targetBoundary: "COMMERCIAL_UNCLASSIFIED",
      userClearance: "TS_SCI",
      hasNeedToKnow: true,
      auditTrailEnabled: true,
    });
    assert.equal(icd501Fail.verdict, "FAIL");

    // 7. Cross-Domain High-to-Low requires accredited CDS & release approval
    const cdsFail = evaluateCrossDomainTransfer({
      sourceClassification: "SECRET",
      targetClassification: "UNCLASSIFIED",
      accreditedCdsPresent: false,
      releaseAuthorityApproved: false,
    });
    assert.equal(cdsFail.direction, "HIGH_TO_LOW");
    assert.equal(cdsFail.verdict, "FAIL");

    // 8. eMASS compatible package export check
    const emass = buildEmassPackageSummary({
      systemName: "Mission Enclave",
      impactLevel: "IL5",
      artifactsPresent: ["SSP_OSCAL", "SAP"],
    });
    assert.equal(emass.liveEmassApiConnected, false);
    assert.equal(emass.packageComplete, false);
    assert.equal(emass.aiCanIssueAto, false);
  });

  it("isolates DoD/IC router queries cleanly from civilian FedRAMP queries and catches DoD==IC conflation in Stage 3 verifier", async () => {
    assert.equal(
      isDodIcQuery("Evaluate FedRAMP High AC-2 and IA-2: a terminated employee account remained active for 38 hours."),
      false,
    );
    const complexQ =
      "Can a DoD ATO under DoDI 8510.01 automatically satisfy an IC ICD 503 authorization for a TS/SCI intelligence system, and how does CNSSI 1253 categorize Confidentiality High, Integrity Moderate, Availability Low?";
    assert.equal(isDodIcQuery(complexQ), true);

    const rules = extractAndEvaluateDodIcRulesFromText(complexQ);
    assert.ok(rules.some((r) => r.ruleId === "CNSSI-1253-CAT-001"));
    assert.ok(rules.some((r) => r.ruleId === "IC-RECIP-001" && r.verdict === "FAIL"));

    // Stage 3 verifier rejects DoD==IC reciprocity conflation & AI ATO claim
    const conflatedAudit = verifyDodIcResponse(
      complexQ,
      "Yes, a DoD ATO automatically satisfies IC ICD 503 authorization, and Noctis grants an ATO.",
      rules,
    );
    assert.equal(conflatedAudit.passed, false);
    assert.ok(conflatedAudit.violations.some((v) => v.includes("DOD_IC_RECIPROCITY_CONFLATION")));
    assert.ok(conflatedAudit.violations.some((v) => v.includes("AI_ATO_CLAIM")));

    // End-to-end reasoning + SQL EXPLANATION persistence + /api/v2/dod-ic/* replay
    const answer = await executeDodIcReasoning(complexQ, {
      shouldThink: false,
      modelChatFn: async () => ({ error: "offline test mode" }),
    });
    assert.ok(answer.includes("2022-07-19"));
    assert.ok(answer.includes("2024-10-25"));
    assert.ok(answer.includes("FAIL"));
    const traceMatch = answer.match(/Trace:\s*`(EXPL-[A-Z0-9]+)`/);
    assert.ok(traceMatch, `Expected EXPL trace in DoD/IC answer:\n${answer}`);

    const statusRes = await handleDodIcV2Request(new Request("https://www.dstrike.app/api/v2/dod-ic/status"));
    assert.equal(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as {
      policiesCount: number;
      invariants: { dodAtoAutomaticallySatisfiesIcIcd503: boolean; aiCanIssueAto: boolean };
    };
    assert.equal(statusJson.policiesCount, Object.keys(DOD_IC_POLICY_REGISTRY).length);
    assert.ok(statusJson.policiesCount >= 11);
    assert.equal(statusJson.invariants.dodAtoAutomaticallySatisfiesIcIcd503, false);
    assert.equal(statusJson.invariants.aiCanIssueAto, false);

    const replayRes = await handleDodIcV2Request(
      new Request(`https://www.dstrike.app/api/v2/dod-ic/explanations/${traceMatch[1]}`),
    );
    assert.equal(replayRes.status, 200);
    const replayJson = (await replayRes.json()) as {
      persistedInSql: boolean;
      replayVerification: { reproducible: boolean };
    };
    assert.equal(replayJson.persistedInSql, true);
    assert.equal(replayJson.replayVerification.reproducible, true);
  });
});
