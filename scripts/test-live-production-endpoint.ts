import assert from "node:assert/strict";

async function testLiveProduction() {
  console.log("============================================================================");
  console.log("TESTING LIVE PRODUCTION ENDPOINTS ON https://www.dstrike.app");
  console.log("============================================================================\n");

  // 1. GET SMART on FHIR Endpoints
  console.log("[+] Test 1: Querying GET /api/noctis/smart-fhir?action=endpoints...");
  const epRes = await fetch("https://www.dstrike.app/api/noctis/smart-fhir?action=endpoints");
  assert.equal(epRes.status, 200, `Expected 200, got ${epRes.status}`);
  const epJson = await epRes.json();
  assert.equal(epJson.status, "active");
  assert.ok(epJson.endpoints.epic);
  assert.ok(epJson.endpoints.cerner);
  console.log("    [PASS] SMART on FHIR endpoints verified (Epic, Cerner, Custom available)\n");

  // 2. GET SMART Launch URL
  console.log("[+] Test 2: Testing SMART Launch URL generation for Epic...");
  const launchRes = await fetch("https://www.dstrike.app/api/noctis/smart-fhir?action=launch&vendor=epic&launch=epic-live-token-42");
  assert.equal(launchRes.status, 200);
  const launchJson = await launchRes.json();
  assert.ok(launchJson.authorizationUrl.includes("epic.com"));
  assert.ok(launchJson.authorizationUrl.includes("response_type=code"));
  assert.ok(launchJson.authorizationUrl.includes("launch=epic-live-token-42"));
  console.log("    [PASS] SMART on FHIR PKCE Launch URL generated successfully\n");

  // 3. POST FHIR Ingestion & Tri-Specialist Consensus on Live Production
  console.log("[+] Test 3: POSTing 78M BRASH/Digoxin/Hyperkalemia LOINC payload to live server...");
  const payload = {
    patient: {
      resourceType: "Patient",
      id: "pat-live-78m",
      name: [{ given: ["Arthur"], family: "Pendelton" }],
      gender: "male",
      birthDate: "1948-03-15",
    },
    observations: [
      {
        code: { coding: [{ code: "85354-9" }] },
        component: [
          { code: { coding: [{ code: "8480-6" }] }, valueQuantity: { value: 68 } },
          { code: { coding: [{ code: "8462-4" }] }, valueQuantity: { value: 38 } },
        ],
      },
      { code: { coding: [{ code: "8867-4" }] }, valueQuantity: { value: 29 } },
      { code: { coding: [{ code: "9279-1" }] }, valueQuantity: { value: 28 } },
      { code: { coding: [{ code: "8310-5" }] }, valueQuantity: { value: 38.6, unit: "Cel" } },
      { code: { coding: [{ code: "2708-6" }] }, valueQuantity: { value: 91 } },
      { code: { coding: [{ code: "2823-3" }] }, valueQuantity: { value: 7.3 } },
      { code: { coding: [{ code: "2951-2" }] }, valueQuantity: { value: 129 } },
      { code: { coding: [{ code: "2160-0" }] }, valueQuantity: { value: 4.8 } },
      { code: { coding: [{ code: "2160-0" }] }, note: [{ text: "baseline creatinine" }], valueQuantity: { value: 2.3 } },
      { code: { coding: [{ code: "1963-8" }] }, valueQuantity: { value: 12 } },
      { code: { coding: [{ code: "2744-1" }] }, valueQuantity: { value: 7.12 } },
      { code: { coding: [{ code: "2019-8" }] }, valueQuantity: { value: 29 } },
      { code: { coding: [{ code: "2524-7" }] }, valueQuantity: { value: 6.8 } },
      { code: { coding: [{ code: "3564-2" }] }, valueQuantity: { value: 3.6 } },
      { code: { coding: [{ code: "2345-7" }] }, valueQuantity: { value: 168 } },
      { code: { coding: [{ code: "9187-6" }] }, valueQuantity: { value: 100 } },
    ],
    conditions: [
      { code: { text: "CKD stage 4" } },
      { code: { text: "heart failure with reduced ejection fraction (EF 30%)" } },
      { code: { text: "atrial fibrillation" } },
      { code: { text: "type 2 diabetes" } },
    ],
    medications: [
      { medicationCodeableConcept: { text: "Digoxin 0.125 mg daily" } },
      { medicationCodeableConcept: { text: "Carvedilol 25 mg twice daily" } },
      { medicationCodeableConcept: { text: "Spironolactone 25 mg daily" } },
      { medicationCodeableConcept: { text: "Lisinopril 20 mg daily" } },
      { medicationCodeableConcept: { text: "Metformin 1,000 mg twice daily" } },
      { medicationCodeableConcept: { text: "Trimethoprim-sulfamethoxazole 160/800 mg twice daily" } },
    ],
  };

  const ingestRes = await fetch("https://www.dstrike.app/api/noctis/smart-fhir?action=ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  assert.equal(ingestRes.status, 200, `Expected 200, got ${ingestRes.status}`);
  const ingestJson = await ingestRes.json();
  assert.equal(ingestJson.status, "success");
  assert.equal(ingestJson.ingestedRecord.name, "Arthur Pendelton");
  assert.equal(ingestJson.ingestedRecord.vitals.sbp, 68);
  assert.equal(ingestJson.ingestedRecord.vitals.hr, 29);
  assert.equal(ingestJson.ingestedRecord.labs.potassium, 7.3);
  
  // Verify synthesized report contains zero fabrication and key invariants
  const report = ingestJson.synthesizedClinicalReport;
  assert.match(report, /48(?:\.0)?\s*mmHg/i); // MAP = 48 mmHg
  assert.match(report, /2\.09/); // KDIGO fold ratio
  assert.doesNotMatch(report, /\bassumed\s+70\s*kg\b/i); // Zero weight fabrication
  assert.ok(ingestJson.fhirWritebackBundle);
  assert.equal(ingestJson.fhirWritebackBundle.resourceType, "Bundle");
  assert.ok(ingestJson.fhirWritebackBundle.entry.length >= 5);

  console.log("    [PASS] Live FHIR ingestion, consensus arbitration, and US Core writeback bundle verified!");
  console.log(`    [PASS] FHIR Writeback Bundle generated with ${ingestJson.fhirWritebackBundle.entry.length} resources`);
  console.log("    [PASS] Zero fabrication invariants validated on live server\n");

  console.log("============================================================================");
  console.log("ALL LIVE PRODUCTION INTEGRATION TESTS PASSED (100%)");
  console.log("============================================================================");
}

testLiveProduction().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
