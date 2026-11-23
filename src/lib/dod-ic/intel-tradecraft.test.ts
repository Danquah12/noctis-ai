import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyItuRadioBand,
  computeHaversineKm,
  decodeAdmiraltyCode,
  evaluateIcd203AndAchAnalysis,
  evaluateMultiIntSyntheticFusion,
} from "./intel-tradecraft-fusion-engine.ts";
import { executeDodIcReasoning, isDodIcQuery, verifyDodIcResponse } from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";

test("NATO 6x6 Admiralty decoder & ICD 203 ACH falsification matrix rank hypotheses accurately", () => {
  const f6 = decodeAdmiraltyCode("F6");
  assert.equal(f6.unreliableOrUnjudged, true);

  const b2 = decodeAdmiraltyCode("B2");
  assert.equal(b2.unreliableOrUnjudged, false);

  const ach = evaluateIcd203AndAchAnalysis({
    hypotheses: [
      { id: "H1", label: "Routine Maintenance" },
      { id: "H2", label: "Imminent Deployment" },
    ],
    evidence: [
      {
        id: "E1",
        description: "Multi-sensor logistic surge",
        admiraltyCode: "B2",
        ratingsByHypothesis: { H1: "INCONSISTENT", H2: "CONSISTENT" },
      },
      {
        id: "E2",
        description: "Fuel & comms calibration",
        admiraltyCode: "A1",
        ratingsByHypothesis: { H1: "INCONSISTENT", H2: "CONSISTENT" },
      },
    ],
    claimedConfidence: "MODERATE",
    alternativesConsidered: true,
    keyAssumptionsExplicit: true,
    sourcesDocumentedPerIcd206: true,
  });
  assert.equal(ach.ruleResult.verdict, "PASS");
  assert.equal(ach.rankings[0]!.id, "H2");
  assert.equal(ach.rankings[0]!.inconsistentCount, 0);
  assert.equal(ach.rankings[1]!.id, "H1");
  assert.equal(ach.rankings[1]!.inconsistentCount, 2);
});

test("ICD 203 blocks HIGH confidence from single-source F6 intel; Multi-INT validates Haversine & blocks single-INT ground truth", () => {
  const badF6 = evaluateIcd203AndAchAnalysis({
    admiraltyCodes: ["F6"],
    sourceCount: 1,
    claimedConfidence: "HIGH",
    alternativesConsidered: true,
  });
  assert.equal(badF6.ruleResult.verdict, "FAIL");

  const dist = computeHaversineKm(38.8977, -77.0365, 38.8977, -77.0365);
  assert.equal(dist, 0);
  assert.match(classifyItuRadioBand(14250), /SHF/);

  const singleOsintTruth = evaluateMultiIntSyntheticFusion({
    disciplinesPresent: ["OSINT"],
    claimsMultiIntVerifiedGroundTruth: true,
  });
  assert.equal(singleOsintTruth.ruleResult.verdict, "FAIL");

  const corroboratedOk = evaluateMultiIntSyntheticFusion({
    summaryText: "UNCLASSIFIED synthetic range exercise",
    disciplinesPresent: ["OSINT", "GEOINT", "SIGINT"],
    osintProvenanceVerified: true,
    geointCoordinatesA: { lat: 38.8977, lon: -77.0365 },
    geointCoordinatesB: { lat: 38.902, lon: -77.0365 },
    geospatialToleranceKm: 5,
    sigintFrequencyMhz: 2450,
    claimsMultiIntVerifiedGroundTruth: true,
  });
  assert.equal(corroboratedOk.ruleResult.verdict, "PASS");
  assert.ok((corroboratedOk.haversineDistanceKm ?? 99) < 1);
  assert.match(corroboratedOk.ituRfBand || "", /UHF/);
});

test("Stage 3 verifier, Chat routing & REST API for ICD 203 & Multi-INT Fusion", async () => {
  assert.equal(isDodIcQuery("Does single-source F6 intelligence justify High Confidence under ICD 203?"), true);

  const badDraft = verifyDodIcResponse("ICD 203", "Single-source F6 reporting justifies High Confidence here.", []);
  assert.equal(badDraft.passed, false);
  assert.ok(badDraft.violations.some((v) => v.includes("SINGLE_SOURCE_F6_HIGH_CONFIDENCE_CLAIM")));

  const chatAns = await executeDodIcReasoning(
    "Under ODNI ICD 203 and ICD 206, can single-source uncorroborated F6 reporting justify a High Confidence judgment?",
    { modelChatFn: async () => ({ error: "offline test" }), persistTrace: false },
  );
  assert.match(chatAns, /IC-ICD203-ACH-001/);
  assert.match(chatAns, /FAIL/);

  const restAch = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/intel/icd203-ach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        admiralty_codes: ["F6"],
        source_count: 1,
        claimed_confidence: "HIGH",
        alternatives_considered: true,
      }),
    }),
  );
  assert.equal(restAch.status, 200);
  const achJson = (await restAch.json()) as { ruleResult: { verdict: string } };
  assert.equal(achJson.ruleResult.verdict, "FAIL");
});
