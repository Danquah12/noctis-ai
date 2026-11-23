import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateClassifiedMediaSanitizationAndSpillage,
  evaluateComsecAndCsfcArchitecture,
  evaluateScifIcd705Compliance,
  evaluateTempestRedBlackCompliance,
} from "./classified-systems-engine.ts";
import { executeDodIcReasoning, isDodIcQuery, verifyDodIcResponse } from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";

test("ICD 705 SCIF evaluation flags unauthorized PEDs and denies AI accreditation authority", () => {
  const failPed = evaluateScifIcd705Compliance({
    aoAccreditationActive: true,
    fixedFacilityChecklistCurrent: true,
    idsUl2050Monitored: true,
    pedProhibitionEnforced: false,
  });
  assert.equal(failPed.ruleResult.verdict, "FAIL");
  assert.equal(failPed.pedViolationDetected, true);
  assert.equal(failPed.accreditingAuthority, "COGNIZANT_SECURITY_AUTHORITY_AO");
  assert.equal(failPed.ruleResult.aiCanIssueAto, false);

  const passScif = evaluateScifIcd705Compliance({
    aoAccreditationActive: true,
    fixedFacilityChecklistCurrent: true,
    idsUl2050Monitored: true,
    accessControlAndVisitorEscortEnforced: true,
    pedProhibitionEnforced: true,
    acousticAndRfInspectionComplete: true,
  });
  assert.equal(passScif.ruleResult.verdict, "PASS");
});

test("COMSEC / NSA CSfC dual-layer & CNSSP 15 CNSA 2.0 rejects single-layer VPN & deprecated RSA post-2027", () => {
  const singleLayer = evaluateComsecAndCsfcArchitecture({
    architectureMode: "SINGLE_LAYER_COMMERCIAL",
    symmetricAlgorithm: "AES-256",
    asymmetricKeyExchange: "RSA-2048",
    targetAcquisitionYear: 2027,
  });
  assert.equal(singleLayer.ruleResult.verdict, "FAIL");
  assert.equal(singleLayer.csfcDualLayerCompliant, false);
  assert.equal(singleLayer.cnsa2Compliant, false);

  const cnsa2Ok = evaluateComsecAndCsfcArchitecture({
    architectureMode: "CSFC_DUAL_LAYER",
    twoIndependentEncryptionLayers: true,
    distinctVendorsAcrossLayers: true,
    csfcCapabilityPackageRegistered: true,
    symmetricAlgorithm: "AES-256",
    asymmetricKeyExchange: "ML-KEM-1024",
    signatureAlgorithm: "ML-DSA-87",
    targetAcquisitionYear: 2027,
    twoPersonIntegrityEnforced: true,
    comsecCustodianAppointed: true,
    zeroizationCapabilityVerified: true,
  });
  assert.equal(cnsa2Ok.ruleResult.verdict, "PASS");
  assert.equal(cnsa2Ok.cnsa2Compliant, true);
  assert.equal(cnsa2Ok.csfcDualLayerCompliant, true);
});

test("TEMPEST RED/BLACK enforces CTTA authority, flags unshielded RF near RED, and withholds classified specs", () => {
  const badRf = evaluateTempestRedBlackCompliance({
    redBlackCablingSeparated: true,
    cttaAssessmentCompleted: true,
    unshieldedRfTransmitterNearRedEquipment: true,
  });
  assert.equal(badRf.ruleResult.verdict, "FAIL");
  assert.equal(badRf.classifiedSpecsWithheld, true);
  assert.equal(badRf.cttaAuthorityRequired, true);
});

test("NIST SP 800-88 Rev. 2 blocks SSD degaussing and Clear/format release of TS/SCI media", () => {
  const degaussSsd = evaluateClassifiedMediaSanitizationAndSpillage({
    mediaType: "SSD_FLASH",
    highestClassification: "SECRET",
    proposedMethod: "DEGAUSS_NSA_EPL",
    destinationBoundary: "LOWER_OR_UNCLASSIFIED_RELEASE",
  });
  assert.equal(degaussSsd.ruleResult.verdict, "FAIL");
  assert.equal(degaussSsd.sanitizationSufficient, false);

  const clearTsSci = evaluateClassifiedMediaSanitizationAndSpillage({
    mediaType: "HDD_MAGNETIC",
    highestClassification: "TS_SCI",
    proposedMethod: "CLEAR_FORMAT",
    destinationBoundary: "LOWER_OR_UNCLASSIFIED_RELEASE",
  });
  assert.equal(clearTsSci.ruleResult.verdict, "FAIL");

  const destroyOk = evaluateClassifiedMediaSanitizationAndSpillage({
    mediaType: "SSD_FLASH",
    highestClassification: "TS_SCI",
    proposedMethod: "DESTROY_NSA_EPL_SHRED_DISINTEGRATE",
    destinationBoundary: "EXCESS_DISPOSAL",
  });
  assert.equal(destroyOk.ruleResult.verdict, "PASS");
  assert.equal(destroyOk.sanitizationSufficient, true);
});

test("Stage 3 verifier, Chat reasoning & REST routes for Classified Systems Security", async () => {
  assert.equal(isDodIcQuery("Can we bring a Bluetooth smartwatch into a SCIF under ICD 705 and use single-layer commercial VPN for CSfC or degauss a SECRET SSD?"), true);

  const badCsfc = verifyDodIcResponse("CSfC", "Single-layer commercial VPN suffices for CSfC classified transit.", []);
  assert.equal(badCsfc.passed, false);
  assert.ok(badCsfc.violations.some((v) => v.includes("SINGLE_LAYER_COMMERCIAL_CLASSIFIED_CLAIM")));

  const badDegauss = verifyDodIcResponse("Sanitize", "Magnetic degaussing erases SSD flash storage cleanly.", []);
  assert.equal(badDegauss.passed, false);
  assert.ok(badDegauss.violations.some((v) => v.includes("DEGAUSS_SSD_MISINFORMATION")));

  const badClear = verifyDodIcResponse("Release", "Formatting a TS/SCI drive sanitizes it for unclassified release.", []);
  assert.equal(badClear.passed, false);
  assert.ok(badClear.violations.some((v) => v.includes("CLEAR_CLASS_RELEASE_CLAIM")));

  const chatAns = await executeDodIcReasoning(
    "Can personnel bring a Bluetooth smartwatch inside a SCIF under ICD 705, can single-layer commercial VPN satisfy CSfC under CNSSP 15, and can we degauss a TS/SCI SSD for unclassified release under SP 800-88?",
    { modelChatFn: async () => ({ error: "offline test" }), persistTrace: false },
  );
  assert.match(chatAns, /DOD-SCIF-705-001/);
  assert.match(chatAns, /DOD-COMSEC-CSFC-001/);
  assert.match(chatAns, /DOD-SANITIZE-88-001/);
  assert.match(chatAns, /FAIL/);

  const restSan = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/classified/sanitize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        media_type: "SSD_FLASH",
        highest_classification: "TS_SCI",
        proposed_method: "DEGAUSS_NSA_EPL",
        destination_boundary: "LOWER_OR_UNCLASSIFIED_RELEASE",
      }),
    }),
  );
  assert.equal(restSan.status, 200);
  const sanJson = (await restSan.json()) as { ruleResult: { verdict: string } };
  assert.equal(sanJson.ruleResult.verdict, "FAIL");
});
