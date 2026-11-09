import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateFda510kSubstantialEquivalence,
  determineFdaSoftwareDocumentationLevel,
  auditHipaaTechnicalSafeguards,
} from "./noctis-regulatory-dossier.ts";

test("NOCTIS REGULATORY DOSSIER & STATUTORY COMPLIANCE ENGINE (NRDE-LEGAL-001)", async (t) => {
  await t.test("evaluateFda510kSubstantialEquivalence correctly navigates 510(k) decision tree", () => {
    // 1. Identical intended use and identical tech
    const identical = evaluateFda510kSubstantialEquivalence({
      predicate510k: "K210450",
      sameIntendedUse: true,
      sameTechnologicalCharacteristics: true,
    });
    assert.equal(identical.determination, "SUBSTANTIALLY_EQUIVALENT");

    // 2. Different intended use -> Instantly Not Substantially Equivalent (NSE)
    const diffUse = evaluateFda510kSubstantialEquivalence({
      predicate510k: "K210450",
      sameIntendedUse: false,
      sameTechnologicalCharacteristics: true,
    });
    assert.equal(diffUse.determination, "NOT_SUBSTANTIALLY_EQUIVALENT");

    // 3. Different tech with new safety questions -> NSE
    const diffTechUnsafe = evaluateFda510kSubstantialEquivalence({
      predicate510k: "K210450",
      sameIntendedUse: true,
      sameTechnologicalCharacteristics: false,
      differentTechRaisesNewSafetyQuestions: true,
    });
    assert.equal(diffTechUnsafe.determination, "NOT_SUBSTANTIALLY_EQUIVALENT");

    // 4. Different tech, no new questions, performance data demonstrates equivalence -> SE
    const diffTechSafe = evaluateFda510kSubstantialEquivalence({
      predicate510k: "K210450",
      sameIntendedUse: true,
      sameTechnologicalCharacteristics: false,
      differentTechRaisesNewSafetyQuestions: false,
      performanceDataDemonstratesEquivalence: true,
    });
    assert.equal(diffTechSafe.determination, "SUBSTANTIALLY_EQUIVALENT");
  });

  await t.test("determineFdaSoftwareDocumentationLevel flags Enhanced Documentation for life-critical software", () => {
    const lifeCritical = determineFdaSoftwareDocumentationLevel({
      couldFailureLeadToDeathOrSeriousInjury: true,
      isCombinationProductOrClassIII: false,
    });
    assert.equal(lifeCritical.documentationLevel, "ENHANCED");
    assert.ok(lifeCritical.rationale.includes("death or serious injury"));

    const lowRisk = determineFdaSoftwareDocumentationLevel({
      couldFailureLeadToDeathOrSeriousInjury: false,
      isCombinationProductOrClassIII: false,
    });
    assert.equal(lowRisk.documentationLevel, "BASIC");
  });

  await t.test("auditHipaaTechnicalSafeguards verifies encryption, unique IDs, and flags deficiencies", () => {
    const compliant = auditHipaaTechnicalSafeguards({
      encryptionAtRestCipher: "AES-256-GCM",
      tlsVersionInTransit: "TLS 1.3",
      uniqueUserIdsEnforced: true,
      autoLogoffMinutes: 10,
      emergencyAccessPlanDocumented: true,
      auditLoggingEnabled: true,
    });
    assert.equal(compliant.overallCompliant, true);
    assert.equal(compliant.deficiencies.length, 0);

    const nonCompliant = auditHipaaTechnicalSafeguards({
      encryptionAtRestCipher: "PLAINTEXT",
      tlsVersionInTransit: "HTTP",
      uniqueUserIdsEnforced: false,
      autoLogoffMinutes: 60, // Exceeds safe threshold
      emergencyAccessPlanDocumented: false,
      auditLoggingEnabled: false,
    });
    assert.equal(nonCompliant.overallCompliant, false);
    assert.ok(nonCompliant.deficiencies.length >= 5);
  });
});
