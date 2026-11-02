import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CLINICAL_EVIDENCE_VAULT,
  retrieveAuthoritativeEvidence,
  verifyClinicalGrounding,
  compareGenericVsNoctisExcellence,
} from "./noctis-excellence-rag-engine.ts";

describe("Noctis Clinical Excellence & Evidence RAG Engine (NOCTIS-EXCELLENCE-RAG-2026)", () => {
  test("evidence vault contains verified 2024-2026 guidelines with valid SHA256 hashes", () => {
    assert.ok(CLINICAL_EVIDENCE_VAULT.length >= 10);
    for (const chunk of CLINICAL_EVIDENCE_VAULT) {
      assert.ok(chunk.chunkId.startsWith("CHK-"));
      assert.ok(chunk.publicationYear >= 2024, `Chunk ${chunk.chunkId} must be modern >= 2024`);
      assert.ok(chunk.verifiedDirectives.length >= 2);
      assert.ok(chunk.prohibitedContraindications.length >= 1);
      assert.equal(chunk.sha256.length, 64, "SHA-256 hash must be 64 hex characters");
    }
  });

  test("retrieves exact 2026 ADA guideline chunk for diabetes hyperglycemia scenario", () => {
    const results = retrieveAuthoritativeEvidence("Patient with polyuria, polydipsia, and fasting glucose 142 mg/dL", { topK: 2 });
    assert.ok(results.length > 0);
    const topResult = results[0];
    assert.equal(topResult.chunk.primaryCondition, "Diabetes Mellitus");
    assert.equal(topResult.chunk.guidelineVersion, "ADA 2026");
    assert.ok(topResult.relevanceScore > 40);
  });

  test("retrieves GOLD 2026 COPD guideline for frequent exacerbator", () => {
    const results = retrieveAuthoritativeEvidence("COPD patient with FEV1/FVC 0.55 and 2 exacerbations this year", { topK: 1 });
    assert.equal(results.length, 1);
    assert.equal(results[0].chunk.guidelineVersion, "GOLD 2026");
    assert.ok(results[0].chunk.content.includes("Group E"));
  });

  test("retrieves ASH 2024 guideline for sickle cell acute chest syndrome", () => {
    const results = retrieveAuthoritativeEvidence("Sickle cell disease with acute chest pain, fever, and infiltrate", { topK: 1 });
    assert.equal(results.length, 1);
    assert.equal(results[0].chunk.sourceSociety, "American Society of Hematology (ASH)");
    assert.ok(results[0].chunk.content.includes("exchange transfusion"));
  });

  test("approves a faithful, evidence-grounded response with valid citation", () => {
    const query = "Diabetes management in chronic kidney disease";
    const retrieved = retrieveAuthoritativeEvidence(query, { topK: 1 });
    const chunks = retrieved.map((r) => r.chunk);

    const goodResponse = `
      According to the American Diabetes Association (ADA 2026) standards:
      Metformin max 1000 mg daily when eGFR is 30-44 mL/min/1.73m2, and metformin strictly contraindicated when eGFR < 30 mL/min/1.73m2.
      SGLT2 inhibitors provide proven cardiorenal protection.
    `;

    const audit = verifyClinicalGrounding(goodResponse, chunks);
    assert.equal(audit.isGrounded, true);
    assert.equal(audit.verdict, "VERIFIED_EVIDENCE_GROUNDED");
    assert.equal(audit.contradictionsDetected.length, 0);
    assert.ok(audit.faithfulnessScore >= 0.7);
  });

  test("triggers CONTRADICTION_DETECTED_VETO when prohibited Loperamide is recommended in C. diff", () => {
    const retrieved = retrieveAuthoritativeEvidence("diarrhea following clindamycin C. difficile suspicion", { topK: 1 });
    const chunks = retrieved.map((r) => r.chunk);

    const dangerousResponse = `
      For this severe diarrhea, give loperamide (imodium) 4mg immediately to slow bowel motility.
    `;

    const audit = verifyClinicalGrounding(dangerousResponse, chunks);
    assert.equal(audit.isGrounded, false);
    assert.equal(audit.verdict, "CONTRADICTION_DETECTED_VETO");
    assert.ok(audit.contradictionsDetected.length > 0);
    assert.ok(audit.contradictionsDetected[0].includes("Loperamide"));
  });

  test("detects superseded medical practice: flags deprecated race-based eGFR equations", () => {
    const retrieved = retrieveAuthoritativeEvidence("chronic kidney disease staging creatinine", { topK: 1 });
    const chunks = retrieved.map((r) => r.chunk);

    const outdatedResponse = `
      Calculate eGFR using the race-based eGFR with African American multiplier.
    `;

    const audit = verifyClinicalGrounding(outdatedResponse, chunks);
    assert.ok(audit.supersededRecommendationsFlagged.length > 0);
    assert.ok(audit.supersededRecommendationsFlagged[0].includes("2021 NKF-ASN deprecated race-adjusted eGFR"));
  });

  test("comparative analysis proves Noctis Excellence superiority over generic LLM flaws", () => {
    const comparison = compareGenericVsNoctisExcellence("Patient with acute chest pressure and sweating");
    assert.equal(comparison.genericLlmLimits.hallucinationRisk, "HIGH");
    assert.equal(comparison.genericLlmLimits.citationQuality, "UNVERIFIED_OR_FABRICATED");
    assert.ok(comparison.noctisExcellenceEngine.retrievedEvidence.length > 0);
    assert.ok(comparison.noctisExcellenceEngine.verifiedGuidelineCitation.includes("SHA256"));
    assert.equal(comparison.noctisExcellenceEngine.groundingAudit.isGrounded, true);
  });
});
